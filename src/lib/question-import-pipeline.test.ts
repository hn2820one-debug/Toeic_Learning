import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeQuestionInput, validateAndNormalizeQuestionInput } from "./question-fields";
import { buildQuestionBankCreateData } from "./question-management";

describe("question import pipeline (single normalize helper)", () => {
  it("validateAndNormalizeQuestionInput and normalizeQuestionInput agree on success", () => {
    const input = {
      questionText: "  hello   world  ",
      optionA: " a ",
      optionB: "b",
      optionC: "c",
      optionD: "d",
      correctAnswer: "a",
      explanation: "",
      topic: "  Topics ",
      difficulty: "b",
    };

    const validated = validateAndNormalizeQuestionInput(input);
    assert.equal(validated.ok, true);
    if (!validated.ok) {
      return;
    }

    assert.deepEqual(normalizeQuestionInput(input), validated.data);
    assert.equal(validated.data.questionText, "hello world");
  });

  it("manual vs import_json only differ by default sourceQuality on the same normalized payload", () => {
    const validated = validateAndNormalizeQuestionInput({
      questionText: "Q",
      optionA: "A",
      optionB: "B",
      optionC: "C",
      optionD: "D",
      correctAnswer: "C",
      explanation: null,
      topic: "t",
      difficulty: "A",
    });

    assert.equal(validated.ok, true);
    if (!validated.ok) {
      return;
    }

    const manual = buildQuestionBankCreateData(validated.data, { defaultSourceQuality: "manual" });
    const json = buildQuestionBankCreateData(validated.data, { defaultSourceQuality: "import_json" });

    assert.equal(manual.questionText, validated.data.questionText);
    assert.equal(json.questionText, validated.data.questionText);
    assert.equal(manual.sourceQuality, "manual");
    assert.equal(json.sourceQuality, "import_json");
  });
});
