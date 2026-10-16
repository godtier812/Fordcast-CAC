# 05 · Demo engine: dataset, scenarios, on-device forecast, Director, alerts, voice, replay, a11y, tests (§21–§28)

> **FordCast Demo Edition.** Everything that *moves* in the app comes from this file: gauge readings, crossing states, notifications, voice lines, the simulated drive and the storm player.
>
> - **Simulated:** the water. A deterministic simulator makes USGS-style gauge readings.
> - **Real:** the logic. The FordCast forecast pipeline runs **on the phone, in TypeScript**, over those readings, one 5-minute tick at a time:
>   - upstream gauge, learned travel time and trigger stage
>   - risk window
>   - staleness → UNKNOWN
>   - official-closure precedence
>   - the anti-flapping state machine
>
> That is what lets the video honestly say *"the water is simulated; the forecasting code is real and runs on this phone."*

**Source of truth.** Code here comes in two forms:
- **Full listings:** fenced files that start with their path comment. These are **byte-identical copies** of the checked files in `05-code/`. Three §23.6 listings are app-side forms that `05-code/` doesn't hold: the `engine.ts` barrel, the `baseline-rule.ts` skeleton and the GOLDEN `source.ts`. They were type-checked and run in a separate golden-mode copy of the tree.
- **API blocks:** summaries of files that live only in `05-code/`.

