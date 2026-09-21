$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

$distDir = Join-Path $repoRoot "dist"
New-Item -ItemType Directory -Force -Path $distDir | Out-Null

$source = Join-Path $repoRoot "desktop\SocialPublisherLauncher.cs"
$output = Join-Path $distDir "SocialPublisher.exe"

if (Test-Path $output) { Remove-Item $output -Force }

Add-Type -Path $source -ReferencedAssemblies @("System.Net.Http.dll") -OutputAssembly $output -OutputType WindowsApplication -CompilerOptions "/langversion:latest"

Write-Host "Desktop launcher ready:"
Write-Host $output
