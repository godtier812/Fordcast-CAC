// mobile/src/demo/engine/travel-time.ts — TS port of C §18.3 estimate_lag + combine_storms (student-owned ★ in the full build).
export type LagEstimate = { lagMin: number; r: number; stormId: string };
const diffSmoothClip = (x: number[]) => { const d = x.map((v, i) => (i ? v - x[i - 1]! : 0));
  return d.map((_, i) => { const a = d[i - 1], c = d[i + 1]; const w = [a, d[i], c].filter((v): v is number => v != null); return Math.max(0, w.reduce((s, v) => s + v, 0) / w.length); }); };
function corr(a: number[], b: number[]) { const n = a.length; const ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n;
  let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { const x = a[i]! - ma, y = b[i]! - mb; sab += x * y; saa += x * x; sbb += y * y; }
  return saa === 0 || sbb === 0 ? NaN : sab / Math.sqrt(saa * sbb); }
export function estimateLag(up: number[], down: number[], stormId: string, stepMin = 5, maxLagMin = 240, minR = 0.5): LagEstimate | null {
  const du = diffSmoothClip(up), dd = diffSmoothClip(down); const K = Math.floor(maxLagMin / stepMin); const r: number[] = [];
  for (let k = 0; k <= K; k++) r.push(corr(du.slice(0, du.length - k), dd.slice(k)));
  let ks = -1; for (let k = 0; k <= K; k++) if (!Number.isNaN(r[k]!) && (ks < 0 || r[k]! > r[ks]!)) ks = k;
  if (ks < 0 || r[ks]! < minR) return null;
  let kh = ks; const rm = r[ks - 1], r0 = r[ks]!, rp = r[ks + 1];
  if (rm != null && rp != null && !Number.isNaN(rm) && !Number.isNaN(rp)) { const den = rm - 2 * r0 + rp; if (den < 0) kh = ks + (0.5 * (rm - rp)) / den; }
  return { lagMin: kh * stepMin, r: r0, stormId };
}
export function combineStorms(es: LagEstimate[]) {
  if (!es.length) return null; const q = (p: number) => { const s = es.map((e) => e.lagMin).sort((a, b) => a - b); const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo]! + (s[hi]! - s[lo]!) * (i - lo); };
  return { lagMin: q(0.5), lagP25Min: q(0.25), lagP75Min: q(0.75), nStorms: es.length };
}
