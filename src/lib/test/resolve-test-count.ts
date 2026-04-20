/** Default checkpoint length — keep in sync with `test-mode` `TEST_QUESTION_COUNT`. */
export const DEFAULT_CHECKPOINT_QUESTION_COUNT = 15;

const MAX_TEST_QUESTIONS = 20;

/** Checkpoint default 15; `count` query overrides, capped 1–20. */
export function resolveTestQuestionCount(mode: string | undefined, countParam: number | undefined): number {
  if (countParam !== undefined && Number.isFinite(countParam)) {
    return Math.min(MAX_TEST_QUESTIONS, Math.max(1, Math.floor(countParam)));
  }
  if (mode === "checkpoint") {
    return DEFAULT_CHECKPOINT_QUESTION_COUNT;
  }
  return DEFAULT_CHECKPOINT_QUESTION_COUNT;
}

export { MAX_TEST_QUESTIONS };
