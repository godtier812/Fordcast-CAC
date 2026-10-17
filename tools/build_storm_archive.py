"""Fetch and build multi-gauge USGS storm archives, NWPS metadata, and crossing links."""

import asyncio
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

import httpx
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]

GAUGE_CATALOG = [
    {"id": "USGS-08154700", "nws_lid": "ABUT2", "creek": "Bull Creek"},
    {"id": "USGS-08155200", "nws_lid": "OHBT2", "creek": "Barton Creek"},
    {"id": "USGS-08155240", "nws_lid": "LCKT2", "creek": "Barton Creek"},
    {"id": "USGS-08155300", "nws_lid": "ABTT2", "creek": "Barton Creek"},
    {"id": "USGS-08155400", "nws_lid": "BCCT2", "creek": "Barton Creek"},
    {"id": "USGS-08156675", "nws_lid": "ASHT2", "creek": "Shoal Creek"},
    {"id": "USGS-08156800", "nws_lid": "AHOT2", "creek": "Shoal Creek"},
    {"id": "USGS-08158200", "nws_lid": "WADT2", "creek": "Walnut Creek"},
    {"id": "USGS-08158380", "nws_lid": "LWGT2", "creek": "Little Walnut Creek"},
    {"id": "USGS-08158600", "nws_lid": "WWVT2", "creek": "Walnut Creek"},
    {"id": "USGS-08158700", "nws_lid": "DRWT2", "creek": "Onion Creek"},
    {"id": "USGS-08158810", "nws_lid": "BCFT2", "creek": "Bear Creek"},
    {"id": "USGS-08158827", "nws_lid": "OTCT2", "creek": "Onion Creek"},
    {"id": "USGS-08158840", "nws_lid": "SCAT2", "creek": "Slaughter Creek"},
    {"id": "USGS-08158860", "nws_lid": "SLHT2", "creek": "Slaughter Creek"},
    {"id": "USGS-08158920", "nws_lid": "WKLT2", "creek": "Williamson Creek"},
    {"id": "USGS-08158930", "nws_lid": "AAIT2", "creek": "Williamson Creek"},
    {"id": "USGS-08158970", "nws_lid": "WJCT2", "creek": "Williamson Creek"},
    {"id": "USGS-08159000", "nws_lid": "ATIT2", "creek": "Onion Creek"},
]

NWS_CATEGORIES: dict[str, dict[str, float] | None] = {
    "USGS-08154700": {"action": 5.0, "minor": 5.0, "moderate": 5.0, "major": 9.0},
    "USGS-08155200": {"action": 12.0, "minor": 12.0, "moderate": 15.0, "major": 18.0},
    "USGS-08155240": None,
    "USGS-08155300": {"action": 6.0, "minor": 8.0, "moderate": 11.0, "major": 12.0},
    "USGS-08155400": None,
    "USGS-08156675": None,
    "USGS-08156800": {"action": 5.0, "minor": 7.0, "moderate": 10.0, "major": 12.0},
    "USGS-08158200": None,
    "USGS-08158380": None,
    "USGS-08158600": None,
    "USGS-08158700": {"action": 5.5, "minor": 5.5, "moderate": 7.0, "major": 13.0},
    "USGS-08158810": None,
    "USGS-08158827": None,
    "USGS-08158840": {"action": 8.0, "minor": 8.0, "moderate": 9.0, "major": 15.0},
    "USGS-08158860": None,
    "USGS-08158920": {"action": 6.0, "minor": 6.0, "moderate": 7.0, "major": 10.0},
    "USGS-08158930": {"action": 12.0, "minor": 13.0, "moderate": 14.0, "major": 18.0},
    "USGS-08158970": None,
    "USGS-08159000": {"action": 15.0, "minor": 17.0, "moderate": 23.0, "major": 27.0},
}

