# Decision log: how conflicts between the research reports were resolved

> These 56 binding resolutions (R1–R56) were applied across the master prompt after two independent critics (one for completeness, one for consistency and correctness) reviewed the first draft and found 89 issues. Kept here for traceability. If the master prompt and this log ever disagree, the master prompt wins.


These decisions settle every conflict the critics found. When an issue's "fix" text disagrees with this file, THIS FILE WINS. Apply only the parts that touch YOUR file, but phrase them so all files end up consistent.

## Contracts and ownership
- R1 **Route API.** C §22.5 (server) is canonical: request fields, response fields, `extra="forbid"`, provider enum. D §32.2's zod schema, request body, and every client usage MUST mirror C §22.5 exactly. Replay requests use flat `replay_at` + `storm_id`. Delete any note in D that describes §22.5 differently.
- R2 **Nullable fields.** C §22.3 says nullable fields are always present as explicit `null`. Every client zod schema uses `.nullable()` (not `.optional()`) for them, including the replay timeline schema in D §33.
- R3 **Section ownership.** §4 owns tiers and feature IDs. §3.7 owns ALL user-facing copy (EN/ES), including notification copy. Push channel IDs are `crossing-urgent`, `crossing-watch`, `updates`, `drive-mode`. B owns visual values (colors, sizes, splash, tab-bar colors); D config MUST match B (splash imageWidth 76, NativeTabs indicatorColor/rippleColor `#24344F`, `labelVisibilityMode="labeled"`, `minimizeBehavior="never"`, the sheet corner radius from B). C §21/§22 own the data and API contracts; A and D conform. Visual or style asset URL path: `GET /v1/styles/fordcast-night.json` (C §22.2). The style is ALSO bundled in the app at `mobile/assets/map/fordcast-night.json`.
- R4 **Tick naming.** Use C §19.1's actual module and signature everywhere. Add one line in A §1.11 mapping the decision sheet's `pipeline.tick(now, source, clock)` to C's name.

## Safety and copy
- R5 **No single-number travel times or countdowns in user-facing text** (including a11y labels, TTS, reduced-motion labels, onboarding, and reason templates).
  - Show upstream travel time as a rounded RANGE, e.g. "water usually takes 30–45 min to get here". Bucket τ into 15-min ranges using τ's uncertainty.
  - Exact τ appears only in the debug screen and in docs.
  - EtaRangePill: when lo = 0, show "Water may already be on the road" (never "now–15 min").
- R6 **Banned words.** Rename offending chrome strings:
  - "Clear cache" → "Delete cached data"
  - "Open detour in …" → "Show detour in …"
  - Other "Open …" buttons → "View …" or "Go to …"
  - Legend "Not safe" → "Never means safe" phrasing, under the allow-listed key `legend.never_safe`
  
  Onboarding keys MUST use the namespaces already allow-listed in A §3.12 (`onboarding.pledge.*`, `onboarding.legend.*`, `legend.never_safe`). Change B's `onb.*` / `pledge.*` keys to those.
- R7 **Freshness honesty.**
  - The FreshnessPill shows tick age as "Checked 2 min ago". Never say "Live" alone.
  - The Crossing Card ALSO shows the newest upstream reading age ("Newest gauge reading: 55 min ago").
  - UNKNOWN is driven by per-crossing reading age (C §18 freshness rules), not by snapshot age.
- R8 **Status wire names.** Only the current names are accepted (`no_rise`, `watch`, `avoid`, `closed`, `unknown`). zod rejects retired names. If one crossing fails to parse, that crossing renders UNKNOWN and the error is logged; the rest of the snapshot still renders. B §9.6 conforms to this.
- R9 **UNKNOWN haptic.** Follow B §11.6: `impactAsync(Soft)` on iOS, `Gesture_End` on Android. A §3.13 conforms.
- R10 **Green-hue guard.** The range is 75°–165° (A §3.12). B §9.14 conforms.
- R11 **Replay demo notifications.** The body MUST start with "REPLAY — not a live alert:" (ES: "REPRODUCCIÓN — no es una alerta real:"). Use the `updates` channel, never `crossing-urgent`.

## Privacy
- R12 **No location-derived subscriptions on the server.** REMOVE `recent_area` everywhere (A F27, C §21.1/§22.7/§23.1, D §31.4 and any other place).
  - The server only ever stores explicit crossing-ID subscriptions. These come from crossings the user saved, or are resolved ON DEVICE from saved routes and saved places.
  - Saved places use the place's radius chip (1/3/5 mi, default 3 mi = 4,828 m). The device computes the crossing IDs; the server never sees the radius or coordinates.
  - "Near me" awareness comes from on-device geofences + local notifications only.
