#!/bin/bash
# usage: qa.sh SIGLE JOUR [JOUR...]  -> construit, exporte en PNG et assemble les planches
S="C:/Users/THIERR~1/AppData/Local/Temp/claude/C--Users-Thierry-MINKA-OneDrive-Documents-COURS-MSN-2S3-MSI03/a18f30ba-e07c-4044-981a-e307c19f3c77/scratchpad"
PY="/c/Users/Thierry MINKA/AppData/Local/Python/bin/python.exe"
sig=$1; shift
case $sig in GCI) code=MSN-2S3-MSI03;; ACSI) code=MSN-2S3-MSI05;; esac
cd "$S/gen"
for j in "$@"; do
  "$PY" run.py $sig $j || exit 1
  if [ "$j" = "0" ]; then f="${sig}_00_vision_globale"; else f=$(printf "%s_J%02d" $sig $j); fi
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$S/gen/render.ps1" -code $code -name $f -outdir "$S/png/$f" >/dev/null
  "$PY" sheet.py "$S/png/$f" 8 | sed 's#.*/png/#png/#'
done
