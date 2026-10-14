# FordCast: Phone UI/UX Research and Design System (design.md)

Role: senior mobile product designer. Date: 2026-10-14. Target: Expo SDK 57 (React Native 0.86), iOS 26/27 + Android 15/16, phones 6.1" to 6.9".

**Verification tags**
- `[V-npm]`: checked with `npm view` today.
- `[V-pkg]`: I read the published package source or types (npm pack).
- `[V-calc]`: computed with python3, using WCAG 2.x relative luminance and Machado-2009 CVD matrices at severity 1.0 with CIEDE2000.
- `[V-web: source]`: confirmed by web search results.
- `[U]`: unverified (from my knowledge or a single weak source). Treat these as a hypothesis and test them on a device.

---

## 0. Summary of decisions

| # | Decision | Recommendation | Why (1 line) | Runner-up |
|---|---|---|---|---|
| 1 | Scaffold | `npx create-expo-app@latest` **default template, SDK 57** (`expo-template-default@57.0.30`) | It already includes `NativeTabs`, `expo-glass-effect`, `@expo/ui`, `expo-symbols`, React Compiler, typed routes and an `.icon` (Liquid Glass) app icon. [V-pkg] | Ignite or Obytes starters (heavier, opinionated) |
| 2 | SDK | **Stay on SDK 57** (`expo@57.0.28`, RN 0.86.3, React 19.2.3) [V-npm/V-pkg] | SDK 58 is only `next`/preview (58.0.9) [V-npm]. Do not upgrade before the Oct 26 deadline. | none |
| 3 | Navigation | **expo-router `NativeTabs`** (`expo-router/unstable-native-tabs`) with 4 tabs: **Map · Drive · Replay · Alerts**. Settings is a gear button. | Gets a Liquid Glass tab bar on iOS 26 and a Material bottom nav on Android at no cost. `BottomAccessory` hosts the Replay/Drive mini-player. [V-pkg] | JS `Tabs` with a custom glass background |
| 4 | Sheets | **Native `formSheet` routes** (react-native-screens): `sheetAllowedDetents`, `sheetLargestUndimmedDetentIndex`, `sheetGrabberVisible`. Android supports at most 3 detents. [V-pkg] | iOS 26 gives partial-height sheets a Liquid Glass background automatically. Routes are deep-linkable from notifications. | `@lodev09/react-native-true-sheet@3.11.18` (non-dismissible persistent sheets, grabber a11y labels) [V-pkg]; then `@gorhom/bottom-sheet@5.2.14` |
| 5 | Map renderer (design need) | **`@maplibre/maplibre-react-native@11.5.0`** with a custom "FordCast Night" style JSON on **OpenFreeMap** vector tiles (no API key) | Full style control: dim roads, glowing creeks, `line-gradient` flow animation, `contentInset` above sheets, OfflineManager. [V-pkg]/[V-web: openfreemap.org] | `react-native-maps@1.27.2` (`userInterfaceStyle="dark"` on iOS, `customMapStyle` on Android) [V-pkg]. Works in Expo Go but gives limited styling. |
| 6 | Component kit ("import templates") | **HeroUI Native `1.0.10` + Uniwind `1.12.x` + Tailwind 4** (Apache-2.0). It has Chip, Card, Skeleton, Toast, Tabs, Switch, Slider, ListGroup, BottomSheet and GlassView. [V-pkg] | Polished prebuilt parts that you theme with FordCast tokens. Its dev setup was tested against RN 0.86.3, the same as SDK 57. [V-npm] | Plain `StyleSheet` + `theme.ts` (zero dependencies). Use this if the Uniwind setup fails the Day-0 smoke test. |
| 7 | Native controls | **`@expo/ui`** (`/swift-ui`, `/jetpack-compose`) for Settings switches, pickers, sliders and the M3 `LoadingIndicator` | These are real SwiftUI and Compose controls, which look native on both OSes. [V-pkg] | HeroUI equivalents |
| 8 | Glass | **`expo-glass-effect`**: `GlassView`/`GlassContainer` only on chrome (floating buttons, pills, scrubber). Gate it with `isLiquidGlassAvailable() && isGlassEffectAPIAvailable()` and skip it when Reduce Transparency is on. [V-pkg] | Follows Apple's rule of glass for controls and opaque surfaces for content. Avoids the legibility problems NN/g criticized. | `expo-blur` |
| 9 | Font | **Inter 4.001** (`@expo-google-fonts/inter@0.4.2`), embedded at build time with the `expo-font` config plugin, `tnum` on all numbers [V-pkg] | Large x-height (0.546), has `tnum/case/zero/ss01-08/cv01-14`, and covers Spanish glyphs. Verified with fontTools. | System fonts (SF Pro / Roboto) |
| 10 | Icons | **`expo-symbols`**: SF Symbols on iOS and Material Symbols on Android/web, one component `{ios, android}`. Every name in the §C.4 table was checked against the symbol lists (SF Symbols 1.0–6.0; Material Symbols). [V-pkg] | Native weight and rendering, with animation effects (bounce/pulse/scale) | `@expo/vector-icons` |
| 11 | Charts/viz | **`@shopify/react-native-skia` 2.6.2** (SDK-bundled) for the risk ring, hydrograph and water flow; **`victory-native@42.0.1`** for axis charts in Replay results [V-npm] | GPU drawing, Reanimated-driven, and one stack for everything | `react-native-svg` + Reanimated |
| 12 | Motion | **Reanimated 4.5.1** springs in the `{duration, dampingRatio}` form. `ReduceMotion.System` everywhere. [V-pkg] | Defaults verified: Gentle = damping 120, mass 4, stiffness 900 | none |
| 13 | Widgets + Live Activities | **`expo-widgets@57.0.24`**: React layouts with `banner / compactLeading / compactTrailing / minimal / expanded*`, push tokens, `staleDate`→`isStale` [V-pkg] (Stretch) | First-party Expo. `isStale` lets us show "data may be outdated" instead of a calm state. | `expo-live-activity@0.4.2` (Software Mansion Labs) [V-npm] |
| 14 | Status palette | **Keep v4**, with one verified fix: Avoid **text/icon** red `#FF5A4F` → **`#FF5470`**. Status must use **fill polarity + shape**, never hue alone. | Under deuteranopia, v4 amber and red-text are only ΔE2000 = 10.8 apart (lum ratio 1.40). [V-calc] | Keep `#FF5A4F` and rely only on shape and polarity |
| 15 | Theme | **Dark by default** (night-first). Light is optional. Drive Mode is always "Night" (`#070D18`). | Most vehicle flood deaths happen at night (v4 §1, S2). Android-for-Cars rules require negative polarity at night. [V-web: developers.google.com/cars] | Follow the system setting |

**Build note (important):** MapLibre, expo-widgets and Live Activities require a **development build** (`expo-dev-client@57.0.20`, EAS Build). They do not run in Expo Go [U: standard for custom native modules]. If dev builds are blocked, the MVP fallback is `react-native-maps` in Expo Go. Every spec below has a "degrades to" note for that case.

---

## 1. Teardowns: what makes the best apps look great, and what FordCast borrows

| App | What makes it work (specifics) | FordCast borrows |
|---|---|---|
| **Watch Duty** (wildfire). Won the **2025 ADA Social Impact** award [V-web: 9to5mac.com, techcrunch.com] | The map is the core. A layers menu toggles perimeters, hotspots, cameras and outages, and a legend button explains colors and symbols. Tapping an incident opens a panel with status, acreage, timestamped updates and a **per-incident notification toggle** [V-web: tomsguide.com, bigsurkate.blog]. **Critical Alerts are opt-in**, "infrequent by design" (about 4 incidents in the 2025 season), chosen by a human reporting team, and include a **test alert** button [V-web: support.watchduty.org]. The custom sound was designed to be "alerting but not alarming" [V-web: search summary]. | A **legend button** on the map. **Per-crossing "Notify me"** toggle. **Timestamped update log** on each crossing. A **"Send test alert"** button in Settings. Keep high-urgency alerts rare. The sound should be alerting, not alarming. |
| **Flighty**. **2023 ADA Interaction** [V-web: episteme mirror of Wikipedia] | The design copies airport signage ("our real-world analogy"). The Live Activity starts 3 hours before departure. Compact Dynamic Island: left side shows progress, right side shows gate or time remaining. It keeps working offline by estimating progress. The banner expands when something significant changes. Goal: "boringly obvious" [V-web: 9to5mac.com, cur.at Behind the Design] | Use **road-sign grammar**: amber triangle = Watch, red octagon = Avoid, barricade stripes = Closed. **Live Activity only when it matters** (Drive Mode or a saved route). When data goes stale, show it honestly (expo-widgets `isStale`). Expand only when the state escalates. |
| **Apple Weather** | **Next-hour precipitation** chart with minute-by-minute detail, inherited from Dark Sky. Notifications say when rain will start, "down to the minute" [V-web: support.apple.com/102594, 9to5mac]. iOS 27 added separate Conditions / Precipitation / Wind overviews [V-web: macrumors.com]. Full-bleed condition backgrounds. | A **"Next 90 min" Risk Window** chart (a range bracket, never a countdown). A full-bleed hero that matches the state. |
| **Apple Maps (iOS 26)** | Liquid Glass translucent buttons and streamlined controls [V-web: locationbusinessnews.com]. Partial-height sheets get glass and **edges pull in** at smaller heights; at full height the glass becomes opaque [V-web: developer.apple.com/videos/wwdc2025/323]. Sheets can morph out of the button that opens them. | A **native formSheet** for the crossing card. Glass chrome over the map. Morph transitions (`Link.AppleZoom` [V-pkg]). |
| **Google Maps** | M3 Expressive refresh pins key buttons (Directions, Start, Save, Share) to the bottom of place sheets [V-web: tomsguide.com, 8bittoast.com]. 2026 "Immersive Navigation" [V-web: kold.com]. | Pin the **primary actions to the bottom** of the crossing sheet (Detour · Notify · Share), where the thumb reaches. |
| **Waze** | Hazard reports are color-coded so they are easy to spot. Crash-prone road segments are drawn red instead of the usual route color [V-web: iclarified, topauto]. The night palette has gaps (the light search area) [V-web: soyacincau]. | Draw **at-risk segments on the route itself** (route line turns red near an Avoid crossing). The night theme must be dark **everywhere**, including search. |
| **Citizen** | Color shows **risk plus recency**: red = major and updated under 2 hours ago, yellow = recent but less likely to affect you, **gray = older than 2 hours** [V-web: medium.com/citizen]. Dark map. Restraint: fewer hooks when things are quiet [V-web: eyeondesign.aiga.org]. | **Staleness turns gray (Unknown)**. A calm state means fewer notifications, never "engagement" pings. |
| **Carrot Weather** | Modular "Sections" layout with presets and a preview before applying [V-web: macstories.net]. | Keep a fixed layout for safety. Do **not** copy deep customization, only the clean modular cards. |
| **Windy / MyRadar / Zoom Earth** | A timeline with play/pause, a scrub bar and speed control. Users complain playback is too fast (they suggest 1 to 2 seconds per hour) [V-web: community.windy.com]. MyRadar has an adjustable loop length, speed and opacity [V-web: ipadpilotnews]. Zoom Earth has a crosshair readout while panning [V-web: appaloosa]. | **Replay scrubber**: play/pause, 30×/60×/120×, step buttons, event ticks, readable default speed (60× means 1 min of storm per second). |
| **FEMA app** | One consistent navigation menu. Alerts for up to 5 zip-code locations [V-web: 3blmedia, tetratech]. | **Saved places** (Home/School/Work) drive the alert targeting. |
| **Tesla app** | Commonly praised dark, minimal controls. A critique says "grey-on-grey makes what's active hard to see" [V-web: teslamotorsclub]. | High-contrast **active states**. Never encode on/off in gray-on-gray. |
| **Tide Guide**. **2026 ADA Visuals & Graphics** [V-web: apple.com newsroom via search, pocketgamer.biz] | Full-screen tide charts. A Liquid Glass design whose palette tracks the time of day. Lock-screen widgets and Live Activities for the current tide [V-web: apps.apple.com listing, forbes.es]. This is the **closest data-viz analog** (water level over time). | Make the **hydrograph the hero** of the crossing sheet. Large, calm water curves. Widgets that show the current upstream trend. |
| **oko**. **2024 ADA Inclusivity** [V-web: iphoneincanada.ca] | Tells blind pedestrians the walk-signal state with haptics and audio. | **Haptic + voice grammar** for each state (§D). The app must work eyes-free. |
| **Gentler Streak**. **2024 ADA Social Impact** [V-web: bgr.com] | Calm, non-judgmental tone [U: from memory]. | Calm-state tone: informative and quiet, never "all good". |
| **Moonlitt**. **2026 ADA Interaction** [V-web: 9to5mac/pocketgamer via search] | A one-glance celestial data app [U]. | Glanceable widgets. |

**Five lessons that matter most:** (1) the map is the product, and chrome floats; (2) sign-like shapes beat colors; (3) recency/staleness is a visible state; (4) urgent alerts are rare and opt-in; (5) data viz is the hero, not decoration.

