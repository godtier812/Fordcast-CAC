# Source and provenance ledger

Build date: 2026-10-21 (America/Chicago assumed). The binder's source IDs (superscripts) map to the rows below.

## Access context

| Attempt (2026-10-21) | Result |
|---|---|
| `https://www.soinc.org/thermodynamics-c`, `https://www.soinc.org/rules-2027` (curl via session proxy) | **Blocked**: HTTP 403 on CONNECT (environment network policy). Not inspected. |
| NIST (physics.nist.gov, webbook.nist.gov, kinetics.nist.gov/janaf), MIT (ahtt.mit.edu, ocw.mit.edu, web.mit.edu), OpenStax, BIPM, Wikipedia, scioly.org, google.com | **Blocked**: HTTP 403. Not inspected. |
| WebFetch tool | Failed (DNS resolution unavailable in the container). |
| WebSearch tool | Worked, but returns result *summaries/snippets* only; underlying pages were not inspected. |
| PyPI (package registry) | Reachable. Authoritative datasets/models were used through versioned packages and computed locally. |

No rules manual, tournament packet, device rules, or device data were attached.

## Register

| ID | Source | Version / edition | Access status | Used for (binder locations) |
|---|---|---|---|---|
| SO1 | Science Olympiad Inc., "Thermodynamics C" event page, https://www.soinc.org/thermodynamics-c | current page (date unknown) | **Not accessed** (403). Search-result summary only: describes a device "designed to collect heat" plus a written test. | Rules-status notice (p. 1), device conflict note (Device section). Not used to verify anything. |
| SO2 | Science Olympiad Inc., "2027 Event Slate" (Division C PDF) and "SO Conflict Blocks 2027" PDF (soinc.org uploaded files) | 2027 season | **Not accessed**; search snippets only (Thermodynamics C listed; conflict group 6). | "Event in 2027 slate: snippet only" status. |
| WIKI | Scio.ly "Thermodynamics" guide, https://www.scio.ly/docs/thermodynamics | unknown | **Not accessed**; snippet only; community source, not authoritative. Describes a heat-*retention* beaker task. | Conflict note only. |
| CODATA | CODATA 2022 recommended values as distributed in SciPy `scipy.constants.physical_constants` | SciPy 1.18.1 (`_current_codata = "CODATA 2022"`) | Inspected locally | Constants table; exact SI values; sigma, Wien b, b'. |
| IAPWS | IAPWS-95 (Wagner & Pruss, J. Phys. Chem. Ref. Data 31, 387, 2002); viscosity Huber et al. 2009; conductivity Huber et al. 2012 — as implemented in CoolProp | CoolProp 8.0.0 (EOS key `Wagner-JPCRD-2002`) | Computed locally; papers not accessed | Saturation tables, superheated steam, water ledger constants, liquid-water properties, Rankine and dew-point demos. |
| ICE | IAPWS-06 (ice Ih) and IAPWS 2011 melting/sublimation curves, as implemented in `iapws` | iapws 1.5.5 | Computed locally; releases not accessed | Ice cp and density, L_f at 0 C (333.4 J/g), frost-point pressures, Clapeyron check. |
| CP | CoolProp reference EOS and transport (CO2 Span–Wagner 1996; air Lemmon et al. 2000 + Lemmon–Jacobsen 2004; R-134a Tillner-Roth & Baehr 1994; N2, O2, Ar, He, H2, CH4, NH3, alkanes, alcohols, acetone, benzene) | CoolProp 8.0.0 | Computed locally | Gas table at 300 K, Z values, critical points, Joule–Thomson coefficients and inversion temperatures, R-134a cycle and table, air properties, boiling table. |
| CRC | CRC Handbook "Standard thermodynamic properties of chemical substances" (and CRC inorganic/organic melting data) as transcribed in `chemicals` (`CRC_standard_data`, `phase_change.Tm/Hfus`) | chemicals 1.5.2 (handbook edition not confirmed) | Package data inspected; handbook not accessed | Formation enthalpy/Gibbs/entropy table, metal heat capacities, melting/fusion table. |
| XCHK | ATcT, NIST-JANAF, NIST WebBook values as transcribed in `chemicals` | chemicals 1.5.2 | Package data inspected | Disagreement flags (double dagger) for ethanol(l), NO(g), sucrose(s). |
| HT | `ht` heat-transfer library (C. Bell): implementations and docstrings citing Churchill & Chu 1975 (vertical plate; horizontal cylinder), Churchill & Bernstein 1977, Dittus & Boelter 1930, Gnielinski 1976, McAdams (Heat Transmission), Churchill sphere (via Schlünder), Bergman et al. 2011 | ht 1.2.0 | Code and docstrings inspected; original papers not accessed | Correlation table (forms numerically cross-checked), validity notes, beaker and container demos. |
| MAT | ASHRAE Handbook—Fundamentals 2013; DIN EN 12524:2000; VDI Heat Atlas 2010 — design values as transcribed in `ht.insulation` | ht 1.2.0 | Package data inspected; one erroneous entry ("Floor covering, tiles, cork", k = 65 W/(m K)) excluded | Thermal conductivity / density / cp table; EPS and wall demos. |
| PINT | pint unit definitions; exact IT Btu (1055.05585262 J) defined explicitly because pint's built-in `Btu` is the rounded 1055.056 J | pint 0.26.2 | Inspected locally | Unit conversion table, R-value factor. |
| DER | Derived/verified in this build: symbolic (sympy) and numerical derivations; every solved demonstration recomputed with an independent check | `checks/demos.py` (63 checks) | Executed locally | Items tagged DER. |
| EK | Editor knowledge: standard textbook results or facts **not** verified against an accessed source in this build | — | Unverified this build | Qualitative statements, expansion coefficients, some correlation constants (e.g. 0.037 turbulent plate, 3.66/4.36), thermometer comparison, emissivity guidance, history timeline. |

## Recommended but not accessed

Official 2027 Rules Manual and clarifications; NIST Chemistry WebBook and NIST CODATA pages; J. H. Lienhard IV & V, *A Heat Transfer Textbook* (author-hosted); MIT OpenCourseWare thermodynamics notes; OpenStax *University Physics* Vol. 2. None is cited as verification for any binder statement.

## Data-generation provenance

Exact functions, settings, and package versions per table are in `data/provenance.json` (written by `scripts/gen_data.py`) and `scripts/gen_conversions.py`.
