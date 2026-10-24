import { compileScenario } from './compile';
import { SCENARIOS } from './scenarios';
import { drivePlan } from './drive';
for (const s of SCENARIOS) { const xs: number[] = []; for (let i = 0; i < 30; i++) { const a = performance.now(); compileScenario(s); xs.push(performance.now() - a); }
  xs.sort((a, b) => a - b); console.log(s.id.padEnd(18), 'median ms', xs[15]!.toFixed(2), 'max', xs.at(-1)!.toFixed(2)); }
const d = SCENARIOS[3]!; const c = compileScenario(d); const a = performance.now(); drivePlan(c, d.drive!); console.log('drivePlan ms', (performance.now() - a).toFixed(1));
