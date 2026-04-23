import type { StudyPlanDayRuntime } from "@/lib/studyplan/get-studyplan-runtime-view";
import type { DailyPlanActivity } from "@/lib/study-plan/loader";

export const dayTypeLabel: Record<string, { zh: string; badgeClass: string }> = {
  A: { zh: "A · 文法 LEARN", badgeClass: "bg-emerald-600 text-white" },
  B: { zh: "B · 詞彙 PRACTICE", badgeClass: "bg-sky-600 text-white" },
  C: { zh: "C · 混合閱讀", badgeClass: "bg-indigo-600 text-white" },
  D: { zh: "D · 鞏固 + TEST", badgeClass: "bg-amber-600 text-white" },
  special: { zh: "特殊 / 驗收", badgeClass: "bg-rose-600 text-white" },
};

export const activityLabel: Record<string, string> = {
  warmup: "暖身",
  review: "複習（FSRS）",
  learn: "新學",
  practice: "練習",
  test: "測驗",
  mixed_reading: "段落閱讀",
  mixed_mock: "模考",
  reflect: "反思／紀錄",
};

export const taskKindLabel: Record<"learn" | "practice" | "checkpoint", string> = {
  learn: "新學 LEARN",
  practice: "練習 PRACTICE",
  checkpoint: "驗收 TEST",
};

/** UI mode aligned with planner vocabulary (checkpoint → test). */
export type PlanUiMode = "learn" | "practice" | "test" | "review";

export function planUiModeFromDay(day: Pick<StudyPlanDayRuntime, "activities" | "taskKind">): PlanUiMode {
  if (day.taskKind === "checkpoint") return "test";
  const hasCoreSession = day.activities.some((a) =>
    ["learn", "practice", "test", "mixed_reading", "mixed_mock"].includes(a.type),
  );
  if (!hasCoreSession && day.activities.some((a) => a.type === "review")) {
    return "review";
  }
  if (day.taskKind === "learn") return "learn";
  return "practice";
}

export function planUiModeLabel(mode: PlanUiMode): string {
  const m: Record<PlanUiMode, string> = {
    learn: "新學 · Learn",
    practice: "練習 · Practice",
    test: "驗收 · Test",
    review: "複習 · Review",
  };
  return m[mode];
}

export function acceptanceCriteriaForMode(mode: PlanUiMode): { zh: string; en: string } {
  const map: Record<PlanUiMode, { zh: string; en: string }> = {
    learn: {
      zh: "完成當日教材閱讀，能口述主技能規則並辨識訊號。",
      en: "Finish the day’s lesson reading and be able to state the core rule and recognition signals.",
    },
    practice: {
      zh: "完成引導練習區塊；依活動備註完成建議題量與反思。",
      en: "Complete the practice blocks; hit the suggested item counts in the activity notes where applicable.",
    },
    test: {
      zh: "完成計時／診斷測驗區塊；提交後保留錯題檢討紀錄。",
      en: "Complete timed or diagnostic test blocks; keep a short error review after submit.",
    },
    review: {
      zh: "清空或處理 FSRS 到期卡，並完成當日複習步驟。",
      en: "Clear or work through due FSRS cards and finish the scheduled review steps.",
    },
  };
  return map[mode];
}

export function weekNumber(day: number): number {
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

export function activitySkillCodes(activities: DailyPlanActivity[]): string[] {
  return Array.from(
    new Set(
      activities
        .map((a) => a.skillCode)
        .filter((c): c is string => typeof c === "string" && c.trim().length > 0),
    ),
  );
}
