# Testing

The browser game does not require npm, Playwright, or a build step for normal use. Normal local serving still works with:

```bash
python -m http.server 8000
```

Playwright is optional and intended for development smoke testing.

Greedy Planner is useful for planner smoke checks because it should return promptly, preserve non-selected glider routes, and validate before simulation. See `docs/greedy_planner.md` for the expected selected-glider baseline behavior.

The main menu should expose three top-level accordions: `Challenge Mode`, `Simulation Lab`, and `Learning Labs`. Challenge Mode should contain `Play`, `Learn`, and `Compete` visual subsections. Simulation Lab should contain `Experiments`, `Benchmark Modes`, `Demos`, `Editor & Import Tools`, and `Benchmarks`. Learning Labs should expose static concept pages, starting with `Deterministic Spatiotemporal Processes`, that open outside the Phaser simulator. Field demos live inside Simulation Lab, not as a separate top-level section. Use `docs/flow_fields_demo.md` when validating `F(x,y,t)` current vectors, static/dynamic fields, additive layers, partition behavior, terrain boundary effects, and topology-aware shoreline risk. Use `docs/sample_fields_demo.md` when validating `L(x,y,t)` event likelihood, `S(x,y,t)` sample value, pure sample-value spatial fields, spatial parameters, temporal patterns, spatial evolution, Time-Indexed/Frequency-Based/State-Evolving/History-Aware state models, sampling effects, and freshness/revisit displays. Use `docs/coupled_fields_demo.md` for deterministic/oracle coupled sampling spaces: known process `C(x,y,t)`, known flow `F(x,y,t)`, known constraints, analytical process engines, and oracle objective `S*(x,y,t)`. Use `docs/uncertainty_forecast_demo.md` for hidden truth, forecast/expected state, noisy observations, belief, expected-state uncertainty, surprise, forecast error, unknown-event probability, and sampling-priority preview. Use the Stochastic Coupled Sampling Space learning lab when validating the teaching layer that combines posterior belief, expected uncertainty, unknown-event probability, flow, constraints, acquisition value, and oracle regret. Use docs/sampling_priority_demo.md for S1 global A_global(x,y,t). Use labs/sampling-priority-to-glider-action-value.html when validating the Learning Lab bridge between vehicle-independent science priority and glider-specific action value. Use docs/flow_coupled_sampling_demo.md for S2 glider-specific direct-leg Q_glider(g,x,y,t) action value; it must keep route planning, mission scoring, calibrated glider dynamics, and calibrated ocean forecasts out of scope. Use docs/benchmark_route_execution_contract.md when validating P1 benchmark episode configs, route-execution records, result/debrief adapters, attempt sets, and the boundary that P1 does not add a new planner or scoring redesign. Use docs/planner_benchmark_route_overlay.md when validating P4 route overlay geometry, layer controls, segment/waypoint details, export metadata, and the boundary that P4 only visualizes existing planned/executed routes. Use docs/adaptive_benchmark_mission_manager.md when validating P6 Adaptive Benchmark mission-manager diagnosis, objective transitions, surfacing records, exports, and the boundary that P6 does not execute adaptive routes, add a planner, redesign scoring, or add MARL/RL.

## Challenge Mode vs Simulation Lab

ANCHOR has two user-facing experiences built on the same mission engine.

Challenge Mode is the playable planning-puzzle experience. It emphasizes score, stars, medals, route quality, risk warnings, leaderboard comparison, and learning strategy through play.

Simulation Lab is the reproducible experiment sandbox. It emphasizes exact configuration, deterministic/stochastic setup, dynamic current-field metadata, solver packets, replay seeds, external solver workflows, JSON import/export, and auditability.

Both modes use the same terrain, current fields, hazards, glider physics, scoring core, route validation, planner APIs, and replay/export system. Smoke tests should confirm the main menu exposes Challenge Mode, Simulation Lab, and Learning Labs top-level accordions, Tutorials appear under Challenge Mode, field demos and Mission Editor appear under Simulation Lab, static concept pages appear under Learning Labs, Challenge setup presents the left Mission Mode Navigator plus selected center briefing, selecting a mission updates the briefing without duplicating cards in the center, Generate Mission reaches the workspace, Simulation Lab setup keeps the detailed technical controls visible, Simulation Lab exposes Import / Export Tools / External Solver Evaluation / Benchmark Leaderboard, Challenge Mode exposes Play Custom Challenge, and launching either mode reaches the same mission workspace/simulation engine path.

## Segment Contribution Grades

Route-quality testing should include at least three manual plans:

- a low-immediate-value setup segment that improves access to a future Gold Star or high-value ROI region
- a hazardous shortcut that collects value but crosses hazard/shoreline risk
- a terminal carry-through segment that extends command coverage to mission end

The first should receive future setup credit, the second should receive risk penalties, and the third should be graded as carry-through coverage rather than invalid. Debrief should show 3-hour block summaries, and result JSON should include `routeQuality`.

