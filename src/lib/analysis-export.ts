import { rowsToCsv } from "@/lib/export/csv";

import type { AnalysisWrongAnswerExportRow } from "./analysis";

const EXPORT_HEADERS = [
  "answeredAt",
  "topicSnapshot",
  "topicKeySnapshot",
  "questionTextSnapshot",
  "correctAnswerSnapshot",
  "userChoice",
  "explanationSnapshot",
] as const;

export function exportRecentWrongAnswers(input: {
  rows: AnalysisWrongAnswerExportRow[];
  format: "csv" | "json";
}): string {
  if (input.format === "json") {
    return JSON.stringify(input.rows, null, 2);
  }
  return `\uFEFF${rowsToCsv([...EXPORT_HEADERS], input.rows)}`;
}

