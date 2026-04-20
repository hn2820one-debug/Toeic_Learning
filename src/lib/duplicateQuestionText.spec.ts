import { describe, expect, it } from "vitest";

import { normalizedQuestionTextForDuplicateLookup } from "@/lib/duplicate-question-text";

const minimalValid = {
  questionText: "Stem",
  optionA: "a",
  optionB: "b",
  optionC: "c",
  optionD: "d",
  correctAnswer: "A",
  explanation: null as string | null,
  topic: "Topic",
  difficulty: "A",
};

describe("normalizedQuestionTextForDuplicateLookup", () => {
  it("returns the same key for form-shaped vs import-shaped whitespace variants", () => {
    const k1 = normalizedQuestionTextForDuplicateLookup({
      ...minimalValid,
      questionText: "  Same   stem  ",
    });
    const k2 = normalizedQuestionTextForDuplicateLookup({
      ...minimalValid,
      questionText: "Same stem",
    });
    expect(k1).toBe("Same stem");
    expect(k2).toBe("Same stem");
  });

  it("returns null when validation fails (duplicate check must not silently coerce)", () => {
    expect(
      normalizedQuestionTextForDuplicateLookup({
        ...minimalValid,
        difficulty: "bad",
      }),
    ).toBeNull();
  });
});
