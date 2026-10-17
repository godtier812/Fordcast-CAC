import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, Response

from fordcast import __version__
from fordcast.snapshot import CrossingRisk, Snapshot

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "data"


def load_inventory(data_dir: Path = DATA) -> dict:
    path = data_dir / "seed/crossings.geojson"
    return (
        json.loads(path.read_text(encoding="utf-8"))
        if path.exists()
        else {"type": "FeatureCollection", "features": []}
    )


def create_app(data_dir: Path = DATA) -> FastAPI:
    app = FastAPI(title="FordCast prototype API", version=__version__)

    def current() -> Snapshot:
        path = data_dir / "snapshots/current.json"
        if path.exists():
            return Snapshot.model_validate_json(path.read_text(encoding="utf-8")).at(
                datetime.now(UTC)
            )
        inventory = load_inventory(data_dir)
        now = datetime.now(UTC)
        return Snapshot(
            as_of=now,
            generated_at=now,
            inventory_version="unreviewed-inventory-v1",
            model={"kind": "rule", "version": "not-trained", "git_sha": None, "ml_enabled": False},
            counts={
                "crossings": len(inventory["features"]),
                "monitored": 0,
                "gauges_active": 0,
                "gauges_stale": 0,
            },
            crossings=[
                CrossingRisk(
                    id=f["properties"]["id"],
                    state="unknown",
                    tier="C",
                    reasons=[{"code": "NO_UPSTREAM_GAUGE"}],
                )
                for f in inventory["features"]
            ],
        )

    @app.get("/v1/health")
    def health():
        return {
            "status": "degraded",
            "version": __version__,
            "git_sha": None,
            "db": "not_configured",
            "last_tick_ok_at": None,
            "data_status": "offline",
        }

    @app.get("/v1/risk/current")
    def risk(request: Request):
        payload = current().model_dump_json(by_alias=True)
        etag = '"' + hashlib.sha256(payload.encode()).hexdigest() + '"'
        headers = {"ETag": etag, "Cache-Control": "no-cache"}
        if request.headers.get("if-none-match") == etag:
            return Response(status_code=304, headers=headers)
        return Response(payload, media_type="application/json", headers=headers)

    @app.get("/v1/crossings")
    def crossings():
        return load_inventory(data_dir)

    @app.get("/v1/crossings/{crossing_id}")
    def crossing(crossing_id: str):
        feature = next(
            (
                f
                for f in load_inventory(data_dir)["features"]
                if f["properties"]["id"] == crossing_id
            ),
            None,
        )
        if feature is None:
            raise HTTPException(404, "Crossing not found")
        risk_item = next((c for c in current().crossings if c.id == crossing_id), None)
        return {
            **feature["properties"],
            "geometry": feature["geometry"],
            "risk": risk_item,
            "official_link": "https://www.atxfloods.com/crossings",
            "disclaimer_key": "SUPPLEMENTARY_TOOL",
        }

    @app.get("/v1/replays")
    def replays():
        # An observation chart is not an evaluated forecast replay.
        return {
            "schema": "fordcast.replay-index.v1",
            "storms": [],
            "reason": "No validated forecast timelines yet",
        }

    @app.get("/v1/observations/halloween-2013")
    def observations():
        path = data_dir / "observations/halloween-2013.json"
        if not path.exists():
            raise HTTPException(404, "Historical observations have not been downloaded")
        return json.loads(path.read_text(encoding="utf-8"))

    return app


app = create_app()
