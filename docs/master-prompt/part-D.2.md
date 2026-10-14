# PART D (continued) — §30–§37

> Same conventions as §25–§29: code is a correct skeleton; "VERIFY …" = **VERIFY BEFORE USE** (check the installed package's types or the device, log it in `docs/decisions/verifications.md`, use the stated fallback if it fails).

## §30. Location, geofencing, Drive Mode & voice

### 30.1 Permission flow (contextual, progressive; copy in §3.9/§13.3)

| Step | Trigger (never at launch) | Call | Denied → |
|---|---|---|---|
| 0 | Onboarding | none (no OS prompt) | — |
| 1 When-In-Use [MVP] | `permission/location` primer before the first "center on me", Check My Drive, or Drive Mode | `Location.requestForegroundPermissionsAsync()` | Map centers on Austin (30.2672, −97.7431); AreaStatusCard `no-location`; lockout can't run (30.6) |
| 2 Notifications [MVP] | after "Notify me", saving a place/route, or "Alert me" | §31.2 (channels first) | Alerts `CapabilityBanner notificationsOff` |
| 3 Always [Stretch F70] | Drive tab toggle "Alert me while I use other apps" → `permission/background` primer | `Location.requestBackgroundPermissionsAsync()` (foreground must already be granted; Android 11+ opens system Settings — the primer says "Tap **Allow all the time**"; iOS "Choose **Change to Always Allow**") | Everything works in the foreground; Settings row "Background alerts: off" → `Linking.openSettings()` |
| 4 Motion [Stretch F62] | Settings "Auto-suggest Drive Mode" | `Location.requestMotionActivityPermissionsAsync()` (verified in expo-location 57 source; Android `ACTIVITY_RECOGNITION`, iOS Motion & Fitness) | speed-only detection |

- **Approximate location:** Android exposes `android.accuracy: 'coarse'` in the permission response; iOS reduced accuracy exposure is **unverified** — VERIFY in `Location.types.d.ts`; fallback: if `coords.accuracy > 1000` m for 3 consecutive fixes, show "Precise location is needed for crossing alerts" with `Linking.openSettings()`.
- Re-check permissions on every `AppState` → active (users change them in Settings).

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
- `LocationSource` is an interface with `RealLocationSource` and `ReplayDriveSource` (30.7 "Replay drive"); Drive Mode never knows which one it has.

### 30.3 Geofence task + rotation [Stretch F70; dev build only]

```ts
// mobile/src/tasks/geofence.ts — imported by index.ts BEFORE expo-router/entry
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { openTaskDb, getMeta, displayRiskFromCache, alertedWithin, logAlert } from '@/features/offline/cache';
import { rerankGeofences, RERANK_ID } from '@/features/alerts/geofence-rotation';
import { buildCrossingAlert } from '@/features/alerts/notify';
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
      trigger: Platform.OS === 'android' ? { channelId: d.state === 'AVOID' || d.state === 'CLOSED' ? 'crossing-urgent' : 'crossing-watch' } : null,
    });
    await logAlert(db, d, 'geofence');
  });
```

**Rotation (`features/alerts/geofence-rotation.ts`)** — runs on app foreground, snapshot change, re-rank-fence exit, Drive Mode fixes (≤ 1/min), and background refresh:
1. Candidates = crossings whose display state is WATCH/AVOID/CLOSED, **or** UNKNOWN with last-known AVOID/CLOSED, within 25 km of the current position (`Location.getLastKnownPositionAsync()` in tasks; VERIFY availability in background).
2. Score = `{CLOSED:4, AVOID:3, WATCH:2, UNKNOWN-lastknown:3}[state] / (distanceKm + 0.5)`; ×1.5 if on a saved route/near a saved place; ×1.3 if within ±60° of the last heading.
3. Capacity: **iOS 19** crossings + 1 re-rank fence (iOS limit 20); **Android 60** (limit 100; capped for battery).
4. Crossing regions: `radius: 1000` m, `notifyOnEnter: true`, `notifyOnExit: false`.
5. Re-rank fence `RERANK_ID = '__rerank__'`: centered on the user, `radius = clamp(0.5 × distance to the nearest unregistered candidate, 1000, 5000)`, `notifyOnEnter: false`, `notifyOnExit: true`.
6. `await Location.startGeofencingAsync(GEOFENCE_TASK, regions)` (calling it again replaces the set) → save `geofencesRegisteredAt`, `geofenceSet`.
7. Zero candidates → `stopGeofencingAsync(GEOFENCE_TASK)` if `hasStartedGeofencingAsync` (zero battery when calm).
- Requirements: Always permission + `UIBackgroundModes: location` (iOS) or `startGeofencingAsync` throws; gate with `caps.geofencing`. iOS relaunches a terminated app for region events; **Android does not** restart a terminated app (vendor-dependent) — say "alerts can arrive minutes late" (`alerts.why_late`).

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
                       notificationColor: '#0E1726', killServiceOnDestroy: true },
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
- **Locked:** `SearchField` (typing), list scrolling beyond the collapsed sheet detent, Crew list, Settings text inputs, place editor. The map, the AreaStatusCard and the big "Start Drive Mode" button stay usable; a single banner offers Drive Mode.
- **Passenger unlock:** tapping a locked control opens the §13.12 dialog; `PassengerHoldButton` = 1.5 s press-and-hold with a progress ring, cancellable by sliding off; a11y action `activate` "Confirm I am a passenger". Unlock lasts for the current trip; re-locks after < 1 m/s for 3 min or relaunch; never offered inside Drive Mode; nothing is stored.
- Without foreground location permission the app **cannot** detect motion → no lockout; document this in Settings → Drive Mode and the README a11y/safety notes (honest limitation).
- **Drive suggestion [Stretch F62]:** median speed > 6.7 m/s over 15 s with accuracy < 50 m, or `Location.watchMotionActivityAsync` `activities.automotive.detected` with confidence ≥ Medium (VERIFY on device; unknown in Expo Go) → one giant banner "Driving? Switch to Drive Mode" (≥ 64 pt). Never auto-starts.

### 30.7 Drive Mode screen behavior [MVP F57–F61] (visuals §13.11)

- **Entry:** start sheet ("Mount your phone… FordCast will speak.") → [Start] (76 pt). On start: set audio mode, preload chimes, pick the voice (30.8), start the location source, `useKeepAwake('drive-mode')`, start background continuation if allowed (Stretch), start the Live Activity / sticky notification (Stretch, §31.9–31.10), build the HUD from cached risk.
- **Theme:** `driveNight` tokens (`#070D18`, text `#E6EBF2`); status word ≥ 32 pt, secondary ≥ 24 pt; ≤ 3 items per glance; ≤ 120 characters; targets ≥ 76 pt with ≥ 24 pt gaps; no typing, no list scrolling, no map gestures. Orientation `all`; landscape = two columns via `useWindowDimensions()` (`width > height`).
- **Speech queue (`speech-queue.ts`):** priority 2 = → AVOID/CLOSED (pre-empts: `Speech.stop()` then speak), 1 = → WATCH, UNKNOWN-ahead, offline notice, 0 = de-escalation updates. Never the same crossing more than once per 60 s; merge simultaneous changes ("Two crossings ahead changed. Avoid Bull Creek."). Each utterance: chime (`chime.wav` for priority 2, `chime_soft.wav` for 1, none for 0) → TTS (`*_tts`/`*_spoken` keys only, ≤ 12 words) → haptic per §11.6 (gated 1.5 s).
- **Repeat last alert:** 76 pt [Repeat] button; iOS `onMagicTap` on the Drive Mode root view. **Mute:** session-only; visible "Voice off" state; escalations still chime + haptic (never one channel).
- **Offline:** dashed FreshnessPill "Offline · risk from {time}"; spoken once: "FordCast is offline. Watch for water and barricades."
- **Auto-end [F61]:** speed < 1 m/s for 10 min → spoken prompt + 76 pt [End] / [Keep driving]; no answer in 60 s → end. **Exit:** [End] → dialog "End Drive Mode?" (secondary styling, local `PortalHost name="sheet"`).
- **Replay drive (MVP, honest demo on a dry day):** from the Replay player overflow, "Drive this storm (simulated)" opens Drive Mode with `mode: 'replay'`: the REPLAY banner plus "SIMULATED DRIVE" label stay visible; `ReplayDriveSource` moves a position along a real road polyline from §32 route results or a crossing-approach path generated at runtime with `@turf/along`; risk comes from the replay timeline (§33). No notifications are posted from replay drives except an explicitly labeled REPLAY local one (F66). This is what the video uses for the Drive Mode voice shot.

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
```
- **iOS audio-session decision (owned here):** default `useApplicationAudioSession: true` after `setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' })` so speech plays with the silent switch on **and** ducks music. VERIFY on a real iPhone (Lane B/C): silent switch on + music playing. Fallback: `useApplicationAudioSession: false` (system session ducks; may be silent in silent mode) + one-time tip `drive.silent_tip`.
- **Android:** expo-speech has no audio-focus handling; the expo-audio chime (`duckOthers`; also set `interruptionModeAndroid` if the d.ts has it — VERIFY) plays first. VERIFY on device that music ducks.
- Chime player: `createAudioPlayer(require('@/assets/sounds/chime.wav'))` (VERIFY `createAudioPlayer` vs `useAudioPlayer` in `expo-audio/build/*.d.ts`). Never `expo-av`.
- Rate default 0.95 (Settings slider 0.8–1.2; Expo normalizes 1.0 = normal). Language = app language (`en-US`/`es-US`), not the system's.
- **Background speech is unreliable on iOS** (geofence task, another app in front): the notification (sound + banner) is the background alert; TTS is guaranteed only in foreground Drive Mode.

