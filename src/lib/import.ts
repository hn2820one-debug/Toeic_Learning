import { prisma } from "@/lib/prisma";
import {
  formatQuestionValidationMessage,
  type NormalizedQuestionFields,
  validateQuestionFields,
} from "@/lib/question-fields";

export const QUESTION_IMPORT_EXAMPLE = `[
  {
    "questionText": "The accounting manager requested a revised invoice before approving the payment.",
    "optionA": "revised invoice",
    "optionB": "security badge",
    "optionC": "warehouse shelf",
    "optionD": "office umbrella",
    "correctAnswer": "A",
    "explanation": "A revised invoice is the only option that fits the payment approval context.",
    "topic": "Finance",
    "difficulty": "A"
  }
]`;

export type ImportStatus = "success" | "warning" | "error";

export type ImportSummary = {
  totalRowsProcessed: number;
  importedCount: number;
  skippedCount: number;
  invalidCount: number;
};

export type ImportResult = {
  status: ImportStatus;
  message: string;
  summary?: ImportSummary;
};

type ImportableQuestion = NormalizedQuestionFields;

function buildErrorResult(message: string, summary?: ImportSummary): ImportResult {
  return {
    status: "error",
    message,
    summary,
  };
}

function buildSuccessResult(message: string, summary: ImportSummary): ImportResult {
  return {
    status: "success",
    message,
    summary,
  };
}

function buildWarningResult(message: string, summary: ImportSummary): ImportResult {
  return {
    status: "warning",
    message,
    summary,
  };
}

function validateImportRow(record: unknown, rowNumber: number) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return {
      ok: false as const,
      error: `Row ${rowNumber} must be a JSON object.`,
    };
  }

  const value = record as Record<string, unknown>;
  const validation = validateQuestionFields({
    questionText: value.questionText,
    optionA: value.optionA,
    optionB: value.optionB,
    optionC: value.optionC,
    optionD: value.optionD,
    correctAnswer: value.correctAnswer,
    explanation: value.explanation,
    topic: value.topic,
    difficulty: value.difficulty,
  });

  if (!validation.ok) {
    return {
      ok: false as const,
      error: formatQuestionValidationMessage(validation.issue, { rowNumber }),
    };
  }

  return {
    ok: true as const,
    data: validation.data,
  };
}

function buildImportMessage(summary: ImportSummary, firstIssue?: string) {
  if (summary.invalidCount > 0 && summary.importedCount === 0 && summary.skippedCount === 0) {
    return `Import failed validation. First issue: ${firstIssue ?? "Unknown validation error."}`;
  }

  if (summary.invalidCount > 0) {
    return `Import completed with validation issues. First issue: ${firstIssue ?? "Unknown validation error."}`;
  }

  if (summary.importedCount === 0 && summary.skippedCount > 0) {
    return "No new questions were imported because all valid rows matched existing questionText values.";
  }

  if (summary.skippedCount > 0) {
    return "Import completed successfully. Duplicate questionText values were skipped.";
  }

  return "Import completed successfully.";
}

export function getImportHref(result: ImportResult) {
  const searchParams = new URLSearchParams({
    status: result.status,
    message: result.message,
  });

  if (result.summary) {
    searchParams.set("total", String(result.summary.totalRowsProcessed));
    searchParams.set("imported", String(result.summary.importedCount));
    searchParams.set("skipped", String(result.summary.skippedCount));
    searchParams.set("invalid", String(result.summary.invalidCount));
  }

  return `/import?${searchParams.toString()}`;
}

export async function importQuestionBankJsonFile(file: File | null | undefined): Promise<ImportResult> {
  if (!file || file.size === 0) {
    return buildErrorResult("Please choose a non-empty JSON file before importing.");
  }

  if (!file.name.toLowerCase().endsWith(".json")) {
    return buildErrorResult("Only the fixed JSON question format is supported on this page.");
  }

  const content = await file.text();
  return importQuestionBankJson(content);
}

export async function importQuestionBankRecords(records: unknown[]): Promise<ImportResult> {
  if (records.length === 0) {
    return buildErrorResult("The supplied question set does not contain any question rows.");
  }

  const validRows: ImportableQuestion[] = [];
  const invalidErrors: string[] = [];

  records.forEach((record, index) => {
    const validation = validateImportRow(record, index + 1);

    if (!validation.ok) {
      invalidErrors.push(validation.error);
      return;
    }

    validRows.push(validation.data);
  });

  const existingQuestionTexts = validRows.length
    ? await prisma.questionBankItem.findMany({
        where: {
          questionText: {
            in: Array.from(new Set(validRows.map((row) => row.questionText))),
          },
        },
        select: {
          questionText: true,
        },
      })
    : [];

  const seenQuestionTexts = new Set(existingQuestionTexts.map((row) => row.questionText));
  const rowsToCreate: ImportableQuestion[] = [];
  let skippedCount = 0;

  for (const row of validRows) {
    if (seenQuestionTexts.has(row.questionText)) {
      skippedCount += 1;
      continue;
    }

    seenQuestionTexts.add(row.questionText);
    rowsToCreate.push(row);
  }

  if (rowsToCreate.length > 0) {
    await prisma.$transaction(async (transaction) => {
      for (const row of rowsToCreate) {
        await transaction.questionBankItem.create({
          data: row,
        });
      }
    });
  }

  const summary: ImportSummary = {
    totalRowsProcessed: records.length,
    importedCount: rowsToCreate.length,
    skippedCount,
    invalidCount: invalidErrors.length,
  };

  const message = buildImportMessage(summary, invalidErrors[0]);

  if (summary.invalidCount > 0 && summary.importedCount === 0 && summary.skippedCount === 0) {
    return buildErrorResult(message, summary);
  }

  if (summary.invalidCount > 0) {
    return buildWarningResult(message, summary);
  }

  return buildSuccessResult(message, summary);
}

export async function importQuestionBankJson(content: string): Promise<ImportResult> {
  if (content.trim().length === 0) {
    return buildErrorResult("The uploaded file is empty.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    return buildErrorResult("The uploaded file is not valid JSON.");
  }

  if (!Array.isArray(parsed)) {
    return buildErrorResult("The JSON file must contain a top-level array of question objects.");
  }

  if (parsed.length === 0) {
    return buildErrorResult("The JSON file does not contain any question rows.");
  }

  return importQuestionBankRecords(parsed);
}