All of it was checked on 2026-10-16:
- **Type-checked:** TypeScript **6.0.3** (the SDK 57 template's version), `strict` + `noUncheckedIndexedAccess`, against the real package types: expo 57.0.30, expo-notifications 57.0.23, expo-audio 57.0.5, expo-speech 57.0.3, expo-haptics 57.0.3, expo-keep-awake 57.0.2, zustand 5.0.15, react-native 0.86.3, react-native-reanimated 4.5.1.
- **Tested:** **35 tests pass** under **jest-expo 57.0.6** (Jest 29.7.0, `@react-native/jest-preset` 0.86.3, babel-preset-expo 57.0.16) once `tools/gen-golden.ts` has written the fixtures (§23.6); tests type-check too (`types: ["jest","node"]`). The §23.6 golden mode was also run: with the ★ files as `TODO(student)` skeletons, every UI-facing suite stays green and only the ★-dependent tests are red.
- **Where the files are:** the full **reference tree** (35 files) is in **`05-code/`** next to this file, i.e. `docs/demo-prompt/05-code/` (it MUST be committed with the prompt): `05-code/mobile/src/**` mirrors the app, `05-code/tools/gen-golden.ts` mirrors the repo's `tools/`. Its engine produces **exactly the same events** as `research/proto/` [Verified: ran; events JSON identical for all four scenarios; eventsHash calm-evening `741638a5` · flash-flood-night `471e80be` · onion-creek-storm `6ef288b0` · drive-commute `471e80be`].
- **Copy, don't retype, except the ★ code (§1.8, binding).** 🤖 MUST copy `05-code/mobile/src/demo/**`, the five `05-code/mobile/src/__tests__/demo-*-test.ts`, `05-code/mobile/src/locales/{en,es}.json` (starter keys) and `05-code/tools/gen-golden.ts` into the repo, **except three pieces it MUST NOT copy, paraphrase or paste in chat**: `evaluate()` and `step()` (with `enter`/`stepCore`/`maxState`) in `engine/engine.ts`, and the bodies of `engine/travel-time.ts`. Those are the student's ★ files. §23.6 says exactly how `engine.ts` is split, what the skeletons contain, and how the UI runs on golden fixtures until the ★ files pass. For the student, opening the reference functions counts as hint level 3 (§1.8).
- **If `05-code/` is missing:** STOP and ask the student to restore it from the repo. Rebuilding the API-block files from their summaries is the last resort, and then the §28 tests are the spec.
- **Cross-references:** a bare "§N" is this Demo Edition. "A §3.4", "C §18.5", "D §30.5" etc. point into the full prompt per the legend at the top of `01-scope-rules-plan.md`; "D §25–§29" = `docs/master-prompt/05-D1-mobile-stack-architecture-map.md`, "D §30–§37" = `docs/master-prompt/06-D2-mobile-features-quality.md`, "C" = `docs/master-prompt/04-C-data-science-backend.md`, "A" = `docs/master-prompt/01-A-rules-product-plan.md`.

**Evidence tags:**
- `[Verified: …]`: read in package source or produced by running the code.
- `[Unverified]`: check on the device.
- `VERIFY BEFORE USE:`: required check.

**Priority tags:**
- **[MUST-SHOW]**: on camera in the video.
- **[SHOULD-SHOW]**: built and polished, shown if time allows.
- **[NEXT]**: not built; appears only as "Planned" (§31).

### Architecture in one picture

```
 scenarios.ts (TS data, seeded) ─► sim.ts: hydrographs → 15-min readings (+10-min delivery delay, outages)
                                                   │  readings[gauge] = { obsMin, availMin, ft }
 demo-data.ts (gauges, crossings, links) ──────────┤
                                                   ▼
            compile.ts — for t = −60 … duration step 5:
              series = readings with availMin ≤ t (no lookahead) → evaluate() ★ → crossingIsStale()
              → resolveRawState() (official > sensor > tier C > stale > rule) → step() (hysteresis) → events[]
            results (hidden truth used ONLY here): onsets → leads → hero (closest to median) → closure gap
                                                   │  Compiled (pure, memoized, 4–30 ms) — served by source.ts compiledFor()
                                                   │  (golden fixtures until the Day 6 gate, then this live pipeline; §23.6)
 clock.ts (ONE simMin = f(anchor, wall time)) ─────┤
                                                   ▼
 display.ts displayAt(t, network) ─► Map Home · crossing sheet · nearby list · AlertBanner · Storms player · results
 choreography.ts ─► local notifications (content.ts → adapter.ts) · storyboard · beats/auto-slow · takes
 drive.ts ─► scripted Fix stream · lockout · speech plan ─► speak.ts (chime → TTS → haptic)
```

### Engine rules (🤖 MUST, all sections)

1. **Purity.**
   - `demo/engine/**`, `demo/sim/**`, `demo/scenario/{compile,source,golden,display,clock,choreography,player,takes,scenarios,schema}.ts`, `demo/drive/drive.ts`, `demo/notify/content.ts` and `demo/i18n/*` are **pure**: no React, no native modules, no `Date.now()`. They take wall time as a parameter.
   - Side effects live only in `store/`, `notify/adapter.ts`, `voice/*`, `drive/sim-drive.ts` and `director/*`.
2. **Truth isolation.** Only `compile.ts`'s results block calls `truthOnset`. `engine/` never imports `sim/`. A test enforces this (§28).
3. **No hand-typed numbers on screen.** Every time, window, lead, median and count shown in the UI comes from `Compiled` or `displayAt()`. "30 min", "7:00 AM" and "50 min" are outputs, never literals. A grep test in §28 enforces this.
4. **Copy only from locale keys.** No status wording in code (A-bank rules, §3 of 01). Ranges, never countdowns: never "15 min", only "15–30 min". Never a single-number travel time.
5. **Honesty labels are part of the engine contract** (§31):
   - Every notification subtitle is "Simulated storm · demo data".
   - Official closures are sourced "Simulated road crew".
   - Every storm surface shows the violet SIMULATED label.
6. **Determinism.** The same build + the same scenario gives the same events JSON and the same `eventsHash()` on every device and every take.

---

## §21. Demo dataset

### 21.1 What is real, what is simulated, what is authored

| Layer | Status | Source / rule |
|---|---|---|
| Crossing **names, addresses, coordinates** (25) | **Real**, copied **verbatim** | City of Austin open-source ATXfloods backend, `cityofaustin/ctxfloods-backend` → `populateDB/data/legacyCrossings.csv` (MIT). Names are **never translated or invented**. [Verified: CSV read 2026-10-16] |
| Gauge **site IDs and names** (14) | **Real** USGS sites | USGS site records. Coordinates are partly [Unverified] (§21.3). |
| Gauge **readings**, storms, closures, drives, alerts | **Simulated** | `sim.ts` + `scenarios.ts`. Labeled SIMULATED everywhere. |
| Gauge → crossing **links** (τ travel time, trigger and watch stage) | **Authored demo values**, physically plausible | Celerity = channel km / τ ∈ [1.6, 3.1] m/s for every tier-A link, inside C §18.3's [0.5, 6] m/s bound. [Verified: ran] Settings → What's real says "upstream links: demo values". |
| Official closure source | **Simulated** | Always `demo.source.road_crew` "Simulated road crew". Never "City of Austin", "ATXfloods" or any agency. |
| Home / School pins | **Generic** | "Home"/"Casa" and "School"/"Escuela" in 78745. **Never the student's real home or school.** |

**Reconciliation decisions (binding; they supersede the research notes):**

1. **Real USGS gauge names are kept.** Only the readings are simulated. The gauge card shows "USGS site 08158922 · readings simulated" and has **no** "View on USGS" link, because a real page would contradict the simulated numbers.
2. **The hero lead is 30 min** (computed by the engine), not the 38 min in early UI sketches.
3. **The official-closure source label is "Simulated road crew".** It replaces "Simulated official closure (demo)".
4. **Notification titles carry no "SIMULATED ·" prefix.** The label goes in the **subtitle**, which keeps titles ≤ 50 characters.

### 21.2 Crossings that matter on camera (25 total: 12 tier A · 5 tier B · 8 tier C)

| id | Name (verbatim) | Tier | Upstream gauge(s) | Role |
|---|---|---|---|---|
| `atx-37` | Williamson Creek at Jones Road | A | 08158922 | **Hero.** On the Home → School commute. |
| `atx-680` | Westgate Blvd @ Williamson Creek | A | 08158922 | Upstream neighbor; Avoid at 7:15 AM. |
| `atx-692` | Manchaca Rd & Jones Rd | A | 08158922; at-road sensor 08158930 | 2nd crossing on the commute; **sensor CLOSED** beat. |
| `atx-32` | Jimmy Clay Golf Course | A | 08158930 (P), 08158922 | Far downstream; long 60–90 window. |
| `tc-85`, `tc-87` | Williamson Creek Dr @ / Mowinkle Dr @ Williamson Creek | C | — | Honest gap: upstream of every gauge, "not monitored". |
| `hays-663` | W RR 150 @ Onion Creek (Double Crossings) | B | 08158700 (≈ 60 m away) | Tier B: almost no lead time (honest example). |
| `bud-1117` | Garrison Rd @ Onion Creek | A | 08158800 (P), 08158700 | 85-min lead from 23 km upstream. |
| `tc-68` | Old San Antonio Rd @ Onion Creek | A | 08158800 (P), 08158827 | **Storm-tab hero** (35 min). |
| `tc-1626` | Bluff Springs Rd @ Onion Creek | A | 08158827 only | **Gauge-silent UNKNOWN** beat. |
| `atx-120`, `atx-31` | Slaughter Creek Trail · Circle C Park | B · A | 08158840 | Watch at 7:15 AM (secondary storm cell). |
| 13 others | Central, Bull, Walnut, Barton creeks | A/B/C | see listing | Calm in every scenario. |

- **Map Home summary** (`state.no_rise.area_sub`): "Watching **12** upstream gauges for **17** crossings". 17 = tier A + B; 12 = distinct linked gauges. [Verified: ran] The UI MUST compute both numbers from `LINKS` and `CROSSINGS`.
- **Long names:** three names exceed the 50-character push-title limit (`atx-38`, `hays-663`, `tc-94`). None is subscribed in any scenario (test-enforced). If a future scenario subscribes one, the title builder MUST drop the trailing parenthetical first and **never truncate the state word**.
- **ID scheme:** `atx-<legacyId>` = City of Austin (community 9009); `tc-` = Travis County (9010); `hays-`/`bud-` = Hays County / City of Buda (9016). Each record keeps `source { dataset, communityId, legacyId, address }`. About → credits cites the dataset.

### 21.3 Gauges (14 real USGS sites; readings simulated)

**Simulated gauge parameters:**
- One reading every **15 min**, rounded to 0.01 ft.
- **10-min** delivery delay (`availMin = obsMin + 10`).
- **Stale after 45 min.** This follows C §18.9's replay rule (≥ delay + 20) and keeps silent-gauge beats short.

**Coordinate status:**
- [Verified: USGS/geoconnex records]: 08158930, 08158700, 08158800, 08158827, 08156800, 08157000, 08158200, 08155200, 08155400.
- [Unverified]: **08158922, 08158970, 08159000, 08158840, 08154700**.
- **Day-2 check (🧑, Fri Oct 16, 5 min, on the Mac; 00 task table):** open `https://waterdata.usgs.gov/monitoring-location/<site>/` for each [Unverified] site and correct `lat/lon` in `demo-data.ts` if they're off by more than 200 m. The sandbox that wrote this file could not reach USGS.

### 21.4 Links (authored, plausible)

- `watchFt = baselineFt + 0.6 × (triggerFt − baselineFt)`, rounded to 0.1 ft (C §18.4).
- **Tier-B links** use C §17.13's transfer shape: P25 = 0.6τ, P75 = 1.4τ, `nStorms = 0`.
  - The UI shows the "Estimated" badge.
  - Tier B **never** counts toward leads or the median (test-enforced).
- **Travel time is shown only as a range**, via `tauRange()` (A §3.5 rule 8): `15·floor(P25/15)` to `15·ceil(P75/15)`, width ≥ 15, low end ≥ 5.

| Crossing ← gauge | τ med (P25/P75) min | Shown as | Trigger / watch ft | Channel km |
|---|---|---|---|---|
| atx-37 ← 08158922 | 40 (33/44) | **30–45 min** | 6.0 / 4.4 | 5.3 |
| atx-680 ← 08158922 | 34 (29/39) | 15–45 | 8.5 / 5.9 | 4.6 |
| atx-692 ← 08158922 | 45 (38/52) | 30–60 | 7.5 / 5.3 | 6.0 |
| atx-32 ← 08158930 (P) · 08158922 | 70 · 110 | 60–90 · 90–135 | 7.0 · 9.0 | 9.0 · 14.3 |
| tc-68 ← 08158800 (P) · 08158827 | 45 · 10 | 30–60 · 5–15 | 9.0 · 10.0 | 8.3 · 1.4 |
| tc-1626 ← 08158827 | 40 (33/44) | 30–45 | 10.0 / 7.3 | 7.4 |
| bud-1117 ← 08158800 (P) · 08158700 | 15 · 135 | 5–30 · 120–150 | 9.0 | 1.4 · 23 |

### 21.5 Places, routes and creek lines (static files; no routing or NLDI call at runtime)

`drive.ts` ships **draft** polylines that already pass the tests:
- **Commute:** Home → atx-37 (1,028 m along) → atx-692 (1,622 m along) → School. Length 2,367 m.
- **Detour:** shares the commute to `BRANCH` (898 m along, 130 m before Jones Rd), then crosses the creek elsewhere. Length 3,629 m. No crossing is within 40 m of it.

[Verified: ran] Draft lines are straight segments, and the basemap would give that away. Replace them before recording:

1. **🤖 + 🧑 Bake real road geometry** (one time, on the Mac, free OpenRouteService key). Write `tools/bake-demo-routes.mjs` (repo root, §5; never imported by the app):
   - It calls `POST https://api.openrouteservice.org/v2/directions/driving-car/geojson` (shape: master research/maps.md ORS section).
   - **Commute:** body `{ coordinates: [Home, atx-37, atx-692, School] }`.
   - **Detour:** body `{ coordinates: [BRANCH, School], options: { avoid_polygons: <MultiPolygon of 150 m circles around atx-37 and atx-692> } }`. Prepend the commute prefix Home→BRANCH so the simulated car turns without jumping.
   - Output `mobile/src/demo/data/routes.json`: `{ commute: { line, durationS }, detour: { line, durationS } }`.
   - "Detour adds {{n}} min" = `round((detour.durationS − commute.durationS)/60)`. Never hand-typed.
   - The key goes in `.env.local` at the repo root (git-ignored by `.env*`, §5), **only for the bake script**. The app never calls ORS.
2. **Creek lines for the water pulse** (`tools/bake-creeks.mjs` → `mobile/src/demo/data/creeks.json`, one entry per link `{ reach_id: "<crossing>__<gauge>", coords }`):
   - Fetch `https://api.water.usgs.gov/nldi/linked-data/nwissite/USGS-<site>/navigation/DM/flowlines?distance=25`.
   - Clip from the gauge to the point on the line nearest the crossing.
   - Simplify to ≤ 40 vertices (`@turf/simplify@7.4.0`, exact pin like the other Turf packages, tolerance ≈ 0.0001°; tools-only devDependency [Verified: npm registry]).
   - **Fallback** if NLDI is down: trace the creek over the map in geojson.io (≈ 2 min per reach). Only the Williamson reaches (atx-37/680/692) and Onion reaches (tc-68/tc-1626) are on camera.
   - Credit "USGS NHDPlus" in About.
3. After baking, `drive.ts` reads `routes.json` instead of the draft arrays (keep the same `ROUTES` export shape). **Re-run the tests:** `crossingsOnRoute(commute)` MUST equal `[atx-37, atx-692]` and `crossingsOnRoute(detour)` MUST be empty (40 m tolerance). If the baked detour passes within 40 m of a crossing, move `BRANCH` or the avoid circles.
4. **Optional Day-0:** run NLDI `navigation/UT/nwissite` from each tier-A crossing to confirm the linked gauge is really upstream. Then set `upstreamVerified: true` in a comment on that link. It stays [Unverified] until run.

### 21.6 `mobile/src/demo/data/demo-data.ts` (API block)

**Full file: `05-code/mobile/src/demo/data/demo-data.ts`** (10.8 KB; copy it as is). API and invariants:

```ts
import type { Crossing, Gauge, Link } from '../engine/types';
export const GAUGES: Gauge[];       // 14 real USGS sites: id 'USGS-<site>', verbatim USGS name, short display name, lat/lon,
                                    // baseFt (calm stage), dtMin 15, delayMin 10, staleAfterMin 45, nws null
export const CROSSINGS: Crossing[]; // 25 ATXfloods legacy records: id, name + address VERBATIM, lat/lon, tier A|B|C,
                                    // creek (only when named in the record) + creekVerified, spoken {en, es} for TTS,
                                    // targetGaugeId/overtopStageFt for at-road sensors (atx-692 ← 08158930 ≥ 9.0 ft;
                                    // atx-32 ← 08158970 ≥ 14.0 ft; atx-120 ← 08158840 ≥ 6.0 ft), source {dataset, communityId, legacyId}
export const LINKS: Link[];         // 20 authored upstream links (table §21.4): lagMin/P25/P75, nStorms (0 = tier-B transfer),
                                    // triggerFt, baselineFt, watchFt = round1(base + 0.6·(trigger − base)), minRiseFt30m 0.1, channelKm
```

Example records (verbatim from the file):

```ts
X('atx-37', 'Williamson Creek at Jones Road', '2400 Jones Rd, Austin TX 78745', 30.223421, -97.799438, 'A', 'Williamson Creek', true, 9009, 37,
  sp('Williamson Creek at Jones Road', 'Williamson Creek en Jones Road')),
X('tc-1626', 'Bluff Springs Rd @ Onion Creek', 'Travis County, TX', 30.159344, -97.769737, 'A', 'Onion Creek', true, 9010, 1626,
  sp('Bluff Springs Road at Onion Creek', 'Bluff Springs Road en Onion Creek')),
L('atx-37', '08158922', true, 40, 33, 44, 6, 6.0, 2.1, 5.3),      // HERO: τ range 30–45, trigger 6.0, watch 4.4
L('tc-1626', '08158827', true, 40, 33, 44, 5, 10.0, 3.2, 7.4),    // ONLY link → the gauge-silent UNKNOWN moment
```

**Done when (§21):**
- `demo-data.ts` and `routes.json`/`creeks.json` are in the app.
- The [Unverified] gauge coordinates have been checked on the Mac.
- The route tests pass on the **baked** routes.
- The Map Home summary computes "12 gauges / 17 crossings" from the data.
- No crossing name differs from the CSV (spot-check atx-37, hays-663, tc-1626).

---

## §22. Scenario engine & timeline format

### 22.1 File layout (`mobile/src/demo/`; every path exists in `05-code/` except the §23.6 engine split, which is one `engine.ts` there, and `__fixtures__/`, which gen-golden writes)

```
mobile/src/demo/
├─ engine/      types.ts · features.ts · windows.ts · explain.ts · combine.ts          PURE; never imports sim/ (truth isolation)
│               baseline-rule.ts ★ · state-machine.ts ★ · travel-time.ts ★ · engine.ts (barrel re-export; split in §23.6)
├─ sim/         sim.ts                                         PRNG · hydrograph · readings · hidden truth
├─ data/        demo-data.ts · routes.json · creeks.json        (§21)
├─ scenario/    schema.ts · scenarios.ts · compile.ts · source.ts (golden → live, §23.6) · golden.ts · display.ts · clock.ts ·
│               choreography.ts · player.ts · takes.ts
├─ __fixtures__/ <scenario>.compiled.json · golden-hashes.json   written by tools/gen-golden.ts (§23.6); app code stops importing
│                                                                them at the Day 6 gate (test-enforced)
├─ i18n/        tr.ts (pure translator over src/locales/*.json) · reasons.ts ("Why this alert" lines)
├─ notify/      content.ts (pure builders) · adapter.ts (expo-notifications; the ONLY caller)
├─ drive/       drive.ts (geometry, routes, Fix stream, lockout, speech plan) · sim-drive.ts (real-time runner hook)
├─ voice/       speak.ts (expo-audio chime + expo-speech) · haptics.ts (expo-haptics, two gates)
├─ store/       demo-store.ts (zustand: the ONE clock + Director state) · hooks.ts (useSimMinute/useTick/useCrossingRisk…)
└─ director/    actions.ts (Reset, takes, clean mode) · TouchOverlay.tsx      ── screens live in src/app (§18)
mobile/src/__tests__/  demo-engine-test.ts · demo-display-test.ts · demo-scenarios-test.ts · demo-player-test.ts · demo-golden-test.ts
                       + the ★ unit tests the agent writes at each pause point (§1.8)
mobile/src/locales/    en.json · es.json  (05-code ships the keys the engine needs; 01 §3's bank adds the rest)
tools/gen-golden.ts    (repo root; §23.6)
```

★ = **student-owned core** (§1.8). §23.1 has the explain-back questions.

**Names vs 01 §5.** 01 §5 sketches a finer split (e.g. `sim/{rng,hydrograph,…}`, `data/{gauges,crossings,links,…}`, `drive/{geo,routes,lockout,…}`, `notify/lockscreen`, `director/DirectorSheet`, tests under `src/demo/__tests__/`). The file names in this tree are the **tested** ones and are canonical for the port. A finer split is optional, never required, and must keep every test green. Tests stay in `mobile/src/__tests__/`, because the truth-isolation and golden tests resolve `../demo/…` from there.

### 22.2 Domain types — `engine/types.ts`

All engine time is **minutes since scenario start** (`simMin`, can be negative during warm-up). Display adds `clockStart`.

```ts
// mobile/src/demo/engine/types.ts — shared domain types (mirror of C §18–§19 / A §3.2). PURE: no imports.
// Time unit everywhere in the demo engine: MINUTES since scenario start (number). Display adds scenario.clockStart.
export type Wire = 'no_rise' | 'watch' | 'avoid' | 'closed' | 'unknown';
export const RANK: Record<Wire, number> = { no_rise: 0, unknown: 1, watch: 2, avoid: 3, closed: 4 };
export type Window = [number, number];
export type Tier = 'A' | 'B' | 'C';

export type Gauge = {
  id: string;            // 'USGS-08158922' (real USGS site id)
  name: string;          // USGS station name, verbatim
  short: string;         // display name (B §: gauge chip)
  lon: number; lat: number;
  dtMin: number;         // reading interval (15 = USGS-like)
  delayMin: number;      // simulated delivery delay (obs → available)
  staleAfterMin: number; // §18.9 threshold (clamped 30..120, ≥ delay + 20)
  baseFt: number;        // calm stage
  nws?: { action: number; minor: number; moderate: number; major: number } | null;
};

export type Link = {
  crossingId: string; gaugeId: string; relation: 'upstream'; isPrimary: boolean;
  lagMin: number; lagP25Min: number; lagP75Min: number; nStorms: number;  // "learned" τ (authored in demo)
  triggerFt: number; watchFt: number; baselineFt: number; minRiseFt30m: number;
  channelKm: number;
};

export type Crossing = {
  id: string;
  name: string;                       // VERBATIM from the source dataset, both languages (never translated, never invented)
  address: string;                    // dataset humanAddress → peek subtitle
  spoken?: { en: string; es: string }; // TTS/VoiceOver form when the name has symbols/abbreviations (A §3.10 rule 2)
  lon: number; lat: number; tier: Tier;
  creek: string | null; creekVerified: boolean;   // verified = the creek is named in the dataset record itself
  targetGaugeId?: string | null; overtopStageFt?: number | null;   // water-at-road sensor (rare in demo)
  source: { dataset: 'ctxfloods-legacyCrossings'; communityId: number; legacyId: number; address: string };
};

export type Reading = { gaugeId: string; obsMin: number; availMin: number; ft: number };

export type Reason =
  | { code: 'UPSTREAM_ABOVE_TRIGGER'; gauge_id: string; value_ft: number; rise_ft_30m: number; tau_min: number;
      tau_lo_min: number; tau_hi_min: number; trigger_ft: number; obs_at: number }
  | { code: 'UPSTREAM_RISING'; gauge_id: string; rise_ft_30m: number; value_ft: number; watch_ft: number; obs_at: number }
  | { code: 'WATER_AT_ROAD'; gauge_id: string; value_ft: number; overtop_ft: number; obs_at: number }
  | { code: 'OFFICIAL_CLOSED' | 'OFFICIAL_CAUTION'; source: string; as_of: number }
  | { code: 'DATA_STALE'; gauge_id?: string; source?: string; last_obs_at: number | null }
  | { code: 'NO_UPSTREAM_GAUGE' }
  | { code: 'HOLDING'; since: number; held_state: Wire }
  | { code: 'CLOSURE_LIFTED'; source: string; at: number };

export type RuleResult = { state: 'no_rise' | 'watch' | 'avoid'; etaLo: number | null; etaHi: number | null;
  window: Window | null; triggerGaugeId: string | null; reasons: Reason[] };

export type Official = { crossingId: string; source: 'demo_official'; status: 'open' | 'caution' | 'closed';
  setAt: number; expiresAt: number };

export type RawState = { state: Wire; window: Window | null; reasons: Reason[]; triggerGaugeId: string | null;
  closedSource: 'official' | 'sensor' | null };

export type Tracker = { state: Wire; since: number; calmTicks: number; lastKnownState: Wire | null;
  lastKnownAt: number | null; closedSource: 'official' | 'sensor' | null; triggerGaugeId: string | null;
  window: Window | null; held: boolean; reasons: Reason[] };

export type DemoEvent = { t: number; crossingId: string; state: Wire; window: Window | null; held: boolean;
  reasons: Reason[]; lastKnown: { state: Wire; at: number } | null };
```

### 22.3 The scenario format `fordcast.demo-scenario.v1` — `scenario/schema.ts`

Scenarios are **TypeScript data**: type-checked, diffable and JSON-serializable. There's no JSON loader at runtime.

```ts
// mobile/src/demo/scenario/schema.ts — the scenario format `fordcast.demo-scenario.v1` (§22.3). Types only.
import type { GaugeCurve, Outage, TruthSpec } from '../sim/sim';
import type { Official, Wire } from '../engine/types';

export type DemoScenarioV1 = {
  schema: 'fordcast.demo-scenario.v1';
  id: string; seed: number; kind: 'live' | 'storm';           // 'live' = drives Map Home; 'storm' = Storms-tab card
  title: { en: string; es: string };
  subtitle?: { en: string; es: string };
  clockStart: { h: number; m: number };                       // storm-time label at t = 0 (America/Chicago wall time)
  durationMin: number; playFromMin: number;                   // Play / "Skip to action" start
  rain: { t: number; inPerHr: number; over: string }[];       // visual context only (rain chip/tint); NEVER changes a state
  curves: GaugeCurve[]; outages: Outage[]; official: Official[];
  network: { t: number; online: boolean }[];                  // scripted connectivity (A §3.4 20-min rule)
  truth: TruthSpec[];                                         // results only; never an engine input
  subscriptions: { crossingIds: string[]; watchAlerts: boolean };
  keyframes: Keyframe[];
  drive?: { route: 'commute' | 'detour'; startSimMin: number; cruiseMps: number; accelS: number; takeDetourAtBranch?: boolean };
};
export type KeyframeAt =
  | { kind: 'min'; t: number }
  | { kind: 'event'; crossingId: string; state: Wire; nth?: number; offsetMin?: number }   // resolved from compiled events
  | { kind: 'onset'; crossingId: string; offsetMin?: number };                            // resolved from truth
export type Keyframe = { id: string; label: string; at: KeyframeAt };
```

**Field rules (MUST):**

| Field | Rule |
|---|---|
| `seed` | Fixed per scenario. Noise = mulberry32(FNV-1a(seed, gaugeId)). Changing it changes every take and the golden hashes, so never change it after the feature freeze (Wed Oct 21 18:00 CT, §6); before that, only as a §1.7 stop-and-ask. |
| `kind` | `'live'` drives Map Home (and every tab) through the one clock. `'storm'` is a Storms-tab card; when played it also drives the one clock (D1 "one clock"). |
| `clockStart` | Storm-time label at `simMin = 0` (America/Chicago). Shown as "7:00 AM" / "7:00 a. m.", minute-floored, **never wall time**. |
| `rain` | **Visual only** (rain chip / map tint). It never enters `evaluate()`. FordCast's rule reads gauges, not rain. |
| `curves` | Per-gauge generator: `pulses` (parametric hydrographs), `routedFrom` (downstream response = lagged, boxcar-smoothed, scaled upstream anomaly), `diurnalFt`, `noiseFt`. A gauge without a curve gets a calm default. |
| `outages` | `delayed`: readings exist but arrive at `endMin` (C §19.4 rule). `lost`: true gap. |
| `official` | `source: 'demo_official'`, rendered "Simulated road crew". A `'open'` record after a `'closed'` one = closure lifted (never displayed as "open"/"reopened"). |
| `network` | Scripted phone connectivity for A §3.4's 20-minute rule. The Director can override it (§24). |
| `truth` | `onset = first t with stage(fromGauge, t − tauTrueMin) ≥ overtopUpFt`. Used **only** for results (lead, window check, ● marker). |
| `subscriptions` | Which crossings notify (A §3.8 policy, §25.1). Hero = `['atx-37']`, the crossing on the saved Home → School route. |
| `keyframes` | Prefer `{kind:'event'}` / `{kind:'onset'}` (resolved from compiled events). Use `{kind:'min'}` only where no event exists. Takes (§24.4) use the same `KeyframeAt` union. |
| `drive` | Present only for `drive-commute`. Speeds in m/s; the risk clock runs at 1× during a drive. |

**JSON form** (example: the Onion Creek storm, abbreviated). Use it for docs, or if the student wants to author a scenario in a JSON editor and paste it into `scenarios.ts`:

```json
{ "schema": "fordcast.demo-scenario.v1", "id": "onion-creek-storm", "seed": 13, "kind": "storm",
  "title": { "en": "Big Onion Creek storm (simulated)", "es": "Gran tormenta en Onion Creek (simulada)" },
  "clockStart": { "h": 1, "m": 0 }, "durationMin": 420, "playFromMin": 0,
  "rain": [ { "t": 0, "inPerHr": 0.2, "over": "Driftwood" }, { "t": 20, "inPerHr": 2.5, "over": "Driftwood" } ],
  "curves": [
    { "gaugeId": "USGS-08158700", "pulses": [ { "peakMin": 150, "riseMin": 120, "fallMin": 150, "ampFt": 15, "kRise": 2.5 } ], "noiseFt": 0.03 },
    { "gaugeId": "USGS-08158827", "routedFrom": { "gaugeId": "USGS-08158800", "lagMin": 35, "gain": 1.05, "smoothMin": 20 }, "noiseFt": 0.03 } ],
  "outages": [ { "gaugeId": "USGS-08158827", "startMin": 250, "endMin": 335, "mode": "delayed" } ],
  "official": [], "network": [ { "t": 0, "online": true } ],
  "truth": [ { "crossingId": "tc-68", "fromGaugeId": "USGS-08158800", "tauTrueMin": 47, "overtopUpFt": 10 } ],
  "subscriptions": { "crossingIds": [], "watchAlerts": false },
  "keyframes": [ { "id": "silent", "label": "Gauge goes silent", "at": { "kind": "event", "crossingId": "tc-1626", "state": "unknown" } } ] }
```

### 22.4 Simulator — `sim/sim.ts`

**Hydrograph math:**
- Rising limb: `amp·(s·e^(1−s))^kRise`, with s ∈ (0, 1].
- Recession: `amp·((1+f)·e^(−f))^kFall`.
- Both limbs have zero slope at the peak, so the curve is C¹ and looks like a real stream gauge.

**Readings** are what a USGS gauge would report:
- one every `dtMin`
- rounded to 0.01 ft
- `availMin = obsMin + delayMin`
- outages applied as in the field rules above

`visible(rs, asOf)` = what the pipeline may see at `asOf`: `availMin ≤ asOf` and inside a 6-hour lookback.

**Full file: `05-code/mobile/src/demo/sim/sim.ts`** (pure, 5.2 KB). API, plus the two functions that define the data:

```ts
export function mulberry32(seed: number): () => number;                 // deterministic PRNG
export function hashSeed(...parts: (string | number)[]): number;         // FNV-1a → stable per (scenario, gauge)
export type Pulse = { peakMin: number; riseMin: number; fallMin: number; ampFt: number; kRise?: number; kFall?: number };
export type GaugeCurve = { gaugeId: string; pulses?: Pulse[];
  routedFrom?: { gaugeId: string; lagMin: number; gain: number; smoothMin: number }; diurnalFt?: number; noiseFt?: number };
export type Outage = { gaugeId: string; startMin: number; endMin: number; mode: 'delayed' | 'lost' };
export type TruthSpec = { crossingId: string; fromGaugeId: string; tauTrueMin: number; overtopUpFt: number };
export function buildStageFns(gauges: Gauge[], curves: GaugeCurve[]): Map<string, (t: number) => number>;
        // stage(t) = baseFt + diurnal·sin(2π(t+37)/1440) + Σ pulses + gain · mean of 5 samples of the upstream anomaly over
        // [t − lag − smooth, t − lag]   (routing: water visibly travels gauge → gauge)
export const visible: (rs: Reading[], asOf: number, lookbackMin?: number) => Reading[];   // availMin ≤ asOf, 6 h lookback
export function truthOnset(spec: TruthSpec, fns: Map<string, (t: number) => number>, from: number, to: number): number | null;
        // RESULTS ONLY: first t with stage(fromGauge, t − tauTrueMin) ≥ overtopUpFt

export function pulseFt(p: Pulse, t: number): number {
  const kR = p.kRise ?? 3, kF = p.kFall ?? 1;
  if (t <= p.peakMin) { const s = (t - (p.peakMin - p.riseMin)) / p.riseMin; return s <= 0 ? 0 : p.ampFt * Math.pow(s * Math.exp(1 - s), kR); }
  const f = (t - p.peakMin) / p.fallMin; return p.ampFt * Math.pow((1 + f) * Math.exp(-f), kF);
}
export function buildReadings(g: Gauge, fn: (t: number) => number, curves: GaugeCurve[], outages: Outage[],
  fromMin: number, toMin: number, seed: number): Reading[] {
  const c = curves.find((x) => x.gaugeId === g.id); const rnd = mulberry32(hashSeed(seed, g.id));
  const out: Reading[] = [];
  for (let t = Math.ceil(fromMin / g.dtMin) * g.dtMin; t <= toMin; t += g.dtMin) {
    const noise = ((rnd() * 2 - 1) * (c?.noiseFt ?? 0.015));
    const o = outages.find((x) => x.gaugeId === g.id && x.startMin <= t && t < x.endMin);
    if (o?.mode === 'lost') continue;                                     // a true gap: nothing ever arrives
    const avail = o ? Math.max(t + g.delayMin, o.endMin) : t + g.delayMin; // delayed: arrives at the outage end
    out.push({ gaugeId: g.id, obsMin: t, availMin: avail, ft: Math.round((fn(t) + noise) * 100) / 100 });
  }
  return out;
}
```

### 22.5 Compile: the C §19.6 tick, on the phone — `scenario/compile.ts`

```
for t in [−60 … durationMin] step 5:                         // 60-min warm-up so trackers settle before simMin 0
  series[g] = readings with availMin ≤ t and obsMin ≥ t − 360 // as-of discipline
  for each crossing c:
    rule  = evaluate(c, links, series, gauges, t)            // ★ baseline rule (C §18.5)
    stale = crossingIsStale(...)                             // C §18.9
    raw   = resolveRawState(official, waterAtRoad, tier, stale, rule)   // A §3.3 — the ONLY combination logic
    tracker[c] = step(tracker[c], raw, t, ctx)               // C §18.8 hysteresis (dwell 6/6/12 ticks)
    emit an event only when (state, window, held, reason codes) changed
results (truth ONLY here): onset → lead = onset − start of the AVOID/CLOSED episode, floored to 5 (C §19.12);
  tier B excluded; hero = lead closest to the (lower) median, ties → earlier onset → id; "inside the first window?"
```

**Output** (`Compiled`): `{ scenario, readings, fns, initial, events, onsets, leads, hero, medianLead }`.
- It maps 1:1 onto the full build's `fordcast.replay.v1` `events/gauges/truth/hero`.
- An adapter is [NEXT] (§26.6).
- **Cost:** 4–13 ms per scenario in bun, 6–30 ms with the JIT disabled (a rough Hermes stand-in). [Verified: ran]
- **When to compile:** each scenario compiles once when selected, and `precompileAll()` runs after the first frame (§22.10).

```ts
// mobile/src/demo/scenario/compile.ts — runs the REAL forecast pipeline (rule → combine → state machine) over the
// simulated readings, one 5-minute tick at a time, exactly like C §19.6 tick() in replay mode. Pure + deterministic.
import { CROSSINGS, GAUGES, LINKS } from '../data/demo-data';
import { crossingIsStale, evaluate, initialTracker, isFresh, isFreshOfficial, latest, resolveRawState, rise, step } from '../engine/engine';
import type { Crossing, DemoEvent, Reading, Reason, Tracker, Wire } from '../engine/types';
import { buildReadings, buildStageFns, truthOnset, visible } from '../sim/sim';   // truth is used ONLY in the results block
import type { DemoScenarioV1 } from './schema';

const TICK = 5, WARMUP = 60;
export function compileScenario(s: DemoScenarioV1) {
  const fns = buildStageFns(GAUGES, s.curves);
  const gaugeById = new Map(GAUGES.map((g) => [g.id, g]));
  const readings = new Map<string, Reading[]>(GAUGES.map((g) =>
    [g.id, buildReadings(g, fns.get(g.id)!, s.curves, s.outages, -WARMUP - 360, s.durationMin, s.seed)]));
  const linksBy = new Map<string, typeof LINKS>(); for (const l of LINKS) linksBy.set(l.crossingId, [...(linksBy.get(l.crossingId) ?? []), l]);
  const trackers = new Map<string, Tracker>(CROSSINGS.map((c) => [c.id, initialTracker()]));
  const events: DemoEvent[] = []; const initial = new Map<string, DemoEvent>();
  const officialAt = (cid: string, t: number) => s.official.filter((o) => o.crossingId === cid && o.setAt <= t).at(-1) ?? null;

  for (let t = -WARMUP; t <= s.durationMin; t += TICK) {
    const series = new Map<string, Reading[]>(); for (const [id, rs] of readings) series.set(id, visible(rs, t));
    for (const c of CROSSINGS) {
      const links = linksBy.get(c.id) ?? [];
      const rule = evaluate(c, links, series, gaugeById, t);
      const stale = c.tier === 'C' ? { stale: false } : crossingIsStale(links, series, gaugeById, t, rule);
      const rec = officialAt(c.id, t); const off = isFreshOfficial(rec, t) ? rec : null;
      const war = waterAtRoad(c, series, t);
      const raw = resolveRawState(off, war, c.tier, stale, rule);
      const prev = trackers.get(c.id)!;
      const trig = prev.triggerGaugeId ? series.get(prev.triggerGaugeId) ?? [] : [];
      const trigLink = links.find((l) => l.gaugeId === prev.triggerGaugeId);
      const next = step(prev, raw, t, {
        officialFresh: !!off, officialClosed: off?.status === 'closed', officialSource: rec?.source ?? null,
        liftedAt: rec && rec.status !== 'closed' ? rec.setAt : null,
        extraOk: (tr) => tr.state === 'avoid'
          ? !!trigLink && isFresh(trig, t, gaugeById.get(trigLink.gaugeId)!.staleAfterMin) && (rise(trig, 30) ?? 0) < 0 && latest(trig)!.ft < trigLink.triggerFt - 0.5
          : tr.state === 'closed' && tr.closedSource === 'official' ? !!off && off.status !== 'closed'
          : tr.state === 'closed' && tr.closedSource === 'sensor' ? !war
          : true,
      });
      trackers.set(c.id, next);
      const ev: DemoEvent = { t, crossingId: c.id, state: next.state, window: next.window, held: next.held, reasons: next.reasons,
        lastKnown: next.state === 'unknown' && next.lastKnownState ? { state: next.lastKnownState, at: next.lastKnownAt! } : null };
      if (t <= 0) { initial.set(c.id, { ...ev, t: 0 }); continue; }
      const last = [...events].reverse().find((e) => e.crossingId === c.id) ?? initial.get(c.id)!;
      if (sig(last) !== sig(ev)) events.push(ev);
    }
  }
  // ---- results (truth used ONLY here; never fed back into states) ----
  const onsets = new Map(s.truth.map((tr) => [tr.crossingId, truthOnset(tr, fns, 0, s.durationMin)]));
  const leads: { crossingId: string; onset: number; firstAlertAt: number; leadMin: number; firstWindow: [number, number] | null; inFirstWindow: boolean }[] = [];
  for (const [cid, onset] of onsets) {
    if (onset == null) continue;
    if (CROSSINGS.find((c) => c.id === cid)?.tier !== 'A') continue;          // C §17.13: tier B never counts toward leads/hero
    const evs = [initial.get(cid)!, ...events.filter((e) => e.crossingId === cid)];
    let episodeStart: number | null = null;                                   // AVOID/CLOSED episode active at the onset
    for (const e of evs) { if (e.t > onset) break; const hot = e.state === 'avoid' || e.state === 'closed';
      if (hot && episodeStart == null) episodeStart = e.t; if (!hot && e.state !== 'unknown') episodeStart = null; }
    if (episodeStart != null) { const w = evs.find((e) => e.t === episodeStart)?.window ?? null;
      leads.push({ crossingId: cid, onset, firstAlertAt: episodeStart, leadMin: Math.floor((onset - episodeStart) / 5) * 5, firstWindow: w,
        inFirstWindow: !!w && onset - episodeStart >= w[0] && onset - episodeStart <= w[1] }); }
  }
  const sorted = [...leads].sort((a, b) => a.leadMin - b.leadMin);
  const median = sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)]!.leadMin : null;   // lower median
  const hero = median == null ? null : [...leads].sort((a, b) => Math.abs(a.leadMin - median) - Math.abs(b.leadMin - median)
    || a.onset - b.onset || a.crossingId.localeCompare(b.crossingId))[0]!;
  return { scenario: s, readings, fns, initial, events, onsets, leads, hero, medianLead: median };
}
const sig = (e: DemoEvent) => `${e.state}|${e.window?.join('-') ?? ''}|${e.held}|${e.reasons.map((r) => r.code).join(',')}`;

function waterAtRoad(c: Crossing, series: Map<string, Reading[]>, t: number): Reason | null {
  if (!c.targetGaugeId || c.overtopStageFt == null) return null;
  const s = series.get(c.targetGaugeId) ?? []; const g = GAUGES.find((x) => x.id === c.targetGaugeId)!;
  if (!isFresh(s, t, g.staleAfterMin)) return null;                         // a stale target never asserts water at road
  const n = latest(s)!; return n.ft >= c.overtopStageFt ? { code: 'WATER_AT_ROAD', gauge_id: g.id, value_ft: n.ft, overtop_ft: c.overtopStageFt, obs_at: n.obsMin } : null;
}
export type Compiled = ReturnType<typeof compileScenario>;
export const stateAt = (cmp: Compiled, cid: string, t: number): DemoEvent => {
  const evs = cmp.events.filter((e) => e.crossingId === cid && e.t <= t); return evs.at(-1) ?? cmp.initial.get(cid)!;
};
export type { Wire };
```

### 22.6 The four scenarios — `scenario/scenarios.ts`

```ts
// mobile/src/demo/scenario/scenarios.ts — the four bundled scenarios (data, not code). Times = minutes after t = 0.
import type { DemoScenarioV1 } from './schema';

const calmCurves = (ids: string[]) => ids.map((gaugeId) => ({ gaugeId, diurnalFt: 0.03, noiseFt: 0.01 }));
const ALL = ['08158922', '08158930', '08158970', '08158700', '08158800', '08158827', '08159000', '08158840', '08156800',
  '08157000', '08154700', '08158200', '08155200', '08155400'].map((s) => `USGS-${s}`);

// (a) Calm evening — every monitored crossing "No rise detected"; tier C stays "Unknown · not monitored".
export const calmEvening: DemoScenarioV1 = {
  schema: 'fordcast.demo-scenario.v1', id: 'calm-evening', seed: 11, kind: 'live',
  title: { en: 'Calm evening', es: 'Noche tranquila' },
  clockStart: { h: 19, m: 30 }, durationMin: 120, playFromMin: 0,
  rain: [{ t: 0, inPerHr: 0, over: 'Austin' }],
  curves: calmCurves(ALL), outages: [], official: [], network: [{ t: 0, online: true }], truth: [],
  subscriptions: { crossingIds: ['atx-37', 'atx-680', 'atx-692'], watchAlerts: false },
  keyframes: [{ id: 'calm', label: 'Calm map', at: { kind: 'min', t: 30 } }],
};

// (b) Flash flood night — the hero. Upper Williamson Creek gets a short, intense cell over Oak Hill.
export const flashFloodNight: DemoScenarioV1 = {
  schema: 'fordcast.demo-scenario.v1', id: 'flash-flood-night', seed: 26, kind: 'live',
  title: { en: 'Flash flood night', es: 'Noche de inundación repentina' },
  subtitle: { en: 'Pre-dawn cloudburst over Oak Hill', es: 'Aguacero antes del amanecer sobre Oak Hill' },
  clockStart: { h: 5, m: 50 }, durationMin: 300, playFromMin: 0,   // pre-dawn (sunrise ≈ 7:35): AVOID lands at 7:00 AM, before the school run
  rain: [{ t: 0, inPerHr: 0, over: 'Oak Hill' }, { t: 5, inPerHr: 0.4, over: 'Oak Hill' }, { t: 15, inPerHr: 2.2, over: 'Oak Hill' },
    { t: 35, inPerHr: 3.1, over: 'Oak Hill' }, { t: 55, inPerHr: 1.2, over: 'Oak Hill' }, { t: 80, inPerHr: 0.3, over: 'Oak Hill' },
    { t: 110, inPerHr: 0, over: 'Oak Hill' }],
  curves: [
    ...calmCurves(ALL.filter((g) => !['USGS-08158922', 'USGS-08158930', 'USGS-08158970', 'USGS-08158840'].includes(g))),
    { gaugeId: 'USGS-08158922', pulses: [{ peakMin: 95, riseMin: 80, fallMin: 75, ampFt: 7.6, kRise: 3, kFall: 1.3 }], noiseFt: 0.02 },
    { gaugeId: 'USGS-08158930', routedFrom: { gaugeId: 'USGS-08158922', lagMin: 32, gain: 0.95, smoothMin: 20 }, noiseFt: 0.02 },
    { gaugeId: 'USGS-08158970', routedFrom: { gaugeId: 'USGS-08158930', lagMin: 45, gain: 1.3, smoothMin: 30 }, noiseFt: 0.02 },
    { gaugeId: 'USGS-08158840', pulses: [{ peakMin: 95, riseMin: 60, fallMin: 60, ampFt: 3.0 }], noiseFt: 0.02 },
  ],
  outages: [],
  // Simulated official closure (source label demo.source.road_crew = "Simulated road crew"), lifted at 9:25 AM.
  official: [
    { crossingId: 'atx-37', source: 'demo_official', status: 'closed', setAt: 120, expiresAt: 120 + 240 },
    { crossingId: 'atx-37', source: 'demo_official', status: 'open', setAt: 215, expiresAt: 215 + 120 },
  ],
  network: [{ t: 0, online: true }],
  truth: [
    { crossingId: 'atx-37', fromGaugeId: 'USGS-08158922', tauTrueMin: 42, overtopUpFt: 6.8 },   // onset inside the first window
    { crossingId: 'atx-680', fromGaugeId: 'USGS-08158922', tauTrueMin: 32, overtopUpFt: 9.4 },
    { crossingId: 'atx-692', fromGaugeId: 'USGS-08158930', tauTrueMin: 0, overtopUpFt: 9.0 },   // C §18.2: target gauge ≥ overtop
  ],
  subscriptions: { crossingIds: ['atx-37'], watchAlerts: false },          // the one crossing on the saved Home→School route
  keyframes: [],                                     // filled from events by takes.ts (never hand-typed times)
};

// (c) Big Onion Creek storm (simulated) — a long night storm; Twin Creeks Rd gauge goes silent mid-rise (2013-style pattern).
export const onionCreekStorm: DemoScenarioV1 = {
  schema: 'fordcast.demo-scenario.v1', id: 'onion-creek-storm', seed: 13, kind: 'storm',
  title: { en: 'Big Onion Creek storm (simulated)', es: 'Gran tormenta en Onion Creek (simulada)' },
  clockStart: { h: 1, m: 0 }, durationMin: 420, playFromMin: 0,
  rain: [{ t: 0, inPerHr: 0.2, over: 'Driftwood' }, { t: 20, inPerHr: 2.5, over: 'Driftwood' }, { t: 60, inPerHr: 4.0, over: 'Driftwood' },
    { t: 120, inPerHr: 1.5, over: 'Driftwood' }, { t: 180, inPerHr: 0.2, over: 'Driftwood' }, { t: 240, inPerHr: 0, over: 'Driftwood' }],
  curves: [
    ...calmCurves(ALL.filter((g) => !['USGS-08158700', 'USGS-08158800', 'USGS-08158827', 'USGS-08159000'].includes(g))),
    { gaugeId: 'USGS-08158700', pulses: [{ peakMin: 150, riseMin: 120, fallMin: 150, ampFt: 15, kRise: 2.5 }], noiseFt: 0.03 },
    { gaugeId: 'USGS-08158800', routedFrom: { gaugeId: 'USGS-08158700', lagMin: 105, gain: 0.95, smoothMin: 40 }, noiseFt: 0.03,
      pulses: [{ peakMin: 140, riseMin: 80, fallMin: 90, ampFt: 2.0 }] },
    { gaugeId: 'USGS-08158827', routedFrom: { gaugeId: 'USGS-08158800', lagMin: 35, gain: 1.05, smoothMin: 20 }, noiseFt: 0.03 },
    { gaugeId: 'USGS-08159000', routedFrom: { gaugeId: 'USGS-08158827', lagMin: 70, gain: 1.9, smoothMin: 40 }, noiseFt: 0.03 },
  ],
  outages: [
    { gaugeId: 'USGS-08158827', startMin: 250, endMin: 335, mode: 'delayed' },   // readings exist, arrive at endMin
    { gaugeId: 'USGS-08159000', startMin: 300, endMin: 400, mode: 'delayed' },
  ],
  official: [], network: [{ t: 0, online: true }],
  truth: [
    { crossingId: 'hays-663', fromGaugeId: 'USGS-08158700', tauTrueMin: 12, overtopUpFt: 8.0 },
    { crossingId: 'bud-1117', fromGaugeId: 'USGS-08158800', tauTrueMin: 16, overtopUpFt: 8.5 },
    { crossingId: 'tc-68', fromGaugeId: 'USGS-08158800', tauTrueMin: 47, overtopUpFt: 10.0 },
    { crossingId: 'tc-1626', fromGaugeId: 'USGS-08158827', tauTrueMin: 41, overtopUpFt: 11.0 },
  ],
  subscriptions: { crossingIds: [], watchAlerts: false },
  keyframes: [],
};

// (d) Drive — same storm; leaves Home at 6:58:54 AM while Jones Rd is WATCH, so AVOID arrives 66 s into the drive (1× clock).
export const driveCommute: DemoScenarioV1 = {
  ...flashFloodNight, id: 'drive-commute', title: { en: 'Drive to school (simulated)', es: 'Camino a la escuela (simulado)' },
  playFromMin: 68.9, drive: { route: 'commute', startSimMin: 68.9, cruiseMps: 8.9, accelS: 6, takeDetourAtBranch: true },   // 20 mph in heavy rain
};

export const SCENARIOS = [calmEvening, flashFloodNight, onionCreekStorm, driveCommute];
```

Every row below is **engine output**, not a target. [Verified: ran, 2026-10-16] Glyphs: ▲ Watch · ◆ Avoid · ▧ Closed · ◌ Unknown · ● water reached the road (truth).

#### (a) `calm-evening` · 7:30–9:30 PM · seed 11 · [MUST-SHOW] (T01)

| What | Engine output |
|---|---|
| Events | **0** |
| Tier A + B (17) | ○ No rise detected |
| Tier C (8) | ◌ "Unknown · not monitored by FordCast" (`state.unknown.headline_not_monitored`); never a calm look |
| Gauges | Diurnal ±0.03 ft + noise ±0.01 ft, so sparklines look alive, never flat |
| Use | Calm opening shot; the state after every **Reset** and every app launch |

#### (b) `flash-flood-night` (hero) · starts 5:50 AM · seed 26 · [MUST-SHOW]

**Setup:**
- "Pre-dawn cloudburst over Oak Hill": rain 0.4 → 3.1 in/h (visual only).
- Gauge 08158922 rises from 2.1 to 9.7 ft (peak ≈ 7:25 AM).
- 08158930 and 08158970 respond with routed lags.
- 08158840 gets a smaller pulse.

| Storm time | simMin | Engine output | Surfaces |
|---|---|---|---|
| 6:45 AM | 55 | atx-37 ▲ **Watch** · UPSTREAM_RISING (+2.6 ft, 4.7 ft) | marker, sheet, Drive TTS |
| **7:00 AM** | 70 | atx-37 ◆ **Avoid · likely flooded within 15–30 min** · "+4.5 ft over the last 30 min… water usually takes 30–45 min". Westgate ▲, Manchaca & Jones ▲, Jimmy Clay ▲ | **AVOID local notification**, AlertBanner, Error haptic |
| 7:05 AM | 75 | atx-37 window → 0–30 → headline "Avoid · water may already be on the road" (lo = 0 rule) | |
| 7:15 AM | 85 | atx-37 ◆ 0–15 · Westgate ◆ 15–30 · Manchaca & Jones ◆ 15–60 · Circle C ▲ · Slaughter Creek Trail ▲ | |
| **7:30 AM** | 100 | ● **Water reaches the road at Jones Rd**: inside the first window, **lead 30 min**. Jimmy Clay ◆ 60–90 | count-up |
| 7:45 AM | 115 | ● Westgate water on road (lead 30) · Jimmy Clay ◆ 30–90 | |
| **7:50 AM** | 120 | atx-37 ▧ **Flooded – Closed · OFFICIAL**, source "Simulated road crew" | **CLOSED notification** |
| 8:02 AM | 132 | ● Manchaca & Jones water on road (lead 45) | |
| 8:15 AM | 145 | Manchaca & Jones ▧ CLOSED via **sensor at the road** (WATER_AT_ROAD, 08158930 ≥ 9.0 ft) | |
| 9:25 AM | 215 | Simulated crew lifts the closure → atx-37 stays ▧ (held, dwell) | |
| 9:50 AM | 240 | atx-37 ◆ Avoid (held) + "Simulated road crew: closure lifted at 9:25 AM. Water may remain. Use caution." | never "reopened" |
| 10:20 AM | 270 | atx-37 ▲ Watch (held). It never jumps to No rise. | |

**Results** (`storyResults()`):
- hero atx-37, **30 min**
- median **30** over **3** flooded tier-A crossings (30, 30, 45)
- **closure gap 50 min**
- all 3 onsets inside the first window shown

**Notifications:** 7:00 AM Avoid, 7:50 AM Closed.

**Storyboard:** 6:45 first Watch (Brush Country gauge) · 7:00 first Avoid · 7:15 first Watch (Slaughter gauge) · 7:45 first Avoid (Manchaca Rd gauge) · 7:50 official closure.

#### (c) `onion-creek-storm` · starts 1:00 AM · seed 13 · [MUST-SHOW] (T11) / [SHOULD-SHOW] (O4)

**Setup:**
- All-night storm over Driftwood; Driftwood rises 15 ft. The wave routes Buda → Twin Creeks → US 183.
- It's patterned on the overnight Onion Creek floods Austin has had. It is **not** a replay of 2013/2015, and no copy may say it is.

| Storm time | simMin | Engine output |
|---|---|---|
| 2:10 / 2:25 AM | 70 / 85 | hays-663 (tier B) ▲ then ◆ "water may already be on the road". Water arrives at 2:25, so lead **0**: the honest "tier B = little warning" example, excluded from leads. |
| 2:55 AM | 115 | Garrison Rd ◆ **60–90** (from Driftwood, 23 km up). Water at 4:24 AM, so lead 85. |
| 4:25 AM | 205 | Old San Antonio Rd ◆ 15–60. Water at 5:04 AM, so **lead 35 (storm hero)**. |
| 5:10 AM | 250 | Bluff Springs Rd ◆ 15–60. Water at 5:45 AM, so lead 35. |
| **5:50 AM** | 290 | **Twin Creeks gauge goes silent** (readings delayed until 6:35). Bluff Springs → ◌ **UNKNOWN, "Last known: Avoid · 50 min ago"**. Storyboard: "Onion Ck at Twin Creeks Rd went silent. Its readings only arrived later, so FordCast shows Unknown here." |
| 6:35 AM | 335 | Delayed readings arrive at once → Bluff Springs ◆ again. It is never shown calm. |

**Results:** hero tc-68 **35 min**, median **35** over 3 tier-A crossings (85, 35, 35), all inside the first window.

#### (d) `drive-commute` · same storm as (b) · [MUST-SHOW] (T09, T10)

**Setup:**
- Leaves Home at **6:58:54 AM** (`startSimMin 68.9`) while Jones Rd is ▲.
- Cruise 8.9 m/s (20 mph, heavy rain) after a 6 s ramp.
- The risk clock runs at **1×**.
- The scripted driver turns at `BRANCH`; nobody touches the phone.

| Drive time | Event |
|---|---|
| 0 s | ▲ Jones Rd 1.0 km ahead → `chime_soft` → "Heads up. Water is rising upstream of Williamson Creek at Jones Road. Plan another route." → Warning haptic |
| 9 s | Driver lockout engages (≥ 4.5 m/s for 5 s), outside Drive Mode only |
| **66 s** (7:00 AM) | Jones Rd → Avoid **and** Manchaca & Jones → Watch on the same tick → `chime` → **"2 crossings ahead changed. Avoid Williamson Creek at Jones Road. Flooding likely soon. Take another route."** → Error haptic. The car is ≈ 470 m before Jones Rd. |
| ≈ 104 s | Car turns at BRANCH (130 m before the crossing) → nothing at risk ahead → calm HUD, **silent** (never an "all clear") |
| ≈ 412 s | Arrives at School (the commute alone would take 270 s) |

**ES line at 66 s:** "Cambiaron 2 cruces adelante. Evite Williamson Creek en Jones Road. Inundación probable pronto. Tome otra ruta." [Verified: test] Native review is still required (§27).

### 22.7 The one clock — `scenario/clock.ts`

- `simMin` is **closed-form** (anchor + piecewise rate), never a sum of frame deltas. It can't drift, and it is identical on every take.
- **Speeds:** 1 / 10 / 30 / **60** (default) / 120 sim-min per wall-min. 60× means one storm-minute per wall-second.
- **Auto-slow** (Director switch, default **on**): 10× from beat − 5 to beat + 5. Beats come from `beatMinutes()`; for the hero they are 6:45, 7:00, 7:15, 7:30, 7:45, 7:50.
- **Background policy** (`store`):
  - `AppState → background` **pauses** the clock, unless a lock-screen take is armed. In that case the clock is already paused at beat − 1 and the OS fires the notification.
  - Returning to the app never jumps the storm forward.
- **UI sampling:** one shared 250 ms ticker (`hooks.ts`).
  - Labels re-render ≤ once per sim-minute.
  - Risk consumers re-render ≤ once per 5-min tick, which is every 2.5 s at 120×.
  - The scrubber thumb may read `simNow()` in a Reanimated `useFrameCallback` for smoothness (§26).

**Full file: `05-code/mobile/src/demo/scenario/clock.ts`** (pure, 3.6 KB). API:

```ts
export const SPEEDS = [1, 10, 30, 60, 120] as const;  export type Speed = (typeof SPEEDS)[number];
export type SlowWindow = { fromMin: number; toMin: number };
export type ClockState = { playing: boolean; speed: Speed; anchorSimMin: number; anchorWallMs: number;
  minMin: number; maxMin: number; autoSlow: SlowWindow[] };
export const initialClock: (minMin: number, maxMin: number, startMin: number, wallMs: number) => ClockState; // paused, 60×
export function advance(simMin: number, wallDtMs: number, speed: number, slow: SlowWindow[], maxMin: number): number;
                                   // exact piecewise integration: rate = min(speed, 10) inside slow windows
export const simNow: (c: ClockState, wallMs: number) => number;          // closed form; paused → anchorSimMin
export const play: (c: ClockState, wallMs: number) => ClockState;     // play/pause/setSpeed/setAutoSlow REBASE the anchor
export const pause: (c: ClockState, wallMs: number) => ClockState;    // (simMin stays continuous across every control)
export const setSpeed: (c: ClockState, speed: Speed, wallMs: number) => ClockState;
export const seek: (c: ClockState, simMin: number, wallMs: number) => ClockState;   // clamped to [minMin, maxMin]
export const setAutoSlow: (c: ClockState, w: SlowWindow[], wallMs: number) => ClockState;
export const tickOf = (simMin: number) => Math.floor(simMin / 5) * 5;    // states are step functions: never interpolate
export function stormTime(clockStart: { h: number; m: number }, simMin: number, lang: 'en' | 'es'): string;
                                   // (5:50, 70, 'en') → "7:00 AM"; 'es' → "7:00 a. m." — minute-floored, never wall time
```

### 22.8 What a screen shows — `scenario/display.ts` (A §3.4)

`displayAt(cmp, crossingId, simMin, network)` returns:

```
{ state, window, held, reasons, lastKnown, checkAgeMin, newestReadingAgeMin, freshness }
```

- **Check age** = minutes since the last online 5-min check.
  - **10–20 min:** `aging` (slate pill, same state).
  - **> 20 min:** **every** crossing → UNKNOWN, with "Last known: {{state}} · {{age}}" only when the last state was ≥ Watch. A calm crossing never gets a calm look on old data.
- **Gauge-silent "last known" age** = age of the **last observation**, not of the tick. Example: "Last known: Avoid · 50 min ago" at Bluff Springs at 5:50 AM.

```ts
// mobile/src/demo/scenario/display.ts — what a screen shows at simT, given the compiled timeline + client connectivity.
// Pure. Implements A §3.4 (check age vs reading age, 10–20 min aging, > 20 min ⇒ every crossing UNKNOWN + "Last known").
import type { Compiled } from './compile';
import { stateAt } from './compile';
import { GAUGES, LINKS } from '../data/demo-data';
import type { DemoEvent, Wire } from '../engine/types';

export type Net = { t: number; online: boolean }[];
export type DisplayRisk = { crossingId: string; state: Wire; window: [number, number] | null; held: boolean; reasons: DemoEvent['reasons'];
  lastKnown: { state: Wire; ageMin: number } | null; checkAgeMin: number; newestReadingAgeMin: number | null;
  freshness: 'fresh' | 'aging' | 'offline' };

/** Last 5-min tick at which the phone could "check" (online), ≤ simT. */
export function lastCheckAt(simT: number, net: Net): number {
  const tick = Math.floor(simT / 5) * 5;
  for (let t = tick; t >= -60; t -= 5) { const k = [...net].reverse().find((n) => n.t <= t); if (!k || k.online) return t; }
  return -60;
}
export function displayAt(cmp: Compiled, crossingId: string, simT: number, net: Net): DisplayRisk {
  const checkAt = lastCheckAt(simT, net); const checkAgeMin = simT - checkAt;
  const ev = stateAt(cmp, crossingId, checkAt);                                 // what the phone last received
  const prim = LINKS.find((l) => l.crossingId === crossingId && l.isPrimary);
  const rs = prim ? cmp.readings.get(prim.gaugeId)!.filter((r) => r.availMin <= checkAt) : [];
  const newestReadingAgeMin = rs.length ? simT - rs.at(-1)!.obsMin : null;
  const freshness = checkAgeMin > 20 ? 'offline' : checkAgeMin > 10 ? 'aging' : 'fresh';
  if (freshness === 'offline') {                                                // A §3.4: never a calm look on old data
    const lk = ev.state === 'unknown' ? ev.lastKnown?.state ?? null : ev.state;
    return { crossingId, state: 'unknown', window: null, held: false, reasons: [], checkAgeMin, newestReadingAgeMin, freshness,
      lastKnown: lk && lk !== 'no_rise' ? { state: lk, ageMin: checkAgeMin } : null };
  }
  const stale = ev.reasons.find((r) => r.code === 'DATA_STALE');
  const lastObs = stale && 'last_obs_at' in stale ? stale.last_obs_at : null;
  return { crossingId, state: ev.state, window: ev.window, held: ev.held, reasons: ev.reasons, checkAgeMin, newestReadingAgeMin, freshness,
    lastKnown: ev.state === 'unknown' && ev.lastKnown ? { state: ev.lastKnown.state, ageMin: lastObs != null ? simT - lastObs : simT - ev.lastKnown.at } : null };
}
export const gaugeOf = (id: string) => GAUGES.find((g) => g.id === id)!;
```

### 22.9 Choreography — `scenario/choreography.ts`

Everything the Director needs is **derived from compiled events**: the notification plan, storyboard lines, keyframe resolution, silent spans, beats, auto-slow windows and the determinism hash. Retuning a hydrograph moves every notification and take with it, and §28's take test catches any shot that breaks.

**Full file: `05-code/mobile/src/demo/scenario/choreography.ts`** (pure, 6.3 KB). API, plus the notification policy core:

```ts
export type PlannedNotification = { t: number; crossingId: string; kind: 'risk' | 'update'; state: Wire;
  window: [number, number] | null; interruptionLevel: 'active' | 'passive' };
export function planNotifications(cmp: Compiled): PlannedNotification[];          // §25.1 policy (core below)
export type StoryLine = { t: number; kind: 'first_watch' | 'first_avoid' | 'gauge_silent' | 'official'; crossingId: string; gaugeId?: string };
export function storyboard(cmp: Compiled): StoryLine[];                            // ≤ 8 lines, first per (kind, gauge)
export function resolveKeyframe(cmp: Compiled, k: Keyframe): number;               // 'min' | 'event' (nth non-held) | 'onset'; throws if absent
export function silentSpans(cmp: Compiled): { gaugeId: string; silentFrom: number; staleAt: number; until: number; mode: 'delayed' | 'lost' }[];
export function eventsHash(cmp: Compiled): string;                                 // FNV-1a of events JSON → 8 hex
export function beatMinutes(cmp: Compiled): number[];                              // storyboard t's + hero onset, sorted unique
export function autoSlowWindows(cmp: Compiled, padMin?: number): { fromMin: number; toMin: number }[];   // beat ± 5, merged

// planNotifications core (per compiled event of a SUBSCRIBED crossing):
const up = RANK[e.state] > RANK[prev.state];
const isRisk = up && (e.state === 'avoid' || e.state === 'closed' || (e.state === 'watch' && watchAlerts));
const isUpdate = e.state === 'no_rise' && escalated.has(e.crossingId);              // one passive update after an escalation
if (isRisk && (lastByLevel.get(`${e.crossingId}|${e.state}`) ?? -Infinity) > e.t - 60) continue;   // ≤ 1 per crossing per level per 60 min
while (perHour.length && perHour[0]! <= e.t - 60) perHour.shift(); if (perHour.length >= 3) continue;   // ≤ 3 per hour
```

### 22.10 Store and hooks — `store/demo-store.ts`, `store/hooks.ts` (zustand 5.0.15)

**Rules:**
- The demo store is **never persisted**. Every launch starts at `calm-evening`, paused at `playFromMin`, with auto-slow on.
- Settings (language, haptics, pledge) persist separately in `expo-sqlite/kv-store` (§18).
- Compiled timelines live in a module-level memo, never in React state.
- `getCompiled()` obtains every timeline from `scenario/source.ts` `compiledFor()` (§23.6), **never** by calling `compileScenario()` itself. That's what lets every screen run on golden fixtures before the ★ files exist.
- `precompileAll()` runs inside `InteractionManager.runAfterInteractions` after the first frame.
- **Background:** the root layout adds `AppState.addEventListener('change', s => s === 'background' && !useDemo.getState().armedTake && useDemo.getState().pause())`.

**Full file: `05-code/mobile/src/demo/store/demo-store.ts`** (5.0 KB). API:

```ts
export const DEFAULT_SCENARIO = 'calm-evening';
export const scenarioById: (id: string) => DemoScenarioV1;                // throws on unknown id
export const compileMs: Map<string, number>;                             // Director status line
export function getCompiled(id: string): Compiled;                       // module-level memo over source.ts compiledFor() (never React state)
export const precompileAll: () => void;                                  // after the first frame
export type Toggles = { clean: boolean; touches: boolean; haptics: boolean; lockout: 'auto' | 'off'; voiceLang: 'app' | 'en' | 'es' };
export type ArmedTake = { notificationId: string; seekToMin: number; route: string };
export type DemoState = Toggles & {
  scenarioId: string; clock: Clock.ClockState; autoSlowOn: boolean;
  netOverride: { fromMin: number; online: boolean } | null;              // Director "Simulate offline"
  armedTake: ArmedTake | null; firedIds: string[]; locked: boolean;
  selectScenario(id): void;   // new paused clock at playFromMin (+ autoSlowWindows if on); clears override/arm/fired/lock
  play(): void; pause(): void; seek(simMin): void /* also clears firedIds */; step(deltaMin): void;
  setSpeed(s: Clock.Speed): void; setAutoSlow(on: boolean): void; setOffline(on: boolean): void;
  setToggle<K extends keyof Toggles>(k: K, v: Toggles[K]): void;
  arm(t: ArmedTake | null): void; markFired(id: string): void; setLocked(v: boolean): void;
  resetState(): void;         // pause + seek playFromMin, clear override/arm/fired/lock, lockout 'auto'
};
export const useDemo: UseBoundStore<StoreApi<DemoState>>;                // zustand 5: create<DemoState>()((set, get) => …)
export function effectiveNet(s: DemoScenarioV1, o: DemoState['netOverride']): { t: number; online: boolean }[];
```

**Full file: `05-code/mobile/src/demo/store/hooks.ts`** (2.9 KB). One shared 250 ms ticker with a **cached** snapshot (so `useSyncExternalStore` stays pure). It also refreshes on every store change, so seek and pause apply at once.

```ts
export const useSimMinute: () => number;                 // floor(simNow) — storm-time label, ages; ≤ 1 render/sim-minute
export const useTick: () => number;                      // tickOf(simNow) — every risk consumer; ≤ 1 render/5-min tick
export function useNet(): { t: number; online: boolean }[];             // scenario network ⊕ Director offline override
export function useCrossingRisk(crossingId: string): DisplayRisk;       // crossing sheet, AlertBanner (minute resolution)
export function useAllRisks(): DisplayRisk[];            // Map Home markers + AreaStatusCard + nearby list (tick resolution)
export function useScenarioBanner(lang: 'en' | 'es'): { active: boolean; playing: boolean; title: string; time: string };
                                                         // active = scenario ≠ calm-evening → violet SIMULATED labels
```

**Done when (§22):**
- All four scenarios compile on the iPhone in ≤ 150 ms each (Release; log once in `__DEV__`).
- The hero table above matches the app at those storm times.
- Reset → Calm evening is instant.
- Leaving the app pauses the storm.
- `eventsHash` is identical across two devices or Simulator runs.
- `demo-engine-test` and `demo-display-test` pass.

---

## §23. The on-device forecast rule (TypeScript)

### 23.1 What runs, in what order, and who owns it

**Per crossing, per 5-min tick** (`compile.ts` loop):
1. **Features** (C §18.1): the newest delivered reading `S`, its 30-min rise `r30` (anchored on the newest observation; never interpolated across gaps > 30 min), and the last up-crossing time of the trigger.
2. **★ Baseline rule `evaluate()`** (C §18.5), for each **fresh** upstream link:
   - `S ≥ trigger` and (rising > `minRiseFt30m`, or crossed within `P75 + 30` min) → AVOID candidate with:
     - `etaMid = τ − (now − tCross)`
     - `etaLo = etaMid − (τ − P25)`
     - `etaHi = etaMid + (P75 − τ)`
   - `S ≥ watch` and `r30 > 0.2` → WATCH candidate.
   - The earliest AVOID with `etaLo < 90` wins. Otherwise AVOID candidates beyond 90 min, or WATCH candidates → WATCH. Otherwise NO_RISE.
3. **Window** (C §18.6): snap `[etaLo, etaHi]` to the fixed buckets 0–15 / 15–30 / 30–60 / 60–90, spanning at most 2 buckets → {0–15, 15–30, 30–60, 60–90, 0–30, 15–60, 30–90}.
4. **Staleness** (C §18.9): all upstream links stale, or primary stale and no signal → UNKNOWN (`DATA_STALE`).
5. **Combine** (A §3.3, the only combination logic): official closed > water at road (sensor) > tier C not monitored > stale > rule; official caution adds caution; "open" never lowers.
6. **State machine** (C §18.8):
   - Escalation is immediate.
   - De-escalation goes one level per dwell: CLOSED/AVOID 6 ticks (30 min), WATCH 12 ticks (60 min).
   - AVOID also needs the trigger gauge falling and < trigger − 0.5 ft.
   - After UNKNOWN, it resumes one level below the last known state (`HOLDING`).
   - `CLOSURE_LIFTED` persists until No rise.

**Student-owned (★, §1.8 pause points; binding):** step 2 = `engine/baseline-rule.ts` ★ (`evaluate`, Day 3), step 6 = `engine/state-machine.ts` ★ (`step`, Day 4), and the learner `engine/travel-time.ts` ★ (`estimateLag`/`combineStorms`, Day 5).
- 🤖 **never** copies or paraphrases the reference code of these three (§23.2 and §23.5 listings, `05-code/`, `research/proto/`). At each pause it follows §1.8 exactly: failing tests → skeleton (§23.6) → `docs/explain/<module>.md` → `AI_USE.md` row → hand-off message → **stop**.
- 🧑 writes (or co-writes) each file. Done = its ★ unit tests, `demo-engine-test` and `demo-golden-test` pass (§28.1).
- The UI never waits: until the Day 6 gate it runs on golden fixtures (§23.6).

**Explain-back questions** (for the student; answers also serve Q&A). Put Q1–Q4 in `docs/explain/baseline-rule.md` and Q5 in `docs/explain/state-machine.md`, next to the three questions §1.8 asks per file:
1. Why does the rule wait for the gauge reading to be *delivered* (`availMin ≤ t`) instead of using the reading's observation time?
2. At 7:00 AM the window is 15–30 min. Walk through how 15.9 and 26.9 become "15–30".
3. Why does FordCast show "30–45 min" for travel time instead of "40 min"?
4. Why does a crossing with no upstream gauge show Unknown, not No rise?
5. Why can't Avoid drop straight to No rise, even when the creek is falling?

### 23.2 Reference listing: `05-code/…/engine/engine.ts` (port per §23.6; ★ parts are NOT copied)

This is the tested **reference**. In the app it is split (§23.6). The sections marked "features", "windows", "explain", "staleness" and "combine" are ported as-is. The "baseline rule ★" section (`r1`, `evaluate`) and the "state machine" section's logic (`maxState`, `enter`, `step`, `stepCore`) are the student's to write. Only the state-machine **contract** (`DWELL`, `DOWN`, `initialTracker`, `StepCtx`) goes into the skeleton.

```ts
// mobile/src/demo/engine/engine.ts — features (C §18.1), windows (§18.6), explain (§18.10 / A §3.5 r8), baseline rule ★ (§18.5),
// staleness (§18.9), combine (A §3.3) and the state machine (§18.8). Line-by-line TS port. PURE: no I/O, no Date.now(),
// no imports from ../sim (truth isolation, C §19.8 spirit; enforced by demo-engine-test.ts).
import { RANK, type Crossing, type Link, type Official, type RawState, type Reading, type Reason, type RuleResult,
  type Tracker, type Window, type Wire, type Gauge } from './types';

// ---------- features (§18.1) ----------
export const latest = (s: Reading[]) => s[s.length - 1];
export function valueAt(s: Reading[], tMin: number): number | null {     // linear interpolation, ±10 min rule
  for (let i = s.length - 1; i > 0; i--) {
    const a = s[i - 1]!, b = s[i]!;
    if (a.obsMin <= tMin && tMin <= b.obsMin) {
      if (b.obsMin - a.obsMin > 30) return null;                             // never interpolate across a gap > 30 min
      return a.ft + ((b.ft - a.ft) * (tMin - a.obsMin)) / (b.obsMin - a.obsMin);
    }
  }
  const near = s.find((r) => Math.abs(r.obsMin - tMin) <= 10);
  return near ? near.ft : null;
}
export function rise(s: Reading[], minutes: number): number | null {      // anchored on the NEWEST observation
  if (s.length < 2) return null;
  const n = latest(s)!; const v0 = valueAt(s, n.obsMin - minutes);
  return v0 == null ? null : n.ft - v0;
}
export function lastUpcrossingTime(s: Reading[], level: number): number | null {
  if (!s.length) return null;
  if (s.every((r) => r.ft >= level)) return s[0]!.obsMin;                 // above for the whole lookback → earliest bound
  for (let i = s.length - 1; i > 0; i--) {
    const a = s[i - 1]!, b = s[i]!;
    if (a.ft < level && b.ft >= level) return a.obsMin + ((level - a.ft) / (b.ft - a.ft)) * (b.obsMin - a.obsMin);
  }
  return null;
}
export const isFresh = (s: Reading[], asOf: number, staleAfterMin: number) =>
  s.length > 0 && asOf - latest(s)!.obsMin <= staleAfterMin;

// ---------- windows (§18.6) ----------
export const BUCKETS: Window[] = [[0, 15], [15, 30], [30, 60], [60, 90]];
export const HORIZON_MIN = 90;
const bucketIndex = (m: number) => { for (let k = 0; k < BUCKETS.length; k++) if (m < BUCKETS[k]![1]) return k; return BUCKETS.length - 1; };
export function toWindow(etaLo: number, etaHi: number): Window | null {
  const lo = Math.max(0, etaLo);
  if (lo >= HORIZON_MIN) return null;
  const hi = Math.min(Math.max(lo, etaHi), HORIZON_MIN - 1e-9);
  const i = bucketIndex(lo); const j = Math.min(bucketIndex(hi), i + 1);
  return [BUCKETS[i]![0], BUCKETS[j]![1]];
}

// ---------- explain (§18.10 / A §3.5 rule 8) ----------
export function tauRange(l: Pick<Link, 'lagMin' | 'lagP25Min' | 'lagP75Min' | 'nStorms'>): [number, number] {
  const p25 = l.nStorms === 1 ? l.lagMin - 10 : l.lagP25Min;
  const p75 = l.nStorms === 1 ? l.lagMin + 10 : l.lagP75Min;
  let lo = 15 * Math.floor(p25 / 15); let hi = 15 * Math.ceil(p75 / 15);
  if (hi - lo < 15) hi = lo + 15;
  if (lo < 5) lo = 5;                                                       // a travel range never starts at 0
  return [lo, hi];
}
const r1 = (x: number) => Math.round(x * 10) / 10;

// ---------- baseline rule ★ (§18.5) — student-owned in the full build; same contract here ----------
export function evaluate(c: Crossing, links: Link[], series: Map<string, Reading[]>, gauges: Map<string, Gauge>,
  asOf: number): RuleResult {
  type Cand = { l: Link; etaLo: number; etaHi: number; reason: Reason };
  const avoid: Cand[] = []; const watch: { l: Link; reason: Reason }[] = [];
  for (const l of links) {
    if (l.relation !== 'upstream') continue;
    const s = series.get(l.gaugeId) ?? []; const g = gauges.get(l.gaugeId)!;
    if (!isFresh(s, asOf, g.staleAfterMin)) continue;                    // step 1: usable = fresh upstream links
    const S = latest(s)!.ft; const r30 = rise(s, 30) ?? 0;
    if (S >= l.triggerFt) {                                               // step 2: AVOID candidate
      const tCross = lastUpcrossingTime(s, l.triggerFt);
      const recent = tCross != null && asOf - tCross <= l.lagP75Min + 30;
      if (r30 > l.minRiseFt30m || recent) {
        const tc = tCross ?? latest(s)!.obsMin;
        const etaMid = l.lagMin - (asOf - tc);
        const etaLo = Math.max(0, etaMid - (l.lagMin - l.lagP25Min));
        const etaHi = Math.max(etaLo, etaMid + (l.lagP75Min - l.lagMin));
        const [tlo, thi] = tauRange(l);
        avoid.push({ l, etaLo, etaHi, reason: { code: 'UPSTREAM_ABOVE_TRIGGER', gauge_id: l.gaugeId, value_ft: r1(S),
          rise_ft_30m: r1(r30), tau_min: Math.round(l.lagMin / 5) * 5, tau_lo_min: tlo, tau_hi_min: thi,
          trigger_ft: l.triggerFt, obs_at: latest(s)!.obsMin } });
        continue;
      }
    }
    if (S >= l.watchFt && r30 > 0.2) watch.push({ l, reason: { code: 'UPSTREAM_RISING', gauge_id: l.gaugeId,
      rise_ft_30m: r1(r30), value_ft: r1(S), watch_ft: l.watchFt, obs_at: latest(s)!.obsMin } });   // step 3
  }
  avoid.sort((a, b) => a.etaLo - b.etaLo);
  const near = avoid.filter((a) => a.etaLo < HORIZON_MIN);
  const reasons = [...avoid.map((a) => a.reason), ...watch.map((w) => w.reason)].slice(0, 3);
  if (near.length) { const b = near[0]!;                                  // step 4
    return { state: 'avoid', etaLo: b.etaLo, etaHi: b.etaHi, window: toWindow(b.etaLo, b.etaHi), triggerGaugeId: b.l.gaugeId, reasons }; }
  if (avoid.length) return { state: 'watch', etaLo: null, etaHi: null, window: null, triggerGaugeId: avoid[0]!.l.gaugeId, reasons }; // step 5
  if (watch.length) return { state: 'watch', etaLo: null, etaHi: null, window: null, triggerGaugeId: watch[0]!.l.gaugeId, reasons }; // step 6
  return { state: 'no_rise', etaLo: null, etaHi: null, window: null, triggerGaugeId: null, reasons: [] };       // step 7
}

// ---------- staleness (§18.9) ----------
export function crossingIsStale(links: Link[], series: Map<string, Reading[]>, gauges: Map<string, Gauge>, asOf: number,
  rule: RuleResult): { stale: boolean; reason?: Reason } {
  const up = links.filter((l) => l.relation === 'upstream');
  const fresh = (l: Link) => isFresh(series.get(l.gaugeId) ?? [], asOf, gauges.get(l.gaugeId)!.staleAfterMin);
  const primary = up.find((l) => l.isPrimary) ?? up[0];
  const allStale = up.length > 0 && up.every((l) => !fresh(l));
  const primaryStaleNoSignal = !!primary && !fresh(primary) && rule.state === 'no_rise';
  if (!allStale && !primaryStaleNoSignal) return { stale: false };
  const s = series.get(primary!.gaugeId) ?? [];
  return { stale: true, reason: { code: 'DATA_STALE', gauge_id: primary!.gaugeId, last_obs_at: s.length ? latest(s)!.obsMin : null } };
}

// ---------- combine (A §3.3) — the only combination logic ----------
export const isFreshOfficial = (o: Official | null, now: number) => !!o && o.setAt <= now && now < o.expiresAt;
export function resolveRawState(official: Official | null, waterAtRoad: Reason | null, tier: Crossing['tier'],
  stale: { stale: boolean; reason?: Reason }, rule: RuleResult): RawState {
  if (official && official.status === 'closed')
    return { state: 'closed', window: null, reasons: [{ code: 'OFFICIAL_CLOSED', source: official.source, as_of: official.setAt }], triggerGaugeId: null, closedSource: 'official' };
  if (waterAtRoad) return { state: 'closed', window: null, reasons: [waterAtRoad], triggerGaugeId: null, closedSource: 'sensor' };
  let base: RawState;
  if (tier === 'C') base = { state: 'unknown', window: null, reasons: [{ code: 'NO_UPSTREAM_GAUGE' }], triggerGaugeId: null, closedSource: null };
  else if (stale.stale) base = { state: 'unknown', window: null, reasons: [stale.reason!], triggerGaugeId: null, closedSource: null };
  else base = { state: rule.state, window: rule.window, reasons: rule.reasons, triggerGaugeId: rule.triggerGaugeId, closedSource: null };
  if (official && official.status === 'caution' && RANK[base.state] < RANK.watch)
    return { ...base, state: 'watch', window: null, reasons: [...base.reasons, { code: 'OFFICIAL_CAUTION', source: official.source, as_of: official.setAt }] };
  return base;                                                              // official "open" never lowers
}

// ---------- state machine (§18.8) — ticks are 5 min ----------
export const DWELL: Partial<Record<Wire, number>> = { closed: 6, avoid: 6, watch: 12 };
export const DOWN: Partial<Record<Wire, Wire>> = { closed: 'avoid', avoid: 'watch', watch: 'no_rise' };
const maxState = (a: Wire, b: Wire) => (RANK[a] >= RANK[b] ? a : b);
export const initialTracker = (): Tracker => ({ state: 'unknown', since: 0, calmTicks: 0, lastKnownState: null, lastKnownAt: null,
  closedSource: null, triggerGaugeId: null, window: null, held: false, reasons: [] });
export type StepCtx = { officialFresh: boolean; officialClosed: boolean; extraOk: (tr: Tracker) => boolean; officialSource: string | null;
  liftedAt: number | null };
function enter(tr: Tracker, raw: RawState, now: number): Tracker {
  const known = raw.state !== 'unknown';
  return { ...tr, state: raw.state, since: now, calmTicks: 0, window: raw.window, reasons: raw.reasons, closedSource: raw.closedSource,
    triggerGaugeId: raw.triggerGaugeId ?? tr.triggerGaugeId, held: false,
    lastKnownState: known ? raw.state : tr.lastKnownState, lastKnownAt: known ? now : tr.lastKnownAt };
}
/** C §18.8 T7 note: CLOSURE_LIFTED stays on the next states until they reach no_rise. */
export function step(tr: Tracker, raw: RawState, now: number, ctx: StepCtx): Tracker {
  const next = stepCore(tr, raw, now, ctx);
  const lifted = tr.reasons.find((r) => r.code === 'CLOSURE_LIFTED');
  if (lifted && (next.state === 'watch' || next.state === 'avoid') && !next.reasons.some((r) => r.code === 'CLOSURE_LIFTED'))
    return { ...next, reasons: [lifted, ...next.reasons] };
  return next;
}
function stepCore(tr: Tracker, raw: RawState, now: number, ctx: StepCtx): Tracker {
  if (raw.state === 'unknown' || (tr.closedSource === 'official' && tr.state === 'closed' && !ctx.officialFresh)) {   // T1
    const wasKnown = tr.state !== 'unknown';
    return { ...tr, state: 'unknown', since: wasKnown ? now : tr.since, calmTicks: 0,
      lastKnownState: wasKnown ? tr.state : tr.lastKnownState, lastKnownAt: wasKnown ? now : tr.lastKnownAt,
      window: null, held: false, reasons: raw.reasons.length ? raw.reasons : [{ code: 'DATA_STALE', source: ctx.officialSource ?? 'official', last_obs_at: null }] };
  }
  if (tr.state === 'unknown') {
    const lk = tr.lastKnownState;
    if (lk && DOWN[lk] && RANK[raw.state] < RANK[lk]) {                     // T2 — resume one level below the last known state
      const nxt = maxState(raw.state, DOWN[lk]!);
      return { ...tr, state: nxt, since: now, calmTicks: 0, held: true, window: null, closedSource: null,
        reasons: [{ code: 'HOLDING', since: now, held_state: nxt }, ...raw.reasons], lastKnownState: nxt, lastKnownAt: now };
    }
    return enter(tr, raw, now);                                             // T3
  }
  if (RANK[raw.state] > RANK[tr.state]) return enter(tr, raw, now);         // T4 escalate immediately
  if (raw.state === tr.state)                                               // T5 refresh
    return { ...tr, calmTicks: 0, window: raw.window, reasons: raw.reasons, held: false,
      triggerGaugeId: raw.triggerGaugeId ?? tr.triggerGaugeId, lastKnownState: raw.state, lastKnownAt: now };
  const calm = tr.calmTicks + 1;                                            // T6 hold
  if (calm >= (DWELL[tr.state] ?? 1) && ctx.extraOk(tr)) {                  // T7 one level down
    const nxt = maxState(raw.state, DOWN[tr.state]!);
    const lifted: Reason[] = tr.state === 'closed' && tr.closedSource === 'official' && ctx.liftedAt != null
      ? [{ code: 'CLOSURE_LIFTED', source: ctx.officialSource ?? 'official', at: ctx.liftedAt }] : [];
    const holding: Reason[] = RANK[nxt] > RANK[raw.state] ? [{ code: 'HOLDING', since: now, held_state: nxt }] : [];   // spec gap fix:
    const t7 = enter(tr, { state: nxt, window: nxt === raw.state ? raw.window : null,                                  // a stepped-down
      reasons: [...lifted, ...holding, ...raw.reasons], triggerGaugeId: raw.triggerGaugeId, closedSource: null }, now);  // WATCH above a
    return holding.length ? { ...t7, held: true } : t7;                                                                  // no_rise raw needs a reason
  }
  return { ...tr, calmTicks: calm, held: true, window: null,
    reasons: [{ code: 'HOLDING', since: tr.since, held_state: tr.state }, ...raw.reasons] };
}
```

### 23.3 Worked example: Williamson Creek at Jones Road, 7:00 AM (`flash-flood-night`, simMin 70) [Verified: ran]

| Step | Value |
|---|---|
| Newest delivered reading at 08158922 | observed 6:50 AM (simMin 60), delivered 7:00 AM (10-min delay): **S = 7.14 ft** |
| Rise over the last 30 min | 7.14 − 2.67 = **+4.47 ft** → shown "+4.5 ft" |
| Trigger / watch stage | 6.0 ft / 4.4 ft |
| Trigger up-crossing (linear, between 6:35 AM 4.72 ft and 6:50 AM 7.14 ft) | **6:42.9 AM** (simMin 52.9) |
| τ median / P25 / P75 (authored) | 40 / 33 / 44 min |
| `etaMid = 40 − (70 − 52.9)` | **22.9 min** |
| `etaLo = 22.9 − (40 − 33)` · `etaHi = 22.9 + (44 − 40)` | **15.9 · 26.9** |
| `toWindow(15.9, 26.9)` | **[15, 30]** → "Avoid · likely flooded within 15–30 min" |
| Travel range `tauRange` | 15·floor(33/15)=30 … 15·ceil(44/15)=45 → "water usually takes **30–45 min**" |
| Truth (results only) | Water over the road at 7:30 AM: 30 min after the warning, inside [15, 30] |
| At 6:45 AM (simMin 55) | S = 4.72 ft ≥ 4.4 watch, rise +2.61 > 0.2 → **Watch** (no window) |
| At 7:05 AM | etaLo 10.9 → window [0, 30] → `headline_now` "water may already be on the road" (never "0–30 min") |

### 23.4 Reasons → words — `i18n/reasons.ts` and the pure translator `i18n/tr.ts`

- Reasons are **objects**: code + numbers. Rendering happens on the phone from `reason.*` keys.
- **Spec-gap fix [Verified: ran].** C §18.5 keeps AVOID while the trigger gauge is above trigger but already falling. The bank template would then print "+-0.4 ft" (Jimmy Clay, 8:00 AM). When `rise_ft_30m ≤ 0`, `reasonText()` uses the new key `reason.UPSTREAM_ABOVE_TRIGGER_peaked` instead (keys in §27.4).
- `tr()` reads the **same** `src/locales/{en,es}.json` that i18next uses, so there is one copy source. Screens keep using react-i18next's `t()`. `tr()` exists for pure builders (notifications, drive speech plan) and for tests.

**Full file: `05-code/mobile/src/demo/i18n/tr.ts`** (1.7 KB):

```ts
export type Lang = 'en' | 'es';
export const DICT: Record<Lang, Record<string, string>>;   // flattened src/locales/{en,es}.json (dotted keys)
export function tr(lang: Lang, key: string, vars?: Record<string, string | number>): string;
// i18next-compatible {{var}} interpolation; `count` selects _one/_many/_other via Intl.PluralRules ('intl-pluralrules' on Hermes);
// THROWS on a missing key or variable — the §28 copy tests prove every key the demo uses exists in both languages.
```

**Full file: `05-code/mobile/src/demo/i18n/reasons.ts`** (2.6 KB):

```ts
export type ReasonCtx = { gaugeName: (gaugeId: string, spoken: boolean) => string; stormTime: (simMin: number) => string;
  ageText: (minutes: number) => string; simNow: number };
export function reasonText(lang: Lang, r: Reason, c: ReasonCtx, spoken?: boolean): string;
// UPSTREAM_ABOVE_TRIGGER → rise_ft_30m > 0 ? reason.UPSTREAM_ABOVE_TRIGGER : reason.UPSTREAM_ABOVE_TRIGGER_peaked
// OFFICIAL_* source 'demo_official' → demo.source.road_crew; DATA_STALE → _gauge (with age) or _source; spoken → `${key}_spoken`
```

### 23.5 The travel-time learner — `engine/travel-time.ts` (★; [SHOULD-SHOW] in How it works)

`estimateLag()` cross-correlates the smoothed, clipped first differences of the upstream and downstream series. It takes the peak lag with parabolic refinement and rejects r < 0.5. `combineStorms()` gives the median and P25/P75 across storms.

- **Synthetic check:** on 6 simulated storms with true lags 34–46 min, it recovered every lag within ±0.4 min (r ≥ 0.988), giving τ 40.7 (P25 38.3, P75 43.5). [Verified: ran]
- **Honest wording** for `settings/how-it-works`: "In the full app, travel time is learned from past storms by cross-correlation. In this demo, link values are set by hand; the learning code is included and tested on simulated storms."
- **Reference only (★).** The listing below is what produced the synthetic check. In the app, `travel-time.ts` is the student's file (§1.8 #3): the agent writes the tests and the skeleton (§23.6), never this code. Nothing in `compile.ts` imports the learner, so the UI never waits on it.

```ts
// mobile/src/demo/engine/travel-time.ts — TS port of C §18.3 estimate_lag + combine_storms (student-owned ★).
export type LagEstimate = { lagMin: number; r: number; stormId: string };
const diffSmoothClip = (x: number[]) => { const d = x.map((v, i) => (i ? v - x[i - 1]! : 0));
  return d.map((_, i) => { const a = d[i - 1], c = d[i + 1]; const w = [a, d[i], c].filter((v): v is number => v != null); return Math.max(0, w.reduce((s, v) => s + v, 0) / w.length); }); };
function corr(a: number[], b: number[]) { const n = a.length; const ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n;
  let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { const x = a[i]! - ma, y = b[i]! - mb; sab += x * y; saa += x * x; sbb += y * y; }
  return saa === 0 || sbb === 0 ? NaN : sab / Math.sqrt(saa * sbb); }
export function estimateLag(up: number[], down: number[], stormId: string, stepMin = 5, maxLagMin = 240, minR = 0.5): LagEstimate | null {
  const du = diffSmoothClip(up), dd = diffSmoothClip(down); const K = Math.floor(maxLagMin / stepMin); const r: number[] = [];
  for (let k = 0; k <= K; k++) r.push(corr(du.slice(0, du.length - k), dd.slice(k)));
  let ks = -1; for (let k = 0; k <= K; k++) if (!Number.isNaN(r[k]!) && (ks < 0 || r[k]! > r[ks]!)) ks = k;
  if (ks < 0 || r[ks]! < minR) return null;
  let kh = ks; const rm = r[ks - 1], r0 = r[ks]!, rp = r[ks + 1];
  if (rm != null && rp != null && !Number.isNaN(rm) && !Number.isNaN(rp)) { const den = rm - 2 * r0 + rp; if (den < 0) kh = ks + (0.5 * (rm - rp)) / den; }
  return { lagMin: kh * stepMin, r: r0, stormId };
}
export function combineStorms(es: LagEstimate[]) {
  if (!es.length) return null; const q = (p: number) => { const s = es.map((e) => e.lagMin).sort((a, b) => a - b); const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo]! + (s[hi]! - s[lo]!) * (i - lo); };
  return { lagMin: q(0.5), lagP25Min: q(0.25), lagP75Min: q(0.75), nStorms: es.length };
}
```

### 23.6 The ★ split, skeletons and golden mode (Day 2; binding with §1.8)

**Split table.** In the app, the reference `engine/engine.ts` becomes seven files plus a barrel:

| App file | Symbols (from the §23.2 reference) | Written by |
|---|---|---|
| `engine/features.ts` | `latest`, `valueAt`, `rise`, `lastUpcrossingTime`, `isFresh` | 🤖 port as-is |
| `engine/windows.ts` | `BUCKETS`, `HORIZON_MIN`, `bucketIndex` (private), `toWindow` | 🤖 port as-is |
| `engine/explain.ts` | `tauRange` | 🤖 port as-is |
| `engine/combine.ts` | `crossingIsStale`, `isFreshOfficial`, `resolveRawState` (imports `isFresh`, `latest` from `./features`) | 🤖 port as-is |
| `engine/baseline-rule.ts` ★ | `evaluate` (+ any private helpers the student wants) | 🧑 (🤖 skeleton only) |
| `engine/state-machine.ts` ★ | contract: `DWELL`, `DOWN`, `initialTracker`, `StepCtx` (🤖 puts these four in the skeleton, they are C §18.8's table); logic: `step` (+ private helpers) | 🧑 |
| `engine/travel-time.ts` ★ | `LagEstimate` type (🤖); `estimateLag`, `combineStorms` | 🧑 |
| `engine/engine.ts` | barrel (below), so `compile.ts`, `player.ts` and the tests keep importing `../engine/engine` unchanged | 🤖 |

```ts
// mobile/src/demo/engine/engine.ts — barrel only (§23.6): keeps every `from '../engine/engine'` import working after the split.
export * from './features';
export * from './windows';
export * from './explain';
export * from './combine';
export * from './baseline-rule';
export * from './state-machine';
```

**Skeleton shape** (§1.8 step 2 adds the JSDoc contract and one worked example; no logic):

```ts
// mobile/src/demo/engine/baseline-rule.ts ★ — student-owned (§1.8 #1). Contract: §23.1 step 2; worked example: §23.3.
import type { Crossing, Gauge, Link, Reading, RuleResult } from './types';
export function evaluate(c: Crossing, links: Link[], series: Map<string, Reading[]>, gauges: Map<string, Gauge>,
  asOf: number): RuleResult {
  throw new Error('TODO(student)');
}
```

- `state-machine.ts`: the four contract exports, then `export function step(tr: Tracker, raw: RawState, now: number, ctx: StepCtx): Tracker { throw new Error('TODO(student)'); }`.
- `travel-time.ts`: `export function estimateLag(up: number[], down: number[], stormId: string, stepMin = 5, maxLagMin = 240, minR = 0.5): LagEstimate | null` and `export function combineStorms(es: LagEstimate[]): { lagMin: number; lagP25Min: number; lagP75Min: number; nStorms: number } | null`, both `throw new Error('TODO(student)')`.
- Unused skeleton parameters are fine for `tsc`: the template's `expo/tsconfig.base` has no `noUnused*` flags [Verified: expo@57.0.30]. ESLint may warn until the student fills them in.
- [Verified: ran 2026-10-16. Split + skeletons + golden `source.ts`: `tsc` clean (strict, `noUncheckedIndexedAccess`, tests included). Split + the reference ★ code: 35/35 pass.]

**Golden fixtures — `scenario/golden.ts`** (pure; permanent; full listing, identical to `05-code/`):

```ts
// mobile/src/demo/scenario/golden.ts — golden fixtures `fordcast.golden.v1` (01 §1.8, §23.6): one compiled timeline as plain
// JSON (Maps → entry arrays; the stage functions are rebuilt from the scenario). Pure. toGolden() is used by
// tools/gen-golden.ts and demo-golden-test; fromGolden() by source.ts while ENGINE_MODE is 'golden'.
import { GAUGES } from '../data/demo-data';
import type { DemoEvent, Reading } from '../engine/types';
import { buildStageFns } from '../sim/sim';
import { eventsHash } from './choreography';
import type { Compiled } from './compile';
import type { DemoScenarioV1 } from './schema';

export type GoldenV1 = {
  schema: 'fordcast.golden.v1'; scenarioId: string; eventsHash: string;
  readings: [string, Reading[]][]; initial: [string, DemoEvent][]; events: DemoEvent[];
  onsets: [string, number | null][]; leads: Compiled['leads']; hero: Compiled['hero']; medianLead: number | null;
};
export function toGolden(c: Compiled): GoldenV1 {
  return { schema: 'fordcast.golden.v1', scenarioId: c.scenario.id, eventsHash: eventsHash(c),
    readings: [...c.readings], initial: [...c.initial], events: c.events, onsets: [...c.onsets],
    leads: c.leads, hero: c.hero, medianLead: c.medianLead };
}
export function fromGolden(s: DemoScenarioV1, g: GoldenV1): Compiled {
  if (g.schema !== 'fordcast.golden.v1' || g.scenarioId !== s.id) throw new Error(`golden fixture mismatch for ${s.id}`);
  return { scenario: s, readings: new Map(g.readings), fns: buildStageFns(GAUGES, s.curves), initial: new Map(g.initial),
    events: g.events, onsets: new Map(g.onsets), leads: g.leads, hero: g.hero, medianLead: g.medianLead };
}
```

**`scenario/source.ts`, GOLDEN form** (Day 2 → Day 6 gate). The JSON imports work because `expo/tsconfig.base` sets `resolveJsonModule` and Metro bundles JSON. [Verified: `tsc` + jest with the four fixtures]

```ts
// mobile/src/demo/scenario/source.ts — GOLDEN form (Day 2 → Day 6 gate; §23.6). The app gets every Compiled from here.
// Serves the reference timelines written by tools/gen-golden.ts, so the UI never waits for the ★ files.
// At the Day 6 gate: replace this whole file with the LIVE form (§23.6) and keep the fixtures for demo-golden-test only.
import calmEvening from '../__fixtures__/calm-evening.compiled.json';
import driveCommute from '../__fixtures__/drive-commute.compiled.json';
import flashFloodNight from '../__fixtures__/flash-flood-night.compiled.json';
import onionCreekStorm from '../__fixtures__/onion-creek-storm.compiled.json';
import type { Compiled } from './compile';
import { fromGolden, type GoldenV1 } from './golden';
import type { DemoScenarioV1 } from './schema';

export const ENGINE_MODE: 'golden' | 'live' = 'golden';
const GOLDEN: Record<string, GoldenV1> = {
  'calm-evening': calmEvening as unknown as GoldenV1, 'flash-flood-night': flashFloodNight as unknown as GoldenV1,
  'onion-creek-storm': onionCreekStorm as unknown as GoldenV1, 'drive-commute': driveCommute as unknown as GoldenV1,
};
export function compiledFor(s: DemoScenarioV1): Compiled {
  const g = GOLDEN[s.id]; if (!g) throw new Error(`no golden fixture for ${s.id}: run tools/gen-golden.ts`);
  return fromGolden(s, g);
}
```

**`scenario/source.ts`, LIVE form** (from the Day 6 gate; this is the file in `05-code/`):

```ts
// mobile/src/demo/scenario/source.ts — the ONLY place the app gets a Compiled from (01 §1.8, §23.6). This is the LIVE form
// (from the Day 6 gate on): the student's on-device engine. Until the gate, use the GOLDEN form listed in §23.6.
import { compileScenario, type Compiled } from './compile';
import type { DemoScenarioV1 } from './schema';

export const ENGINE_MODE: 'golden' | 'live' = 'live';
export const compiledFor = (s: DemoScenarioV1): Compiled => compileScenario(s);
```

**`tools/gen-golden.ts`** (repo root; copy of `05-code/tools/gen-golden.ts`). `tsx` 4.23.15 was published 2026-09-20 [Verified: npm view tsx time]. It writes ≈ 220 KB of JSON in total. [Verified: ran from a repo-shaped layout; output hashes = the ones in this file's header]

```ts
// tools/gen-golden.ts — writes the golden fixtures (01 §1.8, §23.6). Run from the REPO ROOT on Day 2:
//   npx --yes tsx@4.23.15 tools/gen-golden.ts             → reference engine (docs/demo-prompt/05-code; same events as research/proto/)
//   npx --yes tsx@4.23.15 tools/gen-golden.ts --from=app  → the app's own engine; ONLY after the Day 6 gate, ONLY with a reason
//                                                           written first in docs/decisions/golden-changes.md (stop-and-ask, 01 §1.7)
// Output: mobile/src/demo/__fixtures__/<scenario>.compiled.json + golden-hashes.json. Never imported by the app.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

async function main() {
  if (!existsSync('mobile/package.json')) throw new Error('run from the repo root');
  const fromApp = process.argv.includes('--from=app');
  const root = resolve(fromApp ? 'mobile/src/demo' : 'docs/demo-prompt/05-code/mobile/src/demo');
  const { compileScenario } = await import(join(root, 'scenario/compile'));
  const { SCENARIOS } = await import(join(root, 'scenario/scenarios'));
  const { toGolden } = await import(join(root, 'scenario/golden'));
  const out = resolve('mobile/src/demo/__fixtures__'); mkdirSync(out, { recursive: true });
  const hashes: Record<string, string> = {};
  for (const s of SCENARIOS) {
    const g = toGolden(compileScenario(s)); hashes[s.id] = g.eventsHash;
    writeFileSync(join(out, `${s.id}.compiled.json`), JSON.stringify(g) + '\n');
  }
  writeFileSync(join(out, 'golden-hashes.json'), JSON.stringify(hashes, null, 2) + '\n');
  console.log(`golden (${fromApp ? 'app engine' : 'reference engine'}):`, hashes);
}
main().catch((e) => { console.error(e); process.exit(1); });
```

**Test status by phase** [Verified: ran both phases, 2026-10-16]:

| Suite | Golden mode (Day 2 → gate), ★ files = skeletons | Live (gate →) |
|---|---|---|
| `demo-display`, `demo-player`, `demo-scenarios` (17 tests; they read `compiledFor()`) | **green**: `npm run test:ui` | green |
| `demo-engine`: window, τ-range and truth-isolation tests (3) | green | green |
| `demo-engine`: compile-based tests + compile budget (8) | red with `TODO(student)` | green |
| `demo-golden`: fixtures exist, round trip, no-fixture-import (3) | green | green |
| `demo-golden`: live engine = golden (4) | red with `TODO(student)` | green |
| ★ unit tests (§1.8; the agent writes them at each pause) | red until that ★ file passes | green |

- Add the script `"test:ui": "jest src/__tests__/demo-display src/__tests__/demo-player src/__tests__/demo-scenarios"`.
- §6's "all Jest suites green" on Days 2–5 means: green **except** tests failing with `TODO(student)`.

**Day 6 gate (Tue Oct 20; 🤖 MUST, in this order):**
1. All ★ unit tests, `demo-engine-test` and `demo-golden-test` pass with the student's files.
2. Replace `source.ts` with the LIVE form. Fixture imports are now gone from app code, and `demo-golden-test` enforces that from here on.
3. Check the Director status line: `events …` equals `golden-hashes.json` for every scenario.
4. If a golden test fails: show the student the first differing event (the deep-equality diff), explain it, and let the student decide whether their code or the reference is wrong.
   - A regenerated golden needs a written reason in `docs/decisions/golden-changes.md` **first**, then `tools/gen-golden.ts --from=app`.
   - It's a stop-and-ask (§1.7 #7, #12) whenever a video number or time would change.

**Done when (§23):**
- The non-★ engine is ported per §23.6; the three ★ files are the student's own work (with `AI_USE.md` rows), and their tests, `demo-engine-test` and `demo-golden-test` pass.
- `source.ts` is in its LIVE form, and no app file imports `__fixtures__/` (Day 6 gate).
- `docs/explain/{baseline-rule,state-machine,travel-time}.md` hold the student's answers (§1.8's three per file, plus the five above).
- The hero crossing sheet at 7:00 AM shows exactly the §23.3 numbers: "+4.5 ft", "30–45 min", "15–30 min".
- No screen, label or speech ever shows a single-number travel time.

---

## §24. Demo Director panel & clean-recording mode

The **Demo Director** is a presenter-only control panel. It ships in **Release** and is never shown on camera, but it must still meet the design spec, because judges may open it.

### 24.1 Ways to open it (route `demo`, formSheet detents [0.5, 1.0], grabber)

1. **0.8 s long-press on the FreshnessPill / scenario pill** (Map Home top band), with a `selectionAsync` haptic.
2. **Triple-tap the FordCast logo** in Settings → About.
3. **Long-press the gear** → native context menu → "Demo Director".

None of these has a visible affordance. All of them work in clean recording mode.

### 24.2 Layout (top to bottom; native row heights; transport buttons 76 pt)

```
┌──────────────────────────────────────────────┐
│                    ───                       │ grabber
│ Demo Director                     [Reset]    │ title.md · Reset = secondary (never red)
│ SCENARIO                                     │
│ ◉ Calm evening                               │ 56 pt radio rows; subtitle = computed beats:
│ ○ Flash flood night · warned 30 min early    │   from storyResults(); never typed
│ ○ Big Onion Creek storm (simulated) · 35 min │
│ ○ Drive to school (simulated)                │
│ TAKES                                        │ chips, wrap; tap = loadTake() (§24.3)
│ [T01 Calm][T02 Rising][T03 Player][T04 Result][T05 One clock][T06 Lock screen]
│ [T07 Sheet][T08 Detour][T09 Drive EN][T10 Drive ES][T11 Unknown]  [O1][O2][O3][O4]
│ caption: "T05 · 7:02 AM · atx-37 AVOID 15–30 · Map Home"   ← from TAKES[].expect (hidden in clean mode)
│ TRANSPORT                                    │
│ [|◀ beat] [−5] [ ▶ / ❚❚ ] [+5] [beat ▶|]     │ 76 pt; beats = beatMinutes()
│ |━━▲━━◆━━━━●━▧━━━━━━━━━━━━━━━━━━━━━━━━━━|    │ scrubber, ticks from scrubberTicks(hero)
│ Storm time 7:00 AM          (1×)(10×)(30×)(•60×)(120×) │
│ Auto-slow at beats                    [● on] │
│ SIMULATE                                     │
│ Simulated offline                     [ off] │ → setOffline(); 20 min later every crossing is UNKNOWN
│ Fire notification now                    ›   │ → postNow() for the subscribed crossing's current plan entry
│ Lock-screen take (8 s)                   ›   │ → armLockScreenTake() (§25.3)
│ Lockout                       (Auto ▾ | Off) │
│ Voice                       (App ▾ | EN | ES)│
│ RECORDING                                    │
│ Clean recording mode                  [ off] │ → setCleanMode()
│ Show touches                          [ off] │ → TouchOverlay
│ Haptics                               [● on] │
│ STATUS (hidden in clean mode)                │
│ events 471e80be · compile 9 ms · built Oct 22 · rebuild by Oct 29 │
└──────────────────────────────────────────────┘
```

### 24.3 Controls → actions (🤖 MUST wire exactly these)

| Control | Calls | Side effects |
|---|---|---|
| Scenario radio | `useDemo.getState().selectScenario(id)` | New clock (paused at `playFromMin`, auto-slow windows from beats); clears the offline override, armed take, fired IDs and lockout. |
| **Reset** | `directorReset()` (`director/actions.ts`) | `Speech.stop()` → `cancelAllScheduledNotificationsAsync()` + `dismissAllNotificationsAsync()` → `resetState()` (pause, seek to `playFromMin`, clear override/arm/fired, lockout Auto). Also clear the demo Alerts inbox (§18 owns the inbox store). |
| Take chip | `loadTake(take, lang, navigate)` | Reset → select scenario → `resolveKeyframe` → seek → speed → arm (T06 schedules the 8 s notification) → `router.push(TAKE_ROUTES[id])`. |
| ▶ / ❚❚ · ±5 · beat ◀▶ | `play()` / `pause()` / `step(±5)` / `seek(prev/next beatMinutes)` | Scrub: `uiHaptic('select')` per 15 sim-min crossed. |
| Speed chips | `setSpeed(s)` | — |
| Auto-slow | `setAutoSlow(on)` | — |
| Simulated offline | `setOffline(on)` | The real tile network is untouched (tiles stay cached). |
| Fire notification now | `fireCurrentNow(lang, tick)` (`notify/adapter.ts`) | Re-posts the latest planned notification at or before now. If there is none, a neutral toast `director.no_alert` "No alert at this storm time". |
| Lock-screen take | `armLockScreenTake(lang)` | Seeks to beat − 1, pauses, schedules `TIME_INTERVAL` 8 s, arms. |
| Lockout / Voice / Haptics | `setToggle('lockout' \| 'voiceLang' \| 'haptics', v)` | — |
| Clean recording mode | `setCleanMode(on)` | `activateKeepAwakeAsync('demo')` / `deactivateKeepAwake('demo')`; hides captions, status line, toasts; dev overlays are absent in Release anyway. |
| Show touches | `setToggle('touches', v)` | The root layout wraps the app in `<TouchOverlay enabled={touches}>`. |

`director/actions.ts` and `director/TouchOverlay.tsx` are in `05-code/` (type-checked).
- **TouchOverlay** observes touches in the responder **capture** phase and returns `false`, so every touch still reaches the app. It draws a 44 pt ring (2 pt `#F2F5FA` @ 0.9, fill @ 0.18), 80 ms in, 300 ms fade.
- VERIFY BEFORE USE on the device: map pans, native tab bar and formSheets. Taps on system UI (notifications, Face ID) can't be shown. Add tap markers in the editor for those (§30).

### 24.4 Takes as data — `scenario/takes.ts`

Each take names:
- a scenario
- a keyframe (resolved from events)
- a speed
- a screen and a gesture
- the states that **must** be on screen

§28's take test re-checks every one, so a retuned storm can't break a shot silently.

**Full file: `05-code/mobile/src/demo/scenario/takes.ts`** (6.5 KB). Types, plus two entries verbatim:

```ts
export type Expect = { crossingId: string; state: Wire; window?: [number, number] | null; lastKnown?: Wire };
export type Take = {
  id: string; beat: string; scenario: string; at: KeyframeAt; speed: 1 | 10 | 30 | 60 | 120 | 'paused';
  runForMin?: number;                 // sim-minutes the take plays (player takes); absent = a still/interaction take
  drive?: { fromS: number; toS: number; lang: 'en' | 'es' };
  screen: string; gesture: string; expect: Expect[]; notes?: string;
};
export const TAKES: Take[];           // T01–T11 + O1–O4 (table below)
// e.g.
{ id: 'T06-lockscreen', beat: '1:25 lock screen', scenario: 'flash-flood-night', at: { kind: 'event', crossingId: 'atx-37', state: 'avoid', offsetMin: -1 }, speed: 'paused',
  screen: 'iOS Lock Screen → notification', gesture: 'Director "Lock-screen take" → press side button → wait 8 s → tap notification → Face ID',
  expect: [{ crossingId: 'atx-37', state: 'watch' }], notes: 'notification announces the AVOID at the next tick; the tap seeks to it' },
{ id: 'T11-unknown', beat: '2:10 honesty insert', scenario: 'onion-creek-storm', at: { kind: 'event', crossingId: 'tc-1626', state: 'unknown' }, speed: 'paused',
  screen: 'storm/[onion-creek-storm] player, Bluff Springs selected', gesture: 'none',
  expect: [{ crossingId: 'tc-1626', state: 'unknown', lastKnown: 'avoid' }, { crossingId: 'tc-68', state: 'avoid' }] },
```

Take keyframes (`at`):

| Take | `at` | Speed |
|---|---|---|
| T01 | `{min 30}` | paused |
| T02 | `{event atx-37 watch +3}` | paused |
| T03 | `{event atx-37 watch −10}` | 60, runs 60 sim-min |
| T04 | `{event atx-37 closed +5}` | paused |
| T05 | `{event atx-37 avoid +2}` | paused |
| T06 | `{event atx-37 avoid −1}` | paused |
| T07 | `{event atx-37 avoid}` | paused |
| T08 | `{event atx-37 avoid +1}` | paused |
| T09 | `{min 68.9}` | 1, drive 56–80 s EN |
| T10 | `{min 68.9}` | 1, drive 60–76 s ES |
| T11 | `{event tc-1626 unknown}` | paused |
| O1 | `{event atx-37 closed}` | paused |
| O2 | `{event atx-692 closed}` | paused |
| O3 | `{min 68.9}` | 1, drive 0–15 s |
| O4 | `{onset tc-68 +5}` | paused |

**Resolved takes** (engine output, [Verified: ran]; `*` = held):

| Take | Scenario | Storm time | Non-calm crossings on screen at that moment |
|---|---|---|---|
| T01 calm | calm-evening | 8:00 PM | none (tier C ◌ not monitored) |
| T02 rising | flash-flood-night | 6:48 AM | atx-37 ▲ |
| T03 player | flash-flood-night | 6:35 AM → plays 60 sim-min | none at start; ▲ 6:45 → ◆ 7:00 → ● 7:30 |
| T04 results | flash-flood-night | 7:55 AM | atx-37 ▧ · atx-680 ◆ 0–15 · atx-692 ◆ 0–15 · atx-32 ◆ 30–90 · atx-120 ▲ · atx-31 ▲ |
| T05 one clock | flash-flood-night | 7:02 AM | atx-37 ◆ 15–30 · atx-680 ▲ · atx-692 ▲ · atx-32 ▲ |
| T06 lock screen | flash-flood-night | 6:59 AM (paused) → 7:00 AM on tap | atx-37 ▲ → ◆ 15–30 |
| T07 sheet | flash-flood-night | 7:00 AM | atx-37 ◆ 15–30 (+3 ▲) |
| T08 detour | flash-flood-night | 7:01 AM | atx-37 ◆ 15–30 · atx-692 ▲ |
| T09 / T10 drive | drive-commute | 6:58 AM + 56–80 s (EN) / 60–76 s (ES) | atx-37 ▲ → ◆ at 66 s |
| T11 unknown | onion-creek-storm | 5:50 AM | tc-1626 ◌ (last known Avoid · 50 min) · tc-68 ◆ 0–15 · bud-1117 ◆ 0–15 · hays-663 ◆* |
| O1 closed | flash-flood-night | 7:50 AM | atx-37 ▧ OFFICIAL (Simulated road crew) |
| O2 sensor | flash-flood-night | 8:15 AM | atx-692 ▧ "Water over road" (sensor) |
| O3 lockout | drive-commute | 6:58 AM + 9 s | lockout dialog over search |
| O4 onion result | onion-creek-storm | 5:09 AM | tc-68 ◆ · results 35 min |

### 24.5 Clean recording mode (what changes)

| Element | Normal | Clean |
|---|---|---|
| Director captions, status line, toasts | visible | hidden |
| Screen auto-lock | system | kept awake (`activateKeepAwakeAsync('demo')`, expo-keep-awake 57.0.2 [Verified]) |
| In-app time | storm time | storm time (minute-floored; never seconds, never wall time) |
| Honesty labels (DEMO chip, SIMULATED pill, violet frame, notification subtitle) | visible | **visible (never hidden)** |
| Status-bar clock | real | cleaned by the capture path (QuickTime 9:41, §30) |

### 24.6 Status line (hidden in clean mode)

| Item | Source |
|---|---|
| `events a1b2c3d4` | `eventsHash(getCompiled(id))`. Identical on every take and device for a given build: determinism at a glance. |
| `compile N ms` | `compileMs.get(id)`, measured once per scenario in `getCompiled()` (`store/demo-store.ts`). |
| `built …` / `rebuild by …` | `extra: { builtAt: new Date().toISOString() }` in `app.config.ts` (already in the §9.4 listing; evaluated at prebuild/build). The app reads it via `Constants.expoConfig?.extra?.builtAt`. "Rebuild by" = builtAt + 7 days. [Unverified that profile issuance equals build time; it's a reminder, not a guarantee (§11.4)] |

**Done when (§24):**
- All three entry points open the Director in a Release build.
- Every take chip lands on its screen showing the §24.4 states.
- Reset leaves no scheduled or delivered notification and no speech.
- Clean mode hides only presenter UI, never honesty labels.
- The touch overlay shows taps on map, tabs and sheets, or the fallback is recorded in `verifications.md`.

---

## §25. Local notifications, Drive Mode voice, simulated drive

### 25.1 Notification policy (A §3.8 adapted to the demo; `planNotifications()` in §22.9)

- Notify only **subscribed** crossings. Hero: `atx-37`, on the saved Home → School route.
- Escalation to AVOID or CLOSED always notifies. WATCH notifies only if `watchAlerts`, which is **off**, matching the full build's default.
- **Limits:** ≤ 1 per crossing per level per 60 min; ≤ 3 per hour.
- **De-escalation:** one passive `update` when an escalated crossing reaches `no_rise`. Step-downs (CLOSED → AVOID → WATCH) send nothing.
- **Hero output:** `7:00 AM avoid atx-37`, `7:50 AM closed atx-37`. [Verified: test]

### 25.2 Content — `notify/content.ts`

| Field | 7:00 AM Avoid (EN) | (ES) |
|---|---|---|
| title (≤ 50) | Avoid Williamson Creek at Jones Road | Evite Williamson Creek at Jones Road (name never translated) |
| subtitle | **Simulated storm · demo data** | **Tormenta simulada · datos de demostración** |
| body (≤ 150) | Likely flooded within 15–30 min. Use another route. Never drive into water. | Probablemente inundado en 15–30 min. Use otra ruta. Nunca maneje en el agua. |
| interruptionLevel | `active` (no time-sensitive or critical on a free team) | same |
| data | `{ type:'risk', demo:true, scenario, simMin:70, crossing_id, state, window, url:'fordcast://crossing/atx-37' }` | same |

The 7:50 AM Closed body is "Simulated road crew reports it closed. Turn around, don't drown." All lengths are test-enforced in both languages.

```ts
// mobile/src/demo/notify/content.ts — LOCAL notifications only (expo-notifications 57; no push, no aps-environment).
// Pure builders. The side-effect adapter (scheduleNotificationAsync etc.) is notify/adapter.ts (§25.3).
import { CROSSINGS } from '../data/demo-data';
import type { PlannedNotification } from '../scenario/choreography';
import type { Compiled } from '../scenario/compile';
import { tr as t, type Lang } from '../i18n/tr';

export type DemoNotificationContent = {
  title: string; subtitle: string; body: string; sound: 'default';
  interruptionLevel: 'active' | 'passive';                     // never timeSensitive/critical on a Personal Team (§10)
  data: { type: 'risk' | 'update'; demo: true; scenario: string; simMin: number; crossing_id: string; state: string;
          window: [number, number] | null; url: string };
};
const sourceLabel = (lang: Lang) => t(lang, 'demo.source.road_crew');
export function buildContent(cmp: Compiled, p: PlannedNotification, lang: Lang): DemoNotificationContent {
  const c = CROSSINGS.find((x) => x.id === p.crossingId)!; const name = c.name;   // display name verbatim (never translated)
  const ev = cmp.events.find((e) => e.crossingId === p.crossingId && e.t === p.t)!;
  const sensor = ev.reasons[0]?.code === 'WATER_AT_ROAD';
  const [lo, hi] = p.window ?? [0, 0]; const now = p.state === 'avoid' && (!p.window || lo === 0);
  const title = p.kind === 'update' ? t(lang, 'update.deescalate.push_title', { name }) : t(lang, `state.${p.state}.push_title`, { name });
  const body = p.kind === 'update' ? t(lang, 'update.deescalate.push_body')
    : p.state === 'avoid' ? (now ? t(lang, 'state.avoid.push_body_now') : t(lang, 'state.avoid.push_body', { lo, hi }))
    : p.state === 'watch' ? (p.window ? t(lang, 'state.watch.push_body', { lo, hi }) : t(lang, 'state.watch.push_body_nowindow'))
    : p.state === 'closed' ? (sensor ? t(lang, 'state.closed.body_sensor') : t(lang, 'state.closed.push_body', { source: sourceLabel(lang) }))
    : '';
  return { title, subtitle: t(lang, 'demo.notify.subtitle'), body, sound: 'default',
    interruptionLevel: p.kind === 'update' ? 'passive' : 'active',
    data: { type: p.kind, demo: true, scenario: cmp.scenario.id, simMin: p.t, crossing_id: p.crossingId, state: p.state, window: p.window,
            url: `fordcast://crossing/${p.crossingId}` } };
}
/** Stable id → re-arming a take replaces the pending request instead of stacking duplicates. */
export const requestId = (scenarioId: string, p: PlannedNotification) => `demo:${scenarioId}:${p.crossingId}:${p.state}:${p.t}`;

/**
 * Lock-screen take: JS is suspended while the phone is locked, so the OS must deliver the notification.
 * The Director seeks to just before the beat, pauses, and schedules a TIME_INTERVAL notification `leadS` seconds out.
 * Tapping it opens fordcast://crossing/<id>; the response listener seeks the clock to data.simMin, so the sheet that opens
 * shows exactly the state the notification announced.
 */
export function lockScreenTake(cmp: Compiled, p: PlannedNotification, lang: Lang, leadS = 8) {
  return {
    seekToMin: p.t - 1, pause: true,
    request: { identifier: requestId(cmp.scenario.id, p), content: buildContent(cmp, p, lang),
               trigger: { type: 'timeInterval' as const, seconds: leadS, repeats: false } },
    onResponse: { seekToMin: p.t, route: `/crossing/${p.crossingId}` },
  };
}
```

### 25.3 The adapter — `notify/adapter.ts` (the only file that calls expo-notifications)

All APIs below exist in expo-notifications 57.0.23 [Verified: `.d.ts`]:
- `setNotificationHandler` (`shouldShowBanner/List/PlaySound/SetBadge`)
- `getPermissionsAsync` / `requestPermissionsAsync({ ios: { allowAlert, allowSound, allowBadge } })`
- `scheduleNotificationAsync({ identifier, content: { title, subtitle, body, sound, interruptionLevel, data }, trigger })` with `trigger: null` (immediate) or `{ type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats }`
- `getLastNotificationResponse()` (sync; the `…Async` form is deprecated)
- `clearLastNotificationResponse()`
- `addNotificationResponseReceivedListener`
- `cancelAllScheduledNotificationsAsync`, `dismissAllNotificationsAsync`

**Never** call `getExpoPushTokenAsync`/`getDevicePushTokenAsync` (§9.1).

```ts
// mobile/src/demo/notify/adapter.ts — the ONLY file that calls expo-notifications (57.0.23). Local notifications only:
// no push token is ever requested (a free Personal Team has no aps-environment, §10).
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { getCompiled, useDemo } from '../store/demo-store';
import { useTick } from '../store/hooks';
import { planNotifications, type PlannedNotification } from '../scenario/choreography';
import { buildContent, lockScreenTake, requestId, type DemoNotificationContent } from './content';
import type { Lang } from '../i18n/tr';

let driveModeActive = false;
/** Drive Mode screen calls this on focus/blur: while driving, the HUD + voice carry the alert, so no foreground banner. */
export const setDriveModeActive = (v: boolean) => { driveModeActive = v; };
/** Call once at startup (root layout), before any permission prompt. Foreground banners stay visible (iOS),
 *  except in Drive Mode, where the alert still lands in Notification Center (shouldShowList) without covering the HUD. */
export function setupDemoNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: !driveModeActive, shouldShowList: true,
      shouldPlaySound: !driveModeActive, shouldSetBadge: false }),
  });
}
/** Ask only in context (primer screen, §18 permission/notifications). Returns true when granted. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const cur = await Notifications.getPermissionsAsync(); if (cur.granted) return true;
  const r = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return r.granted;
}
const input = (c: DemoNotificationContent): Notifications.NotificationContentInput => ({
  title: c.title, subtitle: c.subtitle, body: c.body, sound: c.sound, interruptionLevel: c.interruptionLevel,
  data: { ...c.data },
});
/** Post a planned notification now (foreground playback and Director "Fire notification now"). */
export async function postNow(p: PlannedNotification, lang: Lang): Promise<void> {
  const st = useDemo.getState(); const cmp = getCompiled(st.scenarioId); const id = requestId(cmp.scenario.id, p);
  if (st.firedIds.includes(id)) return;                                        // ≤ 1 per take
  st.markFired(id);
  await Notifications.scheduleNotificationAsync({ identifier: id, content: input(buildContent(cmp, p, lang)), trigger: null });
}
/** Director "Fire notification now": the latest planned notification at or before the current tick (false if none). */
export async function fireCurrentNow(lang: Lang, tick: number): Promise<boolean> {
  const st = useDemo.getState(); const plan = planNotifications(getCompiled(st.scenarioId)).filter((p) => p.t <= tick);
  const p = plan[plan.length - 1]; if (!p) return false;
  const id = requestId(st.scenarioId, p);
  if (st.firedIds.includes(id)) useDemo.setState({ firedIds: st.firedIds.filter((x) => x !== id) });   // explicit re-fire
  await postNow(p, lang); return true;
}
/** Foreground playback: fires each planned notification when the PLAYING clock crosses its tick (never on a seek). */
export function useNotificationPlayback(lang: Lang): void {
  const tick = useTick(); const last = useRef(tick);
  useEffect(() => {
    const prev = last.current; last.current = tick;
    const st = useDemo.getState();
    if (!st.clock.playing || tick <= prev || tick - prev > 10) return;         // seek or rewind → nothing fires
    for (const p of planNotifications(getCompiled(st.scenarioId)))
      if (p.t > prev && p.t <= tick) void postNow(p, lang);
  }, [tick, lang]);
}
/** Director → "Lock-screen take (8 s)" (§24.3, T06). JS is suspended while locked, so the OS must fire it. */
export async function armLockScreenTake(lang: Lang, leadS = 8): Promise<boolean> {
  const st = useDemo.getState(); const cmp = getCompiled(st.scenarioId);
  const p = planNotifications(cmp).find((x) => x.kind === 'risk' && x.state === 'avoid'); if (!p) return false;
  const take = lockScreenTake(cmp, p, lang, leadS);
  st.seek(take.seekToMin); st.pause();
  await Notifications.scheduleNotificationAsync({
    identifier: take.request.identifier,                                       // stable id → re-arming replaces, never stacks
    content: input(take.request.content),
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: leadS, repeats: false },
  });
  st.arm({ notificationId: take.request.identifier, seekToMin: take.onResponse.seekToMin, route: take.onResponse.route });
  return true;
}
/** Tap on a demo notification → seek the ONE clock to the beat it announced, pause, open the crossing sheet. */
export function useDemoNotificationResponses(navigate: (path: string) => void): void {
  useEffect(() => {
    const handled = new Set<string>();
    const route = (resp: Notifications.NotificationResponse) => {
      const req = resp.notification.request; const key = req.identifier + resp.actionIdentifier;
      if (handled.has(key)) return; handled.add(key);
      const d = req.content.data as Partial<DemoNotificationContent['data']> | undefined;
      if (d?.demo !== true || typeof d.simMin !== 'number' || !d.crossing_id || !d.scenario) return;
      const st = useDemo.getState();
      if (st.scenarioId !== d.scenario) st.selectScenario(d.scenario);
      useDemo.getState().seek(d.simMin); useDemo.getState().pause(); useDemo.getState().arm(null);
      navigate(`/crossing/${d.crossing_id}`);
      Notifications.clearLastNotificationResponse();
    };
    const lastResp = Notifications.getLastNotificationResponse(); if (lastResp) route(lastResp);   // cold start
    const sub = Notifications.addNotificationResponseReceivedListener(route);
    return () => sub.remove();
  }, [navigate]);
}
/** Director [Reset] side effect: nothing pending, nothing left in Notification Center. */
export async function resetDemoNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.dismissAllNotificationsAsync();
}
```

**Lock-screen take sequence (T06 → T07)** [MUST-SHOW]:

```
Director "Lock-screen take" ─► seek 6:59 AM, pause ─► schedule TIME_INTERVAL 8 s (id demo:flash-flood-night:atx-37:avoid:70)
🧑 press side button (phone locked; JS suspended — the OS will deliver)
+8 s  Lock Screen banner: FordCast · "Avoid Williamson Creek at Jones Road" / "Simulated storm · demo data" / body
🧑 tap → Face ID ─► response listener: data.simMin = 70 → seek(70), pause ─► router.push('/crossing/atx-37')
      sheet shows ◆ Avoid · likely flooded within 15–30 min (exactly what the banner said)
