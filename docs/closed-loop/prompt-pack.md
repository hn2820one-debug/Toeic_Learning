# Closed-Loop Prompt Pack

## Purpose

This document defines the new prompt surfaces needed for the closed-loop TOEIC system.

The corresponding code scaffolding lives in:

- `src/lib/llm/closed-loop-prompts.ts`
- `src/lib/llm/types.ts`

## Prompt design principles

### 1. JSON-first contracts

Every new closed-loop prompt should return **strict JSON** with:

- one known version string
- one clearly defined output contract
- no markdown fences
- no extra commentary

### 2. Traditional Chinese learner voice

All learner-facing explanation fields should be written in:

- Traditional Chinese
- concise coaching tone
- non-technical language

### 3. Prompt output is advisory unless explicitly deterministic

Prompt output can:

- explain
- recommend
- coach
- scaffold

Prompt output must **not** be the source of truth for:

- checkpoint passing
- module unlocking
- question selection membership

### 4. Graceful fallback is required

Every prompt surface should have:

- no-key fallback
- provider-error fallback
- invalid-JSON fallback

The learner must still be able to continue the study loop.

## Task taxonomy

The LLM task taxonomy now includes:

- `generate`
- `verify`
- `explain`
- `weekly_report`
- `diagnostic`
- `lesson`
- `hint`
- `checkpoint_feedback`
- `study_plan`

These are defined in `src/lib/llm/types.ts`.

## Prompt inventory

### 1. `diagnostic-skill-analyzer-v1`

Code builder:

- `buildDiagnosticSkillAnalyzerPrompt(...)`

Purpose:

- analyze recent learner signals
- recommend the next module
- identify weak and emerging skills

Input should include:

- phase key
- candidate modules
- weak skill signals
- emerging skill signals
- recent accuracy
- due review count

Output contract:

- `weakSkills[]`
- `emergingSkills[]`
- `recommendedModuleKey`
- `confidence`
- `reasoningSummaryZh`

Use when:

- initial diagnostic finishes
- learner retries a module
- system wants to refresh next-best-action recommendation

## 2. `micro-lesson-writer-v1`

Code builder:

- `buildMicroLessonWriterPrompt(...)`

Purpose:

- generate a short, skill-specific lesson block
- convert weak-skill evidence into teachable explanations

Input should include:

- `skillKey`
- `targetLevel`
- learner weak spots
- 2 to 4 representative questions

Output contract:

- `lessonTitleZh`
- `coreRuleZh`
- `whyThisMattersZh`
- `workedExamples[]`
- `commonTraps[]`
- `miniCheck[]`
- `reviewSummaryZh`

Use when:

- opening a new module lesson
- regenerating a short lesson after checkpoint failure

## 3. `guided-hint-v1`

Code builder:

- `buildGuidedHintPrompt(...)`

Purpose:

- make drill mode educational instead of purely evaluative
- scaffold attention without immediately revealing the answer

Input should include:

- `skillKey`
- `hintDepth`
- question stem
- answer choices
- optional learner choice
- optional correct answer
- optional explanation snapshot

Output contract:

- `hintLevel1`
- `hintLevel2`
- `hintLevel3`
- `doNotRevealAnswerYet`

Use when:

- learner is in `lesson_drill`
- learner requests a hint
- system wants to offer progressive scaffolding

## 4. `checkpoint-feedback-coach-v1`

Code builder:

- `buildCheckpointFeedbackCoachPrompt(...)`

Purpose:

- summarize checkpoint results in human language
- translate pass / fail results into a retry plan

Input should include:

- module key
- pass threshold
- actual accuracy
- skills to review
- representative mistakes

Output contract:

- `resultLabel`
- `skillsToReview[]`
- `retryPlan[]`
- `advanceAllowed`
- `coachMessageZh`

Use when:

- checkpoint finishes
- learner needs one clear remediation message

## 5. `weekly-study-plan-v2`

Code builder:

- `buildWeeklyStudyPlanPrompt(...)`

Purpose:

- turn weekly metrics into a practical study plan
- connect due reviews, weak skills, and module progression

Input should include:

- current module
- due review count
- recent accuracy
- weak skill signals
- checkpoint readiness summary
- next module candidates

Output contract:

- `recommendedModuleKey`
- `reviewBlockZh`
- `drillBlockZh`
- `checkpointReadinessZh`
- `weeklyTargetZh`

Use when:

- weekly report loads
- learner opens dashboard after several sessions

## Suggested runtime placement

### New helper file

- `src/lib/llm/closed-loop-prompts.ts`

### Likely future runtime files

- `src/lib/llm/diagnostic.ts`
- `src/lib/llm/lesson.ts`
- `src/lib/llm/hints.ts`
- `src/lib/llm/checkpoint-feedback.ts`
- `src/lib/llm/study-plan.ts`

### Likely future API routes

- `src/app/api/llm/diagnostic/route.ts`
- `src/app/api/llm/lesson/route.ts`
- `src/app/api/llm/hint/route.ts`
- `src/app/api/llm/checkpoint-feedback/route.ts`
- `src/app/api/llm/study-plan/route.ts`

## Operational rules

### Diagnostic prompt

- may recommend a module
- may not decide pass / fail by itself

### Lesson prompt

- may explain and structure content
- may not invent unsupported learner performance data

### Hint prompt

- should avoid direct answer reveal until the final allowed hint level
- should bias toward attention guidance, not answer leakage

### Checkpoint feedback prompt

- must reflect deterministic pass threshold
- must not contradict the actual result

### Weekly study plan prompt

- should recommend one module and one weekly target
- should not output an unrealistic plan that ignores due-review load

## Fallback behaviors

### No LLM key

Return deterministic app-generated content:

- diagnostic: rule-based module recommendation
- lesson: template lesson from module file
- hint: static skill-based hint ladder
- checkpoint feedback: template result message
- weekly plan: rule-based next-step summary

### Provider error

- preserve learner progress
- record failure in `LlmUsageLog`
- show lightweight fallback text

### Invalid JSON

- do not pass malformed content directly to the UI
- retry only if policy allows
- otherwise show fallback

## Validation checklist

Before wiring any new prompt into the live app:

1. verify the builder output contains a stable version string
2. verify the prompt requires strict JSON only
3. verify the output contract is represented in `src/lib/llm/types.ts`
4. verify there is a fallback path without provider success
5. verify learner-facing text is Traditional Chinese

## Recommended rollout order

1. `guided-hint-v1`
2. `diagnostic-skill-analyzer-v1`
3. `checkpoint-feedback-coach-v1`
4. `weekly-study-plan-v2`
5. `micro-lesson-writer-v1`

This order gives the closed-loop system useful scaffolding early while keeping lesson-generation risk under control.
