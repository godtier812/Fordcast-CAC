"""Build a historical flood-risk dataset for FordCast crossings from NOAA NCEI Storm Events.

Downloads (and caches) the Storm Events bulk "details" and "fatalities" CSVs for
1996..latest year, filters to Central Texas flood events, and counts reports near
each low-water crossing in mobile/assets/seed/crossings.json.

Outputs:
  mobile/assets/history/crossing_history.json  (schema fordcast.history.v1)

Standard library only. Run with:
  backend\\.venv\\Scripts\\python.exe tools\\build_flood_history.py
"""

import csv
import gzip
import io
import json
import math
import os
import re
import sys
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_URL = "https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/"
CACHE_DIR = os.path.join(ROOT, "data", "raw", "stormevents")
CROSSINGS_PATH = os.path.join(ROOT, "mobile", "assets", "seed", "crossings.json")
OUT_PATH = os.path.join(ROOT, "mobile", "assets", "history", "crossing_history.json")

START_YEAR = 1996
RADIUS_KM = 2.0
COUNTIES = ["TRAVIS", "HAYS", "WILLIAMSON", "BASTROP", "CALDWELL", "BURNET", "BLANCO", "COMAL"]
EVENT_TYPES = ("Flash Flood", "Flood", "Heavy Rain")
REPORT_TYPES = ("Flash Flood", "Flood")
MAX_EVENTS_PER_CROSSING = 5
SUMMARY_CHARS = 220
VEHICLE_RE = re.compile(
    r"\b(vehicles?|cars?|trucks?|suvs?|swept|stranded|rescues?|rescued|water rescues?|"
    r"low[- ]water crossings?)\b",
    re.IGNORECASE,
)

csv.field_size_limit(min(sys.maxsize, 2**31 - 1))


def log(msg):
    print(msg, flush=True)


def fetch(url, retries=3, timeout=120):
    last = None
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "FordCast-history-builder/1.0"})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except (urllib.error.URLError, OSError, TimeoutError) as e:
            last = e
            log(f"  ! attempt {attempt}/{retries} failed for {url}: {e}")
            time.sleep(2 * attempt)
    raise RuntimeError(f"failed after {retries} attempts: {url}: {last}")


def list_files():
    cached_names = set()
    if os.path.isdir(CACHE_DIR):
        cached_names = {n for n in os.listdir(CACHE_DIR) if n.endswith(".csv.gz")}
    if len(cached_names) >= 50:
        names = cached_names
    else:
        html = fetch(BASE_URL).decode("utf-8", "replace")
        names = set(re.findall(r'href="(StormEvents_[^"]+\.csv\.gz)"', html)) | cached_names
    details, fatal = {}, {}
    pat = re.compile(r"StormEvents_(details|fatalities)-ftp_v1\.0_d(\d{4})_c(\d{8})\.csv\.gz")
    for n in names:
        m = pat.fullmatch(n)
        if not m:
            continue
        kind, year, created = m.group(1), int(m.group(2)), m.group(3)
        target = details if kind == "details" else fatal
        # keep the most recently created version for each year
        if year not in target or created > target[year][0]:
            target[year] = (created, n)
    return {y: v[1] for y, v in details.items()}, {y: v[1] for y, v in fatal.items()}


def cached(name):
    path = os.path.join(CACHE_DIR, name)
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return path
    data = fetch(BASE_URL + name)
    tmp = path + ".part"
    with open(tmp, "wb") as f:
        f.write(data)
    os.replace(tmp, path)
    log(f"  downloaded {name} ({len(data) / 1e6:.1f} MB)")
    return path


def read_gz_csv(path):
    with gzip.open(path, "rb") as gz:
        text = io.TextIOWrapper(gz, encoding="latin-1", newline="")
        for row in csv.DictReader(text):
            yield row


def to_float(s):
    try:
        v = float(s)
        return v if v != 0.0 else None
    except (TypeError, ValueError):
        return None


def to_int(s):
    try:
        return int(float(s))
    except (TypeError, ValueError):
        return 0


def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def collapse(s):
    return re.sub(r"\s+", " ", s or "").strip()


def process_year(year, details_name, fatal_name):
    """Return (events, fatalities_by_event) for one year. Raises on permanent failure."""
    dpath = cached(details_name)
    events = []
    for row in read_gz_csv(dpath):
        if (row.get("STATE") or "").strip().upper() != "TEXAS":
            continue
        cz_name = (row.get("CZ_NAME") or "").strip().upper()
        cz_type = (row.get("CZ_TYPE") or "").strip().upper()
        etype = (row.get("EVENT_TYPE") or "").strip()
        if cz_name not in COUNTIES or etype not in EVENT_TYPES or cz_type not in ("C", "Z"):
            continue
        blat, blon = to_float(row.get("BEGIN_LAT")), to_float(row.get("BEGIN_LON"))
        elat, elon = to_float(row.get("END_LAT")), to_float(row.get("END_LON"))
        points = []
        if blat is not None and blon is not None:
            points.append((blat, blon))
        if elat is not None and elon is not None:
            points.append((elat, elon))
        if not points:
            continue
        if cz_type == "Z" and (blat is None or blon is None):
            continue
        ym = (row.get("BEGIN_YEARMONTH") or "").strip()
        day = to_int(row.get("BEGIN_DAY"))
        date = f"{ym[:4]}-{ym[4:6]}-{day:02d}" if len(ym) == 6 and day else None
        narrative = row.get("EVENT_NARRATIVE") or ""
        episode = row.get("EPISODE_NARRATIVE") or ""
        events.append({
            "event_id": (row.get("EVENT_ID") or "").strip(),
            "date": date,
            "type": etype,
            "county": cz_name,
            "points": points,
            "deaths": to_int(row.get("DEATHS_DIRECT")) + to_int(row.get("DEATHS_INDIRECT")),
            "injuries": to_int(row.get("INJURIES_DIRECT")) + to_int(row.get("INJURIES_INDIRECT")),
            "vehicle_text": bool(VEHICLE_RE.search(narrative) or VEHICLE_RE.search(episode)),
            "summary": collapse(narrative)[:SUMMARY_CHARS],
        })

    fatal = {}
    if fatal_name and events:
        wanted = {e["event_id"] for e in events}
        fpath = cached(fatal_name)
        for row in read_gz_csv(fpath):
            eid = (row.get("EVENT_ID") or "").strip()
            if eid in wanted:
                fatal.setdefault(eid, []).append((row.get("FATALITY_LOCATION") or "").strip())
    return events, fatal


