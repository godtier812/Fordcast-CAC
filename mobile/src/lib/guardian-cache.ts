/**
 * Pure, platform-agnostic Guardian hazard cache serializer and per-source reconciliation helpers.
 * Imported by both native (`guardian.ts`) and web (`guardian.web.ts`) modules so foreground cache
 * writes and background partial-outage retention behave identically without pulling native modules into web.
 */
import type { CrossingStatus } from './monitor-context';
import type { HazardLevel, RouteHazard } from './routing';

export const HAZARD_CACHE_KEY = 'fordcast.hazards.v1';
export const RETENTION_MAX_AGE_MS = 60 * 60_000; // retain known hazards up to 60m during partial source outage

export type HazardSourceTag = 'usgs' | 'atx' | 'nws';

export type SourceEvidence = {
  source: HazardSourceTag;
  level: HazardLevel;
  reason: string;
  obsAt: number | null;
  expiresAt: number | null;
};

export type TaggedHazard = RouteHazard & {
  source?: HazardSourceTag;
  sources?: HazardSourceTag[];
  obsAt?: number | null;
  expiresAt?: number | null;
  bySource?: Partial<Record<HazardSourceTag, SourceEvidence>>;
};

export type GuardianCache = {
  at: number;
  hazards: TaggedHazard[];
  sources?: {
    usgs: { ok: boolean; at: number | null; obsAt: number | null };
    atx: { ok: boolean; at: number | null };
    nws: { ok: boolean; at: number | null };
  };
};

const SOURCE_ORDER: readonly HazardSourceTag[] = ['atx', 'nws', 'usgs'];

/**
 * Shared foreground -> Guardian cache serializer so foreground `monitor.tsx` writes
 * preserve exact per-source evidence (`atx`, `nws`, `usgs`), observation timestamps, and alert expiries.
 */
export function buildGuardianHazardsFromStatuses(
  statuses: CrossingStatus[],
  reasonText: (s: CrossingStatus) => string,
  now = Date.now(),
): TaggedHazard[] {
  const out: TaggedHazard[] = [];
  for (const s of statuses) {
    if (!s.danger) continue;
    const sources: HazardSourceTag[] = [];
    const bySource: Partial<Record<HazardSourceTag, SourceEvidence>> = {};

    if (s.reasons.includes('official_closed') || s.official?.closed) {
      sources.push('atx');
      bySource.atx = {
        source: 'atx',
        level: 'block',
        reason: 'Officially closed (ATXFloods)',
        obsAt: s.official?.updatedAt ?? s.live?.obsAt ?? now,
        expiresAt: null,
      };
    }

    if (
      s.reasons.includes('ffe') ||
      s.reasons.includes('ffw') ||
      s.reasons.includes('flood_warning') ||
      s.alert != null
    ) {
      sources.push('nws');
      const nwsBlock =
        s.reasons.includes('ffe') || s.reasons.includes('ffw') || Boolean(s.alert?.flashFlood);
      const alertExpires = (s.alert as { expires?: number | null } | null)?.expires ?? null;
      bySource.nws = {
        source: 'nws',
        level: nwsBlock ? 'block' : 'caution',
        reason:
          s.alert?.event ??
          (s.reasons.includes('ffe')
            ? 'Flash Flood Emergency'
            : s.reasons.includes('ffw')
              ? 'Flash Flood Warning'
              : 'Flood Warning'),
        obsAt: now,
        expiresAt: alertExpires,
      };
    }

    if (
      s.reasons.includes('sensor_closed') ||
      s.reasons.includes('sensor_avoid') ||
      s.reasons.includes('sensor_watch') ||
      s.reasons.includes('sensor_offline_rain')
    ) {
      sources.push('usgs');
      const usgsBlock = s.reasons.includes('sensor_closed') || s.reasons.includes('sensor_avoid');
      bySource.usgs = {
        source: 'usgs',
        level: usgsBlock ? 'block' : 'caution',
        reason: usgsBlock ? 'Experimental creek sensor trigger' : 'Experimental creek sensor watch',
        obsAt: s.live?.obsAt ?? now,
        expiresAt: null,
      };
    }

    if (sources.length === 0) {
      const fallback: HazardSourceTag = s.id.startsWith('atxf-') ? 'atx' : 'usgs';
      sources.push(fallback);
      bySource[fallback] = {
        source: fallback,
        level: s.danger,
        reason: reasonText(s),
        obsAt: s.live?.obsAt ?? s.official?.updatedAt ?? now,
        expiresAt: null,
      };
    }

    const primarySource = sources[0]!;
    const obsAt = bySource[primarySource]?.obsAt ?? now;
    const expiresAt = bySource.nws?.expiresAt ?? null;

    out.push({
      id: s.id,
      name: s.name,
      lat: s.lat,
      lon: s.lon,
      level: s.danger,
      reason: reasonText(s),
      source: primarySource,
      sources,
      obsAt,
      expiresAt,
      bySource,
    });
  }
  return out;
}

