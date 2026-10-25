/**
 * Guardian mode: FordCast keeps running in the background while you navigate with
 * Google Maps (or Waze, Apple Maps) and alerts you as you approach a flooded or closed
 * crossing. Uses a background location task, so it needs the installed app build —
 * Expo Go and web browsers cannot track location in the background.
 */
import { isRunningInExpoGo } from 'expo';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { crossings, officialCrossings } from './data';
import { distanceKm } from './geo';
import {
  HAZARD_CACHE_KEY,
  RETENTION_MAX_AGE_MS,
  activeCachedHazards,
  buildGuardianHazardsFromStatuses,
  extractSourceEvidence,
  hasSource,
  upsertHazardSource,
  type GuardianCache,
  type HazardSourceTag,
  type SourceEvidence,
  type TaggedHazard,
} from './guardian-cache';
import { alertAt, fetchOfficialClosures, fetchWeatherAlerts } from './hazards';
import { evaluateCrossing, fetchLiveSeries, linksFor } from './live';
import { sendLocalNotification } from './notify';
import { storage } from './storage';

export {
  HAZARD_CACHE_KEY,
  RETENTION_MAX_AGE_MS,
  activeCachedHazards,
  buildGuardianHazardsFromStatuses,
  extractSourceEvidence,
  hasSource,
  upsertHazardSource,
  type GuardianCache,
  type HazardSourceTag,
  type SourceEvidence,
  type TaggedHazard,
};

export const GUARDIAN_TASK = 'fordcast-guardian';
const SENT_KEY = 'fordcast.guardian.sent.v1';
const ALERT_WITHIN_KM = 1.6; // about 1 mile — enough time to turn off at highway speed
const REPEAT_AFTER_MS = 30 * 60_000;
const CACHE_MAX_AGE_MS = 10 * 60_000;
const BG_FETCH_TIMEOUT_MS = 12_000;

