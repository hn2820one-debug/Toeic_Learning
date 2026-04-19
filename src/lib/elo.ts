import "server-only";

import { prisma } from "./prisma";

const DEFAULT_USER_RATING = 1500;
/** Used with `kind: "user_global"` for the single local learner ELO row (see `getOrCreateUserRating`). */
export const USER_GLOBAL_SUBJECT_ID = "singleton";

/** Lookup keys for dashboard / read-only ELO — do not invent new subject ids. */
export const ELO_USER_GLOBAL_KEY = {
  kind: "user_global" as const,
  subjectId: USER_GLOBAL_SUBJECT_ID,
};
const ITEM_BASE_RATING = {
  A: 1400,
  B: 1500,
  C: 1600,
} as const;
const MAX_K = 32;
const MIN_K = 16;
const ITEM_ANCHOR_THRESHOLD = 5;
const STALE_ITEM_DAYS = 60;
const STALE_DECAY_SHARE = 0.25;
const ITEM_ANCHOR_INTERVAL = 50;

type UserRatingKind = "user_global" | "user_topic";
type DifficultyBand = keyof typeof ITEM_BASE_RATING;

/** Normalized topic string used as `EloState.subjectId` for `kind: "user_topic"`. */
export function normalizeTopic(topic: string) {
  const normalized = topic.trim();
  return normalized.length > 0 ? normalized : "General";
}

function normalizeDifficulty(difficulty: string): DifficultyBand {
  const normalized = difficulty.trim().toUpperCase();

  switch (normalized) {
    case "A":
    case "B":
    case "C":
      return normalized;
    default:
      return "B";
  }
}

function getInitialItemRating(difficulty: string) {
  return ITEM_BASE_RATING[normalizeDifficulty(difficulty)];
}

function getKFactor(n: number) {
  return Math.max(MIN_K, MAX_K - Math.floor(n / 5) * 4);
}

