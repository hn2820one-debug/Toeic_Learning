/**
 * Pure helpers for timed test submits — used by `src/app/test/actions.ts`.
 */
import {
  TEST_SECONDS_PER_QUESTION,
  TEST_TIMEOUT_USER_CHOICE,
  type TestItemStateJson,
} from "@/lib/test-mode";

export type SubmitTestAnswerInput = {
  state: TestItemStateJson;
  correctAnswer: string;
  choiceRaw: string;
};

export type SubmitTestAnswerResult =
  | { ok: true; next: TestItemStateJson }
  | { ok: false; error: "invalid_choice" };

/**
 * Single attempt per item; `choiceRaw` may be `TIMEOUT` (case-insensitive).
 */
export function submitTestAnswerPure(input: SubmitTestAnswerInput): SubmitTestAnswerResult {
  const st = input.state;
  const trimmed = input.choiceRaw.trim();
  const isTimeout = trimmed === TEST_TIMEOUT_USER_CHOICE || trimmed.toUpperCase() === TEST_TIMEOUT_USER_CHOICE;

  let shownAt = st.shownAt;
  if (!shownAt) {
    shownAt = new Date().toISOString();
  }

  const answeredAt = new Date().toISOString();
  const shownMs = new Date(shownAt).getTime();
  const ansMs = Date.now();
  let timeTakenSec = Math.min(TEST_SECONDS_PER_QUESTION, Math.max(0, (ansMs - shownMs) / 1000));
  if (isTimeout) {
    timeTakenSec = TEST_SECONDS_PER_QUESTION;
  }

  let normalizedChoice: string;
  if (isTimeout) {
    normalizedChoice = TEST_TIMEOUT_USER_CHOICE;
  } else {
    normalizedChoice = trimmed.toUpperCase();
    if (!["A", "B", "C", "D"].includes(normalizedChoice)) {
      return { ok: false, error: "invalid_choice" };
    }
  }

  const correct = !isTimeout && normalizedChoice === input.correctAnswer.trim().toUpperCase();

  const next: TestItemStateJson = {
    ...st,
    phase: "answered",
    shownAt,
    userChoice: normalizedChoice,
    correct,
    answeredAt,
    timeTakenSec,
    timedOut: isTimeout,
  };

  return { ok: true, next };
}

/** Same as submitting `TIMEOUT` as the learner choice. */
export function handleTimeoutAnswerPure(state: TestItemStateJson, correctAnswer: string): SubmitTestAnswerResult {
  return submitTestAnswerPure({ state, correctAnswer, choiceRaw: TEST_TIMEOUT_USER_CHOICE });
}
