// mobile/src/__tests__/demo-engine-test.ts — the forecast rule, windows, state machine, determinism, truth isolation (§28.1).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tauRange, toWindow } from '../demo/engine/engine';
import { RANK } from '../demo/engine/types';
import { compileScenario } from '../demo/scenario/compile';
import { SCENARIOS } from '../demo/scenario/scenarios';
import { eventsHash } from '../demo/scenario/choreography';

const byId = (id: string) => SCENARIOS.find((s) => s.id === id)!;

test('C §18.6 window examples', () => {
  expect(toWindow(10, 20)).toEqual([0, 30]); expect(toWindow(16, 70)).toEqual([15, 60]);
  expect(toWindow(40, 45)).toEqual([30, 60]); expect(toWindow(95, 120)).toBeNull();
});
test('A §3.5 rule 8 travel range (never one number, never starts at 0)', () => {
  expect(tauRange({ lagMin: 38, lagP25Min: 33, lagP75Min: 44, nStorms: 5 })).toEqual([30, 45]);
  expect(tauRange({ lagMin: 10, lagP25Min: 6, lagP75Min: 14, nStorms: 2 })[0]).toBeGreaterThanOrEqual(5);
});
test('windows only from the allowed set', () => {
  const ok = new Set(['0-15', '15-30', '30-60', '60-90', '0-30', '15-60', '30-90']);
  for (const s of SCENARIOS) for (const e of compileScenario(s).events) if (e.window) expect(ok.has(e.window.join('-'))).toBe(true);
});
test('never ≥ AVOID → NO_RISE directly; de-escalation one level at a time', () => {
  for (const s of SCENARIOS) {
    const c = compileScenario(s);
    for (const id of new Set(c.events.map((e) => e.crossingId))) {
      let prev = c.initial.get(id)!.state;
      for (const e of c.events.filter((x) => x.crossingId === id)) {
        if (e.state === 'no_rise') expect(['no_rise', 'unknown', 'watch']).toContain(prev);
        if (RANK[e.state] < RANK[prev] && prev !== 'unknown' && e.state !== 'unknown')
          expect(RANK[prev] - RANK[e.state]).toBeLessThanOrEqual(prev === 'watch' ? 2 : 1);   // watch→no_rise skips 'unknown' rank
        prev = e.state;
      }
    }
  }
});
test('every non-no_rise state carries ≥ 1 reason', () => {
  for (const s of SCENARIOS) for (const e of compileScenario(s).events) if (e.state !== 'no_rise') expect(e.reasons.length).toBeGreaterThan(0);
});
test('deterministic: compile twice → identical events and hash', () => {
  for (const s of SCENARIOS) {
    const a = compileScenario(s), b = compileScenario(s);
    expect(JSON.stringify(a.events)).toBe(JSON.stringify(b.events)); expect(eventsHash(a)).toBe(eventsHash(b));
  }
});
test('truth isolation: nothing in demo/engine imports the simulator', () => {
  const dir = join(__dirname, '../demo/engine');
  for (const f of readdirSync(dir)) expect(readFileSync(join(dir, f), 'utf8')).not.toMatch(/from ['"][./]*\/?sim\//);
});
test('hero beats (flash-flood-night)', () => {
  const c = compileScenario(byId('flash-flood-night')); const j = c.events.filter((e) => e.crossingId === 'atx-37');
  expect(j[0]).toMatchObject({ t: 55, state: 'watch' });
  expect(j[1]).toMatchObject({ t: 70, state: 'avoid', window: [15, 30] });
  expect(j.find((e) => e.state === 'closed')!.t).toBe(120);
  expect(c.onsets.get('atx-37')).toBe(100);
  expect(c.hero).toMatchObject({ crossingId: 'atx-37', leadMin: 30, inFirstWindow: true });
  expect(c.medianLead).toBe(30);
  expect(c.leads.every((l) => l.inFirstWindow)).toBe(true);
});
test('gauge-silent UNKNOWN (onion-creek-storm); tier B never counts toward leads', () => {
  const c = compileScenario(byId('onion-creek-storm')); const b = c.events.filter((e) => e.crossingId === 'tc-1626');
  const u = b.find((e) => e.state === 'unknown')!; expect(u.t).toBe(290); expect(u.lastKnown?.state).toBe('avoid');
  expect(c.hero).toMatchObject({ crossingId: 'tc-68', leadMin: 35 }); expect(c.medianLead).toBe(35);
  expect(c.leads.map((l) => l.crossingId)).not.toContain('hays-663');
});
test('calm evening: zero events; tier C is UNKNOWN (not monitored), never calm', () => {
  const c = compileScenario(byId('calm-evening'));
  expect(c.events).toEqual([]);
  expect(c.initial.get('tc-85')!.state).toBe('unknown'); expect(c.initial.get('atx-37')!.state).toBe('no_rise');
});
test('compile budget (CI machine; the iPhone budget is 10× this, checked on device in §28.3)', () => {
  for (const s of SCENARIOS) { const a = performance.now(); compileScenario(s); expect(performance.now() - a).toBeLessThan(100); }
});
