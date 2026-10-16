// mobile/src/demo/scenario/display.ts — what a screen shows at simT, given the compiled timeline + client connectivity.
// Pure. Implements A §3.4 (check age vs reading age, 10–20 min aging, > 20 min ⇒ every crossing UNKNOWN + "Last known").
import type { Compiled } from './compile';
import { stateAt } from './compile';
import { GAUGES, LINKS } from '../data/demo-data';
import type { DemoEvent, Wire } from '../engine/types';

export type Net = { t: number; online: boolean }[];
export type DisplayRisk = { crossingId: string; state: Wire; window: [number, number] | null; held: boolean; reasons: DemoEvent['reasons'];
  lastKnown: { state: Wire; ageMin: number } | null; checkAgeMin: number; newestReadingAgeMin: number | null;
  freshness: 'fresh' | 'aging' | 'offline' };

/** Last 5-min tick at which the phone could "check" (online), ≤ simT. */
export function lastCheckAt(simT: number, net: Net): number {
  const tick = Math.floor(simT / 5) * 5;
  for (let t = tick; t >= -60; t -= 5) { const k = [...net].reverse().find((n) => n.t <= t); if (!k || k.online) return t; }
  return -60;
}
export function displayAt(cmp: Compiled, crossingId: string, simT: number, net: Net): DisplayRisk {
  const checkAt = lastCheckAt(simT, net); const checkAgeMin = simT - checkAt;
  const ev = stateAt(cmp, crossingId, checkAt);                                 // what the phone last received
  const prim = LINKS.find((l) => l.crossingId === crossingId && l.isPrimary);
  const rs = prim ? cmp.readings.get(prim.gaugeId)!.filter((r) => r.availMin <= checkAt) : [];
  const newestReadingAgeMin = rs.length ? simT - rs.at(-1)!.obsMin : null;
  const freshness = checkAgeMin > 20 ? 'offline' : checkAgeMin > 10 ? 'aging' : 'fresh';
  if (freshness === 'offline') {                                                // A §3.4: never a calm look on old data
    const lk = ev.state === 'unknown' ? ev.lastKnown?.state ?? null : ev.state;
    return { crossingId, state: 'unknown', window: null, held: false, reasons: [], checkAgeMin, newestReadingAgeMin, freshness,
      lastKnown: lk && lk !== 'no_rise' ? { state: lk, ageMin: checkAgeMin } : null };
  }
  const stale = ev.reasons.find((r) => r.code === 'DATA_STALE');
  const lastObs = stale && 'last_obs_at' in stale ? stale.last_obs_at : null;
  return { crossingId, state: ev.state, window: ev.window, held: ev.held, reasons: ev.reasons, checkAgeMin, newestReadingAgeMin, freshness,
    lastKnown: ev.state === 'unknown' && ev.lastKnown ? { state: ev.lastKnown.state, ageMin: lastObs != null ? simT - lastObs : simT - ev.lastKnown.at } : null };
}
export const gaugeOf = (id: string) => GAUGES.find((g) => g.id === id)!;
