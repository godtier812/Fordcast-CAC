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
| react-native-keyboard-controller | 1.21.9 | search sheet keyboard (§8.6; fallback RN `KeyboardAvoidingView`) | Y | — | MVP — **in the Day-1 build** (decided default, §1.2 D1) |
| lottie-react-native | ~7.3.8 | onboarding page 1 water loop (§10.10, A22) | Y | — | module **in the Day-1 build** (§1.2 D1); the animation itself is Stretch (MVP shows the static `OnboardCreek` SVG) |

**Graphics & charts**

| Package | Version | Purpose | Go | Tier |
|---|---|---|---|---|
| @shopify/react-native-skia | **2.6.2** (not 2.14) | RiskRing, Sparkline, WaterPulse, stripes | Y | MVP |
| victory-native | **42.0.1** (Skia-based; never the legacy 35 example) | Hydrograph, LagPair, replay result bars | Y | MVP |

**Map**

| Package | Version | Purpose | Go | Plugin | Tier |
|---|---|---|---|---|---|
| @maplibre/maplibre-react-native | **11.5.0** (v11 API) | the map (§29) | **N** | `"@maplibre/maplibre-react-native"` | MVP |
| react-native-maps | 1.27.2 (not 1.29.x; SDK-bundled, `npx expo install react-native-maps`) | Expo-Go-only map fallback `MapSurface.expogo.tsx` — **default: not built and not installed** (§29.13). Install it in §25.4 batch 5, before the Day-1 build, only if you keep that fallback; Lane D uses it as the only map (§26.9) | Y | none needed in Expo Go | optional (default off) |

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
| @sentry/react-native | ~7.11.0 (not 8.x); plugin `"@sentry/react-native/expo"` | crash reports, scrubbed | Stretch (F125) — in the Day-1 build **only if** that EAS build succeeds without a `SENTRY_AUTH_TOKEN` (§1.2 D1, §25.4 batch 8); otherwise uninstalled and F125 → Roadmap |
| typescript · @types/react | ~6.0.3 · ~19.2.2 | types | MVP |
| eslint · eslint-config-expo | **^9.39.5** (pin < 10) · ~57.0.2 (flat: `eslint-config-expo/flat`) | lint | MVP |
| prettier · eslint-config-prettier · eslint-plugin-prettier · prettier-plugin-tailwindcss | 3.9.10 · 10.1.8 · 5.5.7 · ^0.8.1 | format | MVP |
| jest-expo · jest · @types/jest | ~57.0.6 · **^29.7.0** · ^29.5.14 | tests (jest-expo 57 is Jest-29 based) | MVP |
| @testing-library/react-native (+ peer `test-renderer`) | 14.1.0 (+ 1.3.1); fallback 13.3.3 | component tests | MVP |
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
| expo-mesh-gradient ~57.0.2 | native module; **excluded from the Day-1 build** (decided default, §1.2 D1). Onboarding uses the static SVG (MVP) and Lottie (Stretch) |
| @react-native-ama/core 1.2.1 | native module (not in Expo Go); **excluded from the Day-1 build** (§1.2 D1). F95 tooling = the `docs/a11y/TESTING.md` matrix + `make cvd` (§34.8) |
| `typescript@latest`, `eslint@10`, any `<native-pkg>@latest` | break the SDK 57 / tooling alignment (§37) |

### 25.4 Install commands — exact order (Day 0, Lane A)

Run from the repo root on macOS/Linux/WSL (Windows PowerShell needs `-- --dev` instead of `--dev`). Every native module the plan might ever need goes in **now** so the Day-1 dev build contains it (§1.3 rule 6). This is the **only** first-build install list; A §6 Day 0 runs batches 1–10 exactly as written here.

**Optional native modules — decided before the Day-1 build (§1.2 D1; no answer needed unless the human objects):**

| Module | Decision | Where |
|---|---|---|
| `lottie-react-native` | **in** (module only; the animation is Stretch, §10.10) | batch 4 |
| `react-native-keyboard-controller` | **in** (search sheet, §8.6) | batch 4 |
| `expo-mesh-gradient` | **out** (§25.3) | — |
| `@react-native-ama/core` | **out** (§25.3) | — |
| `@sentry/react-native` | **in only if** the Day-1 EAS build succeeds without `SENTRY_AUTH_TOKEN`; otherwise remove it and F125 → Roadmap | batch 8 |
| `expo-widgets` + `@expo/ui` | Lane B only (paid Apple account, §26.2) | batch 8 |
| `react-native-maps` | **out** by default (no Expo Go map fallback; Expo Go shows the List, §29.13). In only if you decide, before the Day-1 build, to keep `MapSurface.expogo.tsx` | batch 5 (commented) |

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
  expo-font @expo-google-fonts/inter lottie-react-native react-native-keyboard-controller   # last two: §1.2 D1

# 5) map, location, alerts, voice, storage, network, locale (ALL native; must be in the first build)
npx expo install @maplibre/maplibre-react-native expo-location expo-task-manager expo-background-task \
  expo-notifications expo-speech expo-audio expo-keep-awake expo-sqlite expo-network expo-localization
# Expo Go map fallback — default OFF (§29.13). Only if you keep MapSurface.expogo.tsx (decide now, before build #1):
# npx expo install react-native-maps      # SDK-bundled 1.27.2; Metro bundles the fallback's require() in EVERY build

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
# Sentry (Stretch F125; §1.2 D1): install it now and set FORDCAST_SENTRY=1 in the EAS development/preview environments so the
# plugin is in build #1 (§27.3). VERIFY BEFORE USE: SENTRY_DISABLE_AUTO_UPLOAD=true (Sentry RN docs) lets the build skip the
# source-map upload that needs SENTRY_AUTH_TOKEN. With Android Studio (§26.3 step 5), prove it first for free with a local
# `npx expo prebuild -p android --clean && npx expo run:android` and no token. If the build still fails because of Sentry:
# `npm uninstall @sentry/react-native`, unset FORDCAST_SENTRY, rebuild (spare build #6, §26.5), log it in
# docs/decisions/verifications.md and mark F125 Roadmap.
npx expo install @sentry/react-native

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
  'lottie-react-native': /^~?7\.3\./, '@sentry/react-native': /^~?7\./, 'react-native-maps': /^~?1\.27\./,   // checked only if present
};
const bad = Object.entries(rules).filter(([k, re]) => all[k] && !re.test(all[k])).map(([k]) => `${k}@${all[k]}`);
const banned = ['react-native-mmkv', 'moti', 'expo-av', '@turf/turf', 'heroui-native', 'uniwind', 'tamagui',
                'expo-mesh-gradient', '@react-native-ama/core']                    // excluded from the Day-1 build (§1.2 D1)
  .filter((k) => all[k]);
