# 02 · iOS build path: Mac, Xcode, free Personal Team, Release builds (§8–§11)

> **FordCast Demo Edition.** This file covers how the app gets onto one real iPhone with a **free Apple Account ("Personal Team")**, with no paid Apple Developer Program, no EAS cloud build and no TestFlight. It also covers how to keep the app working until the video is recorded.
>
> - **Roles.** Steps marked 🧑 are done by the **student**, with hands on the Mac and the iPhone. Steps marked 🤖 are done by the **coding agent**, which writes files and runs terminal commands.
> - **If a step fails,** stop and use §11.6 Troubleshooting. Don't improvise.
> - **Checked on:** 2026-10-15/16, against the npm registry, the package sources (`npm pack`), Apple's developer docs and a local `expo prebuild` test.

**Evidence tags used in this file**

| Tag | Meaning |
|---|---|
| `[Verified: source]` | Read in a primary source: Apple docs, npm package source, or a GitHub issue. |
| `[Verified: local test]` | Ran `npx expo prebuild -p ios` on 2026-10-15 and inspected the output. |
| `[Secondary]` | Forum, blog or third-party report. Probably right. |
| `[Unverified]` | Inference or general knowledge. Check it on your Mac or iPhone. |
| `VERIFY BEFORE USE:` | Required check. Do it, then record the result in `docs/decisions/verifications.md`. |

**Before you start, pick your path.** It depends on the iPhone's iOS version. Find it in Settings → General → About → iOS Version.

| iPhone runs | Xcode | Mac needs | Extra app config | Path name |
|---|---|---|---|---|
| **iOS 26.x** | **26.6** (26.4.1 or 26.5 also OK) | macOS **Tahoe 26.2** or newer | none (scene support optional) | **Path A** (simplest) |
| **iOS 27.x** | **27.1** | macOS **Tahoe 26.6** or newer | `enableSceneSupport: true` (required) | **Path B** |
| iOS 16 or older | — | — | — | Update the phone to iOS 26 or 27 first. SDK 57 needs iOS 16.4+, and Xcode 27 debugs only iOS 17+. |
| Mac can't run macOS Tahoe | — | — | — | Use another Mac: school, library, a friend's. SDK 57 can't be built on that Mac, and EAS device builds need a **paid** account, so they don't help. |

