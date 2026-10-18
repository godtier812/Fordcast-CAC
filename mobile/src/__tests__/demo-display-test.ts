// mobile/src/__tests__/demo-display-test.ts — A §3.4 freshness on the phone (check age vs reading age).
import { compiledFor } from '../demo/scenario/source';   // golden or live (§23.6); ★ logic is tested in demo-engine-test
import { displayAt } from '../demo/scenario/display';
import { SCENARIOS } from '../demo/scenario/scenarios';

const byId = (id: string) => SCENARIOS.find((s) => s.id === id)!;
const ffn = compiledFor(byId('flash-flood-night'));
test('online: shows the engine state', () => {
  expect(displayAt(ffn, 'atx-37', 72, [{ t: 0, online: true }])).toMatchObject({ state: 'avoid', window: [15, 30], freshness: 'fresh' });
});
test('offline 12 min → aging, same state; offline 25 min → UNKNOWN + last known AVOID', () => {
  const net = [{ t: 0, online: true }, { t: 71, online: false }];
  expect(displayAt(ffn, 'atx-37', 82, net)).toMatchObject({ state: 'avoid', freshness: 'aging' });
  expect(displayAt(ffn, 'atx-37', 95, net)).toMatchObject({ state: 'unknown', freshness: 'offline', lastKnown: { state: 'avoid' } });
});
test('calm + offline → UNKNOWN without a last-known badge (never a calm look)', () => {
  const calm = compiledFor(byId('calm-evening'));
  expect(displayAt(calm, 'atx-37', 60, [{ t: 0, online: true }, { t: 30, online: false }])).toMatchObject({ state: 'unknown', lastKnown: null });
});
test('gauge-silent last-known age uses the last observation, not the tick', () => {
  const st = compiledFor(byId('onion-creek-storm'));
  const d = displayAt(st, 'tc-1626', 300, [{ t: 0, online: true }]);
  expect(d.state).toBe('unknown'); expect(d.lastKnown).toEqual({ state: 'avoid', ageMin: 60 });
});
