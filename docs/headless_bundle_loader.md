# H2 Browser Headless Bundle Loader

H2 adds a static-browser importer for Node/OceanBox-JS headless mission bundles. It lets instructors and students inspect headless runtime artifacts inside the ANCHOR browser shell without making the browser app depend on Node, Python, npm, or a backend.

Required boundary language:

```text
Node headless runtime over portable ANCHOR core logic. Browser ANCHOR remains the official visual referee and scoring UI.
```

## What H2 Implements

- Browser-safe CSV parsing for simple observation and glider-track tables.
- Browser-safe bundle loading from either one `bundle.json` file or separate JSON/CSV files.
- Lightweight validation for manifests, visible fields, hidden-field visibility, observations, tracks, score reports, and replay metadata.
- A view model and HTML panel for the Simulation Lab `Headless Bundle Viewer`.
- A browser summary export with type `anchor.browser.headless-bundle-summary`.
- Debug state at `globalThis.ANCHOR_HEADLESS_BUNDLE_DEBUG`.
- CLI support for `--combined-json`, which writes `bundle.json` next to the existing H1 files.

## Supported Bundle Inputs

The viewer accepts a combined bundle:

- `bundle.json`

It also accepts separate files:

- `manifest.json`
- `mission_config.json`
- `visible_fields.json`
- optional `hidden_fields.json`
- `observations.json` or `observations.csv`
- `glider_tracks.json` or `glider_tracks.csv`
- `score_report.json`
- optional `water_column_summary.json`
- optional `depth_layer_priority.json`
- optional `replay.json`
- optional `episode.json`

Public bundles should omit `hidden_fields.json` and include manifest notes that hidden truth export is disabled. Visible fields must not include `T_hiddenTruth`.

## Browser Workflow

1. Open ANCHOR from a static file server.
2. Expand `Simulation Lab`.
3. Open `Headless Bundle Viewer` under `Editor & Import Tools`.
4. Click `Load Example Bundle` or choose `bundle.json` / separate bundle files.
5. Inspect visible fields, observations, glider tracks, score report, replay metadata, validation warnings, and visibility status.
6. Export `anchor_headless_bundle_browser_summary.json` when a compact browser-side summary is needed.

The viewer is an inspection surface. It does not run official browser scoring and does not replace Planning, Simulation, or Debrief.

## CLI Workflow

Generate a public browser-importable bundle from Node:

```bash
node tools/js/headless_oceanbox.mjs simulate --seed demo-001 --out runs/public-demo --no-hidden-export --combined-json
```

Generate a debug/instructor bundle with hidden truth included:

```bash
node tools/js/headless_oceanbox.mjs simulate --seed demo-001 --out runs/debug-demo --combined-json
```

The first command writes `bundle.json`, `manifest.json`, visible fields, observations, tracks, score report, replay, and episode files without hidden truth. The second command also writes hidden fields and marks them with hidden truth/oracle visibility.

## Colab Workflow

Colab can call the Node CLI when Node and the repository are available, then load `bundle.json` or the separate JSON/CSV files with Python standard-library `json` and `csv`.

If Node is unavailable, upload a pre-generated public bundle and analyze the exported tables. Do not reimplement the ANCHOR simulator in Python for H2.

## What H2 Does Not Implement

H2 does not implement a Python OceanBox simulator, web workers, zip import, backend storage, a new route planner, official browser scoring, calibrated ocean forecasts, production data assimilation, MARL/RL, or full autonomy.

## Validation

Run:

```bash
node tools/js/smoke_headless_csv.mjs
node tools/js/smoke_headless_bundle_loader.mjs
node tools/js/smoke_headless_bundle_validation.mjs
node tools/js/smoke_headless_bundle_view_model.mjs
node tools/js/smoke_headless_bundle_browser_adapter.mjs
node tools/js/smoke_headless_bundle_viewer_panel.mjs
node tools/js/smoke_headless_bundle_combined_export.mjs
node tools/js/audit_headless_runtime_import_boundaries.mjs
```

For browser wiring, run the focused Playwright smoke containing `Headless Bundle Viewer`.

## H2.1 Checked-In Example Bundle

The repo includes deterministic bundle fixtures under `docs/examples/`:

- `headless_oceanbox_js_public_bundle.example.json`: public-safe combined bundle with no `hiddenFields`, no `hidden_fields.json` manifest entry, visible fields excluding `T_hiddenTruth`, and manifest notes that hidden truth export is disabled.
- `headless_oceanbox_js_bundle.example.json`: oracle/debug combined bundle with hidden truth in `hiddenFields` and manifest visibility marked `hiddenTruth` / `oracle` / `debugAll`.

Regenerate both with:

```bash
node tools/js/generate_headless_example_bundles.mjs
```

`Load Example Bundle` in the Headless Bundle Viewer fetches the checked-in public fixture. The same public file can be loaded in Colab/Python with standard-library `json`; Python analyzes the artifact or calls Node and does not reimplement simulation.

Additional fixture checks:

```bash
node tools/js/smoke_headless_example_bundle_fixture.mjs
node tools/js/smoke_headless_browser_fixture_roundtrip.mjs
```

## H3.1 Solver Packet / Plan Roundtrip Reports

H3.1 bundles may include `roundtrip_report.json` with canonical `type: "anchor.headless.solver-roundtrip-report"`. The browser loader also accepts the H3 legacy alias `anchor.headless.roundtrip-report`. A combined roundtrip example bundle uses `type: "anchor.headless.solver-roundtrip-bundle"` and embeds the report as `roundtripReport`.

