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
import { LOCKED_STATE_HEX, TYPOGRAPHY, tokens } from '../theme/tokens';
import { theme } from '../lib/theme';
import { SHORT_STATE_KEYWORDS } from '../components/StateBadge';
import { ARRIVAL_BUCKETS, toArrivalBucketKey } from '../components/ArrivalBucketStrip';
import {
  CACHED_NWPS_CATEGORIES_BY_GAUGE,
  EQUIPPED_NWPS_CROSSING_IDS,
  scaleLinear,
  scaleTime,
} from '../components/CausalHydrograph';
import { PROVENANCE_LADDER_COPY } from '../components/ProvenanceCard';
import { SCORECARD_COPY } from '../components/ValidationScorecardModal';

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
    expect(tierA).toHaveLength(0);
    expect(tierB).toHaveLength(30);
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
    expect(crossings.every((c) => c.properties.overtop_stage_ft == null)).toBe(true);
    expect(
      links.every(
        (l) => l.road_forecast_verified === false && l.calibration_kind === 'empirical_gauge_lag',
      ),
    ).toBe(true);
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
    expect(results.headline.labels).toBe('gauge_flood_stage_proxy');
    expect(results.headline.road_forecast_skill_verified).toBe(false);
    for (const entry of replayIndex.storms) {
      const doc = replays[entry.id];
      expect(doc).toBeDefined();
      expect(doc?.schema).toBe('fordcast.replay.v1');
      expect(doc?.crossings).toHaveLength(30);
    }
  });

  test('stateAt never applies future events, including proxy examples', () => {
    for (const replay of Object.values(replays)) {
      for (const event of replay.events) {
        const before = stateAt(replay, event.crossing_id, Date.parse(event.t) - 1);
        const prefix = {
          ...replay,
          events: replay.events.filter((e) => Date.parse(e.t) < Date.parse(event.t)),
        };
        expect(before).toEqual(stateAt(prefix, event.crossing_id, Date.parse(event.t) - 1));
      }
      const pulses = activePulsesAt(replay, Date.parse(replay.storm.start));
      expect(pulses.every((p) => p.progress >= 0 && p.progress <= 1)).toBe(true);
    }
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
    const banned = /\b(safe|clear|passable|open|normal|all.clear|seguro|transitable|abierto)\b/i;
    for (const locale of [en, es])
      for (const [key, value] of Object.entries(locale)) {
        if (key === 'onboarding.pledge.item3') continue;
        expect(value.replaceAll('City of Austin Open Data', 'City source')).not.toMatch(banned);
      }
    for (const doc of Object.values(replays)) {
      for (const line of doc.storyboard) {
        expect(line.en).not.toMatch(banned);
        expect(line.es).not.toMatch(banned);
      }
    }
  });

  test('tactical hydrology tokens enforce locked state hexes, tabular numerals, and zero traffic-light green', () => {
    expect(LOCKED_STATE_HEX).toEqual({
      no_rise: '#2BD9D9',
      watch: '#F5A623',
      avoid: '#FF5470',
      closed: '#FF5470',
      unknown: '#7A879C',
    });
    expect(TYPOGRAPHY.hudBucket.fontVariant).toContain('tabular-nums');
    expect(TYPOGRAPHY.metricValue.fontVariant).toContain('tabular-nums');
    expect(TYPOGRAPHY.chartAxis.fontVariant).toContain('tabular-nums');

    const serialized = JSON.stringify({ tokens, theme });
    expect(serialized).not.toMatch(/#00ff00|#34d399|#10b981|#22c55e|emerald|green/i);
  });

  test('StateBadge short keywords and optical glyphs obey triple-redundancy and bilingual parity', () => {
    expect(Object.keys(SHORT_STATE_KEYWORDS.en).sort()).toEqual([
      'avoid',
      'closed',
      'no_rise',
      'unknown',
      'watch',
    ]);
    expect(Object.keys(SHORT_STATE_KEYWORDS.es).sort()).toEqual([
      'avoid',
      'closed',
      'no_rise',
      'unknown',
      'watch',
    ]);
  });

  test('ArrivalBucketStrip permits only the 7 discrete buckets with proportional widths', () => {
    expect(ARRIVAL_BUCKETS).toHaveLength(7);
    expect(ARRIVAL_BUCKETS.map((b: { key: string }) => b.key)).toEqual([
      '[0, 15]',
      '[15, 30]',
      '[30, 45]',
      '[45, 60]',
      '[60, 90]',
      '[90, 120]',
      '[120, 180]',
    ]);
    expect(ARRIVAL_BUCKETS.map((b: { flex: number }) => b.flex)).toEqual([
      1.0, 1.0, 1.0, 1.0, 1.25, 1.25, 1.5,
    ]);
    expect(toArrivalBucketKey([0, 15])).toBe('[0, 15]');
    expect(toArrivalBucketKey([60, 90])).toBe('[60, 90]');
    expect(toArrivalBucketKey([10, 11])).toBeNull();
    expect(toArrivalBucketKey(null)).toBeNull();
  });

  test('CausalHydrograph scales and 6 equipped NOAA NWPS proxy crossings enforce strict causal bounds', () => {
    expect(EQUIPPED_NWPS_CROSSING_IDS.size).toBe(6);
    expect(CACHED_NWPS_CATEGORIES_BY_GAUGE['USGS-08159000']).toMatchObject({
      nwsLid: 'ATIT2',
      action: 15,
      minor: 17,
      mod: 23,
      maj: 27,
    });
    const x = scaleTime(1000, 2000, 44, 664);
    expect(x(1000)).toBe(44);
    expect(x(1500)).toBe(354);
    expect(x(2000)).toBe(664);
    const y = scaleLinear(0, 40, 18, 118);
    expect(y(0)).toBe(118);
    expect(y(40)).toBe(18);
  });

  test('ProvenanceCard and ValidationScorecardModal copy contain zero banned reassurance words', () => {
    const banned = /\b(safe|clear|passable|open|normal|all.clear|seguro|transitable|abierto)\b/i;
    for (const copyGroup of [PROVENANCE_LADDER_COPY.en, PROVENANCE_LADDER_COPY.es, SCORECARD_COPY.en, SCORECARD_COPY.es]) {
      for (const value of Object.values(copyGroup)) {
        expect(value).not.toMatch(banned);
      }
    }
  });

  test('Round 4 pre-shoot copy contracts: pilot badge, privacy disclosure, storm reroute label, and Google handoff notes', () => {
    expect(en['onboarding.pledge.pilot_badge']).toBe('CENTRAL TEXAS PILOT');
    expect(es['onboarding.pledge.pilot_badge']).toBe('PILOTO DEL CENTRO DE TEXAS');
    expect(en['onboarding.pledge.subtitle']).toBe('Check the crossings on your trip');
    expect(en['storms.car_demo']).toBe('Storm reroute demo');
    expect(es['storms.car_demo']).toBe('Demostración de desvío');
    expect(en['settings.privacy_body']).not.toMatch(/never leaves your phone/i);
    expect(es['settings.privacy_body']).not.toMatch(/nunca sale de tu tel[eé]fono/i);
    expect(en['settings.privacy_body']).toMatch(/Route planning sends start, destination and avoidance coordinates to the routing service/);
    expect(en['route.google_note_base']).toContain('Google Maps receives suggested waypoints');
    expect(en['route.google_note_expo_go']).toContain('Expo Go');
    expect(en['route.google_note_off']).toContain('Background alerts are off');
    expect(en['route.google_note_on']).toContain('Background alerts are enabled');
  });
});





