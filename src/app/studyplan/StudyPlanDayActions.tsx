"use client";

import { useTransition } from "react";
import { CheckCircle2, Undo2 } from "lucide-react";

import { toggleDayComplete } from "./actions";

type Props = {
  dailyPlanItemId: string;
  completed: boolean;
  compact?: boolean;
};

export default function StudyPlanDayActions({ dailyPlanItemId, completed, compact }: Props) {
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      const cognitiveLoad = completed ? null : null; // self-report UI can wire later
      await toggleDayComplete(dailyPlanItemId, cognitiveLoad);
    });
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
          completed
            ? "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
        } ${isPending ? "cursor-wait opacity-60" : ""}`}
        aria-label={completed ? "標記為未完成" : "標記為完成"}
      >
        {completed ? (
          <span className="flex items-center gap-1">
            <Undo2 size={12} /> Undo
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <CheckCircle2 size={12} /> Mark done
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-all ${
        completed
          ? "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : "bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:from-primary-700 hover:to-primary-600"
      } ${isPending ? "cursor-wait opacity-60" : ""}`}
    >
      {completed ? (
        <>
          <Undo2 size={16} /> 標記為未完成 · Mark incomplete
        </>
      ) : (
        <>
          <CheckCircle2 size={16} /> 完成今日 · Mark day complete
        </>
      )}
    </button>
  );
}
