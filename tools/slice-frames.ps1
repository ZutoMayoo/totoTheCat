<#
  toto-the-cat 工具：把画师交付的「水平长图」（spritesheet）切成插件可用的逐帧 PNG。

  典型用法（四帧动画，输出 assets/idle-0.png … idle-3.png）：
    pwsh -File tools/slice-frames.ps1 -Source "assets\猫_待机\猫_待机.png" -Frames 4

  参数：
    -Source   源图片路径（水平排列的帧条，PNG 带透明）
    -Frames   帧数；不填则按全透明列间隙自动推断
    -OutDir   输出目录（默认 assets）
    -Prefix   输出前缀（默认 idle → idle-0.png、idle-1.png…）
    -NoPad45  关闭 4:5 透明扩展（默认开：每帧扩展为 4:5 画幅并底对齐，
              与托托显示容器 4:5 一致，无 contain 留白）
#>
param(
  [Parameter(Mandatory = $true)][string]$Source,
  [int]$Frames = 0,
  [string]$OutDir = "assets",
  [string]$Prefix = "idle",
  [switch]$NoPad45
)

Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Bitmap]::FromFile((Resolve-Path $Source))
$W = $src.Width
$H = $src.Height
Write-Host "源图: $W x $H px"

# ---- 帧宽推断：显式帧数 -> 等分；否则按全透明列间隙聚类 ----
if ($Frames -le 0) {
  $col = New-Object 'int[]' $W
  for ($x = 0; $x -lt $W; $x++) {
    $n = 0
    for ($y = 0; $y -lt $H; $y++) { if ($src.GetPixel($x, $y).A -gt 0) { $n++ } }
    $col[$x] = $n
  }
  $runs = @()
  $start = -1
  for ($x = 0; $x -le $W; $x++) {
    $empty = ($x -eq $W) -or ($col[$x] -eq 0)
    if ($empty -and $start -ge 0) {
      if ($x - $start -ge 2) { $runs += , @($start, $x - 1) }
      $start = -1
    } elseif ((-not $empty) -and ($start -lt 0)) { $start = $x }
  }
  $Frames = $runs.Count
  Write-Host "自动推断: $Frames 帧"
}
$fw = [int]($W / $Frames)
Write-Host "帧宽: $fw px"

# ---- 逐帧切出；默认扩展为 4:5（宽:高 = 4:5）并底对齐 ----
if ($NoPad45) {
  $targetH = $H
} else {
  $targetH = [int][math]::Ceiling($fw * 1.25)
}
Write-Host "输出帧尺寸: ${fw} x $targetH px (4:5扩展=$(-not $NoPad45))"
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

for ($f = 0; $f -lt $Frames; $f++) {
  $frame = New-Object System.Drawing.Bitmap($fw, $targetH)
  $g = [System.Drawing.Graphics]::FromImage($frame)
  $g.Clear([System.Drawing.Color]::Transparent)
  $srcRect = New-Object System.Drawing.Rectangle(($f * $fw), 0, $fw, $H)
  if ($NoPad45) { $dstY = 0 } else { $dstY = $targetH - $H }
  $dstRect = New-Object System.Drawing.Rectangle(0, $dstY, $fw, $H)
  $g.DrawImage($src, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $outPath = Join-Path (Resolve-Path $OutDir) ("$Prefix-$f.png")
  $frame.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $frame.Dispose()
  Write-Host "已输出: $outPath"
}
$src.Dispose()
Write-Host "完成。放好文件后重启 dsh web 即生效。"
