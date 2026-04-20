import "server-only";

import { TASK_PROMPT_VERSIONS, safeParseWrongAnswerExplanationText } from "./contracts";
import { buildWrongAnswerExplanationFallback } from "./deterministic-fallbacks";
import type { LlmCallResult } from "./types";
import { logLlmUsage } from "./usage-log";

export const CLAUDE_HAIKU_WRONG_ANSWER_MODEL = "claude-haiku-4-5";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_TEMPERATURE = 0.4;
const SIMPLIFIED_CHINESE_REGEX =
  /[这们为么应开关问题项验仅体并从业发后会说话种还过这边进远关复杂级简难点样门报读写错]/;

export type WrongAnswerExplanationResult = {
  explanationText: string;
  fallbackUsed: boolean;
};

export type WrongAnswerExplanationInput = {
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
  questionId?: number | string;
  sessionId?: number | string;
  temperature?: number;
};

type AnthropicUsage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

type AnthropicContentBlock = {
  type?: string;
  text?: string;
};

type AnthropicMessageResponse = {
  id?: string;
  model?: string;
  content?: AnthropicContentBlock[];
  usage?: AnthropicUsage;
  error?: {
    message?: string;
    type?: string;
  };
};

class WrongAnswerExplanationError extends Error {
  status: number;
  rawResponse?: AnthropicMessageResponse;
  rawText?: string;
  callResult?: LlmCallResult;

  constructor(
    message: string,
    options?: {
      status?: number;
      rawResponse?: AnthropicMessageResponse;
      rawText?: string;
      callResult?: LlmCallResult;
    },
  ) {
    super(message);
    this.name = "WrongAnswerExplanationError";
    this.status = options?.status ?? 500;
    this.rawResponse = options?.rawResponse;
    this.rawText = options?.rawText;
    this.callResult = options?.callResult;
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function containsSimplifiedChinese(text: string) {
  return SIMPLIFIED_CHINESE_REGEX.test(text);
}

function getAnthropicApiErrorMessage(status: number, payload: AnthropicMessageResponse | undefined) {
  const detail = payload?.error?.message?.trim();
  return detail ? `Claude request failed (${status}): ${detail}` : `Claude request failed with HTTP ${status}.`;
}

function extractClaudeText(response: AnthropicMessageResponse) {
  const rawText =
    response.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("")
      .trim() ?? "";

  if (!rawText) {
    throw new Error("Claude response did not include text output.");
  }

  return rawText;
}

function buildSystemPrompt(retryForTraditionalChinese: boolean) {
  return `
你是 TOEIC 英文老師。
你必須全程使用繁體中文（台灣用字），絕對不要使用簡體字。
請只輸出純文字，不要使用 JSON，不要用 markdown code fence。

你必須固定分成五段，而且每段都要有清楚小標：
1. 正解為何正確
2. 你選的為何錯
3. 背後規則
4. 類似陷阱
5. 鼓勵

每段請用 2-4 句，內容要具體、友善、適合 TOEIC 學習者。
${retryForTraditionalChinese ? "你上一次的回覆含有疑似簡體字。這一次請嚴格只用繁體中文（台灣用字）重寫。" : ""}
`.trim();
}

function buildUserPrompt(input: WrongAnswerExplanationInput) {
  return `
請解釋以下錯題，重點是幫助學生理解為何答錯。

stem:
${input.stem}

choices:
A. ${input.choices.A}
B. ${input.choices.B}
C. ${input.choices.C}
D. ${input.choices.D}

correctAnswer: ${input.correctAnswer}
userChoice: ${input.userChoice}
grammarPoint: ${input.grammarPoint ?? "未提供"}
originalExplanation: ${input.explanationSnapshot?.trim() || "未提供"}

請只輸出五段繁體中文說明本文，不要補充其他格式。
`.trim();
}

function getUsageNumbers(response: AnthropicMessageResponse | undefined) {
  return {
    promptTokens: response?.usage?.input_tokens ?? 0,
    completionTokens: response?.usage?.output_tokens ?? 0,
    cachedTokens: response?.usage?.cache_read_input_tokens ?? 0,
    cacheWriteTokens: response?.usage?.cache_creation_input_tokens ?? 0,
  };
}

async function callAnthropicForExplanation(
  input: WrongAnswerExplanationInput,
  retryForTraditionalChinese: boolean,
  apiKey: string,
) {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      model: CLAUDE_HAIKU_WRONG_ANSWER_MODEL,
      max_tokens: 900,
      temperature: input.temperature ?? DEFAULT_TEMPERATURE,
      system: buildSystemPrompt(retryForTraditionalChinese),
      messages: [
        {
          role: "user",
          content: buildUserPrompt(input),
        },
      ],
    }),
  });

  const responseText = await response.text();
  let rawResponse: AnthropicMessageResponse | undefined;

  try {
    rawResponse = responseText.trim() ? (JSON.parse(responseText) as AnthropicMessageResponse) : {};
  } catch {
    throw new Error(`Claude returned a non-JSON HTTP body: ${responseText.slice(0, 200)}`);
  }

  if (!response.ok) {
    throw new WrongAnswerExplanationError(getAnthropicApiErrorMessage(response.status, rawResponse), {
      status: response.status,
      rawResponse,
    });
  }

  return {
    rawResponse,
    rawText: extractClaudeText(rawResponse),
    model: rawResponse.model ?? CLAUDE_HAIKU_WRONG_ANSWER_MODEL,
  };
}

