import { prisma } from "@/lib/prisma";

const SEVEN_DAY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type WeeklyReportSummary = {
  completedSessionCount: number;
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  accuracy: number;
};

export type WeeklyReportTopic = {
  topic: string;
  totalAnswered: number;
  correctCount: number;
  accuracy: number;
};

export type WeeklyReportData = {
  windowStart: Date;
  windowEnd: Date;
  summary: WeeklyReportSummary;
  topicBreakdown: WeeklyReportTopic[];
  hasData: boolean;
};

function getAccuracy(correctCount: number, totalQuestions: number) {
  if (totalQuestions === 0) {
    return 0;
  }

  return Math.round((correctCount / totalQuestions) * 100);
}

function getEffectiveTotalQuestions(totalQuestions: number, recordedAnswers: number) {
  return totalQuestions > 0 ? totalQuestions : recordedAnswers;
}

export function getWeeklyReportWindow(now = new Date()) {
  const windowEnd = now;
  const windowStart = new Date(now.getTime() - SEVEN_DAY_WINDOW_MS);

  return {
    windowStart,
    windowEnd,
  };
}

export async function getWeeklyReportData(now = new Date()): Promise<WeeklyReportData> {
  const { windowStart, windowEnd } = getWeeklyReportWindow(now);

  const sessions = await prisma.studySession.findMany({
    where: {
      endedAt: {
        not: null,
        gte: windowStart,
        lte: windowEnd,
      },
    },
    orderBy: [{ endedAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      totalQuestions: true,
      correctCount: true,
      answerHistory: {
        select: {
          isCorrect: true,
          topicSnapshot: true,
          question: {
            select: {
              topic: true,
            },
          },
        },
      },
    },
  });

  const summary = sessions.reduce<WeeklyReportSummary>(
    (accumulator, session) => {
      const totalQuestionsAnswered = getEffectiveTotalQuestions(session.totalQuestions, session.answerHistory.length);

      return {
        completedSessionCount: accumulator.completedSessionCount + 1,
        totalQuestionsAnswered: accumulator.totalQuestionsAnswered + totalQuestionsAnswered,
        totalCorrectAnswers: accumulator.totalCorrectAnswers + session.correctCount,
        accuracy: 0,
      };
    },
    {
      completedSessionCount: 0,
      totalQuestionsAnswered: 0,
      totalCorrectAnswers: 0,
      accuracy: 0,
    },
  );

  summary.accuracy = getAccuracy(summary.totalCorrectAnswers, summary.totalQuestionsAnswered);

  const topicMap = new Map<string, { totalAnswered: number; correctCount: number }>();

  for (const session of sessions) {
    for (const answer of session.answerHistory) {
      const topic = answer.topicSnapshot || answer.question.topic;
      const current = topicMap.get(topic) ?? { totalAnswered: 0, correctCount: 0 };

      current.totalAnswered += 1;
      current.correctCount += answer.isCorrect ? 1 : 0;
      topicMap.set(topic, current);
    }
  }

  const topicBreakdown = Array.from(topicMap.entries())
    .map(([topic, values]) => ({
      topic,
      totalAnswered: values.totalAnswered,
      correctCount: values.correctCount,
      accuracy: getAccuracy(values.correctCount, values.totalAnswered),
    }))
    .sort((left, right) => {
      if (right.totalAnswered !== left.totalAnswered) {
        return right.totalAnswered - left.totalAnswered;
      }

      return left.topic.localeCompare(right.topic);
    });

  return {
    windowStart,
    windowEnd,
    summary,
    topicBreakdown,
    hasData: summary.completedSessionCount > 0,
  };
}