---

## 2. Platform design language (late 2026)

**iOS 26 Liquid Glass**
- Liquid Glass is a functional layer for **controls and navigation** that floats above content. Content stays opaque. Do not stack glass on glass [V-web: WWDC25-323 + third-party HIG summaries].
- Tab bars become glass automatically and can **minimize on scroll** [V-web]. In Expo this is `NativeTabs minimizeBehavior: 'automatic'|'never'|'onScrollDown'|'onScrollUp'` (iOS 26+) [V-pkg].
- Sheets: glass at partial height, opaque at full height. Apple suggests removing custom `presentationBackground` [V-web: WWDC25-323].

**iOS 27 (WWDC26, shipped fall 2026)**
- Adds a **user transparency slider** (clear to fully tinted) in place of the two fixed modes.
- Less transparency by default, better diffusion, less over-rounded corners, and toolbars return in some apps [V-web: tomsguide.com, bgr.com, tapsmart.com].
- **Implication:** never depend on how transparent glass is. Text-bearing surfaces must reach contrast targets even with fully clear glass, which is why content surfaces are opaque here.

**NN/g critique (Oct 2025)**
- "Liquid Glass Is Cracked, and Usability Suffers in iOS 26": translucent controls over busy content lose contrast [V-web: anderegg.ca, osnews.com summaries].
- FordCast's safety role means legibility wins over spectacle.

**Material 3 Expressive (May 2025)**
- Based on 46 studies with more than 18,000 participants. Key elements were found up to 4× faster [V-web: dezeen, fastcompany, neowin].
- Spring-based motion, 35 shapes, emphasized type, and an M3 Expressive Figma kit [V-web: codelabs.developers.google.com].
- `@expo/ui/jetpack-compose` ships `LoadingIndicator`, `HorizontalFloatingToolbar`, `SegmentedButton`, `Snackbar`, `ModalBottomSheet` and `Carousel` [V-pkg].

**Cross-platform rule: "Same layout, native skin."**

| Element | iOS 26/27 | Android 15/16 |
|---|---|---|
| Tab bar | NativeTabs → glass capsule, SF Symbols (`sf="map.fill"`) | NativeTabs → M3 bottom nav, Material Symbols (`md="map"`) [V-pkg] |
| Floating buttons/pills | `GlassView` (regular, tint `#0E1726`) | Tonal surface `surface2` at 96% + 1dp outline |
| Sheets | formSheet (glass at partial, system concentric radius) | formSheet → native Android bottom sheet [U: implementation], 28dp top radius [U: M3 spec], max 3 detents [V-pkg] |
| Toggles/pickers | `@expo/ui/swift-ui` Toggle/Picker | `@expo/ui/jetpack-compose` Switch/SegmentedButton |
| Toasts | HeroUI Toast (top, under Dynamic Island) | Snackbar style (bottom, above nav) |
| Back | swipe + chevron | predictive back. The template sets `predictiveBackGestureEnabled: false` [V-pkg]. Keep it off for MVP. |
| Haptics | `notificationAsync`, `impactAsync`, `selectionAsync` | `performAndroidHapticsAsync(AndroidHaptics.*)` [V-pkg] |

---

## 3. Map-first layout and information architecture

### 3.1 Information architecture
```
NativeTabs ─┬─ Map      (map.fill / map)            ← default; legend, layers, search, status card
            ├─ Drive    (car.fill / directions_car) ← Check My Drive, saved places/routes, Start Drive Mode
            ├─ Replay   (clock.arrow.circlepath / history) ← storm picker → player → results
            └─ Alerts   (bell.fill / notifications) ← inbox/history, badge = unread Avoid/Closed
Modal routes: /crossing/[id] (formSheet) · /nearby (formSheet) · /layers (formSheet, fitToContents)
              /drive-mode (fullScreenModal) · /settings/* (stack, from gear) · /onboarding/* · /crew (list)
BottomAccessory (iOS 26+): live Replay mini-player OR "Drive Mode on" pill. Android/older iOS: JS mini-bar above tabs.
```
**Two-tap rule (v4).**
- Check My Drive takes 1 tap (Drive tab).
- Drive Mode takes 1 tap (big button on the Map status card and on the Drive tab).
- Storm Replay takes 1 tap.
- A crossing takes 1 tap on its marker.
- The detour takes 2 taps (crossing → Detour).

### 3.2 Map Home geometry (393×852 pt reference frame: 6.1")
Also check 402×874 (6.3") and 440×956 (6.9") [U: device sizes]. Never hardcode insets; use `react-native-safe-area-context`.

- **Top band (status bar plus 8):**
  - Left: **Freshness capsule**, a glass pill 32pt high with a 44pt hit area. Text: "Live · 2 min ago".
  - Right: **Gear** (glass circle 44pt) and **Legend "?"** (44pt).
  - Do not put critical content under the Dynamic Island.
- **Right edge, lower third (thumb zone):** vertical `GlassContainer` with **Layers** and **Locate me**, each 44pt, 8pt gap. It sits 16pt above the status card.
- **Bottom (above tab bar):** **Area Status Card**. This is an opaque `surface1` card with a 24pt radius, 16pt side margins and a minimum height of 112pt. It holds the search field (44pt), the area headline, and two primary buttons: **Check my drive** and **Drive Mode**. Swiping it up or tapping "See nearby" opens the `/nearby` formSheet.
- **Map `contentInset`** = {top: safeTop+56, bottom: cardHeight+tabBar+16}. Markers and the user dot then stay centered in the visible area. Use the `Map` `contentInset` prop [V-pkg].
- **Thumb reach:** on 6.7 to 6.9" phones, the top 25% of the screen is out of one-handed reach [U: common ergonomics guidance]. Only the freshness/info and settings live there. Every action lives in the bottom 45%.
- **Touch targets:** at least **44×44 pt** on iOS and **48×48 dp** on Android, with ≥8pt between targets [V-web: secondary sources citing HIG/M3]. FordCast uses **48 everywhere**. Drive Mode uses **76** (Android for Cars) [V-web: developers.google.com/cars].

### 3.3 Crossing sheet detents (formSheet)
- `sheetAllowedDetents: [0.32, 0.62, 1.0]` = peek, half, full. These are fractions of screen height. Android supports up to 3, which fits exactly [V-pkg].
- `sheetLargestUndimmedDetentIndex: 1`, so the map stays interactive at peek and half.
- `sheetGrabberVisible: true` and `sheetInitialDetentIndex: 0`.
- Listen to `sheetDetentChange` {index, stable} to update the map `contentInset`, so the crossing stays visible above the sheet [V-pkg].

---

## 4. Night and driving legibility
1. **Polarity:** at night, dark backgrounds with light text (negative polarity) are required for driving UIs [V-web: developers.google.com/cars visual principles].
2. **No pure white on pure black.**
   - Text `#F2F5FA` on `#0E1726` = **16.44:1** [V-calc]. That is within the 12–16:1 comfort band some guides suggest to reduce halation [V-web: dark-mode guides; evidence is weak].
   - Drive Mode text is `#E6EBF2` on `#070D18` = **16.23:1** [V-calc].
3. **Glance budget:** each glance ≤ **2 s** and each task ≤ **12 s** total. That is about 6 touches at most [V-web: NHTSA 2013 via autoblog/kbb]. Drive Mode therefore has **one** decision per screen and allows no typing.
4. **Sizes in Drive Mode:**
   - Decision-critical text **≥ 32pt**, secondary text **≥ 24pt**.
   - **76pt** targets with **≥ 24pt** gaps.
   - **≤ 120 characters** per message [V-web: developers.google.com/cars].
5. **Numbers:** always Inter `tnum`, so digits do not jitter as values update. Show ranges with an en dash ("15–30 min"). Inter has U+2013 [V-pkg].
6. **Map glare:** dim the basemap. Roads sit at 1.2–1.9:1 against land. Labels are ≥ 6:1. Creeks are ≥ 3:1. Status markers are ≥ 3.3:1 [V-calc, §A.4].
7. **No flashing:** pulses are smooth scale/opacity changes at ≤ 1 cycle per 2 s. Nothing approaches 3 flashes per second (WCAG 2.3.1) [U: WCAG threshold from memory].
8. **Brightness:** the app never forces brightness up. Drive Mode uses `expo-keep-awake` only.

---

## 5. Data visualization on the phone
| Viz | Spec |
|---|---|
| **Upstream hydrograph** (hero) | Skia path. Last **6 h** of stage (ft) at the upstream gauge. Line: cyan `#2BD9D9`, 2.5pt, with a 12% cyan area fill fading down. **Trigger stage**: dashed amber line `#F5A623` (4/4 dash) labeled "Trigger 6.0 ft". **Now dot**: 8pt with a white 2pt ring. **Rate badge** above it: "+3.1 ft / 30 min" (num.md, tnum). Axis labels: num.sm `text.tertiary`. Gridlines: `border.subtle`. Height: 120pt at half detent, 200pt at full. |
| **Lag pair** (Replay and full detent) | Two aligned mini-hydrographs, "Upstream gauge" and "At the road (sensor)". A dashed connector from the upstream rise to the road rise is labeled **"≈ 38 min travel"**. This is the visual proof of the learned travel time τ. |
| **Risk ring** | Skia arc, 96pt diameter (64pt in the peek header), 10pt stroke, round caps. Track is `surface3`. The fill color matches the state: slate, then amber, then red, then red with a stripe texture for Closed, and a dashed gray ring for Unknown. The center holds the **state glyph plus word**. It fills over 700ms with `spring.gentle` and jumps instantly under reduced motion. The ring shows the **state level**, not a raw probability. Probability (if the ML model exists) appears only on the full detent as "Model: ~70% chance within 60 min (calibrated)". |
| **Risk Window** ("Next 90 min") | A horizontal track with ticks at **Now · 30 · 60 · 90 min**. Inside it, a shaded **range bracket** (e.g., 15–30) in red with the label "Likely flooded". An amber band marks "Possible". No moving countdown. When time passes, the bracket shifts once per update, not continuously. |
| **Water travel animation** | On the map, along the NHDPlus flowline from gauge to crossing: a MapLibre `line-gradient` (requires `lineMetrics: true` on the GeoJSON source [U: style-spec rule]). The animated stop moves from 0 to 1 over 2.4 s (scaled by length), then holds at the crossing. The core is 3pt `#2BD9D9` with a 10pt glow (opacity 0.3, blur 6). Under reduced motion: static arrowheads every 120pt plus a label "≈ 38 min to crossing". *Degrades to* (react-native-maps): three stacked Polylines with stepped opacity. |
| **Replay scrubber** | See §E/§F. Event ticks: ▲ Watch issued (amber), ◆ Avoid issued (red), ● water over road observed (white with cyan ring), ▮ official closure (red stripes). |
| **Replay results chart** | victory-native bar chart of lead time per crossing, with a median line, POD/FAR/CSI tiles, and a baseline-vs-ML toggle. |

---

## 6. Motion and haptics (principles; tokens in §D)
- Motion explains **cause → effect**: water moves, the state changes, then the card appears. It never decorates.
- Only **two looping animations** are allowed on screen at once (Avoid halo pulse and water travel). Everything else is one-shot.
- Every animation passes `reduceMotion: ReduceMotion.System` and reads `useReducedMotion()` [V-pkg].
- **Haptics are semantic.** Escalation uses Warning or Error. **De-escalation never uses "Success"**, because a success buzz implies "safe".

---

## 7. Calm-state design (about 99% of the time)
**Goal:** the calm state must look premium and stay useful, without ever implying safety.

**Copy rules**
- **Banned anywhere:** "safe", "all clear", "clear", "passable", "OK", "good to go", "low risk", "normal", "open" (unless quoting an official source exactly), green checkmarks on crossings, the "Success" haptic, and countdown timers.
- **Approved calm vocabulary:**
  - State: **"No current signal"**
  - Area headline: **"No upstream rise detected near you"**
  - Supporting line: **"Watching 18 upstream gauges for 64 crossings · updated 2 min ago"**
  - Footer, always visible on the status card: **"Water can cover a road without warning. Turn around, don't drown."**
- In Spanish:
  - "Sin señal actual"
  - "No se detecta subida río arriba cerca de usted"
  - "¡Dé la vuelta, no se ahogue!" This is the official NWS Spanish slogan and a registered trademark of the Dept. of Commerce [V-web: weather.gov flyer/flash card].

**What fills the calm screen**
1. A live "watching" pulse on the freshness capsule: one 2 s breathe every 10 s, which proves the system is alive.
2. Upstream gauges shown as small cyan dots on creeks (tap for the current stage).
3. Saved routes with "No current signal on route · as of 7:02 AM".
4. Storm Replay invitation card: "See how FordCast handled Memorial Day 2015 →".
5. "How FordCast works" card, shown on the first week only.

**Calm map styling:** creeks at 50% cyan, slate No-signal dots at z ≥ 11 only, and clusters below that. The map reads as quiet blue-gray with thin cyan veins, which is beautiful without looking "green".

