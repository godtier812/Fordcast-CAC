import { afterEach, expect, jest, test } from '@jest/globals';
import renderer, { act } from 'react-test-renderer';
const mockMonitor = {
  mode: 'drill', drill: { stormId: 'memorial-day-2015', simT: 0 },
  settings: { voiceAlerts: false },
  statusById: { 'tc-167': { danger: 'block', reasons: ['sensor_avoid'] } },
  setTripActive: jest.fn(), setDrillPlaying: jest.fn(), pushAlert: jest.fn(), startDrill: jest.fn(),
};
jest.mock('@/lib/monitor-context', () => ({ useMonitor: () => mockMonitor }));
jest.mock('@/lib/preferences', () => ({ usePreferences: () => ({ language: 'en', t: (key: string) => key }) }));
jest.mock('@/lib/voice', () => ({ speak: jest.fn(), stopSpeaking: jest.fn() }));
import { useTripDemo } from '@/features/demo/useTripDemo';
let trip: ReturnType<typeof useTripDemo>;
function Harness() { trip = useTripDemo(); return null; }
let tree: renderer.ReactTestRenderer;
afterEach(() => { if (tree) act(() => tree.unmount()); jest.useRealTimers(); });
test('a named 50-second Memorial Day demo has reached its end by 60 seconds even with its detour', () => {
  jest.useFakeTimers();
  act(() => { tree = renderer.create(<Harness />); });
  act(() => { trip.start('memorial-day-2015'); });
  act(() => { jest.advanceTimersByTime(1); });
  expect(trip.run?.phase).toBe('rerouted');
  act(() => { jest.advanceTimersByTime(60_000); });
  expect(trip.run?.phase).toBe('arrived');
});
test('switching the drill storm ends the old car run rather than combining old geometry with new statuses', () => {
  jest.useFakeTimers();
  mockMonitor.drill.stormId = 'memorial-day-2015';
  act(() => { tree = renderer.create(<Harness />); });
  act(() => { trip.start('memorial-day-2015'); });
  mockMonitor.drill.stormId = 'halloween-2013';
  act(() => { tree.update(<Harness />); });
  expect(trip.active).toBe(false);
});
