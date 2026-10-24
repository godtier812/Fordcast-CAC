You are acting simultaneously as:
1. **Chair of the Congressional App Challenge (CAC) Judging Panel (TX-10 / Central Texas)**
2. **Principal Safety-Critical Systems & Product/UX Auditor**
3. **Executive Producer for 1st-Place Congressional App Challenge Demo Videos**

## TIME-CRITICAL CONTEXT — READ CAREFULLY
We are shooting our official **Congressional App Challenge Demo Video tomorrow**. This is our final pre-shoot audit and upgrade pass. Now is NOT the time for polite praise, vague suggestions, or surface-level checks.

Your job has **four mandatory deliverables** in one comprehensive report (`C:/2025AppChallenge/docs/results/cac-judge-round4-demo-ready-2026-10-21.md`):
1. **Zero-Mistake Verification & Code/UI Bug Hunt:** Verify our Round 3 repairs + Expo Go deployment fixes, run all test suites (mobile, extension, backend), inspect the live UI and code paths, and catch **every** remaining mistake, visual flaw, state bug, awkward wording, or edge case that could ruin a video take tomorrow or cost us points with judges.
2. **Brutal Feasibility, Originality & Community Impact Verdict:** Tear down whether FordCast is genuinely feasible, original (compared to `DriveTexas`, `ATXFloods`, `Google Maps`, `Waze`, and `NWS`), and impactful for everyday people in TX-10 / Central Texas. Identify any weak spots in our argument or product workflow and prescribe concrete solutions.
3. **Actionable, Coding-Agent-Ready Implementation Spec (`P0` Fixes & `P1` 1st-Place Advancements):** Every fix or advancement you recommend MUST specify **exact file paths, component/function names, and concrete code/UI/copy changes** so our coding agent can immediately implement 100% of your report tonight before tomorrow’s shoot.
4. **Second-by-Second 1st-Place CAC Demo Video Blueprint (`0:00–2:45`):** Give us the exact camera choreography, screen sequence, clicks, presets, voiceover script, and any "Camera-Ready / Demo Director" UI enhancements our coding agent should add tonight so tomorrow’s recording is effortless and unforgettable.

---

## 1. What Was Fixed Since Round 3 (Verify All 10 Items First)

### A. All 7 Round 3 Peer-Review Findings Resolved
1. **P1 #1 — Web Guardian Module Contract (`mobile/src/lib/guardian-cache.ts`, `guardian.ts`, `guardian.web.ts`):**
   - Extracted platform-agnostic `buildGuardianHazardsFromStatuses`, `extractSourceEvidence`, `upsertHazardSource`, `hasSource`, `HAZARD_CACHE_KEY`, and `RETENTION_MAX_AGE_MS` into `guardian-cache.ts` and re-exported them from both `guardian.ts` (native) and `guardian.web.ts` (web).
2. **P1 #2 — Route Coverage Excursion & Distance Weighting (`mobile/src/lib/routing.ts`):**
   - `assessRouteCoverage` now checks every polyline vertex plus interpolated segment samples every `<= 2 km`. Any vertex or segment excursion outside `insideCoverage` sets `outsideCoverage = true`, and `coverageFraction` is weighted by physical segment length (`km`) rather than raw vertex count.
3. **P1 #3 — Per-Source Guardian Cache Retention & NWS Alert Expiry (`mobile/src/lib/monitor-context.ts`, `monitor.tsx`, `guardian-cache.ts`, `guardian.ts`):**
   - `CrossingStatus['alert']` now preserves `expires: string | null` and `flashFlood: boolean`.
   - `TaggedHazard` stores per-source evidence (`bySource.atx`, `bySource.nws`, `bySource.usgs`). During partial feed outages, only the offline source’s prior evidence is retained (within 2h and before NWS `expiresAtMs`), while healthy sources update and clear stale hazards immediately.
4. **P1 #4 — Live Observation Aging & Closure Check Freshness (`mobile/src/lib/monitor-context.ts`, `monitor.tsx`, `mobile/src/app/(tabs)/drive.tsx`, `mobile/src/screens/home/RoutePanels.tsx`):**
   - Added a ticking `nowMs` wall-clock reference on `MonitorValue` (ticks every 15s and on refresh).
   - Drive HUD (`obsAgeMin`) and RoutePanels (`obsAgeLabel`, `closureAgeLabel`) compute ages against `nowMs` so gauges age continuously during network loss, and multi-day closures distinguish recent ATXFloods checks (`closure checked Xm ago`) from offline cached closures (`cached official closure (feed offline)`).
5. **P1 #5 — Waterway Identity & NOAA `event_id` Deduplication (`tools/build_flood_history.py`, `mobile/assets/history/crossing_history.json`, `mobile/src/lib/danger.ts`):**
   - Regenerated `crossing_history.json` to include authoritative NOAA `event_id` on each recent event and `event_ids` on each crossing.
   - `creekStemKey` preserves waterway type nouns (`creek`, `branch`, `river`, `fork`, `slough`, `draw`, `run`, `hollow`, `tributary`) so distinct waterways (e.g., Onion Creek vs. Onion Branch) never collapse.
   - `countDistinctHistoryEvents` deduplicates shared storm events across nearby crossing arms by NOAA `event_id` (and crossing-invariant metadata excluding `dist_km`).
