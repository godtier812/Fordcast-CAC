import { compileScenario } from './compile';
import { resolveKeyframe, planNotifications, storyboard } from './choreo';
import { SCENARIOS } from './scenarios';
import { TAKES } from './takes';
import { displayAt } from './display';
import { stormTime } from './clock';
import { CROSSINGS } from './data';
for (const tk of TAKES) {
  const sc = SCENARIOS.find((s) => s.id === tk.scenario)!; const cmp = compileScenario(sc);
  const at = resolveKeyframe(cmp, { id: tk.id, label: tk.beat, at: tk.at });
  const all = CROSSINGS.map((c) => displayAt(cmp, c.id, at, sc.network)).filter((d) => d.state !== 'no_rise' && !(d.state === 'unknown' && !d.lastKnown && CROSSINGS.find((c) => c.id === d.crossingId)!.tier === 'C'));
  console.log(`${tk.id.padEnd(16)} ${sc.id.padEnd(18)} t=${String(at).padStart(5)} ${stormTime(sc.clockStart, at, 'en').padStart(8)} | ${all.map((d) => `${d.crossingId}:${d.state}${d.window ? `[${d.window.join('–')}]` : ''}${d.lastKnown ? `(lk ${d.lastKnown.state} ${d.lastKnown.ageMin}m)` : ''}${d.held ? '*' : ''}`).join(' ')}`);
}
for (const id of ['flash-flood-night', 'onion-creek-storm']) { const sc = SCENARIOS.find((s) => s.id === id)!; const c = compileScenario(sc);
  console.log(id, 'leads', JSON.stringify(c.leads), 'median', c.medianLead);
  console.log(' storyboard', storyboard(c).map((l) => `${stormTime(sc.clockStart, l.t, 'en')} ${l.kind} ${l.crossingId}`).join(' | '));
  console.log(' notifications', planNotifications(c).map((p) => `${stormTime(sc.clockStart, p.t, 'en')} ${p.state} ${p.crossingId}`).join(' | ')); }
