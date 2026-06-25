# Roadmap

This roadmap tracks likely next development directions for **ANCHOR: Glider Command**. It is not a claim that future items are implemented.

For the current development-state log, see [docs/development_versions.md](docs/development_versions.md). Individual feature docs and smoke tests are the source of truth for what is implemented.

For the canonical game-design spec, see [docs/game_design_scientific_auv_planning.md](docs/game_design_scientific_auv_planning.md). It captures the mission loop, objective archetypes, visibility modes, scoring model, 2.5D model, and future production gameplay targets.


## ARCH-R1 Scientific Package Architecture Checkpoint

ARCH-R1 establishes local scientific package boundaries without changing app behavior. The active web application remains the product shell, while `packages/` now defines dependency-safe skeletons for contracts, bathymetry, currents, scalar processes, environment composition, mission simulation, validation, and codecs.

Package extraction phases should remain narrow extractions, not rewrites. Current order:

- `BATHY-PKG-R1`: extract bathymetry contracts and pure field helpers behind forwarding modules, with digest and fixture parity.
- `CURRENT-PKG-R1`: separate current-field generation and sampling from debug/runtime hooks before package movement.
- `PROCESS-PKG-R1`: extract scalar field artifacts, source metadata, continuous samplers, water-column scalar helpers, and diagnostics while keeping educational demo/lab process engines outside the package.
- `ENV-PKG-R1`: implemented composition of bathymetry, currents, and scalar artifacts through package manifests, field registries, validation, provenance, identity digests, and physical-coordinate sampling while preserving existing browser and headless loaders.
- `SIM-PKG-R2`: makes `packages/mission-simulator` the authoritative mission-state transition package for browser, headless, and benchmark execution while preserving app-owned route planning, scheduling, UI, rendering, official scoring, and replay playback.
- `SCORE-PKG-R1`: extracts official mission scoring, `ScoreProfile` definitions, `ScoreInput`/`ScoreResult` contracts, deterministic score digests, public-safe summaries, and benchmark/result score identity into `packages/scoring` while preserving existing scoring formulas and raw simulator metrics.
- `SCI-VALID-R2A`: establishes `packages/validation`, checked-in validation reports/manifests, codec schemas, and the public Methods & Validation route. It presents evidence and limitations without changing scientific equations or claiming operational validation.
- `COLAB-BENCH-R1`: adds a reproducible external classical-planner benchmark notebook, compact solver-packet fixtures, benchmark records, and Node authoritative evaluation while preserving the boundary: Colab proposes; ANCHOR validates, simulates, and scores.

Package extraction gates: old `src/core/...` imports must continue through forwarding modules, artifact values and scoring must remain stable, and package audits must pass with no renderer/UI/browser dependencies.
## 1. Product Vision

ANCHOR is evolving into a scientifically grounded AUV/glider adaptive-sampling serious game and benchmark tool. It combines a browser-based game/referee, learning labs, simulation sandboxes, benchmark modes, a portable JavaScript scientific core, and a reproducible Node/OceanBox-JS headless workflow.

The core scientific lesson is: the best path is not always the shortest path, and the best sample is not always the highest-value-looking cell. Good missions balance uncertainty, forecast error, hidden discovery, current and energy cost, redundancy, hazards, and mission objective.

Current foundation:

- Browser game and teaching tool for planning, simulation, replay, and debrief.
- Learning Labs and Simulation Sandboxes for model concepts and inspection.
- Planner and Adaptive benchmark surfaces for route and mission-management comparisons.
- Node/OceanBox-JS artifacts for deterministic headless simulation, solver-packet roundtrip, and classroom analysis.
- Colab/Python wrapper and artifact-analysis workflows.
- COLAB-BENCH-R1 classical-planner benchmark notebook for transparent external planning, visualization, timing, exact bounded small-instance checks, and official ANCHOR evaluation.

Browser ANCHOR is the visual game and referee. Node/OceanBox-JS is the canonical headless runtime. Colab/Python workflows analyze artifacts or call Node; they do not reimplement the simulator.

## 2. Current Architecture

Current renderer sequence: THREE-R1.1E scene isolation and THREE-R1.2A water-column slabs are followed by THREE-R1.2A.1 volumetric activation/lifecycle hardening, THREE-R1.2A.3 continuous waypoint/dive/field activation, THREE-R1.2A.3.1 continuous Mission UI runtime stabilization, THREE-R1.2A.4.2 performance measurement, THREE-R1.2A.4.3 Simulation presentation optimization and authoritative grouped E2E, then THREE-R1.2B bathymetric seabed mesh/coastline/landmass geometry, THREE-R1.2B.1 bathymetry integration hardening, legacy terrain retirement, and visual/performance closure, THREE-R1.2C terrain-aware continuous mission validation and polished 3D presentation, THREE-R1.2C.1 terrain validation runtime completion, replay/event alignment, and E2E stabilization, THREE-R1.2C.2 terrain-validation performance recovery, missing E2E completion, and final R2 readiness gate, THREE-R2A replay/debrief route review, THREE-R2A.1 replay acceptance/full-E2E closure, and later THREE-R2B mission editor parity after the replay gates pass.

