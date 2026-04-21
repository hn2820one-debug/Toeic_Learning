import "server-only";

import { getOrCreateDevUser } from "@/lib/dev-user";
import { prisma } from "@/lib/prisma";

export type DailyPlanActivity = {
  type:
    | "warmup"
    | "review"
    | "learn"
    | "practice"
    | "test"
    | "mixed_reading"
    | "mixed_mock"
    | "reflect";
  skillCode: string | null;
  minutes: number;
  notes: string | null;
};

export type DailyPlanItemView = {
  id: string;
  dayNumber: number;
  dayType: "A" | "B" | "C" | "D" | "special";
  primarySkillCode: string | null;
  primarySkillLabelZh: string | null;
  activities: DailyPlanActivity[];
  totalMinutes: number;
  completed: boolean;
  completedAt: Date | null;
  cognitiveLoad: number | null;
  notes: string | null;
};

export type StudyPlanView = {
  id: string;
  name: string;
  durationDays: number;
  startDate: Date | null;
  targetScore: number | null;
  baselineScore: number | null;
  finalScore: number | null;
  plannedSkillCodes: string[];
  completedSkillCodes: string[];
  status: string;
  days: DailyPlanItemView[];
  completedDays: number;
  currentDayNumber: number;
};

/** Safely parse a JSON-ish column into a string array. */
function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string" && value.length > 0) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      // fall through
    }
  }
  return [];
}

/** Safely parse the activitiesJson column, guarding against bad shapes. */
function parseActivities(value: unknown): DailyPlanActivity[] {
  let raw: unknown = value;
  if (typeof value === "string") {
    try {
      raw = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): DailyPlanActivity | null => {
      if (typeof item !== "object" || item === null) return null;
      const obj = item as Record<string, unknown>;
      const type = typeof obj.type === "string" ? (obj.type as DailyPlanActivity["type"]) : null;
      const minutes = typeof obj.minutes === "number" ? obj.minutes : 0;
      if (!type) return null;
      return {
        type,
        skillCode: typeof obj.skillCode === "string" ? obj.skillCode : null,
        minutes,
        notes: typeof obj.notes === "string" ? obj.notes : null,
      };
    })
    .filter((item): item is DailyPlanActivity => item !== null);
}

export async function getActiveStudyPlanView(): Promise<StudyPlanView | null> {
  const user = await getOrCreateDevUser();
  if (!user) return null;

  const plan = await prisma.studyPlan.findFirst({
    where: { userId: user.id, status: "active" },
    orderBy: { createdAt: "desc" },
    include: {
      dailyItems: {
        orderBy: { dayNumber: "asc" },
      },
    },
  });
  if (!plan) return null;

  // Resolve primary skill labels in one query
  const primarySkillCodes = Array.from(
    new Set(
      plan.dailyItems
        .map((d) => d.primarySkillCode)
        .filter((code): code is string => typeof code === "string" && code.length > 0),
    ),
  );
  const skillRows = primarySkillCodes.length
    ? await prisma.learningSkill.findMany({
        where: { skillCode: { in: primarySkillCodes } },
        select: { skillCode: true, labelZh: true },
      })
    : [];
  const skillLabelByCode = new Map(skillRows.map((s) => [s.skillCode, s.labelZh] as const));

  const days: DailyPlanItemView[] = plan.dailyItems.map((row) => {
    const activities = parseActivities(row.activitiesJson);
    const totalMinutes = activities.reduce((sum, a) => sum + a.minutes, 0);
    return {
      id: row.id,
      dayNumber: row.dayNumber,
      dayType: row.dayType as DailyPlanItemView["dayType"],
      primarySkillCode: row.primarySkillCode,
      primarySkillLabelZh: row.primarySkillCode
        ? skillLabelByCode.get(row.primarySkillCode) ?? null
        : null,
      activities,
      totalMinutes,
      completed: row.completed,
      completedAt: row.completedAt,
      cognitiveLoad: row.cognitiveLoad,
      notes: row.notes,
    };
  });

  const completedDays = days.filter((d) => d.completed).length;
  // "Current day" = first incomplete day number (or durationDays if all done)
  const firstIncomplete = days.find((d) => !d.completed);
  const currentDayNumber = firstIncomplete ? firstIncomplete.dayNumber : plan.durationDays;

  return {
    id: plan.id,
    name: plan.name,
    durationDays: plan.durationDays,
    startDate: plan.startDate,
    targetScore: plan.targetScore,
    baselineScore: plan.baselineScore,
    finalScore: plan.finalScore,
    plannedSkillCodes: parseStringArray(plan.plannedSkillsJson),
    completedSkillCodes: parseStringArray(plan.completedSkillsJson),
    status: plan.status,
    days,
    completedDays,
    currentDayNumber,
  };
}
