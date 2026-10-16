// mobile/src/demo/engine/{features,windows,explain,baseline-rule,combine,state-machine}.ts — merged here for the prototype.
// A line-by-line TypeScript port of C §18.1, §18.5, §18.6, §18.8, §18.9, §18.10 and A §3.3. Pure functions, no I/O,
// no Date.now(), no imports from ../sim (truth isolation, C §19.8).
import { RANK, type Crossing, type Link, type Official, type RawState, type Reading, type Reason, type RuleResult,
  type Tracker, type Window, type Wire, type Gauge } from './types';

// ---------- features (§18.1) ----------
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

// ---------- windows (§18.6) ----------
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

// ---------- explain (§18.10 / A §3.5 rule 8) ----------
export function tauRange(l: Pick<Link, 'lagMin' | 'lagP25Min' | 'lagP75Min' | 'nStorms'>): [number, number] {
  const p25 = l.nStorms === 1 ? l.lagMin - 10 : l.lagP25Min;
  const p75 = l.nStorms === 1 ? l.lagMin + 10 : l.lagP75Min;
  let lo = 15 * Math.floor(p25 / 15); let hi = 15 * Math.ceil(p75 / 15);
  if (hi - lo < 15) hi = lo + 15;
  if (lo < 5) lo = 5;                                                       // a travel range never starts at 0
  return [lo, hi];
}
const r1 = (x: number) => Math.round(x * 10) / 10;

// ---------- baseline rule ★ (§18.5) — student-owned in the full build; same contract here ----------
export function evaluate(c: Crossing, links: Link[], series: Map<string, Reading[]>, gauges: Map<string, Gauge>,
  asOf: number): RuleResult {
  type Cand = { l: Link; etaLo: number; etaHi: number; reason: Reason };
  const avoid: Cand[] = []; const watch: { l: Link; reason: Reason }[] = [];
  for (const l of links) {
    if (l.relation !== 'upstream') continue;
    const s = series.get(l.gaugeId) ?? []; const g = gauges.get(l.gaugeId)!;
    if (!isFresh(s, asOf, g.staleAfterMin)) continue;                    // step 1: usable = fresh upstream links
    const S = latest(s)!.ft; const r30 = rise(s, 30) ?? 0;
    if (S >= l.triggerFt) {                                               // step 2: AVOID candidate
      const tCross = lastUpcrossingTime(s, l.triggerFt);
      const recent = tCross != null && asOf - tCross <= l.lagP75Min + 30;
      if (r30 > l.minRiseFt30m || recent) {
        const tc = tCross ?? latest(s)!.obsMin;
        const etaMid = l.lagMin - (asOf - tc);
        const etaLo = Math.max(0, etaMid - (l.lagMin - l.lagP25Min));
        const etaHi = Math.max(etaLo, etaMid + (l.lagP75Min - l.lagMin));
        const [tlo, thi] = tauRange(l);
        avoid.push({ l, etaLo, etaHi, reason: { code: 'UPSTREAM_ABOVE_TRIGGER', gauge_id: l.gaugeId, value_ft: r1(S),
          rise_ft_30m: r1(r30), tau_min: Math.round(l.lagMin / 5) * 5, tau_lo_min: tlo, tau_hi_min: thi,
          trigger_ft: l.triggerFt, obs_at: latest(s)!.obsMin } });
        continue;
      }
    }
    if (S >= l.watchFt && r30 > 0.2) watch.push({ l, reason: { code: 'UPSTREAM_RISING', gauge_id: l.gaugeId,
      rise_ft_30m: r1(r30), value_ft: r1(S), watch_ft: l.watchFt, obs_at: latest(s)!.obsMin } });   // step 3
  }
  avoid.sort((a, b) => a.etaLo - b.etaLo);
  const near = avoid.filter((a) => a.etaLo < HORIZON_MIN);
  const reasons = [...avoid.map((a) => a.reason), ...watch.map((w) => w.reason)].slice(0, 3);
  if (near.length) { const b = near[0]!;                                  // step 4
    return { state: 'avoid', etaLo: b.etaLo, etaHi: b.etaHi, window: toWindow(b.etaLo, b.etaHi), triggerGaugeId: b.l.gaugeId, reasons }; }
  if (avoid.length) return { state: 'watch', etaLo: null, etaHi: null, window: null, triggerGaugeId: avoid[0]!.l.gaugeId, reasons }; // step 5
  if (watch.length) return { state: 'watch', etaLo: null, etaHi: null, window: null, triggerGaugeId: watch[0]!.l.gaugeId, reasons }; // step 6
  return { state: 'no_rise', etaLo: null, etaHi: null, window: null, triggerGaugeId: null, reasons: [] };       // step 7
}

