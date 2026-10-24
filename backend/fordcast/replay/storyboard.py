"""Deterministic storyboard generation from §3.7 templates (§19.13)."""

import json
from collections.abc import Mapping, Sequence
from datetime import datetime
from pathlib import Path
from typing import Any

TEMPLATES_PATH = Path(__file__).with_name("storyboard_templates.json")


def load_templates() -> dict[str, dict[str, str]]:
    return json.loads(TEMPLATES_PATH.read_text(encoding="utf-8"))


def _render(template: str, params: Mapping[str, Any]) -> str:
    out = template
    for k, v in params.items():
        out = out.replace(f"{{{{{k}}}}}", str(v))
    return out


def build_storyboard(
    events: Sequence[dict[str, Any]],
    outages: Sequence[dict[str, Any]],
    gauge_names: Mapping[str, str],
) -> list[dict[str, str]]:
    """Generate at most 8 storyboard callouts sorted by time (§19.13)."""
    templates = load_templates()
    lines: list[dict[str, str]] = []
    seen_kinds_per_gauge: set[tuple[str, str]] = set()
    has_first_watch = False
    has_first_avoid = False

    for ev in sorted(events, key=lambda e: (e["t"], e["crossing_id"])):
        t_iso = ev["t"]
        state = ev["state"]
        reasons = ev.get("reasons") or []

        if state == "watch" and not has_first_watch:
            for r in reasons:
                gid = r.get("gauge_id")
                if gid and r.get("code") in {"UPSTREAM_RISING", "UPSTREAM_ABOVE_TRIGGER"}:
                    gname = gauge_names.get(gid, gid)
                    tpl = templates["first_watch"]
                    lines.append(
                        {
                            "t": t_iso,
                            "kind": "first_watch",
                            "en": _render(tpl["en"], {"gauge": gname}),
                            "es": _render(tpl["es"], {"gauge": gname}),
                        }
                    )
                    has_first_watch = True
                    break

        elif state == "avoid" and not has_first_avoid:
            for r in reasons:
                if r.get("code") == "UPSTREAM_ABOVE_TRIGGER" and r.get("gauge_id"):
                    gid = r["gauge_id"]
                    gname = gauge_names.get(gid, gid)
                    rise_val = r.get("rise_ft_30m")
                    rise_str = f"{float(rise_val):.1f}" if rise_val is not None else "0.2"
                    tau_lo = r.get("tau_lo_min", 30)
                    tau_hi = r.get("tau_hi_min", 60)
                    tpl = templates["first_avoid"]
                    lines.append(
                        {
                            "t": t_iso,
                            "kind": "first_avoid",
                            "en": _render(
                                tpl["en"],
                                {
                                    "gauge": gname,
                                    "rise": rise_str,
                                    "tau_lo": tau_lo,
                                    "tau_hi": tau_hi,
                                },
                            ),
                            "es": _render(
                                tpl["es"],
                                {
                                    "gauge": gname,
                                    "rise": rise_str,
                                    "tau_lo": tau_lo,
                                    "tau_hi": tau_hi,
                                },
                            ),
                        }
                    )
                    has_first_avoid = True
                    break

        elif state == "unknown":
            for r in reasons:
                if r.get("code") == "DATA_STALE" and r.get("gauge_id"):
                    gid = r["gauge_id"]
                    gname = gauge_names.get(gid, gid)
                    if any(o["site"] == gid and o["start"] <= t_iso < o["end"] for o in outages):
                        if ("gauge_silent", gid) in seen_kinds_per_gauge:
                            continue
                        seen_kinds_per_gauge.add(("gauge_silent", gid))
                        tpl = templates["gauge_silent"]
                        lines.append(
                            {
                                "t": t_iso,
                                "kind": "gauge_silent",
                                "en": _render(tpl["en"], {"gauge": gname}),
                                "es": _render(tpl["es"], {"gauge": gname}),
                            }
                        )
                    else:
                        if ("gauge_gap", gid) in seen_kinds_per_gauge:
                            continue
                        seen_kinds_per_gauge.add(("gauge_gap", gid))
                        last_obs = r.get("last_obs_at")
                        age_min = 80
                        if last_obs:
                            dt_ev = datetime.fromisoformat(t_iso)
                            dt_obs = datetime.fromisoformat(last_obs)
                            age_min = max(1, round((dt_ev - dt_obs).total_seconds() / 60))
                        tpl = templates["gauge_gap"]
                        lines.append(
                            {
                                "t": t_iso,
                                "kind": "gauge_gap",
                                "en": _render(
                                    tpl["en"], {"gauge": gname, "age": f"{age_min} min ago"}
                                ),
                                "es": _render(
                                    tpl["es"], {"gauge": gname, "age": f"hace {age_min} min"}
                                ),
                            }
                        )

    # Also ensure if a storm has a documented outage on a gauge (e.g. halloween-2013 USGS-08159000)
    # and no event emitted gauge_silent yet, emit it at the outage start + 60m when the outage takes effect
    for o in outages:
        gid = o["site"]
        if ("gauge_silent", gid) not in seen_kinds_per_gauge:
            seen_kinds_per_gauge.add(("gauge_silent", gid))
            gname = gauge_names.get(gid, gid)
            tpl = templates["gauge_silent"]
            lines.append(
                {
                    "t": o["start"],
                    "kind": "gauge_silent",
                    "en": _render(tpl["en"], {"gauge": gname}),
                    "es": _render(tpl["es"], {"gauge": gname}),
                }
            )

    lines.sort(key=lambda item: item["t"])
    return lines[:8]
