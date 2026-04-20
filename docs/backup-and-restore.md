# Backup and Restore (Self-Hosted / SQLite)

## SQLite path

- Default DB path: `dev.db` at repo root.
- Effective path comes from `DATABASE_URL` when it is `file:...`.
- Quick check:
  - PowerShell: `echo $env:DATABASE_URL`
  - If empty, app falls back to `file:./dev.db`.

## Backup (before risky work)

- Run: `npm run backup`
- Script: `scripts/backup-db.ps1`
- Output folder: `backups/`
- Filename format: `dev.db.yyyymmdd-hhmmss.bak`

## Restore

- Run: `npm run restore -- -BackupFile backups/dev.db.20260101-120000.bak`
- Script: `scripts/restore-db.ps1`
- Safety behavior:
  - Script first snapshots current DB to `backups/pre-restore.*.bak`
  - Then copies selected backup over active DB file

## Pre-risk checklist

Before **migration / large import / taxonomy backfill / schema switch**:

1. Stop dev server (`npm run dev`) to avoid file lock + stale client confusion.
2. `npm run backup`
3. Verify backup file exists in `backups/`.
4. Confirm `DATABASE_URL` points to expected local SQLite file.
5. Run risky command.
6. If result is bad: restore with `npm run restore -- -BackupFile <file>`.

## Future note (Postgres)

- Current scripts are intentionally SQLite-first.
- If migrating to Postgres later, switch to DB-native dump/restore (`pg_dump` / `pg_restore`) and keep this runbook minimal.

