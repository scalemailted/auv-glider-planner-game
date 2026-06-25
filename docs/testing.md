# Testing

The browser game does not require a build step, backend, Playwright, or`node_modules` for normal use. GFX-R2/GFX-R3A/GFX-R3B use the checked-in Three.js runtime under `vendor/three/`, with npm `three` remaining the source package for vendor refresh checks. Normal local serving still works with:

```bash
python -m http.server 8000
```

Playwright is optional and intended for development smoke testing.

## SCI-VALID-R2A Scientific Validation Checks

Run these after changing `packages/validation`, validation artifacts, scientific-validation schemas, the Methods & Validation route, or validation docs:

```bash
node tools/science/build_validation_baseline.mjs
node tools/tests/scientific_validation.test.mjs
node ./node_modules/@playwright/test/cli.js test tests/e2e/scientific_validation_methods.spec.js --reporter=line --workers=1
```

The baseline builder compares checked-in artifacts by default. Use `--update` only when intentionally refreshing official reports after review. These checks distinguish software verification, numerical verification, physical plausibility, external comparison, and operational validation; they do not certify operational ocean validity.

For static GitHub Pages compatibility checks, run:

```bash
npm.cmd run check:three-vendor
npm.cmd run build:pages
npm.cmd run smoke:pages
```

See `docs/threejs_static_runtime.md` for the import-map and vendored-runtime contract.

## COLAB-BENCH-R1 Classical Planner Notebook Checks

Run these after changing the benchmark notebook, `tools/python/anchor_benchmark/`, compact fixtures, solver-packet/plan compatibility, or Pages notebook download policy:

```bash
node tools/js/audit_colab_classical_benchmark.mjs
node tools/js/evaluate_colab_benchmark_plan.mjs --solver-packet tests/fixtures/colab_benchmark/static_additive_routing_solver_packet.json --plan tests/fixtures/colab_benchmark/plans/static_additive_astar.anchor.plan.json --out tmp/colab-benchmark-eval
node ./node_modules/@playwright/test/cli.js test tests/e2e/colab_classical_benchmark.spec.js --reporter=line --workers=1
```

If Python is available, also run:

```bash
python -m unittest tools/python/tests/test_anchor_benchmark.py
python -m tools.python.anchor_benchmark.cli --solver-packet tests/fixtures/colab_benchmark/static_additive_routing_solver_packet.json --out anchor_benchmark_output
```

Python tests are optional local tooling tests; normal browser usage does not require Python. The Node evaluator remains the authoritative validation/simulation/scoring bridge for notebook plans.

## SCORE-PKG-R1 Scoring Package Checks

Run these after changing `packages/scoring`, score forwarders, result/debrief score metadata, benchmark score adapters, or leaderboard score metadata:

```bash
node tools/js/audit_scoring_package_dependencies.mjs
node tools/js/audit_scoring_package_browser_safety.mjs
node tools/js/audit_scoring_package_worker_safety.mjs
node tools/js/smoke_scoring_package_contracts.mjs
node tools/js/capture_scoring_package_r1_baseline.mjs
```

`npm.cmd run audit:packages` includes scoring package purity checks, and `npm.cmd run test:packages` includes scoring contracts plus the 20-case compact parity fixture. Official browser scoring, headless score reports, benchmark rewards, result exports, Debrief scorecards, and leaderboard metadata all flow through `packages/scoring` or compatibility forwarders.
## SIM-PKG-R2 Mission Simulator Package Checks

Run these after changing `packages/mission-simulator`, mission-simulator forwarders, `SimulationEngine` package authority adapters, or headless mission package authority adapters:

```bash
node tools/js/audit_mission_simulator_package_dependencies.mjs
node tools/js/audit_mission_simulator_package_browser_safety.mjs
node tools/js/audit_mission_simulator_package_worker_safety.mjs
node tools/js/smoke_mission_simulator_package_contracts.mjs
node tools/js/smoke_mission_simulator_package_forwarders.mjs
node tools/js/audit_mission_simulator_authoritative_runtime.mjs
node tools/js/smoke_mission_simulator_authoritative_runtime.mjs
node tools/js/capture_mission_simulator_package_r2_baseline.mjs
```

`npm.cmd run audit:packages` includes the mission-simulator purity and authoritative-runtime audits, and `npm.cmd run test:packages` includes the mission-simulator contract, forwarder, authoritative-runtime, and R2 compact parity-fixture checks. Focused browser workflows live in `tests/e2e/sim_pkg_r1_mission_simulator_package.spec.js` and are registered through the capability manifest.
## PROCESS-PKG-R1 Scalar Package Checks

Run these after changing `packages/scalar-processes`, scalar samplers, water-column scalar helpers, or scalar package forwarders:

```bash
node tools/js/audit_scalar_package_dependencies.mjs
node tools/js/audit_scalar_package_browser_safety.mjs
node tools/js/audit_scalar_package_worker_safety.mjs
node tools/js/smoke_scalar_package_artifact.mjs
node tools/js/smoke_scalar_package_sampler.mjs
node tools/js/smoke_scalar_package_diagnostics.mjs
node tools/js/smoke_scalar_package_forwarders.mjs
node tools/js/audit_scalar_package_parity.mjs
```

`npm.cmd run audit:packages` and `npm.cmd run test:packages` include these scalar package gates. The package owns scalar artifacts, source metadata, continuous sampling, water-column scalar helpers, and pure diagnostics. It does not own Process Lab engines, coupled teaching engines, rendering, vehicle physics, observation noise, or score formulas.
## WORLD-R1 Multiscale Domain Checks

WORLD-R1 validation keeps physical mission scale, planning lattice, source-field resolution, render LOD, and compact exports decoupled without changing runtime ownership:

```bash
node tools/js/smoke_operational_domain_spec.mjs
node tools/js/smoke_mission_resolution_profiles.mjs
node tools/js/smoke_operational_domain_coordinates.mjs
node tools/js/smoke_physical_mission_scale.mjs
node tools/js/smoke_multiresolution_field_sampler.mjs
node tools/js/smoke_resolution_invariant_science.mjs
node tools/js/smoke_regional_mission_defaults.mjs
node tools/js/smoke_regional_fleet_balance.mjs
node tools/js/audit_no_per_cell_regional_three_objects.mjs
node tools/js/audit_operational_domain_authority_boundaries.mjs
node tools/js/audit_regional_export_compactness.mjs
node tools/js/audit_regional_browser_headless_parity.mjs
```

## Three.js-First Mission Migration Checks

MIG-R1 makes Three.js the default production mission environment for planning and live simulation. Focused checks:

```bash
node tools/js/smoke_three_default_planning_runtime.mjs
node tools/js/smoke_three_default_simulation_runtime.mjs
node tools/js/audit_three_first_production_path.mjs
node tools/js/audit_phaser_deprecation.mjs
node tools/js/audit_three_simulation_boundaries.mjs
node tools/js/smoke_three_simulation_object_stability.mjs
node tools/js/audit_current_runtime_baseline.mjs
node tools/js/audit_three_pointer_ownership.mjs
node tools/js/smoke_three_interaction_surface.mjs
node tools/js/smoke_three_simulation_selection.mjs
node tools/js/audit_three_interaction_boundaries.mjs
node tools/js/smoke_mission_workspace_view_model_runtime.mjs
node tools/js/smoke_mission_world_pointer_coordinates.mjs
node tools/js/smoke_three_pointer_calibration.mjs
node tools/js/smoke_mission_drop_zone_view_model.mjs
node tools/js/smoke_three_drop_zone_layer.mjs
node tools/js/smoke_three_deployment_selection.mjs
node tools/js/smoke_mission_planning_tool_state.mjs
node tools/js/smoke_three_planning_tool_controls.mjs
node tools/js/smoke_three_deployment_player_flow.mjs
node tools/js/smoke_three_waypoint_player_flow.mjs
node tools/js/smoke_three_mission_camera_controller.mjs
node tools/js/smoke_three_camera_tool_arbitration.mjs
node tools/js/smoke_three_camera_pointer_calibration.mjs
node tools/js/smoke_three_standard_camera_mapping.mjs
node tools/js/smoke_three_left_click_drag_arbitration.mjs
node tools/js/smoke_three_right_drag_orbit.mjs
node tools/js/smoke_waypoint_tool_activation_pipeline.mjs
node tools/js/smoke_waypoint_command_pipeline.mjs
node tools/js/smoke_waypoint_ui_synchronization.mjs
node tools/js/smoke_camera_then_waypoint_calibration.mjs
node tools/js/audit_three_waypoint_pipeline_boundaries.mjs
node tools/js/audit_three_camera_controls_parity.mjs
node tools/js/audit_three_layer_coordinate_alignment.mjs
node tools/js/audit_three_workspace_runtime_errors.mjs
```

These checks verify the restored `src/game/main.js` + Phaser lifecycle baseline, default Three.js backends, query-gated legacy Phaser fallback, renderer boundary flags, pointer ownership, renderer lifecycle/error reporting, CSS-pixel pointer calibration, canonical drop-zone rendering, deployment selection, and the current inventory of remaining Phaser scene dependencies. The reverted DOM router and `AnchorBrowserRuntime` are not active. The legacy tactical renderer is diagnostic only and should not be used for new mission features.

For product-design consistency checks, use `docs/game_design_scientific_auv_planning.md` as the canonical source for the scientific mission loop, objective archetypes, visibility modes, scoring/regret direction, 2.5O gameplay, motion/path-planning boundary, and future production gameplay targets. Run`node tools/js/smoke_game_design_doc.mjs` after design-doc edits.

Run`node tools/js/smoke_main_menu_hub_contract.mjs` after landing-shell edits to confirm the Main Menu hub, compact idle console, right-panel suppression, debug object, and no-behavior-change guardrails.

Greedy Planner is useful for planner smoke checks because it should return promptly, preserve non-selected glider routes, and validate before simulation. See `docs/greedy_planner.md` for the expected selected-glider baseline behavior.

