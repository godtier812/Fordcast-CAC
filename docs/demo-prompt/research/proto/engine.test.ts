import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { toWindow, tauRange } from './engine';
import { compileScenario } from './compile';
import { SCENARIOS } from './scenarios';
import { RANK } from './types';

test('C §18.6 window examples', () => {
  expect(toWindow(10, 20)).toEqual([0, 30]); expect(toWindow(16, 70)).toEqual([15, 60]);
  expect(toWindow(40, 45)).toEqual([30, 60]); expect(toWindow(95, 120)).toBeNull();
});
test('A §3.5 rule 8 travel range', () => {
  expect(tauRange({ lagMin: 38, lagP25Min: 33, lagP75Min: 44, nStorms: 5 })).toEqual([30, 45]);
  expect(tauRange({ lagMin: 10, lagP25Min: 6, lagP75Min: 14, nStorms: 2 })[0]).toBeGreaterThanOrEqual(5);
});
test('windows only from the allowed set', () => {
  const ok = new Set(['0-15', '15-30', '30-60', '60-90', '0-30', '15-60', '30-90']);
  for (const s of SCENARIOS) for (const e of compileScenario(s).events) if (e.window) expect(ok.has(e.window.join('-'))).toBe(true);
});
test('never ≥ WATCH → NO_RISE directly; de-escalation one level at a time', () => {
  for (const s of SCENARIOS) { const c = compileScenario(s);
    for (const id of new Set(c.events.map((e) => e.crossingId))) {
      let prev = c.initial.get(id)!.state;
      for (const e of c.events.filter((x) => x.crossingId === id)) {
        if (e.state === 'no_rise') expect(['no_rise', 'unknown', 'watch']).toContain(prev);
        if (RANK[e.state] < RANK[prev] && prev !== 'unknown' && e.state !== 'unknown') expect(RANK[prev] - RANK[e.state]).toBeLessThanOrEqual(prev === 'watch' ? 2 : 1);
        prev = e.state; } } }
});
test('every non-no_rise state carries ≥ 1 reason', () => {
  for (const s of SCENARIOS) for (const e of compileScenario(s).events) if (e.state !== 'no_rise') expect(e.reasons.length).toBeGreaterThan(0);
});
test('deterministic', () => { for (const s of SCENARIOS) expect(JSON.stringify(compileScenario(s).events)).toBe(JSON.stringify(compileScenario(s).events)); });
test('truth isolation: engine never imports the simulator', () => {
  expect(readFileSync(new URL('./engine.ts', import.meta.url), 'utf8')).not.toMatch(/from '\.\/sim'/);
});
test('hero beats (flash-flood-night)', () => {
  const c = compileScenario(SCENARIOS[1]!); const j = c.events.filter((e) => e.crossingId === 'atx-37');
  expect(j[0]).toMatchObject({ t: 55, state: 'watch' }); expect(j[1]).toMatchObject({ t: 70, state: 'avoid', window: [15, 30] });
  expect(j.find((e) => e.state === 'closed')!.t).toBe(120); expect(c.onsets.get('atx-37')).toBe(100);
  expect(c.hero).toMatchObject({ crossingId: 'atx-37', leadMin: 30, inFirstWindow: true }); expect(c.medianLead).toBe(30);
});
test('gauge-silent UNKNOWN (onion-creek-storm)', () => {
  const c = compileScenario(SCENARIOS[2]!); const b = c.events.filter((e) => e.crossingId === 'tc-1626');
  const u = b.find((e) => e.state === 'unknown')!; expect(u.t).toBe(290); expect(u.lastKnown?.state).toBe('avoid');
  expect(c.hero).toMatchObject({ crossingId: 'tc-68', leadMin: 35 }); expect(c.medianLead).toBe(35);
});
