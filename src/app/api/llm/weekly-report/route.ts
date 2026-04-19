import { NextResponse } from "next/server";

import {
  generateWeeklyCoachingReport,
  getWeeklyCoachingReportMetricsSummary,
  WeeklyReportGenerationError,
} from "@/lib/llm/weekly-report";

export const dynamic = "force-dynamic";

export async function GET() {
  const metricsSummary = await getWeeklyCoachingReportMetricsSummary();

  try {
    const result = await generateWeeklyCoachingReport({
      metricsSummary,
    });

    return NextResponse.json(
      {
        ok: true,
        rawMetricsSummary: metricsSummary,
        generatedReportText: result.generatedReportText,
        model: result.callResult.model,
        promptVersion: result.promptVersion,
        usage: {
          promptTokens: result.callResult.promptTokens,
          completionTokens: result.callResult.completionTokens,
          cachedTokens: result.callResult.cachedTokens,
          cacheWriteTokens: result.callResult.cacheWriteTokens,
          latencyMs: result.callResult.latencyMs,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof WeeklyReportGenerationError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          rawMetricsSummary: metricsSummary,
          generatedReportText: null,
        },
        {
          status: error.status,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json(
      {
        ok: false,
        error: message,
        rawMetricsSummary: metricsSummary,
        generatedReportText: null,
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
