import "server-only";

import { getAnthropicApiKey } from "./providers";
import { buildPart5VerificationPrompt, PART5_VERIFICATION_PROMPT_VERSION } from "./prompt-templates";
import type { LlmCallResult, Part5GeneratedItem, Part5VerificationVerdict } from "./types";
import { logLlmUsage } from "./usage-log";

export const CLAUDE_PART5_VERIFIER_MODEL = "claude-sonnet-4-5";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_TEMPERATURE = 0.3;
const SIMPLIFIED_CHINESE_REGEX =
  /[这们为为么应开关问题项验仅体并从业发后会说话种还过这边进远关复杂级简难点样门报读写错误]/;

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

export type VerifyPart5ItemWithClaudeResult = {
  verifierVerdict: Part5VerificationVerdict;
  rawText: string;
  rawResponse: AnthropicMessageResponse;
  promptVersion: string;
  callResult: LlmCallResult;
};

export class ClaudeVerificationError extends Error {
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
    this.name = "ClaudeVerificationError";
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

function extractUsageMetadata(response: AnthropicMessageResponse | undefined) {
  return {
    promptTokens: response?.usage?.input_tokens ?? 0,
    completionTokens: response?.usage?.output_tokens ?? 0,
    cachedTokens: response?.usage?.cache_read_input_tokens ?? 0,
    cacheWriteTokens: response?.usage?.cache_creation_input_tokens ?? 0,
  };
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

function detectSimplifiedChinese(text: string) {
  return SIMPLIFIED_CHINESE_REGEX.test(text);
}

function stripOptionalMarkdownJsonFence(text: string) {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n?```/i);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  return trimmed;
}

function parseVerdict(rawText: string): Part5VerificationVerdict {
  const jsonPayload = stripOptionalMarkdownJsonFence(rawText);
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonPayload);
  } catch {
    throw new Error(`Claude returned non-JSON text: ${rawText.slice(0, 200)}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Claude returned JSON, but the top-level value was not an object.");
  }

  const verdict = parsed as Record<string, unknown>;

  if (
    typeof verdict.valid !== "boolean" ||
    typeof verdict.confidence !== "number" ||
    !Number.isFinite(verdict.confidence) ||
    verdict.confidence < 0 ||
    verdict.confidence > 1 ||
    !Array.isArray(verdict.issues) ||
    verdict.issues.some((issue) => typeof issue !== "string") ||
    (verdict.suggested_fix !== undefined && typeof verdict.suggested_fix !== "string")
  ) {
    throw new Error("Claude returned JSON, but it did not match the required verifier schema.");
  }

  return {
    valid: verdict.valid,
    confidence: verdict.confidence,
    issues: verdict.issues,
    suggested_fix: verdict.suggested_fix,
  };
}

function applyZhScriptGuards(item: Part5GeneratedItem, verdict: Part5VerificationVerdict): Part5VerificationVerdict {
  const issues = [...verdict.issues];
  let valid = verdict.valid;

  if (detectSimplifiedChinese(item.explanation_zh_hant)) {
    issues.push("zh-script warning: explanation_zh_hant 含有疑似簡體字。");
    valid = false;
  }

  const verifierNotes = `${verdict.issues.join(" ")} ${verdict.suggested_fix ?? ""}`;
  if (verifierNotes.trim().length > 0 && detectSimplifiedChinese(verifierNotes)) {
    issues.push("zh-script warning: verifier note 含有疑似簡體字。");
    valid = false;
  }

  return {
    ...verdict,
    valid,
    issues,
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
    provider: "anthropic",
    promptTokens: input.promptTokens,
    completionTokens: input.completionTokens,
    cachedTokens: input.cachedTokens,
    cacheWriteTokens: input.cacheWriteTokens,
    latencyMs: input.latencyMs,
    errorMessage: input.errorMessage,
  };
}

function getAnthropicApiErrorMessage(status: number, payload: AnthropicMessageResponse | undefined) {
  const detail = payload?.error?.message?.trim();
  return detail ? `Claude request failed (${status}): ${detail}` : `Claude request failed with HTTP ${status}.`;
}

export async function verifyPart5ItemWithClaude(
  item: Part5GeneratedItem,
  input?: {
    temperature?: number;
  },
): Promise<VerifyPart5ItemWithClaudeResult> {
  const startedAt = Date.now();
  const model = CLAUDE_PART5_VERIFIER_MODEL;
  const promptVersion = PART5_VERIFICATION_PROMPT_VERSION;
  const temperature = input?.temperature ?? DEFAULT_TEMPERATURE;

  let rawResponse: AnthropicMessageResponse | undefined;
  let rawText = "";
  let responseModel = model;
  let errorMessage: string | undefined;

  try {
    const apiKey = getAnthropicApiKey();
    const { systemPrompt, userPrompt } = buildPart5VerificationPrompt(item);

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model,
        max_tokens: 800,
        temperature,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
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
      throw new ClaudeVerificationError(getAnthropicApiErrorMessage(response.status, rawResponse), {
        status: response.status,
        rawResponse,
      });
    }

    rawText = extractClaudeText(rawResponse);
    const parsedVerdict = parseVerdict(rawText);
    const verifierVerdict = applyZhScriptGuards(item, parsedVerdict);
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

    return {
      verifierVerdict,
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
