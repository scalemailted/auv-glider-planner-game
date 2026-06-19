# Three.js Volumetric Water Column

Phase: THREE-R1.2A - Volumetric Water Column and Operational Depth Slabs

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

If a level or mission does not declare `waterColumnConfig`, the volumetric compositor uses a surface-only fallback. This prevents older missions from implying fabricated deeper scientific layers. Missions that declare water-column config can expose the configured layer stack.

## Debug Surface

Planning and Simulation publish `globalThis.ANCHOR_WATER_COLUMN_RENDER_DEBUG` with layer ids, depth meters, world Y positions, slab counts, selected depth-cell inspection, dive profile/target layer, trajectory counts, observation counts, seabed-mask counts, bottom-depth range, and ownership flags.

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
```
