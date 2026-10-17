from dataclasses import dataclass, replace
from datetime import datetime, timedelta

from fordcast.domain import RANK, RawState, Reason, RiskState, Tracker

DWELL = {"closed": 6, "avoid": 6, "watch": 12}
DOWN: dict[str, RiskState] = {"closed": "avoid", "avoid": "watch", "watch": "no_rise"}


@dataclass(frozen=True)
class StepContext:
    official_fresh: bool = False
    extra_condition_ok: bool = False
    official_source: str | None = None


def enter(tr: Tracker, raw: RawState, now: datetime) -> Tracker:
    return Tracker(
        raw.state,
        now,
        0,
        raw.state,
        now,
        raw.closed_source,
        raw.trigger_gauge_id or tr.trigger_gauge_id,
        raw.window,
        False,
        raw.reasons,
        now,
    )


def step(tr: Tracker, raw: RawState, now: datetime, ctx: StepContext) -> Tracker:
    """Apply one 5-minute transition. Duplicate ticks cannot shorten a dwell."""
    if tr.last_tick_at is not None and now < tr.last_tick_at:
        raise ValueError("State clock cannot move backwards")
    lost_official = tr.closed_source == "official" and not ctx.official_fresh
    if raw.state == "unknown" or lost_official:
        return replace(
            tr,
            state="unknown",
            since=now if tr.state != "unknown" else tr.since,
            calm_ticks=0,
            window=None,
            held=False,
            last_tick_at=now,
            last_known_state=tr.state if tr.state != "unknown" else tr.last_known_state,
            last_known_at=tr.last_known_at,
            reasons=(Reason("DATA_STALE", {"source": ctx.official_source or "official"}),)
            if lost_official
            else raw.reasons,
        )
    if tr.state == "unknown":
        known = tr.last_known_state
        if known in DOWN and RANK[raw.state] < RANK[known]:
            nxt = max((raw.state, DOWN[known]), key=RANK.__getitem__)
            return replace(
                enter(tr, RawState(nxt), now),
                held=True,
                reasons=(Reason("HOLDING", {"since": now.isoformat(), "held_state": nxt}),)
                + raw.reasons,
            )
        return enter(tr, raw, now)
    if RANK[raw.state] > RANK[tr.state]:
        return enter(tr, raw, now)
    if raw.state == tr.state:
        return replace(enter(tr, raw, now), since=tr.since)
    # Every dwell condition must hold throughout the dwell; unavailable/failing
    # evidence resets it. A scheduling gap also breaks consecutive ticks.
    consecutive = tr.last_tick_at is None or now - tr.last_tick_at == timedelta(minutes=5)
    new_tick = tr.last_tick_at is None or now - tr.last_tick_at >= timedelta(minutes=5)
    calm = tr.calm_ticks
    if new_tick:
        calm = ((calm if consecutive else 0) + 1) if ctx.extra_condition_ok else 0
    if calm >= DWELL[tr.state] and ctx.extra_condition_ok:
        nxt = max((raw.state, DOWN[tr.state]), key=RANK.__getitem__)
        held = nxt != raw.state
        reasons = raw.reasons
        if held:
            reasons = (Reason("HOLDING", {"since": now.isoformat(), "held_state": nxt}),) + reasons
        if tr.closed_source == "official":
            reasons = (
                Reason("CLOSURE_LIFTED", {"source": ctx.official_source, "at": now.isoformat()}),
            ) + reasons
        return replace(enter(tr, RawState(nxt, None, reasons, tr.trigger_gauge_id), now), held=held)
    return replace(
        tr,
        calm_ticks=calm,
        window=None,
        held=True,
        last_tick_at=now,
        reasons=(
            Reason(
                "HOLDING",
                {
                    "since": tr.since.isoformat() if tr.since else now.isoformat(),
                    "held_state": tr.state,
                },
            ),
        )
        + raw.reasons,
    )
