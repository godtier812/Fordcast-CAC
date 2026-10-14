# FordCast: Maps, Routing, Location, Notifications, Voice and Offline on Expo SDK 57

**Role:** mobile maps and location engineer · **Date:** 2026-10-14 · **Target:** Expo SDK 57 (React Native 0.86), Python FastAPI backend
**Tags:** `[Verified: source]` means checked today against npm, package source code, official docs or GitHub. `[Unverified]` means not confirmed, so use the fallback given. `[Inference]` means my engineering judgment.

---

## 0. TL;DR: decisions at a glance

| # | Capability | **Recommendation** | Why (1 line) | Runner-up | Tier | In Expo Go? |
|---|---|---|---|---|---|---|
| 1 | Map SDK | **`@maplibre/maplibre-react-native@11.5.0`** | Free and open, with no token, account or MAU billing. Full GL styling covers data-driven icons, clustering, line-gradient and dasharray. Offline packs work. | `@rnmapbox/maps@10.3.8` (Mapbox Standard `lightPreset:"night"`) | MVP | No (dev build) |
| 1b | Expo Go fallback | **`react-native-maps@1.27.2`** (SDK 57's bundled version), used only behind a `MapSurface` adapter | Works in Expo Go, so you can iterate on UI before the first dev build | none | Optional dev convenience | Yes |
| 2 | Basemap tiles | **OpenFreeMap** vector tiles plus a custom **"FordCast Night"** style recolored from OFM *Positron* | No key, no request limits, OSM data, and it can match the `#0E1726` palette exactly | Stadia *Alidade Smooth Dark* (needs a key, non-commercial free plan) | MVP | n/a |
| 3 | Routing with avoidance | **OpenRouteService** `POST /v2/directions/driving-car/geojson` with `options.avoid_polygons`, called **through the FastAPI backend** | True polygon avoidance, a free 2,000/day quota, no credit card, and it matches the concept doc | **Stadia Maps (Valhalla)** `exclude_polygons` | Stretch (first Stretch item) | Yes (HTTP) |
| 4 | Route vs. crossing check | **On device with Turf v7** (`@turf/point-to-line-distance`, `@turf/nearest-point-on-line`) | Works offline against cached risk, needs no round trip, and is fast enough for about 500 crossings | PostGIS `ST_DWithin` on the server | Stretch | Yes |
| 5 | Hand-off to a nav app | **Google Maps URL** with `waypoints=` (via point), **Apple Maps unified URL** `…/directions?…&waypoint=` (iOS 18.4+), **Waze** `ul?ll=…&navigate=yes` (no waypoints, so a two-leg hand-off) | Drivers keep their own nav app, and FordCast supplies the via point that avoids the crossing | none | Stretch | Yes |
| 6 | Geocoding/search | **ORS Pelias `/geocode/autocomplete`** via backend → fallback **Photon** → last resort **`expo-location.geocodeAsync`** | Documented quota (1,000/day), same key as routing, Austin-biased | Stadia Autocomplete | Stretch | Yes |
| 7 | Location | `expo-location@57.0.21` + `expo-task-manager@57.0.21`, geofence **rotation** (19 crossings + 1 "re-rank" fence on iOS) | Respects the iOS 20-region limit (100 on Android) | none | MVP foreground, Stretch background | Foreground only |
| 7b | "You're driving" detection | `Location.watchMotionActivityAsync` (Automotive) **and** a GPS speed threshold | New motion API in expo-location 57, with speed as the backup signal | Speed only | Stretch | Unverified, assume dev build |
| 8 | Notifications | `expo-notifications@57.0.22` + Expo Push Service; Android channel `crossing-alerts` at `AndroidImportance.MAX`; iOS `interruptionLevel:"timeSensitive"` (needs entitlement); actionable "Show detour" category | One API for both platforms. Critical Alerts are not feasible. | Direct FCM/APNs | MVP (local) / MVP-Android push / Stretch iOS push | Local yes, push no |
| 9 | Live Activities / Dynamic Island | **`expo-widgets@57.0.24`** (`createLiveActivity`, no Swift needed) | First-party in SDK 57 | `expo-live-activity@0.4.2` (stale) | Stretch (iOS + paid Apple account only) | No |
| 9b | Android "live" equivalent | Sticky ongoing notification (`sticky:true`) + location foreground-service notification | Free and reliable | none | Stretch | No |
| 10 | CarPlay / Android Auto | **Do not build.** `react-native-carplay@2.4.1-beta.0` is stale (2024, peer `react ^18`), and the entitlement needs Apple approval. | Cannot land by Oct 26 | none | Roadmap | No |
| 11 | Voice | `expo-speech@57.0.3` (`en-US` / `es-US` voice selection), iOS `useApplicationAudioSession:false` for system ducking; `expo-keep-awake@57.0.2` in Drive Mode | Built in, no native work | none | MVP | Yes |
| 12 | Offline | `expo-sqlite@57.0.4` caches crossings and last risk, with stale labels; MapLibre `OfflineManager.createPack` covers Travis County z8–14 | Safe degradation with honest "as of N min ago" labels | `react-native-mmkv@4.3.2` (needs Nitro, so not in Expo Go) | MVP (cache + stale label) / Stretch (map packs) | SQLite yes, map packs no |

**Takeaways:**
1. **You need a development build anyway.** Push (both platforms), background location, geofencing, background tasks, MapLibre/Mapbox, Live Activities and MMKV all fail in Expo Go `[Verified: Expo docs, see §16]`. So Expo Go's advantage, which was the reason v4 picked react-native-maps, no longer matters. Pick the map that looks best and costs nothing: MapLibre with a custom night style.
2. **Go Android-first for the dev build.** An Android dev build is free: EAS free tier or a local `npx expo run:android`. An iOS dev build on a physical iPhone needs a **paid Apple Developer account ($99/yr)** for EAS ad hoc distribution `[Verified: Expo internal-distribution docs / forum]`, or a Mac with Xcode and a free personal team (7-day provisioning, no push or app groups) `[Unverified: free-team capability limits]`. Use iOS through Expo Go (react-native-maps fallback) only if no Mac and no $99 are available.
3. **Front-load every native module into the first dev build.** The EAS free plan allows **15 Android + 15 iOS builds/month**, uses a low-priority queue and can wait **90+ minutes** at peak `[Verified: expo.dev/pricing via search]`. JS changes never need a rebuild. Only native dependency or config plugin changes do.

---

## 1. Verified version pins (run `npx expo install <pkg>` so Expo picks the SDK-57-compatible version)

| Package | Version to use | Verified how | Notes |
|---|---|---|---|
| `expo` | **57.0.28** (`latest`, `sdk-57`) | `npm view expo dist-tags` | `next` = 58.0.9 (SDK 58 in beta since 2026-09-29). **Stay on 57.** |
| `react-native` | **0.86.3** | expo 57 `bundledNativeModules.json` | expo@57.0.17+ moved to RN 0.86.3 (fixes the Hermes memory regression) `[Verified: expo.dev/changelog/sdk-57 via search]` |
| `react` | 19.2.3 | bundledNativeModules | |
| `@maplibre/maplibre-react-native` | **11.5.0** (2026-10-04) | npm; peer `expo >=54`, `react-native >=0.80`, `react >=19.1` | **v11 API differs from v10** (see §3.3). Defaults: MapLibre Native Android 13.6.1 and iOS 6.31.0 (package source) |
| `@rnmapbox/maps` (runner-up) | 10.3.8 (2026-10-12) | npm; peer `react-native >=0.79` | Defaults to **Mapbox Maps SDK 11.23.1** (package.json `mapbox` field). **Download token no longer required** (plugin source comment). |
| `react-native-maps` (Expo Go fallback) | **1.27.2** (SDK-bundled; npm latest is 1.29.11, don't use it) | bundledNativeModules | In Expo Go: yes `[Verified: SDK 57 map-view docs]` |
| `expo-maps` | 57.0.4 | npm | **Alpha**, not in Expo Go, Google Maps on Android only `[Verified: SDK 57 maps docs]`. Rejected. |
| `expo-location` | 57.0.21 | npm | Includes the new `watchMotionActivityAsync` (package source) |
| `expo-task-manager` | 57.0.21 | npm | |
| `expo-notifications` | 57.0.22 | npm | `interruptionLevel` and categories (package source) |
| `expo-background-task` | 57.0.21 | npm | Minimum interval is 15 min. Not in Expo Go or the iOS simulator (package source). |
| `expo-speech` | 57.0.3 | npm | |
| `expo-audio` | 57.0.5 | npm | Use for the alert chime and `interruptionMode:'duckOthers'`. **Do not use `expo-av`** (16.0.8, not bundled in SDK 57). |
| `expo-keep-awake` | 57.0.2 | npm | |
| `expo-haptics` | 57.0.3 | npm | |
| `expo-sqlite` | 57.0.4 | npm | Has the `expo-sqlite/kv-store` export |
| `expo-widgets` | 57.0.24 | npm + SDK 57 docs | iOS widgets and **Live Activities** |
| `@expo/ui` | 57.0.23 | npm | SwiftUI components used by expo-widgets |
| `expo-localization` | 57.0.2 | npm | |
| `expo-linking` | 57.0.12 | npm | |
| `expo-router` | 57.0.26 | npm | |
| `expo-dev-client` | 57.0.20 | npm | |
| `react-native-reanimated` | **4.5.1** (bundled; npm latest 4.7.1, don't use it) + `react-native-worklets` 0.10.1 | bundledNativeModules | Drives the pulsing rings |
| `@turf/*` (individual modules) | **7.4.0** | npm | Install individual modules, not `@turf/turf` (114 deps). Turf 7.4 **renamed** `nearestPointOnLine` properties (§7). |
| `react-native-mmkv` | 4.3.2 (needs `react-native-nitro-modules` 0.37.1) | npm peer deps | Not needed. Use `expo-sqlite/kv-store`. |
| `@supabase/supabase-js` | 2.117.3 | npm | Pure JS |
| Python `exponent-server-sdk` | 2.2.0 (2025-07) | PyPI | Optional. Plain `httpx` against the documented REST API is simpler. |
| Python `shapely` / `pyproj` / `polyline` | 2.2.0 / 3.8.0 / 2.0.4 | PyPI | Avoid-polygon building and via-point picking |
| Python `openrouteservice` | 2.3.3 (last release 2021) | PyPI | **Stale.** Call the REST API with `httpx` instead. |

---

## 2. Build-path reality (read before writing code)

| Path | Cost | What works | What doesn't |
|---|---|---|---|
| **Android dev build** (EAS `development` profile, or local `npx expo run:android`) | Free | Everything in MVP and Stretch: MapLibre, background location, geofencing, FCM push via Expo, foreground service, offline packs | Live Activities (iOS-only concept) |
| **iOS dev build via EAS internal distribution** | $99/yr Apple Developer Program `[Verified: Expo internal distribution docs + forum]` | Everything, including APNs push, time-sensitive alerts and Live Activities (expo-widgets needs an App Group, which needs paid signing `[Unverified]`) | n/a |
| **iOS via Mac + Xcode + free personal team** | Free (needs a Mac) | MapLibre, location, geofencing, local notifications | Push, App Groups/widgets, re-sign every 7 days `[Unverified]` |
| **iOS Simulator build** (`ios.simulator: true` profile) | Free, needs a Mac to run the Simulator | UI and map work, simulated GPS | Background tasks (unsupported on the simulator, per expo-background-task source), real push `[Unverified]` |
| **Expo Go (iOS/Android)** | Free; needs sign-in in the CLI and app for dev mode `[Verified (secondary): releasebot summary of SDK 57 Expo Go]` | react-native-maps, foreground location, local notifications, speech, SQLite, haptics, Turf, deep links | Push, background location and geofencing, MapLibre/Mapbox, background tasks, widgets |

**Recommendation for the master prompt:**
1. Set up `eas.json` with three profiles: `development` (`developmentClient: true`, `distribution: "internal"`, `android.buildType: "apk"`), `preview` (internal APK for judges and testers) and `production`.
2. Make the **Android dev build the primary target**. The iPhone path depends on budget.
3. Ship **one dev build containing every native module** listed in §1 on day 7, including `expo-widgets` only if iOS is in play, so that days 8–12 are JS-only.

---

## 3. Map SDK decision

### 3.1 Comparison (verified facts only)

| | **MapLibre RN 11.5.0** ✅ | @rnmapbox/maps 10.3.8 | react-native-maps 1.27.2 | expo-maps 57.0.4 |
|---|---|---|---|---|
| Expo Go | No `[Verified: MLRN expo.md]` | No `[Verified: rnmapbox install.md]` | **Yes** `[Verified: SDK57 map-view.mdx inExpoGo:true]` | No `[Verified]` |
| Config plugin | `"@maplibre/maplibre-react-native"` (adds `$MLRN.post_install` to the Podfile) `[Verified]` | `"@rnmapbox/maps"` with optional `RNMapboxMapsVersion` `[Verified]` | `androidGoogleMapsApiKey` / `iosGoogleMapsApiKey` in the dev build `[Verified]` | Google key on Android |
| Token / account | **None** with OpenFreeMap | Mapbox public token `pk.*`. Card-free sign-up gives "demo access" with lower limits `[Verified: Mapbox signup docs via search]`. ~25k free mobile MAU `[Verified (secondary): woosmap/storerocket]` | Google Cloud billing account needed for the Google provider in a dev build `[Unverified]`. Apple Maps on iOS needs no key. | Google Cloud key |
| Night look | Custom style JSON, so the palette can be matched exactly | **Best out of the box:** Standard `lightPreset:'night'`, plus `theme`, `color*` overrides and a `Rain` effect component `[Verified: package source]` | Google `customMapStyle` JSON (Android); Apple `userInterfaceStyle="dark"` (iOS) `[Verified: package source]` | Limited |
| Data-driven styling, expressions | **Full GL style spec** (`@maplibre/maplibre-gl-style-spec` 26.2.1) | Full GL | **None** (every marker is a React view) | None |
| Clustering with `clusterProperties` | **Yes** `[Verified: GeoJSONSource props]` | Yes | No (needs `supercluster@9.1.0` in JS) | No |
| `line-gradient` / `line-dasharray` | **Yes** (`lineMetrics` prop) `[Verified]` | Yes | `lineDashPattern` (no animation; `lineDashPhase` is Apple-only) `[Verified]` | No |
| Offline packs | **`OfflineManager.createPack`** `[Verified]` | `offlineManager.createPack` `[Verified]` | No | No |
| Risk during judging (Nov–Dec) | OpenFreeMap: "no limits on map views or requests" `[Verified: OFM README]`, donation-funded with no SLA | Demo-tier limits `[Unverified]` | Low | Alpha churn |

**Decision:** **MapLibre RN 11.5.0 + OpenFreeMap + a custom "FordCast Night" style.**
**Switch to @rnmapbox/maps** only if (a) the builder already has a Mapbox account with a card on file and (b) prefers Mapbox Standard's lighting to exact palette control. The two APIs are nearly identical (GeoJSON source, layers, camera), so the switch costs about a day.

### 3.2 Install (MapLibre)

```bash
npx expo install @maplibre/maplibre-react-native expo-dev-client expo-location expo-task-manager \
  expo-notifications expo-sqlite expo-speech expo-audio expo-keep-awake expo-haptics expo-localization \
  expo-linking expo-background-task react-native-reanimated react-native-worklets
npm i @turf/point-to-line-distance@7.4.0 @turf/nearest-point-on-line@7.4.0 @turf/bbox@7.4.0 \
  @turf/circle@7.4.0 @turf/length@7.4.0 @turf/along@7.4.0 @turf/helpers@7.4.0
npx expo prebuild --clean   # SDK 57 prebuild clears and regenerates native dirs by default [Verified: SDK 57 summary]
eas build --profile development --platform android
```

`app.config.ts` (full plugin block):

```ts
import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'FordCast',
  slug: 'fordcast',
  scheme: 'fordcast',                       // deep links: fordcast://crossing/<id>
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  ios: {
    bundleIdentifier: 'org.fordcast.app',
    supportsTablet: false,
    infoPlist: {
      LSApplicationQueriesSchemes: ['comgooglemaps', 'waze'], // only needed for canOpenURL on custom schemes
    },
    entitlements: {
      // STRETCH, paid Apple account only. Needed for interruptionLevel 'timeSensitive'.
      'com.apple.developer.usernotifications.time-sensitive': true,
    },
  },
  android: {
    package: 'org.fordcast.app',
    googleServicesFile: './google-services.json',   // FCM V1 for Expo push on Android
  },
  plugins: [
    '@maplibre/maplibre-react-native',
    ['expo-location', {
      locationWhenInUsePermission:
        'FordCast shows low-water crossings near you and checks your route for flooding.',
      locationAlwaysAndWhenInUsePermission:
        'Choose "Always" so FordCast can warn you about a flooding crossing ahead even while you use another navigation app.',
      motionUsagePermission:
        'FordCast detects when you are driving so it can switch to hands-free Drive Mode.',
      isIosBackgroundLocationEnabled: true,      // adds UIBackgroundModes: location
      isAndroidBackgroundLocationEnabled: true,  // ACCESS_BACKGROUND_LOCATION
      isAndroidForegroundServiceEnabled: true,   // FOREGROUND_SERVICE(_LOCATION)
      androidForegroundServiceIcon: './assets/notification-icon.png', // 96x96 white-on-transparent
    }],
    ['expo-notifications', {
      icon: './assets/notification-icon.png',
      color: '#0E1726',
      defaultChannel: 'crossing-alerts',
      sounds: ['./assets/sounds/fordcast_alert.wav'],
      enableBackgroundRemoteNotifications: true,  // UIBackgroundModes: remote-notification
    }],
    'expo-sqlite',
    'expo-localization',
    // STRETCH (iOS, paid account): Live Activities. No widgets[] entry for a Live Activity.
    // ['expo-widgets', { enablePushNotifications: false }],
  ],
};
export default config;
```
All plugin keys above come from the SDK 57 docs/source `[Verified]`. The time-sensitive entitlement key is Apple's standard key `[Verified (secondary): Apple dev forum thread 683630 + OneSignal docs]`.

### 3.3 MapLibre RN **v11 API**: the coding agent must not write v10 code

The v11 exports are `Map`, `Camera`, `GeoJSONSource`, `VectorSource`, `Layer` (with a `type` prop), `Images`, `Marker`, `ViewAnnotation`, `Callout`, `UserLocation`, `OfflineManager`, `Animated`, `LocationManager`, `TransformRequestManager` `[Verified: package src/index.ts]`.
- **There is no** `MapView`, `ShapeSource`, `CircleLayer` or `SymbolLayer` component in v11.
- `Layer` takes **style-spec kebab-case** `paint`/`layout` props (`'line-color'`). The camelCase `style` prop is deprecated and removed in v12 `[Verified: Layer.tsx]`.
- Coordinates are `LngLat = [lng, lat]`. Bounds are `[west, south, east, north]` `[Verified: types]`.
- `GeoJSONSource onPress={(e) => e.nativeEvent.features}` has a default 44×44 px hitbox, overridable with `hitbox` `[Verified: PressableSourceProps]`.
- Layer ordering uses `beforeId` / `afterId` / `layerIndex` `[Verified]`.
- **Instruction for the agent:** "Read `node_modules/@maplibre/maplibre-react-native/lib/typescript/**/*.d.ts` before writing map code."

### 3.4 Expo Go fallback (optional)

Create `src/map/MapSurface.tsx` with an interface: `{crossings, creeks, route, detour, onCrossingPress, cameraTarget}`.
- `MapSurface.maplibre.tsx` is the real implementation.
- `MapSurface.expogo.tsx` uses `react-native-maps` with:
  - one `<Marker tracksViewChanges={false}>` per crossing, with a pre-rendered PNG per state;
  - `<Polyline>` for the route and creeks;
  - `userInterfaceStyle="dark"` on iOS (Apple Maps);
  - `provider={PROVIDER_GOOGLE}` + `customMapStyle` on Android.
- Select it with `import { isRunningInExpoGo } from 'expo'` `[Verified: expo/src/Expo.ts]`, and **`require()` MapLibre lazily** so Expo Go never evaluates the missing native module.
- Do **not** use `Constants.executionEnvironment === 'storeClient'`, because that value is true for dev-client builds too `[Verified: expo-constants types]`.
- Skip this adapter entirely if the Android dev build is ready by day 7.

---

## 4. Basemap and the "FordCast Night" style

### 4.1 Tile provider decision

| Provider | Key | Free limits | Attribution | Verdict |
|---|---|---|---|---|
| **OpenFreeMap** `https://tiles.openfreemap.org/styles/{liberty,bright,positron,dark,fiord}` | **None** | "No limits on the number of map views or requests" `[Verified: OFM README]` | `OpenFreeMap © OpenMapTiles Data from OpenStreetMap`. MapLibre adds it automatically through the attribution button, but **video and print must show it** `[Verified: OFM README]` | ✅ **Primary** |
| Stadia Maps (Alidade Smooth Dark) | API key (mobile can't use domain auth) | 200,000 credits/mo, **non-commercial** free plan `[Verified (secondary)]` | Required | Fallback |
| MapTiler Cloud | Key | 100k requests and 5k sessions/mo; free = non-commercial; logo required `[Verified (secondary): maptiler pricing via search]` | Logo | No |
| CARTO Dark Matter `basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json` | Free key now required outside CARTO `[Verified (secondary): CARTO blog via search]` | Terms unclear for apps | Required | No |
| Protomaps PMTiles (self-hosted Texas extract) | None | Your own hosting | OSM | Roadmap. MapLibre Native PMTiles support is partly confirmed (iOS 6.14 range requests) `[Unverified for pmtiles:// on Android]` |

**OFM style details** `[Verified: hyperknot/openfreemap-styles]`:
- The repo `styles/*/style.json` files use the placeholder `__TILEJSON_DOMAIN__`. Replace it with `tiles.openfreemap.org`.
- Sources: `openmaptiles` → `https://tiles.openfreemap.org/planet`.
- Glyphs: `https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf`.
- Sprite: `https://tiles.openfreemap.org/sprites/ofm_f384/ofm`.
- Available fonts: **`Noto Sans Regular`, `Noto Sans Bold`, `Noto Sans Italic`** only. **Map labels cannot use Inter**, so use Noto in every symbol layer (the app UI outside the map uses Inter).
- "Dark" and "Fiord" are **unmodified, abandoned-upstream** forks. Liberty, Bright and Positron are maintained.

**Decision:** Generate `fordcast-night.json` from **Positron** (maintained, minimal, no POIs, 55 layers) by recoloring layers by `type` + `source-layer`. **Host it at a stable URL** (backend static route, e.g. `GET /styles/fordcast-night.json`). Use that URL for `<Map mapStyle>` and offline packs, and bundle a copy in the app as a fallback (`mapStyle` also accepts an object `[Verified: Map.tsx]`).

### 4.2 Night palette for the basemap (contrast computed with WCAG formula, python3)

| Token | Hex | Used for | Contrast vs `#0E1726` |
|---|---|---|---|
| `bg` | `#0E1726` | background | n/a |
| `land-residential` | `#111C2E` | landuse residential | ~1.1 (subtle on purpose) |
| `park` | `#102226` | park / wood | subtle |
| `water-fill` | `#0F2A3D` | water polygons (muted, **not cyan**) | 1.21 |
| `waterway` | `#1B4058` | basemap streams | 1.64 |
| `road-minor` | `#1C2940` | minor roads | 1.23 |
| `road-major` | `#25344F` | major roads | 1.44 |
| `road-motorway` | `#34466A` | motorways | 1.91 |
| `road-casing` | `#0A1220` | casings | n/a |
| `label-road` | `#A9B4C6` | road names, halo `#0E1726` w=1.5 | **8.58 ✓** |
| `label-place` | `#C9D2DE` | place names | **11.77 ✓** |
| `label-water` | `#5F87A3` | water names | **4.69 ✓** |
| **App state colors** (from concept doc, re-verified) | slate `#8A97AB` 6.07 ✓ · amber `#F5A623` 8.86 ✓ · red text `#FF5A4F` 5.84 ✓ · white on `#C62828` 5.62 ✓ · cyan `#2BD9D9` 10.29 ✓ | | |
| **Route** | `#7AA2FF` (periwinkle), casing `#0A1220` | Route line. Distinct from amber, red, cyan and slate. | **7.22 ✓** (3.78 on a motorway fill, which is ≥ 3:1 for non-text) |
| Cluster fills | no-signal `#5A6578` + white text (5.89) · watch `#F5A623` + `#0E1726` text (8.86) · avoid `#C62828` + white (5.62) | | fill vs bg: 3.05 / 8.86 / 3.19 (all ≥ 3:1) |

Basemap roads and water sit deliberately **below 2:1**. The basemap should recede so state colors, creeks and the route pop. Only labels need 4.5:1.

### 4.3 Style generator (`tools/make_style.py`, run once, commit the output)

```python
# python3 -I tools/make_style.py positron.json > assets/map/fordcast-night.json
import json, sys
src = json.load(open(sys.argv[1]))
s = json.loads(json.dumps(src).replace("__TILEJSON_DOMAIN__", "tiles.openfreemap.org"))
s["name"] = "FordCast Night"
s["sources"].pop("ne2_shaded", None)                    # drop raster hillshade source
s["layers"] = [l for l in s["layers"] if l.get("source") != "ne2_shaded"]
C = dict(bg="#0E1726", res="#111C2E", park="#102226", water="#0F2A3D", waterway="#1B4058",
         building="#131F33", minor="#1C2940", major="#25344F", motorway="#34466A", casing="#0A1220",
         rail="#1A2436", boundary="#2A3A55", lroad="#A9B4C6", lplace="#C9D2DE", lwater="#5F87A3")
for l in s["layers"]:
    t, sl, p = l["type"], l.get("source-layer"), l.setdefault("paint", {})
    if t == "background": p["background-color"] = C["bg"]
    elif sl == "water" and t == "fill": p["fill-color"] = C["water"]
    elif sl == "waterway" and t == "line": p["line-color"] = C["waterway"]
    elif sl == "park" or (sl == "landcover" and t == "fill"): p["fill-color"] = C["park"]
    elif sl == "landuse": p["fill-color"] = C["res"]
    elif sl == "building": p["fill-color"] = C["building"]; p.pop("fill-outline-color", None)
    elif sl == "transportation" and t == "line":
        i = l["id"]
        p["line-color"] = C["casing"] if "casing" in i else C["motorway"] if "motorway" in i \
            else C["major"] if "major" in i else C["rail"] if "rail" in i else C["minor"]
    elif sl == "boundary": p["line-color"] = C["boundary"]
    elif t == "symbol":
        p["text-color"] = C["lwater"] if sl in ("water_name", "waterway") else \
                          C["lroad"] if sl == "transportation_name" else C["lplace"]
        p["text-halo-color"] = C["bg"]; p["text-halo-width"] = 1.5
        if "shield" in l["id"]: l.setdefault("layout", {})["visibility"] = "none"  # bright US shields clash at night
print(json.dumps(s, separators=(",", ":")))
```
Positron layer IDs and source-layers used above come from the actual file `[Verified: OFM positron style.json]`. Tune after viewing on a phone at night brightness.

**Spanish basemap labels:** Positron's text-field is `coalesce(name_en, name)`. Austin names are English anyway, so leave basemap labels alone and translate only FordCast's own labels `[Inference]`.

---

## 5. Map layers: exactly how to build each visual

Layer stack (bottom → top). All of these sit above the basemap; insert creek layers with `beforeId` set to the first label layer (`"waterway_line_label"`) so labels stay readable:

1. `creeks-base`: all linked NHDPlus flowlines, `#1B4058`, width 1→3 by zoom.
2. `creeks-rising`: reaches upstream of Watch/Avoid crossings, cyan `#2BD9D9`, **animated dash** ("flow").
3. `creek-wave-<reachId>`: **line-gradient pulse** traveling gauge → crossing (signature moment; ≤3 layers).
4. `route-casing` / `route-line` / `route-blocked` / `detour-line`.
5. Crossing clusters / crossing icons / labels.
6. `Marker` pulse rings (React views) for the ≤20 Watch/Avoid crossings in view.
7. `UserLocation` puck.

### 5.1 Crossing data model (GeoJSON properties)

```ts
type CrossingState = 'no_signal' | 'unknown' | 'watch' | 'avoid' | 'closed';
const RANK: Record<CrossingState, number> = { no_signal: 0, unknown: 1, watch: 2, avoid: 3, closed: 4 };
// Feature<Point, { id: string; name: string; state: CrossingState; rank: number;
//   window: string | null /* "15–30 min" */; issuedAt: number; stale: boolean; lastKnown?: CrossingState }>
```

### 5.2 Clustering that never hides danger (important safety detail)

A plain cluster bubble showing "12" could hide an Avoid crossing inside it. Fix this with `clusterProperties` that aggregate the **maximum rank**, then color the cluster by it:

```tsx
<GeoJSONSource
  id="crossings"
  data={crossingsFC}
  cluster
  clusterRadius={40}
  clusterMaxZoom={12}                 // individual icons from z13
  clusterProperties={{
    maxRank: ['max', ['get', 'rank']],
    nAvoid: ['+', ['case', ['>=', ['get', 'rank'], 3], 1, 0]],
  }}
  hitbox={{ top: 22, right: 22, bottom: 22, left: 22 }}
  onPress={(e) => onCrossingOrClusterPress(e.nativeEvent.features[0])}
>
  <Layer id="cluster-circle" type="circle" filter={['has', 'point_count']}
    paint={{
      'circle-color': ['step', ['get', 'maxRank'], '#5A6578', 2, '#F5A623', 3, '#C62828'],
      'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 30, 24],
      'circle-stroke-color': ['case', ['==', ['get', 'maxRank'], 1], '#8A97AB', '#0E1726'],
      'circle-stroke-width': 2,
    }} />
  <Layer id="cluster-count" type="symbol" filter={['has', 'point_count']}
    layout={{ 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'], 'text-size': 14 }}
    paint={{ 'text-color': ['case', ['==', ['get', 'maxRank'], 2], '#0E1726', '#FFFFFF'] }} />   {/* dark text only on amber */}
  <Layer id="crossing-icon" type="symbol" filter={['!', ['has', 'point_count']]}
    layout={{
      'icon-image': ['match', ['get', 'state'],
        'closed', 'ic-closed', 'avoid', 'ic-avoid', 'watch', 'ic-watch', 'unknown', 'ic-unknown', 'ic-no-signal'],
      'icon-size': ['interpolate', ['linear'], ['zoom'], 11, 0.55, 16, 1.0],
      'icon-allow-overlap': true,
      'icon-ignore-placement': false,
      'symbol-sort-key': ['get', 'rank'],          // higher risk drawn on top
      'text-field': ['step', ['zoom'], '', 13.5, ['get', 'name']],
      'text-font': ['Noto Sans Regular'], 'text-size': 12,
      'text-offset': [0, 1.5], 'text-anchor': 'top', 'text-optional': true,
    }}
    paint={{ 'text-color': '#C9D2DE', 'text-halo-color': '#0E1726', 'text-halo-width': 1.5 }} />
</GeoJSONSource>
```

- Tap a cluster: `getClusterExpansionZoom(clusterId)` on the `GeoJSONSource` ref, then `camera.easeTo` `[Verified: GeoJSONSourceRef]`.
- **Tie-break on cluster click:** if `nAvoid > 0`, also open a bottom-sheet list of those crossings.

### 5.3 Icons: "never color-only" (icon + shape + word)

Register the icons with `<Images images={{ 'ic-avoid': require('../assets/map/ic-avoid.png'), … }} />` (`ImageEntry` = require, URI or `{source, sdf}` `[Verified]`). Ship @2x and @3x PNGs at 48 pt. Pre-colored PNGs, not SDF, so the patterns survive.

| State | Shape | Fill / glyph | Pattern |
|---|---|---|---|
| No current signal | circle | slate `#8A97AB`, dark "–" | solid |
| Unknown / data offline | circle | transparent, slate **dashed** ring, "?" | dashed outline |
| Watch | rounded triangle | amber `#F5A623`, dark "!" | solid |
| Avoid | octagon | `#C62828`, white "✕" | solid + white rim |
| Flooded/Closed | octagon | `#C62828`, white barricade icon | **diagonal barricade stripes** |

The state **word** always appears in the Crossing Card and list. The map adds a word label on the selected crossing.

### 5.4 Pulsing animated markers (Watch/Avoid only)

GPU layers cannot loop animations by themselves. Use RN `Marker` views (in v11 these are React children anchored at `lngLat` `[Verified: Marker props]`) **only for at-risk crossings in the viewport (≤ 20)**, animated with Reanimated on the UI thread:

```tsx
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, useReducedMotion } from 'react-native-reanimated';
export function PulseRing({ color }: { color: string }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!reduce) t.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1, false);
  }, [reduce]);
  const s = useAnimatedStyle(() => ({ transform: [{ scale: 0.6 + 1.4 * t.value }], opacity: 0.6 * (1 - t.value) }));
  return (
    <View pointerEvents="none" style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: color }, s]} />
    </View>
  );
}
// <Marker id={`pulse-${c.id}`} lngLat={c.lngLat} anchor="center"><PulseRing color={c.state==='watch'?'#F5A623':'#FF5A4F'} /></Marker>
```
- Reduce Motion → static double ring.
- Fallback if Reanimated inside `Marker` misbehaves: MLRN `Animated.Layer` (RN Animated) on a `circle` layer filtered to rank ≥ 2 `[Verified: Animated export]` `[Unverified: on-device perf]`.

### 5.5 Creek flowline layer and animated "flow"

**Data:** for each linked crossing, the upstream NHDPlus flowlines from the data pipeline (NLDI navigation, precomputed). Simplify to about 5 m with shapely and ship as `creeks.geojson` (< 1 MB). Properties: `{reachId, crossingIds[], gaugeIds[], rising:boolean}`.
- NHDPlus flowlines are digitized downstream `[Unverified]`. If the dash animation looks backwards, reverse the coordinates.

**(a) Rising-creek "flow" with an animated dasharray.** This is the Mapbox GL "animate a line" technique `[Unverified: sequence recalled from Mapbox GL JS example]`. Step through dash patterns every ~60 ms:

```ts
const DASH_SEQ = [[0,4,3],[0.5,4,2.5],[1,4,2],[1.5,4,1.5],[2,4,1],[2.5,4,0.5],[3,4,0],
  [0,0.5,3,3.5],[0,1,3,3],[0,1.5,3,2.5],[0,2,3,2],[0,2.5,3,1.5],[0,3,3,1],[0,3.5,3,0.5]];
function useDashStep(active: boolean, reduce: boolean) {
  const [i, setI] = useState(0);
  useEffect(() => { if (!active || reduce) return; const id = setInterval(() => setI(n => (n + 1) % DASH_SEQ.length), 60); return () => clearInterval(id); }, [active, reduce]);
  return DASH_SEQ[i];
}
// <Layer id="creeks-rising" type="line" filter={['==',['get','rising'],true]}
//   layout={{'line-cap':'butt','line-join':'round'}}
//   paint={{'line-color':'#2BD9D9','line-width':['interpolate',['linear'],['zoom'],10,1.5,15,4],'line-dasharray':dash}} />
```
- Pause the interval when `AppState !== 'active'`, when Reduce Motion is on, or when the camera zoom is < 10.
- **Cost:** one native style update per tick. Keep it to one layer `[Inference]`.

**(b) The signature moment: a water pulse travels from gauge to crossing**, using `line-gradient` with `line-progress`. This needs `lineMetrics` on the source `[Verified: MLRN GeoJSONSource docs]`, one source+layer per animated reach (≤ 3), and the reach geometry ordered gauge → crossing:

```ts
function pulseGradient(p: number): any {   // p in [0,1]; stops must strictly increase
  const dim = 'rgba(43,217,217,0.18)', hot = 'rgba(43,217,217,1)';
  const a = Math.max(0.0001, p - 0.12), b = Math.min(0.9998, Math.max(a + 0.0001, p)), c = Math.min(0.9999, b + 0.0001);
  return ['interpolate', ['linear'], ['line-progress'], 0, dim, a, dim, b, hot, c, dim, 1, dim];
}
// <GeoJSONSource id={`wave-${reachId}`} data={reachLine} lineMetrics>
//   <Layer id={`wave-layer-${reachId}`} type="line" layout={{'line-cap':'round'}}
//     paint={{'line-width':6,'line-blur':1,'line-gradient':pulseGradient(p)}} /></GeoJSONSource>
```
- **Live mode:** loop `p` 0 → 1 every 2.5 s (requestAnimationFrame, throttled to 30 fps) while the upstream gauge is rising.
- **Storm Replay:** drive `p` from replay time: `p = clamp((t − tTrigger) / τ, 0, 1)`, where `τ` is the learned travel time.
  - The pulse **reaches the crossing exactly when the forecast says**.
  - Then draw the "water over road (observed)" marker at its real timestamp.
  - The gap between the two is the lead time the video shows.
- `line-gradient` can't be data-driven per feature, which is why each reach gets its own layer `[Inference from GL spec]`.

### 5.6 Route line with casing, blocked segment and detour

```tsx
<GeoJSONSource id="route" data={routeFC}>
  <Layer id="route-casing" type="line" beforeId="crossing-icon" layout={{ 'line-cap': 'round', 'line-join': 'round' }}
    paint={{ 'line-color': '#0A1220', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 7, 16, 15] }} />
  <Layer id="route-line" type="line" beforeId="crossing-icon" layout={{ 'line-cap': 'round', 'line-join': 'round' }}
    paint={{ 'line-color': '#7AA2FF', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 4, 16, 10],
             'line-opacity': ['case', ['==', ['get', 'role'], 'original-blocked'], 0.35, 1] }} />
  <Layer id="route-blocked" type="line" filter={['==', ['get', 'role'], 'blocked-segment']}
    paint={{ 'line-color': '#FF5A4F', 'line-width': 5, 'line-dasharray': [1, 1.5] }} />
</GeoJSONSource>
```
- The **detour** uses the same `#7AA2FF` at full opacity, with a "Detour +4 min" pill as a `ViewAnnotation` at its midpoint.
- The original route is ghosted at 35%, with a dashed red stretch ±300 m around the blocked crossing.

### 5.7 3D off, night, camera and gestures

- `<Map … touchPitch={false} touchRotate={false} compass={false} logo={false} attribution attributionPosition={{ bottom: 8, left: 8 }} androidView="surface">` `[Verified: Map props]`. Keep attribution on, because OFM/OSM require it.
- `<Camera initialViewState={{ center: [-97.7431, 30.2672], zoom: 10.5 }} minZoom={8} maxZoom={17} maxBounds={[-98.6, 29.6, -97.0, 31.0]} />`. No pitch, so no 3D.
- `<UserLocation animated heading />` `[Verified props]`. **Drive Mode** uses `Camera trackUserLocation="heading"` `[Unverified: exact enum value; check TrackUserLocation type]`.
- `contentInset` keeps the map center above the bottom sheet `[Verified prop]`.

### 5.8 Map accessibility (VoiceOver/TalkBack can't read GL canvases)

- Wrap the map in `accessible accessibilityLabel={"Map. 2 crossings Avoid, 3 Watch within 10 miles."}`.
- A permanent "List" toggle opens a FlatList of crossings sorted by rank, then distance. Every row reads as "Avoid. Bull Creek at Loop 360. Likely flooded within 15 to 30 minutes. 2.1 miles."
- The Crossing Card is native RN text, so it is fully accessible.
- Use `AccessibilityInfo.isReduceMotionEnabled()` to switch off the dash, pulse and wave animations.

### 5.9 Runner-up snippet (if the agent switches to Mapbox)

```tsx
<Mapbox.MapView styleURL="mapbox://styles/mapbox/standard" scaleBarEnabled={false} pitchEnabled={false}>
  <Mapbox.StyleImport id="basemap" existing config={{ lightPreset: 'night', theme: 'faded', show3dObjects: false,
     showPointOfInterestLabels: false, showTransitLabels: false, colorWater: '#0F2A3D' }} />
  ...ShapeSource/SymbolLayer/LineLayer equivalents...
</Mapbox.MapView>
```
Config keys verified in `@rnmapbox/maps@10.3.8` `StyleImport.tsx`. Custom layers under Standard night need `*-emissive-strength: 1` to stay bright `[Verified (secondary): Mapbox Standard guide via search]`.

---

## 6. Routing with avoidance

### 6.1 Provider verification

| Provider | Avoid mechanism (exact) | Free quota | Verdict |
|---|---|---|---|
| **OpenRouteService** | `POST https://api.openrouteservice.org/v2/directions/driving-car/geojson`, body `options.avoid_polygons` = GeoJSON **Polygon or MultiPolygon** `[Verified: ORS docs routing-options.md]`. Key in the `Authorization` header `[Verified: ORS forum]`. GET can't carry avoid polygons, so POST is required `[Verified: ORS forum]`. | **Directions 2,000/day, 40/min** (sliding window). Daily limit → **403**, minute limit → **429** `[Verified: ORS plans + FAQ via search]`. Polygon caps (default config): `maximum_avoid_polygon_area: 200000000`, `maximum_avoid_polygon_extent: 20000` ("of a polygon"; units ambiguous, probably m² and m) `[Verified: ors-config.yml + config docs]`. `maximum_distance_avoid_areas: 100000` (default config; public API may differ) `[Verified: ors-config.yml]`. | ✅ **Primary** |
| **Stadia Maps (Valhalla)** | `POST https://api.stadiamaps.com/route/v1?api_key=KEY` `[Verified: Stadia docs via search]`. `exclude_polygons` = rings `[[[lon,lat],…],…]`; roads **intersecting the rings** are avoided; or `exclude_locations` (mapped to the closest roads) `[Verified: Valhalla api-reference.md]`. Valhalla default caps: `max_exclude_locations: 50`, `max_exclude_polygons_length: 10000` (total perimeter in m), `max_exclude_polygons_vertices: 100` `[Verified: valhalla_build_config]`. Stadia's own caps `[Unverified]`. | 200k credits/mo free, non-commercial `[Verified (secondary)]` | ✅ **Fallback** |
| Mapbox Directions | `exclude=point(<lng> <lat>),point(…)`. The serialization (space between lon and lat, comma between points) is confirmed in Mapbox's own Java SDK `Exclude.java` `[Verified: mapbox-java source]`. Max points `[Unverified, maybe 50]`. | ~100k req/mo `[Unverified]` | Only if on Mapbox |
| GraphHopper | `custom_model.areas` (FeatureCollection) + `ch.disable=true` `[Verified: GH custom-models.md]`. **Free plan: 500 credits/day, and custom models likely need a paid plan** `[Verified (secondary): GH forum]`. | | No |
| TomTom | `avoidAreas` rectangles in the POST body `[Unverified: format/limit]` | | No |
| HERE v8 | `avoid[areas]=bbox:w,s,e,n` or `polygon:…`, `|`-separated `[Verified: HERE docs via search]` | `[Unverified]` | No |

### 6.2 Why the request goes through the backend
- It hides the ORS and Stadia keys.
- The server already knows current risk, so it builds the avoid set itself. Clients can't lie or go stale.
- Results can be cached.
- Quota is pooled and protected by a server-side rate limiter.

**Endpoint contract:**

```
POST /v1/route
{ "origin": [lng,lat], "destination": [lng,lat], "lang": "en"|"es", "replayAt"?: ISO8601 }
→ 200 {
  "baseline":   { "geometry": LineString, "durationS": 812, "distanceM": 10432 },
  "crossingsOnBaseline": [ { "id": "...", "state": "avoid", "alongM": 6120, "window": "15–30 min" } ],
  "detour":     { "geometry": LineString, "durationS": 1056, "distanceM": 12870 } | null,
  "detourAddedMin": 4,
  "viaPoints":  [[lng,lat], ...],          // for hand-off links (§8)
  "provider": "ors"|"stadia", "issuedAt": 1760450000, "riskAsOf": 1760449700
}
```
- `replayAt` routes against **Storm Replay** states. This is how the demo shows a detour on a dry day (same roads, historic risk).

### 6.3 Backend implementation (FastAPI, httpx, shapely 2.x, pyproj)

```python
# app/routing.py
import os, httpx
from shapely.geometry import Point, LineString, shape, mapping
from shapely.ops import transform
from pyproj import Transformer

TO_M  = Transformer.from_crs("EPSG:4326", "EPSG:32614", always_xy=True).transform   # UTM 14N covers Austin
TO_LL = Transformer.from_crs("EPSG:32614", "EPSG:4326", always_xy=True).transform
ORS_URL = "https://api.openrouteservice.org/v2/directions/driving-car/geojson"
STADIA_URL = "https://api.stadiamaps.com/route/v1"
AVOID_STATES = {"avoid", "closed"}           # Watch is shown but not routed around (configurable)
RADIUS_M = 75                                 # circle around the crossing point

def circle_ll(lon, lat, r=RADIUS_M, quad_segs=4):         # 16-vertex circle
    poly_m = transform(TO_M, Point(lon, lat)).buffer(r, quad_segs=quad_segs)
    return transform(TO_LL, poly_m)

def ors_body(o, d, polys, lang):
    body = {"coordinates": [o, d], "preference": "fastest", "units": "m",
            "instructions": False, "radiuses": [350, 350]}
    if polys:
        body["options"] = {"avoid_polygons": {"type": "MultiPolygon",
                           "coordinates": [[list(p.exterior.coords)] for p in polys]}}
    return body

async def ors_route(client, o, d, polys, lang):
    r = await client.post(ORS_URL, json=ors_body(o, d, polys, lang),
                          headers={"Authorization": os.environ["ORS_KEY"],
                                   "Accept": "application/geo+json"}, timeout=12)
    if r.status_code in (403, 429): raise QuotaError(r.status_code)
    r.raise_for_status()
    f = r.json()["features"][0]
    return LineString(f["geometry"]["coordinates"]), f["properties"]["summary"]  # {distance, duration}

async def stadia_route(client, o, d, polys, lang):
    body = {"locations": [{"lon": o[0], "lat": o[1]}, {"lon": d[0], "lat": d[1]}],
            "costing": "auto", "format": "osrm", "shape_format": "geojson",   # [Verified: Valhalla docs]
            "exclude_polygons": [list(p.exterior.coords) for p in polys]}
    r = await client.post(STADIA_URL, params={"api_key": os.environ["STADIA_KEY"]}, json=body, timeout=12)
    r.raise_for_status()
    rt = r.json()["routes"][0]
    return LineString(rt["geometry"]["coordinates"]), {"distance": rt["distance"], "duration": rt["duration"]}

def crossings_on(line_ll, crossings, tol_m=40):
    line_m = transform(TO_M, line_ll); out = []
    for c in crossings:
        pt = transform(TO_M, Point(c.lon, c.lat))
        if line_m.distance(pt) <= tol_m:
            out.append((c, line_m.project(pt)))       # alongM for ordering
    return sorted(out, key=lambda t: t[1])
```

**Algorithm:**
1. Compute the baseline route with **no** polygons.
2. Find `crossingsOnBaseline` (any state). If none of them are Avoid/Closed, return `detour: null`.
3. Build polygons **only for Avoid/Closed crossings within 2 km of the baseline**. This keeps the set small and inside ORS extent and area caps.
4. Call ORS with the avoid MultiPolygon, then check that the detour no longer passes any avoid crossing.
   - If it still does, grow the radius to 150 m and retry once.
   - If it still does, return `detour` together with `warning:"no_safe_detour_found"`. The UI then says "No detour found that avoids [crossing]. Wait or choose another destination."
5. `detourAddedMin = round((detour.duration − baseline.duration)/60)`.
6. On 403/429/5xx/timeout, retry the same request on Stadia.
7. Cache keyed by `(round(o,4), round(d,4), sorted avoid ids)` for 5 min.
8. **Re-validation:** the app re-calls `/v1/route` whenever a crossing within 2 km of the active route changes state (Supabase Realtime event), and every 5 min in Drive Mode. That stays within quota.

**Example raw request** (for tests and README):

```bash
curl -X POST https://api.openrouteservice.org/v2/directions/driving-car/geojson \
 -H "Authorization: $ORS_KEY" -H "Content-Type: application/json" \
 -d '{"coordinates":[[-97.7890,30.3600],[-97.7431,30.2672]],"preference":"fastest","units":"m",
      "options":{"avoid_polygons":{"type":"MultiPolygon","coordinates":[[[[-97.7845,30.3542],[-97.7838,30.3548],
      [-97.7830,30.3542],[-97.7838,30.3536],[-97.7845,30.3542]]]]}}}'
```

**Attribution** in the Check My Drive footer: "Routing © openrouteservice.org by HeiGIT · Map data © OpenStreetMap contributors" `[Unverified exact wording; OSM credit is mandatory]`.

---

## 7. Route vs. crossing intersection

**Decision: on device with Turf v7.4** for the display and Drive Mode check (works offline with cached risk). The server does the same check in `/v1/route` (shapely, §6.3), so both always agree. PostGIS `ST_DWithin(geography, 40)` is reserved for **server-side batch jobs** such as "which saved routes does this escalation affect?" for push targeting.

```ts
import { pointToLineDistance } from '@turf/point-to-line-distance';
import { nearestPointOnLine } from '@turf/nearest-point-on-line';
import { bbox } from '@turf/bbox';

export function crossingsOnRoute(route: GeoJSON.Feature<GeoJSON.LineString>, crossings: CrossingFeature[], tolM = 40) {
  const [w, s, e, n] = bbox(route); const pad = 0.005;                   // ~500 m prefilter
  return crossings
    .filter(c => { const [x, y] = c.geometry.coordinates; return x > w - pad && x < e + pad && y > s - pad && y < n + pad; })
    .map(c => ({ c, d: pointToLineDistance(c, route, { units: 'meters' }) }))
    .filter(({ d }) => d <= tolM)
    .map(({ c }) => ({ ...c, alongM: nearestPointOnLine(route, c, { units: 'meters' }).properties.totalDistance }))
    .sort((a, b) => a.alongM - b.alongM);
}
```
- Turf **7.4 renamed** `nearestPointOnLine` properties: `totalDistance` (was `location`), `pointDistance` (was `dist`), `segmentIndex` (was `index`). The old names still work until the next major `[Verified: @turf/nearest-point-on-line@7.4.0 d.ts]`.
- Named exports: `import { pointToLineDistance } from '@turf/point-to-line-distance'` `[Verified: d.ts]`.
- Tolerance is **40 m**, because routed lines follow road centerlines and the crossing point sits on the road. Use 60 m for crossings flagged `divided_road` `[Inference]`.
- **Drive Mode "ahead" test:** a crossing counts as ahead only if `alongM(crossing) > alongM(user) + 50`.
  - Off-route fallback: the bearing from the user to the crossing is within ±60° of heading and the distance is decreasing over 3 fixes.

---

## 8. Hand-off deep links to external nav apps

### 8.1 Formats

| App | Format | Waypoints | Source |
|---|---|---|---|
| **Google Maps** | `https://www.google.com/maps/dir/?api=1&origin=LAT,LNG&destination=LAT,LNG&waypoints=LAT,LNG%7CLAT,LNG&travelmode=driving` | Yes, `|` encoded as `%7C`. **Up to 3 on mobile**, 9 otherwise. URLs ≤ 2,048 chars. `api=1` is mandatory. | `[Verified: Google Maps URLs guide (api=1, %7C, 2048) via search]`; waypoint count `[Verified (secondary): googleway docs]` |
| | Omit `dir_action=navigate` when waypoints are present, so the user **sees the detour preview** and taps Start | | Whether navigate keeps waypoints `[Unverified]` |
| **Apple Maps (iOS 18.4+)** | `https://maps.apple.com/directions?source=LAT,LNG&destination=LAT,LNG&waypoint=LAT,LNG&waypoint=LAT,LNG&mode=driving` | Yes, repeat `waypoint`. `avoid=tolls,highways` exists, but there is no area avoid. | `[Verified: developer.apple.com unified-map-urls]` |
| Apple Maps (< iOS 18.4) | `https://maps.apple.com/?saddr=LAT,LNG&daddr=LAT,LNG&dirflg=d` | No, so do a two-leg hand-off | `[Unverified: legacy params]` |
| **Waze** | `https://waze.com/ul?ll=LAT,LNG&navigate=yes&utm_source=fordcast` | **No.** Two-leg: navigate to the via point first. | `[Verified: developers.google.com/waze/deeplinks via search]` |

### 8.2 Via-point selection (server, returned as `viaPoints`)
Neither app knows FordCast's forecast. We push them onto the detour by adding a via point on it that the baseline route does not use:

```python
def pick_via_points(baseline_ll, detour_ll, avoid_pts_ll, max_pts=2, step=50):
    b, d = transform(TO_M, baseline_ll), transform(TO_M, detour_ll)
    avoid = [transform(TO_M, Point(p)) for p in avoid_pts_ll]
    samples = [d.interpolate(i * step) for i in range(int(d.length // step) + 1)]
    flags = [p.distance(b) > 150 and min((p.distance(a) for a in avoid), default=1e9) > 400 for p in samples]
    runs, cur = [], []                                      # longest contiguous divergent run
    for p, f in zip(samples, flags):
        if f: cur.append(p)
        elif cur: runs.append(cur); cur = []
    if cur: runs.append(cur)
    if not runs: return []
    run = max(runs, key=len)
    picks = [run[len(run)//2]] if len(run) * step < 5000 or max_pts == 1 else [run[len(run)//4], run[3*len(run)//4]]
    return [list(transform(TO_LL, p).coords)[0] for p in picks]
```

### 8.3 Client builder

```ts
import { Linking, Platform } from 'react-native';
const ll = ([lng, lat]: number[]) => `${lat.toFixed(6)},${lng.toFixed(6)}`;
export function googleUrl(o: number[], d: number[], vias: number[][]) {
  const wp = vias.slice(0, 3).map(ll).join('|');
  return `https://www.google.com/maps/dir/?api=1&origin=${ll(o)}&destination=${ll(d)}&travelmode=driving` +
         (wp ? `&waypoints=${encodeURIComponent(wp)}` : '&dir_action=navigate');
}
export function appleUrl(o: number[], d: number[], vias: number[][]) {
  const v = Platform.OS === 'ios' ? parseFloat(String(Platform.Version)) : 0;
  if (v >= 18.4) return `https://maps.apple.com/directions?source=${ll(o)}&destination=${ll(d)}` +
                        vias.map(p => `&waypoint=${ll(p)}`).join('') + `&mode=driving`;
  return `https://maps.apple.com/?saddr=${ll(o)}&daddr=${ll(vias[0] ?? d)}&dirflg=d`;   // leg 1 only
}
export const wazeUrl = (to: number[]) => `https://waze.com/ul?ll=${ll(to)}&navigate=yes&utm_source=fordcast`;
```

**UX for the two-leg case (Waze, old Apple Maps):**
1. Show a sheet: "Waze can't avoid this crossing. FordCast will send you to a safe detour point first."
2. When the user reaches within 150 m of the via point (Drive Mode location, or a geofence registered on the via point), send a local notification "Detour point reached. Continue to destination" with an action that opens leg 2.

**Disclaimer in the hand-off sheet:** "Google/Apple/Waze don't know about this forecast. If they route you back toward [crossing], don't follow them. Turn around."

---

## 9. Geocoding and search (destinations, saved places)

| Option | Facts | Verdict |
|---|---|---|
| **ORS Pelias** `GET https://api.openrouteservice.org/geocode/autocomplete` | **1,000/day, 100/min** each for search, reverse and autocomplete on the free Standard plan `[Verified: ORS plans via search]`. Pelias params `text`, `focus.point.lat/lon`, `boundary.rect.*`, `boundary.country`, `layers`, `size` `[Verified: pelias/documentation autocomplete.md]` | ✅ **Primary (through backend)** |
| **Photon (komoot)** `https://photon.komoot.io/api/?q=…&lat=…&lon=…&limit=…&lang=…&bbox=minLon,minLat,maxLon,maxLat` | Free with no key. "As long as the number of requests stay in a reasonable limit. Extensive usage will be throttled or completely banned… no guarantees for availability" `[Verified: komoot/photon README + docs/api-v1.md]` | ✅ Fallback (backend) |
| Nominatim (OSMF public) | Max 1 req/s, and a real User-Agent is required `[Verified (secondary)]`. Autocomplete is forbidden by policy `[Unverified]`. | ❌ |
| Mapbox Search Box | Session-billed. The free allowance is in flux (2,500 → 500 sessions in a Sept 2026 "preview" pricing change) `[Verified (secondary): pricingsaas, frontdeskreview]` | Only if on Mapbox |
| Stadia autocomplete | Credit-billed. v2 is about 1 credit per keystroke and 20 per place detail `[Verified (secondary)]`. Needs a key in the app or backend. | Alternate |
| `expo-location.geocodeAsync` / `reverseGeocodeAsync` | Uses the platform geocoder. Free, **no autocomplete**. Docs warn about rate limits ("use sparingly"). Android needs foreground permission. Web returns `[]` `[Verified: expo-location 57 source JSDoc]`. | ✅ Last-resort, offline-ish (Expo Go OK) |

**Backend `GET /v1/search?q=&lat=&lon=&lang=`** calls:
```
https://api.openrouteservice.org/geocode/autocomplete?api_key=KEY&text=<q>&focus.point.lat=<lat|30.2672>
 &focus.point.lon=<lon|-97.7431>&boundary.rect.min_lon=-98.6&boundary.rect.min_lat=29.6
 &boundary.rect.max_lon=-97.0&boundary.rect.max_lat=31.0&boundary.country=US&size=6
 &layers=venue,address,street,neighbourhood,locality
```
`api_key` as a query param for ORS GET endpoints `[Unverified; Authorization header also accepted for directions]`.
- Normalize to `{id, label, sublabel, lngLat, source}`.
- Cache 7 days server-side.
- On 403/429/5xx, fall back to Photon (`lang=en`; Photon has no Spanish name index on the public server, per the README's "English, German, French and local language" `[Verified]`).

**Client:**
- Debounce 350 ms, minimum 3 characters, `AbortController` cancels stale requests.
- Show **Saved places** (SQLite) and **recents** before any network call.
- "Use current location" row at the top.
- Reverse geocode on long-press: backend `/geocode/reverse`, falling back to `reverseGeocodeAsync`.

---

## 10. Location

### 10.1 Facts that shape the design `[Verified: expo-location 57 docs + native source]`
- **Geofencing limits:** iOS **20** regions monitored at once. Android **100** active geofences.
- **iOS** reports the **initial state** of registered regions at app start.
- **iOS** relaunches a terminated app on a geofence event. **Android does not** restart a terminated app for location/geofence events. Behavior after swipe-away varies by vendor.
- `startGeofencingAsync` **requires background ("Always") permission** on both platforms, and on iOS also `UIBackgroundModes: location`. It throws otherwise (native source: `ensureBackgroundLocationPermissions` / `isMissingBackgroundPermissions`).
- `startLocationUpdatesAsync` paths:
  - **Android** with `foregroundService` works with **foreground-only permission**, but must be **started while the app is foregrounded** (`ForegroundServiceStartNotAllowedException`).
  - **iOS** checks only foreground permission plus the location background mode. It **automatically also starts significant-location-change monitoring**.
  - The iOS consumer defaults `pausesUpdatesAutomatically` to **true** in native code even though the TS docs say false. **Always pass it explicitly.**
- **Expo Go:** no background location on iOS. Foreground and background *services* are unavailable on Android.
- `requestBackgroundPermissionsAsync` on Android 11+ **opens system settings**, so explain the step first. Foreground permission must already be granted.

### 10.2 Permission flow (contextual, minimal)

| Step | Trigger | Call | Copy |
|---|---|---|---|
| 0 | Onboarding (no OS prompt) | none | "FordCast never shows a crossing as 'safe'. It warns you when water is coming." |
| 1 | First tap on "Show my location" or Check My Drive | `requestForegroundPermissionsAsync()` | When-In-Use |
| 2 | User turns on **"Alert me while I use other apps"** | Explainer sheet, then `requestBackgroundPermissionsAsync()` | iOS: "Choose **Change to Always Allow**". Android: "Tap **Allow all the time**" (settings opens). |
| 3 | Same toggle | Create Android channels **first** (Android 13 won't prompt until a channel exists `[Verified: notifications docs]`), then `Notifications.requestPermissionsAsync()` | |
| 4 | Optional "Auto Drive Mode" toggle | `Location.requestMotionActivityPermissionsAsync()` (Android `ACTIVITY_RECOGNITION`, iOS Motion & Fitness) `[Verified: source]` | |

- If background is denied, everything still works in the foreground. The Settings screen shows "Background alerts: off. Tap to enable", deep-linking with `Linking.openSettings()`.
- If the user picks iOS **Approximate location**, show "Precise location is needed for crossing alerts" `[Unverified: how expo-location 57 exposes accuracy authorization]`.

### 10.3 Geofence task + rotation (Stretch, dev build)

```ts
// src/tasks/index.ts: imported FIRST in the entry file (before expo-router), so headless relaunch finds the task
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
export const GEOFENCE_TASK = 'fordcast.geofence';
export const RERANK_ID = '__rerank__';

TaskManager.defineTask<{ eventType: Location.GeofencingEventType; region: Location.LocationRegion }>(
  GEOFENCE_TASK, async ({ data, error }) => {
    if (error || !data) return;
    const { eventType, region } = data;
    if (region.identifier === RERANK_ID) {
      if (eventType === Location.GeofencingEventType.Exit) await rerankGeofences();   // reads SQLite, re-registers
      return;
    }
    if (eventType !== Location.GeofencingEventType.Enter) return;
    if (Date.now() - (await getMeta('geofencesRegisteredAt')) < 10_000) return;      // ignore initial-state burst
    const risk = await db.getCachedRisk(region.identifier!);                           // expo-sqlite
    if (!risk || risk.state === 'no_signal') return;
    if (await db.alertedWithin(region.identifier!, 30 * 60_000)) return;               // de-dup 30 min
    await Notifications.scheduleNotificationAsync({
      content: buildCrossingAlert(risk),                                                 // §11.3, localized, age-labeled
      trigger: Platform.OS === 'android' ? { channelId: 'crossing-alerts' } : null,     // ChannelAwareTriggerInput [Verified]
    });
    await db.logAlert(region.identifier!, risk.state);
  });
```

**Rotation algorithm:** `rerankGeofences()` runs on app foreground, risk update, geofence exit, background task and Drive Mode location ticks.
1. Candidates = crossings with state ∈ {watch, avoid, closed} **or** `stale && lastKnown ∈ {avoid, closed}`, within 25 km.
2. Score = `{closed:4, avoid:3, watch:2}[state] / (distanceKm + 0.5)`. Multiply by 1.5 if the crossing is on a saved route, and by 1.3 if it's within ±60° of the last heading.
3. Capacity is `Platform.OS === 'ios' ? 19 : 60`. Android is capped at 60 to stay well under 100 and save battery `[Inference]`.
4. **Crossing regions:** `radius: 1000` m (about 50 s of warning at 45 mph, which covers iOS region-entry latency `[Unverified: latency typically tens of seconds]`), `notifyOnEnter:true`, `notifyOnExit:false`.
5. **Re-rank fence** (#20 on iOS): centered on the user, `radius = clamp(0.5 × distance to the nearest *unregistered* candidate, 1000, 5000)`, `notifyOnEnter:false`, `notifyOnExit:true`.
6. `await Location.startGeofencingAsync(GEOFENCE_TASK, regions)`. Calling it again with a new array updates the set `[Verified: JSDoc]`.
7. Save `geofencesRegisteredAt`.
8. If there are 0 candidates, call `stopGeofencingAsync`. No at-risk crossings means zero battery cost.

### 10.4 Drive Mode location (foreground and background)

```ts
// Foreground (Drive Mode screen open):
const sub = await Location.watchPositionAsync(
  { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 10 }, onFix);

// Background continuation (user switched to Google Maps). Start while foregrounded:
await Location.startLocationUpdatesAsync('fordcast.drive', {
  accuracy: Location.Accuracy.High,
  distanceInterval: 25,
  activityType: Location.ActivityType.AutomotiveNavigation,
  pausesUpdatesAutomatically: false,           // explicit: native iOS default is true
  showsBackgroundLocationIndicator: true,      // honest blue pill on iOS
  foregroundService: {                         // Android: works with foreground-only permission
    notificationTitle: 'FordCast Drive Mode',
    notificationBody: 'Watching crossings on your route',
    notificationColor: '#0E1726',
    killServiceOnDestroy: true,
  },
});
// Stop when: destination reached (<150 m), stationary >5 min (speed<1 m/s), or user taps End.
```
- **Outside Drive Mode, run no continuous background location.** Geofences only, which are cheap.
- Battery practices:
  - `Accuracy.Balanced` for any non-drive refresh.
  - `deferredUpdatesDistance: 500` if a passive background task is ever used.
  - Stop updates when stationary.
  - Never use `BestForNavigation` except while actively driving and plugged in `[Inference]`.

### 10.5 "You're driving" detection (Stretch)

```ts
// Motion (new in expo-location 57) [Verified: source]
const motionSub = await Location.watchMotionActivityAsync((a) => {
  const auto = a.activities.automotive;   // MotionActivityType.Automotive = 'automotive'
  driving.motion = auto.detected && auto.confidence >= Location.MotionActivityConfidence.Medium;
});
// Speed backup: LocationObject.coords.speed is m/s (null/negative = invalid) [Verified: types]
// driving = median(speed over last 15 s) > 6.7 m/s (15 mph) && accuracy < 50 m
// not driving = speed < 2 m/s for 120 s
```
- When `driving` becomes true while the app is in the foreground, show a **single giant banner**: "Driving? Switch to Drive Mode" (one tap, ≥ 64 pt).
- **Lock the search text field while moving** (NHTSA: no visual-manual text entry while driving). Show "Passenger? Tap to unlock", which requires a deliberate 2-second hold `[Inference from NHTSA 2013 guidelines cited in concept doc]`.

### 10.6 Background refresh
- `expo-background-task`, `minimumInterval: 15`. This is inexact, and iOS may run it rarely or overnight `[Verified: package JSDoc]`.
- The job: fetch `/v1/crossings/risk?since=`, update SQLite, run `rerankGeofences()`.
- **Data-only push** (`contentAvailable: true` iOS) on risk escalations wakes the app to re-rank. iOS throttles background pushes `[Unverified: rate]`, so the visible push in §11 is the real alert.

---

## 11. Notifications

### 11.1 Facts `[Verified: expo-notifications 57 source + Expo push docs]`
- Push is **not built into Expo Go**, so a development build is required. Local notifications work in Expo Go.
- Android 8+ needs channels. Android 13 shows no permission prompt until a channel exists.
- Expo Push API endpoints:
  - Send: `POST https://exp.host/--/api/v2/push/send` (≤ **100 messages/request**).
  - Receipts: `POST https://exp.host/--/api/v2/push/getReceipts` (≤ **1,000 ids**). Check about **15 min** after sending. Receipts are deleted after **24 h**.
  - Limits: **600 notifications/s per project**. Payload ≤ **4 KiB**.
  - Errors: `DeviceNotRegistered` (stop sending), `MessageTooBig`, `MessageRateExceeded` (back off), `MismatchSenderId`, `InvalidCredentials`.
  - Fields: `to, data, title, body, ttl, expiration, priority('default'|'normal'|'high'), subtitle, sound, badge, interruptionLevel('active'|'critical'|'passive'|'time-sensitive'), channelId, icon, richContent, categoryId, mutableContent, contentAvailable`.
  - **Enhanced security:** enable "require access token" in EAS and send `Authorization: Bearer <EXPO_ACCESS_TOKEN>`.
- Local notification `interruptionLevel` values are camelCase: `'passive'|'active'|'timeSensitive'|'critical'`. **Push uses the hyphenated `'time-sensitive'`.**
- **Time-sensitive** needs the entitlement `com.apple.developer.usernotifications.time-sensitive`. It is self-serve and does not need Apple approval `[Unverified (approval): Apple forum + OneSignal indicate the capability just needs enabling]`.
- **Critical Alerts** need a **special entitlement granted by Apple** for health, safety, security and emergency use. Reviews take weeks, and the user must also opt in `[Verified (secondary): Apple forums, Xamarin docs]`. **Not feasible by Oct 26 → Roadmap** ("apply after CAC").

### 11.2 Setup (app start, before requesting permission)

```ts
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
}); // shouldShowAlert is deprecated [Verified: types]

await Notifications.setNotificationChannelAsync('crossing-alerts', {
  name: t('channel.crossingAlerts'), importance: Notifications.AndroidImportance.MAX,
  sound: 'fordcast_alert.wav', vibrationPattern: [0, 400, 200, 400], lightColor: '#FF5A4F',
  lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC, enableVibrate: true, bypassDnd: false,
});
await Notifications.setNotificationChannelAsync('drive-mode', {
  name: t('channel.driveMode'), importance: Notifications.AndroidImportance.LOW, sound: null,
  lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
});
await Notifications.setNotificationChannelAsync('outlook', {
  name: t('channel.outlook'), importance: Notifications.AndroidImportance.DEFAULT,
});

// Actionable category: re-register on locale change so button titles are translated
await Notifications.setNotificationCategoryAsync('crossing-alert', [
  { identifier: 'SHOW_DETOUR', buttonTitle: t('notif.showDetour'), options: { opensAppToForeground: true } },
  { identifier: 'OPEN_CARD',   buttonTitle: t('notif.details'),    options: { opensAppToForeground: true } },
  { identifier: 'MUTE_1H',     buttonTitle: t('notif.mute1h'),     options: { opensAppToForeground: false } },
]);
Notifications.addNotificationResponseReceivedListener(({ actionIdentifier, notification }) => {
  const id = notification.request.content.data?.crossingId as string;
  if (actionIdentifier === 'SHOW_DETOUR') router.push(`/drive/check?avoid=${id}`);
  else if (actionIdentifier === 'MUTE_1H') muteCrossing(id, 3600_000);
  else router.push(`/crossing/${id}`);   // DEFAULT_ACTION_IDENTIFIER
});
// Cold start from a tap: Notifications.getLastNotificationResponseAsync() [Verified export]
```
Android `bypassDnd` needs Do-Not-Disturb access the user grants manually. **Don't request it.**

### 11.3 Alert content (safety rules applied)

```ts
function buildCrossingAlert(r: CachedRisk): Notifications.NotificationContentInput {
  const ageMin = Math.round((Date.now() - r.issuedAt) / 60000);
  const asOf = ageMin > 20 ? ` ${t('notif.asOf', { min: ageMin })}` : '';
  return {
    title: t(`notif.title.${r.state}`, { name: r.name }),   // "AVOID: Bull Creek at Loop 360"
    body: r.state === 'closed' ? t('notif.body.closed') + asOf
        : t('notif.body.window', { window: r.window }) + asOf, // "Likely flooded within 15–30 min. Detour ready."
    data: { crossingId: r.id, state: r.state, issuedAt: r.issuedAt },
    categoryIdentifier: 'crossing-alert',
    sound: 'fordcast_alert.wav',
    interruptionLevel: r.state === 'watch' ? 'active' : 'timeSensitive',   // iOS; needs entitlement for timeSensitive
  };
}
```
- Never write "safe" or "clear". Use a **range**, never a countdown. Add "as of N min ago" when older than 20 min.
- Closed always says "Turn around, don't drown." Both languages come from i18n, and the language is stored on the device.

### 11.4 Server push (Python, plain httpx, no SDK needed)

```python
async def send_escalation(client, tokens_by_lang, crossing, state, window, issued_at):
    msgs = []
    for lang, tokens in tokens_by_lang.items():
        for t in tokens:
            msgs.append({"to": t, "title": TITLE[lang][state].format(name=crossing.name_i18n[lang]),
                         "body": BODY[lang][state].format(window=window),
                         "data": {"crossingId": crossing.id, "state": state, "issuedAt": issued_at},
                         "priority": "high", "channelId": "crossing-alerts", "categoryId": "crossing-alert",
                         "sound": "default", "interruptionLevel": "time-sensitive" if state != "watch" else "active",
                         "ttl": 1800})          # SAFETY: a stale flood warning must not arrive hours late
    for i in range(0, len(msgs), 100):          # ≤100 per request
        r = await client.post("https://exp.host/--/api/v2/push/send", json=msgs[i:i+100],
                              headers={"Authorization": f"Bearer {EXPO_ACCESS_TOKEN}"}, timeout=15)
        store_tickets(r.json()["data"])          # poll getReceipts after 15 min; prune DeviceNotRegistered
```

- **When to push:** only on **escalation** (no_signal→watch, watch→avoid, any→closed), and at most once per crossing per 30 min per device.
- **Privacy-preserving targeting:** devices register `{expoPushToken, lang, zones:[...]}`, where zones are the **HUC-12 watershed IDs or ~5 km grid cells** of home, work and saved routes, chosen on device.
  - The server never stores raw GPS. A crossing escalation pushes to tokens whose zones contain it.
  - Live position-based alerts are handled **on device** by geofences.

### 11.5 Tiering
- **MVP:** local notifications from Storm Replay and the foreground app, plus Android push.
- **Stretch:** iOS push (paid account), `timeSensitive`, actionable buttons.
- **Roadmap:** Critical Alerts entitlement, SMS.

---

## 12. Live Activities, Dynamic Island and widgets

**`expo-widgets@57.0.24`** builds iOS widgets **and Live Activities** from `@expo/ui/swift-ui` components with **no Swift**. It is not in Expo Go `[Verified: SDK 57 widgets.mdx]`.
- `createLiveActivity(name, component)`: the component starts with the `'widget'` directive and returns `{banner, bannerSmall?, compactLeading, compactTrailing, minimal, expandedLeading, expandedTrailing, expandedCenter, expandedBottom}`.
- Instance methods: `.start(props, url?)`, `.update(props)`, `.end(policy, finalProps?, contentDate?)`. `Factory.getInstances()` recovers activities after relaunch.
- Remote updates: `enablePushNotifications` plus push-to-start (iOS 17.2+) and per-activity tokens.
- **Do not add a `widgets[]` entry for a Live Activity.**
- Widget code runs in an isolated runtime: no hooks, no app state, no async.

```tsx
// src/live/DriveActivity.tsx (STRETCH, iOS + paid Apple account)
import { Image, Text, VStack, HStack } from '@expo/ui/swift-ui';
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
// start on Drive Mode begin: DriveActivity.start(props, 'fordcast://drive'); update on risk change; end on arrival.
```

- Show a **range, never a countdown**. Use SF Symbols `exclamationmark.triangle.fill` (Watch) and `xmark.octagon.fill` (Avoid) `[Unverified: exact symbol names; check SF Symbols app]`.
- Update from the app process. In Drive Mode the app stays alive through background location. Remote APNs Live Activity pushes are **Roadmap**, because the Expo push service's support for `liveactivity` push type is `[Unverified]`.
- **Android equivalent (Stretch):** a sticky ongoing notification updated in place:
  `scheduleNotificationAsync({ identifier: 'drive-status', content: { title, body, sticky: true, autoDismiss: false, color: '#0E1726' }, trigger: { channelId: 'drive-mode' } })` (`sticky` and `autoDismiss` exist `[Verified: types]`). It sits alongside the location foreground-service notification.
- **Home-screen widgets** ("Crossings near Home": iOS via expo-widgets, Android via `react-native-android-widget@0.22.1`): **Roadmap**.

---

## 13. CarPlay / Android Auto → Roadmap

- `react-native-carplay@2.4.1-beta.0` was last published 2024-06 with peer `react ^17||^18`, which conflicts with React 19.2 `[Verified: npm]`. Forks (`@g4rb4g3/react-native-carplay`, `@bradford-tech/expo-carplay@0.3.2`) exist but are early `[Verified (secondary)]`.
- The CarPlay "Driving Task" category (`com.apple.developer.carplay-driving-task`, iOS 16+) needs an Apple-approved entitlement. Review takes days to weeks, and the app must not duplicate navigation `[Verified (secondary)]`.
- Android Auto needs a separate car-app library integration.
- **Tier: Roadmap.** Say "planned: CarPlay/Android Auto alert card".

---

## 14. Voice and Drive Mode

```ts
import * as Speech from 'expo-speech';
import { setAudioModeAsync } from 'expo-audio';
import { useKeepAwake } from 'expo-keep-awake';

let voiceCache: Record<string, string | undefined> = {};
async function pickVoice(lang: 'en-US' | 'es-US') {
  if (voiceCache[lang] !== undefined) return voiceCache[lang];
  const voices = await Speech.getAvailableVoicesAsync();               // {identifier,name,quality,language}
  const prefs = lang === 'es-US' ? ['es-US', 'es-MX', 'es-ES', 'es'] : ['en-US', 'en'];
  for (const p of prefs) {
    const v = voices.filter(v => v.language?.startsWith(p)).sort((a, b) => (b.quality === 'Enhanced' ? 1 : 0) - (a.quality === 'Enhanced' ? 1 : 0))[0];
    if (v) return (voiceCache[lang] = v.identifier);
  }
  return (voiceCache[lang] = undefined);                               // fall back to `language` only
}
export async function speakAlert(text: string, lang: 'en-US' | 'es-US') {
  await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' }); // [Verified: expo-audio 57 AudioMode]
  Speech.stop();
  Speech.speak(text, { language: lang, voice: await pickVoice(lang), rate: 0.95, pitch: 1.0,
                       useApplicationAudioSession: false });   // iOS: system session ducks other audio [Verified: JSDoc]
}
// Drive Mode screen: useKeepAwake('drive-mode');
```

- **Ducking:**
  - iOS: `useApplicationAudioSession:false` hands mixing and ducking to the system `[Verified]`.
  - Android: `expo-speech` has no audio-focus code (none found in package source). `expo-audio`'s `duckOthers` applies to expo-audio playback. **Play a 0.4 s alert chime with expo-audio (`duckOthers`) right before TTS** so music ducks `[Unverified: test on device]`.
- **Background speech:** speaking from a geofence task while another app is in front is unreliable on iOS. The **notification sound and banner is the background alert**. TTS is guaranteed only in the foreground Drive Mode `[Inference/Unverified]`.
- **Spoken templates** (EN/ES; translations by a fluent speaker):
  - EN: "Flooding likely soon at Bull Creek, Loop 360. Within 15 to 30 minutes. Taking the detour adds 4 minutes."
  - ES: "Posible inundación pronto en Bull Creek, Loop 360. Dentro de 15 a 30 minutos. El desvío agrega 4 minutos."
- **Drive Mode UI rules** (NHTSA visual-manual guidelines: glances ≤ 2 s, task ≤ 12 s):
  - One status line in 32–40 pt.
  - At most 2 buttons ≥ 64 pt: **"Detour"** and **"End"**.
  - No lists, no typing, no map panning (camera follows).
  - A haptic `notificationAsync(Warning|Error)` on each state change.
  - Repeat the voice alert only on escalation.

---

## 15. Offline and stale data

**SQLite schema** (`expo-sqlite@57.0.4`, `openDatabaseAsync('fordcast.db')`):

```sql
CREATE TABLE IF NOT EXISTS crossings(id TEXT PRIMARY KEY, name TEXT, name_es TEXT, lon REAL, lat REAL,
  road TEXT, creek TEXT, divided_road INTEGER DEFAULT 0, updated_at INTEGER);
CREATE TABLE IF NOT EXISTS risk(crossing_id TEXT PRIMARY KEY, state TEXT NOT NULL, window_min INTEGER, window_max INTEGER,
  p30 REAL, p60 REAL, p90 REAL, source TEXT, issued_at INTEGER NOT NULL, fetched_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS alerts_log(crossing_id TEXT, state TEXT, alerted_at INTEGER, PRIMARY KEY(crossing_id, alerted_at));
CREATE TABLE IF NOT EXISTS saved_places(id TEXT PRIMARY KEY, label TEXT, lon REAL, lat REAL, kind TEXT, created_at INTEGER);
CREATE TABLE IF NOT EXISTS route_cache(key TEXT PRIMARY KEY, json TEXT, created_at INTEGER);
CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v TEXT);
```
Ship a **seed `crossings.json` and `creeks.geojson` in the app bundle** so the first launch works offline. Small preferences go in `expo-sqlite/kv-store` (no MMKV needed).

**Staleness rules** (the safety principle in code). Use **server `issued_at`** and correct for clock skew with the server `Date` header offset.

| Age of risk | Display |
|---|---|
| ≤ 20 min | Normal state |
| 20–60 min | Same state plus "as of 34 min ago" chip (slate) |
| > 60 min, or the fetch failed and there's no cache | **Unknown — data offline** (dashed gray icon). If the last known state was Watch/Avoid/Closed, show "last known: AVOID · 2 h ago" with the **red icon in a dashed frame**. **Never downgrade to a calm look.** |

- A NetInfo/`expo-network` banner reads: "Offline. Showing risk from 12:41 PM."

**Offline map packs (Stretch, MapLibre):**

```ts
import { OfflineManager } from '@maplibre/maplibre-react-native';
await OfflineManager.createPack({ name: 'travis-z8-14', mapStyle: STYLE_URL,
  bounds: [-98.17, 30.02, -97.37, 30.63], minZoom: 8, maxZoom: 14,
  metadata: { v: 1 } }, (pack, status) => setProgress(status), (pack, err) => log(err));   // [Verified: OfflineManager]
```
- Travis County z8–14 = **1,681 tiles**. z8–15 would be 6,565, and z16 adds 19,110 (computed with the slippy-tile formula). Size estimate is roughly 30–80 MB `[Unverified estimate]`.
- Download **only on Wi-Fi with user consent** ("Download offline map: about 50 MB").
- Saved routes get a z15–16 corridor pack: route bbox + 1 km.
- **Airplane-mode test:** these items must pass before saying "works offline" in the video (Claims Ledger).
  1. Map renders.
  2. Crossings render with "as of" labels.
  3. Geofence alert fires using cached risk.
  4. Check My Drive says "Routing needs internet. Showing crossings on your last route."

---

## 16. Expo Go vs. development build matrix (SDK 57)

| Capability | Package | Expo Go Android | Expo Go iOS | Dev build | Source |
|---|---|---|---|---|---|
| Map (fallback) | react-native-maps 1.27.2 | ✅ | ✅ (Apple Maps) | ✅ (Google key needed for the Google provider) | `[Verified: map-view.mdx]` |
| Map (primary) | MapLibre RN 11.5.0 | ❌ | ❌ | ✅ | `[Verified: MLRN expo.md]` |
| Map (runner-up) | @rnmapbox/maps | ❌ | ❌ | ✅ | `[Verified]` |
| expo-maps | expo-maps 57 | ❌ | ❌ | ✅ (alpha) | `[Verified]` |
| Foreground location | expo-location | ✅ | ✅ | ✅ | `[Verified]` |
| Background location | expo-location + task-manager | ❌ (no fg/bg services) | ❌ | ✅ | `[Verified: location.mdx]` |
| Geofencing | expo-location | ❌ | ❌ | ✅ (needs Always) | `[Verified + source]` |
| Motion activity | expo-location 57 | ? | ? (needs NSMotionUsageDescription) | ✅ | `[Unverified for Expo Go]` |
| Local notifications | expo-notifications | ✅ | ✅ | ✅ | `[Verified]` |
| Push notifications | expo-notifications + EAS | ❌ (since SDK 53) | ❌ | ✅ | `[Verified: push setup docs]` |
| Time-sensitive (iOS) | entitlement | n/a | ❌ | ✅ paid Apple account | `[Verified (secondary)]` |
| Background task | expo-background-task | ❌ | ❌ | ✅ (not on iOS simulator) | `[Verified: package source]` |
| TTS | expo-speech | ✅ | ✅ | ✅ | |
| Audio ducking | expo-audio | ✅ | ✅ | ✅ | |
| Keep awake / haptics | expo-keep-awake / expo-haptics | ✅ | ✅ | ✅ | |
| SQLite cache | expo-sqlite | ✅ | ✅ | ✅ | |
| MMKV | react-native-mmkv 4 (Nitro) | ❌ | ❌ | ✅ | `[Verified: peer dep]` |
| Live Activities / widgets | expo-widgets | ❌ | ❌ | ✅ iOS only | `[Verified]` |
| CarPlay | react-native-carplay | ❌ | ❌ | ⚠️ entitlement | `[Verified (secondary)]` |
| Turf, deep links, fetch, Supabase JS | pure JS | ✅ | ✅ | ✅ | |
| Offline map packs | MapLibre OfflineManager | ❌ | ❌ | ✅ | `[Verified]` |

---

## 17. Tiering and build order (fits the Oct 14 → Oct 26 plan)

**MVP (must be real by day 10):**
- MapLibre map with the FordCast Night style.
- Crossings source with state icons, max-rank clustering and pulse rings.
- Creek base layer, plus the **replay wave pulse** (signature).
- Crossing Card on tap.
- List view for accessibility.
- Foreground location and puck.
- Local notifications and Android channels.
- Drive Mode screen: TTS EN/ES, keep-awake, haptics, big targets.
- SQLite cache with the staleness rules.
- Android push for escalations.

**Stretch (in this order):**
1. Check My Drive: `/v1/route` with ORS avoid polygons, Turf on-route check and detour minutes.
2. Geocoding search with saved places.
3. Hand-off links with via points.
4. Background geofence alerts with rotation.
5. Drive Mode background continuation (foreground service).
6. Motion and speed auto-detect.
7. Offline map pack.
8. iOS push and time-sensitive.
9. Android ongoing notification.
10. Live Activity (iOS, paid).

**Roadmap:** Critical Alerts entitlement · CarPlay/Android Auto · home-screen widgets · PMTiles self-hosting · remote Live Activity pushes · SMS.

**Cut order if behind:** offline packs → Live Activity → motion auto-detect → geofence rotation (keep foreground Drive Mode alerts) → hand-off links → geocoding (fallback: long-press a destination on the map). **Never cut:** the map, state icons, the Crossing Card, the replay wave and stale labeling.

---

## 18. Gotchas the master prompt must state explicitly

1. **MapLibre RN v11 ≠ v10.** Use `Map`/`GeoJSONSource`/`Layer type=` with kebab-case `paint`/`layout`. Read the shipped `.d.ts` files.
2. **Turf 7.4:** use `totalDistance`/`pointDistance`, not `location`/`dist`.
3. **Map label fonts** must be `Noto Sans Regular|Bold|Italic` (OFM glyph server). Inter in a map layer renders nothing.
4. **Never import a native-only module at the top level of a file Expo Go loads** (MapLibre, expo-widgets). Use `isRunningInExpoGo()` with a lazy `require`.
5. **Define TaskManager tasks at module top level**, imported first in the entry file. Otherwise iOS geofence relaunch events are lost.
6. **iOS geofence initial-state burst** happens at startup. Ignore Enter events within 10 s of registration.
7. **iOS `pausesUpdatesAutomatically` native default is `true`.** Pass `false` in Drive Mode.
8. **Android background location from a foreground service must start while the app is foregrounded.**
9. **Push `ttl: 1800`** so stale flood warnings are not delivered late.
10. **`interruptionLevel` spelling:** local `'timeSensitive'`, push `'time-sensitive'`.
11. **Create Android channels before requesting notification permission** (Android 13).
12. **ORS keys stay on the server.** Handle 403 (daily) and 429 (minute) by falling back to Stadia.
13. **Clusters must reflect the max-risk member** (`clusterProperties.maxRank`).
14. **Show attribution** for OSM, OpenMapTiles/OpenFreeMap and ORS in the app (attribution button and About screen) **and on the video end card**.
15. **Use `npx expo install`** for every Expo or RN native package. npm `latest` (reanimated 4.7.1, react-native-maps 1.29.11) is newer than what SDK 57 supports.
16. **Don't claim** "works offline", "reroutes you" or "alerts in background" until the corresponding test in §15/§10 passes on a real phone (Claims Ledger).

---

## 19. Sources

- npm registry (`npm view` / `npm pack`, 2026-10-14): expo 57.0.28 and `bundledNativeModules.json`; @maplibre/maplibre-react-native 11.5.0 (src/index.ts, Layer.tsx, Map.tsx, GeoJSONSource.tsx, OfflineManager.ts, plugin, gradle.properties, podspec); @rnmapbox/maps 10.3.8 (plugin/src/withMapbox.ts, StyleImport.tsx, Rain.tsx, offlineManager.ts, package.json `mapbox`); react-native-maps 1.27.2 (MapView.tsx, MapPolyline.tsx); expo-location 57.0.21 (Location.ts, Location.types.ts, ios/LocationModule.swift, EXLocationTaskConsumer.m, android LocationModule.kt); expo-notifications 57.0.22 (Notifications.types.ts, NotificationChannelManager.types.ts); expo-speech 57.0.3; expo-audio 57.0.5; expo-sqlite 57.0.4; expo-background-task 57.0.21; expo-constants 57.0.21; @turf/* 7.4.0; expo-widgets 57.0.24; react-native-carplay; react-native-mmkv
- PyPI JSON: exponent-server-sdk 2.2.0, shapely 2.2.0, pyproj 3.8.0, polyline 2.0.4, openrouteservice 2.3.3
- Expo docs on GitHub (expo/expo main): `docs/pages/versions/v57.0.0/sdk/{map-view,location,notifications,widgets}.mdx`, `docs/pages/push-notifications/{sending-notifications,push-notifications-setup}.mdx`
- [Expo SDK 57 changelog](https://expo.dev/changelog/sdk-57) · [Expo pricing](https://expo.dev/pricing) · [Expo internal distribution](https://docs.expo.dev/build/internal-distribution/)
- [rnmapbox install.md](https://raw.githubusercontent.com/rnmapbox/maps/HEAD/plugin/install.md) · [rnmapbox StyleImport.md](https://raw.githubusercontent.com/rnmapbox/maps/main/docs/StyleImport.md)
- [MapLibre RN Expo setup](https://raw.githubusercontent.com/maplibre/maplibre-react-native/main/docs/content/setup/expo.md)
- [OpenFreeMap README](https://github.com/hyperknot/openfreemap) · [openfreemap-styles](https://github.com/hyperknot/openfreemap-styles)
- [ORS routing options](https://github.com/GIScience/openrouteservice/blob/main/docs/api-reference/endpoints/directions/routing-options.md) · [ors-config.yml](https://github.com/GIScience/openrouteservice/blob/main/ors-config.yml) · [ORS routing config docs](https://github.com/GIScience/openrouteservice/blob/main/docs/run-instance/configuration/endpoints/routing.md) · [ORS plans](https://openrouteservice.org/plans/) · [ORS FAQ](https://giscience.github.io/openrouteservice/frequently-asked-questions) · [ORS forum: avoid_polygons POST/auth](https://ask.openrouteservice.org/t/ors-directions-with-avoid-polygons-parameter/3364)
- [Valhalla route API reference](https://github.com/valhalla/valhalla/blob/master/docs/docs/api/route/api-reference.md) · [valhalla_build_config](https://github.com/valhalla/valhalla/blob/master/scripts/valhalla_build_config) · [Stadia standard routing](https://docs.stadiamaps.com/routing/standard-routing)
- [mapbox-java Exclude.java](https://github.com/mapbox/mapbox-java/blob/main/services-directions-models/src/main/java/com/mapbox/api/directions/v5/models/Exclude.java)
- [GraphHopper custom models](https://github.com/graphhopper/graphhopper/blob/master/docs/core/custom-models.md) · [GraphHopper pricing](https://www.graphhopper.com/pricing/) · [HERE avoid areas](https://docs.here.com/routing/docs/avoid-area)
- [Apple unified Maps URLs](https://developer.apple.com/documentation/mapkit/unified-map-urls) · [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started) · [googleway waypoint limits](https://rdrr.io/cran/googleway/man/google_map_directions.html) · [Waze deep links](https://developers.google.com/waze/deeplinks)
- [Photon README](https://github.com/komoot/photon) · [Photon API v1](https://github.com/komoot/photon/blob/master/docs/api-v1.md) · [Pelias autocomplete](https://github.com/pelias/documentation/blob/master/autocomplete.md) · [ORS geocoder](https://github.com/GIScience/openrouteservice/blob/main/docs/api-reference/endpoints/geocoder/index.md)
- [Mapbox signup (demo access)](https://docs.mapbox.com/accounts/guides/signup/) · [Mapbox pricing analysis (woosmap)](https://www.woosmap.com/blog/mapbox-pricing) · [Mapbox Search Box pricing diff](https://pricingsaas.com/companies/mapbox/diffs/2026W40) · [MapTiler pricing](https://www.maptiler.com/cloud/pricing/) · [CARTO basemap styles](https://github.com/CartoDB/basemap-styles)
- [Apple forum: time-sensitive entitlement](https://developer.apple.com/forums/thread/683630) · [OneSignal interruption levels](https://documentation.onesignal.com/docs/ios-focus-modes-and-interruption-levels) · [Critical alerts entitlement (Xamarin doc)](https://learn.microsoft.com/ar-sa/previous-versions/xamarin/ios/platform/introduction-to-ios12/notifications/critical-alerts) · [Apple forum: critical alerts timing](https://developer.apple.com/forums/thread/794822)
- [CarPlay App Programming Guide](https://Developer.apple.com/carplay/documentation/CarPlay-App-Programming-Guide.pdf) · [@bradford-tech/expo-carplay README](https://cdn.jsdelivr.net/npm/@bradford-tech/expo-carplay@0.3.2/README.md)
- [MapLibre newsletters (PMTiles)](https://maplibre.org/news/2025-02-03-maplibre-newsletter-january-2025/)
- Concept doc: `/home/user/Fordcast-CAC/FordCast_CAC_Submission.md` (v4): palette, safety principle, NHTSA reference, tiers
