import {
  startTrainingSessionAction,
  submitTrainingAnswerAction,
  submitTrainingRatingAction,
} from "@/app/training/actions";
import BilingualHeading from "@/components/ui/BilingualHeading";
import AppCard from "@/components/ui/AppCard";
import { primaryButtonClass } from "@/lib/ui/form-classes";
import WrongAnswerAiExplanation from "@/components/training/WrongAnswerAiExplanation";
import {
  getTrainingPageState,
  type TrainingPageSearchParams,
} from "@/lib/training";

export const dynamic = "force-dynamic";

type TrainingPageProps = {
  searchParams?: TrainingPageSearchParams;
};

function formatTimestamp(value: Date | null) {
  if (!value) {
    return "In progress";
  }

  return value.toLocaleString("en-US", {
    hour12: false,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function TrainingPage({ searchParams }: TrainingPageProps) {
  const state = await getTrainingPageState(searchParams);

  return (
    <div>
      <BilingualHeading
        titleZh="每日訓練"
        titleEn="Daily training"
        descriptionZh="完成短題組、記錄答案，並儲存一場基本學習紀錄。"
        descriptionEn="Work through a short set, log answers, and save one study session."
      />

      {state.noticeMessage ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {state.noticeMessage}
        </div>
      ) : null}

      {state.status === "empty" ? (
        <AppCard className="text-center">
          <p className="text-lg font-semibold text-slate-800">尚無可用題目 · No questions available</p>
          <p className="mt-2 text-sm text-slate-500">請先匯入或建立題目。Seed or import before starting.</p>
        </AppCard>
      ) : null}

      {state.status === "invalid" ? (
        <div className="space-y-5">
          <AppCard>
            <p className="text-lg font-semibold text-slate-900">無效的訓練場次 · Invalid session</p>
            <p className="mt-2 text-sm text-slate-600">{state.reason}</p>
          </AppCard>

          <form action={startTrainingSessionAction}>
            <button type="submit" className={primaryButtonClass}>
              開新場次 · New session
            </button>
          </form>
        </div>
      ) : null}

      {state.status === "idle" ? (
        <AppCard>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary-600">準備練習 · Ready</p>
              <h2 className="mb-2 text-xl font-semibold text-slate-900">五題一組 · 5-question run</h2>
              <p className="text-sm text-slate-600">
                從題庫抽取最多 5 題，答題寫入本機。Up to 5 unique questions; answers saved locally.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 shadow-sm">
              可用 {state.availableQuestionCount} 題 · {state.availableQuestionCount === 1 ? "question" : "questions"}{" "}
              available
            </div>
          </div>

          <form action={startTrainingSessionAction} className="mt-6">
            <button type="submit" className={primaryButtonClass}>
              開始訓練 · Start
            </button>
          </form>
        </AppCard>
      ) : null}

      {state.status === "active" ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary-600">
                作答進度 · Question progress
              </p>
              <h3 className="text-xl font-semibold text-slate-900">
                第 {state.questionNumber} / {state.totalQuestions} 題
                <span className="ml-2 text-sm font-medium text-slate-500">
                  Question {state.questionNumber} of {state.totalQuestions}
                </span>
              </h3>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
              場次 · Session #{state.sessionId}
            </div>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-700 transition-all"
              style={{ width: `${(state.questionNumber / state.totalQuestions) * 100}%` }}
            />
          </div>

          <form
            action={submitTrainingAnswerAction}
            className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-card md:p-8"
          >
            <input type="hidden" name="sessionId" value={state.sessionId} />
            <input type="hidden" name="sessionQuestionId" value={state.sessionQuestionId} />
            <input type="hidden" name="questionId" value={state.question.id} />

            <div className="mb-4 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 ring-1 ring-primary-200">
                主題 · {state.question.topic}
              </span>
              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                難度 · Lv {state.question.difficulty}
              </span>
            </div>

            <h4 className="mb-6 text-lg font-semibold leading-7 text-slate-900">{state.question.questionText}</h4>

            <fieldset className="space-y-3">
              <legend className="sr-only">Answer choices</legend>

              {([
                ["A", state.question.optionA],
                ["B", state.question.optionB],
                ["C", state.question.optionC],
                ["D", state.question.optionD],
              ] as const).map(([key, value]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 transition-colors hover:border-primary-400 hover:bg-primary-50/60 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 has-[:checked]:ring-1 has-[:checked]:ring-primary-300"
                >
                  <input
                    type="radio"
                    name="selectedAnswer"
                    value={key}
                    className="mt-1 h-4 w-4 border-slate-300 text-primary-600"
                  />
                  <span>
                    <span className="mr-2 font-semibold">{key}.</span>
                    {value}
                  </span>
                </label>
              ))}
            </fieldset>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button type="submit" className={primaryButtonClass}>
                送出答案 · Submit answer
              </button>

              <p className="text-sm text-slate-500">
                送出後顯示解析與評分 · Pick an answer to see explanation and rating.
              </p>
            </div>
          </form>
        </div>
      ) : null}

      {state.status === "reveal" ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary-600">
                解析與評分 · Answer review
              </p>
              <h3 className="text-xl font-semibold text-slate-900">
                第 {state.questionNumber} / {state.totalQuestions} 題
                <span className="ml-2 text-sm font-medium text-slate-500">
                  Question {state.questionNumber} of {state.totalQuestions}
                </span>
              </h3>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
              場次 · Session #{state.sessionId}
            </div>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-700 transition-all"
              style={{ width: `${(state.questionNumber / state.totalQuestions) * 100}%` }}
            />
          </div>

          <div className="space-y-6 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-card md:p-8">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 ring-1 ring-primary-200">
                主題 · {state.question.topic}
              </span>
              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                難度 · Lv {state.question.difficulty}
              </span>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                  state.isCorrect
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                    : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                }`}
              >
                {state.isCorrect ? "✓ 正確 · Correct" : "✗ 錯誤 · Incorrect"}
              </span>
            </div>

            <div>
              <h4 className="text-lg font-semibold leading-7 text-slate-900">{state.question.questionText}</h4>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm text-slate-700 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  你的答案 · Your answer
                </p>
                <p className="text-base font-semibold text-slate-900">{state.userChoice}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  正確答案 · Correct answer
                </p>
                <p className="text-base font-semibold text-emerald-700">{state.question.correctAnswer}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  作答秒數 · Time taken
                </p>
                <p className="text-base font-semibold text-slate-900">{state.timeTakenSec ?? 0}s</p>
              </div>
            </div>

            {state.question.explanation ? (
              <div className="rounded-xl border border-primary-100 bg-primary-50 px-4 py-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary-700">
                  解析 · Explanation
                </p>
                <p className="text-sm leading-relaxed text-primary-900">{state.question.explanation}</p>
              </div>
            ) : null}

            {!state.isCorrect ? (
              <WrongAnswerAiExplanation
                sessionId={state.sessionId}
                questionId={state.question.id}
                stem={state.question.questionText}
                choices={{
                  A: state.question.optionA,
                  B: state.question.optionB,
                  C: state.question.optionC,
                  D: state.question.optionD,
                }}
                correctAnswer={state.question.correctAnswer as "A" | "B" | "C" | "D"}
                userChoice={state.userChoice}
                explanationSnapshot={state.question.explanation ?? undefined}
              />
            ) : null}

            <form action={submitTrainingRatingAction} className="space-y-3">
              <input type="hidden" name="sessionQuestionId" value={state.sessionQuestionId} />
              <input type="hidden" name="userChoice" value={state.userChoice} />
              <input type="hidden" name="timeTakenSec" value={state.timeTakenSec ?? ""} />

              <div>
                <p className="mb-1 text-base font-semibold text-slate-900">這題對你來說有多難？</p>
                <p className="text-sm text-slate-500">
                  How difficult did that feel? — 選一個評分以記錄並進入下一題。
                </p>
              </div>

              {(() => {
                const ratingMeta: Record<
                  "Again" | "Hard" | "Good" | "Easy",
                  { zh: string; ring: string }
                > = {
                  Again: { zh: "重來 · Again", ring: "hover:border-rose-400 hover:bg-rose-50" },
                  Hard: { zh: "困難 · Hard", ring: "hover:border-amber-400 hover:bg-amber-50" },
                  Good: { zh: "通過 · Good", ring: "hover:border-primary-400 hover:bg-primary-50" },
                  Easy: { zh: "輕鬆 · Easy", ring: "hover:border-emerald-400 hover:bg-emerald-50" },
                };
                return (
                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    {(["Again", "Hard", "Good", "Easy"] as const).map((rating) => (
                      <button
                        key={rating}
                        type="submit"
                        name="rating"
                        value={rating}
                        className={`rounded-xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition-colors ${ratingMeta[rating].ring}`}
                      >
                        <span className="block text-sm font-semibold text-slate-900">
                          {ratingMeta[rating].zh}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          下次複習：{state.intervalPreviews[rating].label}
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </form>
          </div>
        </div>
      ) : null}

      {state.status === "completed" ? (
        <div className="space-y-6">
          <AppCard accent="emerald">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">
              場次完成 · Session done
            </p>
            <h2 className="mb-6 text-2xl font-semibold text-slate-900">本次結果 · Result</h2>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  總題數 · Total questions
                </p>
                <p className="text-2xl font-bold text-slate-900">{state.session.totalQuestions}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  正確題數 · Correct count
                </p>
                <p className="text-2xl font-bold text-emerald-900">{state.session.correctCount}</p>
              </div>
              <div className="rounded-xl border border-primary-200 bg-primary-50 px-4 py-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary-700">
                  正確率 · Accuracy
                </p>
                <p className="text-2xl font-bold text-primary-900">{state.session.accuracy}%</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 text-sm text-slate-700 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  開始時間 · Started
                </p>
                <p className="font-medium text-slate-900">{formatTimestamp(state.session.startedAt)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  結束時間 · Ended
                </p>
                <p className="font-medium text-slate-900">{formatTimestamp(state.session.endedAt)}</p>
              </div>
            </div>
          </AppCard>

          <form action={startTrainingSessionAction}>
            <button type="submit" className={primaryButtonClass}>
              再開一場 · Another session
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
