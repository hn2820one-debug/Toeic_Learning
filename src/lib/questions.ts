import type { Prisma } from "../../generated/prisma";
import { prisma } from "@/lib/prisma";
import {
  getNormalizedQuestionTopics,
  QUESTION_DIFFICULTY_VALUES,
  normalizeQuestionDifficulty,
  normalizeQuestionTopic,
  type QuestionDifficulty,
} from "@/lib/question-fields";

type SearchParamValue = string | string[] | undefined;

export type QuestionFilters = {
  topic?: string;
  difficulty?: QuestionDifficulty;
  query?: string;
};

export type QuestionPageSearchParams = {
  topic?: SearchParamValue;
  difficulty?: SearchParamValue;
  q?: SearchParamValue;
  status?: SearchParamValue;
  message?: SearchParamValue;
};

function normalizeParam(value: SearchParamValue) {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (!normalized) {
    return undefined;
  }

  const trimmed = normalized.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeQuestionFilters(searchParams?: QuestionPageSearchParams): QuestionFilters {
  return {
    topic: normalizeQuestionTopic(normalizeParam(searchParams?.topic)),
    difficulty: normalizeQuestionDifficulty(normalizeParam(searchParams?.difficulty)),
    query: normalizeParam(searchParams?.q),
  };
}

export async function getQuestionFilterOptions() {
  const topics = await prisma.questionBankItem.findMany({
    distinct: ["topic"],
    select: { topic: true },
    orderBy: { topic: "asc" },
  });

  return {
    topics: getNormalizedQuestionTopics(topics.map(({ topic }) => topic)),
    difficulties: [...QUESTION_DIFFICULTY_VALUES],
  };
}

export async function getQuestions(filters: QuestionFilters) {
  const where: Prisma.QuestionBankItemWhereInput = {
    ...(filters.topic ? { topic: filters.topic } : {}),
    ...(filters.difficulty ? { difficulty: filters.difficulty } : {}),
    ...(filters.query
      ? {
          questionText: {
            contains: filters.query,
          },
        }
      : {}),
  };

  return prisma.questionBankItem.findMany({
    where,
    orderBy: [{ topic: "asc" }, { difficulty: "asc" }, { createdAt: "desc" }],
  });
}