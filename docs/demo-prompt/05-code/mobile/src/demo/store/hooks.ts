// mobile/src/demo/store/hooks.ts — read-side hooks. One shared 250 ms ticker; consumers re-render only when THEIR
// granularity changes (minute for labels, 5-min tick for risk), so 120× never floods React.
import { useMemo, useSyncExternalStore } from 'react';
import * as Clock from '../scenario/clock';
import { displayAt, type DisplayRisk } from '../scenario/display';
import { CROSSINGS } from '../data/demo-data';
import { effectiveNet, getCompiled, scenarioById, useDemo } from './demo-store';

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let unsubStore: (() => void) | null = null;
const read = () => Clock.simNow(useDemo.getState().clock, Date.now());
let cur = { minute: Math.floor(read()), tick: Clock.tickOf(read()) };   // cached snapshot: getSnapshot stays pure
function refresh() {
  const m = read(); const next = { minute: Math.floor(m), tick: Clock.tickOf(m) };
  if (next.minute === cur.minute && next.tick === cur.tick) return;
  cur = next; for (const l of listeners) l();
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) { timer = setInterval(refresh, 250); unsubStore = useDemo.subscribe(refresh); }   // seek/pause apply at once
  return () => {
    listeners.delete(cb);
    if (!listeners.size && timer) { clearInterval(timer); timer = null; unsubStore?.(); unsubStore = null; }
  };
}

/** Current sim minute, floored (storm-time label, ages). Re-renders at most once per sim-minute. */
export const useSimMinute = () => useSyncExternalStore(subscribe, () => cur.minute);
/** Current 5-min engine tick (every risk consumer). Re-renders at most once per tick. */
export const useTick = () => useSyncExternalStore(subscribe, () => cur.tick);

export function useNet() {
  const id = useDemo((s) => s.scenarioId); const o = useDemo((s) => s.netOverride);
  return useMemo(() => effectiveNet(scenarioById(id), o), [id, o]);
}
export function useCrossingRisk(crossingId: string): DisplayRisk {
  const id = useDemo((s) => s.scenarioId); const minute = useSimMinute(); const net = useNet();
  return useMemo(() => displayAt(getCompiled(id), crossingId, minute, net), [id, crossingId, minute, net]);
}
export function useAllRisks(): DisplayRisk[] {                    // Map Home markers + AreaStatusCard + nearby list
  const id = useDemo((s) => s.scenarioId); const tick = useTick(); const net = useNet();
  return useMemo(() => CROSSINGS.map((c) => displayAt(getCompiled(id), c.id, tick, net)), [id, tick, net]);
}
/** Labeling state for the FreshnessPill / map frame / accessory (§31 honesty layers). */
export function useScenarioBanner(lang: 'en' | 'es') {
  const id = useDemo((s) => s.scenarioId); const playing = useDemo((s) => s.clock.playing); const minute = useSimMinute();
  const s = scenarioById(id);
  return { active: id !== 'calm-evening', playing, title: s.title[lang], time: Clock.stormTime(s.clockStart, minute, lang) };
}
