import { createQuestionAction } from "@/app/questions/new/actions";
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
          <a href="/questions" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Back to Question Bank
          </a>
          <h2 className="mt-2 text-2xl font-bold text-gray-900 mb-2">New Question</h2>
          <p className="text-gray-500">Create one QuestionBankItem record with the same validation rules already used by edit and import.</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">QuestionBankItem</div>
      </div>

      {status && message ? (
        <div className={`mb-6 rounded-xl border px-4 py-4 text-sm font-medium ${getResultVariantClasses(status)}`}>
          {message}
        </div>
      ) : null}

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 mb-2">Question Details</p>
          <h3 className="text-xl font-semibold text-gray-900">Single-question create flow</h3>
          <p className="mt-2 text-sm text-gray-600">
            A successful create redirects to the dedicated edit page so the new QuestionBankItem can be reviewed immediately.
          </p>
        </div>

        <form action={createQuestionAction} className="space-y-5">
          <div>
            <label htmlFor="questionText" className="block text-sm font-medium text-gray-700 mb-2">
              Question Text
            </label>
            <textarea
              id="questionText"
              name="questionText"
              rows={4}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="optionA" className="block text-sm font-medium text-gray-700 mb-2">
                Option A
              </label>
              <input
                id="optionA"
                name="optionA"
                type="text"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="optionB" className="block text-sm font-medium text-gray-700 mb-2">
                Option B
              </label>
              <input
                id="optionB"
                name="optionB"
                type="text"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="optionC" className="block text-sm font-medium text-gray-700 mb-2">
                Option C
              </label>
              <input
                id="optionC"
                name="optionC"
                type="text"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="optionD" className="block text-sm font-medium text-gray-700 mb-2">
                Option D
              </label>
              <input
                id="optionD"
                name="optionD"
                type="text"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="correctAnswer" className="block text-sm font-medium text-gray-700 mb-2">
                Correct Answer
              </label>
              <select
                id="correctAnswer"
                name="correctAnswer"
                defaultValue="A"
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>

            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-2">
                Topic
              </label>
              <input
                id="topic"
                list="question-topic-options"
                name="topic"
                type="text"
                required
                placeholder="Choose or enter a topic"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
              <p className="mt-2 text-xs text-gray-500">Existing topic values are suggested here. Surrounding whitespace is trimmed when saved.</p>
              <datalist id="question-topic-options">
                {topics.map((topic) => (
                  <option key={topic} value={topic} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty
              </label>
              <select
                id="difficulty"
                name="difficulty"
                defaultValue={QUESTION_DIFFICULTY_VALUES[0]}
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
              >
                {QUESTION_DIFFICULTY_VALUES.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500">Difficulty is standardized to A, B, or C across create, edit, and import.</p>
            </div>
          </div>

          <div>
            <label htmlFor="explanation" className="block text-sm font-medium text-gray-700 mb-2">
              Explanation
            </label>
            <textarea
              id="explanation"
              name="explanation"
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Create Question
            </button>
            <a
              href="/questions"
              className="inline-flex items-center rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </a>
          </div>
        </form>
      </section>
    </div>
  );
}