import { describe, expect, it } from "vitest";

import { buildComposedLearningTasks } from "./today-task-composer";

describe("buildComposedLearningTasks", () => {
  it("puts FSRS review first when due cards exist", () => {
    const tasks = buildComposedLearningTasks({
      topicOrder: ["office"],
      progressByTopic: {},
      fsrs: { dueCount: 3, learningDueCount: 0 },
      studyPlan: null,
    });
    expect(tasks[0]?.type).toBe("review");
    expect(tasks[0]?.priority).toBeLessThan(25);
  });

  it("adds daily plan task at priority 25 when study plan has incomplete current day", () => {
    const tasks = buildComposedLearningTasks({
      topicOrder: ["office"],
      progressByTopic: {},
      fsrs: { dueCount: 0, learningDueCount: 0 },
      studyPlan: {
        id: "p1",
        name: "Test",
        durationDays: 30,
        startDate: null,
        targetScore: null,
        baselineScore: null,
        finalScore: null,
        plannedSkillCodes: [],
        completedSkillCodes: [],
        status: "active",
        completedDays: 0,
        currentDayNumber: 1,
        days: [
          {
            id: "d1",
            dayNumber: 1,
            dayType: "A",
            primarySkillCode: "grammar_svc",
            primarySkillLabelZh: "SVC",
            activities: [{ type: "learn", skillCode: "grammar_svc", minutes: 20, notes: null }],
            totalMinutes: 20,
            completed: false,
            completedAt: null,
            cognitiveLoad: null,
            notes: "day 1",
          },
        ],
      },
    });
    const daily = tasks.find((t) => t.title.includes("30日計劃"));
    expect(daily).toBeDefined();
    expect(daily?.priority).toBe(25);
  });
});
