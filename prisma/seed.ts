import "dotenv/config";

import { PrismaLibSql } from "@prisma/adapter-libsql";

import { PrismaClient } from "../generated/prisma";
import { PERSONALIZED_PHASE1_BANK } from "./seed-data/personalized-phase1-bank";
import {
  DEFAULT_KEY_PHRASES,
  DEFAULT_TRANSCRIPT_PLACEHOLDER,
  defaultDictationLines,
  defaultRound1Questions,
  defaultRound2Questions,
  defaultShadowingLines,
} from "../src/lib/listening/default-workbook-content";
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

  const demoTitle = "【示範】Listening 練習本 · External video";
  const demo = await prisma.listeningWorkbook.findFirst({ where: { title: demoTitle } });
  if (!demo) {
    await prisma.listeningWorkbook.create({
      data: {
        title: demoTitle,
        sourceLabel: "YouTube · 示範連結（請自行替換真實影片）",
        sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        startSec: 0,
        endSec: 120,
        transcript: DEFAULT_TRANSCRIPT_PLACEHOLDER,
        keyPhrasesJson: DEFAULT_KEY_PHRASES,
        questionsRound1Json: defaultRound1Questions(),
        questionsRound2Json: defaultRound2Questions(),
        dictationLinesJson: defaultDictationLines(),
        shadowingLinesJson: defaultShadowingLines(),
        takeawayHintZh: "用一句話寫：你學到最有用的一點是什麼？",
        tomorrowReviewHintZh: "明天回顧時，最想先複習哪 1–2 個點？",
      },
    });
    console.log("Seeded demo listening workbook.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
