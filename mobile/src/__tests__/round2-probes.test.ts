import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, jest, test } from '@jest/globals';
import * as Speech from 'expo-speech';
import { allowedWindows } from '@/lib/risk';
import { isBucketActiveForWindow, toArrivalBucketKey } from '@/components/ArrivalBucketStrip';
import { crossings, floodHistory } from '@/lib/data';
import {
  cleanPhysicalCrossingName,
  countDistinctHistoryEvents,
  groupPhysicalCrossings,
  selectDriveTargets,
} from '@/lib/danger';
import { insideCoverage } from '@/lib/geo';
import {
  buildGuardianHazardsFromStatuses,
  extractSourceEvidence,
  upsertHazardSource,
  type TaggedHazard,
} from '@/lib/guardian';
import * as webGuardian from '@/lib/guardian.web';
import { assessRouteCoverage } from '@/lib/routing';
import { getVoiceMuted, setVoiceMuted, speak } from '@/lib/voice';
import type { CrossingStatus } from '@/lib/monitor-context';

const base = (patch: Partial<CrossingStatus> = {}): CrossingStatus => ({
  id: 'atx-probe',
  name: 'Probe Road at Creek A',
  creek: 'Creek A',
  lat: 30.2672,
  lon: -97.7431,
  monitored: true,
  coverage: 'calibrated',
  state: 'no_rise',
  window: null,
  displayState: 'no_rise',
  distanceKm: 1,
  live: null,
  official: null,
  alert: null,
  rain: null,
  history: null,
  danger: null,
  reasons: [],
  ...patch,
});

