"use server";

import { revalidatePath } from "next/cache";

import { getOrCreateDevUser } from "@/lib/dev-user";
import { prisma } from "@/lib/prisma";

type MarkDayCompleteResult =
  | { ok: true; dayNumber: number }
  | { ok: false; error: string };

/**
 * Toggle a DailyPlanItem as completed / not-completed.
 * Non-destructive: does not update StudyPlan.completedSkillsJson — that belongs
 * to the downstream mastery flow (StudySession + UserTopicProgress) and should
 * not be written here.
 */
export async function toggleDayComplete(
  dailyPlanItemId: string,
  cognitiveLoad: number | null,
): Promise<MarkDayCompleteResult> {
  const user = await getOrCreateDevUser();
  if (!user) return { ok: false, error: "No active user." };

  const item = await prisma.dailyPlanItem.findUnique({
    where: { id: dailyPlanItemId },
    select: {
      id: true,
      dayNumber: true,
      completed: true,
      studyPlan: { select: { userId: true } },
    },
  });
  if (!item) return { ok: false, error: "Day not found." };
  if (item.studyPlan.userId !== user.id) {
    return { ok: false, error: "Day belongs to another learner." };
  }

  const nextCompleted = !item.completed;
  await prisma.dailyPlanItem.update({
    where: { id: item.id },
    data: {
      completed: nextCompleted,
      completedAt: nextCompleted ? new Date() : null,
      cognitiveLoad: nextCompleted ? cognitiveLoad : null,
    },
  });

  revalidatePath("/studyplan");
  return { ok: true, dayNumber: item.dayNumber };
}

/** Start Day 1 — sets StudyPlan.startDate to today (idempotent: no-op if already set). */
export async function startPlan(): Promise<{ ok: boolean; error?: string }> {
  const user = await getOrCreateDevUser();
  if (!user) return { ok: false, error: "No active user." };

  const plan = await prisma.studyPlan.findFirst({
    where: { userId: user.id, status: "active" },
    orderBy: { createdAt: "desc" },
  });
  if (!plan) return { ok: false, error: "No active plan." };

  if (plan.startDate) {
    return { ok: true };
  }

  await prisma.studyPlan.update({
    where: { id: plan.id },
    data: { startDate: new Date() },
  });
  revalidatePath("/studyplan");
  return { ok: true };
}
