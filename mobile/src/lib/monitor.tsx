import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { crossings, floodHistory, officialCrossings, replays, stateAt } from './data';
import { alertRank, assessDanger, dangerState, REASON_KEY } from './danger';
import { DRILL_MIN_PER_SEC, drillBounds } from './drill';
import { AUSTIN_CENTER, distanceKm, formatMiles, insideCoverage, miToKm, type LatLon } from './geo';
import { buildGuardianHazardsFromStatuses } from './guardian';
import {
  alertAt,
  fetchOfficialClosures,
  fetchRain,
  fetchWeatherAlerts,
  isHeavyRain,
  mmToIn,
  rainAt,
  type OfficialCrossing,
  type RainCell,
  type WeatherAlert,
} from './hazards';
import { evaluateCrossing, fetchLiveSeries, linksFor, LIVE_REFRESH_MS, type GaugeSeries } from './live';
import {
  MonitorContext,
  type AlertEntry,
  type Coverage,
  type CrossingStatus,
  type DrillState,
  type Feeds,
  type HistoryInfo,
  type HomeTab,
  type LocationSource,
  type MonitorMode,
  type MonitorSettings,
  type MonitorValue,
} from './monitor-context';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendLocalNotification,
  type PermissionState,
} from './notify';
import { usePreferences } from './preferences';
import { distanceToRouteM, hazardsOnRoute, planSafeRoute, type Place, type RouteHazard, type RoutePlan } from './routing';
import { storage } from './storage';
import { prepareAudio, setVoiceMuted, speak, stopSpeaking } from './voice';
import type { CrossingStateKey } from '@/theme/tokens';

const SETTINGS_KEY = 'fordcast.monitor.v1';
export const HAZARD_CACHE_KEY = 'fordcast.hazards.v1';
const DEFAULT_SETTINGS: MonitorSettings = {
  alertRadiusMi: 3,
  voiceAlerts: true,
  pushAlerts: true,
  useDemoLocation: false,
};
const DEFAULT_STORM = 'memorial-day-2015';
const OFFICIAL_MATCH_KM = 0.15;
const REGION_KM = 70;

function initialDrill(stormId: string): DrillState {
  const replay = replays[stormId] ?? replays[DEFAULT_STORM]!;
  const { startMs, endMs } = drillBounds(replay);
  return { stormId, simT: startMs, startMs, endMs, playing: false, speed: 2, minPerSecOverride: null };
}

