import { compileScenario, stateAt } from './compile';
import { SCENARIOS } from './scenarios';
import { GAUGES, CROSSINGS } from './data';
const id = process.argv[2] ?? 'flash-flood-night';
const sc = SCENARIOS.find((s) => s.id === id)!;
const t0 = performance.now();
const cmp = compileScenario(sc);
const ms = performance.now() - t0;
const clock = (t: number) => { const m = sc.clockStart.h * 60 + sc.clockStart.m + t; const h = Math.floor(((m % 1440) + 1440) % 1440 / 60), mm = ((m % 60) + 60) % 60; return `${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}`; };
console.log(`# ${sc.id} compiled in ${ms.toFixed(1)} ms; events=${cmp.events.length}`);
for (const c of CROSSINGS) {
  const ini = cmp.initial.get(c.id)!; const evs = cmp.events.filter((e) => e.crossingId === c.id);
  if (!evs.length && process.argv[3] !== 'all') { continue; }
  console.log(`\n${c.id} ${c.name} [tier ${c.tier}] initial=${ini.state}`);
  for (const e of evs) console.log(`  t=${String(e.t).padStart(3)} ${clock(e.t)} ${e.state.padEnd(7)} win=${e.window?.join('–') ?? '-'} held=${e.held} ${e.reasons.map((r) => r.code + ('rise_ft_30m' in r ? `(+${r.rise_ft_30m}ft,${'value_ft' in r ? r.value_ft : ''}ft${'tau_lo_min' in r ? `,τ${r.tau_lo_min}–${r.tau_hi_min}` : ''})` : '')).join(',')}${e.lastKnown ? ` lastKnown=${e.lastKnown.state}@${e.lastKnown.at}` : ''}`);
}
console.log('\nonsets:', [...cmp.onsets].map(([k, v]) => `${k}@${v}(${v == null ? '-' : clock(v)})`).join(' '));
console.log('leads:', JSON.stringify(cmp.leads), 'median', cmp.medianLead, 'hero', JSON.stringify(cmp.hero));
const gl = process.argv[4]?.split(',') ?? [];
for (const g of gl) { const rs = cmp.readings.get(g)!; console.log(g, rs.filter((r) => r.obsMin >= 0 && r.obsMin % 15 === 0).slice(0, 30).map((r) => `${r.obsMin}:${r.ft}`).join(' ')); }
