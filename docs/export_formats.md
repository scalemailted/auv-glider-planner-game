# Export Formats

ANCHOR uses separate JSON products for different workflows.

The app remains static. These files are the data API: export JSON from the browser, run external tools, import `anchor.plan`, simulate/score it, then export `anchor.result` or leaderboard records.

## `anchor.challenge.json`

`type: "anchor.challenge"` is the replayable challenge format. It contains level identity, mission identity, challenge mode, generation config, visible map data, terrain/depth/hazards, deployment/recovery zones, agents, mission/scoring rules, time config, leaderboard identity, and visibility metadata.

Deterministic challenges include truth fields because there is no hidden state. Public stochastic challenge exports omit plain hidden truth and include a non-cryptographic checksum. They may include an opaque browser-obfuscation bundle for reload convenience, with a warning that browser-only secrecy is cheat-resistant only.

## `anchor.solver-packet.json`

`type: "anchor.solverPacket"` is input for external planners. It contains the information an algorithm is allowed to use: grid/layers, deployment options and selected starts, agent specs, duration/surfacing windows, scoring/sampling rules, ROI/current forecast data, priority targets, cost-model notes, end conditions, stochastic metadata, and an `algorithmSupport` section for graph search, multi-agent planning, RL, supervised learning, and neural planners.

In stochastic mode, ordinary solver packets include forecast/belief fields, not hidden truth. Oracle-mode packets are only for benchmarking.

Google Colab is supported through `tools/python/notebooks/anchor_external_solver_template.ipynb`. The notebook loads this packet, builds a lightweight headless planning world from visible fields, writes `anchor.plan.json`, and leaves validation/simulation/scoring to the browser game.

The notebook can also call the Node.js headless solver:

```bash
node tools/js/headless_solver.mjs anchor.solver-packet.json anchor.plan.json
```

That script reads the same solver packet, uses visible forecast fields by default, imports portable core JavaScript helpers, and writes an importable `anchor.plan`.

## `anchor.plan.json`

`type: "anchor.plan"` is the imported/exported route format. It supports executable `openLoop` and `timedOpenLoop` plans now, preserves `surfaceUpdateBundle` metadata with a safe import warning, and recognizes `policy` / `contingencyTable` as non-executable scaffolds. Planner metadata declares whether the route used forecast, truth, or oracle data.

Invalid imported plans receive shared route diagnostics in import metadata and headless validation output. Each diagnostic has `type: "route_validation_diagnostic"`, `schemaVersion: "1.0"`, `severity`, `category`, segment cells, blocked/reported cells when available, a human explanation, and a solver-oriented `fixHint` plus `plannerFeedback`.

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

## `anchor.leaderboard.json`

`type: "anchor.leaderboard"` stores local challenge records by instance id. Records include attempts, best score, best plan, full saved plan/result blobs when available, per-attempt `pathSummary`, timestamps, labels, challenge reference, and optional embedded challenge data for replay. Planning uses those records to draw the best prior path overlay and to rerun, load, or export the top saved plan for the current challenge.
