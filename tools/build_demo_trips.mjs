// Builds mobile/assets/demo/trips.json: one moving-car demo trip per storm drill.
// For each storm we find a real road trip whose normal (fastest) route drives through the
// crossing that flooded in that storm, then precompute the reroute that avoids it.
// Routing: Valhalla public server (OpenStreetMap). Run: node tools/build_demo_trips.mjs
import fs from 'node:fs';

const ROOT = 'c:/2025AppChallenge/mobile/assets';
const crossings = JSON.parse(fs.readFileSync(`${ROOT}/seed/crossings.json`, 'utf8')).features;
const VALHALLA = 'https://valhalla1.openstreetmap.de/route';
const STORMS = ['halloween-2013', 'memorial-day-2015', 'halloween-2015', 'oct-2018', 'july-2025'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function decode6(str) {
  let index = 0, lat = 0, lon = 0;
  const out = [];
  while (index < str.length) {
    for (const which of [0, 1]) {
      let result = 0, shift = 0, b;
      do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      const d = result & 1 ? ~(result >> 1) : result >> 1;
      if (which === 0) lat += d; else lon += d;
    }
    out.push([lat / 1e6, lon / 1e6]);
  }
  return out;
}
const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;
function distM(a, b) {
  const dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function offset([lat, lon], bearingDeg, km) {
  const d = (km * 1000) / R, br = rad(bearingDeg), la = rad(lat), lo = rad(lon);
  const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(br));
  const lo2 = lo + Math.atan2(Math.sin(br) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
  return [(la2 * 180) / Math.PI, (lo2 * 180) / Math.PI];
}
// Distance from point p to segment ab in metres (equirectangular, fine at city scale).
function segDistM(p, a, b) {
  const k = Math.cos(rad(p[0]));
  const ax = (a[1] - p[1]) * k, ay = a[0] - p[0], bx = (b[1] - p[1]) * k, by = b[0] - p[0];
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)));
  const x = ax + t * dx, y = ay + t * dy;
  return Math.sqrt(x * x + y * y) * 111320;
}
function nearestOnRoute(coords, p) {
  let best = { i: 0, d: Infinity };
  for (let i = 0; i + 1 < coords.length; i++) {
    const d = segDistM(p, coords[i], coords[i + 1]);
    if (d < best.d) best = { i, d };
  }
  return best;
}
function cumulative(coords) {
  const c = [0];
  for (let i = 1; i < coords.length; i++) c.push(c[i - 1] + distM(coords[i - 1], coords[i]));
  return c;
}

async function route(locations, exclude = []) {
  const body = {
    locations: locations.map(([lat, lon], i) => ({ lat, lon, type: i === 0 || i === locations.length - 1 ? 'break' : 'through' })),
    costing: 'auto',
    exclude_locations: exclude.map(([lat, lon]) => ({ lat, lon })),
    directions_options: { units: 'kilometers' },
  };
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await sleep(1100); // public server fair use: ~1 request / second
      const res = await fetch(VALHALLA, { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'FordCast student prototype' }, body: JSON.stringify(body) });
      if (res.status === 400) return null; // no route
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      const coords = j.trip.legs.flatMap((l) => decode6(l.shape));
      return { coords, km: j.trip.summary.length, min: j.trip.summary.time / 60 };
    } catch (e) {
      console.warn('  retry', e.message);
      await sleep(2000 * (attempt + 1));
    }
  }
  return null;
}

function simplify(coords, maxPts = 500) {
  if (coords.length <= maxPts) return coords;
  const step = coords.length / maxPts;
  const out = [];
  for (let i = 0; i < maxPts; i++) out.push(coords[Math.floor(i * step)]);
  out.push(coords[coords.length - 1]);
  return out;
}
const round = (cs) => cs.map(([a, b]) => [Number(a.toFixed(6)), Number(b.toFixed(6))]);

