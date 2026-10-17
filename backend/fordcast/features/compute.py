from collections.abc import Mapping, Sequence
from datetime import datetime, timedelta
from itertools import pairwise

from fordcast.domain import Crossing, Link, RuleResult
from fordcast.sources.base import Reading


def value_at(series: Sequence[Reading], at: datetime) -> float | None:
    for a, b in pairwise(series):
        if a.obs_time <= at <= b.obs_time:
            if a.obs_time == at:
                return a.value
            if b.obs_time == at:
                return b.value
            gap = (b.obs_time - a.obs_time).total_seconds()
            if 0 < gap <= 1800:
                return a.value + (b.value - a.value) * (at - a.obs_time).total_seconds() / gap
            return None
    closest = min(series, key=lambda r: abs((r.obs_time - at).total_seconds()), default=None)
    if closest and abs((closest.obs_time - at).total_seconds()) <= 600:
        return closest.value
    return None


def rise(series: Sequence[Reading], minutes: float = 30) -> float | None:
    if len(series) < 2:
        return None
    before = value_at(series, series[-1].obs_time - timedelta(minutes=minutes))
    return None if before is None else series[-1].value - before


def is_fresh(series: Sequence[Reading], as_of: datetime, stale_after_min: float) -> bool:
    return bool(series) and timedelta(0) <= as_of - series[-1].obs_time <= timedelta(
        minutes=stale_after_min
    )


def last_upcrossing_time(series: Sequence[Reading], level: float) -> datetime | None:
    if not series:
        return None
    if all(r.value >= level for r in series):
        return series[0].obs_time
    for a, b in reversed(list(pairwise(series))):
        if a.value < level <= b.value:
            # Do not invent a precise crossing time inside a long observational gap.
            if b.obs_time - a.obs_time > timedelta(minutes=30):
                return a.obs_time
            return a.obs_time + (b.obs_time - a.obs_time) * (
                (level - a.value) / (b.value - a.value)
            )
    return None


def crossing_is_stale(
    links: Sequence[Link], series: Mapping[str, Sequence[Reading]], now: datetime, rule: RuleResult
) -> bool:
    upstream = [link for link in links if link.relation == "upstream"]
    if not upstream:
        return True

    def fresh(link: Link) -> bool:
        return is_fresh(series.get(link.gauge.id, ()), now, link.gauge.stale_after_min)

    primary = next((link for link in upstream if link.is_primary), upstream[0])
    return not any(map(fresh, upstream)) or (not fresh(primary) and rule.state == "no_rise")


def water_at_road(c: Crossing, series: Mapping[str, Sequence[Reading]], now: datetime) -> bool:
    if c.target_gauge is None or c.overtop_stage_ft is None:
        return False
    rows = series.get(c.target_gauge.id, ())
    return (
        is_fresh(rows, now, c.target_gauge.stale_after_min) and rows[-1].value >= c.overtop_stage_ft
    )
