# Solver Workflow

Use `anchor.solver-packet.json` for external algorithms. The packet is intentionally different from a replayable challenge: it describes the planner's allowed observations, cost model inputs, rules, and expected `anchor.plan` output shape.

## Challenge Mode vs Simulation Lab

ANCHOR has two user-facing experiences built on the same mission engine.

Challenge Mode is the playable planning-puzzle experience. It emphasizes score, stars, medals, route quality, risk warnings, leaderboard comparison, and learning strategy through play.

Simulation Lab is the reproducible experiment sandbox. It emphasizes exact configuration, deterministic/stochastic setup, dynamic current-field metadata, solver packets, replay seeds, external solver workflows, JSON import/export, and auditability.

Both modes use the same terrain, current fields, hazards, glider physics, scoring core, route validation, planner APIs, and replay/export system. Solver packet workflows are presented through Simulation Lab by default, but exported plans can be imported, validated, simulated, and saved in either Simulation Lab or Challenge Mode.

Solver packets may preserve `experienceMode`, `missionMode`, `missionRules`, `navigationUncertainty`, visible `currentFieldConfig`, visible `sampleFieldConfig`, `waypointSemantics`, replay seed metadata, and generator version metadata. Challenge Mode uses those fields through player-facing presets; Simulation Lab exposes them directly for reproducible experiments.

For A* or Dijkstra, build nodes from grid cells, use terrain/depth/hazard masks for traversability/risk, derive edge costs from agent speed/fuel and temporal current frames, and use ROI or priority targets as goals/rewards. For time-expanded graph search, use state `(cell, time/frame, fuel)` and transition through the exported frame timing.

For multi-agent planners, use `agentSpecs`, deployment zones, mission sampling rules, and shared reward state. Duplicate/depleted/cooldown/persistent sampling rules determine whether repeated coverage is useful.

ANCHOR treats the environment as two coupled planning fields. Current fields affect current-aware ETA, energy, speed over ground, risk, and route validation. Sample fields describe where and when science value exists through ROI grids, hotspots, burst windows, moving/temporal behavior, and priority targets. Fair stochastic solver packets expose forecast-visible fields and metadata; hidden truth remains withheld unless an oracle export is explicit.

For RL, use the packet's observation/action/reward/termination notes. Stochastic evaluation packets expose forecast/belief observations; oracle datasets expose hidden truth for training labels. For supervised or imitation learning, pair packets with exported `anchor.result` or `anchor.oracleDataset` trajectories.

The external tool writes `anchor.plan`. Use `executionMode: "openLoop"` for ordinary waypoint lists, `timedOpenLoop` when waypoints include expected timing, and `surfaceUpdateBundle` only when you want to preserve future surfacing-window segments for a later implementation. Policy and contingency-table plans are accepted as metadata summaries but are not executed by the browser.

Executable waypoints should include a `kind` when the solver knows the intent. Missing `kind` defaults to `navigation` for backward compatibility. Use `navigation` for normal underwater commands, `surface` for GPS/communication/update points, `samplingTarget` only for objective metadata or converted science-target waypoints, and `terminalCarryThrough` for a final horizon-filling command that may extend beyond mission duration and truncate at mission end.

During Simulation, surface and route-failure menus can export `anchor.surface-observation` and import updated waypoint data. Return `anchor.plan-segment` for the current surfaced/failed agent, or return a complete `anchor.plan`; the browser validates it and replaces future waypoints after the current simulation time.

External solvers can read a solver packet, produce an `anchor.plan`, then import that plan back into the browser game for simulation and scoring.

## External Solver Workflow With Google Colab

Google Colab is an official external-solver platform for ANCHOR's JSON workflow. The notebook is a planning mirror, not live browser control and not the official simulator.

```text
Colab proposes.
Game validates.
Game simulates.
Game scores.
```

Workflow:

1. Export Solver Packet from ANCHOR.
2. Open `tools/python/notebooks/anchor_external_solver_template.ipynb` in Colab or local Jupyter.
3. Upload or load `anchor.solver-packet.json`.
4. Run the notebook cells to inspect challenge identity, replay seed anchor, generator version, mission duration, grid dimensions, agent count, visible forecast/ROI availability, and fairness flags.
5. Let the notebook build a lightweight headless planning world from visible fields.
6. Run the starter forecast-only greedy solver.
7. Download `anchor.plan.json`.
8. Import the plan into ANCHOR.
9. Let ANCHOR validate and simulate the imported route.
10. Export `anchor.result` if you want to compare attempts or build datasets.

