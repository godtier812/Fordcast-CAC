// mobile/src/__tests__/baseline-rule-test.ts — ★ #1 tests, written by the agent BEFORE the student's code (01 §1.8).
// One test per row of the C §18.5 logic table, plus the §1.8 extras (stale link ignored, buckets only, lo = 0,
// ≥ 1 reason, the falling-gauge "peaked" case) and the 05 §23.3 worked example. They fail with TODO(student) until
// mobile/src/demo/engine/baseline-rule.ts is written.
import { evaluate } from '../demo/engine/baseline-rule';
import { CROSSINGS, GAUGES, LINKS } from '../demo/data/demo-data';
import type { Link, Reading, RuleResult } from '../demo/engine/types';
import { buildReadings, buildStageFns, visible } from '../demo/sim/sim';
import { SCENARIOS } from '../demo/scenario/scenarios';

const gauges = new Map(GAUGES.map((g) => [g.id, g]));
const UP = 'USGS-08158922';                  // Williamson Ck at Brush Country Blvd: 15-min readings, stale after 45 min
const UP2 = 'USGS-08158930';                 // a second real gauge, for the multi-link rows
const hero = CROSSINGS.find((c) => c.id === 'atx-37')!;
const L37 = LINKS.find((l) => l.crossingId === 'atx-37')!;   // τ 40 (P25 33, P75 44) · trigger 6.0 ft · watch 4.4 ft
const ALLOWED = new Set(['0-15', '15-30', '30-60', '60-90', '0-30', '15-60', '30-90']);

/** Readings as the phone has them at asOf: [obsMin, ft] pairs, each delivered 10 min after it was observed. */
const series = (gaugeId: string, pts: [number, number][]): Reading[] =>
  pts.map(([obsMin, ft]) => ({ gaugeId, obsMin, availMin: obsMin + 10, ft }));
const run = (pts: [number, number][], asOf: number, links: Link[] = [L37], more: [string, Reading[]][] = []): RuleResult =>
  evaluate(hero, links, new Map([[UP, series(UP, pts)], ...more]), gauges, asOf);

// A rising hydrograph that crosses the 6.0 ft trigger between 6:35 and 6:50 (simMin 45 → 60).
const RISING: [number, number][] = [[0, 2.2], [15, 2.4], [30, 3.2], [45, 4.7], [60, 7.1]];

describe('C §18.5 step 1 · only fresh upstream links count', () => {
  test('a stale upstream link is ignored (high and rising, but last reading 60 min old) → no_rise', () => {
    const r = run(RISING, 120);              // newest observation 60, asOf 120: 60 min > staleAfterMin 45
    expect(r).toMatchObject({ state: 'no_rise', window: null, triggerGaugeId: null, reasons: [] });
  });
  test('no links at all (empty usable set) → no_rise; combine.ts turns tier C / stale into UNKNOWN later', () => {
    expect(run(RISING, 70, [])).toMatchObject({ state: 'no_rise', etaLo: null, etaHi: null, window: null, reasons: [] });
  });
});