### 30.9 Battery rules

No continuous background location outside an active Drive Mode session; `Accuracy.Balanced` for browsing; `High` only in Drive Mode; stop watches on background; geofences stopped when there are 0 candidates; dash/pulse loops pause when blurred; background refresh ≥ 15 min (inexact); never `BestForNavigation` unless actively driving and plugged in.

### 30.10 Expo Go degradation

`caps.geofencing/backgroundLocation/backgroundTask === false` → registration functions return `{ ok: false, reason: 'expoGo' }` and the Drive tab, Alerts tab and Settings show `CapabilityBanner kind="expoGo"`: "Background alerts need the FordCast app build. In this preview, FordCast warns you only while the app is open." Foreground Drive Mode, TTS, lockout and local notifications still work.

**Done when (§30):** on the Android dev build, a simulated drive (Android emulator route playback or the Replay drive) produces the AVOID approach with chime → EN and ES speech → haptic, in portrait and landscape; lockout engages within ~5 s above 4.5 m/s in a unit test and on a car ride (passenger only); with Always granted, entering a 1 km fence around a cached AVOID crossing posts a `crossing-urgent` notification while another app is in front; geofences stop when nothing is at risk; Expo Go shows the banner and never crashes.

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
      importance: Notifications.AndroidImportance.DEFAULT, lockscreenVisibility: V });
    await Notifications.setNotificationChannelAsync('updates', { name: t('channel.updates'),
      importance: Notifications.AndroidImportance.LOW, lockscreenVisibility: V });
    await Notifications.setNotificationChannelAsync('drive-mode', { name: t('channel.drive'),
      importance: Notifications.AndroidImportance.LOW, sound: null, lockscreenVisibility: V });
  }
  await Notifications.setNotificationCategoryAsync('crossing-alert', [
    { identifier: 'SHOW_DETOUR', buttonTitle: t('notif.action.show_detour'), options: { opensAppToForeground: true } },
    { identifier: 'OPEN_CARD',   buttonTitle: t('notif.action.details'),     options: { opensAppToForeground: true } },
    { identifier: 'MUTE_1H',     buttonTitle: t('notif.action.mute_1h'),     options: { opensAppToForeground: false } },
  ]);                                                    // F69 Stretch; re-registered on language change
}
```
Channel IDs are canonical (§3.8) and MUST equal the server's `channelId` values (§23), or Android won't show the notification. Android 13 shows no permission prompt until a channel exists — hence channels first. Never request DND access (`bypassDnd` stays false); never use full-screen intents.

### 31.2 Permission (in context only)

`permission/notifications` primer → `Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } })` (VERIFY the iOS options shape in the d.ts). Store the result in `device.pushStatus`. Triggers: first "Notify me", first saved place/route, the "Alert me" toggle, or Settings → Notifications. iOS time-sensitive delivery additionally needs the entitlement (Lane B) and the user's per-Focus allowance — Settings shows the F64 tip "To get FordCast alerts while Driving Focus is on, allow Time Sensitive notifications for FordCast" with `Linking.openSettings()`.

### 31.3 Content builder (local) and interruption levels

```ts
// mobile/src/features/alerts/notify.ts — all strings from the §3.7 bank; no countdowns; ranges only
export async function buildCrossingAlert(db: Db, d: DisplayRisk, kind: 'inapp' | 'geofence' | 'drive' | 'test' | 'replay')
  : Promise<Notifications.NotificationContentInput> {
  const c = await getCrossing(db, d.id); const name = c?.name ?? d.id;
  const k = d.state === 'UNKNOWN' ? 'state.unknown.geofence_lastknown' : `state.${toWire(d.state)}`;
  const [lo, hi] = d.window ?? [0, 0];
  const title = (kind === 'replay' ? t('replay.prefix') + ' · ' : '') + t(`${k}.push_title`, { name });
  const body = d.state === 'AVOID' && lo === 0 ? t('state.avoid.push_body_now')
    : d.state === 'WATCH' && !d.window ? t('state.watch.push_body_nowindow')
    : t(`${k}.push_body`, { name, lo, hi, source: officialSource(d), age: ageText(d) });
  return {
    title, body,
    data: { type: kind === 'replay' ? 'replay' : kind === 'test' ? 'test' : d.state === 'UNKNOWN' ? 'unknown' : 'risk',
            crossing_id: d.id, state: toWire(d.state), window: d.window, url: `fordcast://crossing/${d.id}` },   // same shape as §23.6
    categoryIdentifier: kind === 'test' ? undefined : 'crossing-alert',
    interruptionLevel: d.state === 'AVOID' || d.state === 'CLOSED' ? (caps.timeSensitive ? 'timeSensitive' : 'active')
                     : d.state === 'WATCH' || d.state === 'UNKNOWN' ? 'active' : 'passive',   // LOCAL 'timeSensitive'; push 'time-sensitive'
  };
}
```
- New keys introduced here (`state.unknown.geofence_lastknown.push_title/push_body`: EN "{{name}}: data offline" / "Last known: Avoid · {{age}}. Treat it as if it could flood." — ES "{{name}}: sin datos" / "Último estado conocido: Evite · {{age}}. Trátelo como si pudiera inundarse."; `replay.prefix` "REPLAY"/"REPRODUCCIÓN"; `notif.action.*`; `channel.*`) MUST be added to both locale files and `es-pending-review.json` (§35).
- Android channel per state (matches §3.8/§23.6): AVOID/CLOSED → `crossing-urgent`; WATCH → `crossing-watch`; UNKNOWN-with-last-known-AVOID/CLOSED (geofence approach only — §3.8 sends no UNKNOWN pushes) → `crossing-watch`; de-escalation → `updates`; replay demo → `crossing-watch` with the REPLAY prefix.
- **Test alert (F72):** local, `crossing-urgent`, title `alerts.test_title` ("TEST · Avoid: Example Crossing" / "PRUEBA · Evite: Cruce de ejemplo"), body "This is how a FordCast alert looks. No crossing is affected."; `data.type: 'test'`.

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
  await outbox.put('PUT', `/v1/devices/${deviceId}`, { expo_push_token: token, locale: lang(), tz: 'America/Chicago',
    alerts_enabled: settings.alertsEnabled, watch_alerts: settings.watchAlertsDefault /* false */, updates_enabled: true,
    quiet_start_min, quiet_end_min, app_version });                     // partial update → 204
  await syncSubscriptions();                                               // 31.4 below
}
// Every device call sends `Authorization: Device <device_id>:<secret>` (§22/§24). Calls go through `outbox` (SQLite) and are
// retried on reconnect, so toggles made offline still sync.
```
- **Subscriptions are crossing IDs only** (`PUT /v1/devices/{id}/subscriptions` with `{"items": [{"crossing_id", "reason", "want_watch"}]}`, ≤ 300 items, replaces the whole set; `extra="forbid"` server-side, so never add coordinates), computed on the device: saved crossings → `starred`; saved places → crossings within the place's radius chip (1/3/5 mi, `@turf/distance`) → `saved_place`; saved routes → crossings within 300 m of the stored route line (`@turf/point-to-line-distance`) → `saved_route`; optional `recent_area` (10 km of the last significant location, server-side expiry 12 h) [Stretch]. `want_watch` = that item's Watch opt-in (default `false`). Recompute when saved items or the crossing list change; send only when the set's hash changes. Coordinates never leave the phone.
- Token changes: re-run `registerDevice()` on every launch and when `Notifications.addPushTokenListener` fires (VERIFY the listener name). **Forget this device** (F106): `DELETE /v1/devices/{id}` + delete the SecureStore secret + clear `saved_*`, `alerts_log`, `outbox`, React Query cache.
- Watch pushes are **off by default** (opt-in per saved crossing/place/route).

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
    if (d.data.type === 'replay') return router.push('/replay');
    if (d.data.type === 'summary') return router.push('/alerts');            // data.url = fordcast://alerts
    if (d.data.type === 'test') return router.push('/alerts');
    if (resp.actionIdentifier === 'MUTE_1H' && cid) return muteCrossing(cid, 60); // local mute + [Stretch F69] PUT /v1/devices/{id}/mutes {crossing_id, minutes: 60}
    if (resp.actionIdentifier === 'SHOW_DETOUR' && cid && flags.features.handoff) return router.push({ pathname: '/drive/result', params: { avoid: cid } });
    if (cid) router.push(`/crossing/${cid}`);                              // default action + OPEN_CARD
    void markInboxRead(cid);
  };
  void Notifications.getLastNotificationResponseAsync().then((r) => r && route(r));    // cold start
  const s1 = Notifications.addNotificationResponseReceivedListener(route);
  const s2 = Notifications.addNotificationReceivedListener((n) => void addToInbox(n));   // foreground: inbox + AlertBanner
  return () => { s1.remove(); s2.remove(); };
}, []);
```
"Show detour" falls back to the crossing sheet when routing (F49/F50) isn't built. A push for a crossing the app now shows as UNKNOWN (stale data) still opens the sheet, which shows the honest UNKNOWN state.

### 31.6 Local alerts from the foreground (F66) and the escalation detector

`features/risk/escalation.ts` diffs the previous and new **display** states after every snapshot/Realtime merge, for crossings that are saved, on the active route, or within 10 km:
- escalation into WATCH/AVOID/CLOSED → `AlertBanner` (Avoid/Closed persist), inbox row (`kind: 'inapp'`), haptic, announcement (§34.4); if the app is backgrounded by the time it's processed, a local notification instead;
- → UNKNOWN → StaleBanner once per session per crossing; de-escalation → "Update" inbox row (+ Drive TTS);
- skip if the same crossing+state already arrived by push in the last 30 min (dedupe via `alerts_log`).

### 31.7 Push delivery facts the client must respect

Server sends only escalations, `ttl: 1800` (a late flood alert must expire), `collapseId`/`tag` = `crossing-<id>` (newer replaces older), `priority: high` for AVOID/CLOSED; receipts and `DeviceNotRegistered` pruning are server-side (§23). The client never sets a badge count, never retries pushes, and treats a missing push as normal (the in-app state is the truth). Data-only/`contentAvailable` pushes [Stretch] are only a hint to re-rank geofences; iOS throttles them.

### 31.8 Android sticky Drive Mode status [Stretch F111]

```ts
await Notifications.scheduleNotificationAsync({ identifier: 'drive-status',
  content: { title: t('drive.sticky_title'), body: hudLine /* "Avoid · Bull Creek · 2.3 mi" — no timers */, sticky: true,
             autoDismiss: false, color: '#0E1726', data: { url: 'fordcast://drive' } },
  trigger: { channelId: 'drive-mode' } });          // same identifier → updated in place; dismissNotificationAsync('drive-status') on End
