import { afterEach, expect, jest, test } from '@jest/globals';
import * as Speech from 'expo-speech';
import { prepareAudio, setVoiceMuted, speak, stopSpeaking } from '@/lib/voice';

jest.mock('react-native', () => {
  const rn = jest.requireActual<any>('react-native');
  Object.defineProperty(rn.Platform, 'OS', { get: () => 'ios' });
  return rn;
});
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock('@/lib/storage', () => ({
  storage: { get: async () => null, set: async () => {} },
}));
let mockReady: () => void;
const mockPending = new Promise<void>((resolve) => {
  mockReady = resolve;
});
jest.mock('expo-audio', () => ({ setAudioModeAsync: jest.fn(() => mockPending) }));

afterEach(() => {
  stopSpeaking();
  setVoiceMuted(false);
  jest.clearAllMocks();
});

test('an explicit native voice preview can play while automatic voice alerts remain muted', () => {
  setVoiceMuted(true);
  speak('Preview only. Never drive into water.', 'en', { force: true, allowWhenMuted: true });
  expect(Speech.speak).toHaveBeenCalledTimes(1);
});

test('native speech waits for the audio-session preparation promise before playback', async () => {
  const ready = prepareAudio();
  speak('Simulation. Never drive into water.', 'en', { force: true });
  try {
    expect(Speech.speak).not.toHaveBeenCalled();
  } finally {
    mockReady();
    await ready;
  }
  expect(Speech.speak).toHaveBeenCalledTimes(1);
});
