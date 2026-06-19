# Three.js Visual and Lifecycle Parity

Phase: THREE-R1.1E - Scene Isolation and Three.js Visual/Planning Parity

## Reproduction Findings

Before this pass, a Planning -> Simulation -> Main Menu flow could leave mission DOM behind the Product Hub. The stale elements included a `.three-mission-world-host`, a `.three-mission-world-canvas`, planning overlays, timeline content, and status/performance UI. The root cause was that scene cleanup existed as class methods but was not reliably registered with Phaser scene `shutdown` and `destroy` events, and Main Menu did not defensively stop mission scenes or reset mission-only shell regions.

## Fix Summary

- Planning and Simulation now register idempotent cleanup with Phaser `shutdown` and `destroy` events.
- Main Menu now stops Mission Workspace, Simulation, and Debrief scenes before mounting Product Hub content.
- Main Menu runs a narrow shell reset that removes stale mission Three canvases, planning/simulation overlays, mission timeline content, and mission status surfaces.
- `globalThis.ANCHOR_SCENE_ISOLATION_DEBUG` reports active Phaser scenes, Three canvas/renderer counts, overlay counts, stale panel visibility, and `isolationStatus`.

## Pose / Guidance / Alignment

- Glider pose is normalized through `GliderPoseViewModel`, which keeps body heading and ground course distinct.
- The Three glider layer updates stable meshes in place and orients the body with quaternions.
- The guidance cone layer renders canonical PlanningGuidance data only; it does not calculate route feasibility.
- Mission grid helpers document the convention: columns increase east/right, rows increase south/down, world X maps east/west, world Z maps north/south, and cell objects sit at cell centers.

## Waypoint Semantics

Hard-invalid cells remain rejected before plan mutation. Waypoints whose ETA exceeds mission duration are accepted with `BEYOND_MISSION_WINDOW` warning metadata. Simulation still ends at mission duration and reports unreached waypoints through existing missed-waypoint semantics.

## Verification Status

Node smoke coverage exists for lifecycle cleanup, pose, guidance, grid coordinates, alignment, and waypoint semantics. Browser headed verification and human owner QA remain pending until the focused E2E/manual pass is run.

## THREE-R1.2A Water Column Continuity

Operational water-column slabs, depth trajectories, depth-aware observations, and active-layer current vectors are rendered as stable Three.js objects from public-safe view models. Planning and Simulation scene cleanup still owns renderer disposal; `ANCHOR_WATER_COLUMN_RENDER_DEBUG` should disappear/rebuild with the same scene lifecycle as `ANCHOR_MISSION_RENDER_DEBUG`.
