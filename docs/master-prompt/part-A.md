# PART A — Rules, Product & Plan (§1–§7)

> Addressed to the AI coding agent. Read the whole master prompt (Part 0 → Appendix) before you write any code. Part A tells you **how to work**, **what FordCast is**, **the safety rules that override everything else**, **every feature with its tier and acceptance test**, **where every file goes**, **what to build on each day**, and **what "done" means**.
>
> **Precedence when two instructions conflict:** (1) the safety principle and copy rules in §3 → (2) the Executive decision sheet in Part 0 → (3) the specific § that owns the topic → (4) the research reports. If you still can't resolve a conflict, stop and ask the human (§1.7).

---

## §1. Agent operating rules

### 1.1 Before you start

1. **Read this entire prompt once, end to end.** Then re-read §1, §3, §4 and §6. Several rules (safety copy, honesty labels, no-lookahead, version pins) apply across every section, and they are stated once.
2. **Save the prompt in the repo** as `docs/MASTER_PROMPT.md` (if the human hasn't), and commit it as the first commit of the build: `docs: add master build prompt`.
3. **Do Step 0 (§1.2) before writing any code.** Don't scaffold, install or create cloud resources until the human has answered.
4. **Work in tier order.** Build every **[MVP]** item in the §6 day plan first, then **[Stretch]** items strictly in the **§6.4 Stretch queue** order (the only Stretch build order; §4 group order and the old "Stretch-1/2/3" tags are not an order), then **[Roadmap]** items only as documentation (designs, issues, README "planned" rows). Never start a Stretch item while an MVP item due the same day or earlier is still unfinished.
5. **Nothing is faked.** If something doesn't work yet, it stays labeled *Prototype* or *Roadmap* (§1.6). That rule beats every deadline.

### 1.2 Step 0 — questions to ask the human before coding

Ask these in **one message**, wait for the answers, then record them in `docs/decisions/step0.md` (commit it). Use the answers to pick a build lane (table below).

| # | Question | Why it matters | Default if the human doesn't know |
|---|---|---|---|
| 1 | Which **phones** do you have for testing? (Android model + Android version; iPhone model + iOS version) | Picks the build lane (§26) | Android phone or emulator |
| 2 | Do you have a **computer** that can run Android Studio (Windows/Linux/Mac)? Do you have a **Mac with Xcode ≥ 26.4**? | Emulator fallback; iOS local builds | Android Studio on the PC |
| 3 | Can a parent pay for an **Apple Developer Program** account ($99/yr)? | iPhone dev builds, iOS push, time-sensitive alerts, Live Activities | No → iOS = "compiles, untested" |
| 4 | Your **home district**: confirm with your home address at house.gov "Find Your Representative". Is the office participating in CAC 2026? What deadline and time zone does its CAC page list? | Travis County is split among TX-10/17/21/35/37; some offices use other dates | TX-10, Oct 26 12:00 PM ET — **unconfirmed until you check** |
| 5 | Have you read the **CAC rules page** (eligibility, video length, code-submission format, **AI-tool policy**)? Paste the AI policy text. | Goes verbatim into `AI_USE.md` (§39) | Treat AI use as "allowed with disclosure" and flag it as unverified |
| 6 | Which **crossings and storms matter to you personally**? (Your neighborhood crossing, your school route, a storm you remember: Oct 2013 Onion Creek, May 2015, Oct 2015, July 2025) | Picks the tier-A shortlist (§17) and the hero replay (§19); gives the video its personal hook (§41) | Onion Creek (US 183 + Driftwood) and Bull Creek |
| 7 | Your **name, school, city** as they should appear in the README, app About screen and video. A **project contact email** (not your personal email; a parent may co-manage it). | Attribution, privacy policy, User-Agent header for NWS/USGS | Placeholders `[NAME]`, `[SCHOOL]`, `[EMAIL]` |
| 8 | Your **GitHub username** and whether `godtier812/Fordcast-CAC` is (or will be) **public**. | App IDs, GitHub Actions free minutes, secret scanning, the judges' link, and **GitHub Pages for the privacy policy** (Pages needs a public repo on a free account; F106) | Public repo (making it public is still a stop-and-ask moment, §1.7 item 4) |
| 9 | Do you already have accounts for **Expo, Supabase, Render, healthchecks.io, UptimeRobot, OpenRouteService**, a **USGS Water Data API key**, and a **Firebase project** (needed for Android push credentials, FCM V1, uploaded to EAS)? Optional: Sentry, Stadia Maps, a Socrata app token. | Step 0 can't finish without keys (the full list of every key and where it lives is §1.9) | You create them on Day 0 with the human |
| 10 | Can you spend **~$17–21** for Render Starter from Oct 20 to Dec 31? | Judges never hit a cold start (§20, §43) | Free tier + documented cold-start risk |
| 11 | Who can review **Spanish** copy (a fluent adult, ideally a Spanish teacher)? Who can be in the **8-person comprehension test** (≥ 2 Spanish speakers; parental consent for minors)? | §35, §42 | Ask a teacher on Day 1 |
| 12 | How many **hours per day** can you give to the four student-owned core files (§39)? Do you prefer to **write them yourself** with hints, or **co-write** (agent drafts a skeleton, you implement and annotate)? | Schedules the pause points (§1.8) | Co-write, ~1.5 h per file |
| 13 | Commit style: may the agent commit **directly to `main`** in small green commits, or should it use short-lived branches merged with a **merge commit** (never squash)? | Judges read the history (§40) | Branches `dayNN/<topic>`, merge commits |
| 14 | **App icon and splash ("The Dip", §15.5–§15.7):** approve the agent's drafts, or give your own PNGs (icon, Android adaptive foreground + monochrome, notification icon, splash icon)? | Icons and splash are **native assets**: after the Day-1 dev build, any change needs a version bump and a new build (§26.6). The iOS `.icon` file needs Icon Composer on a Mac. | The agent draws them as SVG and exports PNGs with a script on Day 0; the human approves before the Day-1 build; the iOS `.icon` is made only if a Mac exists (otherwise the PNG icon is used) |
| 15+ | Every open-question line (a quote line starting `> OPEN QUESTION (ask in Step 0):`) found anywhere in `docs/MASTER_PROMPT.md` | Some later sections leave a real human decision open | The default written next to that question |

**Collecting open questions:** before you send the Step 0 message, run `grep -nE '^> OPEN QUESTION \(ask in Step 0\)' docs/MASTER_PROMPT.md` and append every hit, verbatim with its § and its default, as questions 15, 16, … in the same single message. Record each answer in `docs/decisions/step0.md` and apply it in the section that raised it.

**Decided defaults (state them in the Step 0 message; no answer is needed unless the human objects).** These are settled design decisions. They are listed here so nothing surprising is buried in a later section.

| # | Decision | Where it's specified |
|---|---|---|
| D1 | **Optional native modules in the Day-1 build:** include `lottie-react-native` (onboarding illustration) and `react-native-keyboard-controller` (search sheet keyboard handling). **Exclude** `expo-mesh-gradient` and `@react-native-ama/core`. Include `@sentry/react-native` **only if** a test EAS build succeeds **without** a `SENTRY_AUTH_TOKEN` (VERIFY BEFORE USE on Day 0–1); otherwise leave it out and F125 becomes Roadmap. Anything not in the Day-1 build can't be added later without a new native build (§6.2). | §25.4 (first-build install list), F125 |
| D2 | **Watch pushes are opt-in:** the device-level Watch toggle and every per-route/place `want_watch` default to **off**. Avoid/Closed pushes default to on once the user enables alerts. | §3.8, §23.1–§23.2 |
| D3 | **Quiet hours:** Watch, update and Unknown pushes are suppressed (never sent late); Avoid/Closed pushes **ignore** quiet hours for saved routes, saved places and saved crossings (night is the riskiest time). | §3.8, §23.3 |
| D4 | **De-escalation:** exactly **one** passive `update` push when a crossing that was pushed as an escalation reaches `no_rise`; step-downs (AVOID → WATCH, CLOSED → AVOID) send no push. | §3.8, §23.2 |
| D5 | **Android geofence cap:** 60 regions by default for battery (configurable up to the OS limit of 100); iOS 19 crossings + 1 re-rank fence. This deviates from the decision sheet's 100 and is recorded in `docs/decisions/`. | F70, §30.3 |
| D6 | **Replay data delay:** a gauge's measured live P75 latency once it has ≥ 50 samples, otherwise **60 min** (conservative). Measured values are frozen in `data/latency/gauge_latency.json` by `make latency`. | F75, §19.4 |
| D7 | **Replay speeds** 1× · 10× · 30× · 60× (default) · 120×; DEMO_MODE auto-slows to **10×** around key events. | F78, F83, §33.9 |
| D8 | **Orientation:** portrait everywhere for MVP; landscape (Map and Drive Mode) is Stretch F94. No WCAG 1.3.4 claim until F94 ships. | §8.7, F94, §44 |
| D9 | **Storm metadata** files are `meta.toml` (read with the standard library). | F4, §19.3 |
| D10 | **Bundled storms:** `halloween-2013`, `memorial-day-2015`, `halloween-2015`, `oct-2018` (calm control) and `july-2025` (USGS-only, honestly reported), each only if its data checks pass; plus the `calm-2024` calm-day set for false-alarm rates. | F4, §16.19 |

**Build-lane selection (record the lane in `docs/decisions/step0.md`):**

| Lane | When | What you build | iOS status |
|---|---|---|---|
| **A (default)** | Android phone *or* an Android emulator is available | Android **development build** first (EAS `development` APK or `npx expo run:android`), then `preview` APK for testers and judges | "Compiles, untested", iOS-only polish behind platform checks |
| **B** | Lane A **plus** a paid Apple account | Lane A + EAS internal iOS dev build; iOS push, `timeSensitive`, Live Activity become reachable Stretch items | Tested |
| **C** | Lane A **plus** a Mac, no paid account | Lane A + local iOS build with a free team (7-day provisioning, **no push**) for UI/a11y testing — VERIFY BEFORE USE: free-team limits on your Xcode version | UI-tested, no push |
| **D (contingency)** | The **only** device is an iPhone, **and** there is no Mac, no $99, and no PC that can run an Android emulator | **Stop and ask the human to confirm.** Then follow the SDK 54 lane in §26 (react-native-maps in App Store Expo Go; no MapLibre, no push, no background alerts) | Expo Go only |

### 1.3 Version and dependency discipline

1. **Expo SDK 57 is frozen through judging (Dec 31, 2026).** Never run `npx expo install expo@latest`, never accept an SDK 58 upgrade prompt, never bump React Native or React. SDK 58 is in beta and will replace SDK 57 in store Expo Go; that's one more reason the dev build is primary (§26).
2. **Native packages are installed only with `npx expo install <pkg>`**, which picks the SDK-57 pin. npm `latest` is newer than SDK 57 supports for Reanimated, Worklets, Gesture Handler, Skia, FlashList, react-native-maps and Sentry (§25 lists the exact pins). Pure-JS packages use the exact versions in §25.
3. **Check before you add.** Before adding any package not listed in §25 (mobile) or §20/§24 (backend), run `npm view <pkg> version peerDependencies time` or the PyPI JSON, and confirm it is ≥ 2 weeks old and compatible. If it isn't listed, **stop and ask** (§1.7).
4. **After every install batch** run `npx expo install --check` and `npx expo-doctor@latest`, and fix every finding before committing.
5. **Python:** two `uv` projects, each with its own committed `uv.lock` and `exclude-newer = "2026-09-30T00:00:00Z"`: `backend/` (the service and CLI; one override: `dataretrieval` → `2026-10-03`; §20.11) and `tools/` (repo scripts that need third-party packages such as Pillow or colorspacious; §5.3). Run tools with `uv run --project tools python tools/<script>.py` (or the `make` target, §5.2). Never `pip install` into either project, never add a tools dependency group to the backend project, and never run a tools script that imports a third-party package with bare `python3`.
6. **Front-load native modules.** Every native module the plan might need (MVP **and** Stretch) goes into the **first** dev build on Day 1 (§6). The exact list is the §25.4 install batches plus the decided optional modules (§1.2 D1). After that, days are JS-only and ship via EAS Update. A new native module after Day 1 is a stop-and-ask trigger.
7. **APIs you must never call:** legacy USGS `waterservices.usgs.gov` (slowdowns from Nov 16 2026, outages from Jan 27 2027, decommissioned Feb 22 2027) and `dataretrieval.nwis`. Use the USGS Water Data OGC API **v1** only (§16).
8. **Never invent** a package, endpoint, parameter, response field or version. Anything marked **VERIFY BEFORE USE** in this prompt must be confirmed with a live call or the package's shipped types before code depends on it, and the result is logged in `docs/data-bridge-verification.md` (data) or `docs/decisions/verifications.md` (code).

### 1.4 Working loop and commits

1. **Loop per task:** read the owning § → write/extend the test first where practical → implement → run the §7 gates locally → commit → update docs (§1.10).
2. **Commit small and often.** One logical change per commit, at least several commits per day, **across every day** of the build. Judges read the history; a history spread over days is evidence of real work.
3. **Message format:** Conventional Commits with a scope that matches the repo folder: `feat(replay): add no-lookahead guard + future-poison test`, `fix(mobile/map): keep max-rank cluster color`, `docs(explain): travel-time explain-back`. Agent-authored commits **must** end with the co-author trailer your harness requires (that is how `AI_USE.md` authorship is auditable). Student-authored commits are made from the student's own git identity with **no** agent trailer.
4. **Never** squash, rebase published history, force-push `main`, or delete branches with unmerged work before judging ends.
5. **CI must stay green on `main`.** If a commit breaks CI, the next commit fixes it before any new feature work.
6. **Daily devlog.** At the end of each §6 day, append 5–10 lines to `docs/devlog.md`: what became Built/Prototype, test status, numbers produced (with the command that produced them), blockers, and tomorrow's plan. Then post the same summary to the human and list the tasks only the student can do.

### 1.5 Data honesty rules

1. **No fabricated numbers.** Every metric shown in the app, README, video or answers comes from a committed script output: `make backtest` → `docs/results/results.json` (and the copies the build scripts place in the app). Until a number exists, leave the literal placeholder `[X]`, `[N]`, `[POD]`, `[FAR]`, `[CSI]`, `[m]`.
2. **No fake data presented as real.** Synthetic or mocked data may exist only in tests and fixtures (`__fixtures__/`, `tests/fixtures/`, cassettes) and is never shipped in the app bundle or shown on a screen. The demo on a calm day uses **Storm Replay** (always bannered REPLAY) or the honest calm state.
3. **No fabricated quotes, testimonials, partner logos, endorsements or user counts.** Outreach replies are quoted only with written permission (§42).
4. **Never tune on the test storm.** Thresholds, triggers and model choices are selected on training storms only; reported numbers are leave-one-storm-out (§18). If results look too good, run the no-lookahead tests (§19) before believing them.
5. **Report bad results honestly.** If the ML model doesn't beat the baseline rule, say so in the README and answers; that is a strong finding (§2, §18).

### 1.6 Built / Prototype / Roadmap labels

| Label | Meaning | Where it may appear |
|---|---|---|
| **Built** | Works end-to-end in the app on a **real phone** (or the stated platform) with **real live or real replayed data**, and its §4 "Done when" test has passed and is recorded | Video, README, answers, About screen — stated confidently |
| **Prototype** | Works on replayed storms only, on a subset of crossings, on one platform only, or in a notebook/CLI but not in the app | Always with the word "prototype" |
| **Roadmap** | Designed, not built (or built but not passing its test) | Always as "planned" / "next" |

- The single source of truth is the **Claims Ledger** in `docs/CLAIMS.md` (§44). `tools/gen_claims.py` turns it into `mobile/src/features/about/claims.generated.json`, which the About → "What's built" screen renders, so the app, README and video can't disagree.
- A label moves up **only** when the evidence (test output, device-test log entry, screenshot, airplane-mode log) is linked in the ledger row.
- Never claim "works offline", "reroutes you", "alerts in the background", "machine learning", "radar rainfall" or "Spanish" until the ledger row's test has passed **on a real phone** (§44).

### 1.7 Stop-and-ask triggers

Stop, explain the situation in ≤ 10 lines, propose options with a recommendation, and wait for the human when:

1. You would change the **meaning or wording** of a state, window rule, disclaimer, alert threshold or banned-word list (§3).
2. You would add a **native module** after the first dev build, upgrade any SDK/major version, or add an unlisted dependency.
3. Something **costs money** or needs a credit card (Render Starter, Apple account, Google Cloud billing, paid tiers).
4. You would **publish** anything: app stores, TestFlight, a public GitHub Release, making the repo public, turning on GitHub Pages, posting the video. (Do **not** publish to app stores before judging; §38.)
5. An action would **contact people** (emails, social posts, issues on other repos). The student sends outreach; you only draft it (§42).
6. A data source's **license or permission is unclear** — especially ATXfloods (no documented public API: ask the City, never scrape) and LCRA (§16).
7. A **VERIFY BEFORE USE** check fails, or a live API behaves differently from this prompt.
8. A **no-lookahead test fails**, a golden replay hash changes unexpectedly, or backtest numbers move by more than 10 points.
9. You reach a **student-owned core file** (§1.8).
10. An MVP item is going to miss its §6 day by more than half a day (propose cuts from the §6.3 cut order).
11. A **destructive** operation: dropping tables, deleting Storage objects, rewriting history, rotating keys.
12. Any **secret** may have been exposed (stop, rotate, then tell the human).
13. The CAC rules, district or deadline turn out different from this prompt.

### 1.8 Student-owned core files — pause points

CAC judges score the **student's** coding, and finalists are questioned in person. These four files are written **by the student** (or co-written: the student implements; you scaffold, hint, test and review). Full protocol in §39.

| # | File | What it does | Pause day (§6) |
|---|---|---|---|
| 1 | `backend/fordcast/linking/travel_time.py` | Travel time τ by cross-correlation of smoothed first differences with parabolic peak refinement | Day 3 |
| 2 | `backend/fordcast/model/baseline_rule.py` | Trigger stage + rate of rise → raw state + window | Day 4 |
| 3 | `backend/fordcast/scoring/metrics.py` | Event matching, POD / FAR / CSI, lead time, bootstrap CIs | Day 4 |
| 4 | `backend/fordcast/sources/base.py` | The `DataSource` protocol, `Reading` with `available_at`, `LookaheadError`, the no-lookahead guard | Day 5 |

**At each pause point you MUST, in this order:**
1. Commit the **failing tests** for the file (e.g. synthetic lags 35/40/45 min recovered within ±1 min; prefix-invariance; future-poison).
2. Commit a **skeleton** with typed signatures, docstrings and `TODO(student)` markers — no implementation.
3. Write the explain-back doc `docs/explain/<module>.md` (9th-grade reading level, one diagram, three questions the student answers underneath in their own words).
4. **Stop** and tell the human: "Student task: implement `<file>` until `uv run pytest tests/<test> -q` passes. Ask me for hints." Give hints only when asked; review the student's diff line by line when they finish.
5. Record authorship in `AI_USE.md` ("written by student", "co-written: agent skeleton + tests, student implementation", or — only if the human explicitly decides time forces it — "agent-written, student-annotated": the student then rewrites every docstring and inline comment in their own words and answers the three questions).

While you wait, continue with tasks that don't depend on that file (mobile UI, infrastructure). Never silently fill in a student file.

### 1.9 Secrets

1. Secrets live only in: `.env` files (git-ignored), Render environment variables, GitHub Actions secrets, EAS environment variables and EAS credentials, and Supabase Vault (`tick_url`, `tick_secret`). Nowhere else.
2. Commit **`.env.example`** files with every variable name and a placeholder (`backend/.env.example`, `mobile/.env.example`, plus `supabase/manual/vault_secrets.example.sql` for the two Vault entries). `.gitignore` covers `.env*` (except `*.example`), `google-services.json`, `GoogleService-Info.plist`, `*.p8`, `*.p12`, `*.jks`, `*.keystore` and any service-account `*.json` key file.
3. The phone app may contain **only** the `EXPO_PUBLIC_*` values in the table below: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY` (the `sb_publishable_…` key, safe with RLS), `EXPO_PUBLIC_API_BASE`, `EXPO_PUBLIC_DEMO_MODE`, and the optional `EXPO_PUBLIC_SENTRY_DSN` (a DSN is public by design). **Never** ship `sb_secret_…`, `DATABASE_URL`, `USGS_API_KEY`, `ORS_API_KEY`, `STADIA_KEY`, `EXPO_ACCESS_TOKEN`, `TICK_SECRET`, `ADMIN_SECRET`, `HC_PING_URL` or any server key in an `EXPO_PUBLIC_*` variable or a bundled file. Routing and geocoding go through the backend (§32). CI fails if `mobile/` contains `sb_secret_`, `X-Api-Key`, `ORS_`, `STADIA_` or `EXPO_ACCESS_TOKEN` (§24.9; the guard's own test file assembles these strings by concatenation so it doesn't match itself).

**Secrets and configuration inventory (complete; §24.2 carries the identical table).** "Get / rotate" says where the value comes from and how to replace it. Every rotation follows §1.7 item 12 if a leak is possible.

| Name | Kind | Lives in | Used by | Get / rotate |
|---|---|---|---|---|
| `DATABASE_URL` | secret | Render env; GitHub Actions secret (only for workflows that read the DB); local `backend/.env` (for `make latency`, `make seed-prod`, `make model-live`) | tick + API (Supavisor **transaction** pooler, port 6543); `psql` targets use the **session** pooler (port 5432) | Supabase → Connect. Rotate: reset the DB password, update Render, GitHub and `.env` |
| `SUPABASE_URL` | config (not secret) | Render env; GitHub Actions secret; local `backend/.env` | Storage uploads, admin calls | Supabase → Project Settings → API |
| `SUPABASE_SECRET_KEY` (`sb_secret_…`) | secret | Render env; GitHub Actions secret; local `backend/.env` (for `make data-upload`, `build_replays.py --upload`) | snapshot + replay + data uploads to Storage, admin | Supabase → API keys → create a new secret key, update every place, revoke the old one |
| `USGS_API_KEY` | secret | Render env; GitHub Actions secret (nightly contracts); local `backend/.env` (smoke, backfill) | ingest (`X-Api-Key`) | `https://api.waterdata.usgs.gov/signup/` (instant); rotate by requesting a new key |
| `PROJECT_CONTACT_EMAIL` | config | Render env; GitHub Actions secret; local `backend/.env` | `User-Agent` for USGS, NWS, NWPS (tick, nightly, smoke) | the project mailbox (Step 0 Q7); edit in all three places |
| `TICK_SECRET` | secret | Render env; Supabase Vault `tick_secret`; GitHub Actions secret | `pg_cron` → `/internal/tick`; `tick-backup.yml` | `python -c "import secrets;print(secrets.token_hex(32))"`. Rotate: `vault.update_secret` → Render → GitHub, in that order (a few failed ticks are expected) |
| `tick_url` | Vault entry | Supabase Vault | `pg_cron` (`https://<service>.onrender.com/internal/tick?source=pg_cron`) | `vault.update_secret` when the Render URL changes |
| `API_BASE` | config | GitHub Actions secret | `tick-backup.yml`, `nightly.yml` (no trailing slash) | the Render service URL |
| `ADMIN_SECRET` | secret | Render env; the student's password manager | admin endpoints and CLI | regenerate like `TICK_SECRET`; update Render |
| `EXPO_ACCESS_TOKEN` | secret | Render env; GitHub Actions secret (nightly receipts contract, S12) | push send + receipts (enhanced push security) | Expo → Account settings → Access tokens; revoke the old one |
| `HC_PING_URL` | secret-ish URL | Render env | heartbeat after each successful tick (`/fail` on error) | healthchecks.io check #1 |
| `HC_NIGHTLY_URL` | secret-ish URL | GitHub Actions secret | `nightly.yml` heartbeat | healthchecks.io check #2 |
| `SENTRY_DSN` | config (optional) | Render env | backend error reports | Sentry project settings |
| `ORS_API_KEY`, `STADIA_KEY` | secret (Stretch) | Render env; local `backend/.env` (smoke S11) | routing + search proxy | provider dashboards |
| `SOCRATA_APP_TOKEN` | secret (optional) | local `backend/.env` | inventory pull (City of Austin SODA3), smoke S7 | data.austintexas.gov profile → app tokens |
| `GOOGLE_SERVICES_JSON` | file secret | EAS environment variable of type **file**, visibility secret (VERIFY BEFORE USE: current `eas env:create` flags) | Android build (`android.googleServicesFile`, §27.3) | Firebase console → Android app `org.fordcast.app` → download `google-services.json`; never committed |
| FCM V1 service-account key | credential | EAS credentials (Android → FCM V1), uploaded with `npx eas-cli@latest credentials` | Expo push delivery to Android | Firebase → Project settings → Service accounts → new key; upload, then delete the local file |
| APNs key (Lane B only) | credential | EAS credentials (managed by EAS) | iOS push | regenerated by EAS on request |
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY` (`sb_publishable_…`), `EXPO_PUBLIC_API_BASE` | public by design | `mobile/.env` (local) + EAS environment variables (plaintext) | the app | a changed value needs a new build or an EAS Update |
| `EXPO_PUBLIC_DEMO_MODE` | public flag | `eas.json` profile `env` (`0`; `1` only in the `demo` profile) | DEMO_MODE (F83) | a build check fails if it is `1` in `preview`/`production` |
| `EXPO_PUBLIC_SENTRY_DSN` | public (optional) | `mobile/.env` + EAS env (plaintext) | app crash reports (F125) | Sentry project settings |
| `FORDCAST_IOS_PAID`, `FORDCAST_SENTRY` | build flags (not secret) | EAS environment variables / your shell | `app.config.ts` plugin switches (§27.3) | — |

Non-secret backend settings (`ENVIRONMENT`, `USGS_OGC_BASE`, `USGS_BBOX`, `NWS_UGC`, feature toggles, …) are listed in §20.12. There is **no** `SENTRY_AUTH_TOKEN` anywhere (§1.2 D1).
4. Never print secrets in logs, test output, cassettes (`filter_headers: ["X-Api-Key","Authorization"]`), screenshots or the devlog.
5. Before the repo is public (or now, if it already is): enable GitHub secret scanning and push protection (VERIFY BEFORE USE: availability in the repo's Settings → Code security), and scan the full history with `git log -p | grep -nE 'sb_secret_|X-Api-Key: [A-Za-z0-9]|ExponentPushToken\[|eyJ[A-Za-z0-9_-]{20,}'`. If anything matches, follow §1.7 item 12.
6. The backend loads settings with `pydantic-settings` and **fails fast at startup** if a required secret is missing.

### 1.10 Keep the docs in sync with reality

Whenever a feature changes status or a number is produced, update in the **same commit or the next one**:
- `docs/CLAIMS.md` (+ regenerate `claims.generated.json`),
- `README.md` Built/Prototype/Roadmap table and results table (generated from `results.json`, §40),
- **`FordCast_CAC_Submission.md`** (the concept doc; it is the source of the CAC answers). Keep its structure and voice, but make every statement true. Apply the **concept-doc sync checklist** below by the end of Day 10, then re-check it whenever a §44 claim changes status,
- `docs/explain/*.md` for any module whose behavior changed,
- `docs/architecture.md` (§5.4) when a component, data flow or secret location changes,
- `CHANGELOG.md` (after Oct 25, under "After submission").

**Concept-doc sync checklist (`FordCast_CAC_Submission.md`).** Each item names the stale statement and what replaces it. "Concept section N" means the concept doc's own numbering, not this prompt's §N. Commit as `docs(concept): sync with build` and tick the item in `docs/devlog.md`.

1. **State name.** "No current signal" → **"No rise detected"** / **"Sin crecida detectada"** everywhere: the concept section 1 safety-principle line (which becomes "No rise detected → Watch → Avoid → Flooded – Closed", plus "Unknown – data offline"), the concept section 2 color table, and the code excerpt (`Risk.NO_SIGNAL` → `NO_RISE`).
2. **Code excerpt (concept section 3).** Replace the whole "Simplified" block (`travel_time_minutes`, `assess`, `LiveUSGS`, `StormReplay`, `source.stage_series`, `asyncio.gather` per gauge) with **real, short excerpts from the repo**: the student's `linking/travel_time.py` core loop and the `tick()` signature + loop from `fordcast/tick.py` (§19.6), with file paths and line numbers. Rewrite step 4 of "The Solution": live ingest is **one** USGS `latest-continuous` request per tick for all gauges (§16.2), not concurrent per-gauge fetches. Name the real classes: `DataSource` with `LiveSource` and `StormReplaySource` (§19.1–§19.3).
3. **Architecture diagram (concept section 2).** Redraw to match §20: Supabase `pg_cron` → FastAPI `/internal/tick` (GitHub Actions watchdog as backup) → USGS → `tick()` → Postgres → `snapshots/current.json` on Supabase Storage (primary read path) + Realtime + Expo push → app. "Risk → P(flooded in 30/60/90m)" becomes "baseline rule → state + time range (ML: Stretch)". ATXfloods appears only as "official status (with permission)"; MRMS stays "(stretch)". Embed the same Mermaid diagram as the README (§5.4).
4. **Tech stack table (concept section 2).** App: **Expo SDK 57 + MapLibre RN 11.5 + OpenFreeMap "FordCast Night" style**; "Android development build (EAS APK); Expo Go optional" (delete "runs in Expo Go" and `react-native-maps`). Push: **Expo push + FCM V1 (MVP on Android; iOS push = Stretch, needs a paid Apple account)**. Prediction: baseline rule = MVP; ML = Stretch `HistGradientBoostingClassifier` (not XGBoost) kept only if it beats the rule. Routing: **Stretch**, through the backend (openrouteservice → Stadia fallback). Crossings: City of Austin `q6kt-v2zm`, Travis County, TxGIO and OSM inventories; ATXfloods only with written City permission. Hours-ahead outlook: NWPS National Water Model = **Roadmap**. LCRA Hydromet = **Roadmap**. Deploy: Render (Starter Oct 20 → Dec 31) + Supabase free tier.
5. **Color table (concept section 2).** Avoid/Closed text red `#FF5A4F` → **`#FF5470`** (the color-blind-verified value, §9); add the UNKNOWN row (dashed ring `#7A879C`); contrast ratios are copied from `tools/contrast.py` output, never typed. Typography line: Inter in the UI, Noto Sans inside the map.
6. **Navigation diagram (concept section 2).** "Storm Replay: one tap from Map Home (time-scrubber overlay)" → **4 tabs: Map · Drive · Replay · Alerts, plus the Settings gear** (§13, §28.2); the Crossing Card is a form sheet over the map.
7. **Signature moment and examples (concept section 2).** Use only real gauge and crossing names (e.g. "Bull Ck at Loop 360 nr Austin", USGS 08154700). Show travel time as a **range** ("water usually takes 30–45 min to get here"), never a single number. "detour +4 min" stays only if C16 (detours) is Built. The spoken example becomes the §3.7 Drive Mode line ("Avoid {name}. Flooding likely soon. Take another route."). "Drive Mode follows NHTSA's guidelines" → "designed to follow NHTSA's visual-manual guidelines".
8. **Advanced features (concept section 2).** Feature 1: "calibrated probability per crossing" only if ML is Built (C12–C13); otherwise "forecast rule learned from past storms". Feature 3: the route check runs on the phone with Turf plus the backend `/v1/route` (not PostGIS `ST_DWithin`); tag it Stretch until C15/C16. Feature 4: iOS uses **19 crossings + 1 re-rank region**, Android 60 by default; tag it Stretch until C22. The "Coverage" line keeps "ML inference ✓" only if C12 is Built. Roadmap list: MRMS rainfall is Stretch (F18), not Roadmap; county dashboard = Roadmap, CSV export = Stretch.
9. **Storm results table (concept section 2).** Rows = the bundled storm IDs (`halloween-2013`, `memorial-day-2015`, **`halloween-2015`**, `oct-2018` as the "should stay calm" control with no onsets, `july-2025`), only those whose data checks passed; every cell comes from `results.json` (no hand-typed numbers); add the calm-day false-alarm rate (`calm-2024`) and the nearest-gauge comparator row.
10. **Problem facts (concept section 1).** "Austin alone has ~70 low-water crossings monitored on ATXfloods" → "ATXfloods monitors about 67–70 crossings in Austin" with [S7]; keep [S5]/[S6] marked "verify final counts" until the student checks them (§2.2).
11. **Promises that depend on Stretch items.** "and gets you around it" (Solution), "with a detour" (Impact statement) and the video's "Check My Drive showing a detour" stay only if C15/C16 are Built; otherwise say "and tells you which crossings to avoid".
12. **Demo video script (concept section 4).** Match §41: target ≈ 2:25 (2:15–2:30); the replay label uses the hero storm chosen by the fixed rule (§18.13), not "[Memorial Day 2015]"; "VoiceOver reading a card" → "TalkBack reading a card" unless C26 is Built; the 1:45 VO says "a forecast rule learned from [N] past storms" unless C12 is Built.
13. **Build plan and cut order (concept section 6).** Replace the 12-day table and "offline cache → ML → rerouting → push" with a 5-line summary that points to master §6 (day plan, §6.3 cut order, §6.4 Stretch queue). The local cache is MVP and never cut.
14. **Claims Ledger (concept section 7).** Replace the 7 rows with the C-rows used in the video and answers, each with its status copied from `docs/CLAIMS.md` (§44).
15. **"What changed from v3" (concept section 0).** "Prediction = calibrated probability within a time window" → "a learned rule gives a time range; calibrated ML probabilities are a Stretch goal".
16. **Strategy section.** Move concept section 0 ("Strategy — read first (internal; delete this section before submitting)") to `docs/decisions/strategy.md` and delete it from the submitted copy.
17. **District and deadline.** Keep "TX-10 *(verify)*" until §38.2 is done; then write the confirmed district, deadline and time zone.
18. **Placeholders.** Replace `[X]`, `[N]`, `[POD]`, `[FAR]`, `[CSI]` **only** with values from `results.json`; tick ledger rows only when §44 evidence exists.
19. **Q2–Q4 stay the student's drafts.** Never rewrite them in your voice. If one states something that isn't true (e.g. "my first version used the nearest gauge", "Next, I want to add radar rainfall" when F18 shipped), add a comment `<!-- student: check this against … -->` and tell the student.

### 1.11 Agent instruction files to create in the repo (Day 0)

`create-expo-app` generates `mobile/AGENTS.md` and `mobile/.claude/settings.json` (Expo skills plugin). **Keep both** and append the FordCast block below. Also create a root `AGENTS.md` (source of truth) and a root `CLAUDE.md` whose first line is `@AGENTS.md` (Claude Code import) followed by a copy of the ten rules, so the rules load even if imports are disabled.

```markdown
# FordCast — rules for coding agents (keep ≤ 120 lines)
Full spec: docs/MASTER_PROMPT.md. If anything here conflicts with it, the master prompt wins.

1. SAFETY: Never write copy that calls a crossing or route safe/clear/passable/open/normal (EN or ES).
   States are NO_RISE · WATCH · AVOID · CLOSED · UNKNOWN only. Times are ranges ("15–30 min"), never countdowns;
   upstream travel time is a range too ("30–45 min"), exact τ only on the debug screen.
   Stale or missing data ⇒ UNKNOWN. Official closures override the model. No Success haptic. (§3)
2. All user-facing strings live in mobile/src/locales/{en,es}.json (+ *_spoken keys). Run the banned-words test.
3. Expo SDK 57 is frozen. Install native packages ONLY with `npx expo install`. No @react-navigation/* imports
   (use expo-router/react-navigation). MapLibre RN v11 API only (Map, GeoJSONSource, Layer type=…; no MapView/ShapeSource).
4. Never import a native-only module at the top level of a file Expo Go might load; gate with src/lib/capabilities.ts.
5. Never fake data, numbers or capabilities. Numbers come from docs/results/results.json. Fixtures stay in tests.
6. Built / Prototype / Roadmap labels come from docs/CLAIMS.md. Update it when status changes.
7. Student-owned files (linking/travel_time.py, model/baseline_rule.py, scoring/metrics.py, sources/base.py):
   do NOT implement. Write tests + skeleton + docs/explain, then stop and hand off.
8. Replay/live share ONE pipeline: fordcast/tick.py tick(now, source, official, state, model). Sources return only
   readings with available_at <= now. Never import fordcast.scoring.labels or ground truth outside fordcast/scoring.
9. Secrets never in the app bundle, logs, cassettes or commits. The app holds only the EXPO_PUBLIC_* values in §1.9.
10. Before committing: typecheck, lint, tests, expo-doctor (mobile); ruff + pytest (backend). Small Conventional Commits.
    Use the root Makefile targets (§5.2); Python tools run with `uv run --project tools`.
```

**Name mapping for reviewers:** the decision sheet's `pipeline.tick(now, source, clock)` is realized as `fordcast/tick.py::tick(now, source, official, state, model)` (§19.6). The clock lives in the caller (`LiveClock` / `ReplayClock` in `fordcast/clock.py` pass `now`), and the official-status source, the hysteresis state store and the model are injected, so live and replay run the identical function. Every section of this prompt uses the §19.6 name and signature.

### 1.12 Environment prerequisites

- Node **≥ 22.13.0**, Git, `npx eas-cli@latest` (24.x), Android Studio (emulator + `adb`) or an Android phone with USB debugging, `scrcpy` (video capture, §41), Maestro CLI (VERIFY BEFORE USE: current install command on maestro.mobile.dev).
- Python **3.13** via `uv` (Render: set `PYTHON_VERSION=3.13.16`), GNU `make`, and the PostgreSQL client `psql` (only for `make seed-prod` / `make model-live`, §5.2). Docker only if you run local Supabase (`make seed`).
- Windows: `npx expo install <pkg> -- --dev` needs the extra `"--"`; prefer WSL2 for the backend.
- Free accounts: Expo, Supabase, Render, GitHub, healthchecks.io, UptimeRobot, OpenRouteService; USGS API key from `https://api.waterdata.usgs.gov/signup/` (instant).

---

## §2. Product brief

### 2.1 One sentence

**FordCast forecasts which specific low-water crossing in Central Texas is likely to flood within the next ~90 minutes — before water reaches the road — using the stream gauges truly upstream of it, and helps drivers avoid it.** Tagline: **"Know before it crosses."** ES: **"Sepa antes de que el agua cruce."** (native-speaker review required, §35).

### 2.2 The problem (verified figures from the concept doc; cite the source tags exactly)

| Fact | Source | Status |
|---|---|---|
| Texas led every state in flood deaths 1959–2019: **1,069** (Louisiana #2: 693) | [S1] AP / Datawrapper, Jul 2025 | Verified in concept doc |
| **570** Texas flood deaths in that period were **vehicle-related**; they cluster in **Flash Flood Alley** (Balcones Escarpment, incl. Travis County), peak **at night**, and hit **ages 20–29** hardest | [S2] Han & Sharif, *Water* (MDPI) | Verified in concept doc |
| Nationally, **over half** of flood drownings happen when someone drives into floodwater | [S3] CDC/NWS via KY EM | Verified in concept doc |
| July 4, 2025: the Guadalupe at Hunt rose **26 ft in 45 min** | [S4] NASA SVS | Verified in concept doc |
| At least **135** Texans died in July 2025; **about 10** in Travis County | [S5], [S6] | **VERIFY BEFORE USE** (final counts from Texas DPS/TDEM and the Travis County Sheriff) |
| ATXfloods monitors **~67–70 crossings** in Austin (plus other jurisdictions) | [S7] KUT 2025-07-16 | Verified; note it's ATXfloods' count, not one dataset (the City's open-data layer `q6kt-v2zm` has 22 gate records) |
| No convincing evidence that "Turn Around, Don't Drown" alone reduced these deaths | [S8] LSU thesis | Verified in concept doc |
| Spanish spoken at home in Travis County / Austin | ACS S1601 | **Unverified — don't quote** until the student pulls it (§42) |

**The gap is timing, not awareness.** ATXfloods changes *after* water is on the road; NWS warnings are area-wide; Google Maps/Waze reroute only around *reported* closures; the National Water Model is built for hydrologists and struggles in small, flashy Hill Country basins. Nobody turns upstream gauge data into "this crossing, soon" for a driver.

### 2.3 The solution

1. **Link** each crossing to the gauges that actually drain to it (USGS NLDI upstream-with-tributaries navigation over NHDPlus), not the nearest gauge (§17).
2. **Learn** from real past storms how long floodwater takes to travel from each gauge to each crossing (τ by cross-correlation) and which upstream stage predicts trouble (trigger stage) (§18).
3. **Watch** those gauges live every 5 minutes; when the upstream signal says water is coming, the crossing turns **Watch → Avoid** with a **time range**, a reason, and (Stretch) a detour (§18, §32).
4. **Prove it** with **Storm Replay**: the same pipeline runs on real historic storms, seeing only data that was available at each minute, and produces honest lead-time numbers (§19, §33).

**What's new:** **per-crossing lead time.** Each crossing is a node in the river network with its own upstream gauges and its own learned travel time — "closed now" becomes "likely flooded within 15–30 min — detour ready." Say "I'm not aware of a system that does this per crossing", never "first ever" (§18).

### 2.4 Audiences

| Audience | Need | FordCast answer |
|---|---|---|
| **Drivers who use low-water crossings**, especially **at night** and **young/new drivers** (20–29 most affected; teens next) | A specific, early, glanceable warning for the crossing ahead | Map + Crossing detail, Drive Mode (voice, big targets), push alerts for saved crossings (MVP); Check My Drive and alerts for saved places/routes (Stretch) |
| **Spanish-speaking drivers** | Crossing-level warnings in Spanish (official alert text is English-only or template-based) | Full Spanish UI, push and **spoken** alerts (usted, es-US) |
| Drivers who use **VoiceOver/TalkBack**, low vision, color-blindness | Status that doesn't depend on sight or color | Shape + glyph + word + color; list alternative to the map; spoken cards |
| **City/County road & emergency crews** | "Which crossings flood next?" to pre-position barricades | The Map sheet's ranked list (MVP); the Crew "Likely to flood next" screen (Stretch F100) + CSV export (Stretch F101) |
| **School-bus route planners** | Morning route risk | Saved routes (Stretch F51) + crew list (Stretch F100); departure re-check (Roadmap F56) |
| **Judges** | Evidence it's real, useful, well built, and the student's own work | Storm Replay with real numbers, honest calm day, tests, explain-back docs, Claims Ledger |

**Scale story:** USGS gauges and NHDPlus cover the whole U.S.; Flash Flood Alley is the proving ground (Roadmap, §4 F-group P).

### 2.5 Non-goals (do not build, do not claim)

- **Not an emergency alert service** and never described as one (App Store guideline 5.1.5). It is "supplementary flood-risk information."
- **Never** tells anyone a crossing or route is safe, clear, open or passable (§3).
- **Not a navigation app.** No turn-by-turn; drivers keep their own nav app (hand-off, §32). No home-built router.
- **Not a replacement** for barricades, ATXfloods, NWS warnings or 911. Official closures always win.
- **No accounts, no analytics, no ads, no server-side location tracking** (§24).
- **No crowd reports, SMS, CarPlay/Android Auto or Critical Alerts** before judging (Roadmap only).
- **No coverage claims beyond the data:** crossings without an upstream gauge are shown as *Unknown – not monitored*, never as calm.
- **No rainfall forecasting or hydraulic modeling** of the road itself (HAND-based overtop stages are Roadmap).
- **No public app-store release** before judging ends (§38).
- **No hype words:** no "AI-powered", "real-time platform", "guaranteed", "accurate to the minute".

### 2.6 Success criteria (all measured, none invented)

| Criterion | Target | Measured by |
|---|---|---|
| Backtest lead time | Median lead time > 0 min vs. reactive status, reported with IQR and bootstrap CI | `make backtest` → `results.json` (§18) |
| Detection quality | POD, FAR, CSI reported per storm and pooled vs. nearest-gauge and reactive comparators | same |
| False-alarm burden | False alarms per crossing per 100 calm days reported (from the `calm-2024` calm-day set, §16.19) | same |
| Comprehension | **0 of 8** testers read "No rise detected" as "safe"; ≥ 2 Spanish speakers tested | §42 |
| Reliability | 0 crashes in the demo flows; calm day renders fully; stale → Unknown within 20 min | Maestro + device log (§36) |
| Uptime through Dec 31 | Tick heartbeat green; snapshot `data_status` live | healthchecks.io, UptimeRobot (§43) |

---

## §3. Safety principle, state model & copy rules

This section overrides every other section. If a screen, notification, voice prompt, widget, README line or video caption would break a rule here, the rule wins.

### 3.1 The principle — FordCast only ever adds caution

1. **Never "safe".** No state, word, color, icon, sound or haptic may tell a user a crossing or route is safe, clear, open, normal or passable. There is **no green** anywhere in the status system, no checkmark on a crossing, and no `Success` haptic for crossing events.
2. **Ranges, not countdowns.** Times are windows ("likely within 15–30 min"), never a single number and never a ticking timer. Nothing to race. This includes upstream **travel time**: "water usually takes 30–45 min to get here", never "38 min away" (§3.5 rule 8).
3. **Official closures override the model.** An official Closed always shows as **Flooded – Closed · OFFICIAL**, whatever the model says. An official "open" never lowers the model's state.
4. **Stale or missing data ⇒ Unknown.** Never a calm color, never the last calm state.
5. **Water on the road ⇒ Turn Around, Don't Drown**, always, in every language and channel.
6. **Disclaimer everywhere it matters:** "FordCast is a supplementary tool. Obey barricades and official warnings. Never drive into water." (§3.9 lists every placement.)

> Why this matters (for the README and Q3): a forecast app that makes people feel *safer* than they are would raise risk. Designing against that is part of the innovation.

### 3.2 The five states

Internal enum (TypeScript and Python) is **`NO_RISE | WATCH | AVOID | CLOSED | UNKNOWN`**. Wire format (DB enum `public.risk_state`, snapshot JSON, replay JSON, push `data.state`) is lowercase: **`no_rise | watch | avoid | closed | unknown`**. This **renames** the research reports' `no_signal`/`NO_SIGNAL` and `flooded`/`FLOODED`; §18–§23 and §28 MUST use these names. Only the current names are accepted: the zod schemas reject retired names. If one crossing in a snapshot fails to parse, that crossing renders `UNKNOWN`, the error is logged, and the rest of the snapshot still renders (§28.5).

**Severity rank** (map clustering, sorting, combining): `no_rise 0 < unknown 1 < watch 2 < avoid 3 < closed 4`.

| State | EN label (canonical) · short chip | ES label · short chip | Shape + glyph (§9) | Meaning |
|---|---|---|---|---|
| `NO_RISE` | **No rise detected** · NO RISE | **Sin crecida detectada** · SIN CRECIDA | Hollow circle, slate `#8A97AB` stroke | FordCast sees no rising water at the linked upstream gauges **right now**. It is *not* a statement that the road is dry. |
| `WATCH` | **Watch** · WATCH | **Precaución** · PRECAUCIÓN | Rounded triangle, amber `#F5A623` fill, ink `#0E1726` "!" | Water is rising upstream; flooding at this crossing is **possible**. |
| `AVOID` | **Avoid** · AVOID | **Evite** · EVITE | Rounded octagon, red fill `#C62828`, white glyph, 2 pt white rim, 2 s halo pulse (3 cycles max) | Water from upstream is **likely** to reach the road within the window. |
| `CLOSED` | **Flooded – Closed** · CLOSED | **Inundado – Cerrado** · CERRADO | Octagon + white 45° barricade stripes; **OFFICIAL** micro-label + shield when the source is official | Water is on the road (sensor) or an official source reports the crossing closed. |
| `UNKNOWN` | **Unknown – data offline** · UNKNOWN | **Desconocido – sin datos** · DESCONOCIDO | Dashed ring `#7A879C` + "?" | FordCast can't see this crossing: gauges stale/offline, or the crossing has no upstream gauge (**not monitored**). |

- The `ES` word for Watch is **Precaución**, not "Vigilancia" (that is the NWS's official Watch product name and must not be confused with a FordCast state).
- Colored status text (amber, `#FF5470` red) is **≥ 18 pt semibold** and always sits next to its chip or shape (§9). Status is never carried by color alone.

**Entry / exit conditions (summary — §18 owns the exact algorithm and thresholds; §18's hysteresis governs every exit):**

| State | Enters when (any) | Leaves when |
|---|---|---|
| `CLOSED` | (a) A fresh official source (ATXfloods/City/County with permission, or `manual`) reports **closed**; or (b) the at-road/target gauge is fresh and **≥ the crossing's overtop stage** (`WATER_AT_ROAD`) | (a) Only after the official source lifts the closure **and** 6 calm ticks (30 min) pass; (b) after the target gauge stays below the overtop stage for 6 ticks. Drops **one level at a time** (to AVOID, then WATCH…), never straight to NO_RISE. |
| `AVOID` | The baseline rule (or, if live, the calibrated ML model) says an upstream gauge is above its learned **trigger stage** while rising, with an ETA window ≤ 90 min (§18) | Raw state below AVOID for 6 consecutive ticks (30 min) **and** the triggering gauge is falling and below trigger − 0.5 ft → WATCH |
| `WATCH` | An upstream gauge is above its **watch stage** and rising (> 0.2 ft/30 min), or ML `p90 ≥ θ_W`, or an official "caution" status | Raw state below WATCH for 12 consecutive ticks (60 min) → NO_RISE |
| `UNKNOWN` | The crossing's **readings** are stale: all upstream links stale, or the primary link stale and no fresh link yields WATCH/AVOID (`obs age > stale_after_min` per gauge: 60 min until the gauge has ≥ 50 latency samples, then `clamp(ceil5(latency_p90 + 20), 30, 120)`; §18.9); or the crossing is tier C (no upstream gauge, reason `NO_UPSTREAM_GAUGE`); or, on the phone, the snapshot itself is older than 20 min, so every reading behind it is at least that old (§3.4) | Fresh data arrives → the state is recomputed (escalations apply immediately; after an outage the state machine resumes one level below the last known state and dwells, §18.8 T2) |
| `NO_RISE` | Fresh data, no rule/ML condition met, no official closure/caution | Any escalation, immediately |

Escalation is **always immediate**. De-escalation is **one level per dwell period** (anti-flapping): 6 ticks (30 min) for AVOID and CLOSED, 12 ticks (60 min) for WATCH. §18.8 is the single place these dwell values are defined and changed. Hysteresis state persists server-side (`private.risk_tracker`) so a restart never resets it.

### 3.3 Precedence (the only allowed combination logic)

```python
# backend/fordcast/model/combine.py  (called by tick(); identical in live and replay)
RANK = {"no_rise": 0, "unknown": 1, "watch": 2, "avoid": 3, "closed": 4}

# tick() passes official=None unless is_fresh_official(o, now) (§18.7). OfficialStatus (§19.1) has no
# `fresh` field: freshness is decided once, in tick(), never here.
def resolve_raw_state(official, water_at_road, all_gauges_stale, tier, rule, ml):
    """Return (raw_state, reasons). Order matters; each step can only ADD caution."""
    if official is not None and official.status == "closed":
        return "closed", [Reason("OFFICIAL_CLOSED", source=official.source)]   # 1. official wins
    if water_at_road:
        return "closed", [Reason("WATER_AT_ROAD")]                              # 2. sensor at the road
    if tier == "C":
        base, reasons = "unknown", [Reason("NO_UPSTREAM_GAUGE")]                # 3. not monitored
    elif all_gauges_stale:
        base, reasons = "unknown", [Reason("DATA_STALE")]                       # 4. never hide missing data
    else:
        m = max(rule, ml or rule, key=lambda s: RANK[s.state])                  # 5. ML can only add caution
        base, reasons = m.state, m.reasons
    if official is not None and official.status == "caution" \
            and RANK[base] < RANK["watch"]:                                     # 6. official caution adds caution,
        return "watch", reasons + [Reason("OFFICIAL_CAUTION", source=official.source)]  # even when gauges are stale
    return base, reasons                                                        # official "open" never lowers
# Then: state_machine.step(tracker, raw_state, now, ctx) applies hysteresis (§18.8).
```

- **Test with real objects:** `tests/unit/test_combine.py` calls `resolve_raw_state` with a real `OfficialStatus(...)` instance from `sources/base.py` (never a mock or a dict) for each precedence row, so an attribute that doesn't exist on the dataclass fails in CI instead of inside a live tick.

- An official **"open"** is displayed only as the attributed fact **"{source}: no closure reported"** / **"{source}: no hay cierre reportado"**, never as "open" or "safe".
- **Route verdict** (Check My Drive, Drive Mode): the highest-ranked state among the crossings on the route, except that **any** `unknown` crossing is listed separately ("2 crossings have no recent data"). A route is never "safe"; the calm verdict is **"No rise detected at {n} monitored crossings on this route"**.
- **Replay** uses exactly the same function and the same hysteresis; only the data source changes (§19).

### 3.4 Freshness, staleness and "last known"

Two different ages exist, and the UI shows both honestly:
- **Check age** = `now − snapshot.as_of` (when FordCast last ran its 5-minute check), corrected for clock skew with the server `Date` header. The client is authoritative for this in the UI (the server may be down).
- **Reading age** = `now − latest_obs_at` of the newest upstream gauge reading behind a crossing. Many gauges transmit hourly (§16.2), so a check 2 minutes ago can rest on a reading 55 minutes old. Per-crossing `UNKNOWN` is driven by **reading** age with the §18.9 rules (computed on the server every tick; the snapshot carries each crossing's `latest_obs_at`, §22.3), not by check age. The phone's own 20-minute rule below only covers the case where the snapshot itself is old.

The FreshnessPill shows check age as **"Checked 2 min ago"** / **"Revisado hace 2 min"** (`fresh.checked`). The word "Live" is never used on its own anywhere. The Crossing Card **also** shows the newest upstream reading age: **"Newest gauge reading: 55 min ago"** / **"Lectura más reciente del medidor: hace 55 min"** (`fresh.newest_reading`).

| Check age (snapshot or cache) | Display |
|---|---|
| ≤ 10 min | Normal state. FreshnessPill `fresh.checked`. Crossing Card adds `fresh.newest_reading`. |
| 10–20 min | Same state + amber pill `fresh.checked` and an "as of {time}" chip (`fresh.as_of`). |
| **> 20 min**, fetch failed with no newer cache, or `data_status: offline` | **Every crossing renders `UNKNOWN`** (dashed ring). If the last known state was WATCH/AVOID/CLOSED, show **"Last known: AVOID · 2 h ago"** with that shape **inside a dashed frame**. Never downgrade to a calm look. |
| Server-reported `unknown` (reason `DATA_STALE`) | Same "Last known: {state} · {age}" treatment, from the local cache or from a `last_known` field that the snapshot SHOULD carry for unknown crossings (§22). |
| `data_status: degraded` (> 25 % of linked gauges stale) | Banner "Some gauges delayed" / "Algunos medidores con retraso"; affected crossings are UNKNOWN with reason shown. |
| Replay | REPLAY banner (violet `#B69CFF`) always visible; freshness capsule replaced by the replay clock. Replay state never leaks into live screens, caches or notifications (except a local demo notification whose body starts "REPLAY — not a live alert:", §3.8). |

Unit-test the 20-minute rule and the per-crossing reading-age rule with a fake clock (§7).

### 3.5 Time-window rules

1. Windows come only from the fixed buckets in §18: **[0,15], [15,30], [30,60], [60,90]** minutes. Bounds are multiples of 5; width ≥ 15; upper bound ≤ 90.
2. `lo = 0` (water may arrive any moment) ⇒ never "0 min" and never "now–15 min": show **"water may already be on the road"** / **"puede que ya haya agua en el camino"** (the `headline_now` / `spoken_now` / `push body_now` slots). The `EtaRangePill` component shows "Water may already be on the road" in this case.
3. **AVOID** uses **"likely"** / **"probable(mente)"**; **WATCH** uses **"possible"** / **"posible"**. Never swap them.
4. WATCH shows a window only when §18 supplies one; otherwise use the `*_nowindow` strings.
5. CLOSED shows **no** window. UNKNOWN shows **no** window and hides the range pill.
6. Visual form `{lo}–{hi} min` (en dash U+2013, tabular numerals). Spoken form `"{lo} to {hi} minutes"` / `"de {lo} a {hi} minutos"` (§3.10).
7. The window updates **once per data update**, never continuously; no element counts down.
8. **Upstream travel time (τ) is a range too.** No user-facing text (screens, accessibility labels, TTS, reduced-motion labels, onboarding, reason templates, storyboards, push) ever shows τ as a single number. Show it as a rounded 15-minute range from τ's uncertainty: `tau_lo = 15·floor(P25/15)`, `tau_hi = 15·ceil(P75/15)`, and if `tau_hi − tau_lo < 15` then `tau_hi = tau_lo + 15` (one-storm links use median ± 10 min before rounding). Example: P25 33, median 38, P75 44 → **"water usually takes 30–45 min to get here"** / **"el agua suele tardar 30–45 min en llegar aquí"** (spoken: "30 to 45 minutes" / "de 30 a 45 minutos"). The server computes `tau_lo_min`/`tau_hi_min` once (`model/explain.py`) and sends them in the reason object (§18.10); the client never formats a bare τ. The exact τ (median, P25, P75, n) appears **only** on the debug screen (F107) and in docs (`docs/results/`, `docs/explain/`).

### 3.6 Source labels (every status shows who says so)

| Source | EN label | ES label |
|---|---|---|
| FordCast model (rule or ML) | FordCast forecast (experimental) | Pronóstico de FordCast (experimental) |
| Official closure | Official: {source} · OFFICIAL chip | Oficial: {source} · chip OFICIAL |
| Road sensor / gauge at the road | Sensor at the road: {gauge} | Sensor en el camino: {gauge} |
| Manual override (demo or curation) | Manual entry: {note} | Entrada manual: {note} |
| NWS product (context only) | NWS: {English product name} — {gloss} | NWS: {English product name} — {Spanish gloss} |
| Replay | REPLAY · real data from {storm} · not live | REPRODUCCIÓN · datos reales de {storm} · no es en vivo |

### 3.7 Wording bank (EN / ES)

All user-facing copy MUST come from this bank (keys go into `mobile/src/locales/{en,es}.json`, push templates into `backend/fordcast/push/templates/{en,es}.json`, replay storyboard templates into `backend/fordcast/replay/storyboard_templates.json`). This section owns **all** user-facing copy, including notification copy; other sections reference these keys and never invent status wording. Interpolation is i18next `{{var}}` everywhere (the backend templates use the same `{{var}}` syntax), and every source variant has its **own key** (never `{a|b}` alternatives inside one string). Placeholders: `{{name}}` crossing display name, `{{lo}}`/`{{hi}}` window, `{{tau_lo}}`/`{{tau_hi}}` travel-time range (§3.5 rule 8), `{{gauge}}` gauge display name, `{{rise}}` feet (1 decimal), `{{age}}` localized relative age ("2 min ago" / "hace 2 min"), `{{source}}` official source, `{{time}}` local time (America/Chicago), `{{n}}` detour minutes, `{{g}}` gauge count, `{{c}}` crossing count, `{{storm}}` storm display name. **Every ES string requires native-speaker review before release (§35).** Spanish uses **usted** and Latin-American vocabulary (*carro, manejar*).

#### `state.no_rise.*` — No rise detected
| Slot | EN | ES |
|---|---|---|
| label / short | No rise detected / NO RISE | Sin crecida detectada / SIN CRECIDA |
| headline | No upstream rise detected | No se detecta crecida río arriba |
| body *(allow-listed negation)* | FordCast isn't seeing rising water at the gauges upstream of this crossing right now. That doesn't mean the road is clear — nearby rain or an ungauged creek can still flood it. | FordCast no detecta agua subiendo en los medidores río arriba de este cruce en este momento. Eso no significa que el camino esté despejado: la lluvia cercana o un arroyo sin medidor todavía pueden inundarlo. |
| spoken | {{name}}. No upstream rise detected. Updated {{age}}. | {{name}}. No se detecta crecida río arriba. Actualizado {{age}}. |
| area headline | No upstream rise detected near you | No se detecta crecida río arriba cerca de usted |
| area sub | Watching {{g}} upstream gauges for {{c}} crossings · updated {{age}} | Vigilando {{g}} medidores río arriba para {{c}} cruces · actualizado {{age}} |
| footer (always visible on the status card) | Water can cover a road without warning. Turn around, don't drown. | El agua puede cubrir el camino sin previo aviso. ¡Dé la vuelta, no se ahogue! |
| route verdict | No rise detected at {{c}} monitored crossings on this route | No se detecta crecida en {{c}} cruces monitoreados en esta ruta |
| push | *(never pushed)* | *(nunca se envía)* |

#### `state.watch.*` — Watch
| Slot | EN | ES |
|---|---|---|
| label / short | Watch / WATCH | Precaución / PRECAUCIÓN |
| headline | Watch · water rising upstream | Precaución · el agua sube río arriba |
| body | {{gauge}} rose {{rise}} ft in the last 30 min. If it keeps rising, this crossing could flood in about {{lo}}–{{hi}} min. Plan another route. | {{gauge}} subió {{rise}} pies en los últimos 30 min. Si sigue subiendo, este cruce podría inundarse en unos {{lo}}–{{hi}} min. Planee otra ruta. |
| body_nowindow | Water is rising upstream. This crossing could flood if it keeps rising. Plan another route. | El agua está subiendo río arriba. Este cruce podría inundarse si sigue subiendo. Planee otra ruta. |
| spoken | Watch. {{name}}. Water is rising upstream. Possible flooding in {{lo}} to {{hi}} minutes. | Precaución. {{name}}. El agua está subiendo río arriba. Posible inundación en {{lo}} a {{hi}} minutos. |
| push title / body | Watch: {{name}} / Water rising upstream. Possible flooding in {{lo}}–{{hi}} min. Plan another route. | Precaución: {{name}} / El agua sube río arriba. Posible inundación en {{lo}}–{{hi}} min. Planee otra ruta. |
| push body_nowindow | Water rising upstream. Plan another route. | El agua sube río arriba. Planee otra ruta. |
| Drive Mode TTS | Heads up. Water is rising upstream of {{name}}. Plan another route. | Atención. El agua está subiendo río arriba de {{name}}. Planee otra ruta. |
| widget / Live Activity | Watch · {{lo}}–{{hi}} min | Precaución · {{lo}}–{{hi}} min |

#### `state.avoid.*` — Avoid
| Slot | EN | ES |
|---|---|---|
| label / short | Avoid / AVOID | Evite / EVITE |
| headline | Avoid · likely flooded within {{lo}}–{{hi}} min | Evite · probablemente inundado en {{lo}}–{{hi}} min |
| headline_now (lo = 0) | Avoid · water may already be on the road | Evite · puede que ya haya agua en el camino |
| body | Water from upstream is heading to this crossing. It may reach the road before any barricade goes up. Use another route. | El agua de río arriba va hacia este cruce. Puede llegar al camino antes de que pongan barricadas. Use otra ruta. |
| detour line | Detour adds {{n}} min | El desvío agrega {{n}} min |
| spoken | Avoid. {{name}}. Likely flooded within {{lo}} to {{hi}} minutes. Use another route. | Evite. {{name}}. Probablemente inundado en {{lo}} a {{hi}} minutos. Use otra ruta. |
| spoken_now | Avoid. {{name}}. Water may already be on the road. Use another route. | Evite. {{name}}. Puede que ya haya agua en el camino. Use otra ruta. |
| push title / body | Avoid {{name}} / Likely flooded within {{lo}}–{{hi}} min. Use another route. Never drive into water. | Evite {{name}} / Probablemente inundado en {{lo}}–{{hi}} min. Use otra ruta. Nunca maneje en el agua. |
| push body_now | Water may already be on the road. Use another route. Never drive into water. | Puede que ya haya agua en el camino. Use otra ruta. Nunca maneje en el agua. |
| Drive Mode TTS | Avoid {{name}}. Flooding likely soon. Take another route. | Evite {{name}}. Inundación probable pronto. Tome otra ruta. |
| widget | AVOID · {{lo}}–{{hi}} min | EVITE · {{lo}}–{{hi}} min |
| widget_now (lo = 0) | AVOID · water may be on the road | EVITE · puede haber agua en el camino |
| hand-off warning | Your map app doesn't know about this forecast. If it routes you back toward {{name}}, don't follow it. | Su app de mapas no conoce este pronóstico. Si lo lleva de vuelta hacia {{name}}, no la siga. |

#### `state.closed.*` — Flooded – Closed (variants `official`, `sensor`)
| Slot | EN | ES |
|---|---|---|
| label / short | Flooded – Closed / CLOSED | Inundado – Cerrado / CERRADO |
| official micro-label | OFFICIAL | OFICIAL |
| headline (official) | Closed · {{source}} | Cerrado · {{source}} |
| headline (sensor) | Water over road · reported {{time}} | Agua sobre el camino · reportada a las {{time}} |
| body | {{source}} reports this crossing closed. Do not drive around barricades. Turn around, don't drown. | {{source}} reporta este cruce cerrado. No pase alrededor de las barricadas. ¡Dé la vuelta, no se ahogue! |
| body (sensor) | The sensor at this crossing shows water over the road. Turn around, don't drown. | El sensor de este cruce muestra agua sobre el camino. ¡Dé la vuelta, no se ahogue! |
| spoken | Closed. {{name}}. Reported by {{source}}. Turn around, don't drown. | Cerrado. {{name}}. Reportado por {{source}}. Dé la vuelta, no se ahogue. |
| push title / body | Closed: {{name}} / {{source}} reports it closed. Turn around, don't drown. | Cerrado: {{name}} / {{source}} lo reporta cerrado. ¡Dé la vuelta, no se ahogue! |
| Drive Mode TTS | {{name}} is closed. Turn around. Don't drown. | {{name}} está cerrado. Dé la vuelta. No se ahogue. |
| closure lifted | {{source}}: closure lifted at {{time}}. Water may remain. Use caution. | {{source}}: cierre levantado a las {{time}}. Puede quedar agua. Tenga cuidado. |

#### `state.unknown.*` — Unknown (variants `offline`, `not_monitored`)
| Slot | EN | ES |
|---|---|---|
| label / short | Unknown – data offline / UNKNOWN | Desconocido – sin datos / DESCONOCIDO |
| headline (offline) | Unknown · data offline | Desconocido · sin datos |
| body (offline) | We can't reach the gauges for this crossing (last data {{age}}). Treat it as if it could flood, and check official sources. | No podemos obtener datos de los medidores de este cruce (últimos datos: {{age}}). Trátelo como si pudiera inundarse y consulte fuentes oficiales. |
| headline (not_monitored) | Unknown · not monitored by FordCast | Desconocido · FordCast no lo monitorea |
| body (not_monitored) | FordCast has no upstream gauge for this crossing. Look out for water and barricades, and check official sources. | FordCast no tiene un medidor río arriba para este cruce. Esté atento al agua y a las barricadas, y consulte fuentes oficiales. |
| spoken | Unknown. {{name}}. No data since {{age}}. It could flood. | Desconocido. {{name}}. Sin datos desde {{age}}. Podría inundarse. |
| last known | Last known: {{state}} · {{age}} | Último estado conocido: {{state}} · {{age}} |
| push *(Stretch; only for saved-route crossings while an NWS flood product is active)* | FordCast can't see {{name}} right now / Data is offline during flood alerts. Avoid low-water crossings. | FordCast no puede ver {{name}} ahora / No hay datos mientras hay alertas de inundación. Evite los cruces bajos. |

#### `update.deescalate.*` — de-escalation (push: once, when an escalated crossing reaches `no_rise`, only to devices that got the escalation push, §3.8; card and Drive TTS: on any step down)
| Slot | EN | ES |
|---|---|---|
| push title | Update: {{name}} | Actualización: {{name}} |
| push body / card | FordCast no longer sees water rising upstream. Water may still be on the road. Obey barricades. | FordCast ya no detecta agua subiendo río arriba. Todavía puede haber agua en el camino. Respete las barricadas. |
| Drive TTS | Update on {{name}}. Rising water upstream has stopped. Water may still be on the road. | Actualización sobre {{name}}. El agua dejó de subir río arriba. Todavía puede haber agua en el camino. |

Never: "cleared", "reopened", "safe again", "all clear", "back to normal".

#### `reason.*` — "Why this alert" templates (rendered on the phone from the §18.10 reason objects)
Each code has a visual key and a `_spoken` sibling. Source variants are separate keys. The `{{gauge}}` name comes from the bundled `gauges.geojson` seed (F86). Rates use "over the last 30 min", never "in 30 min" (the countdown guard in §3.12 would reject "in 30 min").

| Key | EN | ES |
|---|---|---|
| `reason.UPSTREAM_ABOVE_TRIGGER` | {{gauge}}: +{{rise}} ft over the last 30 min, upstream. Water usually takes {{tau_lo}}–{{tau_hi}} min to get here. | {{gauge}}: +{{rise}} pies en los últimos 30 min, río arriba. El agua suele tardar {{tau_lo}}–{{tau_hi}} min en llegar aquí. |
| `reason.UPSTREAM_ABOVE_TRIGGER_spoken` | {{gauge}} rose {{rise}} feet over the last 30 minutes, upstream. Water usually takes {{tau_lo}} to {{tau_hi}} minutes to get here. | {{gauge}} subió {{rise}} pies en los últimos 30 minutos, río arriba. El agua suele tardar de {{tau_lo}} a {{tau_hi}} minutos en llegar aquí. |
| `reason.UPSTREAM_RISING` | Water rising upstream at {{gauge}} | El agua sube río arriba en {{gauge}} |
| `reason.UPSTREAM_RISING_spoken` | Water is rising upstream at {{gauge}}. | El agua está subiendo río arriba en {{gauge}}. |
| `reason.WATER_AT_ROAD` | Sensor at the road: {{gauge}} shows water over the road | Sensor en el camino: {{gauge}} muestra agua sobre el camino |
| `reason.WATER_AT_ROAD_spoken` | The sensor at the road, {{gauge}}, shows water over the road. | El sensor en el camino, {{gauge}}, muestra agua sobre el camino. |
| `reason.OFFICIAL_CLOSED` | Official: {{source}} reports it closed | Oficial: {{source}} lo reporta cerrado |
| `reason.OFFICIAL_CLOSED_spoken` | Official: {{source}} reports it closed. | Oficial: {{source}} lo reporta cerrado. |
| `reason.OFFICIAL_CAUTION` | Official: {{source}} reports caution | Oficial: {{source}} reporta precaución |
| `reason.OFFICIAL_CAUTION_spoken` | Official: {{source}} reports caution. | Oficial: {{source}} reporta precaución. |
| `reason.DATA_STALE_gauge` | No recent data from {{gauge}} (last {{age}}) | Sin datos recientes de {{gauge}} (últimos: {{age}}) |
| `reason.DATA_STALE_gauge_spoken` | No recent data from {{gauge}}. Last data {{age}}. | Sin datos recientes de {{gauge}}. Últimos datos {{age}}. |
| `reason.DATA_STALE_source` | No recent update from {{source}} (last {{age}}) | Sin actualización reciente de {{source}} (última: {{age}}) |
| `reason.DATA_STALE_source_spoken` | No recent update from {{source}}. Last update {{age}}. | Sin actualización reciente de {{source}}. Última actualización {{age}}. |
| `reason.NO_UPSTREAM_GAUGE` | Not monitored by FordCast: no upstream gauge | FordCast no lo monitorea: no hay medidor río arriba |
| `reason.NO_UPSTREAM_GAUGE_spoken` | Not monitored by FordCast. There is no upstream gauge. | FordCast no lo monitorea. No hay medidor río arriba. |
| `reason.HOLDING` | Keeping this warning while water upstream goes down | Mantenemos este aviso mientras baja el agua río arriba |
| `reason.HOLDING_spoken` | Keeping this warning while water upstream goes down. | Mantenemos este aviso mientras baja el agua río arriba. |
| `reason.CLOSURE_LIFTED` | {{source}}: closure lifted at {{time}}. Water may remain. Use caution. | {{source}}: cierre levantado a las {{time}}. Puede quedar agua. Tenga cuidado. |
| `reason.CLOSURE_LIFTED_spoken` | {{source}} lifted the closure at {{time}}. Water may remain. Use caution. | {{source}} levantó el cierre a las {{time}}. Puede quedar agua. Tenga cuidado. |
| `reason.RAIN_OVER_BASIN` *(Stretch)* | {{qpe}} in of rain over this creek's basin over the last {{hours}} h | {{qpe}} pulg. de lluvia en la cuenca de este arroyo en las últimas {{hours}} h |
| `reason.RAIN_OVER_BASIN_spoken` *(Stretch)* | {{qpe}} inches of rain over this creek's basin over the last {{hours}} hours. | {{qpe}} pulgadas de lluvia en la cuenca de este arroyo en las últimas {{hours}} horas. |
| `reason.NEAR_ROAD_RISING` *(Stretch, ML)* | Water rising at {{gauge}} near the road | El agua sube en {{gauge}} cerca del camino |
| `reason.NEAR_ROAD_RISING_spoken` *(Stretch, ML)* | Water is rising at {{gauge}}, near the road. | El agua está subiendo en {{gauge}}, cerca del camino. |

The server never sends rendered text for reasons; it sends the code and its parameters (§18.10), and `model/explain.py` adds `tau_lo_min`/`tau_hi_min`. The backend copy test (§3.12) also scans these templates (it reads them from `mobile/src/locales/{en,es}.json`).

#### Freshness, offline, replay, results, NWS, misc.
| Key | EN | ES |
|---|---|---|
| `fresh.checked` | Checked {{age}} | Revisado {{age}} |
| `fresh.newest_reading` | Newest gauge reading: {{age}} | Lectura más reciente del medidor: {{age}} |
| `fresh.as_of` | As of {{time}} | A las {{time}} |
| `fresh.updated` | Updated {{age}} | Actualizado {{age}} |
| `fresh.connecting` | Connecting… | Conectando… |
| `fresh.offline` | Data offline · {{age}} | Sin datos · {{age}} |
| `fresh.as_of_offline` | Risk as of {{time}} — you're offline | Riesgo a las {{time}} — está sin conexión |
| `fresh.partial` | Some gauges delayed | Algunos medidores con retraso |
| `replay.banner` | REPLAY · real data from {{storm}} · not live | REPRODUCCIÓN · datos reales de {{storm}} · no es en vivo |
| `replay.no_lookahead` | Replay sees only data that was available at that minute. | La reproducción solo ve los datos disponibles en ese minuto. |
| `replay.result` | FordCast warned {{x}} min before water reached the road | FordCast avisó {{x}} min antes de que el agua llegara al camino |
| `replay.honesty` | Example picked by a fixed rule: the warning closest to the typical one. Across {{n}} storms the median lead time was {{m}} min. | Ejemplo elegido con una regla fija: el aviso más cercano al típico. En {{n}} tormentas, la anticipación mediana fue de {{m}} min. |
| `replay.assumes_delay` | Assumes gauge data arrives {{d}} min after it's measured. | Supone que los datos del medidor llegan {{d}} min después de medirse. |
| `replay.gauge_silent` | {{gauge}} went silent. Its readings only arrived later, so FordCast shows Unknown here. | {{gauge}} dejó de transmitir. Sus lecturas llegaron después, así que FordCast muestra Desconocido aquí. |
| `replay.notify_title` | REPLAY · {{name}} | REPRODUCCIÓN · {{name}} |
| `replay.notify_body` | REPLAY — not a live alert: {{headline}} | REPRODUCCIÓN — no es una alerta real: {{headline}} |
| `replay.drive_cta` | Drive this storm (simulated) | Manejar esta tormenta (simulado) |
| `replay.simulated_drive` | SIMULATED DRIVE | MANEJO SIMULADO |
| `share.crossing` *(Stretch F48)* | {{name}}: {{state}} — FordCast forecast (experimental), as of {{time}}. Obey barricades and official warnings. Never drive into water. {{link}} | {{name}}: {{state}} — Pronóstico de FordCast (experimental), a las {{time}}. Respete las barricadas y las alertas oficiales. Nunca maneje en el agua. {{link}} |
| `legend.never_safe` *(allow-listed negation)* | FordCast never says a road is safe. | FordCast nunca dice que un camino es seguro. |
| `drive.suggest` *(Stretch F62)* | Driving? Switch to Drive Mode | ¿Va manejando? Cambie a Modo manejo |
| `permissions.precise_needed` *(Stretch F110b)* | Precise location is needed for crossing alerts. | Se necesita la ubicación precisa para los avisos de cruces. |
| `settings.delete_cached_data` | Delete cached data | Borrar datos guardados |
| `settings.delete_cached_data_body` | Removes saved risk, recent searches and your last route from this phone. | Borra de este teléfono el riesgo guardado, las búsquedas recientes y su última ruta. |
| `settings.delete_alert_data` | Delete my alert data | Borrar mis datos de alertas |
| `nws.ffw` | NWS: Flash Flood Warning until {{time}} | NWS: Flash Flood Warning hasta las {{time}} — inundación repentina en curso o inminente |
| `nws.ffa` | NWS: Flash Flood Watch until {{time}} — flash flooding is possible | NWS: Flash Flood Watch hasta las {{time}} — es posible que haya inundaciones repentinas |
| `nws.ffe` | NWS: FLASH FLOOD EMERGENCY — extremely dangerous flooding. Get to higher ground. Do not travel. | NWS: FLASH FLOOD EMERGENCY — inundación extremadamente peligrosa. Busque terreno alto. No viaje. |
| `nws.fa` | NWS: Flood Advisory — minor flooding possible or happening | NWS: Flood Advisory — inundaciones menores posibles o en curso |
| `alerts.why_late` | Alerts can arrive minutes late, and FordCast doesn't cover every road. | Las alertas pueden llegar con minutos de retraso, y FordCast no cubre todos los caminos. |
| `official.no_closure` | {{source}}: no closure reported | {{source}}: no hay cierre reportado |
| `push.summary` | {{c}} crossings on your routes need caution / Tap for details. | {{c}} cruces en sus rutas requieren precaución / Toque para ver detalles. |
| `area.nearby_count` (`_one/_other`; ES also `_many`) | {{state}} · {{count}} near you | {{state}} · {{count}} cerca de usted |
| `route.unknown_count` (`_one/_other`) | {{count}} crossings on this route have no recent data | {{count}} cruces en esta ruta no tienen datos recientes |
| `route.changed` | Route status changed · {{time}} | El estado de la ruta cambió · {{time}} |
| `routing.offline` | Routing needs internet. Showing crossings on your last route. | Para calcular rutas se necesita internet. Mostrando los cruces de su última ruta. |
| `routing.no_detour` | No detour found that avoids {{name}}. Wait or choose another destination. | No se encontró un desvío que evite {{name}}. Espere o elija otro destino. |
| `drive.lockout.title` / buttons | Typing is locked while the car is moving. Are you a passenger? / I'm a passenger (hold) · Cancel | Escribir está bloqueado mientras el carro está en movimiento. ¿Es usted pasajero? / Soy pasajero (mantenga presionado) · Cancelar |
| `drive.silent_tip` | Turn off silent mode for spoken alerts. | Desactive el modo silencio para escuchar las alertas habladas. |
| `alerts.empty` | No alerts yet. You'll see warnings here for your saved places and drives. | Todavía no hay alertas. Aquí verá avisos sobre sus lugares guardados y sus trayectos. |
| `alerts.test` | This is a test. No crossing has changed. | Esto es una prueba. Ningún cruce ha cambiado. |
| `safety.never_safe` *(allow-listed negation)* | It is never safe to drive or walk into flood water. | Nunca es seguro manejar o caminar en agua de inundación. |
| `safety.tadd_depths` | *(instruction, not copy)* Leave this key out until NWS's current wording ("6 inches… 12 inches… 2 feet…") is verified at weather.gov/safety/flood-turn-around-dont-drown; then quote it exactly. | *(translate only after the EN text is verified; native review)* |

**When `lo = 0`, every surface uses the slot's `_now` variant** (`headline_now`, `spoken_now`, `push body_now`, `widget_now`); a rendered string never contains "0–" or "now–".

**Composite surfaces reuse the bank (no new status copy):** the in-app AlertBanner = chip + `{{name}}` + the state's `headline` (or `headline_now`), with the state's `spoken` string as its accessibility label; map marker labels use `short`; widgets/Live Activities use the `widget` slot; Drive Mode shows the `label` word + window and speaks the `Drive Mode TTS` slot.

NWS product names stay **in English** with a Spanish gloss (official Spanish names are unsettled). "Turn Around, Don't Drown" is an NWS registered trademark: use it as text only, never alter or imply endorsement; the Spanish slogan is **"¡Dé la vuelta, no se ahogue!"**.

### 3.8 Notification rules (copy, urgency, delivery)

| State change | Push? | iOS `interruptionLevel` (local `timeSensitive` / push `time-sensitive`) | Android channel (create **before** requesting permission) | TTL | Default |
|---|---|---|---|---|---|
| → **CLOSED**, → **AVOID** | Yes, escalation only | `timeSensitive` / `time-sensitive` (needs the entitlement; Lane B only) | **`crossing-urgent`** (HIGH; `bypassDnd: false`) | **1800 s** | On when alerts are enabled |
| → **WATCH** | Yes, escalation only | `active` | **`crossing-watch`** (DEFAULT) | 1800 s | **Off** — opt-in: device-level Watch toggle **and** the per-subscription `want_watch` flag, both default off |
| De-escalation `update` | **Exactly one** passive push, sent when a crossing that was pushed as an escalation reaches `no_rise`, only to devices that received that escalation push in the last 12 h. Step-downs (AVOID → WATCH, CLOSED → AVOID) send **no** push; the earlier alert stays until the `update` replaces it (same `collapseId`/`tag`). Copy: `update.deescalate.*`. | `passive` | **`updates`** (LOW) | 1800 s | On |
| → **UNKNOWN** | No (in-app banner). Stretch exception: §3.7 `state.unknown` push, only for `saved_route` subscriptions whose previous state was ≥ WATCH while an NWS Flash Flood / Flood Warning is active (§23.2) | `active` | `updates` | 1800 s | Stretch |
| → **NO_RISE** | **Never** as news of its own (no "good news" push); the only related push is the single `update` above | — | — | — | — |
| Replay demo notification (local only, from the Replay player or Replay drive) | Local only, never from the server (replay never pushes) | `passive` | **`updates`** — never `crossing-urgent` | — | Only when the user is in Replay |
| Drive Mode foreground service / sticky status (Stretch) | Local only | — | **`drive-mode`** (LOW, silent) | — | — |

- **Channel IDs** `crossing-urgent`, `crossing-watch`, `updates`, `drive-mode` are canonical for §15, §23 and §31; the server's `channelId` must match a channel the app created, or Android drops the notification.
- **Watch defaults:** `private.devices.watch_alerts` defaults to `false` in the DDL (§21) and every subscription's `want_watch` defaults to `false` (§23.1); the client sends `want_watch` per subscription, and the Settings Watch toggle shows **off** by default (§13.16).
- **Replay demo notifications:** the body MUST start with **"REPLAY — not a live alert:"** / **"REPRODUCCIÓN — no es una alerta real:"** (`replay.notify_body`), the title with "REPLAY ·" (`replay.notify_title`); channel `updates`; `data.replay = true`; they never enter the live Alerts inbox counts or the tab badge.

**Policy (server-enforced, §23):** push only for crossings the device subscribed to (by **crossing ID**); ≤ 1 push per crossing per level per 60 min; ≤ 3 pushes per device per hour, extra changes bundled into one `push.summary`; **quiet hours:** Watch, `update` and the Stretch Unknown push are suppressed (never sent late), while Avoid/Closed **ignore** quiet hours for `saved_route`, `saved_place` and `starred` (saved-crossing) subscriptions, because night is the riskiest time; `collapseId`/`tag` = `crossing-<id>` so a newer alert replaces the older one; `app_config.kill_switch_push` stops all sends; every issued alert is logged (crossing, level, time; no user data) so live FAR can be audited. Title ≤ 50 characters, body ≤ 150. Notifications always carry the deep link `fordcast://crossing/<id>`.

### 3.9 Disclaimers — exact text and placement

| Where | EN | ES |
|---|---|---|
| **Onboarding pledge** (required; versioned `pledge_version`; shown again after a major update) | FordCast is a student-built forecast tool. It can be wrong or late, and it never tells you a road is safe. I will obey barricades and official warnings, and I will never drive into water. **[I understand]** | FordCast es una herramienta de pronóstico creada por un estudiante. Puede equivocarse o llegar tarde, y nunca le dice que un camino es seguro. Respetaré las barricadas y las alertas oficiales, y nunca manejaré en el agua. **[Entiendo]** |
| ↳ pledge keys (the screen shows three checkboxes, F109) | `onboarding.pledge.title` "Before you start" · `onboarding.pledge.item1` "I will never drive into water." · `onboarding.pledge.item2` "I will obey barricades and official warnings." · `onboarding.pledge.item3` "FordCast is a student-built forecast. It can be wrong or late, and it never tells me a road is safe." · `onboarding.pledge.accept` "I understand" · `onboarding.pledge.hint` "Check all three statements to continue" | `onboarding.pledge.title` "Antes de empezar" · `item1` "Nunca manejaré en el agua." · `item2` "Respetaré las barricadas y las alertas oficiales." · `item3` "FordCast es un pronóstico creado por un estudiante. Puede equivocarse o llegar tarde, y nunca me dice que un camino es seguro." · `accept` "Entiendo" · `hint` "Marque las tres frases para continuar" |
| ↳ onboarding page keys | `onboarding.welcome.title` "Know before it crosses." · `onboarding.how.title` "How it works" · `onboarding.how.late` = `alerts.why_late` · `onboarding.legend.title` "What the map shows" · `onboarding.legend.never_safe` "FordCast never says a road is safe." (page bodies: §13.2; any travel time on these pages is a range, §3.5 rule 8) | `onboarding.welcome.title` "Sepa antes de que el agua cruce." · `onboarding.how.title` "Cómo funciona" · `onboarding.legend.title` "Lo que muestra el mapa" · `onboarding.legend.never_safe` "FordCast nunca dice que un camino es seguro." |
| **Persistent footer** (Crossing detail, Check My Drive result, Replay results) | FordCast is a supplementary tool. Obey barricades and official warnings. Never drive into water. | FordCast es una herramienta complementaria. Respete las barricadas y las alertas oficiales. Nunca maneje en el agua. |
| **About → Legal** | FordCast is an independent student project made for the 2026 Congressional App Challenge. It is not an official warning service and is not affiliated with or endorsed by the National Weather Service, USGS, the City of Austin, Travis County, or the U.S. House of Representatives. Forecasts use provisional data that can be delayed, missing, or wrong. FordCast never indicates that a crossing is safe. Always obey barricades, road closures, and official warnings. In an emergency, call 911. Provided "as is," without warranty of any kind. | FordCast es un proyecto estudiantil independiente creado para el Congressional App Challenge 2026. No es un servicio oficial de alertas y no está afiliado ni respaldado por el Servicio Nacional de Meteorología (NWS), el USGS, la Ciudad de Austin, el Condado de Travis ni la Cámara de Representantes de EE. UU. Los pronósticos usan datos provisionales que pueden retrasarse, faltar o estar equivocados. FordCast nunca indica que un cruce sea seguro. Siempre respete las barricadas, los cierres de caminos y las alertas oficiales. En una emergencia, llame al 911. Se ofrece "tal cual", sin garantía de ningún tipo. |
| **Data attribution** (About, README, video end card) | Data: U.S. Geological Survey (provisional, subject to revision) · NOAA/NWS · City of Austin · Map © OpenStreetMap contributors, OpenFreeMap/OpenMapTiles · Routing © openrouteservice | Same names; "provisionales, sujetos a revisión" |
| **Location primer** (contextual: shown right before the first "center on me", Check My Drive or Drive Mode; **never** on the first Map Home render) | FordCast uses your location to show crossings near you and on your route. Your location stays on your phone. | FordCast usa su ubicación para mostrar los cruces cerca de usted y en su ruta. Su ubicación se queda en su teléfono. |
| **Background location primer** (Stretch) | Allow "Always" so FordCast can warn you near a crossing where flooding is likely, even when the app is closed. Alerts can arrive minutes late. Your location stays on your phone. | Permita "Siempre" para que FordCast le avise cerca de un cruce donde es probable una inundación, incluso con la app cerrada. Las alertas pueden llegar con minutos de retraso. Su ubicación se queda en su teléfono. |
| **Drive Mode start** | Mount your phone. Don't touch it while driving. FordCast will speak. | Coloque su teléfono en un soporte. No lo toque mientras maneja. FordCast le hablará. |
| **Every API response** | carries `"disclaimer_key": "SUPPLEMENTARY_TOOL"`; the app renders the footer text from it | — |

The pledge copy contains "safe"/"seguro" as a negation and is allow-listed (§3.12) under the `onboarding.pledge.*` and `onboarding.legend.*` namespaces. Onboarding strings use only these two namespaces plus `onboarding.welcome.*` and `onboarding.how.*`; shorter prefixes from early drafts are retired.

### 3.10 Spoken variants (TTS and screen readers)

1. Every status-bearing string has a sibling `*_spoken` key. TTS and `accessibilityLabel`s use **only** spoken keys.
2. Spoken strings contain **no** dashes, symbols or abbreviations: "minutes/minutos" not "min", "feet/pies" not "ft", "to/a" not "–", "Farm to Market 1626" or "F M 1626" for "FM 1626" (crossing records may carry `name_spoken_en`/`name_spoken_es`; VERIFY BEFORE USE on device).
3. **TTS alerts lead with the action** ("Avoid {{name}}…"). **Row accessibility labels lead with the visible text** (the crossing name) for WCAG 2.5.3 Label-in-Name.
4. Drive Mode TTS is **≤ 12 words** where possible and never more than one message per crossing per 60 s.
5. Never feed a window like "15–30 min" to a speech engine. Spoken travel time is "{{tau_lo}} to {{tau_hi}} minutes", never a single number (§3.5 rule 8); the same applies to reduced-motion labels that replace an animation.
6. Examples in code, tests and docs use only real gauge names from §16.18 (e.g. USGS 08154700 "Bull Ck at Loop 360 nr Austin") or `{{name}}` placeholders; fixtures use the test crossing `test-0001`. Never invent a gauge, creek or road name.

### 3.11 Communicating uncertainty

| Rule | Implementation |
|---|---|
| Specific warnings get action | Every Watch/Avoid names the crossing, the window, the evidence ("Why?"), the action and the source. |
| Show the evidence | Each Watch/Avoid shows its reason codes rendered client-side from the §3.7 `reason.*` templates: e.g. `UPSTREAM_ABOVE_TRIGGER` → "{{gauge}}: +{{rise}} ft over the last 30 min, upstream. Water usually takes {{tau_lo}}–{{tau_hi}} min to get here." Never a single-number travel time, never raw SHAP values, never "% safe". |
| No bare probabilities on the main UI | Levels + ranges only. If the ML model is live **and calibrated** (Stretch), the full detent may show a reference class: "About 7 in 10 similar situations flooded within 60 min (calibrated model)". |
| Publish accuracy | "How accurate is FordCast?" shows POD, FAR, CSI, median lead time and n storms from `results.json`, always next to the hero example and its honesty line (`replay.honesty`). The hero is picked by a pre-registered rule, never as the best case: the tier-A hit whose lead time is closest to the overall median lead time, within a bundled storm (`tools/select_hero.py`, §18.13); the README states the rule. |
| Admit limits | `alerts.why_late` in onboarding and Alerts; "Estimated" badge on tier-B crossings; "not monitored" on tier C; replay header states the assumed data delay. |
| Avoid cry-wolf | Hysteresis, cooldowns, per-device caps, Watch pushes opt-in, false-alarms-per-100-calm-days metric published. |

### 3.12 Banned words and the copy CI test

**Banned list** — stored once in `mobile/src/locales/banned-words.json` and read by both the Jest and the pytest tests.

| Scope | EN | ES |
|---|---|---|
| **Global** (every key, every channel) | safe, safer, safely, all clear, all-clear, clear, cleared, passable, good to go, no risk, low risk, no danger, you can cross, can cross, reopened, all good, nothing to worry | seguro, segura, seguros, seguras, todo despejado, despejado, despejada, transitable, puede cruzar, puede pasar, listo para pasar, sin riesgo, bajo riesgo, riesgo bajo, sin peligro, reabierto, todo bien |
| **Status scope** (every key **except** the UI-chrome namespaces `settings.`, `common.`, `search.`, `permissions.`) | ok, okay, normal, open, opened | normal, abierto, abierta |

- File shape: `{ "global": { "en": [...], "es": [...] }, "status": { "en": [...], "es": [...] }, "chromeNamespaces": ["settings.", "common.", "search.", "permissions."], "allowKeys": [...] }`.
- Design consequences: no "Clear"/"OK" buttons anywhere (use "Reset", "Delete", "Got it" / "Restablecer", "Borrar", "Entendido"); the cache button is **"Delete cached data"** / **"Borrar datos guardados"** (`settings.delete_cached_data`); no "¿Está seguro?" dialogs (use "¿Desea…?"); no button or link label starts with "Open"/"Abrir" (use "Show detour in {{app}}" / "Mostrar el desvío en {{app}}", "View …" / "Ver …", "Go to …" / "Ir a …", "Official status: ATXfloods.com ›" / "Estado oficial: ATXfloods.com ›", "See details" / "Ver detalles"); the legend's safety line is "FordCast never says a road is safe." under the allow-listed key `legend.never_safe` (never a "Not safe" label).
- **Allow-list** (`banned-words.json → allowKeys`): `state.no_rise.body`, `safety.never_safe`, `legend.never_safe`, `about.never_safe`, `onboarding.pledge.*`, `onboarding.legend.*`, `legal.about`, `disclaimer.*`. Each allow-listed value MUST also contain a negation token (`never|not|n't|nunca|no `); the test fails if it doesn't, so the allow-list can't be abused.
- **Countdown guard:** any value containing `{{lo}}` MUST contain `{{hi}}`, and any value containing `{{tau_lo}}` MUST contain `{{tau_hi}}`; placeholders `{{eta}}`, `{{minutes}}`, `{{countdown}}` and a bare `{{tau}}` are forbidden; in status scope the regex `\b(in|en|within|dentro de)\s+\d+\s*(min|minutes|minutos)\b` fails, and so does any "now–" / "ahora–" range or a range that starts at 0 ("0–15"). The same guard runs over push templates, storyboard templates and `reason.*` keys.
- **Spoken guard:** keys ending `_spoken` (and `*.tts`) must not contain `–`, `—`, `\bmin\b`, `\bft\b`, `\bmi\b`.
- **Code guards** (static scans in the same test files): no `NotificationFeedbackType.Success` in `mobile/src/**` (outside tests); no status color token whose hue is 75°–165° with saturation > 25 % (no green) in `mobile/src/lib/theme.ts`. A test file that must contain a forbidden literal to check for it builds that literal by string concatenation, and repo-wide grep guards exclude test files.

**Test files and algorithm**

| File | Scans |
|---|---|
| `mobile/src/__tests__/copy-banned-test.ts` | `src/locales/en.json`, `es.json` (flattened to dotted keys); static code guards |
| `mobile/src/__tests__/i18n-parity-test.ts` | identical key sets EN/ES; every counted key has `_one`, `_other` **and** ES `_many`; no untranslated EN value inside `es.json` except an allow-list of proper nouns |
| `backend/tests/test_copy_banned.py` | `backend/fordcast/push/templates/{en,es}.json`; `backend/fordcast/replay/storyboard_templates.json`; the `storyboard[].en/.es` strings of every `data/replays/*.json.gz` (the build output that `make app-data` copies into the app); the `reason.*` keys of `mobile/src/locales/{en,es}.json` |

```ts
// mobile/src/__tests__/copy-banned-test.ts (sketch)
import en from '@/locales/en.json'; import es from '@/locales/es.json'; import B from '@/locales/banned-words.json';
const flat = (o: any, p = ''): [string, string][] => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'string' ? [[p + k, v]] : flat(v, p + k + '.'));
// JS \b is ASCII-only even with /u, so use Unicode-aware lookarounds for Spanish accents:
const word = (t: string) => new RegExp(`(?<![\\p{L}\\p{N}])${t.replace(/[-\s]/g, '[-\\s]')}(?![\\p{L}\\p{N}])`, 'iu');
const isChrome = (k: string) => B.chromeNamespaces.some((ns: string) => k.startsWith(ns));
const allowed = (k: string) => B.allowKeys.some((a: string) => a.endsWith('*') ? k.startsWith(a.slice(0, -1)) : k === a);
for (const [lang, dict] of [['en', en], ['es', es]] as const) {
  test.each(flat(dict))(`${lang}: %s has no banned words`, (key, raw) => {
    const v = raw.normalize('NFC').toLowerCase();
    const terms = [...B.global[lang], ...(isChrome(key) ? [] : B.status[lang])];
    const hits = terms.filter((t: string) => word(t).test(v));
    if (allowed(key)) expect(/\b(never|not|nunca|no)\b|n't/i.test(v)).toBe(true);
    else expect({ key, hits }).toEqual({ key, hits: [] });
  });
}
```

Python mirrors it with `re` (Python 3 `\b` is Unicode-aware for `str`), using `unicodedata.normalize("NFC", s).casefold()`. CI fails the build on any hit (§7, §24, §36).

### 3.13 Semantic haptics and sound (summary; §11 owns details)

Watch → `notificationAsync(Warning)` + soft chime; Avoid/Closed → `notificationAsync(Error)` once + alert tone; Unknown → `impactAsync(Soft)` on iOS, `performAndroidHapticsAsync(AndroidHaptics.Gesture_End)` on Android (fallback `impactAsync(Light)`; member name VERIFY BEFORE USE per §11.6), no sound; de-escalation → `impactAsync(Light)` (**never `Success`**). §11.6 is the full haptic map; this line only summarizes it. Haptics are never the only cue; every haptic pairs with visible text, and with voice in Drive Mode. Max one haptic per 1.5 s. Haptics, Sounds and Spoken alerts each have their own Settings toggle.

---

## §4. Complete feature catalog

Every FordCast feature appears **once** here with an ID. Other sections specify *how*; this section defines *what*, *which tier*, and *how we know it's done*. **This section is the single authority for tiers:** if another section tags a feature differently, this table wins and the other section is wrong. A feature specified anywhere in the prompt without an ID here is a bug in the prompt: give it an ID in its group (suffix `b`, `c`, … after the closest related ID; Roadmap additions use the suffix `r`) before you build it.

**How to read the tables**
- **Tier:** `[MVP]` must ship by the Oct 23 feature freeze; `[Stretch]` is built only after every MVP item due that day is done, **in the §6.4 Stretch queue order** (the only Stretch build order); `[Roadmap]` is documented (README "planned", GitHub issue, design note) but not built. The `Stretch-1/2/3` tags on F49–F53 are historical labels only; §6.4 sets the order.
- **Roadmap "Done when" (every Roadmap row, including F19–F21, F56, F102, F114 and all of §4.P):** a README "Roadmap / planned" row and an open GitHub issue labeled `roadmap` exist, the About → "What's built" list shows it as Planned (from `docs/CLAIMS.md`), and no UI path leads to a non-working feature.
- **Lane:** features marked *Lane B* need a paid Apple account (§1.2); everything else targets the Android dev/preview build.
- **Default claim rule:** a feature is **Built** when its "Done when" passes on a real Android phone with real live or real replayed data and the evidence is linked in `docs/CLAIMS.md` (§44); **Prototype** if it only passes on replay, a subset, a notebook or one platform; otherwise **Roadmap**. Rows only mention claim rules that differ or need emphasis.
- **Student** = student-owned core file (§1.8, §39).

### 4.A Core forecast & data bridge (backend, offline + live)

| ID | Feature · tier | Story / behavior | Done when | § |
|---|---|---|---|---|
| F1 | Crossing inventory `[MVP]` | Assemble `crossings` from 4 sources: City of Austin open data `q6kt-v2zm` (22 gate records), Travis County Low_Water_Crossings MapServer, TxGIO Low_Water_Crossing, OSM `ford=*`/`highway=ford` via Overpass (cached once), plus manual curation. Dedupe within 30 m; keep `source`, `source_ref`, `jurisdiction`. ATXfloods data only with the City's permission. Assign tier **A** (ground truth + overtop stage from a real source, F5), **B** (linked, no truth → "Estimated" badge; also any crossing whose road elevation can't be obtained), **C** (no upstream gauge → Unknown – not monitored). Raw pulls go to `data/raw/inventory/`; near-duplicates for human review to `data/review/near_duplicates.csv`; hand-added crossings to `data/overrides/manual_crossings.csv`. | `data/seed/crossings.geojson` committed with a source on every row; ≥ 10 **real** tier-A crossings (proxy-labeled crossings don't count toward this number); counts per source and the real field names logged in `docs/data-bridge-verification.md` | §16, §17 |
| F2 | Upstream gauge linking (NLDI) `[MVP]` | Snap each crossing with `hydrolocation` (prefer over `comid/position`), navigate `UT` → `nwissite`, keep gauges with active 15-min `00065`; manual override table for mis-snaps and tiny urban creeks; nearest-gauge link kept **only** as the comparison baseline; results cached in `data/nldi_cache/`; **no NLDI calls at runtime**. | `crossing_gauge_links` populated; every tier-A snap checked on a map in the notebook; Onion Ck at US 183 links Onion Ck nr Driftwood `08158700` | §17 |
| F3 | Live gauge ingest `[MVP]` | Every tick: 1 request to USGS OGC API **v1** `latest-continuous` with `X-Api-Key` and a contact `User-Agent`; gap backfill from `continuous` (`time=PT3H`); idempotent upsert keyed `(gauge_id, param_code, obs_time)`; record `received_at`; maintain per-gauge `latency_p75_min`; log `x-ratelimit-remaining`. | 24 h of green ticks; `readings` rows for every linked gauge; latency populated; quota use < 5 % | §16, §20 |
| F4 | Storm archive `[MVP]` | Backfill 15-min stage for the bundled storms `halloween-2013` (Onion Ck; includes the real US 183 gauge outage), `memorial-day-2015`, `halloween-2015`, `july-2025` (USGS-only; LCRA is optional enrichment, F19), plus `oct-2018` as a "should stay calm" control, and the **`calm-2024` calm-day set** (≥ 30 non-flood days sampled by the documented rule in §16.19; truth = no overtop; feeds false alarms per crossing per 100 calm days and ML calm sampling); always pass `time` (≤ 3-year windows); Parquet + `meta.toml` + sha256 per storm. Each `meta.toml` lists documented **transmission outages** `outages = [{site, start, end}]` (e.g. the 2013 US 183 gauge, ~11:15–13:45Z, confirmed by smoke check S3). A storm is bundled only if its data checks pass. Parquet files > 5 MB go to Supabase Storage via `make data-upload` and are listed in `data/MANIFEST.json`. | `uv run python -m fordcast backfill --storm <id>` reproduces each file (sha256 matches `data/MANIFEST.json`); a notebook plots upstream vs. target stage for one storm; a clean clone fetches the Storage-hosted files with `make data-fetch` | §16, §19 |
| F5 | Ground truth labels `[MVP]` | Overtop stage per tier-A crossing from NWS impact statements (NWPS `flood.impacts`) → City/County data → documented proxy (action stage or P99) tagged `truth_quality='proxy'` and reported separately; overtop episodes (gaps < 60 min merged) → `ground_truth_events`. For the `gauge` truth class, the **road elevation** comes from, in order: (1) NWS NWPS impact statements or flood categories that name the crossing; (2) City low-water-crossing gate data; (3) the USGS 3DEP 1 m DEM via `py3dep` (HyRiver; VERIFY BEFORE USE with `pip index versions py3dep`; it lives in the tools environment because its pins conflict with the backend's `pynhd`, §5.3), converted to the gauge datum with the USGS site datum metadata (NAVD88/NGVD29 offsets). If none is obtainable, the crossing is tier B (proxy), labeled honestly. Truth is readable **only** inside `fordcast/scoring`. | `truth.csv` per storm; `data/overrides/overtop_stages.csv` names the source of every value; static test proves no module outside `fordcast/scoring` imports labels or reads ground truth | §17, §18 |
| F6 | Travel time τ — **Student** `[MVP]` | Per (gauge → crossing) link and storm: 5-min clock, smoothed clipped first differences, normalized cross-correlation 0–240 min, reject r < 0.5, parabolic peak refinement; combine storms → median, P25, P75, `n_storms`; celerity sanity 0.5–6 m/s else `needs_review`. | Synthetic lags 35/40/45 min recovered within ±1 min; real links stored; `docs/explain/travel_time.md` with the student's answers | §18, §39 |
| F7 | Trigger & watch stages `[MVP]` | Learn trigger stage h\* per link (upward crossings with rise > 0.10 ft/30 min; maximize event-F2 subject to FAR ≤ 0.5 on **training** storms); watch stage = baseline + 0.6 (h\* − baseline); re-learned inside each leave-one-storm-out fold. | Values stored in `crossing_gauge_links`; unit tests on synthetic storms | §18 |
| F8 | Baseline rule — **Student** `[MVP]` | Official closed → CLOSED; target gauge ≥ overtop → CLOSED; all stale → UNKNOWN; upstream above trigger and rising → AVOID with a bucketed window; above watch and rising → WATCH; else NO_RISE. Emits reason codes. | Unit tests cover every branch and the window buckets; the hero replay shows NO_RISE → WATCH → AVOID before onset | §18, §39 |
| F9 | Hysteresis state machine `[MVP]` | Escalate immediately; de-escalate one level after dwell (AVOID 6 ticks, WATCH 12, CLOSED 6 after the official lift); AVOID→WATCH also needs the trigger gauge falling; UNKNOWN on stale; persisted in `private.risk_tracker`. | Hypothesis property tests: immediate escalation, one-level de-escalation, UNKNOWN on stale, ≤ 2 transitions/hour under ±0.1 ft noise | §3.2, §18 |
| F10 | Precedence & official status `[MVP]` | `resolve_raw_state` exactly as §3.3. `OfficialStatusSource` is pluggable: `manual` (MVP, labeled "Manual entry"), ATXfloods (**only after written City permission**; never scrape), County feed if one exists; official data older than 15 min is ignored. If no feed, every Crossing detail links to atxfloods.com as "Official status". | A test per precedence row; the manual source shows CLOSED · OFFICIAL in the app with its label | §3.3, §16 |
| F11 | Staleness → UNKNOWN `[MVP]` | Server: per-gauge `stale_after_min`; snapshot `data_status` live/degraded/offline. Client: the 20-minute rule and "last known" display (§3.4). | Fake-clock tests on both sides; airplane-mode device test shows dashed Unknown + "Last known" after 20 min | §3.4, §18, §28 |
| F12 | Backtest & verification — **Student** (`scoring/metrics.py`) `[MVP]` | Leave-one-storm-out; episodes taken **after** hysteresis; hit if an episode starts in [onset − 180 min, onset]; POD, FAR, CSI, median lead (IQR), % hits with lead ≥ 15 min, false alarms per crossing per 100 calm days (from `calm-2024`); comparators: reactive (lead 0), nearest-gauge, upstream rule, ML (if any); 1,000-sample bootstrap CIs over storms. `make backtest` writes `docs/results/results.json`, `results.md` and figures, then `tools/select_hero.py` fills `results.json.hero` by the **pre-registered rule**: the tier-A crossing hit whose lead time is closest to the overall median lead time, within a bundled storm (ties: earlier storm in catalog order, then smaller crossing id). Never the maximum. | Reproducible from a clean clone; CI runs a one-storm smoke on every push and `make backtest CHECK=1` (full LOSO compared against the committed `results.json`); README/app/video numbers come only from `results.json` (grep finds no hand-typed metric literals); the README states the hero rule | §18, §40 |
| F13 | Nearest-gauge comparison (the Q4 story) `[MVP]` | Run the nearest-gauge rule through the same backtest and extract one concrete storyboard example ("nearest gauge flagged X on a different creek / missed Y"). | Comparator row in `results.json`; example rendered in `docs/results/results.md` for the student's Q4 | §18, §38 |
| F14 | "Why this alert" reasons `[MVP]` rule codes + client templates · `[Stretch]` SHAP | Every WATCH/AVOID/CLOSED/UNKNOWN carries structured reason codes (`UPSTREAM_ABOVE_TRIGGER`, `UPSTREAM_RISING`, `WATER_AT_ROAD`, `OFFICIAL_CLOSED`, `OFFICIAL_CAUTION`, `DATA_STALE`, `NO_UPSTREAM_GAUGE`, `HOLDING`, `CLOSURE_LIFTED`; Stretch: `RAIN_OVER_BASIN`, `NEAR_ROAD_RISING`), rendered on the phone from the §3.7 `reason.*` EN/ES templates and their `_spoken` siblings; travel time appears only as the `{{tau_lo}}–{{tau_hi}}` range; ML top-3 SHAP contributors mapped to codes when ML is live. | Snapshot validation: every non-NO_RISE crossing has ≥ 1 reason; every code has EN + ES + spoken templates that pass the banned-words and countdown guards | §3.7, §3.11, §18.10 |
| F15 | ML classifier `[Stretch]` | `HistGradientBoostingClassifier(monotonic_cst=…)` per horizon 30/60/90 + `CalibratedClassifierCV(FrozenEstimator(...))` on held-out storms; thresholds from out-of-fold predictions; combined by `max(rule, ml)` only; model card; reliability diagram; Brier skill score. | `models/<v>/card.json`, `docs/figures/reliability_p60.png`, comparison table in `results.md`. **Claim: Prototype until it beats the rule in LOSO** (higher CSI at equal-or-lower FAR); if it doesn't, the README says the rule won and the app says "forecast rule learned from past storms", never "machine learning" | §18 |
| F16 | NWPS flood categories & impacts `[MVP]` offline · `[Stretch]` display | USGS→NWS LID crosswalk via `GET /gauges/{usgs_site}`; store categories and impact statements (feeds F5); show "NWS flood stage" lines on the hydrograph and gauge card. | ATIT2 categories 15/17/23/27 ft stored; display on full detent | §16 |
| F17 | NWS alerts context banner `[Stretch]` | Poll `api.weather.gov/alerts/active` (zone/point; contact `User-Agent`); key on CAP `id`, `references`, `messageType`, `event`, `expires` — **not VTEC**; Flash Flood Emergency = Flash Flood Warning with damage threat CATASTROPHIC (VERIFY BEFORE USE: JSON location); English product name + Spanish gloss; **context only, never changes a crossing state**. | Banner renders from a recorded real alert; ES gloss; feed outage > 10 min shows an "NWS alerts unavailable" note | §3.7, §16 |
| F17b | NWS area-alert map layer `[Stretch]` | Active NWS flood-alert polygons drawn as a 1 pt dashed outline (no fill) with the English product name + Spanish gloss; toggled in the Layers sheet (F38), off by default; **context only, never changes a crossing state**. | Renders a recorded real alert polygon; toggle persists; no crossing changes state | §9.8, §13.6, §16.7 |
| F18 | Basin rainfall `[Stretch]` | Quick path: Open-Meteo `minutely_15` per basin centroid (non-commercial, CC BY; VERIFY param names). Full path: MRMS `RadarOnly_QPE_01H` live + `MultiSensor_QPE_01H_Pass2` for training (AWS from 2020-10-14; IEM archive before; 2013 is gauge-only); basin masks from NLDI basins; features + `RAIN_OVER_BASIN` reason. | Basin rain in snapshot reasons. **Claim "radar rainfall" only if MRMS is ingested**; Open-Meteo is described as "model rainfall estimate" | §16, §18 |
| F19 | LCRA Hydromet `[Roadmap]` (one-time historic CSV for the July 2025 Sandy Creek replay = `[Stretch]` **only with LCRA permission**) | Never depend on undocumented LCRA endpoints during judging. The bundled `july-2025` replay is USGS-only and says so. | Roadmap: README row + `roadmap` issue. Stretch part: permission email on file before any download | §16 |
| F20 | NWM "tonight's outlook" `[Roadmap]` | NWPS reach `short_range` streamflow as an hours-ahead outlook; experimental, never the core signal. | README Roadmap row + GitHub issue exists (§4 Roadmap rule) | §16 |
| F21 | HAND-based overtop stages for tier B/C `[Roadmap]` | Estimate road-overtop stage where no ground truth exists. | README Roadmap row + GitHub issue exists | §18 |

### 4.B Backend platform

| ID | Feature · tier | Behavior | Done when | § |
|---|---|---|---|---|
| F22 | Tick orchestration `[MVP]` | Supabase `pg_cron` `*/5 * * * *` → `pg_net` POST `/internal/tick` with `X-Tick-Secret` (Vault); FastAPI returns **202**, runs the tick in the background under a lease row (lease interval **6 min**; tick hard timeout **240 s**); GitHub Actions watchdog `7-59/15 * * * *` calls the same idempotent tick and **skips** when a lease is held. Production data is loaded with `make seed-prod` (psql + `DATABASE_URL`), and `make model-live VERSION=<v>` sets `model_versions.is_live` (the baseline rule version is live by default). | `cron.job_run_details` shows runs; overlapping tick is skipped; a tick that runs past 240 s is cancelled and logged; `private.ingest_runs` logs every run; production DB seeded and exactly one live model version | §20, §21 |
| F23 | Snapshot read path `[MVP]` | Each tick rewrites `snapshots/current.json` (`fordcast.snapshot.v1`) in a public Storage bucket with `cache-control: 30`; `GET /v1/risk/current` serves the identical schema with `ETag = seq`. | The app shows live risk with the Render service stopped; UptimeRobot keyword check on `"data_status":"live"` | §20, §22 |
| F24 | Realtime updates `[MVP]` (cut → 60 s snapshot polling) | `postgres_changes` on `risk_current`; rows written **only** on meaningful change; client refetches the snapshot on reconnect/`CHANNEL_ERROR`. Lifecycle: a `closedByUs` flag (or `AbortController`) marks channels the app closed itself; cleanup and error paths never trigger the auto-resubscribe; reconnect with backoff happens only on an **unexpected** `CLOSED`/`CHANNEL_ERROR` while the app is foregrounded. | Escalation visible on the phone ≤ 10 s after the tick; an identical upsert writes 0 rows (test); unmounting the screen never causes a resubscribe (test) | §20, §21, §28 |
| F25 | REST API `/v1` `[MVP]` subset · `[Stretch]` rest | MVP: `health`, `meta/freshness`, `risk/current`, `crossings`, `crossings/{id}`, `gauges/{id}/series`, `replays`, `replays/{id}`, `devices` CRUD. Stretch: `route`/`route/check`, `search`, `crossings/{id}/history`, `GET /v1/styles/fordcast-night.json` (the same style is always bundled in the app at `mobile/assets/map/fordcast-night.json`). RFC 9457 errors, per-IP limits, strict validation (Texas bbox, ≤ 500 route points). `POST /v1/route` takes replay requests as flat `replay_at` + `storm_id` fields (§22.5 is the contract; clients mirror it exactly). | Contract + API tests green; OpenAPI at `/docs` | §22 |
| F26 | Observability, retention & remote config `[MVP]` | healthchecks.io ping after each successful tick (`/fail` on error); UptimeRobot on `/v1/health` and the snapshot; Sentry (`send_default_pii=False`); structlog one line per tick; retention cron jobs; `app_config`: `banner_en/es`, `min_app_version`, `kill_switch_push`, `demo_mode_default`. | A deliberately failed tick alerts the student's phone; a banner edit appears in the app without a release | §20, §24 |
| F27 | Device registry & crossing-ID subscriptions `[MVP]` | `POST /v1/devices` returns `device_id` + `device_secret` once (secret kept in `expo-secure-store` — VERIFY BEFORE USE: SDK 57 pin via `npx expo install`; fallback kv-store); subscriptions are **explicit crossing IDs only**, computed on the phone: saved crossings (`starred`, MVP, F46), crossings ≤ 300 m from a saved route and crossings within a saved place's radius chip (1 / 3 / 5 mi; default 3 mi = 4,828 m; both Stretch F51). The device computes the IDs; the server never sees a radius, a coordinate or a place. Each subscription carries `want_watch` (default false). Nearby alerts while moving come **only** from on-device geofences and local notifications (§30.3), never from server-side location data. `DELETE /v1/devices/{id}` forgets everything; 90-day inactivity delete. | DB inspection shows no coordinates anywhere; subscription reasons are only `saved_route`, `saved_place`, `starred`; "Delete my alert data" empties the device's rows | §23, §24 |

### 4.C Map Home

| ID | Feature · tier | Story / behavior | Done when | § |
|---|---|---|---|---|
| F28 | Night map `[MVP]` | *As a driver at night, I see which crossings near me need attention at a glance.* MapLibre RN **11.5.0 (v11 API)** + OpenFreeMap vector tiles + "FordCast Night" style; Austin camera, no pitch/rotate, attribution on; crossings `GeoJSONSource` with **max-rank clustering** (a cluster containing an Avoid is red) and pre-colored state sprites from `mobile/assets/map/markers/` drawn with `<Layer type="symbol">`; creek base layer; gauge dots (positions from the bundled `gauges.geojson`, F86); user puck; `contentInset` above the sheet; map labels in **Noto Sans** only. | Renders on the Android dev build; cluster color test with an Avoid inside; night-brightness review screenshot in `docs/` | §29 |
| F29 | Style generator & fallbacks `[MVP]` | `make style` runs `tools/make_style.py` to recolor OFM Positron (`tools/vendor/positron.json`) → `mobile/assets/map/fordcast-night.json` (committed and bundled; serving it from `GET /v1/styles/fordcast-night.json` is part of F25 `[Stretch]`) and `mobile/assets/map/fordcast-night-minimal.json` (bundled offline fallback if tiles fail). | Style JSON regenerates byte-identically; airplane-mode launch shows land/water/crossings without crashing | §12.2, §29 |
| F30 | Persistent map sheet + Area Status Card `[MVP]` | gorhom `BottomSheet` (non-modal) `snapPoints={[148,'45%','88%']}`, `enableDynamicSizing={false}`, adapted from gorhom's MIT map example; nearby list sorted by severity then distance; area headline = worst nearby state; buttons **Check my drive** / **Drive Mode**; footer slogan; calm extras (Replay invite, How it works). Fallback if the Day-1 device test fails: formSheet-only layout. | Day-1 device test logged; sheet never covers the focused element (WCAG 2.4.11) | §12, §13 |
| F31 | Status component set `[MVP]` | `StatusChip`, `StatusGlyph` (SVG, identical on both OSes), `CrossingMarker` sprites, `RiskRing` (Skia), `RiskWindow`, `EtaRangePill` (lo = 0 → "Water may already be on the road"), `FreshnessBadge` ("Checked {age}"), banners, `DisclaimerFooter` — 4-way encoding per §3.2. Marker sprites are generated by `make markers` (`tools/make_markers.py`, Pillow) into `mobile/assets/map/markers/`: `ic-norise`, `ic-watch`, `ic-avoid`, `ic-closed`, `ic-closed-official`, `ic-unknown`, `ic-unknown-lastwatch`, `ic-unknown-lastavoid`, `ic-unknown-lastclosed`, `ic-flow-arrow` (each `@2x` and `@3x`; §10.9). | Render tests for 5 states × sizes × official/replay/last-known; grayscale screenshot: every state distinguishable by shape + word | §9, §10.9, §12 |
| F31b | Dev gallery `[MVP, __DEV__ only]` | Route `dev/gallery` (Redirect outside `__DEV__`): font probe, type scale, colors with live contrast numbers, icons, every status component × 5 states × sizes, marker sprites, banners, target-size overlay; screenshot source for CVD renders and the comprehension-test cards. | Renders every component state without warnings; absent from preview builds | §12.7 |
| F32 | Animated risk cues `[MVP]` | Avoid halo (≤ 20 `Marker` views, 3 cycles or 6 s then static); rising-creek dash flow; static fallbacks under Reduce Motion or the in-app Animations toggle; ≤ 2 loops on screen. Live water-pulse along rising reaches is `[Stretch]`. | Toggling Reduce Motion while running stops loops without restart | §11, §29 |
| F33 | Legend `[MVP]` | "?" opens a sheet with all 5 states + REPLAY: marker, chip, meaning, and "FordCast never says a road is safe." | Reachable in ≤ 1 tap from Map Home; screen-reader readable | §13 |
| F34 | List alternative `[MVP]` | Map/List toggle; rows read "Name. State, window. Updated age."; List is the default when a screen reader is on. | VoiceOver/TalkBack task "find a crossing's status" passes with screen curtain | §13, §34 |
| F35 | Freshness & connectivity UI `[MVP]` | FreshnessPill "Checked {age}" (check age; the word "Live" never appears alone) plus the Crossing Card's "Newest gauge reading: {age}" (reading age); OfflineBanner ("Offline · showing data from 10:42 PM"); degraded banner; `app_config` banner; `min_app_version` update notice. | Each state reproduced in a test or on device with screenshots; a fixture with a 55-min-old reading behind a 2-min-old check shows both ages | §3.4, §13 |
| F36 | In-app alert banner `[MVP]` | On escalation of a crossing in view or saved: top banner, Avoid/Closed persist until tapped; announcement per §34 (≤ 1 per 10 s, merged). The camera never moves on its own. | RNTL test + device check of announce levels | §13, §34 |
| F37 | Search `[MVP]` crossings · `[Stretch]` places | Search crossings by name/road/creek locally (works offline); places via F53. | Finds a crossing by creek name offline | §13 |
| F38 | Map controls `[MVP]` · Layers sheet `[Stretch]` | Locate me, zoom ± buttons (gesture alternative), list, gear, legend; Layers sheet toggles creeks, gauges, not-monitored crossings, NWS area alerts (F17b). | All controls ≥ 48 pt with labels | §13, §29 |
| F38b | Controls on left `[Stretch]` | Settings → Accessibility → "Controls on left" mirrors the floating map control cluster to the left edge (left-handed use). | Toggle mirrors the cluster live; nothing overlaps the sheet or the attribution | §8.6, §13.16 |
| F39 | Gauge mini-card `[Stretch]` | Tap a gauge dot → stage, 30-min rise, trigger, NWS categories, data age. | Opens from map and from the crossing's upstream list | §13 |
| F40 | Calm-day state `[MVP]` | The app on a dry day looks complete and alive without implying safety: area headline, gauges watched, freshness breathe, Replay invite, creeks at 50 % cyan. | Dry-day screenshot reviewed against §13; no empty panels; 0 banned words | §3.7, §13 |
| F41 | Platform chrome (glass) `[Stretch]` | iOS 26 Liquid Glass on floating chrome only (gated by `isLiquidGlassAvailable()` and Reduce Transparency); Android solid `rgba(14,23,38,0.92)`; `NativeTabs.BottomAccessory` replay/drive mini-player on iOS 26. **MVP uses solid surfaces on both platforms.** (The JS mini-bar elsewhere is F78b.) | Platform screenshots; no glass on content | §8, §10 |
| F42 | Themes `[MVP]` dark + high-contrast set · `[Stretch]` light | Dark default (night-first); HC tokens under Increase Contrast/High Text Contrast; Drive Mode always `#070D18`; optional light theme. | Contrast script passes for every theme | §9 |

### 4.D Crossing detail

| ID | Feature · tier | Story / behavior | Done when | § |
|---|---|---|---|---|
| F43 | Crossing detail sheet `[MVP]` | *As a driver, I tap a crossing and learn in one glance what's happening, how soon, why, and what to do.* Expo Router formSheet `crossing/[id]`, detents 0.32/0.62/1.0, grabber, largest-undimmed = 1. **Peek:** chip, name, headline/window, check age + newest gauge reading age (§3.4), pinned actions **Notify me** (MVP) · **Detour** (Stretch F50) · **Share** (Stretch F48); until a Stretch action ships, its button is absent (never a dead button). **Half:** RiskRing, RiskWindow, upstream sparkline + rise + trigger, "Why" (F14, travel time as a range). **Full:** linked upstream gauges (stale chips), hydrograph, official status row (or ATXfloods link), model/version, tier badge ("Estimated" for B), disclaimer footer. Official-closure and Unknown variants per §3.7. | Render tests for all 5 states + official + tier B + Unknown(not monitored); opens from marker, list, notification and deep link | §13 |
| F44 | Deep links `[MVP]` | `fordcast://crossing/<id>`, `fordcast://replay/<stormId>`, `fordcast://drive`; cold start from a notification tap. | Each link opens the right screen from a killed app | §28, §31 |
| F45 | Hydrograph + text alternative `[MVP]` | victory-native 42 hydrograph (6 h, trigger line, now dot, rate badge); "Show readings" list of the last 12 values; lag-pair view in Replay (live full-detent lag-pair `[Stretch]`). | Chart a11y label + readings list pass screen-reader check | §13, §34 |
| F46 | Notify me (saved crossings) `[MVP]` | Per-crossing toggle saves it locally (saved crossings are MVP; places/routes are Stretch F51) and syncs crossing-ID subscriptions (`reason: starred`); separate per-crossing Watch opt-in sent as `want_watch` (default off). | Toggle updates server subscriptions; works offline and syncs later | §23, §31 |
| F47 | Update log `[Stretch]` | Timestamped state changes from `/v1/crossings/{id}/history`. | Shows the last 24 h for a crossing that changed | §13, §22 |
| F47b | 7-day state timeline `[Stretch]` | Crossing detail "History" tab: a compact 7-day strip of past states (shape + color + word per segment) from the same history endpoint. | Renders a crossing with ≥ 2 changes in 7 days; screen reader reads it as a list of changes | §13.8, §22 |
| F48 | Share `[Stretch]` | System share sheet with the one share text `share.crossing` (§3.7): "{name}: {state} — FordCast forecast (experimental), as of {time}. Obey barricades and official warnings. Never drive into water." + deep link `fordcast://crossing/<id>`. | Shared text passes the banned-words test in EN and ES | §3.7, §13 |

### 4.E Check My Drive & routing (Stretch; build order in §6.4)

| ID | Feature · tier | Story / behavior | Done when | § |
|---|---|---|---|---|
| F49 | Route check `[Stretch-1]` | *Before I leave, I want to know if any crossing on my route is a problem.* From (current location/saved place) → To (search/saved); backend `POST /v1/route` (ORS baseline) returns crossings on the route; on-device Turf 7.4 re-check (40 m tolerance; `totalDistance`/`pointDistance` property names); verdict per §3.3; unknown crossings listed; offline: "Routing needs internet. Showing crossings on your last route." | Device test with `replay_at` + `storm_id` (§22.5) showing an Avoid on the route on a dry day | §32 |
| F50 | Detour `[Stretch-1]` | ORS `avoid_polygons` (MultiPolygon, 75 m circles → 150 m retry) around Avoid/Closed crossings within 2 km of the route; Stadia Valhalla `exclude_polygons` fallback on 403/429/5xx; `detourAddedMin`; "No detour found that avoids {name}. Wait or choose another destination."; 5-min cache; ORS/OSM attribution. | Detour avoids the crossing in a recorded test; **claim "reroutes you" only after an in-app device test** | §32 |
| F51 | Saved places & routes `[Stretch-2]` | Home/School/Work/custom (≤ 10, radius chip 1 / 3 / 5 mi, default 3 mi = 4,828 m) and saved routes in SQLite; the **phone** turns them into crossing IDs (crossings within the chosen radius of a place, ≤ 300 m from a route line) and syncs only those IDs (F27). The server never sees the radius or any coordinate. Never asks twice (WCAG 3.3.7). | Saved items survive restart; subscriptions update; a request log shows no coordinates or radius | §28, §31.4, §32 |
| F52 | Place search (geocoding) `[Stretch-2]` | Backend `/v1/search`: ORS Pelias autocomplete → Photon → `expo-location.geocodeAsync`; the request **never includes the user's location**: the search is biased with a fixed Austin-area constant (Travis County bounding box / center, defined once in §16.13); debounce 350 ms, ≥ 3 chars, recents first (recents stay on the phone, F84); long-press reverse geocode. | Finds a school by name; falls back when ORS returns 429; a request log shows no user coordinates | §16.13, §22.6, §32 |
| F53 | Nav-app hand-off `[Stretch-3]` | Google Maps URL with `waypoints=` (≤ 3, no `dir_action` when waypoints exist); Apple Maps unified URL with `waypoint` (iOS 18.4+; the version check parses major and minor as integers, `const [maj, min] = String(Platform.Version).split('.').map(Number)`, never `parseFloat`) or legacy two-leg; Waze two-leg via a via-point + local notification at the via point; hand-off warning copy (§3.7). | Each link opens the target app with the via point on device | §32 |
| F54 | Replay routing `[Stretch]` | A route request with `replay_at` + `storm_id` (§22.5) is checked against replay states so the demo can show a detour on a dry day; result bannered REPLAY and never cached with live results. | Video segment uses it with banner visible | §32, §33 |
| F55 | Live route re-validation `[Stretch]` | Re-check when a crossing within 2 km changes (Realtime) and every 5 min in Drive Mode; banner "Route status changed · {time}". | Simulated state change triggers the banner | §32 |
| F56 | Departure-time re-check `[Roadmap]` | Local reminder 30 min before a saved route's usual departure. | README Roadmap row + GitHub issue exists | §32 |

### 4.F Drive Mode

| ID | Feature · tier | Story / behavior | Done when | § |
|---|---|---|---|---|
| F57 | Drive Mode screen `[MVP]` | *While driving, FordCast speaks and shows one big thing so my eyes stay on the road.* fullScreenModal, `#070D18`, status ≥ 32 pt, secondary ≥ 24 pt, targets ≥ 76 pt with ≥ 24 pt gaps, ≤ 120 characters, keep-awake, no typing/scrolling/map gestures; shows the nearest at-risk crossing ahead (heading-based; RouteRibbon of the next 3 when a route exists `[Stretch]`); buttons Detour (if route, Stretch F50) · Repeat · Mute · End; start copy "Mount your phone…". MVP is foreground and **portrait**; landscape Drive Mode is Stretch F94. Designed to follow NHTSA visual-manual guidelines (never "NHTSA-compliant"). | Maestro + manual check: no text input reachable; target sizes measured | §13, §30 |
| F58 | Spoken alerts EN/ES `[MVP]` | `expo-speech` voice selection (es-US → es-MX → es-419 → any es; prefer Enhanced; never hard-code names), rate 0.95 (slider 0.8–1.2); `expo-audio` chime with `duckOthers` + `playsInSilentMode` before TTS; speaks on escalation / new at-risk crossing ahead / state change, ≤ 1 per crossing per 60 s; tips for silent switch and missing Spanish voice; falls back to tone + haptic + visual. | Device test EN and ES with music playing, logged | §30, §35 |
| F59 | Driver lockout + passenger mode `[MVP]` | Outside Drive Mode, speed ≥ 4.5 m/s for ≥ 5 s locks text entry and list browsing (this lockout threshold is separate from the F62 suggestion trigger); "I'm a passenger" = 1.5 s hold-to-confirm (cancellable, with an a11y action), per trip; relocks after < 1 m/s for 3 min or relaunch; never offered inside Drive Mode. | Unit test with simulated speeds; device check | §30 |
| F60 | Repeat last alert `[MVP]` | iOS magic tap (two-finger double-tap); big Repeat button on both platforms. | Works with VoiceOver and TalkBack | §34 |
| F61 | Auto-end `[MVP]` | 10 min stationary → spoken prompt, then end. | Simulated-location test | §30 |
| F62 | Drive suggestion & motion detect `[Stretch]` | Foreground speed threshold (median speed > 6.7 m/s over 15 s, using only fixes with accuracy < 50 m) or `watchMotionActivityAsync` automotive (VERIFY on device) → one giant banner "Driving? Switch to Drive Mode" (`drive.suggest`). Never auto-starts. Separate from the F59 lockout threshold. | Banner appears in a drive test | §30 |
| F63 | Background continuation `[Stretch]` | `startLocationUpdatesAsync` (started while foregrounded) with Android foreground service, `pausesUpdatesAutomatically: false`, `showsBackgroundLocationIndicator: true`; stops at destination, stationary, or End. | Alert fires while Google Maps is in front (logged drive test) | §30 |
| F64 | Focus / Do Not Disturb guidance `[MVP]` | Copy + Settings deep link (`Linking.openSettings()`) explaining Time Sensitive under Driving Focus; never requests DND bypass; no full-screen intents. | Device test result recorded (Lane B for iOS) | §31 |
| F128 | Replay drive — "Drive this storm (simulated)" `[MVP]` | *On a dry day, a judge can see Drive Mode react to a real storm, honestly labeled.* From the Replay player overflow, `replay.drive_cta` opens Drive Mode with `mode: 'replay'`. The violet REPLAY banner **and** the "SIMULATED DRIVE" label (`replay.simulated_drive`) stay visible in every frame. `ReplayDriveSource` (same `LocationSource` interface as the real GPS source) moves a position at ~15 m/s along a real road polyline (a §32 route result when available, else a crossing-approach path generated with `@turf/along`). Risk comes from the bundled replay timeline (`stateAt`, binary search, §33.4). Speech, chimes, haptics and the RouteRibbon behave exactly as in a live drive. **No** geofences, **no** server pushes, **no** writes to the live cache or the live Alerts inbox; the only notification allowed is the REPLAY-prefixed local one (§3.8). | Device test logged: the AVOID approach gives chime → EN TTS and ES TTS → haptic, in portrait (and landscape once F94 ships), with both labels visible in every frame; Maestro `drive-replay.yaml` reaches the AVOID HUD on the preview APK; Claims Ledger row "Drive Mode demo on a replayed storm (simulated drive)" (§44) gated on this test | §30.4, §30.7, §33.8, §41 |

### 4.G Alerts, notifications & geofencing

| ID | Feature · tier | Story / behavior | Done when | § |
|---|---|---|---|---|
| F65 | Notification foundation `[MVP]` | `setNotificationHandler`; channels `crossing-urgent`, `crossing-watch`, `updates`, `drive-mode` created at startup **before** any permission request; permission asked in context (after saving or "Alert me"); EN/ES channel names. | Android 13+ prompt appears only after a channel exists | §3.8, §31 |
| F66 | Local alerts `[MVP]` | Foreground escalations for saved/nearby crossings raise a local notification + banner; Replay (player or F128 Replay drive) can raise a local demo notification on the `updates` channel whose body starts "REPLAY — not a live alert:" (`replay.notify_body`, §3.8). | Device test with a manual-source escalation; a replay demo notification never lands on `crossing-urgent` (test) | §3.8, §31 |
| F67 | Remote push — Android `[MVP]` | Expo push token in the dev/preview build (FCM credentials); server fan-out per §3.8 policy (escalation only, cooldowns, caps, bundling, ttl 1800, collapse per crossing); receipts after ≥ 15 min; `DeviceNotRegistered` → token removed; exactly one passive `update` when a pushed crossing reaches `no_rise`. `[Stretch]` part: the Unknown push for saved routes during an active NWS warning (§3.7, §23.2). | A real escalation (manual source) pushes to a real Android phone; claim "push alerts on Android" only | §23, §31 |
| F67b | Push anomaly guard `[Stretch, off by default]` | If more than 50 % of monitored crossings escalate in one tick, hold pushes for that tick, report a Sentry error tagged `push_anomaly`, and keep everything in-app. Enabled only after replaying every bundled storm shows it never trips on a real event. | Replay of every bundled storm with the guard on: 0 trips; a synthetic all-crossings spike trips it (test) | §23.8 |
| F68 | Remote push — iOS + time-sensitive `[Stretch, Lane B]` | APNs via EAS credentials; entitlement `com.apple.developer.usernotifications.time-sensitive`; Avoid/Closed `time-sensitive`, Watch `active`, updates `passive`. | Test push on a real iPhone incl. under Driving Focus | §31 |
| F69 | Actionable notifications `[Stretch]` | Category `crossing-alert`: Show detour · Details · Mute 1 h; re-registered on language change. | Each action routes correctly from background | §31 |
| F70 | Background geofence alerts `[Stretch]` | Task defined at module top level (`src/tasks/geofence.ts`, imported in `index.ts` before `expo-router/entry`); rotation iOS 19 crossings + 1 re-rank fence; Android: the OS limit is 100, FordCast's default cap is **60** for battery (configurable up to 100; a recorded deviation from the decision sheet's 100, §1.2 D5); radius 1,000 m; ignore Enter events within 10 s of registration; 30-min de-dup; uses cached risk with age label; stops when there are 0 candidates. | Logged real-world drive test with a geofence notification; **claim "alerts in the background" only after this** | §30 |
| F71 | Alerts inbox `[MVP]` | History of alerts (local log + received pushes) with All / On my routes / Nearby filter; outcome line only if official data exists; tab badge = unread Avoid/Closed; empty state "No alerts yet…" (never "all clear"). | Inbox lists replay-demo and live alerts with timestamps | §13 |
| F72 | Send test alert `[MVP]` | Settings → Notifications → "Send a test alert" posts "This is a test. No crossing has changed." on each channel. | Works on the preview APK | §31 |
| F73 | Quiet hours `[Stretch]` | Watch, `update` and Unknown pushes are suppressed during quiet hours (never sent late, §23.3); Avoid/Closed ignore quiet hours for saved routes, saved places and saved crossings. | Server test with a device in quiet hours covering each subscription reason and each level | §3.8, §23.3 |
| F74 | Background refresh `[Stretch]` | `expo-background-task` (≥ 15 min, inexact) refreshes the snapshot → SQLite → geofence re-rank; data-only push as a hint. | Log shows background runs on device | §28, §30 |

