# FORDCAST — CURRENT FULL PROJECT CONTEXT WINDOW / HANDOFF (TX-37 EDITION)

- **Snapshot date:** 2026-10-24
- **Workspace:** `C:\2025AppChallenge`
- **Target District:** **TX-37** (Austin / Travis County & southern Williamson County portion — verify exact home/school address at `house.gov`)
- **Audience:** A future coding agent, reviewer, judge-prep helper, or the student builder. Read this before changing code, claims, demo copy, tests, data, or design. It is a current handoff, not a license to invent results, user studies, native-device tests, or personal experience.

---

## 1. ONE-SENTENCE DESCRIPTION

FordCast is a bilingual (`EN`/`ES`) Central Texas low-water-crossing trip-audit prototype built for Austin-area (**TX-37**) commuters: it combines the crossings on an Austin-area trip (`2,052` mapped crossings within 120 m, grouped by physical crossing area) with official closure reports, active weather alerts, available creek evidence, historical flood context, and explicit unknowns; a separate, clearly experimental upstream-gauge replay study explores whether warnings may precede downstream reference-gauge category thresholds across five archived Austin floods.

- **Public-facing tagline:** `"Check the crossings on your trip."` / `"Revisa los cruces de tu trayecto."`
- **Pilot badge:** `"CENTRAL TEXAS PILOT"` / `"PILOTO DEL CENTRO DE TEXAS"`
- **What it is NOT:** It is NOT a promise that a road is safe, open, passable, dry, or predictable. It is NOT a validated road-flood forecast system. It is NOT evidence that anyone has already been protected, reached, or changed behavior in the field.

---

## 2. WHAT COMPETING IN TX-37 (INSTEAD OF TX-10) CHANGES — AND HOW IT IMPROVES THE IDEA

1. **Direct Geographic Overlap Between TX-37 and the Dataset:**
   - Earlier reviews penalized FordCast when framed for `TX-10` because `TX-10` stretches over 100 miles east into rural counties and Brazos County (`College Station`), where the Austin-area `ATXFloods` dataset (`2,052` crossings) and `19` Austin-area USGS gauges have zero coverage.
   - **TX-37 is centered directly on Austin and Travis County (plus a neighboring southern portion of Williamson County).** Virtually the entire daily commuter footprint of TX-37 lies **inside** FordCast's 80 km Austin-area crossing and stream-gauge inventory.
   - The exact creeks that TX-37 families, teen drivers, and commuters cross every day are directly represented in FordCast's seed catalog, official crossing inventory, and preset routes:
     - **Bull Creek** (Northwest Austin — including `atx-9/10/11` at Old Spicewood Springs Rd and the `Bull Creek -> The Domain` preset)
     - **Shoal Creek** (Central / North-Central Austin, Pease Park, Lamar, Downtown)
     - **Waller Creek** (UT Austin & Downtown)
     - **Barton Creek** (South/Southwest Austin — including `tc-167` Henry Marx Ln, upstream gauge `USGS-08155240` at Lost Creek Blvd, downstream reference gauge `USGS-08155300` at Loop 360, and the `Barton Creek -> UT Austin` preset)
     - **Walnut Creek & Little Walnut Creek** (North / Northeast Austin & southern Williamson County border corridor)
     - **Williamson Creek & Slaughter Creek** (South Austin — including upstream gauge `USGS-08158860` Slaughter Creek at FM 2304)
     - **Onion Creek** (South/Southeast Austin — including `atx-19/20/21` at E. William Cannon Dr, reference gauge `USGS-08159000` at US 183, and the `Downtown -> Onion Creek Park` preset)
     - **Boggy Creek** (East Austin)

2. **The 80 km Coverage Gate Becomes a Feature for Regional Trips, Not an Apology:**
   - Under `TX-10`, the `Austin -> College Station · coverage check` preset had to explain why half of the student's own congressional district lacked data.
   - Under **TX-37**, local commutes (`Downtown`, `UT Austin`, `The Domain`, `Oak Hill`, `Pflugerville`, `South Congress`, `Onion Creek`, `Barton Creek`, `Bull Creek`) are in-footprint TX-37 trips, while the 80 km coverage boundary gate (`assessRouteCoverage`) acts as a **proactive engineering safety guardrail** whenever a TX-37 resident plans a weekend or college road trip outside the Austin metro (such as driving to College Station, Houston, or Dallas): instead of silently showing `"No hazards reported on this route,"` FordCast detects that the route leaves the 80 km Austin-area crossing inventory and directs the driver to statewide TxDOT DriveTexas.

