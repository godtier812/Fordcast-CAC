# FordCast — Expo App Stack, UI Templates, and Import Plan (verified 2026-10-14)

**Role:** Staff React Native / Expo engineer. **Scope:** which phone-app stack to use and which UI templates/components to import so FordCast looks premium quickly, verified for **Expo SDK 57**.
**How claims were checked:** every version below came from `npm view` / `npm pack` against the registry on 2026-10-14. Expo behavior came from the **Expo docs source at expo/expo `main` @ d3bbf62 (2026-10-14)**, the **`sdk-57` branch @ 6b0b556 (2026-10-13)**, and the published `expo@57.0.28` tarball (`bundledNativeModules.json`).
Tags: **[Verified: …]** gives the source. **[Unverified]** means the claim could not be confirmed, and a safe fallback is given with it.

---

## 0. Decisions at a glance

| # | Decision | Pick | Why (1 line) | Runner-up |
|---|---|---|---|---|
| 1 | SDK | **Expo SDK 57 (`expo@~57.0.28`)**, frozen through judging | Latest stable SDK. RN 0.86.3 / React 19.2.3. SDK 58 is in beta and will drop SDK 57 from store Expo Go. | SDK 54 lane, **only** if the builder's only device is an iPhone (§16) |
| 2 | Scaffold | `npx create-expo-app@latest fordcast-app --template default@sdk-57` | Exact SDK 57 pin. Expo Router 57, `src/app`, NativeTabs example, TS strict, and **AGENTS.md + `.claude/settings.json`** for the coding agent | `npx @react-native-reusables/cli@latest init` (template is still on SDK 56, so it needs an upgrade) |
| 3 | Styling engine | **NativeWind 4.2.7** (Tailwind **3.4.19**) | Stable and still patched (Sep 2026). Explicit Reanimated 4 support. JS-only, so it runs in Expo Go. AI agents know it best | Uniwind 1.12.2 (Tailwind v4, MIT, JS-only) |
| 4 | Component kit | **React Native Reusables (RNR)**: shadcn/ui for RN, copy-paste, MIT | We own every file, so it restyles to FordCast tokens with no fight. CLI `add`. 30 components | HeroUI Native 1.0.10 (Apache-2.0, Uniwind-based) |
| 5 | Navigation | **Expo Router 57**: `NativeTabs` (5 tabs) + root `Stack` (formSheet / fullScreenModal) | Native tab bar (Material 3 on Android, Liquid Glass on iOS 26), works in Expo Go | `expo-router/js-tabs` (JS tabs, fully custom styling) |
| 6 | Map | **react-native-maps 1.27.2** | **Included in Expo Go**, no key needed in Expo Go, `customMapStyle` dark JSON (Android) + `userInterfaceStyle="dark"` (iOS) | expo-maps 57.0.4 (alpha, **not** in Expo Go) |
| 7 | Map sheet | **@gorhom/bottom-sheet 5.2.14** (non-modal, persistent, snap points) | Pure JS (Reanimated + RNGH), so it runs in Expo Go. Map stays interactive underneath. Has an official **Map example** (MIT) to import | Expo Router `formSheet` route (used for `crossing/[id]` deep links) |
| 8 | Animation | **react-native-reanimated 4.5.1 + react-native-worklets 0.10.1** (incl. CSS animations), **RNGH ~2.32.0** | SDK-57-pinned and in Expo Go. Reanimated 4 CSS animations replace Moti | — (Moti not recommended) |
| 9 | Graphics/charts | **@shopify/react-native-skia 2.6.2** hand-rolled for **Risk Ring + Sparkline + Water Pulse**. **victory-native 42.0.1** for the full **Hydrograph** (axes + press-to-scrub) | Skia is in Expo Go and runs at 60 fps. Victory XL needs Skia ≥2.6.0 <3 (✓) | react-native-gifted-charts 1.4.81 (SVG) |
| 10 | Lists | **@shopify/flash-list 2.0.2** (+ gorhom `useBottomSheetScrollableCreator`) | Pure JS v2, in Expo Go | `BottomSheetFlatList` |
| 11 | Icons | **lucide-react-native 1.57.0** (RNR `Icon` wrapper). Tab icons via NativeTabs `sf`/`md` props. Custom status glyphs in **react-native-svg 15.15.4** | RNR default, ISC/MIT, JS-only | phosphor-react-native 3.0.6 |
| 12 | Toasts | **sonner-native 0.27.0** | JS-only (Expo Go). Peer range accepts worklets 0.10 (0.26.0 does **not**) | burnt 0.13.0 (native, so dev build only) |
| 13 | Server state | **@tanstack/react-query 5.104.2** + persist-client/async-storage-persister 5.104.2 | Caching, retries, offline restore | — |
| 14 | Client state | **zustand 5.0.15** (persist to `expo-sqlite/kv-store`) | Tiny, works with React 19 | — |
| 15 | Local storage | **expo-sqlite ~57.0.4** (`kv-store` + SQL tables for the offline risk cache) | In Expo Go. Sync KV API | react-native-mmkv 4.3.2 (Nitro, **not** in Expo Go) |
| 16 | Backend client | **@supabase/supabase-js 2.117.3** (PostgREST + Realtime) | Reads status directly from Supabase, so a sleeping Render API never blocks the map | — |
| 17 | i18n | **i18next 26.4.4 + react-i18next 17.0.16 + expo-localization ~57.0.2** | EN/ES strings and spoken alerts | — |
| 18 | Testing | **jest-expo ~57.0.6 + Jest 29 + @testing-library/react-native 14.1.0**, **Maestro** E2E (`appId: host.exp.Exponent` in Expo Go) | Official Expo path | RNTL 13.3.3 if RNTL 14 breaks |
| 19 | Builds | **EAS Build free tier**: Android **APK** (`distribution: internal`) for dev build + judges. **EAS Update** for OTA | No Mac needed for Android | Local `npx expo run:android` (Android Studio) |
| 20 | Crash reporting | **@sentry/react-native ~7.11.0**: **Stretch** | Works in Expo Go for JS errors only | none |

---

## 1. Expo SDK 57: verified facts

| Item | Value | Source |
|---|---|---|
| Latest Expo | `expo@57.0.28` (`latest` and `sdk-57` dist-tags). Published 2026-10-12 | [Verified: npm view expo dist-tags] |
| SDK 57 release date | `57.0.0` published 2026-06-30 | [Verified: npm view expo time] |
| React Native | **0.86.3** | [Verified: expo@57.0.28 bundledNativeModules.json] |
| React / React DOM | **19.2.3** | [Verified: bundledNativeModules.json] |
| react-native-web | ~0.21.0 | [Verified: bundledNativeModules.json] |
| New Architecture | Always on. Legacy Architecture was removed in SDK 55 and SDK 54 was the last SDK with it. Template `gradle.properties` has `newArchEnabled=true`, `hermesEnabled=true`, `edgeToEdgeEnabled=true` | [Verified: expo-57 template.tgz; search summary of expo.dev/changelog/sdk-55] |
| Minimum Android | **Android 7+ (API 24)**. compileSdk **36**, targetSdk **36**, build-tools 36.0.0 | [Verified: expo/expo `packages/@expo/sdk-compatibility/src/sdk-compatibility.json`; docs test `utils.test.ts`] |
| Minimum iOS | **iOS 16.4+**. Xcode **≥ 26.4** | [Verified: same registry] |
| Node | **≥ 22.13.0** | [Verified: same registry] |
| TypeScript in template | `typescript ~6.0.3`, `@types/react ~19.2.2` | [Verified: expo-template-default@57.0.30 package.json] |
| Default template features | `src/app` layout, `expo-router/entry`, `experiments.typedRoutes: true`, `experiments.reactCompiler: true`, NativeTabs (`expo-router/unstable-native-tabs`), `@expo/ui`, `expo-glass-effect`, `expo-symbols` | [Verified: expo-template-default@57.0.30] |
| create-expo-app flags | `--template` (`default`, `blank`, `blank-typescript`, `tabs`, `bare-minimum`, or `name@sdk-XX`), `--example`, `--yes`, `--no-install`, **`--no-agents-md`** (by default it generates **AGENTS.md** + `.claude/settings.json` for the Expo skills plugin) | [Verified: create-expo@5.0.3 source + docs `more/create-expo.mdx`] |
| SDK prompt | Interactive `create-expo-app` asks **"Latest (SDK 57)"** vs **"For learning with Expo Go (SDK N)"**, where N = SDK of **store** Expo Go. Pinning `--template default@sdk-57` skips the prompt | [Verified: create-expo@5.0.3 `promptSdkVersion.ts`] |
| Known regressions | `expo@57.0.17` moved to RN 0.86.3 and fixed the SDK 56 Hermes V1 memory regression (Reanimated/Worklets apps). The changelog also mentions a dev-startup regression, so check "Known Regressions" on the changelog | [Verified: search summary of expo.dev/changelog/sdk-57] — we are on 57.0.28 |
| `expo prebuild` | Now clears and regenerates native dirs by default (CNG). Do **not** hand-edit `android/`/`ios/` | [Verified: search summary of SDK 57 changelog] |

### 1.1 SDK 55 → 56 → 57: what matters for the UI

| SDK | Change relevant to FordCast | Source |
|---|---|---|
| 55 | Legacy Architecture removed. NativeTabs compound API (`NativeTabs.Trigger.Icon/Label/Badge`), `md` prop for Android Material Symbols. `Stack.Toolbar` on iOS. Form-sheet `flex: 1` works with numeric detents on iOS. `expo-blur` stable on Android (needs `BlurTargetView`) | [Verified: docs `router/advanced/native-tabs.mdx`, `stack-toolbar.mdx`, `modals.mdx`, `v57 sdk/blur-view.mdx`] |
| 56 | **Expo Router forked React Navigation**: app code must import from `expo-router/react-navigation`, `expo-router/js-stack`, `expo-router/js-tabs`, `expo-router/js-top-tabs`, **not** `@react-navigation/*` (bundler error). Library imports from node_modules are auto-rewritten as a temporary shim. **@expo/ui SwiftUI + Jetpack Compose stable**. **expo-widgets (iOS) stable**. `Stack.Toolbar` on Android | [Verified: docs `router/migrate/sdk-55-to-56.mdx`; search summary of expo.dev/changelog/sdk-56] |
| 57 | RN 0.86 (no intended breaking changes), Android edge-to-edge fixes, light/dark emulation in RN DevTools, newer Reanimated/Worklets/RNGH. `Tabs` from `'expo-router'` **deprecated**, use `expo-router/js-tabs` | [Verified: search summary of SDK 57 changelog; expo-router@57.0.26 `build/exports.d.ts`] |
| 58 (beta, **avoid**) | Beta announced 2026-09-15 (3–4 weeks), RN **0.88**, React 19.3.0, compileSdk 37. `expo-router/native-tabs` (non-"unstable"). Router state changes. **Store Expo Go moves to SDK 58 and drops SDK 57** | [Verified: npm `expo@next` = 58.0.9; sdk-compatibility.json; docs `router/migrate/sdk-57-to-58.mdx`; search summary of expo.dev/changelog/sdk-58-beta] |

### 1.2 UI building blocks available in SDK 57

