import { QUESTION_DIFFICULTY_VALUES } from "@/lib/question-fields";
import { QUESTION_IMPORT_EXAMPLE } from "@/lib/import";

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
      return "border-green-200 bg-green-50 text-green-800";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "error":
      return "border-red-200 bg-red-50 text-red-800";
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
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Import</h2>
      <p className="text-gray-500 mb-8">Upload one JSON file to add new rows into QuestionBankItem using a fixed question format.</p>

      {status && message ? (
        <div className={`mb-6 rounded-xl border px-4 py-4 ${getResultVariantClasses(status)}`}>
          <p className="text-sm font-medium mb-3">{message}</p>

          {hasSummary ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 text-sm">
              <div className="rounded-lg bg-white/60 px-3 py-2">
                <p className="opacity-80 mb-1">Total Rows</p>
                <p className="font-semibold">{summary.totalRowsProcessed}</p>
              </div>
              <div className="rounded-lg bg-white/60 px-3 py-2">
                <p className="opacity-80 mb-1">Imported</p>
                <p className="font-semibold">{summary.importedCount}</p>
              </div>
              <div className="rounded-lg bg-white/60 px-3 py-2">
                <p className="opacity-80 mb-1">Skipped</p>
                <p className="font-semibold">{summary.skippedCount}</p>
              </div>
              <div className="rounded-lg bg-white/60 px-3 py-2">
                <p className="opacity-80 mb-1">Invalid</p>
                <p className="font-semibold">{summary.invalidCount}</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-6">
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 mb-2">Accepted Format</p>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">JSON file with a top-level array</h3>
          <div className="space-y-2 text-sm text-gray-600 mb-6">
            <p>Each object must include questionText, optionA, optionB, optionC, optionD, correctAnswer, topic, and difficulty.</p>
            <p>
              explanation is optional. correctAnswer is normalized to uppercase and must end up as A, B, C, or D. difficulty
              is normalized to uppercase and must end up as {QUESTION_DIFFICULTY_VALUES.join(" / ")}.
            </p>
            <p>topic is trimmed and repeated internal whitespace is collapsed so larger structured seed data follows the same rule set.</p>
            <p>Duplicate handling rule: rows are skipped when questionText already exists in QuestionBankItem or already appeared earlier in the same file.</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 overflow-x-auto">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">{QUESTION_IMPORT_EXAMPLE}</pre>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 mb-2">Import File</p>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Upload question JSON</h3>
          <p className="text-sm text-gray-600 mb-6">
            Successful imports become available on /questions immediately and can be used by later training sessions. This same
            normalized object shape is also the accepted format for future larger structured seed data.
          </p>

          <form action="/import/submit" method="post" encType="multipart/form-data" className="space-y-4">
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
                JSON file
              </label>
              <input
                id="file"
                name="file"
                type="file"
                accept=".json,application/json"
                required
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Import Questions
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
