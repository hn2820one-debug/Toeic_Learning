import "server-only";

import type { TopicProgressStage } from "../../generated/prisma";

import { PHASE1_TOPIC_LABELS } from "@/content/programs/phase1/skill-map";
import { PHASE1_MODULES } from "@/content/programs/phase1/modules";
import { PHASE1_TOPIC_KEYS_IN_ORDER } from "@/content/programs/phase1/topic-order";
import type { Phase1ModuleKey, Phase1TopicKey } from "@/content/programs/phase1/types";
import { getOrCreateDevUser } from "@/lib/dev-user";
import { getQueueStats } from "@/lib/fsrs";
import { primaryModuleForTopic } from "@/lib/learning-path";
import { prisma } from "@/lib/prisma";
import { readinessHintForTopic } from "@/lib/stage-progress-actions";

export type TopicProgressRowView = {
  topicKey: Phase1TopicKey;
  labelZh: string;
  labelEn: string;
  stage: TopicProgressStage;
  practiceAccuracy: number | null;
  testAccuracy: number | null;
  lastActivityAt: Date | null;
  readinessHint: string | null;
};

export type ModuleProgressSection = {
  moduleKey: Phase1ModuleKey;
  titleZh: string;
  titleEn: string;
  topics: TopicProgressRowView[];
};

export type ProgressOverview = {
  totalTopics: number;
  masteredCount: number;
  testedPipelineCount: number;
  introducedCount: number;
  practicedCount: number;
  newCount: number;
  reviewDueApprox: number;
};

export type ProgressPageModel =
  | { kind: "no_user"; overview: ProgressOverview; sections: ModuleProgressSection[] }
  | {
      kind: "ready";
      overview: ProgressOverview;
      sections: ModuleProgressSection[];
      moduleProgressRows: { moduleKey: string; status: string }[];
    };

function splitTopicLabel(raw: string): { zh: string; en: string } {
  const parts = raw.split(" / ").map((s) => s.trim());
  return { zh: parts[0] ?? raw, en: parts[1] ?? parts[0] ?? raw };
}

function lastActivityAtFromRow(row: {
  learnCompletedAt: Date | null;
  practicePassedAt: Date | null;
  testPassedAt: Date | null;
  updatedAt: Date;
}): Date | null {
  const dates: number[] = [];
  if (row.learnCompletedAt) {
    dates.push(row.learnCompletedAt.getTime());
  }
  if (row.practicePassedAt) {
    dates.push(row.practicePassedAt.getTime());
  }
  if (row.testPassedAt) {
    dates.push(row.testPassedAt.getTime());
  }
  dates.push(row.updatedAt.getTime());
  return new Date(Math.max(...dates));
}

function toRowView(
  topicKey: Phase1TopicKey,
  stage: TopicProgressStage,
  practiceAccuracy: number | null,
  testAccuracy: number | null,
  lastActivityAt: Date | null,
  labelOverride?: { zh: string; en: string },
): TopicProgressRowView {
  const base = splitTopicLabel(PHASE1_TOPIC_LABELS[topicKey]);
  return {
    topicKey,
    labelZh: labelOverride?.zh ?? base.zh,
    labelEn: labelOverride?.en ?? base.en,
    stage,
    practiceAccuracy,
    testAccuracy,
    lastActivityAt,
    readinessHint: readinessHintForTopic({ stage, practiceAccuracy, testAccuracy }),
  };
}

function computeOverview(rows: readonly TopicProgressRowView[], totalTopics: number, reviewDueApprox: number): ProgressOverview {
  return {
    totalTopics,
    masteredCount: rows.filter((r) => r.stage === "Mastered" || r.stage === "Maintained").length,
    testedPipelineCount: rows.filter((r) => ["Tested", "Mastered", "Maintained"].includes(r.stage)).length,
    introducedCount: rows.filter((r) => r.stage === "Introduced").length,
    practicedCount: rows.filter((r) => r.stage === "Practiced").length,
    newCount: rows.filter((r) => r.stage === "New").length,
    reviewDueApprox,
  };
}

