# Data bridge verification

Partial bootstrap checks; not full S1–S12 acceptance

Raw public responses are cached under ignored data/raw/smoke/; hashes are recorded in the JSON report.

| Check | Status | Detail |
| --- | --- | --- |
| S1 | PASS | usgs-collections |
| S2 | PASS | usgs-latest |
| S3 | PASS | usgs-2013-us183 |
| S4 | PASS | nldi-onion |
| S5 | PASS | nwps-us183 |
| S7 | FAIL | austin-crossings |
| S8 | PASS | ofm-style |
| S6 | BLOCKED | Project contact email not supplied; NWS User-Agent contract not exercised. |
| S9 | BLOCKED | Stretch rainfall integration not enabled. |
| S10 | BLOCKED | ATXfloods permission absent; no endpoint accessed. |
| S11 | BLOCKED | Routing keys absent; Stretch integration not enabled. |
| S12 | BLOCKED | Expo access token absent; push receipt authentication not exercised. |

No authentication, quota, provenance or deployment acceptance is implied by a public HTTP response. USGS unkeyed calls were bounded bootstrap probes only; production needs a configured key.
