# FordCast: Backend, ML, and Storm Replay Architecture Spec (research report)

**Role:** Backend + ML engineer · **Date:** 2026-10-14 · **Deadline context:** CAC submit by Oct 25–26; judging runs Nov–Dec 2026, so every service must stay up through **Dec 31, 2026**.

**Claim tags:**
- `[V: url]` means verified against that source today.
- `[V: pip/npm]` means verified against the PyPI or npm registry today.
- `[V: code]` means verified by reading the package source, or by running it in a prototype today.
- `[U]` means unverified. These come from memory or from a source I could not reach, and each one has a safe fallback.

**Research limits:**
- The shared web-search budget ran out partway through. Some items are therefore marked `[U]`: the ATXfloods feed, MRMS paths, NWPS paths, OpenRouteService quotas, the Render Starter price, the GitHub Actions terms wording, Supabase IPv6, and the exact `realtime.send` signature.
- `WebFetch` and `curl` to most domains are blocked by the sandbox proxy. To compensate, I verified APIs directly in package source:
  - `dataretrieval` 1.4.0 (the official USGS client)
  - `pynhd` 0.20.0 (the NLDI client)
  - `expo-server-sdk` 7.2.0
  - `@supabase/supabase-js` and `realtime-js` 2.117.3
  - `storage3` 2.32.0
  - scikit-learn 1.9.1 and shap 0.52.0
- I also resolved and installed the full Python dependency set with `uv`, and ran a working prototype of the core algorithms: the travel-time estimator, the hysteresis state machine, the no-lookahead replay test, calibrated gradient boosting with SHAP, and the POD/FAR/CSI scorer.

---

## 0. TL;DR: decisions at a glance

| # | Decision | Recommendation (why) | Runner-up |
|---|---|---|---|
| H1 | **Database, realtime, storage, and clock** | **Supabase Free** (Postgres + PostGIS + Realtime + Storage + Cron). The 5-minute ingest writes count as DB activity, so the project never hits the "paused after 1 week of inactivity" rule. `[V: supabase.com/docs/guides/platform/free-project-pausing]` | Neon + Upstash (more moving parts) |
| H2 | **5-min ingest and scoring** | Supabase Cron (`pg_cron`) every 5 min calls `pg_net` `net.http_post`, which hits `POST /internal/tick` on the Python FastAPI service on Render. pg_cron is the most precise free clock, and it supports 1–59 s jobs. `[V: supabase.com/docs/guides/cron/quickstart]` | **Modal** scheduled function (Python-native, $30/mo free credit) `[V: modal.com/pricing]` |
| H3 | **Python service host** | **Render web service.** Use **Free** while building and **Starter (~$7/mo) from Oct 20 to Dec 31** (≈$17–21 total), so judges never hit a cold start. Free services spin down after 15 min idle, and a cold start takes about a minute. `[V: render.com/docs/free]` Starter price is `[U]` (third-party sources only). | Modal `@asgi_app` (scale-to-zero, so cold starts) |
| H4 | **Read path for phones** | **Primary:** a static snapshot `current.json` in a Supabase Storage public bucket, rewritten every tick with `cache-control: 30`. **Secondary:** FastAPI `GET /v1/risk/current`, which returns the identical schema. **Last resort:** the on-device SQLite cache. A static file is what judges are least likely to see broken. | PostgREST views over the publishable key |
| H5 | **Realtime to phones** | Supabase Realtime **`postgres_changes` on `risk_current`**. Rows are written **only when something meaningful changes**. Free limits are 200 concurrent connections, 100 msgs/s, and 2 M msgs/month. `[V: supabase.com/docs/guides/realtime/limits, /pricing]` | Broadcast-from-DB trigger (`realtime.send`) once there are more than ~150 concurrent clients |
| H6 | **Push fan-out** | Runs inside the same Python tick. httpx posts to Expo Push `https://exp.host/--/api/v2/push/send` in chunks of ≤100. Receipts are checked 15 min or more later, in batches of ≤300 ids. `[V: code expo-server-sdk 7.2.0; docs.expo.dev/push-notifications/sending-notifications]` | Supabase Edge Function (TypeScript, `expo-server-sdk@7.2.0`) triggered by inserts to `risk_transitions` |
| H7 | **Backup clock and watchdog** | A GitHub Actions `schedule` runs every 15 min at off-minutes and calls the same idempotent tick. The minimum interval is 5 min, delays happen under load, and jobs can be dropped. `[V: docs.github.com events-that-trigger-workflows]` This is a watchdog, not the primary clock. | none |
| H8 | **Monitoring** | **healthchecks.io** (free, 20 checks) gets a ping at the end of every successful tick (period 5 min, grace 10 min). **UptimeRobot** (free, 50 monitors at 5-min intervals) watches `/v1/health` and the snapshot URL. **Sentry** catches exceptions. Quotas come from third-party pages `[V-3p]`. | Sentry Crons |
| H9 | **Judging-proof fallback** | Storm Replay timelines are **precomputed and bundled in the app** (works in airplane mode). A "data offline" state shows **Unknown**, never calm. `app_config` holds a kill switch and banner. | none |
| P1 | **Python** | **3.13** (3.13.16). Every dependency has wheels for it. numpy 2.5 needs ≥3.12; pandas 3 and sklearn 1.9 need ≥3.11. `[V: pypi]` | 3.14 (wheels exist too) |
| P2 | **Packaging** | **uv** with `exclude-newer = "2026-09-30"`, so no package younger than about 2 weeks gets in (polars 2.0.0 and pydantic 2.14 came out days ago). I resolved the full set: 129 packages. `[V: code]` | pip-tools |
| M1 | **Baseline model (MVP)** | An upstream-gauge **trigger-stage + rate-of-rise rule**, plus **learned travel time** (cross-correlation of smoothed first differences with parabolic peak refinement). In the prototype it recovered lags to within ±0.3 min. `[V: code]` | Nearest-gauge rule (kept only as the comparison baseline) |
| M2 | **ML model (stretch)** | sklearn **`HistGradientBoostingClassifier`** with `monotonic_cst`, wrapped in `CalibratedClassifierCV(FrozenEstimator(...))` and fitted on held-out storms. This adds no extra dependency, and SHAP `TreeExplainer` supports it. `[V: code sklearn 1.9.1, shap 0.52.0]` | XGBoost 3.4.1 `XGBClassifier(monotone_constraints=…)` |
| M3 | **Validation** | Leave-one-storm-out / `GroupKFold(groups=storm_id)`, scored event by event with POD, FAR, CSI, and median lead time, plus bootstrap CIs over storms, a reliability diagram, and Brier skill score. | none |
| R1 | **Replay** | One `pipeline.tick(now, source, clock)` for both live and replay. `StormReplaySource` only returns readings whose **`available_at ≤ now`**. Two tests prove no lookahead: **prefix invariance** and **future poison**. Both pass in the prototype. `[V: code]` | none |

---

## 1. Hosting: verified limits and the reliability plan

### 1.1 Verified platform limits (as of 2026-10-14)

| Platform | Fact | Source |
|---|---|---|
| **Supabase Free: pausing** | A Free project pauses when it "does not receive sufficient user database activity over the past week". A few DB requests per day is enough to keep it active. You get an email about 1 week before the pause. Paused projects are restorable (the docs now say a 1-year window; a 2024 changelog said 90 days). | [V: supabase.com/docs/guides/platform/free-project-pausing], [V: supabase.com/changelog/27497] |
| Supabase Free: quotas | **500 MB DB per project**. Egress is **5 GB uncached + 5 GB cached**, pooled across the org. 50,000 MAU. **2 active projects**. No overage billing: you get a notification, then a grace period, then possible restrictions. | [V: supabase.com/pricing], [V: supabase.com/docs/guides/platform/manage-your-usage/egress] |
| Supabase Realtime (Free) | **200 concurrent connections**, **100 msgs/s**, **2,000,000 msgs/month**, 100 channel joins/s, broadcast payload ≤ 256 KB. Clients are disconnected when the msg/s limit is exceeded. | [V: supabase.com/docs/guides/realtime/limits], [V: …/realtime/pricing] |
| Supabase Edge Functions (Free) | **500,000 invocations/month**, **150 s wall clock**, **2 s CPU per request**. | [V: supabase.com/docs/guides/functions/limits], [V: …/functions/pricing] |
| Supabase Cron | `pg_cron` + `pg_net`. Standard 5-field cron syntax, **plus sub-minute jobs ("30 seconds")** on Postgres ≥ 15.1.1.61. pg_net handles at most about 200 req/s, and responses are kept 6 h. | [V: supabase.com/docs/guides/cron/quickstart], [V: …/database/extensions/pg_net] |
| Supabase API keys | New-format keys are `sb_publishable_…` (client-side) and `sb_secret_…` (server-side). They are **not JWTs** and go only in the `apikey` header. | [V: code @supabase/supabase-js 2.117.3 src/lib/fetch.ts] |
| **Render Free web service** | **Spins down after 15 min without traffic.** Spin-up takes about 1 min. **750 free instance hours per workspace per calendar month.** | [V: render.com/docs/free], [V: render.com/articles/how-much-does-cloud-application-hosting-cost…] |
| Render plans (since Aug 1, 2026) | **Hobby workspace is free with 5 GB bandwidth** (then $0.15/GB, or services spin down if no card is on file). Hobby allows 25 services. | [V: render.com/changelog/updated-plans-for-render-workspaces] |
| Render keep-alive | Render staff on the community forum: artificially keeping a free service awake "goes against the spirit of the free tier". | [V: community.render.com/t/…/23630] |
| Render Starter / Cron | Starter is ~$7/mo (always on). Cron jobs bill per minute with a $1/mo minimum per cron service. | [V-3p: makerkit, kuberns]; exact Starter price `[U]` |
| **GitHub Actions schedule** | Shortest interval is **every 5 min**. Runs can be delayed under high load, and the **start of every hour** is the worst time. **Some queued jobs may be dropped.** | [V: docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows] |
| GitHub Actions: inactivity | **In public repos, scheduled workflows are auto-disabled after 60 days with no repository activity.** | [V: docs.github.com …/disabling-and-enabling-a-workflow] |
| GitHub Actions: cost | Standard GitHub-hosted runners are **free for public repos**. | [V: docs.github.com/en/actions/concepts/billing-and-usage] |
| GitHub Actions: terms | The Additional Product Terms discourage using Actions "as part of a serverless application". | `[U]`, recalled. This is why GH Actions is only the backup clock here. |
| Google Cloud | Cloud Scheduler: **3 free jobs per billing account**. Cloud Run (request-based): **180,000 vCPU-s, 360,000 GiB-s, and 2 M requests free per month**. Both need a billing account (credit card). | [V: cloud.google.com/scheduler/pricing], [V: cloud.google.com/run/pricing] |
| Modal | **Starter: $0 + compute, $30/month free compute.** "Scheduled and Web Functions (limited)". A third-party tracker says 5 crons and 8 web endpoints. | [V: modal.com/pricing]; counts are `[U]` |
| Vercel Hobby cron | **Once per day only.** More frequent expressions fail at deploy. **Disqualified.** | [V: vercel.com/docs/cron-jobs/usage-and-pricing] |
| Cloudflare Workers Free | 100,000 req/day, **10 ms CPU per invocation (including cron)**, 5 cron triggers. A Python `scheduled` handler exists. **Disqualified**, because pandas/sklearn will not run in 10 ms or in that runtime. | [V: developers.cloudflare.com/workers/platform/limits] |
| Fly.io / Railway | Fly: no free tier for new orgs. Railway: a $5 trial credit. Sources conflict. | [V-3p, conflicting]. Not recommended. |
| healthchecks.io | Free: 20 checks. Open-source (BSD). | [V-3p: freetier.co, capterra] |
| UptimeRobot | Free: 50 monitors at 5-min intervals. Non-commercial use only, which is fine for a student project. | [V-3p: notifier.so] |

### 1.2 Decision for each workload

```
                     ┌──────────────────────── Supabase (Free) ────────────────────────┐
  (a) CLOCK          │ pg_cron '*/5 * * * *' ──► pg_net net.http_post ─────────────────┼──┐
                     │ Postgres+PostGIS  ·  Realtime  ·  Storage (public bucket)  ·  Vault│  │ X-Tick-Secret
                     └───────▲───────────────────────▲───────────────────▲─────────────┘  │
                             │ psycopg (pooler)       │ upsert snapshot    │                │
  (b)(d) COMPUTE     ┌───────┴────────────────────────┴───────────────────┴─────────────┐  │
                     │ Render web service: FastAPI (Python 3.13, uvicorn)                │◄─┘
                     │  POST /internal/tick → lease → ingest USGS → features → risk →    │◄── GH Actions */15 (watchdog)
                     │  state machine → write → snapshot → push fan-out → hc ping        │
                     │  GET /v1/*  (read API, route check, devices, replays)             │
                     └──────┬─────────────────────────────┬──────────────────────────────┘
                            │ httpx                        │ httpx
              USGS Water Data API (X-Api-Key)        Expo Push API → APNs/FCM → phones
              USGS NLDI (offline linking)            OpenRouteService (detours)
```

- **(a) Ingest + scoring every 5 min:** pg_cron is the clock and the Render FastAPI service does the work.
  - The tick handler returns **202 immediately** and runs the work as a background task. A lease row prevents two ticks from overlapping.
  - Runner-up: Modal `@app.function(schedule=modal.Period(minutes=5))`. That Modal API name is `[U]` (it comes from a third-party skill page); confirm it in the Modal docs.
