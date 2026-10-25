import { afterEach, expect, jest, test } from '@jest/globals';
import { routeEvidence } from '@/lib/route-evidence';
import { groupPhysicalCrossings } from '@/lib/danger';
import type { CrossingStatus } from '@/lib/monitor-context';
import { fetchOfficialClosures, fetchWeatherAlerts } from '@/lib/hazards';

afterEach(() => { jest.restoreAllMocks(); });

const now = 1_800_000_000_000;
const status = (patch: Partial<CrossingStatus> = {}): CrossingStatus => ({
  id: 'evidence', name: 'Road at Creek', creek: 'Creek', lat: 30.2, lon: -97.7,
  distanceKm: 1, monitored: false, coverage: 'none', state: 'unknown', window: null,
  displayState: null, live: null, official: null, alert: null, rain: null, history: null,
  danger: null, reasons: [], ...patch,
});
test('loading, failed and successful-empty official responses remain distinct', () => {
  expect(routeEvidence([], null, now).official).toBe('loading');
  expect(routeEvidence([], false, now).official).toBe('unavailable');
  expect(routeEvidence([], true, now).official).toBe('none');
});
test('cached closure does not imply a successful current official check', () => {
  const groups = groupPhysicalCrossings([status({ official: { closed: true, comment: '', updatedAt: now } })]);
  expect(routeEvidence(groups, true, now)).toMatchObject({ official: 'closed', closed: 1 });
  expect(routeEvidence(groups, false, now)).toMatchObject({ official: 'unavailable', closed: 1 });
});
test('future, missing and stale observations never count as current creek readings', () => {
  const groups = (obsAt: number | null) => groupPhysicalCrossings([status({
    monitored: true,
    live: { crossingId: 'evidence', state: 'unknown', window: null, link: null, stageFt: 1, rise30Ft: null, obsAt },
  })]);
  expect(routeEvidence(groups(now), true, now).fresh).toBe(1);
  expect(routeEvidence(groups(now + 60_000), true, now).fresh).toBe(0);
  expect(routeEvidence(groups(null), true, now).fresh).toBe(0);
  expect(routeEvidence(groups(now - 81 * 60_000), true, now).fresh).toBe(0);
});

test('an HTTP-success error payload cannot masquerade as no official closures', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ error: 'upstream maintenance' }) } as Response);
  await expect(fetchOfficialClosures()).rejects.toThrow('missing its records');
});

test('an explicit empty official array is a successful result', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ attributes: [] }) } as Response);
  await expect(fetchOfficialClosures()).resolves.toEqual([]);
});

test('an HTTP-success malformed weather payload cannot silently remove warnings', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ error: 'maintenance' }) } as Response);
  await expect(fetchWeatherAlerts()).rejects.toThrow('missing its alert records');
});