### 4.H Storm Replay

| ID | Feature · tier | Story / behavior | Done when | § |
|---|---|---|---|---|
| F75 | Replay engine `[MVP]` | One `fordcast/tick.py::tick(now, source, official, state, model)` for live and replay (§19.6); `StormReplaySource` returns only readings with `available_at ≤ now`, where `available_at = obs_time + delay[gauge]`; `delay[gauge]` = the measured live `latency_p75_min` once `latency_n ≥ 50`, else **60 min** (conservative satellite default; §19.4). Measured delays are frozen in the committed `data/latency/gauge_latency.json` (written by `make latency`); replay builds and CI `replay-verify` read that file, never the live DB. **Documented transmission outages** from `meta.toml` (`outages = [{site, start, end}]`): any reading whose `obs_time` falls inside an outage window gets `available_at = max(obs_time + delay, outage_end)`, so the replay shows UNKNOWN for that gauge's crossings during the outage even though today's archive holds the readings; a true gap in the archive also yields UNKNOWN. Raises `LookaheadError`; deterministic (300 s step, sorted IDs, `random_state=0`, sorted JSON keys). The 15-min delay appears only as a row of the delay-sensitivity table (§18.12). | Tests pass: **prefix invariance**, **future poison**, source-rejects-lookahead, latency-respected, **outage-respected** (a reading inside an outage window is invisible until `outage_end`), pipeline-can't-import-truth; golden sha256 per storm verified in CI | §19 |
| F76 | Timeline builder & bundling `[MVP]` | `fordcast.replay.v1` gzipped JSON (≤ 150 KB/storm; events only; `metrics` and `storyboard` generated by code) → `make replays` (`tools/build_replays.py`) writes `data/replays/<id>.json.gz` + `index.json` (and, with `--upload`, the Storage mirror); `make app-data` copies them into `mobile/assets/replays/` and generates `mobile/src/features/replay/assets.ts` (static requires); app prefers a newer sha from Storage when online. | CI regenerates and matches the committed hash; Replay plays in airplane mode | §19, §33 |
| F77 | Replay picker `[MVP]` | *As a judge, I can pick a real storm and watch FordCast react.* Storm cards (EN/ES name, date, crossings scored, median lead from JSON) + "Results & methodology". | Lists every bundled storm offline | §33 |
| F78 | Replay player `[MVP]` | Violet REPLAY banner always visible; sim clock on a Reanimated shared value; Play/Pause; speeds 1× · 10× · 30× · **60× (default)** · 120×; ±5 min step buttons; `adjustable` scrubber; event ticks ▲ Watch ◆ Avoid ● water over road ▮ official closure; "Jump to next event"; "Skip to action" (30 min before the first WATCH); sparkline draws only samples that FordCast had at simT (`t + delay ≤ simT`, and never inside a documented outage before its end; §19.11 carries the outage windows); state at simT by binary search (never interpolated); crossings whose linked gauges all went silent show UNKNOWN (e.g. Onion Ck at US 183 in 2013: "the gauge went silent; its readings only arrived later", `replay.gauge_silent`); header states the assumed data delay; "no lookahead" info badge. | Maestro flow plays to the result screen offline; Switch Access completes it | §33, §34 |
| F78b | Replay mini-bar (JS) `[Stretch]` | Leaving the player while it plays keeps the clock running and shows a violet `ReplayMiniBar` above the tab bar on every tab: "▶ REPLAY · {storm} · {time}" with Play/Pause and **View** (never "Open"); Map Home stays live. The iOS 26 `NativeTabs.BottomAccessory` version is part of F41. | Bar visible on every tab during playback; tapping View returns to the player; no replay state on Map Home | §12.5, §13.4, §33.3 |
| F79 | Water-travel pulse & lag pair `[MVP]` | Cyan `line-gradient` pulse along the NHDPlus flowline from gauge to crossing, `p = clamp((simT − t_trigger)/τ, 0, 1)`; lag-pair hydrograph (upstream vs. at the road) with a connector labeled as a **range** ("water usually takes {{tau_lo}}–{{tau_hi}} min to get here", §3.5 rule 8; never a single τ); Reduce Motion → static `ic-flow-arrow` arrowheads + the same range label. | Pulse reaches the crossing at the forecast time on the hero storm | §14, §29, §33 |
| F80 | Results & "How accurate is FordCast?" `[MVP]` | Lead-time callout "[X] MIN EARLIER" computed from the same JSON for the hero chosen by the pre-registered rule (F12); honesty line (`replay.honesty`: hero vs. median); MetricTiles POD/FAR/CSI/median lead with CIs; per-crossing lead bars; comparators (reactive, nearest-gauge, rule, ML if any); "How we scored this" (no lookahead, event split, data delay). Placeholders until real. | All numbers trace to `results.json`; copy test passes | §3.11, §18, §33 |
| F81 | Reveal truth `[Stretch]` | After the storm ends: dotted future line + observed overtop marker. | Toggle only enabled at the end of playback | §33 |
| F82 | NWS alert overlay in replay `[Stretch]` | Archived CAP alerts (IEM) appear at their `sent` time. | Visible on the July 2025 timeline | §19 |
| F83 | DEMO_MODE `[MVP]` | Env-gated flag: `DemoTouchOverlay` (44 pt circles, 300 ms fade), deterministic replay start, hidden dev overlays, optional auto-slow to **10×** around key events (10× is in the F78 speed set); a build check fails if enabled in a `preview`/`production` profile. | Preview build check passes; demo capture works | §41 |