```

- **Mount points (root layout):** `setupDemoNotifications()` once; `useDemoNotificationResponses(router.push)`; `useNotificationPlayback(lang)`.
- **Drive Mode screen:** `useFocusEffect(() => { setDriveModeActive(true); return () => setDriveModeActive(false); })`. While driving, the in-app banner and its sound are suppressed (the chime + TTS + HUD carry the alert, and a banner would cover the HUD); the notification still lands in Notification Center and the Alerts inbox.
- **Inbox:** every posted demo notification also adds an Alerts-inbox row with the violet SIMULATED chip. In the Demo Edition these rows count toward the tab badge, because they're the only alerts (§18).
- **Permission:** primed in context only (first "Notify me" or the onboarding notify page, §18). Before recording, grant it outside the take.

### 25.4 Simulated drive, lockout and the speech plan — `drive/drive.ts`

**Geometry helpers are dependency-free** (haversine, `along`, 2 m-sampled `alongOf`) so the plan is testable in Node. `crossingsOnRoute()` is cached per line.
- **`fixes()`** emits the **same `Fix` shape** a GPS source would: t, lngLat, speed, heading, route, alongM.
- **`stepLockout()`** is D §30.6 verbatim: ≥ 4.5 m/s for 5 s locks; < 1 m/s for 3 min unlocks.
- **`drivePlan()`** applies D §30.5's speak trigger (≤ 300 s or ≤ 2 km ahead) and §30.7's queue:
  - priority 2 = to AVOID/CLOSED (pre-empts)
  - priority 1 = WATCH / UNKNOWN-ahead / offline
  - priority 0 = de-escalation
  - ≤ 1 line per crossing per 60 s
  - simultaneous changes merged into `drive.tts.multi_changed` + the top line
  - **calm is silent**
- **Cost:** 34 ms in bun, ≈ 180 ms JIT-less. [Verified: ran] Run it once per drive start, after the entry animation.

**Full file: `05-code/mobile/src/demo/drive/drive.ts`** (pure, 9.6 KB; the routes are draft lines until §21.5 bakes real geometry). API:

```ts
export type LngLat = [number, number];
export function dist(a: LngLat, b: LngLat): number;                      // haversine, metres
export const lengthM: (line: LngLat[]) => number;
export function along(line: LngLat[], m: number): LngLat;
export function alongOf(line: LngLat[], p: LngLat, stepM?: number): { alongM: number; offM: number };   // 2 m sampling
export const PLACES: { home: {…label {en:'Home', es:'Casa'}…}; school: {…label {en:'School', es:'Escuela'}…} };
export const ROUTES: { commute: { id; from; to; draft: true; line: LngLat[] }; detour: { … } };
export const BRANCH_ALONG_M: number;                                     // 898 m: end of the shared prefix
export function crossingsOnRoute(line: LngLat[], tolM?: number): { c: Crossing; alongM: number; offM: number }[];  // cached
export type Fix = { t: number /* ms */; lngLat: LngLat; speed: number; heading: number; route: 'commute' | 'detour'; alongM: number };
export type DriveScript = { route: 'commute' | 'detour'; startSimMin: number; cruiseMps: number; accelS: number; takeDetourAtBranch?: boolean };
export function* fixes(s: DriveScript, hz?: number): Generator<Fix>;    // linear ramp to cruise; switches to detour at BRANCH
export type LockoutState = { locked: boolean; fastSince: number | null; slowSince: number | null; passengerTrip: boolean };
export const initialLockout: () => LockoutState;
export function stepLockout(s: LockoutState, f: { t: number; speed: number | null }): LockoutState;  // D §30.6 verbatim
export type Utterance = { tS: number; simMin: number; priority: 0 | 1 | 2; chime: 'chime' | 'chime_soft' | null;
  haptic: 'error' | 'warning' | 'soft' | 'light' | null; lines: { key: string; crossingId?: string; count?: number }[] };
