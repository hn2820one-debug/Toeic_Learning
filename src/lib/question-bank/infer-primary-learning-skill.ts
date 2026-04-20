import type { Phase1SkillKey, Phase1TopicKey } from "@/content/programs/phase1/types";

import {
  inferSkillKeyFromParsedNotes,
  inferTopicKeyFromTopicColumn,
  normalizeForSubFocusCompare,
  parseNotesForClassification,
} from "../../../scripts/taxonomy/backfill-mappings";

import {
  LEGACY_TO_LEARNING_SKILL,
  PHASE1_SKILL_KEY_TO_LEARNING_SKILL,
  SUBFOCUS_TO_LEARNING_SKILL,
  topicKeyToDomainVocabSkill,
} from "./learning-skill-mappings";

export type InferPrimarySkillInput = {
  explicitPrimary?: string | null;
  skillKey?: string | null;
  topicKey?: string | null;
  topic: string;
  notes?: string | null;
};

/**
 * Infer primary LearningSkill.skillCode for a question row (create/update).
 * Validate the returned code with {@link isKnownLearningSkillCode} before persisting.
 */
export function inferPrimaryLearningSkillCode(input: InferPrimarySkillInput): {
  code: string | null;
  warnings: string[];
} {
  const warnings: string[] = [];
  const explicit = input.explicitPrimary?.trim();
  if (explicit) {
    return { code: explicit, warnings };
  }

  const sk = input.skillKey?.trim();
  if (sk && sk in PHASE1_SKILL_KEY_TO_LEARNING_SKILL) {
    return {
      code: PHASE1_SKILL_KEY_TO_LEARNING_SKILL[sk as Phase1SkillKey],
      warnings,
    };
  }

  const parsed = parseNotesForClassification(input.notes);
  if (parsed) {
    const nk = normalizeForSubFocusCompare(parsed.subFocusLabel);
    const direct = SUBFOCUS_TO_LEARNING_SKILL[nk];
    if (direct) {
      if (nk === normalizeForSubFocusCompare("領域字彙 / Domain vocabulary")) {
        const tk =
          (input.topicKey as Phase1TopicKey | null) ??
          inferTopicKeyFromTopicColumn(input.topic).topicKey ??
          null;
        if (tk) {
          return { code: topicKeyToDomainVocabSkill(tk), warnings };
        }
        warnings.push("領域字彙 / Domain vocabulary requires a resolvable topicKey; primaryLearningSkillCode left empty.");
        return { code: null, warnings };
      }
      return { code: direct, warnings };
    }
  }

  const rawNotes = input.notes?.trim() ?? "";
  if (rawNotes.length > 0 && !rawNotes.includes("|")) {
    const lower = rawNotes.toLowerCase();
    const tokenHits: string[] = [];
    for (const [token, code] of Object.entries(LEGACY_TO_LEARNING_SKILL)) {
      if (lower.includes(token)) {
        tokenHits.push(code);
      }
    }
    if (tokenHits.length === 1) {
      return { code: tokenHits[0], warnings };
    }
    if (tokenHits.length > 1) {
      warnings.push("Legacy notes matched multiple learning-skill tokens; primaryLearningSkillCode left empty.");
      return { code: null, warnings };
    }
  }

  if (parsed) {
    const inferred = inferSkillKeyFromParsedNotes(parsed);
    if (inferred.skillKey && inferred.tier !== "low") {
      const code = PHASE1_SKILL_KEY_TO_LEARNING_SKILL[inferred.skillKey];
      if (code) {
        return { code, warnings };
      }
    }
  }

  warnings.push("Could not infer primaryLearningSkillCode from skillKey, notes, or topic; left empty.");
  return { code: null, warnings };
}
