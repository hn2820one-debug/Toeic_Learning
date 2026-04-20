import { buildChoiceFeedback, type ChoiceFeedback } from "@/lib/choice-feedback";
import { splitExplanationForFeedback } from "@/lib/explanation-split";
import {
  explanationFallbackCopy,
  REVIEW_TIMEOUT_USER_CHOICE,
  type ReviewItemStateJson,
} from "@/lib/review-mode";

/** Minimal question shape for feedback (matches `ReviewQuestionPayload` fields used here). */
export type ReviewFeedbackQuestion = {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string | null;
};

export type ReviewFeedbackTone = "correct" | "wrong" | "timeout";

export type ReviewFeedbackViewModel = {
  feedback: ChoiceFeedback;
  tone: ReviewFeedbackTone;
  explanationFull: string;
  ratingExpl: ReturnType<typeof splitExplanationForFeedback>;
};

/**
 * Pure helper: builds the same feedback payload the review UI uses after submit.
 * Server `submitReviewAnswer` may return slightly different explanation string (notes fallback);
 * pass `explanationOverride` when you need parity with the action response.
 */
export function showReviewFeedback(params: {
  q: ReviewFeedbackQuestion;
  st: ReviewItemStateJson;
  explanationOverride?: string | null;
}): ReviewFeedbackViewModel {
  const { q, st } = params;
  const timedOut = Boolean(st.timedOut) || st.userChoice === REVIEW_TIMEOUT_USER_CHOICE;
  const explanationText =
    params.explanationOverride !== undefined
      ? (params.explanationOverride?.trim().length
          ? params.explanationOverride
          : explanationFallbackCopy())
      : (q.explanation && q.explanation.trim().length > 0 ? q.explanation : null) ??
        explanationFallbackCopy();

  const feedback = buildChoiceFeedback({
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

  const tone: ReviewFeedbackTone = timedOut ? "timeout" : st.correct ? "correct" : "wrong";

  return {
    feedback,
    tone,
    explanationFull: explanationText,
    ratingExpl: splitExplanationForFeedback(explanationText),
  };
}
