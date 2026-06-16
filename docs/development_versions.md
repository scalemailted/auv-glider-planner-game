# Development Versions and Project State

## Purpose

This document records major development milestones, architectural decisions, experimental features, and known limitations for contributors. It is not an end-user release changelog.

Update it after substantial refactors so future work starts from the current project state instead of old scaffolding.

## Current Development State

ANCHOR is a static browser-first Phaser 3 game and simulator. The active shell is the Mission Console + Phaser Simulator Viewport + Waypoint Timeline. The browser game is the authoritative validator, simulator, and scorer. External solvers propose JSON plans; ANCHOR validates, simulates, scores, and exports results.

The current app supports tutorials, deterministic and stochastic generated challenges, Mission Briefing, waypoint planning, continuous route validation, simulation playback, Debrief comparison, local leaderboard/best-path records, dataset export, JSON solver contracts, Learning Labs static concept pages, optional Python/Colab templates, and optional Node.js headless solver tools.

## Challenge Mode vs Simulation Lab

ANCHOR has two user-facing experiences built on the same mission engine.

Challenge Mode is the playable planning-puzzle experience. It emphasizes score, stars, medals, route quality, risk warnings, leaderboard comparison, and learning strategy through play.

Simulation Lab is the reproducible experiment sandbox. It emphasizes exact configuration, deterministic/stochastic setup, dynamic current-field metadata, solver packets, replay seeds, external solver workflows, JSON import/export, and auditability.

Both modes use the same terrain, current fields, hazards, glider physics, scoring core, route validation, planner APIs, and replay/export system. `experienceMode` is persisted as metadata in scenario state and exports; it must not fork simulation mechanics.

Challenge Mode also persists `missionMode`. Mission modes are player-facing objective presets such as Survey Sweep, Signal Hunt, Plume Intercept, Danger Run, and Long Glide. They map to shared technical defaults for sample-field behavior, current-field behavior, sampling rules, scoring weights, route-grade weights, and replay/export metadata. Simulation Lab remains the detailed configuration path.

## Version / Milestone Log

### P1 - Planner / Mission Evaluation Route-Execution Contract

- Added pure benchmark episode, route-execution, metadata, result-adapter, and attempt-registry contracts.
- Added Planner Benchmark episode export and a low-risk setup bridge into the existing Simulation Lab planning flow.
- Preserved the boundary: P1 normalizes existing planning, simulation, and debrief data; it does not implement a new planner, redesign scoring, or add MARL/RL.

### P0 - Benchmark Mode Architecture Skeleton

- Added first-class benchmark mode contracts for Planner Benchmark, Adaptive Benchmark, and Full Autonomy Benchmark.
- Added explicit objective authority, route authority, information-access tiers, world-model tiers, fairness labels, run-record skeletons, and mission-objective taxonomy metadata.
- Added a lightweight Benchmark Mode overview scene under Simulation Lab plus `anchor.benchmark.mode-config` export metadata and debug object.
- Preserved the boundary: P0 defines the benchmark architecture skeleton and does not implement route planning, mission scoring, adaptive objective management, RL, or MARL.
### S2 - Flow-Coupled Sampling / Glider Action Value Sandbox

- Added the Flow-Coupled Sampling Demo for glider-specific direct-leg action value `Q_glider(g,x,y,t)`.
- Added pure flow-coupled sampling modules for scalar/vector field math wrappers, seeded scenarios, direct-leg action-value methods, candidate target generation, and validation fixtures.
- Added deterministic scenarios for current-assisted target, current-opposed target, cross-current risk, downstream intercept, hazard gap, stale near vs valuable far, two-glider redundancy preview, and mixed flow mission.
- Added action methods for balanced action value, fastest reachable, energy-aware, current-assisted, risk-avoidant, intercept-future-priority, redundancy-aware, and science-first selection.
- Added export metadata (`flowCoupledSamplingModel`, `gliderActionContext`, `candidateTargets`, `actionValueDiagnostics`), debug object, smoke scripts, and E2E coverage.
- Preserved the boundary: educational flow-coupled target selection, not full route planning, not optimal path planning, not mission scoring, not calibrated glider dynamics, not calibrated ocean forecasting, and not a production vehicle controller.
### S1 - Modern Sampling Priority / Acquisition Sandbox

- Added the Sampling Priority Demo for global vehicle-independent acquisition value `A_global(x,y,t)`.
- Added pure sampling-priority modules for scalar field math, seeded scenarios, acquisition methods, candidate generation, and validation fixtures.
- Added deterministic scenarios for known hotspot, uncertain front, forecast validation, hidden plume follow-up, bloom boundary, stale monitoring, hazard suppression, and mixed mission.
- Added candidate sample points with reason labels, export metadata (`samplingPriorityModel`, `candidateSamplePoints`, `priorityDiagnostics`), debug object, smoke scripts, and E2E coverage.
- Preserved the boundary: educational acquisition model, not route planning, not flow-coupled action value, not production GP/GMRF optimization, not calibrated data assimilation, and not a mission scoring engine.
### U0/U1 - Stochastic Uncertainty Belief-State Sandbox

