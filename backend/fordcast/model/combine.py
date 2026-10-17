from fordcast.domain import RANK, RawState, Reason, RuleResult
from fordcast.sources.base import OfficialStatus


def resolve_raw_state(
    official: OfficialStatus | None,
    water_at_road: bool,
    all_gauges_stale: bool,
    tier: str,
    rule: RuleResult,
    ml: RuleResult | None = None,
) -> RawState:
    if official is not None and official.status == "closed":
        return RawState(
            "closed",
            reasons=(Reason("OFFICIAL_CLOSED", {"source": official.source}),),
            closed_source="official",
        )
    if water_at_road:
        return RawState("closed", reasons=(Reason("WATER_AT_ROAD"),), closed_source="sensor")
    if tier == "C":
        base = RawState("unknown", reasons=(Reason("NO_UPSTREAM_GAUGE"),))
    elif all_gauges_stale:
        base = RawState("unknown", reasons=(Reason("DATA_STALE", {"source": "upstream"}),))
    else:
        chosen = max((rule, ml or rule), key=lambda r: RANK[r.state])
        base = RawState(chosen.state, chosen.window, chosen.reasons, chosen.trigger_gauge_id)
    if official is not None and official.status == "caution" and RANK[base.state] < RANK["watch"]:
        return RawState(
            "watch",
            reasons=base.reasons + (Reason("OFFICIAL_CAUTION", {"source": official.source}),),
        )
    return base
