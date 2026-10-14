# FordCast Data Bridge: Hydrology Data-Source Catalog (research for the master prompt)

**Role:** Hydrology data engineer · **Date:** 2026-10-14 · **Scope:** Every external data source FordCast needs, with the endpoints, parameters, response shapes, limits, Austin IDs, the storm list for Storm Replay, licensing, and how often to poll each source.

**Verification tags**
- `[V: <source>]`: verified against that source. "dr-1.4.0 src" means I read the source code of the USGS-maintained `dataretrieval` 1.4.0 package downloaded from PyPI. "pynhd-0.20.0 src" means the same for `pynhd`.
- `[U]`: unverified. The coding agent must confirm it with a live request before relying on it.
- Environment note: I could not reach usgs.gov, noaa.gov, weather.gov, austintexas.gov, or arcgis.com directly (proxy/DNS). Facts about those hosts come from search-engine snapshots of the official pages, from package source code, and from GitHub source. **The agent's first task, Step 0 in §13, is a live smoke test of every endpoint below.**

---

## 0. Changes that alter the v4 concept doc

1. **The USGS Water Data API is now v1.** v1 was released in **September 2026**. The base URL is `https://api.waterdata.usgs.gov/ogcapi/v1`. **v0 stays online until June 2027**, after which v0 requests redirect to v1. Build against **v1**. `[V: dr-1.4.0 NEWS.md 09/22/2026 + docs/userguide/configuration.rst]`
   - The v1 `time-series-metadata` collection dropped `begin_utc`, `end_utc`, `state_name`, and `hydrologic_unit_code`. Use `begin`/`end` (UTC with a zone) and the `combined-metadata` collection instead. `[V: dr-1.4.0 NEWS.md]`
2. **The legacy WaterServices shutdown dates are now firm:**
   - Queries slow down from **Nov 16, 2026**.
   - Intentional outages begin **Jan 27, 2027**. One source adds a second outage on Feb 16, 2027.
   - **Decommissioning is Feb 22, 2027.**
   - All three fall inside the judging window. Never call `waterservices.usgs.gov`. `[V: GitHub issue clemensv/real-time-sources#1673, opened 2026-10-09 by the USGS Water Data APIs product owner; DOI-USGS/dataRetrieval#934]`
3. **"Austin's ~70 crossings" does not exist as one dataset.**
   - The City's open-data layer `q6kt-v2zm` holds **22 records**: the **low-water-crossing gates** the City maintains.
   - ATXfloods shows about 67 monitored City crossings plus other jurisdictions, but it has **no documented public API**.
   - The crossing inventory therefore has to be **assembled** from four sources (§4). `[V: search snapshots of geohub.austintexas.gov and catalog.data.gov; KUT 2025-07-16]`
4. **Storm Replay needs a "data-arrival latency" model, not only "no future timestamps."**
   - USGS `time` is the **observation** time. Many gauges transmit about hourly by satellite, so a reading stamped 06:15 may not have been available until about 07:15.
   - Replay must make a reading visible only at `time + latency`. Otherwise every lead-time number is optimistic. (This is my engineering inference. Measure real latency live as `fetch_time - time`.) `[U]`
5. **Gauges fail at the peak, so "Unknown" is real.**
   - **2013:** the Onion Creek at US 183 gauge stopped transmitting at about 06:15 CDT at 21 ft and came back about 2.5 hours later near 40 ft. `[V: Austin American-Statesman 2013-11-10 via search; USGS alert 2013-10-31]`
   - **2015:** the Blanco River at Wimberley gauge was washed away. `[V: Wimberley View; KXAN]`
   - Storm Replay should show this honestly. It is a strong demonstration of the "Unknown, data offline" safety rule.
6. **NWS may retire VTEC.**
   - NWS has proposed sending watches, warnings, and advisories only as CAP, possibly dropping VTEC. Comments are open until Nov 20 or Nov 30, 2026; the notice gives both dates. `[V: weather.gov PNS26-62 via search]`
   - Do **not** key alert logic on VTEC strings. Use the CAP `id`, `references`, `messageType`, `event`, and `expires` fields.

---

## 1. USGS Water Data OGC API (live gauges and history)

### 1.1 Base, auth, limits

