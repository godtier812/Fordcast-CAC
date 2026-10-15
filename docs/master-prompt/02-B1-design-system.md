# PART B — Design System, Visual Specification & Screen Specs (§8–§15)

> File 1 of 2: §8–§11 here; §12–§15 continue in `03-B2-templates-screens.md`.

> **How to read Part B.** This part is the complete visual/UX contract for the FordCast phone app. You (the coding agent) MUST implement screens exactly as specified here unless a § in Part D proves a platform limit, in which case you implement the documented fallback and record it in `docs/design-deviations.md`. Every requirement carries a tier tag — **[MVP]** must ship by Oct 25, **[Stretch]** only after all MVP items pass §7, **[Roadmap]** is shown to users only as "Planned" (never faked). Anything marked **VERIFY BEFORE USE** must be checked in `node_modules/**/*.d.ts` or on a real device before you rely on it; the stated fallback is what you ship if verification fails.
>
> **Global invariants restated (from §3; never violate):** FordCast never says a crossing is "safe" (no green, no "all clear", no "passable"); states are `NO_RISE`, `WATCH`, `AVOID`, `CLOSED`, `UNKNOWN`; times are ranges, never countdowns; official closures override the model; stale/missing data ⇒ `UNKNOWN`; Storm Replay is always labeled **REPLAY** in violet; every status is shape + glyph + word + color.
>
> Wireframe legend used throughout: `○` NO_RISE (hollow circle) · `▲` WATCH (amber rounded triangle) · `◆` AVOID (in ASCII, ◆ stands for the red rounded **octagon**) · `▧` CLOSED (octagon + barricade stripes) · `◌` UNKNOWN (dashed ring + "?") · `▓` map · `~` creek · `[ ]` button · `( )` chip · `◉` user location · `·` gauge dot. All wireframes are drawn at the **393 × 852 pt** reference frame (≈ 33 characters wide).

---

## §8. Design principles & platform look

### 8.1 The nine design principles [MVP]

| # | Principle | What it means in pixels | Test ("Done when") |
|---|---|---|---|
| P1 | **Night-first** | Dark theme is the default and the design target. Drive Mode is always the darker "Drive Night" palette (`#070D18`). No pure white on pure black: primary text `#F2F5FA` on `#0E1726` = 16.44:1. The app never forces screen brightness. | Screens reviewed on a phone at ≤ 30% brightness in a dark room; no element glares (halation) and every status reads. |
| P2 | **Glanceable in 2 seconds** | Every screen answers one question first, in the top-left of its content: *what is the worst state near me / on my route / at this crossing?* Drive Mode: one decision per screen, ≤ 3 items per glance, ≤ 120 characters. | A first-time tester can say the state of the highlighted crossing within 2 s (comprehension test, §42.4). |
| P3 | **Calm but honest** | ~99% of the time nothing is flooding. The calm screen must look premium and alive (live gauges, freshness pulse, Replay invite) but **never** reassuring: no green, no check marks on crossings, no "all clear", no Success haptic. Vocabulary: "No rise detected" / "Sin crecida detectada". | The banned-words CI test (§3.12) passes; a calm-day screenshot contains zero green pixels in status positions. |
| P4 | **The map is the product; chrome floats** | Full-bleed map under the status bar (Android edge-to-edge always on). Controls are small floating **solid tonal** pills in MVP on both platforms (iOS 26 Liquid Glass on chrome is [Stretch F41], §8.3); content lives in opaque sheets. | No opaque bar covers the map except the tab bar and sheets. |
| P5 | **Signs, not colors** | Road-sign grammar: hollow circle (no rise), amber triangle (watch), red octagon (avoid), octagon + barricade stripes (closed), dashed ring + "?" (unknown). Fill polarity (dark ink on amber vs. white on red) separates Watch from Avoid even for deuteranopes. | Every screen is usable in iOS **Grayscale** and in the `tools/cvd_screens.py` protan/deutan/tritan renders (`make cvd`). |
| P6 | **Recency is a state** | Two ages are always visible and never confused: the **check age** (when FordCast last checked, from the snapshot `as_of`: FreshnessPill "Checked 2 min ago" — never the word "Live" on its own) and the **reading age** (the newest upstream gauge reading behind a crossing, from its `latest_obs_at`: "Newest gauge reading: 55 min ago" on the Crossing Card). A crossing **becomes** `UNKNOWN` (dashed) when its **own reading age** passes the per-gauge stale limit (§18.9 freshness rules; client mirror in §28.6) — not because of snapshot age. Ageing data visibly greys out first. Never show a calm look on old readings. Exact strings come from §3.7. | Fake-clock / airplane-mode test: as `now − latest_obs_at` passes each crossing's stale limit (§18.9), that crossing renders `UNKNOWN` with "Last known" (§3.4) while the others keep their state; the FreshnessPill shows the growing check age the whole time. |
| P7 | **Motion explains cause → effect** | Water moves (creek pulse) → state changes (marker morph) → card appears. No decorative loops. At most **two** looping animations on screen at once (Avoid halo + water travel), and loops stop after 3 cycles / 6 s (WCAG 2.2.2). | Screen recording shows no animation that does not correspond to a data event. |
| P8 | **Same layout, native skin** | One layout for both OSes. **MVP:** solid tonal chrome on both platforms; iOS gets SF Symbols and Android gets Material 3 tonal surfaces and Material Symbols. **[Stretch F41]:** iOS 26 swaps the floating chrome to Liquid Glass (§8.3). | Side-by-side screenshots match layout 1:1; only icons (and, once F41 ships, the iOS chrome material) differ. |
| P9 | **Honest capability** | If a capability is missing (Expo Go, permission denied, iOS untested, push unavailable) the UI says so with a `CapabilityBanner`. Replay is never confused with live. Roadmap features appear only in "Built vs. Roadmap" lists, labeled "Planned". | No button leads to a dead end; every disabled feature has a reason string. |

### 8.2 Teardown takeaways (what to borrow, what NOT to copy) [MVP]

| App | What makes it work | FordCast borrows | FordCast must NOT copy |
|---|---|---|---|
| **Apple Weather** | Next-hour precipitation chart; full-bleed condition backgrounds; notifications say when rain starts. | The **"Next 90 min" Risk Window** (a range bracket on a Now·30·60·90 track); the hydrograph as hero. | Minute-precise "starts in 12 min" copy — FordCast shows ranges only. |
| **Apple Maps (iOS 26)** | Glass buttons over the map; partial-height sheets are glass and pull in at the edges; sheets morph from their button. | Native `formSheet` crossing detail with grabber; floating chrome cluster bottom-right (solid tonal in MVP; glass on iOS 26 = [Stretch F41]); `Link.AppleZoom` morph from list rows (iOS, [Stretch]). | Glass behind text-heavy content (FordCast content surfaces are opaque). |
| **Watch Duty** (2025 ADA Social Impact) | Map-first; legend button; per-incident notify toggle; timestamped update log; rare, human-gated critical alerts; "test alert" button. | **Legend "?" button**, **per-crossing "Notify me"**, **timestamped Update log**, **"Send test alert"** in Settings, alert budget (urgent alerts rare). Sound "alerting, not alarming". | Critical Alerts entitlement (Roadmap). |
| **Flighty** (2023 ADA Interaction) | Airport-signage analogy; "boringly obvious"; Live Activity only when it matters; stale data shown honestly; banner expands only on significant change. | Road-sign grammar; Live Activity only during Drive Mode / active saved route ([Stretch], iOS + paid account); `isStale` → grey Unknown. | Running timers in Live Activities (FordCast never shows a countdown). |
| **Waze** | Hazards color-coded on the route; risky segments drawn on the route line itself. | At-risk segment drawn **on the route** (dashed red stretch ±300 m around an Avoid crossing; detour in route blue). | Its light search area at night — FordCast is dark everywhere, including search. |
| **Google Maps (M3 Expressive)** | Key actions (Directions, Save, Share) pinned near the thumb in place sheets. | Crossing sheet action row directly under the headline, visible at the peek detent: **Notify me** [MVP F46] · **Detour** [Stretch F50] · **Share** [Stretch F48] (each Stretch action is hidden until it ships — never a dead button). | Auto-navigation into a route the user didn't preview. |
| **Citizen** | Color = risk + recency; grey after 2 h; restraint when quiet. | **Staleness turns grey (Unknown)**; no "engagement" pings on calm days. | Sensational copy or sirens. |
| **Carrot Weather** | Clean modular cards. | Card rhythm (16 pt padding, 12 pt gaps, 20–24 pt radii). | Deep layout customization — FordCast keeps a fixed layout for safety. |
| **Tide Guide** (2026 ADA Visuals) | Large calm water curves; widgets for current tide. | Hydrograph as hero of the crossing sheet; widgets show the upstream trend ([Stretch]). | Time-of-day palette shifts (status colors must be constant). |
| **Windy / MyRadar** | Play/pause/scrub timeline with speed control; users complain playback is too fast. | Replay scrubber with play/pause, labeled speeds **1× · 10× · 30× · 60× · 120×** (§4 F78), prev/next-event jumps, event ticks, readable default (60×). | Unlabeled speeds; tiny scrub handles. |
| **oko** (2024 ADA Inclusivity) | State conveyed by haptics + audio for blind users. | Haptic + voice grammar per state (§11); eyes-free Drive Mode. | — |
| **Tesla app** | Minimal dark controls; criticized for grey-on-grey active states. | — | Grey-on-grey on/off encoding: FordCast active states use the inverse pill (`#F2F5FA` bg / `#0E1726` text). |

**Five lessons that govern every decision below:** (1) the map is the product and chrome floats; (2) sign-like shapes beat colors; (3) recency/staleness is a visible state; (4) urgent alerts are rare and opt-in; (5) data viz is the hero, not decoration.

### 8.3 iOS 26/27 look: Liquid Glass on chrome only [Stretch F41; MVP = solid surfaces on both platforms; iOS = "compiles, untested" unless a paid account/Mac exists, §26]

0. **[MVP] Solid chrome everywhere.** In MVP every floating chrome element (gear, legend, layers, locate, list, FreshnessPill, Replay scrubber chrome, and the JS replay mini-bar once it ships [Stretch]) renders the **solid tonal fallback** on both platforms: `theme.glassFallback` background + 1 pt `border.subtle` + the floating shadow (§10.7, §10.8). `GlassSurface`/`GlassIconButton` exist from Day 1 so call sites never change, but their gate below is hard-wired off by the flag `features.glassChrome = false` in `src/lib/flags.ts` (§28.10). The native tab bar and native `formSheet` chrome keep whatever the OS draws (on iOS 26 that is automatic system glass, which FordCast neither adds nor removes). Rules 1–4 below apply once **[Stretch F41]** flips `features.glassChrome` to `true` after an iOS 26 device test (Lane B, §26).
1. **Glass is for controls and navigation; content is opaque.** Glass MAY be used only on: the NativeTabs tab bar (automatic), floating icon buttons (gear, legend, layers, locate, list), the FreshnessPill, the Replay scrubber chrome, the bottom accessory mini-player, and native `formSheet` chrome at partial height (automatic). Status cards, sheet bodies, lists, alert rows and Drive Mode MUST be opaque `surface.1`/`surface.2`.
2. **Never glass on glass.** Adjacent glass buttons go inside one `GlassContainer spacing={8}`.
3. **Gate every glass surface** (MVP ships this code with `features.glassChrome = false`):
   ```ts
   // src/components/fordcast/GlassSurface.tsx (gate logic)
   import { GlassView, isLiquidGlassAvailable, isGlassEffectAPIAvailable } from 'expo-glass-effect';
   const glassOK = features.glassChrome                     // [Stretch F41]; false in MVP → solid fallback everywhere
                   && Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable()
                   && !a11y.reduceTransparency;            // a11y from A11yPrefsProvider (§34)
   // glassOK → <GlassView glassEffectStyle="regular" tintColor="rgba(14,23,38,0.55)" isInteractive={pressable} />
   // else    → <View style={{ backgroundColor: theme.glassFallback, borderWidth: 1, borderColor: theme.border.subtle }} />
   ```
   Never animate a `GlassView`'s `opacity` to 0 (documented limitation) — unmount it or swap to the fallback instead.
4. **iOS 27 transparency slider:** users can make glass fully clear. Therefore text on glass is allowed only as `text.primary` at ≥ 15 pt semibold, and must still pass 4.5:1 over a white map pixel using the fallback scrim (`rgba(14,23,38,0.80)` gives 8.84:1 primary / 5.20:1 secondary).
5. **Tab bar [MVP config, applies with or without F41]:** `NativeTabs` renders a Liquid Glass capsule on iOS 26 automatically and ignores `backgroundColor`. Set `minimizeBehavior="never"` on the Map tab (the tab bar must stay visible during storms) — VERIFY BEFORE USE that `minimizeBehavior` accepts `'never'` in `node_modules/expo-router/build/native-tabs/types.d.ts`; fallback: omit the prop.
6. **Sheets:** native `formSheet` routes get glass at partial height and become opaque at full height automatically. Do **not** set a custom `presentationBackground`/`contentStyle` background on iOS sheets; set the background only on Android (`surface.1`).
7. **NN/g critique (Oct 2025, "Liquid Glass is cracked")** is the reason for rules 1 and 4: legibility beats spectacle for a safety app.

### 8.4 Android 15/16 look: Material 3 Expressive cues, edge-to-edge [MVP — primary target]

| Element | Android spec |
|---|---|
| Edge-to-edge | Always on in SDK 57. The map draws under the status bar and gesture-nav bar. All chrome uses `useSafeAreaInsets()`; never hard-code insets. Status bar icons light (`<StatusBar style="light" />`). |
| Tab bar | `NativeTabs` → M3 bottom navigation. `backgroundColor="#0E1726"`, `indicatorColor="#24344F"` (surface.3), `rippleColor="#24344F"`, `iconColor={{ default: '#8A97AB', selected: '#F2F5FA' }}`, `labelStyle={{ default: { color: '#8A97AB' }, selected: { color: '#F2F5FA' } }}`, `labelVisibilityMode="labeled"`. Max 5 tabs (we use 4). |
| Floating buttons | Tonal solid: `theme.glassFallback` (`rgba(14,23,38,0.92)` on Android — the `glass.fallback` token in §9.2, 13.24:1 primary text over a white map pixel) + 1 dp `border.subtle`, elevation 6. One token for every floating surface so `GlassSurface` has a single fallback. No blur over the map (Android blur over a GL surface is unreliable). |
| Sheets | `formSheet` renders a native bottom sheet; top radius 28 dp (`sheetCornerRadius: 28` on Android only), max 3 detents (we use exactly 3). The persistent Map Home sheet (gorhom) uses the same 28 dp top radius and `surface.1`. |
| Shape & motion | M3 Expressive: generous radii (20–28), spring motion (`spring.*` tokens in §11), emphasized type for headlines. Buttons are full pills. |
| Loading | Indeterminate loading uses a slim spinner in `text.secondary` inside the component that is loading (never a full-screen spinner over the map). `@expo/ui/jetpack-compose` `LoadingIndicator` MAY replace it [Stretch] after a device test. |
| Back | System back closes the top sheet, then pops the stack. Predictive back stays **off** (`predictiveBackGestureEnabled: false` in the template) for MVP. |
| Haptics | `performAndroidHapticsAsync(AndroidHaptics.*)` where verified, else `impactAsync` (§11.6). |
| Notifications | Channels `crossing-urgent`, `crossing-watch`, `updates`, `drive-mode` (§3.8) with localized names (§15.1, §31.1); small icon is a white monochrome glyph (§15.6). |

