# Predicted 3D Dive Planning

THREE-R1.2A.4 adds a renderer-neutral planned-segment dive contract for the production Mission Workspace.

## Planning Model

Surface waypoints define navigation and expected surfacing intent. They are horizontal route anchors with validation radius semantics; they are not arbitrary underwater XYZ control points and do not claim that the glider remains on the surface between waypoints.

Each route segment combines:

- start surface waypoint
- target surface waypoint
- dive profile
- target depth layer
- requested maximum depth
- feasible maximum depth after vehicle/profile/bathymetry limits
- feasible cycle count
- predicted commanded dive path
- expected current-corrected path when forecast vectors are available
- expected sample markers
- bottom turns, layer crossings, surfacing offset, and clearance warnings

The active contract is `src/core/rendering/PlannedDiveSegmentViewModel.js`. Three.js consumes that view model through `src/game/three/layers/ThreePlannedDiveTrajectoryLayer.js`; it does not construct an independent decorative sawtooth and does not own planning, simulation, sampling, or scoring.

## Visual Meaning

- Surface intent route: dashed surface line between waypoint anchors.
- Predicted dive: expected underwater profile without actual execution.
- Expected current path: forecast-current-adjusted prediction where public current vectors are available.
- Predicted sample: expected measurement location and science metadata; it never creates score events.
- Realized trajectory: actual simulated glider path and actual samples; these remain authoritative.

Actual samples and trajectories remain authoritative. Predicted sample locations are planning estimates.

## Boundary

This is a synthetic educational mission-planning model, not an operational or calibrated ocean forecast. No arbitrary XYZ waypoint planner is implemented. No WebGPU fluid simulation or new simulation engine is introduced.

Physical and exploded water-column modes use the same canonical segment trajectory. Only display coordinates change.
## THREE-R1.2A.4.1 Planning Semantics Note

Surface waypoints are executable navigation/surfacing targets. Sampling targets are non-executable scientific objectives in the water column. Dive profiles determine underwater motion between surface waypoints. Predicted samples never earn score; actual observations are authoritative. The camera and vertical exaggeration are presentation only. Multi-yo prediction and execution use shared canonical kinematics. Performance quality profiles do not change canonical results. No arbitrary XYZ route planner is implemented. No operationally calibrated glider model is claimed.


## THREE-R1.2A.4.2 Performance Closure

Three.js mission runtime performance is now measured through globalThis.ANCHOR_THREE_PERFORMANCE_DEBUG, focused smoke scripts, and focused Playwright performance/usability tests. Performance quality profiles are presentation-only. Surface waypoints remain executable navigation/surfacing anchors; sampling targets remain non-executable science objectives; multi-yo execution remains canonical core behavior. Human manual QA by the project owner remains pending.