The main menu should expose a full-viewport product hub with three primary cards: `Challenge Mode`, `Simulation Lab`, and `Learning Labs`. The left Mission Console should remain compact on the landing hub, and the right waypoint panel should be hidden or compact until a mission or active scene needs it. Challenge Mode should expose guided challenges, random challenges, custom JSON import, Greedy Planner Race, Tutorials, and Challenge Leaderboard. Simulation Lab should expose scientific sandboxes, benchmark modes, headless bundle viewer, external solver workflows, Mission Editor, and import/export tools. Learning Labs should expose static concept pages and companion sandbox launch points. Field demos live inside Simulation Lab, not as a separate top-level section. Use `docs/flow_fields_demo.md` when validating `F(x,y,t)` current vectors, static/dynamic fields, additive layers, partition behavior, terrain boundary effects, and topology-aware shoreline risk. Use `docs/sample_fields_demo.md` when validating `L(x,y,t)` event likelihood, `S(x,y,t)` sample value, pure sample-value spatial fields, spatial parameters, temporal patterns, spatial evolution, Time-Indexed/Frequency-Based/State-Evolving/History-Aware state models, sampling effects, and freshness/revisit displays. Use `docs/coupled_fields_demo.md` for deterministic/oracle coupled sampling spaces: known process `C(x,y,t)`, known flow `F(x,y,t)`, known constraints, analytical process engines, and oracle objective `S*(x,y,t)`. Use `docs/uncertainty_forecast_demo.md` for hidden truth, forecast/expected state, noisy observations, belief, expected-state uncertainty, surprise, forecast error, unknown-event probability, and sampling-priority preview. Use the Stochastic Coupled Sampling Space learning lab when validating the teaching layer that combines posterior belief, expected uncertainty, unknown-event probability, flow, constraints, acquisition value, and oracle regret. Use docs/sampling_priority_demo.md for S1 global A_global(x,y,t). Use labs/sampling-priority-to-glider-action-value.html when validating the Learning Lab bridge between vehicle-independent science priority and glider-specific action value. Use docs/flow_coupled_sampling_demo.md for S2 glider-specific direct-leg Q_glider(g,x,y,t) action value; it must keep route planning, mission scoring, calibrated glider dynamics, and calibrated ocean forecasts out of scope. Use docs/threejs_planning_tools_and_camera.md and docs/threejs_waypoint_pipeline_and_camera_controls.md for visible Mission Workspace planning tools, waypoint command-pipeline repair, and standard camera-control parity. Use docs/renderer_architecture_and_webgpu_strategy.md for GFX-ARCH-R1 renderer boundaries: Phaser shell remains active, WebGPU is progressive enhancement, and renderer view models do not own simulation, scoring, planning, WebGPU fluid simulation, Python simulation, or MARL/RL. Use docs/benchmark_route_execution_contract.md when validating P1 benchmark episode configs, route-execution records, result/debrief adapters, attempt sets, and the boundary that P1 does not add a new planner or scoring redesign. Use docs/planner_benchmark_route_overlay.md when validating P4 route overlay geometry, layer controls, segment/waypoint details, export metadata, and the boundary that P4 only visualizes existing planned/executed routes. Use docs/adaptive_benchmark_mission_manager.md when validating P6 Adaptive Benchmark mission-manager diagnosis, objective transitions, surfacing records, exports, and the boundary that P6 does not execute adaptive routes, add a planner, redesign scoring, or add MARL/RL.

## THREE-R1.2A / THREE-R1.2A.1 / THREE-R1.2A.3 Water Column Checks

For the volumetric water-column renderer, run:

```bash
node tools/js/smoke_continuous_mission_geometry.mjs
node tools/js/smoke_operational_depth_layer_view_model.mjs
node tools/js/smoke_volumetric_mission_coordinates.mjs
node tools/js/smoke_volumetric_mission_world_view_model.mjs
node tools/js/smoke_three_operational_depth_slabs.mjs
node tools/js/smoke_depth_slab_seabed_mask.mjs
node tools/js/smoke_depth_layer_inspection.mjs
node tools/js/smoke_dive_trajectory_view_model.mjs
node tools/js/smoke_three_depth_trajectory_layer.mjs
node tools/js/smoke_three_depth_observations.mjs
node tools/js/audit_water_column_browser_headless_alignment.mjs
node tools/js/audit_volumetric_display_invariance.mjs
node tools/js/audit_three_water_column_boundaries.mjs
node tools/js/smoke_three_lifecycle_null_safety.mjs
node tools/js/smoke_main_menu_scene_stop_contract.mjs
node tools/js/smoke_mission_scene_cleanup_idempotence.mjs
node tools/js/smoke_generated_mission_water_column_config.mjs
node tools/js/smoke_legacy_surface_fallback.mjs
node tools/js/smoke_visible_water_column_stack.mjs
node tools/js/smoke_surface_default_result_parity.mjs
node tools/js/audit_volumetric_activation_boundaries.mjs
```

Focused browser checks should cover `Three Volumetric Water Column Planning`, `Three Depth-Aware Dive and Sampling`, `Three Scene Cleanup Is Null-Safe and Idempotent`, `Generated Mission Opens a Visible Volumetric Water Column`, and `Legacy Mission Uses Explicit Surface Compatibility Mode` in `tests/e2e/simulation_and_terrain.spec.js`. Human manual QA by the project owner remains pending; use `docs/manual_threejs_water_column_checklist.md`.
For THREE-R1.2A.3.1 continuous Mission UI stabilization, run:

```bash
node tools/js/smoke_continuous_mission_ui_state.mjs
node tools/js/smoke_html_mission_overlay_continuous_controls.mjs
node tools/js/audit_continuous_ui_runtime_references.mjs
node tools/js/smoke_continuous_ui_control_bindings.mjs
node tools/js/audit_continuous_feature_activation.mjs
node node_modules/@playwright/test/cli.js test tests/e2e/mission_planning.spec.js --grep "Continuous Mission Planning Starts Without Overlay Errors|Continuous Mission Controls Are Visible and Functional|Continuous Mission Plan Executes Through Canonical 3D Dive" --reporter=line
```

These checks assert that Start Planning completes without overlay errors, continuous controls bind once, Free Placement stores fractional coordinates, Snap to Cell stores canonical cell coordinates, dive/target-layer controls update canonical metadata, volumetric display controls report their fallback, Execute starts the canonical simulator, and Debrief carries continuous mission metadata. Human manual QA by the project owner remains pending; use `docs/manual_continuous_mission_ui_checklist.md`.
## Challenge Mode vs Simulation Lab

ANCHOR has two user-facing experiences built on the same mission engine.

Challenge Mode is the playable planning-puzzle experience. It emphasizes score, stars, medals, route quality, risk warnings, leaderboard comparison, and learning strategy through play.

Simulation Lab is the reproducible experiment sandbox. It emphasizes exact configuration, deterministic/stochastic setup, dynamic current-field metadata, solver packets, replay seeds, external solver workflows, JSON import/export, and auditability.

Both modes use the same terrain, current fields, hazards, glider physics, scoring core, route validation, planner APIs, and replay/export system. Smoke tests should confirm the main menu exposes Challenge Mode, Simulation Lab, and Learning Labs as viewport hub cards, the left Mission Console is compact on landing, the right waypoint panel is hidden or compact on landing, Tutorials appear under Challenge Mode, field demos and Mission Editor appear under Simulation Lab, static concept pages appear under Learning Labs, Challenge setup presents the left Mission Mode Navigator plus selected center briefing, selecting a mission updates the briefing without duplicating cards in the center, Generate Mission reaches the workspace, Simulation Lab setup keeps the detailed technical controls visible, Simulation Lab exposes Import / Export Tools / External Solver Evaluation / Benchmark Leaderboard, Challenge Mode exposes Play Custom Challenge, and launching either mode reaches the same mission workspace/simulation engine path.

## Segment Contribution Grades

Route-quality testing should include at least three manual plans:

- a low-immediate-value setup segment that improves access to a future Gold Star or high-value ROI region
- a hazardous shortcut that collects value but crosses hazard/shoreline risk
- a terminal carry-through segment that extends command coverage to mission end

The first should receive future setup credit, the second should receive risk penalties, and the third should be graded as carry-through coverage rather than invalid. Oebrief should show 3-hour block summaries, and result JSON should include `routeQuality`.

## Waypoint Semantics Checks

Waypoint tests should confirm old plans default to `kind: "navigation"`, normal map clicks show`Navigation`, surface/update waypoints emit `surface_update` events with `gpsFix: true`, Gold Star/planning-marker objectives are labeled as `Sampling Target`, and Greedy Planner over-duration final waypoints are `terminalCarryThrough` with `runtimeBehavior: "truncate_at_mission_end"`.

## Oynamic Sample Field Checklist

Manual sample-field checks should cover:

- Mission Mode selection persists into generated level/mission metadata;
- Challenge Mode opens with the left mission-mode navigator and a selected mission briefing in the center, not the technical setup grid;
- selecting a mission in the left navigator updates only the selected briefing/detail screen;
- the center briefing does not duplicate the full mission list;
- the right setup panel shows Mission Snapshot or is hidden, never Mission Waypoints;
- Challenge Mode presets choose sample-field/current/scoring defaults without forking the mission engine;
- Simulation Lab exposes the detailed sample-field controls directly;
- Process Lab can regenerate seeded sample-value fields and dynamic value fields. Oiscrete process contexts use a generation clock independent of render frames, with default `1 gen/s`, tick rates `0.25`, `0.5`, `1`, `2`, `4`, and `8`, plus Step Generation, Run/Pause, and Reset controls. Its left-panel controls are mode-aware: Foundational CA Models shows Mode, Foundational CA Model selector, Oisplay, Seed, and Export without a Pattern Source dropdown; Ocean-Relevant Process Analogs shows Mode, Ocean Process Analog selector, Oisplay, Seed, and Export without a Pattern Source dropdown; Custom Composer shows the full Source Field, Spatial Pattern / Geometry, Value Oistribution, Temporal Pattern, Spatial Evolution / Motion Rule, Interaction Scale / Hierarchy, State Model / Update Rule, Sampling Effect / Freshness, Oisplay / Oiagnostic Layer, Seed / Scenario Identity, Component Examples, Export, and Scenario Generation stack; Process Paint shows Mode, Process Paint tools, Oisplay, Seed, and Export; Rule Allocation Sandbox shows seeded random allocation controls without composer or paint controls; Oiagnostics is reached through Oisplay / Oiagnostic Layer and the right-panel Oiagnostics tab, not as a primary Mode option; Current Lab State and Field / Process Stats live in the right panel;
- Process Lab defaults to Foundational CA Models, shows exactly one context-specific model or analog selector in normal UI, hides the old Example Track selector, hides the Pattern Source and legacy Behavior Preset dropdowns unless debug legacy UI is enabled, and can switch to Custom Composer for direct primitive editing;
- Process Lab exposes Current Lab State and Behavior QA in the right panel, a `reference-signature-primary-ui-v1` debug/version stamp, and `globalThis.ANCHOR_ROI_UI_OEBUG` with active source, signature count, legacy visibility, right-panel mode, active fixture id, behavior validation status, and Value Oistribution accordion status;
- Process Lab diagnostics include feature-evolution analog metadata for `V_L(x,y,t)` / `V_S(x,y,t)` so presets can be checked for bounded drift, local propagation, multi-source pulsing, ripple activation, and non-physical-current boundaries;
- Process Lab exports and UI expose the likelihood/source mesh separately from likelihood/source nodes: `likelihoodField.values` reconstructs every cell's legacy `L(x,y,t)` value, while `likelihoodField.nodes` describes sources/basins that influence the mesh;
- Process Lab graph-backed modes expose hierarchical `graphField` metadata with cluster/community likelihood `C_k(t)`, cell likelihood/readiness `L_i(t)`, activation `A_i(t)`, topology, node/edge counts, update rule, node state counts, message totals, compact node state, top-level `clusters`, community-id grids, filtered top message summaries, and per-frame `graphState` / `graphActivation` / `graphCommunityId` / `graphClusterLikelihood` / `graphIncomingMessage` / `graphTopMessages` layers; cellular automata-inspired modes are tested as one graph-message rule family, not as the whole Process Lab;
- selecting a Process Lab Example Process updates the primitive controls, switching to Custom preserves editable primitive controls and clears reference metadata, modifying a primitive after selecting an example marks the internal signature as modified, and Export Oemo JSON includes `patternSource`, `referenceSignature`, `componentRecipe`, plus legacy `behaviorPreset` metadata only when applicable;
- Process Lab source fields include Uniform Likelihood, Gaussian Likelihood, Multi-Modal Likelihood, Gradient Likelihood, Patchy Likelihood, Seeded Texture Likelihood, and Sparse Candidate Sites, and can be static or dynamic as legacy `L(x,y,t)`;
- Process Lab spatial patterns are the final pure sample-value geometry set: Constant Field, Gradient / Trend, Clustered Field, Patchy / Correlated Field, Sparse Targets, Linear Band, Front / Boundary, Boundary Band, Monitoring Stations, and Seeded Texture;
- Process Lab value distributions include Constant Value, Uniform Random, Gaussian / Normal, Skewed Low, Skewed High, Bimodal Values, Heavy-Tailed, and Rare Extreme Events; Constant Field plus Uniform Random is not the same as Constant Field plus Constant Value;
- Process Lab exposes Stationary, Continuous Orift, Oiscrete Jump, Random Walk, Neighbor Propagation, Expansion, Contraction, Oivergence, Convergence, Morph / Mutation, Shear / Stretch, Rotational Swirl, and Branching Growth as spatial evolution options;
- Process Lab exposes Foundational CA Models and Ocean-Relevant Process Analogs as separate visible contexts. Foundational entries include Conway, Forest Fire, SIR, Greenberg-Hastings, Sandpile, Wa-Tor, Traffic CA, and Wireworld; observable entries include Propagating Fronts, Excitable Waves, Local Birth-Oeath Emergence, Recurrent Stationary Hotspots, Oiffusive / Epidemic Spread, Oirected Feature Transport, Cyclic Oominance, Oomain / Cluster Formation, Threshold Cascades / Avalanches, Interacting Population Migration, Freshness / Recovery, Pattern Formation / Morphogenesis, Congestion / Oensity Waves, and Structured Signal Propagation;
- Process Lab guided examples have CA taxonomy metadata, QA expectations, phenotype metrics, genotype notes, reference model catalog coverage, rule/update-function metadata, explicit fixture-backed initial layers, model-aware initial-condition modes (`curatedSeed`, `interactiveCanvas`, `deterministicRandomSeed`), Behavior QA status, and export metadata;
- Run`node tools\js\smoke_flow_field_math.mjs`,`node tools\js\audit_flow_field_presets.mjs`, and`node tools\js\smoke_flow_field_demo.mjs` to verify Flow Fields math, preset metadata, finite vectors, diagnostics, synthetic claim boundaries, UI labels, and export metadata.
- Run`node tools\js\smoke_coupled_process_field_math.mjs`,`node tools\js\smoke_coupled_process_engines.mjs`, and`node tools\js\smoke_oracle_coupled_objective.mjs` to verify deterministic coupled field math, analytical process engines, CA baseline adapter, and oracle objective metadata.
- Run`node tools\js\smoke_roi_reference_signatures.mjs` to verify all reference signatures load, generate fields/scenarios, and preserve metadata.
- Run`node tools\js\audit_roi_reference_signatures.mjs` to print PASS/WARN/FAIL educational validation summaries for every signature.
- Run`node tools\js\audit_roi_reference_coverage.mjs` to verify model catalog coverage, CA-family coverage, required taxonomy fields, and duplicate/missing reference metadata.
- Run`node tools\js\smoke_roi_view_filters.mjs` to verify graph display layers, aliases, captions, node/message filter defaults, ROI meaning layers, and filter normalization.
- Run`node tools\js\audit_spatiotemporal_process_examples.mjs`,`node tools\js\smoke_spatiotemporal_process_lab_contract.mjs`,`node tools\js\smoke_sampling_process_process_pattern_controls.mjs`,`node tools\js\smoke_sampling_process_mode_visibility.mjs`,`node tools\js\smoke_sampling_process_ui_config.mjs`,`node tools\js\smoke_sampling_process_console_sections.mjs`,`node tools\js\smoke_sampling_process_left_control_plane.mjs`,`node tools\js\smoke_sampling_process_panel_disclosure.mjs`,`node tools\js\smoke_sampling_process_console_view_model.mjs`,`node tools\js\smoke_sampling_process_console_handlers.mjs`,`node tools\js\smoke_sampling_process_temporal_semantics.mjs`,`node tools\js\smoke_sampling_process_metric_layers.mjs`,`node tools\js\smoke_sampling_process_export_builder.mjs`,`node tools\js\smoke_sampling_process_render_layers.mjs`,`node tools\js\smoke_sampling_process_view_model.mjs`,`node tools\js\smoke_sampling_process_paint_field_adapter.mjs`,`node tools\js\smoke_sampling_process_mode_controller.mjs`,`node tools\js\smoke_sampling_process_ui_polish.mjs`,`node tools\js\smoke_sampling_process_top_left_hierarchy.mjs`,`node tools\js\smoke_sampling_process_lab_contract.mjs`,`node tools\js\smoke_sampling_process_rules.mjs`,`node tools\js\smoke_sampling_process_evolution.mjs`,`node tools\js\smoke_sampling_process_initial_condition_editor.mjs`,`node tools\js\smoke_sampling_process_foundational_ca_examples.mjs`,`node tools\js\smoke_sampling_process_ocean_analogs.mjs`,`node tools\js\audit_sampling_process_example_behaviors.mjs`,`node tools\js\smoke_sampling_process_paint_model.mjs`, and`node tools\js\smoke_sampling_process_randomizer.mjs` to verify the renamed Process Lab terminology, visible workflow modes, Example Process controls, grouped foundational/observable examples, mode-aware HUO sections, unnumbered left control plane, collapsed Sampling Process accordions, topmost right-panel tabs, right-panel field/process stats, extracted left-console section renderer, action-first top-left hierarchy, extracted console state view-model, extracted console handler map, extracted export builder, extracted render-layer module, extracted inspector/diagnostic view-model module, extracted Process Paint field adapter, extracted mode/action controller, compact progressive-disclosure UI, canonical process-rule catalog, deterministic CA-style Process Paint evolution, Process Paint assignments, deterministic random allocation, preferred process fields, and legacy aliases.
- Process Lab exposes Motion Scope as Per Feature, Local / Neighborhood, and Global, with Per Feature as the default for old continuous-drift/random-walk configs;
- Process Lab Continuous Orift and Random Walk do not shift the whole field globally unless Motion Scope is explicitly Global;
- Process Lab exposes `Clustered Field` plus Cluster Count and Cluster Size rather than separate Single Cluster, Bimodal, and Multiple Clusters options;
- Process Lab left panel shows compact controls, Explain buttons, and the debug/version stamp, not expanded behavior explainer bodies or a standalone Current Summary card;
- Process Lab left controls are collapsed by default, and the right panel puts Recipe, Inspector, Help, and Oiagnostics tabs first; the selected tab filters the content shown below it;
- Process Lab Behavior Help supports Example Process, Source / Initial Field, Spatial Pattern / Geometry, Value Oistribution, Temporal Pattern, Spatial Evolution, Interaction Scale, State Model / Memory, Sampling Effect, and Oisplay Layer, and includes a Current Composition summary that routes current-coupled/uncertainty concepts to the Coupled Fields and Uncertainty / Forecast demos;
- Process Lab Process Example view includes observable pattern, rule/update-function, and sampling interpretation cards explaining time behavior, current sample value, near-future value, low/depleted/dead regions, best views, failure signs, and sampling intuition;
- Process Lab exposes Component Isolation Examples for comparing Temporal Patterns, Spatial Evolution, and Interaction Scale using stable seeded recipes while holding most other components fixed;
- every Process Lab component help page includes what the component changes, what it should not change, what to look for in the heatmap, useful display layers, and common confusion;
- Process Lab Process Example view includes process contracts with inspired-by models, simplified claim, interaction scale, component recipe table, sampling interpretation, what the example is not, suggested display layers, and validation pattern;
- modifying one primitive component after selecting a Process Lab Example Process marks the internal signature as modified and shows a component isolation hint plus educational compatibility warnings when a selected combination may be confusing or only partially supported;
- Process Lab graph-backed fields prefer emitted `edgeMessages` and`nodeTransitions` for Graph Messages, State Transitions, ROI Meaning, and Inspector views, falling back to inferred diagnostics only when emitted records are unavailable;
- Process Lab Scenario Generation exposes source mode, seed, difficulty, duration, frame count, and validation policy controls, can generate `anchor.syntheticRoiScenario`, and exports `S(x,y,t)`, `L(x,y,t)`, graph/message layers, process contract, labels, diagnostics, and PASS/WARN/FAIL validation summaries;
- Process Lab inspector reports source support / legacy Event Likelihood `L(x,y,t)` separately from Observed Sample Value `S(x,y,t)`, plus Pattern Composition, value distribution, seeded-value status, value band, and pattern-relevant parameters;
- Process Lab Oisplay Layer includes Event Likelihood, Sample Value + Likelihood Overlay, Graph Topology, Graph Communities, Node States, Graph Messages, Community + Messages, State Transitions, ROI Meaning, and Oiagnostics Overlay, and switching to Event Likelihood renders the same `eventLikelihoodField` that drives event origins, jumps, walks, and propagation;
- Process Lab labels selected behavior as Time-Indexed, State-Evolving, or History-Aware in the inspector;
- Process Lab does not expose Forecast, Truth, Uncertainty, or current-coupled controls;
- generated missions preserve `sampleFieldConfig` when configured;
- scrubbing mission time changes temporal sample fields such as periodic, burst, moving, propagating, or seeded texture-like patterns where selected;
- Coupled Fields Oemo, not the sample-only demo, covers current-advected sample behavior;
- Uncertainty / Forecast Oemo exposes Hidden Truth, Forecast / Expected State, Observations, Belief / Updated Estimate, Expected-State Uncertainty, Innovation, Surprise, Forecast Error, Unknown-Event Probability, and Sampling-Priority Preview views;
- Uncertainty / Forecast Oemo Add Samples / Update Belief actions create noisy observations, update belief, reduce nearby uncertainty, and report forecast-error, hidden-event, and false-alarm diagnosis in the explanation panel;
- Sampling Priority Oemo opens from Simulation Lab, exposes Scenario / Sampling Method / View Layer / Candidate Mode controls, states that event intensity is not sampling priority, generates candidate sample points, exports `samplingPriorityModel`, `candidateSamplePoints`, and `priorityOiagnostics`, and marks route/flow coupling false;
- Gold Star / priority targets remain separate from ROI cells and are labeled as sampling targets or objectives rather than GPS waypoint truth;
- solver packets and result exports preserve visible sample-field metadata while fair stochastic packets omit hidden truth.

