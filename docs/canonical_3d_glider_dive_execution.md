# Canonical 3D Glider Dive Execution

## Test-scenario clarification

Glider 2 and Glider 3 may intentionally have zero waypoints.

This is a valid single-active-glider test configuration used to shorten manual QA. Do not:

- auto-generate routes for idle gliders
- reject execution merely because optional fleet members are idle
- infer that zero-waypoint Glider 2 or Glider 3 explains the routed glider's missing dive behavior
- require every configured glider to participate unless the mission objective explicitly requires fleet participation

For the primary DIVE-R1 browser and headed tests:

- Glider 1 is the active routed glider
- Glider 1 has a valid deployment and executable route
- Glider 1 has a modern non-surface dive profile
- Glider 2 and Glider 3 remain intentionally idle
- assertions about descent, ascent, samples, and realized depth apply to Glider 1
- idle gliders should remain surfaced and produce no fabricated observations

## Volumetric science-field requirement

The purpose of the dive test is not only to move the glider mesh vertically.

The canonical environmental science field must support `A(x, y, z, t)`. At one fixed horizontal position, values at different depths may differ:

- `A(x, y, surface, t)`
- `A(x, y, thermocline, t)`
- `A(x, y, midwater, t)`
- `A(x, y, deep, t)`

These values must not be copies of one top-down field unless the mission explicitly declares an integrated or depth-invariant field.

Audit and verify:

- each operational depth layer has a canonical source field
- depth fields may be correlated but are not necessarily identical
- interpolation between layer depths is deterministic
- actual sampling uses actual glider x, y, z, and t
- an observation records actual depth, resolved layer, and sampled value
- target-depth metadata cannot award a deep sample when the glider remained near the surface
- surface-only and deep-dive profiles over the same horizontal route may produce different science observations and depth-coverage outcomes
- Three.js only visualizes these values; it does not create them

The browser simulator owns canonical dive execution. Planning assigns horizontal waypoints plus optional `diveProfileId`, `targetDepthLayerId`, and maximum depth metadata. Simulation resolves that intent through the portable physics and dive-state modules.

Three.js renders predicted and realized dive trajectories, pitch, depth, observations, and route state from public-safe view models. It does not own vehicle physics, route validation, observations, scoring, or result generation.

The model is educational and synthetic. It is not a calibrated vehicle controller, sea-trial validation, or calibrated ocean forecast.

## Planning Prediction Boundary

Planning prediction uses the renderer-neutral `PlannedDiveSegmentViewModel` to preview the selected segment profile, expected current drift, depth-layer crossings, bottom turns, bathymetry clearance, and expected samples. Simulation execution remains authoritative for actual glider state, observations, surfacing, and score. The current parity smoke checks no-current single-cycle depth/phase/layer agreement; multi-yo execution parity remains a later hardening target.

## THREE-R1.2A.4.1 Planning Semantics Note

Surface waypoints are executable navigation/surfacing targets. Sampling targets are non-executable scientific objectives in the water column. Dive profiles determine underwater motion between surface waypoints. Predicted samples never earn score; actual observations are authoritative. The camera and vertical exaggeration are presentation only. Multi-yo prediction and execution use shared canonical kinematics. Performance quality profiles do not change canonical results. No arbitrary XYZ route planner is implemented. No operationally calibrated glider model is claimed.

## Terrain-Aware Launch Metadata

Launch payloads may include a frozen terrain-aware validation report and summary. Simulation result exports and Debrief can display that launch readiness separately from actual execution summaries. Official scoring remains unchanged.
