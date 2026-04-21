import "server-only";

import { getDailyPlanTaskKind } from "@/lib/today-task-composer";
import {
  getActiveStudyPlanView,
  type DailyPlanItemView,
  type StudyPlanView,
} from "@/lib/study-plan/loader";

export type StudyPlanDayRuntime = DailyPlanItemView & {
  /** learn / practice / checkpoint — matches composer routing */
  taskKind: ReturnType<typeof getDailyPlanTaskKind>;
  /**
   * Non-destructive hint when seed/day checkbox disagrees with plan-level skill completion list
   * or coarse topic progress. Does **not** mutate `DailyPlanItem.completed`.
   */
  runtimeHintZh: string | null;
};

export type StudyPlanRuntimeView = Omit<StudyPlanView, "days"> & {
  days: StudyPlanDayRuntime[];
};

/**
 * Study plan + **runtime overlay**: keeps DB `completed` as source of truth; adds hints from
 * `StudyPlan.completedSkillsJson` without rewriting seed rows.
 */
export async function getStudyPlanRuntimeView(): Promise<StudyPlanRuntimeView | null> {
  const base = await getActiveStudyPlanView();
  if (!base) return null;

  const completedSkillSet = new Set(base.completedSkillCodes);

  const days: StudyPlanDayRuntime[] = base.days.map((day) => {
    const taskKind = getDailyPlanTaskKind(day);
    let runtimeHintZh: string | null = null;

    if (day.primarySkillCode && completedSkillSet.has(day.primarySkillCode) && !day.completed) {
      runtimeHintZh =
        "此主技能已在計劃的「已完成技能」清單中；若你已完成當日內容，可在右側勾選完成。";
    }

    return {
      ...day,
      taskKind,
      runtimeHintZh,
    };
  });

  return {
    ...base,
    days,
  };
}
