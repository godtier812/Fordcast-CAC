// mobile/src/demo/scenario/golden.ts — golden fixtures `fordcast.golden.v1` (01 §1.8, §23.6): one compiled timeline as plain
// JSON (Maps → entry arrays; the stage functions are rebuilt from the scenario). Pure. toGolden() is used by
// tools/gen-golden.ts and demo-golden-test; fromGolden() by source.ts while ENGINE_MODE is 'golden'.
import { GAUGES } from '../data/demo-data';
import type { DemoEvent, Reading } from '../engine/types';
import { buildStageFns } from '../sim/sim';
import { eventsHash } from './choreography';
import type { Compiled } from './compile';
import type { DemoScenarioV1 } from './schema';

export type GoldenV1 = {
  schema: 'fordcast.golden.v1'; scenarioId: string; eventsHash: string;
  readings: [string, Reading[]][]; initial: [string, DemoEvent][]; events: DemoEvent[];
  onsets: [string, number | null][]; leads: Compiled['leads']; hero: Compiled['hero']; medianLead: number | null;
};
export function toGolden(c: Compiled): GoldenV1 {
  return { schema: 'fordcast.golden.v1', scenarioId: c.scenario.id, eventsHash: eventsHash(c),
    readings: [...c.readings], initial: [...c.initial], events: c.events, onsets: [...c.onsets],
    leads: c.leads, hero: c.hero, medianLead: c.medianLead };
}
export function fromGolden(s: DemoScenarioV1, g: GoldenV1): Compiled {
  if (g.schema !== 'fordcast.golden.v1' || g.scenarioId !== s.id) throw new Error(`golden fixture mismatch for ${s.id}`);
  return { scenario: s, readings: new Map(g.readings), fns: buildStageFns(GAUGES, s.curves), initial: new Map(g.initial),
    events: g.events, onsets: new Map(g.onsets), leads: g.leads, hero: g.hero, medianLead: g.medianLead };
}
