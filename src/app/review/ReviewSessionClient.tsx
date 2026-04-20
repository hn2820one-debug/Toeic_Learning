"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import ChoiceFeedbackPanel from "@/components/session/ChoiceFeedbackPanel";
import SessionHeader from "@/components/session/SessionHeader";
import AppCard from "@/components/ui/AppCard";
import CollapsibleNote from "@/components/ui/collapsible-note";
import { LearningPageCanvas, LearningSurface } from "@/components/ui/learning-surface";
import SectionLabel from "@/components/ui/section-label";
import { buildChoiceFeedback } from "@/lib/choice-feedback";
import { splitExplanationForFeedback } from "@/lib/explanation-split";
import type { CompletionNextStep } from "@/lib/session-summary";
import type { RatingPreviewMap, ReviewQuestionPayload } from "@/lib/review-page-loader";
import {
  explanationFallbackCopy,
  getNextReviewAction,
  getRatingStats,
  parseReviewItemState,
  REVIEW_SECONDS_PER_QUESTION,
  REVIEW_TIMEOUT_USER_CHOICE,
  type ReviewQueueSummary,
  type ReviewRatingName,
} from "@/lib/review-mode";
import { primaryButtonClass } from "@/lib/ui/form-classes";

import { markReviewQuestionShown, startReviewSession, submitReviewAnswer, submitReviewRating } from "./actions";

const RATING_UI: Record<
  ReviewRatingName,
  { zh: string; ring: string }
> = {
  Again: { zh: "重來 · Again", ring: "hover:border-rose-400 hover:bg-rose-50" },
  Hard: { zh: "困難 · Hard", ring: "hover:border-amber-400 hover:bg-amber-50" },
  Good: { zh: "通過 · Good", ring: "hover:border-primary-400 hover:bg-primary-50" },
  Easy: { zh: "輕鬆 · Easy", ring: "hover:border-emerald-400 hover:bg-emerald-50" },
};

type ReviewSessionClientProps = {
  sessionId: string;
  status: "active" | "completed" | "abandoned";
  questions: ReviewQuestionPayload[];
  initialPos: number;
  itemStatesJson: unknown[];
  ratingPreviews?: RatingPreviewMap | null;
  summary?: ReviewQueueSummary;
  queueStatsAfter?: { dueCount: number; newCount: number; learningCount: number };
  nextStep?: CompletionNextStep;
};

export function ReviewStartClient() {
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
            void startReviewSession().then((r) => {
              if (r.ok && r.sessionId) {
                router.push(`/review?session=${encodeURIComponent(r.sessionId)}&pos=0`);
              } else {
                setErr(r.ok ? null : r.error ?? "failed");
              }
            });
          });
        }}
        className={primaryButtonClass}
      >
        開始複習（FSRS 隊列）· Start review
      </button>
      {err ? <p className="mt-2 text-sm text-rose-700">{err}</p> : null}
    </div>
  );
}

