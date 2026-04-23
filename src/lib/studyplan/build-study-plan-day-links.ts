import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import { getDailyPlanTaskKind } from "@/lib/today-task-composer";
import type { StudyPlanDayRuntime } from "@/lib/studyplan/get-studyplan-runtime-view";

const LINK = {
  studyplan: "/studyplan",
  test: "/test",
  practice: "/practice",
  learn: "/learn",
} as const;

/** Practice / test entry uses `skill=` (bank primaryLearningSkillCode). */
function practiceTestQuery(topicKey: Phase1TopicKey, skillCode: string | null | undefined, mode: string): string {
  const base = `topicKey=${encodeURIComponent(topicKey)}&mode=${encodeURIComponent(mode)}`;
  if (skillCode?.trim()) {
    return `${base}&skill=${encodeURIComponent(skillCode.trim())}`;
  }
  return base;
}

export type StudyPlanDayStartLink = {
  href: string;
  labelZh: string;
};

/**
 * Same routing intent as `buildComposedLearningTasks` for the active study-plan day,
 * but parameterized by an explicit resolved topic (not `topicOrder[0]`).
 */
export function buildStudyPlanDayStartLink(
  day: StudyPlanDayRuntime,
  topicKey: Phase1TopicKey | null,
): StudyPlanDayStartLink {
  const taskKind = getDailyPlanTaskKind(day);
  const skill = day.primarySkillCode;

  if (!topicKey) {
    if (taskKind === "checkpoint") {
      return { href: LINK.test, labelZh: "前往測驗（未帶主題）" };
    }
    if (taskKind === "learn") {
      return { href: `${LINK.learn}/onboarding`, labelZh: "前往入門主題" };
    }
    return { href: LINK.practice, labelZh: "前往練習（未帶主題）" };
  }

  if (taskKind === "learn") {
    const q = skill ? `?primaryLearningSkillCode=${encodeURIComponent(skill)}` : "";
    return {
      href: `${LINK.learn}/${encodeURIComponent(topicKey)}${q}`,
      labelZh: "開始新學",
    };
  }
  if (taskKind === "checkpoint") {
    return {
      href: `${LINK.test}?${practiceTestQuery(topicKey, skill, "checkpoint")}`,
      labelZh: "開始驗收測驗",
    };
  }
  return {
    href: `${LINK.practice}?${practiceTestQuery(topicKey, skill, "lesson_drill")}`,
    labelZh: "開始練習",
  };
}
