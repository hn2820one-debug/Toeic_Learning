/**
 * PRACTICE in-session revisit: delayed reinforcement (variant-first), max 2 per session.
 * State persisted on `LearningSession.revisitMetaJson`.
 */
import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import { classifyPracticeItem, collectPracticePeerResolveSeconds } from "@/lib/analytics/hesitation";
import type { PracticeItemState } from "@/lib/practice/practice-state";
import {
  PRACTICE_QUESTION_COUNT,
  emptyPracticeItemState,
  parsePracticeItemState,
} from "@/lib/practice/practice-state";
import type { Prisma } from "../../../generated/prisma";
import { prisma } from "@/lib/prisma";

export const MAX_IN_SESSION_REVISITS = 2;
/** Base practice length; session may grow by up to `MAX_IN_SESSION_REVISITS`. */
export const MAX_PRACTICE_SESSION_ITEMS = PRACTICE_QUESTION_COUNT + MAX_IN_SESSION_REVISITS;

const GAP_MIN = 6;
const GAP_MAX = 10;

const REINFORCE_BANNERS_ZH = ["補強題", "類似題再試一次", "用另一題確認是否真的理解"] as const;

function uniqPreserve<T>(xs: T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const x of xs) {
    if (!seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  }
  return out;
}

export type RevisitTier = "skill_variant" | "topic_variant" | "original_replay";

export type RevisitMetaV1 = {
  v: 1;
  revisitCount: number;
};

export function emptyRevisitMeta(): RevisitMetaV1 {
  return { v: 1, revisitCount: 0 };
}

export function parseRevisitMeta(raw: unknown): RevisitMetaV1 {
  if (!raw || typeof raw !== "object") {
    return emptyRevisitMeta();
  }
  const o = raw as Record<string, unknown>;
  if (o.v === 1 && typeof o.revisitCount === "number" && o.revisitCount >= 0) {
    return { v: 1, revisitCount: o.revisitCount };
  }
  return emptyRevisitMeta();
}

function isHighValueDifficulty(difficulty: string): boolean {
  const d = difficulty.trim().toUpperCase();
  return d === "A" || d === "B";
}

/**
 * Revisit candidate when the item just reached a terminal state (solved or revealed).
 */
export function isRevisitCandidate(params: {
  status: "solved" | "revealed";
  state: PracticeItemState;
  question: { id: number; difficulty: string };
  position: number;
  peerResolveSeconds: number[];
}): boolean {
  const { status, state, question, position, peerResolveSeconds } = params;

  if (status === "revealed") {
    return true;
  }

  const last = state.attempts[state.attempts.length - 1];
  if (!last?.correct) {
    return false;
  }

  if (last.hintsAtSubmit >= 3) {
    return true;
  }

  if (state.attempts.some((a) => a.timedOut)) {
    return true;
  }

  if (state.attempts.length > 1) {
    return true;
  }

  if (isHighValueDifficulty(question.difficulty)) {
    const row = classifyPracticeItem({
      state,
      position,
      questionId: question.id,
      peerResolveSeconds,
    });
    if (row.tier === "hesitant") {
      return true;
    }
  }

  return false;
}

function bannerForPosition(position: number): string {
  return REINFORCE_BANNERS_ZH[position % REINFORCE_BANNERS_ZH.length]!;
}

function chooseGap(p: number, L: number): number | null {
  const candidates: number[] = [];
  for (let g = GAP_MIN; g <= GAP_MAX; g++) {
    if (L - p - 1 >= g) {
      candidates.push(g);
    }
  }
  if (candidates.length === 0) {
    return null;
  }
  return candidates[Math.floor(Math.random() * candidates.length)]!;
}

function difficultyNeighbors(difficulty: string): string[] {
  const order = ["A", "B", "C"];
  const u = difficulty.trim().toUpperCase();
  const i = order.indexOf(u);
  if (i < 0) {
    return [difficulty];
  }
  const out: string[] = [order[i]!];
  if (i > 0) {
    out.push(order[i - 1]!);
  }
  if (i < order.length - 1) {
    out.push(order[i + 1]!);
  }
  return out;
}

