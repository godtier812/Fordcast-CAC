"""Public snapshot validation and read-time expiry."""

from datetime import datetime
from typing import Any, Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, model_validator

from fordcast.domain import RiskState
from fordcast.model.windows import ALLOWED_WINDOWS


class CrossingRisk(BaseModel):
    id: str
    state: RiskState
    tier: Literal["A", "B", "C"]
    window: tuple[int, int] | None = None
    held: bool = False
    p: tuple[float, float, float] | None = None
    official: dict[str, Any] | None = None
    closed_source: str | None = None
    latest_obs_at: AwareDatetime | None = None
    changed_at: AwareDatetime | None = None
    last_known: dict[str, Any] | None = None
    reasons: list[dict[str, Any]] = Field(default_factory=list)

    @model_validator(mode="after")
    def valid_state(self):
        if self.state != "no_rise" and not self.reasons:
            raise ValueError("Non-calm states need a reason")
        if self.window is not None and (
            self.window not in ALLOWED_WINDOWS or self.state not in {"watch", "avoid"}
        ):
            raise ValueError("Invalid risk window")
        return self


class Snapshot(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    schema_version: Literal["fordcast.snapshot.v1"] = Field(
        default="fordcast.snapshot.v1", alias="schema"
    )
    as_of: AwareDatetime
    generated_at: AwareDatetime
    seq: int = 0
    data_status: Literal["live", "degraded", "offline"] = "offline"
    stale_after_s: int = Field(default=1200, gt=0, le=1200)
    inventory_version: str
    model: dict[str, Any]
    config: dict[str, Any] = Field(
        default_factory=lambda: {
            "banner": None,
            "min_app_version": "1.0.0",
            "demo_mode_default": False,
            "featured_storm": None,
        }
    )
    disclaimer_key: str = "SUPPLEMENTARY_TOOL"
    counts: dict[str, int]
    nws_status: str = "disabled"
    nws: list = Field(default_factory=list)
    gauges: list = Field(default_factory=list)
    crossings: list[CrossingRisk]

    def at(self, now: datetime) -> "Snapshot":
        expired = (
            (now - self.as_of).total_seconds() > self.stale_after_s
            or self.data_status == "offline"
            or (self.as_of - now).total_seconds() > 60
        )
        if not expired:
            return self.model_copy(deep=True)
        crossings = []
        for item in self.crossings:
            last = item.last_known
            if (
                item.state in {"watch", "avoid", "closed"}
                and (self.as_of - now).total_seconds() <= 60
            ):
                last = {"state": item.state, "at": self.as_of.isoformat()}
            crossings.append(
                item.model_copy(
                    update={
                        "state": "unknown",
                        "window": None,
                        "p": None,
                        "held": False,
                        "last_known": last,
                        "reasons": [{"code": "DATA_STALE", "source": "snapshot"}],
                    }
                )
            )
        return self.model_copy(update={"data_status": "offline", "crossings": crossings})
