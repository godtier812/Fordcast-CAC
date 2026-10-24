# FordCast — DEMO EDITION Master Prompt (iPhone, simulated data)

> **Version 1 · written 2026-10-16 · Congressional App Challenge 2026** (national deadline Mon Oct 26, 12:00 PM ET — **submit Sun Oct 25**).
> This Demo Edition **replaces** the full production prompt (`docs/master-prompt/`) for the CAC build. The full prompt stays as the roadmap. Built from three verified research reports (`docs/demo-prompt/research/research-ios.md`, `research-ui.md`, `research-data.md`), a working TypeScript prototype of the demo engine (`docs/demo-prompt/research/proto/`), and the full prompt. Package versions were checked on the npm registry on 2026-10-15/16. Anything not confirmed is marked **VERIFY BEFORE USE** or **[Unverified]**.

---

## How to use this prompt *(for the human — read first)*

1. **Where it lives.** `docs/demo-prompt/` holds seven files plus `03-tools/`, `05-code/` and `research/`:

   | File | Sections | Contents |
   |---|---|---|
   | `00-START-HERE.md` | — | This page: how to use it, what changed, your tasks by day, the decision sheet, contents |
   | `01-scope-rules-plan.md` | §1–§7 | Agent rules, the story, safety + copy bank (EN/ES), feature → screen fit table, repo layout, day-by-day plan Oct 15 → 25, Definition of Done |
   | `02-ios-build-path.md` | §8–§11 | Mac/Xcode/iPhone setup with a free Personal Team, the Expo SDK 57 project and signing, the free-team capability matrix, Release builds, the 7-day re-sign, troubleshooting |
   | `03-ui-design-system.md` | §12–§15 | iOS-first design principles and Liquid Glass, tokens, SF Symbols and status glyphs, motion/haptics/sound |
   | `04-ui-screens.md` | §16–§20 | Template and component import plan, component library, every screen and state with wireframes, the iPhone fit matrix (SE → Pro Max, Dynamic Type), signature moments |
   | `05-demo-engine.md` | §21–§28 | Demo dataset, scenario engine and timeline format, on-device forecast rule, Demo Director, notifications + Drive Mode voice + simulated drive, the storm player, accessibility + Spanish, testing |
   | `06-video-and-submission.md` | §29–§33 | Video plan and shot list, recording on the iPhone, honesty labels + Claims Ledger, CAC answers + README, final checklist |
   | `03-tools/tools/` | (§13.8, §14.3, §19.3) | Byte-identical, already-run Mac tools: `make-style.mjs`, `validate-style.mjs`, `make-markers.mjs`, `measure-text.mjs`, `package.json` — copied into the repo's `tools/`, never retyped |
   | `05-code/` | (§21–§28) | The type-checked, tested reference tree (35 files: `mobile/src/demo/**`, five `demo-*-test.ts`, starter `locales/{en,es}.json`, `tools/gen-golden.ts`). **MUST be committed with the prompt**; the ★ functions in it are never copied (§1.8, §23.6) |
   | `research/` | — | `research-ios.md` (free-team signing, recording), `research-ui.md` (UI audit, fit), `research-data.md` (dataset, scenarios, takes), `proto/` (engine prototype), `withFreeTeamSigning.js`. Research is input only: where it disagrees with 00–06 (e.g. "Storm tonight", a "SIMULATED ·" title prefix, 38 min), **00–06 win** |

2. **Run Claude Code on your Mac**, in a terminal at the repo root, so it can build to the Simulator and your iPhone itself. (A cloud session can write code and run tests, but then *you* run every device command and paste the output back.)

3. **Start the agent.** Paste exactly:
   > *"Read every file in docs/demo-prompt/ in numeric order (00 → 06). This Demo Edition replaces docs/master-prompt/ for now; open master-prompt files only where a Demo Edition section points to an exact file and §. Then do §1.2 Step 0: ask me the Step 0 questions in one message, and don't write code until I answer."*

   For every later session:
   > *"Re-read docs/demo-prompt/00-START-HERE.md and 01-scope-rules-plan.md, read docs/devlog.md, then the sections listed for today in §6, and continue from §6 Day N."*

4. **Don't cherry-pick sections.** Sections cross-reference each other (§ numbers), and the safety, honesty and ★ rules in §1 and §3 apply everywhere.
5. **Expect checkpoints:** a gate at the end of every day (§6), pauses at the three **★ student-owned files** (§1.8), and stop-and-ask moments (§1.7) before anything is published.

---

## What changed vs. the full build

