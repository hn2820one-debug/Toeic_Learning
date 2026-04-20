/**
 * "Hesitation" = answered correctly but not yet fluent (slow / hints / retries / changed answer).
 * Distinct from wrong answers; used for warm-up / practice reinforcement — not equivalent to 錯題.
 */
import type { PracticeItemState } from "@/lib/practice/practice-state";
import { parsePracticeItemState } from "@/lib/practice/practice-state";
import type { ReviewItemStateJson } from "@/lib/review-mode";
import { parseReviewItemState } from "@/lib/review-mode";
import { REVIEW_SECONDS_PER_QUESTION } from "@/lib/review-mode";
import type { TestItemStateJson } from "@/lib/test-mode";
import { parseTestItemState } from "@/lib/test-mode";
import { TEST_SECONDS_PER_QUESTION } from "@/lib/test-mode";

export type SessionModeKind = "practice" | "test" | "review" | "warmup";

/** Three-way mastery signal for UI + downstream selection. */
export type MasteryTier = "fluent" | "hesitant" | "struggling";

export type HesitationReasonCode =
  | "slow_relative"
  | "slow_absolute_floor"
  | "hint_used"
  | "multiple_attempts"
  | "changed_answer"
  | "timeout_or_wrong";

export type ItemHesitationResult = {
  position: number;
  questionId: number;
  tier: MasteryTier;
  /** Present when tier is hesitant (why it is "半掌握"). */
  reasons: HesitationReasonCode[];
  /** Seconds from first interaction to correct submit (practice / derived). */
  resolveSec: number | null;
};

const PRACTICE_ABSOLUTE_SLOW_SEC = 15;
const TEST_RELATIVE_PERCENTILE = 0.72;
const REVIEW_RELATIVE_PERCENTILE = 0.72;
const MIN_PEER_SAMPLES_FOR_RELATIVE = 3;

function percentileSorted(sorted: number[], p: number): number | null {
  if (sorted.length === 0) {
    return null;
  }
  const n = sorted.length;
  const idx = Math.min(n - 1, Math.max(0, Math.ceil(p * n) - 1));
  return sorted[idx] ?? null;
}

/** Positive resolve times from a list of numbers (practice items). */
export function percentileThreshold(values: number[], p: number): number | null {
  const xs = values.filter((v) => v > 0 && Number.isFinite(v)).sort((a, b) => a - b);
  return percentileSorted(xs, p);
}

/**
 * Time from first interaction to the first correct attempt (practice).
 */
export function practiceResolveSeconds(state: PracticeItemState): number | null {
  if (state.status !== "solved") {
    return null;
  }
  const winning = [...state.attempts].reverse().find((a) => a.correct);
  if (!winning) {
    return null;
  }
  const t0 = state.firstOpenedAt ?? state.attempts[0]?.answeredAt;
  if (!t0) {
    return null;
  }
  return Math.max(0, (Date.parse(winning.answeredAt) - Date.parse(t0)) / 1000);
}

export function collectPracticePeerResolveSeconds(states: PracticeItemState[], excludeIndex: number): number[] {
  const out: number[] = [];
  states.forEach((st, i) => {
    if (i === excludeIndex) {
      return;
    }
    const sec = practiceResolveSeconds(st);
    if (sec != null && sec > 0) {
      out.push(sec);
    }
  });
  return out;
}

function isSlowPracticeRelative(resolveSec: number, peers: number[]): boolean {
  if (peers.length < MIN_PEER_SAMPLES_FOR_RELATIVE) {
    return resolveSec >= PRACTICE_ABSOLUTE_SLOW_SEC;
  }
  const th = percentileThreshold(peers, 0.75);
  if (th == null) {
    return resolveSec >= PRACTICE_ABSOLUTE_SLOW_SEC;
  }
  return resolveSec > th && resolveSec >= PRACTICE_ABSOLUTE_SLOW_SEC * 0.85;
}