6. **P1 #6 — Submission & Locale Provenance (`FordCast_CAC_Submission.md`, `mobile/src/locales/en.json`, `mobile/src/locales/es.json`):**
   - Reconciled all gauge IDs, crossing IDs, and historical counts with bundled seed files (`tc-167` Henry Marx @ Barton Creek paired with `USGS-08155240` / `USGS-08155300`; `atx-19`/`20`/`21` E. William Cannon Dr on Onion Creek paired with `USGS-08158860` / `USGS-08159000`; `727` NOAA flood events `1996–2026`).
7. **P2 #7 — Unified Voice Mute State (`mobile/src/lib/monitor.tsx`, `mobile/src/app/(tabs)/drive.tsx`):**
   - Synchronized `setVoiceMuted(!settings.voiceAlerts)` in `monitor.tsx` and synced Drive HUD’s mute toggle with `updateSettings({ voiceAlerts })`.

### B. All 3 Expo Go Deployment / Runtime Fixes
8. **Fix A — `expo-notifications` Android Expo Go Startup Crash (`mobile/src/lib/notify.ts`):**
   - Replaced root barrel `import * as Notifications from 'expo-notifications'` (which in SDK 53+ loads `DevicePushTokenAutoRegistration.fx.ts` -> `warnOfExpoGoPushUsage.ts` and throws an uncaught `Error` on Android in Expo Go at import time) with direct submodule imports (`expo-notifications/build/NotificationsHandler`, `NotificationPermissions`, `scheduleNotificationAsync`, `setNotificationChannelAsync`, `NotificationChannelManager.types`).
9. **Fix B — Custom Native Module `@maplibre/maplibre-react-native` Removed from Expo Go Bundle (`mobile/src/features/map/MapSurface.tsx`, `NativeMap.tsx`, `mobile/app.json`):**
   - Routed `MapSurface.tsx` and `NativeMap.tsx` to `MapSurface.web.tsx` (`react-native-svg` tactical map, 100% compatible with iOS, Android, and Web in Expo Go) and removed `@maplibre/maplibre-react-native` from `app.json` plugins.
10. **Fix C — Expo Go Detection in `guardian.ts` (`mobile/src/lib/guardian.ts`):**
    - Added `isExpoGoClient()` using `isRunningInExpoGo()` from `'expo'` and `Constants.executionEnvironment === ExecutionEnvironment.StoreClient` in addition to `Constants.appOwnership === 'expo'`.

---

## 2. Mandatory Audit Protocol (Execute Step-by-Step)

### Step 1: Automated Verification & Adversarial Testing
Run and report exact outputs for:
1. Mobile TypeScript: `cd c:\2025AppChallenge\mobile && node node_modules/typescript/bin/tsc --noEmit --pretty false`
2. Mobile ESLint: `cd c:\2025AppChallenge\mobile && node node_modules/expo/bin/cli lint`
3. Mobile Jest Suite: `cd c:\2025AppChallenge\mobile && node node_modules/jest/bin/jest.js --runInBand --watchAll=false` (currently 6 suites, 82 tests)
4. Chrome Extension Tests: `cd c:\2025AppChallenge && node extension/test.mjs` (18 tests)
5. Python Backend / Scientific Suite: `c:\2025AppChallenge\backend\.venv\Scripts\python.exe -m pytest c:\2025AppChallenge\backend\tests`
6. Write and run **new adversarial probes** testing any edge cases you suspect in the demo flow, routing, storm simulation, Drive HUD, Crossing Detail Sheet, Science Lab (`/lab`), or Chrome extension.

### Step 2: End-to-End Demo Journey Walkthrough (Code + Live UI if browser available)
Trace every screen and interaction that will appear on camera tomorrow:
1. **First Launch & Safety Pledge (`Pledge.tsx`):** Does it look crisp, authoritative, and fast to complete on camera?
2. **Home Screen & Commute Audit (`HomeScreen.tsx`, `RoutePanels.tsx`, `LiveMap`):**
   - Preset trips (`Onion Creek -> Downtown`, `Barton Creek -> UT`, `Bull Creek -> Domain`).
   - Are there any visual overlaps, clipped badges, confusing labels, slow transitions, or missing context when a user taps a preset commute?
   - Does the Commute Audit card clearly explain *what* crossings are on the route, *how many* have flooded before (NOAA history), and *what* their current official + sensor status is?
3. **Interactive Storm Drill & Moving-Car Reroute (`HomeScreen.tsx`, `drill.ts`, `RoutePanels.tsx`, `voice.ts`):**
   - When the user triggers the Storm Drill (`T+0` -> `T+15` -> `T+30` -> `T+45` or Moving-Car Demo), does the route visibly turn hazardous, trigger the neural voice alert, compute the Valhalla detour around the closed/avoid crossing, and show the `Safer detour (+X min)` cleanly?
   - Are there ANY glitches if the user switches from Live to Storm Drill and back, or clicks multiple presets during a take?