export async function readGuardianCache(): Promise<GuardianCache | null> {
  try {
    const raw = await storage.get(HAZARD_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuardianCache;
    if (!parsed || !Array.isArray(parsed.hazards)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Refresh hazards without the UI: USGS sensor rule + official ATXFloods closures + NWS Flash Flood polygons.
 * Never overwrites known hazards with an empty cache when sources fail, and reconciles per-source evidence
 * independently so a cleared source cannot survive on a retained non-blocking source.
 */
export async function refreshInBackground(
  prevCache?: GuardianCache | null,
  now = Date.now(),
): Promise<GuardianCache> {
  const prior = prevCache !== undefined ? prevCache : await readGuardianCache();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), BG_FETCH_TIMEOUT_MS);
  let seriesRes: PromiseSettledResult<Awaited<ReturnType<typeof fetchLiveSeries>>>;
  let closuresRes: PromiseSettledResult<Awaited<ReturnType<typeof fetchOfficialClosures>>>;
  let nwsRes: PromiseSettledResult<Awaited<ReturnType<typeof fetchWeatherAlerts>>>;
  try {
    [seriesRes, closuresRes, nwsRes] = await Promise.allSettled([
      fetchLiveSeries(now, ctrl.signal),
      fetchOfficialClosures(ctrl.signal),
      fetchWeatherAlerts(ctrl.signal),
    ]);
  } finally {
    clearTimeout(timer);
  }

  const usgsReadingsCount =
    seriesRes.status === 'fulfilled'
      ? Object.values(seriesRes.value).reduce((sum, rows) => sum + rows.length, 0)
      : 0;
  const usgsOk = seriesRes.status === 'fulfilled' && usgsReadingsCount > 0;
  const atxOk = closuresRes.status === 'fulfilled';
  const nwsOk = nwsRes.status === 'fulfilled';

  if (!usgsOk && !atxOk && !nwsOk) {
    throw new Error('All background hazard sources failed or returned empty sensor data');
  }

  const byId = new Map<string, TaggedHazard>();
  let latestObsAt: number | null = null;
  const retainUsgsFromPrior =
    prior != null && now - (prior.sources?.usgs.at ?? prior.at) <= RETENTION_MAX_AGE_MS;

  if (usgsOk && seriesRes.status === 'fulfilled') {
    for (const rows of Object.values(seriesRes.value)) {
      const last = rows[rows.length - 1];
      if (last && (latestObsAt == null || last.t > latestObsAt)) latestObsAt = last.t;
    }
    for (const f of crossings) {
      if (!linksFor(f.properties.id).length) continue;
      const s = evaluateCrossing(f.properties.id, seriesRes.value, now);
      const base = {
        id: f.properties.id,
        name: f.properties.name,
        lat: f.geometry.coordinates[1]!,
        lon: f.geometry.coordinates[0]!,
      };
      if (s.state === 'avoid' || s.state === 'closed') {
        upsertHazardSource(byId, base, {
          source: 'usgs',
          level: 'block',
          reason: 'Experimental creek sensor trigger',
          obsAt: s.obsAt,
          expiresAt: null,
        });
      } else if (s.state === 'unknown' && retainUsgsFromPrior && prior) {
        // Stale/missing gauge reading for this specific crossing: retain only its prior USGS evidence
        const prevHaz = prior.hazards.find((h) => h.id === f.properties.id);
        const ev = prevHaz ? extractSourceEvidence(prevHaz, 'usgs') : null;
        if (ev) upsertHazardSource(byId, base, ev);
      }
    }
  } else if (retainUsgsFromPrior && prior) {
    for (const h of prior.hazards) {
      const ev = extractSourceEvidence(h, 'usgs');
      if (ev) {
        upsertHazardSource(byId, h, ev);
      }
    }
    latestObsAt = prior.sources?.usgs.obsAt ?? null;
  }

  if (atxOk && closuresRes.status === 'fulfilled') {
    for (const c of closuresRes.value) {
      upsertHazardSource(
        byId,
        { id: c.id, name: c.name, lat: c.lat, lon: c.lon },
        {
          source: 'atx',
          level: 'block',
          reason: 'Officially closed (ATXFloods)',
          obsAt: c.updatedAt ?? now,
          expiresAt: null,
        },
      );
    }
  } else if (prior && now - (prior.sources?.atx.at ?? prior.at) <= RETENTION_MAX_AGE_MS) {
    for (const h of prior.hazards) {
      const ev = extractSourceEvidence(h, 'atx');
      if (ev) {
        upsertHazardSource(byId, h, ev);
      }
    }
  }

  if (nwsOk && nwsRes.status === 'fulfilled') {
    const activeAlerts = nwsRes.value;
    for (const f of crossings) {
      const [lon, lat] = f.geometry.coordinates as [number, number];
      const hit = alertAt({ lat, lon }, activeAlerts, now);
      if (hit && hit.flashFlood) {
        upsertHazardSource(
          byId,
          { id: f.properties.id, name: f.properties.name, lat, lon },
          {
            source: 'nws',
            level: 'block',
            reason: hit.event,
            obsAt: now,
            expiresAt: hit.expires,
          },
        );
      }
    }
    for (const c of officialCrossings) {
      const hit = alertAt({ lat: c.lat, lon: c.lon }, activeAlerts, now);
      if (hit && hit.flashFlood) {
        upsertHazardSource(
          byId,
          { id: c.id, name: c.name, lat: c.lat, lon: c.lon },
          {
            source: 'nws',
            level: 'block',
            reason: hit.event,
            obsAt: now,
            expiresAt: hit.expires,
          },
        );
      }
    }
  } else if (prior && now - (prior.sources?.nws.at ?? prior.at) <= RETENTION_MAX_AGE_MS) {
    for (const h of prior.hazards) {
      const ev = extractSourceEvidence(h, 'nws');
      if (ev && (ev.expiresAt == null || ev.expiresAt > now)) {
        upsertHazardSource(byId, h, ev);
      }
    }
  }

  const nextCache: GuardianCache = {
    at: now,
    hazards: [...byId.values()],
    sources: {
      usgs: { ok: usgsOk, at: usgsOk ? now : (prior?.sources?.usgs.at ?? null), obsAt: latestObsAt },
      atx: { ok: atxOk, at: atxOk ? now : (prior?.sources?.atx.at ?? null) },
      nws: { ok: nwsOk, at: nwsOk ? now : (prior?.sources?.nws.at ?? null) },
    },
  };
  await storage.set(HAZARD_CACHE_KEY, JSON.stringify(nextCache)).catch(() => {});
  return nextCache;
}

function isExpoGoClient(): boolean {
  try {
    if (typeof isRunningInExpoGo === 'function' && isRunningInExpoGo()) return true;
  } catch {
    // Fall back to Constants checks below.
  }
  return (
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  );
}

if (!isExpoGoClient()) {
  try {
    TaskManager.defineTask<{ locations: Location.LocationObject[] }>(GUARDIAN_TASK, async ({ data, error }) => {
      if (error || !data?.locations?.length) return;
      const loc = data.locations[data.locations.length - 1]!;
      const here = { lat: loc.coords.latitude, lon: loc.coords.longitude };
      const cache = await readGuardianCache();
      const now = Date.now();
      let activeCache = cache;
      if (!cache || now - cache.at >= CACHE_MAX_AGE_MS) {
        try {
          activeCache = await refreshInBackground(cache, now);
        } catch {
          activeCache = cache && now - cache.at <= RETENTION_MAX_AGE_MS ? cache : null;
        }
      }
      const hazards = activeCachedHazards(activeCache, now);
      const near = hazards
        .filter((h) => h.level === 'block')
        .map((h) => ({ h, d: distanceKm(here, h) }))
        .filter((x) => x.d <= ALERT_WITHIN_KM)
        .sort((a, b) => a.d - b.d);
      if (!near.length) return;
      const sent = JSON.parse((await storage.get(SENT_KEY).catch(() => null)) ?? '{}') as Record<string, number>;
      let changed = false;
      for (const { h, d } of near) {
        if (now - (sent[h.id] ?? 0) < REPEAT_AFTER_MS) continue;
        const miles = (d * 0.621371).toFixed(1);
        const delivered = await sendLocalNotification(
          `Flood Alert: ${h.name} ahead`,
          `${h.reason}, ${miles} mi from you. Turn around and find another route.`,
        );
        if (delivered) {
          sent[h.id] = now;
          changed = true;
        }
      }
      if (changed) {
        await storage.set(SENT_KEY, JSON.stringify(sent)).catch(() => {});
      }
    });
  } catch {
    // Task registration is unavailable on this platform.
  }
}

export type GuardianResult = 'started' | 'stopped' | 'unsupported' | 'denied';

export function guardianSupported(): boolean {
  return !isExpoGoClient();
}

export async function guardianRunning(): Promise<boolean> {
  if (!guardianSupported()) return false;
  try {
    return await Location.hasStartedLocationUpdatesAsync(GUARDIAN_TASK);
  } catch {
    return false;
  }
}

export async function startGuardian(): Promise<GuardianResult> {
  if (!guardianSupported()) return 'unsupported';
  try {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (!fg.granted) return 'denied';
    const bg = await Location.requestBackgroundPermissionsAsync();
    if (!bg.granted) return 'denied';
    await Location.startLocationUpdatesAsync(GUARDIAN_TASK, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 150,
      deferredUpdatesInterval: 30_000,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.AutomotiveNavigation,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'FordCast is watching for flooded crossings',
        notificationBody: 'Keep using Google Maps. FordCast will alert you near a flooded or closed crossing.',
        notificationColor: '#5294FF',
      },
    });
    return 'started';
  } catch {
    return 'unsupported';
  }
}

export async function stopGuardian(): Promise<GuardianResult> {
  try {
    if (await guardianRunning()) await Location.stopLocationUpdatesAsync(GUARDIAN_TASK);
  } catch {
    // Already stopped.
  }
  return 'stopped';
}
