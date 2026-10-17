"""Reproducible gauge-to-gauge study, not a crossing forecast evaluation.

Three public storm windows; twelve USGS page requests at most (excluding retries). No routine unkeyed polling.
"""

import asyncio
import hashlib
import json
import sys
from dataclasses import asdict
from datetime import UTC, datetime
from pathlib import Path

import httpx
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from fordcast.linking.travel_time import combine_storms, estimate_lag
from fordcast.sources.usgs_client import USGSClient, parse_readings

STORMS = {
    "halloween-2013": ("2013-10-29T00:00:00Z", "2013-11-02T00:00:00Z"),
    "memorial-day-2015": ("2015-05-22T00:00:00Z", "2015-05-28T00:00:00Z"),
    "halloween-2015": ("2015-10-28T00:00:00Z", "2015-11-02T00:00:00Z"),
}
UP, DOWN = "USGS-08158700", "USGS-08159000"


async def main():
    nldi = json.loads(
        (ROOT / "data/raw/smoke/nldi-onion.json").read_text(encoding="utf-8")
    )
    if not any(f["properties"]["identifier"] == UP for f in nldi["features"]):
        raise ValueError("Upstream connection has not been verified")
    estimates, reports = [], []
    async with httpx.AsyncClient(
        timeout=30,
        headers={
            "User-Agent": "FordCast/0.1 local research (+https://github.com/godtier812/Fordcast-CAC)"
        },
    ) as transport:
        client = USGSClient(transport)
        for storm, (start, end) in STORMS.items():
            directory = ROOT / "data/storms" / storm
            directory.mkdir(parents=True, exist_ok=True)
            parquet = directory / "readings.parquet"
            if not parquet.exists():
                rows = []
                for gauge in (UP, DOWN):
                    features = await client.features(
                        "continuous",
                        {
                            "monitoring_location_id": gauge,
                            "parameter_code": "00065",
                            "time": f"{start}/{end}",
                        },
                        max_pages=2,
                    )
                    readings = parse_readings(features, datetime.now(UTC))
                    rows.extend(
                        {
                            "gauge_id": r.gauge_id,
                            "param": r.param,
                            "obs_time": r.obs_time,
                            "value": r.value,
                            "approval": r.approval,
                            "qualifiers": list(r.qualifiers),
                            "fetched_at": r.available_at,
                        }
                        for r in readings
                    )
                frame = pd.DataFrame(rows)
                if frame.empty:
                    raise ValueError(f"No observations for {storm}")
                frame.to_parquet(parquet, index=False)
            frame = pd.read_parquet(parquet)
            series = {}
            for gauge in (UP, DOWN):
                rows = (
                    frame[frame.gauge_id == gauge]
                    .sort_values("obs_time")
                    .drop_duplicates("obs_time", keep="last")
                )
                series[gauge] = pd.Series(
                    rows.value.to_numpy(), index=pd.DatetimeIndex(rows.obs_time)
                )
            estimate = estimate_lag(series[UP], series[DOWN], storm)
            if estimate:
                estimates.append(estimate)
            report = {
                "storm_id": storm,
                "rows": {g: len(s) for g, s in series.items()},
                "estimate": asdict(estimate) if estimate else None,
                "archive_sha256": hashlib.sha256(parquet.read_bytes()).hexdigest(),
            }
            reports.append(report)
            metadata = f'id = "{storm}"\nkind = "study"\nbundle = false\nofficial_status = "none"\nforecast_ready = false\noutages = []\nnotes = "Gauge-to-gauge training study only. Transmission outages not yet independently verified; not eligible for forecast replay."\n[window]\nstart = "{start}"\nend = "{end}"\n'
            (directory / "meta.toml").write_text(metadata, encoding="utf-8")
            print(json.dumps(report))
    combined = combine_storms(estimates, channel_dist_km=None)
    result = {
        "schema": "fordcast.travel-time-study.v1",
        "kind": "training-study",
        "forecast_skill_claim": False,
        "upstream_gauge": UP,
        "downstream_gauge": DOWN,
        "upstream_evidence": "USGS NLDI upstream navigation",
        "storms": reports,
        "combined": asdict(combined) if combined else None,
        "limitations": [
            "Gauge-to-gauge lag is not crossing-specific warning lead time.",
            "Channel distance and physical celerity are not verified.",
            "No road-overtopping ground truth or out-of-sample forecast evaluation.",
            "Archived approved values can differ from original provisional values.",
        ],
    }
    target = ROOT / "docs/results/travel-time-study.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps(result, indent=2, allow_nan=False) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    asyncio.run(main())
