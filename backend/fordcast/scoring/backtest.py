"""Leave-one-storm-out (LOSO) backtest, delay sensitivity, and fordcast.results.v1 writer (§18.12, §18.13)."""

import csv
import hashlib
import json
import math
import tomllib
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd

from fordcast.domain import Crossing, Gauge, Link
from fordcast.linking.travel_time import LagEstimate, combine_storms, estimate_lag
from fordcast.linking.triggers import learn_trigger
from fordcast.replay.build import iso_z, run_replay
from fordcast.scoring.labels import extract_truth_episodes, load_onsets, write_truth_csv
from fordcast.scoring.metrics import (
    Frame as MetricFrame,
)
from fordcast.scoring.metrics import (
    MatchResult,
    Onset,
    bootstrap_ci,
    episodes_from_frames,
    match_events,
    scores,
)
from fordcast.sources.base import Reading
from fordcast.sources.replay import Outage
from fordcast.tick import RiskModel


@dataclass(frozen=True)
class LinkSpec:
    crossing_id: str
    gauge_id: str
    relation: str
    channel_dist_km: float
    euclid_km: float
    flowline: list[tuple[float, float]]


def _clean_num(val: float | None, digits: int = 3) -> float | int | None:
    if val is None:
        return None
    if isinstance(val, int):
        return val
    if math.isnan(val) or math.isinf(val):
        return None
    return round(float(val), digits)


def load_storm_readings(parquet_path: Path) -> list[Reading]:
    df = pd.read_parquet(parquet_path)
    out: list[Reading] = []
    for row in df.itertuples(index=False):
        obs_t = pd.Timestamp(row.obs_time).to_pydatetime()
        fetch_t = pd.Timestamp(row.fetched_at).to_pydatetime()
        quals = tuple(str(x) for x in row.qualifiers) if row.qualifiers is not None else ()
        out.append(
            Reading(
                gauge_id=str(row.gauge_id),
                param=str(row.param),
                obs_time=obs_t,
                available_at=fetch_t,
                value=float(row.value),
                approval=str(row.approval),
                qualifiers=quals,
            )
        )
    return out


