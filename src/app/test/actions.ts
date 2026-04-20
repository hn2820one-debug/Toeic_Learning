"use server";

import { revalidatePath } from "next/cache";

import type { Prisma } from "../../../generated/prisma";

import { PHASE1_TOPIC_KEYS_IN_ORDER } from "@/content/programs/phase1/topic-order";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import { getOrCreateDevUser } from "@/lib/dev-user";
import { primaryModuleForTopic } from "@/lib/learning-path";
import { logOpsWarn } from "@/lib/ops-log";
import { prisma } from "@/lib/prisma";
import { isDuplicateSubmitKey, normalizeSubmitKey } from "@/lib/session-guard";
import {
  buildTestQuestionSet,
  collectTestCompositionWarnings,
  emptyTestItemState,
  getTestResultSummary,
  isTestItemResolved,
  parseTestItemState,
  TEST_QUESTION_COUNT,
  TEST_SECONDS_PER_QUESTION,
  TEST_TIMEOUT_USER_CHOICE,
  type TestItemStateJson,
} from "@/lib/test-mode";

function isPhase1TopicKey(id: string): id is Phase1TopicKey {
  return (PHASE1_TOPIC_KEYS_IN_ORDER as readonly string[]).includes(id);
}

async function ensureLearningTopic(topicKey: Phase1TopicKey) {
  const orderIndex = PHASE1_TOPIC_KEYS_IN_ORDER.indexOf(topicKey);
  const { PHASE1_TOPIC_LABELS } = await import("@/content/programs/phase1/skill-map");
  const raw = PHASE1_TOPIC_LABELS[topicKey];
  const parts = raw.split(" / ").map((s) => s.trim());
  await prisma.learningTopic.upsert({
    where: { topicKey },
    create: {
      topicKey,
      orderIndex: orderIndex === -1 ? 0 : orderIndex,
      labelZh: parts[0] ?? raw,
      labelEn: parts[1] ?? parts[0] ?? raw,
    },
    update: {},
  });
}

export type TestActionResult = { ok: true } | { ok: false; error: string };

async function loadOwnedTestSession(userId: number, sessionId: string) {
  return prisma.learningSession.findFirst({
    where: { id: sessionId, userId, mode: "test" },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { question: true },
      },
    },
  });
}

export async function startTestSession(topicKey: string): Promise<TestActionResult & { sessionId?: string }> {
  if (!isPhase1TopicKey(topicKey)) {
    return { ok: false, error: "invalid_topic" };
  }
  const user = await getOrCreateDevUser();
  if (!user) {
    return { ok: false, error: "no_user" };
  }

  const progress = await prisma.userTopicProgress.findUnique({
    where: { userId_topicKey: { userId: user.id, topicKey } },
  });
  if (!progress || progress.stage !== "Practiced") {
    return { ok: false, error: "not_ready" };
  }

  await ensureLearningTopic(topicKey);
  const mod = primaryModuleForTopic(topicKey);

  const built = await buildTestQuestionSet(topicKey);
  if (built.questionIds.length < TEST_QUESTION_COUNT) {
    return { ok: false, error: "insufficient_questions" };
  }

  await prisma.learningSession.updateMany({
    where: {
      userId: user.id,
      topicKey,
      mode: "test",
      status: "active",
    },
    data: {
      status: "abandoned",
      abandonedAt: new Date(),
    },
  });

  const session = await prisma.learningSession.create({
    data: {
      userId: user.id,
      programKey: "phase1",
      moduleKey: mod.moduleKey,
      topicKey,
      mode: "test",
      status: "active",
      items: {
        create: built.questionIds.map((questionBankItemId, position) => ({
          questionBankItemId,
          position,
          testStateJson: emptyTestItemState() as unknown as Prisma.InputJsonValue,
        })),
      },
    },
    select: { id: true },
  });

  revalidatePath("/test");
  revalidatePath("/learn");
  return { ok: true, sessionId: session.id };
}

export async function markTestQuestionShown(sessionId: string, position: number): Promise<TestActionResult> {
  const user = await getOrCreateDevUser();
  if (!user) {
    return { ok: false, error: "no_user" };
  }

  const session = await loadOwnedTestSession(user.id, sessionId);
  if (!session || session.status !== "active") {
    return { ok: false, error: "invalid_session" };
  }

  if (position < 0 || position >= session.items.length) {
    return { ok: false, error: "invalid_position" };
  }

  const item = session.items[position]!;
  const st = parseTestItemState(item.testStateJson);
  if (st.phase !== "pending") {
    return { ok: true };
  }

  const next: TestItemStateJson = {
    ...st,
    phase: "shown",
    shownAt: new Date().toISOString(),
  };

  await prisma.learningSessionItem.update({
    where: { id: item.id },
    data: { testStateJson: next as unknown as Prisma.InputJsonValue },
  });

  return { ok: true };
}

