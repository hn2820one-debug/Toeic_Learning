# Data ownership & future RLS blueprint

This document describes **who owns which rows** in the current codebase and how that maps to a **future** PostgreSQL / Supabase deployment with Row Level Security (RLS). It is **design guidance only**: the app today uses **SQLite** via Prisma (`datasource db { provider = "sqlite" }` in `prisma/schema.prisma`) and **`DATABASE_URL`** from the environment (local file or any URL Prisma accepts). **No RLS is enforced in SQLite**; policies below are **drafts** for when you host Postgres.

---

## 1. Runtime database reality (inspection)

| Question | Answer |
|----------|--------|
| Local vs hosted? | **Schema is SQLite.** Connection string is **`DATABASE_URL`** (see `prisma.config.ts`). You can point it at a file (e.g. `file:./dev.db`) or, after migration, at a hosted Postgres URL—**but the checked-in provider is still `sqlite` until you intentionally migrate.** |
| User identity column? | Primary pattern is **`userId: Int`** → `User.id`. There is **no generic `ownerId`** column name; relations use `userId` or optional `userId` on legacy rows. |
| Auth id for SSO? | `User.externalAuthProvider` + `User.externalUserId` (nullable) for future hosted auth—not wired to an SDK in-repo. |

---

## 2. Layer A — Shared content (curriculum & global bank)

These rows are **not “owned” by a single learner**. They are **read by everyone** (and may be written only by admins / content pipelines / imports).

| Asset | Storage in this repo | `userId`? | Notes |
|-------|----------------------|-----------|--------|
| **Program / Module / Skill / Topic** (canonical keys) | Mostly **file-based** under `src/content/programs/phase1/` | No | `LearningTopic` in DB is a **shared registry** (labels, order) keyed by `topicKey`. |
| **Lesson** | DB table `Lesson` + Markdown `bodyMarkdown` | No | Shared lesson capsules; not per-user. |
| **LessonPracticeItem** | Join `lesson` ↔ `QuestionBankItem` | No | Ordering for practice composition. |
| **QuestionBankItem** (`questions`) | Shared **global** question bank | No | Treated as **one shared bank** for the product; taxonomy fields (`topicKey`, `skillKey`, `moduleKey`) describe content, not ownership. |
| **LearningItem / QuestionItem** | Legacy vocab/phrase atoms | No | Older training path; still shared content. |
| **Listening*** legacy/v2 | Shared content | No | Per schema. |

**RLS stance (future):** authenticated learners typically get **`SELECT`** on these tables (or via views). **`INSERT`/`UPDATE`/`DELETE`** should be **denied** for the `authenticated` role by default; writes go through **admin** or **service role** (import jobs, CMS, migrations).

---

## 3. Layer B — User-owned execution & progress

These rows **must** be scoped to **`auth.uid()` ↔ `users.id`** (or a stable profile id) in a hosted model.

| Table | `userId` required? | Composite key / notes |
|-------|-------------------|-------------------------|
| **User** | N/A (root) | Single-tenant bootstrap today (`getOrCreateDevUser`). |
| **UserProfile** | Yes (`userId` unique) | One row per user. |
| **Enrollment** | Yes | `@@unique([userId, programKey])`. |
| **UserPreference** | Yes | `@@unique([userId, key])`. |
| **UserTopicProgress** | Yes | `@@unique([userId, topicKey])`. |
| **ModuleProgress** | Yes | `@@unique([userId, moduleKey])`. |
| **ProgramProgress** | Yes | `@@unique([userId, programKey])`. |
| **LearningSession** | Yes | Closed-loop sessions (`learn` / `practice` / `test` / `review`). |
| **LearningSessionItem** | Via parent | Ownership = parent `LearningSession.userId`. |
| **CheckpointAttempt** | Yes | Checkpoint outcomes. |
| **StudyTask** | Yes | Planner queue. |

**RLS stance (future):** **`SELECT`/`INSERT`/`UPDATE`** for `authenticated` **only where `user_id = current_setting('app.user_id')::int`** (or Supabase `auth.uid()` mapped to `users.id`). **`DELETE`** often denied or restricted to soft-delete patterns.

---

## 4. Critical gap: FSRS / review state not yet per-user in schema

The following tables are **logically per-user** in a multi-tenant product, but **today’s Prisma schema does not carry `userId`** on the card row:

| Table | Current key | Risk |
|-------|-------------|------|
| **FsrsCardState** | `questionId` **unique** (one row per question **globally**) | **All users would share one FSRS card per question** unless you add **`user_id`** (or move to a composite unique `(user_id, question_id)`). The schema comment on `UserTopicProgress` already notes FSRS staying global “until scoped per user”. |
| **ReviewLog** | `questionId` only | Same: logs are not attributed to a user in the DB. |

**Implication:** Before turning on RLS “for FSRS,” you need a **data model migration**, not only policies. **Do not pretend** this is already user-safe at the DB layer.

Other **global / ambiguous** tables (audit or legacy—review before multi-user):

