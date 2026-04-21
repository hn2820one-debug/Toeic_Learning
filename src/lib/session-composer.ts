import "server-only";

import type { Prisma } from "../../generated/prisma";
import type { Phase1SessionMode } from "@/content/programs/phase1/types";

import {
  buildComposeQuestionWhere,
  type ComposeSessionInput,
} from "./session-compose-filters";
import { getTodayQueue } from "./fsrs";
import { prisma } from "./prisma";

export {
  PHASE1_SESSION_MODE_VALUES,
  buildComposeQuestionWhere,
  type ComposeSessionInput,
} from "./session-compose-filters";

const DEFAULT_COMPOSE_COUNT = 10;

/** Legacy FSRS/Elo mix — now the default for `mixed_practice`. */
const MIXED_POOL_RATIOS = { due: 0.6, reinforcement: 0.3, new: 0.1 };

function getPoolRatiosForMode(mode: Phase1SessionMode): { due: number; reinforcement: number; new: number } {
  switch (mode) {
    case "review":
      return { due: 0.85, reinforcement: 0.1, new: 0.05 };
    case "diagnostic":
      return { due: 0.15, reinforcement: 0.25, new: 0.6 };
    case "lesson_drill":
      return { due: 0.35, reinforcement: 0.45, new: 0.2 };
    case "checkpoint":
      return { due: 0.5, reinforcement: 0.35, new: 0.15 };
    case "mixed_practice":
    default:
      return { ...MIXED_POOL_RATIOS };
  }
}

const DUE_RATIO = MIXED_POOL_RATIOS.due;
const REINFORCEMENT_RATIO = MIXED_POOL_RATIOS.reinforcement;
const EPSILON = 0.15;
const EXPLORATION_WINDOW = 3;
const DEFAULT_ELO_RATING = 1500;
const ITEM_SEED_RATING = {
  A: 1400,
  B: 1500,
  C: 1600,
} as const;

type PoolName = "due" | "reinforcement" | "new";
type DifficultyBand = keyof typeof ITEM_SEED_RATING;

type CandidateQuestion = {
  id: number;
  topic: string;
  topicKey: string | null;
  difficulty: string;
  fsrsCardState: {
    state: string;
    due: Date;
    stability: number;
    reps: number;
    lapses: number;
  } | null;
};

type SessionCandidate = {
  questionId: number;
  topic: string;
  topicKey: string | null;
  difficulty: string;
  pool: PoolName;
  fsrsState: string | null;
  dueAt: Date | null;
  stability: number | null;
  reps: number | null;
  lapses: number | null;
  itemRating: number;
  userTopicRating: number;
  effectiveUserRating: number;
  grammarPoints: string[];
};

export type ScoredCandidate = SessionCandidate & {
  score: number;
};

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

function getSeedRating(difficulty: string) {
  return ITEM_SEED_RATING[normalizeDifficulty(difficulty)];
}

function getTargetCounts(
  targetCount: number,
  ratios: { due: number; reinforcement: number; new: number } = {
    due: DUE_RATIO,
    reinforcement: REINFORCEMENT_RATIO,
    new: 1 - DUE_RATIO - REINFORCEMENT_RATIO,
  },
) {
  const safeTargetCount = Math.max(1, Math.floor(targetCount));
  const dueTarget = Math.floor(safeTargetCount * ratios.due);
  const reinforcementTarget = Math.floor(safeTargetCount * ratios.reinforcement);
  const newTarget = Math.max(0, safeTargetCount - dueTarget - reinforcementTarget);

  return {
    safeTargetCount,
    dueTarget,
    reinforcementTarget,
    newTarget,
  };
}

function pickWithExploration(candidates: ScoredCandidate[], count: number, selectedIds: Set<number>) {
  const remaining = candidates
    .filter((candidate) => !selectedIds.has(candidate.questionId))
    .sort((left, right) => right.score - left.score);
  const selected: ScoredCandidate[] = [];

  while (selected.length < count && remaining.length > 0) {
    const windowSize = Math.min(EXPLORATION_WINDOW, remaining.length);
    const pickIndex = Math.random() < EPSILON ? Math.floor(Math.random() * windowSize) : 0;
    const [picked] = remaining.splice(pickIndex, 1);

    selected.push(picked);
    selectedIds.add(picked.questionId);
  }

  return selected;
}

function getMatchScore(itemRating: number, effectiveUserRating: number) {
  return 1 - Math.min(1, Math.abs(itemRating - effectiveUserRating) / 400);
}

