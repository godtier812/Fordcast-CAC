// Capture public road geometry for a labelled, review-only router-outage fallback.
import { writeFile } from 'node:fs/promises';
const austin = { lat: 30.2672, lon: -97.7431 };
const pairs = [
  [austin, { lat: 30.1755, lon: -97.7429 }],
  [{ lat: 30.2449, lon: -97.8017 }, { lat: 30.2849, lon: -97.7341 }],
  [{ lat: 30.3694, lon: -97.7867 }, { lat: 30.4021, lon: -97.7259 }],
  [austin, { lat: 30.628, lon: -96.3344 }],
];
const presets = [];
for (const [origin, destination] of pairs) {
  const response = await fetch('https://valhalla1.openstreetmap.de/route', {
    method: 'POST', signal: AbortSignal.timeout(20000),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locations: [origin, destination], costing: 'auto', directions_options: { units: 'kilometers' } }),
  });
  if (!response.ok) throw new Error(`Router ${response.status}`);
  const { trip } = await response.json();
  if (!trip?.legs?.length || !Number.isFinite(trip.summary?.length) || !Number.isFinite(trip.summary?.time)) throw new Error('Invalid route');
  presets.push({ origin, destination, shapes: trip.legs.map(l => l.shape), km: trip.summary.length, min: trip.summary.time / 60 });
}
await writeFile(new URL('../mobile/assets/demo/commute_presets.json', import.meta.url), JSON.stringify({
  source: 'Valhalla / OpenStreetMap', capturedAt: new Date().toISOString(),
  purpose: 'Recorded geometry for review during router outages. No live detour or navigation guarantee.', presets,
}, null, 2) + '\n');
console.log(`Captured ${presets.length} preset routes`);