| Feature | Package / API | Expo Go? | Notes |
|---|---|---|---|
| Native tabs (Liquid Glass on iOS 26, Material 3 on Android) | `expo-router/unstable-native-tabs` → `NativeTabs`, `NativeTabs.Trigger`, `.Trigger.Icon` (`sf`, `md`, `src`, `drawable`), `.Trigger.Label`, `.Trigger.Badge`. Props `backgroundColor`, `indicatorColor`, `iconColor={{default,selected}}`, `labelStyle={{default,selected}}`, `minimizeBehavior`, `rippleColor`, `labelVisibilityMode` | **Y** | **Max 5 tabs on Android. Tab-bar height can't be measured. No nested native tabs. Limited FlatList integration** [Verified: docs native-tabs "Known limitations"; expo-router@57.0.26 `native-tabs/types.d.ts`] |
| Form sheet with detents | `Stack.Screen options={{ presentation: 'formSheet', sheetAllowedDetents: [..] \| 'fitToContents', sheetInitialDetentIndex, sheetGrabberVisible, sheetCornerRadius, sheetLargestUndimmedDetentIndex, sheetExpandsWhenScrolledToEdge, sheetElevation }}` | **Y** | Android: **max 3 detents**. **No native header** inside the sheet, so render the title yourself. `unstable_sheetFooter` is Android-only experimental [Verified: docs `router/advanced/modals.mdx`; native-stack `types.d.ts`] |
| Stack toolbar | `Stack.Toolbar` (`placement="left/right/bottom"`, `Stack.Toolbar.Button`) | **Y** | iOS SDK 55+, Android SDK 56+ [Verified: docs `stack-toolbar.mdx`] |
| Protected routes | `<Stack.Protected guard={bool}>` | **Y** | Use it for the onboarding gate [Verified: docs `protected.mdx`; expo-router@57 `views/Protected.d.ts`] |
| Liquid glass | `expo-glass-effect ~57.0.4`: `GlassView`, `isLiquidGlassAvailable()`, `isGlassEffectAPIAvailable()` | **Y** (via expo-router dep) | **iOS 26+ only**, falls back to a plain `View` elsewhere, so give it a fallback background. Don't animate `opacity` to 0 [Verified: v57 `sdk/glass-effect.mdx`] |
| SF Symbols / Material Symbols | `expo-symbols ~57.0.3` `SymbolView name={{ios, android, web}}` | **Y** | **Beta** [Verified: v57 `sdk/symbols.mdx`] |
| SwiftUI / Jetpack Compose | `@expo/ui ~57.0.23` (`@expo/ui/swift-ui`, `@expo/ui/jetpack-compose`, universal, `@expo/ui/community/bottom-sheet` drop-in for gorhom API) | **Y** | The community BottomSheet wraps a **modal** sheet that dims the map, so **not** for the persistent map sheet. Optional for native Settings controls [Verified: v57 `sdk/ui/*`; npm exports] |
| Widgets / Live Activities | `expo-widgets ~57.0.24` | **N** | **iOS only**. Needs a dev build + paid Apple account, so **Roadmap** [Verified: v57 `sdk/widgets.mdx`] |
| Expo Maps | `expo-maps ~57.0.4` | **N** | **Alpha**, "frequent breaking changes", so **don't use** [Verified: v57 `sdk/maps.mdx`] |
| Mesh gradient | `expo-mesh-gradient ~57.0.2` | **Y** | Optional onboarding hero background |

---

## 2. Expo Go reality check (most important section)

### 2.1 Facts

1. **Expo Go on the Apple App Store stops at SDK 54. SDK 55 and later are not available there.** [Verified: docs `troubleshooting/expo-go-version-mismatch.mdx`, main @ 2026-10-14]
2. A physical iPhone on SDK 55–57 needs **`eas go`** (builds Expo Go and ships it to *your* TestFlight internal team), which **requires a paid Apple Developer Program membership**. [Verified: same doc; search summary of expo.dev/go]
3. **Android / Android Emulator / iOS Simulator**: install the matching Expo Go from **expo.dev/go**, with the **`expo-go` CLI** (`npx expo-go download android <version>`, `expo-go@0.2.0`), or let `npx expo start` → press **`a`** install it. "The Google Play version can also lag behind." [Verified: docs `develop/tools.mdx`, mismatch doc; npm view expo-go]
4. **Each Expo Go build supports exactly one SDK.** When SDK 58 ships, "latest" Expo Go becomes 58 and **won't open an SDK 57 project**. [Verified: mismatch doc; SDK 58 beta summary]
5. **Physical iOS + Expo Go now requires** Expo CLI and Expo Go **signed in to the same Expo account** (`npx expo login`). Android is unaffected. [Verified: docs `troubleshooting/expo-go-sign-in-required.mdx`]
6. The iOS Simulator requires a **Mac**.

### 2.2 Strategy for a builder with no Mac and no paid Apple account

**Primary (recommended): SDK 57, Android-first.**
- **Dev loop:** Android phone (Android 7+) **or** Android Studio Emulator on Windows/Linux/Mac. Use **Expo Go for SDK 57** installed by `npx expo start` → `a` (or `npx expo-go download android 57`; **[Unverified]** exact version-arg format, fall back to the expo.dev/go page and pick SDK 57). **Do not** install Expo Go from Google Play (it may be a different SDK).
- **Native-only features** (background geofencing, remote push, custom icon/splash, Google Maps key): **EAS Build free tier → `development` profile → APK**, install via QR, run `npx expo start --dev-client`. No Mac required. [Verified: docs `build/internal-distribution.mdx`: internal distribution makes an APK]
- **Demo day / judges:** **`preview` profile APK** (standalone, no Metro, no Expo Go). Internal-distribution URLs are open to anyone with the link by default. [Verified: same doc] This also protects against a Play-Store Expo Go auto-updating to SDK 58 during judging.
- **iOS:** treated as "compiles, untested by builder" unless someone with a paid account runs `eas go` or an iOS build. Keep iOS-only polish (Liquid Glass, SF Symbols) behind platform checks with Android-tested fallbacks.
- **EAS free plan:** 15 Android + 15 iOS builds/month, low-priority queue [Verified: search summary of expo.dev/pricing + docs.expo.dev/billing/plans; one page phrases it as "30 builds", so treat the exact split as **[Unverified]**]. Budget: ~4 dev builds + ~4 preview builds max. Use **EAS Update** for JS-only changes.

