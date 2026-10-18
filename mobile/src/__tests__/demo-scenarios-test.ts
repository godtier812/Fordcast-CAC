// mobile/src/__tests__/demo-scenarios-test.ts — takes, clock, notifications, copy guards, drive, storyboard, budget (§28.1).
import { CROSSINGS, GAUGES } from '../demo/data/demo-data';
import { ROUTES, crossingsOnRoute, drivePlan } from '../demo/drive/drive';
import { reasonText } from '../demo/i18n/reasons';
import { DICT, tr } from '../demo/i18n/tr';
import { buildContent, lockScreenTake } from '../demo/notify/content';
import { planNotifications, resolveKeyframe, storyboard } from '../demo/scenario/choreography';
import { advance, initialClock, pause, play, seek, setAutoSlow, setSpeed, simNow, stormTime } from '../demo/scenario/clock';
import type { Compiled } from '../demo/scenario/compile';
import { compiledFor } from '../demo/scenario/source';   // golden or live (§23.6)
import { displayAt } from '../demo/scenario/display';
import { SCENARIOS } from '../demo/scenario/scenarios';
import { TAKES } from '../demo/scenario/takes';
import banned from '../locales/banned-words.json';

const cache = new Map<string, Compiled>();
const cmpOf = (id: string) => { let c = cache.get(id); if (!c) { c = compiledFor(SCENARIOS.find((s) => s.id === id)!); cache.set(id, c); } return c; };

