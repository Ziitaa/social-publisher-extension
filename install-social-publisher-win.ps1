$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

Write-Host "== Social Publisher Windows setup =="

pnpm.cmd install
pnpm.cmd build

$browserRoot = Join-Path $repoRoot ".social-publisher\browser"
$browserExe = Get-ChildItem -Path $browserRoot -Filter chrome.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $browserExe) {
  powershell -ExecutionPolicy Bypass -File ".\prepare-session-browser.ps1"
}

$startupDir = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupDir "Social Publisher Service.lnk"
$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$shortcut.Arguments = '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $repoRoot + '\run-session-manager.ps1"'
$shortcut.WorkingDirectory = $repoRoot
$shortcut.Description = "Social Publisher local session service"
$shortcut.Save()

try {
  $health = Invoke-RestMethod -Uri "http://127.0.0.1:2663/api/health" -TimeoutSec 1
  Write-Host "Session Manager is already running."
} catch {
  Start-Process powershell.exe -WindowStyle Hidden -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", "$repoRoot\run-session-manager.ps1"
  )
  Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "Setup complete."
Write-Host "Session Manager will start automatically with Windows."
Write-Host "Chrome extension build:"
Write-Host (Join-Path $repoRoot "build\chrome-mv3-prod")
