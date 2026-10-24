# October 18 repair verification

Current scope: offline scientific prototype. This supersedes the initial QA numbers and
the October 17 verification report. The original audit and evidence remain preserved.

## Findings and disposition

| Initial finding | Repair / evidence |
|---|---|
| Unsupported validated road truth | Removed all 12 road labels. Zero Tier-A road thresholds. Thirty Tier-B records explicitly say research candidates; road/topology validation is pending. Six cases have published NOAA category proxies; unavailable category values are excluded. Exact source URLs and retrieved responses are cached under `data/reference/`. |
| Incorrect nearest-gauge comparator | WGS84 geodesic argmin over the frozen 19-gauge catalog, with deterministic ID tie-break. Scientific test independently checks every comparator against catalog distances. |
| Future readings in chart slots | Strict prior-observation lookup with maximum 20-minute carry-forward. Irregular-time test plus every gauge in all five bundles checked against causal archive conversion. |
| Invented creek geometry | Two-endpoint schematic connectors with `geometry_source=schematic_corridor_connector`, `topology_verified=false`, and matching EN/ES attribution. No real stream geometry claim. |
| Fabricated fallback calibration | No fixed-speed prior, invented correlation, or forced training count. Measured values remain null when unavailable; review-required links are excluded before constructing forecast Links. Current empirical states are explicitly experimental gauge references. |
| Unmeasured calm results | Separate unevaluated population rates stay null. Control exposure derives from timestamps: 36 hours/1.5 days. Full 30-day calm evaluation remains pending. |
| Visible status word absent | Inventory renders translated state text beside the glyph; Tier C says Not monitored. Rendered-component tests cover all five states and unmonitored rows. |
| Zero-arrival warning omitted | HUD renders and speaks the water-may-already-be-on-road warning. Fixture component test verifies both channels. |
| Alert toggle overclaims | Watch preference explicitly says local preview/push disconnected; test alerts are text-only previews with an allowed 15–30-minute arrival window. |
| Late interruption banner | Banner checks the simulated clock directly, independently of sample delivery. Start/end boundaries tested. The 11:15–13:45Z interval is now explicitly a modeled robustness assumption, not verified historical telemetry. |
| Guided sample does not reset | Replay session key combines storm ID and reset token. Sample 1 increments token and remounts paused at its initial step, with gauge 08158840 when available. Storm switches reset session state. |
| Stop/voice cleanup | Stopped state removes HUD, stops speech and resets simulation controls. Speech cancels on blur, background, language/storm changes; background stops the session. Unsupported voice reports an error. |
| Incorrect speed labels | Tick duration divided by multiplier: 300/30/10/5/2.5 seconds at 1/10/30/60/120x. Unit checks verify all five intervals. |
| Provenance/pre-registration | Actual Git revision, working-tree dirty flag and source hash; honest generation time. Deterministic median-based example selection, without historical pre-registration claims. |
| Operational MVP incomplete | No deployment/live/push/routing claim. Offline scope is visible in onboarding, evidence cards, replay/HUD context, preferences, README and Claims Ledger. |

## Current scientific interpretation

The proxy study has 6 reference cases and 12 category onsets across five storm windows.
Candidate AVOID H/M/F: 4/8/1; POD 0.333, FAR 0.200, CSI 0.308, median lead 65 minutes.
True nearest-gauge AVOID H/M/F: 4/8/0; POD 0.333, FAR 0.000, CSI 0.333, median lead
65 minutes. These are **downstream gauge-category threshold** outcomes, not observed
road overtops. The repaired dataset does not demonstrate superiority over the comparator.
Shared target gauges and only five storms limit independence/generalization. No road-level
accuracy or lead-time claim is retained.

The selected median-based reference example is Memorial Day 2015, tc-167, 90 minutes.
This is the eligible hit closest to the aggregate median, not an assertion that it equals
the median. No sample button hardcodes a headline number.

## Checks and remaining verification

