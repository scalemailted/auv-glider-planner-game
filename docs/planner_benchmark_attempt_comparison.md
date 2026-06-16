# Planner Benchmark Attempt Comparison

P3 adds a Debrief comparison and route-review layer for Planner Benchmark attempts.

## What P3 Implements

- A pure benchmark comparison view model for existing attempts.
- A pure route-review view model for existing route execution records.
- A Debrief panel that shows attempt comparison, fairness labels, route review, and benchmark export buttons.
- A benchmark comparison export with type `anchor.benchmark.comparison`.

P3 does not add a new planner. P3 does not redesign scoring. It makes benchmark attempts easier to compare in Debrief.

## How Attempts Are Compared

The comparison uses existing metrics normalized from run records, route execution records, and result summaries. It highlights:

- best final score
- lowest energy use
- safest route by hazard count
- most efficient score-per-energy attempt when both values exist

Missing metrics are shown as unavailable instead of failing comparison.

## Route Review Meaning

Route review explains what happened during execution. It summarizes route length, energy, hazards, duplicate samples, missed waypoints, and segment cards when segment data exists.

Route review is not an optimization algorithm. It does not infer new physics or compute official scores.

## Fairness Labels

Fairness labels describe what information an attempt was allowed to use:

- `forecastOnly`: Forecast-Only
- `beliefOnly`: Belief-Only
- `oracleTruth`: Oracle / Truth-Assisted
- `debugAll`: Debug / All Layers

## Attempt Sources

Student-facing labels are used in Debrief:

- `manualPlayer`: Manual Plan
- `greedyPlanner`: Greedy Planner
- `importedSolver`: Imported Solver
- `externalSolver`: External Solver
- `oraclePlanner`: Oracle Planner
- `benchmarkPlaceholder`: Placeholder Attempt

## Comparison Export

The comparison export type is `anchor.benchmark.comparison`. It contains attempts, rankings, comparison summary, route review, fairness labels, available benchmark export types, and boundary flags.

Boundary flags remain:

- uses existing simulator/debrief
- no new planner
- no scoring redesign
- no MARL/RL

## Relationship To P2

P2 made the existing setup, planning, simulation, and debrief flow emit benchmark run, route-execution, and attempt-set records. P3 turns those records into a readable comparison and route-review experience.

## Future Work

P4 adds route review overlays and path visualization in Debrief. Later planner execution or scoring work should stay separate from the P3/P4 interpretability layers.
## P4 Route Overlay

P4 adds a Route Overlay / Map panel, route review layer selector, segment and waypoint details, and an `anchor.benchmark.route-overlay` export. It visualizes existing planned/executed geometry and does not compute a new path, add a planner, or redesign scoring. See [Planner Benchmark Route Overlay](planner_benchmark_route_overlay.md).
