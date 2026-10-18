// mobile/src/__tests__/copy-banned-test.ts — 01 §3.11 copy guards over the FULL locale files (EN + ES):
// banned words (global + status scope, allow-listed negations), countdown guard, spoken guard, demo agency guard.
import banned from '../locales/banned-words.json';
import { DICT, type Lang } from '../demo/i18n/tr';

const LANGS: Lang[] = ['en', 'es'];
const matches = (pattern: string, key: string) => (pattern.endsWith('*') ? key.startsWith(pattern.slice(0, -1)) : key === pattern);
const allowListed = (key: string) => banned.allowKeys.some((p) => matches(p, key));
const isChrome = (key: string) => banned.chromeNamespaces.some((ns) => key.startsWith(ns));
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const word = (w: string) => new RegExp(`(?<![\\p{L}\\p{N}])${esc(w).replace(/[-\s]/g, '[-\\s]')}(?![\\p{L}\\p{N}])`, 'iu');
const hits = (list: string[], v: string) => list.filter((w) => word(w).test(v));
/** 01 §3.11: `*_spoken*`, `*.spoken*`, `*.tts`, `drive.tts.*`, `drive.start_tts`. */
const isSpoken = (k: string) => k.includes('_spoken') || k.includes('.spoken') || k.endsWith('.tts') || k.startsWith('drive.tts.')
  || k === 'drive.start_tts';
const entries = (lang: Lang) => Object.entries(DICT[lang]);

test('no banned word in any key (status words outside chrome namespaces); allow-listed keys must negate', () => {
  for (const lang of LANGS) for (const [k, v] of entries(lang)) {
    const found = [...hits(banned.global[lang], v), ...(isChrome(k) ? [] : hits(banned.status[lang], v))];
    if (allowListed(k)) {
      if (found.length) expect({ k, negated: banned.negationTokens.some((n) => v.toLowerCase().includes(n)) }).toEqual({ k, negated: true });
    } else expect({ lang, k, found }).toEqual({ lang, k, found: [] });
  }
});

test('countdown guard: ranges only, never a single-number ETA or a range that starts at 0 / now', () => {
  for (const lang of LANGS) for (const [k, v] of entries(lang)) {
    if (v.includes('{{lo}}')) expect({ k, hasHi: v.includes('{{hi}}') }).toEqual({ k, hasHi: true });
    if (v.includes('{{tau_lo}}')) expect({ k, hasTauHi: v.includes('{{tau_hi}}') }).toEqual({ k, hasTauHi: true });
    expect({ k, forbiddenVar: /\{\{(eta|minutes|countdown|tau)\}\}/.test(v) }).toEqual({ k, forbiddenVar: false });
    if (!isChrome(k)) expect({ k, inN: /\b(in|en|within|dentro de)\s+\d+\s*(min|minutes|minutos)\b/i.test(v) }).toEqual({ k, inN: false });
    expect({ k, zeroRange: /(now|ahora)\s*–|(?<!\d)0\s*[–-]\s*\d/i.test(v) }).toEqual({ k, zeroRange: false });
  }
});

test('spoken guard: no dashes, "min" or "ft" in anything a voice reads', () => {
  for (const lang of LANGS) for (const [k, v] of entries(lang)) if (isSpoken(k))
    expect({ k, bad: /[–—]|\bmin\b|\bft\b|\bmi\b/.test(v) }).toEqual({ k, bad: false });
});

test('demo guard: no real agency name outside the credit and legal keys', () => {
  for (const lang of LANGS) for (const [k, v] of entries(lang)) {
    if (banned.agencyAllowKeys.some((p) => matches(p, k))) continue;
    expect({ k, agencies: banned.agencyNames.filter((a) => v.includes(a)) }).toEqual({ k, agencies: [] });
  }
});

test('the guards themselves catch what they should (canaries)', () => {
  expect(hits(banned.global.en, 'This route is safe')).toEqual(['safe']);
  expect(hits(banned.global.en, 'Delivered')).toEqual([]);
  expect(hits(banned.global.es, 'El camino está despejado')).toEqual(['despejado']);
  expect(hits(banned.status.en, 'Look out for water')).toEqual([]);
  expect(/\b(in|en|within|dentro de)\s+\d+\s*(min|minutes|minutos)\b/i.test('Flooded in 15 min')).toBe(true);
  expect(/(now|ahora)\s*–|(?<!\d)0\s*[–-]\s*\d/i.test('0–15 min')).toBe(true);
  expect(/(now|ahora)\s*–|(?<!\d)0\s*[–-]\s*\d/i.test('30–45 min')).toBe(false);
});