## Waypoint Semantics Checks

Waypoint tests should confirm old plans default to `kind: "navigation"`, normal map clicks show `Navigation`, surface/update waypoints emit `surface_update` events with `gpsFix: true`, Gold Star/planning-marker objectives are labeled as `Sampling Target`, and Greedy Planner over-duration final waypoints are `terminalCarryThrough` with `runtimeBehavior: "truncate_at_mission_end"`.

## Dynamic Sample Field Checklist

Manual sample-field checks should cover:

- Mission Mode selection persists into generated level/mission metadata;
- Challenge Mode opens with the left mission-mode navigator and a selected mission briefing in the center, not the technical setup grid;
- selecting a mission in the left navigator updates only the selected briefing/detail screen;
- the center briefing does not duplicate the full mission list;
- the right setup panel shows Mission Snapshot or is hidden, never Mission Waypoints;
- Challenge Mode presets choose sample-field/current/scoring defaults without forking the mission engine;
- Simulation Lab exposes the detailed sample-field controls directly;
- Process Lab can regenerate seeded sample-value fields and dynamic value fields. Discrete process contexts use a generation clock independent of render frames, with default `1 gen/s`, tick rates `0.25`, `0.5`, `1`, `2`, `4`, and `8`, plus Step Generation, Run/Pause, and Reset controls. Its left-panel controls are mode-aware: Foundational CA Models shows Mode, Foundational CA Model selector, Display, Seed, and Export without a Pattern Source dropdown; Ocean-Relevant Process Analogs shows Mode, Ocean Process Analog selector, Display, Seed, and Export without a Pattern Source dropdown; Custom Composer shows the full Source Field, Spatial Pattern / Geometry, Value Distribution, Temporal Pattern, Spatial Evolution / Motion Rule, Interaction Scale / Hierarchy, State Model / Update Rule, Sampling Effect / Freshness, Display / Diagnostic Layer, Seed / Scenario Identity, Component Examples, Export, and Scenario Generation stack; Process Paint shows Mode, Process Paint tools, Display, Seed, and Export; Rule Allocation Sandbox shows seeded random allocation controls without composer or paint controls; Diagnostics is reached through Display / Diagnostic Layer and the right-panel Diagnostics tab, not as a primary Mode option; Current Lab State and Field / Process Stats live in the right panel;
- Process Lab defaults to Foundational CA Models, shows exactly one context-specific model or analog selector in normal UI, hides the old Example Track selector, hides the Pattern Source and legacy Behavior Preset dropdowns unless debug legacy UI is enabled, and can switch to Custom Composer for direct primitive editing;
- Process Lab exposes Current Lab State and Behavior QA in the right panel, a `reference-signature-primary-ui-v1` debug/version stamp, and `globalThis.ANCHOR_ROI_UI_DEBUG` with active source, signature count, legacy visibility, right-panel mode, active fixture id, behavior validation status, and Value Distribution accordion status;
- Process Lab diagnostics include feature-evolution analog metadata for `V_L(x,y,t)` / `V_S(x,y,t)` so presets can be checked for bounded drift, local propagation, multi-source pulsing, ripple activation, and non-physical-current boundaries;
- Process Lab exports and UI expose the likelihood/source mesh separately from likelihood/source nodes: `likelihoodField.values` reconstructs every cell's legacy `L(x,y,t)` value, while `likelihoodField.nodes` describes sources/basins that influence the mesh;
- Process Lab graph-backed modes expose hierarchical `graphField` metadata with cluster/community likelihood `C_k(t)`, cell likelihood/readiness `L_i(t)`, activation `A_i(t)`, topology, node/edge counts, update rule, node state counts, message totals, compact node state, top-level `clusters`, community-id grids, filtered top message summaries, and per-frame `graphState` / `graphActivation` / `graphCommunityId` / `graphClusterLikelihood` / `graphIncomingMessage` / `graphTopMessages` layers; cellular automata-inspired modes are tested as one graph-message rule family, not as the whole Process Lab;
- selecting a Process Lab Example Process updates the primitive controls, switching to Custom preserves editable primitive controls and clears reference metadata, modifying a primitive after selecting an example marks the internal signature as modified, and Export Demo JSON includes `patternSource`, `referenceSignature`, `componentRecipe`, plus legacy `behaviorPreset` metadata only when applicable;
- Process Lab source fields include Uniform Likelihood, Gaussian Likelihood, Multi-Modal Likelihood, Gradient Likelihood, Patchy Likelihood, Seeded Texture Likelihood, and Sparse Candidate Sites, and can be static or dynamic as legacy `L(x,y,t)`;
- Process Lab spatial patterns are the final pure sample-value geometry set: Constant Field, Gradient / Trend, Clustered Field, Patchy / Correlated Field, Sparse Targets, Linear Band, Front / Boundary, Boundary Band, Monitoring Stations, and Seeded Texture;
- Process Lab value distributions include Constant Value, Uniform Random, Gaussian / Normal, Skewed Low, Skewed High, Bimodal Values, Heavy-Tailed, and Rare Extreme Events; Constant Field plus Uniform Random is not the same as Constant Field plus Constant Value;
- Process Lab exposes Stationary, Continuous Drift, Discrete Jump, Random Walk, Neighbor Propagation, Expansion, Contraction, Divergence, Convergence, Morph / Mutation, Shear / Stretch, Rotational Swirl, and Branching Growth as spatial evolution options;
- Process Lab exposes Foundational CA Models and Ocean-Relevant Process Analogs as separate visible contexts. Foundational entries include Conway, Forest Fire, SIR, Greenberg-Hastings, Sandpile, Wa-Tor, Traffic CA, and Wireworld; observable entries include Propagating Fronts, Excitable Waves, Local Birth-Death Emergence, Recurrent Stationary Hotspots, Diffusive / Epidemic Spread, Directed Feature Transport, Cyclic Dominance, Domain / Cluster Formation, Threshold Cascades / Avalanches, Interacting Population Migration, Freshness / Recovery, Pattern Formation / Morphogenesis, Congestion / Density Waves, and Structured Signal Propagation;
- Process Lab guided examples have CA taxonomy metadata, QA expectations, phenotype metrics, genotype notes, reference model catalog coverage, rule/update-function metadata, explicit fixture-backed initial layers, model-aware initial-condition modes (`curatedSeed`, `interactiveCanvas`, `deterministicRandomSeed`), Behavior QA status, and export metadata;
- Run `node tools\js\smoke_flow_field_math.mjs`, `node tools\js\audit_flow_field_presets.mjs`, and `node tools\js\smoke_flow_field_demo.mjs` to verify Flow Fields math, preset metadata, finite vectors, diagnostics, synthetic claim boundaries, UI labels, and export metadata.
- Run `node tools\js\smoke_coupled_process_field_math.mjs`, `node tools\js\smoke_coupled_process_engines.mjs`, and `node tools\js\smoke_oracle_coupled_objective.mjs` to verify deterministic coupled field math, analytical process engines, CA baseline adapter, and oracle objective metadata.
- Run `node tools\js\smoke_roi_reference_signatures.mjs` to verify all reference signatures load, generate fields/scenarios, and preserve metadata.
- Run `node tools\js\audit_roi_reference_signatures.mjs` to print PASS/WARN/FAIL educational validation summaries for every signature.
- Run `node tools\js\audit_roi_reference_coverage.mjs` to verify model catalog coverage, CA-family coverage, required taxonomy fields, and duplicate/missing reference metadata.
- Run `node tools\js\smoke_roi_view_filters.mjs` to verify graph display layers, aliases, captions, node/message filter defaults, ROI meaning layers, and filter normalization.
- Run `node tools\js\audit_spatiotemporal_process_examples.mjs`, `node tools\js\smoke_spatiotemporal_process_lab_contract.mjs`, `node tools\js\smoke_sampling_process_process_pattern_controls.mjs`, `node tools\js\smoke_sampling_process_mode_visibility.mjs`, `node tools\js\smoke_sampling_process_ui_config.mjs`, `node tools\js\smoke_sampling_process_console_sections.mjs`, `node tools\js\smoke_sampling_process_left_control_plane.mjs`, `node tools\js\smoke_sampling_process_panel_disclosure.mjs`, `node tools\js\smoke_sampling_process_console_view_model.mjs`, `node tools\js\smoke_sampling_process_console_handlers.mjs`, `node tools\js\smoke_sampling_process_temporal_semantics.mjs`, `node tools\js\smoke_sampling_process_metric_layers.mjs`, `node tools\js\smoke_sampling_process_export_builder.mjs`, `node tools\js\smoke_sampling_process_render_layers.mjs`, `node tools\js\smoke_sampling_process_view_model.mjs`, `node tools\js\smoke_sampling_process_paint_field_adapter.mjs`, `node tools\js\smoke_sampling_process_mode_controller.mjs`, `node tools\js\smoke_sampling_process_ui_polish.mjs`, `node tools\js\smoke_sampling_process_top_left_hierarchy.mjs`, `node tools\js\smoke_sampling_process_lab_contract.mjs`, `node tools\js\smoke_sampling_process_rules.mjs`, `node tools\js\smoke_sampling_process_evolution.mjs`, `node tools\js\smoke_sampling_process_initial_condition_editor.mjs`, `node tools\js\smoke_sampling_process_foundational_ca_examples.mjs`, `node tools\js\smoke_sampling_process_ocean_analogs.mjs`, `node tools\js\audit_sampling_process_example_behaviors.mjs`, `node tools\js\smoke_sampling_process_paint_model.mjs`, and `node tools\js\smoke_sampling_process_randomizer.mjs` to verify the renamed Process Lab terminology, visible workflow modes, Example Process controls, grouped foundational/observable examples, mode-aware HUD sections, unnumbered left control plane, collapsed Sampling Process accordions, topmost right-panel tabs, right-panel field/process stats, extracted left-console section renderer, action-first top-left hierarchy, extracted console state view-model, extracted console handler map, extracted export builder, extracted render-layer module, extracted inspector/diagnostic view-model module, extracted Process Paint field adapter, extracted mode/action controller, compact progressive-disclosure UI, canonical process-rule catalog, deterministic CA-style Process Paint evolution, Process Paint assignments, deterministic random allocation, preferred process fields, and legacy aliases.
- Process Lab exposes Motion Scope as Per Feature, Local / Neighborhood, and Global, with Per Feature as the default for old continuous-drift/random-walk configs;
- Process Lab Continuous Drift and Random Walk do not shift the whole field globally unless Motion Scope is explicitly Global;
- Process Lab exposes `Clustered Field` plus Cluster Count and Cluster Size rather than separate Single Cluster, Bimodal, and Multiple Clusters options;
- Process Lab left panel shows compact controls, Explain buttons, and the debug/version stamp, not expanded behavior explainer bodies or a standalone Current Summary card;
- Process Lab left controls are collapsed by default, and the right panel puts Recipe, Inspector, Help, and Diagnostics tabs first; the selected tab filters the content shown below it;
- Process Lab Behavior Help supports Example Process, Source / Initial Field, Spatial Pattern / Geometry, Value Distribution, Temporal Pattern, Spatial Evolution, Interaction Scale, State Model / Memory, Sampling Effect, and Display Layer, and includes a Current Composition summary that routes current-coupled/uncertainty concepts to the Coupled Fields and Uncertainty / Forecast demos;
- Process Lab Process Example view includes observable pattern, rule/update-function, and sampling interpretation cards explaining time behavior, current sample value, near-future value, low/depleted/dead regions, best views, failure signs, and sampling intuition;
- Process Lab exposes Component Isolation Examples for comparing Temporal Patterns, Spatial Evolution, and Interaction Scale using stable seeded recipes while holding most other components fixed;
- every Process Lab component help page includes what the component changes, what it should not change, what to look for in the heatmap, useful display layers, and common confusion;
- Process Lab Process Example view includes process contracts with inspired-by models, simplified claim, interaction scale, component recipe table, sampling interpretation, what the example is not, suggested display layers, and validation pattern;
- modifying one primitive component after selecting a Process Lab Example Process marks the internal signature as modified and shows a component isolation hint plus educational compatibility warnings when a selected combination may be confusing or only partially supported;
- Process Lab graph-backed fields prefer emitted `edgeMessages` and `nodeTransitions` for Graph Messages, State Transitions, ROI Meaning, and Inspector views, falling back to inferred diagnostics only when emitted records are unavailable;
- Process Lab Scenario Generation exposes source mode, seed, difficulty, duration, frame count, and validation policy controls, can generate `anchor.syntheticRoiScenario`, and exports `S(x,y,t)`, `L(x,y,t)`, graph/message layers, process contract, labels, diagnostics, and PASS/WARN/FAIL validation summaries;
- Process Lab inspector reports source support / legacy Event Likelihood `L(x,y,t)` separately from Observed Sample Value `S(x,y,t)`, plus Pattern Composition, value distribution, seeded-value status, value band, and pattern-relevant parameters;
- Process Lab Display Layer includes Event Likelihood, Sample Value + Likelihood Overlay, Graph Topology, Graph Communities, Node States, Graph Messages, Community + Messages, State Transitions, ROI Meaning, and Diagnostics Overlay, and switching to Event Likelihood renders the same `eventLikelihoodField` that drives event origins, jumps, walks, and propagation;
- Process Lab labels selected behavior as Time-Indexed, State-Evolving, or History-Aware in the inspector;
- Process Lab does not expose Forecast, Truth, Uncertainty, or current-coupled controls;
- generated missions preserve `sampleFieldConfig` when configured;
- scrubbing mission time changes temporal sample fields such as periodic, burst, moving, propagating, or seeded texture-like patterns where selected;
- Coupled Fields Demo, not the sample-only demo, covers current-advected sample behavior;
- Uncertainty / Forecast Demo exposes Hidden Truth, Forecast / Expected State, Observations, Belief / Updated Estimate, Expected-State Uncertainty, Innovation, Surprise, Forecast Error, Unknown-Event Probability, and Sampling-Priority Preview views;
- Uncertainty / Forecast Demo Add Samples / Update Belief actions create noisy observations, update belief, reduce nearby uncertainty, and report forecast-error, hidden-event, and false-alarm diagnosis in the explanation panel;
- Sampling Priority Demo opens from Simulation Lab, exposes Scenario / Sampling Method / View Layer / Candidate Mode controls, states that event intensity is not sampling priority, generates candidate sample points, exports `samplingPriorityModel`, `candidateSamplePoints`, and `priorityDiagnostics`, and marks route/flow coupling false;
- Gold Star / priority targets remain separate from ROI cells and are labeled as sampling targets or objectives rather than GPS waypoint truth;
- solver packets and result exports preserve visible sample-field metadata while fair stochastic packets omit hidden truth.

