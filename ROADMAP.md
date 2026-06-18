# Roadmap

This roadmap tracks likely next development directions for **ANCHOR: Glider Command**. It is not a claim that future items are implemented.

For the current development-state log, see [docs/development_versions.md](docs/development_versions.md). Individual feature docs and smoke tests are the source of truth for what is implemented.

For the canonical game-design spec, see [docs/game_design_scientific_auv_planning.md](docs/game_design_scientific_auv_planning.md). It captures the mission loop, objective archetypes, visibility modes, scoring model, 2.5D model, and future production gameplay targets.

## 1. Product Vision

ANCHOR is evolving into a scientifically grounded AUV/glider adaptive-sampling serious game and benchmark tool. It combines a browser-based game/referee, learning labs, simulation sandboxes, benchmark modes, a portable JavaScript scientific core, and a reproducible Node/OceanBox-JS headless workflow.

The core scientific lesson is: the best path is not always the shortest path, and the best sample is not always the highest-value-looking cell. Good missions balance uncertainty, forecast error, hidden discovery, current and energy cost, redundancy, hazards, and mission objective.

Current foundation:

- Browser game and teaching tool for planning, simulation, replay, and debrief.
- Learning Labs and Simulation Sandboxes for model concepts and inspection.
- Planner and Adaptive benchmark surfaces for route and mission-management comparisons.
- Node/OceanBox-JS artifacts for deterministic headless simulation, solver-packet roundtrip, and classroom analysis.
- Colab/Python wrapper and artifact-analysis workflows.

Browser ANCHOR is the visual game and referee. Node/OceanBox-JS is the canonical headless runtime. Colab/Python workflows analyze artifacts or call Node; they do not reimplement the simulator.

## 2. Current Architecture

### Browser ANCHOR

Browser ANCHOR is the visual game, referee, and debrief UI. Phaser remains the current app/game shell and input/fallback renderer. GFX-ARCH-R1 added a renderer boundary so Three.js/WebGL/WebGPU environmental renderers can consume public-safe view models without owning simulation, scoring, planning, replay semantics, or hidden truth. GFX-R3A connects an optional Three.js Bathymetric 3D renderer to the live Mission Planning workspace through a mission-world view model. Browser ANCHOR owns the player-facing planning flow, simulation screens, tutorial/challenge routes, benchmark UI, adaptive surfacing review, and Headless Bundle Viewer. Browser scoring remains the official gameplay scoring surface.

Product surfaces include:

- Mission briefing, route planning, simulation, and debrief.
- Challenge and tutorial flows.
- Learning Labs and Simulation Sandboxes.
- Planner Benchmark, Adaptive Benchmark, and Full Autonomy Benchmark placeholders/contracts.
- Headless Bundle Viewer for inspecting Node/OceanBox-JS bundles and roundtrip reports.

### Portable JS Core

The portable JavaScript core holds deterministic model, schema, state, scoring-adjacent, export, and validation logic that can be shared between browser and Node. Core modules should stay headless-safe where possible: no Phaser dependency, no DOM dependency, and no browser-only side effects unless the module is explicitly UI-facing.

Current core areas include benchmark contracts, science diagnosis, hidden-event and forecast-correction state, water-column models, headless schemas, solver-packet adapters, bundle validation, sampling priority, flow-coupled action value, and process/field math.

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

Active/near-term work should stabilize the current scientific game and headless architecture before adding large new systems.

1. GFX-R3B - Three.js Planning Interaction Parity: add direct Three hover, selection, placement, and drag affordances only after confirming the live GFX-R3A renderer preserves mission state and scorer boundaries.
2. P11 - 2.5D Water-Column Sampling and Depth-Layer Mission Model: harden browser/headless parity, teaching copy, and fixture coverage around the new water-column foundation.
3. H4 - Headless Replay / Browser Replay Alignment: make headless episode replay inspectable in Browser ANCHOR with clearer route, observation, score, and diagnosis alignment.
4. SCORE-R1 - Mission Scoring Synthesis: align browser debrief scoring with science value, uncertainty, discovery, energy, hazards, redundancy, and regret while keeping browser scoring authoritative and headless score educational.
5. P12 - Multi-Glider Cooperative Sampling and Redundancy-Aware Assignment: extend objectives and diagnostics for multiple vehicles while avoiding duplicate samples and redundant coverage.
6. Learning Lab for Benchmark Modes + Headless Workflow + Hidden Discovery: teach Planner, Adaptive, Full Autonomy, solver-packet roundtrip, forecast correction, hidden-event hypothesis, and 2.5D sampling.
7. Blind Discovery / Hidden-State Mode implementation: hide ocean fields until sampled and build gameplay around sparse observations and belief construction.
8. Production mission scoring synthesis: align science value, uncertainty, discovery, energy, hazards, redundancy, and regret without replacing official browser scoring with headless scoring.
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
- No requirement to remove Phaser; future 3D rendering should be a pluggable renderer layer first.
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

GFX-ARCH-R1 keeps Phaser as the app/game shell and adds pure renderer boundary contracts for capability detection, renderer host descriptors, and public-safe ocean-world render view models. Renderer Architecture Preview appears under Simulation Lab as an inspection scaffold, not a final 3D scene.

ENV-R1 established the bathymetric world view and toggleable depth-layer concept. GFX-R2 upgrades that view to a dedicated Three.js/WebGL renderer that consumes public-safe view models while Phaser remains the app shell. GFX-R3A connects a separate Three.js mission-world renderer to the live Mission Planning workspace through `MissionWorldRenderViewModel`, `MissionWorldStateAdapter`, and `ThreeMissionWorldRenderer`. WebGPU-Ocean-style fluid work remains a future sandbox/reference, not the canonical mission engine. The renderer layer must not own simulation state, browser scoring, planning, replay semantics, headless runtime behavior, hidden truth, Python simulation, route optimization, or MARL/RL.

GFX-R2 Bathymetric World View adds higher-quality synthetic bathymetry visualization over the 2.5D model. GFX-R3A adds visual parity for live mission artifacts such as terrain, bathymetry, currents, scalar fields, hazards, drop zones, selected starts, gliders, waypoints, planning markers, routes, and active Gold Stars. It does not add full 3D route planning, direct Three.js planning input, WebGPU-Ocean, a Python simulator, scoring changes, or MARL/RL.
## SCORE-R1 Shadow Mission Outcome Scoring

SCORE-R1 is shadow benchmark scoring. It does not replace official browser scoring, Challenge Mode scoring, leaderboard ranking, or existing debrief totals. Profiles are objective-aware and versioned; missing data is explicit; regret requires a compatible reference, and best-known attempt does not mean optimal. The Node/OceanBox-JS runtime remains the canonical headless runtime. Python/Colab analyzes exported artifacts or invokes Node; no Python simulator, planner, optimizer, MARL/RL, operational certification, SeaExplorer validation, or calibrated ocean forecast is added.

See [Mission Scoring and Regret](docs/mission_scoring_and_regret.md) for the SCORE-R1 artifact contract and boundaries.

H4.1 hardens replay artifacts with formal schemas, deterministic integrity issue codes, tamper fixtures, compact browser replay summaries, and a contract-only multi-agent replay fixture. This stabilizes public replay/debrief infrastructure before Blind Discovery gameplay or cooperative multi-glider work; it does not add authoritative hidden-state replay, Python simulation, planners, optimizers, or MARL/RL.
