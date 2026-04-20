# Content QA flow (lesson / hint / explanation)

This flow hardens AI-generated or AI-assisted learning content with deterministic checks before persistence/runtime display.

## Scope

- Lesson markdown quality gate
- Practice hint quality gate
- Explanation fallback minimum structure
- Script-based QA reports + artifacts

No heavy CMS/admin UI is introduced in this phase.

## Runtime principles

1. Never trust generated content directly.
2. Validate first, then decide `approved` / `qa_failed` / `needs_regen`.
3. When QA fails, runtime must degrade gracefully and never crash `/learn` or `/practice`.

## Status model

Current phase uses derived/in-report statuses (no schema migration yet):

- `draft`
- `qa_failed`
- `approved`
- `needs_regen`

If DB fields are added later, map to:

- `Lesson.qaStatus`
- `Lesson.qaNotes`
- `Lesson.generatedBy`
- `Lesson.promptVersion`
- `LessonPracticeItem.hintQaStatus` (optional)

## Rule layers

## A) Lesson structure validation

Implemented in `validateLessonStructure()` (`src/lib/content-qa-rules.ts`):

- Traditional Chinese as primary language
- Has title (`#` or `##`)
- Required sections:
  - `## 核心規則`
  - `## 識別信號`
  - `## 例句`
  - `## 常見錯誤`
- At least one of:
  - `## 應試提示`
  - `## 快速自測`
- Length guardrails (too short / too long)
- Detect excessive vague encouragement/filler lines

Lesson generator (`src/lib/llm/lesson-generator.ts`) now applies this QA after heading checks. QA failure blocks persistence (`ok: false`) and marks status in result.

## B) Hint quality validation

Implemented in `validateHintSet()`:

- non-empty `hint1/2/3`
- no duplicates
- progressive depth (heuristic length + information density)
- `hint1` must not leak answer
- reject low-information filler hints

Runtime integration:

- `src/lib/llm/adaptive-hint.ts` runs hint generation + QA gate
- on QA fail, deterministic fallback hints are returned
- practice loaders/actions consume adaptive hints, not raw hint-builder output directly

## C) Explanation fallback quality

`getFallbackExplanation()` guarantees minimum usable structure:

1. 正解是什麼
2. 為什麼
3. 常見錯誤原因

Practice answer reveal now uses this fallback builder when needed, so explanation never returns empty.

## D) Review/approval flow (script-first)

No new DB field in this phase; scripts output status + issues:

- `scripts/qa-lessons.ts`
- `scripts/qa-hints.ts`

Artifacts:

- `artifacts/lesson-qa-report.json`
- `artifacts/hint-qa-report.json`

Each report includes:

- total scanned
- passed
- failed
- warnings
- sample issues

## E) Commands

- `tsx scripts/qa-lessons.ts`
- `tsx scripts/qa-hints.ts`

Both commands are deterministic and can run locally/dev-only before content regeneration.

