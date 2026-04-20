import type { TopicProgressStage } from "../../generated/prisma";

import type { Phase1TopicKey } from "@/content/programs/phase1/types";

export type ProgressCta = {
  primary: { href: string; labelZh: string; labelEn: string };
  secondary?: { href: string; labelZh: string; labelEn: string };
};

/**
 * Closed-loop CTA routing by topic stage — pure; safe to share across `/progress` and future surfaces.
 */
export function getActionForStage(stage: TopicProgressStage, topicKey: Phase1TopicKey): ProgressCta {
  const q = encodeURIComponent(topicKey);
  switch (stage) {
    case "New":
      return {
        primary: { href: `/learn/${topicKey}`, labelZh: "開始學習", labelEn: "Start learning" },
      };
    case "Introduced":
      return {
        primary: { href: `/practice?topicKey=${q}`, labelZh: "練習", labelEn: "Practice" },
        secondary: { href: `/learn/${topicKey}`, labelZh: "教材", labelEn: "Lessons" },
      };
    case "Practiced":
      return {
        primary: { href: `/test?topicKey=${q}`, labelZh: "驗收", labelEn: "Checkpoint test" },
        secondary: { href: `/practice?topicKey=${q}`, labelZh: "再練習", labelEn: "Practice again" },
      };
    case "Tested":
    case "Mastered":
    case "Maintained":
      return {
        primary: { href: `/learn/${topicKey}`, labelZh: "回顧內容", labelEn: "Review content" },
        secondary: { href: "/review", labelZh: "FSRS 複習", labelEn: "FSRS review" },
      };
    default:
      return {
        primary: { href: `/learn/${topicKey}`, labelZh: "前往主題", labelEn: "Open topic" },
      };
  }
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
