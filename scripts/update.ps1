# StackCRM updater — pulls the latest version from GitHub.
# Invoked by "Update StackCRM.cmd". Safe for non-technical users.
#
# Note: the local database (./.pglite) and your settings (.env.local) are NOT
# touched by updates — they're ignored by git. Any new database changes are
# applied automatically the next time you launch the app.

$repo = Split-Path $PSScriptRoot -Parent
Set-Location $repo

function Pause-Exit($code) {
  Write-Host ""
  Write-Host "Press Enter to close this window..." -ForegroundColor DarkGray
  [void](Read-Host)
  exit $code
}

Write-Host ""
Write-Host "  ===================================" -ForegroundColor Cyan
Write-Host "         Updating StackCRM" -ForegroundColor Cyan
Write-Host "  ===================================" -ForegroundColor Cyan
Write-Host ""

# 1. Is git installed?
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host "  Git isn't installed, so I can't fetch updates." -ForegroundColor Yellow
  Write-Host "  I'll open the download page — install it (click Next/Next/Finish)," -ForegroundColor Yellow
  Write-Host "  then run this updater again." -ForegroundColor Yellow
  Start-Sleep -Seconds 2
  Start-Process "https://git-scm.com/download/win"
  Pause-Exit 1
}

# 2. Was this copy installed with git? (A ZIP download has no .git folder.)
if (-not (Test-Path (Join-Path $repo ".git"))) {
  Write-Host "  This copy of StackCRM can't update itself automatically" -ForegroundColor Yellow
  Write-Host "  (it wasn't installed from GitHub with git)." -ForegroundColor Yellow
  Write-Host ""
  Write-Host "  Ask whoever set this up to reinstall it using 'git clone'." -ForegroundColor Yellow
  Pause-Exit 1
}

# 3. Pull the latest. Fast-forward only — never creates messy merges.
Write-Host "  Checking for updates..." -ForegroundColor Green
git pull --ff-only
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "  Couldn't update automatically. This usually means files here" -ForegroundColor Red
  Write-Host "  were changed by hand. Send this window to the person who set" -ForegroundColor Red
  Write-Host "  this up and they'll sort it out." -ForegroundColor Red
  Pause-Exit 1
}

# 4. Install any new components (quick if nothing changed).
Write-Host ""
Write-Host "  Applying updates..." -ForegroundColor Green
npm install
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "  Update partially failed during install. Try again, or contact" -ForegroundColor Red
  Write-Host "  whoever set this up." -ForegroundColor Red
  Pause-Exit 1
}

Write-Host ""
Write-Host "  All up to date! Launch StackCRM as usual." -ForegroundColor Green
Pause-Exit 0
