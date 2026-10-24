/**
 * Live USGS stream-sensor feed + the same upstream warning rule the backend uses
 * (backend/fordcast/model/baseline_rule.py). Runs entirely on the device: one
 * HTTPS request to the public USGS Water Data API returns the last few hours of
 * gauge height for all 19 sensors.
 */
import { gauges, links, type CrossingLink } from './data';
import type { RiskState } from './risk';

export type GaugeReading = { t: number; v: number };
export type GaugeSeries = Record<string, GaugeReading[]>;

const USGS_CONTINUOUS =
  'https://api.waterdata.usgs.gov/ogcapi/v1/collections/continuous/items';

/** A sensor reading older than this is treated as "no data". */
export const LIVE_STALE_MIN = 80;
export const LIVE_REFRESH_MS = 5 * 60_000;
const HISTORY_HOURS = 3;
const BAD_QUALIFIERS = new Set(['ice', 'eqp', 'ssn', 'dis', 'dry']);

type UsgsFeature = {
  properties?: {
    monitoring_location_id?: string;
    parameter_code?: string;
    time?: string;
    value?: string | number | null;
    unit_of_measure?: string | null;
    qualifier?: string | string[] | null;
  };
};

export function parseUsgsFeatures(features: UsgsFeature[]): GaugeSeries {
  const byGauge: Record<string, Map<number, number>> = {};
  for (const f of features) {
    const p = f.properties;
    if (!p?.monitoring_location_id || p.parameter_code !== '00065') continue;
    if (p.unit_of_measure && p.unit_of_measure !== 'ft') continue;
    const v = typeof p.value === 'string' ? Number(p.value) : p.value;
    const t = p.time ? Date.parse(p.time) : NaN;
    if (v == null || !Number.isFinite(v) || !Number.isFinite(t)) continue;
    const quals = typeof p.qualifier === 'string' ? [p.qualifier] : (p.qualifier ?? []);
    if (quals.some((q) => BAD_QUALIFIERS.has(String(q).toLowerCase()))) continue;
    const m = (byGauge[p.monitoring_location_id] ??= new Map());
    // A site can publish several time series; keep one value per timestamp.
    if (!m.has(t)) m.set(t, v);
  }
  const out: GaugeSeries = {};
  for (const [id, m] of Object.entries(byGauge)) {
    out[id] = [...m.entries()].map(([t, v]) => ({ t, v })).sort((a, b) => a.t - b.t);
  }
  return out;
}

export async function fetchLiveSeries(now = Date.now(), signal?: AbortSignal): Promise<GaugeSeries> {
  const ids = gauges.map((g) => g.properties.id).join(',');
  const start = new Date(now - HISTORY_HOURS * 3600_000).toISOString().replace(/\.\d{3}Z$/, 'Z');
  const url =
    `${USGS_CONTINUOUS}?f=json&limit=10000&parameter_code=00065` +
    `&monitoring_location_id=${ids}&time=${start}/..`;
  const res = await fetch(url, { signal, headers: { Accept: 'application/geo+json' } });
  if (!res.ok) throw new Error(`USGS responded ${res.status}`);
  const json = (await res.json()) as { features?: UsgsFeature[] };
  return parseUsgsFeatures(json.features ?? []);
}

// ---------- rule helpers (ported from backend/fordcast/features/compute.py) ----------

function valueAt(rows: GaugeReading[], at: number): number | null {
  for (let i = 0; i + 1 < rows.length; i++) {
    const a = rows[i]!;
    const b = rows[i + 1]!;
    if (a.t <= at && at <= b.t) {
      if (a.t === at) return a.v;
      if (b.t === at) return b.v;
      const gap = b.t - a.t;
      if (gap > 0 && gap <= 30 * 60_000) return a.v + ((b.v - a.v) * (at - a.t)) / gap;
      return null;
    }
  }
  let closest: GaugeReading | null = null;
  for (const r of rows) if (!closest || Math.abs(r.t - at) < Math.abs(closest.t - at)) closest = r;
  return closest && Math.abs(closest.t - at) <= 10 * 60_000 ? closest.v : null;
}

export function rise30(rows: GaugeReading[]): number | null {
  if (rows.length < 2) return null;
  const last = rows[rows.length - 1]!;
  const before = valueAt(rows, last.t - 30 * 60_000);
  return before == null ? null : last.v - before;
}