### Browser ANCHOR

Browser ANCHOR is the visual game, referee, and debrief UI. Three.js is now the production mission environment for planning and live simulation rendering, with visible planning tools, repaired end-to-end waypoint placement, standard left-drag pan / right-drag orbit / wheel-zoom controls, and a transaction-backed Execute -> Simulation launch path in the Mission Workspace. Phaser remains a transitional scene shell, lab host, and query-gated diagnostic fallback (`?legacyPhaser=1`), not the target mission renderer for new feature development. Renderer view models consume public-safe state without owning simulation, scoring, planning, replay semantics, route optimization, or hidden truth. Browser ANCHOR owns the player-facing planning flow, simulation screens, tutorial/challenge routes, benchmark UI, adaptive surfacing review, and Headless Bundle Viewer. Browser scoring remains the official gameplay scoring surface.

Product surfaces include:

- Mission briefing, route planning, simulation, and debrief.
- Challenge and tutorial flows.
- Learning Labs and Simulation Sandboxes.
- Planner Benchmark, Adaptive Benchmark, and Full Autonomy Benchmark placeholders/contracts.
- Headless Bundle Viewer for inspecting Node/OceanBox-JS bundles and roundtrip reports.
- Methods & Validation for inspecting the official evidence baseline, validation status, limitations, and reproduction commands.

### Portable JS Core

The portable JavaScript core holds deterministic model, schema, state, scoring-adjacent, export, and validation logic that can be shared between browser and Node. Core modules should stay headless-safe where possible: no Phaser dependency, no DOM dependency, and no browser-only side effects unless the module is explicitly UI-facing.

Current core areas include benchmark contracts, science diagnosis, hidden-event and forecast-correction state, water-column models, headless schemas, solver-packet adapters, bundle validation, sampling priority, flow-coupled action value, and process/field math.

WORLD-R1 adds multiscale world-domain contracts to the portable core: physical `operationalDomain`, independent `resolutionProfile`, physical-coordinate sampling, compact regional exports, and synthetic regional shelf/fleet defaults. This is a world-model compatibility layer, not a renderer switch, planner addition, scoring redesign, real-data integration, or calibrated ocean forecast.

### Node/OceanBox-JS

Node/OceanBox-JS is the canonical non-browser headless runtime. It can run deterministic educational missions, execute submitted waypoint plans, emit JSON/CSV bundles, validate solver packets, run solver-packet roundtrips, and produce browser-compatible bundle artifacts.

The intended workflow is:

```text
Browser ANCHOR <-> shared schemas / portable JS core
Node/OceanBox-JS <-> JSON/CSV bundles and roundtrip reports
Colab / Solver / Classroom Analysis <-> artifact inspection or Node calls
```

### Colab/Python

Colab/Python workflows are wrappers, external solver examples, and artifact-analysis notebooks. They may read JSON/CSV bundles, inspect observations and tracks, compare scores, or call Node/OceanBox-JS. They are not a second simulator and should not drift from the canonical JavaScript runtime.

COLAB-BENCH-R1 expands this into a reproducible classical-planner benchmark workflow. The notebook may build approximate planning graphs, run transparent algorithms, and export `anchor.plan` artifacts, but official validation, simulation, and scoring remain in the canonical ANCHOR JavaScript packages. Exact results are exact only for declared bounded candidate sets, objectives, state representations, and discretizations.

## 3. Scientific State Model

ANCHOR's scientific state model separates what exists in the world from what the player, solver, or mission manager can see.

Canonical concepts:

- `T_hiddenTruth`: hidden truth field. It is not visible to normal players or solvers.
- `E_forecast`: expected or forecast state. It can be wrong.
- `mu_belief`: current belief state derived from forecasts and observations.
- `U_uncertainty`: uncertainty over the belief state.
- `P_unknown`: hidden-event probability, which is not the same as ordinary uncertainty.
- `A_global`: vehicle-independent science priority.
- `Q_glider`: glider/action-specific value that can include reachability, flow, or vehicle context.
- `F_current`: current/flow fields used for motion and action-value reasoning.
- `waterColumn`: simplified depth-layer state under each top-down cell.
- `observations`: noisy snapshots collected at sampled x/y/depth/time.
- `scienceDiagnostics`: forecast-correction and hidden-event interpretation metadata.
- `surfacingEvents`: communication/upload points that can trigger diagnosis and handoff.
- `objectiveHistory`: records of mission objective changes and rationale.