/**
 * Groups Phase 1 topics by **primary module** (`primaryModuleForTopic`) — consistent with `src/lib/learning-path.ts`.
 */
export async function buildProgressPageModel(): Promise<ProgressPageModel> {
  const totalTopics = PHASE1_TOPIC_KEYS_IN_ORDER.length;

  const queueStats = await getQueueStats();
  const reviewDueApprox = queueStats.dueCount + queueStats.learningCount;

  const dbTopics = await prisma.learningTopic.findMany({
    orderBy: { orderIndex: "asc" },
    select: { topicKey: true, labelZh: true, labelEn: true },
  });
  const labelByTopic = new Map<Phase1TopicKey, { zh: string; en: string }>();
  for (const t of dbTopics) {
    const tk = t.topicKey as Phase1TopicKey;
    if (t.labelZh?.trim() && t.labelEn?.trim()) {
      labelByTopic.set(tk, { zh: t.labelZh.trim(), en: t.labelEn.trim() });
    }
  }

  const user = await getOrCreateDevUser();

  const buildPlaceholderRows = (): TopicProgressRowView[] =>
    PHASE1_TOPIC_KEYS_IN_ORDER.map((topicKey) =>
      toRowView(topicKey, "New", null, null, null, labelByTopic.get(topicKey)),
    );

  if (!user) {
    const mergedRows = buildPlaceholderRows();
    const overview = computeOverview(mergedRows, totalTopics, reviewDueApprox);
    const sections: ModuleProgressSection[] = PHASE1_MODULES.map((mod) => ({
      moduleKey: mod.moduleKey,
      titleZh: mod.titleZh,
      titleEn: mod.titleEn,
      topics: mergedRows.filter((row) => primaryModuleForTopic(row.topicKey).moduleKey === mod.moduleKey),
    }));
    return { kind: "no_user", overview, sections };
  }

  const progressRows = await prisma.userTopicProgress.findMany({
    where: { userId: user.id },
  });
  const byTopic = new Map<Phase1TopicKey, (typeof progressRows)[0]>();
  for (const r of progressRows) {
    byTopic.set(r.topicKey as Phase1TopicKey, r);
  }

  const mergedRows: TopicProgressRowView[] = PHASE1_TOPIC_KEYS_IN_ORDER.map((topicKey) => {
    const row = byTopic.get(topicKey);
    const lo = labelByTopic.get(topicKey);
    if (!row) {
      return toRowView(topicKey, "New", null, null, null, lo);
    }
    const stage = row.stage as TopicProgressStage;
    const last = lastActivityAtFromRow({
      learnCompletedAt: row.learnCompletedAt,
      practicePassedAt: row.practicePassedAt,
      testPassedAt: row.testPassedAt,
      updatedAt: row.updatedAt,
    });
    return toRowView(topicKey, stage, row.practiceAccuracy, row.testAccuracy, last, lo);
  });

  const overview = computeOverview(mergedRows, totalTopics, reviewDueApprox);

  const sections: ModuleProgressSection[] = PHASE1_MODULES.map((mod) => ({
    moduleKey: mod.moduleKey,
    titleZh: mod.titleZh,
    titleEn: mod.titleEn,
    topics: mergedRows.filter((row) => primaryModuleForTopic(row.topicKey).moduleKey === mod.moduleKey),
  }));

  const moduleProgressRows = await prisma.moduleProgress.findMany({
    where: { userId: user.id },
    select: { moduleKey: true, status: true },
    orderBy: { moduleKey: "asc" },
  });

  return {
    kind: "ready",
    overview,
    sections,
    moduleProgressRows: moduleProgressRows.map((m) => ({ moduleKey: m.moduleKey, status: m.status })),
  };
}