### 4.I Offline & resilience

| ID | Feature · tier | Behavior | Done when | § |
|---|---|---|---|---|
| F84 | Local cache `[MVP]` | `expo-sqlite` tables (crossings, risk, last_known, alerts_log, saved_crossings, saved_places, saved_routes, route_cache, recents, outbox, meta; schema in §28.8) + `expo-sqlite/kv-store` for prefs and the persisted React Query cache. `recents` and `route_cache` hold coordinates **on the phone only**; Settings → Privacy → "Delete cached data" (`settings.delete_cached_data`) removes them together with cached risk. The privacy policy's "what stays on your phone" list is generated from these statements. | Relaunch offline shows the last risk with age labels; "Delete cached data" empties `recents`, `route_cache` and the risk cache (test) | §24.3, §28.8 |
| F85 | Read-path fallback ladder `[MVP]` | Storage snapshot → `GET /v1/risk/current` → SQLite; timeouts; a "waking server…" state for API-only calls; zod-validated payloads. | Each rung tested by disabling the one above | §28 |
| F86 | Bundled seed data `[MVP]` | `make app-data` (`tools/export_app_data.py`) copies `data/seed/crossings.geojson` (static fields only; `is_test` rows excluded), `data/seed/gauges.geojson` (Point features `{id, name, nws_lid}`: gauge names for reason text and positions for map gauge dots), `data/creeks/creeks.geojson` (one LineString per link, `{reach_id: "<crossing_id>__<gauge_id>", crossing_id, gauge_id, relation}`, coordinates ordered gauge → crossing, asserted by a test), the bundled replays and `docs/results/results.json` into `mobile/assets/{seed,replays,results}/`, writes `mobile/assets/manifest.json` (path, sha256, bytes, `inventory_version`) and generates `mobile/src/features/replay/assets.ts`. Style JSONs and marker sprites are bundled from `make style` / `make markers`. | First launch in airplane mode shows crossings (Unknown), gauge dots and creeks, and Replay works; `make app-data` is idempotent (second run = no diff) | §28, §29, §33.1 |
| F87 | Offline map pack `[Stretch]` | MapLibre `OfflineManager.createPack` for Travis County z8–14 (1,681 tiles; size estimate 30–80 MB is unverified), Wi-Fi + consent. | The 4-point airplane-mode checklist (§29) passes; only then claim "works offline" | §29 |
| F88 | OTA updates `[MVP]` | EAS Update on channel `preview`, `runtimeVersion: { policy: 'appVersion' }`; JS-only fixes after the first preview build. | An update reaches the installed preview APK | §26, §36 |