The Headless Bundle Viewer displays Roundtrip Summary, Solver Packet Validation, Plan Validation, Execution Summary, Visibility Summary, and Score Summary sections. The viewer can load `docs/examples/headless_solver_roundtrip_bundle.example.json` through `Load Example Roundtrip` and export `anchor.browser.headless-roundtrip-summary`.

Generate the checked-in public examples with:

```bash
node tools/js/generate_headless_solver_roundtrip_examples.mjs
```

Run the consolidated CLI with:

```bash
node tools/js/headless_oceanbox.mjs roundtrip --solver-packet docs/examples/headless_solver_packet.example.json --plan docs/examples/headless_solver_plan.example.json --out runs/h3-roundtrip --combined-json --no-hidden-export
```

The legacy wrapper remains valid:

```bash
node tools/js/headless_roundtrip.mjs docs/examples/headless_solver_packet.example.json docs/examples/headless_solver_plan.example.json --out runs/h3-roundtrip
```
## P9 Science Diagnostics

P9 bundles may include `science_diagnostics.json` and combined bundles may embed `scienceDiagnostics`. The Headless Bundle Viewer displays this as Science Diagnosis with Forecast Update and Discovery Update summaries. The artifact is public-safe and must not contain `T_hiddenTruth`; it does not add production data assimilation, calibrated ocean forecasting, route planning, official browser scoring, or MARL/RL.

## P10 Adaptive Science-Diagnosis Handoff

Science diagnosis informs the mission-manager objective recommendation. It does not generate a route. Forecast correction means the expected field existed but was wrong. Hidden event hypothesis means observations may indicate a phenomenon not represented in the forecast. The player or solver still plans the route.

P10 adds adaptive science-diagnosis context, mission-manager rationale, next-leg handoff metadata, objective-history display fields, and public-safe headless/browser summaries. It does not implement a new planner, scoring redesign, production data assimilation, GP/GMRF production inference, calibrated ocean forecast, Python simulator, or MARL/RL. Node/OceanBox-JS remains the canonical non-browser runtime; Python/Colab analyze artifacts or call Node.
## P11 Water-Column Sections

P11 bundles may include `water_column_summary.json` and `depth_layer_priority.json`, and combined bundles may embed `waterColumnSummary` and `depthLayerPrioritySummary`. The Headless Bundle Viewer displays Water Column and Depth-Layer Priority sections and exposes debug keys such as `hasWaterColumnSummary`, `waterColumnLayerIds`, `diveProfileId`, `observationCountsByDepth`, `verticalCoverage`, and `bestDepthLayerCounts`.

2.5D means the tactical map remains top-down, while each cell can contain simplified depth layers. Dive profile controls which layer the glider samples along the route. Recommended dive profile is context for the next leg; it does not generate a route. P11 does not add full 3D planning, new route planning, production data assimilation, or MARL/RL.

## MOTION-R1 Motion Dynamics Section

Bundles may include `motion_trajectory.json`, `control_trace.json`, `motion_diagnostics.json`, `mission_feasibility_report.json`, or combined-bundle `motionTrajectory`, `controlTrace`, `motionDiagnostics`, and `missionFeasibilityReport`. The Headless Bundle Viewer shows Motion Dynamics and Mission Feasibility sections with motion model, planned/realized distance, mean/max track error, drift, current assist/opposition, cross-current, energy used, sampled point count, arrival status, duration, energy remaining, waypoint validation, clearance warnings, and constraint violations. Public motion and feasibility exports redact hidden-truth field identifiers and truth values.

ENV-R1 bundle loading recognizes `bathymetrySummary`, `bathymetry_summary.json`, `missionGeometrySummary`, and `mission_geometry_summary.json` as public-safe environmental/geometry summaries.

## SIM-R1 Feasibility Bundle Target

Headless bundles may now include the MOTION-R1 `anchor.benchmark.mission-feasibility-report` skeleton. SIM-R1 bundles can include `anchor.benchmark.feasibility-cost-graph` and `anchor.headless.motion-cost-matrix` artifacts when `--cost-graph` is enabled. Scenario-comparison reports remain future work. The Headless Bundle Viewer should treat these as benchmark inspection artifacts, not official browser scoring. Public bundles must continue to hide hidden truth unless oracle/debug visibility is explicit. See docs/mission_feasibility_simulator_requirements.md.
## SCORE-R1 Shadow Mission Outcome Scoring

SCORE-R1 is shadow benchmark scoring. It does not replace official browser scoring, Challenge Mode scoring, leaderboard ranking, or existing debrief totals. Profiles are objective-aware and versioned; missing data is explicit; regret requires a compatible reference, and best-known attempt does not mean optimal. The Node/OceanBox-JS runtime remains the canonical headless runtime. Python/Colab analyzes exported artifacts or invokes Node; no Python simulator, planner, optimizer, MARL/RL, operational certification, SeaExplorer validation, or calibrated ocean forecast is added.

See [Mission Scoring and Regret](mission_scoring_and_regret.md) for the SCORE-R1 artifact contract and boundaries.

## H4.1 Replay Integrity Loading

The bundle loader accepts replay artifacts from either combined `bundle.json` fields or separate replay JSON files. If both are present and disagree, validation reports `REPLAY_COMBINED_SEPARATE_MISMATCH` instead of silently choosing one. Replay schema and integrity details are documented in `docs/replay_artifact_schemas.md`.
