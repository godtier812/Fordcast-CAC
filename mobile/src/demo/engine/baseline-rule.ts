// mobile/src/demo/engine/baseline-rule.ts ★ — student-owned (01 §1.8 #1). Contract: C §18.5 / 05 §23.1 step 2.
// Worked example: 05 §23.3. Tests: src/__tests__/baseline-rule-test.ts. Explain-back: docs/explain/baseline-rule.md.
//
// This file is PURE (AGENTS.md rule 7): no React, no Date.now(), no imports from ../sim. Already written and tested
// for you, if you want them: ./features (newest reading, rise over N minutes, trigger up-crossing time, freshness),
// ./windows (snap an ETA range to the fixed buckets; the 90-min horizon), ./explain (travel time as a display range).
import type { Crossing, Gauge, Link, Reading, RuleResult } from './types';

/**
 * The baseline forecast rule: given the gauge readings the phone has received so far, is water from upstream on its
 * way to this crossing, and when could it arrive?
 *
 * Inputs
 * - `c`      the crossing (only used to identify it; the links carry the numbers).
 * - `links`  this crossing's links to gauges upstream of it: travel time τ (`lagMin`, with `lagP25Min` / `lagP75Min`),
 *            `triggerFt`, `watchFt`, `minRiseFt30m`.
 * - `series` gauge id → readings already DELIVERED at `asOf` (oldest first). Never look past them.
 * - `gauges` gauge id → gauge (`staleAfterMin` says when its newest reading is too old to trust).
 * - `asOf`   "now", in minutes since the scenario started.
 *
 * Output (`RuleResult`), following the C §18.5 table:
 * 1. Use only links whose gauge series is fresh at `asOf`. A stale link is skipped (combine.ts turns staleness into
 *    UNKNOWN later; that is not this file's job).
 * 2. A link is an AVOID candidate when the newest stage S ≥ `triggerFt` AND (the rise over the last 30 min is more
 *    than `minRiseFt30m`, OR the stage crossed the trigger recently: `asOf − tCross ≤ lagP75Min + 30`).
 *    Its arrival estimate: etaMid = lagMin − (asOf − tCross); etaLo = max(0, etaMid − (lagMin − lagP25Min));
 *    etaHi = max(etaLo, etaMid + (lagP75Min − lagMin)). (If no up-crossing is found, use the newest observation time.)
 * 3. Any other usable link is a WATCH candidate when S ≥ `watchFt` AND the 30-min rise is more than 0.20 ft.
 * 4. If some AVOID candidate has etaLo < 90 → state 'avoid', using the candidate with the smallest etaLo:
 *    etaLo/etaHi from it, `window` = its range snapped to the buckets, `triggerGaugeId` = its gauge.
 * 5. Else, if there are AVOID candidates (all ≥ 90 min away) → 'watch', window null, etaLo/etaHi null,
 *    `triggerGaugeId` = the gauge of the AVOID candidate with the smallest etaLo.
 * 6. Else, if there are WATCH candidates → 'watch', window null, etaLo/etaHi null, `triggerGaugeId` = the first WATCH
 *    candidate's gauge (in `links` order).
 * 7. Else → 'no_rise' with every other field null and no reasons.
 *
 * Reasons (what "Why this alert?" shows): one per candidate — AVOID candidates first (smallest etaLo first), then
 * WATCH candidates (in `links` order) — and at most 3.
 * - AVOID candidate → `{ code: 'UPSTREAM_ABOVE_TRIGGER', gauge_id, value_ft: S, rise_ft_30m, tau_min, tau_lo_min,
 *   tau_hi_min, trigger_ft, obs_at }`: value and rise rounded to 0.1 ft; `tau_min` = lagMin rounded to the nearest
 *   5 min; [tau_lo_min, tau_hi_min] = the link's display travel range; `obs_at` = the newest reading's obsMin.
 *   Keep the rise even when it is ≤ 0 (a falling wave still in transit): the UI then shows the "_peaked" sentence.
 * - WATCH candidate → `{ code: 'UPSTREAM_RISING', gauge_id, rise_ft_30m, value_ft, watch_ft, obs_at }`, same rounding.
 *
 * Worked example (05 §23.3, Williamson Creek at Jones Road, flash-flood-night, asOf = 70 → 7:00 AM):
 * newest delivered reading S = 7.14 ft (observed at 60), rise over 30 min +4.47 ft, trigger 6.0 ft crossed at 52.9,
 * τ 40 (P25 33, P75 44) → etaMid = 40 − (70 − 52.9) = 22.9 → etaLo = 15.9, etaHi = 26.9 → window [15, 30]
 * → `{ state: 'avoid', etaLo: 15.9, etaHi: 26.9, window: [15, 30], triggerGaugeId: 'USGS-08158922',
 *      reasons: [{ code: 'UPSTREAM_ABOVE_TRIGGER', value_ft: 7.1, rise_ft_30m: 4.5, tau_min: 40, tau_lo_min: 30,
 *      tau_hi_min: 45, trigger_ft: 6, obs_at: 60, … }] }` — the app shows "Avoid · likely flooded within 15–30 min".
 */
export function evaluate(c: Crossing, links: Link[], series: Map<string, Reading[]>, gauges: Map<string, Gauge>,
  asOf: number): RuleResult {
  // TODO(student): step 1 — keep only the links whose gauge series is fresh at asOf.
  // TODO(student): steps 2–3 — for each usable link, decide: AVOID candidate (with etaLo/etaHi), WATCH candidate, or neither,
  //                and build its reason.
  // TODO(student): steps 4–7 — pick the result from the candidates and return it with at most 3 reasons, AVOID ones first.
  throw new Error('TODO(student)');
}
