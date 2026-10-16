import { compileScenario } from './compile';
import { SCENARIOS } from './scenarios';
import { planNotifications, storyboard, silentSpans } from './choreo';
import { ROUTES, PLACES, lengthM, crossingsOnRoute, driveScript, dist } from './drive';
for (const sc of SCENARIOS) {
  const ts = [] as number[]; let cmp!: ReturnType<typeof compileScenario>;
  for (let i = 0; i < 5; i++) { const a = performance.now(); cmp = compileScenario(sc); ts.push(performance.now() - a); }
  console.log(`\n## ${sc.id}: compile ms (5 runs) ${ts.map((x) => x.toFixed(1)).join(' ')}; events ${cmp.events.length}`);
  console.log('notifications', JSON.stringify(planNotifications(cmp)));
  console.log('storyboard', JSON.stringify(storyboard(cmp)));
  console.log('silent', JSON.stringify(silentSpans(cmp)));
  // determinism: compile twice, compare JSON
  const a = JSON.stringify(compileScenario(sc).events), b = JSON.stringify(compileScenario(sc).events);
  console.log('deterministic', a === b, 'hash', Bun.hash(a).toString(16));
}
for (const r of Object.values(ROUTES)) console.log(r.id, 'len m', lengthM(r.line).toFixed(0), 'crossings', crossingsOnRoute(r.line).map((x) => `${x.c.id}@${x.alongM}m off${x.offM.toFixed(0)}`).join(' '));
console.log('home→school straight', dist(PLACES.home.lngLat, PLACES.school.lngLat).toFixed(0));
const hero = compileScenario(SCENARIOS[1]!);
for (const sw of [undefined, 25]) {
  const d = driveScript(hero, { route: 'commute', startSimMin: 71, cruiseMps: 13.4, accelS: 8, switchToDetourAtS: sw });
  console.log('drive detourAt', sw, JSON.stringify(d.utterances), 'lockoutAtS', d.lockoutAtS, 'endS', d.endS);
}