### 8.5 "Same layout, native skin" matrix [MVP]

| Element | iOS 26/27 | Android 15/16 | Shared |
|---|---|---|---|
| Tab bar | System capsule (glass drawn by iOS 26 itself), SF Symbols (`sf=`) | M3 bottom nav, Material Symbols (`md=`) | 4 tabs: Map · Drive · Replay · Alerts |
| Floating chrome | **MVP:** solid `theme.glassFallback` (`rgba(14,23,38,0.80)`) + 1 pt `border.subtle`. **[Stretch F41]:** `GlassView` (regular, tint `rgba(14,23,38,0.55)`) | Solid `theme.glassFallback` (`rgba(14,23,38,0.92)`) + 1 dp outline (always) | 44 pt visual / 48 pt hit area |
| Crossing sheet | `formSheet`, system concentric radius (no `sheetCornerRadius` on iOS), system material at partial height | Native bottom sheet, 28 dp radius (`sheetCornerRadius: 28`, Android only), opaque `surface.1` | Detents 0.32 / 0.62 / 1.0 |
| Toggles / segmented | RNR `Switch` / `ToggleGroup` restyled (§12.4) | same | `@expo/ui` native controls MAY replace [Stretch] |
| Non-safety toasts | sonner-native, top-center under the Dynamic Island | same, top-center | Safety messages never use toasts (inline `AlertBanner`) |
| Icons | SF Symbols via `expo-symbols` | Material Symbols via `expo-symbols` | Status glyphs are custom SVG, identical on both |
| Haptics | `notificationAsync` / `impactAsync` / `selectionAsync` | `performAndroidHapticsAsync` or `impactAsync` | Semantic map in §11.6 |

### 8.6 Phone ergonomics [MVP]

