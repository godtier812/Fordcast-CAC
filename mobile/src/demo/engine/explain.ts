// mobile/src/demo/engine/explain.ts — travel time shown as a range, never one number (C §18.10, A §3.5 rule 8).
// Ported as-is from docs/demo-prompt/05-code (05 §23.2, split per §23.6). PURE: no I/O, no Date.now(), no imports from ../sim.
import type { Link } from './types';

export function tauRange(l: Pick<Link, 'lagMin' | 'lagP25Min' | 'lagP75Min' | 'nStorms'>): [number, number] {
  const p25 = l.nStorms === 1 ? l.lagMin - 10 : l.lagP25Min;
  const p75 = l.nStorms === 1 ? l.lagMin + 10 : l.lagP75Min;
  let lo = 15 * Math.floor(p25 / 15); let hi = 15 * Math.ceil(p75 / 15);
  if (hi - lo < 15) hi = lo + 15;
  if (lo < 5) lo = 5;                                                       // a travel range never starts at 0
  return [lo, hi];
}
