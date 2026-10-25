# FordCast: October 24 recording-readiness review

## Section 1: The TX-37 Finalist Elimination Verdict & Rubric Scorecard

**Would this win 1st Place in TX-37 today? No defensible prediction of first place can be made.** I would not give it first place on the evidence presently available: the community benefit is plausible but unmeasured, the gauge experiment misses eight of twelve proxy events, student technical ownership has not been demonstrated in this session, and the requested device/browser acceptance remains incomplete. The route-evidence workflow is worth showing. The implementation has enough substance to support a credible demonstration once the remaining acceptance gates are checked.

This is an adversarial engineering review, not an official judging panel. The mandate's panel composition, competitor counts, district competitiveness and 25% weights are supplied framing, not verified facts. [The official participating-district list](https://www.congressionalappchallenge.us/students/participating-districts/) lists TX37. Exact eligibility and district geometry have not been established from the student's address; being inside an 80 km Austin circle does not establish constituent coverage or inventory completeness.

| Requested category | Score / 10 | Explicit deductions from 10 |
|---|---:|---|
| TX-37 community impact and problem-solution fit | 7.3 | −1.2 no observed tester/community outcome; −0.8 inventory completeness and road-specific coverage unverified; −0.7 no measured route-planning comprehension/behavior benefit. |
| Originality, epistemic honesty and scientific rigor | 8.0 | −0.8 downstream gauge proxies do not validate road floods; −0.7 five storms and shared-gauge cases limit independence; −0.5 integration novelty needs a user comparison. Reporting the unfavorable baseline earns credibility, not predictive skill. |
| Technical execution, reliability and mobile ergonomics | 7.4 | −1.2 physical iPhone keyboard/audio/sheet acceptance outstanding; −0.8 public-service dependence remains outside the four presets; −0.6 no fresh visual/responsive walkthrough during this run. |
| Design craft and visual authenticity | 6.8 provisional | −1.2 no current rendered comparison; −0.8 dense optional Lab; −0.7 inconsistent legacy labels/control geometry; −0.5 incomplete full EN/ES visual proof. Punctuation and Inter alone do not establish poor design or AI authorship. |

Equal-weight score: **7.4/10**, rounded from 7.375. This evaluates current evidence, not award probability.

Implemented in this pass:

- Captured actual public Valhalla geometry for all four exact preset pairs, with source and capture timestamp. Router failure now supplies a visibly labelled review route, preserves on-route hazards/coverage warnings, and disables Google/share exports. Arbitrary trips receive no invented fallback.
- Added a five-second request deadline within the existing 12-second provider budget. User-aborted/superseded requests remain cancelled.
- Fixed the native cold-start voice ordering: every speech request waits for preparation and retains session cancellation. A preview no longer enables automatic voice alerts as a side effect.
- Added stable Map focus cleanup for the car demo, enlarged shared controls, constrained text/button width, removed several thick left stripes, and put the archived label above car controls rather than squeezing them into one row.
- Replaced four research metric tiles and a dense comparison paragraph with a direct comparison showing hits, misses and false alarms for both methods. Corrected the Lab's “30 Monitored” wording to “30 research candidates.”
- Removed 57 literal locale em-dash occurrences mechanically, removed two gratuitous test-disclosure arrows, and removed decorative emoji/Unicode chrome from the Lab controls and counts. Real direction arrows, external-source affordances and null-data placeholders remain where meaningful.

Executed checks and evidence:

| Check | Result | Evidence under `docs/results/cac-round7-evidence/` |
|---|---|---|
| TypeScript | Pass | `typecheck-final.txt` |
| Expo lint | Pass | `lint-final.txt` |
| Mobile Jest | **113 passed, 12 suites** | `mobile-final.txt` |
| Extension | **19 passed** | `extension.txt` |
| Backend pytest | **59 passed**, one Starlette/httpx deprecation warning | `backend-final.txt` |
| Scientific artifact audit | **PASS**, no reported contract errors | `scientific-audit.txt` |
| Literal design inventory and contrast calculations | Generated | `design-inventory.json`, `design-before.json` |
| Browser | **Unavailable**: “Local browser use is disabled in Work settings” | No new screenshot or eight-layout acceptance is claimed. |

