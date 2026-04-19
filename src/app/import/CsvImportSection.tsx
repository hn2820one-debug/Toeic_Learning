"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";

import AppCard from "@/components/ui/AppCard";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";

import {
  commitCsvFormAction,
  previewCsvFormAction,
  type previewCsvAction,
  type commitCsvAction,
} from "./csv-actions";

type PreviewResult = Awaited<ReturnType<typeof previewCsvAction>> | {
  success: false;
  errors: { message: string }[];
};
type CommitResult = Awaited<ReturnType<typeof commitCsvAction>>;

function formatPapaError(err: { code?: string; message: string; row?: number }) {
  const row = err.row !== undefined ? ` (row ${err.row})` : "";
  return `${err.message}${row}`;
}

type FlowStep = 1 | 2 | 3 | 4;

function StepRail({ activeStep }: { activeStep: FlowStep }) {
  const steps: { step: FlowStep; zh: string; en: string }[] = [
    { step: 1, zh: "選擇 CSV", en: "Choose file" },
    { step: 2, zh: "預覽", en: "Preview" },
    { step: 3, zh: "檢查結果", en: "Review" },
    { step: 4, zh: "匯入", en: "Commit" },
  ];

  return (
    <ol className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {steps.map(({ step, zh, en }) => {
        const done = activeStep > step;
        const current = activeStep === step;
        return (
          <li
            key={step}
            className={`rounded-xl border px-3 py-2.5 text-center text-xs sm:text-sm ${
              current
                ? "border-primary-500 bg-primary-50 text-primary-900 ring-1 ring-primary-500/40 shadow-sm"
                : done
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            <span className="block font-semibold">
              <span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/70 text-[11px] font-bold ring-1 ring-current/30">
                {done ? "✓" : step}
              </span>
              {zh}
            </span>
            <span className="mt-0.5 block text-[11px] font-normal opacity-80">{en}</span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * CSV import flow uses standard HTML <form> submission so the file is read by the
 * server (via FormData → File.text()), not by the client. This sidesteps all the
 * client-side gotchas (ref/state desync, embedded browsers blocking the File API,
 * change event not firing on re-pick, etc.) that previously made Preview unusable.
 */
export default function CsvImportSection() {
  const previewFormRef = useRef<HTMLFormElement>(null);
  const [pickedFileName, setPickedFileName] = useState<string | null>(null);

  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);
  const [isPreviewPending, startPreview] = useTransition();
  const [isCommitPending, startCommit] = useTransition();

  const previewSucceeded = preview !== null && preview.success === true;

  const activeStep: FlowStep = (() => {
    if (commitResult?.ok) return 4;
    if (previewSucceeded) return 3;
    if (isPreviewPending) return 2;
    if (preview && !preview.success) return 2;
    if (pickedFileName) return 2;
    return 1;
  })();

  const handlePreviewSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPreview(null);
    setCommitResult(null);
    startPreview(async () => {
      const result = await previewCsvFormAction(formData);
      setPreview(result as PreviewResult);
    });
  };

  const handleCommitSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setCommitResult(null);
    startCommit(async () => {
      const result = await commitCsvFormAction(formData);
      setCommitResult(result);
    });
  };

  const clearAll = () => {
    if (previewFormRef.current) {
      previewFormRef.current.reset();
    }
    setPickedFileName(null);
    setPreview(null);
    setCommitResult(null);
  };

  const previewBusy = isPreviewPending || isCommitPending;

  const statusBanner = (() => {
    if (commitResult?.ok) return null;

    if (!pickedFileName && !preview) {
      return (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
          <p className="font-semibold text-slate-900">尚未選擇檔案 · No file selected</p>
          <p className="mt-1 text-slate-600">請先點「選擇檔案」挑一個 CSV，再按「預覽」。</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Pick a CSV with the file chooser, then click Preview.
          </p>
        </div>
      );
    }

    if (pickedFileName && !preview && !isPreviewPending) {
      return (
        <div className="mb-4 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-950 shadow-sm">
          <p className="font-semibold">已選擇檔案，可開始預覽 · File ready — click Preview</p>
          <p className="mt-1 text-primary-900/90">
            <span className="font-mono text-[12px]">{pickedFileName}</span> — 按下「預覽 / Preview」上傳並解析。
          </p>
        </div>
      );
    }

    if (isPreviewPending) {
      return (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm">
          <p className="font-semibold">預覽處理中… · Uploading and parsing…</p>
        </div>
      );
    }

    if (preview && !preview.success) {
      return (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-sm">
          <p className="font-semibold">預覽失敗 · Preview has issues</p>
          <p className="mt-1">下方會列出原因，請修正 CSV 後再試。</p>
        </div>
      );
    }

    if (preview && preview.success) {
      const hasRowIssues = preview.issues.length > 0;
      return (
        <div
          className={`mb-4 rounded-xl border px-4 py-3 text-sm shadow-sm ${
            hasRowIssues
              ? "border-amber-200 bg-amber-50 text-amber-950"
              : "border-emerald-200 bg-emerald-50 text-emerald-950"
          }`}
        >
          <p className="font-semibold">
            {hasRowIssues
              ? "預覽完成（有部分列需留意） · Preview OK with row issues"
              : "預覽成功，可進行匯入 · Preview success — ready to commit"}
          </p>
          <p className="mt-1 opacity-90">
            有效列 {preview.validCount} / 總列 {preview.total}
            {hasRowIssues ? ` — ${preview.issues.length} 列有欄位或內容問題` : ""}
          </p>
        </div>
      );
    }

    return null;
  })();

  const commitBanner = commitResult ? (
    commitResult.ok ? (
      <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950 shadow-sm">
        <p className="text-base font-semibold">匯入成功 · Commit success</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            已寫入 <strong>{commitResult.imported}</strong> 筆 · Imported rows
          </li>
          <li>同檔重複略過 · Duplicates within file: {commitResult.skippedDuplicateInFile}</li>
          <li>題庫已存在略過 · Already in bank: {commitResult.skippedExisting}</li>
        </ul>
        <p className="mt-3 text-xs text-emerald-900/90">
          可前往 <a href="/questions" className="underline">/questions</a> 確認新題目 · Verify on the Questions page.
        </p>
      </div>
    ) : (
      <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-sm">
        <p className="font-semibold">匯入失敗 · Commit failed</p>
        <p className="mt-1">{commitResult.error}</p>
      </div>
    )
  ) : null;

  return (
    <AppCard id="csv-import" className="scroll-mt-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">CSV · 匯入題庫</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">預覽後再寫入資料庫</h2>
      <p className="mt-1 text-sm text-slate-500">Preview, then commit to the question bank</p>

      <p className="mt-4 text-sm leading-relaxed text-slate-700">
        第一列須為欄位名稱。必填欄位：
        <code className="mx-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-800">
          questionText, optionA, optionB, optionC, optionD, correctAnswer, topic, difficulty
        </code>
        。選填：
        <code className="mx-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-xs">explanation</code>、
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">grammarPoints</code>
        （逗號分隔，寫入 notes）、
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">priorKnown</code>。
      </p>

      <StepRail activeStep={activeStep} />

      {statusBanner}
      {commitBanner}

      <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 overflow-x-auto">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          範例 · Sample CSV
        </p>
        <pre className="text-xs text-slate-700 whitespace-pre-wrap">
          {`questionText,optionA,optionB,optionC,optionD,correctAnswer,topic,difficulty,explanation,grammarPoints,priorKnown
"The team will ___ the report.",submit,borrow,ignore,delete,A,Grammar,B,,,`}
        </pre>
      </div>

      <form ref={previewFormRef} onSubmit={handlePreviewSubmit} className="space-y-5">
        <div>
          <label htmlFor="csv-file" className="mb-2 block text-sm font-semibold text-slate-800">
            步驟 1 · 選擇 CSV 檔案
            <span className="ml-1 font-normal text-slate-500">· Step 1 — choose CSV file</span>
          </label>
          <input
            id="csv-file"
            name="file"
            type="file"
            accept=".csv,text/csv,text/plain,text/comma-separated-values,application/vnd.ms-excel"
            required
            disabled={previewBusy}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0] ?? null;
              setPickedFileName(file?.name ?? null);
              setPreview(null);
              setCommitResult(null);
            }}
            className="block w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition-colors file:mr-4 file:rounded-lg file:border-0 file:bg-primary-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white file:transition-colors hover:file:bg-primary-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:opacity-60"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={previewBusy}
            className={`${primaryButtonClass} px-6 py-3 text-base shadow-md`}
          >
            {isPreviewPending ? "預覽中… · Parsing…" : "步驟 2 · 預覽 · Preview"}
          </button>
          <button type="button" onClick={clearAll} disabled={previewBusy} className={secondaryButtonClass}>
            重選檔案 · Clear
          </button>
        </div>
      </form>

      {preview && !preview.success ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-sm">
          <p className="mb-2 font-semibold">CSV 解析錯誤 · Parse error</p>
          <ul className="list-disc space-y-1 pl-5">
            {preview.errors.map((err, i) => (
              <li key={i}>{formatPapaError(err)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {previewSucceeded ? (
        <div className="mt-6 space-y-5 border-t border-slate-200 pt-6">
          <h3 className="text-base font-semibold text-slate-900">
            步驟 3 · 檢視解析結果
            <span className="ml-1 text-sm font-normal text-slate-500">· Step 3 — review parsed result</span>
          </h3>

          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
              <p className="mb-1 text-slate-500">總列 · Total</p>
              <p className="text-lg font-semibold text-slate-900">{preview.total}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 shadow-sm">
              <p className="mb-1 text-emerald-700">有效 · Valid</p>
              <p className="text-lg font-semibold text-emerald-900">{preview.validCount}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 shadow-sm">
              <p className="mb-1 text-amber-800">問題列 · Issues</p>
              <p className="text-lg font-semibold text-amber-900">{preview.issues.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
              <p className="mb-1 text-slate-500">範例列 · Sample</p>
              <p className="text-lg font-semibold text-slate-900">{preview.sample.length}</p>
            </div>
          </div>

          {preview.issues.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-900">列級問題 · Validation issues</p>
              <div className="max-h-44 overflow-y-auto rounded-xl border border-amber-200 bg-amber-50/80 text-sm">
                <table className="min-w-full text-left">
                  <thead className="sticky top-0 bg-amber-100 text-xs uppercase text-amber-950">
                    <tr>
                      <th className="px-3 py-2">列 · Row</th>
                      <th className="px-3 py-2">原因 · Reason</th>
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
              <p className="mb-2 text-sm font-semibold text-slate-900">
                有效列範例 · Sample (first valid rows)
              </p>
              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-2 py-2 font-semibold">Topic</th>
                      <th className="px-2 py-2 font-semibold">Lv</th>
                      <th className="px-2 py-2 font-semibold">Ans</th>
                      <th className="px-2 py-2 font-semibold">Question (preview)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sample.map((row, idx) => (
                      <tr key={idx} className="border-t border-slate-100">
                        <td className="px-2 py-2 align-top">{row.topic}</td>
                        <td className="px-2 py-2 align-top">{row.difficulty}</td>
                        <td className="px-2 py-2 align-top font-semibold text-primary-700">
                          {row.correctAnswer}
                        </td>
                        <td className="max-w-md px-2 py-2 align-top text-slate-700">
                          {row.questionText.length > 120
                            ? `${row.questionText.slice(0, 120)}…`
                            : row.questionText}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <form onSubmit={handleCommitSubmit} className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <h3 className="mb-3 text-base font-semibold text-emerald-900">
              步驟 4 · 寫入題庫
              <span className="ml-1 text-sm font-normal text-emerald-800">· Step 4 — commit to bank</span>
            </h3>
            <input type="hidden" name="token" value={preview.token} />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={preview.validCount === 0 || isCommitPending}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-md transition-colors hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:pointer-events-none disabled:opacity-50"
              >
                {isCommitPending
                  ? "寫入中… · Committing…"
                  : `匯入 ${preview.validCount} 筆 · Commit ${preview.validCount} row${preview.validCount === 1 ? "" : "s"}`}
              </button>
              {isCommitPending ? (
                <span className="text-sm text-emerald-900/80">批次寫入資料庫… · Writing in batches…</span>
              ) : (
                <span className="text-sm text-emerald-900/80">
                  按下後即寫入；重複題目會自動略過。Duplicates auto-skipped.
                </span>
              )}
            </div>
          </form>
        </div>
      ) : null}
    </AppCard>
  );
}
