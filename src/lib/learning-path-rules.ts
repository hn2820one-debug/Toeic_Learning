/**
 * Pure rules for the learning path engine: global ranked queue + per-topic CTAs.
 * No I/O — safe for unit tests.
 */
import type { TopicProgressStage } from "../../generated/prisma";

import { PHASE1_MODULES } from "@/content/programs/phase1/modules";
import { PHASE1_TOPIC_LABELS } from "@/content/programs/phase1/skill-map";
import { PHASE1_SKILLS } from "@/content/programs/phase1/skill-map";
import { PHASE1_TOPIC_KEYS_IN_ORDER } from "@/content/programs/phase1/topic-order";
import type { Phase1ModuleDefinition } from "@/content/programs/phase1/types";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";

import type { LearningTask, LearningTaskType, RankLearningTasksInput } from "./learning-path.types";

const SKILL_BY_KEY = new Map(PHASE1_SKILLS.map((s) => [s.skillKey, s]));

const DEFAULT_LINK_BASE = {
  review: "/review",
  test: "/test",
  practice: "/practice",
  learn: "/learn",
} as const;

const PRI = {
  fsrs: 10,
  test: 20,
  practice: 40,
  learn: 60,
} as const;

function topicKeysForModule(mod: Phase1ModuleDefinition): Set<Phase1TopicKey> {
  const set = new Set<Phase1TopicKey>();
  for (const sk of mod.targetSkills) {
    SKILL_BY_KEY.get(sk)?.matcher.topicKeys.forEach((t) => set.add(t));
  }
  return set;
}

/**
 * First module in program order whose skill coverage includes the topic.
 */
export function primaryModuleForTopic(topicKey: Phase1TopicKey): Phase1ModuleDefinition {
  for (const mod of PHASE1_MODULES) {
    if (topicKeysForModule(mod).has(topicKey)) {
      return mod;
    }
  }
  return PHASE1_MODULES[0];
}

function stageForTopic(
  topicKey: Phase1TopicKey,
  progressByTopic: RankLearningTasksInput["progressByTopic"],
): TopicProgressStage {
  return progressByTopic[topicKey] ?? "New";
}

function topicIndexInOrder(topicOrder: readonly Phase1TopicKey[], topicKey: Phase1TopicKey): number {
  const i = topicOrder.indexOf(topicKey);
  return i === -1 ? 9999 : i;
}

function labelForTopic(
  topicKey: Phase1TopicKey,
  labels: RankLearningTasksInput["labels"],
): { zh: string; en: string } {
  const o = labels?.[topicKey];
  if (o?.zh && o?.en) {
    return { zh: o.zh, en: o.en };
  }
  const raw = PHASE1_TOPIC_LABELS[topicKey];
  const parts = raw.split(" / ").map((s) => s.trim());
  return {
    zh: parts[0] ?? raw,
    en: parts[1] ?? parts[0] ?? raw,
  };
}

function estimateReviewMinutes(fs: RankLearningTasksInput["fsrs"]): number {
  const n = fs.dueCount + fs.learningDueCount;
  if (n <= 0) {
    return 0;
  }
  return Math.min(45, Math.max(5, Math.round(n * 1.8)));
}

function task(
  partial: Omit<LearningTask, "priority"> & { priority?: number },
  priority: number,
): LearningTask {
  return { ...partial, priority };
}

/**
 * Global ranked queue: FSRS review → TEST (each Practiced topic, in order) → PRACTICE (Introduced) → LEARN (first New).
 * Same ordering rules as the legacy `rankLearningTasks` / `DailyTask` implementation — now returns `LearningTask`.
 */