const exists = (p) => fs.existsSync(new URL(p, import.meta.url));
if (exists('../src/features/map/MapSurface.expogo.tsx') !== Boolean(all['react-native-maps'])) {   // §29.13: both or neither
  console.error('MapSurface.expogo.tsx and react-native-maps must be added or removed together (§29.13)'); process.exit(1);
}
if (bad.length || banned.length) { console.error('Pin drift:', bad, 'Banned:', banned); process.exit(1); }
console.log('pins ok');
```

### 25.6 Health checks

| Check | Command | When | Pass condition |
|---|---|---|---|
| SDK alignment | `npx expo install --check` | after every install batch; CI | "Dependencies are up to date" |
| Project doctor | `npx expo-doctor@latest` | same | 0 failed checks |
| RNR setup | `npx @react-native-reusables/cli@latest doctor` | after §12.2 Step 2 and any `rnr add` | no errors (it requires `inlineRem: 16`) |
| Pins | `node scripts/check-pins.mjs` | CI | "pins ok" |
| Types | `npx tsc --noEmit` | every commit | 0 errors |
| Native config sanity | `npx expo prebuild -p android --clean --no-install` then inspect `android/app/src/main/AndroidManifest.xml`; `npx expo prebuild -p ios --clean --no-install` then inspect `ios/*/Info.plist` (works on Linux; pods are skipped) | before each EAS build | permissions, usage strings, `UIBackgroundModes`, scheme present (the §27.3 "generated native values" table; Spanish strings §27.4); then delete `android/` and `ios/` (they are git-ignored, CNG) |

**Done when (§25):** every row of 25.2 marked MVP is installed at its pin, plus the decided optional modules of 25.4 (`lottie-react-native`, `react-native-keyboard-controller`; Sentry kept or removed with the result logged); `expo-mesh-gradient` and `@react-native-ama/core` are absent; `react-native-maps` is installed exactly when `MapSurface.expogo.tsx` exists; `check-pins` passes; `expo-doctor` and `rnr doctor` are clean; `docs/decisions/verifications.md` lists the resolved versions of the five VERIFY packages (or the documented fallback taken).

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
3. **Public env values** (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY` = `sb_publishable_…`, `EXPO_PUBLIC_API_BASE`) as EAS environment variables with plaintext visibility for the `development` and `preview` environments (VERIFY BEFORE USE: `eas env:create --environment` values and the `environment` key in `eas.json`). Fallback (acceptable, because these values are public by design): put them in each profile's `env` block in `eas.json`.
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
- `production` is **never built before judging** (no store publishing, §38). `demo` exists only for the video (DEMO_MODE; §33.9) and costs one build — prefer recording from the dev build with `EXPO_PUBLIC_DEMO_MODE=1 npx expo start --dev-client --no-dev --minify` and use the `demo` profile only if the dev-client chrome shows in recordings.

### 26.5 Build budget (October)

| # | When | Profile | Why |
|---|---|---|---|
| 1 | Day 1 AM | development (Android) | every native module (§25.4) |
| 2 | ≤ Day 6, only if a Day-1 smoke test forced a native change | development | the single allowed native fix (§6.2 native freeze) |
| 3 | Day 7 | preview (Android) | first tester/judge APK; EAS Update channel `preview` |
| 4 | Day 10 | preview | final APK for the GitHub Release (code freeze) |
| 5 | optional, Day 9 | ios-simulator | "iOS compiles" evidence in Lane A (uses the iOS quota) |
| 6 | spare | demo, preview or development | emergency only (e.g. the rebuild without Sentry if build #1 failed because of it, §25.4 batch 8) |

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
  maplibre: NATIVE,                                      // else MapSurface.unavailable (or .expogo only if that fallback is kept, §29.13)
  offlinePacks: NATIVE,                                  // F87
  remotePush: NATIVE && (Platform.OS === 'android' || extra.iosPaid === true),
  backgroundLocation: NATIVE,                            // F63
  geofencing: NATIVE,                                    // F70
  backgroundTask: NATIVE,                                // F74
  liveActivities: NATIVE && Platform.OS === 'ios' && extra.iosPaid === true,  // F112
  timeSensitive: NATIVE && Platform.OS === 'ios' && extra.iosPaid === true,   // F68
  liquidGlassCandidate: Platform.OS === 'ios',          // Stretch F41 only: also needs features.glassChrome (false in MVP, §28.10),
                                                         // isLiquidGlassAvailable() at runtime and Reduce Transparency off
} as const;
export type Capability = keyof typeof caps;
```

Rules:
- **Never import a native-only module at the top level** of a file Expo Go loads (MapLibre, expo-widgets, react-native-maps, Sentry native features). Use `caps` + a lazy `require()` inside the adapter (§29.13). ESLint enforces it (§27.11). A lazy `require()` only prevents **evaluation**: Metro still **bundles** every `require()` it can see, so every required file and package must exist in every build (§29.13). Never wrap a `require()` in `try/catch`.
- Background/registration calls (`startGeofencingAsync`, `startLocationUpdatesAsync`, `registerTaskAsync`, `getExpoPushTokenAsync`) are wrapped: `if (!caps.X) return { ok: false, reason: 'expoGo' }`.
- The UI shows `CapabilityBanner kind="expoGo"` (§12.5) on Alerts, Drive and Settings with `capability.expoGo` (copy in §13.10/§13.14): "Background alerts need the FordCast app build. In this preview, FordCast warns you only while the app is on screen." — never a silent no-op.
- After `expo-dev-client` is installed, `npx expo start` opens the dev client by default; use `npx expo start --go` (or press `s`) for Expo Go.
- Expo Go installs: `npx expo start --go` then press `a` (installs the matching SDK 57 Expo Go on the emulator/phone). Never install Expo Go from Google Play for this project (it may be another SDK).
- Maestro in Expo Go uses `appId: host.exp.Exponent`; on the dev/preview build use the app's package id.

| Feature | Expo Go (SDK 57, Android) | Dev / preview build |
|---|---|---|
| Map | **Default:** `MapSurface.unavailable` (map-colored panel with `errors.map_details` "Map details unavailable" + the crossing List). Only if the fallback was kept before build #1: react-native-maps (no styling parity, no clustering) | MapLibre FordCast Night |
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

`npx create-expo-app@latest mobile --template default@sdk-54`, run in **App Store Expo Go** signed in with the same Expo account. Verified SDK 54 pins: RN 0.81.5, React 19.1.0, expo-router ~6.0.24, reanimated ~4.1.1 + worklets 0.5.1, RNGH ~2.28.0, react-native-maps 1.20.1, Skia 2.2.12, flash-list 2.0.2, svg 15.12.1, lottie ~7.3.1, expo-glass-effect ~0.1.10, expo-symbols ~1.0.8, Sentry ~7.2.0. Deltas: `victory-native@41.26.0` (42 needs Skia ≥ 2.6); `sonner-native@0.24.0`; NativeTabs SDK-54 API (`import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs'`); `@react-navigation/*` imports (no `expo-router/react-navigation` in Router 6); no `Stack.Toolbar`; map = react-native-maps (`npx expo install react-native-maps`; `MapSurface.expogo` becomes the only implementation and `MapSurface.tsx` requires only it, so MapLibre is neither required nor installed); **no** MapLibre, remote push, background location, geofencing or Live Activity — all of those become Roadmap in the Claims Ledger. Whether push works in iOS Expo Go on SDK 54 is unverified; assume no.

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
const SENTRY = process.env.FORDCAST_SENTRY === '1';                // Stretch F125; set only if Sentry is in the Day-1 build (§25.4 batch 8)
const DEMO = process.env.EXPO_PUBLIC_DEMO_MODE === '1';
if (DEMO && (PROFILE === 'preview' || PROFILE === 'production')) {
  throw new Error('EXPO_PUBLIC_DEMO_MODE=1 is forbidden in preview/production builds (§33.9).');
}
const INTER = ['400Regular', '500Medium', '600SemiBold', '700Bold']
  .map((w) => `node_modules/@expo-google-fonts/inter/${w}/Inter_${w}.ttf`);   // VERIFY paths (§10.1)

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'FordCast',
  slug: 'fordcast',
  scheme: 'fordcast',                                  // fordcast://crossing/<id>
  version: '1.0.0',                                    // bump on ANY native change (runtimeVersion = appVersion)
  orientation: 'portrait',                             // MVP: portrait everywhere, Drive Mode included (§8.7). Stretch F94 switches to
                                                       // 'default' + per-screen locks (§28.2) — a native change: version bump + new build
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
      LSApplicationQueriesSchemes: ['comgooglemaps', 'waze'],   // only for canOpenURL checks (hand-off, §32.5)
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
    ['expo-splash-screen', { backgroundColor: '#0E1726', image: './assets/images/splash-icon.png', imageWidth: 76 }],   // §15.7
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
config.resolver.assetExts.push('gz', 'geojson');       // bundled replays/*.json.gz (§33.1) and seed/*.geojson (28.4)
module.exports = withNativeWind(config, { input: './src/global.css', inlineRem: 16 });   // inlineRem required by RNR doctor
```
- Metro treats only `.json` files as JSON modules, so the bundled `.geojson` seed files are **assets**, read at runtime with `expo-asset` + `expo-file-system` exactly like the replay files (`readBundledJson()` in `features/crossings/static.ts`, 28.4). VERIFY BEFORE USE on Day 0: if `require('@/assets/seed/crossings.geojson')` already returns a parsed object in your Metro version, drop `'geojson'` here and use the plain `require`; log the result.
- Metro bundles **every** `require()` it can statically see, including lazy ones inside a branch that never runs: a lazy `require()` prevents evaluation, not bundling (§29.13).

Stretch (Sentry, only if it is in the Day-1 build, §25.4 batch 8): replace the second line with `const { getSentryExpoConfig } = require('@sentry/react-native/metro'); const config = getSentryExpoConfig(__dirname);` and keep the `assetExts` push and the `withNativeWind` wrapper outermost.

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
After any change here or in `global.css`: `npx expo start -c` (resets Metro's transform cache) — styles silently vanish otherwise.

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
  { ignores: ['dist/*', 'example/*', 'android/*', 'ios/*', '.expo/*', 'eslint.config.js'] },   // never lint this file itself
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
          { group: ['react-native-maps'], message: 'Only MapSurface.expogo.tsx may import react-native-maps, and only if that fallback is kept (§29.13).' },
          { group: ['expo-widgets'], message: 'Native-only: import lazily behind caps (§26.7).' },
          { group: ['expo-mesh-gradient', '@react-native-ama/*'], message: 'Excluded from the Day-1 build (§1.2 D1, §25.3).' },
        ],
      }],
      'no-restricted-syntax': ['error',
        { selector: "JSXAttribute[name.name='variant'][value.value='destructive']", message: 'Red is reserved for risk states (§12.4).' },
        { selector: "MemberExpression[object.name='NotificationFeedbackType'][property.name='Success']", message: 'No Success haptic (§3.1).' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  { files: ['src/features/map/MapSurface.maplibre.tsx', 'src/features/map/MapSurface.expogo.tsx', 'src/features/map/offline-pack.ts',
             'src/components/fordcast/AppText.tsx',
             'src/components/ui/**'],                  // RNR copy-ins may use RN Text internally
    rules: { 'no-restricted-imports': 'off' } },
]);
```
- `@react-navigation/*` is blocked once, by the `no-restricted-imports` pattern; there is no separate `no-restricted-syntax` string-literal rule (it would flag this config's own pattern string and duplicate the import rule).
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
**Mobile secret grep** (the one `make ci` runs, A §5.2; C §24.9's `mobile` job runs the same line): `! grep -rnE --exclude-dir=__tests__ 'sb_secret_|X-Api-Key|EXPO_ACCESS_TOKEN' mobile/src mobile/app.config.ts`. Test folders are excluded because the banned-key tests must contain the literal patterns (or build them by string concatenation). ORS/Stadia keys never reach the app at all: routing and search go through the backend (§22.5–§22.6). `env.ts` additionally rejects any non-publishable Supabase key at startup.

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
│  │               skew.ts (server clock offset) · static.ts (bundled seed: crossings, gauges, creeks + /v1/crossings merge; readBundledJson)
│  ├─ map/         MapSurface.tsx · MapSurface.maplibre.tsx · MapSurface.unavailable.tsx · types.ts
│  │               [MapSurface.expogo.tsx — only if the Expo Go fallback is kept, together with react-native-maps (§29.13)]
│  │               sprites.ts (SpriteName + SPRITES: static requires of assets/map/markers/*, the B §10.9 list)
│  │               layers.ts (expressions) · features.ts (GeoJSON builders) · waterPulse.ts · dashFlow.ts · offline-pack.ts
│  │               sheet/ (CrossingListSheet, SheetBackground, SheetHandle) · MapChrome.tsx
│  ├─ replay/      loader.ts · schema.ts · clock.ts · player-store.ts · frames.ts · storage-sync.ts · results.ts
│  │               assets.ts (GENERATED by `make app-data`: static require per bundled storm; never hand-edited, C §17.14)
│  ├─ drive/       drive-store.ts · location-source.ts · proximity.ts · lockout.ts · speech-queue.ts · voices.ts · audio.ts
│  ├─ routing/     route-api.ts · on-route.ts · handoff.ts · search-api.ts · saved.ts (places/routes → crossing IDs)
│  ├─ alerts/      channels.ts · notify.ts · push-registration.ts · subscriptions.ts · geofence-rotation.ts · inbox-store.ts · listeners.ts
│  ├─ offline/     db.ts (open + migrations) · cache.ts (snapshot/risk/last_known I/O) · sync.ts (outbox for device calls)
│  ├─ a11y/        A11yPrefsProvider.tsx · announce.ts · useListFirst.ts
│  └─ about/       claims.generated.json
├─ live/           DriveActivity.tsx (iOS Live Activity component; Lane B only, Stretch F112, §31.9)
├─ lib/            env.ts · capabilities.ts · flags.ts · supabase.ts · api.ts (fetchWithTimeout, Problem errors) · query-client.ts
│                  storage.ts (kv-store adapters) · i18n.ts · format.ts · theme.ts · useTheme.ts · motion.ts · haptics.ts · geo.ts · utils.ts
│                  fonts.ts (INTER_FONTS map for useFonts + one family name per weight, §10.1)
├─ locales/        en.json · es.json · banned-words.json · es-pending-review.json
├─ stores/         settings.ts · onboarding.ts · saved.ts · device.ts
├─ tasks/          geofence.ts · drive-location.ts · background-refresh.ts
└─ __tests__/      (§36.1)
```
Dependency rule: `components/*` never import `features/*/api|realtime|queries`; screens (`app/*`) compose hooks from `features/*` and pass plain props down. `tasks/*` never import React.

### 28.2 Route table (Expo Router 57; names match §8.8)

| URL / file | Presentation & options | Deep link | Tier |
|---|---|---|---|
| `app/_layout.tsx` | root `Stack`, `headerShown:false`, `contentStyle.backgroundColor #0E1726`. **MVP sets no per-screen `orientation`** (the app is portrait-only via `app.config.ts`, §27.3, §8.7). [Stretch F94] adds `orientation: 'portrait_up'` here and `'all'` on `drive-mode` (VERIFY BEFORE USE in `react-native-screens` types; if it fails, stay portrait-only and log it) | — | MVP |
| `(onboarding)/_layout.tsx` · `index` · `how` · `legend` · `pledge` | Stack, horizontal slide; inside `Stack.Protected guard={!onboarded}` | — | MVP |
| `(tabs)/_layout.tsx` | `NativeTabs` from `expo-router/unstable-native-tabs`: triggers `index` (Map) · `drive` · `replay` · `alerts` (4 tabs; Settings via gear) | — | MVP |
| `(tabs)/index.tsx` | Map Home: `MapSurface` + gorhom `CrossingListSheet` + `MapChrome` | `fordcast://` | MVP |
| `(tabs)/drive/_layout.tsx` · `index` · `result` | Stack | `fordcast://drive` (opens the tab; never auto-starts Drive Mode) | MVP shell (Drive Mode entry + saved crossings) / Stretch result (F49) |
| `(tabs)/replay/_layout.tsx` · `index` · `[stormId]` · `results` | Stack; `results` `presentation:'formSheet'`, `sheetAllowedDetents:[0.62,1.0]` | `fordcast://replay/<stormId>` | MVP |
| `(tabs)/alerts/_layout.tsx` · `index` · `saved` | Stack | `fordcast://alerts` | MVP (saved crossings F46); places/routes Stretch (F51) |
| `crossing/[id].tsx` | `presentation:'formSheet'`, `sheetAllowedDetents:[0.32,0.62,1.0]`, `sheetInitialDetentIndex:0`, `sheetLargestUndimmedDetentIndex:1`, `sheetGrabberVisible:true`; **Android only** `sheetCornerRadius:28` (iOS keeps the system concentric radius, §8.4–§8.5) | `fordcast://crossing/<id>` | MVP (F43) |
| `gauge/[id].tsx` | formSheet `sheetAllowedDetents:'fitToContents'` | — | Stretch (F39) |
| `search.tsx` | formSheet `[0.9]` | — | MVP crossings (F37) · Stretch places (F52) |
| `legend.tsx` · `layers.tsx` · `handoff.tsx` | formSheet `fitToContents` | — | MVP (F33) · Stretch (F38) · Stretch (F53) |
| `drive-mode.tsx` | `presentation:'fullScreenModal'`, `gestureEnabled:false`; portrait (MVP); also hosts the simulated Replay drive (F128 [MVP], §30.7) | — (consent required) | MVP (F57); landscape Stretch (F94) |
| `permission/[kind].tsx` | `presentation:'modal'`; kind ∈ `location`·`notifications`·`background` | — | MVP / Stretch (background) |
| `settings/_layout.tsx` + `index` · `language` · `notifications` · `accessibility` · `drive` · `data-sources` · `how-it-works` · `accuracy` · `privacy` · `about` · `legal` · `debug` | Stack pushed on root from any gear; `debug` renders `<Redirect href="/" />` unless `__DEV__` | `fordcast://settings` | MVP |
| `crew.tsx` | Stack screen (Hotspot list; the Map Home sheet's MVP "Ranked" segment uses the same sort) | — | Stretch (F100; CSV export F101) |
| `dev/gallery.tsx` | `__DEV__` only (Redirect otherwise) | — | MVP (F31b) |
| `+not-found.tsx` | `errors.unknown_crossing` "This crossing isn't in FordCast's list anymore." + "Back to map" button | — | MVP |

```tsx
// mobile/src/app/(tabs)/_layout.tsx — SDK 57 path; 4 tabs; labels from i18n; badge = unread AVOID/CLOSED
import { NativeTabs } from 'expo-router/unstable-native-tabs';
export default function TabsLayout() {
  const { t } = useTranslation(); const unread = useUnreadUrgentCount();
  return (
    <NativeTabs backgroundColor="#0E1726" indicatorColor="#24344F" rippleColor="#24344F"   // surface.3 (§8.4)
      iconColor={{ default: '#8A97AB', selected: '#F2F5FA' }} labelStyle={{ default: { color: '#8A97AB' }, selected: { color: '#F2F5FA' } }}
      labelVisibilityMode="labeled"                      // Android: labels always visible (§8.4)
      minimizeBehavior="never">                          {/* iOS 26: tab bar never hides during storms (§8.3 rule 5) */}
      <NativeTabs.Trigger name="index"><NativeTabs.Trigger.Icon sf="map.fill" md="map" /><NativeTabs.Trigger.Label>{t('tabs.map')}</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="drive"><NativeTabs.Trigger.Icon sf="car.fill" md="directions_car" /><NativeTabs.Trigger.Label>{t('tabs.drive')}</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="replay"><NativeTabs.Trigger.Icon sf="clock.arrow.circlepath" md="history" /><NativeTabs.Trigger.Label>{t('tabs.replay')}</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="alerts"><NativeTabs.Trigger.Icon sf="bell.fill" md="notifications" /><NativeTabs.Trigger.Label>{t('tabs.alerts')}</NativeTabs.Trigger.Label>
        {unread > 0 && <NativeTabs.Trigger.Badge>{String(unread)}</NativeTabs.Trigger.Badge>}</NativeTabs.Trigger>
    </NativeTabs>
  );
}
```
Colors, `labelVisibilityMode` and `minimizeBehavior` are owned by B §8.3–§8.4 (this code copies them). `backgroundColor`, `indicatorColor`, `rippleColor`, `iconColor` and `labelStyle` were verified against `expo-router@57.0.26` `native-tabs/types.d.ts`; the iOS 26 tab bar ignores `backgroundColor` (Liquid Glass). VERIFY BEFORE USE in the same d.ts: the `Badge` child form, `labelVisibilityMode="labeled"`, and that `minimizeBehavior` accepts `'never'` (fallback for either prop: omit it and log the result). Every tab root renders `ScreenHeader` with the gear in the same top-right position (WCAG 3.2.6) → `router.push('/settings')`.

Android `formSheet`: max 3 detents and no native header — render titles inside the content [verified]. Use `router.push('/crossing/' + id)` (typed routes on). Any RNR `Dialog` inside a formSheet/fullScreenModal renders into a local `<PortalHost name="sheet" />` placed in that screen.

### 28.3 Root layout: provider order

```tsx
// mobile/src/app/_layout.tsx
import '@/lib/i18n';                                   // FIRST: imports 'intl-pluralrules', inits i18next synchronously
import '@/global.css';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
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
import { useFonts } from '@expo-google-fonts/inter';
import i18n from '@/lib/i18n';
import { INTER_FONTS } from '@/lib/fonts';               // { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold }
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
  const [fontsLoaded] = useFonts(INTER_FONTS);
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
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: dark.bg } }}>
      {/* MVP: no per-screen orientation; app.config.ts is 'portrait' (§27.3, §8.7). Stretch F94 adds orientation: 'portrait_up'
          to screenOptions and 'all' on drive-mode (VERIFY BEFORE USE; §8.7). */}
      <Stack.Protected guard={!onboarded}><Stack.Screen name="(onboarding)" /></Stack.Protected>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="crossing/[id]" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.32, 0.62, 1.0],
          sheetInitialDetentIndex: 0, sheetLargestUndimmedDetentIndex: 1, sheetGrabberVisible: true,
          ...(Platform.OS === 'android' ? { sheetCornerRadius: 28 } : {}) }} />   {/* iOS: system radius (§8.4–§8.5) */}
        <Stack.Screen name="search" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.9] }} />
        <Stack.Screen name="legend" options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents' }} />
        <Stack.Screen name="drive-mode" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="permission/[kind]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" />
        {/* Stretch screens are registered the same way when they ship: gauge/[id] (F39), layers (F38), handoff (F53),
            crew (F100). dev/gallery (F31b, __DEV__) is registered in MVP. */}
      </Stack.Protected>
    </Stack>
  );
}
```
- Expo Router already provides `SafeAreaProvider` — don't add a second. No `BottomSheetModalProvider` (we use only the non-modal `BottomSheet`).
- `useOnboarding` persists with the **synchronous** kv-store adapter (28.7) so the `Stack.Protected` guard is correct on the first frame.
- `AppServices` is a render-null component that owns: Realtime lifecycle (28.4: one owner, at most one channel, started on `active`, stopped on background/inactive/unmount), TanStack `focusManager`/`onlineManager` wiring, notification listeners + cold-start response (§31.5), device registration/subscription outbox flush (§31.4), geofence re-rank on foreground (§30.3, Stretch F70), and the escalation detector (§31.6).
- `src/lib/fonts.ts` exports `INTER_FONTS` (the four `@expo-google-fonts/inter` weights for `useFonts`) and the per-weight family names AppText uses (§10.1; never `fontWeight` on Inter).

### 28.4 Data layer

**Read-path ladder (F85):** Storage snapshot → API → SQLite → bundled seed (all UNKNOWN). Realtime is a *hint*; the snapshot is the *truth*.

```ts
// mobile/src/features/crossings/api.ts
export type SnapshotSource = 'storage' | 'api' | 'cache';
export async function fetchSnapshot(signal?: AbortSignal): Promise<{ snap: ParsedSnapshot; source: SnapshotSource }> {
  const rungs = [
    { source: 'storage' as const, url: SNAPSHOT_URL, timeoutMs: 6_000 },
    { source: 'api' as const, url: `${env.API_BASE}/v1/risk/current`, timeoutMs: 10_000 },  // Render; `common.waking_server` after 3 s
  ];
  let lastErr: unknown;
  for (const r of rungs) {
    try {
      const res = await fetchWithTimeout(r.url, { headers: { Accept: 'application/json' } }, r.timeoutMs, signal);
      if (!res.ok) throw new HttpError(res.status, r.url);
      skew.record(res.headers.get('date'));                       // server clock offset (median of last 5)
      const snap = parseSnapshot(await res.json());               // 28.5: envelope mismatch = failed rung (never a partial envelope);
                                                                  // one bad crossing → only that crossing UNKNOWN + logged (§3.2)
      const kept = await cache.writeSnapshotIfNewer(snap);        // SQLite; monotonic by seq (CDN may serve an older copy);
                                                                  // ids in snap.invalid_ids are written as state 'unknown'
      return { snap: kept, source: r.source };
    } catch (e) { lastErr = e; }
  }
  const cached = await cache.readSnapshot();                      // the 28.6 rule turns it UNKNOWN once check age > min(20 min, stale_after_s)
  if (cached) return { snap: cached, source: 'cache' };
  throw lastErr;                                                  // UI: bundled seed crossings as UNKNOWN + OfflineBanner
}
```

```ts
// mobile/src/features/crossings/static.ts (excerpt) — bundled seed files are assets (metro assetExts, §27.6)
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';                 // VERIFY BEFORE USE: SDK 57 File API (.text()); fallback 'expo-file-system/legacy'
export async function readBundledJson<T>(mod: number, schema: z.ZodType<T>): Promise<T> {
  const a = Asset.fromModule(mod); await a.downloadAsync();          // copies the bundled asset to a local file URI
  return schema.parse(JSON.parse(await new File(a.localUri!).text()));   // zod-validated like every payload
}
export const SEED = {                                    // written by `make app-data` (C §17.14, F86); never hand-edited
  crossings: require('@/assets/seed/crossings.geojson'), // §17.2 static fields; no risk state
  gauges: require('@/assets/seed/gauges.geojson'),       // Point features {id, name, nws_lid}: names for reason text, positions for gauge dots
  creeks: require('@/assets/seed/creeks.geojson'),       // LineStrings {reach_id: "<crossing_id>__<gauge_id>", crossing_id, gauge_id, relation}
} as const;
```

**TanStack Query (v5) keys and policies**

| Query key | Source | staleTime | refetch | gcTime | Persisted |
|---|---|---|---|---|---|
| `['snapshot']` | `fetchSnapshot` | 30 s | every 60 s while foreground; on focus; on reconnect | 24 h | yes |
| `['crossings','static']` | bundled `assets/seed/crossings.geojson` merged with `GET /v1/crossings?format=geojson` | 24 h | when `snapshot.inventory_version` ≠ the cached one (and daily) | 7 d | yes |
| `['gauges','static']` | bundled `assets/seed/gauges.geojson` (`readBundledJson`; Point features `{id, name, nws_lid}`) — gauge names for `reason.*` `{{gauge}}` (§18.10) and positions for map gauge dots, joined by `id` with the snapshot `gauges[]` (newest reading, `stale`) | ∞ (bundled) | on launch only | ∞ | no (re-read from the bundle) |
| `['creeks','static']` | bundled `assets/seed/creeks.geojson` (`{reach_id, crossing_id, gauge_id, relation}`, gauge → crossing order; §29.4) | ∞ (bundled) | on launch only | ∞ | no |
| `['crossing', id]` | `GET /v1/crossings/{id}` (links, τ, triggers, reasons) | 60 s | on sheet open | 1 h | yes |
| `['gauge-series', gaugeId, hours, crossingId]` | `GET /v1/gauges/{id}/series?param=00065&hours=6&crossing_id=<id>` (trigger/watch lines only with `crossing_id`) | 60 s | 120 s while the sheet is open | 30 min | no |
| `['crossing-history', id]` | `GET /v1/crossings/{id}/history?hours=24` | 60 s | on tab open | 30 min | no (Stretch F47) |
| `['freshness']` | `GET /v1/meta/freshness` | 60 s | Data sources screen only | 10 min | no |
| `['replays','index']` | bundled `assets/replays/index.json` (copied by `make app-data`, with `hero_storm_id`/`featured`, C §17.14) + Storage `replays/index.json` (`fordcast.replay-index.v1`) | 1 h | Replay tab focus | 7 d | yes |
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

// mobile/src/features/crossings/realtime.ts — started by AppServices only while AppState === 'active' and onboarded (F24)
import { AppState } from 'react-native';
import type { QueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
export function startRiskRealtime(qc: QueryClient): () => void {
  let stopped = false;                                   // set once by stop(): no more subscribes, no timers
  let attempt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let ch: RealtimeChannel | null = null;
  const closedByUs = new WeakSet<RealtimeChannel>();    // channels WE removed: their CLOSED/errors are expected, never a reconnect cue
  const drop = (c: RealtimeChannel | null) => {
    if (!c) return;
    closedByUs.add(c);                                   // mark BEFORE removeChannel(), which emits CLOSED synchronously or later
    if (ch === c) ch = null;
    void supabase.removeChannel(c);
  };
  const scheduleReconnect = () => {                      // only for UNEXPECTED closes, only while foregrounded, one timer at a time
    if (stopped || timer || AppState.currentState !== 'active') return;
    timer = setTimeout(() => { timer = undefined; subscribe(); }, Math.min(60_000, 2_000 * 2 ** attempt++));
  };
  const subscribe = () => {
    if (stopped || ch) return;                           // never two channels
    const mine: RealtimeChannel = supabase.channel('risk')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'risk_current' }, (payload) => {
        if (stopped || closedByUs.has(mine)) return;
        const row = RiskCurrentRow.safeParse(payload.new);
        if (!row.success) { console.warn('realtime row rejected', row.error.issues[0]?.path); return; }   // next snapshot corrects it
        qc.setQueryData<SnapshotQuery>(['snapshot'], (old) => (old ? mergeRow(old, row.data) : old));   // only if row.seq is newer
        void cache.upsertRiskRow(row.data);
      });
    ch = mine;
    mine.subscribe((status) => {
      if (stopped || closedByUs.has(mine)) return;       // events from a channel we closed (cleanup, background, error path): ignore
      if (status === 'SUBSCRIBED') { attempt = 0; void qc.invalidateQueries({ queryKey: ['snapshot'] }); return; }   // fill the gap
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {   // unexpected: server or network closed it
        void qc.invalidateQueries({ queryKey: ['snapshot'] });                             // the snapshot is the truth
        drop(mine);                                      // marks it closedByUs first, so its own CLOSED can't re-enter here
        scheduleReconnect();
      }
    });
  };
  subscribe();
  return function stop() { stopped = true; if (timer) clearTimeout(timer); timer = undefined; drop(ch); };
}

// In AppServices (28.3) — the only caller; one channel at a time:
// useEffect(() => {
//   if (!onboarded) return;
//   let stop: (() => void) | null = AppState.currentState === 'active' ? startRiskRealtime(queryClient) : null;
//   const sub = AppState.addEventListener('change', (s) => {
//     if (s === 'active') { if (!stop) { stop = startRiskRealtime(queryClient); void queryClient.invalidateQueries({ queryKey: ['snapshot'] }); } }
//     else if (stop) { stop(); stop = null; }             // background/inactive: our own close → never a resubscribe
//   });
//   return () => { sub.remove(); stop?.(); };            // unmount: same
// }, [onboarded]);
```
- Sockets die in the background: `stop()` on `AppState` background/inactive, a fresh `startRiskRealtime()` on active (and refetch the snapshot immediately).
- **Lifecycle rule (F24):** cleanup (`stop()`), backgrounding and the error path itself never trigger the auto-resubscribe, because every channel we remove is in `closedByUs` before `removeChannel()` runs and `stopped` blocks new subscribes and timers. Reconnect with backoff (2 s → 60 s cap) happens only after an **unexpected** `CLOSED` / `CHANNEL_ERROR` / `TIMED_OUT` while the app is foregrounded. Never wrap `removeChannel()` in a retry.
- **Test (`realtime-lifecycle-test.ts`, fake timers + a mocked `supabase.channel`):** (1) `stop()` then the mock emits `CLOSED` → no new `supabase.channel()` call and no pending timer; (2) `CHANNEL_ERROR` while `active` → exactly one new channel after 2 s; (3) the same while `background` → none; (4) two errors in a row → still one channel.
- Realtime rows carry no freshness; the 60 s snapshot poll keeps `as_of` current. If Realtime is cut (§6.3, first MVP cut), only the poll remains.