The distinction matters: hidden truth can drive outcomes without being visible; forecast layers can be wrong; belief updates only after observations; and hidden-event probability represents evidence that something missing from the forecast may exist.

## 4. Core Gameplay Loop

The target gameplay loop is:

1. Receive a mission brief and objective.
2. Inspect visible forecast, belief, uncertainty, priority, and constraint layers.
3. Assign a glider route and, where available, a dive profile.
4. Simulate under currents, hazards, and hidden truth.
5. Collect noisy samples at x/y/depth/time.
6. Surface or upload observations.
7. Update belief and uncertainty.
8. Diagnose forecast correction versus hidden event hypothesis.
9. Let the mission manager recommend a new objective when the mode allows it.
10. Have the player or solver plan the next leg.
11. Debrief science value, uncertainty reduction, discovery, energy, risk, redundancy, regret, and route quality.

The mission manager may recommend what to do next. It should not silently generate routes in Planner or Adaptive Benchmark authority modes.

## 5. Game / Benchmark Authority Modes

### Planner Benchmark

Implemented/current foundation. Planner Benchmark fixes the objective and compares route attempts. The player, greedy baseline, imported solver, or external workflow chooses the route. Benchmark records normalize attempts, route execution, overlays, comparison tables, attempt sessions, and exports so manual and solver attempts can be compared under the same episode identity.

### Adaptive Benchmark

Implemented/current foundation with active hardening. Adaptive Benchmark gives objective authority to a transparent mission manager at surfacing or debrief points. Science diagnosis and evidence can recommend a next objective, but the player or solver still chooses the route. Adaptive records preserve objective history, surfacing events, next-leg handoff, and mission-manager rationale.

### Full Autonomy Benchmark

Planned/future. Full Autonomy Benchmark is the authority mode where a future solver or agent chooses both objective and route. It should eventually align with RL/MARL environment vocabulary, including observation, action, reward, termination, visibility tier, and multi-agent schemas.

Full Autonomy is not a shortcut to MARL. The environment, observations, actions, rewards, visibility tiers, and benchmarks must be stable first. No MARL/RL training implementation is currently claimed.

## 6. Visibility / Information-Access Modes

Visibility mode is separate from authority mode. Blind Discovery can be manual, solver-driven, adaptive, or eventually autonomous; it is about what information is visible, not who controls the route.

### Oracle / Training Mode

Implemented/current foundation for teaching, debugging, and deterministic baselines. Full truth or deterministic state may be visible. This is useful for explaining mechanics but is not a fair hidden-state benchmark mode.

### Forecast-Guided Mode

Current foundation. The player sees forecast, uncertainty, and expected value while hidden truth differs from the forecast. Samples reveal forecast error and support forecast correction.

### Belief-Only Mode

Active/near-term. The player sees updated belief and uncertainty, not hidden truth. Mission planning uses imperfect knowledge and should depend on sparse observations, belief updates, uncertainty, and diagnosis.

### Blind Discovery / Hidden-State Mode

Planned/future gameplay mode. In Blind Discovery / Hidden-State Mode, the ocean is hidden until observed. The player receives only sampled snapshots at the sampled x/y/depth/time. The mission is about building a usable belief map from sparse observations.

This mode should hide full field data, expose observations and derived belief only, and fit exploration, discovery, hidden-event campaigns, and classroom assignments about sparse sensing.

### Debug / All-Layers Mode

Internal/teaching/QA mode. It may expose truth, forecast, belief, uncertainty, priority, hidden-event probability, water-column layers, and diagnostics at once. It is not a fair benchmark visibility tier.

## 7. Mission Objective Archetypes

Different objectives change scoring weights, priority logic, diagnosis interpretation, and mission-manager recommendations.

Current and planned archetypes include:

- Survey / reconnaissance: cover an area and build baseline knowledge.
- Reduce uncertainty: sample where belief uncertainty is high.
- Validate forecast: test whether expected structure matches observations.
- Map front / boundary: localize gradients, fronts, or process edges.
- Confirm hidden event: gather evidence for a phenomenon missing from the forecast.
- Localize source: move from evidence toward a likely source or upstream driver.
- Track moving feature: follow a plume, bloom, front, or evolving process.
- Revisit stale region: refresh areas whose observations are old.
- Persistent monitoring: sustain repeated observations over a time window.
- Cooperative coverage: coordinate multiple gliders without redundant sampling.
- Hazard avoidance: collect useful data while avoiding risk.
- Energy conservation: trade science value against current, distance, and profile cost.
- Forecast correction: improve or challenge the expected field.
- Science discovery: search for unmodeled or poorly represented phenomena.

## 8. 2.5D Water-Column Model

Implemented/current foundation with active hardening. The 2.5D model keeps the top-down map as the main tactical board while allowing each x/y cell to contain simplified depth layers. The default simplified gameplay layers are `surface`, `thermocline`, and `deep`.