### 4.J Accessibility (claims require the §34 device matrix)

| ID | Feature · tier | Behavior | Done when | § |
|---|---|---|---|---|
| F89 | Screen reader support `[MVP]` | Roles, labels that start with visible text, states/values, custom actions (detour, save), focus to sheet header on open, modal focus trap, announcement policy (≤ 1 per 10 s, no announcement on background refresh), map summary label. | RNTL `getByRole(…, { name })` for every primary control; VoiceOver + TalkBack run all 5 common tasks | §34 |
| F90 | Larger text `[MVP]` | One `AppText` with variants; no cap on body/status text; rows stack at fontScale ≥ 1.35, single column at ≥ 2.0; status words and windows never truncate; Large Content Viewer on tabs/HUD. | Screenshots at iOS AX5 and Android 200 % in `docs/a11y/` | §34 |
| F91 | Differentiate without color & contrast `[MVP]` | 4-way encoding; HC token set under Increase Contrast / High Text Contrast; red markers rimmed. | Grayscale walkthrough passes; contrast script passes | §9, §34 |
| F92 | Motion & transparency preferences `[MVP]` | `useA11yPrefs()` (AccessibilityInfo listeners, mounted once) drives `ReducedMotionConfig`; loops stop after 3 cycles/6 s; in-app Animations toggle; Reduce Transparency → opaque surfaces. | Toggling settings live changes behavior without restart | §11, §34 |
| F93 | Targets & gesture alternatives `[MVP]` | ≥ 48 pt everywhere, ≥ 76 pt in Drive Mode; zoom ±, grabber button, scrubber ±5 min, actions for long-press; Voice Control "Tap <label>" works. | Switch Access completes all 5 tasks | §34 |
| F94 | Landscape `[Stretch]` | Map and Drive Mode usable in landscape (car mounts); switch `orientation` to `"default"` only after QA passes. | Landscape screenshots without clipping | §34 |
| F95 | A11y evidence `[MVP]` matrix · `[Stretch]` tooling | `docs/a11y/TESTING.md` device × setting matrix (MVP, required for any a11y claim); `make cvd` (`tools/cvd_screens.py`, tools environment) protan/deutan/tritan/grayscale 4-up renders from dev-gallery screenshots (Stretch tooling; `@react-native-ama/core` is excluded, §1.2 D1). | Matrix filled with dates and results; CVD renders in `docs/a11y/cvd/` | §34 |

