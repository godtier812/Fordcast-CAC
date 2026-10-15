# FordCast Demo Edition: UI audit and upgrade plan ("UI is perfect and fits everything")

Role: principal iOS product designer. Date: 2026-10-15. Scope: **iPhone-only Demo Edition**. Expo SDK 57 (`expo@57.0.28`, RN 0.86.3, React 19.2.3). The app runs on a real iPhone, built in Xcode with a **free Apple ID Personal Team** (7-day profile). All data is simulated on the device, and the TypeScript forecast logic (upstream gauge → learned travel time → trigger stage → risk window → state machine) runs over that simulated data.

Inputs read in full: `02-B1-design-system.md`, `03-B2-templates-screens.md`, `research/design.md`, and `01-A §4` (F1–F128). I skimmed `05-D1 §28–§29`. Package claims were checked against tarballs pulled with `npm pack` on 2026-10-15.

**Verification tags**
- `[Verified: pkg <name@ver> <file>]`: I read it in the published package source or types today.
- `[Verified: web <source>]`: confirmed by a web search result today.
- `[Verified: calc]`: arithmetic from the stated numbers.
- `[Unverified]`: hypothesis. It has to pass a device test, and a fallback is always given.

Registry facts this doc relies on [Verified: npm view, 2026-10-15]: `expo` dist-tag `sdk-57` = 57.0.30 (`latest` is now **58.0.11**, so pin SDK 57 and never run `@latest`). `expo-router` sdk-57 = 57.0.28. `expo-glass-effect` 57.0.4. `expo-symbols` 57.0.3. `@expo/ui` sdk-57 = 57.0.25. `expo-widgets` 57.0.26. `expo-haptics` 57.0.3. `expo-blur` 57.0.3. `expo-notifications` 57.0.23. In the bundled versions of `expo@57.0.28/bundledNativeModules.json`, `react-native-screens ~4.26.0` (4.26.2 is the newest patch), `react-native-reanimated 4.5.1`, `@shopify/react-native-skia 2.6.2`, `@expo/ui ~57.0.23`, `expo-router ~57.0.26`, `expo-glass-effect ~57.0.4` [Verified: pkg expo@57.0.28 bundledNativeModules.json]. The iOS minimum for the Expo modules is **16.4** [Verified: pkg expo-glass-effect@57.0.4 ios/ExpoGlassEffect.podspec; expo-widgets plugin default `deploymentTarget ?? '16.4'`].

---

## 0. Decisions (what changes for the Demo Edition)

| # | Decision | Why |
|---|---|---|
| D1 | **One global Scenario Clock (the "Demo Director") drives every screen.** Map Home, crossing sheet, Alerts inbox, local notifications, Drive Mode and the Live Activity all read the same simulated clock. The storm player is a "director's view" of that same clock. | In the video, the storm can unfold across the whole app (calm map → lock-screen alert → crossing sheet → detour → Drive Mode voice), not only inside a Replay screen. The take is deterministic and repeatable. |
| D2 | **Three-layer honest labeling** (§1.3 G1). (a) Baseline: a neutral dashed **DEMO** micro-chip inside the FreshnessPill ("DEMO · updated 2 min ago"). (b) Scenario running: a **violet SIMULATED** pill plus a 2 pt violet inner frame on the map viewport, and "SIMULATED" in every notification, Live Activity and inbox row. (c) A "What's real in this demo" screen. | Costs nothing, keeps the violet = simulated grammar, and protects the student at Q&A. |
| D3 | **Tabs: Map · Drive · Storms · Alerts.** "Replay" becomes **Storms** ("Tormentas"). Settings opens from a gear in the same top-right spot on every tab. | "Replay" promised *real historical data*. In the demo the storms are simulated, so the old label would mislead. |
| D4 | **Map Home = floating opaque AreaStatusCard + native `nearby` formSheet.** The gorhom persistent sheet is dropped. This was B's documented fallback (B decision 7); it becomes primary. | Native iOS 26 glass sheet at partial detents. No gesture fight with MapLibre. One less dependency (gorhom was dev-tested on Reanimated 3.19, B §12.2). Deterministic for recording. |
| D5 | **Liquid Glass is MVP chrome** on iOS 26+ (`expo-glass-effect`). The fallback is `expo-blur` system chrome material on iOS 16.4–25, and a solid `glassFallback` when Reduce Transparency is on. F41 moves from Stretch to MVP. | Android is gone, and glass is the single biggest "native and premium" signal on a 2026 iPhone. |
| D6 | **`NativeTabs.BottomAccessory` = scenario transport** (mini-player: play/pause, storm time, View). On iOS < 26 it's a JS mini-bar above the tab bar. | This is the exact system pattern for a global media-like timeline (Music mini-player). It gives D1 a native home. |
| D7 | **Crossing sheet restructure.** One scroll for peek + half, with the **hydrograph as the hero at half**. The Upstream/History/About segments appear only below the fold at full. Peek detents adapt to each device. | B's peek content (~290 pt) overflows its own 0.32 detent on every iPhone (§2.5), and the hero chart was hidden 2 interactions deep. |
| D8 | **Settings = `@expo/ui` SwiftUI `Form`** in a modal page sheet, with explicit `tint('#6CB4FF')` so no control ever turns system green. | Native Settings feel, and Dynamic Type for free. |
| D9 | **Three height classes drive every layout rule**: C (compact, H < 700: SE), R (regular, 700–899: 13 mini, 16, 17), T (tall, ≥ 900: Air, Plus, Pro Max). Two width classes: N (narrow, W < 390: SE, mini) and W (wide, ≥ 390). | Every fit rule in §2 keys off these. Nothing is hard-coded per model. |
| D10 | **Personal Team build constraints are treated as design inputs** (§0.1). No push, possibly no App Groups. Local notifications are fine once `aps-environment` is stripped. The Live Activity is a Day-0 spike that falls back to MENTION. | Prevents designing a hero moment that can't be signed. |

### 0.1 Personal Team constraints that shape the UI

| Constraint | Evidence | UI consequence |
|---|---|---|
| Personal Teams can't sign the **Push Notifications** capability | [Verified: web developer.apple.com/forums/thread/84144 (DTS: "Personal development teams do not support the Push Notifications and iCloud capabilities")] | No remote push. All alerts in the demo are **local notifications** fired by the scenario engine. That is honest, because they really are generated on the device. |
| `expo-notifications` adds `aps-environment` to the entitlements **automatically**. It is in Expo's auto-applied plugin list, so this happens even when it isn't in `plugins`. | [Verified: pkg expo-notifications@57.0.22 plugin/build/withNotificationsIOS.js sets `aps-environment = mode` (default 'development'); pkg @expo/prebuild-config@57.0.19 withDefaultPlugins.js lists `expo-notifications` in `versionedExpoSDKPackages`] | After `npx expo prebuild -p ios`, delete `aps-environment` from `ios/<App>/<App>.entitlements` and remove the Push capability in Xcode → Signing & Capabilities. Otherwise signing fails. Re-check after every `prebuild --clean`. A tiny local config plugin can delete the key, but **its run order versus the auto plugin is [Unverified]**, so verify the generated entitlements file. |
| `expo-widgets` (Live Activity) **always** writes `aps-environment = development` and an **App Group** entitlement (`group.<bundleId>` if none is given) | [Verified: pkg expo-widgets@57.0.26 plugin/build/ios/withPushNotifications.js (unconditional), withIosWidgets.js (groupIdentifier fallback), withAppInfoPlist.js (`NSSupportsLiveActivities = true`)] | Whether App Groups and a widget-extension target sign on a Personal Team is **[Unverified]**. Apple's capability table didn't render for me. Run a **Day-0 spike**. If it fails, the Live Activity is MENTION-AS-NEXT and nothing else depends on it. |
| Profiles expire after 7 days. Free accounts get 10 App IDs per 7 days, and every extension uses its own App ID. | [Verified: web developer.apple.com compare-memberships ("10 App IDs, which expire after 7 days"); mybyways.com anecdote on App Group churn] | Rebuild from Xcode within 7 days of recording. **Don't churn bundle IDs**: fix `com.<student>.fordcast` (+ `.widgets`) on Day 0. |
| Time Sensitive notifications need an entitlement | [Unverified for free teams; treat as unavailable] | Use the `interruptionLevel` **active**. Never design a moment that depends on breaking through Focus. Turn Focus off while recording. |
| Liquid Glass needs an app compiled with **Xcode 26+** (Swift 6.2). With the iOS 27 SDK, `UIDesignRequiresCompatibility` is ignored. | [Verified: pkg expo-glass-effect@57.0.4 ios/GlassEffectModule.swift `#if compiler(>=6.2)` and the iOS 27 comment] | Build with the current Xcode on the Mac. On an older Xcode `isLiquidGlassAvailable()` returns false, and the blur fallback must look finished in its own right. |

---

## 1. Feature → screen fit matrix

### 1.1 Demo Edition information architecture (≤ 2 taps to everything)

```
Root Stack (Stack.Protected onboarding gate)
├─ (onboarding)/ index(welcome+EN/ES) · how · legend · pledge · notify(primer)          MUST (pledge), SHOULD (rest)
├─ (tabs) NativeTabs ─┬─ Map     sf map / map.fill                 Map Home: MapSurface + MapChrome + AreaStatusCard
│   + BottomAccessory  ├─ Drive   sf car / car.fill                 drive/index (Check My Drive + Start Drive Mode) → drive/result
│   (scenario          ├─ Storms  sf cloud.bolt.rain / .fill        storms/index (scenario library)
│    transport, iOS26) └─ Alerts  sf bell / bell.fill (+badge)      alerts/index (segmented Inbox | Saved)
├─ nearby            formSheet [0.55, 0.92], largestUndimmed 0       list: Nearby · Saved · Ranked  (accessible map alternative)
├─ crossing/[id]     formSheet [peek*, 0.62 (C: 0.70), 1.0], largestUndimmed 1, grabber   (*peek computed, §3.3)
├─ gauge/[id]        formSheet 'fitToContents'                       gauge mini-card
├─ search            formSheet [0.92]                                crossings (+ saved places)
├─ legend            formSheet 'fitToContents'
├─ storm/[id]        fullScreenModal (player; leaving keeps the clock running → BottomAccessory)
├─ storm/results     formSheet [0.62, 1.0]                           "warned X min earlier (simulated storm)"
├─ drive-mode        fullScreenModal, gestureEnabled:false           also hosts "Drive this storm (simulated)"
├─ permission/[kind] modal                                           notifications (MUST), location (optional: demo uses a simulated position)
├─ demo              formSheet [0.5, 1.0]                            Demo Director (scenarios, transport, recording toggles)
├─ settings/         presentation 'modal' (page sheet) + inner Stack: index · notifications · accessibility · drive ·
│                    how-it-works · whats-real · about · legal       (SwiftUI Form via @expo/ui)
└─ crew              push (from nearby "Ranked" → "See all ›")       "Likely to flood next"
```
Removed from the Demo Edition: `layers` (no meaningful toggles with fake data), `handoff` (replaced by a native pull-down menu), `settings/data-sources` (replaced by `whats-real`), `settings/accuracy` (folded into Storm results + `whats-real`), `settings/privacy` (no server; a single paragraph in `whats-real`), and `dev/gallery` + `settings/debug` (kept `__DEV__`-only; the presenter uses `demo`).

### 1.2 Matrix

Priority: **MUST** = appears in the video. **SHOULD** = built and polished, shown if time allows (≤ 5 s). **MENTION** = shown only as a "Planned" row or a voice-over line, never a dead button. Taps are counted from a cold Map Home.