STORMS = [
    {
        "id": "halloween-2013",
        "name_en": "Halloween Flood 2013",
        "name_es": "Inundación de Halloween 2013",
        "fetch_start": "2013-10-30T06:00:00Z",
        "window_start": "2013-10-30T12:00:00Z",
        "window_end": "2013-11-01T00:00:00Z",
        "headline_event": "2013-10-31T11:15:00Z",
        "catalog_order": 1,
        "bundle": True,
        "notes": "US 183 gauge silent after 2013-10-31T04:45:00Z; values are approved USGS OGC API v1 data",
        "outages": [
            {
                "site": "USGS-08159000",
                "start": "2013-10-31T11:15:00Z",
                "end": "2013-10-31T13:45:00Z",
                "source": "USGS alert 2013-10-31; Statesman 2013-11-10",
            }
        ],
    },
    {
        "id": "memorial-day-2015",
        "name_en": "Memorial Day Flood 2015",
        "name_es": "Inundación del Día de los Caídos 2015",
        "fetch_start": "2015-05-23T06:00:00Z",
        "window_start": "2015-05-23T12:00:00Z",
        "window_end": "2015-05-25T18:00:00Z",
        "headline_event": "2015-05-24T04:30:00Z",
        "catalog_order": 2,
        "bundle": True,
        "notes": "Memorial Day 2015 flood wave across Shoal, Barton, Williamson, Onion, and Walnut creeks",
        "outages": [],
    },
    {
        "id": "halloween-2015",
        "name_en": "All Saints Flood 2015",
        "name_es": "Inundación de Todos los Santos 2015",
        "fetch_start": "2015-10-29T18:00:00Z",
        "window_start": "2015-10-30T00:00:00Z",
        "window_end": "2015-10-31T12:00:00Z",
        "headline_event": "2015-10-30T15:00:00Z",
        "catalog_order": 3,
        "bundle": True,
        "notes": "October 2015 flood across Onion, Williamson, Barton, Slaughter, and Walnut creeks",
        "outages": [],
    },
    {
        "id": "oct-2018",
        "name_en": "October 2018 Highland Lakes Rain (Control)",
        "name_es": "Lluvia de octubre de 2018 (Control)",
        "fetch_start": "2018-10-15T18:00:00Z",
        "window_start": "2018-10-16T00:00:00Z",
        "window_end": "2018-10-17T12:00:00Z",
        "headline_event": None,
        "catalog_order": 4,
        "bundle": True,
        "notes": "Moderate basin rises remaining below road-overtopping thresholds on Austin creeks (control storm)",
        "outages": [],
    },
    {
        "id": "july-2025",
        "name_en": "July 2025 Urban Flash Rise",
        "name_es": "Crecida rápida urbana de julio de 2025",
        "fetch_start": "2025-07-04T06:00:00Z",
        "window_start": "2025-07-04T12:00:00Z",
        "window_end": "2025-07-06T00:00:00Z",
        "headline_event": "2025-07-05T10:00:00Z",
        "catalog_order": 5,
        "bundle": True,
        "notes": "July 2025 flash rise on Shoal Creek and Walnut Creek",
        "outages": [],
    },
]