// ---------- staleness (§18.9) ----------
export function crossingIsStale(links: Link[], series: Map<string, Reading[]>, gauges: Map<string, Gauge>, asOf: number,
  rule: RuleResult): { stale: boolean; reason?: Reason } {
  const up = links.filter((l) => l.relation === 'upstream');
  const fresh = (l: Link) => isFresh(series.get(l.gaugeId) ?? [], asOf, gauges.get(l.gaugeId)!.staleAfterMin);
  const primary = up.find((l) => l.isPrimary) ?? up[0];
  const allStale = up.length > 0 && up.every((l) => !fresh(l));
  const primaryStaleNoSignal = !!primary && !fresh(primary) && rule.state === 'no_rise';
  if (!allStale && !primaryStaleNoSignal) return { stale: false };
  const s = series.get(primary!.gaugeId) ?? [];
  return { stale: true, reason: { code: 'DATA_STALE', gauge_id: primary!.gaugeId, last_obs_at: s.length ? latest(s)!.obsMin : null } };
}

// ---------- combine (A §3.3) — the only combination logic ----------
export const isFreshOfficial = (o: Official | null, now: number) => !!o && o.setAt <= now && now < o.expiresAt;
export function resolveRawState(official: Official | null, waterAtRoad: Reason | null, tier: Crossing['tier'],
  stale: { stale: boolean; reason?: Reason }, rule: RuleResult): RawState {
  if (official && official.status === 'closed')
    return { state: 'closed', window: null, reasons: [{ code: 'OFFICIAL_CLOSED', source: official.source, as_of: official.setAt }], triggerGaugeId: null, closedSource: 'official' };
  if (waterAtRoad) return { state: 'closed', window: null, reasons: [waterAtRoad], triggerGaugeId: null, closedSource: 'sensor' };
  let base: RawState;
  if (tier === 'C') base = { state: 'unknown', window: null, reasons: [{ code: 'NO_UPSTREAM_GAUGE' }], triggerGaugeId: null, closedSource: null };
  else if (stale.stale) base = { state: 'unknown', window: null, reasons: [stale.reason!], triggerGaugeId: null, closedSource: null };
  else base = { state: rule.state, window: rule.window, reasons: rule.reasons, triggerGaugeId: rule.triggerGaugeId, closedSource: null };
  if (official && official.status === 'caution' && RANK[base.state] < RANK.watch)
    return { ...base, state: 'watch', window: null, reasons: [...base.reasons, { code: 'OFFICIAL_CAUTION', source: official.source, as_of: official.setAt }] };
  return base;                                                              // official "open" never lowers
}

// ---------- state machine (§18.8) — ticks are 5 min ----------
export const DWELL: Partial<Record<Wire, number>> = { closed: 6, avoid: 6, watch: 12 };
export const DOWN: Partial<Record<Wire, Wire>> = { closed: 'avoid', avoid: 'watch', watch: 'no_rise' };
const maxState = (a: Wire, b: Wire) => (RANK[a] >= RANK[b] ? a : b);
export const initialTracker = (): Tracker => ({ state: 'unknown', since: 0, calmTicks: 0, lastKnownState: null, lastKnownAt: null,
  closedSource: null, triggerGaugeId: null, window: null, held: false, reasons: [] });
export type StepCtx = { officialFresh: boolean; officialClosed: boolean; extraOk: (tr: Tracker) => boolean; officialSource: string | null;
  liftedAt: number | null };
