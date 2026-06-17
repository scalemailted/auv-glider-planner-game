# Example Greedy Solver

`example_greedy_solver.py` is a dependency-light external solver example for exported ANCHOR solver packets. It uses only the Python standard library.

## Usage

```bash
python tools/python/example_greedy_solver.py solver_packet.json output_plan.json
```

Optional strategy argument:

```bash
python tools/python/example_greedy_solver.py solver_packet.json output_plan.json value_per_distance
python tools/python/example_greedy_solver.py solver_packet.json output_plan.json greedy_roi
python tools/python/example_greedy_solver.py solver_packet.json output_plan.json nearest_roi
```

## Behavior

The default `value_per_distance` strategy:

1. Reads `planningData.visibleFields` from the solver packet.
2. Uses forecast fields in forecast mode and truth fields in perfect-knowledge mode.
3. Builds a list of visible ROI cells using expected value when ROI is probabilistic.
4. Skips blocked terrain and hazard target cells.
5. Prefers straight waypoint legs that do not cross terrain or hazard cells.
6. Penalizes approximate mobile-hazard exposure and shallow-depth targets.
7. Reads probabilistic ROI as expected value (`value * probability`) and keeps the output deterministic.
8. Uses only visible packet fields; hidden truth is used only if the packet explicitly includes it for benchmarking.
9. Writes one waypoint list for each mission agent.

This is not an optimal planner. It is meant to be readable, editable, and good enough for students to inspect and improve.

The generated plan includes current import metadata:

- `executionMode: "openLoop"`
- `planner.type: "importedSolver"`
- `planner.usesForecast`
- `planner.usesTruth`
- `planner.usesOracle`

Fair leaderboard comparisons should use forecast-only non-oracle plans unless the assignment explicitly says otherwise.

The obstacle/risk checks are basic: each proposed straight waypoint leg must avoid terrain and hazard cells, mobile hazards are sampled at a few mission times, and depth is treated as a shallow-water penalty. The script does not run A*, Dijkstra, vehicle simulation, ensemble simulation, or current-aware path search.

Python is optional for browser play. If Python is unavailable locally, the browser game and Debrief comparison still work; run this script in any Python-enabled environment.

## Google Colab Template

For a notebook-first workflow, use:

```text
tools/python/notebooks/anchor_external_solver_template.ipynb
```

It loads `anchor.solver-packet.json`, reconstructs a lightweight forecast-only planning world, runs a simple greedy solver, writes `anchor.plan.json`, and reminds students that ANCHOR is still the official validator, simulator, and scorer.

## Import Back Into The Game

1. In the browser Planning scene, click `Export Solver Packet JSON`.
2. Run the Python command above.
3. In Planning, use `Import Plan JSON`.
4. Select the generated `output_plan.json`.
5. Simulate and compare the result in Debrief.
