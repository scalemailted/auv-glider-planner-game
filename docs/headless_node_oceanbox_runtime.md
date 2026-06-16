# H1 Node Headless / OceanBox-JS Runtime

H1 adds a minimal Node.js headless runtime scaffold for ANCHOR-compatible mission experiments.

Required boundary language:

```text
Node headless runtime over portable ANCHOR core logic. Browser ANCHOR remains the official visual referee and scoring UI.
```

## Why Node / JavaScript

The canonical non-browser runtime is JavaScript running under Node. That keeps the headless path close to the portable ANCHOR core contracts and reduces drift from the browser game. Colab can call the Node CLI or analyze the generated JSON/CSV bundle. Python remains an optional analysis or wrapper layer, not a second simulator.

## What H1 Implements

- Deterministic runtime config for `coastalBloomFront`.
- Small `field[z][row][col]` arrays for `T_hiddenTruth`, `E_forecast`, `mu_belief`, `U_uncertainty`, `P_unknown`, `A_global`, `F_u`, `F_v`, `hazard`, `constraintMask`, `staleness`, and `boundaryStrength`.
- Synthetic coastal front plus bloom hidden truth, shifted forecast, initial belief, uncertainty, hidden-event suspicion, hazards, masks, staleness, boundary strength, and simple depth-varying flow.
- Fixed waypoint execution for one glider crossing the front/bloom boundary.
- Deterministic noisy observations from hidden truth.
- Educational local belief and uncertainty update.
- Vehicle-independent sampling priority `A_global`.
- Educational score report.
- Colab-ready JSON/CSV bundle export.
- Node CLI entry point.

## What H1 Does Not Implement

H1 does not implement a Python OceanBox simulator, a backend server, a new route planner, A*/MPC/RL/MARL, production data assimilation, a calibrated ocean model, HYCOM/ROMS/Delft3D-quality forecasting, production glider control, or replacement browser scoring.

## CLI

```bash
node tools/js/headless_oceanbox.mjs simulate --seed demo-001 --out tmp/oceanbox-js-demo
```

Useful options:

```bash
node tools/js/headless_oceanbox.mjs simulate --seed demo-001 --out tmp/oceanbox-js-public --no-hidden-export
node tools/js/headless_oceanbox.mjs simulate --seed demo-001 --summary-only
node tools/js/headless_oceanbox.mjs simulate --seed demo-001 --width 32 --height 24 --scenario coastal_bloom_front
```

## Bundle Files

Default output includes:

- `manifest.json`
- `mission_config.json`
- `visible_fields.json`
- `hidden_fields.json`
- `observations.json`
- `observations.csv`
- `glider_tracks.json`
- `glider_tracks.csv`
- `score_report.json`
- `replay.json`
- `episode.json`

`visible_fields.json` excludes `T_hiddenTruth`. `hidden_fields.json` is written only when hidden export is enabled and is marked as hidden truth/oracle visibility in the manifest. Use `--no-hidden-export` for public or student-facing bundles that should omit hidden truth.

## Relationship To Browser ANCHOR

The Node runtime is a reproducible headless scaffold for portable JSON/CSV artifacts. Browser ANCHOR remains the official visual referee, scoring UI, benchmark comparison surface, and player-facing debrief. Browser and Node should converge through shared portable contracts, not duplicate implementations.

## Relationship To Colab

Colab notebooks should either call the Node CLI when the repository and Node are available, or load pre-generated bundles and analyze `observations.csv`, `glider_tracks.csv`, and `score_report.json`. Colab should not reimplement the simulator in Python for H1.

## Validation

Run:

```bash
node tools/js/smoke_headless_runtime_config.mjs
node tools/js/smoke_headless_grid_fields.mjs
node tools/js/smoke_headless_flow.mjs
node tools/js/smoke_headless_observation_glider.mjs
node tools/js/smoke_headless_belief_priority.mjs
node tools/js/smoke_headless_mission_runner.mjs
node tools/js/smoke_headless_bundle_writer.mjs
node tools/js/smoke_headless_oceanbox_cli.mjs
node tools/js/audit_headless_runtime_import_boundaries.mjs
```

## H2 Browser Bundle Loader

H2 adds a static-browser Headless Bundle Viewer under Simulation Lab / Editor & Import Tools. It loads `bundle.json` or separate JSON/CSV files, validates hidden-truth visibility, displays visible fields, observations, glider tracks, score report, replay metadata, and exports `anchor.browser.headless-bundle-summary`.

Use `--combined-json` to write `bundle.json` next to the existing H1 bundle files:

```bash
node tools/js/headless_oceanbox.mjs simulate --seed demo-001 --out tmp/oceanbox-js-public --no-hidden-export --combined-json
```

H2 does not make the headless score official browser scoring and does not add a Python simulator, new planner, calibrated ocean forecast, backend service, or MARL/RL environment. See `docs/headless_bundle_loader.md`.

## H2.1 Checked-In Example Bundle

`tools/js/generate_headless_example_bundles.mjs` uses the Node/OceanBox-JS runtime directly to generate compact deterministic `coastalBloomFront` examples with seed `h2-example-001`, width `12`, and height `8`.

The public fixture is `docs/examples/headless_oceanbox_js_public_bundle.example.json`; it is the default browser `Load Example Bundle` target and is safe for student-facing inspection because hidden truth is omitted. The debug fixture is `docs/examples/headless_oceanbox_js_bundle.example.json`; it is for oracle/instructor workflows and marks hidden truth with explicit hidden/oracle/debug visibility. Neither fixture changes browser scoring, adds a planner, adds a Python simulator, or claims calibrated ocean forecasting.

## H3.1 Solver Packet Roundtrip CLI

`tools/js/headless_oceanbox.mjs roundtrip` is the consolidated CLI for bridging browser solver packets to the Node headless runtime. The legacy `tools/js/headless_roundtrip.mjs` wrapper still works. It reads `anchor.solverPacket` plus a submitted `anchor.plan`, checks hidden-truth visibility, runs shared browser plan validation where possible, adapts the selected agent plan to `anchor.headless.waypoint-plan`, then executes the existing H1 runtime.

Public output writes `bundle.json` plus `roundtrip_report.json` without `hidden_fields.json` when `--no-hidden-export` is used. Roundtrip reports use canonical `anchor.headless.solver-roundtrip-report`, and loaders still accept legacy `anchor.headless.roundtrip-report`. Use `--include-hidden-truth` only for explicit oracle/debug workflows. The execution uses the existing H1 synthetic educational runtime fields, so the report marks `usesSyntheticRuntimeFieldsForExecution: true`; browser ANCHOR remains authoritative for official visual scoring.
