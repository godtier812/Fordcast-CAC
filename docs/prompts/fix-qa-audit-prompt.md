# Prompt: Fix All QA Audit Findings (`docs/results/qa-review.md`) & Rebuild FordCast Prototype

Copy and paste the prompt below into an AI coding agent with workspace and terminal access:

---

```markdown
You are an autonomous senior engineering & scientific-verification agent working in the `C:\2025AppChallenge` repository (FordCast — Congressional App Challenge prototype).

A strict independent QA & scientific audit was just run on commit `69c90c2`. It produced:
- `docs/results/qa-review.md` — full audit report with P0, P1, and P2 findings
- `docs/results/qa-evidence.json` — machine-readable audit evidence
- `tools/qa_audit.py` — automated audit script

Your job is to **fix every P0, P1, and P2 finding in `docs/results/qa-review.md`**, rebuild all deterministic storm artifacts and metrics (`data/replays/*.json.gz`, `docs/results/results.json`, `docs/results/results.md`, `docs/CLAIMS.md`), update tests and `docs/prompts/chatgpt-browser-qa-and-demo-prompt.md` to match the repaired ground truth, and verify that both `./tools/check.ps1` and `tools/qa_audit.py` pass with zero unresolved scientific or UI defects.

## 1. Required Reading First (In Order)
1. Read `docs/results/qa-review.md` and `docs/results/qa-evidence.json` in full.
2. Read `tools/qa_audit.py` to see how every automated check is computed.
3. Consult `docs/master-prompt/00-START-HERE.md` and the specific sections referenced in `qa-review.md` (§3.2, §3.5, §17.6, §18.6, §19).

---

## 2. Mandatory Fixes by Priority

### P0-1: Truth Provenance & Honest Threshold Tiering (`tools/build_replays.py`, `data/seed/crossings.geojson`, `docs/CLAIMS.md`, Mobile Copy)
- **Problem:** `tools/build_replays.py:30` (`TIER_A_CONFIG`) labels 12 crossings as `"Tier A · Validated threshold"` and claims warnings occurred *"before the road flooded"*, even where thresholds are broad NWS gauge flood-stage categories (e.g., `AAIT2` 13/14 ft on Williamson Creek, where NOAA `AAIT2` has no road-specific `impacts` naming `Joe Tanner Ln`) or where the target gauge is kilometers away (`atx-7` is `4.43 km` from `USGS-08158970`; `atx-3/12/13` are `15.6–16.0 km` from `USGS-08158600`) without a documented hydraulic/datum transfer. Additionally, `confirmed_by` is hardcoded as `"NWPS/COA archive verification"`.
- **Required Fix:**
  1. Only classify a crossing threshold as road-level `Tier A (Validated road overtop)` if there is a specific, cited official source URL + impact statement or documented datum/hydraulic mapping tying that stage to that specific road crossing.
  2. For crossings evaluated against a downstream USGS/NWS gauge's official flood/action stage without a surveyed road-deck transfer, explicitly label their threshold provenance as **NWS/USGS Gauge Flood-Stage Reference (Proxy Threshold)** rather than *"Verified road overtop stage"*.
  3. Replace generic `confirmed_by="NWPS/COA archive verification"` with the exact source citation (e.g., `NOAA NWPS gauge <LID> flood category stage (<URL>) — corridor proxy; road-deck elevation unverified`).
  4. Update all user-facing and documentation claims (`mobile/src/i18n/en.json`, `mobile/src/i18n/es.json`, `docs/CLAIMS.md`, `docs/results/results.md`, `README.md`) so lead-time claims state **"before the downstream reference gauge reached NWS flood stage"** (or clearly distinguish gauge flood-stage lead time vs. verified road overtop) rather than claiming unsupported road-surface overtopping.

### P1-1: True Geodesic Nearest-Gauge Baseline Comparator (`tools/build_replays.py`, `backend/fordcast/scoring/backtest.py`)
- **Problem:** All 12 configured `nearest_baseline` gauges in `tools/build_replays.py` are not the geometrically closest gauge in `data/seed/gauges.geojson` (`qa-evidence.json` shows 12/12 mismatches; e.g., `atx-7` used `USGS-08158860` instead of `USGS-08158930` at `2.44 km`, and `atx-19/20/21` used `USGS-08158840` instead of `USGS-08158970`).
- **Required Fix:**
  1. Compute the `nearest_baseline` comparator programmatically as the geodesic `argmin` distance over the eligible gauge catalog in `data/seed/gauges.geojson` (or if comparing against the local target corridor gauge vs. upstream network, name the comparator accurately as `target_gauge_persistence_baseline` AND also report the true geometric `nearest_gauge_baseline` with zero mismatches in `tools/qa_audit.py`).
  2. Add a pytest assertion verifying that every evaluated crossing's nearest-gauge comparator matches the true geodesic minimum distance in `data/seed/gauges.geojson` (or documented eligible subset with explicit exclusion reasons).
  3. Re-run the LOSO backtest and update all lead-time gain numbers across artifacts and docs.

### P1-2: Strictly Causal Replay Hydrograph Stage Grid (`backend/fordcast/replay/build.py`)
- **Problem:** `build_stage_grid` (`backend/fordcast/replay/build.py:62-88`) selects the observation with minimum `abs(obs_time - target)` within `±20 minutes` (`1200s`). This caused 9 irregular readings across 2013/2015 (e.g., `USGS-08158200` at `19:50Z` placed in slot `19:45Z`) to be assigned to an earlier grid timestamp, exposing them 5–15 minutes early in the chart.
- **Required Fix:**
  1. Make `build_stage_grid` strictly causal: for grid slot `target`, only consider observations with `obs_time <= target` (and `target - obs_time <= max_staleness_s`, e.g., `1200s`), selecting the most recent observation at or before `target`, OR store the true `obs_time` alongside each sample so the viewer filters by `obs_time + avail_delay_s <= cursor_time`.
  2. Add a unit test in `backend/tests/test_no_lookahead.py` that verifies `future_grid_assignments == []` across all 5 built replay bundles and tests irregular timestamps (`19:50Z` must never appear at `19:45Z`).

### P1-3: Creek Flowline Geometry & Attribution (`tools/build_replays.py`, Mobile Map/Settings Copy)
- **Problem:** `_make_flowline` (`tools/build_replays.py:265`) generates 3-point schematic polylines with arbitrary midpoint offsets while UI copy attributes creek flowlines to USGS NLDI.
- **Required Fix:**
  1. Either fetch and cache real USGS NLDI/NHDPlus flowline geometries into `data/seed/creeks.geojson` and bundle them into the replay files, **OR** explicitly label the polylines in code, data (`properties.geometry_source = "schematic_corridor_connector"`), and UI/attribution copy as **schematic gauge-to-crossing corridor connectors** and remove any false claim that the drawn map lines are real USGS NLDI stream geometries.

### P1-4: Do Not Substitute Invented Fallback Parameters in `calibrate_link` (`backend/fordcast/scoring/backtest.py`)
- **Problem:** `calibrate_link` (`backend/fordcast/scoring/backtest.py:149-155`) falls back to `celerity_mps = 2.5`, `xcorr_r = 0.60`, and `n_training_storms = max(1, ...)` when no training storm passes the cross-correlation threshold, and `needs_review` does not block the link from generating forecasts.
- **Required Fix:**
  1. When no training storm passes calibration quality gates, record measured `xcorr_r = 0.0` (or `null`), `n_training_storms = 0`, and `needs_review = True`.
  2. Gate forecast generation or clearly separate uncalibrated/kinematic-prior links from empirically calibrated links (`needs_review == False`), and never report an assumed `0.60` correlation or forced `n_training_storms >= 1` as measured evidence.

### P1-5: Unmeasured Calm-Day False Alarms (`backend/fordcast/scoring/backtest.py`)
- **Problem:** `backtest.py:532` emits `tier_b_calm_fa_per_day: 0.0` even though Tier-B crossings were not evaluated in the calm-window loop, and `calm-2024/meta.toml` says `2` days while the timestamp window is `36 hours` (`1.5 days`).
- **Required Fix:**
  1. Compute calm control duration directly from the actual series timestamps (`1.5 days`, or evaluate Tier B explicitly across the calm window). If Tier B is not evaluated, emit `tier_b_calm_fa_per_day: null` (`Not evaluated in prototype archive`), never `0.0`.
  2. Reconcile `data/storms/calm-2024/meta.toml` with the actual timestamp span and clearly document in `docs/results/results.md` and `docs/CLAIMS.md` that the bundled calm control window is a 36-hour smoke control (not a full 30-day calm evaluation).

### P1-6: Visible Status Word Next to Glyph in Inventory Rows (`mobile/src/components/CrossingRow.tsx`)
- **Problem:** `CrossingRow.tsx:21` computes `stateLabel` and attaches it to `accessibilityLabel`, but does not render the visible status text next to `StatusGlyph` (§3.2 requires shape + color + visible text word).
- **Required Fix:**
  1. Render a visible `<Text>` element showing `stateLabel` (`Unknown – data offline`, `Not monitored`, etc.) alongside `<StatusGlyph>` in `CrossingRow.tsx`.
  2. Add a Jest test in `mobile/src/__tests__/components.test.tsx` asserting that `CrossingRow` renders the visible status text for every state including `unmonitored` and `unknown`.

### P1-7: Arrival-Zero Warning (`state.now`) in Drive HUD & Alerts (`mobile/src/app/(tabs)/drive.tsx`, `mobile/src/i18n/`)
- **Problem:** When the forecast window is `[0, 15]`, `drive.tsx:177` renders `"Likely within 0–15 min"` without the required `"Water may already be on the road"` (`t('state.now')`) warning (§3.5). Also, in `alerts.tsx`, the test alert preview uses `[15, 45]`, which is not one of the master prompt's seven allowed arrival windows (§18.6: `[0,15], [15,30], [30,45], [45,60], [60,90], [90,120], [120,180]`).
- **Required Fix:**
  1. Whenever a forecast arrival window has `min === 0` (`[0, 15]`), render and speak `t('state.now')` (*"Water may already be on the road"* / *"El agua ya podría estar sobre el camino"*) alongside `"Likely within 0–15 min"`.
  2. Change the test alert preview arrival window in `alerts.tsx` (and locale strings) from `15–45 min` to an allowed §18.6 window (`15–30 min`).

### P1-8: Honest Alert Toggle & Offline Prototype Copy (`mobile/src/app/crossing/[id].tsx`, `mobile/src/app/(tabs)/alerts.tsx`)
- **Problem:** Enabling Watch alerts displays `"Watch alerts enabled"` / sound descriptions even though push registration/background delivery is not connected in the offline prototype.
- **Required Fix:**
  1. Update the button and status copy in `crossing/[id].tsx` and `alerts.tsx` (both EN and ES) to explicitly say **"Watch preference saved locally (preview only — live push not connected)"**.

### P2-1: Outage Banner Timing (`mobile/src/app/(tabs)/replay.tsx` & `data/storms/halloween-2013/meta.toml`)
- **Problem:** `isGaugeInOutage` in `replay.tsx:103` checks `samples[samples.length - 1]?.inOutage` on the delay-filtered sample array, so during the `11:15Z–13:45Z` outage it stays `false` at `11:20Z` and only turns `true` at `12:20Z`. Also reconcile the `halloween-2013/meta.toml` notes text (`04:45Z` vs `11:15Z–13:45Z` modeled telemetry dropout).
- **Required Fix:**
  1. Check whether the selected gauge is currently in an active telemetry outage at `currentFrame.t` (or when time since last received reading exceeds the expected cadence/outage threshold at `currentFrame.t`), so the outage warning banner activates immediately at `11:20Z` during the `11:15Z–13:45Z` window while still keeping future observations hidden.
  2. Reconcile the outage note in `data/storms/halloween-2013/meta.toml` and storyboard description so the documented window and modeled outage timestamps match.

### P2-2: Sample 1 Deterministic Replay Reset (`mobile/src/app/(tabs)/index.tsx`, `mobile/src/app/(tabs)/replay.tsx`, `mobile/src/store/preferences.tsx`)
- **Problem:** Clicking Sample 1 on the Map tab after already visiting `/replay` only calls `setActiveStormId('halloween-2013')`, leaving `stepIdx` and `selectedGaugeId` unchanged if `halloween-2013` was already active.
- **Required Fix:**
  1. Add a `replayResetToken` (or `triggerSampleReplay('halloween-2013')` action in `PreferencesContext`) that increments a counter whenever Sample 1 is clicked.
  2. In `replay.tsx`, add a `useEffect` watching `replayResetToken` that deterministically resets `stepIdx` to the initial hero step (`initialStep`), selects the primary gauge (`USGS-08158840`), and starts paused in a clean state.

### P2-3: Stop Simulation & Speech Cleanup (`mobile/src/app/(tabs)/drive.tsx`)
- **Problem:** Pressing **Exit simulated drive** only toggles `simDriveActive` while leaving the HUD visible and speech playing, and `Speech.stop()` only runs on component unmount rather than tab blur or app backgrounding.
- **Required Fix:**
  1. When `simDriveActive` is `false` (or when **Stop Simulation** is clicked), immediately call `Speech.stop()`, pause any active simulation state, and render a clean stopped/ready state (with a button to restart the simulated drive) or navigate back cleanly.
  2. Stop speech on tab blur (`useFocusEffect` cleanup or navigation listener), `AppState` background change, storm change, and language change.

### P2-4: Replay Speed Math & Provenance Metadata (`mobile/src/app/(tabs)/replay.tsx`, `tools/build_replays.py`)
- **Problem:**
  1. `replay.tsx` advances one 5-minute step every `12_000 / speed` ms, which means `"1×"` runs at `25×` real time (`12s` per `300s` step).
  2. `tools/build_replays.py` hardcodes `git_sha="fd9407c"` and claims pre-registered selection even though the script and results were committed together.
- **Required Fix:**
  1. Either make speed labels match the actual step rate (e.g., clearly label playback speed as step cadence / `25×` base or make `60×` = `5000ms` per `5-min` step, `120×` = `2500ms`, `30×` = `10000ms`, `10×` = `30000ms`, `1×` = `300000ms` with a fast-step note), so the math `300_000 / speed` ms per 5-minute step is 100% mathematically true (`at 60×, 1 five-minute step = 5.0 seconds`!). Notice how `300_000 / 60 = 5,000 ms` (5 seconds per 5-minute tick) is both fast for demos AND 100% mathematically accurate for `1×`, `10×`, `30×`, `60×`, `120×`!
  2. In `tools/build_replays.py`, compute `git_sha` dynamically via `subprocess.check_output(["git", "rev-parse", "--short", "HEAD"])` and describe the hero crossing choice as **deterministic median-lead selection** rather than claiming historical pre-registration.

---

## 3. Execution & Verification Workflow

1. Implement all fixes in `backend/`, `tools/`, `mobile/`, and `docs/`.
2. Rebuild all storm replays and backtest artifacts:
   ```powershell
   uv run --project backend python tools/build_replays.py
   ```
3. Update `tools/qa_audit.py` if needed so it checks the repaired schema/labels and run it:
   ```powershell
   uv run --project backend python tools/qa_audit.py
   ```
   Verify that:
   - `nearest_comparator_mismatch_count == 0`
   - `future_grid_assignment_count == 0`
   - Uncalibrated links do not inject fabricated `0.60` correlations into forecasts
   - `tier_b_calm_fa_per_day` is `null` (or measured)
4. Update `docs/prompts/chatgpt-browser-qa-and-demo-prompt.md` and `docs/results/qa-review.md` so all expected numbers and descriptions match the repaired, honest artifacts.
5. Run the full verification suite and confirm 100% pass:
   ```powershell
   ./tools/check.ps1
   ```
```
