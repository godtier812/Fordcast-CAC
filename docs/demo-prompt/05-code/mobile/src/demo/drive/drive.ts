// mobile/src/demo/drive/drive.ts — geometry helpers, saved places + routes, simulated drive (Fix stream), driver lockout
// (D §30.6) and the pure Drive Mode speech plan (D §30.5 + §30.7). Dependency-free on purpose (tested in bun/jest);
// the app MAY swap the helpers for @turf/along + @turf/nearest-point-on-line + @turf/length 7.4.0 (same results ± 2 m).
import { CROSSINGS } from '../data/demo-data';
import type { Compiled } from '../scenario/compile';
import { displayAt } from '../scenario/display';
import { RANK, type Wire } from '../engine/types';

export type LngLat = [number, number];
const R = 6371008.8, rad = (d: number) => (d * Math.PI) / 180;
export function dist(a: LngLat, b: LngLat) {
  const dLat = rad(b[1] - a[1]), dLon = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export const lengthM = (line: LngLat[]) => line.slice(1).reduce((s, p, i) => s + dist(line[i]!, p), 0);
export function along(line: LngLat[], m: number): LngLat {
  let acc = 0;
  for (let i = 1; i < line.length; i++) { const d = dist(line[i - 1]!, line[i]!);
    if (acc + d >= m) { const f = d === 0 ? 0 : (m - acc) / d; return [line[i - 1]![0] + f * (line[i]![0] - line[i - 1]![0]), line[i - 1]![1] + f * (line[i]![1] - line[i - 1]![1])]; }
    acc += d; }
  return line.at(-1)!;
}
/** along-distance of the closest point (2 m sampling; the app uses @turf/nearest-point-on-line → properties.totalDistance). */
export function alongOf(line: LngLat[], p: LngLat, stepM = 2): { alongM: number; offM: number } {
  let best = { alongM: 0, offM: Infinity }; const L = lengthM(line);
  for (let m = 0; m <= L; m += stepM) { const d = dist(along(line, m), p); if (d < best.offM) best = { alongM: m, offM: d }; }
  return best;
}

// ---------- saved places + routes (DRAFT geometry: replace with baked road polylines, §21.5) ----------
// Home/School are generic pins (no real address is named). The commute crosses Williamson Creek at Jones Road and then passes
// Manchaca Rd & Jones Rd; the detour shares the commute up to BRANCH and then crosses the creek elsewhere.
const H: LngLat = [-97.8052, 30.2312], P1: LngLat = [-97.8021, 30.2275], BR: LngLat = [-97.80010, 30.22444];
const X37: LngLat = [-97.799438, 30.223421], X692: LngLat = [-97.794067, 30.220797], S: LngLat = [-97.7911, 30.2146];
export const PLACES = {
  home: { id: 'home', label: { en: 'Home', es: 'Casa' }, lngLat: H, radiusM: 1609 },
  school: { id: 'school', label: { en: 'School', es: 'Escuela' }, lngLat: S, radiusM: 1609 },
};
export const ROUTES = {
  commute: { id: 'commute', from: 'home', to: 'school', draft: true, line: [H, P1, BR, X37, X692, S] as LngLat[] },
  detour: { id: 'detour', from: 'home', to: 'school', draft: true,
    line: [H, P1, BR, [-97.7955, 30.2268], [-97.7870, 30.2240], [-97.7860, 30.2170], S] as LngLat[] },
};
export const BRANCH_ALONG_M = alongOf(ROUTES.commute.line, BR).alongM;      // shared prefix ends here
const onRouteCache = new Map<LngLat[], { c: (typeof CROSSINGS)[number]; alongM: number; offM: number }[]>();
/** F49 rule: crossings within 40 m of the line, ordered by along-distance. Computed once per line. */
export function crossingsOnRoute(line: LngLat[], tolM = 40) {
  const hit = onRouteCache.get(line); if (hit) return hit;
  const r = CROSSINGS.map((c) => ({ c, ...alongOf(line, [c.lon, c.lat]) })).filter((x) => x.offM <= tolM).sort((a, b) => a.alongM - b.alongM);
  onRouteCache.set(line, r); return r;
}

// ---------- simulated drive (emits the same Fix shape as the GPS LocationSource) ----------
export type Fix = { t: number /* ms since drive start */; lngLat: LngLat; speed: number; heading: number; route: 'commute' | 'detour'; alongM: number };
export type DriveScript = { route: 'commute' | 'detour'; startSimMin: number; cruiseMps: number; accelS: number;
  takeDetourAtBranch?: boolean };          // the scripted driver turns onto the detour at the branch (nobody touches the phone)
export function* fixes(s: DriveScript, hz = 1): Generator<Fix> {
  let route = s.route; let m = 0;
  for (let k = 0; ; k++) {
    const tS = k / hz;
    if (s.takeDetourAtBranch && route === 'commute' && m >= BRANCH_ALONG_M) route = 'detour';   // shared prefix → same alongM
    const line = ROUTES[route].line; const L = lengthM(line);
    const v = Math.min(s.cruiseMps, (s.cruiseMps * tS) / s.accelS);
    if (m >= L - 1) { yield { t: tS * 1000, lngLat: line.at(-1)!, speed: 0, heading: 0, route, alongM: L }; return; }
    const p = along(line, m), q = along(line, Math.min(L, m + 5));
    yield { t: tS * 1000, lngLat: p, speed: v, heading: (Math.atan2(q[0] - p[0], q[1] - p[1]) * 180) / Math.PI, route, alongM: m };
    m += v / hz;
  }
}

// ---------- driver lockout (D §30.6 stepLockout, verbatim logic) ----------
export type LockoutState = { locked: boolean; fastSince: number | null; slowSince: number | null; passengerTrip: boolean };
export const initialLockout = (): LockoutState => ({ locked: false, fastSince: null, slowSince: null, passengerTrip: false });
export function stepLockout(s: LockoutState, f: { t: number; speed: number | null }): LockoutState {
  const v = f.speed ?? 0;
  if (v >= 4.5) { const fastSince = s.fastSince ?? f.t; return { ...s, fastSince, slowSince: null, locked: !s.passengerTrip && f.t - fastSince >= 5_000 }; }
  if (v < 1) { const slowSince = s.slowSince ?? f.t;
    if (f.t - slowSince >= 180_000) return { locked: false, fastSince: null, slowSince, passengerTrip: false };
    return { ...s, slowSince, fastSince: null }; }
  return { ...s, fastSince: null, slowSince: null };
}

// ---------- Drive Mode speech plan (D §30.5 trigger + §30.7 queue) ----------
export type Utterance = { tS: number; simMin: number; priority: 0 | 1 | 2; chime: 'chime' | 'chime_soft' | null;
  haptic: 'error' | 'warning' | 'soft' | 'light' | null; lines: { key: string; crossingId?: string; count?: number }[] };
const ttsKey = (s: Wire, down: boolean) => down ? 'update.deescalate.tts'
  : s === 'avoid' ? 'state.avoid.tts' : s === 'closed' ? 'state.closed.tts' : s === 'watch' ? 'state.watch.tts' : 'drive.tts.unknown_ahead';
const prio = (s: Wire, down: boolean): 0 | 1 | 2 => down ? 0 : s === 'avoid' || s === 'closed' ? 2 : 1;
export function drivePlan(cmp: Compiled, s: DriveScript) {
  const utter: Utterance[] = []; const lastSpoke = new Map<string, number>(); const heard = new Map<string, Wire>();
  const pending = new Map<string, { state: Wire; down: boolean }>();
  let lock = initialLockout(); let lockoutAtS: number | null = null; let endS = 0; let offlineSpoken = false; let lastHapticS = -1e9;
  const net = cmp.scenario.network; const frames: { tS: number; route: string; ahead: { id: string; state: Wire; m: number }[] }[] = [];
  for (const f of fixes(s)) {
    const tS = f.t / 1000; endS = tS; const simMin = s.startSimMin + tS / 60;      // the risk clock runs at 1× during a drive
    lock = stepLockout(lock, f); if (lock.locked && lockoutAtS == null) lockoutAtS = tS;
    const ahead = crossingsOnRoute(ROUTES[f.route].line).filter((x) => x.alongM > f.alongM + 50);
    const view = ahead.map((x) => ({ x, d: displayAt(cmp, x.c.id, simMin, net) }));
    if (tS % 5 === 0) frames.push({ tS, route: f.route, ahead: view.slice(0, 3).map(({ x, d }) => ({ id: x.c.id, state: d.state, m: Math.round(x.alongM - f.alongM) })) });
    if (!offlineSpoken && view.some(({ d }) => d.freshness === 'offline')) {
      offlineSpoken = true; utter.push({ tS, simMin, priority: 1, chime: 'chime_soft', haptic: null, lines: [{ key: 'drive.tts.offline' }] }); }
    for (const { x, d } of view) {
      const dM = x.alongM - f.alongM; const near = dM / Math.max(f.speed, 5) <= 300 || dM <= 2000;
      const prev = heard.get(x.c.id);
      const atRisk = d.state === 'watch' || d.state === 'avoid' || d.state === 'closed' || (d.state === 'unknown' && !!d.lastKnown);
      if (!near) continue;
      if (prev === undefined) { if (atRisk) pending.set(x.c.id, { state: d.state, down: false }); heard.set(x.c.id, d.state); continue; }
      if (prev !== d.state) {                                                    // a change while ahead and near
        const down = RANK[d.state] < RANK[prev] && d.state !== 'unknown';
        if (atRisk || down) pending.set(x.c.id, { state: d.state, down }); heard.set(x.c.id, d.state);
      }
    }
    for (const id of [...pending.keys()]) if (!ahead.some((x) => x.c.id === id)) pending.delete(id);  // passed or rerouted away
    const ready = [...pending].filter(([id]) => tS - (lastSpoke.get(id) ?? -1e9) >= 60)               // ≤ 1 per crossing per 60 s
      .map(([id, p]) => ({ id, ...p, pr: prio(p.state, p.down) })).sort((a, b) => b.pr - a.pr || RANK[b.state] - RANK[a.state]);
    if (!ready.length) continue;
    const top = ready[0]!;
    const lines = ready.length > 1 ? [{ key: 'drive.tts.multi_changed', count: ready.length }, { key: ttsKey(top.state, top.down), crossingId: top.id }]
      : [{ key: ttsKey(top.state, top.down), crossingId: top.id }];
    const hapt = top.down ? 'light' : top.state === 'avoid' || top.state === 'closed' ? 'error' : top.state === 'watch' ? 'warning' : 'soft';
    utter.push({ tS, simMin: Math.round(simMin * 100) / 100, priority: top.pr, chime: top.pr === 2 ? 'chime' : top.pr === 1 ? 'chime_soft' : null,
      haptic: tS - lastHapticS >= 1.5 ? hapt : null, lines });
    lastHapticS = tS;
    for (const r of ready) { lastSpoke.set(r.id, tS); pending.delete(r.id); }
  }
  return { utterances: utter, lockoutAtS, endS, frames };
}
