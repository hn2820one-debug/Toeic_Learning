import "server-only";

import {
  isVerifyPart5V2Acceptable,
  part5V2ToVerifyInput,
  PART5_V2_VERIFIER_DB_LABEL,
  verifyPart5V2WithClaude,
  type VerifyPart5V2Normalized,
} from "@/lib/llm/claude-verify-part5-v2";
import { GeminiGenerationError, GEMINI_PART5_GENERATION_MODEL, generatePart5ItemV2WithGemini } from "@/lib/llm/gemini-generate";
import { prisma } from "@/lib/prisma";
import type { Part5GeneratedItem, Part5GeneratedItemV2 } from "@/lib/llm/types";
import type { LearningSkill } from "../../../generated/prisma";

/** POST body for `/api/admin/bank/generate-v2`. */
export type GenerateV2Request = {
  skillCode: string;
  count: number;
  scenario?: string;
  topicKey?: string;
  dryRun?: boolean;
  industryFocus?: string;
  registerLevel?: "formal" | "neutral" | "mixed";
  /**
   * When `questionText` (stem) already exists in DB:
   * - `error` — fail that item (default, safest).
   * - `skip` — do not write; not counted as failed.
   * - `overwrite` — update the existing row with new v2 fields (same id).
   */
  duplicatePolicy?: "skip" | "overwrite" | "error";
};

export type GenerateV2StructuralResult = {
  ok: boolean;
  errors: string[];
};

export type GenerateV2ItemResult = {
  index: number;
  generated?: Part5GeneratedItemV2;
  /** Payload after optional verifier normalization (used for persist / dry-run preview). */
  merged?: Part5GeneratedItemV2;
  structural?: GenerateV2StructuralResult;
  verify?:
    | {
        mode: "claude-v2";
        pass: boolean;
        score: number;
        reason: string;
        normalized?: VerifyPart5V2Normalized;
        acceptable: boolean;
      }
    | { mode: "skipped"; reason: string };
  /** Set when duplicatePolicy=skip and stem already in DB. */
  duplicateSkipped?: boolean;
  persisted?: { id: number; action: "inserted" | "updated" } | null;
  error?: string;
};

export type GenerateV2BatchResult = {
  ok: boolean;
  dryRun: boolean;
  skillCode: string;
  duplicatePolicy: "skip" | "overwrite" | "error";
  summary: {
    requested: number;
    generated: number;
    structuralPass: number;
    verifierAccept: number;
    persisted: number;
    skippedDuplicate: number;
    overwritten: number;
    failed: number;
  };
  items: GenerateV2ItemResult[];
};

const PHASE1_TOPIC_KEYS = new Set([
  "office",
  "notices",
  "meetings",
  "coordination",
  "hr",
  "finance",
  "operations",
  "marketing",
  "logistics",
  "tech",
  "communication",
  "healthEnv",
  "daily",
]);

function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

function difficultyBandToLetter(band: string): "A" | "B" | "C" {
  const b = band.toLowerCase();
  if (b === "beginner") return "A";
  if (b === "advanced") return "C";
  return "B";
}

function mapRegisterForDb(level?: "formal" | "neutral" | "mixed"): string | undefined {
  if (!level) return undefined;
  if (level === "formal") return "formal";
  if (level === "neutral") return "semi_formal";
  return "mixed";
}

/** Map V2 output to v1 shape — kept for external tooling / tests; v1 pipeline unchanged. */
export function part5V2ToPart5ForVerifier(item: Part5GeneratedItemV2): Part5GeneratedItem {
  return {
    stem: item.stem,
    choices: item.choices,
    answer: item.answer,
    grammar_point: item.targetSkillCode,
    difficulty: item.difficulty,
    explanation_zh_hant: item.explanation_zh_hant,
  };
}

/** Merge verifier \`normalized\` touch-ups into a v2 item before persist. */
export function applyV2Normalization(item: Part5GeneratedItemV2, normalized?: VerifyPart5V2Normalized): Part5GeneratedItemV2 {
  if (!normalized) return item;
  return {
    ...item,
    coreRule: normalized.coreRule?.trim() || item.coreRule,
    recognitionSignal: normalized.recognitionSignal?.trim() || item.recognitionSignal,
    hint1: normalized.hint1?.trim() || item.hint1,
    hint2: normalized.hint2?.trim() || item.hint2,
    hint3: normalized.hint3?.trim() || item.hint3,
    explanation_zh_hant: normalized.explanation?.trim() || item.explanation_zh_hant,
  };
}