Dive profiles determine which layer is sampled along a route. Current profile vocabulary includes `surfaceOnly`, `thermoclineDive`, `deepDive`, `fullProfile`, and `sawtoothProfile`. These support ideas such as vertical coverage, depth mismatch, hidden bloom layer, and deep plume hypothesis without turning the browser game into full 3D navigation.

Water-column summaries collapse depth-layer value into playable top-down priority while preserving best-depth-layer diagnostics. A high-value top-down cell may represent surface value, thermocline value, deep value, or integrated water-column value.

P11 / 2.5D work is not full 3D planning, not production vehicle control, and not calibrated vertical ocean modeling.

## 9. Scientific Model Stack

### Learning Labs

Learning Labs are concept-first interactive explanations. They should teach scientific computational modeling, CA/grid-process ideas, ocean process analogs, uncertainty, sampling priority, glider action value, benchmark modes, hidden discovery, and headless workflow concepts without requiring the full game loop.

### Simulation Sandboxes

Simulation Sandboxes are inspectable model demos for the scientific stack. Current foundation includes:

- Sampling Process Lab.
- Flow Fields Demo.
- Coupled Fields Demo.
- Uncertainty / Forecast Demo.
- Sampling Priority Demo.
- Flow-Coupled Sampling Demo.
- Headless Bundle Viewer.

### Process Modeling Note

CA/grid-process examples are used to teach deterministic local update rules, emergence, and observable process patterns. The production mission model increasingly uses continuous-like field functions, belief/uncertainty state, flow-coupled action value, and 2.5D observations.

CA and grid-process examples can be useful teaching analogs for coastal/environmental modeling, but they do not automatically provide calibrated hydrodynamics or operational forecasts.

## 10. Headless / Colab / Solver Workflow

Node/OceanBox-JS supports deterministic educational headless simulation, solver-packet validation, submitted-plan execution, bundle export, and roundtrip reports. Typical artifacts include `bundle.json`, `manifest.json`, observations, glider tracks, score reports, replay records, visible field summaries, science diagnostics, water-column summaries, and roundtrip reports.

The intended file workflow is:

```text
Browser exports solver packet
-> solver or student creates plan
-> Node/OceanBox-JS roundtrip evaluates plan
-> headless bundle/report generated
-> browser Headless Bundle Viewer inspects the result
-> Colab/Python analysis reads JSON/CSV artifacts or calls Node
```

Boundaries:

- Node headless score is educational, not official browser scoring.
- Browser ANCHOR remains the visual/referee UI.
- Python does not reimplement simulation.
- Public bundles must not expose hidden truth payloads.

## 11. Near-Term Priorities

Current renderer stabilization priority is THREE-R1.1E Scene Isolation, Vehicle Pose, Guidance Overlay, Grid Alignment, and Waypoint-Validation Parity. Terrain/slab work must wait until scene isolation, pose, guidance, alignment, and waypoint semantics pass focused browser and owner QA. After that gate, proceed to THREE-R1.2 Bathymetric Terrain Surface + Operational Depth/Control Slabs; THREE-R2 remains later.


Active/near-term work should stabilize the current Three.js-first mission architecture before adding large new systems.

1. THREE-R1.1 - Mission Workspace runtime crash, pointer calibration, and drop-zone parity stabilization: complete code stabilization and manual Planning QA before treating THREE-R1 as done.
2. THREE-R1.1E - Scene Isolation, Vehicle Pose, Guidance Overlay, Grid Alignment, and Waypoint-Validation Parity: prevent stale mission scenes behind Product Hub, preserve one renderer per mission scene, align pose/guidance/cell semantics, and keep mission-window overruns as warnings.
3. THREE-R1.2 - Bathymetric Terrain Surface + Operational Depth/Control Slabs: add the next terrain/depth visualization layer while preserving the single explicit operational selection contract until depth-aware planning is deliberately introduced.
4. THREE-R2 - Three.js Replay, Debrief Route Review, and Editor Interaction Parity: extend the proven Three mission surface to replay/debrief/editor inspection without taking over replay, scoring, or editor rules.
4. Lifecycle extraction readiness: extract mission lifecycle only behind the restored Phaser scene shell, preserving visible product flow and avoiding the reverted DOM router/hash-route approach.
5. Legacy Phaser retirement readiness: keep `?legacyPhaser=1` diagnostic coverage while reducing production dependencies on Phaser map drawing and pointer code incrementally.
6. Blind Discovery / Hidden-State Mode implementation: hide ocean fields until sampled and build gameplay around sparse observations and belief construction.
7. Production mission scoring synthesis: align science value, uncertainty, discovery, energy, hazards, redundancy, and regret without replacing official browser scoring with headless scoring.
8. Learning Lab for Benchmark Modes + Headless Workflow + Hidden Discovery: teach Planner, Adaptive, Full Autonomy, solver-packet roundtrip, forecast correction, hidden-event hypothesis, and 2.5D sampling.
9. Scenario packs and classroom assignment packs: provide reproducible missions for teaching and benchmark comparisons.
10. Replay/debrief polish: improve comparisons, route explanation, depth-layer summaries, and regret narratives.
11. Manual QA and performance pass: keep the static browser app responsive and testable as fields and artifacts grow.

