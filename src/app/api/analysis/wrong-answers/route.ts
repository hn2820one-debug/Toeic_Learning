import { NextResponse } from "next/server";

import { exportRecentWrongAnswers } from "@/lib/analysis-export";
import { getRecentWrongAnswersForExport } from "@/lib/analysis";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "json" ? "json" : "csv";
  const days = url.searchParams.get("days") === "7" ? 7 : 30;

  const rows = await getRecentWrongAnswersForExport({
    days,
    limit: 300,
  });
  const body = exportRecentWrongAnswers({ rows, format });

  return new NextResponse(body, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": format === "json" ? "application/json; charset=utf-8" : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="analysis-wrong-answers-${days}d.${format}"`,
    },
  });
}

