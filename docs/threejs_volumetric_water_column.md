# Three.js Volumetric Water Column

Phase: THREE-R1.2A / THREE-R1.2A.1 - Volumetric Water Column Activation and Operational Depth Slabs

The production Three.js mission world now visualizes the P11 2.5D water-column model through operational depth slabs. Planning remains top-down: a waypoint is still a horizontal grid cell, while dive profile and optional target depth layer are metadata on the selected waypoint or selected glider plan.

## Ownership Boundary

The portable core owns:

- water-column layer ids and metadata
- bottom-depth and land masks used for slab validity
- dive profiles and predicted/realized dive trajectory view models
- depth-aware observation/sample display records
- route validation, simulation, observations, scoring, and exports

Three.js owns:

- slab meshes and scalar textures
- depth-aware current vectors, observation placement, and trajectory lines
- depth-slab hit testing for inspection metadata
- camera presets for oblique, side profile, layer stack, active layer, and selected dive views

Three.js does not own planning arrays, simulation time, vehicle motion, scoring, replay semantics, route optimization, hidden truth, calibrated ocean forecasts, WebGPU fluid simulation, Python simulation, RL, or MARL.

## Display Modes

`physicalDepth` maps positive canonical `depthMeters` downward to negative world Y using the shared coordinate transform.

`explodedLayers` separates layers for inspection only. The canonical route, observations, dive profile, and scoring state are unchanged. `tools/js/audit_volumetric_display_invariance.mjs` asserts the canonical display digest remains identical between physical and exploded modes.

## Legacy Surface-Only Compatibility

Generated missions receive canonical synthetic multi-layer `waterColumnConfig` so they open as visible volumetric stacks. If an imported level or mission does not declare `waterColumnConfig`, the compositor uses an explicit surface-only fallback. This prevents older missions from implying fabricated deeper scientific layers. Missions that declare water-column config can expose the configured layer stack.

## Debug Surface

Planning and Simulation publish `globalThis.ANCHOR_WATER_COLUMN_RENDER_DEBUG` with config source, fallback status, layer ids, depth meters, world Y positions, slab/frame counts, selected depth-cell inspection, dive profile/target layer, trajectory counts, observation counts, seabed-mask counts, bottom-depth range, and ownership flags.

## Validation

Focused validation scripts:

```bash
node tools/js/smoke_operational_depth_layer_view_model.mjs
node tools/js/smoke_volumetric_mission_coordinates.mjs
node tools/js/smoke_volumetric_mission_world_view_model.mjs
node tools/js/smoke_three_operational_depth_slabs.mjs
node tools/js/smoke_depth_slab_seabed_mask.mjs
node tools/js/smoke_depth_layer_inspection.mjs
node tools/js/smoke_dive_trajectory_view_model.mjs
node tools/js/smoke_three_depth_trajectory_layer.mjs
node tools/js/smoke_three_depth_observations.mjs
node tools/js/audit_water_column_browser_headless_alignment.mjs
node tools/js/audit_volumetric_display_invariance.mjs
node tools/js/audit_three_water_column_boundaries.mjs
node tools/js/smoke_generated_mission_water_column_config.mjs
node tools/js/smoke_legacy_surface_fallback.mjs
node tools/js/smoke_visible_water_column_stack.mjs
node tools/js/smoke_surface_default_result_parity.mjs
node tools/js/smoke_three_lifecycle_null_safety.mjs
node tools/js/smoke_mission_scene_cleanup_idempotence.mjs
node tools/js/audit_volumetric_activation_boundaries.mjs
```

## Depth-Value Boundary

Volumetric slabs may show layer-specific value, actual samples, and score-by-layer summaries. Three.js must not calculate score. Actual depth-aware score events are emitted by the simulator/headless runtime through the portable science-value evaluator.

## Planned Dive Trajectory Layer

THREE-R1.2A.4 adds `ThreePlannedDiveTrajectoryLayer` for dashed surface intent paths, translucent predicted dive paths, expected current-corrected paths, bottom-turn markers, layer-crossing markers, predicted sample rings, and predicted surfacing markers. It consumes `plannedDiveSegments` from the volumetric mission view model and owns only display objects.

## THREE-R1.2A.4.1 Planning Semantics Note

Surface waypoints are executable navigation/surfacing targets. Sampling targets are non-executable scientific objectives in the water column. Dive profiles determine underwater motion between surface waypoints. Predicted samples never earn score; actual observations are authoritative. The camera and vertical exaggeration are presentation only. Multi-yo prediction and execution use shared canonical kinematics. Performance quality profiles do not change canonical results. No arbitrary XYZ route planner is implemented. No operationally calibrated glider model is claimed.

## THREE-R1.2A.4.4 Display-Cost Addendum

Context-slab LOD reduces transparent overdraw by keeping one active textured slab and rendering other visible layers as outlines in Balanced mode. This does not change water-column values, depth-layer semantics, dive-profile prediction, or bottom-boundary constraints.
