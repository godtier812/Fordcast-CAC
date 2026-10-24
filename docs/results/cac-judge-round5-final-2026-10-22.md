# FordCast Round 5: final repairs, craft review and recording handoff

October 22, 2026, America/Chicago. This pass implements repairs as explicitly requested, beyond the attachment's audit-only framing. Existing working-tree edits were preserved. No release, competition submission, external message or installation was performed. This is an independent simulated judging review, not an official CAC verdict.

**Verdict:** FordCast now presents a substantially more coherent, tested trip-awareness pilot. The strongest story is one familiar trip, a named crossing, the available evidence and an explicit gap. It remains an Austin-centered prototype, with no demonstrated district-wide reach or validated road-flood forecasting. More screens and more confident adjectives would not improve that evidence.

## Completed changes and why they matter

| Priority | Implemented change | Source / acceptance |
|---|---|---|
| 1 | Loading and failed official feeds cannot appear as “no closures returned.” Future-dated observations cannot count as current. Summary aggregates all member records. | [route-evidence.ts](C:/2025AppChallenge/mobile/src/lib/route-evidence.ts), [summary integration](C:/2025AppChallenge/mobile/src/screens/home/RoutePanels.tsx:414). New tests distinguish loading/failure/empty success, cached closure status, missing/future/stale readings. |
| 2 | HTTP 200 with a malformed ATXFloods or NWS payload is an error, not an empty hazard list. | [hazards.ts](C:/2025AppChallenge/mobile/src/lib/hazards.ts:55). Tests verify malformed payload rejection and legitimate empty-array acceptance. This protects the current cache/health logic from false source success. It is a shape guard, not complete validation of every row. |
| 3 | A new demo cannot animate the previous storm while awaiting provider state; returning to the previous storm after the new one commits ends the car run. | [useTripDemo.ts](C:/2025AppChallenge/mobile/src/features/demo/useTripDemo.ts:67). The previous guard exempted the storm that existed at startup indefinitely. New regression exercises A → start B → commit B → return A. |
| 4 | Simplified the trip hierarchy: summary is plain text inside its existing panel; source details are collapsed; the explanation follows the crossings instead of adding another box above them. Crossing names and status descriptions wrap. | [RoutePanels.tsx](C:/2025AppChallenge/mobile/src/screens/home/RoutePanels.tsx:400). Observed desktop and 390×844 mobile trip rendering. Replaced repeated technical counts with crossing groups, source records and sensor links. |
| 5 | Explicit presets use the advertised downtown origin rather than silently inheriting GPS/another origin. A chosen starting point takes precedence and is labeled as such. Origin changes during routing are deferred; a completed plan already using that origin is not needlessly replanned. | [monitor.tsx](C:/2025AppChallenge/mobile/src/lib/monitor.tsx:199), [origin replan](C:/2025AppChallenge/mobile/src/lib/monitor.tsx:654), [presets](C:/2025AppChallenge/mobile/src/screens/home/RoutePanels.tsx:57). Public downtown and College Station presets exercised; real-GPS interactions remain device acceptance work. |
| 6 | Capability-specific handoff status refreshes on screen focus. Reduced misleading promises in the planner hint and Drive description. Zero linked sensors and incomplete historical coverage now have explicit explanations. | [RoutePanels.tsx](C:/2025AppChallenge/mobile/src/screens/home/RoutePanels.tsx:490), [English copy](C:/2025AppChallenge/mobile/src/locales/en.json:361), Spanish equivalents. The College Station result shows incomplete coverage rather than reassurance. |
| 7 | Muted text is brighter without changing risk-state colors. | [tokens.ts](C:/2025AppChallenge/mobile/src/theme/tokens.ts:92). Old `#72849E` contrast on primary/elevated1/elevated2 was 4.48/3.94/3.34; new `#9AABC2` is 7.31/6.42/5.44. These are calculated opaque text/background ratios, not a complete accessibility certification. |
| 8 | Submission now uses the actual USGS gauge name, avoids unsupported higher-ground/NHTSA certification wording, removes a fabricated personal-story template, and states the verified national deadline. | [submission package](C:/2025AppChallenge/FordCast_CAC_Submission.md). No model, reference threshold, results file or student-owned scientific core was changed. |

## Verification results

Baseline claimed repairs were actually present: initial **94 mobile tests across eight suites, 19 extension tests, 59 backend tests**, TypeScript and lint passed. The final mobile suite has **101 passing tests across nine suites**. The seven added cases cover evidence-state grouping, malformed feed responses and the previous-storm return regression. The existing Round 4 Guardian and demo probes remain passing.

