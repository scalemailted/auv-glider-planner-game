# Optional Python Tools

Python is not required to run the browser game. This folder contains optional external solver examples that read exported solver packets and write importable `anchor.plan` JSON.

## Google Colab External Solver Template

Open or upload:

```text
tools/python/notebooks/anchor_external_solver_template.ipynb
```

The notebook demonstrates the official file workflow:

```text
Export Solver Packet from ANCHOR
-> load anchor.solver-packet.json in Colab
-> build a lightweight headless planning world
-> run a starter forecast-only greedy solver
-> write anchor.plan.json
-> import the plan back into ANCHOR
-> let ANCHOR validate, simulate, and score
```

The default Colab template is non-oracle:

```json
{
  "usesForecast": true,
  "usesTruth": false,
  "usesOracle": false
}
```

Colab proposes. Game validates. Game simulates. Game scores.

The notebook also includes an optional Node.js path:

```python
import subprocess

subprocess.run([
    "node",
    "tools/js/headless_solver.mjs",
    "anchor.solver-packet.json",
    "anchor.plan.json"
], check=True)
```

Use that option when the ANCHOR repository files are available in Colab. It imports portable JavaScript core modules instead of mirroring the planner in Python.

## Greedy Solver Example

```bash
python tools/python/example_greedy_solver.py solver_packet.json output_plan.json
```

The example uses only the Python standard library. It ranks visible ROI cells, avoids blocked terrain and hazard targets, and writes waypoint plans for the mission agents.

See `tools/python/example_solver_readme.md` for strategy details.

After generating a plan, import it into ANCHOR or validate it with the optional Node.js helper when the repository is available:

```bash
node tools/js/headless_validate_plan.mjs anchor.solver-packet.json anchor.plan.json
```

Notebook/Python validation is intentionally lightweight. The browser game remains the official validator, simulator, and scorer.

## Headless Helper Package

`tools/python/anchor_headless/` contains small standard-library helpers used by the Colab template:

- `io.py` loads solver packets and writes plan JSON.
- `world.py` extracts visible forecast fields into a lightweight planning world.
- `solvers.py` contains the starter greedy forecast solver.
- `validation.py` runs basic notebook-side sanity checks.
- `export.py` writes project-compatible `anchor.plan` metadata.

These helpers are intentionally not a Python port of the browser simulator.