- Added a pure uncertainty belief-state contract for hidden truth, forecast/expected state, noisy observations, belief mean, expected-state uncertainty, innovation, surprise, forecast error, unknown-event probability, and sampling-priority preview.
- Added deterministic educational scenarios for accurate forecast, shifted front, weakened hotspot, hidden plume, hidden bloom layer, noisy false alarm, and stale monitoring field.
- Added observation, kernel/Bayesian-lite update, forecast-error/hidden-event diagnostics, sampling-priority preview, export metadata, debug object, smoke scripts, and E2E coverage.
- Preserved the boundary: educational belief-update model, not production GP/GMRF/data assimilation, calibrated ocean forecast, mission planner, route optimizer, or sensor-processing pipeline.

### FLOW-ScientificAudit - Synthetic Flow Field Diagnostics

- Added pure flow-field math helpers for vector grids, bilinear sampling, speed stats, divergence, vorticity, strain, current assist/opposition, cross-current magnitude, tracer advection, terrain masking, and finite-vector validation.
- Added scientific metadata and claim boundaries for current presets, including equations, expected diagnostics, validation targets, recommended uses, and explicit `notA` fields.
- Added Flow Fields Demo diagnostics, UI summary, debug object, export metadata, smoke/audit scripts, and E2E checks for diagnostics and export fields.
- Preserved the claim boundary: deterministic synthetic ocean-inspired vector fields for teaching and planning intuition, not HYCOM/ROMS/CFD/Navier-Stokes or calibrated forecasts.

### A3.1 - Deterministic Coupled Process Engine Contract

- Added the deterministic coupled playground engine contract for known process `C(x,y,t)`, known flow `F(x,y,t)`, known constraints, and oracle objective `S*(x,y,t)`.
- Added analytical scalar process engines for Gaussian moving hotspot, source/diffusion/decay, advection/diffusion/decay, growth/diffusion/decay, and front/boundary approximation, plus a CA/grid-process baseline adapter.
- Added oracle objective construction, algorithmic validation fixtures, export metadata, debug metadata, smoke scripts, and Coupled Fields Demo selectors.
- Preserved the Process Lab as the CA/local-rule teaching sandbox and kept stochastic belief/uncertainty out of the deterministic coupled objective.


### Learning Labs Static Concept Pages

- Added foundation Learning Labs for `Scientific Computational Modeling` and `Cellular Automata for Ocean-Relevant Processes`. These pages frame CA as a rigorous first computational modeling language and event/process-layer generator, not as a calibrated ocean simulator or final adaptive-sampling priority model.
- Added lightweight standalone widgets for model loops, local-rule neighborhoods, deterministic-vs-stochastic evolution, fuzzy/continuous CA, event-intensity-vs-priority, plume fronts, bloom growth/decay, and freshness/revisit. The pages prepare the later engine ladder: advection, diffusion, source/sink, decay/growth, flow coupling, stochastic forecast/belief, observations, uncertainty, acquisition logic, and route-aware mission criteria.

