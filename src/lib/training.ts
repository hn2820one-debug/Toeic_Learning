import type { Prisma } from "../../generated/prisma";

import { prisma } from "@/lib/prisma";

type SearchParamValue = string | string[] | undefined;

const VALID_ANSWER_CHOICES = ["A", "B", "C", "D"] as const;

export const TRAINING_QUESTION_LIMIT = 5;

export type AnswerChoice = (typeof VALID_ANSWER_CHOICES)[number];

export type TrainingNotice =
  | "invalid-answer"
  | "invalid-question"
  | "invalid-session"
  | "no-questions";

export type TrainingPageSearchParams = {
  session?: SearchParamValue;
  ids?: SearchParamValue;
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

export type TrainingPageState =
  | (TrainingPageStateBase & { status: "empty" })
  | (TrainingPageStateBase & { status: "idle" })
  | (TrainingPageStateBase & { status: "invalid"; reason: string })
  | (TrainingPageStateBase & {
      status: "active";
      sessionId: number;
      questionIds: number[];
      questionIdsParam: string;
      questionNumber: number;
      totalQuestions: number;
      question: TrainingQuestion;
    })
  | (TrainingPageStateBase & {
      status: "completed";
      session: TrainingSessionSummary;
      questionIds: number[];
      questionIdsParam: string;
    });

export type SubmitTrainingAnswerInput = {
  sessionId: string | null;
  questionId: string | null;
  questionIds: string | null;
  selectedAnswer: string | null;
};

export type SubmitTrainingAnswerResult = {
  ok: boolean;
  sessionId?: number;
  questionIds: number[];
  notice?: TrainingNotice;
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

function shuffleArray<T>(items: T[]) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function getAccuracy(correctCount: number, totalQuestions: number) {
  if (totalQuestions === 0) {
    return 0;
  }

  return Math.round((correctCount / totalQuestions) * 100);
}

export function parseQuestionIds(rawValue: string | undefined) {
  if (!rawValue) {
    return [];
  }

  return Array.from(
    new Set(
      rawValue
        .split(",")
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  ).slice(0, TRAINING_QUESTION_LIMIT);
}

export function serializeQuestionIds(questionIds: number[]) {
  return questionIds.join(",");
}

export function getTrainingHref(options?: {
  sessionId?: number;
  questionIds?: number[];
  notice?: TrainingNotice;
}) {
  const searchParams = new URLSearchParams();

  if (options?.sessionId) {
    searchParams.set("session", String(options.sessionId));
  }

  if (options?.questionIds && options.questionIds.length > 0) {
    searchParams.set("ids", serializeQuestionIds(options.questionIds));
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

export async function pickTrainingQuestionIds(limit = TRAINING_QUESTION_LIMIT) {
  const records = await prisma.questionBankItem.findMany({
    select: { id: true },
  });

  return shuffleArray(records.map(({ id }) => id)).slice(0, limit);
}

export async function createStudySession() {
  return prisma.studySession.create({
    data: {
      startedAt: new Date(),
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
  const questionIds = parseQuestionIds(normalizeParam(searchParams?.ids));

  if (!sessionId && questionIds.length === 0) {
    return {
      status: "idle",
      availableQuestionCount,
      noticeMessage,
    };
  }

  if (!sessionId || questionIds.length === 0) {
    return {
      status: "invalid",
      availableQuestionCount,
      noticeMessage,
      reason: "The training link is incomplete.",
    };
  }

  const [session, answers, questions] = await Promise.all([
    prisma.studySession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        totalQuestions: true,
        correctCount: true,
      },
    }),
    prisma.answerHistory.findMany({
      where: { sessionId },
      select: { questionId: true },
      orderBy: { answeredAt: "asc" },
    }),
    prisma.questionBankItem.findMany({
      where: { id: { in: questionIds } },
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
  ]);

  if (!session) {
    return {
      status: "invalid",
      availableQuestionCount,
      noticeMessage,
      reason: "The requested training session does not exist.",
    };
  }

  const questionMap = new Map(questions.map((question) => [question.id, question]));
  if (questionMap.size !== questionIds.length) {
    return {
      status: "invalid",
      availableQuestionCount,
      noticeMessage,
      reason: "One or more questions from this session are no longer available.",
    };
  }

  const answeredQuestionIds = new Set(answers.map((answer) => answer.questionId));
  const answeredCount = answers.length;
  const totalQuestions = questionIds.length;

  if (session.endedAt || answeredCount >= totalQuestions) {
    return {
      status: "completed",
      availableQuestionCount,
      noticeMessage,
      questionIds,
      questionIdsParam: serializeQuestionIds(questionIds),
      session: {
        id: session.id,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        totalQuestions,
        correctCount: session.correctCount,
        accuracy: getAccuracy(session.correctCount, totalQuestions),
      },
    };
  }

  const nextQuestionId = questionIds.find((questionId) => !answeredQuestionIds.has(questionId));
  const question = nextQuestionId ? questionMap.get(nextQuestionId) : undefined;

  if (!question) {
    return {
      status: "invalid",
      availableQuestionCount,
      noticeMessage,
      reason: "The next question could not be loaded.",
    };
  }

  return {
    status: "active",
    availableQuestionCount,
    noticeMessage,
    sessionId: session.id,
    questionIds,
    questionIdsParam: serializeQuestionIds(questionIds),
    questionNumber: answeredCount + 1,
    totalQuestions,
    question,
  };
}

export async function submitTrainingAnswer(input: SubmitTrainingAnswerInput): Promise<SubmitTrainingAnswerResult> {
  const sessionId = parsePositiveInt(input.sessionId ?? undefined);
  const questionId = parsePositiveInt(input.questionId ?? undefined);
  const questionIds = parseQuestionIds(input.questionIds ?? undefined);
  const selectedAnswer = normalizeAnswerChoice(input.selectedAnswer);

  if (!sessionId || questionIds.length === 0) {
    return {
      ok: false,
      questionIds,
      notice: "invalid-session",
    };
  }

  if (!questionId) {
    return {
      ok: false,
      sessionId,
      questionIds,
      notice: "invalid-question",
    };
  }

  if (!selectedAnswer) {
    return {
      ok: false,
      sessionId,
      questionIds,
      notice: "invalid-answer",
    };
  }

  if (!questionIds.includes(questionId)) {
    return {
      ok: false,
      sessionId,
      questionIds,
      notice: "invalid-question",
    };
  }

  const [session, answers, question] = await Promise.all([
    prisma.studySession.findUnique({
      where: { id: sessionId },
      select: { id: true, endedAt: true },
    }),
    prisma.answerHistory.findMany({
      where: { sessionId },
      select: { questionId: true },
      orderBy: { answeredAt: "asc" },
    }),
    prisma.questionBankItem.findUnique({
      where: { id: questionId },
      select: { id: true, correctAnswer: true },
    }),
  ]);

  if (!session || session.endedAt) {
    return {
      ok: false,
      sessionId,
      questionIds,
      notice: "invalid-session",
    };
  }

  if (!question) {
    return {
      ok: false,
      sessionId,
      questionIds,
      notice: "invalid-question",
    };
  }

  const answeredQuestionIds = new Set(answers.map((answer) => answer.questionId));
  const nextQuestionId = questionIds.find((id) => !answeredQuestionIds.has(id));

  if (answeredQuestionIds.has(questionId) || nextQuestionId !== questionId) {
    return {
      ok: false,
      sessionId,
      questionIds,
      notice: "invalid-question",
    };
  }

  const isCorrect = question.correctAnswer === selectedAnswer;
  const isLastQuestion = answers.length + 1 >= questionIds.length;
  const now = new Date();

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.answerHistory.create({
        data: {
          sessionId,
          questionId,
          selectedAnswer,
          isCorrect,
        },
      });

      const updateData: Prisma.StudySessionUpdateInput = {
        correctCount: { increment: isCorrect ? 1 : 0 },
        ...(isLastQuestion
          ? {
              endedAt: now,
              totalQuestions: questionIds.length,
            }
          : {}),
      };

      await transaction.studySession.update({
        where: { id: sessionId },
        data: updateData,
      });
    });
  } catch {
    return {
      ok: false,
      sessionId,
      questionIds,
      notice: "invalid-question",
    };
  }

  return {
    ok: true,
    sessionId,
    questionIds,
  };
}