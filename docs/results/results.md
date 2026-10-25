# FordCast Out-of-Sample Backtest Results (`fordcast.results.v1`)

> Generated deterministically by `uv run --project backend python tools/build_replays.py` using Leave-One-Storm-Out (LOSO) cross-validation
> and frozen data-arrival latency (`data/latency/gauge_latency.json`, default 60 min delay).

## Reference-Gauge Proxy Comparison — Not Road-Flooding Skill

| Method | Level | Hits (H) | Misses (M) | False Alarms (F) | POD | FAR | CSI | Median Lead (min) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| **Upstream Rule (FordCast)** | `AVOID` | 10 | 2 | 6 | 0.833 | 0.375 | 0.556 | 57.5 |
| **Nearest-Gauge Baseline** | `AVOID` | 4 | 8 | 3 | 0.333 | 0.429 | 0.267 | 87.5 |
| **Upstream Rule (Watch)** | `WATCH` | 12 | 0 | 26 | 1.0 | 0.684 | 0.316 | 109.5 |
| **Reactive Closure (Reference)** | `CLOSED` | — | — | — | — | — | — | 0.0 |

## Per-Storm Breakdown (`upstream_rule` at `AVOID`)

| Storm ID | Hits | Misses | False Alarms | POD | FAR | CSI | Median Lead (min) |
|---|---:|---:|---:|---:|---:|---:|---:|
| `halloween-2013` | 4 | 0 | 3 | 1.0 | 0.429 | 0.571 | 90.0 |
| `memorial-day-2015` | 2 | 0 | 0 | 1.0 | 0.0 | 1.0 | 80.0 |
| `halloween-2015` | 4 | 2 | 3 | 0.667 | 0.429 | 0.444 | 9.0 |
| `oct-2018` | 0 | 0 | 0 | None | None | None | None |
| `july-2025` | 0 | 0 | 0 | None | None | None | None |

## Data-Arrival Delay Sensitivity (`upstream_rule` at `AVOID`)

| Assumed Delivery Delay (min) | Median Lead Time (min) |
|---:|---:|
| 0 | 90.0 |
| 15 | 75.0 |
| 30 | 62.0 |
| 60 | 57.5 |

## Deterministic Median-Lead Reference Example (`tools/select_hero.py`)

- **Rule:** proxy-reference AVOID hit closest to the overall median lead; ties: catalog order, then crossing id
- **Selected Storm:** `memorial-day-2015`
- **Selected Crossing:** `atx-19`
- **Lead Time:** `50.0 min` (overall median across storms: `57.5 min`)
- **First Alert At:** `2015-05-24T14:25:00Z` → **Onset At:** `2015-05-24T15:15:00Z`

## Interpretation and scope

All evaluated labels are downstream NOAA gauge-category threshold crossings (proxy cases). None establishes that a road flooded. Several cases share a gauge; they are not independent roads. Bootstrap intervals resample storms.

Drawn lines are schematic corridor connectors, not NLDI flowlines. Candidate topology and channel distances are unverified. Only empirically calibrated links passing quality gates generate experimental states. Uncalibrated links remain Unknown.

Calm exposure: 1.5 days from the bundled control timestamps. This is a 36-hour smoke control, not a 30-day calm evaluation. Separate Tier-B calm rates and reactive-baseline results are not evaluated (null).

Road-level forecast performance, live operation, native-device behavior and human translation/accessibility acceptance remain unverified.
