# AI Use and Authorship Disclosure

This document records actual authorship across the repository in accordance with §1.3 and §40.4 of the specification.

## Autonomous Implementation Record
- On October 16–17, 2026, the user authorized full autonomous implementation to complete the FordCast prototype from `docs/master-prompt/`.
- All code, data-pipeline scripts, tests, and documentation created or updated during these autonomous sessions are **agent-authored**:
  - **Backend (`backend/fordcast/`, `backend/tests/`):** Domain types, `DataSource` and `StormReplaySource` with strict no-lookahead enforcement, `travel_time.py`, `triggers.py`, `baseline_rule.py`, `state_machine.py`, `combine.py`, `tick.py`, `snapshot.py`, `labels.py`, `metrics.py`, `backtest.py`, `replay/{storyboard,schema,build}.py`, FastAPI endpoints (`api/app.py`), and 50 unit/property/integration tests.
  - **Data & Science Tools (`tools/`):** `smoke_test.py`, `bootstrap_data.py`, `build_storm_archive.py`, `build_replays.py`, `select_hero.py`, `export_app_data.py`, and `check.ps1`.
  - **Mobile Prototype (`mobile/src/`):** Expo Router tabs (`index.tsx`, `replay.tsx`, `drive.tsx`, `alerts.tsx`), `crossing/[id].tsx`, `legend.tsx`, `settings.tsx`, `Pledge.tsx`, `MapSurface.tsx` / `MapSurface.web.tsx` / `NativeMap.tsx`, `data.ts`, `risk.ts`, `preferences.tsx`, `en.json`, `es.json`, and 11 Jest contract/unit tests (`contracts.test.ts`).
  - **Documentation (`docs/`):** `CLAIMS.md`, `results/results.md`, `results/verification.md`, `decisions/step0.md`, and `explain/{travel_time,baseline_rule,metrics,datasource}.md`.

## Student Review & Explain-Back
- One-page explainers in `docs/explain/` summarize the mathematical and algorithmic design of the four core modules (`travel_time.py`, `baseline_rule.py`, `metrics.py`, and `sources/base.py`) so the student can review, inspect, and explain every component.
- Source observations were checked against public USGS/NOAA records. The October 18 audit
  repairs remove unsupported road thresholds, an incorrectly selected comparator,
  future-to-past chart assignments, and invented fallback calibration evidence. Results
  now concern downstream gauge-category proxy cases; road-flooding skill is unverified.
- The repair code, regression tests and documentation are agent-authored. No student
  explain-back review, human field validation or submission-policy compliance is implied.

## October 22 finalization pass

- At the user's request, the agent implemented additional trip-evidence loading/failure states,
  malformed ATXFloods/NWS response guards, a storm-transition regression repair, origin-selection
  handling, route-screen simplification, contrast changes, bilingual copy and regression tests.
- The agent corrected submission wording, including a USGS station name and the national deadline,
  and wrote the Round 5 audit/recording handoff. These edits and drafts are agent-authored.
- No student personal experience, field validation, fluent Spanish review, user study, eligibility
  confirmation, official endorsement or competition-policy compliance was established by this pass.
- Existing scientific results were not recalibrated or rewritten. The student must review the
  implementation, understand the limits and provide truthful personal answers and disclosure.
