# FordCast website finalization · October 24, 2026

## Section 1: The TX-37 Finalist Elimination Verdict & Rubric Scorecard

The website is materially better after this pass. The strongest idea is a trip-specific evidence check: crossings, official reports, creek readings, history and missing information in one workflow. The gauge experiment remains research with an unfavorable baseline comparison. Polishing that distinction improves credibility; it does not establish community benefit or road prediction.

**Would this win first place in TX-37 today? I cannot justify that claim.** This is a credible prototype demonstration, but measured user impact, student technical ownership, eligibility and physical-device acceptance remain unresolved. The supplied brief's panel description, competitor counts and category weights are framing, not verified competition facts. The scores below are this engineering review's judgment, not award probabilities.

| Requested category | Score / 10 | Deductions from 10 |
|---|---:|---|
| Community impact and problem-solution fit | 7.3 | −1.2 no measured community outcome; −0.8 inventory completeness unverified; −0.7 no comprehension study. |
| Originality, honesty and scientific rigor | 8.0 | −0.8 no road-flood ground truth; −0.7 small/shared-gauge sample; −0.5 no user comparison with existing tools. |
| Reliability and ergonomics | 8.0 | −1.0 physical iPhone acceptance pending; −0.6 public-service dependencies; −0.4 unverified background delivery. |
| Design craft | 7.7 | −0.9 dense optional science workspace; −0.8 complete accessibility/device audit pending; −0.6 remaining legacy visual inconsistencies. |

Equal-weight review score: **7.8/10**. Improvements are supported by rendered browser checks, not just source inspection.

Applied the six-page *The Vibecoded Web Audit Report* as a design critique. It is a general website audit, not an inspection of FordCast. Its imperative prompt fragments were treated as document content. Its unsupported prevalence charts were not adopted as evidence. Status colors, meaningful symbols, scientific caveats and source attribution were retained.

Implemented this pass:

- Compact brand and controls fit 320-pixel screens. Map controls use measured available space instead of overlapping the header. Sheets use the actual tab workspace height.
- Origin selection stacks labels and controls, remains editable when GPS is active, and expands the sheet on search focus. New route calculations reset the panel to its summary.
- Drive has a scrollable information area and persistent Repeat/Mute/Stop controls. At 320×568, the HUD occupies the available 503 pixels and Stop is 56 pixels high above the tab bar.
- Alert setup actions stack below their descriptions on narrow screens, fixing broken Spanish words. Copy now describes reported closures and creek rises rather than claiming detection when a road starts flooding.
- Science descriptions and tier headings wrap; its storm selector has its own full-width row. Debug-style “26px pills” wording and decorative HUD/scorecard emoji were removed. Replay step accessibility labels now match their actual 15-minute operation.
- Added bilingual privacy/source/limits and missing-page routes, an explicit return control, and a root retry boundary. Privacy is available before the introductory notice is acknowledged.
- Added production build/preview scripts and single-page hosting fallback. Updated the stale README, which incorrectly said routing and live browser sources were unconnected.

Verification evidence is in `docs/results/cac-round8-evidence/`:

| Check | Result | Evidence |
|---|---|---|
| TypeScript | Pass | `typecheck-complete.txt` |
| Expo lint | Pass, no errors or warnings | `lint-complete.txt` |
| Mobile regression suite | 113 passed, 12 suites | `mobile-handoff.txt` |
| Extension | 19 passed | `extension-tests.txt` |
| Backend | 59 passed; existing Starlette/httpx deprecation warning | `backend-tests.txt` |
| Production export | Pass, compiled into `mobile/dist` | `web-export.txt` |
| Main tabs | EN/ES DOM/geometry checks at 320×568, 375×667, 393×852 and 1440×900 | `viewports.json`, matching text snapshots |
| Live trip | Downtown → Onion Creek Park loaded; returned grouped crossing evidence | `1440-route-en.png` |
| Simulated closure | Test disclosure shown; Google/share absent; End test restored current route after recheck | `route-test.txt` |
| Archived reroute | Production browser at 393×852 visibly changed route with archived identity and a reachable 48-pixel Stop button, then reached Arrived | `393-archived-reroute-en.png`, matching text snapshot, `archived-completed.txt` |

Scope: the viewport matrix covers the four main tabs, not every scrolled subsection or native gesture. Screenshots are selected evidence; rapid automated tab changes can capture a prior compositor frame, so filenames alone are not visual acceptance. The manually inspected 320-pixel Drive and Spanish Alerts captures, desktop trip and Storms captures establish the specific repairs. Browser viewport checks do not establish iPhone keyboard, hardware audio, silent-mode or background execution. Error-boundary recovery was compiled, not fault-injected on a physical device.