/** Re-check hints after normalization — avoids empty strings from bad model edits. */
function postNormalizeStructuralOk(item: Part5GeneratedItemV2): boolean {
  for (const h of [item.hint1, item.hint2, item.hint3, item.coreRule, item.recognitionSignal]) {
    if (typeof h !== "string" || h.trim().length === 0) return false;
  }
  return true;
}

/**
 * Fast structural checks before (optional) Claude — no network.
 * Ensures blanks, answer key, skill code alignment, and distractor payload shape.
 */
export function basicStructuralVerifyV2(
  item: Part5GeneratedItemV2,
  expectedSkillCode: string,
): GenerateV2StructuralResult {
  const errors: string[] = [];

  if (typeof item.stem !== "string" || item.stem.trim().length < 10) {
    errors.push("stem missing or too short.");
  } else if (!/_{2,}/.test(item.stem)) {
    errors.push("stem must contain a blank (e.g. ____).");
  }

  if (item.targetSkillCode !== expectedSkillCode) {
    errors.push(`targetSkillCode mismatch: expected "${expectedSkillCode}", got "${item.targetSkillCode}".`);
  }

  const d = item.difficulty;
  if (d !== "A" && d !== "B" && d !== "C" && d !== "D") {
    errors.push(`difficulty must be A/B/C/D, got "${d}".`);
  }

  const ans = item.answer;
  const choice = item.choices[ans];
  if (typeof choice !== "string" || choice.trim().length === 0) {
    errors.push(`choices.${ans} is missing or empty.`);
  }

  for (const key of ["A", "B", "C", "D"] as const) {
    const c = item.choices[key];
    if (typeof c !== "string" || c.trim().length === 0) {
      errors.push(`choices.${key} is missing or empty.`);
    }
  }

  for (const h of [item.hint1, item.hint2, item.hint3] as const) {
    if (typeof h !== "string" || h.trim().length === 0) {
      errors.push("hint1/2/3 must be non-empty strings.");
      break;
    }
  }

  if (typeof item.coreRule !== "string" || item.coreRule.trim().length === 0) {
    errors.push("coreRule is required.");
  }
  if (typeof item.recognitionSignal !== "string" || item.recognitionSignal.trim().length === 0) {
    errors.push("recognitionSignal is required.");
  }

  const da = item.distractorAnalysis;
  for (const key of ["A", "B", "C", "D"] as const) {
    const entry = da[key];
    if (!entry || typeof entry.type !== "string" || typeof entry.whyPlausible !== "string" || typeof entry.whyWrong !== "string") {
      errors.push(`distractorAnalysis.${key} incomplete.`);
    }
  }

  const correctEntry = da[ans];
  if (correctEntry && correctEntry.type !== "correct") {
    errors.push(`distractorAnalysis.${ans} must have type "correct" for the keyed answer.`);
  }

  for (const key of ["A", "B", "C", "D"] as const) {
    if (key === ans) continue;
    const entry = da[key];
    if (entry?.type === "correct") {
      errors.push(`distractorAnalysis.${key} must not use type "correct" when ${key} is not the answer.`);
    }
  }

  return { ok: errors.length === 0, errors };
}

function resolveScenarioTopicKey(topicKey?: string, scenario?: string): string | undefined {
  const raw = topicKey?.trim() || scenario?.trim();
  if (!raw) return undefined;
  if (!PHASE1_TOPIC_KEYS.has(raw)) {
    throw new Error(`Invalid topicKey/scenario "${raw}". Must be one of: ${[...PHASE1_TOPIC_KEYS].join(", ")}`);
  }
  return raw;
}

