# FordCast — Know Before It Crosses

An Austin-area flood-awareness and upstream-lead-time prototype built for the Congressional App Challenge.
**FordCast is a supplementary awareness tool, not a replacement for official warnings or road barricades. Never drive into water.**

## What Is Built & Verified

1. **Real Watershed & Crossing Inventory (`data/seed/`):**
   - **141 public low-water crossing records** from City of Austin Open Data and Travis County Public Works.
   - **19 real Austin-area USGS stream gauges** (`data/seed/gauges.geojson`) with NOAA NWPS flood categories (`action`, `minor`, `moderate`, `major`).
   - **30 monitored crossings** (`12` **Tier A** crossings with verified road overtop thresholds in `data/overrides/overtop_stages.csv`, and `18` **Tier B** crossings with upstream gauge links in `data/links/crossing_gauge_links.csv`).
   - **111 Tier C crossings** explicitly labeled `Unknown` / `Not monitored` (`NO_UPSTREAM_GAUGE`) so unverified locations never imply coverage.

2. **Multi-Storm Archive & Leave-One-Storm-Out (LOSO) Backtest (`data/storms/`, `docs/results/`):**
   - Real 15-minute USGS Water Data OGC API v1 stage (`00065`) archives across **5 Central Texas storms**:
     - `halloween-2013` (*Halloween Flood 2013*, including the documented `USGS-08159000` outage)
     - `memorial-day-2015` (*Memorial Day Flood 2015*)
     - `halloween-2015` (*All Saints Flood 2015*)
     - `oct-2018` (*October 2018 Highland Lakes Rain* — control storm with 0 road overtops)
     - `july-2025` (*July 2025 Urban Flash Rise*)
   - Evaluated with **Leave-One-Storm-Out (LOSO)** cross-validation and a frozen **60-minute data-arrival delay** (`data/latency/gauge_latency.json`):
     - **FordCast Upstream Rule (`AVOID`):** `POD = 89.3%` (`25/28` hits), `FAR = 50.0%`, `CSI = 0.472`, **median lead time = `70.0 min`** (`109.5 min` at 0-min delay, `97.0 min` at 15-min delay, `82.0 min` at 30-min delay).
     - **Nearest-Gauge Baseline (`AVOID`):** `POD = 39.3%` (`11/28` hits), `FAR = 79.2%`, `CSI = 0.157`.
     - **Pre-registered Hero Example (`tools/select_hero.py`):** `halloween-2013` at `atx-7` (*Wasson Rd on Williamson Creek*) — flagged `AVOID` **70 minutes** before road overtop (`06:15Z` alert vs `07:25Z` onset).

3. **Cross-Platform Mobile & Web Prototype (`mobile/`):**
   - **Map & Inventory (`/`):** Watershed map preview with creek flowlines, 19 USGS gauges, Tier A/B/C markers, search, and tier filters (`Monitored (30)`, `Tier A Validated (12)`, `Tier B Estimated (18)`, `Saved`, `All (141)`).
   - **Crossing Detail (`/crossing/[id]`):** Displays tier verification badge, upstream gauge links with rounded 15-minute travel-time ranges (`tau_lo_min`–`tau_hi_min`), Watch/Avoid trigger stages, verified overtop threshold, and per-crossing Watch alert opt-in.
   - **Storm Replay Player (`/replay`):** Full 5-storm `fordcast.replay.v1` player with speed controls (`1×, 10×, 30×, 60×, 120×`), `±5 min` and `Prev/Next event` transport, interactive storyboard callouts (including the 2013 `USGS-08159000` `gauge_silent` `UNKNOWN` transition), outage-aware gauge hydrograph (`visibleSamples`), hero banner paired with `replay.honesty`, LOSO comparison table, and **"Drive this storm (simulated)"** CTA.
   - **Hands-Free Drive HUD (`/drive`):** High-contrast `#070D18` NHTSA-style HUD with `REPLAY · SIMULATED DRIVE` banners, bilingual `expo-speech` voice announcements, `≥ 76 pt` `Repeat` and `Mute` buttons, and passenger lockout (`stepLockout`) above 15 mph.
   - **Alerts & Settings (`/alerts`, `/settings`):** Saved crossings, per-crossing Watch toggle, **"Send a test alert"** (`TEST ALERT (not a real flood)`), and bilingual EN/ES switch.

## Run Locally

Requirements: Node 22+, npm, `uv`, and Python 3.13.

```powershell
uv sync --project backend --locked
uv sync --project tools --locked
Set-Location mobile
npm ci
npm run web
```

Start the local FastAPI server in another terminal:

```powershell
uv run --project backend uvicorn fordcast.api.app:app --app-dir backend --host 127.0.0.1 --port 8000
```

## Reproduce Science, Replays & Verification

```powershell
# Rebuild LOSO backtest results (docs/results/results.json) and 5 storm replays (data/replays/*.json.gz)
uv run --project backend python tools/build_replays.py

# Verify pre-registered hero selection rule
uv run --project backend python tools/select_hero.py --check docs/results/results.json

# Export verified artifacts to mobile/assets/ and update MANIFEST.json
uv run --project backend python tools/export_app_data.py

# Run full backend (Ruff + 50 Pytest tests) and mobile (TypeScript + ESLint + 11 Jest tests) suite
./tools/check.ps1
```

## Key Documentation
- [Claims Ledger](docs/CLAIMS.md)
- [LOSO Backtest Results](docs/results/results.md) & [`results.json`](docs/results/results.json)
- [Verification Report](docs/results/verification.md)
- [Core Module Explainers](docs/explain/): [travel_time.md](docs/explain/travel_time.md), [baseline_rule.md](docs/explain/baseline_rule.md), [metrics.md](docs/explain/metrics.md), [datasource.md](docs/explain/datasource.md)
- [AI Authorship & Disclosure](AI_USE.md)