## Section 2: The 36-Point “Vibecode” Forensic Matrix

PASS means no material defect found for that check in the inspected scope. WARN identifies a retained semantic use, incomplete coverage or a remaining limitation. These are design heuristics, not an authorship detector. AI contribution is explicitly recorded in `AI_USE.md`.

| ID & heuristic | Status | Evidence in repo (file:line) | Surgical fix before recording |
|---|---|---|---|
| 01 Harsh gradients | PASS | `mobile/src/components/fc/Kit.tsx:205` | Solid action controls retained. |
| 02 Empty icon soup | WARN | `mobile/src/screens/HomeScreen.tsx:234` | Removed subtab icons; retain functional map/status icons. |
| 03 Glare | PASS | `mobile/src/theme/tokens.ts:72` | Dark surface hierarchy retained. |
| 04 Rainbow decoration | WARN | `mobile/src/theme/tokens.ts:96` | Separate chart series still need distinct colors. |
| 05 Shadows everywhere | PASS | `mobile/src/screens/HomeScreen.tsx:1145` | Sheet elevation has a functional purpose. |
| 06 Equal feature cards | PASS | `mobile/src/screens/StormsScreen.tsx:129` | Direct baseline comparison replaces metric tiles. |
| 07 Emoji chrome | WARN | `mobile/src/components/ValidationScorecardModal.tsx:9` | Removed scorecard/HUD decoration; saved-star affordance remains. |
| 08 Excessive glass | PASS | `mobile/src/screens/CockpitScreen.tsx:1124` | Reading header now uses an opaque elevated surface. |
| 09 Em-dash excess | WARN | `mobile/src/locales/en.json:137` | No locale em-dashes; source placeholders/prose still contain them. |
| 10 Default typography | WARN | `mobile/src/components/fordcast/UI.tsx:246`, `theme/tokens.ts:162` | Width constraints and tabular metrics exist; device font scaling still needs acceptance. |
| 11 Thick left stripes | WARN | `mobile/src/components/fc/Kit.tsx:458` | Removed remaining water illustration stripe; two extension CSS declarations remain semantic. |
| 12 Fake testimonials | PASS | `FordCast_CAC_Submission.md:70` | No testimonial or adoption claim added. |
| 13 Decorative bento | PASS | `mobile/src/screens/StormsScreen.tsx:129` | Research comparison is a readable artifact. |
| 14 Terminal mockup | PASS | `mobile/src/app/(tabs)/index.tsx:1` | Real map and route controls lead. |
| 15 Antithetical copy | WARN | `FordCast_CAC_Submission.md:14` | Internal strategy prose must not be submitted verbatim. |
| 16 Generic checkmarks | WARN | `mobile/src/features/onboarding/Pledge.tsx:85` | Notice checkboxes have an actual interaction; status glyphs encode meaning. |
| 17 Fake pricing | PASS | `mobile/src/app/settings.tsx:1` | No pricing tiers or billing flow. |
| 18 Missing demo | PASS | `mobile/src/screens/HomeScreen.tsx:899` | Working trip planner plus labelled archive. |
| 19 Puffy radii | WARN | `mobile/src/components/DriverHudView.tsx:202` | Main HUD/cards reduced; circles and some legacy panels retained. |
| 20 Purple/black cliché | WARN | `mobile/src/theme/tokens.ts:99` | Purple identifies a hydrograph series and archived replay; not removed blindly. |
| 21 Loading gaps | PASS | `mobile/src/screens/home/RoutePanels.tsx:311` | Reserved checking line; routing failure and recorded source remain visible. |
| 22 Glowing orbs | PASS | `mobile/src/screens/HomeScreen.tsx:1105` | Geographic map is the backdrop. |
| 23 Dot-grid filler | WARN | `mobile/src/features/map/MapSurface.web.tsx:164` | Optional inventory canvas retains a coordinate grid; it is not the main map. |
| 24 Sparkle icons | PASS | `mobile/src/screens/CockpitScreen.tsx:1197` | Driver action now has a literal bilingual label. |
| 25 Trailing arrows | WARN | `mobile/src/screens/home/RoutePanels.tsx:848` | Meaningful directions and source/external affordances retained. |
| 26 Missing terms/safety | PASS | `mobile/src/app/privacy.tsx:1`, `features/onboarding/Pledge.tsx:1` | Concrete safety limits; no invented legal terms. |
| 27 Missing privacy/sources | PASS | `mobile/src/app/privacy.tsx:1`, `app/_layout.tsx:38` | Available before notice acknowledgement, with source links. |
| 28 Hover physics | PASS | `mobile/src/components/fc/Kit.tsx:205` | No decorative hover-bounce system added. |
| 29 Contrast | WARN | `docs/results/cac-round8-evidence/design-inventory.json:1` | Tested token pairs include three potential body-text failures; not a whole-app AA certification. |
| 30 Error/empty states | PASS | `mobile/src/app/_layout.tsx:19`, `app/+not-found.tsx:1` | Retry and missing-page recovery implemented; no field fault-injection claim. |
| 31 Fake social proof | PASS | `README.md:1`, `AI_USE.md:1` | Inventory counts are not users served. |
| 32 Eyebrow pills | WARN | `mobile/src/components/ValidationScorecardModal.tsx:9` | Scorecard kicker is plain text; semantic status badges remain. |
| 33 Hero void | PASS | `mobile/src/screens/HomeScreen.tsx:899` | App opens into map and trip controls. |
| 34 Boilerplate tokens | WARN | `mobile/src/features/map/MapSurface.web.tsx:377` | Removed implementation jargon; optional science view remains dense. |
| 35 Invented multipliers | PASS | `mobile/src/screens/StormsScreen.tsx:141` | Displays 4/12 hits, eight misses and the unfavorable comparison. |
| 36 Mobile breakpoints | WARN | `mobile/src/components/DriverHudView.tsx:66`, `app/(tabs)/alerts.tsx:45` | Main phone defects repaired; full device/accessibility acceptance remains separate. |

