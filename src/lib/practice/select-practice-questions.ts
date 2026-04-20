import { PHASE1_TOPIC_KEYS_IN_ORDER } from "@/content/programs/phase1/topic-order";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import { primaryModuleForTopic } from "@/lib/learning-path";
import { prisma } from "@/lib/prisma";

import { PRACTICE_QUESTION_COUNT } from "./practice-state";

function uniqPreserve<T>(ids: T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

function relatedTopicKeys(topicKey: Phase1TopicKey): Phase1TopicKey[] {
  const idx = PHASE1_TOPIC_KEYS_IN_ORDER.indexOf(topicKey);
  const out: Phase1TopicKey[] = [];
  if (idx > 0) {
    out.push(PHASE1_TOPIC_KEYS_IN_ORDER[idx - 1]!);
  }
  if (idx >= 0 && idx < PHASE1_TOPIC_KEYS_IN_ORDER.length - 1) {
    out.push(PHASE1_TOPIC_KEYS_IN_ORDER[idx + 1]!);
  }
  return uniqPreserve(out);
}

async function nextBankId(
  where: NonNullable<Parameters<typeof prisma.questionBankItem.findFirst>[0]>["where"],
  used: Set<number>,
): Promise<number | null> {
  const row = await prisma.questionBankItem.findFirst({
    where: {
      ...where,
      id: { notIn: [...used] },
    },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  return row?.id ?? null;
}

/**
 * Selects 10 question ids for scaffolded practice.
 *
 * **Temporary heuristic** (documented):
 * - 0–2: `LessonPracticeItem` for this `topicKey` when available
 * - 3–5: same `topicKey` from `QuestionBankItem`
 * - 6–8: adjacent topics in `PHASE1_TOPIC_KEYS_IN_ORDER`
 * - 9: same topic again (last item: UI disables hints; selection does not differ)
 *
 * Backfill order if pools are thin: same topic → related topics → any `skillKey` from host module → global bank.
 */
export async function selectPracticeQuestionIds(
  topicKey: Phase1TopicKey,
  opts?: { userId?: number },
): Promise<number[]> {
  const used = new Set<number>();
  const slots: number[] = [];

  const push = (id: number | null) => {
    if (id === null || slots.length >= PRACTICE_QUESTION_COUNT) {
      return;
    }
    if (!used.has(id)) {
      used.add(id);
      slots.push(id);
    }
  };

  const lessons = await prisma.lesson.findMany({
    where: { topicKey },
    select: { id: true },
  });

  let lessonLinked: number[] = [];
  if (lessons.length > 0) {
    const lp = await prisma.lessonPracticeItem.findMany({
      where: { lessonId: { in: lessons.map((l) => l.id) } },
      orderBy: [{ lessonId: "asc" }, { position: "asc" }],
      select: { questionBankItemId: true },
    });
    lessonLinked = uniqPreserve(lp.map((x) => x.questionBankItemId));
  }

  for (const id of lessonLinked) {
    if (slots.length >= 3) {
      break;
    }
    push(id);
  }

  if (opts?.userId != null) {
    const { findRecentHesitationQuestionIds } = await import("@/lib/analytics/hesitation-aggregate");
    const hes = await findRecentHesitationQuestionIds(opts.userId, topicKey, 2);
    for (const id of hes) {
      push(id);
    }
  }

  while (slots.length < 6) {
    const id = await nextBankId({ topicKey }, used);
    if (!id) {
      break;
    }
    push(id);
  }

  const related = relatedTopicKeys(topicKey);
  while (slots.length < 9) {
    let advanced = false;
    for (const tk of related) {
      const id = await nextBankId({ topicKey: tk }, used);
      if (id) {
        push(id);
        advanced = true;
        break;
      }
    }
    if (!advanced) {
      const id = await nextBankId({ topicKey }, used);
      if (!id) {
        break;
      }
      push(id);
    }
  }

  while (slots.length < PRACTICE_QUESTION_COUNT) {
    const id = await nextBankId({ topicKey }, used);
    if (!id) {
      break;
    }
    push(id);
  }

  const mod = primaryModuleForTopic(topicKey);
  while (slots.length < PRACTICE_QUESTION_COUNT) {
    const id = await nextBankId({ skillKey: { in: mod.targetSkills } }, used);
    if (!id) {
      break;
    }
    push(id);
  }

  while (slots.length < PRACTICE_QUESTION_COUNT) {
    const id = await nextBankId({}, used);
    if (!id) {
      break;
    }
    push(id);
  }

  return slots.slice(0, PRACTICE_QUESTION_COUNT);
}
