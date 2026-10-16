# FordCast DEMO EDITION — Part 4: UI screens (§16–§20)

> Addressed to the AI coding agent (Claude Code). This file says **what to import, which components to build, what every screen looks like in every state, how it fits every iPhone, and how the signature moments play frame by frame**. Tokens, materials, glyphs and motion values come from `03-ui-design-system.md` (§12–§15); the data on screen comes from the demo engine (`05-demo-engine.md`, §21–§28); copy comes from the bank (01 §3.7) plus the chrome keys defined here.
>
> **Precedence:** 01 §3 (safety/copy) → 00 decision sheet → this file for layout/screens → research files → the full prompt (`docs/master-prompt/02-B1…`, `03-B2…`) only where a § below points to it.
>
> **Tags:** [MUST-SHOW] filmed · [SHOULD-SHOW] built, filmed ≤ 5 s if time · [BUILD-ONLY] must exist, not featured · [NEXT] not built ("Planned" row only) · [Verified: …] · [Unverified] · **VERIFY BEFORE USE:**.
>
> **Wireframe legend:** `○` no rise · `▲` watch · `◆` avoid (the red octagon) · `▧` closed (striped octagon) · `◌` unknown (dashed ring "?") · `●` water reached the road (simulated) · `▓` map · `~` creek · `·` gauge · `[ ]` button · `( )` chip · `┊DEMO┊` dashed demo chip · `▒SIM▒` violet simulated label · `⌂` home · `◉` simulated car. Frames are drawn at the **393 × 852 pt** reference (iPhone 16), ≈ 35 characters wide. **Every name, time, window and number in a wireframe is an example taken from the engine's verified output** (05 §22.6: hero crossing `atx-37` "Williamson Creek at Jones Road", Avoid 7:00 AM "15–30 min", water 7:30 AM, lead 30, median 30, closure gap 50); at runtime every value comes from `Compiled`/`displayAt()` — never typed (05 engine rule 3). Detour minutes are shown as `+N` because they come from the baked route durations (05 §21.5).

---

## §16. Template & component import plan

### 16.1 What we import (and what we deliberately don't)

| # | Source | License | What we take | Lands in |
|---|---|---|---|---|
| T1 | **Expo default template, SDK 57** (`create-expo-app … --template default@sdk-57` → `expo-template-default@57.0.32` [Verified: npm dist-tag `sdk-57`]) | 0BSD | `src/app` + Expo Router 57 layout, the **NativeTabs** pattern (`src/components/app-tabs.tsx`), the **`AnimatedSplashOverlay`** pattern (`src/components/animated-icon.tsx`: Reanimated `Keyframe` + `scheduleOnRN` from `react-native-worklets`), `assets/expo.icon` wiring, `tsconfig.json` alias `@/*` → `src/*`, typed routes | `mobile/` (scaffolded in 02 §9.2) |
| T2 | **React Native Reusables (NativeWind variant)** — registry files only | MIT | `components/ui/button.tsx`, `card.tsx`, `text.tsx` + `lib/utils.ts` (`cn`). **Not** `icon.tsx` (lucide) and **not** `toggle-group` by default (native segmented controls replace it, §16.3) | `mobile/src/components/ui/`, `mobile/src/lib/utils.ts` |
| T3 | **`@expo/ui` SwiftUI** (already in the template, `@expo/ui ~57.0.25`) | MIT | `Host`, `Form`, `Section`, `Toggle`, `Picker` (`pickerStyle('segmented' \| 'menu')`), `Slider`, `Button`, `LabeledContent`, `ContentUnavailableView`, `Menu`, modifiers `tint`, `listRowBackground`, `scrollContentBackground` [Verified: pkg @expo/ui@57.0.25 `swift-ui/index.d.ts`, `modifiers/index.d.ts`] | Settings, segmented controls, empty states |
| T4 | **expo-router 57 native APIs** | MIT | `NativeTabs` + `BottomAccessory`, `Stack.Protected`, `Link.Menu`/`Link.MenuAction`/`Link.Preview`/`Link.AppleZoom`, formSheet options [Verified: pkg expo-router@57.0.28 `native-tabs/*.d.ts`, `layouts/StackClient.d.ts`, `link/Link.d.ts`] | navigation, menus |
| T5 | **MapLibre RN 11.5.0** v11 API: `Map`, `Camera`, `GeoJSONSource`, `Layer` (style-spec `paint`/`layout`), `Images`, `Marker`, `ViewAnnotation` — there is **no** `MapView`, `ShapeSource`, `SymbolLayer` in v11 [Verified: pkg `lib/typescript/module/index.d.ts`] | BSD-2 (MapLibre) | map surface + layers | `src/components/fordcast/map/` |
| T6 | **Skia 2.6.2** patterns: `Canvas`, `Path` (with `start`/`end` trim), `DashPathEffect`, `LinearGradient`, `BlurMask`, `Group`, `matchFont`/`useFont` [Verified: pkg `@shopify/react-native-skia@2.6.2` types] | MIT | Hydrograph, LagPair, RiskRing, onboarding & How-it-works scenes, splash creek | `src/components/fordcast/` |
| T7 | OpenFreeMap **Positron** style → "FordCast Night" (03 §13.8) | style per `hyperknot/openfreemap-styles` LICENSE (record it); data © OpenStreetMap (ODbL), OpenMapTiles | recolored style JSON | `mobile/assets/map/fordcast-night.json` |
| T8 | Inter via `@expo-google-fonts/inter@0.4.2` | MIT wrapper, font OFL-1.1 | 4 weights | embedded (03 §13.9) |
| T9 | Apple design resources (iOS 26 UI Kit, SF Symbols 7, Icon Composer) | Apple terms | **reference only** — the student compares screenshots; nothing copied | — |

