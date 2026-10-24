// tools/validate-style.mjs — validates a style JSON with the same style-spec version MapLibre RN 11.5.0 depends on (26.2.1).
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { readFileSync } from 'node:fs';
const style = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const errors = validateStyleMin(style);
if (errors.length) { for (const e of errors) console.error(e.message); process.exit(1); }
const bad = style.layers.filter((l) => l.layout?.['text-font'] && !JSON.stringify(l.layout['text-font']).includes('Noto Sans'));
if (bad.length) { console.error('non-Noto text-font:', bad.map((l) => l.id)); process.exit(1); }
console.log(`OK: ${style.layers.length} layers, sources: ${Object.keys(style.sources).join(', ')}`);
