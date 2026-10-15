# PART D (continued) — §30–§37

> Same conventions as §25–§29: code is a correct skeleton; "VERIFY …" = **VERIFY BEFORE USE** (check the installed package's types or the device, log it in `docs/decisions/verifications.md`, use the stated fallback if it fails).

## §30. Location, geofencing, Drive Mode & voice

### 30.1 Permission flow (contextual, progressive; copy in §3.9/§13.3)

| Step | Trigger (never at launch) | Call | Denied → |
|---|---|---|---|
| 0 | Onboarding | none (no OS prompt) | — |
| 1 When-In-Use [MVP F110] | `permission/location` primer (`permissions.location.body`, §3.9) right before the first "center on me", Check My Drive, or Drive Mode — **never** on the first Map Home render | `Location.requestForegroundPermissionsAsync()` | Map centers on Austin (30.2672, −97.7431); AreaStatusCard `no-location` (`area.location_off`); lockout can't run (30.6) |
| 2 Notifications [MVP F65] | after "Notify me" on a crossing (saved crossing, MVP F46), saving a place/route [Stretch F51], or "Alert me" | §31.2 (channels first) | Alerts `CapabilityBanner notificationsOff` (`capability.notificationsOff`) |
| 3 Always [Stretch F70] | Drive tab toggle "Alert me while I use other apps" → `permission/background` primer (`permissions.background.body`, §3.9) | `Location.requestBackgroundPermissionsAsync()` (foreground must already be granted; Android 11+ opens system Settings — the primer adds `permissions.background.step_android` "On the next screen, tap **Allow all the time**."; iOS `permissions.background.step_ios` "Choose **Change to Always Allow**.") | Everything works in the foreground; Settings row `settings.drive.background_off` "Background alerts: off. Tap to enable." → `Linking.openSettings()` |
| 4 Motion [Stretch F62] | Settings "Auto-suggest Drive Mode" | `Location.requestMotionActivityPermissionsAsync()` (verified in expo-location 57 source; Android `ACTIVITY_RECOGNITION`, iOS Motion & Fitness) | speed-only detection |

- **Approximate location [Stretch F110b]:** Android exposes `android.accuracy: 'coarse'` in the permission response; iOS reduced accuracy exposure is **unverified** — VERIFY BEFORE USE in `Location.types.d.ts`; fallback: if `coords.accuracy > 1000` m for 3 consecutive fixes, show `CapabilityBanner kind="preciseOff"` with `permissions.precise_needed` "Precise location is needed for crossing alerts." and [Go to Settings] → `Linking.openSettings()` (B §13.3). The app keeps working with approximate behavior.
- Re-check permissions on every `AppState` → active (users change them in Settings).
- Every string in this table is a §3.7/§35.7 key; the primers never invent copy.

### 30.2 Foreground location (MVP)

```ts
// mobile/src/features/drive/location-source.ts — one subscription shared by Map Home, lockout and Drive Mode
export type Fix = { lng: number; lat: number; speed: number | null; heading: number | null; accuracy: number | null; t: number };
export function startForegroundWatch(mode: 'browse' | 'drive', onFix: (f: Fix) => void) {
  return Location.watchPositionAsync(
    mode === 'drive'
      ? { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 10 }
      : { accuracy: Location.Accuracy.Balanced, timeInterval: 2000, distanceInterval: 5 },
    (l) => onFix({ lng: l.coords.longitude, lat: l.coords.latitude, t: l.timestamp, accuracy: l.coords.accuracy ?? null,
                   heading: l.coords.heading ?? null,
                   speed: l.coords.speed != null && l.coords.speed >= 0 ? l.coords.speed : null }),   // m/s; null/negative = invalid
  );
}
// If speed is null, derive it from consecutive fixes (distance/Δt) only when both accuracies are < 50 m.
```
- Runs only while the app is foregrounded **and** a screen needs it (Map Home visible, any text field focused, Drive Mode). Stop it on background. Fixes live in memory (`drive-store.lastFix`) and are never written to disk or sent anywhere.
- `LocationSource` is an interface with `RealLocationSource` and `ReplayDriveSource` (30.7 "Replay drive", F128); Drive Mode never knows which one it has.

### 30.3 Geofence task + rotation [Stretch F70; dev build only]

```ts
// mobile/src/tasks/geofence.ts — imported by index.ts BEFORE expo-router/entry
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { openTaskDb, getMeta, displayRiskFromCache, alertedWithin, logAlert } from '@/features/offline/cache';
import { rerankGeofences, RERANK_ID } from '@/features/alerts/geofence-rotation';
import { buildCrossingAlert, channelFor } from '@/features/alerts/notify';
export const GEOFENCE_TASK = 'fordcast.geofence';

TaskManager.defineTask<{ eventType: Location.GeofencingEventType; region: Location.LocationRegion }>(GEOFENCE_TASK,
  async ({ data, error }) => {
    if (error || !data) return;
    const { eventType, region } = data;
    const db = await openTaskDb();
    if (region.identifier === RERANK_ID) {
      if (eventType === Location.GeofencingEventType.Exit) await rerankGeofences(db, 'rerank-exit');
      return;
    }
    if (eventType !== Location.GeofencingEventType.Enter) return;
    if (Date.now() - Number(await getMeta(db, 'geofencesRegisteredAt') ?? 0) < 10_000) return;   // iOS initial-state burst
    const d = await displayRiskFromCache(db, region.identifier!, Date.now());     // same 20-min rule as the UI (§28.6)
    const alertable = d.state === 'WATCH' || d.state === 'AVOID' || d.state === 'CLOSED'
      || (d.state === 'UNKNOWN' && (d.lastKnown?.state === 'AVOID' || d.lastKnown?.state === 'CLOSED'));
    if (!alertable || (await alertedWithin(db, d.id, 30 * 60_000))) return;      // de-dup 30 min per crossing
    await Notifications.scheduleNotificationAsync({
      identifier: `crossing-${d.id}`,                                             // replaces an older local alert
      content: await buildCrossingAlert(db, d, 'geofence'),                       // localized, ranges, "as of", data.url
      trigger: Platform.OS === 'android' ? { channelId: channelFor(d, 'geofence') } : null,   // §31.3 (B §15.1)
    });
    await logAlert(db, d, 'geofence');
  });
```

**Rotation (`features/alerts/geofence-rotation.ts`)** — runs on app foreground, snapshot change, re-rank-fence exit, Drive Mode fixes (≤ 1/min), and background refresh:
1. Candidates = crossings whose display state is WATCH/AVOID/CLOSED, **or** UNKNOWN with last-known AVOID/CLOSED, within 25 km of the current position (`Location.getLastKnownPositionAsync()` in tasks; VERIFY availability in background).
2. Score = `{CLOSED:4, AVOID:3, WATCH:2, UNKNOWN-lastknown:3}[state] / (distanceKm + 0.5)`; ×1.5 if on a saved route/near a saved place; ×1.3 if within ±60° of the last heading.
3. Capacity: **iOS 19** crossings + 1 re-rank fence (iOS limit 20). **Android: the OS limit is 100; FordCast's default cap is 60 for battery**, configurable up to 100 with the constant `GEOFENCE_CAP_ANDROID` in `geofence-rotation.ts` (a recorded deviation from the decision sheet's 100; §1.2 D5, F70). This is the only place the cap is defined.
4. Crossing regions: `radius: 1000` m, `notifyOnEnter: true`, `notifyOnExit: false`.
5. Re-rank fence `RERANK_ID = '__rerank__'`: centered on the user, `radius = clamp(0.5 × distance to the nearest unregistered candidate, 1000, 5000)`, `notifyOnEnter: false`, `notifyOnExit: true`.
6. `await Location.startGeofencingAsync(GEOFENCE_TASK, regions)` (calling it again replaces the set) → save `geofencesRegisteredAt`, `geofenceSet`.
7. Zero candidates → `stopGeofencingAsync(GEOFENCE_TASK)` if `hasStartedGeofencingAsync` (zero battery when calm).
- Requirements: Always permission + `UIBackgroundModes: location` (iOS) or `startGeofencingAsync` throws; gate with `caps.geofencing`. iOS relaunches a terminated app for region events; **Android does not** restart a terminated app (vendor-dependent) — say "alerts can arrive minutes late" (`alerts.why_late`).
- Geofences are this app's only "near me" awareness while moving: they run on the phone with cached **live** risk and post **local** notifications; nothing about the position or the fence set is ever uploaded (no server-side location subscription exists, §31.4). Candidates come from live display state only — a replay or a Replay drive never registers or re-ranks geofences (§33.8).

### 30.4 Drive Mode location

- **Foreground (MVP F57):** `startForegroundWatch('drive', …)`; `useKeepAwake('drive-mode')`; never force brightness.
- **Background continuation (Stretch F63):** started **while foregrounded** when Drive Mode starts and Always or (Android) foreground-service location is available:
```ts
// mobile/src/tasks/drive-location.ts defines DRIVE_LOCATION_TASK at top level (same pattern as geofence.ts):
// it runs proximity (30.5) against cached risk and posts local notifications; TTS only if the app is foreground.
await Location.startLocationUpdatesAsync(DRIVE_LOCATION_TASK, {
  accuracy: Location.Accuracy.High, distanceInterval: 25,
  activityType: Location.ActivityType.AutomotiveNavigation,
  pausesUpdatesAutomatically: false,                 // explicit: the iOS native default is true
  showsBackgroundLocationIndicator: true,            // honest blue pill on iOS
  foregroundService: { notificationTitle: t('drive.fgs_title'), notificationBody: t('drive.fgs_body'),
                       notificationColor: '#6CB4FF', killServiceOnDestroy: true },   // accent, never a status color (B §15.1–§15.2)
});
```
- Android: a foreground service can start with foreground-only permission but **must** be started while the app is in the foreground (`ForegroundServiceStartNotAllowedException` otherwise). iOS: background updates need the location background mode; expo-location also starts significant-change monitoring.
- Stop (`stopLocationUpdatesAsync`) on: End, destination reached (< 150 m), stationary > 10 min (30.7 auto-end), or app kill. **Outside Drive Mode there is no continuous background location — geofences only.**

### 30.5 Proximity: "what's ahead"

- **With a checked route (Stretch F49):** project the user and each crossing onto the route (`nearestPointOnLine(...).properties.totalDistance` — Turf 7.4 names); a crossing is *ahead* if `alongM(crossing) > alongM(user) + 50`. `RouteRibbon` = next 3 ahead.
- **Without a route (MVP):** candidates within 10 km whose bearing from the user is within ±60° of the heading **and** whose distance decreased over the last 3 fixes (bearing via a 10-line helper in `lib/geo.ts`; no extra Turf module). `RouteRibbon` = the 3 nearest at-risk ahead.
- **Speak/alert trigger:** a WATCH/AVOID/CLOSED/UNKNOWN-lastknown crossing ahead with `distance / max(speed, 5 m/s) ≤ 300 s` or `distance ≤ 2 km` (speed unknown); plus any **escalation** of a crossing ahead (Realtime/snapshot); plus de-escalation updates (low priority).

### 30.6 Driver lockout + passenger mode [MVP F59] (outside Drive Mode)

```ts
// mobile/src/features/drive/lockout.ts — pure reducer, unit-tested with synthetic fixes
export type LockoutState = { locked: boolean; fastSince: number | null; slowSince: number | null; passengerTrip: boolean };
export function stepLockout(s: LockoutState, f: Fix): LockoutState {
  const v = f.speed ?? 0;
  if (v >= 4.5) {                                              // ≥ 4.5 m/s (~10 mph)
    const fastSince = s.fastSince ?? f.t;
    const locked = !s.passengerTrip && f.t - fastSince >= 5_000;   // for ≥ 5 s
    return { ...s, fastSince, slowSince: null, locked };
  }
  if (v < 1) {
    const slowSince = s.slowSince ?? f.t;
    if (f.t - slowSince >= 180_000) return { locked: false, fastSince: null, slowSince, passengerTrip: false };   // trip over
    return { ...s, slowSince, fastSince: null };
  }
  return { ...s, fastSince: null, slowSince: null };
}
```
- **Locked:** `SearchField` (typing), list scrolling beyond the collapsed sheet detent, the Crew list [Stretch F100, once shipped], Settings text inputs, the place editor [Stretch F51]. The map, the AreaStatusCard and the big "Start Drive Mode" button stay usable; a single banner offers Drive Mode (text `drive.suggest`, reused).
- **Passenger unlock:** tapping a locked control opens the §13.12 dialog (`drive.lockout.title` + buttons, §3.7); `PassengerHoldButton` = 1.5 s press-and-hold with a progress ring, cancellable by sliding off; a11y action `activate` labeled `drive.lockout.confirm_a11y` "Confirm I am a passenger". Unlock lasts for the current trip; re-locks after < 1 m/s for 3 min or relaunch; never offered inside Drive Mode; nothing is stored.
- Without foreground location permission the app **cannot** detect motion → no lockout; document this in Settings → Drive Mode (`settings.drive.lockout_help`, B §13.16.4) and the README a11y/safety notes (honest limitation).
- **Drive suggestion [Stretch F62]:** median speed > 6.7 m/s over 15 s, using only fixes with accuracy < 50 m, or `Location.watchMotionActivityAsync` `activities.automotive.detected` with confidence ≥ Medium (VERIFY on device; unknown in Expo Go) → one giant banner `drive.suggest` "Driving? Switch to Drive Mode" (≥ 64 pt). Never auto-starts.
- **Two thresholds, never merged:** the lockout above (≥ 4.5 m/s for ≥ 5 s, MVP F59) and the suggestion trigger (median > 6.7 m/s over 15 s or automotive activity, Stretch F62) are separate functions (`stepLockout` in `lockout.ts`, `shouldSuggestDrive` in `drive-suggest.ts`) with separate unit tests (§36.1). Never reuse one threshold for the other.

### 30.7 Drive Mode screen behavior [MVP F57–F61, F128] (visuals §13.11)

- **Entry:** start sheet (§3.9 "Drive Mode start" text, key `drive.start.mount`: "Mount your phone. Don't touch it while driving. FordCast will speak."; plus `alerts.why_late` and, until F63 ships, `drive.start.foreground_only`; with location denied, [Start] is replaced by `drive.start.needs_location` + [Go to Settings], B §13.11) → [Start] (76 pt). On start: set audio mode, preload chimes, pick the voice (30.8), start the location source, `useKeepAwake('drive-mode')`, start background continuation if allowed (Stretch F63), start the sticky notification / Live Activity (Stretch F111/F112, §31.8–§31.9), build the HUD from cached risk.
- **Theme:** `driveNight` tokens (`#070D18`, text `#E6EBF2`); status word ≥ 32 pt, secondary ≥ 24 pt; ≤ 3 items per glance; ≤ 120 characters; targets ≥ 76 pt with ≥ 24 pt gaps; no typing, no list scrolling, no map gestures. **Orientation: portrait [MVP]** (the app is portrait-only via `app.config.ts`, §27.3, §8.7; Drive Mode included). [Stretch F94] Landscape = two columns via `useWindowDimensions()` (`width > height`), enabled only after the per-screen orientation lock is verified on device (§28.2, §37 item 65).
- **Speech queue (`speech-queue.ts`):** priority 2 = → AVOID/CLOSED (pre-empts: `Speech.stop()` then speak), 1 = → WATCH, UNKNOWN-ahead, offline notice, 0 = de-escalation updates. Never the same crossing more than once per 60 s; merge simultaneous changes into `drive.tts.multi_changed` (plural; "2 crossings ahead changed.") followed by the highest-priority crossing's own TTS line. Each utterance: chime (`chime.wav` for priority 2, `chime_soft.wav` for 1, none for 0) → TTS (only the `state.<s>.tts`, `update.deescalate.tts`, `drive.tts.*` and `*_spoken` keys, ≤ 12 words; never a window or a travel time as a single number, §3.5 rule 8, §3.10) → haptic per §11.6 (gated 1.5 s). The TTS keys per HUD state are owned by B §13.11's table: WATCH `state.watch.tts`, AVOID `state.avoid.tts`, CLOSED `state.closed.tts`, UNKNOWN ahead `drive.tts.unknown_ahead`, offline `drive.tts.offline`, de-escalation `update.deescalate.tts`, error boundary `drive.tts.stopped`; calm is silent (never an "all clear").
- **Repeat last alert:** 76 pt [Repeat] (`drive.repeat`) button; iOS `onMagicTap` on the Drive Mode root view. **Mute** (`drive.mute`): session-only; visible `drive.voice_off` "Voice off" state; escalations still chime + haptic (never one channel).
- **Offline:** dashed FreshnessPill `fresh.as_of_offline` "Risk as of {{time}} — you're offline"; spoken once: `drive.tts.offline` "FordCast is offline. Watch for water and barricades."
- **Crash:** Drive Mode's route `ErrorBoundary` (§28.9) shows `errors.root` and speaks `drive.tts.stopped` "FordCast stopped. Watch for water and barricades." once.
- **Auto-end [F61]:** speed < 1 m/s for 10 min → `drive.autoend.prompt` "You've been stopped for 10 minutes. End Drive Mode?" spoken + shown, with 76 pt [End] (`drive.end.confirm`) / [Keep driving] (`drive.end.keep`); no answer in 60 s → end. **Exit:** [End] → dialog `drive.end.title` "End Drive Mode?" [End] [Keep driving] (secondary styling, never a red button; local `PortalHost name="sheet"`).
- **Replay drive [MVP, §4 F128] (honest demo on a dry day):** from the Replay player's "More" menu, `replay.drive_cta` "Drive this storm (simulated)" opens Drive Mode with `mode: 'replay'`:
  - The violet REPLAY banner (`replay.banner`) **and** the `replay.simulated_drive` "SIMULATED DRIVE" label stay visible in every frame (portrait in MVP; landscape only once F94 ships).
  - **Target and clock:** the target crossing is the one selected in the player, else `hero.crossing_id`. The drive uses the player's `simT`, which keeps advancing at 1× during the drive; if the target is below WATCH at that `simT` and the storm has a `hero` for it, `simT` starts at `hero.first_alert_at` (the moment FordCast first warned in that storm). The HUD shows the replayed time with the REPLAY banner, never a live clock.
  - **Path:** `ReplayDriveSource` (the same `LocationSource` interface as the GPS source) moves a position at ~15 m/s along a real road polyline from a §32 route result when one exists, else along a 3 km straight approach line ending at the target crossing (start point computed with the `lib/geo.ts` offset helper; position = `along(path, 15 × elapsed_s, { units: 'meters' })` with `@turf/along`; heading = bearing toward the crossing). It emits the same `Fix` objects as the GPS source, so proximity (30.5) behaves as live.
  - **Risk** comes from the bundled timeline (`stateAt`, §33.4) — never from the live cache. Speech, chimes, haptics and the RouteRibbon behave exactly as in a live drive.
  - **Isolation:** no geofences, no server pushes, no writes to the live cache, React Query or the live Alerts inbox counts/badge. The only notification allowed is one REPLAY demo local notification (`replay.notify_title`/`replay.notify_body`, channel `updates`, §31.3, §33.8, F66).
  - This is what the video uses for the Drive Mode voice shot (§41, F128). Done when: the F128 device test passes (AVOID approach → chime → EN and ES TTS → haptic, both labels in every frame) and Maestro `drive-replay.yaml` reaches the AVOID HUD (§36.2).

### 30.8 TTS voice and audio session

