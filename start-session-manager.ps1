$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

if (-not (Test-Path ".\build\chrome-mv3-prod")) {
  Write-Host "Extension build not found; building first..."
  pnpm.cmd build
}

Write-Host "Starting Social Publisher Session Manager..."
node ".\session-manager\server.mjs"
