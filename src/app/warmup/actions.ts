"use server";

import { revalidatePath } from "next/cache";

import type { Prisma } from "../../../generated/prisma";

import { revalidateCalendarForSessionStartedAt } from "@/lib/calendar/revalidate-calendar";
import { PHASE1_TOPIC_KEYS_IN_ORDER } from "@/content/programs/phase1/topic-order";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import { buildFallbackExplanationFromQuestion } from "@/lib/content-qa";
import { getOrCreateDevUser } from "@/lib/dev-user";
import { generateAdaptiveHint } from "@/lib/llm/adaptive-hint";
import { logOpsWarn } from "@/lib/ops-log";
import { isDuplicateSubmitKey, normalizeSubmitKey } from "@/lib/session-guard";
import {
  MAX_SUBMIT_ATTEMPTS,
  emptyPracticeItemState,
  parsePracticeItemState,
  type PracticeItemState,
} from "@/lib/practice/practice-state";
import { prisma } from "@/lib/prisma";
import { selectWarmupQuestionIds, warmupModuleKeyForFlow, WARMUP_QUESTION_COUNT, type WarmupTargetFlow } from "@/lib/session/warmup";

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

export type WarmupActionResult = { ok: true; sessionId?: string; error?: undefined } | { ok: false; error: string };

async function loadOwnedWarmupSession(userId: number, sessionId: string) {
  return prisma.learningSession.findFirst({
    where: { id: sessionId, userId, mode: "warmup" },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { question: true },
      },
    },
  });
}

export async function startWarmupSession(params: {
  topicKey: string;
  flow: WarmupTargetFlow;
}): Promise<WarmupActionResult> {
  if (!isPhase1TopicKey(params.topicKey)) {
    return { ok: false, error: "invalid_topic" };
  }
  const topicKey = params.topicKey;
  const user = await getOrCreateDevUser();
  if (!user) {
    return { ok: false, error: "no_user" };
  }

  await ensureLearningTopic(topicKey);

  const { ids } = await selectWarmupQuestionIds(user.id, topicKey);
  if (ids.length < WARMUP_QUESTION_COUNT) {
    return { ok: false, error: "no_questions" };
  }

  await prisma.learningSession.updateMany({
    where: {
      userId: user.id,
      mode: "warmup",
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
      moduleKey: warmupModuleKeyForFlow(params.flow),
      topicKey,
      mode: "warmup",
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

  revalidatePath("/warmup");
  return { ok: true, sessionId: session.id };
}

export async function submitWarmupAnswer(
  sessionId: string,
  position: number,
  choice: string,
  submitKey?: string,
): Promise<WarmupActionResult & { revealAnswer?: string }> {
  const logSubmitFailure = (errorCode: string) =>
    logOpsWarn({
      area: "session",
      event: "warmup_submit_rejected",
      detail: { sessionId, position, errorCode },
    });

  const user = await getOrCreateDevUser();
  if (!user) {
    logSubmitFailure("no_user");
    return { ok: false, error: "no_user" };
  }

  const session = await loadOwnedWarmupSession(user.id, sessionId);
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
    revalidatePath("/warmup");
    revalidateCalendarForSessionStartedAt(session.startedAt);
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
    revalidatePath("/warmup");
    revalidateCalendarForSessionStartedAt(session.startedAt);
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
  revalidatePath("/warmup");
  revalidateCalendarForSessionStartedAt(session.startedAt);
  return { ok: true };
}

function skipState(prev: PracticeItemState): PracticeItemState {
  const now = new Date().toISOString();
  return {
    ...prev,
    attempts: [
      ...prev.attempts,
      { choice: "SKIP", correct: false, hintsAtSubmit: 0, answeredAt: now },
    ],
    status: "revealed",
  };
}

/** Skip one item (user gesture or per-item timebox). */
export async function skipWarmupItem(sessionId: string, position: number): Promise<WarmupActionResult> {
  const user = await getOrCreateDevUser();
  if (!user) {
    return { ok: false, error: "no_user" };
  }

  const session = await loadOwnedWarmupSession(user.id, sessionId);
  if (!session || session.status !== "active") {
    return { ok: false, error: "invalid_session" };
  }
  if (position < 0 || position >= session.items.length) {
    return { ok: false, error: "invalid_position" };
  }

  const item = session.items[position]!;
  const state = parsePracticeItemState(item.practiceStateJson);
  if (state.status !== "open") {
    return { ok: false, error: "already_resolved" };
  }

  const next = skipState(state);
  await prisma.learningSessionItem.update({
    where: { id: item.id },
    data: { practiceStateJson: next as unknown as Prisma.InputJsonValue },
  });
  revalidatePath("/warmup");
  return { ok: true };
}

/** When global 2-minute budget expires: resolve every still-open item as skipped. */
export async function resolveWarmupTimeExpired(sessionId: string): Promise<WarmupActionResult> {
  const user = await getOrCreateDevUser();
  if (!user) {
    return { ok: false, error: "no_user" };
  }

  const session = await loadOwnedWarmupSession(user.id, sessionId);
  if (!session || session.status !== "active") {
    return { ok: false, error: "invalid_session" };
  }

  for (const item of session.items) {
    const state = parsePracticeItemState(item.practiceStateJson);
    if (state.status === "open") {
      const next = skipState(state);
      await prisma.learningSessionItem.update({
        where: { id: item.id },
        data: { practiceStateJson: next as unknown as Prisma.InputJsonValue },
      });
    }
  }

  revalidatePath("/warmup");
  return { ok: true };
}

/**
 * Ends warm-up without touching UserTopicProgress, checkpoint, or test pass state.
 */
export async function completeWarmupSession(sessionId: string): Promise<WarmupActionResult> {
  const user = await getOrCreateDevUser();
  if (!user) {
    return { ok: false, error: "no_user" };
  }

  const session = await loadOwnedWarmupSession(user.id, sessionId);
  if (!session || session.status !== "active") {
    return { ok: false, error: "invalid_session" };
  }

  for (const item of session.items) {
    const st = parsePracticeItemState(item.practiceStateJson);
    if (st.status === "open") {
      return { ok: false, error: "incomplete" };
    }
  }

  await prisma.learningSession.update({
    where: { id: sessionId },
    data: {
      status: "completed",
      endedAt: new Date(),
    },
  });

  revalidatePath("/warmup");
  return { ok: true };
}

export async function abandonWarmupSession(sessionId: string): Promise<WarmupActionResult> {
  const user = await getOrCreateDevUser();
  if (!user) {
    return { ok: false, error: "no_user" };
  }

  const session = await loadOwnedWarmupSession(user.id, sessionId);
  if (!session || session.status !== "active") {
    return { ok: false, error: "invalid_session" };
  }

  await prisma.learningSession.update({
    where: { id: sessionId },
    data: {
      status: "abandoned",
      abandonedAt: new Date(),
    },
  });

  revalidatePath("/warmup");
  return { ok: true };
}
