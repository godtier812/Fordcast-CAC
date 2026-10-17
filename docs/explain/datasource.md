# One-Page Explainer: `backend/fordcast/sources/base.py` & `replay.py`

## Purpose
Guarantees that live polling and historical storm replay share a single `DataSource` interface and that no future observation can ever leak into a past tick.

## How It Works
1. **Two Timestamps per Reading (`Reading`):**
   - Every gauge observation carries both `obs_time` (when the sensor measured the water) and `available_at` (when telemetry delivered the reading to FordCast: `obs_time + delay_min`).
2. **Strict No-Lookahead Filter (`StormReplaySource.series`):**
   - At simulated clock time `as_of`, a reading is visible **only** if:
     - `r.param == parameter_code` (preventing discharge `00060` and stage `00065` from overwriting each other),
     - `as_of - lookback < r.obs_time <= as_of` (left-open lookback window),
     - `r.available_at <= as_of` (data-arrival latency filter), and
     - if `r.obs_time` falls inside a documented gauge `Outage(start, end)` (such as `USGS-08159000` during Halloween 2013), it is withheld until `as_of >= outage.end`.
3. **Runtime Guard (`assert_no_lookahead`):**
   - Every `tick()` call executes `assert_no_lookahead(readings, now)` before evaluating any crossing. If any reading has `obs_time > now` or `available_at > now`, `LookaheadError` is raised immediately.
