from datetime import timedelta
from math import isnan

from conftest import NOW

from fordcast.scoring.metrics import (
    Episode,
    Frame,
    MatchResult,
    Onset,
    bootstrap_ci,
    episodes_from_frames,
    match_events,
    scores,
)


def episode(minutes, end=None, cid="c"):
    return Episode(
        cid,
        NOW + timedelta(minutes=minutes),
        NOW + timedelta(minutes=minutes if end is None else end),
        "avoid",
    )


def match(episodes, onsets):
    return match_events(episodes, onsets, fa_window_min=lambda _: 120)


def test_one_hit_one_miss_one_false_alarm():
    result = match([episode(-30), episode(90)], [Onset("c", "s", NOW), Onset("d", "s", NOW)])
    value = scores(result)
    assert (value["H"], value["M"], value["F"]) == (1, 1, 1)
    assert value["pod"] == 0.5 and value["far"] == 0.5 and value["csi"] == 1 / 3


def test_boundary_and_capped_active_alert():
    onset = [Onset("c", "s", NOW)]
    assert match([episode(0)], onset).hits[0].lead_min == 0
    assert match([episode(-181)], onset).misses
    capped = match([episode(-181, 0)], onset).hits[0]
    assert capped.capped and capped.lead_min == 180
    assert match([episode(1)], onset).misses


def test_duplicate_episodes_not_double_counted_and_unknown_is_miss():
    result = match([episode(-100), episode(-20)], [Onset("c", "s", NOW)])
    assert len(result.hits) == 1 and result.hits[0].lead_min == 100 and not result.false_alarms
    assert match([episode(-20)], [Onset("c", "s", NOW, unknown_at_onset=True)]).misses


def test_empty_denominators_and_bootstrap_determinism():
    assert isnan(scores(MatchResult((), (), ()))["pod"])
    result = match([episode(-30)], [Onset("c", "s", NOW)])
    assert bootstrap_ci({"s": result}, n=20) == bootstrap_ci({"s": result}, n=20)


def test_unknown_and_missing_ticks_split_episodes():
    frames = [
        Frame(NOW + timedelta(minutes=m), {"c": state})
        for m, state in [(0, "watch"), (5, "avoid"), (10, "unknown"), (15, "closed"), (30, "avoid")]
    ]
    assert len(episodes_from_frames(frames, "avoid")) == 3