```ts
// mobile/src/features/drive/voices.ts — never hard-code voice names
const cache: Partial<Record<'en-US' | 'es-US', string | null>> = {};
export async function pickVoice(lang: 'en-US' | 'es-US') {
  if (cache[lang] !== undefined) return cache[lang] ?? undefined;
  const voices = await Speech.getAvailableVoicesAsync();          // {identifier, name, quality, language}
  const prefs = lang === 'es-US' ? ['es-US', 'es-MX', 'es-419', 'es'] : ['en-US', 'en'];
  for (const p of prefs) {
    const v = voices.filter((x) => x.language?.startsWith(p))
      .sort((a, b) => Number(b.quality === 'Enhanced') - Number(a.quality === 'Enhanced'))[0];
    if (v) return (cache[lang] = v.identifier);
  }
  cache[lang] = null; return undefined;                           // speak with `language` only; system picks
}
// mobile/src/features/drive/audio.ts
export async function speakAlert(text: string, lang: 'en-US' | 'es-US', rate: number, chime?: AudioPlayerLike) {
  await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' });   // verified option names
  if (chime) { chime.seekTo?.(0); chime.play(); await sleep(450); }                       // Android: chime ducks music first
  Speech.stop();
  Speech.speak(text, { language: lang, voice: await pickVoice(lang), rate, pitch: 1.0,
                       useApplicationAudioSession: true,          // iOS: use the session configured above
                       onError: () => showOnce('drive.tts_failed_tip') });
}
// pickVoice('es-US') returning undefined while the app language is Spanish → one-time tip `drive.voice_missing_es` (F58);
// speech still runs with `language` only, and chime + haptic + visual always carry the alert.
```
- **iOS audio-session decision (owned here):** default `useApplicationAudioSession: true` after `setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' })` so speech plays with the silent switch on **and** ducks music. VERIFY on a real iPhone (Lane B/C): silent switch on + music playing. Fallback: `useApplicationAudioSession: false` (system session ducks; may be silent in silent mode) + one-time tip `drive.silent_tip`.
- **Android:** expo-speech has no audio-focus handling; the expo-audio chime (`duckOthers`; also set `interruptionModeAndroid` if the d.ts has it — VERIFY) plays first. VERIFY on device that music ducks.
- Chime player: `createAudioPlayer(require('@/assets/sounds/chime.wav'))` (VERIFY `createAudioPlayer` vs `useAudioPlayer` in `expo-audio/build/*.d.ts`). Never `expo-av`.
- Rate default 0.95 (Settings slider 0.8–1.2; Expo normalizes 1.0 = normal). Language = app language (`en-US`/`es-US`), not the system's.
- **Background speech is unreliable on iOS** (geofence task, another app in front): the notification (sound + banner) is the background alert; TTS is guaranteed only in foreground Drive Mode.

### 30.9 Battery rules

No continuous background location outside an active Drive Mode session; `Accuracy.Balanced` for browsing; `High` only in Drive Mode; stop watches on background; geofences stopped when there are 0 candidates; dash/pulse loops pause when blurred; background refresh ≥ 15 min (inexact); never `BestForNavigation` unless actively driving and plugged in.

### 30.10 Expo Go degradation

`caps.geofencing/backgroundLocation/backgroundTask === false` → registration functions return `{ ok: false, reason: 'expoGo' }` and the Drive tab, Alerts tab and Settings show `CapabilityBanner kind="expoGo"` with `capability.expoGo`: "Background alerts need the FordCast app build. In this preview, FordCast warns you only while the app is on screen." (B §13.10; never "open", which is banned in status scope, §3.12). Foreground Drive Mode, TTS, lockout and local notifications still work.

**Done when (§30):** on the Android dev build, a simulated drive (Android emulator route playback, the debug "Simulate drive" slider, or the F128 Replay drive) produces the AVOID approach with chime → EN and ES speech → haptic in portrait (and in landscape once Stretch F94 ships); the Replay drive keeps the REPLAY banner and "SIMULATED DRIVE" label in every frame and posts nothing except one REPLAY demo notification on `updates`; lockout engages within ~5 s above 4.5 m/s in a unit test and on a car ride (passenger only), and the suggestion trigger is tested separately; with Always granted [Stretch F70], entering a 1 km fence around a cached AVOID crossing posts a `crossing-urgent` notification while another app is in front; geofences stop when nothing is at risk; Expo Go shows the banner and never crashes.

---

## §31. Notifications, push, Live Activities & widgets

### 31.1 Startup order (in `AppServices`, before any permission request)

```ts
// mobile/src/features/alerts/channels.ts — call on every launch and after a language change (names update; IDs are permanent)
export async function setupNotifications(t: TFunction) {
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const d = PushData.safeParse(n.request.content.data);
      const inAppShown = d.success && d.data.crossing_id && bannerIsShowing(d.data.crossing_id, d.data.state);
      return { shouldShowBanner: !inAppShown, shouldShowList: true, shouldPlaySound: !inAppShown, shouldSetBadge: false };
    },                                                   // shouldShowAlert is deprecated (verified)
  });
  if (Platform.OS === 'android') {
    const V = Notifications.AndroidNotificationVisibility.PUBLIC;
    await Notifications.setNotificationChannelAsync('crossing-urgent', { name: t('channel.urgent'),
      importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 400, 200, 400], lightColor: '#FF5470',
      lockscreenVisibility: V, enableVibrate: true, bypassDnd: false });            // system default sound (F121 = Roadmap)
    await Notifications.setNotificationChannelAsync('crossing-watch', { name: t('channel.watch'),
      importance: Notifications.AndroidImportance.DEFAULT, vibrationPattern: [0, 250], lightColor: '#F5A623',
      lockscreenVisibility: V, bypassDnd: false });
    await Notifications.setNotificationChannelAsync('updates', { name: t('channel.updates'),
      importance: Notifications.AndroidImportance.LOW, sound: null, showBadge: false, lockscreenVisibility: V, bypassDnd: false });
    await Notifications.setNotificationChannelAsync('drive-mode', { name: t('channel.drive'),
      importance: Notifications.AndroidImportance.LOW, sound: null, showBadge: false, lockscreenVisibility: V, bypassDnd: false });
  }                                                      // values = B §15.1 channel table; VERIFY `showBadge`/`sound: null` in the d.ts
  await Notifications.setNotificationCategoryAsync('crossing-alert', [
    { identifier: 'SHOW_DETOUR', buttonTitle: t('notif.action.show_detour'), options: { opensAppToForeground: true } },
    { identifier: 'OPEN_CARD',   buttonTitle: t('notif.action.details'),     options: { opensAppToForeground: true } },
    { identifier: 'MUTE_1H',     buttonTitle: t('notif.action.mute_1h'),     options: { opensAppToForeground: false } },
  ]);                                                    // F69 Stretch; re-registered on language change
}
```
Channel IDs are canonical (§3.8) and MUST equal the server's `channelId` values (§23), or Android won't show the notification. Android 13 shows no permission prompt until a channel exists — hence channels first. Never request DND access (`bypassDnd` stays false); never use full-screen intents.

### 31.2 Permission (in context only)

`permission/notifications` primer (`permissions.notifications.title` + `alerts.why_late`, B §13.3) → `Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } })` (VERIFY the iOS options shape in the d.ts). Store the result in `device.pushStatus`. Triggers: first "Notify me" on a crossing (saved crossing, MVP F46), first saved place/route [Stretch F51], the "Alert me" toggle, or Settings → Notifications. iOS time-sensitive delivery additionally needs the entitlement (Lane B) and the user's per-Focus allowance — Settings shows the F64 tip `alerts.time_sensitive_tip` "To get FordCast alerts while Driving Focus is on, allow Time Sensitive notifications for FordCast." with [Go to Settings] → `Linking.openSettings()`.

### 31.3 Content builder (local), channels and interruption levels

```ts
// mobile/src/features/alerts/notify.ts — every title/body is a §3.7 key (layouts: B §15.1); no countdowns; ranges only
export type AlertKind = 'inapp' | 'geofence' | 'drive';
export type ChannelId = 'crossing-urgent' | 'crossing-watch' | 'updates' | 'drive-mode';      // §3.8 — permanent IDs

export function channelFor(d: DisplayRisk, kind: AlertKind | 'test' | 'replay'): ChannelId {
  if (kind === 'replay') return 'updates';                    // §3.8: a replay demo NEVER uses crossing-urgent
  if (kind === 'test') return 'crossing-urgent';              // F72 Settings test; the debug screen (F107) tests every channel
  if (d.state === 'AVOID' || d.state === 'CLOSED') return 'crossing-urgent';
  if (d.state === 'WATCH') return 'crossing-watch';
  if (d.state === 'UNKNOWN') return 'crossing-watch';         // LOCAL geofence approach with a last-known state only (B §15.1);
                                                              // server-side UNKNOWN pushes [Stretch] use `updates` (§3.8, §23.2)
  return 'updates';                                           // de-escalation `update`
}

const headlineKey = (d: DisplayRisk) =>                       // §3.7 headline slot; lo = 0 (or no window) on AVOID → *_now
  d.state === 'AVOID' && (!d.window || d.window[0] === 0) ? 'state.avoid.headline_now'
  : d.state === 'CLOSED' && d.closedSource === 'sensor' ? 'state.closed.headline_sensor'
  : `state.${toWire(d.state)}.headline`;

export async function buildCrossingAlert(db: Db, d: DisplayRisk, kind: AlertKind)
  : Promise<Notifications.NotificationContentInput> {
  const c = await getCrossing(db, d.id); const name = c?.name ?? d.id;
  const [lo, hi] = d.window ?? [0, 0];
  const vars = { name, lo, hi, source: officialSource(d), age: ageText(d) };
  const now = d.state === 'AVOID' && (!d.window || lo === 0);                  // §3.5 rule 2: never "0–", never "now–"
  const title = d.state === 'UNKNOWN' ? t('state.unknown.geofence_lastknown.push_title', vars)
    : d.state === 'NO_RISE' ? t('update.deescalate.push_title', vars)
    : t(`state.${toWire(d.state)}.push_title`, vars);
  const body = d.state === 'UNKNOWN'                                            // "Last known: {{state}} · {{age}}. Treat it as if it could flood."
      ? t('state.unknown.geofence_lastknown.push_body', { ...vars, state: t(`state.${toWire(d.lastKnown!.state)}.label`) })
    : d.state === 'NO_RISE' ? t('update.deescalate.push_body')
    : now ? t('state.avoid.push_body_now')
    : d.state === 'WATCH' && !d.window ? t('state.watch.push_body_nowindow')
    : d.state === 'CLOSED' && d.closedSource === 'sensor' ? t('state.closed.body_sensor')
    : t(`state.${toWire(d.state)}.push_body`, vars);
  return {
    title, body,
    data: { type: d.state === 'UNKNOWN' ? 'unknown' : d.state === 'NO_RISE' ? 'update' : 'risk',
            crossing_id: d.id, state: toWire(d.state), window: d.window, url: `fordcast://crossing/${d.id}` },   // same shape as §23.6
    categoryIdentifier: d.state === 'NO_RISE' ? undefined : 'crossing-alert',  // F69 Stretch; harmless if not registered
    interruptionLevel: d.state === 'AVOID' || d.state === 'CLOSED' ? (caps.timeSensitive ? 'timeSensitive' : 'active')
                     : d.state === 'WATCH' || d.state === 'UNKNOWN' ? 'active' : 'passive',   // LOCAL 'timeSensitive'; push 'time-sensitive'
  };
}

// Replay demo (F66, F128; §3.8, §33.8): local only, `updates` channel, passive, body starts with the REPLAY prefix.
export async function buildReplayDemoAlert(d: DisplayRisk, crossingName: string, stormId: string)
  : Promise<Notifications.NotificationContentInput> {
  const [lo, hi] = d.window ?? [0, 0];
  const headline = t(headlineKey(d), { lo, hi, source: officialSource(d), time: fmtTime(d.changedAt, lang()) });
  return {
    title: t('replay.notify_title', { name: crossingName }),   // "REPLAY · {{name}}" / "REPRODUCCIÓN · {{name}}"
    body: t('replay.notify_body', { headline }),               // "REPLAY — not a live alert: {{headline}}" / "REPRODUCCIÓN — no es una alerta real: …"
    data: { type: 'replay', replay: true, crossing_id: d.id, state: toWire(d.state), url: `fordcast://replay/${stormId}` },
    interruptionLevel: 'passive',                              // never time-sensitive, never heads-up
  };
}

export function buildTestAlert(): Notifications.NotificationContentInput {      // F72 (B §15.1 TEST row)
  return { title: t('alerts.test_title', { name: t('alerts.test_name') }),       // "TEST · Avoid Example Crossing" / "PRUEBA · Evite Cruce de ejemplo"
           body: t('alerts.test'),                                               // "This is a test. No crossing has changed."
           data: { type: 'test', test: true, url: 'fordcast://alerts' },
           interruptionLevel: caps.timeSensitive ? 'timeSensitive' : 'active' };
}
// Every caller schedules with: trigger: Platform.OS === 'android' ? { channelId: channelFor(d, kind) } : null
```
- **Keys used here** (all in the §3.7 bank or the §35.7 inventory; none invented in code): `state.<s>.push_title/push_body`, `state.avoid.push_body_now`, `state.watch.push_body_nowindow`, `state.closed.body_sensor`, `state.<s>.headline`, `state.avoid.headline_now`, `state.closed.headline_sensor`, `state.<s>.label`, `update.deescalate.push_title/push_body`, `state.unknown.geofence_lastknown.push_title/push_body` (EN "{{name}}: data offline" / "Last known: {{state}} · {{age}}. Treat it as if it could flood." — ES "{{name}}: sin datos" / "Último estado conocido: {{state}} · {{age}}. Trátelo como si pudiera inundarse."; `{{state}}` is the last-known state word, never hard-coded), `replay.notify_title`, `replay.notify_body`, `alerts.test_title`, `alerts.test_name`, `alerts.test`, `notif.action.*`, `channel.*`. New ones go into both locale files and `es-pending-review.json` (§35.2, §35.7).
- **Android channel per kind/state** (`channelFor`, matches §3.8, §23.6 and B §15.1): AVOID/CLOSED → `crossing-urgent`; WATCH → `crossing-watch`; UNKNOWN with a last-known WATCH/AVOID/CLOSED (local geofence approach only; the server sends no UNKNOWN push in MVP) → `crossing-watch`; de-escalation → `updates`; **replay demo → `updates`, never `crossing-urgent`**; test → `crossing-urgent`.
- **Replay demo notification (F66, F128):** at most **one** per replay session (Replay player or Replay drive), posted when the replayed target crossing reaches AVOID/CLOSED and only if notification permission is already granted (the player never triggers the permission primer). It is logged in `alerts_log` with `kind: 'replay'`, which the Alerts badge and the live inbox counts exclude (§3.8). `notification-content-test.ts` asserts the EN and ES bodies start with "REPLAY — not a live alert:" / "REPRODUCCIÓN — no es una alerta real:" and that `channelFor(…, 'replay')` is `updates`.
- **Test alert (F72):** Settings → Notifications → "Send a test alert" posts `buildTestAlert()` on `crossing-urgent` (local; works in Expo Go). The debug screen (F107, B §13.22) posts one local test per channel and triggers the server test push (C §23.9).

### 31.4 Push registration & crossing-ID subscriptions [MVP Android F67 / Stretch iOS F68]

```ts
// mobile/src/features/alerts/push-registration.ts — dev/preview builds only (caps.remotePush)
export async function registerDevice() {
  if (!caps.remotePush) return setPushStatus('expoGo');
  const perm = await Notifications.getPermissionsAsync(); if (!perm.granted) return setPushStatus('denied');
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  let { deviceId } = useDevice.getState(); let secret = await SecureStore.getItemAsync('device_secret');   // VERIFY expo-secure-store
  if (!deviceId || !secret) {
    const r = DeviceRegistration.parse(await api.post('/v1/devices', { platform: Platform.OS, locale: lang(), app_version,
                                                                         expo_push_token: token }));   // §22.7 → 201
    deviceId = r.device_id; secret = r.device_secret;                     // returned ONCE; server stores only its sha256
    await SecureStore.setItemAsync('device_secret', secret); useDevice.setState({ deviceId });
  }
  await outbox.put('PUT', `/v1/devices/${deviceId}`, { expo_push_token: token, locale: lang(),
    tz: getCalendars()[0]?.timeZone ?? 'America/Chicago',               // expo-localization; VERIFY the field name in the d.ts
    alerts_enabled: settings.alertsEnabled,
    watch_alerts: settings.watchAlertsDefault,                           // the device-level Watch switch (Settings → Notifications), default false
    updates_enabled: settings.updatesEnabled ?? true,
    quiet_start_min, quiet_end_min, app_version });                     // partial update → 204
  await syncSubscriptions();                                               // below
}
// Every device call sends `Authorization: Device <device_id>:<secret>` (§22.7, §24). Calls go through `outbox` (SQLite) and are
// retried on reconnect, so toggles made offline still sync. Re-send the PUT whenever a Notifications toggle changes.
```

```ts
// mobile/src/features/alerts/subscriptions.ts — runs ON THE PHONE; the output holds crossing IDs and flags only (C §22.7, §23.1)
import { distance } from '@turf/distance';
import { pointToLineDistance } from '@turf/point-to-line-distance';
import { point } from '@turf/helpers';
export type Reason = 'starred' | 'saved_place' | 'saved_route';             // the ONLY three reasons (C §23.1)
export type SubItem = { crossing_id: string; reason: Reason; want_watch: boolean };
export function computeSubscriptions(saved: SavedSnapshot, crossings: Feature<Point, { id: string }>[]): SubItem[] {
  const items = new Map<string, SubItem>();                                 // key = `${crossing_id}|${reason}` (server primary key)
  const add = (s: SubItem) => {
    const k = `${s.crossing_id}|${s.reason}`; const o = items.get(k);
    items.set(k, o ? { ...o, want_watch: o.want_watch || s.want_watch } : s);
  };
  for (const c of saved.crossings)                                          // [MVP F46] "Notify me" → starred
    add({ crossing_id: c.crossing_id, reason: 'starred', want_watch: c.watch_alerts === 1 });   // "Also alert me at Watch" (B §13.15)
  for (const p of saved.places) {                                           // [Stretch F51] radius chip 1 / 3 / 5 mi (default 3 mi = 4,828 m)
    if (!p.avoid_alerts) continue;                                          // Avoid/Closed off → the place contributes nothing
    const center = point([p.lon, p.lat]);
    for (const c of crossings) if (distance(center, c, { units: 'meters' }) <= p.radius_m)
      add({ crossing_id: c.properties.id, reason: 'saved_place', want_watch: p.watch_alerts === 1 });
  }
  for (const r of saved.routes) {                                           // [Stretch F51] ≤ 300 m from the stored route line
    if (!r.geometry) continue;
    for (const c of crossings) if (pointToLineDistance(c, r.geometry, { units: 'meters' }) <= 300)
      add({ crossing_id: c.properties.id, reason: 'saved_route', want_watch: false });   // no per-route Watch switch yet
  }
  const order: Record<Reason, number> = { starred: 0, saved_route: 1, saved_place: 2 };
  return [...items.values()].sort((a, b) => order[a.reason] - order[b.reason] || a.crossing_id.localeCompare(b.crossing_id))
    .slice(0, 300);                                                         // ≤ 300 items (C §22.7); overflow is logged, never silent
}
export async function syncSubscriptions() {
  const items = computeSubscriptions(await loadSaved(), await loadSeedCrossings());   // test crossings are not in the seed (F86)
  const hash = await sha256(JSON.stringify(items));
  if (hash === useDevice.getState().lastSubscriptionHash) return;
  await outbox.put('PUT', `/v1/devices/${useDevice.getState().deviceId}/subscriptions`, { items });   // replaces the whole set → 204
  useDevice.setState({ lastSubscriptionHash: hash });
}
```
- **Subscriptions are crossing IDs only** (`PUT /v1/devices/{id}/subscriptions` with `{"items": [{"crossing_id", "reason", "want_watch"}]}`, ≤ 300 items, replaces the whole set; `extra="forbid"` server-side, so the body never carries anything else). The phone computes them: saved crossings → `starred` [MVP]; saved places → the crossings within the place's radius chip (1 / 3 / 5 mi, default 3 mi = 4,828 m) → `saved_place` [Stretch F51]; saved routes → the crossings within 300 m of the stored route line → `saved_route` [Stretch F51]. **The server never receives a radius, a place, a route line or a coordinate**, and there is **no** location-derived ("near me" / recent-location) subscription. Awareness while moving comes only from on-device geofences and local notifications (§30.3, Stretch F70) plus the in-app map.
- **Watch pushes are off by default and need two switches** (C §23.2, §3.8, §1.2 D2): the device-level Watch switch (`watch_alerts`, sent in `PUT /v1/devices/{id}`, default `false`) **and** the per-subscription `want_watch` flag sent with every item (default `false`; the "Also alert me at Watch" switch per saved crossing, or the place's Watch toggle). The per-item switches stay disabled until the device-level switch is on (B §13.15); turning the device switch off keeps the per-item flags but the server's AND rule stops Watch pushes.
- Recompute when saved items, their switches, or the crossing list (`inventory_version`) change; send only when the hash changes.
- Token changes: re-run `registerDevice()` on every launch and when `Notifications.addPushTokenListener` fires (VERIFY the listener name).
- **"Delete my alert data"** (`settings.delete_alert_data`, F106; flow owned by B §13.16.6 and D §28.8 — this is the only name for the action): `DELETE /v1/devices/{id}` (C §22.7, cascades subscriptions and alert history) → on `204` delete the SecureStore secret and clear `saved_crossings`, `saved_places`, `saved_routes`, `alerts_log`, `device.*` and the React Query cache. Offline, timeout, 429 or 5xx → queue the DELETE in `outbox`, **keep** the device id + secret until the server confirms (they authenticate the delete), and show `settings.delete_alert_data_pending`.

### 31.5 Handling received notifications and taps

```ts
// mobile/src/features/alerts/listeners.ts (inside AppServices)
useEffect(() => {
  const handled = new Set<string>();
  const route = (resp: Notifications.NotificationResponse) => {
    const id = resp.notification.request.identifier + resp.actionIdentifier;
    if (handled.has(id)) return; handled.add(id);                          // cold start + listener can both deliver
    const d = PushData.safeParse(resp.notification.request.content.data); if (!d.success) return;
    const cid = d.data.crossing_id;
    if (d.data.type === 'replay')                                             // local demo only (§31.3); opens that storm's player
      return router.push(d.data.url?.startsWith('fordcast://replay/') ? d.data.url.replace('fordcast://', '/') : '/replay');
    if (d.data.type === 'summary') return router.push('/alerts');            // data.url = fordcast://alerts
    if (d.data.type === 'test') return router.push('/alerts');
    if (resp.actionIdentifier === 'MUTE_1H' && cid) return muteCrossing(cid, 60); // local mute + [Stretch F69] PUT /v1/devices/{id}/mutes {crossing_id, minutes: 60}
    if (resp.actionIdentifier === 'SHOW_DETOUR' && cid && flags.features.handoff) return router.push({ pathname: '/drive/result', params: { avoid: cid } });
    if (cid) router.push(`/crossing/${cid}`);                              // default action + OPEN_CARD
    void markInboxRead(cid);
  };
  void Notifications.getLastNotificationResponseAsync().then((r) => r && route(r));    // cold start
  const s1 = Notifications.addNotificationResponseReceivedListener(route);
  const s2 = Notifications.addNotificationReceivedListener((n) => void addToInbox(n));   // foreground: inbox + AlertBanner;
                                                                                         // type 'replay' → kind 'replay', no banner, never counted in the badge
  return () => { s1.remove(); s2.remove(); };
}, []);
```
"Show detour" falls back to the crossing sheet when routing (F49/F50) isn't built. A push for a crossing the app now shows as UNKNOWN (stale data) still opens the sheet, which shows the honest UNKNOWN state.

### 31.6 Local alerts from the foreground (F66) and the escalation detector

`features/risk/escalation.ts` diffs the previous and new **display** states after every snapshot/Realtime merge, for crossings that are saved, on the active route, or within 10 km:
- escalation into WATCH/AVOID/CLOSED → `AlertBanner` (Avoid/Closed persist), inbox row (`kind: 'inapp'`), haptic, announcement (§34.3); if the app is backgrounded by the time it's processed, a local notification instead;
- → UNKNOWN → StaleBanner once per session per crossing; de-escalation → "Update" inbox row (+ Drive TTS);
- skip if the same crossing+state already arrived by push in the last 30 min (dedupe via `alerts_log`);
- replay state (`player-store`, Replay drive) never enters this detector (§33.3); the only replay notification is the demo one in §31.3.

### 31.7 Push delivery facts the client must respect

Server sends only escalations, `ttl: 1800` (a late flood alert must expire), `collapseId`/`tag` = `crossing-<id>` (newer replaces older), `priority: high` for AVOID/CLOSED; receipts and `DeviceNotRegistered` pruning are server-side (§23). The client never sets a badge count, never retries pushes, and treats a missing push as normal (the in-app state is the truth). Data-only/`contentAvailable` pushes [Stretch] are only a hint to re-rank geofences; iOS throttles them.

### 31.8 Android sticky Drive Mode status [Stretch F111]

```ts
await Notifications.scheduleNotificationAsync({ identifier: 'drive-status',
  content: { title: t('drive.sticky_title', { state: t(`state.${toWire(hud.state)}.label`) }),
             body: stickyBody(hud),        // drive.sticky_body | _now | _nowindow | _calm (B §15.2) — ranges only, never a timer
             sticky: true, autoDismiss: false, color: '#6CB4FF',   // the accent, never a status color (B §15.2)
             data: { url: 'fordcast://drive' } },
  trigger: { channelId: 'drive-mode' } });          // same identifier → updated in place; dismissNotificationAsync('drive-status') on End
