#Requires -Version 5.1
<#
  Verifies that a brand-new SQLite file can apply all migrations and matches schema.prisma.

  Backup warning: This script creates a throwaway DB under prisma/_verify_clean_rebuild.db.
  It does NOT touch dev.db unless you set DATABASE_URL to your dev file (not recommended).

  Usage (from repo root):
    .\scripts\verify-clean-db-rebuild.ps1
#>
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$dbPath = Join-Path $repoRoot "prisma\_verify_clean_rebuild.db"
if (Test-Path $dbPath) {
  Remove-Item -Force $dbPath
}

$env:DATABASE_URL = "file:./prisma/_verify_clean_rebuild.db"

Write-Host "== prisma migrate deploy (fresh DB) ==" -ForegroundColor Cyan
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "== prisma migrate diff (migrations vs schema; expect empty) ==" -ForegroundColor Cyan
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$diff = & npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script 2>&1 | ForEach-Object { "$_" }
$ErrorActionPreference = $prevEap
$joined = $diff -join "`n"
if ($LASTEXITCODE -ne 0) {
  Write-Host $joined
  exit $LASTEXITCODE
}

if ($joined -notmatch "empty migration") {
  Write-Host "FAIL: expected empty diff script from migrations to schema." -ForegroundColor Red
  Write-Host $joined
  exit 2
}

Write-Host "OK: migrations match schema.prisma" -ForegroundColor Green
exit 0