export function drivePlan(cmp: Compiled, s: DriveScript): { utterances: Utterance[]; lockoutAtS: number | null; endS: number;
  frames: { tS: number; route: string; ahead: { id: string; state: Wire; m: number }[] }[] };
```

**Speech queue core** (inside `drivePlan`, per 1 Hz fix):

```ts
const near = dM / Math.max(f.speed, 5) <= 300 || dM <= 2000;                 // D §30.5 trigger
// first sight of an at-risk crossing ahead → pending; a later change → pending (escalation or de-escalation)
const ready = [...pending].filter(([id]) => tS - (lastSpoke.get(id) ?? -1e9) >= 60)   // ≤ 1 per crossing per 60 s
  .map(([id, p]) => ({ id, ...p, pr: prio(p.state, p.down) })).sort((a, b) => b.pr - a.pr || RANK[b.state] - RANK[a.state]);
const lines = ready.length > 1 ? [{ key: 'drive.tts.multi_changed', count: ready.length }, { key: ttsKey(top.state, top.down), crossingId: top.id }]
  : [{ key: ttsKey(top.state, top.down), crossingId: top.id }];
```

**Live runner** (`drive/sim-drive.ts`, in `05-code/`, type-checked): `useSimulatedDrive(script, lang)`.
- It precomputes `fixes()` and `drivePlan()` in `InteractionManager.runAfterInteractions`, using the scenario network ⊕ Director offline override.
- On start: `seek(startSimMin)`, `setSpeed(1)`, `play()`.
- Every 1 s it:
  - picks fix `tS`
  - steps the lockout (unless the Director set it to Off)
  - builds the HUD's next-3-ahead list with `displayAt()`
  - plays each utterance whose `tS` has arrived

**What is spoken on camera is exactly what the test asserted.** If the Director toggles "Simulated offline" mid-drive, the plan is recomputed and already-spoken lines are skipped.

### 25.5 Voice and haptics — `voice/speak.ts`, `voice/haptics.ts`

All APIs below are [Verified: package `.d.ts`]:
- **expo-audio 57.0.5:** `setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' })`, `createAudioPlayer(source)`.
- **expo-speech 57.0.3:** `Speech.speak(text, { language, voice, rate, pitch, useApplicationAudioSession })`, `Speech.stop()`, `getAvailableVoicesAsync()` → `{ identifier, name, quality: VoiceQuality.Default | Enhanced, language }`.
- **expo-haptics 57.0.3:** `notificationAsync(Warning | Error)`, `impactAsync(Soft | Light | Medium)`, `selectionAsync()`. **Never `Success`.**