```
It sits next to the location foreground-service notification; update it only on HUD changes.

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
- Lazy-required behind `caps.liveActivities`; `.start(props, 'fordcast://drive')` when Drive Mode starts or an AVOID/CLOSED appears on an active saved route; `.update()` on HUD change; `.end(...)` 30 min after dropping below Watch or on arrival; `Factory.getInstances()` recovers after relaunch. Set `staleDate` = now + 15 min on every update so `isStale` renders the Unknown styling "Data may be outdated · open FordCast" (VERIFY where `staleDate` is passed in the 57.0.24 API). Ranges only, never a timer. SF Symbols `exclamationmark.triangle.fill` / `exclamationmark.octagon.fill` / `xmark.octagon.fill` (verified names, §10.9). Do **not** add a `widgets[]` plugin entry for a Live Activity. Remote Live Activity pushes = Roadmap (F114).

### 31.10 Widgets, CarPlay, Critical Alerts

iOS widgets (F113, Stretch, Lane B, built last) follow §15.4 with expo-widgets; every entry prints "as of", entries > 30 min old render UNKNOWN. Android widgets (F114), CarPlay/Android Auto (F117) and iOS Critical Alerts (F118, needs Apple entitlement approval) are **Roadmap** — document only.

**Done when (§31):** all four channels exist with localized names after first launch (`adb shell dumpsys notification`); permission is requested only in context; a manual-source escalation on the backend pushes to a real Android phone with the right channel, ES text for an ES device, and a tap opens `crossing/[id]` from a killed app; the test alert works on the preview APK; Watch pushes are off until opted in; "Forget this device" removes the server row (verified in the DB) and local data.

---

## §32. Routing, geocoding & hand-off client [Stretch-1/2/3; MVP shell in §13.10]

### 32.1 Check My Drive flow (F49–F55)

1. **From:** current location (foreground permission) or a saved place. **To:** search (32.6), saved place, recent, or a long-pressed map point (reverse-geocoded for the label). Lockout (§30.6) applies to typing.
2. Tap **Check my drive** → `POST /v1/route` (below). While waiting > 3 s: "Waking server…" (Render).
3. Render the result card state from §13.10 (No rise on route · Watch · Avoid/Closed + detour · Unknown segments · No detour found · Routing offline/error), the route map (§29.6), "{n} crossings on route" chips, "as of {time}", attribution footer, and the persistent disclaimer.
4. Actions: [Open detour in …] → `handoff` sheet (32.5); [Start Drive Mode] with the route attached; [Save route] → SQLite `saved_routes` (geometry stays on the phone) → subscriptions (§31.4).

### 32.2 API contract (mirror of §22.5–§22.6; `routing/route-api.ts`)

```ts
const LngLat = z.tuple([z.number().min(-99.5).max(-96.5), z.number().min(29.0).max(31.5)]);   // server bbox (§22.9)
const LineStringGeo = z.object({ type: z.literal('LineString'), coordinates: z.array(z.tuple([z.number(), z.number()])).min(2) });
export const RouteRequest = z.object({ origin: LngLat, destination: LngLat, lang: z.enum(['en', 'es']), want_detour: z.boolean(),
  replay: z.object({ storm_id: z.string(), at: z.string() }).nullable() });   // F54: route against replay states → mode 'replay'
