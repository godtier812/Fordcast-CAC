# FordCast: Round 4 pre-shoot audit and production blueprint

Review started October 21 and completed after midnight October 22, 2026, America/Chicago. The requested filename is retained. “Shoot morning” below means the upcoming recording session, not a claim that an outdated calendar date is still tomorrow. This is a simulated judging/product review, not an official CAC decision or an award prediction.

**Decision: the code has improved substantially; the broad safety-service pitch still exceeds the evidence. Record a focused crossing-on-my-trip demonstration, with an unmistakable archived reroute excerpt and an honest scientific result. Do not film the current build as fully verified or promise background protection in Expo Go.**

Product code was not modified. This report contains implementation specifications for the coding agent. New audit probes and evidence were saved separately. The executable probe copies were removed from the ignored mobile test directory after execution.

## 1. Executive CAC Readiness Scorecard (0–10 per pillar: Impact, Originality/Feasibility, UI/UX, Technical Execution, Demo Video Readiness)

These are subjective scores for this inspected prototype. UI and demo scores are provisional because fresh browser control and physical-device execution were unavailable. A successful build is not visual or device acceptance.

| Pillar | Score | Judgment and deductions |
|---|---:|---|
| Impact | **6.0** | A supported-area commuter can use a trip-specific crossing explanation. No observed target-user benefit, verified district-boundary overlay, operational partner or measured safer decision was demonstrated. An Austin radius does not establish service to all TX-10 residents. |
| Originality / Feasibility | **6.3** | Public-source integration, route audit and educational replay are feasible. General routing and official closure maps already exist. The upstream method does not beat its nearest-gauge baseline on this small study; road-level predictions remain unvalidated. |
| UI / UX | **6.5 provisional** | Better hierarchy, origin controls, grouped audit and comparator are present in source. Wrong-district onboarding, dense technical copy and unresolved state/duration behavior hurt the story. No fresh clipping, contrast, mobile Stop visibility or screen-reader acceptance is claimed. |
| Technical Execution | **7.0** | 82 mobile tests, 18 extension tests, 59 backend tests, typecheck, lint and Android JS export pass. Four of six new adversarial probes fail: two expired-warning delivery paths and two demo contracts. Detail freshness and capability disclosures still disagree with repaired paths. |
| Demo Video Readiness | **5.5** | A strong short narrative is possible, but today's “50-sec” detour can take about two minutes; storm changes can mix a prior car run with new evidence. No physical Expo Go rehearsal, fresh browser walkthrough or installed-extension cameo has been accepted. |

Arithmetic average: **6.3/10 rounded**, not comparable to the earlier three-pillar average. There is no evidence-based reason to promise first place. Fixing the camera blockers and demonstrating student understanding matters more than adding another chart tonight.

### Feasibility: what actually works today?

At **2026-10-22 05:01:49 UTC**, independent read-only requests using fixed public Austin demo coordinates returned:

| Dependency | Observed response | Limit of that evidence |
|---|---|---|
| ATXFloods closures REST endpoint | HTTP 200; six raw closure rows | Endpoint/payload reachability, not field verification or proof of browser CORS. This inspected mobile code uses REST, not a demonstrated GraphQL dependency. |
| NWS active Texas alerts | HTTP 200; two raw features | Not a claim that two flash-flood warnings were active or covered the filmed route. |
| USGS OGC continuous, parameter 00065, last three hours | HTTP 200; 755 raw features across **18 of 19 requested gauge IDs** | One requested gauge had no records in this query. Raw rows are not a guarantee of valid/fresh observations after filtering. |
| Valhalla, downtown Austin → Onion Creek Park | HTTP 200; shape and route summary, 15.011 km / 857.145 seconds | A route response does not certify the road safe, prove a closure exclusion, or guarantee Google's route matches. |
| Photon, Downtown Austin search | HTTP 200; three results | One search works; not an address-resolution guarantee. |

[Exact smoke output](C:/2025AppChallenge/docs/results/cac-round4-evidence/feed-smoke-results.json). Availability can change before recording. **None of these supports “100% operational safety service.”** The app has real working integrations, independently tested local logic and remaining acceptance gaps.

Bundled facts reproduced by the audit: **141 study records + 1,911 regional records = 2,052 records**, 727 area NOAA events from January 1996 through June 2026, and four primary links: `atx-19/20/21 → USGS-08158860`, `tc-167 → USGS-08155240`. The former three are on Onion Creek; Henry Marx is on Barton Creek. These four records are not four independent physical sites, and their source metadata still says `unverified_road_and_topology`. Use “two research corridors,” not “two field-validated crossings.” [Data summary](C:/2025AppChallenge/docs/results/cac-round4-evidence/data-summary.json).

### Originality: the honest comparison