**Full file: `05-code/mobile/src/demo/voice/speak.ts`** (3.7 KB). API:

```ts
export async function prepareVoice(src: { chime: number; chimeSoft: number }): Promise<void>;
        // setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' }) + createAudioPlayer(×2)
export async function pickVoice(lang: Lang): Promise<string | undefined>;   // es-US → es-MX → es-419 → es; prefers Enhanced
export const clearVoiceCache: () => void;                                    // call on language change
export const utteranceText: (u: Utterance, lang: Lang) => string;            // tr() over u.lines with spoken crossing names
export const setMuted: (m: boolean) => void;                                 // session-only; chime + haptic still play
export async function playUtterance(u: Utterance, lang: Lang, rate?: number): Promise<void>;
        // priority 2 → Speech.stop() first; chime (or chime_soft) → haptic → wait 650/450/300 ms →
        // Speech.speak(text, { language: 'en-US'|'es-US', voice, rate: 0.95, pitch: 1, useApplicationAudioSession: true })
export async function repeatLast(rate?: number): Promise<void>;              // [Repeat] button + VoiceOver magic tap
```

**Full file: `05-code/mobile/src/demo/voice/haptics.ts`** (1.4 KB). API:

```ts
export type SafetyCue = 'watch' | 'avoid' | 'closed' | 'unknown' | 'deescalate';
export function safetyHaptic(cue: SafetyCue, nowMs?: number): boolean;
        // ≤ 1 per 1.5 s; watch → Warning · avoid/closed → Error · unknown → impact Soft · deescalate → impact Light
export function uiHaptic(kind: 'select' | 'light' | 'medium', nowMs?: number): void;
        // ≤ 1 per 60 ms and muted for 400 ms after a safety cue; both respect the Director/Settings Haptics toggle
```

