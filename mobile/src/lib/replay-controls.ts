import type { ReplayGauge } from './data';

export function replayStepInterval(stepSeconds: number, speed: number): number {
  if (stepSeconds <= 0 || speed <= 0 || !Number.isFinite(stepSeconds + speed)) {
    throw new Error('Replay interval requires finite positive inputs');
  }
  return (stepSeconds * 1000) / speed;
}

/** Modeled interruption is clock-based; sample arrival filtering is a separate rule. */
export function gaugeInterruptionActive(gauge: ReplayGauge, cursorMs: number): boolean {
  return gauge.outages.some(
    (outage) => Date.parse(outage.start) <= cursorMs && cursorMs < Date.parse(outage.end),
  );
}
