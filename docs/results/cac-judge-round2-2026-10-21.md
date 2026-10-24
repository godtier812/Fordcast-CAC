# FordCast Round 2: verification, TX-10 impact and submission verdict

Review began October 20 and concluded October 21, 2026, America/Chicago. This reviews the inspected working tree against the nine remediation groups and six journeys in the attachment; later edits are not implicitly verified.

**Decision: keep the idea, narrow the promise, and do not call the remediation complete.** The app is a more usable Austin-area preparedness prototype. It is not yet a verified road-flood predictor, a district-wide TX-10 service, or a general replacement for navigation. Its best submission is a focused demonstration of checking a familiar trip against official closures and transparent creek evidence, with experimental forecasting presented separately.

## 1. Executive CAC scorecard

These are subjective review scores, not official district judging weights or an estimate of winning probability. Equal emphasis is used only to compare with Round 1.

| Pillar | Round 1 | Round 2 | Deductions from 10 |
|---|---:|---:|---|
| Idea & Community Impact | 6.4 | **6.0** | −1.3 unproven road benefit; −1.1 narrow Austin implementation relative to TX-10; −0.9 differentiation from existing official tools unproven; −0.7 no observed local user benefit/comprehension evidence. The UI improved; research into actual reach and competition lowers the impact assessment. |
| UI & User Experience | 5.2 | **6.5** | −1.0 mobile demo Stop remains below the fold; −0.9 trip/mode transitions still mix live and simulated context; −0.7 technical prose and incomplete grouping; −0.5 origin editing is presets-only and cannot return to downtown; −0.4 source-health/voice feedback remains misleading in places. |
| Technical Execution | 4.8 | **5.6** | −1.2 Guardian source-retention gaps; −0.9 duplicate Drive speech and inconsistent mute; −0.8 broken arrival/grouping/time contracts; −0.8 routing coverage and live/drill state gaps; −0.7 unverified device/extension behavior and missing adversarial coverage. |
| Overall | 5.5 | **6.0** | Rounded arithmetic mean. Improvements are real; they do not establish deployment readiness. |

**Strongest demonstration:** a named trip, a visible crossing warning, and a route alternative. **Biggest remaining weakness:** the user-facing assurance extends beyond the places, sources and behaviors actually verified. That includes geographic reach, not just forecasting accuracy.

### What passed and how this was tested

- Automated checks were run first: TypeScript, `expo lint`, **59 mobile tests in five suites**, and **18 extension tests** passed.
- I added an audit-only probe file outside product source and executed it through the project Jest environment. **9 probes passed and 3 failed**: valid `[30,90]` window missing; an official closure uses a calm gauge's timestamp; two different creek crossings on one road merge solely by proximity. The temporary executable copy was removed; [probe source](C:/2025AppChallenge/docs/results/cac-round2-evidence/round2-probes.test.ts) and [actual results](C:/2025AppChallenge/docs/results/cac-round2-evidence/probe-results.txt) remain. These are synthetic counterexamples, not a claim that two specific municipal locations were field-surveyed.
- The running bundle was intentionally reloaded and inspected at **390×844** and **1366×860**. Fresh browser error/warning logs returned `[]` at the inspected point; the prior responder/circular-import errors were not reproduced. This is a short-session observation, not a universal console guarantee.
- Real UI actions included both demos, route creation, custom origin selection/replanning, simulated closure disclosure, live/detail-to-drill transition, Drive start/stop, voice preview/Stop/mute, and Storms inspection. OS permissions, physical driving, installed background delivery, audible persona fidelity and a real installed Google Maps extension were not verified.
- Browser access was disabled in Work settings near the end. College Station search succeeded and routing started; the final route result and cleanup could not be inspected. Do not call that route either passed or failed. Last verified HUD and car demo were stopped, voice preference restored on, test route removed, and live mode selected before that final geographic probe. The later College Station route and UT Austin custom origin may remain in the open session.

## 2. TX-10: is this the right idea, and how general is it?

### The problem is relevant; district coverage has not been demonstrated

TX-10 is participating in the 2026 CAC. The representative's official biography describes the currently represented district from Lake Travis to the Brazos Valley, with all or parts of 13 counties: Austin, Bastrop, Brazos, Burleson, Colorado, Fayette, Grimes, Lee, Madison, Travis, Washington, Waller and Williamson. That is not synonymous with Austin or Travis County. County membership also does not mean every address in a split county belongs to TX-10. [CAC participation](https://www.congressionalappchallenge.us/students/participating-districts/), [McCaul biography](https://mccaul.house.gov/about/full-biography).

