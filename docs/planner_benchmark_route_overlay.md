# Planner Benchmark Route Overlay

P4 adds a visual route-review overlay to Planner Benchmark Debrief.

The overlay answers: where did the route go, what happened along the way, and which parts of the route were costly, risky, redundant, or successful?

## What P4 Implements

- A defensive route geometry adapter for existing plans, results, and benchmark route-execution records.
- A route overlay view model with semantic segment and waypoint classes.
- A static HTML/SVG route overlay panel in Debrief.
- Route review layer controls for status, score contribution, energy, hazards, currents, cross-current risk, sample value, waypoint completion, and attempt comparison.
- Segment and waypoint detail tables.
- `anchor.benchmark.route-overlay` export metadata.
- Debug fields on `ANCHOR_BENCHMARK_EXECUTION_DEBUG` for overlay availability, selected layer, geometry stats, warnings, and selected segment/waypoint.

P4 does not add a new planner. P4 does not redesign scoring. P4 does not compute a better route.

## Geometry Source

The overlay prefers existing `anchor.benchmark.route-execution` segments. If segment geometry is unavailable, it falls back to ordered plan waypoints or result frame/trajectory points when those are available.

If segment-level metrics are missing, the adapter builds straight-line waypoint segments, marks the geometry partial, and includes:

`Segment-level metrics unavailable; using waypoint geometry only.`

## Overlay Layers

Supported layers are:

- `routeStatus`
- `scoreContribution`
- `energyCost`
- `hazards`
- `currentAssist`
- `currentOpposition`
- `crossCurrentRisk`
- `sampleValue`
- `waypointCompletion`
- `attemptComparison`

The view model uses semantic classes such as `segment-good`, `segment-warning`, `segment-danger`, `energy-high`, `hazard-risk`, `current-assist`, `current-opposed`, `cross-current-risk`, `waypoint-complete`, `waypoint-warning`, and `waypoint-missed`. CSS decides the colors.

## Details Panels

Segment details show available distance, energy, current assist/opposition, cross-current, hazard, status, and warnings.

Waypoint details show cell, completion status, class, and available waypoint metrics.

Missing values display as unavailable instead of causing the panel to fail.

## Multi-Attempt Behavior

The active attempt route is drawn. Other attempts in the current attempt session are listed with labels and geometry availability. P5 can import or load persisted compatible attempts; when multiple attempts have embedded geometry, the attempt-comparison layer draws the selected attempt as primary and other routes as secondary. If only one attempt is available, the panel says so.

## Export

`anchor.benchmark.route-overlay` records:

- benchmark mode and episode id
- attempt id/source, route source label, and fairness label
- selected overlay layer
- normalized route geometry
- overlay summary
- legend
- warnings and notes
- boundary flags showing existing simulator/debrief, no new planner, no scoring redesign, and no MARL/RL

## Boundary

The overlay visualizes and explains route data already planned or executed by existing systems. It is not A*, Dijkstra, RRT, MPC, RL, MARL, route optimization, official scoring, or a calibrated ocean forecast.
## P5 Import / Persistence Relationship

Route Overlay remains a review surface. P5 can provide additional attempts through local persistence or benchmark artifact import, but the overlay still draws existing planned/executed geometry and does not compute a new path, recompute scores, or add a planner.
