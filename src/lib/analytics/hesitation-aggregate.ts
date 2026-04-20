import "server-only";

import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import {
  buildPracticeSessionHesitationRows,
  buildTestSessionHesitationRows,
  classifyReviewItem,
  practiceItemLooksHesitant,
  summarizeMasteryTiers,
} from "@/lib/analytics/hesitation";
import { parsePracticeItemState } from "@/lib/practice/practice-state";
import { prisma } from "@/lib/prisma";
import { parseReviewItemState } from "@/lib/review-mode";

/**
 * Aggregates three-way mastery tiers from completed closed-loop session items in a time window.
 */
export async function aggregateHesitationTiersForUserWindow(
  userId: number,
  windowStart: Date,
): Promise<{ fluent: number; hesitant: number; struggling: number }> {
  const rows = await prisma.learningSessionItem.findMany({
    where: {
      learningSession: {
        userId,
        status: "completed",
        endedAt: { gte: windowStart },
        mode: { in: ["practice", "test", "review"] },
      },
    },
    select: {
      learningSessionId: true,
      position: true,
      questionBankItemId: true,
      practiceStateJson: true,
      testStateJson: true,
      reviewStateJson: true,
      learningSession: { select: { mode: true } },
    },
  });

  const bySession = new Map<
    string,
    Array<{
      position: number;
      questionBankItemId: number;
      practiceStateJson: unknown;
      testStateJson: unknown;
      reviewStateJson: unknown;
      mode: string;
    }>
  >();

  for (const r of rows) {
    const sid = r.learningSessionId;
    const mode = r.learningSession.mode;
    const list = bySession.get(sid) ?? [];
    list.push({
      position: r.position,
      questionBankItemId: r.questionBankItemId,
      practiceStateJson: r.practiceStateJson,
      testStateJson: r.testStateJson,
      reviewStateJson: r.reviewStateJson,
      mode,
    });
    bySession.set(sid, list);
  }

  let fluent = 0;
  let hesitant = 0;
  let struggling = 0;

  for (const [, group] of bySession) {
    const mode = group[0]?.mode;
    if (!mode) {
      continue;
    }
    if (mode === "practice") {
      const items = group
        .filter((g) => g.practiceStateJson != null)
        .map((g) => ({
          position: g.position,
          questionBankItemId: g.questionBankItemId,
          practiceStateJson: g.practiceStateJson,
        }));
      if (items.length === 0) {
        continue;
      }
      const tiers = summarizeMasteryTiers(buildPracticeSessionHesitationRows(items));
      fluent += tiers.fluent;
      hesitant += tiers.hesitant;
      struggling += tiers.struggling;
      continue;
    }
    if (mode === "test") {
      const items = group
        .filter((g) => g.testStateJson != null)
        .map((g) => ({
          position: g.position,
          questionBankItemId: g.questionBankItemId,
          testStateJson: g.testStateJson,
        }));
      if (items.length === 0) {
        continue;
      }
      const tiers = summarizeMasteryTiers(buildTestSessionHesitationRows(items));
      fluent += tiers.fluent;
      hesitant += tiers.hesitant;
      struggling += tiers.struggling;
      continue;
    }
    if (mode === "review") {
      const states = group.map((g) => parseReviewItemState(g.reviewStateJson));
      const times = states.map((st) =>
        st.correct === true && !st.timedOut && st.timeTakenSec != null ? st.timeTakenSec : null,
      );
      for (let i = 0; i < group.length; i++) {
        const peerTimes = times
          .map((t, j) => (j !== i && t != null ? t : null))
          .filter((t): t is number => t != null);
        const row = classifyReviewItem({
          state: states[i]!,
          position: group[i]!.position,
          questionId: group[i]!.questionBankItemId,
          peerTimes,
        });
        const s = summarizeMasteryTiers([row]);
        fluent += s.fluent;
        hesitant += s.hesitant;
        struggling += s.struggling;
      }
    }
  }

  return { fluent, hesitant, struggling };
}

/** PRACTICE reinforcement: recent「答對但未熟」題（非錯題）。 */
export async function findRecentHesitationQuestionIds(
  userId: number,
  topicKey: Phase1TopicKey,
  limit: number,
): Promise<number[]> {
  const rows = await prisma.learningSessionItem.findMany({
    where: {
      question: { topicKey },
      learningSession: {
        userId,
        status: "completed",
        mode: "practice",
        endedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    },
    orderBy: { id: "desc" },
    take: 160,
    select: { questionBankItemId: true, practiceStateJson: true },
  });

  const out: number[] = [];
  const seen = new Set<number>();
  for (const r of rows) {
    const st = parsePracticeItemState(r.practiceStateJson);
    if (practiceItemLooksHesitant(st) && !seen.has(r.questionBankItemId)) {
      seen.add(r.questionBankItemId);
      out.push(r.questionBankItemId);
      if (out.length >= limit) {
        break;
      }
    }
  }
  return out;
}
