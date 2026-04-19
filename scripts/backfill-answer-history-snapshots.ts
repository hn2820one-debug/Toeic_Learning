import "dotenv/config";

import { PrismaLibSql } from "@prisma/adapter-libsql";

import { PrismaClient } from "../generated/prisma";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaLibSql({ url: databaseUrl });
const prisma = new PrismaClient({ adapter } as never);

function serializeChoicesSnapshot(question: {
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}) {
  return JSON.stringify({
    A: question.optionA,
    B: question.optionB,
    C: question.optionC,
    D: question.optionD,
  });
}

function hasMissingSnapshot(answer: {
  stemSnapshot: string;
  choicesSnapshot: string;
  correctAnswerSnapshot: string;
  topicSnapshot: string;
  difficultySnapshot: string;
}) {
  return (
    answer.stemSnapshot === "" ||
    answer.choicesSnapshot === "" ||
    answer.choicesSnapshot === "{}" ||
    answer.correctAnswerSnapshot === "" ||
    answer.topicSnapshot === "" ||
    answer.difficultySnapshot === ""
  );
}

async function main() {
  const totalRows = await prisma.answerHistory.count();
  const rows = await prisma.answerHistory.findMany({
    where: {
      OR: [
        { stemSnapshot: "" },
        { choicesSnapshot: "" },
        { choicesSnapshot: "{}" },
        { correctAnswerSnapshot: "" },
        { topicSnapshot: "" },
        { difficultySnapshot: "" },
      ],
    },
    select: {
      id: true,
      stemSnapshot: true,
      choicesSnapshot: true,
      correctAnswerSnapshot: true,
      topicSnapshot: true,
      difficultySnapshot: true,
      question: {
        select: {
          questionText: true,
          optionA: true,
          optionB: true,
          optionC: true,
          optionD: true,
          correctAnswer: true,
          topic: true,
          difficulty: true,
        },
      },
    },
    orderBy: { id: "asc" },
  });

  let updatedCount = 0;

  for (const row of rows) {
    if (!hasMissingSnapshot(row)) {
      continue;
    }

    const data: {
      stemSnapshot?: string;
      choicesSnapshot?: string;
      correctAnswerSnapshot?: string;
      topicSnapshot?: string;
      difficultySnapshot?: string;
    } = {};

    if (row.stemSnapshot === "") {
      data.stemSnapshot = row.question.questionText;
    }

    if (row.choicesSnapshot === "" || row.choicesSnapshot === "{}") {
      data.choicesSnapshot = serializeChoicesSnapshot(row.question);
    }

    if (row.correctAnswerSnapshot === "") {
      data.correctAnswerSnapshot = row.question.correctAnswer;
    }

    if (row.topicSnapshot === "") {
      data.topicSnapshot = row.question.topic;
    }

    if (row.difficultySnapshot === "") {
      data.difficultySnapshot = row.question.difficulty;
    }

    if (Object.keys(data).length === 0) {
      continue;
    }

    await prisma.answerHistory.update({
      where: { id: row.id },
      data,
    });

    updatedCount += 1;
  }

  console.log(
    JSON.stringify({
      totalRows,
      scannedRows: rows.length,
      updatedRows: updatedCount,
    }),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
