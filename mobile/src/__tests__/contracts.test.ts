import { describe, expect, test } from '@jest/globals';
import { allowedWindows, effectiveRisk, parseRisk, RiskSchema, unknownRisk } from '../lib/risk';
import en from '../locales/en.json';
import es from '../locales/es.json';
import { crossings, history } from '../lib/data';

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
  test('unverified inventory never implies monitoring', () => {
    expect(crossings.length).toBeGreaterThan(0);
    expect(
      crossings.every((f) => f.properties.tier === 'C' && f.properties.state === 'unknown'),
    ).toBe(true);
    expect(new Set(crossings.map((f) => f.properties.id)).size).toBe(crossings.length);
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

describe('copy integrity', () => {
  test('English and Spanish have matching keys and interpolation variables', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect((es[key].match(/\{\{[^}]+\}\}/g) ?? []).sort()).toEqual(
        (en[key].match(/\{\{[^}]+\}\}/g) ?? []).sort(),
      );
    }
  });
  test('safety-sensitive copy has no reassurance except the approved pledge negation', () => {
    for (const locale of [en, es])
      for (const [key, value] of Object.entries(locale)) {
        if (key === 'onboarding.pledge.item3') continue;
        expect(value).not.toMatch(/\b(safe|passable|all.clear|seguro|transitable)\b/i);
      }
  });
});
