import { describe, expect, it } from "vitest";

import { buildChoiceFeedback } from "./choice-feedback";

const baseOpts = {
  questionText: "The report ----- by Friday.",
  optionA: "must submit",
  optionB: "must be submitted",
  optionC: "must submitting",
  optionD: "must have submitted",
};

describe("buildChoiceFeedback", () => {
  it("wrong answer uses distractor-style fields and explanation summary in decisiveDifference", () => {
    const fb = buildChoiceFeedback({
      ...baseOpts,
      selectedChoice: "A",
      correctChoice: "B",
      isCorrect: false,
      explanation: "受詞是 report，需被動。B 正確。A 少了被動。",
    });
    expect(fb.selectedChoice).toBe("A");
    expect(fb.correctChoice).toBe("B");
    expect(fb.whySelectedLooksPlausible.length).toBeGreaterThan(20);
    expect(fb.decisiveDifference.length).toBeGreaterThan(10);
    expect(fb.ruleInOneSentence.length).toBeGreaterThan(5);
    expect(fb.retryTip).toBeDefined();
  });

  it("correct answer uses positive decisiveDifference", () => {
    const fb = buildChoiceFeedback({
      ...baseOpts,
      selectedChoice: "B",
      correctChoice: "B",
      isCorrect: true,
      explanation:
        "被動語態：report 是受詞，動詞區塊需用 be + past participle。其他選項可能語意接近，但無法同時滿足被動與時間線索。",
    });
    expect(fb.whySelectedLooksPlausible).toContain("B");
    expect(fb.decisiveDifference.length).toBeGreaterThan(10);
  });

  it("timeout uses dedicated copy", () => {
    const fb = buildChoiceFeedback({
      ...baseOpts,
      selectedChoice: "TIMEOUT",
      correctChoice: "B",
      isCorrect: false,
      explanation: null,
      timedOut: true,
    });
    expect(fb.whySelectedLooksPlausible).toContain("時間");
  });
});
