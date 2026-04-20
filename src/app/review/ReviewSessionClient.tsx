"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import QuestionTimer from "@/components/training/QuestionTimer";
import AppCard from "@/components/ui/AppCard";
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
    startTransition(() => {
      void submitReviewAnswer(sessionId, safePos, choice).then((r) => {
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
    startTransition(() => {
      void submitReviewAnswer(sessionId, safePos, REVIEW_TIMEOUT_USER_CHOICE).then((r) => {
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
    startTransition(() => {
      void submitReviewRating(sessionId, safePos, rating).then((r) => {
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
      <div className="space-y-6">
        <AppCard padding="md" className="border-emerald-200 bg-emerald-50/90">
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
        </AppCard>

        {summary.soonestNext.length > 0 ? (
          <AppCard padding="md">
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

        <AppCard padding="md">
          <p className="text-sm text-slate-700">{next.hintZh}</p>
          <p className="text-xs text-slate-500">{next.hintEn}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={next.href} className={primaryButtonClass}>
              {next.titleZh} · {next.titleEn}
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
      </div>
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

  if (awaitingRating) {
    const previews = ratingPreviews;
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-violet-200/80 bg-violet-50/90 px-4 py-3 text-sm text-violet-950">
          <p className="font-semibold">複習 · FSRS · 第 {safePos + 1} / {n} 題</p>
          <p className="mt-1">請依記憶難度選擇評分（會寫回 FSRS）。</p>
        </div>

        {fsrsError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            <p className="font-semibold">FSRS 未更新</p>
            <p className="mt-1">{fsrsError}</p>
          </div>
        ) : null}

        <AppCard padding="md">
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
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-900">{q.questionText}</p>
          <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">你的答案</p>
              <p className="font-mono font-semibold">{st.userChoice ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">正解</p>
              <p className="font-mono font-semibold text-emerald-700">{q.correctAnswer}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">用時</p>
              <p className="font-semibold">{st.timeTakenSec?.toFixed(0) ?? "—"}s</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3">
            <p className="text-xs font-semibold text-primary-800">解析 · Explanation</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-primary-950">{explanationText}</p>
          </div>

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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-200/80 bg-violet-50/90 px-4 py-3 text-sm text-violet-950">
        <div>
          <p className="font-semibold">FSRS 複習</p>
          <p className="mt-1">
            第 {safePos + 1} / {n} 題 · 混合主題
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium">剩餘</span>
          <QuestionTimer
            resetKey={`${sessionId}-${safePos}`}
            totalSec={REVIEW_SECONDS_PER_QUESTION}
            active={timerActive && !pending}
            onExpire={handleExpire}
            className="rounded-xl border border-violet-300/80 bg-white px-3 py-1.5 text-base shadow-sm"
          />
        </div>
      </div>

      <AppCard padding="md">
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {q.topic}
          </span>
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            Lv {q.difficulty}
          </span>
        </div>
        <p className="mb-4 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-900">{q.questionText}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["A", "B", "C", "D"] as const).map((k) => (
            <button
              key={k}
              type="button"
              disabled={pending || st.phase === "answered" || st.phase === "rated"}
              onClick={() => handleChoice(k)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-sm text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-40"
            >
              <span className="font-semibold text-primary-700">{k}.</span>{" "}
              {k === "A" ? q.optionA : k === "B" ? q.optionB : k === "C" ? q.optionC : q.optionD}
            </button>
          ))}
        </div>
        {pending ? <p className="mt-3 text-xs text-slate-500">處理中…</p> : null}
      </AppCard>
    </div>
  );
}
