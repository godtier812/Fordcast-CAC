// Unit tests for extension/lib.js. Run: node extension/test.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const L = require('./lib.js');
const D = require('./data.js');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`ok   ${name}`);
  } catch (e) {
    console.error(`FAIL ${name}\n${e.stack}`);
    process.exitCode = 1;
  }
}
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

// ---------------------------------------------------------------- polyline
test('decodePolyline: reference polyline at precision 5 and 6', () => {
  const s = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
  const p5 = L.decodePolyline(s, 5);
  assert.deepEqual(p5, [
    [38.5, -120.2],
    [40.7, -120.95],
    [43.252, -126.453],
  ]);
  const p6 = L.decodePolyline(s, 6);
  assert.ok(near(p6[2][0], 4.3252) && near(p6[2][1], -12.6453));
});

test('decodePolyline: real Valhalla polyline6 starts at the requested origin', () => {
  // First points of a Valhalla route from (30.2235,-97.7905) to (30.17,-97.74).
  const shape = 'e_usx@v~soyDhFd`@_J~CyILaIuB';
  const pts = L.decodePolyline(shape, 6);
  assert.equal(pts.length, 5);
  assert.ok(L.haversine({ lat: pts[0][0], lon: pts[0][1] }, { lat: 30.2235, lon: -97.7905 }) < 150);
  for (const [la, lo] of pts) assert.ok(la > 30.2 && la < 30.25 && lo > -97.8 && lo < -97.78);
});

// ---------------------------------------------------------------- geometry
test('pointInPolygon: polygon with hole and multipolygon', () => {
  const poly = {
    type: 'Polygon',
    coordinates: [
      [[-98, 30], [-97, 30], [-97, 31], [-98, 31], [-98, 30]],
      [[-97.6, 30.4], [-97.4, 30.4], [-97.4, 30.6], [-97.6, 30.6], [-97.6, 30.4]],
    ],
  };
  assert.equal(L.pointInPolygon({ lat: 30.2, lon: -97.8 }, poly), true);
  assert.equal(L.pointInPolygon({ lat: 30.5, lon: -97.5 }, poly), false); // in hole
  assert.equal(L.pointInPolygon({ lat: 31.5, lon: -97.5 }, poly), false);
  const multi = { type: 'MultiPolygon', coordinates: [poly.coordinates, [[[-96, 29], [-95, 29], [-95, 30], [-96, 29]]]] };
  assert.equal(L.pointInPolygon({ lat: 29.3, lon: -95.2 }, multi), true);
  assert.equal(L.pointInPolygon({ lat: 30.5, lon: -97.5 }, multi), false);
});

test('distanceToPolyline + itemsNearRoute', () => {
  const line = [[30.2, -97.8], [30.2, -97.7]];
  const d = L.distanceToPolyline({ lat: 30.2009, lon: -97.75 }, line).dist;
  assert.ok(Math.abs(d - 100) < 1.5, `got ${d}`);
  const hits = L.itemsNearRoute(
    line,
    [
      { id: 'a', lat: 30.2003, lon: -97.72 },
      { id: 'b', lat: 30.2, lon: -97.79 },
      { id: 'c', lat: 30.21, lon: -97.75 },
    ],
    40,
  );
  assert.deepEqual(hits.map((h) => h.item.id), ['b', 'a']); // route order, c is ~1.1 km away
});

test('pickDeviationWaypoints picks the detour apex, in route order, max 3', () => {
  const original = [];
  for (let i = 0; i <= 100; i++) original.push([30.2, -97.8 + i * 0.001]);
  const safer = original.map(([la, lo], i) => {
    const bump1 = i >= 20 && i <= 30 ? 0.01 * (1 - Math.abs(i - 25) / 5) : 0;
    const bump2 = i >= 60 && i <= 80 ? 0.02 * (1 - Math.abs(i - 70) / 10) : 0;
    return [la + bump1 + bump2, lo];
  });
  const wps = L.pickDeviationWaypoints(safer, original, 3, 40);
  assert.equal(wps.length, 2);
  assert.ok(near(wps[0].lat, 30.21, 1e-9) && near(wps[0].lon, -97.775, 1e-9));
  assert.ok(near(wps[1].lat, 30.22, 1e-9) && near(wps[1].lon, -97.73, 1e-9));
  assert.deepEqual(L.pickDeviationWaypoints(original, original), []);
});

