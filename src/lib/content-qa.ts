import { prisma } from "@/lib/prisma";

import {
  getFallbackExplanation,
  validateHintSet,
  validateLessonStructure,
  type HintQaResult,
  type LessonQaResult,
} from "./content-qa-rules";
import { buildPracticeHints, type QuestionHintSource } from "./practice/hint-builder";

export type LessonQaScanRow = {
  lessonId: string;
  topicKey: string | null;
  moduleKey: string;
  lessonIndex: number;
  qa: LessonQaResult;
};

export type HintQaScanRow = {
  questionId: number;
  topicKey: string | null;
  qa: HintQaResult;
};

export async function runLessonQaScan(): Promise<{
  totalScanned: number;
  passed: number;
  failed: number;
  warnings: number;
  rows: LessonQaScanRow[];
}> {
  const lessons = await prisma.lesson.findMany({
    orderBy: [{ moduleKey: "asc" }, { lessonIndex: "asc" }],
    select: {
      id: true,
      topicKey: true,
      moduleKey: true,
      lessonIndex: true,
      bodyMarkdown: true,
    },
  });

  const rows: LessonQaScanRow[] = lessons.map((l) => {
    const qa = validateLessonStructure(l.bodyMarkdown ?? "");
    return {
      lessonId: l.id,
      topicKey: l.topicKey,
      moduleKey: l.moduleKey,
      lessonIndex: l.lessonIndex,
      qa,
    };
  });

  return {
    totalScanned: rows.length,
    passed: rows.filter((r) => r.qa.passed).length,
    failed: rows.filter((r) => !r.qa.passed).length,
    warnings: rows.reduce((acc, r) => acc + r.qa.issues.filter((i) => i.level === "warning").length, 0),
    rows,
  };
}

function sourceFromQuestionRow(q: {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string | null;
  notes: string | null;
}): QuestionHintSource {
  return {
    questionText: q.questionText,
    optionA: q.optionA,
    optionB: q.optionB,
    optionC: q.optionC,
    optionD: q.optionD,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    notes: q.notes,
  };
}

export async function runHintQaScan(options?: {
  limit?: number;
}): Promise<{
  totalScanned: number;
  passed: number;
  failed: number;
  warnings: number;
  rows: HintQaScanRow[];
}> {
  const rowsRaw = await prisma.questionBankItem.findMany({
    orderBy: { id: "asc" },
    take: options?.limit ?? 600,
    select: {
      id: true,
      topicKey: true,
      questionText: true,
      optionA: true,
      optionB: true,
      optionC: true,
      optionD: true,
      correctAnswer: true,
      explanation: true,
      notes: true,
    },
  });

  const rows: HintQaScanRow[] = rowsRaw.map((q) => {
    const src = sourceFromQuestionRow(q);
    const hints = buildPracticeHints(src);
    const qa = validateHintSet(
      {
        hint1: hints.level1,
        hint2: hints.level2,
        hint3: hints.level3,
      },
      { correctAnswer: q.correctAnswer },
    );
    return {
      questionId: q.id,
      topicKey: q.topicKey,
      qa,
    };
  });

  return {
    totalScanned: rows.length,
    passed: rows.filter((r) => r.qa.passed).length,
    failed: rows.filter((r) => !r.qa.passed).length,
    warnings: rows.reduce((acc, r) => acc + r.qa.issues.filter((i) => i.level === "warning").length, 0),
    rows,
  };
}

export function buildFallbackExplanationFromQuestion(input: {
  correctAnswer: string;
  explanation?: string | null;
  hint3?: string;
}) {
  return getFallbackExplanation(input);
}