- R13 **Search.** Place search MUST NOT send the user's location. Use a fixed Austin-area bias instead: Travis County center or bounding box, constant in C. Update C §16.13/§22.6 and D §32.6.
- R14 **On-device data statements** must be accurate. `recents` and `route_cache` hold coordinates on the device only, deletable via "Delete cached data". The privacy policy wording is generated from these statements.
- R15 **Watch pushes.** The client sends per-subscription `want_watch` (C §23.2 semantics). The device default is off.

## Tiers (A §4 is canonical; B/D conform)
- R16 Tier assignments:

  | Feature | Tier |
  |---|---|
  | Crew/Hotspot list | [Stretch] |
  | Share | [Stretch] (one share text, defined in §3.7) |
  | Glass chrome (iOS 26) | [Stretch] (MVP uses solid surfaces on both platforms) |
  | JS replay mini-bar | [Stretch] |
  | Saved crossings | [MVP] |
  | Saved places/routes | [Stretch] |
  | Departure reminder | [Roadmap] |
  | Landscape Drive Mode | [Stretch] |
  | Foreground Drive Mode + driver lockout | [MVP] |

  **Replay drive** ("Drive this storm (simulated)", D §30.7) is [MVP]. A adds it as **F128** with an acceptance test, a §6 day slot, and a Claims Ledger row. E's video take 6 references F128.
- R17 Every feature specified anywhere gets a §4 ID. Add the missing rows (controls-on-left, precise-location banner, NWS area-alert layer, 7-day mini timeline, etc.) and give every Roadmap row a "Done when: README Roadmap row + GitHub issue exists".

## Data and science
- R18 **2013 gauge outage (critical).** Model documented TRANSMISSION outages explicitly:
  - Per-storm `meta.toml` lists `outages = [{site, start, end}]`.
  - Any reading with observation time inside an outage window gets `available_at = max(time + latency, outage_end)`.
  - The replay therefore shows UNKNOWN for that gauge's crossings during the outage even if the archive later contains the readings. If the archive has a true gap, the gap also yields UNKNOWN.
  - Add a test for this.
  - D §33 and E §41 describe it as "the gauge went silent; its readings only arrived later".
- R19 **Latency defaults.** Replay default arrival delay is 60 min (conservative; C §19.4). A F75 conforms.
  - Per-gauge measured latencies are snapshotted into the committed file `data/latency/gauge_latency.json` (written by `make latency`). Replay builds and CI `replay-verify` use that file, never the live DB.
- R20 **Calm-day dataset.**
  - C defines a storm-catalog entry `calm-2024` (or similar): N ≥ 30 non-flood days sampled from the available record, documented sampling rule, backfill command, truth = no overtop.
  - It feeds false alarms per crossing per 100 calm days and ML calm sampling.
- R21 **Hero selection (no cherry-picking).** `results.json.hero` is filled by a pre-registered rule in `tools/` code: the tier-A crossing hit whose lead time is closest to the overall median lead time, within a bundled storm. The README states the rule. Never pick the maximum.
- R22 **Road elevation for the `gauge` truth class.** Sources, in order:
  1. NWS NWPS impact statements or flood categories that name the crossing.
  2. City LWC gate data.
  3. USGS 3DEP 1 m DEM via `py3dep` (HyRiver; VERIFY BEFORE USE with `pip index`/PyPI). Convert to gauge datum with USGS site datum metadata (NAVD88/NGVD29 offsets).

  If none is obtainable, the crossing is tier B (proxy), labeled honestly. Day 1–2 gate counts only real tier-A crossings.
- R23 **Production seeding.**
  - `make seed-prod` loads seed data via psql using `DATABASE_URL`.
  - `make model-live VERSION=x` sets `model_versions.is_live`; the baseline rule version is live by default.
  - Document both in C §20/§21 and A §6 Day 6.
- R24 **App bundle data.** `make app-data` (tools/export_app_data.py) copies `data/seed/crossings.geojson`, `data/seed/gauges.geojson`, `data/creeks/creeks.geojson` and the bundled replays into `mobile/assets/seed/` and `mobile/assets/replays/`, with a sha256 manifest.
- R25 **Large data.** `tools/data_manifest.py --upload` uploads Parquet files over 5 MB to Supabase Storage and writes `data/MANIFEST.json` (path, sha256, size, url). CI downloads by manifest. `make data-upload` wraps it.
- R26 **Bundled storms (canonical list).** `halloween-2013`, `memorial-day-2015`, `halloween-2015`, `oct-2018`, and `july-2025` (USGS-only data, honestly reported; LCRA is optional enrichment). Use only those whose data checks pass.
  - Maestro E2E uses `HERO_STORM_ID` from the generated `mobile/assets/replays/index.json` (first bundled storm if unset). Never hard-code a storm.
