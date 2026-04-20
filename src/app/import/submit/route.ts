import { NextResponse } from "next/server";

import { getImportHref, importQuestionBankJsonFile } from "@/lib/import";
import { logOpsError } from "@/lib/ops-log";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const fileValue = formData.get("file");
    const file = fileValue instanceof File ? fileValue : null;

    const result = await importQuestionBankJsonFile(file);
    return NextResponse.redirect(new URL(getImportHref(result), request.url), 303);
  } catch (error) {
    logOpsError({
      area: "import",
      event: "json_submit_route_failed",
      error,
    });
    const fallback = {
      status: "error" as const,
      message: "Import failed due to unexpected server error.",
    };
    return NextResponse.redirect(new URL(getImportHref(fallback), request.url), 303);
  }
}