---

## 8. Onboarding, permissions, Live Activity, widgets, notifications, icon (summary; wireframes in §F)

**Onboarding:** 4 pages plus permission priming. The language toggle EN/ES is on page 1. The safety pledge is required.

**Permission ladder (progressive)**
1. Location **When In Use** at the first map view, after a priming screen.
2. **Notifications** after the user saves a place or route, or when they enable "Alert me".
3. **Always/background** location only when they turn on "Alert me while I drive (background)".
   - iOS: the ≤20-region rotation is explained as "we watch the nearest at-risk crossings" [V-web: Apple startMonitoring docs snippet: 20 regions].
   - Android: send the user to Settings for "Allow all the time" [U: Android 11+ behavior].

Every priming screen has a **"Not now"** option, and the app stays fully usable without the permission.

**Live Activity (Avoid alert):**
- Starts only during Drive Mode or for an Avoid/Closed crossing on a saved route that is active now.
- `staleDate` = now + 15 min.
- `isStale` shows the gray "Data may be outdated · open FordCast".
- No timers. Ends 30 min after the state drops below Watch, with dismissal `after(+15 min)` [V-pkg].
- Lifetime: up to about 8 h active plus 4 h on the Lock Screen [V-web: Apple forums quoting docs].

**Widgets (Stretch, iOS via expo-widgets):** small (nearest watched crossing), medium (route status), and lock-screen rectangular/circular/inline. Android widgets in expo-widgets are opt-in (`enableAndroid`) and early (Glance-based) [V-pkg] → **Roadmap** on Android (runner-up: `react-native-android-widget@0.22.1` [V-npm]).

**Notifications:**
- iOS `interruptionLevel`: Avoid/Closed = **`timeSensitive`**, Watch = `active`, summaries = `passive` [V-pkg: expo-notifications types].
- **Critical Alerts are Roadmap.** They need Apple entitlement approval, and Watch Duty shows the right pattern: opt-in, rare, human-gated [V-web].
- Android channels: `crossing-urgent` (HIGH), `crossing-watch` (DEFAULT), `summaries` (LOW).

**App icon:** see §C.6.

---
## A. Design tokens: color

### A.1 Status system (the core)
Every state is encoded **four ways**: shape + glyph + word + color/polarity. **Closed** also adds stripes, and **Unknown** adds a dashed outline.

| State | Word (EN / ES) | Map marker | Chip | Text/icon color (dark) | Light theme | Haptic on enter |
|---|---|---|---|---|---|---|
| **No current signal** | No current signal / Sin señal actual | 10pt **hollow circle**, 2pt slate stroke | outline chip: slate border, slate text, no fill | `#8A97AB` (6.07:1 on bg) | `#5E6B80` (4.99) | none |
| **Watch** | Watch / Vigilancia | 28pt **rounded triangle**, amber fill, ink `!` glyph, 20% amber halo | **amber fill `#F5A623` + ink `#0E1726`** (8.86) | `#F5A623` (8.86) | fill only. Text, if unavoidable, `#9A5B00` (5.01) | Warning |
| **Avoid** | Avoid / Evite | 32pt **rounded octagon**, red fill `#C62828`, white glyph, 2pt white rim, 2 s halo pulse | **red fill `#C62828` + white** (5.62) + 1pt `#FF5470` rim on surfaces | **`#FF5470`** (5.78; replaces `#FF5A4F` 5.84) | `#C62828` text (5.20) | Error |
| **Flooded / Closed** | Flooded – Closed / Inundado – Cerrado | 32pt octagon with **white 45° barricade stripes**, no pulse. A small shield badge appears if the source is official. | red fill + white + stripe texture + "OFFICIAL" micro-label | `#FF5470` | `#C62828` | Error |
| **Unknown – data offline** | Unknown – data offline / Desconocido – sin datos | 24pt **dashed ring** (3/3) `#7A879C` with `?` glyph, no fill | dashed outline chip | `#8A97AB` text, `#7A879C` ring (4.94) | `#5E6B80` / `#6B7890` | Light impact (no alarm) |
| **Replay mode** (meta) | REPLAY / REPRODUCCIÓN | violet "REPLAY" banner + striped top edge | violet fill `#B69CFF` + ink (7.86) | `#B69CFF` (7.86) | `#5B3CC4` (7.27) | none |

**Verified CVD problem and fix [V-calc]** (Machado-2009, severity 1.0, CIEDE2000):

| Pair (dark theme) | Normal ΔE | Protan ΔE | Deutan ΔE | Tritan ΔE | Deutan lum ratio |
|---|---|---|---|---|---|
| amber `#F5A623` vs red-text **`#FF5A4F`** (v4) | 32.5 | 20.9 | **10.8 ⚠** | 16.6 | 1.40 |
| amber vs **`#FF5470`** (proposed) | 41.1 | 28.2 | **15.8** | 16.7 | — |
| amber **fill** vs red **fill** `#C62828` (chips/markers) | 40.6 | 37.3 | **24.8** | 25.6 | **2.51** (strong polarity cue) |
| light theme: amber-text `#9A5B00` vs `#C62828` | — | 9.6 | **2.7 ✖** | 11.1 | 1.06 |

**Rules that follow from this:**
1. Status is always shown with a chip or marker, using fill polarity plus shape. Colored text alone is never the only cue.
2. Light theme never uses amber as text color.
3. The v4 numbers were re-verified: slate 6.07, amber 8.86, red 5.84, chip 5.62, cyan 10.29. They match v4's 6.1/8.9/5.8/5.6/10.3 [V-calc].

### A.2 Dark theme (default): full token table [V-calc ratios]
| Token | Hex | Use | Contrast notes |
|---|---|---|---|
| `bg.canvas` | `#0E1726` | app background (v4) | — |
| `map.land` | `#0B1320` | basemap land (slightly darker, so UI floats) | — |
| `surface.1` | `#152033` | cards, sheet content, status card | primary text 14.94 |
| `surface.2` | `#1C2940` | inputs, segmented track, secondary buttons | primary 13.34 · red-text 4.74 ✓ · slate 4.93 ✓ |
| `surface.3` | `#24344F` | pressed/selected, popovers | primary 11.44 · **red-text 4.07 ✖, slate 4.23 ✖**. No small status text here. |
| `scrim` | `rgba(5,9,16,0.60)` | modal dim | — |
| `text.primary` | `#F2F5FA` | body, titles | 16.44 on bg |
| `text.secondary` | `#B4BFD0` | supporting text | 9.67 bg · 7.85 s2 |
| `text.tertiary` | `#8A97AB` | timestamps, axis labels | 6.07 bg · 4.93 s2 · not on s3 |
| `text.disabled` | `#5B6880` | disabled (WCAG-exempt) | 2.90 s1 |
| `text.onAccent` | `#0E1726` | ink on amber/cyan/violet/inverse | 8.86 / 10.29 / 7.86 |
| `border.subtle` | `#2A3A55` | hairlines (decorative) | 1.57 |
| `border.strong` | `#3A4D6E` | dividers in dense lists | 2.11 |
| `border.input` | `#6B7890` | input and checkbox outlines (needs ≥3:1) | **3.67 on s1 ✓** |
| `focus.ring` | `#6CB4FF` | 2pt keyboard/switch-control focus | 7.47 s1 |
| `accent.link` | `#6CB4FF` | links, toggles-on track | 8.22 bg |
| `action.primary.bg` / `.fg` | `#F2F5FA` / `#0E1726` | **inverse pill** primary CTA (no hue, so no status confusion) | 16.44 |
| `action.secondary.bg` / `.fg` | `#1C2940` / `#F2F5FA` | secondary buttons | 13.34 |
| `status.noSignal` | `#8A97AB` | see A.1 | 6.07 |
| `status.watch` | `#F5A623` | see A.1 | 8.86 |
| `status.avoid.fg` | **`#FF5470`** | Avoid text/icons | 5.78 bg / 5.25 s1 / 4.69 s2 |
| `status.avoid.fill` | `#C62828` | chips, markers (white on it) | 5.62 white · 3.19 vs bg · **2.90 vs s1 → add 1pt `#FF5470` rim** |
| `status.unknown` | `#7A879C` | dashed rings | 4.94 bg |
| `water` | `#2BD9D9` | hydrograph line, creeks (active) | 10.29 |
| `water.calm` | `rgba(43,217,217,0.50)` | creeks (calm) | ≈3.0+ vs land (0.45 → 3.04 ✓) |
| `route` | `#5AA9FF` | route line, user dot | 7.32 bg. vs water ΔE 28.2 (deutan 15.9) → route is always 6pt with a casing, creeks 3pt |
| `replay` | `#B69CFF` | replay mode | 7.86 |

### A.3 Light theme (opt-in daytime)
| Token | Hex | Contrast |
|---|---|---|
| `bg.canvas` | `#F4F6FA` | — |
| `surface.1` / `.2` / `.3` | `#FFFFFF` / `#EAEEF4` / `#DDE3EC` | — |
| `text.primary` | `#0E1726` | 16.60 bg |
| `text.secondary` | `#3F4B60` | 8.13 bg |
| `text.tertiary` / `status.noSignal` | `#5E6B80` | 4.99 bg · 5.40 white · 4.64 s2 |
| `border.input` | `#76839A` | 3.83 white · 3.54 bg |
| `status.watch.fill` + ink | `#F5A623` + `#0E1726` | 8.86. The marker gets a 1.5pt `#0E1726` outline, because amber vs land is only 1.79. |
| `status.avoid.fg` / `.fill` | `#C62828` / `#C62828` + white | 5.20 bg / 5.62 |
| `water` | `#0A7C80` | 4.61 bg |
| `route` | `#1A66D9` | 4.92 bg |
| `replay` | `#5B3CC4` | 7.27 white |
| `action.primary` | bg `#0E1726`, fg `#FFFFFF` | 17.96 |

### A.4 Map overlay colors ("FordCast Night" style) [V-calc vs land `#0B1320`]
| Layer | Value | Ratio vs land |
|---|---|---|
| minor / major / highway roads | `#1A2638` / `#24344D` / `#31445F` | 1.22 / 1.48 / 1.88 (quiet by design) |
| road labels / place labels | `#8A97AB` / `#A9B4C4` (halo `#0B1320` 1.5pt) | 6.29 / 8.87 |
| basemap water polygons / waterway lines | `#0F2236` / `#1E4A63` | 1.15 / 1.96 |
| **FordCast watched creeks** (NHDPlus GeoJSON) | calm `#2BD9D9` @ 0.5, active 1.0 + glow | 3.0+ / 10.66 |
| route line | `#5AA9FF` 6pt + 9pt `#0B1320` casing | 7.58 |
| Avoid area (detour avoid polygon) | fill `#FF5470` @ 0.14 + dashed 1.5pt `#FF5470` outline | outline 5.99 |
| Watch halo / Avoid halo | amber @ 0.20 / red @ 0.25, radius 22–40pt | — |
| user location | `#5AA9FF` 14pt dot, 3pt `#F2F5FA` ring, heading cone @ 0.25 | 7.58 |

**How to build the style:** fork OpenFreeMap's `dark` style (`https://tiles.openfreemap.org/styles/dark`) [V-web: community repo, U for current availability] or `positron`, then recolor it with the values above. Bundle the style JSON in the app and point the source at OpenFreeMap tiles. Keep the attribution ON ("© OpenStreetMap", which MapLibre adds) [V-web: openfreemap.org]. Runner-up: Protomaps `@protomaps/basemaps@5.7.2` "dark"/"black" flavors with overrides (code BSD-3, design CC0, tiles ODbL) [V-npm, V-web: docs.protomaps.com]. Note that PMTiles is confirmed on MapLibre Android ≥11.7, but iOS is unconfirmed [V-web], so prefer z/x/y tiles.

### A.5 Glass and elevation rules
1. **Glass = chrome only:** floating icon buttons, freshness capsule, search pill (when it floats), map control cluster, Replay scrubber chrome, tab bar and sheet chrome.
2. **Content is opaque:** status card, crossing sheet body, lists and alerts use `surface.1`/`.2`.
3. **Text on glass:**
   - Only `text.primary` at ≥15pt semibold.
   - Fallback scrim when glass is unavailable: `rgba(14,23,38,0.80)`. The worst case over a white map pixel then gives primary 8.84 and secondary 5.20 [V-calc].
   - At 0.72 alpha, secondary text fails over white (3.86) [V-calc].
4. **Never glass on glass.** Group adjacent glass controls in `GlassContainer spacing={8}` [V-pkg].
5. **Reduce Transparency on**, glass unavailable, or Android: use `surface.2` @ 0.96 + 1pt `border.subtle`.
6. **Elevation by lightness, not shadow** (dark mode): canvas → s1 → s2 → s3. Floating elements over the map add `boxShadow: '0 8px 24px rgba(0,0,0,0.35)'` [U: RN ≥0.76 `boxShadow` style on New Arch] plus a 1pt top highlight `rgba(255,255,255,0.06)`.
7. `GlassView` props: `glassEffectStyle="regular"`, `tintColor="rgba(14,23,38,0.55)"`, `colorScheme="dark"`, and `isInteractive` on buttons [V-pkg].

