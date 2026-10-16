// tools/make-style.mjs — "FordCast Night" basemap from OpenFreeMap Positron (Demo Edition, 03 §13.8).
// Run on the Mac:  cd tools && npm install && curl -fsSL https://tiles.openfreemap.org/styles/positron -o vendor/positron.json
//                  node make-style.mjs vendor/positron.json > ../mobile/assets/map/fordcast-night.json
//                  node validate-style.mjs ../mobile/assets/map/fordcast-night.json
// Zero dependencies. Deterministic: same input → byte-identical output.
import { readFileSync } from 'node:fs';

const src = JSON.parse(readFileSync(process.argv[2], 'utf8').replaceAll('__TILEJSON_DOMAIN__', 'tiles.openfreemap.org'));
const C = { bg: '#0B1320', res: '#0F1A2B', park: '#0F1F24', water: '#0F2236', waterway: '#1E4A63', building: '#121C2E',
  minor: '#1A2638', major: '#24344D', motorway: '#31445F', casing: '#0B1320', rail: '#1A2436', boundary: '#2A3A55',
  lroad: '#8A97AB', lplace: '#A9B4C4', lwater: '#5F87A3' };
const FONT = { Regular: ['Noto Sans Regular'], Bold: ['Noto Sans Bold'], Italic: ['Noto Sans Italic'] };

const keepSources = { openmaptiles: src.sources.openmaptiles };          // drops ne2_shaded raster + anything else
const layers = [];
for (const l0 of src.layers) {
  if (l0.type !== 'background' && l0.source !== 'openmaptiles') continue;
  const l = structuredClone(l0); const sl = l['source-layer']; const id = l.id; const p = (l.paint ??= {});
  const hide = () => { (l.layout ??= {}).visibility = 'none'; };
  if (l.type === 'background') p['background-color'] = C.bg;
  else if (sl === 'water' && l.type === 'fill') p['fill-color'] = C.water;
  else if (sl === 'waterway' && l.type === 'line') p['line-color'] = C.waterway;
  else if (sl === 'park' || (sl === 'landcover' && l.type === 'fill')) p['fill-color'] = C.park;
  else if (sl === 'landuse') p['fill-color'] = C.res;
  else if (sl === 'building') { p['fill-color'] = C.building; delete p['fill-outline-color']; }
  else if (sl === 'aeroway') { if (l.type === 'fill') p['fill-color'] = C.minor; else p['line-color'] = C.minor; }
  else if (sl === 'transportation' && l.type === 'fill') p['fill-color'] = C.minor;
  else if (sl === 'transportation' && l.type === 'line')
    p['line-color'] = id.includes('casing') ? C.casing : id.includes('motorway') ? C.motorway
      : id.includes('major') ? C.major : id.includes('rail') ? C.rail : C.minor;
  else if (sl === 'boundary') p['line-color'] = C.boundary;
  else if (l.type === 'symbol') {
    if (id.includes('shield') || sl === 'aerodrome_label') { hide(); }
    const isWater = sl === 'water_name' || sl === 'waterway';
    p['text-color'] = isWater ? C.lwater : sl === 'transportation_name' ? C.lroad : C.lplace;
    p['text-halo-color'] = C.bg; p['text-halo-width'] = 1.5; delete p['text-halo-blur'];
    const lay = (l.layout ??= {}); const f = JSON.stringify(lay['text-font'] ?? []);
    lay['text-font'] = f.includes('Italic') ? FONT.Italic : f.includes('Bold') ? FONT.Bold : FONT.Regular;
    if (sl === 'transportation_name') l.minzoom = Math.max(l.minzoom ?? 0, 13);   // road labels from z13 (04 §20.9 polish #3)
  }
  layers.push(l);
}
// Insert the anchor FordCast's own layers go *below* (keeps place labels on top of creeks/route; 04 §17.6).
const firstLabel = layers.findIndex((l) => l.type === 'symbol');
layers.splice(firstLabel, 0, { id: 'fordcast-anchor', type: 'background', layout: { visibility: 'none' }, paint: {} });

const out = { version: 8, name: 'FordCast Night', sources: keepSources, sprite: src.sprite, glyphs: src.glyphs, layers };
process.stdout.write(JSON.stringify(out, null, 1) + '\n');