const OnRoute = z.object({ crossing_id: z.string(), state: WireState, window: Window.nullable(), tier: z.enum(['A', 'B', 'C']), along_m: z.number() });
const Leg = z.object({ geometry: LineStringGeo, duration_s: z.number(), distance_m: z.number() });
export const RouteResponse = z.object({
  mode: z.enum(['live', 'replay']), as_of: z.string(), risk_seq: z.number(), data_status: z.string(),
  baseline: Leg, crossings_on_route: z.array(OnRoute), verdict: WireState, monitored_count: z.number(), unknown_count: z.number(),
  detour: Leg.extend({ avoided: z.array(z.string()), still_on_route: z.array(z.string()) }).nullable(),
  detour_added_min: z.number().nullable(), warning: z.literal('no_detour_found').nullable(),
  via_points: z.array(z.tuple([z.number(), z.number()])).max(2), provider: z.string(), disclaimer_key: z.literal('SUPPLEMENTARY_TOOL'),
});
// POST ${API_BASE}/v1/route, 15 s timeout, no retry on 4xx. 429 → t('routing.busy'); 503 routing_unavailable / offline →
// t('routing.offline') + the last route from route_cache. A `mode: 'replay'` result is bannered REPLAY and never cached as live.
// Saved routes whose geometry is already on the phone may use POST /v1/route/check {geometry (≤ 500 points), buffer_m: 40, locale}
// → {verdict, monitored_count, unknown_count, hits[]} instead (no external routing call).
```
> NOTE TO REVIEWER: Part C §22.5 is internally inconsistent: its JSON example uses `crossings_on_route`, `provider: "openrouteservice"`, `as_of`/`risk_seq` and `replay: {storm_id, at}`, while the adjacent prose/review note uses `crossings_on_baseline`, `ors|stadia`, `issued_at`/`risk_as_of` and `replay_at`. This client follows the JSON example (and accepts any `provider` string). Resolve it once by adding `docs/schemas/route.v1.example.json`, validated by both pydantic and this zod schema in CI (§7.1).

### 32.3 Privacy

Only origin/destination are sent (5 decimals), through the non-logging backend proxy (ORS/Stadia keys stay server-side). Routes are not persisted by the server; locally, `route_cache` (7 days) and `saved_routes` stay on the phone. Search text is sent to `/v1/search` only, not logged server-side (§24).

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
- The client recomputes hits against **current display states** (works offline with cached risk) and must agree with the server's `crossings_on_route`; on disagreement, show the **more cautious** state.
- **Verdict** (§3.3): highest rank among hits; any UNKNOWN listed separately (`route.unknown_count`); calm copy "No rise detected at {c} monitored crossings on this route" — never "safe".
- **Detour sanity check:** if the server returns `warning: 'no_detour_found'` / non-empty `still_on_route`, **or** `crossingsOnRoute(detour)` still hits an AVOID/CLOSED crossing, show `routing.no_detour` and hide the hand-off.
- `detour_added_min` comes from the server; the UI shows "Detour adds {n} min ({total} min)".

### 32.5 Re-validation (F55) and hand-off (F53)

- **Re-validation:** on every display-state change of a crossing within 2 km of the active route, recompute the on-device verdict immediately; if a new AVOID/CLOSED appears on the route, re-call `/v1/route` (≤ 1/min); in Drive Mode also every 5 min. Show `route.changed` banner "Route status changed · {time}" with [View].
- **Hand-off URLs** (`routing/handoff.ts`):
```ts
const ll = ([lng, lat]: number[]) => `${lat.toFixed(6)},${lng.toFixed(6)}`;          // URLs are lat,lng; GeoJSON is lng,lat
export function googleUrl(o: number[], d: number[], vias: number[][]) {
  const wp = vias.slice(0, 3).map(ll).join('|');                                     // ≤ 3 waypoints on mobile; URL ≤ 2,048 chars
  return `https://www.google.com/maps/dir/?api=1&origin=${ll(o)}&destination=${ll(d)}&travelmode=driving` +
         (wp ? `&waypoints=${encodeURIComponent(wp)}` : '&dir_action=navigate');     // with waypoints: preview, user taps Start
}
export function appleUrl(o: number[], d: number[], vias: number[][]) {
  const v = Platform.OS === 'ios' ? parseFloat(String(Platform.Version)) : 0;
  if (v >= 18.4) return `https://maps.apple.com/directions?source=${ll(o)}&destination=${ll(d)}` +
                        vias.map((p) => `&waypoint=${ll(p)}`).join('') + '&mode=driving';   // unified Maps URL (verified)
  return `https://maps.apple.com/?saddr=${ll(o)}&daddr=${ll(vias[0] ?? d)}&dirflg=d`;   // legacy: leg 1 only (two-leg)
}
export const wazeUrl = (to: number[]) => `https://waze.com/ul?ll=${ll(to)}&navigate=yes&utm_source=fordcast`;   // no waypoints
```
- `handoff` sheet rows: Apple Maps (iOS only), Google Maps, Waze. Two-leg apps (Waze; Apple < 18.4) open leg 1 to `via_points[0]`; FordCast then watches for arrival within 150 m (Drive Mode proximity, or a temporary geofence on the via point when Always is granted) and posts a local notification "Detour point reached. Continue to your destination." with an action opening leg 2.
- Always show `state.avoid.handoff_warning`: "Your map app doesn't know about this forecast. If it routes you back toward {name}, don't follow it." Open with `Linking.openURL` (https URLs; `canOpenURL` checks only need `LSApplicationQueriesSchemes` for custom schemes).

### 32.6 Geocoding & search UI (F37 MVP crossings, F52 Stretch places)

- **Crossings (MVP, offline):** local search over SQLite `crossings` (name, road, creek), accent- and case-insensitive (`normalize('NFD').replace(/\p{M}/gu,'')`), ranked by prefix match then rank then distance.
- **Places (Stretch):** `GET ${API_BASE}/v1/search?q=&lat=&lon=&lang=` → server ORS Pelias autocomplete (Austin bbox) → Photon fallback; response `{ results: [{ id, label, sublabel, lng_lat: [lon, lat], source: 'ors' | 'photon' }] }` (§22.6). Client: debounce 350 ms, ≥ 3 characters, `AbortController` cancels stale requests; show **Saved places** and **recents** before any network call; "Use current location" row first; input `textContentType="fullStreetAddress"`, `autoComplete="street-address"` (WCAG 1.3.5).
- **Fallback chain on the client:** backend error/offline → `Location.geocodeAsync(text)` on submit only (no autocomplete; needs foreground permission on Android; rate-limited — "use sparingly"). Long-press reverse geocode: `GET /v1/geocode/reverse?lat=&lon=&lang=` → `{label, sublabel, source}`; on `404 not_found` or any error → `Location.reverseGeocodeAsync`.
- Empty: "No crossings or places match '{q}'. Try a road or creek name." (EmptyState).

### 32.7 Saved places & routes (F51)

SQLite `saved_places` (≤ 10; Home/School/Work/custom; radius chip 1/3/5 mi; Watch **off**, Avoid/Closed on; turning Avoid/Closed off asks for confirmation) and `saved_routes` (name, endpoints, geometry, usual departure time [Roadmap F56 reminder], last verdict). Editing never asks for data the app already has (WCAG 3.3.7). Every change recomputes crossing-ID subscriptions (§31.4).

**Attribution footer** (Check My Drive): "Routing © openrouteservice.org by HeiGIT · Map data © OpenStreetMap contributors" (VERIFY ORS's requested wording; OSM credit mandatory).

**Done when (§32):** a Home → School check returns a verdict that matches both server and Turf; an AVOID replay crossing (request `replay: {storm_id, at}`) produces a detour with "+N min" and a REPLAY banner; the hand-off opens Google Maps with the via point; offline shows `routing.offline` with the last route; no request body or coordinates appear in backend logs (checked once with log inspection).

---
## §33. In-app Storm Replay player [MVP F75–F80, F83; Stretch F81–F82]

The replay **engine** (one `tick()`, `available_at`, no-lookahead tests, golden hashes) is §19. The app only **plays back** precomputed `fordcast.replay.v1` timelines — it never runs the model, never interpolates states, and never sees data the pipeline couldn't see.

### 33.1 Assets and loading

- `tools/build_replays.py` (§19.14) writes `mobile/assets/replays/<id>.json.gz` (gzip `mtime=0`, so bytes are deterministic) and `mobile/assets/replays/index.json` (`fordcast.replay-index.v1`: `storms[] = { id, name_en, name_es, start, end, file, bytes, file_sha256, content_sha256, model_version, featured, sort_order, median_lead_min, n_crossings }`), plus `assets/results/results.json`. `file_sha256` = sha256 of the **gz bytes**; `content_sha256` excludes `pipeline` and is checked by CI, not on the phone. Budgets: ≤ 150 KB gz per storm, ≤ 1 MB total.
- Index entry schema: `ReplayIndexEntry = z.object({ id, name_en, name_es, start, end, file, bytes: z.number().optional(), bytes_gz: z.number().optional(), file_sha256, content_sha256, timeline_sha256: z.string().optional(), model_version, featured: z.boolean(), sort_order: z.number(), median_lead_min: z.number().nullable(), n_crossings: z.number() })` inside `{ schema: 'fordcast.replay-index.v1', generated_at, storms: [...] }` (Part C §19.14 shows `bytes`, its review note says `bytes_gz`; both are accepted).
- `metro.config.js` adds `gz` to `assetExts` (§27.6); `src/features/replay/assets.ts` maps ids to `require('@/assets/replays/<id>.json.gz')` (static requires only, generated by `build_replays.py`).
```ts
// mobile/src/features/replay/loader.ts
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';               // VERIFY: SDK 57 File API (.bytes()); fallback 'expo-file-system/legacy' base64 read
import { gunzipSync, strFromU8 } from 'fflate';          // VERIFY (§25.2); fallback: ship plain <id>.json and lazy-require it
import * as Crypto from 'expo-crypto';                   // VERIFY: Crypto.digest(CryptoDigestAlgorithm.SHA256, bytes) → ArrayBuffer
const memo = new Map<string, ReplayV1>();               // ≤ 2 parsed timelines in memory
export async function loadReplay(entry: ReplayIndexEntry): Promise<ReplayV1> {
  const hit = memo.get(entry.id); if (hit) return hit;
  const override = await storageSync.cachedOverride(entry.id);       // { bytes, file_sha256 } of a verified newer Storage copy, or null
  const gz = override?.bytes ?? (await readAssetBytes(REPLAY_ASSETS[entry.id]!));
  const expected = override?.file_sha256 ?? entry.file_sha256;
  const actual = toHex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, gz));
  if (actual !== expected) throw new ReplayIntegrityError(entry.id);            // file_sha256: the .gz bytes (gzip mtime=0)
  const text = strFromU8(gunzipSync(gz));
  if (entry.timeline_sha256 && !override &&                                     // §19.9: sha of the uncompressed canonical JSON
      (await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text)) !== entry.timeline_sha256)
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
- **Storage mirror (F76, §19.15):** when online and the Replay tab gains focus, fetch `REPLAY_INDEX_URL`; for any storm whose remote `file_sha256` differs from the bundled one and whose schema is supported, download `${STORAGE_PUBLIC}/replays/<id>.v1.<file_sha256[:12]>.json.gz` (immutable, content-hashed), verify its sha256 against the remote index, zod-validate, then keep the bytes in the app's document directory and record `{id, file_sha256}` in `meta.replayOverrides`. Any failure keeps the bundled copy. The ⓘ panel shows "Timeline sha256 {first 7} · model {model_version} · generated {date}". Process rule (§6.2): after the science freeze, Storage timelines change only together with `results.json`, README and video.
- If `expo-crypto` can't hash bytes (VERIFY fails): drop on-device hashing (`HASH_ON_DEVICE = false`), disable Storage overrides entirely, and use only the bundled files, whose hashes CI already verifies at build time (§19.9); zod validation still runs.
- **Integrity failure** (`ReplayIntegrityError`, zod failure, missing asset) → StormCard "Unavailable — reinstall or update the app" (§13.20); other storms unaffected; never a partially parsed storm.
- Replay works **fully offline** from bundled files (airplane-mode test §36.2).

