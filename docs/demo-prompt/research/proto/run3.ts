import { compileScenario } from './compile';
import { SCENARIOS } from './scenarios';
import { ROUTES, lengthM, crossingsOnRoute, drivePlan, BRANCH_ALONG_M } from './drive';
const d = SCENARIOS.find((s) => s.id === 'drive-commute')!; const cmp = compileScenario(d);
for (const r of Object.values(ROUTES)) console.log(r.id, 'len', lengthM(r.line).toFixed(0), 'on route', crossingsOnRoute(r.line).map((x) => `${x.c.id}@${x.alongM}m(off ${x.offM.toFixed(0)})`).join(' '));
console.log('branch along', BRANCH_ALONG_M);
for (const take of [false, true]) {
  const t0 = performance.now(); const p = drivePlan(cmp, { ...d.drive!, takeDetourAtBranch: take }); const ms = performance.now() - t0;
  console.log(`\ntakeDetour=${take} ms=${ms.toFixed(0)} lockoutAtS=${p.lockoutAtS} endS=${p.endS}`);
  for (const u of p.utterances) console.log(' ', JSON.stringify(u));
  console.log(' frames', p.frames.filter((f) => f.tS % 15 === 0).map((f) => `${f.tS}s ${f.route} [${f.ahead.map((a) => `${a.id}:${a.state}@${a.m}`).join(', ')}]`).join(' | '));
}