export function scoreCandidates(candidates: SessionCandidate[]): ScoredCandidate[] {
  const now = Date.now();

  return candidates
    .map((candidate) => {
      const matchScore = getMatchScore(candidate.itemRating, candidate.effectiveUserRating);
      const overdueDays = candidate.dueAt ? Math.max(0, now - candidate.dueAt.getTime()) / 86_400_000 : 0;
      const overdueBoost = Math.min(3, overdueDays);
      const lowStabilityBoost =
        candidate.stability !== null ? Math.max(0, Math.min(5, 5 - candidate.stability)) : 0;
      const lowRepBoost = candidate.reps !== null ? Math.max(0, 3 - Math.min(3, candidate.reps)) : 1;
      const lapseBoost = candidate.lapses ?? 0;
      const topicNoveltyBoost =
        candidate.userTopicRating === DEFAULT_ELO_RATING && candidate.pool !== "due" ? 2 : 0;

      const baseScore =
        candidate.pool === "due"
          ? 100 + overdueBoost * 12 + lowStabilityBoost * 6 + lapseBoost * 4 + matchScore * 10
          : candidate.pool === "reinforcement"
            ? 55 + lowRepBoost * 8 + lowStabilityBoost * 4 + matchScore * 16
            : 20 + topicNoveltyBoost * 4 + matchScore * 14;

      return {
        ...candidate,
        score: Number(baseScore.toFixed(2)),
      };
    })
    .sort((left, right) => right.score - left.score);
}

/** Avoid back-to-back same scene bucket: diagnostic uses `topicKey` when set, else `topic`. */
export function interleave(candidates: ScoredCandidate[], mode: Phase1SessionMode = "mixed_practice") {
  const remaining = [...candidates].sort((left, right) => right.score - left.score);
  const ordered: ScoredCandidate[] = [];

  const pivot = (c: ScoredCandidate) =>
    mode === "diagnostic" ? (c.topicKey?.trim() || c.topic) : c.topic;

  while (remaining.length > 0) {
    const previousPivot = ordered.length > 0 ? pivot(ordered.at(-1)!) : null;
    const nextIndex = remaining.findIndex((candidate) => pivot(candidate) !== previousPivot);
    const pickIndex = nextIndex >= 0 ? nextIndex : 0;
    const [picked] = remaining.splice(pickIndex, 1);
    ordered.push(picked);
  }

  return ordered;
}

function buildCandidate(
  question: CandidateQuestion,
  pool: PoolName,
  itemRatingByQuestionId: Map<number, number>,
  userGlobalRating: number,
  userTopicRatingByTopic: Map<string, number>,
): SessionCandidate {
  const userTopicRating = userTopicRatingByTopic.get(question.topic) ?? DEFAULT_ELO_RATING;
  const effectiveUserRating = (userGlobalRating + userTopicRating) / 2;

  return {
    questionId: question.id,
    topic: question.topic,
    topicKey: question.topicKey,
    difficulty: question.difficulty,
    pool,
    fsrsState: question.fsrsCardState?.state ?? null,
    dueAt: question.fsrsCardState?.due ?? null,
    stability: question.fsrsCardState?.stability ?? null,
    reps: question.fsrsCardState?.reps ?? null,
    lapses: question.fsrsCardState?.lapses ?? null,
    itemRating: itemRatingByQuestionId.get(question.id) ?? getSeedRating(question.difficulty),
    userTopicRating,
    effectiveUserRating,
    grammarPoints: [],
  };
}

function normalizeComposeInput(input: ComposeSessionInput | number): ComposeSessionInput {
  if (typeof input === "number") {
    return { mode: "mixed_practice", count: input };
  }
  return {
    mode: input.mode,
    moduleKey: input.moduleKey,
    topicKey: input.topicKey,
    primaryLearningSkillCode: input.primaryLearningSkillCode,
    count: input.count ?? DEFAULT_COMPOSE_COUNT,
  };
}

