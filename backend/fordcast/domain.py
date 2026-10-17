from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Literal

RiskState = Literal["no_rise", "unknown", "watch", "avoid", "closed"]
RANK: dict[str, int] = {"no_rise": 0, "unknown": 1, "watch": 2, "avoid": 3, "closed": 4}
Window = tuple[int, int]


@dataclass(frozen=True)
class Gauge:
    id: str
    stale_after_min: float = 60


@dataclass(frozen=True)
class Crossing:
    id: str
    name: str
    lon: float
    lat: float
    tier: Literal["A", "B", "C"] = "C"
    target_gauge: Gauge | None = None
    overtop_stage_ft: float | None = None


@dataclass(frozen=True)
class Link:
    crossing_id: str
    gauge: Gauge
    lag_min: float
    lag_p25_min: float
    lag_p75_min: float
    trigger_stage_ft: float
    watch_stage_ft: float
    n_storms: int
    is_primary: bool = True
    relation: str = "upstream"
    min_rise_ft_30m: float = 0.10

    def __post_init__(self) -> None:
        if not 0 <= self.lag_p25_min <= self.lag_min <= self.lag_p75_min:
            raise ValueError("Travel-time quantiles must be ordered and nonnegative")
        if self.watch_stage_ft > self.trigger_stage_ft or self.n_storms < 1:
            raise ValueError("Invalid learned link parameters")


@dataclass(frozen=True)
class Reason:
    code: str
    params: dict[str, Any] = field(default_factory=dict)

    def wire(self) -> dict[str, Any]:
        return {"code": self.code, **self.params}


@dataclass(frozen=True)
class RuleResult:
    state: RiskState = "no_rise"
    eta_lo_min: float | None = None
    eta_hi_min: float | None = None
    window: Window | None = None
    trigger_gauge_id: str | None = None
    reasons: tuple[Reason, ...] = ()


@dataclass(frozen=True)
class RawState:
    state: RiskState
    window: Window | None = None
    reasons: tuple[Reason, ...] = ()
    trigger_gauge_id: str | None = None
    closed_source: str | None = None


@dataclass(frozen=True)
class Tracker:
    state: RiskState = "unknown"
    since: datetime | None = None
    calm_ticks: int = 0
    last_known_state: RiskState | None = None
    last_known_at: datetime | None = None
    closed_source: str | None = None
    trigger_gauge_id: str | None = None
    window: Window | None = None
    held: bool = False
    reasons: tuple[Reason, ...] = ()
    last_tick_at: datetime | None = None
