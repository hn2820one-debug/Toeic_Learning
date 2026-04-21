import type { Part5GeneratedItem } from "./types";

export const PART5_GENERATION_PROMPT_VERSION = "part5-generate-v1";
export const PART5_VERIFICATION_PROMPT_VERSION = "part5-verify-v1";
export const PART5_GENERATION_V2_PROMPT_VERSION = "part5-generate-v2-reconciled";

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

/**
 * Reconciled v2 prompt — generates a TOEIC Part 5 item *plus* the enriched
 * teaching metadata expected by the closed-loop schema:
 *   - primaryLearningSkillCode  (caller passes it in)
 *   - coreRule                  (one-line canonical rule)
 *   - recognitionSignal         (how to spot this in <5 sec)
 *   - hint1 / hint2 / hint3     (three-tier hint ladder)
 *   - distractorAnalysis        (per-choice taxonomy + whyPlausible + whyWrong)
 *
 * The gemini-generate / claude-verify pipeline should call this when writing
 * new 30-day bank items so each question ships with full pedagogical payload.
 */
export type BuildPart5GenerationV2PromptInput = {
  /** LearningSkill.skillCode value, e.g. "grammar_svc", "vocab_medical". */
  targetSkillCode: string;
  /** Human label of the skill (LearningSkill.labelZh) for the writer. */
  skillLabelZh: string;
  skillLabelEn: string;
  /** "grammar" | "vocabulary" | "phrase" | "strategy" */
  skillCategory: string;
  /** "A" | "B" | "C" (matches QuestionBankItem.difficulty). */
  difficulty: string;
  /** Optional Phase1TopicKey like "office" / "finance" / "tech" / "healthEnv"; guides scenario. */
  scenarioTopicKey?: string;
  /** Optional: "semiconductor" | "medical" | "generic" — biases the example voice. */
  industryFocus?: string;
  avoidVocabulary?: string[];
  avoidPatterns?: string[];
  seedHint?: string;
};

export function buildPart5GenerationV2Prompt(input: BuildPart5GenerationV2PromptInput) {
  const systemPrompt = `
You are a TOEIC Part 5 item writer *and* a teaching-material designer. Every
item you produce must ship with full pedagogical payload for an FSRS-based
closed-loop trainer.

Generate exactly one TOEIC Part 5 item targeting the given LearningSkill.
Requirements:
- The item must be an incomplete sentence with one blank written as ____.
- Register: business / workplace English.
- Four choices A / B / C / D, exactly one correct.
- Distractors must be plausible but clearly wrong for reasons tied to the target skill.
- All 繁體中文 fields must be in Traditional Chinese (e.g. 「呢個」形式可接受，但唔強求粵語).

You must also produce, for the teacher-UI layer:
- coreRule:            One sentence (繁中 ≤40 chars) stating the canonical rule this item tests.
- recognitionSignal:   One sentence (繁中 ≤40 chars) telling learner how to detect in <5 sec this is the target skill.
- hint1 / hint2 / hint3: Three progressive hints in 繁中. Hint1 is the gentlest (point at the question type), hint3 is strongest (near-reveal, still not the letter). Never reveal the letter answer in any hint.
- distractorAnalysis:  Object keyed by A/B/C/D. Each entry = { type, whyPlausible, whyWrong }.
  "type" must be one of: part_of_speech_error | tense_error | collocation_error | register_error | form_confusion | near_synonym | false_friend | plausible_wrong | correct
  The correct choice uses type "correct" with whyPlausible a short reason, whyWrong "—".

Return strict JSON only. No markdown fences. No commentary.
`.trim();

  const userPrompt = `
Create one new TOEIC Part 5 item targeting this LearningSkill:

targetSkillCode:   ${input.targetSkillCode}
skillLabelZh:      ${input.skillLabelZh}
skillLabelEn:      ${input.skillLabelEn}
skillCategory:     ${input.skillCategory}
difficulty:        ${input.difficulty}
scenarioTopicKey:  ${input.scenarioTopicKey ?? "(any)"}
industryFocus:     ${input.industryFocus ?? "generic"}

avoidVocabulary:
${formatList(input.avoidVocabulary)}

avoidPatterns:
${formatList(input.avoidPatterns)}

seedHint:
${input.seedHint?.trim() || "None"}

Return strict JSON in this shape:
{
  "stem": "string",
  "choices": { "A": "string", "B": "string", "C": "string", "D": "string" },
  "answer": "A|B|C|D",
  "targetSkillCode": "${input.targetSkillCode}",
  "difficulty": "${input.difficulty}",
  "explanation_zh_hant": "string",
  "coreRule": "string (繁中)",
  "recognitionSignal": "string (繁中)",
  "hint1": "string (繁中)",
  "hint2": "string (繁中)",
  "hint3": "string (繁中)",
  "distractorAnalysis": {
    "A": { "type": "...", "whyPlausible": "...", "whyWrong": "..." },
    "B": { "type": "...", "whyPlausible": "...", "whyWrong": "..." },
    "C": { "type": "...", "whyPlausible": "...", "whyWrong": "..." },
    "D": { "type": "...", "whyPlausible": "...", "whyWrong": "..." }
  }
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
