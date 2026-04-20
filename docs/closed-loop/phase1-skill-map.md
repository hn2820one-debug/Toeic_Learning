# Phase 1 Skill Map

## Purpose

This document defines the **canonical Phase 1 skill map** for the closed-loop TOEIC upgrade. It is the bridge between the current question bank and the future `diagnostic -> lesson -> drill -> checkpoint -> review` program flow.

The live code definitions are stored in:

- `src/content/programs/phase1/types.ts`
- `src/content/programs/phase1/skill-map.ts`
- `src/content/programs/phase1/modules.ts`

## Current bank baseline

The personalized Phase 1 seed bank currently contains **99 items**:

- Vocabulary: 40
- Grammar: 32
- Reading: 27

Difficulty mix:

- A: 39
- B: 40
- C: 20

Topic spread:

- `文書作業 / Office Admin`: 13
- `財務會計 / Finance & Accounting`: 12
- `公告訊息 / Announcements`: 9
- `商務會議 / Business Meetings`: 9
- `業務協調 / Coordination`: 9
- `人事與招募 / HR & Recruitment`: 8
- `企業經營 / Business Operations`: 7
- `貿易物流 / Trade & Logistics`: 7
- `溝通表達 / Communication`: 7
- `科技系統 / Technology & Systems`: 6
- `行銷與宣傳 / Marketing & Sales`: 4
- `醫療環境 / Health & Environment`: 4
- `日常生活 / Daily Life & Travel`: 4

## Canonical topic dictionary

The current bank already uses a stable topic layer via the seed data. Phase 1 should keep these 13 topics as the canonical topic dictionary:

- `office` -> `文書作業 / Office Admin`
- `notices` -> `公告訊息 / Announcements`
- `meetings` -> `商務會議 / Business Meetings`
- `coordination` -> `業務協調 / Coordination`
- `hr` -> `人事與招募 / HR & Recruitment`
- `finance` -> `財務會計 / Finance & Accounting`
- `operations` -> `企業經營 / Business Operations`
- `marketing` -> `行銷與宣傳 / Marketing & Sales`
- `logistics` -> `貿易物流 / Trade & Logistics`
- `tech` -> `科技系統 / Technology & Systems`
- `communication` -> `溝通表達 / Communication`
- `healthEnv` -> `醫療環境 / Health & Environment`
- `daily` -> `日常生活 / Daily Life & Travel`

## Canonical skill families

Phase 1 should not route by raw topic alone. It should route by **skill family**, with topic acting as supporting context.

### Vocabulary

- `vocabulary.document-workflow`
  - Sub-focus: `片語動詞 / Phrasal verbs`, `固定搭配 / Fixed expressions`
  - Main topics: office, coordination, operations
  - Why: This is the safest beginner-to-intermediate business language foundation.

- `vocabulary.formal-register`
  - Sub-focus: `正式書面語 / Formal register`, `商務搭配 / Business collocation`
  - Main topics: office, meetings, finance, communication
  - Why: This skill helps learners choose the option that sounds professionally natural.

- `vocabulary.domain-and-abstract-meaning`
  - Sub-focus: `領域字彙 / Domain vocabulary`, `抽象字義 / Abstract meaning`
  - Main topics: finance, tech, health, daily
  - Why: This is where weaker learners often collapse once the topic moves away from office basics.

### Grammar

- `grammar.verb-control`
  - Sub-focus: `動詞時態 / Verb tense`, `被動語態 / Passive voice`, `主詞動詞一致 / Subject-Verb Agreement`
  - Main topics: office, meetings, coordination, finance, operations
  - Why: This is the most important Phase 1 grammar backbone.

- `grammar.pattern-control`
  - Sub-focus: `動名詞與不定詞 / Gerund vs. Infinitive`, `介系詞與固定搭配 / Prepositions & patterns`
  - Main topics: office, coordination, finance, communication
  - Why: These are classic “I understand the meaning but still picked the wrong form” errors.

- `grammar.sentence-linking`
  - Sub-focus: `關係子句 / Relative clauses`, `連接詞與邏輯 / Conjunctions & logic`, `used to 系列 / Used to family`, `分詞修飾 / Participles`
  - Main topics: notices, meetings, operations, communication
  - Why: This family prepares the learner for longer and denser TOEIC sentence structures.

### Reading

- `reading.detail-retrieval`
  - Sub-focus: email / meeting / HR / finance / logistics / technical / short-document detail labels
  - Why: This should become the learner's “anchor to text evidence” skill.

- `reading.purpose-and-intent`
  - Sub-focus: notice purpose, email purpose, writer intent, process-change purpose, general purpose
  - Why: This skill turns reading from literal decoding into communicative interpretation.

- `reading.inference-and-process-logic`
  - Sub-focus: notice inference, process inference, outcome inference, cause inference, complaint reason, general inference
  - Why: This is the reading family that most strongly resembles real TOEIC pressure.

- `reading.contextual-meaning`
  - Sub-focus: `語境字義 / Vocabulary in context`
  - Why: This connects reading and vocabulary remediation inside one loop.

## Why this skill map is practical now

This skill map is intentionally built on **existing metadata**:

- `topic`
- `difficulty`
- `notes` parsed through `src/lib/question-taxonomy.ts`
- `priorKnown`

That means the system can launch a first closed-loop program without first redesigning the whole database.

## Normalization gaps to fix early

This is the most important implementation warning.

### 1. Manual create / edit drops taxonomy

`src/lib/question-management.ts` only persists `validateQuestionFields(...)` output. That means:

- no `notes`
- no category
- no sub-focus
- no `priorKnown`

Result:

- manually created questions are valid for training,
- but they are not safe for future skill-based routing or module assignment.

### 2. JSON import cannot preserve skill metadata

`src/lib/import.ts` imports the normalized base fields only:

- `questionText`
- options
- `correctAnswer`
- `explanation`
- `topic`
- `difficulty`

It does **not** preserve:

- `notes`
- category
- sub-focus
- `priorKnown`

Result:

- JSON import is fine for raw bank growth,
- but not for closed-loop curriculum quality unless the importer is extended.

### 3. CSV import writes `notes` in a non-canonical way

`src/lib/import/csv-commit.ts` currently maps `grammarPoints` into `notes` as a comma-joined raw string.

That means CSV import can produce:

- good human-readable notes,
- but not necessarily the canonical format from `formatQuestionNotes(...)`.

Result:

- imported CSV rows may look classified,
- but parsing and module routing can become inconsistent.

### 4. Session composition does not use skill families yet

`src/lib/session-composer.ts` already uses:

- FSRS due state
- reinforcement logic
- ELO
- topic interleaving

It does **not** yet use:

- category
- sub-focus
- canonical skill keys
- module membership

Result:

- the current app is adaptive,
- but it is not yet pedagogically staged.

## Recommended normalization order

1. Keep `topic` as-is.
2. Preserve current human-readable `notes` for display.
3. Add a stable `skillKey` layer for routing.
4. Make manual create/edit and both import paths either:
   - write canonical taxonomy directly, or
   - map incoming content through one normalization helper before persistence.

## Recommended first operational use

The skill map should drive four things first:

1. diagnostic recommendations
2. lesson module targeting
3. drill session composition
4. checkpoint pass / remediation rules

FSRS and ELO should remain the memory and adaptation layer underneath that structure.
