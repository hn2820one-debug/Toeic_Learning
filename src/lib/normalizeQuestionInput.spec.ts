import { describe, expect, it } from "vitest";

import { buildQuestionBankCreateData } from "@/lib/question-management";
import { normalizeQuestionInput, validateAndNormalizeQuestionInput } from "@/lib/question-fields";

const validBase = {
  questionText: "Q",
  optionA: "A",
  optionB: "B",
  optionC: "C",
  optionD: "D",
  correctAnswer: "C",
  explanation: null as string | null,
  topic: "t",
  difficulty: "A",
};

describe("validateAndNormalizeQuestionInput", () => {
  it("trims stem and collapses internal whitespace", () => {
    const r = validateAndNormalizeQuestionInput({
      ...validBase,
      questionText: "  hello   world  ",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.questionText).toBe("hello world");
  });

  it("normalizes correctAnswer and difficulty case", () => {
    const r = validateAndNormalizeQuestionInput({
      ...validBase,
      correctAnswer: "a",
      difficulty: "b",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.correctAnswer).toBe("A");
      expect(r.data.difficulty).toBe("B");
    }
  });

  it("normalizes topic whitespace", () => {
    const r = validateAndNormalizeQuestionInput({
      ...validBase,
      topic: "  Foo   Bar ",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.topic).toBe("Foo Bar");
  });

  it("rejects invalid difficulty", () => {
    const r = validateAndNormalizeQuestionInput({
      ...validBase,
      difficulty: "Z",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issue).toBe("difficulty");
  });

  it("rejects empty options", () => {
    const r = validateAndNormalizeQuestionInput({
      ...validBase,
      optionA: "   ",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issue).toBe("options");
  });

  it("normalizeQuestionInput matches validated data on success", () => {
    const input = {
      questionText: "  x  ",
      optionA: "a",
      optionB: "b",
      optionC: "c",
      optionD: "d",
      correctAnswer: "d",
      explanation: "",
      topic: "top",
      difficulty: "c",
    };
    const v = validateAndNormalizeQuestionInput(input);
    expect(v.ok).toBe(true);
    expect(normalizeQuestionInput(input)).toEqual(v.ok ? v.data : null);
  });

  it("import vs manual only changes default sourceQuality on same normalized row", () => {
    const v = validateAndNormalizeQuestionInput({
      ...validBase,
      skillKey: "grammar.verb-control",
      moduleKey: "phase1-core-grammar-control",
    });
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    const manual = buildQuestionBankCreateData(v.data, { sourceKind: "manual" });
    const json = buildQuestionBankCreateData(v.data, { sourceKind: "import_json" });
    expect(manual.questionText).toBe(v.data.questionText);
    expect(json.questionText).toBe(v.data.questionText);
    expect(manual.sourceQuality).toBe("manual");
    expect(json.sourceQuality).toBe("import_json");
  });
});
