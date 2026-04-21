import "server-only";

import type { Prisma } from "../../../generated/prisma";

import { PHASE1_MODULES } from "@/content/programs/phase1/modules";
import { PHASE1_TOPIC_KEYS_IN_ORDER } from "@/content/programs/phase1/topic-order";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import { primaryModuleForTopic } from "@/lib/learning-path";
import { prisma } from "@/lib/prisma";

import { resolvePracticeQuestionCount } from "./resolve-practice-count";

export { resolvePracticeQuestionCount };
export type { PracticeRuntimeMeta } from "./practice-runtime-types";

function relatedTopicKeys(topicKey: Phase1TopicKey): Phase1TopicKey[] {
  const idx = PHASE1_TOPIC_KEYS_IN_ORDER.indexOf(topicKey);
  const out: Phase1TopicKey[] = [];
  if (idx > 0) {
    out.push(PHASE1_TOPIC_KEYS_IN_ORDER[idx - 1]!);
  }
  if (idx >= 0 && idx < PHASE1_TOPIC_KEYS_IN_ORDER.length - 1) {
    out.push(PHASE1_TOPIC_KEYS_IN_ORDER[idx + 1]!);
  }
  const seen = new Set<string>();
  const deduped: Phase1TopicKey[] = [];
  for (const k of out) {
    if (!seen.has(k)) {
      seen.add(k);
      deduped.push(k);
    }
  }
  return deduped;
}

async function takeIds(
  where: Prisma.QuestionBankItemWhereInput,
  used: Set<number>,
  need: number,
  out: number[],
): Promise<void> {
  if (need <= 0) return;
  const rows = await prisma.questionBankItem.findMany({
    where: {
      ...where,
      id: { notIn: [...used] },
    },
    take: need * 3,
    orderBy: { id: "asc" },
    select: { id: true },
  });
  for (const r of rows) {
    if (out.length >= need) break;
    if (!used.has(r.id)) {
      used.add(r.id);
      out.push(r.id);
    }
  }
}

export type DualAxisPracticeSpec = {
  topicKey: Phase1TopicKey;
  /** `primaryLearningSkillCode` e.g. grammar_svc */
  skill?: string | null;
  moduleKey?: string | null;
  /** Capped 1–15 by caller */
  count: number;
};

/**
 * Dual-axis selection: prefer skill + topic → skill only → topic only → adjacent topics → module skillKeys → global.
 */
export async function selectDualAxisPracticeQuestionIds(spec: DualAxisPracticeSpec): Promise<number[]> {
  const target = Math.max(1, spec.count);
  const skill = spec.skill?.trim() || null;
  const topic = spec.topicKey;
  const used = new Set<number>();
  const out: number[] = [];

  const need = () => target - out.length;

  if (skill) {
    await takeIds({ primaryLearningSkillCode: skill, topicKey: topic }, used, need(), out);
    await takeIds({ primaryLearningSkillCode: skill }, used, need(), out);
  }

  await takeIds({ topicKey: topic }, used, need(), out);

  for (const rt of relatedTopicKeys(topic)) {
    await takeIds({ topicKey: rt }, used, need(), out);
    if (out.length >= target) break;
  }

  const mod =
    spec.moduleKey && PHASE1_MODULES.some((m) => m.moduleKey === spec.moduleKey)
      ? PHASE1_MODULES.find((m) => m.moduleKey === spec.moduleKey)!
      : primaryModuleForTopic(topic);

  await takeIds({ skillKey: { in: mod.targetSkills } }, used, need(), out);

  await takeIds({}, used, need(), out);

  return out.slice(0, target);
}

