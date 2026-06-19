# Continuous Mission Geometry

Continuous mission geometry uses `continuousGridV1` for generated modern missions. Waypoints are still horizontal mission-route intent, but `x` and `y` may be fractional when Free Placement is active.

The containing cell remains compatibility metadata through `legacyCell` / `derivedCell`. Snap to Cell stores canonical integer grid coordinates in the current route convention. This is not arbitrary XYZ route planning; depth is expressed through dive profile and target-layer metadata.

Three.js pointer hits provide `continuousPoint`, and MissionWorkspaceScene commits accepted waypoint commands through the canonical plan helpers.

## Predicted Segment Dive Geometry

Continuous surface waypoints now feed a per-segment planned dive view model. Route points remain at surface depth in the mission intent route, while segment metadata such as `diveProfileId`, `targetDepthLayerId`, `maximumDiveDepthMeters`, `cycleCount`, and `sampleIntervalSeconds` determines the predicted underwater geometry between anchors. Physical and exploded display modes change only display coordinates, not canonical route state.