export async function generateWrongAnswerExplanation(input: WrongAnswerExplanationInput): Promise<WrongAnswerExplanationResult> {
  const startedAt = Date.now();
  const promptVersion = TASK_PROMPT_VERSIONS.wrongAnswerExplain;
  const temperature = input.temperature ?? DEFAULT_TEMPERATURE;

  if (input.userChoice === input.correctAnswer) {
    throw new Error("Wrong-answer explanation requires userChoice to be different from correctAnswer.");
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    const latencyMs = Date.now() - startedAt;
    await logLlmUsage({
      taskType: "explain",
      provider: "anthropic",
      model: CLAUDE_HAIKU_WRONG_ANSWER_MODEL,
      promptVersion,
      promptTokens: 0,
      completionTokens: 0,
      cachedTokens: 0,
      cacheWriteTokens: 0,
      costUsd: 0,
      latencyMs,
      success: false,
      errorMessage: "ANTHROPIC_API_KEY is not set.",
      questionId: input.questionId,
      sessionId: input.sessionId,
      temperature,
    });
    return { explanationText: buildWrongAnswerExplanationFallback(input), fallbackUsed: true };
  }

  let promptTokens = 0;
  let completionTokens = 0;
  let cachedTokens = 0;
  let cacheWriteTokens = 0;
  let lastModel = CLAUDE_HAIKU_WRONG_ANSWER_MODEL;

  try {
    for (const retryForTraditionalChinese of [false, true]) {
      const attempt = await callAnthropicForExplanation(input, retryForTraditionalChinese, apiKey);
      const usage = getUsageNumbers(attempt.rawResponse);

      promptTokens += usage.promptTokens;
      completionTokens += usage.completionTokens;
      cachedTokens += usage.cachedTokens;
      cacheWriteTokens += usage.cacheWriteTokens;
      lastModel = attempt.model;

      if (containsSimplifiedChinese(attempt.rawText)) {
        continue;
      }

      const validated = safeParseWrongAnswerExplanationText(attempt.rawText);
      if (validated.ok) {
        const latencyMs = Date.now() - startedAt;

        await logLlmUsage({
          taskType: "explain",
          provider: "anthropic",
          model: lastModel,
          promptVersion,
          promptTokens,
          completionTokens,
          cachedTokens,
          cacheWriteTokens,
          costUsd: 0,
          latencyMs,
          success: true,
          questionId: input.questionId,
          sessionId: input.sessionId,
          temperature,
        });

        return { explanationText: validated.data, fallbackUsed: false };
      }

      const latencyMs = Date.now() - startedAt;
      await logLlmUsage({
        taskType: "explain",
        provider: "anthropic",
        model: lastModel,
        promptVersion,
        promptTokens,
        completionTokens,
        cachedTokens,
        cacheWriteTokens,
        costUsd: 0,
        latencyMs,
        success: false,
        errorMessage: `Output contract failed: ${validated.error}`,
        questionId: input.questionId,
        sessionId: input.sessionId,
        temperature,
      });
      return { explanationText: buildWrongAnswerExplanationFallback(input), fallbackUsed: true };
    }

    const latencyMs = Date.now() - startedAt;
    await logLlmUsage({
      taskType: "explain",
      provider: "anthropic",
      model: lastModel,
      promptVersion,
      promptTokens,
      completionTokens,
      cachedTokens,
      cacheWriteTokens,
      costUsd: 0,
      latencyMs,
      success: false,
      errorMessage: "Explanation output still contained simplified Chinese after one retry.",
      questionId: input.questionId,
      sessionId: input.sessionId,
      temperature,
    });
    return { explanationText: buildWrongAnswerExplanationFallback(input), fallbackUsed: true };
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    const latencyMs = Date.now() - startedAt;

    await logLlmUsage({
      taskType: "explain",
      provider: "anthropic",
      model: lastModel,
      promptVersion,
      promptTokens,
      completionTokens,
      cachedTokens,
      cacheWriteTokens,
      costUsd: 0,
      latencyMs,
      success: false,
      errorMessage,
      questionId: input.questionId,
      sessionId: input.sessionId,
      temperature,
    });

    return { explanationText: buildWrongAnswerExplanationFallback(input), fallbackUsed: true };
  }
}

export { WrongAnswerExplanationError };
