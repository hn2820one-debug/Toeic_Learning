import "server-only";

import Papa from "papaparse";
import { z } from "zod";

export const rowSchema = z.object({
  questionText: z.string().min(1),
  optionA: z.string().min(1),
  optionB: z.string().min(1),
  optionC: z.string().min(1),
  optionD: z.string().min(1),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  topic: z.string().min(1),
  difficulty: z.enum(["A", "B", "C"]),
  explanation: z.string().optional(),
  grammarPoints: z.string().optional(),
  priorKnown: z.enum(["true", "false", ""]).optional(),
});

export type CsvValidRow = z.infer<typeof rowSchema>;

export type CsvPreviewResult =
  | {
      success: true;
      total: number;
      validCount: number;
      sample: CsvValidRow[];
      issues: Array<{ row: number; reason: string }>;
      token: string;
    }
  | {
      success: false;
      errors: Papa.ParseError[];
    };

export async function previewCsv(csvText: string): Promise<CsvPreviewResult> {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    trimHeaders: true,
  });

  if (parsed.errors.length > 0) {
    return { success: false, errors: parsed.errors };
  }

  const issues: Array<{ row: number; reason: string }> = [];
  const valid: CsvValidRow[] = [];

  (parsed.data as Record<string, string>[]).forEach((row, idx) => {
    const result = rowSchema.safeParse(row);
    if (result.success) {
      valid.push(result.data);
    } else {
      issues.push({
        row: idx + 2,
        reason: result.error.issues.map((e) => e.message).join(", "),
      });
    }
  });

  return {
    success: true,
    total: parsed.data.length,
    validCount: valid.length,
    sample: valid.slice(0, 10),
    issues,
    token: Buffer.from(JSON.stringify(valid)).toString("base64"),
  };
}
