import { createQuestionAction } from "@/app/questions/new/actions";
import BilingualHeading from "@/components/ui/BilingualHeading";
import AppCard from "@/components/ui/AppCard";
import { formInputClass, formTextareaClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";
import { QUESTION_DIFFICULTY_VALUES } from "@/lib/question-fields";
import { getQuestionFilterOptions } from "@/lib/questions";

export const dynamic = "force-dynamic";

type SearchParamValue = string | string[] | undefined;

type NewQuestionPageProps = {
  searchParams?: {
    status?: SearchParamValue;
    message?: SearchParamValue;
  };
};

function normalizeParam(value: SearchParamValue) {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (!normalized) {
    return undefined;
  }

  const trimmed = normalized.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getResultVariantClasses(status?: string) {
  switch (status) {
    case "success":
      return "border-green-200 bg-green-50 text-green-800";
    case "error":
      return "border-red-200 bg-red-50 text-red-800";
    default:
      return "";
  }
}

export default async function NewQuestionPage({ searchParams }: NewQuestionPageProps) {
  const status = normalizeParam(searchParams?.status);
  const message = normalizeParam(searchParams?.message);
  const { topics } = await getQuestionFilterOptions();

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <a href="/questions" className="text-sm font-medium text-primary-600 hover:text-primary-700">
            ← 返回題庫 · Back to bank
          </a>
          <BilingualHeading
            titleZh="新增題目"
            titleEn="New question"
            descriptionZh="建立一筆題庫資料，規則與編輯、匯入相同。"
            descriptionEn="Creates one QuestionBankItem with the same validation as edit and import."
            className="!mb-0 mt-3"
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          QuestionBankItem
        </div>
      </div>

      {status && message ? (
        <div className={`mb-6 rounded-xl border px-4 py-4 text-sm font-medium ${getResultVariantClasses(status)}`}>
          {message}
        </div>
      ) : null}

      <AppCard>
        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary-600">題目內容 · Details</p>
          <h2 className="text-xl font-semibold text-slate-900">單題建立 · Single-question create</h2>
          <p className="mt-2 text-sm text-slate-600">
            成功後會導向編輯頁以便立即檢查。Success redirects to the edit page for review.
          </p>
        </div>

        <form action={createQuestionAction} className="space-y-5">
          <div>
            <label htmlFor="questionText" className="mb-2 block text-sm font-medium text-slate-800">
              題幹 · Question text
            </label>
            <textarea
              id="questionText"
              name="questionText"
              rows={4}
              required
              className={formTextareaClass}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="optionA" className="mb-2 block text-sm font-medium text-slate-800">
                選項 A · Option A
              </label>
              <input id="optionA" name="optionA" type="text" required className={formInputClass} />
            </div>

            <div>
              <label htmlFor="optionB" className="mb-2 block text-sm font-medium text-slate-800">
                選項 B · Option B
              </label>
              <input id="optionB" name="optionB" type="text" required className={formInputClass} />
            </div>

            <div>
              <label htmlFor="optionC" className="mb-2 block text-sm font-medium text-slate-800">
                選項 C · Option C
              </label>
              <input id="optionC" name="optionC" type="text" required className={formInputClass} />
            </div>

            <div>
              <label htmlFor="optionD" className="mb-2 block text-sm font-medium text-slate-800">
                選項 D · Option D
              </label>
              <input id="optionD" name="optionD" type="text" required className={formInputClass} />
            </div>

            <div>
              <label htmlFor="correctAnswer" className="mb-2 block text-sm font-medium text-slate-800">
                正解 · Correct answer
              </label>
              <select
                id="correctAnswer"
                name="correctAnswer"
                defaultValue="A"
                required
                className={formInputClass}
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>

            <div>
              <label htmlFor="topic" className="mb-2 block text-sm font-medium text-slate-800">
                主題 · Topic
              </label>
              <input
                id="topic"
                list="question-topic-options"
                name="topic"
                type="text"
                required
                placeholder="選擇或輸入 · Choose or type"
                className={formInputClass}
              />
              <p className="mt-2 text-xs text-slate-500">
                可從建議挑選；儲存時會修剪空白。Suggestions listed; whitespace trimmed on save.
              </p>
              <datalist id="question-topic-options">
                {topics.map((topic) => (
                  <option key={topic} value={topic} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="difficulty" className="mb-2 block text-sm font-medium text-slate-800">
                難度 · Difficulty
              </label>
              <select
                id="difficulty"
                name="difficulty"
                defaultValue={QUESTION_DIFFICULTY_VALUES[0]}
                required
                className={formInputClass}
              >
                {QUESTION_DIFFICULTY_VALUES.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500">標準為 A / B / C（與編輯、匯入一致）。</p>
            </div>
          </div>

          <div>
            <label htmlFor="explanation" className="mb-2 block text-sm font-medium text-slate-800">
              解析 · Explanation
            </label>
            <textarea id="explanation" name="explanation" rows={4} className={formTextareaClass} />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className={primaryButtonClass}>
              建立 · Create
            </button>
            <a href="/questions" className={secondaryButtonClass}>
              取消 · Cancel
            </a>
          </div>
        </form>
      </AppCard>
    </div>
  );
}