- Added a top-level `Learning Labs` main-menu accordion for static concept pages that complement, but do not replace, the Phaser Simulation Lab demos.
- Added `labs/index.html` as the course-style Learning Labs syllabus covering the six-lab path from deterministic processes through mission evaluation.
- Added the first standalone shell, `Deterministic Spatiotemporal Processes`, with local equations, sampling interpretation, foundational CA model placeholders, static visual placeholders, and links back to the full ANCHOR app.
- Added `tools/js/smoke_learning_labs_static.mjs` so local checks catch missing lab files, broken required content, accidental external links, and accidental CDN dependencies.
- Completed the Phase L1 Deterministic Spatiotemporal Processes article with cellular-automata rule explanations, local/global update-function notation, foundational model cards, observable process pattern cards, non-uniform rule allocation, sampling interpretation, and a lightweight elementary-CA widget.
- Added `tools/js/smoke_learning_lab_deterministic_processes.mjs` for the completed article contract.
- Completed the Phase L2 Deterministic Dynamic Flow Fields article with vector-field notation, magnitude and particle-tracing equations, spatial structure cards, topology/boundary explanation, additive layer composition, coupled-lab preview, and standalone vanilla-canvas widgets for vector components, flow presets, particle tracing, time-varying flow, and additive layers.
- Added `tools/js/smoke_learning_lab_flow_fields.mjs` for the flow-fields article contract.
- Completed the Phase L3 Oracle / Deterministic Coupled Sampling Space article with process + flow + constraint + mission composition, oracle objective notation `S*(x,y,t)`, reachability timing, oracle-vs-stochastic boundary, coupled examples, and standalone vanilla-canvas widgets for flow-carried patches, constraint masks, layer composition, and reachability timing.
- Added `tools/js/smoke_learning_lab_coupled_sampling_space.mjs` for the coupled sampling-space article contract.
- Completed the Phase L4 Stochastic / Uncertainty article with hidden truth, forecast/prior state, observations, posterior belief, forecast-error vs hidden-unknown distinction, Bayesian updating, Markov intuition, GP/GMRF intuition, data assimilation, confidence/calibration/surprise, regret, acquisition value, and standalone vanilla widgets for belief updates, forecast diagnosis, Markov transitions, GP-style interpolation, regret, acquisition, and distributions.
- Added `tools/js/smoke_learning_lab_uncertainty.mjs` for the uncertainty article contract.
- Completed the Phase L5 Stochastic Coupled Sampling Space article with oracle-vs-belief objectives, expected-state uncertainty versus unknown-event probability, forecast-error versus hidden-event diagnosis, flow-consistent evidence, acquisition composition, reachability-aware value, surfacing update cycles, regret comparison, mission situations, and standalone vanilla widgets for belief-layer stacks, objective comparison, uncertainty maps, hidden-event evidence, acquisition, reachability, updates, and regret.
- Added `tools/js/smoke_learning_lab_stochastic_coupled_sampling_space.mjs` for the stochastic coupled sampling-space article contract.
- Completed the Phase L6 Planner / Mission Evaluation article with waypoint-plan semantics, reward/cost/risk tradeoffs, reachability timing, flow-aware planning, Greedy Planner baseline intuition, coverage/front/revisit strategies, uncertainty-aware sampling, forecast-validation versus hidden-event follow-up, oracle/belief/truth-assisted planner labels, regret, surfacing replanning, multi-agent planning, simulation/debrief evaluation, solver workflow fairness, mission strategy cards, and standalone vanilla widgets for route and score concepts.
- Added `tools/js/smoke_learning_lab_planner_mission_evaluation.mjs` for the planner mission-evaluation article contract.
- Completed the L-SamplingActionValue bridge article with event intensity, ROI, belief/uncertainty, `A_global(x,y,t)`, candidate sample points, `Q_glider(g,x,y,t)`, flow assist/opposition, energy, timing, hazards, redundancy, and the boundary before route planning.
- Added `tools/js/smoke_learning_lab_sampling_action_value.mjs` for the Sampling Priority to Glider Action Value article contract.

### Sampling Process Lab Refactor

- Renamed the visible lab title to Deterministic Spatiotemporal Process Lab and the menu entry to Process Lab.
- Reframed the guided selector as Foundational CA Models and Ocean-Relevant Process Analogs as separate visible contexts.
- Added process-example metadata for Conway, Forest Fire, SIR, Greenberg-Hastings, Sandpile, Wa-Tor, Traffic CA, Wireworld, and the existing observable-process recipes.
- Renamed visible Random Rule Lab wording to Rule Allocation Sandbox while preserving internal IDs and export compatibility.
- Renamed the user-facing Sample / ROI Field Demo to Spatiotemporal Sampling Process Lab while preserving legacy export aliases.
- Reframed Source / Initial Field as the deterministic or seeded process substrate; belief, expected-state uncertainty, surprise, forecast error, hidden-event diagnosis, and sampling-priority preview remain in the Uncertainty / Forecast Demo.
- Added process modes for Reference Signature, Custom Composer, Process Paint, and Random Rule Lab.
- Added a sampling process rule catalog, minimal Process Paint assignment model, deterministic Random Rule Lab allocator, process status labels, and preferred export layers: `sourceField`, `stateLayer`, `ruleLayer`, `groupLayer`, `valueLayer`, `transitionLayer`, `roiRoleLayer`, and `processMessages`.
- Canonicalized Process Paint rule families under `sampling-process-rule-families-v1`: `inert`, `propagatingFront`, `excitableWave`, `localBirthDeath`, `diffusiveSpread`, `directedTransport`, `cyclicDominance`, `domainFormation`, `thresholdCascade`, `interactingPopulation`, `freshnessRecovery`, `morphogenesis`, `congestionWave`, and `structuredSignal`. Legacy paint IDs remain aliases, while new layers and exports write canonical IDs.
- Added a deterministic CA-style Process Paint stepper that emits per-frame sampling value, transition, ROI-role, process-message, state-count, rule-count, and group-count diagnostics.
- Added discrete process generation timing for Foundational CA Models, Ocean-Relevant Process Analogs, Process Paint, and Rule Allocation Sandbox. Rendering remains independent from process updates; default playback is 1 generation per second with Step Generation and fixed tick-rate controls.
- Added process explainability metric layers and legends for state, neighbor count, rule support, transition class, ignition pressure, infection pressure, threshold proximity, congestion pressure, structured signal support, source support, and sampling interpretation. Exports now preserve process timing, display metric metadata, and compact metric layers.
- Added fixture-backed Behavior QA for guided Foundational CA Models and Ocean-Relevant Process Analogs. `SamplingProcessExampleFixtures.js` defines explicit initial layers, and `SamplingProcessExampleBehaviorAssertions.js` runs short deterministic checks through the existing rule engine. The right panel, debug object, and demo exports now include fixture id/label and behavior validation metadata.
- Added model-aware initial-condition editing for guided Process Lab examples. SamplingProcessInitialConditionEditor.js defines curated, interactive-canvas, and deterministic-random modes; fixed-rule brush palettes; Conway block/blinker/glider fixtures; ocean analog source/front brushes; generation-reset behavior; and exported initialCondition metadata.
- Preserved legacy aliases including `eventLikelihoodField`, `likelihoodField`, `likelihoodNodes`, `behaviorPresetId`, and `sampleValueField`.

