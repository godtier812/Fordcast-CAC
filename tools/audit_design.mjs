import { readdir, readFile, writeFile } from 'node:fs/promises';
const files = [];
async function walk(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const name = `${dir}/${item.name}`;
    if (item.isDirectory()) { if (item.name !== '__tests__') await walk(name); }
    else if (/\.(tsx?|js|json)$/.test(name)) files.push(name);
  }
}
await walk('mobile/src');
files.push('extension/fordcast.js', 'extension/panel.css', 'FordCast_CAC_Submission.md');
const rules = {
  emDash: /—/g, arrow: /→/g,
  emoji: /[\u{1F300}-\u{1FAFF}]|[⚠★☆✨]/gu,
  leftStripe: /borderLeftWidth:\s*[345]|border-left/g,
  pill: /borderRadius:\s*999/g,
  purple: /#(?:8B5CF6|6366F1|A855F7|7C3AED)/gi,
  shadow: /shadowRadius|elevation:|boxShadow/g,
};
const rows = [];
for (const file of files) {
  const lines = (await readFile(file, 'utf8')).split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const [kind, regex] of Object.entries(rules)) {
      const count = [...lines[i].matchAll(regex)].length;
      if (count) rows.push({ kind, file, line: i + 1, count, text: lines[i].trim() });
    }
  }
}
const luminance = hex => {
  const rgb = hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
};
const contrast = [];
for (const fg of ['#2BD9D9','#F5A623','#FF5470','#7A879C','#9AABC2','#A8B8CD']) {
  for (const bg of ['#070B12','#0D1420','#131C2B','#1B273A','#24334B']) {
    const a = luminance(fg), b = luminance(bg);
    contrast.push({ fg, bg, ratio: +((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(2) });
  }
}
const totals = Object.fromEntries(Object.keys(rules).map(k => [k, rows.filter(r => r.kind === k).reduce((sum,r) => sum + r.count, 0)]));
const output = process.argv[2] ?? 'docs/results/cac-round7-evidence/design-inventory.json';
await writeFile(output, JSON.stringify({ scope: 'Literal source counts, including comments and null placeholders; not visible-element counts.', totals, contrast, rows }, null, 2) + '\n');
console.log(JSON.stringify({ totals, bodyContrastFailures: contrast.filter(p => p.ratio < 4.5) }, null, 2));
