/**
 * Moving-car storm demo. A car drives a real road trip (precomputed with Valhalla) while
 * the storm replays at 1 storm-minute per second. The moment FordCast's state for the
 * crossing ahead turns dangerous, the car reroutes onto the precomputed detour and the
 * app announces it with studio neural audio — the same decision the live router makes.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { demoTrips, results, type DemoTrip } from '@/lib/data';
import type { LatLon } from '@/lib/geo';
import { useMonitor } from '@/lib/monitor-context';
import { usePreferences, type CopyKey } from '@/lib/preferences';
import { cumulativeKm, pointAlong } from '@/lib/routing';
import { speak, stopSpeaking } from '@/lib/voice';
import type { MapCar, MapRoute } from '@/features/map/LiveMap';

export const DRIVE_SECONDS = 50;
/** Seconds of warning before the car reaches the decision point. */
const LEAD_SECONDS = 3;
const MAX_CAUTION_DETOUR_MIN = 12;

type Phase = 'driving' | 'rerouted' | 'caution' | 'no_way' | 'arrived';
type Run = {
  trip: DemoTrip;
  startedAt: number;
  phase: Phase;
  rerouteExtraMin: number | null;
  reroutedAtSec: number | null;
  reroutedAtKm: number | null;
};

const toLL = (cs: [number, number][]): LatLon[] => cs.map(([lat, lon]) => ({ lat, lon }));

export function tripFor(stormId: string): DemoTrip | undefined {
  return demoTrips.find((t) => t.stormId === stormId);
}

/**
 * Piecewise continuous distance function along the active route/detour so pre-decision timing
 * stays aligned with the storm trigger while the post-decision detour finishes at `DRIVE_SECONDS` (50s).
 */
export function demoDistanceAt(
  elapsedSec: number,
  baseTotalKm: number,
  totalKm: number,
  rerouteAtSec: number | null,
  rerouteAtKm: number | null,
): number {
  if (elapsedSec <= 0) return 0;
  const baseSpeed = (baseTotalKm > 0 ? baseTotalKm : 1) / DRIVE_SECONDS;
  if (rerouteAtSec == null || rerouteAtKm == null || elapsedSec <= rerouteAtSec) {
    return Math.min(totalKm, elapsedSec * baseSpeed);
  }
  const startKm = Math.max(0, Math.min(totalKm, rerouteAtKm));
  const remKm = Math.max(0, totalKm - startKm);
  const remSec = Math.max(1, DRIVE_SECONDS - rerouteAtSec);
  return Math.min(totalKm, startKm + ((elapsedSec - rerouteAtSec) / remSec) * remKm);
}

