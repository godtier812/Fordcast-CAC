import { describe, expect, test } from '@jest/globals';
import { evaluateCrossing, parseUsgsFeatures, primaryLink, rise30, toWindow, type GaugeSeries } from '../lib/live';
import { distanceKm, formatMiles, insideCoverage, AUSTIN_CENTER } from '../lib/geo';
import { drillBounds } from '../lib/drill';
import { replays } from '../lib/data';

const link = primaryLink('atx-19')!;
const now = Date.parse('2026-10-19T20:00:00Z');
const series = (values: number[], endOffsetMin = 5): GaugeSeries => ({
  [link.gauge_id]: values.map((v, i) => ({
    t: now - endOffsetMin * 60_000 - (values.length - 1 - i) * 5 * 60_000,
    v,
  })),
});

describe('live USGS warning rule (port of backend baseline_rule)', () => {
  test('flat water below watch level is "no rise"', () => {
    expect(evaluateCrossing('atx-19', series(Array(24).fill(1.0)), now).state).toBe('no_rise');
  });

  test('rising past the watch level by >0.2 ft in 30 min is "watch"', () => {
    const w = link.watch_stage_ft;
    const vals = [...Array(18).fill(w - 0.5), w - 0.3, w - 0.2, w - 0.1, w, w + 0.1, w + 0.2];
    const r = evaluateCrossing('atx-19', series(vals), now);
    expect(r.state).toBe('watch');
    expect(r.window).toBeNull();
  });

  test('crossing the trigger while rising is "avoid" with a conservative arrival window', () => {
    const tr = link.trigger_stage_ft;
    const vals = [...Array(18).fill(tr - 1), tr - 0.6, tr - 0.3, tr - 0.1, tr + 0.2, tr + 0.4, tr + 0.6];
    const r = evaluateCrossing('atx-19', series(vals), now);
    expect(r.state).toBe('avoid');
    expect(r.window).not.toBeNull();
    expect([[0, 15], [15, 30], [30, 60], [60, 90], [0, 30], [15, 60], [30, 90]]).toContainEqual(r.window);
  });

  test('stale or missing sensor data is "unknown", never reassuring', () => {
    expect(evaluateCrossing('atx-19', series(Array(24).fill(1.0), 120), now).state).toBe('unknown');
    expect(evaluateCrossing('atx-19', {}, now).state).toBe('unknown');
  });

  test('parser keeps feet, drops bad qualifiers, dedupes timestamps', () => {
    const f = (t: string, v: string, q: string | null = null, unit = 'ft') => ({
      properties: { monitoring_location_id: 'USGS-1', parameter_code: '00065', time: t, value: v, unit_of_measure: unit, qualifier: q },
    });
    const s = parseUsgsFeatures([
      f('2026-10-19T19:00:00Z', '1.0'),
      f('2026-10-19T19:00:00Z', '9.9'),
      f('2026-10-19T19:05:00Z', '1.2'),
      f('2026-10-19T19:10:00Z', '5.0', 'ICE'),
      f('2026-10-19T19:15:00Z', '3.0', null, 'm'),
    ]);
    expect(s['USGS-1']).toEqual([
      { t: Date.parse('2026-10-19T19:00:00Z'), v: 1.0 },
      { t: Date.parse('2026-10-19T19:05:00Z'), v: 1.2 },
    ]);
  });

  test('rise30 and toWindow match backend semantics', () => {
    expect(rise30([{ t: 0, v: 1 }, { t: 30 * 60_000, v: 1.5 }])).toBeCloseTo(0.5);
    expect(toWindow(65, 80)).toEqual([60, 90]);
    expect(toWindow(10, 40)).toEqual([0, 30]);
    expect(toWindow(95, 120)).toBeNull();
  });
});

describe('geo + drill helpers', () => {
  test('distance and coverage', () => {
    expect(distanceKm(AUSTIN_CENTER, AUSTIN_CENTER)).toBe(0);
    expect(insideCoverage({ lat: 30.4, lon: -97.8 })).toBe(true);
    expect(insideCoverage({ lat: 29.76, lon: -95.37 })).toBe(false); // Houston
    expect(formatMiles(1.609)).toBe('1.0 mi');
  });

  test('every storm drill has a playable window inside the storm', () => {
    for (const r of Object.values(replays)) {
      const b = drillBounds(r);
      expect(b.endMs).toBeGreaterThan(b.startMs);
      expect(b.startMs).toBeGreaterThanOrEqual(Date.parse(r.storm.start));
    }
  });
});
