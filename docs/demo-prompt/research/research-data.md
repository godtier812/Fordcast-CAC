# FordCast Demo Edition: simulated data, scenario engine, Demo Director and video take plan

Role: simulation and demo-director engineer. Written 2026-10-16 for the iPhone-only Demo Edition (Expo SDK 57, free Personal Team, everything on the device). Companion docs: `research-ui.md` (screens and IA) and `research-ios.md` (signing, recording). This doc follows both where they overlap. The places where it had to choose between them are listed in §9.

**Evidence tags**
- **[Verified: source]**: I read it in a primary source, an npm package's source, or I ran it. "Ran" means the bun/tsx prototype on 2026-10-16.
- **[Unverified]**: an inference. Check it on the Mac or the iPhone.

**The prototype is the spec.** Everything below runs as TypeScript in
`/tmp/claude-0/-home-user-Fordcast-CAC/608fe985-2ad7-54f1-8865-eca0e6597f76/scratchpad/demo/proto/`.
- Test results: `bun test` → **21 pass, 0 fail, 483 assertions**.
- Type check: `tsc --strict --noUncheckedIndexedAccess` → **0 errors** (typescript 5.9.3).
- [Verified: ran]
- Every time and number in this document comes from that code's output, not from hand-typed values.

---

## 0. Decisions (TL;DR)

1. **One engine, real logic, fake water.**
   - A deterministic simulator makes 15-minute USGS-style gauge readings: parametric hydrographs, routing between gauges, delivery delay and outages.
   - The **unchanged** FordCast pipeline then runs on the phone, one 5-minute tick at a time:
     - baseline rule (trigger stage, rate of rise, learned travel time τ)
     - fixed risk-window buckets
     - staleness → UNKNOWN
     - official-closure precedence
     - hysteresis state machine
   - Those are line-for-line TypeScript ports of C §18.1/18.5/18.6/18.8/18.9 and A §3.3.
   - The hidden "truth" (when water really reached each road) is used only to score the result. A test proves the engine never imports it.
2. **Four scenarios:** Calm evening · **Flash flood night** (hero) · Big Onion Creek storm (simulated; has the gauge-goes-silent UNKNOWN beat) · Drive to school (simulated).
   - All four compile in **4–13 ms in bun and 6–30 ms with the JIT disabled**. The JIT-less run is a rough stand-in for Hermes. [Verified: ran]
3. **The hero storm tells one clean story, and every number is computed.** Storm times:

   | Time | What happens |
   |---|---|
   | 6:45 AM | ▲ Watch at Williamson Creek at Jones Road |
   | 7:00 AM | ◆ Avoid, "likely flooded within 15–30 min", plus a lock-screen notification |
   | 7:30 AM | Water reaches the road. This is inside the first window shown, 30 min after the warning. |
   | 7:50 AM | ▧ Closed · OFFICIAL (simulated road crew), **50 min after FordCast said Avoid** |

   - The 30-min hero is picked by the full build's pre-registered rule: the warning closest to the median. The median across the 3 crossings that flooded is 30 min.
4. **One global clock.** `simMin` is a closed-form function of an anchor and wall time, so it never drifts and gives the same result on every take.
   - Speeds are 1/10/30/60/120×, with optional auto-slow to 10× around beats.
   - Every screen, notification and voice line reads the same clock.
5. **Every video take is data** (`takes.ts`). Each take names a scenario, a keyframe resolved from engine events, a screen, a gesture, and the states that must be on screen.
   - A test re-checks every take. If anyone retunes a hydrograph, a broken shot fails CI instead of failing on camera.
6. **Lock-screen shots use OS-scheduled local notifications** (`TIME_INTERVAL` trigger), because JS is suspended while the phone is locked.
   - Tapping the notification moves the clock to the exact beat the notification announced.
7. **Honest by construction.**
   - Crossing names and locations are real: copied verbatim from the City of Austin's open-source ATXfloods list.
   - Gauge IDs, names and coordinates are real USGS sites.
   - Everything that moves is simulated. It's labeled violet **SIMULATED**, and every notification carries the subtitle "Simulated storm · demo data".
   - The closure source is "Simulated road crew", never a real agency.

---

## 1. Demo dataset

### 1.1 Crossings (25: 12 tier A · 5 tier B · 8 tier C)

**Source.** Names, addresses and coordinates are copied **verbatim** from the City of Austin's open-source ATXfloods backend, `cityofaustin/ctxfloods-backend`, file `populateDB/data/legacyCrossings.csv` (MIT). It has columns `communityId, legacyId, name, humanAddress, latitude, longitude, …`.
- I read every row used here on 2026-10-16. [Verified: raw.githubusercontent.com fetch of the CSV]

**Rules the data follows:**
- **Names are never translated or invented** (A §3.10 rule 6).
- `spoken.{en,es}` expands "@", "Rd", "#" and similar for TTS (A §3.10 rule 2).
- `creekVerified = true` only when the creek is named **in the dataset record itself**. Otherwise the creek is `null`, and the UI shows the address instead.
- Links (gauge → crossing, τ, trigger) are **authored demo values**. They are plausible but not learned (§1.3).

| id | Name (verbatim) | Tier | Creek (verified?) | Upstream gauge(s) | Role |
|---|---|---|---|---|---|
| atx-37 | Williamson Creek at Jones Road | A | Williamson Creek ✓ | 08158922 | **Hero**; on the Home → School commute |
| atx-680 | Westgate Blvd @ Williamson Creek | A | Williamson Creek ✓ | 08158922 | Upstream neighbor; Avoid at 7:15 |
| atx-692 | Manchaca Rd & Jones Rd | A | — | 08158922; at-road gauge 08158930 | Second crossing on the commute; **sensor CLOSED** beat |
| atx-32 | Jimmy Clay Golf Course | A | — | 08158930 (P), 08158922 | Far downstream; long window 60–90 |
| atx-38 | Williamson Creek (Kincheon Branch) at Latta Dr | C | Kincheon Branch ✓ | — | Unknown · not monitored |
| tc-85 | Williamson Creek Dr @ Williamson Creek | C | Williamson Creek ✓ | — (upstream of every gauge) | Honest gap: floods first, not monitored |
| tc-87 | Mowinkle Dr @ Williamson Creek | C | Williamson Creek ✓ | — | same |
| hays-663 | W RR 150 @ Onion Creek (Double Crossings) | B | Onion Creek ✓ | 08158700 (~60 m away) | Tier B: almost no lead time (honest) |
| bud-1117 | Garrison Rd @ Onion Creek | A | Onion Creek ✓ | 08158800 (P), 08158700 | 85-min lead from far upstream |
| tc-68 | Old San Antonio Rd @ Onion Creek | A | Onion Creek ✓ | 08158800 (P), 08158827 | **Storm-tab hero** (35 min) |
| tc-1626 | Bluff Springs Rd @ Onion Creek | A | Onion Creek ✓ | 08158827 only | **Gauge-silent UNKNOWN** beat |
| atx-39 | South Boggy Creek at Dittmar | C | South Boggy Creek ✓ | — | not monitored |
| atx-120 | Slaughter Creek Trail | B | — | 08158840 (~35 m away; also at-road) | Watch at 7:15 |
| atx-31 | Circle C Park | A | — | 08158840 | Watch at 7:15 |
| tc-94 | Slaughter Creek Dr @ Tributary to Slaughter Creek | C | Tributary ✓ | — | not monitored |
| atx-40 | Shoal Creek at Lamar | B | Shoal Creek ✓ | 08156800 | calm |
| atx-41 | Waller at 8th Street | A | Waller Creek ✓ | 08157000 | calm |
| atx-1361 | Red River @ 12th | A | — | 08157000 | calm |
| atx-8 | Low Water Crossing #10 (6700 Lakewood Dr) | B | — | 08154700 | calm |
| atx-33 | Bull Creek Park | C | — | — | not monitored |
| atx-3 | Low Water Crossing #3 (6650 Spicewood Springs Rd) | C | — | — | not monitored |
| tc-59 | Springdale Rd @ Walnut Creek | A | Walnut Creek ✓ | 08158200 | calm |
| tc-1790 | Henry Marx @ Barton Creek | A | Barton Creek ✓ | 08155200 | calm |
| atx-716 | Barton Springs Road | B | — | 08155400 (~700 m upstream) | calm |
| tc-76 | Fitzhugh Rd @ Barton Creek | C | Barton Creek ✓ | — | not monitored |