The initial concurrent test attempt caught a speech assertion expecting synchronous playback. It was updated to await preparation while preserving the mute assertion; final results above supersede that attempt. Backend tests needed execution with local test-server access outside the restricted environment. The artifact audit refreshed `docs/results/qa-evidence.json`; the scientific model and replay artifacts were not regenerated.

New checks exercise all four recorded presets, out-of-coverage classification, retained hazards, arbitrary-destination rejection, cancellation, recorded-route handoff/share suppression, and pending voice cancellation. A passing suite is not evidence of audible output, successful background notification delivery or iOS touch behavior.

## Section 2: The 36-Point "Vibecode" Forensic Matrix

Statuses are source-based unless explicitly noted. PASS means no defect found for the named check; WARN includes limitations needing visual/device inspection. This is a design checklist, not a detector of authorship. AI contribution is established by `AI_USE.md`, not by typography or punctuation.

| ID & Heuristic | Status | Exact evidence in repo (file:line) | Surgical fix required before shoot |
|---|---|---|---|
| #01 Harsh multi-stop gradients | PASS | `mobile/src/components/fc/Kit.tsx:214` solid ActionButton backgrounds | Keep solid functional controls; no gradient rewrite needed. |
| #02 Empty icon soup | WARN | `mobile/src/screens/home/RoutePanels.tsx:372` every quick destination has an arrow icon | Optional: omit the icon prop on quick destinations; preserve meaningful route/search icons. |
| #03 White/black glare | PASS | `mobile/src/theme/tokens.ts:72` dark surface steps; light tokens at :88 | Light-theme white tokens and shadow black are not proof of visible glare. No blind color replacement. |
| #04 Rainbow decoration | WARN | `mobile/src/theme/tokens.ts:96` multiseries chart palette | Retain distinct data-series semantics; avoid borrowing chart colors for unrelated headings. |
| #05 Shadows everywhere | PASS | `mobile/src/screens/HomeScreen.tsx:1154`, `components/fc/Kit.tsx:631` | The four shadow/elevation literal hits belong to sheet/banner elevation, not all static cards. |
| #06 Three equal feature cards | PASS after change | `mobile/src/screens/StormsScreen.tsx:86` | Removed four metric tiles. The comparison is the artifact. |
| #07 Emoji UI chrome | WARN, reduced | `mobile/src/screens/CockpitScreen.tsx:342/:700/:1338`; remaining inventory in JSON | Removed speaker/stop/warning emoji from this surface. Saved-star glyph in CrossingRow remains semantic. |
| #08 Overused glass | PASS | `mobile/src/components/fc/Kit.tsx:259`, `:628` opaque reading surfaces | Keep opacity on cards; a glass color token alone is not a rendered reading defect. |
| #09 Em-dashes | WARN, reduced | `mobile/src/locales/en.json:133/:310/:419`, corresponding ES keys | Locale em-dashes now zero. Null placeholders, comments and prose remain in inventory; edit prose by meaning. |
| #10 Default Inter hierarchy | WARN | `mobile/src/components/fordcast/UI.tsx:246`, `theme/tokens.ts:136` | Title tracking and tabular metrics exist; shared controls now wrap. Verify 50% zoom and large text on actual render. |
| #11 Thick left stripe | WARN, reduced | `mobile/src/components/fc/Kit.tsx:458`; `extension/fordcast.js:385–386` | Removed trip/home/replay stripes. Remaining water-depth and hazard stripes encode semantics; keep or use perimeter border in optional patch below. |
| #12 Fake testimonials | PASS | `FordCast_CAC_Submission.md:70` impact statement; `AI_USE.md` | No user testimonial fabricated by this pass; benefit stays unmeasured. |
| #13 Inflated bento | PASS after change | `mobile/src/screens/StormsScreen.tsx:70–130` | Removed redundant tile cluster. Two-route comparison remains functional. |
| #14 Terminal mockup | PASS | `mobile/src/app/(tabs)/index.tsx:1` renders HomeScreen | Primary app is an interactive map/trip workflow. |
| #15 Antithetical copy | WARN | `FordCast_CAC_Submission.md:14` internal strategy comparison | Exclude internal strategy from final answers; use literal script in Section 4. Safety negations remain necessary. |
| #16 Generic checkmarks | WARN | `FordCast_CAC_Submission.md:203` claim-status checkmarks | Keep internal ledger; do not put the checkmarks on the recording title card. State glyph checkmarks encode meaning. |
| #17 Fake pricing | PASS | `mobile/src/app/settings.tsx:18–55` | No pricing tiers/paywall in this flow. |
| #18 Missing product demo | PASS | `mobile/src/screens/HomeScreen.tsx:886`; `RoutePanels.tsx:255` | Demonstrate actual route audit and archived car; do not substitute slideware. |
| #19 Puffy radii | WARN, improved | `mobile/src/components/fc/Kit.tsx:259` Panel radius now 10 | Preserve large sheet corners; no need to flatten every shape. Native concentric nesting needs render inspection. |
| #20 Purple/black cliché | WARN | `mobile/src/theme/tokens.ts:99` downstream series color; `lib/theme.ts:21` replay mapping | Exactly one match for the mandate's four hex patterns. Keep chart-series identity; do not confuse it with road status. |
| #21 Missing loading structure | WARN | `mobile/src/screens/home/RoutePanels.tsx:310` route busy message | Existing status appears; reserve vertical status height with optional patch below. Source failures remain distinct. |
| #22 Decorative glowing orbs | PASS | `mobile/src/features/map/LiveMap.web.tsx:130` real map renderer | No decorative background-orb implementation found in inspected app paths. Map markers are data. |
| #23 Dot-grid filler | PASS | `mobile/src/features/map/MapSurface.web.tsx:271` inventory nodes | Nodes represent crossings; no decorative grid removal justified. |
| #24 Sparkles | PASS | `tools/audit_design.mjs:14` emoji scan | No sparkle control found; semantic saved star is not a marketing sparkle. |
| #25 Trailing arrows | WARN, reduced | `RoutePanels.tsx:919`; `ProvenanceCard.tsx:32/:50` | Removed test disclosure arrows; retain pair-direction arrows and optional external/drill-down arrows. |
| #26 Safety/provenance access | PASS | `mobile/src/app/settings.tsx:35`, `features/onboarding/Pledge.tsx:27` | Settings/pledge/legend provide the surfaces. Do not invent legal terms or certifications. |
| #27 Privacy/location disclosure | PASS source | `mobile/app.json:48`, `mobile/src/app/settings.tsx:35` | Discloses coordinate transmission to routing/search providers. OS permission behavior still requires device test. |
| #28 Twitchy hover | PASS | `mobile/src/components/fc/Kit.tsx:240` opacity feedback | No springy hover movement required; small press feedback is functional. |
| #29 Contrast/neon | WARN | `theme/tokens.ts:10/:84`; computed ratios in `design-inventory.json` | Cyan/amber/body-muted tokens pass sampled dark pairs. Unknown/coral fail some raised-surface body combinations; use neutral body text with semantic glyphs there. Do not claim every rendered pair passed. |
| #30 Happy-path errors | PASS with limits | `mobile/src/lib/route-evidence.ts:1`, `routing.ts:261`, `RoutePanels.tsx:313` | Loading, failed, no-result and recorded-route states exist. Physical network transitions still pending. |
| #31 Fake social proof | PASS | `FordCast_CAC_Submission.md:70`, `AI_USE.md` | No fabricated testers/adoption added; no field benefit claimed. |
| #32 Eyebrow pill disease | WARN, reduced | `components/fc/Kit.tsx:171/:272`, `UI.tsx:53` | Interactive chips now squared at radius 8 and 44-point minimum. SectionLabel is text. Visible simultaneous pill count unavailable with browser disabled. |
| #33 Hero void | PASS source | `HomeScreen.tsx:886`, `RoutePanels.tsx:255` | Primary workspace actions precede optional science material; measure fold on device. |
| #34 Boilerplate tokens | WARN | `components/fordcast/UI.tsx:246`, `theme/tokens.ts:136` | Tokens have specific status semantics; mixed legacy surfaces remain. Unify only a visible inconsistency, not every token before the shoot. |
| #35 Hallucinated multipliers | PASS | `mobile/src/lib/replay-controls.ts`, `contracts.test.ts` | Replay speed multipliers are time controls, not impact/performance claims. No 99% accuracy claim introduced. |
| #36 Mobile breakpoints/targets | WARN, improved | `Kit.tsx:135/:171/:229`, `RoutePanels.tsx:994`, `HomeScreen.tsx:1179` | Shared targets now ≥44, long labels shrink/wrap, archived header gets its own row. 320/375/393/1440 EN/ES rendering is still an explicit acceptance gate. |

