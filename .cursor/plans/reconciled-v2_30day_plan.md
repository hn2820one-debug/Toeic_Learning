# TOEIC Trainer — Reconciled 30-Day Plan **v2.0**

**Status**: Phase A-C shipped, Phase D partial (24/50 seed items), Phase D2 scaffolded, Phase E (this doc) in place.
**Date**: 2026-04
**Supersedes parts of**: `Final v1.0` (ChatGPT plan) where architectural conflicts existed with the Phase 1 content programs.

> This file is the *system-of-record* for how ChatGPT's Final v1.0 plan actually landed in code. When the two documents disagree, **this file wins** for implementation purposes; the ChatGPT plan remains the strategic/pedagogical reference.

---

## 1. Key architectural decision: dual-axis taxonomy

ChatGPT's Final v1.0 tried to cram 58 fine-grained skill codes (e.g. `grammar_svc`, `vocab_medical`, `strat_p5_timing`) into `LearningTopic.topicKey`. That field is already occupied by the 12 Phase 1 business scenarios:

```
Phase1TopicKey = office | notices | meetings | coordination | hr | finance
               | operations | marketing | logistics | tech | communication | healthEnv
```

These 12 keys are wired into `/learn/[topicId]`, `/practice`, `/test`, `/warmup`, `UserTopicProgress`, `LessonPracticeItem`, `LearningSession.topicKey`, and many loaders/actions that gate on `isPhase1TopicKey()`. Overloading `topicKey` with 58 new codes would have silently broken every one of these.

**Resolution (accepted by user)**: introduce a second, orthogonal axis.

```
axis 1: SCENARIO  (Phase1TopicKey, 12 values)   ← unchanged
axis 2: SKILL     (LearningSkill.skillCode, 58) ← new

a QuestionBankItem = one scenario × one primary skill (+ optional extra skills)
```

A Day N 30-day activity says "target skill = `grammar_svc`" and the runtime picks the best scenario (e.g. `tech`, `office`) at execution time, routing through the existing Phase 1 UI.

---

## 2. Schema delta (Prisma)

New models (non-destructive, applied via `prisma db push` because of prior migration drift):

| Model | Purpose |
|---|---|
| `LearningSkill` | 58 rows. Fine-grained skill taxonomy across `grammar` / `vocabulary` / `phrase` / `strategy`, with `priority`, `toeicScoreBand`, `partXFrequency`, `parentSkillKey`, `recommendedWeek`, `within30DayPlan`, `learnPrereqJson`, `learnUnlocksJson`. |
| `Passage` | Part 6/7 passage container. 1-to-many with `QuestionBankItem`. |
| `QuestionVariant` | Links an original item to generated variants (`vocabulary_swap` / `scenario_change` / `difficulty_adjust`). |
| `StudyPlan` | A user's 30-day (or other) path. `plannedSkillsJson`, `baselineScore`, `targetScore`, `status`. |
| `DailyPlanItem` | One row per Day 1-30. `dayType` A/B/C/D/special, `primarySkillCode`, `activitiesJson`, `completed`, `cognitiveLoad`. |

`QuestionBankItem` selectively expanded with:

- `part` (Int, default 5)
- `primaryLearningSkillCode` → FK-like pointer to `LearningSkill`
- `additionalLearningSkillsJson` (array of skill codes)
- `coreRule`, `recognitionSignal`
- `hint1`, `hint2`, `hint3`
- `distractorAnalysisJson` (per-choice `{ type, whyPlausible, whyWrong }`)
- `registerLevel`, `industryFocus`
- `passageId`, `positionInPassage`
- `generatedBy`, `verifiedBy`, `verifiedAt`

**Deliberately NOT added** (to avoid duplicating existing axes):
- `scenarioContext` → use existing `topicKey`
- `subTopic` / `primaryGrammarPoint` → replaced by `primaryLearningSkillCode`
- `vocabFocus` → replaced by `additionalLearningSkillsJson`
- `falseFriendsWith` → deferred; belongs on a dedicated relation, not a JSON column

---

## 3. Seed data status

| Dataset | Count | File |
|---|---|---|
| LearningSkill rows | 58 | `prisma/seed-data/learning-skills.ts` |
| 30-day plan template | 30 | `prisma/seed-data/thirty-day-plan.ts` |
| StudyPlan + DailyPlanItem for dev user | 1 + 30 | seeded at `prisma/seed.ts` runtime |
| Hand-authored Priority 1 bank | **24 / 50** | `prisma/seed-data/thirty-day-bank.ts` (SVC, SVOO, diagnostic, medical vocab, misc grammar) |

