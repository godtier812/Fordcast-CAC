# FordCast peer review, round 3

Reviewed October 21, 2026, against the master prompt, the requested nine remediation groups and six journeys, and the current working tree. This is a review, not a repair pass. Existing edits were preserved.

**Verdict: meaningful repairs, but not ready to sign off.** The focused trip-awareness idea remains credible. The web module contract, coverage reporting, cached warning evidence and scientific submission claims still need correction. Passing the existing suite does not establish the promised behavior.

## Checks actually run

| Check | Result |
|---|---|
| TypeScript, `node node_modules/typescript/bin/tsc --noEmit --pretty false` in mobile | PASS; the sequential command proceeded to lint and Jest |
| Expo lint, `node node_modules/expo/bin/cli lint` in mobile | PASS; the sequential command proceeded to Jest |
| Existing mobile Jest suite | **75 tests passed, six suites**, clean rerun after removing the temporary audit copy |
| Extension, `node extension/test.mjs` | **18 passed** |
| Four independent adversarial Jest probes | **All four failed**, exposing the defects below |
| Fresh browser/mobile and desktop journeys | **BLOCKED:** browser control returned “Local browser use is disabled in Work settings.” No new screenshots, layout acceptance or clean-console claim |
| Installed background notification, device audio, GPS driving, screen readers, installed extension interaction | Not verified |

The first broad Jest run also discovered the temporary audit copy: 75 passed and four failed. That is consistent with the isolated probe run, not a pre-existing suite regression. The temporary executable copy was removed; the counterexamples and their actual output remain in [probe source](C:/2025AppChallenge/docs/results/cac-round3-evidence/peer-probes.test.ts) and [results](C:/2025AppChallenge/docs/results/cac-round3-evidence/probe-results.txt). Expo Notifications emitted its Expo Go remote-push warning; that is not evidence of installed background delivery. Backend/scientific regeneration was not rerun in this pass; the mobile/extension checks must not be described as whole-project scientific acceptance.

## Ranked findings

### 1. P1 — Web imports a serializer that its platform module does not export

`mobile/src/lib/monitor.tsx:15` imports `buildGuardianHazardsFromStatuses` from `./guardian`; its cache effect calls it at line 569. `mobile/src/lib/guardian.web.ts` exports only the Guardian task/capability/start/stop stubs. The native serializer exists, but the web module has no corresponding export. The direct web-module probe receives `undefined` instead of a function.

**Impact:** a successful feed refresh reaches a call that cannot succeed in the web platform module contract. This is a web release blocker. A browser crash was not directly reproduced because browser access was blocked; the missing export was executed and confirmed. Native-oriented TypeScript/Jest resolution does not catch this platform difference.

**Correction:** move the pure serializer into a platform-independent module, or provide consistent platform exports. Test the actual web entry/module contract as well as the native module. Do not import native background-task dependencies into web merely to make the named export exist.

### 2. P1 — Coverage warning can hide an unsupported route excursion

`mobile/src/lib/routing.ts:37` calculates coverage as the fraction of polyline vertices inside an Austin-centered circle and warns only below 95% (unless an endpoint is outside). A synthetic route with both endpoints in Austin, 100 Austin vertices and one College Station-area vertex returns `outsideCoverage=false`; the independent probe fails.

**Impact:** sampling density controls whether an unsupported segment is disclosed. Vertex percentage is not percentage of route distance. The circle is also a configuration boundary, not proof that crossing inventory or sensors are complete inside it.

**Correction:** detect every unsupported segment; if reporting a percentage, measure segment length against a documented footprint. Distinguish inventory presence, live official coverage and calibrated sensor coverage. Test outside endpoints, an internal excursion and equivalent geometries with different vertex densities.

### 3. P1 — Guardian source tags still discard source-specific evidence and expiry

The shared serializer, background timeout, regional NWS iteration and stale-USGS retention are real improvements. However, `mobile/src/lib/monitor-context.ts:59` permits only event/headline on `alert`, and `monitor.tsx:474` drops the live NWS expiration. The serializer reads an optional `expires` at `guardian.ts:97`, so real foreground warnings arrive with `expiresAt=null`. Failed NWS refresh retains entries with no expiry at line 282. A warning written by the foreground can therefore outlive its official expiry during a partial outage.

