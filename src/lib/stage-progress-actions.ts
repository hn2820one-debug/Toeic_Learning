import type { TopicProgressStage } from "../../generated/prisma";

import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import { getTopicProgressActions, type TopicProgressLabels } from "@/lib/learning-path";

export type ProgressCta = {
  primary: { href: string; labelZh: string; labelEn: string };
  secondary?: { href: string; labelZh: string; labelEn: string };
};

/**
 * Closed-loop CTA routing — delegates to `getTopicProgressActions` in the learning path engine
 * so `/progress` matches `/learn` and home next action hrefs.
 */
export function getActionForStage(
  stage: TopicProgressStage,
  topicKey: Phase1TopicKey,
  labels?: TopicProgressLabels,
): ProgressCta {
  const { primary, secondary } = getTopicProgressActions(topicKey, stage, labels);
  return {
    primary: { href: primary.href, labelZh: primary.ctaLabelZh, labelEn: primary.ctaLabelEn },
    secondary: secondary
      ? { href: secondary.href, labelZh: secondary.ctaLabelZh, labelEn: secondary.ctaLabelEn }
      : undefined,
  };
}

export type StageBadgeTone = "slate" | "sky" | "amber" | "violet" | "emerald" | "teal";

export function getStageBadgeTone(stage: TopicProgressStage): StageBadgeTone {
  switch (stage) {
    case "New":
      return "slate";
    case "Introduced":
      return "sky";
    case "Practiced":
      return "amber";
    case "Tested":
      return "violet";
    case "Mastered":
      return "emerald";
    case "Maintained":
      return "teal";
    default:
      return "slate";
  }
}

export function stageLabelBilingual(stage: TopicProgressStage): { zh: string; en: string } {
  const map: Record<TopicProgressStage, { zh: string; en: string }> = {
    New: { zh: "未開始", en: "New" },
    Introduced: { zh: "已介紹", en: "Introduced" },
    Practiced: { zh: "已練習", en: "Practiced" },
    Tested: { zh: "已驗收", en: "Tested" },
    Mastered: { zh: "精通", en: "Mastered" },
    Maintained: { zh: "維持", en: "Maintained" },
  };
  return map[stage] ?? { zh: String(stage), en: String(stage) };
}

/**
 * Optional heuristic: only when we have practice accuracy before test.
 */
export function readinessHintForTopic(params: {
  stage: TopicProgressStage;
  practiceAccuracy: number | null;
  testAccuracy: number | null;
}): string | null {
  const { stage, practiceAccuracy, testAccuracy } = params;
  if (stage === "Practiced" && practiceAccuracy != null) {
    if (practiceAccuracy >= 0.8) {
      return "練習表現穩定 · 可安排驗收";
    }
    if (practiceAccuracy < 0.55) {
      return "建議再加強練習後再驗收";
    }
    return null;
  }
  if ((stage === "Tested" || stage === "Mastered") && testAccuracy != null) {
    return `上次驗收 ${(testAccuracy * 100).toFixed(0)}%`;
  }
  return null;
}