### v0.1 - Static Browser Shell And Phaser Map

- Established vanilla JavaScript static hosting with no backend requirement.
- Adopted Phaser 3 for scene lifecycle, map rendering, pointer input, overlays, animation, and simulator viewport polish.
- Kept simulation, planning, generation, schemas, IO, and evaluation in framework-independent `src/core` modules.

### v0.2 - Mission Planning Workspace

- Added Mission Console, center Phaser map, right Waypoint Timeline, compact selected-glider HUD, and bottom time controls.
- Added Mission Briefing before tactical map reveal.
- Added selected-glider waypoint placement, deletion, reordering, same-cell waypoint stacking, and planning markers.
- Added generated challenge setup for map size, agents, duration, surfacing, fuel, currents, hazards, terrain, ROI, forecast controls, and priority targets.

### v0.3 - JSON Import / Export Contracts

- Standardized `anchor.challenge`, `anchor.solverPacket`, `anchor.plan`, `anchor.plan-segment`, `anchor.surfaceObservation`, `anchor.result`, `anchor.leaderboard`, and `anchor.oracleDataset` products.
- Kept solver exchange file-based and static-host compatible.
- Restored Mission Editor as a first-class Simulation Lab tool and added custom `anchor.challenge` export/import paths with optional attached best-path history.
- Refactored Main Menu navigation into two primary accordions with visual subsections: Challenge Mode groups Play, Learn, and Compete; Simulation Lab groups Experiments, Demos, Editor & Import Tools, and Benchmarks.
- Added explicit fairness metadata for forecast, truth, and oracle-assisted plans.
- Preserved `surfaceUpdateBundle` as metadata while using explicit plan/segment imports for live recovery.

### v0.4 - Replay Seed Contract And Best Path Records

- Added UUID/instance identity as replay seed anchor metadata for generated challenges and saved attempts.
- Added `anchor-generator-v1` as the current generator version contract.
- Added derived seed metadata for namespaces such as terrain, currents, ROI, hazards, depth, targets, forecast, truth, and mission.
- Added local leaderboard and best-path records with saved plan/result blobs when available.
- Hardened leaderboard metadata so Challenge Mode and Simulation Lab can share storage while separating high-score and benchmark scopes by `experienceMode` / `leaderboardScope`.
- Added explicit import behavior for custom challenge packages: play in Challenge Mode, open in Simulation Lab, edit in Mission Editor, and merge attached history only on user action.
- Added replay diagnostics that distinguish exact replay via snapshot, exact replay via UUID contract, approximate replay, and unavailable replay.

### v0.5 - External Solver Templates

- Added dependency-light Python example solver and Colab notebook template.
- Added Node.js headless solver and headless validation tools that import portable core modules without Phaser or DOM dependencies.
- Documented the contract: Colab/Node/Python propose, ANCHOR validates, ANCHOR simulates, ANCHOR scores.
- Kept hidden truth out of fair solver packets unless oracle mode is explicit.

### v0.6 - Greedy Planner Refactor

- Reframed Greedy Planner as a browser-native selected-glider baseline, not a fleet-wide optimizer.
- Preserved non-selected glider routes while treating their planned coverage as depleted value/constraints.
- Added worker-compatible async execution and planner busy-state handling.
- Added validation-before-append and final route validation before accepting generated routes.
- Added route diagnostics and stop reasons for blocked or unexecutable planner output.

### v0.7 - Continuous Route Semantics And Diagnostics

- Clarified that the grid is an environmental sampling layer, not a Manhattan movement graph.
- Route preview, planned route rendering, Greedy Planner, Travel Cost, validation, and simulation diagnostics use continuous waypoint-to-waypoint segment checks against grid-derived terrain/risk fields.
- Added shared `route_validation_diagnostic` output for Planning, Simulation, plan import, headless validation, and external solver feedback.
- Separated visible route geometry from diagnostic traversal cells so route overlays remain waypoint-to-waypoint while scoring and diagnostics still inspect sampled cells.

### v0.8 - Dynamic Topology-Aware Current System

