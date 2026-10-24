# FordCast — Know Before It Crosses

A bilingual Central Texas flood-awareness research prototype for the Congressional App
Challenge. The vision is earlier, crossing-specific caution from truly upstream evidence.
The current build demonstrates that workflow with archived observations and explicitly
scoped reference-gauge experiments. **Road-level forecast skill is unverified.**

The app includes a searchable inventory of 141 public records, five real historical USGS
storm archives, causal hydrographs, EN/ES copy, local saved preferences, test-alert text
previews, and a simulated voice HUD. Current status remains Unknown while live telemetry
is disconnected. It is a supplementary tool: obey official warnings and barricades and
never drive into water.

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
- Live ingestion, hosted jobs, actual routing and push/background delivery are unconnected.
  Watch toggles save preferences locally. Test alerts show text only. HUD positions and
  speeds are simulated; they are not a route or a live driver-safety system.

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

The primary offline app reads bundled artifacts. The API returns offline Unknown without
an ingested snapshot. Web uses an inventory overview; MapLibre street tiles require a
native development build. Native exports do not establish real-device acceptance.

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
