import { describe, expect, it } from "vitest";

import {
  computePracticeOutcome,
  HINT_PENALTY_PER_VIEW,
  PASS_MIN_EFFECTIVE,
} from "@/lib/practice/practice-result-rules";

describe("computePracticeOutcome", () => {
  it("computes rawCorrectRate, hintPenalty, effectiveAccuracy, passed", () => {
    const out = computePracticeOutcome({
      questions: [
        { firstTryCorrect: true, hintEvents: 0 },
        { firstTryCorrect: true, hintEvents: 0 },
        { firstTryCorrect: false, hintEvents: 0 },
        { firstTryCorrect: true, hintEvents: 0 },
        { firstTryCorrect: true, hintEvents: 0 },
      ],
    });
    expect(out.rawCorrectRate).toBe(0.8);
    expect(out.totalHintsUsed).toBe(0);
    expect(out.hintPenalty).toBe(0);
    expect(out.effectiveAccuracy).toBe(0.8);
    expect(out.passed).toBe(true);
  });

  it("applies capped hint penalty to effectiveAccuracy", () => {
    const n = 5;
    const hintsPerQ = 10;
    const out = computePracticeOutcome({
      questions: Array.from({ length: n }, () => ({
        firstTryCorrect: true,
        hintEvents: hintsPerQ,
      })),
    });
    const uncapped = n * hintsPerQ * HINT_PENALTY_PER_VIEW;
    expect(uncapped).toBeGreaterThan(0.25);
    expect(out.hintPenalty).toBe(0.25);
    expect(out.effectiveAccuracy).toBeCloseTo(1 * (1 - 0.25), 5);
  });

  it("fails when raw meets threshold but effective does not (hint penalty caps score)", () => {
    const out = computePracticeOutcome({
      questions: [
        { firstTryCorrect: true, hintEvents: 13 },
        { firstTryCorrect: true, hintEvents: 13 },
        { firstTryCorrect: true, hintEvents: 13 },
        { firstTryCorrect: true, hintEvents: 13 },
        { firstTryCorrect: false, hintEvents: 0 },
      ],
    });
    expect(out.rawCorrectRate).toBeGreaterThanOrEqual(PASS_MIN_RAW_RATE);
    expect(out.hintPenalty).toBe(0.25);
    expect(out.effectiveAccuracy).toBeCloseTo(0.8 * (1 - 0.25), 5);
    expect(out.effectiveAccuracy).toBeLessThan(PASS_MIN_EFFECTIVE);
    expect(out.passed).toBe(false);
  });

  it("returns zeros and not passed for empty session", () => {
    const out = computePracticeOutcome({ questions: [] });
    expect(out.rawCorrectRate).toBe(0);
    expect(out.passed).toBe(false);
  });
});