- Expanded current fields from simple visual flow arrows into a topology-aware dynamic environment model.
- Added synthetic coastal-aware composite currents with seeded regional behavior for open water, shoreline, channels, bays/pockets, and island-adjacent wakes.
- Added continuous dynamic evolution, magnitude pulses, moving structures, Low/Medium/High dynamic complexity, and terrain-aware boundary effects.
- Current samples now carry planning-relevant metadata such as dominant behavior, topology region, shore distance, current toward land, shoreline risk, topology adjustment, hazard exposure, and confidence.
- Travel Cost, Risk/Safety, route diagnostics, simulation drift, hover tooltips, solver exports, and Greedy Planner all use the shared current sampler path.
- Greedy Planner and route validation now treat terminal over-duration waypoints as valid carry-through instructions so missions remain active until the time limit.

### v0.9 - Challenge Mode, Mission Modes, Dynamic Sampling, And Waypoint Semantics

- Expanded ANCHOR into a two-experience system: Challenge Mode for playable planning puzzles and Simulation Lab for reproducible experiments.
- Added Mission Mode presets that map research concepts such as coverage planning, informative path planning, event interception, and energy-aware routing into player-facing objectives.
- Split Challenge Mode setup into a left Mission Mode Navigator, a selected-mission briefing/detail screen for strategy/setup/environment summary, and a compact right Mission Snapshot instead of pre-mission waypoint UI.
- Added `sampleFieldConfig` metadata and generated sample-field behaviors for static, hotspot, burst, moving, current-advected, random, neighbor-coupled, plume, channel, gradient, and texture-like value fields where configured.
- Refactored the pure Sample / ROI Field Demo taxonomy into observable pattern composition: Event Likelihood Field, Spatial Pattern / Geometry, Value Distribution, Temporal Pattern, Spatial Evolution, State Model / Memory, Sampling Effects, and Display controls. Event Likelihood Field is now the primitive `L(x,y,t)` substrate for event origins, sparse candidate sites, discrete jump destinations, random-walk bias, and neighbor-propagation likelihood. It can be static or dynamic, with separate likelihood temporal pattern and likelihood spatial evolution controls. Spatial Pattern / Geometry uses the final pure sample-value geometry set: Constant Field, Gradient / Trend, Clustered Field, Patchy / Correlated Field, Sparse Targets, Linear Band, Front / Boundary, Boundary Band, Monitoring Stations, and Seeded Texture. Constant Field is only a no-geometry spatial pattern; Uniform Likelihood is the neutral event substrate. Value Distribution is separate from spatial geometry, so a flat field is no longer conflated with uniformly random values. `Clustered Field` plus Cluster Count and Cluster Size replaces separate single/bimodal/multi-cluster modes; Forecast/truth/uncertainty and current-coupled sample behavior are intentionally outside this pure demo. The Mission Console provides compact controls and Explain buttons, while the right panel switches between Cell Inspector and Behavior Help. See [sample_fields_demo.md](sample_fields_demo.md).
- Stabilized Sample / ROI Field dynamics as a persistent sample-opportunity process. Ordinary bursty, periodic, random-walk, discrete-jump, and neighbor-propagation modes now balance decay with seeded regeneration from `L(x,y,t)` so activity can quiet, move, or spread without globally dying out. The demo exports and UI include activity diagnostics for min/mean/max, active fraction, activity mass, injected activity, decay loss, depletion loss, boundary loss, and regeneration amount. Freshness and depletion remain labeled as demo-only synthetic visit effects unless later tied to actual mission visits.
- Added a Sample / ROI Behavior Preset registry for curated pure sample-value compositions: Recurring Hotspots, Migrating Patch, Expanding Front, Patchy Rainfall, Drifting Storm Cells, Freshness / Revisit Value, Wandering Hotspot, Neighbor Spread, Ripple Activation, Oscillating Ecological Field, Forest Fire Front (inspired), and Life-Like Cellular Emergence (inspired). Presets fill in primitive controls but do not replace them; changing a primitive marks the selected preset as modified, and demo exports include `behaviorPreset` metadata. Inspired presets are simplified educational examples, not validated physical process models.
- Added a targeted component-composer tuning pass for spatial variety, persistence, value range usage, and visible dynamics. Multi-modal, patchy, and sparse-candidate likelihoods now use separated seeded anchors to avoid collapsing into one quadrant. Temporal Pattern now includes Rapid Pulse, Pulse Then Silence, Long-Tail Decay, Gaussian Time Envelope, and Wavy / Multi-Frequency in addition to sustained, periodic, bursty, intermittent, random-pulse, and long-cycle modes; repeating modes regenerate from `L(x,y,t)` while Pulse Then Silence remains explicitly finite. Continuous drift and random walk use more visible bounded motion. Sample-value display layers still use a mild post-composition contrast pass when a composed field would otherwise be too flat, too weak, or over-active; event-likelihood and raw-base displays remain direct component views. Activity diagnostics and preset audit output now report dynamic range, high-value fraction, active bounding-box coverage, connected components, percentile stats, contrast usage, and diagnostic warnings. Drifting Storm Cells now uses rapid pulsing with continuous drift so compact cells remain visible between pulses instead of collapsing into near-empty frames.
- Fixed the Recurring Hotspots preset so it uses persistent separated likelihood basins plus out-of-phase recurring sample flares instead of the generic clustered Gaussian hotspot path. The preset now bypasses generic display contrast and generic persistence injection so low background does not inflate activity metrics. ROI diagnostics expose active recurring basin count, high-value component count, mode-center spread, and likelihood/sample correlation; `globalThis.ANCHOR_DEBUG_ROI_COMPOSER = true` logs the detailed Recurring Hotspots mode diagnostics.
- Promoted Event Likelihood to a first-class dynamic scalar field model in the Sample / ROI Demo. `L(x,y,t)` now exports with field metadata, node state/cooldown data, entropy, mode count, mode spread, quadrant occupancy, and per-frame diagnostics, while the raw `fields.eventLikelihood` array remains available for notebooks. The default display remains Sample Value + Likelihood Overlay so users see `S(x,y,t)` and `L(x,y,t)` together. This field is explicitly separate from physical current vectors `F(x,y,t)` and uncertainty fields `U(x,y,t)`.
- Added feature-evolution analog diagnostics for the Sample / ROI Demo. `V_L(x,y,t)` and `V_S(x,y,t)` classify how likelihood/sample structures drift, pulse, walk, ripple, or propagate without treating those patterns as physical ocean currents. Added Wandering Hotspot and Ripple Activation presets as validation targets for bounded random-walk and wave/ripple activation behavior.
- Refactored ROI likelihood visualization into a cell-centered mesh overlay. `likelihoodField.values` is the render/export source for every cell's `L(x,y,t)` state, while likelihood nodes/modes remain source/basin metadata. Overlay mode draws the sample-value heatmap underneath likelihood mesh dots/rings; Event Likelihood mode shows the same mesh over the likelihood heatmap. Mesh diagnostics track active/high/near-trigger likelihood cell fractions, high-likelihood components, and local neighbor correlation.
- Added a graph-message dynamic field layer under the Sample / ROI Demo. Cells are graph nodes, neighbor edges pass abstract influence messages, and update rules combine node state, incoming messages, temporal forcing, community penalties, and sampling effects to generate `L(x,y,t)` and `S(x,y,t)`. Graph-backed presets now cover cooldown/recovery hotspots, neighbor spread, front propagation, ripple/wave activation, directed drift, freshness/revisit recovery, and life-like cellular-emergence inspired local rules. Exports include `graphField` metadata plus per-frame graph state/message layers.
- Added graph-specific Sample / ROI display layers for Graph Communities, Node States, Graph Messages, Community + Messages, and Diagnostics Overlay. These views show community/basin membership, node state glyphs, filtered top influence edges, cluster/centroid markers, graph-state legend information, selected-cell message diagnostics, community-id grids, and filtered top-message summaries in demo exports.
- Added Phase-1 ROI process contracts and scenario scaffolding. Preset metadata now exposes process class, domain analogies, simplified-model claim, interaction scale, component recipe, ROI interpretation, validation signature, and educational prompt. Graph update results emit causal `edgeMessages`, `nodeTransitions`, process metadata, and transition fields where practical; renderer/export prefer emitted messages and mark inferred messages as diagnostic fallback. Added `RoiScenarioGenerator.js` and `RoiScenarioValidation.js` as static-compatible APIs for seeded family scenarios.
- Added Phase-2 Sample / ROI component-composer clarity. The left console now organizes the demo around Behavior Recipe / Preset, Event Likelihood, Spatial Pattern, Value Distribution, Temporal Pattern, Spatial Evolution, Interaction Scale, State Model, Sampling Effect, Display, Seed, and Export. Behavior Help explains what each component changes, what it should not change, what to look for, useful display layers, and common confusion. Recipe View now shows a component recipe table, domain analogies, simplified claim, ROI interpretation, suggested display layers, and validation signature. Modified presets show component isolation hints, and exports include the active component recipe plus compatibility warnings.
- Added Phase-3 Sample / ROI scenario generation and export. The left console now has Scenario Generation controls for source mode, seed, difficulty, duration, frame count, and validation policy. `RoiScenarioGenerator.js` can package either the current component recipe or selected behavior family into `anchor.syntheticRoiScenario` with `roi-scenario-v1`, process contract, sampled parameters, `S(x,y,t)` / `L(x,y,t)` frames, graph/message layers, labels, diagnostics, validation summaries, and export gating. `RoiScenarioValidation.js` now reports PASS/WARN/FAIL with generic and family-specific observable signature checks.
- Added Phase-4 Sample / ROI educational readability. Recipe View now includes Behavior Signature and ROI Meaning cards for major behavior families, plus explicit process implementation labels such as analytic time-indexed analog, state-evolving graph update, local cellular transition rule, history-aware recovery rule, and hybrid graph-assisted analog. The left console includes Component Isolation Examples for Temporal Patterns, Spatial Evolution, and Interaction Scale using stable seeded recipes. Scenario validation summaries now include observable-pattern and ROI-meaning notes while keeping single-scenario export secondary to teaching.
- Added Phase-5 Sample / ROI primitive expansion. Value Distribution now includes Skewed Low, Skewed High, Bimodal Values, Heavy-Tailed, and Rare Extreme Events in addition to Constant, Uniform, and Gaussian / Normal. Spatial Evolution now includes Expansion, Contraction, Divergence, Convergence, Morph / Mutation, Shear / Stretch, Rotational Swirl, and Branching Growth in addition to Stationary, Continuous Drift, Discrete Jump, Random Walk, and Neighbor Propagation. These modes are deterministic from seed and demo time, affect sampled heatmap behavior rather than only labels, and remain synthetic ROI/sample-field primitives rather than physical current flow. Diagnostics now report value-distribution shape and interaction-scale support as active, partial, or metadata only; compatibility warnings flag subtle or misleading pairings.
- Added Phase-6 Reference Observable Process Signatures for the Sample / ROI Field Demo. Reference signatures are editable component recipes inspired by known CA/grid-process families, not exact reproductions. Implemented front propagation, wave / excitable media, birth-death emergence, stationary temporal bursts, diffusion / spread, drift / transport, cyclic dominance, cluster formation, avalanche / burst cascades, predator-prey migration, and freshness / recovery. The left console can apply a signature, Recipe/Behavior Help shows inspired-by models and ROI meaning, existing presets map to reference signatures, scenario/demo exports preserve reference metadata, validation is reference-aware, and fast smoke/audit scripts cover all signatures.
- Added Phase-6.1 ROI Demo UI refactor. The Sample / ROI Field Demo is now reference-signature-primary in normal UI: `Pattern Source / Reference Signature` replaces the preset-first selector, Reference Observable Process Signature is the default source, `Custom Component Recipe` exposes direct primitive editing, and legacy behavior presets are hidden unless the debug/compatibility path is enabled. The right panel defaults to `Recipe / Signature View` instead of an empty Cell Inspector, Value Distribution is a first-class accordion section, the left console includes an Active Source summary and UI version stamp, `globalThis.ANCHOR_ROI_UI_DEBUG` exposes the active UI contract, and demo/scenario exports preserve `patternSource`, reference metadata, component recipe, and legacy preset metadata where applicable.
- Added Phase-6.2 Reference Signature Taxonomy. The ROI reference selector now uses 14 broad observable-process labels, keeps old IDs as aliases for compatibility, and adds a 90-entry reference model catalog covering CA/grid-process families such as forest-fire/Eden/percolation growth, excitable media, Life-like birth/death rules, epidemic grids, lattice transport analogs, cyclic dominance, Ising/voter/Schelling domain formation, sandpile cascades, predator-prey migration, freshness/recovery, reaction-diffusion morphology, traffic density waves, and structured signal propagation. Signatures now carry CA mechanism metadata, QA expectations, phenotype metrics, genotype-like component setup notes, taxonomy justification, and richer export metadata. `tools/js/audit_roi_reference_coverage.mjs` audits catalog coverage, CA-family coverage, missing fields, duplicate model IDs, signatures without models, and models without valid signatures.
- Refactored the graph-message layer into a hierarchy: cluster/community likelihood `C_k(t)` defines regional tendency, cell likelihood/readiness `L_i(t)` defines local activation potential, cell activation `A_i(t)` records whether the node is firing/cooling/recovering/consumed, and sample value `S_i(t)` is the realized reward. Exports now include top-level cluster metadata plus per-frame activation and cluster-likelihood layers so external notebooks can distinguish clusters, cells, edges, and realized value.
- Added a dedicated Uncertainty / Forecast Demo for hidden truth, forecast/expected state, observations, belief, expected-state uncertainty, surprise, forecast error, unknown-event probability, sampling-priority preview, and educational belief updates. See [uncertainty_forecast_demo.md](uncertainty_forecast_demo.md).
- Added segment contribution grades and route-quality summaries so manual, Greedy Planner, and imported-solver routes can be explained with the same vocabulary.
- Added explicit waypoint semantics for `navigation`, `surface`, `samplingTarget`, and `terminalCarryThrough` waypoints, while preserving old plans by defaulting missing kinds to `navigation`.
- Added semantic timeline events for navigation intent, surface/update windows, sampling targets, and terminal carry-through outcomes while preserving existing `waypointReached` and `missedWaypoint` events.
- Added navigation uncertainty config, seeded cone metadata, and cone-aware route grading as a first pass. This is not yet a full true-position-vs-believed-position underwater navigation simulator.

