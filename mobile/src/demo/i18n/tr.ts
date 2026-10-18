// mobile/src/demo/i18n/tr.ts — pure, synchronous translator for engine-side builders (notification content, drive speech
// plans, tests). It reads the SAME files i18next uses (src/locales/{en,es}.json), so copy has exactly one source.
// Screens keep using react-i18next's t(); never hard-code copy in demo code.
import en from '../../locales/en.json';
import es from '../../locales/es.json';

export type Lang = 'en' | 'es';
type Dict = Record<string, string>;
const flatten = (o: unknown, p = '', out: Dict = {}): Dict => {
  for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
    if (typeof v === 'string') out[p + k] = v; else flatten(v, `${p}${k}.`, out);
  }
  return out;
};
export const DICT: Record<Lang, Dict> = { en: flatten(en), es: flatten(es) };

const plural = (lang: Lang, n: number): string => {
  try { return new Intl.PluralRules(lang === 'es' ? 'es-US' : 'en-US').select(n); }   // needs 'intl-pluralrules' on Hermes
  catch { return n === 1 ? 'one' : 'other'; }
};

/** i18next-compatible: {{var}} interpolation, `count` selects `_one/_many/_other`. Throws on a missing key or variable
 *  (the copy tests in §28 prove every key the demo uses exists in both languages). */
export function tr(lang: Lang, key: string, vars: Record<string, string | number> = {}): string {
  const d = DICT[lang]; let k = key;
  if (typeof vars.count === 'number' && !(k in d)) {
    const c = `${key}_${plural(lang, vars.count)}`; k = c in d ? c : `${key}_other`;
  }
  const s = d[k]; if (s == null) throw new Error(`missing ${lang}:${key}`);
  return s.replace(/\{\{(\w+)\}\}/g, (_, v: string) => {
    if (!(v in vars)) throw new Error(`missing var ${v} in ${key}`);
    return String(vars[v]);
  });
}
