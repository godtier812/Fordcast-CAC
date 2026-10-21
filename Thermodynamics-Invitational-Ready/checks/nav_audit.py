#!/usr/bin/env python3
"""Navigation and production audit of the compiled PDF.

1. Every \\ref/\\pageref/\\eqref target used in the sources exists in main.aux.
2. PDF: page count, bookmarks (outline) count, internal link annotations, and
   that every internal link resolves to a page inside the document.
3. Retrieval audit: 12 representative cues -> router/index destination ->
   resolved page -> keywords actually present in that page's extracted text.
   (Editor navigation checks, not student drills; human search time NOT measured.)
4. Native text extraction sanity check.
Writes checks/nav_audit_report.md.  Run after a full build.
"""
import os, re, subprocess, glob
from pypdf import PdfReader

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
aux = open(os.path.join(ROOT, "main.aux"), encoding="latin-1").read()
pages = {m.group(1): m.group(2) for m in re.finditer(
    r"\\newlabel\{([^}]*)\}\{\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\{([^}]*)\}", aux)}
numbers = {m.group(1): m.group(2) for m in re.finditer(
    r"\\newlabel\{([^}]*)\}\{\{((?:[^{}]|\{[^{}]*\})*)\}", aux)}

# 1. references used in sources
used = set()
for f in glob.glob(os.path.join(ROOT, "sections", "*.tex")):
    s = open(f, encoding="utf-8").read()
    for m in re.finditer(r"\\(?:ref|pageref|eqref|pg|eqp|eqn|tref|fref|sref|hyperref)\{?\[?([A-Za-z]+:[^]}]+)", s):
        used.add(m.group(1))
missing = sorted(u for u in used if u not in pages)

# 2. PDF structure
pdf = os.path.join(ROOT, "main.pdf")
r = PdfReader(pdf)
npages = len(r.pages)
def count_outline(o):
    n = 0
    for it in o:
        n += count_outline(it) if isinstance(it, list) else 1
    return n
n_bookmarks = count_outline(r.outline)
n_links, bad_links = 0, 0
named = r.named_destinations
for pi, p in enumerate(r.pages):
    for a in p.get("/Annots", []) or []:
        a = a.get_object()
        if a.get("/Subtype") != "/Link":
            continue
        n_links += 1
        dest = a.get("/Dest")
        act = a.get("/A")
        target = None
        if dest is None and act is not None:
            act = act.get_object()
            if act.get("/S") == "/GoTo":
                dest = act.get("/D")
            elif act.get("/S") == "/URI":
                continue
        if isinstance(dest, (str, bytes)) or (hasattr(dest, "__class__") and dest.__class__.__name__ in ("TextStringObject", "ByteStringObject", "NameObject")):
            key = str(dest)
            if key not in named:
                bad_links += 1
            else:
                target = named[key].page
        if target is not None:
            try:
                idx = r.get_page_number(target) if not isinstance(target, int) else target
                if not (0 <= idx < npages):
                    bad_links += 1
            except Exception:
                bad_links += 1

# 3. retrieval audit
def page_text(n):
    return subprocess.run(["pdftotext", "-f", str(n), "-l", str(n), "-layout", pdf, "-"],
                          capture_output=True, text=True).stdout
cues = [
    ("ice partly melts in warm water", "router: Ice added / partial melt", "sec:phasedecision", ["Q_{\\text{av}}", "melted", "Partial melt"]),
    ("specific heat of an unknown metal", "router: Unknown metal", "sec:calorimeters", ["Unknown metal", "Dulong"]),
    ("boiling point at 84 kPa", "router: Boiling point at altitude", "T:water:satP", ["84", "94.80"]),
    ("dew point from relative humidity", "router: Humidity / dew point", "F:phase:RH", ["dew point", "16.7"]),
    ("rms speed of N2", "router: rms / mean / most probable speed", "F:gas:speeds", ["517", "rms"]),
    ("work in a constant-pressure expansion", "router: Constant P ... master table", "T:process:ideal-gas", ["Isobaric", "nR"]),
    ("is a claimed engine possible?", "router: Efficiency / COP / Carnot", "sec:feasibility", ["Three claims", "impossible"]),
    ("R-value conversion US to SI", "router: Wall / R-value", "F:transfer:rvalue", ["5.678", "0.1761"]),
    ("h for a beaker in still air", "router: Natural convection / beaker", "demo:beaker", ["Churchill", "6.1"]),
    ("emissivity / radiation shield", "router: Emissivity / shield", "sec:shields", ["shield", "24.5"]),
    ("cooling time constant from data", "router: Cooling time / fitted slope", "F:transfer:semilog", ["slope", "ILLUSTRATIVE"]),
    ("enthalpy of combustion of methane", "router: Reaction enthalpy / combustion", "sec:thermocal", ["890.5", "HHV"]),
    ("who coined entropy", "index: history timeline", "T:history", ["Clausius", "entropy"]),
]
rows = []
ok_all = True
for cue, route, lab, kws in cues:
    pg = pages.get(lab)
    txt = page_text(int(pg)) if pg and pg.isdigit() else ""
    # allow the following page too (multi-column content continuing)
    txt2 = page_text(int(pg) + 1) if pg and pg.isdigit() and int(pg) < npages else ""
    norm = lambda t: t.replace("\u2009", "").replace(" ", "")
    found = [k for k in kws if norm(k.replace("\\text{av}", "av").replace("Q_{av}", "Qav")) in norm(txt + txt2) or k.split("_")[0] in txt + txt2]
    ok = len(found) == len(kws)
    ok_all &= ok
    rows.append(f"| {cue} | {route} | `{lab}` (eq./tab. {numbers.get(lab, '-')}) | p. {pg} | {', '.join(found)} | {'OK' if ok else 'CHECK'} |")

# 4. text extraction
full = subprocess.run(["pdftotext", pdf, "-"], capture_output=True, text=True).stdout
words = len(full.split())
has_terms = all(t in full for t in ["Clausius", "Stefan", "Carnot", "calorimeter", "Biot"])

rep = []
rep.append("# Navigation and production audit\n")
rep.append(f"- PDF pages: **{npages}** (limit 69, target 64)")
rep.append(f"- Bookmarks (outline entries): {n_bookmarks}")
rep.append(f"- Internal link annotations: {n_links}; unresolved: {bad_links}")
rep.append(f"- Cross-reference targets used in sources: {len(used)}; missing from main.aux: {len(missing)} {missing if missing else ''}")
rep.append(f"- Native text extraction: {words} words extracted; key terms present: {has_terms}")
rep.append("\n## Retrieval audit (navigation paths checked; human search time not measured)\n")
rep.append("| Cue | Route | Destination label | Resolved page | Keywords found on page (or next) | Status |")
rep.append("|---|---|---|---|---|---|")
rep.extend(rows)
open(os.path.join(ROOT, "checks", "nav_audit_report.md"), "w").write("\n".join(rep) + "\n")
print("\n".join(rep))
