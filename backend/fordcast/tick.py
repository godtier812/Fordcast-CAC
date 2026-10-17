"""One pipeline for live and replay; no wall clock and no scoring imports."""

from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from fordcast.domain import Crossing, Link, Reason, Tracker
from fordcast.features.compute import crossing_is_stale, is_fresh, rise, water_at_road
from fordcast.model.baseline_rule import evaluate
from fordcast.model.combine import resolve_raw_state
from fordcast.model.state_machine import StepContext, step
from fordcast.sources.base import DataSource, OfficialStatusSource, assert_no_lookahead
from fordcast.sources.official import is_fresh_official


@dataclass(frozen=True)
class RiskModel:
    version: str
    crossings: tuple[Crossing, ...]
    links: Mapping[str, tuple[Link, ...]] = field(default_factory=dict)


class MemoryStateStore:
    def __init__(self) -> None:
        self.trackers: dict[str, Tracker] = {}

    async def get(self, crossing_id: str) -> Tracker:
        return self.trackers.get(crossing_id, Tracker())

    async def put(self, crossing_id: str, tracker: Tracker) -> None:
        self.trackers[crossing_id] = tracker


@dataclass(frozen=True)
class TickResult:
    now: datetime
    model_version: str
    results: dict[str, Tracker]
    transitions: tuple[tuple[str, str, str], ...]


async def tick(
    now: datetime,
    source: DataSource,
    official: OfficialStatusSource,
    state: MemoryStateStore,
    model: RiskModel,
) -> TickResult:
    gauge_ids = {link.gauge.id for links in model.links.values() for link in links}
    gauge_ids.update(c.target_gauge.id for c in model.crossings if c.target_gauge)
    series = await source.series(sorted(gauge_ids), "00065", now, timedelta(hours=6))
    assert_no_lookahead([r for rows in series.values() for r in rows], now)
    records = await official.status([c.id for c in model.crossings], now)
    results, transitions = {}, []
    for crossing in sorted(model.crossings, key=lambda c: c.id):
        links = model.links.get(crossing.id, ())
        record = records.get(crossing.id)
        fresh = is_fresh_official(record, now)
        rule = evaluate(crossing, links, series, now)
        at_road = water_at_road(crossing, series, now)
        is_stale = crossing_is_stale(links, series, now, rule)
        water_reason = None
        if at_road and crossing.target_gauge is not None:
            t_rows = series.get(crossing.target_gauge.id, ())
            if t_rows:
                water_reason = Reason(
                    "WATER_AT_ROAD",
                    {
                        "gauge_id": crossing.target_gauge.id,
                        "value_ft": round(t_rows[-1].value, 1),
                        "overtop_ft": crossing.overtop_stage_ft,
                        "obs_at": t_rows[-1].obs_time.isoformat(),
                    },
                )
        stale_reason = None
        if is_stale:
            upstream = [lnk for lnk in links if lnk.relation == "upstream"]
            if upstream:
                primary = next((lnk for lnk in upstream if lnk.is_primary), upstream[0])
                p_rows = series.get(primary.gauge.id, ())
                stale_reason = Reason(
                    "DATA_STALE",
                    {
                        "gauge_id": primary.gauge.id,
                        "last_obs_at": p_rows[-1].obs_time.isoformat() if p_rows else None,
                    },
                )
        raw = resolve_raw_state(
            record if fresh else None,
            at_road,
            is_stale,
            crossing.tier,
            rule,
            water_reason=water_reason,
            stale_reason=stale_reason,
        )
        prev = await state.get(crossing.id)
        extra = prev.state == "watch"
        if prev.state == "avoid":
            trigger = next((l for l in links if l.gauge.id == prev.trigger_gauge_id), None)
            if trigger:
                rows = series.get(trigger.gauge.id, [])
                r30 = rise(rows)
                extra = (
                    is_fresh(rows, now, trigger.gauge.stale_after_min)
                    and r30 is not None
                    and r30 < 0
                    and rows[-1].value < trigger.trigger_stage_ft - 0.5
                )
        elif prev.state == "closed":
            if prev.closed_source == "official":
                extra = fresh and record is not None and record.status in {"open", "caution"}
            elif crossing.target_gauge and crossing.overtop_stage_ft is not None:
                rows = series.get(crossing.target_gauge.id, [])
                extra = (
                    is_fresh(rows, now, crossing.target_gauge.stale_after_min)
                    and rows[-1].value < crossing.overtop_stage_ft
                )
        nxt = step(prev, raw, now, StepContext(fresh, extra, record.source if record else None))
        await state.put(crossing.id, nxt)
        results[crossing.id] = nxt
        if prev.state != nxt.state:
            transitions.append((crossing.id, prev.state, nxt.state))
    return TickResult(now, model.version, results, tuple(transitions))
