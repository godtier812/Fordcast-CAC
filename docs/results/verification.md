# Local verification — October 17, 2026

This records executed checks, not full master-prompt acceptance.

| Check | Result |
| --- | --- |
| Backend regression suite | 45 passed |
| Python Ruff lint and formatting | Passed |
| Mobile TypeScript and ESLint | Passed |
| Mobile contract/copy tests | 7 passed |
| Expo Doctor after SDK patch update | 21/21 passed |
| Production web export | Passed |
| `tools/check.ps1` end-to-end | Passed |
| Browser interaction and visual inspection | Not run: local browser use disabled in Work settings |
| Android/iOS device builds and execution | Not run: no configured device/build account |
| Hosted CI | Workflow added; not run remotely |

Tests cover delayed observation visibility, future-data exclusion, mixed parameters,
official-status precedence, warning windows, stale snapshots, escalation/de-escalation,
synthetic lag recovery, metric edge cases, bundled-file checksums and locale parity.
Synthetic tests demonstrate code behavior; they do not establish real flood prediction skill.

The real historical study did not establish a usable positive propagation lag. Two storms
failed the correlation threshold, while one returned zero lag. The combined result is now
flagged for review for insufficient independent estimates, nonpositive lag and unverified
channel distance. No crossing forecast consumes these estimates.

## Dependency review

Expo was updated from the master prompt's 57.0.28 pin to SDK-compatible 57.0.30 following
Expo Doctor's concrete mismatch report. Python uses installed 3.13.7, not a claimed 3.13.16.
The app uses StyleSheet components; NativeWind/RNR integration is not complete.

`npm audit fix --ignore-scripts` applied compatible transitive updates. The resulting audit
still reports 76 affected packages (57 high, 19 moderate), largely propagated through six
underlying advisory families. See `npm-audit.json` for paths and advisory URLs. Suggested
forced fixes include incompatible SDK changes and even downgrades, so they were not applied.
Dependency remediation and reachability review remain release gates; this is not a clean
security audit. No public deployment was performed.

Pytest emits one upstream Starlette TestClient deprecation warning about httpx; all tests
pass. The warning remains recorded rather than suppressed.

## Scope limits

No calibrated probabilities, accuracy percentages, warning lead-time claims, student
explain-back answers, human translation review or field-test results have been fabricated.
The 141 source inventory records are not deduplicated or verified road thresholds. Native
map rendering and replay pause-on-background behavior still need device/UI verification.