def main():
    os.makedirs(CACHE_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)

    with open(CROSSINGS_PATH, encoding="utf-8") as f:
        fc = json.load(f)
    crossings = []
    for feat in fc["features"]:
        lon, lat = feat["geometry"]["coordinates"][:2]
        crossings.append((feat["properties"]["id"], lat, lon))
    log(f"Loaded {len(crossings)} crossings")

    log("Listing NCEI directory...")
    details_files, fatal_files = list_files()
    latest = max(details_files) if details_files else datetime.now().year
    years = list(range(START_YEAR, latest + 1))
    log(f"Years {START_YEAR}..{latest}: {len(details_files)} details files, {len(fatal_files)} fatalities files")

    missing_years = []
    all_events = []
    fatalities = {}

    def job(y):
        if y not in details_files:
            raise RuntimeError("no details file listed")
        return process_year(y, details_files[y], fatal_files.get(y))

    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {y: pool.submit(job, y) for y in years}
        for y in years:
            try:
                ev, fat = futures[y].result()
                all_events.extend(ev)
                fatalities.update(fat)
                log(f"[{y}] {len(ev)} matching events with coordinates, {sum(len(v) for v in fat.values())} fatality rows")
            except Exception as e:  # noqa: BLE001
                log(f"[{y}] FAILED permanently, skipping: {e}")
                missing_years.append(y)

    # Annotate events
    for e in all_events:
        locs = fatalities.get(e["event_id"], [])
        e["vehicle_deaths"] = sum(1 for loc in locs if "vehicle" in loc.lower())
        e["vehicle_related"] = e["vehicle_text"] or e["vehicle_deaths"] > 0

    reports = [e for e in all_events if e["type"] in REPORT_TYPES]
    heavy_rain = len(all_events) - len(reports)
    log(f"Total Flash Flood/Flood events with coordinates: {len(reports)} (Heavy Rain ignored: {heavy_rain})")

    out_crossings = {}
    for cid, clat, clon in crossings:
        near = []
        nearest = None
        for e in reports:
            d = min(haversine_km(clat, clon, la, lo) for la, lo in e["points"])
            if nearest is None or d < nearest:
                nearest = d
            if d <= RADIUS_KM:
                near.append((e, d))
        near.sort(key=lambda t: (t[0]["date"] or "", t[0]["event_id"]), reverse=True)
        n_reports = len(near)
        deaths = sum(e["deaths"] for e, _ in near)
        vrel = sum(1 for e, _ in near if e["vehicle_related"])
        if deaths > 0 or vrel >= 2 or n_reports >= 8:
            tier = "high"
        elif n_reports >= 3 or vrel >= 1:
            tier = "elevated"
        else:
            tier = "none"
        out_crossings[cid] = {
            "reports": n_reports,
            "flash_flood_reports": sum(1 for e, _ in near if e["type"] == "Flash Flood"),
            "deaths": deaths,
            "vehicle_deaths": sum(e["vehicle_deaths"] for e, _ in near),
            "injuries": sum(e["injuries"] for e, _ in near),
            "vehicle_related": vrel,
            "nearest_km": round(nearest, 2) if nearest is not None else None,
            "last_event": near[0][0]["date"] if near else None,
            "risk_tier": tier,
            "event_ids": [e["event_id"] for e, _ in near if e.get("event_id")],
            "events": [
                {
                    "event_id": e["event_id"],
                    "date": e["date"],
                    "type": e["type"],
                    "dist_km": round(d, 2),
                    "deaths": e["deaths"],
                    "vehicle_related": bool(e["vehicle_related"]),
                    "summary": e["summary"],
                }
                for e, d in near[:MAX_EVENTS_PER_CROSSING]
            ],
        }

    dates = [e["date"] for e in reports if e["date"]]
    out = {
        "schema": "fordcast.history.v1",
        "source": "NOAA NCEI Storm Events Database (details + fatalities CSV)",
        "source_url": "https://www.ncei.noaa.gov/stormevents/",
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "period": {"start": f"{START_YEAR}-01-01", "end": max(dates) if dates else None},
        "missing_years": missing_years,
        "radius_km": RADIUS_KM,
        "counties": COUNTIES,
        "total_events_in_area": len(reports),
        "crossings": out_crossings,
    }

    def dump(obj):
        return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))

    text = dump(out)
    limit = SUMMARY_CHARS
    while len(text.encode("utf-8")) > 400_000 and limit > 40:
        limit -= 40
        for c in out_crossings.values():
            for ev in c["events"]:
                ev["summary"] = ev["summary"][:limit]
        text = dump(out)
    with open(OUT_PATH, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    log(f"Wrote {OUT_PATH} ({len(text.encode('utf-8')) / 1024:.1f} KB)")

    tiers = {"high": 0, "elevated": 0, "none": 0}
    for c in out_crossings.values():
        tiers[c["risk_tier"]] += 1
    log(f"Tiers: {tiers}; missing years: {missing_years}")


if __name__ == "__main__":
    main()
