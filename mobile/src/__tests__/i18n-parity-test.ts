// mobile/src/__tests__/i18n-parity-test.ts — EN and ES carry exactly the same keys and placeholders (01 §3.11, 05 §27.3).
// Plurals: EN has _one/_other; ES has _one/_other and may add _many.
import pending from '../locales/es-pending-review.json';
import { DICT } from '../demo/i18n/tr';

const base = (k: string) => k.replace(/_(one|many|other)$/, '');
const vars = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();

test('identical key sets (plural forms normalized)', () => {
  expect(new Set(Object.keys(DICT.es).map(base))).toEqual(new Set(Object.keys(DICT.en).map(base)));
});

test('every plural has _one and _other in both languages; ES _many only where EN has _other', () => {
  for (const lang of ['en', 'es'] as const) for (const k of Object.keys(DICT[lang]).filter((x) => /_(one|many|other)$/.test(x))) {
    expect(DICT[lang]).toHaveProperty([`${base(k)}_one`]);
    expect(DICT[lang]).toHaveProperty([`${base(k)}_other`]);
  }
  for (const k of Object.keys(DICT.en)) expect({ k, many: k.endsWith('_many') }).toEqual({ k, many: false });
});

test('same {{placeholders}} in EN and ES for every key; no empty strings', () => {
  for (const [k, en] of Object.entries(DICT.en)) {
    const es = DICT.es[k] ?? DICT.es[`${base(k)}_other`];
    expect({ k, es: typeof es }).toEqual({ k, es: 'string' });
    expect({ k, vars: vars(es!) }).toEqual({ k, vars: vars(en) });
    expect(en.trim().length).toBeGreaterThan(0); expect(es!.trim().length).toBeGreaterThan(0);
  }
});

test('es-pending-review.json lists only real ES keys, with their current text (stale entries fail)', () => {
  for (const [k, v] of Object.entries(pending.pending as Record<string, string>)) {
    if (k.startsWith('app.es.json:')) continue;                       // iOS permission text lives in mobile/locales/app.es.json
    expect({ k, v: DICT.es[k] }).toEqual({ k, v });
  }
});
