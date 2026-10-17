"""Agent-written §18.3 implementation; not yet student-reviewed."""

from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass(frozen=True)
class LagEstimate:
    lag_min: float
    r: float
    storm_id: str


@dataclass(frozen=True)
class LinkLag:
    lag_min: float
    lag_p25_min: float
    lag_p75_min: float
    n_storms: int
    xcorr_r: float
    celerity_ms: float | None
    needs_review: bool
    notes: tuple[str, ...]


def grid(series: pd.Series, index: pd.DatetimeIndex) -> pd.Series:
    """Interpolate only inside observed gaps no longer than 30 minutes."""
    s = series.dropna().sort_index()
    s = s[~s.index.duplicated(keep="last")]
    if len(s) < 2:
        return pd.Series(np.nan, index=index)
    combined = s.reindex(s.index.union(index)).interpolate(method="time", limit_area="inside")
    result = combined.reindex(index)
    for a, b in zip(s.index, s.index[1:]):
        if b - a > pd.Timedelta(minutes=30):
            result.loc[(index > a) & (index < b)] = np.nan
    return result


def estimate_lag(
    up: pd.Series,
    down: pd.Series,
    storm_id: str,
    *,
    step_min: int = 5,
    max_lag_min: int = 240,
    min_r: float = 0.5,
) -> LagEstimate | None:
    if step_min <= 0 or max_lag_min < 0:
        raise ValueError("Invalid grid interval or lag bound")
    if up.empty or down.empty:
        return None
    start = max(up.index.min(), down.index.min()).ceil(f"{step_min}min")
    end = min(up.index.max(), down.index.max()).floor(f"{step_min}min")
    index = pd.date_range(start, end, freq=f"{step_min}min")
    if len(index) < 12:
        return None
    a = grid(up, index).diff().rolling(3, center=True).mean().clip(lower=0).to_numpy()
    b = grid(down, index).diff().rolling(3, center=True).mean().clip(lower=0).to_numpy()
    correlations = []
    for k in range(max_lag_min // step_min + 1):
        if k >= len(a):
            correlations.append(float("nan"))
            continue
        x, y = (a, b) if k == 0 else (a[:-k], b[k:])
        valid = np.isfinite(x) & np.isfinite(y)
        x, y = x[valid], y[valid]
        # Tiny overlaps can spuriously correlate perfectly; require an hour.
        if len(x) < max(12, 60 // step_min) or np.std(x) == 0 or np.std(y) == 0:
            correlations.append(float("nan"))
        else:
            correlations.append(float(np.corrcoef(x, y)[0, 1]))
    if not any(np.isfinite(correlations)):
        return None
    k = int(np.nanargmax(correlations))
    r = correlations[k]
    if r < min_r:
        return None
    refined = float(k)
    if 0 < k < len(correlations) - 1:
        left, right = correlations[k - 1], correlations[k + 1]
        denominator = left - 2 * r + right
        if np.isfinite(denominator) and denominator < 0:
            refined += float(np.clip(0.5 * (left - right) / denominator, -0.5, 0.5))
    return LagEstimate(min(max_lag_min, max(0, refined * step_min)), r, storm_id)


def combine_storms(estimates: list[LagEstimate], channel_dist_km: float | None) -> LinkLag | None:
    if not estimates:
        return None
    if len({e.storm_id for e in estimates}) != len(estimates):
        raise ValueError("One independent estimate per training storm is required")
    values = np.array([e.lag_min for e in estimates])
    q25, median, q75 = (float(x) for x in np.percentile(values, [25, 50, 75]))
    notes = []
    if len(estimates) < 2:
        notes.append("Fewer than two independent storm estimates")
    if median <= 0:
        notes.append("No positive propagation lag established")
    if channel_dist_km is None:
        notes.append("Channel distance and physical celerity are unverified")
    speed = (
        channel_dist_km * 1000 / (median * 60)
        if channel_dist_km is not None and median > 0
        else None
    )
    if q75 - q25 > 0.5 * median:
        notes.append("Travel-time spread exceeds half the median")
    if channel_dist_km is not None and (speed is None or not 0.5 <= speed <= 6):
        notes.append("Flood-wave celerity outside 0.5–6 m/s")
    return LinkLag(
        median,
        q25,
        q75,
        len(estimates),
        float(np.median([e.r for e in estimates])),
        speed,
        bool(notes),
        tuple(notes),
    )
