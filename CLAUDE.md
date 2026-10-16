@AGENTS.md

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
