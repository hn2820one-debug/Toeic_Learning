import "server-only";

import type { TopicProgressStage } from "../../generated/prisma";

import { PHASE1_TOPIC_KEYS_IN_ORDER } from "@/content/programs/phase1/topic-order";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import { getOrCreateDevUser } from "@/lib/dev-user";
import { getQueueStats } from "@/lib/fsrs";
import type { ComposedLearningTask } from "@/lib/learning-path.types";
import { mergeTopicOrderWithDb } from "@/lib/learning-path";
import { enrichComposedTasksWithSkills } from "@/lib/learning-content-classification";
import { prisma } from "@/lib/prisma";
import { getActiveStudyPlanView } from "@/lib/study-plan/loader";
import { buildComposedLearningTasks } from "@/lib/today-task-composer";

export type LearnDashboardPayload = {
  tasks: ComposedLearningTask[];
  totalEstimatedMinutes: number;
  topicOrder: Phase1TopicKey[];
  hasUser: boolean;
  focusTopicKey: Phase1TopicKey | null;
};

function parseTopicKey(raw: string | undefined): Phase1TopicKey | null {
  if (!raw) {
    return null;
  }
  return (PHASE1_TOPIC_KEYS_IN_ORDER as readonly string[]).includes(raw) ? (raw as Phase1TopicKey) : null;
}

export async function getLearnDashboardData(searchParams?: {
  topicKey?: string;
  action?: string;
}): Promise<LearnDashboardPayload> {
  const focusTopicKey = parseTopicKey(searchParams?.topicKey);

  const user = await getOrCreateDevUser();
  const userId = user?.id;

  const [dbTopics, queueStats, progressRows, studyPlan, nextRoiSkill] = await Promise.all([
    prisma.learningTopic.findMany({ orderBy: { orderIndex: "asc" } }),
    getQueueStats(),
    userId
      ? prisma.userTopicProgress.findMany({ where: { userId } })
      : Promise.resolve([]),
    getActiveStudyPlanView(),
    userId
      ? prisma.learningSkill.findFirst({
          where: { priority: "P1", within30DayPlan: true },
          orderBy: [{ recommendedWeek: "asc" }, { orderIndex: "asc" }],
          select: { skillCode: true },
        })
      : Promise.resolve(null),
  ]);

  const progressByTopic = Object.fromEntries(
    progressRows.map((r) => [r.topicKey as Phase1TopicKey, r.stage as TopicProgressStage]),
  ) as Partial<Record<Phase1TopicKey, TopicProgressStage>>;

  const labels: Partial<Record<Phase1TopicKey, { zh: string; en: string }>> = {};
  for (const row of dbTopics) {
    const tk = row.topicKey as Phase1TopicKey;
    if (row.labelZh?.trim() && row.labelEn?.trim()) {
      labels[tk] = { zh: row.labelZh.trim(), en: row.labelEn.trim() };
    }
  }

  const topicOrder = mergeTopicOrderWithDb({
    contentOrder: PHASE1_TOPIC_KEYS_IN_ORDER,
    dbTopics: dbTopics.map((t) => ({ topicKey: t.topicKey, orderIndex: t.orderIndex })),
  });

  const rawTasks = buildComposedLearningTasks({
    topicOrder,
    progressByTopic,
    fsrs: { dueCount: queueStats.dueCount, learningDueCount: queueStats.learningCount },
    studyPlan,
    labels: Object.keys(labels).length > 0 ? labels : undefined,
    nextRoiSkillCode: nextRoiSkill?.skillCode ?? null,
  });

  const skillCodes = Array.from(
    new Set(rawTasks.map((t) => t.primaryLearningSkillCode).filter((c): c is string => Boolean(c?.trim()))),
  );
  const skillRows =
    skillCodes.length > 0 && userId
      ? await prisma.learningSkill.findMany({
          where: { skillCode: { in: skillCodes } },
          select: { skillCode: true, labelZh: true, category: true },
        })
      : [];
  const skillByCode = new Map(skillRows.map((r) => [r.skillCode, r] as const));
  const tasks = enrichComposedTasksWithSkills(rawTasks, skillByCode);

  const totalEstimatedMinutes = tasks.reduce((acc, t) => acc + t.estimatedMins, 0);

  return {
    tasks,
    totalEstimatedMinutes,
    topicOrder,
    hasUser: userId != null,
    focusTopicKey,
  };
}
