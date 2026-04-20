/**
 * Single source of truth types for the learning path engine (ranked queue + per-topic CTAs).
 */

import type { TopicProgressStage } from "../../generated/prisma";

import type { Phase1TopicKey } from "@/content/programs/phase1/types";

export type LearningTaskType = "review" | "test" | "practice" | "learn";

/** Where the recommendation came from — use `analysis_followup` when weekly/analysis injects tasks later. */
export type LearningTaskSource = "fsrs" | "topic_stage" | "module_stage" | "analysis_followup";

/**
 * Canonical actionable unit for /learn, home next action, /progress CTAs, and future analysis hooks.
 * Lower `priority` = earlier in the global queue (when multiple tasks exist).
 */
export type LearningTask = {
  type: LearningTaskType;
  /** Lower = higher priority in the global ranked list (1 = first). */
  priority: number;
  estimatedMins: number;
  /** Phase 1 topic key when task is topic-scoped */
  topicKey?: string;
  titleZh: string;
  titleEn: string;
  moduleKey?: string;
  moduleTitleZh?: string;
  moduleTitleEn?: string;
  skillKey?: string;
  reasonZh: string;
  reasonEn: string;
  href: string;
  source: LearningTaskSource;
  /** Short label for buttons (e.g. 驗收) */
  ctaLabelZh: string;
  ctaLabelEn: string;
};

export type FsrsQueueSnapshot = {
  dueCount: number;
  learningDueCount: number;
};

export type RankLearningTasksInput = {
  topicOrder: readonly Phase1TopicKey[];
  progressByTopic: Readonly<Partial<Record<Phase1TopicKey, TopicProgressStage>>>;
  fsrs: FsrsQueueSnapshot;
  labels?: Readonly<Partial<Record<Phase1TopicKey, { zh: string; en: string }>>>;
  linkBase?: {
    review: string;
    test: string;
    practice: string;
    learn: string;
  };
};
