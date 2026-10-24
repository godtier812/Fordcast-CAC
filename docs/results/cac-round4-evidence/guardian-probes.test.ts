import { beforeEach, expect, jest, test } from '@jest/globals';
jest.mock('expo', () => ({ isRunningInExpoGo: () => false }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { appOwnership: 'standalone', executionEnvironment: 'standalone' }, ExecutionEnvironment: { StoreClient: 'storeClient' } }));
jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));
jest.mock('expo-location', () => ({}));
jest.mock('@/lib/storage', () => ({ storage: { get: jest.fn(), set: jest.fn(async () => {}) } }));
jest.mock('@/lib/notify', () => ({ sendLocalNotification: jest.fn(async () => true) }));
jest.mock('@/lib/hazards', () => ({ fetchOfficialClosures: jest.fn(), fetchWeatherAlerts: jest.fn(), alertAt: jest.fn(() => null) }));
jest.mock('@/lib/live', () => ({ fetchLiveSeries: jest.fn(), linksFor: jest.fn(() => []), evaluateCrossing: jest.fn() }));
import * as TaskManager from 'expo-task-manager';
import { storage } from '@/lib/storage';
import { sendLocalNotification } from '@/lib/notify';
import { fetchOfficialClosures, fetchWeatherAlerts } from '@/lib/hazards';
import { fetchLiveSeries } from '@/lib/live';
import { HAZARD_CACHE_KEY, refreshInBackground, type GuardianCache } from '@/lib/guardian';

const now = 1_800_000_000_000;
const task = (TaskManager.defineTask as jest.Mock).mock.calls[0]![1] as (x: unknown) => Promise<void>;
const mocked = (x: unknown) => x as jest.Mock<any>;
function cache(ageMin: number, expired: boolean): GuardianCache {
  const evidence = { source: 'nws' as const, level: 'block' as const, reason: 'Flash Flood Warning', obsAt: now - ageMin * 60000, expiresAt: now + (expired ? -1 : 20) * 60000 };
  return { at: now - ageMin * 60000, hazards: [{ id: 'round4-only', name: 'Probe crossing', lat: 30.2672, lon: -97.7431, level: 'block', reason: evidence.reason, source: 'nws', sources: ['nws'], bySource: { nws: evidence }, expiresAt: evidence.expiresAt }], sources: { usgs: { ok: false, at: null, obsAt: null }, atx: { ok: true, at: now - ageMin * 60000 }, nws: { ok: true, at: now - ageMin * 60000 } } };
}
beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(now);
  mocked(sendLocalNotification).mockClear();
  mocked(fetchLiveSeries).mockRejectedValue(new Error('offline'));
  mocked(fetchOfficialClosures).mockRejectedValue(new Error('offline'));
  mocked(fetchWeatherAlerts).mockRejectedValue(new Error('offline'));
});
async function approach(c: GuardianCache) {
  mocked(storage.get).mockImplementation(async (key: unknown) => key === HAZARD_CACHE_KEY ? JSON.stringify(c) : '{}');
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
