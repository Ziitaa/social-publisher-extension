$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

$browserRoot = Join-Path $repoRoot ".social-publisher\browser"
New-Item -ItemType Directory -Path $browserRoot -Force | Out-Null

Write-Host "Preparing dedicated Social Publisher session browser..."
Write-Host "This uses Chrome for Testing so isolated account sessions can load the unpacked extension automatically."

npx.cmd --yes @puppeteer/browsers install chrome@stable --path "$browserRoot"

Write-Host ""
Write-Host "Session browser ready under:"
Write-Host $browserRoot
