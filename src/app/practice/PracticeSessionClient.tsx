"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import PracticeRunner from "@/components/practice/practice-runner";
import PredictionPreferenceToggle, { usePredictionPreference } from "@/components/practice/PredictionPreferenceToggle";
import AppCard from "@/components/ui/AppCard";
import { LearningPageCanvas, LearningSurface } from "@/components/ui/learning-surface";
import type { PracticeRuntimeMeta } from "@/lib/practice/practice-runtime-types";
import type { PracticeCompletedSummary, PracticeQuestionPayload } from "@/lib/practice/practice-page-loader";
import { practiceEntryHref } from "@/lib/practice/practice-entry-query";
import { parsePracticeItemState } from "@/lib/practice/practice-state";
import type { CompletionNextStep } from "@/lib/session-summary";
import { primaryButtonClass } from "@/lib/ui/form-classes";

import {
  completePracticeSession,
  revealPracticeHint,
  startPracticeSession,
  submitPracticeAnswer,
  type PracticeActionResult,
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
  practiceRuntime: PracticeRuntimeMeta | null;
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
  practiceRuntime,
  completedSummary,
  nextStep,
}: PracticeSessionClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [localReveal, setLocalReveal] = useState<string | null>(null);
  const [predictionPref] = usePredictionPreference();
  const [predictionGateDone, setPredictionGateDone] = useState(false);

  const n = questions.length;
  const safePos = n === 0 ? 0 : Math.min(Math.max(0, initialPos), n - 1);
  const q = questions[safePos];
  const states = useMemo(
    () => itemStatesJson.map((raw) => parsePracticeItemState(raw)),
    [itemStatesJson],
  );
  const st = states[safePos] ?? parsePracticeItemState(null);

  const markPredictionDone = () => {
    try {
      sessionStorage.setItem(`toeic:practicePred:${sessionId}:${safePos}`, "1");
    } catch {
      /* ignore */
    }
    setPredictionGateDone(true);
  };

  useEffect(() => {
    setPredictionGateDone(false);
    try {
      if (sessionStorage.getItem(`toeic:practicePred:${sessionId}:${safePos}`) === "1") {
        setPredictionGateDone(true);
      }
    } catch {
      /* ignore */
    }
  }, [sessionId, safePos]);

  const go = (pos: number) => {
    router.push(
      `/practice?topicKey=${encodeURIComponent(topicKey)}&session=${encodeURIComponent(sessionId)}&pos=${pos}`,
    );
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

  const againHref = practiceEntryHref(topicKey, practiceRuntime);

  if (status === "completed" && completedSummary) {
    return (
      <LearningSurface className="space-y-6">
        <LearningPageCanvas className="border-emerald-200/50 bg-emerald-50/60">
          <h2 className="text-lg font-semibold text-emerald-950">練習結果 · Practice result</h2>
          <ul className="mt-3 space-y-1 text-sm text-emerald-900">
            <li>原始正答率（首答）· Raw: {(completedSummary.rawCorrectRate * 100).toFixed(0)}%</li>
            <li>無提示首答正確率 · No-hint first-try: {(completedSummary.noHintCorrectRate * 100).toFixed(0)}%</li>
            <li>有效準確度 · Effective: {(completedSummary.effectiveAccuracy * 100).toFixed(0)}%</li>
            <li>提示使用次數 · Hints used: {completedSummary.totalHintsUsed}</li>
            <li>提示折損（顯示上限）· Hint penalty (capped display): {(completedSummary.hintPenalty * 100).toFixed(0)}%</li>
            <li className="font-semibold">
              {completedSummary.passed ? "通過 · Passed" : "未達標 · Not passed"}
            </li>
            {nextStep ? (
              <li className="rounded-lg bg-white/70 px-2 py-1 text-emerald-950">
                下一步建議：{nextStep.detailZh}
              </li>
            ) : null}
          </ul>
          {completedSummary.hesitation ? (
            <div className="mt-4 rounded-xl border border-violet-200/80 bg-violet-50/80 px-3 py-3 text-sm text-violet-950">
              <p className="font-semibold text-violet-900">掌握訊號 · Mastery（非只有對／錯）</p>
              <ul className="mt-2 space-y-1">
                <li>
                  已掌握（快而準）· Fluent: {completedSummary.hesitation.summary.fluent}
                </li>
                <li>
                  半掌握（答對但未熟：慢／提示／重試）· Hesitant:{" "}
                  {completedSummary.hesitation.summary.hesitant}
                </li>
                <li>
                  未掌握（錯／未解出）· Not yet: {completedSummary.hesitation.summary.struggling}
                </li>
              </ul>
              <p className="mt-2 text-xs text-violet-800/90">
                半掌握題會列入熱身與練習補強候選，但不等同錯題。
              </p>
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={nextStep?.href ?? `/test?topicKey=${encodeURIComponent(topicKey)}`}
              className={primaryButtonClass}
            >
              {nextStep?.ctaLabelZh ?? "前往驗收"} · Next step
            </Link>
            <Link
              href={againHref}
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
        </LearningPageCanvas>
      </LearningSurface>
    );
  }

  if (status !== "active" || !q) {
    return (
      <AppCard>
        <p className="text-slate-700">此場次已結束或無效。請重新開始。</p>
        <Link href={againHref} className="mt-3 inline-block text-primary-700">
          返回 · Back
        </Link>
      </AppCard>
    );
  }

  return (
    <PracticeRunner
      label={label}
      practiceRuntime={practiceRuntime}
      questions={questions}
      safePos={safePos}
      st={st}
      states={states}
      pending={pending}
      predictionPref={predictionPref}
      predictionGateDone={predictionGateDone}
      markPredictionDone={markPredictionDone}
      localReveal={localReveal}
      onHint={onHint}
      onSubmit={onSubmit}
      go={go}
      onFinish={onFinish}
    />
  );
}

export type PracticeStartPreset = {
  mode?: string;
  skill?: string;
  moduleKey?: string;
  count?: number;
  /** Resolved target length for button copy */
  targetQuestionCount: number;
  isGuided: boolean;
};

function formatPracticeStartError(r: Extract<PracticeActionResult, { ok: false }>): string {
  if (r.error === "insufficient_questions" && r.detail && typeof r.detail === "object") {
    const d = r.detail as {
      requestedCount?: number;
      actualCount?: number;
      skillCode?: string;
      hintZh?: string;
    };
    return `${d.hintZh ?? "題量不足以完成本場 strict 練習"}（已選 ${d.actualCount ?? 0} / 目標 ${d.requestedCount ?? "?"}；skill=${d.skillCode ?? "—"}）`;
  }
  if (r.error === "skill_required" && r.detail && typeof r.detail === "object") {
    const d = r.detail as { hintZh?: string };
    return d.hintZh ?? "必須帶入 skill（primaryLearningSkillCode）。";
  }
  return r.error;
}

export function PracticeStartClient({
  topicKey,
  preset,
  disabled,
}: {
  topicKey: string;
  preset?: PracticeStartPreset;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const guided = preset?.isGuided === true;
  const n = preset?.targetQuestionCount ?? 10;

  return (
    <div>
      <button
        type="button"
        disabled={pending || disabled}
        onClick={() => {
          setErr(null);
          startTransition(() => {
            void startPracticeSession(topicKey, {
              mode: preset?.mode,
              skill: preset?.skill,
              moduleKey: preset?.moduleKey,
              count: preset?.count,
            }).then((r) => {
              if (r.ok && r.sessionId) {
                router.push(
                  `/practice?topicKey=${encodeURIComponent(topicKey)}&session=${encodeURIComponent(r.sessionId)}&pos=0`,
                );
              } else {
                setErr(r.ok ? null : formatPracticeStartError(r));
              }
            });
          });
        }}
        className={primaryButtonClass}
      >
        {guided
          ? `開始引導練習（約 ${n} 題）· Start guided`
          : `開始練習（10 題為目標）· Start practice`}
      </button>
      {err ? <p className="mt-2 text-sm text-rose-700">{err}</p> : null}
      {guided && preset?.skill?.trim() ? (
        <p className="mt-2 text-xs text-slate-500">
          題量不足時可改試{" "}
          <span className="font-mono">mixed_practice</span>（仍須帶同一 skill，系統才會放寬非 strict 補題）。
        </p>
      ) : null}
    </div>
  );
}