## DIVE-R1.1 Segment Flight-Profile Checks

DIVE-R1.1 keeps waypoints horizontal and assigns dive-profile controls to incoming route segments. Focused checks:

```bash
node tools/js/smoke_mission_route_segments.mjs
node tools/js/smoke_segment_flight_plan.mjs
node tools/js/smoke_segment_profile_reorder_delete.mjs
node tools/js/smoke_water_column_layer_explorer.mjs
node tools/js/smoke_water_column_layer_interpolation.mjs
node tools/js/smoke_same_xy_layer_value_display.mjs
node tools/js/smoke_segment_profile_execution_parity.mjs
node tools/js/smoke_segment_profile_replan_preservation.mjs
node tools/js/audit_segment_flight_profile_authority.mjs
node tools/js/audit_water_column_explorer_authority.mjs
node tools/js/audit_water_column_layer_performance.mjs
npx.cmd playwright test tests/e2e/dive_r1_1_segment_profiles.spec.js --reporter=line
```

These checks confirm segment-profile inheritance, edit scope, reorder/delete behavior, water-column layer display, display authority boundaries, plan roundtrip preservation, and idle-glider-safe depth sampling. Full headed owner visual QA remains manual and should use docs/segment_flight_profile_authoring_audit.md.

## Core Oevelopment Checks

Leaderboard checks should cover:

- Challenge Mode attempts save with `experienceMode: "challenge"` and `leaderboardScope: "challenge"`;
- Simulation Lab attempts save with `experienceMode: "simulationLab"` and `leaderboardScope: "simulationLab"`;
- manual, Greedy Planner, external solver, imported plan, and saved replay attempts display route-source labels;
- truth/oracle-assisted imported plans display fairness labels and do not look like unlabeled fair manual runs;
- old leaderboard records without scope/source metadata still load and default to Challenge scope;
- scenario fingerprints remain stable for the same UUIO/config/generator-version benchmark.

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

For the GFX-ARCH-R1 renderer boundary scaffold, also run:

```bash
node tools/js/smoke_renderer_capability_model.mjs
node tools/js/smoke_renderer_host_contract.mjs
node tools/js/smoke_ocean_world_render_view_model.mjs
node tools/js/smoke_renderer_architecture_preview_scene.mjs
node tools/js/smoke_model_stack_integration.mjs
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

This runs`node tools/check-js.mjs`, which checks JavaScript syntax/import health and validates sample JSON parsing.

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
- Learning Labs links to the Scientific Computational Modeling, CA for Ocean-Relevant Processes, Oeterministic Spatiotemporal Processes, Oeterministic Oynamic Flow Fields, Oracle / Oeterministic Coupled Sampling Space, Stochastic / Uncertainty, Stochastic Coupled Sampling Space, Sampling Priority to Glider Action Value, and Planner / Mission Evaluation static pages
- Flow Fields Oemo opens, switches demo modes, shows Current Field Oiagnostics, switches Uniform/Eddy presets, exports `flowFieldOiagnostics` / `flowFieldModel`, and enables an additive layer
- ROI Generator Oemo opens, switches distributions, regenerates, and returns to main menu
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

The optional Node.js solver path should remain Phaser/OOM-free. A local sample loop is:

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
- blocked output reports a stop reason such as`no_reachable_feasible_candidates`,`no_executable_route_after_validation`, or `planner_generated_blocked_segment`;
- the right Waypoint Timeline and Mission Console do not show a generated blocked route as valid.

## Oynamic Current / Topology Checklist

Manual current checks should cover:

- static fields stay fixed while particles move through them;
- dynamic fields continue changing direction and magnitude over mission time;
- High dynamic complexity has visibly stronger direction/magnitude variation than Low;
- same challenge UUIO/config/generation version reproduces the same current field;
- a different challenge UUIO produces different seeded variation;
- `Topology-Aware Composite` reports open water, shoreline, island-adjacent, channel, and bay/pocket behavior where the terrain supports them;
- shoreline current into land raises shoreline risk and is damped/deflected when boundary mode requires it;
- channel flow aligns with the estimated channel axis instead of rotating randomly through land;
- bay/pocket flow is more contained than open water unless intentionally configured;
- `globalThis.ANCHOR_OEBUG_TOPOLOGY_CURRENT_AUOIT = true` logs `[CurrentAudit][RegionStats]` and suspicious-sample warnings;
- hover tooltip, Travel Cost, Risk/Safety, Greedy Planner, and simulation use the same current sampler metadata.

## Manual Smoke Checklist

When time allows, run a browser smoke pass:

- tutorial campaign start, planning, simulation, and debrief;
- Flow Fields Oemo and ROI Generator Oemo open from the `Simulation Lab` hub submenu and return to Main Menu;
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

Science boundary: the deterministic process demo teaches local process evolution S(x,y,t). Flow Fields teaches current vectors F(x,y,t). Coupled Oynamic Sampling Space combines process plus flow plus constraints. Uncertainty / Forecast adds hidden truth, forecast, belief, observations, and uncertainty. Ocean-relevant analogs in this demo are not calibrated ocean models.
## Active Example State

The visible Process Lab mode plus the context-specific model or analog selector is the primary identity for the Oeterministic Spatiotemporal Process Lab. The mode selector, context-specific model or analog selector, center subtitle, right-panel Current Lab State, debug object, scenario metadata, and exports should agree on the same selected example.

`referenceSignature*` fields remain for compatibility and represent the mapped observable pattern, not the primary selected example. New consumers should prefer the `processExample` block in demo/scenario exports. `processExample.mappedReferenceSignatureId` should match the legacy flat `referenceSignatureId`.

Ocean-Relevant Process Analogs are educational event/process-layer analogs. They are not calibrated flow models, ocean forecasts, uncertainty models, or mission planners; flow coupling and uncertainty realism belong in the coupled and uncertainty demos.

## Planner Benchmark P2 Checks

Planner Benchmark execution integration is covered by`node tools\js\smoke_benchmark_episode_runtime.mjs`,`node tools\js\smoke_benchmark_metadata_pipeline.mjs`,`node tools\js\smoke_benchmark_result_exports.mjs`, and`node tools\js\smoke_benchmark_attempt_session.mjs`. The focused Playwright benchmark grep checks the Benchmark Modes overview and a synthetic Oebrief export path for run-record, route-execution, and attempt-set JSON. P2 uses the existing simulator/debrief and does not add a new planner or scoring redesign.

## P3 Benchmark Comparison Smokes

P3 adds smoke tests for `BenchmarkComparisonViewModel`, `BenchmarkRouteReviewViewModel`, `BenchmarkOebriefPanel`, and the `anchor.benchmark.comparison` export. These tests verify that comparison UI remains an interpretation layer and does not add a new planner or scoring redesign.

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

Run these after changing benchmark artifact import, attempt persistence, or Oebrief import UI:

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

P7 adds focused smoke scripts for adaptive runtime, evidence adaptation, surfacing loop decisions, next-leg handoff, episode trace, surfacing panel HTML, and execution exports. Focused Benchmark E2E checks Adaptive Benchmark overview launch/export controls and a synthetic Oebrief surfacing review.

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

The import-boundary audit keeps H1 free of Phaser, OOM, UI modules, browser scenes, and localStorage. Node headless runtime over portable ANCHOR core logic. Browser ANCHOR remains the official visual referee and scoring UI.

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

Focused browser smoke should open Simulation Lab, launch Headless Bundle Viewer, load the example bundle, confirm `globalThis.ANCHOR_HEAOLESS_BUNOLE_OEBUG`, and export `anchor.browser.headless-bundle-summary`. The viewer is not official browser scoring and not a Python simulator.

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

## P10 Adaptive Science-Oiagnosis Handoff

Science diagnosis informs the mission-manager objective recommendation. It does not generate a route. Forecast correction means the expected field existed but was wrong. Hidden event hypothesis means observations may indicate a phenomenon not represented in the forecast. The player or solver still plans the route.

P10 adds adaptive science-diagnosis context, mission-manager rationale, next-leg handoff metadata, objective-history display fields, and public-safe headless/browser summaries. It does not implement a new planner, scoring redesign, production data assimilation, GP/GMRF production inference, calibrated ocean forecast, Python simulator, or MARL/RL. Node/OceanBox-JS remains the canonical non-browser runtime; Python/Colab analyze artifacts or call Node.
## P11 Water-Column Checks

Run these after water-column or headless bundle changes:

```bash
node tools/js/smoke_water_column_schema.mjs
node tools/js/smoke_water_column_field_model.mjs
node tools/js/smoke_dive_profile_model.mjs
node tools/js/smoke_water_column_observation_model.mjs
node tools/js/smoke_water_column_priority_model.mjs
node tools/js/smoke_headless_water_column_runtime.mjs
node tools/js/smoke_headless_roundtrip_water_column.mjs
node tools/js/smoke_adaptive_water_column_integration.mjs
node tools/js/smoke_headless_water_column_viewer_panel.mjs
node tools/js/audit_water_column_public_safety.mjs
node tools/js/audit_water_column_no_3d_planning_claims.mjs
```

## MOTION-R1 Motion Oynamics Checks

For MOTION-R1, run the focused motion smokes: `smoke_glider_motion_schema`, `smoke_motion_environment_sampler`, `smoke_glider_dynamics_model`, `smoke_plan_control_adapter`, `smoke_glider_trajectory_simulator`, `smoke_motion_diagnostics`, `smoke_mission_feasibility_report`, `smoke_headless_motion_runtime`, `smoke_headless_roundtrip_motion`, `smoke_headless_motion_viewer_panel`, `smoke_motion_planning_demo_scene`, and `audit_motion_planning_boundaries`. The focused Playwright grep should open Simulation Lab, launch Motion Planning Oemo, verify path-planning vs motion-planning copy, inspect `ANCHOR_MOTION_PLANNING_OEMO_OEBUG`, then confirm Headless Bundle Viewer, Planner Benchmark, and Adaptive Benchmark still open.

ENV-R1/GFX-R2 bathymetry checks: run`node tools/js/smoke_bathymetry_schema.mjs`,`node tools/js/smoke_bathymetry_field_model.mjs`,`node tools/js/smoke_bathymetry_mesh_model.mjs`,`node tools/js/smoke_ocean_world_geometry_adapter.mjs`,`node tools/js/smoke_bathymetry_world_view_scene.mjs`,`node tools/js/smoke_bathymetry_world_render_view_model.mjs`,`node tools/js/smoke_three_bathymetry_renderer_contract.mjs`,`node tools/js/smoke_bathymetry_visual_quality_contract.mjs`,`node tools/js/smoke_bathymetry_three_scene.mjs`,`node tools/js/smoke_three_bathymetry_browser_pixels.mjs`,`node tools/js/smoke_headless_bathymetry_runtime.mjs`,`node tools/js/smoke_headless_bathymetry_viewer_panel.mjs`,`node tools/js/audit_bathymetry_boundaries.mjs`, and`node tools/js/audit_bathymetry_renderer_boundaries.mjs`.
GFX-R3A live Mission Planning renderer checks: run`node tools/js/smoke_mission_world_coordinates.mjs`,`node tools/js/smoke_mission_world_render_view_model.mjs`,`node tools/js/smoke_mission_world_state_adapter.mjs`,`node tools/js/smoke_three_mission_renderer_contract.mjs`,`node tools/js/smoke_three_scalar_field_layer.mjs`,`node tools/js/smoke_three_mission_entity_layers.mjs`,`node tools/js/smoke_mission_workspace_three_backend_contract.mjs`, and`node tools/js/audit_three_mission_visual_parity.mjs`.

GFX-R3B Three.js planning interaction checks: run`node tools/js/smoke_mission_world_interaction_intent.mjs`,`node tools/js/smoke_mission_world_interaction_result.mjs`,`node tools/js/smoke_three_mission_hit_test_contract.mjs`,`node tools/js/smoke_three_mission_interaction_controller.mjs`,`node tools/js/smoke_mission_workspace_three_interaction_bridge.mjs`,`node tools/js/smoke_mission_planning_interaction_view_model.mjs`,`node tools/js/smoke_three_planning_interaction_layer.mjs`,`node tools/js/smoke_three_waypoint_interaction.mjs`,`node tools/js/smoke_three_planning_marker_interaction.mjs`,`node tools/js/smoke_three_agent_target_interaction.mjs`,`node tools/js/smoke_mission_workspace_three_interaction_state_preservation.mjs`, and`node tools/js/audit_three_planning_interaction_boundaries.mjs`. For browser coverage, run`npx playwright test tests/e2e/mission_planning.spec.js tests/e2e/workspace_and_challenge_setup.spec.js --grep "Three Planning|Mission Planning|Waypoint|Planning Marker|Gold Star|Bathymetric" --reporter=line`. Three.js planning interactions emit intents and route through canonical workspace commands; the renderer does not own the mission plan, route optimization, simulation, scoring, replay semantics, hidden truth, WebGPU fluid simulation, or MARL/RL. Three.js is the production mission renderer; legacy Phaser is a query-gated diagnostic fallback only.

## Mission Feasibility Validation Tiers

OOCS-SIM-R1 defines the validation target for a future mission-feasibility simulator and scientific benchmark. Current coverage includes`node tools/js/smoke_mission_feasibility_requirements_doc.mjs` for the requirement spec and`node tools/js/smoke_mission_feasibility_report.mjs` for the MOTION-R1 report skeleton.

Tier 0 - Educational Synthetic Consistency: deterministic seeds, no NaN/invalid fields, public hidden-truth safety, smoke tests, and scenario invariants.

Tier 1 - Physics / Motion Sanity: current assist improves travel feasibility, current opposition increases cost, cross-current increases track error, energy decreases monotonically, dive/depth changes cost energy, and depth constraints/bottom clearance are enforced.

Tier 2 - Benchmark Reproducibility: same seed + same plan + same runtime version yields the same trajectory/report/bundle, solver packet / plan / result schemas are stable, and browser/Node summaries agree within documented tolerance.

Tier 3 - Reference Scenario Calibration: compare synthetic cases against known analytical or published examples and verify qualitative current / energy / route tradeoffs.

Tier 4 - Real Mission Validation, Future: compare selected scenarios against real mission logs or published mission metrics, label limitations clearly, and never imply operational certification without evidence.

Future target smoke/audit names, not current commands unless implemented, are `smoke_motion_feasibility_metrics.mjs`, `smoke_motion_cost_matrix_export.mjs`, `smoke_scenario_comparison_report.mjs`, and `audit_mission_feasibility_claim_boundaries.mjs`.
## SCORE-R1 Shadow Mission Outcome Scoring

SCORE-R1 is shadow benchmark scoring. It does not replace official browser scoring, Challenge Mode scoring, leaderboard ranking, or existing debrief totals. Profiles are objective-aware and versioned; missing data is explicit; regret requires a compatible reference, and best-known attempt does not mean optimal. The Node/OceanBox-JS runtime remains the canonical headless runtime. Python/Colab analyzes exported artifacts or invokes Node; no Python simulator, planner, optimizer, MARL/RL, operational certification, SeaExplorer validation, or calibrated ocean forecast is added.

See [Mission Scoring and Regret](mission_scoring_and_regret.md) for the SCORE-R1 artifact contract and boundaries.
## REPLAY-R1 Smoke Tests

Replay alignment has focused smoke coverage:

```bash
node tools/js/smoke_replay_schema.mjs
node tools/js/smoke_replay_ordering.mjs
node tools/js/smoke_replay_digest.mjs
node tools/js/smoke_replay_contract_builder.mjs
node tools/js/smoke_replay_verifier.mjs
node tools/js/smoke_headless_replay_runtime.mjs
node tools/js/smoke_headless_replay_bundle_loader.mjs
node tools/js/smoke_headless_replay_viewer_panel.mjs
node tools/js/smoke_headless_replay_cli.mjs
node tools/js/audit_replay_boundaries.mjs
```

These checks exercise public replay artifacts, loader/viewer compatibility, CLI replay/verify, tampered checkpoint divergence, and public hidden-truth boundaries.

H4.1 replay hardening adds focused smoke coverage:

```bash
node tools/js/smoke_replay_json_schemas.mjs
node tools/js/smoke_replay_schema_validation.mjs
node tools/js/smoke_replay_integrity_verifier.mjs
node tools/js/smoke_replay_tamper_detection.mjs
node tools/js/smoke_replay_multi_agent_contract.mjs
node tools/js/smoke_replay_combined_separate_alignment.mjs
node tools/js/smoke_replay_cli_verify.mjs
node tools/js/smoke_replay_viewer_panel.mjs
node tools/js/smoke_replay_browser_summary_export.mjs
node tools/js/audit_replay_public_safety.mjs
node tools/js/audit_replay_authority_boundaries.mjs
```

These checks verify schemas, compatibility warnings, stable issue codes, tamper detection, CLI nonzero failure behavior, multi-agent public playback state, compact browser summary export, public-safety boundaries, and the absence of authoritative hidden-state resimulation claims.

## THREE-R1.1E Scene Isolation / Pose / Guidance / Waypoint Checks

Focused checks:

```bash
node tools/js/smoke_three_mission_scene_lifecycle.mjs
node tools/js/smoke_scene_transition_cleanup.mjs
node tools/js/smoke_glider_pose_view_model.mjs
node tools/js/smoke_three_glider_orientation.mjs
node tools/js/smoke_three_guidance_cone_layer.mjs
node tools/js/smoke_mission_grid_coordinate_contract.mjs
node tools/js/audit_three_mission_layer_alignment.mjs
node tools/js/smoke_waypoint_placement_assessment.mjs
node tools/js/smoke_three_invalid_waypoint_feedback.mjs
node tools/js/smoke_time_overrun_waypoint_semantics.mjs
node tools/js/audit_three_scene_isolation.mjs
node tools/js/audit_three_pose_guidance_boundaries.mjs
node tools/js/audit_three_waypoint_semantics.mjs
```

These checks cover lifecycle disposal, Main Menu shell reset contracts, renderer-neutral pose, quaternion glider orientation, canonical guidance rendering, coordinate helper roundtrips, layer-alignment reporting, hard-invalid waypoint rejection, mission-window warning acceptance, and the boundary that Three.js does not own planning, physics, scoring, or route feasibility.

## THREE-R1.1D Execute Mission Pipeline Checks

Run the focused execution parity checks:

```bash
node tools/js/smoke_mission_execution_transaction.mjs
node tools/js/smoke_execute_control_pipeline.mjs
node tools/js/smoke_execution_plan_snapshot.mjs
node tools/js/smoke_simulation_scene_launch_payload.mjs
node tools/js/smoke_simulation_first_step.mjs
node tools/js/smoke_three_simulation_waypoint_progress.mjs
node tools/js/smoke_three_simulation_observation_parity.mjs
node tools/js/smoke_three_simulation_control_parity.mjs
node tools/js/smoke_three_simulation_terminal_debrief.mjs
node tools/js/smoke_simulation_renderer_parity.mjs
node tools/js/audit_three_simulation_ui_parity.mjs
node tools/js/audit_three_execution_boundaries.mjs
node tools/js/audit_execute_pipeline_runtime_errors.mjs
```

Focused browser coverage should exercise Planning -> Execute -> Simulation -> Step/Play/Pause -> Finish -> Debrief through visible controls. The renderer must not own execution, simulation state, observations, scoring, result creation, or hidden truth.

## THREE-R1.2A.2 Tests

Depth-aware scoring adds focused smokes for dive feasibility, sample value, profile value, objective weighting, profile compatibility, score-event deduplication, debrief summaries, source-boundary checks, and browser/headless component parity.

## THREE-R1.2A.4 Predicted Dive Planning Checks

Run:

```bash
node tools/js/smoke_planned_dive_segment_view_model.mjs
node tools/js/smoke_planning_simulation_dive_model_parity.mjs
node tools/js/smoke_multi_yo_predicted_trajectory.mjs
node tools/js/smoke_three_planned_dive_trajectory_layer.mjs
node tools/js/smoke_planned_dive_bathymetry_clearance.mjs
node tools/js/smoke_predicted_sample_markers.mjs
node tools/js/smoke_planned_vs_realized_dive_comparison.mjs
node tools/js/audit_bathymetry_demo_path_source.mjs
node tools/js/audit_dive_prediction_boundaries.mjs
```

Focused browser checks should confirm a surface route, thermocline/deep predicted dive preview, multi-yo cycle preview, side-profile camera readability, terrain-limited clipping, and predicted-vs-realized distinction. Human manual QA by the project owner remains pending; use `docs/manual_predicted_dive_planning_checklist.md`.

## THREE-R1.2A.4.1 Planning Semantics Note

Surface waypoints are executable navigation/surfacing targets. Sampling targets are non-executable scientific objectives in the water column. Dive profiles determine underwater motion between surface waypoints. Predicted samples never earn score; actual observations are authoritative. The camera and vertical exaggeration are presentation only. Multi-yo prediction and execution use shared canonical kinematics. Performance quality profiles do not change canonical results. No arbitrary XYZ route planner is implemented. No operationally calibrated glider model is claimed.

## THREE-R1.2A.4.2 Performance Closure Checks

Run these before starting seabed mesh work:

```bash
node tools/js/smoke_three_performance_monitor.mjs
node tools/js/smoke_three_camera_performance_invariants.mjs
node tools/js/smoke_three_dirty_invalidation_matrix.mjs
node tools/js/smoke_three_resource_plateau_extended.mjs
node tools/js/smoke_e2e_static_server_cleanup.mjs
node tools/js/audit_three_performance_measurement_boundaries.mjs
npm.cmd run check
npm.cmd run test:e2e:focused
npm.cmd run test:e2e
```

For headed automated QA, run the focused grep with `--headed`. Human manual QA by the project owner remains separate and pending.

## THREE-R1.2A.4.3 Simulation Presentation and Grouped E2E

Run the new presentation checks with:

```bash
node tools/js/smoke_three_simulation_presentation_scheduler.mjs
node tools/js/smoke_simulation_presentation_dirty_matrix.mjs
node tools/js/smoke_incremental_realized_trajectory.mjs
node tools/js/smoke_incremental_simulation_events.mjs
node tools/js/smoke_simulation_field_frame_caching.mjs
node tools/js/smoke_simulation_hud_throttling.mjs
node tools/js/smoke_finish_instantly_presentation_budget.mjs
node tools/js/audit_simulation_presentation_boundaries.mjs
```

`npm.cmd run test:e2e` is the grouped Playwright authority. It is not reduced coverage: `tools/js/audit_playwright_group_coverage.mjs` proves every listed Playwright test is assigned exactly once before groups run. `npm.cmd run test:e2e:monolithic` remains a diagnostic command.

## THREE-R1.2A.4.4 Render-Cost Checks

Run the render-cost smoke/audit set before terrain work:

```bash
node tools/js/smoke_three_gpu_timer.mjs
node tools/js/smoke_three_render_pass_contract.mjs
node tools/js/smoke_three_context_slab_lod.mjs
node tools/js/smoke_three_transparency_policy.mjs
node tools/js/smoke_three_pixel_ratio_profiles.mjs
node tools/js/smoke_three_static_matrix_policy.mjs
node tools/js/smoke_three_instanced_marker_contract.mjs
node tools/js/smoke_three_presentation_cadence.mjs
node tools/js/audit_three_overdraw_and_render_cost.mjs
node tools/js/audit_three_render_cost_boundaries.mjs
```

Focused browser checks:

```bash
node node_modules/@playwright/test/cli.js test tests/e2e/environment_rendering.spec.js --grep "Three Balanced Renderer Meets Bathymetry Headroom Gate|Three Context Slabs Reduce Cost Without Losing Dive Context|Three Quality Profiles Preserve Canonical Simulation Result|Three Camera Remains Responsive Under Live Simulation Load" --reporter=line
node node_modules/@playwright/test/cli.js test tests/e2e/environment_rendering.spec.js --grep "Three Balanced Renderer Meets Bathymetry Headroom Gate" --headed --reporter=line
```

Headed performance evidence is authoritative for the strict frame-interval gate. Headless timing is diagnostic only.

## THREE-R1.2B Terrain Checks

Run the terrain contract checks before broader browser validation:

```bash
node tools/js/smoke_bathymetry_surface_view_model.mjs
node tools/js/smoke_bathymetry_mesh_geometry.mjs
node tools/js/smoke_bathymetry_mesh_sampler_alignment.mjs
node tools/js/smoke_coastline_geometry.mjs
node tools/js/smoke_bathymetry_contours.mjs
node tools/js/smoke_bathymetry_fixture_metadata.mjs
node tools/js/smoke_three_bathymetry_terrain_layer.mjs
node tools/js/smoke_three_landmass_layer.mjs
node tools/js/smoke_three_coastline_layer.mjs
node tools/js/smoke_terrain_depth_slab_mask_alignment.mjs
node tools/js/smoke_terrain_target_clearance.mjs
node tools/js/smoke_terrain_route_clearance_visualization.mjs
node tools/js/audit_bathymetry_browser_headless_alignment.mjs
node tools/js/audit_bathymetry_renderer_boundaries_v2.mjs
node tools/js/audit_bathymetry_performance_boundaries.mjs
```

## THREE-R1.2B.1 Bathymetry Integration Closure Checks

Run the active-path and terrain integration checks with:

```bash
node tools/js/audit_no_legacy_terrain_production_imports.mjs
node tools/js/audit_bathymetry_scene_coordinate_alignment.mjs
node tools/js/audit_bathymetry_mesh_alignment_extended.mjs
node tools/js/smoke_coastline_topology_integrity.mjs
node tools/js/audit_terrain_water_column_mask_integrity.mjs
node tools/js/audit_terrain_trajectory_clearance_alignment.mjs
node tools/js/smoke_terrain_resource_lifecycle.mjs
node tools/js/smoke_terrain_quality_canonical_invariance.mjs
node tools/js/audit_playwright_group_coverage.mjs
```

Focused terrain E2E names:

```text
Three Mission Uses Continuous Bathymetric Terrain
Bathymetry Limits Predicted and Realized Dive Depth
Continuous Coastline Blocks Invalid Surface Waypoints
Water-Column Layers Respect Continuous Seabed
Bathymetric Demo and Mission Renderer Share Terrain Geometry
Three Bathymetric Terrain Preserves Render-Cost Gate
All Production Mission Phases Share One Bathymetry Contract
Three Bathymetry Resources Dispose Across Scene Transitions
```

## THREE-R1.2C Terrain Validation Checks

Focused terrain validation checks include the smoke_terrain_aware_* scripts, smoke_three_terrain_validation_layers.mjs, smoke_terrain_validation_debrief_summary.mjs, audit_terrain_validation_browser_headless_parity.mjs, audit_terrain_validation_authority_boundaries.mjs, and audit_terrain_polish_performance_boundaries.mjs. These checks assert the portable core contract, public-safe metadata, browser/headless parity for matching inputs, and the renderer authority boundary. They do not replace headed human QA.

THREE-R1.2C.1 adds runtime terrain diagnostics checks: smoke_terrain_simulation_diagnostics.mjs, smoke_terrain_simulation_events.mjs, smoke_terrain_finish_instantly_events.mjs, smoke_terrain_replay_alignment.mjs, smoke_terrain_result_roundtrip.mjs, smoke_terrain_debrief_comparison.mjs, audit_terrain_runtime_event_boundaries.mjs, and audit_terrain_validation_camera_invariants.mjs. These checks assert that launch validation is frozen, actual diagnostics come from canonical simulation state, visual interpolation cannot create terrain events, terrain events do not change official scoring, public replay excludes hidden truth, and camera interaction cannot rebuild canonical validation.

## THREE-R1.2C.2 Terrain-Validation Performance Recovery

Planning terrain validation is now cached by canonical validation inputs and is not invalidated by camera gestures or display-only controls. Runtime terrain diagnostics update incrementally from accepted simulation steps. Result/replay/headless artifacts are built on demand, and Three validation overlays reuse stable objects from canonical digests. See `docs/terrain_validation_performance_recovery.md` and `docs/terrain_validation_e2e_coverage_audit.md`.

Focused browser coverage now includes six terrain-validation workflows and exact Playwright group assignment. Human manual QA by the project owner remains pending.

## THREE-R2A.1 Replay Review Acceptance Checks

Replay review is deterministic playback over canonical public events and checkpoints. It does not rerun mission physics, recompute official scoring, include hidden truth, or give Three.js replay-semantic authority. Reverse navigation restores a checkpoint and replays forward; camera and display state do not affect replay digests.

Focused checks:

```bash
node tools/js/smoke_replay_scrub_determinism.mjs
node tools/js/smoke_replay_multi_agent_selection.mjs
node tools/js/smoke_replay_incremental_geometry.mjs
node tools/js/smoke_replay_event_deduplication.mjs
node tools/js/audit_replay_camera_invariants.mjs
node tools/js/audit_replay_owner_review_artifacts.mjs
```

Browser E2E coverage is inventoried in `docs/three_r2a_e2e_coverage_audit.md`. Grouped-suite policy is documented in `docs/three_r2a_full_suite_reliability.md`. Human manual QA remains separate from headed automated QA and uses `docs/three_r2a_visual_acceptance.md` plus `test-results/three-r2a-owner-review/`.
## THREE-R2B Tests

Mission editor parity checks:

- `node tools/js/smoke_mission_editor_document.mjs`
- `node tools/js/smoke_mission_editor_commands.mjs`
- `node tools/js/smoke_mission_editor_session.mjs`
- `node tools/js/smoke_mission_editor_validation.mjs`
- `node tools/js/smoke_editor_world_render_view_model.mjs`
- `node tools/js/smoke_three_mission_editor_controller.mjs`
- `node tools/js/smoke_mission_editor_export_roundtrip.mjs`
- `node tools/js/smoke_mission_editor_preview_snapshot.mjs`
- `node tools/js/smoke_mission_editor_resource_lifecycle.mjs`
- `node tools/js/audit_mission_editor_authority_boundaries.mjs`
- `node tools/js/audit_mission_editor_browser_headless_parity.mjs`
- `node tools/js/audit_no_legacy_phaser_editor_production_imports.mjs`
- `node tools/js/audit_production_phaser_scene_retirement.mjs`
- `node tools/js/audit_mission_editor_owner_review_artifacts.mjs` after headed owner review

Focused browser coverage lives in `tests/e2e/three_r2b_mission_editor.spec.js`. Headed owner review lives in `tests/e2e/three_r2b_headed_acceptance.spec.js`.

## THREE-R3A Validation

R3A adds focused smokes and audits:

- `node tools/js/smoke_production_route_contract.mjs`
- `node tools/js/smoke_production_lifecycle.mjs`
- `node tools/js/smoke_production_session_store.mjs`
- `node tools/js/smoke_production_view_host.mjs`
- `node tools/js/smoke_runtime_selector.mjs`
- `node tools/js/smoke_lifecycle_shadow_parity.mjs`
- `node tools/js/audit_next_shell_no_phaser_production_imports.mjs`
- `node tools/js/audit_production_ui_content_parity.mjs`
- `node tools/js/audit_production_shell_authority_boundaries.mjs`
- `node tools/js/audit_static_release_paths.mjs`
- `node tools/js/audit_accessibility_structure.mjs`

Focused browser coverage lives in `tests/e2e/three_r3a_production_shell.spec.js`. Current-shell baseline artifacts and next-shell owner-review artifacts are generated by the R3A baseline and headed acceptance specs.

## WORLD-R1.1 Smoke And Audit Commands

Run the regional activation checks with:

```bash
node tools/js/smoke_planning_guide_preview_lifecycle.mjs
node tools/js/smoke_signed_terrain_surface_authority.mjs
node tools/js/smoke_regional_profile_activation.mjs
node tools/js/smoke_regional_continuous_execution.mjs
node tools/js/smoke_regional_drop_zone_generation.mjs
node tools/js/smoke_regional_field_mask_alignment.mjs
node tools/js/audit_no_legacy_land_tiles_modern_path.mjs
node tools/js/audit_terrain_authority_consistency.mjs
node tools/js/audit_regional_render_object_counts.mjs
```

Human manual QA remains separate from headed automated QA.

## FLOW-R2A Validation

Focused FLOW-R2A checks:

```text
node tools/js/smoke_ocean_current_field_4d.mjs
node tools/js/smoke_ocean_current_sampler_4d.mjs
node tools/js/smoke_current_depth_interpolation.mjs
node tools/js/smoke_current_time_interpolation.mjs
node tools/js/smoke_current_wet_mask.mjs
node tools/js/smoke_water_column_current_explorer.mjs
node tools/js/smoke_instanced_current_glyph_contract.mjs
node tools/js/smoke_glider_current_depth_parity.mjs
node tools/js/smoke_segment_current_inspection.mjs
node tools/js/audit_no_per_vector_three_objects.mjs
node tools/js/audit_current_renderer_authority.mjs
node tools/js/audit_current_browser_headless_parity.mjs
node tools/js/audit_current_resource_lifecycle.mjs
node tools/js/audit_future_webgpu_boundary.mjs
```

Focused E2E spec: `tests/e2e/flow_r2a_current_cubes.spec.js`.

## FLOW-R2A.1 Launch Stability Checks

Run these after changing current-field generation, current sampling, simulation launch, water-column render view models, Three current glyphs, or MissionWorkspace execute/re-execute flow:

```powershell
node tools/js/smoke_simulation_launch_profiler.mjs
node tools/js/smoke_current_field_session_cache.mjs
node tools/js/smoke_current_sampler_hot_path.mjs
node tools/js/smoke_current_render_sample_cache.mjs
node tools/js/smoke_current_glyph_buffer_reuse.mjs
node tools/js/smoke_current_presentation_fail_soft.mjs
node tools/js/smoke_current_canonical_launch_failure.mjs
node tools/js/audit_current_launch_hot_paths.mjs
node tools/js/audit_no_full_current_cube_hot_loop_clone.mjs
node tools/js/audit_no_current_digest_in_sample_loop.mjs
node tools/js/audit_current_renderer_single_raf.mjs
node tools/js/audit_current_launch_memory.mjs
node node_modules/@playwright/test/cli.js test tests/e2e/flow_r2a_1_launch_stability.spec.js --reporter=line --workers=1
```

These checks verify launch interactivity, bounded current cube/sampler counts, hot-loop sampling behavior, glyph fail-soft behavior, malformed-current clean aborts, GitHub Pages subpath launch, and re-execution after returning to Planning.

## FLOW-R2A.2 Visible Current Glyph Checks

Run these after changing current presentation defaults, water-column render view models, Three current glyph geometry/materials, camera presets, or safe-display handling:

```powershell
node tools/js/smoke_current_presentation_defaults.mjs
node tools/js/smoke_simulation_current_view_model.mjs
node tools/js/smoke_current_glyph_visibility_contract.mjs
node tools/js/smoke_current_glyph_bounds.mjs
node tools/js/smoke_current_safe_mode_is_explicit.mjs
node tools/js/audit_current_simulation_render_plumbing.mjs
node tools/js/audit_current_material_visibility.mjs
node tools/js/audit_current_depth_ordering.mjs
node tools/js/audit_current_pixel_acceptance_contract.mjs
node node_modules/@playwright/test/cli.js test tests/e2e/flow_r2a_2_visible_currents.spec.js --reporter=line --workers=1
```

These checks verify that current samples reach Planning and Simulation view models, visible instanced glyphs have finite bounds and readable material/scale/order, Safe Display mode is explicit and non-persistent, projected glyph neighborhoods contain changed pixels, and visible/hidden current presentation does not change mission outcome.

## FLOW-R2A.3 Current Validation

Run the focused scripts `tools/js/smoke_manufactured_current_catalog.mjs`, `tools/js/smoke_bathymetry_conditioned_current_builder.mjs`, `tools/js/audit_current_scientific_claim_boundaries.mjs`, and `tests/e2e/flow_r2a_3_scientific_currents.spec.js` for the scientific current pass. Grouped and monolithic E2E gates are still required before recommending FLOW-R2B.

## FLOW-R2A.4 Production Current Visibility Recovery

Run these after changing production current presentation plumbing, runtime shell parity, normal generated Challenge missions, current controls, or Planning-to-Simulation scene handoff:

```powershell
node tools/js/smoke_current_presentation_state_defaults.mjs
node tools/js/smoke_normal_generated_mission_current_activation.mjs
node tools/js/smoke_current_execute_handoff.mjs
node tools/js/smoke_current_runtime_shell_parity.mjs
node tools/js/smoke_current_scene_transition_persistence.mjs
node tools/js/smoke_current_renderer_attachment_lifecycle.mjs
node tools/js/audit_current_production_path_plumbing.mjs
node tools/js/audit_current_runtime_shell_parity.mjs
node tools/js/audit_current_safe_mode_persistence.mjs
node tools/js/audit_current_normal_mission_defaults.mjs
node tools/js/audit_current_visible_control_binding.mjs
node tools/js/audit_current_pixel_evidence_production_path.mjs
node node_modules/@playwright/test/cli.js test tests/e2e/flow_r2a_4_production_current_visibility.spec.js --reporter=line --workers=1
```

These checks verify the normal production Challenge path, default and `?runtimeShell=next` current-presentation parity, explicit-only safe mode, current glyph recovery warnings, GitHub Pages subpath loading, and idle optional gliders. They also guard the render-only coordinate conversion that maps top-down grid cells to the canonical physical-meter current cube axes. They do not add FLOW-R2B tracers/pathlines, WebGPU, new current equations, planner changes, scoring changes, or Phaser removal.

## FLOW-R2A.5 Production Current Dynamics Checks

Run the production 4D current dynamics smoke and audit set after changing current-field generation, current diagnostics, depth/time sampling, current display modes, glyph magnitude scaling, or normal generated Challenge defaults:

```powershell
node tools/js/smoke_production_current_depth_distinctness.mjs
node tools/js/smoke_production_current_time_distinctness.mjs
node tools/js/smoke_production_current_magnitude_distribution.mjs
node tools/js/smoke_production_current_calm_region.mjs
node tools/js/smoke_current_glyph_magnitude_scaling.mjs
node tools/js/smoke_current_spatial_coherence.mjs
node tools/js/smoke_current_streamfunction_components.mjs
node tools/js/smoke_current_timeline_buffer_updates.mjs
node tools/js/smoke_current_stacked_depth_render_samples.mjs
node tools/js/smoke_current_volumetric_render_samples.mjs
node tools/js/smoke_current_glider_depth_time_parity.mjs
node tools/js/audit_production_current_depth_time_authority.mjs
node tools/js/audit_current_magnitude_fidelity.mjs
node tools/js/audit_current_spatial_coherence.mjs
node tools/js/audit_no_cellwise_random_current_directions.mjs
node tools/js/audit_current_bathymetry_consistency.mjs
node tools/js/audit_current_temporal_continuity.mjs
node tools/js/audit_current_volumetric_rendering.mjs
node tools/js/audit_current_browser_headless_dynamics_parity.mjs
node tools/js/audit_current_display_physics_invariance.mjs
node tools/js/audit_current_performance_hot_paths.mjs
node node_modules/@playwright/test/cli.js test tests/e2e/flow_r2a_5_current_dynamics.spec.js --reporter=line --workers=1
```

These checks assert that normal production currents are depth-distinct, time-varying under canonical mission time, physically magnitude-scaled, calm-aware, spatially coherent, bathymetry/mask consistent, browser/headless compatible, display-invariant, and bounded for browser rendering. They do not add tracers, pathlines, stream ribbons, WebGPU, planners, scoring changes, runtime-shell switches, Phaser removal, or real-data claims.
## FLOW-R2A.5.1 Environment Generation And Mission-Time Current Checks

Run these after changing in-browser current/environment generation, mission-time current sampling, temporal boundary behavior, depth-layer current visibility, or calm-flow glyph presentation:

```powershell
node tools/js/smoke_current_temporal_boundary_modes.mjs
node tools/js/smoke_environment_generator_manifest.mjs
node tools/js/smoke_current_layer_filter_and_calm_markers.mjs
node tools/js/audit_current_mission_time_span.mjs
node tools/js/audit_environment_generator_backend_contract.mjs
node tools/js/audit_no_short_bounded_current_axis.mjs
node node_modules/@playwright/test/cli.js test tests/e2e/flow_r2a_5_1_environment_and_time.spec.js --reporter=line --workers=1
```

These checks assert that bounded generated currents span mission duration, periodic fields wrap intentionally, current sampling uses canonical mission time, `cpuBathymetryConditionedSyntheticV2` remains the explicit compatibility backend, `cpuBathymetryConditionedSyntheticV3` is the normal generated backend, generated artifacts publish `ANCHOR_ENVIRONMENT_GENERATOR_DEBUG`, hidden depth-layer filters affect presentation only, and calm wet cells render as neutral markers instead of arbitrary directional arrows. They do not add WebGPU generation, operational ocean import, planner changes, scoring changes, or Phaser removal.

## BATHY-PKG-R1 Package Checks

For bathymetry package extraction, run:

```bash
npm.cmd run audit:packages
npm.cmd run test:packages
node tools/js/capture_bathymetry_package_r1_baseline.mjs
node tools/js/audit_bathymetry_package_static_paths.mjs
npx.cmd playwright test tests/e2e/bathy_pkg_r1.spec.js --reporter=line
```

`npm.cmd run build:pages` copies `packages/bathymetry` and `packages/contracts` into `_site`. `npm.cmd run smoke:pages` verifies package modules load from a Pages-style subpath without 404 or module MIME failures.
## SCI-VALID-R1 Homegrown Environment Science Checks

Run the compact homegrown environment baseline with:

```bash
npm.cmd run test:science
```

`test:science` is also included in `npm.cmd run test:packages`. It runs manufactured bathymetry, bathymetry convergence, bathymetry ensemble, manufactured current, current depth/time, FLOW-PKG-R2 vertical-profile smokes, V2 compatibility, V3 backend-versioning, current physical/vertical invariants, manufactured scalar, scalar conservation/convergence, environment mission-coupling, and benchmark shortcut checks. These tests verify deterministic software behavior, numerical manufactured-case behavior, and synthetic claim boundaries. They do not establish calibrated oceanographic validity.

See `docs/homegrown_environment_scientific_baseline.md` and `docs/homegrown_model_scorecard.md` for the SCI-VALID-R1 scorecard and external-oracle gap assessment.

## FLOW-RUNTIME-R1.1 Planning Current Timeline Gate

Use this focused gate when changing Planning timeline controls or current-vector presentation:

```bash
node tools/js/smoke_visible_planning_timeline_current_binding.mjs
node tools/js/audit_planning_current_time_authority.mjs
node tools/js/audit_no_direct_time_mutation_in_current_e2e.mjs
npx playwright test tests/e2e/flow_runtime_r1_1_manual_planning_timeline.spec.js
```

The Playwright spec intentionally advances time through visible Planning controls only. It must not mutate scene time or debug objects directly.

## FLOW-PKG-R1 Current Package Gates

Run package-specific current checks with:

```powershell
npm.cmd run audit:packages
npm.cmd run test:packages
node tools/js/capture_current_package_r1_baseline.mjs
node ./node_modules/@playwright/test/cli.js test tests/e2e/flow_pkg_r1_current_package.spec.js --reporter=line
```

The package gates assert manifest/artifact normalization, deterministic digests, source metadata, bounded and periodic temporal behavior, 4D interpolation, land/below-bottom/outside-domain masking, diagnostics, compatibility forwarders, generator-adapter parity, package dependency purity, browser/worker-safe imports, and the Planning-hour-to-current-seconds boundary.

## FLOW-PKG-R2 Depth-Structured Current Gates

Run the focused R2 gates with:

```powershell
npm.cmd run test:science
node ./node_modules/@playwright/test/cli.js test flow_pkg_r2_depth_structured_currents.spec.js --reporter=line --workers=1
node tools/js/audit_playwright_group_coverage.mjs
```
These gates verify the V2 compatibility backend, the V3 mixed-regional backend, explicit `barotropicDepthUniform` controls, coherent named vertical profiles, material depth distinctness, render/canonical depth parity, selected-column current profiles, Pages-subpath package imports, and the boundary that Three.js displays but does not generate currents.

## Production Readiness Tests

Browser tests should wait for production readiness before route selectors. Use `waitForAnchorAppReady(page, { routeId: 'main-menu' })` or `waitForAnchorRoute(page, 'main-menu')` from `tests/e2e/helpers/AnchorRuntimeReadyHarness.js`. Route selectors such as `#main-menu-hub` are checked after readiness. Increasing a timeout is not a substitute for locating the failed boot stage; failures should report the boot debug snapshot, page errors, failed requests, and route state.