**Fallback (only if the builder's only device is an iPhone): SDK 54 lane.** See §16.

### 2.3 Feature matrix: Expo Go (SDK 57, Android) vs dev build

| FordCast feature | Package | Expo Go | Dev build (APK) | Degradation in Expo Go |
|---|---|---|---|---|
| Live map + crossing pins + creek lines | react-native-maps 1.27.2 | **Y** (no API key needed) | Y (**needs `androidGoogleMapsApiKey`**) | — |
| Dark map | `customMapStyle` (Android), `userInterfaceStyle="dark"` + `mapType="mutedStandard"` (iOS) | Y | Y | — |
| Crossing sheet / list | @gorhom/bottom-sheet | Y | Y | — |
| Native tabs, form sheets | expo-router 57 | Y | Y | — |
| Risk ring, sparkline, hydrograph | Skia 2.6.2 / victory-native 42 | Y | Y | — |
| Haptics | expo-haptics | Y | Y | — |
| Spoken alerts EN/ES | expo-speech | Y | Y | — |
| Keep screen awake in Drive Mode | expo-keep-awake | Y | Y | — |
| Offline risk cache | expo-sqlite | Y | Y | — |
| Realtime status updates | supabase-js Realtime (WebSocket) | Y | Y | — |
| **Local** notifications | expo-notifications | Y | Y | — |
| **Remote push** | expo-notifications + Expo Push | **N on Android** (since SDK 53) | Y (needs FCM credentials) | Foreground Realtime + local notification |
| Foreground location / proximity | expo-location `watchPositionAsync` | Y | Y | — |
| **Background location / geofencing** | expo-location + expo-task-manager | **N** (iOS: "not supported in Expo Go". Android: "Foreground and background services are not available in Expo Go") | Y | **Drive Mode foreground proximity alerts** + banner "Background alerts need the FordCast app build" |
| Periodic background refresh | expo-background-task (≥15 min on Android) | Partial [Unverified in Go] | Y | Refresh on foreground |
| OTA updates | expo-updates | Simulated only | Y | — |
| Native crash reports | @sentry/react-native 7.11 | JS errors only ("Offline caching, native errors features are not available in Expo Go") | Y | — |
| App icon / splash | expo-splash-screen | Expo Go's own | Y | — |
| iOS widgets / Live Activities | expo-widgets | **N** | iOS + paid account | Roadmap |

Sources: [Verified: v57 docs `sdk/location.mdx`, `sdk/notifications.mdx`, `sdk/map-view.mdx`, `sdk/background-task.mdx`, `sdk/updates.mdx`; `sdk-57` branch `apps/expo-go/package.json` (Expo Go native modules); @sentry/react-native@7.11.0 `dist/js/sdk.js`]

**Expo Go SDK 57 ships these third-party native modules** (so they are safe to use in Go): `@expo/ui`, `@react-native-async-storage/async-storage 2.2.0`, `@react-native-community/datetimepicker ^9.1.0`, `netinfo 12.0.1`, `slider 5.2.0`, `masked-view 0.3.2`, `picker 2.11.4`, `segmented-control 2.5.7`, `@shopify/react-native-skia 2.6.2`, `@stripe/stripe-react-native 0.64.0`, `lottie-react-native ^7.3.8`, `react-native-gesture-handler ~2.32.0`, `react-native-keyboard-controller ^1.21.9`, `react-native-maps 1.27.2`, `react-native-pager-view 8.0.2`, `react-native-reanimated 4.5.1`, `react-native-safe-area-context 5.7.0`, `react-native-screens 4.26.0`, `react-native-svg 15.15.4`, `react-native-view-shot 4.0.3`, `react-native-webview 13.16.1`, `react-native-worklets 0.10.1`, plus ~60 `expo-*` modules (incl. location, notifications, sqlite, speech, haptics, image, blur, linear/mesh-gradient, network, localization, task-manager, background-task, updates, router). [Verified: expo/expo `sdk-57` branch `apps/expo-go/package.json`]

### 2.4 Graceful-degradation design (code the agent should write)

```ts
// src/lib/capabilities.ts
import { isRunningInExpoGo } from 'expo';          // [Verified: expo@57.0.28 build/Expo.d.ts]
import { Platform } from 'react-native';

export const IS_EXPO_GO = isRunningInExpoGo();
export const caps = {
  backgroundGeofencing: !IS_EXPO_GO && Platform.OS !== 'web',
  remotePush: !IS_EXPO_GO,                          // Expo Go Android has no remote push since SDK 53
  liquidGlass: Platform.OS === 'ios',               // also check isLiquidGlassAvailable() at runtime
  nativeCrashReports: !IS_EXPO_GO,
} as const;
```

Rules:
- **Never import a native-only module at top level.** Only import packages from the Expo Go list above. For optional Expo modules use `requireOptionalNativeModule` (exported from `expo` / `expo-modules-core`; it returns `null` when absent) [Verified: expo@57.0.28 `build/Expo.d.ts`].
- **Never fake a capability.** If background alerts are off, the Alerts screen shows an explicit amber banner: *"Background alerts are off in this preview. FordCast warns you while Drive Mode is open."* This matches the doc's honesty principle.
- `TaskManager.defineTask(...)` must run at **module top level**. Put it in `src/tasks/geofence.ts`, import it from a custom entry `index.ts` **before** `import 'expo-router/entry'`, and set `"main": "index.ts"` [Verified: docs `router/installation.mdx` custom entry; v57 `sdk/task-manager.mdx`]. Guard registration (`startGeofencingAsync`) with `caps.backgroundGeofencing`.

---

## 3. UI library decision

| Option | Version (npm) | Look | Dark mode | A11y | AI-agent speed | SDK 57 / Expo Go | Maintenance | Verdict |
|---|---|---|---|---|---|---|---|---|
| **NativeWind v4 + React Native Reusables** | nativewind **4.2.7** (2026-09-14), css-interop **0.2.7**, `@react-native-reusables/cli` **0.7.1**, `@rn-primitives/*` **1.5.2** | shadcn "new-york", premium neutral, easy to brand | CSS-variable tokens, `.dark:root` | Radix-style primitives with roles/states | **Highest** (Tailwind v3 + shadcn are heavily represented in training data). Copy-paste means the agent can read and modify every file | JS-only, so **Y** in Expo Go. css-interop babel explicitly forwards to Worklets for Reanimated 4 | NativeWind v4 patched 4.2.2→4.2.7 Feb–Sep 2026. RNR repo commit 2026-09-27 | **PRIMARY** |
| Uniwind + RNR | uniwind **1.12.2** (MIT, deps only `@tailwindcss/node`/`oxide`/`lightningcss`, so JS-only) | same RNR look, Tailwind v4 | yes | same | high | Y (JS-only; Expo-only engine) | active (Oct 2026) | **Runner-up engine.** Switch if NativeWind v4 misbehaves (RNR has a `minimal-uniwind` template; `add --styling-library uniwind`) |
| NativeWind v5 | `5.0.0-rc.0` (`rc` tag, 2026-09-13) + react-native-css `3.1.0-rc.0` | — | — | — | — | RC, "v4 remains the stable release" | — | **Reject** (pre-release) [Verified: npm dist-tags; search summary of nativewind.dev/v5] |
| HeroUI Native | **1.0.10** (Apache-2.0) | polished, animated, HeroUI design language | yes | good | medium (npm lib, less to customize) | peers RN ≥0.81, Reanimated ^4.1.1, RNGH ^2.28, worklets ≥0.5.1, so OK. **Requires Uniwind**/Tailwind v4 | active (Sep 2026) | Runner-up kit. **Don't mix with NativeWind v4** |
| gluestack-ui v5 | `@gluestack-ui/core` 5.0.15, `gluestack-ui` CLI 5.0.3 | good | yes | good | medium | v5 stable (June 2026) on **NativeWind v5 or Uniwind** | active | Viable alternative. Ties you to NW v5 RC or Uniwind |
| Tamagui | 3.0.9 (2026-10-14) | great | yes | ok | **low** (compiler/config complexity; v3 just released) | likely Y | very active | Reject (risk for 12 days) |
| Unistyles 3 | 3.5.3 | n/a (styling only) | yes | n/a | medium | **Nitro modules, not in Expo Go** | active | Reject |
| React Native Paper (MD3) | 5.15.3 | Material, not "premium night" | yes | strong | high | Y | active | Reject (look) |

**Why RNR wins for FordCast:** the brand look is a custom night palette with safety semantics (icon + word + pattern). Copy-paste components put the source in our repo (`src/components/ui/*`), so the agent rewrites variants directly with no theme-override fights. The RNR CLI also validates setup (`doctor`).

---

## 4. Animation and graphics

| Package | Version (SDK 57 pin) | Expo Go | Use in FordCast | Notes |
|---|---|---|---|---|
| react-native-reanimated | **4.5.1** (exact) | Y | Sheet-driven HUD, ring fill, chip transitions, CSS animations (`animationName`, `transitionProperty`) for pulses | Peer **RN 0.83–0.86, worklets 0.10.x**, so **don't bump** (latest 4.7.1 targets newer RN) [Verified: npm peerDependencies]. Babel plugin auto-configured by `babel-preset-expo` [Verified: v57 docs `sdk/reanimated.mdx`]. `ReduceMotion` enum available |
| react-native-worklets | **0.10.1** | Y | required by Reanimated 4 | |
| react-native-gesture-handler | **~2.32.0** (2.32.0) | Y | Replay scrubber, sheet | latest is **3.3.0**, so **don't** install latest |
| @shopify/react-native-skia | **2.6.2** | Y | **Risk Ring** (arc path + sweep gradient slate→amber→red), **Sparkline**, **Water Pulse** glow, barricade-stripe pattern | latest 2.14.0 is newer than Expo Go, so **don't bump** |
| lottie-react-native | **~7.3.8** | Y | Optional onboarding/empty-state animation only | Peer `@lottiefiles/dotlottie-react` is optional [Verified] |
| expo-blur | ~57.0.3 | Y | iOS frosted HUD. On Android use `BlurTargetView` + `blurMethod="dimezisBlurView"` | **[Unverified]** blurring a Google `MapView` surface on Android. **Use a solid `rgba(14,23,38,0.92)` surface on Android** |
| expo-linear-gradient | ~57.0.2 | Y | Sheet top fade, onboarding | |
| expo-glass-effect | ~57.0.4 | Y | iOS 26 Liquid Glass HUD pills | fallback styles required |
| react-native-svg | **15.15.4** | Y | Status glyphs (icon + pattern), lucide | |
| moti | 0.30.0 (last publish 2025-01-29) | (JS) | — | **Not recommended**: built for the Reanimated 3 era. Use Reanimated 4 CSS animations + layout animations instead [Verified: npm time; search could not confirm R4 support] |

---

## 5. Charts

**Pick:** hand-rolled **Skia** for the small, signature visuals (Risk Ring, Sparkline in the card, Water Pulse) plus **victory-native 42.0.1** (Victory Native XL, Skia-based) for the **Hydrograph** on `crossing/[id]` and in Replay (axes, trigger-stage line, "now" marker, press-to-scrub via `useChartPressState`).
- victory-native 42.0.1 peers: Skia `>=2.6.0 <3.0.0` ✓ (2.6.2), Reanimated ≥3.19.1 ✓, RNGH ≥2.0.0 ✓. Deps are d3-scale/d3-shape/d3-zoom (JS) [Verified: npm view]. Axis labels need a Skia font: `useFont(require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'), 11)` [Verified: path exists in @expo-google-fonts/inter@0.4.2].
- **Do not copy Expo's `with-victory-native` example.** It pins legacy SVG `victory-native ^35.5.5` [Verified: expo/examples].
- **Runner-up:** react-native-gifted-charts 1.4.81 (SVG + `expo-linear-gradient`, JS-only). Easier but slower and less "premium".

---

## 6. Sheets

| Need | Pick | Why |
|---|---|---|
| **Persistent map sheet** (Map Home: nearby/ranked crossings → selected Crossing Card), map interactive underneath, 3 snap points | **@gorhom/bottom-sheet 5.2.14** `BottomSheet` (non-modal) | JS-only, so Expo Go ✓. `animatedPosition`/`animatedIndex` shared values drive the floating HUD (data freshness + "Check my drive" FAB). Official **MapExample** to import (§13, Step 4). `bottomInset` for the tab bar. Reduce-motion support |
| Deep-link / list → crossing detail | Expo Router **`formSheet`** route `crossing/[id]` with `sheetAllowedDetents: [0.6, 1]`, `sheetGrabberVisible: true`, `sheetCornerRadius: 24` | Native feel, real URL (`fordcast://crossing/123`) for notifications |
| Search | `formSheet` `search` with `[0.9]` | keyboard-friendly |
| Native iOS sheets | @lodev09/react-native-true-sheet 3.11.18 | **Rejected**: native code, **not in Expo Go** |
| `@expo/ui/community/bottom-sheet` | modal (dims screen) | Rejected for the map sheet |

gorhom v5 specifics [Verified: @gorhom/bottom-sheet@5.2.14 source]:
- `enableDynamicSizing` **defaults to `true`**. Set `enableDynamicSizing={false}` when using fixed `snapPoints`.
- `BottomSheetFlashList` is **deprecated**. Use `useBottomSheetScrollableCreator()` as FlashList v2's `renderScrollComponent`.
- Requires `GestureHandlerRootView` at the root. `BottomSheetModalProvider` only if you use `BottomSheetModal`.

---

## 7. Lists, icons, toasts, misc: decisions

| Need | Pick | Version | Expo Go | Note |
|---|---|---|---|---|
| Long lists | @shopify/flash-list | **2.0.2** (SDK pin; latest 2.3.3, don't bump) | Y | v2 needs no `estimatedItemSize` |
| Icons (UI) | lucide-react-native | **1.57.0** | Y | via RNR `Icon` (`cssInterop`) |
| Icons (tab bar) | NativeTabs `sf` / `md` props | — | Y | e.g. `sf="map.fill" md="map"` (**[Unverified]** exact symbol names; check the SF Symbols app / fonts.google.com/icons) |
| Status glyphs | react-native-svg custom | 15.15.4 | Y | No-signal ◯ slate, Watch ▲ amber, Avoid ⛔ red, Closed = barricade stripes, Unknown = dashed outline |
| Toasts | sonner-native | **0.27.0** | Y | 0.26.0 rejects worklets 0.10 [Verified: npm peers] |
| Haptics | expo-haptics | ~57.0.3 | Y | `NotificationFeedbackType.Warning` on Avoid |
| Images | expo-image | ~57.0.5 | Y | storm thumbnails |
| Fonts | expo-font + @expo-google-fonts/inter | ~57.0.4 / **0.4.2** (MIT + OFL-1.1) | Y | `useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold })` [Verified export names] |
| Locale | expo-localization | ~57.0.2 | Y | `getLocales()`. Plugin `supportedLocales: ['en','es']` [Verified plugin options] |
| i18n | i18next + react-i18next | **26.4.4 / 17.0.16** | Y | If i18next warns about missing `Intl.PluralRules`, add `intl-pluralrules@2.0.1` (**[Unverified]** whether Hermes on RN 0.86 needs it) |
| TTS | expo-speech | ~57.0.3 | Y | `speak(text, { language: 'es-US' })`, `stop`, `isSpeakingAsync`, `getAvailableVoicesAsync` [Verified typings] |
| Keep awake | expo-keep-awake | ~57.0.2 | Y | `useKeepAwake()` in Drive Mode |
| Notifications | expo-notifications | ~57.0.22 | local Y / push N (Android Go) | `setNotificationHandler`, `scheduleNotificationAsync`, `setNotificationChannelAsync`, `addNotificationResponseReceivedListener`, `getExpoPushTokenAsync` [Verified typings] |
| Location | expo-location | ~57.0.21 | foreground Y | `watchPositionAsync`, `startGeofencingAsync`, `hasStartedGeofencingAsync`, `requestBackgroundPermissionsAsync` [Verified]. **iOS 20 regions, Android 100 geofences** [Verified docs] |
| Background tasks | expo-task-manager | ~57.0.21 | partial | `defineTask` at top level |
| SQL / KV | expo-sqlite | ~57.0.4 | Y | `expo-sqlite/kv-store` (AsyncStorage-compatible + sync API), `SQLiteProvider`/`useSQLiteContext` [Verified docs + package `kv-store.js`] |
| KV (fast) | react-native-mmkv 4.3.2 | — | **N** (Nitro) | **Rejected** |
| Network state | expo-network | ~57.0.2 | Y | `useNetworkState()` [Verified typings] |
| Links | expo-linking | ~57.0.12 | Y | scheme `fordcast` |
| Config | expo-constants | ~57.0.21 | Y | |
| OTA | expo-updates | ~57.0.26 | simulated | `runtimeVersion: { policy: 'appVersion' }` [Verified docs] |
| Server state | @tanstack/react-query (+ persist-client, async-storage-persister) | **5.104.2** | Y | persister storage = `expo-sqlite/kv-store` |
| Client state | zustand | **5.0.15** | Y | `persist` + `createJSONStorage(() => Storage)` |
| Backend | @supabase/supabase-js | **2.117.3** | Y | `@opentelemetry/api` peer is optional [Verified]. `expo` ships `whatwg-url-minimum` [Verified: expo deps], so `react-native-url-polyfill` (4.0.0) is likely unnecessary (**[Unverified]**; add it only if `URL` errors appear) |
| Geo | @turf/helpers, distance, point-to-line-distance, nearest-point-on-line, boolean-point-in-polygon, circle, bbox, along, length | **7.4.0** (MIT) | Y | per-module installs keep the bundle small |
| Dates | date-fns | **4.4.0** | Y | `formatDistanceToNowStrict(d, { locale: es })` → "risk as of 12 min ago" |
| Validation | zod | **4.6.7** | Y | parse every API/Realtime payload |
| Errors | @sentry/react-native | **~7.11.0** (SDK pin; latest 8.30.0, **don't bump**) | JS-only | plugin `@sentry/react-native/expo` (app.plugin.js → `./expo`) + `@sentry/react-native/metro`. **Stretch** |
| Keyboard | react-native-keyboard-controller | **1.21.9** | Y | optional (search sheet) |

---

## 8. Master package table (verified)

`Go` = runs in Expo Go SDK 57 (Android). "SDK pin" = the version `npx expo install` selects from `bundledNativeModules.json`.

| Package | Exact version | Purpose | Go | Config plugin |
|---|---|---|---|---|
| expo | 57.0.28 | SDK | Y | — |
| react / react-dom | 19.2.3 | React | Y | — |
| react-native | 0.86.3 | RN | Y | — |
| react-native-web | ~0.21.0 | web (peer of rn-primitives) | — | — |
| expo-router | ~57.0.26 | file routing, NativeTabs, sheets | Y | `"expo-router"` |
| react-native-screens | ~4.26.0 (4.26.2) | native stack/sheets | Y | — |
| react-native-safe-area-context | ~5.7.0 (5.7.0) | insets | Y | — |
| react-native-gesture-handler | ~2.32.0 (2.32.0) | gestures | Y | — |
| react-native-reanimated | 4.5.1 | animation | Y | auto (babel-preset-expo) |
| react-native-worklets | 0.10.1 | worklets | Y | — |
| expo-splash-screen | ~57.0.10 | splash | (Go's own) | `["expo-splash-screen", {...}]` |
| expo-status-bar | ~57.0.1 | status bar | Y | — |
| expo-system-ui | ~57.0.4 | root bg color | Y | — |
| expo-constants | ~57.0.21 | config | Y | — |
| expo-linking | ~57.0.12 | deep links | Y | — |
| expo-font | ~57.0.4 | fonts | Y | optional `["expo-font",{fonts:[…]}]` |
| @expo-google-fonts/inter | 0.4.2 | Inter | Y | — |
| expo-image | ~57.0.5 | images | Y | — |
| expo-symbols | ~57.0.3 | SF/Material symbols (beta) | Y | — |
| expo-glass-effect | ~57.0.4 | iOS 26 glass | Y | — |
| @expo/ui | ~57.0.23 | native controls (optional) | Y | — |
| expo-device | ~57.0.2 | device info | Y | — |
| expo-web-browser | ~57.0.3 | open sources/links | Y | — |
| nativewind | ^4.2.7 | Tailwind for RN | Y | none (babel preset + metro wrapper) |
| react-native-css-interop | 0.2.7 (transitive) | NW engine | Y | — |
| tailwindcss (dev) | ^3.4.19 | Tailwind v3 | — | — |
| tailwindcss-animate | 1.0.7 | RNR animations | Y | — |
| class-variance-authority | 0.7.1 | variants | Y | — |
| clsx | 2.1.1 | class join | Y | — |
| tailwind-merge | ^3.5.0 (latest 3.7.0) | class merge | Y | — |
| @rn-primitives/portal | ~1.4.0 (RNR template pin; latest 1.5.3) | portals | Y | — |
| @rn-primitives/slot + others (added by `rnr add`) | ^1.5.2 | primitives | Y | — |
| lucide-react-native | 1.57.0 | icons | Y | — |
| react-native-svg | 15.15.4 | SVG | Y | — |
| @gorhom/bottom-sheet | 5.2.14 | map sheet | Y | — |
| sonner-native | 0.27.0 | toasts | Y | — |
| expo-blur | ~57.0.3 | blur | Y | — |
| expo-linear-gradient | ~57.0.2 | gradients | Y | — |
| expo-mesh-gradient | ~57.0.2 | hero bg (optional) | Y | — |
| @shopify/react-native-skia | 2.6.2 | ring/sparkline/pulse | Y | — |
| victory-native | 42.0.1 | hydrograph | Y | — |
| lottie-react-native | ~7.3.8 | optional animations | Y | — |
| @shopify/flash-list | 2.0.2 | lists | Y | — |
| react-native-keyboard-controller | 1.21.9 | keyboard (optional) | Y | — |
| expo-haptics | ~57.0.3 | haptics | Y | — |
| react-native-maps | 1.27.2 | map | Y | `["react-native-maps",{androidGoogleMapsApiKey, iosGoogleMapsApiKey?}]` (builds only) |
| expo-location | ~57.0.21 | location/geofence | partial | `["expo-location",{locationWhenInUsePermission, locationAlwaysAndWhenInUsePermission, isIosBackgroundLocationEnabled, isAndroidBackgroundLocationEnabled, isAndroidForegroundServiceEnabled}]` [Verified option names] |
| expo-task-manager | ~57.0.21 | bg tasks | partial | — |
| expo-background-task | ~57.0.21 | periodic refresh (stretch) | partial | — |
| expo-notifications | ~57.0.22 | alerts | local only (Android Go) | `["expo-notifications",{icon,color,defaultChannel,sounds}]` [Verified option names] |
| expo-speech | ~57.0.3 | voice | Y | — |
| expo-keep-awake | ~57.0.2 | Drive Mode | Y | — |
| expo-localization | ~57.0.2 | locale | Y | `["expo-localization",{supportedLocales:["en","es"]}]` |
| expo-sqlite | ~57.0.4 | cache + KV | Y | optional `"expo-sqlite"` |
| expo-network | ~57.0.2 | offline detection | Y | — |
| expo-updates | ~57.0.26 | OTA | simulated | via `eas update:configure` |
| expo-dev-client | ~57.0.20 | dev build | n/a | add **only** when making a dev build |
| @tanstack/react-query | 5.104.2 | server state | Y | — |
| @tanstack/react-query-persist-client | 5.104.2 | persist cache | Y | — |
| @tanstack/query-async-storage-persister | 5.104.2 | persister | Y | — |
| zustand | 5.0.15 | client state | Y | — |
| @supabase/supabase-js | 2.117.3 | DB + Realtime | Y | — |
| zod | 4.6.7 | validation | Y | — |
| date-fns | 4.4.0 | time | Y | — |
| i18next / react-i18next | 26.4.4 / 17.0.16 | i18n | Y | — |
| @turf/* (9 modules) | 7.4.0 | geo math | Y | — |
| @sentry/react-native | ~7.11.0 | errors (stretch) | JS only | `"@sentry/react-native/expo"` |
| **Dev** typescript | ~6.0.3 | TS | — | — |
| **Dev** @types/react | ~19.2.2 | types | — | — |
| **Dev** eslint | ^9.39.5 (pin < 10) | lint | — | — |
| **Dev** eslint-config-expo | ~57.0.2 | Expo lint rules (flat: `eslint-config-expo/flat`) | — | — |
| **Dev** prettier | 3.9.10 | format | — | — |
| **Dev** eslint-config-prettier / eslint-plugin-prettier | 10.1.8 / 5.5.7 | lint+format | — | — |
| **Dev** prettier-plugin-tailwindcss | ^0.8.1 | class sorting | — | — |
| **Dev** jest-expo | ~57.0.6 | test preset | — | — |
| **Dev** jest / @types/jest | ^29.7.0 / ^29.5.14 | test runner (jest-expo 57 is Jest 29-based) | — | — |
| **Dev** @testing-library/react-native | 14.1.0 (+ peer `test-renderer` 1.3.1) | component tests | — | — |
| CLI eas-cli | 24.13.0 (`npx eas-cli@latest`) | builds/updates | — | — |
| CLI expo-doctor | 1.20.4 (`npx expo-doctor@latest`) | health check | — | — |
| CLI expo-go | 0.2.0 | download Expo Go builds | — | — |
| CLI Maestro | (not npm) | E2E | — | — |

### 8.1 Rejected / deferred (with reason)

| Package | Version | Reason |
|---|---|---|
| react-native-mmkv | 4.3.2 | Nitro module, **not in Expo Go**. Use `expo-sqlite/kv-store` |
| react-native-unistyles | 3.5.3 | Nitro, **not in Expo Go** |
| @lodev09/react-native-true-sheet | 3.11.18 | native, **not in Expo Go** |
| burnt | 0.13.0 | native module (ships android/ios dirs), **not in Expo Go**. Use sonner-native |
| expo-maps | 57.0.4 | alpha + not in Expo Go |
| expo-widgets | 57.0.24 | iOS only, dev build + paid account → Roadmap |
| moti | 0.30.0 | stale (Jan 2025), Reanimated 3 era |
| nativewind | 5.0.0-rc.0 | release candidate |
| tamagui | 3.0.9 | complexity / brand-new major |
| react-native-paper | 5.15.3 | Material look |
| heroui-native | 1.0.10 | runner-up. Needs Uniwind (conflicts with NativeWind v4) |
| phosphor-react-native | 3.0.6 | runner-up icons |
| react-native-gifted-charts | 1.4.81 | runner-up charts |
| @rnmapbox/maps / MapLibre | — | dev build + tokens/keys → Roadmap |

---

## 9. Exact install commands (SDK 57; run in order)

> macOS/Linux use `--dev`. **Windows** (PowerShell/cmd) needs `"--" --dev` [Verified: docs `develop/unit-testing.mdx`]. Always use `npx expo install` for anything native so the SDK pin is chosen. **Never** `npm i react-native-reanimated@latest` etc.

```bash
# 0) Prereqs: Node >= 22.13, Git, Android Studio (emulator) or an Android phone, free Expo account
npx expo login

# 1) Scaffold (pins SDK 57 even after SDK 58 ships)
npx create-expo-app@latest fordcast-app --template default@sdk-57
cd fordcast-app
npm run reset-project            # moves starter src/ + scripts/ to example/ (keep for reference; delete before submission)

# 2) Styling layer (NativeWind v4 + RNR runtime deps)
npx expo install nativewind tailwindcss-animate class-variance-authority clsx tailwind-merge @rn-primitives/portal@~1.4.0 @rn-primitives/slot lucide-react-native react-native-svg
npm install --save-dev tailwindcss@^3.4.19 prettier prettier-plugin-tailwindcss@^0.8.1
#   -> confirm package.json shows "nativewind": "^4.2.7" (NOT 5.x)

# 3) UI / motion / graphics
npx expo install @gorhom/bottom-sheet sonner-native expo-blur expo-linear-gradient expo-haptics @shopify/react-native-skia victory-native @shopify/flash-list expo-font @expo-google-fonts/inter react-native-keyboard-controller
#   optional: npx expo install lottie-react-native expo-mesh-gradient

# 4) Map, location, alerts, offline, voice
npx expo install react-native-maps expo-location expo-task-manager expo-notifications expo-speech expo-keep-awake expo-localization expo-sqlite expo-network expo-updates

# 5) Data, state, i18n, geo, utils (pure JS)
npx expo install @tanstack/react-query @tanstack/react-query-persist-client @tanstack/query-async-storage-persister zustand @supabase/supabase-js zod date-fns i18next react-i18next @turf/helpers @turf/distance @turf/point-to-line-distance @turf/nearest-point-on-line @turf/boolean-point-in-polygon @turf/circle @turf/bbox @turf/along @turf/length

# 6) Lint / format
npx expo lint                    # creates eslint.config.js + installs eslint-config-expo
npx expo install eslint-config-prettier eslint-plugin-prettier --dev
#   if eslint 10.x was installed: npm i -D eslint@^9.39.5   (eslint-plugin-react supports eslint <= ^9.7)

# 7) Tests
npx expo install jest-expo jest @types/jest @testing-library/react-native --dev
#   ensure Jest 29: npm i -D jest@^29.7.0 @types/jest@^29.5.14   (jest-expo 57 depends on Jest 29 packages)

# 8) Health check (run after every install batch)
npx expo install --check
npx expo-doctor@latest

# 9) Run in Expo Go (Android)
npx expo start --go              # press "a" (installs the matching SDK 57 Expo Go on emulator/device)

# 10) EAS (when you need native-only features or the judge APK)
npx eas-cli@latest init
npx eas-cli@latest build:configure
npx expo install expo-dev-client                       # only now
npx eas-cli@latest build -p android --profile development
npx eas-cli@latest build -p android --profile preview  # judge/demo APK
npx eas-cli@latest update:configure
npx eas-cli@latest update --channel preview --message "..."  # JS-only fixes, no rebuild
```

Stretch (Sentry): `npx expo install @sentry/react-native` → add plugin `"@sentry/react-native/expo"` and compose `getSentryExpoConfig` with `withNativeWind` in `metro.config.js`.

---

## 10. Config files (exact content to generate)

### 10.1 `index.ts` (custom entry: tasks before router)
```ts
import './src/tasks/geofence';   // TaskManager.defineTask(...) at module top level
import 'expo-router/entry';      // must be last
```
`package.json` → `"main": "index.ts"` [Verified: docs `router/installation.mdx`].

### 10.2 `app.config.ts`
```ts
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'FordCast',
  slug: 'fordcast',
  scheme: 'fordcast',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',                 // night-first; also forced in NativeWind
  icon: './assets/images/icon.png',
  runtimeVersion: { policy: 'appVersion' },   // [Verified: docs eas-update/deployment.mdx]
  ios: { bundleIdentifier: 'org.example.fordcast', supportsTablet: false },   // replace with your own reverse-domain id
  android: {
    package: 'org.example.fordcast',
    adaptiveIcon: { backgroundColor: '#0E1726', foregroundImage: './assets/images/android-icon-foreground.png' },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    ['expo-splash-screen', { backgroundColor: '#0E1726', image: './assets/images/splash-icon.png', imageWidth: 120 }],
    ['expo-location', {
      locationWhenInUsePermission: 'FordCast uses your location to show flood-prone crossings near you and on your route.',
      locationAlwaysAndWhenInUsePermission: 'Allow "Always" so FordCast can warn you about a crossing ahead while you use another navigation app.',
      isIosBackgroundLocationEnabled: true,
      isAndroidBackgroundLocationEnabled: true,
    }],
    ['expo-notifications', { icon: './assets/images/notification-icon.png', color: '#F5A623' }],
    ['react-native-maps', { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY }],
    ['expo-localization', { supportedLocales: ['en', 'es'] }],
    'expo-sqlite',
  ],
  experiments: { typedRoutes: true, reactCompiler: false },   // see Pitfall P10
  extra: { eas: { projectId: process.env.EAS_PROJECT_ID } },
});
```
Secrets: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (public by design, protected by RLS). **Never** put ORS/USGS/Google *server* keys in `EXPO_PUBLIC_*`. Routing calls go through FastAPI.

### 10.3 `babel.config.js` (RNR minimal template, verbatim)
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
```

### 10.4 `metro.config.js`
```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: './src/global.css', inlineRem: 16 });
```
(`inlineRem: 16` is required by RNR doctor [Verified: RNR CLI manifest].)

### 10.5 `tailwind.config.js` (RNR template + FordCast tokens)
```js
const { hairlineWidth } = require('nativewind/theme');
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],                 // MUST cover every folder that uses className
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
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
        // FordCast semantic status tokens
        nosignal: 'hsl(var(--status-nosignal))',
        watch: 'hsl(var(--status-watch))',
        avoid: 'hsl(var(--status-avoid))',
        'avoid-chip': 'hsl(var(--status-avoid-chip))',
        closed: 'hsl(var(--status-closed))',
        unknown: 'hsl(var(--status-unknown))',
        water: 'hsl(var(--water))',
        subtle: 'hsl(var(--subtle))',
      },
      fontFamily: {   // one family per weight (Android won't synthesize weights for custom fonts)
        sans: ['Inter_400Regular'], medium: ['Inter_500Medium'], semibold: ['Inter_600SemiBold'],
        bold: ['Inter_700Bold'], black: ['Inter_800ExtraBold'],
      },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)', xl: 'calc(var(--radius) + 4px)' },
      borderWidth: { hairline: hairlineWidth() },
    },
  },
  future: { hoverOnlyWhenSupported: true },
  plugins: [require('tailwindcss-animate')],
};
```

### 10.6 `src/global.css`: FordCast tokens (dark in BOTH blocks, so it is always dark)
Contrast computed with WCAG 2.x formula (python) [Verified: computed]:

| Token | Hex | On base `#0E1726` | On card `#152238` | On elevated `#1C2C47` |
|---|---|---|---|---|
| foreground | `#E8EEF6` | 15.39 | 13.65 | 11.99 |
| subtle text | `#A9B4C4` | 8.56 | 7.60 | 6.67 |
| no-signal slate | `#8A97AB` | **6.07** | 5.38 | 4.73 |
| watch amber | `#F5A623` | **8.86** | 7.86 | 6.90 |
| avoid red text | `#FF5A4F` | **5.84** | 5.18 | **4.55** (lowest allowed surface) |
| water cyan | `#2BD9D9` | **10.29** | 9.13 | 8.02 |
| white on avoid chip `#C62828` | — | chip text **5.62** | chip vs base 3.19 (≥3:1 non-text ✓) | — |
| navy `#0E1726` on amber chip | — | **8.86** | — | — |
| unknown dashed `#6B7A90` | — | 4.12 (≥3:1 non-text ✓) | — | — |
| border `#2A3A55` | — | 1.57 (decorative only; never the sole state cue) | — | — |

The concept doc's claimed ratios (6.1 / 8.9 / 5.8 / 5.6 / 10.3) all check out.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root, .dark:root {
    --background: 218 46.2% 10.2%;          /* #0E1726 */
    --foreground: 214 43.8% 93.7%;          /* #E8EEF6 */
    --card: 218 45.5% 15.1%;                /* #152238 */
    --card-foreground: 214 43.8% 93.7%;
    --popover: 218 43.4% 19.4%;             /* #1C2C47 */
    --popover-foreground: 214 43.8% 93.7%;
    --primary: 214 43.8% 93.7%;             /* near-white primary button; cyan stays reserved for WATER data */
    --primary-foreground: 218 46.2% 10.2%;
    --secondary: 218 43.4% 19.4%;
    --secondary-foreground: 214 43.8% 93.7%;
    --muted: 218 45.5% 15.1%;
    --muted-foreground: 216 16.4% 60.6%;    /* #8A97AB */
    --accent: 218 43.4% 19.4%;
    --accent-foreground: 214 43.8% 93.7%;
    --destructive: 0 66.4% 46.7%;           /* #C62828 */
    --destructive-foreground: 0 0% 100%;
    --border: 218 33.9% 24.9%;              /* #2A3A55 */
    --input: 218 33.9% 24.9%;
    --ring: 180 69.6% 51.0%;                /* #2BD9D9 focus ring */
    --radius: 1rem;
    --status-nosignal: 216 16.4% 60.6%;     /* #8A97AB */
    --status-watch: 37 91.3% 54.9%;         /* #F5A623 */
    --status-avoid: 4 100% 65.5%;           /* #FF5A4F */
    --status-avoid-chip: 0 66.4% 46.7%;     /* #C62828 */
    --status-closed: 0 66.4% 46.7%;         /* #C62828 + barricade stripes */
    --status-unknown: 216 14.7% 49.2%;      /* #6B7A90 dashed outline */
    --water: 180 69.6% 51.0%;               /* #2BD9D9 */
    --subtle: 216 18.6% 71.6%;              /* #A9B4C4 */
  }
}
```
Mirror the same values in `src/lib/theme.ts` (`THEME` + `NAV_THEME` built from `DarkTheme` imported from `expo-router/react-navigation`) and call NativeWind's `colorScheme.set('dark')` once at startup.

### 10.7 `tsconfig.json`
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "paths": { "@/*": ["./src/*"], "@/assets/*": ["./assets/*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts", "nativewind-env.d.ts"]
}
```

### 10.8 `components.json` (RNR / shadcn registry config adapted to `src/`)
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york", "rsc": false, "tsx": true,
  "tailwind": { "config": "tailwind.config.js", "css": "src/global.css", "baseColor": "neutral", "cssVariables": true },
  "aliases": { "components": "@/components", "utils": "@/lib/utils", "ui": "@/components/ui", "lib": "@/lib", "hooks": "@/hooks" }
}
```
If `add` writes outside `src/`, pass `--path src/components/ui` (flag verified in RNR CLI docs). **[Unverified]** whether RNR resolves `@/*` → `./src/*` automatically.

### 10.9 `eas.json`
```json
{
  "cli": { "version": ">= 24.0.0", "appVersionSource": "remote" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal", "android": { "buildType": "apk" }, "channel": "development" },
    "preview":     { "distribution": "internal", "android": { "buildType": "apk" }, "channel": "preview" },
    "production":  { "autoIncrement": true, "channel": "production" }
  },
  "submit": { "production": {} }
}
```
[Verified: docs `build/eas-json.mdx` (profiles, `buildType: "apk"`, `appVersionSource`), `build/updates.mdx` (`channel`)]

### 10.10 ESLint / Prettier / Jest
- `eslint.config.js`: `const { defineConfig } = require('eslint/config'); const expoConfig = require('eslint-config-expo/flat');` + `eslint-config-prettier` + rule `"no-restricted-imports": ["error", { "patterns": ["@react-navigation/*"] }]` (SDK 56+ rule) [Verified: docs `guides/using-eslint.mdx`; package has `flat.js`].
- `.prettierrc`: `{ "singleQuote": true, "printWidth": 100, "plugins": ["prettier-plugin-tailwindcss"] }`.
- `package.json`: `"jest": { "preset": "jest-expo" }`, scripts `"test": "jest --watchAll=false"`, `"typecheck": "tsc --noEmit"`, `"lint": "expo lint"`, `"doctor": "npx expo-doctor@latest"`. jest-expo treats `*-test.tsx` files as tests [Verified: docs unit-testing].

---

## 11. Folder structure and routes (Expo Router, `src/app`)

```
fordcast-app/
├─ AGENTS.md                         # generated by create-expo-app → extend with FordCast rules (safety principle, tokens, no lookahead)
├─ .claude/settings.json             # generated (Expo skills plugin for Claude Code)
├─ index.ts                          # custom entry: tasks → expo-router/entry
├─ app.config.ts  eas.json  babel.config.js  metro.config.js  tailwind.config.js
├─ components.json  nativewind-env.d.ts  tsconfig.json  eslint.config.js  .prettierrc
├─ .maestro/                         # E2E flows (expo-go/ and dev-build/)
├─ assets/
│  ├─ images/ (icon, splash-icon, notification-icon (white on transparent), android-icon-*)
│  ├─ map/night-style.json           # Google Maps style JSON (free; NOT a cloud mapId)
│  ├─ lottie/ (optional)
│  └─ seed/ crossings.seed.json      # bundled fallback geometry for offline first-run
└─ src/
   ├─ global.css
   ├─ app/
   │  ├─ _layout.tsx                 # Root Stack: GestureHandlerRootView, QueryClientProvider(+persist), ThemeProvider(NAV_THEME.dark),
   │  │                              #   I18nextProvider, fonts+splash, Stack.Protected (onboarding gate), PortalHost, <Toaster/>
   │  ├─ +not-found.tsx
   │  ├─ (onboarding)/
   │  │  ├─ _layout.tsx              # Stack, headerShown:false
   │  │  ├─ index.tsx                # Welcome: "Know before it crosses."
   │  │  ├─ safety.tsx               # Disclaimer + "I understand" (never-safe principle)
   │  │  ├─ language.tsx             # EN / ES
   │  │  ├─ location.tsx             # foreground → (optional) Always
   │  │  └─ notifications.tsx        # permission + channel setup
   │  ├─ (tabs)/
   │  │  ├─ _layout.tsx              # NativeTabs: index | drive | replay | alerts | settings  (5 = Android max)
   │  │  ├─ index.tsx                # MAP HOME: MapView + CrossingListSheet + CrossingDetailsSheet + Freshness HUD
   │  │  ├─ drive/
   │  │  │  ├─ _layout.tsx           # Stack
   │  │  │  ├─ index.tsx             # Check My Drive (origin/destination, saved routes)
   │  │  │  └─ result.tsx            # route vs crossings, detour +N min, "Start Drive Mode"
   │  │  ├─ replay/
   │  │  │  ├─ _layout.tsx
   │  │  │  ├─ index.tsx             # Storm list (2013 Onion Creek, 2015 Memorial Day, 2018, 2025) + backtest stats
   │  │  │  └─ [stormId].tsx         # Replay player: map + scrubber (1×/10×/60×) + hydrograph + "X min earlier"
   │  │  ├─ alerts/
   │  │  │  ├─ _layout.tsx
   │  │  │  ├─ index.tsx             # Alert feed (age-stamped) + capability banner
   │  │  │  └─ saved.tsx             # Saved crossings / routes = alert subscriptions
   │  │  └─ settings/
   │  │     ├─ _layout.tsx
   │  │     ├─ index.tsx             # language, voice, units, alerts, accessibility
   │  │     ├─ about.tsx             # mission, Built vs Roadmap list, disclaimer
   │  │     ├─ data-sources.tsx      # USGS, NLDI, ATXfloods, MRMS, update cadence, last refresh
   │  │     └─ debug.tsx             # (__DEV__ only) capabilities, cache, replay clock
   │  ├─ crossing/[id].tsx           # formSheet detents [0.6, 1]: status, window, upstream gauges, hydrograph, share, save
   │  ├─ drive-mode.tsx              # fullScreenModal, gestureEnabled:false, keep-awake, voice-first, giant targets
   │  ├─ search.tsx                  # formSheet [0.9]
   │  └─ disclaimer.tsx              # modal
   ├─ components/
   │  ├─ ui/                         # RNR-imported (owned) components
   │  └─ fordcast/                   # StatusChip, StatusGlyph, RiskRing, Sparkline, Hydrograph, CrossingCard, CrossingRow,
   │                                 # CrossingMarker, CreekLine, WaterPulse, FreshnessPill, StaleBanner, OfflineBanner,
   │                                 # CapabilityBanner, ReplayScrubber, SpeedToggle, DriveHUD, BigActionButton, EmptyState,
   │                                 # GlassSurface (GlassView on iOS 26 → rgba fallback), DisclaimerFooter, SectionHeader
   ├─ features/
   │  ├─ crossings/ (api.ts, queries.ts, realtime.ts, schema.ts (zod), selectors.ts)
   │  ├─ risk/ (state.ts: NO_SIGNAL|WATCH|AVOID|CLOSED|UNKNOWN, staleness.ts, copy.ts)
   │  ├─ replay/ (clock.ts, player-store.ts, frames.ts)
   │  ├─ drive/ (route-check.ts, proximity.ts)
   │  ├─ alerts/ (geofence-rotation.ts (≤20 iOS / ≤100 Android), notify.ts, speak.ts)
   │  └─ offline/ (cache-db.ts, sync.ts)
   ├─ lib/ (supabase.ts, query-client.ts, storage.ts, capabilities.ts, i18n.ts, theme.ts, utils.ts (cn), haptics.ts, format.ts, geo.ts)
   ├─ locales/ (en.json, es.json)
   ├─ stores/ (settings.ts, onboarding.ts, replay.ts)
   ├─ tasks/ (geofence.ts)
   └─ __tests__/ (risk-state-test.ts, staleness-test.ts, status-chip-test.tsx, ...)
```

### 11.1 Root and tabs layout skeletons
```tsx
// src/app/_layout.tsx (essentials)
import '@/global.css';
import { Stack } from 'expo-router';
import { ThemeProvider } from 'expo-router/react-navigation';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PortalHost } from '@rn-primitives/portal';
import { Toaster } from 'sonner-native';
import { NAV_THEME } from '@/lib/theme';
import { useOnboarding } from '@/stores/onboarding';

export default function RootLayout() {
  const done = useOnboarding((s) => s.done);
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0E1726' }}>
      {/* QueryClientProvider / PersistQueryClientProvider, I18nextProvider wrap here */}
      <ThemeProvider value={NAV_THEME.dark}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0E1726' } }}>
          <Stack.Protected guard={!done}><Stack.Screen name="(onboarding)" /></Stack.Protected>
          <Stack.Protected guard={done}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="crossing/[id]" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.6, 1], sheetGrabberVisible: true, sheetCornerRadius: 24 }} />
            <Stack.Screen name="drive-mode" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
            <Stack.Screen name="search" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.9] }} />
            <Stack.Screen name="disclaimer" options={{ presentation: 'modal' }} />
          </Stack.Protected>
        </Stack>
        <PortalHost />
        <Toaster theme="dark" position="top-center" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
