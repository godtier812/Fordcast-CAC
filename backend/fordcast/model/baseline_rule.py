"""Agent-written implementation of §18.5; student review remains pending."""

from collections.abc import Mapping, Sequence
from datetime import datetime

from fordcast.domain import Crossing, Link, Reason, RuleResult
from fordcast.features.compute import is_fresh, last_upcrossing_time, rise
from fordcast.model.explain import tau_range
from fordcast.model.windows import to_window
from fordcast.sources.base import Reading


def evaluate(
    crossing: Crossing,
    links: Sequence[Link],
    series: Mapping[str, Sequence[Reading]],
    as_of: datetime,
) -> RuleResult:
    candidates: list[tuple[float, float, str, Reason]] = []
    watches: list[tuple[str, Reason]] = []
    for link in sorted(links, key=lambda item: item.gauge.id):
        rows = series.get(link.gauge.id, ())
        if link.relation != "upstream" or not is_fresh(rows, as_of, link.gauge.stale_after_min):
            continue
        value = rows[-1].value
        r30 = rise(rows)
        crossed = last_upcrossing_time(rows, link.trigger_stage_ft)
        elapsed = (as_of - crossed).total_seconds() / 60 if crossed is not None else None
        recent = elapsed is not None and elapsed <= link.lag_p75_min + 30
        if value >= link.trigger_stage_ft and (
            (r30 is not None and r30 > link.min_rise_ft_30m) or recent
        ):
            elapsed = (
                elapsed if elapsed is not None else (as_of - rows[-1].obs_time).total_seconds() / 60
            )
            lo = max(0, link.lag_p25_min - elapsed)
            hi = max(lo, link.lag_p75_min - elapsed)
            tau_lo, tau_hi = tau_range(link)
            reason = Reason(
                "UPSTREAM_ABOVE_TRIGGER",
                {
                    "gauge_id": link.gauge.id,
                    "value_ft": round(value, 1),
                    "rise_ft_30m": None if r30 is None else round(r30, 1),
                    "tau_lo_min": tau_lo,
                    "tau_hi_min": tau_hi,
                    "trigger_ft": link.trigger_stage_ft,
                    "obs_at": rows[-1].obs_time.isoformat(),
                },
            )
            candidates.append((lo, hi, link.gauge.id, reason))
        elif value >= link.watch_stage_ft and r30 is not None and r30 > 0.2:
            watches.append(
                (
                    link.gauge.id,
                    Reason(
                        "UPSTREAM_RISING",
                        {
                            "gauge_id": link.gauge.id,
                            "rise_ft_30m": round(r30, 1),
                            "value_ft": round(value, 1),
                            "watch_ft": link.watch_stage_ft,
                            "obs_at": rows[-1].obs_time.isoformat(),
                        },
                    ),
                )
            )
    candidates.sort(key=lambda item: (item[0], item[2]))
    reasons = tuple([c[3] for c in candidates] + [w[1] for w in watches])[:3]
    if candidates:
        lo, hi, gauge_id, _ = candidates[0]
        if lo < 90:
            return RuleResult("avoid", lo, hi, to_window(lo, hi), gauge_id, reasons)
        return RuleResult("watch", trigger_gauge_id=gauge_id, reasons=reasons)
    if watches:
        return RuleResult("watch", trigger_gauge_id=watches[0][0], reasons=reasons)
    return RuleResult()