### 33.2 Schema (mirror of §19.11 `fordcast.replay.v1`)

```ts
// mobile/src/features/replay/schema.ts
const Iso = z.string();                                   // ISO-8601 UTC
export const ReplayV1 = z.object({
  schema: z.literal('fordcast.replay.v1'),
  storm: z.object({ id: z.string(), name_en: z.string(), name_es: z.string(), start: Iso, end: Iso, tz: z.literal('America/Chicago'),
                    headline_event: Iso.optional(), description_en: z.string().optional(), description_es: z.string().optional() }),
  step_s: z.literal(300),
  assumptions: z.object({
    data_delay_min: z.union([z.number(), z.record(z.string(), z.number())]),   // §19.11 example: per-gauge map; tolerate a single number
    data_delay_min_by_gauge: z.record(z.string(), z.number()).optional(), default_delay_min: z.number().optional(),
    official_status: z.string(), values: z.string().optional(), params: z.string().optional(), rain: z.string().nullable().optional(),
  }),
  pipeline: z.object({ git_sha: z.string(), model_version: z.string(), data_sha256: z.string(), generated_at: Iso }),
  gauges: z.array(z.object({ id: z.string(), name: z.string(), lon: z.number(), lat: z.number(), t0: Iso, dt_s: z.number(),
    stage_ft: z.array(z.number().nullable()),           // null = gap (e.g., the 2013 US 183 outage) → hatched "No data"
    avail_delay_s: z.number(), nws_categories: z.record(z.string(), z.number()).nullable().optional() })),
  crossings: z.array(z.object({ id: z.string(), name: z.string(), name_es: z.string().optional(), lon: z.number(), lat: z.number(),
    tier: z.enum(['A', 'B', 'C']), initial_state: WireState, overtop_stage_ft: z.number().optional(), target_gauge_id: z.string().optional() })),
  links: z.array(z.object({ crossing_id: z.string(), gauge_id: z.string(), relation: z.string(), is_primary: z.boolean(),
    tau_min: z.number(), tau_p25: z.number(), tau_p75: z.number(), trigger_ft: z.number().nullable(), watch_ft: z.number().nullable(),
    channel_dist_km: z.number().nullable(), flowline: z.array(z.tuple([z.number(), z.number()])) })),   // ordered gauge → crossing
  events: z.array(z.object({ t: Iso, crossing_id: z.string(), state: WireState, window: Window.nullable(), reasons: z.array(Reason),
    p: z.tuple([z.number(), z.number(), z.number()]).nullable(), held: z.boolean() })),           // state changes only, sorted by t
  pulses: z.array(z.object({ crossing_id: z.string(), gauge_id: z.string(), t_trigger: Iso, tau_min: z.number() })),
  alerts: z.array(z.object({ id: z.string(), event: z.string(), sent: Iso, expires: Iso }).passthrough()).optional(),   // Stretch F82
  truth: z.array(z.object({ crossing_id: z.string(), onset: Iso, end: Iso.optional(), quality: z.string(), censored: z.boolean() })),
  metrics: z.record(z.string(), z.unknown()),            // per-storm rows (same shape as results.json); values may be null (e.g. the
                                                         // Llano 2018 control storm has no onsets → POD undefined) → MetricTile "—"
  hero: z.object({ crossing_id: z.string(), lead_min: z.number().nullable(), level: z.literal('avoid'), onset: Iso, first_alert_at: Iso }).nullable(),
  storyboard: z.array(z.object({ t: Iso, kind: z.string(), en: z.string(), es: z.string() })),
});
```
Contract test: `docs/schemas/replay.v1.example.json` parses here and in pydantic (§7.1). `truth` is display-only (Reveal truth, result banner) and never drives a state.

### 33.3 Replay clock (`clock.ts`, `player-store.ts`)

