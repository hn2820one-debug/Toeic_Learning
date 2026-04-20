import {
  resolveCorrectAnswerLetter,
  resolveDifficultyDisplay,
  resolveStemDisplay,
  resolveTopicDisplay,
} from "@/lib/answer-history-snapshots";
import { prisma } from "@/lib/prisma";

export type HistoryAnswer = {
  id: number;
  questionId: number;
  questionText: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  answeredAt: Date;
  topic: string;
  difficulty: string;
};

export type HistorySession = {
  id: number;
  startedAt: Date;
  endedAt: Date;
  totalQuestions: number;
  correctCount: number;
  accuracy: number;
  answers: HistoryAnswer[];
};

export type HistorySessionsPage = {
  rows: HistorySession[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function getAccuracy(correctCount: number, totalQuestions: number) {
  if (totalQuestions === 0) {
    return 0;
  }

  return Math.round((correctCount / totalQuestions) * 100);
}

export async function getCompletedStudySessions(params?: {
  page?: number;
  pageSize?: number;
}): Promise<HistorySessionsPage> {
  const pageSize = Math.max(1, params?.pageSize ?? 20);
  const page = Math.max(1, params?.page ?? 1);
  const skip = (page - 1) * pageSize;
  const [total, sessions] = await Promise.all([
    prisma.studySession.count({
      where: {
        endedAt: {
          not: null,
        },
      },
    }),
    prisma.studySession.findMany({
    where: {
      endedAt: {
        not: null,
      },
    },
    orderBy: [{ endedAt: "desc" }, { id: "desc" }],
    skip,
    take: pageSize,
    select: {
      id: true,
      startedAt: true,
      endedAt: true,
      totalQuestions: true,
      correctCount: true,
      answerHistory: {
        orderBy: {
          answeredAt: "asc",
        },
        select: {
          id: true,
          questionId: true,
          selectedAnswer: true,
          isCorrect: true,
          answeredAt: true,
          stemSnapshot: true,
          correctAnswerSnapshot: true,
          topicSnapshot: true,
          difficultySnapshot: true,
          question: {
            select: {
              questionText: true,
              correctAnswer: true,
              topic: true,
              difficulty: true,
            },
          },
        },
      },
    },
    }),
  ]);

  const rows = sessions.map((session) => {
    const totalQuestions = session.totalQuestions > 0 ? session.totalQuestions : session.answerHistory.length;

    return {
      id: session.id,
      startedAt: session.startedAt,
      endedAt: session.endedAt ?? session.startedAt,
      totalQuestions,
      correctCount: session.correctCount,
      accuracy: getAccuracy(session.correctCount, totalQuestions),
      answers: session.answerHistory.map((answer) => ({
        id: answer.id,
        questionId: answer.questionId,
        questionText: resolveStemDisplay(answer.stemSnapshot, answer.question.questionText),
        selectedAnswer: answer.selectedAnswer,
        correctAnswer: resolveCorrectAnswerLetter(answer.correctAnswerSnapshot, answer.question.correctAnswer),
        isCorrect: answer.isCorrect,
        answeredAt: answer.answeredAt,
        topic: resolveTopicDisplay(answer.topicSnapshot, answer.question.topic),
        difficulty: resolveDifficultyDisplay(answer.difficultySnapshot, answer.question.difficulty),
      })),
    };
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    rows,
    total,
    page: Math.min(page, totalPages),
    pageSize,
    totalPages,
  };
}