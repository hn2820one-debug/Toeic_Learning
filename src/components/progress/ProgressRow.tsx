import Link from "next/link";

import type { TopicProgressRowView } from "@/lib/progress-view-model";
import { getActionForStage } from "@/lib/stage-progress-actions";
import { primaryButtonClass } from "@/lib/ui/form-classes";

import StageBadge from "./StageBadge";

function formatAccuracy(row: TopicProgressRowView): string | null {
  if (row.stage === "Introduced" || row.stage === "Practiced") {
    if (row.practiceAccuracy != null) {
      return `${(row.practiceAccuracy * 100).toFixed(0)}%（練習）`;
    }
    return null;
  }
  if (["Tested", "Mastered", "Maintained"].includes(row.stage)) {
    if (row.testAccuracy != null) {
      return `${(row.testAccuracy * 100).toFixed(0)}%（驗收）`;
    }
    if (row.practiceAccuracy != null) {
      return `${(row.practiceAccuracy * 100).toFixed(0)}%（練習）`;
    }
    return null;
  }
  return null;
}

export default function ProgressRow({ row }: { row: TopicProgressRowView }) {
  const cta = getActionForStage(row.stage, row.topicKey);
  const acc = formatAccuracy(row);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <StageBadge stage={row.stage} />
          <span className="font-medium text-slate-900">{row.labelZh}</span>
          <span className="text-xs text-slate-500">{row.labelEn}</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          {acc ? <span>準確度 · {acc}</span> : <span className="text-slate-400">準確度 · —</span>}
          {row.lastActivityAt ? (
            <span>上次活動 · {row.lastActivityAt.toLocaleString("zh-TW", { hour12: false })}</span>
          ) : (
            <span className="text-slate-400">上次活動 · —</span>
          )}
          {row.readinessHint ? <span className="text-primary-700">{row.readinessHint}</span> : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Link href={cta.primary.href} className={`${primaryButtonClass} px-4 py-2 text-sm`}>
          {cta.primary.labelZh}
        </Link>
        {cta.secondary ? (
          <Link
            href={cta.secondary.href}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            {cta.secondary.labelZh}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
