# Verification Report (`docs/results/verification.md`)

Updated: 2026-10-17

## 1. Automated Verification Suite (`./tools/check.ps1`)
- **Backend Ruff Lint (`uv run --project backend ruff check backend`):** Passed (`All checks passed!`).
- **Backend Ruff Format (`uv run --project backend ruff format --check backend`):** Passed (`39 files already formatted`).
- **Backend Pytest (`uv run --project backend pytest backend/tests -q`):** **50 passed** in `1.77s`.
  - Covers rule branches, conservative arrival windows, official-status precedence, asymmetric 3-tick dwell and crest travel-time hold, outage `last_known` preservation, 1-to-1 event matching and stationary block bootstrap CIs, strict no-lookahead and parameter isolation (`00060` vs `00065`), travel-time cross-correlation and multi-storm combination, truth-episode gap merging and censored-onset detection, trigger quantile learning, `fordcast.replay.v1` canonical hashing and gzip size budget (`< 150 KB`), EN/ES storyboard template parity and banned-word guard, runtime/scoring truth isolation, and FastAPI endpoints (`/v1/health`, `/v1/risk/current`, `/v1/crossings`, `/v1/replays`, `/v1/replays/{storm_id}`, `/v1/results`).
- **Pre-Registered Hero Selection Check (`uv run --project backend python tools/select_hero.py --check docs/results/results.json`):** Passed (`Hero verified: {'storm_id': 'halloween-2013', 'crossing_id': 'atx-7', 'lead_min': 70.0, ...}`).
- **Mobile TypeScript (`npm run typecheck`):** Passed (`tsc --noEmit`, 0 errors).
- **Mobile ESLint (`npm run lint`):** Passed (`expo lint`, 0 errors, 0 warnings).
- **Mobile Jest (`npm test -- --ci`):** **11 passed** in `1.76s` (`src/__tests__/contracts.test.ts`).
  - Covers snapshot expiry, bad/retired wire states, 7 conservative windows, Tier A (`12`) / Tier B (`18`) / Tier C (`111`) inventory and link contracts, all 5 bundled `fordcast.replay.v1` timelines, `stateAt` no-lookahead state resolution (including hero alert and `USGS-08159000` outage `UNKNOWN`), `visibleSamples` delay and outage hiding, `stepLockout` NHTSA speed lockout state machine, and EN/ES key, `{{var}}`, and banned-word parity.

## 2. Out-of-Sample LOSO Backtest Summary (`docs/results/results.json`)
- **Dataset:** 19 Austin-area USGS gauges and 12 Tier-A crossings across 5 real storms (`halloween-2013`, `memorial-day-2015`, `halloween-2015`, `oct-2018`, `july-2025`), totaling 28 ground-truth overtop episodes.
- **FordCast Upstream Rule (`AVOID`, 60-min data delay):**
  - `H = 25`, `M = 3`, `F = 25`
  - `POD = 0.893` (89.3%), `FAR = 0.500` (50.0%), `CSI = 0.472`
  - `Median lead time = 70.0 min` (IQR `20.0–150.0 min`)
- **Nearest-Gauge Baseline (`AVOID`, 60-min data delay):**
  - `H = 11`, `M = 17`, `F = 42`
  - `POD = 0.393` (39.3%), `FAR = 0.792` (79.2%), `CSI = 0.157`
- **Data-Arrival Delay Sensitivity (`upstream_rule` at `AVOID`):**
  - `0 min` delay: `109.5 min` median lead
  - `15 min` delay: `97.0 min` median lead
  - `30 min` delay: `82.0 min` median lead
  - `60 min` delay: `70.0 min` median lead