- `simT` is a Reanimated shared value (ms since epoch). A `useFrameCallback` advances it while playing: `simT += frameDtMs × speed`, clamped to `storm.end`. Speeds **1× · 10× · 30× · 60× (default) · 120×** (SpeedToggle shows 1×/10×/60× plus a "More" menu with 30×/120×, §12.5). 60× = one storm-minute per wall-second.
- JS-side consumers (map, text, sparkline) receive a **throttled** copy: a `useAnimatedReaction` on `Math.floor(simT / 60_000)` calls back to JS at most once per storm-minute and ≤ 10 Hz (VERIFY the worklets 0.10 API for scheduling JS calls — `scheduleOnRN` vs Reanimated's `runOnJS` — in the installed d.ts).
- Controls: Play/Pause; **prev/next event** (jump to the previous/next `events[].t`, `truth.onset`, gauge gap start/end); **Skip to action** (offered on first play: jump to 30 min before the first WATCH); ±5 min step buttons; drag scrub pauses playback and fires `haptic.select()` each time a 15-storm-minute tick is crossed. At `storm.end`: pause, show "End of storm", enable "Reveal truth" [Stretch F81] and the Results CTA.
- Leaving the player while playing keeps the store alive; `ReplayMiniBar` (JS mini-bar above the tab bar; iOS 26 `NativeTabs.BottomAccessory` [Stretch]) shows "▶ REPLAY · {storm} · {time}" on every tab. Map Home stays **live** — replay state lives only in `player-store` and never enters React Query, SQLite risk tables, geofences or the escalation detector.
- Screen reader on → autoplay disabled; announcements only on play/pause and key events (§34.3).

### 33.4 Frames (`frames.ts`, pure and unit-tested)

```ts
export function stateAt(tl: ReplayIndexed, crossingId: string, simT: number): { state: RiskState; window: Window | null } {
  const ev = tl.eventsByCrossing.get(crossingId) ?? [];          // pre-sorted by t (ms)
  const i = upperBound(ev, simT, (e) => e.tMs) - 1;               // last event with t ≤ simT — states are step functions
  if (i < 0) return { state: fromWire(tl.crossingById.get(crossingId)!.initial_state), window: null };   // §19.11
  const e = ev[i]!; return { state: fromWire(e.state), window: e.window };   // NEVER interpolate states or windows
}
export function visibleSamples(g: ReplayGauge, simT: number) {   // exactly what the pipeline knew at simT
  const lastIdx = Math.floor((simT - g.avail_delay_s * 1000 - g.t0Ms) / (g.dt_s * 1000));
  return g.stage_ft.slice(0, Math.max(0, lastIdx + 1));            // nulls render as a hatched "No data" band
}
```
- The gauge dot turns into a dashed `#7A879C` ring when the newest visible sample is null or older than 30 min (display only; the crossing's state still comes from `events`).
- The headline number is **`hero.lead_min`** from the JSON (§19.12 definition: onset − start of the matched AVOID episode, floored to 5) — the app never recomputes it. If `hero.lead_min` is null, show no callout. If `truth.censored`, append "(at least)" via `replay.result_lower_bound`.
- Unit tests (§36.1): `stateAt` before the first event (= `initial_state`), exactly at an event, between events; `visibleSamples` never returns a sample with `t + avail_delay > simT` ("future poison" fixture); the callout equals `hero.lead_min` from `docs/schemas/replay.v1.example.json`.

### 33.5 Map, water pulse and hydrograph sync

- Same `MapSurface` with `mode="replay"`: violet 2 pt inner frame + `rgba(182,156,255,0.04)` overlay (§9.9); camera fits the hero gauge + flowline + crossing bbox on open (48 pt padding + sheet inset).
- **Water pulse:** for each `pulses[]` entry with `simT ≥ t_trigger`, `p = clamp((simT − t_trigger) / (tau_min × 60_000), 0, 1)` on a `wave-<crossing>-<gauge>` source built from the matching `links[].flowline` (≤ 3 simultaneous; newest first). At 60× a 40-min τ takes 40 s; the pulse reaches the road around when the forecast said. Reduced motion → static arrows + "≈ {τ} min to crossing".
- When `simT ≥ hero.onset` (or any `truth.onset` for the selected crossing): draw the white-dot-with-cyan-ring "water over road (observed)" marker and the scrubber `●` tick; count up "{x} MIN EARLIER" (§11.4 A12) from `hero.lead_min`, always with `replay.honesty` filled from `results.json.headline`; haptic `impactAsync(Medium)`; announce once.
- **Hydrograph/LagPair** (victory-native 42, §12.5) receive `visibleSamples()` and a `playheadT`; trigger/watch lines come from the crossing's primary link; NWS category lines from `nws_categories` when present; "Show readings" lists the last 12 visible samples (text alternative).

### 33.6 Scrubber, ticks and results

- `ReplayScrubber`: track `#24344F`, fill/thumb per §9.9; ticks from `events` (▲ WATCH amber, ◆ AVOID red), `truth` (●), gauge gaps (⌀ hatched span); the ▮ official-closure tick appears only if a timeline ever carries official data (current storms state "not available"). `accessibilityRole="adjustable"`, value = spoken time + relation to onset ("May 23, 10:40 PM. 38 minutes before water reached the road."), increment/decrement = ±5 min; visible ±5 min buttons (WCAG 2.5.7).
- **Results** (`replay/results?storm=<id>` formSheet): count-up number, `replay.honesty` line, MetricTiles POD/FAR/CSI/median lead (+ CIs) from the bundled `results.json` (headline + this storm's row) — or "—  Pending backtest" when absent; per-crossing lead bars and comparator rows (`upstream_rule` vs `nearest_gauge`) from the timeline `metrics`; "How we scored this" → methodology (no lookahead, per-gauge data delay from `assumptions`, approved-archive values, leave-one-storm-out). **No number on this screen is typed by hand** (grep test §7.1).

### 33.7 The UNKNOWN moment (2013 Onion Creek at US 183)

When a linked gauge's visible samples turn null at the peak, the timeline's events (from the real pipeline) switch dependent crossings to `unknown`; the player shows the dashed gauge ring, the hatched band on the hydrograph, `◌ UNKNOWN` on the crossing, and the storyboard caption ("The gauge stopped reporting at the peak. FordCast shows Unknown — never calm." / ES §13.13). It is announced (`default`) and called out in the video.

### 33.8 REPLAY labeling & isolation

The violet REPLAY banner (`replay.banner`, §3.6) is visible in **every** frame of the player, the results sheet, the mini-bar, Replay drive and any replay-routed check (F54). Local notifications from replay carry the `REPLAY ·` prefix and `data.type: 'replay'`. Replay never writes to live caches, never registers geofences and never pushes.

### 33.9 DEMO_MODE [F83] and `DemoTouchOverlay`

- `EXPO_PUBLIC_DEMO_MODE=1` only in local dev runs or the `demo` profile; `app.config.ts` throws for `preview`/`production` (§27.3) and a Jest test asserts `eas.json` never sets it in those profiles.
- Effects: deterministic start (storm id + start time from `src/lib/flags.ts` `demo.storm` / `demo.startOffsetMin`), dev overlays hidden, `DemoTouchOverlay` on iOS (44 pt translucent circle per touch, 300 ms fade; captured with `onStartShouldSetResponderCapture={(e) => { addTouch(e.nativeEvent.pageX, e.nativeEvent.pageY); return false; }}` on a root wrapper so touches still pass through — VERIFY that MapLibre touches are visible to the capture phase on device), and optional auto-slow to **10×** from `T_W − 5 min` to `onset + 5 min`.
> NOTE TO REVIEWER: Part A F83 says "auto-slow to 4×", but 4× isn't in the speed set (§4 F78, §12.5). This spec uses 10×; add 4× to the speed list only if the human asks.
- Android recordings use `scrcpy --show-touches` (§41); the overlay stays off on Android.

**Done when (§33):** the hero storm plays end-to-end in airplane mode on the preview APK; the lead-time callout equals the JSON math; every frame shows REPLAY; the 2013 gap shows UNKNOWN; a corrupted asset shows "Unavailable" without crashing; 60× playback meets §36.4 budgets.

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
Consumers: `MotionConfig` (§28.3), `useMotionOK()` (§11.3: `!reduceMotion && settings.animations !== 'reduced'`), `useTheme()` (→ `darkHC` when `highContrast || settings.increaseContrast`), glass (`reduceTransparency` → opaque `surface.1`), `AppText` (bold bump), Map Home (`screenReader` → List first), Replay (no autoplay).

### 34.2 Props checklist per component

| Component | Required props / behavior |
|---|---|
| `AppText` | `allowFontScaling` (default); `maxFontSizeMultiplier` per variant (34.4); iOS `accessibilityLanguage={lang === 'es' ? 'es-US' : 'en-US'}`; bold bump when `boldText`; never truncates status words or windows |
| `StatusChip` | `accessible`, `accessibilityRole="text"`, `accessibilityLabel={t('state.<s>.spoken_short')}` (+ ", official"); glyph `accessibilityElementsHidden` + `importantForAccessibility="no"`; never pressable |
| `CrossingRow` | `accessibilityRole="button"`; label `row.spoken` **starting with the visible name** (WCAG 2.5.3): "{name}. {state}, {window}. {age}."; hint `row.hint`; `accessibilityActions=[activate, detour (Stretch), save]` + `onAccessibilityAction`; `minHeight: 56` |
| Crossing sheet header | `accessibilityRole="header"`, label = state + name + window (spoken); focused after the open animation via `AccessibilityInfo.sendAccessibilityEvent(ref, 'focus')` (VERIFY in RN 0.86; fallback `setAccessibilityFocus(findNodeHandle(ref))`); reading order header → window → why → actions → footer |
| Sheet grabber (gorhom + formSheet) | real button: `accessibilityRole="button"`, label `sheet.expand`, `accessibilityState={{ expanded }}`, actions `expand`/`collapse` snap detents; full detent iOS `accessibilityViewIsModal`; `onAccessibilityEscape` closes |
| `RiskRing` | hidden (`accessibilityElementsHidden`, `importantForAccessibility="no-hide-descendants"`) — duplicates the header |
| `Hydrograph` / `Sparkline` / `LagPair` | `accessible`, `accessibilityRole="image"`, full-sentence label from spoken keys ("Upstream gauge, Bull Creek at FM 2222. 7.4 feet, rising 3.1 feet in the last 30 minutes. Trigger level 6 feet."); visible "Show readings" button → `ReadingsList` |
| `ReplayScrubber` | `accessibilityRole="adjustable"`, `accessibilityValue={{ text }}`, actions `increment`/`decrement` = ±5 min; magic tap on the player root = play/pause (iOS) |
| `SpeedToggle`, `ToggleGroup`, tabs | items `accessibilityRole="radio"`/`"tab"` + `accessibilityState={{ selected }}`; labels "60 times speed" |
| Buttons (`Button`, `BigActionButton`, `GlassIconButton`) | label = visible text (icon-only: "List of crossings", "Map layers", "Center on my location", "Zoom in", "Settings", "Legend"); `accessibilityState={{ disabled, busy }}`; ≥ 48 pt (≥ 76 in Drive Mode) incl. `hitSlop`; Large Content Viewer (`accessibilityShowsLargeContentViewer`, `accessibilityLargeContentTitle`) on chrome/HUD buttons |
| Switch rows | `accessibilityRole="switch"`, `accessibilityState={{ checked }}`, label = row text |
| `MapSurface` container | one `accessible` image with the count summary (§29.9); markers not focusable |
| `AlertBanner` | iOS `announce()`; Android `accessibilityLiveRegion` `assertive` (AVOID/CLOSED) / `polite`; AVOID/CLOSED never auto-dismiss; WATCH ≥ 10 s or `getRecommendedTimeoutMillis()` (Android) |
| `OfflineBanner` / `StaleBanner` / `CapabilityBanner` | `accessibilityRole="alert"` only when newly shown; live region `polite` |
| `DriveHUD` | live region `assertive`; Repeat button + `onMagicTap` (iOS) on the Drive Mode root |
| `PassengerHoldButton` | `accessibilityActions=[{ name: 'activate', label: t('drive.lockout.confirm_a11y') }]`, hint "Double-tap to confirm." |
| `SearchField` | `accessibilityRole="search"`; locked → `accessibilityState={{ disabled: true }}` + hint explaining the lockout |
| `LoadingState` | visible "Loading…" text; `accessibilityState={{ busy: true }}`; never looks like NO_RISE |
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
- Reduce Transparency, Android, or glass unavailable → opaque surfaces. Reduce Motion (or Animations: Reduced) → no loops, dissolves instead of motion, instant ring; meaning is never removed (§11.4 fallbacks).
- **CVD evidence (`tools/cvd_screens.py`, F95):** input = dev-gallery and key-screen screenshots in `docs/a11y/screenshots/`; output = protan/deutan/tritan (Machado 2009, severity 100) + grayscale renders and a 4-up per screenshot in `docs/a11y/cvd/` using `colorspacious 1.1.2` + Pillow (versions resolved by `uv` in a `tools` dependency group). Run: `uv run --group tools python -I tools/cvd_screens.py docs/a11y/screenshots docs/a11y/cvd`. The README shows one 4-up image.

### 34.6 Voice Control, keyboards, switches, gestures

Labels equal visible text so "Tap Show detour" works; icon-only buttons use the names in 34.2. Every gesture has a button: pinch → zoom ±; sheet drag → grabber button; scrubber drag → ±5 min; long-press → `accessibilityActions`; map pan → List. Focus ring 2 pt `#6CB4FF` for keyboard/switch users. No shake gestures.

### 34.7 Landscape [Stretch F94]

MVP: Drive Mode supports all orientations (per-screen lock §28.2, VERIFY); other screens portrait. WCAG 1.3.4 is **not** claimed until Map Home and the crossing sheet work in landscape (side-panel layout, §8.7).

### 34.8 Tooling

Xcode Accessibility Inspector (Audit) on iOS builds (Lane B/C); Android **Accessibility Scanner** + TalkBack; RNTL role queries in every component test (`getByRole('button', { name: /show detour/i })` — if a test can't find it by role, a screen reader can't either); `@react-native-ama/core` only in dev builds if the human opted in on Day 0 (native module). `eslint-plugin-react-native-a11y` is skipped (ESLint ≤ 8 peer).

### 34.9 Device test protocol (`docs/a11y/TESTING.md`)

Matrix: devices (Android 14+ phone; iPhone iOS 26 in Lane B/C) × 5 common tasks — (a) first launch + pledge, (b) find a crossing's status via List, (c) open the crossing sheet and hear window + reason, (d) Check My Drive + detour (or the MVP Drive shell), (e) Storm Replay to the lead-time result — plus Settings language/alerts × settings: TalkBack/VoiceOver (screen curtain on iOS), Voice Control, largest text (Android 200 % / iOS AX5), Bold + Increase Contrast + Reduce Transparency together, Reduce Motion, Grayscale, Spanish, landscape (Drive Mode). Each cell: date, device, OS, pass/fail, issue link. **DoD:** every cell passes or has a filed issue with a workaround; no common task needs sight, color perception, precise dragging or small targets.

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

Namespaces: `common.*`, `onboarding.*`, `permissions.*`, `state.<no_rise|watch|avoid|closed|unknown>.*` (slots from §3.7: `label`, `short`, `headline`, `headline_now`, `body`, `body_nowindow`, `spoken`, `spoken_now`, `spoken_short`, `push_title`, `push_body`, `push_body_now`, `tts`, `widget`, `handoff_warning`, `last_known`), `update.deescalate.*`, `area.*`, `fresh.*`, `route.*`, `routing.*`, `drive.*`, `replay.*`, `alerts.*`, `notif.*`, `channel.*`, `legend.*`, `search.*`, `settings.*`, `about.*`, `legal.*`, `disclaimer.*`, `safety.*`, `official.*`, `nws.*`, `reason.<CODE>` + `reason.<CODE>_spoken`, `a11y.*`, `errors.*`.
- **Spoken siblings:** every status-bearing string has a `*_spoken` (or `tts`) sibling with no dashes, symbols or abbreviations ("15 to 30 minutes", "feet", "Farm to Market 1626"); TTS and every `accessibilityLabel` use only spoken keys (CI guard §3.12).
- **Plurals:** counted keys use `_one`/`_other`, and ES also `_many` (copy of `_other`); always pass `count`. Example: `"fresh.updated_ago_one": "Updated {{count}} min ago"`, `"fresh.updated_ago_other": "Updated {{count}} min ago"`; ES `"Actualizado hace {{count}} min"` ×3.
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

`setLanguage(choice)`: persist → `i18n.changeLanguage(resolveLang())` → re-run `setupNotifications(t)` (channel names + translated action buttons) → queue `PUT /v1/devices/{id}` with `locale` (server pushes in that language) → clear the TTS voice cache so the next utterance re-runs `pickVoice` for `es-US`/`en-US` (§30.8: es-US → es-MX → es-419 → any es, prefer Enhanced, never hard-coded names) → `AppText` picks up the new `accessibilityLanguage` → announce `settings.language_changed` politely. When the choice is "Device language", re-read `getLocales()` on `AppState` active (Android doesn't restart on a locale change; iOS restarts the app). Settings also offers "Change in system settings" (`Linking.openSettings()`) for per-app language via the `supportedLocales` plugin.

### 35.6 QA

`i18n-parity-test.ts` (identical key sets; plural suffixes; no untranslated EN values in `es.json` except an allow-list of proper nouns), `copy-banned-test.ts` (§3.12), a **pseudo-locale** run (Stretch F99: `EXPO_PUBLIC_PSEUDO=1` wraps every value as `［…+50 %…］` in `i18n.ts`, no extra package) with screenshots of every screen, a native-speaker review of every ES string and TTS sample, the comprehension test with ≥ 2 Spanish-dominant speakers ("¿Qué haría usted si ve esto?"), and the TalkBack test with app ES / system EN (record pronunciation in `docs/a11y/TESTING.md`).

**Done when (§35):** 100 % of UI, a11y labels, TTS, notification text, permission prompts (§27.4) and the privacy policy exist in EN and ES; parity, banned-words and spoken guards pass; switching language updates UI, notification actions, channel names, voice and server locale without a restart; `es-pending-review.json` is empty or its gaps are disclosed.

---

## §36. Testing, performance, error handling & release

### 36.1 Unit & component tests (jest-expo, Jest 29, RNTL 14; files in `src/__tests__/`, `*-test.ts(x)`)

| File | Asserts |
|---|---|
| `copy-banned-test.ts` | §3.12 banned words, countdown and spoken guards, static code guards (no `Success` haptic, no green token) |
| `i18n-parity-test.ts` | EN/ES key parity, `_one/_other/_many`, no stray English in ES |
| `tokens-parity-test.ts`, `contrast-test.ts` | §9.13 |
| `risk-state-test.ts` | wire ↔ enum mapping, RANK order, `displayRisk` source/official/tier handling, missing crossing → UNKNOWN |
| `staleness-test.ts` | fake clock: ≤ 10 min live, 10–20 aging, > 20 UNKNOWN with last-known WATCH/AVOID/CLOSED, `data_status: offline`, clock-skew offset |
| `windows-test.ts` | visual/spoken ranges, `lo = 0` → "may already be on the road", no single-number ETA for any input |
| `schema-contract-test.ts` | `SnapshotV1`, `ReplayV1`, `RouteResponse` parse `docs/schemas/*.example.json`; renamed states accepted, old names rejected |
| `realtime-merge-test.ts` | older `seq` ignored; merge keeps snapshot `as_of`; malformed rows dropped |
| `replay-frames-test.ts` | `stateAt` (incl. `initial_state`), `visibleSamples` future-poison fixture, callout = `hero.lead_min` of the example JSON |
| `replay-loader-test.ts` | `file_sha256` mismatch → `ReplayIntegrityError`; zod failure → unavailable; Storage override used only when verified |
| `lockout-test.ts` | locks after 5 s ≥ 4.5 m/s; passenger unlock per trip; relock after 3 min < 1 m/s |
| `speech-queue-test.ts` | AVOID pre-empts; ≤ 1 per crossing per 60 s; merge message; mute keeps chime/haptic |
| `geofence-rotation-test.ts` | iOS 19 + re-rank fence, Android ≤ 60, scoring, zero candidates → stop |
| `on-route-test.ts` | Turf 7.4 `totalDistance`, 40/60 m tolerance, ordering, detour sanity check |
| `handoff-url-test.ts` | Google `%7C`-encoded ≤ 3 waypoints, no `dir_action` with waypoints; Apple ≥ 18.4 vs legacy; Waze lat,lng order |
| `notification-content-test.ts` | channel per state, `timeSensitive` only with the capability, ranges only, REPLAY prefix, ES text |
| `announce-test.ts` | ≤ 1 per 10 s, merge, high-priority flush |
| `capabilities-test.ts` | Expo Go → native caps false; registration helpers return `expoGo` |
| `demo-flag-test.ts` | `eas.json` never sets `EXPO_PUBLIC_DEMO_MODE=1` in `preview`/`production` |
| `status-chip-test.tsx`, `crossing-sheet-test.tsx`, `area-card-test.tsx`, `scrubber-test.tsx` | roles/labels starting with visible text, all 5 states, header focus order, adjustable actions, LoadingState ≠ NO_RISE |

### 36.2 Maestro E2E (F124; `.maestro/`, run against the preview APK, `appId: org.fordcast.app`)

Flows: `onboarding.yaml` (language pill → pledge → map), `map-to-crossing.yaml` (List → row → sheet header text), `replay-demo.yaml` (Replay → storm → Skip to action → 60× → results number visible), `settings-language.yaml` (Español → tab labels + a chip word change). Manual (logged in the devlog, not automated): airplane-mode checklist (§29.11), Drive Mode voice, push from the backend. Use `testID`s (stable across languages), never visible text, for taps.

```yaml
# .maestro/replay-demo.yaml
appId: org.fordcast.app
---
- launchApp
- tapOn: { id: "tab-replay" }
- tapOn: { id: "storm-card-memorial-day-2015" }
- tapOn: { id: "replay-skip-to-action" }
- tapOn: { id: "replay-speed-60" }
- tapOn: { id: "replay-play" }
- extendedWaitUntil: { visible: { id: "replay-results-number" }, timeout: 120000 }
- assertVisible: { id: "replay-banner" }
- takeScreenshot: replay-result
```
Expo Go runs use `appId: host.exp.Exponent`. Install Maestro per maestro.mobile.dev (VERIFY current command); iOS flows need a Mac.

### 36.3 CI (mobile job in `.github/workflows/ci.yml`, §24)

`npm ci` → `npm run typecheck` → `npm run lint` → `npm test -- --ci` → `node scripts/check-pins.mjs` → `npx expo install --check` → secret grep (§27.13) → hand-typed-metric grep (§7.1). Maestro runs locally/on demand (needs a device).

### 36.4 Performance budgets & how to measure (targets from §7.4)

| Budget | Target | Measure (release-like build: preview APK or `--no-dev --minify`) |
|---|---|---|
| Cold start → interactive Map Home (cached data, mid-range Android) | ≤ 2.5 s | `adb shell am start -W -n org.fordcast.app/.MainActivity` (TotalTime) + first-frame log |
| Map pan/zoom with all crossings + ≤ 20 pulses | ≥ 55 fps, ≤ 2 loops | Perf Monitor (dev menu) on the dev build + visual check on the preview APK; `adb shell dumpsys gfxinfo org.fordcast.app` for UI-thread jank |
| Replay at 60× | no JS task > 100 ms; memory growth < 50 MB / 10 min | Perf Monitor JS fps; `adb shell dumpsys meminfo org.fordcast.app` before/after |
| Replay parse | < 150 ms per timeline (target) | `performance.now()` around `loadReplay` (dev log) |
| Snapshot | ≤ 10 KB gzipped | server-side (§20) |
| Bundled replays | ≤ 150 KB each, ≤ 1 MB total | CI size check on `assets/replays/` |
| JS bundle | log per preview build; investigate a > 20 % jump | `npx expo export --platform android` → size of the `.hbc` under `dist/` |
| APK size | log per preview build | EAS artifact size in the devlog |
| Battery | no continuous background location outside Drive Mode | `adb shell dumpsys location` shows no active request when Drive Mode is off |

### 36.5 Error handling & retry UX

Route `ErrorBoundary`s (§28.9); every query error shows an inline retry row, never a blank panel; snapshot failures follow the ladder and the 20-min UNKNOWN rule; `HttpError`/`ProblemError` messages map to `errors.*` keys; Drive Mode errors are spoken once; no error path renders a calm state.

### 36.6 Sentry [Stretch F125]

`npx expo install @sentry/react-native` (~7.11.0), `FORDCAST_SENTRY=1` adds the plugin (§27.3), metro composition (§27.6). `Sentry.init({ dsn, sendDefaultPii: false, beforeSend: scrub, beforeBreadcrumb: scrubCrumb })` where `scrub` deletes `lat/lon/lng/latitude/longitude/coordinates/origin/destination` keys, strips query strings from URLs and drops breadcrumbs from location/route modules; wrap the root with `Sentry.wrap`. VERIFY BEFORE USE that an EAS build succeeds without `SENTRY_AUTH_TOKEN` (source-map upload); otherwise leave Sentry out. Expo Go reports JS errors only.

### 36.7 Release (judge APK, F126)

1. Clean checkout of the release commit; `npm ci`; all §7.1 gates green; `EXPO_PUBLIC_DEMO_MODE` unset.
2. `npx eas-cli@latest build -p android --profile preview` → download the APK; `sha256sum fordcast-<version>-preview.apk`.
3. Smoke on two devices: onboarding, live calm map, crossing sheet, Replay offline, Spanish, TalkBack spot-check, notification test.
4. Publishing a public GitHub Release is a stop-and-ask (§1.7): `gh release create v<version>-cac --title "FordCast <version> (CAC 2026)" fordcast-<version>-preview.apk docs/results/results.json --notes-file docs/release-notes.md` with the sha256 in the notes; README links the release (and the EAS internal URL, which is open to anyone with the link).
5. Record the EAS build id, update group id and commit in `docs/devlog.md`; tag `cac-2026-submission` on the submitted commit (§40).
6. After submission: JS fixes via `eas update --channel preview` only (§26.6); never app-store publishing before judging.

**Done when (§36):** CI runs every listed unit test green; the four Maestro flows pass on the preview APK; budgets are measured and logged (misses filed as issues); the release has APK + sha256 + `results.json`.

---

## §37. Gotchas (must-know pitfalls, each with the fix)

**SDK, builds, tooling**
1. App Store Expo Go stops at SDK 54 → Android-first dev build; iOS only via Lane B/C (§26).
2. SDK 58 will replace SDK 57 in store Expo Go → never `expo@latest`; judges use the preview APK.
3. npm `latest` ≠ SDK pin (Reanimated 4.7.1 vs **4.5.1**, Worklets 0.13 vs **0.10.1**, RNGH 3.3 vs **~2.32**, Skia 2.14 vs **2.6.2**, FlashList 2.3.3 vs **2.0.2**, Sentry 8.30 vs **~7.11**, react-native-maps 1.29.11 vs **1.27.2**) → `npx expo install`; `check-pins.mjs` in CI.
4. Reanimated 4.5.1 needs worklets 0.10.x exactly and RN 0.83–0.86 → install both via `npx expo install`.
5. Installing `expo-dev-client` makes `npx expo start` open the dev client → `npx expo start --go` (or press `s`) for Expo Go.
6. EAS free queue can exceed 90 min and builds are ~15/month → front-load every native module into the Day-1 build; JS via EAS Update.
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
36. Native-only modules at top level crash Expo Go → `isRunningInExpoGo()` + lazy `require` (never `Constants.executionEnvironment`).
37. Attribution is mandatory (OSM, OpenFreeMap/OpenMapTiles, ORS) → attribution button, About, video end card.

**Location, notifications, voice**
38. Tasks must be defined at module top level and imported in `index.ts` before `expo-router/entry` → otherwise headless geofence events are lost.
39. iOS reports initial region state at registration → ignore Enter events within 10 s.
40. iOS `pausesUpdatesAutomatically` defaults to true natively → pass `false` in Drive Mode.
41. Android foreground-service location must start while the app is foregrounded.
42. `startGeofencingAsync` throws without Always permission (+ iOS location background mode) → gate and explain.
43. Android 11+ background permission opens system Settings; foreground must be granted first → primer copy.
44. iOS monitors 20 regions, Android 100 → rotate 19 + 1 re-rank fence / 60.
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
54. Realtime is a hint; sockets die in the background → refetch the snapshot on reconnect/foreground; keep 60 s polling.
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
65. Per-screen orientation locks are unverified → fall back to portrait-only + Drive Mode landscape as Stretch (§8.7).
66. Render cold starts → the app reads the Storage snapshot first; "Waking server…" for API-only calls; Starter plan from Oct 20.
67. EAS internal distribution URLs are open to anyone with the link → share intentionally; no store publishing before judging.

---
