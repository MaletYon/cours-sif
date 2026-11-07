param([string]$code, [string]$name, [string]$outdir)
$dir = Get-ChildItem "C:\Users\Thierry MINKA\OneDrive\Documents\COURS\$code" -Directory | Where-Object { $_.Name -like "Pr*sentation" } | Select-Object -First 1
$pptx = Join-Path $dir.FullName "$name.pptx"
New-Item -ItemType Directory -Force $outdir | Out-Null
Get-ChildItem $outdir -Filter *.png | Remove-Item -Force
$app = New-Object -ComObject PowerPoint.Application
$p = $app.Presentations.Open($pptx, $true, $false, $false)
foreach ($s in $p.Slides) { $s.Export((Join-Path $outdir ("s{0:D2}.png" -f $s.SlideIndex)), "PNG", 1280, 720) }
$p.Close()
