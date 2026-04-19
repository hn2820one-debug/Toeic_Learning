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

function getAccuracy(correctCount: number, totalQuestions: number) {
  if (totalQuestions === 0) {
    return 0;
  }

  return Math.round((correctCount / totalQuestions) * 100);
}

export async function getCompletedStudySessions(): Promise<HistorySession[]> {
  const sessions = await prisma.studySession.findMany({
    where: {
      endedAt: {
        not: null,
      },
    },
    orderBy: [{ endedAt: "desc" }, { id: "desc" }],
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
  });

  return sessions.map((session) => {
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
        questionText: answer.question.questionText,
        selectedAnswer: answer.selectedAnswer,
        correctAnswer: answer.question.correctAnswer,
        isCorrect: answer.isCorrect,
        answeredAt: answer.answeredAt,
        topic: answer.question.topic,
        difficulty: answer.question.difficulty,
      })),
    };
  });
}