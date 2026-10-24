# FordCast — Round 6 iPhone deep-dive audit

Audit date: October 22, 2026. Workspace: `C:\2025AppChallenge`.

This is an independent review, not an official CAC judging decision. The supplied mandate's assertions about district competitiveness and panel membership are not established facts. Its four pillars are used as the requested review framework, not an official weighted rubric. No product code was changed during this round. Suggested patches below are review proposals and have not been applied or validated as fixes.

## 1. Executive TX-10 Verdict & 4-Pillar Scorecard (0–10 per pillar)

**Credible technical project; not yet ready to claim reliable native iPhone execution.** The strongest idea is showing the evidence and missing information for a particular trip. The weakest pitch is implying that the upstream experiment predicts road flooding: the documented experiment detected four of twelve proxy cases, missed eight, and did not outperform its nearest-gauge baseline. The written submission now states that limitation clearly. Keep it that way.

| Requested pillar | Score | Basis and deductions from 10 |
|---|---:|---|
| Idea, originality and TX-10 impact | **7.0** | Useful route-specific combination of crossing records, official closures, gauge evidence and missing sensors. Deduct 1.0 for unmeasured user/community outcomes, 1.0 for limited Austin-centered coverage, and 1.0 because the core novelty is workflow/integration rather than a demonstrated new predictive method. |
| Technical execution | **7.0** | Real source adapters, corridor matching, hardware grouping, routing, offline replay and comparison against a baseline. Deduct 1.25 for test/live route isolation defects, 0.75 for native audio defects, and 1.0 for missing physical-iPhone acceptance evidence across keyboard, sheets and lifecycle. |
| UI/UX and plain language | **6.5** | Main trip workflow is understandable, pledge is scrollable, and replay has visible drill labels. Deduct 1.25 for incomplete native interaction validation, 0.75 for the dense and partly untranslated Science Lab, 0.75 for compact Drive presentation concerns, and 0.75 for undersized secondary controls and avoidable engineering terminology. |
| Demo and written submission | **7.0 provisional** | The submission separates built features from the experiment and reports unfavorable results. Deduct 1.0 because a finished recorded video was not reviewed, 1.0 because measured local benefit and student explain-back evidence were not established in this run, and 1.0 because a polished browser recording would not demonstrate the unresolved native behavior. |

**Impact assessment:** this is a Central Texas pilot by a TX-10 student, not district-wide infrastructure. The present 80 km Austin-area inventory boundary is not a validated completeness boundary. Being within the circle does not establish that every road crossing is inventoried. Neither 2,052 inventory records nor 727 regional historical events is a count of residents helped. The best demonstration is one supported commute, its grouped crossings, the sources currently reporting, and what remains unknown. Then show the explicit limitation on a route toward College Station. Do not describe the latter as a service benefit already delivered there.

No district-boundary overlay or verified constituent adoption measurement was produced during this audit. Do not infer that every Austin demonstration road is in TX-10, or reuse the mandate's county/city list as verified district geography. The district office page could not be fetched during verification. For entry eligibility, use the official registration process and the applicable residence/school district; this report does not determine eligibility.

