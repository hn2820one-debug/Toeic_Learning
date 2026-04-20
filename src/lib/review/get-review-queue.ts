import "server-only";

import { getQueueStats, getTodayQueue } from "@/lib/fsrs";

/**
 * Thin wrapper around `getTodayQueue()` — single entry for review route queue reads.
 * Do not duplicate FSRS logic here; always delegate to `src/lib/fsrs.ts`.
 */
export async function getReviewQueue() {
  return getTodayQueue();
}

/**
 * Dashboard-style counts for empty states and post-session summary.
 */
export async function getReviewQueueStats() {
  return getQueueStats();
}