**Assets:**
- `mobile/assets/sounds/chime.wav`: 0.5 s, descending minor third, 10 ms attack, peak −3 dBFS.
- `mobile/assets/sounds/chime_soft.wav`: 0.3 s, −9 dBFS.
- 🧑 makes them in GarageBand or Audacity, or uses a CC0 sound with credit in About. **VERIFY BEFORE USE:** license text saved in `docs/credits.md`.
- Drive Mode mount: `await prepareVoice({ chime: require('@/assets/sounds/chime.wav'), chimeSoft: require('@/assets/sounds/chime_soft.wav') })`.

**Moment choreography** (same frame = t 0; visual cue always paired):

| Moment | t = 0 | Then |
|---|---|---|
| Crossing → WATCH | marker pop + chip crossfade + `safetyHaptic('watch')` | Drive Mode: `chime_soft` at 0, TTS at **+450 ms** |
| Crossing → AVOID / CLOSED | marker pop + halo + AlertBanner slide + `safetyHaptic('avoid')` | Drive Mode: `chime` at 0, TTS at **+650 ms**; notification per §25.1 |
| → UNKNOWN | ring turns dashed + `safetyHaptic('unknown')` | no sound |
| De-escalation | color step + `safetyHaptic('deescalate')` | Drive Mode: "Update on…" at +300 ms |
| Water reaches road (player ●) | tick drops + `uiHaptic('light')` | count-up starts +400 ms (900 ms long); at its end `uiHaptic('medium')` |
| Drive 66 s line | red 8 pt edge glow fades in over 200 ms | chime → "2 crossings ahead changed…" → Error haptic |

