import type { Prisma } from "../../../generated/prisma";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import { LEARNING_SKILLS_SEED } from "../../../prisma/seed-data/learning-skills";
import type { NormalizedQuestionFields, QuestionFieldInput } from "@/lib/question-fields";
import { formatQuestionNotes, type QuestionCategory } from "@/lib/question-taxonomy";
import { inferModuleKeyFromSkill } from "../../../scripts/taxonomy/backfill-mappings";

import { inferPrimaryLearningSkillCode } from "./infer-primary-learning-skill";

const KNOWN_LEARNING_SKILL_CODES = new Set(LEARNING_SKILLS_SEED.map((s) => s.skillCode));

const PHASE1_TOPIC_KEYS = new Set<string>([
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

export type QuestionBankSourceKind = "manual" | "import_json" | "import_csv" | "llm" | "seed";

/** Optional v2 / extended fields — may be present on JSON import or future forms. */
export type QuestionBankExtraInput = {
  notes?: string | null;
  part?: number | null;
  primaryLearningSkillCode?: string | null;
  coreRule?: string | null;
  recognitionSignal?: string | null;
  hint1?: string | null;
  hint2?: string | null;
  hint3?: string | null;
  /** Object or JSON-parseable value; stored as Json. */
  distractorAnalysisJson?: unknown;
  registerLevel?: string | null;
  industryFocus?: string | null;
};

export type NormalizeQuestionBankOptions = {
  sourceKind: QuestionBankSourceKind;
  /** When omitted, derived from sourceKind (manual/import_json/import_csv/llm). */
  defaultSourceQuality?: string;
  extra?: QuestionBankExtraInput;
  /** CSV: grammarPoints column → canonical notes via Grammar category. */
  grammarPointsRaw?: string | null;
};

function defaultSourceQualityForKind(kind: QuestionBankSourceKind): string {
  switch (kind) {
    case "manual":
      return "manual";
    case "import_json":
      return "import_json";
    case "import_csv":
      return "import_csv";
    case "llm":
      return "llm";
    case "seed":
      return "seed";
    default:
      return "unknown";
  }
}

function hasOwn(input: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(input, key);
}

/**
 * Default difficulty B and optional empty-string cleanup before {@link validateAndNormalizeQuestionInput}.
 */
export function applyQuestionFieldDefaults(input: QuestionFieldInput): QuestionFieldInput {
  const raw = input as Record<string, unknown>;
  const out: QuestionFieldInput = { ...input };
  if (!hasOwn(raw, "difficulty") || raw.difficulty === undefined || raw.difficulty === null || raw.difficulty === "") {
    out.difficulty = "B";
  }
  return out;
}

export function isKnownLearningSkillCode(code: string | null | undefined): boolean {
  if (!code?.trim()) return false;
  return KNOWN_LEARNING_SKILL_CODES.has(code.trim());
}

/**
 * Keep only valid Phase1TopicKey; invalid strings become null with a warning.
 */
export function normalizePhase1TopicKey(
  raw: string | null | undefined,
  warnings: string[],
): string | null {
  if (raw === undefined || raw === null || raw === "") {
    return null;
  }
  const t = raw.trim();
  if (PHASE1_TOPIC_KEYS.has(t)) {
    return t;
  }
  warnings.push(`topicKey "${t}" is not a valid Phase1TopicKey; cleared.`);
  return null;
}

function normalizePart(raw: number | null | undefined, warnings: string[]): number {
  if (raw === undefined || raw === null || Number.isNaN(Number(raw))) {
    return 5;
  }
  const n = Math.floor(Number(raw));
  if (n < 1 || n > 7) {
    warnings.push(`part ${raw} out of range 1–7; using 5.`);
    return 5;
  }
  return n;
}

function normalizeDistractorJson(raw: unknown, warnings: string[]): Prisma.InputJsonValue | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Prisma.InputJsonValue;
    } catch {
      warnings.push("distractorAnalysisJson string was not valid JSON; ignored.");
      return undefined;
    }
  }
  if (typeof raw === "object") {
    return raw as Prisma.InputJsonValue;
  }
  warnings.push("distractorAnalysisJson had unexpected type; ignored.");
  return undefined;
}

/**
 * Canonical notes for CSV grammarPoints: `文法 / Grammar | …` using comma-joined hints as sub-focus.
 */
export function grammarPointsToCanonicalNotes(grammarPoints: string | undefined | null): string | null {
  const cleaned = grammarPoints
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
  if (!cleaned?.length) return null;
  return formatQuestionNotes("Grammar", cleaned);
}

function resolveNotes(
  extra: QuestionBankExtraInput | undefined,
  grammarPointsRaw: string | null | undefined,
  warnings: string[],
): string | null {
  const explicit = extra?.notes?.trim();
  if (explicit) {
    return explicit;
  }
  if (grammarPointsRaw?.trim()) {
    return grammarPointsToCanonicalNotes(grammarPointsRaw) ?? null;
  }
  return null;
}

