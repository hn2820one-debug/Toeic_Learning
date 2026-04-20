"use server";

import { revalidatePath } from "next/cache";

import type { Prisma } from "../../../generated/prisma";

import { previewIntervals, type RatingName as FsrsRatingName } from "@/lib/fsrs";
import { getOrCreateDevUser } from "@/lib/dev-user";
import { logOpsWarn } from "@/lib/ops-log";
import { prisma } from "@/lib/prisma";
import { isDuplicateSubmitKey, normalizeSubmitKey } from "@/lib/session-guard";
import { applyReviewRating } from "@/lib/review/apply-review-rating";
import { buildReviewSession } from "@/lib/review/build-review-session";
import { markReviewLearningSessionCompleted } from "@/lib/review/finalize-review-session";
import {
  emptyReviewItemState,
  explanationFallbackCopy,
  parseReviewItemState,
  REVIEW_SECONDS_PER_QUESTION,
  REVIEW_TIMEOUT_USER_CHOICE,
  type ReviewItemStateJson,
  type ReviewRatingName,
} from "@/lib/review-mode";

export type ReviewActionResult = { ok: true } | { ok: false; error: string; detail?: string };

async function loadOwnedReviewSession(userId: number, sessionId: string) {
  return prisma.learningSession.findFirst({
    where: { id: sessionId, userId, mode: "review" },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { question: true },
      },
    },
  });
}

export async function startReviewSession(): Promise<ReviewActionResult & { sessionId?: string }> {
  const user = await getOrCreateDevUser();
  if (!user) {
    return { ok: false, error: "no_user" };
  }

  const built = await buildReviewSession();
  if (built.questionIds.length === 0) {
    return { ok: false, error: "empty_queue" };
  }

  await prisma.learningSession.updateMany({
    where: {
      userId: user.id,
      mode: "review",
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
      mode: "review",
      status: "active",
      items: {
        create: built.questionIds.map((questionBankItemId, position) => ({
          questionBankItemId,
          position,
          reviewStateJson: emptyReviewItemState() as unknown as Prisma.InputJsonValue,
        })),
      },
    },
    select: { id: true },
  });

  revalidatePath("/review");
  return { ok: true, sessionId: session.id };
}

export async function markReviewQuestionShown(sessionId: string, position: number): Promise<ReviewActionResult> {
  const user = await getOrCreateDevUser();
  if (!user) {
    return { ok: false, error: "no_user" };
  }

  const session = await loadOwnedReviewSession(user.id, sessionId);
  if (!session || session.status !== "active") {
    return { ok: false, error: "invalid_session" };
  }

  if (position < 0 || position >= session.items.length) {
    return { ok: false, error: "invalid_position" };
  }

  const item = session.items[position]!;
  const st = parseReviewItemState(item.reviewStateJson);
  if (st.phase !== "pending") {
    return { ok: true };
  }

  const next: ReviewItemStateJson = {
    ...st,
    phase: "shown",
    shownAt: new Date().toISOString(),
  };

  await prisma.learningSessionItem.update({
    where: { id: item.id },
    data: { reviewStateJson: next as unknown as Prisma.InputJsonValue },
  });

  return { ok: true };
}

export async function submitReviewAnswer(
  sessionId: string,
  position: number,
  choice: string,
  submitKey?: string,
): Promise<
  ReviewActionResult & {
    intervalPreviews?: Record<FsrsRatingName, { dueAt: Date; label: string }>;
    isCorrect?: boolean;
    explanationDisplay?: string;
    correctAnswer?: string;
  }