export default function ReviewSessionClient({
  sessionId,
  status,
  questions,
  initialPos,
  itemStatesJson,
  ratingPreviews,
  summary,
  queueStatsAfter,
  nextStep,
}: ReviewSessionClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [timerActive, setTimerActive] = useState(true);
  const [fsrsError, setFsrsError] = useState<string | null>(null);
  const processingRef = useRef(false);

  const n = questions.length;
  const safePos = n === 0 ? 0 : Math.min(Math.max(0, initialPos), n - 1);
  const q = questions[safePos];
  const states = itemStatesJson.map((raw) => parseReviewItemState(raw));
  const st = states[safePos] ?? parseReviewItemState(null);

  useEffect(() => {
    if (status !== "active") {
      return;
    }
    processingRef.current = false;
    setTimerActive(true);
    setFsrsError(null);
    void markReviewQuestionShown(sessionId, safePos);
  }, [sessionId, safePos, status]);

  const handleChoice = (choice: string) => {
    if (status !== "active" || st.phase === "answered" || st.phase === "rated" || processingRef.current) {
      return;
    }
    processingRef.current = true;
    setTimerActive(false);
    const submitKey = `${sessionId}-${safePos}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    startTransition(() => {
      void submitReviewAnswer(sessionId, safePos, choice, submitKey).then((r) => {
        processingRef.current = false;
        if (!r.ok) {
          return;
        }
        router.refresh();
      });
    });
  };

  const handleExpire = () => {
    if (status !== "active" || st.phase === "answered" || st.phase === "rated" || processingRef.current) {
      return;
    }
    processingRef.current = true;
    setTimerActive(false);
    const submitKey = `${sessionId}-${safePos}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    startTransition(() => {
      void submitReviewAnswer(sessionId, safePos, REVIEW_TIMEOUT_USER_CHOICE, submitKey).then((r) => {
        processingRef.current = false;
        if (!r.ok) {
          return;
        }
        router.refresh();
      });
    });
  };

  const handleRating = (rating: ReviewRatingName) => {
    if (st.phase !== "answered" || st.rating != null || processingRef.current) {
      return;
    }
    processingRef.current = true;
    setFsrsError(null);
    const submitKey = `${sessionId}-${safePos}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    startTransition(() => {
      void submitReviewRating(sessionId, safePos, rating, submitKey).then((r) => {
        processingRef.current = false;
        if (!r.ok) {
          if (r.error === "fsrs_apply_failed" || r.error === "persist_failed") {
            setFsrsError(r.detail ?? "更新失敗，請重試。");
          }
          return;
        }
        if (r.sessionCompleted) {
          router.refresh();
        } else {
          router.push(`/review?session=${encodeURIComponent(sessionId)}&pos=${safePos + 1}`);
          router.refresh();
        }
      });
    });
  };

  if (status === "completed" && summary) {
    const next = getNextReviewAction({ remainingDueApprox: queueStatsAfter?.dueCount ?? 0 });
    const stats = getRatingStats(summary);
    return (
      <LearningSurface className="space-y-6">
        <LearningPageCanvas className="border-emerald-200/50 bg-emerald-50/50">
          <h2 className="text-lg font-semibold text-emerald-950">複習完成 · Review done</h2>
          <ul className="mt-3 space-y-1 text-sm text-emerald-900">
            <li>
              完成題數 · Items: {summary.totalItems} · 答對 · Correct: {summary.correctCount}
            </li>
            <li>
              Again {summary.ratingCounts.Again} · Hard {summary.ratingCounts.Hard} · Good {summary.ratingCounts.Good} · Easy{" "}
              {summary.ratingCounts.Easy}
            </li>
            <li className="text-xs">Again 占比 · Again rate: {(stats.againRate * 100).toFixed(0)}%</li>
            {queueStatsAfter ? (
              <li className="text-xs text-emerald-800/90">
                目前 FSRS 佇列（約）· Queue: due {queueStatsAfter.dueCount} · new {queueStatsAfter.newCount} · learning{" "}
                {queueStatsAfter.learningCount}
              </li>
            ) : null}
          </ul>
        </LearningPageCanvas>

        {summary.soonestNext.length > 0 ? (
          <AppCard padding="md" className="border-slate-200/80 bg-white/90">
            <h3 className="text-base font-semibold text-slate-900">較快再次出現 · Soonest next</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {summary.soonestNext.map((row) => (
                <li key={row.questionId}>
                  Q#{row.questionId}
                  {row.topic ? ` · ${row.topic}` : ""} → {new Date(row.nextDueAt).toLocaleString()}
                </li>
              ))}
            </ul>
          </AppCard>
        ) : null}

        <AppCard padding="md" className="border-slate-200/80 bg-white/90">
          <p className="text-sm leading-relaxed text-slate-700">{nextStep?.detailZh ?? next.hintZh}</p>
          <p className="text-xs text-slate-500">{next.hintEn}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={nextStep?.href ?? next.href} className={primaryButtonClass}>
              {nextStep?.ctaLabelZh ?? `${next.titleZh} · ${next.titleEn}`}
            </Link>
            <Link
              href="/learn"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              今日學習 · /learn
            </Link>
            <Link
              href="/review"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              再開複習 · Review again
            </Link>
          </div>
        </AppCard>
      </LearningSurface>
    );
  }

  if (status === "abandoned") {
    return (
      <AppCard>
        <p className="text-slate-700">此場次已結束。</p>
        <ReviewStartClient />
      </AppCard>
    );
  }

  if (status !== "active" || !q) {
    return (
      <AppCard>
        <p className="text-slate-700">無效場次。</p>
        <Link href="/review" className="mt-3 inline-block text-primary-700">
          返回 · Back
        </Link>
      </AppCard>
    );
  }

  const awaitingRating = st.phase === "answered" && st.rating == null;
  const explanationText =
    (q.explanation && q.explanation.trim().length > 0 ? q.explanation : null) ?? explanationFallbackCopy();
  const ratingExpl = splitExplanationForFeedback(explanationText);
  const choiceFeedbackReview = useMemo(() => {
    if (!awaitingRating) return null;
    const timedOut = Boolean(st.timedOut) || st.userChoice === REVIEW_TIMEOUT_USER_CHOICE;
    return buildChoiceFeedback({
      questionText: q.questionText,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      selectedChoice: st.userChoice ?? "—",
      correctChoice: q.correctAnswer,
      isCorrect: Boolean(st.correct) && !timedOut,
      explanation: explanationText,
      timedOut,
    });
  }, [awaitingRating, q, st.correct, st.timedOut, st.userChoice, explanationText]);

  if (awaitingRating) {
    const previews = ratingPreviews;
    return (
      <div className="space-y-6">
        <LearningSurface>
          <SessionHeader
            mode="review"
            current={safePos + 1}
            total={n}
            titleZh="FSRS 複習"
            subtitleZh="請依記憶難度選擇評分（會寫回 FSRS）"
            topicOrModuleLabel="已作答，等待評分"
          />
        </LearningSurface>

        {fsrsError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            <p className="font-semibold">FSRS 未更新</p>
            <p className="mt-1">{fsrsError}</p>
          </div>
        ) : null}

        <LearningSurface>
        <AppCard padding="md" className="border-slate-200/80 bg-white/90">
          <div className="mb-4 flex flex-wrap gap-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                st.correct
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
              }`}
            >
              {st.correct ? "✓ 正確" : "✗ 錯誤"}
              {st.timedOut ? " · TIMEOUT" : ""}
            </span>
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {q.topic}
            </span>
          </div>
          <div className="space-y-2">
            <SectionLabel kind="stem" />
            <p className="max-w-prose whitespace-pre-wrap text-[15px] leading-relaxed text-slate-900">{q.questionText}</p>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-xs text-slate-500">
              用時 · Time: <span className="font-semibold text-slate-800">{st.timeTakenSec?.toFixed(0) ?? "—"}s</span>
            </span>
          </div>
          {choiceFeedbackReview ? (
            <div className="mt-4">
              <ChoiceFeedbackPanel
                feedback={choiceFeedbackReview}
                tone={
                  st.timedOut || st.userChoice === REVIEW_TIMEOUT_USER_CHOICE
                    ? "timeout"
                    : st.correct
                      ? "correct"
                      : "wrong"
                }
              />
            </div>
          ) : null}
          {ratingExpl.detail.trim().length > 0 ? (
            <CollapsibleNote summaryZh="正解解釋（完整）" summaryEn="Full explanation" className="mt-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{ratingExpl.detail}</p>
            </CollapsibleNote>
          ) : !ratingExpl.summary && explanationText ? (
            <CollapsibleNote summaryZh="解析 · Explanation" summaryEn="Why" className="mt-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{explanationText}</p>
            </CollapsibleNote>
          ) : null}

          <p className="mt-6 text-base font-semibold text-slate-900">這題對你來說有多難？</p>
          <div className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {(["Again", "Hard", "Good", "Easy"] as const).map((rating) => (
              <button
                key={rating}
                type="button"
                disabled={pending}
                onClick={() => handleRating(rating)}
                className={`rounded-xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition-colors disabled:opacity-50 ${RATING_UI[rating].ring}`}
              >
                <span className="block text-sm font-semibold text-slate-900">{RATING_UI[rating].zh}</span>
                <span className="mt-1 block text-xs text-slate-500">
                  下次複習：{previews?.[rating]?.label ?? "—"}
                </span>
              </button>
            ))}
          </div>
        </AppCard>
        </LearningSurface>
      </div>
    );
  }

  if (st.phase === "rated") {
    return (
      <AppCard>
        <p className="text-slate-700">正在前往下一題…</p>
      </AppCard>
    );
  }

  return (
    <div className="space-y-6">
      <LearningSurface>
        <SessionHeader
          mode="review"
          current={safePos + 1}
          total={n}
          titleZh="FSRS 複習"
          subtitleZh="混合主題"
          topicOrModuleLabel={q.topic}
          timer={{
            active: timerActive && !pending,
            totalSec: REVIEW_SECONDS_PER_QUESTION,
            resetKey: `${sessionId}-${safePos}`,
            onExpire: handleExpire,
            tone: "violet",
          }}
        />
      </LearningSurface>

      <LearningSurface>
        <AppCard padding="md" className="border-slate-200/80 bg-white/90">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {q.topic}
            </span>
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              Lv {q.difficulty}
            </span>
            <SectionLabel kind="timer" />
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
                  disabled={pending || st.phase === "answered" || st.phase === "rated"}
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
