# FordCast: Competition Strategy, Accessibility, Safety Messaging, Spanish, Privacy, Demo, and Repo (research/cac.md)

**Role:** competition strategist, plus lead for accessibility, safety, and i18n.
**Date:** 2026-10-14.
**Consumers:** the FordCast master prompt (Expo SDK 57 / React Native 0.86 app, Python backend, Storm Replay).
**Inputs:** concept doc v4 (`/home/user/Fordcast-CAC/FordCast_CAC_Submission.md`) and the sibling research files in this folder (`design.md`, `maps.md`, `stack.md`, `hydro.md`). Where I reuse a sibling's verified fact, the tag says so.

---

## 0. Verification status (read first)

**Tags**

| Tag | Meaning |
|---|---|
| `[Verified: <URL>]` | I fetched that page today. |
| `[Verified: npm view]` | I checked the npm registry today. |
| `[Verified: pkg <name@ver>]` | I read the published package's types or source today. |
| `[Verified: Expo docs repo]` | Local clone of `expo/expo` (commit `d3bbf62`, 2026-10-14). Path given. |
| `[Verified: computed]` | python3. Script paths are in §3.7. |
| `[Verified (sibling): file, source]` | A sibling agent verified it today. I did not re-fetch it. |
| `[Unverified]` | From memory, or the source was unreachable. **The master prompt must treat these as "verify before quoting or shipping" and use the stated fallback.** |

**Environment limits.** The shared WebSearch budget for this run was used up before this task started. WebFetch could not resolve most `.gov` and several other domains (DNS/403): congressionalappchallenge.us, house.gov, weather.gov, api.weather.gov, nhtsa.gov, federalregister.gov, census.gov, ftc.gov, austintexas.gov, support.apple.com, support.google.com, developers.google.com, docs.expo.dev, reactnative.dev, w3.org, i18next.com.

These sources were reachable: developer.apple.com (including the JSON doc endpoints and App Store Connect help), developer.android.com, raw.githubusercontent.com, github.com, the npm registry, and PyPI.

**What follows from that:**
- Platform behavior (Apple/Android), React Native/Expo APIs, WCAG 2.2 success-criterion text, i18n behavior, and all color math are **verified**.
- The following are **[Unverified]** unless a sibling verified them: CAC rule specifics, NWS wording, NHTSA specifics, Census numbers, COPPA text, and agency contact details.
- §12 lists every unverified item with the exact page to check. That is about 30–45 minutes of manual checking for the student, and **it must happen before Oct 25**.

---

## 1. Decisions at a glance

| # | Topic | Recommendation | Why (1 line) | Runner-up |
|---|---|---|---|---|
| 1 | **Integrity of an AI-built app** | Disclose AI use in `AI_USE.md` and in the submission. The student **personally writes or co-writes and can explain** the 4 "Q4" files: travel-time cross-correlation, the baseline rule, backtest metrics, and the `DataSource` interface. The agent produces explain-back docs. | CAC judges score the *student's* coding, and finalists get Q&A. CAC's AI rule must be checked `[Unverified]`. | The agent writes everything and the student studies it (higher integrity risk). |
| 2 | Accessibility target | WCAG 2.2 AA mapped to native, **plus** Apple's published Accessibility Nutrition Label criteria for 7 features: VoiceOver, Voice Control, Larger Text, Dark Interface, Differentiate Without Color Alone, Sufficient Contrast, Reduced Motion. | Apple publishes concrete pass/fail criteria `[Verified: developer.apple.com/help/app-store-connect/manage-app-accessibility/…]`, which makes our claims checkable. | WCAG only |
| 3 | Avoid red (text/icons) | Use **`#FF5470`** (same as design.md). Status-colored text must be **≥ 18 pt, semibold or heavier** and always sits next to a filled chip or shape. Increase-Contrast variant: **`#FF8095`**. | Deutan ΔE00 vs amber goes from 10.7 to 15.7. Under protanopia, red text drops to about 4.2:1, so it must be large/bold (3:1 rule) `[Verified: computed]`. | `#FF578F` (the only color that passes all 4 tests, but it reads magenta) |
| 4 | Reduce Motion source of truth | `AccessibilityInfo` `reduceMotionChanged` listener drives `<ReducedMotionConfig mode=…>`. | Reanimated's `useReducedMotion()` returns the **app-start value and never re-renders** `[Verified: pkg react-native-reanimated@4.5.1 src/hook/useReducedMotion.ts]`. | `ReduceMotion.System` (stale until app restart) |
| 5 | i18n stack | `i18next@26.4.4` + `react-i18next@17.0.16` + `expo-localization@~57.0.2` + **`intl-pluralrules@2.0.1`** (`import 'intl-pluralrules'` first) | i18next docs: Hermes "still does not implement `Intl.PluralRules`", and since v24 there is no fallback `[Verified: raw.githubusercontent.com/i18next/i18next-gitbook/master/translation-function/plurals.md]`. Versions `[Verified: npm view]`. | `@formatjs/intl-pluralrules@6.3.15` |
| 6 | Spanish variety | Latin-American Spanish, **usted** register. Format numbers and times with **`es-US`**. | `es-US` gives `1,234.5` and `2:05 p.m.`; `es-ES` gives `1234,5` `[Verified: computed, Node 22 Intl]`. NWS's own slogan uses usted ("Dé la vuelta…") `[Verified (sibling): design.md, weather.gov flyer]`. | `es-MX` (formats the same) |
| 7 | Name of the calm state | **Rename** EN "No current signal" to **"No rise detected"**, ES **"Sin crecida detectada"**. | In Spanish, "Sin señal" is what phones show for *no service*. In English, "No current signal" also reads like a connectivity problem and blurs into "Unknown – data offline". | Keep EN; ES "Sin indicios de crecida" |
| 8 | Spanish word for FordCast "Watch" | **"Precaución"** | NWS Spanish uses "Vigilancia" for its *official* Watch products `[Unverified]`. A look-alike FordCast state could be mistaken for an NWS product. | "Vigilancia" (design.md) |
| 9 | NWS products in Spanish UI | Show the **official English product name plus a Spanish explanation**, e.g. `NWS: Flash Flood Warning — inundación repentina en curso o inminente`. | The official Spanish rendering of "Warning" is in flux ("Aviso" vs "Advertencia"; see hydro.md) `[Unverified]`. Showing the English name is unambiguous. | Spanish product name only, after confirming with NWS EWX |
| 10 | Spoken text | Separate `*_spoken` i18n keys for VoiceOver/TalkBack and TTS. Never feed "15–30 min" to a speech engine. | Dashes and abbreviations are read inconsistently `[Unverified: test on device]`. Spoken keys are cheap insurance. | Runtime regex expansion |
| 11 | Notification urgency | iOS: Avoid/Closed = `timeSensitive`, Watch = `active`, de-escalation = `passive`. Android: separate channels. | Apple: Time Sensitive is for events "happening now or will happen within an hour" and it breaks through Focus `[Verified: developer.apple.com HIG managing-notifications]`. | Critical Alerts (needs an entitlement; Roadmap) |
| 12 | Driver lockout | Lock text entry and list browsing when speed is **≥ 4.5 m/s (~10 mph) for ≥ 5 s**. "I'm a passenger" requires confirmation each trip. | NHTSA lists manual text entry as a per-se lockout while driving `[Unverified: recall of 2013 guidelines]`. `expo-location` exposes `coords.speed` in m/s `[Verified: pkg expo-location types]`. | Lock always while Drive Mode is on |
| 13 | Privacy architecture | No accounts. Location never leaves the device, except route endpoints sent through a non-logging proxy. Push subscriptions are keyed by **crossing ID**, not location. | Apple: on-device processing is "not collected", and "collect" means retained beyond real-time servicing `[Verified: developer.apple.com/app-store/app-privacy-details/]`. | Server-side geofencing (collects precise location) |
| 14 | Store publishing | **Do not publish publicly before judging.** Android: APK via GitHub Releases / EAS internal. iOS: TestFlight under a parent's paid account. | Avoids store review, age-law and COPPA exposure. CAC does not require store publishing `[Unverified]`. | Play internal testing track |
| 15 | Demo video | **16:9, 1080p (4K master), 2:15–2:30.** ≥ 60% real app footage. Hand-corrected EN captions (SRT) plus an ES subtitle track. Visible touch indicators. | Judges watch on laptops `[Unverified]`. Captions practice the accessibility the app claims. | 9:16 vertical |
| 16 | Screen capture | Android: `scrcpy --show-touches --no-audio --record=take.mp4` `[Verified: github.com/Genymobile/scrcpy docs]`. iOS: an in-app `DemoTouchOverlay` (behind a demo flag), recorded with QuickTime. | iOS has no built-in touch indicator for recordings `[Unverified]`. | Android-only footage |
| 17 | Impact evidence | 3 emails (City WPD/ATXfloods, Travis County TNR/HSEM, NWS EWX warning coordination meteorologist) **plus** a comprehension test with 8 people, including ≥ 2 Spanish speakers and ideally 1 screen-reader user. | Quotes used with permission, plus measured comprehension ("Is this crossing safe?"), beat adjectives. | Online survey only |
| 18 | README | Judge-first README: GIF, Built / Prototype / Roadmap table, results table reproducible with `make backtest`, safety, a11y, privacy, and AI-use sections. Tag the submission commit `cac-2026-submission`. | Judges see the code link `[Unverified]`, and every claim maps to a file. | GitHub wiki |

---

## 2. Congressional App Challenge 2026: compliance and strategy

### 2.1 Rules: what is known, what must be checked

| Item | Current belief | Tag | Action / fallback |
|---|---|---|---|
| Deadline | **Mon Oct 26, 2026, 12:00 PM ET** for offices on the national date; some offices differ | Verified in concept doc v4 §9 S11 (larsen.house.gov example), not re-fetched today | Submit **Sun Oct 25**. Confirm the date and time zone on the TX-10 office's CAC page. |
| Who is eligible | Middle and high school students who live in, or are eligible to attend school in, a participating district (homeschool usually counts) | `[Unverified]` | Read congressionalappchallenge.us → Students → Rules |
| District/office | Travis County is split across TX-10/17/21/35/37 (concept doc S10). TX-10's incumbent (Rep. Michael McCaul) is **not running in 2026** `[Unverified]`. The office still serves until Jan 3, 2027. A 2025 Texas mid-decade redistricting applies to the *2026 election*, not to the current office `[Unverified]`. | `[Unverified]` | Confirm with the home address at house.gov "Find Your Representative". **Confirm the office is participating in 2026** (CAC's district list or an email to the office). |
| Team size | Individual, or teams of up to 4. There are rules about which district a mixed team enters. | `[Unverified]` | Solo entry (no issue) |
| Submissions per student | One app per student per year | `[Unverified]` | — |
| Platform and language | Any (mobile, web, desktop, game) | `[Unverified]` | — |
| Originality / work window | Work done during this competition cycle (the task brief says after Oct 30, 2025). No previously submitted CAC app. | `[Unverified]` | First commit date is after the window opens. README states "all code written Oct 2026". Declare any reused templates or starters (Expo template, HeroUI). |
| What is submitted | Registration on congressionalappchallenge.us; app title and description; **demo video link (YouTube or Vimeo)**; **code** (a repo link such as GitHub, or an upload); written answers (concept doc Q1–Q4) | `[Unverified]` | Prepare all fields in `submission/` (see §2.5) |
| Video length | Commonly "1–3 minutes" guidance | `[Unverified]` | Aim for **2:15–2:30**. **Never exceed 3:00.** |
| Video visibility | Public or **unlisted**; no login needed | `[Unverified]` | Unlisted on YouTube. Test the link in a logged-out private window. |
| AI tools | Believed to be **allowed with disclosure**, with the student able to explain the work | `[Unverified]` | Follow §2.3 regardless. Copy the official AI wording into `AI_USE.md`. |
| Parent/guardian | Minors may need guardian info at registration | `[Unverified]` | Have a parent's email ready |
| Judging | Each office recruits its own judges (local tech professionals, educators). Commonly cited criteria: **(1) quality of the idea (creativity, originality, impact), (2) implementation (UX, design), (3) demonstrated coding excellence** | `[Unverified]` | Map evidence to each criterion (§2.2) |
| Recognition | District winner announced by the Member (often Dec–Jan). The app is featured by the House or CAC. Winners are invited to **#HouseOfCode** in DC in spring. | `[Unverified]` | Keep the app runnable through **spring 2027** (§2.6) |

### 2.2 Judging criteria → FordCast evidence (build to this)

| Criterion | What strong entries show | FordCast proof (where it lives) | Master-prompt requirement |
|---|---|---|---|
| **Idea quality / impact** | A clear local problem, a novel angle, a measurable result | Stats with sources (README, video 0:00–0:25). "Per-crossing lead time" vs. tools that only report after water is on the road. **Backtest median lead time, POD, FAR** (Replay results screen, README). Stakeholder quote (§9). | Results screen and README table are generated from `backtest/results.json`. No hand-typed numbers. |
| **Implementation / UX** | Polished, working, accessible, fits the user | Night-first UI. Calm-day state looks alive. Drive Mode. **Spanish**. VoiceOver demo. CVD-safe states. Offline Replay. Zero crashes. | Accessibility DoD (§3.10). Calm-day QA. Replay works without network. |
| **Coding excellence** | Real complexity, clean structure, tests, the student can explain it | NLDI graph traversal, cross-correlation, the no-lookahead `DataSource` with a **test that fails on lookahead**, event-based split, POD/FAR/CSI, CI badge, typed API | Unit tests for the 4 core files. CI runs lint + tests + backtest smoke. `docs/learning/` explain-backs. |
| (Implicit) Presentation and honesty | A video that hooks in 10 s; claims match the code | Claims Ledger (concept doc §7). Built / Prototype / Roadmap labels everywhere. | README and app "About" use the same tier labels. |

### 2.3 AI-use integrity protocol (MUST appear in the master prompt)

The master prompt asks an AI coding agent to build most of the app. That creates two risks: a CAC/AI-rule risk and a finalist Q&A risk. Mitigations:

1. **Disclose.**
   - Create `AI_USE.md` listing: the tools (e.g., "Claude Code, Oct 2026"), what was AI-generated (scaffold, UI components, boilerplate), what the student wrote or substantially modified, and how outputs were checked.
   - Add a one-paragraph disclosure in the CAC submission description if the form allows it.
   - **Paste the official CAC AI-rule text at the top of `AI_USE.md`** once it is read from the rules page `[Unverified until read]`.
2. **The student owns the core.** These files are written by the student, with the agent acting as tutor and reviewer: the agent explains, gives hints and tests, and reviews diffs. If time forces the agent to write them, the student must rewrite or annotate each function in their own words.
   - `pipeline/travel_time.py`: cross-correlation lag
   - `pipeline/baseline_rule.py`: trigger stage + rate of rise → risk window
   - `backtest/metrics.py`: POD/FAR/CSI and lead time
   - `pipeline/datasource.py`: the `DataSource` protocol, `LiveUSGS`, `StormReplay`, and the no-lookahead guard
3. **Explain-back docs.** For every module, the agent writes `docs/learning/<module>.md` at a 9th-grade reading level: what it does, why, one diagram, and 3 questions the student answers in their own words underneath. These double as finalist-interview prep.
4. **Honest commits.**
   - Agent-authored commits carry a `Co-authored-by:` trailer.
   - Commit small and often, **across days**: history spread over time shows real work.
   - Never squash the history before judging.
5. **No fabricated numbers.**
   - Every number in the video, README, or answers comes from a script output committed in the repo (`backtest/results.json` + `make backtest`).
   - The agent must leave `[X]` placeholders rather than invent values.
6. **Answers in the student's voice.** The agent may suggest structure for Q2–Q4. The final text is written by the student (the concept doc already requires this).

### 2.4 What strongest CAC entries tend to have `[Unverified: general pattern; confirm by browsing the official past-winners gallery on congressionalappchallenge.us]`

- **Local, personal problem** told in the first 10 seconds. A real moment from the student's life beats national statistics.
- **A working app on a real device.** Mockups and slides lose to footage.
- **A specific number** showing the app works (e.g., "flagged it 38 min earlier").
- **Real users or partners:** a teacher, a city office, test results, a quote.
- **Social impact plus inclusion:** accessibility and multilingual support show up repeatedly in civic-tech winners.
- **A clean, short video** with captions, good audio, and no dead air.
- **A coherent technical story** the student can explain, not buzzwords.
- **FordCast-specific edge:** most entries are "information apps". FordCast *forecasts* and then *proves it with Storm Replay*. Lead every artifact (video, README top, Q1) with the replay proof.

