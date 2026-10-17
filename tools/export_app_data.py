"""Normalize observed inventory fields and copy source-backed artifacts into the app."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def write(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def main() -> None:
    features = []
    for source, prefix, name_key, id_key, attribution in (
        (
            "city-arcgis",
            "atx",
            "CROSSING_DESCRIPTION",
            "OBJECTID",
            "City of Austin Open Data",
        ),
        ("travis-arcgis", "tc", "Locations", "OID", "Travis County Public Works"),
    ):
        path = ROOT / f"data/raw/smoke/{source}.json"
        if not path.exists():
            continue
        raw = json.loads(path.read_text(encoding="utf-8"))
        for row in raw.get("features", []):
            p, geom = row["properties"], row["geometry"]
            if geom is None or geom["type"] != "Point" or not p.get(name_key):
                continue
            lon, lat = geom["coordinates"][:2]
            if not (-98.2 <= lon <= -97.4 and 29.95 <= lat <= 30.7):
                continue
            features.append(
                {
                    "type": "Feature",
                    "geometry": geom,
                    "properties": {
                        "id": f"{prefix}-{p[id_key]}",
                        "name": p[name_key].strip(),
                        "name_es": p[name_key].strip(),
                        "tier": "C",
                        "source": attribution,
                        "source_id": str(p[id_key]),
                        "source_ref": f"data/raw/smoke/{source}.json",
                        "state": "unknown",
                        "review_status": "unreviewed",
                        "reason": "NO_UPSTREAM_GAUGE",
                    },
                }
            )
    features.sort(key=lambda f: f["properties"]["id"])
    inventory = {"type": "FeatureCollection", "features": features}
    write(ROOT / "data/seed/crossings.geojson", inventory)
    paths = [
        "seed/crossings.geojson",
        "seed/gauges.geojson",
        "observations/halloween-2013.json",
    ]
    manifest = []
    for path in paths:
        original = ROOT / "data" / path
        target = ROOT / "mobile/assets" / path
        target.parent.mkdir(parents=True, exist_ok=True)
        content = original.read_bytes()
        target.write_bytes(content)
        manifest.append(
            {
                "path": path,
                "sha256": hashlib.sha256(content).hexdigest(),
                "bytes": len(content),
            }
        )
    write(
        ROOT / "data/MANIFEST.json", {"schema": "fordcast.assets.v1", "files": manifest}
    )
    write(
        ROOT / "mobile/assets/manifest.json",
        {"schema": "fordcast.assets.v1", "files": manifest},
    )
    # TypeScript can statically import JSON, avoiding dynamic asset resolution.
    write(ROOT / "mobile/assets/seed/crossings.json", inventory)
    write(
        ROOT / "mobile/assets/seed/gauges.json",
        json.loads((ROOT / "data/seed/gauges.geojson").read_text(encoding="utf-8")),
    )
    print(
        f"Exported {len(features)} real inventory records; all remain unreviewed tier C."
    )


if __name__ == "__main__":
    main()
