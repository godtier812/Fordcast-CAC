import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import renderer, { act } from 'react-test-renderer';
import en from '@/locales/en.json';
import { MonitorProvider } from '@/lib/monitor';
import { useMonitor, type MonitorValue } from '@/lib/monitor-context';
import { planSafeRoute, type RoutePlan, type Place } from '@/lib/routing';
import { RoutePlanner } from '@/screens/home/RoutePanels';

jest.mock('@/lib/preferences', () => {
  const copy = jest.requireActual<typeof import('@/locales/en.json')>('@/locales/en.json');
  return {
    usePreferences: () => ({
      language: 'en',
      saved: [],
      simDriveActive: false,
      t: (key: keyof typeof copy, vars: Record<string, string | number> = {}) =>
        Object.entries(vars).reduce(
          (s, [k, v]) => s.replaceAll(`{{${k}}}`, String(v)),
          copy[key] ?? key,
        ),
    }),
  };
});
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  useFocusEffect: (cb: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(cb, [cb]);
  },
}));
jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: true })),
}));
jest.mock('@/lib/storage', () => ({
  storage: { get: jest.fn(async () => null), set: jest.fn(async () => {}) },
}));
jest.mock('@/lib/notify', () => ({
  getNotificationPermission: jest.fn(async () => 'unsupported'),
  requestNotificationPermission: jest.fn(async () => 'unsupported'),
  sendLocalNotification: jest.fn(async () => false),
}));
jest.mock('@/lib/voice', () => ({
  prepareAudio: jest.fn(async () => {}),
  setVoiceMuted: jest.fn(),
  speak: jest.fn(),
  stopSpeaking: jest.fn(),
}));
jest.mock('@/lib/guardian', () => ({
  ...jest.requireActual<object>('@/lib/guardian-cache'),
  guardianSupported: () => false,
  guardianRunning: async () => false,
}));
jest.mock('@/lib/hazards', () => ({
  ...jest.requireActual<object>('@/lib/hazards'),
  fetchOfficialClosures: jest.fn(async () => []),
  fetchWeatherAlerts: jest.fn(async () => []),
  fetchRain: jest.fn(async () => []),
}));
jest.mock('@/lib/live', () => ({
  ...jest.requireActual<object>('@/lib/live'),
  fetchLiveSeries: jest.fn(async () => ({})),
}));
jest.mock('@/lib/routing', () => ({
  ...jest.requireActual<object>('@/lib/routing'),
  planSafeRoute: jest.fn(),
}));

const a = { lat: 30.2672, lon: -97.7431 };
const b = { lat: 30.2772, lon: -97.7431 };
const dest = (name: string): Place => ({ ...b, name, detail: '' });
const plan = (name: string, detour = false): RoutePlan => ({
  origin: a,
  destination: b,
  destinationName: name,
  computedAt: Date.now(),
  route: {
    coords: detour
      ? [
          { lat: 30.3, lon: -97.8 },
          { lat: 30.31, lon: -97.8 },
        ]
      : [a, b],
    km: 2,
    min: 3,
  },
  baseline: { coords: [a, b], km: 2, min: 3 },
  avoided: [],
  remaining: [],
  extraMin: 0,
});
const mockPlan = planSafeRoute as jest.MockedFunction<typeof planSafeRoute>;
const monitorHolder: { current: MonitorValue | null } = { current: null };
let tree: renderer.ReactTestRenderer;
function Harness({ onVal }: { onVal: (v: MonitorValue) => void }) {
  const m = useMonitor();
  onVal(m);
  return <RoutePlanner />;
}
const captureMonitor = (v: MonitorValue) => {
  monitorHolder.current = v;
};
async function mount() {
  await act(async () => {
    tree = renderer.create(
      <MonitorProvider>
        <Harness onVal={captureMonitor} />
      </MonitorProvider>,
    );
  });
}
beforeEach(() => {
  jest.useFakeTimers();
  mockPlan.mockReset();
});
afterEach(() => {
  if (tree) act(() => tree.unmount());
  jest.clearAllTimers();
  jest.useRealTimers();
});

