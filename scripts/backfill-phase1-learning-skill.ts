/**
 * One-off backfill: assign QuestionBankItem.primaryLearningSkillCode from Phase1 taxonomy signals.
 *
 * Priority (first match wins):
 *   1. Already has primaryLearningSkillCode → skip
 *   2. Existing skillKey (Phase1) → PHASE1_SKILL_KEY_TO_LEARNING_SKILL default
 *   3. Parsed notes (category | subFocus) → SUBFOCUS_TO_LEARNING_SKILL
 *   4. Unstructured notes / grammarPoints-style → LEGACY_TO_LEARNING_SKILL token scan
 *   5. inferSkillKeyFromParsedNotes (Phase1 matcher) → map to LearningSkill
 *   6. Vocabulary + "領域字彙" + topic column → topicKey-based domain vocab skill
 *   7. Otherwise → unresolved (no guess)
 *
 * Usage:
 *   npx tsx scripts/backfill-phase1-learning-skill.ts
 *   npx tsx scripts/backfill-phase1-learning-skill.ts --write
 *   npx tsx scripts/backfill-phase1-learning-skill.ts --write --only-seed
 *
 * Requires DATABASE_URL; uses same Prisma client as the app.
 */
import fs from "node:fs";
import path from "node:path";

import type { Phase1SkillKey, Phase1TopicKey } from "@/content/programs/phase1/types";
import { prisma } from "../src/lib/prisma";

import {
  inferSkillKeyFromParsedNotes,
  inferTopicKeyFromTopicColumn,
  normalizeForSubFocusCompare,
  parseNotesForClassification,
  SEED_QUESTION_TEXT_SET,
} from "./taxonomy/backfill-mappings";

const ARTIFACTS_DIR = path.join(process.cwd(), "artifacts");

/** Short tokens sometimes found in CSV / legacy notes (English / abbrev). */
export const LEGACY_TO_LEARNING_SKILL: Record<string, string> = {
  svc: "grammar_svc",
  svoo: "grammar_svoo",
  svoc: "grammar_svoc",
  gerund: "grammar_gerund",
  infinitive: "grammar_infinitive",
  participle: "grammar_participle",
  "noun clause": "grammar_noun_clause",
  "relative clause": "grammar_adj_clause",
  conjunction: "grammar_conjunction",
  preposition: "grammar_preposition",
  passive: "grammar_passive",
  "past perfect": "grammar_past_perfect",
  "present perfect": "grammar_present_perfect",
  "subject-verb": "grammar_nouns_count",
  sva: "grammar_nouns_count",
  countable: "grammar_nouns_count",
  subjunctive: "grammar_subjunctive",
};

/**
 * Default LearningSkill per Phase1 skill family (stable routing anchor).
 * When multiple fine skills share the same parent, we pick the curriculum “centre of mass”.
 */
export const PHASE1_SKILL_KEY_TO_LEARNING_SKILL: Record<Phase1SkillKey, string> = {
  "vocabulary.document-workflow": "phrase_documents",
  "vocabulary.formal-register": "phrase_corporate",
  "vocabulary.domain-and-abstract-meaning": "vocab_communication",
  "grammar.verb-control": "grammar_present_perfect",
  "grammar.pattern-control": "grammar_gerund",
  "grammar.sentence-linking": "grammar_conjunction",
  "reading.detail-retrieval": "strat_p7_scan",
  "reading.purpose-and-intent": "strat_p7_skim",
  "reading.inference-and-process-logic": "strat_p7_scan",
  "reading.contextual-meaning": "vocab_communication",
};

/**
 * Normalized subFocus label (see personalized-phase1-bank + parseQuestionNotes) → LearningSkill.skillCode.
 * Keys produced with normalizeForSubFocusCompare().
 */
