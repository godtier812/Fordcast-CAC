// mobile/src/demo/sim/{rng,hydrograph,gauge-series,truth}.ts — merged for the prototype.
// The simulator produces (a) the gauge readings the forecast is allowed to see and (b) a hidden "truth" (when water
// really reached each road). The engine never imports this file's truth functions (isolation test, C §19.8 spirit).
import type { Gauge, Reading } from '../engine/types';

// ---------- deterministic PRNG (mulberry32) ----------
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function hashSeed(...parts: (string | number)[]) {           // FNV-1a → stable per (scenario, gauge)
  let h = 2166136261; for (const ch of parts.join('|')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0;
}

// ---------- parametric hydrograph ----------
// One storm "pulse": smooth rise to the peak (shape (s·e^(1−s))^kRise, s∈(0,1]) then a slower recession
// ((1+f)·e^(−f))^kFall. Both limbs have zero slope at the peak, so the curve is C¹ and looks like a real hydrograph.
export type Pulse = { peakMin: number; riseMin: number; fallMin: number; ampFt: number; kRise?: number; kFall?: number };
export function pulseFt(p: Pulse, t: number): number {
  const kR = p.kRise ?? 3, kF = p.kFall ?? 1;
  if (t <= p.peakMin) { const s = (t - (p.peakMin - p.riseMin)) / p.riseMin; return s <= 0 ? 0 : p.ampFt * Math.pow(s * Math.exp(1 - s), kR); }
  const f = (t - p.peakMin) / p.fallMin; return p.ampFt * Math.pow((1 + f) * Math.exp(-f), kF);
}

export type GaugeCurve = {
  gaugeId: string;
  pulses?: Pulse[];
  routedFrom?: { gaugeId: string; lagMin: number; gain: number; smoothMin: number };   // downstream response of an upstream gauge
  diurnalFt?: number;                                                                  // calm wiggle amplitude
  noiseFt?: number;                                                                    // ±, deterministic
};
export type Outage = { gaugeId: string; startMin: number; endMin: number; mode: 'delayed' | 'lost' };

/** Continuous "true" stage function per gauge (ft), memoized, deterministic. */
export function buildStageFns(gauges: Gauge[], curves: GaugeCurve[]) {
  const byId = new Map(gauges.map((g) => [g.id, g]));
  const curve = new Map(curves.map((c) => [c.gaugeId, c]));
  const fns = new Map<string, (t: number) => number>();
  const get = (id: string): ((t: number) => number) => {
    const hit = fns.get(id); if (hit) return hit;
    const g = byId.get(id)!; const c = curve.get(id) ?? { gaugeId: id };
    const src = c.routedFrom ? get(c.routedFrom.gaugeId) : null; const srcBase = c.routedFrom ? byId.get(c.routedFrom.gaugeId)!.baseFt : 0;
    const fn = (t: number) => {
      let v = g.baseFt + (c.diurnalFt ?? 0.02) * Math.sin((2 * Math.PI * (t + 37)) / 1440);
      for (const p of c.pulses ?? []) v += pulseFt(p, t);
      if (src && c.routedFrom) {                           // boxcar-smoothed, lagged, scaled upstream anomaly
        const { lagMin, gain, smoothMin } = c.routedFrom; let acc = 0; const n = 5;
        for (let k = 0; k < n; k++) acc += src(t - lagMin - (smoothMin * k) / (n - 1)) - srcBase;
        v += gain * (acc / n);
      }
      return v;
    };
    fns.set(id, fn); return fn;
  };
  for (const g of gauges) get(g.id);
  return fns;
}

/** Readings as a real gauge would report them: every dtMin, rounded to 0.01 ft, with delivery delay and outages. */
export function buildReadings(g: Gauge, fn: (t: number) => number, curves: GaugeCurve[], outages: Outage[],
  fromMin: number, toMin: number, seed: number): Reading[] {
  const c = curves.find((x) => x.gaugeId === g.id); const rnd = mulberry32(hashSeed(seed, g.id));
  const out: Reading[] = [];
  for (let t = Math.ceil(fromMin / g.dtMin) * g.dtMin; t <= toMin; t += g.dtMin) {
    const noise = ((rnd() * 2 - 1) * (c?.noiseFt ?? 0.015));
    const o = outages.find((x) => x.gaugeId === g.id && x.startMin <= t && t < x.endMin);
    if (o?.mode === 'lost') continue;                                     // a true gap: nothing ever arrives
    const avail = o ? Math.max(t + g.delayMin, o.endMin) : t + g.delayMin; // delayed: arrives at the outage end
    out.push({ gaugeId: g.id, obsMin: t, availMin: avail, ft: Math.round((fn(t) + noise) * 100) / 100 });
  }
  return out;
}

/** What the pipeline may see at asOf (C §19.4): available, inside the lookback. */
export const visible = (rs: Reading[], asOf: number, lookbackMin = 360) =>
  rs.filter((r) => r.availMin <= asOf && r.obsMin >= asOf - lookbackMin);

// ---------- hidden truth (results only; never an engine input) ----------
export type TruthSpec = { crossingId: string; fromGaugeId: string; tauTrueMin: number; overtopUpFt: number };
export function truthOnset(spec: TruthSpec, fns: Map<string, (t: number) => number>, from: number, to: number): number | null {
  const f = fns.get(spec.fromGaugeId)!;
  for (let t = from; t <= to; t++) if (f(t - spec.tauTrueMin) >= spec.overtopUpFt) return t;
  return null;
}
