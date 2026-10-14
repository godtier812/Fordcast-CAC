# FordCast — Master Build Prompt

> **Version 1 · written 2026-10-14 · for the Congressional App Challenge 2026 (deadline Mon Oct 26, 12:00 PM ET — submit by Oct 25)**
> Built from six verified research reports (UI/UX design, Expo stack and templates, maps and location, hydrology data, backend and ML, CAC/accessibility/safety) and the concept doc `FordCast_CAC_Submission.md`. Versions were checked against the npm and PyPI registries on 2026-10-14. Anything that couldn't be confirmed is marked **VERIFY BEFORE USE**.

---

## How to use this prompt *(for the human — read first)*

1. **Save this file in the repo** as `docs/MASTER_PROMPT.md`. Then open Claude Code at the repo root and say:
   > *"Read docs/MASTER_PROMPT.md completely. Then do §1 Step 0: ask me the Step 0 questions, and don't write code until I answer."*
2. **Don't paste it in pieces.** The sections cross-reference each other (§ numbers), and the safety rules in §3 apply everywhere.
3. **Work through it in order.** The agent builds **[MVP] → [Stretch] → [Roadmap]** in the §6 day-by-day plan. Each feature is listed only once, in §4, and is never claimed until its test passes (see the §44 Claims Ledger).
4. **Review checkpoints.** Expect the agent to pause at the end of each day in §6 and at the four "student-owned" core files (§39).

### What *you* (the student) must do — the agent can't do these
Calendar: Day 0 = Wed Oct 14 · Day 10 = Sat Oct 24 · **submit Day 11 = Sun Oct 25** · deadline Mon Oct 26, 12:00 PM ET (buffer only). §6 owns the schedule; this table mirrors it.

| When | Task | § |
|---|---|---|
| Day 0 | Answer the Step 0 questions (your devices, Mac, whether a parent can pay for Apple, optional modules); confirm your district at house.gov with your full address | §1.2, §38 |
| Day 0 | Create accounts (a parent owns any that require 18+ or a card): **Expo**, **Supabase** (project + public bucket `fordcast-public`), **Render** (web service from the repo), **GitHub** (repo + Actions secrets), **USGS Water Data API key** (free, instant: `https://api.waterdata.usgs.gov/signup/`), **OpenRouteService**, **Firebase** (FCM V1 key + `google-services.json` → EAS), **healthchecks.io** (2 checks), **UptimeRobot**, **Sentry**, **YouTube** (video). Optional: Stadia Maps, Apple Developer ($99), Socrata app token | §1.9, §24.2, §26 |
| Day 0 | Approve the app icon and splash concept | §15 |
| Day 0–1 | Look at ATXfloods in browser devtools and write down what you see. Don't scrape it; ask permission first | §16.20 (S10) |
| Day 1 | Ask a fluent adult to review the Spanish. Line up 8 testers (at least 2 Spanish speakers) and their consent forms | §35, §42 |
| Day 1–2 | Check every tier-A crossing snap on the map (notebook 01), decide near-duplicates, confirm overtop stages | §17 |
| Day 1–2 (Oct 15–16) | Send the outreach emails with the concept one-pager (wireframes, not screenshots). Follow up with real screenshots + the replay result on Oct 21–22 | §42 |
| Day 3–5 | **Write or co-write the four core files** (travel-time cross-correlation, baseline rule, backtest metrics, `DataSource` interface) and answer the explain-back questions. The agent scaffolds, tests and explains; you implement and can explain every line | §1.8, §39 |
| Day 1–7 | Manual fact checks (~45 min): CAC rules and AI policy, Turn Around Don't Drown depths, NWS Spanish product names, Census Spanish-speaker figure, NHTSA guidelines, COPPA/Texas age-law status, every citation | §38, §42 |
| Oct 20 | Upgrade Render to Starter (~$7/mo, needs a card) so judges never hit a cold start; cancel after Dec 31 | §43 |
| Day 8–9 evenings (Thu Oct 22, Fri Oct 23) | Run the 8-person comprehension test | §42 |
| Day 10 (Sat Oct 24) | Code freeze. Record the voice-over and demo video, upload to YouTube (unlisted unless your office says otherwise), write Q1–Q4 in **your own words** with **your real numbers** | §41, §38 |
| Oct 24 & 25 | Initial the Claims Ledger audit; tick every (S) item in §45 | §44, §45 |
| Day 11 (Sun Oct 25) | Tag `cac-2026-submission` and **submit** | §45 |
| Mondays, Nov–Dec | 10-minute dashboard check. Commit on Nov 10, Nov 30 and Dec 15 (+ Jan 4 only if judging runs into January) so scheduled jobs don't auto-disable | §43 |

**Money:** ~$17–21 total for Render Starter (Oct 20 → Dec 31). Everything else is a free tier. An Apple Developer account ($99/yr) is **optional**; it's needed only to test on a real iPhone.

### Honest scope note
This prompt contains **every** feature, as you asked. Twelve days is enough for the **MVP plus several Stretch items**, not everything. The prompt handles this two ways:
- **Order:** the core bridge (real data → forecast → map → Storm Replay → backtest numbers) is built first.
- **Integrity:** anything unfinished stays labeled *Roadmap*, never faked. That is what keeps your video, answers, and code credible to judges.

---

## Executive decision sheet *(one-page summary of every major choice; details in the § listed)*

