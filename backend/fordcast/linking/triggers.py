"""Trigger-stage and watch-stage learning on training folds (§18.4)."""

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta

import numpy as np

from fordcast.features.compute import rise
from fordcast.scoring.metrics import Onset
from fordcast.sources.base import Reading


@dataclass(frozen=True)
class LearnedTrigger:
    baseline_stage_ft: float
    trigger_stage_ft: float
    watch_stage_ft: float
    min_rise_ft_30m: float
    train_csi: float | None
    params_source: str
    needs_review: bool


def _upward_crossing_times(
    readings: Sequence[Reading],
    level: float,
    min_rise_ft_30m: float,
    delay_min: float,
) -> list[datetime]:
    """Return arrival timestamps of upward crossings of `level` with 30-min rise > min_rise_ft_30m."""
    sorted_rows = sorted(readings, key=lambda r: r.obs_time)
    if len(sorted_rows) < 2:
        return []
    crossings: list[datetime] = []
    last_alert: datetime | None = None
    for idx in range(1, len(sorted_rows)):
        prev_r = sorted_rows[idx - 1]
        curr_r = sorted_rows[idx]
        if prev_r.value < level <= curr_r.value:
            r30 = rise(sorted_rows[: idx + 1], minutes=30)
            if r30 is not None and r30 > min_rise_ft_30m:
                arrival = curr_r.obs_time + timedelta(minutes=delay_min)
                if last_alert is None or arrival - last_alert >= timedelta(minutes=60):
                    crossings.append(arrival)
                    last_alert = arrival
    return crossings


def learn_trigger(
    gauge_series_by_storm: Mapping[str, Sequence[Reading]],
    training_onsets: Sequence[Onset],
    *,
    delay_min: float = 60.0,
    min_rise_ft_30m: float = 0.10,
    nws_action_stage_ft: float | None = None,
) -> LearnedTrigger:
    """Learn trigger_stage_ft (h*) and watch_stage_ft on training storms only (§18.4)."""
    all_values: list[float] = []
    early_values: list[float] = []
    for rows in gauge_series_by_storm.values():
        sorted_rows = sorted(rows, key=lambda r: r.obs_time)
        if not sorted_rows:
            continue
        vals = [r.value for r in sorted_rows]
        all_values.extend(vals)
        cutoff = sorted_rows[0].obs_time + timedelta(hours=12)
        early = [r.value for r in sorted_rows if r.obs_time <= cutoff]
        early_values.extend(early if early else vals[: min(len(vals), 24)])

    if not all_values:
        fallback_b = 2.0
        fallback_h = nws_action_stage_ft if nws_action_stage_ft is not None else 6.0
        watch_h = round(fallback_b + 0.6 * (fallback_h - fallback_b), 2)
        return LearnedTrigger(
            baseline_stage_ft=round(fallback_b, 2),
            trigger_stage_ft=round(fallback_h, 2),
            watch_stage_ft=min(round(fallback_h - 0.1, 2), watch_h),
            min_rise_ft_30m=min_rise_ft_30m,
            train_csi=None,
            params_source="manual",
            needs_review=True,
        )

    arr = np.asarray(all_values, dtype=float)
    baseline_g = float(np.median(early_values)) if early_values else float(np.percentile(arr, 25))
    quantiles = np.linspace(0.50, 0.995, 40)
    candidates = sorted(
        {round(float(q), 2) for q in np.quantile(arr, quantiles) if q > baseline_g + 0.25}
    )

    onsets_by_storm: dict[str, list[Onset]] = {}
    for o in training_onsets:
        onsets_by_storm.setdefault(o.storm_id, []).append(o)

    best_h: float | None = None
    best_f2 = -1.0
    best_csi = 0.0

    for h in candidates:
        hits = 0
        misses = 0
        false_alarms = 0
        for sid, rows in gauge_series_by_storm.items():
            alerts = _upward_crossing_times(rows, h, min_rise_ft_30m, delay_min)
            storm_onsets = sorted(onsets_by_storm.get(sid, []), key=lambda x: x.t)
            matched_alerts: set[int] = set()
            for onset in storm_onsets:
                qualifying = [
                    i
                    for i, a_t in enumerate(alerts)
                    if onset.t - timedelta(minutes=180) <= a_t <= onset.t
                ]
                if qualifying:
                    hits += 1
                    matched_alerts.update(qualifying)
                else:
                    misses += 1
            for i, a_t in enumerate(alerts):
                if i not in matched_alerts and not any(
                    a_t <= o.t <= a_t + timedelta(minutes=180) for o in storm_onsets
                ):
                    false_alarms += 1

        far = false_alarms / (hits + false_alarms) if (hits + false_alarms) > 0 else 0.0
        if hits > 0 and far <= 0.5:
            # Event F2 = 5*H / (5*H + 4*M + F)
            f2 = (5.0 * hits) / (5.0 * hits + 4.0 * misses + false_alarms)
            csi = hits / (hits + misses + false_alarms)
            # Ties -> the LOWER h (more lead); since candidates are ascending, strict `>` keeps lower h
            if f2 > best_f2:
                best_f2 = f2
                best_h = h
                best_csi = csi

    if best_h is not None:
        watch_h = round(baseline_g + 0.6 * (best_h - baseline_g), 2)
        if watch_h >= best_h:
            watch_h = round(best_h - 0.2, 2)
        return LearnedTrigger(
            baseline_stage_ft=round(baseline_g, 2),
            trigger_stage_ft=round(best_h, 2),
            watch_stage_ft=watch_h,
            min_rise_ft_30m=min_rise_ft_30m,
            train_csi=round(best_csi, 3),
            params_source="learned",
            needs_review=False,
        )

    # Fallback (§18.4): NWS action stage if available, else P90 of storm stages
    fallback_h = (
        float(nws_action_stage_ft)
        if nws_action_stage_ft is not None and nws_action_stage_ft > baseline_g + 0.3
        else float(np.percentile(arr, 90))
    )
    fallback_h = max(round(fallback_h, 2), round(baseline_g + 0.5, 2))
    watch_h = min(
        round(fallback_h - 0.2, 2), round(baseline_g + 0.6 * (fallback_h - baseline_g), 2)
    )
    return LearnedTrigger(
        baseline_stage_ft=round(baseline_g, 2),
        trigger_stage_ft=fallback_h,
        watch_stage_ft=watch_h,
        min_rise_ft_30m=min_rise_ft_30m,
        train_csi=None,
        params_source="manual",
        needs_review=True,
    )