export async function submitTestAnswer(
  sessionId: string,
  position: number,
  choice: string,
  submitKey?: string,
): Promise<TestActionResult> {
  const logSubmitFailure = (errorCode: string) =>
    logOpsWarn({
      area: "session",
      event: "test_submit_rejected",
      detail: { sessionId, position, errorCode },
    });

  const user = await getOrCreateDevUser();
  if (!user) {
    logSubmitFailure("no_user");
    return { ok: false, error: "no_user" };
  }

  const session = await loadOwnedTestSession(user.id, sessionId);
  if (!session || session.status !== "active") {
    logSubmitFailure("invalid_session");
    return { ok: false, error: "invalid_session" };
  }

  if (position < 0 || position >= session.items.length) {
    logSubmitFailure("invalid_position");
    return { ok: false, error: "invalid_position" };
  }

  const item = session.items[position]!;
  const q = item.question;
  const st = parseTestItemState(item.testStateJson);
  const normalizedSubmitKey = normalizeSubmitKey(submitKey);

  if (isDuplicateSubmitKey(st.lastSubmitKey, normalizedSubmitKey)) {
    logSubmitFailure("already_answered");
    return { ok: false, error: "already_answered" };
  }
  if (isTestItemResolved(st)) {
    logSubmitFailure("already_answered");
    return { ok: false, error: "already_answered" };
  }

  const trimmed = choice.trim();
  const isTimeout = trimmed === TEST_TIMEOUT_USER_CHOICE || trimmed.toUpperCase() === TEST_TIMEOUT_USER_CHOICE;

  let shownAt = st.shownAt;
  if (!shownAt) {
    shownAt = new Date().toISOString();
  }

  const answeredAt = new Date().toISOString();
  const shownMs = new Date(shownAt).getTime();
  const ansMs = Date.now();
  let timeTakenSec = Math.min(TEST_SECONDS_PER_QUESTION, Math.max(0, (ansMs - shownMs) / 1000));
  if (isTimeout) {
    timeTakenSec = TEST_SECONDS_PER_QUESTION;
  }

  let normalizedChoice: string;
  if (isTimeout) {
    normalizedChoice = TEST_TIMEOUT_USER_CHOICE;
  } else {
    normalizedChoice = trimmed.toUpperCase();
    if (!["A", "B", "C", "D"].includes(normalizedChoice)) {
      logSubmitFailure("invalid_choice");
      return { ok: false, error: "invalid_choice" };
    }
  }

  const correct = !isTimeout && normalizedChoice === q.correctAnswer.trim().toUpperCase();

  const next: TestItemStateJson = {
    ...st,
    phase: "answered",
    shownAt,
    userChoice: normalizedChoice,
    correct,
    answeredAt,
    timeTakenSec,
    timedOut: isTimeout,
    lastSubmitKey: normalizedSubmitKey,
  };

  await prisma.learningSessionItem.update({
    where: { id: item.id },
    data: { testStateJson: next as unknown as Prisma.InputJsonValue },
  });

  return { ok: true };
}

export async function completeTestSession(sessionId: string): Promise<
  TestActionResult & {
    passed?: boolean;
    topicAccuracy?: number;
    overallAccuracy?: number;
  }
> {
  const user = await getOrCreateDevUser();
  if (!user) {
    return { ok: false, error: "no_user" };
  }

  const session = await loadOwnedTestSession(user.id, sessionId);
  if (!session || session.status !== "active") {
    return { ok: false, error: "invalid_session" };
  }

  const topicKey = session.topicKey;
  if (!topicKey || !isPhase1TopicKey(topicKey)) {
    return { ok: false, error: "no_topic" };
  }

  for (const item of session.items) {
    const st = parseTestItemState(item.testStateJson);
    if (!isTestItemResolved(st)) {
      return { ok: false, error: "incomplete" };
    }
  }

  const summary = getTestResultSummary({
    items: session.items.map((it) => {
      const q = it.question;
      return {
        position: it.position,
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        testState: parseTestItemState(it.testStateJson),
      };
    }),
  });

  const compositionWarnings = collectTestCompositionWarnings(
    topicKey,
    session.items.map((it) => ({ position: it.position, topicKey: it.question.topicKey })),
  );

  const mod = primaryModuleForTopic(topicKey);

  await prisma.learningSession.update({
    where: { id: sessionId },
    data: {
      status: "completed",
      endedAt: new Date(),
    },
  });

  await prisma.checkpointAttempt.create({
    data: {
      userId: user.id,
      moduleKey: mod.moduleKey,
      learningSessionId: sessionId,
      accuracy: summary.overallAccuracy,
      passThreshold: 0.7,
      passed: summary.passed,
      summarySnapshot: JSON.stringify({
        topicAccuracy: summary.topicAccuracy,
        overallAccuracy: summary.overallAccuracy,
        topicCorrect: summary.topicCorrect,
        overallCorrect: summary.overallCorrect,
        timeoutCount: summary.timeoutCount,
        compositionWarnings,
      }),
    },
  });

  await ensureLearningTopic(topicKey);

  const row = await prisma.userTopicProgress.findUnique({
    where: { userId_topicKey: { userId: user.id, topicKey } },
  });

  if (!row) {
    return { ok: false, error: "no_progress" };
  }

  if (summary.passed) {
    await prisma.userTopicProgress.update({
      where: { userId_topicKey: { userId: user.id, topicKey } },
      data: {
        stage: "Tested",
        testPassedAt: new Date(),
        testAccuracy: summary.overallAccuracy,
        testAttempts: { increment: 1 },
      },
    });
  } else {
    await prisma.userTopicProgress.update({
      where: { userId_topicKey: { userId: user.id, topicKey } },
      data: {
        testAttempts: { increment: 1 },
      },
    });
  }

  revalidatePath("/test");
  revalidatePath("/learn");
  revalidatePath(`/learn/${topicKey}`);

  return {
    ok: true,
    passed: summary.passed,
    topicAccuracy: summary.topicAccuracy,
    overallAccuracy: summary.overallAccuracy,
  };
}
