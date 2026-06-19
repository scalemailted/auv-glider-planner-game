# Three.js Volumetric Activation Hardening

Phase: THREE-R1.2A.1 / THREE-R1.2A.3 - Volumetric Activation, Continuous Geometry, and Dive Execution Hardening

This pass stabilized the transition from the P11 water-column contract into the live Three.js mission workspace. It did not add a new planner, arbitrary XYZ route editing, WebGPU fluid simulation, calibrated ocean forecasting, or a detailed bathymetric seabed mesh.

## Activation Rules

Generated missions now receive a canonical multi-layer water-column configuration during scenario creation. The default generated stack is synthetic and educational, usually `surface`, `shallow`, `thermocline`, `midwater`, and `deep`, with `surfaceOnly` as the default dive profile so existing route results remain comparable until the player selects a dive profile.

Imported legacy missions remain explicit surface-only compatibility missions unless they declare their own `waterColumnConfig`. This avoids inventing deeper science layers for old JSON artifacts.

`explodedLayers` is a visualization mode only. It separates layers for inspection but does not mutate canonical route, observation, simulation, scoring, or export state.

## Lifecycle Hardening

Planning and Simulation scene cleanup is idempotent. `threeMissionSceneLifecycleSummary(null)` returns an inactive disposed summary instead of throwing, and duplicate cleanup calls publish debug counters instead of crashing.

Main Menu transitions stop mission scenes through the Phaser scene manager and avoid direct cross-scene `shutdown()` calls.

## Debug Fields

Use `globalThis.ANCHOR_WATER_COLUMN_RENDER_DEBUG` to verify:

- `configSource`
- `fallbackUsed`
- `modernMissionActuallyVolumetric`
- `slabObjectCount`
- `volumeFrameObjectCount`
- `uniqueLayerWorldYCount`
- `minimumLayerWorldYSeparation`
- renderer boundary flags such as `ownsPlanning`, `ownsSimulation`, and `ownsScoring`

Use `globalThis.ANCHOR_SCENE_CLEANUP_DEBUG` and `globalThis.ANCHOR_SCENE_ISOLATION_DEBUG` to verify cleanup counts, cleanup errors, duplicate cleanup calls, and stale Three.js DOM removal.

Use `globalThis.ANCHOR_CONTINUOUS_MISSION_DEBUG` to verify the current coordinate profile, field sampling profile, continuous route geometry summary, canonical dive-state-machine metadata, and boundary flags. It should continue to report that the runtime does not add arbitrary XYZ route planning, calibrated ocean forecasting, WebGPU fluid simulation, or SeaExplorer-validated operational dynamics.

## Continuous Geometry and Dive Execution

THREE-R1.2A.3 adds continuous mission coordinates for waypoint placement and route sampling while preserving legacy integer cell compatibility. Free-placement waypoints keep decimal `x` / `y` values, and the simulator derives containing cells for terrain, hazard, duplicate-sample, and compatibility logic.

The canonical route remains horizontal mission geometry plus optional dive profile / target-layer metadata. The dive state machine owns simplified educational vertical execution, layer crossings, bottom-turn events, and surfacing/transmission phases. It is synthetic, deterministic, and not a calibrated glider or ocean forecast model.

Smoothed volumetric scalar rendering interpolates public-safe mission view-model fields for display only. It does not own planning, simulation, scoring, replay semantics, hidden truth, or field generation.

## Validation

Focused checks:

```bash
node tools/js/smoke_continuous_mission_geometry.mjs
node tools/js/smoke_three_lifecycle_null_safety.mjs
node tools/js/smoke_main_menu_scene_stop_contract.mjs
node tools/js/smoke_mission_scene_cleanup_idempotence.mjs
node tools/js/smoke_generated_mission_water_column_config.mjs
node tools/js/smoke_legacy_surface_fallback.mjs
node tools/js/smoke_visible_water_column_stack.mjs
node tools/js/smoke_surface_default_result_parity.mjs
node tools/js/audit_volumetric_activation_boundaries.mjs
node tools/js/audit_three_scene_isolation.mjs
node tools/js/audit_three_water_column_boundaries.mjs
```

Focused browser checks in `tests/e2e/smoke.spec.js` cover generated volumetric activation, imported legacy surface fallback, and null-safe cleanup idempotence.

Human manual QA by the project owner remains pending.

## Next Phase

THREE-R1.2B - Continuous Bathymetric Seabed Mesh, Coastline, and Landmass Geometry.
## Depth-Aware Score Profile Activation

Generated volumetric missions can carry `depthAwareScienceV1` metadata. Legacy imported surface-only missions retain `legacySurfaceScienceV1`. The selected profile is preserved in mission metadata, result summaries, and exports.
