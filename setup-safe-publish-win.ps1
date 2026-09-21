$ErrorActionPreference = "Stop"

$RepoUrl = "https://github.com/Ziitaa/social-publisher-extension.git"
$Branch = "safe-publish-v0"
$Target = "E:\Projects\social-publisher-extension"

Write-Host "== Social Publisher Extension setup ==" -ForegroundColor Cyan

function Require-Cmd($name, $installHint) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    Write-Host "$name not found. $installHint" -ForegroundColor Yellow
    exit 1
  }
}

Require-Cmd git "Please install Git for Windows first."
Require-Cmd node "Please install Node.js LTS first."

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Write-Host "pnpm not found; installing pnpm..." -ForegroundColor Yellow
  npm install -g pnpm
}

if (-not (Test-Path $Target)) {
  New-Item -ItemType Directory -Force -Path (Split-Path $Target) | Out-Null
  git clone $RepoUrl $Target
}

Set-Location $Target
git fetch origin
git checkout $Branch
git pull --ff-only origin $Branch

pnpm.cmd install
pnpm.cmd build

$BuildDir = Join-Path $Target "build\chrome-mv3-prod"
if (-not (Test-Path $BuildDir)) {
  Write-Host "Build completed but expected extension folder was not found: $BuildDir" -ForegroundColor Red
  Write-Host "Check the build output under: $Target\build"
  exit 1
}

Write-Host ""
Write-Host "Build ready:" -ForegroundColor Green
Write-Host $BuildDir -ForegroundColor Green
Write-Host ""
Write-Host "Chrome will open the Extensions page." -ForegroundColor Cyan
Write-Host "1. Turn on Developer mode"
Write-Host "2. Click Load unpacked"
Write-Host "3. Select: $BuildDir"
Write-Host ""

$chromeCandidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "$($env:ProgramFilesx86)\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$chrome = $chromeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($chrome) {
  Start-Process $chrome "chrome://extensions/"
}
