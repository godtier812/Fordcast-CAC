import csv
import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

from fordcast.domain import Crossing, Gauge
from fordcast.features.compute import water_at_road
from fordcast.linking.geography import distance_km, nearest_gauge
from fordcast.scoring.backtest import LinkSpec, learn_fold_links
from fordcast.sources.base import Reading

ROOT = Path(__file__).resolve().parents[2]


def test_every_comparator_is_the_true_eligible_geodesic_minimum():
    gauges = json.loads((ROOT / "data/seed/gauges.geojson").read_text())["features"]
    catalog = {
        g["properties"]["id"]: dict(zip(("lon", "lat"), g["geometry"]["coordinates"][:2]))
        for g in gauges
    }
    crossings = {
        f["properties"]["id"]: f
        for f in json.loads((ROOT / "data/seed/crossings.geojson").read_text())["features"]
    }
    with (ROOT / "data/links/crossing_gauge_links.csv").open() as handle:
        rows = [r for r in csv.DictReader(handle) if r["relation"] == "nearest_baseline"]
    assert rows
    for row in rows:
        lon, lat = crossings[row["crossing_id"]]["geometry"]["coordinates"][:2]
        actual = nearest_gauge(lon, lat, catalog)
        assert row["gauge_id"] == actual
        selected_distance = distance_km(
            (lon, lat), (catalog[actual]["lon"], catalog[actual]["lat"])
        )
        assert all(
            selected_distance <= distance_km((lon, lat), (g["lon"], g["lat"])) + 1e-9
            for g in catalog.values()
        )


def test_failed_calibration_records_zero_evidence_and_cannot_generate_forecasts():
    crossing = Crossing("c", "Research location", 0, 0, "B", Gauge("target"), reference_stage_ft=10)
    links, rows = learn_fold_links(
        [], {}, {}, {"c": crossing}, [LinkSpec("c", "up", "upstream", 10, 5, [])], {}, {}, "fixture"
    )
    assert links["c"] == ()
    assert rows[0]["n_storms"] == 0
    assert rows[0]["xcorr_r"] is None
    assert rows[0]["lag_min"] is None
    assert rows[0]["needs_review"] is True


def test_proxy_reference_cannot_become_water_at_road():
    now = datetime(2025, 1, 1, tzinfo=UTC)
    crossing = Crossing("c", "Proxy", 0, 0, "B", Gauge("g"), reference_stage_ft=10)
    reading = Reading("g", "00065", now - timedelta(minutes=5), now, 100)
    assert not water_at_road(crossing, {"g": [reading]}, now)


def test_no_proxy_is_promoted_to_validated_road_truth():
    inventory = json.loads((ROOT / "data/seed/crossings.geojson").read_text())["features"]
    references = json.loads((ROOT / "data/reference/gauge-categories.json").read_text())
    assert all(f["properties"]["tier"] != "A" for f in inventory)
    for feature in inventory:
        p = feature["properties"]
        assert p["overtop_stage_ft"] is None
        if p.get("reference_stage_ft") is not None:
            official = references[p["target_gauge_id"]]
            assert p["reference_source_url"] == official["url"]
            assert p["reference_stage_ft"] in [v["stage"] for v in official["categories"].values()]
            assert p["truth_quality"] == "proxy"


def test_calm_exposure_is_measured_and_unmeasured_populations_are_null():
    results = json.loads((ROOT / "docs/results/results.json").read_text())
    assert results["assumptions"]["calm_days"] == 1.5
    assert results["headline"]["road_forecast_skill_verified"] is False
    assert results["by_truth_quality"]["non_proxy"]["pod"] is None
    for method in ("upstream_rule", "nearest_gauge"):
        assert (
            results["methods"][method]["calm_fa_per_crossing_per_100d"]["tier_b"]["avoid"] is None
        )
