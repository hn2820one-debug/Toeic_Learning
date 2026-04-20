"use client";

import { useState } from "react";

type WeeklyReportRouteResponse =
  | {
      ok: true;
      rawMetricsSummary: unknown;
      generatedReportText: string;
      fallbackUsed?: boolean;
    }
  | {
      ok: false;
      error: string;
      rawMetricsSummary: unknown;
      generatedReportText: null;
      fallbackUsed: null;
    };

export default function AiWeeklyCoachingReport() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [usedOfflineFallback, setUsedOfflineFallback] = useState(false);

  async function handleGenerateReport() {
    setIsLoading(true);
    setError(null);
    setUsedOfflineFallback(false);

    try {
      const response = await fetch("/api/llm/weekly-report", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as WeeklyReportRouteResponse;

      if (!response.ok || !payload.ok) {
        setGeneratedReport(null);
        setError(payload.ok ? "AI weekly report request failed." : payload.error);
        return;
      }

      setGeneratedReport(payload.generatedReportText);
      setUsedOfflineFallback(!!payload.fallbackUsed);
    } catch (requestError) {
      setGeneratedReport(null);
      setError(requestError instanceof Error ? requestError.message : "AI weekly report request failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-600 mb-1">AI Weekly Coaching Report</p>
          <h3 className="text-xl font-semibold text-gray-900">Coach-style summary on top of the deterministic report</h3>
          <p className="mt-2 text-sm text-gray-500">
            This does not replace the existing summary or topic breakdown. It is an extra LLM-generated coaching layer.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerateReport}
          disabled={isLoading}
          className="inline-flex items-center rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Generating AI Report..." : generatedReport ? "Regenerate AI Report" : "Generate AI Report"}
        </button>
      </div>

      {error ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800">{error}</div>
      ) : null}

      {generatedReport ? (
        <div className="mt-5 rounded-xl border border-violet-200 bg-violet-50 px-4 py-4">
          {usedOfflineFallback ? (
            <p className="text-xs text-violet-800/90 mb-2">
              Showing deterministic coaching template (Gemini unavailable or output did not pass Markdown contract).
            </p>
          ) : null}
          <p className="whitespace-pre-line text-sm leading-7 text-violet-950">{generatedReport}</p>
        </div>
      ) : null}
    </section>
  );
}
