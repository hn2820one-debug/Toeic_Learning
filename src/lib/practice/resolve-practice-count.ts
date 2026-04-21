import { PRACTICE_QUESTION_COUNT } from "./practice-state";

/** Shared by server actions and UI copy — no I/O. */
export function resolvePracticeQuestionCount(mode: string | undefined, countParam: number | undefined): number {
  const raw = countParam;
  if (raw !== undefined && Number.isFinite(raw)) {
    return Math.min(15, Math.max(1, Math.floor(raw)));
  }
  if (mode === "lesson_drill") {
    return 7;
  }
  if (mode === "mixed_practice") {
    return 10;
  }
  return PRACTICE_QUESTION_COUNT;
}
