from math import ceil, floor

from fordcast.domain import Link


def tau_range(link: Link) -> tuple[int, int]:
    lower = link.lag_min - 10 if link.n_storms == 1 else link.lag_p25_min
    upper = link.lag_min + 10 if link.n_storms == 1 else link.lag_p75_min
    lo = max(5, 15 * floor(lower / 15))
    hi = 15 * ceil(upper / 15)
    return lo, max(lo + 15, hi)
