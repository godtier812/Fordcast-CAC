This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

---

# FordCast DEMO EDITION — rules for coding agents (keep ≤ 120 lines)
Spec: docs/demo-prompt/ (start with 00-START-HERE.md). docs/master-prompt/ is the future roadmap: read it only
where a Demo Edition § points to it. If anything here conflicts with docs/demo-prompt/, docs/demo-prompt/ wins.

1. SAFETY: never write copy that calls a crossing or route safe/clear/passable/open/normal (EN or ES).
   States: NO_RISE · WATCH · AVOID · CLOSED · UNKNOWN only. Times are ranges ("15–30 min"), never countdowns;
   travel time is a range too ("30–45 min"). Stale/missing data ⇒ UNKNOWN. Official closures override. No Success haptic. No green.
2. HONESTY: all data is simulated and MUST be labeled (DEMO chip, violet SIMULATED pill/frame, SIMULATED STORM banner,
   SIMULATED DRIVE, notification subtitle "Simulated storm · demo data"). Closure source = "Simulated road crew", never a
   real agency. No POD/FAR/CSI/accuracy numbers. No links to real USGS gauge pages. No "live"/"real-time" words.
3. iOS ONLY, free Personal Team: plugins/withFreeTeamSigning.js stays FIRST in app.config.ts plugins; never add push,
   time-sensitive, critical-alert, iCloud or associated-domain entitlements; never hand-edit ios/ (prebuild regenerates it).
4. Expo SDK 57 is frozen (latest is 58: never @latest). Native packages ONLY via `npx expo install`. MapLibre RN v11 API only.
5. All user-facing strings live in mobile/src/locales/{en,es}.json (+ *_spoken keys); run the banned-words + parity tests.
6. ★ Student-owned files (demo/engine/baseline-rule.ts, state-machine.ts, travel-time.ts): never implement or copy the
   prototype into them. Write tests + skeleton + docs/explain, then stop and hand off (§1.8).
7. The engine (mobile/src/demo/engine/) is PURE: no React, no Date.now(), no imports from demo/sim/. Truth is used only in
   scenario/compile.ts results.
8. No runtime network calls except OpenFreeMap tiles. Baked data lives in mobile/src/demo/data/.
9. Never invent packages, props, APIs, entitlements or versions; VERIFY BEFORE USE items are logged in docs/decisions/verifications.md.
10. Before committing: npx tsc --noEmit, npx eslint ., npx jest (engine, display, takes, golden, copy, parity, claims). Small Conventional Commits.
