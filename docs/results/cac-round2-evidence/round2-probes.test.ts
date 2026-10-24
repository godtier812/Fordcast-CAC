// Audit probes, copied to mobile/.local/__tests__/ for execution with the project's Jest config.
// These deliberately assert the promised behavior. Failures are audit findings, not product fixes.
import { describe, expect, test } from '@jest/globals';
import { allowedWindows } from '../../src/lib/risk';
import { toArrivalBucketKey } from '../../src/components/ArrivalBucketStrip';
import { groupPhysicalCrossings, selectDriveTargets } from '../../src/lib/danger';
import { insideCoverage } from '../../src/lib/geo';
import type { CrossingStatus } from '../../src/lib/monitor-context';

const base = (patch: Partial<CrossingStatus> = {}): CrossingStatus => ({
  id: 'atx-probe', name: 'Probe Road at Creek A', creek: 'Creek A', lat: 30.2672,
  lon: -97.7431, monitored: true, coverage: 'calibrated', state: 'no_rise',
  window: null, displayState: 'no_rise', distanceKm: 1, live: null, official: null,
  alert: null, rain: null, history: null, danger: null, reasons: [], ...patch,
});

describe('round 2 adversarial audit', () => {
  test.each(allowedWindows)('visual arrival contract accepts model window %s', (encoded) => {
    const window = encoded.split(',').map(Number) as [number, number];
    expect(toArrivalBucketKey(window)).not.toBeNull();
  });

  test('a calm sensor at an official closure is still closed and has no lag window', () => {
    const [target] = selectDriveTargets([base({
      displayState: 'closed', danger: 'block', reasons: ['official_closed'], window: [30, 60],
      official: { closed: true, comment: '', updatedAt: 2000 },
    })]);
    expect(target?.state).toBe('closed');
    expect(target?.window).toBeNull();
  });

  test('an unmonitored NWS warning is selected for Drive', () => {
    const [target] = selectDriveTargets([base({
      monitored: false, state: 'unknown', displayState: 'avoid', danger: 'block', reasons: ['ffw'],
    })]);
    expect(target?.state).toBe('avoid');
  });

  test('closure observation time must describe the closure rather than a calm gauge', () => {
    const [target] = selectDriveTargets([base({
      displayState: 'closed', danger: 'block', reasons: ['official_closed'],
      official: { closed: true, comment: '', updatedAt: 2000 },
      live: { crossingId: 'atx-probe', state: 'no_rise', window: null, link: null,
        stageFt: 1, rise30Ft: 0, obsAt: 1000 },
    })]);
    expect(target?.obsAt).toBe(2000);
  });

  test('distinct creek crossings on the same road must not merge solely by proximity', () => {
    const groups = groupPhysicalCrossings([
      base(),
      base({ id: 'atx-probe-b', name: 'Probe Road at Creek B', creek: 'Creek B', lat: 30.2692 }),
    ]);
    expect(groups).toHaveLength(2);
  });

  test('current coverage excludes the public College Station district-office coordinate', () => {
    expect(insideCoverage({ lat: 30.626523387717626, lon: -96.33852071617036 })).toBe(false);
  });
});
