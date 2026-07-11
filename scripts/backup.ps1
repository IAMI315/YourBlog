param(
  [string]$BackupRoot = $(if ($env:BACKUP_ROOT) { $env:BACKUP_ROOT } else { "./backups" }),
  [string]$ProjectName = $(if ($env:COMPOSE_PROJECT_NAME) { $env:COMPOSE_PROJECT_NAME } else { "yourblog" })
)

$ErrorActionPreference = "Stop"

function New-BackupDirectory {
  param([string]$Root)

  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $directory = Join-Path $Root "backup-$timestamp"
  New-Item -ItemType Directory -Force -Path $directory | Out-Null

  return $directory
}

function Write-BackupRecord {
  param(
    [string]$Status,
    [string]$SafeErrorMessage = "",
    [int64]$ArchiveSize = 0
  )

  $message = $SafeErrorMessage.Replace("'", "''")
  $sql = @"
INSERT INTO "BackupRecord" ("includedData", "archiveSize", "status", "safeErrorMessage", "completedAt")
VALUES ('{"database":true,"media":true,"labs":true}', $ArchiveSize, '$Status', NULLIF('$message', ''), now());
"@

  $sql | docker compose exec -T db sh -lc 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"' | Out-Null
}

function Export-Volume {
  param(
    [string]$VolumeName,
    [string]$Destination
  )

  docker run --rm `
    -v "${ProjectName}_${VolumeName}:/source:ro" `
    -v "$(Resolve-Path (Split-Path $Destination -Parent)):/backup" `
    alpine:3.22 `
    sh -lc "cd /source && tar -czf /backup/$(Split-Path $Destination -Leaf) ."
}

function Write-Checksums {
  param([string]$Directory)

  Get-ChildItem -Path $Directory -File |
    Where-Object { $_.Name -ne "SHA256SUMS.txt" } |
    ForEach-Object {
      $hash = Get-FileHash -Algorithm SHA256 -Path $_.FullName
      "$($hash.Hash.ToLowerInvariant())  $($_.Name)"
    } |
    Set-Content -Encoding UTF8 -Path (Join-Path $Directory "SHA256SUMS.txt")
}

function Select-BackupArchivesToKeep {
  param(
    [System.IO.DirectoryInfo[]]$Archives,
    [int]$Daily = 7,
    [int]$Weekly = 4
  )

  $newest = $Archives | Sort-Object LastWriteTimeUtc -Descending
  $kept = [ordered]@{}
  $dailyBuckets = @{}

  foreach ($archive in $newest) {
    $bucket = $archive.LastWriteTimeUtc.ToString("yyyy-MM-dd")
    if ($dailyBuckets.Count -lt $Daily -and -not $dailyBuckets.ContainsKey($bucket)) {
      $kept[$archive.FullName] = $archive
      $dailyBuckets[$bucket] = $true
    }
  }

  $weeklyBuckets = @{}
  foreach ($archive in $newest) {
    if ($kept.Contains($archive.FullName)) { continue }
    $calendar = [Globalization.ISOWeek]::GetWeekOfYear($archive.LastWriteTimeUtc)
    $bucket = "$($archive.LastWriteTimeUtc.Year)-W$calendar"
    if ($weeklyBuckets.Count -lt $Weekly -and -not $weeklyBuckets.ContainsKey($bucket)) {
      $kept[$archive.FullName] = $archive
      $weeklyBuckets[$bucket] = $true
    }
  }

  return $kept.Values
}

function Invoke-BackupRetention {
  param([string]$Root)

  $archives = Get-ChildItem -Path $Root -Directory -Filter "backup-*"
  $keep = Select-BackupArchivesToKeep -Archives $archives
  $keepPaths = @($keep | ForEach-Object { $_.FullName })

  foreach ($archive in $archives) {
    if ($keepPaths -notcontains $archive.FullName) {
      Remove-Item -LiteralPath $archive.FullName -Recurse -Force
    }
  }
}

New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null
$backupDirectory = New-BackupDirectory -Root $BackupRoot

try {
  docker compose exec -T db sh -lc 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' |
    Set-Content -Encoding UTF8 -Path (Join-Path $backupDirectory "database.sql")

  Export-Volume -VolumeName "media-data" -Destination (Join-Path $backupDirectory "media.tar.gz")
  Export-Volume -VolumeName "labs-data" -Destination (Join-Path $backupDirectory "labs.tar.gz")
  Write-Checksums -Directory $backupDirectory

  $size = (Get-ChildItem -Path $backupDirectory -File | Measure-Object -Property Length -Sum).Sum
  Write-BackupRecord -Status "SUCCEEDED" -ArchiveSize $size
  Invoke-BackupRetention -Root $BackupRoot

  Write-Host "Backup complete: $backupDirectory"
} catch {
  Write-BackupRecord -Status "FAILED" -SafeErrorMessage "Backup failed. Check server logs for details."
  throw
}
