import { NextResponse } from "next/server";

import { ClaudeVerificationError, verifyPart5ItemWithClaude } from "@/lib/llm/claude-verify";
import { GeminiGenerationError, generatePart5ItemWithGemini } from "@/lib/llm/gemini-generate";

type GenerateAndVerifyRequestBody = {
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
    const body = (await request.json()) as GenerateAndVerifyRequestBody;
    const generated = await generatePart5ItemWithGemini({
      grammarPoint: normalizeRequiredString(body.grammarPoint, "grammarPoint"),
      difficulty: normalizeRequiredString(body.difficulty, "difficulty"),
      avoidVocabulary: normalizeOptionalStringArray(body.avoidVocabulary, "avoidVocabulary"),
      avoidPatterns: normalizeOptionalStringArray(body.avoidPatterns, "avoidPatterns"),
      seedHint: normalizeOptionalString(body.seedHint),
      seed: normalizeOptionalSeed(body.seed),
    });

    try {
      const verified = await verifyPart5ItemWithClaude(generated.parsedItem);

      return NextResponse.json({
        ok: true,
        generatedItem: generated.parsedItem,
        verifierVerdict: verified.verifierVerdict,
        generation: {
          model: generated.callResult.model,
          promptVersion: generated.promptVersion,
          rawText: generated.rawText,
          rawResponse: generated.rawResponse,
        },
        verification: {
          model: verified.callResult.model,
          promptVersion: verified.promptVersion,
          rawText: verified.rawText,
          rawResponse: verified.rawResponse,
        },
      });
    } catch (error) {
      if (error instanceof ClaudeVerificationError) {
        return NextResponse.json(
          {
            ok: false,
            stage: "verify",
            generatedItem: generated.parsedItem,
            generation: {
              model: generated.callResult.model,
              promptVersion: generated.promptVersion,
              rawText: generated.rawText,
              rawResponse: generated.rawResponse,
            },
            verifyError: error.message,
            verifierRawText: error.rawText ?? null,
            verifierRawResponse: error.rawResponse ?? null,
          },
          { status: error.status },
        );
      }

      throw error;
    }
  } catch (error) {
    if (error instanceof GeminiGenerationError) {
      return NextResponse.json(
        {
          ok: false,
          stage: "generate",
          error: error.message,
          rawText: error.rawText ?? null,
          rawResponse: error.rawResponse ?? null,
        },
        { status: error.status },
      );
    }

    if (error instanceof ClaudeVerificationError) {
      return NextResponse.json(
        {
          ok: false,
          stage: "verify",
          error: error.message,
          rawText: error.rawText ?? null,
          rawResponse: error.rawResponse ?? null,
        },
        { status: error.status },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