def learn_fold_links(
    train_storm_ids: Sequence[str],
    readings_by_storm: Mapping[str, Sequence[Reading]],
    onsets_by_storm: Mapping[str, Sequence[Onset]],
    crossings_by_id: Mapping[str, Crossing],
    link_specs: Sequence[LinkSpec],
    delays_by_gauge: Mapping[str, int],
    nws_action_by_gauge: Mapping[str, float | None],
    model_version: str,
    *,
    relation_filter: str = "upstream",
) -> tuple[dict[str, tuple[Link, ...]], list[dict[str, Any]]]:
    """Learn travel time tau and trigger stages on training storms only (§18.3, §18.4)."""
    series_by_storm_gauge: dict[str, dict[str, list[Reading]]] = {}
    pd_series_by_storm_gauge: dict[str, dict[str, pd.Series]] = {}
    for sid in train_storm_ids:
        by_g: dict[str, list[Reading]] = {}
        for r in readings_by_storm.get(sid, ()):
            by_g.setdefault(r.gauge_id, []).append(r)
        series_by_storm_gauge[sid] = {}
        pd_series_by_storm_gauge[sid] = {}
        for gid, rows in by_g.items():
            s_rows = sorted(rows, key=lambda x: x.obs_time)
            series_by_storm_gauge[sid][gid] = s_rows
            pd_series_by_storm_gauge[sid][gid] = pd.Series(
                [x.value for x in s_rows],
                index=pd.DatetimeIndex([x.obs_time for x in s_rows]),
            )

    links_by_crossing: dict[str, list[Link]] = {}
    csv_rows: list[dict[str, Any]] = []

    specs_by_crossing: dict[str, list[LinkSpec]] = {}
    for sp in link_specs:
        if sp.relation == relation_filter:
            specs_by_crossing.setdefault(sp.crossing_id, []).append(sp)

    for cid, c_specs in sorted(specs_by_crossing.items()):
        crossing = crossings_by_id.get(cid)
        if crossing is None:
            continue
        tgt_gid = crossing.target_gauge.id if crossing.target_gauge else None

        learned_items: list[tuple[float, Link, dict[str, Any]]] = []
        for sp in c_specs:
            gid = sp.gauge_id
            delay_m = int(delays_by_gauge.get(gid, 60))
            stale_m = max(60, delay_m + 20)
            gauge_obj = Gauge(id=gid, stale_after_min=stale_m)

            # 1. Learn lag tau from training storms
            lag_ests: list[LagEstimate] = []
            if tgt_gid and tgt_gid != gid:
                for sid in train_storm_ids:
                    s_up = pd_series_by_storm_gauge.get(sid, {}).get(gid)
                    s_dn = pd_series_by_storm_gauge.get(sid, {}).get(tgt_gid)
                    if s_up is not None and s_dn is not None:
                        est = estimate_lag(s_up, s_dn, sid)
                        if est is not None and est.lag_min >= 5.0:
                            lag_ests.append(est)

            combined = combine_storms(lag_ests, channel_dist_km=sp.channel_dist_km)
            if combined is not None and combined.lag_min >= 5.0:
                lag_min = round(combined.lag_min, 1)
                lag_p25 = round(max(5.0, combined.lag_p25_min), 1)
                lag_p75 = round(max(lag_min, combined.lag_p75_min), 1)
                n_storms = combined.n_storms
                xcorr_r = round(combined.xcorr_r, 3)
                lag_review = combined.needs_review
            else:
                lag_min = lag_p25 = lag_p75 = None
                n_storms = len(lag_ests)
                xcorr_r = None
                lag_review = True

            # 2. Learn trigger stage on training storms
            train_onsets_for_c = [
                o
                for sid in train_storm_ids
                for o in onsets_by_storm.get(sid, ())
                if o.crossing_id == cid
            ]
            g_series_train = {
                sid: series_by_storm_gauge[sid][gid]
                for sid in train_storm_ids
                if gid in series_by_storm_gauge.get(sid, {})
            }
            trig = learn_trigger(
                g_series_train,
                train_onsets_for_c,
                delay_min=float(delay_m),
                nws_action_stage_ft=nws_action_by_gauge.get(gid),
            )
            params_src = (
                "learned_proxy" if crossing.reference_stage_ft is not None else trig.params_source
            )
            row_dict = {
                "crossing_id": cid,
                "gauge_id": gid,
                "model_version": model_version,
                "relation": sp.relation,
                "is_primary": False,
                "channel_dist_km": round(sp.channel_dist_km, 2),
                "euclid_km": round(sp.euclid_km, 2),
                "lag_min": lag_min,
                "lag_p25_min": lag_p25,
                "lag_p75_min": lag_p75,
                "xcorr_r": xcorr_r,
                "n_storms": n_storms,
                "celerity_ms": None,
                "calibration_kind": "empirical_gauge_lag" if not lag_review else "uncalibrated",
                "distance_source": "assumed_corridor_distance",
                "topology_verified": False,
                "baseline_stage_ft": trig.baseline_stage_ft,
                "trigger_stage_ft": trig.trigger_stage_ft,
                "watch_stage_ft": trig.watch_stage_ft,
                "min_rise_ft_30m": trig.min_rise_ft_30m,
                "train_csi": trig.train_csi,
                "params_source": params_src,
                "needs_review": lag_review or trig.needs_review,
            }
            if row_dict["needs_review"]:
                # Keep rejected evidence visible, but never instantiate a forecasting link.
                csv_rows.append(row_dict)
                continue
            link_obj = Link(
                crossing_id=cid,
                gauge=gauge_obj,
                lag_min=lag_min,
                lag_p25_min=lag_p25,
                lag_p75_min=lag_p75,
                trigger_stage_ft=trig.trigger_stage_ft,
                watch_stage_ft=trig.watch_stage_ft,
                n_storms=n_storms,
                is_primary=False,
                relation="upstream",
                min_rise_ft_30m=trig.min_rise_ft_30m,
            )
            learned_items.append((xcorr_r, link_obj, row_dict))

        # Sort to pick primary link: highest xcorr_r, then smallest lag_min (§17.9 rule 7)
        learned_items.sort(key=lambda item: (-item[0], item[1].lag_min, item[1].gauge.id))
        final_links: list[Link] = []
        for idx, (_, lnk, rdict) in enumerate(learned_items):
            is_prim = idx == 0
            rdict["is_primary"] = is_prim
            csv_rows.append(rdict)
            final_links.append(
                Link(
                    crossing_id=lnk.crossing_id,
                    gauge=lnk.gauge,
                    lag_min=lnk.lag_min,
                    lag_p25_min=lnk.lag_p25_min,
                    lag_p75_min=lnk.lag_p75_min,
                    trigger_stage_ft=lnk.trigger_stage_ft,
                    watch_stage_ft=lnk.watch_stage_ft,
                    n_storms=lnk.n_storms,
                    is_primary=is_prim,
                    relation="upstream",
                    min_rise_ft_30m=lnk.min_rise_ft_30m,
                )
            )
        links_by_crossing[cid] = tuple(final_links)

    return links_by_crossing, csv_rows


