/**
 * Unified LLM gateway for text completions. Provider-specific HTTP details stay here;
 * feature modules (e.g. lesson-generator) only build prompts and interpret results.
 */
import { logLlmUsage } from "./usage-log";
import { logOpsError, logOpsWarn } from "@/lib/ops-log";
import type {
  LlmGatewayChatMessage,
  LlmGatewayCompleteOptions,
  LlmGatewayCompleteResult,
  LlmProvider,
} from "./types";

const GEMINI_TEXT_MODEL = process.env.LLM_GATEWAY_GEMINI_MODEL?.trim() || "gemini-2.5-flash";
const ANTHROPIC_TEXT_MODEL = process.env.LLM_GATEWAY_ANTHROPIC_MODEL?.trim() || "claude-haiku-4-5";
const OPENAI_TEXT_MODEL = process.env.LLM_GATEWAY_OPENAI_MODEL?.trim() || "gpt-4o-mini";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

function tryGetGeminiKey() {
  return process.env.GEMINI_API_KEY?.trim() || undefined;
}

function tryGetAnthropicKey() {
  return process.env.ANTHROPIC_API_KEY?.trim() || undefined;
}

function tryGetOpenAiKey() {
  return process.env.OPENAI_API_KEY?.trim() || undefined;
}

function defaultProviderOrder(): LlmProvider[] {
  const raw = process.env.LLM_PROVIDER_ORDER?.trim();
  if (!raw) {
    return ["google", "anthropic", "openai"];
  }
  const map: Record<string, LlmProvider> = {
    google: "google",
    gemini: "google",
    anthropic: "anthropic",
    claude: "anthropic",
    openai: "openai",
  };
  const out: LlmProvider[] = [];
  for (const part of raw.split(",")) {
    const k = part.trim().toLowerCase();
    const p = map[k];
    if (p && !out.includes(p)) {
      out.push(p);
    }
  }
  return out.length > 0 ? out : ["google", "anthropic", "openai"];
}

function splitMessages(messages: LlmGatewayChatMessage[]) {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const nonSystem = messages.filter((m) => m.role !== "system");
  return {
    systemPrompt: system.trim() || undefined,
    conversation: nonSystem,
  };
}

type GeminiResp = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    cachedContentTokenCount?: number;
  };
  error?: { message?: string };
};

