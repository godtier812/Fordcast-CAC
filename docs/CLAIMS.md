# FordCast Claims Ledger (`docs/CLAIMS.md`)

Every quantitative or comparative claim made in the app, documentation, or video script is backed by a reproducible script and committed artifact (§1.5, §39.5).

| Claim ID | Claim Statement | Value | Backing Artifact & JSON Path | Reproducing Command |
|---|---|---:|---|---|
| **C-01** | Total public low-water crossing inventory records around Austin & Travis County | `141` | `data/seed/crossings.geojson` (`features.length`) | `uv run --project backend python tools/build_replays.py` |
| **C-02** | Monitored crossings linked to upstream USGS gauges (Tier A + Tier B) | `30` (`12` Tier A, `18` Tier B) | `data/seed/crossings.geojson`, `data/links/crossing_gauge_links.csv` | `uv run --project backend python tools/build_replays.py` |
| **C-03** | Unverified inventory crossings explicitly labeled `Unknown` / `Not monitored` (Tier C) | `111` | `data/seed/crossings.geojson` (`tier == "C"`) | `uv run --project backend python tools/build_replays.py` |
| **C-04** | Active Austin-area USGS stream gauges archived across 5 storms | `19` | `data/seed/gauges.geojson` (`features.length`) | `uv run --project backend python tools/build_storm_archive.py` |
| **C-05** | Historical storms in Leave-One-Storm-Out (LOSO) evaluation (`halloween-2013`, `memorial-day-2015`, `halloween-2015`, `oct-2018`, `july-2025`) | `5` (`28` total Tier-A overtop events) | `docs/results/results.json` (`$.storms`) | `uv run --project backend python tools/build_replays.py` |
| **C-06** | Assumed data-arrival latency per gauge in replay and LOSO scoring | `60 min` | `data/latency/gauge_latency.json` (`$.default_delay_min`) | `uv run --project backend python tools/build_replays.py` |
| **C-07** | Out-of-sample **FordCast Upstream Rule (`AVOID`)** Probability of Detection (POD), False Alarm Ratio (FAR), and Critical Success Index (CSI) | `POD = 89.3%` (`25/28`), `FAR = 50.0%` (`25/50`), `CSI = 0.472` | `docs/results/results.json` (`$.methods.upstream_rule.avoid.pooled`) | `uv run --project backend python tools/build_replays.py` |
| **C-08** | Out-of-sample **FordCast Upstream Rule (`AVOID`)** median lead time at 60-min data delay | `70.0 min` (IQR `20.0–150.0 min`) | `docs/results/results.json` (`$.methods.upstream_rule.avoid.pooled.median_lead_min`) | `uv run --project backend python tools/build_replays.py` |
| **C-09** | Out-of-sample **Nearest-Gauge Baseline (`AVOID`)** POD, FAR, and CSI | `POD = 39.3%` (`11/28`), `FAR = 79.2%` (`42/53`), `CSI = 0.157` | `docs/results/results.json` (`$.methods.nearest_gauge.avoid.pooled`) | `uv run --project backend python tools/build_replays.py` |
| **C-10** | Pre-registered hero example (Tier-A `AVOID` hit closest to overall median lead time) | `halloween-2013`, `atx-7` (`Wasson Rd` on Williamson Creek), `lead_min = 70.0 min` (`06:15Z` alert vs `07:25Z` onset) | `docs/results/results.json` (`$.hero`) | `uv run --project backend python tools/select_hero.py --check docs/results/results.json` |
| **C-11** | Documented Halloween 2013 outage at `USGS-08159000` (Onion Creek at US 183) | `2013-10-31T11:15:00Z` to `13:45:00Z` (silent after `04:45Z`) | `data/storms/halloween-2013/meta.toml` (`[[outages]]`), `data/replays/halloween-2013.json` | `uv run --project backend python tools/build_replays.py` |