function lastUpcrossing(rows: GaugeReading[], level: number): number | null {
  if (!rows.length) return null;
  if (rows.every((r) => r.v >= level)) return rows[0]!.t;
  for (let i = rows.length - 1; i > 0; i--) {
    const a = rows[i - 1]!;
    const b = rows[i]!;
    if (a.v < level && level <= b.v) {
      if (b.t - a.t > 30 * 60_000) return a.t;
      return a.t + ((b.t - a.t) * (level - a.v)) / (b.v - a.v);
    }
  }
  return null;
}

const BUCKETS: [number, number][] = [
  [0, 15],
  [15, 30],
  [30, 60],
  [60, 90],
];
export function toWindow(lo: number, hi: number): [number, number] | null {
  const l = Math.max(0, lo);
  if (l >= 90) return null;
  const h = Math.min(Math.max(l, hi), 90 - 1e-9);
  const i = BUCKETS.findIndex(([, up]) => l < up);
  const j = Math.min(
    BUCKETS.findIndex(([, up]) => h < up),
    i + 1,
  );
  return [BUCKETS[i]![0], BUCKETS[j]![1]];
}

export type LiveStatus = {
  crossingId: string;
  state: RiskState;
  window: [number, number] | null;
  link: CrossingLink | null;
  stageFt: number | null;
  rise30Ft: number | null;
  obsAt: number | null;
};

export function linksFor(crossingId: string): CrossingLink[] {
  return links.filter((l) => l.crossing_id === crossingId && l.relation === 'upstream');
}

export function primaryLink(crossingId: string): CrossingLink | null {
  const ls = linksFor(crossingId);
  return ls.find((l) => l.is_primary) ?? ls[0] ?? null;
}

/** Evaluate one monitored crossing against the latest sensor series. */
export function evaluateCrossing(
  crossingId: string,
  series: GaugeSeries,
  now: number,
): LiveStatus {
  const ls = linksFor(crossingId).sort((a, b) => a.gauge_id.localeCompare(b.gauge_id));
  const primary = primaryLink(crossingId);
  const avoid: { lo: number; hi: number; link: CrossingLink }[] = [];
  const watch: CrossingLink[] = [];
  let anyFresh = false;

  for (const link of ls) {
    const rows = series[link.gauge_id] ?? [];
    const last = rows[rows.length - 1];
    if (!last || now - last.t < 0 || now - last.t > LIVE_STALE_MIN * 60_000) continue;
    anyFresh = true;
    const r30 = rise30(rows);
    const crossed = lastUpcrossing(rows, link.trigger_stage_ft);
    let elapsed = crossed != null ? (now - crossed) / 60_000 : null;
    const recent = elapsed != null && elapsed <= link.lag_p75_min + 30;
    if (last.v >= link.trigger_stage_ft && ((r30 != null && r30 > link.rise_rate_ft_per_30m) || recent)) {
      elapsed = elapsed ?? (now - last.t) / 60_000;
      const lo = Math.max(0, link.lag_p25_min - elapsed);
      const hi = Math.max(lo, link.lag_p75_min - elapsed);
      avoid.push({ lo, hi, link });
    } else if (last.v >= link.watch_stage_ft && r30 != null && r30 > 0.2) {
      watch.push(link);
    }
  }

  const describe = (link: CrossingLink | null) => {
    const rows = link ? (series[link.gauge_id] ?? []) : [];
    const last = rows[rows.length - 1];
    return {
      link,
      stageFt: last?.v ?? null,
      rise30Ft: rise30(rows),
      obsAt: last?.t ?? null,
    };
  };

  if (!anyFresh) {
    return { crossingId, state: 'unknown', window: null, ...describe(primary) };
  }
  avoid.sort((a, b) => a.lo - b.lo);
  const first = avoid[0];
  if (first) {
    const win = first.lo < 90 ? toWindow(first.lo, first.hi) : null;
    return {
      crossingId,
      state: win ? 'avoid' : 'watch',
      window: win,
      ...describe(first.link),
    };
  }
  if (watch[0]) return { crossingId, state: 'watch', window: null, ...describe(watch[0]) };
  return { crossingId, state: 'no_rise', window: null, ...describe(primary) };
}
