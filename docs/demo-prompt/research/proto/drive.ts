// mobile/src/demo/drive/{geo,places,sim-location,drive-script}.ts — merged for the prototype.
// In the app, use @turf/along + @turf/nearest-point-on-line (Turf 7.4, already in the master stack); these tiny
// helpers exist only so the prototype runs without dependencies.
import type { Compiled } from './compile';
import { CROSSINGS } from './data';
import { RANK, type Wire } from './types';

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
    if (acc + d >= m) { const f = (m - acc) / d; return [line[i - 1]![0] + f * (line[i]![0] - line[i - 1]![0]), line[i - 1]![1] + f * (line[i]![1] - line[i - 1]![1])]; }
    acc += d; }
  return line.at(-1)!;
}
/** along-distance of the closest vertex-interpolated point (good enough for ≤ 40 m tolerance checks on dense lines). */
export function alongOf(line: LngLat[], p: LngLat, stepM = 5): { alongM: number; offM: number } {
  let best = { alongM: 0, offM: Infinity }; const L = lengthM(line);
  for (let m = 0; m <= L; m += stepM) { const d = dist(along(line, m), p); if (d < best.offM) best = { alongM: m, offM: d }; }
  return best;
}

// ---------- saved places + routes (DRAFT geometry — replace with the baked road polylines, §1.5) ----------
export const PLACES = {
  home: { id: 'home', label: { en: 'Home', es: 'Casa' }, lngLat: [-97.8052, 30.2312] as LngLat, radiusM: 1609 },
  school: { id: 'school', label: { en: 'School', es: 'Escuela' }, lngLat: [-97.7911, 30.2146] as LngLat, radiusM: 1609 },
};
export const ROUTES = {
  commute: { id: 'commute', from: 'home', to: 'school', draft: true,
    line: [[-97.8052, 30.2312], [-97.8021, 30.2275], [-97.799438, 30.223421], [-97.7962, 30.2198], [-97.7911, 30.2146]] as LngLat[] },
  detour: { id: 'detour', from: 'home', to: 'school', draft: true,
    line: [[-97.8052, 30.2312], [-97.7930, 30.2318], [-97.7860, 30.2255], [-97.7850, 30.2180], [-97.7911, 30.2146]] as LngLat[] },
};
export const crossingsOnRoute = (line: LngLat[], tolM = 40) =>
  CROSSINGS.map((c) => ({ c, ...alongOf(line, [c.lon, c.lat]) })).filter((x) => x.offM <= tolM).sort((a, b) => a.alongM - b.alongM);

// ---------- simulated drive (same Fix shape as the GPS source) ----------
export type Fix = { t: number /* ms since drive start */; lngLat: LngLat; speed: number; heading: number };
export type DriveScript = { route: 'commute' | 'detour'; startSimMin: number; cruiseMps: number; accelS: number;
  switchToDetourAtS?: number };                                   // the Detour tap (director or viewer)
export function* fixes(s: DriveScript, hz = 1): Generator<Fix> {
  let line = ROUTES[s.route].line; let m = 0; let v = 0;
  for (let k = 0; ; k++) {
    const tS = k / hz;
    if (s.switchToDetourAtS != null && tS >= s.switchToDetourAtS && line === ROUTES.commute.line) {
      const here = along(line, m); line = ROUTES.detour.line; m = alongOf(line, here).alongM;   // rejoin at the nearest point
    }
    v = Math.min(s.cruiseMps, (s.cruiseMps * tS) / s.accelS);
    const L = lengthM(line); if (m >= L - 1) { yield { t: tS * 1000, lngLat: line.at(-1)!, speed: 0, heading: 0 }; return; }
    const p = along(line, m), q = along(line, Math.min(L, m + 5));
    yield { t: tS * 1000, lngLat: p, speed: v, heading: (Math.atan2(q[0] - p[0], q[1] - p[1]) * 180) / Math.PI };
    m += v / hz;
  }
}

// ---------- Drive Mode speech queue (D §30.7): priority, 60 s per-crossing gate, ≤ 12-word TTS slots ----------
export type Utterance = { tS: number; crossingId: string; key: string; priority: 0 | 1 | 2; state: Wire };
export function driveScript(cmp: Compiled, s: DriveScript): { utterances: Utterance[]; lockoutAtS: number | null; endS: number } {
  const utter: Utterance[] = []; const lastSpoke = new Map<string, number>(); const lastState = new Map<string, Wire>();
  let fastSince: number | null = null; let lockoutAtS: number | null = null; let endS = 0; let line = ROUTES[s.route].line;
  for (const f of fixes(s)) {
    const tS = f.t / 1000; endS = tS;
    if (s.switchToDetourAtS != null && tS >= s.switchToDetourAtS) line = ROUTES.detour.line;
    if (f.speed >= 4.5) { fastSince ??= tS; if (lockoutAtS == null && tS - fastSince >= 5) lockoutAtS = tS; } else fastSince = null;   // F59 rule
    const simMin = s.startSimMin + tS / 60;                                              // risk clock runs at 1× during a drive
    const me = alongOf(line, f.lngLat).alongM;
    for (const x of crossingsOnRoute(line)) {
      if (x.alongM <= me + 50) continue;                                                  // behind us
      const ev = [...cmp.events].reverse().find((e) => e.crossingId === x.c.id && e.t <= simMin) ?? cmp.initial.get(x.c.id)!;
      const d = x.alongM - me; const near = d / Math.max(f.speed, 5) <= 300 || d <= 2000;
      const changed = lastState.get(x.c.id) !== ev.state; lastState.set(x.c.id, ev.state);
      if (!near || RANK[ev.state] < RANK.watch && ev.state !== 'unknown') continue;
      if (!changed && (tS - (lastSpoke.get(x.c.id) ?? -1e9)) < 60) continue;
      if (!changed && lastSpoke.has(x.c.id)) continue;                                    // speak on first sight + on change only
      const key = ev.state === 'avoid' ? 'state.avoid.tts' : ev.state === 'closed' ? 'state.closed.tts'
        : ev.state === 'watch' ? 'state.watch.tts' : 'drive.tts.unknown_ahead';
      utter.push({ tS, crossingId: x.c.id, key, priority: ev.state === 'avoid' || ev.state === 'closed' ? 2 : 1, state: ev.state });
      lastSpoke.set(x.c.id, tS);
    }
  }
  return { utterances: utter, lockoutAtS, endS };
}
