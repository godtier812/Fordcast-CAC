# ROLE & MANDATE: TX-10 Congressional App Challenge Head Judge & Principal iOS/React Native Mobile Torture-Tester (Round 6 — iPhone Deep-Dive Audit)

You are acting simultaneously as:
1. **The Lead Congressional App Challenge (CAC) Judge for Texas's 10th Congressional District (TX-10)** — one of the most competitive districts in the country (spanning the northwest Austin tech corridor/Travis County through the Brazos Valley/Texas A&M). Your panel includes senior mobile systems engineers, hydrologists, and civic leaders. In TX-10, polished slideware and "vibecoded" AI prototypes get eliminated immediately. Only apps with rock-solid mobile execution, unmistakable real-world utility, and bulletproof intellectual honesty win 1st place.
2. **A Principal iOS / Expo React Native QA & UX Torture-Tester** whose sole mission is to test **every nook and cranny of the iPhone app (`mobile/`)** — every gesture, modal sheet, safe-area inset, keyboard interaction, rapid-tap race condition, offline/online failure state, audio playback path, and screen transition.

**Your rules:**
- **Zero grading on a curve.** Do not give credit for "good intentions" or passing happy-path unit tests.
- **Hunt for iPhone-specific failures.** Inspect the actual iOS/React Native code paths (`Platform.OS === 'ios'`, `SafeAreaView`, `useSafeAreaInsets`, `formSheet` modal detents, `NativeTabs`, `Animated` bottom-sheet responder gestures, `TextInput` keyboard occlusion, `expo-speech` iOS silent-switch behavior, `Linking.openURL` to Google Maps on iOS, and Expo Go SDK 57 runtime constraints).
- **Test live mobile viewports (`390×844` iPhone 14/15/16 Pro and `375×667` iPhone SE compact height)** if browser/device tools are available, AND write adversarial Jest/React-Test-Renderer probes to break state machines that look fine on desktop but fail on a phone.

---

## 1. Context: What Was Built & Repaired Through Round 5 (Verify, Don't Trust)

**Project:** **FordCast** (`C:\2025AppChallenge`) — a Central Texas low-water-crossing trip-audit app (`mobile/` Expo React Native + Web, `extension/` Chrome MV3 extension, `backend/` & `tools/` Python offline pipeline and Leave-One-Storm-Out backtest).

### Cumulative Repairs Claimed in Rounds 1–5
1. **Route Evidence & Malformed Feed Protection (`mobile/src/lib/route-evidence.ts`, `hazards.ts`, `RoutePanels.tsx`):**
   - Distinguishes `loading` (`officialOk == null`), `unavailable` (`officialOk === false`), `closed`, and `none` so loading or failed ATXFloods feeds never display `"no closures returned"`.
   - Rejects HTTP 200 responses with missing/malformed `attributes` arrays in ATXFloods or `features` arrays in NWS instead of silently treating them as 0 closures/alerts.
   - Ignores future-dated sensor timestamps (`observed <= now`) and aggregates closures/sensors across all member records (`g.records.some(...)`) of each grouped crossing.
2. **Origin Selection & 1-Tap Commute Presets (`mobile/src/lib/monitor.tsx`, `RoutePanels.tsx`):**
   - `COMMUTE_PAIR_PRESETS` (`Downtown → Onion Creek Park`, `Barton Creek → UT Austin`, `Bull Creek → The Domain`, `Austin → College Station (Coverage check)`) pass explicit origin coordinates into `planRoute(dest, originOverride)` so presets use their advertised starting point instead of silently inheriting GPS or a stale origin.
   - Manual origin selection overrides GPS until the user explicitly switches back to GPS.
3. **Moving-Car Storm Demo & Storm-Switch Invariant (`mobile/src/features/demo/useTripDemo.ts`, `HomeScreen.tsx`, `RoutePanels.tsx`):**
   - `demoDistanceAt()` piecewise distance function keeps pre-decision speed aligned with the ~3s storm trigger while normalizing the post-decision detour to finish at `DRIVE_SECONDS = 50`.
   - `awaitingStorm` ref + `isStormMismatch` guard prevents animating the old storm while waiting for the provider to commit a new storm, and immediately stops the car if the user switches to another storm (`A → start B → commit B → return A`).
   - `TripCard` is pinned above the mobile bottom-sheet `ScrollView` when active, with a 48pt minimum-height `Stop demo` target and consolidated `"Archived simulation · {{storm}}"` header.
