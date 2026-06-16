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