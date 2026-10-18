// mobile/src/demo/engine/combine.ts — staleness (C §18.9) and precedence (A §3.3): the ONLY combination logic.
// Each step can only ADD caution; state-machine.ts ★ then applies hysteresis.
// Ported as-is from docs/demo-prompt/05-code (05 §23.2, split per §23.6). PURE: no I/O, no Date.now(), no imports from ../sim.
import { RANK, type Crossing, type Gauge, type Link, type Official, type RawState, type Reading, type Reason, type RuleResult } from './types';
import { isFresh, latest } from './features';

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

// ---------- combine (A §3.3) ----------
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
