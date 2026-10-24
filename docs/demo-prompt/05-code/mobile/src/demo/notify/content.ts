// mobile/src/demo/notify/content.ts — LOCAL notifications only (expo-notifications 57; no push, no aps-environment).
// Pure builders. The side-effect adapter (scheduleNotificationAsync etc.) is notify/adapter.ts (§25.3).
import { CROSSINGS } from '../data/demo-data';
import type { PlannedNotification } from '../scenario/choreography';
import type { Compiled } from '../scenario/compile';
import { tr as t, type Lang } from '../i18n/tr';

export type DemoNotificationContent = {
  title: string; subtitle: string; body: string; sound: 'default';
  interruptionLevel: 'active' | 'passive';                     // never timeSensitive/critical on a Personal Team (§10)
  data: { type: 'risk' | 'update'; demo: true; scenario: string; simMin: number; crossing_id: string; state: string;
          window: [number, number] | null; url: string };
};
const sourceLabel = (lang: Lang) => t(lang, 'demo.source.road_crew');
export function buildContent(cmp: Compiled, p: PlannedNotification, lang: Lang): DemoNotificationContent {
  const c = CROSSINGS.find((x) => x.id === p.crossingId)!; const name = c.name;   // display name verbatim (never translated)
  const ev = cmp.events.find((e) => e.crossingId === p.crossingId && e.t === p.t)!;
  const sensor = ev.reasons[0]?.code === 'WATER_AT_ROAD';
  const [lo, hi] = p.window ?? [0, 0]; const now = p.state === 'avoid' && (!p.window || lo === 0);
  const title = p.kind === 'update' ? t(lang, 'update.deescalate.push_title', { name }) : t(lang, `state.${p.state}.push_title`, { name });
  const body = p.kind === 'update' ? t(lang, 'update.deescalate.push_body')
    : p.state === 'avoid' ? (now ? t(lang, 'state.avoid.push_body_now') : t(lang, 'state.avoid.push_body', { lo, hi }))
    : p.state === 'watch' ? (p.window ? t(lang, 'state.watch.push_body', { lo, hi }) : t(lang, 'state.watch.push_body_nowindow'))
    : p.state === 'closed' ? (sensor ? t(lang, 'state.closed.body_sensor') : t(lang, 'state.closed.push_body', { source: sourceLabel(lang) }))
    : '';
  return { title, subtitle: t(lang, 'demo.notify.subtitle'), body, sound: 'default',
    interruptionLevel: p.kind === 'update' ? 'passive' : 'active',
    data: { type: p.kind, demo: true, scenario: cmp.scenario.id, simMin: p.t, crossing_id: p.crossingId, state: p.state, window: p.window,
            url: `fordcast://crossing/${p.crossingId}` } };
}
/** Stable id → re-arming a take replaces the pending request instead of stacking duplicates. */
export const requestId = (scenarioId: string, p: PlannedNotification) => `demo:${scenarioId}:${p.crossingId}:${p.state}:${p.t}`;

/**
 * Lock-screen take: JS is suspended while the phone is locked, so the OS must deliver the notification.
 * The Director seeks to just before the beat, pauses, and schedules a TIME_INTERVAL notification `leadS` seconds out.
 * Tapping it opens fordcast://crossing/<id>; the response listener seeks the clock to data.simMin, so the sheet that opens
 * shows exactly the state the notification announced.
 */
export function lockScreenTake(cmp: Compiled, p: PlannedNotification, lang: Lang, leadS = 8) {
  return {
    seekToMin: p.t - 1, pause: true,
    request: { identifier: requestId(cmp.scenario.id, p), content: buildContent(cmp, p, lang),
               trigger: { type: 'timeInterval' as const, seconds: leadS, repeats: false } },
    onResponse: { seekToMin: p.t, route: `/crossing/${p.crossingId}` },
  };
}