### Em-Dash, Emoji, Trailing-Arrow, Left-Stripe & Eyebrow-Pill Purge List

The complete per-occurrence file/line/text list is `cac-round7-evidence/design-inventory.json`, generated by `node tools/audit_design.mjs`. It is more precise than treating source literals as simultaneous visible widgets. The first captured inventory was made after the initial functional changes, not on pristine HEAD.

| Literal scan | First captured | Final | Meaning/action |
|---|---:|---:|---|
| Em-dashes across source/submission | 139 | 82 | All locale occurrences removed; remaining include comments, null markers and source/submission prose. |
| Arrow characters | 25 | 25 | The two test arrows were removed before the first inventory; remaining route-pair arrows convey direction and source links convey navigation. |
| Emoji/selected Unicode symbols | 9 | 5 | Four Lab saved-star literals removed after first inventory; speaker/warning emoji removed earlier. Remaining semantic star and internal ledger symbols are listed. |
| Left-stripe declarations | 3 | 3 | Earlier route/home stripes already removed; two extension hazard selectors and one depth card remain. |
| Pill-radius literals | 8 | 8 | Interactive Chip changed before first inventory; leftover status/marker/legend capsules are not all eyebrows. |
| Four specifically named purple hexes | 1 | 1 | Downstream chart series at tokens.ts:99. Retained for data identity. |
| Shadow/elevation literals | 4 | 4 | Reserved sheet/banner depth. |

