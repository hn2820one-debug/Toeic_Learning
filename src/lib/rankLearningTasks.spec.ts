import { describe, expect, it } from "vitest";

import { rankLearningTasks, mergeTopicOrderWithDb, sumEstimatedMinutes } from "@/lib/learning-path";

describe("rankLearningTasks", () => {
  it("prioritizes REVIEW when FSRS has due items", () => {
    const tasks = rankLearningTasks({
      topicOrder: ["office", "finance"],
      progressByTopic: {},
      fsrs: { dueCount: 3, learningDueCount: 0 },
    });
    expect(tasks[0]?.kind).toBe("REVIEW");
    expect(tasks.some((t) => t.kind === "LEARN")).toBe(true);
  });

  it("orders TEST before PRACTICE before LEARN by tier when no review", () => {
    const tasks = rankLearningTasks({
      topicOrder: ["office", "finance", "hr"],
      progressByTopic: {
        office: "Practiced",
        finance: "Introduced",
        hr: "New",
      },
      fsrs: { dueCount: 0, learningDueCount: 0 },
    });
    expect(tasks.map((t) => t.kind)).toEqual(["TEST", "PRACTICE", "LEARN"]);
  });

  it("returns empty when nothing actionable (mastered topics, no FSRS)", () => {
    const tasks = rankLearningTasks({
      topicOrder: ["office"],
      progressByTopic: { office: "Mastered" },
      fsrs: { dueCount: 0, learningDueCount: 0 },
    });
    expect(tasks.length).toBe(0);
  });

  it("handles empty topic order safely by falling back to content default", () => {
    const tasks = rankLearningTasks({
      topicOrder: [],
      progressByTopic: {},
      fsrs: { dueCount: 0, learningDueCount: 0 },
    });
    expect(tasks.length).toBeGreaterThanOrEqual(1);
    expect(tasks.find((t) => t.kind === "LEARN")?.topicKey).toBe("office");
  });
});

describe("mergeTopicOrderWithDb", () => {
  it("orders by DB orderIndex then appends unseen keys", () => {
    const merged = mergeTopicOrderWithDb({
      contentOrder: ["office", "finance", "hr"],
      dbTopics: [
        { topicKey: "hr", orderIndex: 0 },
        { topicKey: "office", orderIndex: 1 },
      ],
    });
    expect(merged.slice(0, 3)).toEqual(["hr", "office", "finance"]);
  });
});

describe("sumEstimatedMinutes", () => {
  it("sums task estimates", () => {
    const tasks = rankLearningTasks({
      topicOrder: ["office"],
      progressByTopic: {},
      fsrs: { dueCount: 1, learningDueCount: 0 },
    });
    expect(sumEstimatedMinutes(tasks)).toBeGreaterThan(0);
  });
});
