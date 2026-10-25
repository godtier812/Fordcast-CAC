# FordCast — Know Before It Crosses

A bilingual Central Texas trip-checking prototype for the Congressional App Challenge.
Plan an Austin-area trip and inspect nearby low-water-crossing records, official closure
reports, available creek readings, flood history and gaps in the evidence. A separate
research view replays five historical USGS storms. **Road-level forecast skill is unverified.**

The current website combines 2,052 inventory records, groups nearby hardware records on
a route, checks public ATXFloods/NWS/USGS sources, requests Valhalla routes, and can send
suggested waypoints to Google Maps. Failed or stale evidence stays explicit. Four preset
trips have dated recorded geometry for review during router outages; that fallback blocks
external navigation and sharing. The app is supplementary: obey official warnings and
barricades, and never drive into water.

## Evidence and current limits

- **0 validated road-overtopping thresholds.** Thirty Tier-B research candidates and
  111 Tier-C inventory records. Candidate topology and road elevations need verification.
- Only published NOAA category stages qualify as downstream **proxy** reference thresholds.
  Gauges with no published stage are excluded from scoring. A category is not road truth.
- LOSO results compare the candidate rule with the true WGS84-geodesic nearest gauge in
  the frozen catalog. See [results](docs/results/results.md) for regenerated numbers.
  A median-based example is selected deterministically; historical pre-registration is
  not claimed. Cases sharing a gauge are not independent road events.
- Failed calibration has null measured correlation/lag and zero accepted training storms;
  rejected links cannot generate experimental forecasts. Assumed distances are labeled.
- Map lines are schematic corridor connectors. They are not USGS/NLDI river geometry.
- Replay delay is assumed (60 minutes). Its delivery interruption is a robustness scenario,
  not verified historical transmission timing. The observation chart never moves future
  readings to earlier slots.
- The 36-hour calm control is a smoke check. The planned 30-day calm evaluation is pending.
- Browser live-source requests and routing are implemented; public-service availability
  is outside this project's control. Hosted backend jobs and production push delivery
  have not been established. An inactive web tab cannot provide continuous monitoring.
- The 141-record research catalog contains 30 candidates and 111 records without gauge
  links; only four records across two research corridors have primary-calibrated links.
  The 2,052-record route inventory is a separate footprint, not a count of monitored roads.
- The upstream rule detected 4/12 gauge-reference cases, missed eight and gave one false
  alarm. The nearest-gauge baseline detected 4/12 with zero false alarms. The upstream
  rule did not beat the baseline; neither result validates road flooding.
- Saved preferences are local. Archived car positions and test closures are simulated;
  labelled demonstrations block external navigation. Physical-iPhone acceptance remains pending.

## Run locally

Requirements: Node 22, npm, uv, and Python 3.13.

```powershell
uv sync --project backend --locked
uv sync --project tools --locked
Set-Location mobile
npm ci
npm run web
```

For the local API, from the repository root in a separate terminal:

```powershell
uv run --project backend uvicorn fordcast.api.app:app --app-dir backend --host 127.0.0.1 --port 8000
```

The research views read bundled artifacts. The API returns offline Unknown without an
ingested snapshot. The main website uses Leaflet street tiles and direct public-source
requests; its separate science view uses an inventory diagram. Native exports do not
establish real-device acceptance.

## Production website

```powershell
Set-Location mobile
npm run build:web
npm run preview:web
```

The compiled site is in `mobile/dist`; its local preview is `http://localhost:8083`.
The preview serves direct links such as `/privacy`, `/lab` and unknown routes through
the app shell. Production hosting must provide the same single-page history fallback.
`mobile/public/_redirects` supplies that rule for hosts that support Netlify-style redirects.
No external deployment or submission is implied by a successful local build.

See the [final website review](docs/results/cac-round8-website-finalization-2026-10-24.md)
for implemented fixes, screenshots, test results and remaining acceptance limits.

## Reproduce and verify

```powershell
uv run --project backend python tools/build_replays.py
uv run --project backend python tools/export_app_data.py
uv run --project backend python tools/write_claims.py
uv run --project backend python tools/select_hero.py --check docs/results/results.json
uv run --project backend python tools/qa_audit.py
./tools/check.ps1
```

The offline builder drives the same immediate tick/provider/store coroutines without
opening event-loop sockets; it rejects asynchronous I/O. Result provenance records the
Git revision, working-tree status and source SHA-256. Generation timestamps may change;
replay content hashes exclude pipeline metadata. Raw public bootstrap responses are
ignored; `tools/smoke_test.py` and `tools/bootstrap_data.py` reproduce them if needed.
No routine unkeyed polling is implemented by the artifact generator.

See [Claims Ledger](docs/CLAIMS.md), [repair verification](docs/results/repair-verification.md),
[initial QA report](docs/results/qa-review.md), and [AI authorship](AI_USE.md). All autonomous
implementation is agent-authored; student explain-back and submission-policy review
remain pending. The original proposal/master prompt describe the intended final product.
