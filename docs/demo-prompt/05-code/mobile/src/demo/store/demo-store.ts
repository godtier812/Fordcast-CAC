// mobile/src/demo/store/demo-store.ts — the ONE scenario clock + Director state (zustand 5.0.15). Never persisted:
// every launch starts at Calm evening, paused (deterministic takes). Scenario state never enters any other cache.
import { create } from 'zustand';
import * as Clock from '../scenario/clock';
import { autoSlowWindows } from '../scenario/choreography';
import type { Compiled } from '../scenario/compile';
import { SCENARIOS } from '../scenario/scenarios';
import { compiledFor } from '../scenario/source';                // golden fixtures until the Day 6 gate, then live (§23.6)
import type { DemoScenarioV1 } from '../scenario/schema';

export const DEFAULT_SCENARIO = 'calm-evening';
const memo = new Map<string, Compiled>();                        // compiled timelines live OUTSIDE React state
export const scenarioById = (id: string): DemoScenarioV1 => {
  const s = SCENARIOS.find((x) => x.id === id); if (!s) throw new Error(`unknown scenario ${id}`); return s;
};
export const compileMs = new Map<string, number>();              // Director status line (§24.6)
export function getCompiled(id: string): Compiled {
  let c = memo.get(id);
  if (!c) { const t0 = Date.now(); c = compiledFor(scenarioById(id)); compileMs.set(id, Date.now() - t0); memo.set(id, c); }
  return c;
}
export const precompileAll = () => { for (const s of SCENARIOS) getCompiled(s.id); };   // call after first frame

export type Toggles = { clean: boolean; touches: boolean; haptics: boolean; lockout: 'auto' | 'off'; voiceLang: 'app' | 'en' | 'es' };
export type ArmedTake = { notificationId: string; seekToMin: number; route: string };
export type DemoState = Toggles & {
  scenarioId: string;
  clock: Clock.ClockState;
  autoSlowOn: boolean;
  netOverride: { fromMin: number; online: boolean } | null;     // Director "Simulate offline"
  armedTake: ArmedTake | null;
  firedIds: string[];                                           // foreground notifications already posted in this take
  locked: boolean;                                              // driver lockout result (simulated speed), §25.4
  selectScenario: (id: string) => void;
  play: () => void; pause: () => void; seek: (simMin: number) => void; step: (deltaMin: number) => void;
  setSpeed: (s: Clock.Speed) => void; setAutoSlow: (on: boolean) => void; setOffline: (on: boolean) => void;
  setToggle: <K extends keyof Toggles>(k: K, v: Toggles[K]) => void;
  arm: (t: ArmedTake | null) => void; markFired: (id: string) => void; setLocked: (v: boolean) => void;
  resetState: () => void;                                       // pure state part of Director [Reset] (side effects: §24.3)
};

const clockFor = (s: DemoScenarioV1, wallMs: number) => Clock.initialClock(-60, s.durationMin, s.playFromMin, wallMs);
const now = () => Date.now();

export const useDemo = create<DemoState>()((set, get) => ({
  scenarioId: DEFAULT_SCENARIO, clock: clockFor(scenarioById(DEFAULT_SCENARIO), now()), autoSlowOn: true,
  netOverride: null, armedTake: null, firedIds: [], locked: false,
  clean: false, touches: false, haptics: true, lockout: 'auto', voiceLang: 'app',
  selectScenario: (id) => {
    const s = scenarioById(id); const cmp = getCompiled(id); const w = now();
    const c = clockFor(s, w);
    set({ scenarioId: id, clock: get().autoSlowOn ? Clock.setAutoSlow(c, autoSlowWindows(cmp), w) : c,
          netOverride: null, armedTake: null, firedIds: [], locked: false });
  },
  play: () => set({ clock: Clock.play(get().clock, now()) }),
  pause: () => set({ clock: Clock.pause(get().clock, now()) }),
  seek: (m) => set({ clock: Clock.seek(get().clock, m, now()), firedIds: [] }),
  step: (d) => { const w = now(); set({ clock: Clock.seek(get().clock, Clock.simNow(get().clock, w) + d, w) }); },
  setSpeed: (sp) => set({ clock: Clock.setSpeed(get().clock, sp, now()) }),
  setAutoSlow: (on) => {
    const w = now(); const cmp = getCompiled(get().scenarioId);
    set({ autoSlowOn: on, clock: Clock.setAutoSlow(get().clock, on ? autoSlowWindows(cmp) : [], w) });
  },
  setOffline: (on) => set({ netOverride: on ? { fromMin: Clock.simNow(get().clock, now()), online: false } : null }),
  setToggle: (k, v) => set({ [k]: v } as Pick<Toggles, typeof k>),
  arm: (t) => set({ armedTake: t }),
  markFired: (id) => set({ firedIds: [...get().firedIds, id] }),
  setLocked: (v) => set({ locked: v }),
  resetState: () => {
    const s = scenarioById(get().scenarioId); const w = now(); const c = clockFor(s, w);
    set({ clock: get().autoSlowOn ? Clock.setAutoSlow(c, autoSlowWindows(getCompiled(s.id)), w) : c,
          netOverride: null, armedTake: null, firedIds: [], locked: false, lockout: 'auto' });
  },
}));

/** Network timeline the screens use: the scenario's scripted network ⊕ the Director override. */
export function effectiveNet(s: DemoScenarioV1, o: DemoState['netOverride']): { t: number; online: boolean }[] {
  return o ? [...s.network.filter((n) => n.t < o.fromMin), { t: o.fromMin, online: o.online }] : s.network;
}