**Recording rules:**
- Ring/Silent switch **off**, volume ≈ 60%.
- Download an **enhanced** en-US and es-US/es-MX voice beforehand. `pickVoice()` prefers Enhanced, and is never hard-coded. [Unverified: Settings menu path, §11.6 row 19]

**Done when (§25):**
- On the iPhone (Release):
  - T06 lands on the Lock Screen within 8–10 s, with title, subtitle and body as in §25.2.
  - Tapping it opens the Jones Rd sheet at 7:00 AM showing Avoid 15–30.
  - Foreground playback posts the 7:00 AM and 7:50 AM notifications exactly once per take.
  - T09 speaks the EN 66 s line and T10 the ES line, each with chime + haptic.
  - The detour leg is silent.
- Reset clears everything.
- `demo-scenarios-test` passes.

---

## §26. Simulated Storm Replay player

### 26.1 What it is

The Storms tab's player (`storm/[id]`, fullScreenModal; layout in 04 §18) is a **director's view of the one clock**, not a separate replay engine:
- **Play** selects the scenario and plays the global clock.
- **Closing ✕ while it plays keeps the clock running.** The BottomAccessory appears, and Map Home now shows the same storm with the violet frame. That is the "one clock" payoff shot (T05).

**Labels that are always on** [MUST-SHOW]:
- The violet banner `demo.banner` "SIMULATED STORM · demo data · not live" / "TORMENTA SIMULADA · datos de demostración · no es en vivo", on **every** frame of the player and results.
- The scenario pill "SIMULATED · 7:00 AM storm time" on other tabs.

### 26.2 Frames — `scenario/player.ts`

| Function | What it returns |
|---|---|
| `visibleSeries` | Hydrograph samples the phone had **delivered** at simMin (no lookahead; test-enforced) |
| `noDataBands` | The hatched "No data" span of a silent gauge |
| `pulseProgress` | Cyan water-pulse progress 0…1 along `creeks.json`'s reach, from the trigger up-crossing over the link's median τ |
| `scrubberTicks` | ▲ ◆ ▧ ◌ ● ⌀ ticks for the selected crossing |
| `storyResults` | Every number on the results sheet |

**Full file: `05-code/mobile/src/demo/scenario/player.ts`** (pure, 3.6 KB). API:

```ts
export const visibleSeries: (cmp: Compiled, gaugeId: string, simMin: number, lookbackMin?: number) => Reading[];  // availMin ≤ simMin
export function noDataBands(cmp: Compiled, gaugeId: string, simMin: number): { fromMin: number; toMin: number }[];
export function pulseProgress(cmp: Compiled, crossingId: string, simMin: number): number | null;
        // null until the PRIMARY gauge's delivered series is above trigger; then (simMin − tUpcross) / lagMin, clamped 0…1
export type Tick = { t: number; kind: 'watch' | 'avoid' | 'closed' | 'unknown' | 'water' | 'gap'; toMin?: number };
export function scrubberTicks(cmp: Compiled, crossingId: string): Tick[];   // non-held state changes + truth onset + gaps
export function storyResults(cmp: Compiled): null | { crossingId: string; leadMin: number; onsetMin: number; firstAlertAt: number;
  firstWindow: [number, number] | null; inFirstWindow: boolean; n: number; medianLeadMin: number | null; closureGapMin: number | null };
```

### 26.3 Map water pulse rules (MUST)

- **The pulse is animation only.** It never changes a state.
  - Crossing markers change **only** when `displayAt()` changes (engine events).
  - This supersedes the early UI note "the marker escalates 120 ms after the dot arrives": the AVOID happens when the gauge crosses its trigger, **before** the water travels. That's the whole point.
