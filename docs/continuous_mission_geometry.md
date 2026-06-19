# Continuous Mission Geometry

Continuous mission geometry uses `continuousGridV1` for generated modern missions. Waypoints are still horizontal mission-route intent, but `x` and `y` may be fractional when Free Placement is active.

The containing cell remains compatibility metadata through `legacyCell` / `derivedCell`. Snap to Cell stores canonical integer grid coordinates in the current route convention. This is not arbitrary XYZ route planning; depth is expressed through dive profile and target-layer metadata.

Three.js pointer hits provide `continuousPoint`, and MissionWorkspaceScene commits accepted waypoint commands through the canonical plan helpers.