The [2026 CAC rules](https://www.congressionalappchallenge.us/wp-content/uploads/2026/05/2026-CAC-Rules.pdf) permit disclosed AI assistance while requiring significant student contribution and understanding. The student's ability to explain the implementation and the limits of its experiment is essential evidence; autonomous audit work cannot supply that evidence. Those rules also specify a demonstration video of at most three minutes. A clear 2:15–2:45 video fits that constraint.

## 2. Executed Verification & New Adversarial iPhone Probes

All evidence below is in `C:\2025AppChallenge\docs\results\cac-round6-evidence\`.

| Executed check | Result | Evidence |
|---|---|---|
| Mobile `npx tsc --noEmit` | Pass; no diagnostics | `typecheck.txt` |
| Mobile `npx expo lint` | Pass; no diagnostics | `lint.txt` |
| Existing mobile Jest suite | **101 passed, 9 suites** | `mobile-tests.txt` |
| Extension `node extension/test.mjs` | **19 passed** | `extension-tests.txt` |
| Backend pytest | **59 passed**, one Starlette/httpx deprecation warning | `backend-tests.txt` |
| New actual-provider/RoutePlanner probes | **1 passed, 2 failed** | `provider-probes.test.tsx`, `provider-probe-results.txt` |
| New iOS-platform voice probes | **2 failed** | `ios-voice-probes.test.ts`, `ios-voice-probe-results.txt` |

The five new probes are additional to the existing suite. Overall baseline success does not supersede their four failing assertions. Probe copies were run from ignored `mobile/.local/__tests__/` paths and removed afterward; the preserved audit sources are outside normal Jest discovery. Native hardware dependencies, location/notifications and routing service responses were controlled in these probes. The route race, provider state, actual RoutePlanner rendering and voice module logic were exercised, not a reimplementation of them.

New outcomes:

1. **Pass:** two rapid route requests; the first signal is aborted, and its late response cannot overwrite the second destination.
2. **Fail:** simulate a closure, then explicitly plan another trip; `testHazard` remains populated.
3. **Fail:** return a successful detour away from the synthetic hazard; the actual RoutePlanner exposes the Google Maps handoff while `testHazard` remains populated. The renderer returns three matching component/host nodes for that control; that is not evidence of three visible buttons.
4. **Fail:** on the mocked iOS platform, an explicit voice preview with `allowWhenMuted: true` makes zero native speech calls when voice alerts are muted.
5. **Fail:** with audio setup deliberately unresolved, an unmuted speech request calls native speech immediately. This proves ordering, not audible output or a physical silent-switch result.

Browser execution used localhost:8081 at **375×667 and 390×844**, with English and Spanish exercised across the session. These are CSS viewports, not native iPhones. They do not recreate the iOS keyboard, Dynamic Type, touch arbitration, native tab insets, Universal Links, OS background suspension or the Ring/Silent switch.

| Browser exercise | Observed result |
|---|---|
| Compact English Map | Primary trip/demo controls available; `se-map-en.png`. |
| Compact Spanish pledge review | All three acknowledgements could be selected and Continue enabled; `se-pledge-es.png`. Tested the Settings review flow, not a clean-storage first installation. |
| Compact Spanish moving-car demo | Archived simulation text and Stop control visible; `se-demo-es.png`. Header wraps heavily. |
| Compact Spanish active Drive | Repeat, mute and Stop available; drill badge exists in DOM. At the observed document scroll position the top was clipped; `se-drive-es.png`. Document height 705 vs viewport 667, scrollY 38. This is browser overflow evidence, not proof of a native tab-bar overlap. |
| Standard Spanish Storms/Lab | Navigation works; Lab Back returns to Storms. Document scroll width 390 at viewport width 390; no page-wide horizontal overflow. Internal labels truncate and numerous English controls remain; `pro-storms-es.png`, `pro-lab-es.png`. |
| Alerts → crossing detail → Show on map | Returns to Map in browser; source uses `router.navigate('/')`, not the hypothesized `router.back()`. Native formSheet dismissal remains untested. |
| Standard English real route | Downtown → Onion Creek Park resolves and displays crossing evidence and Google handoff. |
| Standard English simulated closure | Test warning appears. In this real-service run the route remained blocked and Google handoff was hidden; `pro-route-test-en.png`. The completed-detour failure above was established with the controlled provider probe. |
| Alerts radius controls | Actual choices are **1, 3, 5 and 10 mi**, not the mandate's example choices. Each responded; watched count changed from 0 at smaller radii to 4 at 10 mi. Restored default 3 mi. |
| Console | No captured warning/error entries in the final 50-entry query; `browser-console.json`. This is not a guarantee about all browser/network activity. |

At completion the synthetic route was removed, Drive stopped, English and Live mode restored, and viewport override reset. OS permission prompts and external Google Maps launch were not accepted/executed. Every settings control, saved-empty state, airplane-mode transition and touch timeline scrub was not exhaustively executed; source inspection is not a substitute for those checks.

## 3. Ranked iPhone & CAC Bugs Found (`P0` Must-Fix vs. `P1` High-Polish)

Here P0 means a must-fix before presenting this as a dependable trip utility. It does not imply a reproduced production incident. Paths and line numbers refer to the audited workspace snapshot. All snippets are proposed edits; rerun the suites and probes after applying them.

### P0 — A synthetic closure can escape its test trip and expose real navigation

**Paths:** `C:\2025AppChallenge\mobile\src\lib\monitor.tsx:640` (new trip), `:675` (injection), `:832` (test alert marked false); `C:\2025AppChallenge\mobile\src\lib\monitor-context.ts:163`; `C:\2025AppChallenge\mobile\src\screens\home\RoutePanels.tsx:839` (Google), `:846` (shared navigation URL), `:908` (no end-test action).

**Reproduce on iPhone:** in Live mode plan a trip, expand reroute testing and inject a closure. Once a detour avoids that point, the control is governed only by hazards remaining on the new route and can expose Google Maps. Plan a different destination: the old fake hazard remains. The test tools offer removing the entire route as the reset; they cannot end just the test. The provider probes reproduce both defects independently of service reliability.

Injection picks a polyline vertex roughly halfway ahead of the nearest route index; it does not select an inventoried crossing. It therefore also works on a route with no inventoried crossings. That is acceptable as a labeled geometry test, but it must not be described as an observed flooded crossing. An empty geometry would also dereference an undefined point; add a guard. The background Guardian cache is built from real crossing statuses, not the augmented test-hazard array: this audit does **not** claim that the fake point contaminates that cache.

**Proposed drop-in changes:** make explicit user trip planning exclude tests synchronously, add a reset action, and gate all navigation exports while a test is active. Merely calling `setTestHazard(null)` immediately before the existing `computeRoute` would still read the old hazard ref.

In `monitor.tsx`, change the `computeRoute` signature and its routing call:

```tsx
async (origin: LatLon, dest: Place, routeHazards?: RouteHazard[]) => {
  // Preserve the existing generation, abort, timeout and try/finally logic.
  // Replace only the planSafeRoute invocation inside that logic:
  const plan = await planSafeRoute(
    origin, dest, dest.name, routeHazards ?? hazardsRef.current, ctrl.signal,
  );
```

Replace `planRoute` and add the reset immediately afterward:

```tsx
const planRoute = useCallback(async (dest: Place, originOverride?: LatLon) => {
  const realHazards = hazardsRef.current.filter(h => !h.id.startsWith('test-'));
  hazardsRef.current = realHazards;
  setTestHazard(null);
  await computeRoute(originOverride ?? location, dest, realHazards);
}, [computeRoute, location]);

const endRouteTest = useCallback(async () => {
  const realHazards = hazardsRef.current.filter(h => !h.id.startsWith('test-'));
  hazardsRef.current = realHazards;
  setTestHazard(null);
  if (!routePlan) return;
  await computeRoute(routePlan.origin, {
    ...routePlan.destination, name: routePlan.destinationName, detail: '',
  }, realHazards);
}, [computeRoute, routePlan]);
```

Add `endRouteTest: () => Promise<void>` to `MonitorValue` and `endRouteTest` to the provider value. At the beginning of injection after obtaining `coords`, add `if (coords.length < 2) return;`.

In RoutePlanner's route-card component define `const navigationAllowed = m.mode === 'live' && !m.testHazard;`. Change the Google condition to `navigationAllowed && blocked.length === 0`. Wrap the **entire Share route summary ActionButton** in `{navigationAllowed ? (...) : null}` as well; otherwise the Google URL still escapes through sharing. In the test-active branch at lines 911–915 replace the text-only body with:

```tsx
<View style={{ gap: 8 }}>
  <AppText>{t('route.simulate_note')}</AppText>
  <ActionButton
    compact kind="secondary" icon="close"
    label={es ? 'Finalizar prueba y revisar ruta' : 'End test and recheck route'}
    onPress={() => void m.endRouteTest()}
  />
</View>
```

For any allowed Google launch, handle rejection instead of leaving an unhandled promise. Add `Alert` to the React Native import and replace its handler with:

```tsx
onPress={() => {
  void Linking.openURL(googleMapsUrl(plan)).catch(() => Alert.alert(
    es ? 'No se pudo abrir Google Maps' : 'Could not open Google Maps',
    es ? 'Inténtelo de nuevo antes de salir.' : 'Try again before leaving.',
  ));
}}
```

At `monitor.tsx:832`, preserve the test identity in the generated alert:

```tsx
const isTest = first.id.startsWith('test-');
const alertTitle = isTest ? `TEST · ${title}` : title;
pushAlert({
  crossingId: first.id, state: 'avoid', title: alertTitle, body,
  drill: false, test: isTest,
}, `${alertTitle}. ${body}`);
```

The URL builder itself uses a Google directions URL with `api=1`, driving mode, explicit coordinates and at most three suggested waypoints (`routing.ts:297`). A valid format does not establish which iOS app opens or whether Google follows the same roads. Preserve the existing waypoint limitation notice. **Copy contract:** the proposed user strings make no assurance about road passability or predictive accuracy; test messages retain an explicit TEST label.

### P1 — Native Test Voice silently ignores its explicit mute override

**Path:** `C:\2025AppChallenge\mobile\src\lib\voice.ts:210`, `:266`, `:339`.

**Reproduce on iPhone:** turn Voice warnings off in Alerts, then press Test voice. The public `speak` guard permits `allowWhenMuted`, but `fallbackSpeechSynthesis` immediately rejects every muted request. The iOS-platform probe makes zero `Speech.speak` calls.

**Proposed drop-in fix:** extend the fallback signature and guard:

```ts
function fallbackSpeechSynthesis(
  cleaned: string, language: 'en' | 'es', sessionId: number, allowWhenMuted = false,
): void {
  if (sessionId !== speechSessionId || (voiceMuted && !allowWhenMuted)) return;
  // Keep the rest of the existing function.
```

Pass `!!opts?.allowWhenMuted` as argument four at **all four** fallback call sites in `speak`. At both HTML audio rejection guards replace `!voiceMuted` with `(!voiceMuted || !!opts?.allowWhenMuted)`. Do not temporarily unmute global alerts to implement a preview. **Copy contract:** no new status wording is introduced. Automatic requests remain muted; cancellation tokens still suppress superseded playback.

### P1 — Native speech starts before its audio configuration finishes

**Path:** `C:\2025AppChallenge\mobile\src\lib\voice.ts:92`, `:338`.

**Reproduce on iPhone:** cold-start the app and immediately request voice; make audio-session initialization slow. The deterministic probe holds initialization pending and observes `Speech.speak` already invoked. Whether that causes audible failure on a particular phone remains unverified.

**Proposed drop-in fix:** serialize the native call and retain the session check. Replace the final two lines of `speak` with:

```ts
void prepareAudio().then(() => {
  fallbackSpeechSynthesis(cleaned, language, mySession, !!opts?.allowWhenMuted);
});
```

Also deduplicate concurrent initialization. Add `let audioPreparation: Promise<void> | null = null;` next to `audioReady` and replace `prepareAudio`:

```ts
export function prepareAudio(): Promise<void> {
  if (audioReady || Platform.OS === 'web') return Promise.resolve();
  if (audioPreparation) return audioPreparation;
  audioPreparation = (async () => {
    try {
      const { setAudioModeAsync } = await import('expo-audio');
      await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
      audioReady = true;
    } finally {
      audioPreparation = null;
    }
  })();
  return audioPreparation;
}
```

Because that version exposes setup errors, add `.catch(() => { if (mySession === speechSessionId) notifySpeaking(false); })` to the native playback chain and catches to the existing startup `void prepareAudio()` calls, or surface a localized preparation failure through the existing voice-error mechanism. Do not silently mark audio ready on failure. After serialization, update the preview probe to resolve/await initialization before asserting playback; add an assertion that muting or stopping while setup is pending prevents an automatic utterance.

**Silent-switch limit:** [Expo Speech SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/sdk/speech/) explicitly warns that physical iOS devices in silent mode may produce no speech. The [audio session documentation](https://docs.expo.dev/versions/v57.0.0/sdk/audio/) exposes `playsInSilentMode`; setting that property for expo-audio is not evidence that this application's expo-speech path overrides the switch. Test Ring/Silent, media volume, headphones and interruptions on a physical device before claiming the fix handles them. Native speech currently uses system TTS; bundled HTML neural clips are web-only. **Copy contract:** no stronger voice reliability claim is warranted by these patches.

### P1 — Passenger override is below the requested 44-point touch target

**Path:** `C:\2025AppChallenge\mobile\src\components\DriverHudView.tsx:304`–`:321`.

**Reproduce on iPhone:** enter Drive, provide a speed above 6.7 m/s long enough for its lockout, and try the passenger override. The source uses 11-point text and five points of vertical padding without a minimum target size. This is a source-confirmed sizing gap; a physical speed/lockout test was not executed here. Repeat, mute and Stop remain available; browsing previous/next crossings is replaced by the lockout message and passenger control. This is a prototype behavior, not proof of compliance with a driving-distraction standard.

**Drop-in style additions on that Pressable:**

```tsx
minWidth: 44,
minHeight: 44,
alignItems: 'center',
justifyContent: 'center',
```

Allow the containing lockout row to wrap with `flexWrap: 'wrap'` so the larger button does not force horizontal clipping in Spanish. **Copy contract:** existing localized passenger wording is unchanged. Measure the full compact HUD after increasing this target.

### P1 — Spanish pledge/Lab still expose English and engineering controls

**Paths:** `C:\2025AppChallenge\mobile\src\features\onboarding\Pledge.tsx:128`; `C:\2025AppChallenge\mobile\src\screens\CockpitScreen.tsx:329`, `:373`, `:1337`–`:1346`; `C:\2025AppChallenge\mobile\src\features\map\MapSurface.web.tsx:132`, `:150`, `:463`.

**Reproduce:** switch to Español, review the pledge, then open Storms → Ver la ciencia. The pledge retains SAFETY RULE. Lab exposes Peek/Half/Forensic, Speak crossing state, Inspect and Tier C Unmonitored; several raw hardware names and long sample controls survive. The screenshot demonstrates that a page can fit the viewport while its internal labels are still clipped. This is unfinished localization and product hierarchy, not a page-wide SVG overflow finding.

**Drop-in examples:** replace the pledge label with:

```tsx
{`0${i + 1} · ${language === 'es' ? 'REGLA DE PRECAUCIÓN' : 'SAFETY RULE'}`}
```

Replace the Cockpit snap list in place with:

```tsx
[
  { id: 'collapsed', label: language === 'es' ? 'Resumen' : 'Summary' },
  { id: 'half', label: language === 'es' ? 'Detalles' : 'Details' },
  { id: 'full', label: language === 'es' ? 'Evidencia' : 'Evidence' },
  { id: 'directory', label: language === 'es' ? 'Todos los 141' : 'All 141' },
] as const
```

For components that do not currently destructure it, obtain `language` from their existing `usePreferences()` call. Change the two Cockpit accessibility labels to `language === 'es' ? 'Leer estado del cruce' : 'Speak crossing state'` and ``language === 'es' ? `Abrir detalle de ${p.name}` : `Open full detail page for ${p.name}```. Localize their visible Speak/Saved/Save labels too; changing accessibility text alone does not translate the screen. For MapSurface's compact/full control, use one shared localized string in both visible text and `accessibilityLabel`, e.g. ```${language === 'es' ? 'Cruces sin sensor' : 'Crossings without sensors'} (${tierCFeatures.length}) · ${tierCMode === 'compact' ? (language === 'es' ? 'Resumen' : 'Compact') : (language === 'es' ? 'Detalle' : 'Full')}```. Replace Inspect with a localized action. These examples cover the cited labels, not the entire Lab translation inventory. **Copy contract:** retain explicit unknown/research limitations and do not replace technical clutter with reassuring road-status claims.

### Native acceptance gates — unresolved, not claimed as reproduced bugs

* **Keyboard:** `HomeScreen.tsx:1192` has a sheet ScrollView without keyboard tap persistence or automatic keyboard insets. The search inputs at `HomeScreen.tsx:618` and `RoutePanels.tsx:184/:293` do not expand the sheet on focus. No keyboard-avoidance wrapper was found on these paths. Add `keyboardShouldPersistTaps="handled"` and `keyboardDismissMode="interactive"` to that ScrollView as an immediate improvement; that alone does not establish keyboard visibility. The final fix must measure the native available container, expand the sheet on focus, and account for the keyboard intersection once. Test selecting a result while the keyboard is open on SE, with 150% text. Do not hardcode 336 pixels or blindly add both avoidance padding and automatic keyboard insets.
* **Safe areas and sheet sizes:** `HomeScreen.tsx:699/:1140`, NativeTabs in `(tabs)/_layout.tsx`, and the active Drive root `(tabs)/drive.tsx:315` need native layout measurement. [Expo's native-tab guidance](https://docs.expo.dev/router/advanced/native-tabs/) describes automatic scroll-content inset behavior; it does not justify assuming that every absolute overlay is above the native bar. Measure root frame, bar, home indicator and sheet first. Adding a guessed 49-point bar height can create a second inset bug. The browser's active Drive overflow cannot resolve this question.
* **Sheet tap versus pan:** `HomeScreen.tsx:1157` always claims the responder on the header containing its Pressable. Test stationary tap, short movement and deliberate drag on iOS. Prefer a movement threshold before claiming the pan and keep a 44-point tap target. A mouse click in the browser does not prove native responder arbitration.
* **Tab blur:** `useTripDemo.ts:194` stops on AppState background but has no focus lifecycle. Native tabs may retain Map while another tab is selected. Define whether leaving Map stops or pauses the car, then verify Map → Drive → Map and Map → Storms → Map. A safe implementation uses a stable focus-effect cleanup reading the latest `trip.stop` through a ref; do not depend directly on the changing monitor object and accidentally stop the demo on every provider update. Drive already cancels speech on blur at `drive.tsx:229`, but that is not a full HUD-state reset.
* **FormSheet:** detail actions explicitly navigate to `/` at `crossing/[id].tsx:66/:75/:186/:195`. Browser navigation passed. Native 0.62/full detent scrolling, dismissal and reopening from Alerts need an iOS run. Do not patch a nonexistent `router.back()` bug.
* **Timeline and charts:** no page-wide Lab overflow at 390 pixels, and Lab has a working browser Back action. Finger scrubbing versus vertical scrolling, chart-axis legibility at larger text, and native back behavior remain unverified.

## 4. Screen-by-Screen iPhone UX & Anti-"Vibecode" Teardown

| Surface | Honest assessment and next action |
|---|---|
| Pledge | Scrollable through shared `Page` (`UI.tsx:170`), with 56-point content bottom padding. Compact Spanish completion works. Keep the three concrete rules; translate the remaining eyebrow and run Dynamic Type. Do not report an unreachable Continue button. |
| Home: peek/half/full | Strong primary Check my trip/Storm reroute demo actions. The sheet uses window-height fractions rather than measured available native content. Compact Spanish demo header wraps heavily; Stop remains visible in the browser. Keyboard, bar geometry and grabber gestures are the acceptance gates. Avoid turning the header into another technical dashboard. |
| Route planner/audit | Most defensible product value. Real route resolved, sources and grouped crossing evidence displayed, and rapid-request sequencing passed. Synthetic test state must be isolated before external navigation. Share text is also partly hardcoded English and deserves a localization pass. An empty list of reported hazards must never imply a passability guarantee. |
| Crossing detail | Useful source/history drill-down. Alerts → Show on map works in browser, and source navigation targets Map explicitly. Native sheet detents and action dismissal are pending. Keep hardware identifiers in optional provenance, not the leading road name. |
| Moving-car demo | Good explanation of a hypothetical decision using archived data; not evidence of a successful live road-flood prediction. Compact archived label and Stop are present. Reduce header wrapping without dropping the archived identity. Define tab-blur behavior and test background/foreground on device. |
| Drive HUD | Large Repeat/Mute/Stop controls and an explicit DRILL/SIMULACRO badge are positives. Compact web overflow is visible; no claim of native fit is supported yet. Enlarge passenger target, preserve drill identity in the visible area, and validate audio before filming. Do not market its numeric lag window as arrival of water at the road. |
| Storms/Science Lab | The baseline comparison is valuable intellectual honesty. Lab is the least finished product surface: dense geographic diagram, tiny labels, sample/debug controls, English fragments and raw device names. Keep it optional judge evidence. A focused comparison and two readable charts would communicate more than a crowded cockpit. |
| Alerts/Settings | Main Spanish Alerts controls are localized; saved crossing names are cleaned in the main list. All actual radius choices work. Permission and background capability text must match the build. Browser notification permission, native background registration and fresh empty-saved onboarding were not exhaustively tested. Avoid describing a settings switch as proof that the OS capability works. |

The calm main trip workflow is stronger than the scientific cockpit as a first impression. The UI should answer, in order: which crossings are near this trip, what current evidence says, how current that evidence is, and what is missing. Experimental lag research belongs behind that everyday task.

## 5. Top 5 "Win TX-10 1st Place" Finishing Touches

These are small proposed tasks, each roughly under 15 minutes of implementation or preparation. Device validation can take longer. They can improve the entry; no task or score predicts an award.

1. **Keep tests from launching navigation.** Add the `testHazard` gate to Google and Share immediately. This is a small protective change while the complete test lifecycle repair is reviewed.
2. **Translate the visible rough edges.** Fix the pledge eyebrow and the four Lab snap labels; replace Peek/Half/Forensic with Summary/Details/Evidence. Check the same view in Spanish before recording.
3. **Make the passenger action a real 44-point target.** Add minimum dimensions and row wrapping; review the compact HUD screenshot for clipping afterward.
4. **Prepare a 15-second trip-evidence opening.** Show the trip and its two grouped crossing areas, point to reporting sources and missing information, then briefly show an out-of-coverage route. Say “Austin-area pilot” rather than suggesting district-wide adoption. Use stable labeled replay footage if demonstrating a historical decision.
5. **Prepare one evidence card for the closing frame.** Show “4/12 proxy detections; 8 misses; nearest-gauge baseline matched; road-flood prediction unvalidated,” beside the trip-audit benefit and the student's specific implementation contribution. Use actual work and actual tester results only. Do not imply the 65-minute reference-gauge median is road-arrival warning time.

The next engineering pass should implement and rerun the failing probe cases before further decorative polish. A physical-iPhone recording session must include the keyboard/result tap, native sheet dismissal, tab blur/background transitions and audible voice tests. Until those checks are executed, the accurate status is **browser-reviewed prototype with identified native risks**, not iPhone-certified or fully finalized.