## Current Stable Concepts

- Browser game remains authoritative for validation, simulation, scoring, and player-facing results.
- JSON contracts are the external solver API.
- Solvers propose; ANCHOR validates; ANCHOR simulates; ANCHOR scores.
- Core modules should remain independent from Phaser scenes and DOM UI.
- UUID/instance identity is used as replay seed anchor metadata.
- `generationVersion: "anchor-generator-v1"` is the current deterministic generation version label.
- `experienceMode` frames the UI as Challenge Mode or Simulation Lab while sharing the same mission engine.
- `missionMode` is a Challenge Mode objective preset, not a separate physics/scoring engine.
- `sampleFieldConfig` describes generated sample-value behavior when present.
- Waypoint `kind` values distinguish navigation commands, surface/update points, sampling targets, and terminal carry-through commands.
- Route-quality and segment contribution grades are explanatory diagnostics for player feedback, debrief, result exports, and solver comparison.
- Greedy Planner plans only for the selected glider.
- Route preflight validation is required before Execute and before accepting planner output.
- Forecast/truth/oracle fairness metadata must be preserved in plans, results, and leaderboard records.
- Leaderboard attempts should preserve route source, solver labels, fairness labels, and scenario fingerprints for both Challenge Mode high-score comparison and Simulation Lab benchmark comparison.

