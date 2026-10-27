# Deploys the API on the Windows server. Run from the repo root in PowerShell:
#   .\deploy\deploy.ps1 -Branch main
# Backs up the database first, builds into a clean dist/, then reloads PM2.
# The v2 session table is created by the API itself on start (src/core/sessions.ts).
param(
  [string]$Branch = 'main',
  [string]$BackupDir = 'C:\ppe-backups'
)
$ErrorActionPreference = 'Stop'

function Step($msg) { Write-Host "`n== $msg" -ForegroundColor Cyan }

# Native commands do not throw on failure; stop on any non-zero exit code
function Run([string]$what, [scriptblock]$cmd) {
  & $cmd
  if ($LASTEXITCODE -ne 0) { throw "$what failed (exit $LASTEXITCODE). Nothing after this step ran." }
}

Step 'Checking .env'
if (-not (Test-Path .env)) { throw '.env is missing' }
$vars = @{}
foreach ($line in Get-Content .env) { if ($line -match '^\s*([A-Z_]+)=(.*)$') { $vars[$Matches[1]] = $Matches[2].Trim().Trim('"') } }
foreach ($key in 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET', 'ALLOWED_ORIGINS') {
  if (-not $vars[$key]) { throw "$key is not set in .env" }
}
if ($vars['JWT_SECRET'].Length -lt 32) { throw 'JWT_SECRET must be at least 32 characters (v2 refuses to serve otherwise)' }

$previous = (git rev-parse HEAD).Trim()

Step 'Backing up the database'
New-Item -ItemType Directory -Force $BackupDir | Out-Null
$dump = Join-Path $BackupDir ("ppe-{0}.dump" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
$port = if ($vars['DB_PORT']) { $vars['DB_PORT'] } else { '5432' }
$env:PGPASSWORD = $vars['DB_PASSWORD']
try { Run 'pg_dump' { pg_dump -h $vars['DB_HOST'] -p $port -U $vars['DB_USER'] -F c -f $dump $vars['DB_NAME'] } }
finally { Remove-Item Env:PGPASSWORD }
Write-Host "Backup: $dump"

Step "Updating code ($Branch)"
Run 'git fetch' { git fetch origin }
Run 'git checkout' { git checkout $Branch }
Run 'git pull' { git pull --ff-only origin $Branch }

Step 'Installing and building'
Run 'npm ci' { npm ci }
Run 'build' { npm run build }

Step 'Reloading PM2'
Run 'pm2 reload' { pm2 startOrReload ecosystem.config.cjs --env production }
Run 'pm2 save' { pm2 save }

Step 'Health check'
Start-Sleep -Seconds 5
try { $health = Invoke-RestMethod http://127.0.0.1:5000/api/v2/health } catch { $health = $null }
if ($health.data.status -ne 'ok') {
  Write-Host "API health check failed. To roll back:" -ForegroundColor Red
  Write-Host "  git checkout $previous; npm ci; npm run build; pm2 reload ppe-api"
  Write-Host "  Database backup: $dump"
  exit 1
}
Write-Host 'API is up.' -ForegroundColor Green
