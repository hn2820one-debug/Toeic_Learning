$ErrorActionPreference = "Stop"

param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile
)

$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $projectRoot) { $projectRoot = (Get-Location).Path }

function Resolve-DatabasePath {
    param([string]$RepoRoot)
    $raw = $env:DATABASE_URL
    if ([string]::IsNullOrWhiteSpace($raw)) {
        return (Join-Path $RepoRoot "dev.db")
    }

    if ($raw.StartsWith("file:")) {
        $candidate = $raw.Substring(5)
        if ([string]::IsNullOrWhiteSpace($candidate)) {
            return (Join-Path $RepoRoot "dev.db")
        }
        if ([System.IO.Path]::IsPathRooted($candidate)) {
            return $candidate
        }
        return (Join-Path $RepoRoot $candidate)
    }

    throw "restore-db.ps1 currently supports only SQLite file: DATABASE_URL."
}

$dbPath = Resolve-DatabasePath -RepoRoot $projectRoot
$backupPath = $BackupFile
if (-not [System.IO.Path]::IsPathRooted($backupPath)) {
    $backupPath = Join-Path $projectRoot $backupPath
}

if (-not (Test-Path $backupPath)) {
    Write-Host "ERROR: backup file not found: $backupPath" -ForegroundColor Red
    exit 1
}

$restoreSafety = Join-Path $projectRoot "backups"
if (-not (Test-Path $restoreSafety)) {
    New-Item -ItemType Directory -Path $restoreSafety -Force | Out-Null
}
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$preRestoreBackup = Join-Path $restoreSafety "pre-restore.$timestamp.bak"
if (Test-Path $dbPath) {
    Copy-Item -Path $dbPath -Destination $preRestoreBackup -Force
    Write-Host "Pre-restore backup created: $preRestoreBackup" -ForegroundColor Yellow
}

Copy-Item -Path $backupPath -Destination $dbPath -Force
Write-Host "Database restored to: $dbPath" -ForegroundColor Green
Write-Host "Source backup: $backupPath" -ForegroundColor DarkCyan

