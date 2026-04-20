# Migration audit (Prisma / SQLite)

This document records how **checked-in migrations** relate to **`schema.prisma`** and what the **application** actually uses, so a **clean database** can be rebuilt from source control with confidence.

## 1. Active runtime–critical tables

These are required for the current main flows (training, question bank, closed-loop learn/practice/test/review, FSRS, ELO, dev bootstrap):

| Area | Prisma model | SQL table (`@@map`) |
| --- | --- | --- |
| Users / access | `User`, `UserProfile`, `Enrollment`, `UserPreference` | `users`, `user_profiles`, `enrollments`, `user_preferences` |
| Question bank | `QuestionBankItem` | `questions` |
| Trainer + history | `StudySession`, `StudySessionQuestion`, `AnswerHistory` | `study_sessions`, `study_session_question`, `answer_history` |
| FSRS / review | `FsrsCardState`, `ReviewLog`, `FsrsParams` | `fsrs_card_state`, `review_log`, `fsrs_params` |
| ELO / topic rollups | `EloState`, `TopicMastery` | `elo_state`, `topic_mastery` |
| LLM | `LlmUsageLog` | `llm_usage_log` |
| Closed-loop curriculum | `LearningTopic`, `Lesson`, `LessonPracticeItem`, `UserTopicProgress`, `ModuleProgress`, `ProgramProgress` | `learning_topics`, `lessons`, `lesson_practice_items`, `user_topic_progress`, `module_progress`, `program_progress` |
| Closed-loop sessions | `LearningSession`, `LearningSessionItem`, `CheckpointAttempt`, `StudyTask` | `learning_sessions`, `learning_session_items`, `checkpoint_attempts`, `study_tasks` |

**Still in schema and used for backup/export or legacy paths** (not primary for new `/learn` UX): `LearningItem`, `QuestionItem`, `DailySession`, `SessionAnswer`, `ReviewQueue`, `TopicWeight`, `WeeklyReport`, `ScoreHistory`, listening models, etc. They are created by `0_init` and later migrations; do not drop them without an explicit deprecation plan.

## 2. What migration history establishes

All folders under `prisma/migrations/` (except `migration_lock.toml`) apply in name order. After the audit fixes, **`prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma`** produces an **empty** SQL script (no drift).

Rough timeline:

| Migration | Purpose |
| --- | --- |
| `0_init` | Core legacy tables: `questions`, `study_sessions`, `answer_history`, daily/session/review scaffolding, etc. |
| `20260419140721` … `20260419162619` | Notes, FSRS, priorKnown, ELO, study session questions, **AnswerHistory snapshot columns**, abandoned sessions |
| `20260419195427` | Listening v2 stub |
| `20260420005053` | Question taxonomy columns on `questions` |
| `20260420011427` … `20260420011512` | User profile, enrollment, `study_sessions.userId`, user email/auth columns |
| `20260420012515` | Closed-loop tables (`learning_sessions`, `user_topic_progress`, …) |
| `20260420013201` | `learning_topics.orderIndex` |
| `20260420024600` | JSON columns on `learning_session_items` / `user_topic_progress` (LEARN/PRACTICE/TEST tracking) — **INSERTs fixed to tolerate pre-existing rows without those columns** |
| `20260420120000` | `lessons.topicKey`, `bodyMarkdown` |
| `20260420140000` | Drops obsolete unique index on `lessons.topicKey`; adds composite index — **no longer re-adds columns already created in `20024600`** |
| `20260420160000` | `learning_sessions.topicKey` + index — **no longer duplicates column adds from `20024600`** |
| `20260420180000` | `learning_session_items.reviewStateJson` |

## 3. Gaps that existed before this audit (fixed in repo)

| Issue | Symptom | Resolution |
| --- | --- | --- |
| **Migrations missing from Git** | Three folders existed locally (`20260420012515`, `20260420013201`, `20260420120000`) but were **not tracked**, so a fresh clone could not create `learning_sessions`, `user_topic_progress`, `lessons.topicKey`, etc. | Added those `migration.sql` files to version control. |
| **Overlapping migrations** | `20260420140000` and `20260420160000` re-`ALTER`’d columns already introduced in `20260420024600` (different migration timestamps but **lexicographic order** runs `20024600` **before** `20140000` / `20160000`). | Removed duplicate `ALTER`s; kept only lesson indexes and `learning_sessions.topicKey` + index. |
| **Fragile data copy in `20024600`** | `INSERT … SELECT` referenced columns that did not exist on the **previous** table shape (would fail or behave inconsistently on empty DBs). | `INSERT` now uses `NULL` / defaults for new columns when copying from the pre-expansion tables. |

## 4. Schema vs migrations

After the fixes: **no drift** — the applied migration chain matches `schema.prisma` (verified with `prisma migrate diff`).

## 5. Migrations vs “runtime no longer uses”

No migration was removed. Legacy tables from `0_init` remain for export/backup and any residual code paths; they are **not** removed from migrations to avoid destructive surprises.

## 6. Minimal fix strategy (applied)

1. Correct **`20260420024600`** `INSERT` statements for idempotent rebuild from older table shapes.
2. Slim **`20260420140000`** to lesson index changes only.
3. Slim **`20260420160000`** to `learning_sessions.topicKey` + composite index only.

**Squashing** the whole history was intentionally avoided: overlapping steps were the bug; rewriting history as one giant initial migration would churn every clone and complicate existing environments.

## 7. Practical workaround: checksum mismatch on existing databases

Changing migration **file contents** invalidates Prisma’s recorded checksums in `_prisma_migrations` for those names. Clones that **already applied** the old SQL will see `migrate deploy` fail checksum verification.

**Options:**

- **Local/dev:** `npx prisma migrate reset` (destroys data) after backing up `dev.db` (see `npm run backup` if configured).
- **Preserve data:** take a logical backup (`prisma db pull` / export), then reset, or manually reconcile — there is no magic “reconcile checksum” in Prisma without DBA care.

New clones that never applied the old files are unaffected.

## 8. Clean-DB rebuild verification

- **npm:** `npm run verify:clean-db` (runs `scripts/verify-clean-db-rebuild.ps1`).
- **Manual:** `DATABASE_URL=file:./prisma/_verify.db npx prisma migrate deploy` then `npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script` (stdout should say it is an empty migration).

**Backup note:** Any `migrate reset` or deleting `*.db` removes local SQLite data. Copy `file:./dev.db` (or your `DATABASE_URL` target) before testing.

## 9. AnswerHistory snapshots and this change

`stemSnapshot`, `choicesSnapshot`, `correctAnswerSnapshot`, `topicSnapshot`, `difficultySnapshot` come from migration **`20260419155602_add_answer_history_snapshot`**. This audit **does not** alter that migration.

Scripts such as `scripts/backfill-answer-history-snapshots.ts` depend on those columns existing after **`migrate deploy`** — which remains true. No new dependency on this audit beyond “migrations must apply cleanly on a fresh DB.”

## 10. Next steps (optional)

- In CI, run `scripts/verify-clean-db-rebuild.ps1` (or the equivalent `migrate deploy` + `migrate diff` commands) on each PR touching `prisma/`.
- If you ever **must** rewrite old migrations again, coordinate a **single** `migrate reset` window and communicate checksum invalidation.
