import { describe, expect, test } from '@jest/globals';
import {
  alertRank,
  assessDanger,
  cleanPhysicalCrossingName,
  dangerState,
  groupPhysicalCrossings,
  selectDriveTargets,
} from '../lib/danger';
import { isBucketActiveForWindow, toArrivalBucketKey } from '../components/ArrivalBucketStrip';
import { alertAt, isHeavyRain, parseNwsAlerts, pointInRing } from '../lib/hazards';
import type { CrossingStatus } from '../lib/monitor-context';
import {
  cumulativeKm,
  decodePolyline6,
  distanceToRouteM,
  googleMapsUrl,
  hazardsOnRoute,
  nearestPointOnRoute,
  pointAlong,
  type RouteHazard,
} from '../lib/routing';
import { crossings, demoTrips, floodHistory, officialCrossings, replays, stateAt } from '../lib/data';

const base = { monitored: true, state: 'no_rise' as const, officialClosed: false, alertEvent: null, heavyRain: false, historyTier: null };

describe('combined danger assessment', () => {
  test('official closure beats a calm sensor', () => {
    const r = assessDanger({ ...base, officialClosed: true });
    expect(r.danger).toBe('block');
    expect(r.reasons[0]).toBe('official_closed');
    expect(dangerState(r.danger, r.reasons)).toBe('closed');
    expect(alertRank(r.danger, r.reasons)).toBe(4);
  });
  test('a Flash Flood Warning blocks even unmonitored crossings', () => {
    const r = assessDanger({ ...base, monitored: false, state: 'unknown', alertEvent: 'Flash Flood Warning' });
    expect(r.danger).toBe('block');
    expect(dangerState(r.danger, r.reasons)).toBe('avoid');
  });
  test('heavy rain at a crossing with flood history is caution and alerts; rain alone only shows', () => {
    const hist = assessDanger({ ...base, monitored: false, state: 'unknown', heavyRain: true, historyTier: 'high' });
    expect(hist).toEqual({ danger: 'caution', reasons: ['rain_history'] });
    expect(alertRank(hist.danger, hist.reasons)).toBe(2);
    const plain = assessDanger({ ...base, monitored: false, state: 'unknown', heavyRain: true, historyTier: 'none' });
    expect(plain.danger).toBe('caution');
    expect(alertRank(plain.danger, plain.reasons)).toBe(0);
  });
  test('sensor offline during heavy rain is never treated as fine', () => {
    const r = assessDanger({ ...base, state: 'unknown', heavyRain: true });
    expect(r.reasons).toContain('sensor_offline_rain');
    expect(r.danger).toBe('caution');
  });
  test('no hazards → no danger', () => {
    expect(assessDanger(base)).toEqual({ danger: null, reasons: [] });
  });
});

describe('hazard feeds', () => {
  const square: [number, number][] = [
    [30, -98],
    [30, -97],
    [31, -97],
    [31, -98],
    [30, -98],
  ];
  test('point in polygon', () => {
    expect(pointInRing({ lat: 30.5, lon: -97.5 }, square)).toBe(true);
    expect(pointInRing({ lat: 29.5, lon: -97.5 }, square)).toBe(false);
  });
  test('NWS parser keeps flood events and picks the most serious', () => {
    const alerts = parseNwsAlerts([
      { id: 'a', geometry: { type: 'Polygon', coordinates: [square.map(([la, lo]) => [lo, la])] }, properties: { event: 'Flood Advisory' } },
      { id: 'b', geometry: { type: 'Polygon', coordinates: [square.map(([la, lo]) => [lo, la])] }, properties: { event: 'Flash Flood Warning' } },
      { id: 'c', geometry: null, properties: { event: 'Heat Advisory' } },
    ]);
    expect(alerts.map((a) => a.event)).toEqual(['Flood Advisory', 'Flash Flood Warning']);
    expect(alertAt({ lat: 30.5, lon: -97.5 }, alerts)?.event).toBe('Flash Flood Warning');
  });
  test('heavy rain thresholds', () => {
    expect(isHeavyRain({ lat: 0, lon: 0, past3hMm: 26, next3hMm: 0, past1hMm: 5 })).toBe(true);
    expect(isHeavyRain({ lat: 0, lon: 0, past3hMm: 5, next3hMm: 0, past1hMm: 14 })).toBe(true);
    expect(isHeavyRain({ lat: 0, lon: 0, past3hMm: 5, next3hMm: 3, past1hMm: 2 })).toBe(false);
    expect(isHeavyRain(null)).toBe(false);
  });
});