`guardian.ts:125` merges several sources into one hazard using the first entry's reason, timestamp and source, the maximum severity, and one expiration. The stale-USGS branch at line 209 can reinsert a whole previously combined hazard. Source membership alone cannot represent independent clearing, severity and validity of ATX, USGS and NWS evidence. For example, retained sensor evidence can carry an old official-closure reason even when a fresh official response no longer reports that closure. These are source traces, not installed-device reproductions.

**Correction:** cache evidence per crossing **and per source**, including observed/fetched/expiry times and severity; expire and clear each independently, then derive the combined display. Test a cache produced by actual foreground status decoration through partial background failures and later successful source clearing.

### 4. P1 — Freshness freezes during an outage

`mobile/src/app/(tabs)/drive.tsx:66` ages live evidence against `liveFetchedAt` or `latestObsAt`, rather than advancing wall time. `mobile/src/screens/home/RoutePanels.tsx:904` uses the same reference for stale detection. Re-renders alone do not make those fixed timestamps advance. Drive's old-closure label at line 162 says “active closure verified live”; that needs an independently recent successful official check.

**Correction after reading the additional Round 3 context:** Drive excludes live route coordinates while in drill, and the provider exposes `routePlan: mode === 'live' ? routePlan : null` in its context value. Consequently, `RoutePanels.tsx:254` cannot receive the old live plan through that value while in drill. My earlier source-level claim that this branch still exposed the mixed-mode route card was incorrect and is withdrawn. This is a substantive source-level repair; transition behavior, return-to-live state and asynchronous route completion still need browser acceptance. The previous round's browser finding is not proof against this updated implementation.

**Correction:** use a ticking clock for live validity and separate source check time from the source's last status-change time. Verify the existing mode gate through the complete live → drill → car demo → live transition before accepting that journey.

### 5. P1 — “Physical crossing” and “distinct event” counts remain unreliable

`mobile/src/lib/danger.ts:112` strips waterway identity words including creek, branch, river and fork. The new same-road/same-creek guard therefore merges nearby **Bear Creek** and **Bear Branch** in the independent probe. Conservative anchor grouping and exact road matching improve the prior implementation, but do not justify the comment that distinct creeks never merge.

`danger.ts:205` now unions all member histories, fixing omission of secondary records. Its event key nevertheless includes `dist_km`, a property of the event-to-crossing relationship. One identical dated NOAA report associated with two crossings at 0.2 and 0.3 km becomes two distinct events in the executed probe. Date/type/summary fragments also cannot guarantee authoritative event identity.

**Correction:** use reviewed physical-site IDs and NOAA event IDs. Preserve distinct named waterways; present uncertain device clusters as possible groups, not exact physical counts. Do not merely remove distance and assume truncated narrative text is a stable event identifier.

### 6. P1 — Submission still contradicts the bundled geography and scientific provenance

The v4.2 package is substantially more honest about experimental performance and narrows the product to a commute audit. It still contains material errors:

- `FordCast_CAC_Submission.md:58` and line 103 call Henry Marx Lane an Onion Creek site. Bundled `mobile/assets/seed/crossings.geojson` identifies `tc-167` as **Henry Marx @ Barton Creek**, with `review_status=unverified_road_and_topology`. Lines 160–161 narrate an upstream Driftwood/Onion rise as evidence for Henry Marx. That is not a supported watershed explanation for the bundled record.
- Lines 58 and 86 assert completed NHDPlus stream snapping/linking. The displayed data's topology remains unverified; an architecture diagram is not proof of a verified upstream network. Cite generated snapping/topology evidence before presenting that implementation as complete.
- Lines 56 and 87 say **189 historical reports, 2004–2026**. The bundled history metadata says **727 events in area, January 1996–June 2026**. These could refer to different datasets or filters, but the package supplies no reconciliation. Do not interchange area totals, nearby report associations and distinct events.
- Four calibrated record IDs and a claimed two physical sites need a reviewed identity map. They must also be distinguished from LOSO proxy evaluation cases. A model metric is not a measured road-flood outcome.

**Correction:** build the submission's counts and examples from the actual exported data/provenance; replace the cross-watershed video example with a verified matching example. Keep proxy performance, road-validation gaps and comparator results explicit. Do not invent a personal story, user study or local endorsement.

### 7. P2 — Voice preference and global mute remain separate state

