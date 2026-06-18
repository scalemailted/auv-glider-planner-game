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
node tools/js/headless_oceanbox.mjs simulate --seed demo-001 --depth-layers surface,thermocline,deep --dive-profile sawtoothProfile --water-column-summary
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
- `water_column_summary.json` when P11 water-column summaries are available
- `depth_layer_priority.json` when P11 depth-layer priority is available
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

## P9 Science Diagnostics

Headless episodes now include compact public-safe science diagnostics. Bundle output may include `science_diagnostics.json` plus `scienceDiagnostics` inside `bundle.json`. The diagnostics summarize observation surprise, evidence coherence, forecast-correction state, and hidden-event hypothesis state without embedding hidden truth arrays.

This is an educational heuristic layer only. It does not perform production data assimilation, calibrated forecasting, route planning, scoring changes, or MARL/RL.

## P10 Adaptive Science-Diagnosis Handoff

Science diagnosis informs the mission-manager objective recommendation. It does not generate a route. Forecast correction means the expected field existed but was wrong. Hidden event hypothesis means observations may indicate a phenomenon not represented in the forecast. The player or solver still plans the route.

P10 adds adaptive science-diagnosis context, mission-manager rationale, next-leg handoff metadata, objective-history display fields, and public-safe headless/browser summaries. It does not implement a new planner, scoring redesign, production data assimilation, GP/GMRF production inference, calibrated ocean forecast, Python simulator, or MARL/RL. Node/OceanBox-JS remains the canonical non-browser runtime; Python/Colab analyze artifacts or call Node.
## P11 2.5D Water-Column Sampling

P11 formalizes the existing depth-aware `field[z][row][col]` runtime data as a top-down 2.5D water-column sampling model. Default headless runs use `surface`, `thermocline`, and `deep` layers plus `sawtoothProfile`. Observations and tracks include `depthLayerId`, `depthMeters`, and `diveProfileId`.

The CLI supports:

```bash
node tools/js/headless_oceanbox.mjs simulate --depth-layers surface,thermocline,deep --dive-profile sawtoothProfile --water-column-summary
node tools/js/headless_oceanbox.mjs roundtrip --solver-packet docs/examples/headless_solver_packet.example.json --plan docs/examples/headless_solver_plan.example.json --out runs/h3-roundtrip --depth-layers surface,thermocline,deep --dive-profile sawtoothProfile --combined-json --no-hidden-export
```

P11 adds `water_column_summary.json`, `depth_layer_priority.json`, `waterColumnSummary`, and `depthLayerPrioritySummary`. It does not add full 3D planning, a new planner, production vehicle control, calibrated vertical ocean modeling, Python simulation, or MARL/RL. See `docs/water_column_2p5d_sampling_model.md`.

## MOTION-R1 Optional Motion-Aware Execution

Node/OceanBox-JS can optionally run motion-aware execution by enabling `motionAware` or CLI `--motion-aware`. The runtime keeps the submitted waypoint plan as route authority, adapts it to control commands, simulates realized glider motion, and emits `motionTrajectory`, `controlTrace`, `plannedVsRealized`, and `motionDiagnostics`. Public bundles can include `motion_trajectory.json`, `control_trace.json`, `motion_diagnostics.json`, and `mission_feasibility_report.json`. This remains deterministic educational execution and reporting, not a new planner, not WebGPU, not browser official scoring, and not a Python simulator.

ENV-R1 adds public-safe `bathymetrySummary` and `missionGeometrySummary` bundle metadata to Node/OceanBox-JS outputs. Node/OceanBox-JS remains the canonical non-browser runtime; no Python simulator is added.

## SIM-R1 Mission Feasibility Target

Node/OceanBox-JS now emits a MOTION-R1 mission-feasibility report skeleton when motion-aware execution is enabled. It reports mission duration, distance traveled, battery/energy, planned vs realized trajectory, waypoint validation, and clearance/constraint warnings without making headless score official browser scoring. SIM-R1 now adds optional cost graph / adjacency matrix artifacts; fuller scenario comparison remains future work. See docs/mission_feasibility_simulator_requirements.md.
## SCORE-R1 Shadow Mission Outcome Scoring

SCORE-R1 is shadow benchmark scoring. It does not replace official browser scoring, Challenge Mode scoring, leaderboard ranking, or existing debrief totals. Profiles are objective-aware and versioned; missing data is explicit; regret requires a compatible reference, and best-known attempt does not mean optimal. The Node/OceanBox-JS runtime remains the canonical headless runtime. Python/Colab analyzes exported artifacts or invokes Node; no Python simulator, planner, optimizer, MARL/RL, operational certification, SeaExplorer validation, or calibrated ocean forecast is added.

See [Mission Scoring and Regret](mission_scoring_and_regret.md) for the SCORE-R1 artifact contract and boundaries.