[Verified: developer.apple.com/xcode/system-requirements; expo/expo#46664; react/react-native#58555]

**Iron rule:** on Path A, **do not update the iPhone to iOS 27** until the video is done (Settings → General → Software Update → Automatic Updates → off).

---

## §8. Mac, Xcode and iPhone setup with a free Personal Team

### 8.1 What you need (🧑 checklist)

| Item | Requirement | Check |
|---|---|---|
| Mac | macOS Tahoe 26.2+ (Path A) or 26.6+ (Path B) | Apple menu → About This Mac |
| Free disk | **≥ 60 GB** for Xcode, the iOS platform, DerivedData and node_modules [Unverified estimate] | Apple menu → System Settings → General → Storage |
| iPhone | iOS 26.x or 27.x, with a passcode set | Settings → General → About |
| Cable | USB-C (iPhone 15 and later) or Lightning (older), a **data** cable, not charge-only | Plugging it in shows "Trust This Computer?" |
| Apple Account | Any free Apple Account. If Xcode refuses your account (child account), sign in with a **parent's** Apple Account instead. [Secondary: Apple forums 128800, 704235] | Step 8.7 |
| Network | Wi-Fi that can reach **github.com**. The first build downloads MapLibre through Swift Package Manager. [Verified: MapLibreReactNative.podspec] | Open github.com in Safari |
| Time | About 3 hours the first time, mostly downloads | — |

### 8.2 Free Personal Team limits (know them before you click anything)

| Limit | Value | What it means for us | Evidence |
|---|---|---|---|
| App lifetime on the phone | **7 days** from when the provisioning profile was issued | After that the app won't open. Plug in and rebuild (5 min, §11.4). | [Verified: Apple "Choosing a Membership"] |
| App IDs (bundle IDs) | **10 per rolling 7 days** | **Pick ONE bundle ID and never change it.** Never create test projects with new IDs. | [Verified: Apple] |
| Devices | 3 | One iPhone is plenty. | [Verified: Apple] |
| Free-signed apps per device | **3** (offloaded apps reportedly count) | Delete other dev-signed apps if you hit it. | [Verified: Apple; offload detail Secondary] |
| Distribution | None (no TestFlight, App Store or ad hoc) | Judges see the **video**, not an install. | [Verified: Apple] |
| Push Notifications, iCloud | **Not available** | We use **local** notifications only (§10). | [Verified: Apple DTS, forum 811929] |

### 8.3 Step 1 · Check the iPhone (🧑, 2 min)

1. Settings → General → About → **iOS Version**. Write it down and pick Path A or B from the table at the top.
2. Path A only: Settings → General → Software Update → **Automatic Updates → off** (both toggles).
3. Settings → Face ID & Passcode: make sure a passcode exists. Developer Mode needs it.

**You should see:** an iOS version that starts with 26 or 27.

### 8.4 Step 2 · Check the Mac (🧑, 2 min)

1. Apple menu → About This Mac → macOS version. You need **Tahoe 26.2+** (Path A) or **26.6+** (Path B).
2. If it's older but the Mac can upgrade, go to System Settings → General → Software Update and update first (allow about 1 hour).

**You should see:** "macOS Tahoe 26.x" with x high enough for your path.

### 8.5 Step 3 · Install Xcode (🧑, 30–90 min of downloading)

1. Install Xcode:
   - **Path A:** install Xcode **26.6** from the Mac App Store if that's what it offers. Otherwise get exactly 26.6 from developer.apple.com/download/all (sign in with your Apple Account).
   - **Path B:** install Xcode **27.1** from the Mac App Store.
2. Launch Xcode once and accept the license. When it asks which platforms to install, choose **iOS**. If you skip that dialog, the run-destination menu later shows **Get** next to "Any iOS Device"; click it. [Verified: Apple "Running your app in Simulator or on a device"]
3. In Terminal:
   ```bash
   sudo xcode-select -s /Applications/Xcode.app      # if you renamed it (e.g. Xcode-26.6.app), use that path
   xcodebuild -runFirstLaunch
   xcodebuild -version                               # write down the output
   ```

**You should see:** `Xcode 26.6` (or 26.4.1 / 26.5) on Path A, or `Xcode 27.1` on Path B.

### 8.6 Step 4 · Install the JavaScript and native tools (🧑 + 🤖, 15 min)

```bash
# Homebrew (skip if `brew -v` already works): follow https://brew.sh (one pasted command)
brew install node@22 cocoapods git
node -v      # MUST print v22.13.0 or newer (v22.x LTS). If it prints v20 or older: brew link --overwrite node@22
pod --version
git --version
```

- Node ≥ 22.13 is required by Expo SDK 57. [Verified: master prompt D §25.4; SDK 57 registry]
- CocoaPods: Expo CLI can install it automatically, but installing it yourself is more predictable. [Verified: @expo/package-manager source]
- **Never use `sudo npm`.**

**You should see:** three version numbers and no errors.

### 8.7 Step 5 · Sign Xcode in to your Apple Account (🧑, 3 min)

1. Open the Accounts settings:
   - **Path B (Xcode 27):** Xcode → Settings → **Apple Accounts**.
   - **Path A (Xcode 26):** Xcode → Settings → **Accounts**.
2. Click **+**, choose **Apple Account**, and sign in.
3. Select the account. A team called **"Your Name (Personal Team)"** appears. [Verified: Apple docs]

**You should see:** "(Personal Team)" listed under your account. If sign-in is refused, use a parent's Apple Account (§8.1).

### 8.8 Step 6 · Pair the iPhone and turn on Developer Mode (🧑, 10 min)

1. Plug the iPhone into the Mac and unlock it. Tap **Trust This Computer** and enter the passcode.
2. Open the device window and pair the phone:
   - **Path B:** Xcode → Open Developer Tool → **Device Hub** (or "Manage Devices…" in the run-destination menu). Select the iPhone and click **Pair** if it's shown.
   - **Path A:** Window → **Devices and Simulators**.

   Wait until "Preparing device for development" finishes, which can take several minutes. [Verified: Apple Device Hub doc]
3. On the iPhone: Settings → **Privacy & Security** → scroll down to **Developer Mode** → **On** → **Restart**. After the restart, unlock, tap **Turn On**, and enter the passcode. [Verified: Apple "Enabling Developer Mode on a device"]
   - The toggle only appears **after step 2 has started**. If it's missing, restart the phone and repeat step 2. [Secondary]
4. **Optional:** Path B with iOS 27 can later run over Wi-Fi. **Use the cable anyway for recording**, because QuickTime capture needs it (§30).

**You should see:** the iPhone listed as ready in Device Hub / Devices and Simulators, with no yellow warning.

**Done when (§8):**
- `xcodebuild -version` prints the Xcode for your path.
- `node -v` prints ≥ v22.13 and `pod --version` prints a version.
- Xcode shows "(Personal Team)".
- The iPhone shows as paired, and Developer Mode is on.
- Path and versions are written in `docs/decisions/verifications.md`.

---

## §9. Expo SDK 57 project, prebuild, signing and entitlements cleanup

### 9.1 Rules for the agent (🤖 MUST)

1. **Stay on SDK 57.** `expo@latest` is now **58.0.x** (58.0.14 at the last check on 2026-10-16; it moves almost daily); the `sdk-57` dist-tag is **57.0.30**. [Verified: npm view expo dist-tags, 2026-10-16]
   - Scaffold only with `--template default@sdk-57`.
   - Add native modules only with `npx expo install` (it resolves SDK-57 versions).
   - Never run `npm install expo@latest`. Never upgrade to SDK 58 before the deadline.
2. **One bundle ID forever:** `com.<lastname><year>.fordcast`, lowercase, for example `com.garcia2026.fordcast`. Ask the student for the last name on Day 1. Use the final ID **for the very first build**, including the smoke test.
3. **Continuous Native Generation (CNG).**
   - `ios/` is generated and git-ignored (the SDK 57 template already lists `/ios` and `/android` in `.gitignore` [Verified: expo-template-default@57.0.32]).
   - Never hand-edit `ios/`, Info.plist, entitlements or Xcode capabilities. Every native change goes into `app.config.ts` or a config plugin, followed by `npx expo prebuild -p ios --clean`.
   - SDK 57 `prebuild` deletes and recreates `ios/` by default. [Verified: @expo/cli@57.0.31 `prebuild/index.js`]
4. **iOS only.** Don't generate or configure Android: always pass `-p ios`. Delete the Android-only keys the template ships (`android` block, `predictiveBackGestureEnabled`, adaptive icons).
5. **Never call** `getExpoPushTokenAsync` or `getDevicePushTokenAsync`. Without the push entitlement they fail, and the demo doesn't need them.
6. **Every native module must be in the first build** (§9.3). Adding one later means a new prebuild plus rebuild (≈ 10 min). That's allowed, but each time re-run the §9.7 checks.

### 9.2 Scaffold (🤖, in the repo root `/home/user/Fordcast-CAC` or the student's clone)

```bash
npx create-expo-app@latest mobile --template default@sdk-57     # template expo-template-default@57.0.32 (sdk-57 tag)
cd mobile
[ -d .git ] && rm -rf .git                                       # never a nested repo inside the monorepo
echo y | npm run reset-project                                   # answers its "(Y/n)" prompt: Y = move starter src/ + scripts/ to example/
                                                                 # (git-ignored by the template); a bare run waits for input
```

[Verified: expo-template-default@57.0.32 `scripts/reset-project.js` uses `readline` `rl.question(... (Y/n))`]

After the reset (re-checked 2026-10-16 against the unpacked template):
- `src/app/` holds only a placeholder `index.tsx` and a plain `<Stack />` `_layout.tsx`, so the Day-1 `smoke.tsx` (§9.10) is reachable before the real shell exists.
- The starter (NativeTabs `app-tabs.tsx`, `animated-icon.tsx`, theme files) now lives in `mobile/example/`, which the template's `.gitignore` already ignores. It stays as **reading reference** for 04 §16.2/§16.4/§20.1 and is deleted at the end of Day 2.
- **Until it is deleted, exclude it from tooling:** the template's `tsconfig.json` includes `**/*.ts(x)`, so add `"exclude": ["node_modules", "example"]` (otherwise `tsc` fails on the moved files' `@/` imports), and add `example/` to the ESLint ignores.
- `assets/` is untouched by the reset; 04 §16.2 Step 1 removes the unused template images.

What the template already contains [Verified: expo-template-default@57.0.32 package.json]:
- expo ~57.0.30, react 19.2.3, react-native 0.86.3
- expo-router ~57.0.28, react-native-screens ~4.26.0, reanimated 4.5.1, worklets 0.10.1, gesture-handler ~2.32.0
- @expo/ui ~57.0.25, expo-glass-effect ~57.0.4, expo-symbols ~57.0.3, expo-image, expo-font, expo-splash-screen, expo-system-ui, expo-status-bar, expo-constants ~57.0.22 (reads `extra.builtAt`, §24.6), expo-linking
- TypeScript ~6.0.3, with the tsconfig alias `@/*` → `./src/*`
- An `assets/expo.icon` Icon Composer file

