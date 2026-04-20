"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import ReviewRunner from "@/components/review/review-runner";
import AppCard from "@/components/ui/AppCard";
import { LearningPageCanvas, LearningSurface } from "@/components/ui/learning-surface";
import type { CompletionNextStep } from "@/lib/session-summary";
import type { ReviewQuestionPayload, ReviewRatingPreviewMap } from "@/lib/review/review-types";
import {
  getNextReviewAction,
  getRatingStats,
  parseReviewItemState,
  REVIEW_TIMEOUT_USER_CHOICE,
  type ReviewQueueSummary,
  type ReviewRatingName,
} from "@/lib/review-mode";
import { primaryButtonClass } from "@/lib/ui/form-classes";

import { markReviewQuestionShown, startReviewSession, submitReviewAnswer, submitReviewRating } from "./actions";

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

type ReviewSessionClientProps = {
  sessionId: string;
  status: "active" | "completed" | "abandoned";
  questions: ReviewQuestionPayload[];
  initialPos: number;
  itemStatesJson: unknown[];
  ratingPreviews?: ReviewRatingPreviewMap | null;
  summary?: ReviewQueueSummary;
  queueStatsAfter?: { dueCount: number; newCount: number; learningCount: number };
  nextStep?: CompletionNextStep;
};

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
    const acc =
      summary.totalItems === 0 ? 0 : Math.round((summary.correctCount / summary.totalItems) * 1000) / 10;
    return (
      <LearningSurface className="space-y-6">
        <LearningPageCanvas className="border-emerald-200/50 bg-emerald-50/50">
          <h2 className="text-lg font-semibold text-emerald-950">複習完成 · Review done</h2>
          <ul className="mt-3 space-y-1 text-sm text-emerald-900">
            <li>
              今日完成題數 · Items: {summary.totalItems} · 答對 · Correct: {summary.correctCount} · 正確率 · Accuracy:{" "}
              {acc}%
            </li>
            <li>
              Again {summary.ratingCounts.Again} · Hard {summary.ratingCounts.Hard} · Good {summary.ratingCounts.Good} · Easy{" "}
              {summary.ratingCounts.Easy}
            </li>
            <li className="text-xs">Again 占比 · Again rate: {(stats.againRate * 100).toFixed(0)}%</li>
            {summary.avgTimeTakenSec != null ? (
              <li className="text-xs">
                平均用時 · Avg time: {summary.avgTimeTakenSec.toFixed(1)}s
              </li>
            ) : null}
            {queueStatsAfter ? (
              <li className="text-xs text-emerald-800/90">
                下一批 FSRS 佇列（約）· Queue: due {queueStatsAfter.dueCount} · new {queueStatsAfter.newCount} · learning{" "}
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

  return (
    <ReviewRunner
      sessionId={sessionId}
      safePos={safePos}
      n={n}
      q={q}
      st={st}
      pending={pending}
      timerActive={timerActive}
      fsrsError={fsrsError}
      ratingPreviews={ratingPreviews}
      onChoice={handleChoice}
      onExpire={handleExpire}
      onRating={handleRating}
    />
  );
}
