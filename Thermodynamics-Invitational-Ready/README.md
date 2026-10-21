# Thermodynamics Division C — Invitational Reference Binder

Unofficial study reference built 2026-10-21 for a tournament on Thursday 22 October 2026 (date resolved in America/Chicago; adjust if your time zone differs).

**Deliverable:** `output/Thermodynamics-DivC-Invitational.pdf` — 41 pages, US Letter, two-sided, grayscale-safe, 7 text-labelled thumb tabs.

> **Before the event:** the official 2027 rules, clarifications, tournament instructions, and device rules were **not** available to this build. Confirm in the Rules Manual and host instructions that a binder is allowed and in what form (page/sheet limits, binding, protectors, tabs), which calculator class is allowed, and every device requirement. See `rules-alignment.md`.

## Contents of this folder

| Path | What it is |
|---|---|
| `main.tex`, `style.tex` | Entry point and preamble (pdfLaTeX; no shell escape; no makeindex) |
| `sections/` | One file per chapter; `19-index-body.tex` is generated |
| `data/` | Generated numeric tables (`*.tex`), `provenance.json`, `index_terms.csv` |
| `scripts/gen_data.py` | Regenerates property/constant tables from versioned authoritative datasets |
| `scripts/gen_conversions.py` | Regenerates the unit-conversion table (pint, exact IT Btu) |
| `scripts/build_index.py` | Builds the curated index from labels in `main.aux`; fails on missing targets |
| `scripts/coverage.py` | Writes `coverage.csv` (spec item → label → page) |
| `checks/demos.py` | Recomputes every solved demonstration with an independent check (63 checks) |
| `checks/nav_audit.py` | Links, bookmarks, cross-references, retrieval audit, text extraction |
| `checks/*_report.*`, `checks/qa_record.md` | Latest check outputs and the final audit |
| `sources.md` | Source and provenance ledger (what was and was not accessed) |
| `rules-alignment.md` | Rules alignment matrix and conflict note |
| `coverage.csv` | Coverage of every required topic, with page numbers |
| `build.sh` | Build pipeline with acceptance checks |

## Build

Tested engine: **pdfTeX 3.141592653-2.6-1.40.25 (TeX Live 2023/Debian)**. Tectonic was not tested.

```bash
./build.sh                # pdflatex passes + index + reference stabilization + checks
./build.sh --regen-data   # also regenerate data tables (needs the Python packages below)
```

`build.sh` copies `main.pdf` to `output/` only if the log has no errors, no undefined references, no missing glyphs, no overfull hbox above 3 pt, and the PDF has at most 69 pages.

Manual equivalent: `pdflatex main.tex` → `python3 scripts/build_index.py` → `pdflatex main.tex` (repeat until no "Rerun" message).

**TeX packages used:** fontenc, lmodern, geometry, amsmath, amssymb, siunitx (v3), array, booktabs, tabularx, longtable, multicol, enumitem, xcolor, tcolorbox, tikz (+ arrows.meta, calc, positioning, decorations.pathreplacing/markings, patterns, intersections), pgfplots (1.18), fancyhdr, mhchem, hyperref, bookmark, needspace. On Debian/Ubuntu: `texlive-latex-base texlive-latex-recommended texlive-latex-extra texlive-pictures texlive-science texlive-fonts-recommended lmodern`.

**Python (only for regenerating data/checks):** scipy 1.18.1 (CODATA 2022), CoolProp 8.0.0, iapws 1.5.5, chemicals 1.5.2, ht 1.2.0, pint 0.26.2, numpy, sympy, pypdf, Pillow; plus `pdftotext`/`pdfinfo` (poppler-utils).

## Known limitations

- Official rules/host documents could not be inspected (network policy blocked soinc.org; nothing attached). Scope and permissions are unverified; the device section is rule-independent physics only.
- Reference web sources (NIST, MIT, OpenStax, Lienhard) were blocked. Numeric data come from versioned implementations of authoritative datasets (IAPWS-95/06, CODATA 2022, CRC via `chemicals`, reference EOS via CoolProp, ASHRAE/EN 12524 via `ht`); the original papers/handbooks were not opened. Items tagged `[EK]` are editor knowledge, unverified this build.
- History timeline is editor knowledge, not source-verified.
- No Antoine table, numeric emissivity table, or bond-enthalpy table (no verifiable source in this build).
- One overfull **vbox** (16.9 pt) is reported by `multicols` during column balancing on p. 17; the rendered page was inspected and shows no clipping or overlap.
- Human retrieval time was not measured; navigation paths were checked programmatically.
