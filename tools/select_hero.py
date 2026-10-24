"""Deterministic median-lead closest-to-median hero selector (§18.13). Never cherry-picks the maximum lead."""

import argparse
import json
import sys
from pathlib import Path
from typing import Any

HERO_RULE_TEXT = "proxy-reference AVOID hit closest to the overall median lead; ties: catalog order, then crossing id"


def compute_heroes(
    results: dict[str, Any],
) -> tuple[dict[str, Any] | None, dict[str, dict[str, Any] | None]]:
    """Compute overall `hero` and `hero_by_storm` from a fordcast.results.v1 document."""
    storms_by_id = {s["id"]: s for s in results.get("storms", [])}
    bundled_ids = {s["id"] for s in results.get("storms", []) if s.get("bundle", False)}
    target = results.get("headline", {}).get("median_lead_min")
    per_crossing = (
        results.get("methods", {})
        .get("upstream_rule", {})
        .get("avoid", {})
        .get("per_crossing", [])
    )

    if target is None:
        return None, {sid: None for sid in sorted(bundled_ids)}

    target_f = float(target)
    eligible = [
        row
        for row in per_crossing
        if row.get("lead_min") is not None
        and row.get("truth_quality") == "proxy"
        and row.get("storm_id") in bundled_ids
    ]

    def sort_key(row: dict[str, Any]) -> tuple[float, int, str, str]:
        sid = str(row["storm_id"])
        order = int(storms_by_id.get(sid, {}).get("catalog_order", 999))
        return (
            round(abs(float(row["lead_min"]) - target_f), 6),
            order,
            str(row["crossing_id"]),
            str(row.get("onset") or ""),
        )

    overall_hero: dict[str, Any] | None = None
    if eligible:
        winner = min(eligible, key=sort_key)
        overall_hero = {
            "storm_id": winner["storm_id"],
            "crossing_id": winner["crossing_id"],
            "lead_min": winner["lead_min"],
            "level": "avoid",
            "onset": winner["onset"],
            "first_alert_at": winner["first_alert_at"],
            "censored": bool(winner.get("censored", False)),
            "target_median_lead_min": target,
            "rule": HERO_RULE_TEXT,
        }

    hero_by_storm: dict[str, dict[str, Any] | None] = {}
    for sid in sorted(
        bundled_ids, key=lambda x: int(storms_by_id[x].get("catalog_order", 999))
    ):
        storm_candidates = [row for row in eligible if row.get("storm_id") == sid]
        if not storm_candidates:
            hero_by_storm[sid] = None
        else:
            w = min(storm_candidates, key=sort_key)
            hero_by_storm[sid] = {
                "crossing_id": w["crossing_id"],
                "lead_min": w["lead_min"],
                "level": "avoid",
                "onset": w["onset"],
                "first_alert_at": w["first_alert_at"],
                "censored": bool(w.get("censored", False)),
            }

    return overall_hero, hero_by_storm


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Select or verify deterministic median-lead hero example (§18.13)."
    )
    parser.add_argument("file", type=Path, help="Path to docs/results/results.json")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Verify existing hero fields without modifying",
    )
    args = parser.parse_args(argv)

    data = json.loads(args.file.read_text(encoding="utf-8"))
    hero, hero_by_storm = compute_heroes(data)

    if args.check:
        if data.get("hero") != hero or data.get("hero_by_storm") != hero_by_storm:
            print(
                "Hero check failed: committed hero does not match deterministic median-lead rule.",
                file=sys.stderr,
            )
            return 1
        return 0

    data["hero"] = hero
    data["hero_by_storm"] = hero_by_storm
    args.file.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
