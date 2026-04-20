import type { ReviewRatingName } from "@/lib/review-mode";

/** Server-fetched question row for `/review` UI (no secrets). */
export type ReviewQuestionPayload = {
  id: number;
  position: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string | null;
  topic: string;
  topicKey: string | null;
  difficulty: string;
};

/** Interval button labels from `previewIntervals()` — safe on client. */
export type ReviewRatingPreviewMap = Record<ReviewRatingName, { label: string }>;
