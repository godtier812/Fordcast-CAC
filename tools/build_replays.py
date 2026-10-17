"""Build crossing tiers, LOSO backtest results, and deterministic fordcast.replay.v1 timelines (§17–§19)."""

import asyncio
import csv
import hashlib
import json
import math
import sys
import tomllib
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from fordcast.domain import Crossing, Gauge
from fordcast.replay.build import build_replay_document, iso_z, serialize_replay
from fordcast.scoring.backtest import (
    LinkSpec,
    load_storm_readings,
    render_results_markdown,
    run_loso_backtest,
    write_links_csv,
)
from fordcast.scoring.labels import load_truth_episodes
from fordcast.sources.replay import Outage
from select_hero import compute_heroes

TIER_A_CONFIG: dict[str, dict[str, Any]] = {
    "atx-19": {
        "creek": "Onion Creek",
        "road": "E. William Cannon Dr",
        "target_gauge_id": "USGS-08159000",
        "overtop_stage_ft": 17.0,
        "truth_quality": "impact_statement",
        "truth_source": "NWS NWPS ATIT2 minor flood stage 17.0 ft (low street crossings on Onion Creek)",
        "upstream": [
            ("USGS-08158970", 6.2),
            ("USGS-08158860", 18.4),
            ("USGS-08158700", 38.2),
        ],
        "nearest_baseline": ("USGS-08158840", 14.0),
    },
    "atx-20": {
        "creek": "Onion Creek",
        "road": "E. William Cannon Dr",
        "target_gauge_id": "USGS-08159000",
        "overtop_stage_ft": 22.0,
        "truth_quality": "impact_statement",
        "truth_source": "NWS NWPS ATIT2 moderate flood approach 22.0 ft (Onion Creek low corridor)",
        "upstream": [
            ("USGS-08158970", 6.2),
            ("USGS-08158860", 18.4),
            ("USGS-08158700", 38.2),
        ],
        "nearest_baseline": ("USGS-08158840", 14.0),
    },
    "atx-21": {
        "creek": "Onion Creek",
        "road": "E. William Cannon Dr",
        "target_gauge_id": "USGS-08159000",
        "overtop_stage_ft": 27.0,
        "truth_quality": "impact_statement",
        "truth_source": "NWS NWPS ATIT2 @ 27.0 ft: 6100 block of East William Cannon Drive flooded",
        "upstream": [
            ("USGS-08158970", 6.2),
            ("USGS-08158860", 18.4),
            ("USGS-08158700", 38.2),
        ],
        "nearest_baseline": ("USGS-08158840", 14.0),
    },
    "atx-7": {
        "creek": "Williamson Creek",
        "road": "Wasson Rd",
        "target_gauge_id": "USGS-08158970",
        "overtop_stage_ft": 15.5,
        "truth_quality": "gauge",
        "truth_source": "COA FEWS LWC gate 6500 / USGS-08158970 Williamson Creek overbank stage 15.5 ft",
        "upstream": [("USGS-08158930", 8.5), ("USGS-08158920", 16.7)],
        "nearest_baseline": ("USGS-08158860", 6.8),
    },
    "atx-8": {
        "creek": "Williamson Creek",
        "road": "Wasson Rd",
        "target_gauge_id": "USGS-08158970",
        "overtop_stage_ft": 16.0,
        "truth_quality": "gauge",
        "truth_source": "COA FEWS LWC gate 6510 / USGS-08158970 Williamson Creek overbank stage 16.0 ft",
        "upstream": [("USGS-08158930", 8.5), ("USGS-08158920", 16.7)],
        "nearest_baseline": ("USGS-08158860", 6.8),
    },
    "atx-15": {
        "creek": "Williamson Creek",
        "road": "Joe Tanner Ln",
        "target_gauge_id": "USGS-08158930",
        "overtop_stage_ft": 13.0,
        "truth_quality": "impact_statement",
        "truth_source": "NWS NWPS AAIT2 minor flood stage 13.0 ft (Williamson Creek flood plain)",
        "upstream": [("USGS-08158920", 8.2)],
        "nearest_baseline": ("USGS-08158840", 5.2),
    },
    "atx-16": {
        "creek": "Williamson Creek",
        "road": "Joe Tanner Ln",
        "target_gauge_id": "USGS-08158930",
        "overtop_stage_ft": 14.0,
        "truth_quality": "impact_statement",
        "truth_source": "NWS NWPS AAIT2 moderate flood stage 14.0 ft (Williamson Creek flood plain)",
        "upstream": [("USGS-08158920", 8.2)],
        "nearest_baseline": ("USGS-08158840", 5.2),
    },
    "tc-133": {
        "creek": "Slaughter Creek",
        "road": "Slaughter Creek Dr",
        "target_gauge_id": "USGS-08158860",
        "overtop_stage_ft": 9.0,
        "truth_quality": "impact_statement",
        "truth_source": "NWS NWPS SCAT2/SLHT2 @ 9.0 ft: Moderate lowland flooding covers Slaughter Creek crossing",
        "upstream": [("USGS-08158840", 10.4)],
        "nearest_baseline": ("USGS-08158827", 4.5),
    },
    "tc-167": {
        "creek": "Barton Creek",
        "road": "Henry Marx Ln",
        "target_gauge_id": "USGS-08155300",
        "overtop_stage_ft": 11.0,
        "truth_quality": "impact_statement",
        "truth_source": "NWS NWPS ABTT2 @ 11.0 ft: Minor lowland flooding reaches lowest secondary roads and bridges",
        "upstream": [("USGS-08155240", 8.4), ("USGS-08155200", 19.6)],
        "nearest_baseline": ("USGS-08158920", 4.8),
    },
    "atx-3": {
        "creek": "Walnut Creek",
        "road": "O'Neal Ln",
        "target_gauge_id": "USGS-08158600",
        "overtop_stage_ft": 20.0,
        "truth_quality": "gauge",
        "truth_source": "COA FEWS LWC gate 6300 / USGS-08158600 Walnut Creek overbank road stage 20.0 ft",
        "upstream": [("USGS-08158380", 12.5), ("USGS-08158200", 14.8)],
        "nearest_baseline": ("USGS-08154700", 8.5),
    },
    "atx-12": {
        "creek": "Walnut Creek",
        "road": "Waters Park Rd",
        "target_gauge_id": "USGS-08158600",
        "overtop_stage_ft": 21.0,
        "truth_quality": "gauge",
        "truth_source": "COA FEWS LWC gate 6710 / USGS-08158600 Walnut Creek overbank road stage 21.0 ft",
        "upstream": [("USGS-08158380", 12.5), ("USGS-08158200", 14.8)],
        "nearest_baseline": ("USGS-08154700", 8.5),
    },
    "atx-13": {
        "creek": "Walnut Creek",
        "road": "Adelphi Ln",
        "target_gauge_id": "USGS-08158600",
        "overtop_stage_ft": 22.0,
        "truth_quality": "gauge",
        "truth_source": "COA FEWS LWC gate 6200 / USGS-08158600 Walnut Creek overbank road stage 22.0 ft",
        "upstream": [("USGS-08158380", 12.5), ("USGS-08158200", 14.8)],
        "nearest_baseline": ("USGS-08154700", 8.5),
    },
}

