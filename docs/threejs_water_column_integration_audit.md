# Three.js Water Column Integration Audit

Phase: THREE-R1.2A

## Findings

- The browser renderer consumes the existing P11 water-column schema and dive-profile model; it does not add a competing science model.
- Operational depth layers are generated in `src/core/rendering/OperationalDepthLayerViewModel.js` from declared `waterColumnConfig` plus bottom-depth/land masks.
- Legacy missions without `waterColumnConfig` remain surface-only and publish `legacySurfaceOnlyFallback: true` in the volumetric boundary flags.
- `src/core/rendering/VolumetricMissionCoordinates.js` maps canonical positive-down depth to Three world Y and supports exploded-layer display without mutating canonical route or observation state.
- Depth slab hit testing reports selected layer/depth/bottom-clearance metadata for inspection while waypoint placement remains horizontal.
- Predicted and realized dive trajectories are renderer-neutral view models. Three.js renders them as lines and does not simulate them.

## Debug Objects

`globalThis.ANCHOR_WATER_COLUMN_RENDER_DEBUG` is published by both Planning and Simulation scenes. It is also mirrored inside the existing mission/simulation render debug objects as `waterColumnDebug`.

Expected boundary flags:

- `usesFree3DPlanning: false`
- `usesHorizontalWaypoints: true`
- `usesDiveProfiles: true`
- `ownsPlanning: false`
- `ownsSimulation: false`
- `ownsScoring: false`
- `changesCanonicalDepth: false`
- `usesWebGPUFluid: false`
- `usesNewPlanner: false`

## Remaining Manual QA

Human manual QA by the project owner remains pending. Use `docs/manual_threejs_water_column_checklist.md` before treating the renderer as visually accepted.

## Recommended Next Phase

THREE-R1.2B - Bathymetric Seabed Mesh, Coastline, and Landmass Geometry.