| Area | Full build (`docs/master-prompt/`) | **Demo Edition** (this prompt) | § |
|---|---|---|---|
| Goal | Live forecasting service, proven on real historic storms | A polished iPhone demo that **shows** the solution in the video, honestly labeled | §2 |
| Platform | Android-first dev build (EAS); iOS optional | **iOS only**, iPhone via **Xcode + free Apple Account "Personal Team"** (7-day profile) | §8–§11 |
| Data | Live USGS gauges every 5 min + real storm replays | **Simulated** gauge readings from a deterministic scenario engine; **real** crossing names/locations (City of Austin open data) and USGS gauge names | §21–§22 |
| Forecast logic | Python backend (`tick()`) | **The same rule, ported to TypeScript, running on the phone** | §23 |
| Backend | FastAPI on Render + Supabase + pg_cron | **None** (on-device only); no accounts, no analytics | §1.5, §5 |
| Proof / numbers | Backtest POD/FAR/CSI on real storms | Engine-computed lead time **"in this simulated storm"** (30 min, fixed rule, median shown); **no accuracy metrics** | §31 |
| Replay tab | "Replay" of real storms | **"Storms"** tab of simulated storms; one global scenario clock drives every screen | §22, §26 |
| Alerts | Expo push (FCM/APNs) | **Local notifications** (lock screen works; no push on a free team) | §25 |
| Routing | OpenRouteService via the backend | **Precomputed** route + detour on real streets (baked once on the Mac) | §21 |
| Map Home | gorhom persistent bottom sheet | Floating AreaStatusCard + **native formSheets** | §18 |
| Look | Solid surfaces; Liquid Glass = stretch | **Liquid Glass chrome is MVP** (iOS 26+), blur fallback, solid under Reduce Transparency | §12–§13 |
| Settings | Custom screens | Native **SwiftUI Form** (`@expo/ui`) | §18 |
| Demo controls | `DEMO_MODE` build flag + `__DEV__` debug screen | **Demo Director** in the Release build (hidden, presenter-only) + clean recording mode | §24 |
| Student-owned core | 4 Python files | **3 TypeScript files**: forecast rule, state machine, travel-time learner | §1.8 |
| Recording | scrcpy on Android | **QuickTime over cable** from the Release build (clean status bar), iOS Screen Recording as backup | §30 |
| Cost | ≈ $17–21 (Render Starter) | **$0** | — |
| Accounts | Expo, Supabase, Render, Firebase, USGS key, ORS, healthchecks, UptimeRobot, Sentry, YouTube | **Apple Account** (free) + **YouTube**; optional free ORS key for one route bake | §1.2 |

**Unchanged invariants:** the safety principle and the five states (No rise detected · Watch · Avoid · Flooded – Closed · Unknown – data offline; ES: Sin crecida detectada · Precaución · Evite · Inundado – Cerrado · Desconocido – sin datos), ranges not countdowns, official closures override, stale → Unknown, 4-way status encoding, the dark night-first palette, Inter with tabular numerals, Expo SDK 57 (RN 0.86.3, React 19.2.3), MapLibre RN 11.5.0 + OpenFreeMap "FordCast Night", NativeWind 4.2.7 + React Native Reusables, Expo Router NativeTabs, Reanimated 4.5.1, Skia 2.6.2, expo-symbols, expo-haptics, expo-speech, i18next EN/ES.

---

## What *you* (the student) must do — the agent can't do these

