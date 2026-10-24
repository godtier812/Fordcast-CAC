# FordCast safety audit (October 2026)

Scope: every way the app could leave a driver worse off than having no app — a missed hazard, a
reassuring message that isn't earned, a route through water, or a warning that doesn't reach them.
Each item lists what was wrong and what changed. File references are under `mobile/src/`.

## A. Hazards the app could not see

| # | Problem found | Fix |
|---|---|---|
| A1 | **Official closures were ignored.** A crossing the City/County had closed could still show "No rise upstream". | `lib/hazards.ts` pulls live closures from the ATXfloods API every 5 min. An official closure overrides any sensor state (`lib/danger.ts`, first reason, rank 4) and is routed around. Closures outside FordCast's 141 crossings are added to the map as their own markers. |
| A2 | **137 of 141 crossings had no warning at all** (only 4 have a calibrated sensor link). | Three sources now cover every crossing: NWS Flash Flood Warning/Emergency polygons (block), NWS Flood Warning/Advisory (caution), and Open-Meteo rainfall combined with NOAA flood history (caution). During an active flood warning the full ATXfloods inventory (~2,500 crossings) is loaded so crossings outside FordCast's list are flagged too. |
| A3 | **A calm sensor could contradict a Flash Flood Warning.** Cyan "No rise upstream" inside an NWS warning polygon reads as reassurance. | Danger is computed from all sources. The most serious reason is shown first, colours follow the combined danger, and the other reasons are listed under "Also:". |
| A4 | **Sensor offline during heavy rain looked the same as offline in dry weather.** | New reason `sensor_offline_rain` (caution): "Treat it as flooded." |
| A5 | **No memory of past flooding.** Crossings where people have died looked the same as crossings that never flood. | `assets/history/crossing_history.json` (NOAA Storm Events, 727 located flood reports, 2004–2026). 37 crossings are high tier and 25 elevated. Shown on every crossing; combined with live heavy rain it raises a caution alert. |

## B. Routes that could lead into water

| # | Problem found | Fix |
|---|---|---|
| B1 | No routing at all. | `lib/routing.ts`: fastest route (Valhalla/OSM), then repeated exclusion of every blocking hazard on it, up to 4 rounds, because a detour can run into a different flooded crossing. |
| B2 | **Exclusions could miss.** A crossing's mapped point can be ~40 m off the road, so the router snapped the exclusion to a side street and returned the same route. Found during extension testing. | Exclusions use the point projected onto the route (`nearestPointOnRoute`). Same fix in the demo trip builder. Unit-tested. |
| B3 | Caution-level hazards (watch, rain + history) could force very long detours. | Caution hazards are only avoided when the detour costs ≤12 min; otherwise they stay on the route as named "On your route" warnings. Blocking hazards are always avoided. |
| B4 | **No way around:** a naive router would quietly return the flooded route. | `remaining` hazards are shown in a red "No way around X — wait for the water to go down" box. The route line turns amber. |
| B5 | **Conditions change after you leave.** | The monitor re-checks the active route on every hazard update (5 min, or immediately for drill/demo). A new blocking hazard ahead of your position triggers a replan from where you are, plus a spoken + push "Rerouting around X" alert. |
| B6 | **Hand-off to Google Maps could ignore the detour.** | The link includes up to 3 waypoints chosen where the detour deviates most from the fastest route (Google's mobile limit is 3). The card says Google may still pick a nearby road and that FordCast keeps watching. |
| B7 | **A route checked against nothing looked fine.** If USGS or ATXfloods is down, "No reported hazards" is misleading. | The route card names any missing source: "Live sensor data is unavailable, so this route was only checked against…". |
| B8 | Night driving: depth and road damage can't be judged in the dark. | Night tip on the route card between 7 pm and 7 am (Austin time). |

## C. Warnings that might not reach the driver

| # | Problem found | Fix |
|---|---|---|
| C1 | Alerts only covered the 4 sensor crossings. | Alert scope is now any crossing with danger that is within your radius, saved, or on your active route. |
| C2 | Rain alone at crossings with no history would spam alerts. | Shown on the map, not pushed (`alertRank` 0). |
| C3 | Many simultaneous escalations (e.g., a new warning polygon) could flood notifications. | One notification for the most serious ("+N more"); the rest go to the alert log. |
| C4 | **People navigate with Google Maps, not FordCast.** In-app alerts don't help them. | (1) Guardian mode (`lib/guardian.ts`): a background location task alerts ~1 mile before a blocking hazard while another app is navigating, refreshing hazards itself if the cached list is older than 10 min. Needs the installed build; the UI says so in Expo Go. (2) Chrome extension `extension/` adds a FordCast panel to google.com/maps that checks the Google route and offers a route around hazards. |
| C5 | Drill and demo alerts could be mistaken for real ones. | Every drill/demo message is prefixed DRILL / SIMULACRO; the car demo is labelled "Simulated drive". |
| C6 | Two voices could talk over each other during the car demo. | The demo owns the voice (`setTripActive`); monitor alerts still log and banner but stay silent. |

## D. Wording and honesty

| # | Problem found | Fix |
|---|---|---|
| D1 | New strings could break the "no reassurance" rule. | The contract test still scans all 400+ strings in English and Spanish. Two new strings ("Clear route", "…Google Maps is open") failed it and were reworded. |
| D2 | Flood-history counts could be misread as deaths *at* the crossing. | Copy says "within 2 km", and "Reports are for the area, not this exact crossing." |
| D3 | Demo outcomes. | Each car demo ends with the real outcome from the backtest: hit with lead time (2013, May 2015, Oct 2015), false alarm (Oct 2018), watch-only (Jul 2025). |
| D4 | Safety basics were missing. | NWS "Turn Around Don't Drown" facts on the Alerts tab (6 in knocks you down, 12 in floats a car, 2 ft carries away SUVs, about half of flash-flood deaths are in vehicles, never drive around barricades). |

## Known limits (not fixed)

- Only 4 crossings have a calibrated sensor link. Everything else relies on official closures, NWS polygons, rain and history, which are slower or coarser.
- ATXfloods closures are only as current as the agencies' updates.
- Open-Meteo rainfall is a ~10 km grid model, not a rain gauge.
- Storm Events locations are approximate and reporting practices changed over time.
- Guardian mode and background alerts need an installed build; Expo Go only alerts while open.
- Public routing (Valhalla) and geocoding (Photon) servers have fair-use limits and no uptime guarantee.