### 28.5 zod schemas (mirror C §21.1 and §22.3–§22.7 and §23.6 exactly; contract-tested against `docs/schemas/*.example.json`)

**Rules.** C §22.3: nullable fields are **always present** as explicit `null`, so every nullable field is `.nullable()`, never `.optional()`. The only `.nullish()` fields are those C documents as *absent when not applicable*: reason parameters (§18.10, e.g. `{"code": "NO_UPSTREAM_GAUGE"}`), `trigger_ft`/`watch_ft` on a gauge series requested without `crossing_id` (§22.4), and per-type push `data` fields (§23.6). Only the current state names parse (`no_rise | watch | avoid | closed | unknown`); a retired name (`no_signal`, `flooded`, …) fails. **A crossing that fails to parse renders UNKNOWN, the error is logged, and the rest of the snapshot still renders** (`parseSnapshot`, §3.2, B §13.20).

```ts
// mobile/src/features/crossings/schema.ts
import { z } from 'zod';
// zod 4.6.7: z.string().datetime({ offset: true }) still works but is deprecated in favor of z.iso.datetime({ offset: true }),
// and .passthrough() is a deprecated alias of z.looseObject() — VERIFY BEFORE USE in node_modules/zod; use the non-deprecated
// forms if present (same behavior).
const Iso = z.string().datetime({ offset: true });
export const WireState = z.enum(['no_rise', 'watch', 'avoid', 'closed', 'unknown']);     // = public.risk_state (§21)
export const OfficialState = z.enum(['open', 'caution', 'closed', 'unknown']);         // 'open' is NEVER shown as "open" (§3.3)
export const Window = z.union([z.tuple([z.literal(0), z.literal(15)]), z.tuple([z.literal(15), z.literal(30)]),
  z.tuple([z.literal(30), z.literal(60)]), z.tuple([z.literal(60), z.literal(90)]), z.tuple([z.literal(0), z.literal(30)]),
  z.tuple([z.literal(15), z.literal(60)]), z.tuple([z.literal(30), z.literal(90)])]);   // the 7 allowed windows (§18.6)
export const Reason = z.object({       // C §18.10 reason object; params depend on the code and are ABSENT when they don't apply
  code: z.string(),                    // UPSTREAM_ABOVE_TRIGGER | UPSTREAM_RISING | WATER_AT_ROAD | OFFICIAL_CLOSED | OFFICIAL_CAUTION |
                                       // DATA_STALE | NO_UPSTREAM_GAUGE | HOLDING | CLOSURE_LIFTED | RAIN_OVER_BASIN | NEAR_ROAD_RISING
                                       // (§18.10); an unknown code renders the generic "Why" line, never a calm one
  gauge_id: z.string().nullish(), value_ft: z.number().nullish(), rise_ft_30m: z.number().nullish(),
  tau_min: z.number().nullish(),                       // exact median: debug screen (F107) + replay pulse math ONLY, never rendered (§3.5 rule 8)
  tau_lo_min: z.number().nullish(), tau_hi_min: z.number().nullish(),   // the travel RANGE every template uses ({{tau_lo}}–{{tau_hi}})
  trigger_ft: z.number().nullish(), watch_ft: z.number().nullish(), overtop_ft: z.number().nullish(),
  obs_at: Iso.nullish(), last_obs_at: Iso.nullish(), source: z.string().nullish(), as_of: Iso.nullish(), at: Iso.nullish(),
  since: Iso.nullish(), held_state: WireState.nullish(), qpe_in: z.number().nullish(), hours: z.number().nullish(),
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
const SnapshotEnvelope = z.object({
  schema: z.literal('fordcast.snapshot.v1'), as_of: Iso, generated_at: Iso, seq: z.number().int(),
  data_status: z.enum(['live', 'degraded', 'offline']),               // a live snapshot never says 'replay'
  stale_after_s: z.number().int().positive(),                         // 1200 today; the client honors it, never above 20 min (28.6)
  model: z.object({ kind: z.enum(['rule', 'ml']), version: z.string(), git_sha: z.string(), ml_enabled: z.boolean() }),
  inventory_version: z.string(),                                     // ≠ seed's → refetch /v1/crossings?format=geojson
  disclaimer_key: z.literal('SUPPLEMENTARY_TOOL'),
  config: z.object({                                                  // app_config (§20.9); one snapshot serves both languages
    banner: z.object({ en: z.string(), es: z.string(), level: z.enum(['info', 'warning']), until: Iso.nullable() }).nullable(),
    min_app_version: z.string(), demo_mode_default: z.boolean(), featured_storm: z.string().nullable(),
  }).passthrough(),
  counts: z.object({ crossings: z.number(), monitored: z.number(), gauges_active: z.number(), gauges_stale: z.number() }),
  nws_status: z.string(),                                             // 'disabled' until F17 ships; 'unavailable' when the feed is down
  nws: z.array(z.object({ id: z.string(), event: z.string(), sent: Iso, expires: Iso })
    .passthrough()),                                                  // + damage_threat, emergency, headline_en (Stretch F17, §22.3)
  gauges: z.array(z.object({ id: z.string(), obs_at: Iso.nullable(), value_ft: z.number().nullable(),
                             rise_ft_30m: z.number().nullable(), stale: z.boolean() })),
  crossings: z.array(z.unknown()),                                    // validated one by one in parseSnapshot()
});
export const SnapshotV1 = SnapshotEnvelope.extend({ crossings: z.array(CrossingRisk) });   // whole-document schema (contract tests)
export type ParsedSnapshot = z.infer<typeof SnapshotV1> & { invalid_ids: string[] };
export function parseSnapshot(json: unknown): ParsedSnapshot {
  const env = SnapshotEnvelope.parse(json);                           // envelope mismatch → throw → the ladder tries the next rung
  const crossings: z.infer<typeof CrossingRisk>[] = []; const invalid_ids: string[] = [];
  for (const raw of env.crossings) {                                  // sorted by id; static fields come from the seed
    const r = CrossingRisk.safeParse(raw);
    if (r.success) { crossings.push(r.data); continue; }
    const id = z.object({ id: z.string() }).safeParse(raw);
    invalid_ids.push(id.success ? id.data.id : '(no id)');            // displayRisk() renders these UNKNOWN (28.6)
    console.warn('snapshot crossing rejected', id.success ? id.data.id : '(no id)', r.error.issues[0]?.path);   // ids only; never coordinates
  }
  return { ...env, crossings, invalid_ids };
}
export const RiskCurrentRow = z.object({                              // Realtime payload.new = public.risk_current columns (§21.1)
  crossing_id: z.string(), state: WireState, window_lo_min: z.number().nullable(), window_hi_min: z.number().nullable(),
  p30: z.number().nullable(), p60: z.number().nullable(), p90: z.number().nullable(), reasons: z.array(Reason),
  reason_codes: z.array(z.string()), held: z.boolean(), closed_source: z.enum(['official', 'sensor']).nullable(),
  official: OfficialState, official_source: z.string().nullable(), official_as_of: z.string().nullable(),
  last_known_state: WireState.nullable(), last_known_at: z.string().nullable(), latest_obs_at: z.string().nullable(),
  changed_at: z.string(), evaluated_at: z.string(), model_version: z.string(), seq: z.number(),
});                                                                   // mergeRow() maps it to CrossingRisk (official null when 'unknown' w/o source)
export const CrossingLink = z.object({                                // GET /v1/crossings/{id} links[] (§22.4; field types §17.10)
  gauge_id: z.string(), name: z.string(), relation: z.enum(['upstream', 'at_site', 'nearest_baseline']), is_primary: z.boolean(),
  channel_dist_km: z.number().nullable(),
  tau_min: z.number().nullable(), tau_p25: z.number().nullable(), tau_p75: z.number().nullable(),   // exact τ: debug screen ONLY (F107)
  tau_lo_min: z.number().nullish(), tau_hi_min: z.number().nullish(), // the range LagPair shows (§3.5 rule 8); see the note below
  trigger_ft: z.number().nullable(), watch_ft: z.number().nullable(), params_source: z.enum(['learned', 'transferred', 'manual']),
  nws_lid: z.string().nullable(), nws_categories: z.record(z.string(), z.number()).nullable(),
  latest: z.object({ obs_at: Iso.nullable(), value_ft: z.number().nullable(), rise_ft_30m: z.number().nullable(), stale: z.boolean() })
    .nullable(),
});
export const CrossingDetail = z.object({                              // GET /v1/crossings/{id} (§22.4; record types §17.2)
  id: z.string(), name: z.string(), name_es: z.string().nullable(), name_spoken_en: z.string().nullable(),
  name_spoken_es: z.string().nullable(), road: z.string().nullable(), creek: z.string().nullable(), jurisdiction: z.string(),
  lon: z.number(), lat: z.number(), tier: z.enum(['A', 'B', 'C']), snap: z.enum(['auto', 'verified', 'override', 'rejected']),
  overtop_stage_ft: z.number().nullable(), truth_quality: z.enum(['sensor', 'gauge', 'impact_statement', 'proxy']).nullable(),
  risk: CrossingRisk,
  official: z.object({ status: OfficialState, source: z.string(), as_of: Iso, note: z.string().nullish() }).nullable(),
  official_link: z.string().url(), links: z.array(CrossingLink), model_version: z.string(),
  sources: z.array(z.object({ source: z.string(), ref: z.string() })), as_of: Iso, disclaimer_key: z.literal('SUPPLEMENTARY_TOOL'),
});
export const GaugeSeries = z.object({ gauge_id: z.string(), param: z.literal('00065'), unit: z.literal('ft'),
  points: z.array(z.tuple([Iso, z.number()])), approval: z.enum(['P', 'A']), stale: z.boolean(), stale_after_min: z.number(),
  nws_categories: z.record(z.string(), z.number()).nullable(),
  trigger_ft: z.number().nullish(), watch_ft: z.number().nullish(),  // present only when crossing_id names a linked crossing (§22.4)
  as_of: Iso });
export const PushData = z.object({                                    // §23.6 data block (local notifications use the same shape);
  type: z.enum(['risk', 'update', 'summary', 'unknown', 'test', 'replay']),   // fields that don't apply to a type are absent
  crossing_id: z.string().nullish(), crossing_ids: z.array(z.string()).max(10).nullish(), state: WireState.nullish(),
  window: Window.nullish(), seq: z.number().nullish(), as_of: z.string().nullish(),
  url: z.string().startsWith('fordcast://').nullish(), test: z.boolean().nullish(),
});
export const DeviceRegistration = z.object({ device_id: z.string().uuid(), device_secret: z.string().regex(/^[0-9a-f]{64}$/) });
// Live in their feature folders, same rules: RouteRequest/RouteResponse (§32.2 — an exact mirror of C §22.5: flat `replay_at` +
// `storm_id` in the request; `issued_at`, `risk_as_of`, `crossings_on_baseline[].id`, `provider: 'ors' | 'stadia'` in the response),
// SearchResults (§32.6) and ReplayV1/ReplayIndex (§33.2, every nullable field `.nullable()`).
```
- `held` (§18) means the server is holding a level during its de-escalation dwell; the UI shows the state normally (never "clearing soon").
- `type: 'replay'` is client-only (local REPLAY demo notifications, channel `updates`, body starting `replay.notify_body` "REPLAY — not a live alert:", §3.8); the server never sends it.
- `CrossingLink.tau_lo_min`/`tau_hi_min` are `.nullish()` until C §22.4 lists them on `links[]` (the reason object already carries them, §18.10). Until then the live LagPair [Stretch F45] takes the range from the crossing's `UPSTREAM_*` reason for that gauge and hides the connector label when there is none — it never formats `tau_min`/`tau_p25`/`tau_p75` itself.
- **Per-crossing parse test** (`snapshot-parse-test.ts`): a fixture snapshot (crossing ids `test-0001`…`test-0003`) where one crossing has the retired state `no_signal` → `parseSnapshot` returns the other two, `invalid_ids = ['test-0002']`, one `console.warn`; the map and list render `test-0002` as UNKNOWN (dashed, never calm) and the others normally. An envelope error (wrong `schema`) still fails the rung.

