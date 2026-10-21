#!/usr/bin/env bash
# Build the binder with pdfLaTeX (no shell escape, no makeindex).
#   ./build.sh               build from committed data tables
#   ./build.sh --regen-data  also regenerate data/*.tex (needs the Python packages in README)
# The PDF is copied to output/ only if the log is free of errors, undefined
# references, and missing glyphs, so a failed candidate never overwrites a good one.
set -euo pipefail
cd "$(dirname "$0")"

if [[ "${1:-}" == "--regen-data" ]]; then
  python3 scripts/gen_data.py
  python3 scripts/gen_conversions.py
fi

run() { pdflatex -interaction=nonstopmode -halt-on-error main.tex > build.log.txt 2>&1 || { tail -40 build.log.txt; exit 1; }; }

run                                  # pass 1: labels
python3 scripts/build_index.py       # curated index from labels (fails on missing targets)
for i in 1 2 3 4; do                 # repeat until references are stable
  run
  grep -q "Rerun to get" main.log || break
done

fail=0
grep -E "^! " main.log && fail=1 || true
grep -E "undefined" main.log && fail=1 || true
grep -E "Missing character" main.log && fail=1 || true
python3 - <<'EOF' || fail=1
import re, sys
log = open("main.log", encoding="latin-1").read()
big = [float(x) for x in re.findall(r"Overfull \\hbox \(([\d.]+)pt", log) if float(x) > 3.0]
if big:
    print("overfull hbox > 3pt:", big); sys.exit(1)
EOF
pages=$(pdfinfo main.pdf | awk '/^Pages:/{print $2}')
echo "pages: $pages"
if (( pages > 69 )); then echo "FAIL: more than 69 pages"; fail=1; fi

if (( fail == 0 )); then
  mkdir -p output
  cp main.pdf output/Thermodynamics-DivC-Invitational.pdf
  echo "OK -> output/Thermodynamics-DivC-Invitational.pdf"
else
  echo "Build checks failed; output/ left unchanged."; exit 1
fi
