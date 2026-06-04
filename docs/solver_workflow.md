# Solver Workflow

Use `anchor.solver-packet.json` for external algorithms. The packet is intentionally different from a replayable challenge: it describes the planner's allowed observations, cost model inputs, rules, and expected `anchor.plan` output shape.

For A* or Dijkstra, build nodes from grid cells, use terrain/depth/hazard masks for traversability/risk, derive edge costs from agent speed/fuel and temporal current frames, and use ROI or priority targets as goals/rewards. For time-expanded graph search, use state `(cell, time/frame, fuel)` and transition through the exported frame timing.

For multi-agent planners, use `agentSpecs`, deployment zones, mission sampling rules, and shared reward state. Duplicate/depleted/cooldown/persistent sampling rules determine whether repeated coverage is useful.

For RL, use the packet's observation/action/reward/termination notes. Stochastic evaluation packets expose forecast/belief observations; oracle datasets expose hidden truth for training labels. For supervised or imitation learning, pair packets with exported `anchor.result` or `anchor.oracleDataset` trajectories.

The external tool writes `anchor.plan`. Use `executionMode: "openLoop"` for ordinary waypoint lists, `timedOpenLoop` when waypoints include expected timing, and `surfaceUpdateBundle` only when you want to preserve future surfacing-window segments for a later implementation. Policy and contingency-table plans are accepted as metadata summaries but are not executed by the browser.

During Simulation, surface and route-failure menus can export `anchor.surface-observation` and import updated waypoint data. Return `anchor.plan-segment` for the current surfaced/failed agent, or return a complete `anchor.plan`; the browser validates it and replaces future waypoints after the current simulation time.

External solvers can read a solver packet, produce an `anchor.plan`, then import that plan back into the browser game for simulation and scoring.

For a no-code demonstration of that loop, play `Tutorial 14: Import / Export Workflow`. Its packaged demo plan is `tutorials/import-demo/import-demo-waypoints.json`. `Load Built-In Demo Plan` imports it directly, while `Download Demo Plan JSON` plus `Import Waypoint Data` shows the same file-selection workflow an external A*, Dijkstra, ML, or RL planner would use after writing an `anchor.plan`.

## Steps

1. In Planning, click `Export Solver Packet JSON`.
2. Load the packet in an external script.
3. Read `planningData.visibleFields`, `level`, `mission`, and optional `planningData.planningMarkers`.
4. Generate an `anchor.plan` JSON.
5. Include `meta.solver` and `meta.name` so the game labels it as an imported solver plan.
6. Echo `levelId`, `instanceId`, and `missionId` from the packet so Planning can show an instance match indicator.
7. Import the plan in Planning.
8. Simulate and open Debrief.
9. Compare manual and solver scores if both were run in this session.

## Python Example

The repository includes a dependency-free Python example:

```bash
python tools/python/example_greedy_solver.py anchor_solver_packet.json anchor_solver_plan.json
```

Optional strategy names are `value_per_distance`, `greedy_roi`, and `nearest_roi`.

The example reads the visible planning fields from the packet, chooses ROI target cells, skips blocked terrain and hazard cells, and writes an importable `anchor.plan`. It supports multiple mission agents by creating one waypoint list per agent. The solver is a baseline teaching example, not an optimal planner.

## Pseudo-Code

```text
packet = load_json("anchor_solver_packet.json")
level = packet["level"]
mission = packet["mission"]
terrain = packet["planningData"]["visibleFields"]["terrain"]
roi = packet["planningData"]["visibleFields"]["truth"]["frames"][0]["roi"]

choose high-value water cells

write_json({
  "schemaVersion": "2.0",
  "type": "anchor.plan",
  "levelId": packet["levelId"],
  "instanceId": packet["instanceId"],
  "missionId": packet["missionId"],
  "meta": {
    "name": "My Solver Plan",
    "solver": "my-external-solver"
  },
  "agentPlans": [
    {
      "agentId": "glider_01",
      "waypoints": [
        { "window": 0, "x": 4, "y": 5, "action": "sample" }
      ]
    }
  ]
})
```

In forecast mode, solvers should use forecast fields unless the packet explicitly includes hidden truth for benchmarking. Forecast packets include:

- `challengeMode: "forecast"`
- `visiblePlanningSource: "forecast"`
- `truthVisibility: "hidden"` unless hidden truth was explicitly included
- `selectedForecastMemberId`, such as `ensemble_mean` or `forecast_1`
- `roiViewMode`, such as `expectedValue`, `value`, or `probability`
- `planningData.visibleFields.forecasts` for ensemble members
- `planningData.visibleFields.mobileHazards`
- `planningData.visibleFields.priorityTargets`
- `planningData.visibleFields.depth`

ROI cells may be numeric or objects:

```json
{ "value": 0.9, "probability": 0.35, "expectedValue": 0.315 }
```

Solvers should use `expectedValue` for conservative expected-value planning, `value` for high-reward target seeking, or `probability` for risk-averse target seeking. Mobile hazards and depth are visible planning data. The browser Temporal Greedy planner evaluates expected value at estimated arrival time and applies lightweight travel-cost, hazard, mobile-hazard, depth, uncertainty, and active-priority-target terms. The Python example applies lightweight penalties for static hazards, mobile-hazard exposure, and shallow depth, but remains deliberately simple and non-optimal.

Solver packets also include top-level `priorityTargets`, `stochasticConfig`, `missionRules`, `planningData.scoringMode`, `planningData.stochasticSeed`, `planningData.endCondition`, `planningData.sampling`, `planningData.priorityTargets`, and `planningData.riskFields`. Risk-aware solvers can use these fields to account for the active stochastic seed, ROI scoring mode, selected forecast member, probabilistic ROI outcomes, mission-end recovery/surface requirements, duplicate/depleted/cooldown sampling behavior, temporal Gold Star Targets, forecast ensemble count/disagreement, mobile hazard tracks, bathymetry/depth, and static hazard grids. These are educational approximations; they are not a full robust optimizer.

Solver packets include `deployment.agents[]` with each agent's deployment mode, zone id, allowed cells, and selected start. If `selectedStart` is null, an external solver may choose a start cell from `allowedCells` and echo it as `agentPlans[].selectedStart` in the imported plan.

Solver packets can also include `planningData.planningMarkers` when the player placed future planning notes before export. These markers preserve `x`, `y`, `t`, `window`, `type`, `label`, and optional `linkedTargetId`. They are not executable commands; a solver should treat them as hints or comments unless it intentionally converts them into waypoints in its output plan.

Debrief may report forecast regret against a lightweight truth-reference metric when available. This is a teaching signal, not an optimal solution guarantee.

When importing a plan, Planning compares the plan `instanceId` or `meta.levelIdentity.instanceId` against the active level. Matching plans show a positive indicator. Mismatched plans show a clear warning and require confirmation before import, which lets instructors intentionally test a solver plan against a different but compatible level.
