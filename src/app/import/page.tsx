import CsvImportSection from "@/app/import/CsvImportSection";
import AppCard from "@/components/ui/AppCard";
import BilingualHeading from "@/components/ui/BilingualHeading";
import { QUESTION_DIFFICULTY_VALUES } from "@/lib/question-fields";
import { QUESTION_IMPORT_EXAMPLE } from "@/lib/import";
import { primaryButtonClass } from "@/lib/ui/form-classes";

export const dynamic = "force-dynamic";

type SearchParamValue = string | string[] | undefined;

type ImportPageSearchParams = {
  status?: SearchParamValue;
  message?: SearchParamValue;
  total?: SearchParamValue;
  imported?: SearchParamValue;
  skipped?: SearchParamValue;
  invalid?: SearchParamValue;
};

function normalizeParam(value: SearchParamValue) {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (!normalized) {
    return undefined;
  }

  const trimmed = normalized.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseNonNegativeInt(value: SearchParamValue) {
  const normalized = normalizeParam(value);
  if (!normalized) {
    return undefined;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function getResultVariantClasses(status?: string) {
  switch (status) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "error":
      return "border-red-200 bg-red-50 text-red-900";
    default:
      return "";
  }
}

type ImportPageProps = {
  searchParams?: ImportPageSearchParams;
};

export default function ImportPage({ searchParams }: ImportPageProps) {
  const status = normalizeParam(searchParams?.status);
  const message = normalizeParam(searchParams?.message);
  const summary = {
    totalRowsProcessed: parseNonNegativeInt(searchParams?.total),
    importedCount: parseNonNegativeInt(searchParams?.imported),
    skippedCount: parseNonNegativeInt(searchParams?.skipped),
    invalidCount: parseNonNegativeInt(searchParams?.invalid),
  };

  const hasSummary = Object.values(summary).every((value) => value !== undefined);

  return (
    <div className="max-w-5xl">
      <BilingualHeading
        titleZh="匯入題目"
        titleEn="Import questions"
        descriptionZh="從 JSON 或 CSV 將題目寫入本機題庫。CSV 採「先預覽、再匯入」，避免格式錯誤直接寫入。"
        descriptionEn="Upload JSON or CSV to add rows to QuestionBankItem. CSV uses preview-then-commit with validation feedback."
      />

      {status && message ? (
        <div className={`mb-8 rounded-2xl border px-4 py-4 ${getResultVariantClasses(status)}`}>
          <p className="text-sm font-medium mb-3">{message}</p>

          {hasSummary ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 text-sm">
              <div className="rounded-xl bg-white/70 px-3 py-2 shadow-sm">
                <p className="opacity-80 mb-1">總列 · Total</p>
                <p className="font-semibold">{summary.totalRowsProcessed}</p>
              </div>
              <div className="rounded-xl bg-white/70 px-3 py-2 shadow-sm">
                <p className="opacity-80 mb-1">匯入 · Imported</p>
                <p className="font-semibold">{summary.importedCount}</p>
              </div>
              <div className="rounded-xl bg-white/70 px-3 py-2 shadow-sm">
                <p className="opacity-80 mb-1">略過 · Skipped</p>
                <p className="font-semibold">{summary.skippedCount}</p>
              </div>
              <div className="rounded-xl bg-white/70 px-3 py-2 shadow-sm">
                <p className="opacity-80 mb-1">無效 · Invalid</p>
                <p className="font-semibold">{summary.invalidCount}</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="mb-6 text-sm text-slate-600">
        建議先完成下方 <strong>CSV</strong> 四步驟；JSON 一鍵匯入置於頁面底部。
        <span className="mt-1 block text-slate-500">
          Start with the CSV flow below; JSON quick import is at the bottom.
        </span>
      </p>

      <div className="space-y-8">
        <CsvImportSection />

        <AppCard>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">JSON · 格式說明</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">頂層為陣列的 JSON</h2>
          <p className="mt-1 text-sm text-slate-500">Top-level JSON array format</p>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p>
              每個物件需含 questionText、optionA–D、correctAnswer、topic、difficulty。Each object needs those fields.
            </p>
            <p>
              explanation 選填。correctAnswer 會轉成大寫，須為 A–D。difficulty 為{" "}
              {QUESTION_DIFFICULTY_VALUES.join(" / ")}。
            </p>
            <p>題目文字重複時會略過（題庫已存在或同檔較早列）。</p>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 overflow-x-auto">
            <pre className="text-sm text-slate-700 whitespace-pre-wrap">{QUESTION_IMPORT_EXAMPLE}</pre>
          </div>
        </AppCard>

        <AppCard>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">JSON · 上傳</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">上傳 JSON 檔</h2>
          <p className="mt-1 text-sm text-slate-500">Upload a question JSON file</p>
          <p className="mt-4 text-sm text-slate-600">
            成功後題目會立即出現在 <code className="rounded bg-slate-100 px-1">/questions</code>，並可供訓練使用。
          </p>

          <form action="/import/submit" method="post" encType="multipart/form-data" className="mt-6 space-y-4">
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-slate-800 mb-2">
                JSON 檔案 · JSON file
              </label>
              <input
                id="file"
                name="file"
                type="file"
                accept=".json,application/json"
                required
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 file:mr-4 file:rounded-lg file:border-0 file:bg-primary-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary-700"
              />
            </div>

            <button type="submit" className={primaryButtonClass}>
              匯入題目 · Import questions
            </button>
          </form>
        </AppCard>
      </div>
    </div>
  );
}