- R27 **Reason templates** use i18next `{{var}}` interpolation. Each source variant gets its own key (no `{a|b}` syntax).
- R28 **Lease timing.** Tick hard timeout 240 s. Lease interval 6 minutes. The watchdog skips if a lease is held.
- R29 **Saved-place radius** as R12. C and A F27 say "radius chosen on device (1/3/5 mi)".
- R30 **Live-run gate.** C §20.13 "≥ 6 h of ticks" becomes "≥ 6 continuous hours of successful ticks before the Day-7 preview build; ≥ 48 h before submission". Align with A §6.
- R31 **Android geofences.** OS limit 100. FordCast default cap is 60 for battery (configurable up to 100). State this once in D §30.3. A F70 matches, with a NOTE-free sentence.

## Repo, tooling, CI
- R32 **Marker sprites (canonical).**
  - Folder: `mobile/assets/map/markers/`.
  - Names: `ic-norise`, `ic-watch`, `ic-avoid`, `ic-closed`, `ic-closed-official`, `ic-unknown`, `ic-unknown-lastwatch`, `ic-unknown-lastavoid`, `ic-unknown-lastclosed`, `ic-flow-arrow` (+ @2x/@3x).
  - Generated by `tools/make_markers.py`.
  - A §5, B §9.8/§10.9/§12.2, and D §29.2–29.4 all use exactly this.
- R33 **Python tooling project.** Create `tools/pyproject.toml` (uv project `fordcast-tools`: colorspacious 1.1.2, Pillow, shapely, pyproj, pyyaml if needed, plus backend as a path dependency where needed).
  - Commands: `uv run --project tools python tools/<script>.py`.
  - Replace every `uv run --group tools` and bare `python3 -I tools/...` that needs third-party packages.
- R34 **Root Makefile.** A §5 gives the full root Makefile with these targets: `smoke`, `data`, `latency`, `link`, `backtest`, `replays`, `app-data`, `style`, `markers`, `claims`, `seed`, `seed-prod`, `model-live`, `data-upload`, `cvd`, `test`, `lint`, `ci`.
  - Each target has a one-line recipe that delegates to `uv run --project backend …`, `uv run --project tools …`, or `npm --prefix mobile …`.
  - C/D/E reference these targets by name.
- R35 **CI gates.** C §24.9 `ci.yml` MUST include every gate referenced elsewhere:
  - check-pins
  - `npx expo install --check`
  - mobile secret grep (no `sb_secret_`)
  - hand-typed-metric grep
  - `make claims && git diff --exit-code`
  - banned-words tests (Jest + pytest)
  - replay-verify
  - no-lookahead tests
  - `make backtest --check` against committed results

  Repo-guard greps exclude test files that must contain the literal patterns (or the tests assemble the strings by concatenation).
- R36 **ESLint.** `eslint.config.js` ignores itself. Remove the redundant selector rule and keep the `no-restricted-imports` pattern for `@react-navigation/*`.
- R37 **MapSurface adapter.** Metro bundles every `require()` statically. If the Expo Go fallback exists, BOTH `@maplibre/maplibre-react-native` and `react-native-maps` (SDK-bundled 1.27.2 via `npx expo install`) MUST be installed. The lazy require prevents evaluation, not bundling. If the fallback is skipped, delete `MapSurface.expogo.tsx` and the branch entirely. Never wrap `require` in try/catch.
- R38 **Realtime lifecycle.** Use a `closedByUs` flag (or AbortController). Cleanup and error paths never trigger the auto-resubscribe. Reconnect with backoff only on unexpected `CLOSED`/`CHANNEL_ERROR` while the app is foregrounded.
- R39 **Apple Maps version check.** Parse the major and minor as integers (`const [maj, min] = Platform.Version.split('.').map(Number)`). Never use parseFloat.
- R40 **Location primer.** It is contextual (D §30.1): shown before the first "center on me", Check My Drive, or Drive Mode, never on the first Map Home render. B §13.3 conforms.
- R41 **Drive Mode suggestion.** Median speed > 6.7 m/s over 15 s (accuracy < 50 m) or automotive motion activity (F62 / D §30.6). This is separate from the lockout threshold (≥ 4.5 m/s for ≥ 5 s).
- R42 **Example names.** Use only real gauge names from C §16.18 (e.g. 08154700 "Bull Ck at Loop 360 nr Austin"). Never invent gauge or road names in examples or fixtures. Use `test-0001` for fixtures.
- R43 **MapLibre v11 terms.** Use `<Layer type="symbol">`, never `SymbolLayer`.
- R44 **Optional native modules decided before the Day-1 build.**
  - Include `lottie-react-native` and `react-native-keyboard-controller`.
  - Exclude `expo-mesh-gradient` and `@react-native-ama/core`.
  - Include `@sentry/react-native` only if the build works without an auth token.
  - A Step 0 lists these as decided defaults. D §25.4 includes them in the first-build install list. A §6 Day 0 references D §25.4 instead of keeping its own partial list.