function isSlowTestRelative(timeTakenSec: number, peerCorrectTimes: number[]): boolean {
  const floor = Math.max(8, TEST_SECONDS_PER_QUESTION * 0.62);
  if (peerCorrectTimes.length < MIN_PEER_SAMPLES_FOR_RELATIVE) {
    return timeTakenSec >= floor;
  }
  const th = percentileThreshold(peerCorrectTimes, TEST_RELATIVE_PERCENTILE);
  if (th == null) {
    return timeTakenSec >= floor;
  }
  return timeTakenSec > th && timeTakenSec >= floor;
}

function isSlowReviewRelative(timeTakenSec: number, peerTimes: number[]): boolean {
  const floor = Math.max(10, REVIEW_SECONDS_PER_QUESTION * 0.55);
  if (peerTimes.length < MIN_PEER_SAMPLES_FOR_RELATIVE) {
    return timeTakenSec >= floor;
  }
  const th = percentileThreshold(peerTimes, REVIEW_RELATIVE_PERCENTILE);
  if (th == null) {
    return timeTakenSec >= floor;
  }
  return timeTakenSec > th && timeTakenSec >= floor;
}

function changedAnswerThenCorrect(state: PracticeItemState): boolean {
  if (state.status !== "solved" || state.attempts.length < 2) {
    return false;
  }
  const last = state.attempts[state.attempts.length - 1];
  if (!last?.correct) {
    return false;
  }
  return state.attempts.some((a) => !a.correct);
}

export function classifyPracticeItem(params: {
  state: PracticeItemState;
  position: number;
  questionId: number;
  peerResolveSeconds: number[];
}): ItemHesitationResult {
  const { state, position, questionId, peerResolveSeconds } = params;
  const reasons: HesitationReasonCode[] = [];

  if (state.status === "revealed") {
    return {
      position,
      questionId,
      tier: "struggling",
      reasons: ["timeout_or_wrong"],
      resolveSec: practiceResolveSeconds(state),
    };
  }

  if (state.status !== "solved") {
    return {
      position,
      questionId,
      tier: "struggling",
      reasons: ["timeout_or_wrong"],
      resolveSec: null,
    };
  }

  const resolveSec = practiceResolveSeconds(state);
  const hintsShown = state.maxHintLayerSeen > 0 ? state.maxHintLayerSeen : state.hintViews.length;
  if (hintsShown >= 1) {
    reasons.push("hint_used");
  }
  if (state.attempts.length > 1) {
    reasons.push("multiple_attempts");
  }
  if (changedAnswerThenCorrect(state)) {
    reasons.push("changed_answer");
  }
  if (resolveSec != null && isSlowPracticeRelative(resolveSec, peerResolveSeconds)) {
    reasons.push(peerResolveSeconds.length >= MIN_PEER_SAMPLES_FOR_RELATIVE ? "slow_relative" : "slow_absolute_floor");
  }

  const hesitant = reasons.length > 0;
  return {
    position,
    questionId,
    tier: hesitant ? "hesitant" : "fluent",
    reasons: hesitant ? reasons : [],
    resolveSec,
  };
}

export function classifyTestItem(params: {
  state: TestItemStateJson;
  position: number;
  questionId: number;
  peerCorrectTimes: number[];
}): ItemHesitationResult {
  const { state, position, questionId, peerCorrectTimes } = params;
  if (state.phase !== "answered" || state.correct == null) {
    return {
      position,
      questionId,
      tier: "struggling",
      reasons: ["timeout_or_wrong"],
      resolveSec: state.timeTakenSec ?? null,
    };
  }
  if (state.timedOut || state.userChoice === "TIMEOUT" || !state.correct) {
    return {
      position,
      questionId,
      tier: "struggling",
      reasons: ["timeout_or_wrong"],
      resolveSec: state.timeTakenSec ?? null,
    };
  }

  const t = state.timeTakenSec ?? null;
  const reasons: HesitationReasonCode[] = [];
  if (t != null && isSlowTestRelative(t, peerCorrectTimes)) {
    reasons.push(peerCorrectTimes.length >= MIN_PEER_SAMPLES_FOR_RELATIVE ? "slow_relative" : "slow_absolute_floor");
  }

  return {
    position,
    questionId,
    tier: reasons.length > 0 ? "hesitant" : "fluent",
    reasons,
    resolveSec: t,
  };
}

