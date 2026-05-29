# Stops StackCRM — force-closes whatever is running the app on port 3000.
# Invoked by "Stop StackCRM.cmd". Useful if a window was left open, or as a
# guaranteed off-switch.

$port = 3000

Write-Host ""
Write-Host "  Stopping StackCRM..." -ForegroundColor Cyan
Write-Host ""

$conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if (-not $conns) {
  Write-Host "  StackCRM doesn't appear to be running. Nothing to stop." -ForegroundColor Green
} else {
  $procIds = $conns.OwningProcess | Select-Object -Unique
  foreach ($procId in $procIds) {
    # /T also kills child processes (the dev server's workers).
    taskkill /PID $procId /T /F 2>&1 | Out-Null
  }
  Write-Host "  StackCRM has been stopped." -ForegroundColor Green
}

Write-Host ""
Write-Host "  Press Enter to close this window..." -ForegroundColor DarkGray
[void](Read-Host)
