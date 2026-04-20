import "server-only";

import type { Prisma } from "../../generated/prisma";

import { resolveCorrectAnswerLetter, resolveStemDisplay, resolveTopicDisplay } from "@/lib/answer-history-snapshots";
import { getOrCreateDevUser } from "@/lib/dev-user";
import { getQueueStats } from "@/lib/fsrs";
import { getLearnDashboardData } from "@/lib/learn-dashboard";
import { prisma } from "@/lib/prisma";
import { parseReviewItemState } from "@/lib/review-mode";
import { parseTestItemState } from "@/lib/test-mode";

import {
  aggregateRecentLearningStats,
  buildWeeklyReportData,
  classifyErrorPatterns,
  rankWeakTopics,
  recommendNextActionsFromAnalysis,
  type AnalysisWindowDays,
  type RawAnsweredRow,
  type RawTimedBehavior,
  type WeeklyReportDeterministicData,
} from "./analysis-rules";

function toWindowStart(days: AnalysisWindowDays) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

type LoadedWindow = {
  sessions: Array<{ id: string; endedAt: Date | null; mode: string }>;
  answers: RawAnsweredRow[];
  timedBehaviors: RawTimedBehavior[];
  dueBacklog: number;
};

async function loadWindowData(userId: number | null, windowDays: AnalysisWindowDays): Promise<LoadedWindow> {
  const windowStart = toWindowStart(windowDays);
  const queueStats = await getQueueStats();
  const dueBacklog = queueStats.dueCount + queueStats.learningCount;

  if (!userId) {
    return { sessions: [], answers: [], timedBehaviors: [], dueBacklog };
  }

  const sessions = await prisma.learningSession.findMany({
    where: {
      userId,
      status: "completed",
      endedAt: { gte: windowStart },
    },
    orderBy: { endedAt: "desc" },
    select: { id: true, endedAt: true, mode: true, studySessionId: true },
  });

  const studySessionIds = sessions.map((s) => s.studySessionId).filter((v): v is number => typeof v === "number");
  if (studySessionIds.length === 0) {
    return { sessions: sessions.map((s) => ({ id: s.id, endedAt: s.endedAt, mode: s.mode })), answers: [], timedBehaviors: [], dueBacklog };
  }

  const [answers, timedRows] = await Promise.all([
    prisma.answerHistory.findMany({
      where: { sessionId: { in: studySessionIds } },
      orderBy: { answeredAt: "desc" },
      include: {
        session: { select: { endedAt: true } },
        question: { select: { questionText: true, topic: true, correctAnswer: true } },
      },
    }),
    prisma.learningSessionItem.findMany({
      where: { learningSession: { userId, status: "completed", endedAt: { gte: windowStart }, mode: { in: ["test", "review"] } } },
      select: {
        testStateJson: true,
        reviewStateJson: true,
        learningSession: { select: { mode: true } },
      },
    }),
  ]);

  const mappedAnswers: RawAnsweredRow[] = answers.map((a) => ({
    id: a.id,
    answeredAt: a.answeredAt,
    sessionEndedAt: a.session.endedAt,
    topic: resolveTopicDisplay(a.topicSnapshot, a.question.topic),
    topicKey: a.topicKeySnapshot || null,
    stemSnapshot: resolveStemDisplay(a.stemSnapshot, a.question.questionText),
    correctAnswerSnapshot: resolveCorrectAnswerLetter(a.correctAnswerSnapshot, a.question.correctAnswer),
    selectedAnswer: a.selectedAnswer,
    isCorrect: a.isCorrect,
    explanationSnapshot: a.explanationSnapshot ?? null,
  }));

  const timedBehaviors: RawTimedBehavior[] = [];
  for (const row of timedRows) {
    if (row.learningSession.mode === "test") {
      const st = parseTestItemState(row.testStateJson);
      if (st.phase === "answered") {
        timedBehaviors.push({ mode: "test", timedOut: Boolean(st.timedOut), timeTakenSec: st.timeTakenSec ?? null });
      }
    }
    if (row.learningSession.mode === "review") {
      const st = parseReviewItemState(row.reviewStateJson);
      if (st.phase === "answered" || st.phase === "rated") {
        timedBehaviors.push({ mode: "review", timedOut: Boolean(st.timedOut), timeTakenSec: st.timeTakenSec ?? null });
      }
    }
  }

  return {
    sessions: sessions.map((s) => ({ id: s.id, endedAt: s.endedAt, mode: s.mode })),
    answers: mappedAnswers,
    timedBehaviors,
    dueBacklog,
  };
}