// ---------------------------------------------------------------- URLs
test('parseViewport: zoom and metre forms', () => {
  const v = L.parseViewport('https://www.google.com/maps/@30.2672,-97.7431,14z?entry=ttu');
  assert.equal(v.lat, 30.2672);
  assert.equal(v.lon, -97.7431);
  assert.equal(v.zoom, 14);
  assert.ok(v.radiusM > 4000 && v.radiusM < 7000, `radius ${v.radiusM}`);
  const m = L.parseViewport('https://www.google.com/maps/@30.2672,-97.7431,8000m/data=!3m1!1e3');
  assert.equal(m.radiusM, 4000);
  assert.equal(L.parseViewport('https://www.google.com/maps'), null);
});

test('parseDirectionsUrl: coordinate path segments', () => {
  const url =
    'https://www.google.com/maps/dir/30.2235,-97.7905/30.17,-97.74/@30.19,-97.76,13z/data=!4m2!4m1!3e0';
  assert.equal(L.isDirectionsUrl(url), true);
  assert.deepEqual(L.parseDirectionsUrl(url).waypoints, [
    { lat: 30.2235, lon: -97.7905 },
    { lat: 30.17, lon: -97.74 },
  ]);
});

test('parseDirectionsUrl: data-param form (lon then lat)', () => {
  const url =
    'https://www.google.com/maps/dir/Zilker+Park,+Austin,+TX/Austin-Bergstrom+International+Airport/' +
    '@30.23,-97.73,12z/data=!3m1!4b1!4m14!4m13!1m5!1m1!1s0x8644b5a1a3b6b4d1:0x1!2m2!1d-97.7731!2d30.2669' +
    '!1m5!1m1!1s0x8644b1:0x2!2m2!1d-97.6699!2d30.1975!3e0';
  const r = L.parseDirectionsUrl(url);
  assert.deepEqual(r.waypoints, [
    { lat: 30.2669, lon: -97.7731 },
    { lat: 30.1975, lon: -97.6699 },
  ]);
});

test('parseDirectionsUrl: mixed coordinates + named place, and names needing geocoding', () => {
  const mixed =
    'https://www.google.com/maps/dir/30.2235,-97.7905/Austin+Airport/@30.2,-97.7,12z/' +
    'data=!4m9!4m8!1m0!1m5!1m1!1s0x1:0x2!2m2!1d-97.6699!2d30.1975!3e0';
  assert.deepEqual(L.parseDirectionsUrl(mixed).waypoints, [
    { lat: 30.2235, lon: -97.7905 },
    { lat: 30.1975, lon: -97.6699 },
  ]);
  const names = 'https://www.google.com/maps/dir/Zilker+Park,+Austin,+TX/Barton%20Springs%20Pool/@30.26,-97.77,15z';
  assert.deepEqual(L.parseDirectionsUrl(names).waypoints, [
    { query: 'Zilker Park, Austin, TX' },
    { query: 'Barton Springs Pool' },
  ]);
  assert.equal(L.parseDirectionsUrl('https://www.google.com/maps/place/Austin'), null);
});

test('buildGoogleDirectionsUrl + round trip through parseDirectionsUrl', () => {
  const o = { lat: 30.2235, lon: -97.7905 };
  const d = { lat: 30.17, lon: -97.74 };
  const w = [
    { lat: 30.21, lon: -97.78 },
    { lat: 30.2, lon: -97.77 },
    { lat: 30.19, lon: -97.76 },
    { lat: 30.18, lon: -97.75 },
  ];
  const url = L.buildGoogleDirectionsUrl(o, d, w);
  assert.equal(
    url,
    'https://www.google.com/maps/dir/?api=1&origin=30.223500,-97.790500&destination=30.170000,-97.740000' +
      '&travelmode=driving&waypoints=30.210000,-97.780000%7C30.200000,-97.770000%7C30.190000,-97.760000',
  );
  assert.equal(
    L.buildGoogleDirectionsUrl(o, d, []),
    'https://www.google.com/maps/dir/?api=1&origin=30.223500,-97.790500&destination=30.170000,-97.740000&travelmode=driving',
  );
  assert.deepEqual(L.parseDirectionsUrl(url).waypoints, [o, w[0], w[1], w[2], d]);
});

