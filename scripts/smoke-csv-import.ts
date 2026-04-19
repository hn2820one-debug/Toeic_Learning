/**
 * End-to-end smoke for the CSV import server pipeline.
 * Exercises the SAME functions invoked by the browser:
 *   form submit → previewCsvFormAction → previewCsv
 *   click commit → commitCsvFormAction → commitCsvImport
 * (the *FormAction wrappers only unwrap FormData; we call the underlying
 *  functions directly so we don't need a real multipart parser.)
 *
 * It then queries Prisma to confirm rows landed, and finally deletes the
 * smoke rows so /questions stays clean.
 *
 * Run:  npx tsx scripts/smoke-csv-import.ts
 */
import { commitCsvImport } from "../src/lib/import/csv-commit";
import { previewCsv } from "../src/lib/import/csv-preview";
import { prisma } from "../src/lib/prisma";

const SMOKE_TAG = "[CSV_SMOKE]";

const csv = `questionText,optionA,optionB,optionC,optionD,correctAnswer,topic,difficulty,explanation,grammarPoints,priorKnown
"${SMOKE_TAG} The team will ___ the report by Friday.",submit,borrow,ignore,delete,A,Grammar,B,"submit a report",verbs,
"${SMOKE_TAG} Please ___ the door before leaving.",close,closing,closed,closes,A,Grammar,A,"imperative",imperative,false
"${SMOKE_TAG} The shipment ___ tomorrow morning.",arrives,arrived,arriving,arrive,A,Vocabulary,B,"present simple for schedule",tense,true
`;

async function main() {
  console.log("== CSV import smoke ==");
  console.log("CSV bytes:", csv.length);

  console.log("\n[1] previewCsv(...)");
  const p = await previewCsv(csv);
  if (!p.success) {
    console.error("preview FAILED:", p.errors);
    process.exit(2);
  }
  console.log(`  total=${p.total} valid=${p.validCount} issues=${p.issues.length}`);
  if (p.issues.length > 0) {
    console.log("  issue rows:", p.issues);
  }
  if (p.validCount !== 3) {
    console.error(`  expected 3 valid rows, got ${p.validCount}`);
    process.exit(2);
  }
  console.log("  preview OK; token length =", p.token.length);

  console.log("\n[2] commitCsvImport(token)");
  const c = await commitCsvImport(p.token);
  if (!c.ok) {
    console.error("  commit FAILED:", c.error);
    process.exit(3);
  }
  console.log(`  imported=${c.imported} total=${c.total} skippedExisting=${c.skippedExisting} skippedDup=${c.skippedDuplicateInFile}`);

  console.log("\n[3] Verify rows present in DB (questionText starts with smoke tag)");
  const inserted = await prisma.questionBankItem.findMany({
    where: { questionText: { startsWith: SMOKE_TAG } },
    select: { id: true, questionText: true, topic: true, difficulty: true, correctAnswer: true },
    orderBy: { id: "asc" },
  });
  console.log(`  found ${inserted.length} smoke row(s) in question_bank_item:`);
  for (const row of inserted) {
    console.log(`   - id=${row.id} topic=${row.topic} lv=${row.difficulty} ans=${row.correctAnswer} q="${row.questionText.slice(0, 60)}…"`);
  }

  if (inserted.length !== 3) {
    console.error("  EXPECTED 3 rows, got", inserted.length);
    process.exit(4);
  }

  console.log("\n[4] Cleanup: delete smoke rows");
  const del = await prisma.questionBankItem.deleteMany({
    where: { questionText: { startsWith: SMOKE_TAG } },
  });
  console.log(`  deleted ${del.count} smoke row(s).`);

  console.log("\n== SMOKE PASSED ==");
}

main()
  .catch((err) => {
    console.error("SMOKE THREW:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
