/**
 * Today’s ranked task list for `/learn` — priority order:
 * 1) FSRS due review
 * 2) Active StudyPlan current day
 * 3) Topic stage Introduced → practice
 * 4) Topic stage Practiced → checkpoint (test)
 * 5) First “New” topic in path + optional next P1 LearningSkill (ROI)
 */
import type { TopicProgressStage } from "../../generated/prisma";

import { PHASE1_TOPIC_LABELS } from "@/content/programs/phase1/skill-map";
import { PHASE1_TOPIC_KEYS_IN_ORDER } from "@/content/programs/phase1/topic-order";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";

import type { ComposedLearningTask, FsrsQueueSnapshot } from "@/lib/learning-path.types";
import { primaryModuleForTopic } from "@/lib/learning-path-rules";
import type { StudyPlanView } from "@/lib/study-plan/loader";

const LINK = {
  review: "/review",
  studyplan: "/studyplan",
  test: "/test",
  practice: "/practice",
  learn: "/learn",
} as const;

export type BuildComposedTasksInput = {
  topicOrder: readonly Phase1TopicKey[];
  progressByTopic: Readonly<Partial<Record<Phase1TopicKey, TopicProgressStage>>>;
  fsrs: FsrsQueueSnapshot;
  studyPlan: StudyPlanView | null;
  labels?: Readonly<Partial<Record<Phase1TopicKey, { zh: string; en: string }>>>;
  /** Best-effort next fine-grained skill for the “new topic” CTA (P1 / plan ROI). */
  nextRoiSkillCode?: string | null;
};

function stageForTopic(
  topicKey: Phase1TopicKey,
  progressByTopic: BuildComposedTasksInput["progressByTopic"],
): TopicProgressStage {
  return progressByTopic[topicKey] ?? "New";
}

function topicIndexInOrder(topicOrder: readonly Phase1TopicKey[], topicKey: Phase1TopicKey): number {
  const i = topicOrder.indexOf(topicKey);
  return i === -1 ? 9999 : i;
}

