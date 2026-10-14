# FordCast — Congressional App Challenge 2026 Submission Package (v4)

> **District:** TX-10 *(verify — see §8)* · **Builder:** [NAME], 9th grade, Python + React · **Deadline:** **Mon Oct 26, 2026, 12:00 PM ET** *(some offices use Oct 30 — check your Rep's CAC page)*
> Everything in `[brackets]` = fill in with **your real** details and **your real measured numbers** before submitting.

**App name:** **FordCast** — *ford* (a low-water crossing) + *forecast*. **Tagline:** **"Know before it crosses."**

---

## 0. Strategy — read first *(internal; delete this section before submitting)*

### The decision: "real bridge" vs. "amazing UI + big words"

**Build a real, narrow, working bridge — then make the screens judges see look amazing. Never describe a backend you didn't build.**

| | "Amazing UI + big words" | **"Working bridge + polished UI" ✅** |
|---|---|---|
| Demo video | Looks great until a judge asks *"is that real data?"* | **Real gauges, a real past storm, a real lead-time number** |
| Code review | Repo doesn't match the claims → credibility gone | Every claim maps to a file |
| Q4 (difficulty) | Generic, sounds borrowed | Specific — because you actually hit it |
| Finalist / House of Code Q&A | You get asked about PostGIS and freeze | You can explain every line |
| Integrity | Claiming unbuilt features = misrepresentation | Roadmap clearly labeled as roadmap |

- **Precise technical words win; inflated ones lose.** *"I cross-correlated upstream and downstream hydrographs to estimate a 38-minute travel time"* impresses **because it's checkable**. *"AI-powered real-time distributed platform"* is noise.
- **One number beats every adjective.** *"In the replayed 2015 storm, FordCast flagged the crossing [X] minutes before water reached the road"* outranks any architecture diagram.
- **~12 days remain.** The v3 stack (Mapbox native + on-device A\* + PostGIS + TimescaleDB + XGBoost→ONNX + offline sync + crowd fusion + FCM/APNs) is a multi-month team build. §6 cuts it to what fits.

### Tag every claim: **Built · Prototype · Roadmap**
- **Built** — works in the demo on real data → say it confidently.
- **Prototype** — works on replayed storms or a subset of crossings → say "prototype."
- **Roadmap** — designed, not built → say "next" or "planned."

### What changed from v3
- **Fixed contradictions:** district (TX-10 vs. TX-37/TX-35), grade (9th grade vs. "junior"), backend language (Node in the stack vs. "Python" in the video).
- **Fact-checked every stat** (sources in §9). Updated the outdated Travis County figures; removed unverifiable claims ("six straight decades," "hundreds of crossings in TX-10," "most deaths at low-water crossings").
- **Backend → Python (FastAPI)** — matches your skills and runs XGBoost natively. Dropped TimescaleDB, ONNX, Mapbox native SDK, and the home-built router.
- **New: Storm Replay** — runs real historical storms through the live pipeline. Solves "no flood on demo day" and produces your proof numbers.
- **New: safety principle** — the app never says a crossing is safe; the exact countdown became a **risk window**, so it can't tempt anyone to "beat the clock."
- **Upstream tracing via USGS NLDI** (the NHDPlus river network as a service) instead of rebuilding the graph by hand.
- **USGS Water Data API (new)** — the legacy service starts degrading **Nov 2026 (during judging)** and retires early 2027.
- **Prediction = calibrated probability within a time window**, scored with NWS-standard metrics (POD, FAR, CSI, lead time).
- **iOS 20-geofence limit** handled by rotating the nearest at-risk crossings.
- **Video → ~2:15**, so the working app gets 3× more screen time.

### v4.1 updates (Oct 14)
- **Full build spec:** `docs/master-prompt/` — the master prompt for the AI coding agent (every feature, screen, data source and test), built from six verified research reports in `docs/master-prompt/research/`.
- **Wording:** the calm state is now **"No rise detected"**. "No current signal" read like a lost connection, and "Sin señal" is what Spanish phones show for no service.
- **Avoid red → `#FF5470`:** two independent color-blindness simulations showed better amber/red separation for deuteranopia.
- **Map → MapLibre + OpenFreeMap (free, full style control). Build path → Android-first development build.** Push alerts, background alerts and custom maps don't run in Expo Go, and iPhone Expo Go stops at SDK 54.
- **USGS API → v1** (released Sept 2026). The legacy service slows from **Nov 16, 2026** and is decommissioned **Feb 22, 2027**.

---

## 1. App Concept — IDEOLOGY + IMPACT

### The Problem

- **Texas led every state in flood deaths, 1959–2019: 1,069** — 376 more than #2 Louisiana (693). [S1]
- **570 Texas flood deaths in that period were vehicle-related.** They cluster in **Flash Flood Alley** (the Balcones Escarpment corridor through Travis County), peak **at night**, and hit **ages 20–29** hardest. [S2]
- **Nationally, over half of flood drownings happen when someone drives into floodwater.** [S3]
- **July 4, 2025:** the Guadalupe River at Hunt rose **26 feet in 45 minutes** [S4]; at least **135 Texans** died [S5], including **about 10 in Travis County**. [S6]
- **Austin alone has ~70 low-water crossings** monitored on ATXfloods [S7] — before counting county roads across the region.

**The real gap is timing, not awareness.** Everyone in Central Texas has heard "Turn Around, Don't Drown," yet research has found no convincing evidence that the slogan alone reduced these deaths. [S8] Drivers need **a specific, early warning about the crossing ahead** — not another slogan.

**Why existing tools fall short:**

| Tool | What it does | The gap |
|---|---|---|
| **ATXfloods** | Crossing status from sensors and road crews | **Reactive** — changes *after* water is on the road |
| **WEA / NWS Flash Flood Warnings** | Area-wide alerts | **Not crossing-specific** — never says *which road* to avoid |
| **Google Maps / Waze** | Reroute around *reported* closures | **No forecast** — will route you toward a crossing that's about to go under |
| **NOAA National Water Model** | Streamflow forecasts for millions of stream reaches | **Built for hydrologists** — doesn't reach a driver as "this road, now" |

### The Solution

**FordCast forecasts which specific low-water crossing on your route is likely to flood within the next ~90 minutes — before water reaches the road — and gets you around it.**

**Plain English:** the water that floods a road fell as rain *upstream*, minutes to hours earlier. FordCast:
1. **Links each crossing to the stream gauges that are truly upstream of it** (via the USGS NHDPlus river network — not "nearest gauge").
2. **Learns from past storms how long floodwater takes** to travel from each gauge to each crossing.
3. **Watches those gauges live**; when the upstream signal says water is coming, the crossing turns **Watch → Avoid** on your map *before* the barricade goes up.

**What's new:** **per-crossing lead time.** Each crossing is a node in the river network with its own upstream gauges and its own learned travel time — turning *"closed now"* into *"likely flooded within 15–30 min — detour ready."*

### Safety principle — FordCast only ever *adds* caution
- **Never shows "safe."** States: **No rise detected → Watch → Avoid → Flooded – Closed**, plus **Unknown – data offline** (ES: Sin crecida detectada · Precaución · Evite · Inundado – Cerrado · Desconocido – sin datos). Water on the road = *Turn Around, Don't Drown*, always.
- **Ranges, not countdowns** ("likely within 15–30 min") — nothing to race.
- **Stale or missing data shows "Unknown — data offline,"** never a calm color.
- **Official closures (ATXfloods/barricades) always override the model.**
- **In-app disclaimer:** "FordCast is a supplementary tool. Obey barricades and official warnings. Never drive into water."

> Why it matters: a forecast app that makes people feel *safer* than they are would raise risk. Designing against that is part of the innovation.

### Target Audience
- **Primary:** Central Texas drivers who use low-water crossings — especially **at night** and **young/new drivers** (ages 20–29 are most affected [S2]; teen drivers are next in line).
- **Secondary:** city/county **road and emergency crews** and **school-bus route planners** — a ranked "likely to flood next" list to pre-position barricades and reroute buses.
- **Scales nationally:** USGS gauges and NHDPlus cover the whole U.S.; Flash Flood Alley is the proving ground.

### Impact Statement (for judges)

> In Flash Flood Alley, the road is the deadliest part of the storm. More than half of flood drownings happen when someone drives into floodwater, and in Texas those deaths cluster at night, at crossings that looked passable moments before. Every tool drivers have today reports a crossing closed *after* the water is over the road. FordCast forecasts it *before*: it links each low-water crossing to the stream gauges truly upstream of it, learns from past storms how long floodwater takes to arrive, and warns drivers on that route — with a detour — while there is still time to choose another road. Replayed against real Central Texas storms, it flagged flooding a median of **[X] minutes** before water reached the road. Where a river can rise 26 feet in 45 minutes, those minutes are the margin.

---

## 2. Technical Blueprint — FUNCTION + UI/UX

### Architecture

```
 ONE-TIME (offline, Python notebooks)
 USGS NLDI ──► snap crossing to river reach ──► upstream gauges + contributing basin
 Historic USGS gauge data (past storms) ──► travel-time lags ──► trigger stages / model

 LIVE (every 5 min)                       ┌───────── Python · FastAPI ─────────┐
 USGS Water Data API (stage) ───────────► │ 1. Ingest (async, concurrent)      │
 City of Austin / ATXfloods status ─────► │ 2. Per-crossing upstream features  │
 NOAA MRMS radar rainfall (stretch) ────► │ 3. Risk → P(flooded in 30/60/90m)  │
                                          │ 4. Write status → Supabase         │
                                          └──────────────┬─────────────────────┘
                                                         │ Realtime + Expo push
                                              ┌──────────▼──────────┐
                                              │  Expo (React Native) │ map · crossing card
                                              │  app                 │ check my drive · drive mode
                                              └──────────────────────┘
 STORM REPLAY: same pipeline, data source swapped for a historic storm (no code fork)
```

### Tech Stack

| Layer | Choice | Why this tool for *this* problem | Tier |
|---|---|---|---|
| App | **Expo SDK 57 (React Native)** + **MapLibre** (`@maplibre/maplibre-react-native`) on free **OpenFreeMap** tiles with a custom night style; **React Native Reusables** UI components | Uses your React skills; iOS + Android; Android-first **development build** (Expo Go can't run push, background alerts or MapLibre); native geofencing via `expo-location` + `expo-task-manager` | **MVP** |
| Backend | **Python + FastAPI** | Your strongest language; async I/O for concurrent API calls; same language as the model | **MVP** |
| DB + realtime | **Supabase** (Postgres + PostGIS + Realtime) | Crossings and basins are geospatial; status changes reach phones without polling | **MVP** |
| River network | **USGS NLDI** (NHDPlus) via `pynhd` | Snaps a crossing to its stream reach, navigates *upstream tributaries* to find real contributing gauges, returns the basin polygon | **MVP** (precomputed) |
| Gauges | **USGS Water Data API v1** (`api.waterdata.usgs.gov/ogcapi/v1`) | Legacy service degrades Nov 2026 → building on the new API means the app **won't break mid-judging** | **MVP** |
| Crossings + ground truth | **City of Austin open data / FEWS crossing layer, ATXfloods** | Crossing locations + official status (overrides the model) | **MVP** |
| Prediction | **Baseline:** travel-time + rate-of-rise rule → **ML:** gradient-boosted classifier (XGBoost/scikit-learn) with calibrated probabilities | Small, explainable, works on limited data; baseline gives you something to beat | **MVP → Stretch** |
| Routing | **OpenRouteService Directions** with `avoid_polygons` around Avoid-level crossings | Don't build a router — dynamic avoid areas give the same result | **Stretch** |
| Push | **Expo Notifications** (wraps FCM/APNs) | One API for both platforms | **MVP** |
| Rainfall | **NOAA MRMS radar QPE** averaged over each crossing's basin | Rain over the basin is the earliest signal | **Stretch** |
| Denser gauges | **LCRA Hydromet** (280+ gauges, incl. City of Austin) | Fills USGS gaps in the Colorado basin — check data access/terms | **Roadmap** |
| Hours-ahead outlook | **NOAA NWPS API** — National Water Model short-range reach forecasts | "Tonight's commute outlook" | **Roadmap** |
| Deploy | **Render** (API) + **Supabase** free tiers | Zero-ops for a student | **MVP** |

### How the prediction works (the core)

1. **Ground truth.** Use crossings with their own sensor (ATXfloods/FEWS) or a USGS gauge at the road. Their history gives exact *"water over road"* timestamps. Where available, NWS flood-impact statements list the stage at which a crossing goes under.
2. **Link.** NLDI upstream-tributary navigation → candidate upstream gauges for each crossing.
3. **Travel time.** For each *(upstream gauge → crossing)* pair, cross-correlate the rise in past storms → lag **τ** (minutes). Sanity-check: channel distance ÷ typical flood-wave speed.
4. **Baseline rule (MVP).** Risk rises when an upstream gauge passes its learned **trigger stage** while rising. ETA ≈ τ − time since trigger → shown as a **range**.
5. **ML (stretch).** Gradient-boosted classifier predicting **P(water over road within 30 / 60 / 90 min)** from upstream stage, rise rate (15/30/60 min), basin rainfall (1/3/6 h), antecedent rain, hour of day. **Calibrated** so "70%" really means ~70%. **Event-based train/test split** — whole storms held out, since readings inside one storm are correlated (otherwise the score is inflated by leakage).
6. **Evaluate (backtest).** Standard NWS verification metrics, compared against ATXfloods status (lead time = 0 by definition) and against the baseline:

| Storm (replayed) | Crossings scored | POD (floods caught) | FAR (false alarms) | CSI | Median lead time |
|---|---|---|---|---|---|
| [Oct 31, 2013 — Onion Creek] | [n] | [ ]% | [ ]% | [ ] | [ ] min |
| [May 2015 — Memorial Day] | [n] | [ ]% | [ ]% | [ ] | [ ] min |
| [Oct 2018 — Llano/Colorado] | [n] | [ ]% | [ ]% | [ ] | [ ] min |
| [July 2025] | [n] | [ ]% | [ ]% | [ ] | [ ] min |

> **Either result is a win.** If ML beats the baseline, show by how much. If the simple rule nearly matches it, say so — that honest finding makes a stronger Q4 than an untested model.

### 4 Advanced Features

**1. Per-crossing flood forecast — *ML inference*** · Baseline **Built** / ML **Stretch**
- *User-facing:* each crossing shows **Watch / Avoid** plus a window ("likely within 15–30 min") instead of just open/closed.
- *Technical:* upstream-gauge features + learned travel times → calibrated probability per crossing, recomputed on every gauge update.
- *Why it's hard:* floods are rare (few labels), samples within a storm are correlated, and probabilities must be calibrated. A naive "if level > X, alert" floods users with false alarms until they ignore it.

**2. Storm Replay — *time-travel testing*** · **Built**
- *User-facing:* pick a historic storm, press play at 60×, and watch FordCast react to what really happened.
- *Technical:* one `DataSource` interface with two implementations (`LiveUSGS`, `StormReplay`). The pipeline code is identical; only the data source is swapped (dependency injection).
- *Why it's hard:* **no lookahead** — at replay time *t* the model may only see data that existed at *t*. Leaking future readings is the classic forecasting bug that makes results look perfect and mean nothing.

**3. Check My Drive + avoidance routing — *maps*** · **Stretch**
- *User-facing:* before you leave, FordCast checks your route against every crossing's risk; if one is Avoid, it shows a detour and how many minutes it adds.
- *Technical:* spatial intersection of the route line with crossing buffers (PostGIS `ST_DWithin`); detour via OpenRouteService `avoid_polygons`; re-checked whenever a crossing's risk changes (Supabase Realtime).
- *Why it's hard:* risk changes *while you drive*, so the route must be re-validated live, not computed once.

**4. Background crossing alerts — *geofencing + offline resilience*** · **Stretch**
- *User-facing:* drive with any nav app; FordCast speaks up when you approach a Watch/Avoid crossing — even if the cell signal drops.
- *Technical:* OS geofences around at-risk crossings. **iOS allows only 20 monitored regions per app**, so FordCast registers the nearest ≤20 Watch/Avoid crossings and re-ranks on significant location change. The last-known risk is cached locally (`expo-sqlite`); offline alerts state their age ("risk as of 12 min ago").
- *Why it's hard:* iOS/Android throttle background apps, geofences cost battery, and stale data has to be labeled honestly.

**Roadmap (say "planned"):** crowd "water over road" reports with trust weighting · MRMS rainfall features · NWM hours-ahead outlook · county dashboard export · SMS alerts for people without the app.

> Coverage: **ML inference ✓ · real-time sync ✓ · geofencing/maps ✓**

### UI/UX Design Vision

**Emotional goal: reduce panic, maximize legibility at night (when most vehicle flood deaths happen [S2]).**

| Role | Color | Use | Contrast on base |
|---|---|---|---|
| Base | **Charcoal-navy `#0E1726`** | Background; low glare for night driving | — |
| No rise detected | **Slate `#8A97AB`** | Neutral — deliberately *not* green ("safe") | 6.1:1 ✓ |
| Watch | **Safety amber `#F5A623`** | Upstream water rising | 8.9:1 ✓ |
| Avoid / Closed (text, icons) | **Alert red `#FF5470`** (color-blind-verified; replaces `#FF5A4F`) | Likely or confirmed flooded | 5.8:1 ✓ |
| Avoid / Closed (chips) | **White on `#C62828`** | Status badges | 5.6:1 ✓ |
| Water | **Cyan `#2BD9D9`** | Rising-level sparklines | 10.3:1 ✓ |

- **Never color-only:** every state = **icon + word + pattern** (e.g., Closed adds barricade stripes).
- **Unknown/offline:** gray dashed outline — visually "we don't know," never calm.
- **Typography:** Inter / system stack; oversized tabular numerals; supports OS Dynamic Type.

**Navigation (two taps max — no menu hunting in an emergency):**
```
              ┌──────────────────────────────┐
              │  MAP HOME (default)          │
              │  live crossings + my route   │
              └──┬──────────┬──────────┬─────┘
       ┌─────────▼──┐ ┌─────▼──────┐ ┌─▼───────────┐
       │ Crossing   │ │ Check My   │ │ Drive Mode  │
       │ Card       │ │ Drive      │ │ voice-first │
       └────────────┘ └────────────┘ └─────────────┘
       Storm Replay: one tap from Map Home (time-scrubber overlay)
```

**Signature moment — the Crossing Card.** As upstream water rises, a card slides up and a ring fills **slate → amber → red**. It shows the upstream gauge's live sparkline (*"Bull Ck at Loop 360 (upstream): +3.1 ft in 30 min"*), then **"AVOID · likely flooded within 15–30 min · detour +4 min"** with one haptic pulse. **The judge watches water travel down the river toward a road — and the warning arrive first.**

**Driver-distraction design:** Drive Mode follows **NHTSA's visual-manual distraction guidelines** (glances ≤ 2 s, tasks ≤ 12 s total): voice-first, huge targets, no typing while moving.

**Accessibility — four concrete features:**
1. **VoiceOver / TalkBack** with spoken alerts ("Flooding likely soon at [crossing]. Taking the detour.").
2. **Colorblind-safe, never color-only** — icon + word + pattern on every state; all text ≥ 4.5:1 contrast (WCAG AA).
3. **One-handed, voice-first Drive Mode** — audio + haptic, minimal touch.
4. **Full Spanish localization** — UI strings *and* spoken alerts.

**Why it's innovative, not just clean:** it isn't a status dashboard. It's a **predictive, glanceable, hands-free co-pilot** built around one documented failure: a driver approaching a crossing at night with seconds to decide.

---

## 3. Code Explanation Strategy — CODE

### The Technical Hurdle — "Which gauge, and how many minutes?"

**Linking each crossing to the right upstream gauge, and calculating how long floodwater takes to get from that gauge to the road.**

*Judge-friendly framing:* the water that floods this road fell as rain upstream a while ago. So I have to find **which gauge is actually upstream** — not just nearby — and **how many minutes the water takes to arrive.**

- **Why "nearest gauge" fails:** the closest gauge is often on a *different creek*. That causes false alarms (users learn to ignore the app) or missed floods. **[Your real example: "In the 2015 replay, nearest-gauge flagged ___ but missed ___."]**
- **Why it's hard:** the answer depends on **river-network topology and travel time**, not distance — and small creeks often snap to the wrong river reach.

### The Solution
1. **Snap** each crossing to its NHDPlus stream reach with USGS NLDI (point-in-polygon lookup). **Verify on a map** — fix mis-snaps with a manual override list.
2. **Traverse upstream** through the river network (a directed graph) to find gauges that actually drain to the crossing.
3. **Learn travel time** by cross-correlating the rate-of-rise at the upstream gauge with the rise at the crossing across past storms.
4. **Fetch live gauges concurrently** (`asyncio.gather` with timeouts) so one slow or offline gauge can't stall the rest.
5. **Same code for live and replay** — a swappable `DataSource` guarantees the demo runs the real pipeline.

```python
# Simplified — replace with a real excerpt from your repo once built.
import asyncio
import numpy as np

def travel_time_minutes(upstream, downstream, step_min=5, max_lag_min=240):
    """Lag (minutes) at which the upstream rise best lines up with the rise at the crossing.
    upstream/downstream: stage readings aligned on the same 5-minute clock."""
    up, down = np.diff(upstream), np.diff(downstream)   # rate of rise, not raw level
    best_lag, best_r = 0, -np.inf
    for lag in range(max_lag_min // step_min + 1):
        r = np.corrcoef(up[:len(up) - lag], down[lag:])[0, 1]
        if r > best_r:
            best_lag, best_r = lag, r
    return best_lag * step_min


async def assess(crossing, source, now):
    """Risk for one crossing at time `now`. `source` is LiveUSGS or StormReplay."""
    results = await asyncio.gather(
        *(source.stage_series(g.site_id, end=now, hours=6) for g in crossing.upstream),
        return_exceptions=True,                 # one offline gauge can't stall the others
    )
    usable = [(g, s) for g, s in zip(crossing.upstream, results)
              if not isinstance(s, Exception) and not s.is_stale(now)]
    if not usable:
        return Risk.UNKNOWN                     # never show a calm state without data
    etas = [g.travel_time_min - s.minutes_above(g.trigger_stage)
            for g, s in usable if s.latest >= g.trigger_stage and s.rise_rate(30) > 0]
    return Risk.avoid(window=to_range(max(min(etas), 0))) if etas else Risk.NO_RISE
```

**CS terms you can defend:** directed-graph traversal (upstream navigation), point-in-polygon spatial join, cross-correlation, concurrent async I/O, dependency injection, data leakage / lookahead bias, event-based train–test split, probability calibration, POD / FAR / CSI.

**What I learned** *(write after building — in your own words)*. Shape to aim for: *"The hard part of an ML app isn't the model, it's the data. Treating the river as a graph instead of a nearest-neighbor lookup was the unlock — and [your honest finding about baseline vs. ML]."*

---

## 4. Demo Video Script — STRUCTURE (~2:15)

**Format:** ~2:15 (CAC offices commonly allow 1–3 min — confirm yours). Opens on the problem, kinetic-typography stats, **real app footage for ~60% of the runtime**, ends on a vision statement.
**Footage safety:** use stock or archival flood footage. **Never film near real floodwater.**

**[0:00–0:10] HOOK**
- *Visual:* night windshield POV in rain; headlights catch water creeping across a road. Freeze. Kinetic text: **"TEXAS — #1 IN U.S. FLOOD DEATHS"** (small: *1959–2019*).
- *VO:* "In Central Texas, the most dangerous part of a flood isn't the river. It's the road."

**[0:10–0:25] PROBLEM**
- *Visual:* **"1,069 deaths."** Beat. **"Over half of flood drownings: someone driving into the water."** Cut to a generic map app routing a car toward a crossing.
- *VO:* "Every app I could find tells you a crossing is closed *after* the water's over it. By then, you're already there."

**[0:25–0:35] INTRO**
- *Visual:* logo + "Know before it crosses."
- *VO:* "I'm [NAME], a 9th grader in [CITY], Texas. This is FordCast."

**[0:35–1:20] STORM REPLAY — the proof**
- *Visual:* map at night; label **"REPLAY: real data, [Memorial Day 2015]."** Time scrubber at 60×. An upstream gauge sparkline climbs; a cyan pulse travels down the creek line; the crossing turns **Watch → Avoid**; the card reads "likely flooded within 15–30 min." Then the moment the real sensor recorded water over the road → kinetic number: **"[X] MINUTES EARLIER."**
- *VO:* "This is real data from a real storm, replayed. FordCast links every low-water crossing to the stream gauges actually upstream of it, and learns from past storms how long the water takes to arrive. Here, it warned [X] minutes before water reached the road."

**[1:20–1:45] THE APP, LIVE**
- *Visual:* today's live map (real gauges right now); **Check My Drive** showing a detour around an Avoid crossing; **Drive Mode** voice alert; quick flip to Spanish; VoiceOver reading a card.
- *VO:* "Check your drive before you leave. In Drive Mode it speaks up — in English or Spanish — so your eyes stay on the road."

**[1:45–2:00] HOW IT WORKS (fast, honest)**
- *Visual:* animated pipeline: gauges → river network → travel time → risk → phone. Small results table on screen.
- *VO:* "Under the hood: USGS river-network tracing, travel times learned from [N] past storms, and a risk model that caught [POD]% of floods with a median [X]-minute head start."

**[2:00–2:15] VISION**
- *Visual:* back to the rainy road — the car turns around. Text: **"Turn around. Don't drown. Know before it crosses."**
- *VO:* "In a flood, minutes are everything. FordCast gives them back — starting here in Flash Flood Alley."

**Checklist:** opens on the problem ✓ · kinetic typography on key stats ✓ · real screen recording with zoom/pan ✓ · real result number on screen ✓ · ends on vision ✓ · introduces you + app name ✓.

---

## 5. Official Submission Answers

> **Write the final versions in your own voice** after building. Judges and finalist interviewers can tell, and every number must be yours.

**Q1. Purpose in one sentence.**
FordCast warns Central Texas drivers which low-water crossings are likely to flood soon — before the water reaches the road — and helps them take another route.

**Q2. What inspired you to create this app?**
*[Personalize — real details only.]* I've grown up in [CITY], in the middle of Flash Flood Alley — [a real, specific memory: the creek near your neighborhood, a closed crossing on your way to school, July 2025]. What stuck with me was that so many flood deaths happen on the *road*, at crossings that looked fine until they weren't. The stream gauges and radar that could see it coming are already public. Nobody had turned that data into a warning that reaches a driver in time. I wanted to close that gap.

**Q3. What is your app trying to accomplish?**
FordCast turns public river data into lead time for drivers. Today's tools report a crossing closed only after water is over the road. FordCast links each crossing to the stream gauges truly upstream of it, learns from past storms how long floodwater takes to travel down to the road, and watches those gauges live. When water is on its way, it marks that crossing "Avoid" and helps the driver choose another route. It never tells anyone a crossing is safe — it only adds caution. Replayed against [N] real Central Texas storms, it flagged flooding a median of [X] minutes before water reached the road, catching [POD]% of floods. Next, I want to add radar rainfall and share predicted hotspots with county road crews.

**Q4. What technical/coding difficulty did you face, and how did you address it?**
*[Template — replace with what really happened.]* The hardest problem was figuring out *which* stream gauge actually predicts a given crossing, and *how far ahead*. My first version used the nearest gauge, and in the [2015] replay it [real result — e.g., false alarm on a different creek]. The right answer depends on how the river network connects, not on distance. I used the USGS river-network service to trace upstream from each crossing and find the gauges that really drain to it. Then I estimated travel time by cross-correlating how fast water rose upstream versus at the crossing during past storms. I also had to make sure my replay never "peeked" at future data, or my results would look better than they really were. The biggest lesson: in a machine-learning app, the data pipeline and honest testing matter more than the algorithm.

---

## 6. Build Plan — Oct 14 → Oct 26 (12 days)

| Days | Deliverable | Done when |
|---|---|---|
| **1–2** | **Data spike.** Pick 10–20 crossings that have ground truth (own sensor or a USGS gauge at the road). Pull 3–4 storms from the new USGS API. NLDI upstream gauges for each. | A notebook plots upstream vs. crossing stage for one storm |
| **3–4** | **Travel times + baseline + backtest.** Cross-correlation lags, trigger stages, scoring script. | **The results table in §2 has real numbers** ← the heart of the project |
| **5–6** | **Backend.** FastAPI + Supabase; 5-min live ingest; `DataSource` with Live + Replay. | `/crossings` returns live risk; replay runs end-to-end |
| **7–9** | **App.** Map Home, Crossing Card, Replay scrubber, Check My Drive. | Demo flow works on a real phone |
| **10** | **Polish.** Push alerts, Drive Mode voice, Spanish strings, accessibility pass, disclaimer. | VoiceOver walkthrough works |
| **11** | **Video + answers** with real numbers. README (setup, data sources, built vs. roadmap). | Video uploaded; answers final |
| **12** | **Buffer → submit by Oct 25** (a day early; video processing and forms take time). | Confirmation email received |

**If behind, cut in this order:** offline cache → ML model → rerouting → push.
**Never cut:** real data pipeline · Storm Replay · Crossing Card · backtest numbers.

---

## 7. Claims Ledger — say it only if it's true

| Claim (video / answers) | Say it only if… | Status |
|---|---|---|
| "Real data from a real storm" | Replay uses actual historic USGS readings | [ ] |
| "Warned [X] minutes earlier" | X comes from your backtest script | [ ] |
| "Machine-learning model" | A trained model is in the live pipeline | [ ] (else say "forecast rule learned from past storms") |
| "Reroutes you" | Detour actually computed in-app | [ ] |
| "Works offline" | Tested in airplane mode with cached alerts | [ ] |
| "Spanish" | All UI strings + voice alerts translated | [ ] |
| "Radar rainfall" | MRMS actually ingested | [ ] (else Roadmap) |

---

## 8. Pre-Submission Checklist

- [ ] **District:** confirm with your home address at house.gov ("Find Your Representative"). Under the current map, Travis County is split among **TX-10, 17, 21, 35, and 37** [S10]; CAC runs through your *current* Representative's office. Confirm that office is participating.
- [ ] **Deadline & rules** on your Rep's CAC page (time zone, video length, team rules).
- [ ] **Every `[X]` / `[N]` / `[POD]`** replaced with real measured values.
- [ ] **Q2–Q4 rewritten in your own words.**
- [ ] **Public repo + README:** setup steps, data sources, Built vs. Roadmap list. Commit regularly — a history spread over days shows your work.
- [ ] **AI-tool use:** check your district's rules, disclose if required, and be able to explain every line.
- [ ] **Sources** listed in the README and/or the video end card.
- [ ] **No-flood test:** the app looks good and doesn't crash on a calm day (that's what judges will see live). Stale-data handling shows "Unknown."
- [ ] **Safety disclaimer** visible in the app.
- [ ] **Optional, high-impact:** email the City of Austin Flood Safety / Watershed Protection office, Travis County Emergency Services, or the NWS Austin/San Antonio office for feedback. A real reply (quoted with permission) is powerful IMPACT evidence.

---

## 9. Sources

- **[S1]** Flood deaths by state, 1959–2019 (Texas 1,069; Louisiana 693) — [Datawrapper chart used in July 2025 AP coverage](https://datawrapper.dwcdn.net/XBmtp/5/); AP, ["Texas leads nation in flood deaths due to geography, size and population"](https://www.ksat.com/tech/2025/07/12/texas-leads-nation-in-flood-deaths-due-to-geography-size-and-population/) (July 12, 2025)
- **[S2]** Han, Z. & Sharif, H.O., ["Vehicle-Related Flood Fatalities in Texas, 1959–2019,"](https://rrpress.utsa.edu/items/8a0eb964-1a3e-4bf8-b2c4-084fdd65b29c/full) *Water* (MDPI) — 570 vehicle-related deaths; Flash Flood Alley clustering; night; ages 20–29
- **[S3]** "Turn Around, Don't Drown" — over half of flood-related drownings involve a vehicle driven into floodwater (CDC/NWS), e.g. [Kentucky Emergency Management](https://kyem.ky.gov/Preparedness/Pages/TADD.aspx)
- **[S4]** NASA Scientific Visualization Studio, ["July 2025 Texas Precipitation and Guadalupe River Flooding"](https://svs.gsfc.nasa.gov/5595) — 26 ft in 45 min at Hunt
- **[S5]** AP, ["Hill Country flood death toll rises to 135 statewide"](https://komonews.com/news/nation-world/gallery/hill-country-flood-death-toll-rises-to-135-statewide-116-in-kerr-county-says-abbott?photo=1) — *verify the final count with Texas DPS/TDEM before submitting*
- **[S6]** Travis County deaths — [KUT](https://www.kut.org/energy-environment/2025-07-06/travis-county-tx-flooding-rain-severe-weather-williamson-burnet-atx-flood), [CBS Austin](https://www.cbsaustin.com/news/local/travis-county-sheriffs-office-identifies-5-more-found-dead-after-floods-death-toll-now-8) — *about 10 per the Sheriff's Office; confirm the final figure*
- **[S7]** [KUT report on Austin's low-water crossings](https://www.kut.org/transportation/2025-07-16/austin-tx-floods-fix-low-water-crossings-roads-drive-safety) (July 16, 2025) — 67 crossings monitored on ATXfloods; City of Austin ["Low Water Crossings That Flood" dataset](https://catalog.data.gov/dataset/low-water-crossings-that-flood)
- **[S8]** LSU graduate thesis on "Turn Around, Don't Drown" effectiveness — [LSU Digital Commons](https://repository.lsu.edu/gradschool_theses/5466)
- **[S9]** Data/tools: [USGS Water Data APIs + legacy retirement timeline](https://www.usgs.gov/tools/usgs-water-data-apis) · [USGS migration guide](https://api.waterdata.usgs.gov/docs/ogcapi/migration) · [USGS NLDI](https://api.water.usgs.gov/docs/nldi) · [NOAA NWPS API](https://water.noaa.gov/about/api) · [LCRA Hydromet](https://hydromet.lcra.org/)
- **[S10]** Travis County congressional split — [City Cast Austin](https://austin.citycast.fm/local-civics/what-travis-county-redistricting-new-congressional-maps)
- **[S11]** CAC 2026 deadline (example office page) — [Rep. Larsen, 2026 CAC](https://larsen.house.gov/helping-you/2026-congressional-app-challenge.htm) — *check your own Rep's page*
- **[S12]** NHTSA, *Visual-Manual Driver Distraction Guidelines for In-Vehicle Electronic Devices* (2013)
