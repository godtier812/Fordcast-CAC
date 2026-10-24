from collections.abc import Mapping, Sequence
from dataclasses import dataclass, replace
from datetime import datetime, timedelta

from fordcast.sources.base import Reading, assert_no_lookahead, aware, visible


def grouped_index(readings: Sequence[Reading]):
    grouped: dict[str, list[Reading]] = {}
    for reading in sorted(readings, key=lambda r: (r.available_at, r.obs_time)):
        grouped.setdefault(reading.gauge_id, []).append(reading)
    return grouped, {gid: [r.available_at for r in rows] for gid, rows in grouped.items()}


@dataclass(frozen=True)
class Outage:
    gauge_id: str
    start: datetime
    end: datetime
    source: str

    def __post_init__(self) -> None:
        aware(self.start)
        aware(self.end)
        if self.end <= self.start or not self.source.strip():
            raise ValueError("An outage needs ordered bounds and a documented source")


class StormReplaySource:
    """Historical values with explicit, frozen delivery assumptions (§19.4)."""

    def __init__(
        self,
        readings: Sequence[Reading],
        delays: Mapping[str, float] | None = None,
        outages: Sequence[Outage] = (),
    ) -> None:
        delays = delays or {}
        prepared = []
        for r in readings:
            delay = delays.get(r.gauge_id, 60)
            if delay < 0:
                raise ValueError("Delivery delay cannot be negative")
            arrival = r.obs_time + timedelta(minutes=delay)
            for outage in outages:
                if outage.gauge_id == r.gauge_id and outage.start <= r.obs_time < outage.end:
                    arrival = max(arrival, outage.end)
            prepared.append(replace(r, available_at=arrival))
        self._readings, self._index = grouped_index(prepared)

    async def series(
        self, gauge_ids: Sequence[str], param: str, as_of: datetime, lookback: timedelta
    ) -> dict[str, list[Reading]]:
        result = {
            g: [
                r
                for r in visible(
                    self._readings.get(g, []), self._index.get(g, []), g, as_of, lookback
                )
                if r.param == param
            ]
            for g in gauge_ids
        }
        assert_no_lookahead([r for rows in result.values() for r in rows], as_of)
        return result


class RecordedSource:
    """Local/live observations retaining their actual first-received timestamps."""

    def __init__(self, readings: Sequence[Reading]) -> None:
        self._readings, self._index = grouped_index(readings)

    async def series(
        self, gauge_ids: Sequence[str], param: str, as_of: datetime, lookback: timedelta
    ) -> dict[str, list[Reading]]:
        return {
            g: [
                r
                for r in visible(
                    self._readings.get(g, []), self._index.get(g, []), g, as_of, lookback
                )
                if r.param == param
            ]
            for g in gauge_ids
        }
