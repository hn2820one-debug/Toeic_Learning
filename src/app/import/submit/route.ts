import { NextResponse } from "next/server";

import { getImportHref, importQuestionBankJsonFile } from "@/lib/import";

export async function POST(request: Request) {
  const formData = await request.formData();
  const fileValue = formData.get("file");
  const file = fileValue instanceof File ? fileValue : null;

  const result = await importQuestionBankJsonFile(file);
  return NextResponse.redirect(new URL(getImportHref(result), request.url), 303);
}