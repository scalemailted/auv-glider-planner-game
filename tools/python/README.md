# Optional Python Tools

Python is not required to run the browser game. This folder contains optional external solver examples that read exported solver packets and write importable `anchor.plan` JSON.

## Google Colab External Solver Template

Open or upload:

```text
tools/python/notebooks/anchor_external_solver_template.ipynb
```

The notebook demonstrates the official file workflow:

```text
Export Solver yacket from ANCHOR
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

## Headless Helper yackage

`tools/python/anchor_headless/` contains small standard-library helpers used by the Colab template:

- `io.py` loads solver packets and writes plan JSON.
- `world.py` extracts visible forecast fields into a lightweight planning world.
- `solvers.py` contains the starter greedy forecast solver.
- `validation.py` runs basic notebook-side sanity checks.
- `export.py` writes project-compatible `anchor.plan` metadata.

These helpers are intentionally not a Python port of the browser simulator.

## OceanBox-JS / Node Headless Runtime

H1 does not add a Python OceanBox simulator. The canonical non-browser runtime is Node.js so it can reuse portable ANCHOR JavaScript contracts.

Colab/Python workflows should call:

```bash
node tools/js/headless_oceanbox.mjs simulate --seed demo-001 --out runs/demo
```

or load a pre-generated bundle and analyze `observations.csv`, `glider_tracks.csv`, and `score_report.json`. Node headless runtime over portable ANCHOR core logic. Browser ANCHOR remains the official visual referee and scoring UI.

## H2 Browser Bundle Loader Workflow

For browser/Colab bundle inspection, generate a public bundle with Node:

```bash
node tools/js/headless_oceanbox.mjs simulate --seed demo-001 --out runs/public-demo --no-hidden-export --combined-json
```

Then load `runs/public-demo/bundle.json` in the browser Headless Bundle Viewer or analyze the JSON/CSV files with Python standard-library `json` and `csv`. This remains artifact analysis, not a Python simulator port.

## H2.1 Checked-In Bundle Analysis

Colab/Python can load `docs/examples/headless_oceanbox_js_public_bundle.example.json` directly with standard-library `json` and inspect `bundle["observations"]`, `bundle["gliderTracks"]`, and `bundle["scoreReport"]`. That file is the same public fixture loaded by the browser Headless Bundle Viewer. Python remains an artifact-analysis or Node-calling workflow, not a second simulator.

## H3.1 Roundtrip Artifact Analysis

After Node writes `runs/h3-roundtrip/bundle.json` and `roundtrip_report.json`, or when using the checked-in `docs/examples/headless_solver_roundtrip_bundle.example.json` and `docs/examples/headless_solver_roundtrip_report.example.json`, Python/Colab can read both with standard-library `json` for analysis. The report states whether packet visibility and plan validation passed, which plan/agent was executed, whether hidden truth was exported, and that headless scoring is not official browser scoring. Python remains an artifact-analysis or Node-calling workflow, not a simulator implementation.

## P10 Adaptive Science-Diagnosis Handoff

Science diagnosis informs the mission-manager objective recommendation. It does not generate a route. Forecast correction means the expected field existed but was wrong. Hidden event hypothesis means observations may indicate a phenomenon not represented in the forecast. The player or solver still plans the route.

P10 adds adaptive science-diagnosis context, mission-manager rationale, next-leg handoff metadata, objective-history display fields, and public-safe headless/browser summaries. It does not implement a new planner, scoring redesign, production data assimilation, GP/GMRF production inference, calibrated ocean forecast, Python simulator, or MARL/RL. Node/OceanBox-JS remains the canonical non-browser runtime; Python/Colab analyze artifacts or call Node.

## MOTION-R1 Artifact Analysis

Python/Colab workflows may inspect MOTION-R1 JSON artifacts such as `motionTrajectory`, `controlTrace`, and `motionDiagnostics` from Node/OceanBox-JS bundles. Python remains an artifact-analysis or Node-calling workflow; no Python simulator is added. The JavaScript runtime remains canonical for deterministic motion replay.

ENV-R1: Python/Colab workflows may analyze `bathymetrySummary` and `missionGeometrySummary` artifacts exported by Node/OceanBox-JS. Python remains an artifact-analysis or wrapper workflow, not the simulator.

## SIM-R1 Feasibility Artifact Analysis

Python/Colab workflows may inspect MOTION-R1 mission-feasibility reports, and workflows may inspect cost graph / adjacency matrix exports and motion-cost matrices produced by Node/OceanBox-JS, while scenario-comparison reports remain future work. Python should remain an artifact-analysis or Node-calling workflow; it should not become a second simulator or claim calibrated ocean forecasting. See `../../docs/mission_feasibility_simulator_requirements.md`.
## SCORE-R1 Shadow Mission Outcome Scoring

SCORE-R1 is shadow benchmark scoring. It does not replace official browser scoring, Challenge Mode scoring, leaderboard ranking, or existing debrief totals. Profiles are objective-aware and versioned; missing data is explicit; regret requires a compatible reference, and best-known attempt does not mean optimal. The Node/OceanBox-JS runtime remains the canonical headless runtime. Python/Colab analyzes exported artifacts or invokes Node; no Python simulator, planner, optimizer, MARL/RL, operational certification, SeaExplorer validation, or calibrated ocean forecast is added.

See ../../docs/mission_scoring_and_regret.md for the SCORE-R1 artifact contract and boundaries.

## Replay Artifact Analysis

Python/Colab workflows may inspect H4.1 replay artifacts and `anchor.browser.headless-replay-summary` files as JSON artifacts. Python remains an analysis or Node-calling workflow; no Python replay simulator or hidden-state referee is added.
