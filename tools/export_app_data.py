"""Copy verified seed, creek, replay, link, and backtest artifacts into mobile/assets/ and update MANIFEST.json."""

import csv
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def write(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def main() -> None:
    inventory = json.loads(
        (ROOT / "data/seed/crossings.geojson").read_text(encoding="utf-8")
    )
    gauges = json.loads((ROOT / "data/seed/gauges.geojson").read_text(encoding="utf-8"))
    creeks = json.loads(
        (ROOT / "data/creeks/creeks.geojson").read_text(encoding="utf-8")
    )
    replay_index = json.loads(
        (ROOT / "data/replays/index.json").read_text(encoding="utf-8")
    )

    paths = [
        "seed/crossings.geojson",
        "seed/gauges.geojson",
        "creeks/creeks.geojson",
        "observations/halloween-2013.json",
        "replays/index.json",
    ]
    for storm in replay_index["storms"]:
        sid = storm["id"]
        paths.append(f"replays/{sid}.json.gz")
        paths.append(f"replays/{sid}.json")

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

    # TypeScript static JSON imports for cross-platform (Web + Android + iOS) offline use
    write(ROOT / "mobile/assets/seed/crossings.json", inventory)
    write(ROOT / "mobile/assets/seed/gauges.json", gauges)
    write(ROOT / "mobile/assets/seed/creeks.json", creeks)

    results_path = ROOT / "docs/results/results.json"
    if results_path.exists():
        results_doc = json.loads(results_path.read_text(encoding="utf-8"))
        write(ROOT / "mobile/assets/results/results.json", results_doc)

    links_csv = ROOT / "data/links/crossing_gauge_links.csv"
    live_links = []
    if links_csv.exists():
        with links_csv.open("r", encoding="utf-8", newline="") as fh:
            for row in csv.DictReader(fh):
                if (
                    row["model_version"] == "rule-2026.10.17"
                    and row["relation"] == "upstream"
                ):
                    p25 = float(row["lag_p25_min"])
                    p75 = float(row["lag_p75_min"])
                    tlo = max(5, int(math.floor(p25 / 15.0) * 15))
                    thi = max(tlo + 15, int(math.ceil(p75 / 15.0) * 15))
                    live_links.append(
                        {
                            "crossing_id": row["crossing_id"],
                            "gauge_id": row["gauge_id"],
                            "relation": row["relation"],
                            "is_primary": row["is_primary"].lower() == "true",
                            "channel_dist_km": float(row["channel_dist_km"]),
                            "lag_min": float(row["lag_min"]),
                            "lag_p25_min": p25,
                            "lag_p75_min": p75,
                            "tau_lo_min": tlo,
                            "tau_hi_min": thi,
                            "trigger_stage_ft": float(row["trigger_stage_ft"]),
                            "watch_stage_ft": float(row["watch_stage_ft"]),
                            "rise_rate_ft_per_30m": float(row["min_rise_ft_30m"]),
                        }
                    )
    write(ROOT / "mobile/assets/seed/links.json", live_links)

    tiers = {"A": 0, "B": 0, "C": 0}
    for f in inventory["features"]:
        tiers[f["properties"]["tier"]] += 1
    print(
        f"Exported {len(inventory['features'])} crossings "
        f"(Tier A={tiers['A']}, Tier B={tiers['B']}, Tier C={tiers['C']}) "
        f"and {len(replay_index['storms'])} storm replays."
    )


if __name__ == "__main__":
    main()