export type AnalysisPageData = {
  hasUser: boolean;
  stats7d: ReturnType<typeof aggregateRecentLearningStats>;
  stats30d: ReturnType<typeof aggregateRecentLearningStats>;
  weakTopics: ReturnType<typeof rankWeakTopics>;
  errorPatterns: ReturnType<typeof classifyErrorPatterns>;
  nextSteps: ReturnType<typeof recommendNextActionsFromAnalysis>;
  weekly: WeeklyReportDeterministicData;
};

export async function getAnalysisPageData(): Promise<AnalysisPageData> {
  const user = await getOrCreateDevUser();
  const userId = user?.id ?? null;

  const [d7, d30, learnDashboard] = await Promise.all([
    loadWindowData(userId, 7),
    loadWindowData(userId, 30),
    getLearnDashboardData(),
  ]);

  const stats7d = aggregateRecentLearningStats({
    windowDays: 7,
    sessions: d7.sessions,
    answers: d7.answers,
    timedBehaviors: d7.timedBehaviors,
    dueBacklog: d7.dueBacklog,
  });
  const stats30d = aggregateRecentLearningStats({
    windowDays: 30,
    sessions: d30.sessions,
    answers: d30.answers,
    timedBehaviors: d30.timedBehaviors,
    dueBacklog: d30.dueBacklog,
  });

  const weakTopics = rankWeakTopics({ answers: d30.answers, topN: 5 });
  const errorPatterns = classifyErrorPatterns({ answers: d30.answers, timedBehaviors: d30.timedBehaviors });
  const nextSteps = recommendNextActionsFromAnalysis({
    learningPathTasks: learnDashboard.tasks,
    weakTopics,
    stats7d,
  });
  const weekly = buildWeeklyReportData({ stats7d, stats30d, weakTopics, nextActions: nextSteps });

  return {
    hasUser: userId != null,
    stats7d,
    stats30d,
    weakTopics,
    errorPatterns,
    nextSteps,
    weekly,
  };
}

export type AnalysisWrongAnswerExportRow = {
  answeredAt: string;
  topicSnapshot: string;
  topicKeySnapshot: string;
  questionTextSnapshot: string;
  correctAnswerSnapshot: string;
  userChoice: string;
  explanationSnapshot: string;
};

export async function getRecentWrongAnswersForExport(params?: {
  days?: AnalysisWindowDays;
  limit?: number;
}): Promise<AnalysisWrongAnswerExportRow[]> {
  const user = await getOrCreateDevUser();
  if (!user) {
    return [];
  }
  const days = params?.days ?? 30;
  const limit = params?.limit ?? 200;
  const windowStart = toWindowStart(days);

  const rows = await prisma.answerHistory.findMany({
    where: {
      isCorrect: false,
      session: {
        endedAt: { gte: windowStart },
      },
    },
    orderBy: { answeredAt: "desc" },
    take: limit,
    include: {
      question: { select: { questionText: true, topic: true, correctAnswer: true } },
    },
  });

  return rows.map((r) => ({
    answeredAt: r.answeredAt.toISOString(),
    topicSnapshot: resolveTopicDisplay(r.topicSnapshot, r.question.topic),
    topicKeySnapshot: r.topicKeySnapshot ?? "",
    questionTextSnapshot: resolveStemDisplay(r.stemSnapshot, r.question.questionText),
    correctAnswerSnapshot: resolveCorrectAnswerLetter(r.correctAnswerSnapshot, r.question.correctAnswer),
    userChoice: r.selectedAnswer,
    explanationSnapshot: r.explanationSnapshot ?? "",
  }));
}

export {
  aggregateRecentLearningStats,
  buildWeeklyReportData,
  classifyErrorPatterns,
  rankWeakTopics,
  recommendNextActionsFromAnalysis,
};
