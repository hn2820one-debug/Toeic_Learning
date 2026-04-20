import "server-only";

import { buildFallbackExplanationFromQuestion } from "@/lib/content-qa";
import { validateHintSet } from "@/lib/content-qa-rules";
import { buildPracticeHints, type QuestionHintSource } from "@/lib/practice/hint-builder";

export type AdaptiveHintResult = {
  hint1: string;
  hint2: string;
  hint3: string;
  qaPassed: boolean;
  qaIssues: string[];
  fallbackUsed: boolean;
};

function deterministicFallbackHints(src: QuestionHintSource): AdaptiveHintResult {
  const explain = buildFallbackExplanationFromQuestion({
    correctAnswer: src.correctAnswer,
    explanation: src.explanation,
  });
  const lines = explain.split("\n").map((s) => s.trim()).filter(Boolean);
  return {
    hint1: lines[1] || "先看空格前後語法位置，判斷要填入的詞性。",
    hint2: lines[2] || "比較選項搭配與句意，先排除明顯不合理者。",
    hint3: `正解是 ${src.correctAnswer.toUpperCase()}；請核對為何其餘選項不符合句型。`,
    qaPassed: true,
    qaIssues: [],
    fallbackUsed: true,
  };
}

/**
 * Deterministic adaptive hint generator with QA gate.
 * Current implementation does not call external LLM; if future LLM hints are plugged in,
 * keep this QA gate before returning to runtime.
 */
export function generateAdaptiveHint(src: QuestionHintSource): AdaptiveHintResult {
  const hints = buildPracticeHints(src);
  const qa = validateHintSet(
    {
      hint1: hints.level1,
      hint2: hints.level2,
      hint3: hints.level3,
    },
    { correctAnswer: src.correctAnswer },
  );

  if (!qa.passed) {
    const fb = deterministicFallbackHints(src);
    return {
      ...fb,
      qaPassed: false,
      qaIssues: qa.issues.map((i) => `${i.code}: ${i.message}`),
      fallbackUsed: true,
    };
  }

  return {
    hint1: hints.level1,
    hint2: hints.level2,
    hint3: hints.level3,
    qaPassed: true,
    qaIssues: qa.issues.map((i) => `${i.code}: ${i.message}`),
    fallbackUsed: false,
  };
}