## Core Development Checks

Leaderboard checks should cover:

- Challenge Mode attempts save with `experienceMode: "challenge"` and `leaderboardScope: "challenge"`;
- Simulation Lab attempts save with `experienceMode: "simulationLab"` and `leaderboardScope: "simulationLab"`;
- manual, Greedy Planner, external solver, imported plan, and saved replay attempts display route-source labels;
- truth/oracle-assisted imported plans display fairness labels and do not look like unlabeled fair manual runs;
- old leaderboard records without scope/source metadata still load and default to Challenge scope;
- scenario fingerprints remain stable for the same UUID/config/generator-version benchmark.

Custom challenge import/export checks should cover:

- Mission Editor exports raw `anchor.level`, `anchor.challenge`, and optional challenge-plus-history packages;
- custom challenge packages preserve `customScenario`, `sourceMetadata`, `leaderboardScope`, and replay seed metadata;
- Import Challenge JSON summarizes attached best-path history without merging it automatically;
- Play in Challenge Mode sets `experienceMode: "challenge"`;
- Open in Simulation Lab sets `experienceMode: "simulationLab"`;
- Import Attached History merges only the attached leaderboard snapshot for packages that include one.

After JavaScript changes, run:

```bash
npm.cmd run check
```

For model-stack integration checkpoints, also run:

```bash
node tools/js/audit_model_stack_inventory.mjs
node tools/js/smoke_model_stack_integration.mjs
node tools/js/audit_demo_export_metadata.mjs
node tools/js/audit_docs_model_stack_links.mjs
```

For the P0 Benchmark Mode architecture skeleton, also run:

```bash
node tools/js/smoke_benchmark_mode_contract.mjs
node tools/js/smoke_benchmark_run_record.mjs
node tools/js/smoke_mission_objective_taxonomy.mjs
node tools/js/smoke_benchmark_mode_ui_contract.mjs
```

For the P1 Planner / Mission Evaluation route-execution contract, also run:

```bash
node tools/js/smoke_benchmark_episode_contract.mjs
node tools/js/smoke_benchmark_route_execution_record.mjs
node tools/js/smoke_benchmark_result_adapter.mjs
node tools/js/smoke_benchmark_attempt_registry.mjs
```

For the U0/U1 Uncertainty / Forecast belief-state sandbox, also run:

```bash
node tools/js/smoke_uncertainty_field_math.mjs
node tools/js/smoke_uncertainty_observation_model.mjs
node tools/js/smoke_uncertainty_belief_update.mjs
node tools/js/smoke_uncertainty_diagnostics.mjs
node tools/js/smoke_uncertainty_forecast_demo.mjs
```

