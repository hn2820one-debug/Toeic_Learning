import "server-only";

import { getAnthropicApiKey } from "./providers";
import type { LlmCallResult, Part5GeneratedItemV2 } from "./types";
import { logLlmUsage } from "./usage-log";
import { CLAUDE_PART5_VERIFIER_MODEL, ClaudeVerificationError } from "./claude-verify";

export const PART5_V2_VERIFICATION_PROMPT_VERSION = "part5-verify-v2-reconciled";

/** Value for QuestionBankItem.verifiedBy when this verifier approved the row. */
export const PART5_V2_VERIFIER_DB_LABEL = `${CLAUDE_PART5_VERIFIER_MODEL}:${PART5_V2_VERIFICATION_PROMPT_VERSION}`;

/** Minimum score (0–1) required when `pass` is true — catches inconsistent model output. */
export const PART5_V2_VERIFY_MIN_SCORE = 0.45;

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_TEMPERATURE = 0.2;

/** Verifier input — pedagogical Part 5 v2 payload (matches persisted QuestionBankItem teaching fields). */
export type VerifyPart5V2Input = {
  stem: string;
  choices: { A: string; B: string; C: string; D: string };
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
  primaryLearningSkillCode: string;
  coreRule: string;
  recognitionSignal: string;
  hint1: string;
  hint2: string;
  hint3: string;
  distractorAnalysis: Part5GeneratedItemV2["distractorAnalysis"];
};

export type VerifyPart5V2Normalized = {
  coreRule?: string;
  recognitionSignal?: string;
  hint1?: string;
  hint2?: string;
  hint3?: string;
  explanation?: string;
};

export type VerifyPart5V2Result = {
  pass: boolean;
  score: number;
  reason: string;
  normalized?: VerifyPart5V2Normalized;
};

export type VerifyPart5V2WithClaudeResult = {
  result: VerifyPart5V2Result;
  rawText: string;
  promptVersion: string;
  callResult: LlmCallResult;
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
  error?: { message?: string; type?: string };
};

const SIMPLIFIED_CHINESE_REGEX =
  /[这们为为么应开关问题项验仅体并从业发后会说话种还过这边进远关复杂级简难点样门报读写错误]/;

function stripOptionalMarkdownJsonFence(text: string) {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n?```/i);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return trimmed;
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

function extractUsageMetadata(response: AnthropicMessageResponse | undefined) {
  return {
    promptTokens: response?.usage?.input_tokens ?? 0,
    completionTokens: response?.usage?.output_tokens ?? 0,
    cachedTokens: response?.usage?.cache_read_input_tokens ?? 0,
    cacheWriteTokens: response?.usage?.cache_creation_input_tokens ?? 0,
  };
}

function detectSimplifiedChinese(text: string) {
  return SIMPLIFIED_CHINESE_REGEX.test(text);
}

function parseVerifyPart5V2Result(rawText: string): VerifyPart5V2Result {
  const jsonPayload = stripOptionalMarkdownJsonFence(rawText);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonPayload);
  } catch {
    throw new Error(`Claude returned non-JSON text: ${rawText.slice(0, 200)}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Verifier JSON root must be an object.");
  }

  const o = parsed as Record<string, unknown>;

  if (typeof o.pass !== "boolean" || typeof o.score !== "number" || !Number.isFinite(o.score) || typeof o.reason !== "string") {
    throw new Error("Verifier JSON must include pass (boolean), score (number), reason (string).");
  }

  const score = Math.min(1, Math.max(0, o.score));
  let pass = o.pass;
  let reason = o.reason.trim();

  const normRaw = o.normalized;
  let normalized: VerifyPart5V2Normalized | undefined;

  if (normRaw !== undefined && normRaw !== null) {
    if (typeof normRaw !== "object") {
      throw new Error("normalized must be an object when present.");
    }
    const n = normRaw as Record<string, unknown>;
    const pick = (k: string) => (typeof n[k] === "string" ? (n[k] as string).trim() : undefined);
    normalized = {
      coreRule: pick("coreRule"),
      recognitionSignal: pick("recognitionSignal"),
      hint1: pick("hint1"),
      hint2: pick("hint2"),
      hint3: pick("hint3"),
      explanation: pick("explanation"),
    };
    const keys = Object.keys(normalized).filter((k) => normalized![k as keyof VerifyPart5V2Normalized] !== undefined);
    if (keys.length === 0) {
      normalized = undefined;
    }
  }

  const zhCheck = (label: string, s?: string) => {
    if (s && detectSimplifiedChinese(s)) {
      pass = false;
      reason = `${reason} [auto: ${label} 含疑似簡體字，已標記為不通過。]`;
    }
  };

  zhCheck("reason", reason);
  if (normalized) {
    zhCheck("normalized.explanation", normalized.explanation);
    zhCheck("normalized.coreRule", normalized.coreRule);
    zhCheck("normalized.recognitionSignal", normalized.recognitionSignal);
    zhCheck("normalized.hint1", normalized.hint1);
    zhCheck("normalized.hint2", normalized.hint2);
    zhCheck("normalized.hint3", normalized.hint3);
  }

  return { pass, score, reason, normalized };
}

