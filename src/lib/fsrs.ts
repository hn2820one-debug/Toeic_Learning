import "server-only";
import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from "ts-fsrs";

import { prisma } from "./prisma";

const REVIEW_CAP = 100;
/** Daily cap for introducing "new" FSRS cards (matches `getTodayQueue` when due queue is non-empty). */
export const NEW_CARD_DAILY_CAP = 10;
const NEW_CAP_BACKFILL = 20;
const RATING_OPTIONS = [
  { name: "Again", value: Rating.Again },
  { name: "Hard", value: Rating.Hard },
  { name: "Good", value: Rating.Good },
  { name: "Easy", value: Rating.Easy },
] as const satisfies ReadonlyArray<{ name: string; value: Grade }>;

export const scheduler = fsrs({
  request_retention: 0.9,
  maximum_interval: 730,
  enable_fuzz: true,
  enable_short_term: true,
  learning_steps: ["1m", "10m"],
  relearning_steps: ["10m"],
});

const STATE_MAP = ["New", "Learning", "Review", "Relearning"] as const;
type StateName = (typeof STATE_MAP)[number];
export type RatingName = (typeof RATING_OPTIONS)[number]["name"];
export type SchedulerRating = Grade;
export type IntervalPreview = {
  dueAt: Date;
  label: string;
};

function rowToCard(row: {
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: string;
  lastReview: Date | null;
}): Card {
  const base = createEmptyCard();

  return {
    ...base,
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsedDays,
    scheduled_days: row.scheduledDays,
    reps: row.reps,
    lapses: row.lapses,
    state: State[row.state as StateName],
    last_review: row.lastReview ?? undefined,
  };
}

function cardToRow(c: Card) {
  return {
    due: c.due,
    stability: c.stability,
    difficulty: c.difficulty,
    elapsedDays: c.elapsed_days,
    scheduledDays: c.scheduled_days,
    reps: c.reps,
    lapses: c.lapses,
    state: STATE_MAP[c.state] as StateName,
    lastReview: c.last_review ?? null,
  };
}

function formatIntervalLabel(now: Date, dueAt: Date) {
  const diffMs = Math.max(0, dueAt.getTime() - now.getTime());
  const diffMinutes = diffMs / 60_000;

  if (diffMinutes < 1) {
    return "<1m";
  }

  if (diffMinutes < 60) {
    return `${Math.round(diffMinutes)}m`;
  }

  const diffHours = diffMinutes / 60;
  if (diffHours < 24) {
    return `${Math.round(diffHours)}h`;
  }

  const diffDays = diffHours / 24;
  return `${Math.round(diffDays)}d`;
}

export async function applyRating(questionId: number, rating: SchedulerRating) {
  const row = await prisma.fsrsCardState.findUnique({ where: { questionId } });
  const card: Card = row ? rowToCard(row) : createEmptyCard();
  const { card: nextCard, log } = scheduler.next(card, new Date(), rating);

  await prisma.$transaction([
    prisma.fsrsCardState.upsert({
      where: { questionId },
      create: { questionId, ...cardToRow(nextCard) },
      update: cardToRow(nextCard),
    }),
    prisma.reviewLog.create({
      data: {
        questionId,
        rating: ["Again", "Hard", "Good", "Easy"][log.rating - 1] as any,
        state: STATE_MAP[log.state] as any,
        due: log.due,
        stability: log.stability,
        difficulty: log.difficulty,
        elapsedDays: log.elapsed_days,
        lastElapsedDays: log.last_elapsed_days,
        scheduledDays: log.scheduled_days,
        review: log.review,
      },
    }),
  ]);

  return nextCard;
}

export async function previewIntervals(questionId: number): Promise<Record<RatingName, IntervalPreview>> {
  const row = await prisma.fsrsCardState.findUnique({ where: { questionId } });
  const now = new Date();
  const card: Card = row ? rowToCard(row) : createEmptyCard(now);

  return Object.fromEntries(
    RATING_OPTIONS.map(({ name, value }) => {
      const { card: nextCard } = scheduler.next(card, now, value);

      return [
        name,
        {
          dueAt: nextCard.due,
          label: formatIntervalLabel(now, nextCard.due),
        },
      ];
    }),
  ) as Record<RatingName, IntervalPreview>;
}

export async function getTodayQueue() {
  const now = new Date();

  const dueCards = await prisma.fsrsCardState.findMany({
    where: {
      suspended: false,
      state: { in: ["Learning", "Review", "Relearning"] },
      due: { lte: now },
    },
    orderBy: { due: "asc" },
    take: REVIEW_CAP,
    include: { question: true },
  });

  const newCap = dueCards.length === 0 ? NEW_CAP_BACKFILL : NEW_CARD_DAILY_CAP;
  const newCards = await prisma.fsrsCardState.findMany({
    where: {
      suspended: false,
      state: "New",
    },
    orderBy: { createdAt: "asc" },
    take: newCap,
    include: { question: true },
  });

  return {
    due: dueCards,
    new: newCards,
    total: dueCards.length + newCards.length,
  };
}

export async function getQueueStats() {
  const now = new Date();
  const [dueCount, newCount, learningCount] = await Promise.all([
    prisma.fsrsCardState.count({
      where: {
        suspended: false,
        state: { in: ["Review", "Relearning"] },
        due: { lte: now },
      },
    }),
    prisma.fsrsCardState.count({
      where: { suspended: false, state: "New" },
    }),
    prisma.fsrsCardState.count({
      where: {
        suspended: false,
        state: "Learning",
        due: { lte: now },
      },
    }),
  ]);

  return { dueCount, newCount, learningCount };
}

export { Rating };
