# Part C — Data bridge, forecast science, Storm Replay & backend (§16–§24)

**Scope.** Part C specifies everything behind the phone: every external data source, the crossing inventory and river-network linking, the forecast science, the Storm Replay engine, the Python backend and its hosting, the database, the REST API, push fan-out, and backend security, observability, testing and CI. It uses the canonical state names, copy, channel IDs and precedence rules from **§3**, the feature IDs (F1–F128 plus the suffixed IDs such as F17b and F106b) from **§4**, the paths from **§5**, and the root `Makefile` targets from **§5.2** (referenced by name, never re-defined here). If anything here conflicts with §3, §3 wins. Part C owns the data and API contracts (§21, §22); other parts conform to them.

**Conventions used in Part C**
- Wire-format states are `no_rise | watch | avoid | closed | unknown` (§3.2). Severity order: `no_rise < unknown < watch < avoid < closed`. The research reports' `no_signal`/`flooded` names are retired.
- `[V]` = verified by the research (package source, docs or registry), `[U]` = unverified. Every `[U]` item that matters becomes **VERIFY BEFORE USE: <how>**, followed by the safe fallback.
- ★ marks a **student-owned core file** (§1.8, §39). For those files this prompt gives the *contract* (signatures, algorithm, tests), never a finished implementation. You MUST follow the §1.8 pause protocol: failing tests, skeleton with `TODO(student)`, explain-back doc, stop.
- All times are UTC in storage and on the wire (ISO-8601 with `Z`). Display uses America/Chicago (§35).
- Python commands run from `backend/`: `uv run python -m fordcast <cmd>`. Repo scripts in `tools/` run from the repo root in the separate tools project: `uv run --project tools python tools/<script>.py` (A §5.3), except `smoke_test.py` and `build_replays.py`, which run in the backend environment.

---

## §16. Data sources catalog

### 16.0 Rules for every external source (MUST)

1. **One client module per source** in `backend/fordcast/sources/` (paths in §5). All share `fordcast/sources/http.py`:
   ```python
   # backend/fordcast/sources/http.py
   import httpx
   from fordcast.config import settings

   def make_client() -> httpx.AsyncClient:
       return httpx.AsyncClient(
           timeout=httpx.Timeout(10.0, connect=5.0),
           headers={"User-Agent": settings.user_agent, "Accept": "application/json"},
           follow_redirects=True,
       )
   ```
2. **User-Agent** on every request: `FordCast/1.0 (+https://github.com/godtier812/Fordcast-CAC; contact: <PROJECT_CONTACT_EMAIL>)`. Use a project contact address, never the student's personal email (§24). NWS returns **403** without a descriptive UA `[V]`.
3. **Retries**: tenacity, `stop_after_attempt(3)`, `wait_exponential_jitter(initial=1, max=20)`. Retry only on `httpx.TransportError`, HTTP 429 and 5xx. Honor `Retry-After` (cap at 60 s). Never retry other 4xx.
4. **Validate every response** with a pydantic v2 model (`model_config = ConfigDict(extra="ignore")`). The model *is* the contract (§24.7). A validation failure counts as a source failure. It is logged and sent to Sentry, and it never crashes the tick. The affected data simply ages, and staleness turns it into `unknown` (§18.9).
5. **Keys go in headers**, except where a provider only accepts a query key (Stadia `api_key`, possibly ORS geocoding; see §16.11–16.12). The log redaction filter strips query strings (§24.4).
6. **Base URLs are config values** (`USGS_OGC_BASE`, `NLDI_BASE`, `NWPS_BASE`, `NWS_BASE`, …; §20.12), so an API version change is a config edit.
7. **Banned endpoints**: never call `waterservices.usgs.gov`, never import `dataretrieval.nwis` (removed on or after 2027-05-06 `[V]`). A CI grep test fails on either string outside `docs/` and Markdown files (§24.7, §24.9). The guard test itself never contains the literal strings: it builds them by concatenation (`"water" + "services.usgs.gov"`, `"dataretrieval" + ".nwis"`), so the repo-wide grep can't match its own test.
8. **Every source has a recorded-cassette contract test**, plus a nightly live test if it is used live (§24.7).
9. **Attribution** for every source appears in About → Data sources, the README and the video end card (§16.16).
10. **Offline-only sources** (NLDI, inventory layers, storm archives) are cached in the repo or in Storage. The app and the live tick never depend on them at runtime.

### 16.1 Catalog at a glance

| # | Source | FordCast use | Tier | Mode | Auth | Cadence | § |
|---|---|---|---|---|---|---|---|
| 1 | USGS Water Data OGC API **v1** | Live stage, storm history, gauge metadata | MVP | live + offline | `X-Api-Key` (free) | every 5-min tick | 16.2 |
| 2 | USGS NLDI | Snap crossings to NHDPlus, upstream gauges, flowlines, basins | MVP | offline only | none | once (+ re-run on inventory change) | 16.3 |
| 3 | City of Austin `q6kt-v2zm` + FEWS ArcGIS layer | Crossing locations (22 LWC gates) | MVP | offline | optional Socrata token | weekly manual refresh | 16.4 |
| 4 | Travis County Low_Water_Crossings MapServer | County crossing locations | MVP | offline | none | weekly manual | 16.4 |
| 5 | TxGIO Low_Water_Crossing | Statewide inventory start | MVP | offline | none | once | 16.4 |
| 6 | OSM Overpass (`ford=*`) | Fill gaps | MVP | offline | none | once (cached) | 16.4 |
| 7 | ATXfloods | Official live status | MVP **only with written City permission**; otherwise a deep link | live (if permitted) | unknown | 2–5 min | 16.5 |
| 8 | NOAA NWPS | USGS→NWS LID crosswalk, flood categories, **impact statements** (ground truth) | MVP offline · Stretch display · Roadmap NWM | offline + daily | none (UA) | daily | 16.6 |
| 9 | NWS alerts API (CAP) | Context banner only | Stretch (F17) | live | none (UA required) | every tick | 16.7 |
| 10 | IEM CAP archive | Historic alerts in Replay | Stretch (F82) | offline | none | once per storm | 16.7 |
| 11 | NOAA MRMS (AWS + IEM archive) | Basin radar rainfall | Stretch (F18) | live + offline | none | 10 min | 16.8 |
| 12 | Open-Meteo | Quick basin rainfall fallback | Stretch (F18 quick path) | live | none | 15 min | 16.9 |
| 13 | LCRA Hydromet | Denser gauges; July 2025 Sandy Creek | Roadmap (one-time CSV = Stretch **only with permission**) | offline | n/a | none live | 16.10 |
| 14 | OpenRouteService | Directions with `avoid_polygons`, geocoding | Stretch (F49–F52) | live via backend | key (server-side) | on demand | 16.11 |
| 15 | Stadia Maps (Valhalla) | Routing fallback | Stretch | live via backend | key (server-side) | on demand | 16.12 |
| 16 | Photon (komoot) | Geocoding fallback | Stretch | live via backend | none | on demand | 16.13 |
| 17 | Expo Push API | Push delivery to APNs/FCM | MVP (Android) | live | access token | per tick | 16.14 |
| 18 | OpenFreeMap tiles/glyphs | Basemap | MVP | live (app) | none | — | §29 owns it |

---

### 16.2 USGS Water Data OGC API v1 — gauges `[MVP]` (F3, F4)

**Why v1, and why never the legacy service.** v1 was released in September 2026, and `dataretrieval` 1.4.0 defaults to it `[V: dr-1.4.0 endpoints.py OGC_API_VERSION="v1"]`. v0 stays up until June 2027 and then redirects to v1 `[V: dr-1.4.0 docs]`. Legacy WaterServices slows down from **Nov 16, 2026**, has intentional outages from **Jan 27, 2027**, and is decommissioned on **Feb 22, 2027** `[V: USGS product-owner notice, GitHub clemensv/real-time-sources#1673; DOI-USGS/dataRetrieval#934]`. All three dates fall inside judging. The concept doc's "degrades Nov 2026" is correct in spirit; use these exact dates in the README.

#### Access
| Item | Value |
|---|---|
| Base | `https://api.waterdata.usgs.gov/ogcapi/v1` (config `USGS_OGC_BASE`) |
| Items URL | `{base}/collections/{collection}/items?…` |
| Key | Free and instant from `https://api.waterdata.usgs.gov/signup/` (api.data.gov; emailed, no approval) `[V]` |
| Send key as | Header **`X-Api-Key: <key>`** (preferred; keeps it out of logs) `[V: dr transport/http.py]` |
| Env vars | Backend: `USGS_API_KEY`. Notebooks using `dataretrieval`: `API_USGS_PAT` `[V: dr README]`. Set both locally. |
| Rate limit | Keyed: **1,000 requests/hour**. Response headers `x-ratelimit-limit` and `x-ratelimit-remaining`, with no reset header `[V]`. Unkeyed: unpublished (reports range from 50 to 100/h/IP) `[U]`, so **always use the key**. |
| Over limit | HTTP 429. Honor `Retry-After` if present `[V: dr ogc/errors.py]` |
| URL length | About 8 KB. For long ID lists, use a CQL2 POST (below) `[V: dr README]` |
| Support | `gs-w_waterdata_support@usgs.gov`, `wdfn@usgs.gov` |

#### Collections FordCast uses
| Collection | Use | Notes |
|---|---|---|
| `latest-continuous` | **Live poll**: newest value of every 15-min series | Has geometry, so it **supports `bbox`** `[V: dr get_latest_continuous signature]` |
| `continuous` | Gap backfill, storm history, Storm Replay | **≤ 3 years per request**. With no `time`, it returns the last year, so **always pass `time`**. No geometry; ignores `bbox` `[V]`. |
| `monitoring-locations` | Name, lat/lon, drainage area, altitude/datum | Filters `state`, `site_type_code="ST"`, `bbox` |
| `time-series-metadata` | Parameters per site, `begin`/`end` | v1 dropped `begin_utc`/`end_utc`/`state_name`/`hydrologic_unit_code` `[V: dr NEWS]` |
| `combined-metadata` | Locations joined with series inventory | Best "which Austin gauges have 15-min stage and since when" query; filter `data_type="Continuous values"` `[V]` |
| `peaks` | Annual peaks (rank storms) | Offline |
| STAC ratings `https://api.waterdata.usgs.gov/stac/v0/search` | Stage→discharge | Optional, never needed for the rule |

Parameter codes: `00065` gage height (ft; **primary**), `00060` discharge (`ft^3/s`), `00045` precipitation (some sites `[U]`). `statistic_id` for continuous is almost always `00011`.

#### Query parameters (OGC API Features)
| Param | Example | Notes |
|---|---|---|
| `monitoring_location_id` | `USGS-08159000` | agency-hyphen-site |
| `parameter_code` | `00065` | VERIFY BEFORE USE whether a comma list works in GET (Step 0 S2); fallback: one call per code (FordCast needs only `00065` live) |
| `time` | `2015-10-30T00:00:00Z/2015-10-31T12:00:00Z` · `2026-10-14T00:00:00Z/..` · `PT3H` | instant, interval, half-bounded, or ISO-8601 duration `[V]` |
| `bbox` | `-98.20,29.95,-97.40,30.70` | minLon,minLat,maxLon,maxLat; **not on `continuous`** |
| `properties` | `monitoring_location_id,parameter_code,time,value,unit_of_measure,approval_status,qualifier,last_modified` | trims the payload |
| `skipGeometry` | `true` | camelCase `[V]` |
| `limit` | `10000` | docs max 10,000; the library sends up to 50,000; **use 10000** `[V]` |
| `filter` + `filter-lang=cql-text` | `(time >= '2015-10-30T06:00:00Z' AND time <= '2015-10-30T18:00:00Z')` | server-side CQL |
| `f` | `json` | GeoJSON |
| `sortby` | — | **Do not use.** It is honored on page 1 only and breaks paging (400) `[V]`. Sort client-side. |
| Paging | follow `links[]` with `rel == "next"`; the cursor is opaque; `numberMatched` is null `[V]` | |
| Multi-ID | `continuous`/`latest-continuous` accept comma-joined IDs in GET per dr source `[V: dr utils.py]`; `monitoring-locations`/`combined-metadata` need **POST** with `Content-Type: application/query-cql-json` and body `{"op":"in","args":[{"property":"monitoring_location_id"},["USGS-08159000","USGS-08158700"]]}` `[V: dr ogc/requests.py]` | VERIFY BEFORE USE: the exact POST path (Step 0 S2); fallback: one GET per site |

#### Example requests
```http
# LIVE (every tick): all Austin 15-min stage readings in ONE request
GET https://api.waterdata.usgs.gov/ogcapi/v1/collections/latest-continuous/items?f=json&bbox=-98.20,29.95,-97.40,30.70&parameter_code=00065&properties=monitoring_location_id,parameter_code,time,value,unit_of_measure,approval_status,qualifier,last_modified&skipGeometry=true&limit=10000
X-Api-Key: ${USGS_API_KEY}
User-Agent: FordCast/1.0 (+https://github.com/godtier812/Fordcast-CAC; contact: <PROJECT_CONTACT_EMAIL>)

# GAP BACKFILL (only when a gap is detected; ≤ 1/h/site)
GET {base}/collections/continuous/items?f=json&monitoring_location_id=USGS-08158700,USGS-08159000&parameter_code=00065&time=PT3H&properties=monitoring_location_id,time,value,approval_status,qualifier&limit=10000

# STORM ARCHIVE (offline): one site, one storm window (≤ 3 years)
GET {base}/collections/continuous/items?f=json&monitoring_location_id=USGS-08159000&parameter_code=00065&time=2013-10-29T12:00:00Z/2013-11-01T00:00:00Z&limit=10000
```
```python
# Offline (notebooks / CLI backfill) with the official client [V: dr-1.4.0]
from dataretrieval import waterdata
df, meta = waterdata.get_continuous(monitoring_location_id=["USGS-08158700", "USGS-08159000"],
                                    parameter_code="00065",
                                    time="2015-10-29T00:00:00Z/2015-11-01T00:00:00Z")
inv, _ = waterdata.get_combined_metadata(bbox=[-98.20, 29.95, -97.40, 30.70], parameter_code="00065",
                                         data_type="Continuous values")
```
`dataretrieval` retries 429/5xx (4×, honors Retry-After), auto-chunks long ID lists, and raises resumable `ChunkInterrupted`/`QuotaExhausted`. It does **not** split the 3-year limit, so split by calendar year yourself `[V]`.

#### Response (GeoJSON FeatureCollection; field names `[V]`, values illustrative)
```json
{"type": "FeatureCollection",
 "features": [{"type": "Feature", "id": "3f2a…", "geometry": null,
   "properties": {"time_series_id": "…", "monitoring_location_id": "USGS-08159000", "parameter_code": "00065",
                  "statistic_id": "00011", "time": "2026-10-14T13:45:00+00:00", "value": "3.42",
                  "unit_of_measure": "ft", "approval_status": "Provisional", "qualifier": null,
                  "last_modified": "2026-10-14T14:02:11+00:00"}}],
 "links": [{"rel": "next", "href": "…cursor=…"}], "numberReturned": 1}
```
- `value` is a **string**, so parse it as float. Skip null or empty values.
- `time` is **UTC** (the legacy service used local time).
- `approval_status` is `Provisional | Approved`. Provisional data can be revised later.
- `qualifier` is a list or null. VERIFY BEFORE USE: record the qualifier vocabulary seen in Step 0 and in storm data. Readings whose qualifiers indicate equipment malfunction or ice are treated as **missing** (fallback rule: any qualifier other than `ESTIMATED`/null is logged and treated as missing until reviewed).
- The feature `id` is per-version and **unstable**. Deduplicate on `(monitoring_location_id, parameter_code, time)` (equivalently `(time_series_id, time)`).
- Observations carry no site name; join from `monitoring-locations`.

#### Live ingest algorithm (per tick; `sources/usgs_client.py`, agent-written)
```python
LATEST_PROPS = ("monitoring_location_id,parameter_code,time,value,unit_of_measure,"
                "approval_status,qualifier,last_modified")

async def fetch_latest_stage(client: httpx.AsyncClient) -> list[RawObs]:
    url: str | None = f"{settings.usgs_ogc_base}/collections/latest-continuous/items"
    params: dict | None = {"f": "json", "bbox": settings.usgs_bbox, "parameter_code": "00065",
                           "properties": LATEST_PROPS, "skipGeometry": "true", "limit": "10000"}
    headers = {"X-Api-Key": settings.usgs_api_key.get_secret_value()}
    out: list[RawObs] = []
    while url:
        r = await get_with_retry(client, url, params=params, headers=headers)
        page = UsgsFeatureCollection.model_validate(r.json())
        out += [o for f in page.features if (o := RawObs.from_feature(f)) is not None]
        url = next((l.href for l in page.links if l.rel == "next"), None)
        params = None                                   # the next link already carries query + cursor
        tick_metrics.usgs_ratelimit_remaining = int(r.headers.get("x-ratelimit-remaining", "-1"))
    return out
```
1. **One request** to `latest-continuous` by bbox (`settings.usgs_bbox = "-98.20,29.95,-97.40,30.70"`), keeping only gauges in `public.gauges` where `is_active`. VERIFY BEFORE USE that `bbox` filters correctly with `skipGeometry=true` (S2); fallback: drop `skipGeometry`.
2. **Edge-cache guard**: v0 responses carried `cache-control: public, max-age=3600` via CloudFront `[V]`, so a cached "latest" can be old. Never let an older `time` overwrite newer knowledge. If a gauge's returned `time` is older than the newest stored `obs_time`, ignore it and log `usgs_stale_edge`.
3. **Upsert** into `public.readings` with `ON CONFLICT (gauge_id, param_code, obs_time) DO NOTHING`, setting `received_at = tick fetch time` and `ingest = 'L'`. The first `received_at` is kept, which is what the latency measurement needs. Provisional revisions are ignored live; the backtest uses the archived Parquet.
4. **Gap detection**: a gap exists when `new_latest.time − previous_stored_latest > 20 min` for a 15-min gauge (or `> latency_p90 + 20` for slower gauges). Fetch `continuous` for those sites with `time=<previous_stored_latest>/..`, capped at 6 h back, at most once per site per hour. Batch up to 10 sites per comma-joined GET (VERIFY S2); fallback: one GET per site.
5. **Sanity filter**: reject values outside `[-5, 80]` ft (log `usgs_value_out_of_range`). **Never filter rapid rises.** Onion Ck rose 11 ft in 15 min in 2013, and that was real `[V]`.
6. **Budget**: 12 req/h (latest) + ≤ 10 req/h (backfill, storms only) + nightly metadata ≈ **< 3 % of the keyed quota**. Log `x-ratelimit-remaining` every tick and alarm below 200 (§24.5).

#### Data-arrival latency (critical for honest lead times)
- Many gauges *measure* every 15 min but *transmit* less often (often hourly, by satellite) `[U: engineering inference; measure it]`. A reading stamped 06:15 may have been unavailable until about 07:15.
- **Measure** per live reading: `latency = received_at − obs_time` (only rows with `ingest='L'`). Nightly, compute per gauge over the last 7 days (n ≥ 50): `latency_p75_min`, `latency_p90_min`, `latency_n` → `public.gauges`.
- **Second estimator** (Step 0 S2): `last_modified − time` on `latest-continuous` records. VERIFY BEFORE USE that `last_modified` reflects arrival rather than later revision; use it only as a cross-check.
- **Staleness threshold per gauge** (§18.9): `stale_after_min = clamp(ceil5(latency_p90_min + 20), 30, 120)`. The default is **60** while `latency_n < 50`. Hydro rule: never call data older than **2 h** fresh `[V hydro §11]`.
- **Snapshot for replay (`make latency`):** the nightly values live in the DB and change every night, so replays never read them directly. `make latency` (= `uv run python -m fordcast latency recompute --out ../data/latency/gauge_latency.json`, A §5.2) freezes the per-gauge `n`, `p75`, `p90`, delay and stale threshold into the committed file `data/latency/gauge_latency.json` (format in §19.4). Run it on Day 8 before the science freeze (A §6.1).
- **Replay** uses `available_at = obs_time + delay[gauge]`, with `delay` read only from that frozen file (60 min when a gauge has fewer than 50 samples), and documented transmission outages push `available_at` to the outage end (§19.4).

#### History (Storm Replay, training)
- `continuous` serves the period of record in windows of ≤ 3 years. Most sites have data from **2007-10-01** onward (legacy IV docs) `[V]`, so the 2013, 2015, 2018 and 2025 storms and the 2024 calm days (`calm-2024`, §16.19) should be covered.
- VERIFY BEFORE USE per site: `combined-metadata`/`time-series-metadata` `begin ≤ storm start`.
- The one report of "continuous is a rolling one-year window" was a request without `time` `[V]`. Always pass `time`.

#### Failure handling
| Failure | Behavior |
|---|---|
| 429 | Back off per `Retry-After`; skip this tick's backfill; the next tick retries. Alarm if it happens on 3 consecutive ticks. |
| 5xx / timeout / DNS | 3 retries, then give up for this tick. Readings age; per-gauge staleness → `unknown`; snapshot `data_status` → `degraded`/`offline` (§18.9). |
| Validation error (schema change) | Sentry error with the response excerpt (no key); treated as an outage. The nightly live contract test should catch it first (§24.7). |
| v1 deprecation or redirect | `follow_redirects=True`; the base URL is config; nightly test alarms. |
| Gauge silent (e.g., failed at the peak) | No special case: staleness → `unknown` (§18.9). This is designed and shown honestly in Replay (§19.10). |

#### VERIFY BEFORE USE (Step 0, §16.20)
S1 collection list · S2 bbox + comma lists + `x-ratelimit-*` + first latency samples + qualifier vocabulary · S3 2013/2015/2025 windows exist at 15-min resolution, and whether today's archive **holds readings inside** the documented 2013 US 183 transmission outage (either way, replay availability follows the `meta.toml` outage table, §19.3–§19.4).

**License/attribution:** U.S. public domain `[U: standard USGS policy]`. Attribute: "Data: U.S. Geological Survey, Water Data for the Nation (provisional, subject to revision)" `[V wording from dr docstrings]`.

---

### 16.3 USGS NLDI — river network `[MVP, offline only]` (F2)

| Item | Value `[V: dr-1.4.0 nldi.py, pynhd-0.20.0 nldi.py]` |
|---|---|
| Base | `https://api.water.usgs.gov/nldi/linked-data` (config `NLDI_BASE`) |
| Catalog | `GET {base}/` lists sources |
| **Snap a crossing** (use this) | `GET {base}/hydrolocation?coords=POINT(lon lat)` returns an indexed point on a flowline with `comid` and `measure`. It **snaps if within 200 m**; otherwise it traces downhill on an elevation surface. pynhd `comid_byloc` uses it and keeps `source == "indexed"`. |
| Point in catchment (don't prefer) | `GET {base}/comid/position?coords=POINT(lon lat)&f=json` returns the NHDPlusV2 catchment containing the point, which may be on the wrong side of a confluence. |
| Feature | `GET {base}/nwissite/USGS-08159000` |
| Navigation | `GET {base}/{featureSource}/{featureId}/navigation/{UM\|UT\|DM\|DD}/{dataSource}?distance={km}`. `distance` is **required**, 1–9999 km. |
| **Upstream gauges** | `GET {base}/comid/{comid}/navigation/UT/nwissite?distance=100` |
| Upstream flowlines | `GET {base}/comid/{comid}/navigation/UT/flowlines?distance=100&trimStart=true` (also `stopComid`, `trimTolerance`) |
| Downstream flowlines from a gauge | `GET {base}/nwissite/USGS-08158700/navigation/DM/flowlines?distance=150` (used for channel distance and the replay pulse path, §17.9) |
| Basin | `GET {base}/{featureSource}/{featureId}/basin?simplified=true&splitCatchment=true`. `splitCatchment=true` splits at the exact point, which a mid-catchment crossing needs. |
| Python | `from pynhd import NLDI; nldi = NLDI(); nldi.comid_byloc((lon, lat))`, `nldi.navigate_byid("comid", comid, "upstreamTributaries", "nwissite", distance=100)`, `nldi.navigate_byid("nwissite", "USGS-08158700", "downstreamMain", "flowlines", distance=150)`, `nldi.get_basins(ids, fsource="nwissite", split_catchment=True)` |

**Caveats you MUST design for:**
1. NHDPlusV2 is medium resolution (about 1:100k). Tiny urban creeks (Waller tributaries, storm drains, many small county crossings) may have **no flowline**. These get a manual override or become tier C (`unknown`, reason `NO_UPSTREAM_GAUGE`), never calm.
2. `nwissite` returns **all** NWIS surface-water sites, including inactive ones. Intersect with `combined-metadata` (active `00065` continuous, `end` within 2 days) `[U: inferred]`.
3. Catchment indexing can return flowlines slightly up- or downstream of the point `[V]`. **Every tier-A snap is checked on a map** (§17.11).
4. **Precompute once**: results go to `data/nldi_cache/*.geojson` and the DB. No NLDI calls at runtime; NLDI has no SLA.
5. If NLDI is down on Day 1, retry with backoff and continue other work. If it is still down by end of Day 2, link the MVP tier-A shortlist manually (`data/overrides/snap_overrides.csv` with comid and upstream gauges from the USGS site pages) and tell the human.

**License:** U.S. public domain. Cite "USGS NLDI / NHDPlus V2".

---

### 16.4 Crossing inventory sources `[MVP, offline]` (F1)

Austin's "~70 crossings" is ATXfloods' monitored count (67 City crossings per KUT, July 2025 `[V]`), **not one dataset**. The inventory is assembled from the sources below (§17). Raw pulls are cached as `data/raw/inventory/<source>-<YYYYMMDD>.geojson` and committed if under 5 MB.

| # | Source | Request | What you get | Tags |
|---|---|---|---|---|
| A | **City of Austin `INLANDWATERS_flood_low_water_crossings`**, Socrata `q6kt-v2zm` (alt view `juvk-qass`) | Columns: `GET https://data.austintexas.gov/api/views/q6kt-v2zm/columns.json` · Export: `GET https://data.austintexas.gov/api/v3/views/q6kt-v2zm/export.geojson` · SODA 2.1: `GET https://data.austintexas.gov/resource/q6kt-v2zm.geojson` `[U]` · SODA3 query `/api/v3/views/q6kt-v2zm/query.json` **requires `X-App-Token`** `[V]` | "Locations for low water crossing gates maintained by the City", **22 records**, last updated 2026-03-17 `[V]` | VERIFY BEFORE USE field names (Step 0 S7). Optional env `SOCRATA_APP_TOKEN`. |
| B | **City ArcGIS FeatureServer** (same layer; FEWS) | `GET https://services.arcgis.com/0L95CJ0VTaxqcmED/ArcGIS/rest/services/INLANDWATERS_flood_low_water_crossings/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson` · fields: `…/FeatureServer/0?f=pjson` | Same records via ArcGIS | Service exists `[V]`; layer index `0` and fields `[U]` |
| C | **Travis County Public Works** | `GET https://gis.traviscountytx.gov/server1/rest/services/Public_Works/Low_Water_Crossings/MapServer/1/query?where=1%3D1&outFields=*&outSR=4326&f=geojson` (layer **1** "Low Water Crossing"; layer **0** "Low Water Crossing (Bridge)"; maxRecordCount 1000) | County crossings | Layers `[V]`; fields `[U]` |
| D | **TxGIO statewide** | `GET https://feature.geographic.texas.gov/arcgis/rest/services/Basemap/Low_Water_Crossing/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson&geometry=-98.2,29.95,-97.4,30.7&geometryType=esriGeometryEnvelope&inSR=4326` | Statewide start (fields begin `objectid`, `fips`) | Service `[V]`; params `[U]` |
| E | **OpenStreetMap** via Overpass | `POST https://overpass-api.de/api/interpreter` with `data=` the query below (respect the instance's fair-use policy `[U]`) | `ford=*` nodes/ways, legacy `highway=ford`; `depth=*` when present | Tags `[V: OSM wiki Key:ford]` |
| F | Older City "Low Water Crossings That Flood" (data.gov) | Socrata id not found | ~22 rows, 13 columns incl. "gage number" (2022 mirror) | `[U]`; use only if found |

```text
[out:json][timeout:90];
(
  node["ford"](29.95,-98.20,30.70,-97.40);
  way["ford"](29.95,-98.20,30.70,-97.40);
  node["highway"="ford"](29.95,-98.20,30.70,-97.40);
);
out center tags;
```
- **Cadence:** pulled once on Day 1 with `uv run python -m fordcast inventory pull`, then refreshed weekly by hand. Never at runtime.
- **Failure:** keep the last cached pull and log the failure. A missing source is reported in `docs/data-bridge-verification.md`.
- **Licensing:** City portal terms `[U]` ("Source: City of Austin Open Data Portal"). County/TxGIO agency terms `[U]` (name the agency). **OSM is ODbL 1.0**: "© OpenStreetMap contributors". Share-alike applies to a derived database, so the published `crossings.geojson` carries ODbL attribution for OSM-sourced rows and keeps `source` per row.

---

### 16.5 ATXfloods — official live status `[MVP only with written permission]` (F10)

- **Facts:** public statuses are "Closed", "Open" and "Caution" `[V]`. "Long-Term Closure" is `[U]`. Coverage is about 15 jurisdictions; more than 90 closures have occurred in one storm `[V]`.
- The open-source backend `cityofaustin/ctxfloods-backend` (AWS Lambda) exposes `POST graphql` (PostGraphile), `GET xml` (legacy XML), and `GET waze/feed` (`{incidents:[{id, location:{street, polyline, direction}, type, subtype, starttime, description, reference}]}`), and syncs every 5 min `[V: serverless.yml]`. **The public hostnames and terms are unknown** `[U]`. A WilCo ArcGIS mirror exists at `gis.wilco.org/arcgis/rest/services/OEM/ATXFloods/MapServer`; whether it is current is `[U]`.
- **Protocol (MUST):**
  1. Step 0 S10: open `https://www.atxfloods.com/crossings` in browser devtools. **Record only** the endpoint names and the status vocabulary in `docs/data-bridge-verification.md`.
  2. Ask the City for permission in the outreach email (§42).
  3. **Without written permission, do not call any ATXfloods endpoint from code. Never scrape.** Every Crossing detail shows the deep link "Official status: ATXfloods.com ›" (§3.6).
  4. With permission: implement `AtxfloodsSource(OfficialStatusSource)`, poll every 5 min inside the tick, and mark data stale after 15 min.
- **Mapping:** `Closed` / `Long-Term Closure` → `official_state='closed'` → `closed` (precedence §3.3). `Caution` → `'caution'` → at least `watch`. `Open` → `'open'`, displayed only as `official.no_closure` ("{{source}}: no closure reported", §3.7) and **never lowers** the model's state.
- **Manual source** (`source='manual'`) is the MVP official source, used for test crossings and curated entries (§22.8). It is always labeled with the §3.6 source label "Manual entry: {{note}}".
- **Attribution:** "Official status: ATXfloods (City of Austin)".

---

### 16.6 NOAA NWPS — NWS gauges, flood categories, impact statements `[MVP offline · Stretch display · Roadmap NWM]` (F5, F16, F20)

| Item | Value |
|---|---|
| Base | `https://api.water.noaa.gov/nwps/v1` (config `NWPS_BASE`); OpenAPI at `/docs/` `[V]` |
| Gauge by USGS id (**the crosswalk**) | `GET /gauges/{identifier}` accepts an NWS LID **or** a USGS site number (e.g. `/gauges/01013500` → `FIHM1`) `[V: hydrotools#250]` |
| Gauges in bbox | `GET /gauges?bbox.xmin=-98.2&bbox.ymin=29.95&bbox.xmax=-97.4&bbox.ymax=30.7&srid=EPSG_4326` → `{gauges:[{lid, name, usgsId, county, …}]}` `[V]` |
| Stage/flow | `GET /gauges/{id}/stageflow`, `/stageflow/observed`, `/stageflow/forecast` → `data[]={validTime, generatedTime, primary, secondary}`, `primaryUnits`, `secondaryUnits` `[V]` |
| Ratings | `GET /gauges/{id}/ratings` (params `[U]`) |
| NWM reach | `GET /reaches/{reachId}/streamflow?series=short_range` (also `medium_range`, `long_range`, `analysis_assimilation`) `[U path/series]`. **Roadmap only.** |
| Auth | none; send the FordCast User-Agent; poll ≥ 60 s apart |

**Gauge metadata fields `[V]`:** `lid`, `name`, `reachId`, `state.abbreviation`, `status.observed.{primary, primaryUnit, secondary, secondaryUnit, validTime}`, `status.forecast.{…}` (`validTime = "0001-01-01T00:00:00Z"` with status `fcst_not_current` means no forecast exists, so treat it as null), `flood.categories.{action, minor, moderate, major}.{stage, flow}`, `flood.stageUnits`, `flood.flowUnits`, **`flood.impacts[] = {stage, statement}`**. Flow is often **kcfs** while thresholds are cfs, so normalize units.

**Use in FordCast:**
1. **Crosswalk + categories (MVP, offline):** `uv run python -m fordcast nwps sync` calls `GET /gauges/{usgs_site_no}` for each gauge, upserts `public.nws_gauges` (lid, reach_id, categories, impacts), and sets `gauges.nws_lid`. Run it on Day 2, then daily from the tick (once per day, in the first tick after 06:00 UTC).
2. **Impact statements as ground truth (MVP, offline):** search `flood.impacts[].statement` for `/low[- ]water crossing|crossing|road|bridge|street/i`. A statement naming a crossing's road gives `overtop_stage_ft` with `truth_quality='impact_statement'` and `truth_source='NWS impact <lid> @ <stage> ft'`. A human confirms the road match in `data/overrides/overtop_stages.csv` (§17.6).
3. **Display (Stretch, F16):** NWS flood stage lines (action/minor/moderate/major) on the hydrograph and gauge mini-card.
4. **NWM outlook (Roadmap, F20):** experimental; latest run plus a 3-day archive (short/medium) and 1 day (long), not supported 24/7 `[V]`. Never the core signal.

**Known Austin LIDs:** ATIT2 = Onion Ck at US 183 (USGS 08159000): action **15**, minor **17**, moderate **23**, major **27 ft**; record **40.15 ft (2013-10-31)**; **39.22 ft (P) 2015-10-30** `[V]`. DRWT2 = Onion Ck nr Driftwood (08158700) `[V]`. Others are in §16.18.

**Failure:** NWPS down means skip the daily sync and keep the last values (they change rarely). **Attribution:** "Source: NOAA/NWS".

---

### 16.7 NWS alerts API (CAP) — context only `[Stretch F17]`; IEM CAP archive for Replay `[Stretch F82]`

| Item | Value |
|---|---|
| Endpoint | `GET https://api.weather.gov/alerts/active?area=TX` (config `NWS_BASE=https://api.weather.gov`); also `?zone=TXC453` (Travis UGC; VERIFY with `GET /zones/county/TXC453`) and `?point=30.2672,-97.7431` `[V zone/area/point]` |
| Headers | **`User-Agent` required** (403 without) `[V]`; `Accept: application/geo+json` |
| Deprecated | `/alerts?active=1` (use `/alerts/active`) `[V]` |
| Cadence | every tick (5 min) |
| Events kept | `Flash Flood Warning`, `Flash Flood Watch`, `Flash Flood Statement`, `Flood Warning`, `Flood Watch`, `Flood Advisory`, `Flood Statement` (literal "Flash Flood Warning" `[V]`; others `[U]` standard names: VERIFY against a live sample) |
| Area filter | Keep an alert if its `geocode.UGC` intersects `settings.nws_ugc` = `["TXC453","TXC209","TXC491","TXC053"]` (Travis, Hays, Williamson, Burnet). VERIFY BEFORE USE the codes via `/zones/county/<code>`; fallback: `?point=` for 5 fixed points across the region. |
| Key fields | `id, areaDesc, geocode{SAME,UGC}, affectedZones[], references[], sent, effective, onset, expires, ends, status, messageType, category, severity, certainty, urgency, event, senderName, headline, description, instruction, response, parameters{…}`. Storm-based warnings have polygon geometry; zone alerts have `geometry: null` `[U: confirm with a live sample]`. |
| Flash Flood **Emergency** | Not a separate event. It is a Flash Flood Warning whose damage threat is **CATASTROPHIC** (headline "FLASH FLOOD EMERGENCY"). Parameter keys `flashFloodDamageThreat`, `flashFloodDetection` `[V]`. VERIFY BEFORE USE their JSON location in `properties.parameters` (S6); fallback: regex the headline for `FLASH FLOOD EMERGENCY`. |

**Rules (MUST):**
- **Key on CAP fields, not VTEC.** NWS has proposed CAP-only delivery, possibly dropping VTEC (comment period to Nov 20 or Nov 30, 2026) `[V]`. Store by CAP `id`. `messageType` is `Alert | Update | Cancel`: an Update supersedes every id in its `references`; a Cancel removes them. Drop alerts after `expires` (or `ends` if later).
- **Context only:** an NWS alert **never changes a crossing state** (§3). It appears in the snapshot `nws[]` (§22.3) and as a banner. It is also the gate for the Stretch "UNKNOWN push" (§23.3).
- **Spanish:** api.weather.gov text is English. NWS AI translation is not used for WEA/EAS `[V]`. Show the **English product name + a curated Spanish gloss** (§3.7 `nws.*` keys). Never machine-translate NWS free text.
- **Failure:** feed unreachable for more than 10 min → snapshot `nws_status: "unavailable"` and the app shows "NWS alerts unavailable". Never an all-clear.
- **Replay (F82):** historic CAP text from IEM, e.g. `https://mtarchive.geol.iastate.edu/2025/03/14/text/cap/2025031406_cap.txt` exists `[V]`. IEM's polygon archive tools are `[U]`. Parse offline into the replay timeline's `alerts[]`, visible from `sent` (§19.11). VERIFY BEFORE USE that the July 2025 files exist; fallback: omit `alerts[]` and say so in `assumptions`.
- **Attribution:** "Source: NOAA/NWS".

---

### 16.8 NOAA MRMS radar rainfall `[Stretch F18]`

| Item | Value |
|---|---|
| Bucket | `s3://noaa-mrms-pds` (us-east-1), anonymous (`aws s3 ls --no-sign-request s3://noaa-mrms-pds/`); HTTPS `https://noaa-mrms-pds.s3.amazonaws.com/` `[V]` |
| Cadence | suite updates on a 2-min cycle `[V]`; FordCast polls the latest file every 10 min |
| Archive on AWS | from **2020-10-14** (v11→v12 that day) `[V]` |
| Key layout | `CONUS/{Product}/{YYYYMMDD}/MRMS_{Product}_{YYYYMMDD-HHMMSS}.grib2.gz` `[V]` |
| Products | `RadarOnly_QPE_01H_00.00` (live features), `MultiSensor_QPE_01H_Pass2_00.00` (training; ~2 h latency), `MultiSensor_QPE_01H_Pass1_00.00` (~1 h), `PrecipRate_00.00` (mm/h) `[V]` |
| Grid | 7000 × 3500 at 0.01°. Lat 54.995→20.005 N; **lon 0–360** (−97.7 → 262.3). Origin upper-left. **−3 = no coverage** (≠ 0 mm) `[V]` |
| Decode | `gzip.decompress` → temp `.grib2` → `xr.load_dataarray(path, engine="cfgrib", decode_timedelta=True)`; the variable is named `unknown` `[V]` |
| Packages (`rain` extra) | `cfgrib==0.9.15.1` (+ `eccodes==2.49.0` wheel), `xarray==2026.9.0`; runner-up `pygrib==2.1.8` `[V PyPI]`. VERIFY BEFORE USE that they resolve under `exclude-newer` |
| Pre-2020 | IEM MTArchive `https://mtarchive.geol.iastate.edu/{YYYY}/{MM}/{DD}/mrms/ncep/{Product}/` from about Oct 2014; v11 product `GaugeCorr_QPE_01H` `[V dirs; U filenames]`. **2013 predates it**, so the 2013 replay is gauge-only. |

**Basin-average recipe:** precompute per crossing a mask of 0.01° cells inside its NLDI basin (`splitCatchment=true`). Each run, average `RadarOnly_QPE_01H` over the mask (treat −3 as missing, never 0). Store `public.basin_rain(crossing_id, valid_at, source, qpe_1h_in, qpe_3h_in, qpe_6h_in)`. Keep only an Austin crop (about 80 × 80 cells); never store CONUS grids.
**Visibility in Replay:** RadarOnly at `valid + 5 min`, Pass2 at `valid + 2 h` (§19.4).
**Claim rule:** say "radar rainfall" only if MRMS is ingested (§44). **Attribution:** "Radar rainfall: NOAA MRMS via NOAA Open Data Dissemination"; no implied NOAA endorsement `[V]`.

### 16.9 Open-Meteo — quick rainfall fallback `[Stretch F18 quick path]`
- `GET https://api.open-meteo.com/v1/forecast?latitude=30.27&longitude=-97.74&minutely_15=precipitation&past_minutely_15=24&forecast_minutely_15=8&timezone=UTC`. 15-minutely data over North America comes from HRRR `[V]`. The `past_minutely_15`/`forecast_minutely_15` names are `[U]`: VERIFY BEFORE USE (S9); fallback `hourly=precipitation&past_hours=6`.
- Free tier is **non-commercial**: < 10,000 calls/day, 5,000/h, 600/min. Data **CC BY 4.0**, credited as "Weather data by Open-Meteo.com" `[V]`. One call per basin centroid (≤ 20) every 15 min.
- **Copy rule:** describe it as a "model rainfall estimate", never "radar".

### 16.10 LCRA Hydromet `[Roadmap; one-time CSV = Stretch only with permission]` (F19)
- 280+ gauges, including City sites. Data is provisional. The historical page limits requests to < 180 days `[V]`. Undocumented JSON (`/api/FloodStatus/GetLakeLevelsGateOps`, `/api/GetForecastReferences`, `/api/FloodStatus/GetNarrativeSummary`) appears in the third-party `lcra==0.4.0` package `[V]`; **terms unknown**.
- July 4–5, 2025: **Big Sandy Ck at Jonestown (LCRA)** rose from 6 ft at 01:00 to more than 21 ft by 04:00 `[V]`. That storm's best gauge is LCRA's.
- **Never** poll LCRA live during judging, and never depend on undocumented endpoints. Email for permission. Only then download one historical CSV for the July 2025 replay. Attribute "Data: LCRA Hydromet".

### 16.11 OpenRouteService — directions + geocoding `[Stretch F49–F52]`
| Item | Value |
|---|---|
| Directions | `POST https://api.openrouteservice.org/v2/directions/driving-car/geojson` with body `options.avoid_polygons` = GeoJSON **Polygon or MultiPolygon** `[V: ORS docs]`. **POST is required** (GET can't carry polygons) `[V]`. Key in the `Authorization` header `[V]`. |
| Body | `{"coordinates":[[lon,lat],[lon,lat]],"preference":"fastest","units":"m","instructions":false,"radiuses":[350,350],"options":{"avoid_polygons":{…}}}` |
| `avoid_features` | includes `"fords"` `[V: openrouteservice-js README]` (not used; FordCast avoids by forecast) |
| Quota | Directions **2,000/day, 40/min**: daily limit → **403**, minute limit → **429** `[V]` |
| Polygon caps (default config) | `maximum_avoid_polygon_area: 200000000`, `maximum_avoid_polygon_extent: 20000`, `maximum_distance_avoid_areas: 100000`. The public API may differ `[V config; U public]`. FordCast stays far below them (≤ 10 polygons of 150 m radius). |
| Geocoding | `GET https://api.openrouteservice.org/geocode/autocomplete?api_key=KEY&text=…&focus.point.lat=30.2672&focus.point.lon=-97.7431&boundary.rect.min_lon=-98.6&boundary.rect.min_lat=29.6&boundary.rect.max_lon=-97.0&boundary.rect.max_lat=31.0&boundary.country=US&size=6&layers=venue,address,street,neighbourhood,locality`. The focus point and rectangle are the **fixed Austin-area search bias** defined once in §16.13, never the user's location. **1,000/day, 100/min** each for search, reverse and autocomplete `[V]`. `api_key` as a query param `[U]`: VERIFY; fallback is the `Authorization` header. |
| Attribution | "Routing © openrouteservice.org by HeiGIT · Map data © OpenStreetMap contributors" `[U exact wording; OSM credit mandatory]` |
| Failure | 403/429/5xx/timeout (12 s) → Stadia (directions) or Photon (geocoding); see §22.5–22.6 |

### 16.12 Stadia Maps (Valhalla) — routing fallback `[Stretch]`
- `POST https://api.stadiamaps.com/route/v1?api_key=KEY` with `{"locations":[{"lon":…,"lat":…},{…}],"costing":"auto","format":"osrm","shape_format":"geojson","exclude_polygons":[[[lon,lat],…]]}`. Roads **intersecting** the rings are avoided `[V: Valhalla api-reference]`.
- Valhalla defaults: `max_exclude_polygons_length: 10000` (total perimeter, m), `max_exclude_polygons_vertices: 100`, `max_exclude_locations: 50` `[V]`. Stadia's own caps are `[U]`. **16-vertex circles × ≤ 6 polygons stays under 100 vertices.** If more are needed, merge nearby circles with `shapely.union_all` and simplify.
- Free tier: 200k credits/month, non-commercial `[V secondary]`. Env `STADIA_KEY`.

### 16.13 Photon (komoot) — geocoding fallback `[Stretch]`
- `GET https://photon.komoot.io/api/?q=…&lat=30.2672&lon=-97.7431&limit=6&lang=en&bbox=-98.6,29.6,-97.0,31.0`. Free, no key. "Extensive usage will be throttled or banned… no guarantees for availability" `[V]`. Languages: English/German/French/local only, so for Spanish UI use `lang=en` and localize nothing `[V]`.
- Reverse: `GET https://photon.komoot.io/reverse?lat=…&lon=…` `[U]`: VERIFY; fallback is client `expo-location.reverseGeocodeAsync` (§32). Reverse geocoding is only ever called for a point the user explicitly picked on the map (§22.6), never with the device's own GPS fix.

**Fixed Austin-area search bias (privacy; the only definition, used by §16.11, §22.6 and §32.6).** Place search MUST NOT send or use the user's location. Every forward-geocoding request (ORS autocomplete and the Photon fallback) is biased with these constants, defined once in `backend/fordcast/config.py` (module constants, not environment variables, so nothing can switch them to a device location):
```python
# backend/fordcast/config.py — fixed search bias (never the device location; §16.13, §24.3)
SEARCH_FOCUS_LAT, SEARCH_FOCUS_LON = 30.2672, -97.7431       # downtown Austin (Travis County seat)
SEARCH_BBOX = (-98.6, 29.6, -97.0, 31.0)                     # min_lon, min_lat, max_lon, max_lat: Travis County + neighbors
```
- ORS: `focus.point.lat/lon` = `SEARCH_FOCUS_*`, `boundary.rect.*` = `SEARCH_BBOX`, `boundary.country=US`. Photon: `lat/lon` = `SEARCH_FOCUS_*`, `bbox` = `SEARCH_BBOX`.
- The client request is only `GET /v1/search?q=&lang=` (§22.6); the server rejects `lat`/`lon` query parameters. The same results come back for every user, which is the point.

### 16.14 Expo Push API `[MVP Android · Stretch iOS]` (F67, F68)
| Item | Value `[V: expo-server-sdk 7.2.0 source; docs.expo.dev]` |
|---|---|
| Send | `POST https://exp.host/--/api/v2/push/send` with a JSON array of **≤ 100 messages** |
| Receipts | `POST https://exp.host/--/api/v2/push/getReceipts` with `{"ids":[…]}`. Docs allow ≤ 1,000 ids; the official SDK uses **300**, so FordCast uses 300. |
| Headers | `Authorization: Bearer ${EXPO_ACCESS_TOKEN}` (enable "require access token" / enhanced push security in EAS), `Content-Type: application/json`, `Accept-Encoding: gzip`; send `Content-Encoding: gzip` for bodies > 1 KB |
| Limits | **600 notifications/s per project**. Payload ≤ **4 KiB**. Receipts are kept **24 h**; check them ≥ 15 min after sending. |
| Message fields | `to, title, subtitle, body, data, sound, ttl, expiration, priority('default'\|'normal'\|'high'), interruptionLevel('active'\|'critical'\|'passive'\|'time-sensitive'), badge, channelId, categoryId, mutableContent, collapseId, tag, threadId, contentAvailable` |
| Errors (ticket/receipt `details.error`) | `DeviceNotRegistered`, `MessageTooBig`, `MessageRateExceeded`, `InvalidCredentials`, `MismatchSenderId`, `ProviderError`, `DeveloperError`, `ExpoError` |
| iOS | `time-sensitive` needs the Time Sensitive entitlement (self-serve `[U approval]`; Lane B only). **Never `critical`** (Apple-granted entitlement; Roadmap F118). |
| Not used | Python `exponent-server-sdk` 2.2.0 is synchronous (`requests`) `[V]`. Call the HTTP API with httpx instead. |

### 16.15 Supabase and OpenFreeMap
These are infrastructure, not data sources: Supabase is specified in §20–§21 and OpenFreeMap in §29. Both are credited in About.

### 16.16 Licensing and attribution (one table; About, README, video end card MUST match)

| Source | License / terms | Attribution text | Polite use |
|---|---|---|---|
| USGS Water Data, NLDI | U.S. public domain `[U]`; provisional-data disclaimer | "Data: U.S. Geological Survey, Water Data for the Nation (provisional, subject to revision)" | key in header, ≤ 1,000 req/h, bbox batching, 429 backoff |
| NOAA NWPS, NWS API | U.S. public domain | "Source: NOAA/NWS" | User-Agent with contact; ≥ 60 s between polls |
| NOAA MRMS | Open; attribution requested; no endorsement; OU keeps commercial MRMS rights `[V]` | "Radar rainfall: NOAA MRMS via NOAA Open Data Dissemination" | read only needed files |
| City of Austin Open Data | portal terms `[U]` | "Source: City of Austin Open Data Portal" | Socrata token if used |
| ATXfloods | no published API terms `[U]` | "Official status: ATXfloods (City of Austin)" | **permission first; never scrape** |
| Travis County GIS / TxGIO | agency terms `[U]` | name the agency | one-time pulls |
| OpenStreetMap | **ODbL 1.0** | "© OpenStreetMap contributors" | Overpass fair use; cache |
| Open-Meteo | **CC BY 4.0**, non-commercial free tier | "Weather data by Open-Meteo.com" | < 600/min |
| LCRA Hydromet | provisional; terms `[U]` | "Data: LCRA Hydromet" | permission; no live polling |
| openrouteservice | ORS terms `[U]` | "Routing © openrouteservice.org by HeiGIT" | server-side key; cache |
| Stadia Maps | non-commercial free tier | "Routing © Stadia Maps, © OpenStreetMap contributors" `[U wording]` | fallback only |
| Photon | best-effort public instance | "Search © komoot Photon, © OpenStreetMap contributors" `[U wording]` | fallback only |

### 16.17 Cadence and request budget (live)

| Source | Cadence | Requests/hour | Stored in | Tier |
|---|---|---|---|---|
| USGS `latest-continuous` (bbox, `00065`) | every tick | 12 | `readings` | MVP |
| USGS `continuous` gap backfill | on gap, ≤ 1/h/site | ≤ 10 | `readings` | MVP |
| USGS metadata (`combined-metadata`, `monitoring-locations`) | daily (06:00 UTC tick) | < 1 | `gauges` | MVP |
| NWPS `/gauges/{site}` | daily + `nwps sync` on demand | < 2 | `nws_gauges` | MVP |
| ATXfloods (only with permission) | every tick | 12 | `official_status` | MVP if granted |
| NWS `/alerts/active?area=TX` | every tick | 12 | `nws_alerts` | Stretch |
| Open-Meteo per basin (≤ 20) | every 3rd tick | ≤ 80 | `basin_rain` | Stretch |
| MRMS latest file | every 2nd tick | 6 GETs (~1–2 MB each) | `basin_rain` | Stretch |
| Expo push/receipts | per tick when needed | storm-dependent | `private.alerts_sent` | MVP |
| NLDI, inventory layers, storm archives | **offline only** | 0 | repo / Storage | MVP |

### 16.18 Austin gauge table (USGS) — regenerate programmatically

The agent MUST regenerate this table with `waterdata.get_combined_metadata(bbox=[-98.20,29.95,-97.40,30.70], parameter_code="00065", data_type="Continuous values")`, keep series whose `end` is within 2 days, fill lat/lon and datum from `monitoring-locations`, and commit it as `data/seed/gauges.geojson`. The rows below are the research starting point. Values marked `[U]` MUST be confirmed.

| Site | Name | Key facts | NWS LID | FordCast use | Tag |
|---|---|---|---|---|---|
| 08154700 | Bull Ck at Loop 360 nr Austin | DA 22.3 mi²; altitude 535.05 ft NAVD88. NWS impacts: **9 ft** — FM 2222/Shoal Creek bridge dangerous, "several low crossings flood from headwaters to Town Lake"; **13 ft** — widespread secondary-road flooding. Crests 5.07 ft (2025-07-05), 5.71 ft (2019-05-08) | via USGS id | Bull Creek corridor crossings | [V] |
| 08154750 | W Bull Ck at Loop 360 | West Bull tributary | – | upstream of Bull Ck | [V name] |
| 08155200 | Barton Ck at SH 71 nr Oak Hill | DA 89.7 mi²; most upstream Barton gauge | – | Barton upstream trigger | [V] |
| 08155300 | Barton Ck at Loop 360 | datum 511.11 ft NAVD88 | ABTT2 `[U map]` | | [V] |
| 08155400 | Barton Ck abv Barton Spgs | DA 125 mi²; no flow 38 % of 2005–present | BCCT2 `[U map]` | | [V] |
| 08156800 | Shoal Ck at W 12th St | 30.276598, −97.7503052; DA 12.3 mi²; datum 455.45 ft; record 23.11 ft (1981) | AHOT2 `[U map]` | urban flashy creek | [V] |
| 08157000 | Waller Ck at 38th St | DA 2.31 mi² | – | may lack an NHDPlus reach | [V] |
| 08157500 | Waller Ck at 23rd St | historical only; **not confirmed active** | – | **do not use** | [U] |
| (unknown) | Waller Ck at Red River St | stage only, no rating | WART2 | | [V NWS] |
| 08158000 | Colorado Rv at Austin | datum 391.96 ft; **regulated by Lake Travis since 1937** | `[U]` | **not** a creek-crossing predictor | [V] |
| 08158030 · 08158045 · 08158050 | Boggy Ck at Manor Rd · Ft Br Boggy Ck at Manor Rd · **Boggy Ck at US 183** | | – | | [V] |
| 08158100 | Walnut Ck at FM 1325 | upper Walnut | – | upstream trigger | [V] |
| 08158200 | **Walnut Ck at Dessau Rd** | | – | | [V] |
| 08158380 · 08158400 · 08158500 | Little Walnut Ck at Georgian Dr · at IH 35 · at Manor Rd | | – | | [V] |
| 08158600 · 08158640 | Walnut Ck at Webberville Rd · Walnut Ck SP RR Bridge | lower Walnut | – | | [V] |
| 08158650 | Colorado Rv bl Austin | | – | not a predictor | [V name] |
| 08158700 | **Onion Ck nr Driftwood** | ≈30.08, −98.01; datum 868.52 ft; record peaks Oct 2015 | DRWT2 | **primary upstream trigger for Onion Ck** | [V] |
| 08158810 | **Bear Ck bl FM 1826 nr Driftwood** | Onion tributary | – | | [V] |
| 08158820 · 08158825 | Bear Ck at FM 1626 · Little Bear Ck at FM 1626 nr Manchaca (DA 21.0 mi²) | | – | | [V] |
| 08158840 | Slaughter Ck at FM 1826 | DA 8.24 mi²; datum 876.25 ft; **USGS webcam** | – | | [V] |
| 08158860 | Slaughter Ck at FM 2304 | DA 23.1 mi²; datum 656.16 ft | – | | [V] |
| 08158922 | Williamson Ck at Brush Country Blvd | DA 6.79 mi² (08158920 not found) | – | upper Williamson | [V] |
| 08158930 | Williamson Ck at Manchaca Rd | datum 618.63 ft | AAIT2 `[U map]` | | [V] |
| 08158970 | Williamson Ck at Jimmy Clay Rd | DA 27.6 mi² | – | lower Williamson | [V] |
| 08159000 | **Onion Ck at US Hwy 183** | DA 321 mi²; datum 443.28 ft; City cooperative; **2013 ≈ 40.15–41 ft, ~120,000 cfs**; 2015-10-30 39.22 ft | **ATIT2** (15/17/23/27 ft) | **hero gauge for Storm Replay** | [V] |
| 08171000 | Blanco Rv at Wimberley | 2015: last reading ~40.21 ft before washout; USGS estimate 44.9 ft / 175,000 cfs | `[U]` | outside TX-10; context only | [V] |
| — | Gilleland, Brushy, Cypress, Big/Little Sandy Ck | **not verified** as USGS continuous; Big Sandy at Jonestown is **LCRA** | – | use the API inventory | [U] |

- **Datum:** `00065` is stage above a local gauge datum. Road comparisons use `elevation = stage + datum_ft`. Store `datum_ft`/`datum_name` from `monitoring-locations` (field names `[U]`: VERIFY in S1/S2). If a gauge datum changed between storms (`[U]`, check `time-series-metadata`), learn triggers per era (§18.4). The road elevations for the `gauge` truth class are converted to this datum (§17.6).
- **Reliability:** a USGS page once said about 25–30 % of sites were not transmitting because of a satellite issue, and third-party trackers flagged stale Austin gauges in Aug 2026 `[V snippets; U current]`. **Staleness handling is mandatory** (§18.9).

### 16.19 Storm Replay storm catalog

Storm IDs are canonical (used in `data/storms/<id>/`, `storms.id`, `fordcast://replay/<id>`, `data/replays/<id>.json.gz` and, after `make app-data`, `mobile/assets/replays/<id>.json.gz`). Windows are **initial UTC bounds**. The final window is computed from data as **first upstream rise − 12 h → last truth onset + 12 h**, and the Parquet extends **24 h before** the window start for baselines (§19.3). Local times below are CDT.

**Canonical list (Step 0 decided default D10, A §1.2).** Bundled storms: `halloween-2013`, `memorial-day-2015`, `halloween-2015`, `oct-2018` (the "should stay calm" control) and `july-2025` (USGS-only data, reported honestly; LCRA is optional enrichment, F19). Each is bundled **only if its data checks pass** (S3 window coverage, ≤ 150 KB timeline, schema-valid; a storm that fails is dropped from `bundle`, logged in `docs/data-bridge-verification.md`, and never replaced by a hand-picked substitute). The calm-day set `calm-2024` (below) is scored but never bundled. No other ID is used anywhere (code, fixtures, Maestro flows, README, video).

| ID | Name EN / ES | Initial window (UTC) | Gauges that show it | Facts | Replay notes | Tag |
|---|---|---|---|---|---|---|
| `halloween-2013` | Halloween Flood 2013 / Inundación de Halloween 2013 | 2013-10-30T12:00Z → 2013-11-01T00:00Z | 08158700 Driftwood → 08159000 US 183; Bear, Slaughter, Williamson | US 183 **40.15 ft (NWS) / ~41 ft (USGS)**, ~120,000 cfs. Gauge **stopped transmitting ~06:15 CDT (11:15Z) at 21 ft**, rose **11 ft in 15 min** (06:15–06:30), and was back ~2.5 h later near 40 ft. The "rose 11 ft in 15 min" figure means the logger **recorded** through the outage and the readings were recovered later. About 5 deaths, ~660 structures. | **Best Q4 story:** a real upstream→downstream lag **plus a documented transmission outage that shows `unknown`**: the gauge went silent; its readings only arrived later. `meta.toml` lists it in `outages` (§19.3), so every reading observed inside the outage becomes available only at the outage end (§19.4), even though today's archive may hold those readings. No MRMS (gauge-only). VERIFY BEFORE USE: the outage bounds (~11:15–13:45Z) from the USGS alert and S3. | [V] |
| `memorial-day-2015` | Memorial Day Flood 2015 / Inundación del Día de los Caídos 2015 | 2015-05-23T12:00Z → 2015-05-27T00:00Z | Onion Ck (Driftwood, US 183 crest ~22.9 ft listed 05-26), Blanco 08171000 (washed out) | Rain ~19:00Z May 23 → 10:00Z May 24. Wimberley last reading ~40.21 ft; USGS estimate 44.9 ft / 175,000 cfs. | Moderate Onion response; MRMS via IEM `GaugeCorr_QPE_01H` `[U availability]` | [V] |
| `halloween-2015` | Oct 30, 2015 Flood / Inundación del 30 de octubre de 2015 | 2015-10-30T00:00Z → 2015-11-01T00:00Z | 08158700 Driftwood (**record peak**) → 08159000 US 183 | US 183 **39.22 ft (P)**; Austin-Bergstrom **14.99 in** daily; LCRA gauge at Onion/US 183 logged 13.40 in in 3 h; 3–4 deaths | **Strong second storm** for the event split | [V] |
| `oct-2018` | Oct 2018 Llano Flood / Inundación del Llano 2018 | 2018-10-15T00:00Z → 2018-10-18T00:00Z | Llano River (39.91 ft, highest since 1935) | FM 2900 bridge at Kingsland destroyed; 150+ crossings closed regionally | **Control storm**: the river is regulated below the dams, so FordCast should stay calm on Austin creeks. Count its alerts as false alarms if no onsets. Its timeline `metrics` are `null` where undefined (no onsets → POD undefined). | [V] |
| `july-2025` | July 4–5, 2025 Flood / Inundación del 4 y 5 de julio de 2025 | 2025-07-04T12:00Z → 2025-07-06T12:00Z | Bull Ck 08154700 crest 5.07 ft; Big Sandy at Jonestown (**LCRA**) | FFW 13:30 Jul 4; 3–5 in/h around midnight; Flash Flood Emergency for western Travis; 15–20 in bullseye; ~9 deaths in the Sandy Creek area | **Best MRMS replay** (AWS v12). **USGS-only data** in MVP; Sandy Creek needs LCRA (permission, F19, optional enrichment). Alert overlay (F82). With USGS only, Austin creek signals may be modest; report that honestly. | [V] |
| `calm-2024` | Calm days 2024 / Días sin crecida 2024 | 40 sampled UTC days in 2024 (rule below) | every active linked gauge | No flood products, no overtop (by construction) | **Not a storm and never bundled.** Feeds `calm_fa_per_crossing_per_100d` and ML calm sampling only; never a LOSO fold; never a hero. | [U] until sampled |
| (not canonical) `may-2019` | — | 2019-05-08 | Bull Ck 5.71 ft | | **Not bundled and not trained on in MVP.** Adding it as a training storm changes every number, so it needs the human's OK before the science freeze (stop-and-ask, §1.7 item 8) and a README note. | [V]/[U] |
| (excluded) | Memorial Day 1981 | — | Shoal Ck 23.11 ft | | Predates 15-min data; cannot be replayed | [V] |

**Hero selection (no cherry-picking).** Nobody picks the hero by hand, and it is never the best case. `results.json.hero` is filled by the **pre-registered rule** in `tools/select_hero.py` (§18.13): among the bundled storms, the tier-A crossing hit whose AVOID lead time is closest to the overall median lead time (ties: earlier storm in this table's order, then the smaller crossing id). The script is committed, with its tests, **before** the first backtest result exists (A §6.1 Day 4), so the git history proves the rule came first. The README states the rule (E §40.2). The app and video always pair the hero number with the honesty line (`replay.honesty`, §3.7). `app_config.featured_storm` and the replay index's `hero_storm_id` follow `hero.storm_id` (§19.14, §20.9).

#### Calm-day set `calm-2024` (false alarms per 100 calm days; ML calm sampling)

The trust metric "false alarms per crossing per 100 calm days" (§18.12) and the ML calm samples (§18.11) need days on which nothing flooded. `calm-2024` is that set. It is defined by a fixed, documented rule that never looks at FordCast's own output, so it can't be tuned to make the model look good.

1. **Candidate days:** every UTC calendar day from `2024-01-01` to `2024-12-31` (a full recent year inside the v1 archive, before the live run, overlapping no catalog storm).
2. **Exclude official flood days:** drop any day whose UTC interval overlaps an NWS `Flood Warning`, `Flood Watch`, `Flood Advisory`, `Flood Statement`, `Flash Flood Warning`, `Flash Flood Watch` or `Flash Flood Statement` covering any of `settings.nws_ugc` (TXC453, TXC209, TXC491, TXC053), taken from the IEM CAP archive (§16.7), **plus the day after** each such day (recession). VERIFY BEFORE USE that the IEM CAP files exist for 2024 (fetch one day's file; log the result in `docs/data-bridge-verification.md`); fallback: skip this step, rely on step 3 alone, and write `assumptions.calm_rule_fallback = "no CAP archive; truth-only exclusion"` into `results.json`.
3. **Exclude observed overtops:** drop any day on which any tier-A crossing's target gauge reaches its `overtop_stage_ft` (§17.6), plus the day after. This is the truth definition, so `truth.csv` for `calm-2024` is empty **by construction**.
4. **Exclude incomplete days:** drop any day on which fewer than 80 % of the active linked gauges have at least 90 % of their 15-min readings (missing data would make crossings `unknown`, which is neither a hit nor a false alarm).
5. **Never** exclude a day because of rises, watch stages, trigger stages or anything the model computes: those are exactly the days where false alarms happen.
6. **Sample:** `days = sorted(random.Random(20241231).sample(sorted(candidates), 40))` (N = 40; at least 30 required; if fewer than 30 candidates remain, use them all and report the count). Record `n_candidates`, `seed` and `days` in `data/storms/calm-2024/meta.toml` (`kind = "calm"`, `bundle = false`).

**Commands** (after `link tiers`, so overtop stages exist; Day 2):
```text
uv run python -m fordcast calm-days --year 2024 --n 40 --seed 20241231   → data/storms/calm-2024/meta.toml (days, n_candidates, exclusions log)
uv run python -m fordcast backfill --storm calm-2024                     → data/storms/calm-2024/readings.parquet
```
`backfill --storm calm-2024` sends **one** `continuous` request per linked gauge for `2023-12-31T00:00:00Z/2025-01-01T00:00:00Z` (≤ 3 years; about 4 pages of 10,000 at 15-min resolution), then keeps only each sampled day plus the 24 h before it. About 30 gauges × 4 pages ≈ 120 requests, well under the keyed quota. `backfill --all` includes it.

**Scoring:** each day is replayed as its own window (`[day 00:00Z, day + 1 00:00Z)`, 6-h lookback, tracker starting at `unknown`) with the **live** parameter set learned from all storms (calm days are in no storm's training fold, so this is out-of-sample), the frozen delays (§19.4) and no outages unless documented. The scorer re-checks every day against the overtop stages and fails loudly if any overtop appears. Formula and reporting: §18.12.

**Done when:** `data/storms/calm-2024/meta.toml` lists ≥ 30 days with the seed and the exclusion log; `results.json` reports `calm_fa_per_crossing_per_100d` for `upstream_rule` and `nearest_gauge`, with `assumptions.calm_set`, `calm_days`, `calm_candidates` and `calm_seed`.

### 16.20 Step-0 live smoke test — `tools/smoke_test.py` `[MVP, Day 0]`

**Purpose:** prove every endpoint above works **today**, record real field names and limits, and catch API drift before any code depends on it. Output is committed to `docs/data-bridge-verification.md` (human-readable) and `docs/data-bridge-verification.json` (machine-readable, read by the contract tests to choose fallbacks).

**Usage** (`make smoke` runs the first line; A §5.2. `smoke_test.py` runs in the **backend** environment because it uses `httpx`/`dataretrieval`/`pynhd`, A §5.3)
```bash
cd backend && uv run python ../tools/smoke_test.py --out ../docs/data-bridge-verification   # all checks (= make smoke)
uv run python ../tools/smoke_test.py --only S2,S3 --verbose
```
**Environment:** `USGS_API_KEY` (required), `PROJECT_CONTACT_EMAIL` (required, for the User-Agent), `ORS_API_KEY`, `STADIA_KEY` and `SOCRATA_APP_TOKEN` (optional; their checks are skipped if absent). Python 3.13, httpx only (plus `dataretrieval`/`pynhd` for S3/S4 cross-checks if installed).

**Rules:** 20 s timeout per request; ≤ 40 USGS requests total; never print keys, and redact `X-Api-Key`/`api_key` from any echoed URL; each check catches its own exceptions and records `PASS | FAIL | SKIP | WARN` with evidence; exit code 0 if every **MVP** check passes, else 1.

| ID | Check | PASS criteria | Records |
|---|---|---|---|
| S1 | `GET {usgs}/collections?f=json` | `latest-continuous`, `continuous`, `monitoring-locations`, `time-series-metadata`, `combined-metadata`, `peaks` exist | collection ids; v1 base reachable |
| S2 | `latest-continuous` bbox request (§16.2) with key; then repeat with `parameter_code=00065,00060` and with `monitoring_location_id=USGS-08158700,USGS-08159000` | ≥ 10 Austin gauges returned; `x-ratelimit-limit` present | rate-limit headers; whether comma lists work (true/false); per-site `now − time` and `last_modified − time`; qualifier values seen; datum/altitude field names from `monitoring-locations` for 08159000 |
| S3 | `continuous` for USGS-08159000, `00065`, `2013-10-30T00:00:00Z/2013-11-01T00:00:00Z`; same for `2015-10-29/2015-11-01`, `2015-05-23/2015-05-27`, `2025-07-04/2025-07-06`; and 08158700 for 2013 | 15-min data present in each window | row counts; largest gap in 2013; **whether the archive holds readings inside the documented outage (~11:15–13:45Z)** (expected: yes, recovered later; either way replay availability follows the `meta.toml` outage table, §19.4); peak value/time per storm |
| S4 | NLDI `hydrolocation?coords=POINT(-97.6886 30.1757)` (example point near Onion Ck/US 183 `[U]`) → `comid/{comid}/navigation/UT/nwissite?distance=100`; also DM flowlines from `nwissite/USGS-08158700` with `stopComid` | `08158700` in the upstream list | comid, measure, snap distance; whether `stopComid` works on DM |
| S5 | NWPS `GET /gauges/08159000`; `/gauges/ATIT2/stageflow`; `/reaches/{reachId}/streamflow?series=short_range` | `lid == "ATIT2"`; categories 15/17/23/27; `flood.impacts` non-empty | impact statements (verbatim); the real reach path |
| S6 | NWS `GET /alerts/active?area=TX` and `?point=30.2672,-97.7431` with UA; `GET /zones/county/TXC453` | 200 with UA (also confirm 403 without UA, once) | UGC codes; where `flashFloodDamageThreat` lives if any FFW is active (else "not observed") |
| S7 | City `columns.json`, `export.geojson`, ArcGIS `FeatureServer/0?f=pjson`; County `MapServer/1?f=pjson`; TxGIO `MapServer/0?f=pjson` | ≥ 1 source returns crossing features | **real field names** (gate id, name, gage number, coordinates), record counts |
| S8 | OpenFreeMap Positron style JSON + one tile; glyph URL with `Noto Sans Regular` | 200s | style URL, glyph template (feeds §29) |
| S9 (Stretch) | `aws s3 ls --no-sign-request s3://noaa-mrms-pds/CONUS/RadarOnly_QPE_01H_00.00/` (or HTTPS listing); Open-Meteo `minutely_15` | listing works; Open-Meteo 200 | latest key name; accepted Open-Meteo param names |
| S10 | ATXfloods: **manual, devtools only.** The script prints instructions and a template; it never requests atxfloods.com | human fills in | endpoint names, status vocabulary, "permission: pending/granted" |
| S11 (Stretch) | ORS directions (one tiny avoid polygon) + geocode autocomplete "Zilker Park"; Stadia route | 200s | `x-ratelimit-*` headers if present; whether ORS geocode accepts the header key |
| S12 | Expo `getReceipts` with a fake id and the access token | 200 with empty `data` | auth works |

```python
# tools/smoke_test.py (skeleton — agent-written)
CHECKS: dict[str, Check] = {}          # id -> Check(tier, fn)

def check(cid: str, tier: str):
    def deco(fn): CHECKS[cid] = Check(cid, tier, fn); return fn
    return deco

@check("S2", "MVP")
async def s2_latest(ctx: Ctx) -> Result:
    r = await ctx.usgs_get("collections/latest-continuous/items", {
        "f": "json", "bbox": "-98.20,29.95,-97.40,30.70", "parameter_code": "00065",
        "properties": "monitoring_location_id,time,value,approval_status,qualifier,last_modified",
        "skipGeometry": "true", "limit": "10000"})
    feats = r.json()["features"]
    now = datetime.now(UTC)
    lat = {f["properties"]["monitoring_location_id"]:
           round((now - parse(f["properties"]["time"])).total_seconds() / 60, 1) for f in feats}
    return Result.pass_if(len(feats) >= 10, evidence={
        "n": len(feats), "ratelimit": {k: v for k, v in r.headers.items() if k.startswith("x-ratelimit")},
        "age_min_by_site": lat})

async def main(args):
    results = [await run_one(c, ctx) for c in selected(args)]
    write_markdown(results, args.out + ".md"); write_json(results, args.out + ".json")
    sys.exit(0 if all(r.status == "PASS" for r in results if r.tier == "MVP") else 1)
```
**Done when:** `docs/data-bridge-verification.md` is committed with every MVP check PASS (or a FAIL with the chosen fallback written next to it), and every "VERIFY BEFORE USE" item in §16 that S1–S12 covers is resolved there.

---

## §17. Crossing inventory & gauge linking

**Goal:** a committed, reviewed, honest table of crossings, each with a tier, a ground-truth class, and links to the gauges **truly upstream** of it (F1, F2). Everything here is **offline** (CLI + notebook 01). The live system only reads the results.

### 17.1 Pipeline (CLI; each step writes files that the next step reads)

```text
uv run python -m fordcast inventory pull     → data/raw/inventory/*.geojson                  (§16.4)
uv run python -m fordcast inventory build    → data/seed/crossings.geojson (deduped, ids, sources)
uv run python -m fordcast nwps sync          → nws_gauges + impact statements                  (§16.6)
uv run python -m fordcast link snap          → data/nldi_cache/snaps.geojson (+ snap_overrides.csv applied)
uv run python -m fordcast link upstream      → data/nldi_cache/upstream/<crossing>.geojson, flowlines
notebooks/01_inventory_and_snaps.ipynb       → human map review → data/overrides/snap_review.csv
uv run --project tools --group dem python tools/road_elevation.py   → data/overrides/road_elevations.csv
                                             (from the repo root; only for `gauge`-class crossings whose road elevation
                                              sources 1–2 failed, §17.6)
uv run python -m fordcast link tiers         → tiers + truth classes (crossing_tiers.csv, overtop_stages.csv)
uv run python -m fordcast calm-days --year 2024 --n 40 --seed 20241231 → data/storms/calm-2024/meta.toml  (§16.19)
uv run python -m fordcast backfill --all     → data/storms/<id>/readings.parquet (every catalog storm + calm-2024; §19.3)
uv run python -m fordcast learn --loso       → data/links/crossing_gauge_links.csv (τ, triggers; live + per-fold; §18)
uv run python -m fordcast seed-sql > ../supabase/seed.sql                                       (§21.5)
uv run --project tools python tools/data_manifest.py [--upload]   → data/MANIFEST.json (+ Parquet > 5 MB to Storage)
                                             (from the repo root; = make data-upload with --upload)
```
`make data` (A §5.2) runs the non-interactive steps in order (`road_elevation.py`, `calm-days` and the upload are run by hand when needed). A step refuses to run if an input it needs is missing or older than its upstream input.

**Large data files (`tools/data_manifest.py`, `make data-upload` / `make data-fetch`).** Git holds data files up to 5 MB. Larger files (in practice some `readings.parquet`) live in the public Storage bucket under a **content-hashed** path, `fordcast-public/data/<path without extension>.<sha256[:12]>.<extension>` (e.g. `data/storms/halloween-2015/readings.3f2a9c1b7d04.parquet`; cache-control `31536000, immutable`; new content → new path), and are listed in `data/.gitignore`.
- `tools/data_manifest.py` (tools env; `httpx` + standard library) walks `data/**` and writes `data/MANIFEST.json`: one entry per file `{"path", "sha256", "bytes", "location": "git" | "storage", "url"}` (`url` is the public Storage URL for `storage` entries, `null` for git files), sorted by path, so the file is deterministic.
- `--upload` (`make data-upload`, needs `SUPABASE_URL` + `SUPABASE_SECRET_KEY` from `backend/.env`) uploads every file > 5 MB that isn't in Storage with that sha256 yet, adds its path to `data/.gitignore`, then rewrites the manifest. Run it after every backfill that produced a large file.
- `--download` (`make data-fetch`; no keys needed: the bucket is public) fetches every `storage` entry that is missing locally or whose sha256 differs, verifies the sha256, and fails on any mismatch. CI and every clean clone run it before `replay-verify` and the backtest (§24.9).
- `--verify` (no network; CI `docs-guards`, §24.9) recomputes the sha256 of every git-tracked data file and compares it with `data/MANIFEST.json`; a stale manifest fails the build.

### 17.2 Crossing record (one schema everywhere)

`backend/fordcast/domain.py` (pydantic v2), mirrored by `public.crossings` (§21) and the `crossings.geojson` properties the app bundles (§28):

| Field | Type | Rule |
|---|---|---|
| `id` | str | `^[a-z0-9-]{3,40}$`. Prefix by primary source: `atx-<gateid>` (City), `tc-<objectid>` (Travis County), `tx-<objectid>` (TxGIO), `osm-<n\|w><id>`, `man-<slug>`, `test-<nnnn>` (test crossings, §22.8). **IDs never change once published** (subscriptions and deep links use them); a retired crossing gets `is_active=false`. |
| `name`, `name_es` | str, str? | Display name ("Bull Creek at Loop 360"). `name_es` only if it differs (rare; road names stay English). |
| `name_spoken_en`, `name_spoken_es` | str? | Expanded for TTS ("Farm to Market 1626"); §3.10 |
| `road`, `creek` | str? | From source fields; creek filled from the NHDPlus GNIS name of the snapped flowline when missing |
| `jurisdiction` | str | `City of Austin` · `Travis County` · `Hays County` · … |
| `lon`, `lat` | float | WGS84; the **road point** (not the snapped point) |
| `comid`, `snap`, `snap_dist_m` | int?, enum, float? | `snap ∈ auto · verified · override · rejected` (§17.8) |
| `tier` | `A·B·C` | §17.6 |
| `target_gauge_id` | str? | gauge at or adjacent to the crossing (`at_site` link), if any |
| `overtop_stage_ft` | float? | stage at `target_gauge_id` (or the impact-statement gauge) at which water is over the road |
| `truth_quality`, `truth_source` | enum?, str? | `sensor · gauge · impact_statement · proxy`, plus a human-readable source citation |
| `source`, `source_refs` | str, list | primary source key (`coa:q6kt-v2zm`, `travis:Low_Water_Crossings/1`, `txgio:Low_Water_Crossing/0`, `osm`, `manual`) and every merged `{source, ref}` |
| `divided_road` | bool | widens on-route tolerance to 60 m (§32) |
| `is_active`, `is_test` | bool | test crossings never appear publicly (§21.2) |
| `inventory_version` | str | `inv-YYYYMMDD` of the build |

### 17.3 Normalizing each source

The agent MUST read the real field names from Step 0 S7 and write the mapping into `backend/fordcast/linking/inventory.py` as one dict per source. Do not guess field names in code. Every mapping has a test that uses a recorded raw sample from `tests/fixtures/inventory/`.

| Source | Point geometry | id ref | name/road/creek | Notes |
|---|---|---|---|---|
| City `q6kt-v2zm` / FEWS | point (or `location` column) | gate id column `[U]` | name/description columns `[U]` | 22 gates; **gage number** column (if present) can link a City sensor → truth class `sensor` |
| Travis County layer 1 (and 0) | point | `OBJECTID` (or a crossing id field `[U]`) | road/creek fields `[U]` | Layer 0 is "Low Water Crossing (Bridge)"; keep it but flag `kind=bridge` in `source_refs` |
| TxGIO | point | `objectid` | fields after `fips` `[U]` | Use only to fill gaps inside Travis/Hays |
| OSM | node point, or way **center** (`out center`) | `n<id>` / `w<id>` | `name`, `ref`, `waterway` from the crossed way if available | Only `ford=yes` (and legacy `highway=ford`); skip `ford=stepping_stones`/`boat` (pedestrian) |
| Manual | `data/overrides/manual_crossings.csv` | slug | all fields typed | Every row needs a `source_note` (e.g. "ATXfloods list, verified on site photo 2026-10-15") |

### 17.4 Deduplication (agent-written, unit-tested)

1. Project to UTM 14N (EPSG:32614) with pyproj; build a shapely STRtree.
2. Candidate duplicates are points within **30 m** of each other `[V hydro]`. Also require one of: same normalized road name (lowercase, strip "rd/road/st/street/dr/drive", "fm"→"farm to market"), **or** the same snapped comid (after §17.8), **or** distance ≤ 10 m.
3. Merge each duplicate cluster into one record. **Precedence** for attributes: City > Travis County > TxGIO > manual > OSM. Geometry comes from the highest-precedence source. Concatenate `source_refs`.
4. Points 30–80 m apart on the same road are **not** auto-merged. They are written to `data/review/near_duplicates.csv` for the human to decide.
5. **Test:** synthetic sets (exact duplicate, 25 m apart on the same road, 25 m apart on different roads, 50 m same road) produce the expected merges.

### 17.5 Scope filter
Keep crossings inside Travis County plus the immediate upstream counties that drain into Travis crossings (Hays is needed for Onion/Bear/Slaughter context). Run the `link upstream` step **only** for crossings inside the app's service area polygon `data/seed/service_area.geojson` (Travis County boundary, buffered 2 km).

### 17.6 Crossing tiers and ground-truth classes (honesty in the data model)

| Tier | Definition | Model | UI (§3) |
|---|---|---|---|
| **A — validated** | Has **real ground truth** (truth class `sensor`, `gauge` or `impact_statement`; **never** `proxy`) **and** a known `overtop_stage_ft`, **and** ≥ 1 upstream link with τ learned from ≥ 1 storm | Rule (+ ML Stretch); full backtest | normal |
| **B — linked, not validated** | ≥ 1 active upstream gauge via NLDI, but no real ground truth: either no label at all, or only a `proxy` label (including every `gauge`-class candidate whose road elevation could not be obtained, below) | Rule with **transferred** parameters (§17.13); a `proxy`-labeled crossing may instead learn its parameters from proxy onsets and is scored only in the separate `proxy` split (§18.12) | "Estimated" badge (`tier: "B"`) |
| **C — not monitored** | No usable upstream gauge (no flowline, no gauge, or snap rejected) | Official status only | `unknown`, reason `NO_UPSTREAM_GAUGE` ("not monitored by FordCast") |

**Ground-truth classes** (`truth_quality`, best first; §18.2 explains how each becomes labels):

| Class | Meaning | Source of `overtop_stage_ft` |
|---|---|---|
| `sensor` | A City/FEWS sensor at the crossing with a known water-over-road history | City data (gage number + threshold), with permission |
| `gauge` | A USGS gauge **at the road** (same structure or within 500 m along the channel with no tributary between) | `overtop_stage_ft = road_elev_ft − gauge_datum_ft`, both in the same vertical datum; road elevation from the ordered sources below |
| `impact_statement` | An NWS impact statement naming the road at a stage on a nearby gauge | NWPS `flood.impacts` (§16.6), human-confirmed |
| `proxy` | No direct evidence; a documented stand-in | The gauge's NWS **action stage**, else the P99 of its 15-min record. **Reported separately** in every result (§18.12). A `proxy` crossing is **tier B**, never tier A |

**Road elevation for the `gauge` class (sources in this order; stop at the first that works).** Every value names its source in `truth_source`, and the student confirms each row (`confirmed_by`) after looking at the USGS site page/photo or webcam.
1. **NWS NWPS** (§16.6): an impact statement or flood-category description that names the crossing's road gives the overtop stage at the gauge directly (`truth_source = "NWS impact <lid> @ <stage> ft"`). No datum conversion is needed because the stage is already on the gauge datum.
2. **City of Austin low-water-crossing gate data** (§16.4 source A/B; the "gage number" + threshold columns if present, verified in S7): a documented water-over-road stage for that gate's gauge (`truth_source = "COA LWC gate <id>: <field> = <value>"`).
3. **USGS 3DEP 1 m DEM via `py3dep`** (HyRiver), only if 1–2 fail: `tools/road_elevation.py` runs in the tools environment's `dem` group (`uv run --project tools --group dem python tools/road_elevation.py`, A §5.3; `py3dep` lives there because its pins conflict with the backend's `pynhd`). VERIFY BEFORE USE: `pip index versions py3dep` (the pinned 0.19.0 must exist) and, from the package's shipped docstrings, the point-elevation function and its `source` options (e.g. `py3dep.elevation_bycoords`); record both in `docs/decisions/verifications.md`. Method: sample the DEM every 5 m along the road within 30 m of the crossing point and take the **lowest** value (water tops the low point first); 3DEP elevations are NAVD88 meters, so convert to feet (× 3.28084). Convert to the gauge datum with the USGS site datum metadata from `monitoring-locations` (`datum_ft`, `datum_name`, §16.18): if the gauge datum is NAVD88, `overtop_stage_ft = road_elev_ft − datum_ft`; if it is NGVD29, use the site's published NGVD29→NAVD88 offset from the USGS site metadata (`datum_offset_ft`): `overtop_stage_ft = road_elev_ft − (datum_ft + datum_offset_ft)`; if no offset is published, stop at step 3 and treat the crossing as not obtainable (never guess an offset). Output: `data/overrides/road_elevations.csv` (`crossing_id, gauge_id, road_elev_ft_navd88, n_samples, method, datum_name, datum_ft, datum_offset_ft, overtop_stage_ft, source, confirmed_by, date`), merged into `overtop_stages.csv` with `truth_source = "USGS 3DEP 1 m via py3dep <date>: road <x> ft NAVD88; datum <y> ft <name>"`. A DEM can show a bridge deck, vegetation or water instead of the road surface, so sanity-check the result: an `overtop_stage_ft` ≤ 0 (at or below the gauge datum) or above the gauge's record stage (from NWPS or the USGS `peaks` collection; a low-water crossing that never flooded in the record is implausible) is rejected and logged in `docs/data-bridge-verification.md`, never used.
4. **None obtainable** → the crossing gets the `proxy` class and is **tier B**, labeled honestly ("Estimated"). It is never silently counted as tier A. The Day 1–2 gate (A §6.1) counts **only real** tier-A crossings.

**Override files (committed, one row per decision, each with a `source`/`note` column):**
- `data/overrides/overtop_stages.csv`: `crossing_id, gauge_id, overtop_stage_ft, truth_quality, truth_source, confirmed_by, date`
- `data/overrides/road_elevations.csv`: the source-3 evidence rows above (only when source 3 was used)
- `data/overrides/crossing_tiers.csv`: `crossing_id, tier, reason` (forces a tier, e.g. demote to C after a bad snap)

**Tier assignment (`link tiers`):** apply the overrides; then tier A if the A conditions hold, B if it has an active upstream link, else C. A DB check constraint enforces "tier A ⇒ overtop stage present and a non-proxy truth class" (§21.1, constraint `tier_a_has_truth`).

### 17.7 MVP shortlist
Pick **10–20 tier-A crossings** (Step 0 Q6 with the student; Day 1). Prefer crossings along Onion, Bear, Slaughter, Williamson, Bull and Barton creeks that have the best truth class and a gauge-rich upstream network. All other crossings stay tier B or C and are still shown (never hidden) with their honest labels. **Done when:** `docs/data-bridge-verification.md` lists the shortlist with tier, truth class and source per crossing.

### 17.8 NLDI snapping (`linking/nldi.py`, agent-written)

```python
def snap_crossing(c: CrossingIn, nldi: NLDI, overrides: dict[str, SnapOverride]) -> Snap:
    if (o := overrides.get(c.id)) is not None:                      # human decision always wins
        return Snap(c.id, comid=o.comid, measure=o.measure, status="override", dist_m=o.dist_m, note=o.note)
    gdf = nldi.comid_byloc((c.lon, c.lat))                          # hydrolocation, source == "indexed"
    comid = int(gdf.comid.iloc[0])
    snapped = gdf.geometry.iloc[0]                                   # indexed point on the flowline
    dist_m = geod_distance((c.lon, c.lat), (snapped.x, snapped.y))
    status = "auto" if dist_m <= 100 else "needs_review"
    return Snap(c.id, comid=comid, measure=float(gdf.measure.iloc[0]), status=status, dist_m=dist_m)
```
- Use **`hydrolocation`** (via `comid_byloc`), not `comid/position` (§16.3). VERIFY BEFORE USE the returned column names (`comid`, `measure`) on the S4 sample; fallback: raw httpx GET and parse the GeoJSON.
- Snaps over 100 m, snaps whose flowline GNIS name differs from the crossing's `creek`, and crossings with no flowline go to review.
- `data/overrides/snap_overrides.csv`: `crossing_id, comid, measure, upstream_gauges (semicolon list, optional), note, reviewer, date`. An override can also **reject** a snap (`comid` empty) → tier C.

### 17.9 Upstream gauges, channel distance and flowlines (`link upstream`)

1. **Upstream candidates:** `nldi.navigate_byid("comid", comid, "upstreamTributaries", "nwissite", distance=100)` → site ids.
2. **Activity filter:** keep sites present in the active inventory (§16.18: `00065` continuous, `end` within 2 days) **and** with `begin ≤` the earliest storm start used for training. Inactive-but-historical gauges may be used **only** for training-storm analysis, never for live links.
3. **Channel distance** for each gauge→crossing pair: navigate **DM flowlines from the gauge** (`nwissite/USGS-xxxx/navigation/DM/flowlines?distance=150`, with `stopComid=<crossing comid>` if S4 showed it works). Order the segments by chaining endpoints, cut the line at the crossing's projected point, and compute the **geodesic length** with `pyproj.Geod(ellps="WGS84").geometry_length(line)`. VERIFY BEFORE USE that the NLDI flowline response carries no length attribute you could use instead; fallback: the geodesic method above. Store `channel_dist_km`.
4. **Pulse path for the app:** the same cut line, simplified with `shapely.simplify(line, 0.0002, preserve_topology=False)` (about 20 m), is saved as the link's `flowline` (DB `geography(LineString)`, replay JSON `links[].flowline`, and `data/creeks/creeks.geojson`). Keep `creeks.geojson` under 1 MB (§5). `creeks.geojson` has one LineString feature per `upstream`/`at_site` link with properties `{reach_id: "<crossing_id>__<gauge_id>", crossing_id, gauge_id, relation}`, coordinates ordered **gauge → crossing** (a test asserts the first coordinate is nearer the gauge); `make app-data` copies it into the app (§17.14, F86).
5. **At-site (target) gauge:** a gauge within 500 m channel distance of the crossing (upstream or downstream) with no tributary junction between becomes the `at_site` link and the crossing's `target_gauge_id`. Use the signed distance `Δd_km` (positive if the crossing is downstream of the gauge). An `at_site` gauge is also an upstream predictor only if it lies upstream.
6. **Comparison link (Q4):** the **nearest gauge by straight-line distance**, whatever creek it is on, is stored with `relation='nearest_baseline'`. It is used **only** by the `nearest_gauge` comparator in the backtest (§18.12), never live.
7. **Primary link:** per crossing, `is_primary = true` for the upstream link with the best `xcorr_r` among links with `n_storms ≥ 1` (ties → smallest τ). Before τ is learned, use the smallest channel distance. The primary link matters for staleness (§18.9).
8. **Cap:** keep at most **5 upstream links** per crossing (the 5 smallest channel distances). The ML model uses the top 3 by τ (§18.11).

### 17.10 Link table fields (`data/links/crossing_gauge_links.csv` ⇄ `public.crossing_gauge_links`)

| Field | Meaning | Filled by |
|---|---|---|
| `crossing_id`, `gauge_id`, `model_version` | key | `link upstream` / `learn` |
| `relation` | `upstream · at_site · nearest_baseline` | `link upstream` |
| `is_primary` | §17.9 rule 7 | `learn` |
| `channel_dist_km`, `euclid_km` | distances | `link upstream` |
| `lag_min`, `lag_p25_min`, `lag_p75_min`, `xcorr_r`, `n_storms` | travel time τ (median, IQR) and its quality | `learn` (§18.4) |
| `celerity_ms` | `channel_dist_km·1000 / (lag_min·60)` | `learn` |
| `trigger_stage_ft`, `watch_stage_ft`, `min_rise_ft_30m` (default 0.10), `baseline_stage_ft`, `train_csi` | trigger learning | `learn` (§18.5) |
| `params_source` | `learned` (tier A) · `transferred` (tier B) · `manual` | `learn` |
| `needs_review`, `review_note` | sanity-check failures (§18.4 step 7) | `learn` + human |
| `flowline` | simplified gauge→crossing path | `link upstream` |

### 17.11 Map verification step (MUST; human-in-the-loop)

`notebooks/01_inventory_and_snaps.ipynb` (student-owned exploration) produces, for every tier-A candidate and every `needs_review` crossing:
- a map of the crossing point, the snapped point, the snapped flowline, the upstream flowlines, and the linked gauges (labels: site number, channel km). Use `geopandas.GeoDataFrame.explore()`, which needs `folium` added to the `geo` extra (VERIFY BEFORE USE that `uv add --optional geo folium` resolves under `exclude-newer`). Fallback: export `data/review/snaps.geojson` and view it in geojson.io or QGIS (public data only).
- a verdict row in `data/overrides/snap_review.csv`: `crossing_id, verdict (ok|override|reject), reviewer, date, note`.

**Gate (Day 1):** every tier-A crossing has `verdict=ok` or an override; `snap = verified|override` in the DB; Onion Ck crossings link `08158700`.

### 17.12 Tests for linking (agent-written)
- `test_dedupe.py` (§17.4 cases).
- `test_inventory_mapping.py` (one recorded raw sample per source → normalized record).
- `test_nldi_contract.py` (recorded `hydrolocation`, UT `nwissite` and DM `flowlines` responses → parsed comid, sites and distances).
- `test_channel_distance.py` (a synthetic polyline with a known length within 1 %).
- `test_tiers.py` (tier rules and the tier-A constraint).

### 17.13 Tier B parameter transfer
For a tier-B link with no truth: **τ_B = channel_dist_km / ĉ**, where ĉ is the median celerity of tier-A links in the same HUC10 (if HUC is available `[U]`), else region-wide. Window: **±40 %** (`lag_p25 = 0.6·τ_B`, `lag_p75 = 1.4·τ_B`). The trigger is set as `baseline + 0.75·(NWS action stage − baseline)` when the gauge has an action stage, else the gauge's P98 stage within training storms, with `params_source='transferred'`. Tier-B crossings never contribute to headline metrics. Their accuracy is unknown, and the UI's "Estimated" badge says so. A tier-B crossing with a `proxy` label (§17.6) may learn τ and triggers from its proxy onsets instead (`params_source='learned'`, `truth_quality='proxy'`); its scores appear only in the `proxy` split.

### 17.14 App bundle data — `make app-data` (`tools/export_app_data.py`) `[MVP]` (F86)

The app ships its static data so the first launch works offline (every crossing `unknown` until a snapshot arrives). `make app-data` (A §5.2; tools environment, run from the repo root) is the **only** way data reaches `mobile/assets/`. It runs after `make data`, `make backtest` and `make replays`, and a second run produces no diff (idempotent; no timestamps in its outputs).

| Source (committed) | Written to | Rule |
|---|---|---|
| `data/seed/crossings.geojson` | `mobile/assets/seed/crossings.geojson` | §17.2 **static** fields only (no risk state); `is_test` rows excluded; sorted by `id` |
| `data/seed/gauges.geojson` | `mobile/assets/seed/gauges.geojson` | Point features with properties `{id, name, nws_lid}` (gauge names for reason text, positions for map gauge dots); active gauges only |
| `data/creeks/creeks.geojson` | `mobile/assets/seed/creeks.geojson` | one LineString per link, `{reach_id, crossing_id, gauge_id, relation}`, coordinates gauge → crossing (§17.9 rule 4; a test asserts the direction with shapely) |
| `data/replays/index.json` + `data/replays/<id>.json.gz` (bundled storms only) | `mobile/assets/replays/` | copied byte for byte, except that `index.json` gets the top-level `hero_storm_id` (= `docs/results/results.json` `hero.storm_id`, or `null`) and each entry's `featured = (id == hero_storm_id)` |
| `docs/results/results.json` | `mobile/assets/results/results.json` | byte for byte |
| (generated) | `mobile/src/features/replay/assets.ts` | static `require()` per bundled storm (Metro bundles only static requires) |
| (generated) | `mobile/assets/manifest.json` | `{"inventory_version", "files": [{"path", "sha256", "bytes"}]}` for every file above, sorted by path |

```ts
// mobile/src/features/replay/assets.ts — GENERATED by tools/export_app_data.py (make app-data). Do not edit.
export const REPLAY_FILES = {
  'halloween-2013': require('../../../assets/replays/halloween-2013.json.gz'),
  // … one line per bundled storm, sorted by id
} as const;
export const REPLAY_INDEX = require('../../../assets/replays/index.json');
```
- Maestro flows read `HERO_STORM_ID` from `mobile/assets/replays/index.json` (`hero_storm_id`, else the first bundled storm); no flow hard-codes a storm (A F124, D §36.2).
- The script refuses to run if a source file's sha256 differs from `data/MANIFEST.json` (run `make data-fetch` first) and fails if the bundled replays exceed 1 MB in total (§19.11).
- Style JSONs and marker sprites are **not** copied here; `make style` and `make markers` write them directly (A §5.2).

**Done when (F1, F2, F86):** `data/seed/crossings.geojson`, `data/seed/gauges.geojson`, `data/links/crossing_gauge_links.csv` and `data/creeks/creeks.geojson` are committed and the DB is seeded; ≥ 10 **real** tier-A crossings (non-proxy truth) are reviewed on a map; every row has a source; counts per source and tier are logged in `docs/data-bridge-verification.md`; `make app-data` has filled `mobile/assets/{seed,replays,results}/` and a second run shows no diff.

---
## §18. Forecast science

**One-paragraph version (for the README and the student):** each crossing is linked to the gauges truly upstream of it (§17). From past storms, FordCast learns how many minutes a rise takes to travel from each gauge to the crossing (**τ**) and how high the upstream gauge must get before the crossing floods (**trigger stage**). Live, when an upstream gauge passes its trigger while rising, the crossing turns **Avoid** with a window that starts when the water could first arrive. An anti-flapping state machine keeps warnings steady, stale data always becomes **Unknown**, and official closures always win. The rule is scored storm by storm with NWS-standard metrics and no peeking at the future.

### 18.0 Module ownership

| Module | Owner | Tier | Pause (§6) |
|---|---|---|---|
| `fordcast/features/compute.py` | agent | MVP | — |
| `fordcast/linking/travel_time.py` ★ | **student** | MVP | Day 3 |
| `fordcast/linking/triggers.py` | agent | MVP | — |
| `fordcast/model/baseline_rule.py` ★ | **student** | MVP | Day 4 |
| `fordcast/model/windows.py` · `combine.py` (§3.3) · `state_machine.py` · `explain.py` | agent | MVP | — |
| `fordcast/scoring/labels.py` · `backtest.py` · `nearest_gauge.py` | agent | MVP | — |
| `fordcast/scoring/metrics.py` ★ | **student** | MVP | Day 4 |
| `fordcast/model/ml.py` · `train_ml.py` · `scoring/reliability.py` | agent | Stretch | — |

For every ★ file the agent writes the tests and the explain-back doc (`docs/explain/<module>.md`, with 3 questions; §39) and stops. The specs below are what the tests encode.

### 18.1 Series preparation and as-of discipline (`features/compute.py`)

- **Rule zero:** every feature function takes a series **already filtered by the source** (`available_at ≤ as_of`) plus `as_of`, and touches nothing else. No module-level DataFrames, no `shift(-k)`, no whole-storm statistics (no "normalize by the storm peak"). Label construction (the only place future values may be used) lives in `scoring/labels.py`.
- **Anchor rises on the newest observation, not on `now`.** With an hourly transmitter, the newest reading may be 60 min old. `rise(series, minutes)` = value at the newest `obs_time` − value interpolated at (newest `obs_time` − minutes). Return NaN if no reading lies within ±10 min of the start point.
- **Functions** (pure, unit-tested): `latest(s)`, `rise(s, minutes)`, `max_rise30(s, window_min=120)`, `last_upcrossing_time(s, level)` (the last time the series crossed `level` going up, by linear interpolation between the two straddling readings; `None` if never crossed in the lookback; the series start time if it is above `level` for the entire lookback, which is the earliest bound and therefore the conservative choice), `stage_rel(s, baseline, trigger)`, `is_fresh(s, as_of, stale_after_min)`, `water_at_road(c, series, as_of)`, `crossing_is_stale(c, links, series, as_of, rule)` (§18.9; it needs the rule result to apply rule (b)).
- **Training/cross-correlation grid:** a 5-min clock aligned to :00/:05 UTC. Interpolate linearly inside gaps ≤ 30 min; leave longer gaps as NaN and drop those windows. Never extrapolate.
- **Lookback** for live/replay ticks: `LOOKBACK = 6 h` (configurable; the ML `max_rise30_last2h` and the 24-h baseline use the storm Parquet offline, not the tick).

### 18.2 Ground-truth labels (`scoring/labels.py`) `[MVP]` (F5)

- `overtop(t) = target_stage(t) ≥ overtop_stage_ft`, evaluated at the target gauge's native 15-min readings (for class `sensor`: the sensor's water-over-road flag).
- **Episodes:** contiguous runs of `overtop = 1`; merge runs separated by gaps < 60 min. `onset` = first timestamp of the run; `end` = last.
- **Censored onsets (gauge outages):** if the readings just before the first observed overtop reading are missing for more than 30 min, **and** the last reading before the gap was below the overtop stage, the true onset lies somewhere inside the gap. Set `onset = last_below_time + 15 min` (the earliest possible), and `censored = true`. Lead times computed against it are lower bounds. 2013 at US 183 is the known case.
- **Storage:** `data/storms/<id>/truth.csv` (`crossing_id, onset, end, quality, censored, notes`) and `public.ground_truth_events` (no public RLS policy; eval only; §21).
- **Isolation:** runtime modules never import `fordcast.scoring` or read truth files; enforced by `tests/test_truth_isolation.py` (§19.8). Offline learners (`linking/triggers.py`, `model/train_ml.py`, `replay/build.py`) get labels only through `scoring.labels.load_onsets(storm_ids, crossing_ids)`.
- **Reporting:** every metric is reported overall **and** split by `truth_quality`. `proxy` labels are never mixed silently into headline numbers (§18.12).
- **Documented transmission outages** (§19.3–§19.4) don't change the truth: truth is computed from the archive's readings, whenever they arrived. They only change what FordCast could have **seen** at each tick. A true gap in the archive follows the censored-onset rule above.

### 18.3 Travel time τ ★ (`linking/travel_time.py`, student-owned) `[MVP]` (F6)

**Contract (signatures the tests call):**
```python
@dataclass(frozen=True)
class LagEstimate:
    lag_min: float          # refined lag in minutes
    r: float                # peak normalized cross-correlation
    storm_id: str

@dataclass(frozen=True)
class LinkLag:
    lag_min: float; lag_p25_min: float; lag_p75_min: float
    n_storms: int; xcorr_r: float; celerity_ms: float | None; needs_review: bool; notes: tuple[str, ...]

def estimate_lag(up: pd.Series, down: pd.Series, storm_id: str, *, step_min: int = 5,
                 max_lag_min: int = 240, min_r: float = 0.5) -> LagEstimate | None: ...
def combine_storms(estimates: list[LagEstimate], channel_dist_km: float | None) -> LinkLag | None: ...
```
**Algorithm (per link, per training storm):**
1. Put both series on the 5-min clock (§18.1). `up` = upstream gauge; `down` = the crossing's target (at-site) gauge.
2. `d = diff(stage)` → centered rolling mean over 3 steps → **clip(lower=0)** so only the rising limb counts.
3. Normalized cross-correlation `r(k)` for lags k = 0 … 240 min (`np.corrcoef` of `d_up[:n−k]` with `d_down[k:]`). Skip lags where either slice has zero variance.
4. `k* = argmax r`. **Reject** (return `None`) if `r(k*) < 0.5`.
5. **Parabolic refinement** through r(k*−1), r(k*), r(k*+1): `k̂ = k* + ½·(r₋ − r₊)/(r₋ − 2r₀ + r₊)`, applied only when the denominator is < 0 and both neighbours exist. Multiply by `step_min`.
6. **Combine storms:** τ = **median**, window = **[P25, P75]**, `n_storms`, `xcorr_r` = median r. Flag `needs_review` if IQR > 0.5·τ.
7. **Physical sanity:** celerity `c = channel_dist_km·1000 / (τ·60)` must lie in **[0.5, 6] m/s** (kinematic-wave bound `[U textbook]`); else `needs_review`.
8. **Cross-checks** (logged in `notes`, not used): peak-to-peak lag and threshold-crossing lag.
9. **Target offset:** if the crossing sits `Δd_km` (signed, |Δd| ≤ 0.5 km) from its target gauge, the link's stored τ = τ + `Δd_km·1000/(c·60)` (rounded to 1 decimal).
- **Why both smoothing and refinement:** in the prototype, synthetic true lags 35/40/45/40 min were recovered as 34.9/40.3/45.3/39.7 (r = 0.99). Without them the error was ±10 min `[V: code]`.
- **Tests (written by the agent first):** synthetic storms (the prototype's `synth_storm`) with lags 35/40/45/40 → each within **±1 min**; noise-only series → `None`; constant series → `None`; a lag at the 240-min boundary is not refined out of range; `combine_storms` median/IQR on hand-computed values; celerity outside bounds → `needs_review`.
- **Explain-back questions** (`docs/explain/travel_time.md`): Why correlate the *rate of rise* instead of the water level? What problem does the parabola step fix? Why use the median across storms instead of the mean?

### 18.4 Trigger-stage and watch-stage learning (`linking/triggers.py`) `[MVP]` (F7)

```text
for each tier-A link (gauge g → crossing c), using TRAINING storms only:
    baseline_g = median stage of g over the 24 h before the storm's first rise
    candidates  = quantiles of g's stage inside storm windows, q in linspace(0.50, 0.995, 40)
    for h in candidates:
        alerts(h) = upward crossings of h by g with rise30_g > r_min (0.10 ft) at the crossing time
        score(h)  = event-F2 over training storms, lead window [0, 180] min before c's onsets,
                    subject to FAR ≤ 0.5                                       # F2 favors catching floods
    h*       = argmax score; ties → the LOWER h (more lead)
    watch_h  = baseline_g + 0.6·(h* − baseline_g)
    store: trigger_stage_ft = h*, watch_stage_ft = watch_h, baseline_stage_ft, min_rise_ft_30m = 0.10, train_csi
```
- If no candidate satisfies FAR ≤ 0.5, use the gauge's NWS action stage (if any) as h*, set `params_source='manual'` and `needs_review`.
- **Leave-one-storm-out:** the backtest re-learns τ **and** h* inside every fold without the scored storm (§18.12). Replay timelines use these fold parameters (§19.11).
- **Datum changes** between storms (`[U]`): if `time-series-metadata` shows a datum change, learn h* per era and store the era boundary in `review_note`.

### 18.5 Baseline rule ★ (`model/baseline_rule.py`, student-owned) `[MVP]` (F8)

**Scope:** this file decides the *forecast* part (upstream signals → `no_rise | watch | avoid`, the ETA range, and reasons). Official status, water at the road, staleness and tier C are applied around it by `combine.resolve_raw_state` (§3.3) and `features.crossing_is_stale` (§18.9). The student's tests cover the forecast branches, and the combine tests cover the rest.

**Contract:**
```python
@dataclass(frozen=True)
class RuleResult:
    state: Literal["no_rise", "watch", "avoid"]
    eta_lo_min: float | None        # earliest plausible arrival, minutes after as_of (≥ 0)
    eta_hi_min: float | None
    window: tuple[int, int] | None  # from windows.to_window(eta_lo, eta_hi)
    trigger_gauge_id: str | None
    reasons: tuple[Reason, ...]

def evaluate(crossing: Crossing, links: Sequence[Link], series: Mapping[str, Sequence[Reading]],
             as_of: datetime) -> RuleResult: ...
```
**Logic (the tests encode exactly this):**

| Step | Condition (per **fresh** upstream link `l`, series `s`) | Result |
|---|---|---|
| 1 | Keep links with `relation='upstream'` whose series is fresh (`is_fresh(s, as_of, l.gauge.stale_after_min)`) | `usable` |
| 2 · AVOID candidate | `S ≥ l.trigger_stage_ft` **and** (`rise30 > l.min_rise_ft_30m` **or** the water crossed the trigger recently: `as_of − t_cross ≤ l.lag_p75_min + 30 min`) | `t_cross = last_upcrossing_time(s, trigger)`; `eta_mid = l.lag_min − minutes(as_of − t_cross)`; `eta_lo = max(0, eta_mid − (l.lag_min − l.lag_p25_min))`; `eta_hi = max(eta_lo, eta_mid + (l.lag_p75_min − l.lag_min))` |
| 3 · WATCH candidate | `S ≥ l.watch_stage_ft` **and** `rise30 > 0.20 ft` | — |
| 4 | Any AVOID candidate with `eta_lo < 90` | **AVOID**; pick the candidate with the smallest `eta_lo`; `window = to_window(eta_lo, eta_hi)`; reason `UPSTREAM_ABOVE_TRIGGER{gauge_id, value_ft, rise_ft_30m, tau_min, trigger_ft, obs_at}` (`explain.py` later adds the display range `tau_lo_min`/`tau_hi_min`, §18.10) |
| 5 | AVOID candidates exist but all have `eta_lo ≥ 90` (water still far away) | **WATCH**, `window = None`; reason `UPSTREAM_ABOVE_TRIGGER` (same params) |
| 6 | Any WATCH candidate | **WATCH**, `window = None`; reason `UPSTREAM_RISING{gauge_id, rise_ft_30m, value_ft, watch_ft, obs_at}` |
| 7 | none | **NO_RISE**, no reasons |

- The "crossed recently" clause in step 2 keeps a crossing in AVOID while a wave that already passed the trigger is still in transit, even if the newest readings flatten. It only adds caution. The research prototype relied on hysteresis alone for this case.
- Reasons are ordered by severity, then by smallest `eta_lo`. At most 3 are kept.

**Parameters (stored per link; defaults in `config.py`):**

| Parameter | Default | Source |
|---|---|---|
| `trigger_stage_ft`, `watch_stage_ft`, `baseline_stage_ft` | learned | §18.4 |
| `lag_min`, `lag_p25_min`, `lag_p75_min` | learned | §18.3 |
| `min_rise_ft_30m` (AVOID) | 0.10 ft | §18.4 |
| WATCH rise threshold | 0.20 ft / 30 min | backend.md section 4.7 |
| Transit grace | `lag_p75 + 30` min | this section |
| Horizon | 90 min | product promise (~90 min) |
| `stale_after_min` | per gauge, 30–120 (default 60; in replay never below the assumed delay + 20, §18.9) | §16.2, §18.9 |

**Tests (agent-written first):** one test per table row; window bucketing via `windows`; a stale upstream link is ignored; an empty `usable` returns NO_RISE (combine then turns tier/staleness into UNKNOWN); determinism (same input → same reasons order).
**Explain-back questions** (`docs/explain/baseline_rule.md`): Why must the gauge be *rising*, not just high? Why do we show the window that starts at the *earliest* arrival? What happens when the upstream gauge stops reporting?

### 18.6 Risk windows (`model/windows.py`) `[MVP]`

Windows are built **only** from the fixed buckets **[0,15], [15,30], [30,60], [60,90]**. A window is either one bucket or **two adjacent buckets anchored at the bucket containing the earliest arrival**. The complete allowed set is `{[0,15], [15,30], [30,60], [60,90], [0,30], [15,60], [30,90]}`, and the mobile `windows-test` MUST assert the same set (§3.5).

```python
BUCKETS: tuple[tuple[int, int], ...] = ((0, 15), (15, 30), (30, 60), (60, 90))
HORIZON_MIN = 90

def _bucket_index(m: float) -> int:
    for k, (_, b) in enumerate(BUCKETS):
        if m < b:
            return k
    return len(BUCKETS) - 1

def to_window(eta_lo: float, eta_hi: float) -> tuple[int, int] | None:
    lo = max(0.0, eta_lo)
    if lo >= HORIZON_MIN:
        return None                                   # beyond the horizon → WATCH without a window
    hi = min(max(lo, eta_hi), HORIZON_MIN - 1e-9)
    i = _bucket_index(lo)
    j = min(_bucket_index(hi), i + 1)                 # ≤ 2 adjacent buckets, anchored at the earliest arrival
    return BUCKETS[i][0], BUCKETS[j][1]
```
Examples: (10, 20) → [0,30]; (16, 70) → [15,60]; (40, 45) → [30,60]; (95, 120) → None. The client renders `lo = 0` as "water may already be on the road" (§3.5). **ML windows** (Stretch): `p30 ≥ θ_A` → [0,30]; else `p60 ≥ θ_A` → [30,60]; else [60,90]. When both rule and ML fire, the rule's ETA window wins.

**Window during a hysteresis hold:** `None` (the predicted arrival has passed). The client then uses `headline_now` for AVOID and `*_nowindow` for WATCH (§3.5, §3.7).

### 18.7 Combining, official precedence and official freshness `[MVP]` (F10)

- The **only** combination logic is `model/combine.py::resolve_raw_state` exactly as written in **§3.3** (official closed → `closed`; water at road → `closed`; tier C → `unknown`/`NO_UPSTREAM_GAUGE`; all stale → `unknown`/`DATA_STALE`; else max(rule, ML); official caution lifts to at least `watch`; official open never lowers).
- **Official freshness** (`is_fresh_official`): a feed record is fresh if `fetched_at ≥ now − 15 min` **and** `source_updated_at` (if given) is not older than 24 h. A `manual` record is fresh while `expires_at > now` (default `expires_at = set_at + 2 h`; max 24 h).
- **Official source lost while CLOSED:** if the tracker's `closed_source = 'official'` and that crossing's official record is no longer fresh, the state machine forces `unknown` (reason `DATA_STALE` with `source` set, rendered by `reason.DATA_STALE_source`), shown with `state.unknown.last_known` ("Last known: Closed · {{age}}"). It never quietly steps down from an official closure it can no longer see (§18.8).
- **NWS alerts never change a state** (§16.7).
- **Replay:** `ReplayOfficial` returns historic official records only if timestamped ones exist (none are expected), else nothing. `assumptions.official_status` says so (§19.11).

### 18.8 Hysteresis / anti-flapping state machine (`model/state_machine.py`) `[MVP]` (F9)

**Tracker (persisted per crossing in `private.risk_tracker`; in memory during replay):**
`state`, `since`, `calm_ticks`, `last_known_state` (the last state that wasn't `unknown`), `last_known_at`, `closed_source` (`official|sensor|None`), `trigger_gauge_id`, `window`, `held` (bool), plus `reasons` (in memory only; persisted through `risk_current`). A crossing with no tracker yet starts as `Tracker(state="unknown")`.

**Timers (ticks are 5 min):** `DWELL = {closed: 6, avoid: 6, watch: 12}` → 30 / 30 / 60 min. `DOWN = {closed: avoid, avoid: watch, watch: no_rise}`. `unknown` is never stepped through.

**Transitions (evaluated in this order every tick):**

| # | Condition | Next state | Notes |
|---|---|---|---|
| T1 | `raw == unknown`, **or** `closed_source == 'official'` and the official record is no longer fresh | `unknown` immediately | remember `last_known_state = state` if `state != unknown`; `calm_ticks = 0` |
| T2 | current `unknown`, raw fresh, `last_known_state ∈ {watch, avoid, closed}` and `rank(raw) < rank(last_known_state)` | `max(raw, DOWN[last_known_state])`, `held = true`, `calm_ticks = 0` | **Adds caution** after an outage. Example: AVOID → outage → water may still be there → resume at WATCH and dwell. (Research prototype jumped straight to raw.) |
| T3 | current `unknown`, otherwise | `raw` | normal recovery |
| T4 | `rank(raw) > rank(state)` | `raw` immediately | escalation is **always** immediate; `held = false` |
| T5 | `raw == state` | stay; `calm_ticks = 0`; refresh `window`/reasons | `held = false` |
| T6 | `rank(raw) < rank(state)` | `calm_ticks += 1`; stay with `held = true`, `window = None` until T7 | reasons = `[HOLDING{since, held_state}] + raw reasons` |
| T7 | T6 and `calm_ticks ≥ DWELL[state]` and the extra condition holds | `max(raw, DOWN[state])` (**one level only**); `calm_ticks = 0` | extra: **AVOID→** needs the trigger gauge fresh, falling (`rise30 < 0`) and below `trigger − 0.5 ft`; **CLOSED(official)→** needs the official record fresh and not closed, and adds reason `CLOSURE_LIFTED{source, at}` to the next states until they reach `no_rise`; **CLOSED(sensor)→** needs the target gauge fresh and below overtop for the whole dwell |

- A crossing can never go from ≥ `watch` straight to `no_rise`, except through `unknown` (and then T2 applies).
- **Persist** the tracker every tick so a restart never resets hysteresis. Replay starts from `Tracker(state=unknown)` at the window start minus the lookback, which is honest about warm-up.

```python
# backend/fordcast/model/state_machine.py (agent-written; property-tested)
RANK = {"no_rise": 0, "unknown": 1, "watch": 2, "avoid": 3, "closed": 4}
DWELL = {"closed": 6, "avoid": 6, "watch": 12}
DOWN = {"closed": "avoid", "avoid": "watch", "watch": "no_rise"}

def step(tr: Tracker, raw: RawState, now: datetime, ctx: StepContext) -> Tracker:
    if raw.state == "unknown" or (tr.closed_source == "official" and not ctx.official_fresh):
        lk = tr.state if tr.state != "unknown" else tr.last_known_state
        lk_at = now if tr.state != "unknown" else tr.last_known_at
        return tr.evolve(state="unknown", since=now if tr.state != "unknown" else tr.since,
                         calm_ticks=0, last_known_state=lk, last_known_at=lk_at, window=None, held=False,
                         reasons=raw.reasons or (Reason("DATA_STALE", source=ctx.official_source),))
    if tr.state == "unknown":
        lk = tr.last_known_state
        if lk in DOWN and RANK[raw.state] < RANK[lk]:
            nxt = max(raw.state, DOWN[lk], key=RANK.__getitem__)
            return tr.evolve(state=nxt, since=now, calm_ticks=0, held=True, window=None,
                             reasons=(Reason("HOLDING", since=now, held_state=nxt),) + raw.reasons)
        return tr.enter(raw, now)                                      # T3
    if RANK[raw.state] > RANK[tr.state]:
        return tr.enter(raw, now)                                      # T4 escalate immediately
    if raw.state == tr.state:
        return tr.refresh(raw)                                         # T5
    calm = tr.calm_ticks + 1                                           # T6
    if calm >= DWELL[tr.state] and ctx.extra_condition_ok(tr):         # T7 one level down
        return tr.enter(RawState(max(raw.state, DOWN[tr.state], key=RANK.__getitem__), raw.window,
                                 raw.reasons, raw.trigger_gauge_id, raw.closed_source), now)
    return tr.evolve(calm_ticks=calm, held=True, window=None,
                     reasons=(Reason("HOLDING", since=tr.since, held_state=tr.state),) + raw.reasons)
```
(`Tracker.enter` sets state/since/window/reasons/closed_source from `raw`, resets `calm_ticks`, `held=False`, and updates `last_known_*`.)

**Property tests (hypothesis; `tests/unit/test_state_machine.py`):** escalation is immediate; de-escalation drops exactly one level and only after the dwell; `unknown` whenever raw is unknown; CLOSED holds while official is closed and fresh; official lost while CLOSED → `unknown`; never ≥ watch → no_rise directly; under ±0.1 ft noise around a trigger, the rule + machine produce **≤ 2 transitions per hour**; T2 resumes one level below the last known state.

### 18.9 Freshness → UNKNOWN rules (thresholds) `[MVP]` (F11)

| Level | Rule | Result |
|---|---|---|
| Reading | `as_of − obs_time > gauge.stale_after_min` | reading stale |
| Gauge threshold | `stale_after_min = clamp(ceil5(latency_p90_min + 20), 30, 120)`; **60** while `latency_n < 50`; never above 120 (hydro: unknown if > 2 h) | per gauge, nightly |
| Crossing (`crossing_is_stale`) | (a) **all** upstream links stale, **or** (b) the **primary** link is stale **and** no fresh link yields WATCH/AVOID | `unknown` with `DATA_STALE{gauge_id: primary, last_obs_at}` |
| Crossing tier C | always (unless an official record applies) | `unknown`, `NO_UPSTREAM_GAUGE` |
| Water at road | the target gauge must be fresh to assert `WATER_AT_ROAD` | stale target → no assertion |
| Official feed | `fetched_at < now − 15 min` → ignored (except T1's closed-hold rule) | §18.7 |
| Snapshot `data_status` | **live**; **degraded** if > 25 % of active linked gauges are stale; **offline** if > 75 % are stale **or** the last OK tick is > 20 min old (computed at read time by `/v1/risk/current` and `/v1/meta/freshness`) | §22.3 |
| Client | snapshot older than `stale_after_s` (1,200 s) → every crossing renders `unknown` + "Last known" | §3.4, §28 |
| NWS feed | unreachable > 10 min | `nws_status: "unavailable"` |
| Replay / backtest | the same rules, with `available_at` from §19.4 (frozen delays + documented outages) and per-gauge thresholds from `data/latency/gauge_latency.json`. **Consistency rule:** in replay the threshold is `max(stale_after_min, delay[gauge] + 20)`, so an assumed delivery delay can never make every reading stale the moment it arrives (with the 60-min default delay the threshold is 80 min; with `--delay-override N` it is at least `N + 20`) | documented outages and true archive gaps show as `unknown` (§19.10) |

### 18.10 "Why this alert" explanations (`model/explain.py`) `[MVP rule codes · Stretch SHAP]` (F14)

**Reason object (JSON; the same shape in the snapshot, the API, the replay timeline and the push `data`):**
```json
{"code": "UPSTREAM_ABOVE_TRIGGER", "gauge_id": "USGS-08158700", "value_ft": 9.4, "rise_ft_30m": 3.1,
 "tau_min": 40, "tau_lo_min": 30, "tau_hi_min": 45, "trigger_ft": 9.0, "obs_at": "2026-10-14T17:45:00Z"}
```
- Numbers: feet to 1 decimal; minutes as integers rounded to 5. The client resolves `gauge_id` → display name from the bundled `gauges.geojson` seed (§17.14) or `/v1/crossings/{id}` (names are not repeated in the snapshot, to save bytes).
- **Every non-`no_rise` state carries ≥ 1 reason** (snapshot validation test). At most 3 reasons, ordered as in §18.5.
- **Travel time is sent as a range.** `explain.py` adds `tau_lo_min`/`tau_hi_min` to every reason that carries a link's τ (A §3.5 rule 8): `tau_lo = 15·floor(lag_p25_min/15)`, `tau_hi = 15·ceil(lag_p75_min/15)`; if `tau_hi − tau_lo < 15`, then `tau_hi = tau_lo + 15`; a link learned from one storm (`n_storms = 1`) uses `lag_min ± 10` as P25/P75 before rounding; a range would never start at 0 ("0–15" is banned by the A §3.12 countdown guard), so `tau_lo_min` is at least 5. Example: P25 33, median 38, P75 44 → `tau_lo_min = 30`, `tau_hi_min = 45` → "Water usually takes 30–45 min to get here". `tau_min` (the exact median) stays in the object only for the debug screen (F107) and the replay pulse math; **no template, label, TTS line or storyboard may use it** (§3.5 rule 8).
- **Rendering is client-side and the server never sends text.** Every code renders from the A §3.7 `reason.*` keys (visual key + `_spoken` sibling, EN/ES, i18next `{{var}}` interpolation). Each source variant has its own key; there is no `{a|b}` syntax anywhere. The backend copy test reads the same keys from `mobile/src/locales/{en,es}.json` (A §3.12).

| Code | Params (wire) | §3.7 key(s) (EN/ES + `_spoken`) | Placeholders filled from | Emitted by |
|---|---|---|---|---|
| `UPSTREAM_ABOVE_TRIGGER` | gauge_id, value_ft, rise_ft_30m, tau_min, tau_lo_min, tau_hi_min, trigger_ft, obs_at | `reason.UPSTREAM_ABOVE_TRIGGER` | `{{gauge}}` ← gauge name, `{{rise}}` ← `rise_ft_30m`, `{{tau_lo}}`/`{{tau_hi}}` ← `tau_lo_min`/`tau_hi_min` | rule, ML |
| `UPSTREAM_RISING` | gauge_id, rise_ft_30m, value_ft, watch_ft, obs_at | `reason.UPSTREAM_RISING` | `{{gauge}}` | rule, ML |
| `WATER_AT_ROAD` | gauge_id, value_ft, overtop_ft, obs_at | `reason.WATER_AT_ROAD` | `{{gauge}}` | combine |
| `OFFICIAL_CLOSED` | source, as_of | `reason.OFFICIAL_CLOSED` | `{{source}}` ← source label (§3.6) | combine |
| `OFFICIAL_CAUTION` | source, as_of | `reason.OFFICIAL_CAUTION` | `{{source}}` | combine |
| `DATA_STALE` | gauge_id **or** source (exactly one), last_obs_at | `reason.DATA_STALE_gauge` when `gauge_id` is set; `reason.DATA_STALE_source` when `source` is set | `{{gauge}}` or `{{source}}`, `{{age}}` ← `last_obs_at` | combine, state machine |
| `NO_UPSTREAM_GAUGE` | — | `reason.NO_UPSTREAM_GAUGE` | — | combine |
| `RAIN_OVER_BASIN` (Stretch) | qpe_in, hours, source | `reason.RAIN_OVER_BASIN` | `{{qpe}}` ← `qpe_in`, `{{hours}}` | ML |
| `HOLDING` | since, held_state | `reason.HOLDING` | — | state machine |
| `CLOSURE_LIFTED` | source, at | `reason.CLOSURE_LIFTED` | `{{source}}`, `{{time}}` ← `at` (America/Chicago) | state machine |
| `NEAR_ROAD_RISING` (Stretch) | gauge_id, rise_ft_30m | `reason.NEAR_ROAD_RISING` | `{{gauge}}` | ML |

`HOLDING`, `CLOSURE_LIFTED` and `NEAR_ROAD_RISING` are part of the F14 code list (A §4) and their EN/ES/spoken templates are in the §3.7 bank. A new code needs a §3.7 key first (stop-and-ask, A §1.7 item 1). The pytest copy test fails if any code emitted by `explain.py` lacks a `reason.*` key (or both `DATA_STALE_*` variants) in either language.

**SHAP mapping (Stretch, only when ML is live):** `shap.TreeExplainer(base)` on the **uncalibrated** base model (log-odds; sigmoid/isotonic calibration is monotone, so rankings hold) `[V: code shap 0.52]`. Take the top-3 **positive** contributions and map feature groups to codes: `g{k}_stage_rel`/`g{k}_above_trigger`/`g{k}_tsince_trigger_minus_tau` → `UPSTREAM_ABOVE_TRIGGER` (gauge k); `g{k}_rise_*`/`g{k}_max_rise30_last2h` → `UPSTREAM_RISING`; `qpe_*` → `RAIN_OVER_BASIN`; `tgt_*` → `NEAR_ROAD_RISING`; calendar/antecedent features → dropped. Deduplicate by (code, gauge). **Never show raw SHAP numbers or "% safe"** (§3.11).

### 18.11 ML model `[Stretch]` (F15) — "Prototype" until it beats the rule

- **Unit:** (crossing, t) on a 15-min grid for training; live scoring every 5 min.
- **Labels:** `y_h(t) = 1` if an overtop **onset** occurs in (t, t+h], for h ∈ {30, 60, 90}. **Drop samples where the crossing is already overtopped at t** (that is `closed` by rule).
- **Features** (computed with `features/compute.py` at `as_of = t` from data with `available_at ≤ t`; k = top-3 upstream links by τ, NaN-padded; HGB handles NaN natively):

| Group | Features | `monotonic_cst` |
|---|---|---|
| Upstream stage | `g{k}_stage_rel = (S − baseline)/(h* − baseline)`, `g{k}_above_trigger` | +1 |
| Rate of rise | `g{k}_rise_{15,30,60,120}`, `g{k}_max_rise30_last2h` | +1 |
| Timing | `g{k}_tau_min`, `g{k}_tsince_trigger_minus_tau` (NaN if no upcrossing) | 0 |
| Target | `tgt_stage_rel`, `tgt_rise_30` | +1 |
| Rain (Stretch) | `qpe_basin_{1,3,6}h`, `qpe_max15`, `qpe_7d` | +1 (`qpe_7d` 0) |
| Antecedent | `g1_stage_24h_ago_rel` | 0 |
| Calendar | `hour_sin, hour_cos, doy_sin, doy_cos` | 0 |

- **Sampling and imbalance:** every step inside storm windows (first rise − 12 h → last onset + 12 h), plus every 15-min step of the **`calm-2024` days** (§16.19), weighted with `sample_weight = n_candidates / n_days` from its `meta.toml` (each sampled calm day stands for that many calm days of the year), so base rates stay true. **No SMOTE and no `class_weight="balanced"`** (both distort calibration). The calm days are split into two fixed halves (even and odd positions in the sorted `days` list): ML trained with one half is scored on the other for `calm_fa_per_crossing_per_100d`, so the ML calm false-alarm rate is never in-sample.
- **Model** `[V: code sklearn 1.9.1]`:
```python
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.frozen import FrozenEstimator            # sklearn ≥ 1.6; cv="prefit" is gone
base = HistGradientBoostingClassifier(
    max_iter=300, learning_rate=0.05, max_leaf_nodes=15, min_samples_leaf=50,
    l2_regularization=1.0, early_stopping=False,      # built-in early stopping uses a RANDOM split → leaks within storms
    monotonic_cst=MONO, random_state=0)
base.fit(X_fit, y_fit, sample_weight=w_fit)            # fit storms only
method = "isotonic" if y_cal.sum() >= 200 else "sigmoid"   # isotonic overfits with few positives
cal = CalibratedClassifierCV(FrozenEstimator(base), method=method).fit(X_cal, y_cal)   # held-out CAL storm(s)
```
- **One model per horizon** (30/60/90). Enforce `p30 ≤ p60 ≤ p90` with a cumulative max.
- **Cross-validation:** **LOSO** when there are ≤ 8 storms (expected), else `GroupKFold(n_splits=5, groups=storm_id)`. Inside each training fold, hold out the **latest** training storm for calibration. Choose `max_iter` by inner grouped CV.
- **Thresholds from out-of-fold predictions:** AVOID if `p60 ≥ θ_A`, with θ_A maximizing CSI subject to POD ≥ 0.8. WATCH if `p90 ≥ θ_W`, with θ_W maximizing F2. Windows per §18.6.
- **Combine:** `max(rule, ml)` by rank (§3.3). ML can only add caution.
- **Model card** `backend/models/<version>/card.json`: training storms, n positives per horizon, LOSO metrics vs the rule, θ_A/θ_W, feature list + constraints, calibration method, git sha, data MANIFEST sha256.
- **Live inference:** `uv sync --extra ml` on Render only if the model is promoted. VERIFY BEFORE USE on Render Starter that importing shap + scoring one tick takes < 2 s and < 300 MB RSS. Fallback: live reasons come from the rule plus the static feature-group mapping, and SHAP stays offline (replay timelines and docs).
- **Promotion rule (claim):** ML is "Prototype" and **off by default** (`settings.ml_enabled = False`). It is promoted only if, in LOSO, it has **higher CSI at equal-or-lower FAR** than the rule at the AVOID level. If not, the README says the rule won, and the app and video say "forecast rule learned from past storms", never "machine learning" (§44).
- **Prototype evidence** (synthetic, 8 storms): OOF Brier 0.113 vs climatology 0.207; reliability within ±0.02 per quantile bin; SHAP OK `[V: code]`.

### 18.12 Verification protocol ★ (`scoring/metrics.py` student-owned; `scoring/backtest.py` agent) `[MVP]` (F12, F13)

**Event definitions (computed on the state-machine output, i.e. after hysteresis: exactly what users would have seen):**
- **Alert episode** at level L ∈ {WATCH, AVOID}: a maximal run of ticks with state rank ≥ L. Episodes are computed separately for ≥ WATCH and ≥ AVOID.
- **Hit:** an episode that starts in `[onset − 180 min, onset]`. Lead = `onset − episode start` (minutes). An episode that started **before** `onset − 180` and is still active at the onset also counts as a hit, with lead **capped at 180** and flagged `capped`. An episode starting **after** the onset does not make a hit.
- **Miss:** an onset with no qualifying episode. Onsets where the crossing was `unknown` at the onset are counted as misses **and** reported as `unknown_at_onset` (the honest 2013 case).
- **False alarm:** an episode not matched to any onset within `[start, start + max(τ_p75 + 60, 120) min]`.
- **Censored onsets** (§18.2): leads computed against the earliest possible onset are lower bounds; they are counted and listed.

**Scores (pooled and per storm):** `H, M, F`; **POD = H/(H+M)**, **FAR = F/(H+F)**, **CSI = H/(H+M+F)** `[V: NWSI 10-1601; CAWCR]`; **median lead (IQR)**; **% of hits with lead ≥ 15 min**; and the trust metric **false alarms per crossing per 100 calm days**, computed on the `calm-2024` set (§16.19) through the same replay engine and the same live parameter set:

`calm_fa_per_crossing_per_100d[L] = 100 × E_L / (C × D)`, where `E_L` = alert episodes at level ≥ L (L ∈ {WATCH, AVOID}) summed over all calm days, `C` = tier-A crossings scored, `D` = calm days scored. Tier-B crossings are reported in a separate `tier_b` row, never in the headline. Every calm-day episode is a false alarm by definition (truth is empty), and the backtest lists each one (crossing, day, start, level, reasons) in `results.md` so a human can read them. Written to `results.json` for `upstream_rule`, `nearest_gauge` and (if trained) `ml`, together with `assumptions.calm_set`, `calm_days`, `calm_candidates` and `calm_seed`.

**Student contract (`scoring/metrics.py`):**
```python
@dataclass(frozen=True)
class Episode: crossing_id: str; start: datetime; end: datetime; level: str
@dataclass(frozen=True)
class Onset: crossing_id: str; storm_id: str; t: datetime; censored: bool; quality: str; unknown_at_onset: bool

def episodes_from_frames(frames: Sequence[Frame], level: str) -> list[Episode]: ...
def match_events(episodes: Sequence[Episode], onsets: Sequence[Onset], *, max_lead_min: int = 180,
                 fa_window_min: Callable[[str], int]) -> MatchResult: ...   # hits (with leads), misses, false alarms
def scores(m: MatchResult) -> Scores: ...      # H, M, F, pod, far, csi, median_lead, lead_iqr, pct_lead_ge_15
def bootstrap_ci(per_storm: Mapping[str, MatchResult], *, n: int = 1000, seed: int = 0,
                 alpha: float = 0.05) -> dict[str, tuple[float, float]]: ...   # resample STORMS with replacement
```
- **Tests (agent-written first):** the prototype's `event_metrics` case (2 onsets, 2 alerts → H=1, M=1, F=1) plus edge cases: an alert exactly at the onset (hit, lead 0); an alert 181 min before (not a hit, unless still active → capped); two episodes before one onset (the earliest counts, the later one is not a false alarm); a division by zero → NaN, not a crash; bootstrap determinism with `seed=0`.
- **Explain-back questions** (`docs/explain/metrics.md`): Why is a false alarm as important as a miss for a warning app? Why do we resample whole storms in the bootstrap instead of single readings? What does a CSI of 0.5 mean in plain words?

**Comparators (same storms, same truth, same scorer):**
1. **Reactive** (ATXfloods-style, closes after water is on the road): lead = 0 by definition. Reported as a reference line, not run.
2. **Nearest-gauge rule:** the same rule, but each crossing's only link is its `nearest_baseline` gauge, with τ and trigger learned the same way (`scoring/nearest_gauge.py`). This is the Q4 story.
3. **Upstream rule** (the product).
4. **ML** (if trained).

**Uncertainty:** **bootstrap CIs** with 1,000 resamples of storms (seed 0), 95 % percentile intervals. With fewer than 5 storms, say plainly "few storms; wide intervals".
**Probabilistic scores (ML only):** Brier score, **Brier skill score** `BSS = 1 − BS/BS_clim` (climatology = the training base rate), and a **reliability diagram** via `calibration_curve(y, p, n_bins=10, strategy="quantile")` saved to `docs/results/figures/reliability_p60.png` `[V: code sklearn]`.
**Data-delay sensitivity (honesty):** rerun the backtest with replay delays of **0, 15, 30 and 60 min** (§19.4) and report the median AVOID lead for each. The headline uses the frozen measured delays (`data/latency/gauge_latency.json`; 60 min for unmeasured gauges). Documented transmission outages apply in every sensitivity run (they are facts about the storm, not an assumption about delay).
**Split by truth quality:** report `sensor/gauge/impact_statement` together, and `proxy` separately. The **headline** uses non-proxy labels when ≥ 3 onsets exist; otherwise it states that proxy labels were used.
**Nearest-gauge story extraction:** `backtest` writes `examples.nearest_gauge_story` (one concrete storm/crossing where nearest-gauge raised a false alarm on a different creek or missed an onset that the upstream rule caught), with the times. The student uses it in Q4 (§38).

### 18.13 `make backtest` → `docs/results/results.json` (the only source of numbers)

**Command.** `make backtest` is defined once, in the root Makefile (A §5.2); do not copy its recipe here. It runs `uv run python -m fordcast backtest --all --out ../docs/results` in the backend environment, then `uv run --project tools python tools/select_hero.py docs/results/results.json` (the hero rule below), then `make app-data` (§17.14), which copies `results.json` into the app. `make backtest CHECK=1` (make rejects a `--check` flag) runs a fresh full LOSO backtest into `build/results-check/` with `--compare ../docs/results/results.json` and fails on any difference (ignoring only `generated_by.git_sha`, `hero` and `hero_by_storm`; the hero is re-checked by `tools/select_hero.py --check`): the pipeline is deterministic (fixed seeds, sorted IDs, frozen delays), so a fresh run must reproduce the committed numbers exactly. CI runs both (§24.9).

**CLI flags:** `backtest (--all | --storm ID) --out DIR [--smoke] [--compare FILE] [--delay-override N]`. `--smoke` scores one storm with its LOSO fold and compares only that storm's row (POD tolerance 10 points, for the fast per-push CI step); `--compare` without `--smoke` requires exact equality of every number and prints a field-level diff on failure.

**`results.json` (`fordcast.results.v1`):**
```json
{
  "schema": "fordcast.results.v1",
  "generated_by": {"command": "make backtest", "git_sha": "abc1234", "model_version": "rule-2026.10.18",
                   "data_manifest_sha256": "…", "latency_sha256": "…", "python": "3.13.16",
                   "hero_rule": "tools/select_hero.py@abc1234"},
  "assumptions": {"lead_window_min": 180, "tick_s": 300, "cv": "leave-one-storm-out",
                  "delays_source": "data/latency/gauge_latency.json", "default_delay_min": 60,
                  "data_delay_min": {"USGS-08158700": 60, "USGS-08159000": 15},
                  "outages": [{"storm_id": "halloween-2013", "site": "USGS-08159000",
                               "start": "2013-10-31T11:15:00Z", "end": "2013-10-31T13:45:00Z"}],
                  "calm_set": "calm-2024", "calm_days": 40, "calm_candidates": 0, "calm_seed": 20241231},
  "storms": [{"id": "halloween-2013", "name_en": "…", "name_es": "…", "catalog_order": 1, "bundle": true,
              "n_crossings": 6, "n_onsets": 5, "n_censored": 1, "unknown_at_onset": 1}],
  "methods": {
    "upstream_rule": {
      "avoid": {"pooled": {"H": 0, "M": 0, "F": 0, "pod": null, "far": null, "csi": null,
                           "median_lead_min": null, "lead_iqr_min": [null, null], "pct_lead_ge_15": null,
                           "ci95": {"pod": [null, null], "far": [null, null], "csi": [null, null],
                                    "median_lead_min": [null, null]}},
                "per_storm": [{"storm_id": "halloween-2013", "H": 0, "M": 0, "F": 0, "pod": null,
                               "far": null, "csi": null, "median_lead_min": null}],
                "per_crossing": [{"crossing_id": "atx-081", "storm_id": "halloween-2013", "tier": "A",
                                  "truth_quality": "impact_statement", "onset": "…", "first_alert_at": "…",
                                  "lead_min": null, "censored": false, "capped": false}]},
      "watch": {"pooled": {}, "per_storm": [], "per_crossing": []},
      "calm_fa_per_crossing_per_100d": {"avoid": null, "watch": null, "tier_b": {"avoid": null, "watch": null}}},
    "nearest_gauge": {"avoid": {}, "watch": {}, "calm_fa_per_crossing_per_100d": {}},
    "ml": null,
    "reactive": {"median_lead_min": 0}
  },
  "by_truth_quality": {"non_proxy": {}, "proxy": {}},
  "delay_sensitivity": [{"delay_min": 0, "median_lead_min": null}, {"delay_min": 15, "median_lead_min": null},
                        {"delay_min": 30, "median_lead_min": null}, {"delay_min": 60, "median_lead_min": null}],
  "headline": {"method": "upstream_rule", "level": "avoid", "n_storms": 0, "pod": null,
               "median_lead_min": null, "labels": "non_proxy"},
  "hero": {"storm_id": null, "crossing_id": null, "lead_min": null, "level": "avoid", "onset": null,
           "first_alert_at": null, "censored": false, "target_median_lead_min": null,
           "rule": "tier-A AVOID hit closest to the overall median lead; ties: catalog order, then crossing id"},
  "hero_by_storm": {"halloween-2013": null},
  "examples": {"nearest_gauge_story": null}
}
```
(The `null`s show the shape. Real runs fill every field, and nothing in this file is ever typed by hand.)
- `per_crossing` lists every scored onset (a miss has `lead_min: null`), with the crossing's tier and truth class, so the hero rule and the README tables need no other input.
- `results.md` + figures (`docs/results/figures/`: per-storm hydrograph overlays of upstream vs. target with alert episodes; lead-time bar chart per crossing; reliability diagram if ML) are generated from `results.json` by the same command.
- **Every number** in the README, the app's "How accurate is FordCast?" screen (F80), the Replay result banner, the video and the CAC answers comes from this file (§1.5, §7.1, §40, §41). A CI test fails if `README.md`, `submission/answers.md` or `mobile/src` contain a hand-typed metric that doesn't match `results.json` (§24.7).
- CI runs a **one-storm smoke backtest** (`--smoke`) on every push, and `make backtest CHECK=1` (full LOSO, exact compare). A POD change of more than 10 points vs. the committed `results.json` is also a stop-and-ask (§1.7 item 8, §7.1).
- **Science freeze** (Thu Oct 22, 18:00 CT, §6.2): after it, any change to `results.json` needs human approval and a regeneration of README, app assets and video numbers.

#### The hero rule (`tools/select_hero.py`, pre-registered; no cherry-picking)

The "X minutes earlier" example in the app, README and video is chosen by code, never by a person, and never as the best case.
1. **Candidates:** entries of `methods.upstream_rule.avoid.per_crossing` that are hits (`lead_min` not null), with `tier == "A"` (so `truth_quality` is never `proxy`, §17.6), in a storm whose `bundle` is `true` (the example must be playable offline in the app). Censored and capped hits are eligible; the app then adds "(at least)" for a censored onset (D §33.4).
2. **Target:** `m = headline.median_lead_min` (the overall median AVOID lead time across storms; exactly the value the honesty line `replay.honesty` quotes).
3. **Pick:** the candidate with the smallest `|lead_min − m|`. Ties: the earlier storm in §16.19 catalog order (`catalog_order`), then the smaller `crossing_id` (string order). **Never** the maximum lead.
4. **Write:** `hero = {storm_id, crossing_id, lead_min, level: "avoid", onset, first_alert_at, censored, target_median_lead_min: m, rule}`; if there is no candidate, `hero = null` and the app shows no callout. `hero_by_storm[<storm_id>]` = the same rule restricted to that one bundled storm (target still the overall `m`), or `null`; the replay builder copies it into that storm's timeline `hero` (§19.11), so every bundled storm's callout follows the same rule.
5. **Pre-registration:** `select_hero.py` and its tests (synthetic `per_crossing` lists: closest-to-median wins over the maximum, both tie-breaks, proxy and tier-B rows ignored, unbundled storms ignored, empty → `null`) are committed **before** the first real `results.json` (A §6.1 Day 4). `select_hero.py --check FILE` recomputes both fields and fails on any difference (CI, §24.9). There is no override flag. If the human wants a different featured storm for the video, that is a stop-and-ask, and the README must say the featured example was not the rule's pick.
6. The README states the rule in one sentence (E §40.2): "The example is picked by a fixed rule: the warning whose lead time is closest to the median across all storms."

### 18.14 Scientific honesty rules (MUST)
1. Never tune parameters, thresholds or delays using the held-out storm. The fold's storm is invisible to learning. The hero is never chosen by hand: only the pre-registered rule in §18.13 picks it.
2. Report weak numbers as they are. "The simple rule nearly matched ML" is a valid Q4 finding.
3. Proxy labels, censored onsets, `unknown_at_onset` counts, documented outages and data-delay assumptions are always reported next to the numbers they affect.
4. The example (hero) is always shown together with the median across storms (`replay.honesty`).
5. Say "I'm not aware of a published system that forecasts low-water-crossing overtopping per crossing from upstream gauges", never "first ever". The literature review in backend.md section 4.1 is the source.
6. Tier-B "Estimated" crossings never enter the headline.

---

## §19. Storm Replay engine

**Principle:** Storm Replay is the live pipeline fed with history. **One** `tick()` function (§19.6) runs live every 5 minutes and runs replay over a past storm. Only the `DataSource` and the clock differ. At replay time *t*, the pipeline may use only readings that FordCast **could have had** at *t*: observed **and delivered** (`available_at ≤ t`). Two tests prove it (§19.8). The output is a compact, deterministic timeline (`fordcast.replay.v1`) bundled inside the app, so Replay works in airplane mode and judges can never see it broken.

### 19.1 Domain types and the `DataSource` interface ★ (`sources/base.py`, student-owned)

The agent commits this **skeleton** (types and docstrings are the shared contract). The student implements the two functions marked `TODO(student)` until `tests/test_no_lookahead.py` passes (§1.8 pause #4, Day 5).
```python
# backend/fordcast/sources/base.py  ★ student-owned: implement the TODO(student) bodies
from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Protocol


class LookaheadError(AssertionError):
    """Raised when data from the future would reach the pipeline."""


@dataclass(frozen=True, slots=True)
class Reading:
    gauge_id: str            # 'USGS-08158700'
    param: str               # '00065' (gage height, ft)
    obs_time: datetime       # when the gauge measured it (UTC, tz-aware)
    available_at: datetime   # when FordCast could first have seen it (UTC, tz-aware)
    value: float
    approval: str = "P"      # 'P' provisional | 'A' approved
    qualifiers: tuple[str, ...] = ()


@dataclass(frozen=True, slots=True)
class OfficialStatus:
    crossing_id: str
    source: str              # 'manual' | 'atxfloods' | 'travis'
    status: str              # 'open' | 'caution' | 'closed' | 'unknown'
    available_at: datetime   # fetched_at (live) or the historic record time (replay)
    source_updated_at: datetime | None = None
    expires_at: datetime | None = None
    note: str | None = None


class DataSource(Protocol):
    async def series(self, gauge_ids: Sequence[str], param: str, as_of: datetime,
                     lookback: timedelta) -> dict[str, list[Reading]]:
        """For each requested gauge: readings with as_of - lookback < obs_time <= as_of AND
        available_at <= as_of, sorted by obs_time. Unknown gauges map to []."""
        ...


class OfficialStatusSource(Protocol):
    async def status(self, crossing_ids: Sequence[str], as_of: datetime) -> dict[str, OfficialStatus]:
        """Latest official record per crossing with available_at <= as_of."""
        ...


def visible(readings_sorted_by_available: Sequence[Reading], available_index: Sequence[datetime],
            gauge_id: str, as_of: datetime, lookback: timedelta) -> list[Reading]:
    """TODO(student): return the readings for gauge_id that had ARRIVED by as_of (use bisect on
    available_index) and whose obs_time is inside (as_of - lookback, as_of], sorted by obs_time."""
    raise NotImplementedError


def assert_no_lookahead(readings: Sequence[Reading], as_of: datetime) -> None:
    """TODO(student): raise LookaheadError if any reading has available_at > as_of or obs_time > as_of."""
    raise NotImplementedError
```
**Explain-back questions** (`docs/explain/datasource.md`): What is the difference between `obs_time` and `available_at`, and why does it change our lead-time number? Why does the same `tick()` work for live and replay? What would the prefix-invariance test catch if `visible()` had a bug?

### 19.2 `LiveSource` and `LiveOfficial` (`sources/live.py`, `sources/official.py`, agent)

- `LiveSource.series()` runs one SQL query against `public.readings`: `where gauge_id = any(%s) and param_code = %s and obs_time > %s and obs_time <= %s and received_at <= %s order by gauge_id, obs_time`. It maps `available_at = received_at` and calls `assert_no_lookahead` (cheap; it keeps one code path honest).
- `LiveOfficial.status()` returns the freshest row per crossing from `public.official_status` across sources (precedence `atxfloods` > `travis` > `manual` when several are fresh, with the most severe status winning on ties), mapped to `OfficialStatus` with `available_at = fetched_at`.

### 19.3 `StormReplaySource` and the storm archive (`sources/replay.py`, `replay/`, agent)

**Files per storm** (`data/storms/<id>/`, built by `uv run python -m fordcast backfill --storm <id>`):

| File | Content |
|---|---|
| `meta.toml` | below (TOML, read with stdlib `tomllib`) |
| `readings.parquet` | `gauge_id: str, param: str, obs_time: timestamp[us, UTC], value: float32, approval: str, qualifiers: list<str>, fetched_at: timestamp[us, UTC]`; window **[window.start − 24 h, window.end]**; committed if ≤ 5 MB, else uploaded by `make data-upload` to the content-hashed Storage path `data/storms/<id>/readings.<sha12>.parquet` and listed in `data/MANIFEST.json` with its sha256 and URL (`make data-fetch` restores it, §17.1). For `calm-2024` it holds only the sampled days plus the 24 h before each |
| `truth.csv` | §18.2 (read only through `scoring.labels`) |
| `alerts.parquet` (Stretch) | parsed IEM CAP alerts (§16.7) |
| `rain.parquet` (Stretch) | basin rain series with `valid_at` + product |

```toml
# data/storms/halloween-2013/meta.toml
id = "halloween-2013"
name_en = "Halloween Flood 2013"
name_es = "Inundación de Halloween 2013"
tz = "America/Chicago"
headline_event = "2013-10-31T11:15:00Z"
gauges = ["USGS-08158700", "USGS-08158810", "USGS-08158840", "USGS-08159000"]
official_status = "none"      # no timestamped historic closures → ReplayOfficial is empty
kind = "storm"                # "storm" | "calm" (calm-2024 is never bundled and never a LOSO fold)
bundle = true                 # ship in the app (§19.14); only if the storm's data checks pass (§16.19)
catalog_order = 1             # §16.19 table order (hero tie-break, §18.13)
data_sha256 = "…"             # sha256 of readings.parquet (also listed in data/MANIFEST.json)
notes = "US 183 gauge silent ~11:15–13:45Z (USGS alert 2013-10-31); values are today's APPROVED data"

# Documented TRANSMISSION outages: the gauge kept measuring but nothing reached users until `end`.
# Today's archive may hold readings from inside the window; replay must still not see them before `end` (§19.4).
# (TOML 1.0: each inline table must stay on ONE line; the array itself may span lines.)
outages = [
  { site = "USGS-08159000", start = "2013-10-31T11:15:00Z", end = "2013-10-31T13:45:00Z", source = "USGS alert 2013-10-31; Statesman 2013-11-10; bounds: VERIFY BEFORE USE with smoke check S3" },
]

[window]                      # refined from data (§16.19)
start = "2013-10-30T12:00:00Z"
end = "2013-11-01T00:00:00Z"

[fetched]
source = "api.waterdata.usgs.gov/ogcapi/v1 continuous"
at = "2026-10-16T15:02:00Z"
```
- Storm metadata is TOML and is read with the standard library's `tomllib` (Step 0 decided default D9); no YAML parser is needed.
- `outages` is required in every `meta.toml` (an empty list `outages = []` when none is documented). Each entry needs a written public `source` (a USGS alert, an agency report or a news report quoting one); never infer an outage from the data alone, because that would be tuning the replay. Times are UTC; the window is half-open (`start ≤ obs_time < end`).
- `calm-2024/meta.toml` has `kind = "calm"`, `bundle = false`, `seed`, `n_candidates`, `days = ["2024-01-07", …]` and the exclusion log path, and no `[window]` (each day is its own window, §16.19).
- **Delays are not stored in `meta.toml`.** They come from the frozen `data/latency/gauge_latency.json` (§19.4), so one file governs every storm.

`StormReplaySource.from_storm(storm, delays)` loads the Parquet once, computes each reading's `available_at` with the §19.4 rule (delay plus documented outages), sorts by `(available_at, gauge_id, obs_time)`, keeps an `available_index`, and answers `series()` with the student's `visible()` + `assert_no_lookahead()` (per the prototype `[V: code]`). Because `visible()` bisects on `available_at`, an outage needs no special code in the student's file: the readings simply arrive late.

### 19.4 Data-arrival latency model `[MVP]`

| Data | Visible in replay at | Notes |
|---|---|---|
| USGS stage | `available_at = obs_time + delay[gauge]`; **if `obs_time` falls inside a documented outage for that gauge** (`start ≤ obs_time < end`): `available_at = max(obs_time + delay[gauge], outage.end)` | `delay[gauge]` comes **only** from the committed `data/latency/gauge_latency.json`: the measured live P75 (rounded up to 5 min) when the gauge has `n ≥ 50` live samples, otherwise **60 min** (conservative satellite assumption; hydro.md §9; Step 0 decided default D6) |
| NWS alert (Stretch) | `sent` | |
| MRMS RadarOnly 1H (Stretch) | `valid + 5 min` | Pass2 `valid + 2 h` (training only) |
| Official status | historic record time, only if timestamped | none expected; stated in `assumptions` |

**The frozen latency file** (`data/latency/gauge_latency.json`, written by `make latency` = `uv run python -m fordcast latency recompute --out ../data/latency/gauge_latency.json`; reads `public.readings` rows with `ingest = 'L'` from the live DB, so it needs `DATABASE_URL`):
```json
{"schema": "fordcast.gauge-latency.v1", "computed_from": {"start": "2026-10-20T15:00:00Z", "end": "2026-10-22T20:00:00Z"},
 "min_n": 50, "default_delay_min": 60, "default_stale_after_min": 60,
 "gauges": {"USGS-08158700": {"n": 212, "p75_min": 58.0, "p90_min": 66.0, "delay_min": 60, "stale_after_min": 90},
            "USGS-08159000": {"n": 230, "p75_min": 14.0, "p90_min": 19.0, "delay_min": 15, "stale_after_min": 40}}}
```
(Values illustrative. A gauge with `n < 50` is written as `{"n": <n>, "p75_min": null, "p90_min": null, "delay_min": 60, "stale_after_min": 60}`.)
- `delay_min = ceil5(p75_min)` if `n ≥ 50`, else 60. `stale_after_min = clamp(ceil5(p90_min + 20), 30, 120)` if `n ≥ 50`, else 60 (the §18.9 rule; replay then applies the consistency rule `max(stale_after_min, delay_min + 20)`). A gauge missing from the file gets the defaults. Keys sorted, no wall-clock timestamp beyond `computed_from`, so the file only changes when the data does.
- `replay-build`, `replay-verify`, `backtest` and CI read **only** this file, never the live DB, so golden hashes can't drift with the nightly statistics. Run `make latency` once on Day 8 before the science freeze (A §6.1); after the freeze, changing the file is a science change (stop-and-ask, §6.2).
- **Outages (the 2013 case):** a reading observed inside an outage becomes visible no earlier than `outage.end`. The replay therefore shows `unknown` for that gauge's dependent crossings during the outage (once the last pre-outage reading ages past the threshold, §18.9), even though today's archive holds the readings. If the archive has a true gap instead, there is simply nothing to see, which also yields `unknown`. Both are tested (§19.8).
- The timeline header records the delay used for every gauge and the outage windows (§19.11), and the app shows `replay.assumes_delay` (§3.7).
- `replay-build --delay-override N` produces the sensitivity runs (§18.12): every gauge's delay becomes `N`; outages still apply. Those runs are not bundled.
- **Approval caveat:** today's archive holds **approved** values, not the provisional values that were live in 2013–2025. Record this in `assumptions.values`.
- A 15-min delay appears only as a row of the delay-sensitivity table (§18.12), never as a default.

### 19.5 Clocks (`clock.py`)
```python
class Clock(Protocol):
    def now(self) -> datetime: ...

class LiveClock:
    def now(self) -> datetime:
        return datetime.now(UTC).replace(second=0, microsecond=0)

class ReplayClock:                                   # deterministic batch stepping; no wall clock
    def __init__(self, start: datetime, step: timedelta = timedelta(minutes=5)) -> None:
        self._t, self.step = start, step
    def now(self) -> datetime:
        return self._t
    def advance(self) -> None:
        self._t += self.step
```
Live ticks use `now` floored to the 5-minute boundary (`floor5(now)`), so live and replay frames line up. The in-app playback clock (speed, scrub) is a UI concern (§33). It only reads the precomputed timeline and never runs the pipeline.

### 19.6 The one pipeline: `tick()` (`fordcast/tick.py`, agent)
```python
LOOKBACK = timedelta(hours=6)

async def tick(now: datetime, source: DataSource, official: OfficialStatusSource,
               state: StateStore, model: RiskModel) -> TickResult:
    """IDENTICAL for live and replay. Never reads truth, the wall clock, or global data."""
    net = model.network                                    # crossings + links + params for model.version
    series = await source.series(net.gauge_ids, "00065", as_of=now, lookback=LOOKBACK)
    assert_no_lookahead([r for rs in series.values() for r in rs], now)
    off = await official.status(net.crossing_ids, as_of=now)
    results, transitions = {}, []
    for c in net.crossings:                                # sorted by id → deterministic order
        links = net.links[c.id]
        o = off.get(c.id)
        o_fresh = is_fresh_official(o, now)
        rule = baseline_rule.evaluate(c, links, series, now)
        ml = model.ml.evaluate(c, links, series, now) if model.ml is not None else None
        raw_state, reasons = combine.resolve_raw_state(
            official=o if o_fresh else None,
            water_at_road=features.water_at_road(c, series, now),
            all_gauges_stale=features.crossing_is_stale(c, links, series, now, rule),
            tier=c.tier, rule=rule, ml=ml)
        prev = await state.get(c.id)
        nxt = state_machine.step(prev, RawState.build(raw_state, reasons, rule, ml, o), now,
                                 StepContext.build(c, links, series, now, o, o_fresh))
        await state.put(c.id, nxt)
        results[c.id] = RiskResult.from_tracker(c, nxt, rule, ml, series, now)
        if nxt.state != prev.state:
            transitions.append(Transition(c.id, prev.state, nxt.state, now, nxt.window, nxt.reasons))
    return TickResult(now=now, model_version=model.version, results=results, transitions=transitions,
                      gauges=GaugeStatus.summarize(series, net, now))
```
- `StateStore` has two implementations: `DbStateStore` (`private.risk_tracker`, batched reads and writes per tick) and `MemoryStateStore` (replay).
- `RiskModel` = link parameters + optional ML for one `model_version`. Live uses `model_versions.is_live`. Replay of storm S uses **`rule-loso-<S>`**, the parameters learned **without** storm S (§18.12), so the bundled replays are out-of-sample.
- The live wrapper (§20.3) adds ingest before `tick()` and writes, snapshots and push after it. Replay adds framing (§19.7). **Neither** changes `tick()`.

### 19.7 Replay driver (`replay/build.py`)
```python
async def run_replay(storm: Storm, model: RiskModel, *, delays: Mapping[str, int],
                     until: datetime | None = None) -> list[Frame]:
    source = StormReplaySource.from_storm(storm, delays=delays)   # delays: frozen file (§19.4); outages: storm.outages
    official = ReplayOfficial(storm)                     # empty unless timestamped records exist
    state, clock = MemoryStateStore(), ReplayClock(storm.window_start)
    frames: list[Frame] = []
    end = until or storm.window_end
    while clock.now() <= end:
        res = await tick(clock.now(), source, official, state, model)
        frames.append(Frame.from_tick(res))             # t → {crossing_id: (state, window, reasons, p)}
        clock.advance()
    return frames
```
`Frame` equality is exact (states, windows, reasons with rounded numbers), which is what the tests compare.

### 19.8 No-lookahead tests (MUST pass in CI; `tests/test_no_lookahead.py`, `tests/test_truth_isolation.py`)
```python
# tests/test_no_lookahead.py  (agent writes these BEFORE the student implements base.py)
import pytest
from datetime import timedelta

pytestmark = pytest.mark.asyncio

async def test_prefix_invariance(storm, model):            # gold standard
    full = await run_replay(storm, model, delays=storm.delays)
    cut = storm.window_start + (storm.window_end - storm.window_start) / 2
    truncated = storm.with_readings([r for r in storm.readings if r.obs_time <= cut])
    trunc = await run_replay(truncated, model, delays=storm.delays, until=cut)
    assert full[:len(trunc)] == trunc                       # deleting the future must not change the past

async def test_future_poison_is_invisible(storm, model):
    cut = storm.window_start + timedelta(hours=9)
    g = storm.gauge_ids[0]
    poison = Reading(g, "00065", cut + timedelta(minutes=5), cut + timedelta(minutes=15), 99.0)
    poisoned = storm.with_readings(storm.readings + [poison])
    assert await run_replay(poisoned, model, delays=storm.delays, until=cut) == \
           await run_replay(storm, model, delays=storm.delays, until=cut)

async def test_latency_is_respected(storm, model):          # a reading is invisible until available_at
    src = StormReplaySource.from_storm(storm, delays={g: 60 for g in storm.gauge_ids})
    r = storm.readings[100]
    before = await src.series([r.gauge_id], "00065", as_of=r.obs_time + timedelta(minutes=55),
                              lookback=timedelta(hours=6))
    after = await src.series([r.gauge_id], "00065", as_of=r.obs_time + timedelta(minutes=60),
                             lookback=timedelta(hours=6))
    assert r.obs_time not in {x.obs_time for x in before[r.gauge_id]}
    assert r.obs_time in {x.obs_time for x in after[r.gauge_id]}

async def test_source_rejects_lookahead():                  # a buggy source must raise
    bad = BadSource(leak_minutes=5)                          # returns one reading from the future
    with pytest.raises(LookaheadError):
        await tick(T0, bad, EmptyOfficial(), MemoryStateStore(), tiny_model())

async def test_outage_is_respected(storm):                  # documented transmission outage (meta.toml `outages`)
    g = storm.gauge_ids[0]
    start = storm.window_start + timedelta(hours=6)
    end = start + timedelta(hours=2, minutes=30)
    out = storm.with_outages([Outage(site=g, start=start, end=end, source="test fixture")])
    src = StormReplaySource.from_storm(out, delays={x: 15 for x in out.gauge_ids})
    inside = {r.obs_time for r in out.readings if r.gauge_id == g and start <= r.obs_time < end}
    assert inside, "the fixture must hold readings INSIDE the outage (the 2013 situation)"
    during = await src.series([g], "00065", as_of=end - timedelta(minutes=5), lookback=timedelta(hours=6))
    at_end = await src.series([g], "00065", as_of=end, lookback=timedelta(hours=6))
    assert not inside & {x.obs_time for x in during[g]}     # silent for the whole outage
    assert inside <= {x.obs_time for x in at_end[g]}         # everything arrives at the outage end

@pytest.mark.parametrize("archive", ["readings_present", "true_gap"])
async def test_outage_makes_dependent_crossings_unknown(outage_storm, model, archive):
    # Fixture: crossing test-0001 whose ONLY upstream link is the outage gauge (synthetic readings under a
    # real §16.18 gauge id); "true_gap" deletes the in-outage readings and the outage entry instead.
    s = outage_storm if archive == "readings_present" else outage_storm.without_outage_readings()
    o = outage_storm.outages[0]
    thr = max(model.stale_after_min(o.site), outage_storm.delays[o.site] + 20)    # §18.9 replay rule
    frames = await run_replay(s, model, delays=outage_storm.delays)
    checked = [f for f in frames if o.start + timedelta(minutes=thr) < f.t < o.end]
    assert checked and all(f.states["test-0001"] == "unknown" for f in checked)
```
A data test, `tests/replay/test_halloween_2013_outage.py` (skipped with a clear reason when the storm Parquet isn't present; CI fetches it with `make data-fetch`), rebuilds `halloween-2013` and asserts that no `USGS-08159000` reading observed inside the `meta.toml` outage is visible before the outage end, that every crossing for which 08159000 is the only usable upstream gauge is `unknown` from `start + threshold` until `end`, and that the storyboard holds the `gauge_silent` line (§19.13).
```python
# tests/test_truth_isolation.py — static import scan (AST, handles relative imports)
import ast, pathlib
PKG = pathlib.Path(__file__).parents[1] / "fordcast"
RUNTIME = ["tick.py", "snapshot.py", "sources", "features", "model/baseline_rule.py", "model/combine.py",
           "model/state_machine.py", "model/windows.py", "model/explain.py", "model/ml.py", "api", "push"]
BANNED_MODULES = ("fordcast.scoring",)
BANNED_TEXT = ("ground_truth_events", "truth.csv")

def _files():
    for item in RUNTIME:
        p = PKG / item
        yield from (p.rglob("*.py") if p.is_dir() else [p])

def _absolute(mod: str | None, level: int, file: pathlib.Path) -> str:
    if level == 0:
        return mod or ""
    base = list(file.relative_to(PKG.parent).with_suffix("").parts[:-level])
    return ".".join(base + ([mod] if mod else []))

def test_runtime_cannot_import_or_read_truth():
    for f in _files():
        text = f.read_text()
        assert not any(t in text for t in BANNED_TEXT), f
        for node in ast.walk(ast.parse(text)):
            if isinstance(node, ast.Import):
                names = [a.name for a in node.names]
            elif isinstance(node, ast.ImportFrom):
                base = _absolute(node.module, node.level, f)
                names = [base] + [f"{base}.{a.name}" for a in node.names]
            else:
                continue
            assert not any(n == b or n.startswith(b + ".") for n in names for b in BANNED_MODULES), (f, names)
```
Also add a **hypothesis property test**: for random cut times within a storm, `features.*` computed at `as_of = cut` from the source equal those computed from a copy of the readings truncated at `cut`.

### 19.9 Determinism and golden files
- Fixed 300-s step; gauges and crossings sorted by id; `random_state=0` everywhere; probabilities rounded to 3 decimals; feet to 2 decimals in gauge arrays and 1 in reasons; minutes to integers.
- Serialization: `orjson.dumps(obj, option=orjson.OPT_SORT_KEYS)`. Gzip with **`gzip.compress(data, compresslevel=9, mtime=0)`**, so the `.gz` bytes are reproducible (Python's default stores the current time).
- **Three hashes** (all hex sha256):
  - `timeline_sha256`: of the **uncompressed canonical JSON bytes** (the whole document). The app verifies this after gunzip (§33.1).
  - `content_sha256`: of the canonical JSON **with the `pipeline` block removed**. This is the CI golden value, because `pipeline.git_sha` and `generated_at` change on every commit.
  - `file_sha256`: of the `.gz` bytes. It names the immutable Storage path (§19.15).
- `data/replays/index.json` lists all three per storm (§19.14; `make app-data` copies it into the app). CI runs `uv run python -m fordcast replay-verify --all`, which rebuilds every bundled timeline from `data/storms/*` (Storage-hosted Parquet fetched first with `make data-fetch`), the committed link parameters, the frozen `data/latency/gauge_latency.json`, each storm's `meta.toml` outages and the committed `docs/results/results.json` (for `hero_by_storm`), and asserts **`content_sha256` matches**. It never reads the live DB. That proves the app's demo data came out of the real pipeline.
- Timelines are regenerated **only** by `make replays`, with a devlog line, and after the science freeze only with human approval. A new `results.json` (new hero) or a new latency file means `make replays` must run too, or `replay-verify` fails.

### 19.10 Gauge-failure `unknown` moments (shown honestly)
- If a crossing's primary gauge goes silent (no reading **arrives** within its threshold), §18.9 turns the crossing `unknown` with `DATA_STALE`. The timeline records the transition like any other, and the storyboard adds the `gauge_silent` line (§19.13), rendered from `replay.gauge_silent` (§3.7): "{{gauge}} went silent. Its readings only arrived later, so FordCast shows Unknown here."
- **Two causes, one result.** (a) A **documented transmission outage** (`meta.toml` `outages`, §19.3): the gauge kept measuring, but the readings only arrived at the outage end, so the replay can't see them before then (§19.4), even though today's archive holds them. (b) A **true gap** in the archive: there is nothing to see. Both yield `unknown`; neither is ever shown as calm.
- **Halloween 2013:** the gauge went silent; its readings only arrived later. Crossings for which **08159000 (US 183)** is the primary (or only usable) upstream gauge go `unknown` from shortly after **11:15Z** (once the last pre-outage reading is older than the threshold) **until 13:45Z**, then come back at a much higher level when the delayed readings arrive. Crossings that rely on 08158700 (Driftwood) keep their state. VERIFY BEFORE USE: the outage bounds from the USGS alert and S3, written into `meta.toml` with their source.
- The player shows the dashed `unknown` ring with `state.unknown` "last known" ("Last known: {{state}} · {{age}}", §3.4, §3.7, §33.7), the gauge's hydrograph shows the hatched "No data" band until the delayed samples become visible, and it is announced once. This is the safety rule demonstrated on real data, and it is a strong judge moment.
- Truth onsets inside a **true** archive gap are **censored** (§18.2), and the lead is a lower bound. Inside a documented outage the archive has the readings, so the onset is exact; only FordCast's view was late.

### 19.11 Timeline format `fordcast.replay.v1` (bundled + Storage mirror)

**Top-level fields (all required unless marked optional):**

| Field | Type | Meaning |
|---|---|---|
| `schema` | `"fordcast.replay.v1"` | version |
| `storm` | object | `id, name_en, name_es, start, end, tz, headline_event \| null` (null when the storm has no headline moment, e.g. a control storm)`, description_en?, description_es?` |
| `step_s` | 300 | tick step |
| `assumptions` | object | `data_delay_min` (number: the median delay over the storm's linked gauges, shown in the header via `replay.assumes_delay`), `data_delay_min_by_gauge: {gauge_id: min}`, `default_delay_min: 60`, `delays_source: "data/latency/gauge_latency.json"`, `outages: [{site, start, end, source}]` (copied from `meta.toml`; `[]` when none), `official_status: "not available for this storm"`, `values: "approved archive values, not the provisional values live at the time"`, `params: "learned without this storm (leave-one-storm-out)"`, `rain: null \| "MRMS …"` |
| `pipeline` | object | `git_sha, model_version, data_sha256, latency_sha256, results_sha256, generated_at` (**excluded** from `content_sha256`) |
| `gauges[]` | array | `id, name, lon, lat, t0, dt_s (900), stage_ft[]` (**`null` only where the archive has no value**, a true gap), `avail_delay_s`, `outages: [{start, end}]` (this gauge's documented transmission outages; `[]` when none), `trigger_ft \| null, watch_ft \| null` (from the gauge's primary link, for the sparkline lines), `nws_categories {action, minor, moderate, major} \| null`. **Visibility rule for the sparkline** (the same rule as §19.4): the sample at time `t` may be drawn at `simT` only if `t + avail_delay_s ≤ simT` **and**, when `t` lies inside one of the gauge's `outages` (`start ≤ t < end`), `simT ≥ end`. The 2013 US 183 samples therefore exist in the file but stay hidden (hatched "No data" band) until the outage end. |
| `crossings[]` | array | `id, name, name_es?, lon, lat, tier, initial_state, overtop_stage_ft?, target_gauge_id?` |
| `links[]` | array | `crossing_id, gauge_id, relation, is_primary, tau_min, tau_p25, tau_p75, tau_lo_min, tau_hi_min, trigger_ft, watch_ft, channel_dist_km, flowline [[lon,lat],…]` (simplified). `tau_lo_min`/`tau_hi_min` are the §18.10 rounded 15-min range (same `explain.py` helper as the reason object) and the **only** travel time the app renders; `tau_min`/`tau_p25`/`tau_p75` drive the pulse math and the debug screen only |
| `events[]` | array, sorted by `t` | **state changes only**: `t, crossing_id, state, window ([lo,hi] \| null), reasons[] (§18.10), p ([p30,p60,p90] \| null), held (bool)` |
| `pulses[]` | array | for the water-travel animation: `crossing_id, gauge_id, t_trigger, tau_min` (one per AVOID-causing upcrossing) |
| `alerts[]` (optional, Stretch) | array | NWS: `id, event, sent, expires, damage_threat?, headline_en` |
| `truth[]` | array | `crossing_id, onset, end, quality, censored`. `end` is always a string (clipped to the window end). Used for "Reveal truth" and the result banner; **never** used to compute states. |
| `official[]` (optional) | array | historic **timestamped** official records `t, crossing_id, status, source`; omitted when none exist (expected; see `assumptions.official_status`) |
| `metrics` | object | this storm's headline row for `upstream_rule` at the AVOID level: `method, level, pod, far, csi, median_lead_min, n_events` (numbers, or `null` when undefined, e.g. a control storm with no onsets), plus `comparators: {nearest_gauge: {…same keys…}, watch_level: {…}}` |
| `hero` | object \| null | `crossing_id, lead_min, level: "avoid", onset, first_alert_at, censored`: this storm's example picked by the pre-registered rule (`results.json.hero_by_storm[<storm id>]`, §18.13); `null` when the storm has no tier-A AVOID hit (e.g. the `oct-2018` control), and then the app shows no callout (§19.12) |
| `storyboard[]` | array | `t, kind, en, es` (§19.13) |

```json
{
  "schema": "fordcast.replay.v1",
  "storm": {"id": "halloween-2013", "name_en": "Halloween Flood 2013", "name_es": "Inundación de Halloween 2013",
            "start": "2013-10-30T12:00:00Z", "end": "2013-11-01T00:00:00Z", "tz": "America/Chicago",
            "headline_event": "2013-10-31T11:15:00Z"},
  "step_s": 300,
  "assumptions": {"data_delay_min": 38, "data_delay_min_by_gauge": {"USGS-08158700": 60, "USGS-08159000": 15},
                  "default_delay_min": 60, "delays_source": "data/latency/gauge_latency.json",
                  "outages": [{"site": "USGS-08159000", "start": "2013-10-31T11:15:00Z", "end": "2013-10-31T13:45:00Z",
                               "source": "USGS alert 2013-10-31"}],
                  "official_status": "not available for this storm",
                  "values": "approved archive values, not the provisional values live at the time",
                  "params": "learned without this storm (leave-one-storm-out)", "rain": null},
  "pipeline": {"git_sha": "abc1234", "model_version": "rule-loso-halloween-2013", "data_sha256": "…",
               "latency_sha256": "…", "results_sha256": "…", "generated_at": "2026-10-19T20:00:00Z"},
  "gauges": [{"id": "USGS-08158700", "name": "Onion Ck nr Driftwood", "lon": -98.01, "lat": 30.08,
              "t0": "2013-10-30T12:00:00Z", "dt_s": 900, "stage_ft": [3.1, 3.1, 3.2, null, 3.4],
              "avail_delay_s": 3600, "outages": [], "trigger_ft": 9.0, "watch_ft": 6.4, "nws_categories": null},
             {"id": "USGS-08159000", "name": "Onion Ck at US Hwy 183", "lon": -97.69, "lat": 30.18,
              "t0": "2013-10-30T12:00:00Z", "dt_s": 900, "stage_ft": [4.2, 4.2, 4.3, 4.3, 4.4],
              "avail_delay_s": 900, "outages": [{"start": "2013-10-31T11:15:00Z", "end": "2013-10-31T13:45:00Z"}],
              "trigger_ft": null, "watch_ft": null,
              "nws_categories": {"action": 15, "minor": 17, "moderate": 23, "major": 27}}],
  "crossings": [{"id": "atx-081", "name": "…", "lon": -97.8, "lat": 30.2, "tier": "A", "initial_state": "no_rise",
                 "overtop_stage_ft": 17.0, "target_gauge_id": "USGS-08159000"}],
  "links": [{"crossing_id": "atx-081", "gauge_id": "USGS-08158700", "relation": "upstream", "is_primary": true,
             "tau_min": 40, "tau_p25": 35, "tau_p75": 46, "tau_lo_min": 30, "tau_hi_min": 60, "trigger_ft": 9.0, "watch_ft": 6.4,
             "channel_dist_km": 38.2, "flowline": [[-98.0, 30.1], [-97.9, 30.15], [-97.8, 30.2]]}],
  "events": [{"t": "2013-10-31T08:10:00Z", "crossing_id": "atx-081", "state": "watch", "window": null,
              "reasons": [{"code": "UPSTREAM_RISING", "gauge_id": "USGS-08158700", "rise_ft_30m": 2.1}],
              "p": null, "held": false}],
  "pulses": [{"crossing_id": "atx-081", "gauge_id": "USGS-08158700", "t_trigger": "2013-10-31T08:40:00Z",
              "tau_min": 40}],
  "truth": [{"crossing_id": "atx-081", "onset": "2013-10-31T09:25:00Z", "end": "2013-10-31T18:00:00Z",
             "quality": "impact_statement", "censored": false}],
  "metrics": {"method": "upstream_rule", "level": "avoid", "pod": null, "far": null, "csi": null,
              "median_lead_min": null, "n_events": 0,
              "comparators": {"nearest_gauge": {"pod": null, "far": null, "csi": null, "median_lead_min": null, "n_events": 0},
                              "watch_level": {"pod": null, "far": null, "csi": null, "median_lead_min": null, "n_events": 0}}},
  "hero": {"crossing_id": "atx-081", "lead_min": null, "level": "avoid", "onset": "…", "first_alert_at": "…",
           "censored": false},
  "storyboard": [{"t": "2013-10-31T08:10:00Z", "kind": "first_watch",
                  "en": "Water rising upstream at Onion Ck nr Driftwood",
                  "es": "El agua sube río arriba en Onion Ck nr Driftwood"}]
}
```
(Example values are illustrative. Every value in a real file is generated.)

- **Size budget:** ≤ 150 KB gzipped per storm; all bundled replays ≤ 1 MB (§7.4). Expected about 40–150 KB raw and 15–40 KB gzipped `[V estimate]`. The builder fails if a file exceeds the budget. If it does, simplify flowlines further or drop gauges not linked to scored crossings.
- **States are step functions.** The app finds the state at `simT` by binary search over a crossing's events (§33). Before the first event it uses `initial_state`. States are never interpolated.
- **The schema is shared:** `docs/schemas/replay.v1.example.json` is validated by pydantic (`replay/schema.py`) in backend tests and by zod in mobile tests (§7.1).

- **Client mirror:** D §33.2 mirrors this table with zod. `metrics` values may be `null` (no onsets → POD undefined); `assumptions.data_delay_min` is a number; `index.json` is `{schema, generated_at, hero_storm_id, storms: [...]}` with the entry field `bytes_gz` (§19.14). Nullable fields are always present as explicit `null` (§22.3 rule); the client uses `.nullable()` for them.

### 19.12 The "X minutes earlier" metric (definition)
- For crossing *c* in storm *s*: **`lead_avoid(c, s)` = onset − start of the AVOID episode that is the hit for that onset** (§18.12), in minutes, a multiple of 5 (floored), or **undefined** if the onset was missed.
- "Earlier" means **earlier than water reached the road**. Reactive tools (closures after water is over the road) have lead 0 by definition, so the same number is also "earlier than reactive tools".
- **Hero** = the crossing/storm pair picked by the **pre-registered rule** (§18.13: the tier-A AVOID hit closest to the overall median lead, within a bundled storm; never the maximum), stored in `results.json.hero`; each bundled storm's own example (same rule, same target median) is in its timeline `hero`. If its onset is censored, the lead is a lower bound, still shown as computed, with "(at least)".
- **The app** shows `replay.result` ("FordCast warned {{x}} min before water reached the road") when `simT` passes the storm's `hero.onset`, **always** together with `replay.honesty` ("Example picked by a fixed rule: the warning closest to the typical one. Across {{n}} storms the median lead time was {{m}} min.") using `results.json.headline`. A storm whose `hero` is `null` shows no callout. The video uses the same two numbers (§41).
- WATCH-level leads are reported in `results.json` but are **not** the headline.

### 19.13 Storyboard generation (`replay/storyboard.py`)
- Generated from events, truth, outages and gauge arrays. Never hand-typed. At most 8 lines per storm, in time order.
- **All storyboard copy comes from the §3.7 bank** (A §3.7 owns all user-facing copy). `backend/fordcast/replay/storyboard_templates.json` maps each kind to the §3.7 key it renders, with the EN/ES text copied verbatim and i18next `{{var}}` placeholders:
  ```json
  {"first_watch":  {"key": "reason.UPSTREAM_RISING",        "en": "Water rising upstream at {{gauge}}", "es": "El agua sube río arriba en {{gauge}}"},
   "first_avoid":  {"key": "reason.UPSTREAM_ABOVE_TRIGGER", "en": "{{gauge}}: +{{rise}} ft over the last 30 min, upstream. Water usually takes {{tau_lo}}–{{tau_hi}} min to get here.", "es": "{{gauge}}: +{{rise}} pies en los últimos 30 min, río arriba. El agua suele tardar {{tau_lo}}–{{tau_hi}} min en llegar aquí."},
   "gauge_silent": {"key": "replay.gauge_silent",           "en": "{{gauge}} went silent. Its readings only arrived later, so FordCast shows Unknown here.", "es": "{{gauge}} dejó de transmitir. Sus lecturas llegaron después, así que FordCast muestra Desconocido aquí."},
   "gauge_gap":    {"key": "reason.DATA_STALE_gauge",       "en": "No recent data from {{gauge}} (last {{age}})", "es": "Sin datos recientes de {{gauge}} (últimos: {{age}})"},
   "official":     {"key": "reason.OFFICIAL_CLOSED",        "en": "Official: {{source}} reports it closed", "es": "Oficial: {{source}} lo reporta cerrado"},
   "alert":        {"key": "nws.ffw",                       "en": "…", "es": "…"}}
  ```
  (`alert` is Stretch F82 and uses the matching `nws.*` key per product.) `{{tau_lo}}`/`{{tau_hi}}` come from the link's `tau_lo_min`/`tau_hi_min` (§18.10); a bare `{{tau}}` and any single-number travel time are forbidden (A §3.5 rule 8). A test asserts that every `en`/`es` value equals the referenced key in `mobile/src/locales/{en,es}.json`, so the two can't drift; the banned-words and countdown guards scan both the templates and the rendered `storyboard[]` strings of every built timeline (§3.12, §24.7).
- `gauge_silent` is emitted when a gauge in a **documented outage** stops delivering (its newest visible reading becomes older than its threshold); its `t` is the moment the dependent crossing turns `unknown`. A **true archive gap** (no documented outage, so the readings never arrived) emits `gauge_gap` instead, because "its readings only arrived later" would not be true there. `{{age}}` is rendered in the storm's local time zone relative to the line's `t`.
- A kind whose sentence is not in the §3.7 bank (for example "the gauge is reporting again", "upstream peak" or "water reached the road") is **not generated**; the player's scrubber ticks and result banner already show those moments. Adding such a line needs a new §3.7 key first (stop-and-ask, A §1.7 item 1).
- Spanish lines are reviewed by a fluent Spanish speaker with the rest of the bank (§35).

### 19.14 CLI and `tools/build_replays.py`
```text
uv run python -m fordcast backfill --storm <id> | --all          # USGS continuous → data/storms/<id>/readings.parquet
uv run python -m fordcast learn --loso                           # per-fold link params (rule-loso-<id>) + live params
uv run python -m fordcast replay-build --storm <id> [--delay-override N] [--out DIR]
uv run python -m fordcast replay-verify --all                    # rebuild + compare content_sha256 (CI)
make replays [UPLOAD=1]                                          # = uv run python ../tools/build_replays.py [--upload], then make app-data
```
`tools/build_replays.py` (agent-written; runs in the **backend** environment because it calls the `fordcast` CLI, A §5.3) is run only via `make replays` (A §5.2):
1. For each `data/storms/*/meta.toml` with `bundle = true`: run `replay-build` (delays from `data/latency/gauge_latency.json`, outages from `meta.toml`, `hero` from `docs/results/results.json` `hero_by_storm`), then validate against the pydantic schema and the size budget.
2. Write `data/replays/<id>.json.gz` (gzip, `mtime=0`) and `data/replays/index.json`, and copy the same `.json.gz` files to `backend/fordcast/replay/data/` (the server copy for `states_at`, §19.16). It **never** writes into `mobile/`: `make app-data` copies `data/replays/` into `mobile/assets/replays/`, stamps `hero_storm_id`/`featured`, and generates `assets.ts` (§17.14).
   ```json
   {"schema": "fordcast.replay-index.v1", "generated_at": "…", "hero_storm_id": null,
    "storms": [{"id": "halloween-2013", "name_en": "…", "name_es": "…", "start": "…", "end": "…",
                "file": "halloween-2013.json.gz", "bytes_gz": 31244, "generated_at": "…",
                "timeline_sha256": "…", "content_sha256": "…", "file_sha256": "…",
                "model_version": "rule-loso-halloween-2013", "featured": false, "sort_order": 1,
                "median_lead_min": null, "n_crossings": 6}]}
   ```
   (`hero_storm_id` and `featured` are filled by `make app-data` from `results.json`; `sort_order` = §16.19 catalog order.)
3. Run the banned-words and countdown guards on every `storyboard` string.
4. With `--upload` (`make replays UPLOAD=1`; needs `SUPABASE_URL` + `SUPABASE_SECRET_KEY` from `backend/.env`): put each file in Supabase Storage at **content-hashed paths** `replays/<id>.v1.<file_sha256[:12]>.json.gz` (cache-control `31536000, immutable`), plus `replays/index.json` (cache-control `300`). The upload touches Storage only; the `public.storms` rows come from `seed.sql` (§21.5) via `make seed-prod`, so there is one path into the production DB.

### 19.15 Bundling and the Storage mirror
- The app ships the bundled `index.json` + `.json.gz` files (offline first; copied into `mobile/assets/replays/` by `make app-data`, §17.14). On launch with network, it fetches `{storage}/replays/index.json`. For any storm whose `file_sha256` differs from the bundled entry **and** whose `generated_at` is newer, it downloads the content-hashed file, checks the bytes' sha256 against `file_sha256`, gunzips it, verifies `timeline_sha256`, validates the schema, and caches it. A failed verification keeps the bundled copy.
- `.gz` handling, Metro asset extensions and on-device gunzip are specified in §27 and §33.
- Storage mirror files are immutable (new content → new path). `index.json` is the only mutable file.

### 19.16 Replay states for routing (`replayAt`) `[Stretch F54]`
`replay/states_at.py::states_at(storm_id, t) -> dict[crossing_id, (state, window)]` loads the bundled timeline (server copy in `backend/fordcast/replay/data/` or the Storage mirror) and binary-searches events, exactly like the app. `/v1/route` uses it when `replay_at` is given (`storm_id` optional; §22.5). The response is marked `mode: "replay"` and is never cached with live results.

### 19.17 Done when (F75, F76)
- [ ] `test_prefix_invariance`, `test_future_poison_is_invisible`, `test_latency_is_respected`, `test_source_rejects_lookahead`, `test_outage_is_respected`, `test_outage_makes_dependent_crossings_unknown` (both archive variants) and `test_runtime_cannot_import_or_read_truth` pass in CI; the `halloween-2013` outage data test passes once the storm data is fetched.
- [ ] `replay-verify --all` matches every committed `content_sha256`, reading delays only from the committed `data/latency/gauge_latency.json` (no DB access in CI).
- [ ] Each bundled timeline is ≤ 150 KB gzipped, validates against the schema in both pydantic and zod, and carries out-of-sample (`rule-loso-*`) parameters.
- [ ] The storm named by `hero_storm_id` plays on the phone in airplane mode, its result banner number equals `results.json.hero.lead_min`, and the 2013 replay (if bundled) shows `unknown` at US 183 for the documented outage window with the `gauge_silent` storyboard line.

---
## §20. Backend architecture & hosting

### 20.1 Components

```text
                         ┌───────────────────────────── Supabase (Free) ─────────────────────────────┐
  (a) CLOCK              │ pg_cron '*/5 * * * *' ──► pg_net net.http_post (Vault: tick_url, secret) ──┼──┐
                         │ Postgres 15+ / PostGIS · Realtime (postgres_changes on risk_current)       │  │ POST /internal/tick
                         │ Storage bucket "fordcast-public": snapshots/current.json · replays/* ·     │  │ X-Tick-Secret
                         │   results/results.json                                                     │  │
                         └────────▲──────────────────────▲───────────────────────▲────────────────────┘  │
                                  │ psycopg (pooler 6543)│ Storage REST upload    │ Realtime WS            │
  (b) COMPUTE            ┌────────┴──────────────────────┴─────────┐               │                       │
                         │ Render web service "fordcast-api"        │◄──────────────┼───────────────────────┘
                         │ FastAPI · Python 3.13 · uvicorn (1 worker)│◄── GitHub Actions tick-backup (*/15, off-minute)
                         │  /internal/tick → lease → ingest → tick() │
                         │  → write-on-change → snapshot → push → hc │──► healthchecks.io ping (success/fail)
                         │  /v1/* read API · route · search · devices│──► Sentry (errors, 5 % traces)
                         └───┬───────────┬───────────┬───────────────┘◄── UptimeRobot (/v1/health, snapshot keyword)
                             │ httpx     │ httpx     │ httpx
             USGS OGC API v1 (X-Api-Key) │      Expo Push API ──► APNs / FCM ──► phones
             NWPS · NWS CAP (UA)         │
             (ATXfloods only w/ permission)  ORS / Stadia / Photon (route + search proxy)

  PHONE (Expo app): reads snapshot (Storage CDN) → /v1/risk/current → SQLite cache · Realtime hint · push · bundled replays
```

### 20.2 Data flow

```text
OFFLINE (CLI + notebooks; re-run when storms or crossings change)
  inventory pull/build ─► NLDI snap + upstream ─► map review ─► tiers + truth classes
  backfill storms + calm-2024 (USGS continuous) ─► Parquet (+ make data-upload > 5 MB) ─► learn τ + triggers (live + LOSO folds) ─► crossing_gauge_links
  make latency (live DB, Day 8) ─► data/latency/gauge_latency.json (frozen delays for every replay and backtest)
  make backtest (LOSO) ─► docs/results/results.json ─► select_hero.py (pre-registered rule) ─► README · app "How accurate" · video
  make replays: replay-build (rule-loso-<storm>, frozen delays, outages) ─► data/replays/*.json.gz + server copy + Storage mirror (+ golden content_sha256)
  make app-data ─► mobile/assets/{seed,replays,results}/ + assets.ts + manifest.json (§17.14)
  seed-sql ─► supabase/seed.sql (gauges, crossings, links, model_versions, storms, app_config) ─► make seed-prod ─► make model-live (only to switch versions)

LIVE (every 5 min)
  USGS ─► readings ─► tick() ─► risk_current (change-only) ─► Realtime ─► app (foreground hint)
                          ├──► snapshots/current.json (Storage, cache-control 30) ─► app (60 s foreground poll, bg refresh)
                          ├──► risk_transitions ─► push fan-out ─► Expo ─► APNs/FCM ─► app (background)
                          └──► private.risk_tracker (hysteresis), risk_history (changes + hourly keyframes)
  On device: SQLite cache · geofences ranked locally from the snapshot · Drive Mode TTS (Part D)
```

### 20.3 The live tick (sequence, code, timing)

**Sequence (every 5 minutes; each numbered step is timed and logged):**
```text
pg_cron ─ net.http_post(tick_url?source=pg_cron, X-Tick-Secret, timeout 10 s) ─► FastAPI
 0  verify secret (hmac.compare_digest; wrong/missing → 404) ; acquire lease for slot = date_bin(5 min, now())
    → 202 {"accepted": true|false}            (pg_net stores the response for 6 h; GH watchdog may call the same slot)
 1  background task run_live_tick(slot, holder) — whole task wrapped in asyncio.timeout(240) (hard timeout; lease is 6 min)
 2  ingest_runs row (status 'running', source, slot)
 3  USGS latest-continuous (1 req) + gap backfill (≤ 10 req)  → upsert readings (ON CONFLICT DO NOTHING)   [errors → continue]
 4  daily jobs (first tick after 06:00 UTC): USGS metadata + latency stats + stale_after_min · NWPS sync
 5  official status: manual (DB) · ATXfloods (only if ATXFLOODS_ENABLED and permitted)                    [errors → continue]
 6  (Stretch) NWS alerts · basin rain                                                                         [errors → continue]
 7  result = tick(slot, LiveSource, LiveOfficial, DbStateStore, live_model)        ← the SAME function as replay (§19.6)
 8  one DB transaction: risk_current change-only upserts · risk_transitions · risk_history · private.risk_tracker · seq++
 9  snapshot = build_snapshot(result, config, nws) → Storage upload snapshots/current.json (cache-control max-age=30)
    → keep in memory for GET /v1/risk/current                                                             [errors → Sentry]
10  push fan-out for result.transitions (§23) · receipts for tickets 15 min–23 h old                       [errors → Sentry]
11  ingest_runs → 'ok' (+ counts, durations, usgs_ratelimit_remaining, data_status) · release lease (last_ok_slot = slot)
    · GET HC_PING_URL
 ✗  any unhandled exception: Sentry capture · ingest_runs 'error' · GET HC_PING_URL/fail · lease_until = now()
    (last_ok_slot unchanged, so the watchdog or the next slot retries)
```
- **Partial failure is normal.** If USGS fails, the tick still runs, states age into `unknown`, and the snapshot is still written with `data_status` degraded or offline. That is the honest result. Only a crash in steps 7–9 fails the tick.
- **Budget:** p95 end-to-end ≤ 60 s (§7.4). **Timing (canonical):** tick hard timeout **240 s** (`asyncio.timeout(240)`); lease interval **6 minutes**, so a tick that hits the timeout is cancelled, logged (`ingest_runs` `error`, reason `timeout`) and releases its lease long before the lease could expire under it. A `TimeoutError` takes the handled-failure path (release, `hc /fail`). The GitHub watchdog and a second pg_cron call **skip** while a lease is held: the acquire below returns no row and the endpoint answers `{"accepted": false}`.

**Lease (dedupes pg_cron + the GitHub watchdog exactly per 5-minute slot):**
```sql
-- acquire: returns 1 row only if no tick is running AND this slot hasn't succeeded yet
update private.tick_lease
   set holder = %(holder)s, lease_until = now() + interval '6 minutes',
       slot = date_bin('5 minutes', now(), timestamptz '2000-01-01')
 where id = 1
   and lease_until < now()
   and (last_ok_slot is null
        or last_ok_slot < date_bin('5 minutes', now(), timestamptz '2000-01-01')
        or %(force)s)
returning slot, seq;
-- release on success
update private.tick_lease set lease_until = now(), last_ok_at = now(), last_ok_slot = slot
 where id = 1 and holder = %(holder)s;
-- release on handled failure (allow a retry in the same slot)
update private.tick_lease set lease_until = now() where id = 1 and holder = %(holder)s;
```
(`date_bin` needs PostgreSQL ≥ 14; Supabase runs ≥ 15.) The research validated the acquire/release pattern on PostgreSQL 16: the second concurrent acquire returned 0 rows `[V: code]`. The slot column replaces its "last_ok_at < now() − 4 min" guard, which could skip a slot after a slow tick. If the worker dies without releasing (a Render restart mid-tick), the 6-minute lease blocks at most the next slot; the watchdog (§20.6) or the slot after that retries.

```python
# backend/fordcast/api/routes/internal.py (agent-written)
router = APIRouter(include_in_schema=False)

@router.post("/internal/tick", status_code=202)
async def internal_tick(background: BackgroundTasks, source: Literal["pg_cron", "gha", "manual"] = "pg_cron",
                        x_tick_secret: str | None = Header(default=None),
                        x_admin_secret: str | None = Header(default=None)) -> dict:
    if not secret_ok(x_tick_secret, settings.tick_secret):
        raise HTTPException(status_code=404)                       # hide the endpoint
    force = source == "manual" and secret_ok(x_admin_secret, settings.admin_secret)
    holder = f"{source}:{uuid4().hex[:12]}"
    lease = await repo.acquire_lease(holder, force=force)
    if lease is None:
        return {"accepted": False, "reason": "slot_done_or_running"}
    background.add_task(run_live_tick, lease.slot, holder, source)
    return {"accepted": True, "slot": lease.slot.isoformat(), "holder": holder}

def secret_ok(given: str | None, expected: SecretStr) -> bool:
    return given is not None and hmac.compare_digest(given.encode(), expected.get_secret_value().encode())
```
`run_live_tick` follows steps 2–11 above. Each step is a small function in `fordcast/live.py` (agent-written) with a `with timed("step"):` context that feeds the structlog tick line (§24.5).

### 20.4 Supabase setup (Day 0–1 checklist; the human creates the project, the agent writes the SQL)

1. Create the project (Free). Pick the region closest to the Render region (both in US East or both in US West). VERIFY BEFORE USE which regions both offer.
2. **Keys:** the publishable key `sb_publishable_…` goes to the app (`EXPO_PUBLIC_SUPABASE_KEY`). The secret key `sb_secret_…` goes to Render/GitHub secrets only. New-format keys are **not JWTs** and go in the `apikey` header `[V: supabase-js 2.117.3 fetch.ts]`. VERIFY BEFORE USE that the publishable key maps to the `anon` role: an anon `insert` must fail (test in §21.9).
3. **Extensions:** PostGIS (`create extension postgis with schema extensions`; or Dashboard → Database → Extensions); **Cron** (Dashboard → Integrations → Cron, which enables `pg_cron`); **pg_net** (Dashboard → Extensions). Vault ships with Supabase projects. VERIFY BEFORE USE in the dashboard; fallback: store the tick URL/secret in a `private.secrets` table readable only by `postgres`.
4. **Migrations** `supabase/migrations/0001…0004` (§21) via the Supabase CLI (`npx supabase@2.120.0 db push` after `supabase link`) `[V: npm supabase@2.120.0]`, or paste them into the SQL editor in order. Local API tests run against `npx supabase@2.120.0 start` (Docker) in CI (§24.9).
5. **Storage:** create a **public** bucket `fordcast-public`. Paths: `snapshots/current.json`, `snapshots/archive/<slot>.json` (optional, hourly), `replays/index.json`, `replays/<id>.v1.<sha12>.json.gz`, `results/results.json`, `data/storms/<id>/readings.<sha12>.parquet` (large storm files, content-hashed, written by `make data-upload`, §17.1; public data). The public URL is `{SUPABASE_URL}/storage/v1/object/public/fordcast-public/<path>`.
6. **Vault secrets** (run once in the SQL editor; **never commit real values**; `supabase/manual/vault_secrets.example.sql` holds placeholders):
   ```sql
   select vault.create_secret('https://<render-service>.onrender.com/internal/tick?source=pg_cron', 'tick_url');
   select vault.create_secret('<64-hex-random from: python -c "import secrets;print(secrets.token_hex(32))">', 'tick_secret');
   ```
7. **Connection from Render:** use the **pooler** connection string (Supavisor). The direct `db.<ref>.supabase.co` host may be IPv6-only on Free `[U]`. In transaction mode (port 6543), set psycopg `prepare_threshold=None` `[V: psycopg 3.3.6 kwarg]` and never rely on session state (the lease row replaces advisory locks).
   ```python
   pool = AsyncConnectionPool(settings.database_url.get_secret_value(), min_size=1, max_size=5, open=False,
                              kwargs={"prepare_threshold": None, "autocommit": False})
   ```
8. **Storage upload** (snapshot; the default cache-control in `storage3` is 3600, which would freeze the map for an hour `[V: storage3 2.32.0 constants]`):
   ```python
   async def upload_json(client: httpx.AsyncClient, path: str, body: bytes, max_age: int) -> None:
       r = await client.post(
           f"{settings.supabase_url}/storage/v1/object/{settings.storage_bucket}/{path}",
           content=body,
           headers={"apikey": settings.supabase_secret_key.get_secret_value(),
                    "Authorization": f"Bearer {settings.supabase_secret_key.get_secret_value()}",
                    "content-type": "application/json", "cache-control": f"max-age={max_age}",
                    "x-upsert": "true"})
       r.raise_for_status()
   ```
   VERIFY BEFORE USE (Day 6): that the Storage REST API accepts the `sb_secret_` key this way (with or without the `Authorization` header) and that the object's `cache-control` comes out as `max-age=30` on a public GET. Fallback: `storage3` (the version `uv add storage3` resolves under `exclude-newer`; the research read 2.32.0) with `upload(path, body, {"cache-control": "30", "content-type": "application/json", "upsert": "true"})` `[V: code storage3 2.32.0]`.
9. **Debugging:** `select * from cron.job_run_details order by start_time desc limit 20;` and `select * from net._http_response order by created desc limit 20;` (pg_net keeps responses 6 h `[V]`).
10. **Pausing:** Free projects pause after a week without enough DB activity `[V]`. The 5-min ingest is activity, and the heartbeat alarm (§20.7) fires long before 7 days.
11. **Seed production and pick the live model (Day 6; `supabase db push` applies migrations only, never the seed):**
    1. `uv run python -m fordcast seed-sql > ../supabase/seed.sql` (also the last backend step of `make data`), commit.
    2. **Tell the human first** (it writes production data), then `set -a; . backend/.env; set +a` and `make seed-prod` (A §5.2): `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -1 -f supabase/seed.sql`, i.e. one transaction, idempotent upserts. Use the Supabase **session** pooler URL (port 5432) for `psql` (A §1.9). Re-running it changes no row counts.
    3. The seed makes the newest baseline rule version live **only if no version is live yet** (§21.5), so the baseline rule is live by default and a re-seed never undoes a deliberate switch. To switch versions (a new `learn` run, or ML promotion in Stretch): `make model-live VERSION=rule-YYYY.MM.DD` (A §5.2; runs `supabase/manual/set_model_live.sql`, which aborts if the version doesn't exist and leaves exactly one live row).
    4. Verify: `uv run python -m fordcast tick --once --dry-run` from a laptop, then one real tick (`POST /internal/tick?source=manual` with both secrets), then `select count(*) from public.risk_current` equals `select count(*) from public.crossings where is_active` (the test crossing is evaluated too; RLS hides it from clients) and `select version from public.model_versions where is_live` returns exactly one row.
    5. After the science freeze (A §6.2), `make seed-prod` and `make model-live` run only with the human's approval, together with `make backtest`/`make replays` if numbers change.

### 20.5 Render (API + tick worker)

| Setting | Value |
|---|---|
| Service | Web Service `fordcast-api`, repo `godtier812/Fordcast-CAC`, **Root Directory `backend`**, branch `main`, auto-deploy on |
| Runtime | Python; env `PYTHON_VERSION=3.13.16` plus a `.python-version` file containing `3.13` (whether Render honors the file is `[U]`) |
| Build | `pip install uv && uv sync --frozen --no-dev` (add `--extra ml` only if ML is promoted, §18.11) |
| Start | `uv run uvicorn fordcast.api.app:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips='*' --no-access-log` |
| Health check path | `/v1/health` |
| Instances / workers | 1 instance, 1 worker (in-memory rate limits and snapshot cache assume this) |
| Plan | **Free while building** (spins down after 15 min idle; ~1 min cold start; 750 instance-hours/month per workspace `[V]`). **Starter (~$7/mo `[U price]`) from Tue Oct 20 through Dec 31, 2026**, so judges never wait on a cold start. Downgrade or delete only after judging ends. If the district's judging runs later, keep Starter until it ends (§43). |
| Bandwidth | Hobby workspace includes 5 GB, then $0.15/GB (or spin-down without a card) `[V]` |
| Env vars | §20.12 (secrets via the dashboard; `sync: false` in a blueprint) |

An optional `render.yaml` blueprint MAY be committed (VERIFY BEFORE USE: current blueprint field names in Render docs):
```yaml
services:
  - type: web
    name: fordcast-api
    runtime: python
    rootDir: backend
    plan: free            # change to starter on Oct 20
    buildCommand: pip install uv && uv sync --frozen --no-dev
    startCommand: uv run uvicorn fordcast.api.app:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips='*' --no-access-log
    healthCheckPath: /v1/health
    envVars:
      - key: PYTHON_VERSION
        value: 3.13.16
      - key: DATABASE_URL
        sync: false
```
Render staff say artificially keeping a free service awake "goes against the spirit of the free tier" `[V]`. FordCast's 5-min tick is real work, not a keep-alive ping, and Starter removes the question from Oct 20.

### 20.6 GitHub Actions watchdog (backup clock)
- `.github/workflows/tick-backup.yml` (full YAML in §24.9) runs at **`7-59/15 * * * *`** (off the top of the hour, when GitHub delays are worst `[V]`). It POSTs `/internal/tick?source=gha`, then reads `/v1/meta/freshness` and **fails the job** (GitHub emails the owner) if `data_status == "offline"`.
- It is a watchdog, not the clock. GitHub schedules can be delayed or dropped `[V]`, and Actions terms discourage using them as a serverless backend `[U]`.
- **Public repos auto-disable scheduled workflows after 60 days without repository activity** `[V]`. The last commit around Oct 25 + 60 days ≈ Dec 24, inside judging. **Commit at least every 3 weeks**: on **Nov 10, Nov 30 and Dec 15** (+ **Jan 4** only if judging runs into January), each a refresh of `docs/status.md` (A §6.1 "After submission", E §43).
- Secrets: `API_BASE` (e.g. `https://<service>.onrender.com`, no trailing slash), `TICK_SECRET` (both in the §24.2 inventory).

### 20.7 Monitoring and alarms

| Check | Tool | Configuration | Alarm goes to |
|---|---|---|---|
| Tick heartbeat | healthchecks.io (free, 20 checks `[V-3p]`) | check `fordcast-tick`: period **5 min**, grace **10 min**; ping `HC_PING_URL` after a successful tick, `HC_PING_URL/fail` on error | student email + phone app; parent email |
| Nightly job | healthchecks.io | `fordcast-nightly`: period 1 day, grace 2 h | same |
| API up | UptimeRobot (free, 50 monitors at 5 min `[V-3p]`) | HTTP keyword monitor `GET {API}/v1/health`, keyword `"status":"ok"` | same |
| Snapshot live | UptimeRobot | keyword monitor on the public snapshot URL, keyword `"data_status":"live"` | same (expect alarms during real outages, which are true positives) |
| Exceptions | Sentry `sentry-sdk[fastapi]` 2.71 `[V]` | §24.4 init; alert rule on new issues | student email |
| Data freshness | `/v1/meta/freshness` + GH watchdog | job fails if `offline` | GitHub email |
| USGS quota | tick log `usgs_ratelimit_remaining` | Sentry warning when < 200 | Sentry |
| Supabase pause | email from Supabase + heartbeat | heartbeat fires within 15 min of ticks stopping | — |

### 20.8 Judging-proof fallback ladder (the app never shows a broken screen)
1. **Storm Replay is offline-first.** Timelines and `results.json` are bundled in the app (§19.15). Replay works in airplane mode, with Render down, and with Supabase paused.
2. **Live map read order:** Storage snapshot (CDN) → `GET /v1/risk/current` → SQLite cache. Every step shows its age. Older than 20 min → every crossing renders `unknown` with "Last known" (§3.4).
3. **Calm day:** `state.no_rise.area headline` ("No upstream rise detected near you") + `area sub` ("Watching {{g}} upstream gauges for {{c}} crossings · updated {{age}}") + "Try Storm Replay" (§3.7). Honest and complete; never an all-clear.
4. **`app_config`** (§20.9) shows a banner without a release, stops pushes (`kill_switch_push`), and forces an update notice (`min_app_version`).
5. **Server down:** the snapshot file stays readable (static), and the app ages it into `unknown`. Route/search show "Routing needs internet / unavailable" copy (§3.7).
6. **USGS outage or API change:** states become `unknown` (designed), the nightly live contract test alarms, and the base URL/version is config.
7. **Calendar:** Render Starter on Oct 20; commits on Nov 10, Nov 30 and Dec 15 (+ Jan 4 only if judging runs into January); weekly dashboard check during judging; keep everything running until Dec 31 (§43).

### 20.9 `app_config` (remote config, public read)

| Key | Value (JSON) | Default | Used by |
|---|---|---|---|
| `banner` | `null` or `{"en": "…", "es": "…", "level": "info"\|"warning", "until": "<ISO>"\|null}` | `null` | snapshot `config.banner` → app banner |
| `min_app_version` | `"1.0.0"` | `"1.0.0"` | update notice (F35) |
| `kill_switch_push` | `true\|false` | `false` | push fan-out (§23.8) |
| `demo_mode_default` | `true\|false` | `false` | app DEMO_MODE default (F83; build check still applies) |
| `featured_storm` | `"halloween-2013"` | `results.json.hero.storm_id` (written by `seed-sql`; never hand-picked, §18.13) | Replay picker ordering |

- Edit only with the CLI: `uv run python -m fordcast config set banner '{"en":"…","es":"…","level":"info"}'`. The CLI **runs the banned-words check (§3.12) and requires both languages** before writing. Raw SQL edits are allowed only in emergencies and are logged in the devlog.
- The snapshot carries `config` (§22.3), so the app needs no extra request.

### 20.10 Cost (Oct 14 → Dec 31, 2026)

| Item | Cost |
|---|---|
| Supabase Free · GitHub (public repo Actions) · USGS API key · healthchecks.io · UptimeRobot · Sentry Developer `[U quota]` · ORS free · Stadia free (non-commercial) · Expo Push · EAS free tier | **$0** |
| Render Starter Oct 20 → Dec 31 | **≈ $17–21** total `[U price]` (Free tier is the $0 fallback, with cold starts) |
| Apple Developer Program (only for Lane B iOS testing) | $99/yr, optional (§26) |

### 20.11 Python stack and `backend/pyproject.toml`

Versions were verified on PyPI on 2026-10-14 and resolved together on Python 3.13.16 (129 packages) `[V: code]`:

| Package | Version | Notes |
|---|---|---|
| Python | **3.13.16** | 3.14 also has wheels |
| fastapi / starlette | 0.142.1 / 1.7.0 | |
| uvicorn[standard] | 0.54.0 | |
| pydantic / pydantic-settings | 2.13.5 / 2.15.0 | v2 only (2.14 is days old; excluded) |
| httpx / tenacity | 0.28.1 / 9.1.4 | |
| psycopg[binary,pool] / psycopg-pool | 3.3.6 / 3.3.3 | `prepare_threshold` kwarg |
| orjson | 3.12.0 | |
| numpy / pandas / pyarrow | 2.5.3 / 3.0.6 / 25.0.1 | |
| scikit-learn / joblib | 1.9.1 / 1.6.0 | `FrozenEstimator`, `monotonic_cst` |
| shap / xgboost / lightgbm / matplotlib | 0.52.0 / 3.4.1 / 4.7.0 / ≥ 3.11 | extras |
| dataretrieval | 1.4.0 | v1 OGC API default; per-package exclude-newer override |
| pynhd / geopandas / pyproj / shapely | 0.20.0 / 1.2.0 / 3.8.0 / 2.1.2 | pyproj + shapely are runtime (routing); pynhd/geopandas offline |
| structlog / sentry-sdk[fastapi] / slowapi | 26.1.0 / 2.71.0 / 0.1.10 | |
| pytest / pytest-asyncio / respx / pytest-recording / vcrpy / hypothesis | 9.1.1 / 1.4.0 / 0.23.1 / 0.13.4 / 8.3.0 / 6.168.3 | dev |
| ruff / mypy | 0.16.9 / 2.3.1 | dev |
| **Not used** | APScheduler (external clock instead), polars (pandas suffices), exponent-server-sdk (sync) | |

```toml
# backend/pyproject.toml
[project]
name = "fordcast-backend"
version = "0.1.0"
requires-python = ">=3.13,<3.14"
dependencies = [
  "fastapi>=0.142,<0.143", "uvicorn[standard]>=0.54", "pydantic>=2.13,<2.14", "pydantic-settings>=2.15",
  "httpx>=0.28.1", "tenacity>=9.1", "psycopg[binary,pool]>=3.3.6", "orjson>=3.12",
  "numpy>=2.5,<2.6", "pandas>=3.0,<3.1", "pyarrow>=25", "scikit-learn>=1.9,<1.10", "joblib>=1.6",
  "dataretrieval>=1.4", "structlog>=26.1", "sentry-sdk[fastapi]>=2.71", "slowapi>=0.1.10",
  "shapely>=2.1", "pyproj>=3.8",
]

[project.optional-dependencies]
analysis = ["matplotlib>=3.11"]                       # backtest figures (offline, CI)
ml       = ["shap>=0.52", "xgboost>=3.4", "lightgbm>=4.7"]
geo      = ["pynhd>=0.20", "geopandas>=1.2"]           # offline linking (+ folium after VERIFY, §17.11)
# rain   = ["cfgrib==0.9.15.1", "eccodes==2.49.0", "xarray==2026.9.0"]   # Stretch; enable after VERIFY (§16.8)

[dependency-groups]
dev = ["pytest>=9.1", "pytest-asyncio>=1.4", "respx>=0.23", "pytest-recording>=0.13", "vcrpy>=8.3",
       "hypothesis>=6.168", "ruff>=0.16", "mypy>=2.3"]

[tool.uv]
package = false                                        # flat layout: run from backend/ (python -m fordcast)
exclude-newer = "2026-09-30T00:00:00Z"
exclude-newer-package = { dataretrieval = "2026-10-03T00:00:00Z" }

[tool.ruff]
line-length = 100
target-version = "py313"

[tool.pytest.ini_options]
pythonpath = ["."]
asyncio_mode = "auto"
markers = ["live: hits real external APIs (nightly only)"]
```
- VERIFY BEFORE USE: `uv lock` succeeds, `uv run python -c "import fordcast"` works from `backend/`, and `uv run uvicorn fordcast.api.app:app` starts. Fallback for `package = false`: a hatchling build backend with `[tool.hatch.build.targets.wheel] packages = ["fordcast"]`.
- Commit `uv.lock`. Never edit it by hand. Upgrades only with a reason in the devlog (§1.3).

**CLI (`fordcast/__main__.py`, argparse sub-commands):** `inventory {pull,build}` · `nwps sync` · `link {snap,upstream,tiers}` · `calm-days --year 2024 --n 40 --seed 20241231` (§16.19) · `backfill --storm ID|--all` · `learn [--loso]` · `backtest (--all | --storm ID) --out DIR [--smoke] [--compare FILE] [--delay-override N]` (§18.13) · `replay-build --storm ID [--delay-override N] [--out DIR]` · `replay-verify --all` · `seed-sql` (writes SQL to stdout) · `tick --once [--dry-run]` (one live tick from a laptop) · `official {set,clear}` · `config {get,set}` · `push test --device ID [--kind avoid|watch|update]` · `latency recompute [--out FILE]` (nightly it only updates `public.gauges`; with `--out ../data/latency/gauge_latency.json` it also writes the frozen file, §19.4; both need `DATABASE_URL`).

**Root `Makefile`:** the exact file, with every target, is in **A §5.2**; this section never repeats recipes. Backend-related targets used in Part C: `setup` · `smoke` (§16.20) · `data` and `link` (§17.1) · `latency` (§16.2, §19.4) · `backtest` and `backtest CHECK=1` (§18.13) · `replays` (`UPLOAD=1` for the Storage mirror; §19.14) · `app-data` (§17.14) · `seed` (local Supabase) · `seed-prod` and `model-live VERSION=<v>` (§20.4 step 11, §21.5) · `data-upload` / `data-fetch` (§17.1) · `notices` · `test` · `lint` · `ci` · `api`.

**Two Python projects (A §1.3 rule 5, A §5.3).** `backend/pyproject.toml` (above) is the service and CLI. Repo scripts in `tools/` that need third-party packages (`export_app_data.py`, `data_manifest.py`, `road_elevation.py`, `make_markers.py`, `cvd_screens.py`, …) use the separate `tools/pyproject.toml` project (`fordcast-tools`) and run as `uv run --project tools python tools/<script>.py` from the repo root (or through their `make` target). `smoke_test.py` and `build_replays.py` are the exceptions: they need the backend's packages and run in the backend environment (`cd backend && uv run python ../tools/<script>.py`). Never add a tools dependency group to the backend project, and never run a tools script that imports a third-party package with bare `python3`.

### 20.12 Configuration (`fordcast/config.py`, pydantic-settings; fails fast in production)

| Env var | Req. (prod) | Default / example | Notes |
|---|---|---|---|
| `ENVIRONMENT` | yes | `production` \| `development` \| `test` | |
| `DATABASE_URL` | yes | pooler URL, port 6543 | `SecretStr` |
| `SUPABASE_URL` | yes | `https://<ref>.supabase.co` | |
| `SUPABASE_SECRET_KEY` | yes | `sb_secret_…` | server only |
| `STORAGE_BUCKET` | — | `fordcast-public` | |
| `USGS_API_KEY` | yes | — | header `X-Api-Key` |
| `USGS_OGC_BASE` | — | `https://api.waterdata.usgs.gov/ogcapi/v1` | |
| `USGS_BBOX` | — | `-98.20,29.95,-97.40,30.70` | |
| `NLDI_BASE` · `NWPS_BASE` · `NWS_BASE` | — | §16.3 · §16.6 · §16.7 | |
| `NWS_UGC` | — | `TXC453,TXC209,TXC491,TXC053` | VERIFY (§16.7) |
| `PROJECT_CONTACT_EMAIL` | yes | project address | User-Agent |
| `TICK_SECRET` · `ADMIN_SECRET` | yes | 64-hex | constant-time compare |
| `EXPO_ACCESS_TOKEN` | yes | — | enhanced push security |
| `HC_PING_URL` | yes | `https://hc-ping.com/<uuid>` | |
| `SENTRY_DSN` | — | — | Sentry disabled if empty |
| `ORS_API_KEY` · `STADIA_KEY` | — (Stretch) | — | missing → route/search return 503 `routing_unavailable` |
| `ATXFLOODS_ENABLED` | — | `false` | `true` only after written permission (§16.5) |
| `NWS_ENABLED` · `ML_ENABLED` · `RAIN_SOURCE` | — | `false` · `false` · `none` (`open-meteo`\|`mrms`) | Stretch toggles |
| `CORS_ORIGINS` | — | empty | e.g. the GitHub Pages site |
| `GIT_SHA` | — | Render's commit env var `[U name]` or set at deploy | `/v1/health`, Sentry release |
| `LOG_LEVEL` | — | `INFO` | |

`backend/.env.example` lists every variable with a placeholder (§1.9). The service refuses to start in `production` if any required value is missing or still a placeholder. The search bias (`SEARCH_FOCUS_LAT`, `SEARCH_FOCUS_LON`, `SEARCH_BBOX`) is a set of module constants in `config.py`, deliberately **not** environment variables (§16.13).

### 20.13 Done when (F22, F23, F26)
- [ ] `cron.job_run_details` shows `fordcast-tick` runs every 5 min; `private.ingest_runs` has `ok` rows; a second call in the same slot returns `{"accepted": false}`.
- [ ] `snapshots/current.json` updates every tick, with public `cache-control: max-age=30`, and the app reads it with the Render service stopped.
- [ ] A deliberately failing tick (`TICK_FAIL_TEST=1` in development) triggers healthchecks `/fail`, a Sentry issue and a phone alert.
- [ ] Production is seeded with `make seed-prod`, exactly one `model_versions` row is live (the baseline rule unless `make model-live` switched it), and a manual tick fills `risk_current` for every active crossing (§20.4 step 11).
- [ ] **Live-run gate (same as A §6.1):** ≥ 6 **continuous** hours of successful ticks (healthchecks history) before the Day-7 preview build, and ≥ 48 h of continuous successful ticks before submission (Day 11), with Render on Starter from Oct 20. Link both in the devlog.

---

## §21. Database schema (Supabase Postgres + PostGIS)

Four migrations (§5): `0001_init.sql` (types, tables, indexes, functions), `0002_rls.sql` (RLS, policies, grants), `0003_realtime.sql` (publication), `0004_cron.sql` (tick + retention). The research validated the core DDL, the RLS block, the change-only upsert and the lease on a throwaway PostgreSQL 16 (with `geography` stubbed): an identical upsert wrote **0 rows**, and anon got "new row violates row-level security policy" on INSERT and "permission denied for schema private" `[V: code]`. Re-run those checks as tests (§21.9).

### 21.1 `supabase/migrations/0001_init.sql`
```sql
-- FordCast 0001: extensions, types, tables, indexes, functions
create extension if not exists postgis with schema extensions;
create schema if not exists private;

-- Enum declaration order IS the severity order (§3.2): no_rise < unknown < watch < avoid < closed.
create type public.risk_state     as enum ('no_rise', 'unknown', 'watch', 'avoid', 'closed');
create type public.official_state as enum ('open', 'caution', 'closed', 'unknown');
create type public.link_relation  as enum ('upstream', 'at_site', 'nearest_baseline');
create type public.snap_status    as enum ('auto', 'verified', 'override', 'rejected');
create type public.crossing_tier  as enum ('A', 'B', 'C');
create type public.truth_quality  as enum ('sensor', 'gauge', 'impact_statement', 'proxy');

-- ───────────── reference data ─────────────
create table public.gauges (
  id               text primary key check (id ~ '^[A-Z]{2,6}-[0-9A-Za-z]{3,20}$'),  -- 'USGS-08158700'
  agency           text not null default 'USGS',
  name             text not null,
  geom             extensions.geography(Point, 4326) not null,
  comid            bigint,
  nws_lid          text,
  drainage_km2     real,
  datum_ft         real,
  datum_name       text,
  param_codes      text[] not null default '{00065}',
  stale_after_min  smallint not null default 60 check (stale_after_min between 15 and 120),
  latency_p75_min  smallint,
  latency_p90_min  smallint,
  latency_n        integer not null default 0,
  is_active        boolean not null default true,
  updated_at       timestamptz not null default now()
);
create index gauges_geom_gix on public.gauges using gist (geom);

create table public.crossings (
  id                 text primary key check (id ~ '^[a-z0-9-]{3,40}$'),
  name               text not null,
  name_es            text,
  name_spoken_en     text,
  name_spoken_es     text,
  road               text,
  creek              text,
  jurisdiction       text not null,
  geom               extensions.geography(Point, 4326) not null,
  comid              bigint,
  snap               public.snap_status not null default 'auto',
  snap_dist_m        real,
  tier               public.crossing_tier not null default 'C',
  target_gauge_id    text references public.gauges(id),
  overtop_stage_ft   real,
  truth_quality      public.truth_quality,
  truth_source       text,
  source             text not null,
  source_refs        jsonb not null default '[]'::jsonb,
  divided_road       boolean not null default false,
  is_active          boolean not null default true,
  is_test            boolean not null default false,
  inventory_version  text not null,
  updated_at         timestamptz not null default now(),
  constraint tier_a_has_truth check (tier <> 'A' or (overtop_stage_ft is not null and truth_quality is not null
                                                    and truth_quality <> 'proxy'))   -- proxy ⇒ tier B (§17.6)
);
create index crossings_geom_gix on public.crossings using gist (geom);

create table public.model_versions (
  version     text primary key,                      -- 'rule-2026.10.18' | 'rule-loso-halloween-2013' | 'ml-…'
  kind        text not null check (kind in ('rule', 'ml')),
  scope       text not null default 'live' check (scope in ('live', 'loso')),
  is_live     boolean not null default false,
  git_sha     text not null,
  card        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create unique index model_versions_one_live on public.model_versions (is_live) where is_live;

create table public.crossing_gauge_links (
  crossing_id        text not null references public.crossings(id) on delete cascade,
  gauge_id           text not null references public.gauges(id) on delete cascade,
  model_version      text not null references public.model_versions(version) on delete cascade,
  relation           public.link_relation not null,
  is_primary         boolean not null default false,
  channel_dist_km    real,
  euclid_km          real,
  lag_min            real,
  lag_p25_min        real,
  lag_p75_min        real,
  xcorr_r            real,
  n_storms           smallint,
  celerity_ms        real,
  baseline_stage_ft  real,
  trigger_stage_ft   real,
  watch_stage_ft     real,
  min_rise_ft_30m    real not null default 0.10,
  train_csi          real,
  params_source      text not null default 'learned' check (params_source in ('learned', 'transferred', 'manual')),
  needs_review       boolean not null default false,
  review_note        text,
  flowline           extensions.geography(LineString, 4326),
  primary key (crossing_id, gauge_id, model_version)
);
create index cgl_gauge_idx on public.crossing_gauge_links (gauge_id);
create unique index cgl_one_primary on public.crossing_gauge_links (crossing_id, model_version) where is_primary;

-- ───────────── observations ─────────────
create table public.readings (
  gauge_id     text not null references public.gauges(id),
  param_code   char(5) not null,                     -- '00065' gage height ft · '00060' discharge cfs
  obs_time     timestamptz not null,
  value        real not null,
  approval     char(1) not null default 'P' check (approval in ('P', 'A')),
  qualifiers   text[],
  received_at  timestamptz not null default now(),
  ingest       char(1) not null default 'L' check (ingest in ('L', 'B')),   -- live | backfill
  primary key (gauge_id, param_code, obs_time)
);
create index readings_obs_brin on public.readings using brin (obs_time);

-- ───────────── risk ─────────────
create table public.risk_current (
  crossing_id       text primary key references public.crossings(id) on delete cascade,
  state             public.risk_state not null,
  window_lo_min     smallint check (window_lo_min in (0, 15, 30, 60)),
  window_hi_min     smallint check (window_hi_min in (15, 30, 60, 90)),
  p30 real, p60 real, p90 real,
  reasons           jsonb not null default '[]'::jsonb,
  reason_codes      text[] not null default '{}',     -- compared for change detection (numbers are not)
  held              boolean not null default false,
  closed_source     text check (closed_source in ('official', 'sensor')),
  official          public.official_state not null default 'unknown',
  official_source   text,
  official_as_of    timestamptz,
  last_known_state  public.risk_state,
  last_known_at     timestamptz,
  latest_obs_at     timestamptz,
  changed_at        timestamptz not null,
  evaluated_at      timestamptz not null,
  model_version     text not null,
  seq               bigint not null,
  constraint window_pair check ((window_lo_min is null) = (window_hi_min is null)
                                and (window_lo_min is null or window_hi_min > window_lo_min))
);

create table public.risk_transitions (
  id             bigserial primary key,
  crossing_id    text not null references public.crossings(id) on delete cascade,
  from_state     public.risk_state not null,
  to_state       public.risk_state not null,
  kind           text not null check (kind in ('escalation', 'deescalation')),
  at             timestamptz not null,
  window_lo_min  smallint,
  window_hi_min  smallint,
  reasons        jsonb not null default '[]'::jsonb,
  closed_source  text,
  model_version  text not null,
  seq            bigint not null,
  pushed         boolean not null default false
);
create index rt_crossing_at_idx on public.risk_transitions (crossing_id, at desc);
create index rt_unpushed_idx on public.risk_transitions (at) where not pushed;

create table public.risk_history (                   -- changes + hourly keyframes
  crossing_id  text not null references public.crossings(id) on delete cascade,
  as_of        timestamptz not null,
  state        public.risk_state not null,
  window_lo_min smallint, window_hi_min smallint,
  p30 real, p60 real, p90 real,
  kind         text not null check (kind in ('change', 'keyframe')),
  primary key (crossing_id, as_of)
);

create table public.official_status (
  crossing_id        text not null references public.crossings(id) on delete cascade,
  source             text not null check (source in ('manual', 'atxfloods', 'travis')),
  status             public.official_state not null,
  source_updated_at  timestamptz,
  fetched_at         timestamptz not null default now(),
  expires_at         timestamptz,                    -- required for 'manual'
  note               text,
  set_by             text,                           -- 'cli:<who>' for manual entries
  primary key (crossing_id, source),
  constraint manual_expires check (source <> 'manual' or expires_at is not null)
);

-- ───────────── NWS / rain (Stretch) ─────────────
create table public.nws_gauges (
  lid          text primary key,
  gauge_id     text references public.gauges(id),
  name         text,
  reach_id     text,
  categories   jsonb not null default '{}'::jsonb,   -- {action:{stage,flow}, minor:…, moderate:…, major:…}
  impacts      jsonb not null default '[]'::jsonb,   -- [{stage, statement}]
  stage_units  text, flow_units text,
  fetched_at   timestamptz not null default now()
);

create table public.nws_alerts (
  id            text primary key,                    -- CAP id (NOT VTEC)
  event         text not null,
  message_type  text not null check (message_type in ('Alert', 'Update', 'Cancel')),
  sent          timestamptz not null,
  effective     timestamptz,
  expires       timestamptz,
  ends          timestamptz,
  severity      text,
  damage_threat text,                                -- 'CONSIDERABLE' | 'CATASTROPHIC' | null
  is_emergency  boolean not null default false,
  ugc           text[] not null default '{}',
  references_ids text[] not null default '{}',
  superseded    boolean not null default false,
  headline_en   text,
  geom          extensions.geography(MultiPolygon, 4326),
  fetched_at    timestamptz not null default now()
);
create index nws_alerts_active_idx on public.nws_alerts (expires) where not superseded;

create table public.basin_rain (
  crossing_id  text not null references public.crossings(id) on delete cascade,
  valid_at     timestamptz not null,
  source       text not null check (source in ('mrms_radaronly', 'mrms_pass2', 'open_meteo')),
  qpe_1h_in    real, qpe_3h_in real, qpe_6h_in real,
  primary key (crossing_id, valid_at, source)
);

-- ───────────── replay catalog, truth, config ─────────────
create table public.storms (
  id                text primary key check (id ~ '^[a-z0-9-]{3,40}$'),
  name_en           text not null,
  name_es           text not null,
  start_time        timestamptz not null,
  end_time          timestamptz not null,
  description_en    text, description_es text,
  timeline_path     text not null,                   -- 'replays/halloween-2013.v1.<sha12>.json.gz'
  timeline_sha256   text not null,                   -- sha256 of the uncompressed canonical JSON (app integrity)
  content_sha256    text not null,                   -- same without the pipeline block (CI golden)
  file_sha256       text not null,                   -- sha256 of the .gz (Storage path)
  timeline_bytes    integer not null,
  metrics           jsonb not null default '{}'::jsonb,
  model_version     text not null,
  pipeline_git_sha  text not null,
  is_featured       boolean not null default false,
  sort_order        smallint not null default 0
);

create table public.ground_truth_events (            -- eval only: NO public policy (§21.2)
  id            bigserial primary key,
  crossing_id   text not null references public.crossings(id) on delete cascade,
  storm_id      text references public.storms(id),
  onset         timestamptz not null,
  ended         timestamptz,
  quality       public.truth_quality not null,
  censored      boolean not null default false,
  notes         text
);

create table public.app_config (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ───────────── PRIVATE (service role only; never exposed) ─────────────
create table private.devices (
  id               uuid primary key default gen_random_uuid(),
  secret_sha256    text not null,                    -- sha256(hex) of the random 32-byte device secret
  expo_push_token  text unique check (expo_push_token ~ '^Expo(nent)?PushToken\[.+\]$'),
  platform         text not null check (platform in ('ios', 'android')),
  locale           text not null default 'en' check (locale in ('en', 'es')),
  tz               text not null default 'America/Chicago',
  alerts_enabled   boolean not null default true,    -- Avoid/Closed pushes
  watch_alerts     boolean not null default false,   -- §3.8: Watch pushes are opt-in (default OFF)
  updates_enabled  boolean not null default true,    -- de-escalation updates
  quiet_start_min  smallint check (quiet_start_min between 0 and 1439),   -- minutes after local midnight
  quiet_end_min    smallint check (quiet_end_min between 0 and 1439),
  muted_until      jsonb not null default '{}'::jsonb,  -- {crossing_id: ISO} from "Mute 1 h" (Stretch)
  app_version      text,
  push_failures    smallint not null default 0,
  created_at       timestamptz not null default now(),
  last_seen_at     timestamptz not null default now()
);

create table private.device_subscriptions (           -- explicit crossing IDs only; NO coordinates, radius or place anywhere
  device_id    uuid not null references private.devices(id) on delete cascade,
  crossing_id  text not null references public.crossings(id) on delete cascade,
  reason       text not null check (reason in ('saved_route', 'saved_place', 'starred')),   -- §23.1; computed on the phone
  want_watch   boolean not null default false,        -- per-subscription Watch opt-in (§3.8; default off)
  created_at   timestamptz not null default now(),
  primary key (device_id, crossing_id, reason)
);
create index ds_crossing_idx on private.device_subscriptions (crossing_id);

create table private.alerts_sent (
  id                  bigserial primary key,
  device_id           uuid not null references private.devices(id) on delete cascade,
  crossing_id         text,                           -- null for summaries
  transition_id       bigint references public.risk_transitions(id) on delete set null,
  kind                text not null check (kind in ('escalation', 'deescalation', 'summary', 'unknown', 'test')),
  state               public.risk_state,
  sent_at             timestamptz not null default now(),
  ticket_id           text,
  ticket_status       text,                           -- 'ok' | 'error:<code>'
  receipt_status      text,                           -- 'ok' | '<error code>'
  receipt_checked_at  timestamptz,
  unique (device_id, transition_id)                   -- dedupe; NULLs (summaries/tests) don't collide
);
create index as_device_sent_idx on private.alerts_sent (device_id, sent_at desc);
create index as_receipts_idx on private.alerts_sent (sent_at) where receipt_status is null and ticket_id is not null;

create table private.ingest_runs (
  id                        bigserial primary key,
  source                    text not null check (source in ('pg_cron', 'gha', 'manual')),
  slot                      timestamptz,
  started_at                timestamptz not null default now(),
  finished_at               timestamptz,
  status                    text not null default 'running' check (status in ('running', 'ok', 'error')),
  n_requests                smallint,
  n_gauges_ok               smallint,
  n_gauges_stale            smallint,
  n_transitions             smallint,
  n_push                    smallint,
  usgs_ratelimit_remaining  integer,
  data_status               text,
  durations_ms              jsonb,
  error                     text
);

create table private.tick_lease (
  id            smallint primary key default 1 check (id = 1),
  holder        text,
  lease_until   timestamptz not null default 'epoch',
  slot          timestamptz,
  last_ok_at    timestamptz,
  last_ok_slot  timestamptz,
  seq           bigint not null default 0              -- snapshot/realtime sequence (ETag)
);
insert into private.tick_lease default values;

create table private.risk_tracker (                   -- hysteresis; updated every tick; NOT in Realtime
  crossing_id       text primary key references public.crossings(id) on delete cascade,
  state             public.risk_state not null,
  since             timestamptz not null,
  calm_ticks        smallint not null default 0,
  held              boolean not null default false,
  last_known_state  public.risk_state,
  last_known_at     timestamptz,
  closed_source     text,
  trigger_gauge_id  text,
  window_lo_min     smallint,
  window_hi_min     smallint,
  updated_at        timestamptz not null default now()
);

create table private.reports (                        -- ROADMAP F115 (crowd reports); unused until a privacy review
  id           bigserial primary key,
  device_id    uuid references private.devices(id) on delete set null,
  crossing_id  text references public.crossings(id),
  kind         text check (kind in ('water_over_road', 'barricade', 'debris')),
  created_at   timestamptz not null default now(),
  status       text not null default 'pending',
  trust        real
);

-- ───────────── server-side helper (batch jobs only; not exposed to anon) ─────────────
create or replace function public.crossings_near_route(route_geojson text, buffer_m integer)
returns table (crossing_id text, frac double precision)
language sql stable security invoker set search_path = '' as $$
  with r as (select extensions.st_geomfromgeojson(route_geojson)::extensions.geography as g)
  select c.id,
         extensions.st_linelocatepoint(r.g::extensions.geometry, c.geom::extensions.geometry)
  from public.crossings c cross join r
  where c.is_active and not c.is_test and extensions.st_dwithin(c.geom, r.g, buffer_m)
  order by 2;
$$;
```

### 21.2 `supabase/migrations/0002_rls.sql`
```sql
-- Every public table: RLS on; read-only policies; NO insert/update/delete policies → only the server writes.
alter table public.gauges               enable row level security;
alter table public.crossings            enable row level security;
alter table public.model_versions       enable row level security;
alter table public.crossing_gauge_links enable row level security;
alter table public.readings             enable row level security;
alter table public.risk_current         enable row level security;
alter table public.risk_transitions     enable row level security;
alter table public.risk_history         enable row level security;
alter table public.official_status      enable row level security;
alter table public.nws_gauges           enable row level security;
alter table public.nws_alerts           enable row level security;
alter table public.basin_rain           enable row level security;
alter table public.storms               enable row level security;
alter table public.ground_truth_events  enable row level security;   -- no policy: eval only
alter table public.app_config           enable row level security;

create policy read_all     on public.gauges               for select to anon, authenticated using (is_active);
create policy read_public  on public.crossings            for select to anon, authenticated using (is_active and not is_test);
create policy read_all     on public.model_versions       for select to anon, authenticated using (true);
create policy read_public  on public.crossing_gauge_links for select to anon, authenticated
  using (exists (select 1 from public.model_versions m where m.version = model_version and m.is_live)
         and exists (select 1 from public.crossings c where c.id = crossing_id and c.is_active and not c.is_test));
create policy read_recent  on public.readings             for select to anon, authenticated
  using (obs_time > now() - interval '72 hours');
create policy read_public  on public.risk_current         for select to anon, authenticated
  using (exists (select 1 from public.crossings c where c.id = crossing_id and c.is_active and not c.is_test));
create policy read_recent  on public.risk_transitions     for select to anon, authenticated
  using (at > now() - interval '7 days'
         and exists (select 1 from public.crossings c where c.id = crossing_id and not c.is_test));
create policy read_recent  on public.risk_history         for select to anon, authenticated
  using (as_of > now() - interval '7 days'
         and exists (select 1 from public.crossings c where c.id = crossing_id and not c.is_test));
create policy read_public  on public.official_status      for select to anon, authenticated
  using (exists (select 1 from public.crossings c where c.id = crossing_id and not c.is_test));
create policy read_all     on public.nws_gauges           for select to anon, authenticated using (true);
create policy read_active  on public.nws_alerts           for select to anon, authenticated
  using (not superseded and (expires is null or expires > now() - interval '1 day'));
create policy read_recent  on public.basin_rain           for select to anon, authenticated
  using (valid_at > now() - interval '72 hours');
create policy read_all     on public.storms               for select to anon, authenticated using (true);
create policy read_public  on public.app_config           for select to anon, authenticated
  using (key in ('banner', 'min_app_version', 'demo_mode_default', 'kill_switch_push', 'featured_storm'));

-- private schema: invisible to API roles
revoke all on schema private from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all sequences in schema private from public, anon, authenticated;
alter default privileges in schema private revoke all on tables from public, anon, authenticated;

-- helper RPC is server-only
revoke execute on function public.crossings_near_route(text, integer) from public, anon, authenticated;
```
- The server connects as the database owner through the pooler (bypassing RLS) for writes; Storage and admin calls use `sb_secret_`. Nothing client-side can write.
- Realtime `postgres_changes` applies the subscriber's RLS, so test crossings never reach phones.

### 21.3 `supabase/migrations/0003_realtime.sql`
```sql
-- Supabase creates the 'supabase_realtime' publication by default (VERIFY: select * from pg_publication;).
alter publication supabase_realtime add table public.risk_current;
```
**MVP channel (client, §28):** `supabase.channel('risk').on('postgres_changes', {event: '*', schema: 'public', table: 'risk_current'}, …)` `[V: realtime-js README]`. On reconnect, `CHANNEL_ERROR` or `TIMED_OUT`, the client refetches the snapshot: Realtime is a hint, and the snapshot is the truth.
**Scale-up runner-up (not MVP):** broadcast from DB via a trigger calling `realtime.send(payload, event, topic, private)` `[U signature]` on topic `risk:all`. Private channels can replay missed messages (`replay: {since, limit ≤ 25}`) `[V]`. Use it only if concurrent clients exceed about 150.

### 21.4 `supabase/migrations/0004_cron.sql`
```sql
-- Requires: Cron integration (pg_cron) + pg_net enabled (Dashboard), Vault secrets 'tick_url' and 'tick_secret' created (§20.4).
create extension if not exists pg_net with schema extensions;   -- VERIFY: may already be enabled via Dashboard

select cron.schedule('fordcast-tick', '*/5 * * * *', $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'tick_url'),
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'X-Tick-Secret', (select decrypted_secret from vault.decrypted_secrets where name = 'tick_secret')),
    body    := jsonb_build_object('scheduled_at', now()),
    timeout_milliseconds := 10000);
$$);   -- named args per Supabase pg_net docs [U exact defaults]; VERIFY one manual run in the SQL editor

-- Retention (off-minutes, nightly UTC)
select cron.schedule('retention-readings',     '17 3 * * *', $$delete from public.readings where obs_time < now() - interval '45 days'$$);
select cron.schedule('retention-history',      '27 3 * * *', $$delete from public.risk_history where as_of < now() - interval '60 days'$$);
select cron.schedule('retention-transitions',  '29 3 * * *', $$delete from public.risk_transitions where at < now() - interval '180 days'$$);
select cron.schedule('retention-devices',      '37 3 * * *', $$delete from private.devices where last_seen_at < now() - interval '90 days'$$);
select cron.schedule('retention-alerts',       '47 3 * * *', $$delete from private.alerts_sent where sent_at < now() - interval '30 days'$$);
select cron.schedule('retention-runs',         '49 3 * * *', $$delete from private.ingest_runs where started_at < now() - interval '30 days'$$);
select cron.schedule('retention-nws',          '51 3 * * *', $$delete from public.nws_alerts where coalesce(ends, expires, sent) < now() - interval '7 days'$$);
select cron.schedule('retention-rain',         '53 3 * * *', $$delete from public.basin_rain where valid_at < now() - interval '14 days'$$);
select cron.schedule('retention-cron-log',     '57 3 * * *', $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$);
select cron.schedule('retention-orphans',      '41 3 * * *', $$delete from private.devices d where d.expo_push_token is null and d.created_at < now() - interval '7 days' and not exists (select 1 from private.device_subscriptions s where s.device_id = d.id)$$);
```
`cron.schedule` with an existing job name replaces that job, so re-applying is safe (VERIFY on the installed pg_cron version; fallback: `select cron.unschedule('<name>')` first).

### 21.5 `supabase/seed.sql` (generated, never hand-edited)
`uv run python -m fordcast seed-sql > ../supabase/seed.sql` (from `backend/`; part of `make data` and `make seed`) writes, from the committed data files: `gauges` (from `data/seed/gauges.geojson`), `crossings` (from `data/seed/crossings.geojson`) **plus the test crossing**, `model_versions` (the live rule version + every `rule-loso-*`), `crossing_gauge_links` (from `data/links/crossing_gauge_links.csv` with flowlines as WKT), `storms` (from `data/replays/index.json`), `nws_gauges`, and `app_config` defaults (§20.9; `featured_storm` = `docs/results/results.json` `hero.storm_id`). Use `insert … on conflict (…) do update` so re-seeding is idempotent. The output is deterministic (rows sorted by key, no timestamps), so a second run produces no diff.
```sql
insert into public.crossings (id, name, jurisdiction, geom, tier, source, is_test, inventory_version)
values ('test-0001', 'FordCast Test Crossing', 'FordCast test', 'SRID=4326;POINT(-97.7431 30.2672)', 'C', 'manual', true, 'test')
on conflict (id) do nothing;

-- model_versions: upsert metadata but NEVER touch is_live on conflict (a re-seed must not undo `make model-live`)
insert into public.model_versions (version, kind, scope, is_live, git_sha, card)
values ('rule-2026.10.18', 'rule', 'live', false, 'abc1234', '{}'::jsonb)
on conflict (version) do update set git_sha = excluded.git_sha, card = excluded.card;
-- the baseline rule is live by default, but only when nothing is live yet
update public.model_versions set is_live = true
 where version = 'rule-2026.10.18'
   and not exists (select 1 from public.model_versions where is_live);
```
The test crossing exists so a real end-to-end escalation → push can be tested (§22.8, §23.9) **without** showing a fake closure on any real crossing.

**Applying it:**
- **Local** (Docker): `make seed` regenerates `seed.sql` and runs `npx --yes supabase@2.120.0 db reset` (migrations + seed).
- **Production:** `supabase db push` applies migrations only. The seed goes in with **`make seed-prod`** (A §5.2): `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -1 -f supabase/seed.sql`, one transaction, using the Supabase session pooler URL (port 5432). It writes production data, so tell the human first (A §1.7). Procedure and verification: §20.4 step 11.
- **Switching the live model:** **`make model-live VERSION=<model_version>`** (A §5.2) runs `supabase/manual/set_model_live.sql`, which aborts if the version doesn't exist and leaves exactly one live row (the `model_versions_one_live` unique index also enforces this). `RiskModel`, the `crossing_gauge_links` RLS policy and the tick all read the live version, so run one manual tick afterwards.

### 21.6 Write-on-change (protects the Realtime quota) — step 8 of the tick, one transaction
```sql
-- (1) risk_current: write only when something a user would notice changed
insert into public.risk_current as rc (crossing_id, state, window_lo_min, window_hi_min, p30, p60, p90, reasons,
       reason_codes, held, closed_source, official, official_source, official_as_of, last_known_state, last_known_at,
       latest_obs_at, changed_at, evaluated_at, model_version, seq)
values (%(crossing_id)s, %(state)s, %(lo)s, %(hi)s, %(p30)s, %(p60)s, %(p90)s, %(reasons)s, %(codes)s, %(held)s,
        %(closed_source)s, %(official)s, %(official_source)s, %(official_as_of)s, %(lk_state)s, %(lk_at)s,
        %(latest_obs_at)s, %(now)s, %(now)s, %(model_version)s, %(seq)s)
on conflict (crossing_id) do update set
  state = excluded.state, window_lo_min = excluded.window_lo_min, window_hi_min = excluded.window_hi_min,
  p30 = excluded.p30, p60 = excluded.p60, p90 = excluded.p90, reasons = excluded.reasons,
  reason_codes = excluded.reason_codes, held = excluded.held, closed_source = excluded.closed_source,
  official = excluded.official, official_source = excluded.official_source, official_as_of = excluded.official_as_of,
  last_known_state = excluded.last_known_state, last_known_at = excluded.last_known_at,
  latest_obs_at = excluded.latest_obs_at, changed_at = excluded.changed_at, evaluated_at = excluded.evaluated_at,
  model_version = excluded.model_version, seq = excluded.seq
where (rc.state, rc.window_lo_min, rc.window_hi_min, rc.official, rc.held, rc.reason_codes, rc.closed_source)
      is distinct from
      (excluded.state, excluded.window_lo_min, excluded.window_hi_min, excluded.official, excluded.held,
       excluded.reason_codes, excluded.closed_source);
-- (2) one risk_transitions row per state change (kind = 'escalation' if rank(to) > rank(from), else 'deescalation')
-- (3) risk_history: a 'change' row per state change + a 'keyframe' row per crossing at the first tick of each hour
-- (4) private.risk_tracker upsert for EVERY crossing (hysteresis memory; not published)
-- (5) update private.tick_lease set seq = seq + 1 where id = 1 returning seq   -- done first; used as %(seq)s
```
- Freshness (`evaluated_at`, gauge ages) travels in the **snapshot**, not in per-row updates. That is why most ticks write **0** `risk_current` rows.
- Batch with `executemany` (psycopg 3 pipelines them). One transaction per tick, so Realtime subscribers never see a half-applied tick.

### 21.7 Size budget (500 MB Free DB)

| Table | Volume | Size | Policy |
|---|---|---|---|
| `readings` | ~40 gauges × 96/day (stage only) ≈ 3,840 rows/day | 45 days ≈ 15–30 MB | keep 45 days; storm history lives in Parquet |
| `risk_history` | changes + hourly keyframes: 100 crossings × 24 × 60 d ≈ 144k rows | ≈ 17 MB | 60 days (every-tick rows would be ~100 MB/month ✗) |
| `risk_transitions` | storm-driven | < 5 MB | 180 days (live FAR audit) |
| `private.*`, reference tables | small | < 10 MB | §21.4 retention |
| **Total** | | **< 80 MB** | alarm at 300 MB (nightly size query in `ingest_runs`) |

### 21.8 Realtime, egress and Storage budgets (Free limits `[V]`)
- **Realtime:** 200 concurrent connections, 100 msgs/s, 2 M msgs/month. A naive "upsert all rows every tick" to 200 clients ≈ 121 M msgs/month (60× over). Change-only writes ≈ 150 changes per storm-day × clients; calm days ≈ 0. Judging-period usage (tens of devices) is far below the limits.
- **Egress:** 5 GB uncached + 5 GB cached per month. The snapshot is ~15–20 KB raw (≈ 4 KB gzipped) for ~100 crossings. VERIFY BEFORE USE (Day 6) that the Storage CDN serves it gzip-encoded (`content-encoding` in a public GET with `Accept-Encoding: gzip`). If it doesn't, keep foreground polling at 60 s and rely on Realtime; usage at judging scale is still far below quota. Keep the snapshot lean: reason codes and numbers, no names.
- **Storage:** 1 GB Free `[U exact]`. Replays (< 1 MB), snapshots (+ optional hourly archive ≈ 10 MB/month), storm Parquet files (a few MB each).

### 21.9 Schema tests (`backend/tests/api/test_db_contract.py`, against local Supabase in CI)
- An anon (publishable key) `insert` into `crossings` fails with an RLS error; an anon `select` on `private.devices` fails with "permission denied".
- An anon `select` on `crossings` doesn't return `test-0001`; `ground_truth_events` returns 0 rows to anon.
- An identical `risk_current` upsert writes 0 rows (`cur.rowcount == 0`); a changed state writes 1.
- A concurrent lease acquire for the same slot returns 0 rows; a new slot acquires.
- The tier-A check constraint rejects a tier-A crossing without an overtop stage, and a tier-A crossing whose `truth_quality` is `proxy`.
- `device_subscriptions.reason` rejects anything but `saved_route`, `saved_place`, `starred`, and the table has no coordinate, radius or place column (a schema test lists the columns).
- Applying `supabase/seed.sql` twice leaves the row counts unchanged and exactly one `model_versions` row live; after `set_model_live.sql` with another version, re-applying the seed does not change which version is live.
- Enum order: `select 'avoid'::public.risk_state > 'watch'::public.risk_state` is true.

---

## §22. REST API (`/v1`, FastAPI)

### 22.1 Conventions
- JSON via `ORJSONResponse`, field names **snake_case**, times ISO-8601 UTC with `Z`, coordinates `[lon, lat]` (GeoJSON order). The mobile client maps these names exactly (§28, §32).
- Every response body carries `as_of` (when the underlying data was computed), `data_status` where relevant, and `disclaimer_key: "SUPPLEMENTARY_TOOL"` on any risk-bearing response (§3.9).
- **Errors** use RFC 9457 `application/problem+json`: `{"type": "about:blank", "title": "Not Found", "status": 404, "detail": "…", "code": "not_found"}`. Codes: `validation_error`, `not_found`, `unauthorized`, `rate_limited`, `payload_too_large`, `upstream_unavailable`, `routing_unavailable`, `quota_exceeded`, `real_crossing_requires_confirmation`.
- Versioning: the path (`/v1`) plus `schema` strings in documents (`fordcast.snapshot.v1`, `fordcast.replay.v1`, `fordcast.results.v1`).
- **Caching:** `ETag = "<seq>"` on risk endpoints and `If-None-Match` → **304**. Cache-Control per endpoint below.
- OpenAPI at `/docs` (internal routes excluded).
- Rate limiting via `slowapi` (in-memory, single instance), keyed on the client IP from `X-Forwarded-For` (uvicorn `--proxy-headers`). IPs are kept in memory for limiting only and never logged (§24.4).

### 22.2 Endpoints

| Method & path | Purpose | Tier | Cache-Control | Limit/IP |
|---|---|---|---|---|
| `GET /v1/health` | liveness + deps | MVP | `no-store` | 120/min |
| `GET /v1/meta/freshness` | per-gauge ages, sources, ticks | MVP | `max-age=30` | 60/min |
| `GET /v1/risk/current` | **the snapshot** (identical to Storage) | MVP | `public, max-age=30, stale-while-revalidate=120` | 120/min |
| `GET /v1/crossings` | list (GeoJSON or JSON) + current state | MVP | `max-age=30` | 60/min |
| `GET /v1/crossings/{id}` | detail: links, τ, triggers, official, NWS categories | MVP | `max-age=30` | 60/min |
| `GET /v1/crossings/{id}/history` | state timeline (≤ 168 h) | Stretch | `max-age=60` | 30/min |
| `GET /v1/gauges/{id}/series` | hydrograph data (≤ 72 h) | MVP | `max-age=60` | 60/min |
| `GET /v1/replays` | storm catalog | MVP | `max-age=3600` | 60/min |
| `GET /v1/replays/{id}` | meta + metrics + `timeline_url` + sha | MVP | `max-age=3600` | 60/min |
| `GET /v1/replays/{id}/timeline` | 302 → content-hashed Storage URL | MVP | `max-age=3600` | 30/min |
| `GET /v1/results` | `results.json` | Stretch | `max-age=3600` | 30/min |
| `GET /v1/styles/fordcast-night.json` | map style (F29) | Stretch | `max-age=86400` | 60/min |
| `POST /v1/route` | baseline route + crossings on it + detour + via points | Stretch | `no-store` | 10/min |
| `POST /v1/route/check` | crossings along a client-supplied line | Stretch | `no-store` | 20/min |
| `GET /v1/search` | place autocomplete (proxy) | Stretch | `no-store` | 60/min |
| `GET /v1/geocode/reverse` | reverse geocode (proxy) | Stretch | `no-store` | 30/min |
| `POST /v1/devices` | register → `device_id` + `device_secret` (once) | MVP | `no-store` | 5/min |
| `GET /v1/devices/{id}` | current settings (auth) | MVP | `no-store` | 20/min |
| `PUT /v1/devices/{id}` | token, locale, toggles, quiet hours (auth) | MVP | `no-store` | 20/min |
| `PUT /v1/devices/{id}/subscriptions` | replace the crossing-ID set (auth) | MVP | `no-store` | 20/min |
| `PUT /v1/devices/{id}/mutes` | mute a crossing for 1 h (auth) | Stretch | `no-store` | 20/min |
| `DELETE /v1/devices/{id}` | **"Delete my alert data"** (cascade) (auth) | MVP | `no-store` | 5/min |
| `POST /internal/tick` | the 5-min job (`X-Tick-Secret`) | MVP | `no-store` | — |
| `POST /internal/official` | manual official status (`X-Admin-Secret`) | MVP | `no-store` | — |
| `POST /internal/push/test` | test push to one device (`X-Admin-Secret`) | MVP | `no-store` | — |

Internal endpoints return **404** (not 401) when the secret is missing or wrong, and are excluded from OpenAPI.

### 22.3 The snapshot — `fordcast.snapshot.v1` (`GET /v1/risk/current` = `snapshots/current.json`)
```json
{
  "schema": "fordcast.snapshot.v1",
  "as_of": "2026-10-14T18:05:00Z",
  "generated_at": "2026-10-14T18:05:41Z",
  "seq": 182734,
  "data_status": "live",
  "stale_after_s": 1200,
  "model": {"kind": "rule", "version": "rule-2026.10.18", "git_sha": "abc1234", "ml_enabled": false},
  "inventory_version": "inv-20261015",
  "disclaimer_key": "SUPPLEMENTARY_TOOL",
  "config": {"banner": null, "min_app_version": "1.0.0", "demo_mode_default": false, "featured_storm": "halloween-2013"},
  "counts": {"crossings": 74, "monitored": 52, "gauges_active": 31, "gauges_stale": 2},
  "nws_status": "disabled",
  "nws": [],
  "gauges": [
    {"id": "USGS-08158700", "obs_at": "2026-10-14T17:45:00Z", "value_ft": 4.12, "rise_ft_30m": 0.0, "stale": false}
  ],
  "crossings": [
    {"id": "atx-081", "state": "avoid", "tier": "A", "window": [15, 30], "held": false, "p": null,
     "official": {"status": "open", "source": "manual", "as_of": "2026-10-14T17:30:00Z"},
     "closed_source": null, "latest_obs_at": "2026-10-14T17:45:00Z", "changed_at": "2026-10-14T17:55:00Z",
     "last_known": null,
     "reasons": [{"code": "UPSTREAM_ABOVE_TRIGGER", "gauge_id": "USGS-08158700", "value_ft": 9.4,
                  "rise_ft_30m": 3.1, "tau_min": 40, "tau_lo_min": 30, "tau_hi_min": 45, "trigger_ft": 9.0,
                  "obs_at": "2026-10-14T17:45:00Z"}]},
    {"id": "tc-0310", "state": "unknown", "tier": "C", "window": null, "held": false, "p": null, "official": null,
     "closed_source": null, "latest_obs_at": null, "changed_at": "2026-10-01T00:00:00Z",
     "last_known": null, "reasons": [{"code": "NO_UPSTREAM_GAUGE"}]}
  ]
}
```
| Field | Rule |
|---|---|
| `as_of` | the tick slot. The client's 20-min rule uses it (corrected for clock skew with the HTTP `Date` header; §3.4). |
| `data_status` | `live \| degraded \| offline` (§18.9). A live snapshot never says `replay`. `GET /v1/risk/current` recomputes it at read time: if `now − as_of > 20 min`, it returns `offline`. |
| `crossings[]` | only active, non-test crossings, **sorted by id**. Static fields (name, road, coordinates) are **not** repeated; the app has them from the bundled seed or `/v1/crossings`. If `inventory_version` differs from the app's seed, the app fetches `/v1/crossings?format=geojson`. |
| `state` | wire enum (§3.2) |
| `window` | one of the 7 allowed windows (§18.6) or `null` |
| `p` | `[p30, p60, p90]` only when ML is live, else `null` |
| `official` | `null` or `{status: open\|caution\|closed\|unknown, source, as_of}`. `open` is displayed only as `official.no_closure` ("{{source}}: no closure reported", §3.7). |
| `last_known` | `{state, at}` when `state == "unknown"` and an earlier non-unknown state exists (§3.4) |
| `reasons` | §18.10; ≥ 1 for every state except `no_rise`. Codes and numbers only (the phone renders the §3.7 `reason.*` templates); travel time as `tau_lo_min`/`tau_hi_min` |
| `gauges[]` | active linked gauges: newest reading, 30-min rise, staleness (map gauge dots, mini-cards) |
| `nws` / `nws_status` | Stretch F17: `[{id, event, sent, expires, damage_threat, emergency, headline_en}]`; `disabled` until enabled |
| `config.banner` | `null` or `{"en": str, "es": str, "level": "info"\|"warning", "until": ISO\|null}`. One snapshot serves both languages, so the banner carries both (§20.9). Client zod (D §28.5): `z.object({ en, es, level: z.enum(['info','warning']), until: Iso.nullable() }).nullable()`. |

- **Nullable fields are always present** (value `null`), never omitted. Client schemas use `.nullable()`, not `.optional()`.
- Size target: ≤ 10 KB gzipped (§7.4). Validation: `docs/schemas/snapshot.v1.example.json` passes the pydantic model (`fordcast/snapshot.py`) and the app's zod schema.

### 22.4 Read endpoints (details)
- **`GET /v1/health`** → `200 {"status": "ok"|"degraded", "version": "0.1.0", "git_sha": "…", "db": "ok"|"down", "last_tick_ok_at": "…", "data_status": "live"}`. Always 200 (so Render's health check doesn't restart the service on a DB blip). `degraded` when the DB is unreachable or the last OK tick is > 20 min old. UptimeRobot alarms on anything but `"status":"ok"`.
- **`GET /v1/meta/freshness`** → `{"as_of", "data_status", "last_tick_ok_at", "ticks_last_hour": 12, "gauges": [{"id", "latest_obs_at", "age_min", "stale", "stale_after_min", "latency_p75_min"}], "sources": {"usgs": {"status": "ok"|"degraded"|"down", "last_ok_at"}, "official": {…, "kind": "manual"|"atxfloods"}, "nws": {…}, "push": {"last_send_at", "receipt_errors_24h"}}}`. Feeds the Data sources status screen (F105).
- **`GET /v1/risk/current`** → the last snapshot document held in memory (reloaded from Storage `current.json` on cold start), with `data_status` recomputed at read time. ETag/304.
- **`GET /v1/crossings?bbox=minLon,minLat,maxLon,maxLat&state=avoid,closed&tier=A,B&format=geojson|json`** → GeoJSON `FeatureCollection` whose properties are the §17.2 static fields plus `state, window, tier, changed_at` (or a JSON array with `format=json`). Header `X-Inventory-Version`. `bbox` must lie inside the Texas bbox (§22.9).
- **`GET /v1/crossings/{id}`** → `{id, name, name_es, name_spoken_en, name_spoken_es, road, creek, jurisdiction, lon, lat, tier, snap, overtop_stage_ft, truth_quality, risk: <snapshot crossing object>, official: {status, source, as_of, note?} | null, official_link: "https://www.atxfloods.com/crossings", links: [{gauge_id, name, relation, is_primary, channel_dist_km, tau_min, tau_p25, tau_p75, tau_lo_min, tau_hi_min, trigger_ft, watch_ft, params_source, nws_lid, nws_categories, latest: {obs_at, value_ft, rise_ft_30m, stale}}], model_version, sources: [{source, ref}], as_of, disclaimer_key}`. A test crossing returns 404. `tau_lo_min`/`tau_hi_min` are the §18.10 rounded range (null exactly when `tau_min` is null); the exact `tau_min`/`tau_p25`/`tau_p75` are for the debug screen only (F107).
- **`GET /v1/crossings/{id}/history?hours=24`** (1–168) → `{crossing_id, from, to, transitions: [{at, from, to, window, reasons}], keyframes: [{as_of, state}]}` (Stretch F47).
- **`GET /v1/gauges/{id}/series?param=00065&hours=6&crossing_id=atx-081`** (hours 1–72) → `{"gauge_id", "param": "00065", "unit": "ft", "points": [["2026-10-14T17:45:00Z", 4.12], …], "approval": "P", "stale": false, "stale_after_min": 30, "nws_categories": {…}|null, "trigger_ft": 9.0, "watch_ft": 6.4, "as_of"}`. `trigger_ft`/`watch_ft` appear only when `crossing_id` names a linked crossing.
- **`GET /v1/replays`** → the `index.json` shape (§19.14) from `public.storms`. **`GET /v1/replays/{id}`** → `{id, name_en, name_es, start, end, metrics, model_version, timeline_sha256, content_sha256, file_sha256, bytes_gz, timeline_url}`. **`/timeline`** → `302` to `{SUPABASE_URL}/storage/v1/object/public/fordcast-public/replays/<id>.v1.<sha12>.json.gz`.

### 22.5 `POST /v1/route` — route, crossings on it, detour, via points `[Stretch F49–F55]`

**Why through the backend:** it hides the ORS/Stadia keys, the server already knows current risk (clients can't lie or go stale), results can be cached, and the quota is pooled and rate-limited `[maps.md §6.2]`.

**Request**
```json
{"origin": [-97.7890, 30.3600], "destination": [-97.7431, 30.2672], "lang": "en", "want_detour": true,
 "replay_at": null, "storm_id": null}
```
`replay_at` (F54; ISO time) routes against Storm Replay states (§19.16). `storm_id` is optional: if omitted, the server picks the bundled storm whose window contains `replay_at`, or returns `422` if none does. Such a response has `mode: "replay"` and is never cached with live results. In a replay response `risk_as_of` = `replay_at`, `risk_seq` = `0` and `data_status` = `"live"` (the bundled timeline is complete; data gaps inside it already appear as `unknown` states). `data_status` never takes the value `replay`; `mode` carries that, and the app banners the result REPLAY (D §32.2).

**Response**
```json
{"mode": "live", "issued_at": "2026-10-14T18:07:12Z", "risk_as_of": "2026-10-14T18:05:00Z", "risk_seq": 182734,
 "data_status": "live",
 "baseline": {"geometry": {"type": "LineString", "coordinates": [[-97.789, 30.36], [-97.7431, 30.2672]]},
              "duration_s": 812, "distance_m": 10432},
 "crossings_on_baseline": [{"id": "atx-081", "state": "avoid", "window": [15, 30], "tier": "A", "along_m": 6120}],
 "verdict": "avoid", "monitored_count": 4, "unknown_count": 1,
 "detour": {"geometry": {"type": "LineString", "coordinates": [[-97.789, 30.36], [-97.7431, 30.2672]]},
            "duration_s": 1056, "distance_m": 12870, "avoided": ["atx-081"], "still_on_route": []},
 "detour_added_min": 4, "warning": null,
 "via_points": [[-97.7712, 30.3305]],
 "provider": "ors", "disclaimer_key": "SUPPLEMENTARY_TOOL"}
```
- `provider` is `ors` or `stadia`. `warning` is `null` or `"no_detour_found"`. The code name deliberately avoids the word "safe" (§3.12), and the UI shows `routing.no_detour`.

- **This section is the canonical route contract.** D §32.2 (zod schema, request body and every client call) mirrors these snake_case names exactly; replay requests use the flat `replay_at` + `storm_id` fields; the request model uses `extra="forbid"`, so any other field is a `422`.
- **Verdict** (§3.3): the highest-ranked state among `crossings_on_baseline` (rank `no_rise < unknown < watch < avoid < closed`), with `unknown_count` reported separately. A route is **never** called safe. With no crossings or only `no_rise`, the copy is `state.no_rise` route verdict ("No rise detected at {{c}} monitored crossings on this route", §3.7).
- **Algorithm** (`fordcast/api/routes/route.py` + `fordcast/routing.py`, agent-written, from maps.md §6.3):
  1. Baseline route with **no** polygons (ORS; 12 s timeout).
  2. `crossings_on(baseline)`: project to UTM 14N (EPSG:32614), keep crossings within **40 m** of the line (**60 m** if `divided_road`), and order them by `line.project(pt)` (= `along_m`). This is identical to the on-device Turf check (§32).
  3. If `want_detour` and any crossing **within 2 km of the baseline** is `avoid` or `closed` (`ROUTE_AVOID_STATES`; WATCH is shown but not routed around): build **75 m** circles (16 vertices, `buffer(75, quad_segs=4)` in UTM, back to WGS84) → `MultiPolygon` → ORS `options.avoid_polygons`.
  4. Re-check the detour with `crossings_on`. If an avoided crossing is still on it, retry once with **150 m** circles. If it is still there, return the detour with `warning: "no_detour_found"` and `detour.still_on_route: [...]`; the app shows `routing.no_detour` ("No detour found that avoids {{name}}. Wait or choose another destination.", §3.7).
  5. `detour_added_min = round((detour.duration − baseline.duration)/60)`.
  6. **Fallback:** ORS 403 (daily quota), 429 (minute quota), 5xx or timeout → the same request on **Stadia** (`exclude_polygons` = polygon rings; ≤ 100 vertices total, merging circles with `shapely.union_all` and simplifying if needed). Both failing → `503 routing_unavailable` (the app shows `routing.offline` copy).
  7. **Via points** for hand-off (`pick_via_points`, maps.md §8.2): sample the detour every 50 m; mark samples > 150 m from the baseline and > 400 m from every avoided crossing; take the longest divergent run; return its midpoint (or its quarter and three-quarter points if the run is ≥ 5 km); max 2 points.
  8. **Cache** in memory for 5 min, keyed by `(round(o, 4), round(d, 4), sorted avoided ids, mode, storm_id, replay_at)`. Never persisted, never logged.
- **Re-validation** is the client's job (§32): re-call when a crossing within 2 km of the active route changes state (Realtime), and every 5 min in Drive Mode. That stays well inside ORS's 2,000/day.
```python
# backend/fordcast/routing.py (excerpt; agent-written)
TO_M = Transformer.from_crs("EPSG:4326", "EPSG:32614", always_xy=True).transform
TO_LL = Transformer.from_crs("EPSG:32614", "EPSG:4326", always_xy=True).transform

def circle_ll(lon: float, lat: float, r_m: float) -> Polygon:
    return transform(TO_LL, transform(TO_M, Point(lon, lat)).buffer(r_m, quad_segs=4))   # 16 vertices

def ors_body(o: LonLat, d: LonLat, polys: list[Polygon]) -> dict:
    body = {"coordinates": [list(o), list(d)], "preference": "fastest", "units": "m",
            "instructions": False, "radiuses": [350, 350]}
    if polys:
        body["options"] = {"avoid_polygons": {"type": "MultiPolygon",
                                              "coordinates": [[list(p.exterior.coords)] for p in polys]}}
    return body

async def ors_route(client: httpx.AsyncClient, o: LonLat, d: LonLat, polys: list[Polygon]) -> RouteLeg:
    r = await client.post("https://api.openrouteservice.org/v2/directions/driving-car/geojson",
                          json=ors_body(o, d, polys), timeout=12,
                          headers={"Authorization": settings.ors_api_key.get_secret_value(),
                                   "Accept": "application/geo+json"})
    if r.status_code in (403, 429):
        raise QuotaError(r.status_code)
    r.raise_for_status()
    f = r.json()["features"][0]
    return RouteLeg(LineString(f["geometry"]["coordinates"]), f["properties"]["summary"])  # {distance, duration}
```
**Example raw ORS request** (tests + README):
```bash
curl -X POST https://api.openrouteservice.org/v2/directions/driving-car/geojson \
 -H "Authorization: $ORS_API_KEY" -H "Content-Type: application/json" \
 -d '{"coordinates":[[-97.7890,30.3600],[-97.7431,30.2672]],"preference":"fastest","units":"m",
      "options":{"avoid_polygons":{"type":"MultiPolygon","coordinates":[[[[-97.7845,30.3542],[-97.7838,30.3548],
      [-97.7830,30.3542],[-97.7838,30.3536],[-97.7845,30.3542]]]]}}}'
```

### 22.6 `POST /v1/route/check`, `GET /v1/search`, `GET /v1/geocode/reverse` `[Stretch]`
- **`POST /v1/route/check`** `{"geometry": LineString (≤ 500 points), "buffer_m": 40, "locale": "es"}` → `{"risk_as_of", "risk_seq", "data_status", "verdict", "monitored_count", "unknown_count", "hits": [{"id", "state", "window", "tier", "along_m"}], "disclaimer_key"}`. Used for saved routes whose geometry the phone already has. No external calls.
- **`GET /v1/search?q=<≥3 chars>&lang=en|es`** → `{"results": [{"id", "label", "sublabel", "lng_lat": [lon, lat], "source": "ors"|"photon"}]}` via ORS Pelias autocomplete → Photon fallback (§16.13) on 403/429/5xx. **Privacy: the request carries only the text and the language, never the user's location.** The server always applies the fixed Austin-area bias defined once in §16.13 (`SEARCH_FOCUS_LAT/LON` = 30.2672, −97.7431 as ORS `focus.point` / Photon `lat`/`lon`; `SEARCH_BBOX` = −98.6, 29.6, −97.0, 31.0 as ORS `boundary.rect` / Photon `bbox`). The query parameters are declared as a pydantic model with `extra="forbid"`, so a request that adds `lat`, `lon` or any other parameter gets `422 validation_error` (VERIFY BEFORE USE: FastAPI 0.142 supports query-parameter models with `extra="forbid"`; fallback: read `request.query_params` and reject unknown keys explicitly). In-memory cache keyed by `(normalized q, lang)`, TTL 24 h, ≤ 2,000 entries; never persisted or logged. Every user gets the same results for the same text, which is the point.
- **`GET /v1/geocode/reverse?lat=&lon=&lang=`** → `{"label", "sublabel", "source"}` via ORS `/geocode/reverse` → Photon reverse (VERIFY) → `404 not_found` (the app falls back to `expo-location.reverseGeocodeAsync`, §32). Only for a point the user **explicitly long-pressed on the map** (F52); the app never sends its own GPS fix here. Not cached, never logged (§22.9).

### 22.7 Devices (anonymous identity; crossing-ID subscriptions) `[MVP]` (F27)
- **`POST /v1/devices`** `{"platform": "android", "locale": "es", "app_version": "1.0.0", "expo_push_token": "ExponentPushToken[…]"|null}` → `201 {"device_id": "<uuid>", "device_secret": "<64 hex>"}`. The secret is returned **once**. The server stores only `sha256(secret)`. The app keeps it in `expo-secure-store` (§28; VERIFY there).
- **Auth** for all other device routes: `Authorization: Device <device_id>:<device_secret>`. The server compares `sha256(secret)` with `hmac.compare_digest`. Any mismatch or unknown id → `401 unauthorized` (never reveal existence). Every authenticated call updates `last_seen_at`.
- **`PUT /v1/devices/{id}`** (partial): `{"expo_push_token", "locale", "tz", "alerts_enabled", "watch_alerts", "updates_enabled", "quiet_start_min", "quiet_end_min", "app_version"}` → `204`. A new token replaces the old one; a token already registered to another device moves to this one (unique constraint, in one transaction).
- **`PUT /v1/devices/{id}/subscriptions`** `{"items": [{"crossing_id": "atx-081", "reason": "starred", "want_watch": false}, {"crossing_id": "tc-0123", "reason": "saved_route", "want_watch": true}]}` → `204`. **Replaces** the whole set (≤ 300 items). `reason ∈ {"saved_route", "saved_place", "starred"}` (any other value → `422`); `want_watch` is required per item (the client sends it; the device default is `false`, §3.8). Unknown crossing ids → `422`. The phone computes the IDs on the device (saved crossings → `starred` [MVP]; saved routes and the saved place's radius chip → `saved_route`/`saved_place` [Stretch F51], §23.1); the server never receives a radius, a place or a coordinate. **No coordinates are accepted anywhere**; the request model has no lat/lon fields, and extra fields are rejected (`extra="forbid"`). There is no location-derived ("near me") subscription: awareness while moving comes only from on-device geofences and local notifications (§30.3).
- **`PUT /v1/devices/{id}/mutes`** (Stretch F69) `{"crossing_id": "atx-081", "minutes": 60}` → `204` (≤ 24 h).
- **`GET /v1/devices/{id}`** → the current settings and subscription count (debug and settings sync).
- **`DELETE /v1/devices/{id}`** → `204`. Cascades subscriptions and alert history. Settings → "Delete my alert data" calls it, then clears local storage (F106).

### 22.8 Internal endpoints (admin)
- **`POST /internal/tick?source=pg_cron|gha|manual`** → §20.3.
- **`POST /internal/official`** (header `X-Admin-Secret`) `{"crossing_id": "test-0001", "status": "closed"|"caution"|"open"|"clear_entry", "note": "push test", "ttl_min": 30, "confirm_real": false}` → writes `official_status(source='manual', expires_at = now() + ttl_min (≤ 1440))`. For a **non-test** crossing it requires `confirm_real: true` and a `note` naming the real-world source (e.g. "City WPD phone confirmation 18:02"); otherwise it returns `409 real_crossing_requires_confirmation`. **Never use manual entries to fake a closure on a real crossing.** CLI equivalent: `uv run python -m fordcast official set test-0001 closed --note "push test" --ttl 30`.
- **`POST /internal/push/test`** (header `X-Admin-Secret`) `{"device_id": "<uuid>", "kind": "avoid"|"watch"|"update"}` → sends one **TEST**-labeled push (§23.9) and returns the ticket.

### 22.9 Validation, limits and non-logging rules (MUST)
- pydantic **strict** request models; `extra="forbid"` on all request bodies.
- IDs: crossing `^[a-z0-9-]{3,40}$`, gauge `^USGS-\d{8,15}$`, storm `^[a-z0-9-]{3,40}$`, device UUID.
- Coordinates inside the Texas bbox **[-99.5, 29.0, -96.5, 31.5]**; LineString ≤ **500** points; `buffer_m ∈ [10, 300]`; `hours` ≤ 72 (series) / 168 (history); `q` length 3–100.
- Request body ≤ **64 KB** (middleware returns `413 payload_too_large`).
- **Never log** request bodies or query strings for `/v1/route*`, `/v1/search`, `/v1/geocode/*` and `/v1/devices*`. The access log (structlog middleware; uvicorn's own access log is off) records only `method`, the **route template** (e.g. `/v1/crossings/{id}`), `status`, `duration_ms` and a request id. No IPs, no headers. Sentry receives no request bodies (`max_request_body_size="never"`, §24.4).
- CORS: native apps don't need it. `allow_origins` = the explicit `CORS_ORIGINS` list (e.g. the GitHub Pages demo/privacy site), `allow_methods=["GET"]`, `allow_credentials=False`.
- Security headers on every response: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Strict-Transport-Security: max-age=31536000` (Render terminates TLS).

### 22.10 Done when (F25)
- [ ] API tests (FastAPI `TestClient` / httpx `ASGITransport`) cover every MVP endpoint: schemas, Cache-Control, `ETag`/304, 429 from the limiter, 401 on a bad device secret, 404 on internal routes without a secret, 413 on a large body, and bbox/points validation.
- [ ] `docs/schemas/snapshot.v1.example.json` validates in pydantic and zod.
- [ ] A log-capture test proves that a `/v1/route` call with coordinates leaves no coordinate in the logs or the Sentry event.
- [ ] `/v1/search` rejects `lat`/`lon` query parameters with `422`, and a recorded ORS/Photon request from the search route carries exactly the §16.13 constants; `PUT /v1/devices/{id}/subscriptions` rejects any reason other than `saved_route`/`saved_place`/`starred` and any extra field.
- [ ] OpenAPI renders at `/docs` without internal routes.

---
## §23. Push fan-out (`backend/fordcast/push/`)

**Principles (MUST):**
1. Push **only adds caution**. A push never says or implies "safe", is never sent for `no_rise` as good news, and always carries the source's words from the §3.7 bank.
2. Push targets **crossing IDs that the device chose** (§23.1). The server never stores or receives a location.
3. **Escalations are immediate**; everything else is rate-limited (§23.4).
4. **Replay never pushes.** `fordcast/replay/**` must not import `fordcast.push` (static test, §24.7). The only caller of `fan_out()` is the live tick (§20.3 step 10). Replay may raise a **local** demo notification on the phone (§31): title `replay.notify_title` ("REPLAY · …"), body starting with **"REPLAY — not a live alert:"** / **"REPRODUCCIÓN — no es una alerta real:"** (`replay.notify_body`), channel `updates`, never `crossing-urgent` (§3.8).
5. Channel IDs, interruption levels, TTL and defaults are those of **§3.8** (canonical for §15, §23 and §31): `crossing-urgent`, `crossing-watch`, `updates`, `drive-mode`; `ttl 1800`. The server's `channelId` must match a channel the app created, or Android drops the notification `[V: docs.expo.dev]`.

### 23.1 Who gets notified (privacy-first subscriptions)
- **On the phone** (§28, §31), the app works out which crossings matter to the user and uploads **only their IDs** with `PUT /v1/devices/{id}/subscriptions` (§22.7):

| `reason` | Computed on device as | Tier | Removed when |
|---|---|---|---|
| `starred` | saved crossings: the user tapped "Notify me" (F46) | MVP | unstarred |
| `saved_route` | crossings within **300 m** of a saved route line | Stretch (F51) | the route is deleted |
| `saved_place` | crossings within the place's **radius chip** (1 / 3 / 5 mi; default 3 mi = 4,828 m), chosen on the device | Stretch (F51) | the place is deleted |

- These three are the **only** subscription reasons. The server stores explicit crossing IDs only; it never sees a radius, a place, a route line or a coordinate. There is no server-side "near me" or recent-location subscription.
- `want_watch` per subscription (sent by the client for every item; device default **false**) is the per-crossing/route/place Watch opt-in. The device-level `watch_alerts` must also be on (default **false**; §3.8).
- **"Near me" awareness while moving** comes only from on-device geofences and local notifications (§30.3) plus the in-app map. The server's only role there is the snapshot.

### 23.2 Event → push matrix

| Transition (from `risk_transitions`) | Push | Recipients | `channelId` | iOS `interruptionLevel` | `priority` | `ttl` | Default |
|---|---|---|---|---|---|---|---|
| any → `closed` | `closed_official` / `closed_sensor` | subscribers with `alerts_enabled` | `crossing-urgent` | `time-sensitive` | `high` | 1800 | on |
| any → `avoid` (escalation) | `avoid` (window lo > 0) / `avoid_now` (lo = 0 or window null) | subscribers with `alerts_enabled` | `crossing-urgent` | `time-sensitive` | `high` | 1800 | on |
| `no_rise`/`unknown` → `watch` | `watch` / `watch_nowindow` | `alerts_enabled` **and** `watch_alerts` **and** `want_watch` | `crossing-watch` | `active` | `default` | 1800 | **off** |
| → `no_rise` after an escalation episode | `update` | only devices that received an escalation push for this crossing in the last 12 h, with `updates_enabled` | `updates` | `passive` | `normal` | 1800 | on |
| any → `unknown` | **none** (in-app banner); Stretch `unknown` push only if the subscription is `saved_route`, the previous state was ≥ `watch`, and an active NWS Flash Flood Warning or Flood Warning covers the service area (§16.7) | as stated | `updates` | `active` | `default` | 1800 | Stretch |
| `avoid` → `watch`, `closed` → `avoid` (step-downs) | **none** (the earlier notification stays until the `update` replaces it via `collapseId`) | — | — | — | — | — | — |
| any → `no_rise` without an earlier pushed escalation | **never** | — | — | — | — | — | — |

- **Why only one `update`, at the end:** de-escalation steps down one level at a time (§18.8), so an update at every step would mean up to 3 pushes per event. One passive update when the crossing reaches `no_rise` replaces the earlier alert (same `collapseId`/`tag`) with "FordCast no longer sees water rising upstream. Water may still be on the road. Obey barricades." (`update.deescalate.*`). This is exactly §3.8's de-escalation rule (Step 0 decided default D4).
- A transition **to `unknown`** never produces an `update` (that would wrongly sound like an improvement).
- Test crossings (`is_test`) use the same matrix, with the TEST prefix (§23.9).

### 23.3 Eligibility, dedupe, cooldowns, caps, quiet hours

| Rule | Value | Applies to |
|---|---|---|
| **Dedupe** | `unique (device_id, transition_id)` in `private.alerts_sent`. Rows are inserted **before** sending (`ON CONFLICT DO NOTHING RETURNING id`), and only inserted rows are sent, so a retried or watchdog tick can never double-send. | all |
| **Cooldown** | ≤ 1 push per (device, crossing, level) per **60 min**; a level-L push is skipped if a push at level ≥ L for that crossing went to the device in the last 60 min | escalations, updates |
| **Per-device budget** | ≤ **3** individual escalation pushes per rolling 60 min (§3.8). Two or more escalations for one device in the same tick → **one `summary`** push. After the budget is spent, at most **1 `summary` per 15 min**, and only if it contains an `avoid`/`closed`; otherwise the change is in-app only (inbox + banner). | escalations |
| **Quiet hours** (device local time, `tz`; Stretch F73) | `watch`, `update` and Stretch `unknown` are **suppressed** (never sent late). `avoid`/`closed` **ignore** quiet hours for every subscription reason (`saved_route`, `saved_place`, `starred`), because night is the riskiest time (§3.8; Step 0 decided default D3). | per device |
| **Mute** (Stretch F69) | `muted_until[crossing_id] > now` → skip | per device |
| **Token** | `expo_push_token is not null` | all |
| **Freshness** | only transitions from the **current tick** are pushed; after a kill-switch pause or an outage, never send a backlog older than 10 min (a late flood alert is harmful; that is also why `ttl` = 1800) | all |


### 23.4 Algorithm (runs at the end of each live tick)
```python
# backend/fordcast/push/fanout.py (agent-written)
PUSH_ESCALATIONS = {"watch", "avoid", "closed"}

async def fan_out(tick: TickResult, now: datetime, repo: Repo, expo: ExpoClient) -> FanoutStats:
    if await repo.config_bool("kill_switch_push"):
        log.warning("push_killed", n=len(tick.transitions)); return FanoutStats.killed(tick)
    escal = sorted((t for t in tick.transitions if t.kind == "escalation" and t.to_state in PUSH_ESCALATIONS),
                   key=lambda t: (-RANK[t.to_state], t.crossing_id))
    finals = [t for t in tick.transitions if t.to_state == "no_rise"]
    plans: dict[UUID, list[Plan]] = defaultdict(list)

    for t in escal:                                                  # who subscribed to this crossing?
        for d, sub in await repo.subscribers(t.crossing_id, now):    # alerts_enabled and a push token
            if eligible_escalation(d, sub, t, now, await repo.recent_pushes(d.id, t.crossing_id, now)):
                plans[d.id].append(Plan(d, t, "escalation"))
    for t in finals:
        for d in await repo.devices_with_pushed_escalation(t.crossing_id, since=now - timedelta(hours=12)):
            if d.updates_enabled and not in_quiet_hours(d, now) and \
               not await repo.pushed_within(d.id, t.crossing_id, "update", minutes=60):
                plans[d.id].append(Plan(d, t, "deescalation"))

    messages: list[OutMsg] = []
    for dev_id, ps in plans.items():
        budget = await repo.push_budget(dev_id, now)                 # escalations in last 60 min, last summary time
        messages += plan_device(ps, budget, now)                     # individual vs summary vs in-app only (§23.3)
    inserted = await repo.insert_alerts_sent(messages)               # ON CONFLICT DO NOTHING RETURNING → dedupe
    to_send = [m for m in messages if m.alert_id in inserted]
    tickets = await expo.send([render(m) for m in to_send])          # §23.6
    await repo.record_tickets(to_send, tickets)                      # ticket ids/errors; DeviceNotRegistered → token null
    await repo.mark_transitions_pushed(tick.transitions)
    return FanoutStats.of(to_send, tickets)
```
`eligible_escalation` applies §23.2 (Watch opt-ins) and §23.3 (cooldown, quiet hours, mute). `plan_device` applies the budget and the summary rule. Each is a pure function with unit tests (§24.7).

### 23.5 Templates (`backend/fordcast/push/templates/{en,es}.json`; copy from §3.7, never invented here)
```json
{
  "avoid":           {"title": "Avoid {{name}}", "body": "Likely flooded within {{lo}}–{{hi}} min. Use another route. Never drive into water."},
  "avoid_now":       {"title": "Avoid {{name}}", "body": "Water may already be on the road. Use another route. Never drive into water."},
  "watch":           {"title": "Watch: {{name}}", "body": "Water rising upstream. Possible flooding in {{lo}}–{{hi}} min. Plan another route."},
  "watch_nowindow":  {"title": "Watch: {{name}}", "body": "Water rising upstream. Plan another route."},
  "closed_official": {"title": "Closed: {{name}}", "body": "{{source}} reports it closed. Turn around, don't drown."},
  "closed_sensor":   {"title": "Closed: {{name}}", "body": "The sensor at this crossing shows water over the road. Turn around, don't drown."},
  "update":          {"title": "Update: {{name}}", "body": "FordCast no longer sees water rising upstream. Water may still be on the road. Obey barricades."},
  "summary":         {"title": "{{c}} crossings on your routes need caution", "body": "Tap for details."},
  "unknown":         {"title": "FordCast can't see {{name}} right now", "body": "Data is offline during flood alerts. Avoid low-water crossings."},
  "test":            {"title": "TEST · {{title}}", "body": "This is a test. No crossing has changed."}
}
```
```json
{
  "avoid":           {"title": "Evite {{name}}", "body": "Probablemente inundado en {{lo}}–{{hi}} min. Use otra ruta. Nunca maneje en el agua."},
  "avoid_now":       {"title": "Evite {{name}}", "body": "Puede que ya haya agua en el camino. Use otra ruta. Nunca maneje en el agua."},
  "watch":           {"title": "Precaución: {{name}}", "body": "El agua sube río arriba. Posible inundación en {{lo}}–{{hi}} min. Planee otra ruta."},
  "watch_nowindow":  {"title": "Precaución: {{name}}", "body": "El agua sube río arriba. Planee otra ruta."},
  "closed_official": {"title": "Cerrado: {{name}}", "body": "{{source}} lo reporta cerrado. ¡Dé la vuelta, no se ahogue!"},
  "closed_sensor":   {"title": "Cerrado: {{name}}", "body": "El sensor de este cruce muestra agua sobre el camino. ¡Dé la vuelta, no se ahogue!"},
  "update":          {"title": "Actualización: {{name}}", "body": "FordCast ya no detecta agua subiendo río arriba. Todavía puede haber agua en el camino. Respete las barricadas."},
  "summary":         {"title": "{{c}} cruces en sus rutas requieren precaución", "body": "Toque para ver detalles."},
  "unknown":         {"title": "FordCast no puede ver {{name}} ahora", "body": "No hay datos mientras hay alertas de inundación. Evite los cruces bajos."},
  "test":            {"title": "PRUEBA · {{title}}", "body": "Esto es una prueba. Ningún cruce ha cambiado."}
}
```
- **Rendering:** `{{name}}` = `crossings.name_es` if locale is `es` and it is set, else `name`. `{{source}}` = the official source label ("City of Austin", "Manual entry"). `{{lo}}`/`{{hi}}` from the window, with an **en dash** (U+2013). A window with `lo = 0`, or no window, selects `avoid_now`/`watch_nowindow` (never "0 min", never a single number; §3.5).
- **Length:** title ≤ 50 characters (truncate `{{name}}` with "…" to fit), body ≤ 150; payload ≤ 4 KiB `[V]`.
- **Spanish** strings come from §3.7 and need native-speaker review (§35). The WATCH title uses **"Precaución"** (the state word), never "Atención".
- `backend/tests/test_copy_banned.py` scans both files with the shared banned-words list (§3.12, §24.7) and asserts key parity between EN and ES.
- `backend/tests/test_push_templates_match_bank.py` asserts that every title/body equals its §3.7 source in `mobile/src/locales/{en,es}.json` (`state.*` push slots, `update.deescalate.*`, `push.summary`, `alerts.test`), so the server can never drift from the bank.

### 23.6 Payload (Expo message) and sending
```json
{"to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
 "title": "Avoid Bull Creek at Loop 360",
 "body": "Likely flooded within 15–30 min. Use another route. Never drive into water.",
 "data": {"type": "risk", "crossing_id": "atx-081", "state": "avoid", "window": [15, 30], "seq": 182734,
          "as_of": "2026-10-14T18:05:00Z", "url": "fordcast://crossing/atx-081", "test": false},
 "priority": "high", "ttl": 1800, "sound": "default",
 "channelId": "crossing-urgent", "interruptionLevel": "time-sensitive", "categoryId": "crossing-alert",
 "collapseId": "crossing-atx-081", "tag": "crossing-atx-081", "threadId": "fordcast-risk"}
```
| Field | Rule |
|---|---|
| `data.type` | `risk` · `update` · `summary` (`crossing_ids: [...]`, ≤ 10, `url: "fordcast://alerts"`) · `unknown` · `test` |
| `data.url` | the deep link the app opens (§28, §31) |
| `priority` | `high` (avoid/closed), `default` (watch, unknown), `normal` (update, summary of watch-only) |
| `interruptionLevel` | `time-sensitive` (avoid/closed; needs the iOS entitlement, Lane B), `active` (watch, unknown, summary without avoid), `passive` (update). Never `critical`. |
| `channelId` | `crossing-urgent` (avoid/closed, and summaries containing them), `crossing-watch` (watch, watch-only summary), `updates` (update, unknown) |
| `categoryId` | `crossing-alert` on escalations (actions Show detour · Details · Mute 1 h; F69). Harmless if the category isn't registered. |
| `collapseId` (iOS) / `tag` (Android) | `crossing-<id>`, so a newer notification replaces the older one for the same crossing; summaries use `summary` |
| `threadId` | `fordcast-risk` (iOS grouping) |
| `sound` | `"default"` for escalations; omitted for update/summary-of-watch |
| `ttl` | **1800** for every message (decision sheet; a flood alert delivered late is harmful) |

**Sending** (`push/expo.py`, httpx; field names `[V: expo-server-sdk 7.2.0]`):
- `POST https://exp.host/--/api/v2/push/send` with **≤ 100 messages per request**, gzip body, `Authorization: Bearer ${EXPO_ACCESS_TOKEN}`, ≤ 6 concurrent requests, tenacity backoff on 429/5xx (3 attempts).
- The response `data[]` aligns with the request order. `status: "ok"` → store `ticket_id`. `status: "error"` → store `ticket_status = "error:<details.error>"`; **`DeviceNotRegistered` → set `devices.expo_push_token = null` immediately**.
- A whole-request failure after retries → rows keep `ticket_status = "error:send_failed"`; the next tick retries rows ≤ 10 min old, then gives up (Sentry warning).

### 23.7 Receipts (every tick, after sending)
- Select `private.alerts_sent` rows with `ticket_id` set, `receipt_status` null, and `sent_at` between **now − 23 h and now − 15 min**. Receipts live 24 h; check ≥ 15 min after sending `[V]`.
- `POST https://exp.host/--/api/v2/push/getReceipts` with `{"ids": [...]}` in batches of **≤ 300** `[V: SDK]`.

| Receipt | Action |
|---|---|
| `ok` | `receipt_status='ok'`; reset `devices.push_failures = 0` |
| `DeviceNotRegistered` | null the token (the app re-registers its token on next launch) |
| `MessageTooBig` | Sentry **error** (template bug); fix the template |
| `MessageRateExceeded` | Sentry warning; halve concurrency for the next hour |
| `InvalidCredentials` / `MismatchSenderId` | Sentry **error**: push is broken for that platform; the human checks EAS/FCM credentials (§31) |
| other | `push_failures += 1`; at 5 consecutive failures, null the token |

### 23.8 Kill switch and anomaly guard
- **Kill switch:** `app_config.kill_switch_push = true` (CLI `fordcast config set kill_switch_push true`) stops all sends immediately. States, the snapshot and in-app banners keep working. Turning it back on **never** sends the backlog (§23.3 freshness). Use it if bad data is suspected (e.g. a USGS unit or datum change).
- **Anomaly guard `[Stretch]`, off by default:** if more than **50 %** of monitored crossings escalate in a single tick, hold pushes for that tick, send a Sentry error tagged `push_anomaly`, and keep everything in-app. Before enabling it, replay every archived storm through the guard and confirm it would not have held any real event. Document the result in `docs/decisions/`.

### 23.9 Test pushes and the test crossing
- **`POST /internal/push/test`** (admin) or `uv run python -m fordcast push test --device <uuid> --kind avoid` sends the `test` template (e.g. "TEST · Avoid FordCast Test Crossing" / "PRUEBA · Evite FordCast Test Crossing", body `alerts.test`) on the matching channel (§22.8).
- **End-to-end escalation test (Day 7 gate, dev build):**
  1. The debug screen (F107) subscribes the device to `test-0001` (`reason: starred`).
  2. Run `fordcast official set test-0001 closed --note "push test" --ttl 30`.
  3. Within one tick, `risk_transitions` shows `unknown → closed`, and the phone receives "TEST · Closed: FordCast Test Crossing" on `crossing-urgent`.
  4. Run `fordcast official set test-0001 clear_entry`. The state returns to `unknown` (tier C), and no update is sent (§23.2).
  5. Check the receipt after 15 min.
- Test crossings never appear in the snapshot, API or Realtime (RLS, §21.2). Their pushes always carry `data.test = true` and the TEST/PRUEBA prefix.

### 23.10 Done when (F67, F27)
- [ ] Unit tests for every row of §23.2 and §23.3 (Watch opt-in default off, quiet hours for each subscription reason and each level, cooldown, budget → summary, dedupe on retry, no `update` on → `unknown`, kill switch, backlog drop, DeviceNotRegistered, test prefix) pass.
- [ ] DB inspection shows only `saved_route`, `saved_place` and `starred` subscriptions and no coordinate, radius or place anywhere; `test_push_templates_match_bank.py` passes.
- [ ] A contract test with recorded Expo `send` and `getReceipts` responses (ok + DeviceNotRegistered) passes.
- [ ] The §23.9 end-to-end test succeeds on a real Android phone, with the screenshot and receipt logged in `docs/CLAIMS.md`. Claim "push alerts on Android" only after this.

---

## §24. Backend security, privacy, observability, testing & CI

### 24.1 Threats and controls

| Threat | Control |
|---|---|
| Leaked `sb_secret_` / `DATABASE_URL` / `EXPO_ACCESS_TOKEN` | Server-only (Render env, GitHub secrets, Vault); never `EXPO_PUBLIC_*` (§1.9). GitHub secret scanning + push protection (VERIFY availability). `repo-guards` CI grep (§24.9). Rotation runbook in §24.2. |
| Someone triggers ticks or admin actions | `X-Tick-Secret` / `X-Admin-Secret`, constant-time compare; **404** when missing or wrong; lease makes ticks idempotent per slot |
| Device impersonation | 32-byte random device secret, only its sha256 stored; `Authorization: Device <id>:<secret>`; constant-time compare; 401 on any mismatch |
| Spam registrations / quota burn (ORS) | slowapi per-IP limits (§22.2); route cache; ORS → Stadia fallback; orphan cleanup (`retention-orphans` cron in §21.4 deletes devices with no token and no subscriptions after 7 days) |
| Malformed or hostile input | strict pydantic with `extra="forbid"`, Texas bbox, ≤ 500 points, ID regexes, 64 KB body cap |
| Client writes to the DB | RLS on every public table with **no** write policies; `private` schema has no grants (§21.2); tests prove anon insert fails |
| Bad upstream data (unit/datum change, spikes) | value sanity filter (§16.2), pydantic validation, staleness → `unknown`, kill switch / anomaly guard (§23.8), nightly live contract tests |
| Location leaks | no coordinates stored server-side; subscriptions are explicit crossing IDs only (§23.1); place search sends no device location (fixed Austin bias, §16.13); route bodies never logged; Sentry body capture off; log-capture tests (§24.4) |
| Dependency drift | `uv.lock` with `exclude-newer`; mobile pins via `npx expo install`; no upgrades during judging (§1.3) |
| Supply chain on CI | pin GitHub Actions to a major version (VERIFY current majors); third-party actions limited to `actions/*` and `astral-sh/setup-uv` |

### 24.2 Secrets inventory and rotation

This table is an **exact copy of A §1.9** (A §1.9 is the source; if one changes, change both in the same commit). "Get / rotate" says where the value comes from and how to replace it. The §24.10 checklist compares it with Render, GitHub Actions, Supabase Vault and EAS (names only).

| Name | Kind | Lives in | Used by | Get / rotate |
|---|---|---|---|---|
| `DATABASE_URL` | secret | Render env; GitHub Actions secret (only for workflows that read the DB); local `backend/.env` (for `make latency`, `make seed-prod`, `make model-live`) | tick + API (Supavisor **transaction** pooler, port 6543); `psql` targets use the **session** pooler (port 5432) | Supabase → Connect. Rotate: reset the DB password, update Render, GitHub and `.env` |
| `SUPABASE_URL` | config (not secret) | Render env; GitHub Actions secret; local `backend/.env` | Storage uploads, admin calls | Supabase → Project Settings → API |
| `SUPABASE_SECRET_KEY` (`sb_secret_…`) | secret | Render env; GitHub Actions secret; local `backend/.env` (for `make data-upload`, `build_replays.py --upload`) | snapshot + replay + data uploads to Storage, admin | Supabase → API keys → create a new secret key, update every place, revoke the old one |
| `USGS_API_KEY` | secret | Render env; GitHub Actions secret (nightly contracts); local `backend/.env` (smoke, backfill) | ingest (`X-Api-Key`) | `https://api.waterdata.usgs.gov/signup/` (instant); rotate by requesting a new key |
| `PROJECT_CONTACT_EMAIL` | config | Render env; GitHub Actions secret; local `backend/.env` | `User-Agent` for USGS, NWS, NWPS (tick, nightly, smoke) | the project mailbox (Step 0 Q7); edit in all three places |
| `TICK_SECRET` | secret | Render env; Supabase Vault `tick_secret`; GitHub Actions secret | `pg_cron` → `/internal/tick`; `tick-backup.yml` | `python -c "import secrets;print(secrets.token_hex(32))"`. Rotate: `vault.update_secret` → Render → GitHub, in that order (a few failed ticks are expected) |
| `tick_url` | Vault entry | Supabase Vault | `pg_cron` (`https://<service>.onrender.com/internal/tick?source=pg_cron`) | `vault.update_secret` when the Render URL changes |
| `API_BASE` | config | GitHub Actions secret | `tick-backup.yml`, `nightly.yml` (no trailing slash) | the Render service URL |
| `ADMIN_SECRET` | secret | Render env; the student's password manager | admin endpoints and CLI | regenerate like `TICK_SECRET`; update Render |
| `EXPO_ACCESS_TOKEN` | secret | Render env; GitHub Actions secret (nightly receipts contract, S12) | push send + receipts (enhanced push security) | Expo → Account settings → Access tokens; revoke the old one |
| `HC_PING_URL` | secret-ish URL | Render env | heartbeat after each successful tick (`/fail` on error) | healthchecks.io check #1 |
| `HC_NIGHTLY_URL` | secret-ish URL | GitHub Actions secret | `nightly.yml` heartbeat | healthchecks.io check #2 |
| `SENTRY_DSN` | config (optional) | Render env | backend error reports | Sentry project settings |
| `ORS_API_KEY`, `STADIA_KEY` | secret (Stretch) | Render env; local `backend/.env` (smoke S11) | routing + search proxy | provider dashboards |
| `SOCRATA_APP_TOKEN` | secret (optional) | local `backend/.env` | inventory pull (City of Austin SODA3), smoke S7 | data.austintexas.gov profile → app tokens |
| `GOOGLE_SERVICES_JSON` | file secret | EAS environment variable of type **file**, visibility secret (VERIFY BEFORE USE: current `eas env:create` flags) | Android build (`android.googleServicesFile`, §27.3) | Firebase console → Android app `org.fordcast.app` → download `google-services.json`; never committed |
| FCM V1 service-account key | credential | EAS credentials (Android → FCM V1), uploaded with `npx eas-cli@latest credentials` | Expo push delivery to Android | Firebase → Project settings → Service accounts → new key; upload, then delete the local file |
| APNs key (Lane B only) | credential | EAS credentials (managed by EAS) | iOS push | regenerated by EAS on request |
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY` (`sb_publishable_…`), `EXPO_PUBLIC_API_BASE` | public by design | `mobile/.env` (local) + EAS environment variables (plaintext) | the app | a changed value needs a new build or an EAS Update |
| `EXPO_PUBLIC_DEMO_MODE` | public flag | `eas.json` profile `env` (`0`; `1` only in the `demo` profile) | DEMO_MODE (F83) | a build check fails if it is `1` in `preview`/`production` |
| `EXPO_PUBLIC_SENTRY_DSN` | public (optional) | `mobile/.env` + EAS env (plaintext) | app crash reports (F125) | Sentry project settings |
| `FORDCAST_IOS_PAID`, `FORDCAST_SENTRY`, `SENTRY_DISABLE_AUTO_UPLOAD` (`true`, only while Sentry is installed, §25.4) | build flags (not secret) | EAS environment variables / your shell | `app.config.ts` plugin switches (§27.3); the Sentry build skips its source-map upload | — |

Non-secret backend settings (`ENVIRONMENT`, `USGS_OGC_BASE`, `USGS_BBOX`, `NWS_UGC`, feature toggles, …) are listed in §20.12. There is **no** `SENTRY_AUTH_TOKEN` anywhere (§1.2 D1). `.gitignore` covers `.env*` (except `*.example`), `google-services.json`, `GoogleService-Info.plist`, `*.p8`, `*.p12`, `*.jks`, `*.keystore` and any service-account `*.json` key file (A §1.9, A §5.1).

If any secret may have leaked: **stop, rotate, then tell the human** (§1.7 item 12). Cassettes, logs, screenshots and the devlog never contain secrets (§1.9).

### 24.3 Privacy data map (backend view; the privacy policy `docs/privacy/index.md` and the store-label drafts must match it)

| Data | Where processed | Stored server-side? | Retention | Notes |
|---|---|---|---|---|
| Precise location (map, nearby ranking, geofences, Drive Mode) | phone only (last fix in memory, never written to disk) | **No** | — | never sent, except as route endpoints below |
| Saved crossings / places / routes | phone (SQLite `saved_crossings`, `saved_places`, `saved_routes`) | **No** | until deleted | only derived **crossing IDs** leave the phone; the place's radius chip stays on the phone |
| Recent searches (`recents`) and recent routes (`route_cache`, 7 days) | phone only (SQLite); they hold coordinates | **No** | until "Delete cached data" (Settings → Privacy), or the 7-day route-cache expiry | on-device statements in F84; the policy wording is generated from them |
| Cached risk and last-known states | phone only (SQLite) | **No** | until "Delete cached data" | no personal data |
| Crossing-ID subscriptions | server (`private.device_subscriptions`) | Yes (IDs only; reasons `saved_route`, `saved_place`, `starred`) | until unsubscribed; device deleted after 90 days inactive | IDs of public crossings the user chose; no radius, place, route line or coordinate |
| Route origin/destination (Check My Drive) | phone → API (in memory) → ORS/Stadia | **No** (5-min in-memory cache only; never logged) | transient | ORS/Stadia retention per their terms `[U]`; disclosed in the privacy policy |
| Search text | phone → API (in memory) → ORS/Photon | **No** (24-h in-memory cache keyed by text and language; never logged) | transient | **search text only; no device location is sent** (the server uses the fixed Austin bias, §16.13) |
| Long-pressed map point for reverse geocoding (Stretch) | phone → API (in memory) → ORS/Photon | **No** (not cached; never logged) | transient | a point the user picked, never the device's GPS fix |
| Expo push token, locale, tz, toggles, quiet hours | `private.devices` | Yes | deleted on "Delete my alert data", `DeviceNotRegistered`, or 90 days inactive | "Device ID, not linked to you" |
| Alert log (who got which push) | `private.alerts_sent` | Yes | 30 days | dedupe/cooldowns; no location |
| Public alert log (transitions) | `public.risk_transitions` | Yes | 180 days | no user data; supports live FAR audits |
| IP addresses | Render/Supabase/CDN provider logs; slowapi memory | not by FordCast | provider default `[U]` | mentioned in the policy |
| Crash/error reports | Sentry (`send_default_pii=False`, no bodies) | Sentry | provider default `[U]` | coordinates scrubbed |
| Accounts, names, emails, contacts, photos, analytics, ads | — | **None** | — | no ATT prompt; no analytics SDKs |

**Design consequences (MUST):** no accounts, analytics or ad SDKs; no coordinates in request models except the route endpoints and the user-picked reverse-geocode point, and those are never persisted or logged; place search carries no location at all; no location-derived subscriptions; "Delete my alert data" → `DELETE /v1/devices/{id}` (F106); "Delete cached data" clears `recents`, `route_cache` and the risk cache on the phone; Roadmap features that collect more (crowd reports with photos, SMS numbers) need a new privacy review before any build (§4.P).

#### Privacy policy outline (`docs/privacy/index.md`, EN then ES) `[MVP]` (F106)

Plain language (9th-grade reading level), EN first and the ES version under an `## Español` heading (anchor `#espanol`), native-speaker review (§35). Content per research cac.md §7.2, every statement traceable to a row of the table above (a test, `backend/tests/test_privacy_policy.py`, checks that each heading below exists in both languages and that the policy names every third party in the table):
1. **Who we are:** a student project for the 2026 Congressional App Challenge; the project contact email from Step 0 (Q7; a project address, never the student's personal email; a parent may co-manage it).
2. **What stays on your phone:** location (never stored, never sent except route endpoints), saved crossings/places/routes, recent searches, recent routes, cached risk (the F84 on-device statements, word for word in meaning).
3. **What reaches our servers, and why:** push token, language, time zone, alert settings and quiet hours, and the **IDs** of crossings you chose to follow; route start/end and search text are used only in memory to answer the request and are never stored or logged; search never includes your location.
4. **Children:** "FordCast is meant for drivers and is not directed to children under 13. We don't knowingly collect personal information from children."
5. **Third parties:** Expo push service → Apple/Google push services; openrouteservice and Stadia Maps (routing); openrouteservice and Photon (place search); Render and Supabase (hosting and database); Sentry (error reports, only if enabled). Each named with what it receives.
6. **Retention:** device record deleted after 90 days without use; alert log kept 30 days; public crossing-status history 180 days (no user data); provider logs per provider.
7. **How to delete or revoke:** in-app "Delete my alert data" (server) and "Delete cached data" (phone); turning off notifications or location in the OS settings; uninstalling the app.
8. **Security:** HTTPS everywhere; no accounts or passwords.
9. **Changes and contact; effective date** (the date the policy was last changed).

**Publishing:** GitHub Pages from `main` → `/docs` (repo Settings → Pages → Deploy from a branch → `main` / `docs`). Pages needs the public repo on a free account, and both making the repo public and turning on Pages are stop-and-ask moments (A §1.7 item 4). URL: `https://<github-user>.github.io/Fordcast-CAC/privacy/` (`#espanol` for ES). Until Pages is on, Settings → Privacy and the README link to the GitHub file view of `docs/privacy/index.md`. Linked from Settings → Privacy and the README (F106; E §40).

#### Store data-safety drafts (`docs/store/`) `[Stretch]` (F106b)

Only needed if the app is ever published (not before judging, E §38.6). `docs/store/apple-privacy.md`: Data Not Linked to You → Identifiers (Device ID) for App Functionality; Diagnostics (Crash Data) for App Functionality only if Sentry ships; Tracking: No; precise location not collected (on-device only; routing endpoints not retained). `docs/store/play-data-safety.md`: Device or other IDs for App functionality; Location (precise) processed ephemerally for App functionality (route requests only); not shared; encrypted in transit; deletion available in-app. Re-check both against the store definitions at submission time `[U]`. Done when both files match this table and a parent has reviewed them.

### 24.4 Logging, redaction and Sentry
```python
# backend/fordcast/logging.py (agent-written)
SENSITIVE_PATHS = ("/v1/route", "/v1/search", "/v1/geocode", "/v1/devices")
COORD_RE = re.compile(r"-?\d{1,3}\.\d{3,}")

def scrub(_, __, event: dict) -> dict:                 # structlog processor: last line of defense
    for k in ("query", "body", "headers", "authorization", "lat", "lon", "origin", "destination", "coordinates"):
        event.pop(k, None)
    if isinstance(event.get("path"), str) and event["path"].startswith(SENSITIVE_PATHS):
        event["path"] = event.get("route", "<redacted>")
    return event

structlog.configure(processors=[structlog.contextvars.merge_contextvars, structlog.processors.add_log_level,
                                structlog.processors.TimeStamper(fmt="iso", utc=True), scrub,
                                structlog.processors.JSONRenderer()])

def scrub_sentry(event: dict, hint: dict) -> dict | None:
    req = event.get("request") or {}
    req.pop("data", None); req.pop("query_string", None); req.pop("cookies", None)
    req["headers"] = {k: v for k, v in (req.get("headers") or {}).items()
                      if k.lower() in ("user-agent", "content-type")}
    event["breadcrumbs"] = {"values": []}              # breadcrumbs may contain URLs with coordinates
    return event

sentry_sdk.init(dsn=settings.sentry_dsn or None, environment=settings.environment, release=settings.git_sha,
                traces_sample_rate=0.05, send_default_pii=False, max_request_body_size="never",
                before_send=scrub_sentry)
```
- The access-log middleware logs the **route template** (`request.scope["route"].path`), method, status, duration and a request id. Never the raw URL, IP or headers.
- **Tests:** `tests/api/test_logging_privacy.py` calls `/v1/route` and `/v1/search` with coordinates, captures structlog output and a fake Sentry transport, and asserts no string matches `COORD_RE` or the test coordinates.

### 24.5 Metrics and alarms
- **One JSON log line per tick:** `{event: "tick", slot, source, duration_ms, durations_ms: {ingest, official, tick, write, snapshot, push, receipts}, n_requests, usgs_ratelimit_remaining, n_gauges_ok, n_gauges_stale, n_transitions, n_escalations, n_push_sent, n_push_errors, data_status, model_version, seq}`. The same fields go into `private.ingest_runs`.
- **Alarms** (destinations in §20.7):

| Condition | Detected by | Severity |
|---|---|---|
| No successful tick for 15 min | healthchecks.io | page |
| Tick error | `hc /fail` + Sentry | page |
| `data_status = offline` | UptimeRobot snapshot keyword + GH watchdog | page |
| `data_status = degraded` for > 1 h | Sentry warning from the tick | email |
| `usgs_ratelimit_remaining < 200` or 3 consecutive 429s | tick | email |
| Tick p95 > 60 s over a day | nightly summary in `docs/status.md` | review |
| Push `InvalidCredentials` / `MismatchSenderId` / `MessageTooBig` | receipts (§23.7) | email |
| DB size > 300 MB | nightly size query | email |
| Nightly live contract test failure (USGS v1/NLDI/Expo drift) | `nightly.yml` | email |

### 24.6 Freshness monitoring
- `/v1/meta/freshness` (§22.4) is the single source for data health. The app's Data sources screen (F105) and the GH watchdog read it.
- The nightly job writes a short summary (stale gauges, tick success rate, push counts, DB size) to its log, and the human copies it into `docs/status.md` on the scheduled commit days (Nov 10, Nov 30, Dec 15, + Jan 4 only if judging runs into January; §43). Those commits also keep scheduled workflows enabled (§20.6).

### 24.7 Test pyramid (backend)

| Layer | Tooling | What (files under `backend/tests/`) |
|---|---|---|
| **Unit** | pytest 9 | `features` (rise, upcrossing, freshness) · `travel_time` ★ (±1 min on synthetic lags) · `triggers` · `baseline_rule` ★ (each §18.5 row) · `windows` (allowed set) · `combine` (each §3.3 row) · `metrics` ★ · `inventory` mapping/dedupe · `routing` (circles, via points, verdict) · `push/policy` (§23.10 list) · templates (EN/ES parity) |
| **Property** | hypothesis 6.168 | state machine invariants and the ≤ 2 transitions/hour flapping bound (§18.8); feature functions equal on truncated vs. full series (§19.8) |
| **No-lookahead** | pytest | prefix invariance · future poison · latency respected · source rejects lookahead · outage respected · outage → dependent crossings `unknown` (readings present and true gap) (§19.8) |
| **Isolation (static)** | pytest + `ast` | runtime cannot import or read truth (§19.8); `fordcast/replay/**` doesn't import `fordcast.push`; no legacy USGS host or `dataretrieval` NWIS import outside docs (`tests/test_repo_guards.py` builds the banned strings by concatenation, `"water" + "services.usgs.gov"` and `"dataretrieval" + ".nwis"`, so it never contains the literals it searches for) |
| **Replay golden** | pytest + CLI | `replay-verify --all`: rebuilt `content_sha256` equals `data/replays/index.json` (delays from the committed `data/latency/gauge_latency.json`, never the DB); each file ≤ 150 KB gz; schema-valid; `make app-data` produces no diff |
| **Contract (recorded)** | pytest-recording 0.13 / vcrpy 8.3 cassettes + respx 0.23 | USGS `latest-continuous` (bbox) + `continuous` (comma IDs) + 429 with Retry-After; NLDI hydrolocation, UT nwissite, DM flowlines; NWPS gauge; NWS alerts; Expo send + getReceipts (ok + DeviceNotRegistered); ORS directions (+ 403/429 → Stadia); Photon. **The pydantic models are the contract.** |
| **API** | FastAPI `TestClient` / httpx `ASGITransport` | §22.10 list; snapshot schema; logging privacy (§24.4) |
| **DB contract** | local Supabase CLI `supabase@2.120.0` (Docker) | §21.9 list (anon insert denied, private denied, 0-row identical upsert, lease, constraints, enum order) |
| **Copy** | pytest | `test_copy_banned.py`: push templates, storyboard templates, reason templates, and the storyboard strings inside built replays (§3.12), with the countdown guard; `test_push_templates_match_bank.py` and the storyboard-template parity test (§19.13, §23.5); `test_privacy_policy.py` (§24.3) |
| **Numbers** | pytest | `test_no_hand_typed_metrics.py`: numbers next to "POD", "FAR", "CSI", "min earlier", "%" in `README.md`, `submission/answers.md` and `mobile/src/**/*.{ts,tsx,json}` (locales included; `__tests__/` excluded) must equal `results.json` values or be placeholders `[X]`. Run by the `docs-guards` CI job (§24.9) |
| **Backtest** | CLI | `--smoke`: one storm, compared with the committed `results.json` (POD drift > 10 points fails), on every push; `make backtest CHECK=1`: full LOSO, exact compare (§18.13); `tools/select_hero.py` unit tests (§18.13) |
| **Data integrity** | pytest + tools | every git-tracked data file's sha256 equals `data/MANIFEST.json`; `calm-2024` truth is empty and no calm day has an overtop; `meta.toml` files parse, each with an `outages` list whose entries name a `source` |
| **Live (nightly)** | `-m live` | small real calls: USGS v1 `latest-continuous` (1 request), `collections` list, NLDI one navigation, NWPS one gauge, Expo `getReceipts` with a fake id. Catches API drift (the v0→v1 move and the legacy retirement). |

**Cassette config** (keys never recorded):
```python
# backend/tests/conftest.py
@pytest.fixture(scope="module")
def vcr_config():
    return {"filter_headers": ["X-Api-Key", "Authorization", "apikey"],
            "filter_query_parameters": ["api_key"],
            "decode_compressed_response": True, "record_mode": "none"}
```
Re-record deliberately with `uv run pytest tests/contract --record-mode=once` (keys in the local env). Review every new cassette for secrets before committing (`repo-guards` also greps).

### 24.8 Mobile tests in CI
The mobile job (typecheck, lint, Jest with the copy/parity/state/staleness/windows/replay-frames tests, `check-pins`, `npx expo install --check`, `expo-doctor`, the mobile secret grep) is specified in §36.3 and runs in the same `ci.yml` (below). The shared schema examples in `docs/schemas/` are validated on both sides (§7.1).

### 24.9 CI workflows

**Every gate referenced anywhere in this prompt runs in `ci.yml`** (A F123, A §7.1, D §36.3). Gate → step map:

| Gate | Where it runs (job · step) |
|---|---|
| Backend lint (ruff) and all non-live pytest: no-lookahead (incl. outage tests), truth isolation, banned words + countdown guard (pytest), template parity, privacy policy, data integrity | `backend` · "Backend tests" |
| Golden replays (`replay-verify --all`, frozen delays, no DB) | `backend` · "Golden replays" |
| Backtest smoke (one storm, 10-point POD tolerance) and `make backtest CHECK=1` (full LOSO, exact compare) + hero rule re-check | `backend` · "Backtest smoke", "Backtest check", "Hero rule check" |
| Storm Parquet fetched by `data/MANIFEST.json` | `backend` · "Fetch Storage-hosted data" (`make data-fetch`) |
| DB contract (RLS, lease, constraints, seed idempotency) | `db-contract` |
| Mobile typecheck, lint, Jest (banned words + countdown guard, i18n parity, state, staleness, windows, replay-frames) | `mobile` |
| `check-pins` · `npx expo install --check` · `expo-doctor` | `mobile` |
| Mobile secret grep (no `sb_secret_`, `X-Api-Key`, `ORS_API_KEY`, `STADIA_KEY`, `EXPO_ACCESS_TOKEN` outside tests) | `mobile` · "No server secrets in the app" |
| Hand-typed-metric check (README, `submission/answers.md`, `mobile/src`) | `docs-guards` · "No hand-typed metrics" |
| `make claims && git diff --exit-code` | `docs-guards` · "Claims are generated" |
| `make app-data` idempotent; data manifest matches | `docs-guards` |
| Cross-references and no unresolved review notes in `docs/master-prompt/` | `docs-guards` |
| No `TODO(student)` in the four core files on a submission tag | `docs-guards` (tags only) |
| Legacy USGS endpoints, committed secrets/tokens | `repo-guards` |

```yaml
# .github/workflows/ci.yml
name: ci
on:
  push: { branches: [main], tags: ["cac-*"] }
  pull_request:
concurrency: { group: "ci-${{ github.ref }}", cancel-in-progress: true }
permissions: { contents: read }
jobs:
  backend:
    runs-on: ubuntu-latest
    timeout-minutes: 40
    steps:
      - uses: actions/checkout@v5            # VERIFY BEFORE USE: current major on GitHub Marketplace
      - uses: astral-sh/setup-uv@v6          # VERIFY BEFORE USE: current major
      - run: uv python install 3.13
      - run: uv sync --project backend --frozen --all-extras --all-groups && uv sync --project tools --frozen
      - name: Fetch Storage-hosted data (sha256-checked against data/MANIFEST.json)
        run: make data-fetch
      - name: Backend lint
        working-directory: backend
        run: uv run ruff check . && uv run ruff format --check .
      - name: Backend tests (unit, contract, API, no-lookahead + outage, truth isolation, banned words, parity, data integrity)
        working-directory: backend
        run: uv run pytest -q -m "not live" --ignore=tests/api/test_db_contract.py
      - name: Golden replays (delays from data/latency/gauge_latency.json; never the live DB)
        working-directory: backend
        run: uv run python -m fordcast replay-verify --all
      - name: Backtest smoke (first bundled storm; never a hard-coded id)
        working-directory: backend
        run: uv run python -m fordcast backtest --storm "$(jq -r '.storms[0].id' ../data/replays/index.json)" --smoke --out "$RUNNER_TEMP/bt" --compare ../docs/results/results.json
      - name: Backtest check (full LOSO, exact compare with the committed results.json)
        run: make backtest CHECK=1
      - name: Hero rule check (select_hero.py reproduces results.json.hero and hero_by_storm)
        run: uv run --project tools python tools/select_hero.py --check docs/results/results.json
      - name: mypy (tracked, not blocking; §7.1)
        working-directory: backend
        run: uv run mypy fordcast || echo "::warning::mypy findings"

  db-contract:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v5
      - uses: astral-sh/setup-uv@v6
      - run: npx --yes supabase@2.120.0 start    # Docker is available on ubuntu runners; VERIFY exclude flags to speed up
      - run: npx --yes supabase@2.120.0 db reset # applies migrations 0001–0004 + seed.sql
      - run: npx --yes supabase@2.120.0 status -o env >> "$GITHUB_ENV"   # VERIFY flag; exports local API URL, DB URL, keys
      - run: uv sync --frozen && uv run pytest -q tests/api/test_db_contract.py
        working-directory: backend
        env: { SUPABASE_LOCAL: "1" }

  mobile:                                      # details owned by §36.3
    runs-on: ubuntu-latest
    timeout-minutes: 20
    defaults: { run: { working-directory: mobile } }
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4            # VERIFY BEFORE USE: current major
        with: { node-version: "22", cache: npm, cache-dependency-path: mobile/package-lock.json }   # Node ≥ 22.13 (§25)
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - name: Jest (banned words + countdown guard, i18n parity, risk state, staleness, windows, replay frames, …)
        run: npm test -- --ci
      - name: Pin guard
        run: node scripts/check-pins.mjs
      - name: SDK-aligned versions
        run: npx expo install --check
      - run: npx expo-doctor@latest
      - name: No server secrets in the app (test files excluded; they build such strings by concatenation)
        run: "! grep -rnE --exclude-dir=__tests__ 'sb_secret_|X-Api-Key|\\bORS_API_KEY\\b|\\bSTADIA_KEY\\b|EXPO_ACCESS_TOKEN' src app.config.ts eas.json"

  docs-guards:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v5
      - uses: astral-sh/setup-uv@v6
      - run: uv python install 3.13
      - run: uv sync --project backend --frozen --all-groups && uv sync --project tools --frozen
      - name: No hand-typed metrics (README.md, submission/answers.md, mobile/src)
        working-directory: backend
        run: uv run pytest -q tests/test_no_hand_typed_metrics.py
      - name: Claims are generated (docs/CLAIMS.md → app JSON + README splices)
        run: make claims && git diff --exit-code
      - name: App data is generated (make app-data is idempotent)
        run: make app-data && git diff --exit-code
      - name: Data manifest matches every git-tracked data file
        run: uv run --project tools python tools/data_manifest.py --verify
      - name: Cross-references resolve; no unresolved review notes
        run: |
          uv run --project tools python tools/check_xrefs.py docs/master-prompt
          ! grep -rnE "NOTE TO [R]EVIEWER" docs/master-prompt/
      - name: No student TODOs on a submission tag
        if: startsWith(github.ref, 'refs/tags/')
        run: "! grep -n 'TODO(student)' backend/fordcast/linking/travel_time.py backend/fordcast/model/baseline_rule.py backend/fordcast/scoring/metrics.py backend/fordcast/sources/base.py"

  repo-guards:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - name: No legacy USGS endpoints (the guard test builds its strings by concatenation and is excluded anyway)
        run: "! git grep -nE 'water''services\\.usgs\\.gov|dataretrieval\\.nwis' -- . ':!*.md' ':!docs/**' ':!backend/tests/test_repo_guards.py'"
      - name: No secrets or real push tokens committed (test files excluded)
        run: "! git grep -nE 'sb_secret_[A-Za-z0-9]{8,}|ExponentPushToken\\[[A-Za-z0-9_-]{12,}\\]|hc-ping\\.com/[0-9a-f-]{36}' -- . ':!*.md' ':!backend/tests/**' ':!mobile/src/__tests__/**'"
```
- `make data-fetch` needs no keys (public bucket). `docs-guards` needs no Parquet: `make app-data` reads only committed files.
- `tools/data_manifest.py --verify` recomputes the sha256 of every git-tracked file under `data/` and fails on any mismatch with `data/MANIFEST.json` (no network). `tools/select_hero.py --check` recomputes the hero from the file's own `per_crossing` rows and fails if `hero`/`hero_by_storm` differ.
- `--compare` (used by `make backtest CHECK=1`) ignores `generated_by.git_sha`, `hero` and `hero_by_storm`, because the fresh run happens before `select_hero.py`; the hero is checked by its own step.
- **Repo-guard exclusions:** the greps skip Markdown and `docs/` (this prompt and the docs must be able to name what is banned) and the test files that have to mention the patterns. Those tests also assemble the literals by concatenation (`"water" + "services.usgs.gov"`, `'sb_' + 'secret_test'`), so they stay clean even without the exclusion. In the legacy-endpoint grep, the shell's `'water''services…'` adjacent-quote form keeps the workflow file itself from containing the host name.
`.github/workflows/tick-backup.yml` (watchdog; primary clock is pg_cron):
```yaml
name: tick-backup
on:
  schedule: [{ cron: "7-59/15 * * * *" }]      # off the top of the hour (GitHub delays are worst at :00)
  workflow_dispatch: {}
permissions: { contents: read }
jobs:
  tick:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Backup tick (idempotent per 5-min slot; skipped if pg_cron already succeeded)
        run: |
          curl -fsS -X POST "$API/internal/tick?source=gha" -H "X-Tick-Secret: $TICK_SECRET" --max-time 90 \
            || echo "::warning::backup tick call failed (Render may be waking)"
        env: { API: "${{ secrets.API_BASE }}", TICK_SECRET: "${{ secrets.TICK_SECRET }}" }
      - name: Freshness check (fails the job → GitHub emails the owner)
        run: |
          curl -fsS "$API/v1/meta/freshness" --max-time 30 -o fresh.json
          jq -e '.data_status != "offline"' fresh.json
        env: { API: "${{ secrets.API_BASE }}" }
```
`.github/workflows/nightly.yml`:
```yaml
name: nightly
on:
  schedule: [{ cron: "23 8 * * *" }]           # 03:23 CDT
  workflow_dispatch: {}
permissions: { contents: read }
jobs:
  live-contracts-and-golden:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    defaults: { run: { working-directory: backend } }
    steps:
      - uses: actions/checkout@v5
      - uses: astral-sh/setup-uv@v6
      - run: uv python install 3.13
      - run: uv sync --frozen --all-extras && uv sync --project ../tools --frozen
      - run: uv run pytest -q -m live
        env:
          USGS_API_KEY: "${{ secrets.USGS_API_KEY }}"
          EXPO_ACCESS_TOKEN: "${{ secrets.EXPO_ACCESS_TOKEN }}"
          PROJECT_CONTACT_EMAIL: "${{ secrets.PROJECT_CONTACT_EMAIL }}"
      - run: make -C .. data-fetch                # Storage-hosted Parquet by data/MANIFEST.json
      - run: uv run python -m fordcast replay-verify --all
      - name: Heartbeat
        if: success()
        run: curl -fsS "${{ secrets.HC_NIGHTLY_URL }}" --max-time 10 || true
```
- Storm Parquet files that live in Storage are fetched **before** `replay-verify` and the backtest by `make data-fetch` (`tools/data_manifest.py --download`, §17.1): each `storage` entry of `data/MANIFEST.json` is downloaded from its public URL, sha256-checked and cached under `data/storms/<id>/`. A hash mismatch fails the job. `replay-verify` and `backtest` themselves never download anything; they fail with "run make data-fetch" if a file is missing.
- The secrets these workflows read (`API_BASE`, `TICK_SECRET`, `USGS_API_KEY`, `EXPO_ACCESS_TOKEN`, `PROJECT_CONTACT_EMAIL`, `HC_NIGHTLY_URL`) are all in the §24.2 inventory.
- `0004_cron.sql` needs pg_cron/pg_net. If the local Supabase stack lacks them, the DB-contract job skips the cron statements (guarded `do $$ … $$` block with `if exists (select 1 from pg_available_extensions where name = 'pg_cron')`; VERIFY on the CLI version).
- Scheduled workflows in a public repo are auto-disabled after **60 days without repository activity** `[V]`. The commit plan in §20.6/§43 prevents this.
- Standard GitHub-hosted runners are free for public repos `[V]`.

### 24.10 Done when (F123 backend part, F26, F27 privacy)
- [ ] `ci.yml` is green on `main` (all five jobs: `backend`, `db-contract`, `mobile`, `docs-guards`, `repo-guards`), including every gate in the §24.9 map; `tick-backup.yml` and `nightly.yml` have run successfully at least once.
- [ ] The secrets inventory (§24.2 = A §1.9) matches Render, GitHub Actions, Supabase Vault and EAS (a checklist in `docs/decisions/verifications.md`, names only).
- [ ] The log-privacy test passes, and a manual check of Render logs after a route request shows no coordinates; a search request log shows no coordinates at all.
- [ ] `docs/privacy/index.md` (EN + ES) follows the §24.3 outline and matches the data map; it is linked from Settings → Privacy and the README (Part E §40 checks wording).
