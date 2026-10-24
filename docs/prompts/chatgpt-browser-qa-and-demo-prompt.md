# FordCast repaired-prototype browser acceptance

Test the current build at http://localhost:8081. Read docs/results/repair-verification.md,
docs/CLAIMS.md and regenerated results.json first. Report observed UI separately from
source inspection. If browser access is disabled, say NOT RUN; never infer browser PASS.

## Safety and evidence

- Allowed states: no_rise, unknown, watch, avoid, closed. Each visible status glyph has
  visible text. Tier C says Not monitored. No reassuring road verdicts in EN or ES.
- The pledge negation is allowed; a proper source name such as City of Austin Open Data
  is not a reassurance verdict. Do not treat a historical performance statistic as a countdown.
- Forecast arrival windows: [0,15], [15,30], [30,60], [60,90], [0,30], [15,60], [30,90].
  Travel-lag ranges are different. If arrival lower bound is zero, show and speak
  Water may already be on the road / El agua ya podría estar sobre el camino.
- All replays display HISTORICAL REPLAY · NOT LIVE; HUD displays SIMULATED DRIVE.
- No verified road threshold or road-flooding lead-time claim is permitted for current data.
  Proxy study metrics must say reference-gauge category threshold. Unavailable metrics
  render a dash, not fabricated values. Schematic connectors must not claim river geometry.

## Guided samples

1. Complete the three-checkbox non-binding safety notice. Acceptance remains disabled
   until all three are checked. Test the reset-pledge flow in Settings as well.
2. Sample 1 opens Halloween 2013, paused, at its initial storyboard step with gauge
   USGS-08158840 when available. Step/play, switch storms, return to Map, click Sample 1:
   cursor/gauge/playing state reset deterministically. No hardcoded 70-minute assertion.
3. Inspect all five storms. Check speeds 1/10/30/60/120x; a five-minute step takes respectively
   300/30/10/5/2.5 seconds. Pause, restart, +/-5, event navigation, reading table and gauges.
   At USGS-08159000, 11:20Z on Oct 31, 2013 the modeled 11:15–13:45Z interruption banner
   is active immediately. Future observations remain hidden; outage interval is half-open.
4. Sample 2 selects the current median-lead example storm from the regenerated index,
   starts the simulated HUD and supports Repeat/Mute. No specific crossing/lead is hardcoded.
   Stop removes HUD and stops speech. Verify speech stops on tab blur, background,
   storm/language change. Speed/passenger controls are explicit simulation controls.
   At 25 mph browsing locks; passenger override unlocks. Test a zero-lower-bound window
   when present (a fixture component test also checks visible/spoken warning).
5. Sample 3 opens Wasson Rd. It must show offline Unknown and road evidence unverified.
   No 15.5-ft road threshold should remain. Where NOAA publishes no gauge category,
   no proxy stage is invented. Inspect an Onion Creek candidate for its sourced reference
   category and source link. Save/unsave and Watch preference toggles remain explicitly
   local preview only; push is disconnected.

## Systematic checks

- Filters: Study locations 30, Validated roads 0 (empty state), Research candidates 30,
  All 141, Saved = actual local preference (fresh default 3). Monitored search Onion
  currently matches four source records; use artifact-derived expectations after data changes.
- Legend: all five distinct shapes, visible state words, explanations.
- Alerts: two test clicks show two TEST preview cards with an allowed 15–30 arrival range,
  and explicit no-real-flood/no-delivery text. No sound/push delivery claim.
- Settings: switch EN/ES and traverse every route, including empty states and evidence cards.
  No missing keys or raw interpolation placeholders. Proper names/citations may retain
  original names; explanation text must be translated.
- Inspect browser console/network errors, keyboard focus, scroll and clipping at the actual
  viewport. Test text zoom and narrow viewport if supported, and record dimensions.
- Do not claim native MapLibre, background push, driver safety or human Spanish validation
  from web-only checks. Report skipped/blocked checks and remaining external acceptance.

## Report

Return Executive Summary, Sample Results table, Full Feature Matrix, Safety/Honesty Audit,
and Console/Network/Layout Findings. Include screenshots and exact reproduction steps.
Numbers must come from regenerated artifacts, not this former QA prompt's stale metrics.