function toPermission(p: Location.LocationPermissionResponse): PermissionState {
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

function historyFor(id: string): HistoryInfo | null {
  const h = floodHistory.crossings[id];
  if (!h) return null;
  return {
    tier: h.risk_tier,
    reports: h.reports,
    deaths: h.deaths,
    vehicleDeaths: h.vehicle_deaths,
    vehicleRelated: h.vehicle_related,
    lastEvent: h.last_event,
    eventIds: h.event_ids,
    events: h.events,
  };
}

export { REASON_KEY } from './danger';

export function MonitorProvider({ children }: PropsWithChildren) {
  const { t, language, saved, simDriveActive } = usePreferences();

  // ---------- settings ----------
  const [settings, setSettings] = useState<MonitorSettings>(DEFAULT_SETTINGS);
  const settingsLoaded = useRef(false);
  useEffect(() => {
    storage
      .get(SETTINGS_KEY)
      .then((raw) => {
        if (!raw) return;
        const p = JSON.parse(raw) as Partial<MonitorSettings>;
        setSettings((s) => {
          const nextVoiceAlerts =
            typeof p.voiceAlerts === 'boolean' ? p.voiceAlerts : s.voiceAlerts;
          setVoiceMuted(!nextVoiceAlerts);
          return {
            alertRadiusMi: typeof p.alertRadiusMi === 'number' ? p.alertRadiusMi : s.alertRadiusMi,
            voiceAlerts: nextVoiceAlerts,
            pushAlerts: typeof p.pushAlerts === 'boolean' ? p.pushAlerts : s.pushAlerts,
            useDemoLocation: typeof p.useDemoLocation === 'boolean' ? p.useDemoLocation : s.useDemoLocation,
          };
        });
      })
      .catch(() => {})
      .finally(() => {
        settingsLoaded.current = true;
      });
  }, []);
  useEffect(() => {
    setVoiceMuted(!settings.voiceAlerts);
    if (settingsLoaded.current) storage.set(SETTINGS_KEY, JSON.stringify(settings)).catch(() => {});
  }, [settings]);
  const updateSettings = useCallback(
    (patch: Partial<MonitorSettings>) => {
      if (typeof patch.voiceAlerts === 'boolean') {
        setVoiceMuted(!patch.voiceAlerts);
      }
      setSettings((s) => ({ ...s, ...patch }));
    },
    [],
  );

  useEffect(() => {
    void prepareAudio();
  }, []);

  // ---------- location ----------
  const [gps, setGps] = useState<LatLon | null>(null);
  const [speedMps, setSpeedMps] = useState<number | null>(null);
  const [locationPermission, setLocationPermission] = useState<PermissionState>('undetermined');
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const startWatching = useCallback(async () => {
    if (watchRef.current) return;
    try {
      const first = await Location.getLastKnownPositionAsync().catch(() => null);
      if (first) setGps({ lat: first.coords.latitude, lon: first.coords.longitude });
      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 30, timeInterval: 5_000 },
        (pos) => {
          setGps({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          setSpeedMps(pos.coords.speed != null && pos.coords.speed >= 0 ? pos.coords.speed : null);
        },
      );
    } catch {
      // Location hardware unavailable; the demo location keeps the app useful.
    }
  }, []);

  useEffect(() => {
    let alive = true;
    Location.getForegroundPermissionsAsync()
      .then((p) => {
        if (!alive) return;
        const state = toPermission(p);
        setLocationPermission(state);
        if (state === 'granted') void startWatching();
      })
      .catch(() => alive && setLocationPermission('unsupported'));
    return () => {
      alive = false;
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, [startWatching]);

  const [customOrigin, setCustomOrigin] = useState<Place | null>(null);

  const requestLocation = useCallback(async () => {
    try {
      const p = await Location.requestForegroundPermissionsAsync();
      const state = toPermission(p);
      setLocationPermission(state);
      if (state === 'granted') {
        setCustomOrigin(null);
        updateSettings({ useDemoLocation: false });
        await startWatching();
      }
    } catch {
      setLocationPermission('unsupported');
    }
  }, [startWatching, updateSettings]);

  const { location, locationSource } = useMemo((): { location: LatLon; locationSource: LocationSource } => {
    if (customOrigin) return { location: { lat: customOrigin.lat, lon: customOrigin.lon }, locationSource: 'custom' };
    if (settings.useDemoLocation) return { location: AUSTIN_CENTER, locationSource: 'demo' };
    if (!gps) {
      return {
        location: AUSTIN_CENTER,
        locationSource: 'off',
      };
    }
    if (!insideCoverage(gps)) {
      return {
        location: AUSTIN_CENTER,
        locationSource: 'outside',
      };
    }
    return { location: gps, locationSource: 'gps' };
  }, [gps, settings.useDemoLocation, customOrigin]);

  // ---------- notifications ----------
  const [notificationPermission, setNotificationPermission] = useState<PermissionState>('undetermined');
  useEffect(() => {
    void getNotificationPermission().then(setNotificationPermission);
  }, []);
  const requestNotifications = useCallback(async () => {
    const p = await requestNotificationPermission();
    setNotificationPermission(p);
    return p;
  }, []);

  const [mode, setModeState] = useState<MonitorMode>('live');
  const [homeTab, setHomeTab] = useState<HomeTab>('explore');
  const [mapFocusId, setMapFocusId] = useState<string | null>(null);
  const [pendingTripStormId, setPendingTripStormId] = useState<string | null>(null);

  const focusOnMap = useCallback((crossingId: string | null) => {
    setMapFocusId(crossingId);
    if (crossingId) setHomeTab('explore');
  }, []);

  // ---------- live feeds (USGS sensors, ATXfloods closures, NWS warnings, rain) ----------
  const [liveSeries, setLiveSeries] = useState<GaugeSeries | null>(null);
  const [liveFetchedAt, setLiveFetchedAt] = useState<number | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState(false);
  const [closures, setClosures] = useState<OfficialCrossing[]>([]);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
  const [rainCells, setRainCells] = useState<RainCell[]>([]);
  const [feeds, setFeeds] = useState<Feeds>({
    usgs: { ok: null, at: null },
    atx: { ok: null, at: null },
    nws: { ok: null, at: null },
    rain: { ok: null, at: null },
  });
  const [clock, setClock] = useState(() => Date.now());
  const refreshGenRef = useRef(0);
  const refreshAbortRef = useRef<AbortController | null>(null);

  const latestObsAt = useMemo<number | null>(() => {
    if (!liveSeries) return null;
    let newest: number | null = null;
    for (const rows of Object.values(liveSeries)) {
      const last = rows[rows.length - 1];
      if (last && (newest == null || last.t > newest)) newest = last.t;
    }
    return newest;
  }, [liveSeries]);

  const refreshLive = useCallback(() => {
    const myGen = ++refreshGenRef.current;
    refreshAbortRef.current?.abort();
    const ctrl = new AbortController();
    refreshAbortRef.current = ctrl;
    const timeoutId = setTimeout(() => ctrl.abort(), 12_000);

    setLiveLoading(true);
    const points = crossings.map((f) => ({ lat: f.geometry.coordinates[1]!, lon: f.geometry.coordinates[0]! }));
    const mark = (k: keyof Feeds, ok: boolean) => {
      if (myGen !== refreshGenRef.current) return;
      setFeeds((f) => ({ ...f, [k]: { ok, at: ok ? Date.now() : f[k].at } }));
    };
    const usgs = fetchLiveSeries(Date.now(), ctrl.signal)
      .then((s) => {
        if (myGen !== refreshGenRef.current) return;
        const count = Object.values(s).reduce((sum, rows) => sum + rows.length, 0);
        if (count === 0) {
          setLiveError(true);
          mark('usgs', false);
          return;
        }
        setLiveSeries(s);
        setLiveFetchedAt(Date.now());
        setLiveError(false);
        mark('usgs', true);
      })
      .catch(() => {
        if (myGen !== refreshGenRef.current) return;
        setLiveError(true);
        mark('usgs', false);
      });
    const atx = fetchOfficialClosures(ctrl.signal)
      .then((c) => {
        if (myGen !== refreshGenRef.current) return;
        setClosures(c);
        mark('atx', true);
      })
      .catch(() => mark('atx', false));
    const nws = fetchWeatherAlerts(ctrl.signal)
      .then((a) => {
        if (myGen !== refreshGenRef.current) return;
        setWeatherAlerts(a);
        mark('nws', true);
      })
      .catch(() => mark('nws', false));
    const rain = fetchRain(points, ctrl.signal)
      .then((r) => {
        if (myGen !== refreshGenRef.current) return;
        setRainCells(r);
        mark('rain', true);
      })
      .catch(() => mark('rain', false));
    void Promise.allSettled([usgs, atx, nws, rain]).then(() => {
      clearTimeout(timeoutId);
      if (myGen !== refreshGenRef.current) return;
      setLiveLoading(false);
      setClock(Date.now());
    });
  }, []);

  useEffect(() => {
    if (mode !== 'live') return;
    const first = setTimeout(refreshLive, 0);
    const id = setInterval(refreshLive, LIVE_REFRESH_MS);
    const tick = setInterval(() => setClock(Date.now()), 15_000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refreshLive();
    });
    return () => {
      clearTimeout(first);
      clearInterval(id);
      clearInterval(tick);
      sub.remove();
    };
  }, [mode, refreshLive]);

  // ---------- storm drill ----------
  const [drill, setDrill] = useState<DrillState>(() => initialDrill(DEFAULT_STORM));
  const drillEpoch = useRef(0);
  const [tripActive, setTripActive] = useState(false);

  const requestTripDemo = useCallback((stormId: string) => {
    drillEpoch.current += 1;
    stopSpeaking();
    setModeState('drill');
    setHomeTab((cur) => (cur === 'route' ? 'explore' : cur));
    setPendingTripStormId(stormId);
  }, []);
  const clearPendingTrip = useCallback(() => setPendingTripStormId(null), []);

  useEffect(() => {
    if (mode !== 'drill' || !drill.playing) return;
    const id = setInterval(() => {
      setDrill((d) => {
        const perSec = d.minPerSecOverride ?? d.speed * DRILL_MIN_PER_SEC;
        const next = d.simT + perSec * 60_000;
        return next >= d.endMs ? { ...d, simT: d.endMs, playing: false } : { ...d, simT: next };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [mode, drill.playing]);

  const startDrill = useCallback((stormId?: string, opts?: { startMs?: number; minPerSec?: number }) => {
    drillEpoch.current += 1;
    stopSpeaking();
    setModeState('drill');
    setHomeTab((cur) => (cur === 'route' ? 'explore' : cur));
    setDrill((d) => {
      const base = initialDrill(stormId ?? d.stormId);
      return {
        ...base,
        speed: d.speed,
        playing: true,
        simT: opts?.startMs != null ? Math.max(base.startMs, Math.min(base.endMs, opts.startMs)) : base.startMs,
        startMs: opts?.startMs != null ? Math.min(base.startMs, opts.startMs) : base.startMs,
        minPerSecOverride: opts?.minPerSec ?? null,
      };
    });
  }, []);
  const setDrillPlaying = useCallback((playing: boolean) => {
    setDrill((d) => {
      if (playing && d.simT >= d.endMs) {
        drillEpoch.current += 1;
        return { ...d, simT: d.startMs, playing: true, minPerSecOverride: null };
      }
      return { ...d, playing };
    });
  }, []);
  const setDrillSpeed = useCallback(
    (speed: 1 | 2 | 4) => setDrill((d) => ({ ...d, speed, minPerSecOverride: null })),
    [],
  );
  const seekDrill = useCallback((simT: number) => {
    drillEpoch.current += 1;
    setDrill((d) => ({ ...d, simT: Math.min(d.endMs, Math.max(d.startMs, simT)) }));
  }, []);
  const setMode = useCallback((m: MonitorMode) => {
    drillEpoch.current += 1;
    stopSpeaking();
    setModeState(m);
    if (m === 'live') {
      setDrill((d) => ({ ...d, playing: false, minPerSecOverride: null }));
    } else {
      setHomeTab((cur) => (cur === 'route' ? 'explore' : cur));
    }
  }, []);

  // ---------- crossing statuses ----------
  /** All regional ATXfloods crossings outside FordCast's 141 (1,911 bundled + any live closures). */
  const officialExtras = useMemo(() => {
    const ours = crossings.map((f) => ({ lat: f.geometry.coordinates[1]!, lon: f.geometry.coordinates[0]! }));
    const isOurs = (c: { lat: number; lon: number }) => ours.some((o) => distanceKm(o, c) < OFFICIAL_MATCH_KM);
    const out = new Map<string, OfficialCrossing>();
    for (const c of officialCrossings) {
      out.set(c.id, {
        id: c.id,
        name: c.name,
        jurisdiction: c.j,
        lat: c.lat,
        lon: c.lon,
        closed: false,
        comment: '',
        updatedAt: null,
      });
    }
    for (const c of closures) {
      if (!isOurs(c) && distanceKm(AUSTIN_CENTER, c) <= REGION_KM) {
        out.set(c.id, c);
      }
    }
    return [...out.values()];
  }, [closures]);

  const statuses = useMemo<CrossingStatus[]>(() => {
    const replay = replays[drill.stormId] ?? replays[DEFAULT_STORM]!;
    const drillLinked = new Set(replay.links.map((l) => l.crossing_id));
    const live = mode === 'live';
    const now = clock;
    const hasActiveAlerts = live && weatherAlerts.length > 0;
    const anyHeavyRain = live && rainCells.some(isHeavyRain);

    const decorate = (
      base: Omit<CrossingStatus, 'displayState' | 'danger' | 'reasons' | 'official' | 'alert' | 'rain' | 'distanceKm'>,
      officialRow: OfficialCrossing | null,
      alwaysCheckRain: boolean,
    ): CrossingStatus => {
      const p = { lat: base.lat, lon: base.lon };
      const distKm = distanceKm(location, p);
      // Fast path for unmonitored official crossings when no closures, alerts, or heavy rain exist:
      if (!base.monitored && !officialRow?.closed && !hasActiveAlerts && !anyHeavyRain && !alwaysCheckRain) {
        return {
          ...base,
          distanceKm: distKm,
          official: null,
          alert: null,
          rain: null,
          danger: null,
          reasons: [],
          displayState: null,
        };
      }
      const alert = hasActiveAlerts ? alertAt(p, weatherAlerts, now) : null;
      const cell = live && (alwaysCheckRain || anyHeavyRain) ? rainAt(p, rainCells) : null;
      const heavy = isHeavyRain(cell);
      const { danger, reasons } = assessDanger({
        monitored: base.monitored,
        state: base.state,
        officialClosed: !!officialRow?.closed,
        alertEvent: alert && !alert.event.includes('Watch') ? alert.event : null,
        heavyRain: heavy,
        historyTier: base.history?.tier ?? null,
      });
      return {
        ...base,
        distanceKm: distKm,
        official: officialRow && (officialRow.closed || officialRow.comment)
          ? { closed: officialRow.closed, comment: officialRow.comment, updatedAt: officialRow.updatedAt }
          : null,
        alert: alert
          ? { event: alert.event, headline: alert.headline, expires: alert.expires, flashFlood: alert.flashFlood }
          : null,
        rain: cell ? { past3hIn: mmToIn(cell.past3hMm), next3hIn: mmToIn(cell.next3hMm), heavy } : null,
        danger,
        reasons,
        displayState: dangerState(danger, reasons) ?? (base.monitored ? base.state : null),
      };
    };

    const ours = crossings.map((f) => {
      const p = f.properties;
      const [lon, lat] = f.geometry.coordinates as [number, number];
      const hasSensorTier = p.tier === 'A' || p.tier === 'B';
      // Only crossings with a calibrated gauge link get a sensor status; no made-up thresholds.
      const calibrated = hasSensorTier && (live ? linksFor(p.id).length > 0 : drillLinked.has(p.id));
      const coverage: Coverage = calibrated ? 'calibrated' : hasSensorTier ? 'uncalibrated' : 'none';
      let state: CrossingStateKey = 'unknown';
      let window: [number, number] | null = null;
      let liveStatus: CrossingStatus['live'] = null;
      if (calibrated) {
        if (!live) {
          const slice = stateAt(replay, p.id, drill.simT);
          state = slice.state;
          window = slice.window;
        } else if (liveSeries) {
          liveStatus = evaluateCrossing(p.id, liveSeries, now);
          state = liveStatus.state;
          window = liveStatus.window;
        }
      }
      const officialRow = live ? (closures.find((c) => distanceKm(c, { lat, lon }) < OFFICIAL_MATCH_KM) ?? null) : null;
      return decorate(
        {
          id: p.id,
          name: language === 'es' ? p.name_es || p.name : p.name,
          creek: p.creek ?? '',
          lat,
          lon,
          monitored: calibrated,
          coverage,
          state,
          window,
          live: liveStatus,
          history: historyFor(p.id),
        },
        officialRow,
        true,
      );
    });

    const extras = officialExtras.map((c) =>
      decorate(
        {
          id: c.id,
          name: c.name,
          creek: c.jurisdiction,
          lat: c.lat,
          lon: c.lon,
          monitored: false,
          coverage: 'official',
          state: 'unknown',
          window: null,
          live: null,
          history: null,
        },
        live ? c : null,
        false,
      ),
    );

    return [...ours, ...extras].sort((a, b) => a.distanceKm - b.distanceKm);
  }, [mode, drill.stormId, drill.simT, liveSeries, clock, location, language, closures, weatherAlerts, rainCells, officialExtras]);

  const statusById = useMemo(
    () => Object.fromEntries(statuses.map((s) => [s.id, s])) as Record<string, CrossingStatus>,
    [statuses],
  );

  const reasonText = useCallback((s: CrossingStatus) => (s.reasons[0] ? t(REASON_KEY[s.reasons[0]]) : ''), [t]);

  const [testHazard, setTestHazard] = useState<RouteHazard | null>(null);
  const hazards = useMemo<RouteHazard[]>(
    () => [
      ...statuses
        .filter((s) => s.danger)
        .map((s) => ({ id: s.id, name: s.name, lat: s.lat, lon: s.lon, level: s.danger!, reason: reasonText(s) })),
      ...(testHazard && mode === 'live' ? [testHazard] : []),
    ],
    [statuses, reasonText, testHazard, mode],
  );

  // Cache real hazards for the background guardian (only when at least one live source succeeded).
  useEffect(() => {
    if (mode !== 'live') return;
    if (!feeds.usgs.ok && !feeds.atx.ok && !feeds.nws.ok) return;
    const now = Date.now();
    const taggedHazards = buildGuardianHazardsFromStatuses(statuses, reasonText, now);
    storage
      .set(
        HAZARD_CACHE_KEY,
        JSON.stringify({
          at: now,
          hazards: taggedHazards,
          sources: {
            usgs: { ok: !!feeds.usgs.ok, at: feeds.usgs.at, obsAt: latestObsAt },
            atx: { ok: !!feeds.atx.ok, at: feeds.atx.at },
            nws: { ok: !!feeds.nws.ok, at: feeds.nws.at },
          },
        }),
      )
      .catch(() => {});
  }, [statuses, reasonText, mode, feeds.usgs.ok, feeds.usgs.at, feeds.atx.ok, feeds.atx.at, feeds.nws.ok, feeds.nws.at, latestObsAt]);

  // ---------- routing ----------
  const [routePlan, setRoutePlan] = useState<RoutePlan | null>(null);
  const [routeBusy, setRouteBusy] = useState(false);
  const [routeError, setRouteError] = useState(false);
  const routeGenRef = useRef(0);
  const routeAbortRef = useRef<AbortController | null>(null);
  const hazardsRef = useRef(hazards);
  useEffect(() => {
    hazardsRef.current = hazards;
  }, [hazards]);

  const computeRoute = useCallback(
    async (origin: LatLon, dest: Place, routeHazards?: RouteHazard[]) => {
      const myGen = ++routeGenRef.current;
      routeAbortRef.current?.abort();
      const ctrl = new AbortController();
      routeAbortRef.current = ctrl;
      const timeoutId = setTimeout(() => ctrl.abort(), 12_000);

      setRouteBusy(true);
      setRouteError(false);
      try {
        const plan = await planSafeRoute(
          origin,
          dest,
          dest.name,
          routeHazards ?? hazardsRef.current,
          ctrl.signal,
        );
        if (myGen !== routeGenRef.current) return null;
        setRoutePlan(plan);
        if (!plan) setRouteError(true);
        return plan;
      } catch {
        if (myGen !== routeGenRef.current) return null;
        setRoutePlan(null);
        setRouteError(true);
        return null;
      } finally {
        clearTimeout(timeoutId);
        if (myGen === routeGenRef.current) {
          setRouteBusy(false);
        }
      }
    },
    [],
  );
  const planRoute = useCallback(
    async (dest: Place, originOverride?: LatLon) => {
      const realHazards = hazardsRef.current.filter((h) => !h.id.startsWith('test-'));
      hazardsRef.current = realHazards;
      setTestHazard(null);
      await computeRoute(originOverride ?? location, dest, realHazards);
    },
    [computeRoute, location],
  );
  const endRouteTest = useCallback(async () => {
    const realHazards = hazardsRef.current.filter((h) => !h.id.startsWith('test-'));
    hazardsRef.current = realHazards;
    setTestHazard(null);
    if (!routePlan) return;
    await computeRoute(
      routePlan.origin,
      {
        ...routePlan.destination,
        name: routePlan.destinationName,
        detail: '',
      },
      realHazards,
    );
  }, [computeRoute, routePlan]);
  const clearRoute = useCallback(() => {
    routeGenRef.current += 1;
    routeAbortRef.current?.abort();
    setRouteBusy(false);
    setRoutePlan(null);
    setRouteError(false);
    setTestHazard(null);
  }, []);

  // Replan active route if user changes their custom starting point.
  const prevOriginKey = useRef(`${location.lat.toFixed(4)},${location.lon.toFixed(4)}`);
  useEffect(() => {
    const nextKey = `${location.lat.toFixed(4)},${location.lon.toFixed(4)}`;
    if (nextKey === prevOriginKey.current) return;
    if (routeBusy) return;
    prevOriginKey.current = nextKey;
    if (!routePlan) return;
    if (Math.abs(routePlan.origin.lat - location.lat) < 0.0001 && Math.abs(routePlan.origin.lon - location.lon) < 0.0001) return;
    const dest = {
      name: routePlan.destinationName,
      detail: '',
      lat: routePlan.destination.lat,
      lon: routePlan.destination.lon,
    };
    const timer = setTimeout(() => {
      void computeRoute(location, dest);
    }, 0);
    return () => clearTimeout(timer);
  }, [location, routePlan, routeBusy, computeRoute]);
  const simulateHazardOnRoute = useCallback(() => {
    if (!routePlan) return;
    const coords = routePlan.route.coords;
    if (coords.length < 2) return;
    const ahead = distanceToRouteM(location, coords).index;
    const at = coords[Math.min(coords.length - 2, Math.round(ahead + (coords.length - ahead) * 0.5))] ?? coords[0]!;
    setTestHazard({ id: `test-${Date.now()}`, name: t('route.test_name'), lat: at.lat, lon: at.lon, level: 'block', reason: t('route.test_reason') });
  }, [routePlan, location, t]);

  const inAlertScope = useCallback(
    (s: CrossingStatus) => {
      if (!s.danger) return false;
      if (mode === 'drill' || saved.includes(s.id) || s.distanceKm <= miToKm(settings.alertRadiusMi)) return true;
      return !!routePlan && distanceToRouteM(s, routePlan.route.coords).d <= 60;
    },
    [mode, settings.alertRadiusMi, saved, routePlan],
  );

  // ---------- alerts ----------
  const [alertLog, setAlertLog] = useState<AlertEntry[]>([]);
  const [banner, setBanner] = useState<AlertEntry | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBanner = useCallback((entry: AlertEntry) => {
    setBanner(entry);
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 9000);
  }, []);

  const describe = useCallback(
    (s: CrossingStatus): { title: string; body: string } => {
      const dist = formatMiles(s.distanceKm);
      const vars = { name: s.name, creek: s.creek || t('common.crossing'), dist };
      const r = s.reasons[0];
      if (r === 'official_closed') return { title: t('alert.official_title', vars), body: t('alert.official_body', vars) };
      if (r === 'ffe' || r === 'ffw')
        return { title: t('alert.ffw_title', { ...vars, event: s.alert?.event ?? '' }), body: t('alert.ffw_body', vars) };
      if (r === 'rain_history')
        return { title: t('alert.rain_title', vars), body: t('alert.rain_body', { ...vars, reports: s.history?.reports ?? 0 }) };
      if (r === 'flood_warning' || r === 'sensor_offline_rain' || r === 'heavy_rain')
        return { title: t('alert.generic_title', { ...vars, reason: reasonText(s) }), body: t('alert.generic_body', vars) };
      if (s.state === 'closed') return { title: t('alert.closed_title', vars), body: t('alert.closed_body', vars) };
      if (s.state === 'avoid') {
        const body =
          s.window && s.window[0] === 0
            ? t('alert.now_body', vars)
            : s.window
              ? t('alert.avoid_body', { ...vars, lo: s.window[0], hi: s.window[1] })
              : t('alert.avoid_body_nowindow', vars);
        return { title: t('alert.avoid_title', vars), body };
      }
      return { title: t('alert.watch_title', vars), body: t('alert.watch_body', vars) };
    },
    [t, reasonText],
  );

  const deliver = useCallback(
    (entry: AlertEntry, spoken: string | undefined) => {
      setAlertLog((log) => [entry, ...log].slice(0, 40));
      showBanner(entry);
      if (settings.pushAlerts && notificationPermission === 'granted') {
        void sendLocalNotification(entry.title, entry.body);
      }
      if (spoken && settings.voiceAlerts && !simDriveActive) speak(spoken, language);
    },
    [showBanner, settings.pushAlerts, settings.voiceAlerts, notificationPermission, simDriveActive, language],
  );

  const pushAlert = useCallback(
    (e: Omit<AlertEntry, 'id' | 'at'> & { at?: number }, spoken?: string) => {
      deliver({ ...e, id: `${Date.now()}-${e.crossingId ?? 'x'}`, at: e.at ?? Date.now() }, spoken);
    },
    [deliver],
  );

  const prevRanks = useRef<Record<string, number>>({});
  const prevEpoch = useRef(-1);
  useEffect(() => {
    if (mode === 'live' && !liveSeries && !feeds.atx.ok && !feeds.nws.ok) return;
    // A new drill, seek or mode switch starts from a fresh baseline.
    if (prevEpoch.current !== drillEpoch.current) {
      prevEpoch.current = drillEpoch.current;
      prevRanks.current = {};
      if (mode === 'drill') {
        for (const s of statuses) prevRanks.current[s.id] = alertRank(s.danger, s.reasons);
        return;
      }
    }
    const fired: CrossingStatus[] = [];
    for (const s of statuses) {
      const rank = alertRank(s.danger, s.reasons);
      const prev = prevRanks.current[s.id] ?? 0;
      prevRanks.current[s.id] = rank;
      if (rank >= 2 && rank > prev && inAlertScope(s)) fired.push(s);
    }
    if (!fired.length) return;
    fired.sort(
      (a, b) => alertRank(b.danger, b.reasons) - alertRank(a.danger, a.reasons) || a.distanceKm - b.distanceKm,
    );
    const top = fired[0]!;
    const drillOn = mode === 'drill';
    const prefix = drillOn ? `${t('alert.drill_prefix')} · ` : '';
    const { title, body } = describe(top);
    const more = fired.length > 1 ? ` ${t('alert.more', { count: fired.length - 1 })}` : '';
    const at = drillOn ? drill.simT : Date.now();
    const entry: AlertEntry = {
      id: `${Date.now()}-${top.id}`,
      at,
      crossingId: top.id,
      state: top.displayState ?? 'watch',
      title: `${prefix}${title}`,
      body: `${body}${more}`,
      drill: drillOn,
      test: false,
    };
    const extra: AlertEntry[] = fired.slice(1).map((s) => {
      const d = describe(s);
      return {
        id: `${Date.now()}-${s.id}`,
        at,
        crossingId: s.id,
        state: s.displayState ?? 'watch',
        title: `${prefix}${d.title}`,
        body: d.body,
        drill: drillOn,
        test: false,
      };
    });
    const shouldSpeak = !tripActive && (!drillOn || top.displayState === 'avoid' || top.displayState === 'closed');
    const voice = shouldSpeak ? `${prefix}${title}. ${body}` : undefined;
    // Deliver outside the effect body. Not cancelled on cleanup: the baseline already advanced.
    setTimeout(() => {
      if (extra.length) setAlertLog((log) => [...extra, ...log].slice(0, 40));
      deliver(entry, voice);
    }, 0);
  }, [statuses, mode, liveSeries, feeds.atx.ok, feeds.nws.ok, inAlertScope, describe, deliver, t, drill.simT, tripActive]);

  // ---------- real-time rerouting ----------
  // When a new blocking hazard appears on the route still ahead of you, replan from where you are.
  useEffect(() => {
    if (mode !== 'live' || !routePlan || routeBusy) return;
    const ahead = distanceToRouteM(location, routePlan.route.coords).index;
    const avoidedIds = new Set(routePlan.avoided.map((h) => h.id));
    const knownRemaining = new Set(routePlan.remaining.map((h) => h.id));
    const fresh = hazardsOnRoute(routePlan.route.coords, hazards, undefined, ahead).filter(
      (h) => h.level === 'block' && !avoidedIds.has(h.id) && !knownRemaining.has(h.id),
    );
    if (!fresh.length) return;
    const first = fresh[0]!;
    const dest: Place = { name: routePlan.destinationName, detail: '', lat: routePlan.destination.lat, lon: routePlan.destination.lon };
    const timer = setTimeout(() => {
      void computeRoute(location, dest).then((plan) => {
        if (!plan) return;
        const stillBlocked = plan.remaining.some((h) => h.id === first.id);
        const title = stillBlocked ? t('route.no_way_title', { name: first.name }) : t('route.reroute_title', { name: first.name });
        const body = stillBlocked
          ? t('route.no_way_body', { reason: first.reason })
          : t('route.reroute_body', { reason: first.reason, min: Math.round(plan.extraMin) });
        const isTest = first.id.startsWith('test-');
        const alertTitle = isTest ? `TEST · ${title}` : title;
        pushAlert(
          { crossingId: first.id, state: 'avoid', title: alertTitle, body, drill: false, test: isTest },
          `${alertTitle}. ${body}`,
        );
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [hazards, routePlan, routeBusy, mode, location, computeRoute, pushAlert, t]);

  const sendTestAlert = useCallback(async () => {
    let perm = notificationPermission;
    if (settings.pushAlerts && perm !== 'granted' && perm !== 'denied') perm = await requestNotifications();
    const entry: AlertEntry = {
      id: `${Date.now()}-test`,
      at: Date.now(),
      crossingId: null,
      state: 'avoid',
      title: t('alert.test_title'),
      body: t('alert.test_body'),
      drill: false,
      test: true,
    };
    setAlertLog((log) => [entry, ...log].slice(0, 40));
    showBanner(entry);
    if (settings.pushAlerts && perm === 'granted') void sendLocalNotification(entry.title, entry.body);
    if (settings.voiceAlerts) speak(`${entry.title}. ${entry.body}`, language, { force: true });
  }, [notificationPermission, settings.pushAlerts, settings.voiceAlerts, requestNotifications, t, showBanner, language]);

  const value: MonitorValue = {
    mode,
    setMode,
    homeTab,
    setHomeTab,
    mapFocusId,
    focusOnMap,
    pendingTripStormId,
    requestTripDemo,
    clearPendingTrip,
    location,
    locationSource,
    customOrigin,
    setCustomOrigin,
    speedMps,
    locationPermission,
    requestLocation,
    notificationPermission,
    requestNotifications,
    settings,
    updateSettings,
    liveSeries,
    liveFetchedAt,
    latestObsAt,
    nowMs: clock,
    liveLoading,
    liveError,
    refreshLive,
    feeds,
    weatherAlerts,
    drill,
    startDrill,
    setDrillPlaying,
    setDrillSpeed,
    seekDrill,
    setTripActive,
    statuses,
    statusById,
    inAlertScope,
    hazards,
    routePlan: mode === 'live' ? routePlan : null,
    routeBusy,
    routeError,
    planRoute,
    clearRoute,
    testHazard,
    simulateHazardOnRoute,
    endRouteTest,
    alertLog,
    banner,
    dismissBanner: () => setBanner(null),
    pushAlert,
    sendTestAlert,
  };

  return <MonitorContext.Provider value={value}>{children}</MonitorContext.Provider>;
}
