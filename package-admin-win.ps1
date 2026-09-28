$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

Write-Host "== Social Publisher admin package =="

pnpm.cmd install
pnpm.cmd build

$version = (Get-Content (Join-Path $repoRoot "package.json") -Raw | ConvertFrom-Json).version
$buildDir = Join-Path $repoRoot "build\chrome-mv3-prod"
if (-not (Test-Path $buildDir)) {
  throw "Build directory not found: $buildDir"
}

$distDir = Join-Path $repoRoot "dist"
$stageDir = Join-Path $distDir ("Social-Publisher-" + $version)
$zipPath = Join-Path $distDir ("Social-Publisher-" + $version + "-admin.zip")

if (Test-Path $stageDir) { Remove-Item $stageDir -Recurse -Force }
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

New-Item -ItemType Directory -Path $stageDir -Force | Out-Null
Copy-Item $buildDir (Join-Path $stageDir "extension") -Recurse -Force

$installText = @"
Social Publisher $version - 行政安装说明

1. 解压本压缩包到一个固定目录，不要安装后再移动。
2. 打开 Chrome。
3. 地址栏输入：chrome://extensions/
4. 右上角打开“开发者模式”。
5. 点击“加载已解压的扩展程序”。
6. 选择本压缩包中的 extension 文件夹。
7. 固定 Social Publisher 到 Chrome 工具栏。
8. 平时点击扩展图标即可打开本地发布工作台。

注意：
- 当前版本可直接使用当前 Chrome 登录状态进行单账号发布。
- 新账号池功能目前只保存账号记录；多账号独立会话绑定仍在开发中。
- 小红书固定为“仅填充”，不会自动点击最终发布。
"@
$installText | Set-Content (Join-Path $stageDir "安装说明.txt") -Encoding UTF8

Compress-Archive -Path (Join-Path $stageDir "*") -DestinationPath $zipPath -Force

Write-Host ""
Write-Host "Package ready:"
Write-Host $zipPath