async function buildComposerState(
  targetCount: number,
  composeInput: ComposeSessionInput,
  where: Prisma.QuestionBankItemWhereInput,
) {
  const ratios = getPoolRatiosForMode(composeInput.mode);
  const { safeTargetCount, dueTarget, reinforcementTarget, newTarget } = getTargetCounts(targetCount, ratios);
  const queue = await getTodayQueue();
  const dueIds = new Set(queue.due.map((item) => item.questionId));
  const explicitNewIds = new Set(queue.new.map((item) => item.questionId));

  const baseWhere = where && Object.keys(where).length > 0 ? where : undefined;

  const allQuestions = await prisma.questionBankItem.findMany({
    ...(baseWhere ? { where: baseWhere } : {}),
    select: {
      id: true,
      topic: true,
      topicKey: true,
      difficulty: true,
      fsrsCardState: {
        select: {
          state: true,
          due: true,
          stability: true,
          reps: true,
          lapses: true,
        },
      },
    },
  });

  const questionIds = allQuestions.map((question) => question.id);
  const topics = Array.from(new Set(allQuestions.map((question) => question.topic)));
  const [userGlobal, userTopicRows, itemRows] = await Promise.all([
    prisma.eloState.findUnique({
      where: { kind_subjectId: { kind: "user_global", subjectId: "singleton" } },
      select: { rating: true },
    }),
    prisma.eloState.findMany({
      where: {
        kind: "user_topic",
        subjectId: { in: topics },
      },
      select: { subjectId: true, rating: true },
    }),
    prisma.eloState.findMany({
      where: {
        kind: "item",
        subjectId: { in: questionIds.map(String) },
      },
      select: { subjectId: true, rating: true },
    }),
  ]);

  const userGlobalRating = userGlobal?.rating ?? DEFAULT_ELO_RATING;
  const userTopicRatingByTopic = new Map(userTopicRows.map((row) => [row.subjectId, row.rating]));
  const itemRatingByQuestionId = new Map(
    itemRows
      .map((row) => [Number.parseInt(row.subjectId, 10), row.rating] as const)
      .filter(([questionId]) => Number.isInteger(questionId) && questionId > 0),
  );

  const dueQuestions = allQuestions.filter((question) => dueIds.has(question.id));
  const explicitNewQuestions = allQuestions.filter((question) => explicitNewIds.has(question.id));
  const remainingQuestions = allQuestions.filter((question) => !dueIds.has(question.id) && !explicitNewIds.has(question.id));

  const reinforcementQuestions = remainingQuestions.filter(
    (question) =>
      (question.fsrsCardState !== null && question.fsrsCardState.state !== "New") ||
      itemRatingByQuestionId.has(question.id),
  );
  const reinforcementIds = new Set(reinforcementQuestions.map((question) => question.id));
  const fallbackNewQuestions = remainingQuestions.filter((question) => !reinforcementIds.has(question.id));
  const newQuestions = [...explicitNewQuestions, ...fallbackNewQuestions];

  const dueCandidates = scoreCandidates(
    dueQuestions.map((question) =>
      buildCandidate(question, "due", itemRatingByQuestionId, userGlobalRating, userTopicRatingByTopic),
    ),
  );
  const reinforcementCandidates = scoreCandidates(
    reinforcementQuestions.map((question) =>
      buildCandidate(question, "reinforcement", itemRatingByQuestionId, userGlobalRating, userTopicRatingByTopic),
    ),
  );
  const newCandidates = scoreCandidates(
    newQuestions.map((question) =>
      buildCandidate(question, "new", itemRatingByQuestionId, userGlobalRating, userTopicRatingByTopic),
    ),
  );

  const selectedIds = new Set<number>();
  const selected = [
    ...pickWithExploration(dueCandidates, dueTarget, selectedIds),
    ...pickWithExploration(reinforcementCandidates, reinforcementTarget, selectedIds),
    ...pickWithExploration(newCandidates, newTarget, selectedIds),
  ];

  if (selected.length < safeTargetCount) {
    const fallbackCandidates = [...dueCandidates, ...reinforcementCandidates, ...newCandidates].sort(
      (left, right) => right.score - left.score,
    );

    selected.push(...pickWithExploration(fallbackCandidates, safeTargetCount - selected.length, selectedIds));
  }

  const ordered = interleave(selected, composeInput.mode).slice(0, safeTargetCount);

  return {
    dueCandidates,
    reinforcementCandidates,
    newCandidates,
    ordered,
  };
}

/**
 * Mode-aware session composer: FSRS/Elo scoring + pool mix varies by `mode`;
 * optional `topicKey` / `primaryLearningSkillCode` / `moduleKey` narrow the bank (dual-axis).
 *
 * @param input — full input, or a legacy numeric shorthand for `{ mode: "mixed_practice", count: n }`.
 */
export async function composeSession(input: ComposeSessionInput | number = { mode: "mixed_practice", count: DEFAULT_COMPOSE_COUNT }) {
  const resolved = normalizeComposeInput(input);
  const count = Math.max(1, resolved.count ?? DEFAULT_COMPOSE_COUNT);
  const where = buildComposeQuestionWhere(resolved);
  const { ordered } = await buildComposerState(count, resolved, where);
  return ordered.map((candidate) => candidate.questionId);
}

export async function composeSessionDebug(input: ComposeSessionInput | number = { mode: "mixed_practice", count: DEFAULT_COMPOSE_COUNT }) {
  const resolved = normalizeComposeInput(input);
  const count = Math.max(1, resolved.count ?? DEFAULT_COMPOSE_COUNT);
  const where = buildComposeQuestionWhere(resolved);
  const { dueCandidates, reinforcementCandidates, newCandidates, ordered } = await buildComposerState(count, resolved, where);

  return {
    mode: resolved.mode,
    filter: where,
    poolRatios: getPoolRatiosForMode(resolved.mode),
    dueCandidatesCount: dueCandidates.length,
    reinforcementCandidatesCount: reinforcementCandidates.length,
    newCandidatesCount: newCandidates.length,
    finalSelectedIds: ordered.map((candidate) => candidate.questionId),
  };
}
