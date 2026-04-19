import { startTrainingSessionAction, submitTrainingAnswerAction } from "@/app/training/actions";
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
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Daily Training</h2>
        <p className="text-gray-500">
          Work through a short TOEIC set, record each answer, and save one basic study session result.
        </p>
      </div>

      {state.noticeMessage ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {state.noticeMessage}
        </div>
      ) : null}

      {state.status === "empty" ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
          <p className="text-lg font-medium text-gray-700 mb-2">No training questions are available.</p>
          <p className="text-sm">Run the seed script or import data before starting a session.</p>
        </div>
      ) : null}

      {state.status === "invalid" ? (
        <div className="space-y-5">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-lg font-medium text-gray-800 mb-2">The requested training session is invalid.</p>
            <p className="text-sm text-gray-500">{state.reason}</p>
          </div>

          <form action={startTrainingSessionAction}>
            <button
              type="submit"
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Start New Session
            </button>
          </form>
        </div>
      ) : null}

      {state.status === "idle" ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 mb-2">Ready to Practice</p>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Start a 5-question training run</h3>
              <p className="text-sm text-gray-500">
                The app will draw up to 5 unique questions from the current local question bank and save your answers
                into SQLite.
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
              {state.availableQuestionCount} question{state.availableQuestionCount === 1 ? "" : "s"} currently available
            </div>
          </div>

          <form action={startTrainingSessionAction} className="mt-6">
            <button
              type="submit"
              className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Start Training
            </button>
          </form>
        </div>
      ) : null}

      {state.status === "active" ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 mb-1">Question Progress</p>
              <h3 className="text-xl font-semibold text-gray-900">
                Question {state.questionNumber} of {state.totalQuestions}
              </h3>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
              Session #{state.sessionId}
            </div>
          </div>

          <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${(state.questionNumber / state.totalQuestions) * 100}%` }}
            />
          </div>

          <form action={submitTrainingAnswerAction} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
            <input type="hidden" name="sessionId" value={state.sessionId} />
            <input type="hidden" name="questionId" value={state.question.id} />
            <input type="hidden" name="questionIds" value={state.questionIdsParam} />

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                {state.question.topic}
              </span>
              <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                Difficulty {state.question.difficulty}
              </span>
            </div>

            <h4 className="text-lg font-semibold text-gray-900 leading-7 mb-6">{state.question.questionText}</h4>

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
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <input type="radio" name="selectedAnswer" value={key} className="mt-1 h-4 w-4 border-gray-300 text-blue-600" />
                  <span>
                    <span className="font-semibold mr-2">{key}.</span>
                    {value}
                  </span>
                </label>
              ))}
            </fieldset>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Submit Answer
              </button>

              <p className="text-sm text-gray-500">Answers are recorded immediately and the next question loads on submit.</p>
            </div>
          </form>
        </div>
      ) : null}

      {state.status === "completed" ? (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-green-600 mb-2">Session Complete</p>
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Basic training result</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="rounded-xl bg-gray-50 px-4 py-4">
                <p className="text-sm text-gray-500 mb-1">Total Questions</p>
                <p className="text-2xl font-semibold text-gray-900">{state.session.totalQuestions}</p>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-4">
                <p className="text-sm text-gray-500 mb-1">Correct Count</p>
                <p className="text-2xl font-semibold text-gray-900">{state.session.correctCount}</p>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-4">
                <p className="text-sm text-gray-500 mb-1">Accuracy</p>
                <p className="text-2xl font-semibold text-gray-900">{state.session.accuracy}%</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="rounded-xl border border-gray-200 px-4 py-3">
                <p className="font-medium text-gray-900 mb-1">Started</p>
                <p>{formatTimestamp(state.session.startedAt)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 px-4 py-3">
                <p className="font-medium text-gray-900 mb-1">Ended</p>
                <p>{formatTimestamp(state.session.endedAt)}</p>
              </div>
            </div>
          </div>

          <form action={startTrainingSessionAction}>
            <button
              type="submit"
              className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Start Another Session
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