### A.6 `theme.ts` (source of truth: paste as-is)
```ts
// src/theme/tokens.ts: FordCast design tokens v1 (contrast verified 2026-10-14)
export const palette = {
  navy950: '#070D18', navy900: '#0B1320', navy850: '#0E1726', navy800: '#152033',
  navy750: '#1C2940', navy700: '#24344F', navy600: '#2A3A55', navy550: '#3A4D6E',
  slate500: '#6B7890', slate450: '#7A879C', slate400: '#8A97AB', slate300: '#B4BFD0',
  white: '#FFFFFF', ice: '#F2F5FA', iceDim: '#E6EBF2',
  amber500: '#F5A623', amber800: '#9A5B00',
  red600: '#C62828', red400: '#FF5470',
  cyan400: '#2BD9D9', cyan700: '#0A7C80',
  blue400: '#5AA9FF', blue300: '#6CB4FF', blue700: '#1A66D9',
  violet300: '#B69CFF', violet700: '#5B3CC4',
} as const;

export type RiskState = 'NO_SIGNAL' | 'WATCH' | 'AVOID' | 'CLOSED' | 'UNKNOWN';

export const dark = {
  bg: palette.navy850, mapLand: palette.navy900, surface1: palette.navy800, surface2: palette.navy750,
  surface3: palette.navy700, scrim: 'rgba(5,9,16,0.60)', glassTint: 'rgba(14,23,38,0.55)',
  glassFallback: 'rgba(14,23,38,0.80)',
  text: { primary: palette.ice, secondary: palette.slate300, tertiary: palette.slate400,
          disabled: '#5B6880', onAccent: palette.navy850 },
  border: { subtle: palette.navy600, strong: palette.navy550, input: palette.slate500, focus: palette.blue300 },
  action: { primaryBg: palette.ice, primaryFg: palette.navy850, secondaryBg: palette.navy750, secondaryFg: palette.ice },
  water: palette.cyan400, waterCalm: 'rgba(43,217,217,0.50)', route: palette.blue400, link: palette.blue300,
  replay: palette.violet300,
  status: {
    NO_SIGNAL: { fg: palette.slate400, fill: 'transparent', ink: palette.slate400, border: palette.slate400 },
    WATCH:     { fg: palette.amber500, fill: palette.amber500, ink: palette.navy850, border: palette.amber500 },
    AVOID:     { fg: palette.red400,   fill: palette.red600,   ink: palette.white,   border: palette.red400 },
    CLOSED:    { fg: palette.red400,   fill: palette.red600,   ink: palette.white,   border: palette.red400 },
    UNKNOWN:   { fg: palette.slate400, fill: 'transparent', ink: palette.slate400, border: palette.slate450 },
  } satisfies Record<RiskState, { fg: string; fill: string; ink: string; border: string }>,
} as const;

export const light = {
  bg: '#F4F6FA', mapLand: '#EEF1F5', surface1: '#FFFFFF', surface2: '#EAEEF4', surface3: '#DDE3EC',
  scrim: 'rgba(14,23,38,0.40)', glassTint: 'rgba(255,255,255,0.55)', glassFallback: 'rgba(255,255,255,0.88)',
  text: { primary: palette.navy850, secondary: '#3F4B60', tertiary: '#5E6B80', disabled: '#9AA5B6', onAccent: palette.navy850 },
  border: { subtle: '#D5DCE6', strong: '#B8C2D1', input: '#76839A', focus: palette.blue700 },
  action: { primaryBg: palette.navy850, primaryFg: palette.white, secondaryBg: '#EAEEF4', secondaryFg: palette.navy850 },
  water: palette.cyan700, waterCalm: 'rgba(10,124,128,0.55)', route: palette.blue700, link: palette.blue700,
  replay: palette.violet700,
  status: {
    NO_SIGNAL: { fg: '#5E6B80', fill: 'transparent', ink: '#5E6B80', border: '#5E6B80' },
    WATCH:     { fg: palette.navy850, fill: palette.amber500, ink: palette.navy850, border: palette.navy850 },
    AVOID:     { fg: palette.red600, fill: palette.red600, ink: palette.white, border: palette.red600 },
    CLOSED:    { fg: palette.red600, fill: palette.red600, ink: palette.white, border: palette.red600 },
    UNKNOWN:   { fg: '#5E6B80', fill: 'transparent', ink: '#5E6B80', border: '#6B7890' },
  },
} as const;

export const driveNight = { ...dark, bg: palette.navy950, text: { ...dark.text, primary: palette.iceDim } } as const;
```

---

## B. Typography

**Decision:** use **Inter 4.001** for all custom UI text on both platforms. System components (tab bar, native sheets, alerts) keep SF Pro / Roboto, and Inter sits comfortably next to them.

**Alternatives considered**
- **SF/system font:** best Dynamic Type integration, but different metrics on each OS, so wireframes would differ.
- **Geist:** trendy and technical-looking. Less proven for long Spanish copy [U].
- **Manrope:** geometric, with weaker small-size legibility [U].
- **Inter Tight:** not needed. Use Inter with negative tracking instead.

**Loading**
- Embed **400, 500, 600 and 700** with the `expo-font` config plugin (`fonts`, plus `android.fonts` xml families so `fontWeight` maps correctly) [V-pkg]. This avoids a flash of unstyled text and an async font load.
- Use the TTFs from `@expo-google-fonts/inter@0.4.2` (`Inter_400Regular` … `Inter_700Bold`) [V-pkg].
- **Numerals:** `fontVariant: ['tabular-nums']` on every number [U: RN supports `tabular-nums` on both OSes].

**Tracking** follows Inter's dynamic-metrics formula, `a + b·e^(c·size)` with a=-0.0223, b=0.185, c=-0.1745 [U: constants recalled from rsms.me/inter; computed values V-calc].

| Token | Size/Line (pt) | Weight | Tracking (pt) | maxFontSizeMultiplier | Use |
|---|---|---|---|---|---|
| `display.xl` | 56/60 | 700 | -1.25 | 1.2 | Drive Mode range "15–30" |
| `display.lg` | 44/48 | 700 | -0.98 | 1.25 | Replay "38 MIN EARLIER" |
| `display.md` | 34/40 | 700 | -0.74 | 1.3 | screen large titles |
| `title.lg` | 28/34 | 600 | -0.59 | 1.4 | sheet titles, crossing name at half/full |
| `title.md` | 22/28 | 600 | -0.40 | 1.5 | section titles |
| `title.sm` | 20/25 | 600 | -0.33 | 1.6 | card titles |
| `headline` | 17/22 | 600 | -0.22 | 2.0 | row titles, button labels (large) |
| `body.lg` | 17/24 | 400 | -0.22 | 2.0 | main reading text |
| `body.md` | 15/21 | 400 | -0.13 | 2.0 | supporting text |
| `callout` | 16/21 | 500 | -0.18 | 2.0 | inline emphasis, list subtitles |
| `label.lg` | 15/20 | 600 | -0.13 | 1.6 | buttons |
| `label.chip` | 13/16 | 700, UPPERCASE | +0.6 | 1.5 | status chips ("AVOID") |
| `caption` | 13/18 | 400 | -0.04 | 2.0 | timestamps "as of 10:42 PM" |
| `caption.sm` | 12/16 | 500 | 0.0 | 1.8 | axis labels, map labels (non-essential only) |
| `num.xl` | 40/44 | 600 tnum | -0.89 | 1.3 | ETA range on card |
| `num.lg` | 28/32 | 600 tnum | -0.59 | 1.4 | stage "6.8 ft" |
| `num.md` | 17/22 | 600 tnum | -0.22 | 1.8 | rates, distances in rows |
| `num.sm` | 13/16 | 500 tnum | -0.04 | 1.8 | axes, ticks |

**Rules**
- Essential info is **≥15pt**. Nothing goes below 12pt.
- In Drive Mode, primary text is ≥32pt and secondary ≥24pt.
- **Dynamic Type / font scale:**
  - Read `useWindowDimensions().fontScale`.
  - At **≥1.3**: chips stack under titles, the status card grows (no truncation), and the hydrograph hides axis labels and shows a numeric summary.
  - At **≥1.8**: the Map tab's status card collapses to headline plus one button and links to the `/nearby` list.
  - Never truncate a status word. Truncate crossing names with `numberOfLines={2}` and give the full name to the a11y label.
- **Spanish:** layouts must take **+30%** string length, and **+100–200%** for strings under 10 characters [V-web: IBM table via Lightning Design System, simplelocalize]. Use no fixed-width buttons, and test with pseudo-locale strings at +50%.

---

## C. Spacing, radii, shadows, icons, illustration, app icon

### C.1 Spacing (4pt base)
- **Scale:** `2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.
- **Gutters:** screen gutter is 16 (20 at width ≥428pt). Card padding is 16. Gap between cards is 12. Section gap is 24.
- **Rows:** list rows are at least 56pt (single line) or 72pt (two-line + chip). Icon-to-label gap is 8pt.
- **Buttons:** primary buttons are 52pt tall, secondary 44pt. Drive Mode buttons are 76pt with 24pt gaps.

### C.2 Radii
- **Values:** `xs 6` (tags) · `sm 10` (inputs) · `md 14` (small cards) · `lg 20` (cards) · `xl 24` (status card) · `sheet: system` (iOS concentric) / `28` (Android) · `pill 999`.

### C.3 Shadows
- **Dark:** use elevation through surface lightness. Floating-over-map shadow `0 8 24 rgba(0,0,0,0.35)`.
- **Light:** `0 4 16 rgba(14,23,38,0.12)`.
- **Android:** `elevation` 3 (card), 6 (floating), 8 (sheet).

### C.4 Icons: one component, two native sets (all names verified)
SF names were checked against `sf-symbols-typescript` (min SF Symbols version in parentheses) and Material names against `expo-symbols/build/android/symbols.json` [V-pkg].

| Concept | SF Symbol (iOS) | Material Symbol (Android) |
|---|---|---|
| Map tab | `map.fill` | `map` |
| Drive tab / car | `car.fill` | `directions_car` |
| Replay tab | `clock.arrow.circlepath` (2.0) | `history` |
| Alerts tab | `bell.fill` / `bell.badge.fill` | `notifications` / `notifications_active` |
| Settings | `gearshape.fill` | `settings` |
| Water / creek | `water.waves` (4.0) | `water` / `waves` |
| Rising water | `water.waves.and.arrow.up` (4.0) | `flood` |
| Watch | `exclamationmark.triangle.fill` | `warning` |
| Avoid | `exclamationmark.octagon.fill` | `dangerous` |
| Closed | `xmark.octagon.fill` + custom barricade SVG | `block` + custom SVG |
| Unknown | `questionmark.circle.dashed` (6.0; fallback `questionmark.circle`) | `help` |
| Offline | `wifi.slash` / `icloud.slash` | `wifi_off` / `cloud_off` |
| Gauge (sensor) | `sensor.fill` (4.0) / `gauge.with.dots.needle.33percent` (5.0) | `sensors` / `speed` |
| Rain | `cloud.heavyrain.fill` | `rainy` |
| Locate me | `location.fill` | `my_location` |
| Detour | `arrow.triangle.branch` | `alt_route` / `fork_right` |
| Turn around | `arrow.uturn.backward` | `u_turn_left` |
| Route | `arrow.triangle.turn.up.right.diamond.fill` | `route` |
| Drive Mode | `steeringwheel` (4.1) | `navigation` |
| Play / Pause | `play.fill` / `pause.fill` | `play_arrow` / `pause` |
| Step | `backward.fill` / `forward.fill` | `fast_rewind` / `fast_forward` |
| Voice | `speaker.wave.2.fill` / `mic.fill` | `volume_up` / `mic` |
| Home / Work / School / Bus | `house.fill` / `briefcase.fill` / `graduationcap.fill` / `bus.fill` | `home` / `work` / `school` / `directions_bus` |
| Layers | `square.stack.3d.up` | `layers` |
| Language / Text size / A11y | `globe` / `textformat.size` / `accessibility` (5.0) | `language` / `format_size` / `accessibility` |
| Info / Share / Refresh | `info.circle` / `square.and.arrow.up` / `arrow.clockwise` | `info` / `share` / `refresh` |
| Crew list | `list.bullet.rectangle.fill` (3.0) | `list` |
| Official source | `shield.lefthalf.filled` (3.0) | `shield` |

**Custom SVG glyphs** (react-native-svg, 24×24 grid, 2pt stroke, round joins): `ford-dip` (a road dipping into a V with a water line), `barricade` (2 legs, 3 diagonal stripes), `gauge-staff` (a staff gauge with tick marks), `creek-flow` (an S-curve with an arrowhead). These four are also used in the app icon and onboarding.

**SF Symbol animation:** `animationSpec={{effect:{type:'pulse'}, repeating:false}}` on state change only, and none under reduced motion [V-pkg: types `bounce|pulse|scale`].

### C.5 Illustration and Lottie style
- **Style:** flat, 2-tone navy plus one accent (cyan for water, amber or red only to demonstrate states). Strokes are 2pt with no gradients except water. No cartoon people in floodwater, and nothing that trivializes drowning.
- **Prefer code-driven animation:** custom Skia + Reanimated for signature moments (exact token colors, reduced-motion aware).
- **Lottie** (`lottie-react-native@~7.3.8` for SDK 57 [V-pkg]) is only for:
  - onboarding page 1, a rising-water loop;
  - the permission priming pin;
  - the empty Alerts inbox bell;
  - one success-free "saved" tick.
- Recolor all of them to tokens. Candidates are in §H.

### C.6 App icon concept: "The Dip"
- **Background:** navy gradient `#0E1726` → `#16233A`.
- **Glyph:** an off-white road band that **dips** into a shallow V at the center. A **cyan creek** S-curve flows from the upper-left down into the dip. A small **amber dot** upstream is the gauge/early signal, so the icon tells the story of "signal upstream, before it crosses".
- **iOS 26/27:** build it in **Icon Composer** as a layered `.icon`, with up to 4 groups: background, road, water (glass ON), dot. Do not bake in masks. Preview Default/Dark/Clear/Tinted [V-web: WWDC25-361 notes, createwithswift]. The SDK 57 template already points `ios.icon` to an `.icon` file [V-pkg].
- **Android:** adaptive foreground (road + water + dot) on a navy background, plus a **monochrome** layer for themed icons. The template has `monochromeImage` [V-pkg].
- **Test:** the icon must stay legible at 29pt and in tinted mode. The red/amber state colors **never** appear in the icon, so the icon never looks like an alert.

