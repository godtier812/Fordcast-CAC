# FordCast

An Austin-area flood-awareness prototype. **This is not a live warning service.**
The implemented app shows 141 public inventory records, saved crossings, English/Spanish
copy, and playback of real historical USGS observations. All inventory records remain
Tier C / Unknown until their monitoring links and road thresholds are validated.

The Python core implements availability-aware data access, conservative warning windows,
official-status precedence, escalation/de-escalation, travel-time estimation and evaluation
metrics. The local API returns offline Unknown states by default. The mobile app currently
uses bundled data; it is not connected to a live forecast pipeline.

## Run locally

Requirements: Node 22, npm, uv and Python 3.13. Run from this repository:

```powershell
uv sync --project backend --locked
uv sync --project tools --locked
Set-Location mobile
npm ci
npm run web
```

Open the localhost URL printed by Expo. Web uses a geographic overview, not street-map
tiles. Native MapLibre requires an Android/iOS development build; Expo Go falls back
to the inventory list. No native-device acceptance has been completed.

In another terminal, start the local API:

```powershell
uv run --project backend uvicorn fordcast.api.app:app --app-dir backend --host 127.0.0.1 --port 8000
```

API documentation: http://127.0.0.1:8000/docs. No account or secret is required for the
bundled prototype. Environment examples list future integrations, not working credentials.

## Verify

```powershell
./tools/check.ps1
```

This runs Python lint/format/tests and mobile typecheck/lint/tests. Production bundling:
`cd mobile` then `npx expo export --platform web`. Native bundle compilation does not
replace device testing. See [verification](docs/results/verification.md) for actual results.

## Data and evidence

- [Data bridge report](docs/data-bridge-verification.md): successful public probes and unavailable feeds.
- [Data manifest](data/MANIFEST.json): bundled-file checksums and provenance.
- [Travel-time study](docs/results/travel-time-study.json): two rejected estimates and one zero-lag estimate; **requires review**, not usable forecast skill.
- `data/storms/`: archived gauge observations and metadata, not validated forecast replays.
- [Autonomous decisions](docs/decisions/step0.md) and [AI authorship](AI_USE.md).

The public inventory combines City of Austin and Travis County source records. It is not
a deduplicated or field-verified crossing catalog. Static closure fields are not treated
as current official status. Historical observations are not predictions.

To reproduce downloads, run `tools/smoke_test.py`, `tools/bootstrap_data.py` and
`tools/export_app_data.py` using `uv run --project tools python`. The bounded historical
study uses `uv run --project backend python tools/learn_onion.py`. Raw HTTP responses are
ignored by Git; these scripts contact public services and may fail if those services
change. Do not turn the bootstrap probes into unkeyed routine polling.

## Remaining acceptance gates

Validated crossing/gauge links and road thresholds; independently documented outages;
training/test separation and measured forecast performance; persistent ingestion and
snapshot jobs; production API integration; routing, notifications and audio; native builds,
accessibility and field testing; human Spanish review; district eligibility and AI-policy
review. Drive and push-alert features are explicitly unavailable in this prototype.

The original proposal and `docs/master-prompt/` describe the intended product, not completed
features. Start with `docs/master-prompt/00-START-HERE.md` and load individual sections as needed.