- **EloState** — `kind` + `subjectId` (no `userId`).
- **TopicMastery** — keyed by `topic` string only.
- **LlmUsageLog** — no `userId` (operational/aggregated logging).
- **StudySession** — `userId` **optional** (legacy).
- **DailySession**, **SessionAnswer**, **ReviewQueue** (legacy), **TopicWeight**, **WeeklyReport**, **ScoreHistory** — **no `userId`** in schema; treat as **single-learner or legacy** until migrated.

---

## 5. Per-table ownership policy (summary)

Legend: **U** = must have user scope for multi-tenant, **S** = shared read, **G** = global / legacy gap.

| Table | Layer | userId strategy |
|-------|--------|-----------------|
| users | U | Self-row only |
| user_profiles | U | 1:1 user |
| enrollments | U | Required |
| user_preferences | U | Required |
| learning_topics | S | None |
| lessons | S | None |
| lesson_practice_items | S | None |
| user_topic_progress | U | Required |
| module_progress | U | Required |
| program_progress | U | Required |
| learning_sessions | U | Required |
| learning_session_items | U | Via session |
| checkpoint_attempts | U | Required |
| study_tasks | U | Required |
| questions (QuestionBankItem) | S | None |
| fsrs_card_state | **G → should become U** | **Add `user_id`** for real multi-tenant |
| review_log | **G → should become U** | **Add `user_id`** if logs are per-user |
| study_sessions | U (soft) | Prefer required `userId` for new rows |
| study_session_question / answer_history | U | Via `study_sessions.userId` |

---

## 6. Postgres / Supabase: which tables get RLS first

**MVP minimum (highest risk if leaked):**

1. **`user_topic_progress`** — pure PII-adjacent progress.
2. **`learning_sessions` + `learning_session_items`** — full session payloads (practice/test/review JSON).
3. **`fsrs_card_state`** — **only after** adding `user_id` (or equivalent); **do not** enable RLS on current shape without fixing ownership.

**Next wave:** `checkpoint_attempts`, `study_tasks`, `enrollments`, `program_progress`, `module_progress`, `user_preferences`, `user_profiles`.

**Never expose raw client writes to (examples):**

- `questions` (QuestionBankItem) — content integrity.
- `lessons`, `learning_topics` — curriculum integrity.
- `fsrs_params`, operational singletons.
- Any **admin import** tables.

---

## 7. Default deny principles

When RLS is enabled:

- **Default:** `authenticated` has **no** rights until policies grant them.
- **Learner:** only rows with **`user_id` = me** (or JWT claim mapped to `users.id`).
- **Service role / backend:** bypass RLS for **trusted server actions** (batch jobs, imports, admin)—**not** from the browser with the anon key.
- **Anonymous:** typically **no access** to user-owned tables.

Avoid **broad `USING (true)`** on sensitive tables. Prefer **`auth.uid()`** (Supabase) or **`current_setting('request.jwt.claim.sub', true)`** patterns consistent with your IdP.

---

## 8. Discussion / media / uploads (boundary only — not implemented)

No `DiscussionPost` table exists in `schema.prisma` today. For a future feature, assume:

| Concern | Ownership rule (draft) |
|---------|-------------------------|
| **Discussion thread / post** | `author_user_id` NOT NULL; optional `topic_key` / `lesson_id` for scope; `deleted_at` for soft delete. |
| **Media metadata** | `uploaded_by_user_id`; `storage_path` opaque; **binary in object storage** (S3/GCS/Supabase Storage), not in Postgres bytea for large blobs. |
| **RLS** | User can `SELECT` public threads per policy; can `INSERT` own posts; `UPDATE`/`DELETE` only own rows (or moderator service role). |

**Responsibility split:** Postgres holds **metadata + references**; **CDN/object store** holds bytes; **signed URLs** issued by backend.

---

## 9. SQLite today vs this document

- This file and `sql/rls-draft/*.sql` are **documentation and forward-looking SQL**.
- **SQLite in development is unchanged**; we are **not** applying Postgres policies.
- Application routes and Prisma client **are not modified** for RLS in this step.

When you move to Postgres:

1. Change `provider` and run Prisma migrations.
2. Add **`user_id`** to FSRS-related tables if you need true multi-tenant scheduling.
3. Create roles (`authenticated`, `service_role`) and attach policies.
4. Map Supabase `auth.users` → app `users` (trigger or sync job).

---

## 10. SQL drafts

See `sql/rls-draft/` for illustrative **PostgreSQL** policy examples (`user_topic_progress`, `learning_sessions`, hypothetical `discussion_posts`). Adjust names to match your final migration (snake_case tables, UUID vs int ids).

---

## Appendix: answers to “if we hosted today”

1. **Tables that most urgently need `userId` (or equivalent)** for honest multi-tenancy: **`fsrs_card_state`**, **`review_log`**, and any legacy tables you still use for scheduling (**`review_queue`**, **`daily_sessions`**) if they remain product-critical.

2. **Tables that must not allow raw client writes:** **`questions`**, **`lessons`**, **`learning_topics`**, **`lesson_practice_items`**, **`fsrs_params`**, and **any user progress / session** tables except through **validated server actions** with service checks.

3. **First three policies to implement after Postgres + auth:** **`user_topic_progress`**, **`learning_sessions`**, **`learning_session_items`** (tight parent/child check). Add **`fsrs_card_state`** only **after** the schema carries `user_id`.