| Area | Decision | Why | § |
|---|---|---|---|
| Safety rule | App **never says "safe."** States: **No rise detected · Watch · Avoid · Flooded – Closed · Unknown – data offline** (ES: Sin crecida detectada · Precaución · Evite · Inundado – Cerrado · Desconocido – sin datos). Times shown as ranges. Official closures override the model. Stale data → Unknown | A forecast app that makes people feel safer than they are would raise risk | §3 |
| Phone framework | **Expo SDK 57** (RN 0.86.3, React 19.2.3), frozen through judging; TypeScript strict | Latest stable; SDK 58 is in beta | §25 |
| Build path | **Android-first development build** (EAS free APK). iOS only with a paid account or Mac; Expo Go is optional | Push, background alerts, MapLibre and geofencing all need a dev build; iPhone Expo Go stops at SDK 54 | §26 |
| UI templates | **Expo default template (SDK 57)** + **React Native Reusables** components (shadcn-style, copied into the repo) on **NativeWind 4.2.7** + **gorhom bottom-sheet map example** + Expo `with-skia` / `with-maestro` examples | Premium look, fully restylable (we own the files), the stack AI agents know best | §12 |
| Look | Night-first dark UI (`#0E1726`). iOS 26 Liquid Glass only on floating controls; Material 3 cues on Android; **Inter** with tabular numbers | Most vehicle flood deaths happen at night; glass on content hurts legibility | §8–§10 |
| Status encoding | **Shape + glyph + word + color** (circle / triangle / octagon / striped octagon / dashed ring). Avoid red **`#FF5470`** (color-blind-verified fix) | Readable for color-blind users and in grayscale | §9 |
| Map | **MapLibre RN 11.5** + **OpenFreeMap** tiles + custom **"FordCast Night"** style; glowing creeks, pulsing at-risk markers, animated water wave | Free, no API key, full style control | §29 |
| Navigation | 4 native tabs (**Map · Drive · Replay · Alerts**) + Settings gear; persistent map sheet; crossing detail as a native form sheet | Two taps max to anything | §13, §28 |
| Gauges | **USGS Water Data OGC API v1** (never the legacy service — it degrades from Nov 16, 2026, during judging) | Keeps the app from breaking mid-judging | §16 |
| River network | **USGS NLDI** upstream tracing, precomputed | Finds the gauge truly upstream of each crossing | §17 |
| Forecast | Learned travel time (cross-correlation) + trigger-stage **baseline rule** (MVP) → calibrated gradient-boosted classifier (Stretch, only if it beats the rule) | Explainable, honest, testable | §18 |
| Proof | **Storm Replay** of real historic storms with a data-arrival latency model and no-lookahead tests; timelines bundled in the app (work in airplane mode) | Real numbers for the video; demo can't break | §19, §33 |
| Backend | **Python 3.13 + FastAPI on Render**; **Supabase** (Postgres + PostGIS + Realtime + Storage + pg_cron clock); static snapshot file as the primary read path | Free/cheap, stays alive through Dec 31 | §20–§22 |
| Alerts | Expo push keyed by **crossing ID** (no location stored on servers); geofences on the phone (iOS 20-region rotation) | Privacy + iOS limits | §23, §30–§31 |
| Routing | **OpenRouteService** avoid-polygons via the backend; hand-off to Google Maps / Apple Maps / Waze | Don't build a router; drivers keep their nav app | §32 |
| Accessibility | WCAG 2.2 AA + Apple's 7 accessibility-label criteria; VoiceOver/TalkBack; Spanish (es-US, usted); Drive Mode follows NHTSA distraction limits | Required for a public-safety app; strong judging signal | §34–§35 |
| Integrity | `AI_USE.md` disclosure; you write or co-write the 4 core files; explain-back docs; Claims Ledger | CAC judges score *your* coding; finalists get Q&A | §39, §44 |

---

## Table of contents

**Part 0** — How to use · Executive decision sheet · Contents
**Part A — Rules, product & plan**
§1 Agent operating rules · §2 Product brief · §3 Safety principle, state model & copy rules · §4 Complete feature catalog · §5 Repository layout · §6 Build plan Oct 14–26 · §7 Definition of Done
**Part B — Design & UI**
§8 Design principles & platform look · §9 Design tokens · §10 Typography, spacing, radii, elevation, glass, icons · §11 Motion, haptics & sound · §12 UI templates & component library · §13 Screen-by-screen specs · §14 Signature moments · §15 Notification, Live Activity, widget, icon & splash visuals
**Part C — Data bridge, science & backend**
§16 Data sources catalog · §17 Crossing inventory & gauge linking · §18 Forecast science · §19 Storm Replay engine · §20 Backend architecture & hosting · §21 Database schema · §22 REST API · §23 Push fan-out · §24 Backend security, privacy, observability, testing & CI
**Part D — Mobile engineering**
§25 Mobile stack & versions · §26 Build path · §27 Project config files · §28 App architecture · §29 Map implementation · §30 Location, geofencing, Drive Mode & voice · §31 Notifications, push, Live Activities & widgets · §32 Routing, geocoding & hand-off · §33 In-app Storm Replay player · §34 Accessibility implementation · §35 Localization implementation · §36 Testing, performance, error handling & release · §37 Gotchas
**Part E — Submission, integrity & operations**
§38 CAC compliance · §39 AI-use integrity & explain-back · §40 README & repo hygiene · §41 Demo video production · §42 Impact evidence · §43 Judging-window operations · §44 Claims Ledger · §45 Final acceptance checklist · Appendix: Sources

---
