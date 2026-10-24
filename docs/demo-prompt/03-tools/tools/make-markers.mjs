// tools/make-markers.mjs — FordCast map marker sprites (Demo Edition, 03 §14.3).
// Run on the Mac:  cd tools && npm install && node make-markers.mjs --out ../mobile/assets/map/markers
// Draws the StatusGlyph geometry (24-unit grid, 03 §14.2) as SVG, rasterizes with @resvg/resvg-js 2.6.2,
// writes <name>@2x.png (96 px) and <name>@3x.png (144 px) on a 48 pt transparent canvas, plus tools/out/markers-contact-sheet.png
// (review only; never bundled). Deterministic: same code → pixel-identical PNGs.
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outArg = process.argv.indexOf('--out');
const OUT = outArg > 0 ? process.argv[outArg + 1] : '../mobile/assets/map/markers';
mkdirSync(OUT, { recursive: true });

const C = { slate: '#8A97AB', unknown: '#7A879C', amber: '#F5A623', red: '#C62828', ink: '#0E1726', land: '#0B1320',
  white: '#FFFFFF', ice: '#F2F5FA', cyan: '#2BD9D9' };
const OCT = '21.70,16.02 16.02,21.70 7.98,21.70 2.30,16.02 2.30,7.98 7.98,2.30 16.02,2.30 21.70,7.98';
const CANVAS = 48;                                   // pt; every sprite is centered in a 48 × 48 pt canvas

// Each glyph is drawn in a 24-unit box; place(sizePt, dx, dy) maps it to `sizePt` points centered at (24+dx, 24+dy).
const place = (s, dx = 0, dy = 0, body) =>
  `<g transform="translate(${24 + dx - s / 2} ${24 + dy - s / 2}) scale(${s / 24})">${body}</g>`;
const ring = (stroke, w = 2.5, r = 8) => `<circle cx="12" cy="12" r="${r}" fill="none" stroke="${stroke}" stroke-width="${w}"/>`;
const watch = (outline) =>
  (outline ? `<path d="M12 3.2 L21.4 19.6 L2.6 19.6 Z" fill="${C.land}" stroke="${C.land}" stroke-width="4.6" stroke-linejoin="round"/>` : '') +
  `<path d="M12 3.2 L21.4 19.6 L2.6 19.6 Z" fill="${C.amber}" stroke="${C.amber}" stroke-width="2.4" stroke-linejoin="round"/>` +
  `<path d="M12 9.2 V13.6" stroke="${C.ink}" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="16.6" r="1.35" fill="${C.ink}"/>`;
const octagon = (rim) => `<polygon points="${OCT}" fill="${C.red}" stroke="${rim ? C.white : C.red}" stroke-width="${rim ? 2 : 1.6}" stroke-linejoin="round"/>`;
const avoid = (rim) => octagon(rim) +
  `<path d="M12 6.8 V13.2" stroke="${C.white}" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="16.9" r="1.5" fill="${C.white}"/>`;
let clipN = 0;
const closed = (rim) => { const id = `oct${++clipN}`;
  return `<defs><clipPath id="${id}"><polygon points="${OCT}"/></clipPath></defs>` + octagon(rim) +
    `<g clip-path="url(#${id})"><path d="M0 15.5 L15.5 0 M2 22 L22 2 M8.5 24 L24 8.5" stroke="${C.white}" stroke-width="2.6"/></g>` +
    (rim ? `<polygon points="${OCT}" fill="none" stroke="${C.white}" stroke-width="2" stroke-linejoin="round"/>` : ''); };
const unknown = () =>
  `<circle cx="12" cy="12" r="8.5" fill="${C.land}" fill-opacity="0.55" stroke="${C.unknown}" stroke-width="2" stroke-dasharray="3 3"/>` +
  `<path d="M9.6 9.4 a2.5 2.5 0 1 1 3.6 2.2 c-0.8 0.4 -1.2 0.9 -1.2 1.8 v0.5" fill="none" stroke="${C.slate}" stroke-width="2" stroke-linecap="round"/>` +
  `<circle cx="12" cy="16.6" r="1.2" fill="${C.slate}"/>`;