function buildV2ScalarWriteData(
  item: Part5GeneratedItemV2,
  skill: LearningSkill,
  topicKeyResolved: string | undefined,
  opts: {
    industryFocus?: string;
    registerLevel?: string;
    verifiedBy: string | null;
    verifiedAt: Date | null;
  },
) {
  return {
    optionA: item.choices.A,
    optionB: item.choices.B,
    optionC: item.choices.C,
    optionD: item.choices.D,
    correctAnswer: item.answer,
    explanation: item.explanation_zh_hant,
    topic: `${skill.labelZh} · Part 5`,
    topicKey: topicKeyResolved ?? null,
    skillKey: skill.parentSkillKey ?? null,
    difficulty: item.difficulty,
    part: 5,
    primaryLearningSkillCode: skill.skillCode,
    coreRule: item.coreRule,
    recognitionSignal: item.recognitionSignal,
    hint1: item.hint1,
    hint2: item.hint2,
    hint3: item.hint3,
    distractorAnalysisJson: item.distractorAnalysis as object,
    registerLevel: opts.registerLevel ?? null,
    industryFocus: opts.industryFocus?.trim() || null,
    sourceQuality: "llm",
    generatedBy: GEMINI_PART5_GENERATION_MODEL,
    verifiedBy: opts.verifiedBy,
    verifiedAt: opts.verifiedAt,
  };
}

async function persistOrUpsertV2Question(
  item: Part5GeneratedItemV2,
  skill: LearningSkill,
  topicKeyResolved: string | undefined,
  opts: {
    industryFocus?: string;
    registerLevel?: string;
    verifiedBy: string | null;
    verifiedAt: Date | null;
  },
  duplicatePolicy: "skip" | "overwrite" | "error",
): Promise<{ action: "inserted" | "updated" | "skipped"; id?: number }> {
  const stemKey = item.stem.trim();
  const existing = await prisma.questionBankItem.findUnique({
    where: { questionText: stemKey },
    select: { id: true },
  });

  const scalars = buildV2ScalarWriteData(item, skill, topicKeyResolved, opts);

  if (!existing) {
    const row = await prisma.questionBankItem.create({
      data: {
        questionText: stemKey,
        ...scalars,
      },
    });
    return { action: "inserted", id: row.id };
  }

  if (duplicatePolicy === "error") {
    throw new Error(`DUPLICATE_STEM: questionText already exists (id=${existing.id}).`);
  }
  if (duplicatePolicy === "skip") {
    return { action: "skipped" };
  }

  const row = await prisma.questionBankItem.update({
    where: { id: existing.id },
    data: scalars,
  });
  return { action: "updated", id: row.id };
}

