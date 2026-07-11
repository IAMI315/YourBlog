param(
  [string]$DatabaseUrl = "postgresql://blog:blog@127.0.0.1:5433/blog_test"
)

$ErrorActionPreference = "Stop"

function Wait-DevDatabase {
  for ($attempt = 1; $attempt -le 40; $attempt++) {
    docker compose -f compose.test.yaml exec -T db pg_isready -U blog -d blog_test | Out-Null
    if ($LASTEXITCODE -eq 0) {
      return
    }

    Start-Sleep -Seconds 1
  }

  throw "The local development database did not become ready in time."
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker is required for the local development database."
}

corepack enable | Out-Null
corepack pnpm@11.11.0 install

if (-not (Test-Path -LiteralPath ".env.local")) {
  @"
DATABASE_URL=$DatabaseUrl
AUTH_SECRET=local-development-secret-at-least-32-bytes
WEB_PROJECT_UPLOAD_SECRET=local-upload-secret-at-least-32-bytes
ADMIN_PASSWORD=YourBlogadmin
BLOG_HOST=http://localhost:3000
LABS_HOST=http://localhost:3000
MEDIA_STORAGE_ROOT=./data/uploads
WEB_PROJECT_STORAGE_ROOT=./data/web-projects
"@ | Set-Content -Encoding UTF8 -Path ".env.local"
  Write-Host "Created .env.local for local development."
}

$env:DATABASE_URL = $DatabaseUrl
docker compose -f compose.test.yaml up -d db
Wait-DevDatabase
corepack pnpm@11.11.0 exec prisma migrate deploy

Write-Host ""
Write-Host "YourBlog development environment is ready."
Write-Host "Start the app with: corepack pnpm@11.11.0 dev"
Write-Host "Open: http://localhost:3000"
Write-Host "Admin password: YourBlogadmin"
