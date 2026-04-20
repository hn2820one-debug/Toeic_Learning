# TOEIC Trainer

## 1. Project overview

**TOEIC Trainer** is a personal, local-first web app for TOEIC-style multiple-choice practice. It uses **Next.js 14 (App Router)**, **Prisma 7**, and **SQLite** (via the libSQL adapter). The app is past the “empty scaffold” stage: it has a working **dashboard**, **question bank with CRUD**, **JSON and CSV import**, **training with FSRS ratings**, **session history**, **weekly report**, **HTTP export APIs**, and **optional LLM-assisted features** (generation, verification, explanations, weekly narrative) when API keys are configured.

**Maturity (honest):** Solid for **self-hosted daily study** on your machine: data stays in SQLite, core flows are implemented end-to-end. LLM features depend on external APIs, quotas, and keys—treat them as **optional enhancements**, not guaranteed production services. Listening content exists in the **schema** as legacy/stub models; the **current UI workflow** is centered on **reading-style** `QuestionBankItem` training, not a full listening player.

**Major workflows today:**

- Browse and manage questions; import batches (JSON or CSV); optionally rebuild the **personalized Phase 1 bank** from seed data.
- Start **training**: questions are drawn from `QuestionBankItem`, answers and FSRS/ELO updates are persisted.
- Review **history** and a rolling **7-day report** (with optional Gemini-powered weekly copy if configured).
- **Export** questions, history, or a full DB backup over HTTP (with localhost or shared-secret protection).

---

## 2. Current core features

- **Dashboard:** Summary stats (e.g. bank size, due reviews, recent activity), grammar/topic-oriented widgets where data exists. Bilingual UI labels (Chinese + English) on main pages.
- **Question bank:** List, filter, and search by text, topic, and difficulty; search also matches **`notes`** (classification strings).
- **Create / edit / delete:** `/questions/new` and `/questions/[id]/edit` with validation; delete is guarded by usage rules.
- **JSON import:** `/import` — paste or upload fixed-shape JSON; validates, normalizes, skips duplicates.
- **CSV import:** Same page: **Preview** then **Commit** via server-side parsing (multipart form and server actions); avoids fragile client-side file reading issues.
- **Training:** Session-based flow; reveal answer; FSRS rating buttons; ties into scheduling state.
- **History:** Completed sessions with per-answer detail.
- **Weekly report:** Rolling window summary; may call an LLM for narrative text when configured.
- **Export routes:** `GET /api/export/questions`, `GET /api/export/history`, and `GET /api/export/backup` — see **Export API** below.
- **LLM routes:** Under `/api/llm/` — for example Part 5 generate/verify, explain wrong answer, weekly report helper. Successful calls log usage in `LlmUsageLog`.
- **Personalized Phase 1 bank:** Large curated bank in `prisma/seed-data/personalized-phase1-bank.ts`. A full reset and reload uses `npm run db:rebuild-phase1-bank` (this is **destructive** to runtime learning data — read warnings in this README and in the script before use).
- **Listening schema:** `ListeningSetLegacy` and `ListeningQuestionLegacy` (legacy-oriented) and `ListeningSetV2` / `ListeningQuestionV2` (stub for future). There is **no first-class listening practice UI** in the current trainer flow.

---

## 3. Architecture summary

**Source of truth for the main trainer:** **`QuestionBankItem`** (table `questions`). All training, history snapshots, and FSRS card state refer to these rows.

**Session model:**

- **`StudySession`** — one training run (timestamps, counts, mode).
- **`StudySessionQuestion`** — ordered questions in that session (links session ↔ question).
- **`AnswerHistory`** — one row per answered question with snapshots for reproducibility.

**FSRS:** `FsrsCardState` + `ReviewLog` + `FsrsParams` — spaced repetition state per question (via `ts-fsrs`).

**ELO:** `EloState` — user/item style ratings for adaptive signals.

**LLM:** `LlmUsageLog` stores token/cost/latency metadata for server-side LLM calls.

**Active vs legacy / secondary models:** The schema still contains **older or parallel** structures (`LearningItem`, `QuestionItem`, `DailySession`, `SessionAnswer`, `ReviewQueue`, etc.) from earlier designs. **The App Router pages documented here use `QuestionBankItem` + `StudySession` flows.** Do not assume every table has a visible UI.

**Classification without schema migration:** The optional **`notes`** field on `QuestionBankItem` often holds a structured label such as `字彙 / Vocabulary | …` or `文法 / Grammar | …` (see `src/lib/question-taxonomy.ts`). This drives badges on `/questions` and keeps grammar stats coherent—**do not treat arbitrary free text in `notes` as grammar points.**

---

## 4. Development setup

### Prerequisites

- **Node.js 20+** (recommended)
- **npm**

### Install

```bash
npm install
```

`postinstall` runs `prisma generate` so the client in `generated/prisma` matches the schema.

### Environment files

Prisma CLI reads **`DATABASE_URL`** from **`.env.local`** first, then **`.env`** (`prisma.config.ts`). The runtime Prisma client defaults `DATABASE_URL` to `file:./dev.db` if unset (`src/lib/prisma.ts`), but **migrations** expect the variable to be set for consistency.

Place secrets in **`.env.local`** (preferred for local dev) or **`.env`**. Never commit real keys.
Use **`.env.example`** as the baseline template for a fresh setup.

### Run dev

```bash
npm run dev
```

Opens **http://127.0.0.1:5173** (port **5173** avoids common Windows reserved port issues—see older README note).

### Production build

```bash
npm run build
```

### Production server

```bash
npm run start
```

