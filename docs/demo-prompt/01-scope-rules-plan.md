# FordCast DEMO EDITION — Part 1: Scope, rules & plan (§1–§7)

> Addressed to the AI coding agent (Claude Code). This file tells you **how to work**, **what story the app tells**, **the safety and copy rules that override everything**, **every feature and where it lives on screen**, **where every file goes**, **what to build each day from Thu Oct 15 to Sun Oct 25, 2026**, and **what "done" means**.
>
> **Precedence when two instructions conflict:** (1) §3 safety, states and copy → (2) the decision sheet in `00-START-HERE.md` → (3) the Demo Edition § that owns the topic → (4) the research files in `docs/demo-prompt/research/` → (5) the full production prompt in `docs/master-prompt/` (only where a Demo Edition § points to an exact file and §). If you still can't resolve it, stop and ask (§1.7).
>
> **Tags used in every Demo Edition file**
> - **[MUST-SHOW]** built, polished and filmed for the video. **[SHOULD-SHOW]** built and polished; filmed for ≤ 5 s if time allows. **[BUILD-ONLY]** must exist (honesty, legal, presenter tooling) but is not featured. **[NEXT]** not built; appears only as a "Planned" row in *What's real in this demo* or a voice-over line, never as a dead button.
> - **[Verified: source]** read in a primary source (npm package source/types, Apple docs) or run locally. **[Secondary: source]** credible non-primary source. **[Unverified]** inference; check before code depends on it. **VERIFY BEFORE USE:** a check you MUST run (and log in `docs/decisions/verifications.md`) before relying on the item.
> - "A §3.7" = `docs/master-prompt/01-A-rules-product-plan.md` §3.7; "B", "B2", "C", "D1", "D2", "E" = files 02-B1, 03-B2, 04-C, 05-D1, 06-D2, 07-E of the full prompt. "research-ios/ui/data" = `docs/demo-prompt/research/research-{ios,ui,data}.md`. "proto/" = `docs/demo-prompt/research/proto/`.

---

## §1. Agent rules (Demo Edition)

### 1.1 Before you start

1. **Read `docs/demo-prompt/00-START-HERE.md` → `06-video-and-submission.md` once, end to end.** Then re-read §1, §3, §4 and §6. The safety copy, honesty labels, version pins and the ★ student-file rule apply everywhere and are stated once.
2. **The Demo Edition replaces the full production prompt for now.** Don't build anything from `docs/master-prompt/` that this edition doesn't ask for: no backend, no Supabase/Render, no EAS, no push, no Android, no live USGS. Open a full-prompt file only when a Demo Edition § points to an exact file and §, and read only that part.
3. **Do Step 0 (§1.2) before writing code.** Don't scaffold, install or create anything until the human has answered.
4. **Work UI-first, in the §6 day order.** Every [MUST-SHOW] item due that day comes before any [SHOULD-SHOW] item. [NEXT] items are never built.
5. **Nothing simulated is ever presented as real.** Simulated data is allowed in the shipped app only with the labels in §3.9 and §31. That rule beats every deadline.
6. **The research prototype is the engine spec.** `proto/` (TypeScript, `bun test` → 21 pass, `tsc --strict --noUncheckedIndexedAccess` → 0 errors [Verified: research-data §0]) and `research-data.md` define the dataset, scenarios, clock, notification plan, drive plan and takes. Port them into `mobile/src/demo/` (§5) instead of reinventing them, **except the three ★ files** (§1.8), which you never copy.
7. **Where you run matters.** Run Claude Code **in a terminal on the student's Mac** at the repo root, so you can run `npx expo run:ios`, the iOS Simulator, `jest` and `tsc` yourself. If you are running in a cloud container (Linux, no Xcode), you can still write code, run `jest`/`tsc` and `npx expo prebuild -p ios --no-install`; the student then runs every device command from §8–§11 and pastes the output back. Say which mode you're in at the start of each session.

### 1.2 Step 0 — questions to ask the human before coding

Ask these in **one message**, wait for the answers, then record them in `docs/decisions/step0.md` and commit it (`docs(decisions): step 0 answers`).

| # | Question | Why it matters | Default if unknown |
|---|---|---|---|
| 1 | Which **iPhone model**, and which **iOS version** (Settings → General → About → iOS Version)? | Picks the Xcode path: iOS 26.x → Xcode 26.6; iOS 27.x → Xcode 27.1 + `enableSceneSupport` (§8, research-ios §3) | None — required. Don't update the iPhone's iOS until the video is done. |
| 2 | Which **Mac** (model, macOS version, free disk)? Can it run **macOS Tahoe 26.2+** (26.6+ for Xcode 27)? | Expo SDK 57 needs Xcode ≥ 26.4; a Mac stuck on Sequoia can't build it (research-ios Δ1) | None — required. No capable Mac = stop-and-ask on Day 1. |
| 3 | Which **Apple Account** signs into Xcode: yours or a parent's? | Free Personal Team; a child account may be refused for developer use [Secondary: Apple forums 128800, 704235] | Parent's account if yours is refused |
| 4 | **Bundle ID**: `com.<lastname><year>.fordcast`, e.g. `com.garcia2026.fordcast` (lowercase, globally unique; §9.1)? | Free teams get 10 App IDs per 7 days and 3 apps per device [Verified: Apple "Choosing a Membership"]. The ID never changes after the first build. | `com.<lastname>2026.fordcast` |
| 5 | Try the **Live Activity / Dynamic Island** spike (≤ 90 min, §10.3, only after every [MUST-SHOW] passes on Day 7)? | Needs `expo-widgets`, a second App ID and an App Group; free-team support is plausible but untested (research-ios §6) | **No** → [NEXT] |
| 6 | Your **district**: confirmed at house.gov "Find Your Representative" with your **full home address**? Is the office participating in 2026? Its deadline and time zone? | Travis County is split among several districts; some offices use other dates | TX-10, **Mon Oct 26 2026, 12:00 PM ET**, unconfirmed until you check (§32.1) |
| 7 | Have you read the **CAC 2026 rules**? Paste the **AI-tool rule** and the **video visibility rule** verbatim. | Goes into `AI_USE.md` §1 and decides Public vs Unlisted (§32.1) | AI allowed with full disclosure; video **Public** (2025 rule) |
| 8 | Your **name, school, city** as they should appear in About, README and the video (or placeholders), and a **project contact email** (not your personal one; a parent may co-manage it) | Credits, About screen, video end card | `[NAME]`, `[SCHOOL]`, `[CITY]`, `[EMAIL]` |
| 9 | Is `godtier812/Fordcast-CAC` (or another repo) going to be **public** at submission? | Judges' code link | Public at submission; flipping it is a stop-and-ask (§1.7 #4) |
| 10 | Who **reviews the Spanish** (a fluent adult, ideally a Spanish teacher)? | Every ES string and TTS line (§27) | Ask a teacher on Day 2 |
| 11 | How many **hours per day** can you give the three ★ files (§1.8), and do you want to **write them yourself with hints** or **co-write** (agent skeleton + tests, you implement)? | Schedules the pause points | Co-write, ~1.5 h per file |
| 12 | Commit style: small green commits straight to a `demo-edition` branch, or `dayNN/<topic>` branches merged with a merge commit? | Judges read the history | `dayNN/<topic>` branches, merge commits, never squash |
| 13 | **App icon and splash** ("The Dip": road dipping into a creek, B2 §15.5–§15.7): approve the agent's drafts, or give your own PNGs? Icon Composer (`.icon`) needs the Mac. | Native assets; changes need a rebuild | Agent drafts on Day 2, you approve before Day 3's device build |
| 14 | Confirm the demo uses **generic Home/School pins that are NOT your real home or school** (the video is public). | Privacy (§1.9) | Generic pins from research-data §1.5 (both in 78745) |
| 15 | Will you create a free **OpenRouteService** key for a one-time route bake on the Mac, or should the routes be traced by hand in geojson.io? | Real-street route and detour lines (research-data §1.5) | Trace by hand (≈ 10 min) |
| 16+ | Every line starting `> OPEN QUESTION (ask in Step 0):` in `docs/demo-prompt/` | Later sections may leave a human decision open | The default written next to it |

**Collecting open questions:** before sending the Step 0 message, run `grep -rnE '^> OPEN QUESTION \(ask in Step 0\)' docs/demo-prompt/` and append every hit, verbatim with its § and default, as questions 16, 17, …

**Decided defaults** (state them in the Step 0 message; no answer needed unless the human objects):

