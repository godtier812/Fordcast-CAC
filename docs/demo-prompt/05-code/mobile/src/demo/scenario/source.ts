// mobile/src/demo/scenario/source.ts — the ONLY place the app gets a Compiled from (01 §1.8, §23.6). This is the LIVE form
// (from the Day 6 gate on): the student's on-device engine. Until the gate, use the GOLDEN form listed in §23.6.
import { compileScenario, type Compiled } from './compile';
import type { DemoScenarioV1 } from './schema';

export const ENGINE_MODE: 'golden' | 'live' = 'live';
export const compiledFor = (s: DemoScenarioV1): Compiled => compileScenario(s);