- **(b) Read API:** the static snapshot in Storage comes first, then FastAPI, then the on-device cache.
- **(c) Realtime:** Supabase `postgres_changes` on `public.risk_current`. Rows change **only** on state, window, or official-status changes (see §7.4). The budget is computed in §7.6.
- **(d) Push:** the Python worker sends to Expo after each tick (§9).

### 1.3 Keep-alive, monitoring, and freshness alarms

| Check | Tool | Config |
|---|---|---|
| Tick heartbeat | healthchecks.io | The worker GETs `https://hc-ping.com/<uuid>` **only after a successful tick** (and `/fail` on exception). Period 5 min, grace 10 min, alert to email and phone. |
| API up | UptimeRobot HTTP(S) | `GET https://<api>/v1/health`, every 5 min, keyword `"status":"ok"`. |
| Snapshot fresh | UptimeRobot keyword | `GET <storage>/snapshots/current.json`, keyword `"data_status":"live"` (alert if missing). |
| Data freshness | in-app + `/v1/meta/freshness` | **Degraded** if more than 25% of linked gauges are stale (obs age > `stale_after_min`, default 60). **Offline** if more than 75% are stale or the last OK tick was over 20 min ago. |
| Exceptions | Sentry `sentry-sdk[fastapi]` 2.71 | `traces_sample_rate=0.05`, `send_default_pii=False`. |
| Supabase pause | email + healthchecks | If ticks stop for more than 24 h, a page goes out long before the 7-day pause rule kicks in. |
| GH schedule auto-disable | calendar | **The last commit around Oct 25 plus 60 days lands on about Dec 24, still inside judging.** Commit at least every 3 weeks (for example, refresh `docs/status.md` with live metrics on Nov 10, Nov 30, and Dec 15). |

### 1.4 Judging-proof fallback ladder (the app never shows a broken screen)

1. **Storm Replay is offline-first.** Every replay timeline (`replays/<storm>.json.gz`, about 50–150 KB each) ships **inside the app bundle**, so it works in airplane mode. The app checks a newer version against Storage by `sha256`.
2. **Live map fallback order:** Storage snapshot (CDN), then `GET /v1/risk/current`, then the SQLite cache. Each step labels its age ("risk as of 12 min ago"). If the age is over 20 min, every crossing renders **Unknown (dashed gray)**, never calm.
3. **`app_config`** (public, read-only) holds `banner_en`/`banner_es`, `min_app_version`, `demo_mode_default`, and `kill_switch_push`.
4. **Calm-day demo:** the home screen shows "No current signal at N monitored crossings · Last update 2 min ago · Try Storm Replay →". That is honest and still impressive on a calm day.
5. **Calendar actions:** turn on Render Starter Oct 20. Commit every 3 weeks. Check dashboards on the first day of each judging week. Leave it running until Dec 31.

### 1.5 Cost

| Item | Cost |
|---|---|
| Supabase Free / GitHub public Actions / USGS API key / healthchecks / UptimeRobot | $0 |
| Render Starter Oct 20–Dec 31 | ≈ $17–21 total `[U price]`. Free-tier fallback is $0, with the cold-start and ToS caveats above. |
| Expo Push, OpenRouteService free key, Sentry Developer | $0 `[U quotas]` |

---

## 2. Python stack (versions verified on PyPI today)

**Policy:** pin with uv and lock with `exclude-newer = "2026-09-30T00:00:00Z"`. That keeps out days-old majors: polars 2.0.0 is from Oct 6 and pydantic 2.14 from Oct 11. The one per-package override is `dataretrieval` (1.4.0, Oct 2), because it switched to the **v1 OGC API**. I resolved and installed this exact set on Python 3.13.16: 129 packages `[V: code]`.

| Package | Locked version | Notes | Tag |
|---|---|---|---|
| Python | **3.13.16** | 3.14.6 also works; 3.15 is still beta in uv's list. | [V: uv python list] |
| fastapi | 0.142.1 (latest 0.143.0, Oct 8) | Starlette 1.7.0 underneath. | [V: pypi] |
| uvicorn[standard] | 0.54.0 | | [V: pypi] |
| pydantic / pydantic-settings | 2.13.5 / 2.15.0 | v2 only | [V: pypi] |
| httpx | 0.28.1 | async client, `Timeout(10, connect=5)` | [V: pypi] |
| tenacity | 9.1.4 (9.2.1 is newer) | retries with exponential jitter | [V: pypi] |
| psycopg[binary,pool] / psycopg-pool | 3.3.6 / 3.3.3 | `prepare_threshold` kwarg exists (default 5) | [V: code] |
| orjson | 3.12.0 | fast JSON | [V: pypi] |
| numpy / pandas / pyarrow | 2.5.3 / 3.0.6 / 25.0.1 | pandas 3 needs ≥3.11 | [V: pypi] |
| scikit-learn | 1.9.1 | `FrozenEstimator`; calibration `method∈{sigmoid, isotonic, temperature}`; `HistGradientBoostingClassifier(monotonic_cst, class_weight)` | [V: code] |
| xgboost / lightgbm | 3.4.1 / 4.7.0 | optional (`ml` extra) | [V: pypi] |
| shap | 0.52.0 (0.53.0 is days old) | `TreeExplainer` supports `HistGradientBoostingClassifier` | [V: code] |
| joblib | 1.6.0 | model artifacts | [V: pypi] |
| dataretrieval | 1.4.0 | official USGS client, default **`ogcapi/v1`** | [V: code] |
| pynhd / geopandas / pyproj / shapely | 0.20.0 / 1.2.0 / 3.8.0 / 2.1.2 | offline linking only (`geo` extra) | [V: pypi] |
| structlog | 26.1.0 | JSON logs | [V: pypi] |
| sentry-sdk[fastapi] | 2.71.0 | `FastApiIntegration` exists | [V: code] |
| slowapi | 0.1.10 | per-IP rate limiting (in-memory, one instance) | [V: pypi] |
| pytest / pytest-asyncio / respx / pytest-recording / vcrpy / hypothesis | 9.1.1 / 1.4.0 / 0.23.1 / 0.13.4 / 8.3.0 / 6.168.3 | | [V: pypi] |
| ruff / mypy | 0.16.9 / 2.3.1 | | [V: pypi] |
| APScheduler | 3.11.3 | **Not used.** The external clock (pg_cron) survives restarts and is observable in `cron.job_run_details`. | [V: pypi] |
| polars | 1.44.2 (2.0.0 is 8 days old) | **Not used.** pandas is enough at this data size. | [V: pypi] |
| exponent-server-sdk (Python) | 2.2.0 | **Not used.** It is synchronous (`requests`). Call the Expo HTTP API directly with httpx instead. | [V: code] |

```toml
# backend/pyproject.toml (resolves on 3.13, verified)
[project]
name = "fordcast-backend"
version = "0.1.0"
requires-python = ">=3.13,<3.14"
dependencies = [
  "fastapi>=0.142,<0.143", "uvicorn[standard]>=0.54", "pydantic>=2.13,<2.14", "pydantic-settings>=2.15",
  "httpx>=0.28.1", "tenacity>=9.1", "psycopg[binary,pool]>=3.3.6", "orjson>=3.12",
  "numpy>=2.5,<2.6", "pandas>=3.0,<3.1", "pyarrow>=25", "scikit-learn>=1.9,<1.10", "joblib>=1.6",
  "dataretrieval>=1.4", "structlog>=26.1", "sentry-sdk[fastapi]>=2.71", "slowapi>=0.1.10", "shapely>=2.1",
]
[project.optional-dependencies]
ml  = ["shap>=0.52", "xgboost>=3.4", "lightgbm>=4.7", "matplotlib>=3.11"]
geo = ["pynhd>=0.20", "geopandas>=1.2", "pyproj>=3.8"]
[dependency-groups]
dev = ["pytest>=9.1", "pytest-asyncio>=1.4", "respx>=0.23", "pytest-recording>=0.13", "vcrpy>=8.3",
       "hypothesis>=6.168", "ruff>=0.16", "mypy>=2.3"]
[tool.uv]
exclude-newer = "2026-09-30T00:00:00Z"
exclude-newer-package = { dataretrieval = "2026-10-03T00:00:00Z" }
[tool.ruff]
line-length = 100
[tool.pytest.ini_options]
asyncio_mode = "auto"
markers = ["live: hits real external APIs (nightly only)"]
```

**Render settings:**
- Build: `pip install uv && uv sync --frozen --no-dev`
- Start: `uv run uvicorn fordcast.api.app:app --host 0.0.0.0 --port $PORT --proxy-headers`
- Add a `.python-version` file containing `3.13`. Render honouring this file is `[U]`; also set the `PYTHON_VERSION=3.13.16` env var.

**Repo layout:**
```
backend/
  pyproject.toml  uv.lock  .python-version
  src/fordcast/
    config.py            # pydantic-settings: all env vars, typed
    domain.py            # Reading, Gauge, Crossing, Link, RiskState, RiskResult (pydantic)
    clock.py             # Clock protocol: LiveClock, ReplayClock
    sources/base.py      # DataSource / OfficialStatusSource protocols
    sources/usgs_live.py # LiveUSGS (httpx → api.waterdata.usgs.gov/ogcapi/v1)
    sources/replay.py    # StormReplaySource (Parquet, available_at guard)
    sources/official.py  # ATXfloods/County status (best-effort) + manual overrides
    linking/nldi.py      # offline: snap + upstream gauges (pynhd)
    linking/travel_time.py, linking/triggers.py
    features.py          # rises, rel-stage, t-since-trigger (pure functions, as_of-aware)
    risk/rule.py  risk/ml.py  risk/combine.py  risk/state_machine.py  risk/explain.py
    pipeline.py          # tick(now, source, official, clock, store) -> TickResult  (ONE code path)
    store/db.py          # psycopg AsyncConnectionPool; store/repo.py SQL
    snapshot.py          # build + upload current.json
    push/fanout.py  push/expo.py  push/templates.py  # EN/ES
    api/app.py  api/routes/*.py  api/security.py  api/ratelimit.py
    replay/build.py  replay/verify.py
    eval/backtest.py  eval/metrics.py  eval/reliability.py
    cli.py               # python -m fordcast {backfill,link,train,replay-build,backtest,tick}
  tests/  (unit, contract w/ cassettes, replay golden, live-marked)
  data/storms/<storm_id>/{readings.parquet, truth.csv, meta.yaml}
  models/<version>/{model.joblib, card.json}
supabase/migrations/0001_init.sql …
.github/workflows/{ci.yml, tick-backup.yml, nightly.yml}
```

---

## 3. External data APIs: exact endpoints and request budgets

### 3.1 USGS Water Data API (gauges): MVP

- **Base:** `https://api.waterdata.usgs.gov/ogcapi/v1/collections/{collection}/items`. dataretrieval 1.4.0 defaults to `v1` and says it was "checked 2026-09-22". Older docs show `v0`. **Make the version a config value.** `[V: code dataretrieval/waterdata/endpoints.py]`
- **Collections:** `continuous` (IV history, typically 15-min) and `latest-continuous` (the most recent value per time series). Others: `monitoring-locations`, `time-series-metadata`, `daily`, `peaks`, and the ratings STAC at `/stac/v0`. `[V: code]`, `[V: api.waterdata.usgs.gov/docs/ogcapi/migration]`
- **Parameters:**
  - `monitoring_location_id=USGS-08158700` (agency-site)
  - `parameter_code=00065` (gage height, ft) or `00060` (discharge, ft³/s)
  - `time=` as an RFC 3339 instant or interval, **or an ISO 8601 duration**
  - `properties=` to trim fields, `skipGeometry=true`, `limit` (max **50000**), `f=json`
  - `[V: api.waterdata.usgs.gov/ogcapi/v0/collections/continuous/schema]`, `[V: code requests.py: limit cap 50000]`
- **Multiple sites in one GET:** `continuous` and `latest-continuous` accept **comma-joined** values (`monitoring_location_id=USGS-A,USGS-B`). `monitoring-locations` and `combined-metadata` do **not**; they need POST with `Content-Type: application/query-cql-json` and a body like `{"op":"in","args":[{"property":"monitoring_location_id"},[...]]}`. `[V: code waterdata/utils.py WATERDATA_DIALECT, ogc/requests.py]`
- **`continuous` limits:** at most **3 years per request**. With no `time`, it returns the last year. It is "an early version… feature-complete". `[V: code time_series.py docstring]`
- **Auth and rate limits:**
  - Header **`X-Api-Key: <key>`**, from the free signup at `https://api.waterdata.usgs.gov/signup/`. dataretrieval reads env **`API_USGS_PAT`**. `[V: code transport/http.py, _configuration_core.py]`
  - **50 req/h per IP without a key, 1,000 req/h with a key.** Responses carry `X-RateLimit-Limit` and `X-RateLimit-Remaining`; going over returns 429 with `Retry-After`. `[V: api.waterdata.usgs.gov/docs/ogcapi/keys/, waterdata.usgs.gov/blog/api-whats-new-wdfn-apis]`
- **Legacy service timeline:** WaterServices (`/nwis/iv`) has **deliberate slowdowns and outages starting January 2027 and shuts down Feb 22, 2027**. `[V: waterservices.usgs.gov]` *This corrects the v4 doc, which said degradation starts in Nov 2026.* Building on the new API is still the right call.
- **History:** "continuous provides the full period of record" `[V-search snippet, api.waterdata.usgs.gov]`. The legacy IV service went back to Oct 1, 2007, so the 2013 and 2015 storms should be covered. Confirm per site with `time-series-metadata` (`begin`/`end`).
- **Live ingest per tick:**
  - **1 request** to `latest-continuous` for all linked gauges: `parameter_code=00065`, `properties=monitoring_location_id,parameter_code,time,value,approval_status,qualifier,last_modified`.
  - **1–2 requests** to `continuous` with `time=PT3H` (comma-joined sites, split if the URL gets past ~6 KB), to backfill any gaps.
  - Upserts are idempotent on `(gauge_id, param_code, obs_time)`.
  - That is ≈ 36 req/h, under 4% of the keyed quota.
