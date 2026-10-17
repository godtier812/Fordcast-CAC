from math import isfinite

BUCKETS = ((0, 15), (15, 30), (30, 60), (60, 90))
ALLOWED_WINDOWS = frozenset(BUCKETS + ((0, 30), (15, 60), (30, 90)))


def to_window(eta_lo: float, eta_hi: float) -> tuple[int, int] | None:
    if not isfinite(eta_lo) or not isfinite(eta_hi):
        raise ValueError("Arrival bounds must be finite")
    lo = max(0.0, eta_lo)
    if lo >= 90:
        return None
    hi = min(max(lo, eta_hi), 90 - 1e-9)
    i = next(k for k, (_, upper) in enumerate(BUCKETS) if lo < upper)
    j = min(next(k for k, (_, upper) in enumerate(BUCKETS) if hi < upper), i + 1)
    return BUCKETS[i][0], BUCKETS[j][1]
