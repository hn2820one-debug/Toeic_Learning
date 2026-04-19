import { NextResponse } from "next/server";

import { rowsToCsv } from "@/lib/export/csv";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const HEADERS = [
  "questionText",
  "optionA",
  "optionB",
  "optionC",
  "optionD",
  "correctAnswer",
  "topic",
  "difficulty",
  "explanation",
  "grammarPoints",
  "priorKnown",
  "source",
] as const;

export async function GET() {
  const questions = await prisma.questionBankItem.findMany({
    orderBy: { id: "asc" },
  });

  const rows = questions.map((q) => ({
    questionText: q.questionText,
    optionA: q.optionA,
    optionB: q.optionB,
    optionC: q.optionC,
    optionD: q.optionD,
    correctAnswer: q.correctAnswer,
    topic: q.topic,
    difficulty: q.difficulty,
    explanation: q.explanation ?? "",
    grammarPoints: q.notes ?? "",
    priorKnown:
      q.priorKnown === true ? "true" : q.priorKnown === false ? "false" : "",
    source: "",
  }));

  const csv = `\uFEFF${rowsToCsv([...HEADERS], rows)}`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="questions-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
