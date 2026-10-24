"""Fail-fast artifact audit; browser/device acceptance is recorded separately."""

import csv
import json
import sys
from bisect import bisect_right
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

import pandas as pd
from pyproj import Geod

ROOT = Path(__file__).resolve().parents[1]
GEOD = Geod(ellps="WGS84")


def load(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8-sig"))


def audit():
    crossings = load("data/seed/crossings.geojson")["features"]
    gauges = load("data/seed/gauges.geojson")["features"]
    references = load("data/reference/gauge-categories.json")
    with (ROOT / "data/links/crossing_gauge_links.csv").open() as handle:
        rows = list(csv.DictReader(handle))
    errors = []
    for crossing in crossings:
        p = crossing["properties"]
        coords = crossing["geometry"]["coordinates"]
        if p["tier"] == "A" or p["overtop_stage_ft"] is not None:
            errors.append({"unsupported_road_truth": p["id"]})
        if p.get("reference_stage_ft") is not None:
            official = references[p["target_gauge_id"]]
            stages = [
                v["stage"] for v in official["categories"].values() if v["stage"] > -999
            ]
            if (
                p["truth_quality"] != "proxy"
                or p["reference_stage_ft"] not in stages
                or p["reference_source_url"] != official["url"]
            ):
                errors.append({"invalid_reference": p["id"]})
        nearest = min(
            gauges,
            key=lambda g: (
                GEOD.inv(*coords[:2], *g["geometry"]["coordinates"][:2])[2],
                g["properties"]["id"],
            ),
        )
        for baseline in [
            r
            for r in rows
            if r["crossing_id"] == p["id"] and r["relation"] == "nearest_baseline"
        ]:
            if nearest["properties"]["id"] != baseline["gauge_id"]:
                errors.append({"wrong_nearest_baseline": p["id"]})
    grid_errors, rejected_used = [], []
    for path in (ROOT / "data/replays").glob("*.json"):
        if path.stem == "index":
            continue
        doc = json.loads(path.read_text())
        frame = pd.read_parquet(ROOT / "data/storms" / path.stem / "readings.parquet")
        for link in doc["links"]:
            evidence = next(
                (
                    r
                    for r in rows
                    if r["model_version"] == doc["pipeline"]["model_version"]
                    and r["crossing_id"] == link["crossing_id"]
                    and r["gauge_id"] == link["gauge_id"]
                    and r["relation"] == "upstream"
                ),
                None,
            )
            if (
                evidence is None
                or evidence["needs_review"].lower() != "false"
                or int(evidence["n_storms"]) == 0
            ):
                rejected_used.append(
                    {"storm": path.stem, "crossing": link["crossing_id"]}
                )
        for gauge in doc["gauges"]:
            data = frame[frame.gauge_id == gauge["id"]].sort_values("obs_time")
            times, values = list(data.obs_time), list(data.value)
            for k, value in enumerate(gauge["stage_ft"]):
                target = pd.Timestamp(gauge["t0"]) + pd.Timedelta(
                    seconds=k * gauge["dt_s"]
                )
                index = bisect_right(times, target) - 1
                expected = (
                    round(float(values[index]), 2)
                    if index >= 0 and (target - times[index]).total_seconds() <= 1200
                    else None
                )
                if value != expected:
                    grid_errors.append(
                        {"storm": path.stem, "gauge": gauge["id"], "grid": str(target)}
                    )
    errors.extend({"causal_chart": entry} for entry in grid_errors)
    errors.extend({"rejected_link_used": entry} for entry in rejected_used)
    for feature in load("data/creeks/creeks.geojson")["features"]:
        if (
            feature["properties"].get("geometry_source")
            != "schematic_corridor_connector"
        ):
            errors.append({"geometry_attribution": feature["properties"]["reach_id"]})
    for row in rows:
        if int(row["n_storms"]) == 0 and row["xcorr_r"] not in {"", "0", "0.0"}:
            errors.append({"invented_calibration": row["crossing_id"]})
    results = load("docs/results/results.json")
    if (
        results["headline"].get("road_forecast_skill_verified") is not False
        or results["headline"]["labels"] != "gauge_flood_stage_proxy"
    ):
        errors.append("Proxy results presented as road skill")
    if results["by_truth_quality"]["non_proxy"]["pod"] is not None:
        errors.append("Unmeasured road performance must be null")
    if results["assumptions"]["calm_days"] != 1.5:
        errors.append("Control exposure must equal its 36-hour timestamps")
    for method in ("upstream_rule", "nearest_gauge"):
        if (
            results["methods"][method]["calm_fa_per_crossing_per_100d"]["tier_b"][
                "avoid"
            ]
            is not None
        ):
            errors.append("Separate Tier-B calm population is not evaluated")
    if "--verify-sources" in sys.argv:
        import httpx

        with httpx.Client(timeout=35) as client:
            for gid, reference in references.items():
                response = client.get(reference["url"])
                response.raise_for_status()
                if response.json()["flood"]["categories"] != reference["categories"]:
                    errors.append({"official_reference_changed": gid})
    output = {
        "checked_at": datetime.now(UTC).isoformat(),
        "status": "FAIL" if errors else "PASS",
        "scope": "Scientific artifact contracts; browser/device acceptance is separate",
        "tier_counts": dict(Counter(c["properties"]["tier"] for c in crossings)),
        "reference_cases": sum(
            c["properties"].get("reference_stage_ft") is not None for c in crossings
        ),
        "future_or_incorrect_chart_assignments": grid_errors,
        "review_flagged_links_used_in_replays": rejected_used,
        "hero": results.get("hero"),
        "errors": errors,
        "remaining_external_acceptance": [
            "road threshold and topology validation",
            "30-day calm evaluation",
            "live service and notification delivery",
            "native-device, accessibility and fluent Spanish review",
        ],
    }
    (ROOT / "docs/results/qa-evidence.json").write_text(
        json.dumps(output, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(output, indent=2))
    return bool(errors)


if __name__ == "__main__":
    raise SystemExit(audit())