function enter(tr: Tracker, raw: RawState, now: number): Tracker {
  const known = raw.state !== 'unknown';
  return { ...tr, state: raw.state, since: now, calmTicks: 0, window: raw.window, reasons: raw.reasons, closedSource: raw.closedSource,
    triggerGaugeId: raw.triggerGaugeId ?? tr.triggerGaugeId, held: false,
    lastKnownState: known ? raw.state : tr.lastKnownState, lastKnownAt: known ? now : tr.lastKnownAt };
}
/** C §18.8 T7 note: CLOSURE_LIFTED stays on the next states until they reach no_rise. */
export function step(tr: Tracker, raw: RawState, now: number, ctx: StepCtx): Tracker {
  const next = stepCore(tr, raw, now, ctx);
  const lifted = tr.reasons.find((r) => r.code === 'CLOSURE_LIFTED');
  if (lifted && (next.state === 'watch' || next.state === 'avoid') && !next.reasons.some((r) => r.code === 'CLOSURE_LIFTED'))
    return { ...next, reasons: [lifted, ...next.reasons] };
  return next;
}
function stepCore(tr: Tracker, raw: RawState, now: number, ctx: StepCtx): Tracker {
  if (raw.state === 'unknown' || (tr.closedSource === 'official' && tr.state === 'closed' && !ctx.officialFresh)) {   // T1
    const wasKnown = tr.state !== 'unknown';
    return { ...tr, state: 'unknown', since: wasKnown ? now : tr.since, calmTicks: 0,
      lastKnownState: wasKnown ? tr.state : tr.lastKnownState, lastKnownAt: wasKnown ? now : tr.lastKnownAt,
      window: null, held: false, reasons: raw.reasons.length ? raw.reasons : [{ code: 'DATA_STALE', source: ctx.officialSource ?? 'official', last_obs_at: null }] };
  }
  if (tr.state === 'unknown') {
    const lk = tr.lastKnownState;
    if (lk && DOWN[lk] && RANK[raw.state] < RANK[lk]) {                     // T2 — resume one level below the last known state
      const nxt = maxState(raw.state, DOWN[lk]!);
      return { ...tr, state: nxt, since: now, calmTicks: 0, held: true, window: null, closedSource: null,
        reasons: [{ code: 'HOLDING', since: now, held_state: nxt }, ...raw.reasons], lastKnownState: nxt, lastKnownAt: now };
    }
    return enter(tr, raw, now);                                             // T3
  }
  if (RANK[raw.state] > RANK[tr.state]) return enter(tr, raw, now);         // T4 escalate immediately
  if (raw.state === tr.state)                                               // T5 refresh
    return { ...tr, calmTicks: 0, window: raw.window, reasons: raw.reasons, held: false,
      triggerGaugeId: raw.triggerGaugeId ?? tr.triggerGaugeId, lastKnownState: raw.state, lastKnownAt: now };
  const calm = tr.calmTicks + 1;                                            // T6 hold
  if (calm >= (DWELL[tr.state] ?? 1) && ctx.extraOk(tr)) {                  // T7 one level down
    const nxt = maxState(raw.state, DOWN[tr.state]!);
    const lifted: Reason[] = tr.state === 'closed' && tr.closedSource === 'official' && ctx.liftedAt != null
      ? [{ code: 'CLOSURE_LIFTED', source: ctx.officialSource ?? 'official', at: ctx.liftedAt }] : [];
    const holding: Reason[] = RANK[nxt] > RANK[raw.state] ? [{ code: 'HOLDING', since: now, held_state: nxt }] : [];   // spec gap fix:
    const t7 = enter(tr, { state: nxt, window: nxt === raw.state ? raw.window : null,                                  // a stepped-down
      reasons: [...lifted, ...holding, ...raw.reasons], triggerGaugeId: raw.triggerGaugeId, closedSource: null }, now);  // WATCH above a
    return holding.length ? { ...t7, held: true } : t7;                                                                  // no_rise raw needs a reason
  }
  return { ...tr, calmTicks: calm, held: true, window: null,
    reasons: [{ code: 'HOLDING', since: tr.since, held_state: tr.state }, ...raw.reasons] };
}
