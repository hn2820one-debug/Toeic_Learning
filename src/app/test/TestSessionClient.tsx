"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import TestRunner from "@/components/test/test-runner";
import AppCard from "@/components/ui/AppCard";
import CollapsibleNote from "@/components/ui/collapsible-note";
import { LearningPageCanvas, LearningSurface } from "@/components/ui/learning-surface";
import SectionLabel from "@/components/ui/section-label";
import ChoiceFeedbackPanel from "@/components/session/ChoiceFeedbackPanel";
import { buildChoiceFeedback } from "@/lib/choice-feedback";
import { splitExplanationForFeedback } from "@/lib/explanation-split";
import type { CompletionNextStep } from "@/lib/session-summary";
import type { TestQuestionPayloadActive } from "@/lib/test-page-loader";
import { parseTestItemState, TEST_TIMEOUT_USER_CHOICE, type TestResultSummary } from "@/lib/test-mode";
import { primaryButtonClass } from "@/lib/ui/form-classes";

import {
  completeTestSession,
  markTestQuestionShown,
  startTestSession,
  submitTestAnswer,
  type TestActionResult,
} from "./actions";

type TestSessionClientProps = {
  topicKey: string;
  label: string;
  sessionId: string;
  status: "active" | "completed" | "abandoned";
  questions: TestQuestionPayloadActive[];
  initialPos: number;
  itemStatesJson: unknown[];
  secondsPerQuestion: number;
  resultSummary?: TestResultSummary;
  compositionWarnings?: string[];
  nextStep?: CompletionNextStep;
};

export type TestStartPreset = {
  mode?: string;
  skill?: string;
  moduleKey?: string;
  count?: number;
};

function formatTestStartError(r: Extract<TestActionResult, { ok: false }>): string {
  if (r.error === "insufficient_questions" && r.detail && typeof r.detail === "object") {
    const d = r.detail as {
      requestedCount?: number;
      actualCount?: number;
      skillCode?: string;
      hintZh?: string;
    };
    return `${d.hintZh ?? "題量不足以完成本場 strict 驗收"}（已選 ${d.actualCount ?? 0} / 目標 ${d.requestedCount ?? "?"}；skill=${d.skillCode ?? "—"}）`;
  }
  if (r.error === "skill_required" && r.detail && typeof r.detail === "object") {
    const d = r.detail as { hintZh?: string };
    return d.hintZh ?? "驗收必須帶入 skill（primaryLearningSkillCode）。";
  }
  return r.error;
}

