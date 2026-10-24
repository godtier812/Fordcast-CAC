/** Storm-drill timing helpers (pure). */
import type { ReplayDocument } from './data';

/** Storm minutes that pass per real second at 1x speed. */
export const DRILL_MIN_PER_SEC = 5;

export function drillBounds(replay: ReplayDocument): { startMs: number; endMs: number } {
  const s = Date.parse(replay.storm.start);
  const e = Date.parse(replay.storm.end);
  const times = replay.events.map((ev) => Date.parse(ev.t)).filter(Number.isFinite);
  if (!times.length) return { startMs: s, endMs: Math.min(e, s + 12 * 3600_000) };
  const first = Math.min(...times);
  const last = Math.max(...times);
  return {
    startMs: Math.max(s, first - 60 * 60_000),
    endMs: Math.min(e, last + 90 * 60_000),
  };
}

export function formatStormClock(ms: number, language: 'en' | 'es'): string {
  return new Date(ms).toLocaleString(language === 'es' ? 'es-US' : 'en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}
