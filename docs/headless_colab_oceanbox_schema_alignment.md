# H0 Headless / Colab / OceanBox Schema Alignment

H0 defines the schema bridge between browser ANCHOR and a future headless ANCHOR / OceanBox environment. It is an audit and contract layer only.

Browser ANCHOR remains the visual referee and teaching tool: learn, play, plan, simulate, debrief, compare, and export. Headless ANCHOR / OceanBox is the future reproducible computational backend. H1 makes Node.js the canonical non-browser runtime because it can import portable ANCHOR JavaScript core modules. Python/Colab remains a wrapper and analysis workflow around the same artifacts.

## What H0 Implements

- Headless artifact and visibility contracts in `src/core/headless/HeadlessSchemaContract.js`.
- Canonical field descriptors in `src/core/headless/HeadlessFieldSchema.js`.
- Mission, episode, and bundle manifest schema contracts.
- Browser-export to headless-artifact mapping.
- Defensive adapter skeletons that summarize browser artifacts into compact descriptors.
- Smoke and audit scripts for schema alignment.

## Canonical Field Names

Core portable fields are named for headless compatibility:

- `T_hiddenTruth`: hidden true environmental state.
- `E_forecast`: expected / forecast state.
- `mu_belief`: belief mean or posterior-like estimate.
- `U_uncertainty`: expected-state uncertainty.
- `P_unknown`: hidden-event probability.
- `A_global`: vehicle-independent sampling priority.
- `Q_glider`: glider-specific action value.
- `F_u`, `F_v`, `F_w`: flow components.
- `constraintMask`, `hazard`, `staleness`, `sampleValue`, `eventIntensity`, `trueRoi`, `beliefRoi`, `boundaryStrength`, and `forecastValidation`.

Descriptors support 2D and 2.5D data. No artifact is required to contain every field.

## Visibility Tiers

Visibility tiers protect hidden truth and benchmark fairness:

- `hiddenTruth`: true state or oracle labels.
- `oracle`: explicit oracle/debug visibility.
- `forecastOnly`: forecast-visible fields.
- `beliefOnly`: belief, uncertainty, diagnosis, and adaptive state.
- `publicScenario`: public scenario and mission data.
- `debugAll`: explicit debug bundle visibility.

Public Colab bundles should not silently expose `T_hiddenTruth`, `trueRoi`, or `eventIntensity`.

## Benchmark Episode Schema

H0 aligns benchmark records with episode vocabulary: steps, observations, actions, rewards, surfacing events, objectives, diagnostics, and exports. This is useful for future RL/MARL-compatible data shapes, but H0 does not implement learning, policies, planner training, or autonomy.

## Browser Artifact Mapping

`BrowserHeadlessSchemaMap.js` maps current browser exports to headless targets. Planner Benchmark and Adaptive Benchmark P0-P8 exports are mapped as ready or partial. Demo artifacts map to field packs, belief states, priority states, or benchmark episodes depending on content.

Ready today for Colab descriptors:

- Flow demo fields as `F_u` / `F_v` field packs.
- Sampling Priority as `A_global`.
- Flow-Coupled Sampling as `Q_glider`.
- Planner Benchmark run, route, attempt, comparison, and attempt-session records.
- Adaptive Benchmark P6-P8 session, leg, surfacing, handoff, and objective-history records.
- Solver packets as headless mission configs.

Partial areas:

- Coupled demo layers need explicit process/future/flow/constraint/objective bundle files.
- Uncertainty demo needs normalized hidden truth, forecast, belief, uncertainty, and observation tables.
- Result exports need a richer replay-to-episode adapter in H1.

## H0 Does Not Implement

H0 does not implement the Python OceanBox package. It does not implement a new simulator, route planner, scoring redesign, backend storage, MARL/RL, or full autonomy.

## H1 Update - Node Headless Runtime

H1 is Node Headless Core / OceanBox-JS Runtime, not a Python simulator package.

Node headless runtime over portable ANCHOR core logic. Browser ANCHOR remains the official visual referee and scoring UI.

H1 adds a deterministic educational Node runtime, fixed waypoint execution, noisy observations, local belief/uncertainty updates, sampling priority, score reports, CLI, and JSON/CSV bundles. It does not add Python OceanBox, a new route planner, calibrated forecasting, or MARL/RL.

Recommended next actions after H1 are browser-compatible bundle loading and Colab workflow polish around the Node-generated artifacts.

## H2 Update - Browser Bundle Loader

H2 adds a browser-compatible loader for H1 Node/OceanBox-JS bundle artifacts. The browser viewer imports `bundle.json` or separate JSON/CSV files, checks hidden-truth visibility, and exports a compact browser summary. It is an inspection and comparison workflow only; Browser ANCHOR remains the official visual referee and scoring UI.

Colab workflows can either call the Node CLI with `--combined-json` or load pre-generated public bundles with standard-library `json` and `csv`. H2 still does not implement a Python simulator, new planner, calibrated forecast model, or MARL/RL environment.

## P11 Water-Column Columns

Headless bundles and solver roundtrip bundles may include `waterColumnSummary`, `depthLayerPrioritySummary`, `water_column_summary.json`, and `depth_layer_priority.json`. Observation and track tables may include `depthLayerId`, `depthMeters`, and `diveProfileId`.

Colab notebooks should treat these as artifact-analysis fields. They should not reimplement the simulator, infer hidden truth from public bundles, or treat P11 as full 3D route planning or calibrated vertical ocean modeling.