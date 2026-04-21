/**
 * Core pass / effective metrics (imported by practice-result-rules).
 */
import type { PracticeQuestionOutcome } from "./practice-outcome-types";

export type PracticeSessionSummaryV2 = {
  questions: PracticeQuestionOutcome[];
};

const PASS_RAW = 0.7;
const PASS_NO_HINT_RATE = 0.5;
const PASS_EFFECTIVE = 0.65;
const HINT_WEIGHT = 0.03;

export function computePracticeOutcomeV2(input: PracticeSessionSummaryV2): {
  rawCorrectRate: number;
  totalHintsUsed: number;
  noHintCorrectRate: number;
  effectiveAccuracy: number;
  hintImpact: number;
  passed: boolean;
} {
  const n = input.questions.length;
  if (n === 0) {
    return {
      rawCorrectRate: 0,
      totalHintsUsed: 0,
      noHintCorrectRate: 0,
      effectiveAccuracy: 0,
      hintImpact: 0,
      passed: false,
    };
  }

  const firstOk = input.questions.filter((q) => q.firstTryCorrect).length;
  const rawCorrectRate = firstOk / n;

  const totalHintsUsed = input.questions.reduce((a, q) => a + q.hintEvents, 0);
  const hintImpact = totalHintsUsed * HINT_WEIGHT;
  const effectiveAccuracy = Math.max(0, rawCorrectRate - hintImpact);

  const noHintWins = input.questions.filter((q) => q.firstTryNoHint).length;
  const noHintCorrectRate = noHintWins / n;

  const passed =
    rawCorrectRate >= PASS_RAW || noHintCorrectRate >= PASS_NO_HINT_RATE || effectiveAccuracy >= PASS_EFFECTIVE;

  return {
    rawCorrectRate,
    totalHintsUsed,
    noHintCorrectRate,
    effectiveAccuracy,
    hintImpact,
    passed,
  };
}