function labelForTopic(
  topicKey: Phase1TopicKey,
  labels: BuildComposedTasksInput["labels"],
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

function estimateReviewMinutes(fs: FsrsQueueSnapshot): number {
  const n = fs.dueCount + fs.learningDueCount;
  if (n <= 0) {
    return 0;
  }
  return Math.min(45, Math.max(5, Math.round(n * 1.8)));
}

/** Used by dashboard / studyplan runtime labels — same rules as composed task routing. */
export function getDailyPlanTaskKind(
  planDay: StudyPlanView["days"][number],
): "learn" | "practice" | "checkpoint" {
  const hasTest = planDay.activities.some((a) => a.type === "test");
  if (planDay.dayType === "D" || hasTest) {
    return "checkpoint";
  }
  if (planDay.dayType === "A") {
    return "learn";
  }
  return "practice";
}

function dailyPlanTaskType(planDay: StudyPlanView["days"][number]): ComposedLearningTask["type"] {
  return getDailyPlanTaskKind(planDay);
}

function practiceQuery(topicKey: Phase1TopicKey, skillCode?: string | null): string {
  const base = `topicKey=${encodeURIComponent(topicKey)}`;
  if (skillCode?.trim()) {
    return `${base}&primaryLearningSkillCode=${encodeURIComponent(skillCode.trim())}`;
  }
  return base;
}

function testQuery(topicKey: Phase1TopicKey, skillCode?: string | null): string {
  return practiceQuery(topicKey, skillCode);
}

/**
 * Pure composer — no I/O. Call from `getLearnDashboardData` with loaded snapshots.
 */
export function buildComposedLearningTasks(input: BuildComposedTasksInput): ComposedLearningTask[] {
  const topicOrder = input.topicOrder.length > 0 ? input.topicOrder : [...PHASE1_TOPIC_KEYS_IN_ORDER];
  const out: ComposedLearningTask[] = [];

  const reviewMins = estimateReviewMinutes(input.fsrs);
  const dueTotal = input.fsrs.dueCount + input.fsrs.learningDueCount;
  if (dueTotal > 0 && reviewMins > 0) {
    out.push({
      type: "review",
      title: "FSRS 到期複習 · Due FSRS review",
      reason: `有 ${dueTotal} 張題卡到期或學習中，應先清佇列以免堆積。 · Clear ${dueTotal} due/learning card(s) before other work.`,
      estimatedMins: reviewMins,
      href: LINK.review,
      priority: 10,
    });
  }

  if (input.studyPlan) {
    const day = input.studyPlan.days.find(
      (d) => d.dayNumber === input.studyPlan!.currentDayNumber && !d.completed,
    );
    if (day) {
      const dtype = dailyPlanTaskType(day);
      const anchorTopic = topicOrder[0]!;
      const mod = primaryModuleForTopic(anchorTopic);
      const skill = day.primarySkillCode;

      const title = `30日計劃 · Day ${day.dayNumber}（${day.dayType}）· 30-day plan day ${day.dayNumber}`;
      const reason = `今日排程約 ${day.totalMinutes} 分鐘；主技能 ${day.primarySkillLabelZh ?? skill ?? "—"} · ~${day.totalMinutes} min; primary skill ${skill ?? "—"}`;

      let href: string = LINK.studyplan;
      if (dtype === "learn") {
        href = `${LINK.learn}/${encodeURIComponent(anchorTopic)}${
          skill ? `?primaryLearningSkillCode=${encodeURIComponent(skill)}` : ""
        }`;
      } else if (dtype === "practice") {
        href = `${LINK.practice}?${practiceQuery(anchorTopic, skill)}`;
      } else if (dtype === "checkpoint") {
        href = `${LINK.test}?${testQuery(anchorTopic, skill)}`;
      }

      out.push({
        type: dtype,
        title,
        reason,
        estimatedMins: Math.min(60, Math.max(10, day.totalMinutes || 30)),
        href,
        moduleKey: mod.moduleKey,
        topicKey: anchorTopic,
        primaryLearningSkillCode: skill ?? undefined,
        priority: 25,
      });
    }
  }

  for (const topicKey of topicOrder) {
    if (stageForTopic(topicKey, input.progressByTopic) !== "Introduced") {
      continue;
    }
    const idx = topicIndexInOrder(topicOrder, topicKey);
    const titles = labelForTopic(topicKey, input.labels);
    const mod = primaryModuleForTopic(topicKey);
    const q = encodeURIComponent(topicKey);
    out.push({
      type: "practice",
      title: `${titles.zh} · ${titles.en} — 練習 · Practice`,
      reason:
        "已學過教材但尚未鞏固；先做練習再驗收。 · Introduced — consolidate with practice before checkpoint.",
      estimatedMins: 15,
      href: `${LINK.practice}?${practiceQuery(topicKey)}`,
      moduleKey: mod.moduleKey,
      topicKey,
      priority: 40 + idx,
    });
  }

  for (const topicKey of topicOrder) {
    if (stageForTopic(topicKey, input.progressByTopic) !== "Practiced") {
      continue;
    }
    const idx = topicIndexInOrder(topicOrder, topicKey);
    const titles = labelForTopic(topicKey, input.labels);
    const mod = primaryModuleForTopic(topicKey);
    out.push({
      type: "checkpoint",
      title: `${titles.zh} · ${titles.en} — 驗收 · Checkpoint`,
      reason: "練習階段已完成，進行計時驗收測驗。 · Practice done — take the checkpoint test.",
      estimatedMins: 18,
      href: `${LINK.test}?${testQuery(topicKey)}`,
      moduleKey: mod.moduleKey,
      topicKey,
      priority: 60 + idx,
    });
  }

  const firstNew = topicOrder.find((t) => stageForTopic(t, input.progressByTopic) === "New");
  if (firstNew) {
    const idx = topicIndexInOrder(topicOrder, firstNew);
    const titles = labelForTopic(firstNew, input.labels);
    const mod = primaryModuleForTopic(firstNew);
    const skill = input.nextRoiSkillCode?.trim();
    out.push({
      type: "learn",
      title: `${titles.zh} · ${titles.en} — 新主題 · Start topic`,
      reason:
        "路線中下一個尚未開始的主題；從教材建立進度。 · Next new topic in your path — open lessons.",
      estimatedMins: 12,
      href: `${LINK.learn}/${encodeURIComponent(firstNew)}${skill ? `?primaryLearningSkillCode=${encodeURIComponent(skill)}` : ""}`,
      moduleKey: mod.moduleKey,
      topicKey: firstNew,
      primaryLearningSkillCode: skill || undefined,
      priority: 80 + idx,
    });
  }

  out.sort((a, b) => a.priority - b.priority);
  return out;
}

export function composedTaskBadgeKey(t: ComposedLearningTask): "REVIEW" | "LEARN" | "PRACTICE" | "CHECKPOINT" {
  const m: Record<ComposedLearningTask["type"], "REVIEW" | "LEARN" | "PRACTICE" | "CHECKPOINT"> = {
    review: "REVIEW",
    learn: "LEARN",
    practice: "PRACTICE",
    checkpoint: "CHECKPOINT",
  };
  return m[t.type];
}