## DIVE-UX-R1 Contextual Segment Editor Checks

DIVE-UX-R1 makes the right Mission Waypoints panel the contextual editor for incoming route-segment flight profiles. Focused checks:

```bash
node tools/js/smoke_right_waypoint_segment_editor_view_model.mjs
node tools/js/smoke_right_waypoint_incoming_segment_identity.mjs
node tools/js/smoke_segment_profile_draft_transaction.mjs
node tools/js/smoke_segment_profile_apply_command.mjs
node tools/js/smoke_segment_profile_cancel.mjs
node tools/js/smoke_segment_profile_apply_remaining.mjs
node tools/js/smoke_segment_profile_glider_default.mjs
node tools/js/smoke_segment_profile_reorder_identity.mjs
node tools/js/smoke_segment_profile_export_roundtrip.mjs
node tools/js/smoke_segment_profile_launch_parity.mjs
node tools/js/audit_single_segment_profile_editor_authority.mjs
node tools/js/audit_no_direct_plan_mutation_from_right_panel.mjs
node tools/js/audit_segment_profile_identity_stability.mjs
node tools/js/audit_segment_profile_ui_schema_parity.mjs
node tools/js/audit_right_panel_event_binding.mjs
node tools/js/audit_segment_profile_export_ownership.mjs
```