export function useTripDemo() {
  const m = useMonitor();
  const { t, language } = usePreferences();
  const [run, setRun] = useState<Run | null>(null);
  const [followCar, setFollowCar] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const runRef = useRef<Run | null>(null);
  const awaitingStorm = useRef<string | null>(null);

  const isStormMismatch =
    !!run && m.drill?.stormId != null && m.drill.stormId !== run.trip.stormId;
  // Do not animate a prior storm while the provider commits the requested one.
  const activeRun = run && m.drill?.stormId === run.trip.stormId ? run : null;

  useEffect(() => {
    if (run && m.drill?.stormId === run.trip.stormId) awaitingStorm.current = null;
  }, [run, m.drill?.stormId]);

  useEffect(() => {
    runRef.current = activeRun;
  }, [activeRun]);

  const geo = useMemo(() => {
    if (!activeRun) return null;
    const base = toLL(activeRun.trip.baseline.coords);
    const baseCum = cumulativeKm(base);
    const baseTotal = baseCum[baseCum.length - 1] ?? 0;
    const decisionKm = baseCum[activeRun.trip.decisionIndex] ?? 0;
    const useDetour =
      activeRun.phase === 'rerouted' || (activeRun.phase === 'arrived' && activeRun.rerouteExtraMin != null);
    const path =
      useDetour && activeRun.trip.reroute
        ? [...base.slice(0, activeRun.trip.decisionIndex + 1), ...toLL(activeRun.trip.reroute.coords).slice(1)]
        : base;
    const cum = cumulativeKm(path);
    const crossingKm = baseCum[0] !== undefined ? Math.min(baseTotal, activeRun.trip.crossingAlongKm) : 0;
    return {
      base,
      baseCum,
      baseTotal,
      decisionKm,
      path,
      cum,
      total: cum[cum.length - 1] ?? 0,
      crossingKm,
      speed: (baseTotal || 1) / DRIVE_SECONDS,
    };
  }, [activeRun]);

  // Animation clock.
  const noWayLimitKm = activeRun && geo ? Math.max(0, geo.crossingKm - 0.15) : 0;
  const maxKm = activeRun && geo ? (activeRun.phase === 'no_way' ? noWayLimitKm : geo.total) : 0;
  const elapsedSec = activeRun ? Math.max(0, (now - activeRun.startedAt) / 1000) : 0;
  const rawCarKm =
    activeRun && geo
      ? demoDistanceAt(elapsedSec, geo.baseTotal, geo.total, activeRun.reroutedAtSec, activeRun.reroutedAtKm)
      : 0;
  const carKm = Math.min(maxKm, rawCarKm);
  const stoppedAtNoWay = !!activeRun && activeRun.phase === 'no_way' && rawCarKm >= noWayLimitKm;

  useEffect(() => {
    if (!activeRun || activeRun.phase === 'arrived' || stoppedAtNoWay) return;
    const id = setInterval(() => {
      const tNow = Date.now();
      setNow(tNow);
      const cur = runRef.current;
      if (
        cur &&
        cur.phase !== 'no_way' &&
        cur.phase !== 'arrived' &&
        (tNow - cur.startedAt) / 1000 >= DRIVE_SECONDS
      ) {
        setRun((prev) =>
          prev && prev.phase !== 'no_way' && prev.phase !== 'arrived' ? { ...prev, phase: 'arrived' } : prev,
        );
        m.setDrillPlaying(false);
        m.setTripActive(false);
        if (m.settings.voiceAlerts) speak(`${t('alert.drill_prefix')}. ${t('trip.arrived_spoken')}`, language);
      }
    }, 120);
    return () => clearInterval(id);
  }, [activeRun, stoppedAtNoWay, m, t, language]);

  const car: MapCar | null = activeRun && geo ? pointAlong(geo.path, geo.cum, carKm) : null;

  const start = useCallback(
    (stormId: string) => {
      const trip = tripFor(stormId);
      if (!trip) return;
      const base = toLL(trip.baseline.coords);
      const cum = cumulativeKm(base);
      const speed = (cum[cum.length - 1] ?? 1) / DRIVE_SECONDS;
      const secondsToDecision = (cum[trip.decisionIndex] ?? 0) / speed;
      // Storm runs at 1 minute per second; line it up so the warning lands just before the decision point.
      const startMs = Date.parse(trip.trigger.t) - (secondsToDecision - LEAD_SECONDS) * 60_000;
      stopSpeaking();
      awaitingStorm.current = stormId;
      m.setTripActive(true);
      m.startDrill(stormId, { startMs, minPerSec: 1 });
      const startedAt = Date.now();
      setNow(startedAt);
      setFollowCar(true);
      setRun({
        trip,
        startedAt,
        phase: 'driving',
        rerouteExtraMin: null,
        reroutedAtSec: null,
        reroutedAtKm: null,
      });
    },
    [m],
  );

  const stop = useCallback(() => {
    awaitingStorm.current = null;
    setRun(null);
    m.setTripActive(false);
    m.setDrillPlaying(false);
    stopSpeaking();
  }, [m]);

  // Stop simulation if the drill storm is switched to another storm while a run is active.
  useEffect(() => {
    if (!isStormMismatch || awaitingStorm.current === run?.trip.stormId) return;
    m.setTripActive(false);
    m.setDrillPlaying(false);
    stopSpeaking();
    const id = setTimeout(() => setRun(null), 0);
    return () => clearTimeout(id);
  }, [isStormMismatch, run?.trip.stormId, m]);

  // Stop simulation if the app is backgrounded.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' && runRef.current) {
        stop();
      }
    });
    return () => sub.remove();
  }, [stop]);

  // Pause drill clock once the car holds short of an impassable crossing with no detour.
  useEffect(() => {
    if (!stoppedAtNoWay) return;
    m.setDrillPlaying(false);
    m.setTripActive(false);
  }, [stoppedAtNoWay, m]);

  // React to the crossing ahead turning dangerous.
  const status = activeRun ? m.statusById[activeRun.trip.crossingId] : undefined;
  const danger = status?.danger ?? null;
  useEffect(() => {
    const r = runRef.current;
    if (!r || !geo || r.phase !== 'driving' || !danger || carKm >= geo.crossingKm) return;
    const remainingBaseMin = r.trip.baseline.min * (1 - geo.decisionKm / (geo.baseCum[geo.baseCum.length - 1] || 1));
    const extra = r.trip.reroute ? Math.max(0, Math.round(r.trip.reroute.min - remainingBaseMin)) : null;
    const reason = status?.reasons[0] ? t(`hz.${status.reasons[0]}` as CopyKey) : t('state.avoid');
    const name = r.trip.crossingName;
    let phase: Phase;
    let title: string;
    let body: string;
    if (!r.trip.reroute) {
      phase = 'no_way';
      title = t('trip.no_way_title', { name });
      body = t('trip.no_way_body');
    } else if (danger === 'caution' && extra != null && extra > MAX_CAUTION_DETOUR_MIN) {
      phase = 'caution';
      title = t('trip.caution_title', { name });
      body = t('trip.caution_body', { reason });
    } else {
      phase = 'rerouted';
      title = t('trip.reroute_title', { name });
      body = t('trip.reroute_body', { reason, min: extra ?? 0 });
    }
    const timer = setTimeout(() => {
      const triggerElapsed = Math.max(0, (Date.now() - r.startedAt) / 1000);
      setRun((cur) =>
        cur
          ? {
              ...cur,
              phase,
              rerouteExtraMin: phase === 'rerouted' ? extra : null,
              reroutedAtSec: phase === 'rerouted' ? triggerElapsed : null,
              reroutedAtKm: phase === 'rerouted' ? carKm : null,
            }
          : cur,
      );
      m.pushAlert({
        crossingId: r.trip.crossingId,
        state: danger === 'block' ? 'avoid' : 'watch',
        title: `${t('alert.drill_prefix')} · ${title}`,
        body,
        drill: true,
        test: false,
      });
      if (m.settings.voiceAlerts) {
        speak(`${t('alert.drill_prefix')}. ${title}. ${body}`, language, { force: true });
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [danger, geo, carKm, status?.reasons, t, language, m]);

  // Arrival (only if not stopped short on a no_way crossing).
  const arrived = !!activeRun && !!geo && activeRun.phase !== 'no_way' && carKm >= geo.total && activeRun.phase !== 'arrived';
  useEffect(() => {
    if (!arrived) return;
    const timer = setTimeout(() => {
      setRun((cur) => (cur ? { ...cur, phase: 'arrived' } : cur));
      m.setDrillPlaying(false);
      m.setTripActive(false);
      if (m.settings.voiceAlerts) speak(`${t('alert.drill_prefix')}. ${t('trip.arrived_spoken')}`, language);
    }, 0);
    return () => clearTimeout(timer);
  }, [arrived, m, t, language]);

  const routes: MapRoute[] = useMemo(() => {
    if (!activeRun || !geo) return [];
    if (activeRun.rerouteExtraMin != null) {
      return [
        { id: 'abandoned', coords: geo.base.slice(activeRun.trip.decisionIndex), color: '#FF5470', dashed: true, width: 5 },
        { id: 'active', coords: geo.path, color: '#60A5FA' },
      ];
    }
    return [
      {
        id: 'active',
        coords: geo.base,
        color: activeRun.phase === 'no_way' || activeRun.phase === 'caution' ? '#F5A623' : '#60A5FA',
      },
    ];
  }, [activeRun, geo]);

  const fitPoints = useMemo<LatLon[] | null>(() => {
    if (!activeRun || !geo) return null;
    const detourPts = activeRun.trip.reroute ? toLL(activeRun.trip.reroute.coords) : [];
    return [...geo.base, ...detourPts];
  }, [activeRun, geo]);

  const fitKey = activeRun ? `trip-${activeRun.trip.stormId}-${activeRun.startedAt}` : undefined;

  // Honest outcome note for each storm, using the backtest results.
  const note = useMemo(() => {
    if (!activeRun) return '';
    const hero = (results.hero_by_storm as Record<string, { lead_min: number | null } | null>)[activeRun.trip.stormId];
    if (activeRun.trip.stormId === 'oct-2018') return t('trip.note_false_alarm');
    if (activeRun.trip.trigger.state !== 'avoid') return t('trip.note_watch_only');
    if (hero?.lead_min != null) return t('trip.note_hit', { lead: Math.round(hero.lead_min) });
    return '';
  }, [activeRun, t]);

  return {
    active: !!activeRun,
    run: activeRun,
    car,
    followCar,
    setFollowCar,
    fitPoints,
    fitKey,
    routes,
    destination: activeRun ? { lat: activeRun.trip.destination[0], lon: activeRun.trip.destination[1] } : null,
    kmLeft: geo ? Math.max(0, geo.total - carKm) : 0,
    note,
    start,
    stop,
  };
}
