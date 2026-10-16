import { compileScenario } from './compile';
import { SCENARIOS } from './scenarios';
import { visible } from './sim';
import { latest, rise, lastUpcrossingTime, toWindow, tauRange } from './engine';
import { LINKS } from './data';
const cmp = compileScenario(SCENARIOS[1]!);
const rs = cmp.readings.get('USGS-08158922')!;
for (const t of [55, 70, 75, 85]) {
  const s = visible(rs, t); const n = latest(s)!; const l = LINKS.find((x) => x.crossingId === 'atx-37')!;
  const r30 = rise(s, 30); const tc = lastUpcrossingTime(s, l.triggerFt);
  const etaMid = tc == null ? null : l.lagMin - (t - tc);
  const etaLo = etaMid == null ? null : Math.max(0, etaMid - (l.lagMin - l.lagP25Min));
  const etaHi = etaMid == null ? null : Math.max(etaLo!, etaMid + (l.lagP75Min - l.lagMin));
  console.log({ t, newestObs: n.obsMin, avail: n.availMin, S: n.ft, r30: r30?.toFixed(2), tCross: tc?.toFixed(1), etaMid: etaMid?.toFixed(1), etaLo: etaLo?.toFixed(1), etaHi: etaHi?.toFixed(1), win: etaLo == null ? null : toWindow(etaLo, etaHi!), watchFt: l.watchFt, trig: l.triggerFt, tau: tauRange(l) });
}
console.log(rs.filter(r => r.obsMin >= 0 && r.obsMin <= 120).map(r => `${r.obsMin}:${r.ft}`).join(' '));
