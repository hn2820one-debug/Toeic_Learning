# LLM contracts and fallbacks

This document describes typed output contracts (Zod in `src/lib/llm/contracts.ts`), unified usage logging (`LlmUsageLog` via `logLlmUsage` / gateway), and deterministic fallbacks so missing API keys, provider outages, or malformed output do not break learner-facing flows.

**Progression policy:** stage changes, pass/fail, FSRS / review scheduling, and learning-path ordering must be decided only by deterministic application code. LLM output is **coaching copy** and **explanations** only; any field that looks like a decision (e.g. `advanceAllowed` in checkpoint JSON) must be **overridden** by code when those prompts are wired.

---

## Usage logging (`LlmUsageLog`)

Every gateway attempt and several direct-provider calls write a row with:

| Field | Meaning |
| --- | --- |
| `taskType` | `LlmTaskType` (e.g. `weekly_report`, `explain`, `lesson_markdown`, `hint`) |
| `provider` | `google` \| `anthropic` \| `openai` |
| `model` | Provider model id, or `gateway-exhausted` when `completeChat` tried all providers and none succeeded |
| `promptVersion` | String from `TASK_PROMPT_VERSIONS` in `contracts.ts` or the feature module |
| `success` | HTTP + parse/contract success for that attempt |
| `latencyMs` | Round-trip time for that attempt (or gateway sweep for `gateway-exhausted`) |
| `promptTokens` / `completionTokens` / `cachedTokens` / `cacheWriteTokens` | When the provider returns usage metadata |
| `errorMessage` | Present when `success` is false |

**Gateway:** `completeChat` logs each provider attempt separately. If every provider fails, one additional row is written with `model: gateway-exhausted` and a concatenated error summary.

---

## Task types

### 1. Weekly coaching report (`taskType: weekly_report`)

| | |
| --- | --- |
| **Prompt version** | `TASK_PROMPT_VERSIONS.weeklyCoachingReport` (`weekly-coaching-report-v1`) |
| **Provider** | Direct Gemini HTTP in `weekly-report.ts` (not the shared gateway) |
| **Input** | `WeeklyReportContext` built from DB metrics (7-day window, sessions, topic breakdown). |
| **Output schema** | `WeeklyCoachingReportMarkdownSchema`: Traditional Chinese Markdown with fixed `##` headings (`REQUIRED_WEEKLY_COACHING_HEADINGS` in `contracts.ts`) and the phrase `粗略估計，非官方預測` in the estimate section. |
| **Validation** | `safeParseWeeklyCoachingMarkdown` before returning text to the API route. |
| **Fallback** | `buildDeterministicWeeklyCoachingReport` — fixed template filled from the same metrics. Used when the key is missing, HTTP fails, body is empty/invalid, or Markdown contract fails. |
| **Safe for UI** | Entire string is safe to render as preformatted coaching text; it is not structured JSON. |

**Provider caveats:** Gemini may omit headings or disclaimer; validation catches drift and triggers fallback.

---

### 2. Wrong-answer explanation (`taskType: explain`)

| | |
| --- | --- |
| **Prompt version** | `TASK_PROMPT_VERSIONS.wrongAnswerExplain` (`wrong-answer-explain-v1`) |
| **Provider** | Direct Anthropic Messages API in `haiku-explain.ts` |
| **Input** | `WrongAnswerExplanationInput` (stem, choices, correct vs user choice, optional explanation snapshot). |
| **Output schema** | `WrongAnswerExplanationTextSchema`: trimmed string, length 20–12000 (five-section prose as prompted). |
| **Validation** | `safeParseWrongAnswerExplanationText` after Traditional Chinese heuristics (simplified-character retry). |
| **Fallback** | `buildWrongAnswerExplanationFallback` — prefers `explanationSnapshot` from the bank; otherwise short deterministic guidance. |
| **API** | `POST /api/llm/explain-wrong-answer` returns `{ ok: true, explanationText, fallbackUsed }`. |

**Provider caveats:** Haiku may return simplified Chinese; one retry is attempted, then fallback. Missing `ANTHROPIC_API_KEY` does not throw — returns fallback and logs failure.

---

### 3. Lesson Markdown factory (`taskType: lesson_markdown`)

| | |
| --- | --- |
| **Prompt version** | `lesson-md-factory-v1` (`LESSON_MARKDOWN_PROMPT_VERSION` in `lesson-generator.ts`) |
| **Provider** | `completeChat` (gateway) |
| **Output** | Markdown with required H2 sections (`validateLessonMarkdownStructure`); not JSON-Zod. |
| **Fallback** | Generator returns `ok: false` and does not persist; admin flow should skip or retry — learner pages do not depend on this path. |

---

### 4. Adaptive hint / checkpoint feedback / weekly study plan (prompt bundles)

| | |
| --- | --- |
| **Location** | Prompt text and example JSON in `closed-loop-prompts.ts` |
| **Schemas** | `GuidedHintOutputSchema`, `CheckpointFeedbackOutputSchema`, `WeeklyStudyPlanOutputSchema` + `parseJsonFromLlmText` in `contracts.ts` |
| **Runtime** | Not yet wired through `completeChat` + validators in production routes documented here. |
| **Fallback helpers** | `buildGuidedHintFallback`, `buildCheckpointFeedbackFallback`, `buildWeeklyStudyPlanFallback` in `deterministic-fallbacks.ts` |

When implemented, **checkpoint** JSON from the model must not control `advanceAllowed`; copy `passed` from deterministic scoring and overwrite the field before the UI sees it.

---

### 5. Part 5 generate / verify (admin / tooling)

| | |
| --- | --- |
| **Schemas** | `Part5GeneratedItemSchema`, `Part5VerificationVerdictSchema` in `contracts.ts` |
| **Usage** | Parse provider JSON with `parseJsonFromLlmText` when integrating new call sites. |

---

## Frontend rule

Page components must not parse raw provider JSON. Use API routes + server modules that validate with Zod (or Markdown rules) and return plain strings or typed DTOs.

---

## Related files

- `src/lib/llm/contracts.ts` — Zod schemas and `TASK_PROMPT_VERSIONS`
- `src/lib/llm/deterministic-fallbacks.ts` — Fallback copy and checkpoint coach message (deterministic pass/fail)
- `src/lib/llm/gateway.ts` — `completeChat` + `gateway-exhausted` log
- `src/lib/llm/usage-log.ts` — Prisma `llm_usage_log` writer
