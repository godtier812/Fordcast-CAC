from dataclasses import replace
from datetime import timedelta

import pytest
from conftest import NOW, readings

from fordcast.sources.base import LookaheadError, assert_no_lookahead
from fordcast.sources.official import EmptyOfficial
from fordcast.sources.replay import Outage, RecordedSource, StormReplaySource
from fordcast.tick import MemoryStateStore, RiskModel, tick


@pytest.mark.asyncio
@pytest.mark.parametrize("provider", [RecordedSource, StormReplaySource])
async def test_parameters_do_not_overwrite_each_other(provider):
    stage = readings([5])[0]
    discharge = replace(stage, param="00060", value=900)
    source = provider([stage, discharge])
    at = NOW + timedelta(minutes=60)
    result = await source.series([stage.gauge_id], "00065", at, timedelta(hours=2))
    assert [r.value for r in result[stage.gauge_id]] == [5]


@pytest.mark.asyncio
async def test_prefix_invariance_and_future_poison(crossing, link):
    prefix = readings([8, 9, 11])
    poisoned = prefix + readings([1e9], end=NOW + timedelta(minutes=15))
    model = RiskModel("fixture", (crossing,), {crossing.id: (link,)})
    a = await tick(NOW, RecordedSource(prefix), EmptyOfficial(), MemoryStateStore(), model)
    b = await tick(NOW, RecordedSource(poisoned), EmptyOfficial(), MemoryStateStore(), model)
    assert a == b


@pytest.mark.asyncio
async def test_delay_and_outage_are_respected():
    rows = readings([5])
    source = StormReplaySource(rows)
    assert not (
        await source.series(
            ["test-upstream"], "00065", NOW + timedelta(minutes=59), timedelta(hours=6)
        )
    )["test-upstream"]
    assert (
        await source.series(
            ["test-upstream"], "00065", NOW + timedelta(minutes=60), timedelta(hours=6)
        )
    )["test-upstream"]
    outage = Outage("test-upstream", NOW, NOW + timedelta(hours=3), "test fixture")
    source = StormReplaySource(rows, outages=[outage])
    assert not (
        await source.series(
            ["test-upstream"], "00065", NOW + timedelta(hours=2), timedelta(hours=6)
        )
    )["test-upstream"]
    assert (await source.series(["test-upstream"], "00065", outage.end, timedelta(hours=6)))[
        "test-upstream"
    ]


def test_guard_rejects_future_delivery():
    with pytest.raises(LookaheadError):
        assert_no_lookahead(readings([3], delay=15), NOW)


@pytest.mark.asyncio
async def test_left_open_lookback_and_parameter_filter():
    source = RecordedSource(readings([1, 2, 3]))
    result = await source.series(["test-upstream", "missing"], "00065", NOW, timedelta(minutes=30))
    assert [r.value for r in result["test-upstream"]] == [2, 3]
    assert result["missing"] == []
    assert (await source.series(["test-upstream"], "00060", NOW, timedelta(hours=1)))[
        "test-upstream"
    ] == []
