# PART D — Mobile engineering (§25–§37)

> Scope: everything inside `mobile/`. Visual specs (tokens, components, screens, motion) are owned by Part B (§8–§15); the data contracts the app consumes are owned by Part C (§19 replay format, §22 REST API, §23 push). Where this part shows code, it is a **correct skeleton**: complete the bodies, keep the names, signatures and file paths. Every `VERIFY BEFORE USE` item MUST be checked against the installed package's shipped types (`node_modules/<pkg>/build/**/*.d.ts` or `lib/typescript/**`) or on a device before code depends on it, and the result logged in `docs/decisions/verifications.md` (§1.3). A bare "VERIFY …" in parentheses or a table cell is shorthand for **VERIFY BEFORE USE** with the same obligation; the fallback is stated next to it.

---

## §25. Mobile stack & exact versions

### 25.1 Platform baseline (frozen through Dec 31 2026)

| Item | Value | Source |
|---|---|---|
| Expo SDK | **57** — `expo@~57.0.28` (dist-tags `latest`/`sdk-57`, published 2026-10-12) | npm, verified 2026-10-14 |
| React Native / React | **0.86.3** / **19.2.3** (from `expo@57.0.28` `bundledNativeModules.json`) | verified |
| Architecture | New Architecture always on (Legacy removed in SDK 55); Hermes; Android edge-to-edge on | verified (template `gradle.properties`) |
| Android | min **API 24 (Android 7)**, compileSdk/targetSdk **36** | verified (`sdk-compatibility.json`) |
| iOS | min **16.4**; building needs **Xcode ≥ 26.4** | verified |
| Node | **≥ 22.13.0** | verified |
| TypeScript | **~6.0.3** (strict). Never `typescript@latest` (7.0.2 breaks typescript-eslint) | verified |
| SDK 58 | in beta (`expo@next` = 58.0.9). **Never upgrade before judging ends** — store Expo Go will move to 58 and stop opening SDK 57 projects | verified |

### 25.2 Master package table [MVP unless tagged]

`Go` = runs inside Expo Go SDK 57 (Android). "pin" = what `npx expo install` selects from `bundledNativeModules.json`; pure-JS packages are installed with `npm install --save-exact <pkg>@<version>` at the exact version shown.

**Runtime & navigation**

| Package | Version | Purpose | Go | Config plugin | Tier |
|---|---|---|---|---|---|
| expo | ~57.0.28 | SDK | Y | — | MVP |
| react / react-native | 19.2.3 / 0.86.3 | runtime | Y | — | MVP |
| react-dom / react-native-web | 19.2.3 / ~0.21.0 | peers of `@rn-primitives/*` (web is not a target) | — | — | MVP |
| expo-router | ~57.0.26 | file routes, NativeTabs, formSheet, `Stack.Protected` | Y | `"expo-router"` | MVP |
| react-native-screens | ~4.26.0 | native stack / sheets | Y | — | MVP |
| react-native-safe-area-context | ~5.7.0 | insets (Expo Router already provides the provider) | Y | — | MVP |
| react-native-gesture-handler | ~2.32.0 (**not** 3.x) | gestures, sheet, scrubber | Y | — | MVP |
| react-native-reanimated / react-native-worklets | **4.5.1 / 0.10.1** (exact pair) | animation, sim clock | Y | auto via `babel-preset-expo` | MVP |
| expo-dev-client | ~57.0.20 | development build | n/a | — | MVP |
| expo-updates | ~57.0.26 | EAS Update (OTA) | simulated | written by `eas update:configure` | MVP |
| expo-splash-screen | ~57.0.10 | splash | Go's own | `["expo-splash-screen",{…}]` | MVP |
| expo-status-bar / expo-system-ui | ~57.0.1 / ~57.0.4 | status bar, root background | Y | — | MVP |
| expo-constants / expo-linking / expo-device | ~57.0.21 / ~57.0.12 / ~57.0.2 | config, deep links, device info | Y | — | MVP |
| expo-web-browser | ~57.0.3 | open sources, privacy policy | Y | — | MVP |

**Styling, templates, UI**

| Package | Version | Purpose | Go | Plugin | Tier |
|---|---|---|---|---|---|
| nativewind | **^4.2.7** (never 5.x RC) | Tailwind for RN (engine `react-native-css-interop` 0.2.7) | Y | none (babel preset + metro wrapper) | MVP |
| tailwindcss (dev) | **^3.4.19** (never 4.x) | NativeWind v4 requires Tailwind 3 | — | — | MVP |
| tailwindcss-animate · class-variance-authority · clsx · tailwind-merge | 1.0.7 · 0.7.1 · 2.1.1 · ^3.5.0 | RNR runtime deps | Y | — | MVP |
| @rn-primitives/portal · @rn-primitives/slot (+ others added by `rnr add`) | ~1.4.0 · ^1.5.2 | RNR primitives | Y | — | MVP |
| @react-native-reusables/cli (npx) | 0.7.1 | `add`, `doctor` | — | — | MVP |
| lucide-react-native | 1.57.0 | icons **only** inside RNR internals | Y | — | MVP |
| react-native-svg | 15.15.4 | StatusGlyph, stripes, dashed rings | Y | — | MVP |
| @gorhom/bottom-sheet | 5.2.14 | persistent Map Home sheet | Y | — | MVP (device-test Day 1) |
| @shopify/flash-list | 2.0.2 (not 2.3.x) | long lists (+ `useBottomSheetScrollableCreator`) | Y | — | MVP |
| sonner-native | **0.27.0** (0.26 rejects worklets 0.10) | neutral toasts only | Y | — | MVP |
| expo-font + @expo-google-fonts/inter | ~57.0.4 + **0.4.2** | Inter 400/500/600/700, embedded | Y | `["expo-font",{fonts:[…]}]` | MVP |
| expo-image | ~57.0.5 | images | Y | — | MVP |
| expo-symbols | ~57.0.3 (beta) | SF Symbols / Material Symbols | Y | — | MVP |
| expo-glass-effect | ~57.0.4 | iOS 26 Liquid Glass chrome | Y | — | Stretch (F41) |
| expo-blur · expo-linear-gradient | ~57.0.3 · ~57.0.2 | iOS-only blur; gradients | Y | — | MVP |
| expo-haptics | ~57.0.3 | semantic haptics (§11.6) | Y | — | MVP |
| @expo/ui | ~57.0.23 | optional native controls; required by expo-widgets | Y | — | optional / Lane B |
| react-native-keyboard-controller | 1.21.9 | search sheet keyboard | Y | — | optional |
| expo-mesh-gradient · lottie-react-native | ~57.0.2 · ~7.3.8 | onboarding hero only | Y | — | optional |

**Graphics & charts**

| Package | Version | Purpose | Go | Tier |
|---|---|---|---|---|
| @shopify/react-native-skia | **2.6.2** (not 2.14) | RiskRing, Sparkline, WaterPulse, stripes | Y | MVP |
| victory-native | **42.0.1** (Skia-based; never the legacy 35 example) | Hydrograph, LagPair, replay result bars | Y | MVP |

**Map**

| Package | Version | Purpose | Go | Plugin | Tier |
|---|---|---|---|---|---|
| @maplibre/maplibre-react-native | **11.5.0** (v11 API) | the map (§29) | **N** | `"@maplibre/maplibre-react-native"` | MVP |
| react-native-maps | 1.27.2 (not 1.29.x) | optional Expo-Go-only fallback behind `MapSurface` | Y | none needed in Expo Go | optional |

**Location, alerts, voice**

| Package | Version | Purpose | Go | Plugin | Tier |
|---|---|---|---|---|---|
| expo-location | ~57.0.21 | foreground watch, geofencing, motion activity | partial (fg only) | `["expo-location",{…}]` | MVP fg / Stretch bg |
| expo-task-manager | ~57.0.21 | top-level task definitions | partial | — | MVP (defined) / Stretch (used) |
| expo-background-task | ~57.0.21 | ≥ 15 min background refresh | N | VERIFY whether `npx expo install` adds one | Stretch (F74) |
| expo-notifications | ~57.0.22 | channels, local, push | local only (Android Go) | `["expo-notifications",{…}]` | MVP |
| expo-speech | ~57.0.3 | TTS EN/ES | Y | — | MVP |
| expo-audio | ~57.0.5 (**not** expo-av) | chimes + ducking | Y | — | MVP |
| expo-keep-awake | ~57.0.2 | Drive Mode | Y | — | MVP |
| expo-widgets | ~57.0.24 | Live Activity / iOS widgets | N | `["expo-widgets",{…}]` **Lane B only** | Stretch (F112, F113) |

**Data, state, storage**

| Package | Version | Purpose | Go | Tier |
|---|---|---|---|---|
| expo-sqlite | ~57.0.4 | offline cache tables + `expo-sqlite/kv-store` (no MMKV) | Y | MVP |
| expo-network | ~57.0.2 | online/offline state | Y | MVP |
| @tanstack/react-query · react-query-persist-client · query-async-storage-persister | **5.104.2** each | server state + persisted cache | Y | MVP |
| zustand | **5.0.15** | client state (persist → kv-store) | Y | MVP |
| @supabase/supabase-js | **2.117.3** | Realtime `postgres_changes` (publishable key) | Y | MVP |
| zod | **4.6.7** | validate every payload | Y | MVP |
| date-fns | **4.4.0** | date math (not relative-time copy, §35) | Y | MVP |
| expo-secure-store | SDK pin via `npx expo install` — **VERIFY BEFORE USE** (resolve, read d.ts); fallback `expo-sqlite/kv-store` | device secret (F27) | Y | MVP |
| expo-asset · expo-file-system | SDK pins via `npx expo install` — **VERIFY BEFORE USE** (SDK 57 `File` API vs `expo-file-system/legacy`) | read bundled `*.json.gz` replays (§33) | Y | MVP |
| expo-crypto | SDK pin via `npx expo install` — **VERIFY BEFORE USE** (`digestStringAsync` + `CryptoDigestAlgorithm.SHA256`) | replay sha256 check (§33); fallback: no Storage overrides | Y | MVP |
| fflate | **VERIFY BEFORE USE**: `npm view fflate version license time peerDependencies` (expect MIT, no peers, ≥ 2 weeks old); pin the exact version found | gunzip `*.json.gz` (§33); fallback: bundle plain `.json` | Y | MVP |
| expo-sharing | ~57.0.23 (design.md) — VERIFY via `npx expo install` | crew CSV export | Y | Stretch (F101) |

**i18n & geo**

| Package | Version | Purpose | Go | Plugin | Tier |
|---|---|---|---|---|---|
| i18next / react-i18next | **26.4.4 / 17.0.16** | strings | Y | — | MVP |
| intl-pluralrules | **2.0.1** (import first; Hermes lacks `Intl.PluralRules`) | plurals | Y | — | MVP |
| expo-localization | ~57.0.2 | device locale, per-app language | Y | `["expo-localization",{supportedLocales:{ios:["en","es"],android:["en","es"]}}]` | MVP |
| @turf/helpers · distance · point-to-line-distance · nearest-point-on-line · boolean-point-in-polygon · circle · bbox · along · length | **7.4.0** each (never `@turf/turf`, 114 deps) | on-device geometry | Y | — | MVP/Stretch |

**Monitoring, dev & test**

| Package | Version | Purpose | Tier |
|---|---|---|---|
| @sentry/react-native | ~7.11.0 (not 8.x); plugin `"@sentry/react-native/expo"` | crash reports, scrubbed | Stretch (F125) |
| typescript · @types/react | ~6.0.3 · ~19.2.2 | types | MVP |
| eslint · eslint-config-expo | **^9.39.5** (pin < 10) · ~57.0.2 (flat: `eslint-config-expo/flat`) | lint | MVP |
| prettier · eslint-config-prettier · eslint-plugin-prettier · prettier-plugin-tailwindcss | 3.9.10 · 10.1.8 · 5.5.7 · ^0.8.1 | format | MVP |
| jest-expo · jest · @types/jest | ~57.0.6 · **^29.7.0** · ^29.5.14 | tests (jest-expo 57 is Jest-29 based) | MVP |
| @testing-library/react-native (+ peer `test-renderer`) | 14.1.0 (+ 1.3.1); fallback 13.3.3 | component tests | MVP |
| @react-native-ama/core | 1.2.1 — has a native module (not in Expo Go); dev builds only; add to the Day-1 build **only if** the human opts in | runtime a11y linting | Stretch (F95) |
| CLIs | `eas-cli` 24.13.0 (`npx eas-cli@latest`), `expo-doctor` 1.20.4 (`npx expo-doctor@latest`), Maestro (VERIFY install command on maestro.mobile.dev), `scrcpy` | builds, health, E2E, capture | MVP |

### 25.3 Rejected / deferred (do not install)

| Package | Why |
|---|---|
| react-native-mmkv 4.3.2, react-native-unistyles 3.5.3 | Nitro modules, not in Expo Go; `expo-sqlite/kv-store` covers KV |
| @lodev09/react-native-true-sheet 3.11.18, burnt 0.13.0 | native modules with no advantage over gorhom/formSheet/sonner-native |
| expo-maps 57.0.4 | alpha, "frequent breaking changes", Google-only on Android |
| @rnmapbox/maps 10.3.8 | runner-up only (needs Mapbox token/account); switch notes in §29.14 |
| moti 0.30.0 | Reanimated-3 era, stale; use Reanimated 4 CSS animations |
| nativewind 5.0.0-rc.0, Tailwind 4, Expo `with-tailwindcss` example | pre-release / incompatible with NativeWind v4 |
| heroui-native 1.0.10 (+ Uniwind) | valid alternative kit but requires Uniwind/Tailwind 4 — **never mix with NativeWind v4** |
| tamagui 3.0.9, react-native-paper 5.15.3, gluestack-ui v5 | complexity / Material look / ties to NW5 or Uniwind |
| phosphor-react-native, react-native-gifted-charts | runner-ups; not needed |
| victory-native ^35 (Expo `with-victory-native` example) | legacy SVG version |
| expo-av 16.0.8 | not bundled in SDK 57; use expo-audio |
| expo-live-activity 0.4.2 | stale; expo-widgets is first-party |
| react-native-carplay 2.4.1-beta.0 | 2024, peers React ≤ 18, entitlement needed → Roadmap (F117) |
| react-native-android-widget 0.22.1 | Android widgets are Roadmap (F114) |
| @turf/turf | 114 deps; install individual modules |
| eslint-plugin-react-native-a11y 3.5.1 | peers ESLint ≤ 8 |
| react-test-renderer | deprecated with React 19; RNTL 14 uses `test-renderer` |
| react-native-url-polyfill 4.0.0 | not needed (`expo` ships a URL implementation); add only if `URL` errors appear, after a stop-and-ask |
| `typescript@latest`, `eslint@10`, any `<native-pkg>@latest` | break the SDK 57 / tooling alignment (§37) |