describe('routing helpers', () => {
  test('decodes Valhalla polyline6', () => {
    // Google's reference polyline at precision 6 = the same points ×10 apart from precision 5.
    const pts = decodePolyline6('_izlhA~rlgdF_{geC~ywl@_kwzCn`{nI');
    expect(pts[0]!.lat).toBeCloseTo(38.5, 5);
    expect(pts[0]!.lon).toBeCloseTo(-120.2, 5);
    expect(pts).toHaveLength(3);
  });
  const line = [
    { lat: 30.2, lon: -97.8 },
    { lat: 30.2, lon: -97.7 },
  ];
  test('hazards near the route are found in driving order; far ones are not', () => {
    const hz: RouteHazard[] = [
      { id: 'far', name: 'Far', lat: 30.21, lon: -97.75, level: 'block', reason: '' },
      { id: 'b', name: 'B', lat: 30.2002, lon: -97.72, level: 'block', reason: '' },
      { id: 'a', name: 'A', lat: 30.1998, lon: -97.78, level: 'caution', reason: '' },
    ];
    expect(hazardsOnRoute(line, hz).map((h) => h.id)).toEqual(['a', 'b']);
  });
  test('exclusion point is projected onto the road', () => {
    const p = nearestPointOnRoute({ lat: 30.2004, lon: -97.75 }, line);
    expect(p.lat).toBeCloseTo(30.2, 6);
    expect(distanceToRouteM(p, line).d).toBeLessThan(1);
  });
  test('pointAlong walks the route', () => {
    const cum = cumulativeKm(line);
    const mid = pointAlong(line, cum, cum[1]! / 2);
    expect(mid.lon).toBeCloseTo(-97.75, 4);
    expect(mid.heading).toBeCloseTo(90, 0);
  });
  test('Google Maps link adds detour waypoints only when the route changed', () => {
    const baseline = { coords: line, km: 10, min: 10 };
    const detour = {
      coords: [line[0]!, { lat: 30.23, lon: -97.76 }, { lat: 30.24, lon: -97.75 }, { lat: 30.23, lon: -97.74 }, line[1]!],
      km: 12,
      min: 14,
    };
    const o = line[0]!;
    const d = line[1]!;
    expect(googleMapsUrl({ origin: o, destination: d, route: baseline, baseline })).not.toContain('waypoints');
    const url = googleMapsUrl({ origin: o, destination: d, route: detour, baseline });
    expect(url).toContain('waypoints=');
    expect(url.split('waypoints=')[1]!.split('%7C').length).toBeLessThanOrEqual(3);
  });
});

describe('extra datasets', () => {
  test('flood history covers every crossing', () => {
    for (const f of crossings) expect(floodHistory.crossings[f.properties.id]).toBeDefined();
    expect(floodHistory.total_events_in_area).toBeGreaterThan(100);
  });
  test('regional ATXfloods inventory bundles 1,800+ extra crossings without duplicating the 141 study crossings', () => {
    expect(officialCrossings.length).toBeGreaterThan(1800);
    const studyIds = new Set(crossings.map((f) => f.properties.id));
    for (const c of officialCrossings) {
      expect(studyIds.has(c.id)).toBe(false);
      expect(Number.isFinite(c.lat)).toBe(true);
      expect(Number.isFinite(c.lon)).toBe(true);
    }
  });
  test('every storm has a car demo whose normal route really crosses the flooded crossing', () => {
    expect(demoTrips).toHaveLength(5);
    for (const trip of demoTrips) {
      const c = crossings.find((f) => f.properties.id === trip.crossingId)!;
      const at = { lat: c.geometry.coordinates[1]!, lon: c.geometry.coordinates[0]! };
      const baseline = trip.baseline.coords.map(([lat, lon]) => ({ lat, lon }));
      expect(distanceToRouteM(at, baseline).d).toBeLessThanOrEqual(45);
      expect(trip.reroute).not.toBeNull();
      const detour = trip.reroute!.coords.map(([lat, lon]) => ({ lat, lon }));
      expect(distanceToRouteM(at, detour).d).toBeGreaterThan(60);
      // The replay really does turn this crossing dangerous at the trigger time.
      const replay = replays[trip.stormId]!;
      expect(['watch', 'avoid']).toContain(stateAt(replay, trip.crossingId, Date.parse(trip.trigger.t)).state);
      expect(stateAt(replay, trip.crossingId, Date.parse(trip.trigger.t) - 1).state).not.toBe(trip.trigger.state);
    }
  });
});

const mkStatus = (overrides: Partial<CrossingStatus> & Pick<CrossingStatus, 'id' | 'name' | 'creek' | 'lat' | 'lon'>): CrossingStatus => ({
  distanceKm: 1,
  monitored: false,
  coverage: 'official',
  state: 'unknown',
  displayState: null,
  danger: null,
  reasons: [],
  window: null,
  live: null,
  official: null,
  alert: null,
  rain: null,
  history: null,
  ...overrides,
});