describe('C §18.5 steps 2 + 4 · AVOID when the upstream gauge is above trigger and rising', () => {
  test('05 §23.3 worked example: Jones Road at 7:00 AM (flash-flood-night, simMin 70) → Avoid 15–30', () => {
    const s = SCENARIOS.find((x) => x.id === 'flash-flood-night')!;
    const fn = buildStageFns(GAUGES, s.curves).get(UP)!;
    const rs = visible(buildReadings(gauges.get(UP)!, fn, s.curves, s.outages, -420, s.durationMin, s.seed), 70);
    expect(rs.at(-1)).toMatchObject({ obsMin: 60, ft: 7.14 });          // S = 7.14 ft, observed 6:50, delivered 7:00
    const r = evaluate(hero, [L37], new Map([[UP, rs]]), gauges, 70);
    expect(r.state).toBe('avoid');
    expect(r.etaLo).toBeCloseTo(15.9, 1);    // etaMid = 40 − (70 − 52.9) = 22.9; etaLo = 22.9 − (40 − 33)
    expect(r.etaHi).toBeCloseTo(26.9, 1);    // etaHi = 22.9 + (44 − 40)
    expect(r.window).toEqual([15, 30]);
    expect(r.triggerGaugeId).toBe(UP);
    expect(r.reasons[0]).toMatchObject({ code: 'UPSTREAM_ABOVE_TRIGGER', gauge_id: UP, trigger_ft: 6.0, obs_at: 60,
      tau_min: 40, tau_lo_min: 30, tau_hi_min: 45 });
    const why = r.reasons[0] as Extract<RuleResult['reasons'][number], { code: 'UPSTREAM_ABOVE_TRIGGER' }>;
    expect(why.value_ft).toBeCloseTo(7.14, 1);                            // shown as "7.1 ft"
    expect(why.rise_ft_30m).toBeCloseTo(4.47, 1);                         // shown as "+4.5 ft over the last 30 min"
  });
  test('reason numbers are rounded for display: value and rise to 0.1 ft, tau_min to 5 min', () => {
    const r = run(RISING, 70);
    const why = r.reasons[0] as Extract<RuleResult['reasons'][number], { code: 'UPSTREAM_ABOVE_TRIGGER' }>;
    expect(why.value_ft).toBe(7.1); expect(why.rise_ft_30m).toBe(3.9); expect(why.tau_min % 5).toBe(0);
  });
  test('the window always comes from the fixed buckets', () => {
    for (let asOf = 70; asOf <= 100; asOf += 5) { const r = run(RISING, asOf); if (r.window) expect(ALLOWED.has(r.window.join('-'))).toBe(true); }
  });
});

describe('C §18.5 step 2 · "crossed the trigger recently" keeps AVOID while the wave is in transit', () => {
  // Crossed 6.0 ft at simMin 7.5, peaked, now FALLING (−0.4 ft over 30 min) but still above the trigger.
  const PEAKED: [number, number][] = [[0, 5.0], [15, 7.0], [30, 7.2], [45, 7.0], [60, 6.8]];
  test('above trigger, falling, crossed 62.5 min ago (≤ P75 + 30 = 74) → still AVOID, window starts at 0', () => {
    const r = run(PEAKED, 70);
    expect(r.state).toBe('avoid');
    expect(r.etaLo).toBe(0);                 // the wave is due now: the UI shows "water may already be on the road"
    expect(r.window?.[0]).toBe(0);
    expect(ALLOWED.has(r.window!.join('-'))).toBe(true);
  });
  test('the reason still says UPSTREAM_ABOVE_TRIGGER with rise ≤ 0, so the UI renders the _peaked line', () => {
    const why = run(PEAKED, 70).reasons[0] as Extract<RuleResult['reasons'][number], { code: 'UPSTREAM_ABOVE_TRIGGER' }>;
    expect(why.code).toBe('UPSTREAM_ABOVE_TRIGGER');
    expect(why.rise_ft_30m).toBeLessThanOrEqual(0);
  });
  test('high but flat and crossed long ago (> P75 + 30) → not AVOID, and not WATCH either → no_rise', () => {
    const FLAT_HIGH: [number, number][] = [[0, 7.0], [15, 7.0], [30, 7.0], [45, 7.0], [60, 7.0], [75, 7.0], [90, 7.0], [105, 7.0]];
    expect(run(FLAT_HIGH, 115)).toMatchObject({ state: 'no_rise', reasons: [] });
  });
});

describe('C §18.5 step 5 · an AVOID candidate whose water is still ≥ 90 min away is only WATCH', () => {
  test('long travel time (τ 150 min) → WATCH, no window, reason UPSTREAM_ABOVE_TRIGGER, trigger gauge kept', () => {
    const far: Link = { ...L37, lagMin: 150, lagP25Min: 130, lagP75Min: 170 };
    const r = run(RISING, 70, [far]);
    expect(r).toMatchObject({ state: 'watch', window: null, etaLo: null, etaHi: null, triggerGaugeId: UP });
    expect(r.reasons[0]?.code).toBe('UPSTREAM_ABOVE_TRIGGER');
  });
});