### 25.4 Install commands — exact order (Day 0, Lane A)

Run from the repo root on macOS/Linux/WSL (Windows PowerShell needs `-- --dev` instead of `--dev`). Every native module the plan might ever need goes in **now** so the Day-1 dev build contains it (§1.3 rule 6).

```bash
# 0) prerequisites
node -v                                    # must be >= 22.13.0
npx expo login                             # free Expo account (same account as Expo Go, if used)

# 1) scaffold the app inside the monorepo (pins SDK 57 even after SDK 58 ships)
npx create-expo-app@latest mobile --template default@sdk-57
cd mobile
[ -d .git ] && rm -rf .git                 # never a nested repo inside the monorepo
npm run reset-project                      # starter moves to example/ (reference only; delete before the submission tag)

# 2) dev client + platform modules
npx expo install expo-dev-client expo-updates expo-device expo-constants expo-linking \
  expo-system-ui expo-status-bar expo-splash-screen expo-image expo-symbols expo-glass-effect \
  expo-web-browser expo-haptics expo-blur expo-linear-gradient

# 3) styling layer (NativeWind v4 + RNR runtime) — §12.2 Step 2 copies the RNR theming files
npx expo install nativewind tailwindcss-animate class-variance-authority clsx tailwind-merge \
  @rn-primitives/portal@~1.4.0 @rn-primitives/slot lucide-react-native react-native-svg
npm install --save-dev tailwindcss@^3.4.19 prettier@3.9.10 prettier-plugin-tailwindcss@^0.8.1
grep -E '"(nativewind|tailwindcss)"' package.json   # MUST show nativewind ^4.2.7 and tailwindcss ^3.4.19

# 4) motion, gestures, graphics, sheets, lists, fonts, toasts
npx expo install react-native-reanimated react-native-worklets react-native-gesture-handler \
  @gorhom/bottom-sheet @shopify/flash-list @shopify/react-native-skia victory-native sonner-native \
  expo-font @expo-google-fonts/inter
# optional: npx expo install lottie-react-native expo-mesh-gradient react-native-keyboard-controller

# 5) map, location, alerts, voice, storage, network, locale (ALL native; must be in the first build)
npx expo install @maplibre/maplibre-react-native expo-location expo-task-manager expo-background-task \
  expo-notifications expo-speech expo-audio expo-keep-awake expo-sqlite expo-network expo-localization

# 6) VERIFY-then-install SDK modules (record each resolved version in docs/decisions/verifications.md)
npx expo install expo-secure-store expo-crypto expo-asset expo-file-system expo-sharing

# 7) pure-JS packages at exact versions
npm install --save-exact @tanstack/react-query@5.104.2 @tanstack/react-query-persist-client@5.104.2 \
  @tanstack/query-async-storage-persister@5.104.2 zustand@5.0.15 @supabase/supabase-js@2.117.3 \
  zod@4.6.7 date-fns@4.4.0 i18next@26.4.4 react-i18next@17.0.16 intl-pluralrules@2.0.1 \
  @turf/helpers@7.4.0 @turf/distance@7.4.0 @turf/point-to-line-distance@7.4.0 \
  @turf/nearest-point-on-line@7.4.0 @turf/boolean-point-in-polygon@7.4.0 @turf/circle@7.4.0 \
  @turf/bbox@7.4.0 @turf/along@7.4.0 @turf/length@7.4.0
npm view fflate version license time.modified peerDependencies   # VERIFY, then:
npm install --save-exact fflate@<version-you-verified>

# 8) Lane B only (paid Apple account; §26): Live Activities / widgets
# npx expo install expo-widgets @expo/ui
# Stretch, only if the human wants crash reporting (F125):
# npx expo install @sentry/react-native

# 9) lint, format, tests
npx expo lint                              # creates eslint.config.js + eslint-config-expo
npx expo install eslint-config-prettier eslint-plugin-prettier --dev
npm ls eslint | grep -q 'eslint@10' && npm install --save-dev eslint@^9.39.5
npx expo install jest-expo jest @types/jest @testing-library/react-native --dev
npm install --save-dev jest@^29.7.0 @types/jest@^29.5.14   # force Jest 29 if a newer major resolved

# 10) health (after EVERY batch above)
npx expo install --check && npx expo-doctor@latest
```

### 25.5 Pin guard (CI) [MVP]

Create `mobile/scripts/check-pins.mjs` and run it in `npm run doctor` and in CI. It fails the build when a dependency drifts off the SDK-57/tooling alignment.

```js
// mobile/scripts/check-pins.mjs — fail CI if a critical pin drifts (§25, §37)
import fs from 'node:fs';
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));
const all = { ...pkg.dependencies, ...pkg.devDependencies };
const rules = {                       // value: regex the declared range MUST match
  expo: /^~?57\.0\./, 'react-native': /^0\.86\./, react: /^19\.2\./,
  'react-native-reanimated': /^~?4\.5\./, 'react-native-worklets': /^~?0\.10\./,
  'react-native-gesture-handler': /^~?2\.32\./, '@shopify/react-native-skia': /^~?2\.6\./,
  '@shopify/flash-list': /^~?2\.0\./, '@maplibre/maplibre-react-native': /^~?11\.5\./,
  nativewind: /^\^?4\./, tailwindcss: /^\^?3\./, 'victory-native': /^\^?42\./, 'sonner-native': /^\^?0\.27\./,
  typescript: /^~?6\.0\./, eslint: /^\^?9\./, jest: /^\^?29\./,
};
const bad = Object.entries(rules).filter(([k, re]) => all[k] && !re.test(all[k])).map(([k]) => `${k}@${all[k]}`);
const banned = ['react-native-mmkv', 'moti', 'expo-av', '@turf/turf', 'heroui-native', 'uniwind', 'tamagui']
  .filter((k) => all[k]);
if (bad.length || banned.length) { console.error('Pin drift:', bad, 'Banned:', banned); process.exit(1); }
console.log('pins ok');
```

### 25.6 Health checks

| Check | Command | When | Pass condition |
|---|---|---|---|
| SDK alignment | `npx expo install --check` | after every install batch; CI | "Dependencies are up to date" |
| Project doctor | `npx expo-doctor@latest` | same | 0 failed checks |
| RNR setup | `npx @react-native-reusables/cli@latest doctor` | after §12 Step 2 and any `rnr add` | no errors (it requires `inlineRem: 16`) |
| Pins | `node scripts/check-pins.mjs` | CI | "pins ok" |
| Types | `npx tsc --noEmit` | every commit | 0 errors |
| Native config sanity | `npx expo prebuild -p android --clean --no-install` then inspect `android/app/src/main/AndroidManifest.xml`; `npx expo prebuild -p ios --clean --no-install` then inspect `ios/*/Info.plist` (works on Linux; pods are skipped) | before each EAS build | permissions, usage strings, `UIBackgroundModes`, scheme present (§27.4); then delete `android/` and `ios/` (they are git-ignored, CNG) |

**Done when (§25):** every row of 25.2 marked MVP is installed at its pin; `check-pins` passes; `expo-doctor` and `rnr doctor` are clean; `docs/decisions/verifications.md` lists the resolved versions of the five VERIFY packages (or the documented fallback taken).

---

## §26. Build path (dev build, Expo Go, iOS/Android lanes)

### 26.1 Why a development build is the primary target

1. Remote push (Android Expo Go since SDK 53), background location, geofencing, background tasks, MapLibre, offline map packs and Live Activities **do not run in Expo Go** [verified, maps.md §16].
2. App Store Expo Go stops at **SDK 54**; a physical iPhone on SDK 57 needs a paid account (`eas go`) [verified].
3. When SDK 58 ships, store Expo Go stops opening SDK 57 projects. A standalone **preview APK** is immune, so judges and testers always use it.
4. The EAS free plan gives ~**15 Android builds/month** (the exact Android/iOS split is unverified), on a low-priority queue that can exceed **90 minutes**. JS changes never need a rebuild; only native modules or config-plugin changes do.

### 26.2 Lanes (chosen in Step 0, §1.2)

