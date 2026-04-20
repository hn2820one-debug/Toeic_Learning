/**
 * Smoke tests for normalize-first QuestionBankItem input (manual + JSON + CSV + legacy notes).
 * No DB — asserts Prisma-shaped payloads and warning arrays from {@link toQuestionBankCreateInput}.
 *
 * Run: npx tsx scripts/smoke-normalize-question-input.ts
 */
import { applyQuestionFieldDefaults, toQuestionBankCreateInput } from "../src/lib/question-bank/normalize-input";
import { validateAndNormalizeQuestionInput } from "../src/lib/question-fields";
import type { QuestionFieldInput } from "../src/lib/question-fields";
import type { CsvValidRow } from "../src/lib/import/csv-preview";

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error("ASSERT FAILED:", msg);
    process.exit(1);
  }
}

/** Prisma `CreateInput` typing may expose FK via relation; runtime payload still carries the scalar. */
function primaryLearningSkillCodeOf(d: unknown): string | undefined {
  if (!d || typeof d !== "object") return undefined;
  const v = (d as { primaryLearningSkillCode?: string | null }).primaryLearningSkillCode;
  return v ?? undefined;
}

function csvRowToQuestionFieldInput(r: CsvValidRow): QuestionFieldInput {
  return {
    questionText: r.questionText,
    optionA: r.optionA,
    optionB: r.optionB,
    optionC: r.optionC,
    optionD: r.optionD,
    correctAnswer: r.correctAnswer,
    explanation: r.explanation ?? null,
    topic: r.topic,
    difficulty: r.difficulty,
    priorKnown:
      r.priorKnown === "true" ? true : r.priorKnown === "false" ? false : null,
  };
}

function main() {
  console.log("== normalize question input smoke ==\n");

  // 1) Manual grammar — skillKey drives primaryLearningSkillCode
  const manual = validateAndNormalizeQuestionInput(
    applyQuestionFieldDefaults({
      questionText: "The budget was ___ before the board meeting.",
      optionA: "approved",
      optionB: "approving",
      optionC: "approves",
      optionD: "approve",
      correctAnswer: "A",
      explanation: "Passive voice.",
      topic: "Grammar",
      difficulty: "B",
      skillKey: "grammar.pattern-control",
      topicKey: "finance",
    }),
  );
  assert(manual.ok, "manual sample should validate");
  if (!manual.ok) return;
  const outManual = toQuestionBankCreateInput(manual.data, { sourceKind: "manual" });
  assert(outManual.data.sourceQuality === "manual", "manual sourceQuality");
  assert(outManual.data.part === 5, "default part 5");
  assert(outManual.data.topicKey === "finance", "topicKey preserved");
  assert(primaryLearningSkillCodeOf(outManual.data) === "grammar_gerund", "grammar.pattern-control → learning skill");
  console.log("[1] manual grammar OK", { primary: primaryLearningSkillCodeOf(outManual.data), warnings: outManual.warnings });

  // 2) JSON import — same as import.ts path (extra hints + import_json provenance)
  const jsonRow = validateAndNormalizeQuestionInput(
    applyQuestionFieldDefaults({
      questionText: "Please confirm receipt of the attached invoice.",
      optionA: "confirm",
      optionB: "confirming",
      optionC: "confirmation",
      optionD: "confirmed",
      correctAnswer: "A",
      explanation: null,
      topic: "Business writing",
      difficulty: "B",
      topicKey: "finance",
      skillKey: "vocabulary.document-workflow",
    }),
  );
  assert(jsonRow.ok, "json sample should validate");
  if (!jsonRow.ok) return;
  const outJson = toQuestionBankCreateInput(jsonRow.data, {
    sourceKind: "import_json",
    extra: {
      hint1: "Formal email",
      coreRule: "imperative for requests",
      distractorAnalysisJson: { A: "base verb fits imperative" },
    },
  });
  assert(outJson.data.sourceQuality === "import_json", "import_json sourceQuality");
  assert(outJson.data.hint1 === "Formal email", "extra hint1");
  assert(outJson.data.coreRule === "imperative for requests", "extra coreRule");
  assert(typeof outJson.data.distractorAnalysisJson === "object", "distractor JSON object");
  console.log("[2] JSON import OK", { sourceQuality: outJson.data.sourceQuality, warnings: outJson.warnings });

  // 3) CSV import — grammarPoints column → canonical notes (same as csv-commit)
  const csvSample: CsvValidRow = {
    questionText: "The shipment will ___ tomorrow.",
    optionA: "arrive",
    optionB: "arrived",
    optionC: "arriving",
    optionD: "arrives",
    correctAnswer: "A",
    topic: "Grammar",
    difficulty: "B",
    explanation: "schedule",
    grammarPoints: "present simple, tense",
    priorKnown: "",
  };
  const csvV = validateAndNormalizeQuestionInput(applyQuestionFieldDefaults(csvRowToQuestionFieldInput(csvSample)));
  assert(csvV.ok, "csv sample should validate");
  if (!csvV.ok) return;
  const outCsv = toQuestionBankCreateInput(csvV.data, {
    sourceKind: "import_csv",
    grammarPointsRaw: csvSample.grammarPoints,
  });
  assert(outCsv.data.sourceQuality === "import_csv", "import_csv sourceQuality");
  assert(
    Boolean(outCsv.data.notes?.includes("Grammar") && outCsv.data.notes?.includes("present simple")),
    "grammarPoints → canonical notes",
  );
  console.log("[3] CSV import OK", { notesPreview: outCsv.data.notes?.slice(0, 80), warnings: outCsv.warnings });

  // 4) Legacy notes only — ambiguous legacy tokens → empty primary + warning
  const legacy = validateAndNormalizeQuestionInput(
    applyQuestionFieldDefaults({
      questionText: "Legacy stem passive and gerund both mentioned in notes field.",
      optionA: "a",
      optionB: "b",
      optionC: "c",
      optionD: "d",
      correctAnswer: "A",
      explanation: null,
      topic: "Grammar",
      difficulty: "B",
    }),
  );
  assert(legacy.ok, "legacy sample should validate");
  if (!legacy.ok) return;
  const outLegacy = toQuestionBankCreateInput(legacy.data, {
    sourceKind: "manual",
    extra: {
      notes: "Discuss passive gerund patterns from old bank.",
    },
  });
  assert(
    outLegacy.warnings.some((w) => w.includes("multiple") || w.includes("learning-skill")),
    "legacy ambiguous notes should emit warning",
  );
  assert(
    primaryLearningSkillCodeOf(outLegacy.data) === undefined,
    "ambiguous legacy notes leave primary empty",
  );
  console.log("[4] legacy notes OK", { primary: primaryLearningSkillCodeOf(outLegacy.data), warnings: outLegacy.warnings });

  console.log("\n== SMOKE PASSED ==");
}

main();