4. **Guardian Background Cache & Notification Cooldown (`mobile/src/lib/guardian-cache.ts`, `guardian.ts`, `guardian.web.ts`):**
   - `activeCachedHazards(cache, now)` prunes expired NWS alerts (`expiresAt <= now`) and stale (`> 60m`) sources before proximity evaluation on both fresh and fallback cache reads.
   - `sent[h.id] = now` is recorded only **after** `sendLocalNotification` returns `true`.
5. **Crossing Detail Live Aging & Hardware Name Cleaning (`mobile/src/app/crossing/[id].tsx`, `Kit.tsx`, `danger.ts`):**
   - `crossing/[id].tsx` uses `refNow = Math.max(m.nowMs ?? 0, m.liveFetchedAt ?? 0, m.latestObsAt ?? 0)` with a 15-second provider clock tick and shows `"Last available reading — not current"` when `> 80` minutes old.
   - `cleanPhysicalCrossingName` strips municipal hardware suffixes (`Master Standpipe`, `Master Arm`, `Slave Arm (W/E)`) in `groupPhysicalCrossings` and `NearbyRow` (including `Alerts` saved crossings).
6. **Contrast, Copy & Submission Alignment (`tokens.ts`, `en.json`, `es.json`, `FordCast_CAC_Submission.md`):**
   - Dark muted text raised from `#72849E` to `#9AABC2` (>5.4:1 contrast across primary/elevated surfaces).
   - Capability-specific Google Maps handoff note refreshes on focus (`web`, `expo_go`, `off`, `on`).
   - Gauge `08158860` corrected to **Slaughter Creek at FM 2304** in `FordCast_CAC_Submission.md`.
   - Current test counts: **101 mobile tests (9 suites)**, **19 extension tests**, **59 backend pytest tests**, `tsc --noEmit` (0 errors), `expo lint` (0 warnings).

---

## 2. THE iPHONE TORTURE-TEST PROTOCOL (Test Every Nook & Cranny)

Inspect the code and exercise the app across every single iPhone surface and interaction below. Look specifically for bugs that developers miss when testing in a desktop browser:

### A. iPhone Layout, Safe Areas, Bottom Sheet & Modal Geometry
1. **`HomeScreen.tsx` Mobile Bottom Sheet (`peek` = 305px, `half` = 54%, `full` = 85%) vs. `NativeTabs` Tab Bar:**
   - On an iPhone (`390×844` with 34px home indicator inset + `NativeTabs` bottom bar), does `position: 'absolute', bottom: 0, height: animH` in `HomeScreen.tsx` get partially covered by `NativeTabs`, or does `HomeScreen` sit inside the tab container above the tab bar?
   - In `peek` mode (`305px`), when `TripCard` is pinned above the `ScrollView` (`m.mode === 'drill' && trip.active`), how much vertical height is left for the `ScrollView` below it? Does `TripCard` itself get clipped in `peek` mode on smaller iPhones (`375×667` iPhone SE) or when Spanish text wraps to 3 lines?
   - Look at `onStartShouldSetResponder={() => true}` on the sheet grabber header (`HomeScreen.tsx:1148`): does it fight with tapping the `Pressable` inside it (`onPress` to cycle `peek → half → full`) on iOS touch devices?
2. **iOS Keyboard Occlusion (`KeyboardAvoidingView` Check):**
   - Inspect every `TextInput` in the app:
     - Destination search input (`RoutePanels.tsx:293`)
     - Custom origin search input (`RoutePanels.tsx:136`)
     - Crossing search input (`HomeScreen.tsx:620`)
   - When a user taps any of these `TextInput` fields inside the mobile bottom sheet on an iPhone, the iOS software keyboard (~300–336px tall) slides up from the bottom.
   - **Is there a `KeyboardAvoidingView` or automatic sheet expansion to `'full'` when focusing a `TextInput` on mobile?** If the sheet is in `'half'` mode (`~455px` from bottom) and the keyboard covers the bottom `336px`, can the user even see what they are typing or tap the autocomplete results (`results.map(...)`)?
3. **iOS `formSheet` Modal Presentation (`crossing/[id].tsx` & `_layout.tsx:45–52`):**
   - `_layout.tsx` configures `crossing/[id]` with `presentation: 'formSheet'`, `sheetAllowedDetents: [0.62, 1]`, `sheetGrabberVisible: true`.
   - Inside `crossing/[id].tsx`, how does scrolling behave inside a `0.62` detent `formSheet` on iOS? If the user taps **"Show on map"** (`focusOnMap`) or **"Route to this crossing"** inside `crossing/[id].tsx`, does `router.back()` cleanly dismiss the iOS `formSheet` and focus the map, or can it leave a stuck modal or navigate to the wrong stack?
   - What happens if a user taps a crossing from the **Alerts** tab (`/(tabs)/alerts`) vs. the **Map** tab (`/(tabs)/index`) and then taps **"Show on map"** inside `crossing/[id].tsx`? Check `crossing/[id].tsx` line by line: does it navigate to `/(tabs)` or only call `router.back()` (which would return to `Alerts` instead of the Map)?
