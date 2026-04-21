"use client";

import ChoiceFeedbackPanel from "@/components/session/ChoiceFeedbackPanel";
import SessionHeader from "@/components/session/SessionHeader";
import AppCard from "@/components/ui/AppCard";
import CollapsibleNote from "@/components/ui/collapsible-note";
import { LearningSurface } from "@/components/ui/learning-surface";
import PredictionPreferenceToggle from "@/components/practice/PredictionPreferenceToggle";
import PredictionStep from "@/components/practice/PredictionStep";
import SectionLabel from "@/components/ui/section-label";
import type { PracticeQuestionPayload } from "@/lib/practice/practice-page-loader";
import type { PracticeRuntimeMeta } from "@/lib/practice/practice-runtime-types";
import type { PracticeItemState } from "@/lib/practice/practice-state";
import { buildChoiceFeedback } from "@/lib/choice-feedback";
import { splitExplanationForFeedback } from "@/lib/explanation-split";
import { primaryButtonClass } from "@/lib/ui/form-classes";

import HintPanel from "./hint-panel";

export type PracticeRunnerProps = {
  label: string;
  practiceRuntime: PracticeRuntimeMeta | null;
  questions: PracticeQuestionPayload[];
  safePos: number;
  st: PracticeItemState;
  states: PracticeItemState[];
  pending: boolean;
  predictionPref: boolean;
  predictionGateDone: boolean;
  markPredictionDone: () => void;
  localReveal: string | null;
  onHint: (layer: 1 | 2 | 3) => void;
  onSubmit: (choice: string) => void;
  go: (pos: number) => void;
  onFinish: () => void;
};

