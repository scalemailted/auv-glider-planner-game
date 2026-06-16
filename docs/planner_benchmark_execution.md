# Planner Benchmark Execution

P2 makes Planner Benchmark executable through the existing ANCHOR mission loop:

1. Open Simulation Lab.
2. Open Benchmark Modes.
3. Choose Planner Benchmark.
4. Launch Planner Benchmark Setup.
5. Use the existing mission briefing and planning workspace.
6. Execute with the existing simulator.
7. Review the existing Debrief.
8. Export normalized benchmark records from Debrief.

P2 does not add a new route planner, optimal path search, scoring redesign, adaptive objective switching, full autonomy, MARL/RL training, or new environmental models.

## Episode Metadata

A Planner Benchmark episode carries:

- `benchmarkMode: "plannerBenchmark"`
- `episodeId`
- fixed objective authority
- player-or-solver route authority
- information access tier
- fairness label
- active attempt source

The metadata follows generated level and mission state into plans, simulation results, debrief, and export wrappers where practical. Legacy level, mission, plan, and result shapes remain valid.

## Records

Debrief can export:

- `anchor.benchmark.run-record`: a wrapper around a normalized `anchor.benchmark.run`
- `anchor.benchmark.route-execution`: validation, segments, metrics, and route metadata
- `anchor.benchmark.attempt-set`: one or more attempts grouped by episode
- `anchor.benchmark.route-overlay`: P4 route visualization state, normalized geometry, legend, warnings, and boundary flags

The exports normalize existing simulator/debrief metrics. They do not compute a new official score.

## Attempt Sources

P2 normalizes existing route labels into:

- `manualPlayer`
- `greedyPlanner`
- `importedSolver`
- `externalSolver`
- `oraclePlanner`
- `benchmarkPlaceholder`

Manual, Greedy Planner, and imported solver attempts can be compared under the same episode identity when they are run in the same browser session.

## Attempt Comparison

The in-memory attempt session summarizes:

- best final score
- lowest energy used
- fewest hazards
- highest sample score

P2 kept attempt sessions in memory only. P5 adds browser-local compact attempt-session persistence by episode id; existing leaderboard and result exports remain separate.

## Other Modes

In P2, Adaptive Benchmark and Full Autonomy Benchmark were contract-only placeholders. In the current P6 state, Adaptive Benchmark has a mission-manager preview and adaptive export records, but it still does not execute adaptive routes or autonomous solver/agent control.


## P3 Attempt Comparison And Route Review

P3 adds a Debrief interpretation layer over the P2 benchmark records. It shows attempt comparison, route review, fairness/source labels, and a `anchor.benchmark.comparison` export. It does not add a new planner, does not redesign scoring, and does not add MARL/RL.

## P4 Route Overlay

P4 adds Route Overlay / Map to Planner Benchmark Debrief. It draws the route from existing route-execution segments when available, falls back to waypoint geometry when segment metrics are partial, and exports `anchor.benchmark.route-overlay`. It does not add a new planner, compute optimized routes, redesign scoring, or add MARL/RL. See [Planner Benchmark Route Overlay](planner_benchmark_route_overlay.md).

## P5 Attempt Import And Persistence

P5 adds a Debrief panel for compact local attempt-session save/load, benchmark JSON import, compatible-attempt merge, and `anchor.benchmark.attempt-session` export. Imported attempts are not rerun and scores are not recomputed; stored metrics are compared as exported. See [Planner Benchmark Attempt Import / Persistence](planner_benchmark_attempt_import_persistence.md).

