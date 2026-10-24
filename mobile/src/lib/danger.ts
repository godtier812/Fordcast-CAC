/**
 * Combines every hazard source into one decision per crossing, selects route-ahead
 * or nearby warnings for Drive HUD, and groups multi-device records into physical crossings.
 * Pure + unit-tested. Ordering matters: the first reason is the one shown and spoken.
 */
import { distanceKm, type LatLon } from './geo';
import type { CrossingStatus, DangerReason } from './monitor-context';
import type { CopyKey } from './preferences';
import { distanceToRouteM } from './routing';
import type { CrossingStateKey } from '@/theme/tokens';

export const REASON_KEY: Record<DangerReason, CopyKey> = {
  official_closed: 'hz.official_closed',
  sensor_closed: 'hz.sensor_closed',
  sensor_avoid: 'hz.sensor_avoid',
  ffe: 'hz.ffe',
  ffw: 'hz.ffw',
  sensor_watch: 'hz.sensor_watch',
  flood_warning: 'hz.flood_warning',
  rain_history: 'hz.rain_history',
  sensor_offline_rain: 'hz.sensor_offline_rain',
  heavy_rain: 'hz.heavy_rain',
};

export const EXPLAIN_KEY: Record<DangerReason, CopyKey> = {
  official_closed: 'explain.official_closed',
  sensor_closed: 'explain.closed',
  sensor_avoid: 'explain.avoid',
  ffe: 'explain.ffw',
  ffw: 'explain.ffw',
  sensor_watch: 'explain.watch',
  flood_warning: 'explain.flood_warning',
  rain_history: 'explain.rain_history',
  sensor_offline_rain: 'explain.sensor_offline_rain',
  heavy_rain: 'explain.heavy_rain',
};

export type DangerInput = {
  monitored: boolean;
  state: CrossingStateKey;
  officialClosed: boolean;
  alertEvent: string | null;
  heavyRain: boolean;
  historyTier: 'high' | 'elevated' | 'none' | null;
};

const BLOCK: DangerReason[] = ['official_closed', 'sensor_closed', 'ffe', 'sensor_avoid', 'ffw'];

export function assessDanger(i: DangerInput): { danger: 'block' | 'caution' | null; reasons: DangerReason[] } {
  const reasons: DangerReason[] = [];
  if (i.officialClosed) reasons.push('official_closed');
  if (i.monitored && i.state === 'closed') reasons.push('sensor_closed');
  if (i.alertEvent === 'Flash Flood Emergency') reasons.push('ffe');
  if (i.monitored && i.state === 'avoid') reasons.push('sensor_avoid');
  if (i.alertEvent === 'Flash Flood Warning') reasons.push('ffw');
  if (i.monitored && i.state === 'watch') reasons.push('sensor_watch');
  if (i.alertEvent === 'Flood Warning' || i.alertEvent === 'Flood Advisory') reasons.push('flood_warning');
  if (i.heavyRain && (i.historyTier === 'high' || i.historyTier === 'elevated')) reasons.push('rain_history');
  if (i.heavyRain && i.monitored && i.state === 'unknown') reasons.push('sensor_offline_rain');
  if (i.heavyRain && !reasons.includes('rain_history')) reasons.push('heavy_rain');
  const danger = reasons.some((r) => BLOCK.includes(r)) ? 'block' : reasons.length ? 'caution' : null;
  return { danger, reasons };
}

/** How loudly to alert: 0 = map only, 2 = caution, 3 = avoid, 4 = closed / emergency. */
export function alertRank(danger: 'block' | 'caution' | null, reasons: DangerReason[]): number {
  if (!danger) return 0;
  if (reasons.includes('official_closed') || reasons.includes('sensor_closed') || reasons.includes('ffe')) return 4;
  if (danger === 'block') return 3;
  // Rain alone at a crossing with no flood history is shown on the map but not pushed.
  return reasons.every((r) => r === 'heavy_rain') ? 0 : 2;
}

/** Map a danger level onto the shared colour/shape vocabulary. */
export function dangerState(danger: 'block' | 'caution' | null, reasons: DangerReason[]): CrossingStateKey | null {
  if (!danger) return null;
  if (reasons.includes('official_closed') || reasons.includes('sensor_closed')) return 'closed';
  return danger === 'block' ? 'avoid' : 'watch';
}

