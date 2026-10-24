/*
 * FordCast for Google Maps — content script.
 * Floating panel (shadow DOM) listing flagged Austin-area low-water crossings in the current
 * map view and checking Google Maps driving directions against them.
 *
 * Depends on data.js (FORDCAST_DATA) and lib.js (FordCastLib), loaded first by the manifest.
 */
(function () {
  'use strict';
  if (window.__fordcastLoaded) return;
  window.__fordcastLoaded = true;

  const L = FordCastLib;
  const D = FORDCAST_DATA;

  const API = {
    closures: 'https://api.atxfloods.com/api/closures',
    crossings: 'https://api.atxfloods.com/api/crossings',
    nws: 'https://api.weather.gov/alerts/active?area=TX',
    valhalla: 'https://valhalla1.openstreetmap.de/route',
    photon: 'https://photon.komoot.io/api/',
  };
  const POLL_MS = 5 * 60000;
  const URL_REFETCH_MIN_MS = 60000; // URL changes refetch at most once a minute (panning is noisy)
  const CROSSINGS_TTL_MS = 30 * 60000;
  const ROUTE_RADIUS_M = 40;
  const MERGE_M = 50; // FordCast crossing ↔ ATXfloods crossing considered the same place
  const AUSTIN = { lat: 30.27, lon: -97.74 };
  const MAX_VIEW_ITEMS = 8;
  const MAX_EXCLUDES = 50;
  const REASSURING_RE = /\b(safe|clear|open|passable|normal)/i;

  const state = {
    atxCrossings: null,
    atxCrossingsAt: 0,
    closures: null,
    series: null,
    alerts: null,
    errors: { atx: null, usgs: null, nws: null },
    lastFetch: 0,
    updatedAt: 0,
    fetching: false,
    sites: [],
    route: null,
    href: '',
    collapsed: readCollapsed(),
  };

  // ------------------------------------------------------------------ network

  async function fetchJson(url, opts) {
    const o = opts || {};
    const req = {
      type: 'fordcast-fetch',
      url,
      method: o.method || 'GET',
      headers: o.headers || {},
      body: o.body,
      timeoutMs: o.timeoutMs || 20000,
    };
    let res = null;
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        res = await chrome.runtime.sendMessage(req);
      }
    } catch (e) {
      res = null; // extension reloaded / worker unavailable → direct fetch below
    }
    if (!res) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), req.timeoutMs);
      try {
        const r = await fetch(url, {
          method: req.method,
          headers: req.headers,
          body: req.body,
          signal: ctrl.signal,
        });
        const data = await r.json().catch(() => null);
        res = { ok: r.ok, status: r.status, data };
      } catch (e) {
        res = { ok: false, status: 0, error: String((e && e.message) || e) };
      } finally {
        clearTimeout(timer);
      }
    }
    if (!res.ok) {
      const detail = (res.data && (res.data.error || res.data.detail)) || res.error || `HTTP ${res.status}`;
      const err = new Error(String(detail));
      err.status = res.status;
      throw err;
    }
    if (res.data == null) throw new Error('empty response');
    return res.data;
  }

  async function refreshData() {
    if (state.fetching) return;
    state.fetching = true;
    state.lastFetch = Date.now();
    const now = Date.now();

    const atx = (async () => {
      try {
        const needList = !state.atxCrossings || now - state.atxCrossingsAt > CROSSINGS_TTL_MS;
        const [cl, cr] = await Promise.all([
          fetchJson(API.closures),
          needList ? fetchJson(API.crossings, { timeoutMs: 30000 }).catch(() => null) : null,
        ]);
        state.closures = L.normalizeAtx(cl);
        if (cr) {
          state.atxCrossings = L.normalizeAtx(cr);
          state.atxCrossingsAt = now;
        }
        state.errors.atx = null;
      } catch (e) {
        state.errors.atx = e.message;
      }
    })();

    const usgs = (async () => {
      try {
        const json = await fetchJson(L.usgsUrl(D.gaugeIds, now, 3), {
          headers: { Accept: 'application/geo+json' },
          timeoutMs: 30000,
        });
        state.series = L.parseUsgsFeatures(json.features || []);
        state.errors.usgs = null;
      } catch (e) {
        state.errors.usgs = e.message;
      }
    })();

    const nws = (async () => {
      try {
        const json = await fetchJson(API.nws, { headers: { Accept: 'application/geo+json' } });
        state.alerts = L.filterAlerts(json);
        state.errors.nws = null;
      } catch (e) {
        state.errors.nws = e.message;
      }
    })();

    await Promise.all([atx, usgs, nws]);
    state.fetching = false;
    state.updatedAt = Date.now();
    buildSites();
    render();
    const r = state.route;
    if (r && r.status === 'ok') {
      await evaluateRoute(r);
      render();
    }
  }

  // ------------------------------------------------------------------ hazard sites

  function buildSites() {
    state.sites = L.buildSites({
      atxCrossings: state.atxCrossings,
      closures: state.closures,
      series: state.series,
      alerts: state.alerts,
      data: D,
      now: Date.now(),
      mergeM: MERGE_M,
    });
  }

  function severity(s) {
    if (s.officialClosed) return 0;
    if (s.sensor && (s.sensor.state === 'avoid' || s.sensor.state === 'closed')) return 1;
    if (s.flash) return 2;
    return 3;
  }

  // ------------------------------------------------------------------ routing

  const geocodeCache = new Map();

  async function geocode(query) {
    if (/^(your|my) location$/i.test(query.trim())) {
      const e = new Error('loc');
      e.userMessage =
        "FordCast can't read your current location from Google Maps. Type a start address or pick a point on the map.";
      throw e;
    }
    if (geocodeCache.has(query)) return geocodeCache.get(query);
    let json;
    try {
      json = await fetchJson(
        `${API.photon}?q=${encodeURIComponent(query)}&lat=${AUSTIN.lat}&lon=${AUSTIN.lon}&limit=1`,
      );
    } catch (e) {
      e.userMessage = "Couldn't reach the geocoder (Photon)";
      throw e;
    }
    const f = json.features && json.features[0];
    if (!f || !f.geometry) {
      const e = new Error('no match');
      e.userMessage = `Couldn't locate “${query}”`;
      throw e;
    }
    const p = { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] };
    geocodeCache.set(query, p);
    return p;
  }

  async function valhalla(points, exclude) {
    const body = {
      locations: points.map((p, i) => ({
        lat: p.lat,
        lon: p.lon,
        type: i === 0 || i === points.length - 1 ? 'break' : 'via',
      })),
      costing: 'auto',
      directions_options: { units: 'kilometers' },
    };
    if (exclude && exclude.length) body.exclude_locations = exclude.map((p) => ({ lat: p.lat, lon: p.lon }));
    const j = await fetchJson(API.valhalla, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      timeoutMs: 25000,
    });
    if (!j.trip || !j.trip.legs) throw new Error('no trip');
    const line = [];
    for (const leg of j.trip.legs) {
      const pts = L.decodePolyline(leg.shape, 6);
      if (line.length && pts.length) pts.shift();
      for (const p of pts) line.push(p);
    }
    return { line, timeS: j.trip.summary.time, km: j.trip.summary.length };
  }

  let routeTimer = null;

  function scheduleRoute(parsed) {
    const key = JSON.stringify(parsed.waypoints);
    if (state.route && state.route.key === key) return;
    state.route = { key, status: 'pending', parsed };
    clearTimeout(routeTimer);
    routeTimer = setTimeout(() => computeRoute(state.route), 1200); // wait for the URL to settle
  }

  async function computeRoute(r) {
    if (!r || state.route !== r) return;
    r.status = 'loading';
    render();
    try {
      const wps = r.parsed.waypoints;
      if (wps.length < 2) {
        const e = new Error('few');
        e.userMessage = 'Add a start and a destination to check the route.';
        throw e;
      }
      const pts = [];
      for (const w of wps) pts.push(w.query != null ? await geocode(w.query) : w);
      if (state.route !== r) return;
      r.points = pts;
      try {
        r.base = await valhalla(pts, []);
      } catch (e) {
        e.userMessage = "Couldn't reach the routing service (Valhalla)";
        throw e;
      }
      if (state.route !== r) return;
      r.status = 'ok';
      render();
      await evaluateRoute(r);
    } catch (e) {
      if (state.route !== r) return;
      r.status = 'error';
      r.error = e.userMessage || `Couldn't check this route (${e.message})`;
    }
    render();
  }

  async function evaluateRoute(r) {
    const coverage = L.assessRouteCoverage(r.base.line);
    r.outsideCoverage = coverage.outsideCoverage;
    r.coverageFraction = coverage.coverageFraction;
    const flagged = state.sites.filter((s) => s.level);
    const hits = L.itemsNearRoute(r.base.line, flagged, ROUTE_RADIUS_M);
    r.hazards = hits.filter((h) => h.item.level === 'hazard').map((h) => h.item);
    // Exclude the point ON the route nearest each hazard: Valhalla snaps exclude_locations to the
    // closest road edge, and a crossing marker a few metres off the road can snap to a side street.
    r.excludes = hits.filter((h) => h.item.level === 'hazard').map((h) => h.onRoute);
    r.cautions = hits.filter((h) => h.item.level === 'caution').map((h) => h.item);
    const watched = L.itemsNearRoute(
      r.base.line,
      state.sites.filter((s) => s.fordcast),
      ROUTE_RADIUS_M,
    ).map((h) => h.item);
    r.watched = watched.length;
    r.watchedSensors = watched.filter((s) => s.sensor).length;

    const hazKey = r.hazards.map((s) => s.key).sort().join('|');
    if (!r.hazards.length) {
      r.hazKey = '';
      r.safer = null;
      return;
    }
    if (r.hazKey === hazKey && r.safer && r.safer.status !== 'error') return;
    r.hazKey = hazKey;
    r.safer = { status: 'loading' };
    render();
    try {
      const alt = await valhalla(r.points, r.excludes.slice(0, MAX_EXCLUDES));
      if (state.route !== r || r.hazKey !== hazKey) return;
      const still = L.itemsNearRoute(
        alt.line,
        state.sites.filter((s) => s.level === 'hazard'),
        ROUTE_RADIUS_M,
      ).map((h) => h.item);
      const picks = L.pickDeviationWaypoints(alt.line, r.base.line, 3, 40);
      // Keep any stops the user added, ordered along the alternative route.
      const userStops = r.points.slice(1, -1).map((p) => ({
        lat: p.lat,
        lon: p.lon,
        index: L.distanceToPolyline(p, alt.line).pos,
        user: true,
      }));
      const kept = userStops.slice(0, 3);
      const room = 3 - kept.length;
      const detour = picks
        .slice()
        .sort((a, b) => b.deviationM - a.deviationM)
        .slice(0, room);
      const wps = kept.concat(detour).sort((a, b) => a.index - b.index);
      r.safer = {
        status: 'ok',
        line: alt.line,
        km: alt.km,
        timeS: alt.timeS,
        deltaMin: Math.round((alt.timeS - r.base.timeS) / 60),
        still,
        url: L.buildGoogleDirectionsUrl(r.points[0], r.points[r.points.length - 1], wps),
      };
    } catch (e) {
      if (state.route !== r) return;
      r.safer = {
        status: 'error',
        error:
          e.status === 0
            ? "Couldn't reach the routing service (Valhalla)"
            : "Couldn't find a route around these crossings",
      };
    }
  }

  // ------------------------------------------------------------------ UI

  const STYLE = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .panel {
      width: 340px; max-height: calc(100vh - 190px); display: flex; flex-direction: column;
      background: #0B101B; color: #F8FAFC; border: 1px solid #23304D; border-radius: 12px;
      box-shadow: 0 8px 28px rgba(0,0,0,.45);
      font: 13px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow: hidden;
    }
    .panel.collapsed { width: auto; }
    .hdr { display: flex; align-items: center; gap: 8px; padding: 10px 12px; cursor: pointer;
      border-bottom: 1px solid #23304D; user-select: none; }
    .collapsed .hdr { border-bottom: 0; }
    .logo { width: 18px; height: 18px; border-radius: 5px; background: #2563EB; flex: none;
      display: grid; place-items: center; font-weight: 800; font-size: 11px; color: #fff; }
    .title { font-weight: 700; font-size: 14px; }
    .sub { color: #94A3B8; font-size: 11px; }
    .grow { flex: 1; min-width: 0; }
    .badge { background: #DC2626; color: #fff; border-radius: 999px; padding: 1px 7px;
      font-size: 11px; font-weight: 700; }
    .btn-icon { background: transparent; border: 1px solid #23304D; color: #CBD5E1; border-radius: 6px;
      width: 24px; height: 24px; cursor: pointer; font-size: 14px; line-height: 1; }
    .btn-icon:hover { background: #16203A; }
    .body { overflow-y: auto; padding: 10px 12px 4px; }
    .collapsed .body, .collapsed .ftr { display: none; }
    .meta { color: #94A3B8; font-size: 11px; margin-bottom: 8px; }
    .err { color: #FBBF24; font-size: 12px; margin: 2px 0; }
    h3 { margin: 10px 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #93A4C3; }
    .summary { margin-bottom: 6px; }
    .muted { color: #94A3B8; }
    .item { border: 1px solid #23304D; border-radius: 8px; padding: 7px 9px; margin: 6px 0; background: #111827; }
    .item.hazard { border-left: 4px solid #EF4444; }
    .item.caution { border-left: 4px solid #F59E0B; }
    .item .name { font-weight: 600; }
    .item .why { color: #E2E8F0; font-size: 12px; }
    .item .det { color: #94A3B8; font-size: 11px; }
    .banner { background: #450A0A; border: 1px solid #B91C1C; color: #FEE2E2; border-radius: 8px;
      padding: 8px 10px; margin: 6px 0; font-weight: 600; }
    .banner.caution { background: #422006; border-color: #B45309; color: #FEF3C7; }
    .note { background: #0F1A30; border: 1px solid #23304D; border-radius: 8px; padding: 8px 10px; margin: 6px 0; }
    .alt { margin: 8px 0; padding: 8px 10px; border-radius: 8px; background: #0F1A30; border: 1px solid #2B3B61; }
    .alt .big { font-size: 15px; font-weight: 700; }
    a.cta { display: block; text-align: center; margin-top: 8px; padding: 8px 10px; border-radius: 8px;
      background: #2563EB; color: #fff; text-decoration: none; font-weight: 600; }
    a.cta:hover { background: #1D4ED8; }
    a { color: #93C5FD; }
    .ftr { border-top: 1px solid #23304D; padding: 8px 12px; font-size: 11px; color: #CBD5E1; }
    .small { font-size: 11px; color: #94A3B8; margin-top: 4px; }
  `;

  let root = null;
  let panelEl = null;

  function h(tag, attrs) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    for (let i = 2; i < arguments.length; i++) {
      const kids = [].concat(arguments[i]);
      for (const kid of kids) {
        if (kid == null || kid === false) continue;
        el.append(kid instanceof Node ? kid : String(kid));
      }
    }
    return el;
  }

  function readCollapsed() {
    try {
      return localStorage.getItem('fordcast-collapsed') === '1';
    } catch (e) {
      return false;
    }
  }

  function setCollapsed(v) {
    state.collapsed = v;
    try {
      localStorage.setItem('fordcast-collapsed', v ? '1' : '0');
    } catch (e) {
      /* ignore */
    }
    render();
  }

  function mount() {
    if (document.getElementById('fordcast-host')) return;
    const host = document.createElement('div');
    host.id = 'fordcast-host';
    (document.body || document.documentElement).appendChild(host);
    root = host.attachShadow({ mode: 'open' });
    root.append(h('style', null, STYLE));
    panelEl = h('div', { class: 'panel' });
    root.append(panelEl);
    // Keep Google Maps from treating panel scroll/clicks as map gestures.
    for (const ev of ['wheel', 'mousedown', 'dblclick', 'keydown']) {
      host.addEventListener(ev, (e) => e.stopPropagation());
    }
  }

  const fmtTime = (ms) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const fmtKm = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

  function siteDetail(s, distM) {
    const parts = [];
    if (s.fordcast && s.fordcast.creek) parts.push(s.fordcast.creek);
    if (s.sensor && s.sensor.stageFt != null) {
      let t = `gauge ${s.sensor.stageFt.toFixed(2)} ft`;
      if (s.sensor.rise30Ft != null) t += ` (${s.sensor.rise30Ft >= 0 ? '+' : ''}${s.sensor.rise30Ft.toFixed(2)} ft/30 min)`;
      parts.push(t);
    }
    // ATXfloods free-text comments can say things like "Crossing is open"; only show them for
    // closed crossings and never echo reassuring status words.
    if (s.atx && s.atx.comment && s.officialClosed && !REASSURING_RE.test(s.atx.comment)) parts.push(s.atx.comment);
    if (distM != null) parts.push(`${fmtKm(distM)} from map center`);
    return parts.join(' · ');
  }

  function siteCard(s, distM) {
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${s.lat.toFixed(6)},${s.lon.toFixed(6)}`;
    return h(
      'div',
      { class: `item ${s.level || ''}` },
      h('div', { class: 'name' }, s.name),
      s.reasons.map((r) => h('div', { class: 'why' }, r)),
      h('div', { class: 'det' }, siteDetail(s, distM), ' ', h('a', { href: mapUrl }, 'Show on map')),
    );
  }

  function renderRoute(body) {
    const r = state.route;
    if (!r) return;
    body.append(h('h3', null, 'Estimated route between your stops'));
    if (r.status === 'pending' || r.status === 'loading') {
      body.append(h('div', { class: 'muted' }, 'Checking estimated route against reported crossings…'));
      return;
    }
    if (r.status === 'error') {
      body.append(h('div', { class: 'err' }, r.error));
      return;
    }
    if (r.outsideCoverage) {
      body.append(
        h(
          'div',
          { class: 'banner caution' },
          'Outside the supported Austin-area inventory — this route is not fully checked. Consult DriveTexas and local authorities.',
        ),
      );
    }
    for (const s of r.hazards || []) {
      body.append(h('div', { class: 'banner' }, `Estimated route crosses ${s.name} — ${s.reasons.join('; ')}`));
    }
    for (const s of r.cautions || []) {
      body.append(h('div', { class: 'banner caution' }, `Caution: ${s.name} — ${s.reasons.join('; ')}`));
    }
    if (r.hazards && r.hazards.length) {
      const sf = r.safer;
      if (!sf || sf.status === 'loading') {
        body.append(h('div', { class: 'muted' }, 'Looking for a route around these crossings…'));
      } else if (sf.status === 'error') {
        body.append(h('div', { class: 'err' }, sf.error));
      } else {
        const sign = sf.deltaMin >= 0 ? '+' : '−';
        body.append(
          h(
            'div',
            { class: 'alt' },
            h('div', { class: 'big' }, `Alternative avoiding reported hazards: ${sign}${Math.abs(sf.deltaMin)} min`),
            h(
              'div',
              { class: 'small' },
              `${sf.km.toFixed(1)} km vs ${r.base.km.toFixed(1)} km · avoids ${r.hazards.length} flagged crossing${r.hazards.length === 1 ? '' : 's'}`,
            ),
            sf.still.length
              ? h(
                  'div',
                  { class: 'err' },
                  `No complete detour available — alternative still passes ${sf.still.length} flagged crossing${sf.still.length === 1 ? '' : 's'}: ${sf.still.map((s) => s.name).join(', ')}`,
                )
              : h('a', { class: 'cta', href: sf.url }, 'Open alternative in Google Maps'),
          ),
        );
      }
    } else if (!r.outsideCoverage) {
      if (r.watched === 0) {
        body.append(
          h(
            'div',
            { class: 'note' },
            h(
              'div',
              { style: 'font-weight:600' },
              'No inventoried crossings matched this estimated route; this does not verify road conditions.',
            ),
          ),
        );
      } else {
        body.append(
          h(
            'div',
            { class: 'note' },
            h('div', { style: 'font-weight:600' }, 'No reported hazards on this estimated route'),
            h(
              'div',
              { class: 'small' },
              `Passes ${r.watched} FordCast-watched crossing${r.watched === 1 ? '' : 's'}` +
                (r.watched ? ` (${r.watchedSensors} with live sensors)` : ''),
            ),
          ),
        );
      }
    }
    body.append(
      h(
        'div',
        { class: 'small' },
        'Route checked with OpenStreetMap routing (Valhalla); it can differ from the line Google draws.',
      ),
    );
  }

  function renderView(body) {
    body.append(h('h3', null, 'In this map view'));
    const view = L.parseViewport(location.href);
    if (!view) {
      body.append(h('div', { class: 'muted' }, 'Move the map to see reported crossings in view.'));
      return 0;
    }
    const items = [];
    let watchedInView = 0;
    for (const s of state.sites) {
      const isFlag = s.level || (s.sensor && s.sensor.state === 'unknown' && s.flash);
      if (!isFlag && !s.fordcast) continue;
      const d = L.haversine(view, s);
      if (d > view.radiusM) continue;
      if (s.fordcast) watchedInView++;
      if (isFlag) items.push({ s, d });
    }
    items.sort((a, b) => severity(a.s) - severity(b.s) || a.d - b.d);
    const official = items.filter((x) => x.s.officialClosed).length;
    const sensor = items.filter(
      (x) => x.s.sensor && ['avoid', 'closed', 'watch'].includes(x.s.sensor.state),
    ).length;
    const alerts = (state.alerts || []).filter((a) => L.alertTouchesView(a, view));
    const flashEvents = [...new Set(alerts.filter((a) => a.flash).map((a) => a.event))];
    const otherEvents = [...new Set(alerts.filter((a) => !a.flash).map((a) => a.event))];

    const parts = [];
    if (official) parts.push(`${official} official closure${official === 1 ? '' : 's'}`);
    if (sensor) parts.push(`${sensor} sensor warning${sensor === 1 ? '' : 's'}`);
    for (const ev of flashEvents) parts.push(`${ev} active`);
    if (!items.length && !flashEvents.length) {
      body.append(h('div', { class: 'summary' }, 'No closures or sensor warnings reported in this view'));
      if (L.haversine(view, AUSTIN) > 120000) {
        body.append(h('div', { class: 'small' }, 'FordCast only covers Austin-area low-water crossings.'));
      }
    } else {
      if (!parts.length) parts.push(`${items.length} flagged crossing${items.length === 1 ? '' : 's'}`);
      body.append(h('div', { class: 'summary', style: 'font-weight:600' }, parts.join(' · ')));
    }
    if (otherEvents.length) body.append(h('div', { class: 'small' }, `${otherEvents.join(', ')} in this area`));
    for (const x of items.slice(0, MAX_VIEW_ITEMS)) body.append(siteCard(x.s, x.d));
    if (items.length > MAX_VIEW_ITEMS) {
      body.append(h('div', { class: 'small' }, `+${items.length - MAX_VIEW_ITEMS} more — zoom in to see them`));
    }
    if (watchedInView) {
      body.append(
        h('div', { class: 'small' }, `${watchedInView} FordCast-watched crossing${watchedInView === 1 ? '' : 's'} in view`),
      );
    }
    return items.filter((x) => x.s.level === 'hazard').length;
  }

  function render() {
    if (!panelEl) return;
    const oldBody = panelEl.querySelector('.body');
    const scroll = oldBody ? oldBody.scrollTop : 0;

    const body = h('div', { class: 'body' });
    const meta = h('div', { class: 'meta' });
    if (state.updatedAt) meta.append(`Updated ${fmtTime(state.updatedAt)}`);
    else meta.append('Loading live data…');
    if (state.fetching && state.updatedAt) meta.append(' · refreshing…');
    body.append(meta);
    const src = { atx: 'ATXfloods', usgs: 'USGS stream sensors', nws: 'NWS alerts' };
    for (const k of Object.keys(src)) {
      if (state.errors[k]) body.append(h('div', { class: 'err' }, `Couldn't reach ${src[k]}`));
    }

    renderRoute(body);
    const viewHazards = renderView(body);
    body.scrollTop = scroll;

    const routeHazards = state.route && state.route.hazards ? state.route.hazards.length : 0;
    const badgeN = state.route ? routeHazards : viewHazards;

    const hdr = h(
      'div',
      { class: 'hdr', onclick: () => setCollapsed(!state.collapsed), title: 'Show/hide FordCast' },
      h('div', { class: 'logo' }, 'F'),
      h('div', { class: 'grow' }, h('div', { class: 'title' }, 'FordCast'), h('div', { class: 'sub' }, 'Experimental · not official')),
      badgeN ? h('span', { class: 'badge' }, String(badgeN)) : null,
      h(
        'button',
        {
          class: 'btn-icon',
          'aria-label': state.collapsed ? 'Expand FordCast panel' : 'Collapse FordCast panel',
          onclick: (e) => {
            e.stopPropagation();
            setCollapsed(!state.collapsed);
          },
        },
        state.collapsed ? '▾' : '▴',
      ),
    );
    const ftr = h(
      'div',
      { class: 'ftr' },
      'Never drive into water. Obey barricades. Data: ATXfloods, USGS, NWS. ',
      h('a', { href: 'https://www.atxfloods.com', target: '_blank', rel: 'noopener' }, 'atxfloods.com'),
    );
    panelEl.className = `panel${state.collapsed ? ' collapsed' : ''}`;
    panelEl.replaceChildren(hdr, body, ftr);
    body.scrollTop = scroll;
  }

  // ------------------------------------------------------------------ lifecycle

  function onUrlChange() {
    const href = location.href;
    state.href = href;
    const parsed = L.isDirectionsUrl(href) ? L.parseDirectionsUrl(href) : null;
    if (parsed) scheduleRoute(parsed);
    else if (state.route) {
      clearTimeout(routeTimer);
      state.route = null;
    }
    if (!state.fetching && Date.now() - state.lastFetch > URL_REFETCH_MIN_MS) refreshData();
    render();
  }

  function start() {
    mount();
    buildSites();
    onUrlChange();
    setInterval(() => {
      if (location.href !== state.href) onUrlChange();
    }, 1000);
    setInterval(refreshData, POLL_MS);
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