### 9.3 The only native install list (🤖, run once, in order)

This is the **single** list of native modules for the Demo Edition. Sections 12–28 may add **pure-JS** packages only, each with an exact version. Versions are those `npx expo install` resolves from `expo@57.0.30/bundledNativeModules.json`. [Verified: bundledNativeModules.json]

```bash
# A) platform, look, feedback (template already has router, screens, reanimated, worklets, gesture-handler,
#    @expo/ui, expo-glass-effect, expo-symbols, expo-image, expo-font, expo-splash-screen, expo-system-ui)
npx expo install expo-haptics expo-blur expo-linear-gradient expo-build-properties expo-localization \
  expo-keep-awake expo-sqlite react-native-svg @shopify/react-native-skia @shopify/flash-list \
  @expo-google-fonts/inter
#   → expo-haptics ~57.0.3 · expo-blur ~57.0.3 · expo-linear-gradient ~57.0.2 · expo-build-properties ~57.0.22
#     expo-localization ~57.0.2 · expo-keep-awake ~57.0.2 · expo-sqlite ~57.0.4 (settings via expo-sqlite/kv-store)
#     react-native-svg 15.15.4 · @shopify/react-native-skia 2.6.2 · @shopify/flash-list 2.0.2 · @expo-google-fonts/inter 0.4.2

# B) map, location, alerts, voice
npx expo install expo-location expo-notifications expo-speech expo-audio
npm install --save-exact @maplibre/maplibre-react-native@11.5.0     # not in bundledNativeModules → exact pin
#   → expo-location ~57.0.21 · expo-notifications ~57.0.23 · expo-speech ~57.0.3 · expo-audio ~57.0.5 (never expo-av)

# C) styling layer (NativeWind v4 + React Native Reusables runtime; §16 owns the RNR copy-in)
npx expo install nativewind tailwindcss-animate class-variance-authority clsx tailwind-merge \
  @rn-primitives/portal@~1.4.0 @rn-primitives/slot
npm install --save-dev tailwindcss@^3.4.19
grep -E '"(nativewind|tailwindcss)"' package.json    # MUST show nativewind ^4.2.7 and tailwindcss ^3.4.19

# D) pure JS at exact versions (state, i18n, geometry)
npm install --save-exact zustand@5.0.15 i18next@26.4.4 react-i18next@17.0.16 intl-pluralrules@2.0.1 \
  @turf/helpers@7.4.0 @turf/along@7.4.0 @turf/length@7.4.0 @turf/nearest-point-on-line@7.4.0 @turf/bbox@7.4.0

# E) tests and lint
npx expo install jest-expo jest @types/jest @testing-library/react-native --dev
npm install --save-dev jest@^29.7.0 @types/jest@^29.5.14   # jest-expo ~57.0.6 is Jest-29 based
npm install --save-dev --save-exact @react-native/jest-preset@0.86.3   # REQUIRED peer of jest-expo 57 (§28.1)
npx expo lint

# F) health (after every batch)
npx expo install --check && npx expo-doctor@latest
```

**Without `@react-native/jest-preset`**, `npx jest` stops with: "The React Native Jest preset that jest-expo relies on has moved to a separate package." [Verified: ran 2026-10-16; jest-expo@57.0.6 peerDependencies `@react-native/jest-preset ^0.86.3`]

**Deliberately NOT installed:**

| Package | Why not |
|---|---|
| expo-dev-client, expo-updates, EAS | No cloud builds, no OTA updates. |
| @supabase/supabase-js, @tanstack/react-query | No backend. |
| @gorhom/bottom-sheet | Native formSheets instead (§16). |
| expo-widgets | Live Activities are [NEXT] unless the §10.3 spike passes. |
| expo-task-manager, background location | Not needed in the demo. |
| react-native-maps | MapLibre only. |
| @sentry/react-native | Not needed for the demo. |

### 9.4 `mobile/app.config.ts` (🤖, complete; replaces the template's `app.json`)

Delete `mobile/app.json` after creating this file. Expo reads `app.config.ts` when it exists. [Verified: Expo config resolution; master D §27.3 uses the same file]

```ts
// mobile/app.config.ts — FordCast Demo Edition (iOS only, free Personal Team)
import type { ConfigContext, ExpoConfig } from 'expo/config';

// Path B (Xcode 27 + iOS 27) needs UIScene support; Path A (Xcode 26) may leave it off. Set once from §8.3.
const XCODE_27 = process.env.FORDCAST_XCODE27 !== '0';            // default ON (safe on both paths after the smoke test)
const INTER = ['400Regular', '500Medium', '600SemiBold', '700Bold']
  .map((w) => `node_modules/@expo-google-fonts/inter/${w}/Inter_${w}.ttf`);   // [Verified: @expo-google-fonts/inter@0.4.2 layout]

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'FordCast',
  slug: 'fordcast',
  scheme: 'fordcast',                                   // fordcast://crossing/<id> (notification taps)
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',                           // night-first, dark only
  backgroundColor: '#0E1726',
  icon: './assets/images/icon.png',
  ios: {
    bundleIdentifier: 'com.yourlastname2026.fordcast',  // §9.1 rule 2 — REPLACE ONCE on Day 1, then never change
    supportsTablet: false,
    icon: './assets/expo.icon',                         // template's Icon Composer file (§14 replaces its layers)
    infoPlist: {
      LSApplicationQueriesSchemes: ['comgooglemaps', 'waze'],   // "Show detour in…" menu checks (Info.plist only)
      CFBundleAllowMixedLocalizations: true,
    },
    // appleTeamId: 'XXXXXXXXXX',                       // optional (§9.8): leave commented unless signing asks for it
  },
  locales: { es: './locales/app.es.json' },            // Spanish system permission text (§9.6)
  plugins: [
    './plugins/withFreeTeamSigning',                    // MUST stay FIRST (§9.5) — strips aps-environment etc.
    'expo-router',
    ['expo-splash-screen', { backgroundColor: '#0E1726', image: './assets/images/splash-icon.png', imageWidth: 76 }],
    ['expo-font', { fonts: INTER }],
    '@maplibre/maplibre-react-native',                  // REQUIRED: injects $MLRN.post_install into the Podfile
    ['expo-build-properties', { ios: { enableSceneSupport: XCODE_27 } }],
    ['expo-location', {
      locationWhenInUsePermission:
        'FordCast uses your location to show crossings near you and on your route. Your location stays on your phone.',
    }],
    ['expo-localization', { supportedLocales: { ios: ['en', 'es'] } }],
    // expo-notifications is NOT listed: prebuild auto-applies it anyway (§9.5). If you ever list it, put it AFTER
    // the signing plugin. Never add `sounds`, never add 'expo-widgets' unless §10.3's spike passed.
  ],
  experiments: { typedRoutes: true, reactCompiler: false },   // React Compiler OFF (template default is true)
  extra: { builtAt: new Date().toISOString() },         // Director status line "built … · rebuild by …" (§24.6); read via expo-constants
});
```