describe('round 2 & round 3 adversarial audit', () => {
  test.each(allowedWindows)('visual arrival contract accepts model window %s', (encoded) => {
    const window = encoded.split(',').map(Number) as [number, number];
    expect(toArrivalBucketKey(window)).not.toBeNull();
  });

  test('[30, 90] multi-bucket window highlights 30-45, 45-60, and 60-90 buckets', () => {
    expect(toArrivalBucketKey([30, 90])).toBe('[30, 45]');
    expect(isBucketActiveForWindow('[30, 45]', [30, 90])).toBe(true);
    expect(isBucketActiveForWindow('[45, 60]', [30, 90])).toBe(true);
    expect(isBucketActiveForWindow('[60, 90]', [30, 90])).toBe(true);
    expect(isBucketActiveForWindow('[15, 30]', [30, 90])).toBe(false);
  });

  test('a calm sensor at an official closure is still closed and has no lag window', () => {
    const [target] = selectDriveTargets([
      base({
        displayState: 'closed',
        danger: 'block',
        reasons: ['official_closed'],
        window: [30, 60],
        official: { closed: true, comment: '', updatedAt: 2000 },
      }),
    ]);
    expect(target?.state).toBe('closed');
    expect(target?.window).toBeNull();
  });

  test('an unmonitored NWS warning is selected for Drive', () => {
    const [target] = selectDriveTargets([
      base({
        monitored: false,
        state: 'unknown',
        displayState: 'avoid',
        danger: 'block',
        reasons: ['ffw'],
      }),
    ]);
    expect(target?.state).toBe('avoid');
  });

  test('closure observation time must describe the closure rather than a calm gauge', () => {
    const [target] = selectDriveTargets([
      base({
        displayState: 'closed',
        danger: 'block',
        reasons: ['official_closed'],
        official: { closed: true, comment: '', updatedAt: 2000 },
        live: {
          crossingId: 'atx-probe',
          state: 'no_rise',
          window: null,
          link: null,
          stageFt: 1,
          rise30Ft: 0,
          obsAt: 1000,
        },
      }),
    ]);
    expect(target?.obsAt).toBe(2000);
    expect(target?.obsKind).toBe('closure');
  });

  test('distinct creek crossings on the same road must not merge solely by proximity', () => {
    const groups = groupPhysicalCrossings([
      base(),
      base({ id: 'atx-probe-b', name: 'Probe Road at Creek B', creek: 'Creek B', lat: 30.2692 }),
    ]);
    expect(groups).toHaveLength(2);
  });

  test('multi-arm device records on the same road and creek merge and strip Master Arm hardware suffixes', () => {
    expect(cleanPhysicalCrossingName('Old San Antonio Rd Master Arm at Onion Creek')).toBe(
      'Old San Antonio Rd at Onion Creek',
    );
    const groups = groupPhysicalCrossings([
      base({
        id: 'atx-7',
        name: 'E. William Cannon Master Standpipe at Onion Creek',
        creek: 'Onion Creek',
        history: {
          reports: 2,
          deaths: 0,
          vehicleDeaths: 0,
          vehicleRelated: 1,
          lastEvent: '2015-10-30',
          tier: 'elevated',
          events: [
            {
              date: '2013-10-31',
              type: 'Flash Flood',
              dist_km: 0.4,
              deaths: 0,
              vehicle_related: true,
              summary: 'Onion Creek overtopped E William Cannon.',
            },
          ],
        },
      }),
      base({
        id: 'atx-63',
        name: 'E. William Cannon Slave Arm (W) at Onion Creek',
        creek: 'Onion Creek',
        lat: 30.2675,
        history: {
          reports: 2,
          deaths: 0,
          vehicleDeaths: 0,
          vehicleRelated: 1,
          lastEvent: '2015-10-30',
          tier: 'elevated',
          events: [
            {
              date: '2015-10-30',
              type: 'Flash Flood',
              dist_km: 0.5,
              deaths: 0,
              vehicle_related: true,
              summary: 'Vehicles stranded near William Cannon.',
            },
          ],
        },
      }),
    ]);
    expect(groups).toHaveLength(1);
    const hist = countDistinctHistoryEvents(groups);
    expect(hist.distinctEvents).toBe(2);
  });

  test('current coverage excludes the public College Station district-office coordinate and flags route coverage', () => {
    const collegeStation = { lat: 30.626523387717626, lon: -96.33852071617036 };
    const austin = { lat: 30.2672, lon: -97.7431 };
    expect(insideCoverage(collegeStation)).toBe(false);
    const cov = assessRouteCoverage(austin, collegeStation, [austin, collegeStation]);
    expect(cov.outsideCoverage).toBe(true);
    expect(cov.coverageFraction).toBeLessThan(1);
  });

  test('foreground Guardian cache writes source tags for all contributing hazard sources', () => {
    const now = 1_700_000_000_000;
    const fgHazards = buildGuardianHazardsFromStatuses(
      [
        base({
          id: 'atx-19',
          name: 'E. William Cannon Slave Arm (W)',
          displayState: 'avoid',
          danger: 'block',
          reasons: ['sensor_avoid', 'ffw'],
        }),
      ],
      (s) => s.reasons.join(','),
      now,
    );
    expect(fgHazards).toHaveLength(1);
    expect(fgHazards[0]?.sources).toEqual(['nws', 'usgs']);
    expect(fgHazards[0]?.source).toBe('nws');
  });

  test('setVoiceMuted blocks forced automatic speech at the speech engine and restores when unmuted', () => {
    const speakSpy = jest.spyOn(Speech, 'speak').mockImplementation(() => {});
    try {
      setVoiceMuted(true);
      expect(getVoiceMuted()).toBe(true);
      speak('Forced test phrase while muted', 'en', { force: true });
      expect(speakSpy).not.toHaveBeenCalled();

      setVoiceMuted(false);
      expect(getVoiceMuted()).toBe(false);
      speak('Unmuted active alert phrase', 'en', { force: true });
      expect(speakSpy).toHaveBeenCalledTimes(1);
    } finally {
      setVoiceMuted(false);
      speakSpy.mockRestore();
    }
  });

  // ---------- Round 3 Independent Peer Probes ----------
  test('round 3 probe 1: web Guardian exports the serializer imported by MonitorProvider', () => {
    expect((webGuardian as Record<string, unknown>).buildGuardianHazardsFromStatuses).toEqual(
      expect.any(Function),
    );
  });

  test('round 3 probe 2: one out-of-coverage excursion is not hidden by dense in-area vertices', () => {
    const austin = { lat: 30.2672, lon: -97.7431 };
    const beyond = { lat: 30.6265, lon: -96.3385 };
    const cov = assessRouteCoverage(austin, austin, [...Array(100).fill(austin), beyond, austin]);
    expect(cov.outsideCoverage).toBe(true);
    expect(cov.coverageFraction).toBeLessThan(0.9);
  });

  test('round 3 probe 3: same NOAA event seen from two crossings counts once despite different distance', () => {
    const history = (dist_km: number) => ({
      reports: 1,
      deaths: 0,
      vehicleDeaths: 0,
      vehicleRelated: 1,
      lastEvent: '2015-05-24',
      tier: 'elevated' as const,
      events: [
        {
          date: '2015-05-24',
          type: 'Flash Flood',
          dist_km,
          deaths: 0,
          vehicle_related: true,
          summary: 'The same event near these two locations.',
        },
      ],
    });
    const groups = groupPhysicalCrossings([
      base({ id: 'probe-a', name: 'Probe Road at Bear Creek', creek: 'Bear Creek', history: history(0.2) }),
      base({
        id: 'probe-b',
        name: 'Probe Road at Bear Creek',
        creek: 'Bear Creek',
        lat: 30.2673,
        history: history(0.3),
      }),
    ]);
    expect(countDistinctHistoryEvents(groups).distinctEvents).toBe(1);
  });

  test('round 3 probe 4: Bear Creek and Bear Branch remain distinct named waterways', () => {
    expect(
      groupPhysicalCrossings([
        base({ id: 'probe-a', name: 'Probe Road at Bear Creek', creek: 'Bear Creek' }),
        base({ id: 'probe-b', name: 'Probe Road at Bear Branch', creek: 'Bear Branch', lat: 30.2673 }),
      ]),
    ).toHaveLength(2);
  });

  // ---------- Round 3 Deep Provenance & Per-Source Reconciliation Checks ----------
  test('per-source Guardian evidence expires NWS warnings and clears official closures without leaking onto retained sensor watch', () => {
    const t0 = 1_700_000_000_000;
    const fgHazards = buildGuardianHazardsFromStatuses(
      [
        base({
          id: 'atx-19',
          name: 'E. William Cannon Slave Arm (W)',
          creek: 'Onion Creek',
          displayState: 'closed',
          danger: 'block',
          reasons: ['official_closed', 'ffw', 'sensor_watch'],
          official: { closed: true, comment: 'Barricaded', updatedAt: t0 - 60_000 },
          alert: { event: 'Flash Flood Warning', headline: 'FFW until +5m', expires: t0 + 5 * 60_000 },
          live: {
            crossingId: 'atx-19',
            state: 'watch',
            window: null,
            link: null,
            stageFt: 10.5,
            rise30Ft: 0.4,
            obsAt: t0 - 120_000,
          },
        }),
      ],
      () => 'Closed – official (ATXfloods)',
      t0,
    );
    expect(fgHazards).toHaveLength(1);
    const cached = fgHazards[0]!;
    expect(cached.expiresAt).toBe(t0 + 5 * 60_000);
    expect(cached.bySource?.atx?.level).toBe('block');
    expect(cached.bySource?.nws?.expiresAt).toBe(t0 + 5 * 60_000);
    expect(cached.bySource?.usgs?.level).toBe('caution');

    // Now simulate t0 + 10m: ATXFloods succeeds with [] (closure cleared), NWS failed after expiry, USGS failed (retained).
    const t1 = t0 + 10 * 60_000;
    const reconciled = new Map<string, TaggedHazard>();
    const nwsEv = extractSourceEvidence(cached, 'nws');
    if (nwsEv && (nwsEv.expiresAt == null || nwsEv.expiresAt > t1)) {
      upsertHazardSource(reconciled, cached, nwsEv);
    }
    const usgsEv = extractSourceEvidence(cached, 'usgs');
    if (usgsEv) {
      upsertHazardSource(reconciled, cached, usgsEv);
    }
    const afterClear = reconciled.get('atx-19');
    expect(afterClear?.sources).toEqual(['usgs']);
    expect(afterClear?.level).toBe('caution');
    expect(afterClear?.reason).not.toContain('Closed');
  });

  test('bundled 141-crossing study catalog merges E. William Cannon arms (atx-19/20/21) and deduplicates shared NOAA event_ids', () => {
    const seedStatuses: CrossingStatus[] = crossings.map((f) => {
      const h = floodHistory.crossings[f.properties.id];
      return base({
        id: f.properties.id,
        name: f.properties.name,
        creek: f.properties.creek ?? '',
        lat: f.geometry.coordinates[1]!,
        lon: f.geometry.coordinates[0]!,
        history: h
          ? {
              tier: h.risk_tier,
              reports: h.reports,
              deaths: h.deaths,
              vehicleDeaths: h.vehicle_deaths,
              vehicleRelated: h.vehicle_related,
              lastEvent: h.last_event,
              eventIds: h.event_ids,
              events: h.events,
            }
          : null,
      });
    });

    const wcRecords = seedStatuses.filter((s) => ['atx-19', 'atx-20', 'atx-21'].includes(s.id));
    expect(wcRecords).toHaveLength(3);
    const wcGroups = groupPhysicalCrossings(wcRecords);
    expect(wcGroups).toHaveLength(1);
    expect(wcGroups[0]?.cleanName).toBe('E. William Cannon');

    // Across the 3 arms, raw report counts are 3 + 4 + 5 = 12, which deduplicate by NOAA event_id to 5 distinct events.
    const rawReportSum = wcRecords.reduce((sum, r) => sum + (r.history?.reports ?? 0), 0);
    const dedup = countDistinctHistoryEvents(wcGroups);
    expect(rawReportSum).toBe(12);
    expect(dedup.crossingsWithHistory).toBe(1);
    expect(dedup.distinctEvents).toBe(5);

    // Old Spicewood Springs Rd arms (atx-9, atx-10, atx-11) also merge into 1 physical crossing and deduplicate 38 raw reports into 13 distinct events.
    const ossRecords = seedStatuses.filter((s) => ['atx-9', 'atx-10', 'atx-11'].includes(s.id));
    const ossGroups = groupPhysicalCrossings(ossRecords);
    expect(ossGroups).toHaveLength(1);
    expect(countDistinctHistoryEvents(ossGroups).distinctEvents).toBe(13);
  });

  test('Expo Go runtime safety: notify avoids root expo-notifications barrel and MapSurface avoids custom MapLibre native module', () => {
    const notifySrc = fs.readFileSync(path.join(__dirname, '../lib/notify.ts'), 'utf8');
    expect(notifySrc).not.toMatch(/from\s+['"]expo-notifications['"]/);
    expect(notifySrc).toContain('expo-notifications/build/scheduleNotificationAsync');

    const mapSurfaceSrc = fs.readFileSync(path.join(__dirname, '../features/map/MapSurface.tsx'), 'utf8');
    const nativeMapSrc = fs.readFileSync(path.join(__dirname, '../features/map/NativeMap.tsx'), 'utf8');
    expect(mapSurfaceSrc).not.toContain('@maplibre/maplibre-react-native');
    expect(nativeMapSrc).not.toContain('@maplibre/maplibre-react-native');

    const guardianSrc = fs.readFileSync(path.join(__dirname, '../lib/guardian.ts'), 'utf8');
    expect(guardianSrc).toContain('isRunningInExpoGo');
    expect(guardianSrc).toContain('ExecutionEnvironment.StoreClient');
  });
});
