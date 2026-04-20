import "server-only";

import { PHASE1_TOPIC_LABELS } from "@/content/programs/phase1/skill-map";
import { PHASE1_TOPIC_KEYS_IN_ORDER } from "@/content/programs/phase1/topic-order";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import {
  buildPracticeSessionHesitationRows,
  summarizeMasteryTiers,
  type ItemHesitationResult,
} from "@/lib/analytics/hesitation";
import { getOrCreateDevUser } from "@/lib/dev-user";
import { generateAdaptiveHint } from "@/lib/llm/adaptive-hint";
import {
  computePracticeOutcome,
  outcomesFromItemStates,
} from "@/lib/practice/practice-result-rules";
import { parsePracticeItemState } from "@/lib/practice/practice-state";
import { prisma } from "@/lib/prisma";
import { findActiveSessionResumeCandidate } from "@/lib/session-resume";
import { getCompletionNextStep, type CompletionNextStep } from "@/lib/session-summary";

function isPhase1TopicKey(id: string): id is Phase1TopicKey {
  return (PHASE1_TOPIC_KEYS_IN_ORDER as readonly string[]).includes(id);
}

export type PracticeQuestionPayload = {
  id: number;
  position: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  hints: { level1: string; level2: string; level3: string; qaPassed: boolean; fallbackUsed: boolean };
  explanation: string | null;
  correctAnswer: string;
};

export type PracticeCompletedSummary = {
  rawCorrectRate: number;
  effectiveAccuracy: number;
  totalHintsUsed: number;
  hintPenalty: number;
  passed: boolean;
  /** 答對但未熟（慢／提示／重試）— 非二分法對錯。 */
  hesitation?: {
    summary: { fluent: number; hesitant: number; struggling: number };
    items: ItemHesitationResult[];
  };
};

export type PracticePageView =
  | { kind: "no_topic" }
  | { kind: "no_user"; topicKey: Phase1TopicKey; label: string }
  | {
      kind: "ready";
      topicKey: Phase1TopicKey;
      label: string;
      userId: number;
      resumeCandidate?: { sessionId: string; stale: boolean };
    }
  | {
      kind: "session";
      topicKey: Phase1TopicKey;
      label: string;
      sessionId: string;
      status: "active" | "completed" | "abandoned";
      questions: PracticeQuestionPayload[];
      currentPosition: number;
      itemStatesJson: unknown[];
      completedSummary?: PracticeCompletedSummary;
      nextStep?: CompletionNextStep;
    };

export async function getPracticePageView(params: {
  topicKey: string | undefined;
  sessionId: string | undefined;
  pos: number;
}): Promise<PracticePageView> {
  const topicRaw = params.topicKey;
  if (!topicRaw || !isPhase1TopicKey(topicRaw)) {
    return { kind: "no_topic" };
  }
  const topicKey = topicRaw;
  const label = PHASE1_TOPIC_LABELS[topicKey];

  const user = await getOrCreateDevUser();
  if (!user) {
    return { kind: "no_user", topicKey, label };
  }

  if (!params.sessionId) {
    const candidate = await findActiveSessionResumeCandidate({
      userId: user.id,
      mode: "practice",
      topicKey,
    });
    if (candidate && !candidate.stale) {
      params = { ...params, sessionId: candidate.sessionId, pos: params.pos };
    } else {
      return {
        kind: "ready",
        topicKey,
        label,
        userId: user.id,
        resumeCandidate: candidate ? { sessionId: candidate.sessionId, stale: candidate.stale } : undefined,
      };
    }
  }

  const session = await prisma.learningSession.findFirst({
    where: {
      id: params.sessionId,
      userId: user.id,
      mode: "practice",
    },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { question: true },
      },
    },
  });

  if (!session) {
    return { kind: "ready", topicKey, label, userId: user.id };
  }

  const tk = (session.topicKey as Phase1TopicKey | null) ?? topicKey;

  const questions: PracticeQuestionPayload[] = session.items.map((it) => {
    const q = it.question;
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
    const adaptive = generateAdaptiveHint(src);
    return {
      id: q.id,
      position: it.position,
      questionText: q.questionText,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      hints: {
        level1: adaptive.hint1,
        level2: adaptive.hint2,
        level3: adaptive.hint3,
        qaPassed: adaptive.qaPassed,
        fallbackUsed: adaptive.fallbackUsed,
      },
      explanation: q.explanation,
      correctAnswer: q.correctAnswer,
    };
  });

  const n = questions.length;
  const currentPosition = n === 0 ? 0 : Math.min(Math.max(0, params.pos), n - 1);

  let completedSummary: PracticeCompletedSummary | undefined;
  let nextStep: CompletionNextStep | undefined;
  if (session.status === "completed" && session.items.length > 0) {
    const states = session.items.map((it) => parsePracticeItemState(it.practiceStateJson));
    const base = computePracticeOutcome({ questions: outcomesFromItemStates(states) });
    const hesitationItems = buildPracticeSessionHesitationRows(session.items);
    completedSummary = {
      ...base,
      hesitation: {
        summary: summarizeMasteryTiers(hesitationItems),
        items: hesitationItems,
      },
    };
    nextStep = await getCompletionNextStep({
      defaultHref: `/learn/${encodeURIComponent(tk)}`,
      defaultTitleZh: "回主題學習",
      defaultDetailZh: "先整理本次練習重點，再決定是否直接進入驗收。",
    });
  }

  const itemStatesJson = session.items.map((it) => it.practiceStateJson);

  return {
    kind: "session",
    topicKey: tk,
    label,
    sessionId: session.id,
    status: session.status as "active" | "completed" | "abandoned",
    questions,
    currentPosition,
    itemStatesJson,
    completedSummary,
    nextStep,
  };
}
