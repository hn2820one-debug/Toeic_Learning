"use server";

import { commitCsvImport } from "@/lib/import/csv-commit";
import { previewCsv } from "@/lib/import/csv-preview";

export async function previewCsvAction(csvText: string) {
  return previewCsv(csvText);
}

export async function commitCsvAction(token: string) {
  return commitCsvImport(token);
}
