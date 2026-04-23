import "server-only";

import type { Prisma } from "../../../generated/prisma";

import { PHASE1_MODULES } from "@/content/programs/phase1/modules";
import { PHASE1_TOPIC_KEYS_IN_ORDER } from "@/content/programs/phase1/topic-order";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import { primaryModuleForTopic } from "@/lib/learning-path";
import { prisma } from "@/lib/prisma";

import { resolveTestQuestionCount } from "./resolve-test-count";
import type { CheckpointRuntimeMeta } from "./test-runtime-types";

export type BuildCheckpointSpec = {
  topicKey: Phase1TopicKey;
  skill: string;
  moduleKey?: string | null;
  count: number;
  /**
   * When true (default), the skill phase stops after skill+topic / skill-only passes
   * and does not relax to topic-without-skill or global bank inside that phase.
   */
  strictSkillPhase?: boolean;
};

export type BuildCheckpointResult = {
  questionIds: number[];
  meta: CheckpointRuntimeMeta;
  compositionWarnings: string[];
  /** Transparent: false when fewer than requested items could be assembled. */
  status: "ok" | "insufficient_questions";
  requestedCount: number;
};

const DIFF_PRIORITY: Array<"B" | "C" | "A"> = ["B", "C", "A"];

function uniqPreserveNumber(ids: number[]): number[] {
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

function relatedTopicKeys(topicKey: Phase1TopicKey): Phase1TopicKey[] {
  const idx = PHASE1_TOPIC_KEYS_IN_ORDER.indexOf(topicKey);
  const raw: Phase1TopicKey[] = [];
  if (idx > 0) {
    raw.push(PHASE1_TOPIC_KEYS_IN_ORDER[idx - 1]!);
  }
  if (idx >= 0 && idx < PHASE1_TOPIC_KEYS_IN_ORDER.length - 1) {
    raw.push(PHASE1_TOPIC_KEYS_IN_ORDER[idx + 1]!);
  }
  const seen = new Set<string>();
  const deduped: Phase1TopicKey[] = [];
  for (const k of raw) {
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
  if (need <= 0) {
    return;
  }
  const rows = await prisma.questionBankItem.findMany({
    where: {
      ...where,
      id: { notIn: [...used] },
    },
    take: need * 4,
    orderBy: { id: "asc" },
    select: { id: true },
  });
  for (const r of rows) {
    if (out.length >= need) {
      break;
    }
    if (!used.has(r.id)) {
      used.add(r.id);
      out.push(r.id);
    }
  }
}

async function fillSkillPhase(
  spec: BuildCheckpointSpec,
  used: Set<number>,
  targetLen: number,
  out: number[],
  warnings: string[],
): Promise<void> {
  const strict = spec.strictSkillPhase !== false;
  const skill = spec.skill.trim();
  const topic = spec.topicKey;
  const need = () => targetLen - out.length;

  for (const d of DIFF_PRIORITY) {
    await takeIds({ primaryLearningSkillCode: skill, topicKey: topic, difficulty: d }, used, need(), out);
  }
  if (out.length < targetLen) {
    await takeIds({ primaryLearningSkillCode: skill, topicKey: topic }, used, need(), out);
  }
  for (const d of DIFF_PRIORITY) {
    await takeIds({ primaryLearningSkillCode: skill, difficulty: d }, used, need(), out);
  }
  await takeIds({ primaryLearningSkillCode: skill }, used, need(), out);

  if (!strict) {
    for (const d of DIFF_PRIORITY) {
      await takeIds({ topicKey: topic, difficulty: d }, used, need(), out);
    }
    await takeIds({ topicKey: topic }, used, need(), out);
  }

  if (out.length < targetLen && !strict) {
    warnings.push("skill_phase:relaxed_constraints");
    await takeIds({}, used, need(), out);
  }
}

async function fillMixPhase(
  spec: BuildCheckpointSpec,
  used: Set<number>,
  targetTotal: number,
  out: number[],
  warnings: string[],
): Promise<void> {
  const skill = spec.skill.trim();
  const topic = spec.topicKey;
  const need = () => targetTotal - out.length;

  const mod =
    spec.moduleKey && PHASE1_MODULES.some((m) => m.moduleKey === spec.moduleKey)
      ? PHASE1_MODULES.find((m) => m.moduleKey === spec.moduleKey)!
      : primaryModuleForTopic(topic);

  for (const rt of relatedTopicKeys(topic)) {
    for (const d of DIFF_PRIORITY) {
      await takeIds(
        {
          topicKey: rt,
          NOT: { primaryLearningSkillCode: skill },
          difficulty: d,
        },
        used,
        need(),
        out,
      );
    }
    await takeIds(
      {
        topicKey: rt,
        NOT: { primaryLearningSkillCode: skill },
      },
      used,
      need(),
      out,
    );
    if (out.length >= targetTotal) {
      return;
    }
  }

  for (const rt of relatedTopicKeys(topic)) {
    for (const d of DIFF_PRIORITY) {
      await takeIds({ topicKey: rt, difficulty: d }, used, need(), out);
    }
    await takeIds({ topicKey: rt }, used, need(), out);
    if (out.length >= targetTotal) {
      return;
    }
  }

  for (const d of DIFF_PRIORITY) {
    await takeIds({ skillKey: { in: mod.targetSkills }, difficulty: d }, used, need(), out);
  }
  await takeIds({ skillKey: { in: mod.targetSkills } }, used, need(), out);

  warnings.push("mix_phase:global_fallback");
  await takeIds({}, used, need(), out);
}

/**
 * Dual-axis checkpoint set: first `min(10,count)` slots target skill (+topic), remainder mixed distractors.
 */
export async function buildCheckpointQuestionSet(spec: BuildCheckpointSpec): Promise<BuildCheckpointResult> {
  const warnings: string[] = [];
  const target = Math.max(1, spec.count);
  const skillPhaseLen = Math.min(10, target);
  const used = new Set<number>();
  const out: number[] = [];

  await fillSkillPhase(spec, used, skillPhaseLen, out, warnings);
  if (out.length < skillPhaseLen) {
    warnings.push("skill_phase:short");
  }

  if (target > out.length) {
    await fillMixPhase(spec, used, target, out, warnings);
  }

  const ids = out.slice(0, target);
  const meta: CheckpointRuntimeMeta = {
    mode: "checkpoint",
    skill: spec.skill.trim(),
    topicKey: spec.topicKey,
    moduleKey: spec.moduleKey?.trim() || primaryModuleForTopic(spec.topicKey).moduleKey,
    count: ids.length,
    skillRuleSlots: Math.min(10, ids.length),
    secondsPerQuestion: 30,
  };

  const status = ids.length >= target ? "ok" : "insufficient_questions";

  return {
    questionIds: ids,
    meta,
    compositionWarnings: warnings,
    status,
    requestedCount: target,
  };
}

export async function buildTestSessionFromQuery(params: {
  topicKey: Phase1TopicKey;
  mode?: string;
  skill?: string;
  moduleKey?: string;
  count?: number;
}): Promise<BuildCheckpointResult | null> {
  const mode = params.mode?.trim();
  const skill = params.skill?.trim();
  const useCheckpoint = mode === "checkpoint" || Boolean(skill);

  if (!useCheckpoint || !skill) {
    return null;
  }

  const n = resolveTestQuestionCount(mode, params.count);

  return buildCheckpointQuestionSet({
    topicKey: params.topicKey,
    skill,
    moduleKey: params.moduleKey ?? null,
    count: n,
    strictSkillPhase: true,
  });
}