function buildVerificationPrompt(input: VerifyPart5V2Input) {
  const systemPrompt = `
You are a strict TOEIC Part 5 quality reviewer for a production question bank with teaching metadata.

Evaluate the FULL payload: stem, choices, answer, explanation (Traditional Chinese), the target skill code,
coreRule, recognitionSignal, three-tier hints, and per-option distractorAnalysis.

Rules:
1. Grammatically, inserting the chosen answer into the stem must yield a correct, natural business-English sentence.
2. Exactly one correct answer among A–D; distractors must be wrong for clear, defensible reasons matching distractorAnalysis.
3. distractorAnalysis must label the correct option with type "correct"; wrong options must not use "correct".
4. Hints must escalate gently → stronger without revealing the letter (A/B/C/D) of the answer.
5. coreRule and recognitionSignal must be concise Traditional Chinese (繁體); same for explanation and hint text.
6. Content must align with primaryLearningSkillCode (the skill being tested).

Output strict JSON only. No markdown fences. No commentary.

Schema:
{
  "pass": boolean,
  "score": number,
  "reason": string,
  "normalized": {
    "coreRule": string (optional),
    "recognitionSignal": string (optional),
    "hint1": string (optional),
    "hint2": string (optional),
    "hint3": string (optional),
    "explanation": string (optional)
  }
}

- score: 0.0–1.0 overall quality (grammar + pedagogy + consistency). If pass is false, score should usually be < 0.6.
- reason: Traditional Chinese, concise; list concrete issues if pass is false.
- normalized: ONLY include fields you would lightly polish (typos, 繁體 consistency, wording). Omit the key entirely if nothing to change.
`.trim();

  const userPrompt = `
Review this Part 5 v2 item:

${JSON.stringify(input, null, 2)}
`.trim();

  return { systemPrompt, userPrompt };
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
    provider: "anthropic",
    promptTokens: input.promptTokens,
    completionTokens: input.completionTokens,
    cachedTokens: input.cachedTokens,
    cacheWriteTokens: input.cacheWriteTokens,
    latencyMs: input.latencyMs,
    errorMessage: input.errorMessage,
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

/** Build verifier input from a generated v2 item + authoritative skill code. */
export function part5V2ToVerifyInput(item: Part5GeneratedItemV2, primaryLearningSkillCode: string): VerifyPart5V2Input {
  return {
    stem: item.stem,
    choices: item.choices,
    correctAnswer: item.answer,
    explanation: item.explanation_zh_hant,
    primaryLearningSkillCode,
    coreRule: item.coreRule,
    recognitionSignal: item.recognitionSignal,
    hint1: item.hint1,
    hint2: item.hint2,
    hint3: item.hint3,
    distractorAnalysis: item.distractorAnalysis,
  };
}

/**
 * Full v2 verifier: grammar + pedagogy + optional Traditional Chinese touch-ups in \`normalized\`.
 * Reuses Anthropic wiring pattern from \`claude-verify.ts\` but does not alter the v1 API surface.
 */
export async function verifyPart5V2WithClaude(
  input: VerifyPart5V2Input,
  options?: { temperature?: number },
): Promise<VerifyPart5V2WithClaudeResult> {
  const startedAt = Date.now();
  const model = CLAUDE_PART5_VERIFIER_MODEL;
  const promptVersion = PART5_V2_VERIFICATION_PROMPT_VERSION;
  const temperature = options?.temperature ?? DEFAULT_TEMPERATURE;

  let rawResponse: AnthropicMessageResponse | undefined;
  let rawText = "";
  let responseModel = model;
  let errorMessage: string | undefined;

  try {
    const apiKey = getAnthropicApiKey();
    const { systemPrompt, userPrompt } = buildVerificationPrompt(input);

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        temperature,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const responseText = await response.text();
    try {
      rawResponse = responseText.trim() ? (JSON.parse(responseText) as AnthropicMessageResponse) : {};
    } catch {
      throw new Error(`Claude returned a non-JSON HTTP body: ${responseText.slice(0, 200)}`);
    }

    responseModel = rawResponse.model ?? model;

    if (!response.ok) {
      const detail = rawResponse.error?.message?.trim();
      throw new ClaudeVerificationError(detail ? `Claude request failed (${response.status}): ${detail}` : `Claude request failed with HTTP ${response.status}.`, {
        status: response.status,
        rawResponse,
      });
    }

    rawText = extractClaudeText(rawResponse);
    const result = parseVerifyPart5V2Result(rawText);
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
      taskType: "verify",
      provider: "anthropic",
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
    });

    return { result, rawText, promptVersion, callResult };
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
      taskType: "verify",
      provider: "anthropic",
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
    });

    if (error instanceof ClaudeVerificationError) {
      error.callResult = error.callResult ?? callResult;
      error.rawResponse = error.rawResponse ?? rawResponse;
      error.rawText = error.rawText ?? rawText;
      throw error;
    }

    throw new ClaudeVerificationError(errorMessage, {
      status: 500,
      rawResponse,
      rawText,
      callResult,
    });
  }
}

/** Whether verifier output clears the bar for persistence (after optional structural gate). */
export function isVerifyPart5V2Acceptable(r: VerifyPart5V2Result): boolean {
  return r.pass && r.score >= PART5_V2_VERIFY_MIN_SCORE;
}
