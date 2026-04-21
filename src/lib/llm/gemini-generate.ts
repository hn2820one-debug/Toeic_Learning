import "server-only";

import { getGoogleApiKey } from "./providers";
import {
  buildPart5GenerationPrompt,
  buildPart5GenerationV2Prompt,
  PART5_GENERATION_PROMPT_VERSION,
  PART5_GENERATION_V2_PROMPT_VERSION,
  type BuildPart5GenerationPromptInput,
  type BuildPart5GenerationV2PromptInput,
} from "./prompt-templates";
import type {
  LlmCallResult,
  Part5DistractorEntry,
  Part5DistractorType,
  Part5GeneratedItem,
  Part5GeneratedItemV2,
} from "./types";
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

export type GeneratePart5ItemV2WithGeminiInput = BuildPart5GenerationV2PromptInput & {
  temperature?: number;
  seed?: number;
};

export type GeneratePart5ItemV2WithGeminiResult = {
  parsedItem: Part5GeneratedItemV2;
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

// ─────────────────────────────────────────────────────────────────────────────
//  Reconciled v2 — generate a Part 5 item with full pedagogical payload
//  (coreRule / recognitionSignal / hint1-3 / distractorAnalysis per choice).
//  Mirrors `generatePart5ItemWithGemini` but uses `buildPart5GenerationV2Prompt`
//  and returns `Part5GeneratedItemV2` so callers can persist straight into
//  QuestionBankItem v2 columns.
// ─────────────────────────────────────────────────────────────────────────────

const DISTRACTOR_TYPES: readonly Part5DistractorType[] = [
  "correct",
  "part_of_speech_error",
  "tense_error",
  "collocation_error",
  "register_error",
  "form_confusion",
  "near_synonym",
  "false_friend",
  "plausible_wrong",
];

function buildResponseSchemaV2() {
  const distractorEntry = {
    type: "OBJECT",
    properties: {
      type: { type: "STRING", enum: [...DISTRACTOR_TYPES] },
      whyPlausible: { type: "STRING" },
      whyWrong: { type: "STRING" },
    },
    required: ["type", "whyPlausible", "whyWrong"],
  } as const;

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
      answer: { type: "STRING", enum: ["A", "B", "C", "D"] },
      targetSkillCode: { type: "STRING" },
      difficulty: { type: "STRING" },
      explanation_zh_hant: { type: "STRING" },
      coreRule: { type: "STRING" },
      recognitionSignal: { type: "STRING" },
      hint1: { type: "STRING" },
      hint2: { type: "STRING" },
      hint3: { type: "STRING" },
      distractorAnalysis: {
        type: "OBJECT",
        properties: {
          A: distractorEntry,
          B: distractorEntry,
          C: distractorEntry,
          D: distractorEntry,
        },
        required: ["A", "B", "C", "D"],
      },
    },
    required: [
      "stem",
      "choices",
      "answer",
      "targetSkillCode",
      "difficulty",
      "explanation_zh_hant",
      "coreRule",
      "recognitionSignal",
      "hint1",
      "hint2",
      "hint3",
      "distractorAnalysis",
    ],
  };
}

function parseDistractorEntry(value: unknown, label: string): Part5DistractorEntry {
  if (!value || typeof value !== "object") {
    throw new Error(`distractorAnalysis.${label} is missing.`);
  }
  const entry = value as Record<string, unknown>;
  const type = entry.type;
  if (typeof type !== "string" || !DISTRACTOR_TYPES.includes(type as Part5DistractorType)) {
    throw new Error(`distractorAnalysis.${label}.type is not a recognized distractor type.`);
  }
  if (typeof entry.whyPlausible !== "string" || typeof entry.whyWrong !== "string") {
    throw new Error(`distractorAnalysis.${label} whyPlausible/whyWrong must be strings.`);
  }
  return {
    type: type as Part5DistractorType,
    whyPlausible: entry.whyPlausible,
    whyWrong: entry.whyWrong,
  };
}

function parsePart5GeneratedItemV2(rawText: string): Part5GeneratedItemV2 {
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
  const distractor = item.distractorAnalysis as Record<string, unknown> | undefined;

  if (
    typeof item.stem !== "string" ||
    !choices ||
    typeof choices.A !== "string" ||
    typeof choices.B !== "string" ||
    typeof choices.C !== "string" ||
    typeof choices.D !== "string" ||
    (item.answer !== "A" && item.answer !== "B" && item.answer !== "C" && item.answer !== "D") ||
    typeof item.targetSkillCode !== "string" ||
    typeof item.difficulty !== "string" ||
    typeof item.explanation_zh_hant !== "string" ||
    typeof item.coreRule !== "string" ||
    typeof item.recognitionSignal !== "string" ||
    typeof item.hint1 !== "string" ||
    typeof item.hint2 !== "string" ||
    typeof item.hint3 !== "string" ||
    !distractor
  ) {
    throw new Error("Gemini returned JSON, but it did not match the Reconciled v2 Part 5 schema.");
  }

  return {
    stem: item.stem,
    choices: { A: choices.A, B: choices.B, C: choices.C, D: choices.D },
    answer: item.answer,
    targetSkillCode: item.targetSkillCode,
    difficulty: item.difficulty,
    explanation_zh_hant: item.explanation_zh_hant,
    coreRule: item.coreRule,
    recognitionSignal: item.recognitionSignal,
    hint1: item.hint1,
    hint2: item.hint2,
    hint3: item.hint3,
    distractorAnalysis: {
      A: parseDistractorEntry(distractor.A, "A"),
      B: parseDistractorEntry(distractor.B, "B"),
      C: parseDistractorEntry(distractor.C, "C"),
      D: parseDistractorEntry(distractor.D, "D"),
    },
  };
}

export async function generatePart5ItemV2WithGemini(
  input: GeneratePart5ItemV2WithGeminiInput,
): Promise<GeneratePart5ItemV2WithGeminiResult> {
  const startedAt = Date.now();
  const model = GEMINI_PART5_GENERATION_MODEL;
  const promptVersion = PART5_GENERATION_V2_PROMPT_VERSION;
  const temperature = input.temperature ?? DEFAULT_TEMPERATURE;

  let rawResponse: GeminiGenerateContentResponse | undefined;
  let rawText = "";
  let responseModel = model;
  let errorMessage: string | undefined;

  try {
    const apiKey = getGoogleApiKey();
    const { systemPrompt, userPrompt } = buildPart5GenerationV2Prompt(input);

    const response = await fetch(
      `${GEMINI_API_BASE_URL}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature,
            responseMimeType: "application/json",
            responseSchema: buildResponseSchemaV2(),
            ...(typeof input.seed === "number" ? { seed: input.seed } : {}),
          },
        }),
      },
    );

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
    const parsedItem = parsePart5GeneratedItemV2(rawText);
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

    return { parsedItem, rawText, rawResponse, promptVersion, callResult };
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
