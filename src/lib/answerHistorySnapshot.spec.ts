import { describe, expect, it } from "vitest";

import { buildAnswerHistorySnapshotData } from "@/lib/answer-history-snapshots";

describe("buildAnswerHistorySnapshotData", () => {
  it("writes all snapshot fields from one question row (submit path contract)", () => {
    const data = buildAnswerHistorySnapshotData({
      questionText: "Stem",
      optionA: "a",
      optionB: "b",
      optionC: "c",
      optionD: "d",
      correctAnswer: "B",
      explanation: "Because.",
      topic: "T",
      difficulty: "A",
      skillKey: "v.x",
      topicKey: "office",
      moduleKey: "phase1-x",
    });
    expect(data.stemSnapshot).toBe("Stem");
    expect(data.choicesSnapshot).toContain('"A":"a"');
    expect(data.optionASnapshot).toBe("a");
    expect(data.correctAnswerSnapshot).toBe("B");
    expect(data.explanationSnapshot).toBe("Because.");
    expect(data.topicSnapshot).toBe("T");
    expect(data.skillKeySnapshot).toBe("v.x");
    expect(data.topicKeySnapshot).toBe("office");
    expect(data.moduleKeySnapshot).toBe("phase1-x");
  });

  it("stores null taxonomy when omitted", () => {
    const data = buildAnswerHistorySnapshotData({
      questionText: "S",
      optionA: "a",
      optionB: "b",
      optionC: "c",
      optionD: "d",
      correctAnswer: "A",
      explanation: null,
      topic: "t",
      difficulty: "B",
    });
    expect(data.explanationSnapshot).toBeNull();
    expect(data.skillKeySnapshot).toBeNull();
    expect(data.topicKeySnapshot).toBeNull();
    expect(data.moduleKeySnapshot).toBeNull();
  });
});
