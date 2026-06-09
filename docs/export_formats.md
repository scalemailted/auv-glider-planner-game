# Export Formats

ANCHOR uses separate JSON products for different workflows.

The app remains static. These files are the data API: export JSON from the browser, run external tools, import `anchor.plan`, simulate/score it, then export `anchor.result` or leaderboard records.

## `anchor.challenge.json`

`type: "anchor.challenge"` is the replayable challenge format. It contains level identity, mission identity, challenge mode, generation config, visible map data, terrain/depth/hazards, deployment/recovery zones, agents, mission/scoring rules, time config, leaderboard identity, and visibility metadata.

Deterministic challenges include truth fields because there is no hidden state. Public stochastic challenge exports omit plain hidden truth and include a non-cryptographic checksum. They may include an opaque browser-obfuscation bundle for reload convenience, with a warning that browser-only secrecy is cheat-resistant only.

Generated challenge exports should preserve replay seed metadata when available:

```json
{
  "challengeId": "CHALLENGE-...",
  "replaySeedAnchor": "CHALLENGE-...",
  "generationVersion": "anchor-generator-v1",
  "generationConfig": {},
  "derivedSeeds": {
    "terrain": "...",
    "currents": "...",
    "roi": "...",
    "hazards": "...",
    "depth": "...",
    "targets": "...",
    "forecast": "...",
    "truth": "...",
    "mission": "..."
  }
}
```

Generated challenge exports also preserve `currentFieldConfig`. This records the selected static/dynamic current mode, base flow preset, evolution behavior and speed, explicit `timeMode`, `cycleDurationHours`, `frameInterpolation`, `dynamicComplexity`, variation levels, additive layer presets/weights/influence masks, and stochastic forecast-confidence settings when present. The generated challenge default is `Topology-Aware Composite`, a synthetic topology-aware ocean-inspired field that stores seeded `topologyComposite` region metadata for open water, shoreline, channel, bay/pocket, island-wake influences, assigned regional behaviors, and complexity-scaled evolution settings. It is not validated CFD or HYCOM forecast data. Continuous synthetic fields use scaled mission time without exhausting a finite frame list; looping fields wrap by cycle duration; clamped/frame fields declare that finite timeline behavior. The exported temporal current frames remain the authoritative solver input, while the config explains and reproduces how those frames were generated from the replay seed anchor.

When a setup imports `anchor.flow-field`, challenge exports preserve `importedFlowField` as well. Imported fields may embed validated static/dynamic vector frames or a synthetic `currentFieldConfig`; challenge terrain still supplies the land/water boundary mask for topology-aware risk and deflection.

Exact replay prefers a saved challenge snapshot. If no snapshot is available, replay may be exact via UUID only when the UUID seed anchor, compatible generator version, generation config, and required derived seeds are present. Older records missing these fields should be labeled unavailable or approximate rather than silently regenerated with a new seed.

## `anchor.solver-packet.json`

`type: "anchor.solverPacket"` is input for external planners. It contains the information an algorithm is allowed to use: grid/layers, deployment options and selected starts, agent specs, duration/surfacing windows, scoring/sampling rules, ROI/current forecast data, priority targets, cost-model notes, end conditions, stochastic metadata, and an `algorithmSupport` section for graph search, multi-agent planning, RL, supervised learning, and neural planners.

In stochastic mode, ordinary solver packets include forecast/belief fields, not hidden truth. Oracle-mode packets are only for benchmarking.

Solver packets include `currentFieldConfig` and `currentFieldVisibility`. Fair stochastic packets expose the forecast-visible current frames/config and confidence metadata, including current time behavior, but withhold hidden truth unless oracle export is explicitly requested. For topology-aware generated fields, packets may expose source/config metadata such as `fieldMode`, `timeMode`, `evolutionBehavior`, `dynamicComplexity`, `topologyAware`, `boundaryMode`, region assignments, and fairness/source labels. The visible temporal current frames remain the numerical input solvers should plan against.

Solver packets also include `importedFlowField` when a challenge used one, plus the generated visible temporal current frames. Imported field source metadata declares whether the field is forecast-visible, truth-visible, or oracle.

## `anchor.flow-field.json`