## Experimental Concepts

- Greedy Planner robustness in difficult stochastic/generated missions.
- Regeneration-only exact replay when a saved snapshot is missing.
- Shared-folder solver exchange and local bridge automation.
- Advanced stochastic surface-update automation.
- External current-field ingestion.
- Stronger baseline solvers beyond greedy.
- Full true-position-vs-believed-position dead-reckoning simulation beyond current cone-aware grading.

## Known Limitations

- Greedy Planner is a fast baseline, not a global optimizer.
- Current fields are synthetic ocean-inspired gameplay fields, not validated CFD, HYCOM, or operational forecasts.
- Navigation uncertainty is currently configuration, semantic surfacing metadata, seeded cone diagnostics, and route-grade penalty input; it is not a complete underwater navigation state estimator.
- Route-block diagnostics are improving and may still need better explanations for rare edge cases.
- The Colab/Python solver is a template, not a full optimizer or simulator.
- The Node headless solver is a portable baseline/validation path, not the official scorer.
- Shared-folder and local-bridge solver automation are future work.
- Browser-only hidden truth is not cryptographically secure; stochastic secrecy is educational and cheat-resistant only.
- Exact replay prefers saved snapshots. UUID + config regeneration requires compatible generator version and complete replay seed metadata.

## Developer Notes