Priority locations: `locales/en.json:419` and ES now describe test isolation/reset; `CockpitScreen.tsx:342/:700/:1338` now use words; `RoutePanels.tsx:564/:993` and `HomeScreen.tsx:454` use perimeter frames; `Kit.tsx:171` changes chips from decorative capsules to bounded controls. Optional external navigation arrows in `ProvenanceCard.tsx:32/:50`, `Kit.tsx:501/:502`, crossing detail :344/:345 and `MapSurface.web.tsx:474` can remain because they convey navigation.

Contrast: `#9AABC2` body-muted text passes all five sampled backgrounds. `#FF5470` on `#24334B` is 4.09:1; `#7A879C` is 4.13:1 on `#1B273A` and 3.50:1 on `#24334B`. The same colors exceed 3:1 for graphical components. This is a pair audit, not a complete screen audit. On a raised surface, use `S.textPrimary` for small prose and keep the semantic colored glyph/frame; do not recolor the locked status palette globally.

## Section 3: Prioritized Same-Day Code Fixes (`P0` Must-Fix Before Recording, `P1` High-Craft Polish)

All items marked applied are in the current workspace. The complete tracked-file diff is saved as `cac-round7-evidence/implemented-changes.patch`. New source files and captured preset data remain in their named paths. The patch is for review; do not apply it a second time to this checkout.

### P0 applied: recover the four preset reviews on a router outage

**Files:** `mobile/src/lib/routing.ts:125–166/:254–299`, `mobile/assets/demo/commute_presets.json:1`, `tools/build_commute_presets.mjs:1`; UI `mobile/src/screens/home/RoutePanels.tsx:564–576/:846–860`.

Before: any network failure could erase the preset demonstration. After: request deadline, exact endpoint matching, dated captured road geometry, live evidence checks where available, no claimed current detour, and no navigation/share export. Out-of-coverage remains visible for College Station. This is not a guarantee that every trip or public source will work offline.

