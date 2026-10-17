"""Tests for ground-truth extraction, trigger learning, hero selection, and fordcast.replay.v1 artifacts."""

import gzip
import hashlib
import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

from fastapi.testclient import TestClient

from fordcast.api.app import create_app
from fordcast.linking.triggers import learn_trigger
from fordcast.replay.build import serialize_replay
from fordcast.replay.schema import ReplayIndexV1, ReplayTimelineV1
from fordcast.replay.storyboard import load_templates
from fordcast.scoring.labels import extract_truth_episodes
from fordcast.scoring.metrics import Onset
from fordcast.sources.base import Reading

ROOT = Path(__file__).resolve().parents[2]


def _r(gid: str, obs_time: datetime, value: float) -> Reading:
    return Reading(
        gauge_id=gid, param="00065", obs_time=obs_time, available_at=obs_time, value=value
    )


def test_truth_episode_merging_and_censored_onset():
    t0 = datetime(2015, 5, 24, 0, 0, tzinfo=UTC)
    readings = [
        _r("g", t0, 10.0),
        # 45-minute observational gap before first overtop -> censored=True
        _r("g", t0 + timedelta(minutes=45), 16.0),
        _r("g", t0 + timedelta(minutes=60), 17.0),
        # 30-minute dip below overtop (< 60 min) -> merged into one episode
        _r("g", t0 + timedelta(minutes=75), 14.0),
        _r("g", t0 + timedelta(minutes=90), 16.5),
        # 90-minute dip -> separate episode, uncensored (15 min step before onset)
        _r("g", t0 + timedelta(minutes=105), 12.0),
        _r("g", t0 + timedelta(minutes=180), 12.0),
        _r("g", t0 + timedelta(minutes=195), 15.5),
    ]
    eps = extract_truth_episodes(
        readings,
        15.0,
        crossing_id="atx-7",
        storm_id="memorial-day-2015",
        quality="gauge",
    )
    assert len(eps) == 2
    assert eps[0].censored is True
    assert eps[0].onset == t0 + timedelta(minutes=15)
    assert eps[0].end == t0 + timedelta(minutes=90)
    assert eps[1].censored is False
    assert eps[1].onset == t0 + timedelta(minutes=195)


def test_learn_trigger_respects_delay_and_far_cap():
    t0 = datetime(2013, 10, 31, 0, 0, tzinfo=UTC)
    s1 = [
        _r("u", t0 + timedelta(minutes=15 * k), 3.0 + (8.0 if 4 <= k <= 8 else 0.0))
        for k in range(20)
    ]
    # Calm storm with minor bump to 4.5 ft -> trigger should stay above 4.5 ft
    s2 = [
        _r("u", t0 + timedelta(days=1, minutes=15 * k), 3.0 + (1.5 if k == 5 else 0.0))
        for k in range(20)
    ]
    onsets = [Onset("c1", "s1", t0 + timedelta(minutes=150))]
    fit = learn_trigger(
        {"s1": s1, "s2": s2},
        onsets,
        delay_min=60,
        nws_action_stage_ft=6.0,
    )
    assert fit.params_source == "learned"
    assert fit.trigger_stage_ft > 4.5
    assert fit.watch_stage_ft < fit.trigger_stage_ft


def test_all_bundled_replays_validate_and_match_hashes():
    idx_raw = json.loads((ROOT / "data/replays/index.json").read_text(encoding="utf-8"))
    idx = ReplayIndexV1.model_validate(idx_raw)
    assert len(idx.storms) == 5
    assert idx.hero_storm_id == "halloween-2013"

    for entry in idx.storms:
        json_path = ROOT / "data/replays" / f"{entry.id}.json"
        gz_path = ROOT / "data/replays" / entry.file
        doc = json.loads(json_path.read_text(encoding="utf-8"))
        validated = ReplayTimelineV1.model_validate(doc)
        assert validated.storm.id == entry.id

        _canonical, _gz_bytes, timeline_sha, content_sha, file_sha = serialize_replay(doc)
        assert timeline_sha == entry.timeline_sha256
        assert content_sha == entry.content_sha256
        assert file_sha == entry.file_sha256
        assert len(gz_path.read_bytes()) == entry.bytes_gz <= 150 * 1024
        assert (
            hashlib.sha256(gzip.decompress(gz_path.read_bytes())).hexdigest()
            == entry.timeline_sha256
        )

    h2013 = json.loads((ROOT / "data/replays/halloween-2013.json").read_text(encoding="utf-8"))
    kinds = [s["kind"] for s in h2013["storyboard"]]
    assert "first_watch" in kinds
    assert "first_avoid" in kinds
    assert "gauge_silent" in kinds
    assert any(o["site"] == "USGS-08159000" for o in h2013["assumptions"]["outages"])


def test_storyboard_templates_have_en_es_parity_and_no_banned_words():
    templates = load_templates()
    banned = {"safe", "clear", "passable", "open", "normal", "seguro", "transitable", "abierto"}
    for name, item in templates.items():
        assert "en" in item and "es" in item and "key" in item, name
        for lang in ("en", "es"):
            words = {w.strip(".,:;!?()[]{}\"'").lower() for w in item[lang].split()}
            assert not (words & banned), f"Banned word in {name}.{lang}: {words & banned}"


def test_api_serves_real_replays_and_results():
    client = TestClient(create_app(ROOT / "data"))
    replays_res = client.get("/v1/replays")
    assert replays_res.status_code == 200
    assert len(replays_res.json()["storms"]) == 5

    storm_res = client.get("/v1/replays/halloween-2013")
    assert storm_res.status_code == 200
    assert storm_res.json()["schema"] == "fordcast.replay.v1"

    results_res = client.get("/v1/results")
    assert results_res.status_code == 200
    assert results_res.json()["schema"] == "fordcast.results.v1"
    assert results_res.json()["hero"]["crossing_id"] == "atx-7"
