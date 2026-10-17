from datetime import timedelta

import pytest
from conftest import NOW
from fastapi.testclient import TestClient
from pydantic import ValidationError

from fordcast.api.app import create_app
from fordcast.snapshot import CrossingRisk, Snapshot


def test_api_never_invents_live_health(tmp_path):
    client = TestClient(create_app(tmp_path))
    health = client.get("/v1/health")
    assert health.status_code == 200
    assert health.json()["data_status"] == "offline"
    assert client.get("/v1/crossings/missing").status_code == 404
    assert client.get("/v1/replays").json()["storms"] == []


def test_stale_snapshot_changes_every_state_and_keeps_warning():
    snapshot = Snapshot(
        as_of=NOW,
        generated_at=NOW,
        data_status="live",
        inventory_version="test",
        model={},
        counts={},
        crossings=[
            CrossingRisk(
                id="c",
                state="avoid",
                tier="A",
                window=(15, 30),
                reasons=[{"code": "UPSTREAM_ABOVE_TRIGGER"}],
            ),
            CrossingRisk(id="d", state="no_rise", tier="A"),
        ],
    )
    assert snapshot.at(NOW + timedelta(minutes=20)).crossings[0].state == "avoid"
    expired = snapshot.at(NOW + timedelta(minutes=20, seconds=1))
    assert all(c.state == "unknown" and c.window is None for c in expired.crossings)
    assert expired.crossings[0].last_known["state"] == "avoid"
    assert expired.crossings[1].last_known is None
    assert snapshot.crossings[0].state == "avoid"
    future = snapshot.at(NOW - timedelta(minutes=2))
    assert future.crossings[0].state == "unknown"
    assert future.crossings[0].last_known is None
    payload = snapshot.model_dump()
    with pytest.raises(ValidationError):
        Snapshot.model_validate({**payload, "as_of": NOW.replace(tzinfo=None)})
    with pytest.raises(ValidationError):
        Snapshot.model_validate({**payload, "stale_after_s": 3600})