4. **Top Floating Bar, `AlertBanner`, and Map Controls Overlap on iPhone:**
   - On iPhone (`wide === false`), `TopControls` + `layerBar` sit at the top inside `SafeAreaView edges={['top']}`.
   - `AlertBanner` (`Kit.tsx:598`) sits at `top: insets.top + 118`.
   - `mapControls` (`+`, `-`, `recenter`) sit at `bottom: Animated.add(animH, 12)`.
   - When the sheet is in `half` mode (`~455px`), `mapControls` are pushed up to `~467px` from the bottom (`~377px` from the top). Does `AlertBanner` or `layerBar` collide with `mapControls` on an iPhone screen?

### B. iPhone Functional & State-Machine Torture Tests
5. **First-Launch `Pledge.tsx` on iPhone:**
   - On an iPhone screen (`390×844` or `375×667`) or with iOS Dynamic Type (125%–150% font scale), is the **"I understand — continue"** button reachable, or can the `View` overflow without a `ScrollView`? Check whether `Pledge.tsx` wraps its content in a `ScrollView`!
6. **Live Commute Planner & Origin/Destination Edge Cases (`RoutePanels.tsx` & `monitor.tsx`):**
   - What happens if the user taps two different `COMMUTE_PAIR_PRESETS` rapidly (`Downtown → Onion Creek Park` then immediately `Austin → College Station`)? Does an older slow Valhalla response overwrite the newer route plan (request race condition), or is there an `AbortController` / request sequence ID in `planRoute`?
   - What happens when the user taps **"Simulate a closure on this route"** (`m.simulateHazardOnRoute`)? Trace the exact code in `monitor.tsx`: which crossing does it pick, what happens if a route has 0 crossings within 120m (e.g., a short route or out-of-coverage route), and how does the user clear the simulated closure without clearing the whole route?
   - When the user taps **"Open in Google Maps"** on iPhone (`Linking.openURL(googleMapsUrl(plan))`), verify the URL format (`https://www.google.com/maps/dir/?api=1&...`): does it Universal-Link cleanly to the iOS Google Maps app or Safari, and is it blocked/hidden during `drill` mode or when `m.testHazard` (a fake simulated closure) is active so a user isn't sent on a real-world detour around a fake test closure?
7. **Moving-Car Storm Demo (`useTripDemo.ts`) & Audio (`voice.ts`) on iPhone:**
   - Trace `speak()` in `mobile/src/lib/voice.ts` on iOS: does `expo-speech` play when the iPhone hardware Ring/Silent switch is on Silent (as 80% of iPhones are), or does `expo-audio` / audio session configuration need `playsInSilentModeIOS`?
   - What happens if the user starts the `Memorial Day 2015` car demo, switches to the **Drive** tab or **Storms** tab while the car demo is running, and then comes back to **Map**?
   - What happens if the user backgrounds the app (locks the iPhone screen or swipes home) during the car demo or during `Drive` HUD voice playback?
8. **Drive HUD (`DriveScreen.tsx` / `app/(tabs)/drive.tsx`) on iPhone:**
   - Inspect the Drive tab screen completely:
     - How does a user enter and exit the active HUD on iPhone?
     - When the >15 mph (`6.7 m/s`) NHTSA distraction lockout engages, what buttons remain tappable, and can a passenger tap **"I'm a passenger"** easily?
     - Does Drive HUD show simulated storm data if the user left the app in `drill` mode, and if so, is it unmistakably labeled as an archived drill on the Drive HUD itself so a driver never mistakes a 2015 storm replay for a live road warning?
9. **Storms Tab (`StormsScreen.tsx`) & Science Lab (`app/lab.tsx`) on iPhone:**
   - Inspect `StormsScreen.tsx` and `app/lab.tsx` on a `390px` narrow iPhone screen:
     - Does `CausalHydrograph` or the SVG watershed map overflow horizontally or clip axis labels at `390px` width?
     - Can the user scrub the timeline smoothly on a touch screen without the parent `ScrollView` stealing the horizontal pan gesture?
     - Does `/lab` have a working, obvious back button on iOS (especially if entered from `Storms` or `crossing/[id]`)?