- R45 **Smoke tests.** A §6 Day 0 references C §16.20 S1–S12 by ID and does not keep its own list.
- R46 **Secrets inventory.** A §1.9 and C §24.2 must list identical, complete inventories:
  - Render env vars
  - GitHub Actions secrets: `API_BASE`, `PROJECT_CONTACT_EMAIL`, `HC_NIGHTLY_URL`, `USGS_API_KEY`, `EXPO_ACCESS_TOKEN`, `TICK_SECRET`, `SUPABASE_SECRET_KEY`, `DATABASE_URL`, etc.
  - Supabase Vault entries: `tick_url`, `tick_secret`
  - EAS secrets/file variables: `GOOGLE_SERVICES_JSON`, FCM V1 service-account key upload
  - App `EXPO_PUBLIC_*` values
- R47 **Commit calendar.** Nov 10, Nov 30, Dec 15 (+ Jan 4 only if judging runs into January). Same in A §6, C §20.6, and E §38.7/§43.
- R48 **Outreach timing.** Emails on Oct 15–16 attach a concept one-pager with design wireframes/mockups (no app screenshots yet). Send a follow-up with real screenshots plus the replay result on Oct 21–22.
- R49 **Third-party notices.**
  - npm: `npx --yes license-checker-rseidelsohn --production --markdown` (VERIFY BEFORE USE with `npm view license-checker-rseidelsohn version`).
  - Python: `uvx pip-licenses --format=markdown --with-urls` (VERIFY).
  - Output: `THIRD_PARTY_NOTICES.md`, plus a manual section for OSM/OpenFreeMap/OpenMapTiles/ORS/USGS/NOAA data attribution.
- R50 **RNR CLI.**
  - Run `npx @react-native-reusables/cli@latest add --help` first.
  - Then `add <names> --styling-library nativewind --path src/components/ui -y` (flags VERIFY from --help).
  - If the CLI prompts or misplaces files, copy the component files manually from the RNR repo's registry and record that.
- R51 **Privacy policy.** It has content per cac.md §7.2: who we are, what's on device, what reaches servers, children under 13, third parties, retention, how to delete or revoke, effective date, contact.
  - Source: `docs/privacy/index.md`, EN + ES.
  - Published via GitHub Pages: Settings → Pages → main /docs (repo public).
  - Linked from Settings → Privacy and from the README.
  - Store data-safety drafts live in `docs/store/` as [Stretch] F-row "Store privacy drafts", content per cac.md §7.4.
- R52 **docs/architecture.md outline.** Components diagram (Mermaid), the tick sequence, the data flow (offline → live → app), the read-path fallback ladder, the replay pipeline, the trust boundaries/secrets map, and the links to §§. Owned by A §5. The README embeds the Mermaid diagram.
- R53 **Risk register.** E §43 gets a risk register table: risk, likelihood, impact, mitigation, owner, § link. It covers cold starts, Supabase pause, GH schedule auto-disable, USGS API change, data-latency optimism, no ATXfloods feed, few storms or ML overfit, datum errors, Realtime quota, alert fatigue, and EAS queue delays.

## NOTE TO REVIEWER blocks
- R54 Resolve EVERY "> NOTE TO REVIEWER" block in your file. Either apply the resolution (from this file, or the obvious consistent choice) and delete the note, or, only if it truly needs the human's input, convert it to "> OPEN QUESTION (ask in Step 0): …" and make sure A §1.2 Step 0 lists the same question. Target: zero NOTE TO REVIEWER blocks remain.

## Cross-references
- R55 Fix wrong § references per issue comp18. Before finishing, grep your file for "§" references and check each points to the right section of the master (§1–§45 map). Known fixes:
  - freshness rules = §18.9 (not §18.10)
  - contract/nightly tests = §24.7 (not §24.8)
  - seed.sql = §21.5 (not §21.6)

  Check the rest against the actual headings in the part files.