---

## D. Motion tokens and haptic map

### D.1 Motion tokens (Reanimated 4.5.1)
```ts
import { Easing, ReduceMotion } from 'react-native-reanimated';
export const motion = {
  duration: { instant: 0, xs: 100, sm: 160, md: 240, lg: 360, xl: 520, ring: 700, travel: 2400, pulse: 2000, breathe: 3000 },
  easing: {
    standard: Easing.bezier(0.2, 0, 0, 1),     // [U] M3 standard/emphasized curve
    decelerate: Easing.bezier(0.05, 0.7, 0.1, 1),
    accelerate: Easing.bezier(0.3, 0, 0.8, 0.15),
    linear: Easing.linear,                       // water flow only
  },
  // Reanimated withSpring {duration (perceptual, actual ≈1.5×), dampingRatio} form [V-pkg]
  spring: {
    press:  { duration: 180, dampingRatio: 1,    reduceMotion: ReduceMotion.System },
    snappy: { duration: 300, dampingRatio: 0.92, overshootClamping: true, reduceMotion: ReduceMotion.System },
    sheet:  { duration: 420, dampingRatio: 0.9,  reduceMotion: ReduceMotion.System },
    pop:    { duration: 380, dampingRatio: 0.6,  reduceMotion: ReduceMotion.System }, // state chip/marker escalation
    gentle: { duration: 550, dampingRatio: 1,    reduceMotion: ReduceMotion.System }, // = Reanimated default
  },
} as const;
```

| Interaction | Animation | Reduced-motion fallback |
|---|---|---|
| Button press | scale 1 → 0.97, `spring.press` | opacity 1 → 0.7 |
| Status chip changes state | crossfade label + color 240ms, scale pop 1 → 1.08 → 1 (`spring.pop`) | instant swap |
| Marker escalation (→Watch/Avoid) | scale 0.6 → 1 (`spring.pop`) + one halo ripple (1 → 2.2×, opacity 0.5 → 0, 900ms) | instant + static double ring |
| Avoid halo | loop: scale 1 → 1.8, opacity 0.35 → 0, 2000ms, `easing.decelerate` | static halo at 0.25 |
| Water travel | `line-gradient` stop 0 → 1 over `travel` (linear), then hold | static arrows + label |
| Risk ring fill | sweep to the level over 700ms (`spring.gentle`), color interpolates through states | instant |
| Sheet content swap | 160ms fade + 8pt rise | fade only |
| Number change ("6.4" → "6.8 ft") | 240ms vertical digit roll [U: custom] | instant |
| Replay "MINUTES EARLIER" | count-up 0 → 38 over 900ms + `spring.pop` scale | instant final number |
| Toast | slide 12pt + fade 240ms | fade |

### D.2 Haptic map (expo-haptics)

| Event | iOS | Android |
|---|---|---|
| Crossing enters **Watch** (on screen, route or Drive Mode) | `notificationAsync(Warning)` | `performAndroidHapticsAsync(Reject)` [U: closest] or `impactAsync(Medium)` |
| Enters **Avoid / Closed** | `notificationAsync(Error)`, **once** | `impactAsync(Heavy)` |
| Becomes **Unknown** (data lost) | `impactAsync(Soft)` | `performAndroidHapticsAsync(Gesture_End)` [U] |
| De-escalates (any → No signal) | **none** (never Success) | none |
| Sheet detent snap | `selectionAsync()` | `Segment_Tick` |
| Replay scrubber passes a 15-min tick | `selectionAsync()` | `Segment_Frequent_Tick` |
| Replay reveals lead time | `impactAsync(Medium)` | `Confirm` |
| Primary button | `impactAsync(Light)` | `Virtual_Key` |
| Toggle | `selectionAsync()` | `Toggle_On` / `Toggle_Off` |
| Long-press marker | `impactAsync(Medium)` | `Long_Press` |
| Drive Mode approach alert | `notificationAsync(Error)` + voice | `impactAsync(Heavy)` + voice |

**Haptic rules**
- No more than one haptic per 1.5 s.
- Settings → Accessibility → Haptics can turn them off.
- Safety haptics are always paired with visible text, and with voice in Drive Mode.

---

## E. Component inventory (props, states, variants)

All components:
- read tokens from `useTheme()`;
- support EN/ES strings, Dynamic Type and reduced motion;
- have a meaningful `accessibilityLabel`;
- use hit areas of at least 48.

| # | Component | Variants / states | Key specs |
|---|---|---|---|
| 1 | `StatusChip` | `state: RiskState`, `size: sm(24)/md(28)/lg(36)`, `official?: boolean`, `replay?: boolean` | Glyph + UPPERCASE word (`label.chip`). Fill/outline per §A.1. CLOSED adds a 45° stripe pattern (Skia/SVG, 6pt pitch, white @ 0.25). UNKNOWN uses a dashed border. A11y: "Status: Avoid". |
| 2 | `CrossingMarker` | 5 states × `selected` × `zoomTier(low/mid/high)` × `pulsing` | Shapes per §A.1. NO_SIGNAL is hidden below z11 (clustered). Selected = scale 1.15 + 3pt ice ring + name callout. Many markers → MapLibre SymbolLayer with an `Images` sprite (`ford-nosignal`, `ford-watch`, `ford-avoid`, `ford-closed`, `ford-unknown` @1x/2x/3x). Only WATCH/AVOID use animated `Marker` views (usually fewer than 10). [V-pkg: `Images`, `Marker`, `Layer` exports] |
| 3 | `ClusterBubble` | count × maxSeverity | A 36–48pt circle in `surface2` with a count (num.md). Its ring segment uses the **max severity** color (cluster aggregation property) [U: MapLibre `clusterProperties`]. |
| 4 | `GaugeDot` | live / stale / selected | 8pt cyan dot with a 2pt navy ring on creek lines. Tap opens a gauge mini-card. |
| 5 | `CreekLine` | calm / rising / replay | Line layer per §A.4 + water-travel gradient. |
| 6 | `CrossingCard` (sheet body) | peek / half / full; live / replay; official override | See §F.6. Primary actions are pinned at the bottom: **Detour** · **Notify me** · **Share**. |
| 7 | `RiskRing` | state, size 64/96, animated | §5 spec. The center glyph + word scales with font scale ≤1.4. |
| 8 | `RiskWindow` | range {lo,hi} min, band (possible/likely), `asOf` | Ticks Now/30/60/90. A11y: "Likely flooded within 15 to 30 minutes, as of 10:42 PM." |
| 9 | `EtaRangePill` | WATCH (30–90) / AVOID (15–30) / CLOSED ("Now") | Pill with `num.md` text such as "likely within 15–30 min". **Never** a single number. |
| 10 | `Hydrograph` | sparkline (48pt, no axes) / full (120–200pt) / lag-pair | Skia. Trigger line, rate badge, now dot, replay playhead. |
| 11 | `FreshnessBadge` | live (<5 min) / aging (5–15) / stale (>15 → triggers UNKNOWN on dependent crossings) / offline | Text: "Live · 2 min ago" / "Updated 12 min ago" / "Data offline · 47 min". Dot color: cyan (live), slate (aging), dashed (stale). The thresholds are **owned by the backend spec** [U]. |
| 12 | `AreaStatusCard` | calm / watch-nearby / avoid-nearby / offline / no-location | §F.4. Opaque `surface1`, radius 24. |
| 13 | `RouteSummaryCard` | no signal on route / watch on route / avoid → detour / unknown segments | Shows route name, crossings count, worst state chip, "+4 min detour", and handoff buttons. |
| 14 | `RouteRibbon` (Drive Mode) | upcoming crossings as nodes on a vertical line | Glanceable "subway line" of the next 3 crossings with distance (num.lg) and state chips. |
| 15 | `AlertBanner` (in-app) | WATCH / AVOID / CLOSED / UNKNOWN / OFFICIAL | Top banner under the Dynamic Island, `surface1` + 4pt left state bar + chip + 1-line message + chevron. Auto-dismisses after 8 s, except AVOID/CLOSED which persist until tapped. `accessibilityLiveRegion="assertive"` (Android) and `AccessibilityInfo.announceForAccessibility` (iOS). |
| 16 | `OfflineBanner` | offline / reconnecting / server error | Full-width 36pt bar under the top band: `wifi.slash` + "Offline · showing data from 10:42 PM (12 min ago)". |
| 17 | `ReplayBanner` | playing / paused / ended | Violet "REPLAY · Memorial Day 2015 · real historical data" with a striped top edge. Always visible during replay so nobody mistakes it for live. |
| 18 | `TimeScrubber` | idle / dragging / playing; speed 30×/60×/120× | §F.9. `accessibilityRole="adjustable"`, ±15 min per step. |
| 19 | `SegmentedControl` | 2–4 segments | iOS: `@expo/ui/swift-ui` Picker (segmented) [V-pkg dir `Picker`]. Android: `SegmentedButton` [V-pkg]. |
| 20 | `Button` | primary (inverse pill 52) / secondary (s2 44) / tertiary (text) / glass icon (44 round) / drive (76). There is **no red "destructive" button**, because red is reserved for risk states; "End Drive Mode" uses secondary. | Loading state uses a spinner (M3 `LoadingIndicator` on Android). Disabled = 40% opacity. |
| 21 | `ListRow` | crossing / gauge / alert / setting / place | 56–72pt. Leading glyph 28pt, title `headline`, subtitle `body.md` secondary, trailing chip/chevron/switch. |
| 22 | `SearchField` | idle / focused / results / empty | 44pt, `surface2`, radius 10, leading `magnifyingglass` / `search` [V-pkg]. |
| 23 | `EmptyState` | alerts-empty / no-saved-routes / no-search-results / no-location | Illustration 120pt + title + body + 1 action. Copy never says "safe". |
| 24 | `Skeleton` | card / row / chart | HeroUI Skeleton with shimmer (static under reduced motion). |
| 25 | `Toast` | info / warning / error | HeroUI Toast. **No "success" variant for safety events.** |
| 26 | `Legend` sheet | — | fitToContents formSheet listing all 5 states + replay with marker, chip, meaning, and the "never safe" note. |
| 27 | `PermissionPrimer` | location / notifications / background | Full-screen illustration + 3 bullets + Continue / Not now. |
| 28 | `PledgeCard` | unchecked / checked | 3 checkboxes (border.input) + "I understand" primary (disabled until all are checked). |
| 29 | `StormCard` | storm metadata | Date, name, rainfall, crossings scored, median lead time (num.lg), "Play" button. |
| 30 | `MetricTile` | POD / FAR / CSI / Lead time | Number (num.lg) + label + "i" explainer. FAR is lower-is-better, marked with an arrow. |
| 31 | `DataSourceRow` | live / degraded / down | Source name, last fetch, status dot, link. |
| 32 | `BottomAccessory` content | replay-mini / drive-on | `NativeTabs.BottomAccessory` with `usePlacement()` 'regular' / 'inline' variants [V-pkg]. |
| 33 | `DisclaimerFooter` | compact / full | "FordCast is a supplementary tool. Obey barricades and official warnings. Never drive into water." (v4 text) |
| 34 | `GlassIconButton` | default / pressed / disabled / badge | `GlassView isInteractive` 44pt + symbol 20pt. Fallback: s2 @ 0.96. |

---

## F. Screen-by-screen specs (ASCII wireframes at 393pt; `[ ]` = button, `( )` = chip, `▓` = map)

