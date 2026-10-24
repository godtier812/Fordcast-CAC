import { describe, expect, test } from '@jest/globals';
import { replays } from '../lib/data';
import { gaugeInterruptionActive, replayStepInterval } from '../lib/replay-controls';

describe('replay time and interruption boundaries', () => {
  test.each([
    [1, 300000],
    [10, 30000],
    [30, 10000],
    [60, 5000],
    [120, 2500],
  ])('%sx advances five simulated minutes in %s milliseconds', (speed, interval) => {
    expect(replayStepInterval(300, speed)).toBe(interval);
  });
  test('modeled outage activates immediately, independently of delayed sample delivery', () => {
    const gauge = replays['halloween-2013']!.gauges.find((g) => g.id === 'USGS-08159000')!;
    expect(gaugeInterruptionActive(gauge, Date.parse('2013-10-31T11:14:59Z'))).toBe(false);
    expect(gaugeInterruptionActive(gauge, Date.parse('2013-10-31T11:15:00Z'))).toBe(true);
    expect(gaugeInterruptionActive(gauge, Date.parse('2013-10-31T11:20:00Z'))).toBe(true);
    expect(gaugeInterruptionActive(gauge, Date.parse('2013-10-31T13:45:00Z'))).toBe(false);
  });
});
