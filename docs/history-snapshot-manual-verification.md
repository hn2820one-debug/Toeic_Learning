# Manual verification: immutable answer snapshots

**Backup:** copy `DATABASE_URL` target (e.g. `dev.db`) before destructive steps.

## Preconditions

- `npx prisma migrate deploy` applied (includes `answer_history` extended snapshot columns).
- App runs (`npm run dev`), training flow works.

## Case: history stays stable after editing the bank question

1. **Seed or pick a question** you can recognize (note its `id` from `/questions` or DB).
2. **Start training** (`/training`), run until you **submit an answer** for that question so a new `AnswerHistory` row is created.
3. Open **`/questions/[id]/edit`** for the same question and change:
   - `topic` (e.g. append ` [edited]`),
   - `explanation` (e.g. replace with different text),
   - one **option** text (e.g. option A),
   - optional taxonomy fields if present.
4. Save the question.
5. Open **`/history`** and locate the session that contains that answer.

**Expected**

- The history card shows the **original** stem, topic label, difficulty, and correct-answer letter as they were **at answer time** (matching what you saw in step 2), not the post-edit bank text.
- Weekly **`/report`** topic breakdown for that window still attributes the answer to the **snapshotted** topic, not the edited bank topic (unless the row predates snapshots—see below).

## Legacy rows (pre-migration / empty snapshots)

- Rows with empty `stemSnapshot` / `topicSnapshot` fall back to the **current** `QuestionBankItem` only for display—editing the bank can change what you see until you run `npm run backfill:answer-history-snapshots` (if configured) or accept lossy display.
- Extended fields (`option*Snapshot`, taxonomy) backfilled with `scripts/backfill-answer-history-snapshots.ts` copy **current** bank values at backfill time; they do not recover true-at-answer-time taxonomy for very old rows.

## Automated smoke (optional)

```bash
npm run verify:clean-db
```

Ensures migrations + schema stay aligned; combine with the manual steps above for full confidence.
