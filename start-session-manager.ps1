$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

Write-Host "Building latest Social Publisher extension..."
pnpm.cmd build

$browserRoot = Join-Path $repoRoot ".social-publisher\browser"
$browserExe = Get-ChildItem -Path $browserRoot -Filter chrome.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $browserExe) {
  Write-Host "Dedicated session browser not found; preparing it now..."
  powershell -ExecutionPolicy Bypass -File ".\prepare-session-browser.ps1"
}

Write-Host "Starting Social Publisher Session Manager..."
node ".\session-manager\server.mjs"
