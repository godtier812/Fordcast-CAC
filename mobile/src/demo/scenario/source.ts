// mobile/src/demo/scenario/source.ts — GOLDEN form (Day 2 → Day 6 gate; §23.6). The app gets every Compiled from here.
// Serves the reference timelines written by tools/gen-golden.ts, so the UI never waits for the ★ files.
// At the Day 6 gate: replace this whole file with the LIVE form (§23.6) and keep the fixtures for demo-golden-test only.
import calmEvening from '../__fixtures__/calm-evening.compiled.json';
import driveCommute from '../__fixtures__/drive-commute.compiled.json';
import flashFloodNight from '../__fixtures__/flash-flood-night.compiled.json';
import onionCreekStorm from '../__fixtures__/onion-creek-storm.compiled.json';
import type { Compiled } from './compile';
import { fromGolden, type GoldenV1 } from './golden';
import type { DemoScenarioV1 } from './schema';

export const ENGINE_MODE: 'golden' | 'live' = 'golden';
const GOLDEN: Record<string, GoldenV1> = {
  'calm-evening': calmEvening as unknown as GoldenV1, 'flash-flood-night': flashFloodNight as unknown as GoldenV1,
  'onion-creek-storm': onionCreekStorm as unknown as GoldenV1, 'drive-commute': driveCommute as unknown as GoldenV1,
};
export function compiledFor(s: DemoScenarioV1): Compiled {
  const g = GOLDEN[s.id]; if (!g) throw new Error(`no golden fixture for ${s.id}: run tools/gen-golden.ts`);
  return fromGolden(s, g);
}
