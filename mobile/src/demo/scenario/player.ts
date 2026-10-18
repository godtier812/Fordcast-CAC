// mobile/src/demo/scenario/player.ts — pure frame helpers for the Simulated Storm Replay player (§26) and the hydrograph.
// States are step functions read from compiled events (never interpolated); readings are only what was AVAILABLE.
import { LINKS } from '../data/demo-data';
import { lastUpcrossingTime } from '../engine/engine';
import type { Reading, Wire } from '../engine/types';
import { visible } from '../sim/sim';
import { silentSpans } from './choreography';
import type { Compiled } from './compile';

/** Hydrograph samples at simMin: delivered readings only (availMin ≤ simMin), newest last. */
export const visibleSeries = (cmp: Compiled, gaugeId: string, simMin: number, lookbackMin = 180): Reading[] =>
  visible(cmp.readings.get(gaugeId) ?? [], simMin, lookbackMin);

/** Hatched "No data" bands: a gauge is silent from its last delivered reading until the outage ends. */
export function noDataBands(cmp: Compiled, gaugeId: string, simMin: number): { fromMin: number; toMin: number }[] {
  return silentSpans(cmp).filter((s) => s.gaugeId === gaugeId && s.silentFrom <= simMin)
    .map((s) => ({ fromMin: s.silentFrom, toMin: Math.min(simMin, s.until) }));
}

/** Water pulse along the creek (gauge → crossing): starts when the PRIMARY upstream gauge crossed its trigger (as the
 *  phone knew it), lasts the link's median τ. Animation only — it never changes a state (§26.3). */
export function pulseProgress(cmp: Compiled, crossingId: string, simMin: number): number | null {
  const l = LINKS.find((x) => x.crossingId === crossingId && x.isPrimary); if (!l) return null;
  const s = visibleSeries(cmp, l.gaugeId, simMin, 360);
  const tCross = lastUpcrossingTime(s, l.triggerFt);
  if (tCross == null || s.length === 0 || s[s.length - 1]!.ft < l.triggerFt) return null;
  return Math.max(0, Math.min(1, (simMin - tCross) / l.lagMin));
}

export type Tick = { t: number; kind: 'watch' | 'avoid' | 'closed' | 'unknown' | 'water' | 'gap'; toMin?: number };
/** Scrubber ticks for one crossing: ▲ first Watch, ◆ each new Avoid episode, ▮ Closed, ⌀ Unknown/gaps, ● water on road. */
export function scrubberTicks(cmp: Compiled, crossingId: string): Tick[] {
  const out: Tick[] = []; let prev: Wire = cmp.initial.get(crossingId)?.state ?? 'no_rise';
  for (const e of cmp.events) {
    if (e.crossingId !== crossingId) continue;
    if (e.state !== prev && !e.held && (e.state === 'watch' || e.state === 'avoid' || e.state === 'closed' || e.state === 'unknown'))
      out.push({ t: e.t, kind: e.state });
    prev = e.state;
  }
  const onset = cmp.onsets.get(crossingId); if (onset != null) out.push({ t: onset, kind: 'water' });
  const g = LINKS.find((x) => x.crossingId === crossingId && x.isPrimary)?.gaugeId;
  for (const s of silentSpans(cmp)) if (s.gaugeId === g) out.push({ t: s.silentFrom, kind: 'gap', toMin: s.until });
  return out.sort((a, b) => a.t - b.t);
}

/** Results sheet numbers — all computed by compile(); nothing typed by hand (§26.4). */
export function storyResults(cmp: Compiled) {
  const h = cmp.hero; if (!h) return null;
  const closedAt = cmp.events.find((e) => e.crossingId === h.crossingId && e.state === 'closed'
    && e.reasons[0]?.code === 'OFFICIAL_CLOSED')?.t ?? null;
  return { crossingId: h.crossingId, leadMin: h.leadMin, onsetMin: h.onset, firstAlertAt: h.firstAlertAt,
    firstWindow: h.firstWindow, inFirstWindow: h.inFirstWindow, n: cmp.leads.length, medianLeadMin: cmp.medianLead,
    closureGapMin: closedAt == null ? null : closedAt - h.firstAlertAt };
}