**Reference frames.** Design at **393 × 852 pt** (6.1", iPhone 16/17-class). Verify every screen at **402 × 874** (6.3"), **440 × 956** (6.9"), and a typical Android **412 × 915 dp** with 3-button nav AND gesture nav [device sizes are approximate — check on the actual test phones]. Never hard-code a screen height; compute sheet detents and map insets from `useWindowDimensions()` and `useSafeAreaInsets()`.

```
393 pt reference — vertical zones (one-handed, right or left thumb)
┌─────────────────────────────────┐  0
│ status bar / Dynamic Island     │  safeTop (≈59 pt on DI iPhones; Android ≈ 24–48 dp)
│ (● Checked 2 min ago)   [?] [⚙] │  "Glance zone": read-only info + rare actions (gear, legend)
│                                 │  ── top 25%: OUT of one-handed reach on 6.7–6.9" phones
│            MAP                  │
│                                 │  "Stretch zone": map pan/zoom only
│                          [☰]    │
│                          [≡]    │  ── map controls (List, Layers, Locate) at 55–70% height
│                          [➤]    │     right edge, 16 pt from edge, 16 pt above the sheet
├─────────────────────────────────┤  ── bottom 45%: "Thumb zone" — ALL primary actions live here
│ sheet: status + [Drive Mode]    │  MVP
│        [Check my drive]         │  [Stretch F49] — hidden until it ships
│ [Map] [Drive] [Replay] [Alerts] │  tab bar + safeBottom (≈34 pt home indicator / Android nav)
└─────────────────────────────────┘  852
```

| Rule | Value |
|---|---|
| Minimum touch target | **48 × 48 pt/dp everywhere** (exceeds iOS 44 pt and equals Android 48 dp); `hitSlop` extends small icons to 48. ≥ 8 pt between targets. |
| Drive Mode targets | **76 pt** minimum height, **≥ 24 pt** gaps (exceeds the decision-sheet floor of 64 pt; Android-for-Cars guidance). The "Take detour" button [Stretch F50; shown only when routing exists] grows to 96 pt during an approach alert. |
| Safe areas | Content never sits under the Dynamic Island, the home indicator, or the Android gesture bar. Top chrome = `safeTop + 8`. Bottom sheet `bottomInset` = tab bar height (see §12.2 Step 4). |
| Gutters | 16 pt screen gutter; 20 pt when width ≥ 428 pt. |
| Reach | Every primary action (Drive Mode, Notify, Play [MVP]; Check my drive [Stretch F49], Detour [Stretch F50]) is in the bottom 45%. Only read-only info (freshness), Settings and Legend live in the top band. |
| Left-handed parity | [Stretch, §4 F38b] Map control cluster mirrors to the left edge when Settings → Accessibility → "Controls on left" is on. Done when: with the toggle on, the dev gallery's Map Home mock and the real Map Home show List/Layers/Locate on the left edge with the same 16 pt margins and the a11y order unchanged. |
| Keyboard | Search inputs use `react-native-keyboard-controller` (installed in the Day-1 build, §25.4; VERIFY BEFORE USE its component/hook names in `node_modules/react-native-keyboard-controller/lib/typescript/**/*.d.ts`; fallback RN `KeyboardAvoidingView`); the focused field stays above the keyboard (WCAG 2.4.11). |

### 8.7 Orientation policy [MVP: portrait everywhere, including Drive Mode; Stretch §4 F94: landscape Drive Mode first, then Map Home + Crossing sheet]

- **[MVP]** Every screen is **portrait-only, Drive Mode included**: `orientation: 'portrait'` in `app.config.ts` (§27.3). Drive Mode's portrait layout (§13.11) MUST work on a portrait car mount. No per-screen orientation option is set in MVP.
- **[Stretch F94, step 1 — Landscape Drive Mode]** (car mounts are often landscape). Switch `app.config.ts` to `orientation: 'default'` and lock per screen with the native-stack screen option `orientation` (`'portrait_up'` on the root Stack's `screenOptions`, `'all'` on `drive-mode`). VERIFY BEFORE USE: confirm the `orientation` option exists in `node_modules/react-native-screens/lib/typescript/**/types.d.ts` and works inside Expo Router's root Stack on an Android device. If it does not verify, stay portrait-only (the MVP config) and log the result in `docs/decisions/verifications.md`. Drive Mode landscape layout: status column left 60 %, `BigActionButton` stack right 40 %, same 76 pt targets and 24 pt gaps.
- **[Stretch F94, step 2]** Unlock landscape on Map Home and the Crossing sheet (map left 60 %, sheet as a right-side panel 40 %) to satisfy WCAG 1.3.4.
- **Claims rule (from research/cac.md REQ-A11Y-11):** the Claims Ledger (§44), README and video MUST NOT claim WCAG 1.3.4 (Orientation) conformance until F94 step 2 ships and passes its §4 "Done when".

### 8.8 Information architecture & screen inventory [MVP unless tagged]

```
Root Stack (Stack.Protected onboarding gate)
├── (onboarding)/      index (welcome + EN/ES) · how · legend · pledge                     [MVP]
├── (tabs) NativeTabs ─┬─ Map     sf map.fill / md map                    [MVP]  Map Home + persistent sheet
│                      ├─ Drive   sf car.fill / md directions_car         [MVP: Drive Mode entry + saved crossings; places Stretch F51; route check Stretch F49]
│                      │          drive/index (MVP shell, §13.10) · drive/result [Stretch F49]
│                      ├─ Replay  sf clock.arrow.circlepath / md history  [MVP]  replay/index · replay/[stormId] · replay/results
│                      └─ Alerts  sf bell.fill / md notifications         [MVP]  alerts/index · alerts/saved (saved crossings MVP; places/routes Stretch F51) ; badge = unread AVOID/CLOSED
├── crossing/[id]      formSheet 0.32 / 0.62 / 1.0 (deep link fordcast://crossing/<id>)   [MVP] (§4 F43)
├── gauge/[id]         formSheet fitToContents (gauge mini-card)          (added by §13)   [Stretch] (§4 F39)
├── search             formSheet [0.9]                                                     [MVP: crossings F37; Stretch: places F52]
├── legend             formSheet fitToContents                                             [MVP] (§4 F33)
├── layers             formSheet fitToContents                                             [Stretch] (§4 F38)
├── handoff            formSheet fitToContents (Apple/Google/Waze)        (added by §13)   [Stretch] (§4 F53)
├── drive-mode         fullScreenModal, gestureEnabled false                               [MVP] (§4 F57; also hosts the simulated replay drive, §4 F128 [MVP])
├── permission/[kind]  modal: location | notifications | background                        [MVP: location, notifications; Stretch: background]
├── settings/          stack from the gear: index · language · notifications · accessibility · drive ·
│                      data-sources · how-it-works · accuracy · privacy · about · legal · debug (__DEV__, §4 F107)
│                      (units and appearance are pickers inside index; Credits & licenses live in about)  [MVP]
├── crew               stack (Hotspot list, "Likely to flood next")                         [Stretch] (§4 F100; CSV export Stretch F101)
└── dev/gallery        __DEV__ only: every component in every state      (added by §12.7)  [MVP] (§4 F31b)
```

Route files and layouts are owned by §28; §28 MUST use these route names and tiers (or update this table in the same commit). §4 is the single tier authority: if a tier here ever disagrees with §4, §4 wins and this table is corrected. The MVP Map Home sheet's **"Ranked" segment** (same sort as the crew list: state, then window lower bound) stays [MVP]; only the separate `crew` route is Stretch.

**Two-tap rule (from v4):** Check My Drive [Stretch F49] = 1 tap (Drive tab). Drive Mode = 1 tap (sheet button or Drive tab). Storm Replay = 1 tap (Replay tab). A crossing = 1 tap on its marker or row. The detour [Stretch F50] = 2 taps (crossing → Detour). Settings/Help = 1 tap on the gear, which sits in the same top-right position on every tab (WCAG 3.2.6 Consistent Help).

### 8.9 Calm-state design (≈99% of the time) [MVP]

- **What fills the calm screen:** (1) the FreshnessPill ("Checked 2 min ago") "breathes" once every 10 s (one 3 s opacity cycle) to show FordCast is still checking — it shows the check age only and never the word "Live" on its own (§8.1 P6); (2) watched creeks drawn in calm cyan at 50%; (3) upstream gauges as small cyan dots (tap → gauge mini-card [Stretch F39]; in MVP a tap does nothing beyond the dot's a11y label); (4) NO_RISE crossings as small slate hollow circles at zoom ≥ 11 (clusters below); (5) the sheet's half detent shows the user's **saved crossings** [MVP F46] with their chips ("No rise detected · as of 7:02 AM"; saved routes join this list only when F51 ships [Stretch]), a **Storm Replay invite card** ("See how FordCast handled a real storm →" / "Vea cómo FordCast manejó una tormenta real →", §13.5), and a "How FordCast works" card during the first 7 days.
- **Calm vocabulary (EN / ES)** — copy these verbatim from §3.7 `state.no_rise.*` (if §3.7 changes, §3.7 wins): chip "No rise detected" / "Sin crecida detectada"; area headline "No upstream rise detected near you" / "No se detecta crecida río arriba cerca de usted"; supporting line "Watching {{g}} upstream gauges for {{c}} crossings · updated {{age}}" / "Vigilando {{g}} medidores río arriba para {{c}} cruces · actualizado {{age}}"; footer (always visible) "Water can cover a road without warning. Turn around, don't drown." / "El agua puede cubrir el camino sin previo aviso. ¡Dé la vuelta, no se ahogue!"
- **Calm map styling:** the map reads as quiet blue-grey with thin cyan veins — beautiful without being "green".

### 8.10 Acceptance for §8
- [ ] Done when [MVP]: iOS (if available) and Android screenshots of Map Home calm/storm match layout; every FordCast floating control uses the solid `glassFallback` surface (no `GlassView` renders while `features.glassChrome` is false).
- [ ] Done when [Stretch F41]: with `features.glassChrome` on, glass appears only on chrome (§8.3 rule 1) on an iOS 26 device, and Reduce Transparency ON shows zero glass.
- [ ] Done when: every interactive element measures ≥ 48 pt (≥ 76 pt in Drive Mode) in the dev gallery's "target size" overlay (§12.7).
- [ ] Done when [MVP]: every screen, Drive Mode included, stays portrait on Android with the phone rotated, and Drive Mode is fully usable on a portrait mount.
- [ ] Done when [Stretch F94]: Drive Mode rotates to landscape on Android while every other screen stays portrait (or the per-screen lock failed verification and the portrait-only result is logged).

---
## §9. Design tokens

> Canonical source: research/design.md §A.2/§A.3/§A.4 (re-verified with the WCAG 2.x formula on 2026-10-14; every ratio below was recomputed). **One source of truth:** `mobile/src/lib/theme.ts` holds raw hex (Skia, MapLibre, SVG and haptics code need raw values); `mobile/src/global.css` holds the same values as HSL triplets for NativeWind/RNR classes. A parity test (§9.13) fails CI if they drift.

### 9.1 Palette primitives [MVP]

| Name | Hex | Name | Hex |
|---|---|---|---|
| `navy950` | `#070D18` (Drive Night bg) | `slate500` | `#6B7890` (input borders) |
| `navy900` | `#0B1320` (map land) | `slate450` | `#7A879C` (unknown ring) |
| `navy850` | `#0E1726` (canvas, ink) | `slate400` | `#8A97AB` (no-rise, tertiary text) |
| `navy800` | `#152033` (surface.1) | `slate300` | `#B4BFD0` (secondary text) |
| `navy750` | `#1C2940` (surface.2) | `ice` | `#F2F5FA` (primary text) |
| `navy700` | `#24344F` (surface.3) | `iceDim` | `#E6EBF2` (Drive Mode text) |
| `navy600` | `#2A3A55` (border.subtle) | `amber500` | `#F5A623` (watch) |
| `navy550` | `#3A4D6E` (border.strong) | `amber800` | `#9A5B00` (light-theme amber text, avoid using) |
| `red600` | `#C62828` (avoid/closed fill) | `red400` | `#FF5470` (avoid text/icons, dark) |
| `red700` | `#B71C1C` (HC avoid fill) | `red300` | `#FF8095` (HC avoid text) |
| `cyan400` | `#2BD9D9` (water, dark) | `cyan700` | `#0A7C80` (water, light) |
| `blue400` | `#5AA9FF` (route, dark) | `blue300` | `#6CB4FF` (focus ring / links) |
| `blue700` | `#1A66D9` (route/focus, light) | `violet300` | `#B69CFF` (replay, dark) |
| `violet700` | `#5B3CC4` (replay, light) | `white` | `#FFFFFF` |

**Reserved hues (never reuse):** cyan = water data only; violet = Replay only; amber/red = risk states only; blue = route, links and focus only. There is **no green anywhere** in the product, including success toasts, toggles and charts.

### 9.2 Dark theme (default) semantic tokens [MVP]

Contrast = WCAG ratio against the named background (bg `#0E1726`, s1 `#152033`, s2 `#1C2940`, s3 `#24344F`).

| Token | Hex | Use | Contrast (verified) |
|---|---|---|---|
| `bg.canvas` | `#0E1726` | app background, tab bar (Android) | — |
| `map.land` | `#0B1320` | basemap land (slightly darker so UI floats) | — |
| `surface.1` | `#152033` | cards, sheet bodies, status card | primary 14.94 |
| `surface.2` | `#1C2940` | inputs, segmented track, secondary buttons, popovers | primary 13.34 · avoid.fg 4.69 · tertiary 4.93 |
| `surface.3` | `#24344F` | pressed/selected rows only | primary 11.44 · **no status text** (avoid.fg 4.02 ✖, tertiary 4.23 ✖) |
| `scrim` | `rgba(5,9,16,0.60)` | modal dim | — |
| `glass.tint` | `rgba(14,23,38,0.55)` | `GlassView tintColor` | — |
| `glass.fallback` | `rgba(14,23,38,0.80)` (iOS w/o glass) · `rgba(14,23,38,0.92)` (Android) | floating chrome when no glass | over white map: primary 8.84 / secondary 5.20 (0.80); 13.24 / 7.79 (0.92) |
| `text.primary` | `#F2F5FA` | body, titles | 16.44 bg · 14.94 s1 · 13.34 s2 |
| `text.secondary` | `#B4BFD0` | supporting text | 9.67 bg · 8.79 s1 · 7.85 s2 |
| `text.tertiary` | `#8A97AB` | timestamps, axis labels | 6.07 bg · 5.52 s1 · 4.93 s2 · never on s3 |
| `text.disabled` | `#5B6880` | disabled labels (WCAG-exempt) | 2.90 s1 |
| `text.onAccent` | `#0E1726` | ink on amber / cyan / violet / ice | 8.86 / 10.29 / 7.86 / 16.44 |
| `border.subtle` | `#2A3A55` | decorative hairlines | 1.57 bg (decorative only) |
| `border.strong` | `#3A4D6E` | dividers in dense lists | 2.11 bg |
| `border.input` | `#6B7890` | input, checkbox, unselected chip outlines | 3.67 s1 ✓ (≥ 3:1) |
| `focus.ring` / `accent.link` | `#6CB4FF` | 2 pt focus ring, links, switch-on track | 8.22 bg · 7.47 s1 |
| `action.primary.bg` / `.fg` | `#F2F5FA` / `#0E1726` | **inverse pill** primary CTA (hue-free, no status confusion) | 16.44 |
| `action.secondary.bg` / `.fg` | `#1C2940` / `#F2F5FA` | secondary buttons | 13.34 |
| `status.noRise` | `#8A97AB` | NO_RISE ring + text | 6.07 bg |
| `status.watch` | `#F5A623` | WATCH fill, text ≥ 18 pt semibold | 8.86 bg · ink on it 8.86 |
| `status.avoid.fg` | `#FF5470` | AVOID/CLOSED text + icons (≥ 18 pt semibold) | 5.78 bg · 5.25 s1 · 4.69 s2 |
| `status.avoid.fill` | `#C62828` | AVOID/CLOSED chip + marker fill | white on it 5.62 · vs bg 3.19 · vs s1 **2.90 → always add a 1 pt `#FF5470` rim on surfaces, 2 pt white rim on the map** |
| `status.unknown` | `#7A879C` | UNKNOWN dashed ring | 4.94 bg · 4.49 s1 |
| `water` | `#2BD9D9` | hydrograph line, active creeks, gauge dots | 10.29 bg |
| `water.calm` | `rgba(43,217,217,0.50)` | calm creeks | ≥ 3.0 vs land |
| `route` | `#5AA9FF` | route line (6 pt + casing), user dot | 7.32 bg (vs water: deutan ΔE 15.9, tritan 10.7 → width + casing difference is mandatory) |
| `replay` | `#B69CFF` | REPLAY banner, chip, scrubber | 7.86 bg · ink on it 7.86 |

### 9.3 Light theme (opt-in daytime) [Stretch]

| Token | Hex | Contrast |
|---|---|---|
| `bg.canvas` / `map.land` | `#F4F6FA` / `#EEF1F5` | — |
| `surface.1` / `.2` / `.3` | `#FFFFFF` / `#EAEEF4` / `#DDE3EC` | — |
| `text.primary` | `#0E1726` | 16.60 bg · 17.96 s1 |
| `text.secondary` | `#3F4B60` | 8.13 bg |
| `text.tertiary` = `status.noRise` | `#5E6B80` | 4.99 bg · 5.40 white · 4.64 s2 |
| `text.disabled` | `#9AA5B6` | exempt |
| `border.subtle` / `.strong` | `#D5DCE6` / `#B8C2D1` | decorative |
| `border.input` | `#76839A` | 3.83 white · 3.54 bg |
| `focus.ring` / `accent.link` / `route` | `#1A66D9` | 4.92 bg |
| `status.watch.fill` + ink | `#F5A623` + `#0E1726` | 8.86. Map marker adds a 1.5 pt `#0E1726` outline (amber vs land only 1.79). **Never amber text in light theme.** |
| `status.avoid.fg` / `.fill` | `#C62828` / `#C62828` + white | 5.20 bg / 5.62 |
| `status.unknown` | `#6B7890` | 4.12 bg |
| `water` | `#0A7C80` | 4.61 bg |
| `replay` | `#5B3CC4` | 6.72 bg · white on it 7.27 |
| `action.primary` | bg `#0E1726`, fg `#FFFFFF` | 17.96 |

Drive Mode ignores the light theme (always Drive Night). The map style stays "FordCast Night" in light theme for MVP (a light basemap is [Roadmap]).

### 9.4 Increase-Contrast token set [MVP]

Activated when iOS **Increase Contrast** (`AccessibilityInfo.isDarkerSystemColorsEnabled`) or Android **High contrast text** (`isHighTextContrastEnabled`) is on, or Settings → Accessibility → "Increase contrast" is on. Borders go 1 → 2 pt; hairlines rise to ≥ 3:1.

| Role (dark) | Normal | HC value | HC contrast |
|---|---|---|---|
| `status.avoid.fg` | `#FF5470` | **`#FF8095`** | 7.50 bg · 6.82 s1 · 6.09 s2 |
| `status.avoid.fill` | `#C62828` | **`#B71C1C`** + 2 pt white rim everywhere | white on it 6.57 (fill vs bg 2.73, hence the rim) |
| `status.noRise` / `text.tertiary` | `#8A97AB` | **`#A9B4C6`** | 8.58 bg · 7.80 s1 |
| `status.unknown` ring | `#7A879C` | **`#9AA6B8`** | 7.29 bg |
| `border.subtle` | `#2A3A55` | `#6B7890` | 4.03 bg |
| `border.strong` | `#3A4D6E` | `#8A97AB` | 6.07 bg |
| `status.watch` | `#F5A623` | unchanged | 8.86 |
| Light theme HC | — | `status.avoid.fg/fill` → `#B71C1C` (6.07 on bg); `text.tertiary` → `#4A566B` (6.85 bg) | — |

### 9.5 Drive Night tokens [MVP, with Drive Mode]

| Token | Hex | Contrast |
|---|---|---|
| `drive.bg` | `#070D18` | — |
| `drive.text.primary` | `#E6EBF2` | 16.23 |
| `drive.text.secondary` | `#B4BFD0` | 10.47 |
| `drive.surface` | `#0E1726` (cards) | text 14.99 |
| status colors | same as dark (watch 9.60, avoid.fg 6.25 on drive.bg) | — |
| `drive.edgeGlow` | 8 pt inner border `#FF5470` at 0.9 (static, not flashing) during an Avoid approach | — |

### 9.6 Status system (the core) [MVP]

Internal enum (TypeScript `RiskState`) and rank (higher = more severe, used for clustering, sorting, and "worst state" logic): `NO_RISE 0 · UNKNOWN 1 · WATCH 2 · AVOID 3 · CLOSED 4`. Wire strings (§3.2) map **1:1 and only these five**: `no_rise → NO_RISE`, `watch → WATCH`, `avoid → AVOID`, `closed → CLOSED`, `unknown → UNKNOWN` (mapping lives in `src/features/risk/state.ts`, §28.6). The retired research names (`no_signal`, `flooded`, and any other value) are **rejected** by the zod `WireState` enum (§28.5) — never silently mapped, because accepting them would hide a backend contract bug. Validation is **per crossing**: if one crossing record fails to parse, that crossing alone renders `UNKNOWN` (dashed ring + the `state.unknown.*` offline copy from §3.7) and the parse error is logged (dev console + Sentry breadcrumb if F125 ships); every other crossing in the snapshot still renders normally. A crossing present in the bundled seed but missing from the snapshot also renders `UNKNOWN`.

| State | Word EN / ES (chip, UPPERCASE in chips) | Shape (map marker) | Glyph | Chip | Text/icon color (dark · light · HC) | Spoken (a11y/TTS) EN / ES | Haptic on enter (§11.6) | Sound |
|---|---|---|---|---|---|---|---|---|
| `NO_RISE` | No rise detected / Sin crecida detectada | 12 pt **hollow circle**, 2 pt `#8A97AB` stroke, no fill; hidden below z11 (clustered) | none (empty center) | outline chip: 1.5 pt `#8A97AB` border, `#8A97AB` text, no fill | `#8A97AB` · `#5E6B80` · `#A9B4C6` | "No rise detected" / "Sin crecida detectada" | none | none |
| `WATCH` | Watch / Precaución | 28 pt **rounded triangle**, amber fill, ink "!" glyph, 20% amber halo (radius 22 pt) | "!" ink `#0E1726` | **amber fill `#F5A623` + ink `#0E1726`** | `#F5A623` (≥ 18 pt semibold only) · ink-on-amber only · unchanged | "Watch" / "Precaución" | Warning | soft chime (Drive Mode / alerts on) |
| `AVOID` | Avoid / Evite | 32 pt **rounded octagon**, fill `#C62828`, white "!" glyph, **2 pt white rim**, red halo pulse (2 s period, 3 cycles then static, §11) | "!" white | **red fill `#C62828` + white text** + 1 pt `#FF5470` rim on surfaces | `#FF5470` · `#C62828` · `#FF8095` | "Avoid" / "Evite" | Error (once) | alert chime |
| `CLOSED` | Flooded – Closed / Inundado – Cerrado | 32 pt octagon, fill `#C62828`, **white 45° barricade stripes** (3 stripes, 2.2 pt wide, 6 pt pitch, clipped to the octagon), 2 pt white rim, **no pulse**; + 14 pt shield badge top-right and "OFFICIAL" micro-label when the source is official | barricade | red fill + white + stripe texture (white @ 0.25, 6 pt pitch) + "OFFICIAL" suffix when official | `#FF5470` · `#C62828` · `#FF8095` | "Flooded, closed" / "Inundado, cerrado" (+ "Official" / "Oficial") | Error (once) | alert chime + TTS "Turn around, don't drown" in Drive Mode |
| `UNKNOWN` | Unknown – data offline / Desconocido – sin datos (chip: "UNKNOWN" / "DESCONOCIDO") | 24 pt **dashed ring** (3/3 dash, 2 pt) `#7A879C`, "?" glyph, no fill. Variants **last-known** (§3.4): if the last known state was WATCH, AVOID or CLOSED, add a 12 pt badge of that state's shape at top-right inside a dashed frame — amber triangle (`ic-unknown-lastwatch`), red octagon (`ic-unknown-lastavoid`), striped octagon (`ic-unknown-lastclosed`); sprites per §10.9 | "?" `#8A97AB` | dashed 1.5 pt outline chip, `#8A97AB` text, no fill | `#8A97AB` text / `#7A879C` ring · `#5E6B80` / `#6B7890` · `#A9B4C6` / `#9AA6B8` | "Unknown, data offline" / "Desconocido, sin datos" | iOS `impactAsync(Soft)` · Android `Gesture_End` (no alarm; §11.6) | none |
| `REPLAY` (meta, not a risk state) | REPLAY / REPRODUCCIÓN | violet banner with striped top edge; violet scrubber | play glyph | violet fill `#B69CFF` + ink | `#B69CFF` · `#5B3CC4` | "Replay, real historical data, not live" / "Reproducción, datos históricos reales, no es en vivo" | none | none |

**Rules that follow (CI-enforced where possible):**
1. A status is **never** carried by text color alone: every status appears as a `StatusChip` or `StatusGlyph`/marker (shape + glyph + polarity) next to the word. Colored status text is **≥ 18 pt semibold** and sits next to a chip/shape.
2. `NO_RISE` and `UNKNOWN` are deliberately both grey (ΔE00 5.5 apart); they are told apart **only** by the dashed outline, the "?" glyph and the word. Never drop those three.
3. Light theme never uses amber as a text color.
4. Status colors in components MUST come from `useTheme().status[state]` (theme.ts), never from hard-coded hex or Tailwind classes, so the HC swap reaches every status rendering.
5. Loading states MUST NOT resemble `NO_RISE` (§12.5 `LoadingState`).

**Verified CVD facts behind these rules** (Machado-2009 severity 1.0, CIEDE2000; research/design.md §A.1 and research/cac.md §3.7 agree within 0.1):

| Pair | Normal ΔE | Deutan ΔE | Note |
|---|---|---|---|
| amber `#F5A623` vs the rejected v4 red text `#FF5A4F` (never use it) | 32.5 | **10.7 (risky)** | reason for the `#FF5470` fix |
| amber vs `#FF5470` | 41.1 | 15.7 | adopted |
| amber **fill** vs red **fill** `#C62828` | 40.6 | **24.9**, luminance ratio 2.52 | polarity cue that carries Watch vs Avoid |
| slate vs unknown | 5.5 | 5.5 | shape/glyph/word must differ |
| water vs route | 28.2 | 16.1 (tritan 10.7) | route 6 pt + casing; creeks 3 pt, no casing |

Under protanopia, `#FF5470` text drops to ~4.2:1 on bg → this is why red status text is ≥ 18 pt semibold (3:1 large-text rule).

### 9.7 Data-visualization tokens [MVP]

| Token | Value | Used by |
|---|---|---|
| `viz.line.water` | `#2BD9D9`, 2.5 pt, round caps | Hydrograph, Sparkline |
| `viz.area.water` | `#2BD9D9` gradient 0.12 → 0.0 (top → bottom) | Hydrograph area |
| `viz.trigger` | `#F5A623`, 1.5 pt, dash `[4,4]`, label "Trigger 6.0 ft" / "Nivel de alerta 6.0 pies" | Hydrograph |
| `viz.watchLevel` | `#8A97AB`, 1 pt, dash `[2,4]`, label "Watch level" / "Nivel de precaución" | Hydrograph (full detent only) |
| `viz.now` | 8 pt dot `#2BD9D9` + 2 pt `#F2F5FA` ring | Hydrograph, Sparkline |
| `viz.grid` | `#2A3A55`, 1 pt | Hydrograph |
| `viz.axisLabel` | `num.sm` `#8A97AB` | Hydrograph |
| `viz.playhead` | `#B69CFF`, 2 pt vertical | Replay hydrograph |
| `viz.gap` | hatched `#7A879C` @ 0.35 band + label "No data" / "Sin datos" | gauge outages, including documented transmission outages from the storm's `meta.toml` (e.g. 2013 Onion Creek: the gauge went silent; its readings only arrived later, §19.10, §33.7) — the band covers the span in which no reading was **available**, even if the archive later holds readings for it |
| `viz.window.likely` | `#C62828` @ 0.85 bracket with white label | RiskWindow (AVOID) |
| `viz.window.possible` | `#F5A623` @ 0.35 band with ink label | RiskWindow (WATCH, when a window exists) |
| `viz.ring.track` | `#24344F`, 10 pt | RiskRing |
| `viz.bar` | `#6CB4FF` bars, median line `#F2F5FA` dashed | Replay results lead-time chart (never green) |

### 9.8 Map overlay colors — "FordCast Night" [MVP]

**Basemap palette** (applied by `tools/make_style.py` — run it with `make style`, i.e. `uv run --project tools python tools/make_style.py` — to the OpenFreeMap **Positron** style, §12.2 Step 6 and §29.2; output `mobile/assets/map/fordcast-night.json`, also served as `GET /v1/styles/fordcast-night.json`, §22.2). Ratios are vs. land `#0B1320`. The basemap deliberately recedes (< 2:1) so states, creeks and route pop; only labels need ≥ 4.5:1.

| Layer (Positron source-layer / type) | Value | vs land |
|---|---|---|
| `background` | `#0B1320` | — |
| `landuse` (residential etc.) | `#0F1A2B` | 1.07 |
| `park` / `landcover` fill | `#0F1F24` | 1.10 |
| `building` fill (no outline) | `#121C2E` | 1.09 |
| `water` fill | `#0F2236` | 1.15 |
| `waterway` line (basemap streams) | `#1E4A63` | 1.96 |
| roads: minor / major / motorway | `#1A2638` / `#24344D` / `#31445F` | 1.22 / 1.48 / 1.88 |
| road casing | `#0B1320` | — |
| rail | `#1A2436` | 1.20 |
| boundary | `#2A3A55` | 1.63 |
| road labels (`transportation_name`) | `#8A97AB`, halo `#0B1320` 1.5 pt, font **Noto Sans Regular** | 6.29 |
| place labels | `#A9B4C4`, halo `#0B1320` 1.5 pt, **Noto Sans Regular/Bold** | 8.87 |
| water labels | `#5F87A3`, halo 1.5 pt, **Noto Sans Italic** | 4.86 |
| highway shields | `visibility: none` (bright shields clash at night) | — |

The `C` dictionary in `tools/make_style.py` MUST be exactly:
```python
C = dict(bg="#0B1320", res="#0F1A2B", park="#0F1F24", water="#0F2236", waterway="#1E4A63",
         building="#121C2E", minor="#1A2638", major="#24344D", motorway="#31445F", casing="#0B1320",
         rail="#1A2436", boundary="#2A3A55", lroad="#8A97AB", lplace="#A9B4C4", lwater="#5F87A3")
```
Palette authority: research/design.md §A.4 is canonical (`map.land #0B1320`, route `#5AA9FF`). Reuse research/maps.md section 4.3's generator code, but **not** the research/maps.md section 4.2 palette (do not use its `#0E1726` map background or `#7AA2FF` route).

**FordCast overlay layers** (drawn above the basemap; §29 owns layer order and code):

| Overlay | Visual spec |
|---|---|
| Watched creeks (NHDPlus GeoJSON) — calm | `#2BD9D9` @ 0.50, width interpolate z10 1.5 → z15 3 pt, round caps, **no casing** |
| Creeks upstream of WATCH/AVOID — active | `#2BD9D9` @ 1.0 + glow layer (same line, width +7 pt, opacity 0.30, `line-blur` 6) + animated dash "flow" (§11.4) |
| Water-travel pulse (signature) | `line-gradient` on a `lineMetrics` source: dim `rgba(43,217,217,0.18)`, head `rgba(43,217,217,1)`, head length 12% of reach, width 6 pt, `line-blur` 1 |
| Gauge dot | 8 pt `#2BD9D9` circle + 2 pt `#0B1320` stroke; stale gauge → `#7A879C` dashed ring 10 pt; selected → 12 pt + 2 pt `#F2F5FA` ring |
| Reduced-motion flow arrows | `ic-flow-arrow` sprite (12 pt `#2BD9D9` chevron) on a `<Layer type="symbol">` with `symbol-placement: 'line'`, `symbol-spacing: 120`, on active creeks only, shown **instead of** the pulse and dash flow when `useMotionOK()` is false (§11.4 A6, §29.4) |
| Crossing markers | Pre-colored PNG sprites from the **canonical list in §10.9** (folder `mobile/assets/map/markers/`): `ic-norise`, `ic-watch`, `ic-avoid`, `ic-closed`, `ic-closed-official`, `ic-unknown`, `ic-unknown-lastwatch`, `ic-unknown-lastavoid`, `ic-unknown-lastclosed` (+ `ic-flow-arrow` for creeks). There are **no** `-replay` variants — replay uses the same sprites under the violet banner. Drawn by a `<Layer type="symbol">` (MapLibre v11; never `SymbolLayer`). `icon-size` interpolate z11 0.55 → z16 1.0; `symbol-sort-key` = rank so higher risk draws on top |
| Selected crossing | circle layer: radius 24 pt, transparent fill, 3 pt `#F2F5FA` stroke + name label (Noto Sans Bold 13, `#F2F5FA`, halo 1.5) |
| Watch halo / Avoid halo | amber @ 0.20 / red `#FF5470` @ 0.25, radius 22–40 pt (static layer); animated pulse rings are RN `Marker` views (≤ 20 in viewport) |
| Clusters (z ≤ 12) | circle fill by **max rank inside the cluster**: NO_RISE → `#1C2940` + 2 pt `#8A97AB` stroke + `#F2F5FA` count (13.34); UNKNOWN → `#1C2940` + 2 pt `#7A879C` stroke; WATCH → `#F5A623` fill + `#0E1726` count; AVOID/CLOSED → `#C62828` fill + 2 pt `#FFFFFF` stroke + white count. Radius 16/20/24 pt by count (<10 / <30 / ≥30). A cluster **never** hides danger: its color is the worst state inside it |
| Route line [Stretch F49] | `#5AA9FF` 6 pt (z-interpolated 4 → 10 pt) + `#0B1320` casing 9 pt (7 → 15 pt); round joins/caps |
| Original route when a detour exists [Stretch F50] | `#5AA9FF` @ 0.35 |
| Blocked segment (±300 m around AVOID/CLOSED on route) [Stretch F49] | `#FF5470` 5 pt, dash `[1, 1.5]` |
| Detour line [Stretch F50] | `#5AA9FF` @ 1.0 6 pt + casing; "Detour +{{n}} min" pill (short form of the §3.7 `state.avoid` detour line; `{{n}}` = routed added minutes) as a `ViewAnnotation` at its midpoint (surface.1 pill, `label.lg`) |
| Avoid area (detour avoid polygon, shown on result map) [Stretch F50] | fill `#FF5470` @ 0.14 + 1.5 pt dashed `#FF5470` outline (5.99 vs land) |
| User location | `#5AA9FF` 14 pt dot, 3 pt `#F2F5FA` ring, heading cone `#5AA9FF` @ 0.25 |
| NWS area alert polygon (context only, [Stretch, §4 F17b]; needs F17 data) | 1 pt `#B4BFD0` dashed outline, no fill, label from the §3.7 `nws.*` keys (e.g. "NWS: Flash Flood Warning"; English product name + Spanish gloss in ES, §35.4). Toggled in the Layers sheet (§13.6, default off). Never colored amber/red: an NWS area product is context, not a FordCast state. Done when: with F17 enabled and a fixture CAP alert, the polygon draws under the crossing markers and its label reads correctly in EN and ES |
| Attribution | MapLibre attribution button ON, bottom-left 8 pt; "© OpenStreetMap contributors · OpenFreeMap © OpenMapTiles" also appears in About and on the video end card (same wording as §29.2; licenses in §16.16) |

### 9.9 Replay mode tokens [MVP]

| Token | Value |
|---|---|
| `replay.banner.bg` / `.fg` | `#B69CFF` / `#0E1726` (7.86) |
| `replay.banner.stripes` | top edge 4 pt tall: 45° stripes `#B69CFF`/`#0E1726`, 6 pt pitch |
| `replay.map.overlay` | full-map `rgba(182,156,255,0.04)` overlay + 2 pt violet inner frame on the map viewport |
| `replay.chip` | `#B69CFF` fill + ink "REPLAY" / "REPRODUCCIÓN" (`label.chip`) |
| `replay.scrubber.track` / `.fill` / `.thumb` | `#24344F` / `#B69CFF` / 24 pt `#F2F5FA` circle with 2 pt `#B69CFF` ring |
| Event ticks on the scrubber | `▲` WATCH issued (amber) · `◆` AVOID issued (red octagon) · `●` water over road observed (white dot with cyan ring) · `▮` official closure (red with stripes) · `⌀` gauge offline span (hatched slate band) |
| `replay.result.number` | `display.lg` `#F2F5FA`; unit line `title.md` `#B4BFD0` |

### 9.10 Spacing, radius and elevation tokens (values; rules in §10) [MVP]

```ts
export const space = { 0: 0, 0.5: 2, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 } as const;
export const radii = { xs: 6, sm: 10, md: 14, lg: 20, xl: 24, sheetAndroid: 28, pill: 999 } as const;
```

### 9.11 `mobile/src/lib/theme.ts` — exact content [MVP]

Create this file verbatim (you MAY add tokens; you MUST NOT change existing values without updating `global.css` and §9 in the same commit).

```ts
// mobile/src/lib/theme.ts — FordCast design tokens v1 (contrast verified 2026-10-14).
// Single source of truth for raw hex. Mirrors src/global.css (HSL). Parity-tested in src/lib/__tests__/tokens-parity-test.ts
import { Platform } from 'react-native';
import { DarkTheme, DefaultTheme, type Theme } from 'expo-router/react-navigation';

export const palette = {
  navy950: '#070D18', navy900: '#0B1320', navy850: '#0E1726', navy800: '#152033',
  navy750: '#1C2940', navy700: '#24344F', navy600: '#2A3A55', navy550: '#3A4D6E',
  slate500: '#6B7890', slate450: '#7A879C', slate400: '#8A97AB', slate300: '#B4BFD0',
  white: '#FFFFFF', ice: '#F2F5FA', iceDim: '#E6EBF2',
  amber500: '#F5A623', amber800: '#9A5B00',
  red700: '#B71C1C', red600: '#C62828', red400: '#FF5470', red300: '#FF8095',
  cyan400: '#2BD9D9', cyan700: '#0A7C80',
  blue400: '#5AA9FF', blue300: '#6CB4FF', blue700: '#1A66D9',
  violet300: '#B69CFF', violet700: '#5B3CC4',
} as const;

export type RiskState = 'NO_RISE' | 'WATCH' | 'AVOID' | 'CLOSED' | 'UNKNOWN';
export const RISK_RANK: Record<RiskState, number> = { NO_RISE: 0, UNKNOWN: 1, WATCH: 2, AVOID: 3, CLOSED: 4 };

export type StatusTokens = { fg: string; fill: string; ink: string; border: string; halo: string };
type StatusMap = Record<RiskState, StatusTokens>;

const darkStatus: StatusMap = {
  NO_RISE: { fg: palette.slate400, fill: 'transparent', ink: palette.slate400, border: palette.slate400, halo: 'transparent' },
  WATCH:   { fg: palette.amber500, fill: palette.amber500, ink: palette.navy850, border: palette.amber500, halo: 'rgba(245,166,35,0.20)' },
  AVOID:   { fg: palette.red400,   fill: palette.red600,   ink: palette.white,   border: palette.red400,   halo: 'rgba(255,84,112,0.25)' },
  CLOSED:  { fg: palette.red400,   fill: palette.red600,   ink: palette.white,   border: palette.red400,   halo: 'transparent' },
  UNKNOWN: { fg: palette.slate400, fill: 'transparent', ink: palette.slate400, border: palette.slate450, halo: 'transparent' },
};

export type ThemeName = 'dark' | 'darkHC' | 'light' | 'drive';

export const dark = {
  name: 'dark' as ThemeName,
  bg: palette.navy850, mapLand: palette.navy900,
  surface1: palette.navy800, surface2: palette.navy750, surface3: palette.navy700,
  scrim: 'rgba(5,9,16,0.60)', glassTint: 'rgba(14,23,38,0.55)',
  glassFallback: Platform.OS === 'android' ? 'rgba(14,23,38,0.92)' : 'rgba(14,23,38,0.80)',
  text: { primary: palette.ice, secondary: palette.slate300, tertiary: palette.slate400, disabled: '#5B6880', onAccent: palette.navy850 },
  border: { subtle: palette.navy600, strong: palette.navy550, input: palette.slate500, focus: palette.blue300, width: 1 },
  action: { primaryBg: palette.ice, primaryFg: palette.navy850, secondaryBg: palette.navy750, secondaryFg: palette.ice },
  water: palette.cyan400, waterCalm: 'rgba(43,217,217,0.50)', route: palette.blue400, link: palette.blue300,
  replay: palette.violet300, replayInk: palette.navy850,
  status: darkStatus,
};
export type FordTheme = typeof dark;

export const darkHC: FordTheme = {
  ...dark,
  name: 'darkHC',
  text: { ...dark.text, tertiary: '#A9B4C6' },
  border: { ...dark.border, subtle: palette.slate500, strong: palette.slate400, width: 2 },
  status: {
    ...darkStatus,
    NO_RISE: { ...darkStatus.NO_RISE, fg: '#A9B4C6', ink: '#A9B4C6', border: '#A9B4C6' },
    AVOID:   { ...darkStatus.AVOID,  fg: palette.red300, fill: palette.red700, border: palette.white },
    CLOSED:  { ...darkStatus.CLOSED, fg: palette.red300, fill: palette.red700, border: palette.white },
    UNKNOWN: { ...darkStatus.UNKNOWN, fg: '#A9B4C6', ink: '#A9B4C6', border: '#9AA6B8' },
  },
};

export const light: FordTheme = {
  name: 'light',
  bg: '#F4F6FA', mapLand: '#EEF1F5', surface1: palette.white, surface2: '#EAEEF4', surface3: '#DDE3EC',
  scrim: 'rgba(14,23,38,0.40)', glassTint: 'rgba(255,255,255,0.55)', glassFallback: 'rgba(255,255,255,0.88)',
  text: { primary: palette.navy850, secondary: '#3F4B60', tertiary: '#5E6B80', disabled: '#9AA5B6', onAccent: palette.navy850 },
  border: { subtle: '#D5DCE6', strong: '#B8C2D1', input: '#76839A', focus: palette.blue700, width: 1 },
  action: { primaryBg: palette.navy850, primaryFg: palette.white, secondaryBg: '#EAEEF4', secondaryFg: palette.navy850 },
  water: palette.cyan700, waterCalm: 'rgba(10,124,128,0.55)', route: palette.blue700, link: palette.blue700,
  replay: palette.violet700, replayInk: palette.white,
  status: {
    NO_RISE: { fg: '#5E6B80', fill: 'transparent', ink: '#5E6B80', border: '#5E6B80', halo: 'transparent' },
    WATCH:   { fg: palette.navy850, fill: palette.amber500, ink: palette.navy850, border: palette.navy850, halo: 'rgba(245,166,35,0.25)' },
    AVOID:   { fg: palette.red600, fill: palette.red600, ink: palette.white, border: palette.red600, halo: 'rgba(198,40,40,0.20)' },
    CLOSED:  { fg: palette.red600, fill: palette.red600, ink: palette.white, border: palette.red600, halo: 'transparent' },
    UNKNOWN: { fg: '#5E6B80', fill: 'transparent', ink: '#5E6B80', border: '#6B7890', halo: 'transparent' },
  },
};
export const isLight = (t: FordTheme) => t.name === 'light';

export const driveNight: FordTheme = {
  ...dark,
  name: 'drive',
  bg: palette.navy950, surface1: palette.navy850,
  text: { ...dark.text, primary: palette.iceDim },
};

export const replayTokens = {
  bannerBg: palette.violet300, bannerFg: palette.navy850, mapOverlay: 'rgba(182,156,255,0.04)',
  track: palette.navy700, fill: palette.violet300, thumb: palette.ice,
} as const;

export const viz = {
  water: palette.cyan400, waterAreaTop: 'rgba(43,217,217,0.12)', waterAreaBottom: 'rgba(43,217,217,0)',
  trigger: palette.amber500, watchLevel: palette.slate400, grid: palette.navy600, axis: palette.slate400,
  nowRing: palette.ice, playhead: palette.violet300, gap: 'rgba(122,135,156,0.35)', ringTrack: palette.navy700,
  bar: palette.blue300,
} as const;

export const mapTokens = {
  land: palette.navy900, creekCalm: 'rgba(43,217,217,0.50)', creekActive: palette.cyan400, creekGlow: 'rgba(43,217,217,0.30)',
  gauge: palette.cyan400, gaugeStroke: palette.navy900, route: palette.blue400, routeCasing: palette.navy900,
  routeGhost: 'rgba(90,169,255,0.35)', blocked: palette.red400, avoidAreaFill: 'rgba(255,84,112,0.14)',
  avoidAreaLine: palette.red400, user: palette.blue400, userRing: palette.ice, selectedRing: palette.ice,
  label: '#A9B4C4', labelHalo: palette.navy900,
  cluster: { NO_RISE: palette.navy750, UNKNOWN: palette.navy750, WATCH: palette.amber500, AVOID: palette.red600, CLOSED: palette.red600 },
  fontRegular: ['Noto Sans Regular'], fontBold: ['Noto Sans Bold'], fontItalic: ['Noto Sans Italic'], // OpenFreeMap glyphs only
} as const;

export const space = { 0: 0, 0.5: 2, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 } as const;
export const radii = { xs: 6, sm: 10, md: 14, lg: 20, xl: 24, sheetAndroid: 28, pill: 999 } as const;
export const hit = { min: 48, drive: 76, driveGrow: 96, gap: 8, driveGap: 24 } as const;
export const elevation = {
  floatShadow: '0 8px 24px rgba(0,0,0,0.35)', lightShadow: '0 4px 16px rgba(14,23,38,0.12)',
  topHighlight: 'rgba(255,255,255,0.06)', android: { card: 3, floating: 6, sheet: 8 },
} as const;

// React Navigation theme (imported from expo-router/react-navigation — never @react-navigation/*)
export const NAV_THEME: Record<'dark' | 'light', Theme> = {
  dark: { ...DarkTheme, colors: { ...DarkTheme.colors, background: dark.bg, card: dark.surface1, border: dark.border.subtle,
          text: dark.text.primary, primary: dark.link, notification: dark.status.AVOID.fill } },
  light: { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: light.bg, card: light.surface1, border: light.border.subtle,
          text: light.text.primary, primary: light.link, notification: light.status.AVOID.fill } },
};
```

`useTheme()` lives in `src/lib/useTheme.ts`: it returns `driveNight` inside the Drive Mode route, else `darkHC` when `A11yPrefs.highContrast || settings.increaseContrast`, else `light` only when `settings.appearance === 'light'` (or `'system'` + system light) **and** the light theme feature flag is on [Stretch], else `dark`.

### 9.12 `mobile/src/global.css` — RNR CSS variables (HSL triplets) [MVP]

RNR's `minimal` template uses `:root` (light) and `.dark:root` (dark). **MVP ships always-dark:** both blocks hold the dark values below, and the root layout calls NativeWind `colorScheme.set('dark')` once. When the light theme ships [Stretch], replace the `:root` block with the LIGHT block and drive `colorScheme.set()` from Settings → Appearance. Every triplet below round-trips exactly to the hex in theme.ts (verified).

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root, .dark:root {
    /* RNR / shadcn semantic variables */
    --background: 217.5 46.2% 10.2%;          /* #0E1726 bg.canvas */
    --foreground: 217.5 44.4% 96.5%;          /* #F2F5FA text.primary */
    --card: 218.0 41.7% 14.1%;                /* #152033 surface.1 */
    --card-foreground: 217.5 44.4% 96.5%;
    --popover: 218.3 39.1% 18.0%;             /* #1C2940 surface.2 (status text allowed; s3 is not) */
    --popover-foreground: 217.5 44.4% 96.5%;
    --primary: 217.5 44.4% 96.5%;             /* #F2F5FA inverse pill CTA */
    --primary-foreground: 217.5 46.2% 10.2%;  /* #0E1726 */
    --secondary: 218.3 39.1% 18.0%;           /* #1C2940 */
    --secondary-foreground: 217.5 44.4% 96.5%;
    --muted: 218.3 39.1% 18.0%;               /* #1C2940 */
    --muted-foreground: 216.4 16.4% 60.6%;    /* #8A97AB */
    --accent: 217.7 37.4% 22.5%;              /* #24344F pressed/selected */
    --accent-foreground: 217.5 44.4% 96.5%;
    --destructive: 0.0 66.4% 46.7%;           /* #C62828 — defined for RNR internals ONLY; Button variant="destructive" is banned (§12.4) */
    --destructive-foreground: 0.0 0.0% 100.0%;
    --border: 217.7 33.9% 24.9%;              /* #2A3A55 border.subtle */
    --input: 218.9 14.7% 49.2%;               /* #6B7890 border.input (≥3:1 on card) */
    --ring: 210.6 100.0% 71.2%;               /* #6CB4FF focus.ring — NOT cyan (cyan = water only) */
    --radius: 1.25rem;                        /* 20 px = radii.lg (inlineRem 16) */
    --chart-1: 180.0 69.6% 51.0%;             /* water */
    --chart-2: 211.3 100.0% 67.6%;            /* route */
    --chart-3: 37.4 91.3% 54.9%;              /* watch */
    --chart-4: 350.2 100.0% 66.5%;            /* avoid fg */
    --chart-5: 255.8 100.0% 80.6%;            /* replay */

    /* FordCast semantic variables */
    --surface-1: 218.0 41.7% 14.1%;           /* #152033 */
    --surface-2: 218.3 39.1% 18.0%;           /* #1C2940 */
    --surface-3: 217.7 37.4% 22.5%;           /* #24344F */
    --map-land: 217.1 48.8% 8.4%;             /* #0B1320 */
    --text-secondary: 216.4 23.0% 76.1%;      /* #B4BFD0 */
    --text-tertiary: 216.4 16.4% 60.6%;       /* #8A97AB */
    --text-disabled: 218.9 16.9% 42.9%;       /* #5B6880 */
    --border-strong: 218.1 31.0% 32.9%;       /* #3A4D6E */
    --status-norise: 216.4 16.4% 60.6%;       /* #8A97AB */
    --status-watch: 37.4 91.3% 54.9%;         /* #F5A623 */
    --status-watch-ink: 217.5 46.2% 10.2%;    /* #0E1726 */
    --status-avoid: 350.2 100.0% 66.5%;       /* #FF5470 text/icons */
    --status-avoid-fill: 0.0 66.4% 46.7%;     /* #C62828 chips/markers */
    --status-unknown: 217.1 14.7% 54.5%;      /* #7A879C dashed ring */
    --water: 180.0 69.6% 51.0%;               /* #2BD9D9 */
    --route: 211.3 100.0% 67.6%;              /* #5AA9FF */
    --replay: 255.8 100.0% 80.6%;             /* #B69CFF */
    --link: 210.6 100.0% 71.2%;               /* #6CB4FF */
    --drive-bg: 218.8 54.8% 6.1%;             /* #070D18 */
    --drive-text: 215.0 31.6% 92.5%;          /* #E6EBF2 */
  }
}

/* [Stretch] LIGHT block — paste into :root when the light theme ships:
  --background: 220.0 37.5% 96.9%;  --foreground: 217.5 46.2% 10.2%;   --card: 0.0 0.0% 100.0%;
  --card-foreground: 217.5 46.2% 10.2%; --popover: 216.0 31.3% 93.7%; --popover-foreground: 217.5 46.2% 10.2%;
  --primary: 217.5 46.2% 10.2%;     --primary-foreground: 0.0 0.0% 100.0%; --secondary: 216.0 31.3% 93.7%;
  --secondary-foreground: 217.5 46.2% 10.2%; --muted: 216.0 31.3% 93.7%; --muted-foreground: 217.1 15.3% 43.5%;
  --accent: 216.0 28.3% 89.6%;      --accent-foreground: 217.5 46.2% 10.2%; --destructive: 0.0 66.4% 46.7%;
  --destructive-foreground: 0.0 0.0% 100.0%; --border: 215.3 25.4% 86.9%; --input: 218.3 15.1% 53.3%;
  --ring: 216.1 78.6% 47.6%;        --surface-1: 0.0 0.0% 100.0%; --surface-2: 216.0 31.3% 93.7%; --surface-3: 216.0 28.3% 89.6%;
  --map-land: 214.3 25.9% 94.7%;    --text-secondary: 218.2 20.8% 31.2%; --text-tertiary: 217.1 15.3% 43.5%;
  --text-disabled: 216.4 16.1% 65.9%; --border-strong: 216.0 21.4% 77.1%; --status-norise: 217.1 15.3% 43.5%;
  --status-avoid: 0.0 66.4% 46.7%;  --status-unknown: 218.9 14.7% 49.2%; --water: 182.0 85.5% 27.1%;
  --route: 216.1 78.6% 47.6%;       --replay: 253.7 53.5% 50.2%; --link: 216.1 78.6% 47.6%;
*/
```

**Tailwind color mapping** (the `theme.extend.colors` portion of `tailwind.config.js`; the full file is owned by §27 and MUST include this block):

```js
colors: {
  border: 'hsl(var(--border))', input: 'hsl(var(--input))', ring: 'hsl(var(--ring))',
  background: 'hsl(var(--background))', foreground: 'hsl(var(--foreground))',
  primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
  secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
  destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
  muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
  accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
  popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
  card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
  surface: { 1: 'hsl(var(--surface-1))', 2: 'hsl(var(--surface-2))', 3: 'hsl(var(--surface-3))' },
  'map-land': 'hsl(var(--map-land))',
  'text-secondary': 'hsl(var(--text-secondary))', 'text-tertiary': 'hsl(var(--text-tertiary))',
  'text-disabled': 'hsl(var(--text-disabled))', 'border-strong': 'hsl(var(--border-strong))',
  norise: 'hsl(var(--status-norise))', watch: { DEFAULT: 'hsl(var(--status-watch))', ink: 'hsl(var(--status-watch-ink))' },
  avoid: { DEFAULT: 'hsl(var(--status-avoid))', fill: 'hsl(var(--status-avoid-fill))' },
  unknown: 'hsl(var(--status-unknown))', water: 'hsl(var(--water))', route: 'hsl(var(--route))',
  replay: 'hsl(var(--replay))', link: 'hsl(var(--link))', drive: { bg: 'hsl(var(--drive-bg))', text: 'hsl(var(--drive-text))' },
},
borderRadius: { xs: '6px', sm: '10px', md: '14px', lg: '20px', xl: '24px', sheet: '28px', pill: '9999px' },
```

### 9.13 Token parity & contrast tests [MVP]

Create `mobile/src/lib/__tests__/tokens-parity-test.ts` (Jest, `jest-expo` preset):

```ts
import fs from 'node:fs';
import path from 'node:path';
import { dark, palette } from '../theme';

const CSS_TO_HEX: Record<string, string> = {
  background: dark.bg, foreground: dark.text.primary, card: dark.surface1, popover: dark.surface2,
  primary: dark.action.primaryBg, secondary: dark.surface2, muted: dark.surface2, 'muted-foreground': dark.text.tertiary,
  accent: dark.surface3, destructive: palette.red600, border: dark.border.subtle, input: dark.border.input,
  ring: dark.border.focus, 'surface-1': dark.surface1, 'surface-2': dark.surface2, 'surface-3': dark.surface3,
  'map-land': dark.mapLand, 'text-secondary': dark.text.secondary, 'text-tertiary': dark.text.tertiary,
  'text-disabled': dark.text.disabled, 'border-strong': dark.border.strong, 'status-norise': dark.status.NO_RISE.fg,
  'status-watch': dark.status.WATCH.fill, 'status-watch-ink': dark.status.WATCH.ink, 'status-avoid': dark.status.AVOID.fg,
  'status-avoid-fill': dark.status.AVOID.fill, 'status-unknown': dark.status.UNKNOWN.border, water: dark.water,
  route: dark.route, replay: dark.replay, link: dark.link, 'drive-bg': palette.navy950, 'drive-text': palette.iceDim,
};
const hslToHex = (h: number, s: number, l: number) => {
  s /= 100; l /= 100; const k = (n: number) => (n + h / 30) % 12; const a = s * Math.min(l, 1 - l);
  const f = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return '#' + [f(0), f(8), f(4)].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
};
test('global.css dark block matches theme.ts', () => {
  const css = fs.readFileSync(path.join(__dirname, '../../global.css'), 'utf8');
  for (const [name, hex] of Object.entries(CSS_TO_HEX)) {
    const m = css.match(new RegExp(`--${name}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`));
    expect(m).not.toBeNull();
    expect(hslToHex(+m![1], +m![2], +m![3])).toBe(hex.toUpperCase());
  }
});
```

Also create `contrast-test.ts` computing WCAG ratios (relative-luminance formula) for every row in §9.2/§9.4 with a `minimum` column (4.5 text, 3.0 large/non-text) — Done when: both tests pass in CI (`npm test`).

### 9.14 Acceptance for §9
- [ ] Done when: `theme.ts` and `global.css` exist exactly as above and both tests pass.
- [ ] Done when: `grep -rnE "#[0-9A-Fa-f]{6}" mobile/src --include=*.tsx | grep -v theme.ts` returns only allow-listed files (illustrations, sprites generator) — components read tokens, never literals.
- [ ] Done when: there is no green hex (hue 75°–165°, saturation > 25 %; the same rule as the §3.12 code guard) anywhere in `mobile/src` and `mobile/assets` (a small Jest test scans theme.ts, global.css triplets, SVG files and the color constants in `tools/make_markers.py`).

---
## §10. Typography, spacing, radii, elevation, glass, iconography, illustration

### 10.1 Font: Inter 4.001 everywhere in the UI; Noto Sans inside the map [MVP]

- **Package:** `@expo-google-fonts/inter@0.4.2` (Inter MIT wrapper + OFL-1.1 font). Weights used: **400, 500, 600, 700** only.
- **Embedding (decision sheet):** add the `expo-font` config plugin so fonts are compiled into the dev/preview builds (no flash of unstyled text):
  ```ts
  // app.config.ts → plugins (full file owned by §27)
  ['expo-font', {
    fonts: [
      'node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf',
      'node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf',
      'node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf',
      'node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf',
    ],
  }],
  ```
  VERIFY BEFORE USE: `ls node_modules/@expo-google-fonts/inter/*/Inter_*.ttf` (the `400Regular/Inter_400Regular.ttf` path is verified; the other three follow the same pattern) and read `node_modules/expo-font/plugin/build/*.d.ts` for the option schema.
- **Family naming rule (avoids the Android weight pitfall, §37):** always reference **one family per weight** — `Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`, `Inter_700Bold` — and **never** set `fontWeight` on Inter text. On Android, embedded fonts resolve by file name, so these names work directly. On iOS, embedded fonts resolve by their internal name, so **also** call `useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold })` from `@expo-google-fonts/inter` in the root layout while `SplashScreen.preventAutoHideAsync()` holds the splash; hide the splash only when fonts are loaded **or** after 2,000 ms (then fall back to system font rather than block). Day-1 check: the dev gallery's **Font probe** (§12.7) renders all four weights and "0123456789" twice; Done when both platforms show four distinct weights.
- **Tabular numerals:** every number (stages, ranges, times, distances, metrics, counts) uses `fontVariant: ['tabular-nums']`. Day-1 check in the Font probe: "1111" and "8888" have equal widths on Android and iOS. Fallback if Android ignores it: wrap changing numbers in fixed-width containers measured from "8".
- **Map labels:** OpenFreeMap glyphs provide only **Noto Sans Regular / Bold / Italic**; Inter in a map `text-font` renders nothing. Every MapLibre symbol layer uses `mapTokens.fontRegular/fontBold/fontItalic`.
- **System components** (native tab bar, native alerts, OS permission dialogs) keep SF Pro / Roboto.

### 10.2 Type scale [MVP]

Tracking follows Inter's dynamic metrics (design.md §B). `maxFontSizeMultiplier` follows research/cac.md §3.5: **body, card text, status words and alerts are never capped** (they must reach iOS AX5 and Android 200%); only HUD numerals, chips and map labels are capped, and the same information is always available uncapped elsewhere (sheet, list, a11y label, Large Content Viewer).

| Token | Size / line (pt) | Family (weight) | Tracking (pt) | `maxFontSizeMultiplier` | Use |
|---|---|---|---|---|---|
| `display.xl` | 56 / 60 | Inter_700Bold, tnum | −1.25 | 1.3 | Drive Mode range "15–30" |
| `display.lg` | 44 / 48 | Inter_700Bold, tnum | −0.98 | 1.3 | Replay "[X] MIN EARLIER" (X read from the timeline/results JSON, §19.12 — never hand-typed) |
| `display.md` | 34 / 40 | Inter_700Bold | −0.74 | none | screen large titles |
| `title.lg` | 28 / 34 | Inter_600SemiBold | −0.59 | none | crossing name in sheet |
| `title.md` | 22 / 28 | Inter_600SemiBold | −0.40 | none | section titles |
| `title.sm` | 20 / 25 | Inter_600SemiBold | −0.33 | none | card titles |
| `headline` | 17 / 22 | Inter_600SemiBold | −0.22 | none | row titles, area headline |
| `body.lg` | 17 / 24 | Inter_400Regular | −0.22 | none | reading text |
| `body.md` | 15 / 21 | Inter_400Regular | −0.13 | none | supporting text |
| `callout` | 16 / 21 | Inter_500Medium | −0.18 | none | list subtitles, emphasis |
| `label.lg` | 15 / 20 | Inter_600SemiBold | −0.13 | none | buttons |
| `label.chip` | 13 / 16 | Inter_700Bold, UPPERCASE | +0.6 | 2.0 (wraps to 2 lines, never clips) | status chips |
| `status.word` | 18 / 24 | Inter_600SemiBold | −0.25 | none | colored status text next to a chip (≥ 18 pt rule) |
| `caption` | 13 / 18 | Inter_400Regular | −0.04 | none | "as of 10:42 PM" |
| `caption.sm` | 12 / 16 | Inter_500Medium | 0 | 1.5 | axis labels, non-essential only |
| `num.xl` | 40 / 44 | Inter_600SemiBold, tnum | −0.89 | 1.4 | risk-window range ("15–30 min") in the crossing sheet — always a range, never one number |
| `num.lg` | 28 / 32 | Inter_600SemiBold, tnum | −0.59 | 1.5 | stage "6.8 ft", metric tiles |
| `num.md` | 17 / 22 | Inter_600SemiBold, tnum | −0.22 | none | rates, distances in rows |
| `num.sm` | 13 / 16 | Inter_500Medium, tnum | −0.04 | 1.5 | chart axes, ticks |
| `drive.primary` | 32 / 38 (min) | Inter_700Bold | −0.6 | 1.3 | Drive Mode state word |
| `drive.secondary` | 24 / 30 (min) | Inter_600SemiBold | −0.4 | 1.3 | Drive Mode name/distance |

Rules: essential information ≥ 15 pt; nothing below 12 pt; colored status text ≥ 18 pt semibold; ranges use an en dash (U+2013) "15–30 min"; never truncate a status word or a window.

### 10.3 `AppText` (the only text component) [MVP]

```tsx
// mobile/src/components/fordcast/AppText.tsx
type Variant = 'display.xl'|'display.lg'|'display.md'|'title.lg'|'title.md'|'title.sm'|'headline'|'body.lg'|'body.md'
  |'callout'|'label.lg'|'label.chip'|'status.word'|'caption'|'caption.sm'|'num.xl'|'num.lg'|'num.md'|'num.sm'
  |'drive.primary'|'drive.secondary';
type Props = TextProps & { variant?: Variant; tone?: 'primary'|'secondary'|'tertiary'|'onAccent'|'link'|'disabled';
  colorOverride?: string /* status components only */ };
// Implementation rules:
// - Looks up {size,line,family,tracking,cap,tnum,upper} from TYPE[variant].
// - Bold Text (A11yPrefs.boldText): bump one family step (400→600, 500→600, 600→700).
// - accessibilityLanguage = i18n.language === 'es' ? 'es-US' : 'en-US' (iOS-only prop; §35).
// - allowFontScaling always true; maxFontSizeMultiplier = TYPE[variant].cap ?? 0 (0 = no cap).
// - fontVariant ['tabular-nums'] when tnum; textTransform 'uppercase' for label.chip.
// - Never accept a raw fontSize prop (lint rule: no-restricted-syntax on fontSize outside AppText/theme).
```
Wrap RNR's `Text` (`src/components/ui/text.tsx`) so RNR components also render through `AppText` defaults (`font-sans text-foreground`).

### 10.4 Dynamic Type, Bold Text and Spanish expansion [MVP]

| Condition (`useWindowDimensions().fontScale`) | Layout response |
|---|---|
| ≥ 1.35 | Rows switch from side-by-side to stacked (name above chip above timestamp). Hydrograph height +40% and hides axis labels in favor of a numeric summary line. Map Home sheet's first snap point grows to fit its content (`snapPoints[0] = max(148, measured)`). |
| ≥ 2.0 | Single column everywhere. Crossing sheet opens at the **full** detent. Decorative icons hidden. Legend becomes a plain list. Map Home defaults to the list view toggle (still switchable to Map). |
| Bold Text on (iOS) | `AppText` bumps one weight step. |
| Spanish | Budget **+30%** length (+100–200% for strings < 10 chars). No fixed-width buttons or chips. Test with a pseudo-locale at +50% (`en-XA` style generated in tests, §35). |

Never use `adjustsFontSizeToFit` on status words. Crossing names MAY truncate to 2 lines in list rows only (full name in the row's a11y label and in the sheet).

### 10.5 Spacing & layout (4 pt grid) [MVP]

| Item | Value |
|---|---|
| Scale | 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 (`space` in theme.ts) |
| Screen gutter | 16 (20 at width ≥ 428) |
| Card padding / gap between cards / section gap | 16 / 12 / 24 |
| List rows | ≥ 56 pt single-line; ≥ 72 pt two-line + chip; leading glyph 28 pt; icon-label gap 8 |
| Buttons | primary 52 pt tall pill; secondary 48 pt (visual 44 + hit 48); tertiary text 48 hit; Drive Mode 76 pt (96 when emphasized) |
| Sheet content | 20 pt top padding under the grabber; 16 pt gutters |
| Map chrome | 8 pt from safe-area top; 16 pt from screen edges; 8 pt between stacked controls |

### 10.6 Radii [MVP]

`xs 6` tags/micro-labels · `sm 10` inputs, search field · `md 14` small cards, tiles · `lg 20` cards, banners · `xl 24` Map Home sheet top corners (iOS) and status cards · `sheet` = system concentric on iOS formSheets / **28** on Android sheets · `pill 999` buttons, chips, FreshnessPill.

### 10.7 Elevation & shadows [MVP]

1. **Dark theme elevation is lightness, not shadow:** canvas `#0E1726` → surface.1 → surface.2 → surface.3.
2. **Floating over the map** (chrome, sheets, banners): `boxShadow: '0 8px 24px rgba(0,0,0,0.35)'` plus a 1 pt top highlight `rgba(255,255,255,0.06)`. VERIFY BEFORE USE that the RN 0.86 `boxShadow` style renders on Android New Architecture; fallback `elevation` 6 (Android) / `shadowColor/shadowOpacity 0.35/shadowRadius 12/shadowOffset {0,8}` (iOS).
3. Android `elevation`: card 3, floating 6, sheet 8.
4. Light theme: `0 4px 16px rgba(14,23,38,0.12)`.

### 10.8 Glass rules (`GlassSurface`, `GlassIconButton`) [MVP components with the solid fallback; glass itself = Stretch F41]

- **MVP:** both components ship and always render the fallback below (gate in §8.3 rule 3 with `features.glassChrome = false`). Every rule after this one applies when F41 turns glass on.
- Glass only on chrome (list in §8.3). Text on glass: `text.primary`, ≥ 15 pt semibold.
- `GlassView` props: `glassEffectStyle="regular"`, `tintColor={theme.glassTint}`, `isInteractive` on buttons; group siblings in `GlassContainer spacing={8}`.
- Fallback (MVP on both platforms; afterwards Android, iOS < 26, glass unavailable, or Reduce Transparency on): `theme.glassFallback` background + 1 pt `border.subtle` + floating shadow.
- Never stack glass on glass; never glass behind a status chip; never animate glass opacity.

### 10.9 Iconography [MVP]

**System icons via `expo-symbols` (`SymbolView name={{ ios, android }}`, beta in SDK 57).** Names in the first block were verified against `sf-symbols-typescript` and `expo-symbols/build/android/symbols.json` (research/design.md §C.4). Names in the second block are **VERIFY BEFORE USE** (render them in the dev gallery icon sheet; fallback = the nearest verified name or a custom SVG — never an empty box).

| Concept | SF Symbol (iOS) | Material Symbol (Android) |
|---|---|---|
| Map tab | `map.fill` | `map` |
| Drive tab / car | `car.fill` | `directions_car` |
| Replay tab | `clock.arrow.circlepath` | `history` |
| Alerts tab | `bell.fill` / `bell.badge.fill` | `notifications` / `notifications_active` |
| Settings | `gearshape.fill` | `settings` |
| Water / creek | `water.waves` | `water` / `waves` |
| Rising water | `water.waves.and.arrow.up` | `flood` |
| Watch (system contexts only) | `exclamationmark.triangle.fill` | `warning` |
| Avoid (system contexts only) | `exclamationmark.octagon.fill` | `dangerous` |
| Closed (system contexts only) | `xmark.octagon.fill` | `block` |
| Unknown | `questionmark.circle.dashed` (SF 6.0; fallback `questionmark.circle`) | `help` |
| Offline | `wifi.slash` / `icloud.slash` | `wifi_off` / `cloud_off` |
| Gauge | `sensor.fill` / `gauge.with.dots.needle.33percent` | `sensors` / `speed` |
| Rain | `cloud.heavyrain.fill` | `rainy` |
| Locate me | `location.fill` | `my_location` |
| Detour | `arrow.triangle.branch` | `alt_route` |
| Turn around | `arrow.uturn.backward` | `u_turn_left` |
| Route | `arrow.triangle.turn.up.right.diamond.fill` | `route` |
| Drive Mode | `steeringwheel` | `navigation` |
| Play / Pause | `play.fill` / `pause.fill` | `play_arrow` / `pause` |
| Prev / next event | `backward.fill` / `forward.fill` | `fast_rewind` / `fast_forward` |
| Voice / mic | `speaker.wave.2.fill` / `mic.fill` | `volume_up` / `mic` |
| Home / Work / School / Bus | `house.fill` / `briefcase.fill` / `graduationcap.fill` / `bus.fill` | `home` / `work` / `school` / `directions_bus` |
| Layers | `square.stack.3d.up` | `layers` |
| Language / Text size / Accessibility | `globe` / `textformat.size` / `accessibility` | `language` / `format_size` / `accessibility` |
| Info / Share / Refresh | `info.circle` / `square.and.arrow.up` / `arrow.clockwise` | `info` / `share` / `refresh` |
| Crew list | `list.bullet.rectangle.fill` | `list` |
| Official source | `shield.lefthalf.filled` | `shield` |
| Search | `magnifyingglass` | `search` |
| *VERIFY:* Close | `xmark` | `close` |
| *VERIFY:* Chevron | `chevron.right` | `chevron_right` |
| *VERIFY:* Save / saved | `bookmark` / `bookmark.fill` | `bookmark_border` / `bookmark` |
| *VERIFY:* Notifications off | `bell.slash.fill` | `notifications_off` |
| *VERIFY:* Zoom in / out | `plus` / `minus` | `add` / `remove` |
| *VERIFY:* Mute | `speaker.slash.fill` | `volume_off` |
| *VERIFY:* External link | `arrow.up.right.square` | `open_in_new` |

Rules: icons are 20 pt in buttons, 24 pt in rows, tinted `text.secondary` (inactive) / `text.primary` (active). **Status is never rendered with SF/Material symbols inside the app** — only the custom `StatusGlyph` (identical on both OSes); SF/Material status symbols are allowed only where custom SVG cannot render (Live Activity, widgets, notification actions). SF Symbol animation (`animationSpec={{ effect: { type: 'pulse' }, repeating: false }}`) MAY play once on a state change, never under Reduce Motion. lucide-react-native is used only inside RNR components that import it (e.g., `checkbox`, `select` chevrons).

**Custom SVG status glyphs** (`src/components/fordcast/StatusGlyph.tsx`, react-native-svg, `viewBox="0 0 24 24"`, rendered at 16/20/24/28/32 pt; colors from `useTheme().status[state]`):

```tsx
const OCT = '21.70,16.02 16.02,21.70 7.98,21.70 2.30,16.02 2.30,7.98 7.98,2.30 16.02,2.30 21.70,7.98'; // r=10.5 regular octagon
// NO_RISE: hollow ring, no glyph
<Circle cx={12} cy={12} r={8} fill="none" stroke={t.border} strokeWidth={2.5} />
// WATCH: rounded triangle (stroke in fill color + round joins rounds the corners) + ink "!"
<Path d="M12 3.2 L21.4 19.6 L2.6 19.6 Z" fill={t.fill} stroke={t.fill} strokeWidth={2.4} strokeLinejoin="round" />
<Path d="M12 9.2 V13.6" stroke={t.ink} strokeWidth={2.4} strokeLinecap="round" /><Circle cx={12} cy={16.6} r={1.35} fill={t.ink} />
// AVOID: rounded octagon + white "!" (+ rim: 2 pt white stroke on the map sprite, 1 pt #FF5470 on surfaces)
<Polygon points={OCT} fill={t.fill} stroke={rim ?? t.fill} strokeWidth={rim ? 2 : 1.6} strokeLinejoin="round" />
<Path d="M12 6.8 V13.2" stroke={t.ink} strokeWidth={2.6} strokeLinecap="round" /><Circle cx={12} cy={16.9} r={1.5} fill={t.ink} />
// CLOSED: octagon + three white 45° barricade stripes clipped to the octagon (no "!")
<Defs><ClipPath id="oct"><Polygon points={OCT} /></ClipPath></Defs>
<Polygon points={OCT} fill={t.fill} stroke={rim ?? t.fill} strokeWidth={rim ? 2 : 1.6} strokeLinejoin="round" />
<G clipPath="url(#oct)"><Path d="M0 15.5 L15.5 0 M2 22 L22 2 M8.5 24 L24 8.5" stroke={t.ink} strokeWidth={2.6} /></G>
// UNKNOWN: dashed ring + "?"
<Circle cx={12} cy={12} r={8.5} fill="none" stroke={t.border} strokeWidth={2} strokeDasharray="3 3" />
<Path d="M9.6 9.4 a2.5 2.5 0 1 1 3.6 2.2 c-0.8 0.4 -1.2 0.9 -1.2 1.8 v0.5" fill="none" stroke={t.ink} strokeWidth={2} strokeLinecap="round" />
<Circle cx={12} cy={16.6} r={1.2} fill={t.ink} />
// REPLAY: violet disc + ink play triangle
<Circle cx={12} cy={12} r={10} fill={replay} /><Path d="M9.5 7.5 L16.5 12 L9.5 16.5 Z" fill={replayInk} />
```
Use a unique `ClipPath id` per instance (`useId()`) — duplicate SVG ids break clipping on Android.

**Brand glyphs** (same 24 grid, 2 pt stroke, round joins; used in onboarding, empty states, app icon): `ford-dip` (road band dipping into a shallow V with a water line through the dip), `barricade` (two legs + three diagonal stripes), `gauge-staff` (vertical staff with 5 ticks and a water line), `creek-flow` (S-curve with an arrowhead pointing downstream).

**Map marker sprites — canonical list** [MVP]. This list is the single source for §5, §9.8, §12.2 and §29.2–§29.4; every other section uses exactly these names and this folder.

- **Generator:** `tools/make_markers.py` (Pillow, from the `fordcast-tools` uv project in `tools/pyproject.toml`). Run it with `make markers`, i.e. `uv run --project tools python tools/make_markers.py`. It draws the exact `StatusGlyph` geometry above at 4× and downsamples with LANCZOS. Commit the PNGs; CI does not regenerate them.
- **Folder:** `mobile/assets/map/markers/`.
- **Files** (each as `<name>@2x.png` = 96 px canvas = 48 pt, and `<name>@3x.png` = 144 px):

| Name | Content |
|---|---|
| `ic-norise` | NO_RISE hollow ring, 12 pt |
| `ic-watch` | WATCH rounded triangle, 28 pt, + 1.5 pt `#0B1320` outline |
| `ic-avoid` | AVOID rounded octagon, 32 pt, + 2 pt white rim |
| `ic-closed` | CLOSED striped octagon, 32 pt, + 2 pt white rim |
| `ic-closed-official` | `ic-closed` + a plain 14 pt `#F2F5FA` shield badge with a 1 pt `#0B1320` outline at top-right |
| `ic-unknown` | UNKNOWN dashed ring + "?", 24 pt |
| `ic-unknown-lastwatch` | `ic-unknown` + 12 pt amber triangle badge top-right inside a dashed frame |
| `ic-unknown-lastavoid` | `ic-unknown` + 12 pt red octagon badge top-right inside a dashed frame |
| `ic-unknown-lastclosed` | `ic-unknown` + 12 pt striped red octagon badge top-right inside a dashed frame |
| `ic-flow-arrow` | 12 pt `#2BD9D9` chevron pointing downstream (reduced-motion creek arrows, §9.8, §11.4 A6) |

- Marker visual sizes are centered inside the 48 pt canvas. Map sprites always carry the 2 pt white rim on AVOID/CLOSED and the 1.5 pt `#0B1320` outline on WATCH.
- **Registration:** `mobile/src/features/map/sprites.ts` exports `type SpriteName` (the ten names above) and `SPRITES: Record<SpriteName, number>` built from **static** `require('@/assets/map/markers/<name>.png')` calls, one literal path per name (alias per §27.9; its documented fallback is the relative `require('../../../assets/map/markers/<name>.png')`). Metro resolves `@2x/@3x` from the base name. The map registers them once with MapLibre `Images` (§29.3–§29.4). Sprite choice per crossing: CLOSED with an official source → `ic-closed-official`; UNKNOWN with `last_known` WATCH/AVOID/CLOSED → `ic-unknown-last{watch|avoid|closed}`; otherwise `ic-` + `{NO_RISE:'norise', WATCH:'watch', AVOID:'avoid', CLOSED:'closed', UNKNOWN:'unknown'}[state]`.
- VERIFY BEFORE USE on device that MapLibre `Images` picks the `@2x/@3x` files from `require()`; fallback: ship only `@3x` and multiply `icon-size` by 1/3.
- Done when: `make markers` regenerates all 20 PNGs pixel-identically from a clean checkout; `sprites.ts` type-checks with exactly ten names; the dev gallery's map page shows every sprite at z11 and z16 on a 3× Android device.

### 10.10 Illustration & Lottie [MVP static SVG; Lottie on onboarding P1 = Stretch (A22)]

- **Style:** flat, two-tone navy (`#152033` / `#24344F`) + **one** accent (cyan for water; amber/red only when demonstrating a state). 2 pt strokes, round joins, no gradients except water. **No people in floodwater, no cars being swept away, no disaster photography** — nothing that trivializes drowning.
- **Static SVG illustrations** (react-native-svg components in `src/components/fordcast/illustrations/`, 160 × 120 viewBox, built from the brand glyphs): `OnboardCreek` (creek → road dip, water line), `HowItWorks` (gauge → creek → dip with a time-range caption slot: the caller passes the §3.7 travel-range string, e.g. "Water usually takes 30–45 min to get here", or nothing — the SVG itself never contains a number), `LocationPin` (pin over a dip), `BellQuiet` (bell with a small water line), `RouteCheck` (route line passing three crossing glyphs), `OfflineCloud`, `ReplayClock` (clock arrow around a creek), `NoResults`.
- **Lottie [Stretch, onboarding P1 only, decision sheet]:** `lottie-react-native ~7.3.8` is **in the Day-1 native build** (decided default, §25.4) so adding the animation later needs only an OTA update; MVP renders the static `OnboardCreek` SVG on page 1. The Stretch item plays a rising-water loop (max 3 loops, A22). Candidates (human downloads; verify the license on the page — Lottie Simple License = free commercial use, attribution encouraged, no reselling the file): "Wave Rising up" by Ashlee (`https://lottiefiles.com/free-animation/wave-rising-up-jX5Czkc0Uo`) or "Water waves" by Ryan (`https://lottiefiles.com/free-animation/water-waves-FH2RtE96xK`). Recolor every fill/stroke to tokens (edit the JSON color arrays with a small script, or `colorFilters` — VERIFY the prop in `node_modules/lottie-react-native/lib/typescript/types.d.ts`). Under Reduce Motion: render the static `OnboardCreek` SVG instead. Credit the creator in Settings → About → Credits.
- **Disaster/flood marketplace packs:** do not use.

### 10.11 App icon concept: "The Dip" [MVP]

Navy gradient background `#0E1726` → `#16233A`; an off-white `#F2F5FA` road band that **dips** into a shallow V at the center; a cyan `#2BD9D9` creek S-curve flowing from the upper-left into the dip; a small ice `#F2F5FA` dot with a 1.5 pt cyan ring upstream = the gauge/early signal. It tells the story "signal upstream, before it crosses". **Red and amber never appear in the icon** (it must never look like an alert). Production specs (iOS `.icon` layers, Android adaptive + monochrome, notification icon, splash) are in §15.5–§15.7.

### 10.12 Acceptance for §10
- [ ] Done when: the Font probe shows 4 Inter weights + tabular digits on Android (and iOS if available).
- [ ] Done when: no `Text` from `react-native` is imported outside `AppText`/RNR `text.tsx` (ESLint `no-restricted-imports` rule).
- [ ] Done when: the dev gallery icon sheet renders every icon in §10.9 with no blank squares; failures replaced per the fallback rule.
- [ ] Done when: marker sprites exist at @2x/@3x and look crisp on a 3× Android device.

---
## §11. Motion, haptics & sound

### 11.1 Principles [MVP]
1. Motion explains **cause → effect** (water moves → state changes → card appears). Nothing decorative loops.
2. At most **two looping animations** on screen at once: the AVOID halo pulse and the water-travel pulse. All other motion is one-shot.
3. **Loops stop after 3 cycles or 6 s** (WCAG 2.2.2) and settle into a static form (static halo at 0.25 opacity; static arrowheads on the creek). They restart only on a new state change, when the marker re-enters the viewport, or when its sheet opens.
4. **Reduce Motion never removes meaning:** each meaningful animation has a dissolve/highlight/color-shift fallback (Apple Reduced Motion criteria). Ongoing motion stops.
5. **Nothing flashes** more than 3×/s anywhere (WCAG 2.3.1), including the demo video.
6. Every Reanimated animation passes `reduceMotion: ReduceMotion.System`, **and** the app-level source of truth below decides whether a loop starts at all.

### 11.2 Motion tokens — `mobile/src/lib/motion.ts` [MVP]

```ts
import { Easing, ReduceMotion } from 'react-native-reanimated';
export const motion = {
  duration: { instant: 0, xs: 100, sm: 160, md: 240, lg: 360, xl: 520, ring: 700, ripple: 900,
              travel: 2400, pulse: 2000, breathe: 3000, countUp: 900 },
  easing: {
    standard: Easing.bezier(0.2, 0, 0, 1),        // M3-style emphasized (curve values unverified; tune on device)
    decelerate: Easing.bezier(0.05, 0.7, 0.1, 1),
    accelerate: Easing.bezier(0.3, 0, 0.8, 0.15),
    linear: Easing.linear,                         // water flow only
  },
  // Reanimated 4 withSpring {duration (perceptual), dampingRatio} form
  spring: {
    press:  { duration: 180, dampingRatio: 1,    reduceMotion: ReduceMotion.System },
    snappy: { duration: 300, dampingRatio: 0.92, overshootClamping: true, reduceMotion: ReduceMotion.System },
    sheet:  { duration: 420, dampingRatio: 0.9,  reduceMotion: ReduceMotion.System },
    pop:    { duration: 380, dampingRatio: 0.6,  reduceMotion: ReduceMotion.System }, // escalation chip/marker
    gentle: { duration: 550, dampingRatio: 1,    reduceMotion: ReduceMotion.System },
  },
  loop: { maxCycles: 3, maxMs: 6000 },
  haptic: { minGapMs: 1500 },
} as const;
```

### 11.3 Reduce-motion architecture [MVP]

- **Source of truth:** `A11yPrefsProvider` (§34) subscribes to `AccessibilityInfo.addEventListener('reduceMotionChanged', …)` and re-reads on `AppState` 'active'. Reanimated's `useReducedMotion()` returns only the app-start value — **do not** use it for live decisions.
- Root layout renders `<ReducedMotionConfig mode={prefs.reduceMotion || settings.animations === 'reduced' ? ReduceMotion.Always : ReduceMotion.Never} />`.
- `useMotionOK()` (in `src/lib/motion.ts`) = `!prefs.reduceMotion && settings.animations !== 'reduced'`; loops, the creek dash flow, water travel, count-ups, the freshness breathe, the splash creek draw and Lottie all check it before starting.
- Settings → Accessibility → **Animations: Full / Reduced** (default follows the system).

### 11.4 Animation catalog [MVP unless tagged]

| # | Interaction | Animation | Timing | Reduce-motion fallback |
|---|---|---|---|---|
| A1 | Button press | scale 1 → 0.97 | `spring.press` | opacity 1 → 0.7 |
| A2 | Status chip changes state | crossfade word + color; scale pop 1 → 1.08 → 1 | 240 ms + `spring.pop` | 150 ms color/opacity dissolve (meaning kept) |
| A3 | Marker escalation (→ WATCH/AVOID/CLOSED) | sprite swap + one `Marker` ripple ring 1 → 2.2×, opacity 0.5 → 0 | `ripple` 900 ms | instant swap + static double ring for 6 s |
| A4 | AVOID halo pulse | ring scale 1 → 1.8, opacity 0.35 → 0 | `pulse` 2,000 ms × 3 cycles, `decelerate`, then static halo 0.25 | static halo 0.25 |
| A5 | WATCH halo | static amber halo 0.20 (no loop) | — | same |
| A6 | Water travel (signature) | `line-gradient` head moves gauge → crossing (`p` 0 → 1) | `travel` 2,400 ms scaled by reach length (min 1,600, max 4,000), `linear`; live: repeats ≤ 3× while rising; replay: driven by sim time | **Live:** static `ic-flow-arrow` arrowheads every 120 pt along the reach and **no text on the creek** — the crossing's risk window stays in the card/EtaRangePill (§3.5). **Replay:** the same static arrowheads + one caption with the §3.7 travel-time **range** string (e.g. "Water usually takes 30–45 min to get here"; τ bucketed into a 15-min range from its uncertainty). Never a single-number travel time or a countdown, in the label, its a11y label or TTS |
| A7 | Rising-creek dash "flow" | step through 14 dash patterns every 60 ms on the `creeks-rising` layer | stops after 6 s, when app inactive, or zoom < 10 | solid active creek, no dash |
| A8 | RiskRing fill | arc sweeps to the state level; color interpolates through states | `ring` 700 ms `spring.gentle` | instant final arc |
| A9 | RiskWindow bracket shift | bracket slides once per data update (never continuous) | 240 ms `standard` | instant |
| A10 | Sheet content swap / tab change | fade + 8 pt rise | 160 ms | fade only |
| A11 | Number change ("6.4" → "6.8 ft") | vertical digit roll | 240 ms | instant |
| A12 | Replay "MINUTES EARLIER" (a measured past lead time, not a countdown) | count-up 0 → X (X from the timeline JSON, §19.12), then `spring.pop` scale | `countUp` 900 ms | final number shown immediately |
| A13 | AlertBanner enter | slide down 12 pt + fade | 240 ms `decelerate` | fade 150 ms |
| A14 | Toast (non-safety) | slide 12 pt + fade | 240 ms | fade |
| A15 | FreshnessPill ("Checked {{age}}") breathe | dot opacity 1 → 0.4 → 1 once every 10 s, only while the check age is ≤ 10 min (stops when aging/offline) | `breathe` 3,000 ms | static dot |
| A16 | Skeleton shimmer | left → right highlight sweep | 1,200 ms, stops after 6 s (then static "Loading…") | static |
| A17 | Splash creek draw | Skia path trim 0 → 1 into the dip | 600 ms, then 300 ms fade out | static logo, 300 ms fade |
| A18 | REPLAY banner enter | slide down from top | 240 ms | fade |
| A18b | JS ReplayMiniBar enter/exit (on non-Replay tabs while a replay is loaded) [Stretch, §4 F41] | slide up 12 pt + fade above the tab bar | 240 ms `decelerate` | fade 150 ms |
| A19 | Map camera ease (fit to crossing/route) | `Camera` ease | 600 ms | jump (duration 0) |
| A20 | Drive Mode approach | `BigActionButton` grows 76 → 96 pt; 8 pt red inner edge glow appears (static) | `spring.snappy` | instant size change; glow appears instantly |
| A21 | Onboarding page change | horizontal paging (native scroll) | system | system (no parallax) |
| A22 | Lottie (onboarding P1) [Stretch] | rising water loop, max 3 loops | asset length | static SVG |

### 11.5 Implementation sketches [MVP]

```tsx
// PulseRing — used inside MapLibre <Marker> for AVOID crossings in the viewport (≤ 20). Reanimated 4 CSS animation.
export function PulseRing({ color, play }: { color: string; play: boolean }) {
  const ok = useMotionOK();
  if (!ok || !play) return <View pointerEvents="none" style={[styles.ring, { borderColor: color, opacity: 0.25 }]} />;
  return (
    <Animated.View pointerEvents="none" style={[styles.ring, { borderColor: color }, {
      animationName: { from: { transform: [{ scale: 1 }], opacity: 0.35 }, to: { transform: [{ scale: 1.8 }], opacity: 0 } },
      animationDuration: '2s', animationIterationCount: 3, animationTimingFunction: 'ease-out',
    }]} />
  );
}
// VERIFY BEFORE USE: Reanimated 4.5.1 CSS animation prop names in node_modules/react-native-reanimated/lib/typescript/css/**.
// Fallback: withRepeat(withTiming(1,{duration:2000, easing: motion.easing.decelerate}), 3, false) on a shared value.
```

```ts
// Water travel driver (live mode): throttled to 30 fps, stops after 3 runs or when the screen blurs.
// p in [0,1] feeds pulseGradient(p) (§29) for ≤ 3 reaches at once. Replay mode: p = clamp((simT − tTrigger)/τ, 0, 1).
```

RiskRing (Skia): `Path` arc from −90°, sweep = `{NO_RISE:0.08, UNKNOWN:1.0 (dashed via DashPathEffect [3,3]), WATCH:0.5, AVOID:0.85, CLOSED:1.0}` × 360°, 10 pt stroke, round caps, track `viz.ringTrack`; CLOSED adds a 45° stripe `Path` clipped to the arc. The ring shows **state level, never a probability**.

### 11.6 Haptic map (`expo-haptics@~57.0.3`) [MVP]

This table is the **single owner** of FordCast's haptic semantics; §3.13 and §9.6 summarize it and MUST match it (notably UNKNOWN = iOS `impactAsync(Soft)` / Android `Gesture_End`).

All function names verified: `notificationAsync(NotificationFeedbackType.Warning|Error|Success)`, `impactAsync(ImpactFeedbackStyle.Light|Medium|Heavy|Soft|Rigid)`, `selectionAsync()`, `performAndroidHapticsAsync(AndroidHaptics.*)`. The specific `AndroidHaptics` member names below are **VERIFY BEFORE USE** (read `node_modules/expo-haptics/build/Haptics.types.d.ts`); fallback = the `impactAsync` style listed.

| Event | iOS | Android (fallback) | Paired with (never alone) |
|---|---|---|---|
| Crossing enters **WATCH** (on screen, on route, or in Drive Mode) | `notificationAsync(Warning)` | `performAndroidHapticsAsync(Reject)` (fallback `impactAsync(Medium)`) | chip/marker change + announcement; Drive Mode: soft chime + TTS |
| Enters **AVOID** / **CLOSED** | `notificationAsync(Error)` **once** | `impactAsync(Heavy)` | AlertBanner + announcement (high); Drive Mode: alert chime + TTS |
| Becomes **UNKNOWN** (data lost) | `impactAsync(Soft)` | `performAndroidHapticsAsync(Gesture_End)` (fallback `impactAsync(Light)`) | dashed ring + StaleBanner |
| De-escalation (any → lower) | `impactAsync(Light)` — **never `Success`** (a success buzz implies "safe") | `impactAsync(Light)` | "Update" text; Drive Mode TTS "Update…" |
| Sheet detent snap | `selectionAsync()` | `Segment_Tick` (fallback none) | — |
| Replay scrubber passes a 15-storm-min tick while dragging | `selectionAsync()` | `Segment_Frequent_Tick` (fallback none) | time label |
| Replay reveals the lead time | `impactAsync(Medium)` | `Confirm` (fallback `impactAsync(Medium)`) | count-up |
| Primary button | `impactAsync(Light)` | `Virtual_Key` (fallback none) | — |
| Toggle / segmented change | `selectionAsync()` | `Toggle_On` / `Toggle_Off` (fallback none) | — |
| Long-press marker | `impactAsync(Medium)` | `Long_Press` (fallback `impactAsync(Medium)`) | — |
| Drive Mode approach alert | `notificationAsync(Error)` | `impactAsync(Heavy)` | chime + TTS + edge glow |
| Passenger hold-to-confirm completes | `impactAsync(Medium)` | `Confirm` | dialog closes |

Rules: ≤ 1 haptic per 1.5 s (`hapticGate` in `src/lib/haptics.ts` drops extras); Settings → Accessibility → Haptics On/Off; safety haptics always accompany visible text (and voice in Drive Mode); `NotificationFeedbackType.Success` is **banned** by a lint rule (`no-restricted-syntax` on `NotificationFeedbackType.Success`).

```ts
// mobile/src/lib/haptics.ts (shape)
export const haptic = {
  watch: () => gate(() => Platform.OS === 'ios' ? H.notificationAsync(H.NotificationFeedbackType.Warning) : androidOr('Reject', H.ImpactFeedbackStyle.Medium)),
  avoid: () => gate(() => Platform.OS === 'ios' ? H.notificationAsync(H.NotificationFeedbackType.Error) : H.impactAsync(H.ImpactFeedbackStyle.Heavy)),
  // CLOSED and the Drive Mode approach alert reuse haptic.avoid (same row in the table above)
  unknown: () => gate(() => Platform.OS === 'ios' ? H.impactAsync(H.ImpactFeedbackStyle.Soft) : androidOr('Gesture_End', H.ImpactFeedbackStyle.Light)),
  deescalate: () => gate(() => H.impactAsync(H.ImpactFeedbackStyle.Light)),   // never NotificationFeedbackType.Success
  select: () => gate(() => H.selectionAsync(), { safety: false }),   // per-event Android variants (Segment_Tick, Toggle_On/Off…) follow the table
  press: () => gate(() => Platform.OS === 'ios' ? H.impactAsync(H.ImpactFeedbackStyle.Light) : androidOr('Virtual_Key', null), { safety: false }),
  reveal: () => gate(() => Platform.OS === 'ios' ? H.impactAsync(H.ImpactFeedbackStyle.Medium) : androidOr('Confirm', H.ImpactFeedbackStyle.Medium), { safety: false }),
};
// gate(): no-op if settings.haptics === false or < 1500 ms since the last haptic; androidOr() calls
// performAndroidHapticsAsync(AndroidHaptics[name]) only if that enum member exists, else impactAsync(style),
// or nothing when style is null ("fallback none" in the table). Unit test: mock expo-haptics and assert each
// entry calls exactly the iOS / Android function in the table above (Platform.OS mocked both ways).
```

### 11.7 Sound [MVP in-app chimes; custom notification sound = Roadmap, §4 F121]

| Asset | Spec | Used for |
|---|---|---|
| `mobile/assets/sounds/chime.wav` | 0.5 s, two soft notes (descending minor third), 10 ms attack, natural decay, peak −3 dBFS, mono 44.1 kHz 16-bit PCM. "Alerting, not alarming" (Watch Duty lesson): no siren, no sweep, no repeated beeps. | In-app pre-TTS chime for AVOID/CLOSED (Drive Mode, foreground escalations with Sounds on) |
| `mobile/assets/sounds/chime_soft.wav` | 0.3 s single soft note, peak −9 dBFS | In-app pre-TTS chime for WATCH |
| *(Roadmap)* `fordcast_alert.wav` | same tone as `chime.wav`, registered in the `expo-notifications` plugin `sounds` array | custom notification sound (§4 F121). **MVP notifications use the system default sound.** |

- Create the sounds yourself (e.g., a tone generator in a free audio editor) or use a CC0 source; record the source and license in `THIRD_PARTY_NOTICES.md`.
- **Android channel sounds are fixed at channel creation**; changing a sound later requires a new channel ID (§31).
- In-app playback uses **`expo-audio`** (not `expo-av`): `setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' })` (verified option names), play the chime, then speak (TTS details and the iOS audio-session choice are owned by §30). VERIFY BEFORE USE the player API (`createAudioPlayer`/`useAudioPlayer`) in `node_modules/expo-audio/build/*.d.ts`.
- Settings → Accessibility: **Sounds** On/Off, **Spoken alerts** On/Off, **Voice speed** slider 0.8–1.2 (default 0.95).
- Never play sound for de-escalation or UNKNOWN; never loop a sound.

### 11.8 "Never one channel" matrix [MVP]

| Event | Visual | Haptic | Audio (Drive Mode / alerts on) | Screen reader (§34) |
|---|---|---|---|---|
| → WATCH | Amber triangle + "Watch" word + chip | Warning | soft chime → TTS | announce `default`, Android live region `polite` |
| → AVOID | Red octagon + "Avoid" + halo (3 cycles) + AlertBanner (persists) | Error | alert chime → TTS | announce `high`, `assertive` |
| → CLOSED | Octagon + stripes + "OFFICIAL" when official + banner | Error | alert chime → TTS "…is closed. Turn around. Don't drown." | announce `high`, `assertive` |
| De-escalation | color/shape change + "Update" line ("Water may still be on the road.") | Light | Drive Mode TTS "Update…" | announce `low` once |
| → UNKNOWN / stale | dashed ring + "?" + StaleBanner | iOS Soft impact · Android `Gesture_End` | none | announce `default`, once per session per crossing |
| Background refresh, no change | none | none | none | **no announcement** (must not reset reading position) |

### 11.9 Acceptance for §11
- [ ] Done when: with Reduce Motion ON, a screen recording of a WATCH→AVOID escalation shows no looping motion yet the state change is visible (dissolve) and announced.
- [ ] Done when: the AVOID halo stops after 3 pulses (≈ 6 s) and settles static.
- [ ] Done when: `grep -rn "NotificationFeedbackType.Success" mobile/src` returns nothing.
- [ ] Done when: two escalations within 1 s produce one haptic.
- [ ] Done when: the `haptics.ts` unit test passes for both `Platform.OS` values (UNKNOWN → `impactAsync(Soft)` on iOS, `Gesture_End` or its `impactAsync(Light)` fallback on Android).
- [ ] Done when: with Reduce Motion ON in live mode, a rising creek shows static `ic-flow-arrow` arrowheads and **no** travel-time text; in replay it shows one range caption from §3.7 (never a single number).

---
