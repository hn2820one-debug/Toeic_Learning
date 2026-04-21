import "server-only";

import { getHomeDashboardData, type HomeDashboardData } from "@/lib/dashboard-next-action";
import { getOrCreateDevUser } from "@/lib/dev-user";
import { prisma } from "@/lib/prisma";
import { getActiveStudyPlanView } from "@/lib/study-plan/loader";

export type DashboardDataV2 = HomeDashboardData & {
  /** Same as `nextTask` — explicit name for the single primary CTA (priority matches `buildComposedLearningTasks`). */
  primaryCta: HomeDashboardData["nextTask"];
  dueReviewCount: number;
  /** Completed `LearningSession` rows since local midnight */
  sessionsCompletedToday: number;
  /** Completed sessions in the last 7 days */
  sessionsCompletedWeek: number;
  /** Plain-language lines for 練習／驗收／閉環 */
  checkpointPracticeSummaryZh: string;
  /** Current study-plan day primary skill label, if any */
  activePlanSkillLabelZh: string | null;
  /** Short module label for “where you are” */
  activeModuleLabel: string | null;
};

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Home dashboard v2 — **aggregates** runtime counts on top of `getHomeDashboardData()` (same task order as `/learn`).
 * CTA priority: FSRS review → today StudyPlan day → Introduced→practice → Practiced→test → first New→learn.
 */
export async function getDashboardDataV2(): Promise<DashboardDataV2> {
  const base = await getHomeDashboardData();
  const user = await getOrCreateDevUser();

  let sessionsCompletedToday = 0;
  let sessionsCompletedWeek = 0;
  let checkpointPracticeSummaryZh = "登入後會顯示本週練習／驗收摘要。";
  let activePlanSkillLabelZh: string | null = null;
  let activeModuleLabel: string | null = null;

  if (user) {
    const now = new Date();
    const sod = startOfLocalDay(now);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [todayCt, weekCt, weekSessions, studyPlan] = await Promise.all([
      prisma.learningSession.count({
        where: { userId: user.id, status: "completed", endedAt: { gte: sod } },
      }),
      prisma.learningSession.count({
        where: { userId: user.id, status: "completed", endedAt: { gte: weekAgo } },
      }),
      prisma.learningSession.findMany({
        where: { userId: user.id, status: "completed", endedAt: { gte: weekAgo } },
        select: { mode: true },
      }),
      getActiveStudyPlanView(),
    ]);

    sessionsCompletedToday = todayCt;
    sessionsCompletedWeek = weekCt;

    const modeCount: Record<string, number> = {};
    for (const s of weekSessions) {
      modeCount[s.mode] = (modeCount[s.mode] ?? 0) + 1;
    }
    const pr = modeCount.practice ?? 0;
    const te = modeCount.test ?? 0;
    const lr = modeCount.learn ?? 0;
    const rv = modeCount.review ?? 0;
    const parts: string[] = [];
    if (te + pr + lr + rv === 0) {
      parts.push("本週尚未有完成的閉環場次（練習／驗收／新學／複習）。");
    } else {
      if (te > 0) parts.push(`驗收 ${te} 場`);
      if (pr > 0) parts.push(`練習 ${pr} 場`);
      if (lr > 0) parts.push(`新學 ${lr} 場`);
      if (rv > 0) parts.push(`複習 ${rv} 場`);
    }
    checkpointPracticeSummaryZh = parts.join(" · ");

    if (studyPlan) {
      const day = studyPlan.days.find((d) => d.dayNumber === studyPlan.currentDayNumber && !d.completed);
      activePlanSkillLabelZh = day?.primarySkillLabelZh ?? day?.primarySkillCode ?? null;
    }

    if (base.activeModuleKey) {
      activeModuleLabel = base.activeModuleKey;
    }
  }

  return {
    ...base,
    primaryCta: base.nextTask,
    dueReviewCount: base.reviewDueApprox,
    sessionsCompletedToday,
    sessionsCompletedWeek,
    checkpointPracticeSummaryZh,
    activePlanSkillLabelZh,
    activeModuleLabel,
  };
}