### F.1 Splash
```
┌───────────────────────────────┐   Native splash: bg #0E1726, icon glyph 76pt (template imageWidth 76) [V-pkg]
│                               │   AnimatedSplashOverlay (template has one) [V-pkg]:
│            ╲   ╱              │   0–600ms: cyan creek draws into the dip (Skia path trim)
│        ~~~~ ╲_╱ ~~~~          │   600–900ms: fade to Map Home / Onboarding
│           FordCast            │   Reduced motion: static, 300ms fade
│   Know before it crosses.     │   Never blocks on network: shows cached map + FreshnessBadge
└───────────────────────────────┘
```

### F.2 Onboarding (4 pages, horizontal pager, dots + Next; language pill on page 1)
```
P1  ┌─────────────────────────────┐  P2 ┌─────────────────────────────┐
    │                 (EN | ES)   │     │  How it works               │
    │   [illustration: creek →    │     │  ① Upstream gauges ●──      │
    │    road dip, water rising]  │     │  ② Learned travel time ≈38m │
    │  Know before it crosses.    │     │  ③ Your crossing  ▲→◆       │
    │  FordCast watches stream    │     │  Real USGS data, every 5 min│
    │  gauges upstream of low-    │     │                             │
    │  water crossings and warns  │     │                             │
    │  you before water reaches   │     │                     ● ● ○ ○ │
    │  the road.          ● ○ ○ ○ │     │ [        Next            ]  │
    │ [        Next            ]  │     └─────────────────────────────┘
    └─────────────────────────────┘
P3  ┌─────────────────────────────┐  P4 ┌─────────────────────────────┐
    │  What the map shows         │     │  Safety pledge              │
    │  ○ No current signal        │     │  ☐ I will never drive into  │
    │  ▲ Watch – water rising     │     │    water.                   │
    │  ◆ Avoid – likely flooded   │     │  ☐ I obey barricades and    │
    │  ▧ Flooded / Closed         │     │    official warnings.       │
    │  ◌ Unknown – data offline   │     │  ☐ FordCast adds caution;   │
    │  FordCast never says a road │     │    it never says a road is  │
    │  is safe.                   │     │    safe.                    │
    │                     ● ● ● ○ │     │ [     I understand       ]  │
    │ [        Next            ]  │     │  ¡Dé la vuelta, no se ahogue!│
    └─────────────────────────────┘     └─────────────────────────────┘
```
- Store `pledgeAcceptedAt` and the pledge version. Onboarding can be reached again from Settings → About.
- Copy ≤ 40 words per page.
- VoiceOver reads each page as a single heading plus body.

### F.3 Permission priming (location → notifications → background, progressive)
```
┌─────────────────────────────┐   Location (When In Use): shown before first Map render
│        [pin illustration]   │   Title: "See crossings near you"
│  See crossings near you     │   • Center the map on you  • Check crossings on your drive
│  • Centers the map on you   │   • Location stays on your phone unless you save a place [U: confirm with backend privacy spec]
│  • Checks your drive        │   [Continue] → OS prompt;  [Not now] → map centers on Austin (30.2672,-97.7431)
│  • Never sold or shared     │   Notifications: shown after saving a place/route ("Warn me about crossings on my drives")
│ [        Continue        ]  │   Background ("Always"): only from Drive tab toggle "Alert me while I drive";
│        Not now              │   explains battery + "we watch the nearest at-risk crossings".
└─────────────────────────────┘   Android 11+: deep-link to app settings for "Allow all the time" [U]
```

### F.4 Map Home: calm state
```
┌─────────────────────────────┐
│(● Live · 2 min ago)   [?][⚙]│  ← glass chrome (44pt targets)
│▓▓▓▓▓▓~~~▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  ~ = cyan creeks @50%, ○ = no-signal (z≥11)
│▓▓○▓▓▓▓▓~~~▓▓▓▓▓▓○▓▓▓▓▓▓▓▓▓▓▓│  · = gauge dots
│▓▓▓▓▓·▓▓▓▓~~~~▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓~~~○▓▓▓▓▓▓▓▓[≡]│  ← Layers (glass)
│▓▓▓▓▓▓▓▓◉▓▓▓▓▓▓▓▓~~▓▓▓▓▓▓▓[➤]│  ← Locate me; ◉ = you
│ ┌─────────────────────────┐ │
│ │ 🔍 Search crossings/places│ │  AreaStatusCard (surface1, r24)
│ │ (○ NO CURRENT SIGNAL)     │ │
│ │ No upstream rise detected │ │  headline
│ │ near you                  │ │
│ │ 18 gauges · 64 crossings  │ │  caption, tnum
│ │ [Check my drive][Drive ▶] │ │  primary inverse + secondary
│ │ Turn around, don't drown. │ │  DisclaimerFooter compact
│ └─────────────────────────┘ │
│  [Map] [Drive] [Replay] [Alerts]   ← NativeTabs (glass on iOS 26)
└─────────────────────────────┘
```
- Swiping up on the card opens `/nearby`, a formSheet with detents [0.5, 1.0].
- The `/nearby` list is sorted by **severity, then distance**, with a segmented control "Nearby | My routes | Ranked (crew)".
- Calm extras live in the list (Replay invite, How it works).

### F.5 Map Home: storm state (an Avoid near you)
```
┌─────────────────────────────┐
│(● Live · 1 min ago)   [?][⚙]│
│┌───────────────────────────┐│  AlertBanner (persists): red 4pt left bar
││◆ AVOID Bull Creek @ Loop 360││  "Likely flooded within 15–30 min" ›
│└───────────────────────────┘│
│▓▓▓▓~~~~▓▓▓▓▲▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  ▲ = Watch (amber triangle + halo)
│▓▓▓▓▓▓~~~»»»◆▓▓▓▓▓▓▓▓▓▓▓▓▓▓[≡]│  »»» = water-travel gradient toward ◆ (Avoid, pulsing)
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▧▓▓▓▓▓▓▓▓[➤]│  ▧ = Closed (stripes, official badge)
│ ┌─────────────────────────┐ │
│ │ (◆ AVOID) 1 near you      │ │  card headline switches to worst nearby state
│ │ (▲ WATCH) 2 · (▧ CLOSED) 1│ │
│ │ [Check my drive][Drive ▶] │ │
│ └─────────────────────────┘ │
│  [Map] [Drive] [Replay] [Alerts•2]
└─────────────────────────────┘
```
- Auto-camera does **not** move. The user stays in control; the banner offers "Show".
- If the user's location is inside a 1-mile radius of an Avoid crossing and they are moving above 15 mph [U: speed threshold], the app suggests Drive Mode via a banner, never automatically.

### F.6 Crossing Detail sheet (formSheet, detents 0.32 / 0.62 / 1.0)
```
PEEK (0.32) ─ map stays interactive
┌─────────────────────────────┐
│            ───              │ grabber
│ (◆ AVOID)            [✕]    │
│ Bull Creek at Loop 360      │ title.lg (2 lines max)
│ Likely flooded within       │
│ 15–30 min        as of 10:42│ num.xl range + caption
│ [⤳ Detour +4 min][🔔][Share]│ pinned actions (Google Maps pattern)
└─────────────────────────────┘
HALF (0.62) adds:                       FULL (1.0) adds:
│ ◯ RiskRing 96 │ RiskWindow  │         │ Upstream gauges (list, NLDI-linked)   │
│ Now ━━[15–30]━━ 60 ── 90    │         │  • Bull Ck at Loop 360 ↑ 6.8 ft       │
│ Upstream: Bull Ck nr Lakeway│         │  • W Bull Ck … (stale → Unknown chip) │
│ +3.1 ft in 30 min  ╱╱ (spark│         │ Lag pair: upstream vs road ≈38 min    │
│ Trigger 6.0 ft ┄┄┄┄┄┄┄┄┄┄┄┄ │         │ Official status: City of Austin ›     │
│ Why: rising above trigger   │         │ Update log (timestamped)              │
│ 22 min ago; travel ≈38 min  │         │ Model: baseline rule v1 (or ML ~70%)  │
                                        │ Notify me for this crossing [toggle]  │
                                        │ Disclaimer (full) · Report (roadmap)  │
```
- **Official override:** when ATXfloods or the City reports closed, the header becomes `(▧ CLOSED · OFFICIAL)` "Closed by City of Austin · 10:31 PM", and the model forecast moves below as secondary ("Model also expected flooding").
- **UNKNOWN:** the header is `(◌ UNKNOWN)` "No recent gauge data (last 10:01 PM, 47 min ago). Watch for water and barricades." The ring is dashed and the range pill is hidden.

### F.7 Check My Drive (Drive tab)
```
INPUT                                   RESULT (avoid on route)
┌─────────────────────────────┐         ┌─────────────────────────────┐
│ Check my drive              │         │ ‹ Home → Westlake HS        │
│ ◉ From: Current location    │         │ ▓▓▓ route (blue) ▓▓◆▓ red ▓▓│ map 45%
│ ⦿ To:  [Search or saved…]   │         │ ▓▓ detour (blue dashed) ▓▓▓▓│
│ Saved: (🏠Home)(🎓School)(💼)│         │┌───────────────────────────┐│
│ Leave: (Now)(In 15m)(Pick…) │         ││(◆ AVOID) on your route     ││
│ [     Check my drive     ]  │         ││Bull Creek @ Loop 360       ││
│ Saved routes                │         ││Likely flooded 15–30 min    ││
│ 🏠→🎓 Home→School  (○) 7:02 │         ││Detour adds +4 min (19 min) ││
│ 🏠→💼 Home→Work    (▲) 7:02 │         ││[Use detour in: Apple Maps ▾]││
└─────────────────────────────┘         ││[ Start Drive Mode ]         ││
                                        │└───────────────────────────┘│
                                        │ 3 crossings on route: ◆ ○ ○ │
                                        └─────────────────────────────┘
```
- **Handoff:** a menu of Apple Maps / Google Maps / Waze. FordCast passes **a detour waypoint**, because nav apps can't take avoid-polygons [U: URL scheme waypoint support must be verified by the routing owner]. The warning line reads "Your nav app may not know about this risk. Follow the detour waypoint."
- **Re-check:** re-checks live (Supabase Realtime) and shows a banner "Route status changed · 10:44 PM" if the state changes.
- **States:**
  - No signal on route: chip `(○ NO CURRENT SIGNAL)` "on route · as of 7:02 AM". The CTA is "Start Drive Mode", not "safe to go".
  - Unknown segments: "2 crossings have no recent data".

### F.8 Drive Mode (fullScreenModal, always Night, keep-awake, voice-first)
```
┌─────────────────────────────┐  bg #070D18, text #E6EBF2
│ DRIVE MODE · voice on   [✕] │  ✕ = 76pt "End" (top-right is OK: passenger/parked use)
│                             │
│  NEXT CROSSING  2.3 mi      │  24pt secondary
│  ┌───────────────────────┐  │
│  │ ◆ AVOID               │  │  32pt+ word, 76pt-tall chip
│  │ 15–30                 │  │  display.xl tnum, "min" 24pt
│  │ min · Bull Creek      │  │
│  └───────────────────────┘  │
│  ┃ ◆ 2.3 mi  Bull Creek     │  RouteRibbon (next 3)
│  ┃ ○ 5.8 mi  Barton Ck      │
│  ┃ ▲ 9.1 mi  Onion Ck       │
│ [   Take detour (+4 min)  ] │  76pt
│ [ 🔊 Repeat ]  [ 🔇 Mute ]  │  76pt each, 24pt gap
└─────────────────────────────┘
```
- **Speech** (`expo-speech`): "Heads up. Bull Creek crossing, two miles ahead, is likely flooded within fifteen to thirty minutes. Take the detour." ES: "Atención. El cruce de Bull Creek, a dos millas, probablemente estará inundado en quince a treinta minutos. Tome el desvío."
- **Speak triggers:** escalation, a new crossing within 5 min of arrival, and every state change. Never speak more than once per 60 s per crossing.
- **No typing, no scrolling lists while moving.** One decision per screen. Calm state: big "(○ NO CURRENT SIGNAL) on route · next crossing 5.8 mi".
- **iOS 26+:** the `BottomAccessory` shows "Drive Mode on" when the user leaves the modal.

