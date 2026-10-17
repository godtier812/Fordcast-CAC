"""Agent-written event verification; student review is pending (§18.12)."""

from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta
from math import nan

import numpy as np

from fordcast.domain import RANK


@dataclass(frozen=True)
class Episode:
    crossing_id: str
    start: datetime
    end: datetime
    level: str


@dataclass(frozen=True)
class Onset:
    crossing_id: str
    storm_id: str
    t: datetime
    censored: bool = False
    quality: str = "gauge"
    unknown_at_onset: bool = False


@dataclass(frozen=True)
class Frame:
    at: datetime
    states: Mapping[str, str]


@dataclass(frozen=True)
class Hit:
    onset: Onset
    episode: Episode
    lead_min: float
    capped: bool


@dataclass(frozen=True)
class MatchResult:
    hits: tuple[Hit, ...]
    misses: tuple[Onset, ...]
    false_alarms: tuple[Episode, ...]


def episodes_from_frames(frames: Sequence[Frame], level: str) -> list[Episode]:
    if level not in {"watch", "avoid"}:
        raise ValueError("Only watch and avoid are scored")
    episodes = []
    active: dict[str, tuple[datetime, datetime]] = {}
    previous = None
    for frame in frames:
        if previous is not None and frame.at <= previous:
            raise ValueError("Frame timestamps must increase strictly")
        # A missing scheduled tick breaks an episode; do not silently bridge outages.
        if previous is not None and frame.at - previous > timedelta(minutes=5):
            episodes.extend(Episode(cid, start, end, level) for cid, (start, end) in active.items())
            active.clear()
        for cid in sorted(set(active) | set(frame.states)):
            state = frame.states.get(cid, "unknown")
            if RANK[state] >= RANK[level]:
                active[cid] = (active.get(cid, (frame.at, frame.at))[0], frame.at)
            elif cid in active:
                start, end = active.pop(cid)
                episodes.append(Episode(cid, start, end, level))
        previous = frame.at
    episodes.extend(Episode(cid, start, end, level) for cid, (start, end) in active.items())
    return sorted(episodes, key=lambda e: (e.crossing_id, e.start))


def match_events(
    episodes: Sequence[Episode],
    onsets: Sequence[Onset],
    *,
    max_lead_min: int = 180,
    fa_window_min: Callable[[str], int],
) -> MatchResult:
    hits, misses = [], []
    matched: set[int] = set()
    for onset in sorted(onsets, key=lambda o: (o.crossing_id, o.t)):
        candidates = [
            (i, e)
            for i, e in enumerate(episodes)
            if e.crossing_id == onset.crossing_id
            and e.start <= onset.t
            and (e.start >= onset.t - timedelta(minutes=max_lead_min) or e.end >= onset.t)
        ]
        if candidates and not onset.unknown_at_onset:
            _, episode = min(candidates, key=lambda pair: pair[1].start)
            lead = (onset.t - episode.start).total_seconds() / 60
            hits.append(Hit(onset, episode, min(max_lead_min, lead), lead > max_lead_min))
            # Later episodes before the same onset are not counted again as false alarms.
            matched.update(i for i, _ in candidates)
        else:
            misses.append(onset)
    false = []
    for i, episode in enumerate(episodes):
        window = fa_window_min(episode.crossing_id)
        if window <= 0:
            raise ValueError("False-alarm window must be positive")
        if i not in matched and not any(
            o.crossing_id == episode.crossing_id
            and episode.start <= o.t <= episode.start + timedelta(minutes=window)
            for o in onsets
        ):
            false.append(episode)
    return MatchResult(tuple(hits), tuple(misses), tuple(false))


def scores(result: MatchResult) -> dict[str, float | int | tuple[float, float]]:
    h, m, f = len(result.hits), len(result.misses), len(result.false_alarms)
    leads = np.array([hit.lead_min for hit in result.hits])
    return {
        "H": h,
        "M": m,
        "F": f,
        "pod": h / (h + m) if h + m else nan,
        "far": f / (h + f) if h + f else nan,
        "csi": h / (h + m + f) if h + m + f else nan,
        "median_lead_min": float(np.median(leads)) if h else nan,
        "lead_iqr_min": tuple(float(v) for v in np.percentile(leads, [25, 75]))
        if h
        else (nan, nan),
        "pct_lead_ge_15": float(np.mean(leads >= 15) * 100) if h else nan,
    }


def bootstrap_ci(
    per_storm: Mapping[str, MatchResult], *, n: int = 1000, seed: int = 0, alpha: float = 0.05
) -> dict[str, tuple[float, float]]:
    if n < 1 or not 0 < alpha < 1:
        raise ValueError("Invalid bootstrap parameters")
    keys = ("pod", "far", "csi", "median_lead_min")
    values = [per_storm[key] for key in sorted(per_storm)]
    if not values:
        return {key: (nan, nan) for key in keys}
    rng = np.random.default_rng(seed)
    samples = {key: [] for key in keys}
    for _ in range(n):
        chosen = [values[int(i)] for i in rng.integers(0, len(values), len(values))]
        pooled = MatchResult(
            tuple(hit for r in chosen for hit in r.hits),
            tuple(miss for r in chosen for miss in r.misses),
            tuple(false for r in chosen for false in r.false_alarms),
        )
        result = scores(pooled)
        for key in keys:
            value = float(result[key])
            if np.isfinite(value):
                samples[key].append(value)
    return {
        key: tuple(float(v) for v in np.percentile(sample, [alpha * 50, 100 - alpha * 50]))
        if sample
        else (nan, nan)
        for key, sample in samples.items()
    }
