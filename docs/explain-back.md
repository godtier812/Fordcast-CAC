# Student review — pending

All new implementation is agent-written. These questions are a review aid, not completed
student answers. Do not substitute generated answers for the student's understanding.

1. `sources/base.py`: Why are observation time and availability time separate? How do
   delayed transmissions and archive revisions change what the forecast can know?
2. `linking/travel_time.py`: Why correlate rising changes? Why reject long interpolation
   gaps? Why is the current zero-lag result insufficient for a crossing forecast?
3. `model/baseline_rule.py`: How does a warning window follow an upstream trigger and
   uncertain propagation delay? What prevents a stale gauge from implying reassurance?
4. `scoring/metrics.py`: Which episode matches an onset? How are unknown periods, duplicate
   warnings, misses and false alarms handled? Why bootstrap storms instead of ticks?
5. `model/state_machine.py`: Why can escalation happen immediately while de-escalation
   requires consecutive evidence? What happens when a scheduled tick is missing?

Record the student's own explanations and any corrections after an actual review.