The default notebook planner metadata is:

```json
{
  "name": "colab-template-greedy-v1",
  "type": "importedSolver",
  "usesForecast": true,
  "usesTruth": false,
  "usesOracle": false,
  "source": "external"
}
```

Oracle mode is for benchmarking/research only. Do not compare oracle-assisted plans as fair leaderboard entries.

External solver entries are allowed in Challenge Mode. The leaderboard records `routeSource`, solver id/label when available, and fairness metadata, so a Challenge Mode table can compare Manual, Greedy Planner, External Solver, Imported Plan, and Saved Replay attempts without hiding how each route was produced. Oracle or hidden-truth assisted plans may be stored, but they are labeled as Oracle or Truth-assisted and should not be interpreted as fair forecast-visible competition.

Surface-update replanning is scaffolded as the same file contract:

```text
anchor.surface-observation.json -> anchor.plan-segment.json
```

The intended loop is: the game reaches a surface/update window, exports a surface observation, the notebook computes the next segment from the actual surfaced position, the notebook exports `anchor.plan-segment.json`, and the game imports, validates, replaces future waypoints, and continues.

This is not live browser automation. A shared-folder watcher or optional local bridge may be added later, but the current supported workflow is explicit JSON export/import.

Tool docs:

- [`../tools/python/README.md`](../tools/python/README.md)
- [`../tools/python/example_solver_readme.md`](../tools/python/example_solver_readme.md)
- [`../tools/js/README.md`](../tools/js/README.md)

### JavaScript Headless Solver From Colab

For a higher-fidelity path that avoids Python translation drift, Colab can call Node.js and run the repository's portable JavaScript core modules:

```python
import subprocess

subprocess.run([
    "node",
    "tools/js/headless_solver.mjs",
    "anchor.solver-packet.json",
    "anchor.plan.json"
], check=True)
```

The same command works locally:

```bash
node tools/js/headless_solver.mjs anchor.solver-packet.json anchor.plan.json --planner greedy
node tools/js/headless_validate_plan.mjs anchor.solver-packet.json anchor.plan.json
```

The Node path imports `src/core/headless/*` plus shared planning validation from `src/core/planning/PlanExecutionValidator.js`. It does not import Phaser scenes, DOM overlays, or browser UI modules.

Route validation diagnostics are shared between the human UI and external solver feedback. The same `route_validation_diagnostic` objects are used to mark invalid waypoints, explain Route Blocked modals, reject imported `anchor.plan` or `anchor.plan-segment` files, and report headless Node validation failures. Solvers should read `diagnostics[]` or `solverFeedback.blockingDiagnostics[]` for stable categories such as `segment_intersects_land`, `target_on_land`, `fuel_exceeded`, and `time_exceeded`, plus blocked cells and fix hints.

By default it uses visible forecast packet fields and exports:

```json
{
  "usesForecast": true,
  "usesTruth": false,
  "usesOracle": false
}
```

Oracle mode requires `--oracle` and labels the plan with `usesTruth: true` and `usesOracle: true`.

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

The example reads the visible planning fields from the packet, chooses ROI target cells, skips blocked terrain and hazard cells, and writes an importable `anchor.plan`. It supports multiple mission agents by creating one waypoint list per agent. The solver is a baseline teaching example, not an optimal planner. For the browser-native baseline planner used inside ANCHOR, see `docs/greedy_planner.md`.

The repository also includes a Colab-friendly notebook template:

```text
tools/python/notebooks/anchor_external_solver_template.ipynb
```

It uses the lightweight helpers in `tools/python/anchor_headless/` and exports a `timedOpenLoop` `anchor.plan` with explicit forecast/truth/oracle metadata.

## Pseudo-Code

