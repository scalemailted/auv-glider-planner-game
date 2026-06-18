# Motion Cost Graph and Adjacency Matrix

SIM-R1 adds a browser/headless benchmark artifact layer for inspecting motion costs without creating a route planner.

The implemented artifacts are:

- `anchor.benchmark.feasibility-cost-graph`
- `anchor.headless.motion-cost-matrix`

They are produced by Node/OceanBox-JS when cost graph generation is explicitly enabled. The graph estimates directed edge costs between candidate nodes using public-safe fields: current vectors `F_u/F_v`, hazard, constraint mask, bathymetry/depth context when available, water-column depth layer metadata, and the deterministic motion configuration. The matrix is an adjacency/cost export derived from feasible or warning graph edges.

## What It Does

The graph builder creates nodes from one of these sources:

- `regularGrid`
- `bathymetryAccessibleGrid`
- `samplingPriorityCandidates`
- `planWaypoints`
- `importedSolverNodes`

Neighbor modes are:

- `grid4`
- `grid8`
- `radius`
- `planSequence`
- `allPairsSmallGraph`

Each edge records distance, duration, energy cost, current assist/opposition, cross-current, expected track error, hazard exposure, bathymetry risk, destination science priority, status, and weighted cost. Directed edges are asymmetric by default because currents and vehicle costs can differ by travel direction.

## CLI Usage

Example:

```bash
node tools/js/headless_oceanbox.mjs simulate --seed sim-r1-demo --width 16 --height 10 --cost-graph --cost-graph-grid-step 4 --cost-graph-max-nodes 32 --cost-matrix-format sparse --combined-json --no-hidden-export --out runs/sim-r1-demo
```

Useful flags:

- `--cost-graph`
- `--cost-graph-metric energy|time|distance|balanced`
- `--cost-graph-node-source regularGrid|samplingPriorityCandidates|planWaypoints`
- `--cost-graph-neighbor-mode grid4|grid8|radius|planSequence|allPairsSmallGraph`
- `--cost-graph-grid-step <n>`
- `--cost-graph-max-nodes <n>`
- `--cost-graph-radius <n>`
- `--cost-graph-departure-times <seconds,...>`
- `--cost-matrix-format sparse|dense|auto`

Outputs may include:

- `motion_cost_graph.json`
- `motion_cost_matrix.json`
- `motionCostGraph`, `motionCostMatrix`, `motionCostGraphSummary`, and `motionCostMatrixSummary` in `bundle.json`

## Browser Viewer

The Headless Bundle Viewer displays a Motion Cost Graph section when a loaded bundle includes graph or matrix summaries. The panel shows metric id, node source, neighbor mode, node count, edge count, feasible edge count, matrix format, mean cost, mean energy, current opposition, cross-current, and public-safety status.

The browser summary export includes `motionCostGraphSummary` and keeps the same boundaries as the bundle viewer.

## Boundaries

The SIM-R1 graph layer does not choose a route. SIM-R1 cost graph artifacts do not optimize a path, generate waypoints, change browser scoring, certify operational feasibility, claim SeaExplorer-specific validation, use WebGPU fluid simulation, add a Python simulator, or implement MARL/RL.

Public graph and matrix exports must not include hidden truth fields such as `T_hiddenTruth`. Hidden truth remains limited to explicit oracle/debug bundles.

## Validation

Focused checks:

```bash
node tools/js/smoke_motion_cost_graph_schema.mjs
node tools/js/smoke_motion_cost_graph_nodes.mjs
node tools/js/smoke_motion_cost_graph_neighbors.mjs
node tools/js/smoke_motion_cost_graph_edge_cost_estimator.mjs
node tools/js/smoke_motion_cost_graph_builder.mjs
node tools/js/smoke_motion_cost_graph_matrix_exporter.mjs
node tools/js/smoke_motion_cost_graph_public_safety.mjs
node tools/js/smoke_headless_cost_graph_runtime.mjs
node tools/js/smoke_headless_roundtrip_cost_graph.mjs
node tools/js/smoke_headless_cost_graph_viewer_panel.mjs
node tools/js/audit_motion_cost_graph_boundaries.mjs
```
## SCORE-R1 Shadow Mission Outcome Scoring

SCORE-R1 is shadow benchmark scoring. It does not replace official browser scoring, Challenge Mode scoring, leaderboard ranking, or existing debrief totals. Profiles are objective-aware and versioned; missing data is explicit; regret requires a compatible reference, and best-known attempt does not mean optimal. The Node/OceanBox-JS runtime remains the canonical headless runtime. Python/Colab analyzes exported artifacts or invokes Node; no Python simulator, planner, optimizer, MARL/RL, operational certification, SeaExplorer validation, or calibrated ocean forecast is added.

See [Mission Scoring and Regret](mission_scoring_and_regret.md) for the SCORE-R1 artifact contract and boundaries.