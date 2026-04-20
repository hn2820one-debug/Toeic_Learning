import "server-only";

import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  formatQuestionValidationMessage,
  type NormalizedQuestionFields,
  type QuestionFieldInput,
  validateAndNormalizeQuestionInput,
} from "@/lib/question-fields";
import { applyQuestionFieldDefaults } from "@/lib/question-bank/normalize-input";
import { buildQuestionBankCreateData } from "@/lib/question-management";
import { logOpsWarn } from "@/lib/ops-log";

import { rowSchema, type CsvValidRow } from "./csv-preview";

function csvRowToQuestionFieldInput(r: CsvValidRow): QuestionFieldInput {
  const input: QuestionFieldInput = {
    questionText: r.questionText,
    optionA: r.optionA,
    optionB: r.optionB,
    optionC: r.optionC,
    optionD: r.optionD,
    correctAnswer: r.correctAnswer,
    explanation: r.explanation ?? null,
    topic: r.topic,
    difficulty: r.difficulty,
    priorKnown:
      r.priorKnown === "true" ? true : r.priorKnown === "false" ? false : null,
  };

  return input;
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
  } catch (error) {
    logOpsWarn({
      area: "import",
      event: "csv_commit_token_invalid",
      error,
    });
    return { ok: false, error: "Invalid or corrupted import token." };
  }

  const parsedRows = z.array(rowSchema).safeParse(parsed);
  if (!parsedRows.success) {
    return { ok: false, error: "Import token failed validation." };
  }

  const rows = parsedRows.data;
  const BATCH = 500;

  const validatedRows: { csv: CsvValidRow; data: NormalizedQuestionFields }[] = [];

  for (const r of rows) {
    const validation = validateAndNormalizeQuestionInput(applyQuestionFieldDefaults(csvRowToQuestionFieldInput(r)));
    if (!validation.ok) {
      return {
        ok: false,
        error: `Row content failed the shared question pipeline: ${formatQuestionValidationMessage(validation.issue)}`,
      };
    }

    validatedRows.push({ csv: r, data: validation.data });
  }

  const seen = new Set<string>();
  const uniqueRows: typeof validatedRows = [];
  let skippedDuplicateInFile = 0;

  for (const row of validatedRows) {
    const key = row.data.questionText;
    if (seen.has(key)) {
      skippedDuplicateInFile += 1;
      continue;
    }

    seen.add(key);
    uniqueRows.push(row);
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
      questionText: { in: uniqueRows.map((r) => r.data.questionText) },
    },
    select: { questionText: true },
  });
  const existingSet = new Set(existing.map((e) => e.questionText));
  const toCreate = uniqueRows.filter((r) => !existingSet.has(r.data.questionText));
  const skippedExisting = uniqueRows.length - toCreate.length;

  let imported = 0;
  for (let i = 0; i < toCreate.length; i += BATCH) {
    const batch = toCreate.slice(i, i + BATCH);
    const result = await prisma.questionBankItem.createMany({
      data: batch.map(({ csv, data }) =>
        buildQuestionBankCreateData(data, {
          sourceKind: "import_csv",
          grammarPointsRaw: csv.grammarPoints,
        }),
      ),
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
