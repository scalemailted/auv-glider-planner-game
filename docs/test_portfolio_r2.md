# Test Portfolio R2

REPO-CLEAN-R2 changes test ownership from historical phase names to production capabilities. The browser tiers are selected by `tests/e2e/capability_manifest.mjs`; `tools/js/playwright_groups.mjs` consumes that manifest for smoke and release profiles.

## Tier Counts

| Tier | Browser tests |
|---|---:|
| smoke | 15 |
| release | 48 |
| visual | 12 |
| full | 76 |

## Capability Matrix

| Capability | Release | Smoke | Browser required | Browser evidence | Node evidence |
|---|---:|---:|---:|---|---|
| APP-BOOT | yes | yes | no | 4 titles | 2 scripts |
| PRODUCT-HUB | yes | no | yes | 3 titles | 0 scripts |
| CHALLENGE-GENERATION | yes | yes | yes | 3 titles | 1 scripts |
| PLANNING-DEPLOYMENT | yes | no | yes | 2 titles | 0 scripts |
| PLANNING-CONTINUOUS-WAYPOINTS | yes | no | yes | 3 titles | 0 scripts |
| SEGMENT-FLIGHT-PROFILE | yes | yes | yes | 2 titles | 0 scripts |
| CURRENT-TIMELINE | yes | yes | yes | 3 titles | 1 scripts |
| DEPTH-STRUCTURED-CURRENTS | yes | no | yes | 2 titles | 1 scripts |
| DIVE-PREDICTION | yes | no | yes | 3 titles | 1 scripts |
| EXECUTE | yes | yes | yes | 2 titles | 0 scripts |
| SIMULATION-CONTROLS | yes | yes | yes | 2 titles | 0 scripts |
| SIMULATION-PHYSICS | yes | no | yes | 3 titles | 1 scripts |
| SURFACING-REPLAN | yes | yes | yes | 1 titles | 0 scripts |
| DEBRIEF | yes | yes | yes | 2 titles | 0 scripts |
| REPLAY | yes | yes | yes | 4 titles | 0 scripts |
| MISSION-EDITOR | yes | yes | yes | 4 titles | 0 scripts |
| IMPORT-EXPORT | yes | yes | yes | 3 titles | 1 scripts |
| BENCHMARK | yes | no | yes | 2 titles | 0 scripts |
| LEARNING-LAB | yes | yes | yes | 2 titles | 0 scripts |
| RESOURCE-LIFECYCLE | yes | no | yes | 3 titles | 1 scripts |
| ACCESSIBILITY | yes | no | yes | 2 titles | 0 scripts |

## Proposed Actions

| Action | Count |
|---|---:|
| KEEP_RELEASE | 59 |
| MERGE | 143 |
| KEEP_EXTENDED | 13 |
| CONVERT_TO_NODE | 7 |
| REVIEW_REQUIRED | 7 |

## Slowest Estimated Browser Workflows

| Title | Group | Tier | Proposed action | Estimated duration |
|---|---|---|---|---:|
| DIVE-UX-R1 Full Headed Contextual Segment Profile Editor Walkthrough | executionWaterColumn | extended-only | KEEP_EXTENDED | 180000 ms |
| FLOW-R2A.1 Full Headed Simulation Launch Stability Walkthrough | visualAcceptance | visual | KEEP_EXTENDED | 180000 ms |
| FLOW-R2A.2 Full Headed Visible Current Vector Walkthrough | visualAcceptance | visual | KEEP_EXTENDED | 180000 ms |
| FLOW-R2A.3 Full Headed Scientific Volumetric Current Walkthrough | visualAcceptance | visual | KEEP_EXTENDED | 180000 ms |
| FLOW-R2A.4 Full Headed Production Current Visibility Walkthrough | visualAcceptance | visual | KEEP_EXTENDED | 180000 ms |
| FLOW-R2A.5.1 Full Headed Environment Time and Layer Walkthrough | visualAcceptance | visual | KEEP_EXTENDED | 180000 ms |
| FLOW-R2A.5 Full Headed Production 4D Current Dynamics Walkthrough | visualAcceptance | visual | KEEP_EXTENDED | 180000 ms |
| FLOW-RUNTIME-R1.1 Full Headed Manual Planning Timeline Walkthrough | visualAcceptance | visual | KEEP_EXTENDED | 180000 ms |
| FLOW-RUNTIME-R1 Full Headed Canonical Current Evolution Walkthrough | visualAcceptance | visual | KEEP_EXTENDED | 180000 ms |
| THREE-R1.2C Full Headed Production Walkthrough | visualAcceptance | visual | KEEP_EXTENDED | 180000 ms |
| THREE-R2A Full Headed Replay and Debrief Walkthrough | visualAcceptance | visual | KEEP_EXTENDED | 180000 ms |
| THREE-R2B Full Headed Mission Editor Walkthrough | visualAcceptance | visual | KEEP_EXTENDED | 180000 ms |
| THREE-R3A Full Headed Phaser-Free Production Shell Walkthrough | visualAcceptance | visual | KEEP_EXTENDED | 180000 ms |
| Bathymetry Package Powers Production Planning Terrain | executionWaterColumn | release, full | KEEP_RELEASE | 90000 ms |
| Bathymetry Package Powers Production Simulation Terrain | executionWaterColumn | release, full | KEEP_RELEASE | 90000 ms |
| Bathymetry Package Powers the Standalone Bathymetric World View | executionWaterColumn | full | MERGE | 90000 ms |
| Bathymetry Package Runs From GitHub Pages Subpath | executionWaterColumn | full | KEEP_RELEASE | 90000 ms |
| Segment Flight Profiles Roundtrip Through Plan and Replay | executionWaterColumn | extended-only | MERGE | 90000 ms |
| Right Panel Segment Profile Survives Export Import and Execute | executionWaterColumn | release | KEEP_RELEASE | 90000 ms |
| Current Package Loads After Stable Main Menu Boot | coreMission | extended-only | MERGE | 90000 ms |

## Smoke Spec Disposition

R2 originally left `tests/e2e/smoke.spec.js` physically monolithic while moving tier policy into the capability manifest. R3 subsequently retired that monolith and moved the tests into capability-owned files without changing titles or assertions.
