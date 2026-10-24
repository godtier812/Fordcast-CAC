# Baseline rule — student review pending

Agent-authored implementation: `model/baseline_rule.py`, `combine.py`, `state_machine.py`.

Fresh links vote Avoid when stage exceeds the trigger and rises more than the link's
minimum (default 0.10 ft/30 min), or a recent upcrossing remains in transit. Remaining
arrival bounds follow the upcrossing clock and lag quartiles. Earliest arrival at or
beyond 90 minutes becomes Watch without a window. Watch otherwise requires stage above
its watch threshold and rise greater than 0.20 ft/30 min. Seven allowed windows are in
`model/windows.py`; these differ from displayed travel-lag ranges.

Fresh official closures and verified water-at-road add caution. Proxy gauge thresholds
cannot cause water-at-road. Stale/missing links produce Unknown. Current bundled studies
use only calibrated experimental links; road-level transfer/topology remain unverified.

Escalation is immediate. De-escalation is one level per consecutive dwell: 6 ticks for
Closed/Avoid, 12 for Watch, with required fresh/falling/below-threshold evidence. A gap
resets consecutive evidence. Recovery from Unknown preserves caution from last known
warnings. These rules describe code behavior, not proven real-world warning performance.

Explain: why anchor rise to newest observation? Why separate proxy category onset from
road flooding? Why can an outage never imply calm?
