# AI use disclosure — FordCast (CAC 2026)

## 1. Official CAC rule on AI tools
> Rule not yet read — UNVERIFIED. (The student pastes the exact 2026 text here; Step 0 Q7.)

Source: [URL] · read on [date] by [student].

## 2. Summary (this paragraph is also used in the CAC form — the student edits it into their own words)
I built FordCast's demonstration app with help from an AI coding assistant (Claude Code, Anthropic) in October 2026.
The assistant generated most of the app's screens and components, the simulated-storm engine around the forecast,
tests and documentation drafts, following design decisions I made and reviewed. I personally [wrote | co-wrote] the
three files that hold the forecasting logic — the upstream-gauge forecast rule, the alert state machine and the
travel-time code — and I can explain every line of them. The storms in the demo are simulated; the numbers shown come
from the code running on the phone. My written answers and the video narration are my own words.

## 3. Tools
| Tool | Version / model | Dates | Used for |
|---|---|---|---|
| Claude Code (Anthropic) | [model shown in the session] | Oct 16–25, 2026 | scaffolding, UI, the demo engine around the ★ files, tests, docs drafts, reviews |

## 4. What I (the student) did
- Problem choice and design decisions (Step 0 answers: `docs/decisions/step0.md`)
- Wrote the three core files (table below) and answered the explain-back questions (`docs/explain/`)
- Ran every iPhone build and device test, recorded the video and the voice-over, wrote Q1–Q4

## 5. Per-file authorship
| File | Mode | Status | Student commits | Hints used | Explain-back |
|---|---|---|---|---|---|
| `mobile/src/demo/engine/baseline-rule.ts` | student-written | **awaiting student** (handed off Oct 17) | — | — | `docs/explain/baseline-rule.md` |
| `mobile/src/demo/engine/state-machine.ts` | student-written | not started (contract only: C §18.8 table) | — | — | `docs/explain/state-machine.md` |
| `mobile/src/demo/engine/travel-time.ts` | student-written | not started | — | — | `docs/explain/travel-time.md` |
| Everything else | AI-generated, reviewed by me and checked by tests | — | — | — | — |

**Research prototype:** `docs/demo-prompt/research/proto/` and `docs/demo-prompt/05-code/` are AI-written reference code
used as a design reference and to generate golden test data (`mobile/src/demo/__fixtures__/`). They are not shipped in
the app, and the three files above were not copied from them.

## 6. How AI output was checked
Jest suites (engine, display, takes, golden, copy guards, EN/ES parity, code guards), TypeScript strict mode, golden
events hashes, device tests on my iPhone (`docs/decisions/verifications.md`, `docs/devlog.md`), review of the core files,
and a native-speaker review of the Spanish.

## 7. Reused templates and third-party code (not written by me or the AI)
Expo default template (0BSD) · React Native Reusables (MIT) · Expo examples (MIT) · Inter (OFL-1.1) · City of Austin
ctxfloods-backend crossing list (MIT) · OpenFreeMap / OpenMapTiles + OpenStreetMap (ODbL). Full list: `THIRD_PARTY_NOTICES.md`.

## 8. What the AI did not do
It did not invent data presented as real, write my final answers or narration, record my voice, contact anyone, or submit.

## 9. How to audit
```bash
git log --format='%h %ad %an %s' --date=short -- mobile/src/demo/engine/baseline-rule.ts
git log --grep='Co-Authored-By' --oneline | wc -l     # agent-assisted commits
git shortlog -sn                                       # commits per author
```
