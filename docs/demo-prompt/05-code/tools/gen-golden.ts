// tools/gen-golden.ts — writes the golden fixtures (01 §1.8, §23.6). Run from the REPO ROOT on Day 2:
//   npx --yes tsx@4.23.15 tools/gen-golden.ts             → reference engine (docs/demo-prompt/05-code; same events as research/proto/)
//   npx --yes tsx@4.23.15 tools/gen-golden.ts --from=app  → the app's own engine; ONLY after the Day 6 gate, ONLY with a reason
//                                                           written first in docs/decisions/golden-changes.md (stop-and-ask, 01 §1.7)
// Output: mobile/src/demo/__fixtures__/<scenario>.compiled.json + golden-hashes.json. Never imported by the app.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

async function main() {
  if (!existsSync('mobile/package.json')) throw new Error('run from the repo root');
  const fromApp = process.argv.includes('--from=app');
  const root = resolve(fromApp ? 'mobile/src/demo' : 'docs/demo-prompt/05-code/mobile/src/demo');
  const { compileScenario } = await import(join(root, 'scenario/compile'));
  const { SCENARIOS } = await import(join(root, 'scenario/scenarios'));
  const { toGolden } = await import(join(root, 'scenario/golden'));
  const out = resolve('mobile/src/demo/__fixtures__'); mkdirSync(out, { recursive: true });
  const hashes: Record<string, string> = {};
  for (const s of SCENARIOS) {
    const g = toGolden(compileScenario(s)); hashes[s.id] = g.eventsHash;
    writeFileSync(join(out, `${s.id}.compiled.json`), JSON.stringify(g) + '\n');
  }
  writeFileSync(join(out, 'golden-hashes.json'), JSON.stringify(hashes, null, 2) + '\n');
  console.log(`golden (${fromApp ? 'app engine' : 'reference engine'}):`, hashes);
}
main().catch((e) => { console.error(e); process.exit(1); });
