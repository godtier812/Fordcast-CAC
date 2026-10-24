# FordCast DEMO EDITION — Part 3: UI design system (§12–§15)

> Addressed to the AI coding agent (Claude Code). This file is the **visual contract** for the iPhone demo: how FordCast looks, moves, sounds and feels on iOS 26/27, with the tokens, glyphs, materials and motion every screen in `04-ui-screens.md` uses. The goal set by the student is **"the UI is perfect and fits everything"**: every feature has one coherent, beautiful home (§4 + §18), nothing clips on any iPhone (§19), and every simulated thing is visibly labeled (§3.9, §31).
>
> **Precedence:** §3 (safety, states, copy) wins over this file. This file wins over `docs/master-prompt/02-B1-design-system.md` (B1) and `03-B2-templates-screens.md` (B2); open those only where a § below points to an exact section.
>
> **Tags:** [MUST-SHOW] · [SHOULD-SHOW] · [BUILD-ONLY] · [NEXT] (defined in 01 header) · [Verified: source] · [Unverified] · **VERIFY BEFORE USE:** (log the result in `docs/decisions/verifications.md`).
>
> **Evidence base (2026-10-15/16):** npm package sources unpacked with `npm pack` — `expo-template-default@57.0.32`, `expo-router@57.0.28`, `@expo/ui@57.0.25`, `expo-glass-effect@57.0.4`, `expo-blur@57.0.3`, `expo-symbols@57.0.3`, `sf-symbols-typescript@2.2.0`, `react-native-reanimated@4.5.1`, `@shopify/react-native-skia@2.6.2`, `@maplibre/maplibre-react-native@11.5.0` (+ its `@maplibre/maplibre-gl-style-spec@26.2.1`), `react-native@0.86.3`, `@expo-google-fonts/inter@0.4.2`, `@resvg/resvg-js@2.6.2`, `opentype.js@1.3.4`. The three Mac tools in this file (`tools/make-style.mjs`, `tools/make-markers.mjs`, `tools/measure-text.mjs`) **were run** in the sandbox; their byte-identical copies live in `docs/demo-prompt/03-tools/tools/` (next to this file, like `05-code/`) (copy them, don't retype).

**What changed vs the full build's design system (B1)**

| Topic | B1 (full build) | Demo Edition (this file) | § |
|---|---|---|---|
| Platform | Android-first, iOS "compiles, untested" | **iOS only**, designed for iOS 26/27 on a real iPhone | §12 |
| Liquid Glass | Stretch (F41), solid chrome in MVP | **MVP chrome** (iOS 26+), blur on older iOS, solid under Reduce Transparency | §12.3 |
| Map Home | gorhom persistent sheet | floating opaque **AreaStatusCard** + native **formSheets** | §12.2, 04 §18.4 |
| Settings | RNR screens | native **SwiftUI `Form`** (`@expo/ui`) with `tint('#6CB4FF')` | §12.2, 04 §18.18 |
| Replay violet | "REPLAY · real data" | **SIMULATED** violet (scenario/storm/drive) + neutral dashed **DEMO** chip at rest | §12.5, §13.6 |
| Light theme, Android tokens | Stretch / MVP | **removed** (dark only; iOS only) | §13 |
| Haptics | one 1.5 s gate | **two gates**: safety 1.5 s, UI 60 ms (muted 400 ms after a safety cue) | §15.5 |
| Marker/style generators | Python (`make_markers.py`, `make_style.py`) | **Node, zero-Python** (`tools/*.mjs`), run and verified | §13.8, §14.3 |
| Fit | estimates | **measured** Inter text widths + height/width classes | 04 §19 |

---

## §12. iOS-first design principles & Liquid Glass

### 12.1 The ten principles (every screen is reviewed against these)

| # | Principle | In pixels | Done when |
|---|---|---|---|
| P1 | **Night-first** | Dark only (`userInterfaceStyle: 'dark'`, 02 §9.4). Canvas `#0E1726`, text `#F2F5FA` (16.44:1). Drive Mode is darker (`#070D18`). Never pure white on pure black. | A screen recording at 30 % brightness in a dark room shows no glare and every status readable. |
| P2 | **Glanceable in 2 s** | Each screen answers one question first, top-left of its content: *what is the worst state near me / on my route / at this crossing?* Drive Mode: ≤ 3 items per glance, ≤ 120 characters. | A first-time viewer names the highlighted crossing's state within 2 s (§28 comprehension check). |
| P3 | **Calm but honest** | Calm looks premium and alive (cyan creek veins, gauge ripple, DEMO chip) but **never reassuring**: no green, no check mark on a crossing, no "all clear", no `Success` haptic. | `copy-banned` + `code-guards` tests pass (01 §3.11); no green pixel in a status position. |
| P4 | **The map is the product; chrome floats** | Full-bleed map under the status bar. Small **glass** controls float (§12.3); content lives on **opaque** cards and native sheets. | No opaque bar covers the map except the tab bar, the card and sheets. |
| P5 | **Signs, not colors** | Road-sign grammar: hollow circle / amber triangle / red octagon / striped octagon / dashed ring with "?" (§13.5, §14.2). Fill polarity (ink on amber, white on red) separates Watch from Avoid for color-blind users. | Every screen is usable in iOS **Settings → Accessibility → Display & Text Size → Color Filters → Grayscale**. |
| P6 | **Recency is a state** | The FreshnessPill always shows how old the (simulated) data is; old data turns **Unknown** (dashed), never calm. | Director "Simulated offline" → 20 min later every crossing is Unknown with "Last known" (05 §22.8). |
| P7 | **Motion explains cause → effect** | Water travels → the gauge crosses its trigger → the state changes → a card appears. No decorative loops; loop budget by state (§15.1). | No animation on screen that doesn't map to a data event or a user touch. |
| P8 | **Native where iOS is best, custom where FordCast is unique** | Tab bar, sheets, menus, Settings, permission dialogs = native iOS. Status glyphs, map, charts, Drive Mode, storm player = custom (§12.2). | Side-by-side with Apple Maps/Weather, chrome sizes and sheet behavior match. |
| P9 | **Honest capability, honest data** | Every simulated surface carries its label (§12.5); a feature that isn't built is a "Planned" row, never a dead button. | 01 §7.3 honesty checks pass in EN and ES. |
| P10 | **Fits everything** | Every layout comes from `useWindowDimensions()` + `useSafeAreaInsets()` and the height/width classes (§12.4, 04 §19). Never truncate a status word, a time window, a button label or a crossing name at default text size; stack instead. | 04 §19.7 screenshot matrix passes (SE · 16/17 · Pro Max × EN/ES × T0/T1/T3). |

### 12.2 Native vs custom: who draws what

| Surface | Implementation | Material | Why |
|---|---|---|---|
| Tab bar (Map · Drive · Storms · Alerts) | `NativeTabs` (`expo-router/unstable-native-tabs`) with SF Symbols | system Liquid Glass (iOS 26+), `blurEffect: 'systemChromeMaterialDark'` below 26 | Native minimize-on-scroll, badge, Large Content Viewer for free [Verified: pkg expo-router@57.0.28 native-tabs types] |
| Scenario transport ("one clock") | `NativeTabs.BottomAccessory` (iOS 26+) / JS `ScenarioMiniBar` (< 26) | system glass / opaque `surface1` | The iOS "mini-player" pattern for a global timeline [Verified: `NativeTabs.BottomAccessory.usePlacement(): 'regular' \| 'inline'`] |
| Sheets (crossing, nearby, legend, search, gauge, results, Director) | `presentation: 'formSheet'` with numeric detents (react-native-screens 4.26) | system glass at partial height, opaque at full | No gesture fight with the map; native grabber and detent snapping |
| Storm player, Drive Mode | `fullScreenModal` | custom (opaque `#0E1726` / `#070D18`) + glass ✕ | Immersive, no tab bar |
| Settings | `presentation: 'modal'` (page sheet) + inner Stack; index/notifications/accessibility/drive = `@expo/ui` SwiftUI `Form` | native grouped list | Native feel, Dynamic Type, VoiceOver for free |
| Context menus, previews, pull-down "Show detour in ▾" | `Link.Menu` / `Link.MenuAction` / `Link.Preview` (expo-router 57) | native | Long-press previews like Maps [Verified: pkg expo-router@57.0.28 `link/Link.d.ts`] |
| Empty states | `@expo/ui` `ContentUnavailableView` | native | Looks intentional, localizes [Verified: pkg @expo/ui@57.0.25] |
| Floating map chrome (pill, [?], [⚙], [⌕][☰][➤], player ✕) | `GlassSurface` (§12.3) | Liquid Glass → blur → solid | The single biggest "native and premium" cue on a 2026 iPhone |
| Map, markers, creeks, route, water pulse | MapLibre RN 11.5.0 + "FordCast Night" style + sprites (§13.8, §14.3) | GL | FordCast's core |
| Status glyphs/chips, hydrograph, risk window, LagPair, scrubber, Drive HUD | custom (react-native-svg, Skia, Reanimated) | opaque | FordCast's sign language; identical everywhere |
| Buttons, cards, text, segmented speed chips | React Native Reusables copies limited to `button`, `card`, `text`, `toggle-group` (04 §16.3) | opaque | Consistent tokens; no lucide glyphs next to SF Symbols |

### 12.3 Liquid Glass: three tiers, one component [MUST-SHOW]

Verified APIs: `expo-glass-effect@57.0.4` exports `GlassView` (`glassEffectStyle: 'clear' | 'regular' | 'none' | {style, animate?, animationDuration?}`, `tintColor`, `isInteractive`, `colorScheme`), `GlassContainer` (`spacing`), `isLiquidGlassAvailable()`, `isGlassEffectAPIAvailable()`; `expo-blur@57.0.3` `BlurView` (`tint` incl. `'systemChromeMaterialDark'`, `intensity`); `AccessibilityInfo.isReduceTransparencyEnabled()` (RN 0.86.3) [Verified: research-ui §3.1, package `.d.ts`]. Liquid Glass needs the app **compiled with Xcode ≥ 26** (`#if compiler(>=6.2)` in `GlassEffectModule.swift`); with an older Xcode `isLiquidGlassAvailable()` is false and the blur tier shows [Verified: research-ui §0.1].

| Tier | When | Render |
|---|---|---|
| `liquid` | iOS 26+, built with Xcode ≥ 26, Reduce Transparency **off** | `GlassView glassEffectStyle="regular" tintColor="rgba(14,23,38,0.55)" colorScheme="dark" isInteractive={pressable}` |
| `blur` | iOS 16.4–25 (or glass unavailable), Reduce Transparency off | `BlurView tint="systemChromeMaterialDark" intensity={70}` + overlay `rgba(14,23,38,0.55)` |
| `solid` | Reduce Transparency **on** (any iOS) | `View` background `#152033` (surface1, opaque) + 1 pt `#2A3A55` border |

```tsx
// mobile/src/components/fordcast/GlassSurface.tsx — one component, three tiers; call sites never change.
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useA11yPrefs } from '@/lib/a11y/A11yPrefsProvider';
import { theme } from '@/lib/theme';

const LIQUID = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();   // read once
export type GlassTier = 'liquid' | 'blur' | 'solid';
export function useGlassTier(): GlassTier {
  const { reduceTransparency } = useA11yPrefs();            // live (05 §27.1 provider; re-read on AppState 'active')
  return reduceTransparency ? 'solid' : LIQUID ? 'liquid' : 'blur';
}
export function GlassSurface({ pressable, radius = 22, style, children, ...rest }:
  ViewProps & { pressable?: boolean; radius?: number }) {
  const tier = useGlassTier(); const shape = { borderRadius: radius };
  if (tier === 'liquid') return (
    <GlassView glassEffectStyle="regular" tintColor={theme.glass.tint} colorScheme="dark" isInteractive={!!pressable}
      style={[shape, style]} {...rest}>{children}</GlassView>);
  if (tier === 'blur') return (
    <BlurView tint="systemChromeMaterialDark" intensity={70} style={[shape, { overflow: 'hidden' }, style]} {...rest}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.glass.tint }]} />
      {children}
    </BlurView>);
  return <View style={[shape, { backgroundColor: theme.glass.solid, borderWidth: 1, borderColor: theme.border.subtle }, style]} {...rest}>{children}</View>;
}
```
`lib/glass.ts` (01 §5) re-exports `useGlassTier` for non-component code (e.g. the Director status line shows `glass: liquid`).

**Glass rules (MUST):**
1. **Glass only on chrome:** the FreshnessPill / scenario pill, `[?]`, `[⚙]`, the map control stack `[⌕][☰][➤]`, the storm player's `[✕]` and caption pill, the Drive-tab and Alerts header gear. The tab bar, the BottomAccessory and partial-height formSheets get **system** glass automatically [Unverified for RNS formSheets on iOS 26 → VERIFY BEFORE USE on the device; research-ui §6 item 2].
2. **Opaque everywhere else:** AreaStatusCard, AlertBanner, sheet *content*, lists, storm player transport panel, Drive Mode, dialogs, Settings rows, Storms cards.
3. **Siblings merge:** adjacent glass buttons sit in one `GlassContainer spacing={8}` (the right-edge stack; `[?][⚙]`).
4. **Text on glass** is only `text.primary` `#F2F5FA`, ≥ 15 pt semibold (iOS 27 lets users make glass fully clear). Exception: the violet scenario pill is an **opaque violet fill** on top of glass (ink `#0E1726` on `#B69CFF`, 7.86:1).
5. **Never fade a glass view, or any parent of one, below ~2 % opacity.** UIKit silently drops the effect and `expo-glass-effect` waits for visibility before reinstalling it [Verified: pkg expo-glass-effect@57.0.4 `ios/GlassView.swift` comment]. Unmount it, or animate `transform` instead.
6. **Never glass on glass, never glass behind a status chip, never set `sheetCornerRadius` or a custom background on an iOS formSheet** (kills the partial-detent glass; research-ui §3.3).
7. **Glass control finish:** 44 × 44 pt visual circle, `hitSlop` 2 → 48 pt hit; SF Symbol 20 pt semibold `#F2F5FA`; `isInteractive` gives the native press response; only the `blur`/`solid` tiers add scale 0.96 (`spring.press`).
8. The `blur` tier is a **first-class look**, reviewed on an iOS 18 Simulator (04 §19.7), because the recording phone may build without glass if the Mac's Xcode is older.

**Done when (§12.3):** on the device (Xcode ≥ 26) every chrome control shows Liquid Glass; Settings → Accessibility → Display & Text Size → Reduce Transparency ON switches all of them to the solid tier without a restart; the iOS 18 Simulator shows the blur tier with the same layout; no glass view ever flickers off during sheet or banner animations.

### 12.4 Layout system: classes, zones, targets

**Classes** (every rule in 04 keys off these; never off a device model) [research-ui D9]:

| Class | Rule | iPhones (portrait, pt) |
|---|---|---|
| Height **C** (compact) | `H < 700` | SE 3rd gen 375 × 667 (home button, safeTop 20, safeBottom 0) |
| Height **R** (regular) | `700 ≤ H < 900` | 13 mini 375 × 812 · 16 393 × 852 · 17 402 × 874 |
| Height **T** (tall) | `H ≥ 900` | Air 420 × 912 · 16 Plus 430 × 932 · Pro Max 440 × 956 |
| Width **N** (narrow) | `W < 390` | SE, 13 mini |
| Width **W** (wide) | `W ≥ 390` | everything else |

Exact sizes and insets are in 04 §19.1 (several are [Unverified] and read at runtime anyway).

**Global layout values:**

| Quantity | Value |
|---|---|
| Gutter `g` | `W ≥ 428 ? 20 : 16` |
| Top chrome y | `safeTop + 8` (C: `safeTop + 6`) — nothing interactive inside `safeTop` (Dynamic Island, notch, status bar stay clear) |
| Custom touch target | **48 × 48 pt** hit (`hitSlop` on 44 pt visuals); ≥ 8 pt between targets |
| System controls (segmented, Form rows, tab items) | HIG **44 pt**, full-width rows (recorded deviation from B1's 48 everywhere; research-ui W24) |
| Drive Mode targets | **76 pt** tall minimum, **96 pt** when emphasized (approach alert), ≥ 24 pt gaps |
| Primary button / secondary / text | 52 / 48 / 48 hit |
| Reading width | text blocks ≤ 560 pt wide (never reached on iPhone; kept for the Simulator's resizable device) |

**Reach zones** (one-handed, 393 × 852 reference):
```
┌─────────────────────────────────┐  0
│ status bar / Dynamic Island      │  safeTop — no controls
│ (┊DEMO┊ updated 2 min ago)[?][⚙]│  GLANCE zone: read-only info + rare actions (legend, settings)
│                                 │  ── top 25 %: out of reach on 6.7–6.9" phones
│            M A P                │  STRETCH zone: pan/zoom only
│                          [⌕]    │
│                          [☰]    │  map controls at 55–70 % height, right edge, 16 pt above the card
│                          [➤]    │
│ ╭─────────────────────────────╮ │  THUMB zone (bottom 45 %): every primary action
│ │ status card + [Check my     │ │
│ │ drive] [Drive Mode ▶]       │ │
│ ╰─────────────────────────────╯ │
│  Map   Drive   Storms   Alerts  │  NativeTabs + safeBottom
└─────────────────────────────────┘  852
```
Every primary action (Drive Mode, Check my drive, Detour, Notify me, Play) lives in the thumb zone. Only read-only info, Legend and Settings live in the top band. Settings/Help sit in the **same top-right spot on every tab** (WCAG 3.2.6).

### 12.5 The honesty layer is part of the design language [MUST-SHOW]

Labels are designed, not bolted on. Three layers, one grammar: **neutral dashed = demo at rest; violet = a simulated storm is playing.** Copy keys are in 01 §3.7/§3.9; placement matrix in 06 §31.1.

| Layer | Visual (exact) | Where |
|---|---|---|
| **DEMO chip** (rest) | 20 pt tall, radius 6, padding 0 × 6, **1 pt dashed** `#8A97AB` outline (SVG `Rect strokeDasharray="3 2"`), text `label.chip` 13 pt Bold caps +0.6 `#B4BFD0`, no fill. Measured width 54 pt ("DEMO" = 41.8 pt + 12). Neutral on purpose: violet stays reserved for "a storm is playing". | inside the FreshnessPill (Map Home), gauge card, crossing meta line ("· DEMO") |
| **SIMULATED pill + frame** (scenario running) | Pill: opaque violet `#B69CFF` fill, ink `#0E1726`, 36 pt visual / 48 pt hit, radius 18, 8 pt ink dot + 6 + `label.lg` 15 pt semibold. Map viewport: **2 pt violet inner frame** (`#B69CFF`, inset 0, `pointerEvents="none"`) + full-map wash `rgba(182,156,255,0.04)`. | Map Home top band; any map that shows scenario state |
| **SimulatedBanner** (storm surfaces) | Two-line pill, 44 pt tall, radius 14, fill `#B69CFF`, ink `#0E1726`: line 1 `demo.banner_title` "SIMULATED STORM" (`label.chip`), line 2 `demo.banner_sub` "demo data · not live" (`caption` 13/18, semibold). Measured widths EN 136.7 / 120.0 pt, ES 158.7 / 232.4 pt → fits every class without truncation (04 §19.3). Variant `drive`: line 1 "SIMULATED DRIVE" (`replay.simulated_drive`), line 2 `demo.drive_banner_sub` "scripted position · demo" (147 / ES 175 pt). | Storms cards, storm player, results sheet, Drive Mode |
| **Notification subtitle** | system UI: "Simulated storm · demo data" | every local notification (05 §25.2) |
| **Inbox chip** | violet `SIMULATED` chip (fill `#B69CFF`, ink, `label.chip`, 24 pt tall, radius 6) **before** the state chip | Alerts → Inbox rows |
| **Source label** | `OfficialSourceBadge`: 14 pt shield (`shield.lefthalf.filled`) + "Simulated road crew" + `OFFICIAL` chip | crossing sheet CLOSED · OFFICIAL |

New keys this file introduces (add to `en.json`/`es.json` and `es-pending-review.json`; `demo.banner_sub` joins `allowKeys` in `banned-words.json` because it contains the negation "not live" / "no es en vivo", exactly like `demo.banner`, 01 §3.11):

| Key | EN | ES |
|---|---|---|
| `demo.banner_title` | SIMULATED STORM | TORMENTA SIMULADA |
| `demo.banner_sub` | demo data · not live | datos de demostración · no es en vivo |
| `demo.drive_banner_sub` | scripted position · demo | posición programada · demo |

The single-line `demo.banner` key stays the **accessibility label** of every SimulatedBanner (`demo.banner_spoken`, 05 §27.1) and is used where one line fits (README, video captions).

**Rules:** honesty labels are **never hidden** — not by clean recording mode (05 §24.5), not by Reduce Motion, not at any Dynamic Type size (they wrap, never clip; the pill uses its short form, §3.4). No screen may show scenario state (violet frame off) while a scenario is selected.

### 12.6 Calm state and storm state (what fills the screen)

**Calm** (`calm-evening`, the state after launch and after every Director Reset; ≈ the first 10 s of the video):
- FreshnessPill `[┊DEMO┊] updated 2 min ago` (no dot, no animation on the chip).
- Thin cyan creek veins `rgba(43,217,217,0.50)`; small cyan gauge dots, each with **one soft ripple every 12 s** (radius 4 → 14 pt, opacity 0.35 → 0, 1,200 ms, decelerate) on a single `gauges-ripple` circle layer.
- 17 monitored crossings as slate hollow rings (`ic-norise`, 14 pt); 8 tier-C crossings as dashed rings with "?" (`ic-unknown`, labeled "Unknown · not monitored by FordCast" in their sheet). Never a calm look for a crossing FordCast can't see.
- AreaStatusCard: `(○ NO RISE)` chip + "No upstream rise detected near you" + "Watching 12 upstream gauges for 17 crossings · updated 2 min ago" + `[Check my drive] [Drive Mode ▶]` + footer "Water can cover a road without warning. Turn around, don't drown."
- **Loop budget (calm):** gauge ripple only (≤ 1 loop). No green, no check marks, no "all clear".

**Storm** (any scenario selected): violet pill + frame + accessory; creeks upstream of WATCH/AVOID crossings turn active cyan with glow; AVOID halos pulse 3× then hold; the water pulse travels (player/Map Home while playing); AlertBanner for AVOID/CLOSED. **Loop budget (storm):** AVOID halo (3 cycles, then static) + water travel. The calm gauge ripple **stops at the first WATCH+** and does not restart until Reset.

### 12.7 iOS behaviors we adopt (and the ones we don't)

| Adopt | Spec |
|---|---|
| Large titles on list tabs | Drive, Storms, Alerts, Settings: `headerLargeTitle: H >= 700`, `headerTransparent: true`, `headerBlurEffect: 'systemChromeMaterialDark'` below iOS 26, `scrollEdgeEffects: { top: 'soft' }` on iOS 26+ [Verified: expo-router 57.0.28 native-stack types; RNS 4.26.2 `ScrollEdgeEffect`]. C class: inline title. |
| Tab bar minimize | `NativeTabs minimizeBehavior="onScrollDown"`. Map Home has no ScrollView, so its tab bar never minimizes (storm safety intact); list tabs shrink natively and the accessory animates to `inline` [research-ui §3.2, W8]. |
| Long-press previews + context menus | Crossing rows (nearby, Saved, Inbox, route strip): `Link.Preview` of the crossing peek + `Link.Menu` actions *Show on map · Detour · Notify me / Stop alerts* (never a red "Remove"). Gear long-press: *English ✓ · Español · Demo Director · How FordCast works*. |
| Detent haptics | `selectionAsync()` when a sheet settles (`sheetDetentChange` with `stable: true`), through the UI haptic gate (§15.5). |
| Swipe-back | Native in every pushed stack; Drive Mode disables the dismiss gesture (`gestureEnabled: false`). |
| Zoom transition | Storms hero card → player via `Link.AppleZoom` (iOS 18+) [Unverified into a `fullScreenModal` → fallback: plain fade-through, 04 §18.13]. |
| Home indicator | `autoHideHomeIndicator: true` on `storm/[id]` and `drive-mode` [Verified option name]. |
| Keep awake | Drive Mode `useKeepAwake()`; Director clean mode `activateKeepAwakeAsync('demo')` (05 §24.5). |

**Deliberately not used:** Live Text, App Intents/Siri, widgets, CarPlay, Critical Alerts, Time Sensitive notifications (entitlements or extra App IDs a free Personal Team can't sign; 02 §10), the `role="search"` tab (system title can't be localized by us), a custom-drawn fake Dynamic Island or lock screen (never fake a system feature, 01 §1.5 rule 8). Live Activity is [NEXT] unless the 02 §10.3 spike passes (04 §18.21).

### 12.8 Done when (§12)
- Every screen in 04 §18 passes P1–P10 in its review row (`docs/a11y/TESTING.md`, 05 §27).
- Glass appears only on the §12.3 chrome list; Reduce Transparency gives the solid tier live.
- Every honesty label in §12.5 renders in EN and ES at T0 and AX3 without truncation, and never disappears in clean recording mode.

---
## §13. Tokens (color, type, spacing, radii, glass, map palette)

> **One source of truth:** `mobile/src/lib/theme.ts` (§13.11) holds raw hex (Skia, MapLibre, SVG and haptics code need raw values). `mobile/src/global.css` holds the same values as HSL triplets for NativeWind/RNR classes. A parity test fails CI if they drift (§13.12). Components read tokens through `theme`/`useTheme()`, **never** hex literals (lint + grep gate, §13.12). Every contrast ratio below was computed with the WCAG 2.x relative-luminance formula in the full build (B1 §9, "re-verified 2026-10-14"); the Demo Edition only removes tokens and adds the simulated/demo set.

### 13.1 Palette primitives

| Name | Hex | Name | Hex |
|---|---|---|---|
| `navy950` | `#070D18` Drive Mode bg | `slate500` | `#6B7890` input/checkbox borders |
| `navy900` | `#0B1320` map land | `slate450` | `#7A879C` unknown ring |
| `navy850` | `#0E1726` canvas, ink | `slate400` | `#8A97AB` no-rise, tertiary text |
| `navy800` | `#152033` surface.1 | `slate300` | `#B4BFD0` secondary text |
| `navy750` | `#1C2940` surface.2 | `ice` | `#F2F5FA` primary text |
| `navy700` | `#24344F` surface.3 | `iceDim` | `#E6EBF2` Drive Mode text |
| `navy600` | `#2A3A55` border.subtle | `amber500` | `#F5A623` watch |
| `navy550` | `#3A4D6E` border.strong | `red600` | `#C62828` avoid/closed fill |
| `red700` | `#B71C1C` HC avoid fill | `red400` | `#FF5470` avoid/closed text & icons |
| `red300` | `#FF8095` HC avoid text | `cyan400` | `#2BD9D9` water (creeks, gauges, hydrograph) |
| `blue400` | `#5AA9FF` route | `blue300` | `#6CB4FF` focus ring, links, switch-on, SwiftUI `tint` |
| `violet300` | `#B69CFF` **simulated** (scenario, storm, drive) | `white` | `#FFFFFF` |

**Reserved hues (never reuse):** cyan = water data only · violet = simulated only · amber/red = risk states only · blue = route, links, focus, toggles only. **There is no green anywhere** — no success toasts, no green toggles (SwiftUI `Toggle` is green by default → `tint('#6CB4FF')` is mandatory, §13.11 note), no green in charts or icons. Test: any hex with hue 75°–165° and saturation > 25 % in `mobile/src` or `mobile/assets` fails CI (01 §3.11).

### 13.2 Semantic tokens (dark; the only theme)

Contrast vs the named background (bg `#0E1726`, s1 `#152033`, s2 `#1C2940`, s3 `#24344F`).

| Token | Value | Use | Contrast |
|---|---|---|---|
| `bg` | `#0E1726` | app background, sheet backgrounds at full detent | — |
| `mapLand` | `#0B1320` | basemap land | — |
| `surface1` | `#152033` | cards, sheet content blocks, list rows, AreaStatusCard | primary 14.94 |
| `surface2` | `#1C2940` | inputs, segmented tracks, secondary buttons, popovers | primary 13.34 · avoid.fg 4.69 · tertiary 4.93 |
| `surface3` | `#24344F` | pressed / selected rows only — **no status text on it** | primary 11.44 |
| `scrim` | `rgba(5,9,16,0.60)` | dialog dim | — |
| `glass.tint` | `rgba(14,23,38,0.55)` | `GlassView tintColor`, blur overlay | — |
| `glass.solid` | `#152033` + 1 pt `#2A3A55` | Reduce Transparency tier | primary 14.94 |
| `text.primary` | `#F2F5FA` | body, titles | 16.44 bg · 14.94 s1 · 13.34 s2 |
| `text.secondary` | `#B4BFD0` | supporting text | 9.67 bg · 8.79 s1 · 7.85 s2 |
| `text.tertiary` | `#8A97AB` | timestamps, axis labels | 6.07 bg · 5.52 s1 · 4.93 s2 (never on s3) |
| `text.disabled` | `#5B6880` | disabled labels (WCAG-exempt), always with a reason line | 2.90 s1 |
| `text.onAccent` | `#0E1726` | ink on amber / cyan / violet / ice | 8.86 / 10.29 / 7.86 / 16.44 |
| `border.subtle` | `#2A3A55` | decorative hairlines | 1.57 (decorative) |
| `border.strong` | `#3A4D6E` | dividers in dense lists, grabber hints | 2.11 |
| `border.input` | `#6B7890` | checkbox, input, unselected chip outlines | 3.67 s1 |
| `focus` / `link` | `#6CB4FF` | 2 pt focus ring, links, switch-on track, SwiftUI `tint` | 8.22 bg · 7.47 s1 |
| `action.primaryBg` / `Fg` | `#F2F5FA` / `#0E1726` | **inverse pill** primary CTA (hue-free, no status confusion) | 16.44 |
| `action.secondaryBg` / `Fg` | `#1C2940` / `#F2F5FA` | secondary buttons | 13.34 |
| `water` / `waterCalm` | `#2BD9D9` / `rgba(43,217,217,0.50)` | hydrograph line, active creeks, gauge dots / calm creeks | 10.29 bg |
| `route` | `#5AA9FF` | route line (6 pt + casing), user/car dot | 7.32 bg |
| `sim` / `simInk` | `#B69CFF` / `#0E1726` | simulated pill, banners, scrubber fill, inbox chip, map frame | 7.86 |

### 13.3 Increase Contrast set (`darkHC`)
Active when iOS **Increase Contrast** is on (`AccessibilityInfo.isDarkerSystemColorsEnabled()`, live via the A11y provider) or Settings → Accessibility → "Increase contrast". Borders go 1 → 2 pt.

| Role | Normal | HC | HC contrast |
|---|---|---|---|
| `status.avoid.fg` | `#FF5470` | `#FF8095` | 7.50 bg · 6.82 s1 |
| `status.avoid.fill` | `#C62828` | `#B71C1C` + 2 pt white rim everywhere | white on it 6.57 |
| `status.noRise` / `text.tertiary` | `#8A97AB` | `#A9B4C6` | 8.58 bg |
| `status.unknown` ring | `#7A879C` | `#9AA6B8` | 7.29 bg |
| `border.subtle` / `.strong` | `#2A3A55` / `#3A4D6E` | `#6B7890` / `#8A97AB` | 4.03 / 6.07 |
| `status.watch`, `sim` | unchanged | unchanged | 8.86 / 7.86 |

### 13.4 Drive Night (inside `drive-mode` only)
`bg #070D18` · cards `#0E1726` (text 14.99) · `text.primary #E6EBF2` (16.23) · `text.secondary #B4BFD0` (10.47) · status colors as dark (watch 9.60, avoid.fg 6.25 on `#070D18`) · **edge glow** 8 pt inner border `#FF5470` @ 0.9, static (fades in once over 200 ms; never flashes) during an AVOID/CLOSED approach.

### 13.5 Status tokens — the core (keyed by the engine's wire state)

Tokens are keyed by the engine's `Wire` strings (`no_rise | watch | avoid | closed | unknown`, 05 §22.2) so components do `theme.status[risk.state]` with no mapping table. Rank: `no_rise 0 < unknown 1 < watch 2 < avoid 3 < closed 4` (01 §3.2).

| State | Chip (EN / ES) | Shape + glyph (§14.2) | `fg` (text/icon) | `fill` | `ink` | `border` | `halo` |
|---|---|---|---|---|---|---|---|
| `no_rise` | NO RISE / SIN CRECIDA — outline chip | hollow circle, no glyph | `#8A97AB` | transparent | `#8A97AB` | `#8A97AB` 1.5 pt | none |
| `watch` | WATCH / PRECAUCIÓN — **amber fill + ink** | rounded triangle + "!" | `#F5A623` (≥ 18 pt semibold only) | `#F5A623` | `#0E1726` | `#F5A623` | `rgba(245,166,35,0.20)` static |
| `avoid` | AVOID / EVITE — **red fill + white** + 1 pt `#FF5470` rim on surfaces | rounded octagon + "!" (2 pt white rim on the map) | `#FF5470` | `#C62828` | `#FFFFFF` | `#FF5470` | `rgba(255,84,112,0.25)`, 3 pulses then static |
| `closed` | CLOSED / CERRADO (+ `· OFFICIAL` / `· OFICIAL` + shield when official) | octagon + three white 45° barricade stripes, no pulse | `#FF5470` | `#C62828` | `#FFFFFF` | `#FF5470` | none |
| `unknown` | UNKNOWN / DESCONOCIDO — **dashed** outline chip | dashed ring + "?"; last-known badge variants | `#8A97AB` | transparent | `#8A97AB` | `#7A879C` dashed 3/3 | none |

Rules (CI-enforced where possible):
1. A status is **never** carried by color alone: every status appears as a `StatusChip` or `StatusGlyph` next to its word. Colored status text is **≥ 18 pt semibold** (`status.word`) and always beside a chip/glyph.
2. `no_rise` and `unknown` are both grey on purpose; they differ by the **dashed outline, the "?" glyph and the word**. Never drop any of the three.
3. Status colors come only from `theme.status[...]` so the HC swap reaches everything (lint: no status hex outside `theme.ts`).
4. Loading never looks like `no_rise`: crossings are **not drawn** until the scenario is compiled (≤ 30 ms JIT-less, 05 §22.5; precompile timing 05 §22.10); a loading list shows "Loading crossings…" text, never slate rings.
5. The dashed outline on chips is an SVG `Rect strokeDasharray="3 3"` (RN `borderStyle: 'dashed'` with radii is unreliable).

### 13.6 Simulated & demo tokens (replace B1's "replay" set)

| Token | Value | Use |
|---|---|---|
| `sim.fill` / `sim.ink` | `#B69CFF` / `#0E1726` (7.86:1) | SIMULATED pill, SimulatedBanner, inbox chip, scrubber fill, accessory dot |
| `sim.frame` | 2 pt `#B69CFF`, inner, full map viewport | Map Home (and any map) while a scenario is selected |
| `sim.mapWash` | `rgba(182,156,255,0.04)` full-map overlay | same |
| `sim.track` / `sim.thumb` | `#24344F` / 24 pt `#F2F5FA` circle + 2 pt `#B69CFF` ring | storm scrubber |
| `sim.ticks` | `▲` watch amber · `◆` avoid red octagon · `▧` closed striped · `◌` unknown dashed slate · `●` **water reached the road (simulated)**: 10 pt white dot + 2 pt cyan ring · `⌀` gauge-silent span: hatched `rgba(122,135,156,0.35)` band | scrubber ticks (05 §26.2 `scrubberTicks`) |
| `demo.chipBorder` / `demo.chipText` | 1 pt dashed `#8A97AB` / `#B4BFD0` | DEMO chip (§12.5) |
| `sim.resultNumber` | `display.lg` 44/48 (T: 56/60) `#F2F5FA`; unit `title.md` `#B4BFD0` | results count-up |

### 13.7 Data-visualization tokens

| Token | Value | Used by |
|---|---|---|
| `viz.line` | `#2BD9D9`, 2.5 pt, round caps & joins | Hydrograph, Sparkline |
| `viz.area` | linear gradient `rgba(43,217,217,0.12)` → `rgba(43,217,217,0)` top → bottom | Hydrograph |
| `viz.trigger` | `#F5A623`, 1.5 pt, dash `[4, 4]`, label "Trigger 6.0 ft" / "Nivel de alerta 6.0 pies" (`num.sm` amber) | Hydrograph (value from `LINKS[].triggerFt`, never typed) |
| `viz.watchLevel` | `#8A97AB`, 1 pt, dash `[2, 4]`, label "Watch level" / "Nivel de precaución" | Hydrograph at the full detent only |
| `viz.now` | 8 pt `#2BD9D9` dot + 2 pt `#F2F5FA` ring | Hydrograph, Sparkline |
| `viz.grid` / `viz.axis` | `#2A3A55` 1 pt / `num.sm` `#8A97AB` | Hydrograph |
| `viz.playhead` | `#B69CFF` 2 pt vertical | player hydrograph / LagPair |
| `viz.gap` | hatched band `rgba(122,135,156,0.35)` + label "No data" / "Sin datos" | gauge-silent span (05 §26.5) |
| `viz.windowLikely` | `#C62828` @ 0.85 bracket + white `num.sm` label | RiskWindow (AVOID) |
| `viz.windowPossible` | `#F5A623` @ 0.35 band + ink label | RiskWindow (WATCH with a window) |
| `viz.ringTrack` | `#24344F`, 6 pt | RiskRing (48 pt) |

### 13.8 Map palette — "FordCast Night" + overlay layers

**Basemap** = OpenFreeMap **Positron** recolored by `tools/make-style.mjs` (below). OpenFreeMap needs no key and sets no request limit; its fonts are **Noto Sans Regular / Bold / Italic only** — Inter in a map `text-font` renders nothing [Verified: research/maps.md §4.1]. The basemap deliberately recedes (< 2:1 vs land) so states, creeks and the route pop; only labels need ≥ 4.5:1 (ratios vs land `#0B1320`, B1 §9.8).

| Layer (Positron `source-layer` / type) | Color | vs land |
|---|---|---|
| `background` | `#0B1320` | — |
| `landuse` | `#0F1A2B` | 1.07 |
| `park`, `landcover` (fill) | `#0F1F24` | 1.10 |
| `building` (no outline) | `#121C2E` | 1.09 |
| `water` (fill) | `#0F2236` | 1.15 |
| `waterway` (line) | `#1E4A63` | 1.96 |
| roads: minor (+ paths, piers, aeroways) / major / motorway / casings | `#1A2638` / `#24344D` / `#31445F` / `#0B1320` | 1.22 / 1.48 / 1.88 |
| rail / boundary | `#1A2436` / `#2A3A55` | 1.20 / 1.63 |
| road labels (`transportation_name`, from **z13**) | `#8A97AB`, halo `#0B1320` 1.5 | 6.29 |
| place labels | `#A9B4C4`, halo 1.5, Noto Sans Regular/Bold | 8.87 |
| water labels | `#5F87A3`, halo 1.5, Noto Sans Italic | 4.86 |
| highway shields, airport labels | `visibility: none` (bright shields clash at night) | — |

**Generator — `tools/make-style.mjs`** + **`tools/validate-style.mjs`** (Node ≥ 22; full files, byte-identical, in `docs/demo-prompt/03-tools/tools/` (next to this file, like `05-code/`) — copy them, don't retype). [Verified: ran 2026-10-16 on a 56-layer Positron copy (the one bundled in the npm package `@osm-editor-kit/osm-maplibre@0.1.0-alpha.0`, because the sandbox can't reach tiles.openfreemap.org); output validated with `@maplibre/maplibre-gl-style-spec@26.2.1` (the version MapLibre RN 11.5.0 depends on) `validateStyleMin` → 0 errors; two runs → identical SHA-256.] What `make-style.mjs` does, in order:
1. Reads `vendor/positron.json`, replaces `__TILEJSON_DOMAIN__` with `tiles.openfreemap.org`, keeps **only** the `openmaptiles` vector source (drops the `ne2_shaded` raster) and every layer on it plus `background`.
2. Recolors by `source-layer` + `type` with exactly the table above (`C = { bg:'#0B1320', res:'#0F1A2B', park:'#0F1F24', water:'#0F2236', waterway:'#1E4A63', building:'#121C2E', minor:'#1A2638', major:'#24344D', motorway:'#31445F', casing:'#0B1320', rail:'#1A2436', boundary:'#2A3A55', lroad:'#8A97AB', lplace:'#A9B4C4', lwater:'#5F87A3' }`); road lines pick casing/motorway/major/rail/minor from the layer id; building outlines removed.
3. Symbol layers: text colors per table, halo `#0B1320` 1.5, `text-font` forced to `Noto Sans Regular|Bold|Italic`; shields and airport labels `visibility: none`; road labels `minzoom ≥ 13`.
4. Inserts an invisible `background` layer **`fordcast-anchor`** just below the first label layer — FordCast's own layers use `beforeId="fordcast-anchor"` so place labels stay on top of creeks and routes (04 §17.6).
5. Writes deterministic JSON (`version 8`, `name "FordCast Night"`, original `sprite` + `glyphs`). `validate-style.mjs` exits non-zero on any style-spec error or any non-Noto `text-font`.

Run on the Mac:
```bash
cd tools && npm install && mkdir -p vendor && curl -fsSL https://tiles.openfreemap.org/styles/positron -o vendor/positron.json
npm run style          # = node make-style.mjs vendor/positron.json > ../mobile/assets/map/fordcast-night.json && node validate-style.mjs …
```
- The style is **bundled** (`mapStyle={require('@/assets/map/fordcast-night.json')}`; `Map.mapStyle: string | StyleSpecification` [Verified: pkg MLRN 11.5.0 `Map.d.ts`]); only tiles and glyphs come from the network. If the downloaded JSON has no `openmaptiles` source or no `glyphs` URL on `tiles.openfreemap.org`, download `styles/positron/style.json` from the `hyperknot/openfreemap-styles` GitHub repo instead (it uses the `__TILEJSON_DOMAIN__` placeholder the script replaces).
- **Style failure fallback** (no network on first launch, bad JSON): render `<Layer type="background" paint={{ 'background-color': '#0B1320' }}>` + FordCast's own GeoJSON layers only, plus a small banner `errors.map_details` "Map details unavailable" / "Detalles del mapa no disponibles" (04 §18.22). Crossings, creeks and states still work.

**FordCast overlay layers** (drawn above the basemap, below `fordcast-anchor` labels; code and order in 04 §17.6):

| Overlay | Visual spec |
|---|---|
| Creeks — calm | `#2BD9D9` @ 0.50, width interpolate z10 1.5 → z15 3 pt, round caps, no casing |
| Creeks — active (upstream of a WATCH/AVOID/CLOSED crossing) | `#2BD9D9` @ 1.0 + glow (same line, width + 7, opacity 0.30, `line-blur` 6) |
| Water pulse (signature) | `line-gradient` on a `lineMetrics: true` source: dim `rgba(43,217,217,0.18)` → head `rgba(43,217,217,1)` (head length 12 % of the reach), width 6, `line-blur` 1; + **wavefront dot** 10 pt cyan, 2 pt `#0B1320` ring, 18 pt glow @ 0.35 riding the head; ≤ 3 reaches at once |
| Reduced-motion flow arrows | `ic-flow-arrow` sprite on a `symbol` layer, `symbol-placement: 'line'`, `symbol-spacing: 120`, active creeks only, instead of the pulse |
| Gauge dot | circle 4 pt radius `#2BD9D9` + 2 pt `#0B1320` stroke; **silent/stale** → `ic-gauge-silent` sprite (dashed slate ring); selected → radius 6 + 2 pt `#F2F5FA` stroke |
| Gauge ripple (calm only) | one circle layer `gauges-ripple`: radius 4 → 14, opacity 0.35 → 0, every 12 s (§12.6) |
| Crossing markers | sprites from §14.3 on one `symbol` layer; `icon-size` interpolate z11 0.55 → z16 1.0; `symbol-sort-key` = rank (worse draws on top); `icon-allow-overlap: true` |
| Clusters (z ≤ 12) | circle colored by **max rank inside** (`clusterProperties: { maxRank: ['max', ['get','rank']] }`): no_rise/unknown → `#1C2940` + 2 pt `#8A97AB`/`#7A879C` stroke + white count; watch → `#F5A623` + ink count; avoid/closed → `#C62828` + 2 pt white stroke + white count. Radius 16/20/24 by count (< 10 / < 30 / ≥ 30). **A cluster never hides danger.** |
| Selected crossing | circle radius 24, no fill, 3 pt `#F2F5FA` stroke + name label (Noto Sans Bold 13, `#F2F5FA`, halo 1.5) |
| Halos | WATCH amber @ 0.20 static; AVOID: RN `Marker` + `PulseRing` (≤ 20 in viewport) 3 pulses then static @ 0.25 |
| Water reached the road (player) | circle radius 5 `#FFFFFF` + 2 pt `#2BD9D9` stroke at the crossing, from the truth onset (05 §26.3) |
| Route | `#5AA9FF` 6 pt (z-interp 4 → 10) + `#0B1320` casing 9 pt (7 → 15); round joins |
| Route ghost (when a detour exists) | `#5AA9FF` @ 0.35 |
| Blocked segment (± 300 m around AVOID/CLOSED on route) | `#FF5470` 5 pt, dash `[1, 1.5]` |
| Detour | `#5AA9FF` @ 1.0 6 pt + casing; "Detour +N min" pill = `Marker` view at the midpoint (`surface1` pill, `label.lg`) |
| Car / user position | `#5AA9FF` 14 pt dot, 3 pt `#F2F5FA` ring, heading cone `#5AA9FF` @ 0.25 (the simulated position; 05 §25.4) |
| Attribution | MapLibre `attribution` on, `attributionPosition` bottom-left 8 pt **above the card** (computed); `logo={false}`, `compass={false}` |
| **Never drawn** | NWS polygons (real or fake), radar, agency logos (01 §1.5 rule 3) |

### 13.9 Typography

- **Font:** Inter 4 via `@expo-google-fonts/inter@0.4.2`, weights **400, 500, 600, 700** only, embedded with the `expo-font` config plugin (02 §9.4 already lists the four TTF paths) **and** loaded with `useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold })` in the root layout while the splash holds (hide after fonts load or 2,000 ms, whichever first).
- **One family name per weight** (`Inter_600SemiBold` …); never set `fontWeight` on Inter text.
- **Tabular numerals on every number** (`fontVariant: ['tabular-nums']`): stages, windows, times, distances, counts, the storm clock. Inter supports `tnum`; a "Font probe" Jest snapshot + a device check confirm "1111" and "8888" render equal widths.
- Map labels: Noto Sans (§13.8). System components (tab bar, SwiftUI Form, alerts, notifications) keep SF Pro.

**Type scale** (sizes/lines in pt; tracking in pt; `cap` = `maxFontSizeMultiplier`, "—" = never capped). Body, headlines, status words, windows, list rows and button labels are **never capped** (they must reach AX5); only HUD numerals, chips, map-adjacent pills and the scrubber clock are capped, and each capped control shows the **Large Content Viewer** (§13.9 rule 3).

| Token | Size / line | Family | Tracking | Cap | Use |
|---|---|---|---|---|---|
| `display.xl` | 56 / 60 | Inter_700Bold, tnum | −1.25 | 1.3 | Drive HUD window "15–30" |
| `display.lg` | 44 / 48 (T: 56 / 60) | Inter_700Bold, tnum | −0.98 | 1.3 | results count-up "30" |
| `display.md` | 34 / 40 | Inter_700Bold | −0.74 | — | splash wordmark, large titles drawn in RN |
| `title.lg` | 28 / 34 | Inter_600SemiBold | −0.59 | — | crossing name in the sheet |
| `title.md` | 22 / 28 | Inter_600SemiBold | −0.40 | — | section titles; long crossing names (> 2 lines at 28) |
| `title.sm` | 20 / 25 | Inter_600SemiBold, tnum | −0.33 | 1.5 (clock only) | card titles, storm clock |
| `headline` | 17 / 22 | Inter_600SemiBold | −0.22 | — | row titles, area headline |
| `body.lg` | 17 / 24 | Inter_400Regular | −0.22 | — | reading text |
| `body.md` | 15 / 21 | Inter_400Regular | −0.13 | — | supporting text, reasons |
| `callout` | 16 / 21 | Inter_500Medium | −0.18 | 1.3 (accessory only) | list subtitles, accessory |
| `label.lg` | 15 / 20 | Inter_600SemiBold | −0.13 | 1.3 (pills on glass only) | buttons, pills |
| `label.chip` | 13 / 16 | Inter_700Bold, UPPERCASE | +0.6 | 2.0 (wraps, never clips) | status chips, DEMO/SIMULATED chips, banner title |
| `status.word` | 18 / 24 | Inter_600SemiBold | −0.25 | — | colored status text beside a chip |
| `caption` | 13 / 18 | Inter_400Regular | −0.04 | — | meta lines, footers |
| `caption.sm` | 12 / 16 | Inter_500Medium | 0 | 1.5 | chart axes only (non-essential) |
| `num.xl` | 40 / 44 | Inter_600SemiBold, tnum | −0.89 | 1.4 | crossing-sheet window "15–30 min" |
| `num.lg` | 28 / 32 | Inter_600SemiBold, tnum | −0.59 | 1.5 | stage "6.8 ft" |
| `num.md` | 17 / 22 | Inter_600SemiBold, tnum | −0.22 | — | distances, rates in rows |
| `num.sm` | 13 / 16 | Inter_500Medium, tnum | −0.04 | 1.5 | ticks, axis values |
| `drive.primary` | 32 / 38 | Inter_700Bold | −0.6 | 1.3 | Drive HUD state word |
| `drive.secondary` | 24 / 30 | Inter_600SemiBold | −0.4 | 1.3 | Drive HUD name/distance |

**Rules:**
1. Essential information ≥ 15 pt; nothing below 12 pt; colored status text ≥ 18 pt semibold; ranges use an en dash U+2013 ("15–30 min"); **never** `adjustsFontSizeToFit` on any text (stack or wrap instead).
2. ≤ 3 type sizes per card and ≤ 2 weights per card; UPPERCASE only in chips (+0.6 tracking); 4 pt vertical rhythm (title → subtitle 4, block → block 12, section → section 24, card padding 16).
3. **Large Content Viewer** on every capped or icon-only control: `accessibilityShowsLargeContentViewer` + `accessibilityLargeContentTitle` [Verified: pkg react-native@0.86.3 `ViewAccessibility.d.ts`].
4. `AppText` is the only text component (ESLint `no-restricted-imports` for `Text` from `react-native` outside `AppText` and RNR `text.tsx`):
```tsx
// mobile/src/components/fordcast/AppText.tsx (contract)
type Variant = 'display.xl'|'display.lg'|'display.md'|'title.lg'|'title.md'|'title.sm'|'headline'|'body.lg'|'body.md'|'callout'
  |'label.lg'|'label.chip'|'status.word'|'caption'|'caption.sm'|'num.xl'|'num.lg'|'num.md'|'num.sm'|'drive.primary'|'drive.secondary';
type Props = TextProps & { variant?: Variant; tone?: 'primary'|'secondary'|'tertiary'|'onAccent'|'link'|'disabled';
  colorOverride?: string /* status components only */; capped?: boolean /* opt-in cap for pills/accessory */ };
// - Looks up {size, line, family, tracking, cap, tnum, upper} from TYPE[variant] (lib/theme.ts `type`).
// - Bold Text (A11yPrefs.boldText): one family step up (400→600, 500→600, 600→700).
// - accessibilityLanguage = i18n.language === 'es' ? 'es-US' : 'en-US'.
// - allowFontScaling always true; maxFontSizeMultiplier = cap ?? 0 (0 = no cap).
// - fontVariant ['tabular-nums'] when tnum; textTransform 'uppercase' for label.chip. No raw fontSize prop (lint).
```
5. Dynamic Type tiers (exact RN `fontScale` multipliers: XXXL 1.353 · AX1 1.786 · AX2 2.143 · AX3 2.643 · AX4 3.143 · AX5 3.571 [Verified: pkg react-native@0.86.3 `RCTAccessibilityManager.mm`]) drive layout changes T0–T3 (04 §19.6). Bold Text, Increase Contrast and Reduce Transparency are read live (§15.3).

### 13.10 Spacing, radii, elevation, glass, hit sizes

```ts
export const space = { 0: 0, 0.5: 2, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 } as const;
export const radii = { xs: 6, sm: 10, md: 14, lg: 20, xl: 24, pill: 999 } as const;     // iOS sheets: system radius (never set)
export const hit = { min: 48, system: 44, drive: 76, driveGrow: 96, gap: 8, driveGap: 24 } as const;
```
- **Radii:** `xs 6` chips/micro-labels · `sm 10` inputs · `md 14` tiles, SimulatedBanner · `lg 20` cards, banners · `xl 24` AreaStatusCard, player transport panel, Drive HUD card, dialogs · `pill` buttons, FreshnessPill, chips · glass circles 22 (44 pt).
- **Elevation is lightness, not shadow** (canvas → surface1 → surface2 → surface3). Things floating **over the map** (AreaStatusCard, AlertBanner, transport panel) add `boxShadow: '0 8px 24px rgba(0,0,0,0.35)'` + a 1 pt top highlight `rgba(255,255,255,0.06)` [RN 0.86 `boxShadow` style; VERIFY BEFORE USE on device, fallback `shadowColor #000 / shadowOpacity 0.35 / shadowRadius 12 / shadowOffset {0, 8}`]. Glass surfaces get their depth from the system; never add a shadow to `GlassView`.
- **Map edge fades** (cinematic, keeps chrome legible over any tile): `expo-linear-gradient` top `#0B1320` @ 0.55 → 0 over `safeTop + 72` pt behind the top band; bottom 0 → @ 0.45 over 160 pt behind the card. `pointerEvents="none"`.

### 13.11 `mobile/src/lib/theme.ts` — exact content (Demo Edition)

Create verbatim. You MAY add tokens; you MUST NOT change values without updating `global.css` and this § in the same commit.
```ts
// mobile/src/lib/theme.ts — FordCast Demo Edition tokens (dark only, iOS only). Mirrors src/global.css. Parity-tested.
import type { Wire } from '@/demo/engine/types';     // 'no_rise' | 'watch' | 'avoid' | 'closed' | 'unknown' (05 §22.2)
export { RANK } from '@/demo/engine/types';          // the ONE rank table (05 §22.2); never redefine it here

export const palette = {
  navy950: '#070D18', navy900: '#0B1320', navy850: '#0E1726', navy800: '#152033', navy750: '#1C2940', navy700: '#24344F',
  navy600: '#2A3A55', navy550: '#3A4D6E', slate500: '#6B7890', slate450: '#7A879C', slate400: '#8A97AB', slate300: '#B4BFD0',
  white: '#FFFFFF', ice: '#F2F5FA', iceDim: '#E6EBF2', amber500: '#F5A623', red700: '#B71C1C', red600: '#C62828',
  red400: '#FF5470', red300: '#FF8095', cyan400: '#2BD9D9', blue400: '#5AA9FF', blue300: '#6CB4FF', violet300: '#B69CFF',
} as const;
export type StatusTokens = { fg: string; fill: string; ink: string; border: string; halo: string; dashed: boolean };
const status: Record<Wire, StatusTokens> = {
  no_rise: { fg: palette.slate400, fill: 'transparent', ink: palette.slate400, border: palette.slate400, halo: 'transparent', dashed: false },
  watch:   { fg: palette.amber500, fill: palette.amber500, ink: palette.navy850, border: palette.amber500, halo: 'rgba(245,166,35,0.20)', dashed: false },
  avoid:   { fg: palette.red400, fill: palette.red600, ink: palette.white, border: palette.red400, halo: 'rgba(255,84,112,0.25)', dashed: false },
  closed:  { fg: palette.red400, fill: palette.red600, ink: palette.white, border: palette.red400, halo: 'transparent', dashed: false },
  unknown: { fg: palette.slate400, fill: 'transparent', ink: palette.slate400, border: palette.slate450, halo: 'transparent', dashed: true },
};
export const dark = {
  name: 'dark' as 'dark' | 'darkHC' | 'drive',
  bg: palette.navy850, mapLand: palette.navy900,
  surface1: palette.navy800, surface2: palette.navy750, surface3: palette.navy700, scrim: 'rgba(5,9,16,0.60)',
  glass: { tint: 'rgba(14,23,38,0.55)', solid: palette.navy800 },
  text: { primary: palette.ice, secondary: palette.slate300, tertiary: palette.slate400, disabled: '#5B6880', onAccent: palette.navy850 },
  border: { subtle: palette.navy600, strong: palette.navy550, input: palette.slate500, focus: palette.blue300, width: 1 },
  action: { primaryBg: palette.ice, primaryFg: palette.navy850, secondaryBg: palette.navy750, secondaryFg: palette.ice },
  water: palette.cyan400, waterCalm: 'rgba(43,217,217,0.50)', route: palette.blue400, link: palette.blue300,
  sim: { fill: palette.violet300, ink: palette.navy850, mapWash: 'rgba(182,156,255,0.04)', track: palette.navy700, thumb: palette.ice },
  demoChip: { border: palette.slate400, text: palette.slate300 },
  status,
};
export type FordTheme = typeof dark;
export const darkHC: FordTheme = {
  ...dark, name: 'darkHC',
  text: { ...dark.text, tertiary: '#A9B4C6' },
  border: { ...dark.border, subtle: palette.slate500, strong: palette.slate400, width: 2 },
  status: { ...status,
    no_rise: { ...status.no_rise, fg: '#A9B4C6', ink: '#A9B4C6', border: '#A9B4C6' },
    avoid:   { ...status.avoid, fg: palette.red300, fill: palette.red700, border: palette.white },
    closed:  { ...status.closed, fg: palette.red300, fill: palette.red700, border: palette.white },
    unknown: { ...status.unknown, fg: '#A9B4C6', ink: '#A9B4C6', border: '#9AA6B8' } },
};
export const driveNight: FordTheme = { ...dark, name: 'drive', bg: palette.navy950, surface1: palette.navy850,
  text: { ...dark.text, primary: palette.iceDim } };
export const viz = {
  line: palette.cyan400, areaTop: 'rgba(43,217,217,0.12)', areaBottom: 'rgba(43,217,217,0)', trigger: palette.amber500,
  watchLevel: palette.slate400, grid: palette.navy600, axis: palette.slate400, nowRing: palette.ice, playhead: palette.violet300,
  gap: 'rgba(122,135,156,0.35)', ringTrack: palette.navy700,
} as const;
export const mapTokens = {
  land: palette.navy900, creekCalm: 'rgba(43,217,217,0.50)', creekActive: palette.cyan400, creekGlow: 'rgba(43,217,217,0.30)',
  pulseDim: 'rgba(43,217,217,0.18)', pulseHot: 'rgba(43,217,217,1)', gauge: palette.cyan400, gaugeStroke: palette.navy900,
  route: palette.blue400, routeCasing: palette.navy900, routeGhost: 'rgba(90,169,255,0.35)', blocked: palette.red400,
  car: palette.blue400, carRing: palette.ice, selectedRing: palette.ice, label: '#A9B4C4', labelHalo: palette.navy900,
  cluster: { no_rise: palette.navy750, unknown: palette.navy750, watch: palette.amber500, avoid: palette.red600, closed: palette.red600 },
  fontRegular: ['Noto Sans Regular'], fontBold: ['Noto Sans Bold'], fontItalic: ['Noto Sans Italic'],
} as const;
export const space = { 0: 0, 0.5: 2, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 } as const;
export const radii = { xs: 6, sm: 10, md: 14, lg: 20, xl: 24, pill: 999 } as const;
export const hit = { min: 48, system: 44, drive: 76, driveGrow: 96, gap: 8, driveGap: 24 } as const;
export const elevation = { float: '0 8px 24px rgba(0,0,0,0.35)', topHighlight: 'rgba(255,255,255,0.06)' } as const;
export const theme = dark;            // static default for non-React code; components use useTheme()
```
- `useTheme()` (`src/lib/useTheme.ts`): returns `driveNight` inside `drive-mode`, else `darkHC` when Increase Contrast (OS or app setting) is on, else `dark`.
- **SwiftUI no-green rule:** every `@expo/ui` `Form` gets `modifiers={[tint('#6CB4FF'), scrollContentBackground('hidden')]}` and rows `listRowBackground('#152033')` [Verified: modifier names in pkg @expo/ui@57.0.25 `swift-ui/modifiers/index.d.ts`; that `tint` recolors the `Toggle` track is standard SwiftUI but **VERIFY BEFORE USE** in the first build — fallback: `Toggle` per-row `tint`].
- `src/global.css` + `tailwind.config.js` colors: copy the dark block and the Tailwind color map **verbatim from `docs/master-prompt/02-B1-design-system.md` §9.12**, with these Demo Edition deltas: (1) rename `--replay` → `--sim` (same HSL `255.8 100.0% 80.6%`) and the Tailwind key `replay` → `sim`; (2) delete the commented LIGHT block and the `sheet: '28px'` radius; (3) `:root, .dark:root` both hold the dark values and the root layout calls NativeWind `colorScheme.set('dark')` once.

### 13.12 Token tests & Done when (§13)
- `mobile/src/__tests__/tokens-parity-test.ts` (all tests live in `mobile/src/__tests__/`, 01 §5): B1 §9.13's test with `--replay` → `--sim` and the light/android keys removed; maps every CSS variable to its `theme.ts` value and compares hex.
- `contrast-test.ts`: WCAG ratio for every row of §13.2/§13.3 with its minimum (4.5 text, 3.0 large/non-text).
- `no-green-test.ts`: scans `theme.ts`, `global.css` triplets, `assets/**/*.svg` and `tools/make-markers.mjs` color constants; fails on hue 75°–165° with saturation > 25 %.
- Grep gate: `grep -rnE "#[0-9A-Fa-f]{6}" mobile/src --include=*.tsx | grep -v -e theme.ts -e illustrations/` returns nothing.
- **Done when:** the three tests pass in CI; `tools/make-style.mjs` output validates (`node validate-style.mjs` → `OK`) and is committed as `mobile/assets/map/fordcast-night.json`; the map on the device shows dark land, receding roads, readable Noto labels from z13 and no highway shields.

---
## §14. Iconography (SF Symbols) & status glyphs

### 14.1 SF Symbols (system icons) — names verified

Rendered with `expo-symbols@57.0.3` `SymbolView` (`name`, `type: 'monochrome' | 'hierarchical' | 'palette' | 'multicolor'`, `weight`, `scale`, `size`, `tintColor`, `colors`, `animationSpec { effect: { type: 'bounce' | 'pulse' | 'scale' }, repeating, repeatCount, speed, variableAnimationSpec }`) or, inside SwiftUI, `@expo/ui` `Image systemName` + `symbolEffect` [Verified: research-ui §3.4]. **Every name below exists in `sf-symbols-typescript@2.2.0`** (the type list `expo-symbols` uses); the column shows the SF Symbols release that introduced it [Verified: grep of `dist/index.d.ts`, 2026-10-16]. All are ≤ SF 5.0 (iOS 17) except the two marked SF 6.0 (iOS 18), which have a listed fallback.

| Concept | Symbol (SF ver.) | Size · weight · mode | Effect (never under Reduce Motion) |
|---|---|---|---|
| Tabs | `map`/`map.fill` (1.0) · `car` (1.1)/`car.fill` (1.0) · `cloud.bolt.rain`/`.fill` (1.0) · `bell`/`bell.fill` (1.0) | system | system |
| Settings · legend · search · list · locate | `gearshape.fill` (2.0) · `questionmark.circle` (1.0) · `magnifyingglass` (1.0) · `list.bullet` (1.0) · `location.fill` (1.0) | 20 · semibold · monochrome `#F2F5FA` | none |
| Close · chevron · more | `xmark` (1.0) · `chevron.right` / `chevron.down` (1.0) · `ellipsis` / `ellipsis.circle` (1.0) | 17–20 · semibold | none |
| Notify me (off → on) · stop alerts | `bell` → `bell.fill` (1.0) · `bell.slash.fill` (1.0) | 20 | `bounce` once on turning on |
| Saved | `bookmark` / `bookmark.fill` (1.0) | 20 | none |
| Notification primer hero | `bell.and.waves.left.and.right.fill` (4.0) | 64 (C 48, T 72) · hierarchical `#F2F5FA` | variableColor iterative, 2 cycles |
| Detour | `arrow.triangle.branch` (2.0) | 17 in buttons | `bounce` once when the detour line finishes drawing |
| Route · turn around | `point.topleft.down.to.point.bottomright.curvepath` (5.0) · `arrow.uturn.backward` (2.0) | 17 | none |
| Drive Mode | `steeringwheel` (4.1) | 17 in buttons, 28 in the Drive tab hero button | none |
| Repeat · mute | `speaker.wave.2.fill` (2.0) · `speaker.slash.fill` (1.0) | 24 in Drive Mode | variableColor iterative **while TTS speaks** |
| Player transport | `play.fill` · `pause.fill` · `backward.fill` · `forward.fill` (1.0) · `gobackward.5` / `goforward.5` (3.0) | 22 (play 28) | none |
| Places | `house.fill` (1.0) · `graduationcap.fill` (2.0) · `location.circle.fill` (1.0) for "Demo location" | 17 in chips | none |
| Gauge · water · rising | `gauge.with.needle` (5.0) · `sensor.fill` (4.0) · `water.waves` (4.0) · `water.waves.and.arrow.up` (4.0) | 17–20 | `bounce` once on the "Why this alert?" reason when it first appears |
| Rain (storm cards, visual only) | `cloud.heavyrain.fill` (1.0) | 20 · hierarchical `#B4BFD0` | none |
| Official source | `shield.lefthalf.filled` (3.0) | 14 | none |
| Offline · unknown (system contexts) | `wifi.slash` (1.0) · `questionmark.circle.dashed` (**6.0**, fallback `questionmark.circle`) | 17 | none |
| Demo Director · What's real · pledge | `slider.horizontal.3` (1.0) · `checklist` (3.0) · `hand.raised.fill` (1.0) | 20 | none |
| Language · accessibility · text size · haptics | `globe` (1.0) · `accessibility` (5.0) · `textformat.size` (1.0) · `hand.tap.fill` (2.0) | Form rows (system) | none |
| Info · credits · legal | `info.circle` (1.0) · `doc.text` (1.0) · `book.closed` (2.0) | Form rows | none |
| Crew list ("Likely to flood next") | `list.bullet.rectangle.fill` (3.0) | 20 | none |
| Checkbox check (pledge) | `checkmark` (1.0) | 15 · bold · ink `#0E1726` on an ice box — **never green, never on a crossing** | none |
| Live Activity only ([NEXT], §18.21) | `exclamationmark.triangle.fill` · `exclamationmark.octagon.fill` · `xmark.octagon.fill` · `questionmark.circle` (1.0) | system | none |
| Rising water, iOS 18+ variant | `water.waves.and.arrow.trianglehead.up` (**6.0**, fallback `water.waves.and.arrow.up`) | 20 | `bounce` once |

Rules: 20 pt in buttons, 24 pt in rows; inactive `#B4BFD0`, active `#F2F5FA`; **status is never drawn with SF Symbols inside the app** — only `StatusGlyph` (§14.2). No lucide icons ship (RNR files that import lucide are not copied, 04 §16.3). Symbol effects play once per real event and never under Reduce Motion (`useMotionOK()`, §15.3).

### 14.2 `StatusGlyph` and `StatusChip` (custom, identical everywhere)

`mobile/src/components/fordcast/StatusGlyph.tsx` draws the five sign shapes with `react-native-svg` in a `viewBox="0 0 24 24"` at 16/20/24/28/32/40/44 pt, colors from `theme.status[state]`. **The geometry is the single source shared with the map sprites**: copy the path constants from `tools/make-markers.mjs` (§14.3) into `src/components/fordcast/glyph-geometry.ts` and import them in both places' tests (a Jest test asserts the strings are identical).

| State | Geometry (24-unit grid) |
|---|---|
| `no_rise` | `<Circle cx=12 cy=12 r=8 fill="none" stroke=fg strokeWidth=2.5/>` (no glyph) |
| `watch` | rounded triangle `M12 3.2 L21.4 19.6 L2.6 19.6 Z` (fill + stroke in amber, `strokeWidth 2.4`, round join) + ink "!" (`M12 9.2 V13.6`, w 2.4, round cap; dot `cy 16.6 r 1.35`) |
| `avoid` | regular octagon `OCT = 21.70,16.02 16.02,21.70 7.98,21.70 2.30,16.02 2.30,7.98 7.98,2.30 16.02,2.30 21.70,7.98` fill `#C62828`, rim: 1 pt `#FF5470` on surfaces / 2 white on the map; white "!" (`M12 6.8 V13.2` w 2.6; dot `cy 16.9 r 1.5`) |
| `closed` | `OCT` + three white 45° stripes `M0 15.5 L15.5 0 M2 22 L22 2 M8.5 24 L24 8.5` (w 2.6) clipped to `OCT` (unique `ClipPath id` per instance via `useId()`); no "!" ; `official` adds the 14 pt shield badge top-right |
| `unknown` | dashed ring `r 8.5` w 2 `strokeDasharray="3 3"` + "?" path `M9.6 9.4 a2.5 2.5 0 1 1 3.6 2.2 c-0.8 0.4 -1.2 0.9 -1.2 1.8 v0.5` + dot `cy 16.6 r 1.2`; `lastKnown` adds a 12 pt badge of the old state's shape inside a 17 pt dashed rounded frame, top-right |

`StatusChip` (`src/components/fordcast/StatusChip.tsx`): sizes `sm` 24 / `md` 28 / `lg` 36 pt tall, radius 6 (sm) / 8 (md, lg), horizontal padding 8/10/12, glyph 14/16/20 + 6 gap + `label.chip` (13 pt Bold caps +0.6; cap 2.0, **wraps to 2 lines, never clips**).
- `watch`: amber fill, ink text + ink glyph. `avoid`/`closed`: red fill, white text, 1 pt `#FF5470` rim; `closed` adds a stripe texture behind the text (white @ 0.25, 6 pt pitch, SVG pattern) and `· OFFICIAL` + shield when the source is official. `no_rise`: 1.5 pt slate outline, slate text, no fill. `unknown`: 1.5 pt **dashed** outline (SVG `Rect strokeDasharray="3 3"`), slate text.
- Measured chip widths at `md` (glyph 16 + 6 + text + 20 padding): NO RISE 98 · WATCH 96 · AVOID 88 · CLOSED 98 · UNKNOWN 118 · CLOSED · OFFICIAL + shield 193 pt; ES SIN CRECIDA 132 · PRECAUCIÓN 135 · EVITE 83 · CERRADO 110 · DESCONOCIDO 147 · CERRADO · OFICIAL + shield 196 pt [Verified: calc with Inter metrics via `tools/measure-text.mjs`, 04 §19.3]. The widest chip leaves ≥ 115 pt for the name column in a 311 pt row.
- A11y: `accessibilityRole="text"`, label from `state.<s>.spoken_short` (+ ", official" / ", oficial"); never pressable on its own.
- On a pressed/selected row (`surface3`), the chip keeps its own fill/outline; colored status text is never placed on `surface3` (contrast, §13.2).

### 14.3 Map marker sprites — canonical list and generator [MUST-SHOW]

**Folder** `mobile/assets/map/markers/`; each sprite at `<name>@2x.png` (96 px) and `<name>@3x.png` (144 px) on a **48 pt** transparent canvas; Metro picks `@2x/@3x` from the base name [VERIFY BEFORE USE on device that MapLibre `Images` honors the scale suffix; fallback: ship only `@3x` and multiply `icon-size` by 1/3].

| Name | Content | Used when |
|---|---|---|
| `ic-norise` | slate ring, 14 pt (B1's 12 pt grew 2 pt: legible in 3× video captures) | `no_rise` |
| `ic-watch` | amber rounded triangle 28 pt + 1.5 pt `#0B1320` outline | `watch` |
| `ic-avoid` | red octagon 32 pt + 2 pt white rim | `avoid` |
| `ic-closed` | striped octagon 32 pt + 2 pt white rim | `closed` (sensor) |
| `ic-closed-official` | `ic-closed` + 14 pt ice shield badge (1 pt `#0B1320` outline) top-right | `closed`, official source ("Simulated road crew") |
| `ic-unknown` | dashed ring + "?", 24 pt, dark fill @ 0.55 | `unknown` (offline, silent, not monitored) |
| `ic-unknown-lastwatch` / `-lastavoid` / `-lastclosed` | `ic-unknown` + 12 pt badge of the last-known shape in a dashed frame, top-right | `unknown` with `lastKnown` ≥ watch |
| `ic-flow-arrow` | 12 pt cyan chevron pointing downstream | Reduce Motion creek arrows |
| `ic-gauge-silent` | 14 pt dashed slate ring on dark fill | a gauge whose newest delivered reading is > 30 min old or inside a silent span (05 §26.5) |

Sprite choice: `closed` + official → `ic-closed-official`; `unknown` + `lastKnown` in {watch, avoid, closed} → `ic-unknown-last<state>`; otherwise `ic-` + `{no_rise:'norise', watch:'watch', avoid:'avoid', closed:'closed', unknown:'unknown'}[state]`. `src/components/fordcast/map/sprites.ts` exports `SPRITES: Record<SpriteName, number>` built from **static** `require('@/assets/map/markers/<name>.png')` calls (one literal per name) and registers them once with `<Images images={SPRITES} />` (`ImageEntry = string | ImageRequireSource | { source, sdf }` [Verified: pkg MLRN 11.5.0 `Images.d.ts`]; pre-colored PNGs, **not** SDF, so stripes and rims survive).

**Generator — `tools/make-markers.mjs`** (full file, byte-identical, in `docs/demo-prompt/03-tools/tools/` (next to this file, like `05-code/`); copy it) [Verified: ran 2026-10-16 with `@resvg/resvg-js@2.6.2` → 22 PNGs (11 sprites × @2x/@3x); contact sheet reviewed; two runs → identical SHA-256]. It builds each sprite as SVG from the §14.2 geometry (same path constants), places it on a 48 pt canvas, rasterizes at 96 px and 144 px, and writes `tools/out/markers-contact-sheet.png` for review (never bundled). `@resvg/resvg-js` ships prebuilt binaries incl. `darwin-arm64`/`darwin-x64`, so no system libraries are needed. Its exported `SPRITES` map is the canonical name list above.

`tools/package.json` (exact pins; run `npm install` once, then commit `package-lock.json`):
```json
{
  "name": "fordcast-tools", "private": true, "type": "module",
  "description": "Run-once Mac tools for the FordCast Demo Edition (never imported by the app).",
  "scripts": {
    "style": "node make-style.mjs vendor/positron.json > ../mobile/assets/map/fordcast-night.json && node validate-style.mjs ../mobile/assets/map/fordcast-night.json",
    "markers": "node make-markers.mjs --out ../mobile/assets/map/markers",
    "measure": "node measure-text.mjs"
  },
  "devDependencies": { "@expo-google-fonts/inter": "0.4.2", "@maplibre/maplibre-gl-style-spec": "26.2.1",
                       "@resvg/resvg-js": "2.6.2", "opentype.js": "1.3.4" }
}
```
If `tools/` already has a `package.json` (e.g. for `gen-golden.ts`, 01 §5), merge these `devDependencies` and scripts into it instead.

**Done when (§14.3):** `cd tools && npm run markers` writes 22 PNGs into `mobile/assets/map/markers/`; `tools/out/markers-contact-sheet.png` matches the shapes in §14.2 (review it); a second run produces no git diff; on the device every sprite is crisp at z11 and z16 and a cluster containing one AVOID renders red.

### 14.4 Brand glyphs and illustrations

- **Brand glyphs** (24-unit grid, 2 pt stroke, round joins; SVG in `src/components/fordcast/illustrations/`): `ford-dip` (road band dipping into a shallow V with a water line through the dip), `gauge-staff` (staff with 5 ticks + water line), `creek-flow` (S-curve with a downstream arrowhead), `barricade` (two legs + three stripes).
- **Style:** flat two-tone navy (`#152033` / `#24344F`) + **one** accent (cyan for water; amber/red only when demonstrating a state). No gradients except water. **No people in floodwater, no cars being swept away, no disaster photography.**
- **Skia scenes** (onboarding, How it works; specs in 04 §18.2, §18.18.5, motion in §15.4): `CreekToDip` (P1), `GaugeToCrossing` (P2 travel dot), `LegendPop` (P3), `HowItWorksDiagram` (5 steps). Static frames under Reduce Motion; hidden at Dynamic Type T2+.

### 14.5 App icon, splash and the notification look [MUST-SHOW]

**App icon "The Dip"** — Icon Composer `.icon` (the SDK 57 template already wires `ios.icon: './assets/expo.icon'` [Verified: pkg expo-template-default@57.0.32 `app.json`]; 02 §9.4 keeps that path). The student builds it in **Icon Composer** on the Mac (Day 2 approval, 01 §6); the agent prepares the SVG layers:

| Layer group | Content | Icon Composer setting |
|---|---|---|
| Background (fill) | linear gradient `#0E1726` → `#16233A` (top → bottom) | `fill` gradient (replace the template's `automatic-gradient`) |
| 1 · road | off-white `#F2F5FA` road band dipping into a shallow V at the center | glass off |
| 2 · creek | cyan `#2BD9D9` S-curve from upper-left into the dip | **glass on** (translucency 0.5) |
| 3 · gauge dot | ice `#F2F5FA` dot with a 1.5 pt cyan ring, upstream on the creek | glass off |

Check the Default, Dark, Clear and Tinted appearances at 29 / 40 / 60 pt. **No red or amber in the icon** (it must never look like an alert); no text; no SF Symbols. Fallback if Icon Composer isn't available: a flattened 1024 × 1024 PNG at `assets/images/icon.png` (no transparency) and point `ios.icon` at it.

**Splash:** `expo-splash-screen` plugin `backgroundColor: '#0E1726'`, `image: './assets/images/splash-icon.png'` (1024 × 1024 transparent PNG of the Dip glyph with the cyan creek, **no wordmark**), `imageWidth: 76` (02 §9.4). The wordmark "FordCast" and the tagline render in the JS arrival overlay in Inter, so they localize (04 §20.1).

**Notifications:** iOS draws local notifications with the **app icon**; there is no separate small icon on iOS. Layout and content: 04 §18.20 and 05 §25.2.

### 14.6 Done when (§14)
- The dev icon sheet (`__DEV__` gallery page, 04 §17.1) renders every §14.1 symbol with no blank squares on the device; the two SF 6.0 symbols show their fallback on an iOS 17 Simulator.
- `glyph-geometry.ts` equality test passes (component and sprites share one geometry).
- Icon, splash and sprites contain no red/amber in the icon and no green anywhere (no-green test).

---

## §15. Motion, haptics & sound

### 15.1 Principles
1. **Cause → effect:** water moves → gauge crosses its trigger → crossing changes → card/banner appears. In the demo the AVOID happens when the upstream gauge crosses its trigger, **before** the water arrives (the pulse is animation only and never changes a state; 05 §26.3).
2. **Loop budget by state:** calm = {gauge ripple}; storm = {AVOID halo × 3 then static, water travel}. Never more than 2 loops on screen. The calm ripple stops at the first WATCH+.
3. **Loops stop** after 3 cycles or 6 s (WCAG 2.2.2) and settle into a static form; they restart only on a new state change.
4. **Nothing flashes** more than 3×/s (WCAG 2.3.1) — including the video.
5. **Reduce Motion never removes meaning:** every meaningful animation has a dissolve/highlight fallback; ongoing motion stops.
6. **States are step functions:** windows and states change once per 5-minute simulated tick (05 §22.10 `useTick`), never interpolated; only the storm clock, scrubber thumb and water pulse move continuously.

### 15.2 Motion tokens — `mobile/src/lib/motion.ts`
```ts
import { Easing, ReduceMotion } from 'react-native-reanimated';
export const motion = {
  duration: { xs: 100, sm: 160, md: 240, lg: 360, xl: 520, ring: 700, ripple: 900, travelMin: 1600, travelMax: 4000,
              pulse: 2000, breathe: 3000, countUp: 900, detentCamera: 600 },
  easing: {
    standard: Easing.bezier(0.2, 0, 0, 1), decelerate: Easing.bezier(0.05, 0.7, 0.1, 1),
    accelerate: Easing.bezier(0.3, 0, 0.8, 0.15), linear: Easing.linear, countUp: Easing.out(Easing.cubic),
  },
  // Reanimated 4 withSpring perceptual form {duration, dampingRatio} [Verified: pkg react-native-reanimated@4.5.1 springConfigs.d.ts]
  spring: {
    press:  { duration: 180, dampingRatio: 1,    reduceMotion: ReduceMotion.System },
    snappy: { duration: 300, dampingRatio: 0.92, overshootClamping: true, reduceMotion: ReduceMotion.System },
    sheet:  { duration: 420, dampingRatio: 0.9,  reduceMotion: ReduceMotion.System },
    pop:    { duration: 380, dampingRatio: 0.6,  reduceMotion: ReduceMotion.System },
    gentle: { duration: 550, dampingRatio: 1,    reduceMotion: ReduceMotion.System },
  },
  stagger: { sheet: 40, half: 60, hud: 60, legend: 80 },
  loop: { maxCycles: 3, maxMs: 6000 },
} as const;
export function useMotionOK(): boolean;   // !a11y.reduceMotion && settings.animations !== 'reduced'
```
Easing curves are design intent [Unverified on device feel] — tune by eye on the iPhone, never by changing durations above 520 ms for UI transitions.

### 15.3 Reduce Motion, Reduce Transparency, cross-fade, Bold Text
- **Source of truth:** the A11y provider (05 §27.1; full-build D2 §34.1 verbatim) subscribes to `AccessibilityInfo` change events and re-reads on `AppState 'active'`. Reanimated's `useReducedMotion()` only reports the launch value — **never** use it for live decisions. Root layout renders `<ReducedMotionConfig mode={reduce ? ReduceMotion.Always : ReduceMotion.Never} />` [Verified export: pkg react-native-reanimated@4.5.1].
- `useMotionOK()` gates: creek pulse, halo loops, gauge ripple, count-up, splash creek draw, onboarding scenes, how-it-works travel dot, symbol effects.
- `prefersCrossFadeTransitions()` → sheet content swaps crossfade instead of rise; `isReduceTransparencyEnabled()` → solid chrome (§12.3); `isBoldTextEnabled()` → AppText weight bump; `isDarkerSystemColorsEnabled()` → `darkHC` [all Verified: pkg react-native@0.86.3 `AccessibilityInfo.d.ts`].
- Settings → Accessibility → **Animations: System · Full · Reduced** (default System).

### 15.4 Animation catalog (exact values; frame-by-frame signature moments in 04 §20)

| # | Interaction | Animation | Timing | Reduce Motion |
|---|---|---|---|---|
| A1 | Button press (RN buttons) | scale 1 → 0.97 | `spring.press` | opacity 1 → 0.7 |
| A2 | Status chip changes state | crossfade word + color; scale 1 → 1.08 → 1 | 240 ms + `spring.pop` | 150 ms dissolve |
| A3 | Marker escalation (→ watch/avoid/closed) | sprite swap + scale 0.6 → 1.0 + one ripple ring 1 → 2.2×, opacity 0.5 → 0 | `spring.pop` + 900 ms decelerate | instant swap + static double ring for 6 s |
| A4 | AVOID halo | ring scale 1 → 1.8, opacity 0.35 → 0 | 2,000 ms × 3, then static 0.25 | static 0.25 |
| A5 | Water pulse (signature) | `line-gradient` head + wavefront dot along the reach, `p` from `pulseProgress()` (05 §26.2) | driven by the storm clock (30 fps cap) | static `ic-flow-arrow` + `travel.range` caption (player) |
| A6 | Active creek glow on | opacity 0 → 0.30 | 360 ms | instant |
| A7 | Hydrograph draw-on (first settle at half) | path trim 0 → 1; area 0 → 0.12 from +300; now-dot `spring.pop` at +700; rate badge rises 8 pt + fades at +800 | 700 ms `standard` | drawn, no trim |
| A8 | Hydrograph new sample (per tick) | last segment extends; y-rescale | 240 / 360 ms | instant |
| A9 | Trigger-crossing highlight | dashed amber line opacity 0.4 → 1 → 0.6 | 600 ms (once) | color step |
| A10 | RiskRing / RiskWindow | ring sweep, color slate → amber → red; bracket slides once per tick | 700 ms `spring.gentle` / 240 ms `standard` | instant |
| A11 | Number change (stage, counts, storm clock minutes) | vertical digit roll, 30 ms per-digit stagger; `tnum` | 240 ms | instant |
| A12 | Results count-up | 0 → X (X from `storyResults()`), then scale 1 → 1.06 → 1 | 900 ms `easing.countUp` + `spring.pop` | final number shown at once |
| A13 | AlertBanner enter | slide down 12 pt + fade; 4 pt left bar grows 0 → 100 % height; chip pops | 240 ms decelerate; bar 200 ms | fade 150 ms |
| A14 | AlertBanner → pill (C class, after 8 s) | `LinearTransition` | 300 ms | instant |
| A15 | Sheet content stagger (crossing peek) | chip 0 → title +40 → window +80 → meta +120 → actions +160 ms; each fades + rises 8 pt | 160 ms each | crossfade only |
| A16 | Half reveal | hydrograph, travel line, window, reasons at 60 ms steps | 160 ms each | crossfade |
| A17 | Splash arrival | creek trim 0 → 1 (600 ms) → wordmark rises 8 pt + fades (240 ms from 360) → tagline (from 480) → hold to 1,100 → overlay fades 300 ms while camera eases z 9.8 → 10.5 over 1,200 ms | see 04 §20.1 | static logo, 300 ms fade, no camera move |
| A18 | SimulatedBanner / pill enter | slide 8 pt + fade | 240 ms | fade |
| A19 | Accessory / ScenarioMiniBar enter | slide up 12 pt + fade (mini-bar); system animation (accessory) | 240 ms | fade |
| A20 | Map camera ease (fit crossing / route / detent change) | `Camera.easeTo` / `fitBounds` | 600 ms | `duration: 0` |
| A21 | Detour reveal | baseline draw-on 600 ms → blocked flash 0.4 → 1 (300 ms) → detour draw-on from +500 (600 ms) → pill `spring.pop` | see 04 §20.6 | all drawn at once |
| A22 | Drive Mode approach | edge glow fades in 200 ms then static; Detour 76 → 96 pt; ribbon hides | `spring.snappy` | instant size, glow appears |
| A23 | Drive Mode entry | fade through `#070D18`; HUD staggers in at 60 ms steps | 400 ms + 60 ms steps | fade |
| A24 | Card → nearby continuity | card follows a pan up to 24 pt, dims to 0.92, springs back as the native sheet rises | `spring.snappy` | no follow |
| A25 | Gauge ripple (calm only) | radius 4 → 14, opacity 0.35 → 0, every 12 s | 1,200 ms decelerate | none |
| A26 | Onboarding / How-it-works travel dot | 8 pt cyan dot travels gauge → crossing, glyph morphs ○ → ▲ → ◆ 300 ms apart | 2,400 ms | static frame |

**Implementation notes:** Reanimated 4 CSS animations (`animationName`, `animationDuration`, `animationIterationCount`, `animationTimingFunction` [Verified: pkg react-native-reanimated@4.5.1 `css/types/animation.d.ts`]) are fine for the halo; layout transitions use `LinearTransition`/`FadeIn`/`Keyframe` [Verified exports]. The water pulse updates a `line-gradient` paint prop at ≤ 30 fps from a JS ticker that reads the shared clock (05 §22.7) — one native style update per frame per reach, ≤ 3 reaches.

### 15.5 Haptics — semantic, two gates (code in `mobile/src/demo/voice/haptics.ts`, 05 §25.5)

`expo-haptics@57.0.3` offers `notificationAsync`, `impactAsync`, `selectionAsync` only (no custom patterns) [Verified]. Use **only** `safetyHaptic(cue)` and `uiHaptic(kind)` from 05's `voice/haptics.ts`; never call `expo-haptics` directly in components (lint).

| Event | Call | Paired with (never alone; haptics are invisible on video) |
|---|---|---|
| Crossing → WATCH (on screen, saved, on route, Drive Mode) | `safetyHaptic('watch')` → `notificationAsync(Warning)` | chip/marker change + VoiceOver announce; Drive Mode `chime_soft` + TTS |
| → AVOID / CLOSED | `safetyHaptic('avoid' \| 'closed')` → `notificationAsync(Error)` **once** | marker pop + halo + AlertBanner; Drive Mode `chime` + TTS + edge glow |
| → UNKNOWN | `safetyHaptic('unknown')` → `impactAsync(Soft)` | ring turns dashed; no sound |
| De-escalation | `safetyHaptic('deescalate')` → `impactAsync(Light)` — **never `Success`** | "Update" line; Drive Mode TTS "Update on…" |
| Sheet detent settles (`stable: true`) | `uiHaptic('select')` | — |
| Scrubber passes a 15-sim-min tick | `uiHaptic('select')` | time label |
| Water reached the road (player ●) | `uiHaptic('light')`; count-up end `uiHaptic('medium')` | tick drop, count-up |
| Notify me ON · detour line finished · pledge "I understand" | `uiHaptic('light')` | bell bounce / pill pop / button |
| Start Drive Mode · passenger hold completes | `uiHaptic('medium')` | fade / dialog closes |
| Pledge checkbox · segmented change · toggle | `uiHaptic('select')` | — |

**Gates (05 code):** safety cues ≤ 1 per 1.5 s; UI micro-haptics ≤ 1 per 60 ms and **muted for 400 ms after a safety cue** so a warning is never blurred; Settings/Director "Haptics" off disables both. `NotificationFeedbackType.Success` is banned (code guard, 01 §3.11).

### 15.6 Sound and voice

| Asset | Spec | Used for |
|---|---|---|
| `mobile/assets/sounds/chime.wav` | 0.5 s, two soft notes (descending minor third), 10 ms attack, natural decay, peak −3 dBFS, mono 44.1 kHz 16-bit — "alerting, not alarming": no siren, sweep or repeated beeps | before TTS for AVOID/CLOSED (Drive Mode; foreground escalations with Sounds on) |
| `mobile/assets/sounds/chime_soft.wav` | 0.3 s single soft note, peak −9 dBFS | before TTS for WATCH |

- Playback: `expo-audio` `setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' })` + `createAudioPlayer` (05 §25.5 `prepareVoice`). TTS: `expo-speech` with the best installed voice (`pickVoice()` prefers Enhanced), rate 0.95, `useApplicationAudioSession: true`.
- **Timing (one cue, never two):** WATCH chime_soft at 0 → TTS at **+450 ms**; AVOID/CLOSED chime at 0 → TTS at **+650 ms** (chime end + 150); de-escalation TTS at +300 ms, no chime. Never a sound for UNKNOWN or de-escalation; never a loop.
- Settings → Accessibility: **Haptics**, **Sounds**, **Spoken alerts** toggles + **Voice speed** slider 0.8–1.2 (default 0.95) + "Play a sample" ("This is how FordCast sounds." / "Así suena FordCast.").
- Make the WAVs in GarageBand/Audacity or use a CC0 sound; record source + license in `THIRD_PARTY_NOTICES.md` (VERIFY BEFORE USE the license text).

### 15.7 "Never one channel" matrix

| Event | Visual | Haptic | Audio | VoiceOver |
|---|---|---|---|---|
| → WATCH | amber triangle + "Watch" + chip pop | Warning | Drive Mode: chime_soft → TTS | announce once (subscribed/on-route crossings; 05 §27.2) |
| → AVOID | red octagon + halo × 3 + AlertBanner (persists) | Error | Drive Mode: chime → TTS | announce, high priority |
| → CLOSED | striped octagon (+ OFFICIAL shield) + banner | Error | chime → TTS "…is closed. Turn around. Don't drown." | announce, high |
| De-escalation | color step + "Update" line ("Water may still be on the road.") | Light | Drive Mode TTS "Update on…" | announce once, low |
| → UNKNOWN (gauge silent / offline) | dashed ring + "?" + "Last known" | Soft | none | announce once per crossing per scenario |
| Seek / scrub / Director actions | UI only | UI gate | none | **never announced** (presenter noise) |

### 15.8 Done when (§15)
- With Reduce Motion ON, a recording of the T03 storm shows no pulse or loops, yet every state change is visible (dissolve), static flow arrows + the travel-range caption appear, and the count-up shows its final number at once.
- The AVOID halo stops after 3 pulses (≈ 6 s) and holds a static ring.
- Two escalations within 1 s produce one haptic; a detent snap within 400 ms after an Error haptic produces none.
- `grep -rn "NotificationFeedbackType.Success" mobile/src` returns nothing; no component imports `expo-haptics` except `voice/haptics.ts`.
- In Drive Mode the chime precedes TTS by 650 ms (AVOID) / 450 ms (WATCH), measured on a screen recording's waveform (± 50 ms).
