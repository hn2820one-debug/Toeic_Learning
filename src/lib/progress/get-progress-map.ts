import "server-only";

import type { Phase1ModuleKey } from "@/content/programs/phase1/types";
import {
  buildProgressPageModel,
  type ModuleProgressSection,
  type ProgressPageModel,
  type TopicProgressRowView,
} from "@/lib/progress-view-model";
import { getActionForStage } from "@/lib/stage-progress-actions";

export type ModuleMapSummary = {
  moduleKey: Phase1ModuleKey;
  titleZh: string;
  titleEn: string;
  topicCount: number;
  /** Topics at Tested, Mastered, or Maintained */
  testedOrMaintainedCount: number;
  /** Rough pipeline completion: tested+ / topics in module */
  progressPct: number;
  nextAction: { href: string; labelZh: string } | null;
};

function nextTopicNeedingWork(topics: TopicProgressRowView[]): TopicProgressRowView | null {
  for (const t of topics) {
    if (t.stage !== "Maintained") {
      return t;
    }
  }
  return null;
}

export type ProgressMapView =
  | { kind: "no_user"; model: ProgressPageModel; moduleSummaries: ModuleMapSummary[] }
  | { kind: "ready"; model: ProgressPageModel; moduleSummaries: ModuleMapSummary[] };

function summarizeModule(sec: ModuleProgressSection): ModuleMapSummary {
  const topics = sec.topics;
  const n = topics.length;
  const testedOrMaintainedCount = topics.filter((t) =>
    ["Tested", "Mastered", "Maintained"].includes(t.stage),
  ).length;
  const progressPct = n === 0 ? 0 : Math.round((testedOrMaintainedCount / n) * 100);
  const next = nextTopicNeedingWork(topics);
  let nextAction: ModuleMapSummary["nextAction"] = null;
  if (next) {
    const cta = getActionForStage(next.stage, next.topicKey, { zh: next.labelZh, en: next.labelEn });
    nextAction = { href: cta.primary.href, labelZh: cta.primary.labelZh };
  }

  return {
    moduleKey: sec.moduleKey,
    titleZh: sec.titleZh,
    titleEn: sec.titleEn,
    topicCount: n,
    testedOrMaintainedCount,
    progressPct,
    nextAction,
  };
}

/**
 * Progress “map” view: same rows as `buildProgressPageModel`, plus per-module completion and next CTA.
 */
export async function getProgressMapView(): Promise<ProgressMapView> {
  const model = await buildProgressPageModel();
  const moduleSummaries: ModuleMapSummary[] = model.sections.map(summarizeModule);
  return { kind: model.kind, model, moduleSummaries };
}
