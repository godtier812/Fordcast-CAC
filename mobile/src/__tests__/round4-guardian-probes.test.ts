import { beforeEach, expect, jest, test } from '@jest/globals';
import * as TaskManager from 'expo-task-manager';
import { storage } from '@/lib/storage';
import { sendLocalNotification } from '@/lib/notify';
import { fetchOfficialClosures, fetchWeatherAlerts } from '@/lib/hazards';
import { fetchLiveSeries } from '@/lib/live';
import {
  HAZARD_CACHE_KEY,
  activeCachedHazards,
  refreshInBackground,
  type GuardianCache,
} from '@/lib/guardian';

jest.mock('expo', () => ({ isRunningInExpoGo: () => false }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { appOwnership: 'standalone', executionEnvironment: 'standalone' },
  ExecutionEnvironment: { StoreClient: 'storeClient' },
}));
jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));
jest.mock('expo-location', () => ({}));
jest.mock('@/lib/storage', () => ({ storage: { get: jest.fn(), set: jest.fn(async () => {}) } }));
jest.mock('@/lib/notify', () => ({ sendLocalNotification: jest.fn(async () => true) }));
jest.mock('@/lib/hazards', () => ({
  fetchOfficialClosures: jest.fn(),
  fetchWeatherAlerts: jest.fn(),
  alertAt: jest.fn(() => null),
}));
jest.mock('@/lib/live', () => ({
  fetchLiveSeries: jest.fn(),
  linksFor: jest.fn(() => []),
  evaluateCrossing: jest.fn(),
}));

const now = 1_800_000_000_000;
const task = (TaskManager.defineTask as jest.Mock).mock.calls[0]![1] as (x: unknown) => Promise<void>;
const mocked = (x: unknown) => x as jest.Mock<(...args: any[]) => any>;

function cache(ageMin: number, expired: boolean): GuardianCache {
  const evidence = {
    source: 'nws' as const,
    level: 'block' as const,
    reason: 'Flash Flood Warning',
    obsAt: now - ageMin * 60000,
    expiresAt: now + (expired ? -1 : 20) * 60000,
  };
  return {
    at: now - ageMin * 60000,
    hazards: [
      {
        id: 'round4-only',
        name: 'Probe crossing',
        lat: 30.2672,
        lon: -97.7431,
        level: 'block',
        reason: evidence.reason,
        source: 'nws',
        sources: ['nws'],
        bySource: { nws: evidence },
        expiresAt: evidence.expiresAt,
      },
    ],
    sources: {
      usgs: { ok: false, at: null, obsAt: null },
      atx: { ok: true, at: now - ageMin * 60000 },
      nws: { ok: true, at: now - ageMin * 60000 },
    },
  };
}

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(now);
  mocked(sendLocalNotification).mockClear();
  mocked(sendLocalNotification).mockResolvedValue(true);
  mocked(storage.set).mockClear();
  mocked(fetchLiveSeries).mockRejectedValue(new Error('offline'));
  mocked(fetchOfficialClosures).mockRejectedValue(new Error('offline'));
  mocked(fetchWeatherAlerts).mockRejectedValue(new Error('offline'));
});

async function approach(c: GuardianCache) {
  mocked(storage.get).mockImplementation(async (key: unknown) =>
    key === HAZARD_CACHE_KEY ? JSON.stringify(c) : '{}',
  );
  await task({ data: { locations: [{ coords: { latitude: 30.2672, longitude: -97.7431 } }] } });
}

test('partial refresh drops an expired NWS-only warning when official feed succeeds', async () => {
  mocked(fetchOfficialClosures).mockResolvedValue([]);
  const next = await refreshInBackground(cache(11, true), now);
  expect(next.hazards).toHaveLength(0);
});

test('recent cache never sends an expired NWS warning before the ten-minute refresh threshold', async () => {
  await approach(cache(2, true));
  expect(sendLocalNotification).not.toHaveBeenCalled();
});

test('total network failure never revives an expired NWS warning from fallback cache', async () => {
  await approach(cache(11, true));
  expect(sendLocalNotification).not.toHaveBeenCalled();
});

test('total network failure retains an unexpired known warning within retention', async () => {
  await approach(cache(11, false));
  expect(sendLocalNotification).toHaveBeenCalledTimes(1);
});

test('expired NWS + valid ATX closure on the same crossing still alerts for the official closure', () => {
  const nwsEv = {
    source: 'nws' as const,
    level: 'block' as const,
    reason: 'Flash Flood Warning',
    obsAt: now - 5 * 60000,
    expiresAt: now - 60000,
  };
  const atxEv = {
    source: 'atx' as const,
    level: 'block' as const,
    reason: 'Closed on ATXFloods',
    obsAt: now - 5 * 60000,
    expiresAt: null,
  };
  const mixed: GuardianCache = {
    at: now - 5 * 60000,
    hazards: [
      {
        id: 'mixed-1',
        name: 'Onion Creek Crossing',
        lat: 30.2672,
        lon: -97.7431,
        level: 'block',
        reason: 'Closed on ATXFloods · Flash Flood Warning',
        source: 'atx',
        sources: ['atx', 'nws'],
        bySource: { atx: atxEv, nws: nwsEv },
        expiresAt: nwsEv.expiresAt,
      },
    ],
  };
  const active = activeCachedHazards(mixed, now);
  expect(active).toHaveLength(1);
  expect(active[0]!.sources).toEqual(['atx']);
  expect(active[0]!.reason).toBe('Closed on ATXFloods');
});

test('failed sendLocalNotification (false) does not record the 30-minute cooldown so retry succeeds', async () => {
  mocked(sendLocalNotification).mockResolvedValueOnce(false);
  await approach(cache(2, false));
  expect(sendLocalNotification).toHaveBeenCalledTimes(1);

  // Next tick should retry because cooldown was not recorded on failure
  mocked(sendLocalNotification).mockResolvedValueOnce(true);
  await approach(cache(2, false));
  expect(sendLocalNotification).toHaveBeenCalledTimes(2);
});