### F.9 Storm Replay
```
PICKER (Replay tab)                     PLAYER
┌─────────────────────────────┐         ┌─────────────────────────────┐
│ Storm Replay                │         │▒REPLAY · Memorial Day 2015 ▒│ violet banner (striped)
│ Real storms, same pipeline. │         │ real historical data    [ⓘ] │ ⓘ = "Model sees only data up to the playhead"
│ ┌─────────────────────────┐ │         │▓▓▓▓~~~»»»▲▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│ │ May 2015 · Memorial Day │ │         │▓▓▓▓▓▓▓▓~~~◆▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│ │ 12 crossings · lead 38m │ │         │ ┌─────────────────────────┐ │
│ │ [▶ Play]                │ │         │ │Upstream ╱╱╱  Road ___╱  │ │ lag-pair (compact)
│ └─────────────────────────┘ │         │ └─────────────────────────┘ │
│ ┌ Oct 31 2013 · Onion Ck ─┐ │         │ May 25 · 10:42 PM CDT  60×▾ │ glass scrubber chrome
│ ┌ Oct 2018 · Llano ───────┐ │         │ ⏮ ▶ ⏭ |━━▲━━◆━━━●━○━━━━━━|  │ ticks ▲◆●▮, playhead ○
│ ┌ Jul 2025 ───────────────┐ │         └─────────────────────────────┘
│ Results & methodology ›     │
└─────────────────────────────┘
RESULTS (sheet, after end or from picker)
┌─────────────────────────────┐
│ FordCast warned              │
│   38 MIN EARLIER            │  display.lg count-up
│ than water reached the road │
│ [POD 83%][FAR 17%][CSI 0.71]│  MetricTiles (numbers come from the backtest; never hardcode)
│ Lead time per crossing ▇▅▇▃ │  victory-native bars
│ Baseline rule vs ML  (seg)  │
│ How we scored this (no      │
│ lookahead, event split) ›   │
└─────────────────────────────┘
```
- **Speeds:** 30× / **60× (default)** / 120×. ⏮/⏭ step ±15 min.
- **Dragging:** pauses playback and gives a haptic tick every 15 min.
- **BottomAccessory (iOS 26+):** a mini-player "▶ Memorial Day 2015 · 10:42 PM" when the user switches tabs.
- **Map** is desaturated 15% in Replay [U: implement as an overlay `rgba(182,156,255,0.04)` + the banner] so it never reads as live.
- **Metric labels** must be the placeholders `[POD]` etc. until real backtest values exist (v4 claims ledger).

### F.10 Alerts inbox / history
```
┌─────────────────────────────┐
│ Alerts                [⚙]   │  ⚙ → Settings/Notifications
│ (All)(On my routes)(Nearby) │  segmented
│ TODAY                       │
│ (◆ AVOID) Bull Creek @ 360  │  10:42 PM · "likely 15–30 min"
│   ↳ City closed it 10:58 PM │  outcome line (only if official data exists)
│ (▲ WATCH) Onion Ck @ FM1626 │  10:20 PM
│ (◌ UNKNOWN) 3 gauges offline│  9:55 PM
│ YESTERDAY …                 │
│ Send a test alert ›         │  (Watch Duty pattern)
└─────────────────────────────┘
```
- **Empty state:** bell Lottie, "No alerts yet. You'll see warnings here for your saved places and drives." Not "all clear".
- The tab badge counts unread AVOID/CLOSED only.

### F.11 Saved places and routes
- Places list (Home/School/Work/custom, up to 10). Each place has a radius chip (1/3/5 mi) and alert toggles for **Watch** (default on) and **Avoid/Closed** (default on).
- Turning Avoid/Closed off shows a confirm dialog: "You won't be warned about likely flooding near Home."
- Routes have a "usual departure time" so the app can re-check 30 min before. That re-check is a local notification [U: backend].
- Editor: map pin drag + search, using the HeroUI TextField.

### F.12 Settings (stack from ⚙; native controls via @expo/ui)
```
┌─────────────────────────────┐
│ Settings                    │
│ Language       English  ›   │  English / Español / System (i18next + expo-localization)
│ Units          ft · mi  ›   │  ft/m, mi/km
│ Appearance     Dark     ›   │  Dark (default) / System / Light
│ Accessibility           ›   │  Haptics, Reduce motion (app override), Spoken alerts voice+rate, Larger map labels
│ Notifications           ›   │  Avoid/Closed, Watch, Area summaries, Quiet hours (Avoid/Closed bypass toggle), Test alert
│ Drive Mode              ›   │  Background alerts (Always permission), Voice language, Auto-suggest
│ Data sources            ›   │  USGS Water Data API, City of Austin/ATXfloods, NLDI, (MRMS if built) + live status
│ How FordCast works      ›   │
│ About · Sources · Disclaimer›│
│ Version 1.0 (build 12)      │
└─────────────────────────────┘
```

### F.13 About / How it works / Sources / Disclaimer
- **How it works:** a 4-step vertical diagram (Gauges → River network (NLDI) → Travel time → Risk → Phone). It includes the "We never say safe" principle, the Built / Prototype / Roadmap list (honesty per v4 §0), and backtest tiles that link to Replay results.
- **Sources:** the v4 §9 list as tappable rows (opened with `expo-web-browser`).
- **Disclaimer:** the full v4 text, plus "Data can be delayed or wrong. Official closures override FordCast."

### F.14 Crew / Hotspot list (secondary audience: road crews, bus planners)
```
┌─────────────────────────────┐
│ Likely to flood next  [⇪]   │  ⇪ = share/export CSV (Stretch via expo-sharing)
│ (Watch+Avoid)(All)(Closed)  │
│ 1 (◆) Bull Ck @ Loop 360    │  15–30 min · ↑3.1 ft/30m · 2 gauges
│ 2 (▲) Onion Ck @ FM 1626    │  30–90 min · ↑1.2 ft/30m
│ 3 (▲) Shoal Ck @ 38th St    │  30–90 min
│ … (○) 61 more               │
└─────────────────────────────┘
```
- Sorted by state, then the lower end of the ETA range.
- Dense rows (56pt).
- This is also the **accessible alternative to the map**: VoiceOver users reach it via the "List" segmented option in `/nearby`.

### F.15 Report water over road (Roadmap, feature-flagged)
- Entry: the crossing sheet, full detent.
- Gate first: "Are you the driver? Reporting is for passengers or when parked." Two buttons: "I'm a passenger / parked" or "Cancel".
- Options: (Water over road)(Barricade up)(Debris), with an optional photo.
- Note: "Reports are reviewed and never override official closures."

### F.16 Error and offline states
| Case | UI |
|---|---|
| No network | OfflineBanner. Cached markers keep their state but **age them**: when `asOf` passes the stale threshold, markers switch to UNKNOWN (dashed). Map tiles come from the offline pack or show a plain `map.land` background with crossings and creeks still drawn (GeoJSON bundled). |
| Server error / partial gauges | FreshnessBadge "Some data delayed". Affected crossings become UNKNOWN with the reason shown. |
| Location denied | Map centers on Austin. Card chip: "Turn on location to see crossings near you", [Settings]. |
| Notifications denied | Alerts tab header row: "Notifications are off. FordCast can't warn you in the background." [Turn on] |
| Map style failed | Fallback to the bundled minimal style (land + water + roads only). |
| Empty search | "No crossings or places match '…'. Try a road or creek name." |

### F.17 Live Activity + Dynamic Island (iOS, expo-widgets layout keys [V-pkg])
```
compactLeading: [◆]          compactTrailing: 15–30m          minimal: [◆]
expanded:
┌──────────────────────────────────────────────┐
│ ◆ AVOID                         15–30 min    │ expandedLeading / expandedTrailing
│        Bull Creek at Loop 360                │ expandedCenter
│ Upstream +3.1 ft/30 min · Detour +4 min [⤳]  │ expandedBottom (button deep-links fordcast://crossing/…)
└──────────────────────────────────────────────┘
banner (Lock Screen):
┌──────────────────────────────────────────────┐
│ FordCast   (◆ AVOID)             as of 10:42 │
│ Bull Creek at Loop 360                        │
│ Likely flooded within 15–30 min · Detour +4  │
│ Never drive into water.                       │
└──────────────────────────────────────────────┘
isStale → all colors to slate, chip (◌ UNKNOWN) "Data may be outdated · open FordCast"
```
- `activityBackgroundTint` is navy. Never show a running timer.
- `bannerSmall` (CarPlay/Watch) shows chip + range only [V-pkg: `bannerSmall`].

### F.18 Widgets (iOS via expo-widgets; Stretch)
```
systemSmall          systemMedium (route)                    accessoryRectangular
┌──────────┐         ┌───────────────────────────────┐       ┌──────────────────────┐
│FordCast  │         │ Home → School      as of 7:02 │       │◆ 1 Avoid near you    │
│(◆) 1     │         │ (◆ AVOID) Bull Ck @ 360       │       │Bull Ck · 15–30 min   │
│Avoid near│         │ Detour +4 min ›               │       └──────────────────────┘
│as of 7:02│         └───────────────────────────────┘       accessoryInline: "◆ Avoid · Bull Creek"
└──────────┘                                                 accessoryCircular: ring + count
```
- Every widget prints `as of`.
- If the timeline entry is older than 30 min, render (◌) "Open FordCast for current data". WidgetKit refresh is not guaranteed [U].
- Support the `vibrant` and `accented` rendering modes (expo-widgets `widgetRenderingMode`) [V-pkg]. In accented/vibrant modes shapes still carry the meaning, because color is lost.

### F.19 Push notification layouts and copy (EN / ES)

| Type | Title | Body | iOS level / Android channel | Actions |
|---|---|---|---|---|
| Avoid | Avoid: Bull Creek at Loop 360 | Likely flooded within 15–30 min. Upstream gauge rose 3.1 ft in 30 min. Tap for a detour. | timeSensitive / crossing-urgent | Show detour · Start Drive Mode |
| (ES) | Evite: Bull Creek en Loop 360 | Probablemente inundado en 15–30 min. El medidor río arriba subió 3.1 pies en 30 min. Toque para ver un desvío. | | Ver desvío · Modo Manejo |
| Watch | Watch: Onion Creek at FM 1626 | Upstream water is rising. Flooding possible within 30–90 min. | active / crossing-watch | Open |
| (ES) | Vigilancia: Onion Creek en FM 1626 | El agua río arriba está subiendo. Posible inundación en 30–90 min. | | Abrir |
| Closed (official) | Closed: Spicewood Springs Rd crossing | City of Austin reports this crossing closed. Turn around, don't drown. | timeSensitive / crossing-urgent | Show detour |
| Unknown on route | Data offline on your route | 3 crossings have no recent data. Watch for water and barricades. | active / crossing-watch | Open |
| Signal ended | Update: Bull Creek at Loop 360 | No current signal. This does not mean the road is clear; obey barricades. | passive / summaries | — |

**Push rules**
- Use `threadIdentifier` = crossing id so alerts group per crossing [V-pkg].
- Use `categoryIdentifier` = `CROSSING_ALERT` with actions [V-pkg].
- Do not repeat the same state for the same crossing within 30 min.
- Keep the title under 50 characters and the body under 150.

### F.20 Bottom accessory and in-app mini-bars
- `regular` placement: "▶ REPLAY · Memorial Day 2015 · 10:42 PM [⏸]".
- `inline` placement (tab bar minimized): "▶ 10:42 PM".
- Drive variant: "● Drive Mode on · next crossing 2.3 mi".

---

## G. Signature moments (frame by frame)

### G.1 "The warning arrives first" (Storm Replay; demo video 0:35–1:20)

| t (at 60×) | Frame |
|---|---|
| 0.0 s | Player opens. Violet REPLAY banner slides down (240ms). Map camera eases to fit the gauge, creek and crossing (`Camera` fit with 48pt padding + sheet inset). Scrubber at T-3h. |
| 0–4 s | Calm: creek at 50% cyan. Crossing ○ slate. Hydrograph is flat. The time label ticks in tnum (no jitter). |
| 4.0 s | Upstream gauge crosses the **trigger stage**. The gauge dot pops (`spring.pop`) and the hydrograph's dashed amber trigger line flashes once (opacity 0.4 → 1 → 0.6, 600ms; no strobe). |
| 4.2–6.6 s | **Water travel:** a cyan gradient head runs down the NHDPlus creek from gauge to crossing (2.4 s, linear) with a soft 10pt glow. |
| 5.0 s | Crossing escalates to **Watch**: marker morphs ○ → ▲ (`spring.pop`) with an amber halo ripple, and the scrubber drops a ▲ tick. Warning haptic. |
| 7.5 s | Escalates to **Avoid**: ▲ → ◆, the red halo begins its 2 s pulse, and the card slides to peek: "AVOID · likely flooded within 15–30 min · detour +4 min". RiskRing sweeps amber → red (700ms). One Error haptic. A ◆ tick is added. |
| 7.5–14 s | A bracket on the scrubber spans from ◆ forward. The caption reads "Waiting for the road sensor…". |
| 14.0 s | The road sensor records **water over road**: a white ● tick on the scrubber, and the lag-pair's lower line rises. The marker gains barricade stripes (▧). |
| 14.4 s | Bracket ◆→● highlights. The callout counts up **"38 MIN EARLIER"** (display.lg, 900ms count-up, then `spring.pop`). Medium impact. Results CTA appears. |
| Reduced motion | Steps snap; no travel or pulse; the counter shows its final value; captions narrate each step. |

### G.2 Live Crossing Card escalation (in-app, real data)
1. A realtime update arrives (WATCH → AVOID).
2. The marker pops and the halo starts.
3. If the crossing is in the viewport or on a saved route, the AlertBanner drops in (240ms). Otherwise only the tab badge and Alerts change.
4. The user taps the banner. The sheet opens at peek, the ring sweeps, and the range pill and detour button fade in (stagger 60ms).
5. VoiceOver announces: "Avoid. Bull Creek at Loop 360. Likely flooded within 15 to 30 minutes. Detour adds 4 minutes."

