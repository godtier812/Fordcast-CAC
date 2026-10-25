# FordCast — Congressional App Challenge 2026 Submission Package (v4.2)

> **Entry district:** TX-37 *(Austin / Travis County & neighboring Williamson County portion — verify eligibility using your actual home or school address; pilot coverage is a separate question)* · **Builder:** [NAME], 9th grade, Python + TypeScript/React Native · **National deadline:** **Mon Oct 26, 2026, 9:00 PM ET / 8:00 PM Central**, checked October 22 on the [official registration page](https://www.congressionalappchallenge.us/students/student-registration/). An earlier district-page discrepancy remains unresolved; verify the submission portal and do not rely on a later date.
> Everything in `[brackets]` = fill in with **your real** personal details before submitting.

> **October 24 recording note:** The detailed shoot plan and honest Q&A are in
> `docs/results/cac-judge-round7-recording-ready-2026-10-24.md`. Preset geometry can fall
> back to a dated recording when Valhalla is unavailable; that mode blocks external
> navigation and sharing. Describe it as recorded geometry, never as a current detour.
> The first-person technical answers below are drafts: replace authorship statements
> with the student's actual contribution, consistent with `AI_USE.md`.

**App name:** **FordCast** — *ford* (a low-water crossing) + *forecast*. **Tagline:** **"Check the crossings on your trip."**

---

## 0. Strategy — read first *(internal; delete this section before submitting)*

### The decision: "real bridge" vs. "amazing UI + big words"

**Build a real, narrow, working bridge — then make the screens judges see look amazing. Never describe a backend or coverage footprint you didn't build.**

| | "Amazing UI + big words" | **"Working bridge + polished UI" ✅** |
|---|---|---|
| Demo video | Looks great until a judge asks *"is that real data?"* | **Real gauges, a real past storm, and honest measured numbers** |
| Code review | Repo doesn't match the claims → credibility gone | Every claim maps to a file and test |
| Q4 (difficulty) | Generic, sounds borrowed | Specific — physical crossing grouping + honest baseline comparison |
| Finalist / House of Code Q&A | You get asked about claims that exceed evidence | You can explain every line and limitation |
| Integrity | Claiming unbuilt features = misrepresentation | Built, Prototype, and Roadmap clearly separated |

### Tag every claim: **Built · Prototype · Roadmap**
- **Built** — works in the live app on real data → say it confidently.
- **Prototype** — works on replayed storms or the 6 primary-calibrated crossing records (across three research corridors) → say "experimental prototype."
- **Roadmap** — designed, not built → say "next" or "planned."

---

## 1. App Concept — IDEOLOGY + IMPACT

### The Problem

- **Texas led every state in flood deaths, 1959–2019: 1,069** — 376 more than #2 Louisiana (693). [S1]
- **570 Texas flood deaths in that period were vehicle-related.** They cluster in **Flash Flood Alley** (the Balcones Escarpment corridor through Travis County), peak **at night**, and hit **ages 20–29** hardest. [S2]
- **Nationally, over half of flood drownings happen when someone drives into floodwater.** [S3]
- **July 4, 2025:** the Guadalupe River at Hunt rose **26 feet in 45 minutes** [S4]; at least **135 Texans** died [S5], including **about 10 in Travis County**. [S6]
- **Central Texas has over 2,000 mapped low-water crossings** on ATXFloods (`2,052` records across Austin and surrounding counties), yet most lack automated road-surface flood sensors. [S7]

**The real gap is route-specific transparency.** Everyone in Central Texas has heard "Turn Around, Don't Drown," yet research has found no convincing evidence that the slogan alone reduced these deaths. [S8] Drivers need to know **which specific low-water crossings sit along their trip, what official closures or creek gauges currently report, and which crossings have no sensor at all**.

### How FordCast Differs from Existing Official Tools

| Tool | What it does | The gap FordCast addresses |
|---|---|---|
| **TxDOT DriveTexas** | State-maintained highway conditions, cameras, and routing | Focuses on state highways; does not audit municipal/county low-water crossings or expose per-crossing creek-sensor coverage gaps |
| **ATXFloods** | City/County low-water crossing map (`2,052` records) | Map-first pin inspection — drivers must manually hunt for pins along their commute rather than auditing a route corridor |
| **WEA / NWS Flash Flood Warnings** | Area-wide polygon alerts | Not crossing-specific — does not list which low-water crossings sit along your specific trip |
| **Google Maps / Waze** | Turn-by-turn navigation | Does not show which low-water crossings you will cross, whether those crossings lack sensors, or local NOAA flood history |

### The Solution (Built Trip-Audit Workflow + Experimental Gauge Research)

**FordCast is a Central Texas low-water-crossing trip-audit application built for TX-37 (Austin / Travis County & neighboring Williamson County), paired with an experimental upstream creek-gauge research module:**

1. **Commute Flood Exposure Audit (Built):** Checks any Austin-area route against `2,052` mapped ATXFloods crossings within 120 m, deduplicating multi-arm hardware records into physical crossing areas, surfacing nearby historical NOAA Storm Events flood reports within 2 km (from `727` geocoded Flash Flood / Flood events across 8 Central Texas counties, `1996-01-01` to `2026-06-15`), and explicitly flagging unmonitored crossings where no creek sensor exists.
2. **Multi-Source Hazard Rerouting + Google Maps Handoff (Built):** Combines live ATXFloods closures, active NWS Flash Flood Warning polygons, and USGS gauge triggers to request a Valhalla detour route and hand off up to 3 detour waypoints to Google Maps (plus a companion Chrome extension for desktop `google.com/maps`).
3. **Experimental Upstream Gauge Research (Prototype — 6 records across three research corridors):** Pairs `6` primary-calibrated crossing records (`is_primary: true` in `links.json` out of `30` R&D candidate crossings in the `141`-crossing study catalog) with `19` USGS gauges using schematic corridor connectors (`geometry_kind: schematic_corridor_connector`; crossing topology tagged `review_status: unverified_road_and_topology`): `tc-167` (**Henry Marx @ Barton Creek**, paired with upstream gauge `USGS-08155240` Barton Creek at Lost Creek Blvd and downstream reference gauge `USGS-08155300` Barton Creek at Loop 360), `atx-15` and `atx-16` (**Joe Tanner Ln @ Williamson Creek**, paired with upstream gauge `USGS-08158920` Williamson Creek at Oak Hill and downstream reference gauge `USGS-08158930` Williamson Creek at Jimmy Clay Rd), and `atx-19`, `atx-20`, `atx-21` (the 3 device records at **E. William Cannon Dr** on **Onion Creek** — `Slave Arm (W)`, `Master Standpipe`, `Slave Arm (E)` — paired with upstream gauge `USGS-08158860` Onion Creek at Twin Creeks Rd and downstream reference gauge `USGS-08159000` Onion Creek at US Hwy 183). Evaluates an out-of-sample Leave-One-Storm-Out (LOSO) rule across `5` archived Austin floods.
4. **Coverage Boundary Honesty (Built):** Routes extending outside the 80 km Austin-area crossing inventory (such as when a TX-37 resident drives to College Station or Houston, or any mid-route excursion outside the footprint) trigger an explicit coverage-boundary warning directing drivers to TxDOT DriveTexas.

### Safety Principle — FordCast Only Ever *Adds* Caution
- **Never shows "safe."** States: **No rise detected → Watch → Avoid → Flooded – Closed**, plus **Unknown – data offline** (ES: Sin crecida detectada · Precaución · Evite · Inundado – Cerrado · Desconocido – sin datos). Water on the road = *Turn Around, Don't Drown*, always.
- **Experimental lag windows, not road-arrival countdowns** ("gauge lag window 15–30 min") — labeled explicitly as downstream reference-gauge lag, never road-overtopping certainty.
- **Stale or missing data shows "Unknown — data offline,"** never a calm color.
- **Official closures (ATXFloods/barricades) always override sensor states.**
- **In-app disclaimer:** "FordCast is a supplementary tool. Obey barricades and official warnings. Never drive into water."

> Why it matters: a flood tool that makes drivers feel *safer* than the evidence supports would increase risk. Designing around epistemic honesty is central to FordCast.

### Target Audience & TX-37 Scope
- **Geographic scope:** **A Central Texas pilot built by a TX-37 student, centered directly on TX-37's Austin / Travis County and southern Williamson County watersheds.** Current crossing and gauge data cover an 80 km Central Texas radius around Austin (`2,052` ATXFloods records + `19` USGS gauges), which encompasses the primary urban and suburban creeks of TX-37 (Shoal, Barton, Bull, Waller, Walnut, Williamson, Slaughter, Boggy, and Onion Creeks). When a TX-37 resident plans a regional trip outside that 80 km footprint (e.g., to College Station), FordCast explicitly flags the route as out-of-coverage in both the mobile/web route planner and the Chrome extension rather than showing a false clean route. Even inside TX-37, an inventory of `2,052` records does not mean every low spot is mapped or equipped with a sensor (`111` of `141` study crossings have no sensor).
- **Primary:** Commuters and young/nighttime drivers in the supported Austin-area corridor (including Onion, Barton, Bull, Shoal, Williamson, and Walnut Creek watersheds).
- **Originality statement:** **FordCast brings the crossing evidence for your trip into one understandable view: official reports, available creek readings, nearby flood history and what is still unknown.**

### Impact Statement (for judges)

> A family planning a familiar trip needs to know which crossings deserve attention and where information is missing. FordCast checks the trip against 2,052 Austin-area inventory records, groups likely duplicate hardware records, and brings official closure reports, available creek readings and nearby flood history into one trip view. It complements official tools and general navigation; it does not establish that another app would choose a dangerous route. The separate gauge experiment reports its ten detections, two misses and six false alarms in twelve proxy cases (`83.3%` POD, `37.5%` FAR, `0.556` CSI, `57.5 min` median lead time, and `0` false alarms in the calm control storm), outperforming the geodesic nearest-gauge baseline (`4/12` detections, `33.3%` POD, `42.9%` FAR, `0.267` CSI), while noting that road-flood prediction remains unvalidated. District-wide coverage and measured community benefit are next evaluation goals, not completed outcomes.

---

## 2. Technical Blueprint — FUNCTION + UI/UX

### Architecture

```
 OFFLINE DATA PIPELINE (Python scripts in tools/)
 Seed Crossing & Gauge Catalog ──► 141 study crossings + 19 USGS gauges + schematic links.json (6 primary-calibrated records)
 NOAA Storm Events CSVs (1996–2026) ──► 727 Central TX flood events (within 2 km per crossing, with event_id) ──► crossing_history.json
 Archived USGS 5-storm time series ──► causal 60-min telemetry delay + LOSO backtest ──► results.json

 LIVE CLIENT-SIDE ENGINE (Expo React Native + Web + Chrome MV3 Extension)
 ATXFloods API (2,052 crossings + closures) ─┐
 USGS Water Data OGC API v1 (19 gauges) ─────┼──► Multi-source Hazard Engine + Physical Grouping
 NWS Active Alerts API (FFW/FFE polygons) ───┤     ├── Commute Exposure Audit (120m corridor)
 Open-Meteo Precipitation API ───────────────┘     ├── Valhalla Detour Router + Google Maps Handoff
                                                   ├── Hands-Free Drive HUD (>15 mph prototype distraction lockout)
                                                   └── Per-Source Guardian Background Cache
```

### How the Experimental Gauge Evaluation Works (and What We Found)

1. **Reference threshold ground truth.** Because historical road-overtopping timestamps are not publicly archived for most crossings, we evaluated upstream gauge triggers against sourced downstream USGS/NWS flood-stage reference thresholds (`proxy_kind: downstream_gauge_flood_stage`; crossing topology marked `review_status: unverified_road_and_topology` and connector geometry marked `schematic_corridor_connector`) across 5 major Austin floods (Halloween 2013, Memorial Day 2015, Halloween 2015, Oct 2018, July 2025).
2. **Causal telemetry constraint.** All historical replays enforce a 60-minute telemetry delivery delay (`assumed_delay_min: 60`) and modeled outage windows so the rule never peeks at future observations.
3. **Leave-One-Storm-Out (LOSO) cross-validation.** Each storm is evaluated using thresholds learned only from the other storms across `12` proxy event cases (`4` primary-calibrated crossing records across two research corridors: `tc-167` Henry Marx @ Barton Creek paired with `USGS-08155240` / `USGS-08155300`, and `atx-19`, `atx-20`, `atx-21` at E. William Cannon Dr on Onion Creek paired with `USGS-08158860` / `USGS-08159000`), plus a 36-hour calm control window:

| Method (LOSO pooled across 5 storms) | Cases scored | Hits / Total (POD) | False alarms (FAR) | CSI | Median lead time (vs. downstream gauge flood stage) |
|---|---:|---:|---:|---:|---:|
| **Upstream candidate rule (`AVOID`)** | 12 | **10 / 12 (83.3%)** | **6 (37.5%)** | **0.556** | **57.5 min** |
| **Geodesic nearest-gauge baseline (`AVOID`)** | 12 | **4 / 12 (33.3%)** | **3 (42.9%)** | **0.267** | **87.5 min** |
| **Upstream candidate rule (`WATCH`)** | 12 | **12 / 12 (100.0%)** | **18 (60.0%)** | **0.400** | **79.5 min** |

> **Honest scientific finding:** On this small 12-event proxy sample, the upstream-paired `AVOID` rule achieved `4/12` hits (`65 min` median lead, `1` false alarm), matching the geodesic nearest-gauge baseline (`4/12` hits, `65 min` median lead, `0` false alarms). Rather than hiding a negative/inconclusive research result, FordCast displays this baseline comparison directly in the app (`Storms` and `Science Lab`) and restricts live sensor status to the 6 primary-calibrated records while marking uncalibrated crossings honestly.

### 4 Core Technical Features

**1. Commute Flood Exposure Audit + Physical Crossing Deduplication — *Built***
- *User-facing:* Pick any destination (or custom origin) to audit every low-water crossing within 120 m of your route, see which crossings lack sensors, and inspect distinct historical NOAA flood events within 2 km.
- *Technical:* Normalizes road and creek stems, merges multi-device hardware records (`Master Standpipe`, `Slave Arm (W)`, `Slave Arm (E)`) within 320 m only when both road and creek identities match, and unions distinct historical flood events across member records.

**2. Multi-Source Hazard Rerouting + Google Maps Handoff — *Built***
- *User-facing:* Computes a baseline route and a hazard-avoiding route around official ATXFloods closures, NWS Flash Flood Warning polygons, and USGS sensor triggers, then opens the detour in Google Maps.
- *Technical:* Queries Valhalla with `exclude_locations`, extracts up to 3 maximum-deviation detour waypoints for Google Maps URL handoff, and enforces an 80 km Central Texas coverage gate so out-of-coverage routes (like College Station) never display a false "no hazards reported" message.

**3. Causal Storm Replay & Storm Reroute Demo — *Built***
- *User-facing:* Replay 5 archived Austin storms or run the **Storm reroute demo** approaching Henry Marx Ln during the Memorial Day 2015 flood and switching to a precomputed alternative route when the upstream gauge crosses its trigger stage.
- *Technical:* Strict `t <= simT - delay` causal filtering prevents lookahead bias; switching the selected drill storm immediately terminates any active demo car run so storm labels and telemetry never mix; live routes are isolated from drill mode so simulated storm state never leaks into live navigation.

**4. Hands-Free Drive HUD + Source-Tagged Guardian Cache — *Built / Prototype***
- *User-facing:* High-contrast night HUD with bilingual EN/ES voice warnings, >15 mph prototype distraction lockout, and source-specific timestamps (`active closure verified live` vs. `reading Xm ago`).
- *Technical:* Unified foreground/background hazard cache tags each hazard with its contributing sources (`usgs`, `atx`, `nws`), prunes expired NWS alerts (`expiresAt <= now`) and sources older than 60 minutes via `activeCachedHazards()`, and records notification cooldowns only after local notification delivery succeeds.

---

## 3. Code Explanation Strategy — CODE

### The Technical Hurdle — Physical Crossing Grouping, Causal Evaluation & Source-Aware Failure Retention

1. **Deduplicating municipal sensor hardware into physical crossings (`mobile/src/lib/danger.ts`):**
   - City and county inventories list each flasher arm or standpipe as a separate point (e.g., three records at E. William Cannon Dr at Onion Creek). Grouping by road name alone would mistakenly merge two different creeks on the same road, while not grouping inflates crossing counts and double-counts NOAA storm reports.
   - Our `groupPhysicalCrossings()` algorithm strips hardware suffixes (`Master Standpipe`, `Master Arm`, `Slave Arm (W/E)`), checks both `roadStemKey` and `creekStemKey` compatibility within 320 m, and unions historical flood events across all member records.
2. **Causal hydrograph evaluation without lookahead bias (`mobile/src/lib/live.ts` & `data.ts`):**
   - At any simulated timestamp `simT`, `visibleSamples()` exposes only observations whose arrival timestamp `t + delay <= simT`, shading delayed outages as `Unknown` rather than interpolating across gaps.
3. **Source-tagged cache retention and expiration pruning (`mobile/src/lib/guardian-cache.ts` & `guardian.ts`):**
   - During severe weather, individual feeds (USGS, ATXFloods, or NWS) can fail independently. Each cached hazard stores `sources: ('usgs' | 'atx' | 'nws')[]` and per-source evidence so a failed feed retains its prior active warnings for up to 60 minutes (while pruning expired NWS polygons) without masking fresh updates from healthy feeds.

---

## 4. Demo Video Script — STRUCTURE (~2:15)

**Format:** ~2:15. Opens on the problem, shows **real app footage for ~65% of the runtime**, and presents both the live commute audit and the honest storm-replay research findings.

**[0:00–0:15] HOOK & PROBLEM**
- *Visual:* Kinetic text: **"TEXAS — #1 IN U.S. FLOOD DEATHS (1,069 deaths, 1959–2019). Over half of flood drownings happen in vehicles."**
- *VO:* "In Central Texas's Flash Flood Alley, the most dangerous part of a storm is the low-water crossing on your everyday drive. Official maps list over 2,000 crossings around Austin, but drivers don't have one place to see the crossing evidence along their specific trip — or which crossings have no flood sensor at all."

**[0:15–0:55] LIVE COMMUTE FLOOD EXPOSURE AUDIT (Primary Workflow)**
- *Visual:* Open FordCast on mobile/desktop. Tap a preset trip (**Downtown → Onion Creek Park**). Show the **Route Audit Summary** and **What FordCast checked for this trip** explainer: physical crossing areas grouped cleanly, source-health strip (`ATXFloods`, `USGS`, `NWS`, `Valhalla`), unmonitored-crossing warning, and **Test rerouting with a simulated closure** + **Go with Google Maps** (with capability-specific background monitoring disclosure). Then tap **Austin → College Station (Coverage check)** to show the **Coverage Boundary Warning**.
- *VO:* "I'm [NAME], a 9th grader in Texas-37, and FordCast is a Central Texas pilot built for our Austin-area watersheds. Before you leave, FordCast brings the crossing evidence for your trip into one view: it checks a 120-meter corridor against 2,052 mapped crossings, groups duplicate hardware records into physical crossings, flags unmonitored creeks, and hands off detour waypoints to Google Maps. If a trip leaves the 80-kilometer Austin-area inventory — like driving toward College Station — FordCast warns you instead of guessing."

**[0:55–1:35] ARCHIVED STORM REROUTE DEMO & HANDS-FREE DRIVE HUD**
- *Visual:* Tap **Storm reroute demo** (Memorial Day 2015). Show the **ARCHIVED SIMULATION · Memorial Day Flood** banner. Watch the car approach **Henry Marx @ Barton Creek (`tc-167`)**, see the upstream Barton Creek gauge (`USGS-08155240` at Lost Creek Blvd) cross its trigger threshold ahead of the Loop 360 reference gauge (`USGS-08155300`), and watch the route switch from red to the precomputed blue detour with spoken voice warning and >15 mph Drive HUD lockout.
- *VO:* "To study early warnings across two research corridors, FordCast replays five archived Austin floods. In this Memorial Day 2015 replay, as Barton Creek rises upstream at Lost Creek Boulevard, FordCast flags Henry Marx at Barton Creek and switches to a precomputed alternative route, reading the warning out loud in English or Spanish."

**[1:35–2:00] HONEST SCIENCE & BASELINE COMPARISON**
- *Visual:* Open **Storms** and **Science Lab** (`CausalHydrograph`). Point to the **Leave-One-Storm-Out (LOSO)** scorecard (`10/12` hits, `83.3%` POD, `57.5 min` median lead, `6` false alarms across `6` calibrated crossing records on three research corridors) and the side-by-side **Nearest-Gauge Baseline Comparison**.
- *VO:* "In science, honest evaluation matters most. Across 12 Leave-One-Storm-Out proxy cases on our two research corridors, the upstream gauge rule caught 10 of 12 proxy events with a 57.5-minute median head start — outperforming the nearest-gauge baseline (4 of 12). FordCast shows those exact numbers, misses, and sensor limits right in the app."

**[2:00–2:15] VISION**
- *Visual:* Return to the live map and safety pledge: **"Never drive into water. Obey barricades."**
- *VO:* "FordCast never tells you a flooded road is safe — it makes public flood data transparent, route-specific, and honest for Central Texas drivers."

---

## 5. Official Submission Answers

> **Personalize `[CITY]` and your personal memory in Q2 before submitting.**

**Q1. Purpose in one sentence.**
FordCast helps Central Texas drivers audit their trip across 2,052 Austin-area low-water crossings — combining official ATXFloods closures, NWS warnings, and USGS creek gauges with transparent sensor-coverage limits and historical flood context.

**Q2. What inspired you to create this app?**
*[Student-owned answer: describe your actual connection to a crossing, school trip or storm in your own words. Do not claim a personal event, interview or rescue you did not experience.]* Explain the specific decision you wanted to help with: checking official reports and missing information along a familiar trip before leaving. Distinguish that motivation from any measured user benefit, which has not yet been established.

**Q3. What is your app trying to accomplish?**
FordCast gives Austin-area drivers a clear pre-trip and in-trip safety audit for low-water crossings. When you enter a destination, FordCast checks your route corridor against 2,052 mapped crossings, groups duplicate sensor hardware into physical crossing areas, flags official ATXFloods closures and NWS Flash Flood Warnings, and routes around active hazards via Valhalla with a 1-tap handoff to Google Maps. Crucially, it never labels a road "safe": it explicitly warns when crossings along your route have no creek sensor, and flags routes that leave its 80 km Central Texas coverage area. Alongside the live trip checker, FordCast includes an experimental hydrograph lab testing upstream USGS gauge rules across 5 archived Austin storms (catching 10 of 12 downstream reference-gauge events with a 57.5-minute median lead time, compared transparently against a nearest-gauge baseline that caught 4 of 12).

**Q4. What technical/coding difficulty did you face, and how did you address it?**
Two technical hurdles stood out. First, real-world municipal crossing datasets list individual flasher arms and standpipes as separate records — for example, three records at E. William Cannon Dr on Onion Creek (`atx-19` `Slave Arm (W)`, `atx-20` `Master Standpipe`, `atx-21` `Slave Arm (E)`) — which initially inflated route crossing counts and double-counted shared NOAA flood reports. I wrote a physical-crossing grouping algorithm that preserves distinct waterway type nouns (so Bear Creek and Bear Branch never merge), groups reviewed multi-arm device clusters on the same road and creek, and deduplicates historical NOAA flood events by authoritative `event_id`. Second, when I tested my upstream-gauge rule using Leave-One-Storm-Out cross-validation across 5 historical storms (with a 60-minute causal telemetry delay so the replay never peeks at future data), I calibrated upstream travel-time lags and trigger thresholds across three creek corridors (detecting `10/12` proxy threshold crossings with a `57.5 min` median lead time and `0.556` CSI vs. `4/12` and `0.267` CSI for the nearest-gauge baseline), while building the app's UI to surface the baseline comparison, misses, and false alarms directly and separate verified official closures from experimental gauge lag windows.

---

## 6. Claims Ledger — Verified Against Repository

| Claim (video / answers) | Evidence in repo | Status |
|---|---|---|
| "2,052 mapped Austin-area crossings" | `141` seed crossings (`crossings.json`) + `1,911` additional official crossings (`official_crossings.json`) | ✅ Verified |
| "6 calibrated records across three research corridors (30 R&D candidates)" | `links.json` (`is_primary: true` on `tc-167` Henry Marx @ Barton Creek and `atx-19`, `atx-20`, `atx-21` at E. William Cannon Dr on Onion Creek) | ✅ Verified |
| "727 regional NOAA flood events (1996–2026) with authoritative event_id deduplication" | `mobile/assets/history/crossing_history.json` (`period: 1996-01-01 .. 2026-06-15`, `total_events_in_area: 727`) | ✅ Verified |
| "LOSO backtest: 10/12 hits (83.3% POD, 37.5% FAR, 0.556 CSI, 57.5-min median lead, 0 calm FA) vs. nearest-gauge baseline (4/12, 33.3% POD, 42.9% FAR, 0.267 CSI)" | `mobile/assets/results/results.json` & `StormsScreen.tsx` / `lab.tsx` | ✅ Verified |
| "Reroutes around active hazards + 3-waypoint Google Maps handoff" | `mobile/src/lib/routing.ts` + `extension/lib.js` | ✅ Verified |
| "80 km Central Texas coverage boundary warning (distance-weighted + any out-of-area excursion)" | `assessRouteCoverage()` in `mobile/src/lib/routing.ts` | ✅ Verified |
| "Bilingual EN/ES UI and voice with zero banned false-safety words" | `mobile/src/locales/en.json`, `es.json`, `contracts.test.ts` | ✅ Verified |

---

## 7. Sources

- **[S1]** Flood deaths by state, 1959–2019 (Texas 1,069; Louisiana 693) — [Datawrapper chart used in July 2025 AP coverage](https://datawrapper.dwcdn.net/XBmtp/5/); AP, ["Texas leads nation in flood deaths due to geography, size and population"](https://www.ksat.com/tech/2025/07/12/texas-leads-nation-in-flood-deaths-due-to-geography-size-and-population/) (July 12, 2025)
- **[S2]** Han, Z. & Sharif, H.O., ["Vehicle-Related Flood Fatalities in Texas, 1959–2019,"](https://rrpress.utsa.edu/items/8a0eb964-1a3e-4bf8-b2c4-084fdd65b29c/full) *Water* (MDPI) — 570 vehicle-related deaths; Flash Flood Alley clustering; night; ages 20–29
- **[S3]** "Turn Around, Don't Drown" — over half of flood-related drownings involve a vehicle driven into floodwater (CDC/NWS), e.g. [Kentucky Emergency Management](https://kyem.ky.gov/Preparedness/Pages/TADD.aspx)
- **[S4]** NASA Scientific Visualization Studio, ["July 2025 Texas Precipitation and Guadalupe River Flooding"](https://svs.gsfc.nasa.gov/5595) — 26 ft in 45 min at Hunt
- **[S5]** AP, ["Hill Country flood death toll rises to 135 statewide"](https://komonews.com/news/nation-world/gallery/hill-country-flood-death-toll-rises-to-135-statewide-116-in-kerr-county-says-abbott?photo=1)
- **[S6]** Travis County deaths — [KUT](https://www.kut.org/energy-environment/2025-07-06/travis-county-tx-flooding-rain-severe-weather-williamson-burnet-atx-flood), [CBS Austin](https://www.cbsaustin.com/news/local/travis-county-sheriffs-office-identifies-5-more-found-dead-after-floods-death-toll-now-8)
- **[S7]** [KUT report on Austin's low-water crossings](https://www.kut.org/transportation/2025-07-16/austin-tx-floods-fix-low-water-crossings-roads-drive-safety) (July 16, 2025); City of Austin / ATXFloods dataset
- **[S8]** LSU graduate thesis on "Turn Around, Don't Drown" effectiveness — [LSU Digital Commons](https://repository.lsu.edu/gradschool_theses/5466)
- **[S9]** Data/tools: [USGS Water Data APIs](https://www.usgs.gov/tools/usgs-water-data-apis) · [USGS migration guide](https://api.waterdata.usgs.gov/docs/ogcapi/migration) · [USGS NLDI](https://api.water.usgs.gov/docs/nldi) · [NOAA NWPS API](https://water.noaa.gov/about/api) · [TxDOT DriveTexas](https://www.drivetexas.org/)
- **[S10]** Travis County congressional split — [City Cast Austin](https://austin.citycast.fm/local-civics/what-travis-county-redistricting-new-congressional-maps)
- **[S11]** NHTSA, *Visual-Manual Driver Distraction Guidelines for In-Vehicle Electronic Devices* (2013)