// last-known badge: the old state's shape (12 pt) inside a dashed 17 pt rounded frame at the top-right of the 24 pt ring
const lastKnown = (inner) =>
  `<rect x="${24 + 9 - 8.5}" y="${24 - 9 - 8.5}" width="17" height="17" rx="4" fill="${C.land}" stroke="${C.unknown}" stroke-width="1.5" stroke-dasharray="2.5 2"/>` +
  place(12, 9, -9, inner);
const shieldBadge = () =>
  `<g transform="translate(${24 + 10 - 7} ${24 - 10 - 7})"><path d="M7 0.8 L12.8 2.8 V7.2 C12.8 10.6 10.4 12.6 7 13.6 C3.6 12.6 1.2 10.6 1.2 7.2 V2.8 Z"` +
  ` fill="${C.ice}" stroke="${C.land}" stroke-width="1"/></g>`;
const flowArrow = () => place(12, 0, 0, `<path d="M8 5 L15 12 L8 19" fill="none" stroke="${C.cyan}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`);

export const SPRITES = {
  'ic-norise': place(14, 0, 0, ring(C.slate, 2.6, 8.2) + `<circle cx="12" cy="12" r="6.9" fill="${C.land}" fill-opacity="0.55"/>`),
  'ic-watch': place(28, 0, 0, watch(true)),
  'ic-avoid': place(32, 0, 0, avoid(true)),
  'ic-closed': place(32, 0, 0, closed(true)),
  'ic-closed-official': place(32, 0, 0, closed(true)) + shieldBadge(),
  'ic-unknown': place(24, 0, 0, unknown()),
  'ic-unknown-lastwatch': place(24, -2, 2, unknown()) + lastKnown(watch(false)),
  'ic-unknown-lastavoid': place(24, -2, 2, unknown()) + lastKnown(avoid(false)),
  'ic-unknown-lastclosed': place(24, -2, 2, unknown()) + lastKnown(closed(false)),
  'ic-flow-arrow': flowArrow(),
  'ic-gauge-silent': place(14, 0, 0, `<circle cx="12" cy="12" r="8.5" fill="${C.land}" stroke="${C.unknown}" stroke-width="2.4" stroke-dasharray="3.2 2.6"/>`),
};

const svg = (body, size = CANVAS) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${CANVAS} ${CANVAS}">${body}</svg>`;
const png = (body, px, bg) => new Resvg(svg(body), { fitTo: { mode: 'width', value: px }, ...(bg ? { background: bg } : {}) }).render().asPng();

for (const [name, body] of Object.entries(SPRITES)) {
  writeFileSync(join(OUT, `${name}@2x.png`), png(body, 96));
  writeFileSync(join(OUT, `${name}@3x.png`), png(body, 144));
}
// contact sheet for review (not bundled): every sprite at @3x on the map land color, 5 per row
const names = Object.keys(SPRITES); const cell = 60; const cols = 5; const rows = Math.ceil(names.length / cols);
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cell}" height="${rows * cell}" viewBox="0 0 ${cols * cell} ${rows * cell}">` +
  `<rect width="100%" height="100%" fill="${C.land}"/>` +
  names.map((n, i) => `<g transform="translate(${(i % cols) * cell + 6} ${Math.floor(i / cols) * cell + 6})">${SPRITES[n]}</g>`).join('') + '</svg>';
const REVIEW = fileURLToPath(new URL('./out/', import.meta.url)); mkdirSync(REVIEW, { recursive: true });
writeFileSync(join(REVIEW, 'markers-contact-sheet.png'), new Resvg(sheet, { fitTo: { mode: 'width', value: cols * cell * 3 } }).render().asPng());
console.log(`wrote ${names.length * 2} sprites to ${OUT}`);