- Scientific artifact audit passed with no causal-chart mismatches, wrong nearest choices,
  invented zero-storm correlations or review-flagged links used in replay.
- 51 non-I/O backend pytest cases passed together; the separate stale-snapshot case also
  passed. Five original async provider/tick tests passed through the immediate offline
  coroutine runner using their original assertions. This does not replace HTTP integration.
- Direct API endpoint smoke passed: offline health, 141 Unknown risks, crossing detail and
  five replay entries. The two actual HTTP TestClient integration cases require rerunning.
- Mobile rendered-component checks cover status words and voice/stop lifecycle.
- Final TypeScript and ESLint checks passed after the last EN/ES copy changes.
- The complete mobile suite passed: **25 tests in 3 suites** (contracts/copy,
  rendered components, and replay time/interruption boundaries).
- The final code-source hash matches the rebuilt results provenance, and the deterministic
  median-lead selector check passes. All five replay JSON/gzip outputs and mobile manifests
  have been regenerated. Generation timestamps reflect the actual build.
- The initial all-platform export failed Hermes output with `permission denied` in the
  restricted Windows temporary directory. With TEMP/TMP set to `.local/build-tmp`, web,
  Android and iOS bundles compiled, including both native Hermes bytecode files. That
  attempt then failed creating files under the existing `mobile/dist` folder. A fresh
  output-directory retry encountered the same nested-directory error. Precreating the
  output folders resolved it: the final all-platform export **passed (exit 0)** to
  `.local/export-verification`, including web output and Android/iOS Hermes bytecode.
- All five gzip replay files have identical SHA-256 hashes across the source, backend and
  mobile copies.
- Ruff and whitespace checks are part of local verification.

Full `tools/check.ps1`/HTTP integration acceptance is **not yet claimed**. The Windows
sandbox stalls asyncio/TestClient socket initialization. Automatic approval review rejected
the expanded-permission rebuild/test attempt because its service usage limit was reached;
the blocked command did not execute. Offline generation was made network-free and passes
without expanded permissions; HTTP/live behavior still requires actual environment support.

Browser access was briefly available for onboarding: the repaired scope text rendered and
acceptance was disabled before checking the notice. It subsequently returned “Local browser
use is disabled in Work settings.” No complete interactive EN/ES walkthrough, responsive
layout acceptance, console-clean claim or screenshot proof of the finished product is made.
Native device, field evidence, fluent Spanish review and accessibility acceptance remain
pending. `tools/qa_audit.py` PASS covers its explicit artifact contracts, not zero universal
scientific or UI defects.

Dependency security acceptance also remains pending. The last dependency installation
reported 74 affected packages (55 high, 19 moderate); the preserved initial audit reported
76. These are dependency-path counts, not independent vulnerabilities. No clean audit or
verified production exposure assessment is claimed; SDK-compatible remediation still
requires review before release.

Reproduce with:

```powershell
uv run --project backend python tools/build_replays.py
uv run --project backend python tools/export_app_data.py
uv run --project backend python tools/write_claims.py
uv run --project backend python tools/qa_audit.py
./tools/check.ps1
```

For the restricted Windows export environment, from `mobile/`:

```powershell
$env:TEMP = 'C:\2025AppChallenge\.local\build-tmp'
$env:TMP = $env:TEMP
$exportRoot = 'C:\2025AppChallenge\.local\export-verification'
foreach ($subdir in @('_expo/static/js/web', '_expo/static/js/ios', '_expo/static/js/android', '_expo/static/css', 'assets')) {
    New-Item -ItemType Directory -Path (Join-Path $exportRoot $subdir) -Force | Out-Null
}
node node_modules/expo/bin/cli export --platform all --max-workers 2 --output-dir ../.local/export-verification
```

An exported bundle is not a native binary, installed-device test, or verified live service.

Source changes were agent-authored. No student review, submission eligibility or competition
policy compliance has been inferred. No cloud resource or paid service was provisioned.
