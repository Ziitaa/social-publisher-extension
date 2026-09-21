$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

Write-Host "== Social Publisher Desktop setup =="

pnpm.cmd install
pnpm.cmd build

$browserRoot = Join-Path $repoRoot ".social-publisher\browser"
$browserExe = Get-ChildItem -Path $browserRoot -Filter chrome.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $browserExe) {
  powershell -ExecutionPolicy Bypass -File ".\prepare-session-browser.ps1"
}

powershell -ExecutionPolicy Bypass -File ".\build-desktop-launcher.ps1"

$exe = Join-Path $repoRoot "dist\SocialPublisher.exe"
if (-not (Test-Path $exe)) {
  throw "Desktop launcher build failed: $exe"
}

$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "Social Publisher.lnk"
$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $exe
$shortcut.WorkingDirectory = $repoRoot
$shortcut.Description = "Social Publisher"
$shortcut.Save()

$startupDir = [Environment]::GetFolderPath("Startup")
$serviceShortcut = Join-Path $startupDir "Social Publisher Service.lnk"
$service = $wsh.CreateShortcut($serviceShortcut)
$service.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$service.Arguments = '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $repoRoot + '\run-session-manager.ps1"'
$service.WorkingDirectory = $repoRoot
$service.Description = "Social Publisher local session service"
$service.Save()

try {
  Invoke-RestMethod -Uri "http://127.0.0.1:2663/api/health" -TimeoutSec 1 | Out-Null
} catch {
  Start-Process powershell.exe -WindowStyle Hidden -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", "$repoRoot\run-session-manager.ps1"
  )
  Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "Desktop setup complete."
Write-Host "Use the desktop shortcut: Social Publisher"
Write-Host "No Google account is required."