### 4.K Localization (Spanish)

| ID | Feature · tier | Behavior | Done when | § |
|---|---|---|---|---|
| F96 | Full EN/ES `[MVP]` | i18next + react-i18next + expo-localization + `intl-pluralrules` imported first; 100 % of UI, a11y, TTS (`*_spoken`), push templates, permission prompts (`locales` in app config) and privacy policy; `es-US` formatting, America/Chicago time zone, `_one/_many/_other`; native-speaker review. | Parity CI green; full Spanish walkthrough logged; **claim "Spanish" only when UI + voice alerts are complete** | §35 |
| F97 | Language picker `[MVP]` | Device (recommended) / English / Español on onboarding page 1 and in Settings; per-app language via the expo-localization plugin; `lang` sent with device registration; Android re-reads locale on resume. | Switching languages updates UI, TTS and next push | §35 |
| F98 | Spanish screen-reader voice `[MVP]` | `AppText` sets `accessibilityLanguage` (iOS) to `es-US`/`en-US`; TalkBack behavior with app ES / system EN tested and documented. | Device result in `docs/a11y/TESTING.md` | §35 |
| F99 | Pseudo-locale overflow test `[Stretch]` | +50 % string length build to catch clipping. | No clipped buttons in screenshots | §35 |

### 4.L Crew & hotspot view

