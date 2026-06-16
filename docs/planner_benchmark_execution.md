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

No persistent benchmark attempt store is added in P2. Existing leaderboard and result exports remain separate.

## Other Modes

Adaptive Benchmark and Full Autonomy Benchmark remain contract-only placeholders. Their authority splits and metadata are visible, but P2 does not execute adaptive objective management or autonomous solver/agent control.