| # | Feature (A §4 IDs) | Screen / route | Entry point(s) (taps) | Components | Demo priority | Gap in B1/B2 → fix |
|---|---|---|---|---|---|---|
| 1 | Core forecast display: area state (F30, F40) | `(tabs)/index` AreaStatusCard | 0 (home) | `AreaStatusCard`, `StatusChip`, `DisclaimerFooter tadd` | MUST | B's card holds search + Drive Mode only; Check my drive was Stretch. Now: chip row, headline, **[Check my drive] [Drive Mode ▶]**, footer. Width rules in §2.5 A. |
| 2 | Night map: creeks, gauges, crossings, clusters (F28, F31, F32) | Map Home `MapSurface` | 0 | `CrossingMarker` sprites, `CreekLayer`, `GaugeLayer`, `PulseRing` | MUST | Add a vignette overlay and a "wavefront dot" (§4 items 3, 5). Clusters keep worst-state color. |
| 3 | Freshness / recency (F35) | Map top band `FreshnessPill`; crossing peek meta line | 0 | `FreshnessPill` (long/short forms), `fresh.newest_reading` line | MUST (visible in every Map shot) | "Checked … ago" implies a live server. Demo copy: **"DEMO · updated 2 min ago"**. While a scenario runs: **"SIMULATED · storm time 10:42 PM"** (violet). Long-press opens `demo` (§1.3 G2). |
| 4 | Crossing detail (F43) + "Why this alert" (F14) + upstream hydrograph (F45) | `crossing/[id]` formSheet | 1 (marker, row, banner, notification) | `CrossingCard`, `RiskRing`, `RiskWindow`, `EtaRangePill`, `Hydrograph`, `ReasonList`, `LagPair` | MUST | Peek overflows 0.32 (§2.5 B). The hydrograph sat at full detent behind a tab. **Revised order (§1.3 G4):** peek = chip, name, window, meta, actions. Half = ring + RiskWindow row, **Hydrograph 140 pt with trigger line**, Why (2 bullets + travel range). Full = segmented Upstream · History · About. |
| 5 | Risk window "Next 90 min" (F31) | crossing half; `EtaRangePill` in peek, rows, Drive HUD | 1 | `RiskWindow` (Now·30·60·90 ticks), `EtaRangePill` | MUST | None. Keep ranges only. Bracket shifts once per sim update (A9). |
| 6 | Official closure override (F10) | crossing peek variant `(▧ FLOODED – CLOSED · OFFICIAL)` | 1 | `StatusChip official`, `OfficialSourceBadge` | SHOULD (one scenario beat) | A **fake "City of Austin reports closed" impersonates a real agency.** Source label: **"Simulated official closure (demo)"**. The shield badge stays, plus the word "simulated". |
| 7 | Unknown / stale → UNKNOWN (F11) | map sprites `ic-unknown-last*`; crossing UNKNOWN variant | 1 | dashed ring, "Last known: Avoid · 12 min ago" | SHOULD (Scenario "Gauge goes silent", ~4 s) | Live-only triggers (server stale limit, airplane mode) → the scenario engine marks a gauge silent at sim time T. Same UI. |
| 8 | Check My Drive + verdict (F49) | Drive tab `drive/index` → `drive/result` | 1 (Drive tab) / 1 (card button) | Route input card, saved-place chips, `RouteSummaryCard` | MUST | Was Stretch with a "Planned" card. Now MVP with precomputed routes. **Route and detour polylines must follow real streets** (traced once into static GeoJSON), or the basemap gives away the fake. |
| 9 | Detour + hand-off (F50, F53) | `drive/result` card; crossing peek action **[Detour +4 min]** | 2 (crossing → Detour) | detour line + "Detour +4 min" pill, `HandoffMenu` (native pull-down) | MUST (detour), SHOULD (hand-off) | The handoff formSheet is replaced by a native menu (`Link.Menu` / `@expo/ui Menu`): "Show detour in ▾ Apple Maps · Google Maps · Waze". Only installed apps are listed (`LSApplicationQueriesSchemes` for `comgooglemaps`, `waze`) [Unverified: plist keys via app config]. The warning line stays on the card. |
| 10 | Drive Mode + voice EN/ES (F57, F58, F60, F61) | `drive-mode` fullScreenModal | 1 (card "Drive Mode", or Drive tab button) | `DriveHUD`, `RouteRibbon`, `BigActionButton`, follow map (T/R only) | MUST | Portrait overflows on SE (§2.5 C) → class rules. Add a **follow-mode map strip** on R/T heights (big video win). Violet "SIMULATED DRIVE" label in scenario. |
| 11 | Driver lockout + passenger hold (F59) | dialog over search/list while sim speed ≥ 4.5 m/s | n/a (scenario "Drive into the storm" sets speed) | `PassengerHoldButton` | SHOULD (2 s) | Needs a speed source → the scenario provides a simulated speed. The Demo Director has **"Lockout: auto / off"** so the presenter is never trapped. |
| 12 | In-app AlertBanner (F36) | Map Home, Drive tab | event | `AlertBanner` | MUST | On C class it collapses to a 44 pt pill after 8 s (AVOID persists as a pill). |
| 13 | Local notifications (F65, F66, F72) | iOS banner / Lock Screen → tap opens `crossing/[id]` | event | expo-notifications local; `setNotificationHandler` shows a banner in the foreground | MUST (lock-screen shot) | Title **"SIMULATED · Avoid {{name}}"** (≤ 50 chars). The body starts "Demo storm, not a real alert." Level `active` (§0.1). Notification permission primer is real. |
| 14 | Alerts inbox (F71) + test alert (F72) | `(tabs)/alerts` segment **Inbox** | 1 | grouped list, unread dot, `CapabilityBanner notificationsOff` | SHOULD | B: replay entries never count toward the badge. **Demo: scenario alerts DO count** (they are the only alerts), each row with a violet SIMULATED chip. |
| 15 | Saved crossings + Notify me (F46) | `(tabs)/alerts` segment **Saved**; crossing peek **[Notify me]** | 2 | `CrossingRow variant=saved`, switch "Also alert me at Watch" | SHOULD | `alerts/saved` was a pushed screen. Now it's a segment (1 tap fewer). |
| 16 | Saved places (F51) | Drive tab chips (Home · School · Work) | 1 | `PlaceChip` | SHOULD (seen in the Check My Drive shot) | Was Stretch. Static fake places, no editor. The "Edit places" row is MENTION ("Planned"). |
| 17 | Storm player + "X minutes earlier" (F75–F80, F79 lag pair) | `storms/index` → `storm/[id]` fullScreenModal → `storm/results` | 2 (Storms → Play) | `StormCard` hero, violet banner, scrubber, `LagPair`, count-up | MUST (signature moment) | Copy rewrite: "SIMULATED STORM · demo data · not live". The result line reads **"In this simulated storm, FordCast warned 38 min before water reached the road."** No POD/FAR/CSI tiles (§5 W13). |
| 18 | Drive this storm (simulated) (F128) | `storm/[id]` ⋯ menu → `drive-mode` (mode scenario) | 3 (Storms → Play → ⋯) | same as #10 | SHOULD | 3 taps → also reachable from the Demo Director scenario "Drive into the storm" (1 long-press + 1 tap). |
| 19 | Nearby / ranked list, the accessible map alternative (F34) | `nearby` formSheet | 1 (swipe up on card, or [☰]) | segmented Nearby · Saved · Ranked, FlashList rows | SHOULD | The gorhom detent list is replaced by a native sheet. VoiceOver on → Map Home presents `nearby` at 0.92 on open. |
| 20 | Crew / hotspot "Likely to flood next" (F100) | `crew` push | 2 (nearby → Ranked → See all ›) | dense 56 pt rows | MENTION (1 s pan of the Ranked segment + voice-over "road crews") | Was Stretch. Kept tiny. The CSV export stays MENTION. |
| 21 | Search (F37) | `search` formSheet | 1 (glass [⌕] in the map control stack) | `SearchField`, results with chips | SHOULD | B put search in the card. **Moved to the right-edge glass stack** to free card width on 375 pt phones (§2.5 A). |
| 22 | Legend (F33) | `legend` formSheet | 1 ([?] top-right) | `LegendContent` | SHOULD | Add a "SIMULATED (violet) = demo storm" row. |
| 23 | Gauge mini-card (F39) | `gauge/[id]` fitToContents | 1 (tap a cyan gauge dot) | stage `num.lg`, Sparkline 48, "Linked to 3 crossings" | SHOULD (cheap with fake data; shows the "upstream" idea) | Was Stretch. The "View on USGS" link is **removed**: it would point to a real gauge page whose numbers contradict the fake data. |
| 24 | Settings: language EN/ES (F96, F97) | `settings/index` SwiftUI Form, Language menu picker | 1 (gear) + picker | `@expo/ui` `Picker` (`pickerStyle('menu')`) | MUST (3 s flip, including Spanish TTS later) | Also a **long-press context menu on the gear** with Language + Demo scenarios (§3.6). |
| 25 | Accessibility settings + behavior (F89–F93) | `settings/accessibility`; app-wide | 2 | SwiftUI Toggles; Large Content Viewer; VoiceOver labels | SHOULD (one AX5 shot or one VoiceOver line) | B's Large Content Viewer has no prop spec. Use `accessibilityShowsLargeContentViewer` (§3.8). |
| 26 | Onboarding + safety pledge (F109) | `(onboarding)` | first run; re-open from About | `PledgeCard`, Skia page illustrations | MUST (pledge, ~3 s) | P2 copy said "Real USGS data, checked every 5 min", which is **false in the demo**. Rewrite (§5 W15). |
| 27 | Permission priming (F110) | `permission/notifications` (MUST), `permission/location` (optional) | contextual (first Notify me, or Demo Director "Enable alerts") | `PermissionPrimer` with an SF Symbol hero | SHOULD | Location primer: the demo uses a **simulated position** ("Demo location: West Austin"). A "Use my real location" toggle is optional and needs the primer. |
| 28 | How it works (F104) | `settings/how-it-works` | 2 | 5-step vertical diagram (animated dot travels the steps) | SHOULD (the video's explainer beat could screen-record it) | Was static. Add the "travel dot" animation (§4 item 21). |
| 29 | What's real in this demo (new, replaces Data sources + Accuracy) | `settings/whats-real` | 2 | table rows: Real / Simulated / Planned | SHOULD (judges' Q&A safety) | **New screen** (§1.3 G6). |
| 30 | About, credits, legal, disclaimer (F104, §3.9) | `settings/about`, `settings/legal` | 2 | static text, attributions (OSM / OpenFreeMap) | MENTION (end card shows attribution) | Remove "What's built from claims.generated.json" (backend tooling). Static list. |
| 31 | Demo Director (new; replaces debug + DEMO_MODE F83) | `demo` formSheet | long-press FreshnessPill 0.8 s, or gear menu, or Settings → Demo | scenario radio list, transport, toggles | Not shown on camera (presenter only) | **New screen** (§1.3 G2). Must ship in **Release** builds (the debug screen is `__DEV__`-only). |
| 32 | Scenario transport (replaces Replay mini-bar F78b / BottomAccessory F41) | `NativeTabs.BottomAccessory` (iOS 26), `ScenarioMiniBar` (< 26) | visible on all tabs while a scenario runs | `ScenarioAccessory` (regular / inline placement) | MUST (seen in the Map-during-storm shot) | B says "Map Home always stays live". **Resolved in §5 W21.** |
| 33 | Live Activity + Dynamic Island (F112) | system UI from Drive Mode / an active scenario Avoid | event | `expo-widgets` `LiveActivityFactory` layout keys | SHOULD **only if the Day-0 spike signs**, else MENTION | Banner text carries "SIMULATED". |
| 34 | Haptics + sounds + TTS sync (§11) | everywhere | — | `haptics.ts`, `chime.wav`, expo-speech | MUST (audible in video) | Exact choreography in §3.7. |
| 35 | Share (F48) | crossing ⋯ menu → system share sheet | 2 | `Share.share` text including "Simulated (demo)" | MENTION | Never a dead button. |
| 36 | Widgets (F113) | — | — | — | MENTION | Not built: an extra extension App ID on a free team. |
| 37 | Report water over road (F115) | crossing full → "Planned" row | 2 | `ReportWaterStub` | MENTION | Unchanged. |
| 38 | CarPlay, Critical Alerts, SMS, statewide (F116–F119) | `whats-real` "Planned" rows | 2 | — | MENTION | Unchanged. |
| 39 | App icon + splash (F108) | home screen, launch | — | Icon Composer `.icon`, AnimatedSplash | MUST (first frame of the app segment) | §4 items 1 and 22. |

**Orphan check.** Every A §4 feature that a phone user can see has a home above. The backend-only features (F1–F27, F67/F68 push, F74, F84–F88, F123–F127) have no UI home **by design**. In the Demo Edition they are either replaced by the on-device scenario engine or are MENTION rows in `whats-real` ("Live USGS ingest: Planned"). Three new screens were needed: `demo`, `whats-real`, and the scenario accessory. One B route had no reachable entry under the new IA and was removed: `layers`.

### 1.3 Gaps that needed a new home or wireframe

**G1. Labeling system (where "demo" and "simulated" show).**
```
Baseline (no scenario running)                Scenario running ("Storm tonight")
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│(┊DEMO┊ updated 2 min ago)  [?][⚙]│           │(● SIMULATED · 10:42 PM storm)[?][⚙]│  violet pill: fill #B69CFF, ink #0E1726
│▓▓▓▓ map ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│           │┃▓▓▓ map, 2 pt violet inner frame ▓┃│  replayTokens.mapOverlay rgba(182,156,255,0.04)
```
- `┊DEMO┊` = a 18 pt-tall micro-chip with a 1 pt **dashed** `#8A97AB` outline and `label.chip` text `#B4BFD0`. It is neutral on purpose, so violet keeps meaning "a simulated storm is playing".
- Notification title prefix "SIMULATED · " (ES "SIMULADO · "). Inbox rows carry a violet `SIMULATED` chip **before** the state chip. The Live Activity banner first line reads "FordCast · SIMULATED".
- The video end card adds "All data in this demo is simulated. Map data © OpenStreetMap contributors · OpenFreeMap © OpenMapTiles".

