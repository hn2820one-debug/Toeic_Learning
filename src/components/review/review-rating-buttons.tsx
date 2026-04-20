"use client";

import type { ReviewRatingPreviewMap } from "@/lib/review/review-types";
import type { ReviewRatingName } from "@/lib/review-mode";

const RATING_UI: Record<
  ReviewRatingName,
  { zh: string; ring: string }
> = {
  Again: { zh: "重來 · Again", ring: "hover:border-rose-400 hover:bg-rose-50" },
  Hard: { zh: "困難 · Hard", ring: "hover:border-amber-400 hover:bg-amber-50" },
  Good: { zh: "通過 · Good", ring: "hover:border-primary-400 hover:bg-primary-50" },
  Easy: { zh: "輕鬆 · Easy", ring: "hover:border-emerald-400 hover:bg-emerald-50" },
};

type ReviewRatingButtonsProps = {
  pending: boolean;
  previews: ReviewRatingPreviewMap | null | undefined;
  onRating: (rating: ReviewRatingName) => void;
};

export default function ReviewRatingButtons({ pending, previews, onRating }: ReviewRatingButtonsProps) {
  return (
    <>
      <p className="mt-6 text-base font-semibold text-slate-900">這題對你來說有多難？</p>
      <div className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {(["Again", "Hard", "Good", "Easy"] as const).map((rating) => (
          <button
            key={rating}
            type="button"
            disabled={pending}
            onClick={() => onRating(rating)}
            className={`rounded-xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition-colors disabled:opacity-50 ${RATING_UI[rating].ring}`}
          >
            <span className="block text-sm font-semibold text-slate-900">{RATING_UI[rating].zh}</span>
            <span className="mt-1 block text-xs text-slate-500">
              下次複習：{previews?.[rating]?.label ?? "—"}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
