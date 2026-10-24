"""Build crossing tiers, LOSO backtest results, and deterministic fordcast.replay.v1 timelines (§17–§19)."""

import csv
import hashlib
import json
import math
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import tomllib

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from fordcast.domain import Crossing, Gauge
from fordcast.linking.geography import distance_km, nearest_gauge
from fordcast.replay.build import build_replay_document, iso_z, serialize_replay
from fordcast.replay.offline import run_offline
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

REFERENCE_CANDIDATES: dict[str, dict[str, Any]] = {
    "atx-19": {
        "creek": "Onion Creek",
        "road": "E. William Cannon Dr",
        "target_gauge_id": "USGS-08159000",
        "category": "minor",
        "upstream": [
            ("USGS-08158970", 6.2),
            ("USGS-08158860", 18.4),
            ("USGS-08158700", 38.2),
        ],
    },
    "atx-20": {
        "creek": "Onion Creek",
        "road": "E. William Cannon Dr",
        "target_gauge_id": "USGS-08159000",
        "category": "moderate",
        "upstream": [
            ("USGS-08158970", 6.2),
            ("USGS-08158860", 18.4),
            ("USGS-08158700", 38.2),
        ],
    },
    "atx-21": {
        "creek": "Onion Creek",
        "road": "E. William Cannon Dr",
        "target_gauge_id": "USGS-08159000",
        "category": "major",
        "upstream": [
            ("USGS-08158970", 6.2),
            ("USGS-08158860", 18.4),
            ("USGS-08158700", 38.2),
        ],
    },
    "atx-7": {
        "creek": "Williamson Creek",
        "road": "Wasson Rd",
        "target_gauge_id": "USGS-08158970",
        "category": "minor",
        "upstream": [("USGS-08158930", 8.5), ("USGS-08158920", 16.7)],
    },
    "atx-8": {
        "creek": "Williamson Creek",
        "road": "Wasson Rd",
        "target_gauge_id": "USGS-08158970",
        "category": "minor",
        "upstream": [("USGS-08158930", 8.5), ("USGS-08158920", 16.7)],
    },
    "atx-15": {
        "creek": "Williamson Creek",
        "road": "Joe Tanner Ln",
        "target_gauge_id": "USGS-08158930",
        "category": "minor",
        "upstream": [("USGS-08158920", 8.2)],
    },
    "atx-16": {
        "creek": "Williamson Creek",
        "road": "Joe Tanner Ln",
        "target_gauge_id": "USGS-08158930",
        "category": "moderate",
        "upstream": [("USGS-08158920", 8.2)],
    },
    "tc-133": {
        "creek": "Slaughter Creek",
        "road": "Slaughter Creek Dr",
        "target_gauge_id": "USGS-08158860",
        "category": "minor",
        "upstream": [("USGS-08158840", 10.4)],
    },
    "tc-167": {
        "creek": "Barton Creek",
        "road": "Henry Marx Ln",
        "target_gauge_id": "USGS-08155300",
        "category": "moderate",
        "upstream": [("USGS-08155240", 8.4), ("USGS-08155200", 19.6)],
    },
    "atx-3": {
        "creek": "Walnut Creek",
        "road": "O'Neal Ln",
        "target_gauge_id": "USGS-08158600",
        "category": "minor",
        "upstream": [("USGS-08158380", 12.5), ("USGS-08158200", 14.8)],
    },
    "atx-12": {
        "creek": "Walnut Creek",
        "road": "Waters Park Rd",
        "target_gauge_id": "USGS-08158600",
        "category": "minor",
        "upstream": [("USGS-08158380", 12.5), ("USGS-08158200", 14.8)],
    },
    "atx-13": {
        "creek": "Walnut Creek",
        "road": "Adelphi Ln",
        "target_gauge_id": "USGS-08158600",
        "category": "minor",
        "upstream": [("USGS-08158380", 12.5), ("USGS-08158200", 14.8)],
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


def schematic_connector(
    glon: float, glat: float, clon: float, clat: float
) -> list[tuple[float, float]]:
    return [
        (round(glon, 5), round(glat, 5)),
        (round(clon, 5), round(clat, 5)),
    ]


def write_json(path: Path, obj: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


async def build(git_sha: str, working_tree_dirty: bool) -> None:
    source_files = sorted((ROOT / "backend/fordcast").rglob("*.py")) + [
        Path(__file__),
        ROOT / "tools/select_hero.py",
    ]
    source_sha = hashlib.sha256(
        b"".join(
            str(p.relative_to(ROOT)).replace("\\", "/").encode()
            + hashlib.sha256(p.read_bytes()).digest()
            for p in source_files
        )
    ).hexdigest()
    references = json.loads((ROOT / "data/reference/gauge-categories.json").read_text())
    for cfg in REFERENCE_CANDIDATES.values():
        source = references[cfg["target_gauge_id"]]
        stage = source["categories"].get(cfg["category"], {}).get("stage")
        cfg["reference_stage_ft"] = (
            float(stage) if stage is not None and stage > -999 else None
        )
        cfg["truth_quality"] = "proxy"
        cfg["truth_source"] = (
            f"NOAA NWPS {source['nws_lid']} {cfg['category']} category ({source['url']}) — corridor proxy; road-deck elevation unverified"
        )
        cfg["reference_source_url"] = source["url"]
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
            if cid in REFERENCE_CANDIDATES:
                cfg = REFERENCE_CANDIDATES[cid]
                props = {
                    "id": cid,
                    "name": name,
                    "name_es": name,
                    "road": cfg["road"],
                    "creek": cfg["creek"],
                    "jurisdiction": jurisdiction,
                    "tier": "B",
                    "target_gauge_id": cfg["target_gauge_id"],
                    "overtop_stage_ft": None,
                    "reference_stage_ft": cfg["reference_stage_ft"],
                    "reference_source_url": cfg["reference_source_url"],
                    "reference_kind": "gauge_flood_stage_proxy"
                    if cfg["reference_stage_ft"] is not None
                    else "unavailable",
                    "truth_quality": cfg["truth_quality"],
                    "truth_source": cfg["truth_source"],
                    "source": attribution,
                    "source_id": str(p[id_key]),
                    "source_ref": f"data/raw/smoke/{source}.json",
                    "state": "unknown",
                    "review_status": "unverified_road_and_topology",
                    "reason": "RESEARCH_CANDIDATE",
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
                    "state": "unknown",
                    "review_status": "unverified_road_and_topology",
                    "reason": "RESEARCH_CANDIDATE",
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
    reference_path = ROOT / "data/reference/crossing_reference_stages.json"
    write_json(
        reference_path,
        [
            {
                "crossing_id": cid,
                "gauge_id": cfg["target_gauge_id"],
                "stage_ft": cfg["reference_stage_ft"],
                "category": cfg["category"],
                "source_url": cfg["reference_source_url"],
                "road_transfer_verified": False,
                "source": cfg["truth_source"],
            }
            for cid, cfg in sorted(REFERENCE_CANDIDATES.items())
        ],
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
                reference_stage_ft=p.get("reference_stage_ft"),
                overtop_stage_ft=float(p["overtop_stage_ft"])
                if p.get("overtop_stage_ft") is not None
                else None,
            )
        )

        if cid in REFERENCE_CANDIDATES:
            cfg = REFERENCE_CANDIDATES[cid]
            for gid, ch_km in cfg["upstream"]:
                gm = gauge_meta_by_id[gid]
                fl = schematic_connector(gm["lon"], gm["lat"], float(clon), float(clat))
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
                            "geometry_source": "schematic_corridor_connector",
                            "topology_verified": False,
                        },
                    }
                )
            ng_id = nearest_gauge(float(clon), float(clat), gauge_meta_by_id)
            ng_km = distance_km(
                (float(clon), float(clat)),
                (gauge_meta_by_id[ng_id]["lon"], gauge_meta_by_id[ng_id]["lat"]),
            )
            ngm = gauge_meta_by_id[ng_id]
            nfl = schematic_connector(ngm["lon"], ngm["lat"], float(clon), float(clat))
            nekm = _euclid_km(ngm["lon"], ngm["lat"], float(clon), float(clat))
            link_specs.append(
                LinkSpec(cid, ng_id, "nearest_baseline", float(ng_km), nekm, nfl)
            )
        elif cid in TIER_B_CONFIG:
            cfg = TIER_B_CONFIG[cid]
            for gid, ch_km in cfg["upstream"]:
                gm = gauge_meta_by_id[gid]
                fl = schematic_connector(gm["lon"], gm["lat"], float(clon), float(clat))
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
                            "geometry_source": "schematic_corridor_connector",
                            "topology_verified": False,
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
        REFERENCE_CANDIDATES,
        link_specs,
        nws_action_by_gauge,
        git_sha=git_sha,
    )

    # Apply deterministic median-lead selection (§18.13)
    hero, hero_by_storm = compute_heroes(results_doc)
    results_doc["hero"] = hero
    results_doc["hero_by_storm"] = hero_by_storm
    results_doc["generated_by"]["source_sha256"] = source_sha
    results_doc["generated_by"]["working_tree_dirty"] = working_tree_dirty

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

    generated_at = datetime.now(UTC).isoformat().replace("+00:00", "Z")
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
            "git_sha": git_sha,
            "model_version": f"rule-loso-{sid}",
            "data_sha256": str(meta["data_sha256"]),
            "latency_sha256": latency_sha,
            "results_sha256": results_sha,
            "generated_at": generated_at,
            "source_sha256": source_sha,
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
    revision = subprocess.check_output(
        ["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, text=True
    ).strip()
    dirty = bool(
        subprocess.check_output(
            ["git", "status", "--porcelain", "backend/fordcast", "tools"],
            cwd=ROOT,
            text=True,
        )
    )
    run_offline(build(revision, dirty))
