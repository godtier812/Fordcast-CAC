# FordCast Out-of-Sample Backtest Results (`fordcast.results.v1`)

> Generated deterministically by `make backtest` using Leave-One-Storm-Out (LOSO) cross-validation
> and frozen data-arrival latency (`data/latency/gauge_latency.json`, default 60 min delay).

## Pooled Headline Comparison (Tier-A Validated Crossings)

| Method | Level | Hits (H) | Misses (M) | False Alarms (F) | POD | FAR | CSI | Median Lead (min) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| **Upstream Rule (FordCast)** | `AVOID` | 25 | 3 | 25 | 0.893 | 0.5 | 0.472 | 70.0 |
| **Nearest-Gauge Baseline** | `AVOID` | 11 | 17 | 42 | 0.393 | 0.792 | 0.157 | 150.0 |
| **Upstream Rule (Watch)** | `WATCH` | 28 | 0 | 49 | 1.0 | 0.636 | 0.364 | 110.0 |
| **Reactive Closure (Reference)** | `CLOSED` | — | — | — | — | — | — | 0.0 |

## Per-Storm Breakdown (`upstream_rule` at `AVOID`)

| Storm ID | Hits | Misses | False Alarms | POD | FAR | CSI | Median Lead (min) |
|---|---:|---:|---:|---:|---:|---:|---:|
| `halloween-2013` | 10 | 0 | 3 | 1.0 | 0.231 | 0.769 | 135.0 |
| `memorial-day-2015` | 3 | 0 | 4 | 1.0 | 0.571 | 0.429 | 180.0 |
| `halloween-2015` | 9 | 3 | 9 | 0.75 | 0.5 | 0.429 | 20.0 |
| `oct-2018` | 0 | 0 | 6 | None | 1.0 | 0.0 | None |
| `july-2025` | 3 | 0 | 3 | 1.0 | 0.5 | 0.5 | 40.0 |

## Data-Arrival Delay Sensitivity (`upstream_rule` at `AVOID`)

| Assumed Delivery Delay (min) | Median Lead Time (min) |
|---:|---:|
| 0 | 109.5 |
| 15 | 97.0 |
| 30 | 82.0 |
| 60 | 70.0 |

## Pre-Registered Hero Example (`tools/select_hero.py`)

- **Rule:** tier-A AVOID hit closest to the overall median lead; ties: catalog order, then crossing id
- **Selected Storm:** `halloween-2013`
- **Selected Crossing:** `atx-7`
- **Lead Time:** `70.0 min` (overall median across storms: `70.0 min`)
- **First Alert At:** `2013-10-31T06:15:00Z` → **Onset At:** `2013-10-31T07:25:00Z`