Day 1 = Thu Oct 15. §6 owns the schedule; this table mirrors it. **(If you start on Fri Oct 16, do Day 1's tasks first anyway.)**

| When | Your task | § |
|---|---|---|
| **Day 1 · Thu Oct 15** (gate by Fri Oct 16 at the latest) | Check the **iPhone's iOS version** (Settings → General → About) and **pause iOS updates** until the video is done. Check the **Mac** can run macOS Tahoe 26.2+ (26.6+ for Xcode 27). Install **Xcode** (version per your iOS), accept the license, install the iOS platform. Sign in: Xcode → Settings → Apple Accounts (or Accounts) → your **Apple Account** (a parent's if yours is refused) → "Your Name (Personal Team)" appears. Pair the iPhone by cable, **Trust**, turn on **Developer Mode** (Settings → Privacy & Security), restart. Pick your **bundle ID** (`com.<lastname>2026.fordcast`) — never change it. Run the first Debug build, then the **Release** build; if iOS says "Untrusted Developer": Settings → General → VPN & Device Management → Trust. Answer Step 0. Confirm your **district** at house.gov with your full address and read the **CAC 2026 rules** (paste the AI rule and the video-visibility rule). | §1.2, §8–§11, §32.1 |
| Day 2 · Fri Oct 16 | Approve the app icon and splash. Ask a fluent adult to **review the Spanish** (by Thu Oct 22). Check the gauge coordinates the agent lists (5 min). Download **enhanced English and Spanish voices** on the iPhone (Settings → Accessibility → Spoken Content → Voices). Optional: free OpenRouteService key for the route bake. | §1.2, §27 |
| Day 3 · Sat Oct 17 | **★ Student task #1:** `baseline-rule.ts` (~1.5 h). Check on the map that the hero crossings sit on the right creek. | §1.8 |
| Day 4 · Sun Oct 18 | Fix review comments on #1. **★ Student task #2:** `state-machine.ts`. | §1.8 |
| Day 5 · Mon Oct 19 | Fix review comments on #2. **★ Student task #3:** `travel-time.ts`. | §1.8 |
| Day 6 · Tue Oct 20 | Fix review comments on #3. Answer the explain-back questions in your own words. Start your Q2 memory. | §1.8, §32.3 |
| Day 7 · Wed Oct 21 | Record a **10-second QuickTime test clip** (is the status bar 9:41? is app audio captured?). Create the **"Recording" Focus** that allows only FordCast. Decide on the Live Activity spike (only if everything else works). | §30 |
| Day 8 · Thu Oct 22 | Spanish review done. 5-minute check with 3–5 people ("What does 'No rise detected' mean to you?"). **Rehearse every take** on the iPhone. **Evening: install a fresh Release build** (renews the 7-day profile through about Oct 29). Do the device prep checklist. Draft the voice-over in your own words. | §6, §29.7, §30.1 |
| **Day 9 · Fri Oct 23** | **Record** every take (≥ 3 good takes each) plus the five non-Director shots S1–S5 (launch, pledge, language flip, How it works, What's real; §29.4) with QuickTime; backup with iOS Screen Recording; film B-roll away from any floodwater; copy clips to two places. | §29, §30 |
| **Day 10 · Sat Oct 24** | **Record the voice-over** (your own voice). Edit (DaVinci Resolve), add EN + ES captions, export 1080p, **upload** (Public unless the 2026 rules allow Unlisted). Write **Q1–Q4 in your own words**. Read and initial the Claims Ledger. | §29, §31.4, §32 |
| **Day 11 · Sun Oct 25** | Final checklist. Make the repo public (agent asks first). **Submit** the CAC form; save the confirmation as PDF. Keep the Mac set up. | §33 |
| After | A live demo later needs a fresh Release build that day (the app stops launching 7 days after its profile was issued). Two 10-minute Q&A mocks (Oct 24 and mid-November). | §11, §31.5 |

**Money:** $0. A free Apple Account is enough; never buy the $99 program for this demo without asking (§1.7).

### Honest scope note
Eleven days is enough for a **beautiful, honest demo**, not for the live service. So the app runs the real forecasting logic on **simulated** storms and says so everywhere: a DEMO chip, violet SIMULATED labels, a title card in the video, and a *What's real in this demo* screen. Judges see a working app on a real iPhone; at Q&A you can say: *"The water is simulated; the code is real. Live USGS data is the next step."*

---

## Executive decision sheet *(one-page summary; details in the § listed)*

| Area | Decision | Why | § |
|---|---|---|---|
| Safety | **Never "safe."** Five states with **shape + glyph + word + color**; ranges, never countdowns; official closures override; stale → Unknown; no green, no `Success` haptic | False reassurance raises risk | §3 |
| Honesty | Every simulated surface labeled (DEMO chip → violet SIMULATED pill/frame, SIMULATED STORM banner, SIMULATED DRIVE, notification subtitle "Simulated storm · demo data"); closure source "Simulated road crew"; no accuracy metrics; no real-agency names | Costs nothing; protects you at judging | §1.5, §31 |
| Platform & build | **iOS only**, Expo SDK 57 (`--template default@sdk-57`; `expo@latest` is now 58 — never use it), local **Xcode** builds, free Personal Team; `plugins/withFreeTeamSigning.js` listed **first** strips the push (and any other paid) entitlement — check `grep -c aps-environment` = 0 after every prebuild; every take is recorded from a **Release** build installed ≤ 24 h before | Free account, real iPhone, no EAS | §8–§11 |
| Xcode path | iPhone on iOS 26 → Xcode 26.6 (macOS Tahoe 26.2+); on iOS 27 → Xcode 27.1 (Tahoe 26.6+) + `enableSceneSupport` | Xcode 27 + iOS 27 crash fix; SDK 57 needs Xcode ≥ 26.4 | §8, §9 |
| Data | Simulated readings over **25 real crossings** and **14 real USGS gauge sites**; 4 deterministic scenarios; hero **Williamson Creek at Jones Road**: Avoid 7:00 AM ("15–30 min"), water 7:30 → **30 min** (median 30), closed 50 min after Avoid | Every number computed by the engine | §21–§23 |
| Network | **Only OpenFreeMap tiles/glyphs** at runtime (style JSON is bundled); no backend, no APIs. Offline → cached tiles, or the night background + FordCast's own layers with "Map details unavailable"; scenarios, alerts and voice need no network (smoke test S8, §11.3) | Fake data only; nothing to break on camera | §1.3 #9, §13.8, §31.4 D28 |
| Engine | Pure TypeScript on the phone: baseline rule ★ → precedence → state machine ★; travel-time learner ★; one global clock (1–120×) | The code genuinely demonstrates the bridge | §22–§23 |
| UI | Expo default template + NativeTabs (**Map · Drive · Storms · Alerts**) + Liquid Glass chrome + native formSheets + SwiftUI Settings; RNR limited to Button/Card/Text (ToggleGroup only as the fallback if the native segmented control fails, §16.3); Skia for charts and signature moments | Native, premium, fits every iPhone | §12–§20 |
| Fit | Every layout from window size + safe-area insets; classes SE (C·N) / regular / tall; Dynamic Type tiers T0–T3; tested on SE, iPhone 16/17, Pro Max | "Fits everything" | §19 |
| Alerts | **Local notifications** (`active` level), lock-screen take via an 8 s OS-scheduled notification; Live Activity = Next unless a ≤ 90 min spike (§10.3) signs | Push is impossible on a free team | §10, §25 |
| Demo control | **Demo Director** in Release (long-press the freshness pill): scenarios, one-tap takes T01–T11, transport, clean recording mode, touch overlay | Repeatable takes for the video | §24 |
| Video | 2:15–2:30, own voice, ≥ 60 % app footage, honesty title card, tools-used + AI disclosure segment, EN + ES captions; recorded from the Release build via QuickTime | CAC video rules + credibility | §29–§30 |
| Integrity | `AI_USE.md` disclosure; you write/co-write the three ★ files and explain them; Claims Ledger gates every sentence | CAC allows AI only with full disclosure and your own significant contribution | §1.8, §31, §32 |
| Schedule | Day 1 iPhone gate → UI-first build → feature freeze Wed Oct 21 → copy freeze + fresh Release build Thu Oct 22 → record Fri Oct 23 → edit Sat Oct 24 → **submit Sun Oct 25** | 7-day profile + deadline buffer | §6 |

---

## Table of contents

**`01-scope-rules-plan.md` — Part 1: Scope, rules & plan**
§1 Agent rules (Step 0, versions, honesty rules, stop-and-ask, ★ student files, secrets) · §2 Story & product · §3 Safety principle, states & copy bank (EN/ES) · §4 Demo feature list with priority + fit (feature → screen) · §5 Repo layout · §6 Day-by-day plan Oct 15 → Oct 25 · §7 Definition of Done

**`02-ios-build-path.md` — Part 2: iOS build path**
§8 Mac/Xcode/iPhone setup with a free Personal Team · §9 Expo SDK 57 project, prebuild, signing, entitlements cleanup · §10 Capability matrix (free team) · §11 Release build for recording, 7-day re-sign, troubleshooting

**`03-ui-design-system.md` — Part 3: UI design system**
§12 iOS-first design principles & Liquid Glass · §13 Tokens (color, type, spacing, radii, glass, map palette) · §14 Iconography (SF Symbols) & status glyphs · §15 Motion, haptics & sound

**`04-ui-screens.md` — Part 4: UI screens**
§16 Template & component import plan · §17 Component library · §18 Screen-by-screen specs with wireframes · §19 iPhone fit matrix (SE → Pro Max, Dynamic Type) · §20 Signature moments

**`05-demo-engine.md` — Part 5: Demo engine**
§21 Demo dataset · §22 Scenario engine & timeline format · §23 On-device forecast rule (TypeScript) · §24 Director panel & clean-recording mode · §25 Local notifications, Drive Mode voice, simulated drive · §26 Simulated storm player · §27 Accessibility & Spanish implementation · §28 Testing (unit + Maestro iOS) & performance

**`06-video-and-submission.md` — Part 6: Video & submission**
§29 Video plan & shot list mapped to scenario keyframes · §30 Recording on iPhone · §31 Honesty labels & Claims Ledger · §32 CAC answers & README adjustments · §33 Final checklist

**Roadmap (not built now):** `docs/master-prompt/00-START-HERE.md` → the full live-data production design (backend, live USGS, push, real-storm backtests, Android).
