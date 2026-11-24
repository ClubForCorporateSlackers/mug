# docs/architecture-diagram/ の SVG を PNG（3840×2160）に書き出す。
# Windows に入っている Microsoft Edge を、画面を出さずに起動して撮る。
# 使い方（リポジトリのルートで）：powershell -ExecutionPolicy Bypass -File docs/architecture-diagram/export-png.ps1
$ErrorActionPreference = 'Stop'
$dir = $PSScriptRoot
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$profileDir = Join-Path $env:TEMP 'mug-diagram-edge'

Get-ChildItem -Path $dir -Filter '*.svg' | ForEach-Object {
  $png = [System.IO.Path]::ChangeExtension($_.FullName, '.png')
  $uri = ([System.Uri]$_.FullName).AbsoluteUri
  if (Test-Path $png) { Remove-Item $png }
  # Edge は無害な警告を標準エラーに出すので、Start-Process で起動して終わるまで待つ
  $edgeArgs = @('--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', "--user-data-dir=`"$profileDir`"",
    '--window-size=1920,1080', '--force-device-scale-factor=2', "--screenshot=`"$png`"", $uri)
  Start-Process -FilePath $edge -ArgumentList $edgeArgs -Wait -WindowStyle Hidden
  if (-not (Test-Path $png)) { throw "書き出せませんでした：$png" }
  Write-Output "書き出し：$png"
}
