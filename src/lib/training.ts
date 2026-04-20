import type { Prisma } from "../../generated/prisma";

import { updateElo } from "./elo";
import {
  applyRating,
  previewIntervals,
  Rating,
  type IntervalPreview,
  type RatingName as FsrsRatingName,
  type SchedulerRating,
} from "./fsrs";
import { getDevUserIdForSession } from "./dev-user";
import { prisma } from "./prisma";
import { composeSession } from "./session-composer";
import { buildAnswerHistorySnapshotData } from "./answer-history-snapshots";

type SearchParamValue = string | string[] | undefined;

const VALID_ANSWER_CHOICES = ["A", "B", "C", "D"] as const;
const VALID_RATING_NAMES = ["Again", "Hard", "Good", "Easy"] as const;
const RATING_VALUE_MAP: Record<FsrsRatingName, SchedulerRating> = {
  Again: Rating.Again,
  Hard: Rating.Hard,
  Good: Rating.Good,
  Easy: Rating.Easy,
};

export const TRAINING_QUESTION_LIMIT = 5;
export const ACTIVE_SESSION_COOKIE_NAME = "activeSessionId";
export const ACTIVE_SESSION_COOKIE_MAX_AGE_SECONDS = 2 * 24 * 60 * 60;

export type AnswerChoice = (typeof VALID_ANSWER_CHOICES)[number];

export type TrainingNotice =
  | "invalid-answer"
  | "invalid-question"
  | "invalid-session"
  | "no-questions";

export type TrainingPageSearchParams = {
  session?: SearchParamValue;
  notice?: SearchParamValue;
};

type TrainingQuestion = {
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
};

type TrainingSessionSummary = {
  id: number;
  startedAt: Date;
  endedAt: Date | null;
  totalQuestions: number;
  correctCount: number;
  accuracy: number;
};

type TrainingPageStateBase = {
  availableQuestionCount: number;
  noticeMessage: string | null;
};

export type ActiveSessionBannerState = {
  sessionId: number;
  answeredCount: number;
  targetCount: number;
};

export type TrainingPageState =
  | (TrainingPageStateBase & { status: "empty" })
  | (TrainingPageStateBase & { status: "idle" })
  | (TrainingPageStateBase & { status: "invalid"; reason: string })
  | (TrainingPageStateBase & {
      status: "active";
      sessionId: number;
      sessionQuestionId: string;
      questionNumber: number;
      totalQuestions: number;
      question: TrainingQuestion;
    })
  | (TrainingPageStateBase & {
      status: "reveal";
      sessionId: number;
      sessionQuestionId: string;
      questionNumber: number;
      totalQuestions: number;
      question: TrainingQuestion;
      userChoice: AnswerChoice;
      isCorrect: boolean;
      timeTakenSec: number | null;
      intervalPreviews: Record<FsrsRatingName, IntervalPreview>;
    })
  | (TrainingPageStateBase & {
      status: "completed";
      session: TrainingSessionSummary;
    });

export type SubmitTrainingChoiceInput = {
  sessionId: string | null;
  sessionQuestionId: string | null;
  questionId: string | null;
  selectedAnswer: string | null;
};

export type SubmitTrainingAnswerInput = {
  sessionQuestionId: string | null;
  userChoice: string | null;
  rating: string | null;
  timeTakenSec: string | null;
};

export type SubmitTrainingAnswerResult = {
  ok: boolean;
  sessionId?: number;
  notice?: TrainingNotice;
  sessionCompleted?: boolean;
};

function normalizeParam(value: SearchParamValue) {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (!normalized) {
    return undefined;
  }

  const trimmed = normalized.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parsePositiveInt(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function normalizeAnswerChoice(value: string | null) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toUpperCase() as AnswerChoice;
  return VALID_ANSWER_CHOICES.includes(normalized) ? normalized : undefined;
}

function normalizeFsrsRating(value: string | null) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim() as FsrsRatingName;
  return VALID_RATING_NAMES.includes(normalized) ? normalized : undefined;
}

