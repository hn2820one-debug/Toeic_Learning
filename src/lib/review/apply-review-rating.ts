import "server-only";

import { applyRating, Rating, type SchedulerRating } from "@/lib/fsrs";
import type { ReviewRatingName } from "@/lib/review-mode";

const RATING_MAP: Record<ReviewRatingName, SchedulerRating> = {
  Again: Rating.Again,
  Hard: Rating.Hard,
  Good: Rating.Good,
  Easy: Rating.Easy,
};

/**
 * Persists FSRS scheduler output for one question after the learner picks Again/Hard/Good/Easy.
 * Delegates to existing `applyRating()` — do not duplicate scheduler math.
 */
export async function applyReviewRating(questionId: number, rating: ReviewRatingName) {
  return applyRating(questionId, RATING_MAP[rating]);
}