```
It sits next to the location foreground-service notification (`drive.fgs_title`/`drive.fgs_body`, §30.4); update it only on HUD changes. `stickyBody` picks `drive.sticky_body_now` when an AVOID window starts at 0, `drive.sticky_body_nowindow` for a WATCH without a window, and `drive.sticky_body_calm` ("No rise detected ahead · next crossing {{distance}}") when nothing ahead is at risk. Never shown in a Replay drive (F128 isolation).

### 31.9 iOS Live Activity [Stretch F112, Lane B only]

```tsx
// mobile/src/live/DriveActivity.tsx — expo-widgets runs this in an isolated runtime: no hooks, no app state, no async
import { Image, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';
type P = { stateWord: string; crossing: string; window: string; asOf: string; tint: string; symbol: string };
const DriveActivity = (p: P, env: LiveActivityEnvironment) => {
  'widget';
  const c = env.isLuminanceReduced ? '#FFFFFF' : p.tint;
  return {
    banner: (<VStack modifiers={[padding({ all: 12 })]}>
      <Text modifiers={[font({ weight: 'bold' }), foregroundStyle(c)]}>{p.stateWord} · {p.crossing}</Text>
      <Text>{p.window}</Text><Text modifiers={[font({ size: 12 })]}>{p.asOf}</Text></VStack>),
    compactLeading: <Image systemName={p.symbol} color={c} />,
    compactTrailing: <Text modifiers={[foregroundStyle(c)]}>{p.stateWord}</Text>,
    minimal: <Image systemName={p.symbol} color={c} />,
    expandedLeading: <Image systemName={p.symbol} color={c} />,
    expandedCenter: <Text modifiers={[font({ weight: 'bold' })]}>{p.crossing}</Text>,
    expandedBottom: <Text>{p.window} · {p.asOf}</Text>,
  };
};
export default createLiveActivity('DriveActivity', DriveActivity);
```
- Lazy-required behind `caps.liveActivities`; `.start(props, 'fordcast://drive')` when Drive Mode starts or an AVOID/CLOSED appears on an active saved route; `.update()` on HUD change; `.end(...)` 30 min after dropping below Watch or on arrival; `Factory.getInstances()` recovers after relaunch. Set `staleDate` = now + 15 min on every update so `isStale` renders the Unknown styling (slate colors, `questionmark.circle`) with `widget.stale` "Data may be outdated · check FordCast" / "Los datos pueden estar desactualizados · consulte FordCast" (B §15.3; never "open", §3.12) (VERIFY where `staleDate` is passed in the 57.0.24 API). Text slots use the §3.7 `widget` / `widget_now` strings. Ranges only, never a timer. SF Symbols `exclamationmark.triangle.fill` / `exclamationmark.octagon.fill` / `xmark.octagon.fill` / `questionmark.circle` (names per §10.9 and B §15.3; VERIFY BEFORE USE in the SF Symbols app). Never started from a Replay drive. Do **not** add a `widgets[]` plugin entry for a Live Activity. Remote Live Activity pushes = Roadmap (F114).

### 31.10 Widgets, CarPlay, Critical Alerts

iOS widgets (F113, Stretch, Lane B, built last) follow §15.4 with expo-widgets; every entry prints "as of", entries > 30 min old render UNKNOWN. Android widgets (F114), CarPlay/Android Auto (F117) and iOS Critical Alerts (F118, needs Apple entitlement approval) are **Roadmap** — document only.

**Done when (§31):** all four channels exist with localized names after first launch (`adb shell dumpsys notification`); permission is requested only in context; a manual-source escalation on the backend (C §23.9, `test-0001`) pushes to a real Android phone with the right channel, ES text for an ES device, and a tap opens `crossing/[id]` from a killed app; the test alert (`alerts.test`) works on the preview APK on `crossing-urgent`; a replay demo notification lands on `updates` with a body starting "REPLAY — not a live alert:" (EN) / "REPRODUCCIÓN — no es una alerta real:" (ES) and never on `crossing-urgent`; Watch pushes are off until both the device switch and the item's `want_watch` are on; a captured `PUT …/subscriptions` body contains only `crossing_id`/`reason`/`want_watch` items (no coordinate, radius or place); "Delete my alert data" removes the server row (verified in the DB) and local alert data.

---

## §32. Routing, geocoding & hand-off client [Stretch-1/2/3; MVP shell in §13.10]

### 32.1 Check My Drive flow (F49–F55)

1. **From:** current location (foreground permission) or a saved place [Stretch F51]. **To:** search (32.6), saved place [Stretch F51], recent, or a long-pressed map point (reverse-geocoded for the label). Lockout (§30.6) applies to typing.
2. Tap **Check my drive** → `checkRoute()` → `POST /v1/route` (32.2). While waiting > 3 s: `common.waking_server` "Waking server…" (Render cold start; `withWakingState()`, §28.9).
3. Render the result card state from §13.10 (No rise on route · Watch · Avoid/Closed + detour · Unknown segments · No detour found · Routing offline/error), the route map (§29.6), `route.crossings_count` "{{count}} crossings on route" chips, `fresh.as_of` "As of {{time}}" (from `risk_as_of`), the attribution footer (`legal.attribution_routing`) and the persistent disclaimer (§3.9).
4. Actions: [Show detour in …] (`handoff.show_in`; never "Open …", §3.12) → `handoff` sheet (32.5); [Start Drive Mode] with the route attached; [Save route] [Stretch F51] → SQLite `saved_routes` (geometry stays on the phone) → crossing-ID subscriptions (§31.4).

### 32.2 API contract (`routing/route-api.ts`) — an exact mirror of C §22.5–§22.6

C §22.5 is the canonical route contract. The zod schemas, the request body and every client call below use its snake_case names exactly: a **flat** `replay_at` + `storm_id` pair in the request (never a nested `replay` object; the server model is `extra="forbid"`, so any other field is a `422`), and `issued_at`, `risk_as_of`, `crossings_on_baseline[].id` and `provider: 'ors' | 'stadia'` in the response. Nullable fields are always present as explicit `null` (C §22.3 rule) → `.nullable()`, never `.optional()`.

```ts
// mobile/src/features/routing/route-api.ts
import { WireState, Window } from '@/features/crossings/schema';
const Iso = z.string().datetime({ offset: true });                       // same helper as §28.5
const LngLat = z.tuple([z.number().min(-99.5).max(-96.5), z.number().min(29.0).max(31.5)]);   // server bbox (§22.9)
const LineStringGeo = z.object({ type: z.literal('LineString'), coordinates: z.array(z.tuple([z.number(), z.number()])).min(2) });
export const RouteRequest = z.object({
  origin: LngLat, destination: LngLat, lang: z.enum(['en', 'es']), want_detour: z.boolean(),
  replay_at: Iso.nullable(),                    // F54 (§19.16): route against Storm Replay states → response mode 'replay'
  storm_id: z.string().regex(/^[a-z0-9-]{3,40}$/).nullable(),   // optional on the server (it picks the storm containing replay_at); we always send it
}).strict();                                    // mirrors extra="forbid": a stray field fails here before the server returns 422
const OnRoute = z.object({ id: z.string(), state: WireState, window: Window.nullable(), tier: z.enum(['A', 'B', 'C']), along_m: z.number() });
const Leg = z.object({ geometry: LineStringGeo, duration_s: z.number(), distance_m: z.number() });
export const RouteResponse = z.object({
  mode: z.enum(['live', 'replay']), issued_at: Iso, risk_as_of: Iso, risk_seq: z.number().int(),
  data_status: z.enum(['live', 'degraded', 'offline']),
  baseline: Leg, crossings_on_baseline: z.array(OnRoute), verdict: WireState,
  monitored_count: z.number().int(), unknown_count: z.number().int(),
  detour: Leg.extend({ avoided: z.array(z.string()), still_on_route: z.array(z.string()) }).nullable(),
  detour_added_min: z.number().nullable(), warning: z.literal('no_detour_found').nullable(),
  via_points: z.array(z.tuple([z.number(), z.number()])).max(2),
  provider: z.enum(['ors', 'stadia']), disclaimer_key: z.literal('SUPPLEMENTARY_TOOL'),
});
export const RouteCheckRequest = z.object({                               // POST /v1/route/check (C §22.6) — saved routes [Stretch F51]
  geometry: LineStringGeo.refine((g) => g.coordinates.length <= 500), buffer_m: z.number().min(10).max(300), locale: z.enum(['en', 'es']),
}).strict();
export const RouteCheckResponse = z.object({
  risk_as_of: Iso, risk_seq: z.number().int(), data_status: z.enum(['live', 'degraded', 'offline']), verdict: WireState,
  monitored_count: z.number().int(), unknown_count: z.number().int(), hits: z.array(OnRoute), disclaimer_key: z.literal('SUPPLEMENTARY_TOOL'),
});
const round5 = ([lng, lat]: [number, number]): [number, number] => [Number(lng.toFixed(5)), Number(lat.toFixed(5))];   // 32.3
export async function checkRoute(o: [number, number], d: [number, number],
  opts: { lang: 'en' | 'es'; wantDetour: boolean; replay?: { stormId: string; at: string } }) {
  const body = RouteRequest.parse({ origin: round5(o), destination: round5(d), lang: opts.lang, want_detour: opts.wantDetour,
    replay_at: opts.replay?.at ?? null, storm_id: opts.replay?.stormId ?? null });   // live: both null; replay (F54): both set
  const res = await withWakingState(() => fetchWithTimeout(`${env.API_BASE}/v1/route`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), timeoutMs: 15_000 }));
  if (!res.ok) throw await toHttpError(res);                               // HttpError / ProblemError (RFC 9457, C §22.1; lib/api.ts §28.9)
  const r = RouteResponse.parse(await res.json());
  if (r.mode === 'live') await routeCache.put(body, r);                    // a replay result is NEVER cached as live (C §19.16)
  return r;
}
// 15 s timeout, no retry on 4xx. 429 → `routing.busy`; 503 routing_unavailable / offline → `routing.offline` + the last LIVE route
// from route_cache. A `mode: 'replay'` result is bannered REPLAY (`replay.banner`) on the result card and the map (§33.8).
// Saved routes whose geometry is already on the phone may use POST /v1/route/check (RouteCheckRequest, buffer_m: 40) instead
// (no external routing call; C §22.6).
export const SearchResults = z.object({ results: z.array(z.object({ id: z.string(), label: z.string(), sublabel: z.string().nullable(),
  lng_lat: z.tuple([z.number(), z.number()]), source: z.enum(['ors', 'photon']) })) });          // GET /v1/search (C §22.6)
