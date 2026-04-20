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
  page?: SearchParamValue;
  status?: SearchParamValue;
  message?: SearchParamValue;
};

export const QUESTION_PAGE_SIZE = 50;

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
          OR: [
            {
              questionText: {
                contains: filters.query,
              },
            },
            {
              topic: {
                contains: filters.query,
              },
            },
            {
              notes: {
                contains: filters.query,
              },
            },
          ],
        }
      : {}),
  };

  return prisma.questionBankItem.findMany({
    where,
    orderBy: [{ topic: "asc" }, { difficulty: "asc" }, { createdAt: "desc" }],
  });
}

export function parseQuestionPage(value: SearchParamValue) {
  const normalized = normalizeParam(value);
  if (!normalized) {
    return 1;
  }
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export async function getQuestionsPage(filters: QuestionFilters, page: number, pageSize = QUESTION_PAGE_SIZE) {
  const where: Prisma.QuestionBankItemWhereInput = {
    ...(filters.topic ? { topic: filters.topic } : {}),
    ...(filters.difficulty ? { difficulty: filters.difficulty } : {}),
    ...(filters.query
      ? {
          OR: [
            { questionText: { contains: filters.query } },
            { topic: { contains: filters.query } },
            { notes: { contains: filters.query } },
          ],
        }
      : {}),
  };

  const safePage = Math.max(1, page);
  const skip = (safePage - 1) * pageSize;
  const [total, rows] = await Promise.all([
    prisma.questionBankItem.count({ where }),
    prisma.questionBankItem.findMany({
      where,
      orderBy: [{ topic: "asc" }, { difficulty: "asc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
      select: {
        id: true,
        questionText: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        correctAnswer: true,
        explanation: true,
        notes: true,
        topic: true,
        difficulty: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    rows,
    total,
    page: Math.min(safePage, totalPages),
    totalPages,
    pageSize,
  };
}