"""Ground-truth overtop episode extraction and censored-onset handling (§18.2)."""

import csv
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

from fordcast.scoring.metrics import Onset
from fordcast.sources.base import Reading


@dataclass(frozen=True)
class TruthEpisode:
    crossing_id: str
    storm_id: str
    onset: datetime
    end: datetime
    quality: str
    censored: bool = False
    notes: str = ""


def extract_truth_episodes(
    readings: Sequence[Reading],
    overtop_stage_ft: float,
    *,
    crossing_id: str,
    storm_id: str,
    quality: str,
    window_start: datetime | None = None,
    window_end: datetime | None = None,
) -> list[TruthEpisode]:
    """Extract contiguous overtop runs (merging gaps < 60 min) with censored-onset detection."""
    sorted_rows = sorted(
        (
            r
            for r in readings
            if (window_start is None or r.obs_time >= window_start)
            and (window_end is None or r.obs_time <= window_end)
        ),
        key=lambda r: r.obs_time,
    )
    if not sorted_rows:
        return []

    raw_runs: list[tuple[int, int]] = []
    run_start: int | None = None
    run_last: int | None = None

    for idx, row in enumerate(sorted_rows):
        if row.value >= overtop_stage_ft:
            if run_start is None:
                run_start = idx
            run_last = idx
        elif run_start is not None and run_last is not None:
            raw_runs.append((run_start, run_last))
            run_start = None
            run_last = None

    if run_start is not None and run_last is not None:
        raw_runs.append((run_start, run_last))

    if not raw_runs:
        return []

    # Merge runs separated by < 60 min
    merged: list[tuple[int, int]] = [raw_runs[0]]
    for start_idx, end_idx in raw_runs[1:]:
        prev_start, prev_end = merged[-1]
        gap = sorted_rows[start_idx].obs_time - sorted_rows[prev_end].obs_time
        if gap < timedelta(minutes=60):
            merged[-1] = (prev_start, end_idx)
        else:
            merged.append((start_idx, end_idx))

    episodes: list[TruthEpisode] = []
    for start_idx, end_idx in merged:
        first_over = sorted_rows[start_idx]
        last_over = sorted_rows[end_idx]
        onset_time = first_over.obs_time
        censored = False
        notes = ""
        if start_idx > 0:
            prev_below = sorted_rows[start_idx - 1]
            if (
                prev_below.value < overtop_stage_ft
                and first_over.obs_time - prev_below.obs_time > timedelta(minutes=30)
            ):
                onset_time = prev_below.obs_time + timedelta(minutes=15)
                censored = True
                notes = f"Censored gap after {prev_below.obs_time.isoformat()}"
        end_time = max(last_over.obs_time, onset_time + timedelta(minutes=15))
        if window_end is not None and end_time > window_end:
            end_time = window_end
        episodes.append(
            TruthEpisode(
                crossing_id=crossing_id,
                storm_id=storm_id,
                onset=onset_time,
                end=end_time,
                quality=quality,
                censored=censored,
                notes=notes,
            )
        )
    return episodes


def write_truth_csv(path: Path, episodes: Sequence[TruthEpisode]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=["crossing_id", "onset", "end", "quality", "censored", "notes"],
        )
        writer.writeheader()
        for ep in sorted(episodes, key=lambda e: (e.crossing_id, e.onset)):
            writer.writerow(
                {
                    "crossing_id": ep.crossing_id,
                    "onset": ep.onset.isoformat().replace("+00:00", "Z"),
                    "end": ep.end.isoformat().replace("+00:00", "Z"),
                    "quality": ep.quality,
                    "censored": "true" if ep.censored else "false",
                    "notes": ep.notes,
                }
            )


def load_truth_episodes(
    data_dir: Path,
    storm_ids: Sequence[str],
    crossing_ids: Sequence[str] | None = None,
) -> list[TruthEpisode]:
    allowed = set(crossing_ids) if crossing_ids is not None else None
    out: list[TruthEpisode] = []
    for sid in storm_ids:
        csv_path = data_dir / "storms" / sid / "truth.csv"
        if not csv_path.exists():
            continue
        with csv_path.open("r", encoding="utf-8", newline="") as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                cid = row["crossing_id"]
                if allowed is not None and cid not in allowed:
                    continue
                out.append(
                    TruthEpisode(
                        crossing_id=cid,
                        storm_id=sid,
                        onset=datetime.fromisoformat(row["onset"]),
                        end=datetime.fromisoformat(row["end"]),
                        quality=row["quality"],
                        censored=row["censored"].strip().lower() == "true",
                        notes=row.get("notes") or "",
                    )
                )
    return sorted(out, key=lambda e: (e.storm_id, e.crossing_id, e.onset))


def load_onsets(
    data_dir: Path,
    storm_ids: Sequence[str],
    crossing_ids: Sequence[str] | None = None,
) -> list[Onset]:
    episodes = load_truth_episodes(data_dir, storm_ids, crossing_ids)
    return [
        Onset(
            crossing_id=ep.crossing_id,
            storm_id=ep.storm_id,
            t=ep.onset,
            censored=ep.censored,
            quality=ep.quality,
            unknown_at_onset=False,
        )
        for ep in episodes
    ]
