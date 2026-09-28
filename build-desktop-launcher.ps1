$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

$distDir = Join-Path $repoRoot "dist"
New-Item -ItemType Directory -Force -Path $distDir | Out-Null

$source = Join-Path $repoRoot "desktop\SocialPublisherLauncher.cs"
$output = Join-Path $distDir "SocialPublisher.exe"

if (Test-Path $output) { Remove-Item $output -Force }

$frameworkRoot = [System.Runtime.InteropServices.RuntimeEnvironment]::GetRuntimeDirectory()
$csc = Join-Path $frameworkRoot "csc.exe"

if (-not (Test-Path $csc)) {
  throw "C# compiler not found: $csc"
}

& $csc /nologo /target:winexe /out:"$output" /reference:System.Net.Http.dll "$source"
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $output)) {
  throw "Desktop launcher compilation failed."
}

Write-Host "Desktop launcher ready:"
Write-Host $output
