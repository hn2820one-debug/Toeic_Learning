"use client";

import type { PredictionPayload } from "@/lib/practice/prediction";

type PredictionStepProps = {
  payload: PredictionPayload;
  /** Called after learner picks any option (low-stakes). */
  onContinue: () => void;
  /** Short hint under title */
  compactHintZh?: string;
};

/**
 * One quick structural guess before multiple-choice options (LEARN / PRACTICE only).
 */
export default function PredictionStep({ payload, onContinue, compactHintZh }: PredictionStepProps) {
  return (
    <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/40 px-3 py-3 sm:px-4 sm:py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800/90">預測 · Think first</p>
      <p className="mt-1 text-sm font-semibold text-indigo-950">{payload.promptZh}</p>
      <p className="mt-0.5 text-xs text-indigo-800/85">{payload.promptEn}</p>
      {compactHintZh ? <p className="mt-2 text-xs text-indigo-900/80">{compactHintZh}</p> : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {payload.choices.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={onContinue}
            className="rounded-lg border border-indigo-200/90 bg-white/90 px-3 py-2.5 text-left text-sm text-indigo-950 shadow-sm transition hover:border-indigo-300 hover:bg-white"
          >
            {c.labelZh}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-indigo-800/75">揀邊個都得 — 跟住先至睇正式選項。</p>
    </div>
  );
}
