"""Bounded public-source probes. Never sends mail, creates accounts or calls ATXfloods.

Run with the backend environment: uv run --project backend python tools/smoke_test.py.
Unkeyed USGS probes are an explicit local bootstrap exception, not a production poller.
"""

import asyncio
import hashlib
import json
import os
from datetime import UTC, datetime
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://api.waterdata.usgs.gov/ogcapi/v1"
PROBES = {
    "S1": ("usgs-collections", BASE + "/collections?f=json"),
    "S2": (
        "usgs-latest",
        BASE
        + "/collections/latest-continuous/items?f=json&bbox=-98.20,29.95,-97.40,30.70&parameter_code=00065&limit=10000",
    ),
    "S3": (
        "usgs-2013-us183",
        BASE
        + "/collections/continuous/items?f=json&monitoring_location_id=USGS-08159000&parameter_code=00065&time=2013-10-30T00:00:00Z/2013-11-01T00:00:00Z&limit=10000",
    ),
    "S4": (
        "nldi-onion",
        "https://api.water.usgs.gov/nldi/linked-data/nwissite/USGS-08159000/navigation/UT/nwissite?distance=100",
    ),
    "S5": ("nwps-us183", "https://api.water.noaa.gov/nwps/v1/gauges/08159000"),
    "S7": (
        "austin-crossings",
        "https://data.austintexas.gov/api/v3/views/q6kt-v2zm/export.geojson",
    ),
    "S8": ("ofm-style", "https://tiles.openfreemap.org/styles/positron"),
}


async def main() -> None:
    out = ROOT / "data" / "raw" / "smoke"
    out.mkdir(parents=True, exist_ok=True)
    semaphore = asyncio.Semaphore(2)
    headers = {
        "User-Agent": "FordCast/0.1 (local research; https://github.com/godtier812/Fordcast-CAC)",
        "Accept": "application/json",
    }
    results = []
    async with httpx.AsyncClient(
        timeout=30, follow_redirects=True, headers=headers
    ) as client:

        async def run(cid, name, url):
            record = {
                "id": cid,
                "source": name,
                "url": url,
                "scope": "partial contract probe",
            }
            async with semaphore:
                try:
                    auth = (
                        {"X-Api-Key": os.environ["USGS_API_KEY"]}
                        if url.startswith(BASE) and os.getenv("USGS_API_KEY")
                        else {}
                    )
                    response = await client.get(url, headers=auth)
                    record["http_status"] = response.status_code
                    response.raise_for_status()
                    payload = response.json()
                    raw = json.dumps(payload, ensure_ascii=False, indent=2).encode()
                    (out / f"{name}.json").write_bytes(raw)
                    record.update(
                        status="PASS",
                        sha256=hashlib.sha256(raw).hexdigest(),
                        bytes=len(raw),
                        keys=list(payload)[:15],
                    )
                    if "features" in payload:
                        record["features"] = len(payload["features"])
                        record["property_keys"] = (
                            list(payload["features"][0].get("properties", {}))
                            if payload["features"]
                            else []
                        )
                    if "error" in payload:
                        record["status"] = "FAIL"
                except (httpx.HTTPError, ValueError, KeyError) as exc:
                    record.update(status="FAIL", error=type(exc).__name__)
            print(f"{cid} {name}: {record['status']}")
            return record

        results = await asyncio.gather(
            *(run(cid, *pair) for cid, pair in PROBES.items())
        )
    results.extend(
        {"id": cid, "status": "BLOCKED", "reason": reason}
        for cid, reason in {
            "S6": "Project contact email not supplied; NWS User-Agent contract not exercised.",
            "S9": "Stretch rainfall integration not enabled.",
            "S10": "ATXfloods permission absent; no endpoint accessed.",
            "S11": "Routing keys absent; Stretch integration not enabled.",
            "S12": "Expo access token absent; push receipt authentication not exercised.",
        }.items()
    )
    report = {
        "checked_at": datetime.now(UTC).isoformat(),
        "scope": "Partial bootstrap checks; not full S1–S12 acceptance",
        "usgs_keyed": bool(os.getenv("USGS_API_KEY")),
        "checks": results,
    }
    (ROOT / "docs/data-bridge-verification.json").write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )
    lines = [
        "# Data bridge verification",
        "",
        report["scope"],
        "",
        "Raw public responses are cached under ignored data/raw/smoke/; hashes are recorded in the JSON report.",
        "",
        "| Check | Status | Detail |",
        "| --- | --- | --- |",
    ]
    lines += [
        f"| {r['id']} | {r['status']} | {r.get('source', r.get('reason'))} |"
        for r in results
    ]
    lines += [
        "",
        "No authentication, quota, provenance or deployment acceptance is implied by a public HTTP response. USGS unkeyed calls were bounded bootstrap probes only; production needs a configured key.",
    ]
    (ROOT / "docs/data-bridge-verification.md").write_text(
        "\n".join(lines) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    asyncio.run(main())