## 12. Medium-Term Priorities

Planned work after the near-term stabilization pass:

- Multi-glider assignment and redundancy-aware planning diagnostics.
- Communication windows, surfacing limits, and delayed observation upload.
- Mission-manager objective decks for different campaign styles.
- Hidden-event campaigns with escalating evidence and diagnosis states.
- Depth-aware objective scoring and water-column debrief narratives.
- Browser/headless replay alignment and parity tests.
- Classroom exports, grading summaries, and assignment templates.
- Benchmark packs for manual, greedy, imported solver, and Node roundtrip comparisons.
- Imported solver comparison packs with normalized visibility and fairness labels.
- Better browser/headless parity tests for observations, routes, bundles, and replay.

## 13. Longer-Term Research Tracks

Research/optional tracks should remain clearly labeled until the environment contracts are stable:

- Full Autonomy Benchmark where an agent chooses both objective and route.
- RL/MARL environment wrapper around stable observation/action/reward schemas.
- Centralized-training / decentralized-execution compatibility for multi-glider studies.
- Multi-agent observation, action, reward, termination, communication, and visibility schemas.
- Offline datasets and challenge corpora for solver comparison.
- Oracle/debug datasets with explicit hidden-truth labeling.
- External scientific model ingestion, clearly labeled as imported and not automatically validated.
- Optional backend leaderboard or classroom dashboard.

These are research tracks, not current implementation claims.

## 14. Non-Goals / Boundaries

Current boundaries:

- No React or TypeScript migration requirement.
- No backend requirement for normal play.
- No in-browser arbitrary solver-code execution.
- No claim that synthetic currents are validated CFD, HYCOM, ROMS, or operational ocean forecasts.
- No Python simulator reimplementation.
- No MARL/RL training implementation yet.
- No full 3D route planning yet.
- No wholesale Phaser removal in one pass; Phaser retirement should proceed through tested migration steps while preserving the developer-only diagnostic fallback until parity is proven.
- No WebGPU fluid simulation in the canonical mission engine.
- No production data assimilation, GP, or GMRF claim.
- No official browser scoring replacement by headless score.
- No multiplayer/account system in the current static app.
- No calibrated vertical ocean model claim for 2.5D water-column work.
- No automatic route generation by Adaptive Benchmark handoff.

## 15. Roadmap Reading Guide

- [docs/development_versions.md](docs/development_versions.md) is the current development log.
- `ROADMAP.md` is the strategic direction.
- Individual feature docs explain implemented details and boundaries.
- Future roadmap items should be checked against smoke tests, current docs, and export contracts before being treated as implemented.

## MOTION-R1 Execution Model Checkpoint

MOTION-R1 is implemented as a core execution-model layer plus a Simulation Lab sandbox, not as a fourth authority mode. Planner Benchmark, Adaptive Benchmark, and Full Autonomy Benchmark remain the authority modes. The motion layer represents planned waypoints, control commands, deterministic glider state updates, realized trajectories, sampled observations, motion diagnostics, and public-safe bundle summaries. Future ENV/GFX work may improve bathymetry/depth visualization or explore WebGPU fluid coupling, but Node/OceanBox-JS remains canonical for deterministic replay and artifact generation.

## SIM-R1 Motion Cost Graph Checkpoint

SIM-R1 now adds optional Node/OceanBox-JS motion cost graph and adjacency matrix artifacts for benchmark inspection. It evaluates directed/asymmetric motion edge costs from public-safe currents, constraints, hazards, depth/bathymetry context, science-priority context, and motion configuration. It exports `anchor.benchmark.feasibility-cost-graph` and `anchor.headless.motion-cost-matrix` when `--cost-graph` is enabled. Scenario-comparison reports remain future work. SIM-R1 does not choose or optimize routes, change browser scoring, add Python simulation, claim operational validation, or add MARL/RL. See [Motion Cost Graph and Adjacency Matrix](docs/motion_cost_graph_and_adjacency_matrix.md).

## GFX-ARCH-R1 Renderer Boundary Checkpoint

GFX-ARCH-R1 introduced the renderer boundary. MIG-R1 moves the production mission path to Three.js while keeping Phaser as transitional shell/lab infrastructure and a query-gated diagnostic fallback. Renderer Architecture Preview remains under Simulation Lab as an inspection scaffold, not a final gameplay scene.