function normalizeSessionQuestionId(value: string | null) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseNonNegativeInt(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function getAccuracy(correctCount: number, totalQuestions: number) {
  if (totalQuestions === 0) {
    return 0;
  }

  return Math.round((correctCount / totalQuestions) * 100);
}

export function getTrainingHref(options?: {
  sessionId?: number;
  notice?: TrainingNotice;
}) {
  const searchParams = new URLSearchParams();

  if (options?.sessionId) {
    searchParams.set("session", String(options.sessionId));
  }

  if (options?.notice) {
    searchParams.set("notice", options.notice);
  }

  const queryString = searchParams.toString();
  return queryString.length > 0 ? `/training?${queryString}` : "/training";
}

export function getTrainingNoticeMessage(notice?: string) {
  switch (notice) {
    case "invalid-answer":
      return "Please choose one answer before moving to the next question.";
    case "invalid-question":
      return "That question submission was not valid for the current session.";
    case "invalid-session":
      return "The training session could not be restored. Start a new run.";
    case "no-questions":
      return "No training questions are available yet. Seed or import questions first.";
    default:
      return null;
  }
}

export async function getActiveSessionBannerState(sessionIdValue: string | undefined): Promise<ActiveSessionBannerState | null> {
  const sessionId = parsePositiveInt(sessionIdValue);

  if (!sessionId) {
    return null;
  }

  const [session, answeredCount] = await Promise.all([
    prisma.studySession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        endedAt: true,
        abandonedAt: true,
        targetCount: true,
        totalQuestions: true,
      },
    }),
    prisma.studySessionQuestion.count({
      where: {
        sessionId,
        answeredAt: { not: null },
      },
    }),
  ]);

  if (!session || session.endedAt || session.abandonedAt) {
    return null;
  }

  const targetCount = session.targetCount > 0 ? session.targetCount : session.totalQuestions;

  return {
    sessionId: session.id,
    answeredCount,
    targetCount,
  };
}

export async function pickTrainingQuestionIds(limit = TRAINING_QUESTION_LIMIT) {
  return composeSession(limit);
}

export async function createStudySession(questionIds: number[]) {
  const userId = await getDevUserIdForSession();

  return prisma.studySession.create({
    data: {
      ...(userId !== undefined ? { userId } : {}),
      startedAt: new Date(),
      mode: "quick",
      targetCount: questionIds.length,
      totalQuestions: questionIds.length,
      items: {
        create: questionIds.map((questionId, index) => ({
          questionId,
          position: index + 1,
        })),
      },
    },
    select: { id: true },
  });
}

export async function getTrainingPageState(searchParams?: TrainingPageSearchParams): Promise<TrainingPageState> {
  const notice = normalizeParam(searchParams?.notice);
  const noticeMessage = getTrainingNoticeMessage(notice);
  const availableQuestionCount = await prisma.questionBankItem.count();

  if (availableQuestionCount === 0) {
    return {
      status: "empty",
      availableQuestionCount,
      noticeMessage,
    };
  }

  const sessionId = parsePositiveInt(normalizeParam(searchParams?.session));

  if (!sessionId) {
    return {
      status: "idle",
      availableQuestionCount,
      noticeMessage,
    };
  }

  const [session, totalQuestions, answeredCount, nextItem] = await Promise.all([
    prisma.studySession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        abandonedAt: true,
        totalQuestions: true,
        targetCount: true,
        correctCount: true,
      },
    }),
    prisma.studySessionQuestion.count({
      where: { sessionId },
    }),
    prisma.studySessionQuestion.count({
      where: {
        sessionId,
        answeredAt: { not: null },
      },
    }),
    prisma.studySessionQuestion.findFirst({
      where: {
        sessionId,
        answeredAt: null,
      },
      orderBy: { position: "asc" },
      select: {
        id: true,
        position: true,
        shownAt: true,
        userChoice: true,
        correct: true,
        timeTakenSec: true,
        question: {
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
        },
      },
    }),
  ]);

  if (!session) {
    return {
      status: "invalid",
      availableQuestionCount,
      noticeMessage,
      reason: "The requested training session does not exist.",
    };
  }

  if (session.abandonedAt) {
    return {
      status: "invalid",
      availableQuestionCount,
      noticeMessage,
      reason: "This training session was abandoned.",
    };
  }

  if (totalQuestions === 0) {
    return {
      status: "invalid",
      availableQuestionCount,
      noticeMessage,
      reason: "This training session does not have any queued questions.",
    };
  }

  if (session.endedAt || answeredCount >= totalQuestions) {
    return {
      status: "completed",
      availableQuestionCount,
      noticeMessage,
      session: {
        id: session.id,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        totalQuestions: session.totalQuestions > 0 ? session.totalQuestions : session.targetCount > 0 ? session.targetCount : totalQuestions,
        correctCount: session.correctCount,
        accuracy: getAccuracy(
          session.correctCount,
          session.totalQuestions > 0 ? session.totalQuestions : session.targetCount > 0 ? session.targetCount : totalQuestions,
        ),
      },
    };
  }

  if (!nextItem) {
    return {
      status: "invalid",
      availableQuestionCount,
      noticeMessage,
      reason: "The next question could not be loaded.",
    };
  }

  if (nextItem.userChoice) {
    const intervalPreviews = await previewIntervals(nextItem.question.id);

    return {
      status: "reveal",
      availableQuestionCount,
      noticeMessage,
      sessionId: session.id,
      sessionQuestionId: nextItem.id,
      questionNumber: nextItem.position,
      totalQuestions,
      question: nextItem.question,
      userChoice: nextItem.userChoice as AnswerChoice,
      isCorrect: nextItem.correct ?? nextItem.question.correctAnswer === nextItem.userChoice,
      timeTakenSec: nextItem.timeTakenSec ?? null,
      intervalPreviews,
    };
  }

  if (!nextItem.shownAt) {
    await prisma.studySessionQuestion.update({
      where: { id: nextItem.id },
      data: { shownAt: new Date() },
    });
  }

  return {
    status: "active",
    availableQuestionCount,
    noticeMessage,
    sessionId: session.id,
    sessionQuestionId: nextItem.id,
    questionNumber: nextItem.position,
    totalQuestions,
    question: nextItem.question,
  };
}

