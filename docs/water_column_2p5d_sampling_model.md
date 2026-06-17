# 2.5D Water-Column Sampling Model

P11 adds a shared water-column contract for browser/headless artifacts. It keeps the tactical mission map top-down while allowing each cell to carry simplified depth layers such as `surface`, `thermocline`, and `deep`.

## What 2.5D Means

2.5D means the tactical map remains top-down, while each cell can contain simplified depth layers. A dive profile controls which layer the glider samples along the route. The route is still a provided waypoint route; P11 does not generate waypoints or introduce full 3D route planning.

Default depth layers:

- `surface`
- `thermocline`
- `deep`

Supported profile IDs:

- `surfaceOnly`
- `shallowDive`
- `thermoclineDive`
- `deepDive`
- `fullProfile`
- `sawtoothProfile`
- `adaptiveVerticalProfile`
- `integratedWaterColumn`

## Artifacts

Headless bundles may include:

- `water_column_summary.json` with `type: "anchor.headless.water-column-summary"`
- `depth_layer_priority.json` with `type: "anchor.headless.depth-layer-priority"`
- combined-bundle fields `waterColumnSummary` and `depthLayerPrioritySummary`
- observation/track fields `depthLayerId`, `depthMeters`, and `diveProfileId`

The depth-layer priority field summarizes `A_global_depth[layer][row][col]` and a top-down collapse. It is science priority only; it does not include route travel cost or path optimization.

## Boundaries

P11 is synthetic and educational. It is not:

- full 3D route planning
- a calibrated vertical ocean model
- a production vehicle controller
- a new planner
- production data assimilation
- MARL/RL

Recommended dive profile is context for the next leg; it does not generate a route.

## MOTION-R1 Relationship

MOTION-R1 uses the P11 water-column layer ids and dive profiles as execution context for deterministic glider motion. Dive profile affects desired depth layer and observation depth along the realized trajectory. It does not add full 3D planning, calibrated vertical ocean physics, or a route planner; the player or solver still chooses the route intent.