ENV-R1 established the bathymetric world view and toggleable depth-layer concept. GFX-R2 upgrades that view to a dedicated Three.js/WebGL renderer. GFX-R3A connects the Three.js mission-world renderer to live Mission Planning through `MissionWorldRenderViewModel`, `MissionWorldStateAdapter`, and `ThreeMissionWorldRenderer`; GFX-R3B adds intent-based planning interaction parity through `MissionWorldInteractionIntent`, `MissionWorldInteractionResult`, `ThreeMissionHitTest`, `ThreeMissionInteractionController`, and the Mission Workspace bridge. MIG-R1 makes this Three.js path the default production planning/simulation renderer and adds live simulation layers for realized trajectories, sampled observations, surfacing events, route status, and simulation status. WebGPU-Ocean-style fluid work remains a future sandbox/reference, not the canonical mission engine. The renderer layer must not own simulation state, browser scoring, planning, replay semantics, headless runtime behavior, hidden truth, Python simulation, route optimization, or MARL/RL.

GFX-R2 Bathymetric World View adds higher-quality synthetic bathymetry visualization over the 2.5D model. GFX-R3A adds visual parity for live mission artifacts such as terrain, bathymetry, currents, scalar fields, hazards, drop zones, selected starts, gliders, waypoints, planning markers, routes, and active Gold Stars. GFX-R3B adds direct Three.js hover/inspect, selection, 2.5D waypoint placement/editing/deletion, planning-marker interaction, and Gold Star inspection while preserving canonical workspace commands. MIG-R1 adds default Three.js mission rendering and live simulation rendering while preserving the boundary: no full 3D route planning, route optimizer, replay/debrief takeover, WebGPU-Ocean, Python simulator, scoring changes, or MARL/RL.
## SCORE-R1 Shadow Mission Outcome Scoring

SCORE-R1 is shadow benchmark scoring. It does not replace official browser scoring, Challenge Mode scoring, leaderboard ranking, or existing debrief totals. Profiles are objective-aware and versioned; missing data is explicit; regret requires a compatible reference, and best-known attempt does not mean optimal. The Node/OceanBox-JS runtime remains the canonical headless runtime. Python/Colab analyzes exported artifacts or invokes Node; no Python simulator, planner, optimizer, MARL/RL, operational certification, SeaExplorer validation, or calibrated ocean forecast is added.

See [Mission Scoring and Regret](docs/mission_scoring_and_regret.md) for the SCORE-R1 artifact contract and boundaries.

H4.1 hardens replay artifacts with formal schemas, deterministic integrity issue codes, tamper fixtures, compact browser replay summaries, and a contract-only multi-agent replay fixture. This stabilizes public replay/debrief infrastructure before Blind Discovery gameplay or cooperative multi-glider work; it does not add authoritative hidden-state replay, Python simulation, planners, optimizers, or MARL/RL.

## Current Renderer Stabilization Note

THREE-R1.2A adds the operational 2.5D water-column renderer over the existing P11 model. THREE-R1.2A.3.1 stabilizes the visible continuous Planning UI and execute-through-dive workflow. THREE-R1.2A.4.2 adds measured performance/debug instrumentation and headed UX validation. THREE-R1.2A.4.3 adds Simulation presentation scheduling, dirty-category incremental updates, and authoritative grouped E2E coverage. THREE-R1.2B - Bathymetric Seabed Mesh, Coastline, and Landmass Geometry is gated until grouped/full E2E evidence passes and the Simulation performance target or 2x improvement gate is met.

### THREE-R1.2A.2 - Depth-aware sampling value, dive feasibility, and scientific scoring

Implemented as a stabilization step before terrain/seabed work. Horizontal surface waypoints still define mission intent; segment distance and profile mechanics constrain achievable dive depth; science is credited from actual depth-aware observations; different layers may carry different scientific value; integrated top-down priority is a planning summary, not automatic sample credit; scoring is versioned. No arbitrary XYZ route planner and no operational/calibrated ocean validation are claimed.

Next intended renderer/science order:

1. THREE-R1.2A.2 - Depth-aware sampling value, dive feasibility, and scientific scoring
2. THREE-R1.2A.4.2 - Performance measurement, headed UX validation, and full-suite reliability closure
3. THREE-R1.2B - Bathymetric seabed mesh, coastline, and landmass geometry, only after the closure gate is satisfied
4. THREE-R1.2C - Terrain-aware profile feasibility and polished 3D mission presentation
5. THREE-R2 - Replay, debrief route review, and editor parity

## Renderer Roadmap Checkpoint

Current order:

1. THREE-R1.2A.4 - Predicted 3D dive planning and bathymetry renderer convergence.
2. THREE-R1.2A.4.2 - Performance measurement, headed UX validation, and full-suite reliability closure.
3. THREE-R1.2B - Continuous bathymetric seabed mesh, coastline, and landmass geometry, gated by the closure evidence.
4. THREE-R1.2C - Terrain-aware continuous mission validation and polished 3D presentation.
5. THREE-R2 - Replay, debrief route review, and editor parity.

