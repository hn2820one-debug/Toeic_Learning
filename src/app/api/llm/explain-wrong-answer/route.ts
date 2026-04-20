import { NextResponse } from "next/server";

import { resolveChoicesAtAnswerTime, resolveExplanationForExplain, resolveStemDisplay } from "@/lib/answer-history-snapshots";
import { generateWrongAnswerExplanation, WrongAnswerExplanationError } from "@/lib/llm/haiku-explain";
import { prisma } from "@/lib/prisma";

type DirectExplainBody = {
  answerHistoryId?: unknown;
  stem?: unknown;
  choices?: unknown;
  correctAnswer?: unknown;
  userChoice?: unknown;
  grammarPoint?: unknown;
  explanationSnapshot?: unknown;
  questionId?: unknown;
  sessionId?: unknown;
};

type NormalizedExplainInput = {
  stem: string;
  choices: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: "A" | "B" | "C" | "D";
  userChoice: "A" | "B" | "C" | "D";
  grammarPoint?: string;
  explanationSnapshot?: string;
  questionId?: number | string;
  sessionId?: number | string;
};

function normalizeAnswerChoice(value: unknown, fieldName: string) {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be one of A, B, C, D.`);
  }

  const normalized = value.trim().toUpperCase();
  if (normalized !== "A" && normalized !== "B" && normalized !== "C" && normalized !== "D") {
    throw new Error(`${fieldName} must be one of A, B, C, D.`);
  }

  return normalized as "A" | "B" | "C" | "D";
}

function normalizeOptionalString(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string when provided.`);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeOptionalId(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error(`${fieldName} must be a string or number when provided.`);
  }

  return value;
}

function normalizeDirectExplainBody(body: DirectExplainBody): NormalizedExplainInput {
  if (typeof body.stem !== "string" || body.stem.trim().length === 0) {
    throw new Error("stem must be a non-empty string.");
  }

  const choices = body.choices as Record<string, unknown> | undefined;
  if (
    !choices ||
    typeof choices.A !== "string" ||
    typeof choices.B !== "string" ||
    typeof choices.C !== "string" ||
    typeof choices.D !== "string"
  ) {
    throw new Error("choices must be an object with string keys A, B, C, D.");
  }

  const normalized = {
    stem: body.stem.trim(),
    choices: {
      A: choices.A.trim(),
      B: choices.B.trim(),
      C: choices.C.trim(),
      D: choices.D.trim(),
    },
    correctAnswer: normalizeAnswerChoice(body.correctAnswer, "correctAnswer"),
    userChoice: normalizeAnswerChoice(body.userChoice, "userChoice"),
    grammarPoint: normalizeOptionalString(body.grammarPoint, "grammarPoint"),
    explanationSnapshot: normalizeOptionalString(body.explanationSnapshot, "explanationSnapshot"),
    questionId: normalizeOptionalId(body.questionId, "questionId"),
    sessionId: normalizeOptionalId(body.sessionId, "sessionId"),
  } satisfies NormalizedExplainInput;

  if (normalized.correctAnswer === normalized.userChoice) {
    throw new Error("Wrong-answer explanation requires userChoice to be different from correctAnswer.");
  }

  return normalized;
}

async function loadExplainInputFromAnswerHistory(answerHistoryId: number): Promise<NormalizedExplainInput> {
  const row = await prisma.answerHistory.findUnique({
    where: { id: answerHistoryId },
    select: {
      id: true,
      sessionId: true,
      questionId: true,
      selectedAnswer: true,
      stemSnapshot: true,
      choicesSnapshot: true,
      correctAnswerSnapshot: true,
      explanationSnapshot: true,
      optionASnapshot: true,
      optionBSnapshot: true,
      optionCSnapshot: true,
      optionDSnapshot: true,
      question: {
        select: {
          questionText: true,
          optionA: true,
          optionB: true,
          optionC: true,
          optionD: true,
          correctAnswer: true,
          explanation: true,
        },
      },
    },
  });

  if (!row) {
    throw new Error("AnswerHistory row not found.");
  }

  const stem = resolveStemDisplay(row.stemSnapshot, row.question.questionText);
  const choices = resolveChoicesAtAnswerTime(
    {
      optionASnapshot: row.optionASnapshot,
      optionBSnapshot: row.optionBSnapshot,
      optionCSnapshot: row.optionCSnapshot,
      optionDSnapshot: row.optionDSnapshot,
      choicesSnapshot: row.choicesSnapshot,
    },
    row.question,
  );
  const correctAnswer = normalizeAnswerChoice(row.correctAnswerSnapshot || row.question.correctAnswer, "correctAnswer");
  const userChoice = normalizeAnswerChoice(row.selectedAnswer, "userChoice");

  if (correctAnswer === userChoice) {
    throw new Error("AnswerHistory row is not a wrong answer.");
  }

  return {
    stem,
    choices,
    correctAnswer,
    userChoice,
    explanationSnapshot: resolveExplanationForExplain(row.explanationSnapshot, row.question.explanation),
    questionId: row.questionId,
    sessionId: row.sessionId,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DirectExplainBody;
    const answerHistoryIdValue = body.answerHistoryId;

    let input: NormalizedExplainInput;
    if (answerHistoryIdValue !== undefined && answerHistoryIdValue !== null && answerHistoryIdValue !== "") {
      if (typeof answerHistoryIdValue !== "number" || !Number.isInteger(answerHistoryIdValue)) {
        throw new Error("answerHistoryId must be an integer when provided.");
      }

      input = await loadExplainInputFromAnswerHistory(answerHistoryIdValue);
    } else {
      input = normalizeDirectExplainBody(body);
    }

    const explanationText = await generateWrongAnswerExplanation(input);

    return NextResponse.json({
      ok: true,
      explanationText,
    });
  } catch (error) {
    if (error instanceof WrongAnswerExplanationError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: error.status },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