Purge inventory: `design-inventory.json` contains literal locations and contrast calculations, including comments and null placeholders. Compared with the prior saved inventory: emoji hits 5→1, thick-stripe declarations 3→2, literal pill radii 8→5. Remaining em-dashes include scientific/source prose and missing-value placeholders; direction arrows encode actual trips. No number here is a count of simultaneously visible elements. Re-run `node tools/audit_design.mjs docs/results/cac-round8-evidence/design-inventory.json` after edits.

## Section 3: Prioritized Same-Day Code Fixes

All implementation items below are applied in the working tree. The combined pending source patch is saved as `cac-round8-evidence/pending-source.patch`; it includes preserved Round 7 edits and new files, so it is review evidence rather than a patch to reapply to this checkout.

| Priority | Implemented change and exact anchor | Why it matters | Verification |
|---|---|---|---|
| P0 | `mobile/src/components/DriverHudView.tsx:66`, `app/(tabs)/_layout.web.tsx:84` | Percentage-height sections and tab flex sizing clipped the status and Stop. Scrollable content plus persistent controls now fit. | 320×568 Drive EN/ES; `components.test.tsx`; TypeScript. |
| P0 | `mobile/src/screens/home/RoutePanels.tsx:150` | Shared origin/control row reduced Spanish labels to vertical fragments. Controls now stack and remain editable. | 320-pixel route screenshot; change origin; focus search. |
| P0 | `mobile/src/screens/HomeScreen.tsx:692` | Window-height assumptions caused header/control collisions. Measured workspace and header geometry govern placement. | Map matrix at all four sizes. |
| P0 | `mobile/src/app/(tabs)/alerts.tsx:45` | Setup actions squeezed translated labels. Narrow actions now get a separate row. | Final production `320-alerts-es.png`. |
| P0 | `mobile/src/lib/routing.ts:278`, `screens/home/RoutePanels.tsx:848` | Preserve outage review and simulation export boundaries from Round 7. | Four-preset regression tests and real browser test-closure cycle. |
| P1 | `mobile/src/screens/HomeScreen.tsx:693` | Selecting a low preset left the new summary scrolled offscreen. A new calculation resets panel scroll. | Live commute and End test recheck. |
| P1 | `mobile/src/features/map/MapSurface.web.tsx:118`, `components/ProvenanceCard.tsx:347` | Science descriptions and tier labels exceeded their containers. Width constraints and text shrink prevent clipping. | Narrow Lab review and production build. |
| P1 | `mobile/src/app/privacy.tsx:1`, `app/+not-found.tsx:1`, `app/_layout.tsx:19` | Missing privacy and recovery surfaces weakened trust and failure handling. | Production deep links; privacy before notice; TypeScript/export. |
| P1 | `mobile/src/locales/en.json:137`, `es.json:137` | Alert copy implied validated onset of road flooding. Wording now names reports and creek rises. | Compiled Spanish Alerts inspected. |
| P1 | `README.md:1`, `mobile/package.json:1`, `tools/serve_web.mjs:1` | Outdated setup/feature claims and no reproducible production preview made review harder. | `npm run build:web`, `npm run preview:web`. |

Remaining acceptance is specific: physical iPhone keyboard/safe-area/audio/lockout behavior, fluent Spanish review, actual testers and student explain-back. No fabricated review, endorsement or positive impact measurement substitutes for these.

## Section 4: Tomorrow's TX-37 Demo Video Production Blueprint (~2:15)