export async function pickRevisitQuestionId(params: {
  source: {
    id: number;
    questionText: string;
    skillKey: string | null;
    topicKey: string | null;
    topic: string;
    difficulty: string;
  };
  excludeIds: number[];
}): Promise<{ id: number; tier: RevisitTier } | null> {
  const { source, excludeIds } = params;

  const exclude = uniqPreserve(excludeIds);

  const trySkill = async (): Promise<number | null> => {
    if (!source.skillKey) {
      return null;
    }
    const row = await prisma.questionBankItem.findFirst({
      where: {
        ...(exclude.length > 0 ? { id: { notIn: exclude } } : {}),
        skillKey: source.skillKey,
        difficulty: { in: difficultyNeighbors(source.difficulty) },
        questionText: { not: source.questionText },
      },
      orderBy: { id: "asc" },
      select: { id: true },
    });
    return row?.id ?? null;
  };

  const tryTopic = async (): Promise<number | null> => {
    const whereTopic =
      source.topicKey != null
        ? ({ topicKey: source.topicKey } as const)
        : ({ topic: source.topic } as const);
    const row = await prisma.questionBankItem.findFirst({
      where: {
        ...(exclude.length > 0 ? { id: { notIn: exclude } } : {}),
        ...whereTopic,
        questionText: { not: source.questionText },
      },
      orderBy: { id: "asc" },
      select: { id: true },
    });
    return row?.id ?? null;
  };

  const a = await trySkill();
  if (a != null) {
    return { id: a, tier: "skill_variant" };
  }
  const b = await tryTopic();
  if (b != null) {
    return { id: b, tier: "topic_variant" };
  }

  const orig = await prisma.questionBankItem.findFirst({
    where: { id: source.id },
    select: { id: true },
  });
  if (orig) {
    return { id: orig.id, tier: "original_replay" };
  }
  return null;
}

export function mergeReinforceQueueIntoBaseIds(
  baseIds: number[],
  queue: number[],
  maxFromQueue: number,
): { ids: number[]; consumedIds: number[]; remainingQueue: number[] } {
  const uniqQueue = uniqPreserve(queue);
  const take: number[] = [];
  for (const id of uniqQueue) {
    if (take.length >= maxFromQueue) {
      break;
    }
    if (!baseIds.includes(id) && !take.includes(id)) {
      take.push(id);
    }
  }
  if (take.length === 0) {
    return { ids: baseIds, consumedIds: [], remainingQueue: [...queue] };
  }
  const used = new Set(take);
  const restBase = baseIds.filter((id) => !used.has(id));
  const merged = [...take, ...restBase].slice(0, baseIds.length);
  const remainingQueue = [...queue];
  for (const id of take) {
    const idx = remainingQueue.indexOf(id);
    if (idx >= 0) {
      remainingQueue.splice(idx, 1);
    }
  }
  return { ids: merged, consumedIds: take, remainingQueue };
}

export async function deferRevisitToTopicQueue(params: {
  userId: number;
  topicKey: Phase1TopicKey;
  questionBankItemId: number;
}): Promise<void> {
  const row = await prisma.userTopicProgress.findUnique({
    where: { userId_topicKey: { userId: params.userId, topicKey: params.topicKey } },
    select: { practiceReinforceQueueJson: true },
  });
  const raw = row?.practiceReinforceQueueJson;
  const prev = Array.isArray(raw) ? raw.filter((x): x is number => typeof x === "number") : [];
  if (prev.includes(params.questionBankItemId)) {
    return;
  }
  const next = [...prev, params.questionBankItemId].slice(-30);
  await prisma.userTopicProgress.upsert({
    where: { userId_topicKey: { userId: params.userId, topicKey: params.topicKey } },
    create: {
      userId: params.userId,
      topicKey: params.topicKey,
      practiceReinforceQueueJson: next as unknown as Prisma.InputJsonValue,
    },
    update: { practiceReinforceQueueJson: next as unknown as Prisma.InputJsonValue },
  });
}

/**
 * After a practice item is resolved, optionally insert a delayed revisit question.
 */