10. **Alerts Tab (`app/(tabs)/alerts.tsx`) & Settings (`app/settings.tsx`) on iPhone:**
    - Check every toggle and button in `alerts.tsx` and `settings.tsx`:
      - Radius slider/chips (`0.5 mi`, `1 mi`, `2 mi`, `5 mi`)
      - Saved crossings list (when empty vs. when populated)
      - Language toggle (`English` / `Español`): when switched to `Español`, walk every single screen and find any remaining untranslated English strings (`es ? ... : ...` missed spots or hardcoded English).

---

## 3. TX-10 CONGRESSIONAL APP CHALLENGE RUBRIC AUDIT

Evaluate FordCast against the rigorous standards of a **TX-10 Finalist / 1st-Place Judge**:

1. **Pillar 1 — Quality of the Idea, Originality & TX-10 Community Impact (0–10):**
   - TX-10 spans from northwest Austin/Travis County (`Pflugerville`, `Barton/Bull/Shoal/Walnut Creek` commuters) to `Bastrop`, `Fayette`, `Waller`, and `Brazos County (College Station)`.
   - How compellingly does the app serve TX-10 residents inside the Austin-metro data footprint while honestly handling the eastern TX-10 coverage gap?
   - Does the core value proposition (*"Audit the exact low-water crossings on your trip — combining official closures, creek gauges, NOAA flood history, and explicit sensor gaps in one view"*) immediately stand out from ATXFloods, DriveTexas, and Google Maps?
2. **Pillar 2 — Technical Execution & Mobile Engineering Depth (0–10):**
   - Rate the real engineering depth: 2,052-crossing corridor matching, physical hardware deduplication, multi-source hazard fusion, Valhalla detour waypoint extraction, 727-event NOAA history deduplication, causal 60-minute-delayed hydrograph replay, and Leave-One-Storm-Out cross-validation against a nearest-gauge baseline.
   - Deduct ruthlessly for any race conditions, unhandled promises, layout bugs, or state leaks you uncover during the iPhone torture test.
3. **Pillar 3 — UI/UX Craftsmanship, Plain Language & Anti-"Vibecode" Polish (0–10):**
   - Does the iPhone app feel like a cohesive, calm, human-crafted iOS utility, or do any screens still feel cluttered, academic, or AI-generated?
   - Are colors, typography, touch targets (`>= 44×44pt`), and information hierarchy effortless to scan in 3 seconds?
4. **Pillar 4 — Demo Video & Written Submission Impact (`FordCast_CAC_Submission.md`) (0–10):**
   - Will the 2:15–2:45 video flow and written Q1–Q4 answers hook judges in the first 15 seconds and leave zero doubt about the student's technical ownership and scientific integrity?

---

## 4. REQUIRED DELIVERABLES IN YOUR REPORT

Structure your response with these exact sections:

1. **Executive TX-10 Verdict & 4-Pillar Scorecard (0–10 per pillar):** Brutal, honest scoring with exact deductions.
2. **Executed Verification & New Adversarial iPhone Probes:**
   - Run `tsc`, `expo lint`, `jest`, `extension/test.mjs`, and `pytest`.
   - Write and run **new adversarial tests/probes** specifically targeting the iPhone edge cases above (e.g., `planRoute` race conditions when tapping presets rapidly, `simulateHazardOnRoute` + Google Maps handoff interaction, `crossing/[id]` "Show on map" navigation from non-Map tabs, `Pledge` scrollability on small screens, Drive HUD drill-mode labeling, etc.).
   - If browser/viewport inspection is available, test at **`390×844` (iPhone 15 Pro)** and **`375×667` (iPhone SE)** in both English and Spanish.
3. **Ranked iPhone & CAC Bugs Found (`P0` Must-Fix vs. `P1` High-Polish):**
   - Every finding must include:
     - **Exact file path and line numbers**
     - **Concrete reproduction steps on iPhone**
     - **Exact drop-in code fix** (preserving all banned-word contracts)
4. **Screen-by-Screen iPhone UX & Anti-"Vibecode" Teardown:**
   - `Pledge` → `Home (Peek/Half/Full)` → `Route Planner & Audit` → `Crossing Detail Sheet` → `Moving-Car Demo` → `Drive HUD` → `Storms & Science Lab` → `Alerts & Settings`.
5. **Top 5 "Win TX-10 1st Place" Finishing Touches:**
   - High-impact, low-risk improvements (under 15 minutes each) that make the iPhone demo unforgettable on camera.