- **The ● "Water reached the road (simulated)" marker** appears at the truth onset (`scrubberTicks` `water`), with `uiHaptic('light')` and the count-up.
- **Reduce Motion:** no pulse. Show static flow arrows + caption `travel.range` "Water usually takes 30–45 min to get here" (D §33.5).
- **Limits:** ≤ 3 simultaneous pulses, newest first. Draw on a `line-gradient` source with `lineMetrics: true` (04 §17).

### 26.4 Results sheet (`storm/results`, formSheet [0.62, 1.0]) [MUST-SHOW] (T04)

| Line | Key | Value source |
|---|---|---|
| Count-up | `demo.result` "In this simulated storm, FordCast warned {{x}} min before water reached the road" | `storyResults().leadMin` (30) |
| Honesty | `demo.result_honesty` "…Median warning across the {{n}} crossings that flooded in this storm: {{m}} min." | `n` = 3, `m` = `medianLeadMin` (30) |
| Closure gap | `demo.closure_gap` "The simulated road crew closed it {{x}} min after FordCast first said Avoid." | `closureGapMin` (50). Hidden when null (Onion storm). |
| Window check | `demo.window_check_hit` / `_miss` "({{lo}}–{{hi}} min)" | `inFirstWindow`, `firstWindow` [15, 30] |
| Footer | disclaimer footer (01 §3) | — |

- **No POD/FAR/CSI** or any accuracy metric for simulated storms. Those would be fabricated metrics.
- "How accuracy will be measured" is a [NEXT] row in What's real.

### 26.5 The gauge-silent beat (T11) [MUST-SHOW]

At 5:50 AM in `onion-creek-storm`:
- the Twin Creeks gauge ring turns dashed `#7A879C` (newest visible sample older than 30 min, or a `noDataBands` span active)
- the hydrograph shows the hatched band
- Bluff Springs shows ◌ "Last known: Avoid · 50 min ago"
- the storyboard caption shows `replay.gauge_silent` with `{{gauge}}` = "Onion Ck at Twin Creeks Rd"

At 6:35 AM the delayed readings appear at once and the state steps up. Nothing is interpolated.

### 26.6 [NEXT] `toReplayV1(cmp)`

A ≈ 40-line adapter mapping `Compiled` to the full build's `fordcast.replay.v1` (D §33.2), with `assumptions.values = "simulated"` and `official_status = "simulated"`. It would let the full build's player components be reused. **Not needed for the demo**; listed as Planned.

**Done when (§26):**
- T03 plays 6:35 → 7:35 AM at 60× with auto-slow: ▲ at 6:45, ◆ "15–30" at 7:00, the pulse reaching Jones Rd, ● at 7:30, count-up to 30.
- T04 shows the four results lines with computed numbers.
- T11 shows the Unknown beat.
- ✕ during play hands the clock to Map Home without a jump.
- The violet banner is visible in every frame.
- `demo-player-test` passes.

---

## §27. Accessibility & Spanish implementation

### 27.1 Preferences and components

- **Reuse the full build's `A11yPrefsProvider` verbatim** (master `docs/master-prompt/06-D2-mobile-features-quality.md` §34.1). It gives live screen reader, Reduce Motion, Bold Text, Reduce Transparency, Darker System Colors and Grayscale.
- **Components follow D §34.2**:
  - StatusChip labels from `state.<s>.spoken_short`
  - one `accessible` group per visual unit
  - charts as `image` with a full-sentence label
  - the scrubber as `adjustable` (±5 sim-min)
  - `onMagicTap` (player = play/pause; Drive Mode = `repeatLast()`)
- **Demo-specific deltas:**

| Element | Role / props | Label (spoken key → example) |
|---|---|---|
| Scenario pill / accessory | `button`, Large Content Viewer, `maxFontSizeMultiplier` 1.3 | `demo.pill_running_spoken` → "Simulated storm. Storm time 7:00 AM. Playing." |
| DEMO chip (calm) | `text` | `demo.chip_spoken` → "Demo data" |
| Violet banner | `text`, read **first** on player/results/drive | `demo.banner_spoken` → "Simulated storm. Demo data. Not live." |
| Results count-up | `text`; announce once at the end (never during the count) | `demo.result` filled with the final number |
| Storm scrubber | `adjustable`; value = storm time + last event passed | "Storm time 7:02 AM. Avoid issued at 7:00 AM." (D §33.6 pattern; never minutes-until-flood) |
| Director rows | native controls; `accessibilityHint` on take chips | `director.take_hint` → "Loads this video take." |
| Touch overlay dots | `pointerEvents="none"`, `accessibilityElementsHidden` | — |

### 27.2 Announcements for scenario events (D §34.3 `announce()`; ≤ 1 per 10 s, merged)

| Event (from `useAllRisks()` diffs) | Announce | Level |
|---|---|---|
| Subscribed or on-route crossing → AVOID / CLOSED | `state.<s>.spoken` for that crossing | high |
| → WATCH (subscribed / on route) | yes | default |
| → UNKNOWN (gauge silent) | once per crossing per scenario | default |
| De-escalation | once | low |
| Player play / pause; water on road (●) | yes | default |
| Seek / scrub / Director actions | **never** (presenter noise) | — |

**Reduced motion:**
- The pulse becomes static arrows plus the caption.
- The count-up shows the final number at once.
- Auto-slow still applies (it's timing, not motion).

### 27.3 i18n setup and language switch

- **i18next** = master D §35.1, verbatim: `intl-pluralrules` imported first; `i18next 26.4.4`, `react-i18next 17.0.16`; settings persisted in `expo-sqlite/kv-store`.
- **Language switch** = D §35.5, minus every server step. Order: persist → `i18n.changeLanguage()` → `clearVoiceCache()` (`speak.ts`) → announce `settings.language_changed`.
- Notifications posted after the switch use the new language, because `useNotificationPlayback(lang)` re-reads `lang`.
- `tr()` (§23.4) flattens the same JSON files. Never keep a second copy of any string.

### 27.4 New keys for the Demo Edition (add to `en.json` and `es.json`, and to `es-pending-review.json` until a fluent adult approves)

The 01 §3 bank owns every other key. `05-code/mobile/src/locales/{en,es}.json` already contains the keys the engine uses, nested i18next-style.

| Key | EN | ES |
|---|---|---|
| `demo.chip` | DEMO | DEMO |
| `demo.badge` | SIMULATED | SIMULADO |
| `demo.pill_running` | SIMULATED · {{time}} storm time | SIMULADO · {{time}} hora de la tormenta |
| `demo.banner` | SIMULATED STORM · demo data · not live | TORMENTA SIMULADA · datos de demostración · no es en vivo |
| `demo.notify.subtitle` | Simulated storm · demo data | Tormenta simulada · datos de demostración |
| `demo.source.road_crew` | Simulated road crew | Cuadrilla vial simulada |
| `demo.result` | In this simulated storm, FordCast warned {{x}} min before water reached the road | En esta tormenta simulada, FordCast avisó {{x}} min antes de que el agua llegara al camino |
| `demo.result_honesty` | Simulated gauge data; the forecasting code is real and ran on this phone. Median warning across the {{n}} crossings that flooded in this storm: {{m}} min. | Datos de medidores simulados; el código de pronóstico es real y se ejecutó en este teléfono. Aviso mediano en los {{n}} cruces que se inundaron en esta tormenta: {{m}} min. |
| `demo.closure_gap` | The simulated road crew closed it {{x}} min after FordCast first said Avoid. | La cuadrilla vial simulada lo cerró {{x}} min después del primer Evite de FordCast. |
| `demo.window_check_hit` | Water arrived inside the window FordCast first showed ({{lo}}–{{hi}} min). | El agua llegó dentro del intervalo que FordCast mostró primero ({{lo}}–{{hi}} min). |
| `demo.window_check_miss` | Water arrived outside the window FordCast first showed ({{lo}}–{{hi}} min). | El agua llegó fuera del intervalo que FordCast mostró primero ({{lo}}–{{hi}} min). |
| `reason.UPSTREAM_ABOVE_TRIGGER_peaked` | {{gauge}} is above its trigger level, upstream. Water usually takes {{tau_lo}}–{{tau_hi}} min to get here. | {{gauge}} está por encima de su nivel de alerta, río arriba. El agua suele tardar {{tau_lo}}–{{tau_hi}} min en llegar aquí. |
| `reason.UPSTREAM_ABOVE_TRIGGER_peaked_spoken` | {{gauge}} is above its trigger level, upstream. Water usually takes {{tau_lo}} to {{tau_hi}} minutes to get here. | {{gauge}} está por encima de su nivel de alerta, río arriba. El agua suele tardar de {{tau_lo}} a {{tau_hi}} minutos en llegar aquí. |
| `time.min_ago_one` / `_other` (ES + `_many`) | {{count}} min ago | hace {{count}} min |
| `demo.chip_spoken` | Demo data | Datos de demostración |
| `demo.pill_running_spoken` | Simulated storm. Storm time {{time}}. | Tormenta simulada. Hora de la tormenta {{time}}. |
| `demo.banner_spoken` | Simulated storm. Demo data. Not live. | Tormenta simulada. Datos de demostración. No es en vivo. |
| `director.title` · `director.reset` · `director.take_hint` · `director.no_alert` | Demo Director · Reset · Loads this video take. · No alert at this storm time | Director de demostración · Restablecer · Carga esta toma del video. · No hay alerta a esta hora de la tormenta |

- **Storm time** is `stormTime()` (§22.7): "7:00 AM" / "7:00 a. m.". Never `Intl` relative time, and never wall time.
- **Crossing and gauge names stay in English.** TTS uses `spoken.{en,es}` from `demo-data.ts` (for example "Westgate Boulevard en Williamson Creek").

### 27.5 Spanish QA (🧑 + a fluent adult; finished by the Thu Oct 22 copy freeze, §6)

1. Flip the language: Settings, or long-press the gear → Español.
2. Walk T01–T11 in Spanish on the **SE-size Simulator** and at **XXXL** text. Nothing may truncate; buttons stack instead (§19).
3. Listen to T10 on the iPhone with the es-US enhanced voice. If the voice is missing, the app still speaks with `language: 'es-US'`, and chime + haptic + visual carry the alert.
4. The reviewer signs off every `es-pending-review.json` entry, or the remaining gaps are listed in the Claims Ledger (§31).

**Done when (§27):**
- The VoiceOver walkthrough reaches the hero crossing via the nearby list and hears "Avoid. Williamson Creek at Jones Road. Likely flooded within 15 to 30 minutes. Use another route."
- Reduce Motion removes the pulse and count-up animation without a restart.
- EN/ES key parity and the guard tests pass.
- The Spanish review is signed off or logged.

---

## §28. Testing (unit + Maestro iOS) & performance

### 28.1 Unit tests (jest-expo ~57.0.6, Jest 29; files in `mobile/src/__tests__/`)

Configure `package.json`:

```json
"jest": { "preset": "jest-expo" },
"scripts": { "test": "jest", "test:demo": "jest src/__tests__/demo-",
  "test:ui": "jest src/__tests__/demo-display src/__tests__/demo-player src/__tests__/demo-scenarios" }
```

| File (in `05-code/`) | Asserts |
|---|---|
| `demo-engine-test.ts` (listing below) | C §18.6 windows; τ range; allowed windows only; one-level de-escalation; every non-No-rise state has a reason; determinism + hash; **truth isolation**; hero beats (Watch 6:45, Avoid 7:00 [15–30], Closed 7:50, onset 7:30, lead 30 = median, all inside first window); Onion (Unknown 5:50 with last known Avoid, hero tc-68 35, tier B excluded); calm = 0 events and tier C Unknown; compile budget. Calls `compileScenario` directly, so it is red until the ★ files pass (§23.6) |
| `demo-display-test.ts` (reads `compiledFor()`) | A §3.4: online state; offline 12 min → `aging`; 25 min → UNKNOWN + last known Avoid; calm + offline → UNKNOWN without badge; gauge-silent age = last observation (60 min at 6:00 AM) |
| `demo-scenarios-test.ts` (reads `compiledFor()`) | **every take shows its promised states**; clock math (closed form, pause/seek/speed, auto-slow, "7:00 AM"/"7:00 a. m."); notification plan + content lengths + subtitle + `active`; long-name list; **EN/ES parity + banned words + countdown + spoken guards** over every locale key; reasons (`_peaked`, "Simulated road crew", every compiled reason renders in EN/ES, visual and spoken); drive (route membership, utterances `[0 s watch]`, `[66 s merged avoid]`, lockout ≤ 10 s, exact EN/ES sentences); storyboard gauge-silent line |
| `demo-player-test.ts` (reads `compiledFor()`) | no-lookahead hydrograph; beats `[55,70,85,100,115,120]` and auto-slow windows; results (30, n 3, median 30, gap 50, inside); pulse progress; ticks `watch@55, avoid@70, water@100, closed@120`; Twin Creeks no-data band |
| `demo-golden-test.ts` (§23.6) | fixtures exist for all four scenarios; **live engine = golden** (events hash + deep equality, per scenario); `fromGolden`→`toGolden` round trip is lossless; in LIVE mode no app file imports `__fixtures__/` |
| ★ unit tests (the agent writes them, §1.8) | `baseline-rule-test.ts`, `state-machine-test.ts`, `travel-time-test.ts`: the "Tests you write first" column of §1.8. The §23.3 worked example is a mandatory `baseline-rule` case: S 7.14, r30 +4.47, tCross 52.9 → etaLo 15.9, etaHi 26.9 (`toBeCloseTo(x, 1)`), window [15, 30] |

[Verified: 35 pass under jest-expo 57.0.6 + `@react-native/jest-preset` 0.86.3, 2026-10-16, after `tools/gen-golden.ts`; golden-mode split per §23.6]

- `@react-native/jest-preset@0.86.3` is a **required** peer of jest-expo 57 (§9.3 batch E). Without it Jest stops with "The React Native Jest preset that jest-expo relies on has moved to a separate package."
- The run used a plain `babel.config.js` with `presets: ['babel-preset-expo']`. The NativeWind config from §16 extends that file.

**Full files: `05-code/mobile/src/__tests__/demo-{engine,display,scenarios,player,golden}-test.ts`** (20 KB). The core hero assertion, verbatim:

```ts
test('hero beats (flash-flood-night)', () => {
  const c = compileScenario(byId('flash-flood-night')); const j = c.events.filter((e) => e.crossingId === 'atx-37');
  expect(j[0]).toMatchObject({ t: 55, state: 'watch' });
  expect(j[1]).toMatchObject({ t: 70, state: 'avoid', window: [15, 30] });
  expect(j.find((e) => e.state === 'closed')!.t).toBe(120);
  expect(c.onsets.get('atx-37')).toBe(100);
  expect(c.hero).toMatchObject({ crossingId: 'atx-37', leadMin: 30, inFirstWindow: true });
  expect(c.medianLead).toBe(30);
  expect(c.leads.every((l) => l.inFirstWindow)).toBe(true);
});
test('truth isolation: nothing in demo/engine imports the simulator', () => {
  const dir = join(__dirname, '../demo/engine');
  for (const f of readdirSync(dir)) expect(readFileSync(join(dir, f), 'utf8')).not.toMatch(/from ['"][./]*\/?sim\//);
});
```

**Also required (🤖 adds, small):**
- `no-hand-typed-numbers-test.ts`: greps `src/app/**` and `src/components/**` for the literals `'30 min'`, `'7:00'`, `'15–30'`, `'50 min'`, `'35 min'`. Each must be zero. Numbers come from the engine.
- `no-success-haptic-test.ts`: no `NotificationFeedbackType.Success` in `src/**` outside tests. The test builds the literal by concatenation (A §3.12).
- The master's `copy-banned-test.ts` and `i18n-parity-test.ts` (A §3.12, D §35.6) run over the **full** locale files.

### 28.2 Maestro E2E on the iOS **Simulator** [SHOULD]

- Maestro supports iOS **Simulators**. Real-iPhone support is unofficial as of late 2025 [Secondary: devicelab.dev, requestly.com], so run the flows on the Simulator (Debug or Release build from §11.5).
- **Install:** VERIFY BEFORE USE: the current command on maestro.mobile.dev (historically `curl -fsSL "https://get.maestro.mobile.dev" | bash`). Java is required.
- **testIDs** (stable across languages): every Director control (`director-reset`, `director-scenario-<id>`, `director-take-<id>`, `director-play`, `director-speed-<n>`), `freshness-pill`, `crossing-marker-<id>` (or the nearby row `nearby-row-<id>`), `sheet-state-<state>`, `results-number`, `demo-banner`, `drive-hud-state-<state>`, `drive-simulated-label`.

```yaml
# mobile/.maestro/demo-hero.yaml  (appId = your §9.1 bundle id)
appId: com.yourlastname2026.fordcast
---
- launchApp: { clearState: true }
- longPressOn: { id: "freshness-pill" }
- tapOn: { id: "director-take-T03-player" }
- tapOn: { id: "storm-play" }
- extendedWaitUntil: { visible: { id: "results-number" }, timeout: 120000 }
- assertVisible: { id: "demo-banner" }
- assertVisible: { text: ".*30.*" }
- takeScreenshot: demo-hero-result
```

```yaml
# mobile/.maestro/demo-unknown.yaml
appId: com.yourlastname2026.fordcast
---
- launchApp: { clearState: true }
- longPressOn: { id: "freshness-pill" }
- tapOn: { id: "director-take-T11-unknown" }
- assertVisible: { id: "sheet-state-unknown" }
- assertVisible: { id: "demo-banner" }
- takeScreenshot: demo-unknown
```

Also add `demo-drive.yaml`: T09 → wait for `drive-hud-state-avoid` (≤ 90 s) → assert `drive-simulated-label`. Run all with `maestro test .maestro`.

**Manual only** (logged in `docs/devlog.md`):
- Lock Screen notification (T06)
- speech audibility
- haptics
- touch overlay on the device

### 28.3 Performance budgets (measured on the recording iPhone, Release)

| Budget | Target | How to measure |
|---|---|---|
| Scenario compile | ≤ 150 ms each on device (bun 4–13 ms; JIT-less 6–30 ms [Verified]) | Log `performance.now()` deltas once in a Debug build. In Release, show it in the Director status line. |
| `drivePlan` | ≤ 600 ms on device (JIT-less 180 ms [Verified]) | Same. It runs behind the 400 ms Drive Mode entry fade. |
| Re-renders | Labels ≤ 1/sim-minute; risk consumers ≤ 1 per 5-min tick | React DevTools profiler (Debug) at 120×. |
| Map | 60 fps while panning, with ≤ 2 looping animations (calm: breathe + gauge ripple; storm: AVOID halo + water pulse) | Xcode Instruments → Core Animation FPS on the Release build. [Unverified tool naming on Xcode 27] |
| Cold start → Map Home interactive | ≤ 2.5 s | Stopwatch on video, 3 runs. |
| Memory | No growth over 3 full T03 plays | Xcode Debug navigator (memory gauge). |
| JS thread during 120× playback | No dropped ticks: storm time advances 2 sim-min per wall-second | Director status line vs a stopwatch. |

**Rules:**
- Never recompile a scenario per frame.
- Never call `displayAt` per marker per frame. Use `useAllRisks()` once per tick and feed MapLibre one GeoJSON `FeatureCollection`.
- Pause all loops when the screen is blurred.

### 28.4 Day-by-day device checks (ties into §6 and §33)

| When | Check |
|---|---|
| Thu Oct 15 – Fri Oct 16 (Day 1 gate) | §9.10 smoke test S1–S8 |
| Fri Oct 16 (Day 2) | Non-★ engine ported; `tools/gen-golden.ts` run (hashes = this file's header); `source.ts` GOLDEN; `npm run test:ui` green; ★ #1 prep |
| Sat Oct 17 – Mon Oct 19 (Days 3–5) | Hero table (§22.6b) reproduced via the Director on golden data; T01–T05 on the Simulator/device (Debug); ★ pauses #1–#3 |
| Tue Oct 20 (Day 6 gate) | `source.ts` LIVE; `demo-golden-test` green; on the iPhone: T06 → T07 Lock Screen works, T08 detour |
| Wed Oct 21 (Day 7, feature freeze 18:00 CT) | All takes T01–T11 load from the Director on the iPhone; T09/T10 speak; `npm run test:demo` green; `eventsHash` per scenario written in `docs/decisions/verifications.md` |
| Thu Oct 22 (Day 8, copy freeze 18:00 CT) | Spanish review done; full take rehearsal with clean mode + touches; **evening: fresh Release install** (§11.4); Reset → `eventsHash` matches the Oct 21 values |
| Fri Oct 23 (Day 9) | Recording (06 §30). Before the first take: Reset → `eventsHash` matches again |

**Done when (§28):**
- `npm run test:demo` is green under jest-expo.
- The two extra guard tests exist and pass.
- The Maestro flows pass on the Simulator, or are logged as skipped with a reason.
- Every budget row is measured on the recording iPhone, with the numbers in `docs/decisions/verifications.md`.
- `eventsHash` on recording day equals the value recorded at the feature freeze (and `golden-hashes.json`, unless a recorded golden change says otherwise).
