"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import SessionHeader from "@/components/session/SessionHeader";
import AppCard from "@/components/ui/AppCard";
import type { PracticeCompletedSummary, PracticeQuestionPayload } from "@/lib/practice/practice-page-loader";
import { parsePracticeItemState } from "@/lib/practice/practice-state";
import type { CompletionNextStep } from "@/lib/session-summary";
import { primaryButtonClass } from "@/lib/ui/form-classes";

import {
  completePracticeSession,
  revealPracticeHint,
  startPracticeSession,
  submitPracticeAnswer,
} from "./actions";

type PracticeSessionClientProps = {
  topicKey: string;
  label: string;
  sessionId: string;
  status: "active" | "completed" | "abandoned";
  questions: PracticeQuestionPayload[];
  initialPos: number;
  /** Serialized states aligned by position index */
  itemStatesJson: unknown[];
  completedSummary?: PracticeCompletedSummary;
  nextStep?: CompletionNextStep;
};

export default function PracticeSessionClient({
  topicKey,
  label,
  sessionId,
  status,
  questions,
  initialPos,
  itemStatesJson,
  completedSummary,
  nextStep,
}: PracticeSessionClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [localReveal, setLocalReveal] = useState<string | null>(null);

  const n = questions.length;
  const safePos = n === 0 ? 0 : Math.min(Math.max(0, initialPos), n - 1);
  const q = questions[safePos];
  const states = useMemo(
    () => itemStatesJson.map((raw) => parsePracticeItemState(raw)),
    [itemStatesJson],
  );
  const st = states[safePos] ?? parsePracticeItemState(null);
  const isLast = n > 0 && safePos === n - 1;
  const hintsDisabled = isLast;

  const allResolved =
    n > 0 && states.every((s) => s.status === "solved" || s.status === "revealed");

  const go = (pos: number) => {
    router.push(`/practice?topicKey=${encodeURIComponent(topicKey)}&session=${encodeURIComponent(sessionId)}&pos=${pos}`);
  };

  const onHint = (layer: 1 | 2 | 3) => {
    setLocalReveal(null);
    startTransition(() => {
      void revealPracticeHint(sessionId, safePos, layer).then(() => router.refresh());
    });
  };

  const onSubmit = (choice: string) => {
    setLocalReveal(null);
    const submitKey = `${sessionId}-${safePos}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    startTransition(() => {
      void submitPracticeAnswer(sessionId, safePos, choice, submitKey).then((r) => {
        if (r.ok && "revealAnswer" in r && r.revealAnswer) {
          setLocalReveal(r.revealAnswer);
        }
        router.refresh();
      });
    });
  };

  const onFinish = () => {
    startTransition(() => {
      void completePracticeSession(sessionId).then(() => router.refresh());
    });
  };

  if (status === "completed" && completedSummary) {
    return (
      <div className="space-y-6">
        <AppCard padding="md" className="border-emerald-200 bg-emerald-50/90">
          <h2 className="text-lg font-semibold text-emerald-950">練習結果 · Practice result</h2>
          <ul className="mt-3 space-y-1 text-sm text-emerald-900">
            <li>原始正答率（首答）· Raw: {(completedSummary.rawCorrectRate * 100).toFixed(0)}%</li>
            <li>有效準確度 · Effective: {(completedSummary.effectiveAccuracy * 100).toFixed(0)}%</li>
            <li>提示使用次數 · Hints used: {completedSummary.totalHintsUsed}</li>
            <li>提示折損 · Hint penalty: {(completedSummary.hintPenalty * 100).toFixed(0)}%</li>
            <li className="font-semibold">
              {completedSummary.passed ? "通過 · Passed" : "未達標 · Not passed"}
            </li>
            {nextStep ? (
              <li className="rounded-lg bg-white/70 px-2 py-1 text-emerald-950">
                下一步建議：{nextStep.detailZh}
              </li>
            ) : null}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={nextStep?.href ?? `/test?topicKey=${encodeURIComponent(topicKey)}`}
              className={primaryButtonClass}
            >
              {nextStep?.ctaLabelZh ?? "前往驗收"} · Next step
            </Link>
            <Link
              href={`/practice?topicKey=${encodeURIComponent(topicKey)}`}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              再練一次 · Practice again
            </Link>
            <Link
              href={`/learn/${encodeURIComponent(topicKey)}`}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              回主題學習 · Back to learn
            </Link>
          </div>
        </AppCard>
      </div>
    );
  }

  if (status !== "active" || !q) {
    return (
      <AppCard>
        <p className="text-slate-700">此場次已結束或無效。請重新開始。</p>
        <Link href={`/practice?topicKey=${encodeURIComponent(topicKey)}`} className="mt-3 inline-block text-primary-700">
          返回 · Back
        </Link>
      </AppCard>
    );
  }

  return (
    <div className="space-y-6">
      <SessionHeader
        mode="practice"
        current={safePos + 1}
        total={n}
        titleZh={label}
        subtitleZh={`已用提示層數 ${st.maxHintLayerSeen} · 本題嘗試 ${st.attempts.length} / 3`}
        topicOrModuleLabel="腳手架練習"
      />

      <AppCard padding="md">
        <p className="mb-4 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-900">{q.questionText}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["A", "B", "C", "D"] as const).map((k) => (
            <button
              key={k}
              type="button"
              disabled={st.status !== "open" || pending}
              onClick={() => onSubmit(k)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-sm text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-40"
            >
              <span className="font-semibold text-primary-700">{k}.</span>{" "}
              {k === "A" ? q.optionA : k === "B" ? q.optionB : k === "C" ? q.optionC : q.optionD}
            </button>
          ))}
        </div>

        {!hintsDisabled && st.status === "open" ? (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">看提示 · Hints (separate from submit)</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending || st.maxHintLayerSeen >= 1}
                onClick={() => onHint(1)}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-40"
              >
                提示 1
              </button>
              <button
                type="button"
                disabled={pending || st.maxHintLayerSeen < 1 || st.maxHintLayerSeen >= 2}
                onClick={() => onHint(2)}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-40"
              >
                提示 2
              </button>
              <button
                type="button"
                disabled={pending || st.maxHintLayerSeen < 2 || st.maxHintLayerSeen >= 3}
                onClick={() => onHint(3)}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-40"
              >
                提示 3
              </button>
            </div>
            {st.maxHintLayerSeen >= 1 ? (
              <p className="mt-3 rounded-lg bg-amber-50/80 p-3 text-sm text-amber-950">{q.hints.level1}</p>
            ) : null}
            {st.maxHintLayerSeen >= 2 ? (
              <p className="mt-2 rounded-lg bg-amber-50/80 p-3 text-sm text-amber-950">{q.hints.level2}</p>
            ) : null}
            {st.maxHintLayerSeen >= 3 ? (
              <p className="mt-2 rounded-lg bg-amber-50/80 p-3 text-sm text-amber-950">{q.hints.level3}</p>
            ) : null}
          </div>
        ) : hintsDisabled ? (
          <p className="mt-6 text-xs font-medium text-slate-500">最後一題：不提供提示層（預熱）。</p>
        ) : null}

        {localReveal ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-950">
            <p className="font-semibold">參考解析</p>
            <p className="mt-1 whitespace-pre-wrap">{localReveal}</p>
          </div>
        ) : null}

        {st.status !== "open" ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {!isLast ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => go(safePos + 1)}
                className={primaryButtonClass}
              >
                下一題 · Next
              </button>
            ) : (
              <button
                type="button"
                disabled={pending || !allResolved}
                onClick={onFinish}
                className={primaryButtonClass}
              >
                完成並結算 · Finish
              </button>
            )}
          </div>
        ) : null}
      </AppCard>
    </div>
  );
}

export function PracticeStartClient({ topicKey }: { topicKey: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setErr(null);
          startTransition(() => {
            void startPracticeSession(topicKey).then((r) => {
              if (r.ok && r.sessionId) {
                router.push(
                  `/practice?topicKey=${encodeURIComponent(topicKey)}&session=${encodeURIComponent(r.sessionId)}&pos=0`,
                );
              } else {
                setErr(r.ok ? null : r.error ?? "failed");
              }
            });
          });
        }}
        className={primaryButtonClass}
      >
        開始練習（10 題為目標）· Start practice
      </button>
      {err ? <p className="mt-2 text-sm text-rose-700">{err}</p> : null}
    </div>
  );
}
