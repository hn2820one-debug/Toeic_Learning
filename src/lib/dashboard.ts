import { prisma } from "@/lib/prisma";
import { ELO_USER_GLOBAL_KEY } from "@/lib/elo";
import { getQueueStats, NEW_CARD_DAILY_CAP } from "@/lib/fsrs";

const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const READING_ESTIMATE_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
const MIN_ANSWERS_FOR_READING_ESTIMATE = 5;

export type DashboardCardData = {
  questionBankCount: number;
  completedSessionCount: number;
  activeSessionCount: number;
  totalAnswerCount: number;
  recentAnswerCount: number;
  recentAccuracy: number | null;
};

export type DashboardRecentSession = {
  id: number;
  endedAt: Date;
  totalQuestions: number;
  correctCount: number;
  accuracy: number;
};

export type DashboardData = DashboardCardData & {
  recentSessions: DashboardRecentSession[];
  /** FSRS due queue: Review + Relearning, due now (matches `getQueueStats` / Prompt 22 spec). */
  dueReviewCount: number;
  /** Remaining slots out of `NEW_CARD_DAILY_CAP` for first-time new-card reviews completed today. */
  newCardsRemainingToday: number;
  newCardsDailyCap: number;
  userGlobalElo: number | null;
  userGlobalEloDeltaLabel: "no recent delta";
  estimatedReadingDisplay: string;
  estimatedReadingSubtext: string;
  llmCallsThisMonth: number;
};

function getAccuracy(correctCount: number, totalQuestions: number) {
  if (totalQuestions === 0) {
    return 0;
  }

  return Math.round((correctCount / totalQuestions) * 100);
}

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function startOfLocalMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * First FSRS review ever for a question (transition off the "New" queue) — only logged after full rating submit (`applyRating`), not reveal-only.
 */
async function countFirstNewCardReviewsToday(now: Date) {
  const dayStart = startOfLocalDay(now);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const rows = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) AS count
    FROM review_log rl
    INNER JOIN (
      SELECT "questionId", MIN(review) AS fr
      FROM review_log
      GROUP BY "questionId"
    ) t ON rl."questionId" = t."questionId" AND rl.review = t.fr
    WHERE rl.review >= ${dayStart} AND rl.review < ${dayEnd}
  `;

  return Number(rows[0]?.count ?? 0);
}

export async function getDashboardData(now = new Date()): Promise<DashboardData> {
  const windowStart = new Date(now.getTime() - RECENT_WINDOW_MS);

  const window90Start = new Date(now.getTime() - READING_ESTIMATE_WINDOW_MS);
  const monthStart = startOfLocalMonth(now);

  const [
    questionBankCount,
    completedSessionCount,
    activeSessionCount,
    totalAnswerCount,
    recentAnswerCount,
    recentCorrectCount,
    recentSessions,
    queueStats,
    firstNewReviewsToday,
    eloGlobal,
    answers90Correct,
    answers90Total,
    llmCallsThisMonth,
  ] = await Promise.all([
    prisma.questionBankItem.count(),
    prisma.studySession.count({
      where: {
        endedAt: { not: null },
        abandonedAt: null,
      },
    }),
    prisma.studySession.count({
      where: {
        endedAt: null,
        abandonedAt: null,
      },
    }),
    prisma.answerHistory.count(),
    prisma.answerHistory.count({
      where: {
        answeredAt: { gte: windowStart },
      },
    }),
    prisma.answerHistory.count({
      where: {
        answeredAt: { gte: windowStart },
        isCorrect: true,
      },
    }),
    prisma.studySession.findMany({
      where: {
        endedAt: { not: null },
        abandonedAt: null,
      },
      orderBy: [{ endedAt: "desc" }, { id: "desc" }],
      take: 5,
      select: {
        id: true,
        endedAt: true,
        totalQuestions: true,
        targetCount: true,
        correctCount: true,
      },
    }),
    getQueueStats(),
    countFirstNewCardReviewsToday(now),
    prisma.eloState.findUnique({
      where: {
        kind_subjectId: {
          kind: ELO_USER_GLOBAL_KEY.kind,
          subjectId: ELO_USER_GLOBAL_KEY.subjectId,
        },
      },
      select: { rating: true },
    }),
    prisma.answerHistory.count({
      where: {
        answeredAt: { gte: window90Start },
        isCorrect: true,
      },
    }),
    prisma.answerHistory.count({
      where: {
        answeredAt: { gte: window90Start },
      },
    }),
    prisma.llmUsageLog.count({
      where: {
        createdAt: { gte: monthStart },
      },
    }),
  ]);

  const newIntroducedToday = firstNewReviewsToday;
  const newRemaining = Math.max(0, NEW_CARD_DAILY_CAP - newIntroducedToday);

  let estimatedReadingDisplay = "—";
  let estimatedReadingSubtext = "rough estimate, not official";

  if (answers90Total >= MIN_ANSWERS_FOR_READING_ESTIMATE) {
    const acc = (answers90Correct / answers90Total) * 100;
    const center = Math.min(475, Math.max(100, Math.round(150 + (acc / 100) * 300)));
    estimatedReadingDisplay = `${center} ± 25`;
  } else {
    estimatedReadingDisplay = "Not enough data";
    estimatedReadingSubtext = `need ≥${MIN_ANSWERS_FOR_READING_ESTIMATE} answers in 90d · rough estimate, not official`;
  }

  return {
    questionBankCount,
    completedSessionCount,
    activeSessionCount,
    totalAnswerCount,
    recentAnswerCount,
    recentAccuracy: recentAnswerCount > 0 ? getAccuracy(recentCorrectCount, recentAnswerCount) : null,
    dueReviewCount: queueStats.dueCount,
    newCardsRemainingToday: newRemaining,
    newCardsDailyCap: NEW_CARD_DAILY_CAP,
    userGlobalElo: eloGlobal?.rating ?? null,
    userGlobalEloDeltaLabel: "no recent delta",
    estimatedReadingDisplay,
    estimatedReadingSubtext,
    llmCallsThisMonth,
    recentSessions: recentSessions
      .filter((session): session is typeof session & { endedAt: Date } => session.endedAt !== null)
      .map((session) => {
        const totalQuestions = session.totalQuestions > 0 ? session.totalQuestions : session.targetCount;

        return {
          id: session.id,
          endedAt: session.endedAt,
          totalQuestions,
          correctCount: session.correctCount,
          accuracy: getAccuracy(session.correctCount, totalQuestions),
        };
      }),
  };
}