// ---------------------------------------------------------------- live rule
const LINK = {
  crossing_id: 'x',
  gauge_id: 'USGS-TEST',
  relation: 'upstream',
  is_primary: true,
  trigger_stage_ft: 2.9,
  watch_stage_ft: 2.0,
  rise_rate_ft_per_30m: 0.1,
  lag_p25_min: 73.4,
  lag_p75_min: 88.2,
  tau_lo_min: 60,
  tau_hi_min: 90,
};
const NOW = Date.parse('2026-05-01T12:00:00Z');
const MIN = 60000;
function series(fn, endOffsetMin = 0) {
  const rows = [];
  for (let m = -180; m <= 0; m += 5) rows.push({ t: NOW - endOffsetMin * MIN + m * MIN, v: fn(m) });
  return { 'USGS-TEST': rows };
}

test('toWindow buckets', () => {
  assert.deepEqual(L.toWindow(0, 10), [0, 15]);
  assert.deepEqual(L.toWindow(10, 40), [0, 30]);
  assert.deepEqual(L.toWindow(51.4, 66.2), [30, 90]);
  assert.deepEqual(L.toWindow(70, 200), [60, 90]);
  assert.equal(L.toWindow(95, 100), null);
});

test('live rule: flat gauge → no_rise', () => {
  const r = L.evaluateCrossing('x', series(() => 1.0), NOW, [LINK]);
  assert.equal(r.state, 'no_rise');
  assert.equal(r.window, null);
  assert.equal(r.stageFt, 1.0);
  assert.equal(r.rise30Ft, 0);
});

test('live rule: rising past trigger → avoid with window', () => {
  // 1.0 ft until 60 min ago, then linear to 4.0 ft now; crosses 2.9 ft 22 min ago.
  const s = series((m) => (m <= -60 ? 1.0 : 1.0 + (3.0 * (m + 60)) / 60));
  assert.ok(Math.abs((NOW - L.lastUpcrossing(s['USGS-TEST'], 2.9)) / MIN - 22) < 1e-6);
  const r = L.evaluateCrossing('x', s, NOW, [LINK]);
  assert.equal(r.state, 'avoid');
  assert.deepEqual(r.window, [30, 90]); // lo = 73.4-22 = 51.4, hi = 88.2-22 = 66.2
  assert.ok(Math.abs(r.rise30Ft - 1.5) < 1e-9);
});

test('live rule: rising toward trigger → watch', () => {
  const s = series((m) => (m <= -30 ? 2.0 : 2.0 + (0.5 * (m + 30)) / 30)); // 2.5 ft, +0.5/30 min
  assert.equal(L.evaluateCrossing('x', s, NOW, [LINK]).state, 'watch');
});

test('live rule: stale data (>80 min) → unknown; missing gauge → unknown', () => {
  const s = series((m) => (m <= -60 ? 1.0 : 1.0 + (3.0 * (m + 60)) / 60), 90);
  const r = L.evaluateCrossing('x', s, NOW, [LINK]);
  assert.equal(r.state, 'unknown');
  assert.equal(r.window, null);
  assert.equal(L.evaluateCrossing('x', {}, NOW, [LINK]).state, 'unknown');
});

test('parseUsgsFeatures filters parameter, units, qualifiers and dedupes timestamps', () => {
  const f = (id, time, value, extra = {}) => ({
    properties: { monitoring_location_id: id, parameter_code: '00065', time, value, unit_of_measure: 'ft', ...extra },
  });
  const out = L.parseUsgsFeatures([
    f('A', '2026-05-01T11:10:00+00:00', '1.5'),
    f('A', '2026-05-01T11:05:00+00:00', '1.4'),
    f('A', '2026-05-01T11:05:00+00:00', '9.9'), // duplicate timestamp ignored
    f('A', '2026-05-01T11:15:00+00:00', '1.6', { qualifier: ['ICE'] }),
    f('A', '2026-05-01T11:20:00+00:00', '1.7', { unit_of_measure: 'm' }),
    f('A', '2026-05-01T11:25:00+00:00', '1.8', { parameter_code: '00060' }),
    f('B', '2026-05-01T11:00:00+00:00', 'NaN'),
  ]);
  assert.deepEqual(Object.keys(out), ['A']);
  assert.deepEqual(out.A.map((r) => r.v), [1.4, 1.5]);
});