- **Data latency (critical for honest lead time):** many gauges report 15-min values but send them less often (for example hourly by satellite) `[U]`.
  - **Record `received_at` for every reading** (the first time our ingest saw it). Compute `latency = received_at − obs_time` per gauge.
  - Store the gauge's **P75 latency** in `gauges.latency_p75_min`.
  - Replay uses `available_at = obs_time + latency_p75` (§5.2), so replayed lead times are not inflated by perfect data delivery.
- **Example (live):**
```
GET https://api.waterdata.usgs.gov/ogcapi/v1/collections/latest-continuous/items
    ?f=json&skipGeometry=true&parameter_code=00065
    &monitoring_location_id=USGS-08158700,USGS-08154700,USGS-08155300
    &properties=monitoring_location_id,parameter_code,time,value,approval_status,qualifier
X-Api-Key: ${USGS_API_KEY}
```
- **Example (storm backfill, offline):** `waterdata.get_continuous(monitoring_location_id=[...], parameter_code="00065", time="2015-05-23T00:00:00Z/2015-05-27T00:00:00Z")` returns `(DataFrame, metadata)`, which you save to `data/storms/memorial-day-2015/readings.parquet`. `[V: code]`

### 3.2 USGS NLDI (river network): offline, precomputed

- **Base:** `https://api.water.usgs.gov/nldi` `[V: code pynhd/nldi.py]`
- **Snap a point to a catchment or flowline:**
  - `GET /linked-data/comid/position?coords=POINT(lon lat)` (point-in-catchment)
  - `GET /linked-data/hydrolocation?coords=POINT(lon lat)` (nearest flowline with a `measure` %)
  - `[V: code]`
- **Upstream gauges:** `GET /linked-data/comid/{comid}/navigation/UT/nwissite?distance=<km>`. `distance` is **required**, 1–9999 km. Navigation modes: UM, UT, DM, DD. `[V: code pynhd navigate_byid; api.water.usgs.gov/docs/nldi/navigation]`
- **Basin polygon:** `GET /linked-data/comid/{comid}/basin` (or `/nwissite/USGS-xxxx/basin`, with `splitCatchment=true`). `[V: code]`
- **Python:** `NLDI().comid_byloc((lon, lat))`, `.navigate_byid("comid", comid, "upstreamTributaries", "nwissite", distance=100)`, `.get_basins(...)`. `[V: code]`
- **Pitfall:** NLDI is catchment-indexed, so it can include flowlines slightly up- or downstream of the exact point `[V: api.water.usgs.gov/docs/nldi]`. **Check every snap on a map** and keep `crossings.snap = 'override'` with a manual comid.

### 3.3 Crossing locations and official status

- **City of Austin "Low Water Crossings That Flood" / `INLANDWATERS_flood_low_water_crossings`.** The data.austintexas.gov id `q6kt-v2zm` is gate locations (about 22 rows in one mirror), available as CSV and JSON. `[V: catalog.data.gov/dataset/inlandwaters_flood_low_water_crossings]` Socrata JSON (`https://data.austintexas.gov/resource/q6kt-v2zm.json`) is the standard Socrata pattern `[U]`.
- **Travis County Public Works ArcGIS layer:** `https://gis.traviscountytx.gov/server1/rest/services/Public_Works/Low_Water_Crossings/MapServer`. Query it with the standard ArcGIS REST pattern `…/MapServer/<layer>/query?where=1%3D1&outFields=*&f=geojson`. The layer id is `[U]`. `[V: server exists per search]`
- **ATXfloods live status:** **no documented public API was found.**
  - The site is `atxfloods.com/crossings` (HTML).
  - An old ctxfloods issue mentions `/xml` and `/waze/feed`; that is about 8 years old `[U]`.
  - A Williamson County ArcGIS mirror exists at `gis.wilco.org/arcgis/rest/services/OEM/ATXFloods/MapServer`; whether it is current is `[U]`.
  - **Decision:** build `OfficialStatusSource` as pluggable and best-effort. If no feed works, the state is `unknown`.
  - Email the City (§8 checklist in the concept doc) to ask for feed access.
  - **Never scrape** in a way that breaks the site's terms.
  - Also keep `official_status` with `source='manual'` for demo-time overrides, and show "source: manual" in the UI.

### 3.4 Expo Push API

- **Send:** `POST https://exp.host/--/api/v2/push/send` (≤**100** messages per request).
- **Receipts:** `POST https://exp.host/--/api/v2/push/getReceipts`. The docs cap this at 1000 ids per request; the official Node SDK uses **300**, so use 300.
- **Headers:** `Authorization: Bearer <EXPO_ACCESS_TOKEN>` (when enhanced push security is on), `Content-Encoding: gzip`, `Accept-Encoding: gzip`.
- `[V: code expo-server-sdk 7.2.0 ExpoClientValues.js, ExpoClient.js]`
- **Rate limit:** **600 notifications/s per project**. Receipts are cleared after **24 h**; check them about 15 min after sending. Payload must be ≤ 4 KiB. `[V: docs.expo.dev/push-notifications/sending-notifications, /faq]`
- **Message fields:** `to, title, subtitle, body, data, sound, ttl, expiration, priority('default'|'normal'|'high'), interruptionLevel('active'|'critical'|'passive'|'time-sensitive'), badge, channelId, categoryId, mutableContent, collapseId, tag, threadId, contentAvailable`. `[V: code ExpoClient.d.ts]`
- **Receipt errors:** `DeviceNotRegistered | MessageTooBig | MessageRateExceeded | InvalidCredentials | ProviderError | DeveloperError | ExpoError`. `[V: code]`
- **iOS `time-sensitive`** needs the Time Sensitive Notifications capability (entitlement) `[U]`. **Do not use `critical`**; it requires Apple approval `[U]`.

### 3.5 OpenRouteService (detours): Stretch

- `POST https://api.openrouteservice.org/v2/directions/driving-car/geojson` with `{"coordinates":[[lon,lat],[lon,lat]], "options":{"avoid_polygons": <GeoJSON Polygon|MultiPolygon>}}`. `[V: code openrouteservice-js README + base URL]`
- `avoid_features` includes **`"fords"`**, which is a nice tie-in. `[V: code README "avoidables: [..., 'fords']"]`
- The free quota (about 2,000 directions/day, 40/min) is `[U]`. Cache detours per (origin, destination, avoid-set hash) for 10 min.

### 3.6 Stretch and roadmap sources

- **MRMS radar QPE:**
  - AWS Open Data bucket `noaa-mrms-pds`, product `MultiSensor_QPE_01H_Pass2`, `RadarOnly_QPE_01H`. GRIB2 read with `cfgrib` 0.9.15.1 + `xarray`. `[U paths]`
  - MRMS became operational around 2014 `[U]`, so the Oct 2013 storm may need Stage IV instead.
  - Average over each crossing's NLDI basin polygon.
- **NOAA NWPS API:** `https://api.water.noaa.gov/nwps/v1/gauges/{lid}` and `/stageflow` give NWM short-range forecasts and NWS flood categories and impacts. `[U paths]` Useful for "road floods at X ft" impact stages.
- **LCRA Hydromet:** roadmap. Terms of use and API are `[U]`.

---

## 4. Forecasting method (the core science)

### 4.1 What the literature says, and what it means for FordCast

- **There is no published ML system that forecasts low-water-crossing overtopping in Texas from upstream gauges.** The closest work:
  - Dallas: a road-segment flash-flood risk model combining Waze, historical vulnerability, and graph flood spreading. XGBoost had the best precision and RF the best recall. [V: sciencedirect.com/science/article/pii/S0022169424008011]
  - Harris County: road-inundation ML from crowdsourced reports and traffic data. RF was best and precipitation the top feature. [V: researchgate.net/publication/354219832]
  - NWM + Kalman-filter data assimilation forecasting **site-level bridge impacts** at 12-h horizons. It notes that operational low-water-crossing alerts are "largely limited to sensor-equipped sites". [V: nature.com/articles/s44304-025-00116-0]
  - **Implication:** gauge-to-crossing travel-time forecasting at minute scale is a real, defensible gap. Say "I'm not aware of a system that does this per crossing", not "first ever".
- **The National Water Model in the Hill Country struggles in small, steep, flashy basins.** The July 2025 Guadalupe evaluation found much of the Hunt peak came from the **ungauged** South Fork. [V: egusphere.copernicus.org/preprints/2026/egusphere-2026-1847; nhess.copernicus.org/articles/26/4753/2026] Earlier WRF-Hydro tests flagged uncertainty at local scales and in radar QPE. [V: comet.ucar.edu …/1623463.pdf]
  - **Implication:** use NWM only for the hours-ahead "outlook" roadmap. Minute-scale lead time comes from observed upstream gauges.
- **HAND / synthetic rating curves** exist statewide at 3 m (287,535 reaches) [V: web.corral.tacc.utexas.edu/nfiedata/pin2flood/texas/]. They compare well with HEC-RAS and gauges after adjustment on the Blanco River [V: impact.ornl.gov …/river-channel-geometry-and-rating-curve-estimation…]. **However, culverts and road embankments at crossings are where HAND is weakest** (no source found that handles them).
  - **Implication:** Roadmap only, as a way to estimate an "overtop stage" for crossings that have no ground truth.
- **Verification vocabulary (NWS):** the 2×2 contingency table. **POD** = H/(H+M), **FAR** = F/(H+F), **CSI** = H/(H+M+F). Lead time is reported separately in minutes. [V: weather.gov/media/directives …10-1601; cawcr.gov.au/projects/verification]
- **Hydraulic sanity bound:** the flood-wave celerity for a wide channel under Manning is about (5/3)·V (kinematic wave) `[U textbook]`. Use it as a plausibility filter, c ∈ [0.5, 6] m/s.

### 4.2 Crossing tiers (honesty built into the data model)

| Tier | Definition | Model | UI label |
|---|---|---|---|
| **A: validated** | Has ground truth: its own sensor, a USGS gauge at the road, or an ATXfloods history, **plus** a known overtop stage | Rule + ML, full backtest | Normal |
| **B: linked, not validated** | Has NLDI upstream gauge(s) but no ground truth | Rule with transferred parameters (§4.5, Tier B transfer) | Badge "Estimated" (`validated=false`) |
| **C: not monitored** | No upstream gauge | Official status only | **Unknown: not monitored by FordCast** (reason `NO_UPSTREAM_GAUGE`) |

### 4.3 Ground truth (the labels)

