"use client";

import { useMemo } from "react";

import ChoiceFeedbackPanel from "@/components/session/ChoiceFeedbackPanel";
import AppCard from "@/components/ui/AppCard";
import CollapsibleNote from "@/components/ui/collapsible-note";
import SectionLabel from "@/components/ui/section-label";
import type { ReviewQuestionPayload } from "@/lib/review/review-types";
import type { ReviewItemStateJson } from "@/lib/review-mode";
import { showReviewFeedback } from "@/lib/review/show-review-feedback";

type ReviewFeedbackCardProps = {
  q: ReviewQuestionPayload;
  st: ReviewItemStateJson;
  /** When set, matches server `submitReviewAnswer` explanation resolution (explanation → notes → fallback). */
  explanationOverride?: string | null;
};

export default function ReviewFeedbackCard({ q, st, explanationOverride }: ReviewFeedbackCardProps) {
  const vm = useMemo(
    () => showReviewFeedback({ q, st, explanationOverride }),
    [q, st, explanationOverride],
  );

  return (
    <AppCard padding="md" className="border-slate-200/80 bg-white/90">
      <div className="mb-4 flex flex-wrap gap-2">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
            st.correct
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
              : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
          }`}
        >
          {st.correct ? "✓ 正確" : "✗ 錯誤"}
          {st.timedOut ? " · TIMEOUT" : ""}
        </span>
        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {q.topic}
        </span>
      </div>
      <div className="space-y-2">
        <SectionLabel kind="stem" />
        <p className="max-w-prose whitespace-pre-wrap text-[15px] leading-relaxed text-slate-900">{q.questionText}</p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="text-xs text-slate-500">
          用時 · Time: <span className="font-semibold text-slate-800">{st.timeTakenSec?.toFixed(0) ?? "—"}s</span>
        </span>
      </div>
      <div className="mt-4">
        <ChoiceFeedbackPanel feedback={vm.feedback} tone={vm.tone} />
      </div>
      {vm.ratingExpl.detail.trim().length > 0 ? (
        <CollapsibleNote summaryZh="正解解釋（完整）" summaryEn="Full explanation" className="mt-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{vm.ratingExpl.detail}</p>
        </CollapsibleNote>
      ) : !vm.ratingExpl.summary && vm.explanationFull ? (
        <CollapsibleNote summaryZh="解析 · Explanation" summaryEn="Why" className="mt-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{vm.explanationFull}</p>
        </CollapsibleNote>
      ) : null}
    </AppCard>
  );
}
