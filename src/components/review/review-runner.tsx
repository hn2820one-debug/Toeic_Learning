"use client";

import SessionHeader from "@/components/session/SessionHeader";
import AppCard from "@/components/ui/AppCard";
import { LearningSurface } from "@/components/ui/learning-surface";
import SectionLabel from "@/components/ui/section-label";
import type { ReviewQuestionPayload, ReviewRatingPreviewMap } from "@/lib/review/review-types";
import {
  REVIEW_SECONDS_PER_QUESTION,
  type ReviewItemStateJson,
  type ReviewRatingName,
} from "@/lib/review-mode";

import ReviewFeedbackCard from "./review-feedback-card";
import ReviewRatingButtons from "./review-rating-buttons";

export type ReviewRunnerProps = {
  sessionId: string;
  safePos: number;
  n: number;
  q: ReviewQuestionPayload;
  st: ReviewItemStateJson;
  pending: boolean;
  timerActive: boolean;
  fsrsError: string | null;
  ratingPreviews: ReviewRatingPreviewMap | null | undefined;
  onChoice: (choice: string) => void;
  onExpire: () => void;
  onRating: (rating: ReviewRatingName) => void;
};

export default function ReviewRunner({
  sessionId,
  safePos,
  n,
  q,
  st,
  pending,
  timerActive,
  fsrsError,
  ratingPreviews,
  onChoice,
  onExpire,
  onRating,
}: ReviewRunnerProps) {
  const awaitingRating = st.phase === "answered" && st.rating == null;

  if (awaitingRating) {
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
          <div className="space-y-4">
            <ReviewFeedbackCard q={q} st={st} />
            <ReviewRatingButtons pending={pending} previews={ratingPreviews} onRating={onRating} />
          </div>
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
            onExpire: onExpire,
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
                  onClick={() => onChoice(k)}
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
