import { afterEach, expect, jest, test } from '@jest/globals';
import { planSafeRoute, hazardsOnRoute } from '@/lib/routing';
import recorded from '../../assets/demo/commute_presets.json';
afterEach(() => {
  jest.restoreAllMocks();
});

test.each(recorded.presets)(
  'router outage retains recorded preset geometry with coverage and hazard checks: $destination.lat',
  async (preset) => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Router unavailable'));
    const result = await planSafeRoute(preset.origin, preset.destination, 'Preset', []);
    expect(result?.geometrySource).toBe('recorded');
    expect(result!.route.coords.length).toBeGreaterThan(10);
    expect(result?.outsideCoverage).toBe(preset.destination.lon > -97);
    const point = result!.route.coords[10]!;
    const hazard = {
      ...point,
      id: 'closure',
      name: 'Closure',
      reason: 'Official closure',
      level: 'block' as const,
    };
    const blocked = await planSafeRoute(preset.origin, preset.destination, 'Preset', [hazard]);
    expect(blocked?.avoided).toEqual([]);
    expect(hazardsOnRoute(blocked!.route.coords, [hazard])).toHaveLength(1);
    expect(blocked?.remaining[0]?.id).toBe('closure');
  },
);

test('outage does not invent geometry for an arbitrary destination or aborted request', async () => {
  jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Router unavailable'));
  const p = recorded.presets[0]!;
  expect(await planSafeRoute(p.origin, { lat: 31, lon: -98 }, 'Other', [])).toBeNull();
  const controller = new AbortController();
  controller.abort();
  await expect(
    planSafeRoute(p.origin, p.destination, 'Preset', [], controller.signal),
  ).rejects.toThrow();
});
