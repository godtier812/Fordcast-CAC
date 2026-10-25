# FordCast demo — credits and source notes

Participants: **Ashrith Repaka and Ayush Sankar** (spellings confirmed by the participants).

Personal narration and opening video were supplied by the user. The originals are preserved. Scene numbers correspond to the supplied filenames. No personal media was uploaded by this edit.

## Context imagery and research

- Lake Austin's location on Texas's Colorado River: [Texas Water Development Board](https://www.twdb.texas.gov/surfacewater/rivers/reservoirs/austin/index.asp).
- Dated headline excerpt: [City of Austin, July 5, 2025](https://www.austintexas.gov/ready-central-texas/news/flood-safety-concerns-prompt-ban-use-area-waterways). It concerns waterway use and does not establish flooding on the demonstrated Onion Creek road trip.
- Regional map: [OpenStreetMap](https://www.openstreetmap.org/#map=12/30.3300/-97.7800), © OpenStreetMap contributors, [copyright / ODbL terms](https://www.openstreetmap.org/copyright). The video retains a map credit.
- Pennybacker Bridge photograph: **Dbtfz**, July 2, 2005, released into the public domain by the copyright holder, [Wikimedia Commons source and license](https://commons.wikimedia.org/wiki/File:PennybackerBridge.jpg). Cropped for the video. This is a location photograph, not July 2025 flood footage.
- Format reference: [2026 Congressional App Challenge rules](https://www.congressionalappchallenge.us/wp-content/uploads/2026/05/2026-CAC-Rules.pdf). The local export is 2:45; this edit does not submit or publish it or certify participant eligibility.

## App and code footage

Actual local FordCast browser captures at localhost:8083, using a phone-sized viewport, GPS off, and app voice muted. Static crops and explanation cards enlarge real evidence; code excerpts are drawn from the repository. Browser screenshots were sampled into timestamped motion clips rather than inventing app screens.

- TypeScript: mobile/src/lib/danger.ts, road / waterway / distance grouping checks.
- Python: backend/fordcast/sources/base.py, assert_no_lookahead.
- AI disclosure: AI_USE.md. Substantial agent authorship is shown explicitly. Student contribution captions follow the supplied narration; they are not an independent audit of authorship.
- Current study values were checked against the current app: upstream 10 hits / 2 misses / 6 false alarms; nearest gauge 4 hits / 8 misses / 3 false alarms, across 12 downstream gauge-reference cases. These are not road-flood accuracy results.

The synthetic-closure sequence is visibly labelled TEST. The Memorial Day 2015 sequence is visibly archived and simulated, with a precomputed alternative. The capture already shows the rerouted state when playback begins; the edit shows archive setup followed by that real outcome rather than fabricating a before/after transition. The current Arrived timing note is excluded.

No music, synthetic voice, generated flood imagery, or stock flood footage is used. Audio is the supplied narration, trimmed for silence, lightly denoised and normalized. Captions were generated locally and corrected for names and terminology.