def _format_score_dict(
    m: MatchResult, ci: dict[str, tuple[float, float]] | None = None
) -> dict[str, Any]:
    s = scores(m)
    iqr = s["lead_iqr_min"]
    iqr_clean = (
        [_clean_num(iqr[0], 1), _clean_num(iqr[1], 1)] if isinstance(iqr, tuple) else [None, None]
    )
    out: dict[str, Any] = {
        "H": int(s["H"]),
        "M": int(s["M"]),
        "F": int(s["F"]),
        "pod": _clean_num(float(s["pod"]), 3),
        "far": _clean_num(float(s["far"]), 3),
        "csi": _clean_num(float(s["csi"]), 3),
        "median_lead_min": _clean_num(float(s["median_lead_min"]), 1),
        "lead_iqr_min": iqr_clean,
        "pct_lead_ge_15": _clean_num(float(s["pct_lead_ge_15"]), 1),
    }
    if ci is not None:
        out["ci95"] = {
            k: [_clean_num(ci[k][0], 3), _clean_num(ci[k][1], 3)]
            for k in ("pod", "far", "csi", "median_lead_min")
        }
    return out


async def run_loso_backtest(
    data_dir: Path,
    crossings: Sequence[Crossing],
    crossing_truth_meta: Mapping[str, Mapping[str, Any]],
    link_specs: Sequence[LinkSpec],
    nws_action_by_gauge: Mapping[str, float | None],
    *,
    git_sha: str = "local",
) -> tuple[dict[str, Any], dict[str, RiskModel], list[dict[str, Any]]]:
    """Execute full LOSO backtest across all catalog storms and return (results_json, loso_models, link_rows)."""
    latency_path = data_dir / "latency/gauge_latency.json"
    latency_raw = latency_path.read_bytes()
    latency_sha = hashlib.sha256(latency_raw).hexdigest()
    latency_doc = json.loads(latency_raw.decode("utf-8"))
    delays_by_gauge = {
        gid: int(info.get("delay_min", 60)) for gid, info in latency_doc.get("gauges", {}).items()
    }

    storm_dirs = sorted(
        (p for p in (data_dir / "storms").iterdir() if p.is_dir() and (p / "meta.toml").exists()),
        key=lambda p: tomllib.loads((p / "meta.toml").read_text(encoding="utf-8")).get(
            "catalog_order", 99
        ),
    )

    storm_metas: list[dict[str, Any]] = []
    readings_by_storm: dict[str, list[Reading]] = {}
    outages_by_storm: dict[str, list[Outage]] = {}
    onsets_by_storm: dict[str, list[Onset]] = {}

    crossings_by_id = {c.id: c for c in crossings}
    tier_a_crossings = [c for c in crossings if c.tier == "A" or c.reference_stage_ft is not None]
    tier_a_ids = {c.id for c in tier_a_crossings}

    for sdir in storm_dirs:
        meta = tomllib.loads((sdir / "meta.toml").read_text(encoding="utf-8"))
        if meta.get("kind") != "storm":
            continue
        sid = str(meta["id"])
        storm_metas.append(meta)
        readings = load_storm_readings(sdir / "readings.parquet")
        readings_by_storm[sid] = readings

        w_start = datetime.fromisoformat(meta["window"]["start"])
        w_end = datetime.fromisoformat(meta["window"]["end"])

        outages_list = [
            Outage(
                gauge_id=o["site"],
                start=datetime.fromisoformat(o["start"]),
                end=datetime.fromisoformat(o["end"]),
                source=o["source"],
            )
            for o in meta.get("outages", [])
        ]
        outages_by_storm[sid] = outages_list

        # Build and write ground-truth episodes for Tier-A crossings (§18.2)
        by_gauge: dict[str, list[Reading]] = {}
        for r in readings:
            by_gauge.setdefault(r.gauge_id, []).append(r)

        storm_episodes = []
        for c in tier_a_crossings:
            if c.target_gauge and (
                c.overtop_stage_ft is not None or c.reference_stage_ft is not None
            ):
                t_meta = crossing_truth_meta.get(c.id, {})
                q_str = str(t_meta.get("truth_quality", "impact_statement"))
                eps = extract_truth_episodes(
                    by_gauge.get(c.target_gauge.id, ()),
                    c.overtop_stage_ft if c.overtop_stage_ft is not None else c.reference_stage_ft,
                    crossing_id=c.id,
                    storm_id=sid,
                    quality=q_str,
                    window_start=w_start,
                    window_end=w_end,
                )
                storm_episodes.extend(eps)
        write_truth_csv(sdir / "truth.csv", storm_episodes)
        onsets_by_storm[sid] = load_onsets(data_dir, [sid], list(tier_a_ids))

    all_storm_ids = [m["id"] for m in storm_metas]

    control = next((m for m in storm_metas if m["id"] == "oct-2018"), None)
    control_days = (
        (
            (
                datetime.fromisoformat(control["window"]["end"])
                - datetime.fromisoformat(control["window"]["start"])
            ).total_seconds()
            / 86400
        )
        if control
        else 0
    )

    # Learn live model parameters on all storms
    live_version = "rule-reference-2026.10.18"
    live_links, all_link_rows = learn_fold_links(
        all_storm_ids,
        readings_by_storm,
        onsets_by_storm,
        crossings_by_id,
        link_specs,
        delays_by_gauge,
        nws_action_by_gauge,
        live_version,
        relation_filter="upstream",
    )
    _, nearest_live_rows = learn_fold_links(
        all_storm_ids,
        readings_by_storm,
        onsets_by_storm,
        crossings_by_id,
        link_specs,
        delays_by_gauge,
        nws_action_by_gauge,
        live_version,
        relation_filter="nearest_baseline",
    )
    all_link_rows.extend(nearest_live_rows)

    loso_models: dict[str, RiskModel] = {
        "live": RiskModel(live_version, tuple(crossings), live_links)
    }

    methods_out: dict[str, Any] = {}
    storm_summary_rows: list[dict[str, Any]] = []

    for method_name, rel_filter in (
        ("upstream_rule", "upstream"),
        ("nearest_gauge", "nearest_baseline"),
    ):
        per_storm_avoid: dict[str, MatchResult] = {}
        per_storm_watch: dict[str, MatchResult] = {}
        per_storm_rows_avoid: list[dict[str, Any]] = []
        per_storm_rows_watch: list[dict[str, Any]] = []
        per_crossing_avoid: list[dict[str, Any]] = []
        per_crossing_watch: list[dict[str, Any]] = []

        for meta in storm_metas:
            sid = meta["id"]
            train_ids = [x for x in all_storm_ids if x != sid]
            fold_version = f"rule-loso-{sid}"
            fold_links, fold_rows = learn_fold_links(
                train_ids,
                readings_by_storm,
                onsets_by_storm,
                crossings_by_id,
                link_specs,
                delays_by_gauge,
                nws_action_by_gauge,
                fold_version if method_name == "upstream_rule" else f"nearest-loso-{sid}",
                relation_filter=rel_filter,
            )
            if method_name == "upstream_rule":
                all_link_rows.extend(fold_rows)
                loso_models[sid] = RiskModel(fold_version, tuple(crossings), fold_links)

            fold_model = RiskModel(fold_version, tuple(tier_a_crossings), fold_links)
            w_start = datetime.fromisoformat(meta["window"]["start"])
            w_end = datetime.fromisoformat(meta["window"]["end"])
            r_frames = await run_replay(
                readings_by_storm[sid],
                fold_model,
                window_start=w_start,
                window_end=w_end,
                delays=delays_by_gauge,
                outages=outages_by_storm[sid],
            )
            m_frames = [MetricFrame(at=f.at, states=f.states) for f in r_frames]
            state_by_time = {f.at: f.states for f in r_frames}

            # Annotate unknown_at_onset on storm onsets
            raw_onsets = onsets_by_storm[sid]
            scored_onsets: list[Onset] = []
            for o in raw_onsets:
                st_at = state_by_time.get(o.t, {}).get(o.crossing_id, "no_rise")
                scored_onsets.append(
                    Onset(
                        crossing_id=o.crossing_id,
                        storm_id=o.storm_id,
                        t=o.t,
                        censored=o.censored,
                        quality=o.quality,
                        unknown_at_onset=(st_at == "unknown"),
                    )
                )

            def fa_window(cid: str, flinks: Mapping[str, tuple[Link, ...]] = fold_links) -> int:
                lnks = flinks.get(cid, ())
                p75 = max((l.lag_p75_min for l in lnks), default=60.0)
                return int(max(p75 + 60.0, 120.0))

            for lvl, store_map, rows_list, crossing_list in (
                ("avoid", per_storm_avoid, per_storm_rows_avoid, per_crossing_avoid),
                ("watch", per_storm_watch, per_storm_rows_watch, per_crossing_watch),
            ):
                eps = episodes_from_frames(m_frames, lvl)
                m_res = match_events(eps, scored_onsets, fa_window_min=fa_window)
                store_map[sid] = m_res
                s_dict = scores(m_res)
                rows_list.append(
                    {
                        "storm_id": sid,
                        "H": int(s_dict["H"]),
                        "M": int(s_dict["M"]),
                        "F": int(s_dict["F"]),
                        "pod": _clean_num(float(s_dict["pod"]), 3),
                        "far": _clean_num(float(s_dict["far"]), 3),
                        "csi": _clean_num(float(s_dict["csi"]), 3),
                        "median_lead_min": _clean_num(float(s_dict["median_lead_min"]), 1),
                    }
                )
                hit_by_onset = {(h.onset.crossing_id, h.onset.t): h for h in m_res.hits}
                for o in scored_onsets:
                    hit = hit_by_onset.get((o.crossing_id, o.t))
                    crossing_list.append(
                        {
                            "crossing_id": o.crossing_id,
                            "storm_id": sid,
                            "tier": crossings_by_id[o.crossing_id].tier,
                            "truth_quality": o.quality,
                            "onset": iso_z(o.t),
                            "first_alert_at": iso_z(hit.episode.start) if hit else None,
                            "lead_min": _clean_num(hit.lead_min, 1) if hit else None,
                            "censored": o.censored,
                            "capped": hit.capped if hit else False,
                        }
                    )

            if method_name == "upstream_rule":
                storm_summary_rows.append(
                    {
                        "id": sid,
                        "name_en": meta["name_en"],
                        "name_es": meta["name_es"],
                        "catalog_order": int(meta["catalog_order"]),
                        "bundle": bool(meta.get("bundle", True)),
                        "n_crossings": len(tier_a_crossings),
                        "n_onsets": len(scored_onsets),
                        "n_censored": sum(1 for o in scored_onsets if o.censored),
                        "unknown_at_onset": sum(1 for o in scored_onsets if o.unknown_at_onset),
                    }
                )

        pooled_avoid = MatchResult(
            tuple(h for m in per_storm_avoid.values() for h in m.hits),
            tuple(ms for m in per_storm_avoid.values() for ms in m.misses),
            tuple(fa for m in per_storm_avoid.values() for fa in m.false_alarms),
        )
        pooled_watch = MatchResult(
            tuple(h for m in per_storm_watch.values() for h in m.hits),
            tuple(ms for m in per_storm_watch.values() for ms in m.misses),
            tuple(fa for m in per_storm_watch.values() for fa in m.false_alarms),
        )
        ci_avoid = bootstrap_ci(per_storm_avoid, n=1000, seed=0)
        ci_watch = bootstrap_ci(per_storm_watch, n=1000, seed=0)

        # Control storm (oct-2018) calm false-alarm rate per crossing per 100d
        ctrl_avoid_fa = len(per_storm_avoid.get("oct-2018", MatchResult((), (), ())).false_alarms)
        ctrl_watch_fa = len(per_storm_watch.get("oct-2018", MatchResult((), (), ())).false_alarms)
        n_c = max(1, len(tier_a_crossings))
        methods_out[method_name] = {
            "avoid": {
                "pooled": _format_score_dict(pooled_avoid, ci_avoid),
                "per_storm": per_storm_rows_avoid,
                "per_crossing": per_crossing_avoid,
            },
            "watch": {
                "pooled": _format_score_dict(pooled_watch, ci_watch),
                "per_storm": per_storm_rows_watch,
                "per_crossing": per_crossing_watch,
            },
            "calm_fa_per_crossing_per_100d": {
                "avoid": round(100.0 * ctrl_avoid_fa / (n_c * control_days), 2),
                "watch": round(100.0 * ctrl_watch_fa / (n_c * control_days), 2),
                "tier_b": {
                    "avoid": None,
                    "watch": None,
                    "status": "Not evaluated as a separate population",
                },
            },
        }

    # Delay sensitivity (§18.12): 0, 15, 30, 60 min
    delay_sensitivity: list[dict[str, Any]] = []
    for d_override in (0, 15, 30, 60):
        all_hits_d = []
        for meta in storm_metas:
            sid = meta["id"]
            fold_model = RiskModel(
                f"rule-loso-{sid}",
                tuple(tier_a_crossings),
                {
                    cid: tuple(
                        Link(
                            crossing_id=l.crossing_id,
                            gauge=Gauge(id=l.gauge.id, stale_after_min=max(60, d_override + 20)),
                            lag_min=l.lag_min,
                            lag_p25_min=l.lag_p25_min,
                            lag_p75_min=l.lag_p75_min,
                            trigger_stage_ft=l.trigger_stage_ft,
                            watch_stage_ft=l.watch_stage_ft,
                            n_storms=l.n_storms,
                            is_primary=l.is_primary,
                            relation=l.relation,
                            min_rise_ft_30m=l.min_rise_ft_30m,
                        )
                        for l in lnks
                    )
                    for cid, lnks in loso_models[sid].links.items()
                    if cid in tier_a_ids
                },
            )
            w_start = datetime.fromisoformat(meta["window"]["start"])
            w_end = datetime.fromisoformat(meta["window"]["end"])
            override_map = {gid: d_override for gid in delays_by_gauge}
            r_frames = await run_replay(
                readings_by_storm[sid],
                fold_model,
                window_start=w_start,
                window_end=w_end,
                delays=override_map,
                outages=outages_by_storm[sid],
            )
            m_frames = [MetricFrame(at=f.at, states=f.states) for f in r_frames]
            eps = episodes_from_frames(m_frames, "avoid")
            m_res = match_events(eps, onsets_by_storm[sid], fa_window_min=lambda _: 180)
            all_hits_d.extend(m_res.hits)
        med_d = (
            round(float(pd.Series([h.lead_min for h in all_hits_d]).median()), 1)
            if all_hits_d
            else None
        )
        delay_sensitivity.append({"delay_min": d_override, "median_lead_min": med_d})

    # Extract nearest_gauge_story (§18.12)
    up_by_key = {
        (r["storm_id"], r["crossing_id"], r["onset"]): r
        for r in methods_out["upstream_rule"]["avoid"]["per_crossing"]
    }
    ng_by_key = {
        (r["storm_id"], r["crossing_id"], r["onset"]): r
        for r in methods_out["nearest_gauge"]["avoid"]["per_crossing"]
    }
    nearest_story = None
    for key, up_row in sorted(up_by_key.items()):
        ng_row = ng_by_key.get(key)
        if up_row["lead_min"] is not None and (ng_row is None or ng_row["lead_min"] is None):
            nearest_story = {
                "storm_id": up_row["storm_id"],
                "crossing_id": up_row["crossing_id"],
                "onset": up_row["onset"],
                "upstream_first_alert_at": up_row["first_alert_at"],
                "upstream_lead_min": up_row["lead_min"],
                "nearest_gauge_lead_min": None,
                "explanation": (
                    "The upstream river-network gauge rose ahead of the flood wave and triggered an Avoid warning, "
                    "while the nearest straight-line gauge sits on an adjacent creek that missed the onset."
                ),
            }
            break

    pooled_up_avoid = methods_out["upstream_rule"]["avoid"]["pooled"]
    results_doc: dict[str, Any] = {
        "schema": "fordcast.results.v1",
        "generated_by": {
            "command": "uv run --project backend python tools/build_replays.py",
            "git_sha": git_sha,
            "model_version": live_version,
            "data_manifest_sha256": hashlib.sha256(
                json.dumps(
                    {
                        m["id"]: hashlib.sha256(
                            (data_dir / "storms" / m["id"] / "readings.parquet").read_bytes()
                        ).hexdigest()
                        for m in storm_metas
                    },
                    sort_keys=True,
                ).encode()
            ).hexdigest(),
            "latency_sha256": latency_sha,
            "python": "3.13",
            "hero_rule": f"tools/select_hero.py@{git_sha}",
        },
        "assumptions": {
            "lead_window_min": 180,
            "tick_s": 300,
            "cv": "leave-one-storm-out",
            "delays_source": "data/latency/gauge_latency.json",
            "default_delay_min": 60,
            "data_delay_min": delays_by_gauge,
            "outages": [
                {
                    "storm_id": "halloween-2013",
                    "site": "USGS-08159000",
                    "start": "2013-10-31T11:15:00Z",
                    "end": "2013-10-31T13:45:00Z",
                }
            ],
            "calm_set": "oct-2018-control",
            "calm_days": control_days,
            "calm_scope": "36-hour smoke control; not the required 30-day calm evaluation",
            "calm_candidates": None,
            "calm_seed": None,
        },
        "storms": storm_summary_rows,
        "methods": {
            "upstream_rule": methods_out["upstream_rule"],
            "nearest_gauge": methods_out["nearest_gauge"],
            "ml": None,
            "reactive": {"median_lead_min": None, "status": "Not evaluated"},
        },
        "by_truth_quality": {
            "non_proxy": {
                "H": None,
                "M": None,
                "F": None,
                "pod": None,
                "far": None,
                "csi": None,
                "median_lead_min": None,
                "status": "No validated road-overtopping labels",
            },
            "proxy": pooled_up_avoid,
        },
        "delay_sensitivity": delay_sensitivity,
        "headline": {
            "method": "upstream_rule",
            "level": "avoid",
            "n_storms": len(storm_summary_rows),
            "pod": pooled_up_avoid["pod"],
            "far": pooled_up_avoid["far"],
            "csi": pooled_up_avoid["csi"],
            "median_lead_min": pooled_up_avoid["median_lead_min"],
            "labels": "gauge_flood_stage_proxy",
            "road_forecast_skill_verified": False,
        },
        "hero": None,
        "hero_by_storm": {},
        "examples": {"nearest_gauge_story": nearest_story},
    }

    return results_doc, loso_models, all_link_rows


