# The baseline forecast rule — explained
**File:** `mobile/src/demo/engine/baseline-rule.ts` ★ · **Owner:** [student] (student-written) · **Tests:** `mobile/src/__tests__/baseline-rule-test.ts`

## What it does
Every 5 minutes, FordCast looks at the stream gauges upstream of a low-water crossing. This rule decides whether the
water there is high **and** heading toward the road. If it is, it says **Avoid** and estimates *when* the water could
arrive, as a time range like "15–30 min". If the water is only starting to rise, it says **Watch**. Otherwise it says
**No rise detected**.

## Why FordCast needs it
Road closures today happen *after* water is already on the road. In the hero storm (`flash-flood-night`), the gauge
on Williamson Creek at Brush Country Blvd passes its 6.0 ft trigger level at about 6:43 AM. Water takes about 40
minutes to travel 5.3 km down the creek to Jones Road. So at 7:00 AM this rule can already say "Avoid · likely flooded
within 15–30 min" — and in this simulated storm the water reaches the road at 7:30 AM, inside that window.

## Picture
```
   rain ──►  UPSTREAM GAUGE  ~~~~~~~~ creek, about 40 min of travel ~~~~~~~~►  CROSSING (Jones Road)
             stage S, rising?                                                 "when could water get here?"

 stage (ft)
   7 ┤                 ●  S = 7.14 at 6:50 (delivered 7:00)
   6 ┤┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╱┄┄┄┄┄  trigger 6.0 ft, crossed at about 6:43
 4.4 ┤┄┄┄┄┄┄┄┄┄┄┄┄●╱┄┄┄┄┄┄┄┄  watch level 4.4 ft  → Watch at 6:45
   2 ┤ ●──●──●──╱
     └──────────────────────► time
                    tCross        asOf (7:00)        etaLo … etaHi = 15.9 … 26.9 min from now → "15–30 min"
```

## Step by step (fill in your line numbers once your code works)
1. Throw away any upstream gauge whose newest reading is too old (stale). (L__)
2. For each remaining gauge, read the newest stage S and how much it rose in the last 30 minutes. (L__)
3. **Avoid candidate:** S is at or above the trigger level, and the water is either still rising (more than 0.1 ft in
   30 min) or crossed the trigger recently (within the slow end of the travel time + 30 min). Work out the arrival
   range from the travel time τ and its fast (P25) and slow (P75) ends. (L__)
4. **Watch candidate:** S is at or above the watch level and rose more than 0.20 ft in 30 min. (L__)
5. Pick the answer: the Avoid candidate whose water could arrive soonest (if within 90 min) → **Avoid** with a
   window; Avoid candidates that are all farther away → **Watch**; any Watch candidate → **Watch**; nothing → **No rise
   detected**. Attach up to 3 reasons, Avoid reasons first. (L__)

## Worked example (small numbers you can check by hand)
Jones Road at 7:00 AM (`asOf` = 70 minutes after the storm started at 5:50 AM):

| Quantity | Value | Where it comes from |
|---|---|---|
| S (newest delivered reading) | 7.14 ft | observed 6:50, delivered 7:00 (10-min delay) |
| Rise over 30 min | 7.14 − 2.67 = +4.47 ft | shown as "+4.5 ft over the last 30 min" |
| Trigger / watch level | 6.0 ft / 4.4 ft | the link's authored demo values |
| tCross (trigger crossed) | between 6:35 (4.72 ft) and 6:50 (7.14 ft) → 6:42.9 → minute 52.9 | straight line between the two readings |
| τ, fast end, slow end | 40, 33, 44 min | the link |
| etaMid | 40 − (70 − 52.9) = 22.9 min | "the middle guess, counted from now" |
| etaLo, etaHi | 22.9 − (40 − 33) = **15.9**; 22.9 + (44 − 40) = **26.9** | earliest and latest likely arrival |
| Window | 15.9 … 26.9 → **15–30 min** | snapped to the fixed buckets 0–15 · 15–30 · 30–60 · 60–90 |

Try it yourself at 7:05 AM: etaLo becomes 10.9, so the window is 0–30 — and the app says "water may already be on the
road" instead of "0–30 min".

## The tests and what each one catches
| Test | What bug it would catch |
|---|---|
| stale upstream link is ignored | trusting a gauge that stopped reporting an hour ago |
| no links → no_rise | crashing (or inventing a warning) for a crossing with no gauge |
| worked example → Avoid 15–30 | wrong travel-time math, or using the observation time instead of what was delivered |
| rounding (0.1 ft, τ to 5 min) | the app printing "+4.4700000001 ft" |
| windows only from the buckets | inventing a window like 17–26 min |
| crossed recently while falling → still Avoid, window starts at 0 | dropping the warning while the wave is still on its way |
| falling wave keeps rise ≤ 0 in its reason | hiding the real (negative) rise instead of letting the UI pick the right sentence |
| high but flat for hours → no_rise | warning forever about a creek that is high but not moving |
| τ 150 min → only Watch | showing Avoid for water that is still far away |
| Watch rows (above 4.4 and rising / slow rise / below watch) | the wrong threshold, or `≥` where the rule says `>` |
| calm → no_rise with nothing else | leftover window or reason on a calm crossing |
| two gauges → soonest arrival wins | picking the first link instead of the most urgent one |
| Avoid reasons before Watch reasons; max 3 | a confusing "Why this alert?" list |
| whole storm: every warning has a reason and a bucket window | any state with no explanation |
| deterministic | different results on two runs (it would break the golden test and the video takes) |

## Common mistakes
- Using a reading the phone hasn't received yet (look only at `series`; it is already "as of now").
- Treating "high" as dangerous by itself — the rule needs the water to be rising or to have just crossed the trigger.
- Mixing up which travel-time end goes with which side: the *fast* end (P25) gives the *early* edge of the window.
- Returning a window for Watch, or forgetting to clamp etaLo at 0.

## Words to know
| Word | Plain meaning |
|---|---|
| Stage | How high the water is at a gauge, in feet |
| Trigger level | The stage at which water from this gauge usually floods the crossing downstream |
| Watch level | A lower stage that means "pay attention" |
| τ (tau), travel time | How long water takes to flow from the gauge to the crossing |
| P25 / P75 | The fast end and the slow end of the travel time (a quarter of storms are faster / slower) |
| etaLo / etaHi | The earliest and latest likely time the water arrives, in minutes from now |
| Window | etaLo…etaHi snapped to a fixed bucket, like 15–30 min |
| Stale | A gauge whose newest reading is too old to trust |

## Questions for me (answer in my own words)
1. Why must the upstream gauge be *rising*, not just high? — **My answer (date):**
2. Why do we show a time *range* that starts at the earliest likely arrival, not one number? — **My answer (date):**
3. What happens when the upstream gauge stops reporting? — **My answer (date):**
4. Why does the rule wait for the gauge reading to be *delivered* (`availMin ≤ t`) instead of using the reading's observation time? — **My answer (date):**
5. At 7:00 AM the window is 15–30 min. Walk through how 15.9 and 26.9 become "15–30". — **My answer (date):**
6. Why does FordCast show "30–45 min" for travel time instead of "40 min"? — **My answer (date):**
7. Why does a crossing with no upstream gauge show Unknown, not No rise? — **My answer (date):**

## Hints used
_(none yet — ask for "hint 1", "hint 2" or "hint 3"; each one is logged here)_

## Review Q&A (filled after the agent's review)

## If a judge asks…
- "Is this machine learning?" — **My answer:**
- "What if the travel time is wrong?" — **My answer:**
