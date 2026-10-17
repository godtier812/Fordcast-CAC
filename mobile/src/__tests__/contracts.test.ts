import { describe, expect, test } from '@jest/globals';
import { allowedWindows, effectiveRisk, parseRisk, RiskSchema, unknownRisk } from '../lib/risk';
import en from '../locales/en.json';
import es from '../locales/es.json';
import {
  activePulsesAt,
  crossings,
  gauges,
  history,
  initialLockoutState,
  links,
  replayIndex,
  replays,
  results,
  stateAt,
  stepLockout,
  visibleSamples,
} from '../lib/data';

describe('honest state contracts', () => {
  const at = '2026-10-16T12:00:00Z';
  const risk = {
    ...unknownRisk('c'),
    state: 'avoid' as const,
    tier: 'A' as const,
    window: [15, 30] as [number, number],
    reasons: [{ code: 'UPSTREAM_ABOVE_TRIGGER' }],
  };
  test('snapshot expiry keeps the previous warning and removes the forecast window', () => {
    expect(effectiveRisk(risk, at, 'live', Date.parse(at) + 1200000).state).toBe('avoid');
    const expired = effectiveRisk(risk, at, 'live', Date.parse(at) + 1200001);
    expect(expired.state).toBe('unknown');
    expect(expired.window).toBeNull();
    expect(expired.last_known?.state).toBe('avoid');
  });
  test('bad and retired wire states degrade individually', () => {
    expect(parseRisk({ ...risk, state: 'safe' }, 'c').state).toBe('unknown');
    expect(parseRisk({ ...risk, state: 'no_signal' }, 'c').state).toBe('unknown');
    expect(parseRisk(risk, 'another').state).toBe('unknown');
    expect(parseRisk(risk, 'c').state).toBe('avoid');
  });
  test('only the seven conservative windows are accepted', () => {
    expect(allowedWindows).toHaveLength(7);
    expect(RiskSchema.safeParse({ ...risk, window: [10, 11] }).success).toBe(false);
    expect(RiskSchema.safeParse({ ...risk, state: 'closed' }).success).toBe(false);
  });
  test('inventory tiers A, B, and C obey verification and link contracts', () => {
    expect(crossings).toHaveLength(141);
    expect(gauges).toHaveLength(19);
    const tierA = crossings.filter((f) => f.properties.tier === 'A');
    const tierB = crossings.filter((f) => f.properties.tier === 'B');
    const tierC = crossings.filter((f) => f.properties.tier === 'C');
    expect(tierA).toHaveLength(12);
    expect(tierB).toHaveLength(18);
    expect(tierC).toHaveLength(111);
    expect(
      tierA.every(
        (f) =>
          typeof f.properties.overtop_stage_ft === 'number' &&
          typeof f.properties.target_gauge_id === 'string',
      ),
    ).toBe(true);
    expect(
      tierC.every(
        (f) => f.properties.state === 'unknown' && f.properties.review_status === 'unreviewed',
      ),
    ).toBe(true);
    for (const c of [...tierA, ...tierB]) {
      const cLinks = links.filter((l) => l.crossing_id === c.properties.id);
      expect(cLinks.length).toBeGreaterThan(0);
      expect(cLinks.every((l) => l.tau_lo_min >= 5 && l.tau_hi_min > l.tau_lo_min)).toBe(true);
    }
  });
  test('observation playback is explicitly not a forecast', () => {
    expect(history.forecast_available).toBe(false);
    expect(history.kind).toBe('historical-observations');
    const times = history.points.map((point) => Date.parse(String(point[0])));
    expect(
      times.every((time, i) => Number.isFinite(time) && (i === 0 || time > times[i - 1]!)),
    ).toBe(true);
  });
});