**G2. Demo Director (`demo`, formSheet [0.5, 1.0], grabber; opened by a 0.8 s long-press on the FreshnessPill with a `selectionAsync` haptic, by the gear context menu, or from Settings → Demo).**
```
┌─────────────────────────────────┐
│             ───                 │
│ Demo Director          [Reset]  │  title.md; Reset = secondary
│ SCENARIO                        │
│ ◉ Calm evening                  │  56 pt radio rows; each deterministic (fixed seed + timeline)
│ ○ Storm tonight  (hero, 38 min) │  subtitle = beats; the lead number is computed by the engine
│ ○ Drive into the storm          │  starts drive-mode in scenario mode
│ ○ Gauge goes silent             │  UNKNOWN beat
│ ○ Simulated official closure    │  CLOSED · OFFICIAL (simulated) beat
│ TRANSPORT                       │
│ [|◀ beat] [ ▶ Play ] [beat ▶|]  │  76 pt; beats: T−30, Watch, Avoid, Water on road
│ (1×)(10×)(•60×)                 │  segmented; "Auto-slow at key beats" switch (10× near beats)
│ RECORDING                       │
│ Show touches            [on ●]  │  DemoTouchOverlay
│ Lockout                 (Auto ▾)│  Auto / Off
│ Notifications           [on ●]  │  fire local notifications at Watch/Avoid beats
│ Voice language          (EN ▾)  │  EN / ES (follows the app language by default)
└─────────────────────────────────┘
```
Never shown in the video. It must still meet the full design spec, because judges may open it.

**G3. Scenario accessory (iOS 26 `NativeTabs.BottomAccessory`; < 26 JS `ScenarioMiniBar` 48 pt above the tab bar).**
- `regular` placement: `[❚❚] ● SIMULATED · Storm tonight · 10:42 PM   [View]`. The violet dot is 8 pt. Text is `callout` 16/21 with `tnum`. View is a 44 pt glass button that opens `storm/[id]`.
- `inline` placement (tab bar minimized): `[❚❚] 10:42 PM`.
- The accessibility label reads "Simulated storm, storm time 10:42 PM, playing. Actions: pause, view."

**G4. Revised crossing sheet (393 pt reference; detents §3.3).**
```
PEEK ≈ 264 pt content + safe bottom
┌─────────────────────────────┐
│            ───              │ system grabber
│ (◆ AVOID)               [✕] │ StatusChip lg 36 · close 44 (glass)
│ Bull Creek at Loop 360      │ title.lg 28/34, ≤ 2 lines (B's layout example name; see §4 item 24)
│ Likely flooded within       │ status.word 18/24 #FF5470
│ 15–30 min                   │ num.xl 40/44 tnum (same line as the label when it fits, W class ≥ 402)
│ Gauge read 8 min ago · DEMO │ caption 13/18 tertiary
│ [⤳ Detour +4 min][🔔][⋯]    │ 48 pt row: Detour = primary inverse pill (flex 1); Notify = 48 icon+label; ⋯ menu
└─────────────────────────────┘
HALF adds (scroll):
│ ╭─╮ Next 90 min             │ RiskRing 64 + RiskWindow (Now·30·60·90) in one 72 pt row
│ ╰─╯ Now━━[15–30]━60━━90     │
│ UPSTREAM · W Bull Ck gauge  │ caption tertiary, UPPERCASE section
│ ▁▁▁▁▂▃▅▇ 6.8 ft ↑           │ Hydrograph 140 pt (R/T: 160; C: 120), dashed amber "Trigger 6.0 ft",
│ ┄┄┄┄┄┄┄┄ Trigger 6.0 ft     │ now-dot, rate badge "+3.1 ft over the last 30 min"
│ Why this alert?             │ ReasonList, max 2 bullets visible + "More reasons ›"
│ • Upstream gauge rose 3.1 ft│
│ • Water usually takes 30–45 │ travel.range (never one number)
│   min to get here           │
FULL adds: (Upstream)(History)(About) segmented · LagPair · linked gauges · update log · model ·
           source row "Simulated official status" · Report water — Planned · disclaimer full
```

**G5. Storm player as `fullScreenModal` (iOS 26 glass chrome over the map).**
```
┌─────────────────────────────────┐
│[✕]  ▒SIMULATED STORM · demo▒ [⋯]│ glass ✕ / ⋯ 44 pt; violet banner 32 pt + 4 pt stripe edge, safeTop + 8
│ ▓▓▓ map, fit gauge+creek+crossing│
│ ▓▓▓ »»» wave → ▲ → ◆            │ story caption pill (glass, 1 line, top of map): "Upstream gauge rising"
│ ┌─────────────────────────────┐ │ LagPair card 96 pt (T: 120; C: collapsed to a chip "Lag ›")
│ │Upstream ╱╱╱    At road __╱  │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │ transport card (opaque surface1, r24), 148 pt:
│ │ Storm time 10:42 PM   (60×▾)│ │ title.sm tnum + speed menu
│ │ |━━▲━━◆━━━━●━○━━━━━━━━━━━|  │ │ scrubber 48 pt hit; ticks ▲ ◆ ● ▮ ⌀
│ │ [−5]   [|◀] [ ▶ ] [▶|]  [+5]│ │ 48 pt; play 56 pt
│ └─────────────────────────────┘ │ bottom = safeBottom + 8 (no tab bar in fullScreenModal)
└─────────────────────────────────┘
```
Closing ✕ while it plays keeps the global clock running. The BottomAccessory appears, and Map Home now shows the storm (violet frame). This is the "one clock" payoff shot.

**G6. What's real in this demo (`settings/whats-real`).** Three groups, each row = SF Symbol + title + one-line explanation + neutral badge (never a status color):
- **Real** (`Built`): forecast logic running on the phone (TypeScript: upstream trigger → travel time → risk window → safety state machine); the map (OpenFreeMap / OSM); local notifications; voice alerts EN/ES; Drive Mode; accessibility features.
- **Simulated** (`Demo data`, violet outline): gauge readings, crossing states, storm timelines, official closures, the drive route position, alert history.
- **Planned** (`Planned`): live USGS gauge ingest, backend forecasts, push alerts, real-storm backtest accuracy, widgets, CarPlay, community reports.

### 1.4 Two-tap audit (from a cold Map Home)

| Goal | Path | Taps | Pass |
|---|---|---|---|
| See a crossing's state + window | tap marker | 1 | ✓ |
| See why (hydrograph + reasons) | marker → drag to half (gesture, not a tap) | 1 + drag | ✓ |
| Detour around it | marker → [Detour +4 min] | 2 | ✓ |
| Check my drive | card [Check my drive] (or Drive tab) | 1 | ✓ |
| Drive Mode | card [Drive Mode ▶] | 1 | ✓ |
| Play the storm | Storms tab → [▶ Play] on the hero card | 2 | ✓ |
| Storm result | auto-presents at "water on road", or player ⋯ → Results | 0 / 2 | ✓ |
| Alerts inbox / Saved | Alerts tab / → Saved segment | 1 / 2 | ✓ |
| Legend / Search / Gauge card | [?] / [⌕] / gauge dot | 1 | ✓ |
| Spanish | gear → Language picker (or long-press gear → Español) | 2 | ✓ |
| How it works / What's real | gear → row | 2 | ✓ |
| Ranked list ("crews") | [☰] → Ranked | 2 | ✓ |
| Drive this storm | Storms → Play → ⋯ → Drive this storm | **3** | ✗ → **fix:** add a secondary button "Drive this storm" on the hero StormCard (2 taps) |
| Demo Director | long-press FreshnessPill | 1 | ✓ (presenter only) |

### 1.5 Video beats → screens that must be pixel-perfect

| Beat (~2:20 total) | Screen(s) | State |
|---|---|---|
| 0:00–0:12 problem | none (B-roll), then the app icon on the home screen | — |
| 0:12–0:25 calm open | splash → Map Home calm | DEMO pill, breathing, cyan veins |
| 0:25–0:35 "how" | `settings/how-it-works` diagram, or onboarding P2 | animated travel dot |
| 0:35–1:20 signature | Storms hero → `storm/[id]` player → water wave → ▲ → ◆ → ● → count-up → results sheet | SIMULATED STORM |
| 1:20–1:35 one clock | ✕ player → Map Home in storm (violet frame, accessory) → lock-screen notification → tap → crossing sheet peek → half (hydrograph) | SIMULATED |
| 1:35–1:55 avoid it | [Detour +4 min] → `drive/result` → "Show detour in ▾" menu → [Start Drive Mode] | |
| 1:55–2:10 Drive Mode | HUD approach, edge glow, chime → TTS EN, then ES (language flip shown for 3 s) | SIMULATED DRIVE |
| 2:10–2:20 trust | pledge flash, `whats-real` screen, end card | |

---
## 2. iPhone fit matrix

### 2.1 Devices and classes

| Device | W × H (pt) | safeTop / safeBottom (portrait) | Top hardware / home | Height · width class | Source |
|---|---|---|---|---|---|
| iPhone SE (3rd gen) | 375 × 667 | 20 / 0 | status bar only · **home button** | **C · N** | [Unverified: from memory; read at runtime] |
| iPhone 13 mini | 375 × 812 | 50 / 34 | notch · home indicator | R · N | [Unverified] |
| iPhone 16 | 393 × 852 | 59 / 34 | Dynamic Island | R · W | [Unverified] |
| iPhone 17 | 402 × 874 | **62** / 34 | Dynamic Island | R · W | [Verified: web useyourloaf.com "iPhone 17 Screen Sizes" (402 × 874, top inset 62)] |
| iPhone Air | 420 × 912 | ? / 34 | Dynamic Island | T · W | [Unverified: 2736 × 1260 px ÷ 3, my arithmetic] |
| iPhone 16 Plus | 430 × 932 | 59 / 34 | Dynamic Island | T · W | [Unverified] |
| iPhone 16/17 Pro Max | 440 × 956 | 62 / 34 | Dynamic Island | T · W | [Unverified: 2868 × 1320 px ÷ 3] |

Rule zero: **never hard-code any of these.** Every value comes from `useWindowDimensions()` and `useSafeAreaInsets()`. The table exists only to compute the worked checks in §2.5 and to choose test devices. The minimum test set is **SE 3 (C·N) + one R·W (16 or 17) + one T (Plus or Pro Max)**. If only one phone is available, use the Xcode Simulator for the other two classes. Screenshots for fit review can come from the Simulator; the video comes from the real iPhone.

### 2.2 Global layout formulas (all screens)

| Quantity | Formula | Notes |
|---|---|---|
| Gutter `g` | `W ≥ 428 ? 20 : 16` | B §10.5. The Air (420) keeps 16. |
| Top chrome y | `safeTop + 8` (C: `safeTop + 6`) | Nothing interactive inside `safeTop`, so the Dynamic Island, notch and status bar stay clear. |
| Chrome control | 44 pt visual, `hitSlop` 2 → 48 pt hit | Glass circles/pills (§3.1). |
| Tab-bar zone `tabZone` | inside a NativeTabs screen: `useSafeAreaInsets().bottom` | **[Unverified]** that the inset includes the iOS 26 floating tab bar (and the BottomAccessory when shown). Day-0 check: log insets on Map Home with the accessory hidden and shown. Fallback constants: `49 + deviceSafeBottom` (83 on Face ID phones, 49 on SE) `+ (accessoryVisible ? 56 : 0)` [Unverified 56 = 48 accessory + 8]. B's `TAB_BAR_H = 50` is wrong for iOS 26 (§5 W3). |
| Floating card bottom | `tabZone + 8` | |
| AlertBanner y | `topChromeY + 44 + 8` | Never under the Dynamic Island. |
| Map `contentInset` | `{ top: topChromeY + 52 (+ bannerH + 8), bottom: H − cardTop + 16, left: 0, right: 0 }` | `Map.contentInset?: ViewPadding` [Verified: pkg @maplibre/maplibre-react-native@11.5.0 Map.d.ts]. Update on layout change only, never per frame. |
| Map control stack | right edge `g`, bottom = `cardTop − 16`; [⌕] [☰] [➤] in one `GlassContainer spacing={8}` = 148 pt | Map attribution: `attributionPosition {left: 8, bottom: H − cardTop + 8}` [Verified prop: pkg MLRN 11.5.0 Map.d.ts `attributionPosition`]. |
| Sheets | iOS `formSheet` with numeric detents (§3.3). Never set `sheetCornerRadius` on iOS (system concentric glass). | The content pads `safeBottom` at the bottom. |
| fullScreenModal (Drive Mode, player) | content from `safeTop + 8` to `H − safeBottom − 16` | `autoHideHomeIndicator: true` on `drive-mode` and `storm/[id]` [Verified option name: pkg expo-router@57.0.28 native-stack types]. |
| Card max height | `0.42 × (H − safeTop − tabZone)` → SE 251 · 16 298 · Pro Max 340 [Verified: calc] | Above this the card switches to its compact form (§2.4). |

### 2.3 Dynamic Type tiers (exact RN multipliers)

RN on iOS maps the content-size category to `fontScale`: XXXL **1.353**, AX1 **1.786**, AX2 **2.143**, AX3 **2.643**, AX4 **3.143**, AX5 **3.571** [Verified: pkg react-native@0.86.3 React/CoreModules/RCTAccessibilityManager.mm]. So at AX5 a 17 pt headline renders at **60.7 pt** and a 15 pt button label at **53.6 pt**. That is larger than the native body text at AX5, so plan for it.

