"use client";

import SectionLabel from "@/components/ui/section-label";

export type HintPanelProps = {
  maxHintLayerSeen: number;
  onReveal: (layer: 1 | 2 | 3) => void;
  disabled: boolean;
  pending: boolean;
  hints: { level1: string; level2: string; level3: string };
};

/**
 * Three-layer scaffolded hints; `maxHintLayerSeen` is how many layers the learner has unlocked (0–3).
 */
export default function HintPanel({ maxHintLayerSeen, onReveal, disabled, pending, hints }: HintPanelProps) {
  return (
    <div className="mt-6 border-t border-dashed border-slate-200/90 pt-6 opacity-95">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SectionLabel kind="hint" />
        <span className="text-[11px] text-slate-400">與送出分開 · separate from submit</span>
      </div>
      <p className="mb-3 text-xs font-medium text-amber-950/90">
        已展開提示層數 · Layers unlocked: <span className="font-semibold">{maxHintLayerSeen}</span> / 3
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || disabled || maxHintLayerSeen >= 1}
          onClick={() => onReveal(1)}
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-40"
        >
          提示 1
        </button>
        <button
          type="button"
          disabled={pending || disabled || maxHintLayerSeen < 1 || maxHintLayerSeen >= 2}
          onClick={() => onReveal(2)}
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-40"
        >
          提示 2
        </button>
        <button
          type="button"
          disabled={pending || disabled || maxHintLayerSeen < 2 || maxHintLayerSeen >= 3}
          onClick={() => onReveal(3)}
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-40"
        >
          提示 3
        </button>
      </div>
      {maxHintLayerSeen >= 1 ? (
        <p className="mt-3 max-w-prose rounded-lg border border-amber-100/80 bg-amber-50/60 p-3 text-sm leading-relaxed text-amber-950">
          {hints.level1}
        </p>
      ) : null}
      {maxHintLayerSeen >= 2 ? (
        <p className="mt-2 max-w-prose rounded-lg border border-amber-100/80 bg-amber-50/60 p-3 text-sm leading-relaxed text-amber-950">
          {hints.level2}
        </p>
      ) : null}
      {maxHintLayerSeen >= 3 ? (
        <p className="mt-2 max-w-prose rounded-lg border border-amber-100/80 bg-amber-50/60 p-3 text-sm leading-relaxed text-amber-950">
          {hints.level3}
        </p>
      ) : null}
    </div>
  );
}