| Check | Final outcome | Evidence |
|---|---|---|
| TypeScript `tsc --noEmit --pretty false` | PASS, exit 0 | [output](C:/2025AppChallenge/docs/results/round5-typecheck-final.txt) |
| Expo lint `--no-cache` | PASS, exit 0; no warnings | [output](C:/2025AppChallenge/docs/results/round5-lint-final.txt) |
| Mobile Jest | **101 passed, 9 suites** | [output](C:/2025AppChallenge/docs/results/round5-mobile-final.txt) |
| Extension tests | **19 passed** | [output](C:/2025AppChallenge/docs/results/round5-extension-tests.txt) |
| Backend/scientific tests | **59 passed**, one Starlette/httpx deprecation warning | [output](C:/2025AppChallenge/docs/results/round5-backend-tests.txt). Local loopback access was required, as in Round 4. Backend code was unchanged by this pass. |
| Android JavaScript export | PASS, exit 0; one 6.4 MB JS entry, `Exported: .local/round5-android-export` | [log](C:/2025AppChallenge/docs/results/cac-round5-evidence/android-export.txt). This is not a physical Expo Go launch. |
| Banned-word and locale contracts | PASS within final Jest suite | No new reassurance exception was added. Proper source names and the existing pledge-negation exception remain governed by the existing tests. |

Intermediate type/lint failures during editing were corrected; the rows above refer to the final results, not those intermediate runs. The independent probe copies from earlier rounds were not left in the ignored test directory. Added product tests are permanent passing regressions.

### Fresh browser evidence, no longer blocked

The browser initially displayed the old missing-serializer error overlay. An intentional reload loaded the repaired build, and the error did not recur during the tested session. Tests used **390×844** and **1366×860** overrides. These were browser viewports, not physical devices.

- **Live trip:** downtown Austin → Onion Creek Park completed in the browser: about 14 minutes/9.3 miles, two inferred groups from four source records, one linked group and five matched NOAA events in that take. Counts are observed examples, not constants to hardcode into a video. One regional record remained separate from the E. William Cannon device group; no forced merge was introduced to manufacture a nicer count.
- **Crossing Detail:** E. William Cannon showed live sensor data, datum explanation, nearby history caveat and separate science disclosure. It correctly displayed Slaughter Creek at FM 2304 for gauge `08158860`. The previous written assertion that this was Onion Creek at Twin Creeks Road was wrong.
- **Archived car demo:** the Barton/2015 recording action started the simulation, produced a precomputed reroute around Henry Marx at Barton Creek, displayed the archived label and a visible Stop control on mobile. Stop and return to Live worked. The fifty-second arrival contract is covered by hook tests; this browser run was deliberately stopped and does not independently time a full fifty-second arrival.
- **Coverage:** downtown Austin → College Station completed at about 110 minutes/107 miles. It reported approximately 56% inside the configured radius, an incomplete-coverage warning and zero linked sensors. The 56% is sampled route distance in a configured circle, not a measurement of district coverage or inventory completeness. Spanish routing also showed the warning, no-sensor explanation and historical-data gap caveat.
- **Voice/Drive:** muting the checked Alerts switch, entering Drive and starting the HUD showed **Unmute**; Stop returned from the HUD. The original voice-enabled preference was restored. Test voice visibly entered Playing preview and then Preview ready. The short clip finished before a later Stop-preview click; that click was not accepted and is not claimed as proof that Stop worked during playback. Audible quality was not independently certified.
- **Storms/Lab:** the 4/12 detections, eight misses and one-versus-zero false alarm comparison were visible. View the science entered `/lab`; the dated, experimental evidence and unverified-road caveats were present.
- **Diagnostics:** the captured browser warning/error log was `[]` at the inspected point. [Saved log](C:/2025AppChallenge/docs/results/cac-round5-evidence/browser-diagnostics.json). This is not a promise of a universally clean console.

Screenshots: [mobile archived demo](C:/2025AppChallenge/docs/results/cac-round5-evidence/mobile-demo.png), [desktop trip](C:/2025AppChallenge/docs/results/cac-round5-evidence/desktop-trip.png), [coverage result](C:/2025AppChallenge/docs/results/cac-round5-evidence/desktop-coverage.png), [Spanish coverage](C:/2025AppChallenge/docs/results/cac-round5-evidence/spanish-coverage.png). Evidence was collected during this working session; later edits are not silently certified by earlier captures.

