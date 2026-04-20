"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import SessionHeader from "@/components/session/SessionHeader";
import AppCard from "@/components/ui/AppCard";
import CollapsibleNote from "@/components/ui/collapsible-note";
import { LearningPageCanvas, LearningSurface } from "@/components/ui/learning-surface";
import SectionLabel from "@/components/ui/section-label";
import { splitExplanationForFeedback } from "@/lib/explanation-split";
import type { CompletionNextStep } from "@/lib/session-summary";
import type { TestQuestionPayloadActive } from "@/lib/test-page-loader";
import { parseTestItemState, TEST_SECONDS_PER_QUESTION, TEST_TIMEOUT_USER_CHOICE, type TestResultSummary } from "@/lib/test-mode";
import { primaryButtonClass } from "@/lib/ui/form-classes";

import { completeTestSession, markTestQuestionShown, startTestSession, submitTestAnswer } from "./actions";

type TestSessionClientProps = {
  topicKey: string;
  label: string;
  sessionId: string;
  status: "active" | "completed" | "abandoned";
  questions: TestQuestionPayloadActive[];
  initialPos: number;
  itemStatesJson: unknown[];
  resultSummary?: TestResultSummary;
  compositionWarnings?: string[];
  nextStep?: CompletionNextStep;
};

export function TestStartClient({ topicKey }: { topicKey: string }) {
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
            void startTestSession(topicKey).then((r) => {
              if (r.ok && r.sessionId) {
                router.push(
                  `/test?topicKey=${encodeURIComponent(topicKey)}&session=${encodeURIComponent(r.sessionId)}&pos=0`,
                );
              } else {
                setErr(r.ok ? null : r.error ?? "failed");
              }
            });
          });
        }}
        className={primaryButtonClass}
      >
        開始驗收（15 題 · 每題 {TEST_SECONDS_PER_QUESTION}s）· Start checkpoint
      </button>
      {err ? <p className="mt-2 text-sm text-rose-700">{err}</p> : null}
    </div>
  );
}