describe('CAC audit regressions: physical crossing grouping, Drive HUD selector, alert expiry, arrival windows', () => {
  test('4 co-located E. William Cannon barrier/standpipe records merge into 1 physical crossing area', () => {
    const records: CrossingStatus[] = [
      mkStatus({
        id: 'atx-19',
        name: 'E William Cannon Dr at Onion Creek',
        creek: 'Onion Creek',
        lat: 30.1658,
        lon: -97.7429,
        distanceKm: 9.1,
        monitored: true,
        coverage: 'calibrated',
        state: 'no_rise',
        displayState: 'no_rise',
      }),
      mkStatus({
        id: 'atx-official-1',
        name: 'E. William Cannon @ Onion Creek Master Standpipe',
        creek: 'Onion Creek',
        lat: 30.1659,
        lon: -97.7428,
        distanceKm: 9.1,
        displayState: 'closed',
        danger: 'block',
        reasons: ['official_closed'],
      }),
      mkStatus({
        id: 'atx-official-2',
        name: 'E. William Cannon @ Onion Creek Slave Arm (West)',
        creek: 'Onion Creek',
        lat: 30.1657,
        lon: -97.743,
        distanceKm: 9.1,
      }),
      mkStatus({
        id: 'atx-official-3',
        name: 'E. William Cannon @ Onion Creek Slave Arm (East)',
        creek: 'Onion Creek',
        lat: 30.16585,
        lon: -97.7427,
        distanceKm: 9.1,
      }),
    ];
    expect(cleanPhysicalCrossingName('E. William Cannon @ Onion Creek Master Standpipe')).toBe(
      'E. William Cannon at Onion Creek',
    );
    const grouped = groupPhysicalCrossings(records);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]!.records).toHaveLength(4);
    expect(grouped[0]!.primary.danger).toBe('block');
    expect(grouped[0]!.primary.displayState).toBe('closed');
  });

  test('selectDriveTargets includes unmonitored official closures and overrides calm sensor with combined displayState', () => {
    const items: CrossingStatus[] = [
      mkStatus({
        id: 'calm-monitored-closed',
        name: 'Spicewood Springs Rd #1',
        creek: 'Bull Creek',
        lat: 30.37,
        lon: -97.76,
        distanceKm: 2.5,
        monitored: true,
        coverage: 'calibrated',
        state: 'no_rise',
        displayState: 'closed',
        danger: 'block',
        reasons: ['official_closed'],
      }),
      mkStatus({
        id: 'unmonitored-closed',
        name: 'Red Bud Trail at Lady Bird Lake',
        creek: 'Colorado River',
        lat: 30.29,
        lon: -97.78,
        distanceKm: 1.2,
        displayState: 'closed',
        danger: 'block',
        reasons: ['official_closed'],
      }),
      mkStatus({
        id: 'unmonitored-calm',
        name: 'Quiet Lane at Dry Creek',
        creek: 'Dry Creek',
        lat: 30.28,
        lon: -97.75,
        distanceKm: 0.5,
      }),
    ];
    const targets = selectDriveTargets(items);
    expect(targets.map((t) => t.id)).toEqual(['unmonitored-closed', 'calm-monitored-closed']);
    expect(targets[0]!.displayState).toBe('closed');
    expect(targets[1]!.displayState).toBe('closed');
  });

  test('alertAt skips expired NWS alerts', () => {
    const square: [number, number][] = [
      [30, -98],
      [30, -97],
      [31, -97],
      [31, -98],
      [30, -98],
    ];
    const now = Date.parse('2026-10-20T18:00:00Z');
    const alerts = parseNwsAlerts([
      {
        id: 'expired',
        geometry: { type: 'Polygon', coordinates: [square.map(([la, lo]) => [lo, la])] },
        properties: { event: 'Flash Flood Warning', expires: '2026-10-20T17:00:00Z' },
      },
    ]);
    expect(alertAt({ lat: 30.5, lon: -97.5 }, alerts, now)).toBeNull();
  });

  test('ArrivalBucketStrip supports multi-bucket windows [0, 30], [15, 60], and [30, 60]', () => {
    expect(toArrivalBucketKey([30, 60])).toBe('[30, 45]');
    expect(isBucketActiveForWindow('[30, 45]', [30, 60])).toBe(true);
    expect(isBucketActiveForWindow('[45, 60]', [30, 60])).toBe(true);
    expect(isBucketActiveForWindow('[15, 30]', [30, 60])).toBe(false);
    expect(isBucketActiveForWindow('[0, 15]', [0, 30])).toBe(true);
    expect(isBucketActiveForWindow('[15, 30]', [0, 30])).toBe(true);
    expect(isBucketActiveForWindow('[15, 30]', [15, 60])).toBe(true);
    expect(isBucketActiveForWindow('[30, 45]', [15, 60])).toBe(true);
    expect(isBucketActiveForWindow('[45, 60]', [15, 60])).toBe(true);
  });
});
