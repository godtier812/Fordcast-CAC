from dataclasses import replace
from datetime import timedelta

import pytest
from conftest import NOW, readings
from hypothesis import given
from hypothesis import strategies as st

from fordcast.domain import RANK, RawState, Reason, RuleResult, Tracker
from fordcast.features.compute import crossing_is_stale, rise
from fordcast.model.baseline_rule import evaluate
from fordcast.model.combine import resolve_raw_state
from fordcast.model.state_machine import StepContext, step
from fordcast.model.windows import ALLOWED_WINDOWS, to_window
from fordcast.sources.base import OfficialStatus
from fordcast.sources.official import is_fresh_official


@pytest.mark.parametrize(
    "values,state",
    [([5, 5, 5], "no_rise"), ([6, 7, 8], "watch"), ([8, 9, 11], "avoid"), ([11, 11, 11], "avoid")],
)
def test_rule_branches(crossing, link, values, state):
    result = evaluate(crossing, [link], {link.gauge.id: readings(values)}, NOW)
    assert result.state == state
    assert result.window is None or result.window in ALLOWED_WINDOWS


def test_stale_primary_cannot_be_hidden_by_calm_secondary(crossing, link):
    second = replace(link, gauge=replace(link.gauge, id="second"), is_primary=False)
    series = {"second": readings([4, 4, 4], gauge="second")}
    result = evaluate(crossing, [link, second], series, NOW)
    assert crossing_is_stale([link, second], series, NOW, result)
    series["second"] = readings([8, 9, 11], gauge="second")
    assert not crossing_is_stale(
        [link, second], series, NOW, evaluate(crossing, [link, second], series, NOW)
    )


def test_far_wave_is_watch_without_window(crossing, link):
    link = replace(link, lag_min=150, lag_p25_min=140, lag_p75_min=160)
    result = evaluate(crossing, [link], {link.gauge.id: readings([8, 9, 11])}, NOW)
    assert result.state == "watch" and result.window is None


def test_stale_gauge_is_ignored(crossing, link):
    result = evaluate(
        crossing, [link], {link.gauge.id: readings([8, 10, 12], end=NOW - timedelta(hours=2))}, NOW
    )
    assert result.state == "no_rise"
    assert resolve_raw_state(None, False, True, "A", result).state == "unknown"


def test_rise_anchors_on_observation_not_wall_clock():
    assert rise(readings([1, 2, 3], end=NOW - timedelta(minutes=55))) == 2
    assert rise(readings([1, 3], step=60)) is None


@pytest.mark.parametrize(
    "lo,hi,w", [(10, 20, (0, 30)), (16, 70, (15, 60)), (40, 45, (30, 60)), (95, 120, None)]
)
def test_window_examples(lo, hi, w):
    assert to_window(lo, hi) == w


@given(st.floats(-100, 300), st.floats(-100, 300))
def test_windows_never_become_countdowns(lo, hi):
    assert to_window(lo, hi) in ALLOWED_WINDOWS | {None}


@pytest.mark.parametrize(
    "official,water,stale,tier,expected",
    [
        ("closed", False, True, "C", "closed"),
        ("open", True, True, "C", "closed"),
        ("open", False, True, "A", "unknown"),
        ("caution", False, True, "C", "watch"),
        ("open", False, False, "A", "avoid"),
    ],
)
def test_precedence_uses_real_official_objects(official, water, stale, tier, expected):
    record = OfficialStatus("c", "manual", official, NOW, expires_at=NOW + timedelta(hours=2))
    assert resolve_raw_state(record, water, stale, tier, RuleResult("avoid")).state == expected


def test_official_future_and_expiry():
    record = OfficialStatus("c", "manual", "closed", NOW, expires_at=NOW + timedelta(hours=2))
    assert is_fresh_official(record, NOW)
    assert not is_fresh_official(record, NOW - timedelta(seconds=1))
    assert not is_fresh_official(record, NOW + timedelta(hours=2))


def test_dwell_is_one_level_and_duplicate_ticks_do_not_count():
    tr = step(
        Tracker(),
        RawState("avoid", reasons=(Reason("UPSTREAM_ABOVE_TRIGGER"),)),
        NOW,
        StepContext(),
    )
    for _ in range(50):
        tr = step(tr, RawState("no_rise"), NOW, StepContext(extra_condition_ok=True))
    assert tr.state == "avoid" and tr.calm_ticks == 0
    for i in range(1, 7):
        tr = step(
            tr,
            RawState("no_rise"),
            NOW + timedelta(minutes=5 * i),
            StepContext(extra_condition_ok=True),
        )
    assert tr.state == "watch" and tr.window is None and tr.reasons


def test_outage_preserves_last_known_and_recovers_cautiously():
    tr = step(Tracker(), RawState("avoid"), NOW, StepContext())
    tr = step(
        tr,
        RawState("unknown", reasons=(Reason("DATA_STALE"),)),
        NOW + timedelta(minutes=5),
        StepContext(),
    )
    assert tr.state == "unknown" and tr.last_known_state == "avoid" and tr.last_known_at == NOW
    tr = step(tr, RawState("no_rise"), NOW + timedelta(minutes=10), StepContext())
    assert tr.state == "watch" and tr.held


def test_lost_official_never_quietly_lowers_closure():
    tr = step(
        Tracker(),
        RawState("closed", closed_source="official"),
        NOW,
        StepContext(official_fresh=True),
    )
    tr = step(tr, RawState("no_rise"), NOW + timedelta(minutes=5), StepContext())
    assert tr.state == "unknown" and tr.last_known_state == "closed"


@given(
    st.sampled_from(["no_rise", "watch", "avoid", "closed"]),
    st.sampled_from(["watch", "avoid", "closed"]),
)
def test_escalation_is_immediate(current, raw):
    if RANK[raw] > RANK[current]:
        tr = Tracker(state=current)
        assert step(tr, RawState(raw), NOW, StepContext()).state == raw
