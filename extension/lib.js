/*
 * FordCast for Google Maps — pure logic (no DOM, no network).
 * Loaded as a content script before fordcast.js, and as a CommonJS module by test.mjs.
 *
 * Coordinates: points are { lat, lon }; polylines are arrays of [lat, lon];
 * GeoJSON geometries keep their native [lon, lat] order.
 */
var FordCastLib = (function () {
  'use strict';

  const EARTH_R = 6371008.8;
  const AUSTIN_CENTER = { lat: 30.2672, lon: -97.7431 };
  const COVERAGE_RADIUS_KM = 80;
  const toRad = (d) => (d * Math.PI) / 180;

  // ---------------------------------------------------------------- geometry

  /** Decode an encoded polyline (Valhalla uses precision 6, Google precision 5). */
  function decodePolyline(str, precision) {
    const factor = Math.pow(10, precision == null ? 6 : precision);
    const out = [];
    let index = 0;
    let lat = 0;
    let lon = 0;
    while (index < str.length) {
      for (let k = 0; k < 2; k++) {
        let result = 0;
        let shift = 0;
        let b;
        do {
          if (index >= str.length) return out; // truncated input: keep what we have
          b = str.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20);
        const delta = result & 1 ? ~(result >> 1) : result >> 1;
        if (k === 0) lat += delta;
        else lon += delta;
      }
      out.push([lat / factor, lon / factor]);
    }
    return out;
  }

  /** Great-circle distance in metres between two { lat, lon } points. */
  function haversine(a, b) {
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(s)));
  }

  function toLatLon(pt) {
    if (!pt) return null;
    if (Array.isArray(pt)) return { lat: Number(pt[0]), lon: Number(pt[1]) };
    return { lat: Number(pt.lat), lon: Number(pt.lon) };
  }

  function insideCoverage(pt) {
    const p = toLatLon(pt);
    if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return false;
    return haversine(p, AUSTIN_CENTER) / 1000 <= COVERAGE_RADIUS_KM;
  }

  /**
   * Evaluates whether a route polyline ([lat, lon][]) stays inside the 80 km Austin-area
   * crossing inventory footprint. Checks every vertex and <= 2 km segment sample and weights
   * coverageFraction by physical segment length (km).
   */
  function assessRouteCoverage(line) {
    const pts = (line || []).map(toLatLon).filter(Boolean);
    if (!pts.length) return { outsideCoverage: true, coverageFraction: 0 };
    let anyOutside = false;
    for (const pt of pts) {
      if (!insideCoverage(pt)) {
        anyOutside = true;
        break;
      }
    }

    let totalKm = 0;
    let inKm = 0;
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const segKm = haversine(a, b) / 1000;
      if (segKm <= 1e-6) continue;
      const steps = Math.max(1, Math.ceil(segKm / 2));
      const stepKm = segKm / steps;
      for (let s = 0; s < steps; s++) {
        const t0 = s / steps;
        const tMid = (s + 0.5) / steps;
        const t1 = (s + 1) / steps;
        const p0 = { lat: a.lat + (b.lat - a.lat) * t0, lon: a.lon + (b.lon - a.lon) * t0 };
        const pMid = { lat: a.lat + (b.lat - a.lat) * tMid, lon: a.lon + (b.lon - a.lon) * tMid };
        const p1 = { lat: a.lat + (b.lat - a.lat) * t1, lon: a.lon + (b.lon - a.lon) * t1 };
        const subIn = insideCoverage(p0) && insideCoverage(pMid) && insideCoverage(p1);
        if (!subIn) {
          anyOutside = true;
        } else {
          inKm += stepKm;
        }
        totalKm += stepKm;
      }
    }

    if (totalKm <= 1e-6) {
      const inCount = pts.filter((p) => insideCoverage(p)).length;
      const coverageFraction = inCount / pts.length;
      return { outsideCoverage: anyOutside || coverageFraction < 1, coverageFraction };
    }

    const coverageFraction = Math.max(0, Math.min(1, inKm / totalKm));
    const outsideCoverage = anyOutside || coverageFraction < 1;
    return { outsideCoverage, coverageFraction };
  }

  /** Ray-casting test of [x=lon, y=lat] against one linear ring. */
  function inRing(lon, lat, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0];
      const yi = ring[i][1];
      const xj = ring[j][0];
      const yj = ring[j][1];
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  /** Point-in-polygon for a GeoJSON Polygon or MultiPolygon geometry (holes respected). */
  function pointInPolygon(pt, geometry) {
    if (!geometry || !geometry.coordinates) return false;
    const polys =
      geometry.type === 'Polygon'
        ? [geometry.coordinates]
        : geometry.type === 'MultiPolygon'
          ? geometry.coordinates
          : [];
    for (const rings of polys) {
      if (!rings.length || !inRing(pt.lon, pt.lat, rings[0])) continue;
      let inHole = false;
      for (let h = 1; h < rings.length; h++) {
        if (inRing(pt.lon, pt.lat, rings[h])) {
          inHole = true;
          break;
        }
      }
      if (!inHole) return true;
    }
    return false;
  }

  /** Bounding box [minLon, minLat, maxLon, maxLat] of a GeoJSON (Multi)Polygon. */
  function geometryBbox(geometry) {
    const bb = [Infinity, Infinity, -Infinity, -Infinity];
    const polys =
      geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates || [];
    for (const rings of polys)
      for (const ring of rings)
        for (const [x, y] of ring) {
          if (x < bb[0]) bb[0] = x;
          if (y < bb[1]) bb[1] = y;
          if (x > bb[2]) bb[2] = x;
          if (y > bb[3]) bb[3] = y;
        }
    return bb;
  }

  /**
   * Minimum distance in metres from a point to a polyline ([lat, lon][]), using a local
   * equirectangular projection centred on the point (accurate to <1% at city scale).
   * Returns { dist, index, pos }: index is the nearest segment's start index and pos the
   * fractional position along the line (index + t), for ordering points along a route, and point
   * the nearest { lat, lon } on the line.
   */
  function distanceToPolyline(pt, line) {
    if (!line || !line.length) return { dist: Infinity, index: -1 };
    const kx = toRad(1) * EARTH_R * Math.cos(toRad(pt.lat));
    const ky = toRad(1) * EARTH_R;
    if (line.length === 1) {
      return { dist: Math.hypot((line[0][1] - pt.lon) * kx, (line[0][0] - pt.lat) * ky), index: 0, pos: 0, point: { lat: line[0][0], lon: line[0][1] } };
    }
    let best = Infinity;
    let bestI = 0;
    let bestPos = 0;
    let bestX = 0;
    let bestY = 0;
    let ax = (line[0][1] - pt.lon) * kx;
    let ay = (line[0][0] - pt.lat) * ky;
    for (let i = 1; i < line.length; i++) {
      const bx = (line[i][1] - pt.lon) * kx;
      const by = (line[i][0] - pt.lat) * ky;
      const dx = bx - ax;
      const dy = by - ay;
      const len2 = dx * dx + dy * dy;
      let t = len2 > 0 ? -(ax * dx + ay * dy) / len2 : 0;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;
      const d = Math.hypot(ax + t * dx, ay + t * dy);
      if (d < best) {
        best = d;
        bestI = i - 1;
        bestPos = i - 1 + t;
        bestX = ax + t * dx;
        bestY = ay + t * dy;
      }
      ax = bx;
      ay = by;
    }
    const point = { lat: pt.lat + bestY / ky, lon: pt.lon + bestX / kx };
    return { dist: best, index: bestI, pos: bestPos, point };
  }

  /** Bounding box of a [lat, lon] polyline, padded by `padM` metres. */
  function lineBbox(line, padM) {
    let minLat = Infinity;
    let minLon = Infinity;
    let maxLat = -Infinity;
    let maxLon = -Infinity;
    for (const [la, lo] of line) {
      if (la < minLat) minLat = la;
      if (la > maxLat) maxLat = la;
      if (lo < minLon) minLon = lo;
      if (lo > maxLon) maxLon = lo;
    }
    const dLat = (padM || 0) / 111320;
    const dLon = (padM || 0) / (111320 * Math.max(0.2, Math.cos(toRad((minLat + maxLat) / 2))));
    return { minLat: minLat - dLat, maxLat: maxLat + dLat, minLon: minLon - dLon, maxLon: maxLon + dLon };
  }

  /**
   * Items (objects with lat/lon) within `thresholdM` metres of the route, sorted in route
   * order. Each result is { item, dist, index }.
   */
  function itemsNearRoute(line, items, thresholdM) {
    if (!line || line.length === 0) return [];
    const bb = lineBbox(line, thresholdM + 50);
    const hits = [];
    for (const item of items) {
      if (item.lat < bb.minLat || item.lat > bb.maxLat || item.lon < bb.minLon || item.lon > bb.maxLon)
        continue;
      const r = distanceToPolyline(item, line);
      if (r.dist <= thresholdM) hits.push({ item, dist: r.dist, index: r.index, pos: r.pos, onRoute: r.point });
    }
    hits.sort((a, b) => a.pos - b.pos);
    return hits;
  }

  /**
   * Choose up to `max` waypoints on `saferLine` that force Google onto the detour: split the
   * safer route into runs where it departs from `originalLine` by more than `minDevM`, take the
   * point of maximum deviation in each run, keep the `max` largest, return them in route order.
   */
  function pickDeviationWaypoints(saferLine, originalLine, max, minDevM) {
    const limit = max == null ? 3 : max;
    const threshold = minDevM == null ? 40 : minDevM;
    if (!saferLine || !saferLine.length || !originalLine || !originalLine.length) return [];
    const runs = [];
    let cur = null;
    for (let i = 0; i < saferLine.length; i++) {
      const p = { lat: saferLine[i][0], lon: saferLine[i][1] };
      const dev = distanceToPolyline(p, originalLine).dist;
      if (dev > threshold) {
        if (!cur) cur = { best: -1, index: -1 };
        if (dev > cur.best) {
          cur.best = dev;
          cur.index = i;
        }
      } else if (cur) {
        runs.push(cur);
        cur = null;
      }
    }
    if (cur) runs.push(cur);
    return runs
      .sort((a, b) => b.best - a.best)
      .slice(0, limit)
      .sort((a, b) => a.index - b.index)
      .map((r) => ({
        lat: saferLine[r.index][0],
        lon: saferLine[r.index][1],
        index: r.index,
        deviationM: Math.round(r.best),
      }));
  }

  // ---------------------------------------------------------------- Google Maps URLs

  const COORD_RE = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

  function validLatLon(lat, lon) {
    return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  }

  function parseCoordText(text) {
    const m = COORD_RE.exec(text || '');
    if (!m) return null;
    const lat = Number(m[1]);
    const lon = Number(m[2]);
    return validLatLon(lat, lon) ? { lat, lon } : null;
  }

  function safeDecode(s) {
    try {
      return decodeURIComponent(s.replace(/\+/g, ' '));
    } catch (e) {
      return s.replace(/\+/g, ' ');
    }
  }

  /**
   * Map viewport from "@lat,lon,15z" (or "@lat,lon,1234m" in satellite/3D view).
   * Returns { lat, lon, zoom, radiusM } or null.
   */
  function parseViewport(url) {
    const m = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,(\d+(?:\.\d+)?)([zm]))?/.exec(url || '');
    if (!m) return null;
    const lat = Number(m[1]);
    const lon = Number(m[2]);
    if (!validLatLon(lat, lon)) return null;
    let zoom = 14;
    let radiusM;
    if (m[3] && m[4] === 'z') {
      zoom = Number(m[3]);
      radiusM = viewportRadius(lat, zoom);
    } else if (m[3] && m[4] === 'm') {
      radiusM = clamp(Number(m[3]) / 2, 300, 60000);
      zoom = Math.log2((156543.03392 * Math.cos(toRad(lat)) * 700) / radiusM);
    } else {
      radiusM = viewportRadius(lat, zoom);
    }
    return { lat, lon, zoom, radiusM };
  }

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  /** Approximate radius (m) of the visible map: ~700 px at Web-Mercator resolution. */
  function viewportRadius(lat, zoom) {
    const mpp = (156543.03392 * Math.cos(toRad(lat))) / Math.pow(2, zoom);
    return clamp(mpp * 700, 300, 60000);
  }

  function isDirectionsUrl(url) {
    try {
      return new URL(url).pathname.startsWith('/maps/dir');
    } catch (e) {
      return false;
    }
  }

  /**
   * Parse a Google Maps directions URL into ordered waypoints. Each waypoint is either
   * { lat, lon } or { query } (text that still needs geocoding). Returns null when the URL is
   * not a directions URL, else { waypoints, source }.
   */
  function parseDirectionsUrl(url) {
    let u;
    try {
      u = new URL(url);
    } catch (e) {
      return null;
    }
    if (!u.pathname.startsWith('/maps/dir')) return null;

    // Form 1: /maps/dir/?api=1&origin=..&destination=..&waypoints=a|b
    if (u.searchParams.get('api') === '1' || u.searchParams.has('destination')) {
      const toWp = (t) => parseCoordText(t) || { query: t };
      const wps = [];
      const o = u.searchParams.get('origin');
      if (o) wps.push(toWp(o));
      const w = u.searchParams.get('waypoints');
      if (w) for (const part of w.split('|')) if (part.trim()) wps.push(toWp(part.trim()));
      const d = u.searchParams.get('destination');
      if (d) wps.push(toWp(d));
      return { waypoints: wps, source: 'api' };
    }

    // Data-param coordinates: "!1d<lon>!2d<lat>" per place waypoint, in route order.
    const dataCoords = [];
    const re = /!1d(-?\d+\.\d+)!2d(-?\d+\.\d+)/g;
    let m;
    while ((m = re.exec(url))) {
      const lon = Number(m[1]);
      const lat = Number(m[2]);
      if (validLatLon(lat, lon)) dataCoords.push({ lat, lon });
    }

    // Path segments after /dir/, up to the "@..." or "data=..." segment.
    const raw = u.pathname.replace(/^\/maps\/dir\/?/, '').split('/');
    const segments = [];
    for (const seg of raw) {
      if (seg.startsWith('@') || seg.startsWith('data=') || seg.startsWith('am=')) break;
      const text = safeDecode(seg).trim();
      if (text) segments.push(text);
    }

    const segWps = segments.map((t) => parseCoordText(t) || { query: t });
    const named = segWps.filter((w) => w.query != null);

    // Data-param coordinates belong to the named (non-coordinate) segments, in order.
    if (named.length && dataCoords.length === named.length) {
      let k = 0;
      return {
        waypoints: segWps.map((w) => (w.query != null ? dataCoords[k++] : w)),
        source: 'mixed',
      };
    }
    if (dataCoords.length >= 2 && (segments.length < 2 || dataCoords.length >= segments.length)) {
      return { waypoints: dataCoords, source: 'data' };
    }
    return { waypoints: segWps, source: 'path' };
  }

  const fmt = (p) => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;

  /** Google Maps "api=1" driving-directions URL; at most 3 intermediate waypoints. */
  function buildGoogleDirectionsUrl(origin, destination, waypoints) {
    let url =
      'https://www.google.com/maps/dir/?api=1' +
      `&origin=${fmt(origin)}&destination=${fmt(destination)}&travelmode=driving`;
    const wps = (waypoints || []).slice(0, 3);
    if (wps.length) url += `&waypoints=${wps.map(fmt).join('%7C')}`;
    return url;
  }

  // ---------------------------------------------------------------- live sensor rule
  // Ported from mobile/src/lib/live.ts (itself ported from the backend baseline rule).

  const LIVE_STALE_MIN = 80;
  const BAD_QUALIFIERS = new Set(['ice', 'eqp', 'ssn', 'dis', 'dry']);

  function parseUsgsFeatures(features) {
    const byGauge = {};
    for (const f of features || []) {
      const p = f && f.properties;
      if (!p || !p.monitoring_location_id || p.parameter_code !== '00065') continue;
      if (p.unit_of_measure && p.unit_of_measure !== 'ft') continue;
      const v = typeof p.value === 'string' ? Number(p.value) : p.value;
      const t = p.time ? Date.parse(p.time) : NaN;
      if (v == null || !Number.isFinite(v) || !Number.isFinite(t)) continue;
      const quals = typeof p.qualifier === 'string' ? [p.qualifier] : p.qualifier || [];
      if (quals.some((q) => BAD_QUALIFIERS.has(String(q).toLowerCase()))) continue;
      const m = byGauge[p.monitoring_location_id] || (byGauge[p.monitoring_location_id] = new Map());
      // A site can publish several time series; keep one value per timestamp.
      if (!m.has(t)) m.set(t, v);
    }
    const out = {};
    for (const id of Object.keys(byGauge)) {
      out[id] = [...byGauge[id].entries()].map(([t, v]) => ({ t, v })).sort((a, b) => a.t - b.t);
    }
    return out;
  }

  function valueAt(rows, at) {
    for (let i = 0; i + 1 < rows.length; i++) {
      const a = rows[i];
      const b = rows[i + 1];
      if (a.t <= at && at <= b.t) {
        if (a.t === at) return a.v;
        if (b.t === at) return b.v;
        const gap = b.t - a.t;
        if (gap > 0 && gap <= 30 * 60000) return a.v + ((b.v - a.v) * (at - a.t)) / gap;
        return null;
      }
    }
    let closest = null;
    for (const r of rows) if (!closest || Math.abs(r.t - at) < Math.abs(closest.t - at)) closest = r;
    return closest && Math.abs(closest.t - at) <= 10 * 60000 ? closest.v : null;
  }

  function rise30(rows) {
    if (rows.length < 2) return null;
    const last = rows[rows.length - 1];
    const before = valueAt(rows, last.t - 30 * 60000);
    return before == null ? null : last.v - before;
  }

  function lastUpcrossing(rows, level) {
    if (!rows.length) return null;
    if (rows.every((r) => r.v >= level)) return rows[0].t;
    for (let i = rows.length - 1; i > 0; i--) {
      const a = rows[i - 1];
      const b = rows[i];
      if (a.v < level && level <= b.v) {
        if (b.t - a.t > 30 * 60000) return a.t;
        return a.t + ((b.t - a.t) * (level - a.v)) / (b.v - a.v);
      }
    }
    return null;
  }

  const BUCKETS = [
    [0, 15],
    [15, 30],
    [30, 60],
    [60, 90],
  ];

  function toWindow(lo, hi) {
    const l = Math.max(0, lo);
    if (l >= 90) return null;
    const h = Math.min(Math.max(l, hi), 90 - 1e-9);
    const i = BUCKETS.findIndex(([, up]) => l < up);
    const j = Math.min(
      BUCKETS.findIndex(([, up]) => h < up),
      i + 1,
    );
    return [BUCKETS[i][0], BUCKETS[j][1]];
  }

  function linksFor(links, crossingId) {
    return links.filter((l) => l.crossing_id === crossingId && l.relation === 'upstream');
  }

  function primaryLink(links, crossingId) {
    const ls = linksFor(links, crossingId);
    return ls.find((l) => l.is_primary) || ls[0] || null;
  }

  /** Evaluate one monitored crossing against the latest sensor series. */
  function evaluateCrossing(crossingId, series, now, links) {
    const ls = linksFor(links, crossingId).sort((a, b) => a.gauge_id.localeCompare(b.gauge_id));
    const primary = primaryLink(links, crossingId);
    const avoid = [];
    const watch = [];
    let anyFresh = false;

    for (const link of ls) {
      const rows = series[link.gauge_id] || [];
      const last = rows[rows.length - 1];
      if (!last || now - last.t < 0 || now - last.t > LIVE_STALE_MIN * 60000) continue;
      anyFresh = true;
      const r30 = rise30(rows);
      const crossed = lastUpcrossing(rows, link.trigger_stage_ft);
      let elapsed = crossed != null ? (now - crossed) / 60000 : null;
      const recent = elapsed != null && elapsed <= link.lag_p75_min + 30;
      if (last.v >= link.trigger_stage_ft && ((r30 != null && r30 > link.rise_rate_ft_per_30m) || recent)) {
        elapsed = elapsed != null ? elapsed : (now - last.t) / 60000;
        const lo = Math.max(0, link.lag_p25_min - elapsed);
        const hi = Math.max(lo, link.lag_p75_min - elapsed);
        avoid.push({ lo, hi, link });
      } else if (last.v >= link.watch_stage_ft && r30 != null && r30 > 0.2) {
        watch.push(link);
      }
    }

    const describe = (link) => {
      const rows = link ? series[link.gauge_id] || [] : [];
      const last = rows[rows.length - 1];
      return {
        link,
        stageFt: last ? last.v : null,
        rise30Ft: rise30(rows),
        obsAt: last ? last.t : null,
      };
    };

    if (!anyFresh) {
      return Object.assign({ crossingId, state: 'unknown', window: null }, describe(primary));
    }
    avoid.sort((a, b) => a.lo - b.lo);
    const first = avoid[0];
    if (first) {
      const win = first.lo < 90 ? toWindow(first.lo, first.hi) : null;
      return Object.assign(
        { crossingId, state: win ? 'avoid' : 'watch', window: win },
        describe(first.link),
      );
    }
    if (watch[0]) return Object.assign({ crossingId, state: 'watch', window: null }, describe(watch[0]));
    return Object.assign({ crossingId, state: 'no_rise', window: null }, describe(primary));
  }

  /** USGS continuous-values query for the last `hours` hours (ISO start without millis). */
  function usgsUrl(gaugeIds, now, hours) {
    const start = new Date(now - (hours || 3) * 3600000).toISOString().replace(/\.\d{3}Z$/, 'Z');
    return (
      'https://api.waterdata.usgs.gov/ogcapi/v1/collections/continuous/items?f=json&limit=10000' +
      `&parameter_code=00065&monitoring_location_id=${gaugeIds.join(',')}&time=${start}/..`
    );
  }

  // ---------------------------------------------------------------- hazard model

  const FLASH_EVENTS = new Set(['Flash Flood Warning', 'Flash Flood Emergency']);
  const KEEP_EVENTS = new Set([
    'Flash Flood Warning',
    'Flash Flood Emergency',
    'Flood Warning',
    'Flood Advisory',
  ]);

  /** Keep flood alerts that carry a polygon; annotate with bbox. */
  function filterAlerts(geojson) {
    const out = [];
    for (const f of (geojson && geojson.features) || []) {
      const p = f.properties || {};
      const g = f.geometry;
      if (!KEEP_EVENTS.has(p.event) || !g || (g.type !== 'Polygon' && g.type !== 'MultiPolygon'))
        continue;
      // A "Flash Flood Warning" tagged as catastrophic is an emergency.
      const tags = (p.parameters && p.parameters.flashFloodDamageThreat) || [];
      const emergency =
        p.event === 'Flash Flood Emergency' ||
        tags.some((t) => String(t).toUpperCase() === 'CATASTROPHIC');
      out.push({
        id: p.id || f.id,
        event: emergency ? 'Flash Flood Emergency' : p.event,
        headline: p.headline || p.event,
        expires: p.ends || p.expires || null,
        flash: FLASH_EVENTS.has(p.event) || emergency,
        geometry: g,
        bbox: geometryBbox(g),
      });
    }
    return out;
  }

  /** First flash-flood alert polygon containing the point, or null. */
  function flashAlertAt(pt, alerts) {
    let found = null;
    for (const a of alerts) {
      if (!a.flash) continue;
      const [x0, y0, x1, y1] = a.bbox;
      if (pt.lon < x0 || pt.lon > x1 || pt.lat < y0 || pt.lat > y1) continue;
      if (pointInPolygon(pt, a.geometry)) {
        if (a.event === 'Flash Flood Emergency') return a;
        found = found || a;
      }
    }
    return found;
  }

  /** Does an alert polygon touch a circular view (centre inside, or any vertex inside radius)? */
  function alertTouchesView(alert, view) {
    if (pointInPolygon(view, alert.geometry)) return true;
    const polys =
      alert.geometry.type === 'Polygon' ? [alert.geometry.coordinates] : alert.geometry.coordinates;
    for (const rings of polys)
      for (const [x, y] of rings[0]) if (haversine(view, { lat: y, lon: x }) <= view.radiusM) return true;
    return false;
  }

  /**
   * Classify a site: { officialClosed, sensor, flash } → { level: 'hazard'|'caution'|null, reasons[] }.
   * hazard = official closure, sensor avoid/closed, or inside a flash-flood polygon.
   */
  function classifySite(site) {
    const reasons = [];
    let level = null;
    if (site.officialClosed) {
      reasons.push('Officially closed (ATXfloods)');
      level = 'hazard';
    }
    const s = site.sensor;
    if (s && (s.state === 'avoid' || s.state === 'closed')) {
      reasons.push(
        s.window
          ? `FordCast sensor warning: water may reach the crossing in ${s.window[0]}–${s.window[1]} min`
          : 'FordCast sensor warning: upstream creek above trigger level',
      );
      level = 'hazard';
    }
    if (site.flash) {
      reasons.push(`Inside ${site.flash.event}`);
      level = 'hazard';
    }
    if (!level && s && s.state === 'watch') {
      reasons.push('FordCast sensor caution: upstream creek rising');
      level = 'caution';
    }
    return { level, reasons };
  }

  /** ATXfloods {attributes:[...]} → [{ id, name, lat, lon, status, ... }] with numeric coords. */
  function normalizeAtx(json) {
    const out = [];
    for (const a of (json && json.attributes) || []) {
      const lat = Number(a.lat);
      const lon = Number(a.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) continue;
      out.push({
        id: a.id,
        name: a.name || 'Unnamed crossing',
        jurisdiction: a.jurisdiction || '',
        comment: a.comment || '',
        status: a.status,
        updatedAt: a.updated_at || null,
        lat,
        lon,
      });
    }
    return out;
  }

  /**
   * Merge ATXfloods crossings/closures with FordCast crossings into one list of sites and
   * classify each. A FordCast crossing within `mergeM` metres of an ATXfloods crossing is
   * treated as the same place. Inputs may be null when a source failed.
   */
  function buildSites(opts) {
    const atxCrossings = opts.atxCrossings || [];
    const closures = opts.closures;
    const series = opts.series || {};
    const alerts = opts.alerts || [];
    const data = opts.data;
    const now = opts.now;
    const mergeM = opts.mergeM == null ? 50 : opts.mergeM;

    const sites = [];
    const byAtx = new Map();
    const addAtx = (c) => {
      if (byAtx.has(c.id)) return;
      const s = { key: `atx-${c.id}`, atxId: c.id, name: c.name, lat: c.lat, lon: c.lon, atx: c };
      byAtx.set(c.id, s);
      sites.push(s);
    };
    for (const c of atxCrossings) addAtx(c);
    for (const c of closures || []) addAtx(c);

    // Prefer the live closures feed; fall back to the crossing list's own status.
    const closedIds = new Set(
      (closures || atxCrossings).filter((c) => c.status === 'closed').map((c) => c.id),
    );

    const dLat = mergeM / 111000;
    for (const fc of data.crossings) {
      let site = null;
      let best = mergeM;
      for (const s of sites) {
        if (s.fordcast || Math.abs(s.lat - fc.lat) > dLat || Math.abs(s.lon - fc.lon) > dLat * 1.3) continue;
        const d = haversine(s, fc);
        if (d <= best) {
          best = d;
          site = s;
        }
      }
      if (!site) {
        site = { key: `fc-${fc.id}`, name: fc.name, lat: fc.lat, lon: fc.lon };
        sites.push(site);
      }
      site.fordcast = fc;
      if (linksFor(data.links, fc.id).length) site.sensor = evaluateCrossing(fc.id, series, now, data.links);
    }

    for (const s of sites) {
      s.officialClosed = s.atxId != null && closedIds.has(s.atxId);
      s.flash = flashAlertAt(s, alerts);
      const c = classifySite(s);
      s.level = c.level;
      s.reasons = c.reasons;
    }
    return sites;
  }

  return {
    AUSTIN_CENTER,
    COVERAGE_RADIUS_KM,
    decodePolyline,
    haversine,
    insideCoverage,
    assessRouteCoverage,
    pointInPolygon,
    geometryBbox,
    distanceToPolyline,
    itemsNearRoute,
    pickDeviationWaypoints,
    parseCoordText,
    parseViewport,
    viewportRadius,
    isDirectionsUrl,
    parseDirectionsUrl,
    buildGoogleDirectionsUrl,
    LIVE_STALE_MIN,
    parseUsgsFeatures,
    rise30,
    lastUpcrossing,
    toWindow,
    linksFor,
    primaryLink,
    evaluateCrossing,
    usgsUrl,
    filterAlerts,
    flashAlertAt,
    alertTouchesView,
    classifySite,
    normalizeAtx,
    buildSites,
  };
})();

if (typeof module !== 'undefined') module.exports = FordCastLib;
