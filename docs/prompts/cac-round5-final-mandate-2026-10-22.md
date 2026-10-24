# Role & Mandate: Brutal Congressional App Challenge (CAC) Head Judge, Principal Product Designer & Anti-"Vibecode" Craftsmanship Auditor (Round 5 Final Check)

You are conducting the **Round 5 Final Pre-Shoot & Submission Audit** of **FordCast** (`C:\2025AppChallenge`), a Central Texas low-water-crossing trip-audit app (Expo React Native + Web in `mobile/`, Chrome MV3 Extension in `extension/`, and Python offline hydrograph/NOAA data pipeline in `backend/` and `tools/`) built for the **Congressional App Challenge (TX-10)**.

Your job is to be **brutally honest, evidence-driven, and allergic to hype or "vibecoded" tells**. Do not rubber-stamp anything because existing tests pass. Inspect the actual source code, run the verification suites, write adversarial probes if you suspect a flaw, and evaluate whether this project looks, reads, and behaves like a **genuine, human-crafted, 1st-place Congressional App Challenge winner**.

---

## 1. What Was Implemented & Repaired in Round 4 (Verify Every Item)

Before auditing, verify that the following Round 4 `P0` repairs (`P0-A` through `P0-H`) and `P1` advancements (`P1-1` through `P1-4`) actually work in the current working tree and were not merely patched on paper:

### Round 4 `P0` Pre-Shoot Blockers Repaired
1. **`P0-A` — First-Launch Geographic Identity & 1-Tap Commute Presets:**
   - `C:\2025AppChallenge\mobile\src\features\onboarding\Pledge.tsx`: Replaced hardcoded `"TX-35 / AUSTIN BASIN"` and `"USGS Upstream Hydrograph Propagation Prototype"` with localized `t('onboarding.pledge.pilot_badge')` (`"CENTRAL TEXAS PILOT"` / `"PILOTO DEL CENTRO DE TEXAS"`) and `t('onboarding.pledge.subtitle')` (`"Check the crossings on your trip"` / `"Revisa los cruces de tu trayecto"`).
   - `C:\2025AppChallenge\mobile\src\screens\home\RoutePanels.tsx`: Removed `(TX-10)` from the `Pflugerville` origin preset in `ORIGIN_PRESETS` and added `COMMUTE_PAIR_PRESETS` (`Downtown → Onion Creek Park`, `Barton Creek → UT Austin`, `Bull Creek → The Domain`, `Austin → College Station (Coverage check)`).
   - `C:\2025AppChallenge\FordCast_CAC_Submission.md`: Aligned geographic scope (`"A Central Texas pilot built by a TX-10 student. Current coverage is centered on Austin; this is not a district-wide service."`), originality statement, and two research corridors (`tc-167` Henry Marx @ Barton Creek and `atx-19/20/21` E. William Cannon Dr @ Onion Creek).
2. **`P0-B` — Honest Location Privacy & Permission Copy:**
   - `C:\2025AppChallenge\mobile\app.json`, `C:\2025AppChallenge\mobile\src\locales\en.json`, `es.json`: Removed `"never leaves your phone"` / `"nunca sale de tu teléfono"` from iOS permission strings and `settings.privacy_body`, disclosing that route planning sends start/destination/avoidance coordinates to the routing service (Valhalla) and place search sends queries/coordinates to the search provider (Photon).
3. **`P0-C` — Expired NWS Warning Pruning & Notification Delivery Tracking:**
   - `C:\2025AppChallenge\mobile\src\lib\guardian-cache.ts`, `guardian.ts`, `guardian.web.ts`: Added and exported `activeCachedHazards(cache, now)` to prune expired NWS warnings (`ev.expiresAt <= now`) and stale (`> 60m`) sources before proximity evaluation on both fresh and fallback cache reads in `GUARDIAN_TASK`.
   - Updated `extractSourceEvidence` so legacy multi-source cache entries do not copy closure reasons into sensor evidence.
   - Moved `sent[h.id] = now` in `guardian.ts` to execute **only after** `sendLocalNotification` returns `true` so failed notification deliveries retry on the next tick.
4. **`P0-D` & `P0-E` — Storm Reroute Demo Duration & Storm-Switch Invariant:**
   - `C:\2025AppChallenge\mobile\src\features\demo\useTripDemo.ts`: Implemented and exported `demoDistanceAt(elapsedSec, baseTotalKm, totalKm, rerouteAtSec, rerouteAtKm)` so pre-decision travel stays aligned with the 3-second storm trigger while post-decision detour travel completes within `DRIVE_SECONDS = 50` and transitions to `'arrived'` inside the interval tick.
   - Added synchronous `isStormMismatch` detection (`m.drill.stormId !== run.trip.stormId && m.drill.stormId !== run.startedDrillStormId`) so changing the drill storm immediately ends any active car run instead of mixing old route geometry with new storm statuses.
   - Renamed `storms.car_demo` to `"Storm reroute demo"` / `"Demostración de desvío"` and updated `trip.body` to describe the precomputed alternative route.
