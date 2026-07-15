param(
  [int]$HttpPort = 32124,
  [int]$DatabasePort = 5434,
  [string]$DatabaseUrl = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  $DatabaseUrl = "postgresql://blog:blog@127.0.0.1:$DatabasePort/blog_dev"
}

function Wait-DevDatabase {
  for ($attempt = 1; $attempt -le 40; $attempt++) {
    docker compose -f compose.dev.yaml exec -T db pg_isready -U blog -d blog_dev | Out-Null
    if ($LASTEXITCODE -eq 0) {
      return
    }

    Start-Sleep -Seconds 1
  }

  throw "The local development database did not become ready in time."
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker is required for the local development infrastructure."
}

docker info 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Docker Desktop is not running. Start Docker Desktop, wait until its Linux engine is ready, then run pnpm dev:full again."
}

if (-not (Test-Path -LiteralPath "node_modules")) {
  corepack enable | Out-Null
  corepack pnpm@11.11.0 install
}

if (-not (Test-Path -LiteralPath ".env.local")) {
  @"
DATABASE_URL=$DatabaseUrl
AUTH_SECRET=local-development-secret-at-least-32-bytes
WEB_PROJECT_UPLOAD_SECRET=local-upload-secret-at-least-32-bytes
ADMIN_PASSWORD=YourBlogadmin
BLOG_HOST=http://blog.localhost:$HttpPort
LABS_HOST=http://labs.localhost:$HttpPort
MEDIA_STORAGE_ROOT=./data/uploads
WEB_PROJECT_STORAGE_ROOT=./data/web-projects
"@ | Set-Content -Encoding UTF8 -Path ".env.local"
  Write-Host "Created .env.local for full development mode."
}

$env:DATABASE_URL = $DatabaseUrl
$env:DEV_DB_PORT = $DatabasePort
$env:DEV_HTTP_PORT = $HttpPort
$env:BLOG_HOST = "http://blog.localhost:$HttpPort"
$env:LABS_HOST = "http://labs.localhost:$HttpPort"
$env:MEDIA_STORAGE_ROOT = "./data/uploads"
$env:WEB_PROJECT_STORAGE_ROOT = "./data/web-projects"

docker compose -f compose.dev.yaml up -d
Wait-DevDatabase
corepack pnpm@11.11.0 exec prisma migrate deploy

Write-Host ""
Write-Host "YourBlog full development mode is ready."
Write-Host "Blog: http://blog.localhost:$HttpPort"
Write-Host "Labs preview: http://labs.localhost:$HttpPort"
Write-Host "Press Ctrl+C to stop Next.js. Infrastructure keeps running until dev:full:down."

corepack pnpm@11.11.0 dev -- --hostname 0.0.0.0