| Tier | `fontScale` | Layout response (applies to every screen) |
|---|---|---|
| T0 | < 1.353 | Designed layouts. |
| T1 | 1.353 – 1.785 (XXXL) | Rows stack (name → chip → meta). Button leading icons are hidden. Paired buttons stack when they don't fit (measured). The card's supporting line is hidden. The hydrograph shows a numeric summary line under the chart. |
| T2 | 1.786 – 2.642 (AX1–AX2) | Single column. Map Home card = **compact** (chip row, 2-line headline, two full-width stacked buttons). Crossing sheet opens at **half**. Charts replaced by the summary + "Show readings". Legend becomes a plain list. |
| T3 | ≥ 2.643 (AX3–AX5) | Map Home opens the `nearby` list at 0.92 on top of the map (list-first, F34). Crossing sheet opens at **full**. Decorative glyphs and illustrations hidden. Every screen scrolls. Buttons allow 2-line labels with `minHeight` 52 and grow. |

**Capped elements** (`maxFontSizeMultiplier`), each paired with **Large Content Viewer** (`accessibilityShowsLargeContentViewer` + `accessibilityLargeContentTitle` [Verified: pkg react-native@0.86.3 ViewAccessibility.d.ts]): FreshnessPill / scenario pill 1.3 · map control glyphs (icons don't scale) · StatusChip `label.chip` 2.0 (wraps, never clips) · scrubber clock 1.5 · accessory 1.3 · Drive HUD `display.xl`/`drive.*` 1.3 · `display.lg` count-up 1.3. **Uncapped:** body, headlines, status words, windows, list rows and button labels (B decision 3).

### 2.4 Per-screen fit rules

| Screen | C (SE 375 × 667) | R (mini / 16 / 17) | T (Air / Plus / Pro Max) | Truncation, scroll and collapse |
|---|---|---|---|---|
| **Map Home: top band** | FreshnessPill left; [?] [⚙] right (44 each, 8 gap) | same | same, gutter 20 on W ≥ 428 | Pill long form ("DEMO · updated 2 min ago", ES "DEMO · actualizado hace 2 min") switches to the short form ("DEMO · 2 min") when the measured long width > `W − 2g − 104`. Scenario pill: "SIMULATED · 10:42 PM storm time" → "SIMULATED · 10:42 PM". Never truncate with "…". |
| **Map Home: control stack** | [⌕][☰][➤] bottom = cardTop − 16 | same | same | Zoom ± (2 × 44) is added only with VoiceOver / Switch Control. If the stack top would go above `bannerBottom + 16`, drop [⌕] (search stays reachable from the `nearby` sheet header). |
| **Map Home: AreaStatusCard** | 204 pt: chip row, headline (≤ 2 lines), buttons, footer; **no supporting line** | 226 pt: + supporting line "18 gauges · 64 crossings · 2 min ago" (1 line) | 226 pt (more map, not a bigger card) | Inner width = `W − 2g − 32`: SE/mini **311**, 16 **329**, 17 **338**, Plus 358, PM 368 [Verified: calc]. Buttons: `[Check my drive] [Drive Mode ▶]` side by side only if the measured sum fits; on N width the **leading icons are dropped** first, then the buttons **stack** (2 × 52 + 8). Max height rule in §2.2 → compact form. Swipe up or tap the chip row → `nearby`. |
| **Map Home: AlertBanner** | 2-line banner; after 8 s collapses to a 44 pt pill "◆ Avoid · {{short name}} ›" (AVOID/CLOSED persist as the pill) | full banner persists for AVOID/CLOSED | same as R | Name 1 line in the pill (`numberOfLines 1`, full name in the a11y label); window never truncates. |
| **`nearby` sheet** | detents [0.55, 0.92] → 367 / 614 pt | 0.55 of 812–874 | 0.55 of 912–956 | Rows 72 pt (T1+: auto height, stacked). Segmented control 48 hit. Names 2 lines max in rows; status word and window never truncate. |
| **`crossing/[id]`** | detents [**0.40**, **0.70**, 1.0] | [0.37 / 0.35 / 0.34, 0.62, 1.0] | [0.33 / 0.32 / 0.31, 0.62, 1.0] | Peek fraction = `clamp((peekContent + safeBottom) / H, 0.30, 0.45)` where `peekContent` = 264 pt (1-line title) or 298 pt (2-line title) at T0 (§3.3). Hydrograph height C 120 · R 140 · T 160. Title `title.lg` ≤ 2 lines in the peek, full name in the a11y label and at full. Window line stays together on W ≥ 402 ("Likely flooded within 15–30 min"); otherwise label above, number below. Action row: [Detour +4 min] flex 1 + [🔔 Notify] 48 + [⋯] 48. On N width the Notify label is hidden (icon + a11y label). |
| **`search`** | [0.92]; keyboard up | same | same | Results update with a 120 ms crossfade. Empty state 2 lines. |
| **`legend`**, **`gauge/[id]`** | fitToContents | same | same | At T2+ they become scroll lists (fitToContents capped by the system at full height). |
| **Drive tab (`drive/index`)** | inline title (no large title on C); route card (From/To 2 × 48); chips scroll horizontally; [Check my drive] 52; [▶ Start Drive Mode] 76 | large title `headerLargeTitle: true` | same + 20 gutter | Chips never wrap; they scroll with an 8 pt gap and a 16 pt edge fade. Saved route rows 72 pt. |
| **`drive/result`** | map 38 % of H; card scrolls; **actions sticky at the bottom** (52 + 8 + 76) | map 45 % | map 45 % | Verdict headline ≤ 3 lines; detour line 1 line ("Detour adds 4 min (19 min)"). Crossing strip "3 crossings: ◆ ○ ○" scrolls horizontally. |
| **`drive-mode`** | **no map**; ribbon **2** nodes; ribbon hidden during the approach alert (Detour grows 76 → 96) | ribbon 3 nodes; follow-map strip if leftover ≥ 120 pt (17 yes, 16 / mini no; §2.5 C) | ribbon 3 + follow map 166–210 pt | ≤ 3 items per glance, ≤ 120 chars. Names 1 line at `drive.secondary` 24 pt with **no truncation**: if a name doesn't fit, use the crossing's `shortName` (data field, e.g. "Bull Creek"). Buttons 76 / 96 pt, 24 pt gaps; Repeat / Mute widths `(W − 2g − 24) / 2` = 159.5 on SE. |
| **Storms tab** | hero card 220 pt + 2 cards visible | hero 260 | hero 300 | Card titles 2 lines; "38 min" value from the scenario engine. |
| **`storm/[id]` player** | LagPair collapsed to a chip "Upstream vs road ›" (tap → 120 pt overlay); transport 148 pt | LagPair 96 pt | LagPair 120 pt | Map gets all the remaining height: SE ≈ 431, 16 ≈ 439, PM ≈ 516 pt [Verified: calc]. Story caption 1 line (2 at T1+). |
| **`storm/results`** | [0.62, 1.0]; number `display.lg` 44/48 | 44/48 | **56/60** | Count-up number never wraps. The honesty line is always visible at 0.62 (it sits above the chart). |
| **Alerts** | inline title; segmented Inbox / Saved | large title | large title | Rows 72 pt; day section headers sticky. `minimizeBehavior` (§3.2) hides the tab bar while scrolling down. |
| **Settings (SwiftUI Form)** | native | native | native | SwiftUI handles Dynamic Type and wrapping. Rows ≥ 44 pt tall and full width (a recorded deviation from B's 56 pt row rule; HIG-native). |
| **Onboarding** | illustration 140 pt tall; body ≤ 40 words; buttons pinned at `safeBottom + 16` | 200 pt | 240 pt | T2+: illustration hidden, page scrolls, buttons stay pinned. ES +30 % fits because body text is never fixed-height. |
| **Permission primer** | SF Symbol hero 48 pt | 64 pt | 72 pt | Title 2 lines, 3 bullets, pinned [Continue] 52 + [Not now] 48. |
| **`demo` Director** | [0.5, 1.0] | same | same | All rows native height; transport buttons 76. |
| **Live Activity / DI** | — (SE has no Dynamic Island: Lock Screen banner only) | compact / minimal / expanded on 16 / 17; **13 mini: banner only (notch)** | DI | compactTrailing ≤ 6 chars ("15–30m"); banner ≤ 4 lines; minimal = glyph only. |

### 2.5 Worked fit checks (the numbers behind §2.4)

**A. Map Home card buttons** (Inter SemiBold 15 pt ≈ 8.3 pt per character average [Unverified estimate; replace with measured `onTextLayout` widths]):
- EN: "Check my drive" ≈ 116 + icon 26 + padding 32 = **174**; "Drive Mode" ≈ 83 + 26 + 32 = **141**; sum + 8 gap = **323**. That fits 329 (16) and 338 (17) but **not 311 (SE/mini)**. Without icons: 271 → fits 311.
- ES: "Revisar mi ruta" ≈ 125 + 58 = 183; "Modo manejo" ≈ 91 + 58 = 149; sum + 8 = **340**. That fails 329 and 338, and fits only Plus/PM. Without icons: 280 → fits everything.
- Rule: measure first; drop icons; then stack. Never shrink the font. Never use `adjustsFontSizeToFit` (B §10.4).

**B. Crossing peek vs B's fixed 0.32 detent** (peek content 264 pt with a 1-line title, 298 pt with 2 lines; plus safeBottom):
- 0.32 × 852 = **273 pt** available < 264 + 34 = **298** needed → the action row is clipped by 25 pt on an iPhone 16. 0.32 × 667 = 213 on SE vs 264 needed → clipped by 51 pt. [Verified: calc]
- Fix: the computed fractions in §2.4: SE 0.40, mini 0.37, 16 0.35, 17 0.34, Air 0.33, Plus 0.32, PM 0.31.

**C. Drive Mode portrait stack** (header 76 + 12 + "NEXT CROSSING" 30 + HUD card 160 + 16 + ribbon 44/node + 16 + Detour 76 + 24 + Repeat/Mute 76 + 16):
- 3-node ribbon = 634 pt. Usable height `H − safeTop − safeBottom`: SE 647 · mini 728 · 16 759 · 17 778 · Plus 839 · PM 860.
- **SE:** 634 fits 647 with 13 pt to spare, but the approach alert (Detour 96, +20) overflows → SE uses a 2-node ribbon (590) and hides the ribbon during the approach.
- Leftover for a follow map (`leftover − 16 ≥ 120`): mini 78 ✗ · 16 109 ✗ · 17 128 ✓ · Plus 189 ✓ · PM 210 ✓.

**D. Top band, FreshnessPill:** text on glass must be ≥ 15 pt semibold (B §8.3 rule 4). At `label.lg` 15 pt: EN pill = DEMO chip 44 + 6 + "updated 2 min ago" ≈ 141 + padding 24 ≈ **215 pt**; ES "actualizado hace 2 min" ≈ **257 pt**. Add 2 × 44 + 2 × 8 = 104 → **319 / 361 pt** against 343 available on SE/mini (N) and 361 on iPhone 16. EN fits everywhere at T0. **ES needs the short form on N width.** Anything at the 1.3 cap uses the short form. [Verified: calc; character widths Unverified]

**E. Spanish headline:** "No se detecta crecida río arriba cerca de usted" (47 characters, ≈ 385 pt at 17 pt) is 2 lines at a 311 pt inner width (44 pt); the EN headline is 1–2 lines. Budget 2 lines at T0 and 3 at T1.

---
## 3. iOS-first upgrades (Android dropped)

### 3.1 Liquid Glass chrome is MVP (iOS 26+), blur on iOS 16.4–25, solid under Reduce Transparency

APIs [Verified: pkg expo-glass-effect@57.0.4 build/*.d.ts]: `GlassView` (`glassEffectStyle: 'clear'|'regular'|'none' | {style, animate?, animationDuration?}`, `tintColor`, `isInteractive`, `colorScheme: 'auto'|'light'|'dark'`, plus ViewProps), `GlassContainer` (`spacing`), `isLiquidGlassAvailable()`, `isGlassEffectAPIAvailable()`. The fallback `BlurView` takes `tint` (including `'systemChromeMaterialDark'`) and `intensity` [Verified: pkg expo-blur@57.0.3 BlurView.types.d.ts]. Reduce Transparency comes from `AccessibilityInfo.isReduceTransparencyEnabled()` [Verified: pkg react-native@0.86.3 AccessibilityInfo.d.ts], plus its change event [event name Unverified; re-read on AppState 'active' as a fallback].

```tsx
// src/components/fordcast/GlassSurface.tsx — one component, three tiers; call sites never change
import { Platform, View, StyleSheet, type ViewProps } from 'react-native';
import { GlassView, isLiquidGlassAvailable, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';
const LIQUID = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable(); // constants, read once
export function useGlassTier(): 'liquid' | 'blur' | 'solid' {
  const { reduceTransparency } = useA11yPrefs();                  // live, from A11yPrefsProvider
  return reduceTransparency ? 'solid' : LIQUID ? 'liquid' : 'blur';
}
export function GlassSurface({ pressable, radius = 22, style, children, ...rest }:
  ViewProps & { pressable?: boolean; radius?: number }) {
  const tier = useGlassTier(); const t = useTheme();
  const shape = { borderRadius: radius };
  if (tier === 'liquid') return (
    <GlassView glassEffectStyle="regular" tintColor={t.glassTint /* rgba(14,23,38,0.55) */} colorScheme="dark"
      isInteractive={!!pressable} style={[shape, style]} {...rest}>{children}</GlassView>);
  if (tier === 'blur') return (
    <BlurView tint="systemChromeMaterialDark" intensity={70} style={[shape, { overflow: 'hidden' }, style]} {...rest}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(14,23,38,0.55)' }]} />
      {children}
    </BlurView>);
  return <View style={[shape, { backgroundColor: t.glassFallback, borderWidth: 1, borderColor: t.border.subtle }, style]} {...rest}>{children}</View>;
}
```
Rules (B §8.3 kept, F41 promoted to MVP):
1. **Glass goes only on chrome:** FreshnessPill / scenario pill, [?], [⚙], the map control stack (one `GlassContainer spacing={8}` so the three buttons merge as a group), the story caption pill and the ✕ / ⋯ buttons in the player. The tab bar, BottomAccessory and partial-height formSheets get system glass automatically [Unverified for RNS formSheets on iOS 26; the WWDC25 claim comes from research/design.md].
2. **These stay opaque:** AreaStatusCard, crossing sheet *content*, lists, Drive Mode (always `#070D18`), dialogs, Settings rows.
3. Text on glass is only `text.primary`, ≥ 15 pt semibold (iOS 27 lets users make glass fully clear).
4. **Never fade a glass view, or a parent of one, below about 2 % opacity.** UIKit silently drops the effect, and expo-glass-effect then has to wait for visibility before reinstalling it [Verified: pkg expo-glass-effect@57.0.4 ios/GlassView.swift comment "UIKit silently skips the glass effect when the view's opacity is low"]. Unmount it, or animate `transform` instead.
5. Build with the current Xcode (≥ 26) or `LIQUID` is false (§0.1). The blur tier must be reviewed as a first-class look on an iOS 18 Simulator.

