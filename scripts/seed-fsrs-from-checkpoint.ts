import "dotenv/config";

import { PrismaLibSql } from "@prisma/adapter-libsql";

import { PrismaClient } from "../generated/prisma";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaLibSql({ url: databaseUrl });
const prisma = new PrismaClient({ adapter } as never);

type SeedLabel = "會" | "不會";

const SEED_TABLE = {
  會: {
    state: "Review" as const,
    stabilityDays: 60,
    difficulty: 4.0,
    dueOffsetDays: 30,
    seededFrom: "known",
  },
  不會: {
    state: "New" as const,
    stabilityDays: 0,
    difficulty: 0,
    dueOffsetDays: 0,
    seededFrom: "unknown",
  },
};

async function seedFsrsForQuestion(questionId: number, label: SeedLabel) {
  const config = SEED_TABLE[label];
  const now = new Date();
  const due = new Date(now.getTime() + config.dueOffsetDays * 86_400_000);

  await prisma.fsrsCardState.upsert({
    where: { questionId },
    create: {
      questionId,
      due,
      stability: config.stabilityDays,
      difficulty: config.difficulty,
      state: config.state,
      seededFrom: config.seededFrom,
      lastReview: label === "會" ? now : null,
    },
    update: {},
  });
}

async function main() {
  const items = await prisma.questionBankItem.findMany({
    where: { priorKnown: { not: null } },
    select: { id: true, priorKnown: true },
  });

  console.log(`Found ${items.length} questions with priorKnown label`);

  let knownCount = 0;
  let unknownCount = 0;

  for (const item of items) {
    const label: SeedLabel = item.priorKnown ? "會" : "不會";
    await seedFsrsForQuestion(item.id, label);

    if (item.priorKnown) knownCount++;
    else unknownCount++;
  }

  console.log(`✅ Seeded: ${knownCount} known + ${unknownCount} unknown`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
