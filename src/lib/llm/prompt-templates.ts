import type { Part5GeneratedItem } from "./types";

export const PART5_GENERATION_PROMPT_VERSION = "part5-generate-v1";
export const PART5_VERIFICATION_PROMPT_VERSION = "part5-verify-v1";

export type BuildPart5GenerationPromptInput = {
  grammarPoint: string;
  difficulty: string;
  avoidVocabulary?: string[];
  avoidPatterns?: string[];
  seedHint?: string;
};

function formatList(values?: string[]) {
  if (!values || values.length === 0) {
    return "None";
  }

  return values.map((value) => `- ${value}`).join("\n");
}

export function buildPart5GenerationPrompt(input: BuildPart5GenerationPromptInput) {
  const systemPrompt = `
You are a TOEIC item writer specializing in Part 5 incomplete sentence questions.

Generate exactly one TOEIC Part 5 item.
Requirements:
- The item must be an incomplete sentence with one blank written as ____.
- The register must be business/workplace English.
- Provide exactly four answer choices labeled A, B, C, D.
- There must be exactly one correct answer.
- Distractors must be plausible but clearly incorrect.
- The explanation must be written in Traditional Chinese.
- Return strict JSON only.
- Do not wrap the JSON in markdown fences.
- Do not add commentary before or after the JSON.

The JSON must include exactly these top-level fields:
- stem
- choices
- answer
- grammar_point
- difficulty
- explanation_zh_hant

The choices field must be an object with keys A, B, C, D.
The answer field must be one of A, B, C, D.
`.trim();

  const userPrompt = `
Create one new TOEIC Part 5 item with these targets:

grammarPoint: ${input.grammarPoint}
difficulty: ${input.difficulty}

avoidVocabulary:
${formatList(input.avoidVocabulary)}

avoidPatterns:
${formatList(input.avoidPatterns)}

seedHint:
${input.seedHint?.trim() || "None"}

Return strict JSON in this shape:
{
  "stem": "string",
  "choices": {
    "A": "string",
    "B": "string",
    "C": "string",
    "D": "string"
  },
  "answer": "A|B|C|D",
  "grammar_point": "string",
  "difficulty": "string",
  "explanation_zh_hant": "string"
}
`.trim();

  return {
    systemPrompt,
    userPrompt,
  };
}

export function buildPart5VerificationPrompt(item: Part5GeneratedItem) {
  const systemPrompt = `
You are a TOEIC Part 5 quality verifier.

Review exactly one generated TOEIC Part 5 incomplete sentence item.
You must verify all of the following:
1. The stem becomes grammatical when the correct answer is inserted.
2. There is exactly one correct answer.
3. The distractors are wrong because of the target grammar point.
4. The stem genuinely tests the claimed grammar point.
5. The explanation is written in Traditional Chinese.

Return strict JSON only.
Do not use markdown fences.
Do not add commentary before or after the JSON.

The JSON must contain:
- valid: boolean
- confidence: number from 0 to 1
- issues: array of strings
- suggested_fix: optional string

Write issues and suggested_fix in Traditional Chinese.
`.trim();

  const userPrompt = `
Verify this generated TOEIC Part 5 item:

${JSON.stringify(item, null, 2)}

Return strict JSON in this shape:
{
  "valid": true,
  "confidence": 0.0,
  "issues": [],
  "suggested_fix": "string"
}
`.trim();

  return {
    systemPrompt,
    userPrompt,
  };
}
