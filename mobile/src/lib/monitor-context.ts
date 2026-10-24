/**
 * Types + context for the live monitor. Kept free of native imports so screens
 * (and their tests) can read it without loading location/notification modules.
 */
import { createContext, useContext } from 'react';
import type { LatLon } from './geo';
import type { WeatherAlert } from './hazards';
import type { GaugeSeries, LiveStatus } from './live';
import type { PermissionState } from './notify';
import type { Place, RouteHazard, RoutePlan } from './routing';
import type { CrossingStateKey } from '@/theme/tokens';

export type MonitorMode = 'live' | 'drill';
export type HomeTab = 'explore' | 'route' | 'sensors';
export type LocationSource = 'gps' | 'demo' | 'outside' | 'off' | 'custom';
/** calibrated: FordCast sensor status · uncalibrated: sensor nearby, no lag model ·
 *  none: no sensor · official: an ATXfloods crossing outside FordCast's 141. */
export type Coverage = 'calibrated' | 'uncalibrated' | 'none' | 'official';

export type DangerReason =
  | 'official_closed'
  | 'sensor_closed'
  | 'sensor_avoid'
  | 'ffe'
  | 'ffw'
  | 'sensor_watch'
  | 'flood_warning'
  | 'rain_history'
  | 'sensor_offline_rain'
  | 'heavy_rain';

export type HistoryInfo = {
  tier: 'high' | 'elevated' | 'none';
  reports: number;
  deaths: number;
  vehicleDeaths: number;
  vehicleRelated: number;
  lastEvent: string | null;
  eventIds?: string[];
  events: {
    event_id?: string;
    date: string;
    type: string;
    dist_km: number;
    deaths: number;
    vehicle_related: boolean;
    summary: string;
  }[];
};

export type CrossingStatus = {
  id: string;
  name: string;
  creek: string;
  lat: number;
  lon: number;
  /** True only when a calibrated upstream sensor link exists, so FordCast can give a sensor status. */
  monitored: boolean;
  coverage: Coverage;
  /** Sensor (or drill) state; meaningful only when `monitored`. */
  state: CrossingStateKey;
  window: [number, number] | null;
  /** What the map/list should show: official closure wins, then sensor state, else none. */
  displayState: CrossingStateKey | null;
  distanceKm: number;
  live: LiveStatus | null;
  official: { closed: boolean; comment: string; updatedAt: number | null } | null;
  alert: { event: string; headline: string; expires?: number | null; flashFlood?: boolean } | null;
  rain: { past3hIn: number; next3hIn: number; heavy: boolean } | null;
  history: HistoryInfo | null;
  /** Combined risk from every source: block = route around it, caution = avoid if you can. */
  danger: 'block' | 'caution' | null;
  reasons: DangerReason[];
};

export type AlertEntry = {
  id: string;
  at: number;
  crossingId: string | null;
  state: CrossingStateKey;
  title: string;
  body: string;
  drill: boolean;
  test: boolean;
};

export type MonitorSettings = {
  alertRadiusMi: number;
  voiceAlerts: boolean;
  pushAlerts: boolean;
  useDemoLocation: boolean;
};

export type DrillState = {
  stormId: string;
  simT: number;
  startMs: number;
  endMs: number;
  playing: boolean;
  speed: 1 | 2 | 4;
  /** Storm minutes per real second when a demo overrides the speed picker. */
  minPerSecOverride: number | null;
};

export type FeedState = { ok: boolean | null; at: number | null };
export type Feeds = { usgs: FeedState; atx: FeedState; nws: FeedState; rain: FeedState };

export type MonitorValue = {
  mode: MonitorMode;
  setMode: (m: MonitorMode) => void;
  homeTab: HomeTab;
  setHomeTab: (tab: HomeTab) => void;
  mapFocusId: string | null;
  focusOnMap: (crossingId: string | null) => void;
  pendingTripStormId: string | null;
  requestTripDemo: (stormId: string) => void;
  clearPendingTrip: () => void;

  location: LatLon;
  locationSource: LocationSource;
  customOrigin: Place | null;
  setCustomOrigin: (origin: Place | null) => void;
  speedMps: number | null;
  locationPermission: PermissionState;
  requestLocation: () => Promise<void>;

  notificationPermission: PermissionState;
  requestNotifications: () => Promise<PermissionState>;

  settings: MonitorSettings;
  updateSettings: (patch: Partial<MonitorSettings>) => void;

  liveSeries: GaugeSeries | null;
  liveFetchedAt: number | null;
  latestObsAt: number | null;
  /** Ticking wall-clock reference (ms) so live observation age and staleness advance during outages. */
  nowMs: number;
  liveLoading: boolean;
  liveError: boolean;
  refreshLive: () => void;
  feeds: Feeds;
  weatherAlerts: WeatherAlert[];

  drill: DrillState;
  startDrill: (stormId?: string, opts?: { startMs?: number; minPerSec?: number }) => void;
  setDrillPlaying: (playing: boolean) => void;
  setDrillSpeed: (speed: 1 | 2 | 4) => void;
  seekDrill: (simT: number) => void;
  /** While a moving-car demo runs, it owns the voice so messages don't overlap. */
  setTripActive: (active: boolean) => void;

  statuses: CrossingStatus[];
  statusById: Record<string, CrossingStatus>;
  inAlertScope: (s: CrossingStatus) => boolean;

  hazards: RouteHazard[];
  routePlan: RoutePlan | null;
  routeBusy: boolean;
  routeError: boolean;
  planRoute: (dest: Place, originOverride?: LatLon) => Promise<void>;
  clearRoute: () => void;
  /** A clearly-labelled TEST hazard dropped on the active route to demo live rerouting. */
  testHazard: RouteHazard | null;
  simulateHazardOnRoute: () => void;
  endRouteTest: () => Promise<void>;

  alertLog: AlertEntry[];
  banner: AlertEntry | null;
  dismissBanner: () => void;
  pushAlert: (entry: Omit<AlertEntry, 'id' | 'at'> & { at?: number }, spoken?: string) => void;
  sendTestAlert: () => Promise<void>;
};

export const MonitorContext = createContext<MonitorValue | null>(null);

export function useMonitor(): MonitorValue {
  const value = useContext(MonitorContext);
  if (!value) throw new Error('MonitorProvider missing');
  return value;
}

/** Returns null when rendered outside the provider (e.g. isolated component tests). */
export function useMonitorOptional(): MonitorValue | null {
  return useContext(MonitorContext);
}