export function getRankedLearningTasks(input: RankLearningTasksInput): LearningTask[] {
  const base = { ...DEFAULT_LINK_BASE, ...input.linkBase };
  const topicOrder = input.topicOrder.length > 0 ? input.topicOrder : [...PHASE1_TOPIC_KEYS_IN_ORDER];

  const out: LearningTask[] = [];

  const reviewMinutes = estimateReviewMinutes(input.fsrs);
  if (reviewMinutes > 0) {
    out.push(
      task(
        {
          type: "review",
          titleZh: "FSRS 複習佇列",
          titleEn: "FSRS review queue",
          moduleTitleZh: "全系統 · 題卡",
          moduleTitleEn: "Global · Cards",
          reasonZh: "有到期或學習中題卡，應先清掉以免堆積。",
          reasonEn: "You have due or short-interval learning cards — clear these first.",
          estimatedMins: reviewMinutes,
          href: base.review,
          source: "fsrs",
          ctaLabelZh: "前往複習",
          ctaLabelEn: "Go to review",
        },
        PRI.fsrs,
      ),
    );
  }

  for (const topicKey of topicOrder) {
    const stage = stageForTopic(topicKey, input.progressByTopic);
    if (stage !== "Practiced") {
      continue;
    }
    const mod = primaryModuleForTopic(topicKey);
    const idx = topicIndexInOrder(topicOrder, topicKey);
    const titles = labelForTopic(topicKey, input.labels);
    const q = encodeURIComponent(topicKey);
    out.push(
      task(
        {
          type: "test",
          topicKey,
          titleZh: titles.zh,
          titleEn: titles.en,
          moduleKey: mod.moduleKey,
          moduleTitleZh: mod.titleZh,
          moduleTitleEn: mod.titleEn,
          reasonZh: "此主題已完成練習階段，適合進行驗收測驗。",
          reasonEn: "Practice is done for this topic — time for a checkpoint-style test.",
          estimatedMins: 18,
          href: `${base.test}?topicKey=${q}`,
          source: "topic_stage",
          ctaLabelZh: "驗收",
          ctaLabelEn: "Checkpoint test",
        },
        PRI.test + idx,
      ),
    );
  }

  for (const topicKey of topicOrder) {
    const stage = stageForTopic(topicKey, input.progressByTopic);
    if (stage !== "Introduced") {
      continue;
    }
    const mod = primaryModuleForTopic(topicKey);
    const idx = topicIndexInOrder(topicOrder, topicKey);
    const titles = labelForTopic(topicKey, input.labels);
    const q = encodeURIComponent(topicKey);
    out.push(
      task(
        {
          type: "practice",
          topicKey,
          titleZh: titles.zh,
          titleEn: titles.en,
          moduleKey: mod.moduleKey,
          moduleTitleZh: mod.titleZh,
          moduleTitleEn: mod.titleEn,
          reasonZh: "已介紹內容但尚未鞏固，建議先做練習題組。",
          reasonEn: "Introduced but not consolidated — drill before testing.",
          estimatedMins: 15,
          href: `${base.practice}?topicKey=${q}`,
          source: "topic_stage",
          ctaLabelZh: "練習",
          ctaLabelEn: "Practice",
        },
        PRI.practice + idx,
      ),
    );
  }

  const learnTarget = topicOrder.find((t) => stageForTopic(t, input.progressByTopic) === "New");
  if (learnTarget) {
    const mod = primaryModuleForTopic(learnTarget);
    const idx = topicIndexInOrder(topicOrder, learnTarget);
    const titles = labelForTopic(learnTarget, input.labels);
    out.push(
      task(
        {
          type: "learn",
          topicKey: learnTarget,
          titleZh: titles.zh,
          titleEn: titles.en,
          moduleKey: mod.moduleKey,
          moduleTitleZh: mod.titleZh,
          moduleTitleEn: mod.titleEn,
          reasonZh: "這是路線中下一個尚未開始的主題，從這裡建立新進度。",
          reasonEn: "Next topic in your path that is still new — start here.",
          estimatedMins: 12,
          href: `${base.learn}/${encodeURIComponent(learnTarget)}`,
          source: "topic_stage",
          ctaLabelZh: "開始學習",
          ctaLabelEn: "Start learning",
        },
        PRI.learn + idx,
      ),
    );
  }

  out.sort((a, b) => a.priority - b.priority);
  return out;
}

export function sumEstimatedMinutes(tasks: readonly LearningTask[]): number {
  return tasks.reduce((acc, t) => acc + t.estimatedMins, 0);
}

/**
 * Merge file-based topic order with DB `LearningTopic` rows (orderIndex).
 */
export function mergeTopicOrderWithDb(params: {
  contentOrder: readonly Phase1TopicKey[];
  dbTopics: ReadonlyArray<{ topicKey: string; orderIndex: number }>;
}): Phase1TopicKey[] {
  const { contentOrder, dbTopics } = params;
  const isTopic = (k: string): k is Phase1TopicKey => (contentOrder as readonly string[]).includes(k);

  if (dbTopics.length === 0) {
    return [...contentOrder];
  }

  const sorted = [...dbTopics].sort((a, b) => a.orderIndex - b.orderIndex || a.topicKey.localeCompare(b.topicKey));
  const fromDb: Phase1TopicKey[] = [];
  for (const row of sorted) {
    if (isTopic(row.topicKey)) {
      fromDb.push(row.topicKey);
    }
  }

  const seen = new Set<string>(fromDb);
  const out: Phase1TopicKey[] = [...fromDb];
  for (const k of contentOrder) {
    if (!seen.has(k)) {
      out.push(k);
    }
  }
  return out;
}

export type TopicProgressLabels = { zh: string; en: string };

/**
 * Per-topic primary/secondary actions — **must** stay aligned with `getRankedLearningTasks` stage→href mapping
 * (same as former `getActionForStage`).
 */
