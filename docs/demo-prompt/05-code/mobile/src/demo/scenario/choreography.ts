// mobile/src/demo/scenario/choreography.ts — everything the director needs is DERIVED from the
// compiled events (never hand-typed times), so retuning a hydrograph moves every notification/keyframe with it.
import type { Compiled } from './compile';
import type { Keyframe } from './schema';
import { RANK, type DemoEvent, type Wire } from '../engine/types';
import { GAUGES } from '../data/demo-data';

// ---------- local notification plan (A §3.8 policy, demo-adapted) ----------
export type PlannedNotification = {
  t: number; crossingId: string; kind: 'risk' | 'update'; state: Wire; window: [number, number] | null;
  interruptionLevel: 'active' | 'passive';                    // copy is built by notify.ts buildContent()
};
export function planNotifications(cmp: Compiled): PlannedNotification[] {
  const { crossingIds, watchAlerts } = cmp.scenario.subscriptions;
  const out: PlannedNotification[] = []; const lastByLevel = new Map<string, number>(); const escalated = new Set<string>();
  const perHour: number[] = [];
  for (const e of cmp.events) {
    if (!crossingIds.includes(e.crossingId)) continue;
    const prev = prevEvent(cmp, e);
    const up = RANK[e.state] > RANK[prev.state];
    const isRisk = up && (e.state === 'avoid' || e.state === 'closed' || (e.state === 'watch' && watchAlerts));
    const isUpdate = e.state === 'no_rise' && escalated.has(e.crossingId);
    if (!isRisk && !isUpdate) continue;
    const k = `${e.crossingId}|${e.state}`;
    if (isRisk && (lastByLevel.get(k) ?? -Infinity) > e.t - 60) continue;            // ≤ 1 per crossing per level per 60 min
    while (perHour.length && perHour[0]! <= e.t - 60) perHour.shift();
    if (perHour.length >= 3) continue;                                                // ≤ 3 per device per hour (summary omitted in demo)
    perHour.push(e.t); lastByLevel.set(k, e.t);
    if (isRisk) escalated.add(e.crossingId); else escalated.delete(e.crossingId);
    out.push({ t: e.t, crossingId: e.crossingId, kind: isRisk ? 'risk' : 'update', state: e.state, window: e.window,
      interruptionLevel: isRisk ? 'active' : 'passive' });
  }
  return out;
}
function prevEvent(cmp: Compiled, e: DemoEvent): DemoEvent {
  const evs = cmp.events.filter((x) => x.crossingId === e.crossingId && x.t < e.t);
  return evs.at(-1) ?? cmp.initial.get(e.crossingId)!;
}

// ---------- storyboard (≤ 8 lines; kinds from C §19.13; copy keys from A §3.7) ----------
export type StoryLine = { t: number; kind: 'first_watch' | 'first_avoid' | 'gauge_silent' | 'official'; crossingId: string; gaugeId?: string };
export function storyboard(cmp: Compiled): StoryLine[] {
  const out: StoryLine[] = []; const seen = new Set<string>();
  for (const e of cmp.events) {
    const r0 = e.reasons[0];
    const push = (kind: StoryLine['kind'], gaugeId?: string) => { const k = `${kind}|${gaugeId ?? e.crossingId}`; if (!seen.has(k)) { seen.add(k); out.push({ t: e.t, kind, crossingId: e.crossingId, gaugeId }); } };
    if (e.state === 'watch' && r0?.code === 'UPSTREAM_RISING') push('first_watch', r0.gauge_id);
    if (e.state === 'avoid' && r0?.code === 'UPSTREAM_ABOVE_TRIGGER') push('first_avoid', r0.gauge_id);
    if (e.state === 'unknown' && r0?.code === 'DATA_STALE' && r0.gauge_id) push('gauge_silent', r0.gauge_id);
    if (e.state === 'closed' && r0?.code === 'OFFICIAL_CLOSED') push('official');
  }
  return out.slice(0, 8);
}

// ---------- keyframes ("takes") resolved against events ----------
export function resolveKeyframe(cmp: Compiled, k: Keyframe): number {
  const a = k.at;
  if (a.kind === 'min') return a.t;
  if (a.kind === 'onset') return (cmp.onsets.get(a.crossingId) ?? 0) + (a.offsetMin ?? 0);
  const hits = cmp.events.filter((e) => e.crossingId === a.crossingId && e.state === a.state && !e.held);
  const e = hits[(a.nth ?? 1) - 1]; if (!e) throw new Error(`keyframe ${k.id}: no ${a.state} event for ${a.crossingId}`);
  return e.t + (a.offsetMin ?? 0);
}

// ---------- gauge "No data" spans (for the hatched band + dashed gauge ring) ----------
export function silentSpans(cmp: Compiled) {
  return cmp.scenario.outages.map((o) => {
    const g = GAUGES.find((x) => x.id === o.gaugeId)!;
    const lastBefore = Math.floor((o.startMin - 1) / g.dtMin) * g.dtMin;     // last obs delivered before the outage
    return { gaugeId: o.gaugeId, silentFrom: lastBefore + g.delayMin + g.dtMin, staleAt: lastBefore + g.staleAfterMin, until: o.endMin, mode: o.mode };
  });
}

// ---------- determinism fingerprint (Director status line, §24.6) ----------
/** FNV-1a over the compiled events JSON → 8 hex chars. Same build + same scenario ⇒ same hash on every take and device. */
export function eventsHash(cmp: Compiled): string {
  let h = 2166136261;
  for (const ch of JSON.stringify(cmp.events)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

// ---------- beats (transport |◀ ▶| jumps + auto-slow windows, §22.7/§24) ----------
/** Story beats = storyboard lines + the hero's water-on-road onset, sorted, unique. Derived, never hand-typed. */
export function beatMinutes(cmp: Compiled): number[] {
  const ts = storyboard(cmp).map((l) => l.t);
  if (cmp.hero) ts.push(cmp.hero.onset);
  return [...new Set(ts)].sort((a, b) => a - b);
}
/** Auto-slow windows: 10× from beat − 5 to beat + 5 (D §33.9), overlapping windows merged. */
export function autoSlowWindows(cmp: Compiled, padMin = 5): { fromMin: number; toMin: number }[] {
  const out: { fromMin: number; toMin: number }[] = [];
  for (const b of beatMinutes(cmp)) {
    const last = out.at(-1);
    if (last && b - padMin <= last.toMin) last.toMin = Math.max(last.toMin, b + padMin);
    else out.push({ fromMin: b - padMin, toMin: b + padMin });
  }
  return out;
}