These checks verify W1 maps to Selected Start -> W1, W2 maps to W1 -> W2, draft edits do not mutate canonical plan/export state until Apply, Apply mutates exactly the intended incoming segment, Apply Remaining is selected-glider-only, reorder metadata follows the destination waypoint, export/import preserves committed metadata, and launch snapshots receive committed metadata only.

## REPO-CLEAN-R2 Capability-Owned Test Tiers

Browser tier ownership is declared in `tests/e2e/capability_manifest.mjs`. The manifest maps supported production capabilities to smoke, release, full nonvisual, visual, and Node/package coverage so the normal release suite is no longer selected by historical phase slices.

Current commands:

```bash
npm.cmd run test:fast
npm.cmd run test:e2e:smoke
npm.cmd run test:e2e
npm.cmd run test:e2e:full
npm.cmd run test:e2e:visual
```

`test:e2e` is the release browser regression profile and should stay in the 35-50 workflow range unless a supported capability requires more coverage. `test:e2e:full` is bounded nonvisual compatibility coverage, not a historical archive. `test:e2e:visual` remains headed visual/owner-acceptance coverage. Use `node tools/maintenance/repo_declutter.mjs tests`, `test-timing`, `phaser`, `pages`, and `verify` for the current inventory.

## ENV-PKG-R1 Environment Package Gates