5. **`P0-F` — Continuous Live Aging on Crossing Detail:**
   - `C:\2025AppChallenge\mobile\src\components\fc\Kit.tsx`, `C:\2025AppChallenge\mobile\src\lib\monitor.tsx`, `C:\2025AppChallenge\mobile\src\app\crossing\[id].tsx`: Updated `agoText(t, ms, refNow)` to accept `refNow`, updated the provider clock tick in `monitor.tsx` to `15_000` ms (`15s`), and updated `crossing/[id].tsx` to compute `refNow = Math.max(m.nowMs ?? 0, m.liveFetchedAt ?? 0, m.latestObsAt ?? 0)` and `isStaleLive`, displaying `t('crossing.stale_reading_label')` (`"Last available reading — not current"`) instead of a current reading when `> 80` minutes old.
6. **`P0-G` — Capability-Specific Google Maps Handoff Note:**
   - `C:\2025AppChallenge\mobile\src\screens\home\RoutePanels.tsx`, `en.json`, `es.json`: `RouteCard` queries `guardianSupported()` and `guardianRunning()` and renders `route.google_note_base` followed by `route.google_note_web`, `route.google_note_expo_go`, `route.google_note_off`, or `route.google_note_on`.
7. **`P0-H` — Chrome Extension 80 km Route Coverage Gate:**
   - `C:\2025AppChallenge\extension\lib.js`, `fordcast.js`, `test.mjs`: Added `insideCoverage(pt)` and `assessRouteCoverage(line)` to `extension/lib.js` and updated `evaluateRoute` / `renderRoute` in `extension/fordcast.js` to render an amber out-of-coverage warning and suppress `"No reported hazards on this estimated route"` when `outsideCoverage` is true, and show `"No inventoried crossings matched this estimated route; this does not verify road conditions."` when `watched === 0`.

### Round 4 `P1` Presentation & Recording Upgrades Implemented
1. **`P1-1` — Route Audit Summary (`RouteAuditSummary` in `RoutePanels.tsx`):** Shows `"Official reports: [closed / none returned / unavailable]"`, `"Creek readings: [fresh]/[linked] available"`, `"Nearby history: [distinctEvents] NOAA events within 2 km"`, and the unmonitored-crossing note (`route.summary_unknown_note`), aggregating across all member records (`g.records.some(...)`) of each physical crossing group.
2. **`P1-2` — Trip Evidence Explainer (`TripEvidenceExplainer` in `RoutePanels.tsx`):** Collapsible card right below the summary (`"Why check crossings before leaving?"` with `"Official · Observed · Historical"` tags and plain-language explanation).
3. **`P1-3` — Dev/Recording Director Bar (`DemoDirectorBar.tsx` & `HomeScreen.tsx`):** Toggled via the subtle `Director` pill (`__DEV__` or `?director=1`), providing `Reset take`, `2015 Barton Demo`, and `Stop demo` using real state transitions, placed directly under `TopControls` on both desktop and mobile.
4. **`P1-4` — Pinned Mobile Demo Card & Consolidated Archived Header (`TripCard` in `RoutePanels.tsx` & `HomeScreen.tsx`):** Single `"ARCHIVED SIMULATION · {{storm}}"` header, 48pt-minimum `Stop demo` button, automatic switch to `explore` tab on demo start, and `TripCard` pinned above the mobile sheet `ScrollView` when active.

### Automated Verification Gate Currently Passing
- `cd C:\2025AppChallenge\mobile && node node_modules/typescript/bin/tsc --noEmit --pretty false` → **PASS**
- `cd C:\2025AppChallenge\mobile && node node_modules/expo/bin/cli lint` → **PASS (0 errors, 0 warnings)**
- `cd C:\2025AppChallenge\mobile && node node_modules/jest/bin/jest.js --runInBand --watchAll=false` → **94 passed across 8 suites** (`contracts.test.ts`, `round2-probes.test.ts`, `round4-guardian-probes.test.ts`, `round4-demo-probes.test.tsx`, `routing.test.ts`, `live.test.ts`, `replay-controls.test.ts`, `components.test.tsx`)
- `node C:\2025AppChallenge\extension\test.mjs` → **19 passed**
- `C:\2025AppChallenge\backend\.venv\Scripts\python.exe -m pytest C:\2025AppChallenge\backend\tests` → **59 passed**

---

## 2. Your 6 Audit Tasks (Be Ruthless & Specific)

