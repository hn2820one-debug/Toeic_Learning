import type { Prisma } from "../../generated/prisma";

import { prisma } from "@/lib/prisma";
import {
  formatQuestionValidationMessage,
  type NormalizedQuestionFields,
  type QuestionFieldInput,
  validateQuestionFields,
} from "@/lib/question-fields";

type SearchParamValue = string | string[] | undefined;

export type QuestionMutationResult = {
  status: "success" | "error";
  message: string;
  questionId?: number;
};

export type EditableQuestion = {
  id: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string | null;
  topic: string;
  difficulty: string;
  answerHistoryCount: number;
  canDelete: boolean;
};

export type QuestionEditSearchParams = {
  status?: SearchParamValue;
  message?: SearchParamValue;
  confirmDelete?: SearchParamValue;
};

type QuestionMutationFieldInput = QuestionFieldInput;

type UpdateQuestionInput = QuestionMutationFieldInput & {
  questionId: string | null;
};

type CreateQuestionInput = QuestionMutationFieldInput;

/** Shared Prisma payload for creates (manual, JSON import, tests). */
export function buildQuestionBankCreateData(
  validated: NormalizedQuestionFields,
  options?: { defaultSourceQuality?: string },
): Prisma.QuestionBankItemCreateInput {
  const defaultSourceQuality = options?.defaultSourceQuality ?? "manual";

  const data: Prisma.QuestionBankItemCreateInput = {
    questionText: validated.questionText,
    optionA: validated.optionA,
    optionB: validated.optionB,
    optionC: validated.optionC,
    optionD: validated.optionD,
    correctAnswer: validated.correctAnswer,
    explanation: validated.explanation,
    topic: validated.topic,
    difficulty: validated.difficulty,
    sourceQuality: validated.sourceQuality !== undefined ? validated.sourceQuality : defaultSourceQuality,
  };

  if (validated.skillKey !== undefined) {
    data.skillKey = validated.skillKey;
  }

  if (validated.topicKey !== undefined) {
    data.topicKey = validated.topicKey;
  }

  if (validated.moduleKey !== undefined) {
    data.moduleKey = validated.moduleKey;
  }

  if (validated.priorKnown !== undefined) {
    data.priorKnown = validated.priorKnown;
  }

  return data;
}

/** Prisma update payload: only sets taxonomy keys when present on the validated object (forms omit them). */
export function buildQuestionBankUpdateData(validated: NormalizedQuestionFields): Prisma.QuestionBankItemUpdateInput {
  const data: Prisma.QuestionBankItemUpdateInput = {
    questionText: validated.questionText,
    optionA: validated.optionA,
    optionB: validated.optionB,
    optionC: validated.optionC,
    optionD: validated.optionD,
    correctAnswer: validated.correctAnswer,
    explanation: validated.explanation,
    topic: validated.topic,
    difficulty: validated.difficulty,
  };

  if (validated.skillKey !== undefined) {
    data.skillKey = validated.skillKey;
  }

  if (validated.topicKey !== undefined) {
    data.topicKey = validated.topicKey;
  }

  if (validated.moduleKey !== undefined) {
    data.moduleKey = validated.moduleKey;
  }

  if (validated.sourceQuality !== undefined) {
    data.sourceQuality = validated.sourceQuality;
  }

  if (validated.priorKnown !== undefined) {
    data.priorKnown = validated.priorKnown;
  }

  return data;
}