TIER_B_CONFIG: dict[str, dict[str, Any]] = {
    "tc-128": {
        "creek": "Onion Creek",
        "road": "Ross Rd",
        "upstream": [("USGS-08159000", 6.0)],
    },
    "atx-1": {
        "creek": "Williamson Creek",
        "road": "Old Bee Caves Rd",
        "upstream": [("USGS-08158920", 3.5)],
    },
    "atx-2": {
        "creek": "Williamson Creek",
        "road": "Old Bee Caves Rd",
        "upstream": [("USGS-08158920", 3.5)],
    },
    "tc-99": {
        "creek": "Williamson Creek",
        "road": "Mowinkle Dr",
        "upstream": [("USGS-08158920", 4.5)],
    },
    "tc-121": {
        "creek": "Williamson Creek",
        "road": "Pitter Pat Ln",
        "upstream": [("USGS-08158920", 5.0)],
    },
    "tc-155": {
        "creek": "Williamson Creek",
        "road": "Wier Loop",
        "upstream": [("USGS-08158920", 5.5)],
    },
    "tc-157": {
        "creek": "Williamson Creek",
        "road": "Williamson Creek Dr",
        "upstream": [("USGS-08158920", 5.2)],
    },
    "atx-4": {
        "creek": "Bull Creek",
        "road": "Spicewood Springs Rd",
        "upstream": [("USGS-08154700", 4.2)],
    },
    "atx-5": {
        "creek": "Bull Creek",
        "road": "Spicewood Springs Rd",
        "upstream": [("USGS-08154700", 3.8)],
    },
    "atx-6": {
        "creek": "Bull Creek",
        "road": "Spicewood Springs Rd",
        "upstream": [("USGS-08154700", 5.2)],
    },
    "atx-9": {
        "creek": "Bull Creek",
        "road": "Old Spicewood Springs Rd",
        "upstream": [("USGS-08154700", 3.6)],
    },
    "atx-10": {
        "creek": "Bull Creek",
        "road": "Old Spicewood Springs Rd",
        "upstream": [("USGS-08154700", 3.6)],
    },
    "atx-11": {
        "creek": "Bull Creek",
        "road": "Old Spicewood Springs Rd",
        "upstream": [("USGS-08154700", 3.6)],
    },
    "atx-17": {
        "creek": "Bull Creek",
        "road": "Lakewood Dr",
        "upstream": [("USGS-08154700", 1.2)],
    },
    "atx-18": {
        "creek": "Bull Creek",
        "road": "Lakewood Dr",
        "upstream": [("USGS-08154700", 1.2)],
    },
    "atx-14": {
        "creek": "Walnut Creek",
        "road": "Adelphi Ln",
        "upstream": [("USGS-08158380", 12.5)],
    },
    "atx-22": {
        "creek": "Walnut Creek",
        "road": "Waters Park Rd",
        "upstream": [("USGS-08158380", 12.5)],
    },
    "tc-58": {
        "creek": "Bear Creek",
        "road": "Fritz Hughes Park Rd",
        "upstream": [("USGS-08158810", 6.5)],
    },
}


