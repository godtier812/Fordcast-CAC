# FordCast — 100% Mandatory Demo Video Checklist & Impact Guide (TX-37)

> **Purpose of this document:** If a Congressional App Challenge (CAC) judge watches your 2–3 minute video only once, what **must** appear on screen so they immediately understand (1) why FordCast matters in **TX-37 (Austin / Travis County & southern Williamson County)**, (2) how it solves a gap that Google Maps, Waze, and ATXFloods leave open, and (3) the technical depth of what you built?
>
> **Rule #1:** Every single item in Section 2 must be shown on screen as **real, live-recorded app footage** (never just slides).

---

## 1. The Core Message Judges Must Walk Away With in 10 Seconds

If a judge remembers only one thing about FordCast, it must be this:

1. **The Problem in TX-37 (Flash Flood Alley):** Texas leads the nation in flood deaths (`1,069` deaths from 1959–2019; over half in vehicles), and Central Texas has **`2,052` mapped low-water crossings**. Yet ordinary navigation apps don't tell you which low-water crossings sit along your commute, ATXFloods requires manually hunting through pins on a map, and most crossings have **no road-surface flood sensor at all**.
2. **The Product Solution (Built):** **FordCast audits the crossings on your specific trip before you leave**—combining official ATXFloods closures, active NWS Flash Flood Warnings, live USGS creek gauges, and **`727` historical NOAA flood reports** within 2 km, while explicitly flagging **unmonitored crossings** and **coverage boundaries**, then handing off a hazard-avoiding detour to **Google Maps**.
3. **The Scientific Research (Prototype):** On **6 calibrated crossing records across 3 TX-37 creek corridors** (Barton Creek, Williamson Creek, and Onion Creek), FordCast runs a strict **causal Leave-One-Storm-Out (LOSO) backtest** across 5 historical Austin floods (with a 60-minute telemetry delivery delay so it never peeks into the future), detecting **`10 of 12` downstream reference-gauge flood-stage events (`83.3%` POD, `57.5 min` median lead time, `0.556` CSI, `0` calm control false alarms)** vs. **`4 of 12` (`33.3%` POD, `0.267` CSI)** for the geodesic nearest-gauge baseline.

---

## 2. The 7 Non-Negotiable Must-Show Moments in the Video

If you leave out any of these 7 moments, judges will miss a major pillar of your engineering and impact.

### Must-Have #1: The Safety Pledge & "Never Shows Green / Safe" Principle (~10 sec)
- **Where in the app:** Onboarding modal (`Settings` → `Read the pledge again`) + Map Legend (`?` button or status badges).
- **What MUST be visible on screen:**
  - Checking the 3 safety pledge boxes (*"I will never drive into water"*, *"I will obey barricades and official warnings"*, *"FordCast never tells me a road is safe"*).
  - The 5 non-reassuring states: **No rise detected** (`slate`), **Watch** (`amber`), **Avoid** (`orange-red`), **Flooded – Closed** (`red`), and **Unknown – data offline** (`purple/gray`).
- **Why judges MUST see it:** It proves FordCast is designed around **epistemic safety**. A flood app that shows a bright green "SAFE" badge on an unmonitored creek could get a driver killed. Showing that missing/stale data defaults to `Unknown` and never to "safe" immediately sets your project apart.

---

### Must-Have #2: The Live TX-37 Commute Flood Exposure Audit + Hardware Deduplication (~30 sec)
- **Where in the app:** **Map** tab → **Route** sub-tab → tap preset **`Downtown → Onion Creek Park`**.
- **What MUST be visible on screen:**
  1. **Route Audit Summary card** (the 3-row checklist showing **Official reports**, **Creek readings**, and **Nearby history**).
  2. **Physical Crossing Deduplication:** Point out that municipal datasets list each flasher arm and standpipe separately (e.g., 3 separate hardware records at **E. William Cannon Dr @ Onion Creek**: `Slave Arm (W)`, `Master Standpipe`, `Slave Arm (E)`), and FordCast merges them into **1 physical crossing area** so route hazard counts and NOAA flood reports are never double-counted.
  3. **Unmonitored Crossing Warning:** Show the explicit warning that unmonitored crossings on the route have **no automated creek gauge** (`111` of `141` study crossings are Tier C unmonitored).
  4. **Crossing Detail Screen (`/crossing/[id]`):** Tap one crossing on the route to show its live USGS gauge sparkline, datum explanation, **`727`-event NOAA Storm Events flood history within 2 km**, and shareable **Preparedness Card**.