| # | Decision | Owner § |
|---|---|---|
| DD1 | **iOS only.** No `android/`, no Android props or branches (`labelVisibilityMode`, `indicatorColor`, `rippleColor`, Android channels, `sheetCornerRadius`). | §9, §16 |
| DD2 | **On-device only.** No backend, accounts, analytics or ads. The only runtime network use is OpenFreeMap tiles/style/glyphs. The Mac-only bake scripts in `tools/` run once and never at app runtime. | §5, §21 |
| DD3 | **Four deterministic scenarios** (research-data §3): `calm-evening` · `flash-flood-night` (hero) · `onion-creek-storm` · `drive-commute`. Hero crossing **Williamson Creek at Jones Road** (`atx-37`): Watch 6:45 AM, Avoid 7:00 AM ("15–30 min"), water on the road 7:30 AM, Closed · OFFICIAL (Simulated road crew) 7:50 AM → **"In this simulated storm, FordCast warned 30 min before water reached the road"**, median 30 min across 3 flooded crossings [Verified: research-data §3(b), computed by the prototype]. | §21–§23 |
| DD4 | **Tabs: Map · Drive · Storms · Alerts**; Settings opens from a gear in the same top-right spot on every tab ("Replay" is renamed "Storms": the storms are simulated, not replays of real data). | §16, §18 |
| DD5 | **Map Home = floating opaque AreaStatusCard + native `nearby` formSheet.** The gorhom persistent sheet is dropped (research-ui D4). | §18 |
| DD6 | **Liquid Glass chrome is MVP** on iOS 26+ (`expo-glass-effect`), `expo-blur` fallback on iOS 16.4–25, solid under Reduce Transparency (research-ui §3.1). | §12–§13 |
| DD7 | **Local notifications only**, `interruptionLevel: 'active'`, subtitle "Simulated storm · demo data". `plugins/withFreeTeamSigning.js` is **listed first** in the `plugins` of `mobile/app.config.ts` (which replaces the template's `app.json`, §9.4) and strips `aps-environment` (research-ios §4). | §9, §25 |
| DD8 | **Live Activity / Dynamic Island = [NEXT]** unless Step 0 Q5 = yes **and** the ≤ 90 min spike (§10.3) signs on the free team. Nothing else depends on it. Never fake a Dynamic Island inside the app. | §10, §25 |
| DD9 | **One global scenario clock** drives every screen; speeds 1× · 10× · 30× · **60× (default)** · 120×; auto-slow to 10× around beats. | §22 |
| DD10 | **Portrait only, dark only** (`userInterfaceStyle: "dark"`). | §9, §12 |
| DD11 | **Simulated position by default.** A real "Use my location" toggle (foreground `expo-location` only) is optional [BUILD-ONLY]. No background location, no geofencing. | §25 |
| DD12 | **Record from a Release build** (`npx expo run:ios --device --configuration Release --no-bundler`) with **QuickTime over cable** as the primary capture. | §11, §30 |
| DD13 | **The Demo Director ships in Release** (presenter-only, hidden entry points, clearly labeled), replacing the full build's `__DEV__` debug screen and DEMO_MODE build flag. | §24 |
| DD14 | **Video visibility: Public** (the 2025 national rules say "The video must be set to 'public'" [Secondary: 2025 CAC rules PDFs on mfume.house.gov / morgangriffith.house.gov, via web search 2026-10-16]) unless the 2026 rules the student reads say Unlisted is allowed. | §29, §32 |

### 1.3 Version and dependency discipline

1. **Expo SDK 57 is frozen through judging.** Today `npm view expo dist-tags` shows `latest` = **58.0.x** (58.0.14 at the last check on 2026-10-16; it moves almost daily) and `sdk-57` = **57.0.30** [Verified: npm, 2026-10-16]. So:
   - Scaffold **only** with `npx create-expo-app@latest mobile --template default@sdk-57` (the template's `sdk-57` tag is 57.0.32; it pins `expo ~57.0.30`, `expo-router ~57.0.28`, RN 0.86.3, React 19.2.3, Reanimated 4.5.1, worklets 0.10.1, `src/app` routes, an `app.json` that §9.4 replaces with `app.config.ts`, `ios.icon: ./assets/expo.icon` [Verified: pkg expo-template-default@57.0.32]).
   - Never run `npx expo install expo@latest`, never accept an SDK 58 prompt, never bump RN or React. `expo` must stay **≥ 57.0.23** (needed for the Xcode 27 scene fix; research-ios Δ2). The full prompt's `~57.0.28` pin is satisfied by 57.0.30.
2. **Native packages only with `npx expo install <pkg>`** (it resolves the SDK 57 pin). Pure-JS packages with `npm install --save-exact <pkg>@<version>`.
3. **Invariant pins** (§9 owns the full install list and order; these may not change) [all Verified: npm view, 2026-10-16]:

   | Package | Version | Package | Version |
   |---|---|---|---|
   | expo | ~57.0.30 (≥ 57.0.23) | react / react-native | 19.2.3 / 0.86.3 |
   | expo-router | ~57.0.28 | @maplibre/maplibre-react-native | **11.5.0** (v11 API: `Map`, `GeoJSONSource`, `Layer`) |
   | react-native-reanimated / react-native-worklets | **4.5.1 / 0.10.1** (exact pair) | @shopify/react-native-skia | **2.6.2** |
   | nativewind / tailwindcss | **4.2.7** / **3.4.19** (never NW5 or Tailwind 4) | react-native-svg | 15.15.4 |
   | expo-glass-effect · expo-blur · expo-linear-gradient | 57.0.4 · 57.0.3 · 57.0.2 | expo-symbols · expo-haptics · expo-speech | 57.0.3 · 57.0.3 · 57.0.3 |
   | expo-notifications | 57.0.23 | expo-audio · expo-keep-awake | 57.0.5 · 57.0.2 |
   | expo-location · expo-localization | 57.0.21 · 57.0.2 | expo-build-properties | 57.0.22 |
   | @expo/ui | ~57.0.25 (SwiftUI `Form` for Settings) | expo-font + @expo-google-fonts/inter | 57.0.4 + 0.4.2 |
   | i18next / react-i18next / intl-pluralrules | 26.4.4 / 17.0.16 / 2.0.1 | zustand | 5.0.15 |
   | @turf/helpers · along · length · nearest-point-on-line · bbox (individual modules, never `@turf/turf`; `@turf/simplify` tools-only) | 7.4.0 | jest-expo (+ peer `@react-native/jest-preset`) | 57.0.6 (+ 0.86.3) |
   | expo-widgets (only if DD8 spike) | 57.0.26 | typescript | ~6.0.3 (never `@latest`) |

4. **Check before you add.** For any package not in §9, run `npm view <pkg> version time peerDependencies` and confirm it is ≥ 2 weeks old and compatible. If it isn't listed in this prompt, **stop and ask** (§1.7).
5. **After every install batch:** `npx expo install --check` and `npx expo-doctor@latest`; fix every finding before committing.
6. **Front-load native modules.** Every native module the plan might need is installed by the end of Day 2 (§6). A native module added later is a stop-and-ask; if approved, run `npx expo prebuild -p ios --clean`, the §9 verification greps, and a Release smoke test on the iPhone in the same session.
7. **Never hand-edit `ios/`.** It is generated by `npx expo prebuild` (which cleans and regenerates by default in SDK 57 [Verified: research-ios Δ7]) and is git-ignored. Every native change goes through `mobile/app.config.ts` or a config plugin, followed by `npx expo prebuild -p ios --clean`.
8. **Never invent** a package, API, prop, entitlement, Info.plist key or version. Anything marked VERIFY BEFORE USE or [Unverified] is checked against the installed package's `.d.ts`/source or on the device before code depends on it, and logged in `docs/decisions/verifications.md` (date, check, result).
9. **No runtime calls except map tiles.** No USGS, NLDI, OpenRouteService, NWS or any other API at runtime. Baked data lives in `mobile/src/demo/data/`.

### 1.4 Working loop and commits

1. **Loop per task:** read the owning § → write or extend the test first where practical → implement → run the §7.1 gates → check on the iOS Simulator (and on the iPhone at each day gate) → commit → update docs (§1.10).
2. **Commit small and often**, several times every day. Judges read the history; a history spread over days is evidence of real work.
3. **Conventional Commits** with these scopes: `mobile`, `mobile/map`, `mobile/sheet`, `mobile/storms`, `mobile/drive`, `mobile/alerts`, `mobile/settings`, `mobile/onboarding`, `mobile/a11y`, `mobile/i18n`, `demo/engine`, `demo/sim`, `demo/scenario`, `demo/director`, `demo/notify`, `ios`, `tools`, `docs`, `explain`, `submission`. Example: `feat(mobile/sheet): device-adaptive peek detent`.
4. **Agent commits** end with the co-author trailer lines your harness requires. **Student commits** come from the student's own git identity with **no** trailer (that is how `AI_USE.md` authorship is auditable).
5. **Never** squash, rebase published history, force-push, or delete branches with unmerged work before judging ends.
6. **Daily devlog.** At the end of each §6 day, append 5–10 lines to `docs/devlog.md`: what became Built, test status, what was checked on the iPhone, blockers, tomorrow's plan. Post the same summary to the human, followed by **tomorrow's student tasks** (00 table).
7. **Screens archive.** When a screen reaches its "Done when", save Simulator screenshots for the three fit classes (§19) to `docs/media/screens/<screen>-<lang>-<class>-<tier>.png` (same names as the §19.7 matrix) (`xcrun simctl io booted screenshot <file>`). They feed the README and the fit review.

### 1.5 Honesty rules for a demo built on simulated data

1. **Simulated data is labeled everywhere it appears** (§3.9 copy, §31.1 placement): the neutral dashed **DEMO** chip in the FreshnessPill at baseline; the violet **SIMULATED** pill + 2 pt violet map frame + scenario accessory while a scenario runs; **SIMULATED STORM · demo data · not live** on every player and results frame; **SIMULATED DRIVE** in Drive Mode; the notification subtitle **Simulated storm · demo data**; a violet **SIMULATED** chip on every Alerts inbox row.
2. **Real things stay real and verbatim.** Crossing names, addresses and coordinates are copied verbatim from the City of Austin's open-source ATXfloods backend (`cityofaustin/ctxfloods-backend`, `populateDB/data/legacyCrossings.csv`, MIT) [Verified: research-data §1.1]. Gauge names come from USGS. Never invent, shorten into a new name, or translate a crossing, creek, road or gauge name (a short name — the UI map `SHORT_NAMES`, 04 §17.2 — may only drop words, e.g. "Bull Creek"). The only exception is the **TTS-only** `spoken.{en,es}` field (§3.10 rule 2): it may expand abbreviations ("Rd" → "Road") and say the connector ("at", "@", "&") in the voice's language ("Williamson Creek **en** Jones Road"); no visible text ever changes.
3. **No impersonation.** The official-closure source is always **"Simulated road crew"** (`demo.source.road_crew`). Never "City of Austin", "ATXfloods", "Travis County", "TxDOT", "NWS" or any real agency as the source of a simulated status. No agency logos anywhere. No NWS products, warnings or polygons, real or fake.
4. **No fabricated metrics.** No POD, FAR, CSI, "accuracy", "% of floods caught" or confidence intervals from simulated storms. The only number is the **engine-computed lead time**, always worded "in this simulated storm" and always paired with that storm's median (`demo.result_honesty`). The featured example is chosen by the fixed rule (the flooded tier-A crossing whose lead is closest to the median, ties → earlier onset; research-data §2.3), never by hand.
5. **No links to real gauge pages.** A USGS page would show real readings that contradict the simulated ones. Gauge cards show the USGS **station name** with the caption "Readings simulated for this demo"; **station numbers are not displayed in the UI** (they stay in data, code and the What's real credits). This reconciles research-ui §4 item 24 with research-data §1.2.
6. **No "live" words.** Never "Live", "real-time", "monitoring now" or "checked … ago" (that implies a server). Freshness copy is "DEMO · updated {{age}}".
7. **Authored links say so.** Gauge → crossing travel times and trigger stages are authored demo values (research-data §1.3). *What's real* says "Upstream links: demo values" unless the NLDI check marked a link `upstreamVerified: true`.
8. **Never fake a system feature.** No fake lock screen, push banner, Dynamic Island, Siri or CarPlay inside the app. A feature that isn't built is [NEXT].
9. **The video says "simulated"** in the opening title card, on every storm shot, and in the narration ("in this simulated storm") (§29, §31).
10. **Never use real personal places.** Home/School pins are generic (Step 0 Q14).

### 1.6 Status labels

| Label | Meaning | Where it may appear |
|---|---|---|
| **Built** | Works in the **Release build on the student's iPhone**, and its gate in §31.4 has passed with evidence linked in `docs/CLAIMS.md` | Video, README, answers, *What's real* ("Real" group) |
| **Simulated** | The *data* behind a Built feature is simulated (always said together with the feature) | Every label in §1.5 rule 1 |
| **Prototype** | Works only in tests, on the Simulator, or on a subset | Always with the word "prototype" |
| **Next** | Designed, not built | *What's real* "Planned" rows, README "Next", a VO line. Never a button. |

The feature-priority tags ([MUST-SHOW], [SHOULD-SHOW], [BUILD-ONLY], [NEXT]) are defined in the header of this file; §4 assigns one to every feature.

### 1.7 Stop-and-ask triggers

Stop, explain the situation in ≤ 10 lines, give options with a recommendation, and wait when:

1. You would change the **meaning or wording** of a state, window rule, disclaimer, honesty label or banned word (§3).
2. You would add a **native module after Day 2**, upgrade any SDK or major version, or add a dependency not in this prompt.
3. Something **costs money** (a paid Apple Developer account, paid tools, paid music).
4. You would **publish** anything: making the repo public, uploading the video, a GitHub Release, the CAC form.
5. An action would **contact people** (email, social posts, issues on other repos). You only draft.
6. A **VERIFY BEFORE USE** check fails, or a package/API behaves differently from this prompt.
7. A **golden hash changes** unexpectedly, or the takes test fails after any change to scenarios or the engine (§28).
8. You reach a **★ student-owned file** (§1.8).
9. A [MUST-SHOW] item will miss its §6 day by more than half a day (propose cuts from §6.3).
10. **Signing still fails** after the §11 troubleshooting table. Never work around it by creating new bundle IDs or scratch projects (10 App IDs per 7 days).
11. Anything would name a **real agency, real person or real address** as a source, or show a real personal place.
12. Changing the **hero scenario, the hero crossing, or any number or time used in the video**.
13. The CAC rules, district or deadline turn out different from §32.1.
14. A **destructive** operation: deleting branches, rewriting history, deleting the app's App ID in the developer portal.

### 1.8 Student-owned core files (★) — pause points

**Why.** The CAC permits AI tools "provided that all AI usage is fully disclosed in the submission materials. AI may only be used to support specific aspects of the project and must not constitute the entirety of the technical development," and students are expected to show significant individual contribution [Secondary: 2026 House-member CAC page quoted in web search results, 2026-10-16; the student pastes the official text in Step 0 Q7]. Finalists are questioned in person. So the three files that carry FordCast's forecasting logic are written **by the student** (or co-written: the student implements; you scaffold, test, explain and review).

| # | File | Contract (port of) | Tests you write first | Explain-back doc | Pause day |
|---|---|---|---|---|---|
| 1 | `mobile/src/demo/engine/baseline-rule.ts` ★ | `evaluate(crossing, links, series, gauges, asOf): RuleResult` — trigger stage + rate of rise + travel time τ → raw state, window (fixed buckets), reasons (C §18.5; proto `engine.ts` `evaluate`) | every row of the C §18.5 logic table; stale links ignored; window buckets [0,15] [15,30] [30,60] [60,90] only; `lo = 0` case; ≥ 1 reason on every non-`no_rise`; the "peaked" reason when `rise_ft_30m ≤ 0` (research-data §2.3 fix 1) | `docs/explain/baseline-rule.md` | **Day 3, Sat Oct 17** |
| 2 | `mobile/src/demo/engine/state-machine.ts` ★ | `step(tracker, raw, now, ctx): Tracker` — hysteresis T1–T7 (C §18.8; proto `engine.ts` `step`) | escalation immediate; one level down per dwell (CLOSED 6, AVOID 6, WATCH 12 ticks of 5 min); never WATCH-or-worse → NO_RISE in one step; stale → UNKNOWN with last known; resume one level below after an outage with `HOLDING`; `CLOSURE_LIFTED` carried until `no_rise` (research-data §2.3 fixes 2–3) | `docs/explain/state-machine.md` | **Day 4, Sun Oct 18** |
| 3 | `mobile/src/demo/engine/travel-time.ts` ★ | `estimateLag(up, down, stormId, stepMin = 5, maxLagMin = 240, minR = 0.5): LagEstimate \| null` and `combineStorms(estimates)` → median/P25/P75/n (C §18.3; proto `learn.ts`) | synthetic lags 35/40/45 min recovered within ±1 min; noise-only → `null`; constant → `null`; lag at the 240-min boundary not refined out of range; quantiles on hand values | `docs/explain/travel-time.md` | **Day 5, Mon Oct 19** |

**The prototype rule.** `proto/engine.ts`, `proto/learn.ts` and their ports in `05-code/mobile/src/demo/engine/{engine,travel-time}.ts` (listed in 05 §23.2/§23.5) already contain AI-written reference implementations. **You MUST NOT copy them into the ★ files**, paraphrase them line by line, or paste them in chat. The student SHOULD attempt each file before opening the prototype; opening it counts as hint level 3 and is logged.

**The UI is never blocked by a ★ file.** On Day 2, run the reference engine once (`tools/gen-golden.ts`, which runs `docs/demo-prompt/05-code/` — same events as `proto/`; §5, 05 §23.6) to write **golden compiled outputs** (`mobile/src/demo/__fixtures__/<scenario>.compiled.json`) and their events hashes (`golden-hashes.json`). Until all three ★ files pass, `mobile/src/demo/scenario/source.ts` returns the golden JSON for each scenario; the UI is built against the same `Compiled` type either way. **Day 6 (Tue Oct 20) gate:** switch `source.ts` to the live on-device engine, delete the fixture branch, and keep the fixtures only for the golden-equality test (§28). A test fails if any file outside `__tests__/` imports `__fixtures__/`. If the live engine's events hash differs from the golden one, diff the events, explain the difference to the student, and let the student decide whether their code or the prototype is wrong (a regenerated golden needs a recorded reason in `docs/decisions/`).

**At each pause point you MUST, in this order, as separate commits:**
1. `test(demo/engine): failing tests for <file>` — in `mobile/src/__tests__/{baseline-rule,state-machine,travel-time}-test.ts` (the canonical test folder, 05 §22.1, §28.1); they fail with `Error('TODO(student)')`, not with import errors.
2. `feat(demo/engine): skeleton for <file> (student TODOs)` — typed signatures, JSDoc contracts with one worked example each, `// TODO(student): …` markers, no logic.
3. `docs(explain): <module> explain-back` — `docs/explain/<module>.md` at a 9th-grade reading level: what it does, why FordCast needs it (one example from the hero storm), one diagram, step-by-step, a worked example with small numbers, what each test catches, words to know, and the three questions below left unanswered (template: E §39.6).
4. Update the `AI_USE.md` row → "awaiting student".
5. **Stop** and post this hand-off message, filled in, then continue only with tasks that don't depend on that file:

```text
STUDENT TASK #<n> — mobile/src/demo/engine/<file>.ts
Why it matters: <one sentence from the explain-back doc>
1) Read docs/explain/<module>.md (about 15 min). Don't answer the questions yet.
2) Implement every TODO(student) in <file>.ts. The contract and an example are in the comments.
3) Run:  cd mobile && npx jest src/__tests__/<module>-test.ts      (now: <k> failing)
4) Commit from YOUR git identity:  git commit -m "feat(demo/engine): implement <thing>"
5) Answer the 3 questions at the bottom of the explain-back doc in your own words; commit.
6) Tell me "review <module>".
Timebox: ~<90> min. Stuck? Say "hint 1", "hint 2" or "hint 3".
While you work I'll continue on: <other tasks>.
```

**Hint ladder** (give only the level asked for; log each in the explain doc's "Hints used"): **1 concept** (restate the idea in plain words) · **2 steps** (pseudo-code in comments, no TypeScript) · **3 pointer** (name the failing test line, the JS function to use, or the prototype function to read) · **4 code** — only if the human explicitly approves; you write one specific function and the authorship mode changes.

**Review** (after "review <module>"): run the file's tests, `npx tsc --noEmit`, `npx eslint`, and the full `npx jest`. Read the diff line by line and leave comments in chat; **never edit the student's file yourself** — the student applies fixes. Ask two "what if" questions (e.g. "What happens if the upstream gauge stops reporting for 50 minutes?") and record the answers under "Review Q&A". Check that the student's three answers are in their own words.

**Authorship modes** (exactly one per file, recorded in `AI_USE.md`): `student-written` (hints ≤ 3) · `co-written` (hint 4 used for at most one function) · `agent-ported from the research prototype, student-annotated` — **only by explicit human decision** when tests still fail at the end of the pause day + ½ day; the student then rewrites every comment in their own words, answers the three questions and passes the review Q&A. Never choose the third mode yourself.

**Required explain-back questions** (don't change them without asking):

| Doc | Questions |
|---|---|
| `baseline-rule.md` | Why must the upstream gauge be *rising*, not just high? Why do we show a time *range* that starts at the earliest likely arrival, not one number? What happens when the upstream gauge stops reporting? |
| `state-machine.md` | Why does FordCast step down only one level at a time? Why is going to Unknown immediate but coming back down slow? What would drivers experience if there were no dwell time ("flapping")? |
| `travel-time.md` | Why compare how fast the water *rises* instead of the water level itself? What does the parabola step fix? Why use the median across storms instead of the average? |

### 1.9 Secrets, privacy and personal data

1. **The app has no secrets.** No API keys, no `EXPO_PUBLIC_*` values are needed.
2. An **OpenRouteService key** (only if Step 0 Q15 = yes) lives only in the Mac shell environment for one run of `tools/bake-demo-routes.mjs`. It is never committed. `.gitignore` covers `.env*` (except `*.example`).
3. **Never commit:** `ios/` (generated), certificates and profiles (`*.p12`, `*.cer`, `*.mobileprovision`), the student's Apple ID email, home address, district-lookup screenshots, or any screenshot showing them. The Apple **Team ID** is not a secret, but prefer omitting `ios.appleTeamId` and letting Xcode/`expo run:ios` pick the Personal Team (research-ios D1).
4. **The app collects nothing.** No analytics, crash reporting, accounts or network calls besides tiles. The optional real location stays on the phone and is never stored.
5. **Public video and repo:** generic Home/School pins only; blur the Apple Account name in any Xcode screenshot used in docs.

### 1.10 Keep the docs in sync with reality

Whenever a feature changes status or a number changes, update in the **same commit or the next one**: `docs/CLAIMS.md` (§31.4) and the *What's real* content (`mobile/src/content/whats-real.ts`, test-checked against `CLAIMS.md`), `README.md` (§32.5), `AI_USE.md` (§32.4), `docs/explain/*.md` for any module whose behavior changed, `docs/devlog.md`, and the concept doc `FordCast_CAC_Submission.md` per the sync list in §32.6.

### 1.11 Agent instruction files to create in the repo (Day 1)

`create-expo-app` generates `mobile/AGENTS.md` and `mobile/.claude/settings.json`. **Keep both** and append the block below. Also create a root `AGENTS.md` (source of truth) and a root `CLAUDE.md` whose first line is `@AGENTS.md` followed by a copy of the rules, so they load even if imports are off.

```markdown
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
```

### 1.12 Environment prerequisites

- **Mac** on macOS Tahoe **26.2+** (Xcode 26.4–26.6) or **26.6+** (Xcode 27.1), with tens of GB free [Unverified size] (§8).
- **Xcode** per the iPhone's iOS version (§8), launched once, license accepted, iOS platform installed; `sudo xcode-select -s /Applications/Xcode.app` and `xcodebuild -runFirstLaunch`.
- **Node ≥ 22.13** (LTS), Git, **CocoaPods** (`brew install cocoapods`; `pod --version`).
- **Running the prototype:** `npx -y tsx` or `bun` (proto uses `bun:test`; research-data §8).
- **Maestro CLI** for iOS Simulator flows — VERIFY BEFORE USE: the current install command on maestro.mobile.dev (§28).
- Optional: `ffmpeg`/`ffprobe` (Homebrew) to check recorded clips (§30).
- A **free Apple Account** (Step 0 Q3), the **iPhone** on iOS 26.x or 27.x, and a **data cable** (USB-C for iPhone 15+, Lightning before).
- GitHub access to the repo.

---
## §2. Story & product (problem → solution, as the video tells it)

### 2.1 One sentence

**FordCast forecasts which specific low-water crossing is likely to flood soon — before water reaches the road — using the stream gauges upstream of it, and helps drivers avoid it.** Tagline **"Know before it crosses."** / **"Sepa antes de que el agua cruce."** (native review, §27).

**Demo Edition one-liner** (README line 2, video title card, About): *"This demonstration runs FordCast's real forecasting logic on the phone, fed by simulated storms over real Austin low-water crossings."*

### 2.2 The problem (use only these figures, with their source tags)

| Fact | Source (concept doc tag) | Status |
|---|---|---|
| Texas led every state in flood deaths 1959–2019: **1,069** (Louisiana #2: 693) | [S1] AP / Datawrapper, Jul 2025 | Verified in the concept doc |
| **570** of those Texas deaths were **vehicle-related**; they cluster in **Flash Flood Alley** (incl. Travis County), peak **at night**, and hit **ages 20–29** hardest | [S2] Han & Sharif, *Water* (MDPI) | Verified in the concept doc |
| Nationally, **over half** of flood drownings happen when someone drives into floodwater | [S3] CDC/NWS via KY EM | Verified in the concept doc |
| July 4, 2025: the Guadalupe at Hunt rose **26 ft in 45 min** | [S4] NASA SVS | Verified in the concept doc |
| At least **135** Texans died in July 2025; **about 10** in Travis County | [S5], [S6] | **VERIFY BEFORE USE** — don't put on screen until the student checks final counts |
| ATXfloods monitors **~67–70** crossings in Austin | [S7] KUT 2025-07-16 | Verified; say "about 70 in Austin alone" |

Full source list: concept doc `FordCast_CAC_Submission.md` §9 and A §2.2. Never quote a figure that isn't in this table.

**The gap is timing, not awareness.** ATXfloods changes *after* water is on the road; NWS warnings are area-wide; map apps reroute only around *reported* closures. Nobody turns upstream gauge data into "this crossing, soon" for a driver.

### 2.3 The solution, as the video tells it (five beats)

1. **Link** — each monitored crossing is tied to the stream gauges upstream of it (calm Map Home: "Watching 12 upstream gauges for 17 crossings"; research-data §1.1).
2. **Learn** — FordCast knows how long water usually takes to travel from each gauge to the road, as a range ("Water usually takes 30–45 min to get here").
3. **Watch** — when the upstream gauge rises past its watch level, the crossing turns **▲ Watch**; past its trigger stage while rising, **◆ Avoid · likely flooded within 15–30 min**, with the reason ("Why this alert?") and the hydrograph.
4. **Warn** — a lock-screen alert for a crossing on the saved drive; in-app banner; spoken alerts in Drive Mode, in English and Spanish.
5. **Avoid** — one tap shows a detour on real streets and hands off to the driver's map app; Drive Mode speaks while the driver keeps eyes on the road.

**How the demo proves it.** A simulated storm (deterministic, labeled violet SIMULATED) runs through the **same on-device TypeScript forecast logic** a live version would run on real USGS readings. The engine — not a hand-typed number — computes that in the hero storm FordCast said Avoid **30 min** before the simulated water reached the road and **50 min** before the simulated road crew closed it (research-data §3(b)). The video says "in this simulated storm" every time.

### 2.4 What's real, what's simulated, what's next (summary; §31.3 is the full table)

| Real (built, runs on the phone) | Simulated (labeled) | Next (planned, not built) |
|---|---|---|
| Forecast logic (trigger + rate of rise + travel time → risk window → safety state machine); map (OpenFreeMap / OpenStreetMap); local notifications; Drive Mode voice EN/ES; accessibility; crossing names and locations (City of Austin open data); gauge names (USGS) | Every gauge reading, storm, closure, drive, alert and route position; the upstream links' travel times and triggers (demo values) | Live USGS gauge ingest; backend forecasts; push alerts; real-storm replays and accuracy numbers; widgets and Live Activities (unless DD8 passes); CarPlay; community reports |

### 2.5 Audiences

| Audience | Need | Where the demo answers it |
|---|---|---|
| Drivers who use low-water crossings, **at night** and **new drivers** | A specific, early, glanceable warning for the crossing ahead | Map Home, crossing sheet, lock-screen alert, Drive Mode |
| **Spanish-speaking drivers** | Crossing-level warnings in Spanish, including spoken | Full ES UI + ES TTS (§27) |
| **VoiceOver**, low-vision and color-blind drivers | Status that doesn't depend on sight or color | 4-way status encoding, `nearby` list alternative, Dynamic Type tiers (§19, §27) |
| Road crews / school-bus planners | "Which crossings flood next?" | `nearby` → Ranked segment [SHOULD-SHOW]; full crew screen [NEXT] |
| **Judges** | Evidence it's real, useful, well built, honest, and the student's own work | Signature storm player, honesty labels, *What's real*, tests, ★ files, explain-back docs |

### 2.6 Non-goals (do not build, do not claim)

- **Not an emergency alert service**; never described as one. It is "supplementary flood-risk information".
- **Never** tells anyone a crossing or route is safe, clear, open or passable.
- **Not a navigation app.** No turn-by-turn; the detour is shown and handed off.
- **No live data, backend, push, accounts, analytics or ads** in this edition.
- **No accuracy claims** from simulated storms (§1.5 rule 4).
- **No coverage claims beyond the data:** tier-C crossings (no upstream gauge) show "Unknown · not monitored by FordCast", never calm.
- **No App Store / TestFlight** (impossible on a free team; not needed).
- **No hype words:** "AI-powered", "real-time", "guaranteed", "accurate to the minute", "first ever", "saves lives".

### 2.7 Demo success criteria (all checkable)

| Criterion | Target | Checked by |
|---|---|---|
| Every [MUST-SHOW] feature works in the **Release build on the iPhone** | 100 % | §33 checklist, devlog entries |
| Every take reproduces | 15/15 takes resolve to their promised on-screen states | `takes` test (§28) + a rehearsal on the device (Day 8) |
| Fits every iPhone class | No clipped or truncated status word, window, button or name on SE (375 × 667), iPhone 16/17, Pro Max, at T0 and at AX tiers | §19 fit matrix screenshots |
| Never "safe" | 0 banned-word hits, EN + ES | copy test (§3.11) |
| Honest | Every simulated surface carries its label; every claim maps to a `CLAIMS.md` row | §31 audit (Oct 24 + Oct 25) |
| Stable | 0 crashes in a 15-min exploratory session per language | §33 |
| Video | 2:15–2:30 (hard cap 3:00), ≥ 60 % app footage, the student's own voice, EN + ES captions | §29, §33 |
| Comprehension [SHOULD] | 0 of 3–5 people read "No rise detected" as "safe" | 5-minute hallway check on Day 8 (§6), logged in `docs/devlog.md` |

---

## §3. Safety principle, states & copy bank (EN / ES)

This section overrides every other section. If a screen, notification, voice line, video caption or README sentence would break a rule here, the rule wins.

### 3.1 The principle — FordCast only ever adds caution

1. **Never "safe".** No state, word, color, icon, sound or haptic tells a user a crossing or route is safe, clear, open, normal or passable. **No green** anywhere in the status system (status hues 75°–165° with saturation > 25 % are forbidden; test in §3.11), no checkmark on a crossing, no `Success` haptic.
2. **Ranges, not countdowns.** Times are windows ("likely flooded within 15–30 min"), never one number and never a ticking timer — including travel time ("water usually takes 30–45 min to get here").
3. **Official closures override the model.** An official Closed always shows **Flooded – Closed · OFFICIAL** whatever the model says; an official "open" never lowers the model's state. In the demo the official source is "Simulated road crew".
4. **Stale or missing data ⇒ Unknown.** Never a calm color, never the last calm state.
5. **Water on the road ⇒ Turn around, don't drown**, in every language and channel.
6. **Disclaimer wherever it matters:** "FordCast is a supplementary tool. Obey barricades and official warnings. Never drive into water." (placements §3.8).

### 3.2 The five states and their 4-way encoding

Internal enum `NO_RISE | WATCH | AVOID | CLOSED | UNKNOWN`; wire/data form `no_rise | watch | avoid | closed | unknown` (proto `types.ts` `Wire`). **Severity rank** (clusters, sorting, route verdict): `no_rise 0 < unknown 1 < watch 2 < avoid 3 < closed 4`.

Every status is encoded **four ways at once: shape + glyph + word + color** (§14 owns the glyph drawings):

| State | EN label · chip | ES label · chip | Shape + glyph | Color | Meaning |
|---|---|---|---|---|---|
| `NO_RISE` | **No rise detected** · NO RISE | **Sin crecida detectada** · SIN CRECIDA | hollow circle | stroke slate `#8A97AB` | No rising water at the linked upstream gauges **right now**. Not a statement that the road is dry. |
| `WATCH` | **Watch** · WATCH | **Precaución** · PRECAUCIÓN | rounded triangle with "!" | fill amber `#F5A623`, ink `#0E1726` | Water is rising upstream; flooding here is **possible**. |
| `AVOID` | **Avoid** · AVOID | **Evite** · EVITE | rounded octagon, white glyph, 2 pt white rim, 2 s halo pulse (3 cycles max) | fill `#C62828`; status **text** `#FF5470` | Water from upstream is **likely** to reach the road within the window. |
| `CLOSED` | **Flooded – Closed** · CLOSED | **Inundado – Cerrado** · CERRADO | octagon + white 45° barricade stripes; **OFFICIAL** micro-label + shield when the source is official | fill `#C62828`, stripes white | Water is on the road (sensor) or an official source (demo: Simulated road crew) reports it closed. |
| `UNKNOWN` | **Unknown – data offline** · UNKNOWN | **Desconocido – sin datos** · DESCONOCIDO | **dashed** ring + "?" | `#7A879C` | FordCast can't see this crossing: gauges stale, or no upstream gauge (**not monitored**). |

- ES Watch is **Precaución**, never "Vigilancia" (that is an NWS product name).
- Colored status text (amber, `#FF5470`) is **≥ 18 pt semibold** and always sits next to its chip or shape.
- **Other reserved colors** (never used for a status): water/creeks/gauges cyan `#2BD9D9`; route `#5AA9FF`; **simulated/scenario violet `#B69CFF`** (pill fill with ink `#0E1726`, 2 pt map frame, banners, inbox chip); background `#0E1726`; Drive Mode background `#070D18`. Tokens: §13.

**Entry / exit summary** (C §18 owns the algorithm; the ★ files implement it):

| State | Enters when (any) | Leaves when |
|---|---|---|
| `CLOSED` | a fresh official status is `closed` (demo: Simulated road crew), or the at-road sensor gauge is fresh and ≥ the overtop stage (`WATER_AT_ROAD`) | official lift + 6 calm ticks (30 min), or sensor below overtop for 6 ticks; drops one level at a time |
| `AVOID` | an upstream gauge is above its trigger stage and rising (or crossed it recently), with an ETA window that starts within 90 min | raw state below AVOID for 6 ticks → WATCH |
| `WATCH` | an upstream gauge is above its watch stage and rising (> 0.2 ft over 30 min), an AVOID candidate is beyond 90 min, or an official "caution" | raw state below WATCH for 12 ticks (60 min) → NO_RISE |
| `UNKNOWN` | all upstream links stale, or the primary link stale with no signal; tier C (`NO_UPSTREAM_GAUGE`); or the simulated network has been offline > 20 min (§3.4) | fresh data → recomputed; after an outage, resume one level below the last known state and dwell (`HOLDING`) |
| `NO_RISE` | fresh data, no condition met | any escalation, immediately |

A tick is 5 simulated minutes. Escalation is always immediate; de-escalation is one level per dwell.

### 3.3 Precedence — the only allowed combination logic

```ts
// mobile/src/demo/engine/combine.ts  (agent-written port of A §3.3 / proto engine.ts resolveRawState)
// Order matters; each step can only ADD caution. Then state-machine.ts ★ applies hysteresis.
// Sketch: closed(src, reasons) / unknown(reasons) / fromRule(rule) are tiny helpers that build a RawState (proto types.ts).
export function resolveRawState(official: Official | null, waterAtRoad: Reason | null, tier: Tier,
  stale: { stale: boolean; reason?: Reason }, rule: RuleResult): RawState {
  if (official?.status === 'closed') return closed('official', [{ code: 'OFFICIAL_CLOSED', source: official.source, as_of: official.setAt }]); // 1
  if (waterAtRoad) return closed('sensor', [waterAtRoad]);                                                        // 2 sensor at the road
  let base: RawState =
    tier === 'C'  ? unknown([{ code: 'NO_UPSTREAM_GAUGE' }]) :                                                  // 3 not monitored
    stale.stale   ? unknown([stale.reason!]) :                                                                   // 4 never hide missing data
                    fromRule(rule);                                                                              // 5 baseline-rule.ts ★
  if (official?.status === 'caution' && RANK[base.state] < RANK.watch)                                          // 6 caution adds caution
    base = { ...base, state: 'watch', window: null, reasons: [...base.reasons, { code: 'OFFICIAL_CAUTION', source: official.source, as_of: official.setAt }] };
  return base;                                                                                                   // official "open" never lowers
}
```

- An official "open" is displayed only as **"{{source}}: no closure reported"** / **"{{source}}: no hay cierre reportado"**, never "open".
- **Route verdict** (Check My Drive, Drive Mode): the highest-ranked state among crossings on the route; any `unknown` crossing is listed separately ("2 crossings on this route have no recent data"). The calm verdict is **"No rise detected at {{c}} monitored crossings on this route"** — never "safe route".
- Tests use real typed objects (never `any` or loose dicts) for every precedence row (§28).

### 3.4 Freshness, the DEMO pill and "last known"

The Demo Edition has no server, so "check age" is simulated by the scenario clock and the scripted network (research-data §2.5 `displayAt`).

| Situation | FreshnessPill (top band, §18) | Crossings |
|---|---|---|
| No scenario running (calm baseline) | `[┊DEMO┊] updated 2 min ago` — neutral dashed slate chip + `demo.pill_idle` | per engine |
| Scenario running | violet pill `● SIMULATED · 7:00 AM storm time` (`demo.pill_running`); 2 pt violet inner map frame; scenario accessory | per engine at the current tick |
| Simulated check age 10–20 min | same text + slate (never amber) aging dot + "As of {{time}}" chip | same state |
| Simulated network offline > 20 min (scenario `network` or Director "Simulated offline") | `Data offline · {{age}}` | **every crossing UNKNOWN**; if the last known state was ≥ WATCH, show "Last known: Avoid · 50 min ago" with that shape inside a dashed frame |
| One gauge silent (scenario outage) | unchanged | crossings depending on it → UNKNOWN with `DATA_STALE` and "Last known: …"; the age is the age of the **last observation** (research-data §2.5) |

- Width rule: when the long form doesn't fit `W − 2g − 104` pt, use the short form (`demo.pill_idle_short`, `demo.pill_running_short`); never truncate with "…" (research-ui §2.4).
- **Tap** the pill → `settings/whats-real`. **Long-press 0.8 s** → Demo Director (§24).
- Never the word "Live" or "Checked" (no server exists in this edition).

### 3.5 Time-window rules

1. Windows come only from the fixed buckets **[0,15], [15,30], [30,60], [60,90]** min (merged pairs allowed: 0–30, 15–60, 30–90). Bounds are multiples of 5, width ≥ 15, upper bound ≤ 90.
2. `lo = 0` ⇒ never "0 min" or "now–15": use the `_now` slot — **"water may already be on the road"** / **"puede que ya haya agua en el camino"**.
3. **AVOID** uses **"likely"** / **"probablemente"**; **WATCH** uses **"possible"** / **"posible"**.
4. WATCH shows a window only when the rule supplies one; otherwise use `*_nowindow`.
5. CLOSED and UNKNOWN show **no** window (hide the range pill).
6. Visual `{{lo}}–{{hi}} min` (en dash U+2013, tabular numerals); spoken `"{{lo}} to {{hi}} minutes"` / `"de {{lo}} a {{hi}} minutos"`.
7. The window changes **once per 5-minute tick**, never continuously; nothing counts down. The storm clock ("Storm time 7:00 AM") is a clock, not a countdown, and is minute-floored.
8. **Travel time is a range:** `tau_lo = 15·floor(P25/15)`, `tau_hi = 15·ceil(P75/15)`, widen to ≥ 15, `tau_lo ≥ 5` (proto `tauRange`). Example: P25 33, median 40, P75 44 → "water usually takes **30–45 min** to get here". Exact τ appears only in the Demo Director status area and in docs.

### 3.6 Source labels (every status says who says so)

| Source | EN | ES |
|---|---|---|
| FordCast rule | FordCast forecast (experimental) | Pronóstico de FordCast (experimental) |
| Official closure (demo) | Official: Simulated road crew · OFFICIAL chip | Oficial: Cuadrilla vial simulada · chip OFICIAL |
| Sensor at the road | Sensor at the road: {{gauge}} | Sensor en el camino: {{gauge}} |
| Scenario | SIMULATED STORM · demo data · not live | TORMENTA SIMULADA · datos de demostración · no es en vivo |

### 3.7 Copy bank (EN / ES)

All user-facing copy MUST come from this bank. Keys go into `mobile/src/locales/{en,es}.json`. i18next `{{var}}` interpolation; every variant is its own key. Placeholders: `{{name}}` crossing name (verbatim), `{{lo}}`/`{{hi}}` window, `{{tau_lo}}`/`{{tau_hi}}` travel range, `{{gauge}}` gauge short name, `{{rise}}` feet (1 decimal), `{{age}}` relative age ("2 min ago" / "hace 2 min"), `{{time}}` storm time ("7:00 AM" / "7:00 a. m."), `{{source}}`, `{{n}}` minutes, `{{g}}` gauges, `{{c}}` crossings, `{{x}}`/`{{m}}` engine-computed minutes. Spanish uses **usted** and Latin-American vocabulary (*carro, manejar*). **Every ES string needs native review** before recording (§27); unreviewed strings are listed in `mobile/src/locales/es-pending-review.json`, which must be empty by Day 8. Keys not listed here but present in A §3.7 (e.g. NWS, push summary, geofence) are **not used** in this edition.

#### `state.no_rise.*`
| Slot | EN | ES |
|---|---|---|
| label / short | No rise detected / NO RISE | Sin crecida detectada / SIN CRECIDA |
| headline | No upstream rise detected | No se detecta crecida río arriba |
| body *(allow-listed negation)* | FordCast isn't seeing rising water at the gauges upstream of this crossing right now. That doesn't mean the road is clear — nearby rain or an ungauged creek can still flood it. | FordCast no detecta agua subiendo en los medidores río arriba de este cruce en este momento. Eso no significa que el camino esté despejado: la lluvia cercana o un arroyo sin medidor todavía pueden inundarlo. |
| spoken | {{name}}. No upstream rise detected. Updated {{age}}. | {{name}}. No se detecta crecida río arriba. Actualizado {{age}}. |
| area_headline | No upstream rise detected near you | No se detecta crecida río arriba cerca de usted |
| area_sub | Watching {{g}} upstream gauges for {{c}} crossings · updated {{age}} | Vigilando {{g}} medidores río arriba para {{c}} cruces · actualizado {{age}} |
| footer (always on the AreaStatusCard) | Water can cover a road without warning. Turn around, don't drown. | El agua puede cubrir el camino sin previo aviso. ¡Dé la vuelta, no se ahogue! |
| route_verdict | No rise detected at {{c}} monitored crossings on this route | No se detecta crecida en {{c}} cruces monitoreados en esta ruta |

#### `state.watch.*`
| Slot | EN | ES |
|---|---|---|
| label / short | Watch / WATCH | Precaución / PRECAUCIÓN |
| headline | Watch · water rising upstream | Precaución · el agua sube río arriba |
| body | {{gauge}} rose {{rise}} ft in the last 30 min. If it keeps rising, this crossing could flood in about {{lo}}–{{hi}} min. Plan another route. | {{gauge}} subió {{rise}} pies en los últimos 30 min. Si sigue subiendo, este cruce podría inundarse en unos {{lo}}–{{hi}} min. Planee otra ruta. |
| body_nowindow | Water is rising upstream. This crossing could flood if it keeps rising. Plan another route. | El agua está subiendo río arriba. Este cruce podría inundarse si sigue subiendo. Planee otra ruta. |
| spoken | Watch. {{name}}. Water is rising upstream. Possible flooding in {{lo}} to {{hi}} minutes. | Precaución. {{name}}. El agua está subiendo río arriba. Posible inundación en {{lo}} a {{hi}} minutos. |
| push_title / push_body | Watch: {{name}} / Water rising upstream. Possible flooding in {{lo}}–{{hi}} min. Plan another route. | Precaución: {{name}} / El agua sube río arriba. Posible inundación en {{lo}}–{{hi}} min. Planee otra ruta. |
| push_body_nowindow | Water rising upstream. Plan another route. | El agua sube río arriba. Planee otra ruta. |
| tts (Drive Mode) | Heads up. Water is rising upstream of {{name}}. Plan another route. | Atención. El agua está subiendo río arriba de {{name}}. Planee otra ruta. |
| widget (only if DD8) | Watch · {{lo}}–{{hi}} min | Precaución · {{lo}}–{{hi}} min |

#### `state.avoid.*`
| Slot | EN | ES |
|---|---|---|
| label / short | Avoid / AVOID | Evite / EVITE |
| headline | Avoid · likely flooded within {{lo}}–{{hi}} min | Evite · probablemente inundado en {{lo}}–{{hi}} min |
| headline_now | Avoid · water may already be on the road | Evite · puede que ya haya agua en el camino |
| body | Water from upstream is heading to this crossing. It may reach the road before any barricade goes up. Use another route. | El agua de río arriba va hacia este cruce. Puede llegar al camino antes de que pongan barricadas. Use otra ruta. |
| detour_line | Detour adds {{n}} min | El desvío agrega {{n}} min |
| spoken | Avoid. {{name}}. Likely flooded within {{lo}} to {{hi}} minutes. Use another route. | Evite. {{name}}. Probablemente inundado en {{lo}} a {{hi}} minutos. Use otra ruta. |
| spoken_now | Avoid. {{name}}. Water may already be on the road. Use another route. | Evite. {{name}}. Puede que ya haya agua en el camino. Use otra ruta. |
| push_title / push_body | Avoid {{name}} / Likely flooded within {{lo}}–{{hi}} min. Use another route. Never drive into water. | Evite {{name}} / Probablemente inundado en {{lo}}–{{hi}} min. Use otra ruta. Nunca maneje en el agua. |
| push_body_now | Water may already be on the road. Use another route. Never drive into water. | Puede que ya haya agua en el camino. Use otra ruta. Nunca maneje en el agua. |
| tts | Avoid {{name}}. Flooding likely soon. Take another route. | Evite {{name}}. Inundación probable pronto. Tome otra ruta. |
| widget / widget_now (only if DD8) | AVOID · {{lo}}–{{hi}} min / AVOID · water may be on the road | EVITE · {{lo}}–{{hi}} min / EVITE · puede haber agua en el camino |
| handoff_warning | Your map app doesn't know about this forecast. If it routes you back toward {{name}}, don't follow it. | Su app de mapas no conoce este pronóstico. Si lo lleva de vuelta hacia {{name}}, no la siga. |

#### `state.closed.*` (variants `official`, `sensor`)
| Slot | EN | ES |
|---|---|---|
| label / short | Flooded – Closed / CLOSED | Inundado – Cerrado / CERRADO |
| official | OFFICIAL | OFICIAL |
| headline (official) | Closed · {{source}} | Cerrado · {{source}} |
| headline_sensor | Water over road · reported {{time}} | Agua sobre el camino · reportada a las {{time}} |
| body | {{source}} reports this crossing closed. Do not drive around barricades. Turn around, don't drown. | {{source}} reporta este cruce cerrado. No pase alrededor de las barricadas. ¡Dé la vuelta, no se ahogue! |
| body_sensor | The sensor at this crossing shows water over the road. Turn around, don't drown. | El sensor de este cruce muestra agua sobre el camino. ¡Dé la vuelta, no se ahogue! |
| spoken | Closed. {{name}}. Reported by {{source}}. Turn around, don't drown. | Cerrado. {{name}}. Reportado por {{source}}. Dé la vuelta, no se ahogue. |
| push_title / push_body | Closed: {{name}} / {{source}} reports it closed. Turn around, don't drown. | Cerrado: {{name}} / {{source}} lo reporta cerrado. ¡Dé la vuelta, no se ahogue! |
| tts | {{name}} is closed. Turn around. Don't drown. | {{name}} está cerrado. Dé la vuelta. No se ahogue. |
| closure_lifted | {{source}}: closure lifted at {{time}}. Water may remain. Use caution. | {{source}}: cierre levantado a las {{time}}. Puede quedar agua. Tenga cuidado. |

In the demo `{{source}}` for an official closure is always `demo.source.road_crew` ("Simulated road crew" / "Cuadrilla vial simulada").

#### `state.unknown.*` (variants `offline`, `not_monitored`)
| Slot | EN | ES |
|---|---|---|
| label / short | Unknown – data offline / UNKNOWN | Desconocido – sin datos / DESCONOCIDO |
| headline (offline) | Unknown · data offline | Desconocido · sin datos |
| body (offline) | We can't reach the gauges for this crossing (last data {{age}}). Treat it as if it could flood, and check official sources. | No podemos obtener datos de los medidores de este cruce (últimos datos: {{age}}). Trátelo como si pudiera inundarse y consulte fuentes oficiales. |
| headline_not_monitored | Unknown · not monitored by FordCast | Desconocido · FordCast no lo monitorea |
| body_not_monitored | FordCast has no upstream gauge for this crossing. Look out for water and barricades, and check official sources. | FordCast no tiene un medidor río arriba para este cruce. Esté atento al agua y a las barricadas, y consulte fuentes oficiales. |
| spoken | Unknown. {{name}}. No data since {{age}}. It could flood. | Desconocido. {{name}}. Sin datos desde {{age}}. Podría inundarse. |
| last_known | Last known: {{state}} · {{age}} | Último estado conocido: {{state}} · {{age}} |

#### `update.deescalate.*`
| Slot | EN | ES |
|---|---|---|
| push_title / push_body (card) | Update: {{name}} / FordCast no longer sees water rising upstream. Water may still be on the road. Obey barricades. | Actualización: {{name}} / FordCast ya no detecta agua subiendo río arriba. Todavía puede haber agua en el camino. Respete las barricadas. |
| tts | Update on {{name}}. Rising water upstream has stopped. Water may still be on the road. | Actualización sobre {{name}}. El agua dejó de subir río arriba. Todavía puede haber agua en el camino. |

Never: "cleared", "reopened", "safe again", "all clear", "back to normal".

#### `reason.*` ("Why this alert?"; each has a `_spoken` sibling built by the same rules — copy them from A §3.7)
| Key | EN | ES |
|---|---|---|
| `reason.UPSTREAM_ABOVE_TRIGGER` | {{gauge}}: +{{rise}} ft over the last 30 min, upstream. Water usually takes {{tau_lo}}–{{tau_hi}} min to get here. | {{gauge}}: +{{rise}} pies en los últimos 30 min, río arriba. El agua suele tardar {{tau_lo}}–{{tau_hi}} min en llegar aquí. |
| `reason.UPSTREAM_ABOVE_TRIGGER_peaked` *(new, research-data §2.3)* | {{gauge}} is above its trigger level, upstream. Water usually takes {{tau_lo}}–{{tau_hi}} min to get here. | {{gauge}} está por encima de su nivel de alerta, río arriba. El agua suele tardar {{tau_lo}}–{{tau_hi}} min en llegar aquí. |
| `reason.UPSTREAM_RISING` | Water rising upstream at {{gauge}} | El agua sube río arriba en {{gauge}} |
| `reason.WATER_AT_ROAD` | Sensor at the road: {{gauge}} shows water over the road | Sensor en el camino: {{gauge}} muestra agua sobre el camino |
| `reason.OFFICIAL_CLOSED` | Official: {{source}} reports it closed | Oficial: {{source}} lo reporta cerrado |
| `reason.OFFICIAL_CAUTION` | Official: {{source}} reports caution | Oficial: {{source}} reporta precaución |
| `reason.DATA_STALE_gauge` | No recent data from {{gauge}} (last {{age}}) | Sin datos recientes de {{gauge}} (últimos: {{age}}) |
| `reason.DATA_STALE_source` | No recent update from {{source}} (last {{age}}) | Sin actualización reciente de {{source}} (última: {{age}}) |
| `reason.NO_UPSTREAM_GAUGE` | Not monitored by FordCast: no upstream gauge | FordCast no lo monitorea: no hay medidor río arriba |
| `reason.HOLDING` | Keeping this warning while water upstream goes down | Mantenemos este aviso mientras baja el agua río arriba |
| `reason.CLOSURE_LIFTED` | {{source}}: closure lifted at {{time}}. Water may remain. Use caution. | {{source}}: cierre levantado a las {{time}}. Puede quedar agua. Tenga cuidado. |

The engine emits reason **codes + parameters** (proto `types.ts` `Reason`); the UI renders text. When `rise_ft_30m ≤ 0`, render the `_peaked` key (never "+-0.4 ft").

#### Demo, freshness and travel keys (new in this edition unless marked)
| Key | EN | ES |
|---|---|---|
| `demo.chip` | DEMO | DEMO |
| `demo.badge` | SIMULATED | SIMULADO |
| `demo.pill_idle` / `_short` | updated {{age}} / {{age_short}} | actualizado {{age}} / {{age_short}} |
| `demo.pill_running` / `_short` | SIMULATED · {{time}} storm time / SIMULATED · {{time}} | SIMULADO · {{time}} hora de la tormenta / SIMULADO · {{time}} |
| `demo.banner` | SIMULATED STORM · demo data · not live | TORMENTA SIMULADA · datos de demostración · no es en vivo |
| `demo.notify.subtitle` | Simulated storm · demo data | Tormenta simulada · datos de demostración |
| `demo.source.road_crew` | Simulated road crew | Cuadrilla vial simulada |
| `demo.result` | In this simulated storm, FordCast warned {{x}} min before water reached the road | En esta tormenta simulada, FordCast avisó {{x}} min antes de que el agua llegara al camino |
| `demo.result_honesty` | Simulated gauge data; the forecasting code is real and ran on this phone. Median warning across the {{n}} crossings that flooded in this storm: {{m}} min. | Datos de medidores simulados; el código de pronóstico es real y se ejecutó en este teléfono. Aviso mediano en los {{n}} cruces que se inundaron en esta tormenta: {{m}} min. |
| `demo.result_rule` | Example picked by a fixed rule: the crossing whose warning was closest to the median. | Ejemplo elegido con una regla fija: el cruce cuyo aviso estuvo más cerca de la mediana. |
| `demo.closure_gap` | The simulated road crew closed it {{x}} min after FordCast first said Avoid. | La cuadrilla vial simulada lo cerró {{x}} min después del primer Evite de FordCast. |
| `demo.window_check_hit` / `_miss` | Water arrived inside / outside the window FordCast first showed ({{lo}}–{{hi}} min). | El agua llegó dentro / fuera del intervalo que FordCast mostró primero ({{lo}}–{{hi}} min). |
| `demo.accuracy_planned` | How accuracy will be measured (planned): real past Austin storms, no peeking at future data, each storm tested with rules learned from the others. | Cómo se medirá la precisión (planeado): tormentas reales pasadas de Austin, sin ver datos futuros, y cada tormenta evaluada con reglas aprendidas de las demás. |
| `demo.gauge_simulated` | Readings simulated for this demo | Lecturas simuladas para esta demostración |
| `demo.drive_cta` | Drive this storm (simulated) | Manejar esta tormenta (simulado) |
| `replay.simulated_drive` *(A key)* | SIMULATED DRIVE | MANEJO SIMULADO |
| `replay.gauge_silent` *(A key)* | {{gauge}} went silent. Its readings only arrived later, so FordCast shows Unknown here. | {{gauge}} dejó de transmitir. Sus lecturas llegaron después, así que FordCast muestra Desconocido aquí. |
| `demo.location` | Demo location: {{place}} | Ubicación de demostración: {{place}} |
| `fresh.as_of` *(A)* | As of {{time}} | A las {{time}} |
| `fresh.offline` *(A)* | Data offline · {{age}} | Sin datos · {{age}} |
| `travel.range` *(A)* | Water usually takes {{tau_lo}}–{{tau_hi}} min to get here | El agua suele tardar {{tau_lo}}–{{tau_hi}} min en llegar aquí |
| `drive.tts.multi_changed_one` / `_other` | {{count}} crossing ahead changed. / {{count}} crossings ahead changed. | Cambió {{count}} cruce adelante. / Cambiaron {{count}} cruces adelante. |
| `drive.tts.unknown_ahead` | No recent data for {{name}}. Watch for water and barricades. | No hay datos recientes de {{name}}. Esté atento al agua y a las barricadas. |
| `drive.start_tts` | Drive Mode on. FordCast will speak. | Modo manejo activado. FordCast le hablará. |
| `drive.silent_tip` *(A)* | Turn off silent mode for spoken alerts. | Desactive el modo silencio para escuchar las alertas habladas. |
| `drive.lockout.title` / buttons *(A)* | Typing is locked while the car is moving. Are you a passenger? / I'm a passenger (hold) · Cancel | Escribir está bloqueado mientras el carro está en movimiento. ¿Es usted pasajero? / Soy pasajero (mantenga presionado) · Cancelar |
| `alerts.empty` | No alerts yet. You'll see warnings here for your saved crossings and drives. | Todavía no hay alertas. Aquí verá avisos sobre sus cruces guardados y sus trayectos. |
| `alerts.why_late` *(A)* | Alerts can arrive minutes late, and FordCast doesn't cover every road. | Las alertas pueden llegar con minutos de retraso, y FordCast no cubre todos los caminos. |
| `official.no_closure` *(A)* | {{source}}: no closure reported | {{source}}: no hay cierre reportado |
| `route.unknown_count_one` / `_other` *(A)* | {{count}} crossing on this route has no recent data / {{count}} crossings on this route have no recent data | {{count}} cruce en esta ruta no tiene datos recientes / {{count}} cruces en esta ruta no tienen datos recientes |
| `tabs.map / drive / storms / alerts` | Map · Drive · Storms · Alerts | Mapa · Manejo · Tormentas · Alertas |

Scenario titles come from the scenario data (`title.{en,es}`; research-data §2.2): "Calm evening"/"Noche tranquila", "Flash flood night"/"Noche de inundación repentina", "Big Onion Creek storm (simulated)"/"Gran tormenta en Onion Creek (simulada)", "Drive to school (simulated)"/"Camino a la escuela (simulado)". Spoken (`*_spoken`, `*.tts`) strings follow §3.10. Screen chrome keys (buttons, section titles, settings rows) are specified with their EN/ES text in §17–§18 and §27 and obey the same guards.

### 3.8 Disclaimers, pledge and onboarding copy (exact)

| Where | EN | ES |
|---|---|---|
| **Pledge** (`onboarding.pledge.*`; three checkboxes; tabs unreachable until accepted) | title "Before you start" · item1 "I will never drive into water." · item2 "I will obey barricades and official warnings." · item3 "FordCast is a student-built forecast. It can be wrong or late, and it never tells me a road is safe." · accept "I understand" · hint "Check all three statements to continue" | "Antes de empezar" · "Nunca manejaré en el agua." · "Respetaré las barricadas y las alertas oficiales." · "FordCast es un pronóstico creado por un estudiante. Puede equivocarse o llegar tarde, y nunca me dice que un camino es seguro." · "Entiendo" · "Marque las tres frases para continuar" |
| **Onboarding** | `onboarding.welcome.title` "Know before it crosses." · `onboarding.how.title` "How it works" · `onboarding.how.data` *(replaces A's "Real USGS data, checked every 5 min", which is false here)* "This demo uses simulated gauge readings. The forecast logic is real and runs on your phone." · `onboarding.legend.title` "What the map shows" · `onboarding.legend.never_safe` "FordCast never says a road is safe." | "Sepa antes de que el agua cruce." · "Cómo funciona" · "Esta demostración usa lecturas simuladas. La lógica del pronóstico es real y funciona en su teléfono." · "Lo que muestra el mapa" · "FordCast nunca dice que un camino es seguro." |
| **Persistent footer** (`disclaimer.footer`: crossing sheet full detent, `drive/result`, `storm/results`) | FordCast is a supplementary tool. Obey barricades and official warnings. Never drive into water. | FordCast es una herramienta complementaria. Respete las barricadas y las alertas oficiales. Nunca maneje en el agua. |
| **Drive Mode start** | Mount your phone. Don't touch it while driving. FordCast will speak. | Coloque su teléfono en un soporte. No lo toque mientras maneja. FordCast le hablará. |
| **About → Legal** (`legal.about`) | FordCast is an independent student project made for the 2026 Congressional App Challenge. This demonstration uses simulated gauge readings and simulated storms; no alert in it is real. It is not an official warning service and is not affiliated with or endorsed by the National Weather Service, USGS, the City of Austin, Travis County, or the U.S. House of Representatives. FordCast never indicates that a crossing is safe. Always obey barricades, road closures, and official warnings. In an emergency, call 911. Provided "as is," without warranty of any kind. | FordCast es un proyecto estudiantil independiente creado para el Congressional App Challenge 2026. Esta demostración usa lecturas de medidores simuladas y tormentas simuladas; ninguna alerta en ella es real. No es un servicio oficial de alertas y no está afiliado ni respaldado por el Servicio Nacional de Meteorología (NWS), el USGS, la Ciudad de Austin, el Condado de Travis ni la Cámara de Representantes de EE. UU. FordCast nunca indica que un cruce sea seguro. Siempre respete las barricadas, los cierres de caminos y las alertas oficiales. En una emergencia, llame al 911. Se ofrece "tal cual", sin garantía de ningún tipo. |
| **Attribution** (About → Sources, map ⓘ, README, video end card) | Map data © OpenStreetMap contributors · OpenFreeMap © OpenMapTiles · Crossing names and locations: City of Austin open data (ATXfloods, MIT) · Gauge sites: U.S. Geological Survey · Routes: © openrouteservice.org by HeiGIT (only if Step 0 Q15 = yes) · Creek lines: USGS NHDPlus (only if baked from NLDI) | same names; "datos abiertos de la Ciudad de Austin" |
| **Location primer** (only before the optional real-location toggle) | FordCast uses your location to show crossings near you. Your location stays on your phone. This demo works without it. | FordCast usa su ubicación para mostrar los cruces cerca de usted. Su ubicación se queda en su teléfono. Esta demostración funciona sin ella. |

The pledge, `legend.never_safe`, `state.no_rise.body` and `legal.about` contain "safe"/"seguro"/"clear" as **negations** and are allow-listed (§3.11).

### 3.9 Honesty labels (copy placement summary; §31.1 owns the full matrix)

| Surface | Label | Key |
|---|---|---|
| FreshnessPill, calm | dashed slate `DEMO` micro-chip + "updated 2 min ago" | `demo.chip`, `demo.pill_idle` |
| FreshnessPill + map, scenario running | violet `SIMULATED · 7:00 AM storm time` + 2 pt violet inner frame | `demo.pill_running` |
| Scenario accessory / mini-bar | `● SIMULATED · Flash flood night · 7:00 AM` | `demo.badge` + scenario title |
| Storm player, results, Storms cards | banner `SIMULATED STORM · demo data · not live` on every frame | `demo.banner` |
| Drive Mode in a scenario | `SIMULATED DRIVE` + violet banner | `replay.simulated_drive` |
| Local notification | subtitle `Simulated storm · demo data` | `demo.notify.subtitle` |
| Alerts inbox rows | violet `SIMULATED` chip before the state chip | `demo.badge` |
| Official closure | source "Simulated road crew" + OFFICIAL chip | `demo.source.road_crew` |
| Gauge card | "Readings simulated for this demo" | `demo.gauge_simulated` |
| Results | count-up + honesty line + rule line + "accuracy (planned)" | `demo.result*`, `demo.accuracy_planned` |

### 3.10 Spoken variants (TTS and screen readers)

1. Every status-bearing string has a `*_spoken` sibling; TTS and `accessibilityLabel`s use **only** spoken keys.
2. Spoken strings contain no dashes, symbols or abbreviations: "minutes/minutos" not "min", "feet/pies" not "ft", "to/a" not "–". Crossing records carry `spoken.{en,es}` where the verbatim name has "@", "Rd", "#" etc. (research-data §1.1).
3. **TTS alerts lead with the action** ("Avoid {{name}}…"); **row accessibility labels lead with the visible text** (the crossing name; WCAG 2.5.3).
4. Drive Mode TTS is ≤ 12 words where possible; at most one utterance per crossing per 60 s; simultaneous changes merge into `drive.tts.multi_changed_*` + the top line; escalations inside the gate are deferred, not dropped (research-data §3(d), §4.3).
5. Never feed a window like "15–30 min" to a speech engine.

### 3.11 Banned words and the copy tests

Store once in `mobile/src/locales/banned-words.json` (shape: `{ global: {en, es}, status: {en, es}, chromeNamespaces, allowKeys }`).

| Scope | EN | ES |
|---|---|---|
| **Global** (every key) | safe, safer, safely, all clear, all-clear, clear, cleared, passable, good to go, no risk, low risk, no danger, you can cross, can cross, reopened, all good, nothing to worry, live, real-time | seguro, segura, seguros, seguras, todo despejado, despejado, despejada, transitable, puede cruzar, puede pasar, listo para pasar, sin riesgo, bajo riesgo, riesgo bajo, sin peligro, reabierto, todo bien, en tiempo real |
| **Status** (every key except chrome namespaces `settings.`, `common.`, `search.`, `permissions.`, `director.`) | ok, okay, normal, open, opened | normal, abierto, abierta |

- "live" and "real-time" are added to the global list for this edition (§1.5 rule 6); they may appear only inside `demo.banner`, `demo.banner_sub` and `demo.banner_spoken` ("not live" / "no es en vivo", a negation) — add them to `allowKeys`. Planned rows in *What's real* are worded without them ("Gauge readings straight from USGS every few minutes"). If the DD8 Live Activity ships, its Settings row is called "Lock Screen activity" / "Actividad en la pantalla bloqueada".
- **Allow-list** (`allowKeys`): `state.no_rise.body`, `legend.never_safe`, `onboarding.pledge.*`, `onboarding.legend.*`, `legal.about`, `disclaimer.*`, `demo.banner`, `demo.banner_sub` + `demo.banner_spoken` (03 §12.5), `howitworks.step4.body` (04 §18.18.5), `safety.never_safe`. Each allow-listed value must also contain a negation token (`never|not|n't|no |nunca`); the test fails otherwise.
- **Design consequences:** no "Clear"/"OK" buttons (use "Reset", "Done", "Got it" / "Restablecer", "Listo", "Entendido"); no "¿Está seguro?" (use "¿Desea…?"); no label starts with "Open"/"Abrir" (use "Show detour in {{app}}" / "Mostrar el desvío en {{app}}", "View …"/"Ver …").
- **Countdown guard:** any value with `{{lo}}` must contain `{{hi}}`, `{{tau_lo}}` must have `{{tau_hi}}`; `{{eta}}`, `{{minutes}}`, `{{countdown}}`, bare `{{tau}}` are forbidden; in status scope the regex `\b(in|en|within|dentro de)\s+\d+\s*(min|minutes|minutos)\b` fails, as does any "now–", "ahora–" or "0–" range.
- **Spoken guard:** spoken keys (`*_spoken*`, `*.spoken*`, `*.tts`, `drive.tts.*`, `drive.start_tts`) must not contain `–`, `—`, `\bmin\b`, `\bft\b`.
- **Demo guards (new):** no key value contains "City of Austin", "ATXfloods", "Travis County", "TxDOT" or "NWS" except `legal.about`, `about.sources*`, `sheet.credit` (crossing sheet About block, 04 §18.6) and `whatsreal.*` credit rows (04 §18.18.6); notification content builders must set `subtitle` from `demo.notify.subtitle` (unit test on `notify/content.ts`).
- **Code guards** (static scans): no `NotificationFeedbackType.Success` in `mobile/src/**` outside tests; no green status token in `mobile/src/lib/theme.ts`; no `getExpoPushTokenAsync`/`getDevicePushTokenAsync` anywhere; no `waterdata.usgs.gov` or `api.openrouteservice.org` string in `mobile/src/**`. A test file that must contain a forbidden literal builds it by string concatenation.
- Files: `mobile/src/__tests__/copy-banned-test.ts`, `i18n-parity-test.ts` (identical EN/ES key sets; plural keys `_one/_other` + ES `_many`), sketch in A §3.12 (Jest), adapted to the lists above. (Every Demo Edition test file is named `<name>-test.ts` and lives in `mobile/src/__tests__/`, like the `05-code/` suites.)

### 3.12 Semantic haptics and sound (summary; §15 owns timing)

Watch → `notificationAsync(Warning)` + soft chime · Avoid/Closed → `notificationAsync(Error)` + chime · Unknown → `impactAsync(Soft)`, no sound · de-escalation → `impactAsync(Light)` · **never `Success`**. Safety cues ≤ 1 per 1.5 s; UI micro-haptics on a separate 60 ms gate, muted for 400 ms after a safety cue (research-ui §3.7). Every haptic pairs with visible text (haptics are invisible on video: pair each with a visual pulse), and with voice in Drive Mode. Haptics, Sounds and Spoken alerts each have a Settings toggle.

---
## §4. Demo feature list — priority and fit (every feature has a home)

### 4.1 Information architecture (≤ 2 taps to everything from a cold Map Home)

```
Root Stack (Stack.Protected onboarding gate)                                       route specs: §18 · sheet options: §16
├─ (onboarding)/ welcome (+ EN/ES) · how · map-key · pledge · alerts-primer   (renamed so no URL collides with a root route, §16.4)
├─ (tabs) NativeTabs ─┬─ Map     sf map / map.fill               Map Home: MapSurface + glass chrome + AreaStatusCard
│   + BottomAccessory  ├─ Drive   sf car / car.fill               drive/index (Check My Drive + Start Drive Mode) → drive/result
│   (scenario          ├─ Storms  sf cloud.bolt.rain / .fill      storms/index (scenario library)
│    transport, iOS26) └─ Alerts  sf bell / bell.fill (+badge)    alerts/index (segmented Inbox | Saved)
├─ nearby            formSheet [0.55, 0.92], largestUndimmed 0    Nearby · Saved · Ranked (the accessible map alternative)
├─ crossing/[id]     formSheet [peek*, half*, 1.0], largestUndimmed 1, grabber   (*both computed per device by crossingDetents(), §19.2/§19.4)
├─ gauge/[id]        formSheet 'fitToContents'
├─ search            formSheet [0.92]
├─ legend            formSheet 'fitToContents'
├─ storm/[id]        fullScreenModal (player; closing it keeps the clock running → accessory)
├─ storm/results     formSheet [0.62, 1.0]
├─ drive-mode        fullScreenModal, gestureEnabled:false, autoHideHomeIndicator
├─ permission/[kind] modal (notifications; location only for the optional real-location toggle)
├─ demo              formSheet [0.5, 1.0]  Demo Director (presenter only)
└─ settings/         modal page sheet + inner Stack: index · notifications · accessibility · drive · how-it-works · whats-real · about · legal
```
Removed from the full build's route table (B2 §13, D1 §28.2): `layers` (nothing meaningful toggles with simulated data; never draw fake NWS polygons), `handoff` sheet (→ native pull-down menu), `settings/data-sources`, `settings/accuracy`, `settings/privacy` (→ `whats-real`), `crew` screen ([NEXT]; the Ranked segment covers it), `settings/debug` (the presenter uses `demo`). [Verified: research-ui §1.1] `dev/gallery` survives only as a **developer page** (`src/app/dev/gallery.tsx`, `__DEV__` only, `<Redirect href="/" />` in Release, §17): it is not part of the user IA and is never filmed.

### 4.2 Feature → screen fit table

Columns: **Entry** = taps from a cold Map Home. **Fit** = the space rule that keeps it beautiful on every iPhone (class letters from §19: height C < 700 pt (SE) · R 700–899 · T ≥ 900; width N < 390 · W ≥ 390). F-IDs refer to the full catalog (A §4) for deep detail.

| # | Feature (F-ID) | Home (route · component) | Entry | Tag | Demo implementation · fit | Spec |
|---|---|---|---|---|---|---|
| 1 | Area status (F30, F40) | `(tabs)/index` · `AreaStatusCard` | 0 | [MUST-SHOW] | Chip row, headline ≤ 2 lines, `[Check my drive] [Drive Mode ▶]`, footer. Card 204 pt on C (no supporting line), 226 pt on R/T with "Watching 12 upstream gauges for 17 crossings". Buttons: measure → drop leading icons → stack (2 × 52 + 8); never shrink text. Swipe up or tap the chip row → `nearby`. | §17, §18, §19 |
| 2 | Night map: creeks, gauges, crossings, clusters (F28, F31, F32) | `MapSurface` | 0 | [MUST-SHOW] | "FordCast Night" style, cyan creek veins, gauge dots, 4-way crossing sprites, clusters keep the worst state; top/bottom edge fades behind chrome; `contentInset` from chrome + card heights. | §13, §18, §19.4 |
| 3 | Freshness + honesty pill (F35) | top band `FreshnessPill` | 0 | [MUST-SHOW] | `DEMO · updated 2 min ago` → violet `SIMULATED · 7:00 AM storm time` while a scenario runs; short forms when the measured width exceeds `W − 2g − 104`. Tap → `whats-real`; long-press 0.8 s → Director. | §3.4, §18, §19.4 |
| 4 | Crossing detail + "Why this alert?" + upstream hydrograph (F43, F14, F45) | `crossing/[id]` formSheet | 1 (marker, row, banner, notification) | [MUST-SHOW] | **One scroll:** peek = chip, name (≤ 2 lines), window line, meta "Gauge read 8 min ago · DEMO", actions `[⤳ Detour +N min] [🔔] [⋯]`; half = RiskRing + RiskWindow row, **Hydrograph** (C 120 · R 140 · T 160 pt) with dashed amber trigger line, Why (2 reasons + travel range); full = segmented Upstream · History · About + footer. Detents from `crossingDetents()`: peek = `ceil2(clamp((286 C / 306 R·T pt + safeBottom)/H, 0.30, 0.48))` (SE 0.43 … Pro Max 0.36); half sized so the whole hydrograph + travel line fit (SE 0.74 … Pro Max 0.61); T1 `[0.80, 1.0]`, T2+ full only. | §17, §18, §19.2, §19.4 |
| 5 | Risk window "Next 90 min" (F31) | crossing half; `EtaRangePill` in peek, rows, Drive HUD | 1 | [MUST-SHOW] | Now·30·60·90 ticks; bracket moves once per tick; ranges only. | §17 |
| 6 | Official closure override (F10) | crossing CLOSED · OFFICIAL variant | 1 | [SHOULD-SHOW] | Source "Simulated road crew" + shield + OFFICIAL chip (take O1-closed, 7:50 AM). | §3.6, §18, §19.4 |
| 7 | Unknown / stale → UNKNOWN (F11) | dashed sprites; crossing UNKNOWN variant; player | 1 | [MUST-SHOW] | `onion-creek-storm` 5:50 AM: Bluff Springs Rd ◌ "Last known: Avoid · 50 min ago" + `replay.gauge_silent` caption (take T11-unknown, ~5 s). | §21–§23, §26 |
| 8 | Simulated offline → every crossing UNKNOWN after 20 min | Director switch; all screens | — | [BUILD-ONLY] | Proves the 20-min rule on demand; FreshnessPill "Data offline · 22 min". | §3.4, §24 |
| 9 | Check My Drive + route verdict (F49) | Drive tab `drive/index` → `drive/result` | 1 (Drive tab or card button) | [MUST-SHOW] | Home → School via saved-place chips; verdict = worst state on the route (Avoid Jones Rd + Watch Manchaca & Jones at 7:01 AM). Route/detour lines follow **real streets** (baked). Result: map 38 % of H on C, 45 % on R/T; actions sticky at the bottom (52 + 8 + 76). | §18, §21 |
| 10 | Detour (F50) | crossing peek `[Detour +N min]`; `drive/result` | 2 | [MUST-SHOW] | Baked `detour` route (no crossing within 40 m); "Detour adds N min" from the baked duration (draft ≈ 2; research-data §1.5); blocked segment dashed `#FF5470`, detour draws on. | §18, §20, §19.4 |
| 11 | Hand-off to a map app (F53) | `drive/result` native pull-down "Show detour in ▾ Apple Maps · Google Maps · Waze" | 2 (card `[Check my drive]` → `[Show detour in ▾]`; picking the app is the action that leaves FordCast) | [SHOULD-SHOW] | Native menu (`Link.Menu` or `@expo/ui` `Menu`), only installed apps listed; `state.avoid.handoff_warning` stays on the card. VERIFY BEFORE USE: `LSApplicationQueriesSchemes` for `comgooglemaps`, `waze` via `ios.infoPlist`. | §18, §19.4 |
| 12 | Drive Mode + voice EN/ES (F57, F58, F60, F61) | `drive-mode` fullScreenModal | 1 | [MUST-SHOW] | `#070D18`, ≤ 3 items per glance, buttons 76/96 pt; follow-map strip only if leftover ≥ 120 pt (17, Plus, Pro Max); SE: 2-node ribbon, hidden during the approach alert. Chime → TTS (+650 ms) → Error haptic + 8 pt red edge glow. SIMULATED DRIVE label in every frame. | §18, §19, §25 |
| 13 | Simulated drive position | `demo/drive/sim-drive.ts` (`useSimulatedDrive`, 05 §25.4) → `CarPuck` + Drive HUD | — | [MUST-SHOW] | Scripted car along the baked commute; leaves Home 6:58:54 AM; 8.9 m/s; risk clock at 1× during a drive; turns at `BRANCH` automatically. | §25, §19.4 |
| 14 | Driver lockout + passenger hold (F59) | dialog over search/list (`LockoutDialog`, §18.12) | — | [SHOULD-SHOW] | Simulated speed ≥ 4.5 m/s for 5 s; Director "Lockout: Auto / Off" so the presenter is never trapped (take O3-lockout). Card `W − 2g`, hold button 76 pt, scrolls at T2+. | §18.12, §19.4, §24, §25 |
| 15 | In-app AlertBanner (F36) | Map Home, Drive tab | event | [MUST-SHOW] | Slides in under the top band; on C collapses to a 44 pt pill after 8 s (AVOID/CLOSED persist as the pill). | §17, §19 |
| 16 | Local notification + lock screen (F65, F66) | iOS system banner / Lock Screen → `crossing/[id]` | event | [MUST-SHOW] | Title "Avoid Williamson Creek at Jones Road", subtitle "Simulated storm · demo data", bank body; OS-scheduled `TIME_INTERVAL` 8 s for the lock-screen take; tap seeks the clock to the announced beat. | §25 |
| 17 | Alerts inbox (F71) + test alert (F72) | `(tabs)/alerts` Inbox; test alert in `settings/notifications` | 1 (inbox) · 2 (gear → Notifications → "Send a test alert") | [SHOULD-SHOW] | Scenario alerts count toward the badge (they are the only alerts); each row starts with the violet SIMULATED chip; empty state = `ContentUnavailableView` + `alerts.empty`; the test alert carries "TEST ·" in its title and the demo subtitle. | §18.16, §18.18.2, §19.4 |
| 18 | Saved crossings + Notify me (F46) | Alerts → Saved segment; crossing `[🔔]` | 2 | [SHOULD-SHOW] | "Also alert me at Watch" switch (off by default). Hero `atx-37` is pre-saved via the Home → School route. | §18, §19.4 |
| 19 | Saved places (F51) | Drive tab chips Home · School | 1 | [SHOULD-SHOW] | Static generic pins; chips scroll horizontally, never wrap; "Edit places" = [NEXT] row. | §18, §19.4 |
| 20 | Storms library (scenario cards) | `(tabs)/storms` | 1 | [MUST-SHOW] | Hero card "Flash flood night" (220 pt C · 260 R · 300 T) with "30 min" from the engine + `[▶ Play]` + secondary `[Drive this storm (simulated)]`; second card "Big Onion Creek storm (simulated)" (35 min); every card carries the violet banner. | §18, §26 |
| 21 | Storm player + "X min earlier" (F75–F80) | `storm/[id]` fullScreenModal → `storm/results` | 2 | [MUST-SHOW] **signature** | Map gets the remaining height; story caption pill; LagPair (96 pt R · 120 T · chip on C); transport card 148 pt (scrubber ticks ▲ ◆ ▧ ◌ ● ⌀ per 03 §13.6, ±5, prev/next beat, play 56 pt, speed menu). Results: count-up `demo.result` + honesty line + rule line + closure gap + window check + `demo.accuracy_planned`; no POD/FAR/CSI tiles. | §18.14, §18.15, §19.4, §20, §26 |
| 22 | Drive this storm (F128) | Storms hero card button → `drive-mode` | 2 | [SHOULD-SHOW] | Same Drive Mode in scenario mode (`drive-commute`). | §25, §19.4 |
| 23 | Scenario transport ("one clock") (F78b, F41) | `NativeTabs.BottomAccessory` (iOS 26+) / `ScenarioMiniBar` (< 26) | visible while a scenario runs | [MUST-SHOW] | Regular: `[❚❚] ● SIMULATED · Flash flood night · 7:00 AM [View]`; inline: `[❚❚] 7:00 AM`. Map Home shows the violet frame. | §16, §18, §22, §19.4 |
| 24 | Nearby / Saved / Ranked list (F34) | `nearby` formSheet | 1 (swipe up or `[☰]`) | [SHOULD-SHOW] | Rows 72 pt (auto height at T1+); names ≤ 2 lines; status word and window never truncate. VoiceOver on → opens at 0.92 over the map. Ranked = "Likely to flood next" for crews (1 s pan in video at most). | §18, §27 |
| 25 | Crew screen "Likely to flood next" (F100) + CSV | — | — | [NEXT] | VO mention only. | — |
| 26 | Search (F37) | `search` formSheet from the glass `[⌕]` | 1 | [SHOULD-SHOW] | Lives in the right-edge glass control stack (frees card width on 375 pt phones); dropped from the stack if it would collide with the banner (search stays in the `nearby` header). | §18, §19 |
| 27 | Legend (F33) | `legend` formSheet from `[?]` | 1 | [SHOULD-SHOW] | Five states + "SIMULATED (violet) = demo storm" row + `legend.never_safe`. | §14, §18, §19.4 |
| 28 | Gauge mini-card (F39) | `gauge/[id]` from a cyan gauge dot | 1 | [SHOULD-SHOW] | Stage (tabular), 48 pt sparkline, "Linked to 3 crossings", `demo.gauge_simulated`; **no USGS link, no station number**. | §18, §19.4 |
| 29 | Language EN/ES (F96, F97) | Settings SwiftUI `Picker` (menu); gear long-press menu | 2 (or 1 long-press) | [MUST-SHOW] | Switches UI, notifications, TTS voice; 3 s flip in the video. Spanish never truncates (buttons stack). | §18, §27, §19.4 |
| 30 | Accessibility (F89–F93) | `settings/accessibility`; app-wide | 2 | [SHOULD-SHOW] | Dynamic Type tiers T0–T3, Large Content Viewer on capped controls, Bold Text, Increase Contrast, Reduce Transparency (solid chrome), Reduce Motion, VoiceOver rotor headings/actions. One 3 s VoiceOver beat if time. | §19, §27 |
| 31 | Onboarding + safety pledge (F109) | `(onboarding)` | first run | [MUST-SHOW] (pledge ~3 s) | Skia illustrations (C 140 · R 200 · T 240 pt; hidden at T2+); P2 uses `onboarding.how.data`; tabs unreachable until the pledge is accepted. | §18, §20, §19.4 |
| 32 | Notification permission primer (F110) | `permission/notifications` | contextual (first Notify me, or Director "Enable alerts") | [BUILD-ONLY] | Grant **before** recording so no system prompt appears in takes. | §18, §30, §19.4 |
| 33 | Real location toggle (F110) | Settings → Drive Mode → "Use my real location" + `permission/location` | 2 (gear → Drive Mode; flipping the toggle is the action) | [BUILD-ONLY] (optional, cut #4) | Foreground `expo-location` only; demo default is the simulated position. | §25, §19.4 |
| 34 | How it works (F104) | `settings/how-it-works` | 2 | [SHOULD-SHOW] | 5-step vertical diagram; an animated travel dot runs gauge → creek → crossing; usable as the video's "how" beat. | §18, §20, §19.4 |
| 35 | What's real in this demo (new) | `settings/whats-real` | 1 (tap FreshnessPill) / 2 | [MUST-SHOW] (end flash ~3 s) | Three groups Real · Simulated · Planned; neutral badges (never status colors); rows test-checked against `docs/CLAIMS.md`. | §18, §31, §19.4 |
| 36 | About, credits, legal (F104) | `settings/about`, `settings/legal` | 2 | [BUILD-ONLY] | Attribution (§3.8), `legal.about`, version row; triple-tap the logo = Director (§24.1). | §18, §19.4 |
| 37 | Map attribution ⓘ | bottom-left, 8 pt above the card | 0 | [BUILD-ONLY] | `logo={false}`, `compass={false}`, attribution position derived from the card height so it is never covered. | §18, §19.4 |
| 38 | Disclaimer footer | crossing full, `drive/result`, `storm/results` | — | [BUILD-ONLY] | `disclaimer.footer` exact text. | §3.8, §19.4 |
| 39 | Demo Director (new; replaces F83 DEMO_MODE + debug) | `demo` formSheet | long-press pill 0.8 s / triple-tap About logo / gear long-press menu → "Demo Director" (§24.1) | [BUILD-ONLY] (presenter) | Scenario radio list, takes T01–T11 + O1–O4, transport, Simulate (offline, fire notification now, lock-screen take), Recording (clean mode, show touches, haptics), status (events hash, compile ms, build date). Ships in Release; meets the full design spec because judges may open it. | §24, §19.4 |
| 40 | Clean recording mode + touch overlay | Director → Recording | — | [BUILD-ONLY] | Hides Director toasts/captions; keeps the screen awake; translucent 44 pt touch circles. | §24, §30 |
| 41 | Haptics + chimes + TTS choreography (§11) | everywhere | — | [MUST-SHOW] (audible) | Exact timing §15; pair every haptic with a visible pulse. | §15, §25 |
| 42 | Live Activity + Dynamic Island (F112) | system UI from Drive Mode | event | [NEXT] (→ [SHOULD-SHOW] only if DD8 spike passes) | "FordCast · SIMULATED" first line; compactTrailing "15–30m"; no running timer. | §10, §25 |
| 43 | Share (F48) | — | — | [NEXT] | Not built: a shared "Avoid …" text from a simulated storm could circulate out of context. No menu item. | — |
| 44 | Widgets (F113), report water (F115), CarPlay / Critical Alerts / SMS / statewide (F116–F119) | `whats-real` Planned rows | — | [NEXT] | Never a button. | §31 |
| 45 | App icon + splash (F108) | Home Screen, launch | — | [MUST-SHOW] (first frame of the app segment) | Icon Composer `.icon` (4 layers, no red/amber) + splash `#0E1726`; launch "arrival" animation. | §14, §20, §19.4 |

**Orphan check.** Every phone-visible feature in A §4 has a row above. Backend-only features (F1–F27, push F67/F68, F74, F84–F88, F123–F127) have no UI home by design: they are replaced by the on-device scenario engine or appear as Planned rows in *What's real* ("Gauge readings straight from USGS every few minutes: Planned" — app copy never says "live", §3.11). [Verified: research-ui §1.2 orphan check]

### 4.3 Two-tap audit (from a cold Map Home)

| Goal | Path | Taps |
|---|---|---|
| A crossing's state + window | tap marker | 1 |
| Why (hydrograph + reasons) | marker → drag sheet to half | 1 + drag |
| Detour around it | marker → `[Detour +N min]` | 2 |
| Check my drive · Drive Mode | card buttons | 1 · 1 |
| Play the storm · Drive this storm | Storms → `[▶ Play]` · Storms → `[Drive this storm (simulated)]` | 2 · 2 |
| Storm result | auto-presents at "water on road" | 0 |
| Alerts inbox / Saved | Alerts tab / → Saved | 1 / 2 |
| Legend / Search / Gauge card | `[?]` / `[⌕]` / gauge dot | 1 |
| Spanish | long-press gear → Español (or gear → Language) | 1–2 |
| How it works / What's real | gear → row (What's real also: tap the pill) | 2 / 1 |
| Settings screens (Notifications · Accessibility · Drive Mode · About · Legal) | gear → row | 2 |
| Ranked list | `[☰]` → Ranked | 2 |
| Demo Director (presenter) | long-press the pill | 1 |

**Done when (§4):** every row tagged [MUST-SHOW], [SHOULD-SHOW] or [BUILD-ONLY] is reachable on the iPhone by the path above, fits the three test classes (§19) with no truncated status word, window, button label or crossing name at T0, and no [NEXT] row has any UI except a Planned row.

---

## §5. Repo layout (mobile app + tools only)

Create files when their feature starts (no empty placeholders). `★` = student-owned (§1.8). The `mobile/src/demo/` layout is the tested tree of 05 §22.1 (`docs/demo-prompt/05-code/`), split per §23.6; research-data §2.1's finer names are superseded.

```
Fordcast-CAC/
├─ AGENTS.md · CLAUDE.md                 # §1.11 (CLAUDE.md starts with @AGENTS.md)
├─ README.md · AI_USE.md · LICENSE (MIT) · THIRD_PARTY_NOTICES.md · CHANGELOG.md     # §32
├─ FordCast_CAC_Submission.md            # concept doc (synced per §32.6)
├─ .gitignore                            # node_modules, .expo, mobile/ios/, .env*, *.p12, *.cer, *.mobileprovision, takes/, *.mov
├─ .github/workflows/ci.yml             # npm ci + tsc + eslint + jest in mobile/ on Ubuntu (§7.1); no iOS build in CI
├─ docs/
│  ├─ demo-prompt/                       # THIS prompt: 00–06 + 03-tools/tools/ (Mac style/marker/measure tools, §13–§14) +
│  │                                     #   05-code/ (tested reference tree, §21–§28) + research/ (research-ios.md, research-ui.md,
│  │                                     #   research-data.md, proto/ (TypeScript prototype), withFreeTeamSigning.js)
│  ├─ master-prompt/                     # full production prompt = roadmap; read-only reference
│  ├─ CLAIMS.md                          # Demo Edition Claims Ledger (§31.4)
│  ├─ devlog.md                          # daily log (§1.4)
│  ├─ decisions/                         # step0.md · verifications.md · golden-changes.md (if any)
│  ├─ explain/                           # baseline-rule.md ★ · state-machine.md ★ · travel-time.md ★ · overview.md ·
│  │                                     #   scenario-engine.md · ios-free-team.md · map.md · drive-mode.md · i18n-a11y.md
│  ├─ a11y/TESTING.md                    # device checks (§27)
│  └─ media/                             # README images: hero.gif, state-ladder.png, screens/<screen>-<lang>-<class>-<tier>.png (§19.7)
├─ submission/                           # RULES_NOTES.md · CHECKLIST.md · answers.md (student) · FINAL_ACCEPTANCE.md
│  └─ video/                             # shotlist.md · script.md (student) · captions.en.srt · captions.es.srt ·
│                                        #   music-license.md · LINK.md   (raw takes live in takes/, git-ignored)
├─ tools/                                # run on the Mac, once; NEVER imported by the app
│  ├─ gen-golden.ts                      # copy of 05-code/tools/gen-golden.ts: runs the reference engine in
│  │                                     #   docs/demo-prompt/05-code/ (same events as research/proto/) → mobile/src/demo/__fixtures__/ (§1.8, §23.6)
│  ├─ make-style.mjs · validate-style.mjs · make-markers.mjs · measure-text.mjs · package.json
│  │                                     #   byte-identical copies of docs/demo-prompt/03-tools/tools/ (§13.8, §14.3, §19.3);
│  │                                     #   vendor/positron.json (downloaded) and out/ (contact sheet) stay out of the app
│  ├─ bake-demo-routes.mjs               # ORS → mobile/src/demo/data/routes.json (§21.5; or hand-traced)
│  └─ bake-creeks.mjs                    # NLDI flowlines → mobile/src/demo/data/creeks.json (§21.5; or hand-traced)
└─ mobile/                               # npx create-expo-app@latest mobile --template default@sdk-57
   ├─ AGENTS.md · .claude/settings.json  # generated; FordCast block appended (§1.11)
   ├─ app.config.ts                      # §9.4 (replaces the template's app.json): name FordCast, slug fordcast, scheme fordcast,
   │                                     #   userInterfaceStyle dark, portrait, ios.bundleIdentifier, supportsTablet false, plugins order
   ├─ locales/app.es.json                # Spanish iOS permission prompts (§9.6) — not the UI strings
   ├─ plugins/withFreeTeamSigning.js     # §9 (copy of docs/demo-prompt/research/withFreeTeamSigning.js) — FIRST in plugins
   ├─ package.json · tsconfig.json (strict, noUncheckedIndexedAccess, @/* → src/*) · babel.config.js · metro.config.js ·
   │  tailwind.config.js · src/global.css · eslint.config.js · jest config (jest-expo)        # §9, §16
   ├─ .maestro/                          # iOS Simulator flows: demo-hero · demo-unknown · demo-drive (§28.2)
   ├─ ios/                               # GENERATED by `npx expo prebuild -p ios` — git-ignored, never hand-edited
   ├─ assets/
   │  ├─ expo.icon/                      # Icon Composer icon (§14) · images/splash-icon.png
   │  ├─ map/                            # fordcast-night.json style + status sprites (§13, §14)
   │  └─ sounds/chime.wav · chime_soft.wav   # §15
   └─ src/
      ├─ app/                            # Expo Router routes = §4.1 tree (screen specs §18)
      │  ├─ _layout.tsx                  # providers (gesture root, i18n, a11y prefs, theme, demo store), fonts, Stack.Protected gate,
      │  │                               #   formSheet/fullScreenModal registrations (§16), TouchOverlay root wrapper (§24)
      │  ├─ (onboarding)/ _layout · welcome · how · map-key · pledge · alerts-primer   (names per §16.4: no URL collisions)
      │  ├─ (tabs)/ _layout.tsx (NativeTabs + BottomAccessory) · index.tsx (Map Home) ·
      │  │          drive/{_layout,index,result}.tsx · storms/{_layout,index}.tsx · alerts/{_layout,index}.tsx
      │  ├─ nearby.tsx · crossing/[id].tsx · gauge/[id].tsx · search.tsx · legend.tsx
      │  ├─ storm/[id].tsx · storm/results.tsx · drive-mode.tsx · demo.tsx · permission/[kind].tsx
      │  ├─ settings/ _layout · index · notifications · accessibility · drive · how-it-works · whats-real · about · legal
      │  └─ dev/gallery.tsx (`__DEV__` only, §17) · smoke.tsx (Day 1 only, 02 §9.10; deleted before the UI freeze)
      ├─ components/ui/                  # React Native Reusables copy-ins: button · card · text (+ toggle-group only as the §16.3 fallback)
      ├─ components/fordcast/            # §17 library (AppText, StatusGlyph, StatusChip, GlassSurface, FreshnessPill,
      │                                  #   AreaStatusCard, CrossingRow, RiskRing, RiskWindow, EtaRangePill, Hydrograph, LagPair,
      │                                  #   AlertBanner, StormCard, ScenarioAccessory/MiniBar, Scrubber, DriveHUD, BigActionButton, …)
      ├─ demo/                           # the scenario engine (§21–§26) — the TESTED file names of 05 §22.1 / 05-code/ (canonical)
      │  ├─ engine/                      # PURE (no React, no Date.now(), no imports from sim/): types · features · windows ·
      │  │                               #   explain · combine · baseline-rule ★ · state-machine ★ · travel-time ★ · engine (barrel, §23.6)
      │  ├─ sim/                         # sim.ts: PRNG · hydrographs · readings · hidden truth (truth used ONLY in compile.ts results)
      │  ├─ data/                        # demo-data.ts (GAUGES · CROSSINGS · LINKS) · routes.json · creeks.json
      │  ├─ scenario/                    # schema · scenarios · compile · source (golden → live switch, §1.8) · golden · display ·
      │  │                               #   clock · choreography · player · takes
      │  ├─ i18n/                        # tr.ts (pure translator over src/locales) · reasons.ts
      │  ├─ drive/                       # drive.ts (geometry, routes, Fix stream, lockout, speech plan) · sim-drive.ts (runner hook)
      │  ├─ notify/                      # content.ts (pure builders) · adapter.ts (expo-notifications, local only)
      │  ├─ voice/                       # speak.ts (expo-speech + expo-audio chimes) · haptics.ts (expo-haptics, two gates)
      │  ├─ store/                       # demo-store.ts (zustand 5.0.15) · hooks.ts (useSimMinute, useTick, useCrossingRisk, useAllRisks, useScenarioBanner)
      │  ├─ director/                    # actions.ts (Reset, takes, clean mode) · TouchOverlay.tsx   (the Director screen is src/app/demo.tsx)
      │  └─ __fixtures__/                # <scenario>.compiled.json · golden-hashes.json (tests only after Day 6)
      ├─ content/whats-real.ts           # Real / Simulated / Planned rows, each with a claimId (§31)
      ├─ lib/                            # theme.ts (token mirror) · useTheme.ts · navTheme.ts · i18n.ts (imports intl-pluralrules first) ·
      │                                  #   format.ts (en-US / es-US, America/Chicago) · layout.ts (height/width classes, §19) · glass.ts (tier) ·
      │                                  #   a11y/A11yPrefsProvider.tsx · motion.ts · settings.ts (kv-store) · alerts-inbox.ts · saved.ts ·
      │                                  #   short-names.ts (§17.2) · utils.ts (RNR `cn`)
      ├─ locales/                        # en.json · es.json · banned-words.json · es-pending-review.json
      └─ __tests__/                      # ALL tests, named <name>-test.ts: demo-{engine,display,scenarios,player,golden} (05-code) ·
                                         #   baseline-rule ★ · state-machine ★ · travel-time ★ · copy-banned · i18n-parity · claims-whats-real ·
                                         #   layout (class math) · code-guards · tokens-parity · contrast · no-green · glyph-geometry ·
                                         #   no-hand-typed-numbers · no-success-haptic · labels (§31.1)
```

**Import boundaries** (enforced by an ESLint `no-restricted-imports` rule or a test): `demo/engine/**` imports only `demo/engine/**`; only `demo/scenario/compile.ts` (its results block) calls `truthOnset()` from `demo/sim/sim.ts`; nothing outside `__tests__/` (and the GOLDEN-form `source.ts` before the Day 6 gate) imports `__fixtures__/`; `app/**` never imports `demo/sim/**`; nothing imports `docs/**` or `tools/**` at runtime.

---
## §6. Day-by-day plan — Thu Oct 15 → Sun Oct 25, 2026 (UI-first)

Day 1 = Thu Oct 15. **If you start on Fri Oct 16, Day 1's tasks still come first and are never shortened;** absorb the lost day with the §6.3 cut order, not by skipping the Day 1 gate. Every day ends with the devlog entry and tomorrow's student task list (§1.4). "Device" = the student's iPhone; "Sim" = iOS Simulator on the Mac. The student's own tasks are also listed day by day in `00-START-HERE.md`.

### 6.1 Day by day

**Day 1 · Thu Oct 15 — Prove the iPhone path** (§8–§11; research-ios §5 Phases A–E) · **gate deadline: end of Fri Oct 16 at the latest**
- *Agent:* Step 0 (§1.2) → commit the prompt folder if missing (`docs: add demo edition prompt`) → scaffold `mobile/` (§9.2) → run **the single native install list** (§9.3) so every native module is in the first build → `mobile/app.config.ts` with the final bundle ID and `./plugins/withFreeTeamSigning` **first** (§9.4–§9.5) → the temporary smoke screen `src/app/smoke.tsx` (§9.10: map, "Notify in 8 s" with subtitle "Simulated storm · demo data", Speak EN/ES, Error haptic, Skia circle) → `npx expo prebuild -p ios --clean` → the §9.7 verification greps → agent files (§1.11), `.gitignore`, `docs/devlog.md`, `docs/decisions/verifications.md`.
- *Student:* Mac + Xcode + iPhone setup and pairing (§8), Apple Account in Xcode (Personal Team), Developer Mode, first Debug run (§9.9), then the Release run (§11.2); confirm the district; read the CAC rules (Step 0 Q6–Q7).
- **Gate (go / no-go) = §9.10 smoke test S1–S8:** S1 signs and installs with the final bundle ID · S2 map tiles render · S3 the local notification lands on the **Lock Screen** with title + subtitle and opens the app · S8 the **Release** build opens **unplugged** — these four MUST pass before any UI work; S4 speech audible (Silent off), S5 haptic, S6 Skia smooth, S7 no UIScene crash on the Xcode 27 path are fixed in parallel. Also `grep -c aps-environment ios/*/*.entitlements` prints 0. **If the gate fails:** work §11.6; if the Mac can't run Tahoe 26.2+ or no Apple Account can sign, stop and ask (§1.7) — options: borrow a capable Mac (school, library, relative) or use a parent's Apple Account.

**Day 2 · Fri Oct 16 — Foundations and data**
- *Agent:* tokens (`lib/theme.ts`, Tailwind, `global.css`; §13), Inter with tabular numerals, `AppText`, i18n with the full §3.7 bank + `banned-words.json` + copy and parity tests; NativeTabs shell (Map · Drive · Storms · Alerts, gear) and every Stack/sheet registration (§16); `GlassSurface` three tiers; `StatusGlyph` + `StatusChip`; FordCast Night style + sprites (§13–§14); port the non-★ engine (`types`, `features`, `windows`, `explain`, `combine`), `sim/`, `data/`, `scenario/{schema,compile,clock,display,keyframes,takes}`, `store/` with their tests (research-data §8 "Porting"); `tools/gen-golden.ts` → `__fixtures__/` + `golden-hashes.json`; `scenario/source.ts` in golden mode; ★ #1 prep (failing tests, skeleton, explain doc); icon/splash drafts.
- *Student:* approve icon/splash; ask the Spanish reviewer; 5-minute gauge-coordinate check on the Mac for the [Unverified] sites (research-data §1.2); download enhanced EN and ES voices on the iPhone; (if Step 0 Q15 = yes) create the ORS key.
- **Gate:** Sim shows the 4 native tabs and the styled map with the calm scenario: 17 monitored crossings ○ and 8 tier-C ◌; all Jest suites green; `tsc` clean.

**Day 3 · Sat Oct 17 — Map Home** · ★ pause #1
- *Agent:* full Map Home (§18): top band (FreshnessPill + `[?]` `[⚙]`), glass control stack `[⌕][☰][➤]`, AreaStatusCard (calm and scenario forms, measured button rule), creek/gauge/crossing layers with clusters, edge fades, AlertBanner, `nearby`, `legend`, `search`; scenario clock + `useSimMinute`/`useCrossingRisk`; ScenarioAccessory (iOS 26) + ScenarioMiniBar (< 26); Demo Director v0 (scenario list, transport, Reset); baked or draft routes/creeks; ★ #1 hand-off message.
- *Student:* ★ #1 `baseline-rule.ts` (~1.5 h); gauge and crossing map check (do the hero crossings sit on the right creek?).
- **Gate:** take T01-calm looks right on the device (Debug); switching to `flash-flood-night` at 7:00 AM shows Jones Rd ◆ with the violet frame, SIMULATED pill and accessory; no clipping on SE / 16 / Pro Max Sims.

**Day 4 · Sun Oct 18 — Crossing sheet and gauge card** · ★ pause #2
- *Agent:* `crossing/[id]` with computed peek detent, half, full, and every state variant (NO_RISE, WATCH ± window, AVOID, AVOID `_now`, CLOSED official/sensor, UNKNOWN offline/not-monitored with "Last known"); RiskRing, RiskWindow, EtaRangePill, Skia Hydrograph with trigger line and draw-on, ReasonList (incl. `_peaked`), LagPair; `gauge/[id]`; detent haptics; review ★ #1; ★ #2 prep and hand-off.
- *Student:* fix ★ #1 review comments; ★ #2 `state-machine.ts`.
- **Gate:** T02-rising (▲ Watch, hydrograph climbing toward the 6.0 ft trigger, "30–45 min" travel range) and T07-sheet (◆ Avoid 15–30) render correctly; the peek action row is fully visible on SE and iPhone 16.

**Day 5 · Mon Oct 19 — Storms: the signature moment** · ★ pause #3
- *Agent:* Storms tab cards; `storm/[id]` player (map fit, water pulse with wavefront dot, marker escalation 120 ms after the dot arrives, story caption, LagPair, transport with ticks/speeds/auto-slow), `storm/results` (count-up + honesty + rule + closure gap + window check); "one clock" (closing the player keeps the clock running; accessory + violet Map Home); Director takes T03–T05; review ★ #2; ★ #3 prep and hand-off.
- *Student:* fix ★ #2 review comments; ★ #3 `travel-time.ts`.
- **Gate:** T03-player plays 6:35 → 7:35 AM at 60× with auto-slow and shows ▲ 6:45, ◆ 7:00 "15–30 min", ● water on road 7:30; T04-results shows **30** min, median 30 across 3 crossings, closure gap 50, window check "inside"; smooth on the device.

**Day 6 · Tue Oct 20 — Live engine, alerts, Check My Drive**
- *Agent:* **switch `scenario/source.ts` to the live on-device engine** (golden-equality test green; fixture branch deleted); local notifications (handler, foreground posts at beats, the 8 s lock-screen take, response → seek + route; §25); Alerts tab (Inbox, Saved, Notify me, badge); Drive tab (place chips, Check My Drive, `drive/result` verdict, detour drawing, hand-off menu); Director takes T06–T08; review ★ #3.
- *Student:* fix ★ #3 review comments; answer all explain-back questions; draft your Q2 memory (§32.3).
- **Gate:** engine live and equal to golden; on the **device**, T06 → T07 works (lock, banner ≈ 8 s later, tap, Face ID, sheet at Avoid 15–30); T08 detour → `drive/result` → `[Start Drive Mode]` button present. **If a ★ file still fails:** §1.8 timebox escalation (stop and ask).

**Day 7 · Wed Oct 21 — Drive Mode, Settings, onboarding → FEATURE FREEZE 18:00 CT**
- *Agent:* `drive-mode` (HUD, ribbon, follow map on R/T, speech queue + chimes + haptics + edge glow, SIMULATED DRIVE), `sim-location`, lockout; Settings (SwiftUI `Form` with `tint('#6CB4FF')`: language, notifications, haptics/sounds/spoken toggles, accessibility, drive, how-it-works, whats-real, about, legal); onboarding + pledge + notification primer; icon + splash in the build; Director takes T09–T11 + O1–O4, Clean recording mode, Show touches.
- *Student:* 10-second QuickTime test clip (9:41 status bar? app audio captured?); create the "Recording" Focus; DD8 decision (only if every [MUST-SHOW] passes).
- **Gate (feature freeze):** every [MUST-SHOW] row of §4 works on the device in **EN and ES**; the takes test is green. After 18:00 CT: fixes, polish, copy and accessibility only. The DD8 spike, if approved, gets ≤ 90 min on Day 8 (§10.3) and is reverted the same day if it doesn't sign and run.

**Day 8 · Thu Oct 22 — Polish, fit, rehearsal → COPY FREEZE 18:00 CT**
- *Agent:* signature moments and the polish list (§20; research-ui §4); fit matrix pass (§19: SE, iPhone 16/17, Pro Max Sims × T0/T1/T3 × EN/ES) with screenshots; VoiceOver, Bold Text, Reduce Motion/Transparency, Increase Contrast checks (§27); Maestro flows on the Sim (§28); README, `AI_USE.md`, `docs/CLAIMS.md`, *What's real* final; `submission/video/shotlist.md` from §29.
- *Student:* Spanish review finished (`es-pending-review.json` empty); 5-minute comprehension check with 3–5 people ("What does 'No rise detected' mean for you?"); rehearse every take on the device; **evening: fresh Release build installed** (renews the 7-day profile through about Thu Oct 29); device prep checklist (§30.1); first VO script draft in your own words.
- **Gate:** §33 part A passes on the device; all 11 MUST takes reproduce in rehearsal.

**Day 9 · Fri Oct 23 — Record**
- *Agent:* bug fixes only. Any code change after the Thursday Release install requires a new Release build and a re-check of every affected take. Keep the Director takes' expected-state captions handy for the student (Clean mode off between takes, on during takes).
- *Student:* record T01–T11 (≥ 3 good takes each) with QuickTime (§30), plus the non-Director shots of §29.4 (launch, pledge, language flip, How it works, What's real), then O1–O4 if time; backup capture with iOS Screen Recording; B-roll (dry crossing in daylight, parked car); copy all clips to two places.
- **Gate:** every MUST take has ≥ 1 clean clip with its labels visible and audio where needed.

**Day 10 · Sat Oct 24 — Voice-over, edit, answers → CODE FREEZE 18:00 CT**
- *Student:* record the VO (own voice); edit (§29.6); EN + ES captions; export 1080p; upload (§32.1 visibility); write Q1–Q4 in your own words (§32.3); read and initial the Claims Ledger (§31.4).
- *Agent:* check the script and captions against §31 (labels, numbers, never-say list); draft captions for the student to correct; README final; `THIRD_PARTY_NOTICES.md`; §33 pre-check from a clean clone.
- **Gate:** the video is uploaded and plays logged-out; §33 pre-check passes.

**Day 11 · Sun Oct 25 — Submit**
- *Agent:* final §33 run; tag `cac-2026-submission` (stop-and-ask before making the repo public).
- *Student:* submit the CAC form; save the confirmation as PDF; keep the Mac set up (a live demo later needs a fresh Release build that day).
- Official deadline Mon Oct 26, 12:00 PM ET (= 11:00 AM CT) is **buffer only**.

### 6.2 Freezes, builds and the 7-day profile

| When | What |
|---|---|
| Thu Oct 15 – Fri Oct 16 | First device install (§9.10 smoke test) → profile issued; expires ≈ Oct 22–23 [Verified: Apple "expire 7 days from issuance"]; check the date (§11.4) |
| Wed Oct 21 18:00 CT | **Feature freeze** |
| Thu Oct 22 18:00 CT | **Copy freeze** (EN + ES); the evening **Release build for recording** is installed (new profile, ≈ through Thu Oct 29) |
| Fri Oct 23 – Sat Oct 24 morning | Recording; on recording day, if the app launches, record; if it doesn't, plug in and rebuild Release (≈ 5 min) |
| Sat Oct 24 18:00 CT | **Code freeze** |
| Sun Oct 25 | Submit |

### 6.3 Cut order (if behind) and the never-cut list

Cut from the top, one item at a time, and record each cut in `docs/devlog.md` and `docs/CLAIMS.md` (the row becomes [NEXT]):
1. Live Activity spike (DD8) · 2. Gauge mini-card · 3. Search sheet (keep the `nearby` list) · 4. Real-location toggle · 5. Hand-off menu (keep the detour on the map) · 6. Saved segment + Notify me (keep the pre-saved hero route) · 7. Driver lockout · 8. Drive Mode follow-map strip · 9. How-it-works animation (static diagram) · 10. Onboarding illustrations (static art) · 11. Alerts Inbox list (keep the lock-screen notification) · 12. "Big Onion Creek storm" card (then T11 shows UNKNOWN with the Director's "Simulated offline" on `flash-flood-night`, captioned the same way).

**Never cut:** §3 safety and copy; every honesty label; Map Home + crossing sheet with hydrograph; storm player + results; the one-clock accessory; the lock-screen notification take; Check My Drive + detour; Drive Mode voice in EN and ES; *What's real*; the pledge; the ★ files (or their human-approved mode); the takes and golden tests; the Release build on the iPhone.

### 6.4 Risks

| Risk | Mitigation | § |
|---|---|---|
| Mac can't run macOS Tahoe 26.2+ | Found on Day 1; borrow a capable Mac; EAS cloud device builds need a paid account, so they don't help | §8 |
| Student's Apple Account refused for development | Sign Xcode in with a parent's Apple Account | §8 |
| iOS 27 launch crash (UIScene) / Xcode 27 pod deployment-target errors | `enableSceneSupport: true` + the pod floor in `withFreeTeamSigning.js` | §9, §11 |
| `aps-environment` sneaks back (expo-notifications auto-plugin) | Plugin listed first; grep after every prebuild | §9 |
| App ID limit (10 per 7 days) or 3-apps-per-device limit | One bundle ID forever; no scratch projects; delete other dev-signed apps | §10 |
| Profile expires mid-recording | Fresh Release build Thursday evening | §6.2, §11 |
| MapLibre SPM fetch fails on first build | github.com reachable; Xcode → Reset Package Caches | §11 |
| Tiles slow/missing on recording day | Good Wi-Fi; pan the demo area once before takes | §30 |
| TTS silent in recording | Silent mode off; volume ~60 %; QuickTime mic = iPhone | §30 |
| Touch overlay misses map touches | Fallback: add tap markers in the edit | §24, §30 |
| Safe-area insets with the iOS 26 tab bar/accessory differ from the plan | Day 2 log of insets with the accessory shown/hidden; fallback constants | §19 |
| A ★ file is late | Golden fixtures keep the UI moving; Day 6 escalation | §1.8 |
| Spanish review late | Reviewer booked Day 2; copy freeze Thu 18:00 CT; else "Spanish (review in progress)" wording | §27, §31 |

---

## §7. Definition of Done (global)

### 7.1 Code gates (must pass locally before every commit; also in CI)

- `cd mobile && npx tsc --noEmit` (strict, `noUncheckedIndexedAccess`) → 0 errors · `npx eslint .` → 0 errors · `npx jest` → all green: ★ files, engine, display, demo (dataset + routes: `crossingsOnRoute(commute) = [atx-37, atx-692]`, `crossingsOnRoute(detour) = []` at 40 m), **takes** (every take's promised on-screen states), **golden** (live engine events hash = golden), clock, notify content (title ≤ 50, body ≤ 150 chars, subtitle present, EN + ES), copy-banned, i18n-parity, claims ↔ *What's real*, layout class math, code guards.
- `npx expo install --check` and `npx expo-doctor@latest` clean.
- After every prebuild: the §9 greps (no `aps-environment`; pod floor block; `MLRN.post_install`; scene manifest on the Xcode 27 path).
- **CI:** `.github/workflows/ci.yml` runs `npm ci`, `tsc`, `eslint` and `jest` in `mobile/` on Ubuntu for every push (no iOS build in CI). Green on the submitted tag.

### 7.2 Safety and copy
No banned word (EN/ES); windows only from the buckets; `lo = 0` uses `_now`; travel time only as a range; no countdown; no green; no checkmark on a crossing; no `Success` haptic; Unknown never looks calm; official closure labeled OFFICIAL with "Simulated road crew"; pledge, footer, legal and attribution texts match §3.8 exactly.

### 7.3 Honesty
Every surface in §3.9 carries its label in every state and both languages; no real agency named as a source; no POD/FAR/CSI/accuracy number; no USGS links or station numbers in the UI; every sentence in the app, README, video and answers maps to a `docs/CLAIMS.md` row (§31.4).

### 7.4 Fit and accessibility (per screen touched)
Layouts use `useWindowDimensions()` + `useSafeAreaInsets()` and the §19 classes, never per-model constants. No clipped/truncated status word, window, button label or crossing name on SE, iPhone 16/17 and Pro Max at T0 (designed layout) and T1–T3 (stacked, list-first) in EN and ES; capped controls show the Large Content Viewer; every interactive element has a role and a label that starts with its visible text; headings use `accessibilityRole="header"`; touch targets ≥ 44 pt (custom controls 48 pt); Reduce Motion stops loops without a restart; Reduce Transparency gives solid chrome (§27).

### 7.5 Performance budgets (targets; measured in Release on the device, §28)
Cold start to an interactive Map Home ≤ 2.5 s · scenario compile ≤ 30 ms each (prototype: 6–30 ms JIT-less [Verified: research-data §8]) · risk consumers re-render at most once per 5-minute tick (≤ every 2.5 s at 120×) · water pulse, scrubbing and sheet drags without visible stutter at 60 fps · map `contentInset` changes only on layout change, never per frame.

### 7.6 Release readiness (the build used for recording)
Built from a clean checkout with `npx expo run:ios --device --configuration Release --no-bundler`; launches unplugged; no dev menu or LogBox; Demo Director reachable only through its hidden gestures; notification and location permissions granted beforehand; 15-minute exploratory session in EN and in ES with 0 crashes; every take rehearsed.

### 7.7 Docs and history
`docs/devlog.md` has an entry for every day; `AI_USE.md` per-file authorship is current; `docs/explain/` has the three ★ docs with the student's answers and review Q&A plus the module docs listed in §5; small commits on every day; no squashes or force-pushes; no `TODO(student)` left at the tag.

**Done when (§1–§7):** Step 0 is recorded, the Day 1 gate passed, every day's gate is logged in the devlog, and §33 passes on Oct 25.
