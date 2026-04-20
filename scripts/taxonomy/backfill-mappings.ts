/**
 * Central mapping layer for taxonomy backfill — no ad-hoc rules in the scan loop.
 * See docs/backfill-taxonomy-report-template.md
 */

import { PHASE1_MODULES } from "@/content/programs/phase1/modules";
import { PHASE1_SKILLS, PHASE1_TOPIC_LABELS } from "@/content/programs/phase1/skill-map";
import type { Phase1ModuleKey, Phase1SkillKey, Phase1TopicKey } from "@/content/programs/phase1/types";
import { parseQuestionNotes, type ParsedQuestionClassification } from "@/lib/question-taxonomy";
import { PERSONALIZED_PHASE1_BANK } from "../../prisma/seed-data/personalized-phase1-bank";
import type { QuestionSourceQuality } from "@/lib/question-fields";

export type ConfidenceTier = "high" | "medium" | "low";

export type TopicInference = {
  topicKey: Phase1TopicKey | null;
  tier: ConfidenceTier;
  reason: string;
};

export type SkillInference = {
  skillKey: Phase1SkillKey | null;
  tier: ConfidenceTier;
  reason: string;
};

export type ModuleInference = {
  moduleKey: Phase1ModuleKey | null;
  tier: ConfidenceTier;
  reason: string;
};

export type SourceQualityInference = {
  sourceQuality: QuestionSourceQuality | null;
  tier: ConfidenceTier;
  reason: string;
};

const _TOPIC_DISPLAY_LABEL_TO_KEY: Map<string, Phase1TopicKey> = new Map();
for (const [key, label] of Object.entries(PHASE1_TOPIC_LABELS) as [Phase1TopicKey, string][]) {
  _TOPIC_DISPLAY_LABEL_TO_KEY.set(label.trim().toLowerCase(), key);
}

/** Full display label (from PHASE1_TOPIC_LABELS value) -> canonical topicKey */
export const TOPIC_DISPLAY_LABEL_TO_KEY_SYNC: ReadonlyMap<string, Phase1TopicKey> = _TOPIC_DISPLAY_LABEL_TO_KEY;

/** Short English / common import topic strings -> topicKey (medium confidence). */
export const TOPIC_ALIAS_TO_KEY: ReadonlyMap<string, Phase1TopicKey> = new Map([
  ["finance", "finance"],
  ["financial", "finance"],
  ["accounting", "finance"],
  ["office", "office"],
  ["admin", "office"],
  ["meetings", "meetings"],
  ["meeting", "meetings"],
  ["notices", "notices"],
  ["notice", "notices"],
  ["announcements", "notices"],
  ["hr", "hr"],
  ["recruitment", "hr"],
  ["coordination", "coordination"],
  ["operations", "operations"],
  ["marketing", "marketing"],
  ["logistics", "logistics"],
  ["tech", "tech"],
  ["technology", "tech"],
  ["communication", "communication"],
  ["health", "healthEnv"],
  ["healthEnv", "healthEnv"],
  ["daily", "daily"],
  ["travel", "daily"],
]);

export const SEED_QUESTION_TEXT_SET: ReadonlySet<string> = new Set(
  PERSONALIZED_PHASE1_BANK.map((row) => row.questionText),
);

