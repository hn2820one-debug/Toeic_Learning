/**
 * Pure scoring for scaffolded PRACTICE — not used for ELO / FSRS.
 */

export type PracticeQuestionOutcome = {
  /** First-try correct per question (best 1 if multiple attempts). */
  firstTryCorrect: boolean;
  /** Number of hint-layer views (each layer click counts once). */
  hintEvents: number;
};

export type PracticeSessionSummaryInput = {
  questions: PracticeQuestionOutcome[];
};

/** Penalty weight per hint view (tunable). */
export const HINT_PENALTY_PER_VIEW = 0.02;
export const HINT_PENALTY_CAP = 0.25;

/** Pass thresholds (tunable). */
export const PASS_MIN_RAW_RATE = 0.6;
export const PASS_MIN_EFFECTIVE = 0.65;

/**
 * - rawCorrectRate: share of questions solved on **first submit** (first try).
 * - totalHintsUsed: sum of hint view events.
 * - hintPenalty: capped sum of per-view penalties applied to effective score.
 * - effectiveAccuracy: rawCorrectRate * (1 - hintPenalty) after cap (documented heuristic).
 * - passed: both raw and effective meet minimums.
 */
export function computePracticeOutcome(input: PracticeSessionSummaryInput): {
  rawCorrectRate: number;
  totalHintsUsed: number;
  hintPenalty: number;
  effectiveAccuracy: number;
  passed: boolean;
} {
  const n = input.questions.length;
  if (n === 0) {
    return {
      rawCorrectRate: 0,
      totalHintsUsed: 0,
      hintPenalty: 0,
      effectiveAccuracy: 0,
      passed: false,
    };
  }

  const firstOk = input.questions.filter((q) => q.firstTryCorrect).length;
  const rawCorrectRate = firstOk / n;

  const totalHintsUsed = input.questions.reduce((a, q) => a + q.hintEvents, 0);
  const uncapped = totalHintsUsed * HINT_PENALTY_PER_VIEW;
  const hintPenalty = Math.min(HINT_PENALTY_CAP, uncapped);

  const effectiveAccuracy = Math.max(0, rawCorrectRate * (1 - hintPenalty));

  const passed = rawCorrectRate >= PASS_MIN_RAW_RATE && effectiveAccuracy >= PASS_MIN_EFFECTIVE;

  return {
    rawCorrectRate,
    totalHintsUsed,
    hintPenalty,
    effectiveAccuracy,
    passed,
  };
}

/**
 * Derives per-question outcomes from stored item states (first attempt correct flag + hint count).
 */
export function outcomesFromItemStates(
  states: Array<{ attempts: Array<{ correct: boolean }>; hintViews: unknown[] }>,
): PracticeQuestionOutcome[] {
  return states.map((s) => {
    const first = s.attempts[0];
    const firstTryCorrect = first?.correct === true;
    return {
      firstTryCorrect,
      hintEvents: s.hintViews.length,
    };
  });
}