// ---------------------------------------------------------------- hazard model
test('filterAlerts + flashAlertAt + classifySite', () => {
  const sq = { type: 'Polygon', coordinates: [[[-98, 30], [-97, 30], [-97, 31], [-98, 31], [-98, 30]]] };
  const alerts = L.filterAlerts({
    features: [
      { properties: { id: '1', event: 'Flash Flood Warning' }, geometry: sq },
      { properties: { id: '2', event: 'Flood Advisory' }, geometry: sq },
      { properties: { id: '3', event: 'Flash Flood Warning' }, geometry: null },
      { properties: { id: '4', event: 'Heat Advisory' }, geometry: sq },
    ],
  });
  assert.deepEqual(alerts.map((a) => a.id), ['1', '2']);
  const pt = { lat: 30.3, lon: -97.7 };
  assert.equal(L.flashAlertAt(pt, alerts).event, 'Flash Flood Warning');
  assert.equal(L.flashAlertAt({ lat: 29, lon: -97.7 }, alerts), null);
  assert.equal(L.alertTouchesView(alerts[0], { lat: 30.5, lon: -97.5, radiusM: 1000 }), true);

  assert.equal(L.classifySite({ officialClosed: true }).level, 'hazard');
  assert.equal(L.classifySite({ sensor: { state: 'avoid', window: [15, 30] } }).level, 'hazard');
  assert.equal(L.classifySite({ sensor: { state: 'watch' } }).level, 'caution');
  assert.equal(L.classifySite({ sensor: { state: 'unknown' }, flash: alerts[0] }).level, 'hazard');
  assert.equal(L.classifySite({ sensor: { state: 'no_rise' } }).level, null);
  const banned = /\b(safe|clear|open|passable|normal)\b/i;
  for (const s of [{ officialClosed: true, sensor: { state: 'avoid', window: [0, 15] }, flash: alerts[0] }, { sensor: { state: 'watch' } }])
    for (const r of L.classifySite(s).reasons) assert.ok(!banned.test(r), r);
});

test('generated data.js matches seed shape', () => {
  assert.equal(D.crossings.length, 141);
  assert.ok(D.links.length > 0 && D.gaugeIds.length > 0);
  for (const c of D.crossings) assert.ok(c.id && Number.isFinite(c.lat) && Number.isFinite(c.lon));
  for (const l of D.links) assert.ok(D.gaugeIds.includes(l.gauge_id) && D.crossings.some((c) => c.id === l.crossing_id));
});

test('assessRouteCoverage: flags Austin to College Station and mid-route excursions outside 80 km', () => {
  const austin = { lat: 30.2672, lon: -97.7431 };
  const onion = { lat: 30.17, lon: -97.74 };
  const collegeStation = { lat: 30.628, lon: -96.3344 };

  assert.equal(L.insideCoverage(austin), true);
  assert.equal(L.insideCoverage(collegeStation), false);

  const inCov = L.assessRouteCoverage([
    [austin.lat, austin.lon],
    [onion.lat, onion.lon],
  ]);
  assert.equal(inCov.outsideCoverage, false);
  assert.equal(inCov.coverageFraction, 1);

  const outCov = L.assessRouteCoverage([
    [austin.lat, austin.lon],
    [30.35, -97.2],
    [collegeStation.lat, collegeStation.lon],
  ]);
  assert.equal(outCov.outsideCoverage, true);
  assert.ok(outCov.coverageFraction < 0.85, `expected coverageFraction < 0.85, got ${outCov.coverageFraction}`);

  const midExcursion = L.assessRouteCoverage([
    [austin.lat, austin.lon],
    [collegeStation.lat, collegeStation.lon],
    [onion.lat, onion.lon],
  ]);
  assert.equal(midExcursion.outsideCoverage, true);
});

console.log(`\n${passed} passed${process.exitCode ? ', some FAILED' : ''}`);
