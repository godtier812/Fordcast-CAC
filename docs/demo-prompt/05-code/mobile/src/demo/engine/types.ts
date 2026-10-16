// mobile/src/demo/engine/types.ts — shared domain types (mirror of C §18–§19 / A §3.2). PURE: no imports.
// Time unit everywhere in the demo engine: MINUTES since scenario start (number). Display adds scenario.clockStart.
export type Wire = 'no_rise' | 'watch' | 'avoid' | 'closed' | 'unknown';
export const RANK: Record<Wire, number> = { no_rise: 0, unknown: 1, watch: 2, avoid: 3, closed: 4 };
export type Window = [number, number];
export type Tier = 'A' | 'B' | 'C';

export type Gauge = {
  id: string;            // 'USGS-08158922' (real USGS site id)
  name: string;          // USGS station name, verbatim
  short: string;         // display name (B §: gauge chip)
  lon: number; lat: number;
  dtMin: number;         // reading interval (15 = USGS-like)
  delayMin: number;      // simulated delivery delay (obs → available)
  staleAfterMin: number; // §18.9 threshold (clamped 30..120, ≥ delay + 20)
  baseFt: number;        // calm stage
  nws?: { action: number; minor: number; moderate: number; major: number } | null;
};

export type Link = {
  crossingId: string; gaugeId: string; relation: 'upstream'; isPrimary: boolean;
  lagMin: number; lagP25Min: number; lagP75Min: number; nStorms: number;  // "learned" τ (authored in demo)
  triggerFt: number; watchFt: number; baselineFt: number; minRiseFt30m: number;
  channelKm: number;
};

export type Crossing = {
  id: string;
  name: string;                       // VERBATIM from the source dataset, both languages (never translated, never invented)
  address: string;                    // dataset humanAddress → peek subtitle
  spoken?: { en: string; es: string }; // TTS/VoiceOver form when the name has symbols/abbreviations (A §3.10 rule 2)
  lon: number; lat: number; tier: Tier;
  creek: string | null; creekVerified: boolean;   // verified = the creek is named in the dataset record itself
  targetGaugeId?: string | null; overtopStageFt?: number | null;   // water-at-road sensor (rare in demo)
  source: { dataset: 'ctxfloods-legacyCrossings'; communityId: number; legacyId: number; address: string };
};

export type Reading = { gaugeId: string; obsMin: number; availMin: number; ft: number };

export type Reason =
  | { code: 'UPSTREAM_ABOVE_TRIGGER'; gauge_id: string; value_ft: number; rise_ft_30m: number; tau_min: number;
      tau_lo_min: number; tau_hi_min: number; trigger_ft: number; obs_at: number }
  | { code: 'UPSTREAM_RISING'; gauge_id: string; rise_ft_30m: number; value_ft: number; watch_ft: number; obs_at: number }
  | { code: 'WATER_AT_ROAD'; gauge_id: string; value_ft: number; overtop_ft: number; obs_at: number }
  | { code: 'OFFICIAL_CLOSED' | 'OFFICIAL_CAUTION'; source: string; as_of: number }
  | { code: 'DATA_STALE'; gauge_id?: string; source?: string; last_obs_at: number | null }
  | { code: 'NO_UPSTREAM_GAUGE' }
  | { code: 'HOLDING'; since: number; held_state: Wire }
  | { code: 'CLOSURE_LIFTED'; source: string; at: number };

export type RuleResult = { state: 'no_rise' | 'watch' | 'avoid'; etaLo: number | null; etaHi: number | null;
  window: Window | null; triggerGaugeId: string | null; reasons: Reason[] };

export type Official = { crossingId: string; source: 'demo_official'; status: 'open' | 'caution' | 'closed';
  setAt: number; expiresAt: number };

export type RawState = { state: Wire; window: Window | null; reasons: Reason[]; triggerGaugeId: string | null;
  closedSource: 'official' | 'sensor' | null };

export type Tracker = { state: Wire; since: number; calmTicks: number; lastKnownState: Wire | null;
  lastKnownAt: number | null; closedSource: 'official' | 'sensor' | null; triggerGaugeId: string | null;
  window: Window | null; held: boolean; reasons: Reason[] };

export type DemoEvent = { t: number; crossingId: string; state: Wire; window: Window | null; held: boolean;
  reasons: Reason[]; lastKnown: { state: Wire; at: number } | null };