const STATE_URGENCY: Record<CrossingStateKey, number> = {
  closed: 4,
  avoid: 3,
  watch: 2,
  unknown: 1,
  no_rise: 0,
};

/** Strips ATXFloods hardware/flasher suffixes so users see physical road names, not standpipe IDs. */
export function cleanPhysicalCrossingName(raw: string): string {
  return raw
    .replace(
      /\s*\b(?:Master Standpipe|Master Arm|Slave Arm|Standpipe|Flasher\s*#?\d*|Barrier\s*#?\d*)(?:\s*\([^)]+\))?/gi,
      '',
    )
    .replace(/\s*\((?:W|E|N|S|West|East|North|South)\)/gi, '')
    .replace(/\s*@\s*/g, ' at ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+at\s*$/i, '')
    .trim();
}

function roadStemKey(raw: string): string {
  const cleaned = cleanPhysicalCrossingName(raw)
    .toLowerCase()
    .split(/\s+at\s+/)[0]!
    .replace(/\b(dr|drive|rd|road|st|street|blvd|boulevard|pkwy|parkway|ln|lane|ave|avenue|hwy|highway|loop|fm|rm)\b/g, '')
    .replace(/[^a-z0-9]/g, '');
  return cleaned;
}

/**
 * Normalizes waterway names while preserving distinct waterway type nouns (`creek`, `branch`,
 * `river`, `tributary`, `fork`, `slough`, `draw`). Only expands abbreviations (`ck` -> `creek`,
 * `br` -> `branch`, `rv` -> `river`, `trib` -> `tributary`, `fk` -> `fork`) so "Bear Creek"
 * (`bearcreek`) and "Bear Branch" (`bearbranch`) never collapse into the same stem.
 */
export function creekStemKey(creek: string, rawName: string): string {
  const fromName = cleanPhysicalCrossingName(rawName).toLowerCase().split(/\s+at\s+/)[1] ?? '';
  const source = (creek || fromName).toLowerCase();
  return source
    .replace(/\b(?:ck|crk)\b/g, 'creek')
    .replace(/\bbr\b/g, 'branch')
    .replace(/\b(?:rv|riv)\b/g, 'river')
    .replace(/\btrib\b/g, 'tributary')
    .replace(/\bfk\b/g, 'fork')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Reviewed multi-arm crossing corridors in the bundled Austin seed catalog where hardware arms
 * (Master Standpipe + West/East Slave Arms) span a wide floodplain bridge approach.
 * Keyed by `${roadStem}|${creekStem}` -> max grouping radius in km.
 */
const REVIEWED_MULTI_ARM_CORRIDOR_KM: Record<string, number> = {
  'ewilliamcannon|onioncreek': 1.5, // atx-19 (W), atx-20 (Master), atx-21 (E) across Onion Creek floodplain
  'oldspicewoodsprings|bullcreek': 0.4, // atx-9, atx-10, atx-11
  'oldbeecaves|williamsoncreek': 0.25, // atx-1, atx-2
  'wasson|williamsoncreek': 0.25, // atx-7, atx-8
  'waterspark|walnutcreek': 0.25, // atx-12, atx-22
  'adelphi|walnutcreek': 0.25, // atx-13, atx-14
  'joetanner|williamsoncreek': 0.25, // atx-15, atx-16
  'lakewood|bullcreek': 0.25, // atx-17, atx-18
};

export type PhysicalCrossingGroup = {
  id: string;
  cleanName: string;
  primary: CrossingStatus;
  records: CrossingStatus[];
  recordCount: number;
  routeIndex?: number;
};

/**
 * Groups co-located device records (e.g., Master Standpipe + West/East Slave Arms + road record)
 * on the same road AND same waterway into a single physical crossing area while preserving
 * the worst-case hazard state and all member records. Never merges distinct waterways (e.g.,
 * Bear Creek vs. Bear Branch) on the same road.
 */
export function groupPhysicalCrossings<T extends CrossingStatus = CrossingStatus>(
  items: (T | { status: T; routeIndex?: number })[],
): PhysicalCrossingGroup[] {
  const groups: {
    stem: string;
    creekStem: string;
    records: T[];
    minRouteIndex: number;
  }[] = [];

  for (let i = 0; i < items.length; i++) {
    const rawItem = items[i]!;
    const wrapped = 'status' in rawItem && rawItem.status && typeof rawItem.status === 'object' && 'name' in rawItem.status;
    const status = (wrapped ? (rawItem as { status: T; routeIndex?: number }).status : (rawItem as T));
    const routeIndex = wrapped ? ((rawItem as { status: T; routeIndex?: number }).routeIndex ?? i) : i;
    const stem = roadStemKey(status.name);
    const creekStem = creekStemKey(status.creek, status.name);
    const existing = groups.find((g) => {
      if (g.stem.length < 4 || stem.length < 4 || g.stem !== stem) return false;
      if (g.creekStem && creekStem && g.creekStem !== creekStem) return false;
      const bothHaveCreek = Boolean(g.creekStem && creekStem);
      const corridorKey = bothHaveCreek ? `${stem}|${creekStem}` : '';
      const maxKm = bothHaveCreek ? (REVIEWED_MULTI_ARM_CORRIDOR_KM[corridorKey] ?? 0.32) : 0.12;
      // Measure against the group's anchor record (no transitive chaining along a road)
      return distanceKm(g.records[0]!, status) <= maxKm;
    });
    if (existing) {
      existing.records.push(status);
      if (!existing.creekStem && creekStem) existing.creekStem = creekStem;
      if (routeIndex < existing.minRouteIndex) existing.minRouteIndex = routeIndex;
    } else {
      groups.push({ stem, creekStem, records: [status], minRouteIndex: routeIndex });
    }
  }

  return groups.map((g) => {
    // Pick the worst-case hazard state across all co-located records, and prefer a monitored/FordCast catalog ID for navigation.
    const byDanger = [...g.records].sort((a, b) => {
      const rankDiff = alertRank(b.danger, b.reasons) - alertRank(a.danger, a.reasons);
      if (rankDiff !== 0) return rankDiff;
      if (a.monitored !== b.monitored) return a.monitored ? -1 : 1;
      const aOurs = a.id.startsWith('atx-');
      const bOurs = b.id.startsWith('atx-');
      if (aOurs !== bOurs) return aOurs ? -1 : 1;
      return a.distanceKm - b.distanceKm;
    });
    const worst = byDanger[0]!;
    const preferredIdentity =
      g.records.find((r) => r.monitored) ??
      g.records.find((r) => r.id.startsWith('atx-') || r.id.startsWith('tc-')) ??
      worst;
    const withHistory = g.records.find((r) => (r.history?.reports ?? 0) > 0)?.history ?? preferredIdentity.history;
    const cleanName = cleanPhysicalCrossingName(preferredIdentity.name) || preferredIdentity.name;
    const mergedPrimary: CrossingStatus = {
      ...preferredIdentity,
      name: cleanName,
      danger: worst.danger,
      reasons: worst.reasons,
      displayState: worst.displayState ?? preferredIdentity.displayState,
      official: worst.official ?? preferredIdentity.official,
      history: withHistory,
    };
    return {
      id: preferredIdentity.id,
      cleanName,
      primary: mergedPrimary,
      records: g.records,
      recordCount: g.records.length,
      routeIndex: g.minRouteIndex,
    };
  });
}

/**
 * Counts distinct NOAA historical flood events across all member records of physical crossing groups.
 * Deduplicates by authoritative NOAA `event_id` when present, and falls back to crossing-invariant
 * event metadata (`date|type|deaths|vehicle_related|summary`) without `dist_km` so the same storm
 * event observed at different distances from two crossings is counted once.
 */
export function countDistinctHistoryEvents(groups: PhysicalCrossingGroup[]): {
  crossingsWithHistory: number;
  distinctEvents: number;
} {
  let crossingsWithHistory = 0;
  const eventKeys = new Set<string>();
  for (const g of groups) {
    let groupHasHistory = false;
    for (const rec of g.records) {
      const h = rec.history;
      if (h && h.reports > 0) {
        groupHasHistory = true;
        const allIds = (h as { eventIds?: string[] }).eventIds;
        if (Array.isArray(allIds) && allIds.length > 0) {
          for (const id of allIds) {
            if (id) eventKeys.add(`id:${id}`);
          }
        }
        for (const e of h.events) {
          const eid = (e as { event_id?: string }).event_id;
          if (eid) {
            eventKeys.add(`id:${eid}`);
          } else {
            const normSummary = (e.summary ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
            eventKeys.add(
              `ev:${e.date}|${e.type}|${e.deaths}|${e.vehicle_related ? 1 : 0}|${normSummary}`,
            );
          }
        }
      }
    }
    if (groupHasHistory) crossingsWithHistory += 1;
  }
  return { crossingsWithHistory, distinctEvents: eventKeys.size };
}

export type DriveTarget = {
  id: string;
  name: string;
  creek: string;
  /** Authoritative combined state (official closure / NWS warning / sensor state). */
  state: CrossingStateKey;
  displayState: CrossingStateKey;
  window: [number, number] | null;
  distanceKm: number;
  reasons: DangerReason[];
  danger: 'block' | 'caution' | null;
  monitored: boolean;
  onActiveRoute: boolean;
  obsAt: number | null;
  obsKind: 'closure' | 'sensor' | null;
};

/**
 * Shared hazard selector for Drive HUD:
 * - Includes combined official closures and NWS flood warnings even on unmonitored crossings.
 * - Uses `displayState ?? state` so a calm sensor at an officially closed crossing still shows `closed`.
 * - Orders along the active route ahead of the driver when `routeCoords` is provided.
 */
export function selectDriveTargets(
  statuses: CrossingStatus[],
  origin: LatLon = { lat: 30.2672, lon: -97.7431 },
  routeCoords?: LatLon[] | null,
  limit = 6,
): DriveTarget[] {
  const toTarget = (s: CrossingStatus, onActiveRoute: boolean): DriveTarget => {
    const combinedState: CrossingStateKey = s.displayState ?? s.state;
    const isOfficialClosure = s.reasons.includes('official_closed') || !!s.official?.closed;
    const obsAt = isOfficialClosure
      ? (s.official?.updatedAt ?? s.live?.obsAt ?? null)
      : (s.live?.obsAt ?? s.official?.updatedAt ?? null);
    const obsKind: 'closure' | 'sensor' | null = isOfficialClosure
      ? s.official?.updatedAt != null
        ? 'closure'
        : null
      : s.live?.obsAt != null
        ? 'sensor'
        : null;
    return {
      id: s.id,
      name: cleanPhysicalCrossingName(s.name) || s.name,
      creek: s.creek,
      state: combinedState,
      displayState: combinedState,
      // Only show a gauge lag window when the crossing is not already officially closed
      window: isOfficialClosure ? null : (s.window ?? null),
      distanceKm: s.distanceKm,
      reasons: s.reasons,
      danger: s.danger,
      monitored: s.monitored,
      onActiveRoute,
      obsAt,
      obsKind,
    };
  };

  if (routeCoords && routeCoords.length >= 2) {
    const hereHit = distanceToRouteM(origin, routeCoords);
    const herePos = hereHit.index + hereHit.t;
    const aheadHits: { status: CrossingStatus; routeIndex: number }[] = [];
    for (const s of statuses) {
      if (!s.danger && !s.monitored) continue;
      const hit = distanceToRouteM(s, routeCoords);
      const pos = hit.index + hit.t;
      if (hit.d <= 120 && pos >= Math.max(0, herePos - 0.05)) {
        aheadHits.push({ status: s, routeIndex: pos });
      }
    }
    if (aheadHits.length > 0) {
      aheadHits.sort((a, b) => a.routeIndex - b.routeIndex);
      const grouped = groupPhysicalCrossings(aheadHits);
      return grouped.slice(0, limit).map((g) => toTarget(g.primary, true));
    }
  }

  // Nearby mode (no active route): prioritize crossings within 20 km (~12.4 mi) of the driver so rural county-wide
  // closures 30+ miles away do not displace local crossings unless nothing is within 20 km.
  const allCandidates = statuses.filter((s) => s.danger != null || s.monitored);
  const localCandidates = allCandidates.filter((s) => s.distanceKm <= 20);
  const candidates = localCandidates.length > 0 ? localCandidates : allCandidates;
  const grouped = groupPhysicalCrossings(candidates.map((status) => ({ status })));
  grouped.sort((a, b) => {
    const sa = a.primary;
    const sb = b.primary;
    const rankDiff = alertRank(sb.danger, sb.reasons) - alertRank(sa.danger, sa.reasons);
    if (rankDiff !== 0) return rankDiff;
    const stateA = sa.displayState ?? sa.state;
    const stateB = sb.displayState ?? sb.state;
    const urgDiff = STATE_URGENCY[stateB] - STATE_URGENCY[stateA];
    if (urgDiff !== 0) return urgDiff;
    return sa.distanceKm - sb.distanceKm;
  });

  return grouped.slice(0, limit).map((g) => toTarget(g.primary, false));
}
