import { notFound } from "next/navigation";

import { deleteQuestionAction, updateQuestionAction } from "@/app/questions/[id]/edit/actions";
import AppCard from "@/components/ui/AppCard";
import BilingualHeading from "@/components/ui/BilingualHeading";
import { formInputClass, formTextareaClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";
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
          <a href="/questions" className="text-sm font-medium text-primary-600 hover:text-primary-700">
            ← 返回題庫 · Back to bank
          </a>
          <BilingualHeading
            titleZh="編輯題目"
            titleEn="Edit question"
            descriptionZh="更新單筆題庫，不影響既有訓練紀錄邏輯。"
            descriptionEn="Updates this QuestionBankItem only; training and history rules unchanged."
            className="!mb-0 mt-3"
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          題目 #{question.id} · Question
        </div>
      </div>

      {feedback.status && feedback.message ? (
        <div className={`mb-6 rounded-xl border px-4 py-4 text-sm font-medium ${getResultVariantClasses(feedback.status)}`}>
          {feedback.message}
        </div>
      ) : null}

      <div className="space-y-6">
        <AppCard>
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary-600">題目內容 · Details</p>
            <h2 className="text-xl font-semibold text-slate-900">單題管理 · Single-question edit</h2>
            <p className="mt-2 text-sm text-slate-600">
              僅更新此筆題庫；既有 Session / AnswerHistory 不會改寫。Only this row changes; sessions and answers stay as stored.
            </p>
          </div>

          <form action={updateQuestionAction} className="space-y-5">
            <input type="hidden" name="questionId" value={question.id} />

            <div>
              <label htmlFor="questionText" className="mb-2 block text-sm font-medium text-slate-800">
                題幹 · Question text
              </label>
              <textarea
                id="questionText"
                name="questionText"
                defaultValue={question.questionText}
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
                <input
                  id="optionA"
                  name="optionA"
                  type="text"
                  defaultValue={question.optionA}
                  required
                  className={formInputClass}
                />
              </div>

              <div>
                <label htmlFor="optionB" className="mb-2 block text-sm font-medium text-slate-800">
                  選項 B · Option B
                </label>
                <input
                  id="optionB"
                  name="optionB"
                  type="text"
                  defaultValue={question.optionB}
                  required
                  className={formInputClass}
                />
              </div>

              <div>
                <label htmlFor="optionC" className="mb-2 block text-sm font-medium text-slate-800">
                  選項 C · Option C
                </label>
                <input
                  id="optionC"
                  name="optionC"
                  type="text"
                  defaultValue={question.optionC}
                  required
                  className={formInputClass}
                />
              </div>

              <div>
                <label htmlFor="optionD" className="mb-2 block text-sm font-medium text-slate-800">
                  選項 D · Option D
                </label>
                <input
                  id="optionD"
                  name="optionD"
                  type="text"
                  defaultValue={question.optionD}
                  required
                  className={formInputClass}
                />
              </div>

              <div>
                <label htmlFor="correctAnswer" className="mb-2 block text-sm font-medium text-slate-800">
                  正解 · Correct answer
                </label>
                <select
                  id="correctAnswer"
                  name="correctAnswer"
                  defaultValue={question.correctAnswer}
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
                  defaultValue={topicValue}
                  required
                  placeholder="選擇或輸入 · Choose or type"
                  className={formInputClass}
                />
                <p className="mt-2 text-xs text-slate-500">
                  建議值如下；儲存時修剪空白。Suggestions below; whitespace trimmed on save.
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
                  defaultValue={difficultyValue}
                  required
                  className={formInputClass}
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
                <p className="mt-2 text-xs text-slate-500">
                  {hasLegacyDifficulty
                    ? `此筆目前為舊難度 (${question.difficulty})，請改存成 A / B / C。Legacy difficulty — resave as A, B, or C.`
                    : "標準為 A / B / C（與新增、匯入一致）。"}
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="explanation" className="mb-2 block text-sm font-medium text-slate-800">
                解析 · Explanation
              </label>
              <textarea
                id="explanation"
                name="explanation"
                defaultValue={question.explanation ?? ""}
                rows={4}
                className={formTextareaClass}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className={primaryButtonClass}>
                儲存 · Save
              </button>
              <a href="/questions" className={secondaryButtonClass}>
                取消 · Cancel
              </a>
            </div>
          </form>
        </AppCard>

        <AppCard>
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-600">刪除安全 · Delete safety</p>
            <h2 className="text-xl font-semibold text-slate-900">單題刪除（有條件）· Safe delete</h2>
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
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              已有 {question.answerHistoryCount} 筆答題紀錄引用此題，禁止刪除以保留訓練歷史。Delete disabled: referenced by{" "}
              {question.answerHistoryCount} answer record(s).
            </div>
          )}
        </AppCard>
      </div>
    </div>
  );
}