`type: "anchor.flow-field"` is an optional current-field import format for challenge setup. It supports frame-based currents with finite `{u,v}` vectors and strictly increasing frame times, or a synthetic config using the same presets/layers/evolution controls as challenge setup. Sampling metadata declares `timeMode` (`continuous`, `looping`, `clamped`, or `frames`) and `linear`/`nearest` frame interpolation. Boundary conditions can request `none`, `riskOnly`, `dampenIntoLand`, `deflectAlongShore`, or scaffolded `wakeApproximation`. Imports must match the setup grid size; challenge terrain remains authoritative for coastlines and land boundaries.

Imported flow fields should declare whether they are forecast-visible, truth-visible, or oracle-only. If they include synthetic topology-aware config, preserve `topologyComposite`, `dynamicComplexity`, region behavior metadata, and boundary settings so replay and solver comparison remain explainable.

Google Colab is supported through `tools/python/notebooks/anchor_external_solver_template.ipynb`. The notebook loads this packet, builds a lightweight headless planning world from visible fields, writes `anchor.plan.json`, and leaves validation/simulation/scoring to the browser game.

The notebook can also call the Node.js headless solver:

```bash
node tools/js/headless_solver.mjs anchor.solver-packet.json anchor.plan.json
```

That script reads the same solver packet, uses visible forecast fields by default, imports portable core JavaScript helpers, and writes an importable `anchor.plan`.

## `anchor.demo.*.json`

`type: "anchor.demo.flow-field"`, `"anchor.demo.sample-roi-field"`, `"anchor.demo.coupled-fields"`, and `"anchor.demo.uncertainty-forecast"` are single-frame demo artifact exports for notebooks, Colab, slides, and external visualization.

Each demo console has an `Export Demo JSON` button and an `Export Mode` selector. `Current Frame` exports the field state at the current demo time. `Time Window` reveals start time, end time, and timeframe count controls, then exports a `frames[]` series sampled from the current demo settings. The export captures schema version, artifact type, demo name, generation timestamp, scene config, row-major grid metadata, current demo time, field sampling time, displayed field arrays for the current visible frame, selected-cell inspector payload when a cell is selected, units/coordinate notes, and sampled frames for the requested time range. Sample / ROI demo exports also include `behaviorPreset` metadata with preset id, label, category, and modified state. Frame counts are capped at 240 in the browser to avoid accidental huge downloads.

Coordinates use top-left origin and row-major indexing. Array access is `field[row][col]`; the cell-center sample point is `x=(col+0.5)/width`, `y=(row+0.5)/height`. Time is in demo seconds. `schemaVersion` is `1.1`. `timeSampling.kind` is `singleFrame` for Current Frame and `timeSeries` for Time Window. `timeSampling.timesSeconds` lists the exact sampled times. Flow exports include `u`, `v`, `magnitude`, `directionRadians`, `landMask`, and topology/boundary diagnostics. Sample/ROI exports include displayed sample value, event likelihood `L(x,y,t)`, raw base value, evolved value when available, activity diagnostics, and behavior preset metadata when a preset is selected or modified. Coupled exports include both composed flow and coupled sample grids. Uncertainty exports include displayed value, forecast, truth, uncertainty, information gain, forecast error, and delta-after-update layers, with fairness metadata marking truth as educational/demo-only.

Minimal notebook loader:

```python
import json
import matplotlib.pyplot as plt

with open("anchor-flow-field-demo-20260609-120000Z.json", "r", encoding="utf-8") as f:
    artifact = json.load(f)

grid = artifact["grid"]
fields = artifact["fields"]
plt.imshow(fields.get("magnitude") or fields["sample"]["displayedValue"])
plt.title(f'{artifact["source"]["demo"]} at t={artifact["timeSampling"]["timeSeconds"]}s')
plt.colorbar()
plt.show()

for frame in artifact["frames"]:
    print(frame["demoTimeSeconds"], frame["fields"].keys())
```

Time-window sample/ROI loading:

```python
import json
import numpy as np
import matplotlib.pyplot as plt

with open("anchor-sample-roi-field-demo-timeseries-20260609-120000Z.json", "r", encoding="utf-8") as f:
    data = json.load(f)

times = data["timeSampling"]["timesSeconds"]
frames = [np.array(frame["fields"]["sampleValue"]) for frame in data["frames"]]

plt.imshow(frames[0])
plt.title(f"t={times[0]} seconds")
plt.colorbar()
plt.show()
```