| ID | Feature · tier | Story / behavior | Done when | § |
|---|---|---|---|---|
| F100 | "Likely to flood next" list `[Stretch]` | *As a road crew or bus planner, I see which crossings are likely to flood next.* Route `crew`: ranked by state then window lower bound; dense 56 pt rows; filters Watch+Avoid / All / Closed. (The Map sheet's ranked list with the same sort is part of F30, MVP.) | Ranking test; reachable from the Map list and Settings | §13.18 |
| F101 | CSV export `[Stretch]` | Share the ranked list as CSV via `expo-sharing` (VERIFY BEFORE USE: SDK 57 pin). | CSV opens in a spreadsheet | §13 |
| F102 | County/agency dashboard & feed `[Roadmap]` | Web dashboard or feed for agencies. | README Roadmap row + GitHub issue exists | §2 |

### 4.M Settings, about, data & privacy

| ID | Feature · tier | Behavior | Done when | § |
|---|---|---|---|---|
| F103 | Settings `[MVP]` | Stack route opened from the gear: Language; Units ft/m, mi/km; Appearance (Dark; System/Light `[Stretch]`); Accessibility (Haptics, Sounds, Spoken alerts, Voice speed, Animations, Controls on left `[Stretch F38b]`); Notifications (Avoid/Closed, Watch opt-in **off by default**, test alert, Focus help, quiet hours `[Stretch F73]`); Drive Mode (background alerts `[Stretch]`, voice language); Privacy (policy link, "Delete cached data", "Delete my alert data"); links to Data sources, How it works, Accuracy, About/Legal; version + build; Debug (`__DEV__` only, F107). Help is always in the same place (WCAG 3.2.6). | Every toggle persists and is screen-reader operable | §13 |
| F104 | About & How it works `[MVP]` | 4-step diagram (gauges → river network → travel time → risk → phone); Built/Prototype/Roadmap list from `claims.generated.json`; attributions; credits (testers/reviewers with permission, Lottie creators); re-open onboarding. | List matches `docs/CLAIMS.md` (test) | §13, §44 |
| F105 | Data sources status `[MVP]` | Per source: last fetch, status (live/degraded/down), link (opened with `expo-web-browser`). | Reflects a simulated outage | §13 |
| F106 | Privacy policy & delete-my-data `[MVP]` | Plain-language policy in **`docs/privacy/index.md`** (EN, then the ES version under an `## Español` heading; native review). Content: who we are (student project + project contact email); what stays on the phone (location, saved places/routes, recents, route cache, from the F84 statements); what reaches our servers (push token, locale, time zone, toggles, crossing-ID subscriptions; route endpoints and search text only in memory, never stored or logged; §24.3); children under 13 ("FordCast is meant for drivers and is not directed to children under 13. We don't knowingly collect personal information from children."); third parties (Expo push → Apple/Google, openrouteservice/Stadia, Photon, Render, Supabase, Sentry if enabled); retention (90-day inactivity delete; alert log 30 days); how to delete or revoke (in-app "Delete my alert data", "Delete cached data", OS permission settings); effective date; contact. Published with GitHub Pages (repo Settings → Pages → Deploy from branch `main`, folder `/docs`; needs the public repo, a stop-and-ask moment) at `https://<github-user>.github.io/Fordcast-CAC/privacy/` (`#espanol` for ES); until Pages is on, the app and README link to the GitHub file view of `docs/privacy/index.md`. Linked from Settings → Privacy and from the README. "Delete my alert data" calls `DELETE /v1/devices/{id}` and clears local alert data; no accounts, analytics or ads. | Delete verified in DB; policy links work from the app and README; every §24.3 row is reflected in the policy | §24.3 |
| F106b | Store privacy drafts `[Stretch]` | `docs/store/apple-privacy.md` and `docs/store/play-data-safety.md`, pre-filled per research cac.md §7.4 from the §24.3 data map (Apple: Data Not Linked to You → Identifiers (Device ID) for App Functionality; Diagnostics only if Sentry ships; Tracking: No; precise location not collected. Google: Device or other IDs for App functionality; location processed ephemerally on route requests; not shared; encrypted in transit; deletion in-app). Used only if the app is ever published. | Both files match §24.3, reviewed by a parent | §24.3, §38.6 |
| F107 | Debug screen `[MVP]` (`__DEV__` only) | Route `settings/debug` (`<Redirect>` in preview builds). Sections: (1) **Capabilities**: `caps.*`, build lane, EAS profile, `IS_EXPO_GO`. (2) **Data**: snapshot `seq`/`as_of`/check age/read-path rung, server clock offset, SQLite row counts, `meta.*`, exact τ (median, P25, P75, n) per link (the only place a single τ appears, §3.5 rule 8); buttons "Fake clock +25 min", "Disable Storage rung", "Disable API rung", "Delete cached data". (3) **Map Home states**: calm · storm · offline · loading · replay-active · location-denied · degraded · app banner. (4) **Crossing fixtures** (open `crossing/[id]`): NO_RISE, WATCH with and without window, AVOID with lo = 0, CLOSED official, CLOSED sensor, UNKNOWN stale with last-known AVOID, UNKNOWN tier C, tier B. (5) "Escalate fixture crossing" (§14.2). (6) "Simulate drive" with a speed slider (lockout and Drive Mode testing). (7) **Push**: token, device id, "Subscribe to test-0001", a local test on each channel, last 10 `alerts_log` rows. (8) **Replay**: clock, speed, timeline sha. (9) **Geofences**: registered set, last re-rank. | Every §13 state is reachable from this screen; absent from preview builds | §13, §23.9, §28 |

### 4.N Onboarding & first run

| ID | Feature · tier | Behavior | Done when | § |
|---|---|---|---|---|
| F108 | Splash & app icon "The Dip" `[MVP]` | Native splash `#0E1726`; icon = navy background, road dipping into a V, cyan creek, small upstream dot (colors exactly as §15.5; never red or amber, so the icon never reads as a status); Android adaptive + monochrome; notification small icon; animated splash overlay `[Stretch]`. Native assets: drafted by the agent with a script on Day 0, approved by the human (§1.2 Q14) and committed **before** the Day-1 dev build; any later change needs a new build. | Icon legible at 29 pt and in themed/tinted modes; assets final before the Day-1 build | §15 |
| F109 | Onboarding `[MVP]` | 4 pages: welcome + EN/ES pill; how it works; what the map shows (5 states); safety pledge (3 checkboxes, versioned) behind `Stack.Protected`; ≤ 40 words per page; copy keys `onboarding.*` (§3.9; travel time on the how-it-works page is a range, never "≈ 38 min"); re-openable from About. | Can't reach tabs without accepting the pledge; screen-reader reads each page as heading + body | §3.9, §13 |
| F110 | Permission priming `[MVP]` foreground · `[Stretch]` background | Location When-In-Use primer shown in context, right before the first "center on me", Check My Drive or Drive Mode (never on the first Map Home render; "Not now" → Austin 30.2672, −97.7431); notifications after a save or "Alert me"; "Always" only via "Alert me while I drive" with the §3.9 primer (Android 11+ opens settings); the app is fully usable with every permission denied. | Deny-all walkthrough completes all common tasks | §13, §30 |
| F110b | Precise-location banner `[Stretch]` | If the user grants only approximate location (Android `coarse`; iOS reduced accuracy, VERIFY how expo-location 57 exposes it), show `permissions.precise_needed` with a Settings button; the app keeps working with Austin-centered or approximate behavior. | Banner appears after granting approximate only and disappears after switching to precise | §13.3, §30.1 |

### 4.O Live Activities & widgets

| ID | Feature · tier | Behavior | Done when | § |
|---|---|---|---|---|
| F111 | Android sticky drive status `[Stretch]` | Ongoing notification on `drive-mode` updated in place during Drive Mode (`sticky`, no timers). | Visible during a drive test | §31 |
| F112 | iOS Live Activity `[Stretch, Lane B]` | `expo-widgets` `createLiveActivity` during Drive Mode or an active saved-route Avoid; ranges, no timers; `staleDate` = now + 15 min → stale shows Unknown styling; ends 30 min after dropping below Watch. | Runs on a real iPhone | §15, §31 |
| F113 | iOS widgets `[Stretch, Lane B, last]` | Small / medium / lock-screen; always "as of"; entries > 30 min old render Unknown. | Runs on a real iPhone | §15, §31 |
| F114 | Android widgets; remote Live Activity pushes `[Roadmap]` | — | README Roadmap row + GitHub issue exists | §31 |

### 4.P Roadmap only (document as "planned"; do not build)

**Done when (every row below):** a README "Roadmap / planned" row and an open GitHub issue labeled `roadmap` exist, the About → "What's built" list shows it as Planned, and no UI path leads to a non-working feature (§4 intro).

| ID | Feature | Notes |
|---|---|---|
| F115 | Crowd "water over road" reports with trust weighting | Needs privacy review, moderation, age considerations; passenger/parked gate; never overrides official closures; `private.reports` table may exist unused |
| F116 | SMS alerts for people without the app | Phone numbers change the privacy picture (§24) |
| F117 | CarPlay / Android Auto alert card | Entitlement + stale libraries |
| F118 | iOS Critical Alerts | Apple entitlement approval; apply after CAC |
| F119 | Statewide / national scale-out | USGS + NHDPlus cover the U.S.; Flash Flood Alley is the proving ground |
| F120 | Self-hosted PMTiles basemap | Reduces dependency on OpenFreeMap |
| F121 | Custom notification sound | Config-plugin change; in-app Drive Mode chime is already MVP (F58) |
| F122 | Agency partnerships (official ATXfloods/County feeds, NWS EWX wording review) | Pursued through the §42 outreach; official status is used only with written permission |
| F123r | Radar rain map layer | A rainfall overlay on Map Home; the Layers sheet may show it as a disabled "Planned" row only (§13.6) |
| F124r | Light basemap | A daytime map style; MVP keeps "FordCast Night" even in the Stretch light UI theme (§9.3) |
| F125r | Universal links / app links (`https://` deep links) | Needs a hosted association file and domain; MVP uses the `fordcast://` scheme (F44) |

(Other Roadmap items live in their groups: F19–F21, F56, F102, F114. Each has the same Done when.)

### 4.Q Engineering & delivery (specified in Part E)

| ID | Feature · tier | Done when | § |
|---|---|---|---|
| F123 | CI `[MVP]`: `ci.yml` runs every gate referenced anywhere in this prompt: mobile typecheck/lint/Jest (incl. banned-words, parity, state, staleness, windows, replay-frames), `check-pins`, `npx expo install --check`, the mobile secret grep (no `sb_secret_` etc.), the hand-typed-metric grep, `make claims && git diff --exit-code`, backend ruff/pytest (incl. banned-words, **no-lookahead** and truth-isolation tests), `replay-verify --all` (golden hashes, reading the committed `data/latency/gauge_latency.json`), backtest smoke plus `make backtest CHECK=1` against the committed `results.json`; storm Parquet fetched with `make data-fetch` (by `data/MANIFEST.json`). Repo-guard greps exclude test files that must contain the forbidden literals. Plus `tick-backup.yml` and `nightly.yml` live contracts. | All green on `main` | §24.9, §36 |
| F124 | Maestro E2E demo flows (onboarding, map → crossing, replay to result, settings language, `drive-replay.yaml` for F128) `[MVP]`. Replay flows read `HERO_STORM_ID` from the generated `mobile/assets/replays/index.json` (first bundled storm if unset); no flow hard-codes a storm. | Flows pass on the preview APK | §36 |
| F125 | App crash reporting (Sentry RN ~7.11) `[Stretch]`, only if `@sentry/react-native` made it into the Day-1 build without a `SENTRY_AUTH_TOKEN` (§1.2 D1); otherwise Roadmap | Test crash appears scrubbed of coordinates | §36 |
| F126 | Preview APK + GitHub Release (APK, checksum, results) `[MVP]`; **no app-store publishing** | Judges can install from the README link | §26, §38 |
| F127 | Submission package: judge-first README (embeds the §5.4 architecture Mermaid diagram and states the hero rule), `AI_USE.md`, explain-back docs, `docs/architecture.md`, `THIRD_PARTY_NOTICES.md` (`make notices`), demo video, answers, outreach, comprehension test, Claims Ledger, synced concept doc (§1.10), tag `cac-2026-submission` `[MVP]` | §45 checklist complete | §38–§45 |

---

## §5. Repository layout

Monorepo `godtier812/Fordcast-CAC`. Create this tree incrementally (don't commit empty placeholder files; create each file when its feature starts). `★` = student-owned core file (§1.8). **Paths here are canonical for the top-level folders, `backend/`, `data/`, `tools/`, `docs/` and `submission/`. The file-level layout of `mobile/src` is canonical in §28.1**; the `mobile/` part of the tree below shows its folders and key files so you can see the whole repo at once. Every other section uses these paths.

### 5.1 Tree

```text
Fordcast-CAC/
├─ README.md                      # judge-first README (§40); tables generated from results.json + CLAIMS.md; embeds the §5.4 Mermaid diagram
├─ AI_USE.md                      # AI disclosure, CAC AI-rule text, per-file authorship table (§39)
├─ AGENTS.md                      # agent rules (§1.11) — source of truth
├─ CLAUDE.md                      # "@AGENTS.md" + the 10 rules duplicated
├─ LICENSE                        # MIT (code). Data stays under its sources' terms (§16)
├─ THIRD_PARTY_NOTICES.md         # generated by `make notices`: npm + Python licenses + data attribution (OSM, OpenFreeMap/OpenMapTiles, ORS, USGS, NOAA) (§40.6)
├─ CHANGELOG.md                   # "After submission" section from Oct 26 on
├─ Makefile                       # the only task runner; full content in §5.2
├─ render.yaml                    # optional Render blueprint (§20.5); setting the service up in the dashboard is equally fine
├─ .gitignore · .editorconfig     # .gitignore list below
├─ FordCast_CAC_Submission.md     # concept doc, kept true to what's built (§1.10)
├─ .github/
│  └─ workflows/
│     ├─ ci.yml                   # every gate listed in F123 (§24.9, §36)
│     ├─ tick-backup.yml          # watchdog tick, cron "7-59/15 * * * *"; skips while a lease is held (§20.6)
│     └─ nightly.yml              # live contract tests (USGS v1, NLDI, Expo receipts) + replay-verify --all + heartbeat
├─ mobile/                        # Expo SDK 57 app (scaffold: npx create-expo-app@latest mobile --template default@sdk-57)
│  ├─ AGENTS.md · .claude/settings.json   # generated by create-expo-app; FordCast block appended (§1.11)
│  ├─ package.json                # "main": "index.ts"; scripts: start, typecheck, lint, test, doctor, e2e (§27.1)
│  ├─ index.ts                    # import './src/tasks/geofence'; import './src/tasks/drive-location'; then 'expo-router/entry' LAST
│  ├─ app.config.ts               # name, scheme "fordcast", plugins (MapLibre, location, notifications, localization, sqlite, font…) (§27.3)
│  ├─ eas.json                    # development / preview (internal APK) / demo (DEMO_MODE video build) / production profiles + channels (§26.4)
│  ├─ babel.config.js · metro.config.js · tailwind.config.js · components.json · nativewind-env.d.ts
│  ├─ tsconfig.json               # strict, noUncheckedIndexedAccess, @/* → src/*
│  ├─ eslint.config.js · .prettierrc · .env.example
│  ├─ jest.setup.ts               # Jest setup (§27.12)
│  ├─ scripts/check-pins.mjs      # pin guard, run by `npm run doctor` and CI (§25.5)
│  ├─ locales/app.es.json         # Spanish OS permission prompts (expo `locales` config, §27.4) — not the UI strings
│  ├─ .maestro/                   # onboarding.yaml · map-to-crossing.yaml · replay-demo.yaml · settings-language.yaml · drive-replay.yaml (F128)
│  ├─ assets/
│  │  ├─ images/                  # icon (+ iOS .icon), android-icon-foreground/-monochrome, splash-icon, notification-icon (white on transparent)
│  │  ├─ fonts/                   # (only if not loaded from @expo-google-fonts/inter via the expo-font plugin)
│  │  ├─ map/
│  │  │  ├─ fordcast-night.json   # generated by `make style` from OFM Positron (Noto Sans labels); also served at GET /v1/styles/fordcast-night.json (Stretch)
│  │  │  ├─ fordcast-night-minimal.json  # offline fallback style (land/water/roads); `make style` writes it with make_style.py --minimal
│  │  │  └─ markers/              # ic-norise · ic-watch · ic-avoid · ic-closed · ic-closed-official · ic-unknown · ic-unknown-lastwatch ·
│  │  │                           #   ic-unknown-lastavoid · ic-unknown-lastclosed · ic-flow-arrow — each @2x/@3x PNG, from `make markers` (§10.9)
│  │  ├─ seed/                    # crossings.geojson · gauges.geojson · creeks.geojson — copied by `make app-data` (F86)
│  │  ├─ replays/                 # index.json · <storm-id>.json.gz — copied by `make app-data` from data/replays/ (F76)
│  │  ├─ results/results.json     # copied by `make app-data` from docs/results/results.json ("How accurate is FordCast?")
│  │  ├─ manifest.json            # path · sha256 · bytes of every file `make app-data` copied, + inventory_version
│  │  ├─ sounds/                  # chime.wav (AVOID/CLOSED) · chime_soft.wav (WATCH) — in-app Drive Mode chimes (expo-audio, §11.7)
│  │  └─ lottie/                  # recolored animations (lottie-react-native is in the Day-1 build, §1.2 D1); creators credited in About
│  └─ src/                        # file-level layout and responsibilities: §28.1 (canonical)
│     ├─ global.css               # RNR CSS variables = FordCast tokens (§9)
│     ├─ app/                     # Expo Router routes (§28.2)
│     │  ├─ _layout.tsx           # providers (gesture root, query+persist, i18n, a11y prefs, theme), fonts, Stack.Protected gate,
│     │  │                        #   formSheet/fullScreenModal registrations, PortalHost, toaster
│     │  ├─ +not-found.tsx
│     │  ├─ (onboarding)/         # _layout.tsx · index.tsx (welcome + EN/ES) · how.tsx · legend.tsx · pledge.tsx
│     │  ├─ (tabs)/
│     │  │  ├─ _layout.tsx        # NativeTabs (expo-router/unstable-native-tabs): Map · Drive · Replay · Alerts
│     │  │  ├─ index.tsx          # Map Home: map + persistent sheet + Area Status Card + floating controls
│     │  │  ├─ drive/             # _layout.tsx · index.tsx (Check My Drive / Drive Mode entry) · result.tsx
│     │  │  ├─ replay/            # _layout.tsx · index.tsx (picker) · [stormId].tsx (player) · results.tsx
│     │  │  └─ alerts/            # _layout.tsx · index.tsx (inbox) · saved.tsx (saved crossings MVP; places/routes Stretch)
│     │  ├─ crossing/[id].tsx     # formSheet, detents 0.32/0.62/1.0; deep link fordcast://crossing/<id>
│     │  ├─ gauge/[id].tsx        # gauge mini-card (Stretch F39)
│     │  ├─ drive-mode.tsx        # fullScreenModal, gestureEnabled:false (also hosts Replay drive, F128)
│     │  ├─ search.tsx · legend.tsx · layers.tsx · handoff.tsx · crew.tsx · permission/[kind].tsx
│     │  ├─ dev/gallery.tsx       # __DEV__ only (F31b)
│     │  └─ settings/             # _layout.tsx · index.tsx · notifications.tsx · accessibility.tsx · language.tsx · drive.tsx
│     │                           #   data-sources.tsx · how-it-works.tsx · accuracy.tsx · privacy.tsx · about.tsx · legal.tsx · debug.tsx (__DEV__, F107)
│     ├─ components/
│     │  ├─ ui/                   # React Native Reusables copy-ins (button, text, icon, card, badge, alert, switch, dialog…) (§12)
│     │  └─ fordcast/             # AppText · StatusChip · StatusGlyph · CrossingRow · RiskRing · RiskWindow · EtaRangePill · Sparkline
│     │                           #   Hydrograph · LagPair · FreshnessBadge · AlertBanner · OfflineBanner · ReplayBanner · ReplayMiniBar · TimeScrubber
│     │                           #   MetricTile · StormCard · AreaStatusCard · DisclaimerFooter · GlassSurface · BigActionButton
│     │                           #   PassengerHold · DemoTouchOverlay · EmptyState
│     ├─ features/
│     │  ├─ risk/                 # state.ts (enum, rank, display rules) · staleness.ts (20-min rule) · windows.ts · reasons.ts · copy.ts · escalation.ts
│     │  ├─ crossings/            # schema.ts (zod snapshot v1) · api.ts · queries.ts · realtime.ts · selectors.ts · skew.ts · static.ts
│     │  ├─ map/                  # MapSurface.tsx (adapter) · MapSurface.maplibre.tsx · MapSurface.expogo.tsx (see note) · layers.ts · waterPulse.ts · sprites.ts
│     │  ├─ replay/               # loader.ts (gunzip + sha) · schema.ts · clock.ts · player-store.ts · frames.ts (binary search) · assets.ts (generated by `make app-data`)
│     │  ├─ drive/                # drive-store.ts · location-source.ts (Real/ReplayDriveSource) · proximity.ts · lockout.ts · speech-queue.ts · voices.ts
│     │  ├─ routing/              # route-api.ts · on-route.ts (Turf 7.4) · handoff.ts · search-api.ts · saved.ts
│     │  ├─ alerts/               # channels.ts · notify.ts · push-registration.ts · subscriptions.ts · geofence-rotation.ts · inbox-store.ts
│     │  ├─ offline/              # db.ts (expo-sqlite schema/migrations) · cache.ts · sync.ts
│     │  ├─ a11y/                 # A11yPrefsProvider.tsx (useA11yPrefs) · announce.ts
│     │  └─ about/                # claims.generated.json (from `make claims`)
│     ├─ live/DriveActivity.tsx   # iOS Live Activity component (Lane B only, Stretch F112; §31.9)
│     ├─ lib/                     # env.ts · supabase.ts · api.ts · query-client.ts · storage.ts (kv-store) · capabilities.ts (isRunningInExpoGo) · flags.ts
│     │                           #   i18n.ts (imports 'intl-pluralrules' first) · theme.ts (raw hex mirror of tokens) · useTheme.ts · fonts.ts · motion.ts
│     │                           #   haptics.ts · format.ts (es-US/en-US, America/Chicago) · geo.ts · utils.ts (cn)
│     ├─ locales/                 # en.json · es.json · banned-words.json · es-pending-review.json (must be empty at code freeze)
│     ├─ stores/                  # zustand: settings.ts · onboarding.ts · saved.ts · device.ts
│     ├─ tasks/                   # geofence.ts · drive-location.ts · background-refresh.ts (TaskManager.defineTask at top level)
│     └─ __tests__/               # copy-banned-test.ts · i18n-parity-test.ts · risk-state-test.ts · staleness-test.ts · windows-test.ts
│                                 #   replay-frames-test.ts · lockout-test.ts · on-route-test.ts · status-chip-test.tsx · crossing-sheet-test.tsx (full list §36.1)
├─ backend/                       # Python 3.13 uv project; run from backend/ with `uv run python -m fordcast <cmd>` (or the §5.2 targets)
│  ├─ pyproject.toml · uv.lock · .python-version · .env.example
│  ├─ fordcast/                   # package at backend/fordcast (flat layout; §20 must match)
│  │  ├─ __main__.py              # CLI (§20.11): inventory · nwps · link · backfill · learn · backtest · replay-build · replay-verify
│  │  │                           #   · seed-sql · tick · official · config · push · latency
│  │  ├─ config.py                # pydantic-settings; fails fast on missing secrets (§20.12)
│  │  ├─ domain.py                # Gauge · Crossing · Link · RiskState · Reason · RiskResult (Reading/OfficialStatus live in sources/base.py)
│  │  ├─ clock.py                 # LiveClock · ReplayClock
│  │  ├─ tick.py                  # tick(now, source, official, state, model) — the ONE pipeline for live and replay (§19.6)
│  │  ├─ live.py                  # run_live_tick: lease → ingest → tick() → write-on-change → snapshot → push → receipts (§20.3)
│  │  ├─ snapshot.py              # build + upload current.json (cache-control 30)
│  │  ├─ routing.py               # ORS → Stadia routing, avoid polygons, detour (Stretch, §22.5)
│  │  ├─ logging.py               # structlog config + redaction of keys/coordinates (§24.4)
│  │  ├─ sources/
│  │  │  ├─ base.py ★             # DataSource / OfficialStatusSource protocols · Reading · OfficialStatus · LookaheadError · no-lookahead guard
│  │  │  ├─ http.py               # shared httpx client: timeouts, retries, contact User-Agent, key redaction (§16.0)
│  │  │  ├─ usgs_client.py        # USGS OGC API v1 (X-Api-Key, User-Agent, tenacity)
│  │  │  ├─ live.py               # LiveSource over DB readings (available_at = received_at)
│  │  │  ├─ replay.py             # StormReplaySource (Parquet; available_at = obs_time + delay, outage-aware)
│  │  │  ├─ official.py           # manual / ATXfloods (permission only) / County → OfficialStatus
│  │  │  ├─ nwps.py · nws.py      # NWPS categories/impacts · NWS CAP alerts (Stretch)
│  │  │  └─ rain.py               # Open-Meteo / MRMS basin rain (Stretch)
│  │  ├─ linking/
│  │  │  ├─ inventory.py          # assemble crossings from City/County/TxGIO/OSM/manual; dedupe; tiers
│  │  │  ├─ nldi.py               # hydrolocation snap + UT navigation (offline, pynhd)
│  │  │  ├─ travel_time.py ★      # τ by cross-correlation + parabolic refinement
│  │  │  └─ triggers.py           # trigger/watch stage learning (training storms only)
│  │  ├─ features/compute.py      # as_of-aware pure functions: rise(), last_upcrossing(), crossing_is_stale(), water_at_road()…
│  │  ├─ model/
│  │  │  ├─ baseline_rule.py ★    # raw state + window + reasons
│  │  │  ├─ combine.py            # resolve_raw_state (§3.3)
│  │  │  ├─ state_machine.py      # hysteresis (§18.8)
│  │  │  ├─ windows.py            # fixed buckets [0,15] [15,30] [30,60] [60,90]
│  │  │  ├─ explain.py            # reason codes (+ tau_lo_min/tau_hi_min ranges, §3.5); SHAP mapping (Stretch)
│  │  │  ├─ ml.py                 # inference only (Stretch)
│  │  │  └─ train_ml.py           # training + calibration + model card (Stretch; offline)
│  │  ├─ replay/
│  │  │  ├─ build.py · verify.py · latency.py · schema.py   # timeline v1, golden sha, delay table (reads data/latency/gauge_latency.json), pydantic schema
│  │  │  ├─ storyboard.py · storyboard_templates.json         # generated storyboard lines; EN/ES `{{var}}` templates from the §3.7 rules (§19.13)
│  │  │  ├─ states_at.py          # replay states for routing (Stretch F54, §19.16)
│  │  │  └─ data/                 # server copy of data/replays/*.json.gz (written by `make replays`)
│  │  ├─ scoring/
│  │  │  ├─ labels.py             # the ONLY reader of ground truth
│  │  │  ├─ metrics.py ★          # event matching, POD/FAR/CSI, lead, bootstrap CIs
│  │  │  ├─ backtest.py           # LOSO driver → docs/results/results.json + results.md + figures
│  │  │  ├─ nearest_gauge.py      # comparator
│  │  │  └─ reliability.py        # reliability diagram, Brier skill (Stretch)
│  │  ├─ push/                    # fanout.py · expo.py · policy.py · templates/en.json · templates/es.json (copy from §3.7)
│  │  ├─ api/                     # app.py · deps.py · security.py · ratelimit.py
│  │  │  └─ routes/               # health · risk · crossings · gauges · replays · devices · route · search · styles · internal
│  │  └─ store/                   # db.py (psycopg pool, pooler URL, prepare_threshold=None) · repo.py
│  ├─ models/<version>/           # model.joblib · card.json (Stretch)
│  └─ tests/                      # unit/ · contract/ (vcr cassettes, keys filtered) · replay/ (golden) · api/ · fixtures/
│                                 #   test_no_lookahead.py · test_truth_isolation.py · test_copy_banned.py · conftest.py
├─ notebooks/                     # student-owned exploration; outputs cleared; key figures exported to docs/figures/
│  ├─ 01_inventory_and_snaps.ipynb · 02_storm_plots.ipynb · 03_travel_time.ipynb · 04_backtest_review.ipynb
├─ data/
│  ├─ raw/inventory/              # untouched source pulls: City, County, TxGIO, OSM (§17.1)
│  ├─ review/                     # near_duplicates.csv · snaps.geojson — inputs for the human map review (§17.4, §17.11)
│  ├─ seed/                       # crossings.geojson · gauges.geojson · service_area.geojson
│  ├─ overrides/                  # snap_overrides.csv · snap_review.csv · manual_crossings.csv · crossing_tiers.csv
│  │                              #   overtop_stages.csv · road_elevations.csv (every row names its source)
│  ├─ links/crossing_gauge_links.csv
│  ├─ nldi_cache/                 # *.geojson (no runtime NLDI dependency)
│  ├─ creeks/creeks.geojson       # simplified upstream flowlines (< 1 MB), one LineString per link → mobile/assets/seed (F86)
│  ├─ storms/<storm-id>/          # meta.toml (incl. outages) · readings.parquet (commit if ≤ 5 MB, else Supabase Storage) · truth.csv
│  │                              #   ids: halloween-2013 · memorial-day-2015 · halloween-2015 · oct-2018 · july-2025 · calm-2024 (§16.19)
│  ├─ latency/gauge_latency.json  # frozen per-gauge delays (n, p75, p90) from `make latency`; read by replay builds and CI, never the live DB
│  ├─ replays/                    # index.json · <storm-id>.json.gz — build output of `make replays` (bundled into the app by `make app-data`)
│  ├─ .gitignore                  # Storage-hosted files (> 5 MB), one path per line, maintained by tools/data_manifest.py
│  └─ MANIFEST.json               # [{path, sha256, bytes, location: "git"|"storage", url}] for every data file (tools/data_manifest.py)
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/                 # 0001_init.sql (tables, enums) · 0002_rls.sql · 0003_realtime.sql · 0004_cron.sql (retention + tick)
│  ├─ seed.sql                    # generated by `seed-sql` (crossings, gauges, links, storms, app_config defaults); never hand-edited (§21.5)
│  └─ manual/                     # run by hand, never by migrations
│     ├─ vault_secrets.example.sql   # placeholders for the Vault entries tick_url / tick_secret (§20.4); real values never committed
│     └─ set_model_live.sql       # used by `make model-live` (§5.2)
├─ tools/                         # repo scripts; Python env = tools/pyproject.toml (§5.3) unless marked [backend env]
│  ├─ pyproject.toml · uv.lock
│  ├─ vendor/positron.json        # pinned copy of the OpenFreeMap Positron style (input to make_style.py; license recorded in THIRD_PARTY_NOTICES.md)
│  ├─ make_style.py               # Positron → fordcast-night.json and (--minimal) fordcast-night-minimal.json (§12.2, §29)
│  ├─ make_markers.py             # Pillow sprite generator → mobile/assets/map/markers/ (§10.9)
│  ├─ export_app_data.py          # seed + creeks + replays + results → mobile/assets/ + manifest.json + features/replay/assets.ts (F86)
│  ├─ build_replays.py            # [backend env] replay-build for every bundled storm → data/replays/ + backend/fordcast/replay/data/
│  │                              #   (+ Storage mirror with --upload) (§19.14)
│  ├─ select_hero.py              # the pre-registered hero rule → results.json.hero (F12, §18.13)
│  ├─ data_manifest.py            # writes data/MANIFEST.json; --upload puts Parquet > 5 MB in Storage; --download fetches by manifest
│  ├─ road_elevation.py           # road elevation from USGS 3DEP via py3dep → data/overrides/road_elevations.csv (F5 source 3; `dem` group)
│  ├─ cvd_screens.py              # protan/deutan/tritan/grayscale renders → docs/a11y/cvd/
│  ├─ contrast.py                 # WCAG contrast check of theme tokens
│  ├─ gen_claims.py               # docs/CLAIMS.md → claims.generated.json + README splices (§44)
│  ├─ gen_notices.py              # THIRD_PARTY_NOTICES.md from the license reports + the data-attribution section (§40.6)
│  ├─ check_xrefs.py              # every §N.M cited in docs/MASTER_PROMPT.md exists as a heading
│  └─ smoke_test.py               # [backend env] Day-0 live API smoke tests S1–S12 → docs/data-bridge-verification.{md,json} (§16.20)
├─ docs/                          # also the GitHub Pages source (Settings → Pages → main /docs)
│  ├─ MASTER_PROMPT.md · devlog.md · CLAIMS.md · status.md
│  ├─ architecture.md             # outline in §5.4
│  ├─ data-bridge-verification.md · data-bridge-verification.json   # live API checks S1–S12 (§16.20)
│  ├─ design-deviations.md        # every intentional deviation from Part B, with its reason
│  ├─ release-notes.md            # one entry per preview APK / GitHub Release (§36.7)
│  ├─ privacy/index.md            # privacy policy EN + ES; published by GitHub Pages; linked from Settings → Privacy and the README (F106)
│  ├─ store/                      # apple-privacy.md · play-data-safety.md (Stretch F106b; used only if ever published)
│  ├─ decisions/                  # step0.md · verifications.md · strategy.md (the concept doc's section 0) · ADRs for any deviation from this prompt
│  ├─ explain/                    # overview.md · travel_time.md · baseline_rule.md · metrics.md · datasource.md (+ one per other module)
│  ├─ a11y/                       # TESTING.md (device matrix) · cvd/ · screenshots/
│  ├─ results/                    # results.json · results.md · figures/
│  ├─ figures/                    # notebook exports; reliability diagram (Stretch)
│  ├─ schemas/                    # snapshot.v1.example.json · replay.v1.example.json (shared by pydantic + zod tests)
│  ├─ media/                      # README screenshots, GIFs, state-ladder.png (§40.3)
│  └─ impact/                     # log.md · outreach replies (contact details redacted) · permissions
└─ submission/
   ├─ CHECKLIST.md · RULES_NOTES.md · FINAL_ACCEPTANCE.md · answers.md (student's Q1–Q4)
   ├─ video/                      # script.md · shotlist.md · captions.en.srt · captions.es.srt · LINK.md · music-license.md
   ├─ outreach/                   # email.md · one-pager.md (concept one-pager with wireframes/mockups, §42)
   └─ comprehension-test/         # protocol.md · consent.md · results.md
```

- **`.gitignore`** (root): `.env*` except `*.example`; `node_modules/`; `.expo/`; `android/`; `ios/`; `*.apk`; `*.aab`; `.venv/` and `tools/.venv/`; `__pycache__/`; `build/`; `google-services.json`; `GoogleService-Info.plist`; `*.p8`; `*.p12`; `*.jks`; `*.keystore`; `*service-account*.json`. `data/.gitignore` lists the Storage-hosted data files.
- **`MapSurface.expogo.tsx`** exists only if the Expo Go fallback is kept. Metro bundles every `require()` it can see, so the fallback requires **both** `@maplibre/maplibre-react-native` and `react-native-maps` (SDK-bundled, installed with `npx expo install react-native-maps`) to be installed; the lazy `require` only prevents evaluation, not bundling. If the fallback is skipped, delete the file and its branch entirely. Never wrap a `require` in `try/catch` (§29.13).
- **Generated files are committed and never hand-edited:** `mobile/assets/map/*.json`, `mobile/assets/map/markers/*`, everything `make app-data` writes, `claims.generated.json`, `supabase/seed.sql`, `data/MANIFEST.json`, `data/latency/gauge_latency.json`, `docs/results/*`, `THIRD_PARTY_NOTICES.md`. CI regenerates the checkable ones and fails on a diff.

### 5.2 Root `Makefile` (exact)

Every target is one line in the inline `target: ; recipe` form (no tab characters needed). Backend commands run in the backend environment with `backend/` as the working directory; tools run in the tools environment from the repo root; mobile commands go through `npm --prefix mobile`. Other sections refer to these targets by name.

```make
# Makefile (repo root) — the only task runner (§5.2). Windows: run from WSL2.
# BE: backend env (backend/pyproject.toml), working dir backend/ (flat package, §20.11). Its CLI arguments are relative to backend/,
#     but shell redirections (>) are relative to the repo root.
# TOOLS: tools env (tools/pyproject.toml, §5.3), working dir = repo root.
# seed-prod / model-live / latency need DATABASE_URL in your shell: `set -a; . backend/.env; set +a` first.
BE       := uv run --project backend --directory backend
TOOLS    := uv run --project tools python
NPM      := npm --prefix mobile
SUPABASE := npx --yes supabase@2.120.0

.PHONY: setup smoke data link latency backtest replays app-data style markers claims seed seed-prod model-live \
        data-upload data-fetch cvd notices test lint ci api

setup:       ; uv sync --project backend --all-extras --all-groups && uv sync --project tools && $(NPM) ci
smoke:       ; $(BE) python ../tools/smoke_test.py --out ../docs/data-bridge-verification
data:        ; $(BE) python -m fordcast inventory pull && $(BE) python -m fordcast inventory build && $(BE) python -m fordcast nwps sync && $(MAKE) link && $(BE) python -m fordcast backfill --all && $(BE) python -m fordcast learn --loso && $(BE) python -m fordcast seed-sql > supabase/seed.sql && $(TOOLS) tools/data_manifest.py
link:        ; $(BE) python -m fordcast link snap && $(BE) python -m fordcast link upstream && $(BE) python -m fordcast link tiers
latency:     ; $(BE) python -m fordcast latency recompute --out ../data/latency/gauge_latency.json
backtest:    ; $(if $(CHECK),$(BE) python -m fordcast backtest --all --out ../build/results-check --compare ../docs/results/results.json,$(BE) python -m fordcast backtest --all --out ../docs/results && $(TOOLS) tools/select_hero.py docs/results/results.json && $(MAKE) app-data)
replays:     ; $(BE) python ../tools/build_replays.py $(if $(UPLOAD),--upload) && $(MAKE) app-data
app-data:    ; $(TOOLS) tools/export_app_data.py
style:       ; $(TOOLS) tools/make_style.py tools/vendor/positron.json > mobile/assets/map/fordcast-night.json && $(TOOLS) tools/make_style.py --minimal tools/vendor/positron.json > mobile/assets/map/fordcast-night-minimal.json
markers:     ; $(TOOLS) tools/make_markers.py --out mobile/assets/map/markers
claims:      ; $(TOOLS) tools/gen_claims.py
seed:        ; $(BE) python -m fordcast seed-sql > supabase/seed.sql && $(SUPABASE) db reset
seed-prod:   ; @test -n "$$DATABASE_URL" || { echo "DATABASE_URL is not set (Supabase session pooler, port 5432)"; exit 1; }; psql "$$DATABASE_URL" -v ON_ERROR_STOP=1 -1 -f supabase/seed.sql
model-live:  ; @test -n "$(VERSION)" || { echo "usage: make model-live VERSION=<model_version>"; exit 1; }; psql "$$DATABASE_URL" -v ON_ERROR_STOP=1 -v v="$(VERSION)" -f supabase/manual/set_model_live.sql
data-upload: ; $(TOOLS) tools/data_manifest.py --upload
data-fetch:  ; $(TOOLS) tools/data_manifest.py --download
cvd:         ; $(TOOLS) tools/cvd_screens.py docs/a11y/screenshots docs/a11y/cvd
notices:     ; mkdir -p build && (cd mobile && npx --yes license-checker-rseidelsohn@5.0.1 --production --markdown) > build/notices-npm.md && $(BE) --with pip-licenses==5.5.5 pip-licenses --format=markdown --with-urls > build/notices-py.md && $(TOOLS) tools/gen_notices.py build/notices-npm.md build/notices-py.md
test:        ; $(BE) pytest -q -m "not live" && $(NPM) test -- --ci
lint:        ; $(BE) ruff check . && $(BE) ruff format --check . && $(NPM) run typecheck && $(NPM) run lint
api:         ; $(BE) uvicorn fordcast.api.app:app --reload
ci:          lint test ; $(NPM) run doctor && ! grep -rnE --exclude-dir=__tests__ 'sb_secret_|X-Api-Key|EXPO_ACCESS_TOKEN' mobile/src mobile/app.config.ts && $(MAKE) claims && git diff --exit-code && $(BE) python -m fordcast replay-verify --all && $(MAKE) backtest CHECK=1 && $(TOOLS) tools/check_xrefs.py docs/MASTER_PROMPT.md
```

| Target | What it does | When |
|---|---|---|
| `setup` | installs both Python environments and the app's npm packages | once per clone |
| `smoke` | C §16.20 checks S1–S12 → `docs/data-bridge-verification.{md,json}` | Day 0; again after any API surprise |
| `data` | the non-interactive §17.1 pipeline (inventory → NWPS → `link` → backfill → learn → `seed.sql`) + manifest | Days 1–2; after inventory changes |
| `link` | NLDI snap → upstream → tiers | inside `data`; after a snap review |
| `latency` | freezes measured per-gauge delays into `data/latency/gauge_latency.json` (reads the live DB) | Day 8 before the science freeze |
| `backtest` | LOSO backtest → `docs/results/`, hero rule, then `app-data`; `make backtest CHECK=1` compares a fresh run with the committed results (CI) | Day 4 onward |
| `replays` | builds every bundled storm's timeline → `data/replays/` (+ `UPLOAD=1` for the Storage mirror), then `app-data` | Day 5 onward |
| `app-data` | copies seed, creeks, replays and results into the app with a sha256 manifest; generates `assets.ts` | after `data`, `backtest` or `replays` |
| `style` / `markers` | generate the map styles / marker sprites | Day 2; after a palette change |
| `claims` | `docs/CLAIMS.md` → app JSON + README splices | whenever a claim changes |
| `seed` | regenerates `seed.sql` and resets the **local** Supabase (Docker; run `npx --yes supabase@2.120.0 start` once first) | local testing |
| `seed-prod` | loads `seed.sql` into the production DB with `psql` (needs `DATABASE_URL`; tell the human first, it writes production data) | Day 6; after a seed change |
| `model-live` | `make model-live VERSION=<v>` makes exactly one `model_versions` row live (the baseline rule version is live by default) | Day 6; ML promotion (Stretch) |
| `data-upload` / `data-fetch` | Parquet files > 5 MB ↔ Supabase Storage, by `data/MANIFEST.json` | after a backfill; clean clones and CI |
| `cvd` | color-vision-deficiency renders of dev-gallery screenshots | Day 9 QA |
| `notices` | `THIRD_PARTY_NOTICES.md` (VERIFY BEFORE USE: `npm view license-checker-rseidelsohn version`; `pip-licenses` must run **inside** the backend environment, which is why it uses `--with` rather than a bare `uvx`, whose isolated environment would list only its own packages) | Day 10 |
| `test` / `lint` / `ci` | the §7.1 gates; `ci` mirrors `ci.yml` locally | before every push |
| `api` | local FastAPI with reload | development |

`supabase/manual/set_model_live.sql` (used by `make model-live`):
```sql
-- usage: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v v=<model_version> -f supabase/manual/set_model_live.sql
begin;
select 1 / count(*) from public.model_versions where version = :'v';   -- division by zero (abort) if the version doesn't exist
update public.model_versions set is_live = false where is_live and version <> :'v';
update public.model_versions set is_live = true  where version = :'v';
commit;
```

### 5.3 `tools/pyproject.toml` (exact)

```toml
# tools/pyproject.toml — environment for repo scripts in tools/ (separate, so the backend's pins never move)
[project]
name = "fordcast-tools"
version = "0.1.0"
requires-python = ">=3.13,<3.14"
dependencies = [
  "colorspacious==1.1.2",   # CVD simulation (Machado 2009): cvd_screens.py, contrast.py
  "numpy>=2.5,<2.6",        # colorspacious + image math
  "pillow>=12.3,<12.4",     # make_markers.py, cvd_screens.py
  "shapely>=2.1,<2.2",      # export_app_data.py geometry checks (creek direction gauge → crossing, service area)
  "pyproj>=3.8,<3.9",       # geodesic distances (export_app_data.py, road_elevation.py)
  "httpx>=0.28.1",          # data_manifest.py (Supabase Storage upload/download)
]

[dependency-groups]
dem = ["py3dep==0.19.0"]    # road_elevation.py only: `uv run --project tools --group dem python tools/road_elevation.py`

[tool.uv]
package = false
exclude-newer = "2026-09-30T00:00:00Z"
```

- Versions were checked on PyPI (newest release before the `exclude-newer` date): colorspacious 1.1.2, numpy 2.5.3, Pillow 12.3.0, shapely 2.1.2, pyproj 3.8.0, py3dep 0.19.0. Run `uv lock --project tools` and commit `tools/uv.lock`. VERIFY BEFORE USE: `uv sync --project tools --group dem` resolves on Python 3.13 (py3dep pulls rasterio/rioxarray; its `pygeoogc<0.20` pin conflicts with the backend's `pynhd 0.20`, which is exactly why it lives here and not in `backend/`). If it fails, F5 skips source 3 and those crossings stay tier B.
- PyYAML is not needed: storm metadata is TOML, read with the standard library's `tomllib`.
- The backend is **not** a path dependency: `backend/` is a non-package uv project (`package = false`). Scripts marked **[backend env]** (`smoke_test.py`, `build_replays.py`) run in the backend environment (`$(BE) python ../tools/<script>.py`). If one needs `fordcast` code, it either calls the CLI (`subprocess.run([sys.executable, "-m", "fordcast", …], cwd=<repo>/backend)`) or starts with `sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))`, because Python puts the script's own folder, not the working directory, on `sys.path`.
- Scripts that use only the standard library (`gen_claims.py`, `select_hero.py`, `check_xrefs.py`, `gen_notices.py`) still run through the tools environment for one consistent command.

### 5.4 `docs/architecture.md` outline (keep it in sync, §1.10)

Create it on Day 0 as a skeleton and fill it as components land. Sections, in order:

1. **Components** — one Mermaid `flowchart` (the README embeds this exact diagram):
   ```mermaid
   flowchart LR
     subgraph OFF["Offline: laptop / CI"]
       INV["Crossing inventory<br/>City · County · TxGIO · OSM"] --> LNK["NLDI linking<br/>linking/nldi.py"]
       HIS["USGS storm archive<br/>data/storms"] --> LRN["Travel time + triggers<br/>travel_time.py ★ · triggers.py"]
       LNK --> LRN --> BT["LOSO backtest<br/>scoring/ → results.json"]
       LRN --> RB["Replay build<br/>replay/build.py → data/replays"]
     end
     subgraph LIVE["Live: every 5 min"]
       CRON["Supabase pg_cron"] -->|"POST /internal/tick"| API["FastAPI on Render<br/>live.py + tick.py"]
       GHA["GitHub Actions watchdog"] -.->|"same tick"| API
       USGS["USGS Water Data API v1"] --> API
       API --> DB[("Supabase Postgres")]
       API --> SNAP["Storage<br/>snapshots/current.json"]
       API --> PUSH["Expo push → FCM"]
     end
     APP["FordCast app<br/>Map · Drive · Replay · Alerts"]
     SNAP --> APP
     DB -->|"Realtime"| APP
     PUSH --> APP
     RB -->|"make app-data"| APP
     BT -->|"results.json"| APP
   ```
2. **The tick** — a Mermaid `sequenceDiagram` of §20.3: `pg_cron` → `pg_net` POST `/internal/tick` (`X-Tick-Secret`) → 202 → lease (6 min; 240 s hard timeout) → USGS `latest-continuous` → upsert `readings` → `tick()` → write-on-change `risk_current` (Realtime) → `snapshots/current.json` → push fan-out → receipts → healthchecks ping; plus the watchdog path that skips while a lease is held.
3. **Data flow: offline → live → app** — inventory, linking, storm archive, learning and backtest (offline) feed `seed.sql`, the link table and the model version (live), which feed the snapshot, the bundled seed and the replays (app).
4. **Read-path fallback ladder** — Storage snapshot → `GET /v1/risk/current` → SQLite cache → bundled seed (every crossing Unknown), with the timeouts from §28.4 and the "waking server…" state.
5. **Replay pipeline** — USGS `continuous` → Parquet + `meta.toml` (with outages) → `StormReplaySource` (delays from `data/latency/gauge_latency.json`) → the same `tick()` → frames → `fordcast.replay.v1` → `data/replays/` → app assets + Storage mirror → player; the no-lookahead tests guard each arrow.
6. **Trust boundaries and secrets map** — the phone (publishable key only), Render (server secrets), GitHub Actions, Supabase Vault and EAS, each with the §1.9 values it holds; what crosses each boundary (phone → server: crossing IDs, push token, route endpoints in memory only; never a stored location).
7. **Box → file → §** table: every box above mapped to its file path (§5.1) and owning section.

Regenerate the diagrams whenever §20, §28.4 or §1.9 changes, and keep the README copy identical.

### 5.5 Import boundaries and naming

**Import boundaries (enforced by `backend/tests/test_truth_isolation.py`):** the runtime modules — `tick.py`, `live.py`, `snapshot.py`, `sources/**`, `features/**`, `model/{baseline_rule,combine,state_machine,windows,explain,ml}.py`, `api/**`, `push/**` — MUST NOT import `fordcast.scoring` or read `ground_truth_events`/`truth.csv`. Only offline learning/evaluation code (`linking/triggers.py`, `model/train_ml.py`, `scoring/**`, `replay/build.py`, `replay/verify.py`, `__main__.py`) may. `fordcast/replay/**` must not import `fordcast.push` (replay never pushes).

**Naming is final:** the backend is the flat `backend/fordcast/` package with `sources/ linking/ features/ model/ replay/ scoring/ push/ api/ store/ tick.py`, and explain-back docs live in `docs/explain/`. The research reports' alternative layouts (`backend/src/fordcast/`, `pipeline.py`, `risk/`, `eval/`, `pipeline/*.py`, `docs/learning/`) are not used anywhere.

---

## §6. Build plan — Wed Oct 14 → Mon Oct 26, 2026

**Calendar facts:** today is Day 0 (Wed Oct 14). **Submit on Sun Oct 25** (Day 11). The deadline is Mon Oct 26, 12:00 PM ET (Day 12, buffer only; confirm your office's date in Step 0). Weekends (Oct 17–18, 24–25) carry the heaviest student tasks.

**How to run each day:** work the **Backend/Data** and **Mobile** tracks in parallel; stop at student pause points (§1.8) and continue with the other track; finish the day only when its **Gate** passes, then write the devlog entry and the end-of-day message (§1.4). If a Gate fails, the next day starts by fixing it, and you consult the cut order (§6.3) before adding anything new.

### 6.1 Day-by-day

**Day 0 — Wed Oct 14 · Decide, verify, scaffold**
- Human: Step 0 answers (§1.2, including Q14 icon/splash approval and the decided defaults D1–D10); create accounts and keys (Expo, Supabase, Render, USGS key, ORS, healthchecks.io ×2, UptimeRobot, Firebase project for FCM V1 → `google-services.json` as an EAS file variable and the FCM V1 key uploaded to EAS credentials before the Day-1 build). Every key goes where the §1.9 inventory says, nowhere else.
- Human + agent: **icon and splash assets** (F108). The agent drafts icon, Android adaptive foreground + monochrome, notification icon and splash icon as SVG and exports PNGs with a script (§15.5–§15.7); the human approves; commit them **today**, before the Day-1 build (the iOS `.icon` only if a Mac exists).
- Repo: root files (§5.1), the root `Makefile` (§5.2) and `tools/pyproject.toml` (§5.3), `AGENTS.md`/`CLAUDE.md` (§1.11), `AI_USE.md` stub (paste the CAC AI-rule text once the human provides it), MIT `LICENSE`, `.env.example`s and `supabase/manual/vault_secrets.example.sql`, `docs/MASTER_PROMPT.md`, `docs/CLAIMS.md` (every row "Roadmap" to start), `docs/architecture.md` skeleton (§5.4), README skeleton (§40.2).
- **Live data smoke tests:** run `make smoke` (= `tools/smoke_test.py`, checks **S1–S12 as defined in §16.20**; S9 and S11 are Stretch and are skipped without their keys; S10 is the manual ATXfloods look-only check). Commit `docs/data-bridge-verification.md` and `.json`. Don't keep a separate list here: §16.20 is the only definition of the smoke checks.
- Backend: `uv` project, `/v1/health` deployed on Render Free; Supabase project + `0001`–`0002` migrations; test that an anon insert into `crossings` is **denied**; CI green.
- Mobile: run **exactly the §25.4 install batches 1–10** (every native module for MVP and Stretch, plus the decided optional modules: `lottie-react-native` and `react-native-keyboard-controller` in; `expo-mesh-gradient` and `@react-native-ama/core` out; `@sentry/react-native` only if an EAS build works without an auth token; `expo-widgets` only in Lane B; `react-native-maps` only if `MapSurface.expogo.tsx` will be built, §5.1 note). Don't keep a separate install list here: §25.4 is the only list. `app.config.ts` with every plugin (§27); `npm --prefix mobile run doctor` clean.
- **Gate:** every MVP smoke check PASS, or a FAIL with its fallback written next to it; `/v1/health` 200; anon-insert-denied test green; expo-doctor clean; icon/splash committed; CI green.

**Day 1 — Thu Oct 15 · First dev build + crossing inventory**
- Start the **Android `development` EAS build first thing** (the free queue can exceed 90 min), or `npx expo run:android` locally. This is the build that must contain every native module (§1.3 rule 6) and the final icon/splash.
- **Device smoke tests on the dev build** (log each pass/fail and any fallback in `docs/decisions/verifications.md`): MapLibre v11 renders the generated FordCast Night style on OFM tiles with Noto labels; a `GeoJSONSource` with 3 state sprites and a max-rank cluster; **gorhom `BottomSheet` over the map** with 3 snap points and the map still interactive (fail → formSheet-only layout, F30); `crossing/[id]` formSheet with 3 detents; NativeTabs (4) + gear; Inter with tabular numerals; local notification on `crossing-urgent` (channel created before permission); `expo-speech` EN + ES; `expo-audio` chime; SQLite read/write; a Skia canvas; a Reanimated CSS animation; a Lottie file; Expo push token obtained.
- Data: F1 crossing inventory, F2 NLDI snapping (`make data` steps up to `make link`), notebook 01 map-check; agree the tier-A shortlist (10–20) with the student (Step-0 Q6).
- Mobile: tokens (`src/global.css` + `src/lib/theme.ts`), RNR theming import + components (§12: run `npx @react-native-reusables/cli@latest add --help` first, then `add <names> --styling-library nativewind --path src/components/ui -y` with the flags that `--help` confirms; if the CLI prompts or misplaces files, copy the component files from the RNR registry by hand and record that), fonts, i18n setup (`intl-pluralrules` first), `banned-words.json` + copy/parity tests in CI; **dev gallery skeleton + font probe** (F31b, §12.7).
- Student: **send the outreach emails today or tomorrow (Oct 15–16)** with the concept one-pager (design wireframes/mockups, no app screenshots yet; §42); read `docs/explain/overview.md`.
- **Gate:** dev build installed on a real phone; device smoke log committed; icon/splash assets final (any later change = a new build); `crossings.geojson` and links committed.

**Day 2 — Fri Oct 16 · Storm data + map skeleton**
- Data: F4 storm backfill (`halloween-2013`, `memorial-day-2015`, `halloween-2015`, `july-2025`, the `oct-2018` control and the `calm-2024` calm-day set; `meta.toml` with documented outages; `make data-upload` for Parquet > 5 MB), F5 ground truth (road elevation sources in F5 order; `tools/road_elevation.py` only if sources 1–2 fail), F16 NWPS crosswalk; notebook 02 plots upstream vs. at-crossing stage for one storm.
- Mobile: `make style`, `make markers`, `make app-data`; Map Home with real seed crossings, gauge dots, creeks, sprites, max-rank clustering (F28, F29, F31); map controls (F38: list, locate, zoom ±, gear, legend); Legend (F33); List alternative (F34); persistent sheet (F30); high-contrast tokens + `useTheme` HC switch (F42 MVP part).
- **Gate:** the notebook plot exists (concept-doc "Days 1–2" milestone); real crossings on the phone map; the tier-A count includes **only real** tier-A crossings (proxy-labeled ones are tier B).

**Day 3 — Sat Oct 17 · Travel time — STUDENT PAUSE #1**
- Agent: failing tests + skeleton + `docs/explain/travel_time.md` for `linking/travel_time.py` → **stop**. While waiting: `features/compute.py`; then `linking/triggers.py` (F7) once τ exists.
- Mobile: Crossing detail sheet (F43) from fixtures; RiskRing, RiskWindow, Hydrograph + "Show readings" (F45); deep links (F44); §3.7 wording bank into `en.json`/`es.json`, including every `reason.*` template EN/ES + `_spoken` (F14 client); crossing search, offline (F37 MVP part).
- Student: implement `travel_time.py` until tests pass; answer the explain-back questions.
- **Gate:** τ (median, P25, P75, n) for every tier-A link, sanity-checked; the sheet renders all 5 states; reason templates pass the banned-words and countdown guards.

**Day 4 — Sun Oct 18 · Rule + metrics + backtest — STUDENT PAUSES #2 and #3 (the heart of the project)**
- Agent: tests + skeletons + explain docs for `model/baseline_rule.py` and `scoring/metrics.py` → **stop**. Meanwhile: `model/state_machine.py` (F9), `model/combine.py` (F10), `model/windows.py`, `model/explain.py` (reason codes + τ ranges, F14), `scoring/backtest.py` (LOSO) + `scoring/nearest_gauge.py` (F12, F13), `tools/select_hero.py` (the pre-registered hero rule, written **before** the first backtest result is seen).
- Student: implement the rule and the metrics.
- **Gate:** `make backtest` writes `docs/results/results.json` and `results.md` with **real** POD/FAR/CSI/median-lead numbers, the calm-day false-alarm rate, the nearest-gauge comparison and the rule-chosen hero; the concept doc's results table is filled **from that file**. If the numbers are weak, report them honestly; never tune on the held-out storm (§1.5).

**Day 5 — Mon Oct 19 · DataSource + Replay engine — STUDENT PAUSE #4**
- Agent: tests (prefix invariance, future poison, source-rejects-lookahead, latency-respected, outage-respected, truth isolation) + skeleton + explain doc for `sources/base.py` → **stop**. Then `sources/replay.py` (60-min default delay, outage windows), unify everything behind `tick.py`, `replay/build.py` → `fordcast.replay.v1` timelines + golden sha256; `make replays` (`tools/build_replays.py` → `data/replays/`, then `make app-data` copies them, `results.json` and `assets.ts` into the app).
- Mobile: Replay picker (F77) and player v1 (F78) on the real bundled JSON, offline.
- Student: implement `base.py` (evening).
- **Gate:** all no-lookahead tests green in CI; hero storm plays on the phone in airplane mode; the 2013 replay shows UNKNOWN at US 183 during the documented outage.

**Day 6 — Tue Oct 20 · Live pipeline · Render Starter ON**
- Backend: `sources/usgs_client.py` + `sources/live.py`; `live.py` + `/internal/tick` with lease (6 min) and 240 s hard timeout (F22); `pg_cron` + Vault secrets (`tick_url`, `tick_secret`); `make seed-prod` (tell the human first: it writes production data) and `make model-live VERSION=<baseline rule version>`; snapshot to Storage (F23); Realtime publication (F24); MVP API routes (F25); healthchecks.io, UptimeRobot, Sentry, `tick-backup.yml` (F26). Human upgrades Render to **Starter** today (keep until Dec 31). The **live run starts now**: from here on, ticks must stay green.
- Mobile: snapshot fetch + zod, React Query persisted cache, SQLite cache, Realtime subscription (with the `closedByUs` lifecycle, F24), staleness + last-known (F11, F84–F86); freshness UI with check age and newest reading age (F35); calm-day state (F40); animated risk cues with Reduce Motion fallbacks (F32: Avoid halo, dash flow).
- **Gate:** the phone shows live risk from real gauges; the 20-minute Unknown rule and the per-crossing reading-age rule pass their fake-clock tests and an airplane-mode device check; healthchecks shows green ticks since the Starter switch.

**Day 7 — Wed Oct 21 · Alerts + full Replay + first preview APK**
- Backend: device registry + subscriptions (F27; crossing IDs only, `want_watch` per subscription); push fan-out with the §3.8 policy, EN/ES templates, receipts (F67).
- Mobile: notification foundation (F65), local alerts (F66), push registration, Notify me (F46), Alerts inbox (F71), test alert (F72), in-app banner (F36); full Replay player (scrubber a11y, ticks, jump/skip, water pulse + lag pair with τ as a range F79, results F80); onboarding + pledge + priming (F109, F110); Settings, About, Data sources, Privacy + `docs/privacy/index.md` (F103–F106); DEMO_MODE (F83); **debug screen (F107) before the push gate** (it holds "Subscribe to test-0001").
- **Live-run gate before the build:** ≥ 6 **continuous** hours of successful ticks (healthchecks history). Then build the first **`preview` APK**; configure EAS Update channel `preview` (F88).
- Student: **follow-up outreach** today or tomorrow (Oct 21–22) with real screenshots and the replay result (§42).
- **Gate:** a manual-source escalation pushes to a real Android phone; the preview APK runs on a second device.

**Day 8 — Thu Oct 22 · Drive Mode + Spanish + a11y + Stretch queue · SCIENCE FREEZE 18:00 CT**
- Mobile: Drive Mode (F57–F61, F64); **Replay drive** (F128) with `drive-replay.yaml`; Spanish complete and sent for native review (F96–F98); accessibility pass with TalkBack (F89–F93). Then the §6.4 Stretch queue from the top (items 1–3: route check, detour and replay routing through backend `/v1/route`, ORS + Stadia fallback).
- Before 18:00 CT: `make latency` (freeze the measured per-gauge delays into `data/latency/gauge_latency.json`), then `make backtest` and `make replays`, `make claims`; commit. These are the final numbers.
- Science freeze: after 18:00 CT, any change that alters `results.json` is a stop-and-ask (the video and answers depend on it).
- Human: comprehension test, evening 1 (4 people) on the preview APK.
- **Gate:** Drive Mode and Replay drive speak EN and ES on the device with both labels visible; parity test green; if Stretch items 1–3 shipped, the route check shows an Avoid with `replay_at` + `storm_id`.

**Day 9 — Fri Oct 23 · Stretch window + QA · FEATURE FREEZE 23:59 CT**
- Stretch only if every MVP Gate is green: **continue the §6.4 queue from where it stopped**, in order, one item at a time; stop at the feature freeze.
- QA: device a11y matrix (F95), `make cvd` renders, Maestro flows (F124), copy/contrast tests, calm-day review; fix comprehension-test findings (copy changes follow §1.7 item 1).
- Human: comprehension test, evening 2 (4 people incl. ≥ 2 Spanish speakers).
- **Gate:** feature freeze; `docs/CLAIMS.md` audited line by line; `es-pending-review.json` empty or its keys listed as known gaps.

**Day 10 — Sat Oct 24 · Video + documents · CODE FREEZE 18:00 CT**
- Capture with `scrcpy --show-touches --no-audio --record=take.mp4` in DEMO_MODE: Replay proof, live calm map, Check My Drive (only if C15 is Built), Drive Mode voice via Replay drive (F128, REPLAY + SIMULATED DRIVE labels visible), Spanish, TalkBack (VoiceOver only in Lane B/C), CVD still (§41). Edit to 2:15–2:30, EN captions + ES subtitles, logged-out link test.
- README final (tables generated, architecture diagram, hero rule), `AI_USE.md` authorship table, explain docs complete, `docs/architecture.md` complete, `make notices` → `THIRD_PARTY_NOTICES.md`, concept doc synced (the §1.10 checklist); student writes Q1–Q4 in their own words with numbers from `results.json`.
- Final `preview` APK; GitHub Release with APK, sha256 and `results.json`.
- After 18:00: bug fixes only, each with a test.
- **Gate:** unlisted video uploaded and tested logged out; answers final; release published.

**Day 11 — Sun Oct 25 · SUBMIT**
- Run §45; confirm ≥ 48 h of continuous successful ticks (healthchecks history, linked in the devlog); tag the submitted commit `cac-2026-submission`; submit on congressionalappchallenge.us; save the confirmation email as PDF in `submission/`; devlog.
- **Gate:** confirmation received.

**Day 12 — Mon Oct 26 · Deadline 12:00 PM ET (buffer)** — no code changes to the tagged commit; only fix submission-form problems.

**After submission (§43):** Render Starter through Dec 31; commit on **Nov 10, Nov 30 and Dec 15** (+ **Jan 4** only if judging runs into January), each a refresh of `docs/status.md`, so scheduled workflows stay enabled; check dashboards weekly; re-verify the USGS API, NWS User-Agent rules and Expo push credentials in January; refresh TestFlight builds if Lane B.

### 6.2 Freezes and budgets

| Freeze / budget | When | Rule |
|---|---|---|
| **SDK freeze** | Whole project through Dec 31 | Expo SDK 57, RN 0.86.3, React 19.2.3 — no upgrades |
| **Native freeze** | After the Day-1 dev build | No new native modules and no icon/splash changes (both are native; §26.6); at most one extra dev build (by Day 6) if a smoke test forces it. EAS budget: ≤ 4 development + ≤ 4 preview builds this month; everything else ships by EAS Update |
| **Science freeze** | Thu Oct 22, 18:00 CT | `results.json` changes need human approval (and then README, app and video must all be regenerated) |
| **Feature freeze** | Fri Oct 23, 23:59 CT | No new features; only fixes, copy corrections and docs |
| **Code freeze** | Sat Oct 24, 18:00 CT | Bug fixes only, each with a test and a devlog line |
| **Submission tag** | Sun Oct 25 | `cac-2026-submission` on the submitted commit; post-deadline work goes to a branch or the CHANGELOG "After submission" |

### 6.3 Cut order (if behind) and the never-cut list

Cut one item at a time and tell the human each time. A cut feature becomes **Roadmap** in `docs/CLAIMS.md`, the README and the About screen.

1. **Stretch first:** the cut order for Stretch items is the **§6.4 queue read from the bottom up**. An unstarted Stretch item is simply not started; a half-built one is removed or hidden behind a flag that is off (never a dead button).
2. **MVP only after every Stretch item is cut, and only with the human's OK**, in this order:
   1. Realtime (F24) — keep 60-second snapshot polling.
   2. Remote push (F67) — keep local notifications and in-app banners.
   3. Water-travel pulse animation (F79 pulse only) — keep the static `ic-flow-arrow` arrowheads and the range label.
   4. Animated risk cues (F32) — keep the static shapes.

**Never cut:** real live gauge ingest (F3) · NLDI linking, travel time, baseline rule, hysteresis (F2, F6–F9) · backtest numbers and the nearest-gauge comparison (F12, F13) · Storm Replay engine, no-lookahead tests and the bundled offline player with results (F75–F80) · the map with 4-way state encoding and its list alternative (F28, F31, F34) · Crossing detail (F43) · stale → Unknown (F11) · the local cache (F84) · the §3 safety copy, disclaimers, pledge and banned-words test · core Spanish UI strings (if Spanish voice alerts slip, drop only the voice claim) · the four student-owned files and `AI_USE.md` · README and the demo video.

### 6.4 Stretch queue (the only Stretch build order)

Work it strictly from the top, only when every MVP item due that day is done (§1.1 rule 4). Each step lists every Stretch ID it covers; every Stretch item in §4 appears exactly once. Lane B items are skipped unless Step 0 chose Lane B. If an item's VERIFY check fails, skip it, record why in `docs/decisions/`, and continue with the next.

| # | Item(s) | Why here |
|---|---|---|
| 1 | F49 Route check (+ F25 `route`/`route/check`) | The most useful Stretch feature; the video's Check My Drive shot needs it |
| 2 | F50 Detour | Completes Check My Drive; unlocks "reroutes you" (C16) |
| 3 | F54 Replay routing (`replay_at` + `storm_id`) | Lets the dry-day demo show a detour |
| 4 | F55 Live route re-validation + F57 RouteRibbon (Drive Mode with a route) | Small once 1–3 exist |
| 5 | F51 Saved places & routes (radius chips; on-device crossing IDs) | Turns routes into subscriptions |
| 6 | F52 Place search (+ F25 `search`, F37 places) | Destinations by name |
| 7 | F53 Nav-app hand-off (`handoff.tsx`) | Drivers keep their nav app |
| 8 | F70 Background geofence alerts (+ F110 background-location primer) | Unlocks "alerts in the background" (C22) |
| 9 | F74 Background refresh | Keeps cached risk fresh for geofences |
| 10 | F17 NWS alerts banner + F17b area-alert layer + F38 Layers sheet + F25 `GET /v1/styles/fordcast-night.json` (style updates without a new build) | Context during real storms; map-layer work in one place |
| 11 | F100 Crew list + F101 CSV export | The crews/bus-planner audience |
| 12 | F18 Basin rainfall (Open-Meteo quick path first, then MRMS) + F14 `RAIN_OVER_BASIN` | Earliest signal; "radar rainfall" only with MRMS (C14) |
| 13 | F15 ML classifier (+ F14 SHAP mapping, `NEAR_ROAD_RISING`, reliability diagram; `make model-live` only if it beats the rule) | Kept only if it beats the rule in LOSO |
| 14 | F39 Gauge mini-card + F16 NWS flood-category display | Evidence on demand |
| 15 | F47 Update log + F47b 7-day state timeline (+ F25 `crossings/{id}/history`) | History for one crossing |
| 16 | F48 Share | One share text (§3.7) |
| 17 | F78b JS replay mini-bar | Replay keeps playing across tabs |
| 18 | F69 Actionable notifications + F73 Quiet hours | Alert ergonomics |
| 19 | F81 Reveal truth + F82 NWS alert overlay in replay | Richer replay story |
| 20 | F62 Drive suggestion & motion detect | Nudges drivers into Drive Mode |
| 21 | F63 Background continuation of Drive Mode | Drive Mode alerts while another app is in front |
| 22 | F111 Android sticky drive status | Android companion to 21 |
| 23 | F94 Landscape (Map + Drive Mode) + F99 Pseudo-locale overflow test | Car mounts; Spanish expansion |
| 24 | F95 a11y tooling (`make cvd`) + F38b Controls on left + F110b Precise-location banner | Accessibility polish |
| 25 | F125 Sentry crash reporting (only if it is in the Day-1 build) | Production visibility |
| 26 | F67 Unknown push (saved routes during NWS warnings) + F67b Push anomaly guard (off by default) | Push-safety extras |
| 27 | F32 live water pulse along rising reaches + F45 live full-detent lag pair | Visual extras on live screens |
| 28 | F41 Glass chrome (iOS 26) + F108 animated splash overlay | iOS-only polish |
| 29 | F42 Light theme (+ F103 Appearance: System/Light) | Daytime option |
| 30 | F106b Store privacy drafts | Only needed if the app is ever published |
| 31 | F19 LCRA one-time historic CSV (only with LCRA's written permission) | Optional enrichment of `july-2025` |
| 32 | Lane B only: F68 iOS push + time-sensitive → F112 Live Activity → F113 iOS widgets | Needs a paid Apple account |
| 33 | F87 Offline map pack | Heavy; "works offline" needs the full §29 checklist |

### 6.5 Risks

The risk register (risk, likelihood, impact, mitigation, owner, § link) is in **§43**. Read it on Day 0 and again at each Gate; when a listed risk fires, follow its mitigation before continuing the day plan.

---

## §7. Definition of Done (global)

A task is **done** only when every applicable box below is checked **and** its §4 "Done when" passes with evidence linked in `docs/CLAIMS.md` (for features) or the devlog (for infrastructure).

### 7.1 Code quality gates (must pass locally and in CI)

**Mobile** (`cd mobile`)
- [ ] `npm run typecheck` — `tsc --noEmit`, strict, 0 errors.
- [ ] `npm run lint` — `expo lint` (flat `eslint-config-expo`) + Prettier, 0 errors; the lint rule banning `@react-navigation/*` imports passes.
- [ ] `npm test -- --ci` — jest-expo + RNTL, including `copy-banned-test`, `i18n-parity-test`, `risk-state-test`, `staleness-test`, `windows-test`, `replay-frames-test`.
- [ ] `npx expo install --check` and `npx expo-doctor@latest` — 0 issues.
- [ ] No native-only module imported at the top level outside its adapter/capability gate; no `console.log` of coordinates, tokens or secrets.

**Backend** (`cd backend`)
- [ ] `uv run ruff check .` and `uv run ruff format --check .` — clean.
- [ ] `uv run pytest -q -m "not live"` — unit, contract (cassettes with keys filtered), API, **no-lookahead** (prefix invariance, future poison, source rejects lookahead), **truth isolation**, **golden replay hashes**, **copy banned-words** — all green.
- [ ] `uv run mypy fordcast` — SHOULD pass (warnings tracked, not blocking).
- [ ] Schemas: `docs/schemas/snapshot.v1.example.json` and `replay.v1.example.json` validate in **both** pydantic (backend tests) and zod (mobile tests).

**Data & science**
- [ ] `make backtest` reproduces `docs/results/results.json` from a clean clone; POD moving > 10 points vs. the committed baseline fails CI and is a stop-and-ask.
- [ ] Replay timelines regenerate with matching sha256 (from the committed `data/latency/gauge_latency.json`, never the live DB); each ≤ 150 KB gzipped; `metrics`/`storyboard` generated, never hand-edited.
- [ ] `data/MANIFEST.json` lists every data file with its sha256; `make data-fetch` on a clean clone restores the Storage-hosted ones; `make app-data` produces no diff.
- [ ] No hand-typed metric literals in `mobile/src`, `README.md` or `submission/` (grep for `%`/`min` next to digits in result contexts; values come from `results.json`).

### 7.2 Safety & copy
- [ ] Every new user-facing string exists in `en.json` **and** `es.json` (+ `*_spoken` sibling if it carries status) and comes from or extends the §3.7 bank.
- [ ] Banned-words and countdown guards pass; no new allow-list entry without a negation and a reason.
- [ ] New ES strings are listed in `es-pending-review.json` until a fluent reviewer approves them; the file is empty (or gaps documented) at code freeze.
- [ ] Any screen showing a status shows its **source label** and **data age**; stale data renders UNKNOWN.
- [ ] No `Success` haptic, no green status color, no checkmark on a crossing, no countdown.

### 7.3 Accessibility (per screen or component touched)
- [ ] Every interactive element: role, label starting with its visible text, state/value, target ≥ 48 pt (≥ 76 in Drive Mode); RNTL `getByRole` test for primary controls.
- [ ] Manually checked with TalkBack on the Android device (and VoiceOver in Lane B/C): reading order, announcements per §34, no focus reset on refresh.
- [ ] Largest text (Android 200 % / iOS AX5): no truncated status words or windows; layout reflows.
- [ ] Reduce Motion and the in-app Animations toggle stop loops live; Reduce Transparency removes glass; grayscale keeps every state distinguishable.
- [ ] Results recorded in `docs/a11y/TESTING.md` when a claim depends on them.

### 7.4 Performance budgets (targets; §36 owns measurement and tuning)

| Budget | Target |
|---|---|
| Cold start → interactive Map Home with cached data (release build, mid-range Android) | ≤ 2.5 s |
| Map pan/zoom with all crossings + ≤ 20 animated markers | ≥ 55 fps; ≤ 2 looping animations on screen |
| Replay playback at 60× | No JS task > 100 ms; memory growth < 50 MB over 10 min |
| Snapshot `current.json` | ≤ 10 KB gzipped (expected ~4 KB) |
| Replay timeline | ≤ 150 KB gzipped per storm; all bundled replays ≤ 1 MB |
| Tick end-to-end (ingest → snapshot → push) | p95 ≤ 60 s; state change visible on the phone ≤ 10 s after the tick completes |
| `GET /v1/risk/current` on Render Starter | p95 ≤ 300 ms (excluding cold start) |
| Battery | No continuous background location outside an active Drive Mode session |
| APK size | Logged in the devlog for every preview build; investigate any jump > 20 % |

### 7.5 Honesty, docs and history
- [ ] `docs/CLAIMS.md` row updated with evidence; `claims.generated.json` regenerated; README Built/Prototype/Roadmap table matches.
- [ ] `FordCast_CAC_Submission.md` (the §1.10 checklist), `docs/explain/<module>.md`, `docs/architecture.md` (§5.4) and `README.md` reflect the change (§1.10).
- [ ] `grep -nE "NOTE TO [R]EVIEWER" docs/MASTER_PROMPT.md` returns nothing (no unresolved review notes), and every `> OPEN QUESTION` line has its answer recorded in `docs/decisions/step0.md`.
- [ ] `uv run --project tools python tools/check_xrefs.py docs/MASTER_PROMPT.md`: every `§N` / `§N.M` cited exists as a heading.
- [ ] Student-owned files: authorship recorded in `AI_USE.md`; explain-back questions answered by the student.
- [ ] Small Conventional Commits with the required agent trailer; CI green on `main`; no history rewriting.
- [ ] No secrets or coordinates in code, logs, cassettes, screenshots or the devlog.
- [ ] Devlog entry written; end-of-day message sent with the student's to-do list.

### 7.6 Release readiness (for any build given to testers or judges)
- [ ] Built from a clean checkout with the `preview` profile; `DEMO_MODE` disabled (build check passes).
- [ ] Calm-day walkthrough: complete, alive, no broken panels, no banned words.
- [ ] Airplane-mode walkthrough: Replay works; live screens show age labels, then Unknown after 20 min.
- [ ] Maestro flows pass on the APK; the APK is attached to a GitHub Release with its sha256; the README link points to it.