THREE-R1.2A.4 keeps surface waypoints as navigation/surfacing intent and moves underwater geometry into segment dive-profile prediction. It does not add arbitrary XYZ path planning, WebGPU fluid simulation, calibrated ocean claims, or renderer-owned simulation/scoring.

## Renderer Roadmap Order

1. THREE-R1.2A.4.1 - Sampling targets, camera freedom, multi-yo execution parity, and runtime performance hardening.
2. THREE-R1.2A.4.2 - Performance measurement, headed UX validation, and full-suite reliability closure.
3. THREE-R1.2B - Continuous bathymetric seabed mesh, coastline, and landmass geometry, gated by accepted R1.2A.4.2 performance/reliability evidence.
4. THREE-R1.2C - Terrain-aware continuous mission validation and polished 3D presentation.
5. THREE-R2 - Replay, debrief route review, and editor parity.

Do not mark THREE-R1.2A complete while camera freedom, sampling-target semantics, multi-yo execution parity, runtime stability, measured performance, headed UX validation, or full-suite reliability remain unverified.

### THREE-R1.2A.4.3 Gate

Current roadmap order:

1. THREE-R1.2A.4.3 - Simulation presentation optimization and authoritative grouped E2E
2. THREE-R1.2B - Continuous bathymetric seabed mesh, coastline, and landmass geometry
3. THREE-R1.2C - Terrain-aware continuous mission validation and polished 3D presentation
4. THREE-R2 - Replay, debrief route review, and editor parity

THREE-R1.2B and THREE-R1.2B.1 are complete terrain foundation checkpoints. THREE-R1.2C is the current terrain-aware validation and presentation checkpoint. Human manual QA by the project owner remains separate from headed automated QA.
## THREE-R1.2A.4.4 Complete

GPU/RAF render-cost closure preceded the completed terrain foundation. The current terrain stack now includes continuous bathymetric mesh/coastline/landmass geometry, bathymetry integration hardening, and terrain-aware mission validation.

## Current Terrain Sequence

THREE-R1.2B is the continuous bathymetric seabed mesh, coastline, and landmass geometry pass. THREE-R1.2B.1 hardens the bathymetry integration and retires legacy terrain paths. THREE-R1.2C adds terrain-aware continuous mission validation and polished 3D presentation. THREE-R2A covers replay and Debrief route review; THREE-R2A.1 closes replay acceptance; THREE-R2B remains mission editor parity after replay gates pass. Terrain authority stays in core JavaScript and does not add arbitrary XYZ planning, WebGPU, a fluid solver, external datasets, or operational ocean claims.

## Near-Term Renderer Roadmap Order

```text
THREE-R1.2B.1
Bathymetry integration hardening, legacy terrain retirement,
and visual/performance closure

THREE-R1.2C
Terrain-aware continuous mission validation and polished 3D presentation

THREE-R2
Replay, debrief route review, and editor parity
```

## THREE-R1.2C / THREE-R2 Order

Current renderer order is THREE-R2A deterministic replay/debrief review, THREE-R2A.1 replay acceptance and full E2E closure, then THREE-R2B Three.js mission editor parity and production Phaser scene retirement. THREE-R2B should start only after replay validation, browser/headless parity checks, headed automated QA, and owner manual QA expectations are stable.

## Near-Term Renderer Sequence

| Order | Phase | Notes |
| --- | --- | --- |
| 1 | THREE-R1.2C.1 | Terrain validation runtime completion, replay/event alignment, and E2E stabilization. |
| 2 | THREE-R2 | Three.js replay, Debrief route review, and editor parity. |

## THREE-R2B Checkpoint

Mission Editor parity now uses the canonical editor document/command/session path with Three.js presentation. Phaser remains the shell and is not ready for final dependency removal. Next recommended work should continue retiring Phaser scene internals only after owner review of `test-results/three-r2b-owner-review/`.

## THREE-R3 Runtime Roadmap

1. THREE-R3A - Phaser-free production shell, UI parity, accessibility foundation, and final-removal readiness. Current Phaser shell remains default; the next shell is explicitly gated by `?runtimeShell=next`.
2. THREE-R3B - Default runtime switch, Learning Lab migration, and Phaser dependency removal after parity acceptance.
3. THREE-R3C - Release candidate hardening, packaging, accessibility closure, documentation, and production release.

No scientific, scoring, schema, or planner semantics change in R3A. Human manual QA remains separate from headed automated QA.

## WORLD-R1.1 Checkpoint