**Rejected on purpose:** `@gorhom/bottom-sheet` and its map example (B2 §12.2 Step 4): the persistent JS sheet fights MapLibre gestures, was dev-tested on Reanimated 3.19, and isn't native glass; the Demo Edition uses B2's own documented fallback (floating card + native `nearby` formSheet) as the primary design [research-ui D4, W2]. Also rejected: HeroUI/Tamagui/gluestack/Paper/Moti/NativeWind 5, lucide icons, `victory-native`, Lottie (Skia scenes instead), `rnr init` (its template isn't SDK 57).

### 16.2 Import steps (exact; after 02 §9.2–§9.3 scaffold + installs)

**Step 1 — Template clean-up** (keep the patterns, drop the demo content):
```bash
cd mobile
git rm -q src/app/explore.tsx src/components/{web-badge,external-link,hint-row,themed-text,themed-view,animated-icon.web,app-tabs.web}.tsx \
  src/components/animated-icon.module.css src/components/ui/collapsible.tsx src/hooks/use-color-scheme.web.ts \
  assets/images/{react-logo*,expo-logo.png,expo-badge*,logo-glow.png,tutorial-web.png,favicon.png} assets/images/tabIcons
# keep src/components/app-tabs.tsx and animated-icon.tsx only as reading reference until §16.4/§20.1 replace them, then delete
```
(Do **not** run `npm run reset-project`: it moves the starter into `example/`, which we then have to delete anyway.) Replace `src/constants/theme.ts` and `src/hooks/use-theme.ts` with `src/lib/theme.ts` + `src/lib/useTheme.ts` (03 §13.11). Replace the template's `src/global.css` (web font variables) with the NativeWind file in Step 2.

**Step 2 — NativeWind 4.2.7 wiring** (packages installed by 02 §9.3 C):
```js
// babel.config.js
module.exports = function (api) { api.cache(true);
  return { presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'] }; };
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
module.exports = withNativeWind(getDefaultConfig(__dirname), { input: './src/global.css', inlineRem: 16 });
// tailwind.config.js
module.exports = { content: ['./src/**/*.{ts,tsx}'], presets: [require('nativewind/preset')],
  theme: { extend: { colors: /* 03 §13.11: B1 §9.12 map with replay→sim */ {}, borderRadius: { xs: '6px', sm: '10px', md: '14px', lg: '20px', xl: '24px', pill: '9999px' },
    fontFamily: { sans: ['Inter_400Regular'], medium: ['Inter_500Medium'], semibold: ['Inter_600SemiBold'], bold: ['Inter_700Bold'] } } },
  plugins: [require('tailwindcss-animate')] };
```
Add `nativewind-env.d.ts` with `/// <reference types="nativewind/types" />`. `src/global.css` = `@tailwind base; @tailwind components; @tailwind utilities;` + the dark variable block (03 §13.11). VERIFY BEFORE USE: `npx expo-doctor@latest` clean and `<Button><Text>Test</Text></Button>` renders an ice pill with navy text on `#0E1726` (Reanimated 4 worklets plugin is applied by `babel-preset-expo`; never add `react-native-reanimated/plugin` by hand) [Unverified for SDK 57 + NativeWind 4.2.7; fix per expo-doctor].

**Step 3 — RNR copy-in (3 files):**
```bash
npx @react-native-reusables/cli@0.7.1 add --help        # VERIFY BEFORE USE: read the flag names; log them in verifications.md
npx @react-native-reusables/cli@0.7.1 add button card text   # + the styling-library=nativewind / path=src/components/ui / yes flags as printed
git status --short src/components/ui src/lib              # exactly button.tsx, card.tsx, text.tsx (+ lib/utils.ts) — nothing else
```
Fallback if the CLI prompts, hangs > 2 min or writes elsewhere: `git clone --depth 1 https://github.com/founded-labs/react-native-reusables.git /tmp/_rnr`, find the **NativeWind** variants (`git -C /tmp/_rnr ls-files | grep -iE 'nativewind.*(button|card|text)\.tsx'`), copy them to `src/components/ui/`, and record "copied from registry @ <sha>" in `docs/decisions/verifications.md`. Keep each file's MIT header. If a copied file imports `@/components/ui/icon` or `lucide-react-native`, delete that import and its usage.

**Step 4 — Fonts, sounds, sprites, style:** fonts (03 §13.9), `assets/sounds/*.wav` (03 §15.6), `cd tools && npm run markers && npm run style` (03 §13.8, §14.3).

**Done when (§16.2):** the app boots to an empty NativeTabs shell on the Simulator with the dark theme; `tsc`, `eslint`, `jest` and `expo-doctor` are clean; `src/components/ui/` holds exactly 3 files; no `lucide` import anywhere (`grep -rn lucide mobile/src` → nothing).

### 16.3 RNR restyle rules (edit the copied `cva` variants in the same commit)

| Component | FordCast use | Restyle |
|---|---|---|
| `button` | every non-Drive button | `default` = **inverse pill**: `bg-primary` (`#F2F5FA`) `text-primary-foreground` (`#0E1726`), `h-[52px] rounded-pill px-4`, `label.lg` 15 pt semibold; `secondary` = `bg-secondary` (`#1C2940`) `h-12` (48); `outline` = 1 pt `border-input` on card; `ghost` = text-only `text-link` (`#6CB4FF`), 48 hit. **Delete `destructive`** (red is reserved for risk; ESLint `no-restricted-syntax` on `variant="destructive"`). Add size `drive` (`h-[76px]`, 20 pt label) and `driveGrow` (`h-[96px]`). Leading SF Symbol 17 pt + 6 pt gap, dropped by the measured fit rule (§17.2 AreaStatusCard). Press: scale 0.97 (`spring.press`), `uiHaptic('light')` on primary. Disabled: 40 % opacity + a visible reason line. |
| `card` | StormCard, RouteSummaryCard, gauge card blocks, settings info blocks | `bg-card` (`#152033`), 1 pt `border` (`#2A3A55`), `rounded-lg` (20) — AreaStatusCard and the player panel use `rounded-xl` (24), padding 16, no shadow unless floating over the map (03 §13.10) |
| `text` | RNR internals only | delegates to `AppText` defaults (`font-sans text-foreground`) |
| segmented controls | Inbox/Saved · Nearby/Saved/Ranked · Upstream/History/About · Director speed | **native** `@expo/ui` `Picker` with `pickerStyle('segmented')` inside `<Host matchContents>` (system 32 pt control in a 44 pt row). VERIFY BEFORE USE that `Host` sizes the segmented control to full width inside an RN row; fallback: copy RNR `toggle-group` (needs `@rn-primitives/toggle-group@1.5.2`, which pulls `@radix-ui/react-toggle-group` — pin it exactly) and restyle per B2 §12.4 (`surface2` track, inverse selected segment, 48 pt). |

### 16.4 Navigation registration (root layout + tabs) [MUST]

**Route tree** = 01 §4.1 with one fix: the onboarding pages are renamed so no URL collides with a root route (`(onboarding)/index` would share `/` with `(tabs)/index`, and `(onboarding)/legend` would share `/legend` with the legend sheet; Expo Router keeps group folders in route keys, so these don't fail at build but make `router.push('/legend')` ambiguous [Verified: pkg expo-router@57.0.28 `getRoutesCore.js` keys include groups]). Onboarding files are `(onboarding)/welcome · how · map-key · pledge · alerts-primer`.

```tsx
// mobile/src/app/_layout.tsx — root (sketch; every option name verified in expo-router@57.0.28 / react-native-screens@4.26.2 types)
import '@/global.css';
import { Stack } from 'expo-router';
import { ThemeProvider } from 'expo-router';                 // the SDK 57 template imports it from here [Verified]
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Dimensions, PixelRatio } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { A11yPrefsProvider } from '@/lib/a11y/A11yPrefsProvider';
import { NAV_THEME } from '@/lib/navTheme';               // dark-only React Navigation theme from theme.ts tokens
import { crossingDetents, heightClass, typeTier } from '@/lib/layout';
import { useSettings } from '@/lib/settings';            // kv-store: language, pledge, haptics… (05 §22.10 rule)
import { TouchOverlay } from '@/demo/director/TouchOverlay';
import { useDemo } from '@/demo/store/demo-store';
import { ArrivalOverlay } from '@/components/fordcast/ArrivalOverlay';
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsReady] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const pledged = useSettings((s) => s.pledgeAcceptedAt != null);
  const touches = useDemo((s) => s.touches);
  const { bottom: safeBottom } = useSafeAreaInsets();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0E1726' }}>
      <A11yPrefsProvider>
        <ThemeProvider value={NAV_THEME}>
          <TouchOverlay enabled={touches}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0E1726' } }}>
              <Stack.Protected guard={!pledged}>
                <Stack.Screen name="(onboarding)" />
              </Stack.Protected>
              <Stack.Protected guard={pledged}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="nearby" options={{ presentation: 'formSheet', sheetGrabberVisible: true,
                  sheetAllowedDetents: [0.55, 0.92], sheetLargestUndimmedDetentIndex: 0 }} />
                <Stack.Screen name="crossing/[id]" options={() => {
                  const { height: H } = Dimensions.get('window');
                  const d = crossingDetents(H, safeBottom, heightClass(H), typeTier(PixelRatio.getFontScale()));
                  return { presentation: 'formSheet', sheetGrabberVisible: true, sheetLargestUndimmedDetentIndex: d.undimmed,
                           sheetAllowedDetents: d.detents, sheetInitialDetentIndex: d.initial };
                }} />
                <Stack.Screen name="gauge/[id]" options={{ presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: 'fitToContents' }} />
                <Stack.Screen name="search" options={{ presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.92] }} />
                <Stack.Screen name="legend" options={{ presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: 'fitToContents' }} />
                <Stack.Screen name="storm/[id]" options={{ presentation: 'fullScreenModal', autoHideHomeIndicator: true }} />
                <Stack.Screen name="storm/results" options={{ presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.62, 1.0] }} />
                <Stack.Screen name="drive-mode" options={{ presentation: 'fullScreenModal', gestureEnabled: false, autoHideHomeIndicator: true }} />
                <Stack.Screen name="permission/[kind]" options={{ presentation: 'modal' }} />
                <Stack.Screen name="demo" options={{ presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.5, 1.0] }} />
                <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
              </Stack.Protected>
            </Stack>
            {!fontsReady ? null : <ArrivalOverlay />}{/* §20.1; hides the native splash on first layout */}
          </TouchOverlay>
        </ThemeProvider>
      </A11yPrefsProvider>
    </GestureHandlerRootView>
  );
}
```
- `crossingDetents()` (§19.2) returns T0 `{detents: [peek, half, 1.0], initial: 0, undimmed: 1}`, T1 `{[0.80, 1.0], 0, 0}`, T2+ `{[1.0], 0, 'none'}`; numbers per device in §19.4. Never set `sheetCornerRadius` or a background on iOS sheets (03 §12.3 rule 6). `unstable_sheetFooter` is Android-only, so pinned sheet actions live inside the content [Verified: research-ui §3.3].
- **Sheet over sheet** (crossing opened from `nearby`) is native iOS stacking — keep it; don't dismiss `nearby` first.
- **Fonts:** hide the native splash on the overlay's first layout once fonts load, or after 2,000 ms (then system font) — never block on the network.
- **Background policy:** add the 05 §22.10 `AppState` listener here (pause the clock on background unless a lock-screen take is armed).
- **Deep links:** scheme `fordcast` (02 §9.4); `fordcast://crossing/<id>` → `crossing/[id]` over Map Home (§18.23).

```tsx
// mobile/src/app/(tabs)/_layout.tsx — NativeTabs with the scenario accessory (research-ui §3.2; props verified)
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useScenarioBanner } from '@/demo/store/hooks';
import { useUnreadUrgentCount } from '@/lib/alerts-inbox';
import { ScenarioAccessory } from '@/components/fordcast/ScenarioAccessory';
const IOS26 = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26;   // accessory is iOS 26+
export default function TabsLayout() {
  const { t, i18n } = useTranslation(); const sc = useScenarioBanner(i18n.language === 'es' ? 'es' : 'en');
  const unread = useUnreadUrgentCount();
  return (
    <NativeTabs minimizeBehavior="onScrollDown" tintColor="#F2F5FA" iconColor={{ default: '#8A97AB', selected: '#F2F5FA' }}
      labelStyle={{ default: { color: '#8A97AB' }, selected: { color: '#F2F5FA' } }}
      badgeBackgroundColor="#C62828" blurEffect="systemChromeMaterialDark">
      {sc.active && IOS26 && <NativeTabs.BottomAccessory><ScenarioAccessory /></NativeTabs.BottomAccessory>}
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
```
- `labelVisibilityMode`, `indicatorColor`, `rippleColor`, `backgroundColor` are Android/old props → never set (the template's `backgroundColor`/`indicatorColor` lines go) [research-ui W1]. On iOS < 26, `ScenarioMiniBar` renders inside each tab screen instead (§17.2).
- VERIFY BEFORE USE (Day 2): adding/removing the BottomAccessory conditionally animates cleanly [Unverified; research-ui §6 item 6]; if it doesn't, keep it mounted and render an empty `inline` placeholder when no scenario runs — **never** a blank pill: hide via the conditional first.
- Badge = unread AVOID/CLOSED inbox entries (scenario alerts count in the Demo Edition; they are the only alerts).

### 16.5 Skia patterns (use exactly these building blocks)

```tsx
// Trimmed path draw-on (Hydrograph, splash creek, detour preview) — Path.start/end are trim props [Verified: Skia 2.6.2 PathProps]
const progress = useSharedValue(0);
useEffect(() => { progress.value = motionOK ? withTiming(1, { duration: 700, easing: motion.easing.standard }) : 1; }, []);
<Canvas style={{ width, height }}>
  <Path path={areaPath} style="fill" opacity={areaOpacity}>
    <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={[viz.areaTop, viz.areaBottom]} /></Path>
  <Path path={linePath} style="stroke" strokeWidth={2.5} strokeCap="round" strokeJoin="round" color={viz.line} start={0} end={progress} />
  <Path path={triggerPath} style="stroke" strokeWidth={1.5} color={viz.trigger}><DashPathEffect intervals={[4, 4]} /></Path>
  <Circle cx={nowX} cy={nowY} r={4} color={viz.line} /><Circle cx={nowX} cy={nowY} r={5} style="stroke" strokeWidth={2} color={viz.nowRing} />
</Canvas>
```
- **Text inside Skia** (axis ticks, "Trigger 6.0 ft"): `matchFont({ fontFamily: 'Inter_500Medium', fontSize: 13 })` [Verified export]; VERIFY BEFORE USE that the embedded Inter name resolves through `matchFont` on iOS; fallback: render labels as absolutely positioned `AppText` over the `Canvas` (preferred anyway for Dynamic Type and VoiceOver).
- **Accessibility:** every `Canvas` is wrapped in a `View accessible accessibilityRole="image" accessibilityLabel={fullSentence}`; charts also offer "Show readings" (text table).
- **Snapshots** (optional notification attachment): `canvasRef.current?.makeImageSnapshotAsync()` [Verified: `Canvas.d.ts`] — [SHOULD] only if time (§18.20).
- **Never** animate Skia props from React state at 60 fps; drive them with Reanimated shared values (`useDerivedValue`) or the shared clock.

### 16.6 Import do / don't · Done when (§16)
- DO keep license headers; restyle every imported file in the same commit; read `node_modules/@maplibre/maplibre-react-native/lib/typescript/**/*.d.ts` before writing map code (v11 API only).
- DON'T import `@react-navigation/*` directly (use `expo-router/react-navigation`); DON'T add any package not in 02 §9.3 except pure-JS ones with an exact version and a reason in `docs/devlog.md`.
- **Done when:** the root layout registers every route of 01 §4.1 (with the onboarding renames above); opening each formSheet on the Simulator shows the native grabber and the specified detents; Stack.Protected keeps a fresh install on onboarding until the pledge is accepted.

---
## §17. Component library

All components live in `mobile/src/components/fordcast/` (one file each; map pieces in `components/fordcast/map/`), read tokens via `useTheme()`, take every string from i18n keys, respect `useMotionOK()` and `useLayout()` (§19.2), scale with Dynamic Type, and expose ≥ 48 pt hit areas (44 for system controls, 76/96 in Drive Mode). A `__DEV__`-only gallery (`src/app/dev/gallery.tsx`, `<Redirect href="/" />` in Release) renders **every component in every listed state** with fixture props from the compiled scenarios (never hand-typed numbers), plus a **target-size overlay** that outlines any pressable < 44 pt in dashed red.

### 17.1 Inventory

| Component | Key props | States / variants | A11y | Used on |
|---|---|---|---|---|
| `AppText` | `variant`, `tone`, `capped?` | 03 §13.9 | `accessibilityLanguage` per app language | all |
| `StatusGlyph` | `state`, `size`, `rim 'none'\|'surface'\|'map'`, `official?`, `lastKnown?` | 5 states + official + last-known | hidden (decorative) | chips, rows, legend, HUD |
| `StatusChip` | `state`, `size 'sm'\|'md'\|'lg'`, `official?` | 03 §14.2 | text, `state.<s>.spoken_short` | everywhere |
| `DemoChip` | — | dashed neutral "DEMO" | "Demo data" (`demo.chip_spoken`) | FreshnessPill, meta lines, gauge card |
| `SimulatedBanner` | `variant 'storm'\|'drive'`, `layout 'pill'\|'strip'` | 2-line violet (03 §12.5) | text, `demo.banner_spoken`, read first | Storms, player, results, Drive Mode |
| `GlassSurface` / `GlassIconButton` / `GlassStack` | `pressable`, `symbol`, `label`, `axis 'row'\|'column'` | liquid / blur / solid (03 §12.3) | button + label; Large Content Viewer | map chrome, player ✕ |
| `FitTitle` | `text`, `maxLines 2` | `title.lg` → `title.md` if > 2 lines → ellipsis (full name in a11y label and at half) | header | crossing sheet, player focus row |
| `FreshnessPill` | `mode 'demo'\|'scenario'\|'aging'\|'offline'`, `ageMin`, `timeLabel` | §17.2 | button: tap → What's real; long-press 0.8 s → Director | Map Home |
| `AreaStatusCard` | `risks`, `counts`, `summary` | calm / watch-near / avoid-near / unknown-only / offline / compact (T2+) | one group + separately focusable buttons | Map Home |
| `AlertBanner` | `risk`, `crossing`, `onShow` | WATCH (auto-hide 10 s) · AVOID/CLOSED (persist) · C-class pill | `announce` (05 §27.2), never a toast | Map Home, Drive tab |
| `ScenarioAccessory` / `ScenarioMiniBar` | — (reads `useScenarioBanner`) | regular / inline / mini-bar | "Simulated storm, storm time 7:00 AM, playing. Actions: pause, view." | all tabs while a scenario runs |
| `CrossingRow` | `risk`, `variant 'nearby'\|'ranked'\|'saved'\|'inbox'\|'route'`, `distanceM?` | 72 pt / 56 pt dense (ranked) / stacked at T1+ | label starts with the name (WCAG 2.5.3); actions *Show on map · Detour · Notify me/Stop alerts* | nearby, Alerts, Drive result |
| `EtaRangePill` | `state`, `window`, `closedKind?` | likely / possible / now / water-over-road / closed-source / hidden | spoken window ("15 to 30 minutes") | rows, HUD |
| `WindowBlock` | `risk` | label line + `num.xl` range; `now`; watch-no-window; closed; unknown + last-known | part of the header label | crossing peek |
| `Hydrograph` | `series`, `triggerFt`, `watchFt?`, `nowMin`, `gaps`, `height` | live-tick / player (playhead) / gap hatch / summary mode (T2+) | image + sentence + "Show readings" | crossing half, player |
| `TravelLine` | `range [lo, hi]`, `tier` | tier A "Water usually takes 30–45 min to get here" · tier B + "Estimated" | `travel.range_spoken` | crossing half, player |
| `RiskWindow` + `RiskRing` | `state`, `window` | likely bracket / possible band / hidden; ring 48 pt | window sentence; ring hidden | crossing half |
| `ReasonList` | `reasons` (codes + params) | 2 visible + "More reasons ›"; `_peaked` key when rise ≤ 0 | list of sentences | crossing half |
| `LagPair` | `upstream`, `road`, `tauRange`, `playheadMin?` | crossing full / player (96 R · 120 T · chip on C) | image + `travel.range_spoken` | crossing full, player |
| `OfficialSourceBadge` | `source`, `at` | closed / caution / "no closure reported" | "Official: Simulated road crew, 7:50 AM" | crossing sheet, inbox |
| `TierBadge` | `tier` | A hidden · B "Estimated" · C "Not monitored by FordCast" | text | crossing sheet, rows |
| `LastKnownBadge` | `state`, `ageMin` | dashed frame + small glyph + "Last known: Avoid · 50 min ago" | text | sheet, rows, player |
| `UpdateLog` | `events` (≤ 20) | newest first | rows "7:00 AM. Watch to Avoid. Upstream above trigger." | crossing full (History) |
| `StormCard` | `scenario`, `results` | hero / standard / compact (C) | "Flash flood night. Simulated storm. FordCast warned 30 minutes before water reached the road. Play." | Storms tab |
| `PlayerTopBar`, `StoryCaption`, `FocusRow`, `Scrubber`, `Transport`, `SpeedMenu` | clock + compiled | §18.14 | scrubber `adjustable` ±5 sim-min; magic tap play/pause | storm player |
| `ResultsCountUp` | `storyResults` | counting / final | announce final once | results sheet |
| `PlaceChip`, `RouteInputCard`, `RouteSummaryCard`, `CrossingStrip`, `HandoffMenu` | places, route verdict | §18.10–§18.11 | — | Drive tab, drive/result |
| `DriveHUD`, `RouteRibbon`, `BigActionButton`, `FollowMapStrip`, `EdgeGlow`, `DriveStartPanel` | drive frame (05 §25.4) | calm / watch / avoid-approach / closed / unknown / offline | HUD = assertive live text | Drive Mode |
| `PassengerHoldButton`, `LockoutDialog` | `holdMs 1500` | idle / holding (ring) / cancelled | action "Confirm I am a passenger" | lockout (§18.12) |
| `PermissionPrimer` | `kind 'notifications'\|'location'` | — | title focused first | primers |
| `PledgeCard` | `onAccept` | 0–3 checked; accept enabled at 3 | real `checkbox` roles | onboarding |
| `LegendContent` | — | 5 states + simulated + gauge/creek/route/car | one stop per row | legend, onboarding |
| `DisclaimerFooter` | `variant 'tadd'\|'compact'\|'full'` | 01 §3.8 texts | text | card, sheet full, results, drive result, legal |
| `EmptyState` | `kind` | wraps `ContentUnavailableView` (`title`, `systemImage`, `description`) + one action | heading + body | Alerts, Saved, search |
| `CapabilityBanner` | `kind 'notificationsOff'` (the only kind in this edition) | info bar, 4 pt `#6CB4FF` left bar, [Turn on] | `alert` once | Alerts, Settings |
| `WhatsRealRow` | `symbol`, `title`, `body`, `badge 'built'\|'demo'\|'planned'`, `claimId` | neutral badges (never status colors) | row label | What's real |
| map: `MapSurface`, `CreekLayer`, `GaugeLayer`, `CrossingLayer`, `PulseMarkers`, `WaterPulse`, `RouteLayer`, `CarPuck`, `SimFrame`, `MapEdgeFades` | §17.6 | — | map container = one `image` element with a summary label | Map Home, player, drive result, Drive Mode strip |

### 17.2 Key component specs

**`FreshnessPill`** (top band, left; 36 pt visual, 48 pt hit; glass except the violet mode)
```
demo      [┊DEMO┊ updated 2 min ago]     glass; DemoChip + label.lg #F2F5FA; short "┊DEMO┊ 2 min" / "┊DEMO┊ hace 2 min"
scenario  [● SIMULATED · 7:00 AM storm time]  opaque violet; short "● SIMULATED · 7:00 AM" / "● SIMULADO · 7:00 a. m."
aging     [┊DEMO┊ As of 6:58 AM]          slate text; appears when the simulated check age is 10–20 min
offline   [◌ Data offline · 22 min]       dashed ring glyph; slate; never violet, never amber
```
- **Width rule:** long form only if `measured ≤ W − 2g − 104` (two 44 pt glass buttons + gaps); else the short form; never "…". Measured (03 Inter metrics): demo long EN 216 / ES 248 pt; scenario long EN 277 / ES 342 pt; short ≈ 162–200 pt → demo long fits every iPhone in EN and from iPhone 16 up in ES; scenario long fits only Plus/Pro Max in EN and nowhere in ES, so **the scenario pill uses the short form on every phone except Plus/Pro Max** (§19.5 B).
- Tap → `settings/whats-real` (judges land on honesty). Long-press 0.8 s → `demo` Director (`uiHaptic('select')`; no visible affordance; works in clean mode). `accessibilityHint` "Shows what's real in this demo." (Director gesture not announced.)
- `maxFontSizeMultiplier` 1.3 + Large Content Viewer; at T1+ always the short form.
- Mode comes from `useScenarioBanner()` + `displayAt().freshness` (05 §22.8); `ageMin` is simulated check age, minute-floored.

**`AreaStatusCard`** (floating opaque, `rounded-xl` 24, padding 16, `surface1`, float shadow; left/right = `g`; bottom = `tabZone + 8`; **auto height**, max = `0.42 × (H − safeTop − tabZone)`; above the max → compact form)
```
╭───────────────────────────────╮
│             ▬▬▬               │ 36 × 5 grabber hint #3A4D6E (pan up → nearby, §20.9 #10)
│(○ NO RISE) near you           │ chip md + label (or worst-first counts: (◆ AVOID) 1 · (▲ WATCH) 3)
│No upstream rise detected near │ headline 17/22, ≤ 2 lines (3 at T1)
│you                            │
│Watching 12 upstream gauges for│ caption 13/18, 1 line on R/T ("12 gauges · 17 crossings · 2 min ago"
│17 crossings · updated 2 min   │  short form when the long one needs 2 lines); hidden on C
│[🛣 Check my drive][▶ Drive Mode]│ 52 pt buttons: secondary + primary inverse pill (measured rule below)
│Water can cover a road without │ caption 13/18 tertiary, 2 lines (`state.no_rise.footer`, always)
│warning. Turn around, don't …  │  ← never truncated; shown in full (wireframe width only)
╰───────────────────────────────╯
```
- **Measured button rule** (never shrink text): `fit(icons) = w(label1)+w(label2)+2×(17+6)+2×32+8 ≤ innerW` → icons + labels side by side; else without icons; else **stacked** full width (52 + 8 + 52). Labels measured with `onTextLayout` on first render (hidden measurer), cached per language + fontScale. Results at T0: SE/mini EN 311.5 > 311 → **no icons**; ES no icons; iPhone 16 and up EN 303.5 + 8 / ES 321.3 → icons ✓ (§19.5 A). At T1: stack on SE, 16 and 17 in ES; EN stacks on SE and 16.
- Order: `[Check my drive]` (secondary, `point.topleft.down.to.point.bottomright.curvepath`) left, `[Drive Mode ▶]` (primary, `steeringwheel`) right — the primary is under the right thumb. Each `flexGrow: 1` with `flexBasis` = its measured width.
- Storm form: counts row sorted by rank (`(◆ AVOID) 1 · (▲ WATCH) 3`); headline = the worst crossing's state headline (`state.avoid.headline`, window from `displayAt`); the supporting line names that crossing (`caption`, 1 line, `shortName` if needed; shown on every class in storm form); tap the chip row → `nearby` (Ranked).
- Compact form (T2+ or above max height): chip row, 2-line headline, stacked buttons, footer; supporting line hidden.

**`AlertBanner`** (opaque `surface1`, `rounded-lg`, 4 pt left bar in the state color, y = `topY + 44 + 8`, width `W − 2g`)
```
┌───────────────────────────────┐
│▌(◆ AVOID) Williamson Creek at │ chip md + name headline (≤ 2 lines)
│▌Jones Road                    │
│▌Likely flooded within 15–30   │ status.word #FF5470 (window from displayAt)
│▌min                   [Show ›]│ ghost 48 pt → crossing/[id]
└───────────────────────────────┘
C class after 8 s →  (◆ Avoid · Jones Road ›)   44 pt pill (`LinearTransition` 300 ms); name 1 line
```
- AVOID/CLOSED persist until shown or swiped up; WATCH auto-hides after 10 s; UNKNOWN shows once per crossing. Triggers only for crossings in view, saved, or on the Home → School route (no banner spam). Never a toast for safety.

**`ScenarioAccessory`** (iOS 26 `NativeTabs.BottomAccessory`) and **`ScenarioMiniBar`** (iOS < 26: JS, 52 pt, opaque `surface1`, radius 24, 4 pt violet left bar, at `tabZone + 8` on every tab):
```
regular  [❚❚]  ● SIMULATED · 7:00 AM          [View]     line 1 callout 16/21 tnum (cap 1.3)
               Flash flood night                         line 2 caption 13/18 secondary
inline   [❚❚]  7:00 AM                                  (tab bar minimized)
```
- `[❚❚]`/`[▶]` 44 pt (`pause.fill`/`play.fill` 22 pt); `View` ghost 44 pt → `storm/[id]` (`replay.view` "View" / "Ver"; never "Open"). Measured: EN line 1 167.5 pt, ES 170.4 pt → fits SE with both buttons.
- Placement via `NativeTabs.BottomAccessory.usePlacement()`; a11y label from `demo.pill_running_spoken` + state ("playing"/"paused").

**`WindowBlock` + crossing peek header** — exact stack in §18.6; two lines always (label `status.word` 18/24 + number `num.xl` 40/44), because "Likely flooded within 15–30 min" on one line needs 369 pt (doesn't fit a 338 pt iPhone 17 row) [Verified: calc].

| Risk | Label line (key) | Number line |
|---|---|---|
| avoid, `lo > 0` | `sheet.window_likely` "Likely flooded within" / "Probablemente inundado en" | `{{lo}}–{{hi}} min` |
| avoid, `lo = 0` or held | `state.avoid.headline_now` tail: "Water may already be on the road" / "Puede que ya haya agua en el camino" | — |
| watch + window | `sheet.window_possible` "Possible flooding within" / "Posible inundación en" | `{{lo}}–{{hi}} min` (amber) |
| watch, no window | "Water rising upstream" / "El agua sube río arriba" | — |
| closed official | "Closed · Simulated road crew" + `OfficialSourceBadge` | "Reported 7:50 AM" (caption) |
| closed sensor | `state.closed.headline_sensor` "Water over road · reported 8:15 AM" | — |
| unknown | "Unknown · data offline" or "Unknown · not monitored by FordCast" | `LastKnownBadge` when last known ≥ watch |
| no_rise | "No upstream rise detected" (headline, slate) | — |
New keys `sheet.window_likely`, `sheet.window_possible` pass the countdown guard (no number in the key; the number key always has `{{lo}}`+`{{hi}}`).

**`Hydrograph`** (Skia; height C 120 · R 140 · T 160 at half; 200 at full; summary mode at T2+)
- Data: `visibleSeries(cmp, gaugeId, simMin)` — only **delivered** readings (no lookahead; 05 §26.2). x = last 6 h ending at "now", y = auto range with 10 % headroom, always including the trigger.
- Draws: area gradient, 2.5 pt cyan line, dashed amber **trigger** line + label "Trigger 6.0 ft" (value from the link), now-dot, rate badge "+4.5 ft over the last 30 min" (never "in 30 min"), hatched gap band + "No data" for silent spans, violet playhead in the player.
- Axis: 3 time ticks ("6:00", "6:30", "7:00 AM", `num.sm`), 2 stage ticks; labels as `AppText` overlays.
- Label (VoiceOver): "Upstream gauge Williamson Ck at Brush Country Blvd: 6.8 feet, rising 4.5 feet over the last 30 minutes. Trigger level 6.0 feet." + button "Show readings" → `ReadingsList` (last 12 readings "6:45 AM, 4.7 feet").

**`DriveHUD`** (Drive Night card `#0E1726`, `rounded-xl`, padding 20; contents ≤ 3 items, ≤ 120 chars)
```
┌───────────────────────────────┐
│ ◆  AVOID                      │ StatusGlyph 44 + drive.primary 32/38 (state word)
│ 15–30 min                     │ display.xl 56/60 + "min" drive.secondary
│ Williamson Creek at Jones Road│ drive.secondary 24/30, ≤ 2 lines (shortName on ribbon only)
└───────────────────────────────┘
```
- Calm: `(○)` "No rise detected ahead" + "next crossing 1.0 km" (no window). Watch: amber triangle + "WATCH" + "water rising upstream". Closed: striped octagon + "CLOSED" + "Turn around". Unknown: dashed ring + "UNKNOWN" + "no recent data · watch for water".
- Live region: `accessibilityLiveRegion` is Android-only → on iOS announce via 05 §27.2 (HUD changes are announced only on escalation).

**`RouteRibbon`** — up to 3 nodes, 48 pt each: glyph 28 + distance `num.md` ("1.0 km") + name `headline` 1 line using `shortName` when the full name doesn't fit. `shortName` is an **optional UI field** on on-camera crossings in `demo-data.ts`, built only by **dropping words** (01 §1.5 rule 2), e.g. `atx-37` "Jones Road", `atx-692` "Manchaca Rd & Jones Rd"; a unit test asserts every `shortName` word appears in `name` in order.

**`Scrubber`** (player; 48 pt hit, 6 pt track `#24344F`, fill `#B69CFF`, thumb 24 pt ice + 2 pt violet ring): ticks from `scrubberTicks()` (▲ ◆ ▧ ◌ ● ⌀, 03 §13.6) drawn 12 pt above the track with 2 pt colored stems; a tick scales 0 → 1 (`spring.pop`) the first time the playhead passes it. Drag pauses playback; `uiHaptic('select')` every 15 sim-min; `adjustable` ±5 sim-min with value "Storm time 7:02 AM. Avoid issued at 7:00 AM." (never minutes-until-flood).

**`PassengerHoldButton`**: 76 pt, label "I'm a passenger (hold)" / "Soy pasajero (mantenga presionado)"; a 3 pt ice progress ring fills over 1,500 ms while held; release early → resets; completion → `uiHaptic('medium')` and the dialog closes.

**`PermissionPrimer`**: SF hero (48 C / 64 R / 72 T, hierarchical `#F2F5FA`, `variableColor` ×2), `title.lg` (≤ 2 lines), 3 bullets (17 pt SF icon + `body.lg`), pinned `[Continue]` 52 primary + `[Not now]` 48 ghost at `safeBottom + 16`.

### 17.3 `FitTitle` (no clipped names)
A hidden copy (`opacity 0`, absolute, same width) measures lines with `onTextLayout`; the visible title uses `title.lg` if ≤ 2 lines, else `title.md` (≤ 2 lines), else 2 lines with an ellipsis (full name in the a11y label and in the full-detent "About" block). The title fades in at stagger +40 ms, after measurement, so the variant switch is never visible. Measured: at 28 pt every demo name fits 2 lines except `atx-38`, `hays-663`, `tc-94` (3 lines); at 22 pt all fit 2 lines except `tc-94` on SE (3) — all three are off-camera tier B/C crossings [Verified: calc, greedy wrap with Inter metrics, `tools/measure-text.mjs`].

### 17.4 Lists and rows
- `CrossingRow` 72 pt: leading `StatusChip md` column (min 88 pt), name `headline` ≤ 2 lines, second line `EtaRangePill` text or state line ("no rise detected", "Last known: Avoid · 50 min ago"), trailing distance `num.md` ("1.2 km", from the simulated position) + chevron. Ranked (crew) variant: 56 pt dense, chip sm, name 1 line + window. Inbox variant: violet `SIMULATED` chip **before** the state chip, time `caption` right, unread 8 pt `#6CB4FF` dot. Saved variant: + "Also alert me at Watch" `Switch` row (44 pt).
- At T1+ rows stack (chip above name above window), auto height. Names never truncate in the full detent of a list; in 72 pt rows they may wrap to 2 lines (full name in the a11y label).
- Long-press → `Link.Preview` (crossing peek card) + `Link.Menu` (*Show on map · Detour · Notify me / Stop alerts*); VERIFY BEFORE USE inside formSheets [research-ui §6 item 7]; fallback: `@expo/ui` `ContextMenu`, then plain actions in the row's swipe/⋯.
- Lists use `@shopify/flash-list` 2.0.2 (02 §9.3) with sticky section headers (`caption` uppercase `label.chip`).

### 17.5 Dialogs, toasts, empty states
- Confirmations use **native** `Alert.alert` with two buttons and **no** `style: 'destructive'` (no red buttons): "End Drive Mode?" [End] [Keep driving]; "Stop alerts for Williamson Creek at Jones Road?" [Stop alerts] [Cancel].
- No toasts for safety, ever. Neutral confirmations ("Language changed") are VoiceOver announcements only.
- Empty states = `EmptyState` (`ContentUnavailableView`): SF symbol hierarchical `#8A97AB`, title 20/25, description 15/21, one action. Never "all clear", never a check mark.

### 17.6 Map layer stack (one `MapSurface`, reused by Map Home, player, drive result and the Drive Mode strip)

```tsx
// mobile/src/components/fordcast/map/MapSurface.tsx (sketch; MLRN 11.5.0 v11 API — Layer takes style-spec paint/layout)
<Map ref={mapRef} style={StyleSheet.absoluteFill} mapStyle={NIGHT_STYLE} contentInset={inset}
     logo={false} compass={false} attribution attributionPosition={{ left: 8, bottom: attributionBottom }}
     touchPitch={false} touchRotate={false} onPress={onMapPress}
     accessible accessibilityRole="image" accessibilityLabel={mapSummary}>
  <Camera ref={cameraRef} initialViewState={{ center: [-97.80, 30.225], zoom: 10.5 }} minZoom={8} maxZoom={17} />
  <Images images={SPRITES} />
  <GeoJSONSource id="creeks" data={creeksFC}>
    <Layer id="creeks-calm" type="line" beforeId="fordcast-anchor" filter={['!', ['get', 'active']]}
      layout={{ 'line-cap': 'round', 'line-join': 'round' }}
      paint={{ 'line-color': mapTokens.creekCalm, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 15, 3] }} />
    <Layer id="creeks-glow" type="line" beforeId="fordcast-anchor" filter={['get', 'active']}
      paint={{ 'line-color': mapTokens.creekGlow, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 8.5, 15, 11], 'line-blur': 6 }} />
    <Layer id="creeks-active" type="line" beforeId="fordcast-anchor" filter={['get', 'active']}
      layout={{ 'line-cap': 'round' }} paint={{ 'line-color': mapTokens.creekActive, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 15, 4] }} />
  </GeoJSONSource>
  {pulses.map((p) => <WaterPulse key={p.reachId} reach={p.reach} progress={p.progress} />)}   {/* ≤ 3, lineMetrics source */}
  <RouteLayer route={route} detour={detour} blocked={blocked} />                                  {/* casing → line → blocked → detour */}
  <GeoJSONSource id="gauges" data={gaugesFC} onPress={onGaugePress} hitbox={{ top: 22, right: 22, bottom: 22, left: 22 }}>
    <Layer id="gauges-ripple" type="circle" paint={{ 'circle-radius': rippleR, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-width': 1.5,
      'circle-stroke-color': mapTokens.gauge, 'circle-stroke-opacity': rippleOpacity }} />  {/* calm only, §12.6 */}
    <Layer id="gauges" type="circle" filter={['!', ['get', 'silent']]} paint={{ 'circle-radius': 4, 'circle-color': mapTokens.gauge,
      'circle-stroke-color': mapTokens.gaugeStroke, 'circle-stroke-width': 2 }} />
    <Layer id="gauges-silent" type="symbol" filter={['get', 'silent']} layout={{ 'icon-image': 'ic-gauge-silent', 'icon-allow-overlap': true }} />
  </GeoJSONSource>
  <GeoJSONSource id="crossings" data={crossingsFC} cluster clusterRadius={40} clusterMaxZoom={12}
    clusterProperties={{ maxRank: ['max', ['get', 'rank']] }} onPress={onCrossingPress} hitbox={{ top: 22, right: 22, bottom: 22, left: 22 }}>
    <Layer id="cluster" type="circle" filter={['has', 'point_count']} paint={{
      'circle-color': ['step', ['get', 'maxRank'], mapTokens.cluster.no_rise, 2, mapTokens.cluster.watch, 3, mapTokens.cluster.avoid],
      'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 30, 24],
      'circle-stroke-color': ['case', ['>=', ['get', 'maxRank'], 3], '#FFFFFF', ['==', ['get', 'maxRank'], 1], '#7A879C', '#8A97AB'],
      'circle-stroke-width': ['case', ['==', ['get', 'maxRank'], 2], 0, 2] }} />
    <Layer id="cluster-count" type="symbol" filter={['has', 'point_count']}
      layout={{ 'text-field': ['get', 'point_count_abbreviated'], 'text-font': mapTokens.fontBold, 'text-size': 14 }}
      paint={{ 'text-color': ['case', ['==', ['get', 'maxRank'], 2], '#0E1726', '#FFFFFF'] }} />
    <Layer id="crossing-selected" type="circle" filter={['all', ['!', ['has', 'point_count']], ['==', ['get', 'id'], selectedId ?? '']]}
      paint={{ 'circle-radius': 24, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': '#F2F5FA', 'circle-stroke-width': 3 }} />
    <Layer id="crossing-icon" type="symbol" filter={['!', ['has', 'point_count']]} layout={{
      'icon-image': ['get', 'sprite'], 'icon-size': ['interpolate', ['linear'], ['zoom'], 11, 0.55, 16, 1.0],
      'icon-allow-overlap': true, 'symbol-sort-key': ['get', 'rank'],
      'text-field': ['step', ['zoom'], '', 13.5, ['get', 'name']], 'text-font': mapTokens.fontRegular, 'text-size': 12,
      'text-offset': [0, 1.6], 'text-anchor': 'top', 'text-optional': true }}
      paint={{ 'text-color': '#C9D2DE', 'text-halo-color': '#0B1320', 'text-halo-width': 1.5 }} />
  </GeoJSONSource>
  <PulseMarkers risks={avoidInView} />      {/* RN <Marker> + PulseRing, ≤ 20, 3 pulses then static */}
  <CarPuck position={simFix} />             {/* Marker: 14 pt route-blue dot + ice ring + heading cone */}
</Map>
<SimFrame active={scenarioActive} />        {/* 2 pt violet inner frame + 4 % wash, pointerEvents none */}
<MapEdgeFades topH={safeTop + 72} bottomH={160} />
```
- Feature properties are computed in one memo per tick: `{ id, name, rank, state, sprite, active }` from `useAllRisks()` (05 §22.10) — **the GeoJSON `data` prop changes at most once per 5-min tick**.
- `onPress` from `GeoJSONSource` gets `e.nativeEvent.features` (44 × 44 default hitbox, overridden to 44 pt each side) [Verified: research/maps.md §3.3, `PressableSourceProps`]. Cluster tap → `getClusterExpansionZoom(clusterId)` + `easeTo` [Verified: `GeoJSONSourceRef`]; if the cluster contains AVOID/CLOSED, also present `nearby` on the Ranked segment.
- `contentInset` (map center stays above the card/sheet) is updated **only on layout or detent change**, never per frame; `Map.contentInset?: ViewPadding` [Verified].
- Camera never moves on its own on data updates. It moves only on: a user tap (crossing/cluster/search result/notification), a detent change (keep the selected crossing visible), the player fit, the detour reveal, and the Drive Mode follow strip.
- `WaterPulse`: `<GeoJSONSource id={'pulse-'+reachId} data={reachLine} lineMetrics>` + `<Layer type="line" paint={{ 'line-width': 6, 'line-blur': 1, 'line-gradient': pulseGradient(p) }} />` (one source per reach; `line-gradient` can't be data-driven) + the wavefront dot as a `Marker` at `along(reach, p × length)` (`@turf/along` 7.4.0, 02 §9.3). `pulseGradient(p)` = `['interpolate', ['linear'], ['line-progress'], 0, dim, a, dim, b, hot, c, dim, 1, dim]` with `a = max(0.0001, p − 0.12)`, `b = min(0.9998, max(a + 0.0001, p))`, `c = min(0.9999, b + 0.0001)` (stops strictly increasing) [research/maps.md §5.5].
- Route/detour/creek geometry comes from `routes.json`/`creeks.json` (05 §21.5); the map must show them on **real streets** (baked), or the basemap gives the fake away.

**Done when (§17):** the dev gallery renders every row of §17.1 in every state from compiled fixtures, with no pressable under 44 pt (overlay check) and no hex literal outside `theme.ts`; `MapSurface` draws creeks, gauges, crossings and clusters from the calm scenario on the device with labels on top.

---
## §18. Screen-by-screen specs (every screen, every state)

**Conventions.** Each screen lists: route + presentation · priority tag · wireframe(s) · states · copy keys (EN / ES) for chrome strings first defined here (status/safety copy is quoted from 01 §3.7, which wins on any difference) · interactions · VoiceOver order · Done when. **Every chrome key below goes into `en.json`/`es.json` and `es-pending-review.json` in the same commit** and passes the 01 §3.11 guards (no "Open…", no "OK", no "Clear", no "safe"). Measured widths and per-class rules are in §19.

### 18.1 Launch: icon → splash → arrival [MUST-SHOW]
```
Home Screen icon "The Dip"      Native splash (#0E1726 + Dip glyph 76 pt)     JS arrival overlay (§20.1)
                                                                              ┌─────────────────────────────┐
                                                                              │          ╲     ╱            │ creek trims in (600 ms)
                                                                              │      ~~~~ ╲___╱ ~~~~        │
                                                                              │          FordCast           │ display.md, rises 8 pt
                                                                              │   Know before it crosses.   │ body.md secondary
                                                                              └─────────────────────────────┘
                                                                              → crossfade to Map Home (calm) while the camera
                                                                                eases z 9.8 → 10.5 · or → onboarding on first run
```
- Copy: `app.tagline` "Know before it crosses." / "Sepa antes de que el agua cruce." (wordmark "FordCast" is the brand name; never translated).
- Never waits on the network (style is bundled; tiles stream in under the overlay). Fonts ≤ 2,000 ms.
- **Done when:** cold start → interactive calm Map Home ≤ 2.5 s in Release on the iPhone (01 §7.5), with no white flash and no system-font flash.

### 18.2 Onboarding (5 pages, `(onboarding)/welcome · how · map-key · pledge · alerts-primer`) [MUST-SHOW pledge · SHOULD-SHOW rest]
Each page is a stack screen with a horizontal slide, an illustration area (C 140 · R 200 · T 240 pt; hidden at T2+), ≤ 40 words of body, page dots (6 pt, active 18 × 6 pill; hidden from VoiceOver), and buttons **pinned** at `safeBottom + 16`. "Skip" (top-right ghost) on P1–P3 jumps to the pledge — the pledge can never be skipped.
```
P1 WELCOME + LANGUAGE               P2 HOW IT WORKS                     P3 WHAT THE MAP SHOWS
┌─────────────────────────────┐     ┌─────────────────────────────┐     ┌─────────────────────────────┐
│ (English | Español)    Skip │     │                        Skip │     │                        Skip │
│  [Skia: creek S-curve flows │     │  [Skia: gauge ─~~~─▶ road;  │     │ What the map shows          │
│   into the road dip; water  │     │   cyan dot travels 2.4 s;   │     │ ○  No rise detected         │
│   line rises 0 → 40 % ×3]   │     │   crossing ○ → ▲ → ◆]       │     │ ▲  Watch · water rising     │
│                             │     │ How it works                │     │    upstream                 │
│ Know before it crosses.     │     │ ① Upstream gauges see water │     │ ◆  Avoid · likely flooded   │
│ FordCast watches stream     │     │   rising                    │     │    soon                     │
│ gauges upstream of low-     │     │ ② FordCast estimates how    │     │ ▧  Flooded – Closed         │
│ water crossings and warns   │     │   long water takes to reach │     │ ◌  Unknown – data offline   │
│ you before water reaches    │     │   each crossing             │     │ ▒  SIMULATED = demo storm   │
│ the road.                   │     │ ③ Your crossing turns Watch,│     │ FordCast never says a road  │
│                             │     │   then Avoid, before water  │     │ is safe.                    │
│                   ● ○ ○ ○   │     │   arrives                   │     │                   ● ● ● ○   │
│ [          Next           ] │     │ This demo uses simulated    │     │ [          Next           ] │
└─────────────────────────────┘     │ gauge readings. The forecast│     └─────────────────────────────┘
                                    │ logic is real and runs on   │
                                    │ your phone.        ● ● ○ ○  │
                                    │ [          Next           ] │
                                    └─────────────────────────────┘
P4 SAFETY PLEDGE (required)          P5 ALERTS PRIMER (optional)
┌─────────────────────────────┐     ┌─────────────────────────────┐
│ Before you start            │     │          [bell.and.waves]   │ SF hero 64 pt, variableColor ×2
│ ☐ I will never drive into   │     │ Get warnings for crossings  │
│   water.                    │     │ on your way                 │
│ ☐ I will obey barricades and│     │ • Avoid and Closed alerts   │
│   official warnings.        │     │   for crossings you save    │
│ ☐ FordCast is a student-    │     │ • Alerts are made on this   │
│   built forecast. It can be │     │   phone (demo storms only)  │
│   wrong or late, and it     │     │ • Alerts can arrive minutes │
│   never tells me a road is  │     │   late, and FordCast doesn't│
│   safe.                     │     │   cover every road.         │
│ Check all three statements  │     │                             │
│ to continue                 │     │ [        Continue         ] │ → requestPermissionsAsync (05 §25.3)
│ [      I understand       ] │     │ [         Not now         ] │ → Map Home; Alerts tab shows the banner
│ Turn around, don't drown.   │     └─────────────────────────────┘
└─────────────────────────────┘
```
- **Copy:** P1–P4 = 01 §3.8 (`onboarding.welcome.title`, `onboarding.how.title`, `onboarding.how.data` — never "Real USGS data", `onboarding.legend.title`, `onboarding.legend.never_safe`, `onboarding.pledge.*`) plus `onboarding.welcome.body` "FordCast watches stream gauges upstream of low-water crossings and warns you before water reaches the road." / "FordCast vigila los medidores río arriba de los cruces bajos y le avisa antes de que el agua llegue al camino.", steps `onboarding.how.step1` "Upstream gauges see water rising" / "Los medidores río arriba ven subir el agua", `onboarding.how.step2` "FordCast estimates how long water takes to reach each crossing" / "FordCast estima cuánto tarda el agua en llegar a cada cruce" (**not** B2's "learned": the demo's travel times are authored values, 05 §21.4), `onboarding.how.step3` "Your crossing turns Watch, then Avoid, before water arrives" / "Su cruce cambia a Precaución y luego a Evite antes de que llegue el agua", legend meaning lines `onboarding.legend.watch` "water rising upstream" / "el agua sube río arriba", `onboarding.legend.avoid` "likely flooded soon" / "probablemente inundado pronto", `onboarding.legend.sim` "demo storm" / "tormenta de demostración"; buttons `common.next` "Next" / "Siguiente", `common.skip` "Skip" / "Omitir", `onboarding.tadd` "Turn around, don't drown." / "¡Dé la vuelta, no se ahogue!". P5: `permissions.notifications.title` "Get warnings for crossings on your way" / "Reciba avisos de los cruces en su camino", bullets `permissions.notifications.b1–b3` ("Avoid and Closed alerts for crossings you save" / "Avisos de Evite y Cerrado para los cruces que guarde" · "Alerts are made on this phone (demo storms only)" / "Los avisos se crean en este teléfono (solo tormentas de demostración)" · `alerts.why_late`), `common.continue` "Continue" / "Continuar", `common.not_now` "Not now" / "Ahora no".
- **Language** (P1): native segmented `English | Español` (+ "Device language" default applied silently); applies instantly to every page (i18n switch, 05 §27.3).
- **Pledge:** three 24 pt checkboxes (1.5 pt `#6B7890` box; checked = ice fill + navy `checkmark` 15 pt bold — never green), each row ≥ 48 pt; `[I understand]` disabled (40 %) with the hint visible until all three are checked, then crossfades enabled (200 ms) — `uiHaptic('select')` per check, `uiHaptic('light')` on accept. On accept: keep the acceptance in memory and push P5; P5's `[Continue]` or `[Not now]` **then** persists `pledgeAcceptedAt` + `pledgeVersion` (kv-store), which flips `Stack.Protected` to the tabs (persisting on P4 would flip the guard before P5 could show). If notifications were already granted, P4 commits directly. Re-openable from Settings → About → "Replay introduction".
- **A11y:** one heading + body per page; `Next` labeled "Next, page 2 of 5"; checkboxes are real `checkbox` roles with `checked`; the disabled button exposes the hint.
- **T2+:** illustrations hidden, page scrolls, buttons stay pinned. ES (+30 %) fits because body text is never fixed-height.
- **Done when:** a fresh install can't reach the tabs without accepting the pledge; switching to Español on P1 changes every page; the 3 s pledge shot (06 §29) shows all three items checked and the button enabling.

### 18.3 Permission primers (`permission/[kind]`, modal) [BUILD-ONLY]
- `notifications`: same layout as P5; shown on the first **Notify me**, or Director "Enable alerts", if not yet asked. Grant it **before recording** so no system prompt appears in takes (06 §30.1).
- `location` (only for the optional Settings → "Use my real location" toggle; the demo runs on a **simulated position**): SF hero `location.circle.fill`; title "See crossings near you" / "Vea los cruces cerca de usted"; body = 01 §3.8 location primer ("…Your location stays on your phone. This demo works without it."); `[Continue]` → `requestForegroundPermissionsAsync()`; `[Not now]`.
- Denied later → the toggle row shows "Location is off. Turn it on in iOS Settings." / "La ubicación está apagada. Actívela en Configuración de iOS." + `[Go to Settings]` (`Linking.openSettings()`); the demo keeps working.
- **Done when:** no OS prompt ever appears before its primer; the app is fully usable after "Not now".

### 18.4 Map Home (`(tabs)/index`) [MUST-SHOW]

**Layout (all states):** full-bleed `MapSurface`; top band at `topY` = `[FreshnessPill]` left, `GlassStack row [?][⚙]` right; right-edge `GlassStack column [⌕][☰][➤]` with bottom = `cardTop − 16`; `AreaStatusCard` at the bottom; `AlertBanner` at `topY + 52` when present; `ScenarioMiniBar` (< iOS 26) above the card when a scenario runs. Map `contentInset = { top: topY + 52 (+ bannerH + 8), bottom: H − cardTop + 16 }`, updated on layout only.

**A — Calm (`calm-evening`; T01)**
```
┌─────────────────────────────────┐
│ 9:41                    ▂▄▆ ▮▮▮ │ status bar (QuickTime 9:41 when recording)
│(┊DEMO┊ updated 2 min ago)  [?][⚙]│ glass pill · glass [?] legend · [⚙] settings (44 / 48 hit)
│▓▓▓▓▓▓~~~·▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ cyan creek veins @50 %, gauge dots (one ripple / 12 s)
│▓▓○▓▓▓▓▓~~~▓▓▓▓▓▓○▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ ○ monitored crossings (slate rings)
│▓▓▓▓▓·▓▓▓▓~~~~▓▓◌▓▓▓▓▓▓▓▓▓▓▓▓[⌕]│ ◌ tier C "not monitored"
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓~~~○▓▓▓▓▓▓▓▓▓▓▓[☰]│ [⌕] search · [☰] nearby list · [➤] center on demo location
│▓▓▓▓▓▓▓▓◉▓▓▓▓▓▓▓▓~~▓▓▓▓▓▓▓▓▓▓[➤]│ ◉ demo location (simulated)
│╭─────────────▬▬▬──────────────╮ │
││(○ NO RISE) near you          │ │ AreaStatusCard (§17.2)
││No upstream rise detected near│ │
││you                           │ │
││Watching 12 upstream gauges   │ │
││for 17 crossings · updated 2… │ │ (wireframe width; real line = short form, never "…")
││[🛣 Check my drive][▶ Drive Mode]│
││Water can cover a road without│ │
││warning. Turn around, don't d…│ │ (shown in full on device)
│╰──────────────────────────────╯ │
│   Map    Drive   Storms  Alerts │ NativeTabs (glass)
└─────────────────────────────────┘
```
**B — Scenario running, AVOID near (`flash-flood-night` @ 7:02 AM; T05 "one clock")**
```
┌─────────────────────────────────┐
│(● SIMULATED · 7:02 AM)     [?][⚙]│ violet pill (short form on R)
│┌───────────────────────────────┐│ AlertBanner (persists)
││▌(◆ AVOID) Williamson Creek at ││
││▌Jones Road · likely flooded   ││
││▌within 15–30 min      [Show ›]││
│└───────────────────────────────┘│
│┃▓▓▓~~~»»●◆▓▓▓▓▓▓▲▓▓▓▓▓▓▓▓▓▓▓▓▓┃│ 2 pt violet frame + 4 % wash; active creek + glow; pulse + wavefront
│┃▓▓▓▓▲▓▓▓▓▓▓▓▲▓▓▓▓▓▓▓▓▓▓▓▓▓[⌕]▓┃│ ▲ Westgate · Manchaca & Jones · Jimmy Clay
│┃▓▓◌▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓[☰]▓▓┃│ ◌ tier C stays "not monitored"
│┃▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓[➤]▓▓┃│
│╭──────────────▬▬▬─────────────╮ │
││(◆ AVOID) 1 · (▲ WATCH) 3     │ │ worst first; tnum counts
││Avoid · likely flooded within │ │ headline = worst crossing's line
││15–30 min                     │ │
││[Check my drive] [▶ Drive Mode]│ │
││Water can cover a road without│ │
││warning. Turn around, don't d…│ │
│╰──────────────────────────────╯ │
│ [❚❚] ● SIMULATED · 7:02 AM  View│ BottomAccessory (iOS 26) / ScenarioMiniBar
│      Flash flood night          │
│   Map    Drive   Storms Alerts¹ │ badge = unread AVOID/CLOSED
└─────────────────────────────────┘
```
**C — One gauge silent (`onion-creek-storm` @ 5:50 AM):** pill unchanged; the Twin Creeks gauge turns `ic-gauge-silent`; Bluff Springs Rd becomes `ic-unknown-lastavoid`; card counts include "(◌ UNKNOWN) 1"; `safetyHaptic('unknown')`; no banner (UNKNOWN banner only for saved/on-route crossings, once).

**D — Simulated offline (Director "Simulated offline", 05 §24.3):** 0–10 min: no change; 10–20 min: pill `[┊DEMO┊ As of 6:58 AM]` (slate); > 20 min: pill `[◌ Data offline · 22 min]`, **every** crossing `ic-unknown` (last-known badges for ≥ watch), card `(◌ UNKNOWN) Data offline` + `area.offline` "Data offline. Treat low-water crossings as if they could flood." / "Sin datos. Trate los cruces bajos como si pudieran inundarse." Map tiles keep loading (the switch only affects simulated gauge data).

**E — Loading (first frames before the scenario compiles, ≤ 30 ms; or tiles not yet loaded):** basemap/land only, **no crossing markers drawn**, card shows "Loading crossings…" / "Cargando cruces…" with a slim spinner (`text.secondary`) — never a `(○ NO RISE)` chip.

**F — VoiceOver on (or Settings → Accessibility → "Show the list first"):** Map Home presents `nearby` at 0.92 on top; the map element's label summarizes: "Map. 1 crossing Avoid, 3 Watch near you. Use the list for details." / "Mapa. 1 cruce Evite, 3 Precaución cerca de usted. Use la lista para ver detalles."

**G — Map style failed:** land-colored background + FordCast layers only + small banner "Map details unavailable" (03 §13.8); everything else works.

**H — Large text (T2+):** card compact form; T3 → state F (list-first).

- **Interactions:** marker tap → `crossing/[id]` (camera eases 600 ms so the crossing sits in the visible area above the peek); cluster tap → expansion zoom (+ Ranked list if it holds AVOID/CLOSED); gauge dot → `gauge/[id]`; `[⌕]` → `search`; `[☰]` or card swipe-up/chip-row tap → `nearby`; `[➤]` → camera to the (simulated) position; `[?]` → `legend`; `[⚙]` → `settings` (long-press → menu *English ✓ · Español · Demo Director · How FordCast works*); pill tap → What's real, long-press → Director; banner `Show` → crossing sheet. Zoom ± buttons (2 × 44) appear only with VoiceOver/Switch Control.
- **Control-stack collision rule:** if the stack top would rise above `bannerBottom + 16` (C class with a banner), drop `[⌕]` (search stays in the `nearby` header).
- **Copy keys:** `area.near_you` "near you" / "cerca de usted" · `area.nearby_count` "{{state}} · {{count}}" · `area.loading` "Loading crossings…" / "Cargando cruces…" · `area.offline` (above) · `cta.checkDrive` "Check my drive" / "Revisar mi ruta" · `cta.driveMode` "Drive Mode" / "Modo manejo" · `map.summary_*` (above) · a11y labels `chrome.legend` "Map legend" / "Leyenda del mapa", `chrome.settings` "Settings" / "Configuración", `chrome.search` "Search crossings" / "Buscar cruces", `chrome.list` "List of crossings" / "Lista de cruces", `chrome.locate` "Center on demo location" / "Centrar en la ubicación de demostración".
- **VoiceOver order:** FreshnessPill → Legend → Settings → AlertBanner → map summary → Search · List · Locate → card (chip row + headline as one group) → Check my drive → Drive Mode → footer → accessory → tabs.
- **Done when:** states A–H reproduce from the Director (A, B, C, D directly; E by throttled compile in `__DEV__`; F, H via iOS settings; G via a `__DEV__` bad-style toggle) and match the wireframes on SE, iPhone 16 and Pro Max; no marker ever looks calm on stale data.

### 18.5 `nearby` sheet — Nearby · Saved · Ranked (formSheet [0.55, 0.92], largest undimmed 0) [SHOULD-SHOW]
```
┌─────────────────────────────────┐
│               ───               │ grabber
│ Crossings                   [⌕] │ title.md + search (opens `search`)
│ ( Nearby | Saved | Ranked )     │ native segmented (44 pt row)
│ (◆ AVOID) Williamson Creek at   │ CrossingRow 72 pt
│   Jones Road · 15–30 min  1.2 km│
│ (▲ WATCH) Westgate Blvd @       │
│   Williamson Creek …      0.8 km│
│ (◌ UNKNOWN) Williamson Creek Dr │
│   @ Williamson Creek · not      │
│   monitored               6.1 km│
│ (○ NO RISE) Circle C Park 7.4 km│
│ …                               │ FlashList
│ FordCast is a supplementary tool│ DisclaimerFooter compact (end of list)
└─────────────────────────────────┘
```
- **Nearby:** crossings within 10 km of the demo location, sorted rank desc, then distance. **Saved:** saved crossings (§18.16 rules). **Ranked = the crew list "Likely to flood next"** [SHOULD-SHOW, ≤ 1 s pan in the video]: every monitored crossing sorted by rank, then the window's lower bound; dense 56 pt rows; header caption "LIKELY TO FLOOD NEXT · for road crews" / "PROBABLE INUNDACIÓN PRÓXIMA · para cuadrillas"; tier C listed at the bottom under "Not monitored by FordCast". CSV export and a dedicated crew screen are [NEXT] ("Planned" row in What's real).
- Empty Saved → `EmptyState` `bookmark` "No saved crossings yet" / "Todavía no hay cruces guardados" + "Save crossings you drive through to get warnings." + `[Find crossings]` (switches to Nearby).
- Row tap → `crossing/[id]` **stacked over** `nearby`. Long-press → preview + menu (§17.4).
- Copy: `nearby.title` "Crossings" / "Cruces" · `nearby.seg_nearby` "Nearby" / "Cerca" · `nearby.seg_saved` "Saved" / "Guardados" · `nearby.seg_ranked` "Ranked" / "Por riesgo" · `nearby.ranked_header` (above) · `nearby.not_monitored` "Not monitored by FordCast" / "FordCast no los monitorea".
- **Done when:** VoiceOver users reach the hero crossing's state through this list with Screen Curtain on (05 §27 Done when); all three segments render in EN/ES with no truncated status word.

### 18.6 Crossing sheet (`crossing/[id]`, formSheet, detents [peek, half, 1.0] computed per device §19.4, largest undimmed = half, grabber) [MUST-SHOW]

One scroll. The **peek** answers "what and when", the **half** proves "why" (hydrograph + travel time), the **full** detent holds everything else. Opened from a marker, a list row, the AlertBanner, search, a notification tap (deep link) or the player's focus row.

**Peek (iPhone 16: 0.40 = 341 pt incl. 34 pt safe area) — AVOID, scenario running (T07)**
```
┌─────────────────────────────────┐
│               ───               │ system grabber
│ (◆ AVOID)                   [✕] │ StatusChip lg 36 · glass close 44        row 44   (top inset 14)
│ Williamson Creek at Jones Road  │ FitTitle title.lg 28/34, ≤ 2 lines        68
│ Likely flooded within           │ WindowBlock: status.word 18/24 #FF5470    24
│ 15–30 min                       │              num.xl 40/44 tnum #FF5470    44 (+2)
│ Gauge read 15 min ago · ▒SIM▒   │ caption tertiary + chip sm (violet SIMULATED in a scenario,  20
│                                 │   dashed DEMO chip at rest)
│ [⤳ Detour +N min ][🔔 Notify][⋯]│ action row 48: primary inverse (flex) · secondary 48 · menu 48   48
└─────────────────────────────────┘ bottom 12 + safe area      → content 306 pt (C class: 286, §19.4)
```
**Half (iPhone 16: 0.67) adds, in order (stagger 60 ms, §15.4 A16):**
```
│ UPSTREAM · Williamson Ck at Brush Country Blvd │ caption UPPERCASE tertiary (gauge short name, never a station number)
│ ╭───────────────────────────────╮            │ Hydrograph C 120 · R 140 · T 160 pt
│ │            ╱╱  6.8 ft ↑        │            │  cyan line + area, now-dot, rate badge
│ │┄┄┄┄┄┄┄┄┄┄┄╱┄┄┄ Trigger 6.0 ft ┄│            │  "+4.5 ft over the last 30 min"
│ │______╱╱‾‾                      │            │
│ ╰ 6:00   6:30   7:00 AM ─────────╯            │
│ ≈ Water usually takes 30–45 min to get here    │ TravelLine (water.waves 17 + body.md), tier B adds "Estimated"
│ ╭─╮ Next 90 min                                │ RiskRing 48 + RiskWindow track (56 pt row, scrolls in)
│ ╰─╯ Now━━[15–30]━━60━━━90                      │
│ Why this alert?                                │ headline
│ • Williamson Ck at Brush Country Blvd: +4.5 ft │ ReasonList (2 visible): `reason.UPSTREAM_ABOVE_TRIGGER`
│   over the last 30 min, upstream. Water usually│
│   takes 30–45 min to get here.                 │
│ More reasons ›                                 │ expands in place
```
**Full (1.0) adds:** native segmented `Upstream | History | About` (44 pt) →
- **Upstream:** `LagPair` (upstream vs road, 120 pt, connector label = the travel range), linked gauges list (gauge rows: short name · stage `num.md` · trend · "Readings simulated for this demo"), watch level line on a 200 pt hydrograph, `[Show readings]`.
- **History:** `UpdateLog` (newest first: "7:00 AM · Watch → Avoid · Upstream above trigger"), the official row when any (`OfficialSourceBadge`, e.g. "Simulated road crew: no closure reported · 6:30 AM" — quoted, never "open").
- **About:** full name, address (dataset `address`), creek (only when `creekVerified`), `TierBadge`, source label "FordCast forecast (experimental)" / "Pronóstico de FordCast (experimental)", "Forecast rule: baseline v1 · runs on this phone" / "Regla de pronóstico: base v1 · se ejecuta en este teléfono", data credit "Crossing location: City of Austin open data" (allowed credit row, 01 §3.11), `DisclaimerFooter compact`.

**Actions**
| Action | Shown when | Behavior |
|---|---|---|
| `[⤳ Detour +N min]` primary | the crossing is on the saved Home → School route (`crossingsOnRoute(commute)`, 05 §21.5) **and** its state ≥ watch | → `drive/result?avoid=<id>` with the detour drawn (§20.6). `N` = baked detour duration − commute duration, rounded up. Hidden otherwise (never a dead button); then `[Notify me]` takes the flex width. |
| `[🔔 Notify me]` / `[🔔 Notifying]` | always | toggles the crossing in the saved set (§18.16); first use → notifications primer if not granted; `bell` → `bell.fill` + `bounce` + `uiHaptic('light')`. N width: icon-only 48 × 48 with the label as a11y label. |
| `[⋯]` (`Link.Menu` / `@expo/ui` `Menu`) | always | *Show on map* · *Upstream gauge* (→ `gauge/[id]`) · *Why this alert?* (scrolls to reasons) · *Stop alerts* (if saved; not destructive red). No Share ([NEXT]). |
| `[✕]` | always | dismiss (also swipe down, `onAccessibilityEscape`) |

**State variants of the peek** (window block per §17.2; copy from 01 §3.7 verbatim):
| Variant | Chip | Window block / extras |
|---|---|---|
| NO_RISE | `(○ NO RISE)` | "No upstream rise detected" + body `state.no_rise.body` (at half: "That doesn't mean the road is clear…", allow-listed) · no Detour |
| WATCH + window | `(▲ WATCH)` | "Possible flooding within" / `30–60 min` (amber) |
| WATCH, no window (T02 6:48 AM) | `(▲ WATCH)` | "Water rising upstream" (amber `status.word`) |
| AVOID (T07 7:00 AM) | `(◆ AVOID)` | "Likely flooded within" / `15–30 min` |
| AVOID `lo = 0` or held (7:05 AM) | `(◆ AVOID)` | "Water may already be on the road" (2 lines max) |
| CLOSED official (O1 7:50 AM) | `(▧ CLOSED · OFFICIAL)` + shield | "Closed · Simulated road crew" + "Reported 7:50 AM"; half shows "FordCast also expected flooding" (model line, secondary) and `state.closed.body` |
| Closure lifted (9:50 AM, held Avoid) | `(◆ AVOID)` | window block + reason `reason.CLOSURE_LIFTED` "Simulated road crew: closure lifted at 9:25 AM. Water may remain. Use caution." — never "reopened" |
| CLOSED sensor (O2 8:15 AM) | `(▧ CLOSED)` | "Water over road · reported 8:15 AM" + source "Sensor at the road: Williamson Ck at Manchaca Rd" |
| UNKNOWN gauge silent (T11 5:50 AM) | `(◌ UNKNOWN)` | "Unknown · data offline" + `LastKnownBadge` "Last known: Avoid · 50 min ago" + reason `DATA_STALE_gauge` "No recent data from Onion Ck at Twin Creeks Rd (last 50 min ago)" |
| UNKNOWN offline (Director) | `(◌ UNKNOWN)` | same + `state.unknown.body` (offline) |
| UNKNOWN not monitored (tier C) | `(◌ UNKNOWN)` + `TierBadge C` | "Unknown · not monitored by FordCast" + body; half shows no hydrograph — instead an info block "FordCast has no upstream gauge for this crossing." with `creek-flow` glyph |
| Tier B | normal chip + `TierBadge B` "Estimated" | footnote "Travel time estimated from nearby creeks; not validated on past storms." |

- **Detent listener:** `navigation.addListener('sheetDetentChange', e => e.data.stable && …)` → update the map `contentInset` (camera eases 600 ms so the crossing stays visible above the sheet) + `uiHaptic('select')` [event shape `{index, stable}` Verified: research-ui §3.3].
- **Live updates:** while a scenario plays, the sheet re-renders once per tick (`useCrossingRisk`); a state change animates the chip (A2), the window bracket (A10) and draws the new hydrograph segment (A8); the sheet never jumps detents by itself.
- **VoiceOver:** on open, focus lands on the header group whose label is the spoken line: "Avoid. Williamson Creek at Jones Road. Likely flooded within 15 to 30 minutes. Use another route." (`state.avoid.spoken`, spoken name from data). Order: header → meta → actions → hydrograph (image + Show readings) → travel line → window → reasons → segments → footer. Grabber = button with expand/collapse actions; `onAccessibilityEscape` closes.
- Copy (new chrome keys): `sheet.window_likely`, `sheet.window_possible` (§17.2) · `sheet.meta_read` "Gauge read {{age}}" / "Lectura del medidor {{age}}" · `sheet.upstream` "Upstream" / "Río arriba" · `sheet.why` "Why this alert?" / "¿Por qué este aviso?" · `sheet.more_reasons` "More reasons" / "Más razones" · `sheet.seg_upstream|history|about` "Upstream" · "History" · "About" / "Río arriba" · "Historial" · "Acerca de" · `sheet.next90` "Next 90 min" / "Próximos 90 min" · `cta.detour` "Detour +{{n}} min" / "Desvío +{{n}} min" · `cta.notify` "Notify me" / "Avisarme" · `cta.notifying` "Notifying" / "Avisando" · `sheet.show_on_map` "Show on map" / "Mostrar en el mapa" · `sheet.gauge` "Upstream gauge" / "Medidor río arriba" · `sheet.stop_alerts` "Stop alerts" / "Dejar de avisar" · `sheet.model` (About text above) · `sheet.reported` "Reported {{time}}" / "Reportado a las {{time}}" · `sheet.also_expected` "FordCast also expected flooding" / "FordCast también esperaba inundación" · `sheet.no_upstream_info` "FordCast has no upstream gauge for this crossing." / "FordCast no tiene un medidor río arriba para este cruce." · `sheet.close` (a11y) "Close" / "Cerrar".
- **Done when:** every variant above renders from the Director takes (T02, T07, O1, O2, T11) and `__DEV__` fixtures; the peek action row is fully visible at peek on SE, iPhone 16 and Pro Max in EN and ES; the half detent shows the whole hydrograph **and** the travel line without scrolling on those three; no text in the sheet contains a single-number travel time or a countdown.

### 18.7 Gauge card (`gauge/[id]`, formSheet `fitToContents`) [SHOULD-SHOW]
```
┌─────────────────────────────────┐
│               ───               │
│ ⦿ Williamson Ck at Brush Country│ gauge.with.needle + gauge short name (headline, 2 lines)
│   Blvd                    ┊DEMO┊│
│ 6.8 ft   ↑ +4.5 ft over the last│ num.lg stage · trend body.md
│          30 min                 │
│ ▁▁▂▂▃▅▆▇  (Sparkline 48 pt)     │ trigger dashed line if a linked crossing uses it
│ Newest reading: 6:45 AM         │ storm time; caption
│ Readings simulated for this demo│ `demo.gauge_simulated` (always)
│ LINKED CROSSINGS                │
│ (◆ AVOID) Williamson Creek at …│ dense CrossingRow → crossing sheet (stacks)
│ (▲ WATCH) Westgate Blvd @ …     │
│ (▲ WATCH) Manchaca Rd & Jones Rd│
└─────────────────────────────────┘
```
- **Silent:** dashed `ic-gauge-silent` glyph + "No reading since 5:00 AM. Its readings may arrive later." / "Sin lecturas desde las 5:00 a. m. Sus lecturas pueden llegar después." No stage value shown as current.
- **Never** a USGS link or station number (01 §1.5 rule 5). Copy: `gauge.newest` "Newest reading: {{time}}" / "Lectura más reciente: {{time}}" · `gauge.linked` "Linked crossings" / "Cruces vinculados" · `gauge.silent` (above) · trend `gauge.trend` "+{{rise}} ft over the last 30 min" / "+{{rise}} pies en los últimos 30 min" (falling: "−0.4 ft over the last 30 min").
- **Done when:** tapping a cyan gauge dot during T02 opens this card with a climbing sparkline; at T2+ it scrolls.

### 18.8 Search (`search`, formSheet [0.92]) [SHOULD-SHOW]
- Focused `SearchField` (h 48, `surface2`, radius 10, 1 pt `#6B7890`, focus ring 2 pt `#6CB4FF`; placeholder `search.placeholder` "Search crossings, roads or creeks" / "Buscar cruces, calles o arroyos"); keyboard up; results update with a 120 ms crossfade.
- Results: local fuzzy match over crossing name, address and creek (works offline), each row `CrossingRow` dense with its live chip. Places search is [NEXT].
- Empty: `EmptyState` `magnifyingglass` "No crossings match “{{q}}”" / "Ningún cruce coincide con “{{q}}”" + "Try a road or creek name." / "Pruebe con el nombre de una calle o arroyo."
- **Locked while moving** (simulated speed ≥ 4.5 m/s for 5 s, outside Drive Mode; Director "Lockout: Auto"): the field is disabled with `drive.lockout.title` as its hint; focusing it opens the `LockoutDialog` (§18.12).
- Selecting a result → dismiss search, camera eases to the crossing, open `crossing/[id]`.

### 18.9 Legend (`legend`, formSheet `fitToContents`) [SHOULD-SHOW]
```
┌─────────────────────────────────┐
│ What the map shows              │ title.md
│ ○  No rise detected             │ StatusGlyph 28 + state label (headline)
│    No rising water seen at      │ meaning (body.md secondary)
│    linked gauges.               │
│ ▲  Watch · water rising upstream│
│ ◆  Avoid · likely flooded soon  │
│ ▧  Flooded – Closed (OFFICIAL   │
│    when a road crew reports it) │
│ ◌  Unknown – data offline or not│
│    monitored                    │
│ ▒  SIMULATED · a demo storm is  │ violet chip
│    playing                      │
│ ·  Upstream gauge   ~ Creek     │ symbols drawn with the map tokens
│ ━  Route   ◉ Demo location      │
│ FordCast never says a road is   │ `legend.never_safe` (allow-listed negation)
│ safe.                           │
└─────────────────────────────────┘
```
- Copy: `legend.title` = `onboarding.legend.title`; meaning lines `legend.no_rise` "No rising water seen at linked gauges." / "No se ve agua subiendo en los medidores vinculados." · `legend.watch` · `legend.avoid` (= onboarding lines) · `legend.closed` "OFFICIAL when a road crew reports it" / "OFICIAL cuando lo reporta una cuadrilla vial" · `legend.unknown` "data offline or not monitored" / "sin datos o sin monitoreo" · `legend.sim` "a demo storm is playing" / "se está reproduciendo una tormenta de demostración" · `legend.gauge` "Upstream gauge" / "Medidor río arriba" · `legend.creek` "Creek" / "Arroyo" · `legend.route` "Route" / "Ruta" · `legend.demo_location` "Demo location" / "Ubicación de demostración".
- Each row = one VoiceOver stop ("Avoid. Likely flooded soon."); at T2+ the sheet scrolls (fitToContents is capped at full height by the system).

### 18.10 Drive tab — Check My Drive (`(tabs)/drive/index`, native large title) [MUST-SHOW]
```
┌─────────────────────────────────┐
│ Drive                       [⚙] │ large title (inline on C) · glass gear
│╭───────────────────────────────╮│ RouteInputCard (surface1, r20)
││ ⌂  From   Home             ⇅  ││ 48 pt rows; tap → native menu: Home · School · Demo location
││ 🎓 To     School              ││ ⇅ swap (44)
││ Demo places, not real homes or││ caption tertiary (01 §1.5 rule 10)
││ schools.                      ││
│╰───────────────────────────────╯│
│ (⌂ Home) (🎓 School) (◉ Demo   │ PlaceChips 36 pt, horizontal scroll, 8 gap, 16 pt edge fade
│  location)                      │
│ [        Check my drive        ]│ primary inverse 52
│ ┌─────────────────────────────┐ │
│ │ ⎈  Start Drive Mode         │ │ BigActionButton secondary 76 (surface2, steeringwheel 28)
│ └─────────────────────────────┘ │
│ FordCast speaks warnings for    │ caption
│ crossings ahead.                │
│ YOUR ROUTE                      │ section header
│ Home → School  (◆ AVOID)     ›  │ RouteSummary row 72 → drive/result
│ 2 crossings · as of 7:01 AM     │   (verdict chip = worst state on the route)
│ [❚❚] ● SIMULATED · 7:01 AM View │ accessory while a scenario runs
│   Map    Drive   Storms  Alerts │
└─────────────────────────────────┘
```
- The demo has exactly two places (Home, School) plus "Demo location" (the simulated position). Editing places is [NEXT] (Planned row only). Route = the baked `commute` (05 §21.5).
- `[Check my drive]` → `drive/result` for From → To (only Home → School and School → Home have baked routes; other pairs show "Demo routes only: Home ↔ School." / "Solo rutas de demostración: Casa ↔ Escuela." and disable the button with that reason).
- Lockout (simulated speed ≥ 4.5 m/s, Director Lockout Auto): the From/To menus are locked → `LockoutDialog`; `[Start Drive Mode]` always stays usable.
- Copy: `drive.title` "Drive" / "Manejo" · `drive.from` "From" / "Desde" · `drive.to` "To" / "Hasta" · `place.home` "Home" / "Casa" · `place.school` "School" / "Escuela" · `place.demo_location` "Demo location" / "Ubicación de demostración" · `drive.demo_places` "Demo places, not real homes or schools." / "Lugares de demostración, no son casas ni escuelas reales." · `cta.startDrive` "Start Drive Mode" / "Iniciar Modo manejo" · `drive.shell_caption` "FordCast speaks warnings for crossings ahead." / "FordCast le avisa en voz alta sobre los cruces que tiene adelante." · `drive.your_route` "Your route" / "Su ruta" · `drive.route_meta` "{{c}} crossings · as of {{time}}" / "{{c}} cruces · a las {{time}}" · `drive.swap` (a11y) "Swap From and To" / "Intercambiar origen y destino".
- **Done when:** T08's path (crossing peek `[Detour +N min]` → `drive/result`) and the tab path (`[Check my drive]`) land on the same result screen; chips never wrap; ES fits SE without truncation.

### 18.11 Check My Drive result (`(tabs)/drive/result`, pushed; header "Home → School") [MUST-SHOW]
```
┌─────────────────────────────────┐
│ ‹ Drive      Home → School      │ native header (inline)
│▓▓⌂━━━━━━━┄┄◆┄┄━━━━━━━▲━━━━━🎓▓▓▓│ map 45 % of H (C: 38 %): route ghost @35 %, blocked ±300 m dashed red,
│▓▓▓▓▓▓▓▓┗━━━━━━━━━━━━━━━━━━┛▓▓▓▓▓│ detour solid blue on real streets, (Detour +N min) pill at its midpoint
│▓▓▓▓▓▓▓▓▓(Detour +N min)▓▓▓▓▓▓▓▓▓│ violet frame while a scenario runs
│╭───────────────────────────────╮│ RouteSummaryCard (scrolls)
││(◆ AVOID) on your route        ││ chip lg + caption
││Williamson Creek at Jones Road ││ headline 2 lines
││Likely flooded within 15–30 min││ status.word
││Also: (▲ WATCH) Manchaca Rd &  ││ second crossing (rank order)
││Jones Rd                       ││
││⤳ Detour adds N min (M min)    ││ `state.avoid.detour_line` + total
││  · avoids both crossings      ││
││Your map app doesn't know about││ `state.avoid.handoff_warning` (caption, always with the menu)
││this forecast. If it routes you││
││back toward Williamson Creek at││
││Jones Road, don't follow it.   ││
││CROSSINGS ON THIS ROUTE (2)    ││ strip: chips scroll horizontally
││(◆ Jones Rd) (▲ Manchaca & Jones)│
││As of 7:01 AM · ▒SIMULATED▒    ││
││FordCast is a supplementary…   ││ DisclaimerFooter compact
│╰───────────────────────────────╯│
│ [ Show detour in ▾ ]            │ sticky: secondary 52 (native pull-down menu)
│ [ ⎈ Start Drive Mode          ] │ sticky: primary 76
└─────────────────────────────────┘
```
| Verdict (worst state on the route) | Card | Map | Actions |
|---|---|---|---|
| NO_RISE | `(○ NO RISE)` + `state.no_rise.route_verdict` "No rise detected at 2 monitored crossings on this route" + "As of 8:00 PM" — never "safe route" | route only | `[Start Drive Mode]` |
| WATCH | `(▲ WATCH)` + "{{name}}: water rising upstream. Check again before you leave." / "{{name}}: el agua sube río arriba. Revise de nuevo antes de salir." | route + amber marker; detour **offered** (`[Show a detour]` draws it) | `[Show a detour]` · `[Start Drive Mode]` |
| AVOID / CLOSED (T08) | as wireframe | blocked + detour drawn (§20.6) | `[Show detour in ▾]` · `[Start Drive Mode]` |
| UNKNOWN on route | `(◌ UNKNOWN)` + `route.unknown_count_*` "1 crossing on this route has no recent data" | dashed markers | `[Start Drive Mode]` |
- **Hand-off menu** `[Show detour in ▾]` (native `Link.Menu`, no sheet): *Apple Maps* always; *Google Maps* / *Waze* only if `Linking.canOpenURL('comgooglemaps://')` / `('waze://')` is true (`LSApplicationQueriesSchemes` set in 02 §9.4 [VERIFY BEFORE USE on device]). URLs = `docs/master-prompt/research/maps.md` §8.1/§8.3 builders (Apple `https://maps.apple.com/directions?source=…&destination=…&waypoint=…&mode=driving` on iOS ≥ 18.4; Google `…/maps/dir/?api=1…&waypoints=…`; Waze two-leg to the via point). Via point = `along(detour, length / 2)` (`@turf/along`). Item labels "Show detour in Apple Maps" / "Mostrar el desvío en Apple Maps" (never "Open…"). Waze/legacy-Apple two-leg note: "This app can't avoid the crossing. FordCast sends you to a detour point first." / "Esta app no puede evitar el cruce. FordCast primero lo lleva a un punto del desvío." The warning line stays on the card.
- `[Start Drive Mode]` → `drive-mode` with the start panel (§18.12); route = detour when the verdict is ≥ AVOID.
- Copy: `route.on_your_route` "on your route" / "en su ruta" · `route.also` "Also:" / "También:" · `route.detour_total` "({{total}} min)" · `route.avoids` "avoids {{count}} crossings" / "evita {{count}} cruces" (plural keys) · `route.crossings_on` "Crossings on this route ({{count}})" / "Cruces en esta ruta ({{count}})" · `route.watch_line` (above) · `cta.showDetourIn` "Show detour in" / "Mostrar el desvío en" · `cta.showADetour` "Show a detour" / "Mostrar un desvío" · `route.demo_only` (§18.10).
- **Done when (T08):** at 7:01 AM the card shows Avoid (Jones Rd) + Watch (Manchaca & Jones), "Detour adds N min" from the baked durations, the detour drawn on real streets, and both sticky actions visible without scrolling on SE, iPhone 16 and Pro Max.

### 18.12 Drive Mode (`drive-mode`, fullScreenModal, Drive Night, keep awake, no gestures) [MUST-SHOW]

**Start panel** (first screen inside the modal; Director takes skip it with `?autostart=1`):
```
┌─────────────────────────────────┐
│ ▒SIMULATED DRIVE             ▒  │ SimulatedBanner variant drive
│ ▒demo drive · scripted position▒│
│                                 │
│        ⎈ (steeringwheel 56)     │
│ Mount your phone. Don't touch it│ 01 §3.8 Drive Mode start (title.md)
│ while driving. FordCast will    │
│ speak.                          │
│ Voice: English · Enhanced       │ caption; pickVoice() result (05 §25.5)
│ Turn off silent mode for spoken │ `drive.silent_tip` (caption)
│ alerts.                         │
│ Alerts can arrive minutes late, │ `alerts.why_late`
│ and FordCast doesn't cover every│
│ road.                           │
│ [        Start driving        ] │ primary 76
│ [           Cancel            ] │ secondary 76
└─────────────────────────────────┘
```
**HUD — AVOID approach (T09 @ drive 66 s; iPhone 16/17 layout with the follow map)**
```
┌─────────────────────────────────┐ #070D18; 8 pt #FF5470 inner edge glow (static) during the approach
│┃▒SIMULATED DRIVE        ▒[ End ]┃│ row A 76: SimulatedBanner drive (flex, 44, centered) · End 96 × 76 secondary
│┃▒scripted position · demo▒       ┃│   (voice language is shown on the start panel; Mute shows the voice state)
│┃ NEXT CROSSING · 470 M          ┃│ label.chip secondary (distance from the drive frame)
│┃╭─────────────────────────────╮┃│ DriveHUD card 212 (2-line name)
│┃│ ◆  AVOID                    │┃│
│┃│ 15–30 min                   │┃│ display.xl + drive.secondary
│┃│ Williamson Creek at Jones   │┃│
│┃│ Road                        │┃│
│┃╰─────────────────────────────╯┃│
│┃▓▓▓━━━◉━━━━◆┄┄┄▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓┃│ FollowMapStrip (R·W/T only; gestures off; z 15; easeTo 1 s)
│┃▓▓▓▓▓▓▓┗━━━detour━━━▓▓▓▓▓▓▓▓▓▓▓┃│ ribbon hidden during the approach (§19.5 D)
│┃╭─────────────────────────────╮┃│
│┃│  ⤳  Take detour (+N min)    │┃│ BigActionButton primary 76 → 96 during the approach
│┃╰─────────────────────────────╯┃│
│┃ [ 🔊 Repeat ]   [ 🔇 Mute ]    ┃│ 76 each, 24 gap
└─────────────────────────────────┘
```
| Drive state | HUD (≤ 3 items) | Voice (01 §3.7 keys; 05 §25.4 plan) |
|---|---|---|
| Calm | `○` "No rise detected ahead" + "next crossing 1.0 km" | **silent** (never an "all clear") |
| WATCH ahead (drive 0 s) | `▲ WATCH` + "water rising upstream" + name | `chime_soft` → +450 ms `state.watch.tts` |
| AVOID ahead (66 s) | as wireframe + edge glow + Detour 96 | `chime` → +650 ms merged `drive.tts.multi_changed_*` + `state.avoid.tts` |
| CLOSED ahead | `▧ CLOSED` + "Turn around" + name | `state.closed.tts` |
| UNKNOWN ahead | `◌ UNKNOWN` + "no recent data · watch for water" | `drive.tts.unknown_ahead` |
| Offline (Director) | dashed pill "Data offline · 22 min" over the HUD | once: "FordCast is offline. Watch for water and barricades." |
| Detour taken (≈ 104 s) | calm HUD on the new route | silent |
| Arrived (≈ 412 s) | "Arrived · School" + `[End Drive Mode]` 76 | silent |
- **Layout algorithm (per class, §19.5 D):** fixed blocks = row A 76 · 12 · label 24 · 8 · HUD (212 two-line / 182 one-line) · 16 · Detour 76 (only when a detour exists and something ≥ WATCH is ahead) · 24 · Repeat/Mute 76 · 16. The remaining height is filled in priority order: (1) ribbon node 1 (48 + 16), (2) follow map if ≥ 120 pt (cap 220), (3) more ribbon nodes (48 each, max 3). **During the approach** the Detour grows +20 and the ribbon hides (the HUD already shows that crossing), so the map never disappears at the dramatic moment.
- `RouteRibbon` nodes: glyph 28 + distance (`num.md`) + `shortName` (1 line).
- **Buttons:** `[End]` → native `Alert` "End Drive Mode?" / "¿Terminar Modo manejo?" `[End]` `[Keep driving]` (no red); `[Repeat]` → `repeatLast()` (also VoiceOver magic tap), icon animates `variableColor` while speaking; `[Mute]` → `setMuted()` (chime + haptic still play), label toggles "Unmute" / "Activar voz". Large Content Viewer on all (cap 1.3).
- **Lockout dialog** (outside Drive Mode only, e.g. O3: search during the simulated drive): RN `Modal` + scrim, card `surface2` r24 padding 24: `drive.lockout.title` (title.md) → `PassengerHoldButton` 76 → `[Cancel]` 52. Never offered inside Drive Mode; Director "Lockout: Off" disables it for takes.
- **Simulated position** comes only from the scripted drive (05 §25.4); the follow map shows the car `◉` and the route; no user panning.
- **Done when (T09/T10):** at drive 66 s the edge glow fades in, the Detour grows, chime → TTS (+650 ms) → Error haptic in EN and ES; SIMULATED DRIVE is visible in every frame; nothing clips on SE (1 ribbon node, no map) or iPhone 16 (map strip).

### 18.13 Storms tab (`(tabs)/storms/index`, large title) [MUST-SHOW]
```
┌─────────────────────────────────┐
│ Storms                      [⚙] │
│ Simulated storms over real      │ caption: `storms.subtitle`
│ Austin low-water crossings.     │
│╭───────────────────────────────╮│ StormCard hero (C 220 · R 260 · T 300, auto height)
││▒SIMULATED STORM▒             ☂ ││ SimulatedBanner pill + rain glyph
││▒demo data · not live▒         ││
││Flash flood night              ││ title.sm
││Pre-dawn cloudburst over Oak   ││ body.md secondary (scenario subtitle)
││Hill                           ││
││ Upstream ╱╱╱      Road __╱    ││ LagPair thumbnail (R 56 · T 96; hidden on C)
││In this simulated storm,       ││ `demo.result` (body.md) — number from storyResults()
││FordCast warned 30 min before  ││
││water reached the road.        ││
││Median across 3 flooded        ││ `storms.card_median` caption
││crossings: 30 min.             ││
││[ ▶ Play ]  [ Drive this storm ││ primary + secondary; measured → stacked on N and in ES
││             (simulated) ]     ││
│╰───────────────────────────────╯│
│╭───────────────────────────────╮│ StormCard standard
││▒SIMULATED STORM▒ ...          ││
││Big Onion Creek storm          ││
││(simulated)                    ││
││In this simulated storm, …35 … ││
││[ ▶ Play ]                     ││
│╰───────────────────────────────╯│
│ How these storms are made ›     │ → settings/whats-real
└─────────────────────────────────┘
```
- Cards come from `SCENARIOS` where the scenario has storm results (`flash-flood-night` hero, `onion-creek-storm`); `calm-evening` and `drive-commute` aren't cards (drive = the hero card's second button). Numbers only from `storyResults()` (05 §26.2).
- `[▶ Play]` → `selectScenario(id)` + `router.push('/storm/'+id)` (zoom transition `Link.AppleZoom` from the card [Unverified into `fullScreenModal` → fallback: 240 ms fade-through]); `[Drive this storm (simulated)]` → `drive-mode` with the `drive-commute` script (05 §25.4).
- Copy: `storms.title` "Storms" / "Tormentas" · `storms.subtitle` "Simulated storms over real Austin low-water crossings." / "Tormentas simuladas sobre cruces bajos reales de Austin." · `storms.card_median` "Median across {{n}} flooded crossings: {{m}} min." / "Mediana en {{n}} cruces inundados: {{m}} min." · `cta.play` "Play" / "Reproducir" · `demo.drive_cta` (01) · `storms.how_made` "How these storms are made" / "Cómo se hacen estas tormentas".
- **Done when:** both cards render with engine numbers in EN/ES; buttons never truncate (stack instead); the banner is on every card.

### 18.14 Storm player (`storm/[id]`, fullScreenModal) [MUST-SHOW — signature]
```
┌─────────────────────────────────┐
│ [✕] ▒SIMULATED STORM          ▒ │ glass ✕ 44 + SimulatedBanner pill (flex), y = topY
│     ▒demo data · not live     ▒ │
│    (Avoid at Jones Road ·       │ StoryCaption glass pill (1 line; 2 at T1+), fades per beat
│     water usually takes 30–45…) │
│┃▓▓▓~~~~~»»»●→◆▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓┃│ map: camera fits gauge + reach + crossing (48 pt padding + panel inset)
│┃▓▓▓·▓▓▓▓▓▓▓▓▓▓▓▓▲▓▓▓▓▓▓▓▓▓▓▓▓▓┃│ · upstream gauge, »» pulse + wavefront dot, ◆ hero crossing
│┃▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓┃│ violet frame
│╭───────────────────────────────╮│ panel: surface1, r24, padding 16, bottom = safeBottom + 8
││(◆ AVOID) Williamson Creek at  ││ FocusRow 56: chip md · name (1 line) · window caption · ›
││Jones Rd · 15–30 min         › ││  tap → crossing sheet over the player
││ Upstream ╱╱╱│      Road __╱   ││ LagPair 96 (T 120; C: hidden, see below) with violet playhead
││ Storm time 7:00 AM  (60×▾) [⋯]││ title.sm tnum · speed menu · more menu
││ |━━▲━━◆━━━━●━━━━━━━━━━━━━━━━| ││ Scrubber 48 (ticks ▲ ◆ ▧ ◌ ● ⌀)
││ [−5]  [|◀]  ( ▶ )  [▶|]  [+5] ││ 56 row: step 48 · beat 48 · play 56
│╰───────────────────────────────╯│
└─────────────────────────────────┘
```
- **Opening:** the scenario is selected and paused at `playFromMin`; if `simMin < firstWatch − 10`, a chip `[Skip to the action]` / `[Ir a la acción]` appears above the panel (seeks to first Watch − 10 min). Autoplay is off when VoiceOver is on.
- **Speeds** (native `Menu` on `(60× ▾)`): 1× · 10× · 30× · 60× (default) · 120×; while auto-slow is active the label reads "10× auto" / "10× auto". **More `[⋯]`:** *Drive this storm (simulated)* · *Results* (after the hero onset) · *Auto-slow at key moments* (toggle).
- **Story captions** (from `storyboard()` + the onset tick; one at a time, 240 ms crossfade, stay until the next): `player.story.first_watch` "Upstream gauge rising · Watch at {{short}}" / "Sube el medidor río arriba · Precaución en {{short}}" · `player.story.first_avoid` "Above the trigger upstream · Avoid at {{short}}" / "Sobre el nivel de alerta río arriba · Evite en {{short}}" · `player.story.water` "Water reached the road (simulated) · {{short}}" / "El agua llegó al camino (simulado) · {{short}}" · `player.story.official` "Simulated road crew closed {{short}}" / "La cuadrilla vial simulada cerró {{short}}" · `replay.gauge_silent` (01 §3.7). Rates in captions always say "over the last 30 min".
- **Focus crossing:** the hero (`storyResults().crossingId`) by default; tapping another marker sets the focus (T11: Bluff Springs Rd). The FocusRow shows the crossing's chip + window or `LastKnownBadge`; the hydrograph/LagPair follow the focus crossing's primary gauge with the hatched gap band when silent.
- **Hero onset (● 7:30 AM):** tick drops + `uiHaptic('light')`; playback **auto-pauses**; 400 ms later `storm/results` presents at 0.62 with the count-up (§18.15). Closing results leaves the player paused at that moment.
- **C class:** LagPair collapses into a 32 pt chip "Upstream vs road ›" (tap → 120 pt overlay above the panel); the map keeps ≥ 330 pt (§19.4).
- **Closing `[✕]` while playing keeps the clock running** → Map Home shows the same storm with the violet frame + accessory (the "one clock" payoff, T05; §20.4).
- **VoiceOver:** banner read first; scrubber `adjustable` (±5 sim-min; value "Storm time 7:02 AM. Avoid issued at 7:00 AM."); magic tap = play/pause; announcements only for play/pause, Watch/Avoid issued, water on the road, gauge silent (05 §27.2).
- Copy: `player.close` "Close" / "Cerrar" · `player.skip` "Skip to the action" / "Ir a la acción" · `player.storm_time` "Storm time {{time}}" / "Hora de la tormenta {{time}}" · `player.speed` "{{s}}×" · `player.speed_auto` "{{s}}× auto" · `player.more` (a11y) "More" / "Más" · `player.results` "Results" / "Resultados" · `player.autoslow` "Auto-slow at key moments" / "Más lento en los momentos clave" · `player.lag_chip` "Upstream vs road" / "Río arriba vs. camino" · transport a11y `player.back5` "Back 5 minutes" / "Retroceder 5 minutos", `player.fwd5` "Forward 5 minutes" / "Avanzar 5 minutos", `player.prev_beat` "Previous event" / "Evento anterior", `player.next_beat` "Next event" / "Evento siguiente", `player.play` "Play" / "Reproducir", `player.pause` "Pause" / "Pausa".
- Measured fit (panel inner width = `W − 2g − 32`): "Storm time 7:00 AM" 186 pt + 8 + speed menu 72 + 8 + more 44 = 318 pt → fits from iPhone 16 (329) up, **not** SE/mini (311); ES "Hora de la tormenta 7:00 a. m." 281 pt → 413 pt fits nowhere. Rule: when the long row doesn't fit, show only the time (`player.storm_time_short` "{{time}}", `title.sm` tnum) and keep "Storm time …" in the a11y label (§19.5 E).
- **Done when (T03/T11):** 6:35 → 7:35 AM at 60× with auto-slow shows ▲ 6:45, ◆ 7:00 "15–30 min", the pulse reaching Jones Rd, ● 7:30 and the results sheet; T11 shows Bluff Springs ◌ "Last known: Avoid · 50 min ago" with the hatched band and the silent caption; the banner is visible in every frame.

### 18.15 Storm results (`storm/results`, formSheet [0.62, 1.0]) [MUST-SHOW]
```
┌─────────────────────────────────┐
│               ───               │
│ ▒SIMULATED STORM · demo data  ▒ │ SimulatedBanner strip (full width, 2 lines when needed)
│ IN THIS SIMULATED STORM         │ overline label.chip secondary
│            30 min               │ display.lg count-up (T: 56/60) + title.md unit
│ In this simulated storm,        │ `demo.result` body.lg (full sentence; the a11y label)
│ FordCast warned 30 min before   │
│ water reached the road.         │
│ Williamson Creek at Jones Road  │ caption
│ ◆ 7:00 ────── 30 min ────── ● 7:30│ mini timeline (Avoid → water), tnum
│ Simulated gauge data; the       │ `demo.result_honesty` body.md — always visible at 0.62
│ forecasting code is real and ran│
│ on this phone. Median warning   │
│ across the 3 crossings that     │
│ flooded in this storm: 30 min.  │
│ Example picked by a fixed rule: │ `demo.result_rule` caption
│ the crossing whose warning was  │
│ closest to the median.          │
│ ─ full detent ─                 │
│ Water arrived inside the window │ `demo.window_check_hit` / `_miss`
│ FordCast first showed (15–30    │
│ min).                           │
│ The simulated road crew closed  │ `demo.closure_gap` — shown only once storm time ≥ the closure
│ it 50 min after FordCast first  │
│ said Avoid.                     │
│ How accuracy will be measured   │ `demo.accuracy_planned` (caption)
│ (planned): real past Austin …   │
│ [ Drive this storm (simulated) ]│ secondary 48
│ [            Done             ] │ primary 52
│ FordCast is a supplementary tool│ DisclaimerFooter compact
└─────────────────────────────────┘
```
- Count-up 0 → `leadMin` over 900 ms `easing.countUp`, then scale 1 → 1.06 → 1 + `uiHaptic('medium')`; the honesty line fades in at +300 ms; VoiceOver hears the final sentence once (never the count). Reduce Motion: final number at once.
- The big number block is `display.lg` "30" + `title.md` "min" (key `results.unit` "min"); the full sentence is rendered once below it from `demo.result` so the number never appears without "in this simulated storm".
- **No POD/FAR/CSI tiles, no accuracy %** (01 §1.5 rule 4). Copy: `results.overline` "IN THIS SIMULATED STORM" / "EN ESTA TORMENTA SIMULADA" · `results.unit` "min" · `common.done` "Done" / "Listo".
- **Done when (T04):** at 7:55 AM all lines show with engine numbers (30 · n 3 · m 30 · gap 50 · inside 15–30); at 0.62 the count-up **and** the honesty line are visible on SE, iPhone 16 and Pro Max.

### 18.16 Alerts tab — Inbox | Saved (`(tabs)/alerts/index`, large title) [SHOULD-SHOW]
```
INBOX                                    SAVED
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│ Alerts                      [⚙] │     │ Alerts                      [⚙] │
│┌───────────────────────────────┐│     │ ( Inbox | Saved )               │
││ⓘ Notifications are off. Alerts││     │ You'll get Avoid and Closed     │ `saved.caption`
││  still appear here. [Turn on] ││     │ alerts for these crossings.     │
│└───────────────────────────────┘│     │ (◆ AVOID) Williamson Creek at   │ CrossingRow saved 72
│ ( Inbox | Saved )               │     │   Jones Road · 15–30 min     ⋯  │
│ FLASH FLOOD NIGHT · SIMULATED   │     │   Also alert me at Watch  [ ○]  │ Switch row 44 (blue track)
│ •▒SIM▒(▧ CLOSED · OFFICIAL)     │     │ (○ NO RISE) Westgate Blvd @     │
│   Williamson Creek at Jones Road│     │   Williamson Creek           ⋯  │
│   Simulated road crew reports it│     │   Also alert me at Watch  [ ○]  │
│   closed.             7:50 AM   │     │ On your Home → School route:    │ caption for route-seeded rows
│ •▒SIM▒(◆ AVOID) Williamson Creek│     │ Williamson Creek at Jones Road  │
│   at Jones Road                 │     └─────────────────────────────────┘
│   Likely flooded within 15–30   │
│   min.                7:00 AM   │ InboxRow: unread dot · SIMULATED chip · state chip · name ·
│ Alerts can arrive minutes late, │   body line · storm time (right, tnum)
│ and FordCast doesn't cover every│ footer `alerts.why_late`
│ road.                           │
└─────────────────────────────────┘
```
- **Inbox store** (`mobile/src/lib/alerts-inbox.ts`, zustand, in memory — cleared by Director Reset and on relaunch, like the demo store): one entry per notification the plan fires (foreground or lock-screen, 05 §25.3) — `{ id, crossingId, state, window, simMin, scenarioId, read }`. Entries appear even when iOS notifications are off (the banner explains). Sections = one per scenario run ("FLASH FLOOD NIGHT · SIMULATED"), newest first; times are **storm times**. Badge = unread AVOID/CLOSED; viewing the Inbox marks visible rows read.
- **Saved store** (`mobile/src/lib/saved.ts`, persisted in kv-store): seeded with the crossings on the Home → School route that the hero scenario subscribes (`atx-37`); `[Notify me]` adds/removes; "Also alert me at Watch" per crossing (off; disabled with a hint until Settings → Notifications → Watch alerts is on). The notification plan must use this set — **cross-file note for 05 §22.9/§25.1:** `planNotifications(cmp)` reads `scenario.subscriptions`; pass `savedIds` + `watchAlerts` from these stores instead (seeded identically, so every take is unchanged).
- Row tap → `crossing/[id]`. Swipe left / ⋯ / long-press menu → "Stop alerts" → native confirm "Stop alerts for {{name}}?" `[Stop alerts]` `[Cancel]` (never red).
- **Empty Inbox:** `EmptyState` `bell` "No alerts yet" + `alerts.empty` (01 §3.7). **Empty Saved:** `bookmark` "No saved crossings yet" + "Save crossings you drive through to get warnings." + `[Find crossings]` (→ `nearby`).
- `CapabilityBanner notificationsOff` (only when iOS permission is denied/not granted): "Notifications are off. Alerts still appear here." / "Las notificaciones están apagadas. Los avisos siguen apareciendo aquí." `[Turn on]` → primer or `Linking.openSettings()`.
- Copy: `alerts.title` "Alerts" / "Alertas" · `alerts.seg_inbox` "Inbox" / "Recibidos" · `alerts.seg_saved` "Saved" / "Guardados" · `alerts.section` "{{storm}} · SIMULATED" / "{{storm}} · SIMULADO" · `saved.caption` "You'll get Avoid and Closed alerts for these crossings." / "Recibirá avisos de Evite y Cerrado para estos cruces." · `saved.watch_optin` "Also alert me at Watch" / "Avisarme también en Precaución" · `saved.watch_hint` "Turn on Watch alerts in Settings first." / "Primero active los avisos de Precaución en Configuración." · `saved.route_seed` "On your Home → School route" / "En su ruta Casa → Escuela" · `saved.stop_confirm` "Stop alerts for {{name}}?" / "¿Desea dejar de recibir avisos de {{name}}?" · `alerts.no_alerts_title` "No alerts yet" / "Todavía no hay alertas" · `saved.empty_title` "No saved crossings yet" / "Todavía no hay cruces guardados".
- **Done when:** after T03 the Inbox shows the 7:00 AM Avoid entry (and 7:50 Closed after T04) with SIMULATED chips; the tab badge counts them; Reset empties the Inbox.

### 18.17 The one clock on every tab [MUST-SHOW]
While a scenario is selected (anything but `calm-evening`): every map shows the violet frame + wash; the FreshnessPill is violet; the accessory/mini-bar is on every tab; every list chip and sheet reflects `displayAt()` at the current tick; Drive tab verdicts and the Inbox update live. Paused clock = everything static (the accessory shows `[▶]`). Director Reset or "Calm evening" returns every surface to the calm look (no violet anywhere).
**Done when:** with a storm playing, switching through all four tabs shows the same storm time in the accessory and consistent states on every screen (no tab shows a stale tick).

### 18.18 Settings (`settings/*`, modal page sheet with an inner native Stack) [SHOULD-SHOW; Language MUST-SHOW]

#### 18.18.1 Index (SwiftUI `Form`)
```
┌─────────────────────────────────┐
│ Settings                   Done │ large title; Done = text button
│ GENERAL                         │
│ 🌐 Language           English ⌄ │ Picker menu: Device language · English · Español
│ ALERTS & DRIVING                │
│ 🔔 Notifications               ›│
│ 🚗 Drive Mode                  ›│
│ ♿ Accessibility                ›│
│ ABOUT THIS DEMO                 │
│ ☑ What's real in this demo     ›│ checklist
│ ⓘ How FordCast works           ›│
│ 📖 About & credits             ›│
│ 📄 Legal & disclaimer          ›│
│ Version 1.0.0 · demo build      │ footer
└─────────────────────────────────┘
```
```tsx
// mobile/src/app/settings/index.tsx (sketch) — names verified in @expo/ui@57.0.25; navigation rows VERIFY BEFORE USE
import { Host, Form, Section, Picker, Button, Text } from '@expo/ui/swift-ui';
import { tint, pickerStyle, scrollContentBackground, listRowBackground, tag } from '@expo/ui/swift-ui/modifiers';
const ROW = listRowBackground('#152033');
<Host style={{ flex: 1, backgroundColor: '#0E1726' }} colorScheme="dark">
  <Form modifiers={[scrollContentBackground('hidden'), tint('#6CB4FF')]}>
    <Section title={t('settings.general')}>
      <Picker label={t('settings.language')} systemImage="globe" selection={lang} onSelectionChange={setLanguage}
        modifiers={[pickerStyle('menu'), ROW]}>
        <Text modifiers={[tag('system')]}>{t('settings.language_device')}</Text>
        <Text modifiers={[tag('en')]}>English</Text><Text modifiers={[tag('es')]}>Español</Text>
      </Picker>
    </Section>
    <Section title={t('settings.alerts_driving')}>
      <Button label={t('settings.notifications')} systemImage="bell" onPress={() => router.push('/settings/notifications')} modifiers={[ROW]} />
      {/* … drive, accessibility; ABOUT THIS DEMO: whats-real, how-it-works, about, legal */}
    </Section>
  </Form>
</Host>
```
- Navigation rows are SwiftUI `Button`s that call `router.push` (rows show no system chevron; add a trailing `chevron.right` via `HStack` if `@expo/ui` exposes it cleanly). VERIFY BEFORE USE on the device: row height ≥ 44, Dynamic Type, VoiceOver reads "Notifications, button". **Fallback:** an RN grouped list (`SettingsList`: inset sections `surface1` r10, 44 pt rows, SF icon 20 + `body.lg` + trailing value/chevron) with the same content — record which one shipped.
- Language change order (05 §27.3): persist → `i18n.changeLanguage()` → `clearVoiceCache()` → announce `settings.language_changed` "Language changed to Español" / "Idioma cambiado a Español". Also reachable by **long-pressing the gear** (menu *English ✓ · Español · Demo Director · How FordCast works*) — the 3 s language flip in the video.
- Dropped rows (nothing meaningful with simulated data): Units, Appearance, Privacy, Data sources (folded into What's real), Accuracy (results + What's real).

#### 18.18.2 Notifications (SwiftUI `Form`)
Rows: status `LabeledContent` "iOS notifications" → "On" / "Off" (+ `[Turn on in iOS Settings]` when off) · Toggle "Avoid & Closed alerts" (on; turning off asks "You won't be warned about likely flooding on your saved crossings." `[Turn off]` `[Keep on]`) · Toggle "Watch alerts" (off) · Toggle "Updates when water goes down" (on; the passive update) · Button "Send a test alert" → local notification title `alerts.test_title` "TEST · FordCast alert" / "PRUEBA · Aviso de FordCast", subtitle `demo.notify.subtitle`, body `alerts.test` "This is a test. No crossing has changed." / "Esto es una prueba. Ningún cruce ha cambiado." · footer `alerts.why_late` + "Alerts in this demo are made on this phone from simulated storms." / "Los avisos de esta demostración se crean en este teléfono a partir de tormentas simuladas."

#### 18.18.3 Accessibility (SwiftUI `Form`)
FEEDBACK: Haptics · Sounds · Spoken alerts (toggles) · Voice speed `Slider` 0.8–1.2 step 0.05 (label "0.95×") · Button "Play a sample" ("This is how FordCast sounds." / "Así suena FordCast."). DISPLAY: Animations `Picker` segmented System · Full · Reduced · Increase contrast · Show the list first · Show zoom buttons (toggles). Footer: "FordCast also follows iOS Larger Text, Bold Text, Reduce Motion, Reduce Transparency and VoiceOver." / "FordCast también sigue Texto más grande, Texto en negrita, Reducir movimiento, Reducir transparencia y VoiceOver de iOS." Every change applies live.

#### 18.18.4 Drive Mode (SwiftUI `Form`)
VOICE: `LabeledContent` "Voice" → "English · Enhanced" (from `pickVoice()`); missing Spanish voice → "No Spanish voice is installed. Add one in iOS Settings → Accessibility → Spoken Content → Voices." / "No hay una voz en español instalada. Agréguela en Configuración → Accesibilidad → Contenido leído → Voces." [menu path Unverified on iOS 26/27 — VERIFY BEFORE USE]; `drive.silent_tip`. DRIVER LOCKOUT: explanatory text "While the car is moving, typing and list browsing are locked outside Drive Mode. Passengers can unlock by holding a button. In this demo the speed comes from the simulated drive." LOCATION: Toggle "Use my real location" (off; [BUILD-ONLY], cut #4) → location primer.

#### 18.18.5 How FordCast works (`settings/how-it-works`, RN + Skia) [SHOULD-SHOW — the video's "tools" beat]
```
┌─────────────────────────────────┐
│ ‹ Settings   How FordCast works │
│  ·  ① Gauges upstream           │ vertical 5-step diagram; a 2 pt cyan line links the steps;
│  │    Real USGS stream-gauge    │ an 8 pt cyan dot travels ① → ⑤ in 2,400 ms (loops ≤ 3×, then rests at ⑤)
│  │    sites. In this demo their │
│  │    readings are simulated.   │
│  ~  ② River network             │
│  │    Each crossing is linked to│
│  │    the gauges upstream of it.│
│  ⏱  ③ Travel time              │
│  │    Water usually takes 30–45 │ travel range of atx-37 read from data (never typed)
│  │    min to get here.          │
│  ▲  ④ Risk state               │ glyph morphs ○ → ▲ → ◆ when the dot arrives
│  │    Watch, Avoid, Closed or   │
│  │    Unknown — never "safe".   │ (allow-listed negation key)
│  ▯  ⑤ Your phone               │
│       The forecast rule runs on │
│       this phone: alerts, map,  │
│       Drive Mode.               │
│ What's real in this demo ›      │
└─────────────────────────────────┘
```
Keys `howitworks.step1–5.title|body` (EN as above; ES: "Medidores río arriba · Sitios reales de medidores del USGS. En esta demostración sus lecturas son simuladas." · "Red de ríos · Cada cruce está vinculado a los medidores río arriba." · "Tiempo de viaje · {{travel.range}}" · "Estado de riesgo · Precaución, Evite, Cerrado o Desconocido; nunca «seguro»." · "Su teléfono · La regla de pronóstico se ejecuta en este teléfono: avisos, mapa, Modo manejo."). `howitworks.step4.body` (EN and ES) joins `allowKeys` in `banned-words.json` (it contains the negation "never \"safe\"" / "nunca «seguro»"). Each step = one VoiceOver stop; Reduce Motion → static diagram.

#### 18.18.6 What's real in this demo (`settings/whats-real`, RN) [MUST-SHOW, ~3 s end flash]
```
┌─────────────────────────────────┐
│ ‹ Settings  What's real         │
│ The water is simulated. The     │ intro body.lg (key `whatsreal.intro`)
│ forecasting code is real and    │
│ runs on this phone.             │
│ REAL                            │
│ ⚙ The forecast logic runs on    │ WhatsRealRow: SF 20 · title headline · body caption · badge
│   this phone          (Built)   │   badge "Built" = 1 pt #6B7890 outline, text #B4BFD0
│ …                               │
│ SIMULATED                       │
│ 💧 Every gauge reading and every │   badge "Demo data" = 1 pt #B69CFF outline, text #B69CFF
│   storm             (Demo data) │
│ …                               │
│ PLANNED                         │
│ ⏳ Gauge readings straight from  │   badge "Planned" = 1 pt dashed #8A97AB
│   USGS every few minutes        │
│                      (Planned)  │
│ Crossing locations: City of     │ attribution footer (01 §3.8)
│ Austin open data (ATXfloods)…   │
└─────────────────────────────────┘
```
Rows = 06 §31.3 table (source `mobile/src/content/whats-real.ts`, each with `claimId`; test-checked against `docs/CLAIMS.md`). Badges are **never** status colors. Copy: `whatsreal.title` "What's real in this demo" / "Qué es real en esta demostración" · `whatsreal.intro` (above) / "El agua es simulada. El código de pronóstico es real y se ejecuta en este teléfono." · groups `whatsreal.real|simulated|planned` "Real" · "Simulated" · "Planned" / "Real" · "Simulado" · "Planeado" · badges `badge.built|demo|planned` "Built" · "Demo data" · "Planned" / "Hecho" · "Datos de demostración" · "Planeado".

#### 18.18.7 About & credits (`settings/about`, RN) [BUILD-ONLY]
App icon 64 (triple-tap → Director, 05 §24.1) · "FordCast" `display.md` · tagline · "Version 1.0.0 · built {{date}}" · "An independent student project for the 2026 Congressional App Challenge." · CREDITS (01 §3.8 attribution lines, one per row) · `[Replay introduction]` (re-opens onboarding; pledge state kept) · "Legal & disclaimer ›".

#### 18.18.8 Legal & disclaimer (`settings/legal`, RN) [BUILD-ONLY]
`legal.about` full text (01 §3.8) + `DisclaimerFooter full`. `body.lg`, reading width, scrolls.

**Done when (§18.18):** every row opens a working screen (no blank, no "coming soon"); toggles persist and are VoiceOver-operable; no green toggle anywhere (the `tint` check); Language flips UI, notifications and TTS.

### 18.19 Demo Director (`demo`, formSheet [0.5, 1.0]) — visuals [BUILD-ONLY]
Layout, controls and actions are owned by **05 §24.2–§24.6**; this is the visual spec so it meets the design bar if a judge opens it:
- Background `#0E1726`; sections in `surface1` cards (r20, padding 16, 12 gap); section titles `label.chip` tertiary (SCENARIO · TAKES · TRANSPORT · SIMULATE · RECORDING · STATUS).
- Scenario radio rows 56 pt: radio 22 pt (selected = `#6CB4FF` ring + ice dot), title `headline`, subtitle `caption` with the engine's computed beat ("warned 30 min early").
- Take chips: 36 pt pills `surface2`, `label.lg`, wrap with 8 gaps; the last-loaded take = inverse pill; expected-state caption below in `num.sm` `#B4BFD0` (hidden in clean mode).
- Transport: 76 pt buttons (`backward.fill`, `gobackward.5`, `play.fill`/`pause.fill`, `goforward.5`, `forward.fill`) + the same `Scrubber` as the player + speed segmented (1× · 10× · 30× · 60× · 120×).
- Toggles: RN rows with native `Switch` (`trackColor={{ true: '#6CB4FF' }}`, never green) or SwiftUI `Toggle` with `tint`.
- Status line `num.sm` tertiary: "events a1b2c3d4 · compile 9 ms · glass liquid · built Oct 21 · rebuild by Oct 28".
- Header: "Demo Director" `title.md` + `[Reset]` secondary (never red).

### 18.20 Notifications: Lock Screen, banner, in-app [MUST-SHOW lock screen]
iOS draws them (app icon + "FordCast" + time); content from 05 §25.2 (title ≤ 50, body ≤ 150, `subtitle` = "Simulated storm · demo data", `interruptionLevel: 'active'`).
```
LOCK SCREEN (T06, phone locked, ≈ 8 s after arming)        LONG-PRESS / EXPANDED
┌─────────────────────────────────────┐                     ┌─────────────────────────────────────┐
│ [icon] FORDCAST                 now │                     │ [icon] FORDCAST                 now │
│ Avoid Williamson Creek at Jones Road│ title (bold)        │ Avoid Williamson Creek at Jones Road│
│ Simulated storm · demo data         │ subtitle            │ Simulated storm · demo data         │
│ Likely flooded within 15–30 min. Use│ body (≤ 4 lines)    │ Likely flooded within 15–30 min. Use│
│ another route. Never drive into     │                     │ another route. Never drive into     │
│ water.                              │                     │ water.                              │
└─────────────────────────────────────┘                     │ [optional attachment: 600 × 400     │
                                                            │  night-map snapshot of the crossing]│
                                                            └─────────────────────────────────────┘
```
- **Recording setup** (06 §30.1): Show Previews **Always**; a "Recording" Focus that allows only FordCast; Scheduled Summary off. The Lock Screen's big clock shows real time — frame the shot on the notification.
- **Tap → Face ID → app:** the response handler seeks the clock to `data.simMin` and pushes `crossing/<id>` at peek over Map Home (05 §25.3) — the sheet shows exactly what the notification announced (T07).
- **Foreground:** when the app is open, iOS shows its banner at the top. To avoid two banners for the same event, the handler returns `shouldShowBanner: false` (still `shouldShowList: true`) **when the in-app AlertBanner or that crossing's sheet is visible** — **cross-file note for 05 §25.3** (`setNotificationHandler` currently always shows the banner; add `isInAppAlertVisible(data.crossing_id)` from the UI store).
- **Optional attachment [SHOULD, cut first]:** `attachments` with a 600 × 400 PNG snapshot of the crossing on the night map (Skia/`makeImageSnapshotAsync` of a static map card); if the write fails, post without it [field Verified in expo-notifications 57 types; behavior Unverified].
- No custom notification sound (system default); no "SIMULATED" title prefix (titles stay ≤ 50 chars; the subtitle carries the label).

### 18.21 Live Activity + Dynamic Island [NEXT — SHOULD-SHOW only if the 02 §10.3 spike signs and runs]
Only if the spike passes on Wed Oct 21 (02 §10.3); otherwise this is a "Planned" row in What's real and nothing in the app references it.
```
compactLeading: [octagon glyph]   compactTrailing: "15–30m"   minimal: [octagon glyph]
expanded:  [◆] AVOID                         15–30 min      banner (Lock Screen):
           Williamson Creek at Jones Road                    FordCast · SIMULATED          as of 7:00
           Upstream +4.5 ft over the last 30 min             [◆] Avoid · Williamson Creek at Jones Road
                                                             Likely flooded within 15–30 min. Never drive into water.
```
- `expo-widgets` layout keys `banner, compactLeading, compactTrailing, minimal, expandedLeading, expandedCenter, expandedTrailing, expandedBottom` [Verified: research-ui §3.11]. SF Symbols allowed here (custom SVG can't render): `exclamationmark.triangle.fill` / `exclamationmark.octagon.fill` / `xmark.octagon.fill` / `questionmark.circle`. **No running timer, ever.** `staleDate` = now + 15 min wall time → `isStale` turns everything slate with "Data may be outdated · check FordCast". First line always "FordCast · SIMULATED". SE and 13 mini have no Dynamic Island (banner only).

### 18.22 Global error, empty, loading and capability states [BUILD-ONLY]

| Case | UI (EN / ES) |
|---|---|
| Scenario compiling (first frame) | no markers; card "Loading crossings…" / "Cargando cruces…" — never a calm chip |
| Map style / tiles unavailable | land background + FordCast layers; banner `errors.map_details` "Map details unavailable" / "Detalles del mapa no disponibles" |
| Simulated offline (Director) | §18.4 D: pill "Data offline · {{age}}", every crossing Unknown with "Last known" |
| Gauge silent | §18.6 UNKNOWN variant + `ic-gauge-silent` + hatched band |
| Unknown crossing id (deep link) | sheet shows "This crossing isn't in FordCast's list." / "Este cruce no está en la lista de FordCast." |
| Notifications denied | Alerts `CapabilityBanner`; Settings row "Off" + [Turn on in iOS Settings] |
| Location denied (optional toggle) | toggle off + "Location is off…" row (§18.3); demo unaffected |
| Missing Spanish voice | Drive start panel + Settings tip; chime + haptic + visual still alert |
| JS error (route error boundary) | `errors.root` "Something went wrong. FordCast can't show crossing status right now. Obey barricades and official warnings." / "Algo salió mal. FordCast no puede mostrar el estado de los cruces en este momento. Respete las barricadas y las alertas oficiales." `[Try again]` `[Back to map]`; in Drive Mode also speaks once "FordCast stopped. Watch for water and barricades." — never a blank or calm screen |
| Empty search / Inbox / Saved | `EmptyState` variants (§18.8, §18.16) — never "all clear" |

### 18.23 Deep links & notification landing [MUST-SHOW via T07]
`fordcast://crossing/<id>` → Map Home underneath (camera eases to the crossing — the only time the camera moves for a non-tap reason, because the user tapped a notification) + `crossing/[id]` at its initial detent. Cold start uses the last notification response (05 §25.3). The scenario clock seeks to `data.simMin` **before** the sheet renders, so its first frame already shows the announced state.

---
## §19. iPhone fit matrix (SE → Pro Max, Dynamic Type)

**Rule zero:** never hard-code a device. Every value comes from `useWindowDimensions()` + `useSafeAreaInsets()` + the classes below; the table only exists to compute the worked checks and pick test devices.

### 19.1 Devices and classes

| Device | W × H (pt) | safeTop / safeBottom | Class | Source |
|---|---|---|---|---|
| iPhone SE (3rd gen) | 375 × 667 | 20 / 0 (home button) | **C · N** | [Unverified: read at runtime] |
| iPhone 13 mini | 375 × 812 | 50 / 34 (notch) | R · N | [Unverified] |
| iPhone 16 | 393 × 852 | 59 / 34 (Dynamic Island) | R · W | [Unverified] |
| iPhone 17 | 402 × 874 | 62 / 34 | R · W | [Verified: useyourloaf.com "iPhone 17 Screen Sizes" (research-ui §2.1)] |
| iPhone Air | 420 × 912 | ? / 34 | T · W | [Unverified: px ÷ 3] |
| iPhone 16 Plus | 430 × 932 | 59 / 34 | T · W | [Unverified] |
| iPhone 16/17 Pro Max | 440 × 956 | 62 / 34 | T · W | [Unverified] |

**Test set (minimum):** SE 3 (C·N) + iPhone 16 or 17 (R·W) + Pro Max (T) — real iPhone for whichever the student owns, Xcode Simulator for the rest (Xcode 27's Device Hub can also resize a simulated device to arbitrary sizes [Verified: research-ios §5 Phase G]). Screenshots for fit review may come from the Simulator; the video comes from the real iPhone.

### 19.2 `mobile/src/lib/layout.ts` (classes, gutters, zones, detents)
```ts
// mobile/src/lib/layout.ts — the only place device geometry is interpreted (tests: __tests__/layout.test.ts)
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
export type HeightClass = 'C' | 'R' | 'T'; export type WidthClass = 'N' | 'W'; export type TypeTier = 0 | 1 | 2 | 3;
export const heightClass = (H: number): HeightClass => (H < 700 ? 'C' : H < 900 ? 'R' : 'T');
export const widthClass = (W: number): WidthClass => (W < 390 ? 'N' : 'W');
export const typeTier = (fs: number): TypeTier => (fs >= 2.643 ? 3 : fs >= 1.786 ? 2 : fs >= 1.353 ? 1 : 0);  // RN fontScale (03 §13.9)
export const gutter = (W: number) => (W >= 428 ? 20 : 16);
export const PEEK_CONTENT: Record<HeightClass, number> = { C: 286, R: 306, T: 306 };   // crossing peek stack (§18.6)
export const HYDRO_H: Record<HeightClass, number> = { C: 120, R: 140, T: 160 };
const ceil2 = (x: number) => Math.ceil(x * 100 - 1e-9) / 100;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export function crossingDetents(H: number, safeBottom: number, hc: HeightClass, tier: TypeTier) {
  if (tier >= 2) return { detents: [1.0], initial: 0, undimmed: 'none' as const };
  if (tier === 1) return { detents: [0.8, 1.0], initial: 0, undimmed: 0 };
  const peek = ceil2(clamp((PEEK_CONTENT[hc] + safeBottom) / H, 0.3, 0.48));
  const half = ceil2(clamp((PEEK_CONTENT[hc] + 83 + HYDRO_H[hc] + safeBottom) / H, 0.55, 0.8));   // 83 = label + gaps + travel line
  return { detents: [peek, half, 1.0], initial: 0, undimmed: 1 };
}
export function useLayout() {
  const { width: W, height: H, fontScale } = useWindowDimensions(); const insets = useSafeAreaInsets();
  const hc = heightClass(H), wc = widthClass(W), tier = typeTier(fontScale), g = gutter(W);
  const topY = insets.top + (hc === 'C' ? 6 : 8);
  return { W, H, insets, hc, wc, tier, g, topY,
    pillMax: W - 2 * g - 104,              // FreshnessPill long form allowed when measured ≤ this
    cardInner: W - 2 * g - 32,             // AreaStatusCard / player panel content width
    cardMax: (tabZone: number) => 0.42 * (H - insets.top - tabZone) };
}
// Tab zone (space taken by the tab bar + accessory) — VERIFY BEFORE USE on Day 2: log useSafeAreaInsets().bottom inside a
// NativeTabs screen with the accessory hidden/shown. If the inset already includes the bar, tabZone = insets.bottom;
// else fallback = 49 + deviceSafeBottom (+ 56 when the accessory/mini-bar shows) [Unverified constants; research-ui §2.2].
```
`__tests__/layout.test.ts` asserts the §19.4 detent numbers for the seven devices and the class boundaries (699/700, 899/900, 389/390).

### 19.3 Measured text widths (Inter 4, tracking applied) [Verified: calc]
Measured with `tools/measure-text.mjs` (opentype.js 1.3.4 over the `@expo-google-fonts/inter@0.4.2` TTFs; advance widths with kerning + tracking × characters). On-device text can differ by a few points (shaping, `tnum`), so every layout still **measures at runtime**; these numbers set the rules.

| String (variant) | EN pt | ES pt |
|---|---|---|
| Card buttons "Check my drive" / "Drive Mode" (`label.lg`) | 111.4 / 82.1 | "Revisar mi ruta" 106.3 / "Modo manejo" 97.0 |
| FreshnessPill demo "updated 2 min ago" (`label.lg`) | 132.3 | "actualizado hace 2 min" 163.7 |
| Scenario pill "SIMULATED · 7:00 AM storm time" / short | 239.0 / 159.1 | 303.5 / 161.8 |
| DEMO chip text (`label.chip`) | 41.8 | 41.8 |
| Area headline (`headline`) | 287.0 | "No se detecta crecida río arriba cerca de usted" 373.4 |
| Supporting line long / short (`caption`) | 409.8 / 280.8 | short "12 medidores · 17 cruces · hace 2 min" 228.3 |
| Card footer (`caption`) | 412.0 (2 lines everywhere) | 463.9 (2 lines) |
| Hero name "Williamson Creek at Jones Road" (`title.lg` / `headline` / `drive.secondary`) | 417.2 / 257.5 / 360.8 | same (never translated) |
| "Likely flooded within" + "15–30 min" (`status.word` + `num.xl`) | 174.6 + 186.3 (= 369 on one line) | "Probablemente inundado en" 238.7 |
| "Water may already be on the road" (`status.word`) | 285.7 | "Puede que ya haya agua en el camino" 317.9 (1 line: peek text width is `W − 2g` ≥ 343) |
| Peek actions "Detour +2 min" / "Notify me" (`label.lg`) | 100.8 / 69.4 | "Desvío +2 min" 101.3 / "Avisarme" 67.8 |
| Banner lines "SIMULATED STORM" (`label.chip`) / "demo data · not live" (`caption`) | 136.7 / 120.0 | 158.7 / 232.4 |
| One-line banner "SIMULATED STORM · demo data · not live" (`label.chip`) | 311.8 | 478.0 |
| Accessory line 1 "SIMULATED · 7:00 AM" (`callout`) | 167.5 | 170.4 |
| Storm card "Big Onion Creek storm (simulated)" (`title.sm`) | 320.8 | "Gran tormenta en Onion Creek (simulada)" 387.9 |
| "Drive this storm (simulated)" (`label.lg`) | 197.0 | 240.1 |
| Player clock "Storm time 7:00 AM" (`title.sm`) | 186.1 | "Hora de la tormenta 7:00 a. m." 281.1 |
| Drive HUD word "AVOID" / "PRECAUCIÓN" (`drive.primary`) · "15–30" (`display.xl`) | 101.5 · 154.6 | "EVITE" 90.1 / "PRECAUCIÓN" 207.9 |
| Chips at `md` incl. glyph + padding | NO RISE 98 · WATCH 96 · AVOID 88 · CLOSED 98 · UNKNOWN 118 | 132 · 135 · 83 · 110 · 147 |

### 19.4 Per-screen fit rules and the computed detents

**Crossing sheet detents** (from `crossingDetents`, T0):

| Device | peek (pt) | half (pt) | full |
|---|---|---|---|
| SE (C) | **0.43** (287) | **0.74** (494) | 1.0 |
| 13 mini | 0.42 (341) | 0.70 (568) | 1.0 |
| iPhone 16 | 0.40 (341) | 0.67 (571) | 1.0 |
| iPhone 17 | 0.39 (341) | 0.65 (568) | 1.0 |
| Air | 0.38 (347) | 0.64 (584) | 1.0 |
| 16 Plus | 0.37 (345) | 0.63 (587) | 1.0 |
| Pro Max | 0.36 (344) | 0.61 (583) | 1.0 |
These replace B2's fixed 0.32 peek (clipped the action row by 25 pt on iPhone 16 and 51 pt on SE [Verified: calc, research-ui §2.5 B]) and refine 01 §4.1's "0.62 (SE 0.70)" half so the **whole hydrograph and the travel line** fit at half. VERIFY BEFORE USE (Day 4): RNS numeric detents are fractions of the window height including the bottom safe area [Unverified] — render a 1 pt marker at the end of the peek stack and confirm it's visible above the home indicator on SE and iPhone 16; if not, add the measured difference to `PEEK_CONTENT`.

| Screen | C (SE) | R (mini · 16 · 17) | T (Air · Plus · PM) | Never |
|---|---|---|---|---|
| Map Home top band | pill long EN ✓ (216 ≤ 239), ES short; scenario pill short | demo long EN ✓; ES long from 16 (248 ≤ 257); scenario short | scenario long EN on Plus/PM (277 ≤ 286/296); ES short | "…" in a pill |
| Map Home card | auto height, max 251; supporting line hidden; buttons without icons (EN 311.5 > 311) | max 285–306; supporting line short form; icons on 16/17 (EN 311.5, ES 321.3 ≤ 329) | max 322–341; icons | shrinking text; truncated footer |
| Control stack | drop `[⌕]` when it would hit the banner | full | full | overlap with banner or card |
| AlertBanner | collapses to a 44 pt pill after 8 s | full banner persists (AVOID/CLOSED) | same | under the Dynamic Island |
| `nearby` | [0.55, 0.92] → 367 / 614 pt; rows 72 (auto at T1+) | same fractions | same | truncated status word/window |
| Crossing sheet | detents above; window number `num.lg` 28/32 (peek 286) | `num.xl`; peek 306 | same; hydrograph 160 | clipped action row at peek |
| Drive tab | inline title; chips scroll | large title | large title, gutter 20 on Plus/PM | wrapping chips |
| drive/result | map 38 % H; card scrolls; sticky actions 52 + 8 + 76 | map 45 % | map 45 % | hidden sticky actions |
| Drive Mode | 1 ribbon node, no map; approach: ribbon hidden | mini: 2 nodes, no map; 16/17: 1 node + map 139–158 pt | 1–2 nodes + map 196–220 pt | > 3 items per glance |
| Storms hero card | ~220, no LagPair thumb, buttons stacked | ~260, thumb 56 | ~300, thumb 96 | truncated button label |
| Storm player | LagPair → chip; map ≥ 330 pt; clock short | LagPair 96; clock long EN from 16 | LagPair 120 | banner missing in any frame |
| Results | count-up + honesty visible at 0.62 (≈ 383 of 413 pt) | same | number 56/60 | number wrapping |
| Onboarding | illustration 140 | 200 | 240 | body > 40 words |
| Settings | native Form rows ≥ 44 | same | same | green toggles |

### 19.5 Worked checks (the math behind the rules)
- **A — Card buttons** (inner = `W − 2g − 32`: SE/mini 311 · 16 329 · 17 338 · Air 356 · Plus 358 · PM 368): with icons (17 + 6) and padding 2 × 16: EN 166.4 + 137.1 + 8 = **311.5**, ES 161.3 + 152.0 + 8 = **321.3**; without icons EN 265.5, ES 275.3. ⇒ SE/mini: no icons (both languages); 16 and up: icons. T1 (× 1.353, no icons): EN 333.8 ⇒ stacked on SE/mini and 16, side by side from 17; ES 347.0 ⇒ stacked on SE/mini/16/17, side by side on Air/Plus/Pro Max.
- **B — Top band** (`pillMax` = SE/mini 239 · 16 257 · 17 266 · Air 284 · Plus 286 · PM 296): demo long = chip 54 + 6 + text + 24 → EN 216.3, ES 247.7; scenario long = dot 8 + 6 + text + 24 → EN 277.0, ES 341.5; short forms 161.6–199.8 ⇒ table in §19.4.
- **C — Crossing peek/half** (§18.6 stacks): R/T peek = 14 + 44 + 8 + 68 + 4 + 70 + 6 + 20 + 12 + 48 + 12 = **306**; C = 10 + 44 + 6 + 68 + 2 + 58 + 4 + 20 + 10 + 48 + 10 = **280** (+6 spare = 286); half adds 16 + 18 + 8 + hydrograph + 8 + 21 + 12 = **83 + hydrograph**.
- **D — Drive Mode** (usable = `H − safeTop − safeBottom`: SE 647 · mini 728 · 16 759 · 17 778 · Air ≈ 816 · Plus 839 · PM 860): fixed with a detour slot and a 2-line name = 76 + 12 + 24 + 8 + 212 + 16 + 76 + 24 + 76 + 16 = **540** ⇒ flexible SE 107 · mini 188 · 16 219 · 17 238 · Air 276 · Plus 299 · PM 320 (+30 with a 1-line name). Fill: ribbon node 1 (64) → map if ≥ 120 (16: 139, 17: 158, Air 196, Plus 219, PM 220 cap) → more nodes. Approach: Detour +20 and the ribbon hides ⇒ 16: map 183 ✓; SE: nothing extra ✓.
- **E — Player clock row** (panel inner = `W − 2g − 32`): EN long 318 ⇒ from iPhone 16 up; ES long 413 ⇒ never ⇒ time-only form with "Storm time" in the a11y label.
- **F — Storms hero buttons** (inner 311–368): "Play" with icon 85.5 + "Drive this storm (simulated)" 229 + 8 = 322.5 > 311 ⇒ stacked on N, side by side from iPhone 16; ES "Reproducir" 134 + 272.1 + 8 = 414 ⇒ stacked everywhere.
- **G — Banners:** the one-line banner (311.8 EN + 24) barely fits SE's 343 and never fits in ES ⇒ the 2-line `SimulatedBanner` (§12.5 of 03) is used everywhere; widest line ES 232.4 + 24 = 256 ⇒ fits every class next to a 44 pt `[✕]` (SE: 375 − 32 − 52 = 291).

### 19.6 Dynamic Type tiers (apply to every screen)

| Tier | `fontScale` | Layout response |
|---|---|---|
| T0 | < 1.353 | designed layouts above |
| T1 | 1.353–1.785 (XXXL) | rows stack (name → chip → window); button icons hidden; paired buttons stack when measured too wide; card supporting line hidden; hydrograph adds a 1-line numeric summary; crossing sheet detents `[0.80, 1.0]` |
| T2 | 1.786–2.642 (AX1–AX2) | single column; Map Home card compact; crossing sheet full only; charts → summary + "Show readings"; legend plain list; onboarding illustrations hidden |
| T3 | ≥ 2.643 (AX3–AX5) | Map Home opens `nearby` at 0.92 (list-first); decorative glyphs hidden; every screen scrolls; buttons allow 2-line labels with `minHeight` 52 |
Capped elements (03 §13.9) always show the Large Content Viewer. At AX5 a 17 pt headline renders at 60.7 pt — design for it, don't fight it.

### 19.7 Test protocol & Done when (§19)
- **Matrix:** {SE, iPhone 16 or 17, Pro Max} × {EN, ES} × {T0, T1 (XXXL), T3 (AX3)} × the [MUST-SHOW] screens (Map Home calm + storm, crossing peek/half, drive/result, Drive Mode approach, Storms tab, player, results, pledge, What's real) — 9 screens × 18 combinations, captured on the Simulator with `xcrun simctl io booted screenshot` (Release build) into `docs/media/screens/<screen>-<lang>-<class>-<tier>.png`.
- **Pass:** no clipped or truncated status word, window, button label, crossing name (except the documented 2-line ellipsis for 3 off-camera names at peek), honesty label or footer; nothing under the Dynamic Island, home indicator or tab bar; every custom target ≥ 44 pt (gallery overlay); the blur tier (iOS 18 Simulator) and solid tier (Reduce Transparency) both look finished.
- **Done when:** the matrix is captured and reviewed on Day 8 (01 §6), failures fixed or logged in `docs/devlog.md` with the rule that was applied; `layout.test.ts` passes.

---

## §20. Signature moments (frame by frame) + the polish list

All times below are the engine's verified outputs (05 §22.6, §24.4); wall times assume the stated speed. Motion values are 03 §15.4.

### 20.1 Launch "arrival" (video 0:18–0:28) [MUST-SHOW]
| t (ms) | What happens |
|---|---|
| 0 | native splash `#0E1726` + Dip glyph (76 pt) |
| first layout | JS `ArrivalOverlay` (pattern from the template's `AnimatedSplashOverlay`: Reanimated `Keyframe` + `scheduleOnRN`) replaces it pixel-identically, then `SplashScreen.hideAsync()` |
| 0 → 600 | cyan creek path trims 0 → 1 into the dip (Skia `Path end`) |
| 360 → 600 | "FordCast" (`display.md`) fades in and rises 8 pt |
| 480 → 720 | tagline fades in |
| 1,100 → 1,400 | overlay crossfades out **while** the map camera eases z 9.8 → 10.5 over 1,200 ms (decelerate) onto the calm map |
| RM | static logo, 300 ms fade, no camera move |

### 20.2 The calm map that is alive but never reassuring (T01, 0:28–0:38)
DEMO pill steady; gauge ripples every 12 s (staggered per gauge by 1.5 s so they never pulse together); creeks at 50 %; slate rings; the card reads "No upstream rise detected near you". One slow pinch-out in the take shows the clusters resolve into crossings at z 13 with Noto labels. No green, no check marks, no "all clear".

### 20.3 "The warning arrives first" — storm player (T03, 0:50–1:20) [MUST-SHOW]
Scenario `flash-flood-night`, Director seeks to 6:35 AM, 60× with auto-slow (10× within ± 5 min of each beat).
| Frame | Storm time | Viewer sees | Motion / haptic / a11y |
|---|---|---|---|
| Fr0 | 6:35 | player opens: banner, camera fits Brush Country gauge + Williamson Creek reach + Jones Rd (48 pt padding + panel inset); clock "6:35 AM" tnum | banner A18; camera 600 ms |
| Fr1 | 6:35 → 6:45 | calm crossing ○, hydrograph climbing toward the dashed 6.0 ft trigger, rain glyph on the caption | — |
| Fr2 | **6:45** | ○ → ▲ (sprite pop + ripple), ▲ tick on the scrubber, caption "Upstream gauge rising · Watch at Jones Road", creek turns active cyan + glow | A3; `safetyHaptic('watch')`; announce |
| Fr3 | **7:00** | gauge passes its trigger (dashed line highlights once 0.4 → 1 → 0.6), ▲ → ◆, AVOID halo pulses ×3, FocusRow "(◆ AVOID) … 15–30 min", caption "Above the trigger upstream · Avoid at Jones Road", ◆ tick; the **water pulse starts** at the gauge (`pulseProgress` > 0) | A9, A3, A4; `safetyHaptic('avoid')`; announce high; foreground notification per 05 §25 (system banner, §18.20 rule) |
| Fr4 | 7:00 → 7:30 | the pulse head + wavefront dot travel down the reach (p = (t − t_trigger)/τ_median, 05 §26.2); the ◆ already sits at the crossing — **the warning is visibly ahead of the water** | A5 (30 fps) |
| Fr5 | **7:30** | the dot reaches the crossing, fades 200 ms; ● "water reached the road (simulated)" appears; ● tick; bracket ◆ → ● fills violet @ 0.35 over 400 ms; caption "Water reached the road (simulated) · Jones Road"; playback auto-pauses | `uiHaptic('light')` |
| Fr6 | +400 ms | `storm/results` rises at 0.62; count-up 0 → **30** (900 ms) → pop + `uiHaptic('medium')`; honesty line at +300 ms | A12 |
| RM | — | no pulse/halo; static flow arrows + caption "Water usually takes 30–45 min to get here"; final number at once | — |
The engine, not the animation, changes states (the pulse never moves a marker; 05 §26.3). Edit cuts 6:35–6:45 and 7:05–7:25 (06 §29).

### 20.4 One clock (T05, 1:30–1:36) [MUST-SHOW]
Tap `[✕]` while paused at 7:02 → the player dismisses (system modal slide) → Map Home is already in the storm: violet frame + pill "SIMULATED · 7:02 AM", AlertBanner for Jones Road, ▲ Westgate, ▲ Manchaca & Jones, ▲ Jimmy Clay, accessory "● SIMULATED · 7:02 AM · Flash flood night". No reload, no flash: the same store drives both screens.

### 20.5 Lock screen → sheet (T06 → T07, 1:36–1:46) [MUST-SHOW]
Director "Lock-screen take" (seek 6:59, pause, schedule 8 s) → press the side button → ≈ 8 s → banner on the Lock Screen (§18.20) → tap → Face ID → app opens on Map Home with the clock at 7:00 → crossing peek rises (stagger A15) showing ◆ AVOID "15–30 min" → drag to half: the hydrograph draws on (A7) with the trigger line and "Water usually takes 30–45 min to get here".

### 20.6 Detour reveal (T08, 1:46–1:57) [MUST-SHOW]
| t (ms) | Frame |
|---|---|
| 0 | tap `[⤳ Detour +N min]` → `drive/result` pushes |
| 0 → 600 | camera `fitBounds` (route ∪ detour) with padding from header and card |
| 0 → 600 | commute route draws on (`line-gradient` progress 0 → 1) |
| 600 → 900 | blocked ± 300 m segment at Jones Rd appears dashed `#FF5470` with one opacity flash 0.4 → 1 |
| 500 → 1,100 | detour draws on in route blue on real streets |
| 1,100 | "Detour +N min" pill pops (`spring.pop`) + `uiHaptic('light')` + `arrow.triangle.branch` bounce; card text fades in |
| RM | everything drawn at once |

### 20.7 Drive Mode heads-up (T09/T10, 1:57–2:10) [MUST-SHOW]
`drive-commute` from 6:58:54 at 1×. Drive 0 s: ▲ Jones Rd 1.0 km ahead → `chime_soft` → +450 ms "Heads up. Water is rising upstream of Williamson Creek at Jones Road. Plan another route." → Warning. **Drive 66 s (7:00 AM):** Jones Rd → AVOID and Manchaca & Jones → WATCH on one tick → edge glow fades in (200 ms, then static) → Detour 76 → 96 (`spring.snappy`) → ribbon hides → `chime` → +650 ms "2 crossings ahead changed. Avoid Williamson Creek at Jones Road. Flooding likely soon. Take another route." → Error haptic; the follow map shows the car ≈ 470 m before the crossing. ≈ 104 s: the scripted driver turns at the branch → calm HUD, silent. T10 = the same in Spanish ("Cambiaron 2 cruces adelante. Evite Williamson Creek en Jones Road. Inundación probable pronto. Tome otra ruta.").

### 20.8 Unknown, never "safe" (T11, 2:10–2:15) [MUST-SHOW]
`onion-creek-storm` at 5:50 AM, paused, Bluff Springs Rd focused: the Twin Creeks gauge dot turns into the dashed `ic-gauge-silent` ring; the hydrograph shows the hatched "No data" band; the marker becomes `ic-unknown-lastavoid`; FocusRow "(◌ UNKNOWN) Bluff Springs Rd @ Onion Creek · Last known: Avoid · 50 min ago"; caption "Onion Ck at Twin Creeks Rd went silent. Its readings only arrived later, so FordCast shows Unknown here."; `safetyHaptic('unknown')` (no sound).

### 20.9 The polish list — 30 details with exact values
| # | Detail | Spec |
|---|---|---|
| 1 | Launch arrival | §20.1 timings; no system-font or white flash |
| 2 | Calm life | gauge ripple r 4 → 14, opacity 0.35 → 0, 1,200 ms, every 12 s, staggered 1.5 s per gauge; stops at first WATCH+ |
| 3 | Night map finish | POIs/shields hidden; road labels from z13; Noto halo 1.5 `#0B1320`; creeks z10 1.5 → z15 3 @ 0.5; edge fades top `#0B1320` @ 0.55 → 0 over `safeTop + 72`, bottom 0 → 0.45 over 160 |
| 4 | Marker escalation | sprite pop 0.6 → 1.0 `spring.pop` + ripple 1 → 2.2×, 0.5 → 0, 900 ms; AVOID halo 1 → 1.8 × 3 (2,000 ms) then static 0.25; selected ring 3 pt ice r 24 + Noto Bold 13 name |
| 5 | Water wavefront | head 12 % of reach, width 6, blur 1; glow +7 pt @ 0.30 blur 6; 10 pt dot + 2 pt `#0B1320` ring + 18 pt glow @ 0.35; fades 200 ms at the crossing |
| 6 | Hydrograph draw-on | trim 700 ms; area from +300; now-dot +700; rate badge +800; trigger highlight 600 ms once |
| 7 | Window bracket | slides 240 ms once per tick; never continuous |
| 8 | Rolling numbers | digits roll 240 ms, 30 ms stagger, `tnum` |
| 9 | Typography rhythm | 4 pt grid; ≤ 3 sizes and ≤ 2 weights per card; en-dash ranges; UPPERCASE only in chips (+0.6) |
| 10 | Card → sheet continuity | grabber hint 36 × 5 `#3A4D6E`; pan up > 24 pt or velocity < −500 pt/s presents `nearby`; card follows ≤ 24 pt, dims to 0.92, springs back |
| 11 | Sheet stagger | chip 0 / title +40 / window +80 / meta +120 / actions +160 ms; 160 ms fade + 8 pt rise each |
| 12 | AlertBanner | slide 12 pt + fade 240 ms; left bar grows 200 ms; chip pops; Error haptic on frame 0; C-class pill after 8 s |
| 13 | Detour reveal | §20.6 |
| 14 | Drive Mode entry | Medium haptic → 400 ms fade through `#070D18` → HUD stagger 60 ms → +500 ms "Drive Mode on. FordCast will speak." |
| 15 | Follow map | z 15, pitch 0, `easeTo` every 1 s (800 ms), gestures off, height per §19.5 D |
| 16 | Storm clock & ticks | `title.sm` tnum; ticks pop in with 2 pt stems; scrub haptic every 15 sim-min |
| 17 | "30 min" reveal | bracket fill 400 ms; count-up 900 ms `Easing.out(cubic)`; pop 1 → 1.06 → 1; honesty +300 ms |
| 18 | Empty states | `ContentUnavailableView`, symbol hierarchical `#8A97AB`, one action; never "all clear" |
| 19 | Glass finish | 44 pt circles, 20 pt semibold symbols, `GlassContainer spacing 8`, native interactive press |
| 20 | Tab bar + accessory | SF pairs; tint `#F2F5FA`; inactive `#8A97AB`; badge `#C62828` only for unread AVOID/CLOSED; accessory 2-line content §17.2 |
| 21 | Onboarding scenes | P1 water line 0 → 40 % of the dip over 3 s ×3; P2 dot 2.4 s then ○ → ▲ → ◆ 300 ms apart; P3 legend pops 80 ms steps; pledge enable crossfade 200 ms |
| 22 | App icon | Icon Composer 4 layers (03 §14.5); checked at 29/40/60 pt in Default/Dark/Clear/Tinted |
| 23 | Permission primer | hero symbol variableColor ×2; pinned buttons; title focused first |
| 24 | Believable *and* honest data | real ATXfloods names/locations, real USGS gauge names (no numbers), routes on real streets, generic Home/School pins, every time minute-floored storm time |
| 25 | Map ornaments | `logo={false}`, `compass={false}`, attribution ⓘ 8 pt above the card (computed) |
| 26 | Sound & voice | chime −3 dBFS / soft −9 dBFS; TTS +650/+450 ms; Enhanced voices installed; rate 0.95 |
| 27 | Touch overlay | 44 pt ring, 2 pt ice @ 0.9, fill @ 0.18, 80 ms in, 300 ms out (05 §24.3) |
| 28 | Spanish pass | every MUST screen in ES on SE at XXXL; nothing truncates (buttons stack); native reviewer signs off |
| 29 | VoiceOver beat | crossing header reads "Avoid. Williamson Creek at Jones Road. Likely flooded within 15 to 30 minutes. Use another route." |
| 30 | Capture hygiene | Release build; Focus allows only FordCast; Silent off; brightness ~70 % fixed; Low Power off; Wi-Fi on and tiles warmed; QuickTime 9:41 status bar (06 §30) |

### 20.10 Done when (§20)
- Recording T01–T11 from the Director reproduces §20.1–§20.8 frame for frame on the iPhone (Release), in EN and ES where the take is bilingual.
- Every polish item is checked off in `docs/devlog.md` on Day 8 with a screenshot or a 3 s clip; any skipped item is listed with its reason.
- With Reduce Motion on, every signature moment still reads (states, captions, numbers) without loops.
