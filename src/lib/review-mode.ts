/**
 * FSRS-backed REVIEW mode — `LearningSession.mode = review`, state in `reviewStateJson`.
 * Queue construction: `buildReviewSession` in `src/lib/review/build-review-session.ts` (uses `getTodayQueue` from `src/lib/fsrs.ts`).
 */

/** Looser than TEST (30s) — per product spec */
export const REVIEW_SECONDS_PER_QUESTION = 45;

/** Cap per run so a single route visit stays bounded */
export const MAX_REVIEW_SESSION_QUESTIONS = 30;

/** Same sentinel as TEST for timeout rows — keep DB + scoring consistent */
export const REVIEW_TIMEOUT_USER_CHOICE = "TIMEOUT" as const;

export type ReviewRatingName = "Again" | "Hard" | "Good" | "Easy";

export type ReviewItemPhase = "pending" | "shown" | "answered" | "rated";

export type ReviewItemStateJson = {
  v: 1;
  mode: "review";
  phase: ReviewItemPhase;
  shownAt?: string;
  userChoice?: string;
  correct?: boolean;
  answeredAt?: string;
  timeTakenSec?: number;
  timedOut?: boolean;
  lastSubmitKey?: string;
  rating?: ReviewRatingName;
  lastRatingKey?: string;
  ratedAt?: string;
  /** After successful FSRS write — ISO */
  nextDueAt?: string;
};

export function emptyReviewItemState(): ReviewItemStateJson {
  return { v: 1, mode: "review", phase: "pending" };
}

export function parseReviewItemState(raw: unknown): ReviewItemStateJson {
  if (!raw || typeof raw !== "object") {
    return emptyReviewItemState();
  }
  const o = raw as Record<string, unknown>;
  const phase =
    o.phase === "shown" || o.phase === "answered" || o.phase === "rated" ? o.phase : "pending";
  const rating =
    o.rating === "Again" || o.rating === "Hard" || o.rating === "Good" || o.rating === "Easy"
      ? o.rating
      : undefined;
  return {
    v: 1,
    mode: "review",
    phase,
    shownAt: typeof o.shownAt === "string" ? o.shownAt : undefined,
    userChoice: typeof o.userChoice === "string" ? o.userChoice : undefined,
    correct: typeof o.correct === "boolean" ? o.correct : undefined,
    answeredAt: typeof o.answeredAt === "string" ? o.answeredAt : undefined,
    timeTakenSec: typeof o.timeTakenSec === "number" && Number.isFinite(o.timeTakenSec) ? o.timeTakenSec : undefined,
    timedOut: typeof o.timedOut === "boolean" ? o.timedOut : undefined,
    lastSubmitKey: typeof o.lastSubmitKey === "string" ? o.lastSubmitKey : undefined,
    rating,
    lastRatingKey: typeof o.lastRatingKey === "string" ? o.lastRatingKey : undefined,
    ratedAt: typeof o.ratedAt === "string" ? o.ratedAt : undefined,
    nextDueAt: typeof o.nextDueAt === "string" ? o.nextDueAt : undefined,
  };
}

export function isReviewItemRated(st: ReviewItemStateJson): boolean {
  return st.phase === "rated" && st.rating != null;
}

export function isReviewAwaitingRating(st: ReviewItemStateJson): boolean {
  return st.phase === "answered" && st.rating == null;
}

export type ReviewQueueSourceMeta = {
  /** Cards from `getTodayQueue().due` (Learning / Review / Relearning, due <= now), before session cap */
  dueInQueue: number;
  /** Cards from `getTodayQueue().new` (state New), before session cap */
  newInQueue: number;
  /** `due.length + new.length` from helper (uncapped) */
  totalFromHelper: number;
  /** Ids actually scheduled this session (after dedupe + cap) */
  sessionQuestionCount: number;
};

export type ReviewQueueSummary = {
  totalItems: number;
  correctCount: number;
  /** Mean seconds over items with `timeTakenSec` recorded */
  avgTimeTakenSec: number | null;
  ratingCounts: Record<ReviewRatingName, number>;
  /** Sorted by `nextDueAt` ascending (soonest first), from persisted row state */
  soonestNext: { questionId: number; topic: string | null; nextDueAt: string }[];
};

/**
 * Aggregates a completed review run for the completion panel.
 */
export function buildReviewQueueSummary(params: {
  items: ReadonlyArray<{
    questionId: number;
    topic: string | null;
    state: ReviewItemStateJson;
  }>;
}): ReviewQueueSummary {
  let correctCount = 0;
  const ratingCounts: Record<ReviewRatingName, number> = {
    Again: 0,
    Hard: 0,
    Good: 0,
    Easy: 0,
  };
  const withDue: { questionId: number; topic: string | null; nextDueAt: string }[] = [];
  let timeSum = 0;
  let timeCount = 0;

  for (const row of params.items) {
    const st = row.state;
    if (st.correct) {
      correctCount += 1;
    }
    if (st.rating) {
      ratingCounts[st.rating] += 1;
    }
    if (typeof st.timeTakenSec === "number" && Number.isFinite(st.timeTakenSec)) {
      timeSum += st.timeTakenSec;
      timeCount += 1;
    }
    if (st.nextDueAt) {
      withDue.push({
        questionId: row.questionId,
        topic: row.topic,
        nextDueAt: st.nextDueAt,
      });
    }
  }

  withDue.sort((a, b) => new Date(a.nextDueAt).getTime() - new Date(b.nextDueAt).getTime());

  return {
    totalItems: params.items.length,
    correctCount,
    avgTimeTakenSec: timeCount === 0 ? null : timeSum / timeCount,
    ratingCounts,
    soonestNext: withDue.slice(0, 8),
  };
}

export function getRatingStats(summary: ReviewQueueSummary): {
  totalRated: number;
  againRate: number;
  distribution: Record<ReviewRatingName, number>;
} {
  const r = summary.ratingCounts;
  const totalRated = r.Again + r.Hard + r.Good + r.Easy;
  return {
    totalRated,
    againRate: totalRated === 0 ? 0 : r.Again / totalRated,
    distribution: { ...r },
  };
}

export type NextReviewAction = {
  titleZh: string;
  titleEn: string;
  href: string;
  hintZh: string;
  hintEn: string;
};

/**
 * Lightweight CTA — dashboard can also read **`getQueueStats()`** / FSRS tables directly; this is learner-facing copy only.
 */
export function getNextReviewAction(params: {
  /** Fresh FSRS due count (e.g. after session) */
  remainingDueApprox: number;
}): NextReviewAction {
  if (params.remainingDueApprox > 0) {
    return {
      titleZh: "繼續清空到期卡",
      titleEn: "Keep clearing due cards",
      href: "/review",
      hintZh: "儀表板與 /learn 的「到期」數字會跟著 `getQueueStats()` / FSRS 狀態更新。",
      hintEn: "Dashboard and /learn use `getQueueStats()` + FSRS state.",
    };
  }
  return {
    titleZh: "鞏固新內容或推進主題",
    titleEn: "Learn or progress topics",
    href: "/learn",
    hintZh: "今天沒有到期卡時，可從今日學習或主題練習補充新題進 FSRS。",
    hintEn: "When nothing is due, add new items via /learn or topic practice.",
  };
}

export function explanationFallbackCopy(): string {
  return "題庫尚未附文字解析。請對照正解與選項內容複習；必要時回到主題教材加深理解。";
}
