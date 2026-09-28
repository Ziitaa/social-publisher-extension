$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

$browserRoot = Join-Path $repoRoot ".social-publisher\browser"
$browserExe = Get-ChildItem -Path $browserRoot -Filter chrome.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $browserExe) {
  throw "Social Publisher session browser is not installed. Run install-social-publisher-win.ps1 once."
}

node ".\session-manager\server.mjs"
