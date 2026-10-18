// mobile/src/demo/engine/windows.ts — risk windows snapped to the fixed buckets 0–15 / 15–30 / 30–60 / 60–90 (C §18.6).
// Ported as-is from docs/demo-prompt/05-code (05 §23.2, split per §23.6). PURE: no I/O, no Date.now(), no imports from ../sim.
import type { Window } from './types';

export const BUCKETS: Window[] = [[0, 15], [15, 30], [30, 60], [60, 90]];
export const HORIZON_MIN = 90;
const bucketIndex = (m: number) => { for (let k = 0; k < BUCKETS.length; k++) if (m < BUCKETS[k]![1]) return k; return BUCKETS.length - 1; };
export function toWindow(etaLo: number, etaHi: number): Window | null {
  const lo = Math.max(0, etaLo);
  if (lo >= HORIZON_MIN) return null;
  const hi = Math.min(Math.max(lo, etaHi), HORIZON_MIN - 1e-9);
  const i = bucketIndex(lo); const j = Math.min(bucketIndex(hi), i + 1);
  return [BUCKETS[i]![0], BUCKETS[j]![1]];
}
