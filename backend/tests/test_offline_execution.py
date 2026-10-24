from datetime import timedelta

import pytest
from conftest import NOW, readings

from fordcast.replay.build import run_replay
from fordcast.replay.offline import run_offline
from fordcast.tick import RiskModel


def test_offline_runner_rejects_io():
    class WaitForExternalIO:
        def __await__(self):
            yield "external work"

    async def invalid():
        await WaitForExternalIO()

    with pytest.raises(RuntimeError, match="asynchronous I/O"):
        run_offline(invalid())


def test_offline_replay_uses_same_tick_and_clock(crossing, link):
    model = RiskModel("fixture", (crossing,), {crossing.id: (link,)})
    frames = run_offline(
        run_replay(
            readings([8, 9, 11]),
            model,
            window_start=NOW,
            window_end=NOW + timedelta(minutes=10),
            delays={"test-upstream": 0},
        )
    )
    assert [frame.at for frame in frames] == [
        NOW,
        NOW + timedelta(minutes=5),
        NOW + timedelta(minutes=10),
    ]
    assert all(frame.states[crossing.id] == "avoid" for frame in frames)
