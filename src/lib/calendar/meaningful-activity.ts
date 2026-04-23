import type { LearningSessionMode, LearningSessionStatus } from "../../../generated/prisma";

import { isReviewItemRated, parseReviewItemState } from "@/lib/review-mode";

import type { ItemRow } from "./session-metrics";

/**
 * Whether a single session row represents “meaningful” learning progress for the calendar
 * (not low-value clicks: e.g. opening a review card without rating does not count until a rating exists,
 * or the session is completed).
 */
export function learningSessionHasMeaningfulLearningProgress(session: {
  mode: LearningSessionMode;
  status: LearningSessionStatus;
  items: ItemRow[];
}): boolean {
  if (session.status === "completed") {
    return true;
  }
  if (session.mode === "review" && session.status === "active") {
    return session.items.some((it) => isReviewItemRated(parseReviewItemState(it.reviewStateJson)));
  }
  return false;
}

export type DayMeaningfulLearningSnapshot = {
  /** Count of passed checkpoint attempts recorded that calendar day (not “stage upgrades”). */
  checkpointPassCount: number;
  /** UserTopicProgress rows whose learnCompletedAt falls on this calendar day. */
  learnTopicCompletionsOnDay: number;
  /** DailyPlanItem rows for this planned date with completed === true. */
  studyPlanCompletedRowCount: number;
  /** Sessions whose startedAt maps to this day (see aggregator bucketing). */
  sessions: Array<{
    mode: LearningSessionMode;
    status: LearningSessionStatus;
    items: ItemRow[];
  }>;
};

/**
 * True if this calendar day had at least one of:
 * - checkpoint pass (test gate passed),
 * - topic learn flow completed (learnCompletedAt),
 * - study-plan day marked complete,
 * - completed practice / test / warmup / learn session, or
 * - review session with at least one FSRS rating submitted (or completed review run).
 */
export function dayHasMeaningfulLearningActivity(snapshot: DayMeaningfulLearningSnapshot): boolean {
  if (snapshot.checkpointPassCount > 0) return true;
  if (snapshot.learnTopicCompletionsOnDay > 0) return true;
  if (snapshot.studyPlanCompletedRowCount > 0) return true;
  for (const s of snapshot.sessions) {
    if (learningSessionHasMeaningfulLearningProgress(s)) return true;
  }
  return false;
}
