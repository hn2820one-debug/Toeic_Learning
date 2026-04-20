import { getAnalysisPageData } from "@/lib/analysis";

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
  topWeaknessTopics: WeeklyReportTopic[];
  nextAction: string;
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
  const analysis = await getAnalysisPageData();
  const stats7d = analysis.stats7d;

  const topicBreakdown = analysis.weakTopics
    .map((w) => ({
      topic: w.topic,
      totalAnswered: w.answered,
      correctCount: Math.max(0, w.answered - w.wrongCount),
      accuracy: w.accuracy,
    }))
    .sort((a, b) => b.totalAnswered - a.totalAnswered || a.topic.localeCompare(b.topic));

  return {
    windowStart,
    windowEnd,
    summary: {
      completedSessionCount: stats7d.completedSessions,
      totalQuestionsAnswered: stats7d.totalQuestions,
      totalCorrectAnswers: stats7d.correctAnswers,
      accuracy: stats7d.accuracy,
    },
    topicBreakdown,
    hasData: stats7d.completedSessions > 0,
    topWeaknessTopics: topicBreakdown.slice(0, 3),
    nextAction: analysis.weekly.nextActions.narrativeZh,
  };
}