test('every take resolves and shows what the take plan promises', () => {
  for (const tk of TAKES) {
    const cmp = cmpOf(tk.scenario); const at = resolveKeyframe(cmp, { id: tk.id, label: tk.beat, at: tk.at });
    for (const e of tk.expect) {
      const d = displayAt(cmp, e.crossingId, at, cmp.scenario.network);
      expect({ take: tk.id, id: e.crossingId, state: d.state }).toEqual({ take: tk.id, id: e.crossingId, state: e.state });
      if (e.window !== undefined) expect(d.window).toEqual(e.window);
      if (e.lastKnown) expect(d.lastKnown?.state).toBe(e.lastKnown);
    }
  }
});
test('clock: closed-form, pause/seek/speed continuity, auto-slow, storm-time labels', () => {
  let c = initialClock(-60, 300, 0, 1_000); c = play(c, 1_000);
  expect(simNow(c, 61_000)).toBeCloseTo(60, 9);                         // 60× → 1 sim-hour per wall-minute
  c = setSpeed(c, 10, 61_000); expect(simNow(c, 61_000)).toBeCloseTo(60, 9); expect(simNow(c, 67_000)).toBeCloseTo(61, 9);
  c = pause(c, 67_000); expect(simNow(c, 999_000)).toBeCloseTo(61, 9);
  c = seek(c, 999, 1); expect(simNow(c, 2)).toBe(300);                  // clamped
  expect(advance(0, 60_000, 60, [{ fromMin: 10, toMin: 20 }], 300)).toBeCloseTo(10 + (50 / 60) * 10, 6);
  c = setAutoSlow(setSpeed(play(seek(c, 0, 0), 0), 60, 0), [{ fromMin: 10, toMin: 20 }], 0);
  expect(simNow(c, 10_000)).toBeCloseTo(10, 6); expect(simNow(c, 70_000)).toBeCloseTo(20, 6); expect(simNow(c, 71_000)).toBeCloseTo(21, 6);
  expect(stormTime({ h: 5, m: 50 }, 70, 'en')).toBe('7:00 AM'); expect(stormTime({ h: 5, m: 50 }, 70, 'es')).toBe('7:00 a. m.');
});
test('hero notifications: AVOID 7:00 AM then CLOSED 7:50 AM, labeled simulated, within length limits', () => {
  const cmp = cmpOf('flash-flood-night'); const plan = planNotifications(cmp);
  expect(plan.map((p) => [p.t, p.state])).toEqual([[70, 'avoid'], [120, 'closed']]);
  for (const lang of ['en', 'es'] as const) for (const p of plan) {
    const c = buildContent(cmp, p, lang);
    expect(c.title.length).toBeLessThanOrEqual(50); expect(c.body.length).toBeLessThanOrEqual(150);
    expect(c.subtitle).toBe(tr(lang, 'demo.notify.subtitle')); expect(c.interruptionLevel).toBe('active');
  }
  expect(buildContent(cmp, plan[0]!, 'en')).toMatchObject({ title: 'Avoid Williamson Creek at Jones Road',
    body: 'Likely flooded within 15–30 min. Use another route. Never drive into water.' });
  expect(buildContent(cmp, plan[1]!, 'en').body).toBe("Simulated road crew reports it closed. Turn around, don't drown.");
  const take = lockScreenTake(cmp, plan[0]!, 'en'); expect(take.seekToMin).toBe(69); expect(take.onResponse.seekToMin).toBe(70);
});
test('push titles: only 3 known crossing names exceed 50 chars (none is subscribed in any scenario)', () => {
  const long = CROSSINGS.filter((c) => tr('en', 'state.avoid.push_title', { name: c.name }).length > 50
    || tr('es', 'state.watch.push_title', { name: c.name }).length > 50);
  expect(long.map((c) => c.id)).toEqual(['atx-38', 'hays-663', 'tc-94']);
  for (const s of SCENARIOS) for (const id of s.subscriptions.crossingIds) expect(['atx-38', 'hays-663', 'tc-94']).not.toContain(id);
});
test('EN/ES key parity + A §3.12 guards (banned words, countdown, spoken) on every demo key', () => {
  const BANNED = {
    en: ['safe', 'safer', 'safely', 'all clear', 'clear', 'cleared', 'passable', 'good to go', 'no risk', 'low risk', 'no danger',
      'can cross', 'reopened', 'all good', 'ok', 'okay', 'normal', 'open', 'opened'],
    es: ['seguro', 'segura', 'despejado', 'despejada', 'transitable', 'puede cruzar', 'puede pasar', 'sin riesgo', 'bajo riesgo',
      'sin peligro', 'reabierto', 'todo bien', 'normal', 'abierto', 'abierta'],
  };
  const strip = (k: string) => k.replace(/_(one|many|other)$/, '');
  expect(new Set(Object.keys(DICT.en).map(strip))).toEqual(new Set(Object.keys(DICT.es).map(strip)));
  const word = (w: string) => new RegExp(`(?<![\\p{L}\\p{N}])${w.replace(/[-\s]/g, '[-\\s]')}(?![\\p{L}\\p{N}])`, 'iu');
  for (const lang of ['en', 'es'] as const) for (const [k, v] of Object.entries(DICT[lang])) {
    const allowListed = banned.allowKeys.some((p) => (p.endsWith('*') ? k.startsWith(p.slice(0, -1)) : k === p));   // 01 §3.11 negations;
    if (!allowListed) expect({ k, hits: BANNED[lang].filter((w) => word(w).test(v.toLowerCase())) }).toEqual({ k, hits: [] });   // copy-banned-test checks them
    if (v.includes('{{lo}}')) expect(v).toContain('{{hi}}');
    if (v.includes('{{tau_lo}}')) expect(v).toContain('{{tau_hi}}');
    expect(/\b(in|en|within|dentro de)\s+\d+\s*(min|minutes|minutos)\b/i.test(v)).toBe(false);
    if (k.endsWith('.tts') || k.startsWith('drive.tts.') || k.endsWith('_spoken')) expect(/[–—]|\bmin\b|\bft\b|\bmi\b/.test(v)).toBe(false);
  }
});
test('reasons: a falling trigger gauge renders the _peaked line, never "+-0.4 ft"', () => {
  const ctx = { gaugeName: (id: string) => GAUGES.find((g) => g.id === id)!.short, stormTime: (m: number) => stormTime({ h: 5, m: 50 }, m, 'en'),
    ageText: (n: number) => tr('en', 'time.min_ago', { count: n }), simNow: 130 };
  const r = { code: 'UPSTREAM_ABOVE_TRIGGER' as const, gauge_id: 'USGS-08158922', value_ft: 9.3, rise_ft_30m: -0.4, tau_min: 110,
    tau_lo_min: 90, tau_hi_min: 135, trigger_ft: 9, obs_at: 120 };
  expect(reasonText('en', r, ctx)).toBe('Williamson Ck at Brush Country Blvd is above its trigger level, upstream. Water usually takes 90–135 min to get here.');
  expect(reasonText('en', { ...r, rise_ft_30m: 4.5 }, ctx)).toContain('+4.5 ft over the last 30 min');
  expect(reasonText('en', { code: 'OFFICIAL_CLOSED', source: 'demo_official', as_of: 120 }, ctx)).toBe('Official: Simulated road crew reports it closed');
  for (const s of SCENARIOS) for (const e of cmpOf(s.id).events) for (const rr of e.reasons) {
    for (const lang of ['en', 'es'] as const) { const txt = reasonText(lang, rr, ctx); expect(txt).not.toMatch(/\+-|\{\{/); reasonText(lang, rr, ctx, true); }
  }
});
test('drive: WATCH at 0 s, merged AVOID at 66 s, ≤ 1 line per crossing per 60 s, silent after the detour', () => {
  const cmp = cmpOf('drive-commute'); const p = drivePlan(cmp, cmp.scenario.drive!);
  expect(crossingsOnRoute(ROUTES.commute.line).map((x) => x.c.id)).toEqual(['atx-37', 'atx-692']);
  expect(crossingsOnRoute(ROUTES.detour.line)).toEqual([]);
  expect(p.utterances.map((u) => [u.tS, u.priority, u.lines.map((l) => l.key).join('+')])).toEqual([
    [0, 1, 'state.watch.tts'], [66, 2, 'drive.tts.multi_changed+state.avoid.tts']]);
  expect(p.lockoutAtS).toBeLessThanOrEqual(10);
  const name = (id: string, l: 'en' | 'es') => { const c = CROSSINGS.find((x) => x.id === id)!; return c.spoken?.[l] ?? c.name; };
  for (const l of ['en', 'es'] as const) {
    const said = p.utterances[1]!.lines.map((x) => tr(l, x.key, { ...(x.count != null ? { count: x.count } : {}), name: x.crossingId ? name(x.crossingId, l) : '' })).join(' ');
    expect(said).toBe(l === 'en' ? '2 crossings ahead changed. Avoid Williamson Creek at Jones Road. Flooding likely soon. Take another route.'
      : 'Cambiaron 2 cruces adelante. Evite Williamson Creek en Jones Road. Inundación probable pronto. Tome otra ruta.');
  }
});
test('storyboard of the Onion Creek storm includes the gauge-silent line', () => {
  const sb = storyboard(cmpOf('onion-creek-storm'));
  expect(sb.find((l) => l.kind === 'gauge_silent')).toMatchObject({ t: 290, crossingId: 'tc-1626', gaugeId: 'USGS-08158827' });
  expect(cmpOf('onion-creek-storm').hero).toMatchObject({ crossingId: 'tc-68', leadMin: 35, inFirstWindow: true });
});