export async function recordTrainingAnswerChoice(input: SubmitTrainingChoiceInput): Promise<SubmitTrainingAnswerResult> {
  const sessionId = parsePositiveInt(input.sessionId ?? undefined);
  const sessionQuestionId = normalizeSessionQuestionId(input.sessionQuestionId);
  const questionId = parsePositiveInt(input.questionId ?? undefined);
  const selectedAnswer = normalizeAnswerChoice(input.selectedAnswer);

  if (!sessionId || !sessionQuestionId) {
    return {
      ok: false,
      notice: "invalid-session",
    };
  }

  if (!questionId) {
    return {
      ok: false,
      sessionId,
      notice: "invalid-question",
    };
  }

  if (!selectedAnswer) {
    return {
      ok: false,
      sessionId,
      notice: "invalid-answer",
    };
  }

  const [session, nextItem] = await Promise.all([
    prisma.studySession.findUnique({
      where: { id: sessionId },
      select: { id: true, endedAt: true, abandonedAt: true },
    }),
    prisma.studySessionQuestion.findFirst({
      where: {
        sessionId,
        answeredAt: null,
      },
      orderBy: { position: "asc" },
      select: {
        id: true,
        questionId: true,
        shownAt: true,
        userChoice: true,
        question: {
          select: {
            id: true,
            questionText: true,
            optionA: true,
            optionB: true,
            optionC: true,
            optionD: true,
            correctAnswer: true,
            topic: true,
            difficulty: true,
          },
        },
      },
    }),
  ]);

  if (!session || session.endedAt || session.abandonedAt) {
    return {
      ok: false,
      sessionId,
      notice: "invalid-session",
    };
  }

  if (!nextItem) {
    return {
      ok: false,
      sessionId,
      notice: "invalid-question",
    };
  }

  if (nextItem.id !== sessionQuestionId || nextItem.questionId !== questionId || nextItem.userChoice) {
    return {
      ok: false,
      sessionId,
      notice: "invalid-question",
    };
  }

  const isCorrect = nextItem.question.correctAnswer === selectedAnswer;
  const now = new Date();
  const timeTakenSec = nextItem.shownAt
    ? Math.max(0, Math.round((now.getTime() - nextItem.shownAt.getTime()) / 1000))
    : null;

  try {
    await prisma.studySessionQuestion.update({
      where: { id: nextItem.id },
      data: {
        correct: isCorrect,
        userChoice: selectedAnswer,
        timeTakenSec,
      },
    });
  } catch {
    return {
      ok: false,
      sessionId,
      notice: "invalid-question",
    };
  }

  return {
    ok: true,
    sessionId,
  };
}

