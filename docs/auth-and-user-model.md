# Auth & user model (data layer first)

## What existed before

- A minimal `User` row (`users`) with `id`, `name`, `createdAt` — effectively a single local learner placeholder.
- No profile, enrollment, or `userId` on runtime tables.

## What this repo adds now

| Model | Purpose |
|-------|---------|
| `User` | Account root: optional `email`, reserved `externalAuthProvider` + `externalUserId` for future SSO, `name`, timestamps. |
| `UserProfile` | Slow-changing learner data: `displayName`, `timezone`, `targetScore`, `role` (`LEARNER` \| `ADMIN`). |
| `Enrollment` | Many programs per user via `programKey` (e.g. `phase1`); `status` string for MVP. |
| `UserPreference` | Optional key/value store (`value` often JSON) for UI prefs without schema churn. |
| `StudySession.userId` | Nullable FK to `User` — **attachment point** for sessions when the actor is known. |

No OAuth / Supabase / Auth.js in this codebase yet; fields are **reserved** for a later hosted path.

## Development: how the app binds a user today

1. **`getOrCreateDevUser()`** (`src/lib/dev-user.ts`) runs only when:
   - `NODE_ENV !== "production"`, **or**
   - `ALLOW_DEV_USER_BOOTSTRAP=1` (explicit opt-in, e.g. staging).

2. It ensures:
   - A row with `email = dev@local.invalid` (claims the first existing user if the DB already had one without email).
   - A `UserProfile` and an `Enrollment` for `programKey = "phase1"`.

3. **`getDevUserIdForSession()`** is used when creating a **new** `StudySession` so local training rows get `userId` set without any login UI.

4. **`prisma/seed.ts`** calls `getOrCreateDevUser()` after seeding questions so a fresh DB has profile + enrollment without opening the app.

Production builds **do not** auto-create users unless `ALLOW_DEV_USER_BOOTSTRAP=1`; new sessions then have `userId = null` until auth exists.

## Why data layer before an auth provider

- Unblocks schema work for **multi-tenant** progress, sessions, and future discussion threads.
- Keeps **local development** simple: no login wall, optional bootstrap.
- Avoids locking to one vendor before product requirements for SSO/email/password are fixed.

## What a real auth integration still needs

1. **Identity**: verify email/OAuth at the edge (middleware or route handlers) and resolve `User` by `(externalAuthProvider, externalUserId)` or `email`.
2. **Session cookie / JWT**: map browser session → `userId` (this app does not implement that yet).
3. **Replace `getDevUserIdForSession()`** with “current user id from session” in server actions (`createStudySession`, etc.).
4. **Backfill** nullable `StudySession.userId` for old rows if you need strict per-user history (optional).
5. **Per-user learning state** (see below): add `userId` to tables that are still global.

## Tables likely to gain `userId` later

Already anchored:

- **`StudySession`** — has optional `userId`.

Still global / singleton-style today; plan carefully before migrating:

| Table / area | Why |
|--------------|-----|
| `EloState` | `kind` + `subjectId` today implies one global learner; multi-user needs `userId` (or similar) in the unique key. |
| `FsrsCardState` / `ReviewLog` | Currently one card per question; multi-user needs scoping (e.g. composite with `userId`). |
| `TopicMastery` | Topic-level aggregates should be per user. |
| `LlmUsageLog` | Optional `userId` for quotas / audit. |
| Future `ProgramProgress` / `Enrollment`-linked progress | Should reference `userId` + `programKey`. |

Question bank rows (`QuestionBankItem`) stay **shared content** unless you introduce per-user overrides.

## Related code

- `src/lib/dev-user.ts` — dev bootstrap helpers  
- `prisma/schema.prisma` — source of truth for models  