function normalizeParam(value: SearchParamValue) {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (!normalized) {
    return undefined;
  }

  const trimmed = normalized.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parsePositiveInt(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function parseQuestionEditFeedback(searchParams?: QuestionEditSearchParams) {
  return {
    status: normalizeParam(searchParams?.status),
    message: normalizeParam(searchParams?.message),
    confirmDelete: normalizeParam(searchParams?.confirmDelete) === "1",
  };
}

export function getQuestionEditHref(
  questionId: number,
  options?: {
    status?: "success" | "error";
    message?: string;
    confirmDelete?: boolean;
  },
) {
  const searchParams = new URLSearchParams();

  if (options?.status) {
    searchParams.set("status", options.status);
  }

  if (options?.message) {
    searchParams.set("message", options.message);
  }

  if (options?.confirmDelete) {
    searchParams.set("confirmDelete", "1");
  }

  const queryString = searchParams.toString();
  return queryString.length > 0 ? `/questions/${questionId}/edit?${queryString}` : `/questions/${questionId}/edit`;
}

export function getQuestionNewHref(options?: {
  status?: "success" | "error";
  message?: string;
}) {
  const searchParams = new URLSearchParams();

  if (options?.status) {
    searchParams.set("status", options.status);
  }

  if (options?.message) {
    searchParams.set("message", options.message);
  }

  const queryString = searchParams.toString();
  return queryString.length > 0 ? `/questions/new?${queryString}` : "/questions/new";
}

export function getQuestionsPageHref(options?: {
  status?: "success" | "error";
  message?: string;
}) {
  const searchParams = new URLSearchParams();

  if (options?.status) {
    searchParams.set("status", options.status);
  }

  if (options?.message) {
    searchParams.set("message", options.message);
  }

  const queryString = searchParams.toString();
  return queryString.length > 0 ? `/questions?${queryString}` : "/questions";
}

export async function getEditableQuestion(questionId: number): Promise<EditableQuestion | null> {
  const [question, answerHistoryCount] = await Promise.all([
    prisma.questionBankItem.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        questionText: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        correctAnswer: true,
        explanation: true,
        topic: true,
        difficulty: true,
      },
    }),
    prisma.answerHistory.count({
      where: { questionId },
    }),
  ]);

  if (!question) {
    return null;
  }

  return {
    ...question,
    answerHistoryCount,
    canDelete: answerHistoryCount === 0,
  };
}

async function findDuplicateQuestion(questionText: string, questionId?: number) {
  return prisma.questionBankItem.findFirst({
    where: {
      questionText,
      ...(questionId
        ? {
            NOT: {
              id: questionId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  });
}

export async function createQuestionBankItem(input: CreateQuestionInput): Promise<QuestionMutationResult> {
  const validation = validateQuestionFields(input);

  if (!validation.ok) {
    return {
      status: "error",
      message: `Validation failed. ${formatQuestionValidationMessage(validation.issue)}`,
    };
  }

  const duplicateQuestion = await findDuplicateQuestion(validation.data.questionText);

  if (duplicateQuestion) {
    return {
      status: "error",
      message: "Create failed. Another question already uses the same questionText.",
    };
  }

  try {
    const question = await prisma.questionBankItem.create({
      data: buildQuestionBankCreateData(validation.data, { defaultSourceQuality: "manual" }),
      select: {
        id: true,
      },
    });

    return {
      status: "success",
      message: "Question created successfully.",
      questionId: question.id,
    };
  } catch {
    return {
      status: "error",
      message: "Create could not be completed safely.",
    };
  }
}

export async function updateQuestionBankItem(input: UpdateQuestionInput): Promise<QuestionMutationResult> {
  const questionId = parsePositiveInt(input.questionId);

  if (!questionId) {
    return {
      status: "error",
      message: "Question not found.",
    };
  }

  const existingQuestion = await prisma.questionBankItem.findUnique({
    where: { id: questionId },
    select: { id: true },
  });

  if (!existingQuestion) {
    return {
      status: "error",
      message: "Question not found.",
    };
  }

  const validation = validateQuestionFields(input);

  if (!validation.ok) {
    return {
      status: "error",
      message: `Update failed. ${formatQuestionValidationMessage(validation.issue)}`,
      questionId,
    };
  }

  const duplicateQuestion = await findDuplicateQuestion(validation.data.questionText, questionId);

  if (duplicateQuestion) {
    return {
      status: "error",
      message: "Update failed. Another question already uses the same questionText.",
      questionId,
    };
  }

  await prisma.questionBankItem.update({
    where: { id: questionId },
    data: buildQuestionBankUpdateData(validation.data),
  });

  return {
    status: "success",
    message: "Question updated successfully.",
    questionId,
  };
}

export async function deleteQuestionBankItem(questionIdValue: string | null): Promise<QuestionMutationResult> {
  const questionId = parsePositiveInt(questionIdValue);

  if (!questionId) {
    return {
      status: "error",
      message: "Question not found.",
    };
  }

  const question = await getEditableQuestion(questionId);

  if (!question) {
    return {
      status: "error",
      message: "Question not found.",
    };
  }

  if (!question.canDelete) {
    return {
      status: "error",
      message: `Delete unavailable. This question is referenced by ${question.answerHistoryCount} answer record${question.answerHistoryCount === 1 ? "" : "s"} and is kept to preserve history.`,
      questionId,
    };
  }

  try {
    await prisma.questionBankItem.delete({
      where: { id: questionId },
    });
  } catch {
    return {
      status: "error",
      message: "Delete could not be completed safely.",
      questionId,
    };
  }

  return {
    status: "success",
    message: "Question deleted successfully.",
    questionId,
  };
}