export function getTopicProgressActions(
  topicKey: Phase1TopicKey,
  stage: TopicProgressStage,
  labels?: TopicProgressLabels,
): { primary: LearningTask; secondary?: LearningTask } {
  const titles = labels ?? labelForTopic(topicKey, {});
  const mod = primaryModuleForTopic(topicKey);
  const q = encodeURIComponent(topicKey);
  const base = DEFAULT_LINK_BASE;

  const secondaryLearn: LearningTask = {
    type: "learn",
    priority: 9000,
    estimatedMins: 12,
    topicKey,
    titleZh: titles.zh,
    titleEn: titles.en,
    moduleKey: mod.moduleKey,
    moduleTitleZh: mod.titleZh,
    moduleTitleEn: mod.titleEn,
    reasonZh: "回到此主題的教材與內容。",
    reasonEn: "Open lesson content for this topic.",
    href: `${base.learn}/${encodeURIComponent(topicKey)}`,
    source: "topic_stage",
    ctaLabelZh: "教材",
    ctaLabelEn: "Lessons",
  };

  switch (stage) {
    case "New":
      return {
        primary: {
          type: "learn",
          priority: 1,
          estimatedMins: 12,
          topicKey,
          titleZh: titles.zh,
          titleEn: titles.en,
          moduleKey: mod.moduleKey,
          moduleTitleZh: mod.titleZh,
          moduleTitleEn: mod.titleEn,
          reasonZh: "此主題尚未開始，從教材建立進度。",
          reasonEn: "Topic not started — begin with the learn capsule.",
          href: `${base.learn}/${encodeURIComponent(topicKey)}`,
          source: "topic_stage",
          ctaLabelZh: "開始學習",
          ctaLabelEn: "Start learning",
        },
      };
    case "Introduced":
      return {
        primary: {
          type: "practice",
          priority: 1,
          estimatedMins: 15,
          topicKey,
          titleZh: titles.zh,
          titleEn: titles.en,
          moduleKey: mod.moduleKey,
          moduleTitleZh: mod.titleZh,
          moduleTitleEn: mod.titleEn,
          reasonZh: "已介紹內容，建議先練習再驗收。",
          reasonEn: "Introduced — practice before checkpoint.",
          href: `${base.practice}?topicKey=${q}`,
          source: "topic_stage",
          ctaLabelZh: "練習",
          ctaLabelEn: "Practice",
        },
        secondary: secondaryLearn,
      };
    case "Practiced":
      return {
        primary: {
          type: "test",
          priority: 1,
          estimatedMins: 18,
          topicKey,
          titleZh: titles.zh,
          titleEn: titles.en,
          moduleKey: mod.moduleKey,
          moduleTitleZh: mod.titleZh,
          moduleTitleEn: mod.titleEn,
          reasonZh: "練習完成，可安排驗收測驗。",
          reasonEn: "Practice done — take the checkpoint test.",
          href: `${base.test}?topicKey=${q}`,
          source: "topic_stage",
          ctaLabelZh: "驗收",
          ctaLabelEn: "Checkpoint test",
        },
        secondary: {
          type: "practice",
          priority: 2,
          estimatedMins: 15,
          topicKey,
          titleZh: titles.zh,
          titleEn: titles.en,
          moduleKey: mod.moduleKey,
          moduleTitleZh: mod.titleZh,
          moduleTitleEn: mod.titleEn,
          reasonZh: "需要時可再加一輪練習。",
          reasonEn: "Optional extra practice round.",
          href: `${base.practice}?topicKey=${q}`,
          source: "topic_stage",
          ctaLabelZh: "再練習",
          ctaLabelEn: "Practice again",
        },
      };
    case "Tested":
    case "Mastered":
    case "Maintained":
      return {
        primary: {
          type: "learn",
          priority: 1,
          estimatedMins: 10,
          topicKey,
          titleZh: titles.zh,
          titleEn: titles.en,
          moduleKey: mod.moduleKey,
          moduleTitleZh: mod.titleZh,
          moduleTitleEn: mod.titleEn,
          reasonZh: "複習此主題的教材重點。",
          reasonEn: "Revisit lesson content for this topic.",
          href: `${base.learn}/${encodeURIComponent(topicKey)}`,
          source: "topic_stage",
          ctaLabelZh: "回顧內容",
          ctaLabelEn: "Review content",
        },
        secondary: {
          type: "review",
          priority: 2,
          estimatedMins: 20,
          titleZh: "FSRS 複習",
          titleEn: "FSRS review",
          reasonZh: "跨題卡的間隔複習佇列。",
          reasonEn: "Spaced repetition card queue.",
          href: base.review,
          source: "fsrs",
          ctaLabelZh: "FSRS 複習",
          ctaLabelEn: "FSRS review",
        },
      };
    default:
      return {
        primary: {
          type: "learn",
          priority: 1,
          estimatedMins: 12,
          topicKey,
          titleZh: titles.zh,
          titleEn: titles.en,
          moduleKey: mod.moduleKey,
          moduleTitleZh: mod.titleZh,
          moduleTitleEn: mod.titleEn,
          reasonZh: "前往此主題頁。",
          reasonEn: "Open this topic.",
          href: `${base.learn}/${encodeURIComponent(topicKey)}`,
          source: "topic_stage",
          ctaLabelZh: "前往主題",
          ctaLabelEn: "Open topic",
        },
      };
  }
}

/** Map engine task type to legacy uppercase badge keys used in UI. */
export function learningTaskBadgeKey(t: LearningTask): "REVIEW" | "TEST" | "PRACTICE" | "LEARN" {
  const m: Record<LearningTaskType, "REVIEW" | "TEST" | "PRACTICE" | "LEARN"> = {
    review: "REVIEW",
    test: "TEST",
    practice: "PRACTICE",
    learn: "LEARN",
  };
  return m[t.type];
}