Notes:
- Plugin option names checked in the package sources:
  - `expo-localization` `supportedLocales: string[] | { ios?, android? }`
  - `expo-font` `fonts: string[]`
  - `expo-build-properties` `ios.enableSceneSupport`, `ios.usePrecompiledModules`, `buildReactNativeFromSource`

  [Verified: expo-localization@57.0.2, expo-font@57.0.4, expo-build-properties@57.0.22 `.d.ts`]
- `enableSceneSupport` needs expo ≥ 57.0.23 and expo-build-properties ≥ 57.0.20, which we have. It supports only the standard SDK 57 Swift AppDelegate, so **never add a plugin that edits the AppDelegate**. [Verified: expo/expo#46664; expo-build-properties@57.0.22 `iosSceneSupport.js`; local test: prebuild writes `UIApplicationSceneManifest`]
- On Path A you may run `FORDCAST_XCODE27=0 npx expo prebuild -p ios --clean` if the smoke test (§9.10) shows any scene problem. Otherwise leave it on.
- The location string is used only by the optional "Use my real location" toggle. The demo itself uses a scripted position (§25), so no permission prompt appears in video takes.

### 9.5 `mobile/plugins/withFreeTeamSigning.js` (🤖, complete) [Verified: local prebuild test]

**Why this plugin is needed:**
- A free Personal Team **cannot sign the Push Notifications capability**.
- `expo-notifications` writes `aps-environment` into the entitlements on **every** prebuild, **even when it isn't in `plugins`**. `@expo/prebuild-config` auto-applies it whenever the module is installed, and there's no option to turn it off. [Verified: expo-notifications@57.0.23 plugin; @expo/prebuild-config@57.0.19 `withVersionedExpoSDKPlugins`; local test case A]

**Why it must be listed first:**
- Config-plugin mods run in **reverse registration order**. The first-listed plugin's entitlement edit therefore runs **last**, after expo-notifications added the key. [Verified: @expo/config-plugins@57.0.10 `withMod`]

**The pod deployment-target floor:**
- Xcode 27 makes "deployment target below 15.0" a **hard error**, including for CocoaPods resource-bundle targets that RN 0.86.3 doesn't raise. Examples: `RNSVG-RNSVGFilters` (12.4) and any `*_resources` bundle. [Verified: react/react-native#58555; react-native@0.86.3 `scripts/cocoapods/utils.rb`]
- The floor is harmless on Xcode 26.

```js
// mobile/plugins/withFreeTeamSigning.js
// FordCast Demo Edition: make the iOS project signable by a FREE Apple ID "Personal Team".
// MUST be listed FIRST in app.config.ts "plugins": entitlement mods run in reverse registration order,
// so the first-registered plugin's entitlements action runs LAST (after expo-notifications etc.).
const { withEntitlementsPlist, withPodfile, CodeGenerator } = require('expo/config-plugins');

// Entitlements a free Personal Team cannot (or should not try to) sign.
const STRIP_KEYS = [
  'aps-environment', // Push Notifications: auto-added by expo-notifications (and expo-widgets)
  'com.apple.developer.usernotifications.time-sensitive',
  'com.apple.developer.usernotifications.critical-alerts',
  'com.apple.developer.associated-domains',
  'com.apple.developer.applesignin',
  'com.apple.developer.icloud-container-identifiers',
  'com.apple.developer.icloud-services',
  'com.apple.developer.ubiquity-kvstore-identifier',
];

const withStripPaidEntitlements = (config) =>
  withEntitlementsPlist(config, (cfg) => {
    for (const key of STRIP_KEYS) delete cfg.modResults[key];
    return cfg;
  });

// Xcode 27 rejects pod targets (incl. CocoaPods *resource bundle* targets such as RNSVG-RNSVGFilters)
// whose deployment target is below 15.0. RN 0.86.3 only raises main pod targets, so floor them all.
const withPodDeploymentTargetFloor = (config, floor) =>
  withPodfile(config, (cfg) => {
    const res = CodeGenerator.mergeContents({
      tag: 'fordcast-pod-deployment-target-floor',
      src: cfg.modResults.contents,
      newSrc: [
        '    installer.pods_project.targets.each do |t|',
        '      t.build_configurations.each do |c|',
        "        dt = c.build_settings['IPHONEOS_DEPLOYMENT_TARGET']",
        `        c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${floor}' if dt.nil? || dt.to_f < ${floor}`,
        '      end',
        '    end',
      ].join('\n'),
      anchor: /post_install do \|installer\|/,
      offset: 1,
      comment: '#',
    });
    cfg.modResults.contents = res.contents;
    return cfg;
  });

module.exports = function withFreeTeamSigning(config, props = {}) {
  config = withPodDeploymentTargetFloor(config, props.podDeploymentTargetFloor ?? '16.4');
  config = withStripPaidEntitlements(config);
  return config;
};
```

**Local test matrix behind this design** (expo 57.0.30, expo-notifications 57.0.23, expo-build-properties 57.0.22, expo-location 57.0.21, MapLibre RN 11.5.0, react-native-svg 15.15.4; `expo prebuild -p ios --no-install --clean`) [Verified: local test]:

| Case | `plugins` order | `aps-environment` in `FordCast.entitlements` |
|---|---|---|
| A | no custom plugin, expo-notifications not listed | **present** (auto-applied) ✗ |
| B | `expo-notifications`, then the custom plugin | **present** ✗ |
| C | custom plugin listed **last** | **present** ✗ |
| D | custom plugin **first**, expo-notifications not listed | **absent** ✓ (our config) |
| E | custom plugin **first**, then `["expo-notifications", {...}]` | **absent** ✓ |

`expo-audio` is **not** auto-applied, so it adds no microphone string or background mode unless listed. Don't list it. [Verified: @expo/prebuild-config@57.0.19 auto-plugin lists; expo-audio@57.0.5 plugin]

### 9.6 `mobile/locales/app.es.json` (🤖)

```json
{
  "ios": {
    "CFBundleDisplayName": "FordCast",
    "NSLocationWhenInUseUsageDescription": "FordCast usa su ubicación para mostrar los cruces cerca de usted y en su ruta. Su ubicación se queda en su teléfono."
  }
}
```

- VERIFY BEFORE USE: after prebuild, `cat ios/FordCast/Supporting/es.lproj/InfoPlist.strings`, or `find ios -name InfoPlist.strings`. If the nested `ios` shape didn't apply, flatten the object (master D §27.4).
- Add the string to `es-pending-review.json` for native-speaker review (§27).

### 9.7 Prebuild and the 10-second verification (🤖, after EVERY prebuild)

```bash
cd mobile
npx expo prebuild -p ios --clean          # regenerates ios/ and runs pod install (first MapLibre SPM fetch needs github.com)

