# Closed-loop upgrade matrix (repo audit)

**Purpose:** Orient a new engineer in ~10 minutes: what actually runs today, what is legacy or stubbed, what closed-loop design exists on paper vs in code, and what blocks a runtime closed loop.

**Scope note:** This file was produced by reading the paths listed in the audit prompt and cross-checking with `grep` / `prisma migrate diff`. **No `/learn` route exists** under `src/app/` (verified via glob).

---

## A. Active runtime path

**One-line data flow:** `QuestionBankItem` (bank) → `StudySession` + ordered `StudySessionQuestion` (a run) → `AnswerHistory` (per-answer log with snapshots); side effects update **`FsrsCardState` / `ReviewLog`** (FSRS), **`EloState`** (global + topic/item signals via `updateElo` in `src/lib/training.ts`), and **`LlmUsageLog`** on successful LLM API calls.

**Session composition:** `pickTrainingQuestionIds()` in `src/lib/training.ts` delegates to `composeSession()` in `src/lib/session-composer.ts` (due / reinforcement / new mix with Elo-weighted scoring)—**not** module- or skill-map-driven.

**Pages this path supports:**

| Area | Route(s) | Role |
|------|------------|------|
| Dashboard | `/` (`src/app/page.tsx`) | Counts, FSRS queue stats, ELO display, topic/grammar widgets (reads bank + sessions + answers + FSRS + ELO + optional `topic_mastery` rows) |
| Training | `/training` | Start session, answer, rate (FSRS), complete |
| Question bank | `/questions`, `/questions/new`, `/questions/[id]/edit` | CRUD on `QuestionBankItem` |
| Import | `/import`, `POST /import/submit` | JSON file import; CSV preview/commit via server actions |
| History | `/history` | Completed `StudySession` + `AnswerHistory` detail |
| Report | `/report` | Rolling 7-day stats from `StudySession` + `AnswerHistory` (not the `WeeklyReport` table) |
| APIs | `/api/export/*`, `/api/llm/*`, `/api/fsrs/stats` | Export, LLM helpers, FSRS stats |

---

## B. Legacy / secondary path

Technical read only—no value judgment.

| Model / area | App / script usage | Classification |
|--------------|-------------------|----------------|
| `LearningItem`, `QuestionItem`, `DailySession`, `SessionAnswer`, `ReviewQueue` | Primarily **`src/app/api/export/backup/route.ts`** (full DB backup serialization). No App Router CRUD pages found for these. | **Partial / transitional** — schema retained; main UI flow does not use them. |
| `ListeningSetLegacy`, `ListeningQuestionLegacy` | No matches in `src/` (schema comment: ship data only). | **Legacy / unused in runtime UI** |
| `ListeningSetV2`, `ListeningQuestionV2` | No matches in `src/`. | **Future stub** |
| `WeeklyReport` | `prisma.weeklyReport` only in **backup** export. `/report` uses `getWeeklyReportData()` → `StudySession` + `AnswerHistory`. | **Partial** — table exists; weekly page does not read it. |
| `ScoreHistory`, `TopicWeight` | Only **`backup` export** references in `src/`. | **Unused in main app flow** (possible future or abandoned features) |
| `User` | Only **`backup` export** in `src/`. | **Weak / ancillary** — not part of auth or dashboard queries |
| `TopicMastery` | **Read:** `TopicMasteryGrid`, ELO stats count. **Write:** no `create`/`update`/`upsert` in `src/`; `deleteMany` in `scripts/rebuild-personalized-phase1-bank.ts`. | **Partial / transitional** — dashboard can show empty or stale rows unless populated elsewhere (e.g. scripts / future wiring) |

---

## C. Route inventory

**Convention:** “Read/Write tables” name Prisma models (SQLite table names differ via `@@map`).

### App Router pages