export const SUBFOCUS_TO_LEARNING_SKILL: Record<string, string> = {
  [normalizeForSubFocusCompare("片語動詞 / Phrasal verbs")]: "phrase_business_coord",
  [normalizeForSubFocusCompare("固定搭配 / Fixed expressions")]: "phrase_documents",
  [normalizeForSubFocusCompare("正式書面語 / Formal register")]: "phrase_corporate",
  [normalizeForSubFocusCompare("商務搭配 / Business collocation")]: "phrase_business_coord",
  [normalizeForSubFocusCompare("抽象字義 / Abstract meaning")]: "vocab_communication",
  [normalizeForSubFocusCompare("領域字彙 / Domain vocabulary")]: "vocab_office_general",

  [normalizeForSubFocusCompare("動詞時態 / Verb tense")]: "grammar_present_perfect",
  [normalizeForSubFocusCompare("被動語態 / Passive voice")]: "grammar_passive",
  [normalizeForSubFocusCompare("主詞動詞一致 / Subject-Verb Agreement")]: "grammar_nouns_count",
  [normalizeForSubFocusCompare("動名詞與不定詞 / Gerund vs. Infinitive")]: "grammar_gerund",
  [normalizeForSubFocusCompare("介系詞與固定搭配 / Prepositions & patterns")]: "grammar_preposition",
  [normalizeForSubFocusCompare("關係子句 / Relative clauses")]: "grammar_relative_pron",
  [normalizeForSubFocusCompare("連接詞與邏輯 / Conjunctions & logic")]: "grammar_conjunction",
  [normalizeForSubFocusCompare("used to 系列 / Used to family")]: "grammar_infinitive",
  [normalizeForSubFocusCompare("分詞修飾 / Participles")]: "grammar_participle",

  [normalizeForSubFocusCompare("電子郵件細節 / Email detail")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("公告目的 / Notice purpose")]: "strat_p7_skim",
  [normalizeForSubFocusCompare("會議細節 / Meeting detail")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("工作協調細節 / Coordination detail")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("人事規則細節 / HR detail")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("財務規則細節 / Finance detail")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("物流細節 / Logistics detail")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("行銷流程細節 / Marketing detail")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("技術報告細節 / Technical detail")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("說話者意圖 / Writer intent")]: "strat_p7_skim",
  [normalizeForSubFocusCompare("旅遊公告細節 / Travel notice detail")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("安全公告細節 / Safety notice detail")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("電子郵件目的 / Email purpose")]: "strat_p7_skim",
  [normalizeForSubFocusCompare("公告推論 / Notice inference")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("流程推論 / Process inference")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("語境字義 / Vocabulary in context")]: "vocab_communication",
  [normalizeForSubFocusCompare("制度變更目的 / Process change purpose")]: "strat_p7_skim",
  [normalizeForSubFocusCompare("結果推論 / Outcome inference")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("政策細節 / Policy detail")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("技術事故細節 / Incident detail")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("原因推論 / Cause inference")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("客訴原因 / Complaint reason")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("寫信者意圖 / Writer intent")]: "strat_p7_skim",
  [normalizeForSubFocusCompare("文件細節 / Short document detail")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("目的判斷 / Purpose")]: "strat_p7_skim",
  [normalizeForSubFocusCompare("推論 / Inference")]: "strat_p7_scan",
};

function topicKeyToDomainVocabSkill(topicKey: Phase1TopicKey): string {
  switch (topicKey) {
    case "tech":
      return "vocab_technology";
    case "healthEnv":
      return "vocab_medical";
    case "finance":
      return "vocab_finance_banking";
    case "hr":
      return "vocab_hr_recruitment";
    case "logistics":
      return "vocab_logistics";
    case "marketing":
      return "vocab_marketing_sales";
    case "daily":
      return "vocab_daily_life";
    case "office":
    case "notices":
    case "meetings":
    case "coordination":
    case "operations":
    case "communication":
      return "vocab_office_general";
    default:
      return "vocab_office_general";
  }
}

function previewText(s: string, max = 100): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

type Resolution =
  | { kind: "skip"; reason: string }
  | { kind: "assign"; skillCode: string; source: string; detail?: string }
  | { kind: "unresolved"; reason: string };

