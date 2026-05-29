# StackCRM launcher — the friendly, no-typing-required way to start the app.
# Invoked by "Launch StackCRM.cmd". Handles first-run setup automatically.

$ErrorActionPreference = "Stop"
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
Write-Host "         Starting StackCRM" -ForegroundColor Cyan
Write-Host "  ===================================" -ForegroundColor Cyan
Write-Host ""

# 1. Is Node.js installed?
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "  Node.js isn't installed on this computer." -ForegroundColor Yellow
  Write-Host "  StackCRM needs it to run." -ForegroundColor Yellow
  Write-Host ""
  Write-Host "  I'll open the download page now. Install the 'LTS' version" -ForegroundColor Yellow
  Write-Host "  (just click Next/Next/Finish), then run this launcher again." -ForegroundColor Yellow
  Start-Sleep -Seconds 2
  Start-Process "https://nodejs.org/en/download/prebuilt-installer"
  Pause-Exit 1
}

# 2. First-run setup: install dependencies if missing.
if (-not (Test-Path (Join-Path $repo "node_modules"))) {
  Write-Host "  First-time setup — installing components." -ForegroundColor Green
  Write-Host "  This happens only once and can take a few minutes..." -ForegroundColor Green
  Write-Host ""
  npm install
  if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "  Setup failed. Please send this window to the person who set this up." -ForegroundColor Red
    Pause-Exit 1
  }
  Write-Host ""
  Write-Host "  Setup complete!" -ForegroundColor Green
  Write-Host ""
}

# 3. Already running? Just open the browser and stop here.
$alreadyUp = $false
try {
  Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2 | Out-Null
  $alreadyUp = $true
} catch { }

if ($alreadyUp) {
  Write-Host "  StackCRM is already running. Opening it in your browser..." -ForegroundColor Green
  Start-Process "http://localhost:3000"
  Write-Host ""
  Write-Host "  (You can close this window.)" -ForegroundColor DarkGray
  Start-Sleep -Seconds 2
  exit 0
}

# 4. Open the browser a few seconds after the server starts (in the background).
Start-Process -WindowStyle Hidden powershell -ArgumentList @(
  "-NoProfile", "-Command",
  "Start-Sleep -Seconds 7; Start-Process 'http://localhost:3000'"
) | Out-Null

Write-Host "  Starting up... your browser will open in a few seconds." -ForegroundColor Green
Write-Host ""
Write-Host "  IMPORTANT: keep this window open while you use StackCRM." -ForegroundColor Yellow
Write-Host "  Closing it shuts the app down." -ForegroundColor Yellow
Write-Host ""

# 5. Run the app (this blocks and keeps the window alive).
npm run dev

# If the server stops/errors, don't let the window vanish before they can read it.
Pause-Exit $LASTEXITCODE