- Update this document after major refactors.
- Do not claim future features are implemented.
- Keep links aligned with actual files:
  - [game_design.md](game_design.md)
  - [solver_workflow.md](solver_workflow.md)
  - [export_formats.md](export_formats.md)
  - [greedy_planner.md](greedy_planner.md)
  - [temporal_greedy.md](temporal_greedy.md)
  - [testing.md](testing.md)
  - [../tools/js/README.md](../tools/js/README.md)
  - [../tools/python/README.md](../tools/python/README.md)

## Process Example Contexts

Foundational CA Models are known local-rule models used to teach cells, states, neighborhoods, update rules, and emergent behavior. Ocean-Relevant Process Analogs are simplified CA/grid-process-inspired event or process layers that resemble environmental behaviors important for AUV sampling, but they are not physical flow models or calibrated ocean simulations.

Observable Process Patterns are bridge metadata rather than the primary selector. For example, Forest Fire maps to Propagating Fronts, which bridges to River Plume Front and Shoreline Runoff Pulse analogs. Greenberg-Hastings maps to Excitable Waves. Sandpile maps to Threshold Cascades, which bridges to turbidity or episodic discharge analogs.

Science boundary: the deterministic process demo teaches local process evolution S(x,y,t). Flow Fields teaches current vectors F(x,y,t). Coupled Dynamic Sampling Space combines process plus flow plus constraints. Uncertainty / Forecast adds hidden truth, forecast, belief, observations, and uncertainty. Ocean-relevant analogs in this demo are not calibrated ocean models.
## Active Example State

The visible Process Lab mode plus the context-specific model or analog selector is the primary identity for the Deterministic Spatiotemporal Process Lab. The mode selector, context-specific model or analog selector, center subtitle, right-panel Current Lab State, debug object, scenario metadata, and exports should agree on the same selected example.

`referenceSignature*` fields remain for compatibility and represent the mapped observable pattern, not the primary selected example. New consumers should prefer the `processExample` block in demo/scenario exports. `processExample.mappedReferenceSignatureId` should match the legacy flat `referenceSignatureId`.

Ocean-Relevant Process Analogs are educational event/process-layer analogs. They are not calibrated flow models, ocean forecasts, uncertainty models, or mission planners; flow coupling and uncertainty realism belong in the coupled and uncertainty demos.

## P2 Planner Benchmark Execution Integration

Planner Benchmark now carries episode metadata through the existing setup/planning/simulation/debrief path and exposes Debrief exports for benchmark run records, route execution records, and attempt sets. Adaptive Benchmark and Full Autonomy Benchmark remain contract-only. No planner algorithm, scoring redesign, MARL/RL, or adaptive objective execution was added.

## P3 - Planner Benchmark Attempt Comparison UI

P3 adds Debrief attempt comparison, route review, fairness/source labels, and `anchor.benchmark.comparison` export support. It preserves P0/P1/P2 fields and keeps Adaptive Benchmark and Full Autonomy Benchmark contract-only.