### G.3 Drive Mode heads-up (eyes-free)
1. Ten seconds before the voice prompt [U: timing from route ETA], the RouteRibbon advances so the node for the at-risk crossing grows to the top.
2. A **red edge glow** (an 8pt inner border, static, not flashing) appears.
3. One Error haptic plays and speech starts.
4. The "Take detour" button grows to 96pt for 10 s. Glance content stays at most 3 items (word, range, name).

---

## H. References, templates and imports

### H.1 Starters and templates to import
| What | Exact command / source | Status |
|---|---|---|
| Expo default template (SDK 57) | `npx create-expo-app@latest fordcast` → expo-template-default 57.0.30 (NativeTabs, glass, Expo UI, symbols, `src/` layout, `reset-project` script) | [V-npm/V-pkg] |
| HeroUI Native example app (pre-configured Uniwind) | `github.com/heroui-inc/heroui-native-example` (linked from the package README) | [V-pkg] |
| HeroUI Native preview app (browse components on device) | App Store id6757860059 (README) | [V-pkg] |
| MapLibre RN docs | `maplibre.org/maplibre-react-native/` (README) | [V-pkg] |
| OpenFreeMap styles to fork | `https://tiles.openfreemap.org/styles/liberty` (official quick start), `/styles/dark`, `/styles/positron` | [V-web: openfreemap.org quick start; dark via community repo] |
| Protomaps flavors (runner-up) | `@protomaps/basemaps@5.7.2` flavors light/dark/white/grayscale/black | [V-npm, V-web: docs.protomaps.com] |

**Install set** (always `npx expo install` so SDK 57 pins apply; bundled versions per `expo/bundledNativeModules.json` [V-pkg]):
- `react-native-reanimated@4.5.1`, `react-native-worklets@0.10.1`, `react-native-gesture-handler@~2.32.0`, `react-native-screens@~4.26.0`, `react-native-safe-area-context@~5.7.0`, `react-native-svg@15.15.4`
- `@shopify/react-native-skia@2.6.2`, `@shopify/flash-list@2.0.2`, `lottie-react-native@~7.3.8`
- `expo-glass-effect@~57.0.4`, `@expo/ui@~57.0.23`, `expo-symbols@~57.0.3`, `expo-haptics@~57.0.3`, `expo-blur@~57.0.3`, `expo-font@~57.0.4`, `expo-splash-screen@~57.0.10`, `expo-widgets@~57.0.24`, `expo-notifications@~57.0.22`, `expo-location@~57.0.21`, `expo-task-manager@~57.0.21`, `expo-speech@~57.0.3`, `expo-localization@~57.0.2`, `expo-keep-awake@~57.0.2`, `expo-sqlite@~57.0.4`, `expo-network@~57.0.2`, `expo-web-browser@~57.0.3`, `expo-sharing@~57.0.23`, `expo-dev-client@~57.0.20`
- Non-bundled: `@maplibre/maplibre-react-native@11.5.0` (peer expo ≥54, RN ≥0.80), `victory-native@42.0.1` (peer skia ≥2.6 <3), `heroui-native@1.0.10` (+ `uniwind@1.12.x`, `tailwindcss@^4.3`, `tailwind-variants@^3.2.2`, `tailwind-merge@^3.6`, `@gorhom/bottom-sheet@^5.2.9`), `@expo-google-fonts/inter@0.4.2`, `i18next@26.4.4`, `react-i18next@17.0.16` [all V-npm]

**Watch-outs**
- `@gorhom/bottom-sheet@5.2.14` is dev-tested on Reanimated 3.19 but declares a peer of `>=4.0.0-` [V-pkg]. Test it on device. Do not use it directly for core sheets.
- NativeTabs is under `unstable-` [V-pkg], so pin the expo-router version.

### H.2 Figma / design kits
- **Apple Design Resources:** iOS/iPadOS 26 UI kit (Figma + Sketch) with Liquid Glass controls, materials, layout guides [V-web: designcompass.org, 9to5mac.com]. An **iOS/iPadOS 27 UI Kit for Figma** was reportedly posted on June 23, 2026 [U: single source uithings.com]. Get it from `developer.apple.com/design/resources/` and confirm the publisher is Apple.
- **SF Symbols 7** app (needed by Apple kits) [V-web: news.hada.io].
- **Material 3 Design Kit** (Figma Community, Google, updated for M3 Expressive) [V-web: codelabs.developers.google.com, material.io blog]. The file id `1035203688168086460` is [U]; search "Material 3 Design Kit" and check for the verified Google badge.
- **Figma Glass effect playground** (beta) for prototyping glass chrome [V-web: bgr.com, uithings.com].
- **Icon Composer** (Apple) for the `.icon` app icon [V-web: WWDC25-361 notes].

### H.3 Screen references to study (Mobbin is paid; URLs unverified)
- Search `mobbin.com` for Apple Maps, Google Maps, Waze, Citizen, Flighty, Apple Weather, Watch Duty [U].
- **What to look at:**
  - place-sheet action bars (Google Maps);
  - live banners (Flighty);
  - risk/recency colors (Citizen);
  - legend sheets (Watch Duty);
  - tide charts (Tide Guide);
  - Next-Hour Precipitation (Apple Weather).

### H.4 Lottie candidates (LottieFiles; Lottie Simple License = free commercial use, attribution encouraged, no reselling as standalone files [V-web: help.lottiefiles.com, doc.qt.io])
| Use | Asset | License on page |
|---|---|---|
| Onboarding P1 rising water | "Wave Rising up" by Ashlee: `https://lottiefiles.com/free-animation/wave-rising-up-jX5Czkc0Uo` | free (verify on page) [V-web exists] |
| Calm ripple (alt) | "Water waves" by Ryan: `https://lottiefiles.com/free-animation/water-waves-FH2RtE96xK` (2.4 KB) | Lottie Simple License [V-web] |
| Location primer | "Pin Location" by Mohsen Najafi: `https://www.lottiefiles.com/1427-pin-location` | Lottie Simple License [V-web] |
| Empty Alerts bell | "Notification Bell Animation" by Tim John: `https://lottiefiles.com/28718-notification-bell-animation` (~1.6 KB) | Lottie Simple License [V-web] |
| **Avoid** | flood/tsunami marketplace packs (paid; disaster imagery is inappropriate) | — |

Recolor every Lottie to tokens and credit creators on the About screen. Under reduced motion show the first frame static.

---

## I. Tiering, acceptance checklist, and open questions

### I.1 Design tiers (so the core bridge ships first; nothing faked)
| Tier | Design scope |
|---|---|
| **MVP (must ship by Oct 25)** | Tokens/theme.ts, Inter, StatusChip, CrossingMarker (5 states), Map Home calm + storm, Crossing sheet (3 detents), Hydrograph, RiskRing, RiskWindow, Freshness/Offline/Unknown handling, Storm Replay (picker + player + results with real numbers), Legend, Onboarding + pledge, location + notification priming, push copy EN, Settings (language/units/appearance), About/Sources/Disclaimer, Spanish strings for all of the above, VoiceOver/TalkBack labels |
| **Stretch** | Check My Drive + detour + handoff, Drive Mode (voice EN/ES), background geofence alerts, Crew list export, BottomAccessory, Live Activity, iOS widgets, Lottie polish, light theme |
| **Roadmap (label as "planned")** | Report water over road, Critical Alerts entitlement, Android widgets/Live Updates (Android 16 ProgressStyle + `POST_PROMOTED_NOTIFICATION` [V-web: androidauthority]), CarPlay/Android Auto, custom alert sound, MRMS rain layer, NWM outlook |

### I.2 Acceptance checklist (design QA)
- [ ] No banned word anywhere (grep EN/ES string files for safe|clear|seguro|despejado|OK). The only allowed hits are the approved negated disclaimers ("never says a road is safe", "does not mean the road is clear"), kept in an allow-list.
- [ ] Every number uses `tabular-nums`. Every ETA is a range.
- [ ] Contrast tests: run `contrast.py` on the final tokens. All text is ≥4.5, all non-text ≥3.
- [ ] With grayscale and deuteranopia simulation (iOS Accessibility → Color Filters), all 5 states are distinguishable by shape and word.
- [ ] Reduce Motion ON: no loops, no travel, instant ring.
- [ ] Reduce Transparency ON: no glass.
- [ ] Largest Dynamic Type / Android 200% font: no truncated status words. Card and sheet reflow.
- [ ] VoiceOver/TalkBack: map has a list alternative, markers are labeled, sheet detents are adjustable, alerts are announced.
- [ ] Spanish +30%: no clipped buttons. Spoken alerts sound natural (native-speaker review).
- [ ] Airplane mode: stale → UNKNOWN within the threshold. Banner shows age.
- [ ] Drive Mode: targets ≥76pt, text ≥32/24pt, ≤3 items per glance, no typing.
- [ ] Replay is always visibly labeled REPLAY and can never be confused with live.
- [ ] Calm-day demo (judges): app looks complete and alive, with nothing broken.

### I.3 Open questions for the other workstreams
1. **Map library:** this spec assumes MapLibre (dev build). If the build plan requires Expo Go, use react-native-maps and accept the degradations noted in §5/§A.4.
2. **Staleness thresholds** (per gauge cadence) and the "stale → UNKNOWN" rule: set by the backend.
3. **Probability exposure:** show only levels plus ranges in the main UI. ML probabilities go on the full detent only, and only if calibrated.
4. **Nav handoff URL schemes and waypoint support** (Apple/Google/Waze): to be verified by the routing owner.
5. **Official status vocabulary** from City of Austin/ATXfloods: map it to CLOSED, or to "official: no closure reported". Never map it to "open/safe".
6. **Apple Developer account** (paid) needed for Live Activities/App Groups and device builds [U].

---

## Sources (consulted 2026-10-14)
- npm registry (`npm view`, `npm pack`): expo 57.0.28, expo-router 57.0.26, expo-template-default 57.0.30, expo-widgets 57.0.24, expo-glass-effect 57.0.4, @expo/ui 57.0.23, expo-symbols 57.0.3, expo-haptics 57.0.3, expo-notifications 57.0.22, expo-font 57.0.4, react-native-screens 4.26.0, react-native-reanimated 4.5.1, @maplibre/maplibre-react-native 11.5.0, react-native-maps 1.27.2, @lodev09/react-native-true-sheet 3.11.18, @gorhom/bottom-sheet 5.2.14, heroui-native 1.0.10, uniwind 1.12.2, victory-native 42.0.1, @protomaps/basemaps 5.7.2, @expo-google-fonts/inter 0.4.2, sf-symbols-typescript 2.2.0
- Apple: WWDC25 "Meet Liquid Glass"/session 323 (developer.apple.com/videos/play/wwdc2025/323); WWDC25-361 Icon Composer (wwdcnotes.com); startMonitoring 20-region limit (developer.apple.com tutorials data snippet); Apple Weather next-hour precipitation (support.apple.com/102594); ADA 2024/2025/2026 coverage (apple.com/newsroom via search, 9to5mac.com, techcrunch.com, pocketgamer.biz, iphoneincanada.ca, bgr.com)
- iOS 27/WWDC26: tomsguide.com, bgr.com, tapsmart.com/news/wwdc26-recap. NN/g Liquid Glass critique (anderegg.ca, osnews.com)
- Material 3 Expressive: dezeen.com, fastcompany.com, neowin.net, codelabs.developers.google.com; Google Maps M3E (tomsguide.com, 8bittoast.com); Immersive Navigation (kold.com)
- Watch Duty: support.watchduty.org (Critical Alerts), tomsguide.com, rollingstone.com, bigsurkate.blog. Flighty: 9to5mac.com (2022/10/24), cur.at Behind the Design. Citizen: medium.com/citizen, eyeondesign.aiga.org. Windy community forum. FEMA app (3blmedia.com, waterisac.org). Tide Guide (apps.apple.com, forbes.es)
- NHTSA distraction guidelines (autoblog.com 2013, kbb.com, nhtsa.gov PDF). Android for Cars visual principles and sizing (developers.google.com/cars). Touch targets (frontendchecklist.io and others citing HIG/M3)
- OpenFreeMap (openfreemap.org, quick start), Protomaps (docs.protomaps.com), MapLibre PMTiles on Android (maplibre.org docs)
- Live Activity lifetime/budget (developer.apple.com forums, wwdcnotes.com, airship docs); Android 16 Live Updates (androidauthority.com)
- LottieFiles license (help.lottiefiles.com, doc.qt.io); specific LottieFiles asset pages listed in §H.4
- Spanish safety terms: weather.gov (Flash_Card_Flood_Safety_Spanish.pdf, FLYER-Safety-Tips-FLOOD-spanish.pdf), pure.psu.edu "Aviso o alerta"; localization expansion (lightningdesignsystem.com, simplelocalize.io)
- Dark-mode halation guidance (ezud.com, accessibilitychecker.org); CVD simulation: Machado, Oliveira & Fernandes 2009 matrices (computed locally)
