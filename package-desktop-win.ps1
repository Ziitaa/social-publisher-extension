$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

Write-Host "== Packaging Social Publisher Desktop =="

pnpm.cmd install
pnpm.cmd build
powershell -ExecutionPolicy Bypass -File ".\build-desktop-launcher.ps1"

$browserRoot = Join-Path $repoRoot ".social-publisher\browser"
$browserExe = Get-ChildItem -Path $browserRoot -Filter chrome.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $browserExe) {
  powershell -ExecutionPolicy Bypass -File ".\prepare-session-browser.ps1"
}

$node = (Get-Command node.exe -ErrorAction Stop).Source
$outRoot = Join-Path $repoRoot "dist\Social-Publisher-Desktop"

if (Test-Path $outRoot) {
  Remove-Item $outRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $outRoot | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $outRoot "dist") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $outRoot "build") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $outRoot "session-manager") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $outRoot "runtime") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $outRoot ".social-publisher") | Out-Null

Copy-Item ".\dist\SocialPublisher.exe" (Join-Path $outRoot "dist\SocialPublisher.exe") -Force
Copy-Item ".\build\chrome-mv3-prod" (Join-Path $outRoot "build\chrome-mv3-prod") -Recurse -Force
Copy-Item ".\session-manager\server.mjs" (Join-Path $outRoot "session-manager\server.mjs") -Force
Copy-Item ".\run-session-manager.ps1" (Join-Path $outRoot "run-session-manager.ps1") -Force
Copy-Item $node (Join-Path $outRoot "runtime\node.exe") -Force
Copy-Item $browserRoot (Join-Path $outRoot ".social-publisher\browser") -Recurse -Force

$installLines = @(
  '$ErrorActionPreference = "Stop"',
  '$root = Split-Path -Parent $MyInvocation.MyCommand.Path',
  '$exe = Join-Path $root "dist\SocialPublisher.exe"',
  '$desktop = [Environment]::GetFolderPath("Desktop")',
  '$wsh = New-Object -ComObject WScript.Shell',
  '$shortcut = $wsh.CreateShortcut((Join-Path $desktop "Social Publisher.lnk"))',
  '$shortcut.TargetPath = $exe',
  '$shortcut.WorkingDirectory = $root',
  '$shortcut.Description = "Social Publisher"',
  '$shortcut.Save()',
  '$startupDir = [Environment]::GetFolderPath("Startup")',
  '$service = $wsh.CreateShortcut((Join-Path $startupDir "Social Publisher Service.lnk"))',
  '$service.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"',
  '$service.Arguments = ''-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "'' + $root + ''\run-session-manager.ps1"''',
  '$service.WorkingDirectory = $root',
  '$service.Description = "Social Publisher local service"',
  '$service.Save()',
  'try { Invoke-RestMethod -Uri "http://127.0.0.1:2663/api/health" -TimeoutSec 1 | Out-Null } catch {',
  '  Start-Process powershell.exe -WindowStyle Hidden -ArgumentList @("-NoProfile","-ExecutionPolicy","Bypass","-File",(Join-Path $root "run-session-manager.ps1"))',
  '  Start-Sleep -Seconds 2',
  '}',
  'Start-Process $exe'
)
$installLines | Set-Content (Join-Path $outRoot "Install.ps1") -Encoding ASCII

$cmdLines = @(
  '@echo off',
  'cd /d "%~dp0"',
  'powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install.ps1"'
)
$cmdLines | Set-Content (Join-Path $outRoot "Install.cmd") -Encoding ASCII

$readmeLines = @(
  'Social Publisher Desktop',
  '',
  'First-time setup:',
  '1. Extract the whole folder to a fixed location.',
  '2. Double-click Install.cmd.',
  '3. A Social Publisher shortcut will be created on the Desktop.',
  '4. After that, use the Desktop shortcut.',
  '',
  'No Google/Gmail account is required.',
  'No Chrome developer mode is required.',
  'No manual browser-extension installation is required.',
  'Platform accounts still need to be signed in once when first bound.'
)
$readmeLines | Set-Content (Join-Path $outRoot "README.txt") -Encoding ASCII

$zipPath = Join-Path $repoRoot "dist\Social-Publisher-Desktop.zip"
if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

Compress-Archive -Path (Join-Path $outRoot "*") -DestinationPath $zipPath -Force

Write-Host ""
Write-Host "Desktop package ready:"
Write-Host $zipPath
