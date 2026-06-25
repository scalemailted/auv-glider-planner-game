# Terrain Validation E2E Coverage Audit

THREE-R1.2C.2 added the six requested visible browser workflows to the former `tests/e2e/smoke.spec.js`; REPO-CLEAN-R3 moved them to `tests/e2e/simulation_and_terrain.spec.js` while preserving `executionWaterColumn` group ownership in `tools/js/playwright_groups.mjs`.

| Requested workflow | Existing equivalent | Missing behavior before this pass | Test added |
| --- | --- | --- | --- |
| Continuous Route Validation Detects Coastline and Clearance Risks | Partial terrain placement preview coverage | Continuous route-risk preview, canonical non-mutation, deep profile terrain issue, renderer-boundary checks | `Continuous Route Validation Detects Coastline and Clearance Risks` |
| Sampling Targets Respect Canonical Seabed and Reachability | Partial sampling-target/depth workflow coverage | Below-seabed rejection, target non-executable semantics, attachment/reachability check, no route timeline mutation | `Sampling Targets Respect Canonical Seabed and Reachability` |
| Mission Readiness Separates Errors Warnings and Advisories | Partial execution-gate checks | Visible blocker/repair flow, severity counts, launch snapshot preservation, Debrief visibility | `Mission Readiness Separates Errors Warnings and Advisories` |
| Planned and Realized Paths Share Terrain Validation | Runtime diagnostics smokes only | Browser launch-vs-actual path, incremental diagnostics counters, result/debrief terrain comparison | `Planned and Realized Paths Share Terrain Validation` |
| Terrain Validation Persists Through Export Headless and Replay | Result/replay Node smokes only | Browser-produced result export plus replay artifact inspection and public-safety checks | `Terrain Validation Persists Through Export Headless and Replay` |
| Three Terrain Presentation Clearly Distinguishes Mission Semantics | Terrain renderer/layer smokes only | Visible semantic distinctions for terrain, land, coastline, waypoints, targets, predicted dive, realized trajectory, depth scale, and single canvas | `Three Terrain Presentation Clearly Distinguishes Mission Semantics` |

## Group Coverage

`node tools/js/audit_playwright_group_coverage.mjs` reports exact coverage, including physical split ownership for the 68 tests moved from the former monolith. Current profile counts are recorded in `docs/test_portfolio_r2.md` and `docs/repository_cleanup_r3.md`.

## Boundary Notes

The browser tests use visible UI where practical. Invalid land/terrain placement remains non-mutating: the UI can show hard-invalid previews without committing unsafe route geometry. Mission Readiness tests use supported visible blockers and repairs rather than debug-only plan mutation.

Human manual QA by the project owner remains pending.