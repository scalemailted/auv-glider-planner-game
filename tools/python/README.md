# Optional Python Tools

Python is not required to run the browser game. This folder contains optional external solver examples that read exported solver packets and write importable `anchor.plan` JSON.

## Greedy Solver Example

```bash
python tools/python/example_greedy_solver.py solver_packet.json output_plan.json
```

The example uses only the Python standard library. It ranks visible ROI cells, avoids blocked terrain and hazard targets, and writes waypoint plans for the mission agents.

See `tools/python/example_solver_readme.md` for strategy details.