function normalizeTopicInput(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * Map existing `topic` column to Phase1TopicKey.
 * - High: exact match to official bilingual label (case-insensitive) or exact topicKey string.
 * - Medium: English alias table (single unambiguous token).
 * - Low: no match.
 */
export function inferTopicKeyFromTopicColumn(topic: string): TopicInference {
  const n = normalizeTopicInput(topic);
  if (!n) {
    return { topicKey: null, tier: "low", reason: "empty topic" };
  }

  const lower = n.toLowerCase();

  const byLabel = TOPIC_DISPLAY_LABEL_TO_KEY_SYNC.get(lower);
  if (byLabel) {
    return { topicKey: byLabel, tier: "high", reason: "exact match to PHASE1_TOPIC_LABELS value" };
  }

  if (/^[a-z]+$/i.test(n) && TOPIC_ALIAS_TO_KEY.has(lower)) {
    return {
      topicKey: TOPIC_ALIAS_TO_KEY.get(lower)!,
      tier: "medium",
      reason: "matched TOPIC_ALIAS_TO_KEY (short English token)",
    };
  }

  const keyAsTopic = lower as Phase1TopicKey;
  if (PHASE1_TOPIC_LABELS[keyAsTopic]) {
    return { topicKey: keyAsTopic, tier: "high", reason: "topic column equals canonical topicKey" };
  }

  return {
    topicKey: null,
    tier: "low",
    reason: "topic string not in label map or alias table (avoid guessing)",
  };
}

function normalizeForSubFocusCompare(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Map parsed notes (category + sub-focus) to a single skillKey using PHASE1_SKILLS matchers.
 * - High: subFocusLabel exactly equals one matcher subFocusLabels entry (same category).
 * - Medium: exactly one matcher where subFocusLabel includes that entry's distinctive segment (heuristic).
 * - Low: 0 or >1 candidates.
 */
export function inferSkillKeyFromParsedNotes(parsed: ParsedQuestionClassification): SkillInference {
  const sub = normalizeForSubFocusCompare(parsed.subFocusLabel);
  if (sub.length === 0 || sub.includes("未標註") || sub.includes("unspecified")) {
    return {
      skillKey: null,
      tier: "low",
      reason: "subFocus missing or unspecified in notes",
    };
  }

  const sameCategory = PHASE1_SKILLS.filter((s) => s.matcher.category === parsed.category);

  const exactHits: Phase1SkillKey[] = [];
  for (const skill of sameCategory) {
    for (const label of skill.matcher.subFocusLabels) {
      if (normalizeForSubFocusCompare(label) === sub) {
        exactHits.push(skill.skillKey);
      }
    }
  }

  const uniqueExact = [...new Set(exactHits)];
  if (uniqueExact.length === 1) {
    return {
      skillKey: uniqueExact[0],
      tier: "high",
      reason: "subFocusLabel exact match to skill.matcher.subFocusLabels",
    };
  }
  if (uniqueExact.length > 1) {
    return {
      skillKey: null,
      tier: "low",
      reason: `ambiguous exact subFocus match across skills: ${uniqueExact.join(", ")}`,
    };
  }

  const partialHits: Phase1SkillKey[] = [];
  for (const skill of sameCategory) {
    for (const label of skill.matcher.subFocusLabels) {
      const nl = normalizeForSubFocusCompare(label);
      if (nl.length >= 6 && (sub.includes(nl) || nl.includes(sub))) {
        partialHits.push(skill.skillKey);
      }
    }
  }

  const uniquePartial = [...new Set(partialHits)];
  if (uniquePartial.length === 1) {
    return {
      skillKey: uniquePartial[0],
      tier: "medium",
      reason: "single partial overlap between parsed subFocus and one matcher subFocusLabels",
    };
  }

  return {
    skillKey: null,
    tier: "low",
    reason:
      uniquePartial.length === 0
        ? "no skill matcher matched parsed subFocus"
        : `ambiguous partial skill candidates: ${uniquePartial.join(", ")}`,
  };
}

export function parseNotesForClassification(notes: string | null | undefined): ParsedQuestionClassification | null {
  return parseQuestionNotes(notes);
}

/**
 * Conservative moduleKey: only when exactly one Phase1 module lists this skill in targetSkills.
 * If multiple modules share the skill, do not assign moduleKey (caller marks unresolved for module).
 */
export function inferModuleKeyFromSkill(skillKey: Phase1SkillKey | null): ModuleInference {
  if (!skillKey) {
    return { moduleKey: null, tier: "low", reason: "no skillKey" };
  }

  const modules = PHASE1_MODULES.filter((m) => m.targetSkills.includes(skillKey));
  if (modules.length === 1) {
    return {
      moduleKey: modules[0].moduleKey,
      tier: "high",
      reason: "unique module contains this skillKey in targetSkills",
    };
  }

  if (modules.length === 0) {
    return { moduleKey: null, tier: "low", reason: "no module lists this skillKey (unexpected)" };
  }

  return {
    moduleKey: null,
    tier: "low",
    reason: `multiple modules share skillKey ${skillKey}: ${modules.map((m) => m.moduleKey).join(", ")} — skip moduleKey`,
  };
}

function isStructuredCanonicalNotes(notes: string | null | undefined): boolean {
  if (!notes?.trim()) return false;
  return notes.includes("|") && notes.includes("/");
}

/** Heuristic: CSV import merged grammar points into notes without canonical category prefix. */
export function isLikelyCsvGrammarNotes(notes: string | null | undefined): boolean {
  if (!notes?.trim()) return false;
  if (notes.includes("|")) return false;
  return notes.includes(",") && notes.length > 15;
}

/**
 * Infer sourceQuality when DB value is null. Uses seed corpus + note shape heuristics.
 * Does not inspect request/runtime — offline only.
 */
export function inferSourceQuality(input: {
  questionText: string;
  notes: string | null;
  topic: string;
  priorKnown: boolean | null;
}): SourceQualityInference {
  if (SEED_QUESTION_TEXT_SET.has(input.questionText)) {
    return { sourceQuality: "seed", tier: "high", reason: "questionText exists in PERSONALIZED_PHASE1_BANK" };
  }

  if (isLikelyCsvGrammarNotes(input.notes)) {
    return {
      sourceQuality: "import_csv",
      tier: "medium",
      reason: "notes look like comma-joined grammar hints without canonical category pipe (CSV path)",
    };
  }

  if (isStructuredCanonicalNotes(input.notes)) {
    return {
      sourceQuality: "manual",
      tier: "medium",
      reason: "structured notes with category | subfocus but not in seed corpus (likely manual or tooling)",
    };
  }

  const topicInf = inferTopicKeyFromTopicColumn(input.topic);
  if (topicInf.tier === "medium" && !input.notes?.trim()) {
    return {
      sourceQuality: "import_json",
      tier: "medium",
      reason: "short topic alias with minimal notes — typical JSON import shape",
    };
  }

  return {
    sourceQuality: "unknown",
    tier: "medium",
    reason: "no strong seed/CSV/structured signal — default unknown",
  };
}

