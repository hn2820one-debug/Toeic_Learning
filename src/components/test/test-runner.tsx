"use client";

import SessionProgressBar from "@/components/session/SessionProgressBar";
import AppCard from "@/components/ui/AppCard";
import { LearningSurface } from "@/components/ui/learning-surface";
import SectionLabel from "@/components/ui/section-label";
import type { TestQuestionPayloadActive } from "@/lib/test-page-loader";

import TestQuestionTimer from "./question-timer";

export type TestRunnerProps = {
  label: string;
  sessionId: string;
  safePos: number;
  total: number;
  secondsPerQuestion: number;
  question: TestQuestionPayloadActive;
  pending: boolean;
  timerActive: boolean;
  onExpire: () => void;
  onChoose: (choice: string) => void;
};

export default function TestRunner({
  label,
  sessionId,
  safePos,
  total,
  secondsPerQuestion,
  question: q,
  pending,
  timerActive,
  onExpire,
  onChoose,
}: TestRunnerProps) {
  return (
    <div className="space-y-6">
      <LearningSurface>
        <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white/95 to-slate-50/40 px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Test</p>
              <p className="text-base font-semibold text-slate-900">{label}</p>
              <p className="mt-1 text-sm text-slate-600">無提示 · 單次作答 · {secondsPerQuestion}s / 題</p>
              <p className="mt-1 text-xs text-slate-500">限時驗收 · Checkpoint</p>
            </div>
            <TestQuestionTimer
              resetKey={`${sessionId}-${safePos}`}
              totalSec={secondsPerQuestion}
              active={timerActive && !pending}
              onExpire={onExpire}
              className="w-full max-w-[220px] space-y-2 sm:max-w-xs"
            />
          </div>
          <SessionProgressBar current={safePos + 1} total={total} className="mt-3" />
        </div>
      </LearningSurface>

      <LearningSurface>
        <AppCard padding="md" className="border-slate-200/80 bg-white/90">
          <div className="space-y-3">
            <SectionLabel kind="stem" />
            <p className="max-w-prose whitespace-pre-wrap text-[15px] leading-relaxed text-slate-900">{q.questionText}</p>
          </div>
          <div className="mt-6 space-y-3">
            <SectionLabel kind="options" />
            <div className="grid gap-2 sm:grid-cols-2">
              {(["A", "B", "C", "D"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  disabled={pending}
                  onClick={() => onChoose(k)}
                  className="rounded-xl border border-slate-200/90 bg-slate-50/50 px-3 py-3 text-left text-sm leading-relaxed text-slate-800 shadow-sm hover:bg-white disabled:opacity-40"
                >
                  <span className="font-semibold text-primary-700">{k}.</span>{" "}
                  {k === "A" ? q.optionA : k === "B" ? q.optionB : k === "C" ? q.optionC : q.optionD}
                </button>
              ))}
            </div>
          </div>
          {pending ? <p className="mt-3 text-xs text-slate-500">處理中…</p> : null}
        </AppCard>
      </LearningSurface>
    </div>
  );
}
