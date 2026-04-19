import "dotenv/config";

import { PrismaLibSql } from "@prisma/adapter-libsql";

import { PrismaClient } from "../generated/prisma";
import { PERSONALIZED_PHASE1_BANK } from "./seed-data/personalized-phase1-bank";
import { formatQuestionValidationMessage, validateQuestionFields } from "../src/lib/question-fields";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaLibSql({ url: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const normalizedQuestions = PERSONALIZED_PHASE1_BANK.map((question, index) => {
    const validation = validateQuestionFields(question);

    if (!validation.ok) {
      throw new Error(formatQuestionValidationMessage(validation.issue, { rowNumber: index + 1 }));
    }

    return question;
  });

  for (const question of normalizedQuestions) {
    await prisma.questionBankItem.upsert({
      where: { questionText: question.questionText },
      update: question,
      create: question,
    });
  }

  console.log(`Seeded ${normalizedQuestions.length} personalized Phase 1 question records.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });