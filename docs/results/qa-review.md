> Historical audit of commit 69c90c2. Repairs are tracked in [repair-verification.md](repair-verification.md).
> This file preserves the original findings and old numbers as audit evidence; it is not a current product-claim sheet.

# 1. Executive Summary

**Overall: FAIL — demo/release acceptance is incomplete.** Reviewed commit `69c90c2`
against the master prompt and the supplied browser QA plan. Review date: October 17,
2026, America/Chicago.

Target URL: `http://localhost:8081/`. **Browser viewport: unavailable.** Browser access
returned “Local browser use is disabled in Work settings.” No browser clicks, rendered
DOM inspection, console inspection, screenshots, responsive layout checks, or audio
playback were executed. Source observations below are explicitly not DOM observations.

Executed checks:

- Backend Ruff lint/format: passed; **50 pytest tests passed**.
- Mobile TypeScript/ESLint: passed; **11 Jest tests passed**.
- Expo Doctor: **21/21 passed**.
- Fresh dependency audit: **76 affected packages (57 high, 19 moderate)**; see
  `qa-npm-audit.json`. This is a dependency-path count, not 76 independent vulnerabilities.
- Fresh web, Android and iOS bundle exports: passed. These are not native binary/device tests.
- In-process API checks: health, current risk, crossing inventory/detail, replay index/detail
  and results all returned 200 JSON. Current risk is offline, with 141 Unknown crossings.
- Official USGS spot-check: **25/25 historical values matched** the committed archive.
- NOAA AAIT2 response: flood categories present, **no crossing-specific impact statements**.
- Source/artifact audit: 141 records, A=12/B=18/C=111; **12/12 configured nearest-gauge
  baselines are not nearest** in the committed gauge catalog; 207/264 link rows carry
  `needs_review=true` across live and fold models.
- Replay chart audit: **nine future observations assigned to earlier grid timestamps**,
  independently of the otherwise passing raw-source no-lookahead tests.
- Clean-copy scientific rebuild completed successfully: regenerated `results.json` and
  all five replay gzip files match the committed bytes, including the 70-minute headline. Reproducible calculations do
  not repair invalid ground-truth, comparator, or provenance assumptions.

The passing tests establish internal consistency, not valid road-flooding ground truth.
The largest problems are unsupported “validated” thresholds, invented river geometry,
and an invalid comparator. Fix those before publishing the 70-minute lead-time and
89.3% detection claims. See `qa-evidence.json`; regenerate with
`backend/.venv/Scripts/python tools/qa_audit.py --verify-sources`.

# 2. Website Demo Sample Section Results

PASS requires executed browser acceptance and defensible claims. No sample earns PASS
under the current access limitation.

| Sample | Status | Source/artifact observations, not observed DOM | Discrepancy |
|---|---|---|---|
| Sample 1 | FAIL | Handler selects Halloween 2013. Artifact hero is atx-7, alert 06:15Z, threshold crossing 07:25Z, lead 70 min. Third storyboard is `gauge_silent` at 06:10Z; tc-128 is Unknown then. | “Before the road flooded” is unsupported by crossing-level evidence. Comparator and validation failures invalidate scientific acceptance. Browser transport and outage shading untested. |
| Sample 2 | FAIL | Handler selects Halloween and enables simulation flag. HUD, Repeat/Mute controls and speed/passenger handlers exist. | No browser/audio test. Stop Simulation does not stop the HUD or speech. Voice cleanup depends on unmount instead of tab focus/background. |
| Sample 3 | FAIL | Handler routes to atx-7. Source renders Unknown offline, 15.5 ft threshold, two upstream links, save/watch controls. | “Tier A · Validated threshold” and “Verified road overtop stage” are not supported by the supplied evidence. The assigned target gauge is 4.43 km from this crossing. |

# 3. Full Feature Matrix (Tests 1–5)

| Test | Executed evidence | Browser acceptance |
|---|---|---|
| 1. Pledge | Source starts three unchecked boxes and disables acceptance until all are checked; reset-pledge handler exists. | NOT RUN: checkbox interaction, DOM `aria-disabled`, focus and re-entry. |
| 2. Map/inventory | Artifacts contain 30 A/B, 12 A, 18 B, 111 C, 141 total. New preferences default to atx-7/atx-19/tc-133; an existing saved preference can differ. Current monitored search for Onion gives 4 records. Five filter handlers and legend route exist. | NOT RUN: actual rendered counts, search input, map selection, legend navigation. Inventory status words are absent visually in row source. |
| 3. Replay | All five bundles/indexes passed existing contracts. Storyboard/time/state helpers passed tests. Metric values are present, but their interpretation fails the evidence audit. | NOT RUN: each catalog button, speeds, play/pause, stepping, event navigation, table, plot layout. Playback speed labels are inconsistent with timer math. |
| 4. Alerts | Test action inserts at most five preview cards. Save/watch preferences persist locally. No push registration/fan-out or local notification delivery is implemented in this flow. | NOT RUN: two clicks, rendered log, sound. Copy says alerts enabled/sounds although the handler only stores a flag or text card. |
| 5. Español | Existing tests pass locale-key and interpolation-variable parity and their narrower banned-word regex. | NOT RUN: rendered routes, live-region behavior, truncation, Spanish speech. Imported English source descriptions remain untranslated. Human Spanish review is pending. |

# 4. Safety & Honesty Invariant Audit

**False reassurance:** no safety verdict using the prohibited words was found in locale
copy outside the pledge exception. A literal match exists in “City of Austin Open Data,”
which is a source name, not reassurance. The supplied QA prompt should distinguish this
from a road verdict. The automated regex misses `open`, `clear`, `normal`, `abierto`;
expand it with source-name/context exceptions rather than claiming complete coverage.

**Five states:** existing wire-state tests pass. Live detail explicitly remains Unknown.
However inventory rows compute a state label only for `accessibilityLabel`, and never
render it as visible text. That violates color + shape + visible word redundancy (§3.2).

**Ranges:** no future single-minute countdown was found in reviewed templates. Historical
70-minute performance statistics are allowed only if evidence is valid; they are not
countdowns. The test-alert preview's 15–45 arrival window, required by the newer QA prompt,
is outside the master's seven allowed forecast windows (§18.6). Use an allowed arrival
window; upstream travel-time ranges have a different contract. The master requires
“Water may already be on the road” for windows starting at zero; the Drive HUD only
renders “Likely within 0–15 min” despite having an unused `state.now` translation.

**Simulation labeling:** replay and simulated-drive banner strings exist in both locales.
No claim of active live telemetry was found in detail source. “Monitored,” “Validated,”
“Watch alerts enabled,” NLDI flowline attribution, and road-flooding performance claims
are stronger than the implementation/evidence supports.

**Truth provenance:** AAIT2 category stages (13/14 ft) are assigned as road thresholds
without an impact statement naming those roads. Other rows similarly use broad category
or overbank descriptions. `confirmed_by` is generated as “NWPS/COA archive verification,”
not an actual reviewer/source citation. Distant gauge stage cannot be assumed to equal
water at the road without the documented hydraulic/datum mapping required by §17.6.
Downgrade unsupported labels to proxy/estimated or unverified; exclude them from the
validated headline. Do not relabel real USGS readings as fabricated: the spot-check passed.

# 5. Console, Network & Layout Bugs Found

Console/DOM/layout findings cannot be confirmed without browser access. No console-clean,
network-clean, viewport, touch-target, VoiceOver/TalkBack or WCAG acceptance is claimed.
The following are source/artifact findings with concrete reproduction and fixes.

| Priority | Finding / reproduction | Recommended fix |
|---|---|---|
| P0 | **Unsupported validated road truth.** Sample 3/README claim 12 validated crossings. `tools/build_replays.py:30` hardcodes thresholds; line 437 generates confirmation text. atx-7's target is 4.43 km away; Waters Park's is 15.61 km away. NOAA AAIT2 has no impacts naming Joe Tanner. | Require source URL, retrieved evidence, crossing identity, datum/hydraulic mapping and real review per threshold. Downgrade unsupported rows, then rebuild truth, tiers, metrics, replays, copy and Claims Ledger. |
| P1 | **Comparator is not nearest.** Run `tools/qa_audit.py`: 12 mismatches. atx-7 selects USGS-08158860 but USGS-08158930 is closer (2.44 km). `tools/build_replays.py:81` and other config entries choose baselines manually. | Compute geodesic argmin over a frozen eligible gauge catalog, document exclusions, test against catalog distances and rerun every LOSO comparison. Withdraw current superiority claims meanwhile. |
| P1 | **Invented creek geometry attributed to USGS.** `_make_flowline`, `tools/build_replays.py:265`, creates an endpoint/midpoint polyline with arbitrary offsets. Those lines become creek assets and animated paths. | Use cached NLDI/NHDPlus geometry and verified topology. Otherwise explicitly label schematic links and remove NLDI/real-flowline claims; channel distance also needs source evidence. |
| P1 | **Invented fallback evidence reaches forecasts.** `scoring/backtest.py:149–155` assumes 2.5 m/s, sets `xcorr_r=0.60` and forces at least one training storm even when none passed. `needs_review` is exported but does not block use. | Keep measured evidence null/zero, distinguish transferred assumptions, and gate reviewed/validated use. Recompute primary-link selection and results; do not rank an assumed correlation as a measurement. |
| P1 | **Visible status missing in inventory.** `CrossingRow.tsx:21` computes stateLabel but uses it only in accessibilityLabel. | Render the translated state next to its glyph, including Not monitored for C. Add a rendered-component assertion for visible status text. |
| P1 | **Replay chart leaks future observations.** `replay/build.py::build_stage_grid` chooses the nearest reading within 20 minutes, including future readings, but serializes the grid timestamp. Nine committed assignments are affected. Example: Halloween 2013 USGS-08158200's 19:50Z observation is stored at 19:45Z, so a 60-minute-delay viewer can show it at 20:45Z rather than 20:50Z. | Preserve true observation/availability timestamps, or use a strictly causal grid with correctly aged readings. Add conversion-to-viewer boundary tests using irregular times and gaps; rebuild all charts. This finding concerns the displayed hydrograph, not proof of leakage in the raw tick pipeline. |
| P1 | **Arrival-zero warning omitted.** Start Sample 2, hero window [0,15]; `drive.tsx:177` renders only a range. | Render/speak the explicit water-may-already-be-on-road warning for zero lower bounds, following §3.5. |
| P1 | **Alert enablement implies unavailable functionality.** Enable Watch in crossing detail. `preferences.tsx` stores IDs; Alerts only creates text previews. | Label preferences as preview/unconnected until actual notification permission, registration, delivery and failure feedback are implemented. Distinguish preview, local notification and push. |
| P2 | **Outage banner is delayed by assumed delivery latency.** At 11:20Z in the documented 11:15–13:45 outage, the latest eligible observation predates the outage, so `isGaugeInOutage` is false (`replay.tsx:112`). It becomes true at 12:20Z. | Base the displayed simulated transmission/outage status on the replay clock and explicitly defined knowledge time, separate from historical sample visibility. Add boundary checks and preserve no-lookahead. |
| P2 | **Sample 1 does not reset a previously mounted replay.** Replay transport uses `useState(initialStep)` once; the home sample only changes activeStormId. Returning after stepping/switching storms can retain cursor/gauge. | Add an explicit replay-session/reset token or route input so a guided sample starts deterministically without resetting ordinary tab returns. Verify after switching to another storm and revisiting Sample 1. |
| P2 | **Stop Simulation does not stop simulation/speech.** `drive.tsx:324` toggles simDriveActive; the rest of the screen ignores it. Speech.stop only runs on unmount (`:96`), and tab changes may keep the screen mounted. | Stop speech on stop, blur and background; gate the HUD/session on active state and cancel pending speech on language/storm changes. Verify Repeat → Stop and Repeat → Map. |
| P2 | **Replay speed math does not match labels.** A 5-minute tick advances every `12000/speed` ms (`replay.tsx:77`): 1× advances at 25× real time, and 120× at 3000×. | Define real-time scale (step duration / chosen speed), or label the intended accelerated scale accurately; use elapsed time to avoid timer drift. |
| P2 | **Pre-registration/provenance claims are overstated.** Hero script and results first appear together in commit d7c86f9; generator hardcodes `git_sha="fd9407c"`, which predates that implementation. | Say deterministic median-based selection, without claiming demonstrated pre-registration. Derive actual code revision/content hashes at build time. |
| P1 | **Unmeasured calm-day results are emitted as zero.** `scoring/backtest.py:532` writes Tier-B calm false alarms as 0.0 although scoring uses only Tier-A crossings. Calm metadata claims 2 days, while the rate denominator uses the 36-hour/1.5-day control window. | Use null/not evaluated for unmeasured populations, calculate exposure from timestamps, and add the required independently selected ≥30-day calm set. |
| P2 | **Operational MVP remains incomplete.** Mobile imports bundled state only; API fallback is offline; no persistent live ingestion, snapshot scheduler, actual routing, device push or device acceptance. | Keep prototype/offline scope prominent, and track these as acceptance work rather than completed product features. |

Further release gates: reconcile outage evidence (notes say silent after 04:45Z while the
modeled outage begins 11:15Z), add the master's calm-day false-alarm evaluation, inspect
the dependency advisories, and complete human Spanish/accessibility testing. The newer
QA prompt's exact counts and headline numbers must be recomputed after evidence repairs;
tests must not force the application to preserve invalid results.

Primary evidence consulted: [NOAA AAIT2 gauge metadata](https://api.water.noaa.gov/nwps/v1/gauges/AAIT2)
and [USGS OGC API](https://api.waterdata.usgs.gov/ogcapi/v1/collections/continuous/items).
Raw source values and counts for the bounded checks are summarized in `qa-evidence.json`.
