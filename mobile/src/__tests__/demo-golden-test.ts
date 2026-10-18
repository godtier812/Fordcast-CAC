// mobile/src/__tests__/demo-golden-test.ts — the live engine (the student's ★ files) must reproduce the reference timelines
// written by tools/gen-golden.ts EXACTLY (01 §1.8, §23.6). Red until all three ★ files pass; green from the Day 6 gate on.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compileScenario } from '../demo/scenario/compile';
import { fromGolden, toGolden, type GoldenV1 } from '../demo/scenario/golden';
import { SCENARIOS } from '../demo/scenario/scenarios';
import { ENGINE_MODE } from '../demo/scenario/source';

const FIX = join(__dirname, '../demo/__fixtures__');
const load = (id: string): GoldenV1 => JSON.parse(readFileSync(join(FIX, `${id}.compiled.json`), 'utf8'));

test('fixtures exist for every scenario (run: npx --yes tsx@4.23.15 tools/gen-golden.ts)', () => {
  for (const s of SCENARIOS) expect(existsSync(join(FIX, `${s.id}.compiled.json`))).toBe(true);
});
test.each(SCENARIOS.map((s) => [s.id, s] as const))('live engine = golden: %s', (_id, s) => {
  const g = load(s.id); const live = toGolden(compileScenario(s));
  expect(live.eventsHash).toBe(g.eventsHash);                       // the quick check; the deep equality below shows WHERE
  expect(JSON.parse(JSON.stringify(live))).toEqual(g);
});
test('golden round trip: fromGolden → toGolden is lossless', () => {
  for (const s of SCENARIOS) { const g = load(s.id); expect(JSON.parse(JSON.stringify(toGolden(fromGolden(s, g))))).toEqual(g); }
});
test('after the Day 6 gate no app file imports __fixtures__', () => {
  if (ENGINE_MODE !== 'live') return;                               // golden mode: source.ts imports them on purpose
  const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? (e.name === '__tests__' || e.name === '__fixtures__' ? [] : walk(join(d, e.name))) : [join(d, e.name)]);
  for (const f of walk(join(__dirname, '..')).filter((x) => /\.(ts|tsx)$/.test(x)))
    expect(readFileSync(f, 'utf8')).not.toMatch(/__fixtures__\//);
});
