# FordCast Demo Edition: iOS build, free-team signing and video recording

Researched 2026-10-15 for the FordCast Demo Edition: an on-device-only Expo SDK 57 app installed on one physical iPhone through Xcode with a free Apple ID "Personal Team" (7-day profile), then recorded for the CAC 2026 video.

**Evidence tags**
- **[Verified: source]** means I read it in a primary source: Apple developer docs, npm package source, or a GitHub issue.
- **[Verified: local test]** means I ran it on 2026-10-15 with `npx expo prebuild -p ios --no-install` on Linux.
- **[Secondary]** means a credible non-primary source, such as a forum post, blog or third-party PR.
- **[Unverified]** means general knowledge or an inference. Check it on the device.

---

## 0. Decisions (TL;DR)

1. **Choose Xcode by the iPhone's iOS version.** Check the iPhone's iOS version first, then pick the matching path.
   - **iPhone on iOS 26.x:** use Xcode 26.4–26.6 on macOS Tahoe 26.2 or later. Don't update the iPhone to iOS 27 until the video is done.
   - **iPhone on iOS 27.x:** use Xcode 27.1 on macOS Tahoe 26.6 or later. Also turn on `expo-build-properties` → `ios.enableSceneSupport: true` and the pod deployment-target floor (D3, D4).
   - Sources: [Verified: Apple Xcode system requirements; expo/expo#46664; react/react-native#58555]
2. **Strip `aps-environment` with a small local config plugin, and list it first in `plugins`.**
   - When `expo-notifications` is installed, it adds the Push Notifications entitlement on every prebuild, even if you don't list it in `plugins`. It has no option to turn this off.
   - A free Personal Team cannot sign Push Notifications.
   - Sources: [Verified: expo-notifications@57.0.23 plugin source; @expo/prebuild-config@57.0.19 auto-plugins; local test; Apple DTS forum 811929]
3. **Use local notifications for the "alert" moment.**
   - They need no capability and use the same system banner and lock-screen UI as push [Unverified: standard iOS behavior].
   - Use `interruptionLevel: 'active'`. Don't use `timeSensitive` or `critical`.
   - Record with a Focus that allows only FordCast.
4. **Live Activities / Dynamic Island are a stretch goal only.** Time-box them to about 2 hours, and the video must not depend on them.
   - `expo-widgets@57.0.26` always adds `aps-environment` and an App Group, plus a second App ID for the extension [Verified: package source + local test].
   - Our plugin removes the push entitlement. App Groups on a free team are probably fine but not confirmed from Apple's own table [Secondary ×2].
5. **Record from a Release build:** `npx expo run:ios --device --configuration Release`.
   - The JS is bundled into the app, so it runs without Metro and has no dev menu or LogBox. Performance matches what judges expect.
   - Iterate on the UI in Debug, using the Simulator and the device.
6. **Use an in-app scripted location (a scenario clock), not Xcode GPX simulation.**
   - Scripted location is deterministic, works in Release without a cable, and stays in sync with the simulated storm.
   - Xcode GPX only works while Xcode is debugging the app, and supports waypoints only.
7. **Primary recording surface: QuickTime Player on the Mac with the iPhone on a cable.**
   - You get a clean status bar (9:41, full bars, full battery) and no on-device recording indicator [Secondary: long-standing behavior; re-check on iOS 26/27].
   - Backup 1: iOS built-in Screen Recording.
   - Backup 2: the iOS Simulator with a `simctl` status-bar override.
8. **One bundle ID, forever.** For example `com.<lastname>.fordcast`.
   - Free teams get 10 App IDs per 7 days and 3 apps per device [Verified: Apple "Choosing a Membership"].
   - Do the smoke test with the final bundle ID too.
9. **Stay on Expo SDK 57.** Note that `expo@latest` is now **58.0.11**, published 2026-10-15; the `sdk-57` tag points to 57.0.30 [Verified: npm].
   - Always scaffold with `--template default@sdk-57`.
   - Use expo ≥ 57.0.23. The pinned 57.0.28 is fine.
   - Don't move to SDK 58 ten days before the deadline.
10. **Label honestly at no cost.**
    - Show a persistent "Simulated storm · Demo data" chip during scenarios.
    - Put "Simulated" in the notification subtitle.
    - Add one title card in the video: "Demonstration uses simulated gauge data."

---

## 1. What changed since the master prompt / stack.md (deltas)

| # | Finding | Impact | Evidence |
|---|---|---|---|
| Δ1 | Xcode 27 and iOS 27 have shipped. Xcode 27.1 is the current stable release and 27.2 is in beta. Xcode 27 needs **macOS Tahoe 26.6+** and supports on-device runs on **iOS 17 or later**. Xcode 26.4–26.6 needs **macOS Tahoe 26.2+**. | stack.md's "Xcode ≥ 26.4" is still the minimum for SDK 57, but an iPhone on iOS 27 effectively needs Xcode 27. A Mac stuck on Sequoia can only run Xcode ≤ 26.3, which is too old for SDK 57. | [Verified: developer.apple.com/xcode/system-requirements] |
| Δ2 | Apps built with the **iOS 27 SDK** that run on iOS 27 **crash at launch** with "UIScene life cycle is required for apps built with this SDK". The SDK 57 fix is opt-in: expo ≥ **57.0.23** plus expo-build-properties ≥ 57.0.20 with `["expo-build-properties", {"ios": {"enableSceneSupport": true}}]`. It only supports the standard SDK 57 Swift AppDelegate. SDK 58 has scene support by default. | Required on the Xcode 27 path. | [Verified: expo/expo#46664 (closed 2026-09-23); expo-build-properties@57.0.22 `iosSceneSupport.js` and `pluginConfig.d.ts`; local test: prebuild writes `UIApplicationSceneManifest` and `AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider`] |
| Δ3 | Xcode 27 turns "deployment target below 15.0" into a **hard error**, including for CocoaPods **resource-bundle** targets. RN 0.86.3's `updateOSDeploymentTarget` only raises main pod targets (the upstream fix, RN PR #58687, merged 2026-09-28 and is not in 0.86.3). Our deps that ship low-target resource bundles: **react-native-svg 15.15.4** (`RNSVGFilters`, iOS 12.4), **lottie-react-native 7.3.8** (13.4), **async-storage 2.2.0** (`RNCAsyncStorage_resources`). | Needs the Podfile floor in D3. | [Verified: react/react-native#58555; react-native@0.86.3 `scripts/cocoapods/utils.rb`; podspecs] |
| Δ4 | **expo-notifications adds `aps-environment` even when it isn't in `plugins`.** `@expo/prebuild-config` auto-applies it as a "versioned SDK plugin" whenever the module is autolinked. | Free-team signing fails unless the entitlement is stripped. | [Verified: prebuild-config@57.0.19 `withVersionedExpoSDKPlugins`; local test case A] |
| Δ5 | Xcode 27 replaces Simulator.app and the "Devices and Simulators" window with **Device Hub**. Xcode Settings → **Apple Accounts** (formerly "Accounts"). Wireless pairing needs iOS 27+. Device Hub can take **screenshots** of physical devices but can **record video only on simulators**. | Affects the runbook wording and the recording plan. | [Verified: Apple docs "Managing … devices in Device Hub", "Running your app…", "Capturing screenshots and videos from devices"] |
| Δ6 | `@expo/cli` 57.0.31 already understands Device Hub (`SimulatorAppPrerequisite.js`: "Xcode 27 replaces Simulator with DeviceHub"). | Keep the CLI current (it comes with expo 57.0.30). | [Verified: package source] |
| Δ7 | SDK 57 `expo prebuild` **cleans and regenerates `ios/` by default** (`--no-clean` to keep it). `expo run:ios` only prebuilds when `ios/` is missing. | Never hand-edit Xcode capabilities. Use config plugins and re-run prebuild after `app.json` changes. | [Verified: @expo/cli@57.0.31 `prebuild/index.js`, `run/ensureNativeProject`] |
| Δ8 | MapLibre RN 11.5.0 pulls **MapLibre Native iOS 6.31.0 through Swift Package Manager from GitHub**. It needs `$MLRN.post_install(installer)` in the Podfile, which its config plugin injects. It is **not** auto-applied. | You must list `"@maplibre/maplibre-react-native"` in `plugins`, and the first build needs github.com reachable. | [Verified: MapLibreReactNative.podspec; plugin `ios.js`; local test Podfile] |

---

## 2. Free Personal Team: limits (2026)

| Limit | Value | Evidence |
|---|---|---|
| Provisioning profile lifetime | **7 days from issuance**, then "rebuild and reinstall" | [Verified: Apple "Choosing a Membership" → "Enable a personal team in Xcode"] |
| App IDs | **Up to 10, each expiring after 7 days.** Exact Xcode error: "You may create up to 10 App IDs every 7 days." | [Verified: Apple; error text Secondary: forums 675347/701805] |
| Devices | Up to **3 devices**, each registration expiring after 7 days | [Verified: Apple] |
| Apps per device | Up to **3 apps** per device. Offloaded apps have been reported to count. | [Verified: Apple; offload detail Secondary: forum 652164] |
| Distribution | None. No TestFlight, App Store or ad hoc. On-device testing through Xcode only. | [Verified: Apple membership page] |
| Push Notifications, iCloud | **Not available** (Apple Developer Program only) | [Verified: Apple DTS reply, forum 811929 (Jan 2026)] |
| App Groups | **Probably available.** An Apple DTS answer (Jun 2026) tells personal-team developers to use "their own App Group identifier", and a Sep 2026 PR says Apple's table lists App Groups, Keychain Sharing and Background Modes as available. I could not read Apple's table checkmarks directly. | [Secondary ×2: forum 834802; heyskylark/omp-mobile#11] |
| Time Sensitive Notifications, Associated Domains, Sign in with Apple, Critical Alerts, CarPlay, WeatherKit | Treat as **unavailable or untested**. Critical Alerts and CarPlay need Apple approval even on paid teams. None of these are needed. | [Unverified: Apple capability table rows exist but checkmarks weren't machine-readable] |
| Account age | The paid program needs the age of majority. A free account / Xcode personal team has been reported available from 13+. If the student's (child) Apple Account is refused, sign Xcode in with a parent's Apple Account. | [Secondary: Apple forums 128800, 704235] |

---

## 3. Toolchain matrix

| iPhone iOS | Xcode | Mac needs | Extra project config | Notes |
|---|---|---|---|---|
| 26.x | **26.4.1 / 26.5 / 26.6** (26.6 preferred) | macOS **Tahoe 26.2+** | Pod floor plugin (harmless). `enableSceneSupport` optional (leave off). | Simplest path. **Pause iOS updates** on the phone until after recording. |
| 27.x | **27.1** | macOS **Tahoe 26.6+** | `enableSceneSupport: true` **required**. Pod floor plugin **required**. | Wireless pairing works (iOS 27+). Device Hub replaces the Devices window. |
| ≤ 16 | n/a | n/a | n/a | SDK 57's minimum is iOS 16.4, and Xcode 27 debugs iOS 17+ only. Update the phone. |
| Mac can't run Tahoe | none | n/a | n/a | SDK 57 can't be built there. Use another Mac (school, library, friend's). EAS cloud builds for devices need a **paid** account, so they don't help. |

[Verified: Apple Xcode system requirements table; Expo/RN issues above.] Whether Xcode 26.x can still install to an iOS 27 device without device-support files is **[Unverified]**. Don't plan on it.

---

## 4. Project configuration for free-team signing (copy-paste)

### D1. `app.json` (iOS-relevant parts)

```json
{
  "expo": {
    "name": "FordCast",
    "slug": "fordcast",
    "scheme": "fordcast",
    "userInterfaceStyle": "dark",
    "ios": {
      "bundleIdentifier": "com.yourlastname.fordcast",
      "appleTeamId": "XXXXXXXXXX",
      "supportsTablet": false
    },
    "plugins": [
      "./plugins/withFreeTeamSigning",
      "expo-router",
      "@maplibre/maplibre-react-native",
      ["expo-build-properties", { "ios": { "enableSceneSupport": true } }],
      ["expo-location", { "locationWhenInUsePermission": "FordCast shows low-water crossings near you. Demo mode uses a scripted location." }]
    ]
  }
}
```

- **`./plugins/withFreeTeamSigning` must be the first entry.** Config-plugin mods run in reverse registration order: the newest-registered mod runs first and calls `nextMod` afterwards. The first-listed plugin's entitlements edit therefore runs last, after expo-notifications has added `aps-environment`. [Verified: @expo/config-plugins@57.0.10 `withMod.js`/`withBaseMod`; local test cases B–E below]
- **`expo-notifications` does not need to be listed.** It is auto-applied. If you list it, for example to add `sounds`, put it **after** our plugin.
- **`appleTeamId` is optional.** If it's set, prebuild stamps `DEVELOPMENT_TEAM` on every target, including an expo-widgets extension [Verified: local test, 4 build configs]. To find the ID, run `security find-certificate -c "Apple Development" -p | openssl x509 -noout -subject` and read the `OU=` value, which Expo CLI also uses [Verified: @expo/cli `codeSigning/Security.js` reads cert OU]. Alternatively, read `DEVELOPMENT_TEAM` from `ios/*.xcodeproj/project.pbxproj` after selecting the team in Xcode once. If you omit it, `npx expo run:ios --device` picks the "Apple Development" identity from the keychain and writes the team for you [Verified: `configureCodeSigning.js`].
- **`enableSceneSupport`**: required for Xcode 27 builds. On the Xcode 26 path, either drop it or keep it and smoke-test.

### D2–D3. `plugins/withFreeTeamSigning.js` [Verified: local prebuild test]

```js
// FordCast Demo Edition: make the iOS project signable by a FREE Apple ID "Personal Team".
// MUST be listed FIRST in app.json "plugins" (entitlement mods run in reverse registration order).
const { withEntitlementsPlist, withPodfile, CodeGenerator } = require('expo/config-plugins');

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

// Xcode 27 rejects pod targets (incl. resource-bundle targets like RNSVG-RNSVGFilters) below iOS 15.0.
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

A copy is saved at `/tmp/claude-0/-home-user-Fordcast-CAC/608fe985-2ad7-54f1-8865-eca0e6597f76/scratchpad/demo/withFreeTeamSigning.js`.

**Local test results** (expo 57.0.30, expo-notifications 57.0.23, expo-build-properties 57.0.22, expo-location 57.0.21, MapLibre RN 11.5.0, react-native-svg 15.15.4, RN 0.86.3; `expo prebuild -p ios --no-install --clean`):

| Case | `plugins` order | `aps-environment` in `FordCast.entitlements` |
|---|---|---|
| A | no custom plugin, expo-notifications not listed | **present** (auto-applied) |
| B | `expo-notifications`, then custom plugin | **present** (wrong order) |
| C | custom plugin listed **last** | **present** (wrong order) |
| D | custom plugin **first**, expo-notifications not listed | **absent** ✓ |
| E | custom plugin **first**, then `["expo-notifications", {...}]` | **absent** ✓ |
| W | case D plus `expo-widgets` | app keeps only `com.apple.security.application-groups`. Extension `ExpoWidgetsTarget.entitlements` has only App Groups. Info.plist gets `NSSupportsLiveActivities`. |

The generated Podfile `post_install` contains our floor block, then `$MLRN.post_install(installer)`, then `react_native_post_install(...)`.

### D4. Verify after every prebuild (10 s)

```bash
grep -c aps-environment ios/*/*.entitlements          # must print 0 for every file
grep -n "fordcast-pod-deployment-target-floor" ios/Podfile
grep -n "MLRN.post_install" ios/Podfile
/usr/libexec/PlistBuddy -c "Print :UIApplicationSceneManifest" ios/FordCast/Info.plist   # Xcode 27 path only
```

Don't call `getExpoPushTokenAsync` or `getDevicePushTokenAsync` anywhere. Without the entitlement they fail. Local scheduling doesn't need them.

---

## 5. Numbered setup runbook

### Phase A: Mac (≈ 1–2 h, mostly downloads)

1. **Check the Mac.** Apple menu → About This Mac: you need macOS **Tahoe 26.2+** (Xcode 26.x) or **26.6+** (Xcode 27). You also need plenty of free disk for Xcode, the iOS platform and DerivedData (tens of GB) [Unverified size].
2. **Check the iPhone.** Settings → General → About → iOS Version, then pick a row of §3. If the phone is on iOS 26, turn off automatic updates (Settings → General → Software Update → Automatic Updates) until the video is done.
3. **Install Xcode** (Mac App Store, or developer.apple.com/download for a specific 26.x). Launch it once and accept the license. When prompted, install the iOS platform (or click **Get** next to "Any iOS Device" [Verified: Apple "Running your app…"]). Then run:
   ```bash
   sudo xcode-select -s /Applications/Xcode.app
   xcodebuild -runFirstLaunch
   ```
4. **Install the JS/native tooling.** Node **≥ 22.13** (LTS) [Verified: stack.md / SDK 57 registry]. CocoaPods (`brew install cocoapods`, then check `pod --version`). Expo CLI tries `gem` and then Homebrew automatically if pods are missing [Verified: @expo/package-manager source], but installing it yourself is more predictable.
5. **Sign in.** Xcode → Settings → **Apple Accounts** (Xcode 27; "Accounts" in Xcode 26) → `+` → Apple Account. A team named "**Your Name (Personal Team)**" appears [Verified: Apple docs].

### Phase B: iPhone pairing (≈ 10 min)

6. **Connect a cable** (USB-C for iPhone 15 and later, Lightning for older). Unlock the phone and tap **Trust This Computer**. [Verified: Apple Device Hub doc]
7. **Start pairing.**
   - Xcode 27: open Device Hub (Xcode → Open Developer Tool → Device Hub, or "Manage Devices…" in the run-destination menu), select the phone and click **Pair** if shown.
   - Xcode 26: Window → Devices and Simulators.
   - Wait until "preparing device" finishes.
8. **Turn on Developer Mode.** Settings → **Privacy & Security** → Developer Mode (under Security) → On → **Restart**. After the reboot, swipe up, tap **Enable**, and enter the passcode.
   - The toggle only appears after you start pairing or have paired before. [Verified: Apple "Enabling Developer Mode on a device"]
   - Anecdotal fixes if it's missing: restart the phone, or turn off Focus [Secondary].
9. **Optional: Wi-Fi runs.** With Xcode 27, a cable-paired device can then run over Wi-Fi with IPv6 on the same network. Wireless *pairing* needs iOS 27+ [Verified: Apple]. With Xcode 26, use Devices and Simulators → "Connect via network" [Unverified label]. **For recording, use the cable anyway**, because QuickTime needs it.

### Phase C: Project (≈ 30 min)

10. **Scaffold** with `npx create-expo-app@latest fordcast-app --template default@sdk-57`. The pin matters because `latest` is SDK 58 now. Add native deps with `npx expo install …` so they resolve to SDK 57 versions:
    - expo-notifications ~57.0.23
    - expo-location ~57.0.21
    - expo-speech ~57.0.3
    - expo-haptics ~57.0.3
    - expo-build-properties ~57.0.22
    - react-native-svg 15.15.4
    - Reanimated 4.5.1 / worklets 0.10.1
    - Skia 2.6.2
    - `@maplibre/maplibre-react-native@11.5.0`

    [Verified: expo@57.0.30 bundledNativeModules.json]
11. **Add the plugin.** Create `plugins/withFreeTeamSigning.js` (D2) and set `app.json` (D1). Use a **globally unique** bundle ID in lowercase reverse-DNS. If Xcode says it is "not available", pick another.
12. **Prebuild:** `npx expo prebuild -p ios --clean`. This also runs `pod install`. The first MapLibre SPM resolve needs github.com. Then run the **D4 checks**.

### Phase D: First run, Debug (≈ 15–30 min for the first build)

13. **Open the project.** `open ios/FordCast.xcworkspace`. Open the **.xcworkspace**, not the .xcodeproj.
14. **Set up signing.** In Xcode, select target **FordCast** → **Signing & Capabilities**:
    - Turn on **Automatically manage signing**.
    - Team = **Your Name (Personal Team)**.
    - Bundle Identifier = your ID.
    - If **Register** appears, click it.
    - The capability list must **not** show "Push Notifications". If it does, fix the plugin order (D1). Don't delete the capability by hand, because the next prebuild regenerates it.
    - Xcode creates the "Apple Development" certificate and the 7-day "iOS Team Provisioning Profile" here. [Verified: Apple "Set up code signing for physical devices"]
15. **Run.** Either `npx expo run:ios --device` (choose the iPhone from the list) or ⌘R in Xcode with the iPhone as run destination. The first time, macOS may ask for `codesign` keychain access: enter your Mac password and choose **Always Allow** [Unverified wording].
16. **If you see "Untrusted Developer"**: iPhone → Settings → General → **VPN & Device Management** → Developer App → "Apple Development: <your Apple ID>" → **Trust**. The phone needs internet to verify. Then relaunch. [Secondary: Apple forums 732495, 685271]
17. **If Debug can't reach Metro**: when asked, allow **Local Network** for FordCast, and keep the Mac and iPhone on the same Wi-Fi. Or skip Metro entirely with Release (step 18).

### Phase E: Release build for recording

18. **Build Release:** `npx expo run:ios --device --configuration Release` (add `--no-bundler`, since Metro isn't needed). JS is embedded and minified, so there's no dev menu, LogBox or `__DEV__` overhead. Reanimated/Skia animations are representative. [Verified: @expo/cli 57 `run:ios --help`: `--configuration <Debug|Release>`, `-d/--device`, `--no-bundler`]
    - From Xcode instead: Product → Scheme → Edit Scheme → Run → Build Configuration **Release**. In Info, uncheck **Debug executable** (runs without the debugger) [Verified: Apple "Running your app…"]. Then ⌘R.
19. **Unplug and test standalone:** cold start, airplane-mode start (the map tile cache), notifications, TTS. The app works until the profile expires.

### Phase F: 7-day renewal

20. When the profile expires, the app stops launching. Plug in and re-run step 18. No prebuild is needed unless `app.json` or plugins changed.
    - The 7 days count **from profile issuance**, not from your last install [Verified: Apple wording "expire 7 days from issuance"]. Reinstalling before expiry may reuse the same profile [Unverified].
    - **On recording day, if the app launches, record. If it doesn't, rebuild (≈ 5 min).**
    - Data survives a reinstall-over-the-top as long as you don't delete the app [Unverified]. The demo is deterministic anyway.

### Phase G: Simulator path (UI iteration and backup recording; no signing, no 7-day limit)

21. Run `npx expo run:ios` (default target is a simulator) or `npx expo run:ios --configuration Release`. Device Hub (Xcode 27) can **resize a simulated iPhone to arbitrary sizes**, which is useful for "the UI fits everything" QA [Verified: Apple "Configuring the environment of a simulated device"].

---

## 6. Capability matrix: feature → works with a free team? → demo approach

| Feature | What it needs on iOS | Free Personal Team | Evidence | Demo Edition approach |
|---|---|---|---|---|
| Install and run on your own iPhone | Apple Development cert + team profile | **Yes**, 7-day profile, 3 apps/device | [Verified: Apple] | One bundle ID. Rebuild before recording if it's near expiry. |
| MapLibre map + OpenFreeMap "FordCast Night" | No entitlement. Network for tiles. SPM fetch at build. | **Yes** | [Verified: podspec; local test] | Record on good Wi-Fi. Pan the demo area once before takes to warm the tile cache. |
| Simulated gauges, travel-time forecast, risk window, safety state machine (TS) | None | **Yes** | n/a | Deterministic scenario clock with seedable replays. |
| **Local notifications** (banner, lock screen, Notification Center, sound) | User permission only | **Yes**, after stripping `aps-environment` | [Verified: plugin source + local test; Apple DTS 811929 for push] | `scheduleNotificationAsync` with a `TIME_INTERVAL` trigger 5–10 s after "Start simulated storm". Lock the phone for the shot. |
| Remote push (APNs) | `aps-environment` | **No** | [Verified: Apple DTS 811929] | Not needed. All on-device. |
| Foreground notification display | `setNotificationHandler` → `shouldShowBanner`, `shouldShowList`, `shouldPlaySound`, `shouldSetBadge` | **Yes** | [Verified: expo-notifications@57.0.23 `NotificationBehavior` type] | Show the banner while in-app too. |
| Notification tap → deep link to crossing | Custom URL scheme (`scheme: "fordcast"`, Info.plist only) | **Yes** | [Unverified: standard] | `useLastNotificationResponse` → `router.push('/crossing/…')`. |
| `interruptionLevel: 'timeSensitive'` | Time Sensitive Notifications capability | **Unknown / don't use** | [Verified: type `'passive' \| 'active' \| 'timeSensitive' \| 'critical'`; behavior without the capability [Unverified]: most likely delivered as Active, with no Focus breakthrough and no "Time Sensitive" label] | Use `'active'`. Record with a Focus that **allows FordCast**. |
| Critical Alerts | Apple-approved entitlement | **No** | [Secondary: WWDC21 10091] | Don't claim it. Roadmap at most. |
| Live Activities / Dynamic Island (expo-widgets 57.0.26) | Widget extension (2nd App ID) + `NSSupportsLiveActivities` (Info.plist) + **App Group** (expo-widgets stores layouts in App Group defaults). Plugin **always** adds `aps-environment`, which we strip. Local start/update uses `pushType: nil` when push is disabled. | **Probably**, but untested. Depends on App Groups for free teams. | [Verified: expo-widgets source `withPushNotifications.js`, `withAppGroupEntitlements.js`, `LiveActivityFactory.swift`; local test W] [Secondary: App Groups] | **Stretch only.** Time-box about 2 h after the core is done. If signing fails ("doesn't support the App Groups capability" or an application-groups mismatch), remove expo-widgets and show Live Activities as a **Roadmap** slide. Never fake a Dynamic Island inside the app. |
| Home-screen widget | Same as Live Activities | Probably | same | Roadmap. |
| Foreground location (expo-location) | `NSLocationWhenInUseUsageDescription` (Info.plist) | **Yes** | [Verified: expo-location@57.0.21 plugin props `locationWhenInUsePermission` etc.] | Real "Use my location" path stays, so it's honest. Demo uses scripted location. |
| Background location / geofencing | `UIBackgroundModes: location` (Info.plist; plugin flag `isIosBackgroundLocationEnabled`) + Always auth | **Technically yes** (no entitlement). Background Modes is reportedly available to free teams. | [Verified: plugin adds the Info.plist key only] [Secondary: omp-mobile#11] | **Not in the demo.** Simulate "approaching crossing" with the scripted route. |
| Spoken alerts (expo-speech) | None | **Yes** | [Verified: expo-speech@57.0.3, option `useApplicationAudioSession`] | **Turn Silent mode off** before recording. The default app audio session is likely silenced by the Ring/Silent switch [Unverified]. Screen recording and QuickTime capture app audio. |
| Haptics | None | **Yes** | n/a | Invisible on video. Pair each haptic with a visual pulse. |
| SF Symbols, Liquid Glass (expo-glass-effect), NativeTabs | iOS 26+ SDK at build time | **Yes** | [Verified: stack.md v57 docs] | Build with Xcode ≥ 26.4. |
| Skia, Reanimated 4 | None | **Yes** | n/a | Record from Release. |
| Universal links | Associated Domains | **No / untested** | [Secondary] | Custom scheme only. |
| iCloud / CloudKit | iCloud | **No** | [Verified: Apple DTS] | Not needed (on-device only). |
| Sign in with Apple | Entitlement | **No / untested** | [Secondary] | No accounts in the demo. |
| CarPlay | Apple-approved CarPlay entitlement | **No** | [Unverified] | Roadmap slide only. |
| TestFlight / App Store / sending a build to judges | Paid program | **No** | [Verified: Apple] | Video only. A live demo means a fresh rebuild that day. |

---

## 7. Answers to the specific questions

- **Do local notifications look identical to push on the lock screen?** Yes, for the video's purposes. Both present through the same system notification UI: app icon, app name, title/subtitle/body, timestamp, grouping [Unverified: standard iOS behavior; Apple doc bodies were not machine-readable]. Make the shot honest:
  - Put "Simulated storm" in the subtitle.
  - Set Settings → Notifications → **Show Previews: Always**. The default "When Unlocked" hides the text on a locked phone unless Face ID recognizes you [Unverified default].
  - Turn **Scheduled Summary** off for FordCast, and turn off **notification summaries/prioritization** (Apple Intelligence), so iOS doesn't rewrite or hold the alert [Unverified: names on iOS 27].
- **Is `timeSensitive` usable without the entitlement?** The API accepts it. Without the capability, iOS most likely delivers the notification at Active level with no Focus breakthrough [Unverified, inferred from WWDC21 + vendor docs]. Don't add the entitlement, because free-team support is unknown. Use a Focus allow-list instead.
- **Can Live Activities run on a free team?** ActivityKit itself needs no entitlement for local start/update (only the Info.plist key plus a widget extension) [Unverified: general ActivityKit knowledge]. The expo-widgets implementation also requires an **App Group**, and its plugin unconditionally adds push. That's solvable with our plugin, and App Groups are probably OK on free teams. Call it **plausible, untested**. It also uses a second App ID.
- **Background location with a free team?** Yes technically (Info.plist only), but don't use it in the demo.

---

## 8. Troubleshooting

| Symptom / error text | Cause | Fix |
|---|---|---|
| "Personal development teams, including "<name>", do not support the Push Notifications capability." / "Provisioning profile … doesn't include the aps-environment entitlement" | `aps-environment` in the entitlements: auto-added by expo-notifications or expo-widgets, or the custom plugin is in the wrong order | Put `./plugins/withFreeTeamSigning` **first** in `plugins`. Run `npx expo prebuild -p ios --clean`, then `grep -c aps-environment ios/*/*.entitlements` must print 0. [Secondary: error text from Apple forums 718388, 811929] |
| "No Account for Team "XXXXXXXXXX"" | `ios.appleTeamId` or the pbxproj names a team that isn't signed in to Xcode | Sign in (Settings → Apple Accounts), or select your Personal Team in Signing & Capabilities. Fix or remove `ios.appleTeamId` and re-prebuild. [Unverified wording] |
| "Failed to register bundle identifier … cannot be registered to your development team because it is not available" | Bundle ID already taken (by anyone, including another personal team) | Choose a more unique ID (`com.<lastname><year>.fordcast`) and re-prebuild. [Secondary: forum 834802] |
| "Your maximum App ID limit has been reached. You may create up to 10 App IDs every 7 days." | Too many bundle IDs (test projects, renames, widget extension) | Reuse the existing ID and wait for the rolling window. Don't create scratch projects with new IDs. [Secondary: forums 675347, 701805] |
| "The maximum number of apps for free development profiles has been reached." | More than 3 free-signed apps on the phone (offloaded apps reportedly count) | Delete other dev-signed apps and offloaded apps. [Secondary: forums 49304, 652164] |
| "Untrusted Developer" / launch refused: "invalid code signature, inadequate entitlements or its profile has not been explicitly trusted" | First install from this developer | Settings → General → VPN & Device Management → Developer App → Trust (needs internet). |
| "Developer Mode disabled" / toggle missing | Developer Mode off, or pairing not started | Start pairing in Device Hub / Devices window, then Settings → Privacy & Security → Developer Mode → Restart → Enable. [Verified: Apple] |
| Device missing from run destinations / "not supported by this version of Xcode" | Xcode older than the phone's iOS, or the platform isn't installed | Use §3 (iOS 27 → Xcode 27.1). Install the iOS platform (Settings → Components / "Get"). |
| Launch crash: "UIScene life cycle is required for apps built with this SDK" (TN3187) | Built with the iOS 27 SDK (Xcode 27), running on iOS 27, no scene manifest | expo ≥ 57.0.23 + `["expo-build-properties",{"ios":{"enableSceneSupport":true}}]`, then `prebuild --clean`. [Verified: expo#46664] If prebuild then fails, another plugin modified the AppDelegate (unsupported, expo#50210). |
| Xcode 27 build error: "The iOS deployment target 'IPHONEOS_DEPLOYMENT_TARGET' is set to 12.4, but the range of supported deployment target versions is 15.0 to 27.0.x" (e.g. `RNSVG-RNSVGFilters`, `RNCAsyncStorage_resources`, Lottie) | Resource-bundle pod targets keep their podspec targets in RN 0.86.3 | The pod floor block (D2), then `prebuild --clean` or `cd ios && pod install`. [Verified: RN#58555] |
| "Command PhaseScriptExecution failed" in **Bundle React Native code and images** (Release, especially when building from the Xcode GUI) | Xcode can't find `node` (nvm/fnm), or a JS bundling error | `echo "export NODE_BINARY=$(command -v node)" > ios/.xcode.env.local` [Verified: expo `with-environment.sh` message]. Surface JS errors with `npx expo export --platform ios`. |
| "Module compiled with Swift X cannot be imported by the Swift Y compiler" / odd linker errors in Expo modules | Precompiled XCFrameworks vs your Xcode's Swift | `["expo-build-properties", {"ios": {"usePrecompiledModules": false, "buildReactNativeFromSource": true}}]`, then `prebuild --clean` (slower builds). [Verified: option names in expo-build-properties@57.0.22] |
| MapLibre: "Failed to resolve dependencies … maplibre-gl-native-distribution" / `Undefined symbol _OBJC_CLASS_$_MLN…` | SPM fetch blocked, or `$MLRN.post_install` missing from the Podfile | Check github.com access. In Xcode: File → Packages → Reset Package Caches → Resolve. Make sure `"@maplibre/maplibre-react-native"` is in `plugins` and `grep MLRN ios/Podfile` matches. [Verified: podspec + plugin] |
| `pod install` CDN/trunk errors | Stale CocoaPods specs | `cd ios && pod install --repo-update`. |
| Debug: "Could not connect to development server" | Phone can't reach Metro | Same Wi-Fi, allow Local Network, or use Release. |
| App opened fine last week and now won't launch | 7-day profile expired | Plug in and re-run the Release build (Phase F). |
| Release-only crash at launch | JS exception in production, or a native/scene issue | Read device logs: Device Hub / Devices window → Open Console, or Console.app filtered by process "FordCast". Reproduce with `--configuration Release` on the Simulator. |
| Widget extension (stretch): "Provisioning profile … doesn't support the App Groups capability" or "… doesn't match the entitlements file's value for com.apple.security.application-groups" | App Group not provisioned for the personal team | Let Xcode re-sync with Automatic signing, and keep the same team on both targets (`ios.appleTeamId`). If it still fails, **drop expo-widgets** (Roadmap). [Secondary] |

---

## 9. Recording guide

### 9.1 Device prep checklist (do it the night before)
- [ ] Release build installed (Phase E). Confirm cold start works and the profile isn't expiring within 24 h.
- [ ] **Focus:** create a "Recording" Focus that silences everything **except FordCast** (Settings → Focus → + → Allowed Notifications → Apps → FordCast). Plain Do Not Disturb would also silence FordCast's own alert.
- [ ] Settings → Notifications → **Show Previews: Always**. FordCast: Banner style Persistent (optional), Sounds on. Scheduled Summary and notification summaries off.
- [ ] **Silent mode off**, volume about 60%, so expo-speech TTS is audible and captured.
- [ ] **Low Power Mode off**. It throttles animation and shows a yellow battery [Unverified: 60 Hz cap].
- [ ] Display & Brightness → **Auto-Lock: Never** for the session. Max brightness. True Tone and Night Shift off for consistent colors on the dark palette.
- [ ] Text Size/Bold Text at defaults, Display Zoom: Default, so the layout matches the design.
- [ ] Neutral wallpaper, no personal lock-screen widgets, clear Notification Center, close other apps.
- [ ] Grant Notifications and Location permissions **before** recording, so no system prompts appear in takes (unless you want one shot).
- [ ] Pan the demo region once on Wi-Fi (map tile cache warm).
- [ ] In-app: language set (EN or ES take), the "Simulated storm · Demo data" chip visible, scenario reset to t=0.

### 9.2 Primary: QuickTime over cable (clean 9:41 status bar)
1. Connect the iPhone by cable and unlock it.
2. On the Mac: QuickTime Player → File → **New Movie Recording**. Click the ▾ next to Record → Camera: **your iPhone**; Microphone: **your iPhone** (captures app audio and TTS); Quality: Maximum.
3. iOS switches its status bar to a generic **9:41, full signal, full battery** while mirrored, on the phone itself too, and there is no screen-recording indicator. [Secondary: tekrevue, loopinsight 2015; Apple Community 2021. Re-check on iOS 26/27 in a 10-second test clip.]
4. Record each scene as a separate take of about 10–30 s. Save as .mov.

### 9.3 Backup A: built-in iOS Screen Recording
1. Add **Screen Recording** to Control Center if it isn't already there.
2. Long-press it to toggle the microphone. Keep it **off**, since app audio is still captured and narration is recorded separately [Unverified].
3. Tap it, wait for the 3-second countdown, record, then stop from the status-bar or Dynamic Island indicator.
4. The clip saves to Photos.
5. Trim the Control Center open/close at both ends.
6. The real clock and battery will show, so set the phone charged and on Wi-Fi.

### 9.4 Backup B: iOS Simulator (deterministic, no signing)

```bash
npx expo run:ios --configuration Release            # Simulator build
xcrun simctl status_bar booted override --time "9:41" --batteryState charged --batteryLevel 100 \
  --cellularMode active --cellularBars 4 --wifiBars 3 --dataNetwork wifi
xcrun simctl io booted recordVideo --codec=h264 take01.mov    # Ctrl-C to stop
xcrun simctl location booted set 30.2672,-97.7431            # only if the app uses real location
xcrun simctl status_bar booted clear                         # undo
```

[Secondary: jessesquires.com simctl status_bar; simctl references. Run `xcrun simctl status_bar help` / `xcrun simctl io help` / `xcrun simctl location help` on the installed Xcode to confirm flags.]
- Device Hub (Xcode 27) also has a **Record** button for simulators, saved to the Desktop [Verified: Apple].
- The Simulator shows local notifications and a lock screen (Controls → Lock). It has **no haptics**, and MapLibre performance differs. Use it only as the backup or for UI-QA.

### 9.5 Showing touches
iOS has no system "show touches" for recordings [Unverified]. Options:
- **(a) In-app overlay (recommended, Demo builds only).** A root wrapper observes touches without stealing them and draws fading circles. Toggle it from a hidden "Director" panel.

  ```tsx
  // src/demo/TouchOverlay.tsx   [Unverified: compile + test on device]
  import { useState, type ReactNode } from 'react';
  import { View, StyleSheet, type GestureResponderEvent } from 'react-native';
  import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
  type Dot = { id: number; x: number; y: number };
  let seq = 0;
  export function TouchOverlay({ enabled, children }: { enabled: boolean; children: ReactNode }) {
    const [dots, setDots] = useState<Dot[]>([]);
    const onTouchStart = (e: GestureResponderEvent) => {
      if (!enabled) return;
      const { pageX: x, pageY: y } = e.nativeEvent;
      const id = ++seq;
      setDots((d) => [...d, { id, x, y }]);
      setTimeout(() => setDots((d) => d.filter((p) => p.id !== id)), 380);
    };
    return (
      <View style={{ flex: 1 }} onTouchStart={onTouchStart}>
        {children}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {dots.map((p) => (
            <Animated.View key={p.id} entering={FadeIn.duration(60)} exiting={FadeOut.duration(260)}
              style={{ position: 'absolute', left: p.x - 22, top: p.y - 22, width: 44, height: 44,
                       borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.28)',
                       borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)' }} />
          ))}
        </View>
      </View>
    );
  }
  ```

  Expected limits [Unverified]:
  - Taps on natively presented sheets or system alerts may draw **under** them or not at all.
  - A map pan can cancel the touch stream, so only the start dot shows.
  - Check the NativeTabs tab bar on the device.
- **(b) In the editor.** Add tap markers in post (CapCut/iMovie/DaVinci) at the frames where the UI responds. Works for everything, including system UI.
- **(c) Film hands.** Shoot a second-camera B-roll of a finger tapping the phone for the intro and outro.

### 9.6 Format for a 16:9 CAC video
- **Phone recordings are portrait at native resolution** [Unverified: exact pixels depend on the model, and frame rate is commonly 60 fps but unconfirmed]. Check a test clip with MediaInfo or `ffprobe` and set the editor timeline to match (30 or 60 fps).
- **Composition:** use a 1920×1080 (or 3840×2160) canvas with a #0E1726 background. Put the phone capture in a device frame on one side and captions or a gauge/forecast diagram on the other. Keep the phone at about 85–90% of canvas height, so native-res footage downsamples (stays sharp).
- **Audio:** record the student's narration separately with a good mic. Keep app audio (TTS) at about -12 dB under the voice.

### 9.7 Honesty and take discipline (protects the student at Q&A)
- Keep the "Simulated storm · Demo data" chip on screen during every scenario shot. Put "Simulated" in the notification subtitle. Use one title card: "Demonstration uses simulated gauge data; the forecasting logic runs on-device."
- Never show a fabricated **official** closure as real. Label official-closure overrides "(simulated)" in scenarios.
- Use deterministic scenarios: a reset button returns to t=0, and the same seed always gives the same storm. Record 3 takes per scene and keep the best.

---

## 10. Location for the demo: Xcode GPX vs in-app scripted (recommendation: scripted)

| | Xcode location simulation (GPX) | In-app scripted location (scenario engine) |
|---|---|---|
| Setup | Edit Scheme → Run → Options → **Allow Location Simulation** + default location or GPX. Debug → Simulate Location while running. | `DemoLocationProvider` replays a polyline at scenario speed. A real `expo-location` provider sits behind the same interface. |
| Works in Release / unplugged | Only while Xcode is attached and debugging. Reported to persist until "Don't Simulate Location" or disconnect. | **Yes** |
| GPX support | **Waypoints (`wpt`) only. `rte`/`trk` are not supported.** Timing comes from waypoint times. | Any path, any speed, pause/seek |
| Sync with the simulated storm | Manual | **Exact** (same clock) |
| Permission prompts during takes | Yes (real Core Location) | None |
| Honesty | Looks "real", which is risky to imply | Labeled demo mode |

Sources: [Secondary: Apple Help "Simulate a runtime location in the scheme editor" (via search excerpt); telusdigital; dev.to]. **Use scripted location for every video take.** Keep a real "Use my location" button that calls `expo-location` (`requestForegroundPermissionsAsync`, `watchPositionAsync`) so judges can see the live path exists.

---

## 11. Timeline vs the 7-day profile (deadline: submit by Sun Oct 25)

| Date | Step |
|---|---|
| Thu Oct 15 – Fri Oct 16 | Phase A–D smoke test with the **final bundle ID**. **Go/no-go gate:** a Release build launches on the phone, the map renders, a local notification shows on the lock screen, and TTS is audible. If you're on the Xcode 27 path, this proves scene support plus the pod floor. |
| Oct 16–21 | UI build and polish (Simulator plus device Debug). Profile from Oct 16 expires about Oct 23. |
| Wed Oct 21 | UI freeze, then the Release install. If the profile expires before Oct 24, let it expire and rebuild on recording day (5 min). |
| Thu Oct 22 – Fri Oct 23 | Record (QuickTime primary, plus on-device and Simulator backups). |
| Sat Oct 24 | Edit, captions, export 1080p/4K 16:9. |
| Sun Oct 25 | Submit. Keep the Mac setup intact for any later live demo, which needs a rebuild that day. |

---

## 12. Open risks to check on day 1

1. **iPhone iOS version.** It decides Xcode 26.6 vs 27.1 (§3). Also check the Mac can run Tahoe 26.2+ / 26.6+.
2. **Scene support with our libraries** (MapLibre 11.5.0, Skia, Reanimated, screens, NativeTabs) on Xcode 27. Expo validated the template, but our libraries are [Unverified]. Smoke-test a screen with the map plus a Skia view.
3. **The student's Apple Account** may be a child account and refused for developer use. Fallback: a parent's Apple Account in Xcode [Secondary].
4. **App Groups on the free team.** Only matters if you attempt the Live Activities stretch.
5. **QuickTime 9:41 behavior on iOS 26/27.** Confirm with a 10-second test clip.
6. **Touch overlay behavior** over native tabs, sheets and the map.

---

## Sources

**Primary: Apple**
- https://developer.apple.com/support/compare-memberships/ (free-team limits: 10 App IDs / 3 devices / 3 apps / 7-day profiles)
- https://developer.apple.com/xcode/system-requirements/ (Xcode 26.x / 27.x macOS, SDK, device support)
- https://developer.apple.com/documentation/xcode/enabling-developer-mode-on-a-device
- https://developer.apple.com/documentation/xcode/managing-your-simulated-and-physical-devices-in-device-hub
- https://developer.apple.com/documentation/xcode/running-your-app-on-simulated-or-physical-devices
- https://developer.apple.com/documentation/xcode/interacting-with-your-app-in-device-hub
- https://developer.apple.com/documentation/xcode/capturing-screenshots-and-videos-from-devices
- https://developer.apple.com/documentation/xcode/configuring-the-environment-of-a-simulated-device
- https://developer.apple.com/help/account/reference/supported-capabilities-ios (rows only; checkmarks not machine-readable)
- https://developer.apple.com/forums/thread/811929 (DTS: Push and iCloud are paid-only)
- https://developer.apple.com/forums/thread/834802 (DTS: personal teams use their own App Group identifiers)

**Primary: Expo / React Native**
- Issues:
  - https://github.com/expo/expo/issues/46664 (Xcode 27 UIScene; `ios.enableSceneSupport`)
  - https://github.com/react/react-native/issues/58555 (Xcode 27 deployment-target hard error on resource bundles)
- npm package sources inspected:
  - expo@57.0.30 (bundledNativeModules, template Podfile)
  - @expo/cli@57.0.31 (`run:ios` flags, code signing, Device Hub, prebuild `--clean`)
  - @expo/prebuild-config@57.0.19 (auto-applied expo-notifications)
  - @expo/config-plugins@57.0.10 (mod ordering, `withPodfile`, `CodeGenerator`)
  - expo-notifications@57.0.23 (aps-environment, `InterruptionLevel`, `NotificationBehavior`)
  - expo-widgets@57.0.26 (aps-environment, App Groups, `NSSupportsLiveActivities`, local `pushType: nil`)
  - expo-build-properties@57.0.22 (`enableSceneSupport`, `usePrecompiledModules`, `buildReactNativeFromSource`)
  - expo-location@57.0.21, expo-speech@57.0.3
  - @maplibre/maplibre-react-native@11.5.0 (SPM MapLibre 6.31.0, `$MLRN.post_install`)
  - react-native@0.86.3 (`updateOSDeploymentTarget`)
  - react-native-svg@15.15.4, lottie-react-native@7.3.8, @react-native-async-storage/async-storage@2.2.0 (podspecs)
- Local test: `expo prebuild -p ios --no-install` matrix A–E plus W (this report, §4).

**Secondary**
- https://github.com/heyskylark/omp-mobile/pull/11 (free-team capabilities; push is the only blocker)
- https://github.com/expo/expo/issues/18951 (aps-environment needs a custom plugin to remove)
- https://developer.apple.com/forums/thread/718388 (Personal team / push capability error)
- https://developer.apple.com/forums/thread/675347, https://developer.apple.com/forums/thread/701805 (App ID limit)
- https://developer.apple.com/forums/thread/49304, https://developer.apple.com/forums/thread/652164 (3-app limit, offloaded apps)
- https://developer.apple.com/forums/thread/732495, https://developer.apple.com/forums/thread/685271 (Trust developer)
- https://www.tekrevue.com/tip/record-iphone-screen-quicktime/, https://www.loopinsight.com/2015/04/04/recording-the-screen-of-your-ios-8-device/, https://discussions-kr-prz.apple.com/thread/252580593 (QuickTime 9:41)
- https://www.jessesquires.com/blog/overriding-status-bar-settings-ios-simulator/ (simctl status_bar)
- https://help.apple.com/xcode/mac/current/en.lproj/dev8dbd2f820.html, https://www.telusdigital.com/insights/digital-experience/article/simulating-location-in-ios, https://dev.to/arshtechpro/mocking-gps-location-in-ios-a-simple-guide-51e (GPX location)
- https://developer.apple.com/videos/play/wwdc2021/10091/ (interruption levels)
- https://developer.apple.com/forums/thread/128800, https://developer.apple.com/forums/thread/704235 (age / free account)
