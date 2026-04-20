"use server";

import { revalidatePath } from "next/cache";

import type { Prisma, TopicProgressStage } from "../../../generated/prisma";

import { PHASE1_TOPIC_KEYS_IN_ORDER } from "@/content/programs/phase1/topic-order";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import { buildFallbackExplanationFromQuestion } from "@/lib/content-qa";
import { getOrCreateDevUser } from "@/lib/dev-user";
import { primaryModuleForTopic } from "@/lib/learning-path";
import { generateAdaptiveHint } from "@/lib/llm/adaptive-hint";
import { logOpsWarn } from "@/lib/ops-log";
import { isDuplicateSubmitKey, normalizeSubmitKey } from "@/lib/session-guard";
import {
  computePracticeOutcome,
  outcomesFromItemStates,
} from "@/lib/practice/practice-result-rules";
import {
  MAX_SUBMIT_ATTEMPTS,
  PRACTICE_QUESTION_COUNT,
  canRevealNextHint,
  emptyPracticeItemState,
  parsePracticeItemState,
  type PracticeItemState,
} from "@/lib/practice/practice-state";
import { selectPracticeQuestionIds } from "@/lib/practice/select-practice-questions";
import { prisma } from "@/lib/prisma";

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

export type PracticeActionResult = { ok: true; sessionId?: string; error?: undefined } | { ok: false; error: string };

export async function startPracticeSession(topicKey: string): Promise<PracticeActionResult> {
  if (!isPhase1TopicKey(topicKey)) {
    return { ok: false, error: "invalid_topic" };
  }
  const user = await getOrCreateDevUser();
  if (!user) {
    return { ok: false, error: "no_user" };
  }

  await ensureLearningTopic(topicKey);
  const mod = primaryModuleForTopic(topicKey);

  const ids = await selectPracticeQuestionIds(topicKey, { userId: user.id });
  if (ids.length === 0) {
    return { ok: false, error: "no_questions" };
  }

  await prisma.learningSession.updateMany({
    where: {
      userId: user.id,
      topicKey,
      mode: "practice",
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
      mode: "practice",
      status: "active",
      items: {
        create: ids.map((questionBankItemId, position) => ({
          questionBankItemId,
          position,
          practiceStateJson: emptyPracticeItemState() as unknown as Prisma.InputJsonValue,
        })),
      },
    },
    select: { id: true },
  });

  revalidatePath("/practice");
  return { ok: true, sessionId: session.id };
}

async function loadOwnedSession(userId: number, sessionId: string) {
  return prisma.learningSession.findFirst({
    where: { id: sessionId, userId, mode: "practice" },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { question: true },
      },
    },
  });
}

export async function revealPracticeHint(
  sessionId: string,
  position: number,
  layer: 1 | 2 | 3,
): Promise<PracticeActionResult> {
  const user = await getOrCreateDevUser();
  if (!user) {
    return { ok: false, error: "no_user" };
  }

  const session = await loadOwnedSession(user.id, sessionId);
  if (!session || session.status !== "active") {
    return { ok: false, error: "invalid_session" };
  }

  if (position < 0 || position >= session.items.length) {
    return { ok: false, error: "invalid_position" };
  }

  /** Last question (index 9): no hints — “預熱題” UX */
  if (position === session.items.length - 1) {
    return { ok: false, error: "hints_disabled" };
  }

  const item = session.items[position]!;
  const state = parsePracticeItemState(item.practiceStateJson);
  if (state.status !== "open") {
    return { ok: false, error: "already_resolved" };
  }

  if (!canRevealNextHint(state, layer)) {
    return { ok: false, error: "hint_order" };
  }

  const now = new Date().toISOString();
  const next: PracticeItemState = {
    ...state,
    firstOpenedAt: state.firstOpenedAt ?? now,
    maxHintLayerSeen: layer,
    hintViews: [...state.hintViews, { layer, at: now }],
  };

  await prisma.learningSessionItem.update({
    where: { id: item.id },
    data: { practiceStateJson: next as unknown as Prisma.InputJsonValue },
  });

  revalidatePath("/practice");
  return { ok: true };
}