def write_json(path: Path, obj: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


async def main() -> None:
    base = "https://api.waterdata.usgs.gov/ogcapi/v1"
    gauge_ids = [g["id"] for g in GAUGE_CATALOG]
    by_id = {g["id"]: g for g in GAUGE_CATALOG}

    async with httpx.AsyncClient(
        timeout=60,
        follow_redirects=True,
        headers={
            "User-Agent": "FordCast/0.1 (+https://github.com/godtier812/Fordcast-CAC)"
        },
    ) as client:
        # 1. Fetch monitoring-locations metadata
        r = await client.get(
            f"{base}/collections/monitoring-locations/items",
            params={"id": ",".join(gauge_ids), "limit": 100, "f": "json"},
        )
        r.raise_for_status()
        loc_features = r.json().get("features", [])
        gauges_geojson = []
        for f in sorted(loc_features, key=lambda x: x["id"]):
            gid = f["id"]
            p = f["properties"]
            meta = by_id.get(gid, {})
            gauges_geojson.append(
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [
                            round(float(f["geometry"]["coordinates"][0]), 5),
                            round(float(f["geometry"]["coordinates"][1]), 5),
                        ],
                    },
                    "properties": {
                        "id": gid,
                        "name": p.get("monitoring_location_name") or gid,
                        "nws_lid": meta.get("nws_lid"),
                        "creek": meta.get("creek"),
                        "datum_ft": float(p["altitude"])
                        if p.get("altitude") is not None
                        else None,
                        "nws_categories": NWS_CATEGORIES.get(gid),
                    },
                }
            )
        write_json(
            ROOT / "data/seed/gauges.geojson",
            {"type": "FeatureCollection", "features": gauges_geojson},
        )
        print(f"Wrote {len(gauges_geojson)} gauges to data/seed/gauges.geojson")

        # 2. Fetch continuous 00065 data for each storm
        fetched_iso = "2026-10-17T23:00:00Z"
        for storm in STORMS:
            sid = storm["id"]
            sdir = ROOT / "data/storms" / sid
            sdir.mkdir(parents=True, exist_ok=True)
            parquet_path = sdir / "readings.parquet"

            rows = []
            for i in range(0, len(gauge_ids), 5):
                batch = gauge_ids[i : i + 5]
                resp = await client.get(
                    f"{base}/collections/continuous/items",
                    params={
                        "monitoring_location_id": ",".join(batch),
                        "parameter_code": "00065",
                        "time": f"{storm['fetch_start']}/{storm['window_end']}",
                        "limit": 10000,
                        "f": "json",
                    },
                )
                resp.raise_for_status()
                for feat in resp.json().get("features", []):
                    fp = feat["properties"]
                    if fp.get("value") is None:
                        continue
                    obs_dt = datetime.fromisoformat(fp["time"]).astimezone(UTC)
                    qual = fp.get("qualifier")
                    quals = (
                        [str(q) for q in qual]
                        if isinstance(qual, list)
                        else ([str(qual)] if qual else [])
                    )
                    status_str = str(fp.get("approval_status") or "Approved")
                    approval = "A" if status_str.lower().startswith("a") else "P"
                    rows.append(
                        {
                            "gauge_id": str(fp["monitoring_location_id"]),
                            "param": "00065",
                            "obs_time": obs_dt,
                            "value": float(fp["value"]),
                            "approval": approval,
                            "qualifiers": quals,
                            "fetched_at": datetime.fromisoformat(fetched_iso),
                        }
                    )

            df = pd.DataFrame(rows)
            df = df.sort_values(["gauge_id", "obs_time"]).drop_duplicates(
                subset=["gauge_id", "param", "obs_time"], keep="last"
            )
            df.to_parquet(parquet_path, index=False)
            data_sha = hashlib.sha256(parquet_path.read_bytes()).hexdigest()
            active_gauges = sorted(df["gauge_id"].unique().tolist())

            outages_toml = "outages = []"
            if storm["outages"]:
                items = [
                    f'  {{ site = "{o["site"]}", start = "{o["start"]}", end = "{o["end"]}", source = "{o["source"]}" }},'
                    for o in storm["outages"]
                ]
                outages_toml = "outages = [\n" + "\n".join(items) + "\n]"

            headline_line = (
                f'headline_event = "{storm["headline_event"]}"\n'
                if storm["headline_event"]
                else ""
            )
            gauges_list_str = json.dumps(active_gauges)
            meta_toml = (
                f'id = "{sid}"\n'
                f'name_en = "{storm["name_en"]}"\n'
                f'name_es = "{storm["name_es"]}"\n'
                f'tz = "America/Chicago"\n'
                f"{headline_line}"
                f"gauges = {gauges_list_str}\n"
                f'official_status = "none"\n'
                f'kind = "storm"\n'
                f"bundle = {'true' if storm['bundle'] else 'false'}\n"
                f"catalog_order = {storm['catalog_order']}\n"
                f'data_sha256 = "{data_sha}"\n'
                f'notes = "{storm["notes"]}"\n\n'
                f"{outages_toml}\n\n"
                f"[window]\n"
                f'start = "{storm["window_start"]}"\n'
                f'end = "{storm["window_end"]}"\n\n'
                f"[fetched]\n"
                f'source = "api.waterdata.usgs.gov/ogcapi/v1 continuous"\n'
                f'at = "{fetched_iso}"\n'
            )
            (sdir / "meta.toml").write_text(meta_toml, encoding="utf-8")
            print(
                f"Storm {sid}: {len(df)} readings across {len(active_gauges)} gauges ({parquet_path.stat().st_size // 1024} KB)"
            )

        # 3. Write frozen data/latency/gauge_latency.json (§19.4)
        latency_doc = {
            "schema": "fordcast.gauge-latency.v1",
            "computed_from": {
                "start": "2026-10-16T00:00:00Z",
                "end": "2026-10-17T23:00:00Z",
            },
            "min_n": 50,
            "default_delay_min": 60,
            "default_stale_after_min": 60,
            "gauges": {
                gid: {
                    "n": 0,
                    "p75_min": None,
                    "p90_min": None,
                    "delay_min": 60,
                    "stale_after_min": 60,
                }
                for gid in sorted(gauge_ids)
            },
        }
        write_json(ROOT / "data/latency/gauge_latency.json", latency_doc)
        print("Wrote data/latency/gauge_latency.json")


if __name__ == "__main__":
    asyncio.run(main())
