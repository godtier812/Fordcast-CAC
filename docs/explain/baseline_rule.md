# One-Page Explainer: `backend/fordcast/model/baseline_rule.py` & `state_machine.py`

## Purpose
Deterministically maps upstream gauge observations to one of five honest crossing states (`no_rise`, `watch`, `avoid`, `closed`, `unknown`) without lookahead or false-reassurance language.

## How It Works
1. **Observation-Anchored Rise Rate (`evaluate`):**
   - For each fresh upstream link (`is_fresh(series, now, stale_after_min)`), computes the 30-minute stage rise anchored on the gauge's latest observation timestamp (`obs_time`), never wall-clock time.
   - **Avoid Trigger:** If stage $\ge h^*_{\text{trigger}}$ and $\Delta h_{30\text{m}} \ge 0.10\text{ ft}$, the link votes `avoid` and maps its travel-time range `[lag_p25_min, lag_p75_min]` into one of the 7 conservative arrival windows (`[0,15]`, `[15,30]`, `[30,60]`, `[60,90]`, `[0,30]`, `[15,60]`, `[30,90]`). Waves with $\tau > 90\text{ min}$ vote `watch` with `window = None`.
   - **Watch Trigger:** If stage $\ge h_{\text{watch}}$ and $\Delta h_{30\text{m}} \ge 0.10\text{ ft}$ (or rapid rise $\ge 0.50\text{ ft}/30\text{m}$ above baseline $+ 0.5\text{ ft}$), the link votes `watch`.
2. **Precedence Ladder (`resolve_raw_state`):**
   - `OFFICIAL_CLOSED` or `WATER_AT_ROAD` $\rightarrow$ `closed`
   - `DATA_STALE` or `tier == "C"` $\rightarrow$ `unknown`
   - Otherwise `max(OFFICIAL_CAUTION, rule.state)`.
3. **Asymmetric Dwell & Outage Recovery (`step`):**
   - **Escalation is immediate:** Any increase in severity (`no_rise` $\rightarrow$ `watch` $\rightarrow$ `avoid` $\rightarrow$ `closed`) takes effect on the first tick.
   - **De-escalation requires 3 consecutive ticks** plus post-peak crest travel time $\tau_{\text{p75}} + 15\text{ min}$, stepping down **at most one level** per transition (`closed` $\rightarrow$ `avoid` $\rightarrow$ `watch` $\rightarrow$ `no_rise`) and emitting `held = True` (`HOLDING`).
   - **Outage preservation:** When data goes stale (`unknown`), `last_known` preserves the prior active warning (`watch`, `avoid`, or `closed`).
