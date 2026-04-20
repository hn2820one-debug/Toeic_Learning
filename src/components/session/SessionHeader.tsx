"use client";

import QuestionTimer from "@/components/training/QuestionTimer";

import SessionProgressBar from "./SessionProgressBar";

type SessionHeaderProps = {
  mode: "practice" | "test" | "review";
  current: number;
  total: number;
  titleZh: string;
  subtitleZh?: string;
  topicOrModuleLabel?: string;
  timer?: {
    active: boolean;
    totalSec: number;
    resetKey: string;
    onExpire: () => void;
    tone?: "amber" | "violet" | "sky";
  };
};

function timerClass(tone: "amber" | "violet" | "sky") {
  if (tone === "amber") return "border-amber-300/80 text-amber-950";
  if (tone === "violet") return "border-violet-300/80 text-violet-950";
  return "border-sky-300/80 text-sky-950";
}

export default function SessionHeader({
  mode,
  current,
  total,
  titleZh,
  subtitleZh,
  topicOrModuleLabel,
  timer,
}: SessionHeaderProps) {
  const modeLabel = mode === "practice" ? "Practice" : mode === "test" ? "Test" : "Review";
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white/95 to-slate-50/40 px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{modeLabel}</p>
          <p className="text-base font-semibold text-slate-900">{titleZh}</p>
          {subtitleZh ? <p className="mt-1 text-sm text-slate-600">{subtitleZh}</p> : null}
          {topicOrModuleLabel ? <p className="mt-1 text-xs text-slate-500">{topicOrModuleLabel}</p> : null}
        </div>
        {timer ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">剩餘時間</span>
            <QuestionTimer
              resetKey={timer.resetKey}
              totalSec={timer.totalSec}
              active={timer.active}
              onExpire={timer.onExpire}
              className={`rounded-xl border bg-white px-3 py-1.5 text-base shadow-sm ${timerClass(timer.tone ?? "sky")}`}
            />
          </div>
        ) : null}
      </div>
      <SessionProgressBar current={current} total={total} className="mt-3" />
    </div>
  );
}

