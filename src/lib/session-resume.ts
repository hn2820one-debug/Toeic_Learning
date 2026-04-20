import "server-only";

import type { LearningSessionMode, LearningSessionStatus } from "../../generated/prisma";

import { prisma } from "@/lib/prisma";

export type ResumeMode = "practice" | "test" | "review";

export type SessionResumeCandidate = {
  sessionId: string;
  mode: ResumeMode;
  topicKey: string | null;
  moduleKey: string | null;
  startedAt: Date;
  updatedAt: Date;
  stale: boolean;
};

const STALE_HOURS = 24;

export function shouldResumeSession(input: { startedAt: Date; updatedAt: Date; now?: Date }) {
  const now = input.now ?? new Date();
  const base = input.updatedAt ?? input.startedAt;
  const ageMs = Math.max(0, now.getTime() - base.getTime());
  return ageMs <= STALE_HOURS * 60 * 60 * 1000;
}

export function getSessionResumeCandidate(input: {
  sessions: Array<{
    id: string;
    mode: LearningSessionMode;
    status: LearningSessionStatus;
    topicKey: string | null;
    moduleKey: string | null;
    startedAt: Date;
    updatedAt: Date;
  }>;
  mode: ResumeMode;
  topicKey?: string;
}) {
  const matches = input.sessions
    .filter((s) => s.mode === input.mode && s.status === "active")
    .filter((s) => (input.topicKey ? s.topicKey === input.topicKey : true))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  const picked = matches[0];
  if (!picked) {
    return null;
  }

  return {
    sessionId: picked.id,
    mode: input.mode,
    topicKey: picked.topicKey,
    moduleKey: picked.moduleKey,
    startedAt: picked.startedAt,
    updatedAt: picked.updatedAt,
    stale: !shouldResumeSession({ startedAt: picked.startedAt, updatedAt: picked.updatedAt }),
  } satisfies SessionResumeCandidate;
}

export async function findActiveSessionResumeCandidate(params: {
  userId: number;
  mode: ResumeMode;
  topicKey?: string;
}) {
  const sessions = await prisma.learningSession.findMany({
    where: {
      userId: params.userId,
      mode: params.mode,
      status: "active",
      ...(params.topicKey ? { topicKey: params.topicKey } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: {
      id: true,
      mode: true,
      status: true,
      topicKey: true,
      moduleKey: true,
      startedAt: true,
      updatedAt: true,
    },
  });

  return getSessionResumeCandidate({
    sessions,
    mode: params.mode,
    topicKey: params.topicKey,
  });
}

