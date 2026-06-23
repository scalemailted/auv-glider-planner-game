# FLOW-RUNTIME-R1 Timeline-to-GPU Current Evolution Audit

Date: 2026-06-23
Phase: FLOW-RUNTIME-R1 - Canonical Timeline-to-GPU Current Evolution Repair

## Verified Baseline

SCI-VALID-R1 already established that the canonical production current field varies over time. This pass treated static browser vectors as a runtime integration defect, not a current-equation defect.

Pre-edit gates passed:

- `npm.cmd run audit:packages`
- `npm.cmd run test:science`
- `npm.cmd run check`
- `npm.cmd run test:packages`

The app entry point remains `index.html -> src/game/main.js`.

## Reproduction Summary

The owner-visible failure was consistent with the production path failing after canonical sampling: current equations and source fields were dynamic, but browser presentation could reuse stale current buffers when the simulation presentation scheduler classified an engine step as vehicle motion only.

Representative normal generated Challenge probe:

| Stage | Time A | Time B | Changed | Evidence |
|---|---:|---:|---:|---|
| Planning timeline value | 7200 | 21600 | yes | `smoke_current_planning_time_binding` |
| Current presentation time | 7200 | 21600 | yes | glyph summary `currentPresentationTimeSeconds` |
| Source bracket | 0-28800 | 0-28800 | same bracket | `smoke_current_interpolation_fraction_updates` |
| Interpolation fraction | 0.25 | 0.75 | yes | source sample metadata |
| Canonical U/V | finite | finite | yes | sample delta 0.0179 |
| Render data digest | digest A | digest B | yes | `currentDataDigest` changed |
| Direction attribute digest | digest A | digest B | yes | `currentDirectionDigest` changed |
| Matrix digest | digest A | digest B | yes | `currentMatrixDigest` changed |
| Upload counter | 1 | 2 | yes | direction/matrix upload counts increment |

## First Broken Stage

Classification: dirty-category failure in the live simulation presentation scheduler.

The sampler, water-column explorer cache, renderer current-frame signature, and glyph fingerprint were already time-aware. The missing link was that simulation `motionSnapshot` frames advanced canonical engine time but did not mark `currentVectors` dirty. That allowed pose/trajectory presentation to update while current buffers stayed on the last uploaded time.

Planning now also marks timeline changes with an explicit current-time dirty flag before refreshing the Three view model.

## Repair

The repaired path is:

canonical mission/simulation time -> `currentPresentationTimeSeconds` -> `WaterColumnLayerExplorerViewModel.activeTimeSeconds` -> `sampleOceanCurrent(... timeSeconds)` -> interpolation-aware current cache key -> renderer current-frame signature -> instanced glyph fingerprint -> matrix/color upload -> rendered pixels.

Changes made:

- Added explicit current dirty flags: `CURRENT_SOURCE_DIRTY`, `CURRENT_TIME_DIRTY`, `CURRENT_DEPTH_DIRTY`, `CURRENT_VISIBILITY_DIRTY`, `CURRENT_DENSITY_DIRTY`, `CURRENT_STYLE_DIRTY`.
- Simulation motion snapshots now include `currentVectors` and `CURRENT_TIME_DIRTY`.
- Planning timeline changes mark current time, scalar field, water-column, and route-status presentation dirty.
- Glyph summaries now expose update count, skipped update count, skip reason, and per-attribute upload counts.
- Glyph instance matrices and colors use dynamic draw usage and are marked for upload on time-dependent changes.
- Current debug payloads expose compact canonical time, sampler time, source bracket, interpolation fraction, digest, version, upload, and pass/fail fields without exposing complete current arrays.

## Source-Time Coverage

Normal generated regional Challenge current fields expose source time axes and bounded or periodic metadata through `ANCHOR_VOLUMETRIC_CURRENT_DEBUG`:

- `sourceTimeSeconds`
- `temporalBoundaryMode`
- `temporalPeriodSeconds`
- `validTimeStartSeconds`
- `validTimeEndSeconds`

FLOW-RUNTIME-R1 did not regenerate, retune, or re-equation current fields.

## Cache And Dirty-State Behavior

Current render identity includes current field digest, display mode, active depth/layers, density/style fields, source-time frame signature, and interpolation fraction. Camera pose is excluded from current-data cache identity.

Expected invalidation now holds:

- Timeline advance: `CURRENT_TIME_DIRTY` + `currentVectors`
- Simulation motion/step: `CURRENT_TIME_DIRTY` + `currentVectors`
- Water-column display/depth changes: current depth/visibility dirty flags + `currentVectors`
- Camera-only changes: no current-data dirty flag

## Rendering And GPU Evidence

Focused browser and Node probes confirm:

- repeated same-time update skips upload with `presentationDigestUnchanged`
- later time updates direction and magnitude digests
- later time updates instance matrix digest
- direction and matrix upload counters increment
- fixed-camera browser screenshots differ between current times
- renderer remains presentation-only (`rendererOwnsCurrent=false`, `displayChangesPhysics=false`)

Owner-review artifacts:

- `test-results/flow-runtime-r1-owner-review/01-planning-time-zero.png`
- `test-results/flow-runtime-r1-owner-review/02-planning-within-bracket.png`
- `test-results/flow-runtime-r1-owner-review/03-planning-quarter-mission.png`
- `test-results/flow-runtime-r1-owner-review/04-planning-half-mission.png`
- `test-results/flow-runtime-r1-owner-review/05-planning-paused-camera-moved.png`
- `test-results/flow-runtime-r1-owner-review/06-simulation-playing.png`
- `test-results/flow-runtime-r1-owner-review/07-simulation-paused.png`
- `test-results/flow-runtime-r1-owner-review/08-simulation-after-step.png`
- `test-results/flow-runtime-r1-owner-review/09-glider-current-parity.png`
- `test-results/flow-runtime-r1-owner-review/10-return-replan.png`
- `test-results/flow-runtime-r1-owner-review/11-second-execute.png`
- `test-results/flow-runtime-r1-owner-review/12-main-menu-cleanup.png`
- `test-results/flow-runtime-r1-owner-review/qa-summary.json`

## Physics Parity

`smoke_current_glider_render_physics_parity.mjs` runs a normal generated deterministic mission through `SimulationEngine.stepOnce()` and compares:

- `TruthWorld.lastVolumetricCurrentSample`
- `agent.currentVector`
- nearby rendered current sample

The physics-applied current matched the canonical TruthWorld sample exactly in the deterministic probe. Nearby render parity uses a coarse local glyph tolerance because sparse glyph density need not sample the exact glider coordinate.

## Claim Boundary

This phase did not change:

- current-generation equations
- bathymetry
- scalar processes
- glider physics
- scoring
- mission semantics
- renderer ownership
- runtime shell ownership

Three.js only visualizes canonical current samples. It does not create environmental current motion.

## FLOW-PKG-R1 Decision

GO for FLOW-PKG-R1 only after this repaired runtime behavior is used as the package parity baseline. FLOW-PKG-R1 should extract the current contracts, sampler, metadata, diagnostics, and manufactured-field catalog behind compatibility forwarders without weakening the repaired browser timeline-to-render path.