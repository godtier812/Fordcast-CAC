// mobile/src/demo/scenario/schema.ts — the scenario format `fordcast.demo-scenario.v1` (§22.3). Types only.
import type { GaugeCurve, Outage, TruthSpec } from '../sim/sim';
import type { Official, Wire } from '../engine/types';

export type DemoScenarioV1 = {
  schema: 'fordcast.demo-scenario.v1';
  id: string; seed: number; kind: 'live' | 'storm';           // 'live' = drives Map Home; 'storm' = Storms-tab card
  title: { en: string; es: string };
  subtitle?: { en: string; es: string };
  clockStart: { h: number; m: number };                       // storm-time label at t = 0 (America/Chicago wall time)
  durationMin: number; playFromMin: number;                   // Play / "Skip to action" start
  rain: { t: number; inPerHr: number; over: string }[];       // visual context only (rain chip/tint); NEVER changes a state
  curves: GaugeCurve[]; outages: Outage[]; official: Official[];
  network: { t: number; online: boolean }[];                  // scripted connectivity (A §3.4 20-min rule)
  truth: TruthSpec[];                                         // results only; never an engine input
  subscriptions: { crossingIds: string[]; watchAlerts: boolean };
  keyframes: Keyframe[];
  drive?: { route: 'commute' | 'detour'; startSimMin: number; cruiseMps: number; accelS: number; takeDetourAtBranch?: boolean };
};
export type KeyframeAt =
  | { kind: 'min'; t: number }
  | { kind: 'event'; crossingId: string; state: Wire; nth?: number; offsetMin?: number }   // resolved from compiled events
  | { kind: 'onset'; crossingId: string; offsetMin?: number };                            // resolved from truth
export type Keyframe = { id: string; label: string; at: KeyframeAt };
