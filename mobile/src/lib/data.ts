import inventory from '../../assets/seed/crossings.json';
import gaugesDoc from '../../assets/seed/gauges.json';
import creeksDoc from '../../assets/seed/creeks.json';
import linksDoc from '../../assets/seed/links.json';
import observations from '../../assets/observations/halloween-2013.json';
import replayIndexDoc from '../../assets/replays/index.json';
import halloween2013 from '../../assets/replays/halloween-2013.json';
import memorialDay2015 from '../../assets/replays/memorial-day-2015.json';
import halloween2015 from '../../assets/replays/halloween-2015.json';
import oct2018 from '../../assets/replays/oct-2018.json';
import july2025 from '../../assets/replays/july-2025.json';
import resultsDoc from '../../assets/results/results.json';
import type { RiskState } from './risk';

export const crossings = inventory.features;
export type Crossing = (typeof crossings)[number];
export const gauges = gaugesDoc.features;
export type GaugeFeature = (typeof gauges)[number];
export const creeks = creeksDoc.features;
export const links = linksDoc;
export type CrossingLink = (typeof links)[number];
export const history = observations;
export const replayIndex = replayIndexDoc;
export const results = resultsDoc;

export type ReplayGauge = {
  id: string;
  name: string;
  lon: number;
  lat: number;
  t0: string;
  dt_s: number;
  stage_ft: (number | null)[];
  avail_delay_s: number;
  outages: { start: string; end: string }[];
  trigger_ft: number | null;
  watch_ft: number | null;
  nws_categories: Record<string, number> | null;
};

export type ReplayEvent = {
  t: string;
  crossing_id: string;
  state: string;
  window: number[] | null;
  reasons: Record<string, unknown>[];
  p: number[] | null;
  held: boolean;
};

export type ReplayDocument = {
  schema: string;
  step_s: number;
  storm: {
    id: string;
    name_en: string;
    name_es: string;
    start: string;
    end: string;
    tz: string;
    headline_event: string | null;
    description_en: string | null;
    description_es: string | null;
  };
  assumptions: {
    data_delay_min: number;
    default_delay_min: number;
    delays_source: string;
    data_delay_min_by_gauge: Record<string, number>;
    outages: { site: string; start: string; end: string; source: string }[];
    official_status: string;
    rain: string | null;
    values: string;
    params: string;
  };
  pipeline: Record<string, string>;
  gauges: ReplayGauge[];
  crossings: {
    id: string;
    name: string;
    name_es: string;
    lon: number;
    lat: number;
    tier: string;
    initial_state: string;
    overtop_stage_ft: number | null;
    target_gauge_id: string | null;
  }[];
  links: {
    crossing_id: string;
    gauge_id: string;
    relation: string;
    is_primary: boolean;
    tau_min: number;
    tau_p25: number;
    tau_p75: number;
    tau_lo_min: number;
    tau_hi_min: number;
    channel_dist_km: number;
    trigger_ft: number;
    watch_ft: number;
    flowline: number[][];
  }[];
  events: ReplayEvent[];
  pulses: {
    crossing_id: string;
    gauge_id: string;
    t_trigger: string;
    tau_min: number;
  }[];
  truth: {
    crossing_id: string;
    onset: string;
    end: string;
    quality: string;
    censored: boolean;
  }[];
  metrics: {
    method: string;
    level: string;
    pod: number | null;
    far: number | null;
    csi: number | null;
    median_lead_min: number | null;
    n_events: number;
    comparators: Record<
      string,
      {
        pod: number | null;
        far: number | null;
        csi: number | null;
        median_lead_min: number | null;
        n_events: number;
      }
    >;
  };
  hero: {
    crossing_id: string;
    lead_min: number | null;
    level: string;
    onset: string;
    first_alert_at: string;
    censored: boolean;
  } | null;
  storyboard: {
    t: string;
    kind: string;
    en: string;
    es: string;
  }[];
};

export const replays: Record<string, ReplayDocument> = {
  'halloween-2013': halloween2013 as ReplayDocument,
  'memorial-day-2015': memorialDay2015 as ReplayDocument,
  'halloween-2015': halloween2015 as ReplayDocument,
  'oct-2018': oct2018 as ReplayDocument,
  'july-2025': july2025 as ReplayDocument,
};

export type ReplayCrossingSlice = {
  crossingId: string;
  state: RiskState;
  window: [number, number] | null;
  reasons: Record<string, unknown>[];
  held: boolean;
  changedAt: string | null;
};

/**
 * Pure replay state resolver at simulated timestamp `simT` (ms since epoch).
 * Evaluates only events with `Date.parse(ev.t) <= simT` (no lookahead).
 */
