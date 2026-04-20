import { prisma } from "@/lib/prisma";
import {
  DUPLICATE_QUESTION_TEXT_BODY,
  formatQuestionValidationMessage,
  type QuestionFieldInput,
  validateAndNormalizeQuestionInput,
} from "@/lib/question-fields";
import { logOpsWarn } from "@/lib/ops-log";
import {
  toQuestionBankCreateInput,
  toQuestionBankUpdateInput,
  type QuestionBankExtraInput,
  type QuestionBankSourceKind,
} from "@/lib/question-bank/normalize-input";

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

export type BuildQuestionBankDataOptions = {
  defaultSourceQuality?: string;
  sourceKind?: QuestionBankSourceKind;
  extra?: QuestionBankExtraInput;
  grammarPointsRaw?: string | null;
};

/** Shared Prisma payload — always runs normalize-first (taxonomy + primaryLearningSkill inference). */
export function buildQuestionBankCreateData(
  validated: import("@/lib/question-fields").NormalizedQuestionFields,
  options?: BuildQuestionBankDataOptions,
) {
  const { data, warnings } = toQuestionBankCreateInput(validated, {
    sourceKind: options?.sourceKind ?? "manual",
    defaultSourceQuality: options?.defaultSourceQuality,
    extra: options?.extra,
    grammarPointsRaw: options?.grammarPointsRaw,
  });
  if (warnings.length > 0 && (options?.sourceKind ?? "manual") === "manual") {
    logOpsWarn({
      area: "question_bank",
      event: "normalize_create_warnings",
      detail: { warnings },
    });
  }
  return data;
}

/** Prisma update payload — same normalize-first rules as create. */
export function buildQuestionBankUpdateData(
  validated: import("@/lib/question-fields").NormalizedQuestionFields,
  options?: BuildQuestionBankDataOptions,
) {
  const { data, warnings } = toQuestionBankUpdateInput(validated, {
    sourceKind: options?.sourceKind ?? "manual",
    defaultSourceQuality: options?.defaultSourceQuality,
    extra: options?.extra,
    grammarPointsRaw: options?.grammarPointsRaw,
  });
  if (warnings.length > 0 && (options?.sourceKind ?? "manual") === "manual") {
    logOpsWarn({
      area: "question_bank",
      event: "normalize_update_warnings",
      detail: { warnings },
    });
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

/** Uses the same `questionText` string produced by {@link validateAndNormalizeQuestionInput} (see DUPLICATE_QUESTION_TEXT_STRATEGY). */
export async function findQuestionBankItemIdWithSameQuestionText(
  questionText: string,
  options?: { excludeQuestionId?: number },
): Promise<number | null> {
  const row = await prisma.questionBankItem.findFirst({
    where: {
      questionText,
      ...(options?.excludeQuestionId
        ? {
            NOT: {
              id: options.excludeQuestionId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  });

  return row?.id ?? null;
}

export async function createQuestionBankItem(input: CreateQuestionInput): Promise<QuestionMutationResult> {
  const validation = validateAndNormalizeQuestionInput(input);

  if (!validation.ok) {
    return {
      status: "error",
      message: `Validation failed. ${formatQuestionValidationMessage(validation.issue)}`,
    };
  }

  const duplicateId = await findQuestionBankItemIdWithSameQuestionText(validation.data.questionText);

  if (duplicateId !== null) {
    return {
      status: "error",
      message: `Create failed. ${DUPLICATE_QUESTION_TEXT_BODY}`,
    };
  }

  try {
    const question = await prisma.questionBankItem.create({
      data: buildQuestionBankCreateData(validation.data, { defaultSourceQuality: "manual", sourceKind: "manual" }),
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

  const validation = validateAndNormalizeQuestionInput(input);

  if (!validation.ok) {
    return {
      status: "error",
      message: `Update failed. ${formatQuestionValidationMessage(validation.issue)}`,
      questionId,
    };
  }

  const duplicateId = await findQuestionBankItemIdWithSameQuestionText(validation.data.questionText, {
    excludeQuestionId: questionId,
  });

  if (duplicateId !== null) {
    return {
      status: "error",
      message: `Update failed. ${DUPLICATE_QUESTION_TEXT_BODY}`,
      questionId,
    };
  }

  await prisma.questionBankItem.update({
    where: { id: questionId },
    data: buildQuestionBankUpdateData(validation.data, { defaultSourceQuality: "manual", sourceKind: "manual" }),
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