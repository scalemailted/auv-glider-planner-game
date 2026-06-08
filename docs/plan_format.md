# Plan Format

`anchor.plan` is the file-based route/solution format used by manual exports and external solvers.

Required foundation fields:

- `type: "anchor.plan"`
- `schemaVersion`
- `challengeId` or `instanceId`
- optional `replaySeedAnchor`, `generationVersion`, `generationConfig`, and `derivedSeeds`
- `missionId`
- `executionMode`
- `planner`
- `agentPlans`

Planner metadata must declare visibility/fairness:

```json
{
  "planner": {
    "name": "Temporal A*",
    "type": "importedSolver",
    "usesForecast": true,
    "usesTruth": false,
    "usesOracle": false,
    "source": "external"
  }
}
```

## Execution Modes

`openLoop` is the default. The game executes waypoints in list order with no automatic recalibration.

`timedOpenLoop` preserves `t`, `window`, and `estimatedArrivalTime` metadata. Simulation may report missed/late waypoints, but it does not re-optimize.

`surfaceUpdateBundle` stores per-surfacing-window route segments with anchor modes such as `actualSurfacePosition`. This version recognizes and summarizes the mode, preserves metadata, and warns that automatic segment application is scaffolded but not enabled.

For live surfacing and route-failure recovery, external tools can return `anchor.plan-segment` instead of a complete bundle. `Import Waypoint Data` validates the segment and replaces future waypoints for the surfaced or failed agent after the current simulation time. Plain `{ agentId, waypoints }` JSON is accepted with inferred metadata.

`policy` and `contingencyTable` are metadata-only scaffolds. The browser never executes arbitrary imported JavaScript, model code, or policy files.

## Import Validation

Plan import validates type, agent IDs, selected starts, waypoint coordinates, waypoint time metadata, terrain/out-of-bounds warnings, mission/challenge compatibility, surface segment timing, route audit diagnostics, and fairness metadata. Blocking route diagnostics reject full imported plans by default and do not replace the active route. Oracle-assisted imports are labeled and are not treated as fair leaderboard entries.

Shared route diagnostics use `type: "route_validation_diagnostic"` and stable categories such as `segment_intersects_land`, `target_on_land`, `fuel_exceeded`, `time_exceeded`, and `unknown_route_block`. Import metadata and headless validation may expose these diagnostics as `diagnostics[]` and `solverFeedback`.

`waypoint_exceeds_mission_duration` is not a hard error by itself. For a final horizon-coverage waypoint, plans may include:

```json
{
  "terminalCarryThrough": true,
  "terminalCarryThroughReason": "mission_horizon_coverage",
  "runtimeBehavior": "truncate_at_mission_end"
}
```

Simulation travels toward that waypoint until mission time expires, then stops at the reached position and debriefs normally. Hard route diagnostics such as land crossing, invalid start, non-navigable target, fuel failure, and severe hazard traversal still block execution.

## Tutorial Demo Plan

`Tutorial 14: Import / Export Workflow` includes a packaged demo plan at `tutorials/import-demo/import-demo-waypoints.json`. It is a normal `anchor.plan` with planner metadata:

```json
{
  "planner": {
    "name": "Tutorial Demo Plan",
    "type": "demo",
    "usesForecast": true,
    "usesTruth": false,
    "usesOracle": false,
    "source": "tutorial-file"
  }
}
```

The Planning Console can load this file directly with `Load Built-In Demo Plan`, or players can download and re-import it through `Import Waypoint Data`. The same importer and route validity audit are used for tutorial demo plans and external solver plans.

## Node Headless Solver Plans

`tools/js/headless_solver.mjs` writes `timedOpenLoop` plans with `planner.type: "importedSolver"` and explicit forecast/truth/oracle metadata. Default output is forecast-only and non-oracle. `--oracle` must be explicit and marks the plan as oracle-assisted.
