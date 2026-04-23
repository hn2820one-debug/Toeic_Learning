"use server";

import { revalidatePath } from "next/cache";

import type { Prisma } from "../../../generated/prisma";

import { revalidateCalendarForSessionStartedAt } from "@/lib/calendar/revalidate-calendar";
import { PHASE1_TOPIC_KEYS_IN_ORDER } from "@/content/programs/phase1/topic-order";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import { getOrCreateDevUser } from "@/lib/dev-user";
import { primaryModuleForTopic } from "@/lib/learning-path";
import { logOpsWarn } from "@/lib/ops-log";
import { prisma } from "@/lib/prisma";
import { isDuplicateSubmitKey, normalizeSubmitKey } from "@/lib/session-guard";
import { applyCheckpointProgressWriteback } from "@/lib/test/apply-checkpoint-progress";
import { buildTestSessionFromQuery } from "@/lib/test/build-test-session";
import { finalizeTestSession, type SessionWithTestItems } from "@/lib/test/finalize-test-session";
import { resolveTestQuestionCount } from "@/lib/test/resolve-test-count";
import { submitTestAnswerPure } from "@/lib/test/submit-test-answer";
import type { CheckpointRuntimeMeta } from "@/lib/test/test-runtime-types";
import {
  buildTestQuestionSet,
  emptyTestItemState,
  isTestItemResolved,
  parseTestItemState,
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

export type TestActionResult =
  | { ok: true }
  | { ok: false; error: string; detail?: Record<string, unknown> };

export type StartTestSessionOptions = {
  mode?: string;
  skill?: string;
  moduleKey?: string;
  count?: number;
};

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

export async function startTestSession(
  topicKey: string,
  options?: StartTestSessionOptions,
): Promise<TestActionResult & { sessionId?: string }> {
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

  const targetN = resolveTestQuestionCount(options?.mode, options?.count);
  const skillOpt = options?.skill?.trim();
  const mode = options?.mode?.trim() ?? "";
  if ((mode === "checkpoint" || Boolean(skillOpt)) && !skillOpt) {
    return {
      ok: false,
      error: "skill_required",
      detail: {
        topicKey,
        hintZh: "驗收 checkpoint 必須帶 primaryLearningSkillCode（與教材／計劃一致）。",
      },
    };
  }

  let ids: number[] = [];
  let checkpointMeta: CheckpointRuntimeMeta | undefined;

  const checkpoint = await buildTestSessionFromQuery({
    topicKey,
    mode: options?.mode,
    skill: options?.skill,
    moduleKey: options?.moduleKey,
    count: options?.count,
  });

  if (checkpoint) {
    if (
      skillOpt &&
      (checkpoint.status === "insufficient_questions" || checkpoint.questionIds.length < targetN)
    ) {
      return {
        ok: false,
        error: "insufficient_questions",
        detail: {
          skillCode: skillOpt,
          requestedCount: checkpoint.requestedCount,
          actualCount: checkpoint.questionIds.length,
          hintZh: "此 skill 題量不足以組滿驗收；請補題庫後再試（不會改用無關 skill 的題目補滿）。",
        },
      };
    }
    if (checkpoint.questionIds.length > 0) {
      ids = checkpoint.questionIds;
      checkpointMeta = checkpoint.meta;
    } else if (skillOpt) {
      return { ok: false, error: "no_questions", detail: { skillCode: skillOpt } };
    }
  } else if (skillOpt) {
    return { ok: false, error: "no_questions", detail: { skillCode: skillOpt } };
  } else {
    const legacy = await buildTestQuestionSet(topicKey);
    const take = Math.min(targetN, legacy.questionIds.length);
    ids = legacy.questionIds.slice(0, take);
    checkpointMeta = {
      mode: "test",
      topicKey,
      moduleKey: mod.moduleKey,
      count: ids.length,
      skillRuleSlots: Math.min(10, ids.length),
      secondsPerQuestion: 30,
    };
  }

  if (ids.length === 0) {
    return { ok: false, error: "insufficient_questions", detail: { topicKey } };
  }

  const revisitMetaJson: Prisma.InputJsonValue = {
    v: 1,
    revisitCount: 0,
    checkpointRuntime: checkpointMeta,
  } as unknown as Prisma.InputJsonValue;

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
      revisitMetaJson,
      items: {
        create: ids.map((questionBankItemId, position) => ({
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

  const pure = submitTestAnswerPure({
    state: st,
    correctAnswer: q.correctAnswer,
    choiceRaw: choice,
  });
  if (!pure.ok) {
    logSubmitFailure(pure.error);
    return { ok: false, error: pure.error };
  }

  const next: TestItemStateJson = {
    ...pure.next,
    lastSubmitKey: normalizedSubmitKey,
  };

  await prisma.learningSessionItem.update({
    where: { id: item.id },
    data: { testStateJson: next as unknown as Prisma.InputJsonValue },
  });

  revalidateCalendarForSessionStartedAt(session.startedAt);
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

  const { summary, compositionWarnings } = finalizeTestSession({
    topicKey,
    session: session as SessionWithTestItems,
  });

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
        totalQuestions: summary.totalQuestions,
        topicAccuracy: summary.topicAccuracy,
        overallAccuracy: summary.overallAccuracy,
        targetSkillAccuracy: summary.targetSkillAccuracy,
        topicCorrect: summary.topicCorrect,
        overallCorrect: summary.overallCorrect,
        timeoutCount: summary.timeoutCount,
        compositionWarnings,
        passed: summary.passed,
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

  await applyCheckpointProgressWriteback({
    userId: user.id,
    topicKey,
    passed: summary.passed,
    overallAccuracy: summary.overallAccuracy,
  });

  revalidatePath("/test");
  revalidatePath("/learn");
  revalidatePath(`/learn/${topicKey}`);
  revalidateCalendarForSessionStartedAt(session.startedAt);

  return {
    ok: true,
    passed: summary.passed,
    topicAccuracy: summary.topicAccuracy,
    overallAccuracy: summary.overallAccuracy,
  };
}
