/**
 * Deterministic 3-layer hints from QuestionBankItem v2 fields, with graceful fallbacks.
 * Hint3 avoids naming the correct option letter (unless DB hint3 already does).
 */
import { clip } from "./hint-text-utils";

export type QuestionHintInput = {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string | null;
  notes: string | null;
  hint1: string | null;
  hint2: string | null;
  hint3: string | null;
  coreRule: string | null;
  recognitionSignal: string | null;
};

function clipSoft(s: string | null | undefined, max: number): string {
  const t = (s ?? "").trim();
  if (!t) return "";
  return clip(t, max);
}

/** Safe explanation excerpt — no answer letter. */
function explanationSnippet(explanation: string | null, max: number): string {
  const t = (explanation ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  return clip(t, max);
}

/**
 * Layer priority:
 * - L1: hint1 → recognitionSignal → stem-oriented direction
 * - L2: hint2 → coreRule → explanation (short)
 * - L3: hint3 → soft narrowing (no "答案是 B")
 */
export function buildResolvedPracticeHints(q: QuestionHintInput): {
  level1: string;
  level2: string;
  level3: string;
} {
  const stem = clipSoft(q.questionText, 180);

  const level1 =
    clipSoft(q.hint1, 500) ||
    clipSoft(q.recognitionSignal, 500) ||
    `先讀題幹與空格位置，圈出「信號」：主詞、動詞時態、搭配線索。題幹摘要：${stem || "（略）"}`;

  const level2 =
    clipSoft(q.hint2, 500) ||
    clipSoft(q.coreRule, 500) ||
    (explanationSnippet(q.explanation, 320) ||
      clipSoft(q.notes, 320) ||
      "用刪去法：先排除語意或搭配明顯不合的選項，再在剩餘選項比對語域與句型。");

  const level3 =
    clipSoft(q.hint3, 500) ||
    (explanationSnippet(q.explanation, 260)
      ? `最後收窄：${explanationSnippet(q.explanation, 260)}（請自行比對選項語意，勿只看單字）。`
      : "最後收窄：比對剩下選項與題幹語氣與搭配，留意詞性與固定用法；不要只憑直覺選字。");

  return { level1, level2, level3 };
}
