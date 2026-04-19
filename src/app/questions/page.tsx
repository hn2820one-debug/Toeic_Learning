import AppCard from "@/components/ui/AppCard";
import BilingualHeading from "@/components/ui/BilingualHeading";
import { parseQuestionNotes } from "@/lib/question-taxonomy";
import { formInputClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";
import {
  getQuestionFilterOptions,
  getQuestions,
  normalizeQuestionFilters,
  type QuestionPageSearchParams,
} from "@/lib/questions";

export const dynamic = "force-dynamic";

type QuestionsPageProps = {
  searchParams?: QuestionPageSearchParams;
};

function previewExplanation(explanation: string | null) {
  if (!explanation) {
    return null;
  }

  return explanation.length > 140 ? `${explanation.slice(0, 140)}...` : explanation;
}

function normalizeParam(value: string | string[] | undefined) {
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

export default async function QuestionsPage({ searchParams }: QuestionsPageProps) {
  const filters = normalizeQuestionFilters(searchParams);
  const status = normalizeParam(searchParams?.status);
  const message = normalizeParam(searchParams?.message);
  const [{ topics, difficulties }, questions] = await Promise.all([
    getQuestionFilterOptions(),
    getQuestions(filters),
  ]);

  const hasActiveFilters = Boolean(filters.topic || filters.difficulty || filters.query);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <BilingualHeading
          titleZh="題庫"
          titleEn="Question Bank"
          descriptionZh="瀏覽、篩選本機多選題；可從此新增或管理單題。"
          descriptionEn="Browse and filter TOEIC-style MCQs from the local database."
          className="!mb-0 md:flex-1"
        />

        <a href="/questions/new" className={`${primaryButtonClass} shrink-0 px-4`}>
          新增題目 · New
        </a>
      </div>

      {status && message ? (
        <div className={`mb-6 rounded-xl border px-4 py-4 text-sm font-medium ${getResultVariantClasses(status)}`}>
          {message}
        </div>
      ) : null}

      <form
        action="/questions"
        className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm md:grid-cols-4"
      >
        <div className="md:col-span-2">
          <label htmlFor="q" className="mb-1 block text-sm font-medium text-slate-800">
            搜尋題幹 · Search text
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={filters.query ?? ""}
            placeholder="題幹 / topic / classification"
            className={formInputClass}
          />
        </div>

        <div>
          <label htmlFor="topic" className="mb-1 block text-sm font-medium text-slate-800">
            主題 · Topic
          </label>
          <select
            id="topic"
            name="topic"
            defaultValue={filters.topic ?? ""}
            className={formInputClass}
          >
            <option value="">全部 · All</option>
            {topics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="difficulty" className="mb-1 block text-sm font-medium text-slate-800">
            難度 · Difficulty
          </label>
          <select
            id="difficulty"
            name="difficulty"
            defaultValue={filters.difficulty ?? ""}
            className={formInputClass}
          >
            <option value="">全部 · All</option>
            {difficulties.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {difficulty}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:col-span-4">
          <button type="submit" className={`${primaryButtonClass} px-4`}>
            套用 · Apply
          </button>
          <a href="/questions" className={`${secondaryButtonClass} px-4`}>
            重設 · Reset
          </a>
          <p className="text-sm text-slate-600">
            {questions.length} 題 · {questions.length === 1 ? "question" : "questions"} found
          </p>
        </div>
      </form>

      {questions.length === 0 ? (
        <AppCard className="text-center">
          <p className="text-lg font-semibold text-slate-800">
            {hasActiveFilters ? "沒有符合篩選的題目 · No matches" : "尚無題目 · No questions yet"}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {hasActiveFilters
              ? "請調整主題、難度或關鍵字。Try different topic, difficulty, or keyword."
              : "請匯入或新增題目。Seed, import, or create a question."}
          </p>
        </AppCard>
      ) : (
        <div className="space-y-4">
          {questions.map((question) => {
            const explanation = previewExplanation(question.explanation);
            const classification = parseQuestionNotes(question.notes);
            const options = [
              ["A", question.optionA],
              ["B", question.optionB],
              ["C", question.optionC],
              ["D", question.optionD],
            ] as const;

            return (
              <article
                key={question.id}
                className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-card transition-shadow hover:shadow-cardHover"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {classification ? (
                        <span className="inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
                          {classification.categoryLabel}
                        </span>
                      ) : null}
                      <span className="inline-flex rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 ring-1 ring-primary-200">
                        主題 · {question.topic}
                      </span>
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        難度 · Lv {question.difficulty}
                      </span>
                      {classification ? (
                        <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
                          重點 · {classification.subFocusLabel}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="text-lg font-semibold leading-7 text-slate-900">{question.questionText}</h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="whitespace-nowrap rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
                      答案 · Ans {question.correctAnswer}
                    </div>
                    <a
                      href={`/questions/${question.id}/edit`}
                      className="inline-flex items-center rounded-xl bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
                    >
                      編輯 · Edit
                    </a>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {options.map(([key, value]) => (
                    <div
                      key={key}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        question.correctAnswer === key
                          ? "border-emerald-200 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span className="mr-2 font-semibold">{key}.</span>
                      {value}
                    </div>
                  ))}
                </div>

                {explanation ? (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      解析 · Explanation
                    </p>
                    <p className="text-sm leading-relaxed text-slate-700">{explanation}</p>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
