from datetime import UTC, datetime, timedelta

import pytest

from fordcast.domain import Crossing, Gauge, Link
from fordcast.sources.base import Reading

NOW = datetime(2025, 5, 25, 12, tzinfo=UTC)


@pytest.fixture
def crossing():
    return Crossing("test-crossing", "Test fixture", -97.7, 30.2, "A")


@pytest.fixture
def link():
    return Link("test-crossing", Gauge("test-upstream"), 40, 30, 50, 10, 7, 3)


def readings(values, *, gauge="test-upstream", end=NOW, step=15, delay=0):
    return [
        Reading(
            gauge,
            "00065",
            end - timedelta(minutes=(len(values) - i - 1) * step),
            end - timedelta(minutes=(len(values) - i - 1) * step) + timedelta(minutes=delay),
            value,
        )
        for i, value in enumerate(values)
    ]