**Not verified:** a clean-storage first-launch pledge interaction this round; every button at both viewport sizes; full TalkBack/VoiceOver or large-text acceptance; physical Expo Go startup/audio; installed background delivery; installed Google Maps extension UI; a real drive; field crossing identities; a district polygon overlay; user benefit. Source inspection, tests and browser snapshots do not substitute for these.

## Craftsmanship and plain-language verdict

“AI-generated” cannot be reliably diagnosed from rounded cards or writing style. The meaningful problems are duplication, unreliable state and claims a student cannot explain. These are visible product-quality issues regardless of who typed the code.

| Tell found | Specific response / remaining limit |
|---|---|
| Repeated panels before the crossing list | Summary box styling removed; secondary sources collapsed; explanation moved after crossings. Primary hazard/coverage warning remains visible. |
| Technical headline jargon | Home now says Research links / Inventory records; planner hint describes checking before leaving. Drive no longer introduces “proxy states” as its primary description. Detailed lag/LOSO discussion remains in science/detail disclosures. |
| “Physical crossing” certainty from heuristics | Trip copy now says crossing groups. Submission describes likely duplicate hardware and research corridors. Field identity is still unverified. |
| ALL-CAPS recording/pledge/archive clutter | Updated locale labels use sentence case. Archive identity remains explicit. The Director control is optional; keep it closed during final footage. |
| Clipped crossing descriptions | Removed single-line clipping from the trip list. This can increase scroll height, which is preferable to hiding status/source information. |
| Low-contrast small muted copy | Shared dark muted text raised above 5.4:1 on the three audited opaque surfaces. Other colors, maps, overlays and font sizes still need a full audit. |
| Inline EN/ES source/coverage/count strings | High-value route coverage, source state, counts, show-all and explanation copy moved into both locale files. Numerous old inline strings remain elsewhere; do not call bilingual centralization complete. |
| Developer scaffolding on camera | Director remains opt-in. On the full-height mobile sheet, top recording controls can sit behind the sheet; collapse it before using those controls. Normal pinned demo Stop remained visible. |

### Exact bilingual replacements now implemented

These values are in both locale files and passed the existing banned-word contract. The technical helper determines the state; the copy does not hide errors.

| Key / use | EN | ES |
|---|---|---|
| `route.summary_official_loading` | checking… | consultando… |
| `route.summary_no_sensors` | Creek readings: no sensor links on this trip | Lecturas de arroyos: este trayecto no tiene sensores asociados |
| `route.summary_history_gap` | History is not available for every inventory record; zero matches does not mean no past flooding. | No todos los registros tienen datos históricos; cero coincidencias no significa que nunca hubo inundaciones. |
| `route.coverage_title` | Part of this trip is outside the pilot area | Parte del trayecto está fuera del área piloto |
| `route.audit_title` | Crossings on this trip | Cruces en este trayecto |
| `route.audit_zero` | No inventoried crossings matched within 120 m of this route. This does not verify road conditions. | No se encontraron cruces del inventario a menos de 120 m de esta ruta. Esto no verifica las condiciones del camino. |
| `drive.body` | Preview spoken crossing alerts and distraction controls. This screen is a simulation, not turn-by-turn navigation. | Prueba las alertas habladas de cruces y los controles de distracción. Esta pantalla es una simulación, no navegación paso a paso. |

### Ranked remaining polish blueprint

These are optional follow-ups after a successful final rehearsal, not reasons to destabilize the tested core tonight.

1. **Saved-list hardware names:** `C:/2025AppChallenge/mobile/src/app/(tabs)/alerts.tsx`, saved `NearbyRow` items, still expose names such as Master Arm and Slave Arm. Apply the existing `cleanPhysicalCrossingName` to visible names and accessibility labels while preserving IDs. Keep raw municipal name in Detail/source disclosure. Verify saved navigation still resolves the same ID. EN/ES headings should be “Saved crossings” / “Cruces guardados”; proper road names remain unchanged.
2. **Remaining inline locale copy:** `C:/2025AppChallenge/mobile/src/screens/home/RoutePanels.tsx`, OriginSelector and test-tool labels; `HomeScreen.tsx`, location and chart prose; `StormsScreen.tsx`, comparator labels; `crossing/[id].tsx`, detail labels. Migrate one screen at a time without changing behavior. Use “More details” / “Más detalles” and “Simulated closure test” / “Prueba con cierre simulado”; avoid a wholesale text rewrite before the shoot. Add all changed Spanish text to the human-review queue; no fluent review is claimed here.
3. **Research-study case explanation:** `C:/2025AppChallenge/mobile/src/screens/CockpitScreen.tsx`, summary around the replay. The UI can say six reference cases and twelve scored events in different places; introduce “Study cases and detected events use different denominators; see evaluation details” / “Los casos del estudio y los eventos detectados usan denominadores distintos; consulta la evaluación.” Better yet, derive a single explained row from the results schema. Do not silently rewrite the denominator to twelve everywhere.
4. **Director under a full mobile sheet:** `C:/2025AppChallenge/mobile/src/screens/HomeScreen.tsx`, sheet and Director placement. Either automatically collapse the sheet when Director is explicitly shown, or document the collapse action as the recording workflow. EN/ES control: “Recording controls” / “Controles de grabación.” Do not hide an alert banner to make a cleaner take.
5. **Source footprint and physical identity:** `C:/2025AppChallenge/mobile/src/lib/danger.ts`, reviewed corridor overrides, and seed metadata. Replace inferred groups with reviewed IDs only after actual source/location review. Until then, “crossing groups” / “grupos de cruces” is the appropriate label. Exact district coverage needs a named official polygon; do not broaden the Austin radius for a higher marker count.