- `overtop(t) = target_stage(t) ≥ overtop_stage_ft`. The target is the gauge at or next to the crossing. `overtop_stage_ft` comes from, in order:
  1. NWS flood-impact statements ("road floods at X ft") `[U availability per gauge]`
  2. City or County data
  3. A **documented proxy** (the gauge's NWS action stage, or P99 of its record), tagged `truth_quality='proxy'` and reported separately.
- **Overtop episodes:** contiguous runs of `overtop=1`. Merge gaps under 60 min. `onset` = the first timestamp of the run. Store them in `ground_truth_events`.
- **The truth table is never readable from the pipeline module** (enforced by a test, §5.3).

### 4.4 Linking: which gauge is truly upstream

```python
# fordcast/linking/nldi.py  (offline; results → crossing_gauge_links)
def link_crossing(c, nldi, max_km=60):
    comid = c.comid_override or nldi.comid_byloc((c.lon, c.lat)).comid[0]           # snap
    ups = nldi.navigate_byid("comid", comid, "upstreamTributaries", "nwissite", distance=max_km)
    links = []
    for g in ups.itertuples():                                       # gauges that DRAIN to the crossing
        links.append(Link(c.id, f"USGS-{g.identifier.removeprefix('USGS-')}", relation="upstream",
                          channel_dist_km=g.navigation_distance_km))  # [U] exact column name; compute from flowlines if absent
    links += [nearest_gauge_by_euclid(c, relation="nearest_baseline")]  # kept ONLY for the Q4 comparison
    return links
```
- **Filter:** keep gauges that have parameter `00065` with continuous data that covers the training storms (`time-series-metadata` begin ≤ storm start).

### 4.5 Travel time τ by cross-correlation (verified in the prototype)

**Algorithm (per link, per storm):**
1. Put both series on a **5-min clock**. Interpolate linearly within gaps of 30 min or less; otherwise leave NaN and drop that window.
2. `d = diff(stage)`, then a centered rolling mean over 3 steps, then **clip(lower=0)** so only the rising limb counts.
3. Compute the normalized cross-correlation `r(k)` for lags k = 0 … 240 min.
4. Pick `k* = argmax r`. **Reject** the result if `r(k*) < 0.5`.
5. **Refine with a parabola** through r(k*−1), r(k*), r(k*+1): `k̂ = k* + ½·(r₋−r₊)/(r₋−2r₀+r₊)`.
6. **Combine across storms:** τ = **median**, window = **[P25, P75]**, `n_storms`. Flag the link if IQR > 0.5·τ.
7. **Physical sanity:** require `channel_dist_km·1000 / (τ·60) ∈ [0.5, 6] m/s`. Otherwise flag it `needs_review`.
8. **Cross-checks** (logged, not used): peak-to-peak lag and threshold-crossing lag.

**Prototype result on synthetic storms with true lags 35/40/45/40 min:** estimates were 34.9/40.3/45.3/39.7 (r=0.99) `[V: code]`. Without smoothing and parabolic refinement the error was ±10 min. **Keep both steps.**

**Tier B transfer:** τ_B = channel_dist_km / ĉ, where ĉ is the median celerity learned on tier-A links in the same HUC10 `[U HUC availability; else region-wide]`. Use a window of ±40%.

### 4.6 Trigger-stage learning

```text
for each link (g → crossing c) with tier A:
    baseline_g = median stage of g over the 24 h before each storm's first rise
    candidates = quantiles of g's stage within storm windows: q in linspace(0.50, 0.995, 40)
    for h in candidates:
        alerts = { t : S_g(t) crosses h upward AND rise30_g(t) > r_min (0.10 ft) }   # upward crossings only
        score(h) = event-F2 over training storms, with lead window [0, 180] min      # F2 favors POD
                   subject to FAR ≤ 0.5
    h*      = argmax score; tie → lower h (more lead)
    watch_h = baseline_g + 0.6·(h* − baseline_g)
    store trigger_stage_ft = h*, watch_stage_ft = watch_h, min_rise_ft_30m = r_min, train_csi
```
- **Final reported numbers come from leave-one-storm-out (LOSO)**: re-learn h* without the scored storm.

### 4.7 Baseline rule (MVP, "Built")

```python
def rule_raw_state(c, links, series_by_gauge, now, official) -> RawRisk:
    if official.status == "closed":                       return RawRisk(FLOODED, reason="OFFICIAL_CLOSED")
    tgt = series_by_gauge.get(c.target_gauge_id)
    if tgt and fresh(tgt, now) and tgt.latest >= c.overtop_stage_ft:
                                                          return RawRisk(FLOODED, reason="WATER_AT_ROAD")
    usable = [(l, s) for l, s in pairs(links, series_by_gauge) if fresh(s, now, l.gauge.stale_after_min)]
    if not usable:                                        return RawRisk(UNKNOWN, reason="DATA_STALE")
    etas, watch = [], []
    for l, s in usable:
        r30 = s.rise(minutes=30)                          # ft over last 30 min, from data AVAILABLE at now
        if s.latest >= l.trigger_stage_ft and r30 > l.min_rise_ft_30m:
            t_cross = s.last_upcrossing_time(l.trigger_stage_ft)
            eta = max(l.lag_min - minutes(now - t_cross), 0)
            etas.append((eta, l))
        elif s.latest >= l.watch_stage_ft and r30 > 0.2:
            watch.append(l)
    if etas:
        eta, l = min(etas, key=lambda e: e[0])
        lo, hi = bucket(eta - (l.lag_min - l.lag_p25_min), eta + (l.lag_p75_min - l.lag_min))
        return RawRisk(AVOID, window=(lo, hi), reason="UPSTREAM_ABOVE_TRIGGER", gauge=l.gauge_id)
    if watch:                                             return RawRisk(WATCH, reason="UPSTREAM_RISING")
    return RawRisk(NO_SIGNAL)
```
- **`bucket()`** maps to fixed display windows: **"now–15 min", "15–30", "30–60", "60–90"**. Never minute countdowns.
- **`fresh()`:** obs age ≤ `stale_after_min` (default 60; 30 for gauges that transmit every 15 min).

### 4.8 ML model (Stretch, "Prototype" until it beats the rule in LOSO)

- **Unit of prediction:** (crossing, t) on a 15-min grid (the native USGS interval) for training. Live scoring runs every 5 min.
- **Labels:** `y_h(t) = 1` if an overtop onset happens in (t, t+h] for h ∈ {30, 60, 90}. **Drop samples where the crossing is already overtopped at t**, because that state is FLOODED by rule.
- **Features (all computed with `as_of=t` from data with `available_at ≤ t`):**

| Group | Features (k = top-3 upstream links by τ; NaN-padded, and HGB handles NaN natively) |
|---|---|
| Upstream stage | `g{k}_stage_rel = (S − baseline)/(h* − baseline)`, `g{k}_above_trigger` |
| Rate of rise | `g{k}_rise_{15,30,60,120}` (ft), `g{k}_max_rise30_last2h` |
| Timing | `g{k}_tau_min`, `g{k}_tsince_trigger_minus_tau` (min; NaN if no crossing) |
| Target | `tgt_stage_rel`, `tgt_rise_30` (if a target gauge exists) |
| Rain (stretch) | `qpe_basin_{1,3,6}h`, `qpe_max15` (MRMS), `qpe_7d` (antecedent) |
| Antecedent / base | `g1_stage_24h_ago_rel` |
| Calendar | `hour_sin, hour_cos, doy_sin, doy_cos` |

- **Training sample:** every step inside storm windows (first rise −12 h → last onset +12 h), plus a **random 5% of calm days** with `sample_weight = 20` so base rates stay true. **No SMOTE** (it distorts calibration).
- **Model:**
```python
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.frozen import FrozenEstimator            # sklearn ≥1.6; cv="prefit" is gone   [V: code 1.9.1]
base = HistGradientBoostingClassifier(
    max_iter=300, learning_rate=0.05, max_leaf_nodes=15, min_samples_leaf=50,
    l2_regularization=1.0, early_stopping=False,      # built-in early stopping uses a RANDOM split → leaks within storms
    monotonic_cst=MONO,                               # +1 for stage_rel/rises/qpe, 0 otherwise
    random_state=0)
base.fit(X_fit, y_fit, sample_weight=w_fit)           # fit storms only
method = "isotonic" if y_cal.sum() >= 200 else "sigmoid"   # isotonic overfits with few positives
cal = CalibratedClassifierCV(FrozenEstimator(base), method=method).fit(X_cal, y_cal)   # held-out CAL storm(s)
```
- **One model per horizon (30/60/90).** Then enforce `p30 ≤ p60 ≤ p90` with a cumulative max.
- **Cross-validation:** **LOSO** when there are 8 or fewer storms (likely), otherwise `GroupKFold(n_splits=5)` grouped by `storm_id`. Inside each training fold, hold out the **latest** training storm for calibration. Pick `max_iter` by inner grouped CV.
- **Decision thresholds** come from OOF predictions:
  - AVOID if `p60 ≥ θ_A`, with θ_A maximizing CSI subject to POD ≥ 0.8.
  - WATCH if `p90 ≥ θ_W`, with θ_W maximizing F2.
  - Window from the horizons: p30 ≥ θ_A → "now–30"; p60 → "30–60"; else "60–90". The rule's ETA window wins when both fire.
- **Combining (safety principle: only adds caution):** `final = max(rule_state, ml_state, official_state)`, where FLOODED > AVOID > WATCH > NO_SIGNAL. UNKNOWN wins over NO_SIGNAL. Official "open" **never lowers** the model state.
- **Model card** at `models/<v>/card.json` holds: training storms, n positives, LOSO metrics, thresholds, feature list, git sha, and data hashes.
- **Prototype check** (synthetic, 8 storms, GroupKFold + FrozenEstimator calibration): OOF Brier 0.113 vs climatology 0.207, reliability within ±0.02 per quantile bin, SHAP OK `[V: code]`.

### 4.9 Verification protocol (produces the README and video numbers)

- **Alert episodes:** contiguous runs of the **state-machine output** at ≥ WATCH, and separately at ≥ AVOID. Do this after hysteresis, exactly what users would have seen.
- **Hit:** an episode starts in `[onset − 180 min, onset]`. **Lead** = onset − first alert start. A start after onset is a miss.
- **Miss:** an onset with no qualifying episode.
- **False alarm:** an episode with no onset within `[start, start + max(τ_p75 + 60, 120) min]`.
- **Report** per storm and pooled: **H, M, F, POD, FAR, CSI, median lead (IQR), % hits with lead ≥ 15 min**, plus **false alarms per crossing per 100 calm days** (this is the trust metric).
- **Comparators:** ① reactive/ATXfloods (lead = 0 by definition), ② **nearest-gauge rule**, ③ **upstream rule**, ④ ML. Use **bootstrap CIs** with 1,000 resamples of storms.
- **Probabilistic scores (ML):** Brier, **Brier skill score** vs climatology, **reliability diagram** `calibration_curve(y, p, n_bins=10, strategy="quantile")` saved to `docs/figures/reliability_p60.png`. `[V: code sklearn]`
- **The prototype scorer** `event_metrics(alerts, onsets)` is in `scratchpad/be_proto/proto.py` and has been tested.

### 4.10 Hysteresis / anti-flapping state machine (verified in the prototype)

```python
DOWN_TICKS = {AVOID: 6, WATCH: 12, FLOODED: 6}         # 30 / 60 / 30 min at 5-min ticks
def step_state(tr, raw, now):
    if raw == UNKNOWN:                     return Tracker(UNKNOWN, now, 0)     # never hide missing data
    if tr.state == UNKNOWN or raw > tr.state: return Tracker(raw, now, 0)      # escalate immediately
    if raw == tr.state:                    return replace(tr, calm_ticks=0)
    calm = tr.calm_ticks + 1                                                    # raw < current
    if calm >= DOWN_TICKS[tr.state]:       return Tracker(max(raw, tr.state - 1), now, 0)  # ONE level down
    return replace(tr, calm_ticks=calm)
```
- **Extra rules:**
  - FLOODED from an official closure holds until the official source reopens it **and** 6 calm ticks pass.
  - AVOID→WATCH also needs the triggering gauge to be **falling** (rise30 < 0) and below `h* − 0.5 ft`.
  - Persist `Tracker` per crossing in `private.risk_tracker` (`state`, `calm_ticks`, `since`) so a restart doesn't reset hysteresis.
- **Prototype trace:** UNKNOWN (no data had arrived yet, because of the 10-min latency) → NO_SIGNAL → WATCH 18:10 → AVOID 18:45 → WATCH 20:40 → NO_SIGNAL 21:40. Each step goes down one level with dwell `[V: code]`.

### 4.11 "Why this alert" explanations (UI reasons)

- **The rule produces structured reasons:** `{"code":"UPSTREAM_ABOVE_TRIGGER","gauge_id":"USGS-08158700","gauge_name":"Onion Ck nr Driftwood","value_ft":9.4,"rise_ft_30m":3.1,"tau_min":40}`.
- **ML:** `shap.TreeExplainer(base)` over the **uncalibrated** base model (log-odds; isotonic and sigmoid are monotone, so rankings are preserved) `[V: code]`. Take the top 3 positive contributors and map feature names to reason codes.
- **Templates (EN/ES), rendered on the client** from `code` + params:
  - `UPSTREAM_ABOVE_TRIGGER` → EN "{gauge}: +{rise} ft in 30 min (upstream, ~{tau} min away)" / ES "{gauge}: +{rise} pies en 30 min (río arriba, a ~{tau} min)"
  - `UPSTREAM_RISING` → EN "Water rising upstream at {gauge}" / ES "El agua sube río arriba en {gauge}"
  - `RAIN_OVER_BASIN` → EN "{qpe} in of rain over this creek's basin in 1 h" / ES "{qpe} pulg. de lluvia en la cuenca en 1 h"
  - `WATER_AT_ROAD` / `OFFICIAL_CLOSED` / `DATA_STALE` / `NO_UPSTREAM_GAUGE`
- **Never show raw SHAP numbers or "% safe".**

---

## 5. Storm Replay engine

### 5.1 Interfaces (one pipeline, swappable sources)

```python
class Clock(Protocol):
    def now(self) -> datetime: ...
class LiveClock:  now = staticmethod(lambda: datetime.now(UTC))
class ReplayClock:                                   # sim_time = start + (wall_elapsed × speed); speed ∈ {1,10,30,60,120}
    def __init__(self, start, step=timedelta(minutes=5)): ...
    def advance(self): self._t += self.step          # batch builder steps deterministically; no wall clock

class DataSource(Protocol):
    async def series(self, gauge_ids: Sequence[str], param: str, as_of: datetime,
                     lookback: timedelta) -> dict[str, list[Reading]]: ...
class OfficialStatusSource(Protocol):
    async def status(self, crossing_ids, as_of) -> dict[str, OfficialStatus]: ...

async def tick(now, source: DataSource, official: OfficialStatusSource, state: StateStore,
               model: RiskModel) -> TickResult:     # IDENTICAL for live and replay
    series = await source.series(all_linked_gauges, "00065", as_of=now, lookback=timedelta(hours=6))
    off    = await official.status(crossing_ids, as_of=now)
    raws   = {c.id: model.raw(c, links[c.id], series, now, off.get(c.id)) for c in crossings}
    return state.apply(raws, now)                    # hysteresis + transitions
```
- **Live:** `LiveUSGS` (DB readings fed by ingest) and `LiveOfficial`.
- **Replay:** `StormReplaySource(parquet)` and `ReplayOfficial` (historic closures **only** if timestamped records exist; otherwise empty, and labelled as such).
- **Truth is never an input.**

### 5.2 Strict no-lookahead enforcement

- **Every `Reading` has `obs_time` and `available_at`.**
  - Live: `available_at = received_at`.
  - Replay: `available_at = obs_time + gauge.latency_p75_min` (default 15 min if unmeasured, shown in the replay header: "assumes 15-min data delay").
- **`StormReplaySource.series()`** bisects on `available_at` and **asserts** that every returned reading has `available_at ≤ as_of` and `obs_time ≤ as_of`, raising `LookaheadError` otherwise. `[V: code prototype]`
- **The feature code only receives the filtered series.** No global DataFrames are reachable from `features.py` (a code-review rule). The truth-import test in §5.3 guards the most dangerous leak.
- **Training features use the same `features.py` functions with `as_of=t`.** No `shift(-k)` anywhere except label construction, which lives in `eval/labels.py` and is banned from `pipeline/` imports.

### 5.3 Tests that prove no lookahead (both passing in the prototype)

```python
def test_prefix_invariance(storm):              # gold standard
    full  = run_replay(StormReplaySource(storm.readings), storm.start, storm.end)
    cut   = storm.start + (storm.end - storm.start) / 2
    trunc = run_replay(StormReplaySource([r for r in storm.readings if r.obs_time <= cut]), storm.start, cut)
    assert full[:len(trunc)] == trunc           # deleting the future must not change any past frame

def test_future_poison_is_invisible(storm):
    cut = storm.start + timedelta(hours=9)
    poison = Reading("G1", cut + timedelta(minutes=5), 99.0, available_at=cut + timedelta(minutes=15))
    assert run_replay(StormReplaySource(storm.readings + [poison]), storm.start, cut) == \
           run_replay(StormReplaySource(storm.readings), storm.start, cut)

def test_source_rejects_lookahead():            # unit: a buggy source must raise
    with pytest.raises(LookaheadError): BadSource(...).series(["G1"], "00065", as_of=t0, lookback=H6)

def test_pipeline_cannot_import_truth():        # static
    import ast, pathlib
    for p in pathlib.Path("src/fordcast").rglob("*.py"):
        if "eval" in p.parts: continue
        assert "ground_truth" not in p.read_text() and "eval.labels" not in p.read_text()
```

### 5.4 Determinism and golden files

- Fixed step (300 s). Sorted gauge and crossing order. `random_state=0`. Probabilities rounded to 3 decimals. JSON dumped with `orjson.OPT_SORT_KEYS`.
- The replay header records `pipeline.git_sha`, `model_version`, `data_sha256` (of the input Parquet), and `timeline_sha256`.
- **CI regenerates each timeline and asserts the sha256 matches the committed one.** That proves the app's demo data came out of the real pipeline.

### 5.5 Precomputed timeline format (`fordcast.replay.v1`, bundled in app + Storage)

```json
{
  "schema": "fordcast.replay.v1",
  "storm": {"id": "memorial-day-2015", "name_en": "Memorial Day Flood", "name_es": "Inundación del Día de los Caídos",
            "start": "2015-05-23T12:00:00Z", "end": "2015-05-26T00:00:00Z", "tz": "America/Chicago",
            "headline_event": "2015-05-23T21:30:00Z"},
  "step_s": 300,
  "assumptions": {"data_delay_min": 15, "official_status": "not available for this storm"},
  "pipeline": {"git_sha": "abc1234", "model_version": "rule-2026.10.20", "data_sha256": "…", "generated_at": "…"},
  "gauges": [{"id": "USGS-08158700", "name": "Onion Ck nr Driftwood", "lon": -98.0, "lat": 30.1,
              "t0": "2015-05-23T12:00:00Z", "dt_s": 900, "stage_ft": [3.1, 3.1, 3.2], "avail_delay_s": 900,
              "trigger_ft": 9.0, "watch_ft": 6.4}],
  "crossings": [{"id": "atx-081", "name": "…", "lon": -97.8, "lat": 30.2, "tier": "A"}],
  "links": [{"crossing_id": "atx-081", "gauge_id": "USGS-08158700", "tau_min": 40, "tau_p25": 35, "tau_p75": 46,
             "flowline": [[-98.0, 30.1], [-97.9, 30.15], [-97.8, 30.2]]}],
  "events": [{"t": "2015-05-23T18:10:00Z", "crossing_id": "atx-081", "state": "watch", "p": [0.1, 0.3, 0.5],
              "window": [60, 90], "reasons": [{"code": "UPSTREAM_RISING", "gauge_id": "USGS-08158700", "rise_ft_30m": 2.1}]}],
  "truth": [{"crossing_id": "atx-081", "onset": "2015-05-23T19:25:00Z", "end": "2015-05-24T02:00:00Z", "quality": "gauge"}],
  "metrics": {"pod": 0.0, "far": 0.0, "csi": 0.0, "median_lead_min": 0, "n_events": 0, "comparators": {"nearest_gauge": {}}},
  "storyboard": [{"t": "2015-05-23T18:10:00Z", "en": "Upstream gauge +2.1 ft in 30 min", "es": "…"}]
}
```
- **Store state-change events only.** States are step functions, so 864 frames do not need to be duplicated.
- **Expected size:** about 40–150 KB raw, about 15–40 KB gzipped per storm. **`metrics` and `storyboard` are generated by code**, never typed by hand.

### 5.6 How the app animates the timeline

- **Sim clock (Reanimated shared value):** `simT = t_start + (now − wallStart)·speed`.
  - Controls: pause, scrub, and speed **1×/10×/30×/60×/120×**.
  - **"Jump to next event"** (a 72-h storm at 60× still takes 72 min).
  - **"Skip to action"** jumps to 30 min before the first WATCH.
- **Crossing state at simT:** a per-crossing binary search for the last event with t ≤ simT. Before the first event, use `no_signal`; before any data is available, use `unknown`. **States are never interpolated.**
- **Gauge sparkline:** draw only samples with `t + avail_delay_s ≤ simT` (exactly what the model knew). Interpolate linearly between drawn samples.
  - Optional **"Reveal truth"** toggle after the storm: a dotted future line plus the observed overtop marker.
- **Water pulse:** for each active link with an upcrossing at `t_x`, animate a cyan dot along `links[].flowline` at progress `clamp((simT − t_x)/τ, 0, 1)`. It reaches the road icon around when the truth onset is.
- **Lead-time banner:** when simT passes `truth.onset`, show "**FordCast: AVOID 40 min earlier**". The number is `onset − first AVOID event`, computed from the same JSON as `metrics`.

---

## 6. Architecture diagrams

### 6.1 Tick sequence (every 5 min)

```
pg_cron ─POST /internal/tick (X-Tick-Secret)─► FastAPI ──202──► (pg_net response stored 6h)
                                                │ background task
 1 acquire lease (UPDATE private.tick_lease … WHERE lease_until<now() AND last_ok_at<now()-'4 min' RETURNING)
 2 ingest: httpx GET latest-continuous (1 req) + continuous time=PT3H (1–2 req) ── tenacity 3× expo-jitter, 10s timeout
 3 upsert readings (ON CONFLICT DO NOTHING; set received_at)            ── psycopg executemany
 4 official status fetch (best effort, 5s timeout)                      ── failures → 'unknown'
 5 pipeline.tick(now, LiveSource(db), official, state, model)           ── same code as replay
 6 write: risk_current (only meaningful changes) · risk_transitions · risk_history keyframe (hourly)
 7 snapshot: build current.json → Storage upsert (cache-control 30, application/json)
 8 push fan-out for transitions (§9) · receipts for tickets ≥15 min old
 9 ingest_runs row (status, counts, durations) · release lease (last_ok_at=now()) · GET hc-ping.com/<uuid>
 on any exception: Sentry capture · ingest_runs.status='error' · hc-ping /fail · lease expires on its own
```
- **Step 3 detail:** `ON CONFLICT DO NOTHING` keeps the first `received_at`, which is correct for measuring latency. Later revisions to provisional values are ignored live; the backtest uses the archived Parquet.
- **Step 7, exact supabase-py call** (storage3 2.32.0; the default `cache-control` is 3600, which would freeze the map for an hour `[V: code]`):
```python
await sb.storage.from_("public").upload(
    "snapshots/current.json", orjson.dumps(snapshot),
    {"cache-control": "30", "content-type": "application/json", "upsert": "true"})
await sb.storage.from_("public").upload(f"snapshots/{snapshot['seq']}.json", orjson.dumps(snapshot),
    {"cache-control": "31536000", "content-type": "application/json"})   # OPTIONAL, hourly only: ~720 files/mo ≈ 10 MB of the 1 GB Storage quota
```

### 6.2 Data flow (offline → live → app)

```
OFFLINE (notebooks / CLI, run once + re-run when storms added)
 City/County crossings ─► snap (NLDI) ─► upstream gauges ─► backfill storms (dataretrieval) ─► Parquet
                           └─► travel_time.py ─► triggers.py ─► (ML) train.py ─► models/<v>/ + crossing_gauge_links
                                                     └─► replay/build.py ─► replays/<storm>.json(.gz) ─► app bundle + Storage
LIVE
 USGS ─► readings ─► pipeline ─► risk_current ─► Realtime (postgres_changes) ─► app (foreground)
                                   ├─► snapshot current.json (Storage CDN) ─► app (poll 60 s fg / bg fetch)
                                   └─► risk_transitions ─► push fan-out ─► Expo ─► APNs/FCM ─► app (background)
 App on-device: SQLite cache · geofences (≤20 iOS) ranked locally from snapshot · Drive Mode TTS
```

---

## 7. Data model (Supabase Postgres + PostGIS)

### 7.1 Size budget (500 MB limit), computed

| Table | Volume | Size | Policy |
|---|---|---|---|
| `readings` | 40 gauges × 2 params × 96/day = 7,680 rows/day | 30 d ≈ 20 MB · 45 d ≈ 30 MB · 365 d ≈ 240 MB | **Keep 45 days.** Storm history lives in Parquet in the repo or Storage. |
| `risk_history` | Every tick: 70 × 288 × 30 = 605k rows ≈ 100 MB/month ✗ | Changes + **hourly** keyframes, 60 d ≈ 17 MB | Delete after 60 days |
| others | small | < 5 MB | none |

### 7.2 DDL (migration `supabase/migrations/0001_init.sql`)

```sql
-- Extensions: enable PostGIS; enable Cron (pg_cron) + pg_net via Dashboard → Integrations → Cron.
create extension if not exists postgis with schema extensions;
create schema if not exists private;                        -- NOT exposed by PostgREST
revoke all on schema private from anon, authenticated;

create type public.risk_state     as enum ('unknown','no_signal','watch','avoid','flooded');
create type public.official_state as enum ('open','caution','closed','unknown');
create type public.link_relation  as enum ('upstream','at_site','nearest_baseline');
create type public.snap_status    as enum ('auto','verified','override');
create type public.crossing_tier  as enum ('A','B','C');

create table public.gauges (
  id                  text primary key,                     -- 'USGS-08158700'
  agency              text not null default 'USGS',
  name                text not null,
  geom                extensions.geography(Point,4326) not null,
  comid               bigint,
  drainage_km2        real,
  param_codes         text[] not null default '{00065}',
  stale_after_min     smallint not null default 60,
  latency_p75_min     smallint,                             -- measured live: received_at - obs_time
  is_active           boolean not null default true,
  updated_at          timestamptz not null default now()
);
create index gauges_geom_gix on public.gauges using gist (geom);

create table public.crossings (
  id                  text primary key,                     -- 'atx-081' / 'tc-0123'
  name                text not null,
  road                text,
  creek               text,
  jurisdiction        text not null,                        -- 'City of Austin' | 'Travis County'
  geom                extensions.geography(Point,4326) not null,
  comid               bigint,
  snap                public.snap_status not null default 'auto',
  tier                public.crossing_tier not null default 'C',
  target_gauge_id     text references public.gauges(id),
  overtop_stage_ft    real,
  truth_quality       text check (truth_quality in ('sensor','gauge','impact_statement','proxy')),
  source              text not null,                        -- 'coa:q6kt-v2zm' | 'travis:Low_Water_Crossings'
  source_ref          text,
  is_active           boolean not null default true,
  updated_at          timestamptz not null default now()
);
create index crossings_geom_gix on public.crossings using gist (geom);

create table public.crossing_gauge_links (
  crossing_id         text not null references public.crossings(id) on delete cascade,
  gauge_id            text not null references public.gauges(id) on delete cascade,
  relation            public.link_relation not null,
  channel_dist_km     real,
  lag_min             real,  lag_p25_min real,  lag_p75_min real,
  xcorr_r             real,
  n_storms            smallint,
  trigger_stage_ft    real,
  watch_stage_ft      real,
  min_rise_ft_30m     real not null default 0.10,
  train_csi           real,
  needs_review        boolean not null default false,
  model_version       text not null,
  primary key (crossing_id, gauge_id, model_version)
);
create index cgl_gauge_idx on public.crossing_gauge_links (gauge_id);

create table public.readings (
  gauge_id            text not null references public.gauges(id),
  param_code          char(5) not null,                     -- '00065' gage height ft, '00060' discharge cfs
  obs_time            timestamptz not null,
  value               real not null,
  approval            char(1) not null default 'P',         -- P provisional / A approved
  qualifiers          text[],
  received_at         timestamptz not null default now(),
  primary key (gauge_id, param_code, obs_time)
);
create index readings_obs_brin on public.readings using brin (obs_time);

create table public.risk_current (
  crossing_id         text primary key references public.crossings(id) on delete cascade,
  state               public.risk_state not null,
  p30 real, p60 real, p90 real,
  window_lo_min       smallint, window_hi_min smallint,
  reasons             jsonb not null default '[]'::jsonb,
  official            public.official_state not null default 'unknown',
  latest_obs_at       timestamptz,                          -- client computes data age
  changed_at          timestamptz not null,
  evaluated_at        timestamptz not null,
  model_version       text not null,
  seq                 bigint not null
);

create table public.risk_transitions (
  id                  bigserial primary key,
  crossing_id         text not null references public.crossings(id),
  from_state          public.risk_state not null,
  to_state            public.risk_state not null,
  at                  timestamptz not null,
  window_lo_min smallint, window_hi_min smallint,
  reasons             jsonb not null default '[]'::jsonb,
  seq                 bigint not null,
  pushed              boolean not null default false
);
create index rt_crossing_at_idx on public.risk_transitions (crossing_id, at desc);

create table public.risk_history (                          -- changes + hourly keyframes
  crossing_id         text not null references public.crossings(id),
  as_of               timestamptz not null,
  state               public.risk_state not null,
  p30 real, p60 real, p90 real,
  kind                text not null check (kind in ('change','keyframe')),
  primary key (crossing_id, as_of)
);

create table public.official_status (
  crossing_id         text not null references public.crossings(id),
  source              text not null,                        -- 'atxfloods' | 'travis' | 'manual'
  status              public.official_state not null,
  source_updated_at   timestamptz,
  fetched_at          timestamptz not null default now(),
  primary key (crossing_id, source)
);

create table public.storms (
  id                  text primary key,                     -- 'memorial-day-2015'
  name_en text not null, name_es text not null,
  start_time timestamptz not null, end_time timestamptz not null,
  description_en text, description_es text,
  timeline_path       text not null,                        -- storage path 'replays/memorial-day-2015.v3.json.gz'
  timeline_sha256     text not null,
  metrics             jsonb not null default '{}'::jsonb,
  model_version       text not null,
  pipeline_git_sha    text not null,
  is_featured         boolean not null default false,
  sort_order          smallint not null default 0
);

create table public.ground_truth_events (                   -- read by eval ONLY
  id bigserial primary key,
  crossing_id text not null references public.crossings(id),
  storm_id    text references public.storms(id),
  onset timestamptz not null, ended timestamptz,
  quality text not null, notes text
);

create table public.app_config (
  key text primary key, value jsonb not null, updated_at timestamptz not null default now()
);

-- PRIVATE (service role only) --------------------------------------------------
create table private.devices (
  id                  uuid primary key default gen_random_uuid(),
  secret_sha256       text not null,                        -- hash of random 32-byte device secret
  expo_push_token     text unique,
  platform            text not null check (platform in ('ios','android')),
  locale              text not null default 'en' check (locale in ('en','es')),
  tz                  text not null default 'America/Chicago',
  alerts_enabled      boolean not null default true,
  watch_alerts        boolean not null default true,
  quiet_start_min     smallint,                             -- minutes after local midnight, e.g. 1320 = 22:00
  quiet_end_min       smallint,
  app_version         text,
  push_failures       smallint not null default 0,
  created_at          timestamptz not null default now(),
  last_seen_at        timestamptz not null default now()
);

create table private.device_subscriptions (                 -- crossing IDs only; NO coordinates
  device_id   uuid not null references private.devices(id) on delete cascade,
  crossing_id text not null references public.crossings(id) on delete cascade,
  reason      text not null check (reason in ('saved_route','saved_place','starred','recent_area')),
  expires_at  timestamptz,
  primary key (device_id, crossing_id, reason)
);
create index ds_crossing_idx on private.device_subscriptions (crossing_id);

create table private.alerts_sent (
  id            bigserial primary key,
  device_id     uuid not null references private.devices(id) on delete cascade,
  crossing_id   text not null,
  transition_id bigint not null references public.risk_transitions(id),
  state         public.risk_state not null,
  sent_at       timestamptz not null default now(),
  ticket_id     text,
  receipt_status text,                                      -- 'ok' | error code
  unique (device_id, transition_id)                         -- dedupe
);
create index as_device_crossing_idx on private.alerts_sent (device_id, crossing_id, sent_at desc);

create table private.ingest_runs (
  id bigserial primary key, source text not null,           -- 'pg_cron' | 'gha' | 'manual'
  started_at timestamptz not null default now(), finished_at timestamptz,
  status text not null default 'running', n_requests smallint, n_gauges_ok smallint, n_gauges_stale smallint,
  n_transitions smallint, n_push smallint, error text
);
create table private.tick_lease (
  id smallint primary key default 1 check (id = 1),
  holder text, lease_until timestamptz not null default 'epoch', last_ok_at timestamptz
);
insert into private.tick_lease default values;
create table private.risk_tracker (                         -- hysteresis state; updated every tick, NOT in realtime publication
  crossing_id text primary key references public.crossings(id) on delete cascade,
  state public.risk_state not null, calm_ticks smallint not null default 0, since timestamptz not null
);

-- ROADMAP: crowd reports (never shown publicly without moderation)
create table private.reports (
  id bigserial primary key, device_id uuid references private.devices(id) on delete set null,
  crossing_id text references public.crossings(id),
  kind text check (kind in ('water_over_road','barricade','debris','clear_looking')),
  created_at timestamptz not null default now(), status text not null default 'pending', trust real
);
```

**Validated `[V: code]`:**
- This DDL, the §7.3 RLS block, the §7.4 change-only upsert, and the tick-lease statement all ran on a throwaway **PostgreSQL 16** cluster. `geography` was stubbed as `text` because PostGIS isn't installed locally.
- Results:
  - The first upsert wrote 1 row.
  - An identical upsert wrote **0 rows**, so no Realtime event fires.
  - A changed state wrote 1 row.
  - The lease was acquired once; a second concurrent acquire returned 0 rows.
  - `anon` could SELECT crossings, got **"new row violates row-level security policy"** on INSERT, and got **"permission denied for schema private"** reading `private.devices`.
- **Lease release:** `update private.tick_lease set lease_until = now(), last_ok_at = now() where id = 1;` runs on success. On failure, leave `last_ok_at` unchanged so the next tick retries.

### 7.3 RLS and grants

```sql
alter table public.gauges               enable row level security;
alter table public.crossings            enable row level security;
alter table public.crossing_gauge_links enable row level security;
alter table public.readings             enable row level security;
alter table public.risk_current         enable row level security;
alter table public.risk_transitions     enable row level security;
alter table public.risk_history         enable row level security;
alter table public.official_status      enable row level security;
alter table public.storms               enable row level security;
alter table public.ground_truth_events  enable row level security;   -- no public policy: eval only
alter table public.app_config           enable row level security;

create policy read_all on public.gauges               for select to anon, authenticated using (true);
create policy read_all on public.crossings            for select to anon, authenticated using (is_active);
create policy read_all on public.crossing_gauge_links for select to anon, authenticated using (true);
create policy read_recent on public.readings          for select to anon, authenticated
  using (obs_time > now() - interval '72 hours');
create policy read_all on public.risk_current         for select to anon, authenticated using (true);
create policy read_recent on public.risk_transitions  for select to anon, authenticated
  using (at > now() - interval '7 days');
create policy read_recent on public.risk_history      for select to anon, authenticated
  using (as_of > now() - interval '7 days');
create policy read_all on public.official_status      for select to anon, authenticated using (true);
create policy read_all on public.storms                for select to anon, authenticated using (true);
create policy read_public on public.app_config        for select to anon, authenticated
  using (key in ('banner','min_app_version','demo_mode_default','kill_switch_push'));
-- NO insert/update/delete policies anywhere → only the server (sb_secret_ key / service role, bypasses RLS) writes.
-- private.* tables are not exposed by PostgREST AND have no grants to anon/authenticated.
```
- **Notes:**
  - The new `sb_publishable_` key goes in the app. The `sb_secret_` key exists **only** in the Render and GitHub secrets. `[V: code supabase-js]`
  - That the publishable key maps to the `anon` Postgres role is `[U]`. Confirm with the "API keys" docs page, and test it: an anon `insert` must fail.

### 7.4 Writing `risk_current` only on meaningful change (protects the Realtime quota)

```sql
insert into public.risk_current as rc (crossing_id, state, p30, p60, p90, window_lo_min, window_hi_min, reasons,
                                       official, latest_obs_at, changed_at, evaluated_at, model_version, seq)
values (…)
on conflict (crossing_id) do update set
  state = excluded.state, p30 = excluded.p30, p60 = excluded.p60, p90 = excluded.p90,
  window_lo_min = excluded.window_lo_min, window_hi_min = excluded.window_hi_min, reasons = excluded.reasons,
  official = excluded.official, latest_obs_at = excluded.latest_obs_at,
  changed_at = excluded.changed_at, evaluated_at = excluded.evaluated_at, model_version = excluded.model_version,
  seq = excluded.seq
where (rc.state, rc.window_lo_min, rc.window_hi_min, rc.official)
      is distinct from (excluded.state, excluded.window_lo_min, excluded.window_hi_min, excluded.official);
```
- **Freshness (`evaluated_at`, gauge ages) travels in the snapshot**, not in per-row updates.
- **Hysteresis counters live in `private.risk_tracker`**, which is updated every tick but is not in the realtime publication.

### 7.5 Realtime design

- **MVP:** `alter publication supabase_realtime add table public.risk_current;` The app subscribes with `supabase.channel('risk').on('postgres_changes', {event:'*', schema:'public', table:'risk_current'}, …)`. `[V: code realtime-js README]`
- **On reconnect, or `CHANNEL_ERROR`/`TIMED_OUT`, refetch the snapshot.** Realtime is a hint, and the snapshot is the truth.
- **Scale-up (runner-up): Broadcast-from-DB.** A trigger on `risk_current` calls `realtime.send(payload, event, topic, private)` `[U exact signature]` on topic `risk:all`. Private channels can **replay** missed DB-broadcast messages (`replay: {since, limit≤25}`) `[V: code realtime-js README]`. That needs RLS on `realtime.messages`.
- **Background:** sockets die in the background, so use push (§9) plus an `expo-background-task` refresh (`expo-background-task@57.0.21` `[V: npm]`).

### 7.6 Budgets (computed)

- **Realtime messages:**
  - A naive "upsert all 70 rows every tick" to 200 clients ≈ **121 M msgs/month**. That is 60× over the 2 M quota ✗.
  - Change-only writes: about 150 changes per storm-day × 200 clients = **30,000/storm-day**; calm days ≈ 0 ✓.
- **Egress:** snapshot ≈ 4 KB gzipped. 5,000 opens/day × 6 refreshes × 30 days ≈ **3.6 GB/month**, near the 5 GB uncached quota. Storage CDN hits count against the separate 5 GB cached quota `[V: supabase egress page]`. Keep the snapshot lean: no reasons text, codes only.
- **Retention jobs:**
```sql
select cron.schedule('retention-readings', '17 3 * * *', $$delete from public.readings where obs_time < now() - interval '45 days'$$);
select cron.schedule('retention-history',  '27 3 * * *', $$delete from public.risk_history where as_of < now() - interval '60 days'$$);
select cron.schedule('retention-devices',  '37 3 * * *', $$delete from private.devices where last_seen_at < now() - interval '90 days'$$);
select cron.schedule('retention-alerts',   '47 3 * * *', $$delete from private.alerts_sent where sent_at < now() - interval '30 days'$$);
```
- **The tick clock** (Vault-stored URL and secret; `net.http_post` named args `[U exact defaults]`):
```sql
select vault.create_secret('https://fordcast-api.onrender.com/internal/tick', 'tick_url');
select vault.create_secret('<64-hex-random>', 'tick_secret');
select cron.schedule('fordcast-tick', '*/5 * * * *', $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'tick_url'),
    headers := jsonb_build_object('Content-Type','application/json',
               'X-Tick-Secret',(select decrypted_secret from vault.decrypted_secrets where name='tick_secret')),
    body    := jsonb_build_object('source','pg_cron','scheduled_at', now()),
    timeout_milliseconds := 10000);
$$);
```
- **Connection from Render:** use the Supabase **pooler** connection string (Supavisor). The direct `db.<ref>.supabase.co` host is IPv6-only on Free `[U]`. In transaction mode (port 6543), set psycopg `prepare_threshold=None` (verified kwarg) and use a lease row, not session advisory locks.

---

## 8. REST API (FastAPI, `/v1`)

**Conventions:**
- JSON via orjson. Errors use **RFC 9457** `application/problem+json`.
- Time is ISO-8601 UTC `Z`. Coordinates are `[lon, lat]` (GeoJSON order).
- `ETag` = `seq`, and `If-None-Match` returns 304.
- Every response carries `as_of` and `data_status`.
- **Version in the path (`/v1`)**, plus `schema` strings in documents (`fordcast.snapshot.v1`).

| Method & path | Purpose | Cache-Control | Rate limit (per IP) |
|---|---|---|---|
| `GET /v1/health` | liveness + dependencies | `no-store` | 120/min |
| `GET /v1/meta/freshness` | per-gauge latest obs and age; overall status | `max-age=30` | 60/min |
| `GET /v1/risk/current` | **the snapshot** (same doc as Storage) | `public, max-age=30, stale-while-revalidate=120` | 120/min |
| `GET /v1/crossings?bbox=&state=&format=geojson` | list + current risk | `max-age=30` | 60/min |
| `GET /v1/crossings/{id}` | detail: links, τ, triggers, reasons | `max-age=30` | 60/min |
| `GET /v1/crossings/{id}/history?hours=24` (≤168) | state timeline | `max-age=60` | 30/min |
| `GET /v1/gauges/{id}/series?param=00065&hours=6` (≤72) | sparkline data | `max-age=60` | 60/min |
| `POST /v1/route/check` | crossings along a route + optional detour | `no-store` | 10/min |
| `GET /v1/replays` | storm catalog | `max-age=3600` | 60/min |
| `GET /v1/replays/{id}` | meta + metrics + `timeline_url` (content-hashed) | `max-age=3600` | 60/min |
| `GET /v1/replays/{id}/frames?from=&to=` | timeline slice (or 302 to Storage) | `public, max-age=31536000, immutable` | 30/min |
| `POST /v1/devices` | register: returns `device_id` + `device_secret` once | `no-store` | 5/min |
| `PUT /v1/devices/{id}` | token, locale, quiet hours, toggles (auth: device secret) | `no-store` | 20/min |
| `PUT /v1/devices/{id}/subscriptions` | replace the crossing-id set | `no-store` | 20/min |
| `DELETE /v1/devices/{id}` | **forget me** (cascade delete) | `no-store` | 5/min |
| `POST /internal/tick` | the 5-min job (header `X-Tick-Secret`, constant-time compare) | `no-store` | n/a |
| `POST /internal/replays/{id}/rebuild` | regenerate + verify sha (admin secret) | `no-store` | n/a |

**Snapshot / `GET /v1/risk/current`:**
```json
{
  "schema": "fordcast.snapshot.v1",
  "as_of": "2026-10-14T18:05:00Z",
  "seq": 182734,
  "data_status": "live",
  "stale_after_s": 1200,
  "model": {"kind": "rule", "version": "rule-2026.10.20", "git_sha": "abc1234"},
  "disclaimer_key": "SUPPLEMENTARY_TOOL",
  "crossings": [
    {"id": "atx-081", "state": "avoid", "tier": "A", "p": [0.42, 0.71, 0.83], "window": [15, 30],
     "official": "open", "latest_obs_at": "2026-10-14T17:58:00Z", "changed_at": "2026-10-14T17:55:00Z",
     "reasons": [{"code": "UPSTREAM_ABOVE_TRIGGER", "gauge_id": "USGS-08158700", "rise_ft_30m": 3.1, "tau_min": 40}]},
    {"id": "tc-0310", "state": "unknown", "tier": "C", "p": null, "window": null, "official": "unknown",
     "latest_obs_at": null, "changed_at": "2026-10-01T00:00:00Z", "reasons": [{"code": "NO_UPSTREAM_GAUGE"}]}
  ]
}
```
- `data_status`: `live | degraded | offline | replay`.
- `p` is `[p30, p60, p90]`, or `null` when ML is off.
- `window` is minutes `[lo, hi]` from the fixed buckets.

**`GET /v1/crossings/{id}`** adds the `name, road, creek, jurisdiction, lon, lat, overtop_stage_ft, links:[{gauge_id, name, relation, channel_dist_km, tau_min, tau_p25, tau_p75, trigger_ft, watch_ft, latest:{t, value_ft, rise_ft_30m}}]` fields.

**`GET /v1/gauges/{id}/series`** returns `{"gauge_id","param":"00065","unit":"ft","points":[["2026-10-14T17:45:00Z",4.12],…],"trigger_ft":9.0,"watch_ft":6.4,"approval":"P"}`.

**`POST /v1/route/check`:**
```json
// request
{"geometry": {"type": "LineString", "coordinates": [[-97.80,30.25],[-97.77,30.26],[-97.74,30.27]]},
 "buffer_m": 60, "want_detour": true, "locale": "es"}
// or {"origin":[lon,lat],"destination":[lon,lat], ...} → server routes via ORS first
// response
{"as_of": "…", "data_status": "live", "verdict": "avoid",
 "hits": [{"crossing_id": "atx-081", "name": "…", "state": "avoid", "window": [15, 30], "distance_from_start_m": 2140}],
 "detour": {"geometry": {"type": "LineString", "coordinates": [...]}, "added_min": 4.2, "distance_km": 12.3,
            "avoided": ["atx-081"], "provider": "openrouteservice"},
 "disclaimer_key": "SUPPLEMENTARY_TOOL"}
```
- **Verdict:** if any hit is `flooded|avoid`, the verdict is that state. If any hit is `unknown`, the verdict is "unknown". **A route is never called "safe"**; the empty case is `"no_signal"` with copy "No current signal on N monitored crossings on this route".

**PostGIS RPC** (server-side):
```sql
create or replace function public.crossings_near_route(route_geojson text, buffer_m int)
returns table (crossing_id text, frac double precision)
language sql stable set search_path = '' as $$
  with r as (select extensions.st_geomfromgeojson(route_geojson)::extensions.geography as g)
  select c.id,
         extensions.st_linelocatepoint(r.g::extensions.geometry, c.geom::extensions.geometry)
  from public.crossings c cross join r
  where c.is_active and extensions.st_dwithin(c.geom, r.g, buffer_m)
  order by 2;
$$;
```
- **Detour:** POST to ORS with `options.avoid_polygons` = a MultiPolygon of **150 m buffers** around every `avoid|flooded` crossing (shapely, projected to EPSG:32614).

**Pydantic validation:**
- LineString ≤ **500 points**. Every coordinate inside the bbox **[-99.5, 29.0, -96.5, 31.5]**.
- `buffer_m ∈ [10, 300]`, `hours ≤ 72|168`, ids match `^[a-z0-9-]{3,40}$` / `^USGS-\d{8,15}$`.
- Request body ≤ 64 KB, enforced by middleware.

---

## 9. Push fan-out

### 9.1 Who gets notified

1. **Privacy-first subscriptions.**
   - The app works out **on the device** which crossings lie near the user's saved places and routes (within 300 m of a route, or 3 km of a place). It sends **only crossing IDs** with `PUT /v1/devices/{id}/subscriptions`.
   - **The server never stores home or work coordinates.**
   - `recent_area` subscriptions (crossings within 10 km of the last significant location) expire in 12 h and are optional.
2. **Background geofences are fully on-device.** The app ranks the ≤20 nearest WATCH/AVOID crossings from the snapshot and registers OS regions. The server only supplies the snapshot.
3. **Transitions that trigger pushes:** any **escalation** into `watch`, `avoid`, or `flooded`.
   - **No push for de-escalations.** "No current signal" is never pushed, so nothing reads as an "all clear".
   - **No push for `unknown`.** The app shows an in-app banner instead.

### 9.2 Algorithm (runs at the end of each tick)

```python
for tr in transitions_this_tick (escalations only, ordered by severity desc):
    devices = sql("""select d.* from private.device_subscriptions s join private.devices d on d.id=s.device_id
                     where s.crossing_id=%s and (s.expires_at is null or s.expires_at>now())
                       and d.alerts_enabled and d.expo_push_token is not null""", tr.crossing_id)
    for d in devices:
        if tr.to_state == WATCH and not d.watch_alerts:                       continue
        if in_quiet_hours(d, now) and tr.to_state == WATCH:                   continue   # AVOID/FLOODED bypass (user-visible setting)
        if sent_recently(d, tr.crossing_id, state_rank >= tr.to_state, within=60 min): continue  # cooldown
        if pushes_last_hour(d) >= 4:  coalesce(d, tr); continue               # per-device cap → 1 summary push
        queue(Message(d, tr))
coalesced → one message per device: "3 crossings on your saved routes are now Avoid"
insert alerts_sent (unique (device_id, transition_id)) ON CONFLICT DO NOTHING → only send rows actually inserted (dedupe)
send in chunks of 100 (gzip, Bearer EXPO_ACCESS_TOKEN), ≤6 concurrent requests, tenacity backoff on 429/5xx
tickets: status 'error' & details.error=='DeviceNotRegistered' → null the token immediately
receipts: each tick, fetch receipts for tickets 15 min–23 h old (≤300 ids/request); errors → push_failures++ (≥5 → disable)
```
- **Kill switch:** if `app_config.kill_switch_push = true`, skip sending (for example if bad data is detected).

### 9.3 Payloads

```json
{"to": "ExponentPushToken[…]",
 "title": "Avoid: Bull Creek at Loop 360",
 "body": "Flooding likely within 15–30 min. Use another route.",
 "data": {"type": "risk", "crossing_id": "atx-081", "state": "avoid", "seq": 182734, "as_of": "2026-10-14T18:05:00Z"},
 "priority": "high", "ttl": 3600, "sound": "default",
 "channelId": "avoid-alerts", "interruptionLevel": "time-sensitive",
 "collapseId": "crossing-atx-081", "tag": "crossing-atx-081", "threadId": "fordcast-risk"}
```
- **WATCH:** `priority:"default"`, `ttl:1800`, `channelId:"watch-alerts"`, `interruptionLevel:"active"`.
- **The `ttl` matters for safety:** a flood alert delivered hours late is harmful, so let it expire.
- **`collapseId` (iOS) and `tag` (Android) replace the previous alert for the same crossing.** All of these field names were verified in `expo-server-sdk` 7.2.0 types.
- **Android channels are created on the client:** `avoid-alerts` (importance HIGH) and `watch-alerts` (DEFAULT). If a channel doesn't exist on the device, the notification won't show `[V: docs.expo.dev sending-notifications]`.

### 9.4 Templates (EN/ES; Spanish to be reviewed by a native speaker `[U]`)

| Key | EN title / body | ES title / body |
|---|---|---|
| `AVOID` | "Avoid: {crossing}" / "Flooding likely within {lo}–{hi} min. Use another route." | "Evite: {crossing}" / "Probable inundación en {lo}–{hi} min. Use otra ruta." |
| `AVOID_NOW` (window 0–15) | "Avoid now: {crossing}" / "Water likely reaching the road soon. Do not cross." | "Evite ahora: {crossing}" / "Es probable que el agua llegue pronto al camino. No cruce." |
| `WATCH` | "Watch: {crossing}" / "Water rising upstream. Check before you drive." | "Atención: {crossing}" / "El agua sube río arriba. Revise antes de manejar." |
| `FLOODED` | "{crossing}: flooded or closed" / "Turn Around, Don't Drown. Never drive into water." | "{crossing}: inundado o cerrado" / "Dé la vuelta, no se ahogue. Nunca maneje en el agua." |
| `SUMMARY` | "{n} crossings on your routes need caution" / "Open FordCast for details." | "{n} cruces en sus rutas requieren precaución" / "Abra FordCast para ver detalles." |

---

## 10. Privacy and security

| Area | Decision |
|---|---|
| Identity | **No accounts.** `POST /v1/devices` returns `device_id` (UUID) plus a random 32-byte `device_secret`. The client keeps the secret in SecureStore; the server stores only its sha256. Later calls send `Authorization: Device <id>:<secret>`, compared in constant time. |
| Location | **Never stored server-side.** Geofencing, nearby ranking, and saved-place matching run on the device; the server sees only crossing IDs. Route-check coordinates are processed in memory, **not logged** (logging redaction filter), and not stored. The privacy note explains that detours send start and end points to OpenRouteService. |
| Keys | App: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_…` (safe with RLS). Server only: `SUPABASE_SECRET_KEY=sb_secret_…`, `DATABASE_URL` (pooler), `USGS_API_KEY`, `ORS_API_KEY`, `EXPO_ACCESS_TOKEN`, `TICK_SECRET`, `ADMIN_SECRET`, `SENTRY_DSN`, `HC_PING_URL`. These live in Render env vars and GitHub Actions secrets, are loaded by `pydantic-settings`, and the app **fails fast at startup if any are missing**. |
| Repo hygiene | `.env` in `.gitignore`. A `.env.example` with placeholders. Turn on GitHub **secret scanning + push protection** (free for public repos `[U]`). Never log headers. |
| DB | RLS on every public table. Read-only policies. `private` schema with no grants. Writes come only from the server. Optionally use `security definer` RPCs with `set search_path = ''`. |
| Abuse | `slowapi` per-IP limits (§8), body-size cap, pydantic strict validation, Texas bbox check, ≤500 route points, crossing-id regex. Tick and admin endpoints need secret headers and return 404 (not 401) when missing. |
| CORS | Native apps don't need CORS. `allow_origins` is an explicit list (for example the GitHub Pages demo site), `allow_methods=["GET"]`, `allow_credentials=False`. |
| Headers | `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Strict-Transport-Security` (Render terminates TLS). |
| Data rights | `DELETE /v1/devices/{id}` deletes everything. Devices inactive for 90 days are auto-deleted. Push tokens are removed on `DeviceNotRegistered`. |
| Safety copy | Every response carries `disclaimer_key`, and the app renders "FordCast is a supplementary tool. Obey barricades and official warnings. Never drive into water." |

---

## 11. Observability and testing

### 11.1 Logs and metrics

- **structlog JSON**, one line per tick: `{event:"tick", tick_id, source, duration_ms, n_requests, n_gauges_ok, n_gauges_stale, n_transitions, n_push, usgs_ratelimit_remaining, data_status}`.
- `/v1/meta/freshness` comes from `private.ingest_runs` plus `max(readings.obs_time)` per gauge.
- Sentry: `sentry_sdk.init(dsn=…, environment=…, traces_sample_rate=0.05, send_default_pii=False)`.

### 11.2 Test pyramid

| Layer | Tooling | What |
|---|---|---|
| Unit | pytest 9 | travel_time (synthetic lags recovered within ±1 min); trigger search; rule; **state machine** (hypothesis property tests: escalation is immediate, de-escalation drops one level after N calm ticks, `unknown` whenever data is stale, FLOODED is held while official=closed, **flapping is bounded** at ≤ 2 transitions per hour under random noise ±0.1 ft); bucket windows; templates (EN/ES keys match) |
| No-lookahead | pytest | **prefix invariance**, **future poison**, source raises `LookaheadError`, pipeline can't import truth (§5.3) |
| Replay golden | pytest | regenerate each `replays/*.json` and compare its sha256 to the committed value |
| Contract (recorded) | **pytest-recording/vcrpy** cassettes + **respx** | USGS `latest-continuous`/`continuous` (multi-site comma GET), NLDI position + navigation, Expo send and getReceipts (ok + DeviceNotRegistered), ORS directions. `vcr_config = {"filter_headers": ["X-Api-Key","Authorization"], "filter_query_parameters": ["api_key"]}`. Responses are validated by pydantic models, which **is** the contract. |
| API | FastAPI `TestClient`/httpx `ASGITransport` | schemas, caching headers, 304 on ETag, rate-limit 429, RLS (anon insert must fail; run against the local Supabase CLI `supabase@2.120.0` `[V: npm]`) |
| Live (nightly) | `-m live` | small real calls to USGS v1, NLDI, and Expo (`getReceipts` with a fake id). This catches the **USGS v0→v1 / legacy retirement** changes early. |
| Backtest | `python -m fordcast backtest` | writes `docs/results.md` + figures. CI fails if POD drops more than 10 points versus the committed baseline. |

### 11.3 CI workflows (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: ci
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: backend } }
    steps:
      - uses: actions/checkout@v5          # [U] latest major — pin to the current major shown on GitHub Marketplace
      - uses: astral-sh/setup-uv@v6        # [U] same
      - run: uv sync --frozen --all-extras
      - run: uv run ruff check . && uv run ruff format --check .
      - run: uv run pytest -q -m "not live"
---
# .github/workflows/tick-backup.yml  (watchdog; primary clock is pg_cron)
name: tick-backup
on:
  schedule: [{ cron: "7-59/15 * * * *" }]   # off the top of the hour (GitHub: hour start = highest delay)
  workflow_dispatch: {}
jobs:
  tick:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - run: |
          curl -fsS -X POST "$TICK_URL?source=gha" -H "X-Tick-Secret: $TICK_SECRET" --max-time 90 || echo "tick failed"
          curl -fsS "$API/v1/meta/freshness" --max-time 30 | tee fresh.json
        env: { TICK_URL: "${{ secrets.TICK_URL }}", TICK_SECRET: "${{ secrets.TICK_SECRET }}", API: "${{ secrets.API_BASE }}" }
---
# .github/workflows/nightly.yml
name: nightly
on: { schedule: [{ cron: "23 8 * * *" }], workflow_dispatch: {} }
jobs:
  live-contracts-and-golden:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: backend } }
    steps:
      - uses: actions/checkout@v5
      - uses: astral-sh/setup-uv@v6
      - run: uv sync --frozen --all-extras
      - run: uv run pytest -q -m live
        env: { USGS_API_KEY: "${{ secrets.USGS_API_KEY }}" }
      - run: uv run python -m fordcast replay-verify --all
```
- The backup tick is idempotent. The lease skips if `last_ok_at` was less than 4 min ago, and a call from GH also wakes a Render free instance.

---

## 12. Build plan (backend slice of the 12-day plan) and definition of done

| Day | Deliverable | Done when (acceptance test) |
|---|---|---|
| **1** (Oct 14) | Supabase project + migration 0001; USGS API key; Render service skeleton (`/v1/health`); uv lock; CI green | `curl /v1/health` returns ok; anon insert into `crossings` is **denied** |
| **2** | Crossing list (City `q6kt-v2zm` + County layer); NLDI snap + upstream links; map-check notebook; pick **10–20 tier-A crossings** | `crossing_gauge_links` filled; every tier-A snap visually verified |
| **3** | Storm backfill (2013, 2015, 2018, 2025) to Parquet; `ground_truth_events` | One plot: upstream vs. target stage, Memorial Day 2015 |
| **4** | travel_time + triggers + rule + state machine + **backtest** (LOSO) vs. nearest-gauge | `docs/results.md` has **real POD/FAR/CSI/lead** numbers |
| **5** | `DataSource` (Live + Replay) + `pipeline.tick` + no-lookahead tests + replay builder → `replays/*.json` | prefix-invariance and poison tests pass; golden sha committed |
| **6** | Live ingest via pg_cron → `/internal/tick`; snapshot to Storage; Realtime; healthchecks + UptimeRobot + Sentry | 24 h of green heartbeats; `data_status: live` |
| 7–9 | (App team) uses the snapshot, replay JSON, `/route/check`, `/devices` | |
| **10** | Push fan-out (EN/ES), receipts, quiet hours, device API | A test push reaches a real phone; DeviceNotRegistered handled |
| 10–11 | ML stretch: HGB + calibration + SHAP reasons, **only if LOSO beats the rule** | Reliability diagram plus an honest comparison in the README |
| 11–12 | Freeze: Render Starter on; tag the release; README "Built / Prototype / Roadmap" | Calm-day app shows "No current signal… Try Storm Replay" |

**Cut order if behind** (consistent with v4 §6): ML → route detour (keep on-device route intersection) → Realtime (keep snapshot polling) → push. **Never cut:** the live ingest, Storm Replay plus its no-lookahead tests, and the backtest numbers.

---

## 13. Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Render cold start or suspension during judging | Med (free) / Low (Starter) | Starter Oct 20–Dec 31; snapshot on the Storage CDN; bundled replays |
| Supabase pause | Low (5-min writes) | heartbeat alarm long before 7 days |
| GH scheduled workflows disabled after 60 days (≈ Dec 24) | **High if ignored** | commit every 3 weeks; pg_cron is the primary clock anyway |
| USGS API change (v0→v1), rate limit, or outage | Med | configurable version; nightly live contract tests; keyed quota at 4% use; `unknown` on stale data |
| Data latency makes lead times optimistic | **High** | `available_at` modelling; report lead with the assumed delay stated |
| No machine-readable ATXfloods status | High | `OfficialStatusSource` optional; manual overrides labelled; email the City |
| Few storms → overfit ML | High | rule is primary; ML only if LOSO wins; monotone constraints; sigmoid calibration |
| Gauge datum changes between storms | Low–Med `[U]` | check `time-series-metadata`; learn triggers per storm era if needed |
| Realtime quota blow-up | Med (if naive) | change-only writes (§7.4); snapshot polling fallback |
| False-alarm fatigue | Med | hysteresis, cooldowns, per-device cap, calm-day FA metric reported |

---

## 14. Candidate Austin-area USGS gauges to check first `[U]`

These are from memory and **must be verified** with `waterdata.get_monitoring_locations(bbox=[-98.2, 30.0, -97.4, 30.6])` or with `time-series-metadata` (param `00065`, `begin` ≤ 2013):
- 08154700 Bull Ck at Loop 360
- 08155200 Barton Ck at SH 71
- 08155300 Barton Ck at Loop 360
- 08156800 Shoal Ck at W 12th St
- 08158700 Onion Ck nr Driftwood
- 08158810 Bear Ck below FM 1826
- 08158840 Slaughter Ck at FM 1826
- 08158920 Williamson Ck at Oak Hill
- 08159000 Onion Ck at US 183
- 08158000 Colorado Rv at US 183

---

## 15. Sources

**Hosting:**
- Supabase:
  - [Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
  - [Pricing](https://supabase.com/pricing)
  - [Egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress)
  - [Realtime Limits](https://supabase.com/docs/guides/realtime/limits)
  - [Realtime Pricing](https://supabase.com/docs/guides/realtime/pricing)
  - [Edge Function Limits](https://supabase.com/docs/guides/functions/limits)
  - [Functions Pricing](https://supabase.com/docs/guides/functions/pricing)
  - [Cron Quickstart](https://supabase.com/docs/guides/cron/quickstart)
  - [Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions)
  - [pg_net](https://supabase.com/docs/guides/database/extensions/pg_net)
  - [Restorable 90 days changelog](https://supabase.com/changelog/27497-paused-free-plan-projects-are-restorable-for-90-days)
- Render:
  - [Deploy for Free](https://render.com/docs/free)
  - [Updated workspace plans](https://render.com/changelog/updated-plans-for-render-workspaces)
  - [Hosting cost article](https://render.com/articles/how-much-does-cloud-application-hosting-cost-for-small-businesses)
  - [Community: keep-alive](https://community.render.com/t/will-using-cron-jobs-to-hit-free-tier-web-service-every-13-14-minutes-use-up-my-free-instance-hours/23630)
  - [MakerKit Render calculator](https://makerkit.dev/pricing-calculator/render) (3p)
  - [Kuberns Render pricing](https://kuberns.com/blogs/render-pricing/) (3p)
- GitHub:
  - [Events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
  - [Disabling workflows](https://docs.github.com/actions/managing-workflow-runs/disabling-and-enabling-a-workflow)
  - [Billing and usage](https://docs.github.com/en/actions/concepts/billing-and-usage)
  - [Troubleshooting workflows](https://docs.github.com/en/actions/how-tos/troubleshoot-workflows)
- Google:
  - [Cloud Scheduler pricing](https://cloud.google.com/scheduler/pricing)
  - [Cloud Run pricing](https://cloud.google.com/run/pricing)
- Other platforms:
  - [Modal pricing](https://modal.com/pricing)
  - [Vercel cron usage](https://vercel.com/docs/cron-jobs/usage-and-pricing)
  - [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- Monitoring:
  - [healthchecks.io (freetier.co)](https://freetier.co/directory/products/healthchecksio)
  - [UptimeRobot pricing 2026 (notifier.so)](https://notifier.so/guides/uptimerobot-pricing-2026/)
- [Fly vs Railway (findstack, 3p)](https://findstack.com/resources/railway-vs-fly-io)

**Data APIs:**
- USGS:
  - [USGS API keys](https://api.waterdata.usgs.gov/docs/ogcapi/keys/)
  - [USGS migration](https://api.waterdata.usgs.gov/docs/ogcapi/migration/)
  - [Continuous schema](https://api.waterdata.usgs.gov/ogcapi/v0/collections/continuous/schema)
  - [Efficient queries](https://api.waterdata.usgs.gov/docs/ogcapi/efficiency/)
  - [What's new WDFN APIs](https://waterdata.usgs.gov/blog/api-whats-new-wdfn-apis/)
  - [WaterServices (retirement)](https://waterservices.usgs.gov/)
  - [dataRetrieval read_waterdata_continuous](https://water.code-pages.usgs.gov/dataRetrieval/reference/read_waterdata_continuous.html)
- NLDI:
  - [NLDI navigation](https://api.water.usgs.gov/docs/nldi/navigation)
  - [NLDI docs](https://api.water.usgs.gov/docs/nldi)
- Crossing data:
  - [City of Austin LWC gates (data.gov)](https://catalog.data.gov/dataset/inlandwaters_flood_low_water_crossings)
  - [Low Water Crossings That Flood](https://catalog.data.gov/dataset/low-water-crossings-that-flood)
  - [Travis County LWC MapServer](https://gis.traviscountytx.gov/server1/rest/services/Public_Works/Low_Water_Crossings/MapServer/info/iteminfo?f=pjson)
  - [WilCo ATXFloods MapServer](https://gis.wilco.org/arcgis/rest/services/OEM/ATXFloods/MapServer)
  - [ATXfloods crossings](https://www.atxfloods.com/crossings)
  - [ctxfloods issue #297](https://github.com/cityofaustin/ctxfloods/issues/297)
- Expo:
  - [Expo sending notifications](https://docs.expo.dev/push-notifications/sending-notifications/)
  - [Expo push FAQ](https://docs.expo.dev/push-notifications/faq/)

**Science:**
- [Dallas hybrid ML roadway flood risk](https://www.sciencedirect.com/science/article/pii/S0022169424008011)
- [Harris County road flooding ML](https://www.researchgate.net/publication/354219832_Predicting_Road_Flooding_Risk_with_Machine_Learning_Approaches_Using_Crowdsourced_Reports_and_Fine-grained_Traffic_Data)
- [NWM + DA site-level bridge impacts](https://www.nature.com/articles/s44304-025-00116-0)
- July 2025 Guadalupe NWM evaluation:
  - [EGUsphere preprint](https://egusphere.copernicus.org/preprints/2026/egusphere-2026-1847/egusphere-2026-1847.pdf)
  - [NHESS article](https://nhess.copernicus.org/articles/26/4753/2026/)
- [COMET WRF-Hydro Hill Country report](https://www.comet.ucar.edu/sites/default/files/outreach/media/documents/1623463.pdf)
- [UT JSG Q&A 2026](https://www.jsg.utexas.edu/news/2026/07/zong-liang-yang-qa-a-better-way-to-forecast-floods-in-central-texas)
- [Texas 3-m HAND](https://web.corral.tacc.utexas.edu/nfiedata/pin2flood/texas/)
- [HAND rating curves vs HEC-RAS](https://impact.ornl.gov/en/publications/river-channel-geometry-and-rating-curve-estimation-using-height-a/)
- [NWSI 10-1601](https://www.weather.gov/media/directives/010_pdfs_archived/pd01016001d.pdf)
- [CAWCR verification](https://www.cawcr.gov.au/projects/verification/)

**Package-source verification (read or run today):**
- `dataretrieval` 1.4.0: `waterdata/endpoints.py`, `utils.py`, `ogc/requests.py`, `transport/http.py`
- `pynhd` 0.20.0: `nldi.py`
- `expo-server-sdk` 7.2.0: `ExpoClientValues.js`, `ExpoClient.d.ts`
- `@supabase/supabase-js` 2.117.3: `src/lib/fetch.ts`
- `@supabase/realtime-js` 2.117.3: README, migrations
- `storage3` 2.32.0: `_async/file_api.py`, `constants.py` (**the default `cache-control` is "3600", so override it to "30" for the snapshot**)
- `openrouteservice-js` 0.4.1: README
- scikit-learn 1.9.1: `calibration.py`, `frozen/`, `model_selection/_split.py`, `ensemble/_hist_gradient_boosting`
- shap 0.52.0: `explainers/_tree.py`
- psycopg 3.3.6 / psycopg-pool 3.3.3
- uv 0.11.32 `exclude-newer` / `exclude-newer-package` (lock resolved, 129 packages)
- **Prototype:** `scratchpad/be_proto/proto.py`. All smoke tests pass: lag recovery, the replay prefix-invariance and poison tests, hysteresis, HGB + `FrozenEstimator` calibration + SHAP, POD/FAR/CSI.
