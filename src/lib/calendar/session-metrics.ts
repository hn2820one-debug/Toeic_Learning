import type { LearningSessionMode } from "../../../generated/prisma";

import { parsePracticeItemState, totalHintViews } from "@/lib/practice/practice-state";
import { isReviewItemRated, parseReviewItemState } from "@/lib/review-mode";
import { isTestItemResolved, parseTestItemState } from "@/lib/test-mode";

export type ItemRow = {
  practiceStateJson: unknown;
  testStateJson: unknown;
  reviewStateJson: unknown;
};

function practiceLikeMode(mode: LearningSessionMode): boolean {
  return mode === "practice" || mode === "warmup" || mode === "learn" || mode === "mixed";
}

/**
 * Aggregates per-item correctness / hints from stored JSON blobs (schema has no flat columns).
 */
export function aggregateSessionItems(mode: LearningSessionMode, items: ItemRow[]): {
  totalItems: number;
  correctCount: number;
  hintsUsed: number;
  timeTakenSecSum: number;
  timeTakenSecCount: number;
} {
  const n = items.length;
  let correctCount = 0;
  let hintsUsed = 0;
  let timeTakenSecSum = 0;
  let timeTakenSecCount = 0;

  if (practiceLikeMode(mode)) {
    for (const it of items) {
      const st = parsePracticeItemState(it.practiceStateJson);
      hintsUsed += totalHintViews(st);
      const last = st.attempts.length > 0 ? st.attempts[st.attempts.length - 1] : undefined;
      if (st.status === "solved" && last?.correct === true) {
        correctCount += 1;
      } else if (st.status === "revealed") {
        // Count as incorrect for accuracy denominator
      } else if (st.status === "open" && st.attempts.length > 0 && last?.correct === true) {
        correctCount += 1;
      }
    }
    return { totalItems: n, correctCount, hintsUsed, timeTakenSecSum, timeTakenSecCount };
  }

  if (mode === "test") {
    for (const it of items) {
      const st = parseTestItemState(it.testStateJson);
      if (isTestItemResolved(st)) {
        if (st.correct === true) correctCount += 1;
      }
      if (typeof st.timeTakenSec === "number" && Number.isFinite(st.timeTakenSec)) {
        timeTakenSecSum += st.timeTakenSec;
        timeTakenSecCount += 1;
      }
    }
    return { totalItems: n, correctCount, hintsUsed, timeTakenSecSum, timeTakenSecCount };
  }

  if (mode === "review") {
    for (const it of items) {
      const st = parseReviewItemState(it.reviewStateJson);
      if (isReviewItemRated(st)) {
        if (st.correct === true) correctCount += 1;
      }
      if (typeof st.timeTakenSec === "number" && Number.isFinite(st.timeTakenSec)) {
        timeTakenSecSum += st.timeTakenSec;
        timeTakenSecCount += 1;
      }
    }
    return { totalItems: n, correctCount, hintsUsed, timeTakenSecSum, timeTakenSecCount };
  }

  return { totalItems: n, correctCount, hintsUsed, timeTakenSecSum, timeTakenSecCount };
}

export function sessionDurationSec(startedAt: Date, endedAt: Date | null, abandonedAt: Date | null): number | null {
  const end = endedAt ?? abandonedAt;
  if (!end) return null;
  const sec = Math.round((end.getTime() - startedAt.getTime()) / 1000);
  return Number.isFinite(sec) && sec >= 0 ? sec : null;
}