def write_links_csv(path: Path, rows: Sequence[Mapping[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "crossing_id",
        "gauge_id",
        "model_version",
        "relation",
        "is_primary",
        "channel_dist_km",
        "euclid_km",
        "lag_min",
        "lag_p25_min",
        "lag_p75_min",
        "xcorr_r",
        "n_storms",
        "celerity_ms",
        "baseline_stage_ft",
        "trigger_stage_ft",
        "watch_stage_ft",
        "min_rise_ft_30m",
        "train_csi",
        "params_source",
        "needs_review",
        "calibration_kind",
        "distance_source",
        "topology_verified",
    ]
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        for r in sorted(
            rows, key=lambda x: (x["model_version"], x["crossing_id"], x["relation"], x["gauge_id"])
        ):
            writer.writerow({k: r.get(k) for k in fieldnames})


def render_results_markdown(results: Mapping[str, Any]) -> str:
    up = results["methods"]["upstream_rule"]["avoid"]["pooled"]
    ng = results["methods"]["nearest_gauge"]["avoid"]["pooled"]
    watch = results["methods"]["upstream_rule"]["watch"]["pooled"]
    hero = results.get("hero")
    lines = [
        "# FordCast Out-of-Sample Backtest Results (`fordcast.results.v1`)",
        "",
        "> Generated deterministically by `uv run --project backend python tools/build_replays.py` using Leave-One-Storm-Out (LOSO) cross-validation",
        "> and frozen data-arrival latency (`data/latency/gauge_latency.json`, default 60 min delay).",
        "",
        "## Reference-Gauge Proxy Comparison — Not Road-Flooding Skill",
        "",
        "| Method | Level | Hits (H) | Misses (M) | False Alarms (F) | POD | FAR | CSI | Median Lead (min) |",
        "|---|---|---:|---:|---:|---:|---:|---:|---:|",
        f"| **Upstream Rule (FordCast)** | `AVOID` | {up['H']} | {up['M']} | {up['F']} | {up['pod']} | {up['far']} | {up['csi']} | {up['median_lead_min']} |",
        f"| **Nearest-Gauge Baseline** | `AVOID` | {ng['H']} | {ng['M']} | {ng['F']} | {ng['pod']} | {ng['far']} | {ng['csi']} | {ng['median_lead_min']} |",
        f"| **Upstream Rule (Watch)** | `WATCH` | {watch['H']} | {watch['M']} | {watch['F']} | {watch['pod']} | {watch['far']} | {watch['csi']} | {watch['median_lead_min']} |",
        "| **Reactive Closure (Reference)** | `CLOSED` | — | — | — | — | — | — | 0.0 |",
        "",
        "## Per-Storm Breakdown (`upstream_rule` at `AVOID`)",
        "",
        "| Storm ID | Hits | Misses | False Alarms | POD | FAR | CSI | Median Lead (min) |",
        "|---|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for srow in results["methods"]["upstream_rule"]["avoid"]["per_storm"]:
        lines.append(
            f"| `{srow['storm_id']}` | {srow['H']} | {srow['M']} | {srow['F']} | {srow['pod']} | {srow['far']} | {srow['csi']} | {srow['median_lead_min']} |"
        )
    lines.extend(
        [
            "",
            "## Data-Arrival Delay Sensitivity (`upstream_rule` at `AVOID`)",
            "",
            "| Assumed Delivery Delay (min) | Median Lead Time (min) |",
            "|---:|---:|",
        ]
    )
    for drow in results.get("delay_sensitivity", []):
        lines.append(f"| {drow['delay_min']} | {drow['median_lead_min']} |")

    if hero:
        lines.extend(
            [
                "",
                "## Deterministic Median-Lead Reference Example (`tools/select_hero.py`)",
                "",
                f"- **Rule:** {hero['rule']}",
                f"- **Selected Storm:** `{hero['storm_id']}`",
                f"- **Selected Crossing:** `{hero['crossing_id']}`",
                f"- **Lead Time:** `{hero['lead_min']} min` (overall median across storms: `{hero['target_median_lead_min']} min`)",
                f"- **First Alert At:** `{hero['first_alert_at']}` → **Onset At:** `{hero['onset']}`",
            ]
        )
    lines.extend(
        [
            "",
            "## Interpretation and scope",
            "",
            "All evaluated labels are downstream NOAA gauge-category threshold crossings (proxy cases). None establishes that a road flooded. Several cases share a gauge; they are not independent roads. Bootstrap intervals resample storms.",
            "",
            "Drawn lines are schematic corridor connectors, not NLDI flowlines. Candidate topology and channel distances are unverified. Only empirically calibrated links passing quality gates generate experimental states. Uncalibrated links remain Unknown.",
            "",
            f"Calm exposure: {results['assumptions']['calm_days']} days from the bundled control timestamps. This is a 36-hour smoke control, not a 30-day calm evaluation. Separate Tier-B calm rates and reactive-baseline results are not evaluated (null).",
            "",
            "Road-level forecast performance, live operation, native-device behavior and human translation/accessibility acceptance remain unverified.",
        ]
    )
    return "\n".join(lines) + "\n"
