import "server-only";

import type { TopicProgressStage } from "../../generated/prisma";

import { PHASE1_TOPIC_KEYS_IN_ORDER } from "@/content/programs/phase1/topic-order";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import { getOrCreateDevUser } from "@/lib/dev-user";
import { getQueueStats } from "@/lib/fsrs";
import {
  getRankedLearningTasks,
  mergeTopicOrderWithDb,
  sumEstimatedMinutes,
  type LearningTask,
} from "@/lib/learning-path";
import { prisma } from "@/lib/prisma";

export type LearnDashboardPayload = {
  tasks: LearningTask[];
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

  const [dbTopics, queueStats, progressRows] = await Promise.all([
    prisma.learningTopic.findMany({ orderBy: { orderIndex: "asc" } }),
    getQueueStats(),
    userId
      ? prisma.userTopicProgress.findMany({ where: { userId } })
      : Promise.resolve([]),
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

  const tasks = getRankedLearningTasks({
    topicOrder,
    progressByTopic,
    fsrs: { dueCount: queueStats.dueCount, learningDueCount: queueStats.learningCount },
    labels: Object.keys(labels).length > 0 ? labels : undefined,
  });

  return {
    tasks,
    totalEstimatedMinutes: sumEstimatedMinutes(tasks),
    topicOrder,
    hasUser: userId != null,
    focusTopicKey,
  };
}