export const ReverseGeocode = z.object({ label: z.string(), sublabel: z.string().nullable(), source: z.string() });   // GET /v1/geocode/reverse
```
- **Contract test:** `docs/schemas/route.v1.example.json` is the C §22.5 response example verbatim. It is validated by pydantic in `backend/tests/api/test_route_schema.py` and by `RouteResponse` in `schema-contract-test.ts` (§36.1), and listed with the other shared schemas in §7.1. The same test asserts that the request body `checkRoute()` builds for a replay check has exactly the keys `origin, destination, lang, want_detour, replay_at, storm_id`.

### 32.3 Privacy

Only origin/destination are sent (5 decimals, `round5`), through the non-logging backend proxy (ORS/Stadia keys stay server-side). Routes are not persisted by the server. Place search sends **only the text and the language** (32.6) — never the device location. Reverse geocoding is called only for a point the user long-pressed on the map, never for the device's own fix (C §22.6). On the phone: `route_cache` (7 days), `recents` (last 20 searched places) and `saved_routes`/`saved_places` [Stretch F51] hold coordinates **on the device only**; "Delete cached data" (`settings.delete_cached_data`) removes `recents` and `route_cache` (§28.8, F84). Search text and route endpoints are never logged server-side (§22.9, §24.3).

### 32.4 On-device check (Turf 7.4) and verdict

```ts
// mobile/src/features/routing/on-route.ts
import { pointToLineDistance } from '@turf/point-to-line-distance';
import { nearestPointOnLine } from '@turf/nearest-point-on-line';
import { bbox } from '@turf/bbox';
export function crossingsOnRoute(route: Feature<LineString>, crossings: Feature<Point, { id: string; divided_road?: boolean }>[]) {
  const [w, s, e, n] = bbox(route); const pad = 0.005;                 // ~500 m prefilter
  return crossings
    .filter((c) => { const [x, y] = c.geometry.coordinates as [number, number]; return x > w - pad && x < e + pad && y > s - pad && y < n + pad; })
    .filter((c) => pointToLineDistance(c, route, { units: 'meters' }) <= (c.properties.divided_road ? 60 : 40))
    .map((c) => ({ id: c.properties.id, alongM: nearestPointOnLine(route, c, { units: 'meters' }).properties.totalDistance }))   // NOT .location (Turf 7.4 rename)
    .sort((a, b) => a.alongM - b.alongM);
}
```
- The client recomputes hits against **current display states** (works offline with cached risk) and must agree with the server's `crossings_on_baseline` (matched by `id`); on disagreement, show the **more cautious** state. A replay result (`mode: 'replay'`) is compared against `stateAt()` of the same storm, never against live states.
- **Verdict** (§3.3): highest rank among hits; any UNKNOWN listed separately (`route.unknown_count`); calm copy `state.no_rise.route_verdict` "No rise detected at {{c}} monitored crossings on this route" — never "safe".
- **Detour sanity check:** if the server returns `warning: 'no_detour_found'` / non-empty `still_on_route`, **or** `crossingsOnRoute(detour)` still hits an AVOID/CLOSED crossing, show `routing.no_detour` and hide the hand-off.
- `detour_added_min` comes from the server; the UI shows `state.avoid.detour_line` "Detour adds {{n}} min" + `route.trip_total` "({{total}} min total)" (`{{total}}` = `round(detour.duration_s / 60)`; trip durations, never a countdown).

### 32.5 Re-validation (F55) and hand-off (F53)

- **Re-validation:** on every display-state change of a crossing within 2 km of the active route, recompute the on-device verdict immediately; if a new AVOID/CLOSED appears on the route, re-call `/v1/route` (≤ 1/min); in Drive Mode also every 5 min. Show `route.changed` banner "Route status changed · {{time}}" with [View] (`common.view`; never "Open", §3.12).
- **Hand-off URLs** (`routing/handoff.ts`):
```ts
const ll = ([lng, lat]: number[]) => `${lat.toFixed(6)},${lng.toFixed(6)}`;          // URLs are lat,lng; GeoJSON is lng,lat
export function googleUrl(o: number[], d: number[], vias: number[][]) {
  const wp = vias.slice(0, 3).map(ll).join('|');                                     // ≤ 3 waypoints on mobile; URL ≤ 2,048 chars
  return `https://www.google.com/maps/dir/?api=1&origin=${ll(o)}&destination=${ll(d)}&travelmode=driving` +
         (wp ? `&waypoints=${encodeURIComponent(wp)}` : '&dir_action=navigate');     // with waypoints: preview, user taps Start
}
export function appleUrl(o: number[], d: number[], vias: number[][]) {
  // Parse major and minor as INTEGERS: a float parse turns "18.10" into 18.1 (< 18.4) and picks the wrong URL (F53).
  const [maj = 0, min = 0] = Platform.OS === 'ios' ? String(Platform.Version).split('.').map(Number) : [0, 0];
  if (maj > 18 || (maj === 18 && min >= 4)) return `https://maps.apple.com/directions?source=${ll(o)}&destination=${ll(d)}` +
                        vias.map((p) => `&waypoint=${ll(p)}`).join('') + '&mode=driving';   // unified Maps URL (verified)
  return `https://maps.apple.com/?saddr=${ll(o)}&daddr=${ll(vias[0] ?? d)}&dirflg=d`;   // legacy: leg 1 only (two-leg)
}
export const wazeUrl = (to: number[]) => `https://waze.com/ul?ll=${ll(to)}&navigate=yes&utm_source=fordcast`;   // no waypoints
```
- `handoff` sheet rows: Apple Maps (iOS only), Google Maps, Waze; each row's button is `handoff.show_in` "Show detour in {{app}}" (never "Open …", §3.12). Two-leg apps (Waze; Apple < 18.4) show `handoff.two_leg` "Goes to the detour point first, then you continue." and go to `via_points[0]` for leg 1; FordCast then watches for arrival within 150 m (Drive Mode proximity, or a temporary geofence on the via point when Always is granted [Stretch F70]) and posts a local notification `handoff.via_reached` "Detour point reached. Continue to your destination." on the `updates` channel (it is not a flood alert) with the action `handoff.continue` "Continue in {{app}}" that hands leg 2 (via point → destination) to the same app.
- Always show `state.avoid.handoff_warning`: "Your map app doesn't know about this forecast. If it routes you back toward {{name}}, don't follow it." Hand off with `Linking.openURL` (https URLs; `canOpenURL` checks only need `LSApplicationQueriesSchemes` for custom schemes).

### 32.6 Geocoding & search UI (F37 MVP crossings, F52 Stretch places)

- **Crossings (MVP, offline):** local search over SQLite `crossings` (name, road, creek), accent- and case-insensitive (`normalize('NFD').replace(/\p{M}/gu,'')`), ranked by prefix match then rank then distance (distance computed on the phone from the in-memory fix; nothing is sent).
- **Places (Stretch F52):** `GET ${API_BASE}/v1/search?q=<text>&lang=<en|es>` — **the request carries only the text and the language, never the user's location** (no `lat`/`lon`; the server rejects them with `422`). The server always applies the fixed Austin-area bias defined once in C §16.13 (`SEARCH_FOCUS_LAT/LON` = 30.2672, −97.7431; `SEARCH_BBOX` = −98.6, 29.6, −97.0, 31.0) to ORS Pelias autocomplete → Photon fallback; response `SearchResults` (32.2, C §22.6). Every user gets the same results for the same text. Client: debounce 350 ms, ≥ 3 characters, `AbortController` cancels stale requests; show **Saved places** (`search.saved_places`) and **recents** (`search.recent`, on the phone only) before any network call; `search.use_current_location` "Use current location" row first (the fix stays on the phone until it becomes a route endpoint); input `textContentType="fullStreetAddress"`, `autoComplete="street-address"` (WCAG 1.3.5).
- **Fallback chain on the client:** backend error/offline → `Location.geocodeAsync(text)` on submit only (the OS geocoder; no autocomplete; needs foreground permission on Android; rate-limited — "use sparingly"). Long-press reverse geocode (only for a point the user long-pressed, never the device's own fix): `GET /v1/geocode/reverse?lat=&lon=&lang=` → `ReverseGeocode`; on `404 not_found` or any error → `Location.reverseGeocodeAsync`.
- Empty: `search.empty` "No crossings or places match “{{q}}”. Try a road or creek name." (EmptyState).

### 32.7 Saved places & routes [Stretch F51]

SQLite `saved_places` (≤ 10; Home/School/Work/custom; radius chip 1 / 3 / 5 mi, default 3 mi = `radius_m` 4,828; Watch **off**, Avoid/Closed on; turning Avoid/Closed off asks for confirmation with `places.avoid_off_confirm` "You won't be warned about likely flooding near {{place}}.") and `saved_routes` (name, endpoints, geometry, usual departure time stored for display only — the departure reminder is [Roadmap F56] — last verdict). Editing never asks for data the app already has (WCAG 3.3.7). Every change recomputes the crossing-ID subscriptions on the phone (§31.4); the radius, the place and the route line never leave the device.

**Attribution footer** (Check My Drive): `legal.attribution_routing` "Routing © openrouteservice.org by HeiGIT · Map data © OpenStreetMap contributors" (VERIFY BEFORE USE: ORS's requested wording; OSM credit mandatory).

**Done when (§32):** a Home → School check returns a verdict that matches both server and Turf; a replay check (request `replay_at` + `storm_id`, F54) on an AVOID replay crossing produces a detour with "+N min" and a REPLAY banner and is not written to `route_cache`; `docs/schemas/route.v1.example.json` parses with `RouteResponse` and with the pydantic model; the hand-off opens Google Maps with the via point, and the Apple URL choice is correct for iOS "18.3", "18.4" and "18.10" (unit test); a captured `/v1/search` request carries only `q` and `lang`; offline shows `routing.offline` with the last live route; no request body or coordinates appear in backend logs (checked once with log inspection).

---
## §33. In-app Storm Replay player [MVP F75–F80, F83, F128; Stretch F78b, F81–F82]

The replay **engine** (one `tick()`, `available_at`, no-lookahead tests, golden hashes) is §19. The app only **plays back** precomputed `fordcast.replay.v1` timelines — it never runs the model, never interpolates states, and never sees data the pipeline couldn't see.

### 33.1 Assets and loading

- **Where the files come from:** `make replays` (`tools/build_replays.py`, C §19.14) writes `data/replays/<id>.json.gz` (gzip `mtime=0`, so bytes are deterministic) and `data/replays/index.json` — it **never** writes into `mobile/`. `make app-data` (`tools/export_app_data.py`, A §5.2, F76, F86) then copies them into `mobile/assets/replays/`, stamps `hero_storm_id`/`featured` from `results.json`, copies `docs/results/results.json` to `mobile/assets/results/results.json`, writes `mobile/assets/manifest.json`, and **generates `mobile/src/features/replay/assets.ts`** (static `require()`s only). Never hand-edit any of these files. `file_sha256` = sha256 of the **gz bytes**; `timeline_sha256` = sha256 of the uncompressed canonical JSON; `content_sha256` excludes `pipeline` and is checked by CI (`replay-verify`), not on the phone. Budgets: ≤ 150 KB gz per storm, ≤ 1 MB total.
- Index schema (mirror of C §19.14; Part C uses `bytes_gz`):
```ts
// mobile/src/features/replay/schema.ts (index part; `Iso` is the helper defined in 33.2, same file)
export const ReplayIndexEntry = z.object({ id: z.string(), name_en: z.string(), name_es: z.string(), start: Iso, end: Iso,
  file: z.string(), bytes_gz: z.number().int(), generated_at: Iso, timeline_sha256: z.string(), content_sha256: z.string(),
  file_sha256: z.string(), model_version: z.string(), featured: z.boolean(), sort_order: z.number(),
  median_lead_min: z.number().nullable(), n_crossings: z.number().int() });
export const ReplayIndex = z.object({ schema: z.literal('fordcast.replay-index.v1'), generated_at: Iso,
  hero_storm_id: z.string().nullable(),                  // stamped by `make app-data` from results.json; null → first storm by sort_order
  storms: z.array(ReplayIndexEntry) });
export const heroStormId = (ix: z.infer<typeof ReplayIndex>) =>      // the ONE rule for "which storm is featured" (picker, DEMO_MODE, Maestro)
  ix.hero_storm_id ?? [...ix.storms].sort((a, b) => a.sort_order - b.sort_order)[0]?.id ?? null;
```
- `metro.config.js` adds `gz` to `assetExts` (§27.6); `src/features/replay/assets.ts` (generated by `make app-data`) exports `REPLAY_ASSETS: Record<string, number>` mapping ids to `require('@/assets/replays/<id>.json.gz')`. No storm id is ever typed by hand in app code, tests or Maestro flows.
```ts
// mobile/src/features/replay/loader.ts
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';               // VERIFY: SDK 57 File API (.bytes()); fallback 'expo-file-system/legacy' base64 read
import { gunzipSync, strFromU8 } from 'fflate';          // VERIFY (§25.2); fallback: ship plain <id>.json and lazy-require it
import * as Crypto from 'expo-crypto';                   // VERIFY: Crypto.digest(CryptoDigestAlgorithm.SHA256, bytes) → ArrayBuffer
const memo = new Map<string, ReplayV1>();               // ≤ 2 parsed timelines in memory
export async function loadReplay(entry: ReplayIndexEntry): Promise<ReplayV1> {
  const hit = memo.get(entry.id); if (hit) return hit;
  const override = await storageSync.cachedOverride(entry.id);   // { bytes, file_sha256, timeline_sha256 } of a verified newer Storage copy, or null
  const gz = override?.bytes ?? (await readAssetBytes(REPLAY_ASSETS[entry.id]!));
  const expected = override?.file_sha256 ?? entry.file_sha256;
  const actual = toHex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, gz));
  if (actual !== expected) throw new ReplayIntegrityError(entry.id);            // file_sha256: the .gz bytes (gzip mtime=0)
  const text = strFromU8(gunzipSync(gz));
  const expectedTimeline = override?.timeline_sha256 ?? entry.timeline_sha256;  // §19.9: sha of the uncompressed canonical JSON
  if ((await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text)) !== expectedTimeline)
    throw new ReplayIntegrityError(entry.id);
  const tl = ReplayV1.parse(JSON.parse(text));                                   // zod (33.2); any failure → "Unavailable"
  memo.set(entry.id, tl); if (memo.size > 2) memo.delete(memo.keys().next().value!);
  return tl;
}
async function readAssetBytes(mod: number): Promise<Uint8Array> {
  const a = Asset.fromModule(mod); await a.downloadAsync();          // copies the bundled asset to a local file URI
  return new File(a.localUri!).bytes();                              // VERIFY method name/return type
}
```
- **Storage mirror (F76, §19.15):** when online and the Replay tab gains focus, fetch `REPLAY_INDEX_URL`; for any storm whose remote `file_sha256` differs from the bundled one **and** whose remote `generated_at` is newer **and** whose schema is supported (C §19.15), download `${STORAGE_PUBLIC}/replays/<id>.v1.<file_sha256[:12]>.json.gz` (immutable, content-hashed), verify the bytes against the remote `file_sha256`, gunzip, verify `timeline_sha256`, zod-validate, then keep the bytes in the app's document directory and record `{id, file_sha256, timeline_sha256}` in `meta.replayOverrides`. Any failure keeps the bundled copy. The ⓘ panel shows `replay.provenance` "Timeline sha256 {{sha}} · model {{model}} · generated {{date}}" (`{{sha}}` = first 7 hex characters). Process rule (§6.2): after the science freeze, Storage timelines change only together with `results.json`, README and video.
- If `expo-crypto` can't hash bytes (VERIFY fails): drop on-device hashing (`HASH_ON_DEVICE = false`), disable Storage overrides entirely, and use only the bundled files, whose hashes CI already verifies at build time (§19.9); zod validation still runs.
- **Integrity failure** (`ReplayIntegrityError`, zod failure, missing asset) → StormCard `replay.unavailable` "Unavailable — reinstall or update the app" / "No disponible: reinstale o actualice la app" (§13.20); the error is logged (storm id only); other storms unaffected; never a partially parsed storm.
- Replay works **fully offline** from bundled files (airplane-mode test §36.2).

### 33.2 Schema (mirror of C §19.11 `fordcast.replay.v1`)

**Nullability rule (C §22.3, applied to replays by C §19.11):** a field C lists as `… | null` is **always present** and may be `null` → `.nullable()`. A field C marks optional (`?`, or "optional" for a whole block) may be absent → `.nullish()`. Every other field is required. Never `.optional()` alone: pydantic dumps `None` as `null`, and `.optional()` rejects `null`, which would turn a valid storm into "Unavailable".

```ts
// mobile/src/features/replay/schema.ts
import { WireState, Window, Reason } from '@/features/crossings/schema';   // §28.5 (current state names only)
const Iso = z.string().datetime({ offset: true });                          // ISO-8601 UTC ("Z"); same helper as §28.5
const LonLat = z.tuple([z.number(), z.number()]);
const Score = z.object({ pod: z.number().nullable(), far: z.number().nullable(), csi: z.number().nullable(),
  median_lead_min: z.number().nullable(), n_events: z.number().int() }).passthrough();   // null = undefined (e.g. no onsets)
