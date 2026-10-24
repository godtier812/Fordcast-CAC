# Historical flood reports near FordCast crossings (NOAA Storm Events)

**Output:** `mobile/assets/history/crossing_history.json` (schema `fordcast.history.v1`, ~80 KB)
**Script:** `tools/build_flood_history.py` (standard library only; run with `backend\.venv\Scripts\python.exe tools\build_flood_history.py`)
**Raw cache:** `data/raw/stormevents/` (gitignored via `data/raw/`)

## Source

NOAA NCEI Storm Events Database, bulk CSV files from
<https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/>:
`StormEvents_details-ftp_v1.0_dYYYY_c*.csv.gz` and `StormEvents_fatalities-ftp_v1.0_dYYYY_c*.csv.gz`
for 1996–2026. When a year has more than one file, the script uses the newest `c` (creation) date. Every year downloaded without errors (`missing_years: []`).

## Filters

- `STATE == "TEXAS"`, `CZ_NAME` in TRAVIS, HAYS, WILLIAMSON, BASTROP, CALDWELL, BURNET, BLANCO, COMAL. Both `CZ_TYPE == "C"` (county) rows and `CZ_TYPE == "Z"` (zone) rows count. Zone rows also need a `BEGIN_LAT`/`BEGIN_LON`.
- `EVENT_TYPE` in Flash Flood, Flood, Heavy Rain. Heavy Rain rows (2) get dropped afterwards and are not counted.
- Location comes from `BEGIN_LAT/LON` and `END_LAT/LON`. Rows with no coordinates are skipped. In practice this removes everything before April 2004, because flood events from that time have no point locations.
- Fatalities are joined on `EVENT_ID`. A **vehicle death** is a fatality whose `FATALITY_LOCATION` contains "Vehicle".
- An event is **vehicle_related** if `EVENT_NARRATIVE` or `EPISODE_NARRATIVE` matches vehicle/car/truck/SUV/swept/stranded/rescue/water rescue/low water crossing, or if it has a vehicle death.

## Matching and tiers

- An event counts for a crossing when its begin **or** end point is within **2.0 km** (haversine distance). `dist_km` is the shorter of the two distances.
- `reports` = Flash Flood + Flood events in range. `deaths` = `DEATHS_DIRECT + DEATHS_INDIRECT`, summed over those events. `injuries` is summed the same way.
- `risk_tier`:
  - **high**: deaths > 0, or vehicle_related ≥ 2, or reports ≥ 8
  - **elevated**: reports ≥ 3, or vehicle_related ≥ 1
  - **none**: everything else
- Each crossing keeps up to its 5 most recent events. Each event summary is the first 220 characters of the narrative, with whitespace collapsed.

## Counts

| Metric | Value |
|---|---|
| Flood + Flash Flood events with coordinates in the 8 counties | **727** (695 Flash Flood, 32 Flood) |
| Events by county | Travis 204, Williamson 122, Hays 83, Comal 82, Burnet 70, Bastrop 69, Caldwell 57, Blanco 40 |
| Events flagged vehicle-related by narrative | 284 |
| Deaths (direct + indirect) / vehicle deaths, all area events | 54 / 31 |
| Period with located events | 2004-04-10 → 2026-06-15 |
| Crossings: high / elevated / none | **37 / 25 / 79** (of 141) |
| Crossings with ≥1 death within 2 km | 22 |

## Top 15 crossings by reports

| # | id | Crossing | Reports | Flash Flood | Deaths | Veh. deaths | Veh.-related | Nearest km | Last event | Tier |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | atx-15 | Joe Tanner Rd Master Arm (N) | 21 | 21 | 0 | 0 | 10 | 0.02 | 2021-10-01 | high |
| 2 | atx-16 | Joe Tanner Ln Slave Arm (S) | 21 | 21 | 0 | 0 | 10 | 0.07 | 2021-10-01 | high |
| 3 | atx-1 | Old Bee Caves Rd. Master Arm (S) | 17 | 17 | 0 | 0 | 9 | 0.13 | 2021-10-01 | high |
| 4 | atx-2 | Old Bee Caves Rd. Slave Arm (N) | 17 | 17 | 0 | 0 | 9 | 0.11 | 2021-10-01 | high |
| 5 | atx-5 | Spicewood Springs Rd Slave Arm (S) | 13 | 13 | 1 | 1 | 8 | 0.18 | 2026-06-15 | high |
| 6 | tc-134 | Spicewood Springs Rd @ Bull Creek – Crossing 2 | 13 | 13 | 1 | 1 | 8 | 0.22 | 2026-06-15 | high |
| 7 | atx-11 | Old Spicewood Springs Rd Slave Arm (S) | 13 | 13 | 1 | 1 | 7 | 0.20 | 2026-06-15 | high |
| 8 | atx-9 | Old Spicewood Springs Rd Master Standpipe | 13 | 13 | 1 | 1 | 7 | 0.18 | 2026-06-15 | high |
| 9 | atx-10 | Old Spicewood Springs Rd Slave Arm (N) | 12 | 12 | 1 | 1 | 7 | 0.20 | 2026-06-15 | high |
| 10 | atx-8 | Wasson Rd Slave Arm (S) | 11 | 11 | 4 | 3 | 8 | 0.05 | 2022-08-22 | high |
| 11 | atx-4 | Spicewood Springs Rd Master Standpipe | 11 | 11 | 1 | 1 | 7 | 0.61 | 2026-06-15 | high |
| 12 | tc-135 | Spicewood Springs Rd @ Bull Creek – Crossing 3 | 11 | 11 | 1 | 1 | 7 | 0.35 | 2026-06-15 | high |
| 13 | tc-137 | Spicewood Springs Rd @ Bull Creek – Crossing 5 | 11 | 11 | 1 | 1 | 7 | 0.59 | 2026-06-15 | high |
| 14 | atx-7 | Wasson Rd Master Arm (N) | 10 | 10 | 4 | 3 | 8 | 0.01 | 2022-08-22 | high |
| 15 | tc-136 | Spicewood Springs Rd @ Bull Creek – Crossing 4 | 10 | 10 | 1 | 1 | 7 | 0.31 | 2026-06-15 | high |

## Limitations

- **Point locations are approximate.** Storm Events coordinates are often geocoded to a road, a town, or the center of a flooded area. A report within 2 km may involve a different road or creek.
- **Reports are not specific to a crossing.** One event can be near several crossings. Paired gate arms and nearby crossings (for example, the Spicewood Springs and Bull Creek cluster) share the same events, so the counts are not independent. They do not say how often a particular crossing overtopped.
- **Reporting practices changed over time.** Flood events have no lat/lon before about 2004, and coverage rose sharply in 2007 and 2015. Fatality coding and narrative detail differ by year and by forecast office. Counts favor recent, well-documented storms and densely populated areas such as Austin.
- The vehicle-related flag is a keyword match, so it can produce false positives (for example, "rescue" in an episode narrative about another location) and false negatives.
- The death counts attach every death from an event to every crossing within 2 km of it. They are not deaths that happened *at* the crossing.
- Use this as a "known trouble spot" context signal, not as a calibrated probability.
