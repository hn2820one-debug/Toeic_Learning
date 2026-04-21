/**
 * Pure scoring for scaffolded PRACTICE — not used for ELO / FSRS.
 * Pass rule (v2): raw ≥ 0.7 OR no-hint first-try rate ≥ 0.5 OR effectiveAccuracy ≥ 0.65,
 * where effectiveAccuracy = max(0, rawCorrectRate − totalHints×0.03) at session level.
 */

import { computePracticeOutcomeV2 } from "./evaluate-practice-result";
import type { PracticeQuestionOutcome } from "./practice-outcome-types";

export type { PracticeQuestionOutcome };

export type PracticeSessionSummaryInput = {
  questions: PracticeQuestionOutcome[];
};

/** @deprecated Legacy constant — kept for tests referencing old cap heuristic. */
export const HINT_PENALTY_PER_VIEW = 0.02;
export const HINT_PENALTY_CAP = 0.25;

/** @deprecated Old pass gate — use returned `passed` from computePracticeOutcome. */
export const PASS_MIN_RAW_RATE = 0.6;
export const PASS_MIN_EFFECTIVE = 0.65;

export function computePracticeOutcome(input: PracticeSessionSummaryInput): {
  rawCorrectRate: number;
  totalHintsUsed: number;
  hintPenalty: number;
  effectiveAccuracy: number;
  noHintCorrectRate: number;
  passed: boolean;
} {
  const n = input.questions.length;
  if (n === 0) {
    return {
      rawCorrectRate: 0,
      totalHintsUsed: 0,
      hintPenalty: 0,
      effectiveAccuracy: 0,
      noHintCorrectRate: 0,
      passed: false,
    };
  }

  const v2 = computePracticeOutcomeV2({ questions: input.questions });

  return {
    rawCorrectRate: v2.rawCorrectRate,
    totalHintsUsed: v2.totalHintsUsed,
    hintPenalty: Math.min(HINT_PENALTY_CAP, v2.hintImpact),
    effectiveAccuracy: v2.effectiveAccuracy,
    noHintCorrectRate: v2.noHintCorrectRate,
    passed: v2.passed,
  };
}

/**
 * Derives per-question outcomes from stored item states.
 */
export function outcomesFromItemStates(
  states: Array<{
    attempts: Array<{ correct: boolean; hintsAtSubmit?: number }>;
    hintViews: unknown[];
  }>,
): PracticeQuestionOutcome[] {
  return states.map((s) => {
    const first = s.attempts[0];
    const firstTryCorrect = first?.correct === true;
    const hintsAtSubmit = typeof first?.hintsAtSubmit === "number" ? first.hintsAtSubmit : 0;
    const firstTryNoHint = firstTryCorrect && hintsAtSubmit === 0;
    return {
      firstTryCorrect,
      hintEvents: s.hintViews.length,
      firstTryNoHint,
    };
  });
}