grep -c aps-environment ios/*/*.entitlements                      # MUST print 0 for every file
grep -n "fordcast-pod-deployment-target-floor" ios/Podfile         # MUST match (floor block present)
grep -n "MLRN.post_install" ios/Podfile                            # MUST match (MapLibre hook present)
/usr/libexec/PlistBuddy -c "Print :UIApplicationSceneManifest" ios/FordCast/Info.plist   # Path B: MUST print a dict
/usr/libexec/PlistBuddy -c "Print :CFBundleURLTypes" ios/FordCast/Info.plist | grep -c fordcast   # MUST be ≥ 1
echo "export NODE_BINARY=$(command -v node)" > ios/.xcode.env.local    # lets Xcode find node (nvm/brew) for Release bundling
```

If any check fails, **stop** and use §11.6. Never fix it by editing `ios/` by hand.

In the generated Podfile, `post_install` contains, in this order: our floor block, then `$MLRN.post_install(installer)`, then `react_native_post_install(...)`. [Verified: local test]

### 9.8 First signing in Xcode (🧑, 5 min, once per Mac)

1. `open ios/FordCast.xcworkspace`. Open the **.xcworkspace**, never the .xcodeproj.
2. In the left sidebar, click the blue **FordCast** project → under TARGETS click **FordCast** → **Signing & Capabilities** tab.
3. Turn on **Automatically manage signing**.
4. **Team** = "Your Name (Personal Team)".
5. **Bundle Identifier** must show your §9.1 ID. If Xcode shows **Register** or **Try Again**, click it.
6. Look at the capability list. It must **not** contain "Push Notifications". If it does, the plugin order is wrong (§9.5). Fix `app.config.ts` and prebuild again; don't delete the capability by hand.
7. Xcode now creates your "Apple Development" certificate and a 7-day "iOS Team Provisioning Profile". [Verified: Apple "Set up code signing for physical devices"]

**You should see:** "Signing Certificate: Apple Development: <your email>" and no red error text.

**`appleTeamId` (optional):**
- If you leave it unset, `npx expo run:ios --device` picks your "Apple Development" identity from the keychain and writes the team for you. [Verified: @expo/cli `configureCodeSigning.js`]
- If signing ever complains about the team, read the 10-character ID with:
  ```bash
  security find-certificate -c "Apple Development" -p | openssl x509 -noout -subject   # the OU= value
  ```
  Then set `ios.appleTeamId` to that value and prebuild again. [Verified: @expo/cli `Security.js` reads the cert OU]

### 9.9 First run on the iPhone (Debug) (🧑 + 🤖, 15–30 min the first time)

```bash
npx expo run:ios --device          # choose your iPhone from the list; builds Debug and starts Metro
```

Or press ⌘R in Xcode with the iPhone selected as the run destination.

| What happens | What to do |
|---|---|
| macOS asks for keychain access for `codesign` | Enter the **Mac** password and choose **Always Allow**. [Unverified wording] |
| iPhone says **"Untrusted Developer"** | iPhone → Settings → General → **VPN & Device Management** → Developer App → "Apple Development: <you>" → **Trust**. The phone needs internet for this. Then tap the app again. [Secondary: Apple forums 732495, 685271] |
| App asks to find devices on your **Local Network** | Tap **Allow**. Debug builds load JS from Metro on the Mac. Keep the Mac and iPhone on the same Wi-Fi. |
| "Could not connect to development server" | Same Wi-Fi + Allow Local Network. Or skip Metro entirely with a Release build (§11.2). |

**You should see:** the FordCast app open on the phone.

**Daily development loop:**
- **JS-only changes:** keep `npx expo start` running. Changes appear on the phone with Fast Refresh.
- **Changes to `app.config.ts`, plugins or a native module:** run `npx expo prebuild -p ios --clean`, then the §9.7 checks, then `npx expo run:ios --device`.

### 9.10 Day-1 smoke test: the go/no-go gate (🤖 builds, 🧑 checks; ≤ 2 h; Day 1, **gate deadline end of Fri Oct 16**, §6)

**Purpose:** prove the whole risky chain before any UI work. That chain is:

> free signing → MapLibre → local notification on the Lock Screen → speech audible → Release build launches unplugged

1. 🤖 Create a temporary screen `mobile/src/app/smoke.tsx`, and make the reset's placeholder `src/app/index.tsx` a `<Redirect href="/smoke" />` so the app opens on it. Day 2's real shell (04 §16.4) replaces the placeholder; delete `smoke.tsx` before the UI freeze.
2. The screen has five buttons:
   1. **Map:** `import { Map as MapLibreMap, Camera } from '@maplibre/maplibre-react-native'` (alias it: a bare `Map` import shadows the JS `Map` class) → `<MapLibreMap style={{ flex: 1 }} mapStyle="https://tiles.openfreemap.org/styles/dark"><Camera initialViewState={{ center: [-97.79, 30.22], zoom: 11 }} /></MapLibreMap>` (Austin). [Verified: @maplibre/maplibre-react-native@11.5.0 `Map.d.ts` `mapStyle`, `Camera.d.ts` `initialViewState`] The final "FordCast Night" style comes later (§13).
   2. **Notify in 8 s:** schedule a local notification with `trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 8 }`. Title "Smoke test", subtitle "Simulated storm · demo data".
   3. **Speak EN / Speak ES:** `Speech.speak('Avoid Williamson Creek at Jones Road. Flooding likely soon. Take another route.', { language: 'en-US', useApplicationAudioSession: true })` after `setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' })`. Plus the Spanish line from §25.
   4. **Haptic:** `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)`.
   5. **Skia:** one animated Skia circle.
3. 🧑 Run the checks below, first in Debug (§9.9), then in Release (§11.2) **unplugged**.

| # | Check | Pass | If it fails |
|---|---|---|---|
| S1 | Build signs and installs with the final bundle ID | App opens | §11.6 rows 1–6 |
| S2 | Map shows dark tiles, pans smoothly | Tiles visible within 3 s on Wi-Fi | §11.6 MapLibre row; check github.com/SPM |
| S3 | Tap "Notify in 8 s", lock the phone | Banner on the **Lock Screen** with title + subtitle; tapping it opens the app | Check Settings → Notifications → FordCast → Allow; §10.2 |
| S4 | Speech with the Ring/Silent switch **off** (sound on), then **on** | Audible both times (record the result for the Silent-on case) | Silent on silent? Record in `verifications.md`; the recording rule is "Silent mode off" anyway (§30) |
| S5 | Haptic | Felt | Settings → Sounds & Haptics → System Haptics on |
| S6 | Skia circle animates at full speed in Release | Smooth | Note it; Release is the reference (§11.1) |
| S7 | Path B only: no launch crash ("UIScene life cycle is required") | Opens | `enableSceneSupport` (§9.4) |
| S8 | Release build opens with the cable unplugged and Wi-Fi off (after one online launch) | Opens; map shows cached tiles or the style background | §11.6 Release rows |

**Gate:**
- **All of S1–S3 and S8 must pass before any UI work starts** (A-level risk).
- S4–S7 can be fixed in parallel.
- Record date, Xcode version, iOS version and each result in `docs/decisions/verifications.md`.

**Done when (§9):**
- `npx expo install --check` is clean.
- The §9.7 checks print the expected values.
- The smoke test S1–S8 is recorded, with S1–S3 and S8 passing.
- `app.config.ts` holds the final bundle ID.
- No file under `ios/` was edited by hand: `git status` shows nothing under `ios/` because it's ignored.

---

## §10. Capability matrix (free Personal Team)

### 10.1 Feature → does it work with a free team? → Demo Edition approach

| Feature | What iOS needs | Free Personal Team | Evidence | Demo Edition approach |
|---|---|---|---|---|
| Install + run on your iPhone | Apple Development cert + team profile | **Yes**, 7-day profile, 3 apps/device | [Verified: Apple] | One bundle ID. Rebuild when near expiry (§11.4). |
| MapLibre + OpenFreeMap "FordCast Night" | No entitlement. Network for tiles. GitHub at build time (SPM). | **Yes** | [Verified: podspec; local test] | Record on good Wi-Fi. Pan the demo area before takes to warm the tile cache. |
| Simulated gauges, forecast rule, risk windows, state machine (TypeScript) | Nothing | **Yes** | — | Deterministic scenario clock (§22). |
| **Local notifications** (banner, Lock Screen, Notification Center, sound) | User permission only | **Yes**, after `aps-environment` is stripped (§9.5) | [Verified: plugin source + local test; Apple DTS 811929 for push] | `scheduleNotificationAsync` with a `TIME_INTERVAL` trigger for the Lock Screen take; immediate (`trigger: null`) in the foreground (§25). |
| Foreground banners | `setNotificationHandler` → `shouldShowBanner/List/PlaySound/SetBadge` | **Yes** | [Verified: expo-notifications@57.0.23 `NotificationBehavior`] | Show the banner while in-app too. |
| Notification tap → crossing sheet | Custom URL scheme `fordcast` (Info.plist only) | **Yes** | [Unverified: standard] | Response listener seeks the clock and routes to `/crossing/<id>` (§25.3). |
| Remote push (APNs) | `aps-environment` | **No** | [Verified: Apple DTS 811929] | Not used. [NEXT] in the full build. |
| `interruptionLevel: 'timeSensitive'` | Time Sensitive capability | **Unknown → don't use** | [Verified: API accepts it; behavior without the capability Unverified] | Always `'active'`. Record with a Focus that allows FordCast (§30). |
| Critical Alerts | Apple-approved entitlement | **No** | [Secondary: WWDC21 10091] | Never claimed. |
| Live Activities / Dynamic Island (expo-widgets 57.0.26) | Widget extension (2nd App ID) + App Group + `NSSupportsLiveActivities`; the plugin always adds `aps-environment` (our plugin strips it) | **Probably, untested** | [Verified: expo-widgets source; local test W] [Secondary: App Groups on free teams] | **[NEXT]** by default; optional spike §10.3. Never fake a Dynamic Island inside the app. |
| Home-screen widget | Same as Live Activities | Probably | same | [NEXT]. |
| Foreground location (expo-location) | `NSLocationWhenInUseUsageDescription` | **Yes** | [Verified: expo-location@57.0.21 plugin] | Optional "Use my real location" toggle only. Video uses the scripted position (§25). |
| Background location / geofencing | `UIBackgroundModes: location` + Always | Technically yes | [Verified: Info.plist only] [Secondary] | **Not built.** [NEXT]. |
| Speech (expo-speech) | Nothing | **Yes** | [Verified: expo-speech@57.0.3] | Silent mode **off** while recording; `useApplicationAudioSession: true` after `setAudioModeAsync({ playsInSilentMode: true })` (§25.5). |
| Chimes (expo-audio) | Nothing (no background mode needed in foreground) | **Yes** | [Verified: expo-audio@57.0.5 types] | `createAudioPlayer`, `interruptionMode: 'duckOthers'`. |
| Haptics | Nothing | **Yes** | — | Invisible on video: always paired with a visual pulse (§15). |
| SF Symbols, Liquid Glass (expo-glass-effect), NativeTabs + BottomAccessory | iOS 26+ SDK at **build** time | **Yes** | [Verified: expo-glass-effect@57.0.4 `#if compiler(>=6.2)`] | Build with Xcode ≥ 26.4 (both paths do). |
| Skia, Reanimated 4 | Nothing | **Yes** | — | Judge motion only in Release builds. |
| Universal links | Associated Domains | **No / untested** | [Secondary] | Custom scheme only. |
| iCloud / CloudKit / Sign in with Apple | Entitlements | **No** | [Verified: Apple DTS] | Not needed; no accounts. |
| CarPlay | Apple-approved entitlement | **No** | [Unverified] | Roadmap line only. |
| TestFlight / App Store / sending a build to judges | Paid program | **No** | [Verified: Apple] | Video only. A live demo means a fresh rebuild that day. |

### 10.2 What the free team changes in the product (agent MUST respect)

1. **All alerts are local notifications** created on the phone by the scenario engine. This is honest: they really are generated on the device. Every one carries the subtitle "Simulated storm · demo data" (§25.2).
2. `interruptionLevel` is `'active'` for Watch/Avoid/Closed and `'passive'` for the de-escalation update. Never `timeSensitive`, never `critical`.
3. **No feature may depend on push, background execution, App Groups or a second App ID**, except the optional §10.3 spike.
4. **Never put a dead button on screen** for a [NEXT] capability. [NEXT] items appear only in Settings → What's real → "Planned" rows (§31).

### 10.3 Optional spike: Live Activity (≤ 90 min, Day 8 Thu Oct 22 only, after the Wed Oct 21 feature-freeze gate passed) [NEXT unless it passes]

Run it only if Step 0 Q5 = yes (DD8 in §1.2) and nothing in §6's plan is behind; revert it the same day if it doesn't sign and run, **before** the Thursday-evening Release build (§11.4). If you do it:
1. `npx expo install expo-widgets`.
2. Add `['expo-widgets', { groupIdentifier: 'group.<bundleId>' }]` **after** the signing plugin.
3. Run `prebuild --clean`, then the §9.7 checks. Also run `grep -c aps-environment` on the widget's entitlements file, which must print 0.
4. In Xcode, give **both** targets the Personal Team (Automatic). This uses a second App ID out of the 10.
5. Start one activity from a dev button.

| Result | Action |
|---|---|
| **Pass** | Becomes a [SHOULD-SHOW] in the Drive Mode beat. |
| **Fail** (any App Group or extension signing error, §11.6) | `npm uninstall expo-widgets`, remove the plugin, `prebuild --clean`, and keep it as [NEXT]. Nothing else may depend on it. |

**Done when (§10):** the app config contains no capability marked No or Unknown above; `grep -c aps-environment` prints 0; the What's real screen lists every [NEXT] item from this table as "Planned".

---

## §11. Release build for recording, 7-day re-sign, troubleshooting

### 11.1 Debug vs Release: which build when

| Build | Command | Use it for | Don't use it for |
|---|---|---|---|
| **Debug on Simulator** | `npx expo run:ios` | UI work; fit checks on SE / Pro Max sizes (§19); no signing, no 7-day limit | Judging motion speed, haptics |
| **Debug on iPhone** | `npx expo run:ios --device` | Device-only behavior: notifications, speech, haptics, touch overlay | Recording (dev menu, LogBox, slower JS) |
| **Release on iPhone** | `npx expo run:ios --device --configuration Release --no-bundler` | **Every video take**, performance checks, the smoke test S8 | Day-to-day coding (no Fast Refresh) |
| **Release on Simulator** | `npx expo run:ios --configuration Release` | Backup recording (§30) and AX5 screenshots | Haptics (none in Simulator) |

[Verified: @expo/cli@57.0.31 `run:ios --help`: `--configuration <Debug|Release>`, `-d, --device [device]`, `--no-bundler`, `--no-build-cache`]

### 11.2 Build the Release app on the phone (🧑 + 🤖, ≈ 5–10 min)

```bash
cd mobile
npx expo run:ios --device --configuration Release --no-bundler   # choose your iPhone
```

- Release embeds the minified JS bundle. There's no Metro, no dev menu, no LogBox and no `__DEV__` overhead, so Reanimated and Skia run at the speed judges will see.
- **From the Xcode GUI instead:**
  1. Product → Scheme → Edit Scheme… → Run → Info → Build Configuration **Release**, and uncheck **Debug executable**.
  2. Press ⌘R.
  3. Set the scheme back to Debug afterwards. [Verified: Apple "Running your app…"]
- **If "Bundle React Native code and images" fails in Xcode:** the `ios/.xcode.env.local` line from §9.7 is missing (Xcode can't find node). Re-create it. Surface JS errors with:
  ```bash
  npx expo export --platform ios
  ```

### 11.3 Standalone check after every Release install (🧑, 3 min)

Unplug the cable, then:
1. Force-quit the app, then cold-start it from the Home Screen.
2. The map shows tiles (Wi-Fi on).
3. Director → load take T06 → lock the phone → the notification arrives in about 8 s (§24).
4. Drive take T09 speaks the 66-second line (§25).
5. Airplane mode → relaunch → the app opens and every screen renders. The map shows cached tiles or the night background; the demo data needs no network.

### 11.4 The 7-day clock (🧑, plan around it)

- The provisioning profile expires **7 days after it was issued**, not 7 days after your last install. [Verified: Apple wording "expire 7 days from issuance"]
- Reinstalling before expiry may reuse the same profile [Unverified]. So **check the expiry date, don't assume it moved**:
  - Xcode → Settings → Apple Accounts (Accounts) → your team → **Manage Certificates…** shows the certificate.
  - The profile date is visible on the iPhone in Settings → General → VPN & Device Management → your developer app [Unverified exact screen].
- When it expires, the app won't open. **Fix:** plug in and re-run §11.2 (≈ 5 min). No prebuild is needed unless `app.config.ts` or a plugin changed.
- App data usually survives a reinstall over the top, as long as you don't delete the app [Unverified]. The demo doesn't depend on it, because every launch starts at Calm evening (§22.10).

**Signing calendar for this project** (Thu Oct 15 = Day 1; §6 owns the full plan):

| Date | Signing event | Note |
|---|---|---|
| **Thu Oct 15 – Fri Oct 16** | First install (smoke test, §9.10) | Profile expires ≈ **Thu Oct 22 – Fri Oct 23**, i.e. on recording day. That's why the Thursday build below is mandatory. |
| Oct 17–21 | Debug installs while building UI; Wed Oct 21 18:00 CT feature freeze | A new install *may* re-issue the profile. Check the date. |
| **Thu Oct 22, evening** | Copy freeze 18:00 CT → **fresh Release install for recording** | New profile ≈ through **Thu Oct 29**. Any code change after this needs a new Release build + re-check of affected takes. |
| **Fri Oct 23** | **Recording day** (Sat Oct 24 morning = re-shoot buffer) | **Rule:** on recording morning, if the profile expires within 24 h, rebuild Release first (5 min), then record. |
| Sat Oct 24 | Voice-over + editing (no device needed); code freeze 18:00 CT | — |
| Sun Oct 25 | Submit | Keep the Mac set up. Any later live demo needs a same-day rebuild (§11.2). |

### 11.5 Simulator path (UI QA and backup recording; no signing, no 7-day limit)

```bash
npx expo run:ios                                   # default: a booted simulator (Debug)
npx expo run:ios --configuration Release           # Release on the simulator (backup recording, §30)
xcrun simctl list devices available | grep -E "iPhone (SE|17|16|Air)"   # pick fit-check devices (§19)
```

- Xcode 27 replaces Simulator.app and the Devices window with **Device Hub**. Device Hub can resize a simulated iPhone to arbitrary sizes, which is useful for §19 fit checks. It can **record video only of simulators**. [Verified: Apple Device Hub docs] `@expo/cli` 57.0.31 already knows Device Hub. [Verified: `SimulatorAppPrerequisite.js`]
- **Minimum fit-check set:** iPhone SE (3rd gen) · iPhone 17 (or 16) · iPhone 17 Pro Max (or 16 Plus) (§19).
- The status-bar override and recording commands live in §30.

### 11.6 Troubleshooting (symptom → cause → fix)

| # | Symptom / exact error text | Cause | Fix |
|---|---|---|---|
| 1 | "Personal development teams, including "<name>", do not support the Push Notifications capability." / "Provisioning profile … doesn't include the aps-environment entitlement" | `aps-environment` in the entitlements: the signing plugin isn't first, or it's missing | Make `./plugins/withFreeTeamSigning` the **first** plugin. Run `npx expo prebuild -p ios --clean`. `grep -c aps-environment ios/*/*.entitlements` must print 0. [Secondary: Apple forums 718388, 811929] |
| 2 | "No Account for Team "XXXXXXXXXX"" | `ios.appleTeamId` or the project names a team not signed in to Xcode | Sign in (§8.7). Fix or remove `ios.appleTeamId`, then prebuild again. [Unverified wording] |
| 3 | "Failed to register bundle identifier … is not available" | Someone (any team) already owns that ID | Pick a more unique ID (`com.<lastname><year>.fordcast`). This uses 1 of the 10 weekly App IDs. Prebuild again. [Secondary: forum 834802] |
| 4 | "Your maximum App ID limit has been reached. You may create up to 10 App IDs every 7 days." | Too many bundle IDs (test projects, renames, a widget extension) | Go back to the existing ID and wait for the rolling window. Never create scratch projects. [Secondary: forums 675347, 701805] |
| 5 | "The maximum number of apps for free development profiles has been reached." | More than 3 free-signed apps on the phone (offloaded ones reportedly count) | Delete other dev-signed apps and offloaded apps. [Secondary: forums 49304, 652164] |
| 6 | "Untrusted Developer" / "…its profile has not been explicitly trusted" | First install from this developer | Settings → General → VPN & Device Management → Trust (needs internet). |
| 7 | "Developer Mode disabled" / the toggle is missing | Pairing never started | Device Hub / Devices window → pair (§8.8), then Settings → Privacy & Security → Developer Mode. [Verified: Apple] |
| 8 | iPhone missing from run destinations / "not supported by this version of Xcode" | Xcode older than the phone's iOS, or the iOS platform isn't installed | Use the right path (iOS 27 → Xcode 27.1). Install the platform (Xcode → Settings → Components, or "Get"). |
| 9 | Launch crash: "UIScene life cycle is required for apps built with this SDK" (TN3187) | Built with the iOS 27 SDK, running on iOS 27, no scene manifest | `enableSceneSupport: true` (§9.4), `prebuild --clean`. If prebuild then fails, a plugin touched the AppDelegate (unsupported, expo#50210): remove it. [Verified: expo#46664] |
| 10 | Xcode 27: "The iOS deployment target 'IPHONEOS_DEPLOYMENT_TARGET' is set to 12.4, but the range of supported deployment target versions is 15.0 to 27.0.x" (e.g. `RNSVG-RNSVGFilters`) | Resource-bundle pod targets keep old targets in RN 0.86.3 | The floor block (§9.5) must be in the Podfile: `grep fordcast-pod-deployment-target-floor ios/Podfile`. Then `prebuild --clean`. [Verified: RN#58555] |
| 11 | "Command PhaseScriptExecution failed" in **Bundle React Native code and images** | Xcode can't find node, or a JS error in the Release bundle | `echo "export NODE_BINARY=$(command -v node)" > ios/.xcode.env.local`. Then `npx expo export --platform ios` to see the JS error. [Verified: expo `with-environment.sh` message] |
| 12 | "Module compiled with Swift X cannot be imported by the Swift Y compiler" / odd Expo-module linker errors | Precompiled XCFrameworks vs your Xcode's Swift | `['expo-build-properties', { ios: { enableSceneSupport: XCODE_27, usePrecompiledModules: false, buildReactNativeFromSource: true } }]`, then `prebuild --clean` (slower builds). [Verified: option names in expo-build-properties@57.0.22] |
| 13 | MapLibre: "Failed to resolve dependencies … maplibre-gl-native-distribution" / `Undefined symbol _OBJC_CLASS_$_MLN…` | SPM fetch blocked, or `$MLRN.post_install` missing | Check that github.com loads. Xcode → File → Packages → **Reset Package Caches**, then **Resolve Package Versions**. `grep MLRN ios/Podfile` must match; `'@maplibre/maplibre-react-native'` must be in `plugins`. [Verified: podspec + plugin] |
| 14 | `pod install` CDN/trunk errors | Stale CocoaPods specs | `cd ios && pod install --repo-update && cd ..` |
| 15 | Debug: "Could not connect to development server" | Phone can't reach Metro | Same Wi-Fi, allow Local Network, or use Release (§11.2). |
| 16 | The app opened fine last week and now won't launch | 7-day profile expired | Plug in, re-run §11.2. |
| 17 | Release-only crash at launch | JS exception in production, or a scene issue | Device logs: Device Hub / Devices window → Open Console, or Console.app filtered by "FordCast". Reproduce with `npx expo run:ios --configuration Release` on the Simulator. |
| 18 | Notification never shows on the Lock Screen | Permission off, Focus blocks it, previews hidden, or Scheduled Summary holds it | Settings → Notifications → FordCast → Allow + Lock Screen + Banners; **Show Previews: Always**; Scheduled Summary off; a recording Focus that **allows FordCast** (§30). |
| 19 | Speech silent | Silent switch on, volume 0, or the voice isn't downloaded | Silent **off**, volume ≈ 60%. Settings → Accessibility → Spoken Content → Voices → download an enhanced English and Spanish voice [Unverified menu path] (§25.5). |
| 20 | Widget spike: "Provisioning profile … doesn't support the App Groups capability" or an application-groups mismatch | App Group not provisioned for the free team | Same team on both targets; let Automatic signing re-sync. If it still fails, **drop expo-widgets** (§10.3). [Secondary] |

### 11.7 Never do these

| Never | Why |
|---|---|
| Change the bundle ID after Day 1 | 10-per-week App ID limit, and it breaks the profile. |
| Edit anything inside `ios/` | The next prebuild deletes it. |
| Delete the "Push Notifications" capability in Xcode by hand | The next prebuild brings it back. Fix the plugin order instead. |
| Run `npm install expo@latest`, `npx expo install expo@latest` or `npx expo upgrade` | That's SDK 58. |
| Update the iPhone's iOS between the smoke test and the video | It can force a different Xcode path. |
| Record a take from a Debug build | Slower, and the dev UI can appear. |
| Use `timeSensitive`, `critical`, push tokens or background location | Not available or not needed on a free team. |

**Done when (§11):**
- A Release build installed **within 24 h of each recording session** opens unplugged.
- The §11.3 checks pass, including airplane mode.
- The profile expiry date is written in `docs/decisions/verifications.md`.
- The Simulator Release build runs for the backup take.
- Every troubleshooting row the student actually hit is noted with the fix used.
