import "server-only";

import { getTodayQueue } from "@/lib/fsrs";
import { MAX_REVIEW_SESSION_QUESTIONS, type ReviewQueueSourceMeta } from "@/lib/review-mode";

function uniqPreserveNums(ids: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/**
 * Builds ordered question ids for one REVIEW session.
 *
 * **Source (same as `getTodayQueue` in `fsrs.ts`):**
 * 1. **Due first**: `FsrsCardState` with `suspended=false`, `state ∈ {Learning, Review, Relearning}`, `due <= now`, ordered by `due asc`, max 100 (`REVIEW_CAP` in fsrs).
 * 2. **Then new**: append **New** cards (`state=New`), ordered by `createdAt asc`, daily cap 10 when due non-empty else 20 (`NEW_CARD_DAILY_CAP` / `NEW_CAP_BACKFILL`).
 * 3. **Dedupe** preserving order, then **slice** to `MAX_REVIEW_SESSION_QUESTIONS`.
 */
export async function buildReviewSession(): Promise<{
  questionIds: number[];
  sourceMeta: ReviewQueueSourceMeta;
}> {
  const q = await getTodayQueue();
  const dueIds = q.due.map((c) => c.questionId);
  const newIds = q.new.map((c) => c.questionId);
  const combined = uniqPreserveNums([...dueIds, ...newIds]);
  const capped = combined.slice(0, MAX_REVIEW_SESSION_QUESTIONS);

  return {
    questionIds: capped,
    sourceMeta: {
      dueInQueue: dueIds.length,
      newInQueue: newIds.length,
      totalFromHelper: q.total,
      sessionQuestionCount: capped.length,
    },
  };
}
