/**
 * Hazard-aware routing. Uses the public Valhalla router (OpenStreetMap data), which can
 * exclude specific points — exactly what's needed to route around a flooded crossing.
 */
import { distanceKm, insideCoverage, type LatLon } from './geo';
import recordedPresets from '../../assets/demo/commute_presets.json';

export type Route = { coords: LatLon[]; km: number; min: number };
export type HazardLevel = 'block' | 'caution';
export type RouteHazard = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  level: HazardLevel;
  /** Short plain-language reason, e.g. "Official closure" or "Avoid – flooding likely". */
  reason: string;
};
export type RoutePlan = {
  origin: LatLon;
  destination: LatLon;
  destinationName: string;
  route: Route;
  baseline: Route;
  /** Hazards on the fastest route that the plan goes around. */
  avoided: RouteHazard[];
  /** Hazards the plan still crosses (no way around found). */
  remaining: RouteHazard[];
  extraMin: number;
  computedAt: number;
  /** Recorded geometry is review-only and must never be exported for navigation. */
  geometrySource?: 'live' | 'recorded';
  geometryCapturedAt?: string;
  /** True when the origin, destination, or route segments leave FordCast's Central Texas crossing inventory footprint. */
  outsideCoverage?: boolean;
  /** Fraction [0, 1] of route coordinates inside FordCast's supported Central Texas coverage footprint. */
  coverageFraction?: number;
};

/**
 * Evaluates whether a route stays within FordCast's 80 km Central Texas crossing inventory footprint.
 * Flags `outsideCoverage: true` if ANY endpoint, vertex, or interpolated segment sample leaves coverage,
 * and computes `coverageFraction` by route distance (km) rather than raw vertex count so dense local
 * coordinates cannot mask an out-of-area excursion.
 */
export function assessRouteCoverage(
  origin: LatLon,
  destination: LatLon,
  coords: LatLon[],
): { outsideCoverage: boolean; coverageFraction: number } {
  const path = coords.length > 0 ? [origin, ...coords, destination] : [origin, destination];
  let anyOutside = false;
  for (const pt of path) {
    if (!insideCoverage(pt)) {
      anyOutside = true;
      break;
    }
  }

  let totalKm = 0;
  let inKm = 0;
  for (let i = 0; i + 1 < path.length; i++) {
    const a = path[i]!;
    const b = path[i + 1]!;
    const segKm = distanceKm(a, b);
    if (segKm <= 1e-6) continue;
    // Sample long segments every <= 2 km so excursions between sparse vertices are caught and weighted by distance.
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
    const inCount = path.filter((p) => insideCoverage(p)).length;
    const coverageFraction = inCount / path.length;
    return { outsideCoverage: anyOutside || coverageFraction < 1, coverageFraction };
  }

  const coverageFraction = Math.max(0, Math.min(1, inKm / totalKm));
  const outsideCoverage = anyOutside || coverageFraction < 1;
  return { outsideCoverage, coverageFraction };
}

const VALHALLA = 'https://valhalla1.openstreetmap.de/route';
export const ROUTE_BUFFER_M = 45;

export function decodePolyline6(str: string): LatLon[] {
  let index = 0;
  let lat = 0;
  let lon = 0;
  const out: LatLon[] = [];
  while (index < str.length) {
    for (const which of [0, 1]) {
      let result = 0;
      let shift = 0;
      let b: number;
      do {
        b = str.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const d = result & 1 ? ~(result >> 1) : result >> 1;
      if (which === 0) lat += d;
      else lon += d;
    }
    out.push({ lat: lat / 1e6, lon: lon / 1e6 });
  }
  return out;
}

export async function fetchRoute(
  points: LatLon[],
  exclude: LatLon[] = [],
  signal?: AbortSignal,
): Promise<Route | null> {
  const request = new AbortController();
  const abort = () => request.abort();
  if (signal?.aborted) request.abort();
  signal?.addEventListener('abort', abort);
  const deadline = setTimeout(abort, 5000);
  try {
    const res = await fetch(VALHALLA, {
      method: 'POST',
      signal: request.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locations: points.map((p) => ({ lat: p.lat, lon: p.lon })),
        costing: 'auto',
        exclude_locations: exclude.map((p) => ({ lat: p.lat, lon: p.lon })),
        directions_options: { units: 'kilometers' },
      }),
    });
    if (res.status === 400) return null; // Valhalla: no route possible with these exclusions
    if (!res.ok) throw new Error(`Router ${res.status}`);
    const j = (await res.json()) as {
      trip?: { legs?: { shape: string }[]; summary?: { length: number; time: number } };
    };
    if (!j.trip?.legs?.length || !j.trip.summary) return null;
    return {
      coords: j.trip.legs.flatMap((l) => decodePolyline6(l.shape)),
      km: j.trip.summary.length,
      min: j.trip.summary.time / 60,
    };
  } finally {
    clearTimeout(deadline);
    signal?.removeEventListener('abort', abort);
  }
}

