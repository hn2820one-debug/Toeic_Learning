$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $projectRoot) { $projectRoot = (Get-Location).Path }

$dbPath = Join-Path $projectRoot "dev.db"
$backupDir = Join-Path $projectRoot "backups"

if (-not (Test-Path $dbPath)) {
    Write-Host "ERROR: dev.db not found at $dbPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = Join-Path $backupDir "dev.db.$timestamp.bak"

Copy-Item -Path $dbPath -Destination $backupFile -Force

$size = (Get-Item $backupFile).Length
$sizeKb = [math]::Round($size / 1024, 1)
Write-Host "Backup created: $backupFile ($sizeKb KB)" -ForegroundColor Green

# Keep only the newest 14 backups
$allBackups = Get-ChildItem -Path $backupDir -Filter "dev.db.*.bak" | Sort-Object LastWriteTime -Descending
if ($allBackups.Count -gt 14) {
    $toDelete = $allBackups | Select-Object -Skip 14
    foreach ($old in $toDelete) {
        Remove-Item $old.FullName -Force
        Write-Host "Removed old backup: $($old.Name)" -ForegroundColor Yellow
    }
}

$remaining = (Get-ChildItem -Path $backupDir -Filter "dev.db.*.bak").Count
Write-Host "Total backups: $remaining / 14 max" -ForegroundColor Cyan
