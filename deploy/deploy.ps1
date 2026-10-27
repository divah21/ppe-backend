# Deploys the API on the Windows server. Run from the repo root in PowerShell:
#   .\deploy\deploy.ps1 -Branch main
# Backs up the database first, compiles into dist.new and swaps it in only when the build
# succeeds, then reloads PM2. The v2 session table is created by the API itself on start
# (src/core/sessions.ts).
param(
  [string]$Branch = 'main',
  [string]$BackupDir = 'C:\ppe-backups'
)
$ErrorActionPreference = 'Stop'

function Step($msg) { Write-Host "`n== $msg" -ForegroundColor Cyan }

# Native commands do not throw on failure; stop on any non-zero exit code
function Run([string]$what, [scriptblock]$cmd) {
  & $cmd
  if ($LASTEXITCODE -ne 0) { throw "$what failed (exit $LASTEXITCODE)." }
}

Step 'Checking Node and .env'
$node = [version]((node -v).Trim().TrimStart('v'))
if ($node -lt [version]'20.9.0') { throw "Node $node is too old; v2 needs 20.9 or later" }
if (-not (Test-Path .env)) { throw '.env is missing' }
$vars = @{}
foreach ($line in Get-Content .env) { if ($line -match '^\s*([A-Z_]+)=(.*)$') { $vars[$Matches[1]] = $Matches[2].Trim().Trim('"') } }
foreach ($key in 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET', 'ALLOWED_ORIGINS') {
  if (-not $vars[$key]) { throw "$key is not set in .env" }
}
if ($vars['JWT_SECRET'].Length -lt 32) { throw 'JWT_SECRET must be at least 32 characters (v2 refuses to serve otherwise)' }
# Not fatal: v1 falls back to JWT_SECRET for refresh tokens, and the token type claim already stops swapping them
if (-not $vars['JWT_REFRESH_SECRET'] -or $vars['JWT_REFRESH_SECRET'] -eq $vars['JWT_SECRET']) {
  Write-Warning 'Set JWT_REFRESH_SECRET to its own random value of 32+ characters (changing it signs v1 users out once).'
}
if (-not $vars['JWT_EXPIRE'] -or $vars['JWT_EXPIRE'] -match 'd$') {
  Write-Warning 'Set JWT_EXPIRE=1h so classic (v1) access tokens are short-lived.'
}

$previous = (git rev-parse HEAD).Trim()
# Before v2, main ran `node app.js` with no build step and no ecosystem file
$previousHasBuild = [bool](git show "${previous}:package.json" | Select-String '"build"\s*:')

function Show-Rollback {
  Write-Host 'To roll back:' -ForegroundColor Red
  if ($previousHasBuild) {
    Write-Host "  git checkout $previous; npm ci; npm run build; pm2 reload ppe-api"
  } else {
    Write-Host "  git checkout $previous; npm ci; Remove-Item -Recurse -Force dist"
    Write-Host '  pm2 delete ppe-api'
    Write-Host '  pm2 start app.js --name <old name>   # the PM2 setup recorded before the window'
    Write-Host '  pm2 save'
  }
  Write-Host "  Database backup: $dump"
}

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
try {
  Run 'npm ci' { npm ci }
  if (Test-Path dist.new) { Remove-Item -Recurse -Force dist.new }
  # dist/ stays intact until the new build is known to compile, so a restart can still start
  Run 'build' { npx tsc -p tsconfig.json --outDir dist.new }
  if (Test-Path dist) { Remove-Item -Recurse -Force dist }
  Rename-Item dist.new dist
} catch {
  Write-Host "$_" -ForegroundColor Red
  Write-Host 'Restoring the previous code and packages. The running API was not reloaded.' -ForegroundColor Yellow
  if (Test-Path dist.new) { Remove-Item -Recurse -Force dist.new }
  git checkout $previous
  npm ci
  if ($LASTEXITCODE -ne 0) { Write-Host 'npm ci of the previous commit failed too. Run it by hand before the API next restarts.' -ForegroundColor Red }
  exit 1
}

Step 'Reloading PM2'
try {
  Run 'pm2 reload' { pm2 startOrReload ecosystem.config.cjs --env production --update-env }
  Run 'pm2 save' { pm2 save }
} catch {
  Write-Host "$_" -ForegroundColor Red
  Show-Rollback
  exit 1
}

Step 'Health check'
$healthy = $false
for ($i = 1; $i -le 12 -and -not $healthy; $i++) {
  Start-Sleep -Seconds 5
  try { $healthy = (Invoke-RestMethod http://127.0.0.1:5000/api/v2/health).data.status -eq 'ok' } catch { }
}
if (-not $healthy) {
  Write-Host 'API health check failed after 60 seconds.' -ForegroundColor Red
  Show-Rollback
  exit 1
}
Write-Host 'API is up.' -ForegroundColor Green