export async function runGenerateBankV2Batch(body: GenerateV2Request): Promise<GenerateV2BatchResult> {
  const skillCode = body.skillCode.trim();
  if (!skillCode) {
    throw new Error("skillCode is required.");
  }

  const count = Math.floor(Number(body.count));
  if (!Number.isFinite(count) || count < 1 || count > 20) {
    throw new Error("count must be an integer from 1 to 20.");
  }

  const dryRun = Boolean(body.dryRun);
  const duplicatePolicy = body.duplicatePolicy ?? "error";

  const skill = await prisma.learningSkill.findUnique({
    where: { skillCode },
  });

  if (!skill) {
    throw new Error(`LearningSkill not found: "${skillCode}".`);
  }

  const scenarioTopicKey = resolveScenarioTopicKey(body.topicKey, body.scenario);
  const letterDifficulty = difficultyBandToLetter(skill.difficultyBand);
  const industryFocus = body.industryFocus?.trim() || undefined;
  const registerDb = mapRegisterForDb(body.registerLevel);

  const items: GenerateV2ItemResult[] = [];
  let generated = 0;
  let structuralPass = 0;
  let verifierAccept = 0;
  let persisted = 0;
  let skippedDuplicate = 0;
  let overwritten = 0;
  let failed = 0;

  const baseSeed = Date.now() % 1_000_000_000;

  for (let i = 0; i < count; i += 1) {
    const index = i;
    const itemResult: GenerateV2ItemResult = { index };

    try {
      const gen = await generatePart5ItemV2WithGemini({
        targetSkillCode: skill.skillCode,
        skillLabelZh: skill.labelZh,
        skillLabelEn: skill.labelEn,
        skillCategory: skill.category,
        difficulty: letterDifficulty,
        scenarioTopicKey,
        industryFocus,
        seed: baseSeed + i * 17,
      });

      generated += 1;
      itemResult.generated = gen.parsedItem;

      const structural = basicStructuralVerifyV2(gen.parsedItem, skillCode);
      itemResult.structural = structural;
      if (!structural.ok) {
        failed += 1;
        itemResult.error = structural.errors.join(" ");
        items.push(itemResult);
        continue;
      }
      structuralPass += 1;

      let merged: Part5GeneratedItemV2 = gen.parsedItem;
      let verifierAcceptable = false;

      if (isAnthropicConfigured()) {
        try {
          const verifyInput = part5V2ToVerifyInput(gen.parsedItem, skill.skillCode);
          const v2 = await verifyPart5V2WithClaude(verifyInput);
          const acceptable = isVerifyPart5V2Acceptable(v2.result);
          merged = applyV2Normalization(gen.parsedItem, v2.result.normalized);

          if (!postNormalizeStructuralOk(merged)) {
            failed += 1;
            itemResult.merged = merged;
            itemResult.verify = {
              mode: "claude-v2",
              pass: v2.result.pass,
              score: v2.result.score,
              reason: v2.result.reason,
              normalized: v2.result.normalized,
              acceptable: false,
            };
            itemResult.error = "Post-normalize structural check failed (empty hint/rule).";
            items.push(itemResult);
            continue;
          }

          verifierAcceptable = acceptable;
          itemResult.verify = {
            mode: "claude-v2",
            pass: v2.result.pass,
            score: v2.result.score,
            reason: v2.result.reason,
            normalized: v2.result.normalized,
            acceptable,
          };

          if (!acceptable) {
            failed += 1;
            itemResult.merged = merged;
            itemResult.error = `Verifier rejected: pass=${v2.result.pass}, score=${v2.result.score.toFixed(2)}.`;
            items.push(itemResult);
            continue;
          }
          verifierAccept += 1;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          itemResult.verify = { mode: "skipped", reason: `Claude v2 verify failed: ${msg}` };
          failed += 1;
          itemResult.error = msg;
          items.push(itemResult);
          continue;
        }
      } else {
        itemResult.verify = { mode: "skipped", reason: "ANTHROPIC_API_KEY not set — structural-only gate." };
        verifierAcceptable = true;
        verifierAccept += 1;
      }

      itemResult.merged = merged;

      const canPersist = structural.ok && verifierAcceptable && !dryRun;
      const verifiedBy = isAnthropicConfigured() ? PART5_V2_VERIFIER_DB_LABEL : null;
      const verifiedAt = isAnthropicConfigured() ? new Date() : null;

      if (canPersist) {
        try {
          const outcome = await persistOrUpsertV2Question(merged, skill, scenarioTopicKey, {
            industryFocus,
            registerLevel: registerDb,
            verifiedBy,
            verifiedAt,
          }, duplicatePolicy);

          if (outcome.action === "skipped") {
            skippedDuplicate += 1;
            itemResult.duplicateSkipped = true;
            itemResult.persisted = null;
          } else if (outcome.action === "inserted") {
            persisted += 1;
            itemResult.persisted = { id: outcome.id!, action: "inserted" };
          } else {
            overwritten += 1;
            itemResult.persisted = { id: outcome.id!, action: "updated" };
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          failed += 1;
          itemResult.error = msg.includes("DUPLICATE_STEM") ? msg : `DB: ${msg}`;
        }
      } else if (dryRun && structural.ok && verifierAcceptable) {
        const existing = await prisma.questionBankItem.findUnique({
          where: { questionText: merged.stem.trim() },
          select: { id: true },
        });
        if (existing) {
          if (duplicatePolicy === "error") {
            failed += 1;
            itemResult.error = `dryRun: would conflict with existing id=${existing.id} (duplicatePolicy=error).`;
          } else if (duplicatePolicy === "skip") {
            itemResult.duplicateSkipped = true;
            itemResult.persisted = null;
          } else {
            itemResult.persisted = { id: existing.id, action: "updated" };
          }
        } else {
          itemResult.persisted = null;
        }
      }
    } catch (e) {
      failed += 1;
      if (e instanceof GeminiGenerationError) {
        itemResult.error = e.message;
      } else {
        itemResult.error = e instanceof Error ? e.message : String(e);
      }
    }

    items.push(itemResult);
  }

  return {
    ok: failed === 0,
    dryRun,
    skillCode,
    duplicatePolicy,
    summary: {
      requested: count,
      generated,
      structuralPass,
      verifierAccept,
      persisted,
      skippedDuplicate,
      overwritten,
      failed,
    },
    items,
  };
}
