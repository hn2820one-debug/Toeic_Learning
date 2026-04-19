import "server-only";

import { getGoogleApiKey } from "./providers";
import {
  buildPart5GenerationPrompt,
  PART5_GENERATION_PROMPT_VERSION,
  type BuildPart5GenerationPromptInput,
} from "./prompt-templates";
import type { LlmCallResult, Part5GeneratedItem } from "./types";
import { logLlmUsage } from "./usage-log";

export const GEMINI_PART5_GENERATION_MODEL = "gemini-2.5-flash";
const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_TEMPERATURE = 0.7;

type GeminiUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  cachedContentTokenCount?: number;
};

type GeminiCandidate = {
  content?: {
    parts?: Array<{
      text?: string;
    }>;
  };
  finishReason?: string;
};

type GeminiErrorPayload = {
  error?: {
    message?: string;
    status?: string;
    code?: number;
  };
};

type GeminiGenerateContentResponse = GeminiErrorPayload & {
  candidates?: GeminiCandidate[];
  usageMetadata?: GeminiUsageMetadata;
  modelVersion?: string;
};

export type GeneratePart5ItemWithGeminiInput = BuildPart5GenerationPromptInput & {
  temperature?: number;
  seed?: number;
};

export type GeneratePart5ItemWithGeminiResult = {
  parsedItem: Part5GeneratedItem;
  rawText: string;
  rawResponse: GeminiGenerateContentResponse;
  promptVersion: string;
  callResult: LlmCallResult;
};

export class GeminiGenerationError extends Error {
  status: number;
  rawResponse?: GeminiGenerateContentResponse;
  rawText?: string;
  callResult?: LlmCallResult;

  constructor(
    message: string,
    options?: {
      status?: number;
      rawResponse?: GeminiGenerateContentResponse;
      rawText?: string;
      callResult?: LlmCallResult;
    },
  ) {
    super(message);
    this.name = "GeminiGenerationError";
    this.status = options?.status ?? 500;
    this.rawResponse = options?.rawResponse;
    this.rawText = options?.rawText;
    this.callResult = options?.callResult;
  }
}

function buildResponseSchema() {
  return {
    type: "OBJECT",
    properties: {
      stem: { type: "STRING" },
      choices: {
        type: "OBJECT",
        properties: {
          A: { type: "STRING" },
          B: { type: "STRING" },
          C: { type: "STRING" },
          D: { type: "STRING" },
        },
        required: ["A", "B", "C", "D"],
      },
      answer: {
        type: "STRING",
        enum: ["A", "B", "C", "D"],
      },
      grammar_point: { type: "STRING" },
      difficulty: { type: "STRING" },
      explanation_zh_hant: { type: "STRING" },
    },
    required: ["stem", "choices", "answer", "grammar_point", "difficulty", "explanation_zh_hant"],
  };
}

function extractUsageMetadata(response: GeminiGenerateContentResponse | undefined) {
  return {
    promptTokens: response?.usageMetadata?.promptTokenCount ?? 0,
    completionTokens: response?.usageMetadata?.candidatesTokenCount ?? 0,
    cachedTokens: response?.usageMetadata?.cachedContentTokenCount ?? 0,
    cacheWriteTokens: 0,
  };
}