Drive now chooses the shared controller **or** fallback speech, eliminating the former duplicate call. `force` no longer bypasses the controller's mute guard. However, Drive sets `setVoiceMuted`, while `monitor.tsx:121` only calls `stopSpeaking` when voice alerts are disabled and does not synchronize the controller mute on preference changes. Re-enabling the preference elsewhere can leave the controller muted. Persisted preference loading also needs a defined synchronization contract.

**Correction:** one owner for voice enabled/muted state, with a test covering HUD mute → enable elsewhere → alert, plus stored-preference restoration. Actual audible quality still requires a device.

## Nine remediation groups

| Group | Current grade | Evidence / remaining gap |
|---|---|---|
| 1. Combined Drive hazards/order | PARTIAL | Combined-state tests pass; source-specific closure timestamp and first on-route blocking selection improved. Frozen age, broad nearby fallback and unverified route-ahead behavior remain. |
| 2. Epistemic honesty/counts/physics | PARTIAL | Submission now admits comparator parity and experimental limitations. Geography, history totals, topology claims and physical-site identity still need reconciliation. |
| 3. Guardian resilience | PARTIAL / WEB REGRESSION | Shared serializer, source arrays, timeout and regional warnings exist. Web export absent; foreground expiry lost; per-source evidence remains lossy. |
| 4. Timeout/latest request wins | SOURCE-VERIFIED IMPROVEMENT | Existing foreground generation/abort wiring retained; background now passes timeout signals. Not a fresh network-fault/device exercise. |
| 5. Physical grouping/history | STILL INCOMPLETE | All member histories now considered; both adversarial identity/count probes fail. |
| 6. Arrival contract | VERIFIED FIXED for legal window mapping | `[30,90]` now maps to a strip cell; existing round-2 regression tests cover all seven allowed model windows. Visual explanatory-bin clarity still needs browser review. |
| 7. Live/archive/datum/narrative/expiry | PARTIAL | Earlier explicit archive separation retained. No new visual acceptance; NWS expiry fails at foreground-to-cache boundary; truncated source narratives remain limited. |
| 8. Voice/no-way demo | PARTIAL | Duplicate speech and force/mute bypass repaired in source. Global mute synchronization and actual device/no-way interactions not accepted. |
| 9. Hierarchy/origin/health/comparator | SOURCE IMPROVEMENTS; UI UNVERIFIED | Trip card moved earlier, dedicated origin presets/search/reset, Valhalla label and nearest-gauge comparator added. Fresh small-screen Stop visibility, wrapping, console and interaction checks blocked. |

## Six required journeys

All six require fresh interaction before acceptance. Historical round-2 screenshots are evidence of that earlier build, not this one.

| Journey | Fresh result | What source review can establish |
|---|---|---|
| GPS-off first 15 seconds | BLOCKED | Existing fallback and entry controls; no fresh-storage/onboarding or first-viewport check. |
| Sunny-day demo at mobile and desktop sizes | BLOCKED | Trip panel reordered; no fresh Stop visibility, banner, map or no-way verification. |
| Commuter route / origin / disclosure | BLOCKED | Origin search/reset added; coverage warning exists but executed excursion probe fails. |
| Skeptic detail | BLOCKED | Earlier archive/datum work remains; history identity/count defect persists. |
| Hands-free Drive | BLOCKED | One speech branch and live-route exclusion in drill; stale-age and mute-state gaps remain. |
| Alerts / voice / Storms | BLOCKED | Comparator now implemented; playback, preview, stop, Spanish layout and device fidelity unverified. |

## Functionality, UI and TX-10 impact

**Functionality:** the new passing regressions address real earlier defects. The independent failures show that repairs were tested too narrowly. Prioritize platform contracts, source evidence and route coverage over adding more panels or numerical claims.

**UI:** hierarchy and origin controls look better in the source structure. No fresh visual score increase is justified. The practical acceptance target is still: understand the supported trip, identify the authoritative warning and its age, recognize unknown coverage, and stop a simulation immediately on a small screen.

