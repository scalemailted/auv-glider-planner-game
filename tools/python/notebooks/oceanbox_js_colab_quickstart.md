# OceanBox-JS Colab Quickstart

H1 uses Node.js as the canonical non-browser runtime. Python/Colab notebooks are wrappers or analysis workflows around JSON/CSV artifacts, not a second simulator.

Required boundary language:

```text
Node headless runtime over portable ANCHOR core logic. Browser ANCHOR remains the official visual referee and scoring UI.
```

## When Node Is Available

In a Colab-style notebook with the repository files and Node available, call the CLI as a subprocess:

```python
# In Colab-style notebooks, call Node as a subprocess when Node is available.
!node tools/js/headless_oceanbox.mjs simulate --seed demo-001 --out runs/demo
```

Then read the bundle files:

```python
import csv
import json

with open('runs/demo/score_report.json', 'r', encoding='utf-8') as f:
    score_report = json.load(f)

with open('runs/demo/observations.csv', 'r', encoding='utf-8', newline='') as f:
    observations = list(csv.DictReader(f))

with open('runs/demo/glider_tracks.csv', 'r', encoding='utf-8', newline='') as f:
    tracks = list(csv.DictReader(f))
```

## When Node Is Not Available

If Node is unavailable, upload a pre-generated headless bundle and analyze `observations.csv`, `glider_tracks.csv`, and `score_report.json`. Do not recreate the simulator in Python for H1.

## Visibility

Use public bundles when students should not see hidden truth:

```bash
node tools/js/headless_oceanbox.mjs simulate --seed demo-001 --out runs/public-demo --no-hidden-export
```

`visible_fields.json` omits `T_hiddenTruth`. `hidden_fields.json` is present only when hidden export is enabled and is marked as hidden truth/oracle visibility in `manifest.json`.

## Scope Boundary

H1 does not implement a Python OceanBox simulator, new route planner, RL/MARL environment, production controller, production data assimilation, or calibrated ocean forecast.


## H2 Browser Bundle Viewer

Generate a single browser-importable bundle when Node is available:

```bash
node tools/js/headless_oceanbox.mjs simulate --seed demo-001 --out runs/demo --combined-json
```

The same `runs/demo/bundle.json` file can be loaded in ANCHOR under Simulation Lab / Editor & Import Tools / Headless Bundle Viewer. The browser viewer validates visibility, summarizes fields/tables/scores, and exports `anchor.browser.headless-bundle-summary` for comparison. It does not replace browser Simulation or Debrief scoring.