export function hasSource(h: TaggedHazard, src: HazardSourceTag): boolean {
  if (h.bySource?.[src] != null) return true;
  if (h.sources && h.sources.includes(src)) return true;
  if (h.source === src) return true;
  if (!h.source && !h.sources?.length) {
    if (src === 'atx' && h.id.startsWith('atxf-')) return true;
    if (src === 'usgs' && h.id.startsWith('atx-')) return true;
  }
  return false;
}

/**
 * Extracts isolated per-source evidence from a cached hazard so retaining one failed source
 * never carries over the level or reason of another source that has since cleared or expired.
 */
export function extractSourceEvidence(
  h: TaggedHazard,
  src: HazardSourceTag,
): SourceEvidence | null {
  if (h.bySource?.[src]) {
    return h.bySource[src]!;
  }
  const primary = h.source ?? h.sources?.[0];
  if (h.sources && h.sources.length > 1 && primary && src !== primary) {
    return null;
  }
  if (!hasSource(h, src)) return null;
  return {
    source: src,
    level: h.level,
    reason: h.reason,
    obsAt: h.obsAt ?? null,
    expiresAt: src === 'nws' ? (h.expiresAt ?? null) : null,
  };
}

/**
 * Prunes expired NWS alerts and stale (>60m) per-source entries from a Guardian cache snapshot
 * and recomputes each crossing's combined hazard strictly from its still-valid sources.
 */
export function activeCachedHazards(cache: GuardianCache | null | undefined, now: number): TaggedHazard[] {
  const active = new Map<string, TaggedHazard>();
  if (!cache || !Array.isArray(cache.hazards)) return [];
  for (const h of cache.hazards) {
    for (const src of SOURCE_ORDER) {
      const ev = extractSourceEvidence(h, src);
      if (!ev) continue;
      const checkedAt = cache.sources?.[src]?.at ?? cache.at;
      if (!Number.isFinite(checkedAt) || checkedAt > now || now - checkedAt > RETENTION_MAX_AGE_MS) continue;
      if (src === 'nws' && ev.expiresAt != null && ev.expiresAt <= now) continue;
      upsertHazardSource(active, h, ev);
    }
  }
  return [...active.values()];
}

/**
 * Upserts a single source's evidence for a crossing and recomputes the combined hazard level,
 * primary source, and reason strictly from the active per-source entries on that crossing.
 */
export function upsertHazardSource(
  map: Map<string, TaggedHazard>,
  base: { id: string; name: string; lat: number; lon: number },
  evidence: SourceEvidence,
): void {
  const existing = map.get(base.id);
  const bySource: Partial<Record<HazardSourceTag, SourceEvidence>> = {
    ...(existing?.bySource ?? {}),
    [evidence.source]: evidence,
  };
  const activeSources = SOURCE_ORDER.filter((s) => bySource[s] != null);
  const blockingSources = activeSources.filter((s) => bySource[s]?.level === 'block');
  const level: HazardLevel = blockingSources.length > 0 ? 'block' : 'caution';
  const primarySource = blockingSources[0] ?? activeSources[0] ?? evidence.source;
  const primaryEv = bySource[primarySource] ?? evidence;

  map.set(base.id, {
    id: base.id,
    name: existing?.name ?? base.name,
    lat: existing?.lat ?? base.lat,
    lon: existing?.lon ?? base.lon,
    level,
    reason: primaryEv.reason,
    source: primarySource,
    sources: activeSources,
    obsAt: primaryEv.obsAt,
    expiresAt: bySource.nws?.expiresAt ?? null,
    bySource,
  });
}