Schema documentation lives at [`../schemas/demo-artifact.schema.json`](../schemas/demo-artifact.schema.json). Demo artifacts are visualization/research snapshots; solver validation should still use solver packets, challenge exports, plans, results, and oracle datasets as appropriate.

## `anchor.plan.json`

`type: "anchor.plan"` is the imported/exported route format. It supports executable `openLoop` and `timedOpenLoop` plans now, preserves `surfaceUpdateBundle` metadata with a safe import warning, and recognizes `policy` / `contingencyTable` as non-executable scaffolds. Planner metadata declares whether the route used forecast, truth, or oracle data.

Invalid imported plans receive shared route diagnostics in import metadata and headless validation output. Each diagnostic has `type: "route_validation_diagnostic"`, `schemaVersion: "1.0"`, `severity`, `category`, segment cells, blocked/reported cells when available, a human explanation, and a solver-oriented `fixHint` plus `plannerFeedback`.

`waypoint_exceeds_mission_duration` is a warning when the segment is otherwise legal. A final over-duration waypoint may be a terminal carry-through instruction with `runtimeBehavior: "truncate_at_mission_end"`. The browser simulation travels toward it until mission time expires and debriefs normally. Do not treat this category as a hard route failure by itself.

External-solver plans should include:

```json
{
  "executionMode": "timedOpenLoop",
  "planner": {
    "name": "colab-template-greedy-v1",
    "type": "importedSolver",
    "usesForecast": true,
    "usesTruth": false,
    "usesOracle": false,
    "source": "external"
  }
}
```

The fair default is forecast-only and non-oracle. Colab proposes; ANCHOR validates, simulates, and scores.

## `anchor.plan-segment.json`

`type: "anchor.plan-segment"` is a recovery/update segment for a surfaced or failed glider. It includes `agentId`, `startTime`, optional `endTime`, `anchorMode`, future `waypoints`, and planner fairness metadata. Simulation imports validate it and replace future waypoints for that agent after the current simulation time.

## `anchor.surface-observation.json`

`type: "anchor.surfaceObservation"` is exported from surfacing and route-failure menus. It captures current time, agent positions/battery/status, the active plan, and the decision context so an external solver can return `anchor.plan-segment` or `anchor.plan`.

## `anchor.oracle-dataset.json`

`type: "anchor.oracleDataset"` is a research/training artifact. It includes the public challenge data plus hidden truth, forecast fields, truth/forecast metadata, terrain/reachability masks, ROI/current arrays, priority target states, optional trajectories, attempts, result labels, and a feature spec.

This export is labeled: Research/oracle export. Contains hidden truth. Do not use for fair player planning.

## `anchor.result.json`

`type: "anchor.result"` preserves one run: challenge identity, label/source, submitted plan, selected starts, planning markers, execution frames, trajectories, sampled cells, score/energy/hazard summaries, route failure decisions, stochastic seed/run data, debrief metrics, event log, and raw result payload.

Result exports include replay metadata when available: `challengeId`, `replaySeedAnchor`, `generationVersion`, `generationConfig`, `derivedSeeds`, `replaySeedContract`, and `exactReplay`. They also preserve planner fairness metadata and imported-plan validation metadata when present.

## `anchor.leaderboard.json`

`type: "anchor.leaderboard"` stores local challenge records by instance id. Records include attempts, best score, best plan, full saved plan/result blobs when available, per-attempt `pathSummary`, timestamps, labels, challenge reference, and optional embedded challenge data for replay. Planning uses those records to draw the best prior path overlay and to rerun, load, or export the top saved plan for the current challenge.

Best-path exports are derived from the saved leaderboard/best-attempt record. They should carry the saved plan/result blobs when available, replay seed contract metadata, exact replay availability, planned-path and actual-path availability, and route diagnostics if the saved attempt contains imported-plan validation feedback or route-failure events.

Related schemas live in [`../schemas/`](../schemas/). The schema files are documentation-oriented and runtime validation remains intentionally lightweight.