describe('replay and drive pure state machines', () => {
  test('all 5 bundled replays match index and LOSO backtest results', () => {
    expect(replayIndex.storms).toHaveLength(5);
    expect(results.schema).toBe('fordcast.results.v1');
    expect(results.hero.crossing_id).toBe('atx-7');
    expect(results.hero.lead_min).toBe(70);
    for (const entry of replayIndex.storms) {
      const doc = replays[entry.id];
      expect(doc).toBeDefined();
      expect(doc?.schema).toBe('fordcast.replay.v1');
      expect(doc?.crossings).toHaveLength(30);
    }
  });

  test('stateAt resolves hero AVOID alert and USGS-08159000 outage UNKNOWN without lookahead', () => {
    const h2013 = replays['halloween-2013']!;
    // Before watch (2013-10-31T05:00:00Z), atx-7 is no_rise
    expect(stateAt(h2013, 'atx-7', Date.parse('2013-10-31T05:00:00Z')).state).toBe('no_rise');
    // At hero alert time (2013-10-31T06:15:00Z), atx-7 is avoid with window [0, 15]
    const alertSlice = stateAt(h2013, 'atx-7', Date.parse('2013-10-31T06:15:00Z'));
    expect(alertSlice.state).toBe('avoid');
    expect(alertSlice.window).toEqual([0, 15]);
    // At 2013-10-31T06:10:00Z, tc-128 transitions to unknown because USGS-08159000 goes silent
    const silentSlice = stateAt(h2013, 'tc-128', Date.parse('2013-10-31T06:10:00Z'));
    expect(silentSlice.state).toBe('unknown');

    // Active river pulses interpolate valid coordinates along flowlines
    const pulses = activePulsesAt(h2013, Date.parse('2013-10-31T06:25:00Z'));
    expect(pulses.length).toBeGreaterThan(0);
    expect(pulses.every((p) => p.progress >= 0 && p.progress <= 1)).toBe(true);
  });

  test('visibleSamples enforces avail_delay_s and hides outage samples until outage.end', () => {
    const h2013 = replays['halloween-2013']!;
    const g183 = h2013.gauges.find((g) => g.id === 'USGS-08159000')!;
    expect(g183.outages).toHaveLength(1);
    // At 2013-10-30T13:00:00Z (1h after t0, with 60m delay), only sample 0 (12:00Z) has arrived
    const early = visibleSamples(g183, Date.parse('2013-10-30T13:00:00Z'));
    expect(early).toHaveLength(1);
    expect(early[0]?.stageFt).toBeCloseTo(5.69, 2);

    // During the documented outage window (simT = 2013-10-31T13:00:00Z < outage.end 13:45Z),
    // samples inside [11:15Z, 13:45Z] that would otherwise be due by 13:00Z are marked inOutage=true
    const midOutage = visibleSamples(g183, Date.parse('2013-10-31T13:00:00Z'));
    const at1130 = midOutage.find((s) => s.iso === '2013-10-31T11:30:00.000Z');
    expect(at1130?.inOutage).toBe(true);
    expect(at1130?.stageFt).toBeNull();
  });

  test('stepLockout locks above 6.7 m/s for 10s and unlocks below 2.2 m/s for 30s or passenger override', () => {
    let st = stepLockout(initialLockoutState, { tMs: 0, speedMps: 8.0 });
    expect(st.locked).toBe(false);
    st = stepLockout(st, { tMs: 9_999, speedMps: 8.0 });
    expect(st.locked).toBe(false);
    st = stepLockout(st, { tMs: 10_000, speedMps: 8.0 });
    expect(st.locked).toBe(true);

    // Slow below 2.2 m/s for 30s -> unlocks
    st = stepLockout(st, { tMs: 20_000, speedMps: 1.0 });
    expect(st.locked).toBe(true);
    st = stepLockout(st, { tMs: 50_000, speedMps: 1.0 });
    expect(st.locked).toBe(false);

    // Passenger override unlocks immediately
    const lockedAgain = stepLockout(stepLockout(initialLockoutState, { tMs: 0, speedMps: 9.0 }), {
      tMs: 12_000,
      speedMps: 9.0,
    });
    expect(lockedAgain.locked).toBe(true);
    const overridden = stepLockout(
      { ...lockedAgain, passengerOverride: true },
      { tMs: 13_000, speedMps: 9.0 },
    );
    expect(overridden.locked).toBe(false);
  });
});

describe('copy integrity', () => {
  test('English and Spanish have matching keys and interpolation variables', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect((es[key].match(/\{\{[^}]+\}\}/g) ?? []).sort()).toEqual(
        (en[key].match(/\{\{[^}]+\}\}/g) ?? []).sort(),
      );
    }
  });
  test('safety-sensitive copy and replay storyboards have no reassurance except pledge negation', () => {
    const banned = /\b(safe|passable|all.clear|seguro|transitable)\b/i;
    for (const locale of [en, es])
      for (const [key, value] of Object.entries(locale)) {
        if (key === 'onboarding.pledge.item3') continue;
        expect(value).not.toMatch(banned);
      }
    for (const doc of Object.values(replays)) {
      for (const line of doc.storyboard) {
        expect(line.en).not.toMatch(banned);
        expect(line.es).not.toMatch(banned);
      }
    }
  });
});
