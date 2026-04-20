import "server-only";

import type { TopicProgressStage } from "../../generated/prisma";

import { PHASE1_TOPIC_KEYS_IN_ORDER } from "@/content/programs/phase1/topic-order";
import { getLearnDashboardData } from "@/lib/learn-dashboard";
import type { LearningTask } from "@/lib/learning-path";
import { getOrCreateDevUser } from "@/lib/dev-user";
import { getQueueStats } from "@/lib/fsrs";
import { prisma } from "@/lib/prisma";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type LoopStageCounts = {
  introduced: number;
  practiced: number;
  tested: number;
  /** Mastered + Maintained — optional visibility */
  advanced: number;
  /** Still at New — not yet started learn path */
  newTopics: number;
};

export type HomeRecentLoopSession = {
  id: string;
  mode: string;
  topicKey: string | null;
  endedAt: Date;
};

export type HomeMomentum =
  | { kind: "insufficient"; reasonZh: string; reasonEn: string }
  | { kind: "hint"; labelZh: string; labelEn: string; detailZh?: string; detailEn?: string };

export type HomeDashboardData = {
  /** Same task list & order as `/learn` — single source: `getLearnDashboardData` → `getRankedLearningTasks` */
  tasks: LearningTask[];
  nextTask: LearningTask | null;
  totalEstimatedMinutes: number;
  hasUser: boolean;
  focusTopicKey: import("@/content/programs/phase1/types").Phase1TopicKey | null;
  loopStages: LoopStageCounts;
  /** Topics that finished the LEARN capsule (`learnCompletedAt` set) */
  topicsLearnCompletedCount: number;
  /** FSRS: due (Review+Relearning) + Learning due now — matches review route spirit */
  reviewDueApprox: number;
  fsrsNewCardCount: number;
  activeModuleKey: string | null;
  recentLoopSessions: HomeRecentLoopSession[];
  momentum: HomeMomentum;
};

function stageCountsFromRows(rows: ReadonlyArray<{ stage: TopicProgressStage }>): LoopStageCounts {
  const c: LoopStageCounts = {
    introduced: 0,
    practiced: 0,
    tested: 0,
    advanced: 0,
    newTopics: 0,
  };
  for (const r of rows) {
    switch (r.stage) {
      case "Introduced":
        c.introduced += 1;
        break;
      case "Practiced":
        c.practiced += 1;
        break;
      case "Tested":
        c.tested += 1;
        break;
      case "Mastered":
      case "Maintained":
        c.advanced += 1;
        break;
      case "New":
        c.newTopics += 1;
        break;
      default:
        break;
    }
  }
  return c;
}

/**
 * Home dashboard: **reuses** `getLearnDashboardData()` so `/` and `/learn` share identical ranking (`getRankedLearningTasks`).
 * Adds closed-loop aggregates only (UserTopicProgress, LearningSession, FSRS stats).
 */
export async function getHomeDashboardData(): Promise<HomeDashboardData> {
  const learn = await getLearnDashboardData(undefined);
  const nextTask = learn.tasks[0] ?? null;

  const user = await getOrCreateDevUser();
  const userId = user?.id ?? null;

  if (!userId) {
    const queueStats = await getQueueStats();
    return {
      tasks: learn.tasks,
      nextTask,
      totalEstimatedMinutes: learn.totalEstimatedMinutes,
      hasUser: false,
      focusTopicKey: learn.focusTopicKey,
      loopStages: {
        introduced: 0,
        practiced: 0,
        tested: 0,
        advanced: 0,
        newTopics: PHASE1_TOPIC_KEYS_IN_ORDER.length,
      },
      topicsLearnCompletedCount: 0,
      reviewDueApprox: queueStats.dueCount + queueStats.learningCount,
      fsrsNewCardCount: queueStats.newCount,
      activeModuleKey: null,
      recentLoopSessions: [],
      momentum: {
        kind: "insufficient",
        reasonZh: "建立學習者帳號後才能計算個人進度與估分。",
        reasonEn: "Sign in / bootstrap a learner to compute personal progress.",
      },
    };
  }

  const weekAgo = new Date(Date.now() - WEEK_MS);

  const [queueStats, progressRows, learnCompletedCount, programRow, recentSessions, testAccRows, practiceAccRows] =
    await Promise.all([
      getQueueStats(),
      prisma.userTopicProgress.findMany({
        where: { userId },
        select: { stage: true },
      }),
      prisma.userTopicProgress.count({
        where: { userId, learnCompletedAt: { not: null } },
      }),
      prisma.programProgress.findUnique({
        where: { userId_programKey: { userId, programKey: "phase1" } },
        select: { activeModuleKey: true },
      }),
      prisma.learningSession.findMany({
        where: {
          userId,
          status: "completed",
          endedAt: { gte: weekAgo },
        },
        orderBy: { endedAt: "desc" },
        take: 8,
        select: {
          id: true,
          mode: true,
          topicKey: true,
          endedAt: true,
        },
      }),
      prisma.userTopicProgress.findMany({
        where: { userId, testAccuracy: { not: null } },
        select: { testAccuracy: true },
        take: 20,
      }),
      prisma.userTopicProgress.findMany({
        where: { userId, practiceAccuracy: { not: null } },
        select: { practiceAccuracy: true },
        take: 20,
      }),
    ]);

  const loopStages = stageCountsFromRows(progressRows);

  let momentum: HomeMomentum = {
    kind: "insufficient",
    reasonZh: "尚未累積足夠的驗收／練習分數紀錄。完成幾場練習或驗收後會顯示參考。",
    reasonEn: "Not enough checkpoint / practice scores yet — complete a few runs.",
  };

  if (testAccRows.length >= 1) {
    const avg = testAccRows.reduce((s, r) => s + (r.testAccuracy ?? 0), 0) / testAccRows.length;
    momentum = {
      kind: "hint",
      labelZh: "近期驗收準確度（有紀錄的主題平均）",
      labelEn: "Recent checkpoint accuracy (topics with scores)",
      detailZh: `${(avg * 100).toFixed(0)}%（僅供參考，非正式分數）`,
      detailEn: `${(avg * 100).toFixed(0)}% (informal)`,
    };
  } else if (practiceAccRows.length >= 2) {
    const avg = practiceAccRows.reduce((s, r) => s + (r.practiceAccuracy ?? 0), 0) / practiceAccRows.length;
    momentum = {
      kind: "hint",
      labelZh: "近期練習有效準確度（平均）",
      labelEn: "Recent practice effective accuracy (avg.)",
      detailZh: `${(avg * 100).toFixed(0)}%（啟發式，非正式估分）`,
      detailEn: `${(avg * 100).toFixed(0)}% (heuristic)`,
    };
  }

  return {
    tasks: learn.tasks,
    nextTask,
    totalEstimatedMinutes: learn.totalEstimatedMinutes,
    hasUser: true,
    focusTopicKey: learn.focusTopicKey,
    loopStages,
    topicsLearnCompletedCount: learnCompletedCount,
    reviewDueApprox: queueStats.dueCount + queueStats.learningCount,
    fsrsNewCardCount: queueStats.newCount,
    activeModuleKey: programRow?.activeModuleKey ?? null,
    recentLoopSessions: recentSessions.map((s) => ({
      id: s.id,
      mode: s.mode,
      topicKey: s.topicKey,
      endedAt: s.endedAt!,
    })),
    momentum,
  };
}
