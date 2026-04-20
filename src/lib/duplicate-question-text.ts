import { validateAndNormalizeQuestionInput, type QuestionFieldInput } from "./question-fields";

/**
 * Single lookup key for duplicate detection (manual create/edit, JSON import, CSV commit).
 * Returns `null` when input fails validation — callers should surface validation separately.
 */
export function normalizedQuestionTextForDuplicateLookup(input: QuestionFieldInput): string | null {
  const result = validateAndNormalizeQuestionInput(input);
  return result.ok ? result.data.questionText : null;
}
