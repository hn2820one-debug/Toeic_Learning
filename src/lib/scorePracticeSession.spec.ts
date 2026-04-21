import { describe, expect, it } from "vitest";

import { computePracticeOutcome, HINT_PENALTY_CAP } from "@/lib/practice/practice-result-rules";

const q = (partial: {
  firstTryCorrect: boolean;
  hintEvents: number;
  firstTryNoHint: boolean;
}) => partial;

describe("computePracticeOutcome (v2)", () => {
  it("computes raw, effectiveAccuracy, no-hint rate, and pass when raw ≥ 0.7", () => {
    const out = computePracticeOutcome({
      questions: [
        q({ firstTryCorrect: true, hintEvents: 0, firstTryNoHint: true }),
        q({ firstTryCorrect: true, hintEvents: 0, firstTryNoHint: true }),
        q({ firstTryCorrect: false, hintEvents: 0, firstTryNoHint: false }),
        q({ firstTryCorrect: true, hintEvents: 0, firstTryNoHint: true }),
        q({ firstTryCorrect: true, hintEvents: 0, firstTryNoHint: true }),
      ],
    });
    expect(out.rawCorrectRate).toBe(0.8);
    expect(out.totalHintsUsed).toBe(0);
    expect(out.hintPenalty).toBe(0);
    expect(out.effectiveAccuracy).toBe(0.8);
    expect(out.noHintCorrectRate).toBe(0.8);
    expect(out.passed).toBe(true);
  });

  it("subtracts session-level hint weight from raw for effectiveAccuracy", () => {
    const n = 5;
    const hintsPerQ = 10;
    const out = computePracticeOutcome({
      questions: Array.from({ length: n }, () =>
        q({ firstTryCorrect: true, hintEvents: hintsPerQ, firstTryNoHint: false }),
      ),
    });
    const totalHints = n * hintsPerQ;
    expect(out.totalHintsUsed).toBe(totalHints);
    expect(out.hintPenalty).toBe(Math.min(HINT_PENALTY_CAP, totalHints * 0.03));
    expect(out.effectiveAccuracy).toBe(Math.max(0, 1 - totalHints * 0.03));
    expect(out.passed).toBe(true);
  });

  it("fails when raw, no-hint rate, and effective all miss thresholds", () => {
    const out = computePracticeOutcome({
      questions: [
        q({ firstTryCorrect: true, hintEvents: 10, firstTryNoHint: false }),
        q({ firstTryCorrect: true, hintEvents: 10, firstTryNoHint: false }),
        q({ firstTryCorrect: true, hintEvents: 10, firstTryNoHint: false }),
        q({ firstTryCorrect: false, hintEvents: 0, firstTryNoHint: false }),
        q({ firstTryCorrect: false, hintEvents: 0, firstTryNoHint: false }),
      ],
    });
    expect(out.rawCorrectRate).toBe(0.6);
    expect(out.noHintCorrectRate).toBe(0);
    expect(out.effectiveAccuracy).toBe(Math.max(0, 0.6 - 30 * 0.03));
    expect(out.passed).toBe(false);
  });

  it("passes via no-hint first-try rate ≥ 0.5 when raw is only 0.5", () => {
    const out = computePracticeOutcome({
      questions: [
        q({ firstTryCorrect: true, hintEvents: 0, firstTryNoHint: true }),
        q({ firstTryCorrect: true, hintEvents: 0, firstTryNoHint: true }),
        q({ firstTryCorrect: false, hintEvents: 0, firstTryNoHint: false }),
        q({ firstTryCorrect: false, hintEvents: 0, firstTryNoHint: false }),
      ],
    });
    expect(out.rawCorrectRate).toBe(0.5);
    expect(out.noHintCorrectRate).toBe(0.5);
    expect(out.passed).toBe(true);
  });

  it("returns zeros and not passed for empty session", () => {
    const out = computePracticeOutcome({ questions: [] });
    expect(out.rawCorrectRate).toBe(0);
    expect(out.passed).toBe(false);
  });
});
