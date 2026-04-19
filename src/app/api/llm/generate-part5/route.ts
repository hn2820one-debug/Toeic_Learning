import { NextResponse } from "next/server";

import { GeminiGenerationError, generatePart5ItemWithGemini } from "@/lib/llm/gemini-generate";

type GeneratePart5RequestBody = {
  grammarPoint?: unknown;
  difficulty?: unknown;
  avoidVocabulary?: unknown;
  avoidPatterns?: unknown;
  seedHint?: unknown;
  seed?: unknown;
};

function normalizeRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }

  return value.trim();
}

function normalizeOptionalString(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error("seedHint must be a string when provided.");
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeOptionalStringArray(value: unknown, fieldName: string) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${fieldName} must be an array of strings when provided.`);
  }

  const normalized = value.map((item) => item.trim()).filter((item) => item.length > 0);
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeOptionalSeed(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error("seed must be an integer when provided.");
  }

  return value;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GeneratePart5RequestBody;
    const result = await generatePart5ItemWithGemini({
      grammarPoint: normalizeRequiredString(body.grammarPoint, "grammarPoint"),
      difficulty: normalizeRequiredString(body.difficulty, "difficulty"),
      avoidVocabulary: normalizeOptionalStringArray(body.avoidVocabulary, "avoidVocabulary"),
      avoidPatterns: normalizeOptionalStringArray(body.avoidPatterns, "avoidPatterns"),
      seedHint: normalizeOptionalString(body.seedHint),
      seed: normalizeOptionalSeed(body.seed),
    });

    return NextResponse.json({
      ok: true,
      provider: result.callResult.provider,
      model: result.callResult.model,
      promptVersion: result.promptVersion,
      rawText: result.rawText,
      parsedItem: result.parsedItem,
      rawResponse: result.rawResponse,
      usage: {
        promptTokens: result.callResult.promptTokens,
        completionTokens: result.callResult.completionTokens,
        cachedTokens: result.callResult.cachedTokens,
        cacheWriteTokens: result.callResult.cacheWriteTokens,
        latencyMs: result.callResult.latencyMs,
      },
    });
  } catch (error) {
    if (error instanceof GeminiGenerationError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          rawText: error.rawText ?? null,
          rawResponse: error.rawResponse ?? null,
          usage: error.callResult
            ? {
                promptTokens: error.callResult.promptTokens,
                completionTokens: error.callResult.completionTokens,
                cachedTokens: error.callResult.cachedTokens,
                cacheWriteTokens: error.callResult.cacheWriteTokens,
                latencyMs: error.callResult.latencyMs,
              }
            : null,
        },
        { status: error.status },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 },
    );
  }
}
