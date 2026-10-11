# uGame v0.2.70: upload eight user-owned hero portraits from Downloads.
# Uses ONLY Windows PowerShell 5.1, System.Drawing and Git. Never edits original PNGs or the main project.
$ErrorActionPreference = 'Stop'
$branch = 'feat/v0270-hero-creation'
$repoUrl = 'https://github.com/sunpole/uGame.git'
$downloads = Join-Path $env:USERPROFILE 'Downloads'
$portraitFiles = @(
  @{ File = 'Изображение ChatGPT 11 окт. 2026 г., 22_45_51-1.png'; Target = 'plate-male.jpg' },
  @{ File = 'Изображение ChatGPT 11 окт. 2026 г., 22_45_52-2.png'; Target = 'plate-female.jpg' },
  @{ File = 'Изображение ChatGPT 11 окт. 2026 г., 22_45_53-3.png'; Target = 'leather-male.jpg' },
  @{ File = 'Изображение ChatGPT 11 окт. 2026 г., 22_45_54-4.png'; Target = 'leather-female.jpg' },
  @{ File = 'Изображение ChatGPT 11 окт. 2026 г., 22_45_55-5.png'; Target = 'cloth-male.jpg' },
  @{ File = 'Изображение ChatGPT 11 окт. 2026 г., 22_45_56-6.png'; Target = 'cloth-female.jpg' },
  @{ File = 'Изображение ChatGPT 11 окт. 2026 г., 22_45_57-7.png'; Target = 'hybrid-male.jpg' },
  @{ File = 'Изображение ChatGPT 11 окт. 2026 г., 22_45_58-8.png'; Target = 'hybrid-female.jpg' }
)
try {
  Write-Host '[1/5] Checking the eight source PNG files...' -ForegroundColor Cyan
  foreach($item in $portraitFiles) {
    $path = Join-Path $downloads $item.File
    if(-not (Test-Path -LiteralPath $path -PathType Leaf)) {
      throw ('Not found: ' + $path + ' - verify the original image filename in Downloads.')
    }
  }
  if(-not (Get-Command git.exe -ErrorAction SilentlyContinue)) {
    throw 'Git for Windows was not found. Please install Git and retry.'
  }
  $workingDirectory = Join-Path $env:TEMP ('uGame-hero-' + [guid]::NewGuid().ToString('N').Substring(0,10))
  Write-Host '[2/5] Creating temporary checkout of the feature branch...' -ForegroundColor Cyan
  & git.exe clone --single-branch --depth 1 --branch $branch $repoUrl $workingDirectory
  if($LASTEXITCODE -ne 0) { throw 'Git clone failed; no source files were modified.' }
  $targetDir = Join-Path $workingDirectory 'assets\characters'
  New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

  Write-Host '[3/5] Converting images to proportional JPEG, quality 86...' -ForegroundColor Cyan
  Add-Type -AssemblyName System.Drawing
  $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq 'image/jpeg' } | Select-Object -First 1
  if(-not $jpegCodec) { throw 'JPEG image encoder is unavailable on this Windows installation.' }
  foreach($item in $portraitFiles) {
    $sourcePath = Join-Path $downloads $item.File
    $outputPath = Join-Path $targetDir $item.Target
    $original = $null
    $bitmap = $null
    $graphics = $null
    $parameters = $null
    try {
      $original = [System.Drawing.Image]::FromFile($sourcePath)
      $height = 1536
      $width = [Math]::Max(1,[int][Math]::Round(($original.Width * $height) / $original.Height))
      $bitmap = [System.Drawing.Bitmap]::new($width,$height)
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      $graphics.Clear([System.Drawing.Color]::FromArgb(41,39,37))
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.DrawImage($original,0,0,$width,$height)
      $parameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
      $parameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new(
        [System.Drawing.Imaging.Encoder]::Quality,[long]86)
      $bitmap.Save($outputPath,$jpegCodec,$parameters)
      Write-Host ('  OK ' + $item.Target + ' (' + [Math]::Round((Get-Item -LiteralPath $outputPath).Length/1KB) + ' KB)')
    }
    finally {
      if($parameters){$parameters.Dispose()}
      if($graphics){$graphics.Dispose()}
      if($bitmap){$bitmap.Dispose()}
      if($original){$original.Dispose()}
    }
  }
  $files = @(Get-ChildItem -LiteralPath $targetDir -Filter '*.jpg' -File)
  if($files.Count -ne 8) { throw ('Expected 8 JPEG files, got ' + $files.Count) }
  Write-Host '[4/5] Committing images only in the separate feature branch...' -ForegroundColor Cyan
  & git.exe -C $workingDirectory add -- assets/characters
  if($LASTEXITCODE -ne 0){throw 'Git staging failed.'}
  & git.exe -C $workingDirectory commit -m 'assets(hero): upload 8 portraits from original PNGs'
  if($LASTEXITCODE -ne 0){throw 'Git commit failed. Check your Git name/email configuration.'}
  Write-Host '[5/5] Pushing the feature branch to GitHub...' -ForegroundColor Cyan
  & git.exe -C $workingDirectory push origin $branch
  if($LASTEXITCODE -ne 0){throw ('Git push failed. Check GitHub authentication. Temporary checkout: ' + $workingDirectory)}
  Write-Host 'SUCCESS: all eight hero portraits are now on GitHub.' -ForegroundColor Green
  Write-Host 'https://github.com/sunpole/uGame/tree/feat/v0270-hero-creation/assets/characters'
}
catch {
  Write-Host ('FAILED: ' + $_.Exception.Message) -ForegroundColor Red
  exit 1
}