### 28.6 Risk state utilities and the staleness rule (F11)

```ts
// mobile/src/features/risk/state.ts
export type RiskState = 'NO_RISE' | 'WATCH' | 'AVOID' | 'CLOSED' | 'UNKNOWN';
export const RANK: Record<RiskState, number> = { NO_RISE: 0, UNKNOWN: 1, WATCH: 2, AVOID: 3, CLOSED: 4 };
export const fromWire = (s: z.infer<typeof WireState>) => s.toUpperCase() as RiskState;
export const toWire = (s: RiskState) => s.toLowerCase() as z.infer<typeof WireState>;

// mobile/src/features/risk/staleness.ts — two ages (§3.4):
//  • CHECK age = now − snapshot.as_of (skew-corrected). The client is authoritative for it: FreshnessPill `fresh.checked`
//    "Checked 2 min ago", and once it exceeds min(20 min, stale_after_s) EVERY crossing renders UNKNOWN + last known.
//  • READING age = now − crossing.latest_obs_at. Per-crossing UNKNOWN from reading age is decided by the server every tick
//    (C §18.9 rules → state 'unknown', reason DATA_STALE) and shown whatever the check age; the card also prints it
//    (`fresh.newest_reading` "Newest gauge reading: 55 min ago").
export const LIVE_MAX_MIN = 10, AGING_MAX_MIN = 20, DEFAULT_STALE_AFTER_S = 1200;
export type Freshness = 'live' | 'aging' | 'degraded' | 'offline' | 'replay';   // internal names (= B FreshnessPill status); the UI
                                                                                 // never prints "Live" — it prints `fresh.checked`
export interface DisplayRisk {
  id: string; state: RiskState; freshness: Freshness;
  ageMin: number;                                                // CHECK age (snapshot), drives the pill and the 20-min rule
  readingAgeMin: number | null;                                  // READING age (latest_obs_at), shown on the Crossing Card only
  window: [number, number] | null;
  lastKnown?: { state: 'WATCH' | 'AVOID' | 'CLOSED'; at: number };
  source: 'official' | 'sensor' | 'model' | 'manual' | 'none'; officialSource?: string;   // e.g. "City of Austin" / "Manual entry"
  officialNote?: 'no_closure';                                   // official 'open' → `official.no_closure` "{{source}}: no closure reported"
  held: boolean; tier: 'A' | 'B' | 'C'; reasons: Reason[];
  invalid?: true;                                                // the crossing's record failed validation (28.5) → UNKNOWN
}
type SnapForDisplay = Pick<ParsedSnapshot, 'as_of' | 'data_status' | 'stale_after_s'> & { invalid_ids?: string[] };
export function checkAge(snap: SnapForDisplay, nowMs: number, offsetMs: number) {
  const ageMin = Math.max(0, (nowMs + offsetMs - Date.parse(snap.as_of)) / 60_000);
  const staleMin = Math.min(AGING_MAX_MIN, (snap.stale_after_s ?? DEFAULT_STALE_AFTER_S) / 60);   // never more lenient than 20 min (§3.4)
  const offline = ageMin > staleMin || snap.data_status === 'offline';
  const freshness: Freshness = offline ? 'offline' : snap.data_status === 'degraded' ? 'degraded'
    : ageMin > LIVE_MAX_MIN ? 'aging' : 'live';
  return { ageMin, offline, freshness };
}
export function displayRisk(r: CrossingRisk | undefined, id: string, snap: SnapForDisplay | null,
                            nowMs: number, offsetMs: number, localLastKnown?: DisplayRisk['lastKnown']): DisplayRisk {
  if (!snap) return { id, state: 'UNKNOWN', freshness: 'offline', ageMin: Infinity, readingAgeMin: null, window: null,
                      lastKnown: localLastKnown, source: 'none', held: false, tier: 'C', reasons: [] };
  const { ageMin, offline, freshness } = checkAge(snap, nowMs, offsetMs);
  if (!r) return { id, state: 'UNKNOWN', freshness, ageMin, readingAgeMin: null, window: null,    // missing or failed to parse
                   lastKnown: localLastKnown, source: 'none', held: false, tier: 'C', reasons: [],
                   ...(snap.invalid_ids?.includes(id) ? { invalid: true as const } : {}) };
  const readingAgeMin = r.latest_obs_at ? Math.max(0, (nowMs + offsetMs - Date.parse(r.latest_obs_at)) / 60_000) : null;
  const base = fromWire(r.state);
  const source = base === 'CLOSED' && r.closed_source === 'official' ? (r.official?.source === 'manual' ? 'manual' : 'official')
    : base === 'CLOSED' && r.closed_source === 'sensor' ? 'sensor' : base === 'UNKNOWN' ? 'none' : 'model';
  const officialSource = r.official?.source;                    // label text resolved via i18n (§3.6)
  const officialNote = r.official?.status === 'open' ? ('no_closure' as const) : undefined;
  if (offline || base === 'UNKNOWN') {
    const wasRisky = RANK[base] >= RANK.WATCH ? { state: base as 'WATCH' | 'AVOID' | 'CLOSED', at: Date.parse(r.changed_at) } : undefined;
    const serverLk = r.last_known && RANK[fromWire(r.last_known.state)] >= RANK.WATCH
      ? { state: fromWire(r.last_known.state) as 'WATCH' | 'AVOID' | 'CLOSED', at: Date.parse(r.last_known.at) } : undefined;
    return { id, state: 'UNKNOWN', freshness, ageMin, readingAgeMin, window: null,
             lastKnown: wasRisky ?? serverLk ?? localLastKnown,
             source: 'none', held: false, tier: r.tier, reasons: r.reasons };   // never a calm look
  }
  return { id, state: base, freshness, ageMin, readingAgeMin, window: base === 'WATCH' || base === 'AVOID' ? r.window : null,
           source, officialSource, officialNote, held: r.held, tier: r.tier, reasons: r.reasons };
}
```
- A crossing **missing** from the snapshot, or one whose record failed validation (`invalid_ids`, 28.5), is UNKNOWN with the offline/unknown copy and its last-known badge; the error was logged once by `parseSnapshot`. A crossing with no local cache at first launch is UNKNOWN ("No data yet").
- `stale_after_s` comes from the snapshot (C §22.3; default 1,200 s). The client uses `min(20 min, stale_after_s)`, so the server can make the phone stricter, never more lenient than §3.4. `data_status: 'offline'` (recomputed by the API at read time) has the same effect; `degraded` keeps per-crossing states and shows `fresh.partial` (the server already marks the affected crossings `unknown`).
- `windows.ts` implements §3.5: `visualWindow(state, window)` → `"15–30 min"`; when `lo === 0` it returns the `headline_now` slot ("Water may already be on the road"; a rendered string never contains "0–" or "now–", §3.7); `spokenWindow()` → `"15 to 30 minutes"` / `"de 15 a 30 minutos"`. `travelRange(reason)` → `travel.range` / `travel.range_spoken` with `{{tau_lo}}`/`{{tau_hi}}` from `tau_lo_min`/`tau_hi_min` only (no range → no travel-time text). No function in the app may output a single-number ETA or a single-number travel time (unit-tested); `tau_min` is read only by the debug screen (F107) and the pulse math (29.5).
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
| `settings.ts` | yes | `language: 'system'\|'en'\|'es'`, `units: {stage:'ft'\|'m', distance:'mi'\|'km'}`, `appearance: 'dark'\|'system'\|'light'`, `haptics`, `sounds`, `spokenAlerts`, `voiceRate` (0.8–1.2, default 0.95), `animations: 'system'\|'full'\|'reduced'`, `increaseContrast`, `showZoomButtons`, `alertsEnabled`, `watchAlertsDefault: false` (device-level Watch opt-in, default **off**, §1.2 D2; each subscription also carries its own `want_watch`, default off, C §23.2), `quietHours: {start,end}\|null` (Stretch F73), `autoSuggestDrive` (Stretch F62), `listFirst` |
| `saved.ts` | mirror of SQLite | `savedCrossingIds` (MVP F46), `places[]`, `routes[]` (Stretch F51) (hydrated from SQLite at start; writes go to SQLite first) |
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
- First launch seeds `crossings` from `assets/seed/crossings.geojson` (F86, via `readBundledJson`, 28.4). Retention: prune `alerts_log` > 30 days, `route_cache` > 7 days, `recents` beyond 20 rows, at startup.
- `meta` keys: `snapshot_as_of`, `stale_after_s`, `data_status`, `seq`, `server_offset_ms`, `geofencesRegisteredAt`, `geofenceSet` (JSON ids), `lastRerankAt`, `replayIndexSha`. Tasks apply the same 28.6 rule from these (`displayRiskFromCache`, §30.3).
- **On-device data statements (F84; the privacy policy's "what stays on your phone" list, B §13.16.6 and `docs/privacy/index.md`, is generated from exactly these lines — keep them true):**
  - Location history is **never** stored. The current fix lives in memory only (`drive-store.lastFix`, foreground location) and is never written to disk.
  - Coordinates on the phone: saved places (`saved_places`) and saved routes (`saved_routes`) [Stretch F51]; recent searched places (`recents`, last 20); cached route results (`route_cache`, 7 days). The `crossings` table holds public crossing positions, not personal data.
  - What leaves the phone: route endpoints in a `POST /v1/route` request (used in memory, never stored or logged, §22.9, §32.3) and search text (`GET /v1/search`, which never carries the device location, §32.6); crossing IDs for push subscriptions (computed on the phone, §31.4). Never coordinates for subscriptions, never location history.
  - **"Delete cached data"** (`settings.delete_cached_data`, B §13.16.6) deletes `recents`, `route_cache`, the `risk` rows and the persisted query cache (`fordcast-rq-v1`); it keeps `last_known`, the bundled seed, saved items, alert settings and history. **"Delete my alert data"** (`settings.delete_alert_data`) deletes `saved_crossings`, `saved_places`, `saved_routes`, `alerts_log` and the server device record (`DELETE /v1/devices/{id}`, C §22.7; flow in B §13.16.6).

### 28.9 Error handling architecture

- **Route-level** `export function ErrorBoundary({ error, retry })` in `(tabs)/_layout.tsx`, `crossing/[id].tsx`, `replay/[stormId].tsx`, `drive-mode.tsx`: shows §13.20 `errors.root` "Something went wrong. FordCast can't show crossing status right now. Obey barricades and official warnings." + [Try again] (`retry`) + [Back to map]. Drive Mode's boundary also speaks `drive.tts.stopped` "FordCast stopped. Watch for water and barricades." once. Every string here comes from the §3.7 bank / B §13.20 keys, in EN and ES.
- **Network errors** map to UI states, never to calm: timeout/5xx/envelope zod failure on the snapshot → next rung → cache with age → UNKNOWN once check age > min(20 min, `stale_after_s`) (28.6); one invalid crossing → that crossing UNKNOWN (28.5); `snapshot.config.min_app_version` above the app version → blocking card `errors.update_required` (Replay still works); `snapshot.config.banner` → `CapabilityBanner kind="appBanner"` (the banner's own `en`/`es` text); 429 on routing → `routing.busy` "Routing is busy. Try again in a minute."
- `lib/api.ts` exports `fetchWithTimeout`, `HttpError`, `ProblemError` (parses RFC 9457 `application/problem+json`), and a `withWakingState()` helper that flips a `common.waking_server` "Waking server…" label if a Render call exceeds 3 s.
- Never log coordinates, tokens or the device secret (`no-console` lint + Sentry scrubbing §36.6).

### 28.10 Deep links & feature flags

- Scheme `fordcast`; groups are invisible in URLs, so `fordcast://crossing/atx-081` → `crossing/[id]`, `fordcast://replay/memorial-day-2015` → `(tabs)/replay/[stormId]`, `fordcast://drive` → Drive tab, `fordcast://alerts`, `fordcast://settings`. Unknown crossing id → inline message `errors.unknown_crossing` in the sheet (§13.21). Universal links = Roadmap (F125r).
- On a crossing deep link, Map Home eases the camera to the crossing (the only non-user camera move, because the user tapped the link).
- `src/lib/flags.ts`: `DEMO_MODE` (env), `features.glassChrome = false` (F41 Stretch: MVP uses solid surfaces on both platforms, §8.3), `features.reportWater = false` (F115 Roadmap), `features.mlDisplay` (true only if `snapshot.model.kind === 'ml'`), `features.lightTheme = false`, `features.placesSearch`, `features.handoff`, `features.offlinePacks` — each flipped only when its §4 "Done when" passes.

**Done when (§28):** all MVP routes exist and deep links open them from a killed app; the ladder is proven by disabling each rung (Storage URL → API → network off) with screenshots; a fake-clock test shows fresh → aging → UNKNOWN-with-last-known at 10/20 min (and earlier when a fixture sets `stale_after_s` below 1,200); `snapshot-parse-test.ts` (one retired-name crossing → only that crossing UNKNOWN, error logged) and `realtime-lifecycle-test.ts` (stop/background/unmount never resubscribe) pass; Realtime escalation appears ≤ 10 s after the server write; relaunch in airplane mode shows the cached map with "Checked … ago" and newest-reading ages; every screen stays portrait with the phone rotated (MVP, §8.7).

---

## §29. Map implementation

### 29.1 Rules (read first)

1. **MapLibre RN v11 API only** (`@maplibre/maplibre-react-native@11.5.0`). Exports: `Map`, `Camera`, `GeoJSONSource`, `VectorSource`, `Layer` (with a `type` prop), `Images`, `Marker`, `ViewAnnotation`, `Callout`, `UserLocation`, `OfflineManager`, `Animated`, `LocationManager`, `TransformRequestManager` [verified]. Every layer is `<Layer type="circle|symbol|line|fill" …>`. The v10 component names (`MapView`, `ShapeSource` and the per-type layer components) do not exist in v11 — code using them is v10 and wrong; never write them.
2. `Layer` takes **style-spec kebab-case** `paint`/`layout` (`'line-color'`); the camelCase `style` prop is deprecated. Coordinates are `[lng, lat]`; bounds are `[west, south, east, north]`.
3. Before writing map code, read `node_modules/@maplibre/maplibre-react-native/lib/typescript/**/*.d.ts`. VERIFY BEFORE USE (names not individually verified): `CameraRef` methods (`easeTo`/`flyTo`/`fitBounds`), map event props (`onPress`, `onLongPress`, `onRegionDidChange`, `onDidFinishLoadingMap`, `onDidFailLoadingMap`), `contentInset` shape, `ViewAnnotation` position prop, `Camera` follow-mode enum, `getClusterLeaves`. Verified: `Map` props `mapStyle` (URL or object), `touchPitch`, `touchRotate`, `compass`, `logo`, `attribution`, `attributionPosition`, `androidView="surface"`, `contentInset`; `Camera` `initialViewState`, `minZoom`, `maxZoom`, `maxBounds`; `GeoJSONSource` `cluster`, `clusterRadius`, `clusterMaxZoom`, `clusterProperties`, `lineMetrics`, `hitbox`, `onPress`; `GeoJSONSourceRef.getClusterExpansionZoom`; `Images images={{name: require(...)}}`; `Marker lngLat anchor`; `UserLocation animated heading`.
4. Only `MapSurface.maplibre.tsx` and `offline-pack.ts` import MapLibre (lint rule §27.11).

### 29.2 "FordCast Night" style

- Generate once and commit with **`make style`** (A §5.2; tools environment `tools/pyproject.toml`, never bare `python3`): it runs `uv run --project tools python tools/make_style.py tools/vendor/positron.json > mobile/assets/map/fordcast-night.json` and the same with `--minimal` → `mobile/assets/map/fordcast-night-minimal.json` (§12.2 Step 6, F29). The files are generated: never hand-edit them (F29: a re-run is byte-identical). Generator = research/maps.md §4.3 code with the §9.8 `C` palette (land `#0B1320`, roads `#1A2638/#24344D/#31445F`, water `#0F2236`, waterway `#1E4A63`, labels `#8A97AB/#A9B4C4/#5F87A3`, shields hidden), `ne2_shaded` raster dropped, every symbol `text-font` set to `["Noto Sans Regular"]`/`["Noto Sans Bold"]`/`["Noto Sans Italic"]`.
- Sources/glyphs/sprites stay on OpenFreeMap: tiles `https://tiles.openfreemap.org/planet`, glyphs `https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf`, sprite `https://tiles.openfreemap.org/sprites/ofm_f384/ofm` [verified]. No key, no request limits, no SLA.
- The app uses the **bundled object** at `mobile/assets/map/fordcast-night.json` (`mapStyle={require('@/assets/map/fordcast-night.json')}`), so the style itself never needs the network. The backend serves the same file at `GET /v1/styles/fordcast-night.json` (C §22.2, F25 Stretch); the app needs that URL only for offline packs (29.11).
- **FordCast labels never use map text** for essential info; the selected crossing's name label uses Noto Sans Bold (Inter renders nothing in map layers).
- **Attribution:** `attribution` ON at bottom-left 8 pt; the text "© OpenStreetMap contributors · OpenFreeMap © OpenMapTiles" also appears in About and on the video end card.

### 29.3 Map skeleton

```tsx
// mobile/src/features/map/MapSurface.maplibre.tsx (essentials)
import { Map, Camera, GeoJSONSource, Layer, Images, Marker, UserLocation } from '@maplibre/maplibre-react-native';
import NIGHT from '@/assets/map/fordcast-night.json';
import { SPRITES } from './sprites';                   // features/map/sprites.ts: SPRITES: Record<SpriteName, number>, one static
                                                       // require('@/assets/map/markers/<name>.png') per B §10.9 name (@2x/@3x by Metro)
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
        {p.gauges && <GaugeLayer gauges={p.gauges} onPress={p.onGaugePress} />}   {/* positions from ['gauges','static'] + snapshot gauges[] */}
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
- **Sprites:** exactly the ten canonical names of B §10.9 (`ic-norise`, `ic-watch`, `ic-avoid`, `ic-closed`, `ic-closed-official`, `ic-unknown`, `ic-unknown-lastwatch`, `ic-unknown-lastavoid`, `ic-unknown-lastclosed`, `ic-flow-arrow`), folder `mobile/assets/map/markers/` (@2x/@3x), generated by `make markers` (`tools/make_markers.py`), registered once through `features/map/sprites.ts`. `SpriteName` is that union, so a typo is a type error. There are no `-replay` variants.

**Creek feature properties** (`['creeks','static']` = bundled `assets/seed/creeks.geojson`, F86, C §17.14): one LineString per link, `{ reach_id: "<crossing_id>__<gauge_id>", crossing_id, gauge_id, relation }`, coordinates ordered gauge → crossing (asserted by a test in `make app-data`).
- **Live `activeReachIds`** (`selectors.ts`): the `reach_id`s whose crossing's **display** state is ≥ WATCH (WATCH/AVOID/CLOSED) **and** whose `gauge_id` equals the `gauge_id` of that crossing's first `UPSTREAM_ABOVE_TRIGGER`/`UPSTREAM_RISING` reason. A crossing that is UNKNOWN (incl. stale) or has no `UPSTREAM_*` reason lights no reach. Recomputed with the FeatureCollections (by `seq`).
- **Replay** uses the timeline's own `links[].flowline` and `pulses[]` (§33.5), not the bundled creeks.

**Layer stack, bottom → top** (creek layers inserted with `beforeId` = the first basemap label layer, e.g. `waterway_line_label` — VERIFY the id in the generated style):

| # | Layer id | Type | Source | Key paint/layout |
|---|---|---|---|---|
| 1 | `creeks-base` | line | `creeks` | `line-color rgba(43,217,217,0.50)`, width z10 1.5 → z15 3, round caps, no casing |
| 2 | `creeks-glow` | line | `creeks` (filter active) | cyan, width +7, `line-opacity 0.30`, `line-blur 6` |
| 3 | `creeks-active` (= the "rising creek" layer of B §11.4 A7) | line | `creeks` (filter `['in', ['get','reach_id'], ['literal', activeReachIds]]`) | `#2BD9D9` @1.0, width 3; `line-dasharray` from `dashFlow` |
| 4 | `wave-<reachId>` (≤ 3) | line | `wave-<reachId>` (`lineMetrics`) | `line-gradient` = `pulseGradient(p)`, width 6, `line-blur 1` |
| 5 | `flow-arrows` | symbol | `creeks` (active; reduced motion only) | `symbol-placement: 'line'`, `icon-image: 'ic-flow-arrow'`, `symbol-spacing: 120` |
| 6 | `avoid-area-fill` / `avoid-area-line` | fill / line | `avoid-areas` | `#FF5470` @0.14 / 1.5 pt dashed `#FF5470` |
| 7 | `route-casing` · `route-line` · `route-blocked` · `detour-casing` · `detour-line` | line | `route` | 29.6 |
| 8 | `gauges` | circle | `gauges` (bundled positions, `['gauges','static']`, joined with snapshot `gauges[]`) | 8 pt `#2BD9D9`, 2 pt `#0B1320` stroke; stale → `#7A879C` dashed ring 10 pt (§9.8) |
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
  Live: animate `p` 0 → 1 over 2.4 s (scaled by length, 1.6–4.0 s), ≤ 3 runs while the upstream gauge is rising, driven by `requestAnimationFrame` throttled to 30 fps (React state; paint can't read Reanimated shared values). Replay: `p = clamp((simT − tTrigger)/τ, 0, 1)` (§33.5; τ here is internal animation math only and is never displayed).
- **Reduced motion (B §11.4 A6; §3.5 rule 8):** no pulse and no dash flow. **Live:** static `flow-arrows` (`ic-flow-arrow`) on the active reaches and **no text on the creek** — the crossing's risk window stays in the card / `EtaRangePill`. **Replay:** the same static arrows + one caption `travel.range` "Water usually takes {{tau_lo}}–{{tau_hi}} min to get here" (a11y/TTS: `travel.range_spoken`), filled from the link's `tau_lo_min`/`tau_hi_min`; if the range is missing, no caption. Never a single-number travel time or a countdown — not in the label, its accessibility label or TTS.

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
- When a detour exists the baseline becomes `baseline-ghost` (35 %); `blocked` = baseline slice ±300 m around each AVOID/CLOSED crossing (`@turf/along` + `@turf/length`); the detour is full-opacity `#5AA9FF` with casing and a "Detour +{{n}} min" pill (`{{n}}` = the routed `detour_added_min`, §9.8, §22.5) in a `ViewAnnotation` at its midpoint (VERIFY position prop).
- Route line 6 pt + casing; creeks 3 pt without casing — the two are never confused (CVD rule §34.5).

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

- The map container is one `accessible` element (`accessibilityRole="image"`) whose label summarizes counts from `useAreaCounts()`, composed from the §3.7 keys (`area.nearby_count` per state; add any new connective wording to §3.7 first, EN + ES): "Map. 1 crossing Avoid, 2 Watch, 1 Unknown within 10 miles. Use the list for details." (§13.4) — updated only when counts change. With no risky crossing it states only the "No rise detected" count (§3.7 calm vocabulary), nothing more.
- The **List** is the accessible alternative (F34): a `MapControls` "List of crossings" button opens the sheet at 88 % with rows sorted by rank, then distance; when a screen reader is on (`A11yPrefs.screenReader`) or Settings `listFirst`, Map Home opens with the list expanded.
- Zoom ± buttons appear when a screen reader / Switch Control is on or Settings "Show zoom buttons" (gesture alternative, WCAG 2.5.1).
- Markers are not focusable; state changes are announced per §34.3, never by moving focus.

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
- 1,681 tiles at z8–14 (computed); size 30–80 MB is an **unverified estimate** — show the measured size after the first download. Wi-Fi only (`expo-network` type check) and explicit consent ("Download offline map (about {{mb}} MB)" — add the key to §3.7, EN + ES, when F87 starts).
- `styleUrl` = `${env.API_BASE}/v1/styles/fordcast-night.json` (C §22.2; the same file as the bundled `mobile/assets/map/fordcast-night.json`; F25 Stretch). Fallback [Inference — verify with the airplane test]: `https://tiles.openfreemap.org/styles/positron`, which references the same `openmaptiles` tiles and Noto glyphs, so the cached resources are shared.
- Claim "works offline" only after the 4-point airplane test passes on a real phone: (1) map renders; (2) crossings render with "Checked … ago" labels → UNKNOWN once check age > min(20 min, `stale_after_s`); (3) a geofence alert fires from cached risk; (4) Check My Drive says `routing.offline` and shows the last route.

### 29.12 Style/tile failure fallback

On a style or tile load failure event (VERIFY event name), swap `mapStyle` to `fordcast-night-minimal.json`; if that also fails, render `map.land` background + FordCast GeoJSON layers only, with a small banner `errors.map_details` "Map details unavailable" / "Detalles del mapa no disponibles" (§13.20). Crossings, creeks and the list never depend on tiles.

### 29.13 `MapSurface` adapter and the Expo Go fallback

**How Metro treats this file:** Metro resolves and bundles **every** `require()` it can statically see, in every build, including one inside a branch that never runs. A lazy `require()` only prevents **evaluation** (so MapLibre's native module is never touched in Expo Go); it does **not** prevent bundling. Therefore every file and package named in a `require()` here MUST exist in every build, and `try/catch` around a `require()` never helps (a missing module fails the bundle, not the call). Never wrap a `require()` in `try/catch`.

**Decision (default, recorded in `docs/decisions/step0.md`):** no Expo Go map fallback. `MapSurface.expogo.tsx` is **not created** and `react-native-maps` is **not installed**; in Expo Go the map area shows `MapSurface.unavailable`. The dev build (Day 1) is the primary target, so the fallback buys little. `check-pins.mjs` (§25.5) fails CI if exactly one of the two exists.

```tsx
// mobile/src/features/map/MapSurface.tsx — the ONLY map import used by screens (default: no Expo Go fallback)
import type { ComponentType } from 'react';
import { caps } from '@/lib/capabilities';
import type { MapSurfaceProps } from './types';
const Impl: ComponentType<MapSurfaceProps> = caps.maplibre
  ? require('./MapSurface.maplibre').default            // evaluated only in a dev/preview build (still bundled everywhere)
  : require('./MapSurface.unavailable').default;        // Expo Go: errors.map_details panel + the crossing List
export default function MapSurface(p: MapSurfaceProps) { return <Impl {...p} />; }
```
**Only if you keep the Expo Go fallback** (decide before the Day-1 build, because `react-native-maps` is native): run `npx expo install react-native-maps` in §25.4 batch 5 (SDK-bundled 1.27.2), create `MapSurface.expogo.tsx`, and change the second branch to `: require('./MapSurface.expogo').default;` — both packages are then installed and both files bundled in every build. If you later drop the fallback, delete `MapSurface.expogo.tsx`, that branch and the package in one commit. In Lane D (SDK 54, §26.9) the adapter requires only `MapSurface.expogo`.
- `types.ts`: `MapSurfaceProps = { mode: 'live'|'replay'|'drive'|'route'; crossings: FeatureCollection<Point, CrossingProps>; creeks; activeReachIds: string[]; pulses: {reachId: string; p: number}[]; pulseCandidates; gauges?; route?; avoidAreas?; selectedId?: string|null; insets; camera?: CameraTarget|null; interactive?: boolean; onCrossingPress(id); onClusterExpand?; onGaugePress?(id); onLongPress?(lngLat); accessibilityLabel: string }`.
- `MapSurface.expogo.tsx` (only with the fallback kept, above): `react-native-maps@1.27.2` from Expo `with-maps`; one `<Marker tracksViewChanges={false}>` per crossing with the same pre-colored PNG sprites; `<Polyline>` for route/creeks; Android `provider={PROVIDER_GOOGLE}` + `customMapStyle` night JSON (no key needed in Expo Go); iOS `userInterfaceStyle="dark"` + `mapType="mutedStandard"`. No clustering: render rank ≥ 1 always and NO_RISE only at high zoom. Labeled in the dev banner "Expo Go preview map".
- `MapSurface.unavailable.tsx`: `map.land`-colored panel with the `errors.map_details` banner "Map details unavailable" / "Detalles del mapa no disponibles" (§13.20) above the full crossing List (same rows, chips and ages as the sheet; never a calm placeholder) — used whenever MapLibre isn't available (Expo Go by default).
- Do **not** select the implementation with `Constants.executionEnvironment === 'storeClient'` (also true in dev clients); use `isRunningInExpoGo()`.

### 29.14 Switching to `@rnmapbox/maps@10.3.8` (runner-up)

Only if the human already has a Mapbox account with a card and prefers Mapbox Standard's lighting. Cost ≈ 1 day and a new dev build (stop-and-ask: native change). Mapping: `Map`→`Mapbox.MapView`, `GeoJSONSource`→`ShapeSource`, `Layer type=`→rnmapbox's per-type layer components (`CircleLayer`/`SymbolLayer`/`LineLayer` — rnmapbox names only; MapLibre v11 code never uses them, 29.1) with camelCase `style`; basemap `styleURL="mapbox://styles/mapbox/standard"` + `<Mapbox.StyleImport id="basemap" existing config={{ lightPreset: 'night', theme: 'faded', show3dObjects: false, showPointOfInterestLabels: false, colorWater: '#0F2236' }} />` (keys verified in 10.3.8); custom layers under Standard night need `*-emissive-strength: 1`. Public token `pk.*` goes in `EXPO_PUBLIC_MAPBOX_TOKEN` (public by design). Everything else in §29 (layer order, maxRank clusters, pulses, a11y) stays.

**Done when (§29):** on the Android dev build: FordCast Night (from `make style`) renders with Noto labels and attribution; all 5 states + official + the three last-known sprites render, and `sprites.ts` holds exactly the ten B §10.9 names; a cluster containing an AVOID is red; tapping a crossing opens its sheet with the map still interactive; gauge dots draw from the bundled `gauges.geojson`; the creek pulse runs gauge → crossing on the reaches in `activeReachIds` and stops after 3 runs; Reduce Motion shows arrows and no loops, and no screen, label or a11y string shows a single-number travel time; a style failure falls back to the minimal style; with TalkBack on, Map Home opens on the List and every crossing's status is reachable; `npx expo export` bundles cleanly with the default adapter (no `MapSurface.expogo.tsx`, no `react-native-maps`) — or with both present if the fallback was kept.

---