export async function planAndInsertSessionRevisit(params: {
  sessionId: string;
  userId: number;
  topicKey: Phase1TopicKey;
  anchorPosition: number;
  sourceQuestion: {
    id: number;
    questionText: string;
    skillKey: string | null;
    topicKey: string | null;
    topic: string;
    difficulty: string;
  };
  terminalStatus: "solved" | "revealed";
  terminalState: PracticeItemState;
}): Promise<void> {
  const session = await prisma.learningSession.findFirst({
    where: { id: params.sessionId, userId: params.userId, mode: "practice", status: "active" },
    include: {
      items: { orderBy: { position: "asc" }, include: { question: true } },
    },
  });
  if (!session?.topicKey) {
    return;
  }

  const items = session.items;
  const L = items.length;
  const states = items.map((it) => parsePracticeItemState(it.practiceStateJson));
  const anchorIdx = items.findIndex((it) => it.position === params.anchorPosition);
  const peerIndex =
    anchorIdx >= 0
      ? anchorIdx
      : params.anchorPosition >= 0 && params.anchorPosition < states.length
        ? params.anchorPosition
        : 0;
  const peerResolveSeconds = collectPracticePeerResolveSeconds(states, peerIndex);

  if (
    !isRevisitCandidate({
      status: params.terminalStatus,
      state: params.terminalState,
      question: { id: params.sourceQuestion.id, difficulty: params.sourceQuestion.difficulty },
      position: params.anchorPosition,
      peerResolveSeconds,
    })
  ) {
    return;
  }

  const meta = parseRevisitMeta(session.revisitMetaJson);
  if (meta.revisitCount >= MAX_IN_SESSION_REVISITS) {
    const picked = await pickRevisitQuestionId({
      source: params.sourceQuestion,
      excludeIds: items.map((it) => it.questionBankItemId),
    });
    if (picked) {
      await deferRevisitToTopicQueue({
        userId: params.userId,
        topicKey: params.topicKey,
        questionBankItemId: picked.id,
      });
    }
    return;
  }

  if (L >= MAX_PRACTICE_SESSION_ITEMS) {
    const picked = await pickRevisitQuestionId({
      source: params.sourceQuestion,
      excludeIds: items.map((it) => it.questionBankItemId),
    });
    if (picked) {
      await deferRevisitToTopicQueue({
        userId: params.userId,
        topicKey: params.topicKey,
        questionBankItemId: picked.id,
      });
    }
    return;
  }

  const gap = chooseGap(params.anchorPosition, L);
  if (gap == null) {
    const picked = await pickRevisitQuestionId({
      source: params.sourceQuestion,
      excludeIds: items.map((it) => it.questionBankItemId),
    });
    if (picked) {
      await deferRevisitToTopicQueue({
        userId: params.userId,
        topicKey: params.topicKey,
        questionBankItemId: picked.id,
      });
    }
    return;
  }

  const insertAt = params.anchorPosition + gap + 1;
  const excludeIds = items.map((it) => it.questionBankItemId);
  const picked = await pickRevisitQuestionId({
    source: params.sourceQuestion,
    excludeIds,
  });
  if (!picked) {
    return;
  }

  const practiceState: PracticeItemState = {
    ...emptyPracticeItemState(),
    reinforceBannerZh: bannerForPosition(insertAt),
    reinforceKind: "in_session",
  };

  const nextMeta: RevisitMetaV1 = {
    v: 1,
    revisitCount: meta.revisitCount + 1,
  };

  await prisma.$transaction([
    prisma.learningSessionItem.updateMany({
      where: { learningSessionId: params.sessionId, position: { gte: insertAt } },
      data: { position: { increment: 1 } },
    }),
    prisma.learningSessionItem.create({
      data: {
        learningSessionId: params.sessionId,
        questionBankItemId: picked.id,
        position: insertAt,
        practiceStateJson: practiceState as unknown as Prisma.InputJsonValue,
      },
    }),
    prisma.learningSession.update({
      where: { id: params.sessionId },
      data: { revisitMetaJson: nextMeta as unknown as Prisma.InputJsonValue },
    }),
  ]);
}