Remaining 26 Priority 1 items + all Week 2-4 items → LLM pipeline (Phase D2 scaffolded, not yet batch-run).

---

## 4. UI shipped

- **`/studyplan` page** (`src/app/studyplan/page.tsx`): header with baseline/target/progress, spotlight on today's day, grid of all 30 days with completion toggles.
- **`StudyPlanDayActions`** client component: calls `toggleDayComplete` / `startPlan` server actions.
- **Sidebar link** "30 日計劃 / 30-Day Plan" (`CalendarCheck` icon).
- **Data loader**: `src/lib/study-plan/loader.ts` resolves skill labels from `LearningSkill` and computes `currentDayNumber`.

---

## 5. LLM pipeline — Reconciled v2 prompt

Scaffolded but not yet batch-executed:

- `buildPart5GenerationV2Prompt` (in `src/lib/llm/prompt-templates.ts`) — accepts `targetSkillCode`, `skillLabelZh/En`, `skillCategory`, `difficulty`, `scenarioTopicKey`, `industryFocus`. Demands output with `coreRule`, `recognitionSignal`, `hint1-3`, `distractorAnalysis` keyed A-D.
- `generatePart5ItemV2WithGemini` (in `src/lib/llm/gemini-generate.ts`) — parallel to v1, returns `Part5GeneratedItemV2`.
- `Part5GeneratedItemV2` type (in `src/lib/llm/types.ts`) — includes the 9 distractor types and full payload.
- `PART5_GENERATION_V2_PROMPT_VERSION = "part5-generate-v2-reconciled"` for usage logging.

**Next**: wire this into an admin batch endpoint (`/admin/bank/generate-v2?skillCode=grammar_svc&count=20&scenario=tech`) that writes directly into `QuestionBankItem` with the full v2 payload, then passes through `claude-verify` for confidence gating.

---

## 6. Deferred from Final v1.0

These items remain strategically endorsed but not yet implemented:

1. **Passage batch authoring** — `Passage` model exists but zero rows. Week 4 Mini-Mock (Day 26) needs ~8 Part 6 passages + 5 Part 7 short passages.
2. **Variant generator** — `QuestionVariant` model exists but there is no job spawning variants from frequently-missed items. Target: auto-generate 2-3 variants per item with correctness rate <50% across ≥3 attempts.
3. **TOEIC score estimator on dashboard** — the formula from Final v1.0 §7.3 not yet wired to the dashboard card.
4. **Mini Mock (Day 26) & Full Mock (Day 29) content packs** — need ~40 and ~56 item templates assembled into runnable test configurations.
5. **Strategy category (8 skills)** — present in `LearningSkill` taxonomy but no lesson content authored yet.
6. **Phase1 → LearningSkill backfill** — existing `QuestionBankItem` rows do not yet have `primaryLearningSkillCode` filled. A one-shot migration job should map `skillKey` → best-fit `LearningSkill.skillCode` using `LearningSkill.parentSkillKey`.

---

## 7. Migration strategy notes

- `prisma migrate dev` was blocked by drift from prior manual schema edits. We used `prisma db push` to apply Reconciled v2 models non-destructively after backing up `dev.db`. Future schema evolution should **baseline** the database (`prisma migrate resolve --applied …`) before re-enabling `migrate dev`, or continue with `db push` until a clean migration snapshot is cut.
- `dev.db` backup lives at the workspace root (`dev.db.<timestamp>.bak`). Do not delete until Reconciled v2 ships.

---

## 8. Checklist — what was actually merged this round

- [x] `prisma/schema.prisma` — 5 new models + QuestionBankItem expansion
- [x] `db push` applied, generated client regenerated, `npm run build` clean
- [x] `prisma/seed-data/learning-skills.ts` — 58 rows
- [x] `prisma/seed-data/thirty-day-plan.ts` — 30 DailyPlanItem templates
- [x] `prisma/seed-data/thirty-day-bank.ts` — 24 hand-authored items
- [x] `prisma/seed.ts` upserts all of the above for dev user
- [x] `/studyplan` page + server actions + sidebar link
- [x] Reconciled v2 LLM prompt + Gemini v2 generator (scaffold; not batch-run)
- [x] This plan document

- [ ] Remaining 26 Priority 1 hand-author items
- [ ] Week 2-4 LLM batch generation run
- [ ] Passage authoring + linking
- [ ] Variant job
- [ ] Score estimator on dashboard
- [ ] Strategy-category lessons