export const ReplayV1 = z.object({
  schema: z.literal('fordcast.replay.v1'),
  storm: z.object({ id: z.string(), name_en: z.string(), name_es: z.string(), start: Iso, end: Iso, tz: z.literal('America/Chicago'),
                    headline_event: Iso.nullable(),
                    description_en: z.string().nullish(), description_es: z.string().nullish() }),   // optional in C (`?`)
  step_s: z.literal(300),
  assumptions: z.object({
    data_delay_min: z.number(),                                  // median delay over the storm's linked gauges → `replay.assumes_delay`
    data_delay_min_by_gauge: z.record(z.string(), z.number()),
    default_delay_min: z.number(),                               // 60 (C §19.4, §1.2 D6)
    delays_source: z.string(),                                   // "data/latency/gauge_latency.json"
    outages: z.array(z.object({ site: z.string(), start: Iso, end: Iso, source: z.string() })),   // documented transmission outages; [] when none
    official_status: z.string(), values: z.string(), params: z.string(),
    rain: z.string().nullable(),
  }),
  pipeline: z.object({ git_sha: z.string(), model_version: z.string(), data_sha256: z.string(), latency_sha256: z.string(),
                       results_sha256: z.string(), generated_at: Iso }),
  gauges: z.array(z.object({ id: z.string(), name: z.string(), lon: z.number(), lat: z.number(), t0: Iso, dt_s: z.number(),
    stage_ft: z.array(z.number().nullable()),                    // null ONLY where the archive has no value (a true gap)
    avail_delay_s: z.number(),
    outages: z.array(z.object({ start: Iso, end: Iso })),        // samples observed inside stay hidden until `end` (33.4)
    trigger_ft: z.number().nullable(), watch_ft: z.number().nullable(),
    nws_categories: z.object({ action: z.number(), minor: z.number(), moderate: z.number(), major: z.number() }).nullable() })),
  crossings: z.array(z.object({ id: z.string(), name: z.string(), name_es: z.string().nullish(), lon: z.number(), lat: z.number(),
    tier: z.enum(['A', 'B', 'C']), initial_state: WireState,
    overtop_stage_ft: z.number().nullish(), target_gauge_id: z.string().nullish() })),   // optional in C; tier-B rows have no overtop stage
  links: z.array(z.object({ crossing_id: z.string(), gauge_id: z.string(), relation: z.string(), is_primary: z.boolean(),
    tau_min: z.number(), tau_p25: z.number(), tau_p75: z.number(),   // exact τ: pulse math + debug screen ONLY, never rendered (§3.5 rule 8)
    tau_lo_min: z.number(), tau_hi_min: z.number(),             // the rounded 15-min range (C §19.11, §18.10): the only travel time shown (33.5)
    trigger_ft: z.number().nullable(), watch_ft: z.number().nullable(), channel_dist_km: z.number().nullable(),
    flowline: z.array(LonLat).min(2) })),                        // ordered gauge → crossing
  events: z.array(z.object({ t: Iso, crossing_id: z.string(), state: WireState, window: Window.nullable(), reasons: z.array(Reason),
    p: z.tuple([z.number(), z.number(), z.number()]).nullable(), held: z.boolean() })),   // state changes only, sorted by t
  pulses: z.array(z.object({ crossing_id: z.string(), gauge_id: z.string(), t_trigger: Iso, tau_min: z.number() })),
  alerts: z.array(z.object({ id: z.string(), event: z.string(), sent: Iso, expires: Iso, damage_threat: z.string().nullish(),
    headline_en: z.string() }).passthrough()).nullish(),         // optional block, Stretch F82
  truth: z.array(z.object({ crossing_id: z.string(), onset: Iso, end: Iso, quality: z.string(), censored: z.boolean() })),
  official: z.array(z.object({ t: Iso, crossing_id: z.string(), status: z.string(), source: z.string() })).nullish(),   // optional; usually absent
  metrics: Score.extend({ method: z.string(), level: z.string(),
    comparators: z.record(z.string(), Score) }),                 // per-storm row; values may be null (the `oct-2018` control has no onsets → POD undefined) → MetricTile "—"
  hero: z.object({ crossing_id: z.string(), lead_min: z.number().nullable(), level: z.literal('avoid'), onset: Iso,
    first_alert_at: Iso, censored: z.boolean() }).nullable(),    // null when the storm has no tier-A AVOID hit → no callout (C §19.12)
  storyboard: z.array(z.object({ t: Iso, kind: z.string(), en: z.string(), es: z.string() })),
});
export type ReplayV1 = z.infer<typeof ReplayV1>;
```
- **Contract tests:** `docs/schemas/replay.v1.example.json` (C §19.11) parses here and in pydantic (§7.1). Extra fixtures in `src/__tests__/fixtures/` (test crossing `test-0001`, real gauge ids/names from C §16.18 only): a tier-B crossing whose `overtop_stage_ft` is absent/null, a storm with `hero: null` and all-`null` metrics, a gauge with a non-empty `outages` list, and one event with a retired state name (must fail → "Unavailable"). `truth` is display-only (Reveal truth, result banner) and never drives a state.
- `links[].tau_lo_min`/`tau_hi_min` come from C §19.11 (computed by `model/explain.py` with the §3.5 rule 8 rounding, like the reason object). The reduced-motion caption and the LagPair label use only them; the app never formats `tau_min`/`tau_p25`/`tau_p75` itself.

### 33.3 Replay clock (`clock.ts`, `player-store.ts`)

- `simT` is a Reanimated shared value (ms since epoch). A `useFrameCallback` advances it while playing: `simT += frameDtMs × speed`, clamped to `storm.end`. Speeds **1× · 10× · 30× · 60× (default) · 120×** (SpeedToggle shows 1×/10×/60× plus a "More" menu with 30×/120×, §12.5). 60× = one storm-minute per wall-second.
- JS-side consumers (map, text, sparkline) receive a **throttled** copy: a `useAnimatedReaction` on `Math.floor(simT / 60_000)` calls back to JS at most once per storm-minute and ≤ 10 Hz (VERIFY the worklets 0.10 API for scheduling JS calls — `scheduleOnRN` vs Reanimated's `runOnJS` — in the installed d.ts).
- Controls: Play/Pause; **prev/next event** (jump to the previous/next `events[].t`, `truth.onset`, gauge gap or outage start/end); **Skip to action** (`replay.skip_to_action`, offered on first play: jump to 30 min before the first WATCH); ±5 min step buttons; the "More" menu (`replay.more`) holds 30×/120× and `replay.drive_cta` (F128, §30.7); drag scrub pauses playback and fires `haptic.select()` each time a 15-storm-minute tick is crossed. At `storm.end`: pause, show `replay.end_of_storm` "End of storm", enable `replay.reveal_truth` [Stretch F81] and the Results CTA.
- **Leaving the player [MVP]:** switching tabs or going back **pauses** playback and keeps `simT` in `player-store`; returning resumes from the same moment (B §13.13). **[Stretch F78b]** With the JS `ReplayMiniBar` (above the tab bar; the iOS 26 `NativeTabs.BottomAccessory` version is part of Stretch F41), playback keeps running and the mini-bar shows `replay.minibar` "REPLAY · {{storm}} · {{time}}" with Play/Pause and [View] (`replay.view`, never "Open") on every tab. Either way Map Home stays **live** — replay state lives only in `player-store` and never enters React Query, SQLite risk tables, geofences or the escalation detector.
- Screen reader on → autoplay disabled; announcements only on play/pause and key events (§34.3).

### 33.4 Frames (`frames.ts`, pure and unit-tested)

```ts
export function stateAt(tl: ReplayIndexed, crossingId: string, simT: number): { state: RiskState; window: Window | null } {
  const ev = tl.eventsByCrossing.get(crossingId) ?? [];          // pre-sorted by t (ms)
  const i = upperBound(ev, simT, (e) => e.tMs) - 1;               // last event with t ≤ simT — states are step functions
  if (i < 0) return { state: fromWire(tl.crossingById.get(crossingId)!.initial_state), window: null };   // §19.11
  const e = ev[i]!; return { state: fromWire(e.state), window: e.window };   // NEVER interpolate states or windows
}
export function visibleSamples(g: ReplayGauge, simT: number): (number | null)[] {   // exactly what the pipeline knew at simT (C §19.4, §19.11)
  const lastIdx = Math.floor((simT - g.avail_delay_s * 1000 - g.t0Ms) / (g.dt_s * 1000));
  const out = g.stage_ft.slice(0, Math.max(0, lastIdx + 1));       // rule 1: t + avail_delay ≤ simT
  for (const o of g.outagesMs) {                                   // rule 2: documented transmission outage — the readings exist in
    if (simT >= o.endMs) continue;                                 // the archive but only ARRIVED at the outage end (C §19.10)
    for (let i = 0; i < out.length; i++) {
      const t = g.t0Ms + i * g.dt_s * 1000;
      if (t >= o.startMs && t < o.endMs) out[i] = null;            // hidden until `end`
    }
  }
  return out;   // null = no AVAILABLE reading (true archive gap, or inside an outage before its end) → hatched "No data" band
}
```
- `indexTimeline(tl)` (run once right after `ReplayV1.parse`) precomputes `ReplayIndexed`: `tMs` per event, `eventsByCrossing`, `crossingById`, and per gauge `t0Ms` and `outagesMs: {startMs, endMs}[]` from `gauges[].outages`.
- The gauge dot turns into a dashed `#7A879C` ring when the newest visible sample is null or older than 30 min (display only; the crossing's state still comes from `events`).
- The headline number is **`hero.lead_min`** from the JSON (§19.12 definition: onset − start of the matched AVOID episode, floored to 5) — the app never recomputes it. If `hero` or `hero.lead_min` is null, show no callout. If `hero.censored`, append `replay.result_lower_bound` "(at least)".
- Unit tests (§36.1): `stateAt` before the first event (= `initial_state`), exactly at an event, between events; `visibleSamples` never returns a sample with `t + avail_delay > simT` ("future poison" fixture) and hides every sample inside a documented outage until the outage `end`, then shows it ("outage" fixture on the 08159000 gauge shape of C §19.11); the callout equals `hero.lead_min` from `docs/schemas/replay.v1.example.json`.

### 33.5 Map, water pulse and hydrograph sync

- Same `MapSurface` with `mode="replay"`: violet 2 pt inner frame + `rgba(182,156,255,0.04)` overlay (§9.9); camera fits the hero gauge + flowline + crossing bbox on open (48 pt padding + sheet inset).
- **Water pulse:** for each `pulses[]` entry with `simT ≥ t_trigger`, `p = clamp((simT − t_trigger) / (tau_min × 60_000), 0, 1)` on a `wave-<crossing>-<gauge>` source built from the matching `links[].flowline` (≤ 3 simultaneous; newest first). At 60× a 40-min τ takes 40 s; the pulse reaches the road around when the forecast said. (`tau_min` drives only this animation and the debug screen; it is never rendered as text.)
- **Reduced motion (B §11.4 A6, §29.5):** no pulse; static `ic-flow-arrow` arrowheads on the active reach + one caption `travel.range` "Water usually takes {{tau_lo}}–{{tau_hi}} min to get here" (a11y/TTS: `travel.range_spoken` "… {{tau_lo}} to {{tau_hi}} minutes …"), filled from the link's `tau_lo_min`/`tau_hi_min` (33.2). **Never** a single-number travel time or "min to crossing", in the caption, its accessibility label or speech (§3.5 rule 8).
- When `simT ≥ hero.onset` (or any `truth.onset` for the selected crossing): draw the white-dot-with-cyan-ring `replay.water_over_road` "Water over road (observed)" marker and the scrubber `●` tick; the `replay.result` callout ("FordCast warned {{x}} min before water reached the road") counts `{{x}}` up from 0 to `hero.lead_min` (§11.4 A12; a measured past lead, never a countdown), always with `replay.honesty` filled from `results.json.headline`; haptic `impactAsync(Medium)`; announce once.
- **Hydrograph/LagPair** (victory-native 42, §12.5) receive `visibleSamples()` and a `playheadT`; trigger/watch lines come from the crossing's primary link; NWS category lines from `nws_categories` when present; the LagPair connector label is the same `travel.range` string (never a single τ); `gauge.show_readings` "Show readings" lists the last 12 visible samples (text alternative).

### 33.6 Scrubber, ticks and results