**Impact:** keep the specific supported-area commuter use case. Do not equate 2,052 inventory records with TX-10 coverage or prove district benefit by an Austin-centered radius. The eastern-district gap remains. Verify one real in-district route/crossing against a named boundary plan and show what decision the app helps a resident make. Texas distinguishes the currently serving C2193 plan from the C2333 plan for the 2026 elections; the plan must be explicit. [Texas Legislative Council](https://redistricting.capitol.texas.gov/Current-districts).

DriveTexas now provides a mobile app with roadway conditions, floods, cameras and routing. FordCast's differentiator must be demonstrated trip-specific crossing explanation and transparent uncertainty, rather than claiming official tools lack a usable app. A narrowly useful companion can still make a good CAC entry. No observed reduction in dangerous decisions, user-comprehension study or district-wide operational reach was established by this review. [TxDOT announcement](https://www.txdot.gov/about/newsroom/statewide/download-the-new-drivetexas-app.html).

## Score and finish gate

No new composite judge score is assigned: fresh UI inspection is blocked, so comparing a source-only round to the prior visual round would imply evidence we do not have. The prior **6.0/10** remains a historical judgment, not current acceptance. Product direction is stronger; release readiness remains **NO**.

Before sign-off:

- [ ] Repair the web module contract and exercise a live feed refresh in the web build.
- [ ] Make all four independent counterexamples pass through meaningful product regression tests.
- [ ] Preserve and expire source-specific Guardian evidence through partial failures and recoveries.
- [ ] Advance live staleness with time; browser-verify the implemented route-plan mode gate; unify voice mute.
- [ ] Reconcile submission geography, history counts/period, topology and physical-site claims with exported data.
- [ ] Re-run all six journeys at both viewport sizes, inspect console and Stop controls, and separately validate installed-device claims.
- [ ] Verify a TX-10 example and measure comprehension with actual target users before claiming demonstrated community benefit.

No product source, release configuration or submission was changed by this review. Audit files were added only under `docs/results`; the ignored executable probe copy was removed.

## Additional Round 3 mandate received after the initial report

The user's additional attachment is preserved verbatim in [Round 3 judge context](C:/2025AppChallenge/docs/prompts/cac-round3-judge-context-2026-10-21.md). Its seven areas supplement the nine-group matrix above; claims in that attachment remain assertions to verify, not evidence of successful behavior. The supplied file ends at `1. **First 15 seconds` in Section B. Sections C–E and the remainder of B were not present. The earlier six-journey requirements remain applicable; no missing instructions have been invented.

The additional mandate specifically requires the following acceptance work beyond the four executed probes:

- Foreground-produced Guardian cache → background partial/total failure → expiry/recovery, using the real cache path rather than an ideal hand-authored cache.
- Austin routes to College Station and the Brenham/Waller area, plus internal excursions. The new excursion probe already fails; a simple outside endpoint fixture alone is insufficient.
- Grouping against actual bundled study and regional records, including remaining hardware labels, distinct waterways and co-located arms. The executed counterexample is synthetic and does not establish which real records are misgrouped.
- Speech engine call counts, mute persistence across tabs and preferences, and continuous route ordering versus nearby selection.
- Live planned route → Storm Drill → 50-second car demo → Live, including pending asynchronous work and resumed navigation state.
- Hard-reloaded browser journeys at both 390×844 and 1366×860, with console inspection. These remain blocked by browser settings, not passed.

### Assessment of the existing regression tests

`mobile/src/__tests__/round2-probes.test.ts` imports real helpers and components; it is not entirely a mock of the implementation. The arrival-window checks and closure timestamp assertions test meaningful contracts. However, its passing 75-test suite does not cover the wider acceptance claims:

- The Guardian test asserts `source` and `sources` on a constructed status only. It never performs foreground decoration, cache persistence, a background refresh, a failure or expiration. It therefore cannot prove cache resilience.
- The mute test sets the mute flag, calls `speak`, then resets the flag, but asserts no speech/audio backend call counts. It can pass even if muted playback occurs. It also does not exercise tab or stored-preference synchronization.
- The grouping examples are synthetic Creek A/Creek B and two supplied device fixtures, not an audit of the actual bundled inventory. The new Bear Creek/Bear Branch counterexample demonstrates the boundary they miss.
- The history test supplies two different events. It confirms union across members, but cannot detect duplicate counting of one event at different distances.
- The coverage test checks an outside endpoint with only two coordinates. It does not challenge route sampling density or an internal unsupported excursion.
- No full provider/navigation transition is exercised in that file. Its test count must not be cited as proof of the six browser journeys.

These are coverage gaps, not evidence that the team deliberately bypassed the requirements. No additional test execution is claimed for this context addendum. Product source remains unchanged.