## Simulated CAC score and TX-10 positioning

These are subjective readiness judgments, not official rubric weights or a probability of winning. They are not a numerical measure of lives saved or user benefit.

| Category requested | Score | What would plausibly improve the assessment |
|---|---:|---|
| Idea / community impact | **6.5/10** | One verified in-district example, several genuine target-user comprehension results, and a demonstrated reason the trip view improves the decision. Those could justify +1–2; another feature-count slide would not. |
| Implementation / technical advancement | **7.4/10** | Physical installed-build verification, failure/recovery acceptance and clearer history/coverage limits. Integrations and adversarial regressions are real; road prediction is unvalidated. |
| Coding / UX / safety design | **7.5/10** | Complete accessibility/bilingual human checks, simpler remaining inline copy and consistent reviewed site identity. Test quantity alone does not earn +1. |
| Video / written submission | **7.0/10** | A timed rehearsal, the student's real motivation and explanation, correct attribution/disclosures and a functioning judges' link. The 2:45 Round 4 blueprint is still usable with these corrections. |

**TX-10 story:** “A Central Texas pilot built by a TX-10 student, helping people check available crossing evidence before a familiar trip.” Do not call every Austin creek a TX-10 service. Do not imply all constituents in Brazos, Waller or the rest of the district are currently served. The College Station gap is a credibility demonstration, not a coverage success.

The project's value comes from connecting official reports, observed creek readings, historical context and uncertainty for a named trip. It does not come from claiming DriveTexas, Waze or Google Maps lack routing or closure information. Their capabilities and the detailed primary-source comparison remain documented in the [Round 4 report](C:/2025AppChallenge/docs/results/cac-judge-round4-demo-ready-2026-10-21.md).

Gauge-name correction: USGS confirms `08158860` is **Slaughter Creek at FM 2304**, matching the seed and the live UI. The previous submission's Twin Creeks label was incorrect. This correction does not independently establish verified stream topology to E. William Cannon. [USGS station](https://waterdata.usgs.gov/tx/nwis/uv?site_no=08158860).

The national registration page currently says **October 26, 2026, 9pm Eastern / 8pm Central**. The submission header was corrected from noon. The previously documented district-page discrepancy is not resolved by that correction; the office page could not be fetched in this pass. Use the actual portal requirements and do not rely on a later date. [Official registration](https://www.congressionalappchallenge.us/students/student-registration/).

## Final recording handoff

- Start with an actual family/student trip decision; do not use an invented rescue or personal storm memory.
- Show downtown → Onion Creek Park, the current returned summary and one named crossing. Do not hardcode today's group/history counts into narration.
- Switch explicitly to Memorial Day 2015 / Barton Creek. The moving-car alternative is precomputed. Keep the archive label and Stop visible, then return to Live.
- Show 4/12, eight misses, one false alarm versus zero for the baseline. Sixty-five minutes is the detected-proxy median, not a guaranteed road warning.
- Show the College Station coverage warning. Explain what is missing instead of claiming district-wide impact.
- Finish with the next evaluation: real user comprehension and verified coverage. The app's final pitch should be narrower than its ambition.

**Still human-owned before submission:** actual personal answer and attribution, eligibility confirmation, AI-use disclosure, physical-device rehearsal, timing/exporting the video and uploading through the official portal. These require facts or actions the code audit cannot invent. No fresh release or scientific calibration was attempted merely to make the project appear finished.

Final origin behavior: a manual starting point overrides GPS for trip planning; explicitly granting GPS use again removes that override. A denied permission leaves the manual choice intact. This branch was source/type/lint checked; actual operating-system permission interaction remains unverified.