```text
packet = load_json("anchor_solver_packet.json")
level = packet["level"]
mission = packet["mission"]
terrain = packet["planningData"]["visibleFields"]["terrain"]
fields = packet["planningData"]["visibleFields"]
source = packet.get("visiblePlanningSource", "forecast")
frames = fields.get(source, {}).get("frames", [])
roi = frames[0]["roi"] if frames else fields.get("roi", [])

choose high-value water cells

write_json({
  "schemaVersion": "2.0",
  "type": "anchor.plan",
  "levelId": packet["levelId"],
  "instanceId": packet["instanceId"],
  "missionId": packet["missionId"],
  "executionMode": "timedOpenLoop",
  "planner": {
    "name": "my-external-solver",
    "type": "importedSolver",
    "usesForecast": true,
    "usesTruth": false,
    "usesOracle": false,
    "source": "external"
  },
  "meta": {
    "name": "My Solver Plan",
    "solver": "my-external-solver"
  },
  "agentPlans": [
    {
      "agentId": "glider_01",
      "waypoints": [
        { "window": 0, "x": 4, "y": 5, "action": "sample", "kind": "navigation" }
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

Solvers should use `expectedValue` for conservative expected-value planning, `value` for high-reward target seeking, or `probability` for risk-averse target seeking. Mobile hazards and depth are visible planning data. The browser Greedy Planner evaluates expected value at estimated arrival time and applies current-aware travel-cost, hazard, mobile-hazard, depth, uncertainty, and active-priority-target terms. The Python example applies lightweight penalties for static hazards, mobile-hazard exposure, and shallow depth, but remains deliberately simple and non-optimal.

Current fields are visible planning data according to the packet fairness mode. Fair stochastic packets expose forecast-visible current frames/config, confidence, and source metadata. Hidden truth current frames are withheld unless an oracle export is explicit. Topology-aware fields may include `currentFieldConfig`, `dynamicComplexity`, `topologyComposite` region metadata, boundary mode, and generated temporal frames. Solvers should plan against the visible frames and may use the config/metadata to explain behavior such as shoreline risk, channel acceleration, island wakes, bay recirculation, and dynamic magnitude pulses. These fields are synthetic ocean-inspired planning data, not real HYCOM forecasts or CFD output.

Solver packets also include top-level `priorityTargets`, `stochasticConfig`, `missionRules`, `planningData.scoringMode`, `planningData.stochasticSeed`, `planningData.endCondition`, `planningData.sampling`, `planningData.priorityTargets`, and `planningData.riskFields`. Risk-aware solvers can use these fields to account for the active stochastic seed, ROI scoring mode, selected forecast member, probabilistic ROI outcomes, mission-end recovery/surface requirements, duplicate/depleted/cooldown sampling behavior, temporal Gold Star Targets, hotspot/burst sample behavior, forecast ensemble count/disagreement, mobile hazard tracks, bathymetry/depth, and static hazard grids. These are educational approximations; they are not a full robust optimizer.

Solver packets include `deployment.agents[]` with each agent's deployment mode, zone id, allowed cells, and selected start. If `selectedStart` is null, an external solver may choose a start cell from `allowedCells` and echo it as `agentPlans[].selectedStart` in the imported plan.

Solver packets can also include `planningData.planningMarkers` when the player placed future planning notes before export. These markers preserve `x`, `y`, `t`, `window`, `type`, `label`, and optional `linkedTargetId`. They are not executable commands; a solver should treat them as hints or comments unless it intentionally converts them into waypoints in its output plan.

A final waypoint beyond mission duration is allowed when the route segment is otherwise legal. This terminal carry-through pattern keeps a glider commanded until the mission time limit. Imported solvers may include it intentionally with `kind: "terminalCarryThrough"`; ANCHOR validates it as a warning with runtime truncation, not as route failure.

Result exports may include `routeQuality`, segment contribution grades, waypoint semantic events, planned and actual paths, replay diagnostics, and solver comparison metadata. Segment grades are explanatory feedback from ANCHOR after validation/simulation; external solvers do not need to reproduce the exact grade calculation to submit a plan.

Debrief may report forecast regret against a lightweight truth-reference metric when available. This is a teaching signal, not an optimal solution guarantee.

When importing a plan, Planning compares the plan `instanceId` or `meta.levelIdentity.instanceId` against the active level. Matching plans show a positive indicator. Mismatched plans show a clear warning and require confirmation before import, which lets instructors intentionally test a solver plan against a different but compatible level.
