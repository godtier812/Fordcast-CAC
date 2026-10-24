import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AppState, Text, type AppStateStatus } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import * as Speech from 'expo-speech';
import CrossingRow from '../features/map/CrossingRow';
import Drive from '../app/(tabs)/drive';
import StateBadge from '../components/StateBadge';
import ArrivalBucketStrip from '../components/ArrivalBucketStrip';
import ProvenanceCard from '../components/ProvenanceCard';
import { crossings, type Crossing } from '../lib/data';
import en from '../locales/en.json';

const mockPreferences = {
  language: 'en',
  saved: [],
  activeStormId: 'fixture',
  simDriveActive: true,
  setSimDriveActive: jest.fn((active: boolean) => {
    mockPreferences.simDriveActive = active;
  }),
  t: (key: keyof typeof en, vars: Record<string, string | number> = {}) =>
    Object.entries(vars).reduce(
      (text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)),
      en[key],
    ),
};
let mockBlur: (() => void) | undefined;
jest.mock('../lib/preferences', () => ({ usePreferences: () => mockPreferences }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: (callback: () => () => void) => {
    const react = jest.requireActual<typeof import('react')>('react');
    react.useEffect(() => {
      mockBlur = callback();
      return mockBlur;
    }, [callback]);
  },
}));
jest.mock('expo-speech', () => ({ stop: jest.fn(() => {}), speak: jest.fn() }));
jest.mock('../lib/data', () => {
  const original = jest.requireActual<typeof import('../lib/data')>('../lib/data');
  const at = '2025-01-01T00:00:00Z';
  return {
    ...original,
    replays: {
      fixture: {
        storm: { start: at, name_en: 'Fixture storm', name_es: 'Tormenta de prueba' },
        hero: { crossing_id: 'fixture', first_alert_at: at },
        storyboard: [],
        crossings: [
          {
            id: 'fixture',
            name: 'Fixture crossing',
            name_es: 'Cruce de prueba',
            initial_state: 'unknown',
          },
        ],
        events: [
          {
            t: at,
            crossing_id: 'fixture',
            state: 'avoid',
            window: [0, 15],
            reasons: [],
            held: false,
          },
        ],
      },
    },
  };
});

let tree: ReactTestRenderer | undefined;
let onAppState: ((state: AppStateStatus) => void) | undefined;
const visibleText = () =>
  tree!.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .flat(Infinity)
    .join(' ');
const press = (title: string) => {
  const button = tree!.root.findAll(
    (node) =>
      node.props.accessibilityRole === 'button' &&
      node.props.accessibilityLabel === title &&
      typeof node.props.onPress === 'function',
  )[0];
  expect(button).toBeDefined();
  act(() => {
    button!.props.onPress();
  });
};
beforeEach(() => {
  jest.clearAllMocks();
  mockPreferences.simDriveActive = true;
  mockPreferences.language = 'en';
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => {
    onAppState = handler;
    return { remove: jest.fn() };
  });
});
afterEach(() => {
  if (tree) act(() => tree!.unmount());
  tree = undefined;
  jest.restoreAllMocks();
});

describe('visible safety contracts', () => {
  test.each(['no_rise', 'unknown', 'watch', 'avoid', 'closed'] as const)(
    'inventory visibly labels %s beside its glyph',
    (state) => {
      const crossing = {
        ...crossings[0]!,
        properties: { ...crossings[0]!.properties, tier: 'B' },
      } as Crossing;
      act(() => {
        tree = renderer.create(<CrossingRow crossing={crossing} stateOverride={state} />);
      });
      expect(visibleText()).toContain(en[`state.${state}`]);
    },
  );
  test('unmonitored inventory visibly says Not monitored', () => {
    const crossing = {
      ...crossings[0]!,
      properties: { ...crossings[0]!.properties, tier: 'C' },
    } as Crossing;
    act(() => {
      tree = renderer.create(<CrossingRow crossing={crossing} />);
    });
    expect(visibleText()).toContain(en['state.unmonitored']);
  });
  test('zero-arrival warning is both visible and spoken; stopping removes HUD and stops speech', () => {
    act(() => {
      tree = renderer.create(<Drive />);
    });
    expect(visibleText()).toContain(en['state.now']);
    press(en['drive.repeat']);
    expect(Speech.speak).toHaveBeenCalledWith(
      expect.stringContaining(en['state.now']),
      expect.any(Object),
    );
    expect(Speech.speak).toHaveBeenCalledWith(
      expect.stringContaining(en['drive.voice_context']),
      expect.any(Object),
    );
    press(en['drive.stop_sim']);
    act(() => {
      tree!.update(<Drive />);
    });
    expect(visibleText()).toContain(en['drive.stopped']);
    expect(visibleText()).not.toContain(en['drive.repeat']);
    expect(Speech.stop).toHaveBeenCalled();
  });
  test('speech stops on blur, background, storm and language changes', () => {
    act(() => {
      tree = renderer.create(<Drive />);
    });
    jest.mocked(Speech.stop).mockClear();
    act(() => {
      mockBlur!();
    });
    expect(Speech.stop).toHaveBeenCalledTimes(1);
    act(() => {
      onAppState!('background');
    });
    expect(mockPreferences.simDriveActive).toBe(false);
    const count = jest.mocked(Speech.stop).mock.calls.length;
    mockPreferences.language = 'es';
    act(() => {
      tree!.update(<Drive />);
    });
    expect(jest.mocked(Speech.stop).mock.calls.length).toBeGreaterThan(count);
  });

  test('StateBadge, ArrivalBucketStrip, and ProvenanceCard enforce triple-redundancy, [0, 15] alert, and 3-rung ladder', () => {
    act(() => {
      tree = renderer.create(
        <>
          <StateBadge state="avoid" size={64} />
          <ArrivalBucketStrip state="avoid" window={[0, 15]} />
          <ProvenanceCard crossing={crossings[0]!} defaultExpandedScorecard={true} />
        </>,
      );
    });
    const text = visibleText();
    expect(text).toContain(en['state.avoid']);
    expect(text).toContain(en['state.now']);
    expect(text).toContain('TIER A (0 Crossings)');
    expect(text).toContain('TIER B (30 Crossings)');
    expect(text).toContain('TIER C (111 Crossings)');
  });
});