export function classifyReviewItem(params: {
  state: ReviewItemStateJson;
  position: number;
  questionId: number;
  peerTimes: number[];
}): ItemHesitationResult {
  const { state, position, questionId, peerTimes } = params;
  const answered = state.phase === "answered" || state.phase === "rated";
  if (!answered || state.correct == null) {
    return { position, questionId, tier: "struggling", reasons: ["timeout_or_wrong"], resolveSec: state.timeTakenSec ?? null };
  }
  if (state.timedOut || !state.correct) {
    return {
      position,
      questionId,
      tier: "struggling",
      reasons: ["timeout_or_wrong"],
      resolveSec: state.timeTakenSec ?? null,
    };
  }

  const t = state.timeTakenSec ?? null;
  const reasons: HesitationReasonCode[] = [];
  if (t != null && isSlowReviewRelative(t, peerTimes)) {
    reasons.push(peerTimes.length >= MIN_PEER_SAMPLES_FOR_RELATIVE ? "slow_relative" : "slow_absolute_floor");
  }

  return {
    position,
    questionId,
    tier: reasons.length > 0 ? "hesitant" : "fluent",
    reasons,
    resolveSec: t,
  };
}

export function summarizeMasteryTiers(rows: ItemHesitationResult[]): {
  fluent: number;
  hesitant: number;
  struggling: number;
} {
  let fluent = 0;
  let hesitant = 0;
  let struggling = 0;
  for (const r of rows) {
    if (r.tier === "fluent") {
      fluent += 1;
    } else if (r.tier === "hesitant") {
      hesitant += 1;
    } else {
      struggling += 1;
    }
  }
  return { fluent, hesitant, struggling };
}

/** Warm-up / reinforcement: strong signal without full session peer context. */
export function practiceItemLooksHesitant(state: PracticeItemState): boolean {
  if (state.status !== "solved") {
    return false;
  }
  const hintsShown = state.maxHintLayerSeen > 0 ? state.maxHintLayerSeen : state.hintViews.length;
  if (hintsShown >= 1) {
    return true;
  }
  if (state.attempts.length > 1 || changedAnswerThenCorrect(state)) {
    return true;
  }
  const sec = practiceResolveSeconds(state);
  if (sec != null && sec >= PRACTICE_ABSOLUTE_SLOW_SEC) {
    return true;
  }
  return false;
}

export function buildPracticeSessionHesitationRows(
  items: ReadonlyArray<{ position: number; questionBankItemId: number; practiceStateJson: unknown }>,
): ItemHesitationResult[] {
  const states = items.map((it) => parsePracticeItemState(it.practiceStateJson));
  return items.map((it, i) =>
    classifyPracticeItem({
      state: states[i]!,
      position: it.position,
      questionId: it.questionBankItemId,
      peerResolveSeconds: collectPracticePeerResolveSeconds(states, i),
    }),
  );
}

export function buildTestSessionHesitationRows(
  items: ReadonlyArray<{ position: number; questionBankItemId: number; testStateJson: unknown }>,
): ItemHesitationResult[] {
  const states = items.map((it) => parseTestItemState(it.testStateJson));
  const timeByIndex = states.map((st) =>
    st.phase === "answered" && st.correct === true && !st.timedOut && st.timeTakenSec != null
      ? st.timeTakenSec
      : null,
  );

  return items.map((it, i) => {
    const st = states[i]!;
    const peerCorrectTimes = timeByIndex
      .map((t, j) => (j !== i && t != null ? t : null))
      .filter((t): t is number => t != null && Number.isFinite(t));
    return classifyTestItem({
      state: st,
      position: it.position,
      questionId: it.questionBankItemId,
      peerCorrectTimes,
    });
  });
}