> {
  const logSubmitFailure = (errorCode: string) =>
    logOpsWarn({
      area: "session",
      event: "review_submit_rejected",
      detail: { sessionId, position, errorCode },
    });

  const user = await getOrCreateDevUser();
  if (!user) {
    logSubmitFailure("no_user");
    return { ok: false, error: "no_user" };
  }

  const session = await loadOwnedReviewSession(user.id, sessionId);
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
  const st = parseReviewItemState(item.reviewStateJson);
  const normalizedSubmitKey = normalizeSubmitKey(submitKey);

  if (isDuplicateSubmitKey(st.lastSubmitKey, normalizedSubmitKey)) {
    logSubmitFailure("already_answered");
    return { ok: false, error: "already_answered" };
  }
  if (st.phase === "answered" || st.phase === "rated") {
    logSubmitFailure("already_answered");
    return { ok: false, error: "already_answered" };
  }

  const trimmed = choice.trim();
  const isTimeout = trimmed === REVIEW_TIMEOUT_USER_CHOICE || trimmed.toUpperCase() === REVIEW_TIMEOUT_USER_CHOICE;

  let shownAt = st.shownAt;
  if (!shownAt) {
    shownAt = new Date().toISOString();
  }

  const answeredAt = new Date().toISOString();
  const shownMs = new Date(shownAt).getTime();
  const ansMs = Date.now();
  let timeTakenSec = Math.min(REVIEW_SECONDS_PER_QUESTION, Math.max(0, (ansMs - shownMs) / 1000));
  if (isTimeout) {
    timeTakenSec = REVIEW_SECONDS_PER_QUESTION;
  }

  let normalizedChoice: string;
  if (isTimeout) {
    normalizedChoice = REVIEW_TIMEOUT_USER_CHOICE;
  } else {
    normalizedChoice = trimmed.toUpperCase();
    if (!["A", "B", "C", "D"].includes(normalizedChoice)) {
      logSubmitFailure("invalid_choice");
      return { ok: false, error: "invalid_choice" };
    }
  }

  const correct = !isTimeout && normalizedChoice === q.correctAnswer.trim().toUpperCase();

  const next: ReviewItemStateJson = {
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
    data: { reviewStateJson: next as unknown as Prisma.InputJsonValue },
  });

  let intervalPreviews: Record<FsrsRatingName, { dueAt: Date; label: string }>;
  try {
    intervalPreviews = await previewIntervals(q.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[review] previewIntervals failed", { questionId: q.id, sessionId, position, message });
    const unknown = { dueAt: new Date(), label: "—" };
    intervalPreviews = {
      Again: unknown,
      Hard: unknown,
      Good: unknown,
      Easy: unknown,
    };
  }

  const explanationDisplay =
    (q.explanation && q.explanation.trim().length > 0 ? q.explanation : null) ??
    (q.notes && q.notes.trim().length > 0 ? q.notes : null) ??
    explanationFallbackCopy();

  revalidatePath("/review");

  return {
    ok: true,
    intervalPreviews,
    isCorrect: correct,
    explanationDisplay,
    correctAnswer: q.correctAnswer,
  };
}

export async function submitReviewRating(
  sessionId: string,
  position: number,
  rating: ReviewRatingName,
  submitKey?: string,
): Promise<ReviewActionResult & { sessionCompleted?: boolean }> {
  const logRatingFailure = (errorCode: string) =>
    logOpsWarn({
      area: "session",
      event: "review_rating_rejected",
      detail: { sessionId, position, errorCode },
    });

  const user = await getOrCreateDevUser();
  if (!user) {
    logRatingFailure("no_user");
    return { ok: false, error: "no_user" };
  }

  const session = await loadOwnedReviewSession(user.id, sessionId);
  if (!session || session.status !== "active") {
    logRatingFailure("invalid_session");
    return { ok: false, error: "invalid_session" };
  }

  if (position < 0 || position >= session.items.length) {
    logRatingFailure("invalid_position");
    return { ok: false, error: "invalid_position" };
  }

  const item = session.items[position]!;
  const q = item.question;
  const st = parseReviewItemState(item.reviewStateJson);
  const normalizedSubmitKey = normalizeSubmitKey(submitKey);

  if (st.phase !== "answered") {
    logRatingFailure("not_answered");
    return { ok: false, error: "not_answered" };
  }
  if (isDuplicateSubmitKey(st.lastRatingKey, normalizedSubmitKey)) {
    logRatingFailure("already_rated");
    return { ok: false, error: "already_rated" };
  }
  if (st.rating != null) {
    logRatingFailure("already_rated");
    return { ok: false, error: "already_rated" };
  }

  if (rating !== "Again" && rating !== "Hard" && rating !== "Good" && rating !== "Easy") {
    logRatingFailure("invalid_rating");
    return { ok: false, error: "invalid_rating" };
  }

  try {
    const nextCard = await applyReviewRating(q.id, rating);
    const ratedAt = new Date().toISOString();
    const nextDueAt = nextCard.due.toISOString();

    const next: ReviewItemStateJson = {
      ...st,
      phase: "rated",
      rating,
      lastRatingKey: normalizedSubmitKey,
      ratedAt,
      nextDueAt,
    };

    const isLast = position >= session.items.length - 1;

    try {
      await prisma.learningSessionItem.update({
        where: { id: item.id },
        data: { reviewStateJson: next as unknown as Prisma.InputJsonValue },
      });
    } catch (persistErr) {
      const pmsg = persistErr instanceof Error ? persistErr.message : String(persistErr);
      console.error("[review] learning item update failed after FSRS applyRating", {
        questionId: q.id,
        sessionId,
        position,
        rating,
        message: pmsg,
      });
      return { ok: false, error: "persist_failed", detail: pmsg };
    }

    if (isLast) {
      await markReviewLearningSessionCompleted(sessionId);
    }

    revalidatePath("/review");
    revalidatePath("/learn");

    return { ok: true, sessionCompleted: isLast };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[review] applyRating failed", {
      questionId: q.id,
      sessionId,
      position,
      rating,
      message,
    });
    return { ok: false, error: "fsrs_apply_failed", detail: message };
  }
}