export function TestStartClient({
  topicKey,
  preset,
  disabled,
}: {
  topicKey: string;
  preset?: TestStartPreset;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending || disabled}
        onClick={() => {
          setErr(null);
          startTransition(() => {
            void startTestSession(topicKey, {
              mode: preset?.mode,
              skill: preset?.skill,
              moduleKey: preset?.moduleKey,
              count: preset?.count,
            }).then((r) => {
              if (r.ok && r.sessionId) {
                const p = new URLSearchParams();
                p.set("topicKey", topicKey);
                p.set("session", r.sessionId);
                p.set("pos", "0");
                if (preset?.mode) {
                  p.set("mode", preset.mode);
                }
                if (preset?.skill) {
                  p.set("skill", preset.skill);
                }
                if (preset?.moduleKey) {
                  p.set("moduleKey", preset.moduleKey);
                }
                if (preset?.count != null) {
                  p.set("count", String(preset.count));
                }
                router.push(`/test?${p.toString()}`);
              } else {
                setErr(r.ok ? null : formatTestStartError(r));
              }
            });
          });
        }}
        className={primaryButtonClass}
      >
        開始驗收 · Start checkpoint
      </button>
      {err ? <p className="mt-2 text-sm text-rose-700">{err}</p> : null}
      {preset?.mode === "checkpoint" && preset?.skill?.trim() ? (
        <p className="mt-2 text-xs text-slate-500">
          題量不足時請補齊題庫，或先以 <span className="font-mono">mixed_practice</span> 做非 strict 練習（仍須帶同一 skill）。
        </p>
      ) : null}
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
  secondsPerQuestion,
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
    const p = new URLSearchParams();
    p.set("topicKey", topicKey);
    p.set("session", sessionId);
    p.set("pos", String(pos));
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      for (const key of ["mode", "skill", "moduleKey", "count"] as const) {
        const v = sp.get(key);
        if (v) {
          p.set(key, v);
        }
      }
    }
    router.push(`/test?${p.toString()}`);
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
    const ruleSlots = Math.min(10, s.totalQuestions);
    return (
      <LearningSurface className="space-y-6">
        <LearningPageCanvas className={s.passed ? "border-emerald-200/60 bg-emerald-50/50" : "border-rose-200/60 bg-rose-50/50"}>
          <h2 className="text-lg font-semibold text-slate-900">驗收結果 · Checkpoint result</h2>
          <ul className="mt-3 space-y-1 text-sm text-slate-800">
            <li>
              整體正確率 · Overall: {(s.overallAccuracy * 100).toFixed(0)}%（{s.overallCorrect} / {s.totalQuestions}）
            </li>
            <li>
              技能段（前 {ruleSlots} 題）· Skill rule slice: {(s.topicAccuracy * 100).toFixed(0)}%（{s.topicCorrect} /{" "}
              {ruleSlots}）
            </li>
            {s.targetSkillAccuracy != null && s.targetSkillTotal != null ? (
              <li>
                目標技能題庫命中 · Target skill: {(s.targetSkillAccuracy * 100).toFixed(0)}%（{s.targetSkillCorrect} /{" "}
                {s.targetSkillTotal}）
              </li>
            ) : null}
            <li>
              平均作答時間 · Avg time: {s.avgTimeTakenSec == null ? "—" : `${s.avgTimeTakenSec.toFixed(1)}s`}
            </li>
            <li>超時題數 · Timeouts: {s.timeoutCount}</li>
            <li className="font-semibold">{s.passed ? "通過 · Passed" : "未通過 · Not passed"}</li>
            {nextStep ? <li className="rounded-lg bg-white/70 px-2 py-1">下一步：{nextStep.detailZh}</li> : null}
          </ul>
          {s.hesitation ? (
            <div className="mt-4 rounded-xl border border-violet-200/80 bg-violet-50/80 px-3 py-3 text-sm text-violet-950">
              <p className="font-semibold text-violet-900">掌握訊號 · Mastery（限時題相對快慢）</p>
              <ul className="mt-2 space-y-1">
                <li>已掌握 · Fluent: {s.hesitation.summary.fluent}</li>
                <li>半掌握（答對但偏慢）· Hesitant: {s.hesitation.summary.hesitant}</li>
                <li>未掌握 · Not yet: {s.hesitation.summary.struggling}</li>
              </ul>
            </div>
          ) : null}
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
          <p className="mt-1 text-xs text-slate-500">完成後顯示解析 · Explanations after submit</p>
          <div className="mt-4 space-y-6">
            {s.perItem.map((row) => {
              const tier = s.hesitation?.items.find((h) => h.position === row.position);
              const ex = splitExplanationForFeedback(row.explanation);
              const choiceFb = buildChoiceFeedback({
                questionText: row.questionText,
                optionA: row.optionA,
                optionB: row.optionB,
                optionC: row.optionC,
                optionD: row.optionD,
                selectedChoice: row.userChoice,
                correctChoice: row.correctAnswer,
                isCorrect: row.correct && !row.timedOut,
                explanation: row.explanation,
                timedOut: row.timedOut,
              });
              const showDistractor = !row.correct || row.timedOut;
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
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-lg">{row.correct && !row.timedOut ? "✓" : "✗"}</span>
                    {tier ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          tier.tier === "fluent"
                            ? "bg-emerald-100 text-emerald-900"
                            : tier.tier === "hesitant"
                              ? "bg-amber-100 text-amber-950"
                              : "bg-rose-100 text-rose-900"
                        }`}
                      >
                        {tier.tier === "fluent"
                          ? "已掌握"
                          : tier.tier === "hesitant"
                            ? "半掌握"
                            : "未掌握"}
                      </span>
                    ) : null}
                  </div>
                  {showDistractor ? (
                    <div className="mt-3 space-y-3">
                      <ChoiceFeedbackPanel feedback={choiceFb} tone={row.timedOut ? "timeout" : "wrong"} />
                      {ex.detail.trim().length > 0 ? (
                        <CollapsibleNote summaryZh="正解解釋（完整）" summaryEn="Full explanation">
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{ex.detail}</p>
                        </CollapsibleNote>
                      ) : !row.explanation ? (
                        <p className="text-xs text-slate-500">（題庫未附解析）</p>
                      ) : null}
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
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
    <TestRunner
      label={label}
      sessionId={sessionId}
      safePos={safePos}
      total={n}
      secondsPerQuestion={secondsPerQuestion}
      question={q}
      pending={pending}
      timerActive={timerActive}
      onExpire={handleExpire}
      onChoose={handleChoice}
    />
  );
}
