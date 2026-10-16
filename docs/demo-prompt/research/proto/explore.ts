import { buildStageFns, truthOnset } from './sim';
import { GAUGES } from './data';
import { SCENARIOS } from './scenarios';
const sc = SCENARIOS.find((s) => s.id === (process.argv[2] ?? 'flash-flood-night'))!;
const fns = buildStageFns(GAUGES, sc.curves);
const g = process.argv[3] ?? 'USGS-08158922';
const f = fns.get(g)!; const row = [] as string[];
for (let t = Number(process.env.T0 ?? 0); t <= Number(process.env.T1 ?? 200); t += 5) row.push(`${t}:${f(t).toFixed(2)}`);
console.log(g, row.join(' '));
for (const cid of (process.argv[4] ?? 'atx-37').split(',')) {
  const tr = sc.truth.find((x) => x.crossingId === cid)!;
  for (const up of (process.argv[5] ?? '6.0,6.4,6.8,7.2,7.6').split(',').map(Number))
    console.log(cid, 'tau', tr.tauTrueMin, 'up', up, 'onset', truthOnset({ ...tr, overtopUpFt: up }, fns, 0, sc.durationMin));
}