## R56. Follow-ups from fixers that already finished (A and B.1). Binding: apply the items for YOUR file.
part-A.md and part-B.1.md are DONE; don't edit them. They introduced these names you must match:
- Feature IDs: F17b (NWS area-alert layer), F31b (dev gallery), F38b (controls on left), F47b, F67b, F78b (JS replay mini-bar, Stretch), F106b, F110b, F128 (Replay drive, MVP), F123r–F125r.
- §3.7 keys (A owns them): `fresh.checked` ("Checked {{age}}"), the newest-gauge-reading key, `reason.*` templates using `{{tau_lo}}`/`{{tau_hi}}`, and the travel-range string "Water usually takes {{lo}}–{{hi}} min to get here".
- The A §5.2 root Makefile is canonical. Use `make backtest CHECK=1` (make rejects `--check`), `make data-fetch`, `make notices` (runs pip-licenses inside the backend env), `make app-data` (copies replays, results.json and assets.ts into the app), `make markers`, `make style`.
- A §1.9 holds the full secrets inventory. C §24.2 MUST copy it exactly.
- Privacy policy path: `docs/privacy/index.md`.
- B §10.9 holds the canonical marker table (folder `mobile/assets/map/markers/`, 10 names, `sprites.ts` with static requires).
- MVP is portrait-only everywhere, Drive Mode included. Landscape Drive Mode is F94 [Stretch]. `features.glassChrome = false` in MVP. `sheetCornerRadius` 28 is Android only.

Per-file follow-ups:
- **part-B.2.md:**
  - §12.5: `SymbolLayer` → `<Layer type="symbol">`.
  - §12.2 Step 7: use `make markers`.
  - §13.2: keys → `onboarding.*`; remove "≈38 m".
  - §13.3: location primer is contextual.
  - §13.4 and §14.4: "● Live · N min ago" → "Checked N min ago" (`fresh.checked`); drive suggestion > 6.7 m/s.
  - §13.5: `{{}}` placeholders; saved crossings for MVP (saved routes Stretch).
  - §13.11: Done-when is "portrait (MVP)".
  - §13.15: departure reminder is Roadmap F56.
  - §13.18: header [Stretch F100].
  - §15.5: icon = ice-colored dot with cyan ring, no red or amber.
- **part-C.md:**
  - §16.19: rename `llano-2018` → `oct-2018`; add the `calm-2024` entry; add `outages=[…]` to the `meta.toml` example.
  - §18.10: add `tau_lo_min`/`tau_hi_min` to the reason object; templates point to A §3.7 `reason.*` (remove "~{tau} min away", "in 30 min", `{gauge|source}`); delete the note.
  - §19.13: storyboard templates use `{{tau_lo}}`/`{{tau_hi}}` and `{{var}}`.
  - §19.14: `build_replays.py` writes `data/replays/` and `backend/fordcast/replay/data/`, not `mobile/assets`; `make app-data` copies to the app.
  - §18.13 and §20.11: replace the Makefile snippet and the target list with a pointer to A §5.2; add `--out` to the CLI `latency recompute` command.
  - §24.2: copy A §1.9 exactly.
  - §24.3: policy path `docs/privacy/index.md`.
  - §24.9: use `make backtest CHECK=1` and `make data-fetch`; the secret grep excludes test files.
  - §23.1, §23.3, §20.13: apply R12, R29, R30.
- **part-D.1.md:**
  - §25.4: lottie + keyboard-controller go in batch 4; drop the "optional" line.
  - §27.3: MVP `orientation: 'portrait'`.
  - §28.1: add `lib/fonts.ts`, `live/DriveActivity.tsx`, `features/replay/assets.ts`, `features/map/sprites.ts`.
  - §28.2/§28.3: no drive-mode `'all'` orientation in MVP; crew → Stretch; Android-only `sheetCornerRadius`.
  - §28.4: add a `['gauges','static']` query.
  - §28.5: parse per crossing (R8).
  - §28.10: `features.glassChrome = false`.
  - §29: generate the style via `make style`; creek properties per F86; §29.4 delete the NOTE and point to the B §10.9 list.
- **part-D.2.md:**
  - §30.7: label as F128 [MVP]; landscape is Stretch F94.
  - §33.1: `assets.ts` is generated by `make app-data`.
  - §34.7 and §37 item 65: landscape is Stretch.
  - §36.2: add `drive-replay.yaml` and `HERO_STORM_ID`.
- **part-E.md:**
  - §44.2: add Claims Ledger row C46 for F128.
  - §41 take 6: reference F128.
  - §40.6: notices from `make notices`.
  - §40.7: add `google-services.json` and other credential files to the `.gitignore` list.
  - §40.2: use `make data-fetch`.
