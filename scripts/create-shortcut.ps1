# Creates a "StackCRM" shortcut on the Desktop that points at the launcher.
# Run once (via "Create Desktop Shortcut.cmd"). Safe to re-run.

$ErrorActionPreference = "Stop"
$repo = Split-Path $PSScriptRoot -Parent
$launcher = Join-Path $repo "Launch StackCRM.cmd"

$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "StackCRM.lnk"

$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut($shortcutPath)
$lnk.TargetPath = $launcher
$lnk.WorkingDirectory = $repo
$lnk.Description = "Launch StackCRM"
$lnk.WindowStyle = 1
# Use a generic app icon from the OS so it looks intentional.
$lnk.IconLocation = "$env:SystemRoot\System32\shell32.dll,13"
$lnk.Save()

Write-Host ""
Write-Host "  Done! There's now a 'StackCRM' icon on the Desktop." -ForegroundColor Green
Write-Host "  Double-click it any time to start the app." -ForegroundColor Green
Write-Host ""
Write-Host "  Press Enter to close..." -ForegroundColor DarkGray
[void](Read-Host)
