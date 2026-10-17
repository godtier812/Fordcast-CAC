# One-Page Explainer: `backend/fordcast/scoring/metrics.py` & `backtest.py`

## Purpose
Scores forecast timelines against ground-truth road-overtopping episodes using Leave-One-Storm-Out (LOSO) cross-validation and 1-to-1 event matching.

## How It Works
1. **Episode Extraction (`episodes_from_frames`):**
   - Consecutive ticks where a crossing is at or above the evaluated alert level (`avoid` or `watch`) are grouped into contiguous alert episodes.
   - Any `unknown` tick or gap $> 2 \times \text{step}$ splits episodes so an outage cannot bridge two separate alerts.
2. **1-to-1 Event Matching (`match_events`):**
   - A ground-truth `Onset` at time $t_{\text{onset}}$ is a **Hit ($H$)** if an alert episode is active inside $[t_{\text{onset}} - 180\text{ min}, t_{\text{onset}}]$.
   - Each alert episode can credit at most one onset, and each onset is credited at most once.
   - Lead time is $\min(180, t_{\text{onset}} - t_{\text{alert\_start}})$ in minutes (`None` if the onset is `censored`).
   - Unmatched onsets count as **Misses ($M$)**; alert episodes that never match any onset count as **False Alarms ($F$)**.
3. **Summary Scores (`scores` & `bootstrap_ci`):**
   - $\text{POD} = \frac{H}{H + M}$, $\text{FAR} = \frac{F}{H + F}$, $\text{CSI} = \frac{H}{H + M + F}$.
   - Stationary block bootstrap (`seed = 20261031`, `n_boot = 2000`) computes deterministic 95% confidence intervals.
4. **LOSO Cross-Validation (`run_loso_backtest`):**
   - For each held-out storm $S$, `learn_fold_links` estimates lags $\tau$ and trigger thresholds $h^*$ using **only** the other 4 storms, then runs `run_replay` with the 60-minute data-arrival delay.