Core applied gates:

```tsx
// Both Google and share exports require this boundary.
m.mode === 'live' && !m.testHazard && !m.routeBusy && !m.routeError && plan.geometrySource !== 'recorded'
// Google additionally requires blocked.length === 0.
```

```ts
const preset = recordedPresets.presets.find(p => same(p.origin, origin) && same(p.destination, destination));
if (!preset) return null;
// Only actual captured road polylines; never synthesize a straight line.
const route = { coords: preset.shapes.flatMap(decodePolyline6), km: preset.km, min: preset.min };
// remaining is reevaluated against current known hazards; avoided is empty.
```

The busy/error gates also prevent exporting a previous test detour during the asynchronous End test recheck. A held-promise regression verifies that boundary before restoring the real route.

**Verify:** from mobile, `node node_modules/jest/bin/jest.js --runInBand round7-routing-fallback round6-provider-probes`. All four presets and export gates are covered. On the phone, disconnect routing connectivity and confirm the amber Recorded geometry notice before filming any fallback footage.

### P0 applied: fix cold-start native speech and preserve the mute setting

**Files:** `mobile/src/lib/voice.ts:359–367`; `mobile/src/app/(tabs)/alerts.tsx:185–196`; tests `round6-ios-voice-probes.test.ts:29–64`, `round2-probes.test.ts:205–223`.

Before: the code captured `audioPreparation` before calling preparation; the first cold request could bypass the new wait. Alerts previews also enabled automatic voice alerts. Applied native sequence:

```ts
void prepareAudio()
  .then(() => fallbackSpeechSynthesis(cleaned, language, mySession, !!opts?.allowWhenMuted))
  .catch(() => { if (mySession === speechSessionId) notifySpeaking(false); });
```