| Lane | Hardware/accounts | Builds | What gets tested | iOS label in README/Claims |
|---|---|---|---|---|
| **A (default)** | Android phone (Android 7+) or Android Studio emulator | EAS `development` APK (or local `npx expo run:android`) → `preview` APK | everything except iOS-only items | "iOS: compiles, untested" (+ optional simulator compile check, 26.8) |
| **B** | A + paid Apple Developer account ($99, parent's) | A + EAS internal iOS dev build; TestFlight internal only | iOS push, `timeSensitive`, Live Activity, VoiceOver | "Tested on iPhone (internal build)" |
| **C** | A + Mac with Xcode ≥ 26.4, no paid account | A + `npx expo run:ios --device` with a free personal team | iOS UI + VoiceOver; **no push, no App Groups** (VERIFY BEFORE USE: free-team limits on your Xcode; 7-day provisioning) | "iOS UI tested; push untested" |
| **D (contingency)** | only an iPhone; no Mac, no $99, no PC for an emulator | SDK 54 + App Store Expo Go (26.9) | foreground features only | stop-and-ask first |

### 26.3 Lane A step by step

1. **Expo project:** `npx eas-cli@latest init` (links the project, prints the `projectId` — not a secret; put it in `app.config.ts` `extra.eas.projectId`). `npx eas-cli@latest build:configure` then replace `eas.json` with 26.4.
2. **Firebase for Android push (FCM V1)** — human task on Day 0: create a Firebase project, add an Android app with package `org.fordcast.app` (or the Step-0 id), download `google-services.json`, and create a service-account key for FCM V1. Upload the key with `npx eas-cli@latest credentials` → Android → *Google Service Account Key for push notifications (FCM V1)* (VERIFY BEFORE USE: menu wording in eas-cli 24). Keep `google-services.json` **out of git**; provide it to EAS as a file environment variable (`npx eas-cli@latest env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility secret` — VERIFY flags with `eas env:create --help`) and reference it in `app.config.ts` as `process.env.GOOGLE_SERVICES_JSON ?? './google-services.json'`.
3. **Public env values** (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY` = `sb_publishable_…`, `EXPO_PUBLIC_API_BASE`) as EAS environment variables with plaintext visibility for the `development` and `preview` environments (VERIFY BEFORE USE: `eas env:create --environment` values and the `environment` key in `eas.json`). Fallback (safe, these values are public by design): put them in each profile's `env` block in `eas.json`.
4. **First dev build (Day 1, first thing):** `npx eas-cli@latest build -p android --profile development`. Install the APK from the build page QR on the phone; run `npx expo start --dev-client` on the laptop (same Wi-Fi, or `adb reverse tcp:8081 tcp:8081` over USB).
5. **Local alternative (no queue):** Android Studio + SDK 36 + its bundled JDK, then `npx expo prebuild -p android --clean && npx expo run:android` (debug dev client) or `npx expo run:android --variant release` for a release-like build (VERIFY BEFORE USE: `--variant` flag in `npx expo run:android --help`). Local builds don't consume EAS quota; the judge APK still comes from EAS `preview` (signed, reproducible).
6. **Day-1 device smoke test** (Part A §6 Day 1 list; record pass/fail in `docs/decisions/verifications.md`): MapLibre renders FordCast Night with Noto labels; max-rank cluster; gorhom sheet over the map; `crossing/[id]` formSheet detents; NativeTabs; Inter + tabular numerals; local notification on `crossing-urgent`; `expo-speech` EN+ES; `expo-audio` chime; SQLite; Skia; Reanimated CSS animation; Expo push token; `npx expo start --no-dev --minify` performance feel.

### 26.4 `mobile/eas.json` (exact)

```json
{
  "cli": { "version": ">= 24.0.0", "appVersionSource": "remote" },
  "build": {
    "base": {
      "env": { "EXPO_PUBLIC_DEMO_MODE": "0" }
    },
    "development": {
      "extends": "base",
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "environment": "development",
      "android": { "buildType": "apk" }
    },
    "ios-simulator": {
      "extends": "development",
      "ios": { "simulator": true }
    },
    "preview": {
      "extends": "base",
      "distribution": "internal",
      "channel": "preview",
      "environment": "preview",
      "android": { "buildType": "apk" }
    },
    "demo": {
      "extends": "preview",
      "channel": "demo",
      "env": { "EXPO_PUBLIC_DEMO_MODE": "1" }
    },
    "production": {
      "autoIncrement": true,
      "channel": "production",
      "environment": "production"
    }
  },
  "submit": { "production": {} }
}
```
- Verified keys: profiles, `developmentClient`, `distribution: "internal"`, `android.buildType: "apk"`, `channel`, `appVersionSource`, `autoIncrement`. VERIFY BEFORE USE: `extends`, `environment`, `ios.simulator` in the eas.json schema for eas-cli 24 (`npx eas-cli@latest build --help`, docs `build/eas-json`). If `environment` is rejected, delete it and use the `env` fallback (26.3 step 3).
- `production` is **never built before judging** (no store publishing, §38). `demo` exists only for the video (DEMO_MODE; §33.11) and costs one build — prefer recording from the dev build with `EXPO_PUBLIC_DEMO_MODE=1 npx expo start --dev-client --no-dev --minify` and use the `demo` profile only if the dev-client chrome shows in recordings.

### 26.5 Build budget (October)

| # | When | Profile | Why |
|---|---|---|---|
| 1 | Day 1 AM | development (Android) | every native module (§25.4) |
| 2 | ≤ Day 6, only if a Day-1 smoke test forced a native change | development | the single allowed native fix (§6.2 native freeze) |
| 3 | Day 7 | preview (Android) | first tester/judge APK; EAS Update channel `preview` |
| 4 | Day 10 | preview | final APK for the GitHub Release (code freeze) |
| 5 | optional, Day 9 | ios-simulator | "iOS compiles" evidence in Lane A (uses the iOS quota) |
| 6 | spare | demo or preview | emergency only |

Never exceed 4 development + 4 preview Android builds this month. Every JS-only change after build #3 ships with EAS Update.

### 26.6 EAS Update (OTA)

```bash
npx eas-cli@latest update:configure                      # writes updates.url + keeps runtimeVersion policy
npx eas-cli@latest update --channel preview --message "fix(map): keep max-rank cluster color"
npx eas-cli@latest update --channel development --message "..."   # dev builds also accept updates
```
- `runtimeVersion: { policy: 'appVersion' }` [verified]: an update reaches only builds with the same `version`. **Any** native change (new module, plugin option, permission, icon, Info.plist string) → bump `version` in `app.config.ts` + new build; never publish an update that needs native code the build lacks.
- The app checks for updates on cold start (expo-updates default behavior) and applies them on the next launch; never force-reload mid-drive.
- **During judging (Oct 26 → Dec 31):** `preview` updates only for safety/correctness fixes, each logged in `CHANGELOG.md` "After submission" with the update id; never change displayed metrics without regenerating README/video (science freeze, §6.2). The tagged commit `cac-2026-submission` stays reproducible: record which update id corresponds to it.
- In Expo Go, updates are "simulation only" — test OTA on the preview APK.

### 26.7 Expo Go as an optional fallback (Lane A convenience, Lane D necessity)

Expo Go is useful only for fast UI iteration before the first dev build lands. Everything native-only is gated so Expo Go never crashes and never fakes a capability.

```ts
// mobile/src/lib/capabilities.ts
import { isRunningInExpoGo } from 'expo';                 // verified export; do NOT use Constants.executionEnvironment
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const IS_EXPO_GO = isRunningInExpoGo();
const extra = (Constants.expoConfig?.extra ?? {}) as { iosPaid?: boolean };
const NATIVE = !IS_EXPO_GO && Platform.OS !== 'web';

export const caps = {
  maplibre: NATIVE,                                      // else MapSurface.expogo / .unavailable (§29.13)
  offlinePacks: NATIVE,                                  // F87
  remotePush: NATIVE && (Platform.OS === 'android' || extra.iosPaid === true),
  backgroundLocation: NATIVE,                            // F63
  geofencing: NATIVE,                                    // F70
  backgroundTask: NATIVE,                                // F74
  liveActivities: NATIVE && Platform.OS === 'ios' && extra.iosPaid === true,  // F112
  timeSensitive: NATIVE && Platform.OS === 'ios' && extra.iosPaid === true,   // F68
  liquidGlassCandidate: Platform.OS === 'ios',          // also isLiquidGlassAvailable() at runtime + Reduce Transparency
} as const;
export type Capability = keyof typeof caps;
```

Rules:
- **Never import a native-only module at the top level** of a file Expo Go loads (MapLibre, expo-widgets, @react-native-ama/core, Sentry native features). Use `caps` + a lazy `require()` inside the adapter (§29.13). ESLint enforces it (§27.11).
- Background/registration calls (`startGeofencingAsync`, `startLocationUpdatesAsync`, `registerTaskAsync`, `getExpoPushTokenAsync`) are wrapped: `if (!caps.X) return { ok: false, reason: 'expoGo' }`.
- The UI shows `CapabilityBanner kind="expoGo"` (§12.5) on Alerts, Drive and Settings: "Background alerts need the FordCast app build. In this preview, FordCast warns you only while the app is open." — never a silent no-op.
- After `expo-dev-client` is installed, `npx expo start` opens the dev client by default; use `npx expo start --go` (or press `s`) for Expo Go.
- Expo Go installs: `npx expo start --go` then press `a` (installs the matching SDK 57 Expo Go on the emulator/phone). Never install Expo Go from Google Play for this project (it may be another SDK).
- Maestro in Expo Go uses `appId: host.exp.Exponent`; on the dev/preview build use the app's package id.

| Feature | Expo Go (SDK 57, Android) | Dev / preview build |
|---|---|---|
| Map | react-native-maps fallback (no styling parity, no clustering) **or** "Map needs the FordCast build" panel + List | MapLibre FordCast Night |
| Crossing sheet, list, Replay player, Drive Mode foreground, TTS, haptics, SQLite, Realtime, local notifications, i18n | Y | Y |
| Remote push | N | Y (Android; iOS Lane B) |
| Background geofence alerts, Drive Mode background continuation, background refresh | N | Y (Stretch) |
| Offline map pack, Live Activity | N | Y (Stretch; Live Activity Lane B) |
| Fonts | `useFonts` runtime load only | embedded + `useFonts` |

### 26.8 iOS lanes in detail

- **Lane B (paid account):** register test devices `npx eas-cli@latest device:create`; build `npx eas-cli@latest build -p ios --profile development`; set `FORDCAST_IOS_PAID=1` in the EAS environment so `app.config.ts` adds the time-sensitive entitlement and (Stretch) `expo-widgets`. TestFlight **internal** testing is allowed only under the parent's account; never submit to the public App Store before judging (§38, §1.7).
- **Lane C (Mac, free team):** `npx expo prebuild -p ios --clean && npx expo run:ios --device`; select the personal team in Xcode signing. Do not enable the time-sensitive entitlement or App Groups (free teams can't sign them — VERIFY). Re-sign every 7 days.
- **Lane A "compiles" evidence (optional):** one `ios-simulator` EAS build (no Apple credentials needed for simulator builds — VERIFY BEFORE USE on the build log). A green build proves iOS compiles; it is not "tested". Keep every iOS-only path (`GlassView`, SF Symbol animation, Live Activity, `accessibilityLanguage`) behind `Platform.OS === 'ios'` with an Android-tested fallback.

### 26.9 SDK 54 contingency (Lane D only; stop-and-ask first)

`npx create-expo-app@latest mobile --template default@sdk-54`, run in **App Store Expo Go** signed in with the same Expo account. Verified SDK 54 pins: RN 0.81.5, React 19.1.0, expo-router ~6.0.24, reanimated ~4.1.1 + worklets 0.5.1, RNGH ~2.28.0, react-native-maps 1.20.1, Skia 2.2.12, flash-list 2.0.2, svg 15.12.1, lottie ~7.3.1, expo-glass-effect ~0.1.10, expo-symbols ~1.0.8, Sentry ~7.2.0. Deltas: `victory-native@41.26.0` (42 needs Skia ≥ 2.6); `sonner-native@0.24.0`; NativeTabs SDK-54 API (`import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs'`); `@react-navigation/*` imports (no `expo-router/react-navigation` in Router 6); no `Stack.Toolbar`; map = react-native-maps (`MapSurface.expogo` becomes the only implementation); **no** MapLibre, remote push, background location, geofencing or Live Activity — all of those become Roadmap in the Claims Ledger. Whether push works in iOS Expo Go on SDK 54 is unverified; assume no.

**Done when (§26):** the Day-1 dev build is installed on a real Android phone with every smoke test logged; `eas.json` matches 26.4 (or the logged fallback); a preview APK built by Day 7 runs on a second device; an EAS Update published to `preview` reaches it; the lane and its iOS label are recorded in `docs/decisions/step0.md` and the Claims Ledger.

---

## §27. Project config files

All paths are relative to `mobile/`. Delete the template's `app.json` after moving its values into `app.config.ts` (one source of truth).

### 27.1 `package.json` (required keys)

```jsonc
{
  "name": "fordcast-mobile",
  "main": "index.ts",                                   // custom entry (27.2) — verified pattern
  "private": true,
  "scripts": {
    "start": "expo start --dev-client",
    "start:go": "expo start --go",
    "android": "expo run:android",
    "typecheck": "tsc --noEmit",
    "lint": "expo lint",
    "test": "jest --watchAll=false",
    "doctor": "npx expo-doctor@latest && npx expo install --check && node scripts/check-pins.mjs",
    "e2e": "maestro test .maestro"
  },
  "jest": { "preset": "jest-expo", "setupFiles": ["<rootDir>/jest.setup.ts"],
            "moduleNameMapper": { "^@/assets/(.*)$": "<rootDir>/assets/$1", "^@/(.*)$": "<rootDir>/src/$1" },
            "testMatch": ["**/__tests__/**/*-test.ts?(x)"] }
}
```

### 27.2 `index.ts` (custom entry: tasks before the router)

```ts
// mobile/index.ts — TaskManager.defineTask(...) MUST run at module top level before the router loads,
// so a headless relaunch (iOS geofence event, Android foreground service) finds the task.
import './src/tasks/geofence';            // GEOFENCE_TASK (F70)
import './src/tasks/drive-location';      // DRIVE_LOCATION_TASK (F63)
import './src/tasks/background-refresh';  // BG_REFRESH_TASK (F74)
import 'expo-router/entry';               // MUST be last
```
Task modules import only pure modules (`features/offline/db`, `features/risk/*`, `features/alerts/notify`, `lib/i18n`) — never React components or stores that touch the UI.

### 27.3 `app.config.ts`

```ts
// mobile/app.config.ts
import type { ConfigContext, ExpoConfig } from 'expo/config';

const PROFILE = process.env.EAS_BUILD_PROFILE ?? 'local';
const IOS_PAID = process.env.FORDCAST_IOS_PAID === '1';            // Lane B only (§26.8)
const SENTRY = process.env.FORDCAST_SENTRY === '1';                // Stretch F125
const DEMO = process.env.EXPO_PUBLIC_DEMO_MODE === '1';
if (DEMO && (PROFILE === 'preview' || PROFILE === 'production')) {
  throw new Error('EXPO_PUBLIC_DEMO_MODE=1 is forbidden in preview/production builds (§33.11).');
}
const INTER = ['400Regular', '500Medium', '600SemiBold', '700Bold']
  .map((w) => `node_modules/@expo-google-fonts/inter/${w}/Inter_${w}.ttf`);   // VERIFY paths (§10.1)

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'FordCast',
  slug: 'fordcast',
  scheme: 'fordcast',                                  // fordcast://crossing/<id>
  version: '1.0.0',                                    // bump on ANY native change (runtimeVersion = appVersion)
  orientation: 'default',                              // per-screen locks in §28.2; fallback 'portrait' (§8.7)
  userInterfaceStyle: 'dark',                          // night-first
  icon: './assets/images/icon.png',
  backgroundColor: '#0E1726',
  runtimeVersion: { policy: 'appVersion' },
  updates: { url: 'https://u.expo.dev/<EAS_PROJECT_ID>' },   // written by `eas update:configure`
  ios: {
    bundleIdentifier: 'org.fordcast.app',              // or the Step-0 reverse-domain id
    supportsTablet: false,
    // icon: the template's Liquid Glass `.icon` key — keep what the SDK 57 template generated (§15.5)
    infoPlist: {
      CFBundleAllowMixedLocalizations: true,           // localized permission prompts via `locales`
      LSApplicationQueriesSchemes: ['comgooglemaps', 'waze'],   // only for canOpenURL checks (§32.6)
      ITSAppUsesNonExemptEncryption: false,
    },
    entitlements: IOS_PAID
      ? { 'com.apple.developer.usernotifications.time-sensitive': true }   // Lane B only (F68)
      : {},
  },
  android: {
    package: 'org.fordcast.app',
    adaptiveIcon: {
      backgroundColor: '#0E1726',
      foregroundImage: './assets/images/android-icon-foreground.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',   // FCM V1 (§26.3)
    predictiveBackGestureEnabled: false,
    permissions: [                                     // plugins add most of these; listed for review
      'ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'ACCESS_BACKGROUND_LOCATION',
      'FOREGROUND_SERVICE', 'FOREGROUND_SERVICE_LOCATION', 'POST_NOTIFICATIONS', 'VIBRATE',
      'ACTIVITY_RECOGNITION',                          // motion activity (F62) — VERIFY the plugin adds/needs it
    ],
  },
  locales: { es: './locales/app.es.json' },            // Spanish system permission dialogs (27.4)
  plugins: [
    'expo-router',
    ['expo-splash-screen', { backgroundColor: '#0E1726', image: './assets/images/splash-icon.png', imageWidth: 120 }],
    ['expo-font', { fonts: INTER }],
    '@maplibre/maplibre-react-native',
    ['expo-location', {
      locationWhenInUsePermission:
        'FordCast uses your location to show crossings near you and on your route. Your location stays on your phone.',
      locationAlwaysAndWhenInUsePermission:
        'Allow "Always" so FordCast can warn you near a crossing where flooding is likely, even when the app is closed. Alerts can arrive minutes late. Your location stays on your phone.',
      motionUsagePermission:
        'FordCast uses motion to notice when you are driving, so it can suggest hands-free Drive Mode.',
      isIosBackgroundLocationEnabled: true,            // UIBackgroundModes: location
      isAndroidBackgroundLocationEnabled: true,        // ACCESS_BACKGROUND_LOCATION
      isAndroidForegroundServiceEnabled: true,         // FOREGROUND_SERVICE(_LOCATION)
    }],
    ['expo-notifications', {
      icon: './assets/images/notification-icon.png',   // 96×96 white on transparent (§15.6)
      color: '#6CB4FF',
      defaultChannel: 'crossing-urgent',
      enableBackgroundRemoteNotifications: true,       // UIBackgroundModes: remote-notification
    }],
    'expo-sqlite',
    ['expo-localization', { supportedLocales: { ios: ['en', 'es'], android: ['en', 'es'] } }],
    ...(IOS_PAID ? [['expo-widgets', { enablePushNotifications: false }] as [string, object]] : []),
    ...(SENTRY ? ['@sentry/react-native/expo'] : []),
  ],
  experiments: { typedRoutes: true, reactCompiler: false },   // React Compiler OFF (§37)
  extra: { eas: { projectId: '<EAS_PROJECT_ID>' }, iosPaid: IOS_PAID, profile: PROFILE },
});
```
- Plugin option names for `expo-location`, `expo-notifications`, `expo-localization`, `expo-splash-screen` and the MapLibre plugin are verified (maps.md §3.2, stack.md §8). `expo-widgets` options and the `expo-font` schema are VERIFY BEFORE USE (read each `plugin/build/*.d.ts`). If `npx expo install` reports that `expo-background-task`, `expo-secure-store` or `expo-audio` ship a config plugin, add it with no options.
- Do **not** add `sounds` to `expo-notifications` (custom notification sound = Roadmap F121) and do **not** add a Google Maps key (MapLibre needs none).

**Generated native values to inspect after `npx expo prebuild --no-install` (§25.6):**

| Platform | Key | Expected |
|---|---|---|
| iOS Info.plist | `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`, `NSMotionUsageDescription` | the EN strings above (ES via 27.4) |
| iOS Info.plist | `UIBackgroundModes` | `location`, `remote-notification` |
| iOS Info.plist | `CFBundleURLTypes` | contains `fordcast` |
| AndroidManifest | `<uses-permission>` | the list above (+ plugin additions) |
| AndroidManifest | intent filter | `<data android:scheme="fordcast"/>` |

### 27.4 `locales/app.es.json` (Spanish permission prompts)

```json
{
  "ios": {
    "CFBundleDisplayName": "FordCast",
    "NSLocationWhenInUseUsageDescription": "FordCast usa su ubicación para mostrar los cruces cerca de usted y en su ruta. Su ubicación se queda en su teléfono.",
    "NSLocationAlwaysAndWhenInUseUsageDescription": "Permita \"Siempre\" para que FordCast le avise cerca de un cruce donde es probable una inundación, incluso con la app cerrada. Las alertas pueden llegar con minutos de retraso. Su ubicación se queda en su teléfono.",
    "NSMotionUsageDescription": "FordCast usa el movimiento para notar cuándo usted maneja y sugerirle el Modo manejo sin manos."
  }
}
```
VERIFY BEFORE USE: the nested `ios` shape (cac.md §4.2, SDK 55+ docs) vs. a flat object, by reading the generated `ios/*/es.lproj/InfoPlist.strings` after prebuild. All three strings go to `es-pending-review.json` for native review (§35). Android system dialogs are OS-localized; FordCast's own primers (§13.3) carry the explanation.

### 27.5 `babel.config.js` (RNR minimal, verbatim)

```js
module.exports = function (api) {
  api.cache(true);
  return { presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'] };
};
```
Do not add the Reanimated/Worklets plugin manually — `babel-preset-expo` configures it [verified].

### 27.6 `metro.config.js`

```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('gz');                  // bundled replays/*.json.gz (§33.1)
module.exports = withNativeWind(config, { input: './src/global.css', inlineRem: 16 });   // inlineRem required by RNR doctor
```
Stretch (Sentry): replace the second line with `const { getSentryExpoConfig } = require('@sentry/react-native/metro'); const config = getSentryExpoConfig(__dirname);` and keep the `assetExts` push and the `withNativeWind` wrapper outermost.

### 27.7 `tailwind.config.js`

```js
const { hairlineWidth } = require('nativewind/theme');
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],                    // MUST cover every folder that uses className
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: { /* paste the §9.12 "Tailwind color mapping" block verbatim */ },
      borderRadius: { xs: '6px', sm: '10px', md: '14px', lg: '20px', xl: '24px', sheet: '28px', pill: '9999px' },
      borderWidth: { hairline: hairlineWidth() },
      fontFamily: {                                    // one family per weight (§10.1); never fontWeight on Inter
        sans: ['Inter_400Regular'], medium: ['Inter_500Medium'],
        semibold: ['Inter_600SemiBold'], bold: ['Inter_700Bold'],
      },
    },
  },
  future: { hoverOnlyWhenSupported: true },
  plugins: [require('tailwindcss-animate')],
};
```
After any change here or in `global.css`: `npx expo start -c` (clear the cache) — styles silently vanish otherwise.

### 27.8 `src/global.css`

Exactly §9.12 (dark values in both `:root` and `.dark:root`; the light block stays commented until F42-light ships). The root layout calls `colorScheme.set('dark')` once. Parity with `src/lib/theme.ts` is enforced by `tokens-parity-test.ts` (§9.13).

### 27.9 `tsconfig.json`

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "resolveJsonModule": true,
    "paths": { "@/assets/*": ["./assets/*"], "@/*": ["./src/*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts", "nativewind-env.d.ts"]
}
```
VERIFY BEFORE USE on Day 0 that Metro resolves `@/assets/...` (longest-prefix match); fallback: relative `require('../../assets/…')` for assets only.

### 27.10 `components.json` (RNR registry config)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york", "rsc": false, "tsx": true,
  "tailwind": { "config": "tailwind.config.js", "css": "src/global.css", "baseColor": "neutral", "cssVariables": true },
  "aliases": { "components": "@/components", "utils": "@/lib/utils", "ui": "@/components/ui", "lib": "@/lib", "hooks": "@/hooks" }
}
```
If `rnr add` writes outside `src/`, re-run with `--path src/components/ui`.

### 27.11 `eslint.config.js`, `.prettierrc`

```js
// mobile/eslint.config.js
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettier,
  { ignores: ['dist/*', 'example/*', 'android/*', 'ios/*', '.expo/*'] },
  {
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          { name: 'react-native', importNames: ['Text'], message: 'Use AppText (§10.3).' },
          { name: 'expo-av', message: 'Use expo-audio.' },
        ],
        patterns: [
          { group: ['@react-navigation/*'], message: 'Import from expo-router/react-navigation (SDK 56+).' },
          { group: ['@maplibre/maplibre-react-native'], message: 'Only MapSurface.maplibre.tsx and offline-pack.ts may import MapLibre (§29.13).' },
          { group: ['expo-widgets', '@react-native-ama/*'], message: 'Native-only: import lazily behind caps (§26.7).' },
        ],
      }],
      'no-restricted-syntax': ['error',
        { selector: "JSXAttribute[name.name='variant'][value.value='destructive']", message: 'Red is reserved for risk states (§12.4).' },
        { selector: "MemberExpression[object.name='NotificationFeedbackType'][property.name='Success']", message: 'No Success haptic (§3.1).' },
        { selector: "Literal[value=/^@react-navigation\\//]", message: 'No @react-navigation imports.' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  { files: ['src/features/map/MapSurface.maplibre.tsx', 'src/features/map/offline-pack.ts', 'src/components/fordcast/AppText.tsx',
             'src/components/ui/**'],                  // RNR copy-ins may use RN Text internally
    rules: { 'no-restricted-imports': 'off' } },
]);
```
`.prettierrc`: `{ "singleQuote": true, "printWidth": 100, "plugins": ["prettier-plugin-tailwindcss"] }`.

### 27.12 Jest setup (`jest.setup.ts`)

```ts
import 'react-native-gesture-handler/jestSetup';
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));   // VERIFY path in 4.5.1
jest.mock('@maplibre/maplibre-react-native', () => ({}));            // map is never unit-rendered; MapSurface is mocked
jest.mock('@/features/map/MapSurface', () => () => null);
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn(), getAvailableVoicesAsync: jest.fn(async () => []) }));
jest.mock('expo-haptics', () => ({ notificationAsync: jest.fn(), impactAsync: jest.fn(), selectionAsync: jest.fn(),
  NotificationFeedbackType: { Warning: 'warning', Error: 'error' }, ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy', Soft: 'soft', Medium: 'medium' } }));
jest.mock('expo-sqlite/kv-store', () => require('./src/__tests__/mocks/kv-store'));   // in-memory Map
```
Fake time: `jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-20T03:00:00Z'))` in staleness/replay tests.

### 27.13 Environment variables (`.env.example`, `src/lib/env.ts`)

```bash
# mobile/.env.example — ONLY publishable values; never a server key (§1.9)
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_xxxxxxxx
EXPO_PUBLIC_API_BASE=https://fordcast-api.onrender.com
EXPO_PUBLIC_DEMO_MODE=0
# EXPO_PUBLIC_SENTRY_DSN=   (Stretch; a DSN is public by design)
```

```ts
// mobile/src/lib/env.ts — read once, validated; process.env.EXPO_PUBLIC_* must be referenced literally (Metro inlines them)
import { z } from 'zod';
const Env = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_KEY: z.string().startsWith('sb_publishable_'),          // a secret key here is a build-breaking bug
  API_BASE: z.string().url(),
  DEMO_MODE: z.enum(['0', '1']).default('0'),
});
export const env = Env.parse({
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  SUPABASE_KEY: process.env.EXPO_PUBLIC_SUPABASE_KEY,
  API_BASE: process.env.EXPO_PUBLIC_API_BASE,
  DEMO_MODE: process.env.EXPO_PUBLIC_DEMO_MODE,
});
// Public Storage bucket `fordcast-public` (§20.4). VERIFY BEFORE USE: compare with Supabase Dashboard → Storage →
// fordcast-public/snapshots/current.json → "Get URL".
export const STORAGE_PUBLIC = `${env.SUPABASE_URL}/storage/v1/object/public/fordcast-public`;
export const SNAPSHOT_URL = `${STORAGE_PUBLIC}/snapshots/current.json`;
export const REPLAY_INDEX_URL = `${STORAGE_PUBLIC}/replays/index.json`;
export const DEMO_MODE = env.DEMO_MODE === '1';
```
A CI grep fails the build if `mobile/` contains `sb_secret_`, `X-Api-Key`, `ORS_`, `STADIA_` or `EXPO_ACCESS_TOKEN`.

**Done when (§27):** every file above exists; `npx expo prebuild --no-install` output matches the 27.3 table; `npm run typecheck`, `npm run lint` (including the restricted-import rules — prove them with one deliberately bad line in a scratch commit you then revert) and `npm test` pass; `env.ts` rejects a non-publishable key.

---
## §28. App architecture

### 28.1 `mobile/src` tree (file-level responsibilities; the monorepo tree is §5)

```text
src/
├─ app/                              # Expo Router routes (28.2)
├─ components/ui/                    # RNR copy-ins, restyled (§12.4)
├─ components/fordcast/              # custom components (§12.5) — presentational, no fetching
├─ features/
│  ├─ risk/        state.ts (enums, RANK, wire mapping) · staleness.ts (display rule, 28.6) · windows.ts (visual/spoken ranges)
│  │               reasons.ts (reason-code → i18n key) · copy.ts (state → bank keys) · escalation.ts (diff → banner/inbox/notify)
│  ├─ crossings/   schema.ts (zod, 28.5) · api.ts (fetch ladder) · queries.ts (TanStack hooks) · realtime.ts · selectors.ts
│  │               skew.ts (server clock offset) · static.ts (seed + /v1/crossings merge)
│  ├─ map/         MapSurface.tsx · MapSurface.maplibre.tsx · MapSurface.expogo.tsx · MapSurface.unavailable.tsx · types.ts
│  │               layers.ts (expressions) · features.ts (GeoJSON builders) · waterPulse.ts · dashFlow.ts · offline-pack.ts
│  │               sheet/ (CrossingListSheet, SheetBackground, SheetHandle) · MapChrome.tsx
│  ├─ replay/      loader.ts · schema.ts · clock.ts · player-store.ts · frames.ts · storage-sync.ts · results.ts
│  ├─ drive/       drive-store.ts · location-source.ts · proximity.ts · lockout.ts · speech-queue.ts · voices.ts · audio.ts
│  ├─ routing/     route-api.ts · on-route.ts · handoff.ts · search-api.ts · saved.ts (places/routes → crossing IDs)
│  ├─ alerts/      channels.ts · notify.ts · push-registration.ts · subscriptions.ts · geofence-rotation.ts · inbox-store.ts · listeners.ts
│  ├─ offline/     db.ts (open + migrations) · cache.ts (snapshot/risk/last_known I/O) · sync.ts (outbox for device calls)
│  ├─ a11y/        A11yPrefsProvider.tsx · announce.ts · useListFirst.ts
│  └─ about/       claims.generated.json
├─ lib/            env.ts · capabilities.ts · flags.ts · supabase.ts · api.ts (fetchWithTimeout, Problem errors) · query-client.ts
│                  storage.ts (kv-store adapters) · i18n.ts · format.ts · theme.ts · useTheme.ts · motion.ts · haptics.ts · geo.ts · utils.ts
├─ locales/        en.json · es.json · banned-words.json · es-pending-review.json
├─ stores/         settings.ts · onboarding.ts · saved.ts · device.ts
├─ tasks/          geofence.ts · drive-location.ts · background-refresh.ts
└─ __tests__/      (§36.1)
```
Dependency rule: `components/*` never import `features/*/api|realtime|queries`; screens (`app/*`) compose hooks from `features/*` and pass plain props down. `tasks/*` never import React.

### 28.2 Route table (Expo Router 57; names match §8.8)

| URL / file | Presentation & options | Deep link | Tier |
|---|---|---|---|
| `app/_layout.tsx` | root `Stack`, `headerShown:false`, `contentStyle.backgroundColor #0E1726`, `orientation: 'portrait_up'` (VERIFY option in `react-native-screens` types; fallback §8.7) | — | MVP |
| `(onboarding)/_layout.tsx` · `index` · `how` · `legend` · `pledge` | Stack, horizontal slide; inside `Stack.Protected guard={!onboarded}` | — | MVP |
| `(tabs)/_layout.tsx` | `NativeTabs` from `expo-router/unstable-native-tabs`: triggers `index` (Map) · `drive` · `replay` · `alerts` (4 tabs; Settings via gear) | — | MVP |
| `(tabs)/index.tsx` | Map Home: `MapSurface` + gorhom `CrossingListSheet` + `MapChrome` | `fordcast://` | MVP |
| `(tabs)/drive/_layout.tsx` · `index` · `result` | Stack | `fordcast://drive` (opens the tab; never auto-starts Drive Mode) | MVP shell / Stretch result |
| `(tabs)/replay/_layout.tsx` · `index` · `[stormId]` · `results` | Stack; `results` `presentation:'formSheet'`, `sheetAllowedDetents:[0.62,1.0]` | `fordcast://replay/<stormId>` | MVP |
| `(tabs)/alerts/_layout.tsx` · `index` · `saved` | Stack | `fordcast://alerts` | MVP |
| `crossing/[id].tsx` | `presentation:'formSheet'`, `sheetAllowedDetents:[0.32,0.62,1.0]`, `sheetInitialDetentIndex:0`, `sheetLargestUndimmedDetentIndex:1`, `sheetGrabberVisible:true`, `sheetCornerRadius:24` | `fordcast://crossing/<id>` | MVP |
| `gauge/[id].tsx` | formSheet `sheetAllowedDetents:'fitToContents'` | — | Stretch |
| `search.tsx` | formSheet `[0.9]` | — | MVP |
| `legend.tsx` · `layers.tsx` · `handoff.tsx` | formSheet `fitToContents` | — | MVP · Stretch · Stretch |
| `drive-mode.tsx` | `presentation:'fullScreenModal'`, `gestureEnabled:false`, `orientation:'all'` | — (consent required) | MVP |
| `permission/[kind].tsx` | `presentation:'modal'`; kind ∈ `location`·`notifications`·`background` | — | MVP / Stretch (background) |
| `settings/_layout.tsx` + `index` · `language` · `notifications` · `accessibility` · `drive` · `data-sources` · `how-it-works` · `accuracy` · `privacy` · `about` · `legal` · `debug` | Stack pushed on root from any gear; `debug` renders `<Redirect href="/" />` unless `__DEV__` | `fordcast://settings` | MVP |
| `crew.tsx` | Stack screen | — | MVP list |
| `dev/gallery.tsx` | `__DEV__` only (Redirect otherwise) | — | MVP |
| `+not-found.tsx` | "This crossing isn't in FordCast's list anymore." + Map button | — | MVP |

```tsx
// mobile/src/app/(tabs)/_layout.tsx — SDK 57 path; 4 tabs; labels from i18n; badge = unread AVOID/CLOSED
import { NativeTabs } from 'expo-router/unstable-native-tabs';
export default function TabsLayout() {
  const { t } = useTranslation(); const unread = useUnreadUrgentCount();
  return (
    <NativeTabs backgroundColor="#0E1726" indicatorColor="#1C2940" rippleColor="#1C2940"
      iconColor={{ default: '#8A97AB', selected: '#F2F5FA' }} labelStyle={{ default: { color: '#8A97AB' }, selected: { color: '#F2F5FA' } }}>
      <NativeTabs.Trigger name="index"><NativeTabs.Trigger.Icon sf="map.fill" md="map" /><NativeTabs.Trigger.Label>{t('tabs.map')}</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="drive"><NativeTabs.Trigger.Icon sf="car.fill" md="directions_car" /><NativeTabs.Trigger.Label>{t('tabs.drive')}</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="replay"><NativeTabs.Trigger.Icon sf="clock.arrow.circlepath" md="history" /><NativeTabs.Trigger.Label>{t('tabs.replay')}</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="alerts"><NativeTabs.Trigger.Icon sf="bell.fill" md="notifications" /><NativeTabs.Trigger.Label>{t('tabs.alerts')}</NativeTabs.Trigger.Label>
        {unread > 0 && <NativeTabs.Trigger.Badge>{String(unread)}</NativeTabs.Trigger.Badge>}</NativeTabs.Trigger>
    </NativeTabs>
  );
}
```
Prop shapes verified against `expo-router@57.0.26` `native-tabs/types.d.ts`; the iOS 26 tab bar ignores `backgroundColor` (Liquid Glass). VERIFY the `Badge` child form in the same d.ts. Every tab root renders `ScreenHeader` with the gear in the same top-right position (WCAG 3.2.6) → `router.push('/settings')`.

Android `formSheet`: max 3 detents and no native header — render titles inside the content [verified]. Use `router.push('/crossing/' + id)` (typed routes on). Any RNR `Dialog` inside a formSheet/fullScreenModal renders into a local `<PortalHost name="sheet" />` placed in that screen.

### 28.3 Root layout: provider order

```tsx
// mobile/src/app/_layout.tsx
import '@/lib/i18n';                                   // FIRST: imports 'intl-pluralrules', inits i18next synchronously
import '@/global.css';
import { useEffect, useState } from 'react';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider } from 'expo-router/react-navigation';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SQLiteProvider } from 'expo-sqlite';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { I18nextProvider } from 'react-i18next';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';
import { PortalHost } from '@rn-primitives/portal';
import { Toaster } from 'sonner-native';
import { colorScheme } from 'nativewind';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import i18n from '@/lib/i18n';
import { queryClient, persistOptions } from '@/lib/query-client';
import { NAV_THEME, dark } from '@/lib/theme';
import { migrateDb } from '@/features/offline/db';
import { A11yPrefsProvider, useA11yPrefs } from '@/features/a11y/A11yPrefsProvider';
import { useSettings } from '@/stores/settings';
import { useOnboarding, PLEDGE_VERSION } from '@/stores/onboarding';
import { AppServices } from '@/features/alerts/listeners';      // realtime lifecycle, notification listeners, device sync, re-rank
import { RootErrorScreen } from '@/components/fordcast/RootErrorScreen';

SplashScreen.preventAutoHideAsync();
colorScheme.set('dark');

export function ErrorBoundary(props: ErrorBoundaryProps) { return <RootErrorScreen {...props} />; }   // never blank, never calm (§13.20)

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => { const t = setTimeout(() => setTimedOut(true), 2000); return () => clearTimeout(t); }, []);
  const ready = fontsLoaded || timedOut;                 // never block on fonts (§10.1)
  useEffect(() => { if (ready) SplashScreen.hideAsync(); }, [ready]);
  if (!ready) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: dark.bg }}>
      <A11yPrefsProvider>
        <SQLiteProvider databaseName="fordcast.db" onInit={migrateDb}>
          <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
            <I18nextProvider i18n={i18n}>
              <ThemeProvider value={NAV_THEME.dark}>
                <MotionConfig />
                <AppServices />
                <RootStack />
                <PortalHost />
                <Toaster theme="dark" position="top-center" />
              </ThemeProvider>
            </I18nextProvider>
          </PersistQueryClientProvider>
        </SQLiteProvider>
      </A11yPrefsProvider>
    </GestureHandlerRootView>
  );
}

function MotionConfig() {
  const { reduceMotion } = useA11yPrefs();
  const animations = useSettings((s) => s.animations);   // 'system' | 'full' | 'reduced'
  const reduced = animations === 'reduced' || (animations === 'system' && reduceMotion);
  return <ReducedMotionConfig mode={reduced ? ReduceMotion.Always : ReduceMotion.Never} />;
}

function RootStack() {
  const onboarded = useOnboarding((s) => s.done && s.pledgeVersion === PLEDGE_VERSION);
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: dark.bg },
                            orientation: 'portrait_up' /* VERIFY option; fallback: app-wide 'portrait' (§8.7) */ }}>
      <Stack.Protected guard={!onboarded}><Stack.Screen name="(onboarding)" /></Stack.Protected>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="crossing/[id]" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.32, 0.62, 1.0],
          sheetInitialDetentIndex: 0, sheetLargestUndimmedDetentIndex: 1, sheetGrabberVisible: true, sheetCornerRadius: 24 }} />
        <Stack.Screen name="search" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.9] }} />
        <Stack.Screen name="legend" options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents' }} />
        <Stack.Screen name="drive-mode" options={{ presentation: 'fullScreenModal', gestureEnabled: false, orientation: 'all' }} />
        <Stack.Screen name="permission/[kind]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" />
        <Stack.Screen name="crew" />
        {/* gauge/[id], layers, handoff (Stretch) and dev/gallery registered the same way */}
      </Stack.Protected>
    </Stack>
  );
}
```
- Expo Router already provides `SafeAreaProvider` — don't add a second. No `BottomSheetModalProvider` (we use only the non-modal `BottomSheet`).
- `useOnboarding` persists with the **synchronous** kv-store adapter (28.7) so the `Stack.Protected` guard is correct on the first frame.
- `AppServices` is a render-null component that owns: Realtime lifecycle (28.4), TanStack `focusManager`/`onlineManager` wiring, notification listeners + cold-start response (§31.5), device registration/subscription outbox flush (§31.4), geofence re-rank on foreground (§30.3), and the escalation detector (§31.6).

### 28.4 Data layer

**Read-path ladder (F85):** Storage snapshot → API → SQLite → bundled seed (all UNKNOWN). Realtime is a *hint*; the snapshot is the *truth*.

```ts
// mobile/src/features/crossings/api.ts
export type SnapshotSource = 'storage' | 'api' | 'cache';
export async function fetchSnapshot(signal?: AbortSignal): Promise<{ snap: SnapshotV1; source: SnapshotSource }> {
  const rungs = [
    { source: 'storage' as const, url: SNAPSHOT_URL, timeoutMs: 6_000 },
    { source: 'api' as const, url: `${env.API_BASE}/v1/risk/current`, timeoutMs: 10_000 },  // Render; "waking server…" after 3 s
  ];
  let lastErr: unknown;
  for (const r of rungs) {
    try {
      const res = await fetchWithTimeout(r.url, { headers: { Accept: 'application/json' } }, r.timeoutMs, signal);
      if (!res.ok) throw new HttpError(res.status, r.url);
      skew.record(res.headers.get('date'));                       // server clock offset (median of last 5)
      const snap = SnapshotV1.parse(await res.json());            // zod: any mismatch = failed rung, never partial data
      const kept = await cache.writeSnapshotIfNewer(snap);        // SQLite; monotonic by seq (CDN may serve an older copy)
      return { snap: kept, source: r.source };
    } catch (e) { lastErr = e; }
  }
  const cached = await cache.readSnapshot();                      // age rules then turn it UNKNOWN after 20 min
  if (cached) return { snap: cached, source: 'cache' };
  throw lastErr;                                                  // UI: bundled seed crossings as UNKNOWN + OfflineBanner
}
```

**TanStack Query (v5) keys and policies**

| Query key | Source | staleTime | refetch | gcTime | Persisted |
|---|---|---|---|---|---|
| `['snapshot']` | `fetchSnapshot` | 30 s | every 60 s while foreground; on focus; on reconnect | 24 h | yes |
| `['crossings','static']` | bundled `assets/seed/crossings.geojson` merged with `GET /v1/crossings?format=geojson` | 24 h | when `snapshot.inventory_version` ≠ the cached one (and daily) | 7 d | yes |
| `['crossing', id]` | `GET /v1/crossings/{id}` (links, τ, triggers, reasons) | 60 s | on sheet open | 1 h | yes |
| `['gauge-series', gaugeId, hours, crossingId]` | `GET /v1/gauges/{id}/series?param=00065&hours=6&crossing_id=<id>` (trigger/watch lines only with `crossing_id`) | 60 s | 120 s while the sheet is open | 30 min | no |
| `['crossing-history', id]` | `GET /v1/crossings/{id}/history?hours=24` | 60 s | on tab open | 30 min | no (Stretch F47) |
| `['freshness']` | `GET /v1/meta/freshness` | 60 s | Data sources screen only | 10 min | no |
| `['replays','index']` | bundled `assets/replays/index.json` + Storage `replays/index.json` (`fordcast.replay-index.v1`) | 1 h | Replay tab focus | 7 d | yes |
| `['results']` | bundled `assets/results/results.json` (+ `GET /v1/results` [Stretch]) | 24 h | — | 7 d | yes |
| `['route', key]` | `POST /v1/route` | 5 min | manual + re-validation (§32.5) | 30 min | **no** (privacy) |
| `['search', q]` | `GET /v1/search` | 1 h | — | 10 min | **no** (privacy) |

```ts
// mobile/src/lib/query-client.ts
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import Storage from 'expo-sqlite/kv-store';                       // AsyncStorage-compatible (verified); VERIFY default export
import Constants from 'expo-constants';
export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 2, retryDelay: (n) => Math.min(1000 * 2 ** n, 8000), gcTime: 24 * 3600_000 } } });
const PERSIST = new Set(['snapshot', 'crossings', 'crossing', 'replays', 'results']);
export const persistOptions = {
  persister: createAsyncStoragePersister({ storage: Storage, key: 'fordcast-rq-v1', throttleTime: 1000 }),
  maxAge: 24 * 3600_000,                                         // must be ≤ gcTime
  buster: `${Constants.expoConfig?.version}-snapshot.v1`,
  dehydrateOptions: { shouldDehydrateQuery: (q: any) => PERSIST.has(String(q.queryKey[0])) && q.state.status === 'success' },
};
// In AppServices: focusManager.setEventListener(AppState 'change' → handleFocus(state === 'active'));
// onlineManager.setEventListener(expo-network listener → setOnline(isConnected)). VERIFY BEFORE USE:
// `addNetworkStateListener` in expo-network 57; fallback: a component using useNetworkState() calls onlineManager.setOnline().
```

**Background tasks don't use React Query.** Every successful snapshot is written to SQLite (`risk`, `last_known`, `meta.snapshot_as_of`, `meta.server_offset_ms`, `meta.seq`) so geofence/drive/background tasks read the same truth.

**Supabase Realtime lifecycle (F24)**

```ts
// mobile/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },   // no accounts
});

// mobile/src/features/crossings/realtime.ts — mounted by AppServices only while AppState === 'active' and onboarded
export function startRiskRealtime(qc: QueryClient) {
  let attempt = 0; let timer: ReturnType<typeof setTimeout> | undefined; let ch: ReturnType<typeof supabase.channel> | null = null;
  const subscribe = () => {
    ch = supabase.channel('risk')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'risk_current' }, (payload) => {
        const row = RiskCurrentRow.safeParse(payload.new);
        if (!row.success) return;                                 // ignore malformed; the next snapshot corrects it
        qc.setQueryData<SnapshotQuery>(['snapshot'], (old) => (old ? mergeRow(old, row.data) : old));   // only if row.seq is newer
        void cache.upsertRiskRow(row.data);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') { attempt = 0; void qc.invalidateQueries({ queryKey: ['snapshot'] }); }   // fill the gap
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          void qc.invalidateQueries({ queryKey: ['snapshot'] });
          if (ch) void supabase.removeChannel(ch); ch = null;
          timer = setTimeout(subscribe, Math.min(60_000, 2_000 * 2 ** attempt++));
        }
      });
  };
  subscribe();
  return () => { if (timer) clearTimeout(timer); if (ch) void supabase.removeChannel(ch); };
}
```
- Sockets die in the background: stop on `AppState` background/inactive, restart on active (and refetch the snapshot immediately).
- Realtime rows carry no freshness; the 60 s snapshot poll keeps `as_of` current. If Realtime is cut (§6.3 item 10), only the poll remains.

### 28.5 zod schemas (mirror §22.3–§22.7 and §23.6; contract-tested against `docs/schemas/*.example.json`)

```ts
// mobile/src/features/crossings/schema.ts
import { z } from 'zod';
// zod 4.6.7: z.string().datetime({ offset: true }) still works but is deprecated in favor of z.iso.datetime({ offset: true })
// — VERIFY in node_modules/zod and use the non-deprecated form if present.
const Iso = z.string().datetime({ offset: true });
export const WireState = z.enum(['no_rise', 'watch', 'avoid', 'closed', 'unknown']);     // = public.risk_state (§21)
export const OfficialState = z.enum(['open', 'caution', 'closed', 'unknown']);         // 'open' is NEVER shown as "open" (§3.3)
export const Window = z.union([z.tuple([z.literal(0), z.literal(15)]), z.tuple([z.literal(15), z.literal(30)]),
  z.tuple([z.literal(30), z.literal(60)]), z.tuple([z.literal(60), z.literal(90)]), z.tuple([z.literal(0), z.literal(30)]),
  z.tuple([z.literal(15), z.literal(60)]), z.tuple([z.literal(30), z.literal(90)])]);   // the 7 allowed windows (§18.6)
export const Reason = z.object({
  code: z.string(),                    // UPSTREAM_ABOVE_TRIGGER | UPSTREAM_RISING | WATER_AT_ROAD | OFFICIAL_CLOSED | OFFICIAL_CAUTION |
                                       // DATA_STALE | NO_UPSTREAM_GAUGE | … (§18.10); unknown codes render a generic "Why" line
  gauge_id: z.string().optional(), value_ft: z.number().optional(), rise_ft_30m: z.number().optional(),
  tau_min: z.number().optional(), trigger_ft: z.number().optional(), obs_at: Iso.optional(), source: z.string().optional(),
}).passthrough();
export const Official = z.object({ status: OfficialState, source: z.string(), as_of: Iso }).nullable();
export const CrossingRisk = z.object({
  id: z.string().regex(/^[a-z0-9-]{3,40}$/), state: WireState, tier: z.enum(['A', 'B', 'C']),
  window: Window.nullable(), held: z.boolean(), p: z.tuple([z.number(), z.number(), z.number()]).nullable(),
  official: Official, closed_source: z.enum(['official', 'sensor']).nullable(),
  latest_obs_at: Iso.nullable(), changed_at: Iso,
  last_known: z.object({ state: WireState, at: Iso }).nullable(),     // set when state == unknown (§3.4)
  reasons: z.array(Reason),
});
export const SnapshotV1 = z.object({
  schema: z.literal('fordcast.snapshot.v1'), as_of: Iso, generated_at: Iso, seq: z.number().int(),
  data_status: z.enum(['live', 'degraded', 'offline']),               // a live snapshot never says 'replay'
  stale_after_s: z.number().int().positive(),
  model: z.object({ kind: z.enum(['rule', 'ml']), version: z.string(), git_sha: z.string(), ml_enabled: z.boolean() }),
  inventory_version: z.string(),                                     // ≠ seed's → refetch /v1/crossings?format=geojson
  disclaimer_key: z.literal('SUPPLEMENTARY_TOOL'),
  config: z.object({
    banner: z.object({ en: z.string(), es: z.string(), level: z.enum(['info', 'warning']), until: Iso.nullable() }).nullable(),
    min_app_version: z.string(), demo_mode_default: z.boolean(), featured_storm: z.string().nullable().optional(),
  }).passthrough(),
  counts: z.object({ crossings: z.number(), monitored: z.number(), gauges_active: z.number(), gauges_stale: z.number() }),
  nws_status: z.string(), nws: z.array(z.object({ id: z.string(), event: z.string(), sent: Iso, expires: Iso }).passthrough()),
  gauges: z.array(z.object({ id: z.string(), obs_at: Iso.nullable(), value_ft: z.number().nullable(),
                             rise_ft_30m: z.number().nullable(), stale: z.boolean() })),
  crossings: z.array(CrossingRisk),                                   // sorted by id; static fields come from the seed
});
export const RiskCurrentRow = z.object({                              // Realtime payload.new = public.risk_current columns (§21.1)
  crossing_id: z.string(), state: WireState, window_lo_min: z.number().nullable(), window_hi_min: z.number().nullable(),
  p30: z.number().nullable(), p60: z.number().nullable(), p90: z.number().nullable(), reasons: z.array(Reason),
  reason_codes: z.array(z.string()), held: z.boolean(), closed_source: z.enum(['official', 'sensor']).nullable(),
  official: OfficialState, official_source: z.string().nullable(), official_as_of: z.string().nullable(),
  last_known_state: WireState.nullable(), last_known_at: z.string().nullable(), latest_obs_at: z.string().nullable(),
  changed_at: z.string(), evaluated_at: z.string(), model_version: z.string(), seq: z.number(),
});                                                                   // mergeRow() maps it to CrossingRisk (official null when 'unknown' w/o source)
export const GaugeSeries = z.object({ gauge_id: z.string(), param: z.literal('00065'), unit: z.literal('ft'),
  points: z.array(z.tuple([Iso, z.number()])), approval: z.enum(['P', 'A']), stale: z.boolean(), stale_after_min: z.number(),
  nws_categories: z.record(z.string(), z.number()).nullable(), trigger_ft: z.number().optional(), watch_ft: z.number().optional(), as_of: Iso });
export const PushData = z.object({                                    // §23.6 data block (local notifications use the same shape)
  type: z.enum(['risk', 'update', 'summary', 'unknown', 'test', 'replay']), crossing_id: z.string().optional(),
  crossing_ids: z.array(z.string()).optional(), state: WireState.optional(), window: Window.nullable().optional(),
  seq: z.number().optional(), as_of: z.string().optional(), url: z.string().startsWith('fordcast://').optional(),
  test: z.boolean().optional(),
});
export const DeviceRegistration = z.object({ device_id: z.string().uuid(), device_secret: z.string().regex(/^[0-9a-f]{64}$/) });
// CrossingDetail (§22.4 GET /v1/crossings/{id}), RouteResponse (§32.2), SearchResults (§32.6) and ReplayV1/ReplayIndex (§33.2) live alongside.
```
- `held` (§18) means the server is holding a level during its de-escalation dwell; the UI shows the state normally (never "clearing soon").
- `type: 'replay'` is client-only (local REPLAY demo notifications); the server never sends it.

### 28.6 Risk state utilities and the staleness rule (F11)

```ts
// mobile/src/features/risk/state.ts
export type RiskState = 'NO_RISE' | 'WATCH' | 'AVOID' | 'CLOSED' | 'UNKNOWN';
export const RANK: Record<RiskState, number> = { NO_RISE: 0, UNKNOWN: 1, WATCH: 2, AVOID: 3, CLOSED: 4 };
export const fromWire = (s: z.infer<typeof WireState>) => s.toUpperCase() as RiskState;
export const toWire = (s: RiskState) => s.toLowerCase() as z.infer<typeof WireState>;

// mobile/src/features/risk/staleness.ts — the client is authoritative for staleness (§3.4)
export const LIVE_MAX_MIN = 10, AGING_MAX_MIN = 20;
export type Freshness = 'live' | 'aging' | 'offline' | 'replay';
export interface DisplayRisk {
  id: string; state: RiskState; freshness: Freshness; ageMin: number; window: [number, number] | null;
  lastKnown?: { state: 'WATCH' | 'AVOID' | 'CLOSED'; at: number };
  source: 'official' | 'sensor' | 'model' | 'manual' | 'none'; officialSource?: string;   // e.g. "City of Austin" / "Manual entry"
  officialNote?: 'no_closure';                                   // official 'open' → "{source}: no closure reported" (never "open")
  held: boolean; tier: 'A' | 'B' | 'C'; reasons: Reason[];
}
export function displayRisk(r: CrossingRisk | undefined, id: string, snap: Pick<SnapshotV1, 'as_of' | 'data_status'> | null,
                            nowMs: number, offsetMs: number, localLastKnown?: DisplayRisk['lastKnown']): DisplayRisk {
  if (!r || !snap) return { id, state: 'UNKNOWN', freshness: 'offline', ageMin: Infinity, window: null,
                            lastKnown: localLastKnown, source: 'none', held: false, tier: 'C', reasons: [] };
  const ageMin = Math.max(0, (nowMs + offsetMs - Date.parse(snap.as_of)) / 60_000);
  const offline = ageMin > AGING_MAX_MIN || snap.data_status === 'offline';
  const freshness: Freshness = offline ? 'offline' : ageMin > LIVE_MAX_MIN ? 'aging' : 'live';
  const base = fromWire(r.state);
  const source = base === 'CLOSED' && r.closed_source === 'official' ? (r.official?.source === 'manual' ? 'manual' : 'official')
    : base === 'CLOSED' && r.closed_source === 'sensor' ? 'sensor' : base === 'UNKNOWN' ? 'none' : 'model';
  const officialSource = r.official?.source;                    // label text resolved via i18n (§3.6)
  const officialNote = r.official?.status === 'open' ? ('no_closure' as const) : undefined;
  if (offline || base === 'UNKNOWN') {
    const wasRisky = RANK[base] >= RANK.WATCH ? { state: base as 'WATCH' | 'AVOID' | 'CLOSED', at: Date.parse(r.changed_at) } : undefined;
    const serverLk = r.last_known && RANK[fromWire(r.last_known.state)] >= RANK.WATCH
      ? { state: fromWire(r.last_known.state) as 'WATCH' | 'AVOID' | 'CLOSED', at: Date.parse(r.last_known.at) } : undefined;
    return { id, state: 'UNKNOWN', freshness, ageMin, window: null, lastKnown: wasRisky ?? serverLk ?? localLastKnown,
             source: 'none', held: false, tier: r.tier, reasons: r.reasons };   // never a calm look
  }
  return { id, state: base, freshness, ageMin, window: base === 'WATCH' || base === 'AVOID' ? r.window : null,
           source, officialSource, officialNote, held: r.held, tier: r.tier, reasons: r.reasons };
}
```
- A crossing **missing** from the snapshot is UNKNOWN. A crossing with no local cache at first launch is UNKNOWN ("No data yet").
- `windows.ts` implements §3.5: `visualWindow(state, window)` → `"15–30 min"` / `headline_now` when `lo === 0`; `spokenWindow()` → `"15 to 30 minutes"` / `"de 15 a 30 minutos"`. No function in the app may output a single-number ETA (unit-tested).
- Selectors: `useDisplayRisks()` (memoized by `seq` + minute tick), `useWorstNearby(lngLat, km)`, `useRouteVerdict(ids)` (§3.3 rule: worst rank, UNKNOWN listed separately), `useAreaCounts()`.
- A 60 s `useNowMinute()` clock re-renders age labels; it is the **only** periodic re-render source on Map Home.

### 28.7 Client state (zustand 5, persisted with the kv-store)

```ts
// mobile/src/lib/storage.ts
import Storage from 'expo-sqlite/kv-store';
import { createJSONStorage } from 'zustand/middleware';
// Synchronous adapter so persisted stores are hydrated on the first render. VERIFY BEFORE USE: getItemSync/setItemSync/
// removeItemSync names in expo-sqlite/kv-store d.ts; fallback: async adapter + keep the splash until persist.hasHydrated().
export const syncJSONStorage = createJSONStorage(() => ({
  getItem: (k: string) => Storage.getItemSync(k), setItem: (k: string, v: string) => Storage.setItemSync(k, v),
  removeItem: (k: string) => Storage.removeItemSync(k),
}));
```

| Store (`src/stores/`) | Persisted | Fields |
|---|---|---|
| `onboarding.ts` | yes | `done`, `pledgeVersion`, `pledgeAcceptedAt`, `primers: {location, notifications, background}` (shown/answered) |
| `settings.ts` | yes | `language: 'system'\|'en'\|'es'`, `units: {stage:'ft'\|'m', distance:'mi'\|'km'}`, `appearance: 'dark'\|'system'\|'light'`, `haptics`, `sounds`, `spokenAlerts`, `voiceRate` (0.8–1.2, default 0.95), `animations: 'system'\|'full'\|'reduced'`, `increaseContrast`, `showZoomButtons`, `alertsEnabled`, `watchAlertsDefault: false`, `quietHours: {start,end}\|null`, `autoSuggestDrive`, `listFirst` |
| `saved.ts` | mirror of SQLite | `savedCrossingIds`, `places[]`, `routes[]` (hydrated from SQLite at start; writes go to SQLite first) |
| `device.ts` | yes (no secret) | `deviceId`, `pushToken`, `registeredAt`, `lastSubscriptionHash`, `pushStatus: 'ok'\|'denied'\|'unavailable'\|'expoGo'` — the device **secret** lives in SecureStore (§31.4) |
| `features/replay/player-store.ts` | no | `stormId`, `playing`, `speed`, `simT` mirror (10 Hz), `revealTruth` |
| `features/drive/drive-store.ts` | no | `active`, `mode: 'live'\|'replay'`, `lastFix` (memory only), `speedMs`, `lockout`, `passengerUntilTripEnd`, `muted`, `lastSpoken` |

### 28.8 Offline cache (`expo-sqlite`, F84)

```ts
// mobile/src/features/offline/db.ts — opened by SQLiteProvider (UI) and by openDatabaseAsync('fordcast.db') inside tasks
export async function migrateDb(db: SQLiteDatabase) {
  const { user_version } = (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version')) ?? { user_version: 0 };
  if (user_version < 1) await db.execAsync(MIGRATION_1);
}
const MIGRATION_1 = `
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS crossings(id TEXT PRIMARY KEY, name TEXT NOT NULL, name_spoken_en TEXT, name_spoken_es TEXT,
  road TEXT, creek TEXT, jurisdiction TEXT, tier TEXT NOT NULL CHECK (tier IN ('A','B','C')), lon REAL NOT NULL, lat REAL NOT NULL,
  divided_road INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS risk(crossing_id TEXT PRIMARY KEY,
  state TEXT NOT NULL CHECK (state IN ('no_rise','watch','avoid','closed','unknown')), window_lo INTEGER, window_hi INTEGER,
  p30 REAL, p60 REAL, p90 REAL, official TEXT, reasons TEXT NOT NULL DEFAULT '[]', latest_obs_at INTEGER,
  changed_at INTEGER NOT NULL, seq INTEGER NOT NULL, snapshot_as_of INTEGER NOT NULL, fetched_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS last_known(crossing_id TEXT PRIMARY KEY, state TEXT NOT NULL, at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS alerts_log(id TEXT PRIMARY KEY, crossing_id TEXT, state TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('push','local','inapp','geofence','drive','test','replay','update')),
  title TEXT NOT NULL, body TEXT NOT NULL, received_at INTEGER NOT NULL, read INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS alerts_log_time ON alerts_log(received_at DESC);
CREATE INDEX IF NOT EXISTS alerts_log_crossing ON alerts_log(crossing_id, received_at DESC);
CREATE TABLE IF NOT EXISTS saved_crossings(crossing_id TEXT PRIMARY KEY, watch_alerts INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS saved_places(id TEXT PRIMARY KEY, label TEXT NOT NULL, kind TEXT NOT NULL, lon REAL NOT NULL, lat REAL NOT NULL,
  radius_m INTEGER NOT NULL DEFAULT 4828, watch_alerts INTEGER NOT NULL DEFAULT 0, avoid_alerts INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS saved_routes(id TEXT PRIMARY KEY, name TEXT NOT NULL, origin TEXT NOT NULL, destination TEXT NOT NULL,
  geometry TEXT, depart_min INTEGER, last_verdict TEXT, last_checked_at INTEGER, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS route_cache(key TEXT PRIMARY KEY, json TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS recents(id TEXT PRIMARY KEY, label TEXT NOT NULL, lon REAL NOT NULL, lat REAL NOT NULL, used_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS outbox(id INTEGER PRIMARY KEY AUTOINCREMENT, method TEXT NOT NULL, path TEXT NOT NULL, body TEXT, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v TEXT NOT NULL);
PRAGMA user_version = 1;`;
```
- `last_known` is written whenever a crossing's display state is WATCH/AVOID/CLOSED, so "Last known: AVOID · 2 h ago" survives restarts.
- First launch seeds `crossings` from `assets/seed/crossings.geojson` (F86). Retention: prune `alerts_log` > 30 days, `route_cache` > 7 days, `recents` beyond 20 rows, at startup.
- `meta` keys: `snapshot_as_of`, `seq`, `server_offset_ms`, `geofencesRegisteredAt`, `geofenceSet` (JSON ids), `lastRerankAt`, `replayIndexSha`.
- Location history is **never** stored; saved places/routes and the transient last fix are the only coordinates on disk/memory, and none leave the device except route endpoints (§32.3).

### 28.9 Error handling architecture

- **Route-level** `export function ErrorBoundary({ error, retry })` in `(tabs)/_layout.tsx`, `crossing/[id].tsx`, `replay/[stormId].tsx`, `drive-mode.tsx`: shows §13.20 "Something went wrong. FordCast can't show crossing status right now. Obey barricades and official warnings." + [Try again] (`retry`) + [Back to map]. Drive Mode's boundary also speaks "FordCast stopped. Watch for water and barricades." once.
- **Network errors** map to UI states, never to calm: timeout/5xx/zod failure on the snapshot → next rung → cache with age → UNKNOWN after 20 min; `snapshot.config.min_app_version` above the app version → blocking update card (Replay still works); `snapshot.config.banner` → `CapabilityBanner kind="appBanner"`; 429 on routing → "Routing is busy. Try again in a minute."
- `lib/api.ts` exports `fetchWithTimeout`, `HttpError`, `ProblemError` (parses RFC 9457 `application/problem+json`), and a `withWakingState()` helper that flips a "Waking server…" label if a Render call exceeds 3 s.
- Never log coordinates, tokens or the device secret (`no-console` lint + Sentry scrubbing §36.6).

### 28.10 Deep links & feature flags

- Scheme `fordcast`; groups are invisible in URLs, so `fordcast://crossing/atx-081` → `crossing/[id]`, `fordcast://replay/memorial-day-2015` → `(tabs)/replay/[stormId]`, `fordcast://drive` → Drive tab, `fordcast://alerts`, `fordcast://settings`. Unknown crossing id → inline message in the sheet (§13.21). Universal links = Roadmap.
- On a crossing deep link, Map Home eases the camera to the crossing (the only non-user camera move, because the user tapped the link).
- `src/lib/flags.ts`: `DEMO_MODE` (env), `features.reportWater = false` (F115 Roadmap), `features.mlDisplay` (true only if `snapshot.model.kind === 'ml'`), `features.lightTheme = false`, `features.placesSearch`, `features.handoff`, `features.offlinePacks` — each flipped only when its §4 "Done when" passes.

**Done when (§28):** all MVP routes exist and deep links open them from a killed app; the ladder is proven by disabling each rung (Storage URL → API → network off) with screenshots; a fake-clock test shows LIVE → aging → UNKNOWN-with-last-known at 10/20 min; Realtime escalation appears ≤ 10 s after the server write; relaunch in airplane mode shows the cached map with age labels.

---

## §29. Map implementation

### 29.1 Rules (read first)

1. **MapLibre RN v11 API only** (`@maplibre/maplibre-react-native@11.5.0`). Exports: `Map`, `Camera`, `GeoJSONSource`, `VectorSource`, `Layer` (with a `type` prop), `Images`, `Marker`, `ViewAnnotation`, `Callout`, `UserLocation`, `OfflineManager`, `Animated`, `LocationManager`, `TransformRequestManager` [verified]. There is **no** `MapView`, `ShapeSource`, `CircleLayer`, `SymbolLayer` or `LineLayer` in v11 — code using them is v10 and wrong.
2. `Layer` takes **style-spec kebab-case** `paint`/`layout` (`'line-color'`); the camelCase `style` prop is deprecated. Coordinates are `[lng, lat]`; bounds are `[west, south, east, north]`.
3. Before writing map code, read `node_modules/@maplibre/maplibre-react-native/lib/typescript/**/*.d.ts`. VERIFY BEFORE USE (names not individually verified): `CameraRef` methods (`easeTo`/`flyTo`/`fitBounds`), map event props (`onPress`, `onLongPress`, `onRegionDidChange`, `onDidFinishLoadingMap`, `onDidFailLoadingMap`), `contentInset` shape, `ViewAnnotation` position prop, `Camera` follow-mode enum, `getClusterLeaves`. Verified: `Map` props `mapStyle` (URL or object), `touchPitch`, `touchRotate`, `compass`, `logo`, `attribution`, `attributionPosition`, `androidView="surface"`, `contentInset`; `Camera` `initialViewState`, `minZoom`, `maxZoom`, `maxBounds`; `GeoJSONSource` `cluster`, `clusterRadius`, `clusterMaxZoom`, `clusterProperties`, `lineMetrics`, `hitbox`, `onPress`; `GeoJSONSourceRef.getClusterExpansionZoom`; `Images images={{name: require(...)}}`; `Marker lngLat anchor`; `UserLocation animated heading`.
4. Only `MapSurface.maplibre.tsx` and `offline-pack.ts` import MapLibre (lint rule §27.11).

### 29.2 "FordCast Night" style

- Generate once and commit: `python3 -I tools/make_style.py tools/vendor/positron.json > mobile/assets/map/fordcast-night.json` and `--minimal` → `fordcast-night-minimal.json` (§12.2 Step 6). Generator = research/maps.md §4.3 code with the §9.8 `C` palette (land `#0B1320`, roads `#1A2638/#24344D/#31445F`, water `#0F2236`, waterway `#1E4A63`, labels `#8A97AB/#A9B4C4/#5F87A3`, shields hidden), `ne2_shaded` raster dropped, every symbol `text-font` set to `["Noto Sans Regular"]`/`["Noto Sans Bold"]`/`["Noto Sans Italic"]`.
- Sources/glyphs/sprites stay on OpenFreeMap: tiles `https://tiles.openfreemap.org/planet`, glyphs `https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf`, sprite `https://tiles.openfreemap.org/sprites/ofm_f384/ofm` [verified]. No key, no request limits, no SLA.
- The app uses the **bundled object** (`mapStyle={require('@/assets/map/fordcast-night.json')}`), so the style itself never needs the network. Serving `GET /styles/fordcast-night.json` from the backend (F25 Stretch) is needed only for offline packs (29.11).
- **FordCast labels never use map text** for essential info; the selected crossing's name label uses Noto Sans Bold (Inter renders nothing in map layers).
- **Attribution:** `attribution` ON at bottom-left 8 pt; the text "© OpenStreetMap contributors · OpenFreeMap © OpenMapTiles" also appears in About and on the video end card.

### 29.3 Map skeleton

```tsx
// mobile/src/features/map/MapSurface.maplibre.tsx (essentials)
import { Map, Camera, GeoJSONSource, Layer, Images, Marker, UserLocation } from '@maplibre/maplibre-react-native';
import NIGHT from '@/assets/map/fordcast-night.json';
import { SPRITES } from './sprites';                   // { 'ic-norise': require(...), … } pre-colored PNG @2x/@3x (§10.9)
import * as L from './layers';                         // paint/layout objects + filters (29.4)

export default function MapSurfaceMapLibre(p: MapSurfaceProps) {
  const cam = useRef<CameraRefLike>(null); const src = useRef<GeoJSONSourceRefLike>(null);
  useCameraTarget(cam, p.camera);                      // user-initiated targets only (29.8)
  return (
    <View style={{ flex: 1, backgroundColor: mapTokens.land }} accessible accessibilityRole="image"
          accessibilityLabel={p.accessibilityLabel} importantForAccessibility="yes">
      <Map style={{ flex: 1 }} mapStyle={NIGHT} androidView="surface" touchPitch={false} touchRotate={false}
           compass={false} logo={false} attribution attributionPosition={{ bottom: 8, left: 8 }}
           contentInset={p.insets /* VERIFY shape */} onLongPress={p.onLongPress && ((e: any) => p.onLongPress!(lngLatOf(e)))}>
        <Camera ref={cam} initialViewState={{ center: [-97.7431, 30.2672], zoom: 10.5 }} minZoom={8} maxZoom={17}
                maxBounds={[-98.6, 29.6, -97.0, 31.0]} />
        <Images images={SPRITES} />
        <CreekLayers creeks={p.creeks} active={p.activeReachIds} pulses={p.pulses} />   {/* 29.5 */}
        {p.route && <RouteLayers route={p.route} avoidAreas={p.avoidAreas} />}            {/* 29.6 */}
        {p.gauges && <GaugeLayer gauges={p.gauges} onPress={p.onGaugePress} />}
        <GeoJSONSource ref={src} id="crossings" data={p.crossings} cluster clusterRadius={40} clusterMaxZoom={12}
          clusterProperties={{ maxRank: ['max', ['get', 'rank']], nAvoid: ['+', ['case', ['>=', ['get', 'rank'], 3], 1, 0]],
                               nLastRisk: ['+', ['case', ['get', 'lkRisk'], 1, 0]] }}
          hitbox={{ top: 24, right: 24, bottom: 24, left: 24 }}          // 48 pt targets
          onPress={(e: any) => onCrossingOrCluster(e.nativeEvent.features[0], src, cam, p)}>
          <Layer id="crossing-halo" type="circle" filter={L.haloFilter} paint={L.haloPaint} />
          <Layer id="cluster-circle" type="circle" filter={['has', 'point_count']} paint={L.clusterPaint} />
          <Layer id="cluster-count" type="symbol" filter={['has', 'point_count']} layout={L.clusterCountLayout} paint={L.clusterCountPaint} />
          <Layer id="crossing-selected" type="circle" filter={['==', ['get', 'id'], p.selectedId ?? '']} paint={L.selectedPaint} />
          <Layer id="crossing-icon" type="symbol" filter={['!', ['has', 'point_count']]} layout={L.iconLayout} paint={L.iconPaint} />
        </GeoJSONSource>
        {p.mode !== 'drive' && <PulseMarkers crossings={p.pulseCandidates} />}           {/* ≤ 20 AVOID in view, 29.5 */}
        <UserLocation animated heading />
      </Map>
    </View>
  );
}
```
Never re-mount `<Map>` on data changes; update `data` props only. Build FeatureCollections in `features.ts`, memoized by `snapshot.seq` + language + selected id.

### 29.4 Sources, properties and data-driven styling

**Crossing feature properties** (`features.ts → toCrossingFC(display, static, lang)`):

```ts
type CrossingProps = { id: string; name: string; state: WireState; rank: number; sprite: SpriteName;
                       short: string /* localized chip word, e.g. "AVOID"/"EVITE" */; official: boolean /* closed_source === 'official' */; lastKnown: WireState | '';
                       lkRisk: boolean /* UNKNOWN whose last known state was AVOID/CLOSED */ };
// sprite: CLOSED with closed_source 'official' → 'ic-closed-official'; UNKNOWN with lastKnown WATCH/AVOID/CLOSED → 'ic-unknown-last' + watch|avoid|closed;
//         otherwise 'ic-' + {NO_RISE:'norise', WATCH:'watch', AVOID:'avoid', CLOSED:'closed', UNKNOWN:'unknown'}[state].
// rank uses the DISPLAY state (UNKNOWN-with-lastKnown AVOID keeps rank 1 for clustering but its sprite shows the dashed-frame avoid).
```
> NOTE TO REVIEWER: §9.8 lists `ic-unknown-lastavoid` only; Part A §3.4 requires last-known WATCH/AVOID/CLOSED shapes in a dashed frame, so `tools/make_markers.py` (§10.9) MUST also emit `ic-unknown-lastwatch` and `ic-unknown-lastclosed`.

**Layer stack, bottom → top** (creek layers inserted with `beforeId` = the first basemap label layer, e.g. `waterway_line_label` — VERIFY the id in the generated style):

| # | Layer id | Type | Source | Key paint/layout |
|---|---|---|---|---|
| 1 | `creeks-base` | line | `creeks` | `line-color rgba(43,217,217,0.50)`, width z10 1.5 → z15 3, round caps, no casing |
| 2 | `creeks-glow` | line | `creeks` (filter active) | cyan, width +7, `line-opacity 0.30`, `line-blur 6` |
| 3 | `creeks-active` | line | `creeks` (filter active) | `#2BD9D9` @1.0, width 3; `line-dasharray` from `dashFlow` |
| 4 | `wave-<reachId>` (≤ 3) | line | `wave-<reachId>` (`lineMetrics`) | `line-gradient` = `pulseGradient(p)`, width 6, `line-blur 1` |
| 5 | `flow-arrows` | symbol | `creeks` (active; reduced motion only) | `symbol-placement: 'line'`, `icon-image: 'ic-flow-arrow'`, `symbol-spacing: 120` |
| 6 | `avoid-area-fill` / `avoid-area-line` | fill / line | `avoid-areas` | `#FF5470` @0.14 / 1.5 pt dashed `#FF5470` |
| 7 | `route-casing` · `route-line` · `route-blocked` · `detour-casing` · `detour-line` | line | `route` | 29.6 |
| 8 | `gauges` | circle | `gauges` | 8 pt `#2BD9D9`, 2 pt `#0B1320` stroke; stale → `#7A879C` ring |
| 9 | `crossing-halo` | circle | `crossings` (rank ≥ 2, unclustered) | WATCH `rgba(245,166,35,0.20)`, AVOID `rgba(255,84,112,0.25)`, radius z11 22 → z16 40 (static) |
| 10 | `cluster-circle` · `cluster-count` | circle · symbol | `crossings` | worst-state color (below) |
| 11 | `crossing-selected` | circle | `crossings` | r 24, transparent, 3 pt `#F2F5FA` stroke |
| 12 | `crossing-icon` | symbol | `crossings` | sprite by state, `symbol-sort-key` = rank |
| 13 | Pulse `Marker`s, detour pill `ViewAnnotation`, `UserLocation` | views | — | 29.5/29.6 |

```ts
// mobile/src/features/map/layers.ts (excerpt) — clusters NEVER hide danger (§9.8)
export const clusterPaint = {
  'circle-color': ['step', ['get', 'maxRank'], '#1C2940', 2, '#F5A623', 3, '#C62828'],
  'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 30, 24],
  'circle-stroke-width': 2,
  'circle-stroke-color': ['case', ['all', ['==', ['get', 'maxRank'], 1], ['>', ['get', 'nLastRisk'], 0]], '#FF5470',   // stale cluster that WAS risky
                          ['match', ['get', 'maxRank'], 0, '#8A97AB', 1, '#7A879C', 2, '#0E1726', '#FFFFFF']],
};
export const clusterCountLayout = { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'], 'text-size': 14 };
export const clusterCountPaint = { 'text-color': ['case', ['==', ['get', 'maxRank'], 2], '#0E1726', '#F2F5FA'] };   // ink only on amber
export const iconLayout = {
  'icon-image': ['get', 'sprite'], 'icon-size': ['interpolate', ['linear'], ['zoom'], 11, 0.55, 16, 1.0],
  'icon-allow-overlap': true, 'symbol-sort-key': ['get', 'rank'],
  'text-field': ['step', ['zoom'], '', 13.5, ['get', 'name']], 'text-font': ['Noto Sans Regular'], 'text-size': 12,
  'text-offset': [0, 1.5], 'text-anchor': 'top', 'text-optional': true,
};
export const iconPaint = { 'text-color': '#C9D2DE', 'text-halo-color': '#0B1320', 'text-halo-width': 1.5 };
export const haloFilter = ['all', ['!', ['has', 'point_count']], ['>=', ['get', 'rank'], 2]];
```
- **Cluster tap:** `getClusterExpansionZoom(clusterId)` then ease the camera to it. If `nAvoid > 0`, also expand the Map Home sheet to 45% with its list filtered to crossings within ~2 km of the cluster center sorted by rank (or use `getClusterLeaves` if it exists — VERIFY).
- **Crossing tap:** `router.push('/crossing/' + id)`; selection ring + name label; haptic `select`.
- **Calm zoom rule:** NO_RISE icons appear from z ≥ 11 (they're inside clusters below 13 anyway); rank ≥ 2 crossings always draw on top.
- **Safety test (dev gallery + Jest on the expression):** a cluster fixture containing one AVOID renders `#C62828`; one containing only UNKNOWN + NO_RISE renders the slate/dashed-stroke style.

### 29.5 Animated cues (≤ 2 loops on screen; all stop after 3 cycles or 6 s; §11)

- **AVOID pulse:** RN `Marker` views (`<Marker id={'pulse-'+id} lngLat={c} anchor="center"><PulseRing color="#FF5470" play={motionOK && fresh} /></Marker>`) for at most **20** AVOID crossings inside the visible bounds (recompute on region change, nearest to center first). `PulseRing` is §11.5 (Reanimated 4 CSS animation, 3 iterations). WATCH gets the static halo only. Fallback if Reanimated inside `Marker` misbehaves on device: MLRN `Animated` circle layer filtered to rank 3 [Unverified perf].
- **Rising-creek dash flow (`dashFlow.ts`):** step `line-dasharray` through the 14-pattern sequence every 60 ms via React state on `creeks-active` only; stop after 6 s, when `AppState !== 'active'`, when zoom < 10, or when `useMotionOK()` is false (then solid line).
  ```ts
  export const DASH_SEQ = [[0,4,3],[0.5,4,2.5],[1,4,2],[1.5,4,1.5],[2,4,1],[2.5,4,0.5],[3,4,0],
    [0,0.5,3,3.5],[0,1,3,3],[0,1.5,3,2.5],[0,2,3,2],[0,2.5,3,1.5],[0,3,3,1],[0,3.5,3,0.5]];   // VERIFY visually; reverse if flow looks backwards
  ```
- **Water-travel pulse (`waterPulse.ts`, signature):** one `GeoJSONSource id={'wave-'+reachId} lineMetrics data={reachLine}` + one `Layer type="line"` per animated reach (≤ 3; `line-gradient` cannot be data-driven per feature). Reach geometry MUST be ordered gauge → crossing (NHDPlus may be digitized the other way — reverse in the pipeline and assert in a test).
  ```ts
  export function pulseGradient(p: number) {          // p ∈ [0,1]; stops must strictly increase
    const dim = 'rgba(43,217,217,0.18)', hot = 'rgba(43,217,217,1)';
    const a = Math.max(0.0001, p - 0.12), b = Math.min(0.9998, Math.max(a + 0.0001, p)), c = Math.min(0.9999, b + 0.0001);
    return ['interpolate', ['linear'], ['line-progress'], 0, dim, a, dim, b, hot, c, dim, 1, dim];
  }
  ```
  Live: animate `p` 0 → 1 over 2.4 s (scaled by length, 1.6–4.0 s), ≤ 3 runs while the upstream gauge is rising, driven by `requestAnimationFrame` throttled to 30 fps (React state; paint can't read Reanimated shared values). Replay: `p = clamp((simT − tTrigger)/τ, 0, 1)` (§33.5). Reduced motion: static `flow-arrows` + a `ViewAnnotation` label "≈ {τ} min to crossing".

### 29.6 Route, blocked segment, detour, avoid areas

```tsx
<GeoJSONSource id="route" data={routeFC}>   {/* features carry role: 'baseline' | 'baseline-ghost' | 'blocked' | 'detour' */}
  <Layer id="route-casing" type="line" filter={['in', ['get', 'role'], ['literal', ['baseline', 'detour']]]}
    layout={{ 'line-cap': 'round', 'line-join': 'round' }}
    paint={{ 'line-color': '#0B1320', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 7, 16, 15] }} />
  <Layer id="route-line" type="line" filter={['!=', ['get', 'role'], 'blocked']} layout={{ 'line-cap': 'round', 'line-join': 'round' }}
    paint={{ 'line-color': '#5AA9FF', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 4, 16, 10],
             'line-opacity': ['case', ['==', ['get', 'role'], 'baseline-ghost'], 0.35, 1] }} />
  <Layer id="route-blocked" type="line" filter={['==', ['get', 'role'], 'blocked']}
    paint={{ 'line-color': '#FF5470', 'line-width': 5, 'line-dasharray': [1, 1.5] }} />
</GeoJSONSource>
```
- When a detour exists the baseline becomes `baseline-ghost` (35 %); `blocked` = baseline slice ±300 m around each AVOID/CLOSED crossing (`@turf/along` + `@turf/length`); the detour is full-opacity `#5AA9FF` with casing and a "Detour +{n} min" pill in a `ViewAnnotation` at its midpoint (VERIFY position prop).
- Route line 6 pt + casing; creeks 3 pt without casing — the two are never confused (CVD rule §34.11).

### 29.7 User puck, Drive Mode camera

- `<UserLocation animated heading />` (blue `#5AA9FF` per §9.8 via the puck's default styling if not configurable; VERIFY customization props). Hidden from screen readers.
- Drive Mode map (if shown) is follow-mode with all gestures off: `Camera` follow user with heading (VERIFY the v11 `trackUserLocation`/follow prop and enum; fallback: `easeTo` the latest fix every 1 s with `duration: 800`, bearing = heading).

### 29.8 Insets and camera behaviors

- `contentInset` keeps the visible center above sheets: `top = safeTop + 56`; `bottom = sheetHeightForIndex(gorhomIndex) + TAB_BAR_H + 16` (update on `onChange` index, not per frame); with `crossing/[id]` open, `bottom = detentFraction × windowHeight`. Detent changes: listen for the native-stack `sheetDetentChange` event if exposed (VERIFY in `react-native-screens` types); fallback: assume the initial 0.32 detent.
```tsx
// mobile/src/features/map/sheet/CrossingListSheet.tsx (from gorhom's MIT map example; license header kept) — essentials
const SNAP = [148, '45%', '88%'] as const;
<BottomSheet index={lockout.locked ? 0 : initialIndex} snapPoints={SNAP} enableDynamicSizing={false}
  bottomInset={TAB_BAR_H /* Platform.select({ ios: 50, android: 80 }); tune on device */}
  animatedPosition={sheetPos}                       // shared value → MapChrome rides 16 pt above the sheet on the UI thread
  onChange={(i) => { setInsetBottom(sheetHeightFor(i)); haptic.select(); }}   // contentInset updates on snap only
  enablePanDownToClose={false} backgroundComponent={SheetBackground} handleComponent={SheetHandle}>
  <FlashList data={rows} renderItem={renderRow} renderScrollComponent={useBottomSheetScrollableCreator()}
    scrollEnabled={!lockout.locked} />
</BottomSheet>
```
- **The camera never moves on data updates.** It moves only on: user pan/zoom; Locate me; tapping a crossing/cluster/row; deep link to a crossing; Replay open (fit gauge+creek+crossing bbox, 48 pt padding + sheet inset); route result (fit route bbox). Ease 600 ms; under reduced motion jump (`duration: 0`).
- No pitch, no rotation, no 3D (`touchPitch={false}`, `touchRotate={false}`); `maxBounds` keeps the camera over Central Texas.

### 29.9 Map accessibility (GL canvases are unreadable by VoiceOver/TalkBack)

- The map container is one `accessible` element (`accessibilityRole="image"`) whose label summarizes counts from `useAreaCounts()`: "Map. 1 crossing Avoid, 2 Watch, 1 Unknown within 10 miles. Use the list to hear each crossing." — updated only when counts change.
- The **List** is the accessible alternative (F34): a `MapControls` "List of crossings" button opens the sheet at 88 % with rows sorted by rank, then distance; when a screen reader is on (`A11yPrefs.screenReader`) or Settings `listFirst`, Map Home opens with the list expanded.
- Zoom ± buttons appear when a screen reader / Switch Control is on or Settings "Show zoom buttons" (gesture alternative, WCAG 2.5.1).
- Markers are not focusable; state changes are announced per §34.4, never by moving focus.

### 29.10 Performance rules

≤ 500 crossings, ≤ 20 pulse markers, ≤ 3 wave sources, one dash layer; sprites registered once; GeoJSON objects rebuilt only when `seq`, language or selection change; no `setState` per sheet frame (gorhom `animatedPosition` drives chrome on the UI thread); dash/pulse loops pause when the tab is blurred. Measure per §36.4.

### 29.11 Offline map pack [Stretch F87]

```ts
// mobile/src/features/map/offline-pack.ts
import { OfflineManager } from '@maplibre/maplibre-react-native';
export async function downloadTravisPack(styleUrl: string, onProgress: (pct: number) => void) {
  return OfflineManager.createPack(
    { name: 'travis-z8-14', mapStyle: styleUrl, bounds: [-98.17, 30.02, -97.37, 30.63], minZoom: 8, maxZoom: 14, metadata: { v: 1 } },
    (_pack: unknown, status: any) => onProgress(status.percentage),   // VERIFY status field name
    (_pack: unknown, err: unknown) => console.warn('offline pack error', err),
  );
}
```
- 1,681 tiles at z8–14 (computed); size 30–80 MB is an **unverified estimate** — show the measured size after the first download. Wi-Fi only (`expo-network` type check) and explicit consent ("Download offline map (about N MB)").
- `styleUrl` = backend `/styles/fordcast-night.json` (F25 Stretch). Fallback [Inference — verify with the airplane test]: `https://tiles.openfreemap.org/styles/positron`, which references the same `openmaptiles` tiles and Noto glyphs, so the cached resources are shared.
- Claim "works offline" only after the 4-point airplane test passes on a real phone: (1) map renders; (2) crossings render with age labels → UNKNOWN after 20 min; (3) a geofence alert fires from cached risk; (4) Check My Drive says `routing.offline` and shows the last route.

### 29.12 Style/tile failure fallback

On a style or tile load failure event (VERIFY event name), swap `mapStyle` to `fordcast-night-minimal.json`; if that also fails, render `map.land` background + FordCast GeoJSON layers only, with a small banner "Map details unavailable" (§13.20). Crossings, creeks and the list never depend on tiles.

### 29.13 `MapSurface` adapter and the Expo Go fallback

```tsx
// mobile/src/features/map/MapSurface.tsx — the ONLY map import used by screens
import type { ComponentType } from 'react';
import { caps } from '@/lib/capabilities';
import type { MapSurfaceProps } from './types';
const Impl: ComponentType<MapSurfaceProps> = caps.maplibre
  ? require('./MapSurface.maplibre').default            // lazy: never evaluated in Expo Go
  : (() => { try { return require('./MapSurface.expogo').default; } catch { return require('./MapSurface.unavailable').default; } })();
export default function MapSurface(p: MapSurfaceProps) { return <Impl {...p} />; }
```
- `types.ts`: `MapSurfaceProps = { mode: 'live'|'replay'|'drive'|'route'; crossings: FeatureCollection<Point, CrossingProps>; creeks; activeReachIds: string[]; pulses: {reachId: string; p: number}[]; pulseCandidates; gauges?; route?; avoidAreas?; selectedId?: string|null; insets; camera?: CameraTarget|null; interactive?: boolean; onCrossingPress(id); onClusterExpand?; onGaugePress?(id); onLongPress?(lngLat); accessibilityLabel: string }`.
- `MapSurface.expogo.tsx` (optional; skip if the Day-1 dev build works): `react-native-maps@1.27.2` from Expo `with-maps`; one `<Marker tracksViewChanges={false}>` per crossing with the same pre-colored PNG sprites; `<Polyline>` for route/creeks; Android `provider={PROVIDER_GOOGLE}` + `customMapStyle` night JSON (no key needed in Expo Go); iOS `userInterfaceStyle="dark"` + `mapType="mutedStandard"`. No clustering: render rank ≥ 1 always and NO_RISE only at high zoom. Labeled in the dev banner "Expo Go preview map".
- `MapSurface.unavailable.tsx`: map-colored panel "The map needs the FordCast app build" + the crossing List — used when neither native map is available.
- Do **not** select the implementation with `Constants.executionEnvironment === 'storeClient'` (also true in dev clients); use `isRunningInExpoGo()`.

### 29.14 Switching to `@rnmapbox/maps@10.3.8` (runner-up)

Only if the human already has a Mapbox account with a card and prefers Mapbox Standard's lighting. Cost ≈ 1 day and a new dev build (stop-and-ask: native change). Mapping: `Map`→`Mapbox.MapView`, `GeoJSONSource`→`ShapeSource`, `Layer type=`→`CircleLayer/SymbolLayer/LineLayer` with camelCase `style`; basemap `styleURL="mapbox://styles/mapbox/standard"` + `<Mapbox.StyleImport id="basemap" existing config={{ lightPreset: 'night', theme: 'faded', show3dObjects: false, showPointOfInterestLabels: false, colorWater: '#0F2236' }} />` (keys verified in 10.3.8); custom layers under Standard night need `*-emissive-strength: 1`. Public token `pk.*` goes in `EXPO_PUBLIC_MAPBOX_TOKEN` (public by design). Everything else in §29 (layer order, maxRank clusters, pulses, a11y) stays.

**Done when (§29):** on the Android dev build: FordCast Night renders with Noto labels and attribution; all 5 states + official + last-known sprites render; a cluster containing an AVOID is red; tapping a crossing opens its sheet with the map still interactive; the creek pulse runs gauge → crossing and stops after 3 runs; Reduce Motion shows arrows and no loops; a style failure falls back to the minimal style; with TalkBack on, Map Home opens on the List and every crossing's status is reachable.

---