/** Distance (m) from point p to segment a–b plus position t∈[0,1] along it; equirectangular is accurate at city scale. */
function segDist(p: LatLon, a: LatLon, b: LatLon): { d: number; t: number } {
  const k = Math.cos((p.lat * Math.PI) / 180);
  const ax = (a.lon - p.lon) * k;
  const ay = a.lat - p.lat;
  const bx = (b.lon - p.lon) * k;
  const by = b.lat - p.lat;
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)));
  const x = ax + t * dx;
  const y = ay + t * dy;
  return { d: Math.sqrt(x * x + y * y) * 111_320, t };
}

export function distanceToRouteM(
  p: LatLon,
  coords: LatLon[],
): { d: number; index: number; t: number } {
  let best = { d: Infinity, index: 0, t: 0 };
  for (let i = 0; i + 1 < coords.length; i++) {
    const s = segDist(p, coords[i]!, coords[i + 1]!);
    if (s.d < best.d) best = { d: s.d, index: i, t: s.t };
  }
  return best;
}

/**
 * Closest point on the route to p. Valhalla snaps exclusions to the nearest road, and a
 * crossing's mapped point can sit ~40 m off the centreline — near enough to snap to a
 * side street instead. Excluding the on-route point makes the exclusion hit the right road.
 */
export function nearestPointOnRoute(p: LatLon, coords: LatLon[]): LatLon {
  const { index, t } = distanceToRouteM(p, coords);
  const a = coords[index] ?? p;
  const b = coords[index + 1] ?? a;
  return { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t };
}

/** Hazards within the buffer of the route, in driving order. */
export function hazardsOnRoute(
  coords: LatLon[],
  hazards: RouteHazard[],
  bufferM = ROUTE_BUFFER_M,
  fromIndex = 0,
): (RouteHazard & { index: number })[] {
  const tail = coords.slice(fromIndex);
  return hazards
    .map((h) => ({ h, r: distanceToRouteM(h, tail) }))
    .filter((x) => x.r.d <= bufferM)
    .sort((a, b) => a.r.index + a.r.t - (b.r.index + b.r.t))
    .map((x) => ({ ...x.h, index: x.r.index + fromIndex }));
}

export function cumulativeKm(coords: LatLon[]): number[] {
  const out = [0];
  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1]!;
    const b = coords[i]!;
    const k = Math.cos((a.lat * Math.PI) / 180);
    const dx = (b.lon - a.lon) * k;
    const dy = b.lat - a.lat;
    out.push(out[i - 1]! + Math.sqrt(dx * dx + dy * dy) * 111.32);
  }
  return out;
}

/** Position + heading at `km` along the route. */
export function pointAlong(
  coords: LatLon[],
  cum: number[],
  km: number,
): { lat: number; lon: number; heading: number; index: number } {
  const total = cum[cum.length - 1] ?? 0;
  const target = Math.max(0, Math.min(total, km));
  let i = 0;
  while (i + 1 < cum.length - 1 && cum[i + 1]! < target) i++;
  const a = coords[i]!;
  const b = coords[i + 1] ?? a;
  const seg = (cum[i + 1] ?? cum[i]!) - cum[i]!;
  const f = seg > 0 ? (target - cum[i]!) / seg : 0;
  const k = Math.cos((a.lat * Math.PI) / 180);
  const heading = (Math.atan2((b.lon - a.lon) * k, b.lat - a.lat) * 180) / Math.PI;
  return { lat: a.lat + (b.lat - a.lat) * f, lon: a.lon + (b.lon - a.lon) * f, heading, index: i };
}

/**
 * Fastest route that avoids blocking hazards (and caution hazards when the detour is
 * reasonable). Repeats because a detour can run into a different flooded crossing.
 */
export async function planSafeRoute(
  origin: LatLon,
  destination: LatLon,
  destinationName: string,
  hazards: RouteHazard[],
  signal?: AbortSignal,
  maxCautionDetourMin = 12,
): Promise<RoutePlan | null> {
  try {
    const plan = await planNetworkRoute(
      origin,
      destination,
      destinationName,
      hazards,
      signal,
      maxCautionDetourMin,
    );
    if (plan) return { ...plan, geometrySource: 'live' };
  } catch (error) {
    if (signal?.aborted) throw error;
  }
  if (signal?.aborted) return null;
  const same = (a: LatLon, b: LatLon) =>
    Math.abs(a.lat - b.lat) < 0.000001 && Math.abs(a.lon - b.lon) < 0.000001;
  const preset = recordedPresets.presets.find(
    (p) => same(p.origin, origin) && same(p.destination, destination),
  );
  if (!preset) return null;
  const route = { coords: preset.shapes.flatMap(decodePolyline6), km: preset.km, min: preset.min };
  return {
    origin,
    destination,
    destinationName,
    route,
    baseline: route,
    avoided: [],
    remaining: hazardsOnRoute(route.coords, hazards),
    extraMin: 0,
    computedAt: Date.now(),
    geometrySource: 'recorded',
    geometryCapturedAt: recordedPresets.capturedAt,
    ...assessRouteCoverage(origin, destination, route.coords),
  };
}

