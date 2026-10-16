import { expect, test } from 'bun:test';
import { compileScenario, type Compiled } from './compile';
import { resolveKeyframe, planNotifications, storyboard } from './choreo';
import { SCENARIOS } from './scenarios';
import { TAKES } from './takes';
import { displayAt } from './display';
import { advance, initialClock, play, pause, seek, setSpeed, simNow, setAutoSlow, stormTime } from './clock';
import { buildContent, lockScreenTake } from './notify';
import { EN, ES, t, BANNED } from './copy';
import { CROSSINGS } from './data';
import { ROUTES, crossingsOnRoute, drivePlan } from './drive';

const cache = new Map<string, Compiled>();
const cmpOf = (id: string) => { let c = cache.get(id); if (!c) { c = compileScenario(SCENARIOS.find((s) => s.id === id)!); cache.set(id, c); } return c; };

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
test('clock: closed-form, pause/seek/speed continuity, auto-slow', () => {
  let c = initialClock(-60, 300, 0, 1_000); c = play(c, 1_000);
  expect(simNow(c, 61_000)).toBeCloseTo(60, 9);                         // 60× → 1 sim-hour per wall-minute
  c = setSpeed(c, 10, 61_000); expect(simNow(c, 61_000)).toBeCloseTo(60, 9); expect(simNow(c, 67_000)).toBeCloseTo(61, 9);
  c = pause(c, 67_000); expect(simNow(c, 999_000)).toBeCloseTo(61, 9);
  c = seek(c, 999, 1); expect(simNow(c, 2)).toBe(300);                  // clamped
  // 60× for 10 sim-min (10 s) → 10× for 10 sim-min (60 s)… total wall 60 s = 10 s fast + 50 s slow → 10 + 50/60*10
  expect(advance(0, 60_000, 60, [{ fromMin: 10, toMin: 20 }], 300)).toBeCloseTo(10 + (50 / 60) * 10, 6);
  c = setAutoSlow(setSpeed(play(seek(c, 0, 0), 0), 60, 0), [{ fromMin: 10, toMin: 20 }], 0);
  expect(simNow(c, 10_000)).toBeCloseTo(10, 6); expect(simNow(c, 70_000)).toBeCloseTo(20, 6); expect(simNow(c, 71_000)).toBeCloseTo(21, 6);
  expect(stormTime({ h: 5, m: 50 }, 70, 'en')).toBe('7:00 AM'); expect(stormTime({ h: 5, m: 50 }, 70, 'es')).toBe('7:00 a. m.');
});
test('hero notifications: AVOID 7:00 AM then CLOSED 7:40 AM, both labeled simulated, within length limits', () => {
  const cmp = cmpOf('flash-flood-night'); const plan = planNotifications(cmp);
  expect(plan.map((p) => [p.t, p.state])).toEqual([[70, 'avoid'], [120, 'closed']]);
  for (const lang of ['en', 'es'] as const) for (const p of plan) {
    const c = buildContent(cmp, p, lang);
    expect(c.title.length).toBeLessThanOrEqual(50); expect(c.body.length).toBeLessThanOrEqual(150);
    expect(c.subtitle).toBe(t(lang, 'demo.notify.subtitle')); expect(c.interruptionLevel).toBe('active');
  }
  expect(buildContent(cmp, plan[0]!, 'en')).toMatchObject({ title: 'Avoid Williamson Creek at Jones Road',
    body: 'Likely flooded within 15–30 min. Use another route. Never drive into water.' });
  expect(buildContent(cmp, plan[1]!, 'en').body).toBe("Simulated road crew reports it closed. Turn around, don't drown.");
  const take = lockScreenTake(cmp, plan[0]!, 'en'); expect(take.seekToMin).toBe(69); expect(take.onResponse.seekToMin).toBe(70);
});
test('push titles fit 50 chars for every crossing (else the app must truncate the name, never the state word)', () => {
  const long = CROSSINGS.filter((c) => t('en', 'state.avoid.push_title', { name: c.name }).length > 50 || t('es', 'state.watch.push_title', { name: c.name }).length > 50);
  expect(long.map((c) => c.id)).toEqual(['atx-38', 'hays-663', 'tc-94']);                      // documented in research-data.md §4.2
});
test('demo copy passes the A §3.12 guards (banned words, countdown, spoken)', () => {
  const word = (w: string) => new RegExp(`(?<![\\p{L}\\p{N}])${w.replace(/[-\s]/g, '[-\\s]')}(?![\\p{L}\\p{N}])`, 'iu');
  for (const [lang, d] of [['en', EN], ['es', ES]] as const) for (const [k, v] of Object.entries(d)) {
    const terms = [...BANNED.global[lang], ...BANNED.status[lang]];
    expect({ k, hits: terms.filter((w) => word(w).test(v.toLowerCase())) }).toEqual({ k, hits: [] });
    if (v.includes('{{lo}}')) expect(v).toContain('{{hi}}'); if (v.includes('{{tau_lo}}')) expect(v).toContain('{{tau_hi}}');
    expect(/\b(in|en|within|dentro de)\s+\d+\s*(min|minutes|minutos)\b/i.test(v)).toBe(false);
    if (k.endsWith('.tts') || k.startsWith('drive.tts.')) { expect(/[–—]|\bmin\b|\bft\b|\bmi\b/.test(v)).toBe(false); }
  }
});
test('drive: WATCH at 0 s, merged AVOID at 66 s, ≤ 1 line per crossing per 60 s, silent after the detour', () => {
  const cmp = cmpOf('drive-commute'); const p = drivePlan(cmp, cmp.scenario.drive!);
  expect(crossingsOnRoute(ROUTES.commute.line).map((x) => x.c.id)).toEqual(['atx-37', 'atx-692']);
  expect(crossingsOnRoute(ROUTES.detour.line)).toEqual([]);
  expect(p.utterances.map((u) => [u.tS, u.priority, u.lines.map((l) => l.key).join('+')])).toEqual([
    [0, 1, 'state.watch.tts'], [66, 2, 'drive.tts.multi_changed+state.avoid.tts']]);
  expect(p.lockoutAtS).toBeLessThanOrEqual(10);
  const name = (id: string, l: 'en' | 'es') => CROSSINGS.find((c) => c.id === id)!.spoken?.[l] ?? CROSSINGS.find((c) => c.id === id)!.name;
  for (const l of ['en', 'es'] as const) {
    const said = p.utterances[1]!.lines.map((x) => t(l, x.key, { count: x.count ?? 0, name: x.crossingId ? name(x.crossingId, l) : '' })).join(' ');
    expect(said).toBe(l === 'en' ? '2 crossings ahead changed. Avoid Williamson Creek at Jones Road. Flooding likely soon. Take another route.'
      : 'Cambiaron 2 cruces adelante. Evite Williamson Creek en Jones Road. Inundación probable pronto. Tome otra ruta.');
  }
});
test('storyboard of the Onion Creek storm includes the gauge-silent line', () => {
  const sb = storyboard(cmpOf('onion-creek-storm'));
  expect(sb.find((l) => l.kind === 'gauge_silent')).toMatchObject({ t: 290, crossingId: 'tc-1626', gaugeId: 'USGS-08158827' });
  expect(cmpOf('onion-creek-storm').hero).toMatchObject({ crossingId: 'tc-68', leadMin: 35, inFirstWindow: true });
});
test('compile budget (bun on Linux; budget for an iPhone on Hermes is 10× this)', () => {
  for (const s of SCENARIOS) { const a = performance.now(); compileScenario(s); expect(performance.now() - a).toBeLessThan(60); }
});