def _euclid_km(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    dx = (lon2 - lon1) * 111.32 * math.cos(math.radians((lat1 + lat2) / 2.0))
    dy = (lat2 - lat1) * 110.57
    return round(math.hypot(dx, dy), 2)


def _make_flowline(
    glon: float, glat: float, clon: float, clat: float
) -> list[tuple[float, float]]:
    mid_lon = round((glon + clon) / 2.0 + 0.002, 5)
    mid_lat = round((glat + clat) / 2.0 - 0.0015, 5)
    return [
        (round(glon, 5), round(glat, 5)),
        (mid_lon, mid_lat),
        (round(clon, 5), round(clat, 5)),
    ]


def write_json(path: Path, obj: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


async def main() -> None:
    gauges_fc = json.loads(
        (ROOT / "data/seed/gauges.geojson").read_text(encoding="utf-8")
    )
    gauge_meta_by_id: dict[str, dict[str, Any]] = {}
    nws_action_by_gauge: dict[str, float | None] = {}
    for gf in gauges_fc["features"]:
        gid = gf["properties"]["id"]
        lon, lat = gf["geometry"]["coordinates"][:2]
        cats = gf["properties"].get("nws_categories")
        gauge_meta_by_id[gid] = {
            "id": gid,
            "name": gf["properties"]["name"],
            "lon": float(lon),
            "lat": float(lat),
            "nws_lid": gf["properties"].get("nws_lid"),
            "nws_categories": cats,
        }
        nws_action_by_gauge[gid] = (
            float(cats["action"])
            if isinstance(cats, dict) and cats.get("action")
            else None
        )

    # Build enriched crossings.geojson from raw city-arcgis and travis-arcgis
    features = []
    for source, prefix, name_key, id_key, attribution, jurisdiction in (
        (
            "city-arcgis",
            "atx",
            "CROSSING_DESCRIPTION",
            "OBJECTID",
            "City of Austin Open Data",
            "City of Austin",
        ),
        (
            "travis-arcgis",
            "tc",
            "Locations",
            "OID",
            "Travis County Public Works",
            "Travis County",
        ),
    ):
        raw_path = ROOT / f"data/raw/smoke/{source}.json"
        raw = json.loads(raw_path.read_text(encoding="utf-8"))
        for row in raw.get("features", []):
            p, geom = row["properties"], row["geometry"]
            if geom is None or geom["type"] != "Point" or not p.get(name_key):
                continue
            lon, lat = geom["coordinates"][:2]
            if not (-98.2 <= lon <= -97.4 and 29.95 <= lat <= 30.7):
                continue
            cid = f"{prefix}-{p[id_key]}"
            name = str(p[name_key]).strip()
            if cid in TIER_A_CONFIG:
                cfg = TIER_A_CONFIG[cid]
                props = {
                    "id": cid,
                    "name": name,
                    "name_es": name,
                    "road": cfg["road"],
                    "creek": cfg["creek"],
                    "jurisdiction": jurisdiction,
                    "tier": "A",
                    "target_gauge_id": cfg["target_gauge_id"],
                    "overtop_stage_ft": cfg["overtop_stage_ft"],
                    "truth_quality": cfg["truth_quality"],
                    "truth_source": cfg["truth_source"],
                    "source": attribution,
                    "source_id": str(p[id_key]),
                    "source_ref": f"data/raw/smoke/{source}.json",
                    "state": "no_rise",
                    "review_status": "verified",
                    "reason": "UPSTREAM_MONITORED",
                    "inventory_version": "inv-20261017",
                }
            elif cid in TIER_B_CONFIG:
                cfg = TIER_B_CONFIG[cid]
                props = {
                    "id": cid,
                    "name": name,
                    "name_es": name,
                    "road": cfg["road"],
                    "creek": cfg["creek"],
                    "jurisdiction": jurisdiction,
                    "tier": "B",
                    "target_gauge_id": None,
                    "overtop_stage_ft": None,
                    "truth_quality": None,
                    "truth_source": None,
                    "source": attribution,
                    "source_id": str(p[id_key]),
                    "source_ref": f"data/raw/smoke/{source}.json",
                    "state": "no_rise",
                    "review_status": "verified",
                    "reason": "UPSTREAM_MONITORED",
                    "inventory_version": "inv-20261017",
                }
            else:
                props = {
                    "id": cid,
                    "name": name,
                    "name_es": name,
                    "road": name.split("@")[0].strip() if "@" in name else name,
                    "creek": name.split("@")[1].strip() if "@" in name else None,
                    "jurisdiction": jurisdiction,
                    "tier": "C",
                    "target_gauge_id": None,
                    "overtop_stage_ft": None,
                    "truth_quality": None,
                    "truth_source": None,
                    "source": attribution,
                    "source_id": str(p[id_key]),
                    "source_ref": f"data/raw/smoke/{source}.json",
                    "state": "unknown",
                    "review_status": "unreviewed",
                    "reason": "NO_UPSTREAM_GAUGE",
                    "inventory_version": "inv-20261017",
                }
            features.append({"type": "Feature", "geometry": geom, "properties": props})

    features.sort(key=lambda f: f["properties"]["id"])
    write_json(
        ROOT / "data/seed/crossings.geojson",
        {"type": "FeatureCollection", "features": features},
    )

    # Write data/overrides/overtop_stages.csv (§17.6)
    overtop_csv = ROOT / "data/overrides/overtop_stages.csv"
    overtop_csv.parent.mkdir(parents=True, exist_ok=True)
    with overtop_csv.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=[
                "crossing_id",
                "gauge_id",
                "overtop_stage_ft",
                "truth_quality",
                "truth_source",
                "confirmed_by",
                "date",
            ],
        )
        writer.writeheader()
        for cid, cfg in sorted(TIER_A_CONFIG.items()):
            writer.writerow(
                {
                    "crossing_id": cid,
                    "gauge_id": cfg["target_gauge_id"],
                    "overtop_stage_ft": cfg["overtop_stage_ft"],
                    "truth_quality": cfg["truth_quality"],
                    "truth_source": cfg["truth_source"],
                    "confirmed_by": "NWPS/COA archive verification",
                    "date": "2026-10-17",
                }
            )

    # Build Crossing domain objects, LinkSpecs, and data/creeks/creeks.geojson
    crossings_domain: list[Crossing] = []
    crossing_meta_by_id: dict[str, dict[str, Any]] = {}
    link_specs: list[LinkSpec] = []
    link_meta_by_pair: dict[tuple[str, str], dict[str, Any]] = {}
    creeks_features: list[dict[str, Any]] = []

    for f in features:
        p = f["properties"]
        cid = p["id"]
        clon, clat = f["geometry"]["coordinates"][:2]
        crossing_meta_by_id[cid] = {**p, "lon": float(clon), "lat": float(clat)}
        tgt_gid = p.get("target_gauge_id")
        tgt_gauge = Gauge(id=tgt_gid, stale_after_min=80) if tgt_gid else None
        crossings_domain.append(
            Crossing(
                id=cid,
                name=p["name"],
                lon=float(clon),
                lat=float(clat),
                tier=p["tier"],
                target_gauge=tgt_gauge,
                overtop_stage_ft=float(p["overtop_stage_ft"])
                if p.get("overtop_stage_ft") is not None
                else None,
            )
        )

        if cid in TIER_A_CONFIG:
            cfg = TIER_A_CONFIG[cid]
            for gid, ch_km in cfg["upstream"]:
                gm = gauge_meta_by_id[gid]
                fl = _make_flowline(gm["lon"], gm["lat"], float(clon), float(clat))
                ekm = _euclid_km(gm["lon"], gm["lat"], float(clon), float(clat))
                link_specs.append(LinkSpec(cid, gid, "upstream", float(ch_km), ekm, fl))
                link_meta_by_pair[(cid, gid)] = {
                    "channel_dist_km": float(ch_km),
                    "flowline": [list(pt) for pt in fl],
                }
                creeks_features.append(
                    {
                        "type": "Feature",
                        "geometry": {
                            "type": "LineString",
                            "coordinates": [list(pt) for pt in fl],
                        },
                        "properties": {
                            "reach_id": f"{cid}__{gid}",
                            "crossing_id": cid,
                            "gauge_id": gid,
                            "relation": "upstream",
                        },
                    }
                )
            ng_id, ng_km = cfg["nearest_baseline"]
            ngm = gauge_meta_by_id[ng_id]
            nfl = _make_flowline(ngm["lon"], ngm["lat"], float(clon), float(clat))
            nekm = _euclid_km(ngm["lon"], ngm["lat"], float(clon), float(clat))
            link_specs.append(
                LinkSpec(cid, ng_id, "nearest_baseline", float(ng_km), nekm, nfl)
            )
        elif cid in TIER_B_CONFIG:
            cfg = TIER_B_CONFIG[cid]
            for gid, ch_km in cfg["upstream"]:
                gm = gauge_meta_by_id[gid]
                fl = _make_flowline(gm["lon"], gm["lat"], float(clon), float(clat))
                ekm = _euclid_km(gm["lon"], gm["lat"], float(clon), float(clat))
                link_specs.append(LinkSpec(cid, gid, "upstream", float(ch_km), ekm, fl))
                link_meta_by_pair[(cid, gid)] = {
                    "channel_dist_km": float(ch_km),
                    "flowline": [list(pt) for pt in fl],
                }
                creeks_features.append(
                    {
                        "type": "Feature",
                        "geometry": {
                            "type": "LineString",
                            "coordinates": [list(pt) for pt in fl],
                        },
                        "properties": {
                            "reach_id": f"{cid}__{gid}",
                            "crossing_id": cid,
                            "gauge_id": gid,
                            "relation": "upstream",
                        },
                    }
                )

    creeks_features.sort(key=lambda x: x["properties"]["reach_id"])
    write_json(
        ROOT / "data/creeks/creeks.geojson",
        {"type": "FeatureCollection", "features": creeks_features},
    )

    # Run LOSO backtest
    monitored_crossings = [c for c in crossings_domain if c.tier in {"A", "B"}]
    results_doc, loso_models, link_rows = await run_loso_backtest(
        ROOT / "data",
        monitored_crossings,
        TIER_A_CONFIG,
        link_specs,
        nws_action_by_gauge,
        git_sha="fd9407c",
    )

    # Apply pre-registered hero rule (§18.13)
    hero, hero_by_storm = compute_heroes(results_doc)
    results_doc["hero"] = hero
    results_doc["hero_by_storm"] = hero_by_storm

    results_path = ROOT / "docs/results/results.json"
    write_json(results_path, results_doc)
    results_sha = hashlib.sha256(results_path.read_bytes()).hexdigest()
    (ROOT / "docs/results/results.md").write_text(
        render_results_markdown(results_doc), encoding="utf-8"
    )
    write_links_csv(ROOT / "data/links/crossing_gauge_links.csv", link_rows)
    print(
        f"LOSO backtest complete: headline POD={results_doc['headline']['pod']}, "
        f"FAR={results_doc['headline']['far']}, CSI={results_doc['headline']['csi']}, "
        f"median_lead={results_doc['headline']['median_lead_min']} min, hero={hero}"
    )

    # Build bundled Storm Replay timelines (§19.11, §19.14)
    latency_bytes = (ROOT / "data/latency/gauge_latency.json").read_bytes()
    latency_sha = hashlib.sha256(latency_bytes).hexdigest()
    latency_doc = json.loads(latency_bytes.decode("utf-8"))
    delays_by_gauge = {
        gid: int(info.get("delay_min", 60))
        for gid, info in latency_doc.get("gauges", {}).items()
    }

    replays_dir = ROOT / "data/replays"
    replays_dir.mkdir(parents=True, exist_ok=True)
    server_replays_dir = ROOT / "backend/fordcast/replay/data"
    server_replays_dir.mkdir(parents=True, exist_ok=True)

    storm_dirs = sorted(
        (
            p
            for p in (ROOT / "data/storms").iterdir()
            if p.is_dir() and (p / "meta.toml").exists()
        ),
        key=lambda p: tomllib.loads((p / "meta.toml").read_text(encoding="utf-8")).get(
            "catalog_order", 99
        ),
    )

    generated_at = "2026-10-17T23:15:00Z"
    index_entries: list[dict[str, Any]] = []
    first_replay_doc: dict[str, Any] | None = None

    up_avoid_by_storm = {
        r["storm_id"]: r
        for r in results_doc["methods"]["upstream_rule"]["avoid"]["per_storm"]
    }
    ng_avoid_by_storm = {
        r["storm_id"]: r
        for r in results_doc["methods"]["nearest_gauge"]["avoid"]["per_storm"]
    }
    up_watch_by_storm = {
        r["storm_id"]: r
        for r in results_doc["methods"]["upstream_rule"]["watch"]["per_storm"]
    }

    for sdir in storm_dirs:
        meta = tomllib.loads((sdir / "meta.toml").read_text(encoding="utf-8"))
        if not meta.get("bundle", False):
            continue
        sid = str(meta["id"])
        readings = load_storm_readings(sdir / "readings.parquet")
        outages = [
            Outage(
                gauge_id=o["site"],
                start=datetime.fromisoformat(o["start"]),
                end=datetime.fromisoformat(o["end"]),
                source=o["source"],
            )
            for o in meta.get("outages", [])
        ]
        truth_eps = load_truth_episodes(ROOT / "data", [sid])
        truth_rows = [
            {
                "crossing_id": ep.crossing_id,
                "onset": iso_z(ep.onset),
                "end": iso_z(ep.end),
                "quality": ep.quality,
                "censored": ep.censored,
            }
            for ep in truth_eps
        ]
        s_up = up_avoid_by_storm[sid]
        s_ng = ng_avoid_by_storm[sid]
        s_w = up_watch_by_storm[sid]
        n_ev = int(s_up["H"]) + int(s_up["M"])
        metrics_block = {
            "method": "upstream_rule",
            "level": "avoid",
            "pod": s_up["pod"],
            "far": s_up["far"],
            "csi": s_up["csi"],
            "median_lead_min": s_up["median_lead_min"],
            "n_events": n_ev,
            "comparators": {
                "nearest_gauge": {
                    "pod": s_ng["pod"],
                    "far": s_ng["far"],
                    "csi": s_ng["csi"],
                    "median_lead_min": s_ng["median_lead_min"],
                    "n_events": int(s_ng["H"]) + int(s_ng["M"]),
                },
                "watch_level": {
                    "pod": s_w["pod"],
                    "far": s_w["far"],
                    "csi": s_w["csi"],
                    "median_lead_min": s_w["median_lead_min"],
                    "n_events": int(s_w["H"]) + int(s_w["M"]),
                },
            },
        }
        storm_meta = {
            "id": sid,
            "name_en": meta["name_en"],
            "name_es": meta["name_es"],
            "start": meta["window"]["start"],
            "end": meta["window"]["end"],
            "headline_event": meta.get("headline_event"),
            "description_en": meta.get("notes"),
            "description_es": meta.get("notes"),
        }
        pipeline_meta = {
            "git_sha": "fd9407c",
            "model_version": f"rule-loso-{sid}",
            "data_sha256": str(meta["data_sha256"]),
            "latency_sha256": latency_sha,
            "results_sha256": results_sha,
            "generated_at": generated_at,
        }
        doc = await build_replay_document(
            storm_meta=storm_meta,
            readings=readings,
            model=loso_models[sid],
            gauge_meta_by_id=gauge_meta_by_id,
            crossing_meta_by_id=crossing_meta_by_id,
            link_meta_by_pair=link_meta_by_pair,
            delays=delays_by_gauge,
            outages=outages,
            truth_rows=truth_rows,
            metrics_block=metrics_block,
            hero_block=hero_by_storm.get(sid),
            pipeline_meta=pipeline_meta,
        )
        canonical_bytes, gz_bytes, timeline_sha, content_sha, file_sha = (
            serialize_replay(doc)
        )
        if first_replay_doc is None:
            first_replay_doc = doc

        gz_file = f"{sid}.json.gz"
        (replays_dir / gz_file).write_bytes(gz_bytes)
        (replays_dir / f"{sid}.json").write_bytes(canonical_bytes)
        (server_replays_dir / gz_file).write_bytes(gz_bytes)

        index_entries.append(
            {
                "id": sid,
                "name_en": meta["name_en"],
                "name_es": meta["name_es"],
                "start": meta["window"]["start"],
                "end": meta["window"]["end"],
                "file": gz_file,
                "bytes_gz": len(gz_bytes),
                "generated_at": generated_at,
                "timeline_sha256": timeline_sha,
                "content_sha256": content_sha,
                "file_sha256": file_sha,
                "model_version": f"rule-loso-{sid}",
                "featured": bool(hero and hero.get("storm_id") == sid),
                "sort_order": int(meta["catalog_order"]),
                "median_lead_min": s_up["median_lead_min"],
                "n_crossings": len(monitored_crossings),
            }
        )
        print(
            f"Built replay {sid}: {len(gz_bytes)} bytes gz, events={len(doc['events'])}, "
            f"pulses={len(doc['pulses'])}, storyboard={len(doc['storyboard'])}"
        )

    hero_storm_id = hero["storm_id"] if hero else None
    replay_index = {
        "schema": "fordcast.replay-index.v1",
        "generated_at": generated_at,
        "hero_storm_id": hero_storm_id,
        "storms": index_entries,
    }
    write_json(replays_dir / "index.json", replay_index)
    write_json(server_replays_dir / "index.json", replay_index)

    if first_replay_doc is not None:
        write_json(ROOT / "docs/schemas/replay.v1.example.json", first_replay_doc)


if __name__ == "__main__":
    asyncio.run(main())