export default function TestSessionClient({
  topicKey,
  label,
  sessionId,
  status,
  questions,
  initialPos,
  itemStatesJson,
  resultSummary,
  compositionWarnings,
  nextStep,
}: TestSessionClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [timerActive, setTimerActive] = useState(true);
  const processingRef = useRef(false);

  const n = questions.length;
  const safePos = n === 0 ? 0 : Math.min(Math.max(0, initialPos), n - 1);
  const q = questions[safePos];
  const states = itemStatesJson.map((raw) => parseTestItemState(raw));
  const st = states[safePos] ?? parseTestItemState(null);

  useEffect(() => {
    if (status !== "active") {
      return;
    }
    processingRef.current = false;
    setTimerActive(true);
    void markTestQuestionShown(sessionId, safePos);
  }, [sessionId, safePos, status]);

  const go = (pos: number) => {
    router.push(
      `/test?topicKey=${encodeURIComponent(topicKey)}&session=${encodeURIComponent(sessionId)}&pos=${pos}`,
    );
  };

  const runAfterAnswer = () => {
    if (safePos < n - 1) {
      go(safePos + 1);
    } else {
      startTransition(() => {
        void completeTestSession(sessionId).then(() => router.refresh());
      });
    }
  };

  const handleChoice = (choice: string) => {
    if (status !== "active" || st.phase === "answered" || processingRef.current) {
      return;
    }
    processingRef.current = true;
    setTimerActive(false);
    const submitKey = `${sessionId}-${safePos}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    startTransition(() => {
      void submitTestAnswer(sessionId, safePos, choice, submitKey).then((r) => {
        if (!r.ok) {
          processingRef.current = false;
          return;
        }
        runAfterAnswer();
      });
    });
  };

  const handleExpire = () => {
    if (status !== "active" || st.phase === "answered" || processingRef.current) {
      return;
    }
    processingRef.current = true;
    setTimerActive(false);
    const submitKey = `${sessionId}-${safePos}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    startTransition(() => {
      void submitTestAnswer(sessionId, safePos, TEST_TIMEOUT_USER_CHOICE, submitKey).then((r) => {
        if (!r.ok) {
          processingRef.current = false;
          return;
        }
        runAfterAnswer();
      });
    });
  };

  if (status === "completed" && resultSummary) {
    const s = resultSummary;
    return (
      <LearningSurface className="space-y-6">
        <LearningPageCanvas className={s.passed ? "border-emerald-200/60 bg-emerald-50/50" : "border-rose-200/60 bg-rose-50/50"}>
          <h2 className="text-lg font-semibold text-slate-900">驗收結果 · Checkpoint result</h2>
          <ul className="mt-3 space-y-1 text-sm text-slate-800">
            <li>整體正確率 · Overall: {(s.overallAccuracy * 100).toFixed(0)}%（{s.overallCorrect} / 15）</li>
            <li>目標主題（第 1–10 題）· Topic 1–10: {(s.topicAccuracy * 100).toFixed(0)}%（{s.topicCorrect} / 10）</li>
            <li>
              平均作答時間 · Avg time:{" "}
              {s.avgTimeTakenSec == null ? "—" : `${s.avgTimeTakenSec.toFixed(1)}s`}
            </li>
            <li>超時題數 · Timeouts: {s.timeoutCount}</li>
            <li className="font-semibold">{s.passed ? "通過 · Passed" : "未通過 · Not passed"}</li>
            {nextStep ? <li className="rounded-lg bg-white/70 px-2 py-1">下一步：{nextStep.detailZh}</li> : null}
          </ul>
          {compositionWarnings && compositionWarnings.length > 0 ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-950">
              <p className="font-semibold">題組警示（metadata / 題量）</p>
              <ul className="mt-1 list-inside list-disc">
                {compositionWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            {s.passed ? (
              <>
                <Link href={nextStep?.href ?? `/review?topicKey=${encodeURIComponent(topicKey)}`} className={primaryButtonClass}>
                  {nextStep?.ctaLabelZh ?? "前往複習隊列"} · Next step
                </Link>
                <Link
                  href={`/learn/${encodeURIComponent(topicKey)}`}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                >
                  主題進度 · Topic progress
                </Link>
              </>
            ) : (
              <Link href={`/practice?topicKey=${encodeURIComponent(topicKey)}`} className={primaryButtonClass}>
                回練習 · Back to practice
              </Link>
            )}
            <Link
              href="/learn"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              今日學習 · /learn
            </Link>
          </div>
        </LearningPageCanvas>

        <AppCard padding="md" className="border-slate-200/80 bg-white/90">
          <h3 className="text-base font-semibold text-slate-900">逐題檢討 · Review</h3>
          <p className="mt-1 text-xs text-slate-500">先對照正解，細節可展開 · Match answers first; expand for detail</p>
          <div className="mt-4 space-y-6">
            {s.perItem.map((row) => {
              const ex = splitExplanationForFeedback(row.explanation);
              return (
              <div key={row.position} className="border-b border-slate-100/90 pb-6 last:border-0 last:pb-0">
                <p className="text-xs font-semibold text-slate-500">
                  第 {row.position + 1} 題
                  {row.timedOut ? (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-950">TIMEOUT</span>
                  ) : null}
                </p>
                <div className="mt-3 space-y-2">
                  <SectionLabel kind="stem" />
                  <p className="max-w-prose whitespace-pre-wrap text-sm leading-relaxed text-slate-900">{row.questionText}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
                    <p className="text-xs text-slate-500">你選了 · Yours</p>
                    <p className="font-mono font-semibold">{row.userChoice}</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
                    <p className="text-xs text-slate-500">正解 · Correct</p>
                    <p className="font-mono font-semibold text-emerald-800">{row.correctAnswer}</p>
                  </div>
                  <span className="self-center text-lg">{row.correct ? "✓" : "✗"}</span>
                </div>
                {ex.summary ? (
                  <p className="mt-3 max-w-prose text-sm leading-relaxed text-slate-800">
                    <span className="font-semibold text-slate-600">關鍵差別 · Key:</span> {ex.summary}
                  </p>
                ) : null}
                {ex.detail.trim().length > 0 ? (
                  <CollapsibleNote summaryZh="正解解釋（完整）" summaryEn="Full explanation" className="mt-3">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{ex.detail}</p>
                  </CollapsibleNote>
                ) : !row.explanation ? (
                  <p className="mt-3 text-xs text-slate-500">（題庫未附解析）</p>
                ) : null}
              </div>
            );
            })}
          </div>
        </AppCard>
      </LearningSurface>
    );
  }

  if (status === "abandoned") {
    return (
      <AppCard>
        <p className="text-slate-700">此驗收場次已結束。請重新開始。</p>
        <TestStartClient topicKey={topicKey} />
      </AppCard>
    );
  }

  if (status !== "active" || !q) {
    return (
      <AppCard>
        <p className="text-slate-700">此場次已結束或無效。請重新開始。</p>
        <Link href={`/test?topicKey=${encodeURIComponent(topicKey)}`} className="mt-3 inline-block text-primary-700">
          返回 · Back
        </Link>
      </AppCard>
    );
  }

  if (st.phase === "answered") {
    return (
      <AppCard>
        <p className="text-slate-700">本題已提交；正在前往下一題…</p>
      </AppCard>
    );
  }

  return (
    <div className="space-y-6">
      <LearningSurface>
        <SessionHeader
          mode="test"
          current={safePos + 1}
          total={n}
          titleZh={label}
          subtitleZh="無提示 · 單次作答"
          topicOrModuleLabel="限時驗收"
          timer={{
            active: timerActive && !pending,
            totalSec: TEST_SECONDS_PER_QUESTION,
            resetKey: `${sessionId}-${safePos}`,
            onExpire: handleExpire,
            tone: "amber",
          }}
        />
      </LearningSurface>

      <LearningSurface>
        <AppCard padding="md" className="border-slate-200/80 bg-white/90">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <SectionLabel kind="timer" />
            <span className="text-[11px] text-slate-400">時間壓力 · stay focused</span>
          </div>
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
                  disabled={pending || st.phase === "answered"}
                  onClick={() => handleChoice(k)}
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