export async function submitTrainingAnswer(input: SubmitTrainingAnswerInput): Promise<SubmitTrainingAnswerResult> {
  const sessionQuestionId = normalizeSessionQuestionId(input.sessionQuestionId);
  const userChoice = normalizeAnswerChoice(input.userChoice);
  const rating = normalizeFsrsRating(input.rating);
  const timeTakenSecInput = parseNonNegativeInt(input.timeTakenSec);

  if (!sessionQuestionId || !userChoice || !rating) {
    return {
      ok: false,
      notice: "invalid-question",
    };
  }

  const sessionItem = await prisma.studySessionQuestion.findUnique({
    where: { id: sessionQuestionId },
    select: {
      id: true,
      sessionId: true,
      questionId: true,
      shownAt: true,
      answeredAt: true,
      userChoice: true,
      correct: true,
      timeTakenSec: true,
      position: true,
      session: {
        select: {
          id: true,
          endedAt: true,
          abandonedAt: true,
        },
      },
      question: {
        select: {
          id: true,
          questionText: true,
          optionA: true,
          optionB: true,
          optionC: true,
          optionD: true,
          correctAnswer: true,
          topic: true,
          difficulty: true,
          explanation: true,
          skillKey: true,
          topicKey: true,
          moduleKey: true,
        },
      },
    },
  });

  if (!sessionItem || !sessionItem.session || sessionItem.session.endedAt || sessionItem.session.abandonedAt) {
    return {
      ok: false,
      notice: "invalid-session",
    };
  }

  const nextPendingItem = await prisma.studySessionQuestion.findFirst({
    where: {
      sessionId: sessionItem.sessionId,
      answeredAt: null,
    },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  const unansweredCount = await prisma.studySessionQuestion.count({
    where: {
      sessionId: sessionItem.sessionId,
      answeredAt: null,
    },
  });

  if (
    !nextPendingItem ||
    nextPendingItem.id !== sessionQuestionId ||
    sessionItem.answeredAt ||
    sessionItem.userChoice !== userChoice
  ) {
    return {
      ok: false,
      sessionId: sessionItem.sessionId,
      notice: "invalid-question",
    };
  }

  const isCorrect = sessionItem.correct ?? sessionItem.question.correctAnswer === userChoice;
  const isLastQuestion = unansweredCount <= 1;
  const now = new Date();
  const timeTakenSec =
    timeTakenSecInput ??
    sessionItem.timeTakenSec ??
    (sessionItem.shownAt ? Math.max(0, Math.round((now.getTime() - sessionItem.shownAt.getTime()) / 1000)) : null);

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.answerHistory.create({
        data: {
          sessionId: sessionItem.sessionId,
          questionId: sessionItem.questionId,
          selectedAnswer: userChoice,
          isCorrect,
          ...buildAnswerHistorySnapshotData(sessionItem.question),
        },
      });

      await transaction.studySessionQuestion.update({
        where: { id: sessionItem.id },
        data: {
          answeredAt: now,
          rating,
          correct: isCorrect,
          userChoice,
          timeTakenSec,
        },
      });

      const updateData: Prisma.StudySessionUpdateInput = {
        correctCount: { increment: isCorrect ? 1 : 0 },
        ...(isLastQuestion
          ? {
              endedAt: now,
            }
          : {}),
      };

      await transaction.studySession.update({
        where: { id: sessionItem.sessionId },
        data: updateData,
      });
    });
  } catch {
    return {
      ok: false,
      sessionId: sessionItem.sessionId,
      notice: "invalid-question",
    };
  }

  try {
    await applyRating(sessionItem.questionId, RATING_VALUE_MAP[rating]);
  } catch (error) {
    console.error("FSRS applyRating failed:", error);
  }

  try {
    await updateElo(sessionItem.questionId, sessionItem.question.topic, sessionItem.question.difficulty, isCorrect);
  } catch (error) {
    console.error("ELO update failed:", error);
  }

  return {
    ok: true,
    sessionId: sessionItem.sessionId,
    sessionCompleted: isLastQuestion,
  };
}

export async function abandonStudySession(sessionIdValue: string | null | undefined) {
  const sessionId = parsePositiveInt(sessionIdValue ?? undefined);

  if (!sessionId) {
    return false;
  }

  const session = await prisma.studySession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      endedAt: true,
      abandonedAt: true,
    },
  });

  if (!session || session.endedAt || session.abandonedAt) {
    return false;
  }

  await prisma.studySession.update({
    where: { id: sessionId },
    data: {
      abandonedAt: new Date(),
    },
  });

  return true;
}