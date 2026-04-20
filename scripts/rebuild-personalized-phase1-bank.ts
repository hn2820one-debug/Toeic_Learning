import "dotenv/config";

import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../generated/prisma";
import {
  PERSONALIZED_PHASE1_BANK,
  summarizePersonalizedPhase1Bank,
} from "../prisma/seed-data/personalized-phase1-bank";
import { validateQuestionFields } from "../src/lib/question-fields";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaLibSql({ url: databaseUrl });
const prisma = new PrismaClient({ adapter } as never);

const FSRS_SEED_TABLE = {
  known: {
    state: "Review" as const,
    stabilityDays: 60,
    difficulty: 4.0,
    dueOffsetDays: 30,
    seededFrom: "phase1-known",
  },
  unknown: {
    state: "New" as const,
    stabilityDays: 0,
    difficulty: 0,
    dueOffsetDays: 0,
    seededFrom: "phase1-unknown",
  },
};

function assertSeedBankIsSafe() {
  if (PERSONALIZED_PHASE1_BANK.length === 0) {
    throw new Error("Seed bank is empty.");
  }

  const seen = new Set<string>();
  for (const [index, row] of PERSONALIZED_PHASE1_BANK.entries()) {
    const validation = validateQuestionFields(row);
    if (!validation.ok) {
      throw new Error(`Bank row ${index + 1} failed validation (${validation.issue}).`);
    }
    if (seen.has(row.questionText)) {
      throw new Error(`Duplicate questionText detected at row ${index + 1}: ${row.questionText}`);
    }
    seen.add(row.questionText);
  }
}

async function cleanupActiveRuntimeTables() {
  const before = {
    questions: await prisma.questionBankItem.count(),
    studySessions: await prisma.studySession.count(),
    answerHistory: await prisma.answerHistory.count(),
    fsrs: await prisma.fsrsCardState.count(),
    reviewLog: await prisma.reviewLog.count(),
    elo: await prisma.eloState.count(),
    llmUsage: await prisma.llmUsageLog.count(),
  };

  await prisma.$transaction(async (tx) => {
    await tx.answerHistory.deleteMany({});
    await tx.studySessionQuestion.deleteMany({});
    await tx.studySession.deleteMany({});
    await tx.reviewLog.deleteMany({});
    await tx.fsrsCardState.deleteMany({});
    await tx.eloState.deleteMany({});
    await tx.topicMastery.deleteMany({});
    await tx.llmUsageLog.deleteMany({});
    await tx.weeklyReport.deleteMany({});
    await tx.questionBankItem.deleteMany({});
  });

  return before;
}

async function insertPersonalizedBank() {
  const BATCH_SIZE = 200;
  for (let i = 0; i < PERSONALIZED_PHASE1_BANK.length; i += BATCH_SIZE) {
    const batch = PERSONALIZED_PHASE1_BANK.slice(i, i + BATCH_SIZE);
    await prisma.questionBankItem.createMany({
      data: batch.map((row) => ({
        ...row,
        sourceQuality: "seed",
      })),
    });
  }
}

async function seedFsrsFromPriorKnown() {
  const rows = await prisma.questionBankItem.findMany({
    where: { priorKnown: { not: null } },
    select: { id: true, priorKnown: true },
  });

  const now = new Date();
  let seededKnown = 0;
  let seededUnknown = 0;

  for (const row of rows) {
    const config = row.priorKnown ? FSRS_SEED_TABLE.known : FSRS_SEED_TABLE.unknown;
    const due = new Date(now.getTime() + config.dueOffsetDays * 86_400_000);

    await prisma.fsrsCardState.upsert({
      where: { questionId: row.id },
      create: {
        questionId: row.id,
        due,
        stability: config.stabilityDays,
        difficulty: config.difficulty,
        state: config.state,
        seededFrom: config.seededFrom,
        lastReview: row.priorKnown ? now : null,
      },
      update: {},
    });

    if (row.priorKnown) seededKnown += 1;
    else seededUnknown += 1;
  }

  return {
    seededKnown,
    seededUnknown,
    totalSeeded: rows.length,
  };
}

async function main() {
  assertSeedBankIsSafe();

  const summary = summarizePersonalizedPhase1Bank();
  console.log("Phase 1 bank summary (planned):", JSON.stringify(summary, null, 2));

  const before = await cleanupActiveRuntimeTables();
  console.log("Cleanup before-counts:", JSON.stringify(before, null, 2));

  await insertPersonalizedBank();
  const fsrsSeedSummary = await seedFsrsFromPriorKnown();

  const after = {
    questions: await prisma.questionBankItem.count(),
    studySessions: await prisma.studySession.count(),
    answerHistory: await prisma.answerHistory.count(),
    fsrs: await prisma.fsrsCardState.count(),
    reviewLog: await prisma.reviewLog.count(),
    elo: await prisma.eloState.count(),
    llmUsage: await prisma.llmUsageLog.count(),
    suspiciousRows: await prisma.questionBankItem.count({
      where: {
        OR: [
          { topic: { contains: "Smoke" } },
          { topic: { contains: "Validation" } },
          { questionText: { contains: "SMOKE" } },
          { questionText: { contains: "Validation" } },
        ],
      },
    }),
  };

  const categoryCounts = await prisma.questionBankItem.groupBy({
    by: ["notes"],
    _count: { _all: true },
  });
  const topFocuses = categoryCounts
    .sort((a, b) => {
      const left = a.notes ?? "";
      const right = b.notes ?? "";
      return b._count._all - a._count._all || left.localeCompare(right);
    })
    .slice(0, 12)
    .map((row) => ({ notes: row.notes ?? "", count: row._count._all }));

  console.log("FSRS seed summary:", JSON.stringify(fsrsSeedSummary, null, 2));
  console.log("After counts:", JSON.stringify(after, null, 2));
  console.log("Top classification labels:", JSON.stringify(topFocuses, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
