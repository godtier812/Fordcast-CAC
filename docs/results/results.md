# FordCast Out-of-Sample Backtest Results (`fordcast.results.v1`)

> Generated deterministically by `uv run --project backend python tools/build_replays.py` using Leave-One-Storm-Out (LOSO) cross-validation
> and frozen data-arrival latency (`data/latency/gauge_latency.json`, default 60 min delay).

## Reference-Gauge Proxy Comparison — Not Road-Flooding Skill

| Method | Level | Hits (H) | Misses (M) | False Alarms (F) | POD | FAR | CSI | Median Lead (min) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| **Upstream Rule (FordCast)** | `AVOID` | 4 | 8 | 1 | 0.333 | 0.2 | 0.308 | 65.0 |
| **Nearest-Gauge Baseline** | `AVOID` | 4 | 8 | 0 | 0.333 | 0.0 | 0.333 | 65.0 |
| **Upstream Rule (Watch)** | `WATCH` | 4 | 8 | 7 | 0.333 | 0.636 | 0.211 | 142.5 |
| **Reactive Closure (Reference)** | `CLOSED` | — | — | — | — | — | — | 0.0 |

## Per-Storm Breakdown (`upstream_rule` at `AVOID`)

| Storm ID | Hits | Misses | False Alarms | POD | FAR | CSI | Median Lead (min) |
|---|---:|---:|---:|---:|---:|---:|---:|
| `halloween-2013` | 2 | 2 | 0 | 0.5 | 0.0 | 0.5 | 95.0 |
| `memorial-day-2015` | 1 | 1 | 0 | 0.5 | 0.0 | 0.5 | 90.0 |
| `halloween-2015` | 1 | 5 | 0 | 0.167 | 0.0 | 0.167 | 40.0 |
| `oct-2018` | 0 | 0 | 1 | None | 1.0 | 0.0 | None |
| `july-2025` | 0 | 0 | 0 | None | None | None | None |

## Data-Arrival Delay Sensitivity (`upstream_rule` at `AVOID`)

| Assumed Delivery Delay (min) | Median Lead Time (min) |
|---:|---:|
| 0 | 125.0 |
| 15 | 110.0 |
| 30 | 95.0 |
| 60 | 65.0 |

## Deterministic Median-Lead Reference Example (`tools/select_hero.py`)

- **Rule:** proxy-reference AVOID hit closest to the overall median lead; ties: catalog order, then crossing id
- **Selected Storm:** `memorial-day-2015`
- **Selected Crossing:** `tc-167`
- **Lead Time:** `90.0 min` (overall median across storms: `65.0 min`)
- **First Alert At:** `2015-05-24T11:10:00Z` → **Onset At:** `2015-05-24T12:40:00Z`

## Interpretation and scope

All evaluated labels are downstream NOAA gauge-category threshold crossings (proxy cases). None establishes that a road flooded. Several cases share a gauge; they are not independent roads. Bootstrap intervals resample storms.

Drawn lines are schematic corridor connectors, not NLDI flowlines. Candidate topology and channel distances are unverified. Only empirically calibrated links passing quality gates generate experimental states. Uncalibrated links remain Unknown.

Calm exposure: 1.5 days from the bundled control timestamps. This is a 36-hour smoke control, not a 30-day calm evaluation. Separate Tier-B calm rates and reactive-baseline results are not evaluated (null).

Road-level forecast performance, live operation, native-device behavior and human translation/accessibility acceptance remain unverified.