function extractGeminiText(response: GeminiGenerateContentResponse) {
  const rawText =
    response.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("")
      .trim() ?? "";

  if (!rawText) {
    throw new Error("Gemini response did not include candidate text.");
  }

  return rawText;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function parsePart5GeneratedItem(rawText: string): Part5GeneratedItem {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(`Gemini returned non-JSON text: ${rawText.slice(0, 200)}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Gemini returned JSON, but the top-level value was not an object.");
  }

  const item = parsed as Record<string, unknown>;
  const choices = item.choices as Record<string, unknown> | undefined;

  if (
    typeof item.stem !== "string" ||
    !choices ||
    typeof choices.A !== "string" ||
    typeof choices.B !== "string" ||
    typeof choices.C !== "string" ||
    typeof choices.D !== "string" ||
    (item.answer !== "A" && item.answer !== "B" && item.answer !== "C" && item.answer !== "D") ||
    typeof item.grammar_point !== "string" ||
    typeof item.difficulty !== "string" ||
    typeof item.explanation_zh_hant !== "string"
  ) {
    throw new Error("Gemini returned JSON, but it did not match the required Part 5 schema.");
  }

  return {
    stem: item.stem,
    choices: {
      A: choices.A,
      B: choices.B,
      C: choices.C,
      D: choices.D,
    },
    answer: item.answer,
    grammar_point: item.grammar_point,
    difficulty: item.difficulty,
    explanation_zh_hant: item.explanation_zh_hant,
  };
}

function createCallResult(input: {
  success: boolean;
  text: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  cacheWriteTokens: number;
  latencyMs: number;
  errorMessage?: string;
}): LlmCallResult {
  return {
    success: input.success,
    text: input.text,
    model: input.model,
    provider: "google",
    promptTokens: input.promptTokens,
    completionTokens: input.completionTokens,
    cachedTokens: input.cachedTokens,
    cacheWriteTokens: input.cacheWriteTokens,
    latencyMs: input.latencyMs,
    errorMessage: input.errorMessage,
  };
}

function getGeminiApiErrorMessage(status: number, payload: GeminiGenerateContentResponse | undefined) {
  const detail = payload?.error?.message?.trim();
  return detail ? `Gemini request failed (${status}): ${detail}` : `Gemini request failed with HTTP ${status}.`;
}

export async function generatePart5ItemWithGemini(
  input: GeneratePart5ItemWithGeminiInput,
): Promise<GeneratePart5ItemWithGeminiResult> {
  const startedAt = Date.now();
  const model = GEMINI_PART5_GENERATION_MODEL;
  const promptVersion = PART5_GENERATION_PROMPT_VERSION;
  const temperature = input.temperature ?? DEFAULT_TEMPERATURE;

  let rawResponse: GeminiGenerateContentResponse | undefined;
  let rawText = "";
  let responseModel = model;
  let errorMessage: string | undefined;

  try {
    const apiKey = getGoogleApiKey();
    const { systemPrompt, userPrompt } = buildPart5GenerationPrompt(input);

    const response = await fetch(`${GEMINI_API_BASE_URL}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          role: "system",
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature,
          responseMimeType: "application/json",
          responseSchema: buildResponseSchema(),
          ...(typeof input.seed === "number" ? { seed: input.seed } : {}),
        },
      }),
    });

    const responseText = await response.text();

    try {
      rawResponse = responseText.trim() ? (JSON.parse(responseText) as GeminiGenerateContentResponse) : {};
    } catch {
      throw new Error(`Gemini returned a non-JSON HTTP body: ${responseText.slice(0, 200)}`);
    }

    responseModel = rawResponse.modelVersion ?? model;

    if (!response.ok) {
      throw new GeminiGenerationError(getGeminiApiErrorMessage(response.status, rawResponse), {
        status: response.status,
        rawResponse,
      });
    }

    rawText = extractGeminiText(rawResponse);
    const parsedItem = parsePart5GeneratedItem(rawText);
    const usage = extractUsageMetadata(rawResponse);
    const latencyMs = Date.now() - startedAt;
    const callResult = createCallResult({
      success: true,
      text: rawText,
      model: responseModel,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      cachedTokens: usage.cachedTokens,
      cacheWriteTokens: usage.cacheWriteTokens,
      latencyMs,
    });

    await logLlmUsage({
      taskType: "generate",
      provider: "google",
      model: responseModel,
      promptVersion,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      cachedTokens: usage.cachedTokens,
      cacheWriteTokens: usage.cacheWriteTokens,
      costUsd: 0,
      latencyMs,
      success: true,
      temperature,
      seed: input.seed,
    });

    return {
      parsedItem,
      rawText,
      rawResponse,
      promptVersion,
      callResult,
    };
  } catch (error) {
    errorMessage = getErrorMessage(error);
    const usage = extractUsageMetadata(rawResponse);
    const latencyMs = Date.now() - startedAt;
    const callResult = createCallResult({
      success: false,
      text: rawText,
      model: responseModel,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      cachedTokens: usage.cachedTokens,
      cacheWriteTokens: usage.cacheWriteTokens,
      latencyMs,
      errorMessage,
    });

    await logLlmUsage({
      taskType: "generate",
      provider: "google",
      model: responseModel,
      promptVersion,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      cachedTokens: usage.cachedTokens,
      cacheWriteTokens: usage.cacheWriteTokens,
      costUsd: 0,
      latencyMs,
      success: false,
      errorMessage,
      temperature,
      seed: input.seed,
    });

    if (error instanceof GeminiGenerationError) {
      error.callResult = error.callResult ?? callResult;
      error.rawResponse = error.rawResponse ?? rawResponse;
      error.rawText = error.rawText ?? rawText;
      throw error;
    }

    throw new GeminiGenerationError(errorMessage, {
      status: 500,
      rawResponse,
      rawText,
      callResult,
    });
  }
}