### 2.5 CAC compliance checklist (copy into `submission/CHECKLIST.md`)

- [ ] District and office participation confirmed (house.gov lookup, plus the office's CAC page or CAC district list). Screenshot saved.
- [ ] Rules page read today. Deadline, time zone, video-length guidance, team rules, AI rule, and code-submission format recorded in `submission/RULES_NOTES.md`.
- [ ] Registered on congressionalappchallenge.us (student, plus parent/guardian if required).
- [ ] App title "FordCast", tagline, and the 1-sentence purpose (Q1) match across the app, README, and video.
- [ ] Video: ≤ 3:00 (target 2:15–2:30), unlisted YouTube, captions uploaded (EN + ES), link tested logged-out on a phone and a laptop.
- [ ] Code: public GitHub repo. The submission commit is tagged `cac-2026-submission`. README top has the video link and the APK link.
- [ ] Written answers Q1–Q4 in the student's voice. Every `[X]`/`[N]`/`[POD]` replaced from `backtest/results.json`.
- [ ] `AI_USE.md` present and the disclosure made.
- [ ] Claims Ledger (concept doc §7): every row ticked, or the claim removed.
- [ ] Safety disclaimer visible in the app (onboarding pledge + footer) and in the README.
- [ ] Data attributions shown in the app's About screen, README, and the video end card (USGS, NOAA/NWS, City of Austin, OSM/OpenFreeMap, ORS). Licenses are in hydro.md §10.
- [ ] No secrets in the repo (`.env` git-ignored; scan history before going public).
- [ ] Calm-day QA: the app on a dry day looks complete. Unknown/stale handling is visible. No crashes.
- [ ] Backend uptime plan for judging is in place (§2.6).
- [ ] Submitted by **Oct 25**. Confirmation email saved as a PDF.

### 2.6 Judging-window operations (Oct 26 → ~April 2027)

1. **Storm Replay must run 100% offline from data bundled in the app** (compressed JSON/SQLite in the assets). This guarantees judges never see a broken demo even if the backend is down.
2. **Freeze what judges see.**
   - Tag `cac-2026-submission`. Link the *tag* (`/tree/cac-2026-submission`) in the submission if a commit-specific link is allowed `[Unverified]`. Otherwise link the repo, and keep `main` stable and clearly changelogged.
   - Put post-deadline work on a branch, or log it in a CHANGELOG under "after submission".
3. **Uptime.**
   - Use an external uptime check on `/health`. A public status line goes in the README.
   - Hydro.md warns that free-tier hosts sleep and stop the 5-min poller. Use the always-on option it recommends.
   - The USGS legacy service degrades from **Nov 2026**, during judging (concept doc). The build uses the new Water Data API only (hydro.md).
4. **Builds.**
   - The APK stays downloadable in GitHub Releases.
   - TestFlight builds expire after a fixed period (≈90 days) `[Unverified]`. Upload a fresh iOS build in late Nov and again in Jan if iOS judges or House of Code need it.
5. **Re-verify in January:** the USGS API version, NWS API User-Agent requirements, and Expo push credentials.

---

## 3. Accessibility (WCAG 2.2 AA on mobile + Apple/Android criteria)

### 3.1 Target and claims

**Claim FordCast can defensibly make to judges:**

> "Meets WCAG 2.2 AA where it applies to native apps, and meets Apple's published Accessibility Nutrition Label criteria for VoiceOver, Voice Control, Larger Text, Dark Interface, Differentiate Without Color Alone, Sufficient Contrast and Reduced Motion. Tested on device with VoiceOver and TalkBack."

Make the claim only after the §3.10 protocol passes.

**Apple's criteria, quoted for the master prompt** `[Verified: developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels and the per-feature pages]`:
- **General rule:** "users must be able to complete all of the common tasks of your app using that feature."
  - Common tasks include primary functionality, the first-launch experience, and Settings.
- **Larger Text:** "users can enlarge text to at least 200% or the maximum font size for the system."
  - Dynamic Type "reaches sizes larger than 200% at the AX3 size, and allows body text sizes over 300% at the AX5 size".
  - Avoid overlapping text. Wrap instead of truncating.
  - Tab bars may use the Large Content Viewer.
- **Sufficient Contrast:** "usually 4.5 to 1 for most text elements", "3:1 minimum contrast ratio is commonly recommended for non-text contrast".
  - Test with Bold Text, Increase Contrast and Reduce Transparency enabled.
  - Test dark mode "alongside the Increase Contrast setting".
- **Differentiate Without Color Alone:** test using the **Grayscale** color filter. "If you can't use your own app in grayscale, rethink your app's design".
  - Apple's own accessible example is "a red octagon containing an 'X'", which matches FordCast's Avoid octagon.
- **Reduced Motion:** for animations that carry meaning (status change), "don't remove the animation entirely… consider… a dissolve, highlight fade, or color shift".
  - Stop or allow stopping "ongoing motion".
- **VoiceOver:**
  - Concise labels; no control type or state words inside labels (use traits/roles).
  - Logical order. Reading position must not reset on background refresh.
  - Modals trap focus.
  - Custom actions for long-press or complex gestures.
  - Timely, non-disruptive announcements.
  - Charts get "a reasonably complete text alternative".
- **Testing:** VoiceOver, Voice Control and Switch Control are **not available in Simulator**; test on a physical device. Use the **screen curtain** `[Verified: developer.apple.com/documentation/accessibility/performing-accessibility-testing-for-your-app]`.

### 3.2 WCAG 2.2 AA mapped to FordCast

New-in-2.2 criteria are marked ★. SC text and level are `[Verified: raw.githubusercontent.com/w3c/wcag/main/guidelines/sc/22/…]` for 2.4.11, 2.5.7 and 2.5.8. The other ★ items (3.2.6, 3.3.7, 3.3.8) and all non-★ SCs are `[Unverified: well-known WCAG 2.1/2.2 SCs; confirm at w3.org/TR/WCAG22]`.

| SC | Level | FordCast requirement |
|---|---|---|
| 1.1.1 Non-text Content | A | Every marker, glyph, ring, sparkline and hydrograph has a text alternative. Decorative icons are hidden from screen readers. |
| 1.3.1 Info & Relationships | A | Use `accessibilityRole="header"` on section titles, `button` / `switch` / `adjustable` roles, and grouped rows. |
| 1.3.4 Orientation | AA | **Do not lock portrait.** Car mounts are often landscape. Map and Drive Mode must work in landscape. Set `orientation: "default"` in app.json. |
| 1.3.5 Identify Input Purpose | AA | Address fields: `textContentType="fullStreetAddress"` (iOS) and `autoComplete="street-address"`. |
| 1.4.1 Use of Color | A | State = **shape + glyph + word + color**. Closed adds stripes; Unknown adds a dashed outline (§3.7). |
| 1.4.3 Contrast (Min) | AA | Text ≥ 4.5:1, large text ≥ 3:1. The token table in design.md passes. Red status text is **≥ 18 pt semibold+** (§3.7). |
| 1.4.4 Resize Text | AA | Works at 200% (Android 14 max) and at iOS AX5 (body 17 → 53 pt) `[Verified: Apple HIG typography JSON]`. |
| 1.4.10 Reflow | AA | No two-dimensional scrolling at large text. Rows stack vertically (§3.5). |
| 1.4.11 Non-text Contrast | AA | Markers, chip borders, input outlines and focus ring ≥ 3:1 against neighbors. Red markers get a **white or `#FF5470` rim**, because `#C62828` vs a `#152033` surface is only 2.90:1 `[Verified: computed]`. |
| 2.1.1 Keyboard | A | Everything is operable with Switch Control / Switch Access and an external keyboard (RN Pressables are focusable). |
| 2.2.1 Timing Adjustable | A | Toasts carrying safety info never auto-dismiss in under 10 s. On Android use `AccessibilityInfo.getRecommendedTimeoutMillis()`. Avoid/Closed banners **never** auto-dismiss. |
| 2.2.2 Pause, Stop, Hide | A | Looping animations (Avoid halo, water-flow pulse) **stop after 3 cycles or 6 s**. They resume only on a new state change, and an in-app "Animations" toggle is provided. |
| 2.3.1 Three Flashes | A | Nothing flashes more than 3×/s, in the app **or in the demo video** (no strobe lightning b-roll). |
| 2.4.3 Focus Order | A | Screen-reader order on the Crossing Card: header (state + name) → window → why → actions → footer. |
| 2.4.6 Headings & Labels | AA | Labels are descriptive ("Show detour", not "Go"). |
| 2.4.7 Focus Visible | AA | 2 pt `#6CB4FF` focus ring for keyboard and switch users. |
| ★ 2.4.11 Focus Not Obscured (Min) | AA | The bottom sheet must not fully cover the focused element. Scroll the focused item into view above the sheet. |
| 2.5.1 Pointer Gestures | A | Pinch/drag map has alternatives: zoom ± buttons, a "List" view of crossings, and "Center on me". |
| 2.5.2 Pointer Cancellation | A | Activate on release (RN `onPress` default). "Hold to confirm passenger" can be cancelled by sliding off. |
| 2.5.3 Label in Name | A | `accessibilityLabel` **starts with the visible text**, which matters for Voice Control ("Tap Show detour"). |
| 2.5.4 Motion Actuation | A | No shake-to-report. |
| ★ 2.5.7 Dragging Movements | AA | Replay scrubber: ±5 min step buttons plus Play/Pause. Bottom sheet: grabber button toggles detents. |
| ★ 2.5.8 Target Size (Min) | AA | WCAG minimum is 24×24 px. FordCast uses **≥ 48** everywhere and **≥ 76** in Drive Mode (§3.9). |
| 3.1.1 / 3.1.2 Language | A / AA | Set `accessibilityLanguage` (iOS-only prop) on Spanish text when the app language differs from the system language (§4.5). |
| ★ 3.2.6 Consistent Help | A | "How FordCast works" / Help sits in the same place on every screen (the Settings gear → Help). |
| 3.3.1–3.3.3 Errors | A/AA | Address search: plain-language errors with suggestions. |
| ★ 3.3.7 Redundant Entry | A | Saved places and routes are remembered; never ask twice. |
| ★ 3.3.8 Accessible Authentication (Min) | AA | No login in MVP, so this passes trivially. |
| 4.1.2 Name, Role, Value | A | Every custom control sets role, state and value (code below). |
| 4.1.3 Status Messages | AA | State changes are announced without moving focus (§3.4). |

`[Unverified]`: W3C has a draft group note, "Guidance on Applying WCAG 2.2 to Mobile Applications (WCAG2Mobile)". Optionally cite it in the README once its status is checked on w3.org.

### 3.3 React Native implementation checklist (RN 0.86, Expo SDK 57)

**Verified API surface** `[Verified: pkg react-native@0.86.3 ViewAccessibility.d.ts, AccessibilityInfo.d.ts; raw.githubusercontent.com/facebook/react-native-website/main/docs/accessibility.md]`:

- **Roles.** `accessibilityRole` values: `adjustable, alert, button, checkbox, combobox, header, image, imagebutton, keyboardkey, link, menu, menubar, menuitem, none, progressbar, radio, radiogroup, scrollbar, search, spinbutton, summary, switch, tab, tablist, text, timer, togglebutton, toolbar, grid`.
  - The ARIA-style `role` prop also exists. **Pick one style. Recommendation: the `accessibility*` props**, because they match the examples below.
- **State and value.**
  - `accessibilityState`: `{disabled, selected, checked: boolean|'mixed', busy, expanded}`.
  - `accessibilityValue`: `{min, max, now, text}`.
- **Android-only:** `accessibilityLiveRegion` (`none|polite|assertive`), `importantForAccessibility` (`auto|yes|no|no-hide-descendants`), `accessibilityLabelledBy`, `screenReaderFocusable`.
- **iOS-only:**
  - `accessibilityLanguage` (BCP 47), `accessibilityElementsHidden`, `accessibilityViewIsModal`, `accessibilityIgnoresInvertColors`.
  - `accessibilityShowsLargeContentViewer` and `accessibilityLargeContentTitle`.
  - Gesture callbacks `onAccessibilityEscape`, `onAccessibilityTap`, `onMagicTap`.
- **Actions.** `accessibilityActions` + `onAccessibilityAction`. Standard names: `activate, increment, decrement, magicTap, escape, longpress, expand, collapse`.
- **`AccessibilityInfo` methods:**
  - `announceForAccessibility`
  - `announceForAccessibilityWithOptions(msg, {queue?, priority?: 'low'|'default'|'high'})` (iOS-only options)
  - `isScreenReaderEnabled`, `isReduceMotionEnabled`, `isBoldTextEnabled` (iOS), `isGrayscaleEnabled` (iOS), `isInvertColorsEnabled` (iOS), `isReduceTransparencyEnabled` (iOS), `isDarkerSystemColorsEnabled` (iOS "Increase Contrast"), `isHighTextContrastEnabled` (Android), `prefersCrossFadeTransitions` (iOS), `isAccessibilityServiceEnabled` (Android), `getRecommendedTimeoutMillis` (Android).
- **`AccessibilityInfo` events:** `screenReaderChanged, reduceMotionChanged, boldTextChanged, grayscaleChanged, invertColorsChanged, reduceTransparencyChanged, darkerSystemColorsChanged (iOS), highTextContrastChanged (Android), accessibilityServiceChanged (Android), announcementFinished (iOS)`.
- **Text props:** `allowFontScaling` (default true), `maxFontSizeMultiplier` (`0` = no max; `>=1` caps), `dynamicTypeRamp` (iOS: `caption2…largeTitle`), `adjustsFontSizeToFit`, `minimumFontScale`.

**A. Status chip.** Static text, never a button.
```tsx
// components/StatusChip.tsx
export function StatusChip({ state }: { state: RiskState }) {
  const { t } = useTranslation();
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={t(`state.${state}.spoken`)}          // "Avoid" / "Evite"
      style={[s.chip, chipStyle[state]]}                       // fill polarity + stripes/dashes per state
    >
      <StateGlyph state={state} accessibilityElementsHidden importantForAccessibility="no" />
      <AppText variant="chip" maxFontSizeMultiplier={2}>{t(`state.${state}.label`)}</AppText>
    </View>
  );
}
```

**B. Crossing row.** This is the **accessible alternative to the map**: VoiceOver can't read GL map canvases (maps.md §5.8).
```tsx
<Pressable
  onPress={() => openCard(c.id)}
  accessibilityRole="button"
  // Label starts with the visible text (WCAG 2.5.3): en "row.spoken": "{{name}}. {{state}}, {{window}}. {{age}}."
  // Spoken strings come from *_spoken keys (no dashes/abbreviations).
  accessibilityLabel={t('row.spoken', {
    name: c.nameSpoken,                       // "Bull Creek at Loop 360"
    state: t(`state.${c.state}.spoken`),      // "Avoid"
    window: spokenWindow(c, t),               // "likely flooded in 15 to 30 minutes"
    age: spokenAge(c.updatedAt, t),           // "updated 2 minutes ago"
  })}
  accessibilityHint={t('row.hint')}           // "Opens crossing details."
  accessibilityActions={[
    { name: 'activate' },
    { name: 'detour', label: t('actions.showDetour') },
    { name: 'save', label: c.saved ? t('actions.unsave') : t('actions.save') },
  ]}
  onAccessibilityAction={({ nativeEvent }) => {
    if (nativeEvent.actionName === 'activate') openCard(c.id);
    if (nativeEvent.actionName === 'detour') showDetour(c.id);
    if (nativeEvent.actionName === 'save') toggleSave(c.id);
  }}
  style={{ minHeight: 56 }}
>
  {/* visible: name · chip · window · freshness */}
</Pressable>
```

**C. Crossing Card (bottom sheet).**
- Header: `accessibilityRole="header"`. The label is the state, name and window combined.
- Risk ring: `accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"`. It duplicates the header.
- At the full detent: `accessibilityViewIsModal` (iOS). Content behind the sheet is hidden on Android with `importantForAccessibility="no-hide-descendants"`.
- Grabber is a real button: `accessibilityRole="button"`, `accessibilityLabel={t('sheet.expand')}`, `accessibilityState={{ expanded }}`.
- `onAccessibilityEscape={closeSheet}` (iOS two-finger Z).
- **Focus on open.** Move screen-reader focus to the header with `AccessibilityInfo.sendAccessibilityEvent(ref, 'focus')` after the sheet's open animation ends.

**D. Hydrograph and sparkline (charts).**
- `accessible`, `accessibilityRole="image"`.
- Label: "Upstream gauge, Bull Creek at FM 2222. 7.4 feet, rising 3.1 feet in the last 30 minutes. Trigger level 6 feet."
- A visible **"Show readings"** button opens a plain list of the last 12 readings. That list is the chart's text alternative (Apple VoiceOver criteria).

**E. Storm Replay scrubber.** Adjustable, with a drag alternative.
```tsx
<View
  accessible
  accessibilityRole="adjustable"
  accessibilityLabel={t('replay.scrubber')}                          // "Replay time"
  accessibilityValue={{ text: spokenReplayTime(tMs, t) }}            // "May 25, 11:40 PM. 38 minutes before water reached the road."
  accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
  onAccessibilityAction={({ nativeEvent }) => step(nativeEvent.actionName === 'increment' ? +5 : -5)}
/>
{/* Visible ±5 min buttons + Play/Pause (WCAG 2.5.7).
    iOS magic tap (two-finger double-tap) toggles play/pause: put onMagicTap on the Replay SCREEN's root <View>,
    because magic tap is delivered up the hierarchy from the focused element. */}
```

**F. Drive Mode.**
- Full-screen, one decision per screen.
- `onMagicTap` (iOS two-finger double-tap) = "repeat last alert".
- Android has no magic tap. Provide a giant "Repeat" button of at least 76 pt.

**G. Toggles in Settings.**
- `accessibilityRole="switch"` + `accessibilityState={{ checked }}`. The label equals the visible text ("Spoken alerts").
- Alternatively use `@expo/ui` native SwiftUI/Compose toggles, which are natively accessible (design.md decision 7).

**H. Images and icons.**
- Decorative: `accessibilityElementsHidden` + `importantForAccessibility="no"`.
- Meaningful icons inside buttons: the label goes on the button, not the icon.

**I. Map markers.** Only if the map library exposes them. Each marker is labeled like a row, and a `List` toggle is always available. **Never make the map the only path** to any crossing's status.

**J. Grouping.**
- Wrap each visual unit (chip + name + window) in one `accessible` View so it is read as one stop.
- Avoid nesting `accessible` Views. On iOS, the inner ones become unreachable.

**K. Navigation.** Expo Router `NativeTabs` gives native tab-bar accessibility. Tab titles needn't scale. Use the Large Content Viewer: `accessibilityShowsLargeContentViewer` + `accessibilityLargeContentTitle` on custom tab or HUD items `[Verified: prop exists in RN 0.86.3]`.

### 3.4 Announcement policy (status messages, WCAG 4.1.3)

```ts
// a11y/announce.ts
import { AccessibilityInfo, Platform } from 'react-native';
export function announce(msg: string, level: 'low' | 'default' | 'high' = 'default') {
  if (Platform.OS === 'ios') {
    AccessibilityInfo.announceForAccessibilityWithOptions(msg, { queue: level !== 'high', priority: level });
  } else {
    AccessibilityInfo.announceForAccessibility(msg); // Android: also set accessibilityLiveRegion on the status banner
  }
}
```

| Event | Announce? | Level | Android live region on banner |
|---|---|---|---|
| A crossing on the user's route or saved list → **Avoid / Closed** | Yes | `high` | `assertive` |
| → **Watch** | Yes | `default` | `polite` |
| De-escalation | Yes, once | `low` | `polite` |
| Data goes stale → Unknown | Yes, once per session per crossing | `default` | `polite` |
| Background map refresh with no state change | **No** (it must not reset the reading position) | — | `none` |
| Replay playback state changes | Only on Play/Pause and key events (Watch/Avoid issued, water-over-road) | `default` | `polite` |

Rate-limit announcements to **≤ 1 per 10 s**. Merge multiple changes into one message: "3 crossings on your route changed. 1 Avoid."

### 3.5 Text scaling (Dynamic Type and Android font scale)

- **Use one `AppText` wrapper** with variants. `Text.defaultProps` is not a supported pattern with React 19 function components `[Unverified]`, so do not rely on it.
- **Scaling caps:**

| Variant | `maxFontSizeMultiplier` | Notes |
|---|---|---|
| body, card text, status words, alerts | **none** (`0` / unset) | Must reach iOS AX5 (body ~53 pt) `[Verified: HIG]` and Android 200% `[Verified: developer.android.com 14 features]`. |
| chip label | 2.0 | Chips wrap to two lines rather than clip. |
| map marker labels, HUD numerals | 1.5 | Provide the same info in the sheet or list. Use the Large Content Viewer on iOS. |
| tab titles | system-managed | NativeTabs; Large Content Viewer |

- **Responsive layout from `useWindowDimensions().fontScale`:**
  - **≥ 1.35:** rows switch from side-by-side to stacked (text above chips and timestamps); hydrograph height +40%.
  - **≥ 2.0:** single column; the sheet opens straight to the full detent; decorative icons are hidden; the map legend becomes a list.
- **Never truncate status words or windows.** Allow `numberOfLines` to grow. Only crossing names in list rows may truncate to 2 lines, because the full name appears in the card (Apple Larger Text criteria allow this).
- **Android 14 nonlinear scaling:** don't hard-code math on `fontScale`; it is "informational only" `[Verified: developer.android.com/about/versions/14/features]`. Let RN scale `fontSize` and set `lineHeight` proportionally per variant.
- **iOS Bold Text:** read `isBoldTextEnabled` and bump one weight step (Regular → Semibold) in `AppText`.

### 3.6 Motion, transparency, contrast, bold, grayscale: one hook

```ts
// a11y/useA11yPrefs.ts — single source of truth; Reanimated's useReducedMotion() is startup-only.
import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, Platform, useWindowDimensions } from 'react-native';

export function useA11yPrefs() {
  const { fontScale } = useWindowDimensions();
  const [p, set] = useState({ screenReader: false, reduceMotion: false, boldText: false,
    reduceTransparency: false, highContrast: false, grayscale: false });

  useEffect(() => {
    const refresh = async () => set({
      screenReader: await AccessibilityInfo.isScreenReaderEnabled(),
      reduceMotion: await AccessibilityInfo.isReduceMotionEnabled(),
      boldText: Platform.OS === 'ios' ? await AccessibilityInfo.isBoldTextEnabled() : false,
      reduceTransparency: Platform.OS === 'ios' ? await AccessibilityInfo.isReduceTransparencyEnabled() : false,
      highContrast: Platform.OS === 'ios'
        ? await AccessibilityInfo.isDarkerSystemColorsEnabled()
        : await AccessibilityInfo.isHighTextContrastEnabled(),
      grayscale: Platform.OS === 'ios' ? await AccessibilityInfo.isGrayscaleEnabled() : false,
    });
    refresh();
    const ev = ['screenReaderChanged', 'reduceMotionChanged', 'boldTextChanged', 'reduceTransparencyChanged',
      'darkerSystemColorsChanged', 'highTextContrastChanged', 'grayscaleChanged'] as const;
    const subs = ev.map(e => AccessibilityInfo.addEventListener(e as any, refresh));
    subs.push(AppState.addEventListener('change', s => { if (s === 'active') refresh(); }) as any);
    return () => subs.forEach(s => s.remove());
  }, []);
  return { ...p, fontScale };
}
```

Mount this hook **once**, in an `A11yPrefsProvider` context at the root; components read the context, so there is one set of listeners.

Root usage: `<ReducedMotionConfig mode={prefs.reduceMotion || appSetting.animationsOff ? ReduceMotion.Always : ReduceMotion.Never} />`. `ReducedMotionConfig` and the `ReduceMotion` enum (`System/Always/Never`) are `[Verified: pkg react-native-reanimated@4.5.1]`.

**Behavior when each preference is on:**

| Preference | FordCast behavior |
|---|---|
| Reduce Motion | **Spec:** see design.md §5–6.<br>• No halo pulse, no water-travel animation. Use a static double ring and arrowheads with the label "≈ 38 min to crossing".<br>• The ring jumps instantly.<br>• Sheet transitions cross-fade (iOS `prefersCrossFadeTransitions`).<br>• The state change is still shown, as a color plus a 150 ms opacity fade. Apple says not to remove meaningful motion entirely. |
| Reduce Transparency | Glass/blur surfaces become opaque `surface.1`. |
| Increase Contrast / High Text Contrast | Swap to the **HC token set** in the table below. Borders go 1 → 2 pt. Hairlines rise to ≥ 3:1. |
| Bold Text | Every `AppText` gets +1 weight step. |
| Grayscale | Nothing special is needed if §3.7 rule 1 holds. Use it as a test mode. |
| Screen reader on | The list view becomes the default on Map Home, with a "Map" toggle. Autoplay is disabled in Replay. Drive Mode speaks every state change. |

**HC token set** (dark theme) `[Verified: computed]`:

| Role | Token | Contrast | Other checks |
|---|---|---|---|
| slate text | `#A9B4C6` | 8.58:1 on bg | |
| avoid text | `#FF8095` | 7.50:1 on bg | protan-sim 6.15:1; deutan ΔE00 vs amber 18.6 |
| avoid fill | `#B71C1C` | white text 6.57:1 | add a 2 pt white rim, because the fill is 2.73:1 vs bg |
| unknown ring | `#9AA6B8` | 7.29:1 | |
| amber | unchanged | | |

### 3.7 Color-vision-deficiency (CVD) simulation: results and rules

**Method `[Verified: computed]`:**
- Model: Machado, Oliveira & Fernandes (2009), as implemented in `colorspacious 1.1.2` (`sRGB1+CVD`, severity 100 = dichromacy, 60 = strong anomalous trichromacy).
- Distance: CIEDE2000 ΔE00, my own implementation, **validated against 4 Sharma-2005 reference pairs**.
- Contrast: WCAG 2.x relative-luminance ratios.
- Scripts:
  - `/tmp/claude-0/-home-user-Fordcast-CAC/608fe985-2ad7-54f1-8865-eca0e6597f76/scratchpad/scripts/cvd_cac.py`: the full table below.
  - `/tmp/claude-0/-home-user-Fordcast-CAC/608fe985-2ad7-54f1-8865-eca0e6597f76/scratchpad/scripts/red_search.py`: search for alternative reds.
  - `/tmp/claude-0/-home-user-Fordcast-CAC/608fe985-2ad7-54f1-8865-eca0e6597f76/scratchpad/scripts/hc.py`: high-contrast tokens.
- Run with `python3 -I <script> /tmp/claude-0/-home-user-Fordcast-CAC/608fe985-2ad7-54f1-8865-eca0e6597f76/scratchpad/dl/colorspacious/lib` from the scratchpad directory.
- **Cross-check:** design.md got 10.8 and 15.8 for the two key pairs; I got **10.7 and 15.7**. Independent agreement.

**Simulated appearance** (hex):

| Color | Normal | Protan 100 | Deutan 100 | Tritan 100 |
|---|---|---|---|---|
| slate `#8A97AB` (No rise) | `#8A97AB` | `#9098AC` | `#8D95AB` | `#829B9D` |
| amber `#F5A623` (Watch) | `#F5A623` | `#C2AB00` | `#D4BE29` | `#FF928F` |
| red `#FF5A4F` (v4 Avoid text) | `#FF5A4F` | `#877C4D` | `#B1A04A` | `#FF2F59` |
| red `#FF5470` (recommended) | `#FF5470` | `#7F7C70` | `#AB9F6C` | `#FF2F5F` |
| chip `#C62828` (Avoid/Closed fill) | `#C62828` | `#5B5226` | `#817420` | `#DA002B` |
| unknown `#7A879C` | `#7A879C` | `#80889D` | `#7D859C` | `#718B8E` |
| cyan `#2BD9D9` (water) | `#2BD9D9` | `#CACED9` | `#B2BDDA` | `#00E0D9` |

**Pairwise distinguishability:** ΔE00 | luminance ratio.
- Rule of thumb: ΔE00 ≥ ~20 = distinct at a glance; 10–20 = distinguishable side by side; < 10 = risky `[Unverified: common heuristic, not a standard]`.

| Pair | Normal | Protan 100 | Deutan 100 | Tritan 100 | Protan 60 | Deutan 60 |
|---|---|---|---|---|---|---|
| slate vs amber | 38.7 \| 1.46 | 39.5 \| 1.25 | 41.5 \| 1.60 | 34.2 \| 1.37 | 39.3 | 40.4 |
| slate vs red `#FF5A4F` | 35.7 \| **1.04** | 29.8 \| 1.44 | 35.2 \| 1.14 | 36.8 \| 1.23 | 29.9 | 32.7 |
| **amber vs red `#FF5A4F`** | 32.5 \| 1.52 | 20.7 \| 1.80 | **10.7** \| 1.40 ⚠ | 16.5 \| 1.68 | 23.4 | **15.1** |
| **amber vs red `#FF5470`** | 41.1 \| 1.53 | 28.3 \| 1.82 | **15.7** \| 1.41 | 16.6 \| 1.67 | 34.2 | 22.3 |
| slate vs red `#FF5470` | 34.4 \| 1.05 | 18.8 \| 1.45 | 29.6 \| 1.13 | 35.7 \| 1.23 | 24.6 | 26.8 |
| **amber fill vs red fill `#C62828`** | 40.6 \| 2.77 | 37.4 \| 3.41 | **24.9 \| 2.52** ✓ | 25.5 \| 2.42 | 37.1 | 27.9 |
| slate vs chip `#C62828` | 39.7 \| 1.90 | 39.5 \| 2.73 | 36.8 \| 1.57 | 43.1 \| 1.77 | 37.8 | 35.6 |
| slate vs unknown `#7A879C` | **5.5** \| 1.23 | 5.4 | 5.5 | 5.4 | 5.4 | 5.5 |
| slate vs cyan | 26.3 \| 1.70 | 15.5 | 11.9 | 22.6 | 18.0 | 15.6 |
| amber vs cyan | 46.1 \| 1.16 | 35.6 | 42.4 \| **1.00** | 57.8 | 37.4 | 42.0 |
| cyan vs route `#5AA9FF` | 28.2 \| 1.41 | 19.8 | 16.1 | **10.7** | 18.1 | 13.6 |

**Contrast vs background `#0E1726` under each simulation** (text legibility):

| Color | Normal | Protan 100 | Deutan 100 | Tritan 100 |
|---|---|---|---|---|
| slate | 6.07 | 6.14 | 6.03 | 6.08 |
| amber | 8.86 | 7.68 | 9.63 | 8.30 |
| red `#FF5A4F` | 5.84 | **4.26** | 6.90 | 4.94 |
| red `#FF5470` | 5.78 | **4.22** | 6.82 | 4.96 |
| chip `#C62828` (as a shape) | 3.19 | **2.25** | 3.83 | 3.43 |
| cyan | 10.29 | 11.27 | 9.62 | 10.80 |

Other measured pairs: white on chip = **5.62**; ink on amber = **8.86**; chip vs surface `#152033` = **2.90**.

**Grayscale (luminance only).** slate 0.305 vs red-text 0.291: these **are effectively identical in grayscale** (ratio 1.04).

**Findings → rules (the master prompt must encode these):**
1. **Status is never carried by text color alone.** Every status appears as a **filled chip or marker shape**: hollow circle (No rise), triangle (Watch), octagon (Avoid), octagon + stripes (Closed), dashed ring + "?" (Unknown), plus the word.
   - Fill polarity separates Watch from Avoid even for deuteranopes: ΔE 24.9, luminance ratio 2.5.
2. **Adopt `#FF5470`** for Avoid text and icons. Deutan separation from amber improves 10.7 → 15.7, at the same contrast.
3. **Red or amber status text is ≥ 18 pt, semibold or heavier** (≥ 18 pt meets Apple's 3:1 row for any weight; semibold adds margin). For protanopes, red text falls to ~4.2:1 on the background, which passes only the large/bold 3:1 threshold. Apple's own contrast table treats bold text of any size and text ≥ 18 pt at 3:1 `[Verified: HIG accessibility JSON]`.
4. **Red markers always get a 2 pt white (or `#FF5470`) rim.** `#C62828` is 3.19:1 on the background (2.25 for protanopes) and 2.90 on surfaces.
5. **No rise and Unknown are deliberately both gray** (ΔE 5.5). They are told apart *only* by the dashed outline, the "?" glyph and the word. Never drop those.
6. **Water vs route** is weak for tritanopes (ΔE 10.7). The route is always a 6 pt line with a dark casing; creeks are 3 pt with no casing (as in design.md).
7. **Amber vs cyan** has equal luminance for deuteranopes (ratio 1.00), but a large hue difference (ΔE 42). That is fine, but never use amber text on a cyan fill.
8. **Simulation vs filters.**
   - iOS "Color Filters" *compensate* for CVD; they don't simulate it. Use iOS **Grayscale** as the test (Apple's recommendation).
   - Android Developer options → "Simulate color space" `[Unverified: menu name]`.
   - Use our Python script on screenshots (rule 9).
9. **Judge-facing evidence:** add `scripts/cvd_screens.py`. It renders protan, deutan, tritan and grayscale versions of key screenshots (Pillow + colorspacious) into `docs/a11y/cvd/`. Show a 4-up image in the README.
10. Prevalence for the README: red-green CVD affects roughly 1 in 12 men and 1 in 200 women of Northern-European ancestry `[Unverified: commonly cited figure; cite a source before use]`.

### 3.8 Haptic and audio redundancy (never one channel)

All `expo-haptics@57.0.3` API names are `[Verified: pkg]`: `notificationAsync(Success|Warning|Error)`, `impactAsync(Light|Medium|Heavy|Soft|Rigid)`, `selectionAsync()`, `performAndroidHapticsAsync(AndroidHaptics.*)`.

| Event | Visual | Haptic | Audio (Drive Mode / alerts on) | Screen reader |
|---|---|---|---|---|
| → Watch | Amber triangle + "Watch" | `notificationAsync(Warning)` | Short soft chime, then TTS | announce `default` |
| → Avoid | Red octagon + "Avoid" + halo (3 cycles) | `notificationAsync(Error)` | Alert tone, then TTS | announce `high` |
| → Closed | Octagon + stripes + "OFFICIAL" | `notificationAsync(Error)` | TTS "…is closed. Turn around. Don't drown." | announce `high` |
| De-escalation | Color/shape change + "Update" | `impactAsync(Light)`. **Never `Success`**, because it implies "safe" (design.md) | Drive Mode only: TTS "Update…" | announce `low` |
| → Unknown / stale | Dashed ring + "?" | `impactAsync(Light)` | none | announce `default` |
| Toggle, segment change | — | `selectionAsync()` | — | — |

Further rules:
- In-app settings for **Haptics**, **Sounds** and **Spoken alerts** (each on/off) and **voice speed**.
- Haptics are never the only cue: some devices have none, and many phones sit in car mounts.
- iOS silent switch: `expo-speech` "won't produce sound if the device is in silent mode" `[Verified: Expo docs repo docs/pages/versions/v57.0.0/sdk/speech.mdx]`.
  - In Drive Mode, configure `expo-audio` `setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' })` (maps.md) and speak with `useApplicationAudioSession: true` `[Verified: pkg expo-speech@57.0.3 types]`.
  - **Test on device** that TTS plays with the silent switch on `[Unverified combination]`.
  - If it doesn't, show a one-time tip: "Turn off silent mode for spoken alerts."

### 3.9 Touch targets and gestures

**Minimums from the platforms:**
- iOS HIG: default control 44×44 pt, minimum 28×28 pt. Add ~12 pt of padding around bezeled elements and ~24 pt around unbezeled ones `[Verified: Apple HIG accessibility JSON]`.
- Android: ≥ 48×48 dp `[Verified: developer.android.com/guide/topics/ui/accessibility/apps]`.
- WCAG 2.2 AA: 24×24 `[Verified]`.

**FordCast rules:**
- **≥ 48 pt everywhere**, and **≥ 76 pt with ≥ 24 pt gaps in Drive Mode**. The Android-for-Cars figure is `[Verified (sibling): design.md]`.
- Use `hitSlop` to extend small icon buttons up to 48.
- Every gesture has a button alternative: map pinch → ±; sheet drag → grabber button; scrubber drag → ±5 min; long-press → `accessibilityActions`.

### 3.10 Testing protocol and Definition of Done

**Tools:**

| Tool | Use | Tag |
|---|---|---|
| **Xcode Accessibility Inspector** (Xcode → Open Developer Tool → Accessibility Inspector) | Inspect elements; **Audit** for clipped text, unlabeled elements, text size, contrast | `[Verified: developer.apple.com/documentation/accessibility/accessibility-inspector]` |
| VoiceOver on a **physical** iPhone with screen curtain | Complete every common task eyes-free | `[Verified]` |
| Voice Control ("Show names", "Show numbers", "Tap …") | Proves Label-in-Name | `[Verified]` |
| Switch Control / Android Switch Access | Every action reachable | `[Verified]` |
| **Android Accessibility Scanner** (Play Store app) | Checks "content labels, clickable items, contrast, and more" | `[Verified: developer.android.com/guide/topics/ui/accessibility/testing]` |
| TalkBack | Reads each element; alerts are read aloud; every element reachable by swiping | `[Verified: same page]` |
| `@react-native-ama/core@1.2.1` (AMA, Formidable): `<AMAProvider>` in **dev builds only** | Runtime highlighting of a11y issues such as missing roles and contrast. **Not supported in Expo Go** (it has a native module). | `[Verified: npm view; github FormidableLabs/react-native-ama README]` |
| `@testing-library/react-native@14.1.0` | Unit tests query by role and label (`getByRole('button', { name: /show detour/i })`). If a test can't find it by role, a screen reader can't either. Peer: react ≥ 19, RN ≥ 0.78, jest ≥ 29, `test-renderer` ^1.0.0. | `[Verified: npm view]` |
| `eslint-plugin-react-native-a11y@3.5.1` | **Skip.** Its peer dependency is ESLint ≤ 8, while `eslint-config-expo@57.0.2` targets newer ESLint (flat config). | `[Verified: npm view peerDependencies]` |
| `scripts/cvd_screens.py` | CVD and grayscale renders of screenshots | ours |

**Device test matrix (log results in `docs/a11y/TESTING.md` with date, device, OS and pass/fail):**
1. iPhone (iOS 26) + one Android (14+).
2. On each, run the **5 common tasks**:
   - (a) First launch and onboarding pledge
   - (b) Find a crossing's status from Map Home (via List)
   - (c) Open the Crossing Card and hear the window and the reason
   - (d) Check My Drive and open the detour
   - (e) Run Storm Replay to the "lead time" result
   - Plus Settings: language and alerts.
3. Run all 5 tasks under each of these settings:
   - VoiceOver / TalkBack
   - Voice Control
   - Largest text (AX5 / 200%)
   - Bold Text + Increase Contrast + Reduce Transparency together (Apple's contrast test)
   - Reduce Motion
   - Grayscale
   - Spanish
   - Landscape
4. **DoD:** every cell passes, or has a filed issue with a workaround. No common task requires sight, color perception, precise dragging or small targets.

---

## 4. Spanish localization

### 4.1 Why Spanish (audience numbers to verify)

- **Austin/Travis County Spanish speakers:** roughly **1 in 5 residents aged 5+ speak Spanish at home**, and about 3 in 10 speak a language other than English `[Unverified: recalled ACS/QuickFacts magnitudes. Do not quote until verified]`.
- **How to verify (5 min):**
  - Table **ACS S1601** ("Language Spoken at Home").
  - Geography: Travis County (`state:48 county:453`) and Austin city (`place:05000`).
  - Use the latest 5-year vintage. As of Oct 2026 that is probably 2020–2024 `[Unverified release schedule]`.
  - API template:
    `https://api.census.gov/data/{YEAR}/acs/acs5/subject?get=NAME,S1601_C01_001E,S1601_C02_004E&for=county:453&in=state:48`
    Confirm the variable meanings at `https://api.census.gov/data/{YEAR}/acs/acs5/subject/variables.html`: C02_004 should be "Percent – Spanish" `[Unverified variable codes]`.
  - Also capture the limited-English-proficiency share (S1601 "speak English less than very well" columns). That is the strongest argument for full Spanish *spoken* alerts.
- **Spanish public-warning context:**
  - api.weather.gov alert text is English-only.
  - NWS AI translation of web products was paused and then restarted.
  - Spanish WEA (Wireless Emergency Alerts) messages use templates `[Verified (sibling): hydro.md §5, Grist/Houston Landing/Nextgov]`.
  - **So a crossing-level Spanish alert is a genuine gap FordCast fills.** Say this in the video and in Q3.

### 4.2 Architecture (verified versions)

| Package | Version | Tag |
|---|---|---|
| `i18next` | 26.4.4 | `[Verified: npm view]` |
| `react-i18next` | 17.0.16 (peer `i18next >= 26.2.0`) | `[Verified: npm view]` |
| `expo-localization` | 57.0.2 (SDK 57) | `[Verified: npm view]` |
| `intl-pluralrules` | 2.0.1 (`import 'intl-pluralrules'` is a polyfill that only installs if missing) | `[Verified: npm view readme]` |
| `i18next-cli` (optional, extract or verify keys) | 1.75.3 | `[Verified: npm view]` |

```ts
// src/i18n/index.ts  (import this FIRST in app/_layout.tsx)
import 'intl-pluralrules';                       // Hermes lacks Intl.PluralRules (i18next docs)
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import en from './locales/en.json';
import es from './locales/es.json';

export type Lang = 'en' | 'es';
const deviceLang: Lang = getLocales()[0]?.languageCode === 'es' ? 'es' : 'en';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  lng: deviceLang,                 // override with the saved user choice at startup
  fallbackLng: 'en',
  supportedLngs: ['en', 'es'],
  interpolation: { escapeValue: false },
  returnNull: false,                // option names checked in i18next@26.4.4 typescript/options.d.ts
});

export const intlLocale = (l: Lang) => (l === 'es' ? 'es-US' : 'en-US');   // es-US: "1,234.5", "2:05 p.m."
export default i18n;
```

**Expo specifics** `[Verified: Expo docs repo docs/pages/guides/localization.mdx]`:
- **Per-app language in system settings (iOS and Android):** add the config plugin `["expo-localization", { "supportedLocales": { "ios": ["en","es"], "android": ["en","es"] } }]`.
- **Android:** a language change doesn't restart the app. Re-read `getLocales()` when the `AppState` becomes active. On iOS the app resets.
- **Localized app name and permission prompts:** set `ios.infoPlist.CFBundleAllowMixedLocalizations: true` and `"locales": { "es": "./locales/app.es.json" }`. In that file, `ios.NSLocationWhenInUseUsageDescription` and the other usage-description keys produce Spanish system permission dialogs.
- **SDK 55+** also supports an iOS `Localizable.strings` object, usable for localized notifications (Stretch).
- RTL is not needed. Leave the default.

**Language picker:**
- On onboarding page 1 and in Settings, offer **"Device language (recommended)" | "English" | "Español"**.
- On iOS and on Android 13+, also show a "Change in system settings" link (`Linking.openSettings()`), so screen readers pick the right voice (see §4.5).
- Store the choice in the device's key-value store.
- Send `lang` with the push subscription, so the server sends Spanish pushes (backend.md `device_subscriptions`).

### 4.3 Formatting and grammar rules

1. **Plurals:**
   - Spanish CLDR categories are `one, many, other` (`many` applies to 1,000,000-type numbers) `[Verified: computed, Node 22 Intl.PluralRules('es')]`.
   - Provide `_one`, `_other`, **and `_many` (copy of `_other`)** for every counted key.
   - Always pass `count`.
2. **Numbers:**
   - `new Intl.NumberFormat(intlLocale(lang), { maximumFractionDigits: 1 })` → `3.1`.
   - **Don't use `style:'unit'` on Android.** Hermes has gaps in unit formatting on older Android versions `[Verified: raw.githubusercontent.com/facebook/hermes/main/doc/IntlAPIs.md]`. Write units in the strings instead (`{{n}} pies`, `{{n}} ft`).
3. **Time:** `Intl.DateTimeFormat(intlLocale(lang), { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })` → "2:05 p.m." (ES) / "2:05 PM" (EN).
4. **Relative time and lists:**
   - Hermes' Intl document doesn't list `RelativeTimeFormat` / `ListFormat`, so **don't depend on them**.
   - Use i18n strings instead: `"updated_ago_one": "hace {{count}} min"` and so on.
5. **Ranges:**
   - Visual: `{{lo}}–{{hi}} min` (en dash).
   - Spoken: `"de {{lo}} a {{hi}} minutos"` / `"{{lo}} to {{hi}} minutes"`.
6. **Register:**
   - Always **usted**, and imperatives in usted form: *Evite, Use, Planee, Dé la vuelta*.
   - Use Latin-American vocabulary: *carro/vehículo* (not *coche*), *manejar* (more common in US/MX Spanish; *conducir* is neutral) `[Unverified: have the native reviewer confirm]`.
7. **Expansion:**
   - Spanish runs about **+30%** longer, and up to +100–200% for very short strings `[Verified (sibling): design.md]`.
   - No fixed-width buttons.
   - Test a pseudo-locale with +50% length.
8. **Proper nouns:**
   - Crossing and creek names stay in English ("Bull Creek at Loop 360").
   - Add a `name_spoken_es` field for TTS where needed. For example, "FM 1626" → "F M dieciséis veintiséis", or simply "F-M 1626" `[Unverified: test TTS output]`.

### 4.4 Terminology

**FordCast's own states** (§6.3 has the full wording bank):

| EN | ES (recommended) | Rationale | Alternative |
|---|---|---|---|
| No rise detected *(rename of "No current signal")* | **Sin crecida detectada** | "Sin señal" = "no phone service" | Sin indicios de crecida |
| Watch | **Precaución** | Keeps clear of NWS's official "Vigilancia" (Watch) product name | Vigilancia |
| Avoid | **Evite** | Direct usted imperative | — |
| Flooded / Closed | **Inundado / Cerrado** | — | — |
| Unknown – data offline | **Desconocido – sin datos** | — | Sin datos |
| Storm Replay | **Repetición de tormentas**; banner **REPRODUCCIÓN** | — | Repaso de tormentas |
| Check My Drive | **Revisar mi ruta** | — | — |
| Drive Mode | **Modo manejo** | — | Modo de conducción |

**Glossary for translators:**

| EN | ES | Note |
|---|---|---|
| low-water crossing | **cruce bajo** (first use: "cruce bajo (de agua)") | `[Unverified: confirm the term used in City of Austin / Travis County Spanish flood materials]` |
| crossing | cruce | |
| stream gauge | medidor de nivel del río / medidor | |
| upstream | río arriba | |
| creek | arroyo | |
| flash flood | inundación repentina | |
| barricade | barricada | |
| detour | desvío | |
| route | ruta | |
| likely / possible | probable / posible | |
| feet | pies | |
| data offline | sin datos / sin conexión | |

**NWS products in Spanish UI** `[Unverified: official Spanish product names are unsettled]`.
- Traditional NWS Spanish usage: Warning = *Aviso*, Watch = *Vigilancia*, Advisory = *Advertencia*.
- Research found *aviso* is read as low urgency by many Spanish speakers: Trujillo-Falcón et al., "¿Aviso o alerta?", BAMS ~2021–22 `[Unverified citation]`.
- Sibling search results show a newer use of *Advertencia de inundación repentina* for Flash Flood Warning (hydro.md).
- **Decision:** show the **English product name plus a Spanish gloss**:

| NWS product | ES display |
|---|---|
| Flash Flood Warning | **"NWS: Flash Flood Warning — inundación repentina en curso o inminente en su área."** |
| Flash Flood Watch | **"NWS: Flash Flood Watch — es posible que haya inundaciones repentinas."** |
| Flash Flood Emergency (a Warning tagged CATASTROPHIC, per hydro.md) | **"NWS: FLASH FLOOD EMERGENCY — inundación repentina extremadamente peligrosa. Busque terreno alto. No viaje."** |
| Flood Advisory | **"NWS: Flood Advisory — inundaciones menores posibles o en curso."** |

- If NWS EWX confirms the current Spanish names (ask in the §9 email), switch to "Aviso/Advertencia de inundación repentina (Flash Flood Warning)".

**Slogan** `[Verified (sibling): design.md, weather.gov Spanish flyer and flash card]`:
- **"¡Dé la vuelta, no se ahogue!"** is the official NWS Spanish TADD slogan.
- "Turn Around Don't Drown" is a registered trademark of the U.S. Dept. of Commerce. Use it as text in safety messaging. Don't alter the official logo or imply NWS endorsement `[Unverified: NWS usage terms]`.

### 4.5 Spoken alerts: Spanish TTS and screen readers

**`expo-speech@57.0.3` API** `[Verified: pkg types]`:
- `speak(text, { language, voice, rate, pitch, volume, useApplicationAudioSession (iOS), onDone, onError, onStart, onStopped })`
- `getAvailableVoicesAsync()` → `{ identifier, name, quality: 'Default'|'Enhanced', language }`

**Voice selection algorithm:**
1. Get voices.
2. Choose the first voice matching, in order: `es-US` → `es-MX` → `es-419` → any `es-*`. Prefer `quality === 'Enhanced'`.
3. If there is no Spanish voice, speak with `language: 'es-US'` and no voice id (the system picks).
4. If speech fails (`onError`), fall back to tone + haptic + visual, and show a one-time tip: "Download a Spanish voice: Settings → Accessibility → Spoken Content → Voices" `[Unverified: iOS menu path]`.
5. **Do not hard-code voice names.** Reported names such as "Paulina (es-MX)" and "Mónica (es-ES)" on iOS, or Google TTS es-US on Android, are `[Unverified]`.

**Rate:**
- Default 0.5 on iOS / 1.0 on Android. Expo normalizes "1.0 = normal" `[Verified: pkg types "1.0 is the normal rate"]`.
- Default **0.95** with a user slider from 0.8 to 1.2.

**Screen readers:**
- **iOS:** `accessibilityLanguage` exists **on iOS only** `[Verified: RN 0.86.3 AccessibilityPropsIOS]`. The `AppText` wrapper sets `accessibilityLanguage={lang === 'es' ? 'es-US' : 'en-US'}` on every text element, so VoiceOver uses a Spanish voice even when the iPhone's system language is English.
- **Android:** there is no per-element language prop in RN. TalkBack's voice follows the TTS engine and system language `[Unverified]`. **Test on device:** system English + app Spanish + TalkBack. If the speech is mispronounced, recommend setting the per-app language via system settings and document the behavior in README → Accessibility.

**Spoken-string style:**
- No abbreviations, symbols or dashes: "minutos", not "min"; "de 15 a 30", not "15–30"; "pies", not "ft".
- **TTS alerts** lead with the action ("Evite Bull Creek en Loop 360…"). **Row accessibility labels** lead with the visible text (the name) for WCAG 2.5.3 (§3.3 B).
- ≤ 12 words for Drive Mode.

### 4.6 QA

- **Native-speaker review:** at least one fluent adult, ideally a Spanish teacher. Record their name, with permission, in the README acknowledgments.
- **Comprehension test with ≥ 2 Spanish-dominant speakers** (§9.4). Ask "¿Qué haría usted si ve esto?" ("What would you do if you saw this?") for each state.
- **Automated tests:**
  - Key parity between `en.json` and `es.json` (CI fails on missing keys).
  - No leftover English inside `es.json` values, except allow-listed proper nouns.
  - Banned-words scan (§6.2).
  - Pseudo-locale build for overflow.

---

## 5. Driver distraction (Drive Mode, passenger mode, Focus)

### 5.1 NHTSA Visual-Manual Driver Distraction Guidelines (Phase 1, 2013)

| Item | Content | Tag |
|---|---|---|
| Glance criteria | Single glances away from the road ≤ **2 s**; total eyes-off-road time per task ≤ **12 s** | `[Verified (sibling): design.md, via autoblog/kbb citing NHTSA 2013]` |
| Test form | Simulator eye-glance test: for most test drivers, mean glance ≤ 2.0 s, ≤ 15% of glances > 2.0 s, total ≤ 12.0 s | `[Unverified: recalled detail]` |
| Per-se lockouts while driving | Manual text entry (texting/messaging, web browsing); displaying text to read (books, web pages, social media, messages); non-driving video and images; automatically scrolling text | `[Unverified: recalled list]` |
| Scope | Written for **in-vehicle** systems. A Phase 2 proposal for portable/aftermarket devices ("Driver Mode", 2016) was never finalized. | `[Unverified]` |
| How FordCast uses it | As a **voluntary design standard**. Say "designed to follow NHTSA's visual-manual distraction guidelines", **not** "NHTSA-compliant". | — |

**Verify:** NHTSA-2010-0053, Federal Register, April 26, 2013, "Visual-Manual NHTSA Driver Distraction Guidelines for In-Vehicle Electronic Devices" (concept doc S12).

### 5.2 Drive Mode requirements

1. **Entry:**
   - From the Drive tab, or a prompt when moving is detected: speed ≥ 4.5 m/s for 5 s while the app is in the foreground. The prompt is one large "Start Drive Mode" button plus "Not now".
   - Never auto-start without consent.
2. **One decision per screen:**
   - Status word ≥ 32 pt; secondary text ≥ 24 pt.
   - Targets ≥ 76 pt with ≥ 24 pt gaps (design.md).
   - ≤ 120 characters on screen per message (design.md, Android for Cars).
3. **Voice first:** every state change on the route is spoken (§6.3 "Drive TTS"). The screen shows the same words.
4. **No text entry, no scrolling lists, no map panning while moving.** The map is fixed to follow-mode with no gestures.
5. **Keep awake** with `expo-keep-awake` (design.md). Never force brightness.
6. **Night palette** (`#070D18`, design.md). Negative polarity.
7. **Background:**
   - With background location permission, alerts continue as notifications (Stretch).
   - Android geofence latency is typically < 2 min, 2–3 min under background limits, and up to 6 min when the device was stationary. Android allows 100 geofences per app `[Verified: developer.android.com/develop/sensors-and-location/location/geofencing]`.
   - iOS allows 20 monitored regions (concept doc, design.md).
   - Rotate regions by distance + risk.
   - **Say "may arrive minutes late" in onboarding.**
8. **Exit:** a big "End drive" button. Auto-end after 10 min stationary, with a spoken prompt.
9. **App Store framing:**
   - Apple 1.4.5: apps must not urge use "in a way that risks physical harm".
   - Apple 5.1.5: "Location-based APIs shouldn't be used to provide emergency services"
   - Both are `[Verified: developer.apple.com/app-store/review/guidelines/]`.
   - **So FordCast never calls itself an emergency alert service.** It is "supplementary flood-risk information". Drive Mode copy says "Mount your phone. Don't touch it while driving."

### 5.3 Passenger mode (unlocking text entry while moving)

- **Trigger:** the user taps a locked control (search field, list, settings) while `speed ≥ 4.5 m/s`.
- **Dialog (large):**
  - EN: "Typing is locked while the car is moving. Are you a passenger?"
  - ES: "Escribir está bloqueado mientras el carro está en movimiento. ¿Es usted pasajero?"
  - Buttons: **"I'm a passenger" / "Soy pasajero"** (requires a 1.5 s press-and-hold with a progress ring; it can be cancelled by sliding off, per WCAG 2.5.2) and **"Cancel" / "Cancelar"**.
  - Pattern reference: Waze offers a similar "I'm a passenger" override `[Unverified]`.
- **Scope:**
  - Unlocks for the current trip only. It re-locks after speed < 1 m/s for 3 min, or on app relaunch.
  - **Never** offered inside Drive Mode itself; the user must exit Drive Mode first.
  - Store no history.
- **Accessibility:**
  - The hold-to-confirm also has `accessibilityActions=[{name:'activate', label:'Confirm I am a passenger'}]`, so VoiceOver users double-tap to activate (an "equivalent" control under WCAG 2.5.7/2.5.8).
  - Hint: "Double-tap to confirm."

### 5.4 Focus, Driving Focus, Do Not Disturb, and alert delivery

- **iOS interruption levels** `[Verified: Apple HIG managing-notifications JSON; UNNotificationInterruptionLevel.timeSensitive JSON]`:
  - **Time Sensitive** "can break through system controls such as Notification Summary and Focus", and "the user can turn off the ability".
  - Use it "only for notifications that are relevant in the moment… happening now or will happen within an hour". **This fits Avoid/Closed exactly.**
  - Never use it for anything promotional.
  - The system periodically asks users to evaluate Time Sensitive notifications. **Over-use gets the app's ability to interrupt switched off.**
  - **Critical** "requires an entitlement" and is for health and safety, typically from agencies. FordCast: **Roadmap**, not requested for CAC.
  - The time-sensitive entitlement key and the push spelling (`"interruptionLevel": "time-sensitive"` for push, `timeSensitive` for local) are covered in maps.md (notifications section, lines ~839–842); a paid Apple account is needed.
- **Driving Focus specifics** `[Unverified: support.apple.com unreachable]`:
  - Driving Focus may silence notifications, and whether Time Sensitive notifications pass is a per-Focus user setting.
  - **Device test required:** turn on the Driving Focus, send a Time Sensitive test push, and record what happens.
  - Onboarding copy: "To get FordCast alerts while Driving Focus is on, allow Time Sensitive notifications for FordCast."
  - Add a Settings deep link with `Linking.openSettings()`.
- **Android:**
  - `POST_NOTIFICATIONS` is a runtime permission since Android 13, and "notifications are off by default" for new installs. Request it in context, e.g. after the user saves a route or taps "Alert me" `[Verified: developer.android.com notification-permission]`.
  - **Do not use full-screen intents.** Android 14 limits `USE_FULL_SCREEN_INTENT` to calling and alarm apps `[Verified: developer.android.com 14 behavior changes]`.
  - Channels:
    - `crossing-urgent`: `AndroidImportance.HIGH`; `bypassDnd: false` (bypass needs user policy access, so don't ask for it)
    - `crossing-watch`: DEFAULT
    - `updates`: LOW
  - `expo-notifications` channel fields include `importance`, `bypassDnd`, `lockscreenVisibility` and `sound` `[Verified: pkg expo-notifications@57.0.22 types]`.
- **In-app audio vs notifications:**
  - Inside an active Drive Mode session (foreground), FordCast speaks alerts itself, so Focus doesn't apply to in-app TTS `[Unverified: verify on device with the screen locked; background audio needs an audio background mode, Stretch]`.

---

## 6. Safety and liability messaging

### 6.1 Facts FordCast may state (with tags)

| Fact | Wording to use | Tag |
|---|---|---|
| TADD physics (NWS) | "Just 6 inches of fast-moving water can knock over an adult. 12 inches of rushing water can carry away most cars, and 2 feet can carry away SUVs and trucks." | `[Unverified: recalled NWS wording; confirm on weather.gov/safety/flood-turn-around-dont-drown before quoting. Older NWS pages phrase it as "6 inches reaches the bottom of most passenger cars… a foot of water will float many vehicles… 2 feet of rushing water can carry away most vehicles including SUVs and pickups"]` |
| Same in ES | "Solo 6 pulgadas (15 cm) de agua en movimiento pueden derribar a un adulto. 12 pulgadas (30 cm) de agua corriente pueden arrastrar la mayoría de los carros, y 2 pies (60 cm) pueden arrastrar camionetas y SUV." | `[Unverified: translation; native review]` |
| Never safe | "It is never safe to drive or walk into flood water." / "Nunca es seguro manejar o caminar en agua de inundación." | `[Unverified: NWS phrasing]` |
| Over half of flood drownings involve vehicles | Already sourced in concept doc S3 | concept doc |
| Texas vehicle flood deaths cluster at night, in Flash Flood Alley, ages 20–29 | concept doc S2 | concept doc |
| Slogan | "Turn Around, Don't Drown" / "¡Dé la vuelta, no se ahogue!" | ES `[Verified (sibling)]` |
| Trucks are not immune | Target the known misbelief that bigger vehicles can cross. Driver studies identify vehicle confidence as a key belief (Hamilton et al. 2016, *Safety Science*; Ahmed et al. 2018 review) | `[Unverified citations]` |

### 6.2 Never-safe principle: copy rules (enforced by a CI test)

**Banned as status or reassurance**, in any UI, notification, TTS or a11y string:

| EN | ES |
|---|---|
| safe, safer | seguro (as a status) |
| all clear | todo despejado |
| clear | despejado |
| passable | transitable |
| OK, good to go | listo para pasar, puede cruzar |
| no risk, low risk | sin riesgo, bajo riesgo |
| normal | normal |
| open (unless quoting an official source verbatim, e.g. "City of Austin: no closure reported") | abierto |
| you can cross | puede cruzar |
| no danger | sin peligro |

**Also banned:** single-number countdowns ("in 12 min" / "en 12 min"), green checkmarks on crossings, and the `Success` haptic.

**Allowed exceptions**, allow-listed by key: "It is never safe…" / "Nunca es seguro…" (educational negation); and an official source's own wording inside quotes, attributed.

**CI test** (`__tests__/copy.banned.test.ts`):
1. Load `en.json` and `es.json`.
2. Lowercase, then regex-scan values with word boundaries.
3. Fail on banned tokens unless the key is in `ALLOWLIST`.
4. Also scan the server-side push templates (`backend/templates/*.json`).

**Uncertainty language contract:**

| Element | Rule |
|---|---|
| "likely" (EN) / "probable" (ES) | **Avoid** only: the calibrated model or baseline is above the Avoid threshold |
| "possible" (EN) / "posible" (ES) | **Watch** only |
| Window | Always `lo–hi` minutes. Rounded to 5. Width ≥ 15 min. Never one number. |
| lo ≤ 0 | Show "may already be on the road" / "puede que ya haya agua en el camino". **Never "0 min".** |
| Reason ("Why?") | Every Watch/Avoid shows its evidence: gauge name, rise, period, trigger. Specific warnings get more protective action (Mileti & Sorensen 1990) `[Unverified citation]`. |
| Source label | Every status shows its source: **"FordCast forecast (experimental)"** vs **"Official: City of Austin"** vs **"NWS"**. |
| Official override | An official Closed always wins and is labeled "OFFICIAL". |

### 6.3 Wording bank (EN / ES)

`{name}` = crossing display name; `{lo}`/`{hi}` = window bounds; `{gauge}`; `{rise}` (ft); `{age}` (localized "2 min ago" / "hace 2 min"); `{source}` (official source); `{time}` (local time); `{n}` = detour minutes.

All ES strings are **[Unverified: native-speaker review required]**. The EN strings are design decisions.

#### State: No rise detected (key `state.no_signal`)

| Slot | EN | ES |
|---|---|---|
| chip | No rise detected | Sin crecida detectada |
| card headline | No upstream rise detected | No se detecta crecida río arriba |
| card body | FordCast isn't seeing rising water at the gauges upstream of this crossing right now. That doesn't mean the road is clear — nearby rain or an ungauged creek can still flood it. | FordCast no detecta agua subiendo en los medidores río arriba de este cruce en este momento. Eso no significa que el camino esté despejado: la lluvia cercana o un arroyo sin medidor todavía pueden inundarlo. |
| spoken (a11y/TTS) | {name}. No upstream rise detected. Updated {age}. | {name}. No se detecta crecida río arriba. Actualizado {age}. |
| area headline (Map Home) | No upstream rise detected near you | No se detecta crecida río arriba cerca de usted |
| area sub | Watching {g} upstream gauges for {c} crossings · updated {age} | Vigilando {g} medidores río arriba para {c} cruces · actualizado {age} |
| footer (always visible) | Water can cover a road without warning. Turn around, don't drown. | El agua puede cubrir el camino sin previo aviso. ¡Dé la vuelta, no se ahogue! |
| push | *(never)* | *(nunca)* |

#### State: Watch (key `state.watch`)

| Slot | EN | ES |
|---|---|---|
| chip | Watch | Precaución |
| card headline | Watch · water rising upstream | Precaución · el agua sube río arriba |
| card body | {gauge} rose {rise} ft in the last 30 min. If it keeps rising, this crossing could flood in about {lo}–{hi} min. Plan another route. | {gauge} subió {rise} pies en los últimos 30 min. Si sigue subiendo, este cruce podría inundarse en unos {lo}–{hi} min. Planee otra ruta. |
| spoken | Watch. {name}. Water is rising upstream. Possible flooding in {lo} to {hi} minutes. | Precaución. {name}. El agua está subiendo río arriba. Posible inundación en {lo} a {hi} minutos. |
| push title | Watch: {name} | Precaución: {name} |
| push body | Water rising upstream. Possible flooding in {lo}–{hi} min. Plan another route. | El agua sube río arriba. Posible inundación en {lo}–{hi} min. Planee otra ruta. |
| Drive Mode TTS | Heads up. Water is rising upstream of {name}. Plan another route. | Atención. El agua está subiendo río arriba de {name}. Planee otra ruta. |
| widget / Live Activity | Watch · {lo}–{hi} min | Precaución · {lo}–{hi} min |

#### State: Avoid (key `state.avoid`)

| Slot | EN | ES |
|---|---|---|
| chip | Avoid | Evite |
| card headline | Avoid · likely flooded within {lo}–{hi} min | Evite · probablemente inundado en {lo}–{hi} min |
| headline (lo ≤ 0) | Avoid · water may already be on the road | Evite · puede que ya haya agua en el camino |
| card body | Water from upstream is heading to this crossing. It may reach the road before any barricade goes up. Use another route. | El agua de río arriba va hacia este cruce. Puede llegar al camino antes de que pongan barricadas. Use otra ruta. |
| detour line | Detour adds {n} min | El desvío agrega {n} min |
| spoken | Avoid. {name}. Likely flooded within {lo} to {hi} minutes. Use another route. | Evite. {name}. Probablemente inundado en {lo} a {hi} minutos. Use otra ruta. |
| push title | Avoid {name} | Evite {name} |
| push body | Likely flooded within {lo}–{hi} min. Use another route. Never drive into water. | Probablemente inundado en {lo}–{hi} min. Use otra ruta. Nunca maneje en el agua. |
| Drive Mode TTS | Avoid {name}. Flooding likely soon. Take another route. | Evite {name}. Inundación probable pronto. Tome otra ruta. |
| widget | AVOID · {lo}–{hi} min | EVITE · {lo}–{hi} min |
| nav hand-off warning | Your map app doesn't know about this forecast. If it routes you back toward {name}, don't follow it. | Su app de mapas no conoce este pronóstico. Si lo lleva de vuelta hacia {name}, no la siga. |

#### State: Flooded / Closed (key `state.closed`; sub-variants `official`, `sensor`)

| Slot | EN | ES |
|---|---|---|
| chip | Closed / Flooded | Cerrado / Inundado |
| card headline (official) | Closed · {source} | Cerrado · {source} |
| card headline (sensor) | Water over road · reported {time} | Agua sobre el camino · reportada a las {time} |
| card body | {source} reports this crossing closed. Do not drive around barricades. Turn around, don't drown. | {source} reporta este cruce cerrado. No pase alrededor de las barricadas. ¡Dé la vuelta, no se ahogue! |
| spoken | Closed. {name}. Reported by {source}. Turn around, don't drown. | Cerrado. {name}. Reportado por {source}. Dé la vuelta, no se ahogue. |
| push title | Closed: {name} | Cerrado: {name} |
| push body | {source} reports it closed. Turn around, don't drown. | {source} lo reporta cerrado. ¡Dé la vuelta, no se ahogue! |
| Drive Mode TTS | {name} is closed. Turn around. Don't drown. | {name} está cerrado. Dé la vuelta. No se ahogue. |

#### State: Unknown / data offline (key `state.unknown`)

| Slot | EN | ES |
|---|---|---|
| chip | Unknown | Desconocido |
| card headline | Unknown · data offline | Desconocido · sin datos |
| card body | We can't reach the gauges for this crossing (last data {age}). Treat it as if it could flood, and check official sources. | No podemos obtener datos de los medidores de este cruce (últimos datos: {age}). Trátelo como si pudiera inundarse y consulte fuentes oficiales. |
| spoken | Unknown. {name}. No data since {age}. It could flood. | Desconocido. {name}. Sin datos desde {age}. Podría inundarse. |
| push (only for saved-route crossings while an NWS flood product is active) | FordCast can't see {name} right now · Data is offline during flood alerts. Avoid low-water crossings. | FordCast no puede ver {name} ahora · No hay datos mientras hay alertas de inundación. Evite los cruces bajos. |

#### De-escalation (any state → lower; key `update.deescalate`)

Send only to devices that received the escalation.

| Slot | EN | ES |
|---|---|---|
| push title | Update: {name} | Actualización: {name} |
| push body / card | FordCast no longer sees water rising upstream. Water may still be on the road. Obey barricades. | FordCast ya no detecta agua subiendo río arriba. Todavía puede haber agua en el camino. Respete las barricadas. |
| Drive TTS | Update on {name}. Rising water upstream has stopped. Water may still be on the road. | Actualización sobre {name}. El agua dejó de subir río arriba. Todavía puede haber agua en el camino. |

**Never:** "cleared", "reopened", "safe again". Closed lifts only when the official source lifts it. Text: "{source}: closure lifted at {time}. Water may remain. Use caution." / "{source}: cierre levantado a las {time}. Puede quedar agua. Tenga cuidado."

#### Freshness, offline, replay, NWS context

| Key | EN | ES |
|---|---|---|
| fresh.updated | Updated {age} | Actualizado {age} |
| fresh.as_of_offline | Risk as of {time} — you're offline | Riesgo a las {time} — está sin conexión |
| fresh.partial | Some gauges delayed | Algunos medidores con retraso |
| replay.banner | REPLAY · real data from {storm} · not live | REPRODUCCIÓN · datos reales de {storm} · no es en vivo |
| replay.result | FordCast warned {x} min before water reached the road | FordCast avisó {x} min antes de que el agua llegara al camino |
| replay.honesty | Best example shown. Across {n} storms the median lead time was {m} min. | Se muestra el mejor ejemplo. En {n} tormentas, la anticipación mediana fue de {m} min. |
| nws.ffw | NWS: Flash Flood Warning until {time} | NWS: Flash Flood Warning hasta las {time} — inundación repentina en curso o inminente |
| nws.ffa | NWS: Flash Flood Watch until {time} — flash flooding is possible | NWS: Flash Flood Watch hasta las {time} — es posible que haya inundaciones repentinas |
| nws.ffe | NWS: FLASH FLOOD EMERGENCY — extremely dangerous flooding. Get to higher ground. Do not travel. | NWS: FLASH FLOOD EMERGENCY — inundación extremadamente peligrosa. Busque terreno alto. No viaje. |
| alerts.why_late | Alerts can arrive minutes late, and FordCast doesn't cover every road. | Las alertas pueden llegar con minutos de retraso, y FordCast no cubre todos los caminos. |

### 6.4 Disclaimers (where each one appears)

| Where | EN | ES |
|---|---|---|
| **Onboarding pledge** (required; "I understand" button; shown again after major updates) | FordCast is a student-built forecast tool. It can be wrong or late, and it never tells you a road is safe. I will obey barricades and official warnings, and I will never drive into water. **[I understand]** | FordCast es una herramienta de pronóstico creada por un estudiante. Puede equivocarse o llegar tarde, y nunca le dice que un camino es seguro. Respetaré las barricadas y las alertas oficiales, y nunca manejaré en el agua. **[Entiendo]** |
| **Persistent footer** (Crossing Card, Check My Drive) | Supplementary tool. Obey barricades and official warnings. Never drive into water. | Herramienta complementaria. Respete las barricadas y las alertas oficiales. Nunca maneje en el agua. |
| **About → Legal** | FordCast is an independent student project made for the 2026 Congressional App Challenge. It is not an official warning service and is not affiliated with or endorsed by the National Weather Service, USGS, the City of Austin, Travis County, or the U.S. House of Representatives. Forecasts use provisional data that can be delayed, missing, or wrong. FordCast never indicates that a crossing is safe. Always obey barricades, road closures, and official warnings. In an emergency, call 911. Provided "as is," without warranty of any kind. | FordCast es un proyecto estudiantil independiente creado para el Congressional App Challenge 2026. No es un servicio oficial de alertas y no está afiliado ni respaldado por el Servicio Nacional de Meteorología (NWS), el USGS, la Ciudad de Austin, el Condado de Travis ni la Cámara de Representantes de EE. UU. Los pronósticos usan datos provisionales que pueden retrasarse, faltar o estar equivocados. FordCast nunca indica que un cruce sea seguro. Siempre respete las barricadas, los cierres de caminos y las alertas oficiales. En una emergencia, llame al 911. Se ofrece "tal cual", sin garantía de ningún tipo. |
| **Data attribution** (About + README + video end card) | Data: U.S. Geological Survey (provisional, subject to revision) · NOAA/NWS · City of Austin · Map © OpenStreetMap contributors, OpenFreeMap/OpenMapTiles · Routing © openrouteservice | (same names; "provisional, subject to revision" → "provisionales, sujetos a revisión") |
| **Location primer** | FordCast uses your location to show crossings near you and on your route. Your location stays on your phone. | FordCast usa su ubicación para mostrar los cruces cerca de usted y en su ruta. Su ubicación se queda en su teléfono. |
| **Background location primer** | Allow "Always" so FordCast can warn you near a crossing where flooding is likely, even when the app is closed. Alerts can arrive minutes late. Your location stays on your phone. | Permita "Siempre" para que FordCast le avise cerca de un cruce donde es probable una inundación, incluso con la app cerrada. Las alertas pueden llegar con minutos de retraso. Su ubicación se queda en su teléfono. |
| **Drive Mode start** | Mount your phone. Don't touch it while driving. FordCast will speak. | Coloque su teléfono en un soporte. No lo toque mientras maneja. FordCast le hablará. |

Source of the USGS provisional-data wording: hydro.md §10 `[Verified (sibling)]`.

### 6.5 Communicating uncertainty: research → design rules

All citations below are `[Unverified: from memory; confirm title, year and venue before citing in the README]`.

| Finding | Source | FordCast rule |
|---|---|---|
| Warnings that are **specific** (hazard, location, time, what to do, who says so) and consistent get more protective action | Mileti & Sorensen (1990), *Communication of Emergency Public Warnings*, ORNL-6609 | Name the crossing, the window, the evidence, the action and the source in every alert (§6.3). |
| Repeated false alarms lower trust and response: the **"cry wolf" effect** | Breznitz (1984) *Cry Wolf*; Simmons & Sutter (2009) *Weather, Climate, and Society*; Ripberger et al. (2015) *Risk Analysis* | FAR is a first-class backtest metric. Alert budget and hysteresis (§6.6). Publish FAR openly. |
| **Uncertainty information reduces the cry-wolf effect** and improves decisions | LeClerc & Joslyn (2015) *Risk Analysis*; Joslyn & LeClerc (2012) *J. Exp. Psych.: Applied* | Ranges plus "likely/possible". A "How accurate is FordCast?" screen with real POD/FAR/lead time. |
| People misread bare probabilities ("30% of what?") | Gigerenzer et al. (2005) *Risk Analysis* | The main UI shows no raw percentages. If ML probability appears (full detent only), give the reference class: "about 7 in 10 similar situations flooded within 60 min". |
| The public wants uncertainty info and handles it well | Morss, Demuth & Lazo (2008) *Weather and Forecasting* | The "Why?" and "How sure?" sections are one tap away. |
| Drivers enter floodwater out of overconfidence, social pressure, or because the water looks shallow | Drobot et al. (2007) *Environmental Hazards*; Hamilton et al. (2016) *Safety Science*; Ahmed et al. (2018) *IJDRR* | Copy targets the misbeliefs ("Trucks and SUVs can be swept away in 2 feet of moving water"). The calm state never reassures. |
| Spanish warning terms vary in perceived urgency | Trujillo-Falcón et al. (~2021–22) *BAMS* | §4.4 decision (English product name + Spanish gloss). |

### 6.6 Alert policy (anti-fatigue, server-side; matches backend.md subscriptions)

1. **Push only on escalation**, for crossings the device subscribed to: saved places/routes, plus optional recent-area IDs that expire in 12 h (backend.md).
2. **Limits:**
   - ≤ 1 push per crossing per level per 60 min.
   - ≤ 3 pushes per device per hour.
   - Bundle simultaneous escalations: "3 crossings on your route: 1 Avoid, 2 Watch".
3. **Hysteresis:**
   - Escalate immediately.
   - De-escalate only after **3 consecutive 5-min cycles** below threshold.
   - Closed lifts only when the official source lifts it.
4. **Watch pushes are opt-in per saved route** (default **off**). Avoid/Closed pushes are on when alerts are enabled.
5. **Never push** No-rise. Push Unknown only under the condition in §6.3.
6. **Log every issued alert** (crossing, level, time; no user data) so live FAR can be audited and shown on "How accurate".
7. **Night:** no quiet hours for Avoid/Closed on saved routes, because night is the riskiest period. Watch respects the user's quiet hours.

---

## 7. Privacy

### 7.1 Data map (design target)

| Data | Where processed | Leaves the device? | Retention | Apple App Privacy | Google Play Data safety |
|---|---|---|---|---|---|
| Precise location (map, nearby ranking, geofences, Drive Mode speed) | Device only | **No** | In memory; last fix only | Not collected: "Data that is processed only on device is not 'collected'" `[Verified: developer.apple.com/app-store/app-privacy-details/]` | Not collected `[Unverified: Play definitions]` |
| Saved places and routes | Device (`expo-sqlite`) | **No** | Until the user deletes them | Not collected | Not collected |
| Crossings near saved places/routes (computed on device) | Device → server as **crossing IDs only** | Yes (IDs) | Until unsubscribed, or 90 days inactive (backend.md) | Not location. The IDs are coarse public places; disclose under "Other Data" if unsure `[Unverified classification]`. | Disclose as "App activity – other" if required `[Unverified]` |
| Check My Drive origin/destination | Device → FordCast API (proxy) → openrouteservice | Yes, **transient** | **Not logged.** Request bodies are excluded from logs. ORS retention: per ORS terms `[Unverified]`. | Apple: "collect" = retained "longer than what is necessary to service the transmitted request in real time" `[Verified]`. If not retained, not collected; still describe it in the privacy policy. | Possibly "ephemeral processing" `[Unverified]`. Safest: declare **Precise location – App functionality – not shared – processed ephemerally** |
| Address search text | Device → API → geocoder | Yes, transient | Not logged | Same as above | Same |
| Expo push token | Server DB | Yes | Deleted on opt-out, `DeviceNotRegistered`, or 90 days inactive | **Identifiers → Device ID**, *Not linked to you*, purpose **App Functionality** | "Device or other IDs", App functionality |
| Language (`en`/`es`) for push text | Server (with token) | Yes | Same as token | Not personal (or "Other") | — |
| Crash reports (only if Sentry is enabled; `sendDefaultPii: false`) | Sentry | Yes | Provider default `[Unverified]` | **Diagnostics → Crash Data**, not linked | "Crash logs" |
| Server request logs | Hosting providers | IP addresses in provider logs | Provider default `[Unverified]` | Mention in the policy | Mention |
| Accounts, names, emails, contacts, photos, ads, analytics, tracking | — | **None** | — | No ATT prompt needed | — |

**Design consequences (MUST):**
- No accounts, no analytics SDKs, no ad SDKs.
- Do not log request bodies or query strings that contain coordinates.
- Strip coordinates from error reports.
- Provide an in-app **"Delete my alert data"** button that calls `DELETE /v1/devices/{id}` (backend.md) and clears local storage.
- **Roadmap features that change this picture:** crowd "water over road" reports (location + photo), and SMS alerts (phone numbers). Each needs a new privacy review, moderation, and age considerations before launch.

### 7.2 Privacy policy essentials (plain language, EN + ES)

Host it on GitHub Pages and link it in Settings → Privacy, in the README, and in store metadata if the app is published. Apple requires a policy link in the app and in metadata, covering what is collected and how, all uses, third-party sharing, retention and deletion, and how to revoke consent `[Verified: App Review Guideline 5.1.1]`.

Outline:
1. Who we are: a student project; contact email (a project address, **not the student's personal email**; a parent may co-manage it).
2. What we collect: the table above, in plain words.
3. What stays on your phone: location, saved places.
4. Third parties: Expo push service → Apple/Google push; openrouteservice (routing); the geocoder; the hosting/database providers (named); Sentry (if used).
5. Retention and deletion: 90-day auto-delete; the in-app delete button.
6. Children: "FordCast is meant for drivers and is not directed to children under 13. We don't knowingly collect personal information from children" (see §7.3).
7. Security: HTTPS; no accounts.
8. Changes and contact.
9. Effective date. Spanish version with the same content.

### 7.3 Age and law (not legal advice; a parent should review) `[Unverified: ftc.gov and Texas sites unreachable today]`

- **COPPA** applies to online services *directed to children under 13*, or with *actual knowledge* that they collect personal information from under-13 users. Precise geolocation counts as personal information.
  - FordCast targets drivers and collects almost nothing personal, so risk is low.
  - Keep it that way: no accounts, no free-text fields sent to the server, no photos.
  - The FTC amended the COPPA Rule in 2025 `[Unverified details]`.
- **Texas:**
  - The Texas Data Privacy and Security Act, the SCOPE Act (HB 18, 2023), and the App Store Accountability Act (SB 2420, 2025; its status was subject to litigation) are all `[Unverified applicability/status]`.
  - **Decision: don't publish to public app stores before judging.** That sidesteps store-level age-verification duties.
  - Re-check before any public launch.
- **Store accounts:** Apple Developer Program and Google Play Console generally require an adult account holder `[Unverified]`. Use a **parent's account** for TestFlight or Play internal testing if needed.

### 7.4 Store data labels: pre-filled drafts (only if published)

- **Apple App Privacy:**
  - "Data Not Linked to You: Identifiers (Device ID) – App Functionality; Diagnostics (Crash Data) – App Functionality [only if Sentry]."
  - Tracking: **No**.
  - Precise location: **not collected**. On-device only, and routing endpoints are not retained. Re-check against the definitions at submission time.
- **Google Play Data safety:**
  - Data collected: Device or other IDs (App functionality); Location – precise, processed ephemerally, App functionality (conservative).
  - Shared: No.
  - Encrypted in transit: Yes.
  - Deletion request: Yes (in-app).
- **Permission purpose strings:** use the EN/ES primer texts in §6.4. Localize via `locales` in app.json (§4.2).

---

## 8. Demo video production plan (maximize the score)

### 8.1 Specs

| Item | Choice | Tag / why |
|---|---|---|
| Length | **2:15–2:30** (hard cap 3:00) | CAC guidance `[Unverified]` |
| Aspect / resolution | **16:9, 1920×1080 delivery** (edit in a 4K timeline for crisp punch-ins), 30 fps (60 fps if UI motion looks choppy) | Judges likely watch on laptops or projectors `[Unverified]`. Phone footage sits in a device frame with kinetic text beside it. |
| Host | YouTube, **unlisted**; title "FordCast — Congressional App Challenge 2026 (TX-10)" | Unlisted link works logged-out (test it) |
| Captions | **Hand-corrected EN SRT** + **ES subtitle track**. Burned-in captions only for kinetic stats. | Practices the a11y it claims. YouTube auto-captions are error-prone `[Unverified]`. |
| Caption style | ≤ 2 lines, ≤ ~42 characters per line, ≥ 1 s on screen, white on 60% black box | `[Unverified: common subtitle style guides]` |
| Audio | Voice-over first. Music ducked well under the VO. Normalize the mix (YouTube normalizes playback loudness to roughly −14 LUFS `[Unverified]`). | Clear speech beats music |
| Photosensitivity | **No strobe or lightning flashes > 3/s** | WCAG 2.3.1 applies to video too |
| On-screen honesty | A permanent "REPLAY · real data from {storm}" label on all replay footage; "Live data, {date}" on live footage | Claims Ledger |

### 8.2 Capture setup

1. **Demo build flags** (the app must implement these; see §11 REQ-DEMO):
   - `DEMO_MODE=1`:
     - Hide dev overlays.
     - Show `DemoTouchOverlay`: a 44 pt translucent white circle at each touch, fading over 300 ms. Implemented with `onTouchStart/Move/End` on a root `View` with `pointerEvents="box-none"`, rendered above everything. **Never shipped enabled.**
     - Pin Storm Replay to a deterministic start time.
     - Lock the clock display.
   - Seed data: the bundled replay plus one "calm live" snapshot fallback.
2. **Android capture:**
   - `scrcpy --show-touches --stay-awake --no-audio --record=take01.mp4`. `--show-touches` shows physical touches; `--stay-awake` only works while charging `[Verified: github.com/Genymobile/scrcpy doc/device.md, doc/recording.md]`.
   - Clean the status bar: full battery, no notifications, Do Not Disturb on.
3. **iOS capture:**
   - QuickTime Player (Mac) → New Movie Recording → choose the iPhone as the camera, or use Control Center Screen Recording. Use the in-app `DemoTouchOverlay` for touches `[Unverified: no native iOS touch indicators]`.
   - Clean status bar.
4. **VoiceOver segment:** record with audio so the judge *hears* VoiceOver read the Crossing Card. Captions show what VoiceOver says.
5. **Spanish segment:** switch the language live (5 s), then show a spoken Spanish alert with captions.

### 8.3 Tools (free first)

| Need | Recommendation | Runner-up | Tag |
|---|---|---|---|
| Edit | **DaVinci Resolve** (free): timeline, Fusion/Text+ titles, subtitle track, Fairlight audio | **CapCut** desktop (fast auto-captions, templates; check ToS for school use) | `[Unverified: current features/licensing]` |
| Kinetic typography | **Keynote "Magic Move" exported as a movie** (simplest high-quality option on Mac/iPad), or Resolve Text+ | Canva video | `[Unverified]` |
| Device frames | Apple Design Resources product bezels (check the usage terms), or Figma community frames | Rotato (paid, 3D mockups), Screen Studio (paid, Mac) | `[Unverified]` |
| Architecture animation | Animated SVG/Keynote of gauges → river graph → travel time → risk → phone | Resolve Fusion | — |
| Music | **YouTube Audio Library** (YouTube Studio). Prefer tracks marked "no attribution required" and copy any required attribution into the description. | No music: ambient rain bed recorded yourself | `[Unverified: license terms per track]` |
| B-roll | Your own safe footage: rain on a windshield in a parked car, a **dry** low-water crossing in daylight with its depth-marker post, a creek at normal flow. NOAA/USGS public-domain media; Pexels/Pixabay. | — | Never film near floodwater (concept doc) |

### 8.4 Ethics of footage

- **No filming near active floodwater**, no reenactments in water, no driving stunts.
- **July 2025:** acknowledge with text only and respect. No rescue or victim footage, no names. No sensational music under those stats.
- Logos: no NWS/City/USGS logos as endorsements. Attribution text only.
- People on camera (classmates/testers): get written permission (a parent's for minors).

### 8.5 Shot list (tightened v4 script, ~2:20)

| Time | Segment | Visual | VO / on-screen text |
|---|---|---|---|
| 0:00–0:08 | Hook | Night windshield, rain (own safe footage). Kinetic: **"TEXAS — #1 IN U.S. FLOOD DEATHS"** (small: 1959–2019) | "In Central Texas, the most dangerous part of a flood isn't the river. It's the road." |
| 0:08–0:22 | Problem | "1,069 deaths" → "Over half of flood drownings: someone driving into water" → a generic map app routing toward a crossing | "Every app I found tells you a crossing is closed *after* the water's over it." |
| 0:22–0:30 | Intro | Logo + "Know before it crosses." Student on camera, 3 s (optional) | "I'm [NAME], a 9th grader in [CITY]. This is FordCast." |
| 0:30–1:15 | **Storm Replay proof** | Device frame + map. Banner "REPLAY · real data". 60× playback, slowing to 4× at key moments. The upstream sparkline climbs; a cyan pulse travels down the creek; Watch → Avoid; the card shows "likely flooded within 15–30 min"; the white "water over road (sensor)" marker appears. Kinetic text: **"[X] MINUTES EARLIER"**. Then the results tile: **median [m] min · POD [p]% · FAR [f]% across [n] storms**. | "This is real data from a real storm, replayed… Across [n] storms, the median head start was [m] minutes." **Honesty line if X is the best case:** "This was my best example; the median was [m]." |
| 1:15–1:40 | The app, live | Today's live map (calm-day state looks good). Check My Drive detour. Drive Mode spoken alert. | "Check your drive before you leave. In Drive Mode it speaks up, so your eyes stay on the road." |
| 1:40–1:52 | Inclusion | Language switch → Spanish spoken alert (captioned). VoiceOver reads the card. Grayscale/CVD 4-up still. | "En español también. It works with VoiceOver, and no warning relies on color alone." |
| 1:52–2:08 | How it works | Animated pipeline. Small results table. | "Under the hood: USGS river-network tracing, travel times learned by cross-correlating past storms, and a replay engine that can't peek at the future." |
| 2:08–2:20 | Vision + impact | (Quote from an official, if permission was received.) Rainy road; car turns around. End card: "Turn around. Don't drown. Know before it crosses." Plus sources, attributions and the repo URL. | "In a flood, minutes are everything. FordCast gives them back, starting here in Flash Flood Alley." |

### 8.6 Making Storm Replay compelling (and honest)

- Pick the crossing with the best ground truth: a sensor at the road gives exact "water over road" timestamps (concept doc §2). Show the **median as well as the best** example.
- **Split screen:** map on the left. On the right, the "lag pair" hydrograph (upstream vs at-road) with the dashed "≈ 38 min travel" connector (design.md §5). The judge *sees* the travel time.
- **Timeline markers:** ▲ Watch issued, ◆ Avoid issued, ● water over road, ▮ official closure (if known). Then the kinetic lead-time number.
- **A "no lookahead" moment (3 s):** an on-screen badge, "Replay sees only data available at that minute." This is a code credibility point for judges.
- Slow to 1–4× around the escalation. Use a constant 60× elsewhere, with a visible clock HUD.

### 8.7 Upload checklist

- [ ] Final export, plus a 4K master backup.
- [ ] Unlisted upload. Description: one paragraph, sources, repo link, data attributions, music credit.
- [ ] EN + ES SRT uploaded, and spot-checked against the audio.
- [ ] Logged-out playback test on a phone and a laptop.
- [ ] No Content ID claim notice in YouTube Studio.
- [ ] Link pasted into the CAC form, the README and the repo About.

---

## 9. Evidence of impact (outreach, user testing, citations)

### 9.1 Who to contact (all `[Unverified]`; find the current channel on each official site)

| Org | Why | How to find the right person |
|---|---|---|
| **City of Austin Watershed Protection Dept.** (Flood Safety / Flood Early Warning System; ATXfloods) | Crossing ground truth; **permission to display ATXfloods status**; historic closure timestamps; wording feedback | austintexas.gov → Watershed Protection → Flood Safety contact; or **Austin 3-1-1** (dial 3-1-1, or the Austin 311 app) and ask to be routed to Flood Safety / ATXfloods. The dataset owner contact is on data.austintexas.gov ("Low Water Crossings That Flood"). |
| **Travis County Transportation & Natural Resources (TNR)** | County-road low-water crossings and barricade operations | traviscountytx.gov → TNR → contact / Road & Bridge |
| **Austin-Travis County Homeland Security & Emergency Management (HSEM)** / Ready Central Texas | Public warning practice; the "never safe" wording review | ATC HSEM website contact form; social media |
| **NWS Austin/San Antonio office (WFO EWX, New Braunfels)**: ask for the **Warning Coordination Meteorologist** | Spanish product terminology; the TADD wording check; flood-impact stages for crossings | weather.gov/ewx → "Contact Us". Public social accounts. |
| USGS (Texas water science office in Austin) | Gauge latency and data-use questions | usgs.gov → Texas water science center contact |
| A teacher (CS or Spanish) + driver-ed instructor | Spanish review; teen-driver testing | In person at school |

### 9.2 Email template (send **Oct 15–16**; cc a parent or teacher)

> **Subject:** Student flood-safety app: 10-minute feedback request (Congressional App Challenge)
>
> Hello [Name],
>
> I'm [First Last], a 9th grader at [School] in [City]. For the Congressional App Challenge, I'm building **FordCast**, a prototype that uses upstream USGS stream gauges to forecast which low-water crossings may flood in the next ~90 minutes. It **never tells drivers a crossing is safe**, and **official closures always override it**.
>
> Could I get your feedback (a short email reply or a 10-minute call) on three questions?
> 1. Does the warning wording (attached, one page) fit how your office talks to the public about crossings?
> 2. [City only] Is historic ATXfloods/FEWS crossing status available for research, and may an educational app display current official status with attribution?
> 3. What would make a tool like this genuinely useful, or harmful, for drivers or your crews?
>
> 2-minute demo (unlisted): [link] · Code: [GitHub link]
>
> If you're comfortable with it, may I quote your reply with your name and title in my submission? It's completely fine to say no, or to give feedback without being quoted.
>
> Thank you for keeping Central Texas safe,
> [Name] · [School] · cc: [Parent/Teacher]

Attach: a one-page PDF with the state ladder, the wording bank excerpt (EN/ES), and 3 screenshots.

### 9.3 How to cite feedback

- **Only with explicit written permission:** "Feedback quoted with permission: [Name], [Title], [Org], personal communication, [date]."
- Never imply endorsement. Use "reviewed by" only if they agree to that phrase. Otherwise: "I received feedback from…".
- **No reply = no claim.** You may say "I contacted the City of Austin Flood Safety office", which is factual.
- Store the emails in `docs/impact/` (redact contact details in the public repo).

### 9.4 Comprehension and usability test (n = 8; 2 evenings)

- **Participants:**
  - 4 licensed or permit-holding teens.
  - 2 adults.
  - **≥ 2 Spanish-dominant** speakers.
  - Ideally 1 screen-reader or low-vision user.
  - Get parental consent for minors. Use a simple consent script. No personal data is recorded.
- **Tasks** (time each; record success):
  1. "Find the status of [crossing]."
  2. "Is it OK to drive through [Watch crossing] right now? What would you do?"
  3. "Plan a drive from A to B." (Check My Drive)
  4. "Show me how early FordCast warned in the 2015 storm." (Replay)
  5. "Switch to Spanish." (or English)
- **Key comprehension probe** (shown each state's chip and card): **"Is this crossing safe?"**
  - Correct: "the app doesn't say it's safe / I should check / avoid".
  - Target: **0 participants read "No rise detected" as "safe"**. If anyone does, revise the copy and re-test.
- **Measures:** task success %, time on task, SUS (System Usability Scale, 10 items) `[Unverified: standard instrument]`, and one open question.
- **Report** in the README ("8 testers, 95% task success, SUS 84, 0/8 read the calm state as 'safe'") using the **real numbers only**.

---

## 10. README and repo hygiene (judge-first)

### 10.1 README outline (top to bottom)

1. **Hero:** logo, name, tagline. **One GIF** (Storm Replay escalation, ≤ 8 MB). Badges: CI, license, platforms.
2. **Links row:** ▶ 2-min demo video · ⬇ Android APK (GitHub Release) · iOS (TestFlight on request) · Status of the live backend.
3. **The problem:** 3 stats with footnote sources (concept doc S1–S3).
4. **What FordCast does:** 3 bullets plus the state ladder image (No rise → Watch → Avoid → Closed; Unknown).
5. **Results:** the backtest table (storm, crossings, POD, FAR, CSI, median lead), generated from `backtest/results.json` by `make backtest`. Methodology in 5 bullets: event split, no-lookahead test, baseline vs ML.
6. **Built / Prototype / Roadmap** table, which must match the Claims Ledger.
7. **How it works:** a Mermaid architecture diagram (renders on GitHub) plus a 6-step explanation.
8. **Screenshots:** EN + ES; Drive Mode; VoiceOver; the CVD 4-up.
9. **Safety design:** the never-safe principle, states, disclaimers, official override, alert policy.
10. **Accessibility:** the features, plus a test-results table (device, OS, setting, pass) linking `docs/a11y/TESTING.md`.
11. **Privacy:** the data map summary and a link to the policy.
12. **Data sources and attribution/licenses:** see hydro.md §10.
13. **Run it yourself:**
    - Prerequisites. Exact commands for `make setup`, `make backtest`, `make api`, `npx expo start` / dev build.
    - Env vars listed in `.env.example`.
    - **Offline replay works with zero keys.**
14. **Repo map:** folders explained in one line each.
15. **Testing:** unit tests, the no-lookahead test, the copy/banned-words test, a11y tests.
16. **AI use** (summary + link to `AI_USE.md`).
17. **What I learned / challenges:** student-written.
18. **Acknowledgments:** testers, reviewers (with permission), data providers.
19. **License:** **MIT** for code. Data stays under its sources' terms. Docs and images CC BY 4.0 (optional).

### 10.2 Repo practices

- **History:**
  - Commit at least daily, with small commits and clear messages (`feat(replay): no-lookahead guard + test`).
  - **Don't squash before judging.**
  - Agent commits carry a `Co-authored-by` trailer.
- **Tag** `cac-2026-submission`, and create a GitHub Release with the APK, a checksum, and the backtest results attached.
- **CI** (GitHub Actions) on every push:
  - lint + typecheck
  - JS tests (RNTL)
  - Python tests (pytest)
  - backtest smoke run on one storm
  - i18n key-parity + banned-words test
- **Secrets:**
  - `.env` git-ignored; ship `.env.example`.
  - Use EAS/GitHub secrets.
  - Scan the history before making the repo public.
- **Files:** `LICENSE`, `AI_USE.md`, `PRIVACY.md` (+ `PRIVACY.es.md`), `docs/a11y/TESTING.md`, `docs/learning/*.md`, `docs/impact/`, `submission/` (answers drafts, checklist, rules notes), `CHANGELOG.md`.
- **Notebooks:** keep the data-exploration notebooks (they prove real work) with cleared large outputs. Key figures are exported to `docs/figures/`.
- **Issues and milestones:** MVP / Stretch / Roadmap milestones, with the roadmap items as open issues. That shows planning.

---

## 11. Requirements for the master prompt (paste-ready)

Format: **ID · MUST/SHOULD · requirement → acceptance test**. Tier is MVP unless marked.

### CAC and integrity
- **REQ-CAC-01 · MUST** · Every claim in the app, README or video maps to code or data; tier labels Built/Prototype/Roadmap are used everywhere. → README table matches the Claims Ledger; reviewer spot-check passes.
- **REQ-CAC-02 · MUST** · All result numbers are generated by `make backtest` into `backtest/results.json`. UI and README read from it. Never hand-type a number; leave `[X]` until it exists. → grep finds no hard-coded metric literals in the UI.
- **REQ-CAC-03 · MUST** · `AI_USE.md` + `Co-authored-by` trailers on agent commits + `docs/learning/<module>.md` explain-backs with 3 student questions each. → files exist for all core modules.
- **REQ-CAC-04 · MUST** · The four core files (travel time, baseline rule, metrics, DataSource) are student-written or student-annotated. The agent works in tutor mode for them. → `AI_USE.md` states authorship per file.
- **REQ-CAC-05 · MUST** · Storm Replay runs fully offline from bundled data. → airplane-mode test passes.
- **REQ-CAC-06 · MUST** · `submission/` holds the checklist (§2.5), rules notes, and Q1–Q4 drafts in the student's voice. The tag `cac-2026-submission` exists.

### Accessibility
- **REQ-A11Y-01 · MUST** · Every interactive element has a role, a label that **starts with its visible text**, state/value where relevant, and a target ≥ 48 pt (Drive Mode ≥ 76). → RNTL `getByRole(..., {name})` tests for all primary controls.
- **REQ-A11Y-02 · MUST** · The map always has a List alternative, and every crossing's status is reachable without the map. → VoiceOver task (b) passes with screen curtain on.
- **REQ-A11Y-03 · MUST** · Status = shape + glyph + word + color. Red markers carry a rim. Avoid text uses `#FF5470` at ≥ 18 pt semibold+. HC token set applies under Increase Contrast / High Text Contrast. → Grayscale walkthrough passes; the CVD 4-up renders are generated.
- **REQ-A11Y-04 · MUST** · `useA11yPrefs()` is the single source for preferences (screen reader, reduce motion, bold, transparency, contrast, grayscale). `ReducedMotionConfig` is driven by it, **not** by Reanimated `useReducedMotion()` alone. → toggling Reduce Motion while the app runs stops the loops without a restart.
- **REQ-A11Y-05 · MUST** · Loops stop after 3 cycles or 6 s. An in-app Animations toggle exists. No flashing > 3/s. → manual check.
- **REQ-A11Y-06 · MUST** · Text scales without a cap for body/status text. Layouts stack at fontScale ≥ 1.35 and become single-column at ≥ 2.0. No truncated status words or windows. → screenshots at AX5 and Android 200% in `docs/a11y/`.
- **REQ-A11Y-07 · MUST** · Announcements follow the §3.4 table, rate-limited, with no announcement on background refresh. → VoiceOver/TalkBack test.
- **REQ-A11Y-08 · MUST** · The Replay scrubber is `adjustable` with ±5 min buttons. The sheet has a grabber button. All gestures have button alternatives. → Switch Control/Switch Access completes all 5 tasks.
- **REQ-A11Y-09 · MUST** · Charts have a text alternative (summary label + "Show readings" list).
- **REQ-A11Y-10 · SHOULD** · `@react-native-ama/core` `AMAProvider` in dev builds only, plus `docs/a11y/TESTING.md` with the device matrix (§3.10).
- **REQ-A11Y-11 · SHOULD** · Orientation not locked. Map and Drive Mode usable in landscape.

### Spanish / i18n
- **REQ-I18N-01 · MUST** · i18next + react-i18next + expo-localization + `import 'intl-pluralrules'` first. `es` keys include `_one/_many/_other`. → `Intl.PluralRules` exists on Hermes at runtime; key-parity CI passes.
- **REQ-I18N-02 · MUST** · 100% of UI strings, notifications (server templates), TTS, a11y labels, permission prompts (`locales` in app.json) and the privacy policy exist in EN and ES. → CI parity test; a manual walkthrough in ES.
- **REQ-I18N-03 · MUST** · Separate `*_spoken` keys. TTS and a11y never receive "–", "min" or "ft" abbreviations.
- **REQ-I18N-04 · MUST** · Format with `es-US` / `en-US`, timeZone `America/Chicago`. No dependence on `RelativeTimeFormat`, `ListFormat`, or `NumberFormat` `style:'unit'`.
- **REQ-I18N-05 · MUST** · Voice selection algorithm (§4.5) with fallback. `AppText` sets `accessibilityLanguage` on iOS.
- **REQ-I18N-06 · MUST** · NWS products are shown with the English official name + Spanish gloss (§4.4). FordCast Watch = "Precaución" (pending the user's decision; design.md used "Vigilancia").
- **REQ-I18N-07 · SHOULD** · Per-app language via the `supportedLocales` plugin option + an in-app picker.

### Safety messaging
- **REQ-SAFE-01 · MUST** · All copy comes from the §6.3 wording bank. The banned-words CI test covers app and server templates.
- **REQ-SAFE-02 · MUST** · Ranges only (rounded to 5, width ≥ 15). lo ≤ 0 → "may already be on the road". Never single-number countdowns.
- **REQ-SAFE-03 · MUST** · Source label on every status. Official Closed overrides and is labeled OFFICIAL. Unknown on stale or missing data.
- **REQ-SAFE-04 · MUST** · Onboarding pledge, persistent footer, About→Legal, and attribution (§6.4).
- **REQ-SAFE-05 · MUST** · Alert policy (§6.6): escalation-only pushes, limits, hysteresis (3 cycles), Watch push opt-in, de-escalation wording without "safe/clear".
- **REQ-SAFE-06 · MUST** · Haptics are semantic. `Success` is never used for crossings.
- **REQ-SAFE-07 · SHOULD** · A "How accurate is FordCast?" screen showing POD/FAR/median lead/n storms from `results.json`, plus "Why?" evidence on every Watch/Avoid.

### Driving
- **REQ-DRIVE-01 · MUST** · Drive Mode: one decision per screen, ≥ 32 pt status, ≥ 76 pt targets, voice-first, keep-awake, no gestures on the map, no text entry.
- **REQ-DRIVE-02 · MUST** · Motion lock: speed ≥ 4.5 m/s for 5 s locks text entry and browsing outside Drive Mode. Passenger override uses hold-to-confirm (§5.3), per trip, with an a11y action alternative.
- **REQ-DRIVE-03 · MUST** · iOS `interruptionLevel`: Avoid/Closed time-sensitive, Watch active, updates passive. Android channels per §5.4. No full-screen intents. No DND bypass.
- **REQ-DRIVE-04 · MUST** · Onboarding states that alerts can be minutes late and coverage is partial. A Settings deep link helps allow Time Sensitive notifications under Focus.
- **REQ-DRIVE-05 · SHOULD** · Magic tap (iOS) = repeat the last alert. A big "Repeat" button on Android.

### Privacy
- **REQ-PRIV-01 · MUST** · No accounts, analytics or ads. Location and saved places stay on the device. The server receives crossing IDs + push token + language only.
- **REQ-PRIV-02 · MUST** · Routing and geocoding proxy endpoints never log bodies or coordinates. Error reports are scrubbed.
- **REQ-PRIV-03 · MUST** · An in-app "Delete my alert data" button. Server auto-delete after 90 days inactive.
- **REQ-PRIV-04 · MUST** · `PRIVACY.md` + `PRIVACY.es.md` (§7.2), linked in Settings and the README.
- **REQ-PRIV-05 · SHOULD** · Pre-filled store label drafts (§7.4) in `docs/store/`, in case the app is published later.

### Demo
- **REQ-DEMO-01 · MUST** · `DEMO_MODE` flag: touch overlay, deterministic replay start, clean UI. It is compile-time/env gated so it can't ship enabled.
- **REQ-DEMO-02 · MUST** · Replay UI: a permanent REPLAY banner, a clock HUD, speed control (1×/4×/60×), event markers (▲◆●▮), a lag-pair hydrograph, and a results tile with the median and an honesty line.
- **REQ-DEMO-03 · SHOULD** · `scripts/cvd_screens.py` and a screenshot script producing the README images (EN/ES, dark, AX5).

### Repo
- **REQ-REPO-01 · MUST** · README per §10.1. CI per §10.2. MIT license. Data attributions. `.env.example`.
- **REQ-REPO-02 · MUST** · Mermaid architecture diagram. `make` targets for `setup`, `backtest`, `api` and `test`.

---

## 12. Manual verification list (the student must check these; ~45 min)

| # | Item | Where to check | Used in |
|---|---|---|---|
| 1 | CAC deadline/time zone, eligibility, team rules, one-entry rule, work window, video length, code format, **AI policy**, parent consent | congressionalappchallenge.us → Students → Rules / FAQ; the TX-10 office CAC page | §2.1, `AI_USE.md` |
| 2 | Your district, and that the office participates in 2026 | house.gov "Find Your Representative"; CAC district list | §2.1 |
| 3 | NWS TADD wording (6 in / 12 in / 2 ft) and "never safe" phrasing | weather.gov/safety/flood-turn-around-dont-drown | §6.1 |
| 4 | Current NWS Spanish names for Flash Flood Warning/Watch/Advisory | Email NWS EWX, or weather.gov Spanish safety pages | §4.4 |
| 5 | Census Spanish-at-home share (Travis, Austin) | data.census.gov table S1601 (or the API URL in §4.1) | §4.1, video, Q3 |
| 6 | NHTSA 2 s / 12 s and the lockout list | Federal Register, Apr 26 2013 (NHTSA-2010-0053), or nhtsa.gov | §5.1 |
| 7 | iOS Driving Focus + Time Sensitive behavior | On device (test push) | §5.4 |
| 8 | TTS plays with the silent switch on; the Spanish voice is available | On device | §3.8, §4.5 |
| 9 | TalkBack pronunciation with app=ES, system=EN | On device | §4.5 |
| 10 | COPPA scope; Texas SB 2420 status | ftc.gov COPPA FAQ; a Texas news or legal source | §7.3 |
| 11 | YouTube Audio Library track license | YouTube Studio → Audio Library | §8.3 |
| 12 | City/County/NWS contact channels | Official sites (§9.1) | §9 |
| 13 | Research citations in §6.5 (titles, years, venues) | Google Scholar | README "Design research" |
| 14 | ATXfloods data-use permission | City reply (§9.2 Q2) | Official status display |

---

## 13. Sources

**Fetched today (verified):**
- Apple HIG, Accessibility (JSON): https://developer.apple.com/tutorials/data/design/human-interface-guidelines/accessibility.json
- Apple HIG, Typography / Dynamic Type sizes (JSON): https://developer.apple.com/tutorials/data/design/human-interface-guidelines/typography.json
- Apple HIG, Managing notifications (JSON): https://developer.apple.com/tutorials/data/design/human-interface-guidelines/managing-notifications.json
- Apple, `UNNotificationInterruptionLevel.timeSensitive` (JSON): https://developer.apple.com/tutorials/data/documentation/usernotifications/unnotificationinterruptionlevel/timesensitive.json
- Apple, Accessibility Nutrition Labels overview: https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels
- Apple, evaluation criteria for Sufficient Contrast, Larger Text, Differentiate Without Color Alone, Reduced Motion and VoiceOver: https://developer.apple.com/help/app-store-connect/manage-app-accessibility/ (`sufficient-contrast-evaluation-criteria`, `larger-text-evaluation-criteria`, `differentiate-without-color-alone-evaluation-criteria`, `reduced-motion-evaluation-criteria`, `voiceover-evaluation-criteria`)
- Apple, Accessibility Inspector (JSON): https://developer.apple.com/tutorials/data/documentation/accessibility/accessibility-inspector.json
- Apple, Performing accessibility testing for your app (JSON): https://developer.apple.com/tutorials/data/documentation/accessibility/performing-accessibility-testing-for-your-app.json
- Apple, App Store Review Guidelines (1.3, 1.4.1, 1.4.4, 1.4.5, 2.5.4, 4.5.4, 5.1.1, 5.1.2, 5.1.5): https://developer.apple.com/app-store/review/guidelines/
- Apple, App privacy details: https://developer.apple.com/app-store/app-privacy-details/
- Android, Make apps more accessible: https://developer.android.com/guide/topics/ui/accessibility/apps
- Android, Test your app's accessibility: https://developer.android.com/guide/topics/ui/accessibility/testing
- Android 14 features (nonlinear font scaling to 200%): https://developer.android.com/about/versions/14/features
- Android 14 behavior changes (full-screen intents): https://developer.android.com/about/versions/14/behavior-changes-14
- Android notification runtime permission: https://developer.android.com/develop/ui/views/notifications/notification-permission
- Android geofencing (100 per app; latency): https://developer.android.com/develop/sensors-and-location/location/geofencing
- React Native accessibility docs (main): https://raw.githubusercontent.com/facebook/react-native-website/main/docs/accessibility.md
- React Native AccessibilityInfo docs: https://raw.githubusercontent.com/facebook/react-native-website/main/docs/accessibilityinfo.md
- React Native Text docs: https://raw.githubusercontent.com/facebook/react-native-website/main/docs/text.md
- React Native 0.86.3 package types (`npm pack react-native@0.86.3`): `Libraries/Components/AccessibilityInfo/AccessibilityInfo.d.ts`, `Libraries/Components/View/ViewAccessibility.d.ts`, `Libraries/Text/Text.d.ts`
- Hermes Intl APIs: https://raw.githubusercontent.com/facebook/hermes/main/doc/IntlAPIs.md
- i18next plurals: https://raw.githubusercontent.com/i18next/i18next-gitbook/master/translation-function/plurals.md
- WCAG 2.2 SC sources: https://raw.githubusercontent.com/w3c/wcag/main/guidelines/sc/22/target-size-minimum.html, `…/dragging-movements.html`, `…/focus-not-obscured-minimum.html`; https://raw.githubusercontent.com/w3c/wcag/main/understanding/22/target-size-minimum.html
- AMA (Accessible Mobile App): https://raw.githubusercontent.com/FormidableLabs/react-native-ama/main/README.md
- scrcpy docs: https://raw.githubusercontent.com/Genymobile/scrcpy/master/doc/recording.md, https://raw.githubusercontent.com/Genymobile/scrcpy/master/doc/device.md
- Expo docs (local clone of expo/expo @ d3bbf62): `docs/pages/guides/localization.mdx`, `docs/pages/versions/v57.0.0/sdk/localization.mdx`, `docs/pages/versions/v57.0.0/sdk/speech.mdx`, `docs/pages/guides/apple-privacy.mdx`
- Package types read: `expo-speech@57.0.3`, `expo-haptics@57.0.3`, `expo-notifications@57.0.22`, `expo-location` (SDK 57), `react-native-reanimated@4.5.1` (`useReducedMotion`, `ReducedMotionConfig`, `ReduceMotion`)
- npm view (2026-10-14): i18next 26.4.4, react-i18next 17.0.16, expo-localization 57.0.2, intl-pluralrules 2.0.1, @formatjs/intl-pluralrules 6.3.15, i18next-cli 1.75.3, eslint-plugin-react-native-a11y 3.5.1 (peer eslint ≤ 8), eslint-config-expo 57.0.2, @testing-library/react-native 14.1.0, @react-native-ama/core 1.2.1, expo-speech 57.0.3, expo-haptics 57.0.3, expo-audio 57.0.5, react-native 0.86.3
- Computations: `/tmp/claude-0/-home-user-Fordcast-CAC/608fe985-2ad7-54f1-8865-eca0e6597f76/scratchpad/scripts/{cvd_cac.py,red_search.py,hc.py}` (colorspacious 1.1.2 from PyPI, Machado 2009 CVD; CIEDE2000 validated against Sharma 2005); Node 22 `Intl` checks for es plurals and es-US formatting.

**Verified by sibling agents today (not re-fetched):** design.md (NHTSA 2 s/12 s via secondary sources; Android-for-Cars sizes; the "¡Dé la vuelta, no se ahogue!" slogan and trademark via weather.gov Spanish flyer; Spanish expansion), maps.md (time-sensitive entitlement, push field spelling, Expo Go limits), hydro.md (NWS API, Spanish alert context, licensing table), backend.md (crossing-ID subscriptions, 90-day deletion).

**Unverified (sources unreachable today; see §12):** CAC rules and judging criteria, NWS TADD wording and Spanish product names, the NHTSA lockout list, Census figures, COPPA/Texas law, agency contact channels, video-tool licensing, and all social-science citations in §6.5.
