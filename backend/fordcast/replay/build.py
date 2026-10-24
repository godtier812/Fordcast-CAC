"""Deterministic Storm Replay driver and fordcast.replay.v1 builder (§19.7, §19.9, §19.11)."""

import gzip
import hashlib
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

import orjson

from fordcast.domain import Tracker
from fordcast.model.explain import tau_range
from fordcast.replay.schema import ReplayTimelineV1
from fordcast.replay.storyboard import build_storyboard
from fordcast.sources.base import Reading
from fordcast.sources.official import EmptyOfficial
from fordcast.sources.replay import Outage, StormReplaySource
from fordcast.tick import MemoryStateStore, RiskModel, tick


@dataclass(frozen=True)
class ReplayFrame:
    at: datetime
    states: Mapping[str, str]
    trackers: Mapping[str, Tracker]


def iso_z(dt: datetime) -> str:
    return dt.isoformat().replace("+00:00", "Z")


async def run_replay(
    readings: Sequence[Reading],
    model: RiskModel,
    *,
    window_start: datetime,
    window_end: datetime,
    delays: Mapping[str, float] | None = None,
    outages: Sequence[Outage] = (),
) -> list[ReplayFrame]:
    """Run the single tick() pipeline over [window_start, window_end] at 5-minute steps."""
    source = StormReplaySource(readings, delays=delays, outages=outages)
    official = EmptyOfficial()
    state = MemoryStateStore()
    now = window_start
    step_td = timedelta(minutes=5)
    frames: list[ReplayFrame] = []
    while now <= window_end:
        res = await tick(now, source, official, state, model)
        frames.append(
            ReplayFrame(
                at=now,
                states={cid: tr.state for cid, tr in res.results.items()},
                trackers=dict(res.results),
            )
        )
        now += step_td
    return frames


