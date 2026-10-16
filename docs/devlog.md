# FordCast devlog (01 §1.4)

## Day 1 · Fri Oct 16, 2026 (started on Day 2's date; Day 1 tasks first, §6)

- **Mode:** cloud agent (Linux, no Xcode). The agent writes code, runs `tsc`/`eslint`/`expo prebuild --no-install` and pushes to `claude/tender-mayer-nm9xab`; the student runs every Mac/iPhone step.
- **Built (cloud-verified, not yet on the iPhone):** Step 0 recorded; `mobile/` scaffolded from `default@sdk-57` and reset; the full §9.3 native install list (every pin matches §1.3); `app.config.ts` with `withFreeTeamSigning` first; Spanish Info.plist strings; the temporary smoke screen (map, 8 s notification, EN/ES speech, haptic, Skia); `AGENTS.md`/`CLAUDE.md`; root `.gitignore`.
- **Checks:** `tsc` and `eslint` clean; cloud prebuild passes every §9.7 grep (0 × `aps-environment`, pod floor, MLRN hook, scene manifest); iOS Metro export builds. No Jest suites yet (the engine port starts Day 2).
- **Blockers:** (1) macOS 26.5.1 is below the 26.6 that Xcode 27.1 needs for the iOS 27 path; the student wants an Xcode beta → decision pending. (2) Bundle ID last name pending: `app.config.ts` refuses to load until `BUNDLE_ID` is set. (3) The cloud policy blocks `api.expo.dev`, `exp.host` and `reactnative.directory` (installs worked offline; `expo-doctor` must be re-run on the Mac).
- **Gate:** not passed yet — S1–S3 and S8 need the student's Mac and iPhone (`docs/decisions/verifications.md`).
- **Tomorrow (agent, Day 2 per §6):** tokens + Inter + `AppText`; i18n with the full §3.7 bank, banned-words and parity tests; NativeTabs shell + every sheet registration; GlassSurface; StatusGlyph/StatusChip; port the non-★ engine, sim, data and scenario files from `05-code/` with their tests; golden fixtures + `source.ts` in golden mode; ★ #1 prep; icon/splash drafts.
