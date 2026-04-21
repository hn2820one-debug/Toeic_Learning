import { describe, expect, it } from "vitest";

import { buildComposeQuestionWhere } from "./session-compose-filters";

describe("buildComposeQuestionWhere", () => {
  it("returns empty filter when no dual-axis fields", () => {
    expect(buildComposeQuestionWhere({ mode: "mixed_practice" })).toEqual({});
  });

  it("combines module, topic, and skill with AND", () => {
    expect(
      buildComposeQuestionWhere({
        mode: "lesson_drill",
        moduleKey: "phase1-core-grammar-control",
        topicKey: "finance",
        primaryLearningSkillCode: "grammar_svc",
      }),
    ).toEqual({
      AND: [
        { moduleKey: "phase1-core-grammar-control" },
        { topicKey: "finance" },
        { primaryLearningSkillCode: "grammar_svc" },
      ],
    });
  });

  it("trims whitespace on keys", () => {
    expect(
      buildComposeQuestionWhere({
        mode: "checkpoint",
        topicKey: "  finance  ",
      }),
    ).toEqual({
      AND: [{ topicKey: "finance" }],
    });
  });
});
