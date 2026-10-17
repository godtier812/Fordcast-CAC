import numpy as np
import pandas as pd
import pytest

from fordcast.linking.travel_time import LagEstimate, combine_storms, estimate_lag


@pytest.mark.parametrize("lag", [35, 40, 45, 240])
def test_recovers_known_lag(lag):
    t = np.arange(0, 1440, 5)
    stage = lambda x: (
        3 + 10 * np.exp(-(((x - 400) / 70) ** 2)) + 5 * np.exp(-(((x - 800) / 40) ** 2))
    )
    index = pd.date_range("2025-05-25", periods=len(t), freq="5min", tz="UTC")
    result = estimate_lag(pd.Series(stage(t), index), pd.Series(stage(t - lag), index), "fixture")
    assert result is not None
    assert abs(result.lag_min - lag) <= 1


def test_constant_has_no_lag():
    index = pd.date_range("2025-05-25", periods=200, freq="5min", tz="UTC")
    s = pd.Series(3.0, index)
    assert estimate_lag(s, s, "constant") is None


def test_zero_lag_single_storm_without_distance_requires_review():
    result = combine_storms([LagEstimate(0, 0.9, "a")], None)
    assert result is not None and result.needs_review
    assert len(result.notes) == 3


def test_storm_combination_and_celerity():
    result = combine_storms([LagEstimate(x, 0.9, str(x)) for x in (30, 40, 50)], 6)
    assert result and result.lag_min == 40 and result.lag_p25_min == 35 and result.lag_p75_min == 45
    assert result.celerity_ms == 2.5 and not result.needs_review
    assert combine_storms([LagEstimate(40, 0.9, "a")], 100).needs_review
