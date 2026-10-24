"""Pydantic schema for fordcast.replay.v1 and fordcast.replay-index.v1 (§19.11, §19.14)."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ReplayStormMeta(BaseModel):
    id: str
    name_en: str
    name_es: str
    start: str
    end: str
    tz: Literal["America/Chicago"] = "America/Chicago"
    headline_event: str | None = None
    description_en: str | None = None
    description_es: str | None = None


class ReplayOutageMeta(BaseModel):
    site: str
    start: str
    end: str
    source: str


class ReplayAssumptions(BaseModel):
    data_delay_min: int
    data_delay_min_by_gauge: dict[str, int]
    default_delay_min: int = 60
    delays_source: str = "data/latency/gauge_latency.json"
    outages: list[ReplayOutageMeta] = Field(default_factory=list)
    official_status: str = "not available for this storm"
    values: str = "approved archive values, not the provisional values live at the time"
    params: str = "learned without this storm (leave-one-storm-out)"
    rain: str | None = None


class ReplayPipelineMeta(BaseModel):
    git_sha: str
    model_version: str
    data_sha256: str
    latency_sha256: str
    results_sha256: str
    generated_at: str
    source_sha256: str | None = None


class ReplayGaugeOutageWindow(BaseModel):
    start: str
    end: str


class ReplayGauge(BaseModel):
    id: str
    name: str
    lon: float
    lat: float
    t0: str
    dt_s: int = 900
    stage_ft: list[float | None]
    avail_delay_s: int
    outages: list[ReplayGaugeOutageWindow] = Field(default_factory=list)
    trigger_ft: float | None = None
    watch_ft: float | None = None
    nws_categories: dict[str, float] | None = None


class ReplayCrossing(BaseModel):
    id: str
    name: str
    name_es: str | None = None
    lon: float
    lat: float
    tier: Literal["A", "B", "C"]
    initial_state: Literal["no_rise", "unknown", "watch", "avoid", "closed"]
    overtop_stage_ft: float | None = None
    reference_stage_ft: float | None = None
    target_gauge_id: str | None = None


class ReplayLink(BaseModel):
    crossing_id: str
    gauge_id: str
    relation: str
    is_primary: bool
    tau_min: int
    tau_p25: int
    tau_p75: int
    tau_lo_min: int
    tau_hi_min: int
    trigger_ft: float | None = None
    watch_ft: float | None = None
    channel_dist_km: float | None = None
    flowline: list[tuple[float, float]]
    geometry_source: Literal["schematic_corridor_connector"] = "schematic_corridor_connector"


class ReplayEvent(BaseModel):
    t: str
    crossing_id: str
    state: Literal["no_rise", "unknown", "watch", "avoid", "closed"]
    window: tuple[int, int] | None = None
    reasons: list[dict[str, Any]]
    p: tuple[float, float, float] | None = None
    held: bool = False


class ReplayPulse(BaseModel):
    crossing_id: str
    gauge_id: str
    t_trigger: str
    tau_min: int


class ReplayTruth(BaseModel):
    crossing_id: str
    onset: str
    end: str
    quality: str
    censored: bool = False


class ReplayScoreBlock(BaseModel):
    pod: float | None = None
    far: float | None = None
    csi: float | None = None
    median_lead_min: float | None = None
    n_events: int = 0


class ReplayMetrics(ReplayScoreBlock):
    method: str = "upstream_rule"
    level: str = "avoid"
    comparators: dict[str, ReplayScoreBlock]


class ReplayHero(BaseModel):
    crossing_id: str
    lead_min: float | None = None
    level: Literal["avoid"] = "avoid"
    onset: str
    first_alert_at: str
    censored: bool = False


class ReplayStoryboardLine(BaseModel):
    t: str
    kind: str
    en: str
    es: str


class ReplayTimelineV1(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    schema_version: Literal["fordcast.replay.v1"] = Field(
        default="fordcast.replay.v1", alias="schema"
    )
    storm: ReplayStormMeta
    step_s: Literal[300] = 300
    assumptions: ReplayAssumptions
    pipeline: ReplayPipelineMeta
    gauges: list[ReplayGauge]
    crossings: list[ReplayCrossing]
    links: list[ReplayLink]
    events: list[ReplayEvent]
    pulses: list[ReplayPulse]
    truth: list[ReplayTruth]
    metrics: ReplayMetrics
    hero: ReplayHero | None = None
    storyboard: list[ReplayStoryboardLine]


class ReplayIndexEntry(BaseModel):
    id: str
    name_en: str
    name_es: str
    start: str
    end: str
    file: str
    bytes_gz: int
    generated_at: str
    timeline_sha256: str
    content_sha256: str
    file_sha256: str
    model_version: str
    featured: bool = False
    sort_order: int = 1
    median_lead_min: float | None = None
    n_crossings: int = 0


class ReplayIndexV1(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    schema_version: Literal["fordcast.replay-index.v1"] = Field(
        default="fordcast.replay-index.v1", alias="schema"
    )
    generated_at: str
    hero_storm_id: str | None = None
    storms: list[ReplayIndexEntry]