There are two boundary versions to distinguish: Texas says **PlanC2193 representatives continue serving until January 2027**, while **PlanC2333 applies to the 2026 elections**. Do not quietly use one map as proof of the other's coverage. This review accepts your stated TX-10 participation; it does not infer your home/school address or adjudicate eligibility. [Texas Legislative Council boundary explanation](https://redistricting.capitol.texas.gov/Current-districts).

The actual app has:

| Layer | Implemented reach | What that means for impact |
|---|---|---|
| Core study inventory | 141 municipal/study records | Records are not 141 independently validated physical crossings. |
| Bundled regional inventory | 1,911 extra records, 70km regional configuration; UI combines these with the 141 as 2,052 | A large visible count is not a TX-10 coverage count or active sensor coverage. |
| User coverage gate | 80km from downtown Austin (`geo.ts:9`) | The public College Station office coordinate lies outside it; a passing audit probe confirms exclusion. Out-of-area GPS falls back to Austin/custom origin (`monitor.tsx:196`). |
| Calibrated study records | Four: three E. William Cannon device records and Henry Marx at Barton Creek | Four IDs do not establish four independent physical sites or district-wide upstream coverage. All exported links have `road_forecast_verified=false`. |
| Jurisdiction breadth | Many Austin-area records; 428 labeled Bastrop County, 40 Lee County, 3 Fayette County; no bundled jurisdiction label for Brazos/College Station, Washington/Brenham, Grimes or Waller | These are raw source labels, not district-boundary intersections. There is useful regional overlap, but the eastern district is not established as covered. |

Reproducible bundled-data evidence: [coverage summary](C:/2025AppChallenge/docs/results/cac-round2-evidence/coverage-summary.json). I did not calculate the number of records inside TX-10. The official GIS download could not be resolved through the local network, and web access to the ZIP did not provide usable polygon data. Any exact TX-10 crossing total would therefore be invented. The right next measurement is a point-in-polygon overlay using the explicitly named plan, followed by physical-site review and per-source coverage counts.

### The idea is not too local. Its audience claim is too broad.

The strongest initial audience is **people whose regular school/work/family trip uses a known low-water crossing in the supported area**. They can benefit from a clearer trip-specific official warning and preparedness explanation. That is a specific user and decision.

The weak claim is “an app for every driver across TX-10.” Someone whose route never uses these crossings gains little from repeated gauge/history checks. For someone in College Station or farther east, this implementation's Austin fallback is a liability, not a district-wide benefit. Emergency crews and school-bus operators are prospective partners, not established beneficiaries: the project has no demonstrated operational integration or verified route-safety workflow for them.

Flood risk is episodic. A useful safety product does **not** need daily engagement on sunny days. A saved commute check is a reasonable preparedness tool, but adding content to make it feel busy does not prove recurring demand. The meaningful metric is a correct, timely decision when the route is threatened—not app opens or number of markers.

### Existing alternatives make the originality claim harder

