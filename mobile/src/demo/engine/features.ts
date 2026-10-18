// mobile/src/demo/engine/features.ts — gauge features (C §18.1): newest reading, rise over N minutes, trigger up-crossing,
// freshness. Ported as-is from docs/demo-prompt/05-code (05 §23.2, split per §23.6). PURE: no I/O, no Date.now(), no imports from ../sim.
import type { Reading } from './types';

export const latest = (s: Reading[]) => s[s.length - 1];
export function valueAt(s: Reading[], tMin: number): number | null {     // linear interpolation, ±10 min rule
  for (let i = s.length - 1; i > 0; i--) {
    const a = s[i - 1]!, b = s[i]!;
    if (a.obsMin <= tMin && tMin <= b.obsMin) {
      if (b.obsMin - a.obsMin > 30) return null;                             // never interpolate across a gap > 30 min
      return a.ft + ((b.ft - a.ft) * (tMin - a.obsMin)) / (b.obsMin - a.obsMin);
    }
  }
  const near = s.find((r) => Math.abs(r.obsMin - tMin) <= 10);
  return near ? near.ft : null;
}
export function rise(s: Reading[], minutes: number): number | null {      // anchored on the NEWEST observation
  if (s.length < 2) return null;
  const n = latest(s)!; const v0 = valueAt(s, n.obsMin - minutes);
  return v0 == null ? null : n.ft - v0;
}
export function lastUpcrossingTime(s: Reading[], level: number): number | null {
  if (!s.length) return null;
  if (s.every((r) => r.ft >= level)) return s[0]!.obsMin;                 // above for the whole lookback → earliest bound
  for (let i = s.length - 1; i > 0; i--) {
    const a = s[i - 1]!, b = s[i]!;
    if (a.ft < level && b.ft >= level) return a.obsMin + ((level - a.ft) / (b.ft - a.ft)) * (b.obsMin - a.obsMin);
  }
  return null;
}
export const isFresh = (s: Reading[], asOf: number, staleAfterMin: number) =>
  s.length > 0 && asOf - latest(s)!.obsMin <= staleAfterMin;
