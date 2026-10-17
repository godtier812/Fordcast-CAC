# One-Page Explainer: `backend/fordcast/linking/travel_time.py`

## Purpose
Estimates how long a flood wave takes to travel down a creek channel from an upstream USGS gauge $g$ to a downstream gauge or low-water crossing $c$.

## How It Works
1. **Resampling & Rise Rate ($\Delta h / \Delta t$):**
   - Raw USGS stage series (`00065`, feet) are resampled onto a uniform 5-minute grid using linear interpolation only across gaps $\le 30$ minutes (`resample_5m`).
   - First differences (`np.diff`) isolate the rising limb so cross-correlation matches the arrival of the flood wave rather than slow recession tails.
2. **Event-Window Cross-Correlation (`estimate_lag`):**
   - Evaluates candidate lags $\tau \in [0, 360]$ minutes in 5-minute steps.
   - Computes Pearson correlation $r(\tau)$ between the upstream rise rate $u(t)$ and downstream rise rate $d(t + \tau)$ across overlapping non-NaN samples ($\ge 12$ samples).
   - Computes the 25th–75th percentile band (`lag_p25_min`, `lag_p75_min`) over all lags with $r(\tau) \ge 0.85 \cdot r_{\max}$.
3. **Multi-Storm Combination & Physical Bounds (`combine_storms`):**
   - Pools storm-level lag estimates via median and interquartile range.
   - Checks wave celerity $c = \text{distance} / \tau$ against physical open-channel bounds ($0.3 \le c \le 6.0\text{ m/s}$). Pairs outside bounds or with $r < 0.5$ are flagged `needs_review = True`.
4. **User-Facing Range Rounding:**
   - User-facing copy never displays a single travel-time minute; `tau_lo_min` and `tau_hi_min` are rounded outward to 15-minute increments with a minimum lower bound of 5 minutes.
