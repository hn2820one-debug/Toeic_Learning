# Reliability Runbook (Personal Daily Use)

## Goal

Keep local study data recoverable and avoid silent breakage after schema/import/content changes.

## Clean rebuild verification

Minimal rebuild steps from clean clone:

1. `npm install`
2. Copy `.env.example` to `.env.local` and set at least `DATABASE_URL`
3. `npm run db:generate`
4. `npm run db:migrate`
5. `npm run db:seed` (optional if you want starter data)
6. `npm run build`
7. `npm run dev`

Verification helpers:

- Migration/schema parity: `npm run verify:clean-db`
- App compile check: `npm run build`

## Migration caveat

- In `next dev`, Prisma client is cached on `globalThis`.
- After schema/migration changes:
  1. run `npm run db:generate`
  2. restart dev server

Without restart, some routes can fail with stale delegate errors.

## Fast incident response

If import/migration changed data unexpectedly:

1. Stop app
2. Identify latest known-good backup in `backups/`
3. `npm run restore -- -BackupFile <backup-file>`
4. Start app and run quick checks (`/questions`, `/history`, `/report`)

## High-risk operations

- `npm run db:migrate`
- `npm run db:rebuild-phase1-bank` (destructive)
- Large JSON/CSV import
- Taxonomy backfill scripts

Always run backup first (see `docs/backup-and-restore.md`).