function getExpectedScore(playerRating: number, opponentRating: number) {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

function clampRating(rating: number) {
  return Math.max(100, Math.min(3000, Number(rating.toFixed(2))));
}

function parseItemSubjectId(subjectId: string) {
  const parsed = Number.parseInt(subjectId, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function getOrCreateRating(kind: string, subjectId: string, initialRating: number) {
  return prisma.eloState.upsert({
    where: { kind_subjectId: { kind, subjectId } },
    create: {
      kind,
      subjectId,
      rating: initialRating,
    },
    update: {},
  });
}

export async function getOrCreateUserRating(kind: UserRatingKind, subjectId?: string) {
  const normalizedSubjectId =
    kind === "user_global" ? USER_GLOBAL_SUBJECT_ID : normalizeTopic(subjectId ?? "");

  return getOrCreateRating(kind, normalizedSubjectId, DEFAULT_USER_RATING);
}

export async function getOrCreateItemRating(questionId: number, difficulty: string) {
  return getOrCreateRating("item", String(questionId), getInitialItemRating(difficulty));
}

export async function anchorItemMean() {
  const summary = await prisma.eloState.aggregate({
    where: { kind: "item" },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const itemCount = summary._count._all;
  const meanRating = summary._avg.rating;

  if (itemCount === 0 || meanRating === null) {
    return {
      itemCount: 0,
      anchored: false,
      shiftApplied: 0,
      meanBefore: null,
    };
  }

  const shiftApplied = DEFAULT_USER_RATING - meanRating;
  if (Math.abs(shiftApplied) < ITEM_ANCHOR_THRESHOLD) {
    return {
      itemCount,
      anchored: false,
      shiftApplied: 0,
      meanBefore: meanRating,
    };
  }

  const items = await prisma.eloState.findMany({
    where: { kind: "item" },
    select: { id: true, rating: true },
  });

  await prisma.$transaction(
    items.map((item) =>
      prisma.eloState.update({
        where: { id: item.id },
        data: {
          rating: clampRating(item.rating + shiftApplied),
        },
      }),
    ),
  );

  return {
    itemCount,
    anchored: true,
    shiftApplied,
    meanBefore: meanRating,
  };
}

export async function decayStaleItems() {
  const cutoff = new Date(Date.now() - STALE_ITEM_DAYS * 24 * 60 * 60 * 1000);
  const staleItems = await prisma.eloState.findMany({
    where: {
      kind: "item",
      updatedAt: { lte: cutoff },
    },
    select: { id: true, subjectId: true, rating: true },
  });

  if (staleItems.length === 0) {
    return {
      staleCount: 0,
      updatedCount: 0,
    };
  }

  const questionIds = Array.from(
    new Set(
      staleItems
        .map((item) => parseItemSubjectId(item.subjectId))
        .filter((value): value is number => value !== null),
    ),
  );

  if (questionIds.length === 0) {
    return {
      staleCount: staleItems.length,
      updatedCount: 0,
    };
  }

  const questions = await prisma.questionBankItem.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, difficulty: true },
  });
  const difficultyByQuestionId = new Map(questions.map((question) => [question.id, question.difficulty]));

  const updates = staleItems.flatMap((item) => {
    const questionId = parseItemSubjectId(item.subjectId);
    if (!questionId) {
      return [];
    }

    const difficulty = difficultyByQuestionId.get(questionId);
    if (!difficulty) {
      return [];
    }

    const seedRating = getInitialItemRating(difficulty);
    const nextRating = clampRating(item.rating + (seedRating - item.rating) * STALE_DECAY_SHARE);

    return prisma.eloState.update({
      where: { id: item.id },
      data: { rating: nextRating },
    });
  });

  if (updates.length === 0) {
    return {
      staleCount: staleItems.length,
      updatedCount: 0,
    };
  }

  await prisma.$transaction(updates);

  return {
    staleCount: staleItems.length,
    updatedCount: updates.length,
  };
}

export async function updateElo(questionId: number, topic: string, difficulty: string, isCorrect: boolean) {
  const normalizedTopic = normalizeTopic(topic);
  const normalizedDifficulty = normalizeDifficulty(difficulty);
  const [userGlobal, userTopic, item] = await Promise.all([
    getOrCreateUserRating("user_global"),
    getOrCreateUserRating("user_topic", normalizedTopic),
    getOrCreateItemRating(questionId, normalizedDifficulty),
  ]);

  const outcome = isCorrect ? 1 : 0;
  const effectiveUserRating = (userGlobal.rating + userTopic.rating) / 2;
  const expectedUser = getExpectedScore(effectiveUserRating, item.rating);
  const expectedItem = 1 - expectedUser;

  const nextUserGlobalRating = clampRating(userGlobal.rating + getKFactor(userGlobal.n) * (outcome - expectedUser));
  const nextUserTopicRating = clampRating(userTopic.rating + getKFactor(userTopic.n) * (outcome - expectedUser));
  const nextItemRating = clampRating(item.rating + getKFactor(item.n) * ((1 - outcome) - expectedItem));

  await prisma.$transaction([
    prisma.eloState.update({
      where: { kind_subjectId: { kind: "user_global", subjectId: userGlobal.subjectId } },
      data: {
        rating: nextUserGlobalRating,
        n: { increment: 1 },
      },
    }),
    prisma.eloState.update({
      where: { kind_subjectId: { kind: "user_topic", subjectId: userTopic.subjectId } },
      data: {
        rating: nextUserTopicRating,
        n: { increment: 1 },
      },
    }),
    prisma.eloState.update({
      where: { kind_subjectId: { kind: "item", subjectId: item.subjectId } },
      data: {
        rating: nextItemRating,
        n: { increment: 1 },
      },
    }),
  ]);

  const nextItemUpdates = item.n + 1;
  let anchored = false;

  if (nextItemUpdates % ITEM_ANCHOR_INTERVAL === 0) {
    const anchorResult = await anchorItemMean();
    anchored = anchorResult.anchored;
  }

  return {
    questionId,
    topic: normalizedTopic,
    difficulty: normalizedDifficulty,
    userGlobalRating: nextUserGlobalRating,
    userTopicRating: nextUserTopicRating,
    itemRating: nextItemRating,
    anchored,
  };
}

export async function getEloStats() {
  const [userGlobal, itemCount, userTopicCount, topicMasteryCount] = await Promise.all([
    prisma.eloState.findUnique({
      where: { kind_subjectId: { kind: "user_global", subjectId: USER_GLOBAL_SUBJECT_ID } },
      select: { rating: true, n: true },
    }),
    prisma.eloState.count({
      where: { kind: "item" },
    }),
    prisma.eloState.count({
      where: { kind: "user_topic" },
    }),
    prisma.topicMastery.count(),
  ]);

  return {
    userGlobalRating: userGlobal?.rating ?? DEFAULT_USER_RATING,
    userGlobalAttempts: userGlobal?.n ?? 0,
    itemCount,
    userTopicCount,
    topicMasteryCount,
  };
}