WORLD-R1.1 activates Regional Fleet Area in generated gameplay, unifies modern land/water/coastline/bottom behavior under a signed terrain surface, preserves continuous physical route coordinates, and fixes stale Planning-guide preview geometry. THREE-R3B remains gated by the separate R3A owner approval path; WORLD-R1.1 does not switch runtimes or remove Phaser.

## FLOW-R2A Current Stack Note

FLOW-R2A adds the canonical 4D current cube, depth/time sampler, DIVE-R1.1 layer-explorer current extension, and instanced current glyph layer. FLOW-R2B should add display-only tracers, pathlines, stream ribbons, and route-current inspection. WebGPU remains future backend work and does not replace regional current authority.

## FLOW-R2A.3 Before FLOW-R2B

FLOW-R2A.3 adds scientifically constrained 4D currents, bathymetry-aware validation, manufactured analytical benchmarks, and true volumetric depth-time rendering. FLOW-R2B remains display-only tracers, pathlines, stream ribbons, and route-current inspection. DATA-R1 remains the future offline attributed ocean-model fixture pipeline. FLOW-R3 remains optional WebGPU tracer/pathline compute. FLUID-R1 remains optional bounded local fluid perturbation research.

## FLOW-R2A.5 Current Dynamics Checkpoint

FLOW-R2A.5 is the current scientific behavior closure for production currents. It requires normal generated missions to show depth-distinct source currents, canonical mission-time evolution, physical magnitude-to-glyph scaling with calm-region handling, and coherent named coastal/ocean-style synthetic components. Bathymetry constrains the wet volume and declared component behavior; it is not a downhill-flow rule.

Near-term current roadmap order:

```text
FLOW-R2A.5
Production 4D current dynamics, magnitude fidelity, and ocean-coherent synthetic fields

FLOW-R2B
Display-only tracers, pathlines, stream ribbons, and route-current inspection

WORLD-R2
Multi-feature large regional operational domains

DATA-R1
Offline attributed NetCDF ocean-model fixture pipeline

FLOW-R3
Optional WebGPU current visualization and tracer compute

FLUID-R1
Optional bounded local WebGPU fluid-perturbation research layer
```

Do not treat FLOW-R2B as ready unless normal production vectors differ by depth, evolve with canonical time, encode physical magnitude, represent calm regions without arbitrary direction, pass coherence/bathymetry diagnostics, preserve glider/render parity, and satisfy headed performance plus grouped E2E gates.

## Scientific Package Roadmap Order

- ARCH-R1: Scientific package contracts and dependency boundaries.
- BATHY-PKG-R1: Bathymetry contracts, artifact, sampler, and pure helper extraction.
- BATHY-PKG-R2: Synthetic bathymetry generator extraction and component composition.
- FLOW-PKG-R1: 4D current generator and sampler extraction.
- PROCESS-PKG-R1: Canonical scalar-field package extraction is implemented; next package work should compose bathymetry, currents, and scalar artifacts through environment manifests.
- ENV-PKG-R1: Canonical environment composition is implemented; next package work should make the simulator consume composed environment artifacts more directly without changing gameplay outcomes.
- SIM-PKG-R2: Mission simulator authoritative runtime cutover is implemented; future work should keep package authority while avoiding scoring, rendering, and schema drift.
- WEBGPU-GEN-R1: Optional WebGPU generation backend.

BATHY-PKG-R1 is an extraction phase, not a scientific retuning phase. The package owns canonical bathymetry contracts and pure scientific helpers. The application owns UI, scene lifecycle, and visualization.

## Current Extraction Sequence

- FLOW-PKG-R1: 4D current contracts, artifact, sampler, metadata, and diagnostics extraction.
- FLOW-PKG-R1.1: Production boot readiness and grouped E2E closure.
- FLOW-PKG-R2: Production current generator and component composition extraction, preserving V2 compatibility while adding the V3 depth-structured mixed-regional backend and explicit barotropic controls.
- PROCESS-PKG-R1: Canonical scalar-field package extraction is implemented; next package work should compose bathymetry, currents, and scalar artifacts through environment manifests.
- ENV-PKG-R1: Canonical environment composition is implemented; next package work should make the simulator consume composed environment artifacts more directly without changing gameplay outcomes.
- SIM-PKG-R2: Mission simulator authoritative runtime cutover is implemented; future work should keep package authority while avoiding scoring, rendering, and schema drift.

## CODEC-R1 Checkpoint

Completed: `packages/codecs` now owns canonical artifact transport: registry, version checks, canonical JSON/JSONL, envelopes, bundle manifests, safety limits, supported migration reports, deterministic digests, Python-friendly serialization, and import inspection metadata. Result exports and Debrief surface score/profile/digest/fairness metadata. Next recommended roadmap remains SCI-VALID-R2A, COLAB-BENCH-R1, then ALPHA-R1 only after codec, migration, public-safety, solver round-trip, Python, package purity, Pages, and release gates stay green.