**ID scheme.**
- `atx-<legacyId>` = City of Austin, community 9009.
- `tc-` = Travis County, 9010.
- `hays-` = Hays County, 9016.
- `bud-` = City of Buda, 9016.
- The full `source {communityId, legacyId, address}` is kept on every record. The About screen credits it, and the full build can map these back to the same IDs.

**Map Home summary line** (A §3.7 `state.no_rise.area_sub`): "Watching **12** upstream gauges for **17** crossings". There are 12 distinct linked gauges, and 17 = tier A + tier B. [Verified: ran]

### 1.2 Gauges (14 real USGS sites; readings simulated)

| Site | USGS name | Lat, Lon | Tag |
|---|---|---|---|
| 08158922 | Williamson Ck at Brush Cntry Blvd, Oak Hill, TX | 30.2263215, −97.8414188 | name [Verified: hydro.md §8 + NWIS search]; coords from the earlier run [Unverified] |
| 08158930 | Williamson Ck at Manchaca Rd, Austin, TX | 30.22132064, −97.7936168 | [Verified: geoconnex/USGS record via search] |
| 08158970 | Williamson Ck at Jimmy Clay Rd, Austin, TX | ≈30.189, −97.733 | [Unverified: search snippet only] |
| 08158700 | Onion Ck nr Driftwood, TX | 30.082989, −98.007786 | [Verified: USGS/geoconnex/AW via search] |
| 08158800 | Onion Ck at Buda, TX | 30.0860467, −97.8480606 | [Verified: USGS page via search] |
| 08158827 | Onion Ck at Twin Creeks Rd nr Manchaca, TX | 30.12632345, −97.8211161 | [Verified: USGS page via search; DA 181 mi²] |
| 08159000 | Onion Ck at US Hwy 183, Austin, TX | 30.177778, −97.688333 | name [Verified: hydro.md §8]; coords [Unverified] |
| 08158840 | Slaughter Ck at FM 1826 nr Austin, TX | 30.2090972, −97.9033409 | name [Verified: hydro.md]; coords [Unverified] |
| 08156800 | Shoal Ck at W 12th St, Austin, TX | 30.276598, −97.7503052 | [Verified: hydro.md §8] |
| 08157000 | Waller Ck at 38th St, Austin, TX | 30.29715196, −97.7269497 | [Verified: USGS record via search] |
| 08154700 | Bull Ck at Loop 360 nr Austin, TX | 30.37215, −97.78473 | name [Verified]; coords [Unverified] |
| 08158200 | Walnut Ck at Dessau Rd, Austin, TX | 30.375205, −97.6605601 | [Verified: USGS record via search] |
| 08155200 | Barton Ck at SH 71 nr Oak Hill, TX | 30.29631587, −97.925565 | [Verified: WQP + AW via search] |
| 08155400 | Barton Ck abv Barton Spgs at Austin, TX | 30.26354168, −97.772228 | [Verified: USGS page via search] |