| Alternative | Established value | Defensible FordCast contribution | Claim to remove |
|---|---|---|---|
| DriveTexas | TxDOT's mobile app provides road conditions, flood impacts, cameras and routing. | A focused local crossing audit with available gauge evidence, nearby NOAA history and explicit monitoring gaps. No head-to-head superiority test was performed. | “There is no usable integrated road-condition app,” or an unverified blanket claim that DriveTexas lacks all neighborhood/city crossing information. [TxDOT](https://www.txdot.gov/about/newsroom/statewide/download-the-new-drivetexas-app.html). |
| ATXFloods | Authoritative local closure information; Austin's Flood Early Warning System monitors rain, water levels and crossings continuously. | Present that official value in a particular trip's context, with additional evidence and route alternatives. | “Static dots” as a dismissal of an operational warning system. Absence of a native route planner was not freshly verified in its JavaScript app. [Austin Flood Safety](https://www.austintexas.gov/watershed-protection/atx-flood-safety). |
| Google Maps | General navigation and crisis-related alerts/road-closure reporting. | Explain the supported low-water crossing evidence and uncertainty for a selected trip. | “Google Maps has no flood warnings” or “FordCast controls the exact Google route.” [Google Maps Help](https://support.google.com/maps/answer/9985621?hl=en). |
| Waze | Closure reports affect routes; it also supports partner-supplied closure feeds. | An independently explained local crossing audit and a transparent research experiment. | “Waze only uses crowdsourcing” or “often routes people into floods” without a measured local comparison. [Waze closure help](https://support.google.com/waze/answer/13753511?hl=en), [partner closure feed](https://developers.google.com/waze/data-feed/road-closure-information). |
| NWS | Official weather warnings and safety guidance. | Relate available warning polygons to the inventoried crossings on a trip. | Treating a warning polygon as a measured flooded road or competing with the authority of NWS warnings. |

**Best one-sentence distinction:** “FordCast brings the crossing evidence for your trip into one understandable view: official reports, available creek readings, nearby flood history and what is still unknown.” This is a credible integration claim; it is not a verified feature-absence claim about every competitor.

The upstream-rule experiment has **4 hits, 8 misses, 1 false alarm**, versus **4 hits, 8 misses, 0 false alarms** for the nearest-gauge baseline; both have a 65-minute median **among detected proxy cases**. Do not call 65 minutes an average warning for every road, omit the misses, or claim predictive superiority. An inconclusive experiment can demonstrate good engineering judgment when it changes the product's promise.

### TX-10 and everyday applicability

The useful audience is a commuter, parent or teen driver whose regular trip uses an inventoried low-water crossing in the supported region. A driver in eastern TX-10 without covered local crossings may receive little direct benefit today. A good pilot need not serve every constituent, but it must name the people it currently serves.

Do not attach “TX-10” to an entire city, watershed or Austin-area corridor without verifying the actual points and route against the named boundary plan. Texas distinguishes the currently serving C2193 plan from C2333 for the 2026 elections. The app's `Pflugerville (TX-10)` preset is not a district overlay. [Texas Legislative Council](https://redistricting.capitol.texas.gov/Current-districts).

Do not say Central Texas “leads the nation in low-water crossing rescues”: no supporting national comparison was established. Vehicle-fatality percentages depend on dataset, period and denominator; Texas Water Development Board research presents historical figures rather than an evergreen current percentage. The short video does not need that statistic. Say “A familiar crossing can become dangerous during a storm,” then show the decision. [TWDB flood communication research](https://www.twdb.texas.gov/flood/research/flood-awareness-2022/doc/guidelines-recommendations-tools-for-flood-communication-awareness.pdf).

A real next evaluation is five target users answering: Which source is official? Does gray mean safe? Is this live or archived? What should you do if the feed is unavailable? Record actual comprehension; do not create testimonials or imply testing happened during this audit.

## 2. Round 3 + Expo Go Verification Matrix

“PASS” is limited to the stated contract. “NOT ACCEPTED” means the broader claim lacks runtime evidence, not an invented failure. Fresh browser access returned **“Local browser use is disabled in Work settings.”** No hard reload, new screenshots, viewport walkthrough or clean-console claim was possible.

| # | Claimed repair | Result | Evidence and qualification |
|---|---|---|---|
| 1 | Web Guardian module export | **PASS: source/test contract** | `C:/2025AppChallenge/mobile/src/lib/guardian.web.ts:2` re-exports the pure serializer from `guardian-cache.ts`; the direct web export regression is now in the passing suite. Old undefined-export finding is repaired. Fresh web feed interaction not executed. |
| 2 | Coverage excursion and distance weighting | **PASS: tested algorithm** | `C:/2025AppChallenge/mobile/src/lib/routing.ts:44` flags any outside endpoint/vertex/sample and weights sampled segments by length. The dense-vertices excursion regression passes. Fractions are sampled approximations inside a configured circle, not proof of inventory completeness. |
| 3 | Per-source cache and NWS expiry | **FAIL: end-to-end expiry incomplete** | Foreground decoration preserves expiry (`monitor.tsx:484`); serializer and `bySource` reconciliation exist. New actual registered-task probes show expired NWS alerts still notify via recent cache and all-source-failure fallback (`guardian.ts:243–253`). Partial refresh correctly removes the expired alert. Retention is **60 minutes**, not the attachment's two-hour claim (`guardian-cache.ts:10`). |
| 4 | Continuous live age / closure checks | **PARTIAL** | Drive and sensor panel use `nowMs`; provider ticks every **30 seconds**, not the claimed 15 (`monitor.tsx:329`). Crossing Detail still uses last fetch/observation as its clock (`crossing/[id].tsx:145`). |
| 5 | Waterway identity and NOAA dedup | **PASS: tested repaired contracts; physical identity provisional** | `danger.ts:118` preserves creek/branch identity; IDs and distance-independent fallback dedup exist. Bear Creek/Bear Branch and repeated-event regressions pass; real study grouping is tested. The 1.5 km E. William Cannon grouping override is a corridor convention, not proof of a surveyed physical crossing (`danger.ts:139`). |
| 6 | Submission/locale provenance | **PARTIAL** | Henry Marx/Barton, primary gauge links and 727/1996–2026 are corrected in `C:/2025AppChallenge/FordCast_CAC_Submission.md:56–58`. Pledge still says TX-35; native privacy/handoff claims and blanket district-corridor language remain incorrect or unsupported. |
| 7 | Unified mute | **PASS: source/helper regressions; cross-tab acceptance pending** | `monitor.tsx:102–136` synchronizes stored settings and controller; `drive.tsx:336` updates settings. Current test now checks the mocked speech engine, improving on the prior flag-only assertion. Actual cross-tab playback/device voice not exercised. |
| 8 | Notification imports avoid Expo Go root side effect | **PASS: import/export check; physical startup NOT ACCEPTED** | `notify.ts:8–16` uses local-notification submodules. Android export succeeded; searched emitted JS for the root side-effect signatures with no matches. Deep imports are tied to the pinned version and need rechecking on upgrades. Expo's SDK 57 docs distinguish local notifications from unavailable Android Expo Go remote push; an import warning alone is not proof of a native crash. [Expo Notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/). |
| 9 | MapLibre removed from runtime path | **PASS: source/Android JS export; device NOT ACCEPTED** | `MapSurface.tsx`/`NativeMap.tsx` delegate to the SVG implementation; app plugins omit MapLibre; emitted JS search found no RNMBX signatures. The dependency remains installed but no source runtime import was found. Home still uses `LiveMap.tsx` / `react-native-maps`, which Expo documents as included in Expo Go. This is not a claim every map is now SVG. [Expo Maps docs](https://docs.expo.dev/versions/v57.0.0/sdk/map-view/). |
| 10 | Expo Go Guardian detection | **PASS: source gate; device NOT ACCEPTED** | `guardian.ts:225` checks `isRunningInExpoGo`, `appOwnership` and `ExecutionEnvironment.StoreClient`; task registration is gated and Guardian reports unsupported there. The native handoff note must respect that capability. |

### Exact automated outcomes

Commands ran from `C:/2025AppChallenge` unless a mobile working directory is shown.

| Command | Result / exact summary | Saved output |
|---|---|---|
| `cd mobile; node node_modules/typescript/bin/tsc --noEmit --pretty false` | Exit 0, empty diagnostics | [typecheck](C:/2025AppChallenge/docs/results/round4-typecheck.txt) |
| `cd mobile; node node_modules/expo/bin/cli lint` | Exit 0, empty diagnostics | [lint](C:/2025AppChallenge/docs/results/round4-lint.txt) |
| `cd mobile; node node_modules/jest/bin/jest.js --runInBand --watchAll=false` | `Test Suites: 6 passed, 6 total`; `Tests: 82 passed, 82 total` | [mobile](C:/2025AppChallenge/docs/results/round4-mobile-tests.txt) |
| `node C:/2025AppChallenge/extension/test.mjs` | `18 passed` | [extension](C:/2025AppChallenge/docs/results/round4-extension-tests.txt) |
| `C:/2025AppChallenge/backend/.venv/Scripts/python.exe -m pytest C:/2025AppChallenge/backend/tests` | Initial restricted run encountered a temp/setup error and later blocked creating asyncio's internal socket pair; it was interrupted. A workspace-temp diagnostic captured the socket/AnyIO stack. This is not classified as an app test failure. | [initial](C:/2025AppChallenge/docs/results/round4-backend-tests.txt), [diagnostic](C:/2025AppChallenge/docs/results/cac-round4-evidence/backend-workspace-temp.txt) |
| Same Python suite, with workspace `--basetemp` and local socket access | **`59 passed, 1 warning in 3.28s`**. Warning: Starlette/httpx deprecation. No dependency upgrade was made tonight. | [completed backend run](C:/2025AppChallenge/docs/results/cac-round4-evidence/backend-verified.txt) |
| `cd mobile; node node_modules/expo/bin/cli export --platform android --no-bytecode --max-workers 2 --output-dir .local/round4-android-export` | Exit 0; `Exported: .local/round4-android-export`; one 6.3 MB Android JS entry | [Android export](C:/2025AppChallenge/docs/results/cac-round4-evidence/android-export.txt) |
| New Guardian probes, actual registered task with mocked location/feeds/delivery | **2 passed, 2 failed** | [source](C:/2025AppChallenge/docs/results/cac-round4-evidence/guardian-probes.test.ts), [output](C:/2025AppChallenge/docs/results/cac-round4-evidence/guardian-probe-results.txt) |
| New moving-car hook probes, real bundled route geometry and controlled clock/status | **0 passed, 2 failed** | [source](C:/2025AppChallenge/docs/results/cac-round4-evidence/demo-probes.test.tsx), [output](C:/2025AppChallenge/docs/results/cac-round4-evidence/demo-probe-results.txt) |

The backend suite covers scientific integrity/no-lookahead tests; it is not a fresh regeneration or independent field validation of every scientific artifact. Do not add 82+18+59 and call all 159 “safety tests.” Their purposes differ.

### Camera journey trace and remaining acceptance

| Screen/action | Source finding | Fresh runtime acceptance |
|---|---|---|
| First launch / three safety acknowledgments | `Pledge.tsx:33` has the wrong district; long subtitle is technical. Existing checkbox/accept gate is real. | Browser and phone blocked/not available; no visual “crisp” claim. |
| Trip origin + destination | `RoutePanels.tsx:34–52` supplies origins and destinations, not the three advertised one-tap commuter pairs. Onion Creek Park → Downtown is selectable using both controls. Barton Creek → UT and Bull Creek → Domain are not dedicated one-tap presets. | Network routing/search smoke passed; actual screen sequence unverified. |
| Route audit | `RouteCard` groups within 120 m of route geometry; nearby history uses 2 km. Those are exposure associations, not proof the route crosses an inundated road. | Counts must be read from the actual filmed take, never scripted as a fixed number. |
| Storm drill / moving car | Uses archived states and **precomputed** Valhalla geometry. Trigger is time-aligned to the decision point (`useTripDemo.ts:78`). This is not a new live detour request at the moment the car changes color. | Two hook probes fail. No T+0/15/30/45 labeled buttons were found in the existing drill control; do not script clicks on nonexistent buttons. |
| Crossing Detail | Live/archive labels and datum explanation exist; detail freshness still freezes. | Do not represent a replay chart as current or a gauge stage as road depth. |
| Drive / Alerts / Saved | One speech path, shared mute and Guardian capability UI exist; HUD explicitly describes itself as a simulation. | No audible/device/background/real-driving lockout certification. Keep the operator stationary. |
| Science Lab `/lab` | Explicit replay cockpit defaults to `atx-19`; comparator exists in Storms. | Useful optional insert, but too dense for an unprepared tour of every control. |
| Google Maps extension | Separate Valhalla route estimate, hazard check and alternative link; footer admits Google's route can differ (`C:/2025AppChallenge/extension/fordcast.js:484–550`). | 18 unit/helper tests passed; installed panel, Google DOM behavior and handoff were not exercised. |

## 3. Every Remaining Mistake or Demo Hazard (`P0` Must-Fix Tonight)

“P0” here means a pre-shoot gate, not a claim that every item is a universal production outage. This is the set found in this audit; no review can guarantee it found every defect. Fix the items that support the filmed claim, then rehearse. Do not describe an omitted capability as verified.

### P0-A — Wrong district and misleading geographic identity on the first screen

**Files/functions:** `C:/2025AppChallenge/mobile/src/features/onboarding/Pledge.tsx:33`, `Pledge`; `C:/2025AppChallenge/mobile/src/screens/home/RoutePanels.tsx:52`, `ORIGIN_PRESETS`; `C:/2025AppChallenge/FordCast_CAC_Submission.md:70–72`.

**Change:** replace the hardcoded `TX-35 / AUSTIN BASIN` badge with localized **“CENTRAL TEXAS PILOT”** / **“PILOTO DEL CENTRO DE TEXAS”**. Replace the subtitle with **“Check the crossings on your trip”** / **“Revisa los cruces de tu trayecto”**. Add keys to `en.json` and `es.json` and use `t(...)` in `Pledge`; preserve all three safety acknowledgments. Remove `(TX-10)` from the Pflugerville location label until that exact point is checked against the explicitly selected boundary plan. State TX-10 as the student's entry district in attribution, separately from coverage.

**Submission replacement:** “A Central Texas pilot built by a TX-10 student. Current coverage is centered on Austin; this is not a district-wide service.” Do not call Onion/Barton/Bull corridors TX-10 coverage without the overlay. Acceptance: first-launch screenshots in both languages contain no TX-35 or implied district-wide coverage.

### P0-B — Privacy copy promises no transmission while the app sends coordinates

**Files/functions:** `C:/2025AppChallenge/mobile/app.json:47–48` location permission descriptions; `C:/2025AppChallenge/mobile/src/locales/en.json:152`, `es.json:152`, `settings.privacy_body`; actual requests in `C:/2025AppChallenge/mobile/src/lib/routing.ts:135` (`fetchRoute`) and `:325` (`searchPlaces`).

**Replace English privacy body:** “Nearby crossing checks use your location on this device. Route planning sends start, destination and avoidance coordinates to the routing service; address search sends your query and nearby coordinates to the search provider. Opening Google Maps shares the route with Google. Saved crossings and settings stay on this device.”

**Spanish:** “La ubicación se usa en este dispositivo para buscar cruces cercanos. Al planear una ruta, se envían las coordenadas de inicio, destino y puntos que se deben evitar al servicio de rutas; la búsqueda de direcciones envía la consulta y coordenadas cercanas al proveedor de búsqueda. Al abrir Google Maps, se comparte la ruta con Google. Los cruces guardados y la configuración permanecen en este dispositivo.”

Permission strings must describe location use without “never leaves your phone”: “FordCast uses your location for nearby crossing checks. Planning routes or searching addresses sends coordinates to those service providers.” Use equivalent concise Spanish where the app exposes that text. Do not claim these edits retroactively change the currently installed Expo Go host's native permission text. Acceptance: no contradictory “never sent anywhere” claim in settings, app config, README or any linked privacy statement.

### P0-C — Expired NWS warnings still produce Guardian notifications

**Files/functions:** `C:/2025AppChallenge/mobile/src/lib/guardian.ts:243–253`, registered `GUARDIAN_TASK`; `C:/2025AppChallenge/mobile/src/lib/guardian-cache.ts`, new pure `activeCachedHazards(cache, now)`; delivery at `guardian.ts:260–269`.

**Executed counterexamples:** a two-minute-old cache containing an already expired NWS-only warning sends an alert; an eleven-minute-old cache does the same when all three refreshes fail. The successful partial-refresh test does not exercise either path. Both failed probes invoke the real callback registered with TaskManager; location, network and OS notification delivery are mocked.

**Implementation:** prune per-source evidence immediately before proximity filtering, regardless of whether refresh was attempted or succeeded. Recompute the combined hazard after pruning; do not discard a legitimate ATX closure merely because a coincident NWS warning expired. A concrete helper outline using the existing types/functions is:

```ts
export function activeCachedHazards(cache: GuardianCache | null, now: number): TaggedHazard[] {
  const active = new Map<string, TaggedHazard>();
  if (!cache) return [];
  for (const h of cache.hazards) {
    for (const src of ['atx', 'nws', 'usgs'] as const) {
      const ev = extractSourceEvidence(h, src);
      if (!ev) continue;
      const checkedAt = cache.sources?.[src]?.at ?? cache.at;
      if (!Number.isFinite(checkedAt) || checkedAt > now || now - checkedAt > RETENTION_MAX_AGE_MS) continue;
      if (src === 'nws' && ev.expiresAt != null && ev.expiresAt <= now) continue;
      upsertHazardSource(active, h, ev);
    }
  }
  return [...active.values()];
}
```

Replace `const hazards = activeCache?.hazards ?? []` with `activeCachedHazards(activeCache, now)`. Keep source check time distinct from an official closure's possibly old status-change time. Treat ambiguous legacy multi-source cache entries without isolated evidence conservatively rather than copying a closure reason into sensor evidence. Preserve the 60-minute policy unless intentionally changing and retesting it; correct documentation that says two hours.

Also move `sent[h.id] = now` **after** `sendLocalNotification` returns true. Otherwise a failed delivery is suppressed for thirty minutes as though the user received it. Add a failed-delivery/retry assertion. Required tests: recent expired NWS-only → no notification; all-source failure after expiry → none; expired NWS + valid ATX → ATX still alerts; valid cached warning within retention → alerts; successful official clearing + retained caution → no resurrected closure. Do not film Guardian protection until an installed build also passes device acceptance.

### P0-D — “50-sec Storm Demo” is not a 50-second detour

**Files/functions:** `C:/2025AppChallenge/mobile/src/features/demo/useTripDemo.ts:17,42–57`, `geo`/`rawCarKm`; `C:/2025AppChallenge/mobile/src/locales/en.json:459` and Spanish counterpart, `storms.car_demo`; `trip.body`; submission video copy.

Speed is baseline route length divided by 50, but the car later travels the longer detour at that same speed. Derived from the bundled geometry, expected total durations are about **246s Halloween 2013, 123s Memorial Day 2015, 119s Halloween 2015, 91s October 2018, 118s July 2025**, when the detour branch is taken. These are geometry-derived estimates, not timed browser observations. The real-hook probe confirms the Memorial Day run is still rerouted after 60 seconds.

**Lowest-risk change tonight:** rename the CTA **“Storm reroute demo”** / **“Demostración de desvío”**, remove the numeric duration everywhere, and replace `trip.body` with **“Archived storm states drive this illustrated trip. Watch a precomputed alternative appear when the experimental trigger changes.”** / **“Los estados de una tormenta archivada controlan este recorrido ilustrativo. Observa una alternativa precalculada cuando cambia el umbral experimental.”** Record the decisive excerpt and press Stop; no arrival shot is necessary. Replace “computes the Valhalla detour at the trigger” in narration with “shows a precomputed alternative.”

If retaining a strict 50-second claim, implement a pure `demoDistanceAt(elapsed, decisionKm, totalKm, rerouteAtSeconds)` piecewise distance function: continuous pre-decision distance, then distance-normalized remaining path finishing at second 50, with explicit handling for late trigger and no-way hold. Test continuity at the phase change, no-way stop and all five actual trip geometries before acceptance. Do not simply increase speed globally and break the three-second trigger alignment. For the rename option, test truthful UI/copy rather than retaining an obsolete forced-arrival promise.

### P0-E — Changing drill storms can retain the previous car run

**Files/functions:** `C:/2025AppChallenge/mobile/src/features/demo/useTripDemo.ts:31,115–117`, `useTripDemo`; `C:/2025AppChallenge/mobile/src/screens/HomeScreen.tsx:708`, live-mode cleanup; `C:/2025AppChallenge/mobile/src/screens/StormsScreen.tsx:196`, Run as drill.

The hook obtains status from the current monitor but keeps geometry and crossing ID from `run.trip`. Home stops the run when returning to Live; no corresponding storm-mismatch guard ends it while remaining in Drill. The executed hook probe changes the drill storm and finds the old run still active. Home hides its own drill controls during an active car run, so this is not proof that those hidden controls can be clicked. Storms exposes selection plus Run as drill against the shared provider; the cross-tab transition and screen mount lifecycle need full navigation acceptance. The missing hook invariant is executed evidence; the entire navigation sequence was not browser-reproduced.

**Change:** after defining `stop`, add an effect that ends the run when `m.drill.stormId !== run.trip.stormId`; depend on those scalar IDs and `stop`, not the whole changing context object. Retain the existing Live cleanup. When changing storms via UI, call the same stop/reset path before `startDrill`; do not clear a newly started matching run because of transient mismatched state. Acceptance: start car A → select storm B → A stops; start B → matching B continues; rapid A/B/A selection produces one run and one narration session. Add provider/UI-level coverage as well as the isolated hook regression.

### P0-F — Crossing Detail chart does not continuously age like Drive

**File/function:** `C:/2025AppChallenge/mobile/src/app/crossing/[id].tsx:145–146`, Crossing Detail's `refNow`/`isStaleLive`.

Replace its reference with:

```ts
const refNow = Math.max(m.nowMs ?? 0, m.liveFetchedAt ?? 0, m.latestObsAt ?? 0);
const isStaleLive = !drill && last != null && refNow > 0
  && refNow - last.t > LIVE_STALE_MIN * 60_000;
```

Use this same predicate for every current-value/trend display on that sheet; when stale, show **“Last available reading — not current”** / **“Última lectura disponible — no es actual”**, not an apparently current numeric value beside a small warning. Preserve dated history and explicit archived charts. Acceptance: freeze fetching, advance monitor time from 79 to 81 minutes after the reading, and verify stale presentation without another successful fetch. Use the actual 30-second provider tick in documentation or intentionally change it to 15 seconds; do not describe one as the other.

### P0-G — Native Google handoff promises monitoring in unsupported/inactive modes

**Files/functions:** `C:/2025AppChallenge/mobile/src/screens/home/RoutePanels.tsx:758–764`, `RouteCard` handoff note; `C:/2025AppChallenge/mobile/src/locales/en.json:380`, Spanish equivalent; `guardianSupported` / `guardianRunning` in Guardian adapters.

Web already explicitly warns that monitoring stops outside the tab. Native always uses `route.google_note`, which promises FordCast keeps watching, including Expo Go where Guardian is deliberately unsupported and installed builds where the user has not enabled it.

**Change:** keep a universal first sentence: **“Google Maps receives suggested waypoints and may choose a different road.”** Then render capability-specific copy: unsupported → **“Background crossing alerts are unavailable in Expo Go. Recheck official conditions before leaving.”**; supported but inactive → **“Background alerts are off. This route check does not enable them.”**; confirmed running → **“Background alerts are enabled on this device; delivery and data availability can still be delayed.”** Add equivalent Spanish keys. Query running status on focus and after an enable/disable action; do not show “enabled” from capability alone. Never autoplay a permissions flow just to record a reassuring badge.

### P0-H — Extension does not inherit the mobile route coverage gate

**Files/functions:** `C:/2025AppChallenge/extension/lib.js`, add pure `assessRouteCoverage(line)` using the documented Austin radius; `C:/2025AppChallenge/extension/fordcast.js:279`, `evaluateRoute`, and `:484–550`, `renderRoute`; `C:/2025AppChallenge/extension/test.mjs`.

Mobile's repaired `outsideCoverage` contract is absent from the extension's route result. It can display “No reported hazards on this estimated route” with zero watched crossings for an unsupported trip. The generic caveat that Valhalla differs from Google does not disclose geographic data gaps.

**Change:** calculate an explicit coverage result for `r.base.line` using the same vertex/segment and distance policy as mobile. Render an amber **“Outside the supported Austin-area inventory — this route is not fully checked. Consult DriveTexas and local authorities.”** before route results whenever incomplete. Suppress the no-hazards summary in that branch. For zero matched records inside the circle use **“No inventoried crossings matched this estimated route; this does not verify road conditions.”** Coverage of a configured circle must not imply complete roadway sensing. Tests: Austin→College Station, an internal excursion, all-inside path and zero matched records. Do not inject a fake closure into Google's live panel for the cameo.

### P0 acceptance boundary

Physical Expo Go startup, local notification, audio, map interaction and the six browser journeys remain unverified. A clean Android export and absence of known problematic symbols reduce import risk but do not replace device execution. If no fresh browser/phone rehearsal is possible, use a previously captured, explicitly dated demonstration as such; do not claim a newly verified build.

For any P0 left unresolved, remove the associated promise/shot from the recording. That can make a truthful video possible; it does not resolve the product defect. Do not attempt a new map stack, online voice provider, forecasting model, district expansion or dependency upgrade tonight.

## 4. High-Leverage 1st-Place Advancements (`P1` Implement Tonight Before Shoot)

These are four scoped presentation improvements, not a promise of an award. Estimates are rough; combined work could exceed two hours if acceptance fails. P0 repairs and rehearsal take priority. Implement only what can be tested before code freeze.

| Upgrade | Exact implementation specification | Acceptance / estimate |
|---|---|---|
| **1. One clear trip-evidence summary** | In `C:/2025AppChallenge/mobile/src/screens/home/RoutePanels.tsx`, add `RouteAuditSummary` immediately under `RouteCard`'s destination. Feed it the existing `audit.groups`, `plan`, `m.feeds`, `m.nowMs`. Show three compact rows: **“Official reports: [closed / none returned / unavailable]”**, **“Creek readings: [fresh linked groups]/[linked groups] available”**, **“Nearby history: [distinctEvents] NOAA events within 2 km.”** Use the existing per-group source evidence; a successful fetch must not mean all roads are open. Rename `with creek sensor` to `linked to creek sensors` unless freshness is being counted. Add a one-line unknown-data explanation. Keep the detailed audit under it; avoid another expanded panel. | Values from real state, never screenshot literals. At 390px and 200% text, no clipped source/status or hidden navigation action. ~20–30 min plus visual QA. |
| **2. Explain originality with evidence, not a competitor attack** | Add a collapsed `TripEvidenceExplainer` in `RoutePanels.tsx` after the summary, using new EN/ES keys. Header **“Why check crossings before leaving?”** Body **“A route line does not explain every local crossing. FordCast brings available official reports, creek readings and nearby flood history into this trip view.”** Three small text tags **“Official / Observed / Historical”** map directly to the displayed data; no fake checkmarks, “safe” badge or unsupported competitor feature matrix. Mirror the same sentence in `C:/2025AppChallenge/FordCast_CAC_Submission.md`'s originality answer. | A viewer can identify the added value in five seconds. No claim Google/Waze lack closure feeds. ~10–15 min. |
| **3. Recording controls that reset real state** | Add `C:/2025AppChallenge/mobile/src/components/fc/DemoDirectorBar.tsx`, rendered in `HomeScreen.tsx` only behind an explicit development/recording option. It must call existing actions, not fabricate statuses: **Reset take** → `trip.stop()`, `m.clearRoute()`, `m.dismissBanner()`, `m.setMode('live')`, `m.setHomeTab('route')`; **Barton archived demo** → `m.requestTripDemo('memorial-day-2015')`; **Stop** → `trip.stop()`. Guard reset while an async transition is pending, cancel old audio via existing stop path, and show mode/storm ID in the bar. Do not change a saved home address, GPS permission, pledge acceptance or voice preference implicitly. No T+15/30/45 controls unless tied to real replay timestamps. | Ten repeated Reset→Start→Stop cycles: one car, one audio session, no delayed banner from prior take, no real Google handoff during drill. Hide the bar from normal release by default. ~25–40 min; skip if this displaces P0 work. |
| **4. Keep archive and stop controls readable on camera** | In `RoutePanels.tsx:796`, `TripCard`, remove duplicate `SIMULATION · SIMULATED DRIVE` wording. Use one persistent **“ARCHIVED SIMULATION · [storm/date]”** line, sourced from the replay. Give **Stop demo** its own fixed-width 48pt-minimum target at the right; allow the storm label to wrap but never push Stop off-screen. In `HomeScreen.tsx`'s mobile sheet header, reserve a compact active-demo control row outside scrolling content if necessary. Move tier ladders, raw IDs and long interpretation notes into existing disclosures; retain them in Detail/Lab. | Fresh 390×844 and 1366×860 captures with alert banner present; Stop visible without scrolling, mode label unambiguous, no map control overlap. ~20–30 min; cannot be accepted from source order alone. |

Do not implement all of these merely because the report lists them. The correct finish is a stable core with a clear story. A nominal “demo director” overlay that manipulates undocumented state or hides errors would weaken the submission.

## 5. Second-by-Second 1st-Place CAC Demo Video Blueprint (`0:00–2:45`)

**Production premise:** a 165-second final edit with a brief archived-demo excerpt, not a claim of uninterrupted live operation. Use a stationary phone capture for the app and desktop capture for the extension. Screen recordings may be cut between sections; never disguise an archived recording as a current hazard or a mock as an official closure. No promise of an award.

Use the repaired labels above. If a P1 control is not implemented, use the existing equivalent; the table names both. The existing default recommended storm is **Memorial Day 2015**, and its car is **Henry Marx @ Barton Creek (`tc-167`)**. Do not call that Onion Creek. The expected trigger alignment is around **three seconds after start**, not at second 30. The visible route alternative is precomputed. Do not wait for the two-minute arrival.

| Timestamp | On-Screen Action | Visual Highlight | Exact Voiceover Script |
|---|---|---|---|
| **0:00–0:08** | Student on camera, parked indoors; cut at second 5 to the map with one crossing selected. No disaster stock footage. | One person, one familiar decision; title “FordCast — check crossings before leaving.” | “A familiar road can become dangerous during a storm. Before a school or family trip, which crossings should we check?” |
| **0:08–0:15** | Show the corrected pledge briefly; three acknowledgments checked in a real first-launch take, then **I understand**. Do not stretch the setup into a tutorial. | “Central Texas pilot” and “never drive into water.” | “I built FordCast, a Central Texas prototype that puts crossing evidence into the trip you're planning.” |
| **0:15–0:25** | Home → **Check my trip**. In origin selector choose **Downtown Austin**. Choose destination **Onion Creek Park**. Record the complete request, then cut to its completed result; do not hide a failure as success. | Named origin/destination and actual route line. | “Here, I'm checking downtown Austin to Onion Creek Park. The route is checked against the crossings in our local inventory.” |
| **0:25–0:37** | Hold the Route Audit summary; scroll only far enough to reveal the first named crossing group. Do not claim a preset count. | Official/source status, actual source age, unmonitored gap. | “For crossings along this route, I can inspect official reports, available creek readings and nearby flood history. Missing information stays visible; it does not mean a road is safe.” |
| **0:37–0:49** | Tap the E. William Cannon group if present on this actual route; otherwise select it from map/Storms explicitly. Show **Live** label and datum note, then the NOAA history section. | Three distinct concepts: live reading, nearby historical report, unknown road depth. | “A creek gauge measures water at its station, not depth on this road. Historical reports describe nearby events; they are not today's conditions.” |
| **0:49–0:59** | Navigate to **Storms**; select **Memorial Day 2015**. Frame its title, date and archived-USGS label. Enable the already-tested voice preference before the take, not here. | Visible switch from Live to Archived. | “Now I'll switch to a clearly labeled archived demonstration, using the May 2015 storm and Henry Marx Lane on Barton Creek.” |
| **0:59–1:02** | Tap renamed **Storm reroute demo** (old build label: **50-sec Storm Demo**) once. It returns Home. Keep follow-car on; do not pan. | Car, archived badge and Stop control. | “This moving-car trip illustrates the experimental warning rule.” |
| **1:02–1:08** | Let the actual warning and alternative appear. Do not talk over it. Capture six seconds of app audio if intelligible. If playback is unavailable, use a clearly identified narration insert in editing. | Trigger, named crossing, alternative route and simulation label. | **No narrator speech. Let the app's actual alert play; do not substitute a fabricated official warning.** |
| **1:08–1:21** | Hold the rerouted car/alternative. Briefly point to the extra-time label, without reading a pre-scripted number. Do not show arrival. | Route choice and reason are clear; no “safe route” label. | “When the archived trigger changes, the illustration shows a precomputed alternative and its added travel time. This demonstrates the workflow; it does not prove a road-flood forecast.” |
| **1:21–1:25** | Press **Stop demo**, then select **Live**. Make the mode change visible before the next cut. | Immediate stop; no lingering simulation banner/car. | “I can stop the simulation and return to current reports.” |
| **1:25–1:40** | Desktop Chrome, already-installed extension on Google Maps with the rehearsed supported Austin route. Hold **Estimated route between your stops** and the Valhalla/Google mismatch note. No installation or sign-in footage. Do not wait for an actual active closure if none intersects. | Real extension panel, source context and estimate disclosure. | “The companion extension checks an estimated route alongside Google Maps. Its routing estimate can differ from Google's, so it explains the evidence and its limits rather than certifying the trip.” |
| **1:40–1:55** | Storms → hold the **Upstream Rule vs. Nearest-Gauge Baseline** comparison. Optional two-second `/lab` hydrograph insert only if readable, then return. | Four of twelve, eight missed, one versus zero false alarms. | “I tested five archived storms. The upstream rule detected four of twelve proxy cases, missed eight and added one false alarm. It did not outperform the nearest-gauge baseline.” |
| **1:55–2:08** | Detail's evidence disclosure: zero surveyed road crossings / experimental gauge lag; then back to route coverage note. Do not zoom through raw code telemetry. | A limitation changes the product claim. | “That result is why FordCast focuses on trip awareness. Gauge research remains experimental, and no crossing here has a field-validated road-depth forecast.” |
| **2:08–2:22** | Show the already-rehearsed College Station out-of-coverage route result, or a recording clearly made from this build. Hold the amber warning and official-resource direction. | Honest TX-10 reach and an eastern coverage gap. | “I'm entering in TX-10, but today's Austin-centered pilot does not cover the whole district. A trip toward College Station shows the gap instead of treating missing crossings as reassurance.” |
| **2:22–2:34** | Student on camera; short insert of their actual code/test run or notebook they can explain. Use the completed passing-test summary, not a fake terminal animation. | Student authorship and an actual engineering decision. | “The hardest lesson was separating official reports, sensor evidence and simulation. I added checks for stale readings and coverage gaps, and I'm testing the failure cases too.” |
| **2:34–2:45** | Return to the clean named-trip overview, then end card with project name and real creator attribution. Show no unresolved placeholders. | “Check before leaving. Obey official warnings. Never drive into water.” | “FordCast helps people ask better questions before leaving. My next step is testing comprehension with local users and improving verified coverage. Never drive into water or around a barricade.” |

**Audio and script constraints:** read naturally; time the actual recording before final edit. Leave the app-audio slot quiet. The student must genuinely understand and be able to explain every first-person statement. If the prescribed stale-data repairs have not been implemented, replace “I added checks for stale readings” with “I found where stale readings still need better handling.” Do not claim field tests, users helped, lives saved, a superior baseline or municipal endorsement.

**Fallback edits:** if the extension is not rehearsed by the deadline, replace its fifteen seconds with the working mobile route audit and say “This prototype brings these checks into a single trip view.” If College Station routing fails, show the real visible routing/coverage limitation and say “The current pilot is centered on Austin; eastern district coverage is still a gap,” rather than inserting a manufactured successful result. If audio fails, keep the visible trigger and narrate what occurred; no neural-voice guarantee. Do not add a new online TTS dependency tonight.

The requested 2:45 duration fits the published 1–3 minute CAC video range. Reconfirm the actual portal's current requirements before uploading; this report does not resolve the district/national deadline discrepancy previously documented. [2026 CAC rules](https://www.congressionalappchallenge.us/wp-content/uploads/2026/05/2026-CAC-Rules.pdf).

## 6. Pre-Shoot Checklist for Tomorrow Morning

### Code freeze and acceptance

- [ ] Apply the P0 changes required by the filmed claims; re-run typecheck, lint, mobile, extension and backend suites. Preserve the adversarial counterexamples as product regressions rather than deleting evidence. Only re-run affected checks during intermediate edits; run the requested full gate once on the final build.
- [ ] Freshly inspect at 390×844 and 1366×860 after reload: pledge; GPS-off entry; trip/origin/audit; live/detail/archive; moving-car start/stop and rapid storm changes; Drive/mute/Alerts/Storms; `/lab` back navigation; installed extension. Inspect console. Current audit cannot tick these boxes.
- [ ] In the mobile peek sheet, display an alert banner while the demo runs: Stop, mode toggle and essential source context must remain visible. Check Spanish once and large text; do not assume source order proves fit.
- [ ] Record the precise build/commit or working-tree snapshot used for footage. Do not claim later edits were tested by this report. Keep placeholders out of public attribution.

### Expo Go capture

- [ ] Use the Expo Go client compatible with SDK 57. Start the existing project with its installed Expo CLI; use the already-working connection method. Do not switch SDK/map/audio stacks on shoot morning.
- [ ] Cold-open on the actual phone, not just Metro export. Check pledge → Home street map → Detail → Storms → `/lab` SVG map; exercise local notification permissions only if relevant and explicitly chosen on the device.
- [ ] Keep the phone stationary and charged. Confirm backgrounding stops simulations; do not attempt to film while actually driving. Do not claim installed-background Guardian behavior from Expo Go.
- [ ] Make one English and one Spanish voice preview, Stop, Mute and Unmute; verify one alert, no overlap or old audio after a take. Rehearse screen/audio capture with the actual phone's silent-mode and recording settings.

### Web capture

- [ ] Rehearse with fixed public demo origin; do not accidentally reveal a personal saved address, precise live location, notifications or unrelated tabs.
- [ ] Hard reload once before rehearsal; verify live feed labels and ages, actual route result and archived transitions. Avoid reloads during an active take.
- [ ] Use the correct screen scale and a consistent cursor. Pre-position the necessary pages; do not race through all screens to prove feature count. Network smoke output is a baseline, not an availability guarantee.

### Extension capture

- [ ] Confirm the extension is installed and active on `https://www.google.com/maps/...`; installation was not performed in this audit. Reload the test Maps tab after any extension reload.
- [ ] Use the rehearsed public Austin start/destination. The panel must say estimated route and disclose Valhalla/Google mismatch. Never call it interception or replacement of Google's routing.
- [ ] If no flagged crossing intersects, show the actual neutral result and the coverage caveat. Do not manufacture a live closure to obtain a dramatic panel. Use the separately labeled archived car demonstration for drama.

### Fallback and final edit

- [ ] Save a clean screen/audio rehearsal locally before the final take. A dated archived capture is an acceptable disclosed fallback; an unlabeled fabricated live result is not.
- [ ] Record narration separately if needed. Keep music below intelligible app speech and do not imply app speech played if it did not.
- [ ] Confirm final duration 2:45, readable text, distinct live/archive labels and no “safe,” “guaranteed,” district-wide, 65-minute road-warning or background-Expo-Go promises.
- [ ] Remove any shot whose required repair or runtime acceptance failed. Retain the limitation in the spoken story when material.
- [ ] Watch the complete exported video once on a phone, with sound, before upload. Verify the portal's requirements and actual creator/AI-use disclosures. No upload or external submission was performed by this audit.

**Release status:** automated suites and Android JS bundling are green; four new adversarial failures and device/browser acceptance gaps prevent full sign-off. **Recording strategy:** a narrow, rehearsed trip-audit story can still be strong. The strongest scientific moment is acknowledging what the experiment did not establish and showing how that shaped a more honest product.