### 3.2 NativeTabs with the Liquid Glass tab bar and the scenario BottomAccessory

Verified [pkg expo-router@57.0.28 build/native-tabs/types.d.ts + common/elements.d.ts + NativeTabs.d.ts]: `NativeTabs` props `minimizeBehavior: 'automatic'|'never'|'onScrollDown'|'onScrollUp'` (iOS 26+), `tintColor`, `iconColor {default, selected}`, `labelStyle {default, selected}`, `badgeBackgroundColor`, `blurEffect` (iOS < 26 appearance, e.g. `'systemChromeMaterialDark'`), `disableTransparentOnScrollEdge`. `NativeTabs.Trigger.Icon sf={{ default, selected }}`. `NativeTabs.Trigger.Badge`. `NativeTabs.BottomAccessory` (iOS 26+) with `NativeTabs.BottomAccessory.usePlacement(): 'regular'|'inline'`. The accessory is read from the layout's children on every render (`getFirstChildOfType(nonTriggerChildren, NativeTabsBottomAccessory)` in NativeTabsView.ios.js), so rendering it conditionally is supported by the code path [on-device add/remove animation Unverified]. `labelVisibilityMode`, `indicatorColor` and `rippleColor` are Android-only → delete them.

```tsx
// src/app/(tabs)/_layout.tsx — iOS only
import { NativeTabs } from 'expo-router/unstable-native-tabs';
const isIOS26 = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26;   // accessory is iOS 26+ only
export default function TabsLayout() {
  const { t } = useTranslation(); const unread = useUnreadUrgentCount(); const sc = useScenario();   // global clock store
  return (
    <NativeTabs minimizeBehavior="onScrollDown" tintColor="#F2F5FA"
      iconColor={{ default: '#8A97AB', selected: '#F2F5FA' }}
      labelStyle={{ default: { color: '#8A97AB' }, selected: { color: '#F2F5FA' } }}
      badgeBackgroundColor="#C62828" blurEffect="systemChromeMaterialDark">
      {sc.active && isIOS26 && (<NativeTabs.BottomAccessory><ScenarioAccessory /></NativeTabs.BottomAccessory>)}
      <NativeTabs.Trigger name="index"><NativeTabs.Trigger.Icon sf={{ default: 'map', selected: 'map.fill' }} />
        <NativeTabs.Trigger.Label>{t('tabs.map')}</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="drive"><NativeTabs.Trigger.Icon sf={{ default: 'car', selected: 'car.fill' }} />
        <NativeTabs.Trigger.Label>{t('tabs.drive')}</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="storms"><NativeTabs.Trigger.Icon sf={{ default: 'cloud.bolt.rain', selected: 'cloud.bolt.rain.fill' }} />
        <NativeTabs.Trigger.Label>{t('tabs.storms')}</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="alerts"><NativeTabs.Trigger.Icon sf={{ default: 'bell', selected: 'bell.fill' }} />
        <NativeTabs.Trigger.Label>{t('tabs.alerts')}</NativeTabs.Trigger.Label>
        {unread > 0 && <NativeTabs.Trigger.Badge>{String(unread)}</NativeTabs.Trigger.Badge>}</NativeTabs.Trigger>
    </NativeTabs>
  );
}
function ScenarioAccessory() {
  const placement = NativeTabs.BottomAccessory.usePlacement();   // 'regular' | 'inline'
  return placement === 'inline' ? <AccessoryInline /> : <AccessoryRegular />;   // §1.3 G3
}
```
- `minimizeBehavior="onScrollDown"` replaces B's `"never"`. Map Home has no ScrollView, so its tab bar never minimizes there, which already satisfies B's storm-safety intent. Alerts, Storms and Drive get the native shrink-on-scroll, and the accessory animates to `inline`. (Change from B §8.3 rule 5; see §5 W8.)
- iOS < 26: no accessory. `ScenarioMiniBar` (JS, 48 pt, opaque `surface1`, radius 24, violet 4 pt left bar) sits at `tabZone + 8` on every tab while a scenario runs. Same content as the `regular` placement.
- Tab badge: count of unread AVOID/CLOSED (scenario alerts count in the Demo Edition, §1.2 #14).
- Optional [Unverified]: `role="search"` exists on triggers (`SUPPORTED_TAB_BAR_ITEM_ROLES` includes `'search'`). Whether RNS gives it the iOS 26 detached search placement is untested. It uses the system title, which we can't localize ourselves, so **don't use it** for MVP.

### 3.3 Native formSheets with device-adaptive detents

Verified [pkg react-native-screens@4.26.2 lib/typescript/types.d.ts; pkg expo-router@57.0.28 native-stack types]: `sheetAllowedDetents: number[] | 'fitToContents'`, `sheetLargestUndimmedDetentIndex: number | 'none' | 'last'`, `sheetInitialDetentIndex: number | 'last'`, `sheetGrabberVisible` (iOS), `sheetExpandsWhenScrolledToEdge` (iOS, default true), `sheetCornerRadius` (**iOS**; B wrongly calls it Android-only). The `sheetDetentChange` event carries `{ index, stable }`. `unstable_sheetFooter` is **Android-only**, so pinned sheet actions on iOS must live inside the content (the action row sits under the headline, B's Google-Maps pattern). `Stack.Screen options` accepts a function `({ route, navigation }) => options` [Verified: pkg expo-router@57.0.28 build/useScreens.d.ts].

```tsx
// caller (marker / row / banner / notification):
router.push({ pathname: '/crossing/[id]', params: { id, peek: String(peekFraction(name)) } });
// peekFraction: content 264 pt (1-line title) or 298 pt (2-line title, decided by measured title width vs
// W − 2g − 44), × fontScale tier factor, + safeBottom, ÷ H, clamped to [0.30, 0.45], rounded to 0.01.

// src/app/_layout.tsx
<Stack.Screen name="crossing/[id]" options={({ route }) => {
  const peek = Number((route.params as { peek?: string })?.peek ?? 0.36);
  const fs = PixelRatio.getFontScale(); const { height: H } = Dimensions.get('window');
  return { presentation: 'formSheet', sheetGrabberVisible: true, sheetLargestUndimmedDetentIndex: 1,
           sheetAllowedDetents: [peek, H < 700 ? 0.70 : 0.62, 1.0],
           sheetInitialDetentIndex: fs >= 2.643 ? 2 : fs >= 1.786 ? 1 : 0 };
}} />
<Stack.Screen name="nearby" options={{ presentation: 'formSheet', sheetGrabberVisible: true,
  sheetAllowedDetents: [0.55, 0.92], sheetLargestUndimmedDetentIndex: 0 }} />
<Stack.Screen name="storm/results" options={{ presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.62, 1.0] }} />
<Stack.Screen name="legend" options={{ presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: 'fitToContents' }} />
<Stack.Screen name="demo" options={{ presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.5, 1.0] }} />
<Stack.Screen name="storm/[id]" options={{ presentation: 'fullScreenModal', autoHideHomeIndicator: true }} />
<Stack.Screen name="drive-mode" options={{ presentation: 'fullScreenModal', gestureEnabled: false, autoHideHomeIndicator: true }} />
<Stack.Screen name="settings" options={{ presentation: 'modal' }} />
```
- Detent listener: `navigation.addListener('sheetDetentChange', e => { if (e.data.stable) { setMapInsetBottom(detentPx(e.data.index)); haptic.select(); } })`. The camera eases (600 ms) so the crossing stays centered above the sheet.
- Sheet over sheet (crossing opened from `nearby`) is native iOS stacking and looks right. Keep it; don't dismiss `nearby` first.
- **Never** set a custom background on iOS formSheets (it kills the partial-detent glass). Content surfaces inside are `surface1`, starting 12 pt below the grabber.

### 3.4 SF Symbols and symbol effects

Two verified paths:
- `expo-symbols` `SymbolView`: `name`, `type: 'monochrome'|'hierarchical'|'palette'|'multicolor'`, `weight`, `scale`, `colors`, `tintColor`, `size`, `animationSpec { effect: { type: 'bounce'|'pulse'|'scale', wholeSymbol, direction }, repeating, repeatCount, speed, variableAnimationSpec { iterative, cumulative, reversing, nonReversing, hideInactiveLayers, dimInactiveLayers } }` [Verified: pkg expo-symbols@57.0.3 SymbolModule.types.d.ts].
- `@expo/ui/swift-ui` `Image systemName` + `symbolEffect(effect, { options: { repeat: 'nonRepeating'|'continuous'|{count, delay}, speed }, isActive, value })`. Effects: `appear, bounce, breathe, disappear, drawOff, drawOn, pulse, rotate, scale, variableColor, wiggle`; triggers come from `useNativeState` [Verified: pkg @expo/ui@57.0.25 build/swift-ui/modifiers/symbolEffect.d.ts; "@platform ios 17.0+"]. `drawOn`/`drawOff` are SF Symbols 7 / iOS 26 effects [Unverified gating; wrap in a version check and fall back to `bounce`].

Every name below exists in `sf-symbols-typescript@2.2.0` (the version expo-symbols resolves), shown with its first SF Symbols release [Verified: pkg sf-symbols-typescript@2.2.0 dist/index.d.ts]:

| Concept | SF Symbol (SF ver.) | Effect (never under Reduce Motion) |
|---|---|---|
| Tabs | `map`/`map.fill` (1.0) · `car`/`car.fill` (1.1/1.0) · `cloud.bolt.rain`/`.fill` (1.0) · `bell`/`bell.fill` (1.0) | system |
| Settings / legend / search / list / locate | `gearshape.fill` (2.0) · `questionmark.circle` (1.0) · `magnifyingglass` (1.0) · `list.bullet` (1.0) · `location.fill` (1.0) | none |
| Notify me | `bell` → `bell.fill` (1.0) | `bounce` once on turning on; nothing on turning off |
| Notification primer hero | `bell.and.waves.left.and.right.fill` (4.0) | `variableColor` iterative, `repeat: {count: 2}` |
| Detour | `arrow.triangle.branch` (2.0) | `drawOn` when the detour line finishes drawing (iOS 26), else `bounce` |
| Route | `point.topleft.down.to.point.bottomright.curvepath` (5.0) | none |
| Drive Mode | `steeringwheel` (4.1) | none |
| Repeat (speaking) / Mute | `speaker.wave.2.fill` (2.0) / `speaker.slash.fill` (1.0) | `variableColor` **iterative while TTS is speaking** (`isActive` bound to the speech state) |
| ±5 min step | `gobackward.5` / `goforward.5` (3.0) | none |
| Prev / next beat, play / pause | `backward.fill` / `forward.fill` / `play.fill` / `pause.fill` (1.0) | none |
| Gauge | `gauge.with.needle` (5.0) / `sensor.fill` (4.0) | none |
| Water / rising | `water.waves` (4.0) / `water.waves.and.arrow.trianglehead.up` (6.0; fallback `water.waves.and.arrow.up` 4.0) | `wiggle` up, once, in "Why this alert" when the reason appears |
| Unknown (system contexts only) | `questionmark.circle.dashed` (6.0) | none |
| Official source | `shield.lefthalf.filled` (3.0) | none |
| Offline | `wifi.slash` (1.0) | none |
| Demo Director | `slider.horizontal.3` (1.0) | none |
| What's real | `checklist` (3.0) | none |
| Pledge | `hand.raised.fill` (1.0) | none |
| Language / accessibility / text size | `globe` (1.0) / `accessibility` (5.0) / `textformat.size` (1.0) | none |
| Share / more | `square.and.arrow.up` (1.0) / `ellipsis.circle` (1.0) | none |

Status glyphs inside the app stay the custom SVG `StatusGlyph` (B §10.9). SF status symbols are used only in system surfaces (Live Activity, notification actions).

### 3.5 Settings in `@expo/ui` SwiftUI

Verified [pkg @expo/ui@57.0.25 build/swift-ui]: `Host` (`colorScheme`, `matchContents`, `style`), `Form`, `Section` (`title`, `header`, `footer`), `Toggle` (`isOn`, `label`, `systemImage`, `onIsOnChange`), `Picker` (`label`, `systemImage`, `selection`, `onSelectionChange`, children `<Text modifiers={[tag('en')]}>`), `Slider` (`value`, `min`, `max`, `step`, `onValueChange`), `LabeledContent`, `Button` (`label`, `systemImage`, `role`), `ConfirmationDialog` (+ `.Trigger/.Actions/.Message`), `ContentUnavailableView` (`title`, `systemImage`, `description`), `Gauge`, `Chart` (`line|point|bar|area|pie|rectangle`), `Menu`, `ContextMenu`, `ShareLink`. Modifiers include `tint`, `pickerStyle('automatic'|'inline'|'menu'|'navigationLink'|'palette'|'segmented'|'wheel')`, `scrollContentBackground('hidden')`, `listRowBackground(color)`, `buttonStyle('glass'|'glassProminent'|…)`, `controlSize`, `glassEffect`, `font`, `monospacedDigit`, `accessibilityLabel`.

```tsx
// src/app/settings/index.tsx (sketch)
import { Host, Form, Section, Picker, Toggle, Text, Button } from '@expo/ui/swift-ui';
import { tint, pickerStyle, scrollContentBackground, listRowBackground, tag } from '@expo/ui/swift-ui/modifiers';
const ROW = listRowBackground('#152033');                       // surface.1
<Host style={{ flex: 1, backgroundColor: '#0E1726' }} colorScheme="dark">
  <Form modifiers={[scrollContentBackground('hidden'), tint('#6CB4FF')]}>   {/* tint: accent.link; NEVER system green */}
    <Section title={t('settings.general')}>
      <Picker label={t('settings.language')} systemImage="globe" selection={lang} onSelectionChange={setLang}
        modifiers={[pickerStyle('menu'), ROW]}>
        <Text modifiers={[tag('system')]}>{t('settings.language.device')}</Text>
        <Text modifiers={[tag('en')]}>English</Text>
        <Text modifiers={[tag('es')]}>Español</Text>
      </Picker>
    </Section>
    <Section title={t('settings.feedback')}>
      <Toggle label={t('settings.haptics')} systemImage="hand.tap.fill" isOn={haptics} onIsOnChange={setHaptics} modifiers={[ROW]} />
      …
    </Section>
  </Form>
</Host>
```
- **No-green rule:** a SwiftUI `Toggle` is green by default. `tint('#6CB4FF')` on the `Form` (or each Toggle) is mandatory [Verified that `tint` exists; that it recolors the Toggle track is standard SwiftUI behavior, Unverified here → check in the first build].
- Dropped rows: Appearance (only dark ships), Units (fake data, low value), Privacy/Data sources (folded into `whats-real`).
- `ContentUnavailableView` for empty states (Alerts Inbox empty, Saved empty, search empty) gives the native iOS empty look for free. Copy is never "all clear".

### 3.6 Native context menus, previews and zoom transitions

- `Link.Menu` / `Link.MenuAction` (`title`, `icon: SFSymbol`, `isOn`, `destructive`, `disabled`, `subtitle`), `Link.Preview`, `Link.Trigger` (`withAppleZoom`), `Link.AppleZoom` (iOS 18+) [Verified: pkg expo-router@57.0.28 build/link/*.d.ts].
- **Crossing rows** (nearby, Saved, Inbox, Drive result strip): a long-press shows a **Preview** of the crossing peek card plus actions *Show on map · Detour · Notify me / Stop alerts · Share*. Remove is not destructive red (no red buttons rule): `destructive={false}`, wording "Stop alerts".
- **Gear long-press:** menu *English ✓ · Español · Demo Director · How FordCast works*. The language flip in the video becomes a single long-press.
- **StormCard → player:** `Link.AppleZoom` zoom transition [Unverified for `fullScreenModal`; if it fails, use a plain push inside the Storms stack with the zoom].
- `@expo/ui` `ContextMenu` (Trigger / Preview / Items) is the alternative for SwiftUI-hosted content [Verified].

### 3.7 Haptic and sound choreography (expo-haptics: `notificationAsync`, `impactAsync`, `selectionAsync` only, so no custom Core Haptics patterns [Verified: pkg expo-haptics@57.0.3 Haptics.d.ts])

| Moment | t = 0 (same frame) | +ms | Notes |
|---|---|---|---|
| Crossing → WATCH | marker pop + chip crossfade + `notificationAsync(Warning)` | Drive Mode: `chime_soft` (0.3 s) at 0, TTS at **+450** | one cue |
| Crossing → AVOID | marker pop + halo + banner slide + `notificationAsync(Error)` | `chime` (0.5 s) at 0, TTS at **+650** (chime end + 150) | never `Success` anywhere (lint) |
| → CLOSED | stripes appear + `notificationAsync(Error)` | chime 0, TTS "…is closed. Turn around. Don't drown." +650 | |
| → UNKNOWN | ring turns dashed + `impactAsync(Soft)` | no sound | |
| De-escalation | color step + `impactAsync(Light)` | TTS "Update…" (Drive Mode) +300 | |
| Water reaches road (player ●) | tick drops + `impactAsync(Soft)` | count-up starts +400 (900 ms); at its end `impactAsync(Medium)` + pop | the "X min earlier" reveal |
| Scrub across a 15 sim-min tick | `selectionAsync()` | — | UI gate 60 ms |
| Sheet detent settles | `selectionAsync()` | — | only on `stable: true` |
| Notify me ON | `impactAsync(Light)` + bell `bounce` | — | |
| Detour line finishes drawing | `impactAsync(Light)` | — | |
| Start Drive Mode | `impactAsync(Medium)` | 400 ms fade to `#070D18` | |
| Pledge checkbox / "I understand" | `selectionAsync()` / `impactAsync(Light)` | — | |

Gate rules: safety cues (Warning, Error, Soft for Unknown) ≤ 1 per 1.5 s (B). UI micro-haptics use a separate 60 ms gate and are **suppressed for 400 ms after a safety cue**, so the warning is never blurred. Settings → Haptics off disables both.

### 3.8 Dynamic Type, Large Content Viewer, Bold Text, Increase Contrast, cross-fade

- Tiers in §2.3. One `AppText`. Measured layouts, no `adjustsFontSizeToFit` on status words.
- **Large Content Viewer** on every capped or icon-only control: `accessibilityShowsLargeContentViewer` + `accessibilityLargeContentTitle` [Verified: pkg react-native@0.86.3 ViewAccessibility.d.ts]. Covers the glass icon buttons, FreshnessPill, Drive HUD buttons, scrubber buttons and accessory. NativeTabs items get the system viewer.
- `AccessibilityInfo.isBoldTextEnabled()` → AppText weight bump. `isDarkerSystemColorsEnabled()` → `darkHC` tokens. `isReduceTransparencyEnabled()` → solid chrome. `prefersCrossFadeTransitions()` → sheet content swaps crossfade instead of rise [all Verified: pkg react-native@0.86.3 AccessibilityInfo.d.ts].

### 3.9 VoiceOver (rotor-friendly)

- **Headings rotor:** every screen title, section header and the crossing sheet header use `accessibilityRole="header"`.
- **Actions rotor:** rows expose `accessibilityActions` (*Show on map, Detour, Notify me, Share*). The sheet grabber is a button with *expand / collapse*. The scrubber is `adjustable` (±5 sim-min) with value "Storm time 10:40 PM. Avoid issued at 10:31 PM."
- `onMagicTap`: player = play/pause; Drive Mode = repeat the last alert. `onAccessibilityEscape` closes sheets.
- Announcements: `announceForAccessibilityWithOptions(text, { queue: true })` [API name Verified: RN 0.86.3 AccessibilityInfo.d.ts; option shape Unverified], limited to escalations (≤ 1 per 10 s, B).
- **Custom rotors** (UIAccessibilityCustomRotor) are **not exposed by RN 0.86** [Unverified: no prop found in ViewAccessibility.d.ts]. Don't promise "Crossings" rotor items. Headings + Actions + the `nearby` list are the accessible path.
- Map container: one `image` element with the summary label (B §29.9). With VoiceOver on, `nearby` opens at 0.92 on top.

### 3.10 Local notifications on a Personal Team

- `scheduleNotificationAsync({ content: { title, body, data: { url: 'fordcast://crossing/<id>', simulated: true }, interruptionLevel: 'active', categoryIdentifier: 'crossing-alert' }, trigger: null })`. `interruptionLevel: 'passive'|'active'|'timeSensitive'|'critical'` and `categoryIdentifier` exist [Verified: pkg expo-notifications@57.0.22 build/Notifications.types.d.ts]. In the foreground, `setNotificationHandler` returns `shouldShowBanner: true, shouldShowList: true` [Verified: same file].
- Copy (≤ 50 / ≤ 150): title **"SIMULATED · Avoid Bull Creek at Loop 360"**, body **"Demo storm, not a real alert. Likely flooded within 15–30 min. Use another route. Never drive into water."** ES: "SIMULADO · Evite …" / "Tormenta de demostración, no es una alerta real. Probablemente inundado en 15–30 min. Use otra ruta. Nunca maneje en el agua." (native review).
- **Optional wow, low risk:** `attachments` (iOS) [Verified field] with a 600 × 400 PNG snapshot of the crossing on the night map (Skia `makeImageSnapshot` → file in the cache dir). A long-press on the Lock Screen then expands to a picture of the octagon on the creek. If the snapshot write fails, send it without the attachment.
- Strip `aps-environment` after prebuild (§0.1).

### 3.11 Live Activity and Dynamic Island (Day-0 spike → SHOULD or MENTION)

- API [Verified: pkg expo-widgets@57.0.26 build/Widgets.d.ts, Widgets.types.d.ts]: `new LiveActivityFactory(name, layout)` → `.start(props, url?, staleDate?)` → `LiveActivity.update(props, staleDate?)` / `.end(dismissalPolicy?, props?, contentDate?)`. Layout keys `banner, bannerSmall, compactLeading, compactTrailing, minimal, expandedCenter, expandedLeading, expandedTrailing, expandedBottom`. Environment `isStale`, `isLuminanceReduced`. Dismissal policy `'default'|'immediate'|after(date)`. Plugin options `groupIdentifier`, `enablePushNotifications`, `frequentUpdates`, `widgets` [Verified: plugin/build/withWidgets.d.ts].
- **Spike (≤ 90 min, Day 0):** add the plugin with an explicit `groupIdentifier: 'group.com.<student>.fordcast'` → prebuild → strip `aps-environment` from the app and the extension entitlements → Xcode automatic signing with the Personal Team → start one activity from a dev button.
- **Pass** → SHOULD-SHOW in the Drive Mode beat (lock the phone during the approach). **Fail** (App Groups / extension signing) → remove the plugin and the extension target, and the item becomes MENTION. Nothing else may depend on it.
- Layout (B §15.3 kept): compactLeading = octagon glyph (`exclamationmark.octagon.fill`), compactTrailing `"15–30m"`, minimal = glyph. Banner line 1: **"FordCast · SIMULATED"** + chip + "as of 10:42". Never a running timer. `staleDate` = now + 15 min of *wall* time → `isStale` shows slate "Data may be outdated". The 13 mini and SE have no Dynamic Island, so they show the Lock Screen banner only.

### 3.12 Native headers on list tabs

- Drive, Storms, Alerts and Settings use the native-stack header: `headerLargeTitle: H >= 700`, `headerTransparent: true`, `headerBlurEffect: 'systemChromeMaterialDark'` (< iOS 26). iOS 26 gives glass bars automatically [Unverified]. `scrollEdgeEffects: { top: 'soft' }` (iOS 26+) [Verified: pkg react-native-screens@4.26.2 `ScrollEdgeEffect = 'automatic'|'hard'|'soft'|'hidden'`, exposed through expo-router@57.0.28 native-stack `scrollEdgeEffects`].
- Gear = header right item (system glass button on iOS 26). `unstable_headerRightItems` exists [Verified name] but its shape is untested. Use `headerRight: () => <GlassIconButton … />` as the safe path.
- Map Home, the player and Drive Mode have no header (chrome floats).

### 3.13 iOS features deliberately NOT used

Live Text, App Intents / Siri, widgets (F113), CarPlay, Critical Alerts, Time Sensitive (all need entitlements, a paid team or extra App IDs, or don't serve the demo), and `role="search"` tab (system title not localizable).

---
## 4. Polish list: the 30 details that separate "good" from "stunning"

Motion tokens are B §11.2 (`spring.press 180/1.0`, `snappy 300/0.92`, `sheet 420/0.9`, `pop 380/0.6`, `gentle 550/1.0`; durations `sm 160`, `md 240`, `lg 360`, `ring 700`, `ripple 900`, `travel 2400`, `pulse 2000`, `breathe 3000`, `countUp 900`). Every item has a Reduce Motion form (RM).

| # | Detail | Exact spec |
|---|---|---|
| 1 | **Launch "arrival"** | Native splash `#0E1726` + Dip glyph (imageWidth 76). JS overlay: creek path trim 0 → 1 over 600 ms `standard`. "FordCast" (`display.md`) fades in and rises 8 pt over 240 ms starting at 360 ms; the tagline follows at 480 ms. Hold until 1,100 ms, then crossfade the overlay out over 300 ms **while** the map camera eases z 9.8 → 10.5 over 1,200 ms `decelerate`. RM: static logo, 300 ms fade, no camera move. |
| 2 | **Calm-state life (no reassurance)** | FreshnessPill dot (8 pt `#2BD9D9`): opacity 1 → 0.4 → 1 over 3,000 ms, once every 10 s. Gauge dots: one soft ripple every 12 s (radius 4 → 14 pt, opacity 0.35 → 0, 1,200 ms `decelerate`) on a single `gauges-ripple` circle layer. Both loops run **only** in calm and stop at the first WATCH+ (loop budget, §5 W20). RM: static. |
| 3 | **Night map finish** | All POIs hidden; road labels from z 13; place labels Noto Sans 13 `#A9B4C4` with a 1.5 pt `#0B1320` halo; watched-creek names Noto Sans Italic 12 `#5F87A3` along the line from z 12; creeks z10 1.5 → z15 3 pt @ 0.50. **Edge fades** (expo-linear-gradient, bundled `~57.0.2`): top `#0B1320` @ 0.55 → 0 over `safeTop + 72` pt behind the glass chrome, and bottom 0 → @ 0.45 over 160 pt behind the card. Chrome stays legible over any tile, and the frame looks cinematic. |
| 4 | **Marker escalation** | Sprite swap + scale 0.6 → 1.0 `spring.pop` + one ripple ring 1 → 2.2×, opacity 0.5 → 0, 900 ms `decelerate`. AVOID halo: scale 1 → 1.8, opacity 0.35 → 0, 2,000 ms × 3, then static 0.25. Selected: 3 pt `#F2F5FA` ring r 24 + Noto Bold 13 name. RM: instant swap + static double ring for 6 s. |
| 5 | **Water wave with a "wavefront"** | `line-gradient` head = 12 % of the reach, dim `rgba(43,217,217,0.18)` → head 1.0, width 6, blur 1; glow layer +7 pt @ 0.30, blur 6. Duration `clamp(reachLengthPt × 6 ms, 1,600, 4,000)` at 30 fps. **New:** a 10 pt cyan dot with a 2 pt `#0B1320` ring and an 18 pt glow @ 0.35 rides the head (`@turf/along`). It fades over 200 ms at the crossing, and the marker escalates **120 ms later** (cause → effect). RM: static `ic-flow-arrow` every 120 pt + a travel-range caption (player only). |
| 6 | **Hydrograph draw-on** | Skia. When the sheet first settles at half: path trim 0 → 1 over 700 ms `standard`; area fill alpha 0 → 0.12 over 400 ms from +300; now-dot `spring.pop` at +700; rate badge "+3.1 ft over the last 30 min" rises 8 pt + fades over 240 ms at +800. New samples (every simulated 5 min) extend the last segment over 240 ms; a y-axis rescale animates over 360 ms. Trigger-crossing moment: dashed amber line opacity 0.4 → 1 → 0.6 over 600 ms. RM: drawn, no trim. |
| 7 | **RiskRing + RiskWindow** | Ring sweep 700 ms `spring.gentle`, color interpolated slate → amber → red; center glyph crossfade 240 ms. The window bracket slides 240 ms `standard` once per simulated update (never continuously). |
| 8 | **Rolling numbers** | Stage, counts and storm-clock minutes roll vertically over 240 ms with a 30 ms per-digit stagger; `tnum` everywhere, so widths never jitter. RM: instant. |
| 9 | **Typography rhythm** | 4 pt grid. Title → subtitle 4, block → block 12, section → section 24, card padding 16. At most **3 type sizes per card** (e.g. chip 13 / headline 17 / caption 13). En-dash ranges "15–30 min". UPPERCASE only in chips (+0.6 tracking). Never more than 2 weights on one card. |
| 10 | **Card → sheet continuity** | A 36 × 5 pt grabber hint (`#3A4D6E`) sits at the top of the AreaStatusCard. A pan up (translationY < −24 pt or velocity < −500 pt/s) presents `nearby`. During the pan the card follows the finger up to 24 pt and dims to 0.92, then springs back (`spring.snappy`) as the native sheet rises. |
| 11 | **Sheet content stagger** | Crossing peek: chip 0 → title +40 → window +80 → meta +120 → actions +160 ms; each fades + rises 8 pt over 160 ms. Dragging to half reveals ring/window, hydrograph and reasons at 60 ms steps. `prefersCrossFadeTransitions` or RM → crossfade only. |
| 12 | **AlertBanner entrance** | Slides down 12 pt + fades over 240 ms `decelerate`; the 4 pt left state bar grows 0 → 100 % height over 200 ms; the chip pops; the Error haptic fires on frame 0. On C class it collapses to the 44 pt pill after 8 s with a 300 ms `LinearTransition` [Verified export: pkg react-native-reanimated@4.5.1]. |
| 13 | **Detour reveal** | Camera `fitBounds` over 600 ms with padding from the chrome and card. The baseline route draws on (gradient progress 0 → 1, 600 ms). The blocked ±300 m segment (dashed `#FF5470` 5 pt) appears with one 0.4 → 1 opacity flash over 300 ms. The detour draws from +500 over 600 ms. The "Detour +4 min" pill pops (`spring.pop`) + Light haptic + `arrow.triangle.branch` drawOn/bounce. |
| 14 | **Drive Mode entry and approach** | [Start] → Medium impact → 400 ms fade through `#070D18`. The HUD staggers in at 60 ms steps. After 500 ms it speaks "Drive Mode on. FordCast will speak." On approach: 8 pt inner edge glow `#FF5470` @ 0.9 fades in over 200 ms (then static); Detour 76 → 96 pt `spring.snappy`; the ribbon node rises over 300 ms; chime/TTS per §3.7. |
| 15 | **Drive Mode follow map** (R/T, when leftover ≥ 120 pt) | MapLibre follow, pitch 0, z 15, route + next crossing; `easeTo` every 1 s (800 ms); gestures off; height = leftover − 16 (§2.5 C). |
| 16 | **Storm clock and ticks** | "Storm time 10:42 PM" `title.sm` 20/25 `tnum` + caption "Simulated storm · night 1". When the playhead passes an event, its tick scales 0 → 1 (`spring.pop`) with a 2 pt colored stem. Scrub haptic every 15 simulated minutes. |
| 17 | **"38 MIN EARLIER" reveal** | Scrubber bracket ◆ → ● fills violet @ 0.35 over 400 ms. Count-up 0 → X over 900 ms `Easing.out(Easing.cubic)`, then scale 1 → 1.06 → 1 (`spring.pop`) + Medium impact. Number `display.lg` 44/48 (T: 56/60); "min" `title.md`; "before water reached the road" `body.lg`. The honesty caption "Simulated storm. Real-world lead times will be measured on past Austin storms (planned)." appears at +300. The results sheet presents at +1,200. RM: final number shown at once. |
| 18 | **Empty states that look intentional** | `ContentUnavailableView` (§3.5): SF Symbol hierarchical `#8A97AB`, title 20/25, description 15/21, one action. Alerts empty: `bell` "No alerts yet" / "You'll see warnings here for your saved crossings and drives." Saved empty: `bookmark` + [Find crossings]. No green, no check marks, never "all clear". |
| 19 | **Glass control finish** | 44 pt circles; symbols 20 pt semibold `#F2F5FA`. Siblings sit in `GlassContainer spacing={8}` so they merge as a group. `isInteractive` gives the native press response. Only the blur/solid tiers add scale 0.96 `spring.press`. |
| 20 | **Tab bar + accessory** | SF default/selected pairs (§3.2), tint `#F2F5FA`, inactive `#8A97AB`, badge `#C62828` only for unread AVOID/CLOSED. Accessory regular: 12 pt horizontal padding, play/pause symbol 22 pt, 8 pt violet dot, `callout` `tnum` time, "View" text button. |
| 21 | **Onboarding illustrations (Skia)** | 320 × 200 scenes. **P1:** creek S-curve into the road dip; the water line rises 0 → 40 % of the dip depth over 3 s `inOut`, ≤ 3 loops, then holds. **P2:** gauge staff → creek → crossing; an 8 pt cyan dot travels the path in 2.4 s, then the crossing glyph morphs ○ → ▲ → ◆ (`spring.pop`, 300 ms apart). **P3:** legend glyphs pop in at 80 ms steps. **P4:** 24 pt checkboxes with an inverse fill and a navy SF `checkmark` (never green); "I understand" enables with a 200 ms crossfade. Page dots: 6 pt, active 18 × 6 pill. RM: static frames. |
| 22 | **App icon** | Icon Composer `.icon` with 4 layers: gradient `#0E1726` → `#16233A`; road `#F2F5FA`; creek `#2BD9D9` (glass on); gauge dot ice with a 1.5 pt cyan ring. Check Default/Dark/Clear/Tinted at 29 / 40 / 60 pt. No red or amber. The SDK 57 template already points `ios.icon` at `./assets/expo.icon` [Verified: pkg expo-template-default@57.0.32 app.json]. |
| 23 | **Permission primer** | Hero `bell.and.waves.left.and.right.fill` 64 pt (C 48), hierarchical `#F2F5FA` (cyan stays reserved for water), variableColor iterative × 2. `title.lg` + 3 bullets with 17 pt SF icons. [Continue] 52 inverse pill, [Not now] 48 text button. |
| 24 | **Data dressing (believable *and* honest)** | Crossing names come from a public low-water-crossing list, so the geography is real; **never** put a simulated low-water crossing on a road that actually crosses on a bridge (B's "Bull Creek at Loop 360" is a layout example and must be replaced by a real low-water location before recording). Stages 2–9 ft, rises 0.5–3.5 ft per 30 min, travel ranges in 15-min buckets. Route and detour traced on real streets. **No real USGS station numbers** (they would contradict the fake readings). Every time is local "10:42 PM". |
| 25 | **Ornaments** | MapLibre `logo={false}`, `compass={false}`, attribution ⓘ bottom-left 8 pt **above the card** (position derived from the card height), so it's never covered. The OSM/OpenFreeMap credit is also on the end card. |
| 26 | **Sound and voice** | `chime.wav` 0.5 s, descending minor third, 10 ms attack, peak −3 dBFS; `chime_soft` 0.3 s at −9 dBFS. Played with `expo-audio` (duck others, plays in silent mode). Voices: pick the highest-quality installed voice from `Speech.getAvailableVoicesAsync()`. **Before recording, download an enhanced/premium en-US and es-US/es-MX voice** in iOS Settings (Accessibility → Spoken Content → Voices) [exact menu path Unverified]. Tune the rate by ear (B default 0.95). |
| 27 | **Touch overlay for the recording** | `DemoTouchOverlay`: a 44 pt ring with a 2 pt `#F2F5FA` @ 0.9 border and @ 0.18 fill; it appears over 80 ms and fades over 300 ms after release. A long press grows a filled ring. Toggle in the Demo Director. |
| 28 | **Spanish pass** | Every string, TTS line, notification and date ("10:42 p. m.") is localized. Review every MUST screen in ES on the SE (the worst width) and at XXXL. Nothing truncates; buttons stack instead. A native speaker reviews all of it. |
| 29 | **VoiceOver beat** | Crossing header one-liner: "Avoid. Bull Creek at Loop 360. Likely flooded within 15 to 30 minutes. Use another route." (name per item 24). Record 3 s with VoiceOver's focus outline visible. |
| 30 | **Capture hygiene** (the last 10 % of "perfect") | Build the **Release** configuration from Xcode (no dev menu or LogBox; full Hermes speed) [Unverified that Release + Personal Team runs without changes; test Day 1]. Focus/Do Not Disturb on. Auto-brightness off at about 70 %. Battery ≥ 80 %. Wi-Fi on (tiles). 60 fps capture. Rebuild within 7 days of shooting (§0.1). Clean status bar via QuickTime-over-USB capture [Unverified]; otherwise accept the recording indicator. |

---

## 5. Contradictions and weak spots in B1/B2, with fixes

| # | Where | Problem | Fix |
|---|---|---|---|
| W1 | B §8.3–§8.5, F41 | MVP is Android-first with solid chrome; iOS glass is Stretch and "compiles, untested". | iOS-only: glass is MVP (§3.1). Delete Android-only props and branches (`labelVisibilityMode`, `indicatorColor`, `rippleColor`, Android channels, `sheetCornerRadius: 28`, `glassFallback 0.92`). |
| W2 | B §12.2 Step 4, F30 | Persistent gorhom sheet (`[148,'45%','88%']`) risks gesture fights with MapLibre and is tested on Reanimated 3.19 only. It is also opaque JS, not native glass. | Promote B's own fallback: AreaStatusCard + native `nearby` formSheet (D4, §4 item 10). |
| W3 | B §12.2 / D1 §29.8 `TAB_BAR_H = Platform.select({ios: 50})` | Hard-coded height is wrong for the iOS 26 floating bar and the BottomAccessory. | Read insets inside the tab screen (§2.2) and verify on Day 0. Use the fallback constants only if the insets exclude the bar. |
| W4 | B §13.8 peek 0.32 | Peek content needs ≥ 298 pt with the safe area; 0.32 gives 273 (iPhone 16) and 213 (SE) → the action row is clipped. | Device-adaptive peek (§2.4, §3.3). |
| W5 | B §13.8 half | The hero hydrograph is at full detent behind the "Upstream" tab (2 interactions). The half shows a 48 pt sparkline only. Tabs inside a 0.62 sheet waste ~48 pt. | G4: single scroll, 140 pt hydrograph at half, segments only at full. |
| W6 | B §13.4 card | `[⌕] [Drive Mode]` + `[Check my drive]` overflows the 311 pt inner width on 375 pt phones (EN with icons) and fails in ES on every R phone (§2.5 A). | Search moves to the glass control stack; measured button rules (drop icons → stack). |
| W7 | B §8.4–§8.5, D1 §28.2 | Says `sheetCornerRadius` is Android-only; RNS 4.26 documents it as **iOS-only**. | On iOS **don't set it** (keeps the concentric glass corners). The comment was wrong; it's harmless now that Android is gone. |
| W8 | B §8.3 rule 5 `minimizeBehavior="never"` | The rationale (tab bar visible during storms) only matters on Map Home, which has no ScrollView and so never minimizes. "never" just loses the native accessory inline animation on list tabs. | `'onScrollDown'` (§3.2). |
| W9 | F90 "Large Content Viewer on tabs/HUD" | No API given. | `accessibilityShowsLargeContentViewer` + `accessibilityLargeContentTitle` on every capped or icon-only control (§3.8). |
| W10 | B §13.4/§13.16.5/§13.20 | Live-backend states (Realtime, "Waking server…", `/v1/meta/freshness`, push token, `min_app_version`, kill switch, `app_config` banner, read-path rungs) have no meaning in the Demo Edition and would be dead UI. | Remove them. CapabilityBanner keeps only `notificationsOff`. FreshnessPill copy per G1. Data sources → `whats-real`. |
| W11 | B §13.13, §3.7 `replay.*` | "REPLAY · real data from {{storm}}", "Real storms, same pipeline", `HERO_STORM_ID`, `results.json`: **false for simulated storms**. | Tab "Storms". Banner "SIMULATED STORM · demo data · not live" / "TORMENTA SIMULADA · datos de demostración · no es en vivo". The engine computes the lead time from the scenario timeline. |
| W12 | B §13.4 "Map Home always stays live; replay states never appear on Map Home" | Conflicts with D1 (one clock). | In the Demo Edition nothing is live, so Map Home shows the scenario state with the violet frame + SIMULATED pill + accessory. The rule's intent (never mistake simulated for live) is kept by the labels. |
| W13 | B §13.13 results, §13.17.2 accuracy, F80 | POD/FAR/CSI/CI tiles computed from a simulated storm would be **fabricated metrics** in the video. | Remove the metric tiles. Show only "In this simulated storm, FordCast warned X min before water reached the road" + "How accuracy will be measured (planned): no lookahead, leave-one-storm-out…". `MetricTile` only in its pending state ("—"). |
| W14 | B §13.8 CLOSED official "City of Austin" | A fake closure attributed to a real agency is impersonation. | Source label "Simulated official closure (demo)". The precedence behavior is unchanged. |
| W15 | B §13.2 P2 `onboarding.how.data` "Real USGS data, checked every 5 min." | False in the demo. | "This demo uses simulated gauge readings. The forecast logic is real and runs on your phone." / "Esta demostración usa lecturas simuladas. La lógica del pronóstico es real y funciona en su teléfono." (≤ 40 words; native review). |
| W16 | B §13.3/§13.11 location gates | "Drive Mode needs your location… [Go to Settings]" would block the demo if location is denied. | Default to a **simulated position**. The location primer only gates the optional "Use my real location" toggle. |
| W17 | B §13.12 lockout | Needs real GPS speed; it could trap the presenter mid-take. | Simulated speed from the scenario plus a Director toggle "Lockout: Auto / Off". |
| W18 | B §15.1 REPLAY notification = `passive` on `updates` | iOS `passive` doesn't light the screen or play a sound, so the lock-screen shot wouldn't happen. Time Sensitive is unavailable on a Personal Team. | `interruptionLevel: 'active'` + the "SIMULATED · " title prefix + "Demo storm, not a real alert." at the start of the body. |
| W19 | B §11.6 "≤ 1 haptic per 1.5 s" | Blocks choreographed UI feedback (detent snap, scrub ticks). | Two gates (§3.7): safety cues 1.5 s; UI micro-haptics 60 ms, muted for 400 ms after a safety cue. |
| W20 | B §11.1 "≤ 2 loops on screen" | Calm extras (breathe, gauge ripple) plus storm loops (halo, water) could reach 4. | Loop budget by state: calm = {breathe, gauge ripple}; storm = {AVOID halo × 3, water travel}; breathe and ripple stop at the first WATCH+. |
| W21 | F41/F78b Stretch mini-bar | The global transport is core to D1. | MVP: BottomAccessory (iOS 26) + JS `ScenarioMiniBar` (< 26). |
| W22 | B §13.16 Settings | A pushed root stack with a custom header and RNR switches/selects looks non-native on iOS. | Modal page sheet + SwiftUI Form (§3.5), **with `tint('#6CB4FF')`** (SwiftUI toggles are green by default, which breaks the no-green rule). Accept native 44 pt rows (deviation from 56). |
| W23 | B §12.4 RNR + lucide | lucide glyphs (checkbox, select chevron) next to SF Symbols look mismatched. | Limit RNR to Button / Card / Text / ToggleGroup. Checkboxes use SF `checkmark`. Pickers and menus are native (`@expo/ui`, `Link.Menu`). |
| W24 | B "48 pt everywhere" | Native segmented controls (≈ 32 pt) and Form rows (44 pt) are below 48. | Custom controls keep 48. System controls follow HIG 44 with full-width rows. Record the deviation. |
| W25 | B §13.11 portrait Drive Mode | Overflows on SE during the approach (§2.5 C). | SE: 2-node ribbon, hidden during the approach. Follow map only when leftover ≥ 120 pt. |
| W26 | B §8.9 calm supporting line (~60 chars) | Doesn't fit one line at 13 pt on 375 pt phones. | Short form "18 gauges · 64 crossings · 2 min ago"; hidden on C. |
| W27 | B "Drive this storm" in the player ⋯ menu | 3 taps (breaks the two-tap rule). | Add a secondary "Drive this storm" button on the hero StormCard. |
| W28 | B §13.9 gauge card "View on USGS" | Would open a real gauge page that contradicts the fake readings. | Remove it in the Demo Edition. |
| W29 | B F83 build check "DEMO_MODE fails in preview/production" + debug `__DEV__` only | The Demo Edition *is* the release; the presenter needs controls in Release. | The Demo Director ships in Release, clearly labeled. Delete that CI rule for this edition. |
| W30 | B FreshnessPill tap → Data sources | That target no longer exists. | Tap → `whats-real` (judges land on honesty). Long-press → Demo Director. |
| W31 | design.md 32 pt pill vs B "text on glass ≥ 15 pt semibold" | A 32 pt pill can't hold 15 pt text with padding cleanly. | Pill 36 pt visual / 48 pt hit, `label.lg` 15 pt. |
| W32 | B §13.6 Layers sheet `[≡]` | With simulated data nothing meaningful toggles, and "NWS area alerts" would show fake NWS products. | Remove `layers` and the `[≡]` control. Never draw fake NWS polygons. |

---

## 6. Day-0/Day-1 verification list (everything above tagged [Unverified] that changes a layout)

1. `useSafeAreaInsets().bottom` inside a NativeTabs screen includes the iOS 26 tab bar, and also the BottomAccessory when shown (log both states on a 16/17 and on the SE). → §2.2.
2. Partial-detent RNS formSheets render Liquid Glass on iOS 26 with no custom background. → §3.3.
3. Personal Team: prebuild → strip `aps-environment` → sign → local notification banner on the Lock Screen (`active`). → §0.1, §3.10.
4. Live Activity spike (App Group + extension on a Personal Team). → §3.11; the result decides SHOULD vs MENTION.
5. `tint('#6CB4FF')` recolors SwiftUI Toggles inside `Form` (no green). → §3.5.
6. Conditional `NativeTabs.BottomAccessory` add/remove animates cleanly. → §3.2.
7. `Link.Preview` / `Link.Menu` on rows inside a formSheet; `Link.AppleZoom` into a `fullScreenModal`. → §3.6.
8. The `options` function on `crossing/[id]` re-reads the `peek` param on every push. → §3.3.
9. Real safe-area values on the Air and Pro Max (Simulator). → §2.1.
10. Xcode ≥ 26 on the Mac (`isLiquidGlassAvailable()` true on device). → §0.1.
11. A Release build runs on the device with the Personal Team. → §4 item 30.
12. `drawOn` symbol effect availability (iOS 26) via `@expo/ui` `Image`; else `bounce`. → §3.4.
13. Enhanced EN and ES voices installed and chosen by `getAvailableVoicesAsync()`. → §4 item 26.

---

## Sources

- npm registry (`npm view`, `npm pack`, 2026-10-15): expo@57.0.28 (bundledNativeModules.json), expo-router@57.0.28 (native-tabs types/elements, NativeTabsView.ios.js, native-stack types, link/*.d.ts, useScreens.d.ts), react-native-screens@4.26.2 (types.d.ts, shared ScrollEdgeEffect), expo-glass-effect@57.0.4 (types, GlassEffectModule.swift, GlassView.swift, podspec), expo-blur@57.0.3, expo-symbols@57.0.3, sf-symbols-typescript@2.2.0, @expo/ui@57.0.25 (swift-ui components and modifiers, Picker source doc), expo-haptics@57.0.3, expo-notifications@57.0.22 (plugin, types), @expo/prebuild-config@57.0.19 (withDefaultPlugins.js), expo-widgets@57.0.26 (plugin, Widgets types), expo-template-default@57.0.32, react-native@0.86.3 (RCTAccessibilityManager.mm, ViewAccessibility.d.ts, AccessibilityInfo.d.ts), react-native-reanimated@4.5.1, @maplibre/maplibre-react-native@11.5.0 (Map.d.ts, Camera.d.ts).
- Apple Developer Forums: [thread 84144](https://developer.apple.com/forums/thread/84144) (Personal Teams don't support Push Notifications / iCloud); [thread 834802](https://developer.apple.com/forums/thread/834802) (App Groups and personal-team scoping); [compare memberships](https://developer.apple.com/support/compare-memberships/) (10 App IDs, 7-day expiry); [mybyways.com](https://mybyways.com/blog/new-limitations-imposed-on-free-apple-developer-account) (free-account App ID churn, anecdotal).
- [useyourloaf.com "iPhone 17 Screen Sizes"](https://useyourloaf.com/blog/iphone-17-screen-sizes/) (402 × 874 pt, top inset 62; search snippet). [MacRumors](https://www.macrumors.com/2025/05/30/iphone-sizes-change-next-year-what-to-know/) / [TechRadar](https://www.techradar.com/phones/iphone/new-iphone-17-air-leak-may-have-revealed-some-key-specs-and-how-it-compares-to-the-iphone-17-pro-max) (iPhone 17-family diagonals and leaked resolutions, used only as [Unverified] inputs).
- Repo specs: `docs/master-prompt/02-B1-design-system.md`, `03-B2-templates-screens.md`, `01-A-rules-product-plan.md` §4, `05-D1-mobile-stack-architecture-map.md` §28–§29, `research/design.md`.
