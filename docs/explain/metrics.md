# Metrics — student review pending

Agent-authored implementation: `scoring/metrics.py`, `labels.py` and `backtest.py`.

Consecutive at-or-above-level ticks form warning episodes; Unknown or missing tick gaps
split episodes. Onsets and warning episodes are matched once, within the defined 180-minute
lead window. Censored onsets and unknown-at-onset cases follow explicit eligibility rules.
POD = H/(H+M), FAR = F/(H+F), CSI = H/(H+M+F). Undefined denominators serialize as null.

LOSO learns parameters on other storms only. Bootstrap intervals resample whole storms
with replacement (1000 replicates, seed 0), not individual ticks. Only five storms are
available, so intervals and generalization remain limited. This is not a stationary
within-storm block bootstrap. Multiple reference cases can share a gauge and are correlated.

Current labels are sourced NOAA gauge-category proxies, not validated road overtops.
Non-proxy road skill, unevaluated population rates and reactive-baseline performance stay
null. Calm exposure is the actual 36-hour control span; a 30-day calm study is pending.
Nearest-gauge selection uses a true WGS84 geodesic minimum over the frozen catalog.

Explain: why does reproducibility not establish valid ground truth? What does a missed
proxy onset mean? Why are unmeasured rates null instead of zero?