Uses Next’s default (**port 3000** unless `PORT` is set). Do not assume 5173 for `next start`.

### Smoke / utility scripts (selected)

- **`npm run smoke:csv-import`** — end-to-end CSV import smoke (server conditions); inserts and removes tagged rows.
- **`npm run test:llm-env`** — verifies LLM env readers resolve (no network call).
- **`npm run test:fsrs`** / **`npm run elo:decay`** — maintenance/verification utilities as needed.

### Prisma client

```bash
npm run db:generate
```

**After schema changes or pulling migrations:** regenerate and **restart `next dev`** (stale cached Prisma on `globalThis` can break API routes—see caveats).

### Migrations

```bash
npm run db:migrate
```

### Database backup (filesystem)

```bash
npm run backup
```

PowerShell script copies the SQLite file to a timestamped backup (see `scripts/backup-db.ps1`).

### Database restore (filesystem)

```bash
npm run restore -- -BackupFile backups/dev.db.<timestamp>.bak
```

Restores a selected backup to the active SQLite path and creates a safety pre-restore copy.

### Seed / Phase 1 bank

```bash
npm run db:seed
```

Seeds from the personalized Phase 1 dataset. **Full rebuild** (wipes active learning tables and reloads bank—use with care):

```bash
npm run db:rebuild-phase1-bank
```

### Delete one stray session (by id)

```bash
npm run db:delete-session -- <sessionId>
```

---

## 5. Environment variables

- **`DATABASE_URL`** — SQLite URL, e.g. `file:./dev.db`. **Required** for Prisma CLI consistency; the runtime client can default if unset.
- **`GEMINI_API_KEY`** — Google Generative Language API (e.g. weekly report, some generation paths). **Optional** unless you use those features.
- **`ANTHROPIC_API_KEY`** — Claude API (e.g. explanations, verification). **Optional** unless you use those features.
- **`OPENAI_API_KEY`** — Present in provider helpers. **Optional** unless a code path you use requires it.
- **`EXPORT_API_SECRET`** — If **unset or empty**, export routes only accept **loopback** hosts (`127.0.0.1`, `localhost`, `[::1]`). If **set to a non-empty string**, every client (including localhost) must send header **`X-Export-Secret`** with the exact same value.

All LLM keys are **server-only**. Do not prefix them with `NEXT_PUBLIC_`.

Put values in **`.env.local`** (preferred) or **`.env`** in the project root. Do not commit real secrets.

---

## 6. Export API (CSV / JSON / backup)

Routes:

- `GET /api/export/questions`
- `GET /api/export/history`
- `GET /api/export/backup`

Behavior is implemented in `src/lib/export/auth.ts` (localhost vs shared secret). For non-local access, set `EXPORT_API_SECRET` and pass `X-Export-Secret`.

---

## 7. Known limitations and caveats

**Self-use readiness:** Core study loops (bank → train → history → report) are suitable for a **single user** on a **trusted machine**. This is not a multi-tenant SaaS hardening pass.

**Partial / variable:**

- **LLM** features need keys, network, and provider quotas; costs accrue per `LlmUsageLog` semantics.
- **Listening** tables are **not** driving the main training UI yet.
- **Legacy tables** remain in SQLite for compatibility; some are unused by current pages.

**Development:**

- **`next dev` + stale Prisma:** after `prisma generate` or schema edits, restart dev server. Symptom: export/backup route throws `findMany` on undefined delegate.
- **`.next` cache:** rare odd runtime after large changes—delete `.next`, `npm run build` again.

**Data:**

- **`notes`** may encode taxonomy; free-text `notes` from old imports can differ.
- **`db:rebuild-phase1-bank`** is destructive for sessions/history/FSRS/ELO aggregates—backup first.

---

## 8. Recommended developer workflow

1. **`npm run backup`** (or copy `dev.db`) before risky data operations.
2. Edit code; keep changes focused.
3. **`npm run build`** before considering work done.
4. Optional: **`npm run smoke:csv-import`** or quick manual browser checks (`/import`, `/training`, `/history`).
5. **`git status`**, stage, commit with a clear message.

Operational docs:

- `docs/reliability-runbook.md`
- `docs/backup-and-restore.md`
- `docs/performance-watchpoints.md`

---

## 9. Normalized question shape (JSON / seed)

Same rules as imports: `difficulty` **A/B/C**, `correctAnswer` **A–D**, trimmed topics, optional `explanation`, optional `grammarPoints` / `priorKnown` where the pipeline expects them. CSV column mapping is documented on **`/import`**.

---

## 10. Windows port note

Ports **3000** and **3001** may fall inside an excluded TCP range on some Windows setups. Development defaults to **5173**. Use `npm run dev` as configured; for production `next start`, set **`PORT`** if 3000 conflicts.

---

## 11. Troubleshooting: `/api/export/backup` returns 500 in `next dev`

If the error mentions **`Cannot read properties of undefined (reading 'findMany')`**, the dev server is likely holding a **stale Prisma client**. Run **`npm run db:generate`** and **restart `next dev`**. `next start` often works because it is a fresh process.

---

## Manual browser smoke (short)

With `npm run dev`:

1. `/questions/new` — create one question.
2. `/questions/[id]/edit` — edit and save.
3. `/import` — CSV: choose file → Preview → Commit (or JSON section as offered).
4. `/training` — complete a short session.
5. `/history` — confirm the session appears.

---

## Verification expectations (local)

- `npm run build` succeeds.
- Main routes return **200** when the server is running and the DB is present.
- Training persists `StudySession` / `AnswerHistory`; FSRS state updates when ratings are used.