const trips = [];
for (const stormId of STORMS) {
  const replay = JSON.parse(fs.readFileSync(`${ROOT}/replays/${stormId}.json`, 'utf8'));
  const firstAvoid = replay.events.find((e) => e.state === 'avoid');
  const firstWatch = replay.events.find((e) => e.state === 'watch');
  const trigger = firstAvoid ?? firstWatch;
  if (!trigger) { console.log(stormId, 'no events'); continue; }
  const hero = crossings.find((f) => f.properties.id === trigger.crossing_id);
  const C = [hero.geometry.coordinates[1], hero.geometry.coordinates[0]];
  // Treat crossings on the same structure (within 400 m) as one hazard.
  const cluster = crossings
    .filter((f) => distM(C, [f.geometry.coordinates[1], f.geometry.coordinates[0]]) < 400)
    .map((f) => f.properties.id);
  const excludePts = cluster.map((id) => {
    const f = crossings.find((x) => x.properties.id === id);
    return [f.geometry.coordinates[1], f.geometry.coordinates[0]];
  });
  console.log(`\n${stormId}: ${hero.properties.name} (${trigger.state} at ${trigger.t}) cluster=${cluster.join(',')}`);

  // Collect several real trips that use this crossing so storms sharing a crossing get different drives.
  const passing = [];
  outer: for (const km of [2.2, 3.2, 4.2]) {
    for (let b = 0; b < 360; b += 30) {
      for (const skew of [0, 30, -30]) {
        const O = offset(C, b, km), D = offset(C, b + 180 + skew, km);
        const r = await route([O, D]);
        if (!r) continue;
        const near = nearestOnRoute(r.coords, C);
        console.log(`  try b=${b} skew=${skew} km=${km}: ${r.km.toFixed(1)} km, passes ${near.d.toFixed(0)} m from crossing`);
        const dup = passing.some((p) => distM(p.O, O) < 800 && distM(p.D, D) < 800);
        if (near.d <= 45 && r.km < 14 && !dup) passing.push({ O, D, r, near, forced: false });
        if (passing.length >= 4) break outer;
      }
    }
  }
  passing.sort((a, b) => a.r.km - b.r.km);
  const usedBefore = trips.filter((t) => t.crossingId === hero.properties.id).length;
  let best = passing[usedBefore % Math.max(1, passing.length)] ?? null;
  if (!best) {
    // Dead-end / local lane: the normal trip to a home past the crossing has to use it.
    for (const b of [0, 90, 180, 270]) {
      const O = offset(C, b, 3), D = offset(C, b + 180, 0.6);
      const r = await route([O, C, D]);
      if (r) { best = { O, D, r, near: nearestOnRoute(r.coords, C), forced: true }; break; }
    }
  }
  if (!best) { console.log('  no trip found'); continue; }

  const coords = best.r.coords;
  const cum = cumulative(coords);
  const crossAlong = cum[best.near.i];
  const decisionAlong = Math.max(400, crossAlong - 1500);
  const decisionIndex = cum.findIndex((c) => c >= decisionAlong);
  const decisionPt = coords[decisionIndex];
  // Exclude the point on the road itself (a crossing's mapped point can sit ~40 m off the
  // centreline, close enough for the router to snap the exclusion to a side street).
  const project = (p) => {
    const { i } = nearestOnRoute(coords, p);
    const a = coords[i], b = coords[i + 1] ?? a, k = Math.cos(rad(p[0]));
    const dx = (b[1] - a[1]) * k, dy = b[0] - a[0];
    const t = Math.max(0, Math.min(1, (((p[1] - a[1]) * k) * dx + (p[0] - a[0]) * dy) / (dx * dx + dy * dy || 1)));
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  const excl = excludePts.filter((p) => nearestOnRoute(coords, p).d < 60).map(project);
  const reroute = await route([decisionPt, best.D], [...excl, ...excludePts]);
  const rerouteNear = reroute ? Math.min(...excludePts.map((p) => nearestOnRoute(reroute.coords, p).d)) : null;
  console.log(`  baseline ${best.r.km.toFixed(1)} km / ${best.r.min.toFixed(1)} min, crossing at ${(crossAlong / 1000).toFixed(2)} km, decision at ${(decisionAlong / 1000).toFixed(2)} km`);
  console.log(`  reroute ${reroute ? `${reroute.km.toFixed(1)} km / ${reroute.min.toFixed(1)} min, closest approach to hazard ${rerouteNear.toFixed(0)} m` : 'NONE (no way around)'}`);

  // Keep the decision vertex exactly in the simplified baseline.
  const before = simplify(coords.slice(0, decisionIndex + 1), 250);
  const after = simplify(coords.slice(decisionIndex), 250).slice(1);
  trips.push({
    stormId,
    crossingId: hero.properties.id,
    crossingName: hero.properties.name,
    cluster,
    trigger: { t: trigger.t, state: trigger.state },
    origin: round([best.O])[0],
    destination: round([best.D])[0],
    viaCrossing: best.forced,
    baseline: { coords: round([...before, ...after]), km: Number(best.r.km.toFixed(2)), min: Number(best.r.min.toFixed(1)) },
    decisionIndex: before.length - 1,
    crossingAlongKm: Number((crossAlong / 1000).toFixed(3)),
    reroute: reroute && rerouteNear > 60
      ? { coords: round(simplify(reroute.coords, 400)), km: Number(reroute.km.toFixed(2)), min: Number(reroute.min.toFixed(1)) }
      : null,
  });
}

fs.mkdirSync(`${ROOT}/demo`, { recursive: true });
fs.writeFileSync(
  `${ROOT}/demo/trips.json`,
  JSON.stringify({ schema: 'fordcast.demo-trips.v1', router: 'Valhalla (OpenStreetMap)', generated_at: new Date().toISOString(), trips }, null, 0),
);
console.log(`\nwrote ${trips.length} trips`);
