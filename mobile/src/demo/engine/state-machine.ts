// mobile/src/demo/engine/state-machine.ts ★ — student-owned (§1.8 #2): the anti-flapping state machine (C §18.8).
// The four contract exports below are C §18.8's table (agent-written, §23.6). step() is the student's to write;
// the full skeleton, its failing tests and docs/explain/state-machine.md come at pause #2.
import type { RawState, Tracker, Wire } from './types';

// ---------- contract (ticks are 5 min) ----------
export const DWELL: Partial<Record<Wire, number>> = { closed: 6, avoid: 6, watch: 12 };
export const DOWN: Partial<Record<Wire, Wire>> = { closed: 'avoid', avoid: 'watch', watch: 'no_rise' };
export const initialTracker = (): Tracker => ({ state: 'unknown', since: 0, calmTicks: 0, lastKnownState: null, lastKnownAt: null,
  closedSource: null, triggerGaugeId: null, window: null, held: false, reasons: [] });
export type StepCtx = { officialFresh: boolean; officialClosed: boolean; extraOk: (tr: Tracker) => boolean; officialSource: string | null;
  liftedAt: number | null };

export function step(tr: Tracker, raw: RawState, now: number, ctx: StepCtx): Tracker {
  throw new Error('TODO(student)');
}