For the S1 Sampling Priority / Acquisition sandbox, also run:

```bash
node tools/js/smoke_sampling_priority_field_math.mjs
node tools/js/smoke_sampling_priority_model.mjs
node tools/js/smoke_sampling_priority_scenarios.mjs
node tools/js/smoke_sampling_priority_candidates.mjs
node tools/js/smoke_sampling_priority_demo.mjs
```

For the S2 Flow-Coupled Sampling / Glider Action Value sandbox, also run:

```bash
node tools/js/smoke_flow_coupled_sampling_field_math.mjs
node tools/js/smoke_glider_action_value_model.mjs
node tools/js/smoke_flow_coupled_sampling_scenarios.mjs
node tools/js/smoke_glider_action_candidates.mjs
node tools/js/smoke_flow_coupled_sampling_demo.mjs
```

After Learning Labs changes, run:

```bash
node tools/js/smoke_learning_lab_scientific_modeling.mjs
node tools/js/smoke_learning_lab_ca_ocean_processes.mjs
node tools/js/smoke_learning_lab_deterministic_processes.mjs
node tools/js/smoke_learning_lab_flow_fields.mjs
node tools/js/smoke_learning_lab_coupled_sampling_space.mjs
node tools/js/smoke_learning_lab_uncertainty.mjs
node tools/js/smoke_learning_lab_stochastic_coupled_sampling_space.mjs
node tools/js/smoke_learning_lab_planner_mission_evaluation.mjs
node tools/js/smoke_learning_labs_static.mjs
```

On non-Windows shells, the equivalent is:

```bash
npm run check
```

This runs `node tools/check-js.mjs`, which checks JavaScript syntax/import health and validates sample JSON parsing.

## Optional E2E Setup

Install development dependencies:

```bash
npm install
```

Install Playwright browsers:

```bash
npx playwright install
```

Run smoke tests:

```bash
npm.cmd run test:e2e
```

Run headed:

```bash
npm.cmd run test:e2e:headed
```

The smoke spec starts a small Node static server on `127.0.0.1:9321` for tests only. This server is not part of normal gameplay and does not change the static-hosting model.

## Current Smoke Coverage

The e2e smoke tests verify:

