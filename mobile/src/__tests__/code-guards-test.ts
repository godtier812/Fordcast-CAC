// mobile/src/__tests__/code-guards-test.ts — static scans (01 §3.11 code guards, §1.3 rule 9, 05 §28.1).
// Forbidden literals are built by concatenation so this file never contains them itself.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '..');
const ROOT = join(SRC, '..');
const walk = (d: string): string[] => readdirSync(d).flatMap((n) => {
  const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p];
});
const code = (dir: string, skipTests = true) => walk(dir).filter((f) => /\.(ts|tsx|js)$/.test(f))
  .filter((f) => !(skipTests && f.includes(`${'__tests__'}`)));
const grep = (files: string[], needle: string) => files.filter((f) => readFileSync(f, 'utf8').includes(needle))
  .map((f) => f.slice(ROOT.length + 1));

test('never the Success haptic (no-green, never-reassuring rule; 03 §15.5)', () => {
  expect(grep(code(SRC), 'NotificationFeedbackType.' + 'Success')).toEqual([]);
});

test('no push tokens anywhere: a free Personal Team has no aps-environment (02 §9.1 rule 5)', () => {
  const files = [...code(SRC), join(ROOT, 'app.config.ts'), ...code(join(ROOT, 'plugins'))];
  for (const fn of ['getExpo' + 'PushTokenAsync', 'getDevice' + 'PushTokenAsync']) expect(grep(files, fn)).toEqual([]);
});

test('no runtime API hosts in the app: only OpenFreeMap tiles (01 §1.3 rule 9)', () => {
  for (const host of ['waterdata.' + 'usgs.gov', 'api.' + 'openrouteservice.org', 'api.weather' + '.gov', 'api.water.' + 'usgs.gov'])
    expect(grep(code(SRC), host)).toEqual([]);
});

test('no hand-typed demo numbers in screens or components: they come from the engine (05 engine rule 3)', () => {
  const ui = ['app', 'components'].flatMap((d) => { try { return code(join(SRC, d)); } catch { return []; } });
  for (const lit of ["'30 " + "min'", "'7:" + "00", "'15–" + "30'", "'50 " + "min'", "'35 " + "min'"]) expect({ lit, files: grep(ui, lit) }).toEqual({ lit, files: [] });
});

test('only voice/haptics.ts imports expo-haptics (two gates, 03 §15.5) — except the Day 1 smoke screen', () => {
  const users = grep(code(SRC), "from 'expo-" + "haptics'").filter((f) => !f.endsWith('voice/haptics.ts') && !f.endsWith('app/smoke.tsx'));
  expect(users).toEqual([]);
});