async function planNetworkRoute(
  origin: LatLon,
  destination: LatLon,
  destinationName: string,
  hazards: RouteHazard[],
  signal: AbortSignal | undefined,
  maxCautionDetourMin: number,
): Promise<RoutePlan | null> {
  const baseline = await fetchRoute([origin, destination], [], signal);
  if (!baseline) return null;

  const attempt = async (includeCaution: boolean) => {
    const relevant = hazards.filter((h) => includeCaution || h.level === 'block');
    const excluded = new Map<string, RouteHazard>();
    const excludePts: LatLon[] = [];
    let route = baseline;
    for (let round = 0; round < 4; round++) {
      // Hazards still on the route — including ones already excluded, because a divided road or
      // frontage road can carry the route past the same spot on a different edge.
      const onRoute = hazardsOnRoute(route.coords, relevant);
      if (!onRoute.length) break;
      for (const h of onRoute) {
        excluded.set(h.id, h);
        excludePts.push(nearestPointOnRoute(h, route.coords));
        if (!excludePts.some((p) => p.lat === h.lat && p.lon === h.lon))
          excludePts.push({ lat: h.lat, lon: h.lon });
      }
      const next = await fetchRoute([origin, destination], excludePts, signal);
      if (!next) break; // no way around these
      route = next;
    }
    return { route, excluded: [...excluded.values()] };
  };

  let result = await attempt(true);
  if (result.route.min - baseline.min > maxCautionDetourMin) {
    // Going around "watch"-level crossings costs too much; only go around blocking ones.
    result = await attempt(false);
  }
  const stillOn = hazardsOnRoute(result.route.coords, hazards);
  const stillIds = new Set(stillOn.map((h) => h.id));
  const cov = assessRouteCoverage(origin, destination, result.route.coords);
  return {
    origin,
    destination,
    destinationName,
    route: result.route,
    baseline,
    avoided: hazardsOnRoute(baseline.coords, hazards).filter((h) => !stillIds.has(h.id)),
    remaining: stillOn,
    extraMin: Math.max(0, result.route.min - baseline.min),
    computedAt: Date.now(),
    outsideCoverage: cov.outsideCoverage,
    coverageFraction: cov.coverageFraction,
  };
}

/**
 * Google Maps directions link that follows FordCast's route: up to 3 waypoints taken where
 * the safer route strays farthest from the fastest one (Google's mobile limit is 3).
 */
export function googleMapsUrl(
  plan: Pick<RoutePlan, 'origin' | 'destination' | 'route' | 'baseline'>,
): string {
  const f = (p: LatLon) => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;
  const base = `https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=${f(plan.origin)}&destination=${f(plan.destination)}`;
  const coords = plan.route.coords;
  if (coords.length < 3 || plan.route === plan.baseline) return base;
  const dev = coords.map((p, i) => ({ i, d: distanceToRouteM(p, plan.baseline.coords).d }));
  const picks: number[] = [];
  const minGap = Math.max(5, Math.floor(coords.length / 8));
  for (const c of [...dev].sort((a, b) => b.d - a.d)) {
    if (c.d < 80) break;
    if (picks.every((p) => Math.abs(p - c.i) > minGap)) picks.push(c.i);
    if (picks.length === 3) break;
  }
  if (!picks.length) return base;
  const wps = picks.sort((a, b) => a - b).map((i) => f(coords[i]!));
  return `${base}&waypoints=${wps.join('%7C')}`;
}

export type Place = { name: string; detail: string; lat: number; lon: number };

/** Address / place search biased to Austin (Photon, OpenStreetMap data) with 10s bounded timeout. */
export async function searchPlaces(
  q: string,
  near: LatLon,
  signal?: AbortSignal,
): Promise<Place[]> {
  if (q.trim().length < 3) return [];
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${near.lat}&lon=${near.lon}&limit=6`;
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Search ${res.status}`);
    const j = (await res.json()) as {
      features?: {
        geometry: { coordinates: [number, number] };
        properties: {
          name?: string;
          street?: string;
          housenumber?: string;
          city?: string;
          state?: string;
        };
      }[];
    };
    return (j.features ?? []).map((f) => {
      const p = f.properties;
      const street = [p.housenumber, p.street].filter(Boolean).join(' ');
      return {
        name: p.name ?? (street || 'Place'),
        detail: [p.name ? street : '', p.city, p.state].filter(Boolean).join(', '),
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
      };
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