export default function PracticeRunner({
  label,
  practiceRuntime,
  questions,
  safePos,
  st,
  states,
  pending,
  predictionPref,
  predictionGateDone,
  markPredictionDone,
  localReveal,
  onHint,
  onSubmit,
  go,
  onFinish,
}: PracticeRunnerProps) {
  const n = questions.length;
  const q = questions[safePos]!;
  const isLast = n > 0 && safePos === n - 1;
  const hintsDisabledOnLast = isLast && practiceRuntime?.dualAxis !== true;
  const showPredictionStep = predictionPref && st.status === "open" && q.prediction != null && !predictionGateDone;

  const lastAttempt = st.attempts.length > 0 ? st.attempts[st.attempts.length - 1]! : null;
  const expl = splitExplanationForFeedback(q.explanation);
  const choiceFeedback =
    lastAttempt != null
      ? buildChoiceFeedback({
          questionText: q.questionText,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          selectedChoice: lastAttempt.choice,
          correctChoice: q.correctAnswer,
          isCorrect: lastAttempt.correct === true,
          explanation: q.explanation,
        })
      : null;

  const allResolved = n > 0 && states.every((s) => s.status === "solved" || s.status === "revealed");
  const canRetry = st.status === "open" && lastAttempt && !lastAttempt.correct && st.attempts.length < 3;

  return (
    <div className="space-y-6">
      <LearningSurface>
        <SessionHeader
          mode="practice"
          current={safePos + 1}
          total={n}
          titleZh={label}
          subtitleZh={`已用提示層數 ${st.maxHintLayerSeen} · 本題嘗試 ${st.attempts.length} / 3`}
          topicOrModuleLabel={practiceRuntime?.dualAxis ? "引導練習 · Guided" : "腳手架練習"}
        />
        <div className="mt-2 flex justify-end">
          <PredictionPreferenceToggle />
        </div>
      </LearningSurface>

      <LearningSurface>
        <AppCard padding="md" className="border-slate-200/80 bg-white/90">
          <div className="space-y-3">
            {q.reinforceBannerZh ? (
              <p className="rounded-lg border border-emerald-200/70 bg-emerald-50/55 px-3 py-2 text-sm font-medium text-emerald-950">
                {q.reinforceBannerZh}
              </p>
            ) : null}
            <SectionLabel kind="stem" />
            <p className="max-w-prose whitespace-pre-wrap text-[15px] leading-relaxed text-slate-900">{q.questionText}</p>
          </div>

          {showPredictionStep && q.prediction ? (
            <div className="mt-5">
              <PredictionStep
                payload={q.prediction}
                onContinue={markPredictionDone}
                compactHintZh="先諗，唔使即刻答選項。"
              />
            </div>
          ) : null}

          {!showPredictionStep ? (
            <div className="mt-6 space-y-3">
              <SectionLabel kind="options" />
              <div className="grid gap-2 sm:grid-cols-2">
                {(["A", "B", "C", "D"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    disabled={st.status !== "open" || pending}
                    onClick={() => onSubmit(k)}
                    className="rounded-xl border border-slate-200/90 bg-slate-50/50 px-3 py-3 text-left text-sm leading-relaxed text-slate-800 shadow-sm hover:bg-white disabled:opacity-40"
                  >
                    <span className="font-semibold text-primary-700">{k}.</span>{" "}
                    {k === "A" ? q.optionA : k === "B" ? q.optionB : k === "C" ? q.optionC : q.optionD}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {choiceFeedback && st.status === "open" && lastAttempt && !lastAttempt.correct ? (
            <div className="mt-6">
              <ChoiceFeedbackPanel feedback={choiceFeedback} tone="wrong" />
            </div>
          ) : null}

          {choiceFeedback && st.status === "open" && lastAttempt?.correct === true ? (
            <p className="mt-4 text-sm font-medium text-emerald-800">答得好，繼續保持思路清晰。</p>
          ) : null}

          {canRetry ? (
            <p className="mt-3 text-sm text-slate-600">
              再試一次：可重選選項（尚餘 {3 - st.attempts.length} 次嘗試）。
            </p>
          ) : null}

          {!hintsDisabledOnLast && st.status === "open" && !showPredictionStep ? (
            <HintPanel
              maxHintLayerSeen={st.maxHintLayerSeen}
              onReveal={onHint}
              disabled={false}
              pending={pending}
              hints={{ level1: q.hints.level1, level2: q.hints.level2, level3: q.hints.level3 }}
            />
          ) : hintsDisabledOnLast && !showPredictionStep ? (
            <p className="mt-6 text-xs font-medium text-slate-500">最後一題：不提供提示層（預熱）。</p>
          ) : null}

          {st.status !== "open" ? (
            <div className="mt-6 space-y-4 rounded-2xl border border-sky-100/90 bg-sky-50/35 p-4">
              <SectionLabel kind="feedback" />
              <div className="rounded-lg border border-white/80 bg-white/70 px-3 py-2">
                <p className="text-xs text-slate-500">首答 · First try</p>
                <p className="text-sm font-semibold text-slate-800">
                  {lastAttempt?.correct === true ? "✓" : lastAttempt?.correct === false ? "✗" : "—"}
                </p>
              </div>
              {choiceFeedback ? (
                <ChoiceFeedbackPanel
                  feedback={choiceFeedback}
                  tone={lastAttempt?.correct === true ? "correct" : "wrong"}
                />
              ) : null}
              {expl.detail.trim().length > 0 ? (
                <CollapsibleNote summaryZh="進一步說明" summaryEn="More detail">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{expl.detail}</p>
                </CollapsibleNote>
              ) : null}
              {localReveal ? (
                <CollapsibleNote summaryZh="補充解析" summaryEn="Extra" tone="default">
                  <p className="whitespace-pre-wrap text-sm text-slate-800">{localReveal}</p>
                </CollapsibleNote>
              ) : null}
            </div>
          ) : null}

          {st.status !== "open" ? (
            <div className="mt-6 flex flex-wrap gap-3">
              {!isLast ? (
                <button type="button" disabled={pending} onClick={() => go(safePos + 1)} className={primaryButtonClass}>
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
      </LearningSurface>
    </div>
  );
}