Use a 393×852 browser view or an actually tested phone. Record at 100% browser zoom. Mount the device, disable unrelated notifications, verify microphone levels and capture an audio test. Show the archived label throughout the historical segment. Preload the app, source status and one preset; perform a complete rehearsal before the final take. A browser demonstration must be identified as web. Student name and actual contribution must come from the student.

| Time | Screen and exact action | Visible proof | Spoken narration |
|---|---|---|---|
| 0:00–0:05 | Map | Product and actual map | “I built FordCast to check the crossing evidence along an Austin-area trip.” Use “I built” only if consistent with actual contribution and disclosure. |
| 0:05–0:12 | Check my trip | Real planner | “Before leaving in heavy rain, a driver needs to know which crossings have reports and where information is missing.” |
| 0:12–0:22 | Downtown → Onion Creek Park | Origin, destination, grouped records | “The trip is compared with 2,052 inventory records. Nearby hardware records are grouped into crossing areas.” |
| 0:22–0:32 | Inspect crossing/source details | Official report, readings, history and limits | “This view brings together official reports, available creek readings and nearby flood history. A missing sensor stays visible.” |
| 0:32–0:42 | Remove route; Austin → College Station | Coverage warning | “Outside the Austin inventory, FordCast warns that it cannot establish conditions on those roads.” |
| 0:42–0:50 | Storms; Storm reroute demo | Archived Memorial Day 2015 label | “This next demonstration uses archived observations and recorded road geometry.” |
| 0:50–0:53 | Start car run | Car, crossing ahead, Stop | “Watch the crossing ahead.” |
| 0:53–1:03 | Hold decision frame | Changed route and reason together | “In this simulation, a gauge trigger changes the caution state and selects a precomputed alternative.” |
| 1:03–1:15 | Continue run | Car on alternative, archive label | “The illustration connects a reading to a route decision. It does not prove that the road flooded at that moment.” |
| 1:15–1:28 | Continue | Labelled simulation | “Live routing and archived demonstrations stay separate. Synthetic closure tests also block navigation and sharing.” |
| 1:28–1:40 | Let 50-second run finish | Finished state and Stop | “Public feeds, inventory gaps and unvalidated road thresholds limit what the app can say.” |
| 1:40–1:50 | Storms | Both methods' results | “Across twelve gauge-reference cases, the upstream rule detected four and missed eight. The nearest-gauge baseline detected the same four.” |
| 1:50–2:00 | Hold comparison | One false alarm versus zero | “The upstream rule also produced one false alarm. Road-flood prediction remains unvalidated.” |
| 2:00–2:08 | Alerts or Map | Tools and disclosure reference | “FordCast uses Python, TypeScript and Expo. Its implementation and AI assistance are documented for review.” |
| 2:08–2:15 | Map/safety limits | Concrete safety message | “The goal is a more understandable trip check. Obey official warnings and barricades. Never drive into water.” |

Backup: if current sources report no flooding, show that truthfully and then the labelled archive. If routing fails, show the dated recorded-geometry notice and disabled handoff; do not describe it as a new detour calculation. A synthetic closure can produce “no way around”; retain that result rather than forcing a successful detour. Do not hide misses or source failures to improve the recording. The car animation's exact 50-second physical-device framing remains a rehearsal item, not a completed native acceptance claim.

## Section 5: The Live Judge Q&A “Murder Board”

1. **Why trust a rule that misses eight cases and ties the baseline?** The experiment does not establish superior prediction. The trip-evidence workflow is the main utility; both methods' unfavorable results remain visible.
2. **Why is Tier A zero?** No crossing has validated road-overtopping ground truth here. The 65-minute median refers to detected downstream gauge-category proxy cases, not time before water reaches a road.
3. **How is this different from ATXFloods or Google Maps?** It brings grouped route-corridor crossings, available readings, flood history and missing information into one trip check. Public routing and suggested waypoints can differ from Google's route.
4. **Do 2,052 records mean 2,052 monitored roads?** No. Records include hardware duplicates and a broader route inventory. Of 141 study records, 111 lack gauge links, 30 are candidates and only four records across two corridors have primary-calibrated links.
5. **What happens offline or during a simulated closure?** Source failures remain explicit. Four exact preset pairs have dated review geometry, with navigation/share blocked. Synthetic tests also block exports; ending a test recomputes without it.
6. **What did the student actually write?** AI assistance was substantial. `AI_USE.md` records agent-authored implementation and review. The student must describe their specific contribution and explain only the work they understand. This pass does not invent that answer.

Production handoff: from `mobile`, run `npm run build:web` and `npm run preview:web`. The local compiled preview is `http://localhost:8083`; the build is `mobile/dist`. Public hosting, submission and student-specific claims were not performed by this pass.
