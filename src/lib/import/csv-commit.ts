import "server-only";

import { z } from "zod";

import { prisma } from "@/lib/prisma";

import { rowSchema, type CsvValidRow } from "./csv-preview";

function mapRowToCreate(r: CsvValidRow) {
  const notes = r.grammarPoints?.trim()
    ? r.grammarPoints
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .join(", ")
    : null;

  return {
    questionText: r.questionText,
    optionA: r.optionA,
    optionB: r.optionB,
    optionC: r.optionC,
    optionD: r.optionD,
    correctAnswer: r.correctAnswer,
    topic: r.topic,
    difficulty: r.difficulty,
    explanation: r.explanation?.trim() ? r.explanation : null,
    notes,
    priorKnown: r.priorKnown === "true" ? true : r.priorKnown === "false" ? false : null,
  };
}

export type CsvCommitResult =
  | {
      ok: true;
      imported: number;
      total: number;
      skippedDuplicateInFile: number;
      skippedExisting: number;
    }
  | { ok: false; error: string };

export async function commitCsvImport(token: string): Promise<CsvCommitResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(token, "base64").toString("utf8"));
  } catch {
    return { ok: false, error: "Invalid or corrupted import token." };
  }

  const parsedRows = z.array(rowSchema).safeParse(parsed);
  if (!parsedRows.success) {
    return { ok: false, error: "Import token failed validation." };
  }

  const rows = parsedRows.data;
  const BATCH = 500;

  const seen = new Set<string>();
  const uniqueRows: CsvValidRow[] = [];
  let skippedDuplicateInFile = 0;
  for (const r of rows) {
    if (seen.has(r.questionText)) {
      skippedDuplicateInFile += 1;
      continue;
    }
    seen.add(r.questionText);
    uniqueRows.push(r);
  }

  if (uniqueRows.length === 0) {
    return {
      ok: true,
      imported: 0,
      total: rows.length,
      skippedDuplicateInFile,
      skippedExisting: 0,
    };
  }

  const existing = await prisma.questionBankItem.findMany({
    where: {
      questionText: { in: uniqueRows.map((r) => r.questionText) },
    },
    select: { questionText: true },
  });
  const existingSet = new Set(existing.map((e) => e.questionText));
  const toCreate = uniqueRows.filter((r) => !existingSet.has(r.questionText));
  const skippedExisting = uniqueRows.length - toCreate.length;

  let imported = 0;
  for (let i = 0; i < toCreate.length; i += BATCH) {
    const batch = toCreate.slice(i, i + BATCH);
    const result = await prisma.questionBankItem.createMany({
      data: batch.map(mapRowToCreate),
    });
    imported += result.count;
  }

  return {
    ok: true,
    imported,
    total: rows.length,
    skippedDuplicateInFile,
    skippedExisting,
  };
}