export async function submitPracticeAnswer(
  sessionId: string,
  position: number,
  choice: string,
  submitKey?: string,
): Promise<PracticeActionResult & { revealAnswer?: string }> {
  const logSubmitFailure = (errorCode: string) =>
    logOpsWarn({
      area: "session",
      event: "practice_submit_rejected",
      detail: { sessionId, position, errorCode },
    });

  const user = await getOrCreateDevUser();
  if (!user) {
    logSubmitFailure("no_user");
    return { ok: false, error: "no_user" };
  }

  const session = await loadOwnedSession(user.id, sessionId);
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
  const state = parsePracticeItemState(item.practiceStateJson);
  const normalizedSubmitKey = normalizeSubmitKey(submitKey);

  if (isDuplicateSubmitKey(state.lastSubmitKey, normalizedSubmitKey)) {
    logSubmitFailure("already_submitted");
    return { ok: false, error: "already_submitted" };
  }
  if (state.status !== "open") {
    logSubmitFailure("already_resolved");
    return { ok: false, error: "already_resolved" };
  }

  const normalized = choice.trim().toUpperCase();
  const correct = normalized === q.correctAnswer.trim().toUpperCase();
  const hintsAtSubmit = state.maxHintLayerSeen;
  const now = new Date().toISOString();
  const firstOpenedAt = state.firstOpenedAt ?? now;

  const attempts = [
    ...state.attempts,
    { choice: normalized, correct, hintsAtSubmit, answeredAt: now },
  ];

  if (correct) {
    const next: PracticeItemState = {
      ...state,
      firstOpenedAt,
      attempts,
      status: "solved",
      lastSubmitKey: normalizedSubmitKey,
    };
    await prisma.learningSessionItem.update({
      where: { id: item.id },
      data: { practiceStateJson: next as unknown as Prisma.InputJsonValue },
    });
    revalidatePath("/practice");
    return { ok: true };
  }

  if (attempts.length >= MAX_SUBMIT_ATTEMPTS) {
    const src = {
      questionText: q.questionText,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      notes: q.notes,
    };
    const hints = generateAdaptiveHint(src);
    const revealAnswer = buildFallbackExplanationFromQuestion({
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      hint3: hints.hint3,
    });

    const next: PracticeItemState = {
      ...state,
      firstOpenedAt,
      attempts,
      status: "revealed",
      lastSubmitKey: normalizedSubmitKey,
    };
    await prisma.learningSessionItem.update({
      where: { id: item.id },
      data: { practiceStateJson: next as unknown as Prisma.InputJsonValue },
    });
    revalidatePath("/practice");
    return { ok: true, revealAnswer };
  }

  const next: PracticeItemState = {
    ...state,
    firstOpenedAt,
    attempts,
    lastSubmitKey: normalizedSubmitKey,
  };
  await prisma.learningSessionItem.update({
    where: { id: item.id },
    data: { practiceStateJson: next as unknown as Prisma.InputJsonValue },
  });
  revalidatePath("/practice");
  return { ok: true };
}

export async function completePracticeSession(sessionId: string): Promise<
  PracticeActionResult & {
    rawCorrectRate?: number;
    effectiveAccuracy?: number;
    totalHintsUsed?: number;
    hintPenalty?: number;
    passed?: boolean;
  }
> {
  const user = await getOrCreateDevUser();
  if (!user) {
    return { ok: false, error: "no_user" };
  }

  const session = await loadOwnedSession(user.id, sessionId);
  if (!session || session.status !== "active") {
    return { ok: false, error: "invalid_session" };
  }

  const topicKey = session.topicKey;
  if (!topicKey || !isPhase1TopicKey(topicKey)) {
    return { ok: false, error: "no_topic" };
  }

  for (const item of session.items) {
    const st = parsePracticeItemState(item.practiceStateJson);
    if (st.status === "open") {
      return { ok: false, error: "incomplete" };
    }
  }

  const states = session.items.map((it) => parsePracticeItemState(it.practiceStateJson));
  const outcomes = outcomesFromItemStates(states);
  const metrics = computePracticeOutcome({ questions: outcomes });

  await prisma.learningSession.update({
    where: { id: sessionId },
    data: {
      status: "completed",
      endedAt: new Date(),
    },
  });

  await ensureLearningTopic(topicKey);

  const row = await prisma.userTopicProgress.findUnique({
    where: { userId_topicKey: { userId: user.id, topicKey } },
  });

  const promoteStage = (s: TopicProgressStage | undefined): boolean =>
    !s || s === "New" || s === "Introduced";

  if (metrics.passed) {
    const stageUpdate: TopicProgressStage | undefined = promoteStage(row?.stage) ? "Practiced" : undefined;
    await prisma.userTopicProgress.upsert({
      where: { userId_topicKey: { userId: user.id, topicKey } },
      create: {
        userId: user.id,
        topicKey,
        stage: "Practiced",
        practicePassedAt: new Date(),
        practiceAccuracy: metrics.effectiveAccuracy,
        practicePassCount: 1,
      },
      update: {
        ...(stageUpdate ? { stage: stageUpdate } : {}),
        practicePassedAt: new Date(),
        practiceAccuracy: metrics.effectiveAccuracy,
        practicePassCount: { increment: 1 },
      },
    });
  } else if (!row) {
    await prisma.userTopicProgress.create({
      data: {
        userId: user.id,
        topicKey,
        stage: "Introduced",
      },
    });
  }

  revalidatePath("/practice");
  revalidatePath("/learn");
  return {
    ok: true,
    rawCorrectRate: metrics.rawCorrectRate,
    effectiveAccuracy: metrics.effectiveAccuracy,
    totalHintsUsed: metrics.totalHintsUsed,
    hintPenalty: metrics.hintPenalty,
    passed: metrics.passed,
  };
}
