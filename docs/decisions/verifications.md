# Verifications log (01 §1.3 rule 8)

Every VERIFY BEFORE USE item, version check and device result: date, check, result. Newest entries at the bottom
of each section. "Cloud" = the agent's Linux container (no Xcode); "Mac" / "iPhone" = the student's machines.

## Environment and versions

| Date | Where | Check | Result |
|---|---|---|---|
| 2026-10-16 | Cloud | `npm view expo dist-tags` | `sdk-57` = 57.0.30, `latest` = 58.0.14 (never used). Template `expo-template-default` `sdk-57` = 57.0.32 |
| 2026-10-16 | Cloud | Network policy | `api.expo.dev`, `exp.host` and `reactnative.directory` are denied. `npx expo install` ran with `EXPO_OFFLINE=1`, which resolves from the installed `expo@57.0.30/bundledNativeModules.json` (the file §9.3 names as the source of the pins); `npm` registry works |
| 2026-10-16 | Cloud | Installed versions vs 01 §1.3 pins | expo 57.0.30 · expo-router 57.0.28 · react 19.2.3 · react-native 0.86.3 · reanimated 4.5.1 / worklets 0.10.1 · react-native-screens 4.26.2 · MapLibre RN 11.5.0 · Skia 2.6.2 · react-native-svg 15.15.4 · expo-notifications 57.0.23 · expo-speech 57.0.3 · expo-audio 57.0.5 · expo-haptics 57.0.3 · expo-location 57.0.21 · expo-localization 57.0.2 · expo-build-properties 57.0.22 · expo-glass-effect 57.0.4 · expo-blur 57.0.3 · @expo/ui 57.0.25 · nativewind 4.2.7 / tailwindcss 3.4.19 · zustand 5.0.15 · i18next 26.4.4 · react-i18next 17.0.16 · jest 29.7.0 · jest-expo 57.0.6 · @react-native/jest-preset 0.86.3 · typescript 6.0.3 — **all match** |
| 2026-10-16 | Cloud | §1.3 rule 4 (≥ 2 weeks old) for unpinned §9.3 packages | `@testing-library/react-native` latest 14.1.0 was published 2026-10-08 → pinned **14.0.1** (2026-06-23, same peers). Its peer `test-renderer` resolved to 1.3.1 (2026-10-12, 4 days old): dev-only, never shipped; left as is. `tailwind-merge` 3.7.0 (2026-09-12), `@rn-primitives/slot` 1.5.2, `@rn-primitives/portal` 1.4.0 (`~1.4.0` per §9.3) |
| 2026-10-16 | Cloud | `npx expo install --check` (offline) | "Dependencies are up to date" |
| 2026-10-16 | Cloud | `npx expo-doctor@latest` | 19/21 pass. The 2 failures (config schema, React Native Directory) need the denied hosts → **re-run on the Mac** |
| 2026-10-16 | Cloud | `research/withFreeTeamSigning.js` vs 02 §9.5 listing | differs only in a comment ("app.json" vs "app.config.ts") and the path header; the §9.5 listing is the one committed |

## Config plugins and APIs (checked in the installed `.d.ts`)

| Date | Check | Result |
|---|---|---|
| 2026-10-16 | `expo-build-properties` `ios.enableSceneSupport` · `expo-localization` `supportedLocales` · `expo-font` `fonts` · `expo-location` `locationWhenInUsePermission` · MapLibre `app.plugin.js` · Inter TTF paths | all exist |
| 2026-10-16 | Smoke screen: MapLibre `Map` + `Camera` (`mapStyle`, `initialViewState`) · `SchedulableTriggerInputTypes.TIME_INTERVAL`, `subtitle`, `interruptionLevel` · expo-speech `useApplicationAudioSession` · expo-audio `setAudioModeAsync({ playsInSilentMode, interruptionMode })` · Skia `Canvas`/`Circle` | all exist; `tsc --noEmit` clean |

## Prebuild checks (02 §9.7)

| Date | Where | Result |
|---|---|---|
| 2026-10-16 | Cloud, `npx expo prebuild -p ios --no-install --clean` with the placeholder bundle ID (`FORDCAST_ALLOW_PLACEHOLDER_ID=1`; nothing signed) | `grep -c aps-environment ios/*/*.entitlements` → **0** (entitlements dict empty) · `fordcast-pod-deployment-target-floor` present · `$MLRN.post_install(installer)` present · post_install order: floor → MLRN → `react_native_post_install` · `UIApplicationSceneManifest` present (Path B) · `fordcast` URL scheme ×1 · `LSApplicationQueriesSchemes` comgooglemaps, waze · `UIUserInterfaceStyle` Dark · `es.lproj/InfoPlist.strings` has the Spanish location string (§9.6 VERIFY) · 4 Inter fonts in Info.plist · `ios/` not tracked by git |
| 2026-10-16 | Cloud, `npx expo export --platform ios` | Hermes bundle builds (4.2 MB): no import or Babel error in the Release JS |
| — | Mac (student), after setting `BUNDLE_ID` | _paste the §9.7 grep output here_ |

## Mac / Xcode / iPhone (02 §8, student)

| Item | Result |
|---|---|
| iPhone | iPhone 15 Plus, iOS 27 (Step 0) → Path B; automatic updates off |
| macOS (`sw_vers`) | 26.5.1 per Step 0. **Path B needs 26.6+ for Xcode 27.1** (02 §8.1) — open |
| `xcodebuild -version` | _pending_ (student plans an Xcode beta — open) |
| `node -v` (≥ 22.13) · `pod --version` | _pending_ |
| Xcode shows "(Personal Team)" | _pending_ (Step 0 Q3) |
| iPhone paired · Developer Mode on | _pending_ |
| Provisioning profile expiry date (§11.4) | _pending_ |

## Day 1 smoke test (02 §9.10) — gate: S1, S2, S3, S8 must pass

| # | Check | Debug | Release |
|---|---|---|---|
| S1 | Signs and installs with the final bundle ID | | |
| S2 | Dark map tiles within 3 s, pans smoothly | | |
| S3 | "Notify in 8 s" → Lock Screen banner with title + subtitle; tap opens the app | | |
| S4 | Speech audible: Silent off / Silent on | | |
| S5 | Error haptic felt | | |
| S6 | Skia circle smooth | | |
| S7 | Path B: no "UIScene life cycle is required" crash | | |
| S8 | Release opens unplugged with Wi-Fi off (after one online launch) | — | |
