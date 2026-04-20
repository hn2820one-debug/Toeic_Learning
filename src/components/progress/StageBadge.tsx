import type { TopicProgressStage } from "../../../generated/prisma";

import { getStageBadgeTone, stageLabelBilingual, type StageBadgeTone } from "@/lib/stage-progress-actions";

const TONE_CLASS: Record<StageBadgeTone, string> = {
  slate: "bg-slate-100 text-slate-800 ring-slate-200",
  sky: "bg-sky-100 text-sky-900 ring-sky-200",
  amber: "bg-amber-100 text-amber-950 ring-amber-200",
  violet: "bg-violet-100 text-violet-900 ring-violet-200",
  emerald: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  teal: "bg-teal-100 text-teal-900 ring-teal-200",
};

export default function StageBadge({ stage, className }: { stage: TopicProgressStage; className?: string }) {
  const tone = getStageBadgeTone(stage);
  const { zh, en } = stageLabelBilingual(stage);
  return (
    <span
      className={`inline-flex flex-col rounded-lg px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${TONE_CLASS[tone]} ${className ?? ""}`}
    >
      <span>{zh}</span>
      <span className="text-[10px] font-normal opacity-90">{en}</span>
    </span>
  );
}