4. **Crossing Detail Sheet (`HomeScreen.tsx`, `CausalHydrograph.tsx`, `ArrivalBucketStrip.tsx`, `ProvenanceCard.tsx`):**
   - When tapping `E. William Cannon` (`atx-19`/`20`/`21`) or `Henry Marx @ Barton Creek` (`tc-167`), or an uncalibrated crossing like `Old Spicewood Springs Rd`:
   - Is the distinction between **live gauge data**, **30-year NOAA storm history**, and **archived storm backtest** 100% clear and visually impressive?
5. **Drive Mode (`drive.tsx`) & Alerts/Saved (`alerts.tsx`) & Science Lab (`/lab`, `CockpitScreen.tsx`, `replay.tsx`):**
   - Check every button, header, back navigation, voice mute toggle, and chart.
6. **Google Maps Chrome Extension (`extension/fordcast.js`, `extension/lib.js`):**
   - Check how it looks and behaves for a quick 15-second cameo in the demo video.

---

## 3. Brutal Feasibility, Originality & Impact Evaluation Rubric

Judge the project ruthlessly on the 3 Congressional App Challenge pillars and answer these exact questions:

### A. Feasibility (Can this actually work in the real world?)
- What parts of FordCast are **100% operational today** with real live public feeds (ATXFloods GraphQL/REST, USGS OGC API 00065, NWS CAP polygons, Valhalla routing, NOAA NCEI history)?
- What parts are **research / pilot scope** (4 calibrated gauge-to-crossing records across 2 physical corridors out of 141 cataloged crossings; Austin-basin coverage gate)?
- Are there any remaining places where the UI accidentally overpromises or under-explains how a driver would actually use this on a rainy morning?

### B. Originality (Why shouldn't a judge just say "Use DriveTexas or Google Maps"?)
- Compare FordCast directly against:
  1. **TxDOT DriveTexas (`drivetexas.org`)** — state highway conditions & cameras, but lacks neighborhood/city low-water crossings, upstream USGS creek-rise velocity (`+ft/30m`), and per-crossing 30-year NOAA flood history on your personal route.
  2. **ATXFloods (`atxfloods.com`)** — shows static open/closed dots on a map, but has **no route planner**, **no automatic detour calculation around closed crossings**, **no upstream USGS hydrograph trend**, and **no historical risk audit** for a commuter's route.
  3. **Google Maps / Waze** — often routes drivers directly into newly flooded low-water crossings because crowd-sourced closure reports lag behind flash floods; FordCast's Chrome extension and mobile router actively exclude hazardous crossings (`exclude_locations`) and explain *why* with official + sensor + historical evidence.
- **Crucial Question:** Does our current UI make this 3-way differentiation **obvious at a glance on camera**, or do we need a dedicated, high-impact visual element / comparison callout in the app and submission so judges immediately grasp why FordCast is original?

### C. Community Impact & Everyday Applicability (Winning 1st Place in TX-10)
- Over 50% of flood fatalities in Texas occur in vehicles, and Central Texas ("Flash Flood Alley") leads the nation in low-water crossing rescues.
- How can we make the app feel **indispensable to an everyday commuter, parent, teen driver, or rural/suburban TX-10 resident** within the first 20 seconds of the video?
- Identify the **top 3–5 concrete, high-impact improvements** (UI polish, data presentation, demo workflow, or everyday-commuter context) that can be implemented **tonight in <2 hours** without destabilizing the tested core.

---

## 4. Required Output Format for Your Report

Write your full report to `C:/2025AppChallenge/docs/results/cac-judge-round4-demo-ready-2026-10-21.md` and structure it with these exact sections:

1. **Executive CAC Readiness Scorecard (0–10 per pillar: Impact, Originality/Feasibility, UI/UX, Technical Execution, Demo Video Readiness)** with brutal justification.
2. **Round 3 + Expo Go Verification Matrix** (Pass/Fail with evidence for all 10 items + test suite outputs).
3. **Every Remaining Mistake or Demo Hazard (`P0` Must-Fix Tonight)** — exact file path, line numbers, what goes wrong on camera or in code, and exact replacement code/copy.
4. **High-Leverage 1st-Place Advancements (`P1` Implement Tonight Before Shoot)** — 3 to 5 surgical, high-impact upgrades (with exact file paths and implementation specs) that elevate visual polish, everyday commuter relevance, and originality vs. DriveTexas/ATXFloods/Google Maps.
5. **Second-by-Second 1st-Place CAC Demo Video Blueprint (`0:00–2:45`)** — a complete table with:
   - Timestamp (`0:00–0:15`, etc.)
   - On-Screen Action (exact screen, button click, preset, or camera angle)
   - Visual Highlight (what the judge’s eye must see)
   - Exact Voiceover Script (word-for-word, punchy, authentic, zero fluff)
6. **Pre-Shoot Checklist for Tomorrow Morning** (Expo Go setup, Web desktop setup, Chrome extension setup, audio/voice check, and fallback plan).