# Performance Watchpoints (Minimal Hardening)

This project is single-user/local-first. The goal is to avoid obvious slowdowns as rows grow.

## Routes and current watchpoints

## `/questions`

- Risk: loading full table into one page.
- Current hardening:
  - Server pagination (`50` rows/page)
  - Count query + page navigation
  - Only selected fields are fetched for list view
- Watchpoint:
  - Keep search fields bounded to `questionText/topic/notes`
  - Avoid adding heavy relations to the list query

## `/import` (JSON/CSV)

- Risk: very large insert batches causing slow writes.
- Current hardening:
  - CSV already uses `createMany` batched writes
  - JSON import now uses batched `createMany` (no per-row transaction loop)
  - Duplicate filtering is done before write
- Watchpoint:
  - Keep batch size around `500` unless profiling suggests otherwise

## `/history`

- Risk: rendering every session + all answers on one page.
- Current hardening:
  - Server pagination (`20` sessions/page)
  - Keep nested answer payload selected and ordered
- Watchpoint:
  - If rows grow significantly, consider lazy detail loading for expanded answers

## `/report` and `/analysis`

- Risk: wide time-window scans with growing `AnswerHistory`.
- Current state:
  - Both use 7d/30d deterministic windows
  - Analysis already selects required fields only
- Watchpoint:
  - Keep windows bounded
  - Keep export limits explicit (`take` already applied for wrong-answer export)

## `/learn` / `/progress`

- N+1 status:
  - No obvious N+1 query loop in current implementation
  - Uses batched lookups (`findMany`) and in-memory grouping
- Watchpoint:
  - Avoid per-topic DB calls inside render loops

## Practical monitoring checklist

- Before/after large import:
  - `/questions` page load + search
  - `/history` page load (first 2 pages)
  - `/analysis` load time
- After schema changes:
  - `npm run build`
  - `npm run verify:clean-db`

