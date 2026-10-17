"""Agent-written DataSource contract; student explain-back is pending."""

from bisect import bisect_right
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta
from math import isfinite
from typing import Protocol


def aware(value: datetime) -> None:
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("Timestamps must be timezone-aware")


class LookaheadError(AssertionError):
    """A provider tried to expose an observation before it was available."""


@dataclass(frozen=True, slots=True)
class Reading:
    gauge_id: str
    param: str
    obs_time: datetime
    available_at: datetime
    value: float
    approval: str = "P"
    qualifiers: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        aware(self.obs_time)
        aware(self.available_at)
        if self.available_at < self.obs_time or not isfinite(self.value):
            raise ValueError("Invalid observation value or availability time")


@dataclass(frozen=True, slots=True)
class OfficialStatus:
    crossing_id: str
    source: str
    status: str
    available_at: datetime
    source_updated_at: datetime | None = None
    expires_at: datetime | None = None
    note: str | None = None

    def __post_init__(self) -> None:
        for value in (self.available_at, self.source_updated_at, self.expires_at):
            if value is not None:
                aware(value)
        if self.status not in {"open", "caution", "closed", "unknown"}:
            raise ValueError("Invalid official status")


class DataSource(Protocol):
    async def series(
        self, gauge_ids: Sequence[str], param: str, as_of: datetime, lookback: timedelta
    ) -> dict[str, list[Reading]]: ...


class OfficialStatusSource(Protocol):
    async def status(
        self, crossing_ids: Sequence[str], as_of: datetime
    ) -> dict[str, OfficialStatus]: ...


def visible(
    readings_sorted_by_available: Sequence[Reading],
    available_index: Sequence[datetime],
    gauge_id: str,
    as_of: datetime,
    lookback: timedelta,
) -> list[Reading]:
    """Select arrived observations inside the left-open lookback window.

    Providers own the sorted index. Duplicate observation revisions are resolved to
    the most recently available revision, never to a later archive correction.
    """
    aware(as_of)
    if len(available_index) != len(readings_sorted_by_available):
        raise ValueError("Availability index does not match readings")
    if lookback <= timedelta(0):
        raise ValueError("Lookback must be positive")
    end = bisect_right(available_index, as_of)
    versions: dict[tuple[str, datetime], Reading] = {}
    for reading in readings_sorted_by_available[:end]:
        if reading.gauge_id == gauge_id and as_of - lookback < reading.obs_time <= as_of:
            if reading.available_at > as_of:
                raise LookaheadError("Availability index is inconsistent")
            versions[(reading.param, reading.obs_time)] = reading
    return sorted(versions.values(), key=lambda r: r.obs_time)


def assert_no_lookahead(readings: Sequence[Reading], as_of: datetime) -> None:
    aware(as_of)
    if any(r.available_at > as_of or r.obs_time > as_of for r in readings):
        raise LookaheadError("Observation or delivery occurs after the pipeline clock")
