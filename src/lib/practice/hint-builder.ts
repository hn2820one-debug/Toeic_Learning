/**
 * Builds three scaffolded hint layers when no hand-authored hints exist.
 * Priority for long-form help: explanation → notes → stem/correct answer (last resort).
 */

export type QuestionHintSource = {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string | null;
  notes: string | null;
};

function clip(s: string, max: number) {
  const t = s.trim();
  if (t.length <= max) {
    return t;
  }
  return `${t.slice(0, max)}…`;
}

export function buildPracticeHints(q: QuestionHintSource): { level1: string; level2: string; level3: string } {
  const stem = clip(q.questionText.replace(/\s+/g, " "), 220);
  const expl = (q.explanation ?? "").trim();
  const notes = (q.notes ?? "").trim();

  const level1 =
    `先定位題幹與選項中的「信號詞」：空格前後、主詞與動詞一致性、時態標記。題幹摘要：${stem || "（題幹略）"}`;

  let level2 =
    expl.length > 0
      ? `規則與判讀：${clip(expl, 400)}`
      : notes.length > 0
        ? `補充線索：${clip(notes, 400)}`
        : `請用刪去法：先排除語意明顯不合的選項，再在剩餘兩個中比對搭配與語域。`;

  if (expl.length > 0 && notes.length > 0 && expl.length < 80) {
    level2 = `規則：${clip(expl, 320)} 補充：${clip(notes, 200)}`;
  }

  const ca = q.correctAnswer.trim().toUpperCase();
  const choiceLine =
    ca === "A"
      ? q.optionA
      : ca === "B"
        ? q.optionB
        : ca === "C"
          ? q.optionC
          : q.optionD;

  const level3 =
    expl.length > 0
      ? `最後提示：正解為 **${ca}**（${clip(choiceLine, 120)}）。要點：${clip(expl, 280)}`
      : `最後提示：正解為 **${ca}**。請對照題幹語意確認搭配是否合理，再進入下一題。`;

  return { level1, level2, level3 };
}

/**
 * Final explanation shown after wrong streak / reveal — matches user priority: explanation → hint3 tone → placeholder.
 */
export function resolveExplanationForReveal(q: QuestionHintSource, hints: ReturnType<typeof buildPracticeHints>): string {
  const expl = (q.explanation ?? "").trim();
  if (expl.length > 0) {
    return expl;
  }
  return hints.level3;
}