def build_stage_grid(
    readings: Sequence[Reading],
    window_start: datetime,
    window_end: datetime,
    dt_s: int = 900,
) -> list[float | None]:
    """Sample gauge readings onto a regular 15-min grid; leave true archive gaps (>20 min) as None."""
    sorted_rows = sorted(readings, key=lambda r: r.obs_time)
    n_steps = int((window_end - window_start).total_seconds() // dt_s) + 1
    out: list[float | None] = []
    if not sorted_rows:
        return [None] * n_steps

    idx = 0
    n_rows = len(sorted_rows)
    for k in range(n_steps):
        target = window_start + timedelta(seconds=k * dt_s)
        while idx + 1 < n_rows and sorted_rows[idx + 1].obs_time <= target:
            idx += 1
        best = sorted_rows[idx]
        if 0 <= (target - best.obs_time).total_seconds() <= 1200:
            out.append(round(float(best.value), 2))
        else:
            out.append(None)
    return out


def serialize_replay(doc: dict[str, Any]) -> tuple[bytes, bytes, str, str, str]:
    """Validate and return (canonical_json_bytes, gz_bytes, timeline_sha256, content_sha256, file_sha256)."""
    validated = ReplayTimelineV1.model_validate(doc)
    payload = validated.model_dump(by_alias=True)
    canonical = orjson.dumps(payload, option=orjson.OPT_SORT_KEYS)
    without_pipeline = {k: v for k, v in payload.items() if k != "pipeline"}
    content_bytes = orjson.dumps(without_pipeline, option=orjson.OPT_SORT_KEYS)
    gz_bytes = gzip.compress(canonical, compresslevel=9, mtime=0)
    timeline_sha = hashlib.sha256(canonical).hexdigest()
    content_sha = hashlib.sha256(content_bytes).hexdigest()
    file_sha = hashlib.sha256(gz_bytes).hexdigest()
    if len(gz_bytes) > 150 * 1024:
        raise ValueError(
            f"Replay {payload['storm']['id']} exceeds 150 KB gz budget ({len(gz_bytes)} bytes)"
        )
    return canonical, gz_bytes, timeline_sha, content_sha, file_sha


async def build_replay_document(
    *,
    storm_meta: Mapping[str, Any],
    readings: Sequence[Reading],
    model: RiskModel,
    gauge_meta_by_id: Mapping[str, Mapping[str, Any]],
    crossing_meta_by_id: Mapping[str, Mapping[str, Any]],
    link_meta_by_pair: Mapping[tuple[str, str], Mapping[str, Any]],
    delays: Mapping[str, int],
    outages: Sequence[Outage],
    truth_rows: Sequence[Mapping[str, Any]],
    metrics_block: Mapping[str, Any],
    hero_block: Mapping[str, Any] | None,
    pipeline_meta: Mapping[str, str],
) -> dict[str, Any]:
    """Run replay and assemble a validated fordcast.replay.v1 dictionary."""
    window_start = datetime.fromisoformat(storm_meta["start"])
    window_end = datetime.fromisoformat(storm_meta["end"])
    frames = await run_replay(
        readings,
        model,
        window_start=window_start,
        window_end=window_end,
        delays=delays,
        outages=outages,
    )

    initial_states: dict[str, str] = {}
    events: list[dict[str, Any]] = []
    pulses: list[dict[str, Any]] = []
    seen_pulses: set[tuple[str, str, str]] = set()

    if frames:
        for cid, tr in sorted(frames[0].trackers.items()):
            initial_states[cid] = tr.state

    prev_key: dict[str, tuple[str, tuple[int, int] | None, bool]] = (
        {
            cid: (
                frames[0].trackers[cid].state,
                frames[0].trackers[cid].window,
                frames[0].trackers[cid].held,
            )
            for cid in frames[0].trackers
        }
        if frames
        else {}
    )

    for frame in frames[1:]:
        t_str = iso_z(frame.at)
        for cid in sorted(frame.trackers):
            tr = frame.trackers[cid]
            cur_key = (tr.state, tr.window, tr.held)
            if cur_key != prev_key.get(cid):
                prev_state = prev_key.get(cid, ("unknown", None, False))[0]
                prev_key[cid] = cur_key
                reasons_wire = [r.wire() for r in tr.reasons]
                events.append(
                    {
                        "t": t_str,
                        "crossing_id": cid,
                        "state": tr.state,
                        "window": list(tr.window) if tr.window is not None else None,
                        "reasons": reasons_wire,
                        "p": None,
                        "held": tr.held,
                    }
                )
                if tr.state == "avoid" and prev_state != "avoid":
                    for r in reasons_wire:
                        if r.get("code") == "UPSTREAM_ABOVE_TRIGGER" and r.get("gauge_id"):
                            gid = str(r["gauge_id"])
                            lnk = next(
                                (l for l in model.links.get(cid, ()) if l.gauge.id == gid),
                                None,
                            )
                            tau_m = round(lnk.lag_min) if lnk else 45
                            pkey = (cid, gid, t_str)
                            if pkey not in seen_pulses:
                                seen_pulses.add(pkey)
                                pulses.append(
                                    {
                                        "crossing_id": cid,
                                        "gauge_id": gid,
                                        "t_trigger": t_str,
                                        "tau_min": tau_m,
                                    }
                                )

    linked_gauge_ids = sorted(
        {lnk.gauge.id for lnks in model.links.values() for lnk in lnks}
        | {c.target_gauge.id for c in model.crossings if c.target_gauge is not None}
        | {r.gauge_id for r in readings}
    )

    readings_by_gauge: dict[str, list[Reading]] = {}
    for r in readings:
        readings_by_gauge.setdefault(r.gauge_id, []).append(r)

    primary_trigger_by_gauge: dict[str, tuple[float | None, float | None]] = {}
    for cid in sorted(model.links):
        for lnk in model.links[cid]:
            if lnk.relation == "upstream" and lnk.gauge.id not in primary_trigger_by_gauge:
                primary_trigger_by_gauge[lnk.gauge.id] = (
                    round(lnk.trigger_stage_ft, 2),
                    round(lnk.watch_stage_ft, 2),
                )

    gauges_list: list[dict[str, Any]] = []
    for gid in linked_gauge_ids:
        gmeta = gauge_meta_by_id.get(gid)
        if not gmeta:
            continue
        trig_ft, watch_ft = primary_trigger_by_gauge.get(gid, (None, None))
        g_outages = [
            {"start": iso_z(o.start), "end": iso_z(o.end)} for o in outages if o.gauge_id == gid
        ]
        delay_m = int(delays.get(gid, 60))
        gauges_list.append(
            {
                "id": gid,
                "name": gmeta["name"],
                "lon": float(gmeta["lon"]),
                "lat": float(gmeta["lat"]),
                "t0": storm_meta["start"],
                "dt_s": 900,
                "stage_ft": build_stage_grid(
                    readings_by_gauge.get(gid, ()), window_start, window_end, dt_s=900
                ),
                "avail_delay_s": delay_m * 60,
                "outages": g_outages,
                "trigger_ft": trig_ft,
                "watch_ft": watch_ft,
                "nws_categories": gmeta.get("nws_categories"),
            }
        )

    crossings_list: list[dict[str, Any]] = []
    for c in sorted(model.crossings, key=lambda x: x.id):
        cmeta = crossing_meta_by_id.get(c.id, {})
        crossings_list.append(
            {
                "id": c.id,
                "name": c.name,
                "name_es": cmeta.get("name_es") or c.name,
                "lon": round(c.lon, 5),
                "lat": round(c.lat, 5),
                "tier": c.tier,
                "initial_state": initial_states.get(c.id, "unknown"),
                "overtop_stage_ft": c.overtop_stage_ft,
                "reference_stage_ft": c.reference_stage_ft,
                "target_gauge_id": c.target_gauge.id if c.target_gauge else None,
            }
        )

    links_list: list[dict[str, Any]] = []
    for cid in sorted(model.links):
        for lnk in sorted(model.links[cid], key=lambda l: (not l.is_primary, l.gauge.id)):
            tau_lo, tau_hi = tau_range(lnk)
            lmeta = link_meta_by_pair.get((cid, lnk.gauge.id), {})
            gmeta = gauge_meta_by_id.get(lnk.gauge.id, {})
            cmeta = crossing_meta_by_id.get(cid, {})
            flowline = lmeta.get("flowline") or [
                [round(float(gmeta.get("lon", -97.8)), 5), round(float(gmeta.get("lat", 30.2)), 5)],
                [
                    round(float(cmeta.get("lon", -97.75)), 5),
                    round(float(cmeta.get("lat", 30.2)), 5),
                ],
            ]
            links_list.append(
                {
                    "crossing_id": cid,
                    "gauge_id": lnk.gauge.id,
                    "relation": lnk.relation,
                    "is_primary": lnk.is_primary,
                    "tau_min": round(lnk.lag_min),
                    "tau_p25": round(lnk.lag_p25_min),
                    "tau_p75": round(lnk.lag_p75_min),
                    "tau_lo_min": tau_lo,
                    "tau_hi_min": tau_hi,
                    "trigger_ft": round(lnk.trigger_stage_ft, 2),
                    "watch_ft": round(lnk.watch_stage_ft, 2),
                    "channel_dist_km": lmeta.get("channel_dist_km"),
                    "geometry_source": "schematic_corridor_connector",
                    "flowline": flowline,
                }
            )

    outages_meta = [
        {
            "site": o.gauge_id,
            "start": iso_z(o.start),
            "end": iso_z(o.end),
            "source": o.source,
        }
        for o in outages
    ]
    gauge_names = {g["id"]: g["name"] for g in gauges_list}
    storyboard = build_storyboard(events, outages_meta, gauge_names)

    delay_by_gauge = {gid: int(delays.get(gid, 60)) for gid in linked_gauge_ids}
    median_delay = (
        int(sorted(delay_by_gauge.values())[len(delay_by_gauge) // 2]) if delay_by_gauge else 60
    )

    return {
        "schema": "fordcast.replay.v1",
        "storm": {
            "id": storm_meta["id"],
            "name_en": storm_meta["name_en"],
            "name_es": storm_meta["name_es"],
            "start": storm_meta["start"],
            "end": storm_meta["end"],
            "tz": "America/Chicago",
            "headline_event": storm_meta.get("headline_event"),
            "description_en": storm_meta.get("description_en"),
            "description_es": storm_meta.get("description_es"),
        },
        "step_s": 300,
        "assumptions": {
            "data_delay_min": median_delay,
            "data_delay_min_by_gauge": delay_by_gauge,
            "default_delay_min": 60,
            "delays_source": "data/latency/gauge_latency.json",
            "outages": outages_meta,
            "official_status": "not available for this storm",
            "values": "approved archive values, not the provisional values live at the time",
            "params": "learned without this storm (leave-one-storm-out)",
            "rain": None,
        },
        "pipeline": dict(pipeline_meta),
        "gauges": gauges_list,
        "crossings": crossings_list,
        "links": links_list,
        "events": events,
        "pulses": pulses,
        "truth": [dict(t) for t in truth_rows],
        "metrics": dict(metrics_block),
        "hero": dict(hero_block) if hero_block is not None else None,
        "storyboard": storyboard,
    }
