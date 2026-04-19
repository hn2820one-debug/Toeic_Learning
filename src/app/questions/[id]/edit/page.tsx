import { notFound } from "next/navigation";

import { deleteQuestionAction, updateQuestionAction } from "@/app/questions/[id]/edit/actions";
import { isAllowedQuestionDifficulty, normalizeQuestionTopic, QUESTION_DIFFICULTY_VALUES } from "@/lib/question-fields";
import { getEditableQuestion, parseQuestionEditFeedback } from "@/lib/question-management";
import { getQuestionFilterOptions } from "@/lib/questions";

export const dynamic = "force-dynamic";

type SearchParamValue = string | string[] | undefined;

type QuestionEditPageProps = {
  params: {
    id: string;
  };
  searchParams?: {
    status?: SearchParamValue;
    message?: SearchParamValue;
    confirmDelete?: SearchParamValue;
  };
};

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

export default async function QuestionEditPage({ params, searchParams }: QuestionEditPageProps) {
  const questionId = Number.parseInt(params.id, 10);

  if (!Number.isInteger(questionId) || questionId <= 0) {
    notFound();
  }

  const [question, { topics }] = await Promise.all([getEditableQuestion(questionId), getQuestionFilterOptions()]);

  if (!question) {
    notFound();
  }

  const feedback = parseQuestionEditFeedback(searchParams);
  const topicValue = normalizeQuestionTopic(question.topic) ?? question.topic;
  const hasLegacyDifficulty = !isAllowedQuestionDifficulty(question.difficulty);
  const difficultyValue = hasLegacyDifficulty ? "" : question.difficulty;

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <a href="/questions" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Back to Question Bank
          </a>
          <h2 className="mt-2 text-2xl font-bold text-gray-900 mb-2">Edit Question</h2>
          <p className="text-gray-500">Update one QuestionBankItem record from the UI without changing training, history, or report logic.</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
          Question #{question.id}
        </div>
      </div>

      {feedback.status && feedback.message ? (
        <div className={`mb-6 rounded-xl border px-4 py-4 text-sm font-medium ${getResultVariantClasses(feedback.status)}`}>
          {feedback.message}
        </div>
      ) : null}

      <div className="space-y-6">
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 mb-2">Question Details</p>
            <h3 className="text-xl font-semibold text-gray-900">Single-question management</h3>
            <p className="mt-2 text-sm text-gray-600">
              Changes update the current QuestionBankItem record only. Existing StudySession and AnswerHistory rows are not rewritten.
            </p>
          </div>

          <form action={updateQuestionAction} className="space-y-5">
            <input type="hidden" name="questionId" value={question.id} />

            <div>
              <label htmlFor="questionText" className="block text-sm font-medium text-gray-700 mb-2">
                Question Text
              </label>
              <textarea
                id="questionText"
                name="questionText"
                defaultValue={question.questionText}
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
                  defaultValue={question.optionA}
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
                  defaultValue={question.optionB}
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
                  defaultValue={question.optionC}
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
                  defaultValue={question.optionD}
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
                  defaultValue={question.correctAnswer}
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
                  defaultValue={topicValue}
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
                  defaultValue={difficultyValue}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                >
                  {hasLegacyDifficulty ? (
                    <option value="" disabled>
                      Select A, B, or C
                    </option>
                  ) : null}
                  {QUESTION_DIFFICULTY_VALUES.map((difficulty) => (
                    <option key={difficulty} value={difficulty}>
                      {difficulty}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  {hasLegacyDifficulty
                    ? `This record currently uses an older difficulty value (${question.difficulty}) and must be resaved as A, B, or C.`
                    : "Difficulty is standardized to A, B, or C across create, edit, and import."}
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="explanation" className="block text-sm font-medium text-gray-700 mb-2">
                Explanation
              </label>
              <textarea
                id="explanation"
                name="explanation"
                defaultValue={question.explanation ?? ""}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Save Changes
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

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 mb-2">Delete Safety</p>
            <h3 className="text-xl font-semibold text-gray-900">Safe single-question delete</h3>
          </div>

          {question.canDelete ? (
            feedback.confirmDelete ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <p className="text-sm font-medium text-red-800 mb-3">
                  Confirm delete for Question #{question.id}. This permanently removes the current QuestionBankItem row.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <form action={deleteQuestionAction}>
                    <input type="hidden" name="questionId" value={question.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                    >
                      Confirm Delete
                    </button>
                  </form>

                  <a
                    href={`/questions/${question.id}/edit`}
                    className="inline-flex items-center rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Keep Question
                  </a>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                <p className="text-sm text-gray-700 mb-4">
                  This question is not referenced by AnswerHistory, so deletion is currently allowed.
                </p>
                <a
                  href={`/questions/${question.id}/edit?confirmDelete=1`}
                  className="inline-flex items-center rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                >
                  Open Delete Confirmation
                </a>
              </div>
            )
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
              Delete is disabled because this question is already referenced by {question.answerHistoryCount} answer record
              {question.answerHistoryCount === 1 ? "" : "s"}. The row is kept to preserve training history.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}