Removed the preview's `setVoiceMuted(false)` / `updateSettings({voiceAlerts:true})` block. Preview uses its explicit override while automatic alerts remain muted. Test playback, pending cancellation and muting after setup; physical audibility remains outstanding. [Expo's SDK 57 speech documentation](https://docs.expo.dev/versions/v57.0.0/sdk/speech/) warns about physical iOS silent mode, so no silent-switch guarantee is made.

**Verify:** `node node_modules/jest/bin/jest.js --runInBand round6-ios-voice round2-probes`; Ring/Silent plus media volume and headphones must be checked on the recording device.

### P1 applied: make the unfavorable science comparison legible

**Files:** `mobile/src/screens/StormsScreen.tsx:70–140`; `mobile/src/screens/CockpitScreen.tsx:1337–1341`.

Removed four competing number tiles. The main comparison now reads from the results object:

```tsx
`Upstream: ${h.H}/${h.H + h.M} detected · ${h.M} missed · ${h.F} false alarm\n` +
`Nearest gauge: ${nearBase.H}/${nearBase.H + nearBase.M} detected · ${nearBase.M} missed · ${nearBase.F} false alarms\n` +
'The upstream rule did not beat the baseline.'
```

Spanish has corresponding copy. Lag is separately qualified as reference-gauge timing; the Lab no longer labels all 30 candidates monitored. **Verify:** full mobile suite and scientific audit, then a ten-second reading check with a person unfamiliar with the experiment. That human comprehension check has not been performed here.

### P1 applied: compact control geometry, archived label and focus cleanup

**Files:** `mobile/src/components/fc/Kit.tsx:135–264`, `mobile/src/screens/home/RoutePanels.tsx:994–1024`, `mobile/src/screens/HomeScreen.tsx:696–698`.

Applied control principles: `minHeight:44`, `maxWidth:'100%'`, `flexShrink:1` for long labels; Panel radius 10, interactive Chip radius 8. The archived header is a column with a wrapping control row. Stable blur cleanup:

```tsx
const stopTripRef = useRef(trip.stop);
useEffect(() => { stopTripRef.current = trip.stop; }, [trip.stop]);
useFocusEffect(useCallback(() => () => stopTripRef.current(), []));
```

**Verify:** mobile tests/lint/typecheck; physically perform Map → Drive → Map during a run. The cleanup is not dependent on the frequently changing monitor object. It intentionally stops a demo when leaving Map.

### P1 applied: copy and symbolic clutter

**Files:** both locale files; `CockpitScreen.tsx:342/:700/:1338`; `RoutePanels.tsx:910–920`; `HomeScreen.tsx:454`; `Kit.tsx:259`.

Locale punctuation changed mechanically without changing keys/interpolation. Test text explicitly states navigation isolation and reset. Lab speaker/warning emoji were replaced with localized text. Borders remain meaningful perimeters. **Verify:** `node tools/audit_design.mjs`, contract tests and full mobile checks. Do not strip direction arrows from origin/destination pairs or erase unknown-data placeholders.

### Remaining acceptance work and surgical options

These are not claimed as reproduced screen defects with the browser unavailable:

1. **320/375 width and keyboard:** `HomeScreen.tsx:1192` already persists handled taps and supports interactive dismissal. Software-keyboard occlusion, NativeTabs insets and Dynamic Type still need device measurement. Do not paste a guessed 336-pixel keyboard or 49-pixel tab inset. Same-day recording workaround: use the tested preset taps at 393×852 and leave search typing out until actual keyboard selection passes. Keep this as a native acceptance gate rather than marking it fixed.
2. **Loading movement:** at `RoutePanels.tsx:310–312`, replace the conditional busy-only text with a reserved status area if a visible layout shift is observed:

   ```tsx
   <View style={{ minHeight: 24 }}>
     {m.routeBusy ? <AppText accessibilityRole="alert" style={{ color: '#7DD3FC' }}>{t('route.checking')}</AppText> : null}
   </View>
   ```

   This optional snippet has not been applied and does not justify adding a decorative skeleton everywhere.
3. **Remaining semantic stripes:** `Kit.tsx:458` can remove only `borderLeftWidth:4`; existing perimeter color retains context. In `extension/fordcast.js:385–386`, substitute `.item.hazard { border: 1px solid #FF5470; }` and `.item.caution { border: 1px solid #F5A623; }`. These are optional cosmetic choices; verify the extension visually after changing them.
4. **Small colored body text on raised surfaces:** use `style={{ color:S.textPrimary }}` for that text, retaining the colored glyph and label. The pair audit identifies combinations requiring inspection, not a blanket need to replace all instances of a semantic color. Verify native badge/text contrast on the actual background.
5. **Submission authorship:** `FordCast_CAC_Submission.md:195` remains a draft personal answer. Do not read “I wrote” unless the student actually wrote it. The new top note explicitly directs alignment with `AI_USE.md`. Correct personal statements in the submission itself after the student identifies their real contribution. An agent cannot supply that history by editing prose.

All remaining options are short changes/recording choices. No new paid API, sensor program or architectural rewrite is needed for this recording pass.

## Section 4: Tomorrow's 1st-Place TX-37 Demo Video Production Blueprint (~2:15)

Target recording day: **October 25, 2026**, based on the current client date. The title follows the requested format; this plan carries no award prediction.

Pre-shoot setup:

- Choose **393×852 portrait** for the main recording; use a real iPhone development build if claiming iPhone execution. 320×568 and 375×667 are acceptance checks, not recommended recording crops. Desktop alternate: 1440×900, browser zoom 100%.
- Inspect EN and ES at all four requested sizes before recording. For each, check pledge, Home peek/half/full, route summary, detail, active car, Drive, Storms/Lab, Alerts/Settings. Confirm no horizontal scroll, hidden Stop, clipped source/date or obscured drill badge. This grid was not executed by the agent because browser control is disabled.
- Enable Do Not Disturb, mount the phone and set readable brightness. Turn Silent off for the speech check, set media volume, verify English and Spanish Preview and Stop. Record narration separately if device TTS is unreliable; do not imply native speech played when it did not.
- Use a stationary device. Do not drive for the recording. A simulated lockout is a demonstration, not a road test.
- Reset to English, Live, no route, no synthetic hazard and no active car. Do not reset stored user data unnecessarily. Confirm test hazard removal via End test, not by hiding its disclosure.
- Check the four presets once. Recorded fallback captures are in `mobile/assets/demo/commute_presets.json`; do not rerun the builder during the shoot. Keep the recorded-geometry label in frame if used.
- Preload Memorial Day 2015, verify its 50-second car run, and open the study comparison once. Do not hide “archived,” misses, source failures or outside-coverage notices for cleaner footage.
- Provide the student's real name and accurate development tools in opening/title or closing overlay. Check the current portal's video requirements. [Official CAC rules](https://www.congressionalappchallenge.us/wp-content/uploads/2026/05/2026-CAC-Rules.pdf) require student technical contribution and disclosed AI assistance; a polished video does not replace that obligation.

The following is a continuous 135-second edit with precise cut points. Real routing latency can be edited out if no false timing claim is made. The car segment runs the full 50 seconds; no unseen real-world flood is implied.

| Timecode | Screen & exact action | Required visual proof | Spoken voiceover | Why it helps the requested panel |
|---|---|---|---|---|
| 0:00–0:05 | Live Map; title overlay | Student real name, FordCast, Austin-area pilot | “I'm [NAME]. FordCast checks the low-water-crossing evidence along an Austin-area trip.” | Names the builder, task and supported area immediately. |
| 0:05–0:12 | Tap Check my trip | Real map, destination/preset controls | “Before leaving in heavy rain, a driver needs to know which crossings have reports, and where information is missing.” | Gives a concrete pre-trip decision. |
| 0:12–0:22 | Tap Downtown → Onion Creek Park | Explicit starting point and destination; source-health row | “This trip is compared with 2,052 inventory records. Nearby hardware records are grouped into physical crossing areas.” | Shows a technical transformation in context. |
| 0:22–0:32 | Expand route evidence; select a crossing | Grouped count, sensor gap, official source status | “The audit brings together official reports, available creek readings and nearby flood history. A missing sensor stays visible.” | Makes uncertainty part of the utility. |
| 0:32–0:42 | Remove route; choose Austin → College Station coverage check | Outside-coverage warning | “A trip outside the Austin inventory gets a coverage warning. FordCast cannot establish conditions on those roads.” | Demonstrates a boundary instead of extending a claim. |
| 0:42–0:50 | Return; tap Storm reroute demo | Archived Memorial Day 2015 identity before movement | “For a repeatable demonstration, this next trip uses archived Memorial Day 2015 observations and recorded road geometry.” | Explains why the next scene is historical. |
| 0:50–0:53 | Start the car run; camera follows car | Car, crossing ahead, archived label, Stop | “Watch the crossing ahead.” | Directs attention before the decision. |
| 0:53–1:03 | Let the decision play; hold phone framing | Changed route and status text together; leave archived label visible | “In this simulation, a gauge trigger changes the caution state and selects a precomputed alternative.” | Shows behavior without calling it a verified road forecast. |
| 1:03–1:15 | Continue car run | Car progresses on alternative; source/reason visible | “The illustration connects a source reading to a route decision. It does not prove that the road flooded at that moment.” | Prevents conflating gauge stage and road water. |
| 1:15–1:28 | Continue, hold uncluttered frame | Archived identity throughout | “Live routing and archived demonstrations are kept separate. A synthetic closure test also disables navigation and sharing until the test ends.” | Explains the tested isolation boundary. |
| 1:28–1:40 | Let run finish at 50 seconds | Arrival/finished state and Stop | “The app combines official reports with explicit uncertainty. Public feeds, inventory gaps and unvalidated road thresholds limit what it can say.” | Keeps the long demo tied to evidence. |
| 1:40–1:50 | Tap Storms | Direct comparison with 4/12, 8 misses, 1 vs 0 false alarms | “Across twelve gauge-reference cases, the upstream rule detected four and missed eight. The simpler nearest-gauge baseline detected the same four.” | Makes the negative result visible in ten seconds. |
| 1:50–2:00 | Hold comparison and reference-stage qualifier | Median reference-gauge lead; road-validation limit | “The upstream rule also produced one false alarm. Road-flood prediction remains unvalidated. These numbers are shown, including the misses.” | Demonstrates scientific honesty. |
| 2:00–2:08 | Brief Alerts preview or main Map; show tools overlay | Python, TypeScript, Expo; AI disclosure reference | “FordCast uses Python and TypeScript with Expo. Its code and AI assistance are documented for review.” | Supplies tools and accurate disclosure. |
| 2:08–2:15 | Return to Map/pledge | Never drive into water; obey barricades | “The goal is a more understandable trip check. Obey official warnings and barricades. Never drive into water.” | Closes with an understandable purpose and action. |

Alternative insert if the car transition is too subtle on the recording device: make a close crop during 0:53–1:03 that includes the status, changed route and archived label together. Do not crop the disclaimer out. Test that crop before recording the final take; no fresh framing proof was produced here.

Backup plan:

1. **No active local flooding:** show the actual current audit and unavailable/unmonitored states. No reported hazard is not a passability assertion. Then use the archived car segment exactly as labelled above.
2. **Want to show a synthetic closure:** use a separate optional take on a live route: expand Test rerouting → inject → show TEST, warning/route result and no Google/share control → End test and recheck. This test is not a fake news event. Replace the College Station segment or create a supplemental clip; do not overrun 2:15.
3. **Valhalla outage:** retain Recorded geometry/date notice; show the evidence review and disabled external navigation. Say, “Routing is unavailable, so this view uses dated recorded geometry for review.” It cannot demonstrate a current detour calculation. Use the bundled archived car for the animated decision.
4. **All feeds unavailable:** show the failure state briefly, then the labelled archive. Do not present old closure/sensor evidence as current. Captured preset geometry does not cache all external feeds or map tiles.
5. **Audio or native rendering failure:** record a clearly identified web demonstration with separate narration. Do not imply that a browser viewport proves iPhone OS behavior. Fix the native acceptance failure before calling the iPhone build ready.

## Section 5: The Live Judge Q&A "Murder Board" (Top 6 Questions TX-37 Judges Will Ask)

**1. Why should anyone trust an upstream method that ties a nearest-gauge baseline and misses eight cases?**

“The experiment does not establish better prediction. It detected four of twelve reference-gauge cases and missed eight, with one false alarm against zero for the baseline. The main utility is the trip-evidence audit. The experiment is displayed with those limits, and it cannot establish road conditions.”

**2. Why is Tier A zero, and what does the 65-minute number actually mean?**

“There are no validated road-overtopping thresholds in this dataset. The reference labels are downstream gauge category stages. The 65-minute median measures timing before that reference stage in detected cases. It is not measured time before water reaches a road.”

**3. Isn't this just ATXFloods plus Google Maps?**

“Those tools provide important parts of the workflow. FordCast brings route-corridor crossing records, grouped hardware, available readings, historical context and missing information into one trip check. Its public-router reconstruction and suggested waypoints can differ from Google's route, so official warnings and barricades still govern.”

**4. Why do 111 of 141 study crossings lack a sensor link? Are the other 30 validated?**

“The study inventory includes many crossings without a usable gauge relationship. Thirty are research candidates; only four records across two research corridors currently have primary-calibrated links. Neither candidate membership nor calibration establishes a surveyed road threshold. The app shows those gaps rather than extrapolating coverage.”

**5. What happens offline, if a feed lies by omission, or when someone leaves a simulated closure active?**

“Loading and unavailable sources are distinct from an empty report. The four preset pairs can use dated recorded geometry for review during a router outage; it is labelled and cannot export navigation. Test closures also block navigation/share, and End test recomputes without them. Recorded geometry does not make missing live evidence current.”

**6. Which parts did you write yourself, and how much came from AI?**

“AI assistance was substantial, including implementation, tests and audit drafts. The repository's AI_USE.md records agent-authored work. My own contribution was [replace with the student's specific, truthful work]. I can explain [only modules the student can actually explain].”

Do not remove those ownership placeholders by substituting a generic claim of student authorship. The current repository disclosure does not establish a completed student explain-back. Before submission, the student should identify and demonstrate their actual contribution and ensure the personal answers match it.
