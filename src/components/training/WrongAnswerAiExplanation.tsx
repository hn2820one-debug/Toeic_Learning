"use client";

import { useState } from "react";

type WrongAnswerAiExplanationProps = {
  sessionId: number;
  questionId: number;
  stem: string;
  choices: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: "A" | "B" | "C" | "D";
  userChoice: "A" | "B" | "C" | "D";
  grammarPoint?: string;
  explanationSnapshot?: string;
};

type ExplainWrongAnswerResponse =
  | {
      ok: true;
      explanationText: string;
    }
  | {
      ok: false;
      error: string;
    };

export default function WrongAnswerAiExplanation(props: WrongAnswerAiExplanationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);

  async function handleGenerateExplanation() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/llm/explain-wrong-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: props.sessionId,
          questionId: props.questionId,
          stem: props.stem,
          choices: props.choices,
          correctAnswer: props.correctAnswer,
          userChoice: props.userChoice,
          grammarPoint: props.grammarPoint,
          explanationSnapshot: props.explanationSnapshot,
        }),
      });

      const payload = (await response.json()) as ExplainWrongAnswerResponse;

      if (!response.ok || !payload.ok) {
        setExplanation(null);
        setError(payload.ok ? "AI explanation request failed." : payload.error);
        return;
      }

      setExplanation(payload.explanationText);
    } catch (requestError) {
      setExplanation(null);
      setError(requestError instanceof Error ? requestError.message : "AI explanation request failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleGenerateExplanation}
          disabled={isLoading}
          className="inline-flex items-center rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-800 hover:bg-violet-100 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Generating AI Explanation..." : explanation ? "Regenerate AI Explanation" : "Generate AI Explanation"}
        </button>
        <p className="text-sm text-gray-500">On-demand only. This does not change the saved question data.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800">{error}</div>
      ) : null}

      {explanation ? (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-4">
          <p className="text-sm font-medium text-violet-900 mb-2">AI Explanation</p>
          <p className="whitespace-pre-line text-sm leading-7 text-violet-900">{explanation}</p>
        </div>
      ) : null}
    </div>
  );
}