| Path | Role | Read (typical) | Write (typical) | Active | Closed-loop target |
|------|------|----------------|-----------------|--------|---------------------|
| `/` | Dashboard: stats, due reviews, ELO, heatmaps | `QuestionBankItem`, `StudySession`, `AnswerHistory`, `FsrsCardState`, `ReviewLog`, `EloState`, `LlmUsageLog`, `topic_mastery` (read) | — | Yes | Yes — “next action” / curriculum would land here |
| `/training` | Train: pick questions, answer, FSRS rating | Same bank + session tables + FSRS + ELO | `StudySession`, `StudySessionQuestion`, `AnswerHistory`, `FsrsCardState`, `ReviewLog`, `EloState`, `LlmUsageLog` (if explain) | Yes | Yes — mode-aware sessions replace generic `composeSession` only |
| `/questions` | List/filter questions | `QuestionBankItem` | — | Yes | Yes — taxonomy alignment with skills |
| `/questions/new` | Create question | — | `QuestionBankItem` | Yes | Yes |
| `/questions/[id]/edit` | Edit/delete question | `QuestionBankItem` | `QuestionBankItem` (delete guarded) | Yes | Yes |
| `/import` | JSON paste + CSV preview/commit UI | — (commit reads staged data) | `QuestionBankItem` (import paths) | Yes | Yes — normalization must match skill map |
| `POST /import/submit` | JSON file upload → redirect | — | `QuestionBankItem` via `importQuestionBankJsonFile` | Yes | Yes |
| `/history` | Completed sessions | `StudySession`, `AnswerHistory`, `QuestionBankItem` | — | Yes | Yes — progress narrative |
| `/report` | 7-day rolling report + optional AI copy | `StudySession`, `AnswerHistory`, `QuestionBankItem` | — (LLM logs if client calls API) | Yes | Yes |

**Not present:** **`/learn`** — no folder under `src/app/learn` (closed-loop UX described in docs is not routed yet).

### API routes (`src/app/api`)

| Path | Role | Read | Write | Active | Closed-loop target |
|------|------|------|-------|--------|---------------------|
| `GET /api/export/questions` | CSV export of bank | `QuestionBankItem` | — | Yes | Secondary |
| `GET /api/export/history` | CSV export of answers | `AnswerHistory` | — | Yes | Secondary |
| `GET /api/export/backup` | JSON backup of many tables | Most models including legacy | — | Yes | Secondary |
| `GET /api/llm/weekly-report` | Generate weekly coaching text | Via `getWeeklyReportData` (sessions/answers) | `LlmUsageLog` on success | Yes (if keys) | Yes |
| `POST /api/llm/explain-wrong-answer` | Wrong-answer explanation | Question context | `LlmUsageLog` | Yes (if keys) | Yes |
| `POST /api/llm/generate-part5`, `verify-part5`, `generate-and-verify` | Part 5 generation pipeline | — | `LlmUsageLog` | Yes (if keys) | Partial |
| `GET /api/fsrs/stats` | FSRS queue stats | FSRS-related tables | — | Yes | Yes |

---

## D. Closed-loop docs already present

| Asset | Location | Status |
|-------|----------|--------|
| Skill map & taxonomy gaps | `docs/closed-loop/phase1-skill-map.md` | **Documentation** |
| Architecture & data-model direction | `docs/closed-loop/technical-design.md` | **Documentation** |
| Milestone roadmap | `docs/closed-loop/delivery-plan.md` | **Documentation** |
| Prompt inventory & contracts | `docs/closed-loop/prompt-pack.md` | **Documentation** |
| Index | `docs/operator-manual/closed-loop-README.md` (see also `docs/closed-loop/README.md`) | **Documentation** |
| Phase 1 module definitions | `src/content/programs/phase1/` (`modules.ts`, `skill-map.ts`, `types.ts`) | **TS data / scaffolding** — not wired to `composeSession` or routes |
| Closed-loop prompt builders | `src/lib/llm/closed-loop-prompts.ts` | **TS scaffolding** — **no imports** from other `src/` files found (`grep` for `closed-loop-prompts` returns none) |
| Shared LLM types | `src/lib/llm/types.ts` | **TS scaffolding** — used when wired |

**README (`README.md`):** Accurately describes the **current** trainer (dashboard, bank, import, training, history, report, exports, optional LLM). It already states listening UI is not first-class and notes legacy schema tables.

---

## E. Schema / migration risk

**Checks run (2026-04-20 workspace):**

- `npx prisma validate` — **schema valid**
- `npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script` — output **`-- This is an empty migration.`** (migrations folder matches current `schema.prisma`)

**Interpretation:** Checked-in migrations, when applied in order, reproduce the current datamodel. **No drift** was detected between migration history and `prisma/schema.prisma` by Prisma’s diff tool.

**Residual risk (operational, not schema drift):**

- **`DATABASE_URL`:** README notes Prisma CLI expects `.env.local` / `.env` for migrations; runtime defaults to `file:./dev.db` in `src/lib/prisma.ts` if unset — new clones must align env with the DB file they migrate.
- **SQLite + libSQL:** Adapter stack is non-default; still consistent if `npm install` + `prisma migrate deploy` + same `DATABASE_URL` are used.

