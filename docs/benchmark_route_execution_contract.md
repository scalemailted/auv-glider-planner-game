# P1 Planner / Mission Evaluation Route-Execution Contract

P1 connects Benchmark Modes to the existing planning, simulation, and debrief systems through contracts and adapters. This document covers the benchmark episode lifecycle, route execution record, and result/debrief adapter. It does not implement a new planner and does not redesign scoring.

## Why P1 Exists

P0 defined Planner Benchmark, Adaptive Benchmark, Full Autonomy Benchmark, authority splits, information access tiers, world-model tiers, and run-record skeletons. P1 defines how an executable benchmark episode can describe route attempts and normalize existing debrief data without replacing the game systems that already execute and score missions.

## Relation To P0 Benchmark Modes

Planner Benchmark is the first executable-oriented mode. Its objective is fixed, and a manual player, Greedy Planner, or imported solver provides the route. The route still runs through the existing mission workspace, simulator, and debrief.

Adaptive Benchmark and Full Autonomy Benchmark remain contract-only in P1. Adaptive objective updates and solver/agent objective authority are described by metadata, but not executed.

## Benchmark Episode Lifecycle

A benchmark episode uses these phases: `setup`, `briefing`, `planning`, `readyToExecute`, `executing`, `debrief`, `complete`, and `aborted`.

An episode config exports as `type: "anchor.benchmark.episode-config"` and records benchmark mode, benchmark mode config, objective, authority split, information access tier, world-model tier, fairness label, scenario/mission/level ids, seed, allowed attempt sources, required exports, and notes.

## Attempt Sources

P1 recognizes these route attempt sources:

- `manualPlayer`
- `greedyPlanner`
- `importedSolver`
- `externalSolver`
- `oraclePlanner`
- `benchmarkPlaceholder`

Planner Benchmark allows manual player, Greedy Planner, imported solver, and external solver attempts. Full Autonomy keeps solver/agent-style sources as placeholders until a later execution phase.

## Route Execution Record

A route execution record exports as `type: "anchor.benchmark.route-execution"`. It records benchmark mode, episode id, attempt id/source, route source label, fairness label, level/mission/plan/result ids, agent/waypoint/segment counts, validation summary, normalized segments, normalized metrics, diagnostics, export references, and notes.

The validation summary normalizes existing plan validation into status, executable flag, hard failures, warnings, invalid waypoint count, blocked segment count, over-duration count, fuel failures, terrain failures, and start/deployment failures.

Metrics are nullable when unavailable. They include final score, sample score, science value, energy used, elapsed time, hazards hit, duplicate samples, completed/missed waypoints, forecast regret, route length, current assist/cross-current summaries, surfacing count, objective completion, and result status.

## Result / Debrief Adapter

`BenchmarkResultAdapter` reads existing ANCHOR level, mission, plan, and result objects defensively. It builds:

- a BenchmarkRunRecord-compatible `anchor.benchmark.run`
- an `anchor.benchmark.route-execution` record
- normalized summary metrics

The adapter does not mutate inputs, does not simulate routes, and does not compute new official scores. It maps what the current simulator and debrief already produced.

## Fairness Labels

P1 keeps information-access labels explicit:

- `oracleTruth`: Oracle / truth-assisted
- `forecastOnly`: Forecast-only
- `beliefOnly`: Belief-only
- `debugAll`: developer/debug only, not a fair comparison tier

Planner metadata can upgrade a route to truth/oracle-assisted if the plan/result declares truth or oracle use.

## Metadata Attachment

Benchmark metadata can be attached to cloned level, mission, plan, and result objects. The metadata records benchmark mode, benchmark-mode config version, episode id, information access tier, objective authority, route authority, fairness label, attempt source, and world-model tier.

Existing `anchor.plan` and `anchor.result` schemas remain valid. Result export includes benchmark metadata only when it is already attached.

## Adapter-Only Boundary

P1 does not implement a new planner. It does not implement A*, Dijkstra, RRT, MPC, RL, MARL, solver training, adaptive objective switching, or a scoring redesign. It normalizes existing route/simulation/debrief data into portable benchmark records.

## Relationship To Existing Systems

Use the existing Planning scene to place or import routes. Use the existing Simulator to execute routes. Use the existing Debrief to compute score, energy, risk, route quality, and comparison rows. P1 adds portable benchmark records around those systems so Planner Benchmark can become executable in the next phase without rewriting them.

## P2 Execution Integration

P2 keeps the P1 contracts but wires them into the existing Planner Benchmark path. Benchmark metadata follows setup into generated level/mission state, plan metadata, simulation result metadata, and Debrief exports where practical. Debrief builds run-record, route-execution, and attempt-set exports from existing route/simulation/debrief data. The official scoring path is unchanged.

## P3 Debrief Comparison Layer

Route-execution records can now feed a Planner Benchmark Debrief comparison panel. The panel uses existing metrics and segment records to explain attempt outcomes. It does not change the route-execution contract, add a new planner, or redesign scoring.

## P4 Route Overlay Relationship

P4 consumes `anchor.benchmark.route-execution` records as a visualization source. The route overlay adapter preserves existing segment geometry and falls back to waypoint geometry when segment metrics are missing. It does not change the route-execution contract, compute a new path, simulate routes, or compute official scores. See [Planner Benchmark Route Overlay](planner_benchmark_route_overlay.md).
