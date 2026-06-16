# Benchmark Modes

P0 defines the benchmark architecture skeleton. P1 adds adapter-only route-execution and mission-evaluation contracts that wrap existing planning, simulation, and debrief data. P1 does not implement a new planner, redesign scoring, or add MARL.

Benchmark modes separate five contracts:

- world model: which environment fields exist
- information access: what the player or solver may see
- objective authority: who chooses the mission objective
- route authority: who chooses the path or action
- evaluation and trace export: how future runs will be compared and recorded

## Planner Benchmark

`plannerBenchmark` fixes the objective before the run. The player or solver chooses the route/path for that given objective.

- objective authority: `fixed`
- route authority: `playerOrSolver`
- default information access: `forecastOnly`
- default fairness label: Forecast-only
- default world-model tier: `flowCoupledAction`

This mode is for comparing manual planning, Greedy Planner routes, imported routes, and future solver packets against the same objective. In P1 it can export episode configs and describe route-execution records, while execution still uses the existing mission workspace, simulator, and Debrief.

## Adaptive Benchmark

`adaptiveBenchmark` lets a transparent rule-based mission manager choose or update the next objective after observations, belief updates, or diagnosis. The player or solver still chooses the route/path for the active objective.

- objective authority: `missionManager`
- route authority: `playerOrSolver`
- default information access: `beliefOnly`
- default fairness label: Belief-only
- default world-model tier: `stochasticBelief`

This mode is intended for forecast correction, hidden-event confirmation, boundary mapping, source follow-up, and stale-region revisit. P6 adds a transparent mission-manager contract, diagnosis model, objective-transition policy, preview fixtures, and adaptive exports. It does not execute adaptive routes, add a new planner, redesign scoring, or add MARL/RL.

## Full Autonomy Benchmark

`fullAutonomyBenchmark` is a future solver/agent-facing mode where the solver or agent chooses both objectives and routes.

- objective authority: `solverOrAgent`
- route authority: `solverOrAgent`
- default information access: `beliefOnly`
- default fairness label: Belief-only
- default world-model tier: `plannerMission`

This is only a placeholder in P0. It is not MARL, RL training, mission scoring, or full route planning yet.

## Information Access Tiers

- `oracleTruth`: hidden truth or oracle fields are visible. Fairness label: Oracle / truth-assisted.
- `forecastOnly`: forecast or expected state is visible. Fairness label: Forecast-only.
- `beliefOnly`: updated belief and uncertainty are visible, but hidden truth is not. Fairness label: Belief-only.
- `debugAll`: developer/debug view only, not a fair benchmark tier.

## World Model Tiers

- `deterministicOracle`: known deterministic process, flow, and constraints.
- `stochasticBelief`: hidden truth, forecast, observations, belief, and uncertainty.
- `flowCoupledAction`: `A_global` science priority plus `Q_glider` action-value fields.
- `plannerMission`: future route execution and scoring.

## Objective Taxonomy

The P0 taxonomy defines objective metadata but does not implement an objective manager. Objective types include reconnaissance survey, exploiting known value, reducing uncertainty, mapping boundaries, validating forecasts, confirming hidden events, tracking features, localizing sources, revisiting stale regions, avoiding hazards, conserving energy, and cooperative coverage.

Each objective declares relevant fields, recommended Sampling Priority method hints, recommended Flow-Coupled Sampling action hints, scoring hints, and a `notA` claim boundary.

## Relationship To Existing Demos

- Uncertainty / Forecast Demo supplies hidden truth, forecast, observations, belief, uncertainty, innovation, surprise, forecast-error, and hidden-event teaching layers.
- Sampling Priority Demo supplies vehicle-independent `A_global(x,y,t)`.
- Flow-Coupled Sampling Demo supplies one-step glider-specific `Q_glider(g,x,y,t)`.
- Planner / Mission Evaluation explains how future waypoint routes should be evaluated.

The benchmark overview UI links to these sandboxes and, for Planner Benchmark, exposes a P1 setup bridge into the existing deterministic Simulation Lab setup. The bridge carries benchmark metadata; it does not create a second planning scene.

## P1 Route-Execution Contract

See [Benchmark Route Execution Contract](benchmark_route_execution_contract.md) for the episode lifecycle, route execution record, result/debrief adapter, attempt registry, fairness labels, and adapter-only boundary. P1 normalizes existing route/simulation/debrief data into benchmark records. It does not implement a new planner and does not redesign scoring.

## Export

Benchmark overview exports use:

```json
{
  "type": "anchor.benchmark.mode-config",
  "benchmarkModeConfig": {},
  "objectiveTaxonomyVersion": "...",
  "runRecordVersion": "..."
}
```

The mode-config export includes objective authority, route authority, information-access tier, world-model tier, fairness label, implemented systems, missing systems, and limitations. P1 also defines `anchor.benchmark.episode-config`, `anchor.benchmark.run-record`, `anchor.benchmark.route-execution`, and `anchor.benchmark.attempt-set` exports. P6 adds `anchor.benchmark.adaptive-manager-config`, `anchor.benchmark.adaptive-manager-state`, `anchor.benchmark.adaptive-objective-transition`, `anchor.benchmark.adaptive-surfacing-event`, and `anchor.benchmark.adaptive-manager-preview`.

## What P0/P1 Do Not Implement

P0 does not implement route planning, mission scoring, or MARL. P0/P1 do not implement new route planning algorithms, mission scoring redesign, adaptive objective management, solver training, RL, MARL, new process engines, new flow engines, or new uncertainty engines. P1 is a contract and adapter layer over existing planning, simulation, and debrief systems.

## P2 Planner Benchmark Execution

P2 makes `plannerBenchmark` executable through the existing mission loop. Planner Benchmark Setup enters the normal briefing/planning workspace, Simulation runs the existing route execution engine, and Debrief can export `anchor.benchmark.run-record`, `anchor.benchmark.route-execution`, and `anchor.benchmark.attempt-set` JSON. P2 still does not add a new planner, optimal path search, scoring redesign, adaptive objective switching, full autonomy, or MARL/RL training. See [Planner Benchmark Execution](planner_benchmark_execution.md).

## P3 Planner Benchmark Comparison

Planner Benchmark now has a Debrief comparison layer for fixed-objective attempts. Adaptive Benchmark has a P6 mission-manager preview contract, while Full Autonomy Benchmark remains contract-only. P3 does not implement route planning, mission scoring, adaptive route execution, or MARL/RL.

## P4 Planner Benchmark Route Overlay

Planner Benchmark Debrief now includes a Route Overlay / Map for existing planned or executed routes, with layer controls, segment/waypoint details, and an `anchor.benchmark.route-overlay` export. Adaptive Benchmark has a P6 mission-manager preview contract, while Full Autonomy Benchmark remains contract-only. P4 does not implement route planning, mission scoring, adaptive route execution, or MARL/RL. See [Planner Benchmark Route Overlay](planner_benchmark_route_overlay.md).

## P5 Planner Benchmark Attempt Import / Persistence

Planner Benchmark Debrief now supports compact browser-local attempt sessions, compatible benchmark artifact import, and `anchor.benchmark.attempt-session` export. Adaptive Benchmark has a P6 mission-manager preview contract, while Full Autonomy Benchmark remains contract-only. P5 does not implement route planning, scoring redesign, adaptive route execution, full autonomy, or MARL/RL. See [Planner Benchmark Attempt Import / Persistence](planner_benchmark_attempt_import_persistence.md).

## P6 Adaptive Benchmark Mission Manager

Adaptive Benchmark now exposes a mission-manager preview UI and export path. The manager uses synthetic observation, uncertainty, forecast-error, hidden-event, staleness, source-localization, hazard, and mission-state signals to recommend the next objective. The player or solver still chooses the route.

P6 adds `AdaptiveMissionManagerContract`, `AdaptiveDiagnosisModel`, `AdaptiveObjectivePolicy`, manager state, surfacing-event records, fixtures, view model, UI panel, debug fields, and adaptive benchmark exports. It does not add adaptive route execution, a new planner, scoring redesign, full autonomy, MARL/RL, or calibrated ocean data assimilation. See [Adaptive Benchmark Mission Manager](adaptive_benchmark_mission_manager.md).


## P7 Adaptive Execution Preview

Adaptive Benchmark now supports a one-leg execution preview: setup launch, existing route planning, existing simulation, debrief surfacing diagnosis, next-objective recommendation, and next-leg handoff export. Planner Benchmark remains fixed-objective comparison. Full Autonomy remains contract-only. P7 does not add route generation, scoring redesign, full multi-leg adaptive execution, or MARL/RL.

## P8 Adaptive Session Boundary

Adaptive Benchmark supports compact multi-leg session persistence and objective-history review. Planner Benchmark remains fixed-objective attempt comparison. Full Autonomy remains contract-only. P8 does not add route generation, scoring redesign, automatic full-mission execution, or MARL/RL.
