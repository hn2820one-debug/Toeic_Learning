import "dotenv/config";

import { PrismaLibSql } from "@prisma/adapter-libsql";

import { PrismaClient } from "../generated/prisma";
import { PERSONALIZED_PHASE1_BANK } from "./seed-data/personalized-phase1-bank";
import { getOrCreateDevUser } from "../src/lib/dev-user";
import { buildQuestionBankCreateData, buildQuestionBankUpdateData } from "../src/lib/question-management";
import { formatQuestionValidationMessage, validateAndNormalizeQuestionInput } from "../src/lib/question-fields";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaLibSql({ url: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const normalizedRows = PERSONALIZED_PHASE1_BANK.map((question, index) => {
    const validation = validateAndNormalizeQuestionInput({
      questionText: question.questionText,
      optionA: question.optionA,
      optionB: question.optionB,
      optionC: question.optionC,
      optionD: question.optionD,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      topic: question.topic,
      difficulty: question.difficulty,
      priorKnown: question.priorKnown,
    });

    if (!validation.ok) {
      throw new Error(formatQuestionValidationMessage(validation.issue, { rowNumber: index + 1 }));
    }

    return { validated: validation.data, notes: question.notes };
  });

  for (const row of normalizedRows) {
    const createPayload = buildQuestionBankCreateData(row.validated, { defaultSourceQuality: "seed" });
    await prisma.questionBankItem.upsert({
      where: { questionText: row.validated.questionText },
      update: {
        ...buildQuestionBankUpdateData(row.validated),
        notes: row.notes,
        sourceQuality: "seed",
      },
      create: {
        ...createPayload,
        notes: row.notes,
      },
    });
  }

  console.log(`Seeded ${normalizedRows.length} personalized Phase 1 question records.`);

  await getOrCreateDevUser();
  console.log("Ensured dev user, profile, and phase1 enrollment (see src/lib/dev-user.ts).");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
