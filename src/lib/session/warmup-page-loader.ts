import "server-only";

import { PHASE1_TOPIC_LABELS } from "@/content/programs/phase1/skill-map";
import { PHASE1_TOPIC_KEYS_IN_ORDER } from "@/content/programs/phase1/topic-order";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import { getOrCreateDevUser } from "@/lib/dev-user";
import { prisma } from "@/lib/prisma";
import { parseWarmupTargetFlow, type WarmupTargetFlow } from "@/lib/session/warmup";

function isPhase1TopicKey(id: string): id is Phase1TopicKey {
  return (PHASE1_TOPIC_KEYS_IN_ORDER as readonly string[]).includes(id);
}

export type WarmupQuestionPayload = {
  id: number;
  position: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  explanation: string | null;
  correctAnswer: string;
};

export type WarmupPageView =
  | { kind: "no_topic" }
  | { kind: "no_user"; topicKey: Phase1TopicKey; label: string }
  | { kind: "invalid_flow" }
  | { kind: "intro"; topicKey: Phase1TopicKey; label: string; flow: WarmupTargetFlow }
  | {
      kind: "session";
      topicKey: Phase1TopicKey;
      label: string;
      flow: WarmupTargetFlow;
      sessionId: string;
      status: "active" | "completed" | "abandoned";
      questions: WarmupQuestionPayload[];
      currentPosition: number;
      itemStatesJson: unknown[];
      startedAtIso: string;
    };

function parseFlow(raw: string | undefined): WarmupTargetFlow | null {
  if (raw === "learn" || raw === "practice" || raw === "test") {
    return raw;
  }
  return null;
}

export async function getWarmupPageView(params: {
  topicKey: string | undefined;
  flow: string | undefined;
  sessionId: string | undefined;
  pos: number;
}): Promise<WarmupPageView> {
  const topicRaw = params.topicKey;
  if (!topicRaw || !isPhase1TopicKey(topicRaw)) {
    return { kind: "no_topic" };
  }
  const topicKey = topicRaw;
  const label = PHASE1_TOPIC_LABELS[topicKey];

  const flow = parseFlow(typeof params.flow === "string" ? params.flow : undefined);
  if (!flow) {
    return { kind: "invalid_flow" };
  }

  const user = await getOrCreateDevUser();
  if (!user) {
    return { kind: "no_user", topicKey, label };
  }

  if (!params.sessionId) {
    return { kind: "intro", topicKey, label, flow };
  }

  const session = await prisma.learningSession.findFirst({
    where: {
      id: params.sessionId,
      userId: user.id,
      mode: "warmup",
    },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { question: true },
      },
    },
  });

  if (!session) {
    return { kind: "intro", topicKey, label, flow };
  }

  const sessionFlow = parseWarmupTargetFlow(session.moduleKey) ?? flow;

  const questions: WarmupQuestionPayload[] = session.items.map((it) => {
    const q = it.question;
    return {
      id: q.id,
      position: it.position,
      questionText: q.questionText,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      explanation: q.explanation,
      correctAnswer: q.correctAnswer,
    };
  });

  const n = questions.length;
  const currentPosition = n === 0 ? 0 : Math.min(Math.max(0, params.pos), n - 1);

  return {
    kind: "session",
    topicKey,
    label,
    flow: sessionFlow,
    sessionId: session.id,
    status: session.status as "active" | "completed" | "abandoned",
    questions,
    currentPosition,
    itemStatesJson: session.items.map((it) => it.practiceStateJson),
    startedAtIso: session.startedAt.toISOString(),
  };
}
