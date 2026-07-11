param(
  [string]$DatabaseUrl = "postgresql://blog:blog@127.0.0.1:5433/blog_test"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath "node_modules")) {
  corepack enable | Out-Null
  corepack pnpm@11.11.0 install
}

docker compose -f compose.test.yaml up -d db

for ($attempt = 1; $attempt -le 40; $attempt++) {
  docker compose -f compose.test.yaml exec -T db pg_isready -U blog -d blog_test | Out-Null
  if ($LASTEXITCODE -eq 0) {
    break
  }

  Start-Sleep -Seconds 1
}

if ($LASTEXITCODE -ne 0) {
  throw "The local test database did not become ready in time."
}

$env:DATABASE_URL = $DatabaseUrl
corepack pnpm@11.11.0 exec prisma migrate deploy
corepack pnpm@11.11.0 verify
