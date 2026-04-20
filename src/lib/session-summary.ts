import "server-only";

import type { LearningTask } from "@/lib/learning-path";
import { getLearnDashboardData } from "@/lib/learn-dashboard";

export type SessionProgressViewModel = {
  current: number;
  total: number;
  ratio: number;
  percent: number;
};

export function getSessionProgressViewModel(input: { current: number; total: number }): SessionProgressViewModel {
  const total = Math.max(1, input.total);
  const current = Math.min(Math.max(1, input.current), total);
  const ratio = current / total;
  return {
    current,
    total,
    ratio,
    percent: Math.round(ratio * 100),
  };
}

export type CompletionNextStep = {
  task: LearningTask | null;
  titleZh: string;
  detailZh: string;
  ctaLabelZh: string;
  href: string;
};

export function buildCompletionNextStep(input: {
  recommendedTask: LearningTask | null;
  defaultHref: string;
  defaultTitleZh: string;
  defaultDetailZh: string;
}): CompletionNextStep {
  const t = input.recommendedTask;
  if (!t) {
    return {
      task: null,
      titleZh: input.defaultTitleZh,
      detailZh: input.defaultDetailZh,
      ctaLabelZh: "回到今日學習",
      href: input.defaultHref,
    };
  }
  return {
    task: t,
    titleZh: `下一步：${t.type.toUpperCase()}`,
    detailZh: t.reasonZh,
    ctaLabelZh: t.ctaLabelZh || "前往下一步",
    href: t.href,
  };
}

export async function getCompletionNextStep(defaults: {
  defaultHref: string;
  defaultTitleZh: string;
  defaultDetailZh: string;
}): Promise<CompletionNextStep> {
  const dashboard = await getLearnDashboardData();
  const top = dashboard.tasks[0] ?? null;
  return buildCompletionNextStep({
    recommendedTask: top,
    defaultHref: defaults.defaultHref,
    defaultTitleZh: defaults.defaultTitleZh,
    defaultDetailZh: defaults.defaultDetailZh,
  });
}

