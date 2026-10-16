# Step 0 answers (01 §1.2)

Recorded 2026-10-16 (Fri, Day 2 by date; Day 1 tasks first per §6). Agent mode: **cloud container** (Linux, no Xcode):
the agent writes code, runs `jest`/`tsc`/`expo prebuild -p ios --no-install` and pushes; the student runs every
Mac/Xcode/iPhone step (§8–§11) and pastes the output back.

`grep -rnE '^> OPEN QUESTION \(ask in Step 0\)' docs/demo-prompt/` → no hits, so there are no questions 16+.

| # | Question | Answer | Consequence |
|---|---|---|---|
| 1 | iPhone + iOS | iPhone 15 Plus, **iOS 27**; automatic updates off | **Path B**: Xcode 27.1 + `enableSceneSupport` (02 §8). Device class T · W (430 × 932, Dynamic Island) |
| 2 | Mac | M4, **macOS 26.5.1**, enough free disk; wants to use an **Xcode beta** | **OPEN (blocking the device gate):** Path B needs macOS Tahoe **26.6+** for Xcode 27.1 (02 §8.1). Student to send `sw_vers` + `xcodebuild -version`; recommended: update macOS to 26.6+ and use release Xcode 27.1 (§1.7 #6) |
| 3 | Apple Account | **PENDING** (answer left as the template "[appears / was refused → parent's]") | Own free account; a parent's if Xcode refuses it (02 §8.7) |
| 4 | Bundle ID | `com.<lastname>2026.fordcast` — **last name PENDING** | `mobile/app.config.ts` refuses to run until `BUNDLE_ID` is set, so no App ID can be registered by mistake (02 §9.1 rule 2) |
| 5 | Live Activity spike | No (default) | DD8: Live Activity / Dynamic Island = [NEXT] |
| 6 | District | TX-10, Mon Oct 26 2026 12:00 PM ET — **unconfirmed**; student checks house.gov today | §32.1 R1/R7; submit Sun Oct 25 regardless |
| 7 | CAC 2026 rules | Not yet pasted; defaults for now | AI allowed with full disclosure; video **Public** (DD14). `AI_USE.md` §1 says "Rule not yet read — UNVERIFIED" until pasted |
| 8 | Name / school / city / email | Placeholders | `[NAME]`, `[SCHOOL]`, `[CITY]`, `[EMAIL]` |
| 9 | Repo public at submission | Yes | Flipping it stays a stop-and-ask (§1.7 #4) |
| 10 | Spanish reviewer | A Spanish teacher (asking today) | Review done by the Thu Oct 22 copy freeze (§27.5) |
| 11 | ★ files | Student writes them; default schedule | `student-written` mode with the hint ladder (§1.8): #1 Sat Oct 17, #2 Sun Oct 18, #3 Mon Oct 19, ~1.5 h each |
| 12 | Commits | (a) small commits straight to `claude/tender-mayer-nm9xab` | Conventional Commits (§1.4); never squash, rebase published history or force-push |
| 13 | Icon / splash | Agent drafts on Day 2; student approves before Saturday's device build | 03 §14.5 |
| 14 | Home/School pins | Generic pins in 78745, never real addresses | research-data §1.5 pins (05 `drive.ts` `PLACES`) |
| 15 | OpenRouteService | No key; routes traced by hand in geojson.io | 05 §21.5 fallback; no ORS attribution line |

Decided defaults DD1–DD14 (01 §1.2): accepted without objection.
