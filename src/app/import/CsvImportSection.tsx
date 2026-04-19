"use client";

import { useState, useTransition } from "react";

import { commitCsvAction, previewCsvAction } from "./csv-actions";

function formatPapaError(err: { code?: string; message: string; row?: number }) {
  const row = err.row !== undefined ? ` (row ${err.row})` : "";
  return `${err.message}${row}`;
}

export default function CsvImportSection() {
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewCsvAction>> | null>(null);
  const [commitResult, setCommitResult] = useState<Awaited<ReturnType<typeof commitCsvAction>> | null>(null);
  const [fileLabel, setFileLabel] = useState<string>("");
  const [isPreviewPending, startPreview] = useTransition();
  const [isCommitPending, startCommit] = useTransition();

  const runPreview = (file: File) => {
    setCommitResult(null);
    setPreview(null);
    setFileLabel(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      startPreview(async () => {
        const result = await previewCsvAction(text);
        setPreview(result);
      });
    };
    reader.readAsText(file);
  };

  const runCommit = () => {
    if (!preview || !preview.success) {
      return;
    }
    setCommitResult(null);
    startCommit(async () => {
      const result = await commitCsvAction(preview.token);
      setCommitResult(result);
    });
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 mb-2">CSV import</p>
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Preview, then commit</h3>
      <p className="text-sm text-gray-600 mb-4">
        First row must be headers. Required columns:{" "}
        <code className="text-xs bg-gray-100 px-1 rounded">
          questionText, optionA, optionB, optionC, optionD, correctAnswer, topic, difficulty
        </code>
        . Optional: <code className="text-xs bg-gray-100 px-1 rounded">explanation</code>,{" "}
        <code className="text-xs bg-gray-100 px-1 rounded">grammarPoints</code> (comma-separated, stored in{" "}
        <code className="text-xs bg-gray-100 px-1 rounded">notes</code>),{" "}
        <code className="text-xs bg-gray-100 px-1 rounded">priorKnown</code> (true / false / empty).
      </p>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 overflow-x-auto mb-6">
        <pre className="text-xs text-gray-700 whitespace-pre-wrap">
          {`questionText,optionA,optionB,optionC,optionD,correctAnswer,topic,difficulty,explanation,grammarPoints,priorKnown
"The team will ___ the report.",submit,borrow,ignore,delete,A,Grammar,B,,,`}
        </pre>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="csv-file" className="block text-sm font-medium text-gray-700 mb-2">
            CSV file
          </label>
          <input
            id="csv-file"
            name="csv"
            type="file"
            accept=".csv,text/csv"
            disabled={isPreviewPending || isCommitPending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                runPreview(file);
              }
            }}
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700 disabled:opacity-60"
          />
          {fileLabel ? <p className="text-xs text-gray-500 mt-1">Selected: {fileLabel}</p> : null}
        </div>

        {isPreviewPending ? (
          <p className="text-sm text-gray-600">Parsing and validating…</p>
        ) : null}

        {preview && !preview.success ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <p className="font-medium mb-2">CSV parse error</p>
            <ul className="list-disc pl-5 space-y-1">
              {preview.errors.map((err, i) => (
                <li key={i}>{formatPapaError(err)}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {preview && preview.success ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <p className="text-gray-500 mb-1">Total rows</p>
                <p className="font-semibold text-gray-900">{preview.total}</p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <p className="text-gray-500 mb-1">Valid rows</p>
                <p className="font-semibold text-gray-900">{preview.validCount}</p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <p className="text-gray-500 mb-1">Invalid rows</p>
                <p className="font-semibold text-gray-900">{preview.issues.length}</p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <p className="text-gray-500 mb-1">Sample</p>
                <p className="font-semibold text-gray-900">Up to 10 shown</p>
              </div>
            </div>

            {preview.issues.length > 0 ? (
              <div>
                <p className="text-sm font-medium text-gray-900 mb-2">Validation issues</p>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-amber-100 bg-amber-50 text-sm">
                  <table className="min-w-full text-left">
                    <thead className="sticky top-0 bg-amber-100/90 text-xs uppercase text-amber-900">
                      <tr>
                        <th className="px-3 py-2">Row</th>
                        <th className="px-3 py-2">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.issues.map((issue, idx) => (
                        <tr key={idx} className="border-t border-amber-100">
                          <td className="px-3 py-1.5 tabular-nums">{issue.row}</td>
                          <td className="px-3 py-1.5 text-amber-950">{issue.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {preview.sample.length > 0 ? (
              <div>
                <p className="text-sm font-medium text-gray-900 mb-2">Sample (first valid rows)</p>
                <div className="overflow-x-auto rounded-lg border border-gray-100">
                  <table className="min-w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-2 py-2 font-medium">Topic</th>
                        <th className="px-2 py-2 font-medium">Difficulty</th>
                        <th className="px-2 py-2 font-medium">Answer</th>
                        <th className="px-2 py-2 font-medium">Question (preview)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.sample.map((row, idx) => (
                        <tr key={idx} className="border-t border-gray-100">
                          <td className="px-2 py-2 align-top">{row.topic}</td>
                          <td className="px-2 py-2 align-top">{row.difficulty}</td>
                          <td className="px-2 py-2 align-top">{row.correctAnswer}</td>
                          <td className="px-2 py-2 align-top text-gray-700 max-w-md">
                            {row.questionText.length > 120 ? `${row.questionText.slice(0, 120)}…` : row.questionText}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={preview.validCount === 0 || isCommitPending}
                onClick={runCommit}
                className="inline-flex items-center rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                {isCommitPending ? "Committing…" : `Commit all ${preview.validCount} valid row${preview.validCount === 1 ? "" : "s"}`}
              </button>
              {isCommitPending ? <span className="text-sm text-gray-600">Writing to database in batches…</span> : null}
            </div>
          </div>
        ) : null}

        {commitResult ? (
          commitResult.ok ? (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-900">
              <p className="font-medium mb-2">Import finished</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Imported: <strong>{commitResult.imported}</strong> (of {commitResult.total} valid rows in token)
                </li>
                <li>Skipped (duplicate in file): {commitResult.skippedDuplicateInFile}</li>
                <li>Skipped (already in bank): {commitResult.skippedExisting}</li>
              </ul>
            </div>
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{commitResult.error}</div>
          )
        ) : null}
      </div>
    </section>
  );
}