- app loads
- main menu appears
- Learning Labs links to the Scientific Computational Modeling, CA for Ocean-Relevant Processes, Deterministic Spatiotemporal Processes, Deterministic Dynamic Flow Fields, Oracle / Deterministic Coupled Sampling Space, Stochastic / Uncertainty, Stochastic Coupled Sampling Space, Sampling Priority to Glider Action Value, and Planner / Mission Evaluation static pages
- Flow Fields Demo opens, switches demo modes, shows Current Field Diagnostics, switches Uniform/Eddy presets, exports `flowFieldDiagnostics` / `flowFieldModel`, and enables an additive layer
- ROI Generator Demo opens, switches distributions, regenerates, and returns to main menu
- level select opens
- Tutorial 01 starts
- mission briefing appears
- planning scene appears
- plan export button exists
- a waypoint can be added
- simulation can finish
- debrief appears
- level generator opens

These tests avoid pixel-perfect assertions and focus on high-level UI flow.

## Headless Solver Checks

The optional Node.js solver path should remain Phaser/DOM-free. A local sample loop is:

```bash
node tools/js/headless_solver.mjs tools/js/examples/sample_solver_packet.json %TEMP%/anchor.headless.plan.json --debug
node tools/js/headless_validate_plan.mjs tools/js/examples/sample_solver_packet.json %TEMP%/anchor.headless.plan.json
```

On Unix-like shells, use a temporary path such as `/tmp/anchor.headless.plan.json`.

Expected behavior:

- the solver writes an importable `anchor.plan`;
- default metadata is forecast-only and non-oracle;
- validation reports shared route diagnostics when the plan is invalid;
- the browser remains the authoritative simulator and scorer.

## Greedy Planner Robustness Checklist

Manual planner checks should cover:

- selected-glider-only planning; non-selected glider routes remain unchanged;
- other glider routes reduce remaining/depleted value but are not treated as terrain;
- planner busy state prevents duplicate runs;
- worker fallback does not change the accepted plan shape;
- every generated segment is checked before append;
- final route audit runs before accepting the generated plan;
- terminal carry-through waypoint exceeds mission duration when safe feasible movement remains;
- over-duration terminal waypoint is a warning, not an Execute blocker;
- blocked output reports a stop reason such as `no_reachable_feasible_candidates`, `no_executable_route_after_validation`, or `planner_generated_blocked_segment`;
- the right Waypoint Timeline and Mission Console do not show a generated blocked route as valid.

## Dynamic Current / Topology Checklist

Manual current checks should cover:

- static fields stay fixed while particles move through them;
- dynamic fields continue changing direction and magnitude over mission time;
- High dynamic complexity has visibly stronger direction/magnitude variation than Low;
- same challenge UUID/config/generation version reproduces the same current field;
- a different challenge UUID produces different seeded variation;
- `Topology-Aware Composite` reports open water, shoreline, island-adjacent, channel, and bay/pocket behavior where the terrain supports them;
- shoreline current into land raises shoreline risk and is damped/deflected when boundary mode requires it;
- channel flow aligns with the estimated channel axis instead of rotating randomly through land;
- bay/pocket flow is more contained than open water unless intentionally configured;
- `globalThis.ANCHOR_DEBUG_TOPOLOGY_CURRENT_AUDIT = true` logs `[CurrentAudit][RegionStats]` and suspicious-sample warnings;
- hover tooltip, Travel Cost, Risk/Safety, Greedy Planner, and simulation use the same current sampler metadata.

## Manual Smoke Checklist

When time allows, run a browser smoke pass:

- tutorial campaign start, planning, simulation, and debrief;
- Flow Fields Demo and ROI Generator Demo open from the `Demos` section and return to Main Menu;
- deterministic generated challenge;
- stochastic generated challenge with forecast controls;
- level generator and Environment Editor import/export;
- plan import/export and invalid-plan rejection;
- solver packet export and external plan import;
- surface observation export and plan-segment import;
- best-path overlay, rerun, load-as-plan, and export;
- leaderboard import/export;
- dataset export.

## Process Example Contexts

Foundational CA Models are known local-rule models used to teach cells, states, neighborhoods, update rules, and emergent behavior. Ocean-Relevant Process Analogs are simplified CA/grid-process-inspired event or process layers that resemble environmental behaviors important for AUV sampling, but they are not physical flow models or calibrated ocean simulations.

Observable Process Patterns are bridge metadata rather than the primary selector. For example, Forest Fire maps to Propagating Fronts, which bridges to River Plume Front and Shoreline Runoff Pulse analogs. Greenberg-Hastings maps to Excitable Waves. Sandpile maps to Threshold Cascades, which bridges to turbidity or episodic discharge analogs.

Science boundary: the deterministic process demo teaches local process evolution S(x,y,t). Flow Fields teaches current vectors F(x,y,t). Coupled Dynamic Sampling Space combines process plus flow plus constraints. Uncertainty / Forecast adds hidden truth, forecast, belief, observations, and uncertainty. Ocean-relevant analogs in this demo are not calibrated ocean models.
## Active Example State