export function stateAt(
  replay: ReplayDocument,
  crossingId: string,
  simT: number,
): ReplayCrossingSlice {
  const meta = replay.crossings.find((c) => c.id === crossingId);
  let state: RiskState = (meta?.initial_state as RiskState | undefined) ?? 'unknown';
  let window: [number, number] | null = null;
  let reasons: Record<string, unknown>[] = [];
  let held = false;
  let changedAt: string | null = null;

  for (const ev of replay.events) {
    const evMs = Date.parse(ev.t);
    if (evMs > simT) break;
    if (ev.crossing_id === crossingId) {
      state = ev.state as RiskState;
      window =
        Array.isArray(ev.window) && ev.window.length === 2
          ? [Number(ev.window[0]), Number(ev.window[1])]
          : null;
      reasons = ev.reasons;
      held = Boolean(ev.held);
      changedAt = ev.t;
    }
  }
  return { crossingId, state, window, reasons, held, changedAt };
}

export type VisibleSample = {
  t: number;
  iso: string;
  stageFt: number | null;
  inOutage: boolean;
};

/**
 * Pure hydrograph sample filter at simulated timestamp `simT` (ms since epoch).
 * Enforces data-arrival latency (`avail_delay_s`) and hides samples inside
 * `[outage.start, outage.end]` until `simT >= Date.parse(outage.end)` (§19.5).
 */
export function visibleSamples(gauge: ReplayGauge, simT: number): VisibleSample[] {
  const t0Ms = Date.parse(gauge.t0);
  const dtMs = gauge.dt_s * 1000;
  const delayMs = gauge.avail_delay_s * 1000;
  const out: VisibleSample[] = [];

  for (let i = 0; i < gauge.stage_ft.length; i++) {
    const obsMs = t0Ms + i * dtMs;
    if (obsMs + delayMs > simT) break;
    const rawVal = gauge.stage_ft[i] ?? null;
    let inOutage = false;
    for (const o of gauge.outages) {
      const oStart = Date.parse(o.start);
      const oEnd = Date.parse(o.end);
      if (obsMs >= oStart && obsMs <= oEnd && simT < oEnd) {
        inOutage = true;
        break;
      }
    }
    out.push({
      t: obsMs,
      iso: new Date(obsMs).toISOString(),
      stageFt: inOutage ? null : rawVal,
      inOutage,
    });
  }
  return out;
}

export type ActivePulse = {
  crossingId: string;
  gaugeId: string;
  progress: number;
  lon: number;
  lat: number;
};

/**
 * Compute active river-wave pulses along flowlines at `simT` (§19.6).
 */
export function activePulsesAt(replay: ReplayDocument, simT: number): ActivePulse[] {
  const active: ActivePulse[] = [];
  for (const p of replay.pulses) {
    const startMs = Date.parse(p.t_trigger);
    const durMs = Math.max(1, p.tau_min) * 60_000;
    if (simT < startMs || simT > startMs + durMs) continue;
    const u = Math.min(1, Math.max(0, (simT - startMs) / durMs));
    const link = replay.links.find(
      (l) => l.crossing_id === p.crossing_id && l.gauge_id === p.gauge_id,
    );
    const pts = link?.flowline ?? [];
    if (pts.length === 0) continue;
    const scaled = u * (pts.length - 1);
    const idx = Math.min(pts.length - 2, Math.max(0, Math.floor(scaled)));
    const frac = scaled - idx;
    const p0 = pts[idx] ?? pts[0]!;
    const p1 = pts[idx + 1] ?? p0;
    const lon = (p0[0] ?? 0) + ((p1[0] ?? 0) - (p0[0] ?? 0)) * frac;
    const lat = (p0[1] ?? 0) + ((p1[1] ?? 0) - (p0[1] ?? 0)) * frac;
    active.push({
      crossingId: p.crossing_id,
      gaugeId: p.gauge_id,
      progress: u,
      lon,
      lat,
    });
  }
  return active;
}

export type LockoutState = {
  locked: boolean;
  passengerOverride: boolean;
  aboveSinceMs: number | null;
  belowSinceMs: number | null;
};

export type SpeedFix = {
  tMs: number;
  speedMps: number;
};

export const initialLockoutState: LockoutState = {
  locked: false,
  passengerOverride: false,
  aboveSinceMs: null,
  belowSinceMs: null,
};

/**
 * Pure passenger-lockout state machine (§30.9):
 * - Locks when speed >= 6.7 m/s (15 mph) continuously for >= 10,000 ms
 * - Unlocks when speed < 2.2 m/s (5 mph) continuously for >= 30,000 ms
 */
export function stepLockout(state: LockoutState, fix: SpeedFix): LockoutState {
  if (state.passengerOverride) {
    return { ...state, locked: false };
  }
  let { locked, aboveSinceMs, belowSinceMs } = state;
  if (fix.speedMps >= 6.7) {
    belowSinceMs = null;
    if (aboveSinceMs === null) {
      aboveSinceMs = fix.tMs;
    } else if (fix.tMs - aboveSinceMs >= 10_000) {
      locked = true;
    }
  } else if (fix.speedMps < 2.2) {
    aboveSinceMs = null;
    if (belowSinceMs === null) {
      belowSinceMs = fix.tMs;
    } else if (fix.tMs - belowSinceMs >= 30_000) {
      locked = false;
    }
  } else {
    aboveSinceMs = null;
    belowSinceMs = null;
  }
  return { locked, passengerOverride: false, aboveSinceMs, belowSinceMs };
}
