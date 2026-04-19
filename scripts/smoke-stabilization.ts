/**
 * One-off DB-level checks for stabilization (not a substitute for browser E2E).
 * Run: npx tsx scripts/smoke-stabilization.ts
 */
import { createHash } from "node:crypto";

import { commitCsvImport } from "../src/lib/import/csv-commit";
import { previewCsv } from "../src/lib/import/csv-preview";
import { prisma } from "../src/lib/prisma";
import {
  createStudySession,
  pickTrainingQuestionIds,
  recordTrainingAnswerChoice,
  submitTrainingAnswer,
} from "../src/lib/training";

const tag = `SMOKE_${createHash("sha256").update(String(Date.now())).digest("hex").slice(0, 8)}`;

async function main() {
  const qText = `${tag} temp question for smoke`;
  const row = await prisma.questionBankItem.create({
    data: {
      questionText: qText,
      optionA: "a",
      optionB: "b",
      optionC: "c",
      optionD: "d",
      correctAnswer: "A",
      topic: "Smoke",
      difficulty: "A",
      explanation: null,
      notes: null,
      priorKnown: null,
    },
  });

  const found = await prisma.questionBankItem.findUnique({ where: { id: row.id } });
  if (!found || found.questionText !== qText) {
    throw new Error("create/find failed");
  }

  const updated = await prisma.questionBankItem.update({
    where: { id: row.id },
    data: { explanation: "smoke edit" },
  });
  if (updated.explanation !== "smoke edit") {
    throw new Error("update failed");
  }

  const csv = [
    "questionText,optionA,optionB,optionC,optionD,correctAnswer,topic,difficulty,explanation,grammarPoints,priorKnown",
    `"${tag} csv row 1","a","b","c","d",A,Smoke,A,,,`,
    `"${tag} csv row 2","a","b","c","d",B,Smoke,B,,,`,
  ].join("\n");

  const prev = await previewCsv(csv);
  if (!prev.success) {
    throw new Error("previewCsv failed");
  }
  const commit = await commitCsvImport(prev.token);
  if (!commit.ok || commit.imported !== 2) {
    throw new Error(`commitCsvImport: ${JSON.stringify(commit)}`);
  }

  const csvRows = await prisma.questionBankItem.findMany({
    where: { questionText: { startsWith: tag } },
  });
  if (csvRows.length < 2) {
    throw new Error("expected 2 csv-imported rows");
  }

  await prisma.questionBankItem.deleteMany({
    where: { questionText: { startsWith: tag } },
  });

  const left = await prisma.questionBankItem.count({ where: { questionText: { startsWith: tag } } });
  if (left !== 0) {
    throw new Error("cleanup failed");
  }

  const ids = await pickTrainingQuestionIds(1);
  if (ids.length < 1) {
    throw new Error("pickTrainingQuestionIds returned empty");
  }
  const sessionRow = await createStudySession(ids);
  const sq = await prisma.studySessionQuestion.findFirst({
    where: { sessionId: sessionRow.id },
    orderBy: { position: "asc" },
    include: { question: true },
  });
  if (!sq) {
    throw new Error("no StudySessionQuestion");
  }
  await prisma.studySessionQuestion.update({
    where: { id: sq.id },
    data: { shownAt: new Date() },
  });
  const correct = sq.question.correctAnswer.trim().toUpperCase().slice(0, 1) as "A" | "B" | "C" | "D";
  const r1 = await recordTrainingAnswerChoice({
    sessionId: String(sessionRow.id),
    sessionQuestionId: sq.id,
    questionId: String(sq.questionId),
    selectedAnswer: correct,
  });
  if (!r1.ok) {
    throw new Error(`recordTrainingAnswerChoice: ${JSON.stringify(r1)}`);
  }
  const r2 = await submitTrainingAnswer({
    sessionQuestionId: sq.id,
    userChoice: correct,
    rating: "Good",
    timeTakenSec: null,
  });
  if (!r2.ok) {
    throw new Error(`submitTrainingAnswer: ${JSON.stringify(r2)}`);
  }
  const ah = await prisma.answerHistory.findFirst({
    where: { sessionId: sessionRow.id, questionId: sq.questionId },
  });
  if (!ah) {
    throw new Error("AnswerHistory row missing after submit");
  }

  console.log("smoke-stabilization.ts: prisma CRUD + csv preview/commit + cleanup OK");
  console.log(`smoke-stabilization.ts: training one-question session ${sessionRow.id} completed (AnswerHistory id ${ah.id}); not deleted to avoid FK cleanup complexity`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
