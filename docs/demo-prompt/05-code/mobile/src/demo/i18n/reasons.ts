// mobile/src/demo/i18n/reasons.ts — "Why this alert" lines rendered on the phone from reason objects (A §3.7 reason.*,
// C §18.10). Never a single-number travel time: only tau_lo–tau_hi. Spoken variants for VoiceOver / TTS.
import type { Reason } from '../engine/types';
import { tr, type Lang } from './tr';

export type ReasonCtx = {
  gaugeName: (gaugeId: string, spoken: boolean) => string;   // short display name, or its spoken form
  stormTime: (simMin: number) => string;                      // "9:25 AM" / "9:25 a. m." (scenario/clock.ts stormTime)
  ageText: (minutes: number) => string;                       // "50 min ago" / "hace 50 min" (time.min_ago, plural)
  simNow: number;                                             // current sim minute (for ages)
};
const source = (lang: Lang, s: string) => (s === 'demo_official' ? tr(lang, 'demo.source.road_crew') : s);

export function reasonText(lang: Lang, r: Reason, c: ReasonCtx, spoken = false): string {
  const k = (key: string) => (spoken ? `${key}_spoken` : key);
  switch (r.code) {
    case 'UPSTREAM_ABOVE_TRIGGER':                              // spec-gap fix: never render "+-0.4 ft"
      return r.rise_ft_30m > 0
        ? tr(lang, k('reason.UPSTREAM_ABOVE_TRIGGER'), { gauge: c.gaugeName(r.gauge_id, spoken), rise: r.rise_ft_30m,
            tau_lo: r.tau_lo_min, tau_hi: r.tau_hi_min })
        : tr(lang, k('reason.UPSTREAM_ABOVE_TRIGGER_peaked'), { gauge: c.gaugeName(r.gauge_id, spoken),
            tau_lo: r.tau_lo_min, tau_hi: r.tau_hi_min });
    case 'UPSTREAM_RISING': return tr(lang, k('reason.UPSTREAM_RISING'), { gauge: c.gaugeName(r.gauge_id, spoken) });
    case 'WATER_AT_ROAD': return tr(lang, k('reason.WATER_AT_ROAD'), { gauge: c.gaugeName(r.gauge_id, spoken) });
    case 'OFFICIAL_CLOSED': return tr(lang, k('reason.OFFICIAL_CLOSED'), { source: source(lang, r.source) });
    case 'OFFICIAL_CAUTION': return tr(lang, k('reason.OFFICIAL_CAUTION'), { source: source(lang, r.source) });
    case 'DATA_STALE': {
      const age = r.last_obs_at == null ? '—' : c.ageText(Math.max(0, Math.round(c.simNow - r.last_obs_at)));
      return r.gauge_id
        ? tr(lang, k('reason.DATA_STALE_gauge'), { gauge: c.gaugeName(r.gauge_id, spoken), age })
        : tr(lang, k('reason.DATA_STALE_source'), { source: source(lang, r.source ?? 'demo_official'), age });
    }
    case 'NO_UPSTREAM_GAUGE': return tr(lang, k('reason.NO_UPSTREAM_GAUGE'));
    case 'HOLDING': return tr(lang, k('reason.HOLDING'));
    case 'CLOSURE_LIFTED': return tr(lang, k('reason.CLOSURE_LIFTED'), { source: source(lang, r.source), time: c.stormTime(r.at) });
  }
}
