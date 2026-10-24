/**
 * Extra live hazard feeds layered on top of the USGS sensor rule:
 *  - ATXfloods (City of Austin + area counties): official crossing closures
 *  - National Weather Service: active Flash Flood / Flood warnings (polygons)
 *  - Open-Meteo: rain that fell in the last 3 h and rain expected in the next 3 h
 * All are free, keyless and browser-accessible. Each fails independently.
 */
import type { LatLon } from './geo';
import { distanceKm } from './geo';

// ---------------- ATXfloods ----------------
export type OfficialCrossing = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  closed: boolean;
  comment: string;
  updatedAt: number | null;
  jurisdiction: string;
};

type AtxRow = {
  id: number;
  name?: string;
  jurisdiction?: string;
  lat?: string | number;
  lon?: string | number;
  comment?: string;
  status?: string;
  updated_at?: string;
};

function toOfficial(r: AtxRow): OfficialCrossing | null {
  const lat = Number(r.lat);
  const lon = Number(r.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return {
    id: `atxf-${r.id}`,
    name: (r.name ?? '').trim().replace(/\s+@\s*$/, '') || 'Low-water crossing',
    lat,
    lon,
    closed: String(r.status).toLowerCase() === 'closed',
    comment: r.comment ?? '',
    updatedAt: r.updated_at ? Date.parse(r.updated_at) : null,
    jurisdiction: r.jurisdiction ?? '',
  };
}

/** Official closures only (small payload, refreshed often). */
export async function fetchOfficialClosures(signal?: AbortSignal): Promise<OfficialCrossing[]> {
  const res = await fetch('https://api.atxfloods.com/api/closures', { signal });
  if (!res.ok) throw new Error(`ATXfloods ${res.status}`);
  const j = (await res.json()) as { attributes?: AtxRow[] };
  if (!Array.isArray(j?.attributes)) throw new Error('ATXfloods closure response is missing its records');
  return (j.attributes ?? []).map(toOfficial).filter((x): x is OfficialCrossing => !!x && x.closed);
}

/** Full official inventory (~2,500 crossings, ~650 KB). Fetched once per session. */
export async function fetchOfficialInventory(signal?: AbortSignal): Promise<OfficialCrossing[]> {
  const res = await fetch('https://api.atxfloods.com/api/crossings', { signal });
  if (!res.ok) throw new Error(`ATXfloods ${res.status}`);
  const j = (await res.json()) as { attributes?: AtxRow[] };
  if (!Array.isArray(j?.attributes)) throw new Error('ATXfloods inventory response is missing its records');
  return (j.attributes ?? []).map(toOfficial).filter((x): x is OfficialCrossing => !!x);
}

// ---------------- NWS warnings ----------------
export type WeatherAlert = {
  id: string;
  event: string;
  severity: string;
  headline: string;
  expires: number | null;
  /** Outer rings as [lat, lon] lists. */
  polygons: [number, number][][];
  /** Flash Flood Warning / Emergency: treat crossings inside as "avoid if you can". */
  flashFlood: boolean;
};

const FLOOD_EVENTS = new Set([
  'Flash Flood Emergency',
  'Flash Flood Warning',
  'Flood Warning',
  'Flood Advisory',
  'Flash Flood Watch',
  'Flood Watch',
]);

type NwsFeature = {
  id?: string;
  geometry?: { type: string; coordinates: number[][][] | number[][][][] } | null;
  properties?: { event?: string; severity?: string; headline?: string; expires?: string };
};

export function parseNwsAlerts(features: NwsFeature[]): WeatherAlert[] {
  const out: WeatherAlert[] = [];
  for (const f of features) {
    const event = f.properties?.event ?? '';
    if (!FLOOD_EVENTS.has(event)) continue;
    const g = f.geometry;
    const rings: [number, number][][] = [];
    if (g?.type === 'Polygon') {
      const ring = (g.coordinates as number[][][])[0];
      if (ring) rings.push(ring.map(([lon, lat]) => [lat!, lon!]));
    } else if (g?.type === 'MultiPolygon') {
      for (const poly of g.coordinates as number[][][][]) {
        const ring = poly[0];
        if (ring) rings.push(ring.map(([lon, lat]) => [lat!, lon!]));
      }
    }
    out.push({
      id: f.id ?? `${event}-${out.length}`,
      event,
      severity: f.properties?.severity ?? '',
      headline: f.properties?.headline ?? event,
      expires: f.properties?.expires ? Date.parse(f.properties.expires) : null,
      polygons: rings,
      flashFlood: event === 'Flash Flood Warning' || event === 'Flash Flood Emergency',
    });
  }
  return out;
}

export async function fetchWeatherAlerts(signal?: AbortSignal): Promise<WeatherAlert[]> {
  const res = await fetch('https://api.weather.gov/alerts/active?area=TX', {
    signal,
    headers: { Accept: 'application/geo+json' },
  });
  if (!res.ok) throw new Error(`NWS ${res.status}`);
  const j = (await res.json()) as { features?: NwsFeature[] };
  if (!Array.isArray(j?.features)) throw new Error('NWS response is missing its alert records');
  return parseNwsAlerts(j.features ?? []);
}

export function pointInRing(p: LatLon, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [yi, xi] = ring[i]!;
    const [yj, xj] = ring[j]!;
    if (yi > p.lat !== yj > p.lat && p.lon < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** The most serious non-expired flood alert polygon containing this point, if any. */
export function alertAt(p: LatLon, alerts: WeatherAlert[], now = Date.now()): WeatherAlert | null {
  let best: WeatherAlert | null = null;
  const rank = (a: WeatherAlert) =>
    a.event === 'Flash Flood Emergency' ? 5 : a.event === 'Flash Flood Warning' ? 4 : a.event === 'Flood Warning' ? 3 : a.event.includes('Watch') ? 1 : 2;
  for (const a of alerts) {
    if (a.expires != null && Number.isFinite(a.expires) && a.expires <= now) continue;
    if (a.polygons.some((r) => pointInRing(p, r)) && (!best || rank(a) > rank(best))) best = a;
  }
  return best;
}

// ---------------- Open-Meteo rainfall ----------------
export type RainCell = { lat: number; lon: number; past3hMm: number; next3hMm: number; past1hMm: number };

/** Rain on a ~10 km grid covering the given points (one request). */
export async function fetchRain(points: LatLon[], signal?: AbortSignal): Promise<RainCell[]> {
  const cells = new Map<string, LatLon>();
  for (const p of points) {
    const lat = Math.round(p.lat * 10) / 10;
    const lon = Math.round(p.lon * 10) / 10;
    cells.set(`${lat},${lon}`, { lat, lon });
  }
  const list = [...cells.values()].slice(0, 80);
  if (!list.length) return [];
  const url =
    'https://api.open-meteo.com/v1/forecast?hourly=precipitation&past_hours=3&forecast_hours=3&timezone=UTC' +
    `&latitude=${list.map((c) => c.lat).join(',')}&longitude=${list.map((c) => c.lon).join(',')}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const raw = (await res.json()) as unknown;
  const arr = (Array.isArray(raw) ? raw : [raw]) as {
    hourly?: { time?: string[]; precipitation?: (number | null)[] };
  }[];
  const nowHour = Math.floor(Date.now() / 3600_000) * 3600_000;
  return arr.map((r, i) => {
    const times = (r.hourly?.time ?? []).map((t) => Date.parse(`${t}Z`));
    const mm = r.hourly?.precipitation ?? [];
    let past3hMm = 0;
    let next3hMm = 0;
    let past1hMm = 0;
    times.forEach((t, k) => {
      const v = mm[k] ?? 0;
      if (t < nowHour) {
        past3hMm += v;
        if (t >= nowHour - 3600_000) past1hMm += v;
      } else next3hMm += v;
    });
    const c = list[i]!;
    return { lat: c.lat, lon: c.lon, past3hMm, next3hMm, past1hMm };
  });
}

export function rainAt(p: LatLon, cells: RainCell[]): RainCell | null {
  let best: RainCell | null = null;
  let bestD = Infinity;
  for (const c of cells) {
    const d = distanceKm(p, c);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return bestD < 12 ? best : null;
}

/**
 * Heavy-rain flag. Austin's urban creeks can flash-flood with roughly 1–2 inches of rain
 * in an hour or two, so we flag 1 inch (25 mm) in 3 h or 0.5 inch (13 mm) in 1 h.
 */
export function isHeavyRain(c: RainCell | null): boolean {
  return !!c && (c.past3hMm >= 25 || c.past1hMm >= 13 || c.next3hMm >= 25);
}

export const mmToIn = (mm: number) => mm / 25.4;
