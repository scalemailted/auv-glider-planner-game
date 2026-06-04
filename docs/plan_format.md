# Plan Format

`anchor.plan` is the file-based route/solution format used by manual exports and external solvers.

Required foundation fields:

- `type: "anchor.plan"`
- `schemaVersion`
- `challengeId` or `instanceId`
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

Plan import validates type, agent IDs, selected starts, waypoint coordinates, waypoint time metadata, terrain/out-of-bounds warnings, mission/challenge compatibility, surface segment timing, route audit warnings, and fairness metadata. Failed imports show a summary and do not replace the active route. Oracle-assisted imports are labeled and are not treated as fair leaderboard entries.

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