async function callGemini(
  messages: LlmGatewayChatMessage[],
  options: LlmGatewayCompleteOptions,
): Promise<LlmGatewayCompleteResult> {
  const apiKey = tryGetGeminiKey();
  const startedAt = Date.now();
  if (!apiKey) {
    return {
      ok: false,
      text: "",
      provider: "google",
      model: GEMINI_TEXT_MODEL,
      promptTokens: 0,
      completionTokens: 0,
      cachedTokens: 0,
      cacheWriteTokens: 0,
      latencyMs: 0,
      errorMessage: "GEMINI_API_KEY is not set.",
    };
  }

  const { systemPrompt, conversation } = splitMessages(messages);
  const userText = conversation
    .map((m) => `${m.role.toUpperCase()}:\n${m.content}`)
    .join("\n\n");

  const body = {
    ...(systemPrompt
      ? {
          systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
        }
      : {}),
    contents: [{ role: "user", parts: [{ text: userText }] }],
    generationConfig: {
      temperature: options.temperature ?? 0.45,
      maxOutputTokens: options.maxOutputTokens ?? 8192,
    },
  };

  let raw: GeminiResp = {};
  try {
    const res = await fetch(
      `${GEMINI_API_BASE}/models/${GEMINI_TEXT_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const text = await res.text();
    raw = text.trim() ? (JSON.parse(text) as GeminiResp) : {};
    const latencyMs = Date.now() - startedAt;
    const promptTokens = raw.usageMetadata?.promptTokenCount ?? 0;
    const completionTokens = raw.usageMetadata?.candidatesTokenCount ?? 0;
    const cachedTokens = raw.usageMetadata?.cachedContentTokenCount ?? 0;

    if (!res.ok) {
      const err = raw.error?.message?.trim() || `HTTP ${res.status}`;
      await logLlmUsage({
        taskType: options.taskType,
        provider: "google",
        model: GEMINI_TEXT_MODEL,
        promptVersion: options.promptVersion,
        promptTokens,
        completionTokens,
        cachedTokens,
        cacheWriteTokens: 0,
        costUsd: 0,
        latencyMs,
        success: false,
        errorMessage: err,
        temperature: options.temperature,
      });
      return {
        ok: false,
        text: "",
        provider: "google",
        model: GEMINI_TEXT_MODEL,
        promptTokens,
        completionTokens,
        cachedTokens,
        cacheWriteTokens: 0,
        latencyMs,
        errorMessage: err,
      };
    }

    const out =
      raw.candidates
        ?.flatMap((c) => c.content?.parts ?? [])
        .map((p) => p.text ?? "")
        .join("")
        .trim() ?? "";

    if (!out) {
      await logLlmUsage({
        taskType: options.taskType,
        provider: "google",
        model: GEMINI_TEXT_MODEL,
        promptVersion: options.promptVersion,
        promptTokens,
        completionTokens,
        cachedTokens,
        cacheWriteTokens: 0,
        costUsd: 0,
        latencyMs,
        success: false,
        errorMessage: "Empty candidate text",
        temperature: options.temperature,
      });
      return {
        ok: false,
        text: "",
        provider: "google",
        model: GEMINI_TEXT_MODEL,
        promptTokens,
        completionTokens,
        cachedTokens,
        cacheWriteTokens: 0,
        latencyMs,
        errorMessage: "Empty candidate text",
      };
    }

    await logLlmUsage({
      taskType: options.taskType,
      provider: "google",
      model: GEMINI_TEXT_MODEL,
      promptVersion: options.promptVersion,
      promptTokens,
      completionTokens,
      cachedTokens,
      cacheWriteTokens: 0,
      costUsd: 0,
      latencyMs,
      success: true,
      temperature: options.temperature,
    });

    return {
      ok: true,
      text: out,
      provider: "google",
      model: GEMINI_TEXT_MODEL,
      promptTokens,
      completionTokens,
      cachedTokens,
      cacheWriteTokens: 0,
      latencyMs,
    };
  } catch (e) {
    const latencyMs = Date.now() - startedAt;
    const msg = e instanceof Error ? e.message : String(e);
    await logLlmUsage({
      taskType: options.taskType,
      provider: "google",
      model: GEMINI_TEXT_MODEL,
      promptVersion: options.promptVersion,
      promptTokens: 0,
      completionTokens: 0,
      cachedTokens: 0,
      cacheWriteTokens: 0,
      costUsd: 0,
      latencyMs,
      success: false,
      errorMessage: msg,
      temperature: options.temperature,
    });
    return {
      ok: false,
      text: "",
      provider: "google",
      model: GEMINI_TEXT_MODEL,
      promptTokens: 0,
      completionTokens: 0,
      cachedTokens: 0,
      cacheWriteTokens: 0,
      latencyMs,
      errorMessage: msg,
    };
  }
}

type AnthropicResp = {
  content?: Array<{ type?: string; text?: string }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  error?: { message?: string };
  model?: string;
};

async function callAnthropic(
  messages: LlmGatewayChatMessage[],
  options: LlmGatewayCompleteOptions,
): Promise<LlmGatewayCompleteResult> {
  const apiKey = tryGetAnthropicKey();
  const startedAt = Date.now();
  if (!apiKey) {
    return {
      ok: false,
      text: "",
      provider: "anthropic",
      model: ANTHROPIC_TEXT_MODEL,
      promptTokens: 0,
      completionTokens: 0,
      cachedTokens: 0,
      cacheWriteTokens: 0,
      latencyMs: 0,
      errorMessage: "ANTHROPIC_API_KEY is not set.",
    };
  }

  const { systemPrompt, conversation } = splitMessages(messages);
  const payload = {
    model: ANTHROPIC_TEXT_MODEL,
    max_tokens: options.maxOutputTokens ?? 8192,
    temperature: options.temperature ?? 0.45,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    messages: conversation.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
  };

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    const raw = text.trim() ? (JSON.parse(text) as AnthropicResp) : {};
    const latencyMs = Date.now() - startedAt;
    const promptTokens = raw.usage?.input_tokens ?? 0;
    const completionTokens = raw.usage?.output_tokens ?? 0;
    const cachedTokens = raw.usage?.cache_read_input_tokens ?? 0;
    const cacheWriteTokens = raw.usage?.cache_creation_input_tokens ?? 0;
    const model = raw.model ?? ANTHROPIC_TEXT_MODEL;

    if (!res.ok) {
      const err = raw.error?.message?.trim() || `HTTP ${res.status}`;
      await logLlmUsage({
        taskType: options.taskType,
        provider: "anthropic",
        model,
        promptVersion: options.promptVersion,
        promptTokens,
        completionTokens,
        cachedTokens,
        cacheWriteTokens,
        costUsd: 0,
        latencyMs,
        success: false,
        errorMessage: err,
        temperature: options.temperature,
      });
      return {
        ok: false,
        text: "",
        provider: "anthropic",
        model,
        promptTokens,
        completionTokens,
        cachedTokens,
        cacheWriteTokens,
        latencyMs,
        errorMessage: err,
      };
    }

    const out =
      raw.content
        ?.filter((b) => b.type === "text")
        .map((b) => b.text ?? "")
        .join("")
        .trim() ?? "";

    if (!out) {
      await logLlmUsage({
        taskType: options.taskType,
        provider: "anthropic",
        model,
        promptVersion: options.promptVersion,
        promptTokens,
        completionTokens,
        cachedTokens,
        cacheWriteTokens,
        costUsd: 0,
        latencyMs,
        success: false,
        errorMessage: "Empty text content",
        temperature: options.temperature,
      });
      return {
        ok: false,
        text: "",
        provider: "anthropic",
        model,
        promptTokens,
        completionTokens,
        cachedTokens,
        cacheWriteTokens,
        latencyMs,
        errorMessage: "Empty text content",
      };
    }

    await logLlmUsage({
      taskType: options.taskType,
      provider: "anthropic",
      model,
      promptVersion: options.promptVersion,
      promptTokens,
      completionTokens,
      cachedTokens,
      cacheWriteTokens,
      costUsd: 0,
      latencyMs,
      success: true,
      temperature: options.temperature,
    });

    return {
      ok: true,
      text: out,
      provider: "anthropic",
      model,
      promptTokens,
      completionTokens,
      cachedTokens,
      cacheWriteTokens,
      latencyMs,
    };
  } catch (e) {
    const latencyMs = Date.now() - startedAt;
    const msg = e instanceof Error ? e.message : String(e);
    await logLlmUsage({
      taskType: options.taskType,
      provider: "anthropic",
      model: ANTHROPIC_TEXT_MODEL,
      promptVersion: options.promptVersion,
      promptTokens: 0,
      completionTokens: 0,
      cachedTokens: 0,
      cacheWriteTokens: 0,
      costUsd: 0,
      latencyMs,
      success: false,
      errorMessage: msg,
      temperature: options.temperature,
    });
    return {
      ok: false,
      text: "",
      provider: "anthropic",
      model: ANTHROPIC_TEXT_MODEL,
      promptTokens: 0,
      completionTokens: 0,
      cachedTokens: 0,
      cacheWriteTokens: 0,
      latencyMs,
      errorMessage: msg,
    };
  }
}

type OpenAiResp = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
};

async function callOpenAi(
  messages: LlmGatewayChatMessage[],
  options: LlmGatewayCompleteOptions,
): Promise<LlmGatewayCompleteResult> {
  const apiKey = tryGetOpenAiKey();
  const startedAt = Date.now();
  if (!apiKey) {
    return {
      ok: false,
      text: "",
      provider: "openai",
      model: OPENAI_TEXT_MODEL,
      promptTokens: 0,
      completionTokens: 0,
      cachedTokens: 0,
      cacheWriteTokens: 0,
      latencyMs: 0,
      errorMessage: "OPENAI_API_KEY is not set.",
    };
  }

  const { systemPrompt, conversation } = splitMessages(messages);
  const openAiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
  if (systemPrompt) {
    openAiMessages.push({ role: "system", content: systemPrompt });
  }
  for (const m of conversation) {
    openAiMessages.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.content });
  }

  try {
    const res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_TEXT_MODEL,
        temperature: options.temperature ?? 0.45,
        max_tokens: options.maxOutputTokens ?? 8192,
        messages: openAiMessages,
      }),
    });
    const text = await res.text();
    const raw = text.trim() ? (JSON.parse(text) as OpenAiResp) : {};
    const latencyMs = Date.now() - startedAt;
    const promptTokens = raw.usage?.prompt_tokens ?? 0;
    const completionTokens = raw.usage?.completion_tokens ?? 0;

    if (!res.ok) {
      const err = raw.error?.message?.trim() || `HTTP ${res.status}`;
      await logLlmUsage({
        taskType: options.taskType,
        provider: "openai",
        model: OPENAI_TEXT_MODEL,
        promptVersion: options.promptVersion,
        promptTokens,
        completionTokens,
        cachedTokens: 0,
        cacheWriteTokens: 0,
        costUsd: 0,
        latencyMs,
        success: false,
        errorMessage: err,
        temperature: options.temperature,
      });
      return {
        ok: false,
        text: "",
        provider: "openai",
        model: OPENAI_TEXT_MODEL,
        promptTokens,
        completionTokens,
        cachedTokens: 0,
        cacheWriteTokens: 0,
        latencyMs,
        errorMessage: err,
      };
    }

    const out = raw.choices?.[0]?.message?.content?.trim() ?? "";

    if (!out) {
      await logLlmUsage({
        taskType: options.taskType,
        provider: "openai",
        model: OPENAI_TEXT_MODEL,
        promptVersion: options.promptVersion,
        promptTokens,
        completionTokens,
        cachedTokens: 0,
        cacheWriteTokens: 0,
        costUsd: 0,
        latencyMs,
        success: false,
        errorMessage: "Empty choices[0].message.content",
        temperature: options.temperature,
      });
      return {
        ok: false,
        text: "",
        provider: "openai",
        model: OPENAI_TEXT_MODEL,
        promptTokens,
        completionTokens,
        cachedTokens: 0,
        cacheWriteTokens: 0,
        latencyMs,
        errorMessage: "Empty choices[0].message.content",
      };
    }

    await logLlmUsage({
      taskType: options.taskType,
      provider: "openai",
      model: OPENAI_TEXT_MODEL,
      promptVersion: options.promptVersion,
      promptTokens,
      completionTokens,
      cachedTokens: 0,
      cacheWriteTokens: 0,
      costUsd: 0,
      latencyMs,
      success: true,
      temperature: options.temperature,
    });

    return {
      ok: true,
      text: out,
      provider: "openai",
      model: OPENAI_TEXT_MODEL,
      promptTokens,
      completionTokens,
      cachedTokens: 0,
      cacheWriteTokens: 0,
      latencyMs,
    };
  } catch (e) {
    const latencyMs = Date.now() - startedAt;
    const msg = e instanceof Error ? e.message : String(e);
    await logLlmUsage({
      taskType: options.taskType,
      provider: "openai",
      model: OPENAI_TEXT_MODEL,
      promptVersion: options.promptVersion,
      promptTokens: 0,
      completionTokens: 0,
      cachedTokens: 0,
      cacheWriteTokens: 0,
      costUsd: 0,
      latencyMs,
      success: false,
      errorMessage: msg,
      temperature: options.temperature,
    });
    return {
      ok: false,
      text: "",
      provider: "openai",
      model: OPENAI_TEXT_MODEL,
      promptTokens: 0,
      completionTokens: 0,
      cachedTokens: 0,
      cacheWriteTokens: 0,
      latencyMs,
      errorMessage: msg,
    };
  }
}

/**
 * Text chat completion with provider fallback. Each HTTP attempt writes one `LlmUsageLog` row.
 * Missing API keys skip that provider without throwing.
 */
export async function completeChat(
  messages: LlmGatewayChatMessage[],
  options: LlmGatewayCompleteOptions,
): Promise<LlmGatewayCompleteResult> {
  const startedAt = Date.now();
  const order = options.providerOrder?.length ? options.providerOrder : defaultProviderOrder();
  const errors: string[] = [];

  for (const provider of order) {
    let r: LlmGatewayCompleteResult;
    if (provider === "google") {
      r = await callGemini(messages, options);
    } else if (provider === "anthropic") {
      r = await callAnthropic(messages, options);
    } else {
      r = await callOpenAi(messages, options);
    }

    if (r.ok) {
      return r;
    }
    if (r.errorMessage) {
      errors.push(`${provider}: ${r.errorMessage}`);
      logOpsWarn({
        area: "llm",
        event: "provider_call_failed",
        detail: {
          taskType: options.taskType,
          provider,
          promptVersion: options.promptVersion,
          message: r.errorMessage,
        },
      });
    }
  }

  const latencyMs = Date.now() - startedAt;
  const lastProvider = order.length > 0 ? order[order.length - 1]! : ("google" as LlmProvider);
  const combined = errors.length > 0 ? errors.join(" | ") : "No LLM providers available or all calls failed.";
  logOpsError({
    area: "llm",
    event: "gateway_exhausted",
    detail: {
      taskType: options.taskType,
      promptVersion: options.promptVersion,
      providerOrder: order,
      errorSummary: combined,
    },
  });

  await logLlmUsage({
    taskType: options.taskType,
    provider: lastProvider,
    model: "gateway-exhausted",
    promptVersion: options.promptVersion,
    promptTokens: 0,
    completionTokens: 0,
    cachedTokens: 0,
    cacheWriteTokens: 0,
    costUsd: 0,
    latencyMs,
    success: false,
    errorMessage: combined,
    temperature: options.temperature,
  });

  return {
    ok: false,
    text: "",
    provider: lastProvider,
    model: "gateway-exhausted",
    promptTokens: 0,
    completionTokens: 0,
    cachedTokens: 0,
    cacheWriteTokens: 0,
    latencyMs,
    errorMessage: combined,
  };
}
