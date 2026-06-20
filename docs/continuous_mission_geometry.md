# Continuous Mission Geometry

Continuous mission geometry uses `continuousGridV1` for generated modern missions. Waypoints are still horizontal mission-route intent, but `x` and `y` may be fractional when Free Placement is active.

The containing cell remains compatibility metadata through `legacyCell` / `derivedCell`. Snap to Cell stores canonical integer grid coordinates in the current route convention. This is not arbitrary XYZ route planning; depth is expressed through dive profile and target-layer metadata.

Three.js pointer hits provide `continuousPoint`, and MissionWorkspaceScene commits accepted waypoint commands through the canonical plan helpers.

## Predicted Segment Dive Geometry

Continuous surface waypoints now feed a per-segment planned dive view model. Route points remain at surface depth in the mission intent route, while segment metadata such as `diveProfileId`, `targetDepthLayerId`, `maximumDiveDepthMeters`, `cycleCount`, and `sampleIntervalSeconds` determines the predicted underwater geometry between anchors. Physical and exploded display modes change only display coordinates, not canonical route state.

## THREE-R1.2A.4.1 Planning Semantics Note

Surface waypoints are executable navigation/surfacing targets. Sampling targets are non-executable scientific objectives in the water column. Dive profiles determine underwater motion between surface waypoints. Predicted samples never earn score; actual observations are authoritative. The camera and vertical exaggeration are presentation only. Multi-yo prediction and execution use shared canonical kinematics. Performance quality profiles do not change canonical results. No arbitrary XYZ route planner is implemented. No operationally calibrated glider model is claimed.

## Bathymetry Coordinate Convention

Bathymetry surface and mesh contracts use row-major `[y][x]` fields with cell-center vertices. Depth is positive downward in meters and maps to negative render Y. No new half-cell offset or visual-mesh authority is introduced.
