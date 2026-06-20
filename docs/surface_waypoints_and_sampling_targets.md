# Surface Waypoints and Sampling Targets

THREE-R1.2A.4.1 separates executable route anchors from science objectives.

## Surface Waypoint

A surface waypoint is an executable horizontal navigation and expected-surfacing target. It belongs to the selected glider route, appears in the waypoint timeline, participates in route validation, and may trigger surfacing, communication, or replanning behavior.

Surface waypoint semantics:

- executable: true
- navigationAuthority: true
- canonicalDepth: surface
- route/timeline entry: yes
- score authority: no, except through actual observations collected during simulation

## Sampling Target

A sampling target is a non-executable scientific objective in the water column. It stores continuous x/y/depth, layer or volume metadata, desired coverage, and optional segment attachments. It can guide dive-profile planning and coverage prediction, but it is not an arbitrary XYZ route waypoint and does not directly command the vehicle.

Sampling target semantics:

- executable: false
- navigationAuthority: false
- directlyCommandsVehicle: false
- route/timeline entry: no
- may attach to one or more surface-route segments
- may influence target layer, requested max depth, expected coverage, and compatible-profile recommendations
- canCreateScoreWithoutObservation: false

## Dive Profiles and Samples

Dive profiles determine underwater motion between surface waypoints. Predicted sample points are generated from the canonical profile predictor; they are estimates, read-only, and never earn score. Actual observations are generated during Simulation at actual x/y/depth/time and are authoritative for scoring.

No arbitrary XYZ route planner is implemented. No operationally calibrated glider model is claimed.