function resolveRow(input: {
  id: number;
  primaryLearningSkillCode: string | null;
  skillKey: string | null;
  topicKey: string | null;
  topic: string;
  notes: string | null;
}): Resolution {
  if (input.primaryLearningSkillCode?.trim()) {
    return { kind: "skip", reason: "already_has_primaryLearningSkillCode" };
  }

  const sk = input.skillKey?.trim();
  if (sk && sk in PHASE1_SKILL_KEY_TO_LEARNING_SKILL) {
    return {
      kind: "assign",
      skillCode: PHASE1_SKILL_KEY_TO_LEARNING_SKILL[sk as Phase1SkillKey],
      source: "phase1_skillKey",
      detail: sk,
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
          return {
            kind: "assign",
            skillCode: topicKeyToDomainVocabSkill(tk),
            source: "notes_subFocus_domain_vocab_topic",
            detail: `${parsed.subFocusLabel} @ ${tk}`,
          };
        }
        return {
          kind: "unresolved",
          reason: "domain_vocabulary_but_topicKey_unknown",
        };
      }
      return {
        kind: "assign",
        skillCode: direct,
        source: "notes_subFocus_table",
        detail: parsed.subFocusLabel,
      };
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
      return {
        kind: "assign",
        skillCode: tokenHits[0],
        source: "legacy_notes_token",
        detail: rawNotes.slice(0, 80),
      };
    }
    if (tokenHits.length > 1) {
      return {
        kind: "unresolved",
        reason: `ambiguous_legacy_tokens: ${[...new Set(tokenHits)].join(",")}`,
      };
    }
  }

  if (parsed) {
    const inferred = inferSkillKeyFromParsedNotes(parsed);
    if (inferred.skillKey && inferred.tier !== "low") {
      const code = PHASE1_SKILL_KEY_TO_LEARNING_SKILL[inferred.skillKey];
      if (code) {
        return {
          kind: "assign",
          skillCode: code,
          source: `inferred_phase1_skill_${inferred.tier}`,
          detail: `${inferred.skillKey} (${inferred.reason})`,
        };
      }
    }
  }

  return {
    kind: "unresolved",
    reason: "no_mapping_rule_matched",
  };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const write = args.has("--write");
  const onlySeed = args.has("--only-seed");

  const validCodes = new Set(
    (await prisma.learningSkill.findMany({ select: { skillCode: true } })).map((r) => r.skillCode),
  );

  const rows = await prisma.questionBankItem.findMany({
    select: {
      id: true,
      questionText: true,
      topic: true,
      notes: true,
      skillKey: true,
      topicKey: true,
      primaryLearningSkillCode: true,
      sourceQuality: true,
    },
    orderBy: { id: "asc" },
  });

  const filtered = onlySeed
    ? rows.filter((r) => SEED_QUESTION_TEXT_SET.has(r.questionText))
    : rows;

  const report: {
    timestamp: string;
    write: boolean;
    onlySeed: boolean;
    totalScanned: number;
    skippedAlreadySet: number;
    assigned: number;
    unresolved: number;
    updates: Array<{ id: number; skillCode: string; source: string; detail?: string }>;
    unresolvedRows: Array<{ id: number; preview: string; notes: string | null; skillKey: string | null; reason: string }>;
  } = {
    timestamp: new Date().toISOString(),
    write,
    onlySeed,
    totalScanned: filtered.length,
    skippedAlreadySet: 0,
    assigned: 0,
    unresolved: 0,
    updates: [],
    unresolvedRows: [],
  };

  for (const row of filtered) {
    const res = resolveRow(row);

    if (res.kind === "skip") {
      report.skippedAlreadySet += 1;
      continue;
    }

    if (res.kind === "unresolved") {
      report.unresolved += 1;
      report.unresolvedRows.push({
        id: row.id,
        preview: previewText(row.questionText),
        notes: row.notes,
        skillKey: row.skillKey,
        reason: res.reason,
      });
      continue;
    }

    if (!validCodes.has(res.skillCode)) {
      report.unresolved += 1;
      report.unresolvedRows.push({
        id: row.id,
        preview: previewText(row.questionText),
        notes: row.notes,
        skillKey: row.skillKey,
        reason: `resolved_to_unknown_skillCode:${res.skillCode}`,
      });
      continue;
    }

    report.assigned += 1;
    report.updates.push({
      id: row.id,
      skillCode: res.skillCode,
      source: res.source,
      detail: res.detail,
    });

    if (write) {
      await prisma.questionBankItem.update({
        where: { id: row.id },
        data: { primaryLearningSkillCode: res.skillCode },
      });
    }
  }

  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }
  const outPath = path.join(ARTIFACTS_DIR, "learning-skill-backfill-report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

  console.log("── Phase1 → LearningSkill backfill ──");
  console.log(`Scanned: ${report.totalScanned} (only-seed=${onlySeed})`);
  console.log(`Skipped (already had primaryLearningSkillCode): ${report.skippedAlreadySet}`);
  console.log(`Assigned: ${report.assigned}${write ? " (written)" : " (dry-run)"}`);
  console.log(`Unresolved: ${report.unresolved}`);
  console.log(`Report: ${outPath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
