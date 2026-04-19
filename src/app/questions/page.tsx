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
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Question Bank</h2>
          <p className="text-gray-500">Browse TOEIC-style multiple-choice questions from the local database.</p>
        </div>

        <a
          href="/questions/new"
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          New Question
        </a>
      </div>

      {status && message ? (
        <div className={`mb-6 rounded-xl border px-4 py-4 text-sm font-medium ${getResultVariantClasses(status)}`}>
          {message}
        </div>
      ) : null}

      <form action="/questions" className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label htmlFor="q" className="block text-sm font-medium text-gray-700 mb-1">
            Search Question Text
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={filters.query ?? ""}
            placeholder="Search by keyword"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">
            Topic
          </label>
          <select
            id="topic"
            name="topic"
            defaultValue={filters.topic ?? ""}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
          >
            <option value="">All topics</option>
            {topics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
            Difficulty
          </label>
          <select
            id="difficulty"
            name="difficulty"
            defaultValue={filters.difficulty ?? ""}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
          >
            <option value="">All levels</option>
            {difficulties.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {difficulty}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Apply Filters
          </button>
          <a
            href="/questions"
            className="inline-flex items-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Reset
          </a>
          <p className="text-sm text-gray-500">
            {questions.length} question{questions.length === 1 ? "" : "s"} found
          </p>
        </div>
      </form>

      {questions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
          <p className="text-lg font-medium text-gray-700 mb-2">
            {hasActiveFilters ? "No matching questions found." : "No questions available yet."}
          </p>
          <p className="text-sm">
            {hasActiveFilters
              ? "Try a different topic, difficulty, or search keyword."
              : "Seed the database or create a question from the UI to populate the bank."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question) => {
            const explanation = previewExplanation(question.explanation);
            const options = [
              ["A", question.optionA],
              ["B", question.optionB],
              ["C", question.optionC],
              ["D", question.optionD],
            ] as const;

            return (
              <article key={question.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                        {question.topic}
                      </span>
                      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                        Difficulty {question.difficulty}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 leading-7">{question.questionText}</h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700 whitespace-nowrap">
                      Correct Answer: {question.correctAnswer}
                    </div>
                    <a
                      href={`/questions/${question.id}/edit`}
                      className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                    >
                      Manage
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
                  {options.map(([key, value]) => (
                    <div
                      key={key}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        question.correctAnswer === key
                          ? "border-green-200 bg-green-50 text-green-800"
                          : "border-gray-200 bg-gray-50 text-gray-700"
                      }`}
                    >
                      <span className="font-semibold mr-2">{key}.</span>
                      {value}
                    </div>
                  ))}
                </div>

                {explanation ? (
                  <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Explanation</p>
                    <p className="text-sm text-gray-600">{explanation}</p>
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