function resolvePrimaryCode(
  validated: NormalizedQuestionFields,
  topicKeyNorm: string | null,
  notes: string | null,
  extra: QuestionBankExtraInput | undefined,
  warnings: string[],
): string | null {
  const inferred = inferPrimaryLearningSkillCode({
    explicitPrimary: extra?.primaryLearningSkillCode,
    skillKey: validated.skillKey ?? null,
    topicKey: topicKeyNorm,
    topic: validated.topic,
    notes,
  });

  for (const w of inferred.warnings) {
    warnings.push(w);
  }

  let code = inferred.code;
  if (code && !isKnownLearningSkillCode(code)) {
    warnings.push(`primaryLearningSkillCode "${code}" is not in the LearningSkill seed list; cleared.`);
    code = null;
  }
  return code;
}

function resolveModuleKey(skillKey: string | null | undefined, explicitModuleKey: string | null | undefined, warnings: string[]): string | null {
  if (explicitModuleKey !== undefined && explicitModuleKey !== null) {
    return explicitModuleKey;
  }
  if (!skillKey) {
    return null;
  }
  const mod = inferModuleKeyFromSkill(skillKey as import("@/content/programs/phase1/types").Phase1SkillKey);
  if (mod.moduleKey && mod.tier === "high") {
    return mod.moduleKey;
  }
  if (mod.tier === "low" && mod.reason.includes("multiple")) {
    warnings.push(`moduleKey not inferred: ${mod.reason}`);
  }
  return null;
}

/**
 * Build Prisma create payload for QuestionBankItem — **single** entry for manual + imports + LLM.
 */
export function toQuestionBankCreateInput(
  validated: NormalizedQuestionFields,
  options: NormalizeQuestionBankOptions,
): { data: Prisma.QuestionBankItemUncheckedCreateInput; warnings: string[] } {
  const warnings: string[] = [];
  const extra = options.extra ?? {};
  const grammarPointsRaw = options.grammarPointsRaw;

  const notes = resolveNotes(extra, grammarPointsRaw, warnings);
  const topicKeyNorm = normalizePhase1TopicKey(validated.topicKey ?? null, warnings);
  const primaryLearningSkillCode = resolvePrimaryCode(validated, topicKeyNorm, notes, extra, warnings);
  const part = normalizePart(extra.part, warnings);
  const moduleKey = resolveModuleKey(validated.skillKey, validated.moduleKey, warnings);

  const sourceQuality =
    validated.sourceQuality !== undefined && validated.sourceQuality !== null
      ? validated.sourceQuality
      : options.defaultSourceQuality ?? defaultSourceQualityForKind(options.sourceKind);

  const distractorAnalysisJson = normalizeDistractorJson(extra.distractorAnalysisJson, warnings);

  const data: Prisma.QuestionBankItemUncheckedCreateInput = {
    questionText: validated.questionText,
    optionA: validated.optionA,
    optionB: validated.optionB,
    optionC: validated.optionC,
    optionD: validated.optionD,
    correctAnswer: validated.correctAnswer,
    explanation: validated.explanation,
    topic: validated.topic,
    difficulty: validated.difficulty,
    part,
    sourceQuality,
    notes: notes ?? undefined,
    skillKey: validated.skillKey ?? undefined,
    topicKey: topicKeyNorm ?? undefined,
    moduleKey: moduleKey ?? undefined,
    priorKnown: validated.priorKnown ?? undefined,
    primaryLearningSkillCode: primaryLearningSkillCode ?? undefined,
    coreRule: extra.coreRule?.trim() || undefined,
    recognitionSignal: extra.recognitionSignal?.trim() || undefined,
    hint1: extra.hint1?.trim() || undefined,
    hint2: extra.hint2?.trim() || undefined,
    hint3: extra.hint3?.trim() || undefined,
    distractorAnalysisJson,
    registerLevel: extra.registerLevel?.trim() || undefined,
    industryFocus: extra.industryFocus?.trim() || undefined,
  };

  return { data, warnings };
}

/**
 * Build Prisma update payload — same taxonomy rules; omit fields that should not erase on partial update
 * when undefined (caller passes full normalized row from form).
 */
export function toQuestionBankUpdateInput(
  validated: NormalizedQuestionFields,
  options: NormalizeQuestionBankOptions,
): { data: Prisma.QuestionBankItemUncheckedUpdateInput; warnings: string[] } {
  const { data: createShape, warnings } = toQuestionBankCreateInput(validated, options);
  const u: Prisma.QuestionBankItemUncheckedUpdateInput = {
    questionText: createShape.questionText,
    optionA: createShape.optionA,
    optionB: createShape.optionB,
    optionC: createShape.optionC,
    optionD: createShape.optionD,
    correctAnswer: createShape.correctAnswer,
    explanation: createShape.explanation,
    topic: createShape.topic,
    difficulty: createShape.difficulty,
    part: createShape.part,
    sourceQuality: createShape.sourceQuality,
    notes: createShape.notes,
    skillKey: createShape.skillKey,
    topicKey: createShape.topicKey,
    moduleKey: createShape.moduleKey,
    priorKnown: createShape.priorKnown,
    primaryLearningSkillCode: createShape.primaryLearningSkillCode,
    coreRule: createShape.coreRule,
    recognitionSignal: createShape.recognitionSignal,
    hint1: createShape.hint1,
    hint2: createShape.hint2,
    hint3: createShape.hint3,
    distractorAnalysisJson: createShape.distractorAnalysisJson,
    registerLevel: createShape.registerLevel,
    industryFocus: createShape.industryFocus,
  };
  return { data: u, warnings };
}