- **Why judges MUST see it:** This is your #1 answer to *"Why not just use Google Maps or ATXFloods?"* Neither tool audits a route corridor across official closures, upstream USGS gauges, historical NOAA flood reports, and missing-sensor gaps in one view.

---

### Must-Have #3: Simulated Closure Reroute Drill + 1-Tap Google Maps Handoff + Chrome Extension (~25 sec)
- **Where in the app:** Still on **Map → Route** (`Downtown → Onion Creek Park`), plus a 5-second cut of the **Chrome MV3 Extension** on `google.com/maps/dir/...`.
- **What MUST be visible on screen:**
  1. Tap **`Test rerouting with a simulated closure`**. Show Valhalla calculating a real detour around the blocked crossing, the **`TEST`** isolation banner (which intentionally disables external sharing/navigation so a test closure never leaks into real driving), and then tap **`End test and recheck route`**.
  2. On the live route, point to **`Go with Google Maps`** (which injects up to 3 maximum-deviation detour waypoints into Google Maps) and the honest background-monitoring disclosure.
  3. Briefly show the **FordCast Chrome Extension** badge overlaid on desktop Google Maps auditing a route in real time.
- **Why judges MUST see it:** Judges know drivers won't abandon Google Maps or Apple Maps for turn-by-turn directions. Showing that FordCast computes the flood-avoiding corridor via Valhalla and hands the detour waypoints directly to Google Maps makes the product immediately practical.

---

### Must-Have #4: The 80 km Central Texas Coverage Boundary Gate (~15 sec)
- **Where in the app:** **Map → Route** → tap preset **`Austin → College Station (Coverage check)`**.
- **What MUST be visible on screen:**
  - The amber **Outside FordCast coverage area** warning card explaining that the route leaves FordCast's 80 km Austin-area crossing inventory (`2,052` records) and providing a 1-tap link to **TxDOT DriveTexas**.
- **Why judges MUST see it:** If a TX-37 resident drives outside Travis/Williamson County and an app says *"0 flooded crossings on your trip"* simply because its database ended at the county line, that is a dangerous false negative. Judges love seeing edge-case safety engineering like `assessRouteCoverage()`.

---

### Must-Have #5: The Archived Storm Reroute Demo (Moving Car + Real Historical Flood Telemetry) (~25 sec)
- **Where in the app:** Tap **`Storm reroute demo`** on the Map/Route card (or in the **Storms** tab).
- **What MUST be visible on screen:**
  1. The purple **`ARCHIVED SIMULATION · Memorial Day Flood 2015`** banner at the top of the screen (proving strict visual separation between simulation and live conditions).
  2. The animated car driving along the baseline route toward **Henry Marx Ln @ Barton Creek (`tc-167`)**.
  3. At `2015-05-24 10:50 UTC`, upstream gauge **`USGS-08155240` (Barton Creek at Lost Creek Blvd, 8.4 km upstream)** crosses its learned trigger threshold ahead of the downstream reference gauge (`USGS-08155300` at Loop 360).
  4. The route automatically flips from the red blocked path to the **blue detour route**, accompanied by the spoken warning banner.
- **Why judges MUST see it:** Because it likely won't be flooding in Austin on the day you record, this moving-car replay demonstrates the full real-time detection, rerouting, and voice-warning loop using real archived USGS telemetry.

---

