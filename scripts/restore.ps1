param(
  [string]$ArchivePath,
  [string]$ProjectName = $(if ($env:COMPOSE_PROJECT_NAME) { $env:COMPOSE_PROJECT_NAME } else { "tech-notes-blog" })
)

$ErrorActionPreference = "Stop"

function Test-BackupChecksums {
  param([string]$Directory)

  $checksumPath = Join-Path $Directory "SHA256SUMS.txt"
  if (-not (Test-Path -LiteralPath $checksumPath)) {
    throw "Missing SHA256SUMS.txt"
  }

  Get-Content -Encoding UTF8 -Path $checksumPath | ForEach-Object {
    if (-not $_.Trim()) { return }
    $parts = $_ -split "\s+", 2
    $expected = $parts[0].ToLowerInvariant()
    $fileName = $parts[1].Trim()
    $actual = (Get-FileHash -Algorithm SHA256 -Path (Join-Path $Directory $fileName)).Hash.ToLowerInvariant()

    if ($actual -ne $expected) {
      throw "Checksum mismatch for $fileName"
    }
  }
}

function Assert-ProductionStackStopped {
  $running = docker compose ps --services --filter "status=running"
  if ($running) {
    throw "Refusing to restore while production services are running. Run 'docker compose down' first."
  }
}

function Assert-VolumeEmpty {
  param([string]$VolumeName)

  $listing = docker run --rm -v "${ProjectName}_${VolumeName}:/target" alpine:3.22 sh -lc "find /target -mindepth 1 -maxdepth 1 | head -n 1"
  if ($listing) {
    throw "Target volume $VolumeName is not empty."
  }
}

function Restore-VolumeArchive {
  param(
    [string]$VolumeName,
    [string]$ArchiveFile
  )

  docker run --rm `
    -v "${ProjectName}_${VolumeName}:/target" `
    -v "$(Resolve-Path (Split-Path $ArchiveFile -Parent)):/backup:ro" `
    alpine:3.22 `
    sh -lc "cd /target && tar -xzf /backup/$(Split-Path $ArchiveFile -Leaf)"
}

if (-not $ArchivePath) {
  throw "Restore requires an explicit archive path."
}

$resolvedArchive = Resolve-Path -LiteralPath $ArchivePath
Test-BackupChecksums -Directory $resolvedArchive
Assert-ProductionStackStopped
Assert-VolumeEmpty -VolumeName "postgres-data"
Assert-VolumeEmpty -VolumeName "media-data"
Assert-VolumeEmpty -VolumeName "labs-data"

Restore-VolumeArchive -VolumeName "media-data" -ArchiveFile (Join-Path $resolvedArchive "media.tar.gz")
Restore-VolumeArchive -VolumeName "labs-data" -ArchiveFile (Join-Path $resolvedArchive "labs.tar.gz")

docker compose up -d db
Get-Content -Encoding UTF8 -Path (Join-Path $resolvedArchive "database.sql") |
  docker compose exec -T db sh -lc 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'

Write-Host "Restore complete: $resolvedArchive"