### Task 1: Anti-"Vibecoded" Craftsmanship & Authenticity Audit
Inspect every screen (`Pledge.tsx`, `HomeScreen.tsx`, `RoutePanels.tsx`, `DriveScreen.tsx`, `StormsScreen.tsx`, `AlertsScreen.tsx`, `crossing/[id].tsx`, `lab.tsx`, `settings.tsx`, `legend.tsx`, and `extension/fordcast.js`) and answer:
- **Does anything look or feel "vibecoded" (AI-generated)?** Look for:
  - Overly robotic/academic phrasing or ALL-CAPS badge clutter on user-facing screens
  - Redundant panels saying the same thing twice in slightly different words
  - Visual noise (too many borders, competing accent colors, cramped cards, inconsistent border radii or padding)
  - Controls or toggles that feel like developer scaffolding rather than a cohesive consumer safety product
  - Hardcoded inline English/Spanish ternary strings (`es ? '...' : '...'`) in `RoutePanels.tsx`, `HomeScreen.tsx`, `StormsScreen.tsx`, or `crossing/[id].tsx` that bypass `en.json`/`es.json`
- List every "vibecoded" tell you find with exact file paths, line numbers, and drop-in replacements that make the app feel human-designed, calm, and intentional.

### Task 2: Plain-Language Readability & Relatability Audit
A Congressional App Challenge judge (or a Texas parent/teen driver checking a commute during rain) should understand every screen in **under 3 seconds**:
- Audit `en.json`, `es.json`, and any inline strings for jargon (`hydrograph`, `corridor`, `datum`, `telemetry`, `proxy`, `LOSO`, `calibrated`) appearing on **primary driver screens** (`Pledge`, `Home`, `RoutePanels`, `Drive`, `Alerts`).
- Scientific terms belong inside `Storms` / `Science Lab` (`/lab`) or expandable `"How this works"` disclosures—and even there, they should be explained in plain, relatable language first.
- Verify that every plain-language replacement **strictly obeys the banned-word contract** in `contracts.test.ts` (`/\b(safe|clear|passable|open|normal|all.clear|seguro|transitable|abierto)\b/i`).

### Task 3: Visual Comfort, Color Ergonomics & Layout Hierarchy
Inspect the color palette and styling across `mobile/src/theme/tokens.ts`, `lib/theme.ts`, `HomeScreen.tsx`, `RoutePanels.tsx`, `DriveScreen.tsx`, `StormsScreen.tsx`, and `crossing/[id].tsx`:
- Are the colors comfortable to look at on camera and at night? Check whether any harsh saturated backgrounds, excessive borders, or low-contrast muted text hurt readability or cause eye strain.
- Check card density in `RouteCard` (`RoutePanels.tsx`): when a user plans a route, how many stacked boxes/panels appear before the actual list of crossings and the Google Maps button? Can `RouteAuditSummary`, `TripEvidenceExplainer`, and the `Source Health & Coverage` box be streamlined so the user isn't hit with a wall of 5 stacked boxes before seeing their crossings?

### Task 4: Relatability, Community Impact & Congressional App Challenge Rubric Score
Grade FordCast (0–10 per category, with brutal deductions and exact ways to gain +1.0 to +2.0 points) against the official Congressional App Challenge rubric:
1. **Quality of the Idea & Community Impact (TX-10 / Central Texas):** How relatable is the problem and workflow to a real Texas family, student commuter, or night-shift worker? How can the app make the human stakes and practical utility feel unmistakable in the first 20 seconds?
2. **Implementation of the Idea & Technical Advancements:** Are the technical advancements (2,052-crossing corridor audit, physical hardware deduplication, multi-source hazard fusion + Valhalla detour handoff, 727-event NOAA history deduplication, causal storm replay with 60-min delay, NHTSA >15 mph Drive HUD lockout, Chrome MV3 extension) presented clearly without overclaiming?
3. **Demonstrated Excellence in Coding, UI/UX & Safety Design:** Code quality, test coverage, failure retention, accessibility, bilingual parity, and epistemic honesty.
4. **Demo Video & Written Submission Readiness (`FordCast_CAC_Submission.md`):** Does the submission package tell a compelling, authentic 9th-grade builder story that aligns 100% with the code?

### Task 5: Adversarial Verification of Round 4 Repairs
- Run all existing verification suites (`tsc`, `expo lint`, `jest`, `extension/test.mjs`, `pytest`).
- If browser/UI inspection is available, test the mobile (`390×844`) and desktop (`1366×860`) flows.
- Try to break the Round 4 repairs with new edge cases (e.g., `RouteAuditSummary` state when feeds are loading vs. failed vs. healthy, `RouteCard` layout density, `TripCard` + `DemoDirectorBar` interaction, `crossing/[id].tsx` stale live state vs. drill mode, or inline `es ? ... : ...` strings). Do not leave temporary test files inside `mobile/src/__tests__/` unless they are permanent passing regressions.

### Task 6: Ranked Final Polish Blueprint (Ready to Implement Immediately)
Deliver a **prioritized, copy-paste-ready implementation blueprint** of the top 5–8 highest-leverage improvements to make right now before filming:
- For every item, provide:
  1. **Why it matters for CAC judges / anti-vibecode polish**
  2. **Exact file path and line numbers**
  3. **Exact drop-in code or locale copy (EN + ES)** (verified against the banned-word regex)
  4. **How to verify it**