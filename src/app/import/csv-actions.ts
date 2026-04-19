"use server";

import { commitCsvImport, type CsvCommitResult } from "@/lib/import/csv-commit";
import { previewCsv, type CsvPreviewResult } from "@/lib/import/csv-preview";

export async function previewCsvAction(csvText: string) {
  return previewCsv(csvText);
}

export async function commitCsvAction(token: string) {
  return commitCsvImport(token);
}

/**
 * Form-based preview — file is submitted by the browser as multipart FormData.
 * This avoids client-side FileReader and React state syncing problems entirely:
 * the browser handles the file, we just await `file.text()` on the server.
 */
export async function previewCsvFormAction(
  formData: FormData,
): Promise<CsvPreviewResult | { success: false; errors: { message: string }[] }> {
  const entry = formData.get("file");
  if (!(entry instanceof File) || entry.size === 0) {
    return {
      success: false,
      errors: [{ message: "尚未收到 CSV 檔案 · No CSV file was received by the server." }],
    };
  }

  const text = await entry.text();
  if (text.trim().length === 0) {
    return {
      success: false,
      errors: [{ message: "檔案是空的 · The selected file is empty." }],
    };
  }

  return previewCsv(text);
}

/** Form-based commit — token is hidden in the form. */
export async function commitCsvFormAction(formData: FormData): Promise<CsvCommitResult> {
  const token = formData.get("token");
  if (typeof token !== "string" || token.length === 0) {
    return { ok: false, error: "Missing import token. Please re-run preview." };
  }
  return commitCsvImport(token);
}
