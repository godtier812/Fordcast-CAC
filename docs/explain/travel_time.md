# Travel time — student review pending

Agent-authored implementation: `linking/travel_time.py` and `scoring/backtest.py`.

Series are interpolated onto a five-minute grid only inside gaps no longer than 30 minutes.
First differences are smoothed across three points, clipped to rising changes and correlated
for lags from 0 to 240 minutes. At least 12 overlapping samples and correlation >=0.5 are
required. The best lag receives a bounded parabolic refinement between neighboring lags.
Storm estimates are combined by median and storm-to-storm quartiles, not a correlation-peak
width. Broad spread, nonpositive lag, too few storms, or implausible speed require review.

No accepted lag means no forecasting Link: evidence stays null and accepted storm count
stays zero. A fixed speed prior does not fabricate correlation. Assumed corridor distances
are labeled and are not surveyed channel lengths. Current relations remain research
candidates because topology and road transfer are not validated. UI times are ranges.

Explain: why use rising changes? Why do coincident rainfall rises not establish upstream
topology? Why is gauge-to-gauge propagation not automatically road-arrival lead time?