- `ReplayScrubber`: track `#24344F`, fill/thumb per §9.9; ticks from `events` (▲ WATCH amber, ◆ AVOID red), `truth` (●), gauge gaps (⌀ hatched span); the ▮ official-closure tick appears only if a timeline ever carries official data (current storms state "not available"). `accessibilityRole="adjustable"`, value = `replay.scrubber_spoken` — the spoken sim time plus the last event already passed ("May 23, 10:40 PM. Avoid issued at 10:31 PM.", B §13.13); before the first event, the spoken time only. **Never** a count of minutes until a (future) flood. Increment/decrement = ±5 min; visible ±5 min buttons (WCAG 2.5.7).
- **Results** (`replay/results?storm=<id>` formSheet): the `replay.result` count-up number, `replay.honesty` line, MetricTiles POD/FAR/CSI/median lead (+ CIs) from the bundled `mobile/assets/results/results.json` (headline + this storm's row) — or "—" + `results.pending` "Pending backtest" when absent; per-crossing lead bars and comparator rows (`upstream_rule` vs `nearest_gauge`, and `watch_level`) from the timeline `metrics`; `results.how_scored` "How we scored this" → methodology (no lookahead, per-gauge data delay from `assumptions`, documented outages, approved-archive values, leave-one-storm-out). **No number on this screen is typed by hand** (grep test §7.1).

### 33.7 The UNKNOWN moment (`halloween-2013`, USGS 08159000 "Onion Ck at US Hwy 183")

**The gauge went silent; its readings only arrived later.** The `halloween-2013` timeline carries the documented transmission outage of 08159000 in `assumptions.outages` and `gauges[].outages` (from the storm's `meta.toml`, C §19.3, §19.10). The archive holds the readings, but every reading observed inside the outage became available only at the outage end (`available_at = max(obs_time + delay, outage_end)`, C §19.4), so `visibleSamples()` hides them until then (33.4). The timeline's events (from the real pipeline) switch crossings that depend only on that gauge to `unknown` with `DATA_STALE`; the player shows the dashed gauge ring, the hatched "No data" band on the hydrograph, `◌ UNKNOWN` with `state.unknown.last_known` ("Last known: {{state}} · {{age}}") on the crossing, and the generated storyboard line `replay.gauge_silent` — "{{gauge}} went silent. Its readings only arrived later, so FordCast shows Unknown here." / "{{gauge}} dejó de transmitir. Sus lecturas llegaron después, así que FordCast muestra Desconocido aquí." When the outage ends the delayed samples appear at once and the state steps up (never interpolated). Crossings that rely on 08158700 "Onion Ck nr Driftwood" keep their state. A true archive gap gives the same UNKNOWN result, with the `reason.DATA_STALE_gauge` storyboard line instead (C §19.13). It is announced once (`default`) and called out in the video (§41). The exact outage bounds are VERIFY BEFORE USE in C (§19.10); the app only reads them from the JSON. If `halloween-2013` fails its data checks and is not bundled, this moment is skipped — never faked on another storm.

### 33.8 REPLAY labeling & isolation

The violet REPLAY banner (`replay.banner`, §3.6) is visible in **every** frame of the player, the results sheet, the mini-bar [Stretch F78b], the Replay drive (with `replay.simulated_drive`, F128) and any replay-routed check (F54). The only replay notification is the local demo one (§31.3): title `replay.notify_title` "REPLAY · {{name}}", body `replay.notify_body` that **starts with "REPLAY — not a live alert:" / "REPRODUCCIÓN — no es una alerta real:"**, channel **`updates`** (never `crossing-urgent`), `interruptionLevel: 'passive'`, `data.type: 'replay'`, at most one per replay session, excluded from the live inbox counts and the tab badge (§3.8, F66). Replay never writes to live caches, never registers geofences and never pushes.

### 33.9 DEMO_MODE [F83] and `DemoTouchOverlay`

- `EXPO_PUBLIC_DEMO_MODE=1` only in local dev runs or the `demo` profile; `app.config.ts` throws for `preview`/`production` (§27.3) and a Jest test asserts `eas.json` never sets it in those profiles.
- Effects: deterministic start (storm = `heroStormId(index)` from the bundled `index.json` (33.1) unless `demo.storm` in `src/lib/flags.ts` names another **bundled** id; start time = `demo.startOffsetMin`; never a hard-coded storm), dev overlays hidden, `DemoTouchOverlay` on iOS (44 pt translucent circle per touch, 300 ms fade; captured with `onStartShouldSetResponderCapture={(e) => { addTouch(e.nativeEvent.pageX, e.nativeEvent.pageY); return false; }}` on a root wrapper so touches still pass through — VERIFY that MapLibre touches are visible to the capture phase on device), and optional auto-slow to **10×** from `T_W − 5 min` to `onset + 5 min` (10× is in the F78 speed set; §1.2 D7, F83). The REPLAY banner stays visible during auto-slow.
- Android recordings use `scrcpy --show-touches` (§41); the overlay stays off on Android.

**Done when (§33):** the storm named by `heroStormId(index)` (never a hard-coded id) plays end-to-end in airplane mode on the preview APK; the lead-time callout equals `hero.lead_min` from the JSON and is always paired with `replay.honesty`; every frame shows REPLAY; if `halloween-2013` is bundled, its documented outage shows UNKNOWN at the US 183-dependent crossings with the `replay.gauge_silent` line while the archive's readings stay hidden until the outage end; a corrupted asset shows `replay.unavailable` without crashing; the replay demo notification lands on `updates` with the REPLAY prefix; `ReplayV1` parses the C §19.11 example and the null/absent fixtures; 60× playback meets §36.4 budgets.

---

## §34. Accessibility implementation [MVP F89–F95]

Claim only after the §34.9 matrix passes: "Meets WCAG 2.2 AA where it applies to native apps, and meets Apple's Accessibility Nutrition Label criteria for VoiceOver, Voice Control, Larger Text, Dark Interface, Differentiate Without Color Alone, Sufficient Contrast and Reduced Motion. Tested on device with VoiceOver and TalkBack." (Lane A without an iPhone: claim TalkBack only.) Use the `accessibility*` prop family consistently (not the ARIA-style `role` prop).

### 34.1 One preferences source (`features/a11y/A11yPrefsProvider.tsx`)

```tsx
// Reanimated's useReducedMotion() returns only the start value — never use it for live decisions.
const EVENTS = ['screenReaderChanged', 'reduceMotionChanged', 'boldTextChanged', 'reduceTransparencyChanged',
  'darkerSystemColorsChanged', 'highTextContrastChanged', 'grayscaleChanged'] as const;
export function A11yPrefsProvider({ children }: PropsWithChildren) {
  const { fontScale } = useWindowDimensions();
  const [p, setP] = useState(DEFAULT_PREFS);
  useEffect(() => {
    const refresh = async () => setP({
      screenReader: await AccessibilityInfo.isScreenReaderEnabled(),
      reduceMotion: await AccessibilityInfo.isReduceMotionEnabled(),
      boldText: Platform.OS === 'ios' ? await AccessibilityInfo.isBoldTextEnabled() : false,
      reduceTransparency: Platform.OS === 'ios' ? await AccessibilityInfo.isReduceTransparencyEnabled() : false,
      highContrast: Platform.OS === 'ios' ? await AccessibilityInfo.isDarkerSystemColorsEnabled()
                                          : await AccessibilityInfo.isHighTextContrastEnabled(),
      grayscale: Platform.OS === 'ios' ? await AccessibilityInfo.isGrayscaleEnabled() : false,
    });
    void refresh();
    const subs = EVENTS.map((e) => AccessibilityInfo.addEventListener(e as any, refresh));
    const app = AppState.addEventListener('change', (s) => s === 'active' && void refresh());
    return () => { subs.forEach((s) => s.remove()); app.remove(); };
  }, []);
  return <A11yCtx.Provider value={{ ...p, fontScale }}>{children}</A11yCtx.Provider>;
}
```
Consumers: `MotionConfig` (§28.3), `useMotionOK()` (§11.3: `!reduceMotion && settings.animations !== 'reduced'`), `useTheme()` (→ `darkHC` when `highContrast || settings.increaseContrast`), glass [Stretch F41 only; MVP uses solid surfaces, `features.glassChrome = false`] (`reduceTransparency` → opaque `surface.1`), `AppText` (bold bump), Map Home (`screenReader` → List first), Replay (no autoplay).

### 34.2 Props checklist per component

| Component | Required props / behavior |
|---|---|
| `AppText` | `allowFontScaling` (default); `maxFontSizeMultiplier` per variant (34.4); iOS `accessibilityLanguage={lang === 'es' ? 'es-US' : 'en-US'}`; bold bump when `boldText`; never truncates status words or windows |
| `StatusChip` | `accessible`, `accessibilityRole="text"`, `accessibilityLabel={t('state.<s>.spoken_short')}` (+ `state.closed.official_spoken` ", official" when the closure is official); glyph `accessibilityElementsHidden` + `importantForAccessibility="no"`; never pressable |
| `CrossingRow` | `accessibilityRole="button"`; label `row.spoken` **starting with the visible name** (WCAG 2.5.3; template and example in B §13.5: name, the state's `spoken` window phrase, distance, check age); hint `row.hint` "Shows details." (never "Opens …"); `accessibilityActions=[activate, detour (Stretch F50), save]` + `onAccessibilityAction`; `minHeight: 56` |
| Crossing sheet header | `accessibilityRole="header"`, label = state + name + window (spoken); focused after the open animation via `AccessibilityInfo.sendAccessibilityEvent(ref, 'focus')` (VERIFY in RN 0.86; fallback `setAccessibilityFocus(findNodeHandle(ref))`); reading order header → window → why → actions → footer |
| Sheet grabber (gorhom + formSheet) | real button: `accessibilityRole="button"`, label `sheet.expand` / `sheet.collapse`, `accessibilityState={{ expanded }}`, actions `expand`/`collapse` snap detents; full detent iOS `accessibilityViewIsModal`; `onAccessibilityEscape` closes |
| `RiskRing` | hidden (`accessibilityElementsHidden`, `importantForAccessibility="no-hide-descendants"`) — duplicates the header |
| `Hydrograph` / `Sparkline` / `LagPair` | `accessible`, `accessibilityRole="image"`, full-sentence label from spoken keys: Hydrograph/Sparkline `gauge.summary_spoken` ("Upstream gauge, {{gauge}}. {{value}} feet. Change over the last 30 minutes: {{rise}} feet. Trigger level: {{trigger}} feet." — `{{gauge}}` = the real name from the bundled `gauges.geojson` or its spoken form, e.g. 08154700 "Bull Ck at Loop 360 nr Austin" read as "Bull Creek at Loop 360 near Austin"); LagPair `travel.range_spoken` ("Water usually takes {{tau_lo}} to {{tau_hi}} minutes to get here") — **never a single-number travel time** (§3.5 rule 8); visible `gauge.show_readings` "Show readings" button → `ReadingsList` |
| `ReplayScrubber` | `accessibilityRole="adjustable"`, `accessibilityValue={{ text }}`, actions `increment`/`decrement` = ±5 min; magic tap on the player root = play/pause (iOS) |
| `SpeedToggle`, `ToggleGroup`, tabs | items `accessibilityRole="radio"`/`"tab"` + `accessibilityState={{ selected }}`; speed labels `replay.speed_spoken` "{{n}} times speed" |
| Buttons (`Button`, `BigActionButton`, `GlassIconButton`) | label = visible text (icon-only: `a11y.btn.list` "List of crossings", `a11y.btn.layers` "Map layers", `a11y.btn.locate` "Center on my location", `a11y.btn.zoom_in` "Zoom in", `a11y.btn.zoom_out` "Zoom out", `a11y.btn.settings` "Settings", `a11y.btn.legend` "Legend"); `accessibilityState={{ disabled, busy }}`; ≥ 48 pt (≥ 76 in Drive Mode) incl. `hitSlop`; Large Content Viewer (`accessibilityShowsLargeContentViewer`, `accessibilityLargeContentTitle`) on chrome/HUD buttons |
| Switch rows | `accessibilityRole="switch"`, `accessibilityState={{ checked }}`, label = row text |
| `MapSurface` container | one `accessible` image with the count summary (§29.9); markers not focusable |
| `AlertBanner` | iOS `announce()`; Android `accessibilityLiveRegion` `assertive` (AVOID/CLOSED) / `polite`; AVOID/CLOSED never auto-dismiss; WATCH ≥ 10 s or `getRecommendedTimeoutMillis()` (Android) |
| `OfflineBanner` / `StaleBanner` / `CapabilityBanner` | `accessibilityRole="alert"` only when newly shown; live region `polite` |
| `DriveHUD` | live region `assertive`; label from the `*_spoken`/`tts` keys only (never a dash, a symbol or a single-number time); Repeat button + `onMagicTap` (iOS) on the Drive Mode root; in a Replay drive the REPLAY banner and `replay.simulated_drive` label are read first |
| `PassengerHoldButton` | `accessibilityActions=[{ name: 'activate', label: t('drive.lockout.confirm_a11y') }]`, hint `drive.lockout.confirm_hint` "Double-tap to confirm." |
| `SearchField` | `accessibilityRole="search"`; locked → `accessibilityState={{ disabled: true }}` + hint `drive.lockout.hint` explaining the lockout |
| `LoadingState` | visible `common.loading` "Loading…" text; `accessibilityState={{ busy: true }}`; never looks like NO_RISE |
| Dialogs | focus trapped; iOS `accessibilityViewIsModal`; Android background `importantForAccessibility="no-hide-descendants"` |
| Decorative icons/illustrations | `accessibilityElementsHidden` + `importantForAccessibility="no"` |
- Group each visual unit (chip + name + window) into **one** `accessible` View; never nest `accessible` Views (inner ones become unreachable on iOS). Background refreshes must not remount lists (stable `keyExtractor`), so focus never resets.

### 34.3 Announcement policy (`features/a11y/announce.ts`, WCAG 4.1.3)

```ts
let last = 0; let pending: string[] = []; let timer: ReturnType<typeof setTimeout> | null = null;
export function announce(msg: string, level: 'low' | 'default' | 'high' = 'default') {
  pending.push(msg);
  const flush = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!pending.length) return;
    const text = pending.length > 2 ? t('a11y.many_changed', { count: pending.length }) : pending.join(' ');
    pending = []; timer = null; last = Date.now();
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibilityWithOptions(text, { queue: level !== 'high', priority: level });
    else AccessibilityInfo.announceForAccessibility(text);
  };
  const wait = Math.max(0, 10_000 - (Date.now() - last));           // ≤ 1 announcement per 10 s, merged
  if (level === 'high' && wait === 0) return flush();
  if (!timer) timer = setTimeout(flush, wait);
}
```
| Event | Announce | Level |
|---|---|---|
| saved/on-route crossing → AVOID/CLOSED | yes | high |
| → WATCH | yes | default |
| de-escalation | once | low |
| → UNKNOWN (stale) | once per session per crossing | default |
| background refresh with no state change | **never** | — |
| Replay play/pause, WATCH/AVOID issued, water over road, gauge offline | yes | default |

### 34.4 Text scaling

`maxFontSizeMultiplier`: body, card text, status words, windows, alerts = **none**; chip label 2.0; map/HUD numerals 1.5 (same info in the sheet/list; Large Content Viewer on iOS); tab titles system-managed. Layout from `fontScale`: ≥ 1.35 rows stack (text above chips/timestamps), hydrograph +40 %; ≥ 2.0 single column, the crossing sheet opens at the full detent, decorative icons hide, the legend becomes a list. Only crossing names in list rows may truncate (2 lines; full name in the card and the a11y label). Don't compute layout math from Android 14 nonlinear `fontScale` beyond these breakpoints.

### 34.5 Color, contrast, transparency, motion

- 4-way state encoding everywhere (§3.2); red markers rimmed (2 pt white or `#FF5470`); colored status text ≥ 18 pt semibold next to its chip; Increase Contrast / High Text Contrast → `darkHC` tokens (`#FF8095` avoid text, `#B71C1C` fill + white rim, `#A9B4C6` slate, `#9AA6B8` unknown ring, 2 pt borders).
- MVP uses solid surfaces on both platforms (`features.glassChrome = false`; glass chrome is Stretch F41). Once F41 ships: Reduce Transparency, Android, or glass unavailable → opaque surfaces. Reduce Motion (or Animations: Reduced) → no loops, dissolves instead of motion, instant ring; meaning is never removed (§11.4 fallbacks).
- **CVD evidence (`tools/cvd_screens.py`, F95 [Stretch tooling]):** input = dev-gallery (F31b) and key-screen screenshots in `docs/a11y/screenshots/`; output = protan/deutan/tritan (Machado 2009, severity 100) + grayscale renders and a 4-up per screenshot in `docs/a11y/cvd/` using `colorspacious 1.1.2` + Pillow from the **tools environment** (`tools/pyproject.toml`, A §5.3). Run from the repo root: `make cvd` (= `uv run --project tools python tools/cvd_screens.py docs/a11y/screenshots docs/a11y/cvd`, A §5.2). The README shows one 4-up image.

### 34.6 Voice Control, keyboards, switches, gestures

Labels equal visible text so "Tap Show detour" works; icon-only buttons use the names in 34.2. Every gesture has a button: pinch → zoom ±; sheet drag → grabber button; scrubber drag → ±5 min; long-press → `accessibilityActions`; map pan → List. Focus ring 2 pt `#6CB4FF` for keyboard/switch users. No shake gestures.

### 34.7 Landscape [Stretch F94]

**MVP: portrait everywhere, Drive Mode included** (`orientation: 'portrait'` in `app.config.ts`, §27.3; §8.7; §1.2 D8). **[Stretch F94]**, in order: (1) Drive Mode landscape (two columns, §30.7) via a per-screen `orientation: 'all'` on `drive-mode` — only after the per-screen lock is verified in the installed `react-native-screens` types and on device (§28.2; if it fails, stay portrait-only and log it); (2) Map Home and the crossing sheet in landscape (side-panel layout, §8.7). WCAG 1.3.4 is **not** claimed until step 2 ships (Claims Ledger, §44).

### 34.8 Tooling

Xcode Accessibility Inspector (Audit) on iOS builds (Lane B/C); Android **Accessibility Scanner** + TalkBack; RNTL role queries in every component test (`getByRole('button', { name: /show detour/i })` — if a test can't find it by role, a screen reader can't either); `@react-native-ama/core` is **excluded** from the Day-1 build (§1.2 D1; a native module can't be added later without a new build), so dev-time a11y linting relies on these tools and the RNTL role tests. `eslint-plugin-react-native-a11y` is skipped (ESLint ≤ 8 peer).

### 34.9 Device test protocol (`docs/a11y/TESTING.md`)

Matrix: devices (Android 14+ phone; iPhone iOS 26 in Lane B/C) × 5 common tasks — (a) first launch + pledge, (b) find a crossing's status via List, (c) open the crossing sheet and hear window + reason, (d) Check My Drive + detour (or the MVP Drive shell), (e) Storm Replay to the lead-time result — plus Settings language/alerts × settings: TalkBack/VoiceOver (screen curtain on iOS), Voice Control, largest text (Android 200 % / iOS AX5), Bold + Increase Contrast + Reduce Transparency together, Reduce Motion, Grayscale, Spanish, and — only once Stretch F94 ships — landscape. Each cell: date, device, OS, pass/fail, issue link. **DoD:** every cell passes or has a filed issue with a workaround; no common task needs sight, color perception, precise dragging or small targets.

**Done when (§34):** the matrix is complete for the Android device (and iPhone in Lane B/C); toggling Reduce Motion while the app runs stops loops without a restart; grayscale walkthrough passes; CVD 4-ups exist; RNTL role tests cover every primary control.

---

## §35. Localization implementation [MVP F96–F98; Stretch F99]

### 35.1 Setup

```ts
// mobile/src/lib/i18n.ts — imported FIRST by app/_layout.tsx and by every task module
import 'intl-pluralrules';                         // installs Intl.PluralRules only if missing (Hermes)
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import Storage from 'expo-sqlite/kv-store';
import en from '@/locales/en.json'; import es from '@/locales/es.json';
export type Lang = 'en' | 'es';
export function resolveLang(): Lang {
  const choice = readSettingSync('language');        // 'system' | 'en' | 'es' from the persisted settings store
  if (choice === 'en' || choice === 'es') return choice;
  return getLocales()[0]?.languageCode === 'es' ? 'es' : 'en';
}
void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } }, lng: resolveLang(), fallbackLng: 'en',
  supportedLngs: ['en', 'es'], interpolation: { escapeValue: false }, returnNull: false,   // option names verified (26.4.4)
});
export const intlLocale = (l: Lang) => (l === 'es' ? 'es-US' : 'en-US');
export default i18n;
```

### 35.2 Key structure (`src/locales/en.json`, `es.json`)

Namespaces: `common.*`, `onboarding.*` (only `onboarding.welcome.*`, `onboarding.how.*`, `onboarding.legend.*`, `onboarding.pledge.*`, §3.9; the short draft prefixes are retired), `permissions.*`, `capability.*`, `state.<no_rise|watch|avoid|closed|unknown>.*` (slots from §3.7: `label`, `short`, `headline`, `headline_now`, `headline_sensor`, `headline_not_monitored`, `body`, `body_nowindow`, `body_sensor`, `body_not_monitored`, `official`, `spoken`, `spoken_now`, `spoken_short`, `push_title`, `push_body`, `push_body_now`, `push_body_nowindow`, `tts`, `widget`, `widget_now`, `area_headline`, `area_sub`, `footer`, `route_verdict`, `detour_line`, `handoff_warning`, `closure_lifted`, `last_known`, plus `state.unknown.geofence_lastknown.*` and `state.unknown.push`), `update.deescalate.*`, `area.*`, `fresh.*`, `time.*`, `travel.*`, `route.*`, `routing.*`, `handoff.*`, `places.*`, `drive.*`, `replay.*`, `results.*`, `gauge.*`, `alerts.*`, `push.*`, `notif.*`, `channel.*`, `widget.*`, `legend.*`, `search.*`, `saved.*`, `row.*`, `sheet.*`, `settings.*`, `about.*`, `legal.*`, `disclaimer.*`, `safety.*`, `official.*`, `nws.*`, `share.*` [Stretch F48], `reason.<CODE>` + `reason.<CODE>_spoken`, `a11y.*`, `errors.*`. Every key a Part D section names is listed in §35.7 (or owned by the §3.7 bank / B).
- **Spoken siblings:** every status-bearing string has a `*_spoken` (or `tts`) sibling with no dashes, symbols or abbreviations ("15 to 30 minutes", "feet", "Farm to Market 1626"); TTS and every `accessibilityLabel` use only spoken keys (CI guard §3.12).
- **Plurals:** counted keys use `_one`/`_other`, and ES also `_many` (copy of `_other`); always pass `count`. Example (§3.7 `route.unknown_count`): `"route.unknown_count_one": "{{count}} crossing on this route has no recent data"`, `"route.unknown_count_other": "{{count}} crossings on this route have no recent data"`; ES `_one` "{{count}} cruce en esta ruta no tiene datos recientes", `_many`/`_other` "{{count}} cruces en esta ruta no tienen datos recientes". Relative ages (`{{age}}` in §3.7) are rendered from the `time.*` plural keys (§35.7), never from `Intl.RelativeTimeFormat`.
- **New strings:** any key added outside the §3.7 bank goes into both files **and** `es-pending-review.json` (key → EN text) until a fluent reviewer approves; the file must be empty (or its gaps listed in Claims) at code freeze.

### 35.3 Formatting (`lib/format.ts`)

```ts
export const fmtNumber = (n: number, l: Lang) => new Intl.NumberFormat(intlLocale(l), { maximumFractionDigits: 1 }).format(n);
export const fmtTime = (ms: number, l: Lang) =>
  new Intl.DateTimeFormat(intlLocale(l), { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }).format(ms);
// ES → "2:05 p.m.", EN → "2:05 PM". Units are written in strings ("{{n}} ft" / "{{n}} pies"); never NumberFormat style:'unit'.
// Relative ages come from i18n plural keys (Hermes may lack RelativeTimeFormat/ListFormat — never depend on them).
export const visualRange = (lo: number, hi: number) => `${lo}–${hi}`;   // U+2013 en dash, tabular numerals in the UI
```
Distances follow Settings units (mi/km; ft/m for stage); conversions in `lib/geo.ts`. Proper nouns (crossing, creek, road names) stay in English; `name_spoken_es` is used for TTS when present.

### 35.4 NWS terms

Show the official English product name plus a Spanish gloss (`nws.ffw`, `nws.ffa`, `nws.ffe`, `nws.fa` from §3.7); FordCast's Watch is **Precaución**, never "Vigilancia". Switch to official Spanish names only if NWS EWX confirms them (§42).

### 35.5 Runtime language switch

`setLanguage(choice)`: persist → `i18n.changeLanguage(resolveLang())` → re-run `setupNotifications(t)` (channel names + translated action buttons) → queue `PUT /v1/devices/{id}` with `locale` (server pushes in that language) → clear the TTS voice cache so the next utterance re-runs `pickVoice` for `es-US`/`en-US` (§30.8: es-US → es-MX → es-419 → any es, prefer Enhanced, never hard-coded names) → `AppText` picks up the new `accessibilityLanguage` → announce `settings.language_changed` politely. When the choice is "Device language", re-read `getLocales()` on `AppState` active (Android doesn't restart on a locale change; iOS restarts the app). Settings also offers `settings.language_system` "Change in system settings" (`Linking.openSettings()`) for per-app language via the `supportedLocales` plugin.

### 35.6 QA

`i18n-parity-test.ts` (identical key sets; plural suffixes; no untranslated EN values in `es.json` except an allow-list of proper nouns), `copy-banned-test.ts` (§3.12), a **pseudo-locale** run (Stretch F99: `EXPO_PUBLIC_PSEUDO=1` wraps every value as `［…+50 %…］` in `i18n.ts`, no extra package) with screenshots of every screen, a native-speaker review of every ES string and TTS sample, the comprehension test with ≥ 2 Spanish-dominant speakers ("¿Qué haría usted si ve esto?"), and the TalkBack test with app ES / system EN (record pronunciation in `docs/a11y/TESTING.md`).

### 35.7 Key inventory for Part D strings [MVP unless tagged]

Every user-facing string that a Part D section specifies has a key. §3.7 owns all user-facing copy: the agent adds every row below to the §3.7 bank, to `src/locales/en.json` and `es.json`, and to `es-pending-review.json` **in the same commit** as the code that first uses it, and never types the text inline. Rows marked "B §…" copy B's EN/ES verbatim (B wrote them first; this table only gives them a home in the inventory). All ES text is pending native-speaker review (§35.6). Keys that already exist in the §3.7 bank (`state.*` slots, `update.deescalate.*`, `reason.*`, `fresh.*`, `replay.banner`/`no_lookahead`/`result`/`honesty`/`assumes_delay`/`gauge_silent`/`notify_title`/`notify_body`/`drive_cta`/`simulated_drive`, `drive.suggest`, `drive.lockout.title`, `drive.silent_tip`, `permissions.precise_needed`, `settings.delete_cached_data`, `settings.delete_alert_data`, `alerts.why_late`, `alerts.test`, `push.summary`, `route.unknown_count`, `route.changed`, `routing.offline`, `routing.no_detour`, `official.no_closure`, `nws.*`) and B-only keys referenced by name (`travel.range`/`travel.range_spoken`/`travel.n_storms` B §13.8; `drive.sticky_*`/`drive.fgs_*` B §15.2; `widget.stale` B §15.3; `row.spoken` B §13.5; `replay.view` B §12.5; `replay.back` B §13.8; `errors.unknown_crossing` B §13.21; `settings.delete_alert_data_*` B §13.16.6; `permissions.location.body`/`permissions.background.body`/`permissions.notifications.title` B §13.3) are not repeated here.

| Key | EN | ES | Used in |
|---|---|---|---|
| `drive.start.mount` | Mount your phone. Don't touch it while driving. FordCast will speak. | Coloque su teléfono en un soporte. No lo toque mientras maneja. FordCast le hablará. | §30.7 start sheet (= §3.9 "Drive Mode start") |
| `drive.start.foreground_only` (B §13.11) | Keep FordCast on screen. Warnings stop if you switch apps. | Mantenga FordCast en la pantalla. Los avisos se detienen si cambia de app. | §30.7 |
| `drive.start.needs_location` (B §13.11) | Drive Mode needs your location to warn you about crossings ahead. | El Modo manejo necesita su ubicación para avisarle de los cruces que tiene adelante. | §30.7 |
| `drive.start.button` | Start | Iniciar | §30.7 |
| `drive.tts.unknown_ahead` (B §13.11) | No recent data for {{name}}. Watch for water and barricades. | No hay datos recientes de {{name}}. Esté atento al agua y a las barricadas. | §30.7 TTS |
| `drive.tts.offline` (B §13.11) | FordCast is offline. Watch for water and barricades. | FordCast está sin conexión. Esté atento al agua y a las barricadas. | §30.7 TTS (once) |
| `drive.tts.stopped` (B §13.11) | FordCast stopped. Watch for water and barricades. | FordCast se detuvo. Esté atento al agua y a las barricadas. | §30.7 crash TTS, §28.9 |
| `drive.tts.multi_changed` (`_one`/`_other`; ES also `_many`) | {{count}} crossing ahead changed. / {{count}} crossings ahead changed. | Cambió {{count}} cruce adelante. / Cambiaron {{count}} cruces adelante. | §30.7 merged TTS |
| `drive.autoend.prompt` (B §13.11) | You've been stopped for 10 minutes. End Drive Mode? | Lleva 10 minutos detenido. ¿Desea terminar el Modo manejo? | §30.7 auto-end (spoken + shown) |
| `drive.end.title` | End Drive Mode? | ¿Terminar Modo manejo? | §30.7 exit dialog |
| `drive.end.confirm` / `drive.end.keep` | End / Keep driving | Terminar / Seguir manejando | §30.7 |
| `drive.repeat` / `drive.mute` / `drive.voice_off` | Repeat / Mute / Voice off | Repetir / Silenciar / Voz apagada | §30.7 |
| `drive.tts_failed_tip` | Spoken alerts aren't working. Check the volume and your phone's text-to-speech settings. | Las alertas habladas no funcionan. Revise el volumen y la configuración de texto a voz de su teléfono. | §30.8 |
| `drive.voice_missing_es` | No Spanish voice is installed on this phone. Add one in its text-to-speech settings to hear alerts in Spanish. | Este teléfono no tiene una voz en español. Agregue una en la configuración de texto a voz para escuchar los avisos en español. | §30.8 (F58) |
| `drive.lockout.confirm_a11y` | Confirm I am a passenger | Confirmar que soy pasajero | §30.6, §34.2 |
| `drive.lockout.confirm_hint` | Double-tap to confirm. | Toque dos veces para confirmar. | §34.2 |
| `drive.lockout.hint` | Locked while the car is moving. | Bloqueado mientras el carro está en movimiento. | §34.2 `SearchField` |
| `permissions.background.step_ios` [Stretch F70] | Choose “Change to Always Allow”. | Elija “Cambiar a Permitir siempre”. | §30.1 (VERIFY BEFORE USE: the iOS button label in each language on device) |
| `permissions.background.step_android` [Stretch F70] | On the next screen, tap “Allow all the time”. | En la siguiente pantalla, toque “Permitir todo el tiempo”. | §30.1 (VERIFY BEFORE USE: the Android label in each language on device) |
| `permissions.background.trips` [Stretch F70] (B §13.3) | We watch the nearest at-risk crossings, not your trips. | Vigilamos los cruces en riesgo más cercanos, no sus viajes. | §30.1 |
| `settings.drive.background_off` [Stretch F70] (B §13.3) | Background alerts: off. Tap to enable. | Alertas en segundo plano: apagadas. Toque para activarlas. | §30.1 |
| `capability.expoGo` (B §13.10) | Background alerts need the FordCast app build. In this preview, FordCast warns you only while the app is on screen. | Las alertas en segundo plano necesitan la versión instalable de FordCast. En esta vista previa, FordCast solo le avisa mientras la app está en pantalla. | §30.10 |
| `capability.notificationsOff` (B §13.3) | Notifications are off. FordCast can't warn you in the background. | Las notificaciones están apagadas. FordCast no puede avisarle en segundo plano. | §30.1 |
| `capability.pushUnavailable` (B §13.20) | Push alerts unavailable right now. Check crossings in FordCast. | Las alertas push no están disponibles ahora. Revise los cruces en FordCast. | §31.4 |
| `alerts.time_sensitive_tip` [iOS, F64] (B §13.16.2) | To get FordCast alerts while Driving Focus is on, allow Time Sensitive notifications for FordCast. | Para recibir avisos de FordCast con el modo Conducción activado, permita las notificaciones urgentes de FordCast. | §31.2 |
| `channel.urgent` / `channel.watch` / `channel.updates` / `channel.drive` (B §15.1) | Avoid & Closed alerts / Watch alerts / Updates & summaries / Drive Mode status | Alertas: Evite y Cerrado / Alertas de precaución / Actualizaciones y resúmenes / Estado de Modo manejo | §31.1 |
| `notif.action.show_detour` / `notif.action.details` / `notif.action.mute_1h` [Stretch F69] | Show detour / Details / Mute this crossing 1 h | Mostrar desvío / Detalles / Silenciar este cruce 1 h | §31.1 |
| `alerts.test_title` (B §15.1) | TEST · Avoid {{name}} | PRUEBA · Evite {{name}} | §31.3 |
| `alerts.test_name` (B §15.1) | Example Crossing | Cruce de ejemplo | §31.3 (a label that is obviously not a real place) |
| `state.unknown.geofence_lastknown.push_title` [Stretch F70] (B §15.1) | {{name}}: data offline | {{name}}: sin datos | §31.3 |
| `state.unknown.geofence_lastknown.push_body` [Stretch F70] (B §15.1) | Last known: {{state}} · {{age}}. Treat it as if it could flood. | Último estado conocido: {{state}} · {{age}}. Trátelo como si pudiera inundarse. | §31.3 |
| `common.waking_server` (B §13.20) | Waking server… | Activando el servidor… | §32.1, §28.9 |
| `common.loading` / `common.view` / `common.retry` | Loading… / View / Retry | Cargando… / Ver / Reintentar | §34.2, §32.5, §36.5 |
| `routing.busy` [Stretch] (B §13.20) | Routing is busy. Try again in a minute. | El servicio de rutas está ocupado. Intente de nuevo en un minuto. | §32.2 |
| `route.crossings_count` (`_one`/`_other`; ES also `_many`) [Stretch F49] | {{count}} crossing on route / {{count}} crossings on route | {{count}} cruce en la ruta / {{count}} cruces en la ruta | §32.1 |
| `route.trip_total` [Stretch F50] | ({{total}} min total) | ({{total}} min en total) | §32.4 |
| `handoff.show_in` [Stretch F53] | Show detour in {{app}} | Mostrar el desvío en {{app}} | §32.1, §32.5 |
| `handoff.two_leg` [Stretch F53] (B §13.10) | Goes to the detour point first, then you continue. | Primero va al punto de desvío y luego usted continúa. | §32.5 |
| `handoff.via_reached` [Stretch F53] | Detour point reached. Continue to your destination. | Llegó al punto de desvío. Continúe a su destino. | §32.5 |
| `handoff.continue` [Stretch F53] | Continue in {{app}} | Continuar en {{app}} | §32.5 notification action |
| `search.empty` | No crossings or places match “{{q}}”. Try a road or creek name. | Ningún cruce o lugar coincide con “{{q}}”. Pruebe con el nombre de un camino o un arroyo. | §32.6 |
| `search.use_current_location` / `search.saved_places` / `search.recent` [Stretch F52] | Use current location / Saved places / Recent | Usar la ubicación actual / Lugares guardados / Recientes | §32.6 |
| `places.avoid_off_confirm` [Stretch F51] (B §13.15) | You won't be warned about likely flooding near {{place}}. | No recibirá avisos de inundación probable cerca de {{place}}. | §32.7 |
| `legal.attribution_routing` [Stretch F49] | Routing © openrouteservice.org by HeiGIT · Map data © OpenStreetMap contributors | Rutas © openrouteservice.org por HeiGIT · Datos del mapa © colaboradores de OpenStreetMap | §32.7 (VERIFY BEFORE USE: ORS wording) |
| `replay.unavailable` (B §13.20) | Unavailable — reinstall or update the app | No disponible: reinstale o actualice la app | §33.1 |
| `replay.provenance` | Timeline sha256 {{sha}} · model {{model}} · generated {{date}} | Línea de tiempo sha256 {{sha}} · modelo {{model}} · generada el {{date}} | §33.1 ⓘ panel |
| `replay.more` / `replay.skip_to_action` / `replay.end_of_storm` | More / Skip to action / End of storm | Más / Ir a la acción / Fin de la tormenta | §33.3 |
| `replay.reveal_truth` [Stretch F81] | Reveal truth | Mostrar lo que pasó | §33.3 |
| `replay.minibar` [Stretch F78b] | REPLAY · {{storm}} · {{time}} | REPRODUCCIÓN · {{storm}} · {{time}} | §33.3 |
| `replay.result_lower_bound` | (at least) | (como mínimo) | §33.4 |
| `replay.water_over_road` | Water over road (observed) | Agua sobre el camino (observada) | §33.5 |
| `replay.scrubber_spoken` | {{time}}. {{event}} issued at {{event_time}}. | {{time}}. Aviso de {{event}} a las {{event_time}}. | §33.6, §34.2 (`{{event}}` = the state word; never minutes until a flood) |
| `replay.speed_spoken` | {{n}} times speed | {{n}} veces la velocidad | §34.2 |
| `results.pending` / `results.how_scored` | Pending backtest / How we scored this | Pendiente de la evaluación / Cómo lo evaluamos | §33.6 |
| `gauge.summary_spoken` | Upstream gauge, {{gauge}}. {{value}} feet. Change over the last 30 minutes: {{rise}} feet. Trigger level: {{trigger}} feet. | Medidor río arriba, {{gauge}}. {{value}} pies. Cambio en los últimos 30 minutos: {{rise}} pies. Nivel de activación: {{trigger}} pies. | §34.2 |
| `gauge.show_readings` | Show readings | Ver lecturas | §33.5, §34.2 |
| `state.closed.official_spoken` | , official | , oficial | §34.2 `StatusChip` (spoken form of the OFFICIAL micro-label, §3.7) |
| `errors.map_details` (B §13.20) | Map details unavailable | Detalles del mapa no disponibles | §29.12, §36.5 |
| `errors.update_required` (B §13.20) | Please update FordCast to keep getting current data. | Actualice FordCast para seguir recibiendo datos actuales. | §36.5 |
| `errors.root` (B §13.20) | Something went wrong. FordCast can't show crossing status right now. Obey barricades and official warnings. | Algo salió mal. FordCast no puede mostrar el estado de los cruces en este momento. Respete las barricadas y las alertas oficiales. | §30.7, §36.5 |
| `errors.inline` | Couldn't load this right now. | No se pudo cargar en este momento. | §36.5 inline retry row |
| `a11y.many_changed` (`_one`/`_other`; ES also `_many`) | {{count}} crossing changed. Check the list. / {{count}} crossings changed. Check the list. | Cambió {{count}} cruce. Revise la lista. / Cambiaron {{count}} cruces. Revise la lista. | §34.3 |
| `a11y.btn.list` / `layers` / `locate` / `zoom_in` / `zoom_out` / `settings` / `legend` | List of crossings / Map layers / Center on my location / Zoom in / Zoom out / Settings / Legend | Lista de cruces / Capas del mapa / Centrar en mi ubicación / Acercar / Alejar / Configuración / Leyenda | §34.2 |
| `sheet.expand` / `sheet.collapse` | Expand panel / Collapse panel | Expandir panel / Contraer panel | §34.2 |
| `row.hint` | Shows details. | Muestra los detalles. | §34.2 |
| `time.min_ago` / `time.hours_ago` (`_one`/`_other`; ES also `_many`) | {{count}} min ago / {{count}} h ago | hace {{count}} min / hace {{count}} h | `{{age}}` everywhere (§35.2) |
| `time.min_ago_spoken` / `time.hours_ago_spoken` (plural) | {{count}} minute ago · {{count}} minutes ago / {{count}} hour ago · {{count}} hours ago | hace {{count}} minuto · hace {{count}} minutos / hace {{count}} hora · hace {{count}} horas | spoken `{{age}}` (TTS, a11y labels) |
| `settings.language_changed` | Language changed to {{language}}. | Idioma cambiado a {{language}}. | §35.5 |
| `settings.language_system` | Change in system settings | Cambiar en la configuración del sistema | §35.5 |

- **Guards that apply to this table:** the banned-words, countdown and spoken guards (§3.12) scan every row. The spoken guard (A §3.12) covers keys ending `_spoken` (including plural forms `_spoken_one/_other/_many`), the status slots `spoken`/`spoken_*`, `*.tts`, the whole `drive.tts.*` namespace and `drive.autoend.prompt` (all spoken). No row contains a single-number travel time or a countdown; `{{total}}` is a trip duration and "10 minutes" in `drive.autoend.prompt` is elapsed stop time, not a forecast.
- **Retired names:** "Forget this device" is never used — the action is `settings.delete_alert_data` "Delete my alert data" everywhere (B §13.16.6). The capability banner never says "open"; buttons never start with "Open"/"Abrir" (§3.12).
- **Key-inventory test** (`i18n-key-inventory-test.ts`, §36.1): a static scan of `src/**` for `t('…')`/`i18nKey="…"` literals asserts that every key exists in both `en.json` and `es.json`, and that every key in this table exists there too.

**Done when (§35):** 100 % of UI, a11y labels, TTS, notification text, permission prompts (§27.4) and the privacy policy (`docs/privacy/index.md`, EN + `## Español`, F106) exist in EN and ES; every §35.7 row is in both locale files (key-inventory test green); parity, banned-words and spoken guards pass; switching language updates UI, notification actions, channel names, voice and server locale without a restart; `es-pending-review.json` is empty or its gaps are disclosed.

---

## §36. Testing, performance, error handling & release

### 36.1 Unit & component tests (jest-expo, Jest 29, RNTL 14; files in `src/__tests__/`, `*-test.ts(x)`)

Fixtures use only the test crossing `test-0001`…`test-0003` and real gauge ids/names from C §16.18 (e.g. `USGS-08154700` "Bull Ck at Loop 360 nr Austin"); never an invented gauge, creek or road name. A test that must contain a forbidden literal builds it by string concatenation (§3.12), so the repo-guard greps (which also exclude `__tests__/`) stay clean.

| File | Asserts |
|---|---|
| `copy-banned-test.ts` | §3.12 banned words (Jest side; the pytest side is `backend/tests/test_copy_banned.py`), countdown and spoken guards (incl. `_spoken_<plural>`, `drive.tts.*`), static code guards (no `Success` haptic, no green token in the 75°–165° hue band) |
| `i18n-parity-test.ts` | EN/ES key parity, `_one/_other/_many`, no stray English in ES |
| `i18n-key-inventory-test.ts` | every `t('…')` literal in `src/**` and every §35.7 row exists in `en.json` and `es.json` |
| `tokens-parity-test.ts`, `contrast-test.ts` | §9.13 |
| `risk-state-test.ts` | wire ↔ enum mapping, RANK order, `displayRisk` source/official/tier handling, missing crossing → UNKNOWN |
| `snapshot-parse-test.ts` | (§28.5) one crossing with a retired state name → only that crossing renders UNKNOWN, the error is logged, the rest renders; an envelope error fails the rung |
| `staleness-test.ts` | fake clock: ≤ 10 min fresh, 10–20 aging, > 20 UNKNOWN with last-known WATCH/AVOID/CLOSED, `data_status: offline`, clock-skew offset, `stale_after_s` below 1,200 honored |
| `windows-test.ts` | visual/spoken ranges, `lo = 0` → "may already be on the road" (never "0–" or "now–"), `travelRange()` → `{{tau_lo}}–{{tau_hi}}` only, no single-number ETA or travel time for any input |
| `schema-contract-test.ts` | `SnapshotV1`, `ReplayV1`, `ReplayIndex`, `RouteResponse` parse `docs/schemas/{snapshot,replay,route}.v1.example.json` (the same files pass pydantic, §7.1); `ReplayV1` accepts explicit `null`s and absent optional fields (tier-B crossing, `hero: null`, null metrics) and rejects retired state names; `RouteRequest` rejects a nested `replay` object or any extra key; the body `checkRoute()` builds has exactly `origin, destination, lang, want_detour, replay_at, storm_id` |
| `realtime-merge-test.ts`, `realtime-lifecycle-test.ts` | older `seq` ignored; merge keeps snapshot `as_of`; malformed rows dropped; stop/background/unmount never resubscribe (§28.4) |
| `replay-frames-test.ts` | `stateAt` (incl. `initial_state`), `visibleSamples` future-poison fixture, **outage fixture** (samples inside a documented outage stay hidden until its `end`, then appear), callout = `hero.lead_min` of the example JSON, `heroStormId()` falls back to the first storm by `sort_order` |
| `replay-loader-test.ts` | `file_sha256` or `timeline_sha256` mismatch → `ReplayIntegrityError`; zod failure → `replay.unavailable`; Storage override used only when verified and newer |
| `replay-drive-test.ts` (F128) | `ReplayDriveSource` emits fixes along the path at ~15 m/s with a heading toward the target; Drive Mode in `mode: 'replay'` renders the REPLAY banner and `replay.simulated_drive`; spies prove no geofence registration, no `/v1/devices` call, no live-cache or React Query write; at most one demo notification, on `updates` |
| `lockout-test.ts` | locks after 5 s ≥ 4.5 m/s; passenger unlock per trip; relock after 3 min < 1 m/s |
| `drive-suggest-test.ts` [Stretch F62] | `shouldSuggestDrive` needs median > 6.7 m/s over 15 s (accuracy < 50 m) or automotive activity; a 5 s burst at 5 m/s locks (F59) but does **not** suggest |
| `speech-queue-test.ts` | AVOID pre-empts; ≤ 1 per crossing per 60 s; `drive.tts.multi_changed` merge; mute keeps chime/haptic; only spoken/tts keys reach `Speech.speak` |
| `geofence-rotation-test.ts` [Stretch F70] | iOS 19 + re-rank fence; Android default cap 60 (`GEOFENCE_CAP_ANDROID`, never above 100); scoring; zero candidates → stop |
| `subscriptions-test.ts` | `computeSubscriptions` returns only `{crossing_id, reason ∈ starred/saved_place/saved_route, want_watch}`; `want_watch` defaults to false; the 4,828 m default radius; the serialized `PUT …/subscriptions` body contains no `lat`, `lon`, `lng`, `coordinates`, `radius` or place field; ≤ 300 items |
| `search-request-test.ts` [Stretch F52] | the `/v1/search` URL carries only `q` and `lang` (no location, even with a fix in memory) |
| `on-route-test.ts` | Turf 7.4 `totalDistance`, 40/60 m tolerance, ordering, matching by `crossings_on_baseline[].id`, detour sanity check |
| `handoff-url-test.ts` | Google `%7C`-encoded ≤ 3 waypoints, no `dir_action` with waypoints; Apple unified URL for iOS "18.4", "18.10" and "26.0", legacy for "18.3" and "17.5" (integer major/minor parse); Waze lat,lng order |
| `notification-content-test.ts` | `channelFor` per state and kind; `timeSensitive` only with the capability; ranges only; geofence last-known body uses the state word from data; **replay demo: EN/ES body starts with "REPLAY — not a live alert:" / "REPRODUCCIÓN — no es una alerta real:", channel `updates`, `passive`, never `crossing-urgent`**; test alert = `alerts.test` on `crossing-urgent`; ES text |
| `announce-test.ts` | ≤ 1 per 10 s, merge (`a11y.many_changed`), high-priority flush |
| `capabilities-test.ts` | Expo Go → native caps false; registration helpers return `expoGo` |
| `about-claims-test.tsx` | About → "What's built" renders exactly the rows of `claims.generated.json` (same order, text and badges; B §13.17.3); no claim text in `capabilities.ts` |
| `demo-flag-test.ts` | `eas.json` never sets `EXPO_PUBLIC_DEMO_MODE=1` in `preview`/`production`; DEMO_MODE's storm comes from `heroStormId()` |
| `status-chip-test.tsx`, `crossing-sheet-test.tsx`, `area-card-test.tsx`, `scrubber-test.tsx` | roles/labels starting with visible text, all 5 states, header focus order, adjustable actions, scrubber value never contains a minutes-until-flood phrase, LoadingState ≠ NO_RISE |

### 36.2 Maestro E2E (F124; `.maestro/`, run against the preview APK, `appId: org.fordcast.app`)

Flows (all five are [MVP]): `onboarding.yaml` (language pill → pledge → map), `map-to-crossing.yaml` (List → row → sheet header text), `replay-demo.yaml` (Replay → hero storm → Skip to action → 60× → results number visible), `settings-language.yaml` (Español → tab labels + a chip word change), `drive-replay.yaml` (F128: hero storm → More → "Drive this storm (simulated)" → AVOID HUD with both labels). Manual (logged in the devlog, not automated): airplane-mode checklist (§29.11), Drive Mode voice on a real drive, push from the backend. Use `testID`s (stable across languages), never visible text, for taps.

**No flow hard-codes a storm.** The replay flows use `${HERO_STORM_ID}`, which `scripts/hero-storm.mjs` reads from the generated `mobile/assets/replays/index.json` with the same rule as `heroStormId()` (33.1: `hero_storm_id`, else the first storm by `sort_order`). `StormCard` renders ``testID={`storm-card-${entry.id}`}``. Run all flows with:
```bash
# mobile/ — `npm run e2e` (VERIFY BEFORE USE: Maestro's `-e KEY=VALUE` parameter flag and `${KEY}` interpolation in the installed CLI)
maestro test -e HERO_STORM_ID="$(node scripts/hero-storm.mjs)" .maestro
```
```js
// mobile/scripts/hero-storm.mjs — prints the storm id the replay flows use
import { readFileSync } from 'node:fs';
const ix = JSON.parse(readFileSync(new URL('../assets/replays/index.json', import.meta.url), 'utf8'));
const first = [...ix.storms].sort((a, b) => a.sort_order - b.sort_order)[0];
const id = process.env.HERO_STORM_ID || ix.hero_storm_id || first?.id;
if (!id) { console.error('no bundled storm in assets/replays/index.json — run `make app-data`'); process.exit(1); }
process.stdout.write(id);
```
```yaml
# .maestro/replay-demo.yaml
appId: org.fordcast.app
---
- launchApp
- tapOn: { id: "tab-replay" }
- tapOn: { id: "storm-card-${HERO_STORM_ID}" }
- tapOn: { id: "replay-skip-to-action" }
- tapOn: { id: "replay-speed-60" }
- tapOn: { id: "replay-play" }
- extendedWaitUntil: { visible: { id: "replay-results-number" }, timeout: 120000 }
- assertVisible: { id: "replay-banner" }
- assertVisible: { id: "replay-honesty" }
- takeScreenshot: replay-result
```
```yaml
# .maestro/drive-replay.yaml (F128)
appId: org.fordcast.app
---
- launchApp
- tapOn: { id: "tab-replay" }
- tapOn: { id: "storm-card-${HERO_STORM_ID}" }
- tapOn: { id: "replay-more" }
- tapOn: { id: "replay-drive-cta" }
- tapOn: { id: "drive-start" }
- assertVisible: { id: "replay-banner" }
- assertVisible: { id: "drive-simulated-label" }
- extendedWaitUntil: { visible: { id: "drive-hud-state-avoid" }, timeout: 90000 }
- assertVisible: { id: "replay-banner" }
- assertVisible: { id: "drive-simulated-label" }
- takeScreenshot: drive-replay-avoid
- tapOn: { id: "drive-end" }
- tapOn: { id: "drive-end-confirm" }
```
Expo Go runs use `appId: host.exp.Exponent`. Install Maestro per maestro.mobile.dev (VERIFY BEFORE USE: current install command); iOS flows need a Mac. `drive-replay.yaml` needs no location permission (the Replay drive uses `ReplayDriveSource`).

### 36.3 CI (`mobile` and `docs-guards` jobs in `.github/workflows/ci.yml`, C §24.9)

Every gate this Part references runs in CI; C §24.9 holds the YAML and this list must match it step for step:
- **`mobile` job:** `npm ci` → `npm run typecheck` → `npm run lint` → `npm test -- --ci` (every §36.1 file, including the Jest banned-words, countdown and spoken guards, i18n parity and key inventory, staleness, windows, replay frames incl. the outage fixture, schema contracts incl. `route.v1`) → `node scripts/check-pins.mjs` → `npx expo install --check` → `npx expo-doctor@latest` → the mobile secret grep "No server secrets in the app" (no `sb_secret_`, `X-Api-Key`, `ORS_API_KEY`, `STADIA_KEY`, `EXPO_ACCESS_TOKEN` in `src`, `app.config.ts`, `eas.json`; `__tests__/` excluded; §27.13).
- **`docs-guards` job:** the hand-typed-metric check (§7.1; README, `submission/answers.md`, `mobile/src`), `make claims && git diff --exit-code`, `make app-data && git diff --exit-code` (the bundled replays, results, `index.json` and `assets.ts` are exactly what the generators produce), cross-references and no unresolved review notes in `docs/master-prompt/`.
- **`backend` job** (C §24.9; listed so nothing is assumed): pytest banned words + countdown guard, no-lookahead and outage tests, `replay-verify --all` against `data/latency/gauge_latency.json`, and `make backtest CHECK=1` against the committed `results.json`.
- Maestro runs locally/on demand (needs a device) and before every preview build; its results are logged in the devlog.

### 36.4 Performance budgets & how to measure (targets from §7.4)

| Budget | Target | Measure (release-like build: preview APK or `--no-dev --minify`) |
|---|---|---|
| Cold start → interactive Map Home (cached data, mid-range Android) | ≤ 2.5 s | `adb shell am start -W -n org.fordcast.app/.MainActivity` (TotalTime) + first-frame log |
| Map pan/zoom with all crossings + ≤ 20 pulses | ≥ 55 fps, ≤ 2 loops | Perf Monitor (dev menu) on the dev build + visual check on the preview APK; `adb shell dumpsys gfxinfo org.fordcast.app` for UI-thread jank |
| Replay at 60× | no JS task > 100 ms; memory growth < 50 MB / 10 min | Perf Monitor JS fps; `adb shell dumpsys meminfo org.fordcast.app` before/after |
| Replay parse | < 150 ms per timeline (target) | `performance.now()` around `loadReplay` (dev log) |
| Snapshot | ≤ 10 KB gzipped | server-side (§20) |
| Bundled replays | ≤ 150 KB each, ≤ 1 MB total | the replay builder fails over budget (C §19.11); `make app-data` copies only those files, and CI's `docs-guards` re-runs it and fails on any diff (36.3) |
| JS bundle | log per preview build; investigate a > 20 % jump | `npx expo export --platform android` → size of the `.hbc` under `dist/` |
| APK size | log per preview build | EAS artifact size in the devlog |
| Battery | no continuous background location outside Drive Mode | `adb shell dumpsys location` shows no active request when Drive Mode is off |

### 36.5 Error handling & retry UX

Route `ErrorBoundary`s (§28.9) show `errors.root` + [Try again] (`common.retry`) + [Back to map]; every query error shows an inline retry row (`errors.inline` + `common.retry`), never a blank panel; slow API calls show `common.waking_server` after 3 s; snapshot failures follow the ladder and the 20-min UNKNOWN rule; `snapshot.config.min_app_version` above the app → blocking card `errors.update_required` (Replay still works); style failure → `errors.map_details`; routing 429 → `routing.busy`; a corrupt replay → `replay.unavailable`; `HttpError`/`ProblemError` messages map to these `errors.*`/§35.7 keys (B §13.20 is the case table); Drive Mode errors are spoken once (`drive.tts.stopped`, `drive.tts.offline`); no error path renders a calm state.

### 36.6 Sentry [Stretch F125]

Decided before the Day-1 build (§1.2 D1): `@sentry/react-native` (~7.11.0) is in the first-build install list (§25.4) **only if** a test EAS build succeeds without `SENTRY_AUTH_TOKEN` (VERIFY BEFORE USE: `SENTRY_DISABLE_AUTO_UPLOAD=true` skips the source-map upload); otherwise it is uninstalled and F125 becomes Roadmap — it can't be added later without a new native build. `FORDCAST_SENTRY=1` adds the plugin (§27.3), metro composition (§27.6). `Sentry.init({ dsn, sendDefaultPii: false, beforeSend: scrub, beforeBreadcrumb: scrubCrumb })` where `scrub` deletes `lat/lon/lng/latitude/longitude/coordinates/origin/destination` keys, strips query strings from URLs and drops breadcrumbs from location/route modules; wrap the root with `Sentry.wrap`. Expo Go reports JS errors only. Done when (F125): a test crash appears in Sentry with no coordinate, route endpoint, search text or push token in the event.

### 36.7 Release (judge APK, F126)

1. Clean checkout of the release commit; `npm ci`; all §7.1 gates green; `EXPO_PUBLIC_DEMO_MODE` unset.
2. `npx eas-cli@latest build -p android --profile preview` → download the APK; `sha256sum fordcast-<version>-preview.apk`.
3. Smoke on two devices: onboarding, live calm map, crossing sheet, Replay offline (hero storm), Replay drive (F128) with both labels, Spanish, TalkBack spot-check, notification test; run the five Maestro flows (§36.2).
4. Publishing a public GitHub Release is a stop-and-ask (§1.7): `gh release create v<version>-cac --title "FordCast <version> (CAC 2026)" fordcast-<version>-preview.apk docs/results/results.json --notes-file docs/release-notes.md` with the sha256 in the notes; README links the release (and the EAS internal URL, which is open to anyone with the link).
5. Record the EAS build id, update group id and commit in `docs/devlog.md`; tag `cac-2026-submission` on the submitted commit (§40).
6. After submission: JS fixes via `eas update --channel preview` only (§26.6); never app-store publishing before judging.

**Done when (§36):** CI runs every listed unit test green, and the `mobile`/`docs-guards` steps match C §24.9; the five Maestro flows (`onboarding`, `map-to-crossing`, `replay-demo`, `settings-language`, `drive-replay`) pass on the preview APK using `HERO_STORM_ID` from the generated `index.json` (no flow names a storm); budgets are measured and logged (misses filed as issues); the release has APK + sha256 + `results.json`.

---

## §37. Gotchas (must-know pitfalls, each with the fix)

**SDK, builds, tooling**
1. App Store Expo Go stops at SDK 54 → Android-first dev build; iOS only via Lane B/C (§26).
2. SDK 58 will replace SDK 57 in store Expo Go → never `expo@latest`; judges use the preview APK.
3. npm `latest` ≠ SDK pin (Reanimated 4.7.1 vs **4.5.1**, Worklets 0.13 vs **0.10.1**, RNGH 3.3 vs **~2.32**, Skia 2.14 vs **2.6.2**, FlashList 2.3.3 vs **2.0.2**, Sentry 8.30 vs **~7.11**, react-native-maps 1.29.11 vs **1.27.2**) → `npx expo install`; `check-pins.mjs` in CI.
4. Reanimated 4.5.1 needs worklets 0.10.x exactly and RN 0.83–0.86 → install both via `npx expo install`.
5. Installing `expo-dev-client` makes `npx expo start` open the dev client → `npx expo start --go` (or press `s`) for Expo Go.
6. EAS free queue can exceed 90 min and builds are ~15/month → front-load every native module into the Day-1 build (the decided list: §1.2 D1, §25.4 — `lottie-react-native` and `react-native-keyboard-controller` in, `expo-mesh-gradient` and `@react-native-ama/core` out, Sentry only if it builds without an auth token); JS via EAS Update.
7. `expo prebuild` (CNG) regenerates `android/`/`ios/` → never hand-edit them; keep them git-ignored.
8. `runtimeVersion: appVersion` → any native change needs a version bump + build; never ship an OTA that needs new native code.
9. `typescript@latest` (7.0.2) breaks typescript-eslint; ESLint 10 breaks eslint-plugin-react → TS ~6.0.3, ESLint ^9.39.5.
10. The default template enables React Compiler → `experiments.reactCompiler: false` (NativeWind v4 interaction unverified).
11. RNTL 14 needs the `test-renderer` peer → fall back to 13.3.3 if it fails; `react-test-renderer` is deprecated.
12. Expo `with-victory-native` (legacy v35) and `with-tailwindcss` (NativeWind 5) examples → don't copy their configs.
13. RNR templates are on SDK 56 → never `rnr init`; copy the theming files (§12.2).
14. `create-expo-app` inside the monorepo may create `mobile/.git` → delete it.
15. Physical iPhone + Expo Go requires the same Expo account in CLI and app.

**Navigation & UI**
16. No `@react-navigation/*` imports (SDK 56+) → `expo-router/react-navigation`; lint-enforced.
17. NativeTabs import is `expo-router/unstable-native-tabs` on SDK 57 (docs on `main` show SDK 58's path); max 5 tabs on Android; tab-bar height can't be measured → constant `bottomInset` tuned on device.
18. `Tabs` from `'expo-router'` is deprecated → NativeTabs (or `expo-router/js-tabs`).
19. Android formSheet: ≤ 3 detents, no native header → titles inside content.
20. RNR portals render under native modals → local `<PortalHost name="sheet" />` inside formSheet/fullScreenModal screens.
21. gorhom v5 `enableDynamicSizing` defaults to true → set false with fixed snap points; `BottomSheetFlashList` is deprecated → `useBottomSheetScrollableCreator`; device-test on Day 1 (fallback: card + `nearby` formSheet).
22. NativeWind v4 needs Tailwind 3 and `content` globs covering `./src/**/*` → otherwise styles vanish silently; restart with `npx expo start -c`.
23. Android custom fonts don't synthesize weights → one family per weight, never `fontWeight` on Inter; iOS also needs `useFonts` names.
24. Android edge-to-edge is always on → `useSafeAreaInsets()` for HUD and sheets.
25. Android blur over the map is unreliable; `GlassView` falls back to a plain View → solid `rgba(14,23,38,0.92)` on Android, always pass a fallback background, never animate glass opacity to 0.
26. `expo-symbols` is beta → check every name in the dev gallery; fallback to a verified name or custom SVG.
27. `sonner-native` < 0.27 rejects worklets 0.10 → 0.27.0; toasts never carry safety info.
28. RN `borderStyle: 'dashed'` with radii is unreliable on Android → SVG `strokeDasharray` for UNKNOWN.
29. Dynamic Type: never cap body/status text; cap only map/HUD numerals.

**Map**
30. MapLibre RN v11 ≠ v10 → `Map`/`GeoJSONSource`/`Layer type=` with kebab-case `paint`/`layout`; read the shipped `.d.ts`.
31. Inter in a map `text-font` renders nothing → Noto Sans Regular/Bold/Italic only (OpenFreeMap glyphs).
32. A plain cluster can hide an AVOID → `clusterProperties.maxRank` coloring, tested.
33. `line-gradient` needs `lineMetrics` and can't be data-driven per feature → one source+layer per animated reach (≤ 3); reach order gauge → crossing.
34. Coordinates: GeoJSON/MapLibre `[lng, lat]`; nav URLs `lat,lng` → one `ll()` helper.
35. GL canvases are invisible to screen readers → container summary + List alternative.
36. Native-only modules at top level crash Expo Go → `isRunningInExpoGo()` + lazy `require` (never `Constants.executionEnvironment`). A lazy `require` prevents **evaluation**, not **bundling**: Metro resolves every `require()` at build time, so every module named in one must be installed (or the file deleted), and a `require` is never wrapped in try/catch (§29.13).
37. Attribution is mandatory (OSM, OpenFreeMap/OpenMapTiles, ORS) → attribution button, About, video end card.

**Location, notifications, voice**
38. Tasks must be defined at module top level and imported in `index.ts` before `expo-router/entry` → otherwise headless geofence events are lost.
39. iOS reports initial region state at registration → ignore Enter events within 10 s.
40. iOS `pausesUpdatesAutomatically` defaults to true natively → pass `false` in Drive Mode.
41. Android foreground-service location must start while the app is foregrounded.
42. `startGeofencingAsync` throws without Always permission (+ iOS location background mode) → gate and explain.
43. Android 11+ background permission opens system Settings; foreground must be granted first → primer copy.
44. iOS monitors 20 regions, Android 100 → rotate 19 + 1 re-rank fence on iOS; on Android FordCast's default cap is 60 for battery, configurable up to the OS limit of 100 (§30.3, §1.2 D5).
45. Android doesn't relaunch a killed app for geofence events → "alerts can arrive minutes late"; never claim guaranteed background alerts.
46. Create Android channels **before** requesting notification permission (Android 13 won't prompt otherwise); channel sound/importance are fixed at creation → change = new channel ID; channel IDs must match the server's `channelId`.
47. `interruptionLevel`: local `'timeSensitive'`, push `'time-sensitive'`; needs the entitlement (Lane B); Critical Alerts = Roadmap.
48. `shouldShowAlert` is deprecated → `shouldShowBanner` + `shouldShowList`.
49. Push `ttl: 1800` so stale flood warnings expire; `collapseId`/`tag` per crossing.
50. Never request DND bypass; no full-screen intents (Android 14 limits them).
51. expo-speech may be silent in iOS silent mode and has no Android audio focus → expo-audio `playsInSilentMode` + `duckOthers`, chime before TTS; verify on device; never expo-av.
52. Background TTS is unreliable → the notification is the background alert.

**Data, state, i18n**
53. Supabase free projects pause after 7 days of low activity → the 5-min tick keeps them alive; the app treats fetch failures as UNKNOWN.
54. Realtime is a hint; sockets die in the background → refetch the snapshot on reconnect/foreground; keep 60 s polling. Our own cleanup or `removeChannel` emits `CLOSED` → track `closedByUs` (or an AbortController) so cleanup and error paths never auto-resubscribe; reconnect with backoff only on an unexpected `CLOSED`/`CHANNEL_ERROR` while foregrounded (§28.4).
55. Client staleness is authoritative → 20-min rule with server-clock skew from the `Date` header.
56. Only the publishable Supabase key may ship → `env.ts` rejects anything else; RLS read-only.
57. Turf 7.4 renamed `nearestPointOnLine` properties → `totalDistance`/`pointDistance`/`segmentIndex`.
58. Hermes lacks `Intl.PluralRules` and dependable `RelativeTimeFormat`/`ListFormat`/unit formatting → `intl-pluralrules` first; ages and units from i18n strings.
59. JS `\b` is ASCII-only → Unicode lookarounds in the banned-words regex (§3.12).
60. Spanish plurals need `_many` → parity test.
61. TanStack v5 renamed `cacheTime` → `gcTime`; persister `maxAge` ≤ `gcTime`; never persist route/search queries.
62. Replay: never interpolate states; draw only samples with `t + avail_delay ≤ simT`; replay state never touches live caches.
63. Reanimated `useReducedMotion()` is a start-time value → `AccessibilityInfo` listeners via `A11yPrefsProvider`.
64. `accessibilityLanguage` is iOS-only; nested `accessible` Views are unreachable on iOS.
65. Per-screen orientation locks are unverified → MVP is portrait-only everywhere, Drive Mode included; landscape Drive Mode (and later Map Home) is Stretch F94, enabled only after the per-screen lock is verified on device (§8.7, §34.7).
66. Render cold starts → the app reads the Storage snapshot first; "Waking server…" for API-only calls; Starter plan from Oct 20.
67. EAS internal distribution URLs are open to anyone with the link → share intentionally; no store publishing before judging.

**Contracts & demo integrity**
68. zod `.optional()` rejects `null`, and C always sends nullable fields as explicit `null` (§22.3) → `.nullable()` for them, `.nullish()` only for fields C marks optional (§28.5, §33.2); otherwise a valid storm shows "Unavailable".
69. The route request is flat: `replay_at` + `storm_id`, never a nested `replay` object; the server is `extra="forbid"` → 422 (§32.2). Responses use `issued_at`, `risk_as_of`, `crossings_on_baseline[].id`, `provider: 'ors' | 'stadia'`; `docs/schemas/route.v1.example.json` is checked by both zod and pydantic.
70. Read as a float, iOS "18.10" becomes 18.1 (< 18.4) → the Apple Maps version check parses major and minor as integers (`String(Platform.Version).split('.').map(Number)`, §32.5, F53); never compare iOS versions as floats.
71. Place search and subscriptions must not leak location → `/v1/search` carries only `q` + `lang` (the server applies the fixed Austin bias, C §16.13); subscriptions carry crossing IDs computed on the phone, never a radius, place or coordinate, and there is no location-derived subscription (§31.4).
72. A replay demo notification that reuses live copy or the `crossing-urgent` channel reads like a real alert on the lock screen → `replay.notify_body` starts with "REPLAY — not a live alert:", channel `updates`, passive (§31.3, §33.8).
73. A Maestro flow that names a storm breaks when the bundled set or the hero changes → `${HERO_STORM_ID}` from the generated `index.json` (§36.2); the same `heroStormId()` rule drives the picker's featured card and DEMO_MODE.
74. A 2013-style transmission outage is not a gap in today's archive → hide the samples inside `gauges[].outages` until the outage end in `visibleSamples()`; otherwise the replay "sees" readings FordCast could not have had (§33.4, §33.7).

---