| Item | Value | Tag |
|---|---|---|
| Base (current) | `https://api.waterdata.usgs.gov/ogcapi/v1` | [V: dr-1.4.0 src `endpoints.py`: `OGC_API_VERSION = "v1"`] |
| Base (legacy, until June 2027) | `https://api.waterdata.usgs.gov/ogcapi/v0` | [V: dr-1.4.0 docs] |
| Item URL pattern | `{base}/collections/{collection}/items?...` | [V: search of api.waterdata.usgs.gov keys page; dr src] |
| API key | Free from **https://api.waterdata.usgs.gov/signup/** (managed by api.data.gov; emailed instantly, no approval) | [V: dr-1.4.0 `credentials.py` `SIGNUP_URL`; search of /docs/agents] |
| How to send the key | Header **`X-Api-Key: <key>`** (preferred, keeps it out of logs) or query `api_key=<key>` | [V: dr-1.4.0 `transport/http.py`; search of /docs/ogcapi/keys] |
| Env var convention | `API_USGS_PAT` (shared by the R and Python dataRetrieval packages) | [V: dr-1.4.0 README] |
| Rate limit with key | Response headers `x-ratelimit-limit: 1000` and `x-ratelimit-remaining` (counts down per request). No reset header. **Plan for 1,000 requests/hour/key.** | [V: keys-page example "1000"; observed in open-science-pillars/marketplace#65] |
| Rate limit without key | Not officially published. One source says about 100/hr/IP; another cites a "documented 50/hr"; one tester saw no throttling. **Always use a key.** | [U] |
| Over limit | HTTP **429**. Honor `Retry-After` if present. | [V: dr-1.4.0 `ogc/errors.py`] |
| Caching | v0 responses carried `cache-control: public, max-age=3600` via CloudFront. Always check `time` and `last_modified` in each record, because an edge cache could serve an old "latest". | [V: marketplace#65 observation] / impact [U] |
| URL length | About 8 KB. For many IDs, use a CQL2 POST (below). | [V: dr-1.4.0 README] |
| Support | `gs-w_waterdata_support@usgs.gov`, `wdfn@usgs.gov` | [V: issue #1673; search] |

### 1.2 Collections FordCast uses

| Collection | Purpose in FordCast | Notes | Tag |
|---|---|---|---|
| `latest-continuous` | **Live poll**: newest value of every 15-minute series | Has geometry, so it **supports `bbox`** | [V: dr-1.4.0 `get_latest_continuous` signature has `bbox`, `skip_geometry`] |
| `continuous` | **History, backfill, Storm Replay** | **At most 3 years per request**; with no `time` it returns the latest year; **no geometry; ignores `bbox`**; typically 15-minute data | [V: dr-1.4.0 docstring + demo notebook] |
| `monitoring-locations` | Site name, lat/lon, drainage area, site type | Filters include `state`, `site_type_code="ST"`, `bbox` | [V: dr-1.4.0 README] |
| `time-series-metadata` | Which parameters a site has; `begin`/`end` (period of record) | v1 schema change, see §0 | [V: dr-1.4.0 NEWS] |
| `combined-metadata` | Locations joined with series inventory; filter `data_type="Continuous values"` | Best way to find "which Austin gauges have 15-minute stage, and since when" | [V: dr-1.4.0 demo notebook] |
| `peaks` | Annual peak stage/flow, used to rank storms | | [V: dr-1.4.0 `get_peaks`] |
| `field-measurements` | Manual measurements (v1 returns `time` as a date plus `time_of_day`) | Optional | [V: dr-1.4.0 NEWS] |
| `parameter-codes` | Code lookup | | [V: search] |
| STAC ratings `https://api.waterdata.usgs.gov/stac/v0/search` | Stage-discharge rating curves | Optional; converts stage to cfs | [V: dr-1.4.0 `ratings.py`] |

**Parameter codes:**
- `00065` = gage height, ft (primary for FordCast).
- `00060` = discharge, ft³/s; the unit string is `ft^3/s`.
- `00045` = precipitation, in (some City/USGS sites) [U per site].
- `statistic_id` for continuous data is nearly always **`00011`**. `[V: dr-1.4.0 docstring]`

### 1.3 Query parameters (OGC API Features)

| Param | Example | Notes | Tag |
|---|---|---|---|
| `monitoring_location_id` | `USGS-08159000` | Agency, hyphen, site number. Matches `id` in monitoring-locations. | [V: dr src] |
| `parameter_code` | `00065` | 5-digit code | [V] |
| `time` | `2015-10-30T00:00:00Z/2015-10-31T12:00:00Z`; `2026-10-14T00:00:00Z/..`; `PT6H` | RFC 3339 instant, bounded or half-bounded interval (`..`), or ISO 8601 duration | [V: dr docstring] |
| `bbox` | `-98.20,29.95,-97.40,30.70` | minLon, minLat, maxLon, maxLat. **Not on `continuous`.** | [V] |
| `properties` | `monitoring_location_id,parameter_code,time,value,unit_of_measure,approval_status,qualifier,last_modified` | Trims the payload | [V: dr docstring lists the options] |
| `skipGeometry` | `true` | camelCase | [V: dr `ogc/requests.py`] |
| `limit` | `10000` | Docs say the maximum is 10,000. The library sends up to 50,000, and v0 accepted 50,000 (100,000 returned HTTP 400). **Use 10000.** | [V: dr src + marketplace#65] |
| `filter` + `filter-lang=cql-text` | `(time >= '2015-10-30T06:00:00Z' AND time <= '2015-10-30T18:00:00Z')` | Server-side CQL; can OR several time windows | [V: dr docstring example] |
| `f` | `json` | GeoJSON (`application/geo+json`) | [V: search] |
| `sortby` | (avoid) | Honored on the first page only, and breaks paging (400). **Sort client-side.** | [V: marketplace#65] |
| Pagination | Follow `links[]` where `rel == "next"`. The cursor is opaque. **`numberMatched` is null**, so count client-side. | | [V: dr `ogc/engine.py`; marketplace#65] |
| Multi-ID POST | `POST {base}/collections/latest-continuous/items` with header `Content-Type: application/query-cql-json` and body `{"op":"and","args":[{"op":"in","args":[{"property":"monitoring_location_id"},["USGS-08159000","USGS-08158700"]]}]}` | The library sends multi-value lists this way | [V: dr-1.4.0 `ogc/requests.py` `_cql2_param`] ; exact POST path [U] |

### 1.4 Example requests

```http
# LIVE: every Austin 15-min stage + discharge reading, in ONE request (bbox works on latest-continuous)
GET https://api.waterdata.usgs.gov/ogcapi/v1/collections/latest-continuous/items
    ?bbox=-98.20,29.95,-97.40,30.70
    &parameter_code=00065,00060        # [U] whether comma-list works in GET; else make 2 calls or use the CQL2 POST
    &properties=monitoring_location_id,parameter_code,time,value,unit_of_measure,approval_status,qualifier,last_modified
    &limit=10000&f=json
X-Api-Key: ${USGS_API_KEY}
User-Agent: FordCast/1.0 (+https://github.com/<you>/fordcast; <contact email>)

# BACKFILL / REPLAY: one site, one storm window
GET https://api.waterdata.usgs.gov/ogcapi/v1/collections/continuous/items
    ?monitoring_location_id=USGS-08159000&parameter_code=00065
    &time=2015-10-29T00:00:00Z/2015-11-01T00:00:00Z&limit=10000&f=json

# INVENTORY: which Austin sites have continuous stage, and since when
GET .../collections/combined-metadata/items?bbox=-98.20,29.95,-97.40,30.70&parameter_code=00065&f=json   # [U] exact queryables; use dataretrieval get_combined_metadata(data_type="Continuous values")
```

### 1.5 Response shape (GeoJSON FeatureCollection)

The values below are illustrative; the field names are verified.

```json
{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "id": "3f2a…-uuid",
    "geometry": {"type": "Point", "coordinates": [-97.68, 30.18]},
    "properties": {
      "time_series_id": "uuid…",
      "monitoring_location_id": "USGS-08159000",
      "parameter_code": "00065",
      "statistic_id": "00011",
      "time": "2026-10-14T13:45:00+00:00",
      "value": "3.42",
      "unit_of_measure": "ft",
      "approval_status": "Provisional",
      "qualifier": null,
      "last_modified": "2026-10-14T14:02:11+00:00"
    }
  }],
  "links": [{"rel": "next", "href": "…cursor=…"}],
  "numberReturned": 1
}
```

Field facts `[V: dr docstrings + marketplace#65]`:
- `value` is a **string**, so parse it as float.
- `time` is **UTC**. The legacy service used local time with an offset.
- `approval_status` is `Provisional` or `Approved`, and provisional data can be revised.
- `qualifier` is a list or null (e.g., `ESTIMATED`, `ICE`).
- The site name is **not** included in observations; join from `monitoring-locations`.
- The record `id` is a per-version UUID and **not stable**. Deduplicate on `(time_series_id, time)`.
- v1 continuous properties: `id, time_series_id, monitoring_location_id, parameter_code, statistic_id, time, value, unit_of_measure, approval_status, qualifier, method_category, last_modified`. `[V: dr-1.4.0 docstring]`

### 1.6 Python

- **`dataretrieval==1.4.0`** (PyPI, released 2026-10-02, Python ≥ 3.10). `[V: PyPI JSON]`
- Functions:
  - `waterdata.get_latest_continuous(monitoring_location_id=…, parameter_code=…, bbox=…, skip_geometry=…)`
  - `get_continuous(monitoring_location_id, parameter_code, time="start/end")`
  - `get_monitoring_locations(state="TX", site_type_code="ST", bbox=…)`
  - `get_time_series_metadata`, `get_combined_metadata(data_type="Continuous values")`
  - `get_peaks`
  - `get_nearest_continuous(targets, monitoring_location_id, parameter_code, window="PT7M30S")`, which is handy for aligning gauges to replay ticks
  - `get_ratings`
  - All return `(DataFrame, metadata)`. `[V: dr-1.4.0 src]`
- Built-in behavior: retries on 429/5xx (4 retries, honors Retry-After); raises a resumable `ChunkInterrupted` / `QuotaExhausted`; automatically chunks long ID lists; **does NOT chunk the 3-year time limit**, so split by calendar year yourself. `[V: dr demo notebook]`
- The `dataretrieval.nwis` module (legacy service) will be removed on or after **2027-05-06**. Do not use it. `[V: dr NEWS]`
- **Recommendation:**
  - Use `dataretrieval` in **offline notebooks** (inventory, backfill, Storm Replay cache building).
  - Use **raw `httpx` async** in the **live FastAPI ingester**: one bbox request per poll, with explicit timeouts and control over the key and User-Agent.
  - Runner-up: use `dataretrieval` everywhere (simpler, but synchronous and less control over latency).

### 1.7 How far back 15-minute data goes (for Storm Replay)

- The `continuous` collection serves the **period of record** in windows of 3 years or less. The official demo builds yearly windows from 2012-10-01 to 2025-09-30. `[V: dr demo notebook]`
- The legacy IV service documented data from **2007-10-01** onward for most sites. `[V: waterservices.usgs.gov IV docs via search]`
  - So the 2013, 2015, 2018, and 2025 storms **should** be available for Austin gauges that were active then.
  - **Confirm per site** with `combined-metadata` `begin` [U per site].
- One tester reported "continuous is a rolling one-year window". That was a request with **no `time` parameter**, which defaults to the last year. Always pass `time`. `[V: reconciling marketplace#65 with the dr docstring]`
- USGS says it plans a direct full-period-of-record download before the legacy services shut down. `[V: dr demo notebook]`

---

## 2. USGS NLDI (river-network tracing; precomputed offline)

| Item | Value | Tag |
|---|---|---|
| Base | `https://api.water.usgs.gov/nldi/linked-data` | [V: dr-1.4.0 `nldi.py` `NLDI_API_BASE_URL`; pynhd-0.20.0 `nldi.py` base `https://api.water.usgs.gov/nldi`] |
| Data-source catalog | `GET {base}/`: list of `{source, sourceName, features}` | [V: dr src `_validate_data_source`] |
| Point to catchment COMID | `GET {base}/comid/position?coords=POINT(-97.68 30.18)&f=json`: the NHDPlusV2 **catchment containing** the point (lon/lat read as NAD83) | [V: api.water.usgs.gov/docs/nldi via search; dr src] |
| Point to flowline (**use this for crossings**) | `GET {base}/hydrolocation?coords=POINT(lon lat)`: a linear reference on a flowline. **Snaps if within 200 m**; otherwise traces downhill on an elevation surface. Returns an indexed point with `comid` and `measure`. | [V: docs/nldi/basin via search; pynhd `comid_byloc` uses `hydrolocation` and keeps `source=="indexed"`] |
| Feature lookup | `GET {base}/nwissite/USGS-08159000` | [V: pynhd/dr src pattern `{base}/{source}/{id}`] |
| Navigation | `GET {base}/{featureSource}/{featureId}/navigation/{UM\|UT\|DM\|DD}/{dataSource}?distance={km}`. Origin may be `comid/{comid}`. | [V: dr src `_navigation_request`] |
| Upstream gauges (core FordCast query) | `GET {base}/comid/{comid}/navigation/UT/nwissite?distance=100` | [V: pattern] |
| Upstream flowlines | `GET {base}/comid/{comid}/navigation/UT/flowlines?distance=100&trimStart=true` (also `stopComid`, `trimTolerance`) | [V: dr/pynhd src] |
| Modes | `UM` upstream mainstem, **`UT` upstream with tributaries**, `DM` downstream mainstem, `DD` downstream with diversions | [V: dr `_VALID_NAVIGATION_MODES`] |
| `distance` | Kilometers. pynhd validates 1–9999. dr defaults are 5 (flowlines) and 50 (features). | [V] |
| Basin | `GET {base}/{featureSource}/{featureId}/basin?simplified=true&splitCatchment=false`. **`splitCatchment=true`** splits the catchment at the exact point, which is needed for a crossing in the middle of a catchment. | [V: dr `get_basin`; pynhd `get_basins`] |
| Feature sources | `comid`, `nwissite` (NWIS surface-water sites), `nwisgw`, `WQP`, `huc12pp`, `ref_gage`, `gfv11_pois`, `wade`, `vigil`, `ca_gages`, `nmwdi-st` | [V: pynhd docstring] |

**Python:**
- `pynhd==0.20.0` (2026-04-05): `NLDI().comid_byloc(coords)`, `feature_byloc`, `navigate_byid(fsource, fid, navigation, source, distance)`, `navigate_byloc`, `get_basins(ids, fsource="nwissite", split_catchment, simplified)`, `getfeature_byid`.
- `dataretrieval.nldi` offers `get_flowlines`, `get_basin`, `get_features`, and `search`.
- `[V: PyPI + src]`

**Caveats (design for them):**
1. NLDI uses **NHDPlusV2 (medium resolution, about 1:100k)**. Very small urban creeks or headwaters may have **no flowline**: Waller Creek tributaries, storm drains, many small Travis County crossings. NOAA notes NWM reaches are missing in "many urban centers." `[V: NOAA storymap via search]`
   - Keep a **manual override table**: `crossing_id → comid / upstream gauges / τ`.
   - Show "no upstream gauge" crossings as **Unknown**, never as calm.
2. `nwissite` returns **all** NWIS surface-water sites, including inactive and discontinued ones. Intersect with `combined-metadata` (active `00065` continuous, `end` within the last 2 days) before using them. [U: the inactive-site behavior is inferred]
3. `comid/position` returns the **catchment**, which can belong to the wrong side of a confluence. **Prefer `hydrolocation`**, then eyeball each snapped crossing on a map (part of the v4 plan).
4. Navigation is costly. **Precompute once** (offline notebook) and store as GeoJSON/Parquet plus Postgres rows. **No NLDI calls at runtime.**
5. NLDI is a USGS research service with no SLA. Cache all results in the repo, `data/nldi_cache/*.geojson`, so the build never depends on it during judging.

---

## 3. Crossing locations and official status (ground truth and override)

### 3.1 Sources, ranked

| # | Source | What it is | Access | Tag |
|---|---|---|---|---|
| 1 | **City of Austin `INLANDWATERS_flood_low_water_crossings`**, Socrata id **`q6kt-v2zm`** (alternate view `juvk-qass`) | "Locations for low water crossing gates maintained by the City"; part of the FEWS inventory; **22 records**; last updated 2026-03-17 | Columns `https://data.austintexas.gov/api/views/q6kt-v2zm/columns.json`; export `https://data.austintexas.gov/api/v3/views/q6kt-v2zm/export.geojson` (also `.csv`, `.kml`); query `/api/v3/views/q6kt-v2zm/query.json` (**SODA3 requires `X-App-Token`**); likely SODA 2.1 `https://data.austintexas.gov/resource/q6kt-v2zm.json` [U] | [V: catalog.data.gov / geohub snapshots via search; SODA3 token rule: support.socrata.com] |
| 2 | **City of Austin ArcGIS FeatureServer** | Same layer as an ArcGIS service | `https://services.arcgis.com/0L95CJ0VTaxqcmED/ArcGIS/rest/services/INLANDWATERS_flood_low_water_crossings/FeatureServer`; query `…/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson` (layer index `0` [U]); read fields from `…/FeatureServer/0?f=pjson` | Service existence [V: search]; fields [U] |
| 3 | **Travis County Public Works MapServer** | County low-water crossings: layer **0 "Low Water Crossing (Bridge)"**, layer **1 "Low Water Crossing"**; maxRecordCount 1000; JSON/GeoJSON/PBF | `https://gis.traviscountytx.gov/server1/rest/services/Public_Works/Low_Water_Crossings/MapServer/1/query?where=1%3D1&outFields=*&outSR=4326&f=geojson` | [V: search snapshot]; fields [U] |
| 4 | **TxGIO statewide Low_Water_Crossing** | Start of a statewide inventory; fields begin `objectid`, `fips` | `https://feature.geographic.texas.gov/arcgis/rest/services/Basemap/Low_Water_Crossing/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson&geometry=-98.2,29.95,-97.4,30.7&geometryType=esriGeometryEnvelope&inSR=4326` | [V: search]; query params are standard ArcGIS [U] |
| 5 | **OpenStreetMap fords** | Community-mapped `ford=*` and legacy `highway=ford` | Overpass, §3.3 | [V: OSM wiki Key:ford] |
| 6 | **"Low Water Crossings That Flood"** (data.gov) | Older City dataset: about 22 rows, 13 columns (crossing type, description, gage number, coordinates) per a 2022 mirror | Socrata id not found | [U] |

**Recommendation:**
- Build `crossings` as the **union of sources 1–4 plus OSM**, deduplicated within 30 m, with `source` and `jurisdiction` columns.
- **MVP shortlist** = the 10–20 crossings that have ground truth (a City gate or gauge, or a USGS gauge at the road). That matches the v4 build plan.

### 3.2 ATXfloods (official live status)

- **Statuses shown publicly:** "Closed", "Open", "Caution". `[V: atxfloods.com/crossings snapshot via search]` A "Long-Term Closure" status is `[U]`.
- **Coverage:** described as covering **15 jurisdictions**, including greater Travis, Bastrop, and Hays counties. `[V: news snapshot via search]` During storms, closure counts exceed 90 (93 closed in one event). `[V: news]`
- **Backend (open source):** the City of Austin repo `cityofaustin/ctxfloods-backend` is a serverless AWS Lambda stack. `[V: raw serverless.yml + handlers on GitHub]`
  - `POST graphql`: PostGraphile GraphQL API. Some mutations need a JWT; public read queries likely exist [U].
  - `GET xml`: legacy XML from SQL `floods.legacy_xml()`.
  - `GET waze/feed`: JSON from `floods.waze_feed()`, shaped `{incidents:[{id, location:{street, polyline, direction}, type, subtype, starttime, description, reference}]}`.
  - `synclegacy` runs every 5 minutes; `scrapeCameras` runs every 5 minutes.
- **What is unknown:** the **public hostnames** of these endpoints and the terms of use `[U]`.
- **Action plan:**
  1. Open `https://www.atxfloods.com/crossings` in browser devtools and record the GraphQL host and query names.
  2. Email City of Austin Watershed Protection / FEWS to ask permission. This is also good impact evidence.
  3. If permission is granted, poll every 2–5 minutes, map Closed and Long-term to **Flooded/Closed**, map Caution to **Watch** (an official override can only *add* caution), and **never map "Open" to "safe"**. "Open" only means "no official closure," and the model's state still shows.
  4. If access is not granted, show a deep link "Official status: ATXfloods.com" on every Crossing Card. **Do not scrape it without permission.**

### 3.3 OSM Overpass fallback (one-time, cached)

```
[out:json][timeout:90];
(
  node["ford"](29.95,-98.20,30.70,-97.40);
  way["ford"](29.95,-98.20,30.70,-97.40);
  node["highway"="ford"](29.95,-98.20,30.70,-97.40);
);
out center tags;
```

- Endpoint: `https://overpass-api.de/api/interpreter` (POST `data=`). `[U: well-known public instance; check its fair-use page]`
- Tag semantics:
  - `ford=yes` is the general value.
  - A ford can be a **node** shared by the road and the stream, or a **way** segment between riverbanks.
  - Use `depth=*` as the normal depth when present.
  - `[V: OSM wiki Key:ford]`
- License: **ODbL 1.0**. Attribute "© OpenStreetMap contributors". Share-alike applies to a derived *database*.

---

## 4. NOAA NWPS API (NWS official gauges, flood categories, impact statements, NWM)

| Item | Value | Tag |
|---|---|---|
| Base | `https://api.water.noaa.gov/nwps/v1` | [V: hydrotools#250; river-wise README] |
| Docs (OpenAPI 3.0) | `https://api.water.noaa.gov/nwps/v1/docs/` | [V: NWPS flyer + hydrotools#250] |
| Gauge list in a box | `GET /gauges?bbox.xmin=-98.2&bbox.ymin=29.95&bbox.xmax=-97.4&bbox.ymax=30.7&srid=EPSG_4326` returns `{gauges:[{lid, name, usgsId, county, …}]}` | [V: river-wise-card.js params; `usgsId` and `county` from aguayluz-pr#332] |
| Gauge metadata | `GET /gauges/{identifier}`. **Accepts an NWS LID or a USGS site number** (e.g. `/gauges/01013500` returns FIHM1). **This is the USGS-to-LID crosswalk.** | [V: hydrotools#250] |
| Observed + forecast | `GET /gauges/{id}/stageflow`, `/stageflow/observed`, `/stageflow/forecast` | [V: river-wise README; NWPS flyer] |
| Ratings | `GET /gauges/{id}/ratings` | [V: NWPS flyer via search] ; params [U] |
| NWM reach | `GET /reaches/{reachId}`; `GET /reaches/{reachId}/streamflow?series=short_range` (also `medium_range`, `long_range`, `analysis_assimilation`) | `reachId` appears in gauge metadata [V: hydrotools#250]; exact path and `series` values [U] |

**Gauge metadata fields** `[V: river-wise-card.js + hydrotools#250 example]`:
- `lid`, `name`, `reachId`, `state.abbreviation`
- `status.observed.{primary, primaryUnit, secondary, secondaryUnit, validTime}`
- `status.forecast.{…}`. Its `validTime` is `"0001-01-01T00:00:00Z"` with status `fcst_not_current` when no forecast exists, so handle that case.
- `flood.categories.{action, minor, moderate, major}.{stage, flow}`, plus `flood.stageUnits` / `flowUnits`
- **`flood.impacts[] = {stage, statement}`**
- `images`, `dataAttribution`
- Flow is often given in **kcfs** (`secondaryUnit: "kcfs"`), while flood thresholds use cfs. Normalize units.

**Stageflow fields:** `data[] = {validTime, generatedTime, primary (stage), secondary (flow)}`, plus `primaryUnits` and `secondaryUnits`. `[V: river-wise-card.js]`

**NWM behind NWPS:**
- Experimental.
- Serves the latest run plus a **3-day rolling archive** for short_range and medium_range, and **1 day** for long_range.
- Short range looks **18 h** ahead; medium range **10 days**.
- **No historical data except crest/low-water history.**
- **Not supported 24/7; may change without notice.**
- `[V: water.noaa.gov/about/api snapshot; NOAA comparison table via search]`
- Use NWM v3 short-range output only as a **"tonight's outlook" Roadmap** feature, not as the core signal.

**Austin-area NWS gauges (LIDs):**

| LID | Name | USGS | Flood categories / notes | Tag |
|---|---|---|---|---|
| **ATIT2** | Onion Creek at US 183 | 08159000 | Action **15**, Minor **17**, Moderate **23**, Major **27 ft**. Record crest **40.15 ft (2013-10-31)**; **39.22 ft (P) 2015-10-30** | [V: water.noaa.gov/gauges/atit2 snapshot] |
| **DRWT2** | Onion Creek near Driftwood | 08158700 | Upstream of ATIT2 | [V: NWSLI page via search] |
| ABTT2 | Barton Creek at Loop 360 near Austin | likely 08155300 | | name [V: HADS TX list]; USGS mapping [U] |
| BCCT2 | Barton Creek above Barton Springs at Austin | likely 08155400 | | name [V]; mapping [U] |
| LCKT2 | Barton Creek at Lost Creek Blvd near Austin | [U] | | name [V] |
| AHOT2 | Shoal Creek at W 12th St | likely 08156800 | | name [V]; mapping [U] |
| AAIT2 | Williamson Creek at Manchaca Rd | likely 08158930 | | name [V]; mapping [U] |
| WART2 | Waller Creek at Red River St | [U] | **Stage only, no valid rating** | [V] |
| (by USGS id) | Bull Creek above Loop 360 | 08154700 | **Impacts:** at **9 ft**, FM 2222 / Shoal Creek bridge dangerous and "several low crossings flood from headwaters to Town Lake"; at **13 ft**, widespread flooding of secondary roads and low bridges. Crests **5.07 ft (2025-07-05)**, **5.71 ft (2019-05-08)** | [V: water.noaa.gov/gauges/08154700 snapshot; paraphrased] |
| (Colorado River at Austin) | Colorado River at Austin | 08158000 | LID not found; **regulated by Lake Travis since 1937** | [U] LID; regulation [V: USGS HCDN] |

**How to map USGS sites to LIDs (recommended):**
- Call `GET /gauges/{usgs_site_no}` for each candidate gauge once.
- Store `lid`, `reachId`, `flood.categories`, and `flood.impacts`.
- Refresh daily.
- Runner-up: the bbox list, using the `usgsId` field.

**Impact statements as ground truth:** search `flood.impacts[].statement` for `/low water crossing|crossing|road|bridge/i` to get a **stage at which a named road floods**. Store it as `crossing_threshold_stage` with `source="NWS impact"`. This is the cheapest legitimate "water over road" label for crossings without sensors.

---

## 5. NWS alerts API (area warnings as context, never as crossing status)

| Item | Value | Tag |
|---|---|---|
| Endpoint | `GET https://api.weather.gov/alerts/active?point={lat},{lon}`: resolves the county and zone alerts for that point | [V: weather.gov/documentation/services-web-alerts via search] |
| Other filters | `?zone=TXC453` (UGC county; Travis FIPS 48453), `?area=TX`. `?event=Flash%20Flood%20Warning` [U] | zone/area [V: docs]; Travis UGC code [U: confirm via `/zones/county/TXC453`] |
| Deprecated | `/alerts?active=1`; use `/alerts/active` | [V] |
| **User-Agent required** | No key, but a descriptive `User-Agent` such as `FordCast/1.0 (contact: you@example.com)` is required. Missing or generic agents get **403**. | [V: search of NWS docs] |
| Accept | `application/geo+json` | [V: well-known] |
| Event names to subscribe to | `"Flash Flood Warning"`, `"Flash Flood Watch"`, `"Flood Advisory"`, `"Flood Warning"`, `"Flood Watch"`, `"Flash Flood Statement"`, `"Flood Statement"` | "Flash Flood Warning" literal [V: live CAP sample via search]; others [U: standard NWS names] |
| Flash Flood **Emergency** | **Not a separate event.** It is a Flash Flood Warning whose damage-threat tag is **CATASTROPHIC** (the headline says "FLASH FLOOD EMERGENCY"). Tags are Base / CONSIDERABLE / CATASTROPHIC; WEA phone alerts go only to CONSIDERABLE and CATASTROPHIC. Parameter keys are `flashFloodDamageThreat` and `flashFloodDetection` (RADAR INDICATED / OBSERVED). | [V: NWS Flash-Flood IBW guide + product example via search]; exact JSON location in `properties.parameters` [U] |
| Key properties | `id, areaDesc, geocode{SAME,UGC}, affectedZones[], references[], sent, effective, onset, expires, ends, status, messageType, category, severity, certainty, urgency, event, senderName, headline, description, instruction, response, parameters{…}`. Storm-based warnings have a polygon `geometry`; zone-based alerts have `geometry: null`, so fetch zone shapes from `/zones/...` | [U: standard CAP-JSON; confirm with a live sample] |
| **Spanish** | api.weather.gov alert text is **English**. NWS AI translation (Lilt) for Spanish/Chinese web products was **paused in 2025 when its contract lapsed, then restarted**. A 2026 GAO report says AI translations are **not used for WEA/EAS** (Spanish WEA uses templates). | [V: Grist, Houston Landing, Nextgov 2026-01 via search] |

**Spanish plan:**
- Ship **curated Spanish strings per event type**, reviewed by a fluent speaker.
- Speak FordCast's own short template ("Inundación probable pronto en [cruce]…"), not machine-translated NWS free text.
- Exact official NWS Spanish names for event types: **[U]**. Search results conflict ("Aviso" vs. "Advertencia de inundación repentina"). Have them checked.

---

## 6. MRMS radar rainfall (Stretch: basin-rain features; Replay for 2020+)

| Item | Value | Tag |
|---|---|---|
| Bucket | **`s3://noaa-mrms-pds`** (us-east-1), anonymous: `aws s3 ls --no-sign-request s3://noaa-mrms-pds/`; HTTPS `https://noaa-mrms-pds.s3.amazonaws.com/` | [V: AWS Open Data registry yaml on GitHub] |
| New-object SNS | `arn:aws:sns:us-east-1:123901341784:NewMRMSObject` (Lambda/SQS only) | [V: registry yaml] |
| Cadence | "Real-time with a **2-minute** update cycle" for the suite | [V: registry yaml] |
| AWS archive start | **2020-10-14**. That day MRMS moved from v11 to v12; "use caution with v11 products before Oct 14, 2020." | [V: registry yaml; GribStream; OU CAPS list] |
| Key layout | `CONUS/{Product}/{YYYYMMDD}/MRMS_{Product}_{YYYYMMDD-HHMMSS}.grib2.gz` | [V: Pythia MRMS cookbook ch3 code: `noaa-mrms-pds/CONUS/{product}/{date_str}/` + `f"MRMS_LayerCompositeReflectivity_Low_00.50_{ts}.grib2.gz"`; NCEP filename `MRMS_MultiSensor_QPE_01H_Pass2_00.00_20260923-020000.grib2.gz`] |
| Products | **`PrecipRate_00.00`** (instant rate, mm/h, 2-min); **`RadarOnly_QPE_01H_00.00`** (radar-only 1-h accumulation); **`MultiSensor_QPE_01H_Pass1_00.00`** (gauge-corrected, ~1 h latency); **`MultiSensor_QPE_01H_Pass2_00.00`** (~2 h latency, best quality); also `_03H/_06H/_12H/_24H` and `RadarOnly_QPE_24H_00.00` | [V: Pythia cookbook ch1 product table] |
| Grid | CONUS **7000 × 3500**, **0.01°** (~1 km). Latitude 54.995 to 20.005 N; **longitude in 0–360 (230.005 to 299.995)**, so convert −97.7 to 262.3. Origin at the upper-left. **−3 = no coverage/missing** (distinct from 0 mm). | [V: THREDDS listing + pysteps docs via search] |
| Decode | `gzip.decompress` to a temp `.grib2`, then `xr.load_dataarray(path, engine="cfgrib", decode_timedelta=True)`. The variable name is `unknown`; rename it from the filename. | [V: Pythia cookbook ch3] |
| Packages | `cfgrib==0.9.15.1` (needs ecCodes; `eccodes==2.49.0` wheel on PyPI), `xarray==2026.9.0` (Python ≥ 3.11), runner-up `pygrib==2.1.8` | [V: PyPI JSON 2026-10-14] |
| Pre-2020 archive (2013/2015/2018 replay) | Iowa Environmental Mesonet MTArchive: `https://mtarchive.geol.iastate.edu/{YYYY}/{MM}/{DD}/mrms/ncep/{Product}/`, **from about Oct 2014** (NCEP era). The v11 1-h gauge-corrected product is **`GaugeCorr_QPE_01H`** (directories exist for 2017-08-25 and 2020-10-04). **The 2013 storm predates this archive**, so 2013 replay is gauge-only. | [V: IEM archive page + directory listings via search]; filenames [U] |
| IEM change | IEM scaled its own hourly zip cache back to a 30-day rolling window. MTArchive is said to be unaffected [U]. | [V: IEM news] |

**Basin-average recipe:**
1. Precompute, per crossing, the mask of 0.01° cells inside its NLDI basin polygon (`regionmask` or `rasterio.features`).
2. Each tick, average `RadarOnly_QPE_01H` (live) or `MultiSensor_QPE_01H_Pass2` (training) over the mask.
3. Store `rain_1h/3h/6h` per basin.
4. Store only the **Austin crop**, about 80 × 80 cells. Never store the CONUS grids.

**Lightweight fallback, Open-Meteo:**
- `GET https://api.open-meteo.com/v1/forecast?latitude=30.27&longitude=-97.74&minutely_15=precipitation&past_minutely_15=24&forecast_minutely_15=8&timezone=UTC`
- **15-minutely data for North America comes from HRRR.** The `past_minutely_15` / `forecast_minutely_15` parameter names are [U].
- **Free tier is non-commercial only**, under 10,000 calls/day, 5,000/hour, and 600/minute. Data license **CC BY 4.0**; credit "Weather data by Open-Meteo.com". `[V: open-meteo.com/en/terms; Open-Meteo blog]`
- Recommendation: use Open-Meteo for the **MVP demo** (a JSON call per basin centroid) and MRMS for the **Stretch**.

---

## 7. LCRA Hydromet (Roadmap; needed for the 2025 Sandy Creek replay)

- **What it is:**
  - 280+ automated river and weather gauges in the lower Colorado basin, including City of Austin sites.
  - Data is **provisional**.
  - The historical page limits requests to **less than 180 days**.
  - The media page lists CSV/TXT files (e.g. `Rainfall.csv`, `mediarn.txt`).
  - `[V: hydromet.lcra.org snapshots via search]`
- **Undocumented JSON:** the third-party MIT package `lcra==0.4.0` (2026-07-17) calls `https://hydromet.lcra.org/api/FloodStatus/GetLakeLevelsGateOps`, `/api/GetForecastReferences` (`sites[]` with `location, stage, flow, bankfull, floodStage, dateTime`), and `/api/FloodStatus/GetNarrativeSummary`. `[V: lcra-0.4.0 wheel source]` These are **not documented by LCRA; terms of use [U]**.
- **Why it matters:** in July 2025, **Big Sandy Creek at Jonestown (an LCRA gauge)** rose from **6 ft at 1 a.m. to more than 21 ft by 4 a.m.** on July 5. `[V: Austin American-Statesman timeline via search]` That event's best gauge is LCRA's, not USGS's.
- **Recommendation:**
  - Email LCRA for permission. Pull **one-time** CSVs from the Historical Data page for the July 2025 replay.
  - Live LCRA polling stays **Roadmap**.
  - Never let the app depend on an undocumented endpoint during judging.

---

## 8. Austin gauge table (USGS)

The agent must regenerate this table programmatically:
- `waterdata.get_combined_metadata(bbox=[-98.20,29.95,-97.40,30.70], parameter_code="00065", data_type="Continuous values")`
- Keep series whose `end` is within 2 days.
- Fill lat/lon from `monitoring-locations`.

Where I had no lat/lon, the cell says "from API".

| Site | Name (USGS) | Lat, Lon | Key facts | NWS LID | Use in FordCast | Tag |
|---|---|---|---|---|---|---|
| 08154700 | Bull Ck at Loop 360 nr Austin | from API | DA 22.3 mi²; land-surface altitude 535.05 ft NAVD88; NWS impacts at 9/13 ft; crests 5.07 ft (2025-07-05), 5.71 ft (2019-05-08) | (via USGS id) | Bull Creek crossings (Loop 360/2222 corridor) | [V] |
| 08154750 | W Bull Ck at Loop 360 nr Austin | from API | West Bull tributary | – | Upstream of Bull Ck | [V name] |
| 08155200 | Barton Ck at SH 71 nr Oak Hill | from API | DA 89.7 mi²; most upstream Barton gauge | – | Upstream trigger for Barton | [V] |
| 08155300 | Barton Ck at Loop 360, Austin | from API | Gage datum 511.11 ft NAVD88 | ABTT2 [U map] | | [V] |
| 08155400 | Barton Ck abv Barton Spgs at Austin | from API | DA 125 mi²; often dry (no flow 38% of 2005–present) | BCCT2 [U map] | | [V] |
| 08156800 | Shoal Ck at W 12th St, Austin | **30.276598, −97.7503052** | DA 12.3 mi²; datum 455.45 ft NAVD88; record **23.11 ft (1981)** | AHOT2 [U map] | Urban flashy creek | [V] |
| 08157000 | Waller Ck at 38th St, Austin | from API | DA 2.31 mi² | – | Very small; may lack an NHDPlus reach | [V] |
| 08157500 | Waller Ck at 23rd St | – | Historical record only (1950s–70s); **not confirmed active** | – | Do not use | [U] |
| (unknown) | Waller Ck at Red River St | – | Stage only, no rating | WART2 | | [V NWS] |
| 08158000 | Colorado Rv at Austin | from API | Datum 391.96 ft NAVD88; **99% regulated by Lake Travis since 1937** | [U] | **Not** a creek-crossing predictor | [V] |
| 08158030 | Boggy Ck at Manor Rd | from API | | – | | [V name] |
| 08158045 | Ft Br Boggy Ck at Manor Rd | from API | | – | | [V name] |
| 08158050 | **Boggy Ck at US Hwy 183** | from API | (Not 08158100) | – | | [V] |
| 08158100 | Walnut Ck at FM 1325 nr Austin | from API | Upper Walnut | – | Upstream trigger | [V] |
| 08158200 | **Walnut Ck at Dessau Rd** | from API | (Not 08158380) | – | | [V] |
| 08158380 | **Little Walnut Ck at Georgian Dr** | from API | | – | | [V] |
| 08158400 | Little Walnut Ck at IH 35 | from API | | – | | [V name] |
| 08158500 | Little Walnut Ck at Manor Rd | from API | | – | | [V name] |
| 08158600 | Walnut Ck at Webberville Rd | from API | | – | Lower Walnut | [V] |
| 08158640 | Walnut Ck SP RR Bridge | from API | | – | | [V name] |
| 08158650 | Colorado Rv bl Austin | from API | | – | | [V name] |
| 08158700 | **Onion Ck nr Driftwood** | ≈30.08, −98.01 | Datum 868.52 ft NAVD88; record peaks in Oct 2015 | DRWT2 | **Primary upstream trigger for Onion Creek** | [V] |
| 08158810 | **Bear Ck bl FM 1826 nr Driftwood** | from API | (Not "Williamson Ck at Oak Hill") | – | Onion tributary | [V] |
| 08158820 | Bear Ck at FM 1626 nr Manchaca | from API | | – | | [V name] |
| 08158825 | Little Bear Ck at FM 1626 nr Manchaca | from API | DA 21.0 mi² (Hays Co.) | – | | [V] |
| 08158840 | Slaughter Ck at FM 1826 nr Austin | from API | DA 8.24 mi²; datum 876.25 ft; **USGS webcam** | – | | [V] |
| 08158860 | Slaughter Ck at FM 2304 nr Austin | from API | DA 23.1 mi²; datum 656.16 ft | – | | [V] |
| 08158922 | Williamson Ck at Brush Country Blvd, Oak Hill | from API | DA 6.79 mi² (08158920 not found) | – | Upper Williamson | [V] |
| 08158930 | Williamson Ck at Manchaca Rd, Austin | from API | Datum 618.63 ft NAVD88 | AAIT2 [U map] | | [V] |
| 08158970 | Williamson Ck at Jimmy Clay Rd | from API | DA 27.6 mi² | – | Lower Williamson | [V] |
| 08159000 | **Onion Ck at US Hwy 183, Austin** | from API | DA 321 mi²; datum 443.28 ft NAVD88; cooperative with City of Austin; **2013 ≈40.15–41 ft, ~120,000 cfs**; 2015-10-30 39.22 ft | **ATIT2** | **Hero gauge for Storm Replay** | [V] |
| 08171000 | Blanco Rv at Wimberley | from API | 2015: last reading ~40.21 ft before washout; USGS estimate **44.9 ft / 175,000 cfs** | [U] | Outside TX-10; context only | [V] |
| Gilleland Ck, Brushy Ck, Cypress Ck, Big/Little Sandy Ck | – | – | **Not verified** as USGS continuous gauges. Big Sandy at Jonestown is an **LCRA** gauge. | – | Use the API inventory | [U] |

**Datum note:**
- `00065` is stage above a **local gauge datum**.
- To compare with a road elevation, compute **elevation = stage + datum**. Store `datum_ft` and `datum_name` per site from `monitoring-locations` (the altitude fields) [U field names].

**Reliability note:** a USGS page said real-time data was "not transmitting for approximately 25–30% of sites" because of a satellite issue (date unclear). Third-party trackers flagged several Austin gauges as stale in Aug 2026. `[V: search snippets; [U] current]` **Staleness handling is mandatory.**

---

## 9. Storm Replay catalog

The times below are local (CDT). Store everything in UTC.

| Storm | When | Creeks / gauges that show it | Peak / facts | Replay notes | Tag |
|---|---|---|---|---|---|
| **Halloween 2013** | Oct 30–31, 2013; Onion Ck peak morning of Oct 31 | 08158700 Driftwood (upstream), 08159000 US 183; also Bear, Slaughter, Williamson | US 183 **40.15 ft (NWS) / ~41 ft (USGS)**, ~120,000 cfs. Gauge **stopped transmitting ~06:15 at 21 ft**; rose **11 ft in 15 min (06:15–06:30)**; back ~2.5 h later near 40 ft. About 5 deaths, ~660 structures. | **Best Q4 story:** a real upstream-to-downstream lag (Driftwood to US 183) plus a real data gap that shows **Unknown**. **No MRMS** (predates the IEM archive), so gauge-only. | [V: USGS alert 2013-10-31; Statesman 2013-11-10; PolitiFact 2013-11-14; NWS ATIT2] |
| **Memorial Day 2015** | Rain ~19:00 UTC May 23 to 10:00 UTC May 24, 2015 | Blanco at Wimberley 08171000 (washed out); Onion Ck at US 183 (crest **~22.9 ft**, listed 05-26-2015 by NWS); Driftwood | Wimberley last reading ~40.21 ft (37.58 ft at 00:30 May 24); USGS estimate 44.9 ft / 175,000 cfs | Moderate Onion response; MRMS from IEM (GaugeCorr_QPE_01H) [U availability] | [V: NOAA repository paper; Wimberley View; KXAN; NWS crest list via search] |
| **Oct 30, 2015 ("Halloween 2015")** | Oct 30, 2015 | 08158700 Driftwood (**record peak**), 08159000 US 183 | US 183 **39.22 ft (P)**; Austin-Bergstrom **14.99 in** daily rain; LCRA gauge at Onion/US 183 logged **13.40 in in 3 h**; 3–4 deaths | **Strong second training/test storm** for the event-based split | [V: NWS ATIT2; weather.com; NWS loss report; USGS news via search] |
| **Oct 16, 2018 Llano** | Early Oct 16, 2018 | Llano River at Llano (39.91 ft, highest since 1935); FM 2900 bridge at Kingsland destroyed; 150+ crossings closed regionally | | **Low value for Austin creek crossings**: it is the Llano/Colorado, and the river is regulated below the dams. Use it only as a "the app stays calm where it should" case, or skip it. | [V: KXAN, KUT, floodlist via search] |
| **July 4–5, 2025** | FFW 13:30 Jul 4 (NW Travis / SW Williamson); around midnight 3–5 in/h, then a **Flash Flood Emergency** for western Travis 41 min later; FFE for Burnet/W Williamson/W Travis until 10:00 Jul 5 | **Big Sandy Ck at Jonestown (LCRA)**: 6 ft at 01:00 to >21 ft by 04:00 Jul 5; **Bull Ck 08154700** crest 5.07 ft; N. Fork San Gabriel nr Leander was the flood of record (Halff) | 15–20 in bullseye on Cow Ck / Big Sandy headwaters; 10.65 in at one gauge before 04:00; about 9 deaths in the Sandy Creek area | **Best MRMS replay** (AWS v12 Pass2 exists). Sandy Creek needs **LCRA** data. **Alert replay**: the warning timeline is a great overlay. | [V: Statesman timeline; KUT; Texas Tribune; Halff; NWS via search] |
| Others to check | May 8, 2019 (Bull Ck 5.71 ft); Memorial Day 1981 (Shoal Ck record 23.11 ft) | | | 1981 predates the 15-min record, so it cannot be replayed | [V] / [U] |

**No-lookahead rules for the `StormReplay` DataSource:**
1. A reading becomes visible at `time + latency_site` (default 60 min for satellite gauges; calibrate it).
2. No future `approval_status` revisions: use the values as fetched, and note that today's archive is **approved** data, not what was live then.
3. NWS alerts are visible from `sent`.
4. MRMS Pass2 is visible at about `valid + 2 h`, RadarOnly at about `valid + 5 min`.
5. Precompute nothing that uses whole-storm statistics, such as normalizing by the storm's peak.

---

## 10. Licensing, attribution, polite use

| Source | License / terms | Attribution text | Polite use | Tag |
|---|---|---|---|---|
| USGS Water Data / NLDI | U.S. public domain; provisional-data disclaimer | "Data: U.S. Geological Survey, Water Data for the Nation (provisional, subject to revision)" | API key, `X-Api-Key`, handle 429 with backoff, ≤1,000 req/h, batch by bbox | [V: provisional statement in dr docstrings]; PD status [U: standard USGS policy] |
| NOAA NWPS / NWS API | U.S. public domain | "Source: NOAA/NWS" | **User-Agent with contact required**; poll ≥ 60 s | [V] UA |
| NOAA MRMS (NODD/AWS) | "Open to the public and can be used as desired." Attribution requested; **no implied NOAA endorsement**. OU retains commercial licensing rights to the MRMS system. | "Radar rainfall: NOAA MRMS via NOAA Open Data Dissemination" | Read only the files you need | [V: registry yaml] |
| City of Austin Open Data | Portal terms [U] (confirm on data.austintexas.gov) | "Source: City of Austin Open Data Portal" | Socrata app token (`X-App-Token`) | [U] |
| ATXfloods | **No published API terms [U]**: ask permission | "Official status: ATXfloods (City of Austin)" | Don't scrape without OK | [U] |
| Travis County GIS / TxGIO | Agency terms [U] | Name the agency | One-time pulls | [U] |
| OSM | **ODbL 1.0** | "© OpenStreetMap contributors" | Overpass fair use; cache | [V: ODbL widely documented] |
| Open-Meteo | **CC BY 4.0**; free tier **non-commercial**; <10k/day, 5k/h, 600/min | "Weather data by Open-Meteo.com" | Fits CAC (non-commercial) | [V] |
| LCRA Hydromet | Provisional; terms [U] | "Data: LCRA Hydromet" | Ask permission; Roadmap | [U] |

---

## 11. Recommended ingestion cadence and request budget

| Source | Live cadence | Calls per hour | Storage | Tier |
|---|---|---|---|---|
| USGS `latest-continuous` (bbox, 00065 + 00060) | **Every 5 min** (matches v4 "LIVE every 5 min") | 12–24 | Upsert `readings(site, param, time, value, fetched_at)`; dedupe on `(time_series_id, time)` | MVP |
| USGS `continuous` (gap backfill, last 6 h per site with gaps) | On startup and whenever a gap is detected (≤ 1/h/site) | ≤ 30 | Same table | MVP |
| USGS `combined-metadata` / `monitoring-locations` | Daily | <1 | `gauges` | MVP |
| NWS `/alerts/active?zone=…` or `?point=` (one call for the 3-county zone list) | **Every 2 min** | 30 | `alerts(id, event, sent, expires, geometry, damage_threat)` | MVP |
| NWPS `/gauges/{id}` (categories, impacts, LID) | Daily, plus at storm start | <2 | `nws_gauges` | MVP |
| NWPS `/gauges/{lid}/stageflow/forecast` (ATIT2, DRWT2, …) | Every 15 min when any alert or rise is active, else hourly | ≤ 40 | `nws_forecasts` | Stretch |
| ATXfloods (only with permission) | Every 2–5 min | 12–30 | `official_status(crossing, status, updated_at)`, which **overrides the model** | MVP if granted |
| City / County / TxGIO crossing layers | Weekly (manual refresh script) | ~0 | `crossings` | MVP |
| Open-Meteo `minutely_15` per basin centroid (≤ 20 basins) | Every 15 min | ≤ 80 (well under 5,000/h) | `basin_rain` | MVP fallback |
| MRMS `RadarOnly_QPE_01H` (latest file) | Every 10 min | 6 GETs (~1–2 MB each) | Austin crop only | Stretch |
| NLDI | **Offline only** | 0 | Repo cache + `crossing_upstream` table | MVP (precomputed) |
| NWM via NWPS `/reaches/.../streamflow` | Hourly | ≤ 20 | `nwm_outlook` | Roadmap |
| LCRA | No live polling; one-time historical CSV | 0 | Replay cache | Roadmap |

**Staleness rules (the safety principle, enforced in the backend):**
- **USGS:** Unknown if the newest reading is more than **2 h old**. A satellite gauge that reports hourly is "fresh" within about 75 min [U, calibrate].
- **NWS alerts feed:** Unknown banner if the feed is unreachable for more than 10 min.
- **ATXfloods:** if a feed is used, mark it stale after more than 15 min.
- Every API response the app receives carries `as_of` and `stale: bool`. The app renders the **gray dashed "Unknown — data offline"** state when stale.

**Render free tier caution:** a sleeping web service would stop the poller. Run the 5-minute ingester somewhere that stays awake through Nov–Dec judging, such as GitHub Actions cron (5-minute minimum, best effort), Supabase `pg_cron` with Edge Functions, or a paid always-on instance. [U: verify current free-tier sleep policies]

---

## 12. DataSource interface (how sources plug into the v4 pipeline)

```python
class DataSource(Protocol):
    async def stage_series(self, site_id: str, end: datetime, hours: int) -> Series: ...  # 00065, ft, UTC
    async def latest(self, site_ids: list[str], now: datetime) -> dict[str, Reading]: ...
    async def basin_rain(self, basin_id: str, end: datetime, hours: int) -> float | None: ...
    async def alerts(self, now: datetime) -> list[Alert]: ...
    async def official_status(self, now: datetime) -> dict[str, OfficialStatus]: ...

# LiveUSGS     -> api.waterdata.usgs.gov/ogcapi/v1 (+ NWS, NWPS, Open-Meteo/MRMS, ATXfloods if permitted)
# StormReplay  -> local Parquet cache built offline from `continuous` (+ MRMS Pass2/IEM, LCRA CSV, archived alerts),
#                 filtered by visible_at = time + latency <= replay_clock  (no lookahead)
```

Historic NWS alerts for replay: IEM keeps CAP/VTEC text archives, e.g. `https://mtarchive.geol.iastate.edu/2025/03/14/text/cap/2025031406_cap.txt` exists. `[V: search hit]` IEM's warning-polygon archive tools are [U].

---

## 13. Step 0 for the coding agent: live smoke test

Run these before writing app code. Paste the outputs into `docs/data-bridge-verification.md`.

1. `GET https://api.waterdata.usgs.gov/ogcapi/v1/collections?f=json` and confirm that `latest-continuous`, `continuous`, `monitoring-locations`, `time-series-metadata`, `combined-metadata`, and `peaks` exist.
2. The latest-continuous bbox request in §1.4. Confirm whether a GET accepts a comma list for `parameter_code`, record the `x-ratelimit-*` headers, and measure `now − time` per site (the latency calibration).
3. `continuous` for USGS-08159000, 00065, `2013-10-30T00:00:00Z/2013-11-01T00:00:00Z`. Confirm the 2013 gap around 11:15–13:45 UTC. Repeat for `2015-10-29/2015-11-01` and `2025-07-04/2025-07-06`.
4. `GET https://api.water.usgs.gov/nldi/linked-data/hydrolocation?coords=POINT(-97.6886 30.1757)` (example point near Onion Ck / US 183 [U]). Then `…/comid/{comid}/navigation/UT/nwissite?distance=100` and confirm that 08158700 appears.
5. `GET https://api.water.noaa.gov/nwps/v1/gauges/08159000` and confirm `lid == "ATIT2"`, the categories 15/17/23/27, and `flood.impacts`. Also `…/gauges/ATIT2/stageflow`, and `…/reaches/{reachId}/streamflow?series=short_range` (record the real path).
6. `GET https://api.weather.gov/alerts/active?point=30.2672,-97.7431` with a User-Agent. Then `GET /zones/county/TXC453` to confirm the Travis UGC code.
7. `GET https://data.austintexas.gov/api/views/q6kt-v2zm/columns.json` to record the real field names (gate id, gage number, coordinates). Also `…FeatureServer/0?f=pjson` and the Travis County `MapServer/1?f=pjson`.
8. `aws s3 ls --no-sign-request s3://noaa-mrms-pds/CONUS/RadarOnly_QPE_01H_00.00/` and decode one file around −97.7 (as 262.3), 30.27.
9. Open-Meteo `minutely_15=precipitation` for Austin, and confirm the past/forecast parameter names.
10. Open atxfloods.com/crossings in devtools and record any GraphQL/JSON endpoint and status vocabulary. **Do not use it until the City confirms.**

---

## 14. Sources used

- USGS `dataretrieval` 1.4.0 source, README, NEWS, and demo notebooks (PyPI sdist, 2026-10-02); `pynhd` 0.20.0 wheel source (PyPI)
- GitHub clemensv/real-time-sources#1673 (USGS decommission notice, 2026-10-09); DOI-USGS/dataRetrieval#934
- open-science-pillars/marketplace#65 (USGS API probe: limits, paging, headers)
- api.waterdata.usgs.gov /docs/ogcapi/keys, /docs/agents, /signup (search snapshots)
- api.water.usgs.gov/docs/nldi and /docs/nldi/basin (search snapshots)
- NOAA-OWP/hydrotools#250; TheWillMiller/river-wise (README + river-wise-card.js); jotaele44/aguayluz-pr#332
- water.noaa.gov gauges ATIT2, DRWT2, 08154700, WART2; HADS TX list; water.noaa.gov/about/api; NWPS API Flyer V6 (search snapshots)
- weather.gov alerts web-service docs; Flash-Flood IBW guide; PNS26-62 CAP transition notices (search snapshots)
- Grist, Houston Landing, Nextgov (NWS translation program)
- AWS Open Data registry `noaa-mrms-pds.yaml` (GitHub); ProjectPythia/mrms-cookbook ch1/ch3 notebooks (GitHub); THREDDS/pysteps MRMS grid docs; IEM MRMS archive pages
- Open-Meteo terms and blog
- cityofaustin/ctxfloods and ctxfloods-backend (serverless.yml, handlers); atxfloods.com/crossings snapshot; KUT 2025-07-16
- catalog.data.gov / geohub.austintexas.gov / data.austintexas.gov snapshots for `q6kt-v2zm`; Socrata SODA3 support pages; Travis County GIS and TxGIO MapServer snapshots
- `lcra` 0.4.0 wheel source (PyPI); hydromet.lcra.org snapshots
- USGS site pages (search snapshots) for each gauge in §8; USGS 2013 alert; Statesman, PolitiFact, KXAN, Wimberley View, NOAA repository (Blanco 2015 paper), weather.com, KUT, Texas Tribune, Halff (2025)
- OSM wiki Key:ford
