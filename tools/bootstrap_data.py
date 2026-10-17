"""Build real source seeds and a historical observation playback, without forecast claims."""

import asyncio
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data/raw/smoke"
CITY = "https://services.arcgis.com/0L95CJ0VTaxqcmED/ArcGIS/rest/services/INLANDWATERS_flood_low_water_crossings/FeatureServer/0/query"
COUNTY = "https://gis.traviscountytx.gov/server1/rest/services/Public_Works/Low_Water_Crossings/MapServer/1/query"


def save(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


async def main() -> None:
    async with httpx.AsyncClient(
        timeout=30,
        follow_redirects=True,
        headers={"User-Agent": "FordCast/0.1 local research"},
    ) as client:
        for name, url in (("city-arcgis", CITY), ("travis-arcgis", COUNTY)):
            response = await client.get(
                url,
                params={
                    "where": "1=1",
                    "outFields": "*",
                    "outSR": "4326",
                    "f": "geojson",
                },
            )
            print(name, response.status_code)
            if response.is_success:
                value = response.json()
                save(RAW / f"{name}.json", value)
                print(
                    "features",
                    len(value.get("features", [])),
                    "first",
                    json.dumps(value.get("features", [])[:1])[:1800],
                )
    # Names and coordinates are taken verbatim from public records, never invented.
    # A later normalization step uses the observed property keys from the probes.
    gauge_data = json.loads((RAW / "nldi-onion.json").read_text(encoding="utf-8"))
    gauges = []
    for feature in gauge_data["features"]:
        p = feature["properties"]
        gauges.append(
            {
                "type": "Feature",
                "geometry": feature["geometry"],
                "properties": {
                    "id": p["identifier"],
                    "name": p["name"],
                    "source": "USGS NLDI",
                    "comid": p["comid"],
                },
            }
        )
    save(
        ROOT / "data/seed/gauges.geojson",
        {"type": "FeatureCollection", "features": gauges},
    )
    history = json.loads((RAW / "usgs-2013-us183.json").read_text(encoding="utf-8"))
    points = sorted(
        [
            [f["properties"]["time"], float(f["properties"]["value"])]
            for f in history["features"]
            if f["properties"].get("value") is not None
        ],
        key=lambda p: datetime.fromisoformat(p[0]),
    )
    playback = {
        "schema": "fordcast.observations.v1",
        "id": "halloween-2013",
        "gauge_id": "USGS-08159000",
        "name": "Onion Ck at US Hwy 183, Austin, TX",
        "source": "USGS Water Data OGC API v1",
        "kind": "historical-observations",
        "forecast_available": False,
        "unit": "ft",
        "points": points,
        "fetched_at": datetime.now(UTC).isoformat(),
        "archive_sha256": hashlib.sha256(
            (RAW / "usgs-2013-us183.json").read_bytes()
        ).hexdigest(),
    }
    save(ROOT / "data/observations/halloween-2013.json", playback)
    print("Archived observation points:", len(points))


if __name__ == "__main__":
    asyncio.run(main())
