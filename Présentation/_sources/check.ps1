param([string]$code, [string]$names)
$dir = Get-ChildItem "C:\Users\Thierry MINKA\OneDrive\Documents\COURS\$code" -Directory | Where-Object { $_.Name -like "Pr*sentation" } | Select-Object -First 1
$app = New-Object -ComObject PowerPoint.Application
foreach ($name in $names.Split(",")) {
  $p = $app.Presentations.Open((Join-Path $dir.FullName "$name.pptx"), $true, $false, $false)
  $H = $p.PageSetup.SlideHeight
  $n = 0
  foreach ($s in $p.Slides) {
    foreach ($sh in $s.Shapes) {
      if ($sh.HasTable) {
        $tb = $sh.Top; $th = 0
        for ($r = 1; $r -le $sh.Table.Rows.Count; $r++) { $th += $sh.Table.Rows.Item($r).Height }
        if ($tb + $th -gt $H - 34) { "{0} s{1} TABLE bas={2:N0}pt" -f $name, $s.SlideIndex, ($tb + $th); $n++ }
      } elseif ($sh.HasTextFrame -and $sh.TextFrame2.HasText) {
        $bh = $sh.TextFrame2.TextRange.BoundHeight
        if ($sh.Top -lt 495 -and ($sh.Top + [Math]::Max($bh, 0)) -gt 508 -and $sh.TextFrame2.VerticalAnchor -eq 1) { "{0} s{1} PIED : {2}" -f $name, $s.SlideIndex, $sh.TextFrame2.TextRange.Text.Substring(0, [Math]::Min(50, $sh.TextFrame2.TextRange.Text.Length)); $n++ }
        if ($bh -gt $sh.Height + 3) { "{0} s{1} DEBORD +{2:N0}pt : {3}" -f $name, $s.SlideIndex, ($bh - $sh.Height), $sh.TextFrame2.TextRange.Text.Substring(0, [Math]::Min(50, $sh.TextFrame2.TextRange.Text.Length)); $n++ }
      }
    }
  }
  "$name : $n alerte(s)"
  $p.Close()
}
