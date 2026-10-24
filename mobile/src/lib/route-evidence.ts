import type { PhysicalCrossingGroup } from './danger';
import { LIVE_STALE_MIN } from './live';

/** A transport success is distinct from a reported closure or a current sensor observation. */
export function routeEvidence(groups: PhysicalCrossingGroup[], officialOk: boolean | null, now: number) {
  const closed = groups.filter((g) => g.records.some((r) => r.official?.closed || r.reasons.includes('official_closed'))).length;
  const linked = groups.filter((g) => g.records.some((r) => r.monitored)).length;
  const fresh = groups.filter((g) => g.records.some((r) => {
    const observed = r.live?.obsAt;
    return r.monitored && observed != null && Number.isFinite(observed)
      && observed <= now && now - observed <= LIVE_STALE_MIN * 60_000;
  })).length;
  return {
    official: officialOk == null ? 'loading' : officialOk === false ? 'unavailable' : closed > 0 ? 'closed' : 'none',
    closed, linked, fresh,
  } as const;
}