```
```tsx
// src/app/(tabs)/_layout.tsx (SDK 57 import path)
import { NativeTabs } from 'expo-router/unstable-native-tabs';
export default function TabsLayout() {
  return (
    <NativeTabs
      backgroundColor="#0E1726" indicatorColor="#1C2C47" rippleColor="#1C2C47"
      iconColor={{ default: '#8A97AB', selected: '#E8EEF6' }}
      labelStyle={{ default: { color: '#8A97AB' }, selected: { color: '#E8EEF6' } }}>
      <NativeTabs.Trigger name="index"><NativeTabs.Trigger.Icon sf="map.fill" md="map" /><NativeTabs.Trigger.Label>Map</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="drive"><NativeTabs.Trigger.Icon sf="car.fill" md="directions_car" /><NativeTabs.Trigger.Label>Drive</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="replay"><NativeTabs.Trigger.Icon sf="clock.arrow.circlepath" md="history" /><NativeTabs.Trigger.Label>Replay</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="alerts"><NativeTabs.Trigger.Icon sf="bell.fill" md="notifications" /><NativeTabs.Trigger.Label>Alerts</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings"><NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" /><NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label></NativeTabs.Trigger>
    </NativeTabs>
  );
}
```
(Labels come from i18n in the real code. Prop shapes verified against expo-router@57.0.26 `native-tabs/types.d.ts`. Symbol names are **[Unverified]**.) The iOS 26 tab bar ignores `backgroundColor` and uses Liquid Glass [Verified: native-tabs guide].

---

## 12. Templates and starters evaluated

| Source | Command | What it gives | License | SDK 57? | Verdict |
|---|---|---|---|---|---|
| **create-expo-app `default`** | `npx create-expo-app@latest fordcast-app --template default@sdk-57` | Expo Router 57, `src/app`, NativeTabs (`app-tabs.tsx`) + web headless tabs, themed components, `@expo/ui`, glass, symbols, TS ~6.0.3 strict, typed routes, React Compiler, **AGENTS.md + .claude/settings.json** | 0BSD [Verified: package.json] | **Yes** (57.0.30) | **BASE** |
| create-expo-app `blank-typescript` / `tabs` / `bare-minimum` | `--template <name>@sdk-57` | minimal / JS tabs / native dirs | 0BSD | Yes | Not needed |
| **React Native Reusables `init`** | `npx @react-native-reusables/cli@latest init` (templates: `minimal` (NativeWind), `minimal-uniwind`, `clerk-auth`) | Expo Router + NativeWind/Uniwind wired, `components/ui/{button,icon,text}`, `lib/{theme,utils}`, `components.json`, PortalHost | MIT | **No: expo ~56.0.13** (repo commit 2026-07-02) → `npm i expo@^57.0.0 && npx expo install --fix` | **IMPORT its theming layer** (files copied, §13). Runner-up base |
| **RNR registry `add`** | `npx @react-native-reusables/cli@latest add <names…> [-y] [--path] [--styling-library]` | 30 components: accordion, alert-dialog, alert, aspect-ratio, avatar, badge, button, card, checkbox, collapsible, context-menu, dialog, dropdown-menu, hover-card, input, label, menubar, popover, progress, radio-group, select, separator, skeleton, switch, tabs, text, textarea, toggle-group, toggle, tooltip | MIT | Yes (JS) | **USE** |
| RNR blocks | docs (authentication forms, user-menu) | auth screens | MIT | — | Skip (no auth in MVP) |
| **gorhom bottom-sheet example `integrations/map`** | copy from github.com/gorhom/react-native-bottom-sheet `example/src/screens/integrations/map/*` | **MapExample, LocationListBottomSheet, LocationDetailsBottomSheet, BlurredBackground, BlurredHandle, LocationItem, Weather (floating widget that tracks the sheet)** | MIT | JS (v5.2.14) | **IMPORT** (the map-first pattern) |
| **Expo examples** | `npx create-expo-app --example with-maps` (or copy files) | `with-maps` (maps 1.27.2, SDK 57), `with-skia` (2.6.2), `with-maestro` (Expo Go + dev-build flows), `with-sqlite`, `with-zustand`, `with-sentry` (~7.11.0), `with-router-uniwind`, `with-tailwindcss` (**NativeWind 5 preview, don't copy**), `with-victory-native` (**legacy v35, don't copy**) | MIT | Yes (repo commit 2026-09-03) | **Reference snippets** |
| HeroUI Native + example app | `github.com/heroui-inc/heroui-native-example` | polished components on Uniwind | Apache-2.0 | peers OK | Runner-up kit (don't mix with NativeWind v4) |
| gluestack-ui v5 | `npx gluestack-ui init` | copy-paste, NW v5 or Uniwind | MIT | v5 stable June 2026 | Alternative |
| Obytes template | `npx create-obytes-app` (1.8.0) | full starter: Uniwind, MMKV, React Query, i18n, EAS, GH Actions | MIT | **No: expo ~54.0.32** | Reference for patterns only |
| Ignite (Infinite Red) | `npx ignite-cli@latest new` (11.5.0) | opinionated boilerplate, MMKV, i18n | MIT | **No: expo 55.0.5** | Skip |
| create-expo-stack | `npx rn-new@latest` (2.23.3) | configurable starter (NativeWind/Unistyles/Supabase) | MIT | README lists SDK 53-era stack | Skip |
| Community kits (NativeShad, nativeui-org/ui) | — | shadcn-style RN | various | unvetted, small | Skip |

Sources: [Verified: npm view/pack for each CLI; git clones of `founded-labs/react-native-reusables-templates` (2026-07-02), `founded-labs/react-native-reusables` (2026-09-27), `gorhom/react-native-bottom-sheet` (2026-05-09), `expo/examples` (2026-09-03), `obytes/react-native-template-obytes` (2026-06-02), `infinitered/ignite` (2026-04-30)]

---

## 13. Template Import Plan (exact steps)

**Step 1: Scaffold** (§9 steps 1–2). Keep `example/` from `reset-project` as reference for `app-tabs.tsx` (NativeTabs) and `app-tabs.web.tsx` (headless tabs). Delete it before submission.

**Step 2: Import the RNR "minimal (NativeWind)" theming layer** (no `init`, so we stay on SDK 57):
```bash
git clone --depth 1 https://github.com/founded-labs/react-native-reusables-templates.git ../_rnr
cp ../_rnr/minimal/{babel.config.js,metro.config.js,tailwind.config.js,nativewind-env.d.ts,components.json} .
cp ../_rnr/minimal/global.css src/global.css
mkdir -p src/lib src/components/ui
cp ../_rnr/minimal/lib/{utils.ts,theme.ts} src/lib/
cp ../_rnr/minimal/components/ui/{button,icon,text}.tsx src/components/ui/
```
Then edit: metro `input: './src/global.css'`. Tailwind `content: ['./src/**/*.{ts,tsx}']`. `components.json` css → `src/global.css`. Replace token blocks with §10.6. Rewrite `src/lib/theme.ts` to FordCast values (keep `import { DarkTheme, DefaultTheme, type Theme } from 'expo-router/react-navigation'`). Add `import '@/global.css'` + `<PortalHost />` in the root layout. Run `npx @react-native-reusables/cli@latest doctor`. Then smoke-test in Expo Go: one `<Button><Text>Test</Text></Button>` must render with FordCast colors.

