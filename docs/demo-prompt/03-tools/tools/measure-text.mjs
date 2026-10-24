// tools/measure-text.mjs — width of UI strings in Inter (the app font), for the 04 §19 fit checks.
// Run on the Mac:  cd tools && npm install && node measure-text.mjs '[["label.lg","Check my drive"],["title.lg","Williamson Creek at Jones Road",1.353]]'
// Width = sum of glyph advances with kerning + letterSpacing × characters (React Native applies tracking per character).
// Variants mirror 03 §13.9 (size, weight, tracking). Third item = fontScale (Dynamic Type), default 1.
import opentype from 'opentype.js';
import { fileURLToPath } from 'node:url';
const base = fileURLToPath(new URL('./node_modules/@expo-google-fonts/inter/', import.meta.url));
const F = { 400: opentype.loadSync(base + '400Regular/Inter_400Regular.ttf'), 500: opentype.loadSync(base + '500Medium/Inter_500Medium.ttf'),
  600: opentype.loadSync(base + '600SemiBold/Inter_600SemiBold.ttf'), 700: opentype.loadSync(base + '700Bold/Inter_700Bold.ttf') };
export const TYPE = { 'display.xl': [56, 700, -1.25], 'display.lg': [44, 700, -0.98], 'display.md': [34, 700, -0.74], 'title.lg': [28, 600, -0.59],
  'title.md': [22, 600, -0.40], 'title.sm': [20, 600, -0.33], headline: [17, 600, -0.22], 'body.lg': [17, 400, -0.22], 'body.md': [15, 400, -0.13],
  callout: [16, 500, -0.18], 'label.lg': [15, 600, -0.13], 'label.chip': [13, 700, 0.6], 'status.word': [18, 600, -0.25], caption: [13, 400, -0.04],
  'caption.sm': [12, 500, 0], 'num.xl': [40, 600, -0.89], 'num.lg': [28, 600, -0.59], 'num.md': [17, 600, -0.22],
  'drive.primary': [32, 700, -0.6], 'drive.secondary': [24, 600, -0.4] };
export function width(variant, text, fontScale = 1) {
  const [size, weight, tracking] = TYPE[variant];
  const t = variant === 'label.chip' ? text.toUpperCase() : text;
  return F[weight].getAdvanceWidth(t, size * fontScale, { kerning: true }) + tracking * [...t].length;
}
export function lines(variant, text, boxWidth, fontScale = 1) {           // greedy word wrap, like UIKit for Latin text
  let n = 1, cur = '';
  for (const word of text.split(' ')) { const next = cur ? `${cur} ${word}` : word;
    if (width(variant, next, fontScale) <= boxWidth) cur = next; else { n += 1; cur = word; } }
  return n;
}
if (process.argv[1] && process.argv[1].endsWith('measure-text.mjs')) {
  for (const [v, t, s] of JSON.parse(process.argv[2] ?? '[]'))
    console.log(`${width(v, t, s ?? 1).toFixed(1).padStart(7)}  ${v}${s ? ` ×${s}` : ''}  ${JSON.stringify(t)}`);
}