TxDOT announced a **DriveTexas mobile app on August 11, 2026**, with roadway conditions, flood impacts, cameras and routing. Its existence directly weakens “drivers have no usable integrated road-condition tool.” ATXfloods already supplies official crossing status; FordCast is consuming that value rather than creating it. [TxDOT announcement](https://www.txdot.gov/about/newsroom/statewide/download-the-new-drivetexas-app.html).

FordCast's potential distinction is a **specific crossing-on-my-trip explanation combining official status, observation age, monitoring gaps and an understandable alternative**, with independently evaluated creek-based research. It must show that this helps a commuter more than simply consulting official tools. The current data does not establish superior forecasting: upstream and nearest-gauge methods both detect 4/12 proxy events with a 65-minute hit median; upstream adds one false alarm versus zero. It also does not establish superior routing or fewer harmful decisions than existing apps.

Do not propose casually copying DriveTexas into FordCast to solve district coverage. The published API says access requires approval and restricts its intended use/redistribution; official website links are a different matter from permission to ingest/rebrand the feed. [DriveTexas API terms and purpose](https://api.drivetexas.org/).

### How general is the concept?

| Meaning of “general” | Honest assessment |
|---|---|
| Understandable to a general audience | Yes, if framed as “check the crossings on your trip,” rather than lag calibration and tier ladders. |
| Useful to everyone in TX-10 today | No. Coverage, route habits and source gaps limit the beneficiaries. |
| Useful beyond one named creek | The official-status/route-awareness workflow is transferable; the study currently has a very small calibrated subset. |
| Portable forecasting nationwide | Unproven. USGS availability does not supply road thresholds, correct upstream topology, calibration, closure feeds or municipal validation everywhere. |
| A distinctive standalone product | Plausible as a focused companion, insufficiently demonstrated as a general navigation replacement. |

**I would not abandon FordCast. I would abandon the unsupported universal forecasting pitch.** A narrow prototype with an honest comparison can be a credible student contribution. Claiming district-wide life-saving coverage without measurement gives a judge a straightforward reason to distrust the submission.

### Recommended TX-10 pitch

> FordCast is a prototype that helps drivers in its supported Central Texas area check low-water crossing exposure before a trip. It brings official closures, available creek readings and explicit coverage gaps into a route-specific view. Historical storm replays demonstrate an experimental gauge-warning method; road-flood prediction and district-wide coverage are not yet validated.

Use one **verified in-district physical crossing and real route** as the opening local example after checking its boundary and sources. Do not label Henry Marx or E. William Cannon TX-10 merely because they are near Austin. An out-of-district research example can still illustrate the method if labeled honestly; it cannot substitute for proof of local reach. Include an eastern-district gap such as College Station as an explicit coverage limit, not an implied success story.

## 3. Claim-by-claim remediation matrix

“VERIFIED FIXED” is limited to the described contract, not every device/platform. Most groups contain several claims, so partial status is intentional.

| Group | Grade | Browser observation / source trace |
|---|---|---|
| 1. Combined Drive hazards and active-route order | **PARTIALLY FIXED** | Observed an unmonitored ATXfloods closure in Drive; the calm-sensor closure and unmonitored-NWS probes pass. `danger.ts:231` consumes combined states. But `drive.tsx:105` then defaults to the highest urgency rather than necessarily the first ahead, accepts an existing live route during drill, and shows observation age from the wrong source (`danger.ts:252`). No-route Drive selected a closure **30 miles away** and labeled the view “LIVE · USGS SENSORS.” The closure read “669230m ago.” |
| 2. Epistemic honesty, counts and physics | **PARTIALLY FIXED** | Observed home 4/30 instead of 38 minutes; range strings explicitly say gauge lag/road unverified; Tier-A copy now requires field validation; unsourced force numbers are gone and NWS source is linked. Yet `en.json:150` still says it warns before water gets there, `en.json:475` retains benefit language, and the actual submission package still promises crossing-level road forecasts (`FordCast_CAC_Submission.md:77`, `:102`, `:339`). Four calibrated IDs are not four verified physical crossing sites. |
| 3. Guardian cache resilience | **PARTIALLY FIXED** | Traced all-source rejection and NWS fetching (`guardian.ts:63–77`); initial empty foreground write is gated (`monitor.tsx:559`). But foreground writes do not tag individual hazards with source/obsAt (`monitor.tsx:566`); background retention requires tags or limited ID heuristics (`guardian.ts:104`, `:126`, `:152`). Foreground NWS hazards can vanish on partial refresh. NWS background coverage iterates only the 141 study records (`guardian.ts:135`), omitting the regional extras. No background request timeout is passed. Not device-verified. |
| 4. Network timeout and latest-request wins | **VERIFIED FIXED** for foreground/route request wiring | Traced actual shared AbortController signals into USGS, ATX, NWS, rain (`monitor.tsx:254–310`) and router (`:589–614`), 12-second timeout, generation guards and nonempty USGS check. This is real abort wiring, not a timer-only wrapper. Observed route and origin replan completing. Background refresh and geocoder still need bounded lifetimes; source freshness is not solved by this fix. |
| 5. Physical grouping and cleaned names | **PARTIALLY FIXED** | Observed **3 areas / 4 records**, not the promised 1 area, on downtown → Onion Creek Park. The code's 320m grouping cannot be assumed to identify one physical site across the entire road segment. Do not “fix” that by forcing all four together; their coordinates span substantially more than 320m. The synthetic different-creek/same-road test fails because road-key comparison removes creek identity (`danger.ts:100`, `:138`). “Master Arm” remains in hotspots; parenthesized W/E fragments remain. Event dedup uses only date/type and only primary-record history (`:191`), so independent same-day reports collapse and secondary histories disappear. |
| 6. Unified arrival contract | **STILL BROKEN** | Six actual model windows now work, but `[30,90]` returns null in a direct executable probe (`ArrivalBucketStrip.tsx:41`). The attachment itself incorrectly enumerates the risk contract; `risk.ts:11` is authoritative. Strip retains out-of-contract 90–180m cells. Supporting several hand-selected unions is not a unified contract. |
| 7. Live/archive, datum, narratives and NWS expiry | **PARTIALLY FIXED** | Observed live science contains no archived chart, then explicit switch produces a dated ARCHIVED banner (`crossing/[id].tsx:380`). Datum explanation visible. Expiry check and vetted/stale sensor handling traced. Preparedness card exists. Narrative “expansion” changes number of records; stored summaries were already truncated to 220 characters (`build_flood_history.py:40`, `:169`), so it cannot reveal full text. NOAA link points to the database rather than the precise record. |
| 8. Unified voice and no-way demo | **PARTIALLY FIXED / NEW REGRESSION** | Observed Playing preview → Stop preview → Preview ready, and Alerts mute reflected as Unmute in HUD. Session tokens gate rejected playback fallback; simulation prefix preserved and road-name guessing removed (`voice.ts:132`, `:264`). However Drive calls shared `speak()` **and unconditional `Speech.speak()`** for the same alert (`drive.tsx:169–180`): two speech paths remain. `force` bypasses the top-level mute guard (`voice.ts:264`). No-way car clamp and no-arrival logic traced (`useTripDemo.ts:55`, `:158`) but no-way scenario not browser-reproduced. |
| 9. Hierarchy, origin, health, banner and console | **PARTIALLY FIXED** | Mobile Check my trip and demo are visible without scrolling; banner leaves mode toggle visible. Fresh inspected console clean. But Stop demo is still below the visible 305px sheet content; origin offers the first six destinations rather than named neighborhood starts (`RoutePanels.tsx:108`), omitting Downtown after changing it; no address entry. Strip includes ATX/USGS/NWS but not claimed Valhalla, uses newest reading anywhere instead of route-linked freshness, and Spanish says warnings are “active” when only fetch succeeded. Storms has no claimed side-by-side comparator. |

### Six required journey grades

| Journey | Grade | Result |
|---|---|---|
| 1. GPS-off first 15 seconds | **PARTIALLY FIXED** | Both main actions visible at 390×844; default downtown stated. This was a fresh bundle reload with previously accepted notice, not a new-storage onboarding test. Technical 4/30 R&D jargon remains. |
| 2. Sunny-day demo on both sizes | **PARTIALLY FIXED** | Launched on mobile and desktop, visible simulated trip and route; banner no longer covers toggle. Mobile Stop hidden below fold. Label says 45 seconds while `DRIVE_SECONDS=50`, with detour length capable of extending it. |
| 3. Commuter / origin / disclosure | **PARTIALLY FIXED** | Route 14m/9.3mi from downtown, audit above Google handoff, 3 areas/4 records. Changed origin to UT; replan 16m/11mi. Simulated closure initially hid handoff while blocked, then produced +2m alternative. Test disclosure works. Mode transition later displayed that live route during a drill with live source health. |
| 4. Skeptic detail | **PARTIALLY FIXED** | Datum note, nearby-history caveat, preparedness card and explicit archived mode work. Arrival contract and source narrative fidelity remain incomplete. |
| 5. Hands-free | **PARTIALLY FIXED** | Official closure is now included, combined-state fixture passes, Stop works. Actual browser shows a far-away warning, enormous age and voice-unavailable message; route-ahead sequencing/device delivery unverified. |
| 6. Alerts / voice / Storms | **PARTIALLY FIXED** | Visible preview state and stop/mute work, plain voice labels and foreground limitation exist, disclosures shorten page. Audible quality unverified; Drive still invokes two engines. Storms now foregrounds 4/12, 8 misses and one false alarm, but omits the promised side-by-side nearest-gauge comparison. |

## 4. Remaining findings, ranked

### P0 — Guardian's foreground/background cache contracts still disagree

`monitor.tsx:566` writes plain route hazards without `source`; `guardian.ts:104–156` retains source-tagged hazards. A foreground NWS warning on an `atx-` study ID may be mistaken for a USGS fallback or discarded, and regional NWS hazards are never rebuilt. A successfully fetched stale/partial USGS dataset can also clear a known sensor hazard, since nonzero rows count as source success.

**Fix:** a single typed source-evidence cache shared by both writers; retain source-specific states through failure/staleness, preserve expiries and coverage, and bound background requests. Test cache written by foreground → background partial failures, not just a hand-authored ideal cache. Treat this as a blocker to background protection claims, not proof of a field failure that this review did not perform.

### P1 — Out-of-area routing can be mistaken for supported coverage

`geo.ts:9`, `monitor.tsx:196`, `monitor.tsx:415` constrain location/hazard coverage; Photon and Valhalla can search/route beyond it. No route-wide inventory completeness contract was found. College Station search and start of route observed; final result unverified due browser block.

**Fix:** intersect route segments with an explicit coverage footprint and render unsupported portions. Do not infer “no hazards” from absence of crossings. Keep actual user origin or explicitly ask them to choose a demo area; do not silently reposition someone to Austin. Surface official external resources for unsupported areas. Do not broaden the radius as a substitute for adding data.

### P1 — Drive speaks via two paths and still has false context/freshness

`drive.tsx:169–180` calls both engines. `danger.ts:252` prefers `live.obsAt` even for closure reasons; `drive.tsx:63` ages relative to last fetch rather than a continuously advancing clock. Browser showed an ATX closure under “LIVE · USGS SENSORS,” 30mi away, “reading 669230m ago.” Official updated-at age is also not equivalent to stale closure evidence: a long-standing closure can remain valid.

**Fix:** one controller call, global mute contract, reason-specific timestamps and source label. Show “closure last updated [date]; checked [time]” instead of conflating update and observation age. Nearby mode needs a meaningful radius; active-route mode needs route-along distance and segment position, not a two-index tolerance that varies with polyline density. Default selection must respect route priority.

### P1 — Live route and simulation evidence coexist

Observed after switching from a live route/detail to an explicit archived drill: route card still showed live source health, simulated crossing statuses, a test detour and **Go with Google Maps** (`RoutePanels.tsx:177`, `HomeScreen.tsx:840`). Capture: [mixed mode](C:/2025AppChallenge/docs/results/cac-round2-evidence/mixed-drill-route.png).

**Fix:** bind every route to mode/snapshot/source version; hide or pause real navigation controls during a drill. On transition, clear/isolate test hazards, old route plans, banners and audio sessions. A simulation must never inherit an apparently verified live-route badge.

### P1 — False grouping and lossy event counts

The explicit distinct-creek probe fails. Grouping strips the creek and road suffixes and permits substring road matches plus transitive proximity (`danger.ts:100–147`). This can merge Old/New roads or several neighboring crossings, while failing to merge intended device records. `countDistinctHistoryEvents` uses primary history and date/type only.

**Fix:** reviewed physical-site IDs linking devices, roads and streams; conservative “possible duplicate” groups when uncertain. Stable NOAA event IDs and union of all member histories. Do not advertise an exact physical-crossing count before resolving identity.

### P1 — `[30,90]` is still absent from the visual contract

Direct failing probe. **Fix:** derive the visual interval model from `allowedWindows`, validate every legal window, and separate cells from allowed combined ranges. Remove unsupported cells or explicitly identify them as explanatory bins, never predicted ranges.

### P1 — Submission prose still promises the unbuilt advantage

`FordCast_CAC_Submission.md:77`, `:102`, `:310`, `:339` claim road forecasts and lead time before water reaches the road. The study explicitly does not verify that. Settings/locales also retain outcome claims (`en.json:150`, `:475`). This is not cosmetic language: it defines the idea the judges are being asked to reward.

**Fix:** replace submission/video claims with built/proxy/roadmap distinctions and actual comparison. Do not say all competitors react only after water reaches the road, or that every crossing is truly upstream-linked, without evidence. Keep the useful route-awareness contribution even when the predictive experiment is inconclusive.

### P2 — Mobile control visibility and origin traps remain

Peek contains wrap-heavy simulation text, follow control, result and body before Stop. Screenshot shows Stop below bottom navigation. Origin presets omit downtown from `.slice(0,6)` after reordering, so there is no visible reset to default. Alerts still says downtown while distances use UT custom origin.

**Fix:** sticky compact Pause/End controls; no duplicate “Simulation · Simulated drive.” Independent origin list with search/reset and consistent location labels throughout the app. Avoid increasing sheet height until the map becomes unusable.

### P2 — “All five upgrades built” overstates completed work

Preparedness card exists but is generic; NOAA summaries cannot expand beyond already truncated source data. Storms improves metric context but lacks the comparator. Source strip omits some claimed sources and uses global rather than trip sensor freshness. General safety education is improved, not a validated vehicle simulator. **Fix:** mark partial deliverables accurately and complete the user-relevant parts before adding more visual panels.

## 5. Final CAC submission readiness checklist

### Required before claiming the application functions as presented

- [ ] Correct the submission/video road-forecast claims and retain 4/12 hits, eight misses, one false alarm, zero validated road thresholds and comparator parity.
- [ ] Fix double Drive speech, source-specific freshness, `[30,90]`, and mixed live/drill navigation.
- [ ] Complete source-tagged Guardian retention or remove background protection from the demonstrated scope until device-verified.
- [ ] Make coverage boundaries visible and verify one physical crossing/route within the named TX-10 plan. Report exact map/study/sensor/road-validation counts separately.
- [ ] Use the actual route geometry/coverage contract in app and extension; keep Google handoff caveat and blocked-route suppression.
- [ ] Re-run the adversarial probes as passing product tests after repairs, alongside the existing suite. Do not delete failing evidence and call acceptance complete.

### Highest-leverage presentation work

- [ ] Begin with one resident's concrete supported trip and the decision they need, not a statewide death count or architecture diagram.
- [ ] Show Check my trip → named crossing area → source freshness/unknown coverage → reported hazard/appropriate alternative.
- [ ] Show a short, unmistakably labeled archived demonstration. Keep Stop visible and avoid “higher-ground” or “road onset” claims without supporting data.
- [ ] State one limitation plainly in the video. Acknowledge official tools and explain FordCast's additional trip-specific view.
- [ ] Show a small comparison with nearest-gauge results; explain why an inconclusive forecasting experiment led to a narrower prototype.
- [ ] Obtain real feedback from several target users and, if available, a local road/emergency professional; measure correct comprehension and decisions. Do not invent participants, testimonials, municipal endorsement or saved lives.
- [ ] Ensure the student can explain the chosen source, stale data behavior, route limitations and an unsuccessful experiment. Test passes alone do not demonstrate personal understanding.

### Dates and boundary questions that must not be guessed

The national registration page says **October 26, 2026, 9pm ET (8pm Central)**; McCaul's current district page says **October 30, 2026**. These official pages conflict. Work to the earlier portal deadline unless the office/portal explicitly confirms otherwise; do not repeat the package's noon ET timestamp as verified. No office was contacted during this review. [National registration](https://www.congressionalappchallenge.us/students/student-registration/), [TX-10 office CAC page](https://mccaul.house.gov/serving-you/app-challenge).

District relevance does not require that the app solve every constituent's problem. It does require honesty about the people and places it currently serves. The shortest credible finish is an **Austin-area pilot with a verified TX-10 example and measured limitations**, not a rushed claim of statewide or nationwide prediction.

## Evidence index

- [Mobile landing](C:/2025AppChallenge/docs/results/cac-round2-evidence/mobile-home.png): both main actions now visible.
- [Mobile demo](C:/2025AppChallenge/docs/results/cac-round2-evidence/mobile-demo.png): banner preserves mode; Stop remains below fold.
- [Desktop route](C:/2025AppChallenge/docs/results/cac-round2-evidence/desktop-route.png): 3 areas/4 records and source-health strip.
- [Live detail](C:/2025AppChallenge/docs/results/cac-round2-evidence/live-detail.png) and [explicit archived detail](C:/2025AppChallenge/docs/results/cac-round2-evidence/archived-detail.png).
- [Mixed-mode route](C:/2025AppChallenge/docs/results/cac-round2-evidence/mixed-drill-route.png).
- [Official closure in Drive](C:/2025AppChallenge/docs/results/cac-round2-evidence/drive-closure.png).
- [Desktop demo](C:/2025AppChallenge/docs/results/cac-round2-evidence/desktop-demo.png).
- [Executable adversarial evidence](C:/2025AppChallenge/docs/results/cac-round2-evidence/probe-results.txt) and [bundled coverage summary](C:/2025AppChallenge/docs/results/cac-round2-evidence/coverage-summary.json).

No product source was changed in this verification audit. No release, external submission, permission grant, office message or extension installation was performed.