The visible Process Lab mode plus the context-specific model or analog selector is the primary identity for the Deterministic Spatiotemporal Process Lab. The mode selector, context-specific model or analog selector, center subtitle, right-panel Current Lab State, debug object, scenario metadata, and exports should agree on the same selected example.

`referenceSignature*` fields remain for compatibility and represent the mapped observable pattern, not the primary selected example. New consumers should prefer the `processExample` block in demo/scenario exports. `processExample.mappedReferenceSignatureId` should match the legacy flat `referenceSignatureId`.

Ocean-Relevant Process Analogs are educational event/process-layer analogs. They are not calibrated flow models, ocean forecasts, uncertainty models, or mission planners; flow coupling and uncertainty realism belong in the coupled and uncertainty demos.

## Planner Benchmark P2 Checks

Planner Benchmark execution integration is covered by `node tools\js\smoke_benchmark_episode_runtime.mjs`, `node tools\js\smoke_benchmark_metadata_pipeline.mjs`, `node tools\js\smoke_benchmark_result_exports.mjs`, and `node tools\js\smoke_benchmark_attempt_session.mjs`. The focused Playwright benchmark grep checks the Benchmark Modes overview and a synthetic Debrief export path for run-record, route-execution, and attempt-set JSON. P2 uses the existing simulator/debrief and does not add a new planner or scoring redesign.

## P3 Benchmark Comparison Smokes

P3 adds smoke tests for `BenchmarkComparisonViewModel`, `BenchmarkRouteReviewViewModel`, `BenchmarkDebriefPanel`, and the `anchor.benchmark.comparison` export. These tests verify that comparison UI remains an interpretation layer and does not add a new planner or scoring redesign.

## P4 Benchmark Route Overlay Smokes

P4 route overlay coverage is in:

```bash
node tools/js/smoke_benchmark_route_geometry_adapter.mjs
node tools/js/smoke_benchmark_route_overlay_view_model.mjs
node tools/js/smoke_benchmark_route_overlay_panel.mjs
node tools/js/smoke_benchmark_route_overlay_export.mjs
```

The focused benchmark Playwright grep checks Route Overlay visibility, layer selection, debug fields, and `anchor.benchmark.route-overlay` export JSON.
## P5 Planner Benchmark Import / Persistence Smokes

Run these after changing benchmark artifact import, attempt persistence, or Debrief import UI:

```bash
node tools/js/smoke_benchmark_artifact_import.mjs
node tools/js/smoke_benchmark_attempt_persistence.mjs
node tools/js/smoke_benchmark_import_view_model.mjs
node tools/js/smoke_benchmark_import_panel.mjs
node tools/js/smoke_benchmark_attempt_session_export.mjs
```

These checks are browser-free and use fake storage where local persistence is needed.
## Adaptive Benchmark P6 Mission Manager

Run these after changing Adaptive Benchmark mission-manager contracts, fixtures, exports, or UI:

```bash
node tools/js/smoke_adaptive_mission_manager_contract.mjs
node tools/js/smoke_adaptive_diagnosis_model.mjs
node tools/js/smoke_adaptive_objective_policy.mjs
node tools/js/smoke_adaptive_manager_state.mjs
node tools/js/smoke_adaptive_surfacing_event.mjs
node tools/js/smoke_adaptive_manager_fixtures.mjs
node tools/js/smoke_adaptive_benchmark_view_model.mjs
node tools/js/smoke_adaptive_benchmark_panel.mjs
node tools/js/smoke_adaptive_benchmark_exports.mjs
```

The focused Benchmark Playwright grep should confirm Adaptive Benchmark shows Mission Manager, objective authority, player/solver route authority, fixture switching, recommended objectives, and adaptive preview export JSON. P6 does not run adaptive routes, add route planning, redesign scoring, or add MARL/RL.

## P7 Adaptive Benchmark Tests

P7 adds focused smoke scripts for adaptive runtime, evidence adaptation, surfacing loop decisions, next-leg handoff, episode trace, surfacing panel HTML, and execution exports. Focused Benchmark E2E checks Adaptive Benchmark overview launch/export controls and a synthetic Debrief surfacing review.

## P8 Adaptive Session Tests

P8 adds smoke coverage for adaptive episode sessions, leg records, compact persistence with fake storage, objective-history view models, session-panel HTML escaping, adaptive artifact import/merge, and P8 exports. Focused Benchmark E2E checks adaptive session review and export controls.
## H0 Headless Schema Checks

Headless/Colab schema alignment is covered by `smoke_headless_schema_contract.mjs`, `smoke_headless_bundle_manifest.mjs`, `smoke_browser_headless_schema_map.mjs`, `smoke_headless_export_adapter.mjs`, and `audit_headless_schema_alignment.mjs`. These checks verify mapping coverage, visibility-tier handling, and that H0 does not claim a Python package, new simulator, new planner, or MARL/RL implementation.

