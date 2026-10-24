// End-to-end smoke test against the live public APIs (needs network).
// Run: node extension/smoke.mjs [originLat,originLon] [destLat,destLon]
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const L = require('./lib.js');
const D = require('./data.js');

const origin = L.parseCoordText(process.argv[2] || '30.2235,-97.7905');
const dest = L.parseCoordText(process.argv[3] || '30.17,-97.74');

async function getJson(name, url, init) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(30000) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    console.log(`  ${name.padEnd(16)} OK   ${Date.now() - t0} ms`);
    return json;
  } catch (e) {
    console.log(`  ${name.padEnd(16)} FAIL (${e.message}) → panel would show "Couldn't reach ${name}"`);
    return null;
  }
}

async function route(points, exclude) {
  const body = {
    locations: points.map((p, i) => ({ ...p, type: i === 0 || i === points.length - 1 ? 'break' : 'via' })),
    costing: 'auto',
    directions_options: { units: 'kilometers' },
  };
  if (exclude?.length) body.exclude_locations = exclude.map((p) => ({ lat: p.lat, lon: p.lon }));
  const j = await getJson(exclude?.length ? 'Valhalla (alt)' : 'Valhalla', 'https://valhalla1.openstreetmap.de/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!j) return null;
  const line = j.trip.legs.flatMap((leg, i) => {
    const pts = L.decodePolyline(leg.shape, 6);
    return i ? pts.slice(1) : pts;
  });
  return { line, km: j.trip.summary.length, min: j.trip.summary.time / 60 };
}

const now = Date.now();
console.log(`FordCast smoke test ${new Date(now).toISOString()}`);
console.log(`Route: ${JSON.stringify(origin)} → ${JSON.stringify(dest)}\n\nFetching:`);
const [closuresJ, crossingsJ, usgsJ, nwsJ] = await Promise.all([
  getJson('ATXfloods closures', 'https://api.atxfloods.com/api/closures'),
  getJson('ATXfloods crossings', 'https://api.atxfloods.com/api/crossings'),
  getJson('USGS', L.usgsUrl(D.gaugeIds, now, 3), { headers: { Accept: 'application/geo+json' } }),
  getJson('NWS', 'https://api.weather.gov/alerts/active?area=TX', {
    headers: { Accept: 'application/geo+json', 'User-Agent': 'FordCast smoke test' },
  }),
]);

const closures = closuresJ ? L.normalizeAtx(closuresJ) : null;
const atxCrossings = crossingsJ ? L.normalizeAtx(crossingsJ) : null;
const series = usgsJ ? L.parseUsgsFeatures(usgsJ.features || []) : null;
const alerts = nwsJ ? L.filterAlerts(nwsJ) : null;
console.log(
  `\nData: ${atxCrossings?.length ?? '?'} ATX crossings, ${closures?.filter((c) => c.status === 'closed').length ?? '?'} official closures, ` +
    `${series ? Object.keys(series).length : '?'} of ${D.gaugeIds.length} gauges reporting, ` +
    `${alerts?.length ?? '?'} flood alerts with polygons (${alerts?.filter((a) => a.flash).length ?? '?'} flash)`,
);

const sites = L.buildSites({ atxCrossings, closures, series, alerts, data: D, now });
for (const s of sites.filter((x) => x.sensor)) {
  const st = s.sensor;
  console.log(
    `  sensor ${s.fordcast.id.padEnd(8)} ${st.state.padEnd(8)} gauge=${st.link?.gauge_id} stage=${st.stageFt ?? '—'} ft rise30=${st.rise30Ft?.toFixed(2) ?? '—'}  ${s.name}`,
  );
}

console.log('\nRouting:');
const base = await route([origin, dest]);
if (!base) process.exit(1);
console.log(`  base route: ${base.km.toFixed(2)} km, ${base.min.toFixed(1)} min, ${base.line.length} shape points`);
const startErr = L.haversine({ lat: base.line[0][0], lon: base.line[0][1] }, origin);
console.log(`  shape starts ${startErr.toFixed(0)} m from origin (polyline6 decode sanity)`);

const flagged = sites.filter((s) => s.level);
const hits = L.itemsNearRoute(base.line, flagged, 40);
const hazards = hits.filter((h) => h.item.level === 'hazard').map((h) => h.item);
const cautions = hits.filter((h) => h.item.level === 'caution').map((h) => h.item);
const passed = L.itemsNearRoute(base.line, sites, 40).map((h) => h.item);
const watched = passed.filter((s) => s.fordcast);

console.log('\nHAZARD CHECK RESULT:');
if (hazards.length) {
  for (const s of hazards) console.log(`  ✖ Your route crosses ${s.name} — ${s.reasons.join('; ')}`);
} else {
  console.log(`  No reported hazards on this route. Passes ${watched.length} FordCast-watched crossings (${watched.filter((s) => s.sensor).length} with live sensors).`);
}
for (const s of cautions) console.log(`  ! Caution: ${s.name} — ${s.reasons.join('; ')}`);
console.log(`  Crossings within 40 m of route: ${passed.map((s) => s.name).join(' | ') || 'none'}`);

// Exercise the reroute path: use real hazards if any, else pretend the first crossing on the
// route is closed so the exclusion + waypoint logic is tested end to end.
const target = hazards.length ? hits.filter((h) => h.item.level === 'hazard') : L.itemsNearRoute(base.line, sites, 40).slice(0, 1);
if (target.length) {
  console.log(
    `\nReroute ${hazards.length ? '' : '(SIMULATED closure of "' + target[0].item.name + '") '}excluding ${target.length} point(s):`,
  );
  // Same as the extension: exclude the on-route point nearest each hazard.
  const alt = await route([origin, dest], target.map((h) => h.onRoute));
  if (alt) {
    const still = L.itemsNearRoute(alt.line, target.map((h) => h.item), 40);
    const wps = L.pickDeviationWaypoints(alt.line, base.line, 3, 40);
    const url = L.buildGoogleDirectionsUrl(origin, dest, wps);
    console.log(`  alt route: ${alt.km.toFixed(2)} km, ${alt.min.toFixed(1)} min → Safer route: +${Math.round(alt.min - base.min)} min`);
    console.log(`  alt route avoids excluded crossing(s): ${still.length === 0 ? 'YES' : 'NO (' + still.length + ' still within 40 m)'}`);
    console.log(`  waypoints (max deviation): ${wps.map((w) => `${w.lat.toFixed(5)},${w.lon.toFixed(5)} (${w.deviationM} m off)`).join(' ; ') || 'none'}`);
    console.log(`  Google Maps URL: ${url}`);
  }
} else {
  console.log('\n(No crossings on this route to simulate a reroute with.)');
}