### Must-Have #6: Hands-Free Night Drive HUD, >15 mph Distraction Lockout & Bilingual EN/ES Parity (~15 sec)
- **Where in the app:** **Drive** tab + **Alerts** tab / **Settings** language toggle.
- **What MUST be visible on screen:**
  1. The high-contrast dark **Drive HUD** showing the upcoming crossing distance, creek name, and arrival window bucket (`15–45 min`, never a false single-minute countdown).
  2. Tap **Simulate >15 mph** (or show the moving demo) to trigger the **Distraction Lockout** (`Moving fast · buttons locked` with the 44×44pt `I'm a passenger` override).
  3. Toggle **English ↔ Español** and tap **Test voice** (`Ava`, `Andrew`, or `Aria`) to show full bilingual UI and spoken-alert parity.
- **Why judges MUST see it:** Research shows Texas vehicle flood drownings peak **at night**, and TX-37 is a bilingual community. The night HUD, NHTSA-inspired speed lockout, and Spanish voice alerts connect your UI directly to the human factors of flood fatalities.

---

### Must-Have #7: The Storms Scorecard & Causal Hydrograph Science Lab (`10 / 12` LOSO Accuracy vs. Baseline) (~25 sec)
- **Where in the app:** **Storms** tab + **Open Hydrograph Lab** (`/lab`).
- **What MUST be visible on screen:**
  1. The **3-column LOSO metric summary strip** at the top of the **Storms** screen:
     - **Cases detected:** `10 of 12` (`83.3%` POD)
     - **Median lead:** `58 min` (`57.5 min` exact)
     - **False alarms:** `6` (`37.5%` FAR, `0.556` CSI, and **`0` false alarms in the Oct 2018 calm control storm**)
  2. The **Side-by-Side Comparator Table** showing that the calibrated **Upstream Rule (`10/12` hits, `83.3%` POD, `37.5%` FAR, `0.556` CSI)** outperforms the **Geodesic Nearest-Gauge Baseline (`4/12` hits, `33.3%` POD, `42.9%` FAR, `0.267` CSI)** across the 6 primary-calibrated crossing records on 3 corridors (**Barton Creek**, **Williamson Creek**, and **Onion Creek**).
  3. Inside **Science Lab (`/lab`)**: scrub the **Causal Hydrograph** timeline showing that future data after `simT - 60m` is withheld (`assumed_delay_min: 60`) and point out the **Halloween 2013 telemetry outage** shaded as `Unknown` rather than interpolated.
  4. Point to the honest proxy disclosure: ground-truth labels are **downstream USGS/NWS flood-stage reference thresholds (`Tier A = 0` road-surface sensors)**.
- **Why judges MUST see it:** Technical judges immediately distrust students who claim "99% AI accuracy" without cross-validation or baselines. Showing a **causal Leave-One-Storm-Out backtest** with a 60-minute telemetry delay, a geodesic nearest-gauge baseline comparator, and transparent proxy labeling turns FordCast into a standout scientific engineering project.

---

## 3. Master Shot-by-Shot Pacing Table (Target Length: 2:15 – 2:30)