## H1 Node Headless Runtime Checks

Run these after changing `src/core/headless/runtime/`, `tools/js/headless_oceanbox.mjs`, or headless bundle docs:

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

The import-boundary audit keeps H1 free of Phaser, DOM, UI modules, browser scenes, and localStorage. Node headless runtime over portable ANCHOR core logic. Browser ANCHOR remains the official visual referee and scoring UI.

## H2 Browser Headless Bundle Loader Checks

Run these after changing `src/core/headless/HeadlessBundle*.js`, `src/core/headless/HeadlessCsv.js`, `src/ui/headless/`, `HeadlessBundleViewerScene`, or `tools/js/headless_oceanbox.mjs`:

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

Focused browser smoke should open Simulation Lab, launch Headless Bundle Viewer, load the example bundle, confirm `globalThis.ANCHOR_HEADLESS_BUNDLE_DEBUG`, and export `anchor.browser.headless-bundle-summary`. The viewer is not official browser scoring and not a Python simulator.

## H2.1 Checked-In Headless Fixture Checks

After changing headless fixture generation, bundle loading, browser summary export, or Colab docs, run:

```bash
node tools/js/generate_headless_example_bundles.mjs
node tools/js/smoke_headless_example_bundle_fixture.mjs
node tools/js/smoke_headless_browser_fixture_roundtrip.mjs
```

The public fixture must load in the Headless Bundle Viewer via `Load Example Bundle`, validate as PASS or WARN, omit hidden-truth payloads, and export `anchor.browser.headless-bundle-summary` without `T_hiddenTruth`. The debug fixture may include hidden truth only when manifest visibility marks it as `hiddenTruth`, `oracle`, or `debugAll`.

## H3.1 Solver Packet Roundtrip Checks

After changing solver-packet adapters, headless bundle writing/loading, or roundtrip docs, run:

```bash
node tools/js/generate_headless_solver_roundtrip_examples.mjs
node tools/js/smoke_headless_solver_packet_adapter.mjs
node tools/js/smoke_headless_plan_adapter.mjs
node tools/js/smoke_headless_solver_roundtrip_contract.mjs
node tools/js/smoke_headless_roundtrip_export_contract.mjs
node tools/js/smoke_headless_roundtrip_cli_consolidation.mjs
node tools/js/smoke_headless_roundtrip_fixtures.mjs
node tools/js/audit_headless_roundtrip_visibility.mjs
node tools/js/smoke_headless_solver_packet_roundtrip.mjs
node tools/js/smoke_headless_roundtrip_cli.mjs
node tools/js/headless_oceanbox.mjs roundtrip --solver-packet docs/examples/headless_solver_packet.example.json --plan docs/examples/headless_solver_plan.example.json --out runs/h3-roundtrip --combined-json --no-hidden-export
```

The public roundtrip should validate packet visibility as PASS, validate the submitted plan as PASS, write canonical `anchor.headless.solver-roundtrip-report`, write `anchor.headless.solver-roundtrip-bundle`, omit `hidden_fields.json`, load through the Headless Bundle Viewer via `Load Example Roundtrip`, and export `anchor.browser.headless-roundtrip-summary` without `T_hiddenTruth`.

## P9 Hidden Event / Forecast-Correction Checks

Run these after changing `src/core/science/`, Adaptive Benchmark science integration, or headless science diagnostics:

```bash
node tools/js/smoke_science_diagnosis_types.mjs
node tools/js/smoke_observation_surprise_model.mjs
node tools/js/smoke_evidence_coherence_model.mjs
node tools/js/smoke_forecast_correction_state.mjs
node tools/js/smoke_hidden_event_hypothesis_state.mjs
node tools/js/smoke_science_discovery_lifecycle.mjs
node tools/js/smoke_science_discovery_fixtures.mjs
node tools/js/smoke_adaptive_science_diagnosis_integration.mjs
node tools/js/smoke_headless_science_diagnostics.mjs
node tools/js/smoke_headless_roundtrip_science_diagnostics.mjs
```

The checks verify that forecast correction and hidden-event hypotheses are distinct, science diagnostics remain public-safe, and no artifact claims production data assimilation, calibrated ocean forecasting, route planning, scoring changes, or MARL/RL.

## P10 Adaptive Science-Diagnosis Handoff

Science diagnosis informs the mission-manager objective recommendation. It does not generate a route. Forecast correction means the expected field existed but was wrong. Hidden event hypothesis means observations may indicate a phenomenon not represented in the forecast. The player or solver still plans the route.

P10 adds adaptive science-diagnosis context, mission-manager rationale, next-leg handoff metadata, objective-history display fields, and public-safe headless/browser summaries. It does not implement a new planner, scoring redesign, production data assimilation, GP/GMRF production inference, calibrated ocean forecast, Python simulator, or MARL/RL. Node/OceanBox-JS remains the canonical non-browser runtime; Python/Colab analyze artifacts or call Node.