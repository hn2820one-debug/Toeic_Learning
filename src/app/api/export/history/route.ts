import { NextResponse } from "next/server";

import { assertExportAllowed } from "@/lib/export/auth";
import { rowsToCsv } from "@/lib/export/csv";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const HEADERS = [
  "id",
  "sessionId",
  "questionId",
  "selectedAnswer",
  "isCorrect",
  "answeredAt",
  "stemSnapshot",
  "choicesSnapshot",
  "correctAnswerSnapshot",
  "topicSnapshot",
  "difficultySnapshot",
] as const;

export async function GET(request: Request) {
  const denied = assertExportAllowed(request);
  if (denied) {
    return denied;
  }

  const rows = await prisma.answerHistory.findMany({
    orderBy: { id: "asc" },
  });

  const data = rows.map((h) => ({
    id: h.id,
    sessionId: h.sessionId,
    questionId: h.questionId,
    selectedAnswer: h.selectedAnswer,
    isCorrect: h.isCorrect,
    answeredAt: h.answeredAt.toISOString(),
    stemSnapshot: h.stemSnapshot,
    choicesSnapshot: h.choicesSnapshot,
    correctAnswerSnapshot: h.correctAnswerSnapshot,
    topicSnapshot: h.topicSnapshot,
    difficultySnapshot: h.difficultySnapshot,
  }));

  const csv = `\uFEFF${rowsToCsv([...HEADERS], data)}`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="answer-history-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
