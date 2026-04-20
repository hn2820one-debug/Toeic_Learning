/**
 * 2-minute warm-up: 3 questions, activation only — no mastery / checkpoint side effects.
 *
 * Selection priority:
 * 1) One question missed in the most recent completed practice/test session (“wrong”)
 * 2) One “hesitation” item from that same session (solved after 2+ tries and/or used hints)
 * 3) One A/B difficulty item from the target topic
 *
 * Fallbacks when data is thin: recent wrong → recent practiced → A/B from topic → any bank rows.
 */
import { PHASE1_TOPIC_KEYS_IN_ORDER } from "@/content/programs/phase1/topic-order";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import { practiceItemLooksHesitant } from "@/lib/analytics/hesitation";
import { parsePracticeItemState, type PracticeItemState } from "@/lib/practice/practice-state";
import { prisma } from "@/lib/prisma";
import { parseTestItemState } from "@/lib/test-mode";

export const WARMUP_QUESTION_COUNT = 3;
export const WARMUP_TIME_BUDGET_SEC = 120;

export type WarmupTargetFlow = "learn" | "practice" | "test";

export type WarmupSelectionDebug = {
  slots: string[];
};

function uniq(ids: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

function isPracticeWrong(st: PracticeItemState): boolean {
  if (st.status === "revealed") {
    return true;
  }
  if (st.status === "solved") {
    return st.attempts.some((a) => !a.correct);
  }
  return false;
}

async function pickAbFromTopic(topicKey: Phase1TopicKey, used: Set<number>): Promise<number | null> {
  const row = await prisma.questionBankItem.findFirst({
    where: {
      topicKey,
      difficulty: { in: ["A", "B"] },
      id: { notIn: [...used] },
    },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  return row?.id ?? null;
}

async function pickAnyFromTopic(topicKey: Phase1TopicKey, used: Set<number>): Promise<number | null> {
  const row = await prisma.questionBankItem.findFirst({
    where: { topicKey, id: { notIn: [...used] } },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  return row?.id ?? null;
}

async function pickGlobalFallback(used: Set<number>): Promise<number | null> {
  const row = await prisma.questionBankItem.findFirst({
    where: { id: { notIn: [...used] } },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  return row?.id ?? null;
}

/**
 * Picks exactly `WARMUP_QUESTION_COUNT` distinct question bank ids for the warm-up session.
 */
export async function selectWarmupQuestionIds(
  userId: number,
  targetTopicKey: Phase1TopicKey,
): Promise<{ ids: number[]; debug: WarmupSelectionDebug }> {
  const used = new Set<number>();
  const slots: string[] = [];

  const sessions = await prisma.learningSession.findMany({
    where: {
      userId,
      status: "completed",
      mode: { in: ["practice", "test"] },
      endedAt: { not: null },
    },
    orderBy: { endedAt: "desc" },
    take: 12,
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { question: true },
      },
    },
  });

  const last = sessions[0] ?? null;

  if (last) {
    // Slot 1 — last session wrong
    outer: for (const it of last.items) {
      if (last.mode === "practice") {
        const st = parsePracticeItemState(it.practiceStateJson);
        if (isPracticeWrong(st) && !used.has(it.questionBankItemId)) {
          used.add(it.questionBankItemId);
          slots.push("last_session_wrong");
          break outer;
        }
      } else {
        const st = parseTestItemState(it.testStateJson);
        if (
          st.phase === "answered" &&
          st.correct === false &&
          st.userChoice != null &&
          !used.has(it.questionBankItemId)
        ) {
          used.add(it.questionBankItemId);
          slots.push("last_session_wrong");
          break outer;
        }
      }
    }

    // Slot 2 — last session hesitation (practice only)
    if (last.mode === "practice") {
      for (const it of last.items) {
        const st = parsePracticeItemState(it.practiceStateJson);
        if (practiceItemLooksHesitant(st) && !used.has(it.questionBankItemId)) {
          used.add(it.questionBankItemId);
          slots.push("last_session_hesitation");
          break;
        }
      }
    }
  }

  // Slot 3 — topic A/B
  const ab = await pickAbFromTopic(targetTopicKey, used);
  if (ab != null) {
    used.add(ab);
    slots.push("topic_ab");
  }

  // Fallback: scan older sessions for any wrong
  if (used.size < WARMUP_QUESTION_COUNT) {
    for (const s of sessions) {
      for (const it of s.items) {
        if (used.size >= WARMUP_QUESTION_COUNT) break;
        if (s.mode === "practice") {
          const st = parsePracticeItemState(it.practiceStateJson);
          if (isPracticeWrong(st) && !used.has(it.questionBankItemId)) {
            used.add(it.questionBankItemId);
            slots.push("recent_wrong");
          }
        } else {
          const st = parseTestItemState(it.testStateJson);
          if (
            st.phase === "answered" &&
            st.correct === false &&
            st.userChoice != null &&
            !used.has(it.questionBankItemId)
          ) {
            used.add(it.questionBankItemId);
            slots.push("recent_wrong");
          }
        }
      }
    }
  }

  // Fallback: any item seen in recent sessions
  if (used.size < WARMUP_QUESTION_COUNT) {
    for (const s of sessions) {
      for (const it of s.items) {
        if (used.size >= WARMUP_QUESTION_COUNT) break;
        if (!used.has(it.questionBankItemId)) {
          used.add(it.questionBankItemId);
          slots.push("recent_practiced");
        }
      }
    }
  }

  // Fallback: A/B adjacent topics
  if (used.size < WARMUP_QUESTION_COUNT) {
    const idx = PHASE1_TOPIC_KEYS_IN_ORDER.indexOf(targetTopicKey);
    const neighbors: Phase1TopicKey[] = [];
    if (idx > 0) neighbors.push(PHASE1_TOPIC_KEYS_IN_ORDER[idx - 1]!);
    if (idx >= 0 && idx < PHASE1_TOPIC_KEYS_IN_ORDER.length - 1) {
      neighbors.push(PHASE1_TOPIC_KEYS_IN_ORDER[idx + 1]!);
    }
    for (const tk of neighbors) {
      const id = await pickAbFromTopic(tk, used);
      if (id != null) {
        used.add(id);
        slots.push("neighbor_ab");
        if (used.size >= WARMUP_QUESTION_COUNT) break;
      }
    }
  }

  // Fallback: same topic any difficulty
  while (used.size < WARMUP_QUESTION_COUNT) {
    const id = await pickAnyFromTopic(targetTopicKey, used);
    if (id == null) break;
    used.add(id);
    slots.push("topic_any");
  }

  // Last resort: global bank
  while (used.size < WARMUP_QUESTION_COUNT) {
    const id = await pickGlobalFallback(used);
    if (id == null) break;
    used.add(id);
    slots.push("global");
  }

  const ids = uniq([...used]);
  return {
    ids: ids.slice(0, WARMUP_QUESTION_COUNT),
    debug: { slots: slots.slice(0, WARMUP_QUESTION_COUNT) },
  };
}

export function warmupModuleKeyForFlow(flow: WarmupTargetFlow): string {
  return `warmup/${flow}`;
}

export function parseWarmupTargetFlow(moduleKey: string | null | undefined): WarmupTargetFlow | null {
  if (!moduleKey || !moduleKey.startsWith("warmup/")) {
    return null;
  }
  const rest = moduleKey.slice("warmup/".length);
  if (rest === "learn" || rest === "practice" || rest === "test") {
    return rest;
  }
  return null;
}

/** Where the learner lands after warm-up (or when skipping). */
export function warmupContinuationPath(topicKey: string, flow: WarmupTargetFlow): string {
  switch (flow) {
    case "learn":
      return `/learn/${encodeURIComponent(topicKey)}`;
    case "practice":
      return `/practice?topicKey=${encodeURIComponent(topicKey)}`;
    case "test":
      return `/test?topicKey=${encodeURIComponent(topicKey)}`;
    default:
      return "/learn";
  }
}