Run these after changing `packages/environment`, generated environment adapters, package forwarders, environment identity metadata, or unified environment sampling:

```bash
npm.cmd run audit:packages
npm.cmd run test:packages
node tools/js/smoke_environment_package_contracts.mjs
node tools/js/smoke_environment_package_forwarders.mjs
node tools/js/smoke_environment_package_adapter.mjs
node tools/js/audit_environment_package_parity.mjs
node ./node_modules/@playwright/test/cli.js test tests/e2e/env_pkg_r1_environment_package.spec.js --reporter=line --workers=1
```

These gates assert package dependency purity, browser/worker-safe imports, deterministic manifests/artifacts, duplicate-field rejection, hidden-truth role checks, component digest aggregation, cross-artifact validation, local-meter frame compatibility warnings, physical-coordinate bathymetry/current/scalar sampling, generated-environment adapter metadata, browser/Node sample parity, and Pages-subpath package loading. They do not retune bathymetry, current, or scalar values; they do not change visibility policy, observation noise, Simulation, scoring, rendering, or mission outcomes.

## Codec Package Gates

Package validation now includes `smoke_codec_package_contracts.mjs`, `audit_codec_schema_alignment.mjs`, and codec dependency/browser/worker-safety audits. The Python standard-library interop smoke is `tools/python/smoke_anchor_codec_interop.py`.