3. **Honesty Boundary to Keep Even Inside TX-37:**
   - Even though TX-37 sits inside the 80 km Austin-area footprint, **do not claim "100% of TX-37 crossings are monitored."** An inventory of `2,052` mapped crossings does not mean every low-lying road spot in TX-37 is mapped, and most mapped crossings lack automated sensors (`111` of the `141` study crossings have no sensor link; only `4` records across `2` corridors are primary-calibrated for live gauge status). That sensor gap is the exact reason TX-37 drivers need FordCast's "unmonitored crossing" audit.

---

## 3. SCIENTIFIC AND SAFETY BOUNDARIES (SEVEN HARD INVARIANTS)

1. **Never use reassurance words for road status:** Banned words: `safe`, `clear`, `passable`, `open`, `normal`, `all clear`, `seguro`, `transitable`, `abierto` (enforced by `mobile/src/__tests__/contracts.test.ts`).
2. **Triple-redundant status encoding (Color + Geometric Shape/Glyph + Text Label, zero traffic-light green):**
   - `no_rise`: Cyan `#2BD9D9` circle + check (`"No rise detected"` / `"Sin crecida detectada"`)
   - `watch`: Amber `#F5A623` triangle + `!` (`"Watch"` / `"Precaución"`)
   - `avoid`: Coral-red `#FF5470` octagon + `!` (`"Avoid"` / `"Evite"`)
   - `closed`: Coral-red `#FF5470` octagon + crossbar (`"Flooded – Closed"` / `"Inundado – Cerrado"`)
   - `unknown`: Slate `#7A879C` dashed circle + `?` (`"Unknown – data offline"` / `"Desconocido – sin datos"`, or `"Not monitored"` / `"Sin sensor"`)
3. **Downstream gauge proxy != road-surface overtopping:** `Tier A = 0` (`road_forecast_verified = false`). Historical ground truth is `proxy_kind: downstream_gauge_flood_stage`. Gauge height is relative to station datum zero, not water depth over pavement.
4. **Strict causal no-lookahead in replays:** Observation `i` is visible at `simT` only if `t_obs(i) + 60 min <= simT`.
5. **Range-only timing windows:** Only conservative range buckets (`[0, 15]`, `[15, 30]`, etc.); when lower bound is `0`, warn that water may already be at the crossing.
6. **Unknown and partial-failure resilience:** Malformed HTTP 200 responses throw errors; expired NWS alerts (`expiresAt <= now`) and stale (`> 60m`) sources are pruned by `activeCachedHazards()`; notification cooldowns are recorded only after delivery succeeds.
7. **Strict isolation of simulation / test state from live navigation:** `planRoute` synchronously removes `test-` hazards before routing; `endRouteTest()` clears synthetic closures; `Go with Google Maps` and `Share route summary` are hidden unless `m.mode === 'live' && !m.testHazard`.

---

## 4. VERIFICATION GATE (184 AUTOMATED TESTS PASSING)

- `cd C:\2025AppChallenge\mobile && node node_modules/typescript/bin/tsc --noEmit --pretty false` -> **PASS (0 errors)**
- `cd C:\2025AppChallenge\mobile && node node_modules/expo/bin/cli lint` -> **PASS (0 errors, 0 warnings)**
- `cd C:\2025AppChallenge\mobile && node node_modules/jest/bin/jest.js --runInBand --watchAll=false` -> **PASS (106 passed across 11 suites)**
- `node C:\2025AppChallenge\extension\test.mjs` -> **PASS (19 passed)**
- `C:\2025AppChallenge\backend\.venv\Scripts\python.exe -m pytest C:\2025AppChallenge\backend\tests` -> **PASS (59 passed)**