describe('C §18.5 steps 3 + 6 · WATCH when above the watch level and rising more than 0.20 ft / 30 min', () => {
  test('4.7 ft (watch 4.4, trigger 6.0), +1.5 ft over 30 min → WATCH, no window, reason UPSTREAM_RISING', () => {
    const r = run([[0, 2.2], [15, 2.4], [30, 3.2], [45, 4.7]], 55);
    expect(r).toMatchObject({ state: 'watch', window: null, etaLo: null, etaHi: null, triggerGaugeId: UP });
    expect(r.reasons[0]).toMatchObject({ code: 'UPSTREAM_RISING', gauge_id: UP, watch_ft: L37.watchFt, obs_at: 45 });
  });
  test('above the watch level but rising only 0.1 ft / 30 min → no_rise', () => {
    expect(run([[0, 4.5], [15, 4.55], [30, 4.6], [45, 4.65]], 55)).toMatchObject({ state: 'no_rise', reasons: [] });
  });
  test('rising fast but still below the watch level → no_rise', () => {
    expect(run([[0, 2.2], [15, 2.6], [30, 3.4], [45, 4.2]], 55)).toMatchObject({ state: 'no_rise', reasons: [] });
  });
});

describe('C §18.5 step 7 · calm', () => {
  test('flat near baseline → no_rise with no window, no trigger gauge and no reasons', () => {
    expect(run([[0, 2.1], [15, 2.11], [30, 2.1], [45, 2.12], [60, 2.1]], 70))
      .toEqual({ state: 'no_rise', etaLo: null, etaHi: null, window: null, triggerGaugeId: null, reasons: [] });
  });
});

describe('C §18.5 · several links: earliest arrival wins; reasons ordered and capped', () => {
  const near: Link = { ...L37, gaugeId: UP2, lagMin: 20, lagP25Min: 15, lagP75Min: 25 };
  test('two AVOID candidates → the one with the smaller etaLo sets the window and the trigger gauge', () => {
    const r = run(RISING, 70, [L37, near], [[UP2, series(UP2, RISING)]]);
    expect(r.state).toBe('avoid');
    expect(r.triggerGaugeId).toBe(UP2);
    expect(r.reasons.map((x) => ('gauge_id' in x ? x.gauge_id : null))).toEqual([UP2, UP]);   // AVOID reasons first, smallest etaLo first
  });
  test('an AVOID candidate and a WATCH candidate → AVOID reasons come before WATCH reasons', () => {
    const watchOnly: [number, number][] = [[0, 2.2], [15, 2.4], [30, 3.2], [45, 4.7], [60, 5.4]];   // 5.4: above 4.4, below 6.0
    const r = run(RISING, 70, [{ ...L37, gaugeId: UP2 }, L37], [[UP2, series(UP2, watchOnly)]]);
    expect(r.state).toBe('avoid');
    expect(r.reasons.map((x) => x.code)).toEqual(['UPSTREAM_ABOVE_TRIGGER', 'UPSTREAM_RISING']);
  });
  test('never more than 3 reasons', () => {
    const ids = ['USGS-08158970', 'USGS-08158700', 'USGS-08158800'];
    const links = [L37, ...ids.map((gaugeId) => ({ ...L37, gaugeId }))];
    const r = run(RISING, 70, links, ids.map((id) => [id, series(id, RISING)] as [string, Reading[]]));
    expect(r.reasons.length).toBe(3);
  });
});

describe('properties over a whole simulated storm (flash-flood-night, every 5 min)', () => {
  const s = SCENARIOS.find((x) => x.id === 'flash-flood-night')!;
  const fns = buildStageFns(GAUGES, s.curves);
  const all = new Map(GAUGES.map((g) => [g.id, buildReadings(g, fns.get(g.id)!, s.curves, s.outages, -420, s.durationMin, s.seed)]));
  test('every non-no_rise result carries ≥ 1 reason and every window is from the buckets', () => {
    for (const c of CROSSINGS) {
      const links = LINKS.filter((l) => l.crossingId === c.id);
      for (let t = 0; t <= s.durationMin; t += 5) {
        const r = evaluate(c, links, new Map([...all].map(([id, rs]) => [id, visible(rs, t)])), gauges, t);
        if (r.state !== 'no_rise') expect(r.reasons.length).toBeGreaterThan(0);
        if (r.window) expect(ALLOWED.has(r.window.join('-'))).toBe(true);
        if (r.state === 'avoid') expect(r.window).not.toBeNull();
      }
    }
  });
  test('deterministic: the same input gives the same result, reasons in the same order', () => {
    const at70 = new Map([...all].map(([id, rs]) => [id, visible(rs, 70)]));
    expect(evaluate(hero, [L37], at70, gauges, 70)).toEqual(evaluate(hero, [L37], at70, gauges, 70));
  });
});
