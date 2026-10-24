// mobile/src/demo/scenario/compile.ts — runs the REAL forecast pipeline (rule → combine → state machine) over the
// simulated readings, one 5-minute tick at a time, exactly like C §19.6 tick() in replay mode. Pure + deterministic.
import { CROSSINGS, GAUGES, LINKS } from '../data/demo-data';
import { crossingIsStale, evaluate, initialTracker, isFresh, isFreshOfficial, latest, resolveRawState, rise, step } from '../engine/engine';
import type { Crossing, DemoEvent, Reading, Reason, Tracker, Wire } from '../engine/types';
import { buildReadings, buildStageFns, truthOnset, visible } from '../sim/sim';   // truth is used ONLY in the results block
import type { DemoScenarioV1 } from './schema';

const TICK = 5, WARMUP = 60;
export function compileScenario(s: DemoScenarioV1) {
  const fns = buildStageFns(GAUGES, s.curves);
  const gaugeById = new Map(GAUGES.map((g) => [g.id, g]));
  const readings = new Map<string, Reading[]>(GAUGES.map((g) =>
    [g.id, buildReadings(g, fns.get(g.id)!, s.curves, s.outages, -WARMUP - 360, s.durationMin, s.seed)]));
  const linksBy = new Map<string, typeof LINKS>(); for (const l of LINKS) linksBy.set(l.crossingId, [...(linksBy.get(l.crossingId) ?? []), l]);
  const trackers = new Map<string, Tracker>(CROSSINGS.map((c) => [c.id, initialTracker()]));
  const events: DemoEvent[] = []; const initial = new Map<string, DemoEvent>();
  const officialAt = (cid: string, t: number) => s.official.filter((o) => o.crossingId === cid && o.setAt <= t).at(-1) ?? null;

  for (let t = -WARMUP; t <= s.durationMin; t += TICK) {
    const series = new Map<string, Reading[]>(); for (const [id, rs] of readings) series.set(id, visible(rs, t));
    for (const c of CROSSINGS) {
      const links = linksBy.get(c.id) ?? [];
      const rule = evaluate(c, links, series, gaugeById, t);
      const stale = c.tier === 'C' ? { stale: false } : crossingIsStale(links, series, gaugeById, t, rule);
      const rec = officialAt(c.id, t); const off = isFreshOfficial(rec, t) ? rec : null;
      const war = waterAtRoad(c, series, t);
      const raw = resolveRawState(off, war, c.tier, stale, rule);
      const prev = trackers.get(c.id)!;
      const trig = prev.triggerGaugeId ? series.get(prev.triggerGaugeId) ?? [] : [];
      const trigLink = links.find((l) => l.gaugeId === prev.triggerGaugeId);
      const next = step(prev, raw, t, {
        officialFresh: !!off, officialClosed: off?.status === 'closed', officialSource: rec?.source ?? null,
        liftedAt: rec && rec.status !== 'closed' ? rec.setAt : null,
        extraOk: (tr) => tr.state === 'avoid'
          ? !!trigLink && isFresh(trig, t, gaugeById.get(trigLink.gaugeId)!.staleAfterMin) && (rise(trig, 30) ?? 0) < 0 && latest(trig)!.ft < trigLink.triggerFt - 0.5
          : tr.state === 'closed' && tr.closedSource === 'official' ? !!off && off.status !== 'closed'
          : tr.state === 'closed' && tr.closedSource === 'sensor' ? !war
          : true,
      });
      trackers.set(c.id, next);
      const ev: DemoEvent = { t, crossingId: c.id, state: next.state, window: next.window, held: next.held, reasons: next.reasons,
        lastKnown: next.state === 'unknown' && next.lastKnownState ? { state: next.lastKnownState, at: next.lastKnownAt! } : null };
      if (t <= 0) { initial.set(c.id, { ...ev, t: 0 }); continue; }
      const last = [...events].reverse().find((e) => e.crossingId === c.id) ?? initial.get(c.id)!;
      if (sig(last) !== sig(ev)) events.push(ev);
    }
  }
  // ---- results (truth used ONLY here; never fed back into states) ----
  const onsets = new Map(s.truth.map((tr) => [tr.crossingId, truthOnset(tr, fns, 0, s.durationMin)]));
  const leads: { crossingId: string; onset: number; firstAlertAt: number; leadMin: number; firstWindow: [number, number] | null; inFirstWindow: boolean }[] = [];
  for (const [cid, onset] of onsets) {
    if (onset == null) continue;
    if (CROSSINGS.find((c) => c.id === cid)?.tier !== 'A') continue;          // C §17.13: tier B never counts toward leads/hero
    const evs = [initial.get(cid)!, ...events.filter((e) => e.crossingId === cid)];
    let episodeStart: number | null = null;                                   // AVOID/CLOSED episode active at the onset
    for (const e of evs) { if (e.t > onset) break; const hot = e.state === 'avoid' || e.state === 'closed';
      if (hot && episodeStart == null) episodeStart = e.t; if (!hot && e.state !== 'unknown') episodeStart = null; }
    if (episodeStart != null) { const w = evs.find((e) => e.t === episodeStart)?.window ?? null;
      leads.push({ crossingId: cid, onset, firstAlertAt: episodeStart, leadMin: Math.floor((onset - episodeStart) / 5) * 5, firstWindow: w,
        inFirstWindow: !!w && onset - episodeStart >= w[0] && onset - episodeStart <= w[1] }); }
  }
  const sorted = [...leads].sort((a, b) => a.leadMin - b.leadMin);
  const median = sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)]!.leadMin : null;   // lower median
  const hero = median == null ? null : [...leads].sort((a, b) => Math.abs(a.leadMin - median) - Math.abs(b.leadMin - median)
    || a.onset - b.onset || a.crossingId.localeCompare(b.crossingId))[0]!;
  return { scenario: s, readings, fns, initial, events, onsets, leads, hero, medianLead: median };
}
const sig = (e: DemoEvent) => `${e.state}|${e.window?.join('-') ?? ''}|${e.held}|${e.reasons.map((r) => r.code).join(',')}`;

function waterAtRoad(c: Crossing, series: Map<string, Reading[]>, t: number): Reason | null {
  if (!c.targetGaugeId || c.overtopStageFt == null) return null;
  const s = series.get(c.targetGaugeId) ?? []; const g = GAUGES.find((x) => x.id === c.targetGaugeId)!;
  if (!isFresh(s, t, g.staleAfterMin)) return null;                         // a stale target never asserts water at road
  const n = latest(s)!; return n.ft >= c.overtopStageFt ? { code: 'WATER_AT_ROAD', gauge_id: g.id, value_ft: n.ft, overtop_ft: c.overtopStageFt, obs_at: n.obsMin } : null;
}
export type Compiled = ReturnType<typeof compileScenario>;
export const stateAt = (cmp: Compiled, cid: string, t: number): DemoEvent => {
  const evs = cmp.events.filter((e) => e.crossingId === cid && e.t <= t); return evs.at(-1) ?? cmp.initial.get(cid)!;
};
export type { Wire };
