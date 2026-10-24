// mobile/src/__tests__/demo-player-test.ts — player frames, beats and results (§26, §22.7).
import { compiledFor } from '../demo/scenario/source';   // golden or live (§23.6); ★ logic is tested in demo-engine-test
import { autoSlowWindows, beatMinutes } from '../demo/scenario/choreography';
import { noDataBands, pulseProgress, scrubberTicks, storyResults, visibleSeries } from '../demo/scenario/player';
import { SCENARIOS } from '../demo/scenario/scenarios';

const ffn = compiledFor(SCENARIOS.find((s) => s.id === 'flash-flood-night')!);
const onion = compiledFor(SCENARIOS.find((s) => s.id === 'onion-creek-storm')!);

test('hydrograph never shows a reading before it was delivered (no lookahead)', () => {
  for (const t of [0, 55, 70, 101, 250]) for (const r of visibleSeries(ffn, 'USGS-08158922', t)) expect(r.availMin).toBeLessThanOrEqual(t);
  expect(visibleSeries(ffn, 'USGS-08158922', 70).at(-1)).toMatchObject({ obsMin: 60, ft: 7.14 });
});
test('beats and auto-slow windows are derived from events', () => {
  expect(beatMinutes(ffn)).toEqual([55, 70, 85, 100, 115, 120]);
  expect(autoSlowWindows(ffn).map((w) => [w.fromMin, w.toMin])).toEqual([[50, 60], [65, 75], [80, 90], [95, 105], [110, 125]]);
});
test('results: 30 min lead, median 30 over 3, closure gap 50, inside the first window', () => {
  expect(storyResults(ffn)).toMatchObject({ crossingId: 'atx-37', leadMin: 30, n: 3, medianLeadMin: 30, closureGapMin: 50,
    firstWindow: [15, 30], inFirstWindow: true });
  expect(storyResults(onion)).toMatchObject({ crossingId: 'tc-68', leadMin: 35, n: 3, medianLeadMin: 35, closureGapMin: null });
});
test('pulse starts at the trigger crossing and ends after one median τ; ticks include ▲ ◆ ▮ ●', () => {
  expect(pulseProgress(ffn, 'atx-37', 50)).toBeNull();
  const p = pulseProgress(ffn, 'atx-37', 75)!; expect(p).toBeGreaterThan(0); expect(p).toBeLessThan(1);
  expect(pulseProgress(ffn, 'atx-37', 100)).toBe(1);
  expect(scrubberTicks(ffn, 'atx-37').map((k) => `${k.kind}@${k.t}`)).toEqual(['watch@55', 'avoid@70', 'water@100', 'closed@120']);
});
test('gauge-silent band on the Twin Creeks gauge', () => {
  const b = noDataBands(onion, 'USGS-08158827', 300); expect(b.length).toBe(1); expect(b[0]!.fromMin).toBeLessThanOrEqual(290);
  expect(scrubberTicks(onion, 'tc-1626').some((k) => k.kind === 'gap')).toBe(true);
  expect(scrubberTicks(onion, 'tc-1626').some((k) => k.kind === 'unknown' && k.t === 290)).toBe(true);
});
