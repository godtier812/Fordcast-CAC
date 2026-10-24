// mobile/src/demo/scenario/clock.ts — the ONE scenario clock (Demo Director). Pure + deterministic.
// simMin is a closed-form function of (anchor, wall time), never an accumulation of frame deltas, so it cannot drift,
// is identical across takes, and survives the app being suspended (the store decides what happens on background).
export const SPEEDS = [1, 10, 30, 60, 120] as const;
export type Speed = (typeof SPEEDS)[number];
export type SlowWindow = { fromMin: number; toMin: number };          // D §33.9 "auto-slow to 10×" around key beats
export type ClockState = {
  playing: boolean; speed: Speed; anchorSimMin: number; anchorWallMs: number;
  minMin: number; maxMin: number; autoSlow: SlowWindow[];             // [] = off
};
export const initialClock = (minMin: number, maxMin: number, startMin: number, wallMs: number): ClockState =>
  ({ playing: false, speed: 60, anchorSimMin: startMin, anchorWallMs: wallMs, minMin, maxMin, autoSlow: [] });

/** Advance simMin by wallDtMs at `speed` sim-min per wall-min, at most 10× inside slow windows. Exact, piecewise. */
export function advance(simMin: number, wallDtMs: number, speed: number, slow: SlowWindow[], maxMin: number): number {
  let t = simMin; let wallLeftMin = wallDtMs / 60_000;
  for (let guard = 0; wallLeftMin > 1e-12 && t < maxMin && guard < 64; guard++) {
    const w = slow.find((s) => s.fromMin <= t && t < s.toMin);
    const rate = w && speed > 10 ? 10 : speed;
    const nextEdge = Math.min(maxMin, w && speed > 10 ? w.toMin : Math.min(...slow.filter((s) => s.fromMin > t).map((s) => s.fromMin), Infinity));
    const need = (nextEdge - t) / rate;                                    // wall minutes to reach the next edge
    if (need >= wallLeftMin) { t += wallLeftMin * rate; wallLeftMin = 0; } else { t = nextEdge; wallLeftMin -= need; }
  }
  return Math.min(t, maxMin);
}
export const simNow = (c: ClockState, wallMs: number) =>
  c.playing ? advance(c.anchorSimMin, wallMs - c.anchorWallMs, c.speed, c.autoSlow, c.maxMin) : c.anchorSimMin;
const rebase = (c: ClockState, wallMs: number): ClockState => ({ ...c, anchorSimMin: simNow(c, wallMs), anchorWallMs: wallMs });
export const play = (c: ClockState, wallMs: number): ClockState => ({ ...rebase(c, wallMs), playing: true });
export const pause = (c: ClockState, wallMs: number): ClockState => ({ ...rebase(c, wallMs), playing: false });
export const setSpeed = (c: ClockState, speed: Speed, wallMs: number): ClockState => ({ ...rebase(c, wallMs), speed });
export const seek = (c: ClockState, simMin: number, wallMs: number): ClockState =>
  ({ ...c, anchorSimMin: Math.max(c.minMin, Math.min(c.maxMin, simMin)), anchorWallMs: wallMs });
export const setAutoSlow = (c: ClockState, w: SlowWindow[], wallMs: number): ClockState => ({ ...rebase(c, wallMs), autoSlow: w });
/** Snap to the 5-min engine tick a screen should show (states are step functions; never interpolate). */
export const tickOf = (simMin: number) => Math.floor(simMin / 5) * 5;

/** Storm-time label: clockStart + simMin, floored to the minute (clean-recording rule: no seconds, no wall time). */
export function stormTime(clockStart: { h: number; m: number }, simMin: number, lang: 'en' | 'es'): string {
  const total = ((clockStart.h * 60 + clockStart.m + Math.floor(simMin)) % 1440 + 1440) % 1440;
  const h24 = Math.floor(total / 60), mm = String(total % 60).padStart(2, '0');
  if (lang === 'es') return `${h24 % 12 === 0 ? 12 : h24 % 12}:${mm} ${h24 < 12 ? 'a. m.' : 'p. m.'}`;
  return `${h24 % 12 === 0 ? 12 : h24 % 12}:${mm} ${h24 < 12 ? 'AM' : 'PM'}`;
}