- **Simulated gauge parameters:** 15-min readings, rounded to 0.01 ft, 10-min delivery delay, stale after 45 min (C §18.9 replay rule: ≥ delay + 20).
- **Live USGS** is blocked from this sandbox (`waterdata.usgs.gov` and `api.waterdata.usgs.gov` don't resolve). The coordinates marked [Unverified] above are therefore a 5-minute Day-0 check: on the Mac, open `https://waterdata.usgs.gov/monitoring-location/<site>/`.

### 1.3 Links (authored, physically plausible)

- **Watch level** = baseline + 0.6·(trigger − baseline) (C §18.4).
- **Tier-B links** use the C §17.13 transfer shape: P25 = 0.6τ, P75 = 1.4τ, `nStorms = 0` (transferred, never learned). The UI shows "Estimated".
- **Display travel range** = the A §3.5 rule 8 rounding (never a single number).
- **Physical sanity:** celerity = channel km / τ falls in the C §18.3 bound [0.5, 6] m/s for every tier-A link. The range is 1.6–3.1 m/s. [Verified: ran]

| Crossing ← gauge | τ med (P25/P75) | Shown as | Trigger / watch ft | Channel km |
|---|---|---|---|---|
| atx-37 ← 08158922 | 40 (33/44) | **30–45 min** | 6.0 / 4.4 | 5.3 |
| atx-680 ← 08158922 | 34 (29/39) | 15–45 | 8.5 / 5.9 (higher road deck) | 4.6 |
| atx-692 ← 08158922 | 45 (38/52) | 30–60 | 7.5 / 5.3 | 6.0 |
| atx-32 ← 08158930 (P) · 08158922 | 70 · 110 | 60–90 · 90–135 | 7.0 · 9.0 | 9.0 · 14.3 |
| tc-68 ← 08158800 (P) · 08158827 | 45 · 10 | 30–60 · 5–15 | 9.0 · 10.0 | 8.3 · 1.4 |
| tc-1626 ← 08158827 | 40 (33/44) | 30–45 | 10.0 / 7.3 | 7.4 |
| bud-1117 ← 08158800 (P) · 08158700 | 15 · 135 | 5–30 · 120–150 | 9.0 | 1.4 · 23 |
| others (calm in every scenario) | see `proto/data.ts` | | | |

**Day-0 option that turns "authored" into "checked".** On the Mac, run NLDI once per crossing:
- `hydrolocation` → COMID → `navigation/UT/nwissite`.
- This confirms the linked gauge really is upstream. The URL patterns are in hydro.md §2 [Verified there].
- Write the result into `links.ts` as `upstreamVerified: true`.
- The sandbox can't reach USGS, so this is [Unverified] until it's run.

### 1.4 Creek polylines (for the water pulse and the cyan creek lines)

- **Bake them once on the Mac.** Never call NLDI at runtime.
  - Query: `https://api.water.usgs.gov/nldi/linked-data/nwissite/USGS-08158922/navigation/DM/flowlines?distance=25` (URL pattern from hydro.md §2).
  - Clip from the gauge to `nearestPointOnLine(crossing)`.
  - Run `@turf/simplify` (tolerance ≈ 0.0001°, ≤ 40 vertices).
  - Write `mobile/src/demo/data/creeks.json`, one entry per link: `{ reach_id: "<crossing>__<gauge>", coords }`. This is the same key as the full build's `creeks.geojson`, A §4 F86.
- **Fallback** if NLDI is down: trace the creek in geojson.io over the OSM layer, using the waterway lines visible on the "FordCast Night" style. This takes about 2 min per reach. Only the Williamson reaches (atx-37/680/692) and the Onion reaches (tc-68/tc-1626) are on camera.
- **Credit:** USGS NHDPlus.

### 1.5 Saved places and routes (precomputed, no routing API at runtime)

**Places** (`places.ts`) are generic pins labeled only "Home"/"Casa" and "School"/"Escuela".
- **Do not put the pins on the student's real home or school.** The video will be public.
- Draft points: Home (−97.8052, 30.2312) and School (−97.7911, 30.2146), both in 78745.

**Routes** (`routes.json`):
- `commute`: Home → **atx-37** (1,028 m along) → **atx-692** (1,622 m along) → School. Draft length 2,367 m.
- `detour`: shares the commute up to `BRANCH` (898 m along, 130 m before Jones Rd), then crosses the creek elsewhere. Draft length 3,629 m. No crossing lies within 40 m of it.
- All values are from the prototype's draft polylines [Verified: ran].

**Bake tool** (`tools/bake-demo-routes.mjs`, run once on the Mac with a free ORS key):
- Endpoint: `POST https://api.openrouteservice.org/v2/directions/driving-car/geojson`.
- Commute body: `coordinates: [Home, atx-37, atx-692, School]`.
- Detour body: `coordinates: [BRANCH, School]` and `options.avoid_polygons` = a MultiPolygon of 150 m circles around atx-37 and atx-692.
- Endpoint and body shape: [Verified in maps.md §481 / backend.md §302].
- Prepend the commute prefix Home→BRANCH to the detour, so the simulated car turns without jumping.
- Store `durationS` from ORS. This gives "Detour adds {{n}} min" (draft estimate: about +2 min).
- Add the ORS + OSM credit in About.

**CI test (port of `demo.test.ts`):**
- `crossingsOnRoute(commute)` must equal `[atx-37, atx-692]`.
- `crossingsOnRoute(detour)` must be empty.
- The tolerance is 40 m (A §4 F49).

---

## 2. Scenario engine

### 2.1 File layout (`mobile/src/demo/`; prototype file → app module)

```
mobile/src/demo/
├─ engine/          ← proto/engine.ts, learn.ts, types.ts   (PURE; no imports from sim/, no Date.now())
│   types.ts · features.ts · windows.ts · explain.ts · baseline-rule.ts · combine.ts · state-machine.ts · travel-time.ts
├─ sim/             ← proto/sim.ts                            (rng · hydrograph · gauge-series · truth)
├─ data/            ← proto/data.ts + baked files              gauges.ts · crossings.ts · links.ts · places.ts · routes.json · creeks.json
├─ scenario/        ← proto/compile.ts, display.ts, choreo.ts, clock.ts, takes.ts, scenarios.ts
│   schema.ts · compile.ts · display.ts · choreography.ts · keyframes.ts · clock.ts · takes.ts
│   scenarios/{calm-evening,flash-flood-night,onion-creek-storm,drive-commute}.ts
├─ drive/           ← proto/drive.ts                          geo.ts (Turf 7.4) · routes.ts · sim-location.ts · lockout.ts · speech-plan.ts
├─ notify/          ← proto/notify.ts                         content.ts · lockscreen.ts · adapter.ts (expo-notifications)
├─ voice/           speak.ts (expo-speech + expo-audio chime) · haptics.ts (expo-haptics)
├─ store/           demo-store.ts (zustand 5.0.15) · hooks.ts
├─ director/        DirectorSheet.tsx (route app/demo.tsx) · TouchOverlay.tsx · useCleanMode.ts
└─ __tests__/       engine-test.ts · display-test.ts · demo-test.ts   (bun:test → jest-expo: same expect/test API)
```

**Truth isolation.**
- Only `scenario/compile.ts` imports `sim/truth.ts`, and only inside its results block.
- `engine-test` asserts that `engine/` never imports `sim/`. This is the C §19.8 spirit.

### 2.2 The scenario format (`fordcast.demo-scenario.v1`)

Scenarios are TypeScript data, so they are type-checked and easy to diff.

```ts
export type DemoScenarioV1 = {
  schema: 'fordcast.demo-scenario.v1';
  id: string; seed: number; kind: 'live' | 'storm';         // 'live' drives Map Home; 'storm' is a Storms-tab card
  title: { en: string; es: string }; subtitle?: { en: string; es: string };
  clockStart: { h: number; m: number };                     // storm-time label at simMin 0 (America/Chicago)
  durationMin: number; playFromMin: number;                 // "Skip to action" start
  rain: { t: number; inPerHr: number; over: string }[];     // visual only (rain chip/tint); NEVER changes a state
  curves: GaugeCurve[];                                     // per-gauge stage generator (below)
  outages: { gaugeId: string; startMin: number; endMin: number; mode: 'delayed' | 'lost' }[];
  official: { crossingId: string; source: 'demo_official'; status: 'open' | 'caution' | 'closed'; setAt: number; expiresAt: number }[];
  network: { t: number; online: boolean }[];                // scripted connectivity (the Director can override)
  truth: { crossingId: string; fromGaugeId: string; tauTrueMin: number; overtopUpFt: number }[];   // results only
  subscriptions: { crossingIds: string[]; watchAlerts: boolean };   // which crossings notify (A §3.8 policy)
  keyframes: Keyframe[];
  drive?: { route: 'commute' | 'detour'; startSimMin: number; cruiseMps: number; accelS: number; takeDetourAtBranch?: boolean };
};
export type Keyframe = { id: string; label: string; at:
  | { kind: 'min'; t: number }
  | { kind: 'event'; crossingId: string; state: Wire; nth?: number; offsetMin?: number }  // resolved from compiled events
  | { kind: 'onset'; crossingId: string; offsetMin?: number } };                          // resolved from truth
export type Pulse = { peakMin: number; riseMin: number; fallMin: number; ampFt: number; kRise?: number; kFall?: number };
export type GaugeCurve = { gaugeId: string; pulses?: Pulse[];
  routedFrom?: { gaugeId: string; lagMin: number; gain: number; smoothMin: number };     // downstream response of an upstream gauge
  diurnalFt?: number; noiseFt?: number };
```

**Hydrograph math** (`sim/hydrograph.ts`):
- Rising limb: `amp·(s·e^(1−s))^kRise`.
- Recession: `amp·((1+f)·e^(−f))^kFall`.
- Both limbs have zero slope at the peak, so the curve is C¹ and looks like a real hydrograph.
- A downstream gauge = baseline + `gain` × the boxcar-smoothed, `lagMin`-delayed anomaly of its upstream gauge. Water visibly travels.
- Noise comes from mulberry32 seeded by FNV-1a(seed, gaugeId): deterministic per scenario and per gauge.

**Readings** (`sim/gauge-series.ts`):
- One reading every 15 min.
- `availMin = obs + delay`.
- If the reading falls inside a `delayed` outage: `availMin = max(obs + delay, outage.end)`, the C §19.4 rule.
- A `lost` outage is a true gap.

### 2.3 What runs on the phone each 5-minute tick (`scenario/compile.ts`, the C §19.6 tick)

```
for t in [−60 … durationMin] step 5:                          // 60-min warm-up, as C §18.8 replay does
  series[g] = readings with availMin ≤ t and obsMin ≥ t − 360  // as-of discipline, 6-h lookback (C §18.1)
  for each crossing c:
    rule  = evaluate(c, links, series, t)                     // C §18.5 baseline rule: trigger + rate + τ → window
    stale = crossingIsStale(…)                                // C §18.9 (a) all stale, (b) primary stale & no signal
    raw   = resolveRawState(official, waterAtRoad, tier, stale, rule)   // A §3.3: the ONLY combination logic
    tracker[c] = step(tracker[c], raw, t, ctx)                // C §18.8 T1–T7 hysteresis (dwell 6/6/12 ticks)
    emit an event only when (state, window, held, reason codes) changed   // fordcast.replay.v1 "events" semantics
results (truth only here): onsets → lead = onset − start of the matching AVOID episode, floored to 5 (C §19.12);
  tier B excluded (C §17.13); hero = closest to the median, ties → earlier onset (C §18.13); + "inside the first window?"
```

**Output shape:**
`{ initial, events[], readings, onsets, leads[], hero, medianLead }`.
- This maps 1:1 onto the full build's `fordcast.replay.v1` `events/gauges/truth/hero/storyboard`.
- A 40-line `toReplayV1(cmp)` lets the D §33 player components (`stateAt`, `visibleSamples`, scrubber ticks, LagPair) be reused unchanged.
- Set `assumptions.values = "simulated"` and `assumptions.official_status = "simulated"`.

**Spec gaps the prototype found and fixed.** Feed these back into the full build.
1. **Negative rise in an AVOID reason.**
   - The "crossed the trigger recently" clause (C §18.5 step 2) keeps AVOID while the upstream gauge is already falling.
   - The bank template would then render "**+-0.4 ft** over the last 30 min" (seen at Jimmy Clay, 8:00 AM).
   - Fix: when `rise_ft_30m ≤ 0`, render the new key `reason.UPSTREAM_ABOVE_TRIGGER_peaked`: "{{gauge}} is above its trigger level, upstream. Water usually takes {{tau_lo}}–{{tau_hi}} min to get here." The Spanish is in `copy.ts` and needs native review.
2. **Stepped-down WATCH with no reason.** When T7 steps AVOID → WATCH while the raw state is `no_rise`, the result has no reason. That breaks C §18.10 "every non-no_rise state carries ≥ 1 reason". Fix: add `HOLDING`.
3. **CLOSURE_LIFTED dropped too early.** It must persist "until no_rise" (C §18.8 T7), but the prototype dropped it on the next tick. Fixed: carried forward on WATCH/AVOID.
4. **Tier B in leads.** Tier-B crossings were counted in leads and the median. C §17.13 forbids that. Fixed.
5. **Push titles over 50 characters.** Three crossing names exceed the 50-char title limit (atx-38, hays-663, tc-94). The builder must drop a trailing parenthetical first. None of the three is subscribed in any demo scenario.

### 2.4 The clock (`scenario/clock.ts`)

```ts
type ClockState = { playing: boolean; speed: 1|10|30|60|120; anchorSimMin: number; anchorWallMs: number;
                    minMin: number; maxMin: number; autoSlow: { fromMin: number; toMin: number }[] };
simNow(c, wallMs)           // closed form: anchor + piecewise(speed, 10× inside autoSlow windows); no accumulation
play / pause / seek / setSpeed / setAutoSlow (c, …, wallMs) → ClockState   // each rebases the anchor → continuous
tickOf(simMin) = floor(simMin/5)*5                         // screens re-render only when the tick changes
stormTime(clockStart, simMin, 'en'|'es') → "7:00 AM" / "7:00 a. m."   // minute-floored, never seconds
```

- **Speeds:** 60× is the default, which is one storm-minute per wall-second.
- **Auto-slow** (D §33.9): drops to 10× from beat − 5 min to beat + 5 min.
- **Background policy:**
  - `AppState → background` **pauses** the clock, unless a lock-screen take is armed (§4.2).
  - Returning to the app never jumps the storm forward.
- **UI sampling:**
  - The storm-time label and scrubber thumb use a 250 ms JS ticker (or a Reanimated `useFrameCallback` for the thumb).
  - Risk consumers subscribe to `tickOf(simMin)`, so at 120× they re-render at most once every 2.5 s.

### 2.5 What a screen shows (`scenario/display.ts`, A §3.4)

`displayAt(cmp, crossingId, simMin, network)` returns `{ state, window, held, reasons, lastKnown, checkAgeMin, newestReadingAgeMin, freshness }`.
- **Check age:** time since the last 5-min "check" made while online.
- **Freshness:** 10–20 min → `aging` (slate pill). Over 20 min → **every crossing UNKNOWN**, with "Last known: {{state}} · {{age}}" when the last state was Watch or worse. A calm crossing never gets a calm look when offline.
- **Gauge-silent "last known" age:** the age of the **last observation**, not of the tick. For example, "Last known: Avoid · 50 min ago" at Bluff Springs.

### 2.6 Store and hooks (`store/demo-store.ts`, zustand 5.0.15 [Verified: npm view])

```ts
type DemoStore = {
  scenarioId: string; clock: ClockState; compiled: Map<string, Compiled>;     // memoized per scenario id
  netOverride: { fromMin: number; online: boolean } | null;                    // Director "Simulate offline"
  clean: boolean; touches: boolean; lockout: 'auto' | 'off'; voiceLang: 'app' | 'en' | 'es';
  armedTake: { notificationId: string; seekToMin: number; route: string } | null;
  firedIds: Set<string>;                                                       // dedupe foreground notifications per take
};
useSimMinute(): number                        // 250 ms sampler of simNow(clock, Date.now())
useCrossingRisk(id): DisplayRisk              // displayAt(compiled, id, tickOf(simMin), network ⊕ netOverride)
useScenarioBanner(): { active: boolean; label: string }   // "SIMULATED · 7:00 AM storm time"
```

- **Compile timing:** compile when a scenario is selected (≤ 30 ms JIT-less [Verified: ran]). Pre-compile all four after the first frame with `InteractionManager.runAfterInteractions`.
- **Isolation:** scenario state never enters React Query or SQLite. That is the full build's isolation rule.

---

## 3. The four scenarios (beat sheets come from the engine output [Verified: ran])

### (a) Calm evening: `calm-evening`, 7:30–9:30 PM, seed 11

- **Events:** 0.
- **Tier A and B (17 crossings):** ○ No rise detected.
- **Tier C (8 crossings):** ◌ "Unknown · not monitored by FordCast".
- **Gauges:** gentle diurnal wiggle (±0.03 ft) and noise (±0.01 ft), so sparklines look alive and never flat.
- **Use:** the calm shot (T01) and the default state after Reset.

### (b) Flash flood night (hero): `flash-flood-night`, starts 5:50 AM, seed 26

**Setup.**
- "Pre-dawn cloudburst over Oak Hill": rain 0.4 → 3.1 in/h from 5:55 to 7:40 (visual only).
- Upstream gauge 08158922 rises from 2.1 to 9.7 ft (peak 7:25).
- Downstream gauges 08158930 and 08158970 respond with routed lags.
- 08158840 (Slaughter) gets a smaller pulse.

| Storm time | simMin | What the engine produces | Surfaces |
|---|---|---|---|
| 6:45 AM | 55 | atx-37 ▲ **Watch** (UPSTREAM_RISING, +2.6 ft) | map, sheet, Drive TTS |
| 7:00 AM | 70 | atx-37 ◆ **Avoid · likely flooded within 15–30 min** (+4.5 ft over the last 30 min; "water usually takes 30–45 min to get here"). Westgate ▲, Manchaca & Jones ▲, Jimmy Clay ▲ | **AVOID local notification** (subscribed crossing), AlertBanner, Error haptic |
| 7:05 AM | 75 | atx-37 window → 0–30 → headline "Avoid · water may already be on the road" (lo = 0 rule) | |
| 7:15 AM | 85 | Westgate ◆ 15–30 · Manchaca & Jones ◆ 15–60 · Circle C ▲ · Slaughter Creek Trail ▲ | |
| **7:30 AM** | 100 | **Water reaches the road at Jones Rd** (truth; inside the first window; **lead 30 min**) · Jimmy Clay ◆ 60–90 | result count-up |
| 7:45 AM | 115 | Westgate water on road (lead 30) | |
| 7:50 AM | 120 | atx-37 ▧ **Flooded – Closed · OFFICIAL**, source "Simulated road crew" | **CLOSED notification** |
| 8:02 AM | 132 | Manchaca & Jones water on road (lead 45) | |
| 8:15 AM | 145 | Manchaca & Jones ▧ CLOSED via **sensor at the road** (Williamson Ck at Manchaca Rd ≥ 9.0 ft) | |
| 9:25 AM | 215 | simulated crew lifts the closure → held CLOSED (dwell) | |
| 9:50 AM | 240 | atx-37 → Avoid (held) + "Simulated road crew: closure lifted at 9:25 AM. Water may remain. Use caution." | never "reopened" |
| 10:20 AM | 270 | → Watch (held). It never jumps to No rise. | |

**Results**
- **Hero:** atx-37, **30 min**.
- **Median** across the 3 flooded tier-A crossings: **30 min**.
- **Closure gap:** **50 min** after the first Avoid.
- **Window check:** all three onsets landed inside the first window shown.

### (c) Big Onion Creek storm (simulated): `onion-creek-storm`, starts 1:00 AM, seed 13

**Setup.**
- An all-night storm over Driftwood, patterned on the kind of overnight Onion Creek floods Austin has had (hydro.md §9). It is **not** a replay of 2013 or 2015, and the copy never says it is.
- Driftwood rises 15 ft and the wave routes Buda → Twin Creeks → US 183.

| Storm time | What happens |
|---|---|
| 2:10 / 2:25 AM | W RR 150 (Double Crossings, tier B) ▲ then ◆ "water may already be on the road". Water arrives at 2:25, so lead **0**. The honest "tier B = little warning" example. |
| 2:55 AM | Garrison Rd ◆ **60–90** (from Driftwood, 23 km upstream); water arrives 4:24, so lead 85 |
| 4:25 AM | Old San Antonio Rd ◆ 15–60; water 5:04 → **lead 35 (storm hero)** |
| 5:10 AM | Bluff Springs Rd ◆ 15–60; water 5:45 → lead 35 |
| **5:50 AM** | **Twin Creeks gauge goes silent.** Its readings exist but arrive only at 6:35. Bluff Springs → ◌ **UNKNOWN, "Last known: Avoid · 50 min ago"**. Storyboard line: "Onion Ck at Twin Creeks Rd went silent. Its readings only arrived later, so FordCast shows Unknown here." |
| 6:35 AM | Delayed readings arrive at once → Bluff Springs ◆ again. It is never shown as calm. |
| 6:00–7:40 AM | US 183 gauge also silent (readings delayed to 7:40; dashed gauge ring from ≈ 6:30; no linked crossing) |

**Results:** median **35 min** across 3 tier-A crossings, and every onset fell inside the first window.

### (d) Drive to school (simulated): `drive-commute`

- **Same storm as (b).**
- **Departure:** leaves Home at **6:58:54 AM** while Jones Rd is ▲ Watch.
- **Speed:** 8.9 m/s (20 mph, heavy rain), reached after a 6 s ramp.
- **Clock:** the risk clock runs at **1×** during a drive (D §30.7).

| Drive time | Event |
|---|---|
| 0 s | ▲ Jones Rd 1.0 km ahead → soft chime → "Heads up. Water is rising upstream of Williamson Creek at Jones Road. Plan another route." → Warning haptic |
| 9 s | Driver lockout engages (≥ 4.5 m/s for 5 s; D §30.6 `stepLockout`). Applies only outside Drive Mode. |
| **66 s** (7:00 AM) | Jones Rd → Avoid **and** Manchaca & Jones → Watch at the same tick → chime → **"2 crossings ahead changed. Avoid Williamson Creek at Jones Road. Flooding likely soon. Take another route."** → Error haptic. The car is ≈ 470 m before Jones Rd. |
| ≈ 104 s | The scripted driver turns at `BRANCH` (130 m before the crossing). Nobody touches the phone. Nothing at risk is ahead → calm HUD, **silent** (no "all clear" ever). |
| ≈ 412 s | Arrives at School (the commute alone would take 270 s) |

- **ES version:** "Cambiaron 2 cruces adelante. Evite Williamson Creek en Jones Road. Inundación probable pronto. Tome otra ruta." [Verified: ran]
- **60-second gate:** the merged line at 66 s respects the ≤ 1 utterance per crossing per 60 s rule. The Watch line was at 0 s. Escalations that arrive inside the gate are **deferred, not dropped**.

---

## 4. Choreography: local notifications, voice, haptics

### 4.1 Notification plan (pure: `planNotifications(cmp)`)

**Policy** (A §3.8, adapted):
- Notify only subscribed crossings (hero: `atx-37`, the crossing on the saved Home → School route).
- Escalations to AVOID or CLOSED always notify. WATCH notifies only if `watchAlerts`, which is off by default.
- At most 1 per crossing per level per 60 min, and at most 3 per hour.
- One passive `update` when an escalated crossing reaches `no_rise`.

**Hero output:** `7:00 AM avoid atx-37`, `7:50 AM closed atx-37` [Verified: ran].

**Content** (`buildContent`, bank copy verbatim, EN/ES):

| Field | 7:00 AM AVOID (EN) |
|---|---|
| title | Avoid Williamson Creek at Jones Road |
| subtitle | **Simulated storm · demo data** (ES "Tormenta simulada · datos de demostración") |
| body | Likely flooded within 15–30 min. Use another route. Never drive into water. |
| interruptionLevel | `active` (no time-sensitive or critical on a free Personal Team) |
| data | `{ type: 'risk', demo: true, scenario, simMin: 70, crossing_id, state, window, url: 'fordcast://crossing/atx-37' }` |

- **CLOSED body:** "Simulated road crew reports it closed. Turn around, don't drown."
- **Limits:** title ≤ 50 and body ≤ 150 in both languages [Verified: test].
- **API check:** `subtitle`, `interruptionLevel`, `identifier`, and the `TIME_INTERVAL` trigger all exist in expo-notifications 57.0.23 [Verified: `Notifications.types.d.ts`].

### 4.2 Lock-screen take (`lockScreenTake`)

JS doesn't run while the phone is locked, so the OS must fire the notification.

1. **Arm (Director → take T06).**
   - Seek to 6:59 AM (`simMin` 69) and pause.
   - `scheduleNotificationAsync({ identifier: 'demo:flash-flood-night:atx-37:avoid:70', content, trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 8 } })`.
   - The stable identifier means re-arming replaces the request instead of stacking duplicates.
2. Press the side button. About 8 s later the banner lands on the Lock Screen.
3. Tap → Face ID → the response listener reads `data.simMin` → `seek(70)` → `router.push('/crossing/atx-37')`.
   - The sheet shows exactly the Avoid · 15–30 the notification announced.

**Foreground playback** (any other take):
- When `simMin` crosses a planned `t`, post with `trigger: null` (immediate).
- `setNotificationHandler` returns `{ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }` [Verified: `NotificationBehavior` type].
- `firedIds` dedupes within a take.

**Reset:** `cancelAllScheduledNotificationsAsync()` + `dismissAllNotificationsAsync()` [Verified: both exported].

### 4.3 Voice and haptics (Drive Mode; `speech-plan.ts`, then `voice/speak.ts`)

**Queue rules** (D §30.7):
- Priority 2 = to AVOID or CLOSED (pre-empts: `Speech.stop()` then speak).
- Priority 1 = to WATCH, UNKNOWN-ahead with a last known state, or the one-time offline line.
- Priority 0 = de-escalation (`update.deescalate.tts`).
- Simultaneous changes merge into `drive.tts.multi_changed` + the top line.
- Only `*.tts` and `drive.tts.*` keys are ever spoken. The spoken guard (no "–", "min", "ft") passes [Verified: test].

**Audio and speech calls:**
- `setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' })` [Verified: expo-audio 57.0.5 types].
- Chime via `createAudioPlayer` [Verified: exported]: `chime.wav` for priority 2, `chime_soft.wav` for priority 1.
- `Speech.speak(text, { language: 'en-US' | 'es-US', voice, rate: 0.95, useApplicationAudioSession: true, onDone })`.
- `Speech.stop()` to pre-empt.
- All of the above: [Verified: expo-speech 57.0.3 `Speech.d.ts`/`Speech.types.d.ts`].

**Haptics** (A §3.13; max one per 1.5 s; never `Success`):
- Watch → `notificationAsync(Warning)`.
- Avoid/Closed → `notificationAsync(Error)`.
- Unknown → `impactAsync(Soft)`.
- De-escalation → `impactAsync(Light)`.
- [Verified: expo-haptics 57.0.3]

**Recording note:** turn Silent mode **off**. Whether the app audio session obeys the Ring/Silent switch is [Unverified] (research-ios §6).

**Live speech vs the test plan:**
- The app runs the same queue **live** over the simulated `Fix` stream (identical to the GPS `LocationSource`).
- `drivePlan()` is the pure, testable version, so a take can be checked before it's recorded.

---

## 5. Demo Director (presenter-only; ships in Release)

### 5.1 Ways to open it

All three open the `demo` formSheet [0.5, 1.0]:
- 0.8 s long-press on the FreshnessPill (research-ui G2), with a `selectionAsync` haptic.
- **Triple-tap the FordCast logo** in Settings → About.
- **Long-press the version row** in About.

None of these has a visible affordance. All three still work in clean recording mode.

### 5.2 Layout (top to bottom; rows at native height, transport buttons 76 pt)

```
Demo Director                                          [Reset]
SCENARIO   ◉ Calm evening   ○ Flash flood night (30 min)   ○ Big Onion Creek storm   ○ Drive to school
TAKES      [T01 Calm] [T02 Rising] [T03 Player] [T04 Result] [T05 One clock] [T06 Lock screen]
           [T07 Sheet] [T08 Detour] [T09 Drive EN] [T10 Drive ES] [T11 Unknown]  (+ optional O1–O4)
           tapping a take = load scenario → seek to its keyframe → set speed → navigate to its screen → arm
           its notification/drive; a one-line caption shows the expected state ("atx-37 AVOID 15–30")
TRANSPORT  [|◀ beat] [−5] [ ▶ / ❚❚ ] [+5] [beat ▶|]   scrubber with ▲ ◆ ● ▮ ⌀ ticks   storm time 7:00 AM
           speed (1×)(10×)(30×)(•60×)(120×)   Auto-slow at beats [switch]
SIMULATE   Simulated offline [switch]  → network override from now (20 min later every crossing is UNKNOWN)
           Fire notification now      → the subscribed crossing's current state, trigger null
           Lock-screen take (8 s)     → §4.2
           Location  (Home ▾ | Drive) · Lockout (Auto ▾ | Off) · Voice (App ▾ | EN | ES)
RECORDING  Clean recording mode [switch] · Show touches [switch] · Haptics [switch]
STATUS     events hash (8 hex)  ·  compile 8 ms  ·  build 1.0.0 (7-day profile expires Fri)
```

### 5.3 What the buttons do

- **Reset:**
  - pause
  - seek to the scenario's `playFromMin`
  - `Speech.stop()`
  - cancel scheduled notifications and dismiss delivered ones
  - clear the demo inbox
  - clear `netOverride`
  - lockout to Auto
- **Clean recording mode:**
  - Hides the Director's toasts, take captions, the status line and any dev overlay. Release builds have no LogBox or dev menu anyway.
  - Holds the screen awake with `expo-keep-awake` (`activateKeepAwakeAsync('demo')`, 57.0.2 [Verified: npm view]).
  - Keeps the in-app time on storm time, minute-floored, never wall time.
  - The status-bar clock is cleaned by the capture path: QuickTime's 9:41 status bar, per research-ios §9.2.
- **Show touches:** the D §33.9 `DemoTouchOverlay`.
  - 44 pt translucent circles, 300 ms fade.
  - Captured with `onStartShouldSetResponderCapture` that returns `false`, so touches pass through.
  - Whether MapLibre touches reach the capture phase is [Unverified]. If they don't, use research-ios §9.5's fallback.
- **Events hash:** FNV-1a of the compiled events JSON. It's identical on every take and every device for a given build, which proves determinism at a glance [Verified: determinism test].

---

## 6. Honesty (labels cost nothing and protect the student at Q&A)

| Layer | Where | Text (EN / ES) |
|---|---|---|
| Baseline | FreshnessPill chip | `demo.chip` **DEMO** (neutral dashed slate chip, research-ui G1) |
| Scenario running | Pill + 2 pt violet map frame + accessory | `demo.pill_running` "SIMULATED · {{time}} storm time" / "SIMULADO · {{time}} hora de la tormenta" (violet #B69CFF, ink #0E1726) |
| Player / results | Banner on every frame | `demo.banner` "SIMULATED STORM · demo data · not live" / "TORMENTA SIMULADA · datos de demostración · no es en vivo" |
| Drive | HUD | `replay.simulated_drive` "SIMULATED DRIVE" / "MANEJO SIMULADO" + the violet banner |
| Notifications | subtitle | `demo.notify.subtitle` "Simulated storm · demo data" |
| Official closure | source label | `demo.source.road_crew` "Simulated road crew" (never "City of Austin" or "ATXfloods") |
| Result | count-up + honesty line | `demo.result` "In this simulated storm, FordCast warned {{x}} min before water reached the road"<br>+ `demo.result_honesty` "Simulated gauge data; the forecasting code is real and ran on this phone. Median warning across the {{n}} crossings that flooded in this storm: {{m}} min."<br>+ `demo.closure_gap`<br>+ `demo.window_check_hit` / `_miss` |
| About → What's real | `settings/whats-real` (research-ui G6) | **Real:** crossing names and locations (City of Austin open data); USGS gauge names and IDs; the forecast logic running on this phone; map; local notifications; voice; Drive Mode.<br>**Simulated:** every gauge reading, storm, closure, drive and alert.<br>**Planned:** live USGS ingest, real-storm backtests, push alerts. |

- **Copy guards:** every `demo.*` string passes the A §3.12 guards in EN and ES (banned words, countdown, spoken) [Verified: test]. The Spanish needs native review (A §3.7).
- **Video wording to use:**
  - Opening title card: "Demonstration uses simulated gauge data. The forecasting logic runs on the phone."
  - Narrate the result as "**in this simulated storm**".
  - End card: "All storms in this video are simulated. Crossing locations: City of Austin open data (ATXfloods). Gauge sites: USGS. Map data © OpenStreetMap contributors · OpenFreeMap © OpenMapTiles."
- **Never say:**
  - "FordCast predicted the 2013 flood"
  - "30 minutes earlier" without "simulated"
  - "accuracy", "POD" or "CSI" for demo numbers
  - "safe" or "clear"
- **Q&A lines for the student:**
  - "The water is fake; the code is real. The same rule would read live USGS gauges. That's the next step."
  - "The 30 minutes is from a simulated storm. I picked the example with a fixed rule, the one closest to the median, not the best one."

---

## 7. Video take plan (~2:20; record each take separately, cut in the edit)

Every take is a `TAKES` entry. Keyframes are resolved from engine events, so the times below are computed [Verified: ran; `takes.test` asserts the "on screen" column].

| # | Video time | Narration (suggested) | Take · scenario @ storm time | Screen · gesture | Must be on screen |
|---|---|---|---|---|---|
| 1 | 0:00–0:12 | Problem: Flash Flood Alley; water reaches low-water crossings before barricades (use only the A §2.2 verified figures) | B-roll + app icon | — | — |
| 2 | 0:12–0:22 | "FordCast watches the creek gauges upstream of each low-water crossing." | **T01** calm-evening @ 8:00 PM | Map Home · no touch, then one slow pinch-out | DEMO chip; 17 monitored crossings ○ No rise detected; tier C ◌ not monitored; "Watching 12 upstream gauges for 17 crossings" |
| 3 | 0:22–0:35 | "When rain hits upstream, the gauge rises first, and FordCast knows how long the water takes to get to each road." | **T02** flash-flood-night @ 6:48 AM (Watch + 3) | tap Jones Rd marker → drag sheet to half | ▲ Watch "water rising upstream"; hydrograph climbing toward the 6.0 ft trigger line; LagPair label "Water usually takes 30–45 min to get here" |
| 4 | 0:35–1:05 | "Here's a simulated storm. Watch the wave travel down Williamson Creek…" | **T03** flash-flood-night from 6:35 AM at 60× (auto-slow on) | storm player · tap ▶ once | 6:45 ▲; 7:00 ◆ "likely flooded within 15–30 min"; cyan pulse reaches Jones Rd; 7:30 ● water on road. Cut 6:35–6:45 and 7:05–7:25 in the edit. |
| 5 | 1:05–1:15 | "In this simulated storm, FordCast said Avoid 30 minutes before water reached the road, and 50 minutes before the road crew closed it." | **T04** @ 7:55 AM | results formSheet (auto-presents) | "…warned 30 min…" count-up; honesty line n = 3, m = 30; closure gap 50; window check "inside" |
| 6 | 1:15–1:22 | "It's not just a replay. The same clock drives the whole app." | **T05** @ 7:02 AM | tap ✕ on the player | Map Home: violet frame + accessory; Jones Rd ◆ 15–30; Westgate ▲, Manchaca & Jones ▲, Jimmy Clay ▲; Oak Hill crossings ◌ not monitored |
| 7 | 1:22–1:32 | "If Jones Road is on your way to school, your phone warns you, even when it's locked." | **T06 → T07** arm @ 6:59 → 7:00 AM | Director "Lock-screen take" → lock → 8 s → tap → Face ID → drag to half | Banner: "Avoid Williamson Creek at Jones Road" / "Simulated storm · demo data" / "Likely flooded within 15–30 min…"; then sheet ◆ Avoid 15–30 + reasons |
| 8 | 1:32–1:47 | "One tap finds a way around it." | **T08** @ 7:01 AM | [Detour +N min] → `drive/result` → [Start Drive Mode] | Route verdict Avoid (Jones Rd) + Watch (Manchaca & Jones); "Detour adds N min" (baked ORS duration) |
| 9 | 1:47–2:02 | "While you drive, FordCast speaks, so your eyes stay on the road." | **T09** drive-commute, drive 56 s → 80 s (EN) | Drive Mode · no touch (mounted) | at 66 s: chime → "2 crossings ahead changed. Avoid Williamson Creek at Jones Road. Flooding likely soon. Take another route." + red edge glow + haptic; SIMULATED DRIVE label |
| 10 | 2:02–2:07 | (Spanish audio, subtitled) | **T10** same, 60 s → 76 s (ES) | — | "Cambiaron 2 cruces adelante. Evite Williamson Creek en Jones Road…" |
| 11 | 2:07–2:13 | "If a gauge goes silent, FordCast says Unknown. Never 'safe'." | **T11** onion-creek-storm @ 5:50 AM | player, Bluff Springs selected | ◌ Unknown, "Last known: Avoid · 50 min ago"; hatched "No data" band; storyboard line "Onion Ck at Twin Creeks Rd went silent…" |
| 12 | 2:13–2:20 | "The storms here are simulated; the forecasting code is real and runs on this phone. Turn around, don't drown." | whats-real flash + end card | — | Real / Simulated / Planned rows; attributions |

**Optional B-roll takes:**
- **O1** Closed · OFFICIAL (Simulated road crew) @ 7:50 AM.
- **O2** "Water over road" sensor closure at Manchaca & Jones @ 8:15 AM.
- **O3** Driver lockout: at drive 9 s, tap Search → lockout dialog → hold "I'm a passenger".
- **O4** Onion Creek result (35 min) @ 5:09 AM.

**Take discipline** (research-ios §9.7):
- Record in the Release build.
- Focus off, or a Focus that allows FordCast.
- Silent mode off, volume about 60%.
- Pan the demo area once beforehand so the map tiles are cached. The "Simulated offline" switch doesn't block the real tile network.
- For the lock-screen take, the Lock Screen's big clock shows the real time, not storm time. Frame the shot on the notification.

---

## 8. Verification and how to run the prototype

```
cd /tmp/claude-0/-home-user-Fordcast-CAC/608fe985-2ad7-54f1-8865-eca0e6597f76/scratchpad/demo/proto
bun test                         # 21 tests: engine, display (A §3.4), takes, clock, notifications, copy guards, drive, budget
bun run.ts flash-flood-night     # per-crossing event log;  bun run4.ts → every take resolved with on-screen states
bun run3.ts                      # drive plan (utterances, lockout, HUD frames);  bun bench.ts → timings
npx -y -p typescript@5.9.3 tsc -p tsconfig.json   # strict + noUncheckedIndexedAccess → 0 errors
```

| Check | Result [Verified: ran] |
|---|---|
| Allowed windows only {0–15, 15–30, 30–60, 60–90, 0–30, 15–60, 30–90} | pass (all scenarios) |
| De-escalation one level at a time; never Watch-or-worse → No rise directly | pass |
| Every non-No-rise state has ≥ 1 reason | pass |
| Deterministic (compile twice → identical JSON) | pass |
| Engine never imports the simulator (truth isolation) | pass |
| Offline 12 min → aging, same state; 25 min → UNKNOWN + "last known Avoid"; calm + offline → UNKNOWN with no badge | pass |
| Every take's promised on-screen states | pass (15 takes) |
| Hero: Watch 6:45, Avoid 7:00 [15–30], Closed 7:50, onset 7:30, lead 30 = median, inside first window | pass |
| Storm: Unknown 5:50 with last known Avoid; hero tc-68 35 = median | pass |
| Notification copy ≤ 50/150 chars, subtitle present, EN/ES | pass |
| A §3.12 banned/countdown/spoken guards on all demo copy | pass |
| Drive: [0 s Watch], [66 s merged Avoid]; detour silent; lockout ≤ 10 s | pass |
| Compile time (bun / JIT-less node) | 4–13 ms / 6–30 ms per scenario; `drivePlan` 34 / 180 ms (the app uses Turf `nearestPointOnLine` instead of 2 m sampling) |
| C §18.3 travel-time learner on 6 synthetic storms (true 34–46 min) | recovered within ±0.4 min (r ≥ 0.988) → τ 40.7 min (P25 38.3, P75 43.5) |

**Porting to the app:**
- Move the files per §2.1.
- Swap `bun:test` for jest-expo (same `expect`/`test` API).
- Replace `drive.ts`'s haversine helpers with `@turf/along`, `@turf/nearest-point-on-line` and `@turf/length` 7.4.0 [Verified: npm view].
- Keep `takes.ts` and `demo-test` in CI.

---

## 9. Open items and [Unverified] list

1. **Gauge coordinates** for 08158922, 08158970, 08159000, 08158840 and 08154700 [Unverified]. Five-minute check on the Mac (§1.2).
2. **Links are authored.** The NLDI upstream check (§1.3) would verify them. Until then, `whats-real` says "upstream links: demo values".
3. **Routes and creeks are drafts** until baked (§1.4–1.5). Re-run the `crossingsOnRoute` test after baking.
4. **Reconciled with the sibling docs:**
   - research-ui's "Storm tonight" is this doc's **Flash flood night**. Pick one title string; the scenario id stays `flash-flood-night`.
   - research-ui's "SIMULATED · " title prefix would push three crossing titles over 50 characters. This doc puts "Simulated storm · demo data" in the **subtitle** instead (research-ios §0 item 3). The inbox rows keep research-ui's violet chip.
   - Director entry points: this doc adds triple-tap logo and long-press version to research-ui's long-press FreshnessPill.
5. **Two device questions** [Unverified]:
   - Whether `useApplicationAudioSession: true` speaks with Silent mode on.
   - Whether MapLibre touches reach the touch-overlay capture phase.

   Both are research-ios Day-1 checks.
6. **New copy keys** (`demo.*`, `reason.UPSTREAM_ABOVE_TRIGGER_peaked`) need to go into `en.json`/`es.json` and Spanish native review.

## Sources

- City of Austin ATXfloods legacy crossings (MIT): https://github.com/cityofaustin/ctxfloods-backend (`populateDB/data/legacyCrossings.csv`, read via raw.githubusercontent.com).
- USGS site records via search: 08158930, 08158827, 08157000, 08158200, 08155200, 08158800, 08158700, 08155400 (nwis.waterdata.usgs.gov / waterdata.usgs.gov / reference.geoconnex.us / waterqualitydata.us / americanwhitewater.org).
- Package sources via `npm pack`: expo-notifications 57.0.23, expo-speech 57.0.3, expo-haptics 57.0.3, expo-audio 57.0.5. Versions via `npm view`: zustand 5.0.15, expo-keep-awake 57.0.2, @turf/* 7.4.0.
- Master prompt: A §3–§4; C §17.13, §18, §19; D §30–§33; research/hydro.md §2, §8, §9; research/maps.md (ORS); sibling docs research-ui.md and research-ios.md.
