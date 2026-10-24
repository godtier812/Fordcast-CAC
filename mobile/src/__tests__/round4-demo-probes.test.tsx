import { afterEach, expect, jest, test } from '@jest/globals';
import renderer, { act } from 'react-test-renderer';
import { demoDistanceAt, useTripDemo } from '@/features/demo/useTripDemo';
import { demoTrips } from '@/lib/data';
import { agoText } from '@/components/fc/Kit';

const mockMonitor = {
  mode: 'drill',
  drill: { stormId: 'memorial-day-2015', simT: 0 },
  settings: { voiceAlerts: false },
  statusById: { 'tc-167': { danger: 'block', reasons: ['sensor_avoid'] } },
  setTripActive: jest.fn(),
  setDrillPlaying: jest.fn(),
  pushAlert: jest.fn(),
  startDrill: jest.fn(),
};

jest.mock('@/lib/monitor-context', () => ({ useMonitor: () => mockMonitor }));
jest.mock('@/lib/preferences', () => ({
  usePreferences: () => ({ language: 'en', t: (key: string) => key }),
}));
jest.mock('@/lib/voice', () => ({ speak: jest.fn(), stopSpeaking: jest.fn() }));

const tripHolder: { current: ReturnType<typeof useTripDemo> | null } = { current: null };
function Harness({ onVal }: { onVal: (v: ReturnType<typeof useTripDemo>) => void }) {
  const val = useTripDemo();
  onVal(val);
  return null;
}
const captureTrip = (v: ReturnType<typeof useTripDemo>) => {
  tripHolder.current = v;
};
let tree: renderer.ReactTestRenderer;

afterEach(() => {
  if (tree) act(() => tree.unmount());
  jest.useRealTimers();
});

test('a named 50-second Memorial Day demo has reached its end by 60 seconds even with its detour', () => {
  jest.useFakeTimers();
  mockMonitor.drill.stormId = 'memorial-day-2015';
  act(() => {
    tree = renderer.create(<Harness onVal={captureTrip} />);
  });
  act(() => {
    tripHolder.current!.start('memorial-day-2015');
  });
  act(() => {
    jest.advanceTimersByTime(1);
  });
  expect(tripHolder.current?.run?.phase).toBe('rerouted');
  act(() => {
    jest.advanceTimersByTime(60_000);
  });
  expect(tripHolder.current?.run?.phase).toBe('arrived');
});

test('switching the drill storm ends the old car run rather than combining old geometry with new statuses', () => {
  jest.useFakeTimers();
  mockMonitor.drill.stormId = 'memorial-day-2015';
  act(() => {
    tree = renderer.create(<Harness onVal={captureTrip} />);
  });
  act(() => {
    tripHolder.current!.start('memorial-day-2015');
  });
  mockMonitor.drill.stormId = 'halloween-2013';
  act(() => {
    tree.update(<Harness onVal={captureTrip} />);
  });
  expect(tripHolder.current?.active).toBe(false);
});

test('demoDistanceAt preserves pre-decision speed and reaches totalKm at 50s across all 5 demoTrips', () => {
  for (const dt of demoTrips) {
    const baseKm = dt.baseline.km;
    const altKm = dt.reroute?.km ?? baseKm;
    const rSec = 3; // DRIVE_SECONDS * 0.06
    const rKm = (rSec / 50) * baseKm;

    expect(demoDistanceAt(0, baseKm, altKm, rSec, rKm)).toBe(0);
    expect(demoDistanceAt(rSec, baseKm, altKm, rSec, rKm)).toBeCloseTo(rKm, 6);
    expect(demoDistanceAt(50, baseKm, altKm, rSec, rKm)).toBeCloseTo(altKm, 6);
  }
});

test('returning to the storm that preceded a new run cannot reuse that run geometry', () => {
  jest.useFakeTimers();
  mockMonitor.drill.stormId = 'halloween-2013';
  act(() => { tree = renderer.create(<Harness onVal={captureTrip} />); });
  act(() => { tripHolder.current!.start('memorial-day-2015'); });
  expect(tripHolder.current?.active).toBe(false); // provider has not committed the requested storm yet
  mockMonitor.drill.stormId = 'memorial-day-2015';
  act(() => { tree.update(<Harness onVal={captureTrip} />); });
  expect(tripHolder.current?.active).toBe(true);
  mockMonitor.drill.stormId = 'halloween-2013';
  act(() => { tree.update(<Harness onVal={captureTrip} />); });
  expect(tripHolder.current?.active).toBe(false);
});

test('agoText uses supplied refNow so CrossingDetail ages continuously between network polls', () => {
  const sampleMs = 1_800_000_000_000;
  const tFn = (k: string, v?: Record<string, string | number>) =>
    k === 'home.just_now'
      ? 'just now'
      : k === 'home.min_ago'
        ? `${v?.n}m ago`
        : `${k}:${JSON.stringify(v)}`;
  expect(agoText(tFn as any, sampleMs, sampleMs + 10_000)).toBe('just now');
  expect(agoText(tFn as any, sampleMs, sampleMs + 15 * 60_000)).toBe('15m ago');
});

test('ten repeated Reset -> Start -> Stop cycles produce one clean active run per cycle and clean stop', () => {
  jest.useFakeTimers();
  mockMonitor.drill.stormId = 'memorial-day-2015';
  act(() => {
    tree = renderer.create(<Harness onVal={captureTrip} />);
  });
  for (let i = 0; i < 10; i++) {
    act(() => {
      tripHolder.current!.start('memorial-day-2015');
    });
    expect(tripHolder.current?.active).toBe(true);
    expect(tripHolder.current?.run?.trip.stormId).toBe('memorial-day-2015');
    act(() => {
      tripHolder.current!.stop();
    });
    expect(tripHolder.current?.active).toBe(false);
    expect(tripHolder.current?.run).toBeNull();
  }
});