| Time | Screen / Action | What Judges See | Key Voiceover Line | Rubric Pillar Hit |
|---|---|---|---|---|
| **0:00–0:15** | Kinetic Hook + Map Overview (`2,052` crossings) + Safety Pledge | Texas #1 in flood deaths (`1,069`); `2,052` Austin-area crossings; 3-checkbox Pledge & 5 states (no "safe" green) | *"In Central Texas's Flash Flood Alley, over half of flood drownings happen in vehicles. Maps list 2,052 crossings around Austin, but drivers don't have one place to check the crossings on their specific trip—or see which creeks have no sensor at all."* | **TX-37 Impact & Safety Philosophy** |
| **0:15–0:45** | **Map → Route**: Tap `Downtown → Onion Creek Park` + open a Crossing Detail card | `RouteAuditSummary` 3-row checklist; E. William Cannon 3-arm hardware merged into 1 crossing; `727` NOAA flood events; unmonitored sensor warning | *"I'm [Name] in TX-37. Before you leave, FordCast audits a 120-meter corridor along your route, merges duplicate flasher-arm records into physical crossings, shows nearby NOAA flood history since 1996, and flags unmonitored creeks."* | **Core Functionality & Originality** |
| **0:45–1:10** | Tap `Test rerouting with a simulated closure` → `End test` → `Go with Google Maps` + Chrome Extension clip | Valhalla detour calculation; `TEST` isolation banner; 3-waypoint Google Maps handoff; Chrome extension badge on Google Maps | *"When a crossing is closed or triggered, FordCast computes a Valhalla detour and hands up to three avoidance waypoints directly to Google Maps—or audits routes right inside desktop Google Maps via our Chrome extension."* | **Technical Execution & Practical Workflow** |
| **1:10–1:25** | Tap `Austin → College Station (Coverage check)` | Amber **Outside FordCast coverage area** warning + TxDOT DriveTexas link | *"And if your trip leaves the 80-kilometer Central Texas inventory, FordCast warns you instead of showing a false clean route."* | **Edge-Case Engineering & Honesty** |
| **1:25–1:50** | Tap `Storm reroute demo` (Memorial Day 2015) → switch to **Drive** tab + toggle **Español** | `ARCHIVED SIMULATION` banner; car approaching Henry Marx @ Barton Creek; upstream gauge trigger flips route red → blue; Night HUD >15 mph lockout + Spanish voice | *"To test early warnings, FordCast replays five archived Austin floods. In Memorial Day 2015, as Barton Creek rises upstream at Lost Creek Boulevard, FordCast reroutes the driver ahead of Henry Marx Lane and speaks warnings in English or Spanish with a hands-free night HUD."* | **Real Telemetry Replay & UI/UX Polish** |
| **1:50–2:15** | Open **Storms** tab → tap **Open Hydrograph Lab** (`/lab`) | `10 of 12` (`83.3%` POD, `58 min` lead, `0.556` CSI) vs. Nearest-Gauge (`4 of 12`, `33.3%` POD, `0.267` CSI); Causal Hydrograph 60-min delay & outage shading | *"Across 12 Leave-One-Storm-Out proxy cases on Barton, Williamson, and Onion Creeks—enforcing a 60-minute causal telemetry delay—our upstream rule caught 10 of 12 reference-gauge flood events with a 57.5-minute median lead time, outperforming the nearest-gauge baseline's 4 of 12 while keeping every miss, false alarm, and sensor limit transparent."* | **Scientific Rigor & Code Depth** |
| **2:15–2:25** | Return to Live Map + Tagline | **"FordCast — Check the crossings on your trip. Never drive into water."** | *"FordCast never promises a flooded road is safe—it makes public flood data route-specific, transparent, and actionable for Central Texas drivers."* | **Memorable Closing** |

---

## 4. Critical "Do Not Do" List When Recording Tomorrow

1. **NEVER say "FordCast guarantees a safe route" or "predicts road overtopping."**
   - Always say: *"FordCast audits the crossing evidence along your trip"* and *"evaluates upstream creek gauges against downstream reference-gauge flood stages (`10 of 12` proxy events detected in Leave-One-Storm-Out cross-validation)."*
2. **NEVER blur the line between Live Mode and Simulation Mode.**
   - Point out the purple **`ARCHIVED SIMULATION`** banner during the storm replay and the **`TEST`** banner during the simulated closure drill so judges see that test data is strictly isolated from live navigation.
3. **NEVER spend more than 15 seconds on static title slides.**
   - Show the working app for at least **85–90% of the video**. Every claim you make in voiceover should be visibly proven by a component on screen at that exact second.
4. **Show the Mobile Phone UI prominently.**
   - Because FordCast's primary real-world use case is a driver checking their phone before leaving (or using the hands-free Drive HUD in a cradle), record the primary walkthrough in the mobile phone layout (Expo Go on iPhone or mobile viewport) and use a quick 5-second cut to show the desktop Chrome Extension on Google Maps.
