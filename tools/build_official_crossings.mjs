// Snapshot of the official ATXfloods low-water crossing inventory around Austin (City of Austin,
// Travis/Hays/Williamson/Bastrop/... counties). Deduped against FordCast's 141 crossings.
// Live closure status is still fetched at runtime; this file just puts every crossing on the map.
// Run: node tools/build_official_crossings.mjs
import fs from 'node:fs';

const ROOT = 'c:/2025AppChallenge/mobile/assets/seed';
const AUSTIN = [30.2672, -97.7431];
const REGION_KM = 70;
const MATCH_KM = 0.12;
const rad = (d) => (d * Math.PI) / 180;
function km(a, b) {
  const dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const res = await fetch('https://api.atxfloods.com/api/crossings', { headers: { 'User-Agent': 'FordCast student prototype' } });
if (!res.ok) throw new Error(`ATXfloods ${res.status}`);
const rows = (await res.json()).attributes ?? [];
const ours = JSON.parse(fs.readFileSync(`${ROOT}/crossings.json`, 'utf8')).features.map((f) => [f.geometry.coordinates[1], f.geometry.coordinates[0]]);

const JURISDICTION = {
  COA: 'City of Austin', TCO: 'Travis County', HCO: 'Hays County', WCO: 'Williamson County', BCO: 'Bastrop County',
  CCO: 'Caldwell County', BURCO: 'Burnet County', BLCO: 'Blanco County', GEO: 'Georgetown', RR: 'Round Rock',
  RRK: 'Round Rock', MBF: 'Marble Falls', SSV: 'Sunset Valley', WLH: 'West Lake Hills', ROL: 'Rollingwood',
  CPK: 'Cedar Park', BCAVE: 'Bee Cave', HSB: 'Horseshoe Bay', BSC: 'Bastrop County', BRC: 'Burnet County',
  LEECO: 'Lee County', 'Bastrop Co': 'Bastrop County', 'BASTROP COUNTY': 'Bastrop County',
  PFL: 'Pflugerville', PFLUGERVILLE: 'Pflugerville', COB: 'City of Bastrop', CLB: 'Blanco County',
  CSM: 'San Marcos', COK: 'City of Kyle', FCO: 'Fayette County', CMF: 'Marble Falls', CLS: 'Lago Vista',
  ALL: 'Central Texas', all: 'Central Texas',
  SM: 'San Marcos', KYLE: 'Kyle', BUDA: 'Buda', PF: 'Pflugerville', CP: 'Cedar Park', LEA: 'Leander', LH: 'Lakeway',
};

const kept = [];
let duplicates = 0;
for (const r of rows) {
  const p = [Number(r.lat), Number(r.lon)];
  if (!Number.isFinite(p[0]) || !Number.isFinite(p[1]) || km(AUSTIN, p) > REGION_KM) continue;
  if (ours.some((o) => km(o, p) < MATCH_KM)) { duplicates++; continue; }
  if (kept.some((k) => km([k.lat, k.lon], p) < 0.02)) continue; // same point listed twice
  const name = String(r.name ?? '').trim().replace(/\s+@\s*$/, '').replace(/\s+/g, ' ') || 'Low-water crossing';
  kept.push({
    id: `atxf-${r.id}`,
    name,
    j: JURISDICTION[String(r.jurisdiction ?? '').trim()] ?? String(r.jurisdiction ?? '').trim(),
    lat: Number(p[0].toFixed(6)),
    lon: Number(p[1].toFixed(6)),
  });
}
fs.writeFileSync(
  `${ROOT}/official_crossings.json`,
  JSON.stringify({ schema: 'fordcast.official-crossings.v1', source: 'ATXfloods (api.atxfloods.com/api/crossings)', generated_at: new Date().toISOString(), region_km: REGION_KM, crossings: kept }),
);
console.log(`ATXfloods rows ${rows.length} · kept ${kept.length} within ${REGION_KM} km · ${duplicates} already in FordCast's 141`);