---

## F. Hard blockers before closed-loop runtime

| Blocker | What is missing / gap | If skipped, what breaks |
|---------|------------------------|-------------------------|
| **State layer** | No DB (or durable) **program/module progress**, checkpoint completion, or “current module” pointer. Phase 1 content lives in **files** only. | Cannot drive “resume module 2 lesson B” or persist closed-loop state across devices without new tables or conventions. |
| **Taxonomy normalization** | Skill map and `notes` / topic strings can diverge (`question-taxonomy.ts` vs import vs manual). | Session selection, reporting, and LLM prompts will **split across inconsistent labels**; analytics become untrustworthy. |
| **`/learn` flow** | Route and page shell **do not exist**; Sidebar has no Learn link. | Learner-facing curriculum UX from the design docs cannot ship as a first-class flow. |
| **Dashboard “next action”** | Dashboard shows aggregates (due count, ELO, etc.) but **no** orchestrated “do this next” from `PHASE1_MODULES` / diagnostics. | Closed-loop “planner” value is invisible; user stays in generic training. |
| **Planner / mode-aware session composition** | `StudySession.mode` defaults to `"quick"`; `composeSession()` is **FSRS/Elo-weighted**, not module/diagnostic/drill/checkpoint aware. | Technical design’s session modes stay **unimplemented** at the composer/training action layer. |
| **Testing evidence** | Scripts (`test:fsrs`, `smoke:csv-import`, `test:llm-env`) but **no automated CI test suite** in `package.json` for app routes. | Regressions in training/import/history are caught only manually; refactors for closed loop are high-risk. |

---

## G. Suggested next steps (top 5)

1) **Persist minimal program state (module pointer + checkpoint/diagnostic outcomes)** in SQLite (or strictly versioned JSON with migration story) and read it on `/` and training entry.  
**Why:** Closed loop requires durable “where am I in the curriculum.”  
**If skipped:** File-only `PHASE1_MODULES` stays documentation; runtime cannot branch.

2) **Normalize topic/skill keys** across bank CRUD, JSON/CSV import, and dashboard filters (single source of truth aligned with `src/content/programs/phase1/skill-map.ts`).  
**Why:** Composer and LLM contracts assume stable taxonomy.  
**If skipped:** Mode-aware selection and reports will disagree with the skill map.

3) **Add `/learn` (shell) + nav entry** wired to the same auth-less local model; show module list from `PHASE1_MODULES` even before full planner.  
**Why:** Delivers visible closed-loop surface area.  
**If skipped:** Design docs and TS content stay orphaned from user navigation.

4) **Replace or wrap `composeSession()` with a mode-aware API** (`quick` vs `diagnostic` vs `lesson_drill` etc.) that reads program state + skill map; keep FSRS/Elo as engines inside modes.  
**Why:** Technical design’s core behavioral change.  
**If skipped:** All sessions remain the same “weighted quick session.”

5) **Wire `closed-loop-prompts.ts` to one LLM route** (e.g. diagnostic debrief or micro-lesson) behind a feature flag or env.  
**Why:** Proves prompt pack + `types.ts` contracts in production path.  
**If skipped:** Prompt pack remains dead code; LLM work stays on legacy Part 5 / explain flows only.

---

## Appendix: Files read for this audit

**Required / explicit:** `prisma/schema.prisma`; all `prisma/migrations/**/migration.sql` (9 migrations); `src/app/page.tsx`; `src/app/questions/**`; `src/app/training/**`; `src/app/history/page.tsx`; `src/app/report/page.tsx`; `src/app/import/**`; `src/lib/training.ts`; `src/lib/session-composer.ts`; `src/lib/fsrs.ts` (referenced from training); `src/lib/elo.ts`; `src/lib/question-management.ts`; `src/lib/import.ts`; `src/lib/import/csv-commit.ts`; `docs/closed-loop/**`; `README.md`; `package.json`.

**Additional verification:** `src/components/layout/Sidebar.tsx` (nav), `src/lib/dashboard.ts`, `src/lib/report.ts`, `src/lib/history.ts`, `src/app/api/**/route.ts` listing, `src/content/programs/phase1/modules.ts` (sample), `prisma/migration_lock.toml`, grep for legacy models and `closed-loop-prompts` imports.

**Does not exist (must-read list):** No `src/app/learn/**` (user asked to note if missing).
