# Data access — student review pending

Agent-authored implementation: `sources/base.py` and `sources/replay.py`.

A Reading separates observation time from arrival time. Live/recorded data retain actual
receipt times; replay explicitly assumes observation time + delivery delay, withholding
modeled interruption samples until the interruption ends. The Halloween interruption is
a robustness assumption; it is not verified original transmission history.

Providers select arrived observations inside a left-open lookback interval. Revisions are
resolved separately for each parameter and observation time. A per-gauge availability
index reduces unnecessary scanning. Every tick guards both timestamps against its clock.

The chart is a separate conversion: each grid slot takes only the latest prior observation
within 20 minutes. It never assigns a later reading to an earlier slot. Its delay is
conservative for carried-forward samples. Missing slots remain missing.

Explain in your own words: why does arrival time matter? Why do corrected archive values
not recreate what was provisionally known? Why must chart conversion also be causal?