test('rapid destination taps: the newer request wins even when the aborted request resolves late', async () => {
  const resolves: ((p: RoutePlan) => void)[] = [];
  mockPlan.mockImplementation(() => new Promise<RoutePlan>((resolve) => resolves.push(resolve)));
  await mount();
  let pa: Promise<void>;
  let pb: Promise<void>;
  act(() => {
    pa = monitorHolder.current!.planRoute(dest('A'));
    pb = monitorHolder.current!.planRoute(dest('B'));
  });
  expect((mockPlan.mock.calls[0]?.[4] as AbortSignal | undefined)?.aborted).toBe(true);
  await act(async () => {
    resolves[1]!(plan('B'));
    await pb!;
  });
  await act(async () => {
    resolves[0]!(plan('A'));
    await pa!;
  });
  expect(monitorHolder.current?.routePlan?.destinationName).toBe('B');
});

test('starting a different normal trip removes the simulated closure from the previous trip', async () => {
  mockPlan.mockResolvedValue(plan('A'));
  await mount();
  await act(async () => {
    await monitorHolder.current!.planRoute(dest('A'));
  });
  act(() => monitorHolder.current!.simulateHazardOnRoute());
  expect(monitorHolder.current?.testHazard).not.toBeNull();
  mockPlan.mockResolvedValue(plan('B'));
  await act(async () => {
    await monitorHolder.current!.planRoute(dest('B'));
  });
  expect(monitorHolder.current?.testHazard).toBeNull();
});

test('recorded preset geometry displays its limitation and cannot launch or share navigation', async () => {
  mockPlan.mockResolvedValue({ ...plan('Recorded preset'), geometrySource: 'recorded', geometryCapturedAt: '2026-10-24T00:00:00Z' });
  await mount();
  await act(async () => { await monitorHolder.current!.planRoute(dest('Recorded preset')); });
  const exports = tree.root.findAll(n => n.props.accessibilityRole === 'button' &&
    [en['route.open_google'], en['route.share']].includes(n.props.accessibilityLabel));
  expect(exports).toHaveLength(0);
  const notices = tree.root.findAll(n => typeof n.props.children === 'string' && n.props.children.includes('Recorded geometry'));
  expect(notices.length).toBeGreaterThan(0);
});

test('a simulated closure cannot produce a real Google Maps handoff after the test detour completes, until endRouteTest is called', async () => {
  mockPlan.mockResolvedValue(plan('A'));
  await mount();
  await act(async () => {
    await monitorHolder.current!.planRoute(dest('A'));
  });
  act(() => monitorHolder.current!.simulateHazardOnRoute());
  mockPlan.mockResolvedValue(plan('A', true));
  await act(async () => {
    jest.advanceTimersByTime(0);
    await Promise.resolve();
  });
  expect(monitorHolder.current?.testHazard).not.toBeNull();
  const handoffWhileTesting = tree.root.findAll(
    (n) =>
      n.props.accessibilityRole === 'button' &&
      n.props.accessibilityLabel === en['route.open_google'],
  );
  expect(handoffWhileTesting).toHaveLength(0);

  let finishReset!: (value: RoutePlan) => void;
  mockPlan.mockImplementation(() => new Promise<RoutePlan>(resolve => { finishReset = resolve; }));
  let reset!: Promise<void>;
  act(() => { reset = monitorHolder.current!.endRouteTest(); });
  expect(monitorHolder.current?.routeBusy).toBe(true);
  const exportsDuringReset = tree.root.findAll(n => n.props.accessibilityRole === 'button' &&
    [en['route.open_google'], en['route.share']].includes(n.props.accessibilityLabel));
  expect(exportsDuringReset).toHaveLength(0);
  await act(async () => { finishReset(plan('A', false)); await reset; });
  expect(monitorHolder.current?.testHazard).toBeNull();
  const handoffAfterReset = tree.root.findAll(
    (n) =>
      n.props.accessibilityRole === 'button' &&
      n.props.accessibilityLabel === en['route.open_google'],
  );
  expect(handoffAfterReset.length).toBeGreaterThan(0);
});
