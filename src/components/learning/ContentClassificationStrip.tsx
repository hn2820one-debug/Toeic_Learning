import type { ClassificationStripProps } from "@/lib/learning-content-classification";
import { CONTENT_DOMAIN_LABEL_EN, CONTENT_DOMAIN_LABEL_ZH, LEARNING_MODE_LABEL_ZH } from "@/lib/learning-content-classification";

const domainBadge: Record<string, string> = {
  grammar: "bg-emerald-100 text-emerald-900 border-emerald-200",
  vocabulary: "bg-sky-100 text-sky-900 border-sky-200",
  reading: "bg-indigo-100 text-indigo-900 border-indigo-200",
  listening: "bg-violet-100 text-violet-900 border-violet-200",
};

type Props = {
  strip: ClassificationStripProps;
  className?: string;
};

/**
 * Compact multi-axis summary: domain, skill, topic scene, module, mode.
 */
export default function ContentClassificationStrip({ strip, className = "" }: Props) {
  const dClass = domainBadge[strip.domain] ?? "bg-slate-100 text-slate-800 border-slate-200";

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2.5 text-xs text-slate-800 sm:flex-row sm:flex-wrap sm:items-center ${className}`}
    >
      <span className={`inline-flex w-fit shrink-0 rounded-lg border px-2 py-0.5 font-semibold ${dClass}`}>
        {CONTENT_DOMAIN_LABEL_ZH[strip.domain]} · {CONTENT_DOMAIN_LABEL_EN[strip.domain]}
      </span>
      {strip.mode ? (
        <span className="inline-flex w-fit shrink-0 rounded-md border border-slate-300 bg-white px-2 py-0.5 font-semibold text-slate-700">
          {LEARNING_MODE_LABEL_ZH[strip.mode]} · {strip.mode.toUpperCase()}
        </span>
      ) : null}
      {strip.skillKeyDisplay || strip.skillLabelZh ? (
        <span className="min-w-0 text-slate-700">
          <span className="font-semibold text-slate-500">Skill · </span>
          {strip.skillLabelZh ? <span>{strip.skillLabelZh}</span> : null}
          {strip.skillKeyDisplay ? (
            <code className="ml-1 rounded bg-white px-1.5 py-0.5 text-[11px] text-slate-600">{strip.skillKeyDisplay}</code>
          ) : null}
        </span>
      ) : null}
      {strip.topicLabelZh || strip.topicKey ? (
        <span className="min-w-0 text-slate-700">
          <span className="font-semibold text-slate-500">場景 · </span>
          {strip.topicLabelZh ?? "—"}
          {strip.topicKey ? <code className="ml-1 text-[11px] text-slate-500">({strip.topicKey})</code> : null}
        </span>
      ) : null}
      {strip.moduleTitleZh || strip.moduleKey ? (
        <span className="min-w-0 text-slate-700">
          <span className="font-semibold text-slate-500">單元 · </span>
          {strip.moduleTitleZh ?? "—"}
          {strip.moduleKey ? <code className="ml-1 text-[11px] text-slate-500">({strip.moduleKey})</code> : null}
        </span>
      ) : null}
    </div>
  );
}
