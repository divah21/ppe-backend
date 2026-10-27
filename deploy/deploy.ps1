# Deploys the API on the Windows server. Run from the repo root in PowerShell:
#   .\deploy\deploy.ps1 -Branch main
# Takes a database backup first, builds, applies the v2 session table, then reloads PM2.
param(
  [string]$Branch = 'main',
  [string]$BackupDir = 'C:\ppe-backups'
)
$ErrorActionPreference = 'Stop'

function Step($msg) { Write-Host "`n== $msg" -ForegroundColor Cyan }

Step 'Checking .env'
if (-not (Test-Path .env)) { throw '.env is missing' }
$envText = Get-Content .env -Raw
foreach ($key in 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET', 'ALLOWED_ORIGINS') {
  if ($envText -notmatch "(?m)^$key=.+") { throw "$key is not set in .env" }
}
$vars = @{}
foreach ($line in Get-Content .env) { if ($line -match '^\s*([A-Z_]+)=(.*)$') { $vars[$Matches[1]] = $Matches[2].Trim('"') } }

Step 'Backing up the database'
New-Item -ItemType Directory -Force $BackupDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$dump = Join-Path $BackupDir "ppe-$stamp.dump"
$env:PGPASSWORD = $vars['DB_PASSWORD']
$port = if ($vars['DB_PORT']) { $vars['DB_PORT'] } else { '5432' }
pg_dump -h $vars['DB_HOST'] -p $port -U $vars['DB_USER'] -F c -f $dump $vars['DB_NAME']
if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed; nothing was changed' }
Remove-Item Env:PGPASSWORD
Write-Host "Backup: $dump"

Step "Updating code ($Branch)"
git fetch origin
git checkout $Branch
git pull --ff-only origin $Branch

Step 'Installing and building'
npm ci
npm run build

Step 'Creating the v2 session table'
node -e "require('dotenv').config(); require('./dist/src/core/sessions').ensureSessionTable().then(() => process.exit(0), (e) => { console.error(e); process.exit(1) })"

Step 'Reloading PM2'
pm2 startOrReload ecosystem.config.cjs --env production
pm2 save

Step 'Health check'
Start-Sleep -Seconds 5
$health = Invoke-RestMethod http://127.0.0.1:5000/api/v2/health
if ($health.data.status -ne 'ok') { throw 'API health check failed - roll back with: git checkout <previous sha>; npm run build; pm2 reload ppe-api' }
Write-Host 'API is up.' -ForegroundColor Green
