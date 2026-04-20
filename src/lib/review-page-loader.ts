import "server-only";

import { redirect } from "next/navigation";

import { getQueueStats, previewIntervals, type RatingName as FsrsRatingName } from "@/lib/fsrs";
import { getOrCreateDevUser } from "@/lib/dev-user";
import {
  buildReviewQueueSummary,
  isReviewAwaitingRating,
  parseReviewItemState,
  isReviewItemRated,
  type ReviewQueueSummary,
} from "@/lib/review-mode";
import { buildReviewSession } from "@/lib/review-session-builder";
import { prisma } from "@/lib/prisma";

export type ReviewQuestionPayload = {
  id: number;
  position: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string | null;
  topic: string;
  topicKey: string | null;
  difficulty: string;
};

export type RatingPreviewMap = Record<FsrsRatingName, { label: string }>;

export type ReviewPageView =
  | { kind: "no_user" }
  | {
      kind: "empty";
      queueStats: { dueCount: number; newCount: number; learningCount: number };
    }
  | {
      kind: "ready";
      queueStats: { dueCount: number; newCount: number; learningCount: number };
      sourceMeta: { dueInQueue: number; newInQueue: number; totalFromHelper: number; sessionQuestionCount: number };
    }
  | {
      kind: "session";
      sessionId: string;
      status: "active" | "completed" | "abandoned";
      questions: ReviewQuestionPayload[];
      currentPosition: number;
      itemStatesJson: unknown[];
      /** FSRS interval labels for the four buttons (answered, not yet rated) */
      ratingPreviews?: RatingPreviewMap | null;
      summary?: ReviewQueueSummary;
      queueStatsAfter?: { dueCount: number; newCount: number; learningCount: number };
    };

function firstIncompletePosition(
  items: ReadonlyArray<{ position: number; reviewStateJson: unknown }>,
): number | null {
  const sorted = [...items].sort((a, b) => a.position - b.position);
  for (const it of sorted) {
    const st = parseReviewItemState(it.reviewStateJson);
    if (!isReviewItemRated(st)) {
      return it.position;
    }
  }
  return null;
}

function maskQuestionForPosition(
  questions: ReviewQuestionPayload[],
  items: ReadonlyArray<{ position: number; reviewStateJson: unknown }>,
  currentPosition: number,
): ReviewQuestionPayload[] {
  return questions.map((q) => {
    if (q.position !== currentPosition) {
      return q;
    }
    const row = items.find((it) => it.position === q.position);
    const st = parseReviewItemState(row?.reviewStateJson);
    const reveal = st.phase === "answered" || st.phase === "rated";
    if (reveal) {
      return q;
    }
    return { ...q, correctAnswer: "", explanation: null };
  });
}

export async function getReviewPageView(params: { sessionId: string | undefined; pos: number }): Promise<ReviewPageView> {
  const user = await getOrCreateDevUser();
  if (!user) {
    return { kind: "no_user" };
  }

  const queueStats = await getQueueStats();

  if (!params.sessionId) {
    const built = await buildReviewSession();
    if (built.questionIds.length === 0) {
      return { kind: "empty", queueStats };
    }
    return {
      kind: "ready",
      queueStats,
      sourceMeta: built.sourceMeta,
    };
  }

  const session = await prisma.learningSession.findFirst({
    where: { id: params.sessionId, userId: user.id, mode: "review" },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: {
          question: true,
        },
      },
    },
  });

  if (!session) {
    const built = await buildReviewSession();
    if (built.questionIds.length === 0) {
      return { kind: "empty", queueStats };
    }
    return {
      kind: "ready",
      queueStats,
      sourceMeta: built.sourceMeta,
    };
  }

  const questions: ReviewQuestionPayload[] = session.items.map((it) => {
    const q = it.question;
    return {
      id: q.id,
      position: it.position,
      questionText: q.questionText,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      topic: q.topic,
      topicKey: q.topicKey,
      difficulty: q.difficulty,
    };
  });

  const requested = Number.isFinite(params.pos) ? Math.max(0, Math.floor(params.pos)) : 0;
  const firstInc = firstIncompletePosition(session.items);

  if (session.status === "active" && firstInc !== null && requested !== firstInc) {
    redirect(`/review?session=${encodeURIComponent(session.id)}&pos=${firstInc}`);
  }

  const currentPosition =
    session.status === "active" && firstInc !== null
      ? firstInc
      : Math.min(requested, Math.max(0, questions.length - 1));

  if (session.status === "completed") {
    const summary = buildReviewQueueSummary({
      items: session.items.map((it) => ({
        questionId: it.questionBankItemId,
        topic: it.question.topic,
        state: parseReviewItemState(it.reviewStateJson),
      })),
    });
    const queueStatsAfter = await getQueueStats();
    return {
      kind: "session",
      sessionId: session.id,
      status: "completed",
      questions,
      currentPosition: 0,
      itemStatesJson: session.items.map((it) => it.reviewStateJson ?? null),
      summary,
      queueStatsAfter,
    };
  }

  if (session.status === "abandoned") {
    return {
      kind: "session",
      sessionId: session.id,
      status: "abandoned",
      questions: [],
      currentPosition: 0,
      itemStatesJson: [],
    };
  }

  const curItem = session.items.find((it) => it.position === currentPosition);
  const curState = parseReviewItemState(curItem?.reviewStateJson);
  let ratingPreviews: RatingPreviewMap | null | undefined;
  if (curItem && isReviewAwaitingRating(curState)) {
    try {
      const pi = await previewIntervals(curItem.questionBankItemId);
      ratingPreviews = {
        Again: { label: pi.Again.label },
        Hard: { label: pi.Hard.label },
        Good: { label: pi.Good.label },
        Easy: { label: pi.Easy.label },
      };
    } catch {
      ratingPreviews = null;
    }
  }

  const masked = maskQuestionForPosition(questions, session.items, currentPosition);

  return {
    kind: "session",
    sessionId: session.id,
    status: "active",
    questions: masked,
    currentPosition,
    itemStatesJson: session.items.map((it) => it.reviewStateJson ?? null),
    ratingPreviews,
  };
}