**Step 3: Add RNR components (one command):**
```bash
npx @react-native-reusables/cli@latest add card badge alert separator skeleton switch toggle-group toggle tabs progress dialog alert-dialog select input label textarea radio-group checkbox collapsible accordion avatar -y
```
(Skip desktop-centric `hover-card`, `menubar`, `context-menu`, `tooltip`.)

**Step 4: Import the map-first sheet pattern** from gorhom `example/src/screens/integrations/map/` (MIT, keep the license header). Adapt `LocationListBottomSheet` → `CrossingListSheet`, `LocationDetailsBottomSheet` → `CrossingDetailsSheet` (the signature Crossing Card), `Weather` → `FreshnessPill` (follows `animatedPosition`), `BlurredBackground`/`BlurredHandle` → `GlassSurface` (iOS) / solid surface (Android). Replace `BottomSheetModal` with persistent `BottomSheet` for the list (`index={0}`, `snapPoints={[148, '45%', '88%']}`, `enableDynamicSizing={false}`, `bottomInset` ≈ tab bar height constant (`Platform.select({ ios: 50, android: 80 })`, the default template's `BottomTabInset` [Verified])).

**Step 5: Import the map setup** from Expo `with-maps`, then add `customMapStyle={nightStyle}` (Android), `userInterfaceStyle="dark"` + `mapType={Platform.OS==='ios' ? 'mutedStandard' : 'standard'}`, `showsUserLocation`, `toolbarEnabled={false}`. Markers use `tracksViewChanges={false}` after first render [props verified in react-native-maps 1.27.2 src].

**Step 6: Import Skia patterns** from `with-skia` for the Canvas setup. Write `RiskRing`, `Sparkline`, `WaterPulse` from scratch.

**Step 7: Import Maestro flows** from `with-maestro` (`appId: host.exp.Exponent` for Expo Go [Verified]. Your package id for dev builds).

**Step 8: Restyle map (RNR component → FordCast use → changes):**

| RNR component | FordCast usage | Restyle rules |
|---|---|---|
| `button` | primary actions ("Check my drive", "Start Drive Mode", "I understand") | Variants: `default` = near-white bg + navy text (15.4:1). `destructive` = `#C62828` + white (5.62:1). `outline` = 1px `border` on `card`. `ghost`. Add size `xl` (h-16, text-lg) for Drive Mode. Min target **48 dp** (64+ in Drive Mode). `font-semibold`. Press feedback: opacity 0.85 + haptic `selectionAsync` |
| `badge` | **StatusChip** (wrap; don't use raw) | Variants: `nosignal` (slate text on card + ◯ glyph), `watch` (navy text on amber bg, ▲), `avoid` (white on `#C62828`, ⛔), `closed` (white on `#C62828` + **diagonal barricade stripes** via SVG pattern), `unknown` (slate text, **dashed** `#6B7A90` outline, "?" glyph). Always **icon + WORD + pattern** |
| `card` | CrossingCard, StormCard, Settings groups | bg `card` `#152238`, 1px `border` `#2A3A55`, radius 16, padding 16. Elevated layer `#1C2C47` only for popovers |
| `alert` | StaleBanner, OfflineBanner, CapabilityBanner, Disclaimer | amber outline + ⚠ for stale ("Risk as of 12 min ago"). Slate for offline. Never green |
| `progress` | Replay progress, risk-window bar | track `#1C2C47`, fill by state color. Never animate to "complete = safe" |
| `toggle-group` | Replay speed 1× / 10× / 60×, map layer filter | selected = near-white bg + navy text |
| `tabs` | Crossing detail: Now / Upstream / History | underline indicator in `foreground` |
| `skeleton` | loading placeholders | slate shimmer. **Loading must never resemble "No current signal"**, so add a "Loading…" label |
| `dialog` / `alert-dialog` | disclaimer acceptance, "Leave Drive Mode?" | Render inside a **PortalHost within formSheet screens** (P13) |
| `select` / `radio-group` | language, voice, units | — |
| `switch` / `checkbox` | settings, alert subscriptions | thumb `foreground`; "on" track uses near-white, not cyan, so cyan stays reserved for water data |
| `input` / `textarea` / `label` | search, route entry | h-12, `input` border, focus ring cyan |
| `accordion` / `collapsible` | About, Data sources, "How the forecast works" | — |
| `separator`, `avatar`, `text`, `icon` | general | `Text` default `font-sans text-foreground`. Numbers use `style={{ fontVariant: ['tabular-nums'] }}` |

---

## 14. Testing and tooling

| Tool | Setup | Notes |
|---|---|---|
| TypeScript strict | `~6.0.3`, `strict`, `noUncheckedIndexedAccess`, `npm run typecheck` | **Do not install `typescript@latest` (7.0.2)**: typescript-eslint peers `<6.1.0` [Verified] |
| ESLint | `npx expo lint` → `eslint.config.js` (flat, `eslint-config-expo/flat`) + prettier. Ban `@react-navigation/*` imports | Pin `eslint@^9.39.5` if 10.x appears (eslint-plugin-react peers ≤ ^9.7) [Verified] |
| Prettier | 3.9.10 + `prettier-plugin-tailwindcss` | — |
| Unit tests | `jest-expo` preset, Jest 29, RNTL 14.1.0 (`test-renderer` peer) | Test the **risk state machine, staleness → UNKNOWN rule, closure override, window formatting ("15–30 min", never a countdown), i18n key parity EN/ES**. `react-test-renderer` is deprecated with React 19 [Verified docs] |
| E2E | **Maestro**: `maestro test .maestro/expo-go/home.yml` with `appId: host.exp.Exponent` (Expo Go) or your package id (dev build) | Works on Windows/Linux with an Android emulator. iOS flows need a Mac. Installer: see maestro.mobile.dev (**[Unverified]** current CLI version) |
| EAS Build | `development` / `preview` APK profiles | free tier, low-priority queue |
| EAS Update | `eas update --channel preview` | Updates only run in builds whose `runtimeVersion` matches. In Expo Go it is "simulation only" [Verified] |
| expo-doctor | `npx expo-doctor@latest` after every dependency change, plus `npx expo install --check` | catches SDK-mismatched versions |
| Accessibility QA | TalkBack on Android device. `accessibilityRole`/`accessibilityLabel`/`accessibilityState` on every chip/marker. `AccessibilityInfo.announceForAccessibility` on state changes. Reanimated `ReduceMotion.System` | Custom scrubber needs `accessibilityRole="adjustable"` + increment/decrement actions |

---

## 15. Known pitfalls and version conflicts

1. **P1: Store Expo Go is SDK 54 on iOS.** SDK 57 cannot run on a physical iPhone without a paid account (`eas go`). Plan Android-first (§2.2) [Verified].
2. **P2: SDK 58 lands mid-project.** Expo Go "latest" becomes 58 and won't open SDK 57. Pin `expo ~57.0.28`. Never run `npx expo install expo@latest`. Install Expo Go via `npx expo start` → `a`. Demo with the **preview APK** [Verified: dist-tags `next` = 58.0.9; mismatch doc].
3. **P3: `npm install <pkg>@latest` breaks SDK alignment.** Latest ≠ SDK pin: Reanimated 4.7.1 vs **4.5.1**, Worklets 0.13.0 vs **0.10.1**, RNGH **3.3.0 vs ~2.32.0**, Skia 2.14.0 vs **2.6.2**, FlashList 2.3.3 vs **2.0.2**, Sentry 8.30.0 vs **~7.11.0**, Maps 1.29.11 vs **1.27.2**. Always `npx expo install` [Verified: npm view vs bundledNativeModules]. In Expo Go the native side is fixed, so a JS/native mismatch crashes.
4. **P4: Reanimated 4.5.1 peers RN 0.83–0.86 and worklets 0.10.x exactly** [Verified].
5. **P5: No `@react-navigation/*` imports in app code** (SDK 56+). Use `expo-router/react-navigation`, `/js-tabs`, `/js-stack`. Library imports are shimmed temporarily [Verified]. Copied snippets from older tutorials will break.
6. **P6: `Tabs` from `'expo-router'` is deprecated.** Use `expo-router/js-tabs` if you need JS tabs [Verified].
7. **P7: NativeTabs import path is `expo-router/unstable-native-tabs` on SDK 54–57.** Docs on `main` show the SDK 58 path `expo-router/native-tabs` [Verified]. Max **5 tabs on Android**, tab-bar height not measurable, no nested native tabs.
8. **P8: formSheet on Android:** max **3 detents**, no native header inside. Render the title in content [Verified].
9. **P9: NativeWind v4 needs Tailwind v3** (`tailwindcss@^3.4.19`), not v4.3.3 (npm latest). Tailwind `content` globs must include every folder that uses `className` (`./src/**/*`), or styles silently vanish. Restart with `npx expo start -c` after config changes.
10. **P10: React Compiler is on in the default template.** **[Unverified]** interaction with NativeWind v4's `cssInterop`/jsx transform. Ship with `experiments.reactCompiler: false`. Enable later only after a smoke test. With Reanimated, use `sv.get()/sv.set()` style if you enable it.
11. **P11: `sonner-native` must be 0.27.0+** (0.26.0's worklets peer excludes 0.10) [Verified].
12. **P12: gorhom v5 `enableDynamicSizing` defaults to true.** Set it to false with fixed snap points. `BottomSheetFlashList` is deprecated, use `useBottomSheetScrollableCreator` [Verified].
13. **P13: Portals and toasts render under native modals.** RNR `Dialog` inside a `formSheet`/`fullScreenModal` route needs its own `<PortalHost name="sheet" />` inside that screen (pass `portalHost="sheet"`). Show toasts from the underlying screen or use inline banners.
14. **P14: Android blur over the map** is unreliable (**[Unverified]** for Google MapView surfaces). Use solid translucent navy on Android, `GlassView`/`BlurView` on iOS. `GlassView` falls back to a plain `View`, so always supply a fallback background [Verified].
15. **P15: Google Maps on Android builds needs `androidGoogleMapsApiKey`** (Expo Go doesn't). Mobile Native Dynamic Maps are $0, but GCP requires a **billing account** (a parent's card). **Do not use `googleMapId`** (cloud styling is a paid SKU). Use `customMapStyle` JSON [Verified: Google usage-and-billing summary; react-native-maps plugin source]. With no key, record the demo in Expo Go.
16. **P16: Background location/geofencing and remote push don't work in Expo Go.** Gate them with `caps` and show the banner [Verified].
17. **P17: iOS geofence limit is 20 regions** (Android 100). Rotate the nearest Watch/Avoid crossings on significant location change [Verified].
18. **P18: Android edge-to-edge is always on.** Map under status bar is fine. HUD and sheets must use `useSafeAreaInsets()`.
19. **P19: Custom fonts on Android:** `fontWeight` won't pick a weight file. Use one family per weight (`font-semibold` → `Inter_600SemiBold`).
20. **P20: Dynamic Type:** keep `allowFontScaling`. Cap only dense HUD numerals with `maxFontSizeMultiplier={1.4}`. Body text must scale.
21. **P21: `typescript@latest` is 7.0.2** and typescript-eslint supports `<6.1.0`. Stay on `~6.0.3` [Verified].
22. **P22: ESLint 10** is unsupported by eslint-plugin-react/import. Pin `^9.39.5` [Verified].
23. **P23: RNTL 14 needs the `test-renderer` peer.** If incompatible, fall back to `@testing-library/react-native@13.3.3` [Verified versions].
24. **P24: Expo `with-victory-native` example uses legacy `victory-native ^35`.** Use 42.0.1 [Verified].
25. **P25: Expo `with-tailwindcss` example uses NativeWind 5 preview.** Don't copy its config [Verified].
26. **P26: RNR templates are on SDK 56.** Never `init` and keep SDK 56. Either import files (§13) or upgrade with `npm i expo@^57.0.0 && npx expo install --fix` [Verified].
27. **P27: `expo-dev-client` changes `npx expo start` default.** After installing it, use `npx expo start --go` to open Expo Go, or press `s` to switch [Verified: docs expo-cli].
28. **P28: Physical iOS + Expo Go needs the same Expo account** in CLI and app [Verified].
29. **P29: Render free tier sleeps** (15 min, per secondary source, **[Unverified]**). The app must read crossing status **from Supabase directly** (PostgREST + Realtime) and only call FastAPI for routing/replay, with a "waking server…" state and timeouts. **Supabase free projects pause after 7 days of low activity** [Verified: supabase.com/docs free-project-pausing]. The 5-minute ingest keeps it active, and the app treats a fetch failure as **UNKNOWN**, never calm.
30. **P30: Client-side staleness is authoritative for the UI.** If `updated_at` is older than **15 min** (3 missed 5-min cycles), render **Unknown — data offline** regardless of the server state. Official closures override the model. Unit-test this.
31. **P31: `expo-symbols` is beta**, and the SF Symbol / Material names used are **[Unverified]**. Check that each renders, and fall back to lucide.
32. **P32: Supabase anon key ships in the app** (by design). RLS: `select` only on public views. No write policies for `anon`.
33. **P33: EAS build budget.** ~15 Android builds/month on the free plan. Use EAS Update for JS-only fixes.

---

## 16. SDK 54 contingency lane (use only if the builder's sole device is an iPhone with no Mac/$99)

`npx create-expo-app@latest fordcast-app --template default@sdk-54`, then run in **App Store Expo Go** (sign in with the same Expo account). Versions [Verified: expo@54.0.37 bundledNativeModules]: RN **0.81.5**, React **19.1.0**, expo-router **~6.0.24**, reanimated **~4.1.1**, worklets **0.5.1**, RNGH **~2.28.0**, maps **1.20.1**, Skia **2.2.12**, flash-list 2.0.2, svg 15.12.1, lottie ~7.3.1, expo-glass-effect ~0.1.10, @expo/ui ~0.2.0-beta.9 (beta), expo-symbols ~1.0.8, @sentry/react-native ~7.2.0.

Deltas from this plan:
- `victory-native@41.26.0` (42 needs Skia ≥ 2.6).
- `sonner-native@0.24.0` (0.25+ needs worklets ≥ 0.6).
- NativeTabs uses the **SDK 54 API** (`import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs'`, no compound `.Trigger.Icon`) [Verified docs].
- Use `@react-navigation/native` imports (no `expo-router/react-navigation` in Expo Router 6).
- No `Stack.Toolbar`.
- Legacy-arch toggle still exists (keep New Arch on).

Same Expo Go limits otherwise (no background geofencing, push works in iOS Expo Go on 54 **[Unverified]**). Trade-off: older APIs, but the builder can test on their own iPhone and judges with iPhones can open an EAS Update in Expo Go.

---

## 17. What the master prompt should tell the coding agent (stack summary)

1. Scaffold with `npx create-expo-app@latest fordcast-app --template default@sdk-57`. Keep the generated **AGENTS.md** and append FordCast rules.
2. Never change SDK. Install only via `npx expo install`. Run `npx expo-doctor@latest` after each batch.
3. Styling = NativeWind 4.2.7 + Tailwind 3.4.19 + RNR (imported theming layer + `add` components). Tokens in `src/global.css` (§10.6). Dark-only.
4. Navigation = NativeTabs (5) + root Stack with `formSheet` / `fullScreenModal` / `Stack.Protected`.
5. Map = react-native-maps 1.27.2 + gorhom 5.2.14 persistent sheets (imported MapExample pattern).
6. Visuals = Skia 2.6.2 (ring/sparkline/pulse) + victory-native 42.0.1 (hydrograph) + Reanimated 4.5.1 CSS animations. Respect Reduce Motion.
7. Data = Supabase direct reads + Realtime. React Query with persisted cache in `expo-sqlite/kv-store`. zod-validate everything. Client staleness → UNKNOWN.
8. Every native-only capability is gated by `src/lib/capabilities.ts` (`isRunningInExpoGo()`), with an honest banner. Never fake.
9. Test: Jest 29 + jest-expo + RNTL for state logic. Maestro for the demo flow. Android APK via EAS for judges.

---

## 18. Sources

- npm registry (all versions, peers, dist-tags, publish times), queried 2026-10-14: `npm view` / `npm pack` for every package named above.
- expo@57.0.28 tarball: `bundledNativeModules.json`, `template.tgz` (gradle.properties, Podfile), `build/Expo.d.ts`.
- expo-template-default@57.0.30 tarball (package.json, app.json, src/app, app-tabs.tsx, theme.ts).
- create-expo@5.0.3 tarball (`promptSdkVersion.ts`, CLI help).
- expo-router@57.0.26 tarball (`build/exports.d.ts`, `native-tabs/types.d.ts`, `react-navigation/native-stack/types.d.ts`).
- expo/expo GitHub `main` @ d3bbf62 (2026-10-14): `docs/pages/troubleshooting/expo-go-version-mismatch.mdx`, `expo-go-sign-in-required.mdx`, `more/create-expo.mdx`, `more/expo-cli.mdx`, `develop/tools.mdx`, `develop/unit-testing.mdx`, `guides/using-eslint.mdx`, `router/advanced/{native-tabs,modals,stack-toolbar,protected}.mdx`, `router/migrate/{sdk-55-to-56,sdk-57-to-58}.mdx`, `router/installation.mdx`, `build/{eas-json,internal-distribution,updates}.mdx`, `eas-update/deployment.mdx`, `versions/v57.0.0/sdk/*.mdx`, `packages/@expo/sdk-compatibility/src/sdk-compatibility.json`, `docs/ui/components/SDKTables/utils.test.ts`.
- expo/expo `sdk-57` branch @ 6b0b556 (2026-10-13): `apps/expo-go/package.json`, `apps/expo-go/sdkVersions.json`.
- https://expo.dev/changelog/sdk-57 · https://expo.dev/changelog/sdk-56 · https://expo.dev/changelog/sdk-55 · https://expo.dev/changelog/sdk-58-beta · https://expo.dev/changelog/expo-go-and-app-store-may-2026 · https://expo.dev/go?sdkVersion=57&platform=ios&device=true · https://expo.dev/blog/expo-router-v56-decoupling-from-react-navigation (via web search summaries)
- https://expo.dev/pricing · https://docs.expo.dev/billing/plans/ (EAS free tier, via search)
- https://github.com/founded-labs/react-native-reusables (docs `cli.mdx`, `installation/index.mdx`, `apps/docs/components/command-tabs.tsx`) · https://github.com/founded-labs/react-native-reusables-templates
- https://github.com/gorhom/react-native-bottom-sheet (`example/src/screens/integrations/map/*`, `src/*`)
- https://github.com/expo/examples (`with-maps`, `with-skia`, `with-maestro`, `with-victory-native`, `with-tailwindcss`, `with-router-uniwind`, `with-sentry`)
- https://github.com/obytes/react-native-template-obytes · https://github.com/infinitered/ignite
- https://www.nativewind.dev/v5 · https://github.com/nativewind/nativewind/discussions/1818 · https://uniwind.dev/ (via search)
- https://gluestack.io/blogs/gluestack-ui-v5-stable-release (via search)
- https://developers.google.com/maps/documentation/android-sdk/usage-and-billing (via search)
- https://supabase.com/docs/guides/platform/free-project-pausing (via search)
- https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility (via search)
