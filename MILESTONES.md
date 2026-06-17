# ANCHOR: Glider Command — Production Roadmap

This roadmap tracks the strategic path from the current mature prototype to a production-ready scientific game and headless research/teaching tool. It is not a claim that all future items are implemented.

For implementation history, use `docs/development_versions.md`. For strategic direction, use this roadmap.

## 1. Product Vision

**ANCHOR: Glider Command** is a scientific serious game, mission-planning sandbox, and benchmark tool for adaptive AUV/glider sampling.

The game teaches that the best mission is not simply the shortest route or the brightest heatmap cell. Good missions balance:

* hidden truth versus imperfect forecast
* belief and uncertainty
* discovery of unknown phenomena
* forecast correction
* water-column depth sampling
* current assist and opposition
* motion feasibility
* energy and surfacing constraints
* redundancy across vehicles
* mission objective priorities

Browser ANCHOR is the **visual game and referee**. Node/OceanBox-JS is the **canonical non-browser runtime**. Colab/Python workflows analyze artifacts or call Node; they do not reimplement the simulator. This matches the established workflow: Colab proposes, ANCHOR validates, ANCHOR simulates, and ANCHOR scores; the Node path exists to reduce translation drift by reusing portable JavaScript core logic. 

## 2. Current Architecture

### Browser ANCHOR

The browser app is the main player-facing product. It owns the visual game shell, mission briefing, planning workspace, simulation, debrief, Learning Labs, Simulation Lab, benchmark UI, headless bundle viewer, and product hub.

It remains the official visual referee for browser missions.

### Portable JavaScript Core

The shared core owns deterministic and educational scientific logic:

* field generation
* flow fields
* 2.5D water-column layers
* dive profiles
* sampling priority
* glider action value
* uncertainty and belief updates
* science diagnosis
* benchmark records
* headless schemas
* bundle export/import contracts

Core modules should stay renderer-independent. They should not depend on Phaser, DOM panels, scenes, or browser-only globals.

### Node/OceanBox-JS

Node/OceanBox-JS is the canonical headless runtime. It generates reproducible missions, runs educational headless episodes, exports JSON/CSV bundles, validates solver packets, evaluates submitted plans, and supports browser-compatible roundtrip reports.

This remains the higher-fidelity non-browser path because it can reuse ANCHOR’s portable JS modules rather than translating the simulator into Python. 

### Colab/Python

Colab/Python is an analysis, solver, and classroom workflow. It may read solver packets, write plans, analyze bundles, and visualize CSV/JSON outputs. It is not the authoritative simulator.

## 3. Scientific State Model

ANCHOR’s world state should be represented through these canonical concepts:

```text
T_hiddenTruth      actual hidden environmental state
E_forecast         expected / forecast state
mu_belief          current belief estimate
U_uncertainty      uncertainty about belief / forecast
P_unknown          probability of unmodeled hidden event
A_global           vehicle-independent sampling priority
Q_glider           glider-specific action value
F(x,y,z,t)         current / flow vector field
C(x,y,z)           constraints, hazards, bathymetry, accessibility
O_t                observations at sampled x/y/depth/time
M_t                mission-manager state
D_t                science diagnosis state
```

The player’s information access depends on the mode. In fair modes, hidden truth is not visible. Solver packets should contain only what a fair planner is allowed to know, and hidden truth should appear only in explicitly labeled oracle/research datasets. 

## 4. Core Game Loop

The production loop is:

```text
Mission brief
→ inspect visible forecast / belief / uncertainty
→ choose objective strategy
→ plan route and dive profile
→ execute under currents and motion constraints
→ collect observations at x/y/depth/time
→ surface / transmit observations
→ update belief and uncertainty
→ diagnose forecast correction vs hidden event
→ mission manager recommends next objective
→ player/solver plans next leg
→ debrief compares science value, discovery, energy, risk, redundancy, and regret
```

AUV adaptive sampling literature supports this as a real scientific pattern: AUVs should coordinate through a 3D aquatic volume, collect measurements using minimal time or energy, and adapt trajectory, spacing, or formation based on field measurements. 

## 5. Authority Modes

### Planner Benchmark

The objective is fixed. The player or solver chooses the route. Attempts can be compared fairly.

Purpose:

* manual vs greedy vs imported solver comparison
* route review
* attempt ranking
* replay and debrief

### Adaptive Benchmark

The mission manager may update the objective after surfacing and evidence review. The player or solver still chooses the next route.

Purpose:

* adaptive sampling
* forecast validation
* hidden-event confirmation
* objective history
* next-leg handoff
* surfacing review

### Full Autonomy Benchmark

Future mode. The solver/agent chooses both objective and route under a stable environment/action/observation/reward interface.

This is not current MARL. It is the benchmark container that will eventually support learning-agent experiments once the environment is stable. The MARL reference model is built around agents receiving observations, choosing actions, receiving rewards and new observations, and repeating this loop over episodes; ANCHOR should align with that vocabulary without claiming MARL implementation yet. 

## 6. Visibility and Information-Access Modes

### Oracle / Training Mode

Truth or debug layers are visible. Used for teaching, validation, and debugging. Not fair for competitive leaderboards.

### Forecast-Guided Mode

The player sees forecast, uncertainty, and expected value. Hidden truth may differ. Samples reveal forecast error.

### Belief-Only Mode

The player sees belief and uncertainty, not truth. Planning happens under imperfect knowledge.

### Blind Discovery / Hidden-State Mode

The ocean starts hidden until observed. The player receives only sampled snapshots at sampled x/y/depth/time. The mission is to build a usable belief map from sparse observations.

This should become one of the most game-like modes because it emphasizes exploration, discovery, inference, and risk.

### Debug / All-Layers Mode

All internal layers are visible for QA, teaching, and development. Not a fair benchmark mode.

## 7. Mission Objective Archetypes

Production missions should be built from objective archetypes:

* survey / reconnaissance
* reduce uncertainty
* validate forecast
* map front / boundary
* confirm hidden event
* localize source
* track moving feature
* revisit stale region
* persistent monitoring
* cooperative coverage
* hazard avoidance
* energy conservation
* forecast correction
* science discovery
* blind exploration

Different objectives should change scoring weights, priority surfaces, mission-manager recommendations, and debrief interpretation.

## 8. Scientific Model Stack

### Learning Labs

Learning Labs explain the scientific ideas and launch companion sandboxes.

Core lab tracks:

* scientific computational modeling
* CA/grid-process introduction
* CA for ocean process analogs
* uncertainty and stochastic processes
* sampling priority
* glider action value
* benchmark modes
* forecast correction vs hidden discovery
* 2.5D water-column sampling
* motion planning vs path planning
* headless / Colab / solver workflows
* future multi-agent autonomy foundations

### Simulation Sandboxes

Simulation Lab should contain:

* Sampling Process Lab
* Flow Fields Demo
* Coupled Fields Demo
* Uncertainty / Forecast Demo
* Sampling Priority Demo
* Flow-Coupled Sampling Demo
* Motion Planning Demo
* Bathymetric World View
* Headless Bundle Viewer
* Renderer Architecture Preview
* Benchmark Mode previews

### Process Modeling Boundary

CA/grid-process models are teaching tools, not the entire ocean model. The CA literature supports CA as a broad family of discrete dynamical systems with many variants, including asynchronous, stochastic, multi-state, extended-neighborhood, and non-uniform CAs. That makes them valuable for teaching local update rules and emergent behavior, but not sufficient as calibrated hydrodynamics. 

Coastal CA work also supports the idea that CA-type models can be useful in coastal sediment/water transport settings, while showing limitations such as ineffective tidal-current vector simulation in one prototype. 

## 9. Implemented Foundation

### Product Shell

* Full-viewport main menu / product hub
* Challenge Mode, Simulation Lab, Learning Labs
* Contextual Mission Console
* Headless Bundle Viewer
* Planner and Adaptive Benchmark surfaces

### Scientific Runtime

* deterministic and stochastic educational field demos
* flow field diagnostics
* coupled process playground
* uncertainty / forecast demo
* sampling priority and glider action value
* forecast correction vs hidden-event diagnosis
* adaptive mission-manager rationale and handoff
* 2.5D water-column sampling
* depth-layer observations
* dive-profile support
* Node/OceanBox-JS headless runtime
* solver packet / plan / roundtrip workflow

### Current Quality Boundary

The current model is scientifically structured and educational, but it is not a calibrated ocean forecast, production vehicle controller, production data-assimilation system, or MARL training environment.

## 10. Production Release Roadmap

## Milestone A — Integration Checkpoint and Stabilization

**Goal:** Ensure P11, roadmap refactor, and UI-R1 are integrated cleanly.

Tasks:

* run post-P11/UI-R1 integration audit
* classify dirty worktree by phase
* remove temp/probe files
* verify main menu hub launches all major areas
* verify Headless Bundle Viewer loads P11 bundles
* verify water-column summaries remain public-safe
* verify docs do not overclaim
* verify no Python simulator drift
* verify no full 3D planning / MARL claims

Exit criteria:

* full E2E passes or failures are known and unrelated
* P11/H3/H2/H1/H0 representative smokes pass
* roadmap matches active architecture

## Milestone B — Motion-Aware Execution Core

**Phase:** `MOTION-R1 — Glider Motion Dynamics Layer + Motion Planning Sandbox`

**Goal:** Move from waypoint path following toward motion-aware execution.

Tasks:

* add glider motion state
* add control-command schema
* add environment sampler
* add deterministic glider dynamics
* add plan-to-control adapter
* add planned-vs-realized trajectory
* add motion diagnostics
* add Motion Planning Demo
* add headless motionTrajectory / controlTrace / motionDiagnostics
* add roundtrip motion summaries

Key distinction:

```text
planned route      what the player/solver intended
realized trajectory what the glider actually did under current/control limits
sampled path       where observations were actually collected
```

This should be implemented before WebGPU fluid coupling. WebGPU-Ocean is promising because MLS-MPM can support large real-time fluid simulations and screen-space fluid rendering gives appealing real-time visualization, but it should remain an optional future visual/physics layer, not the canonical mission engine yet. 

Exit criteria:

* Motion Planning Demo exists
* headless runtime optionally emits motion traces
* no new route planner added
* replay/export can distinguish planned vs realized vs sampled paths

## Milestone C — Renderer Boundary and 3D Environmental View

**Phase:** `GFX-ARCH-R1 — Renderer Boundary and Three.js/WebGPU Strategy`

**Goal:** Prepare ANCHOR for richer 3D rendering without abandoning Phaser prematurely.

Tasks:

* keep Phaser as app shell
* add renderer capability model
* add renderer host contract
* add ocean-world render view model
* document WebGPU as progressive enhancement
* do not add WebGPU-Ocean yet
* do not add Three.js unless deliberately approved

Then:

**Phase:** `ENV-R1 — 3D Bathymetric World View with Toggleable Depth Layers`

Tasks:

* bathymetry schema
* synthetic bathymetry field
* bottom surface
* water surface
* toggleable surface / thermocline / deep layers
* surface waypoints
* subsurface sampling points
* dive-profile paths
* current/priority overlays
* camera pan/zoom/rotate/pitch
* public-safe bathymetry summary in bundles

Exit criteria:

* player can inspect ocean as a layered 3D bathymetric mission space
* top-down planning remains available
* 3D view does not own scoring/planning/simulation authority

## Milestone D — Headless Replay and Browser Replay Alignment

**Phase:** `H4 — Headless Replay / Browser Replay Alignment`

**Goal:** Make Node/OceanBox-JS bundles replay cleanly in browser ANCHOR.

Tasks:

* replay schema normalization
* timeline playback for headless episodes
* planned vs realized vs sampled overlays
* water-column depth playback
* science diagnosis timeline
* motion diagnostics timeline
* adaptive objective history replay
* roundtrip report replay
* browser summary export

Exit criteria:

* a headless run can be loaded into browser and replayed
* browser replay matches the bundle records
* hidden truth stays protected unless oracle/debug mode is explicit

## Milestone E — Blind Discovery / Hidden-State Mode

**Phase:** `GAME-R1 — Blind Discovery / Hidden-State Gameplay`

**Goal:** Make the most game-like information-access mode real.

Rules:

* no full field visibility at start
* player receives only sampled snapshots
* belief map grows from observations
* uncertainty evolves with staleness and coverage
* hidden-event hypotheses are discovered through coherent surprise
* mission-manager recommendations respond to evidence

Tasks:

* blind mission config
* observation-only UI
* belief-map initialization
* hidden-state tutorial mission
* blind discovery scoring
* debrief explaining missed discoveries and belief errors

Exit criteria:

* player can complete a mission with no initial field visibility
* game teaches observation, inference, and uncertainty
* hidden truth remains inaccessible until debrief or oracle mode

## Milestone F — Production Mission Scoring Synthesis

**Phase:** `SCORE-R1 — Mission Scoring and Regret Model Consolidation`

**Goal:** Consolidate educational score components into a coherent production scoring model.

Score components:

* science value collected
* uncertainty reduction
* forecast validation
* hidden-event confirmation
* source localization
* boundary/front mapping
* vertical coverage
* energy used
* current opposition
* hazard exposure
* redundancy penalty
* missed opportunity / regret
* surfacing / communication cost
* route feasibility

Important boundary:

Headless score can remain educational. Browser official scoring must be explicit, stable, and documented.

Exit criteria:

* scoring shown consistently in debrief
* score components are explainable
* benchmark comparisons are fair
* oracle/debug scores are labeled separately

## Milestone G — Multi-Glider Cooperative Sampling

**Phase:** `P12 — Multi-Glider Cooperative Sampling and Redundancy-Aware Assignment`

**Goal:** Move beyond one-glider demonstrations.

Tasks:

* multi-glider episode schema
* assignment diagnostics
* redundancy-aware sampling
* communication windows
* surfacing coordination
* collision/spacing constraints
* shared objective scoring
* per-glider contribution debrief
* fleet-level replay
* cooperative coverage missions

This connects naturally to multi-agent environments: agents receive observations, take actions, receive rewards, and interact through a shared environment. The MARL textbook frames multi-agent systems around environment, agents, observations, actions, rewards, and policies; ANCHOR should align with that interface before claiming RL/MARL. 

Exit criteria:

* 2–4 glider missions work
* redundancy penalty works
* assignment debrief is understandable
* no MARL training yet

## Milestone H — Scenario and Campaign Packs

**Phase:** `CONTENT-R1 — Production Scenario Packs`

Core campaign arcs:

1. Tutorial: currents, waypoint planning, sampling value
2. Forecast-Guided Survey
3. Uncertainty Reduction
4. Front Mapping
5. Hidden Bloom Layer
6. River Plume Discovery
7. Deep Plume / Source Localization
8. Blind Discovery Mission
9. Adaptive Multi-Leg Mission
10. Multi-Glider Cooperative Coverage

Each scenario should include:

* objective
* visibility mode
* environment
* mission constraints
* scoring weights
* tutorial hints
* replay/debrief expectations
* benchmark seed

Exit criteria:

* playable campaign path exists
* classroom assignments can reference fixed seeds
* tutorial leads into serious challenge mode

## Milestone I — Learning Labs Course Map

**Phase:** `UI-R2 / L-R1 — Learning Labs + Sandbox Cross-Linking`

**Goal:** Make the learning content feel like a course.

Learning map:

* Scientific Computational Modeling
* CA/Grid-Process Foundations
* Ocean Process Analogs
* Forecast, Belief, and Uncertainty
* Sampling Priority and Acquisition
* Glider Action Value
* 2.5D Water Column
* Forecast Correction vs Hidden Discovery
* Motion Planning vs Path Planning
* Benchmark Modes
* Headless / Colab Workflow
* Future Full Autonomy / MARL Foundations

Exit criteria:

* each lab links to companion sandbox
* each sandbox links back to lesson
* course order is clear
* beginner/intermediate/advanced labels exist

## Milestone J — WebGPU / Fluid Simulation Feasibility

**Phase:** `GFX-R1 — WebGPU Fluid Motion Coupling Feasibility Spike`

**Goal:** Evaluate WebGPU fluid simulation as optional high-fidelity visualization/motion provider.

Tasks:

* feature detection
* no dependency on WebGPU for normal play
* no TypeScript/Vite migration unless deliberately accepted
* study WebGPU-Ocean concepts
* isolate prototype outside core scoring
* compare simple vector-field motion vs fluid-coupled motion
* export reduced velocity/trajectory summaries if useful

Use WebGPU-Ocean as a reference, not as the canonical engine. Its WebGPU MLS-MPM and screen-space fluid rendering make it valuable for future fluid visualization, but ANCHOR’s production engine still needs determinism, headless replay, solver-packet fairness, and fallback support. 

Exit criteria:

* feasibility report
* prototype sandbox if safe
* clear go/no-go decision for deeper integration

## Milestone K — Full Autonomy Environment Contract

**Phase:** `AUTO-R1 — Full Autonomy Benchmark Environment Interface`

**Goal:** Prepare the environment for learning agents without implementing training yet.

Tasks:

* state schema
* observation schema
* action schema
* reward schema
* episode schema
* reset/step API
* centralized-training metadata
* decentralized-execution metadata
* common-reward and individual-reward options
* benchmark packs

Exit criteria:

* environment loop exists
* no training algorithms required
* Node headless can run episodes
* browser can replay episodes
* MARL docs label it as future research

## Milestone L — Production Hardening

**Phase:** `RELEASE-R1 — Production QA and Release Candidate`

Tasks:

* smoke suite consolidation
* fixture size audit
* public-hidden visibility audit
* accessibility pass
* keyboard navigation
* responsive layout polish
* scenario loading robustness
* export/import compatibility matrix
* replay compatibility matrix
* performance budget
* docs freeze
* tutorial QA
* release notes
* known limitations

Exit criteria:

* release candidate tag
* full E2E stable
* all public examples load
* no hidden-truth leaks
* no stale docs claims
* production README complete

## 11. Medium-Term Research Tracks

These are not production-release blockers but should remain aligned:

* bathymetry-informed flow constraints
* coastal source routing
* advanced stochastic process models
* Gaussian-process / GMRF educational approximations
* imported external model fields
* WebGPU fluid visualization
* multi-agent coordination benchmarks
* centralized training / decentralized execution environment wrappers
* optional backend leaderboard
* classroom analytics

## 12. Non-Goals and Boundaries

Current non-goals:

* no Python simulator reimplementation
* no required backend for normal play
* no React/TypeScript migration requirement
* no in-browser arbitrary solver-code execution
* no claim that synthetic currents are validated HYCOM/ROMS/CFD forecasts
* no production data assimilation claim
* no GP/GMRF production inference claim
* no full 3D route planning yet
* no MARL/RL training implementation yet
* no WebGPU requirement for normal play
* no headless score replacement for browser official scoring
* no hidden truth in fair solver packets
* no multiplayer/account system in the static release

## 13. Recommended Immediate Sequence

The next production-oriented sequence should be:

```text
0. INTEGRATION-R2
   Stabilize P11 + ROADMAP + UI-R1.

1. MOTION-R1
   Add deterministic motion dynamics and Motion Planning Demo.

2. GFX-ARCH-R1
   Add renderer boundary and WebGPU/Three strategy.

3. ENV-R1
   Add 3D bathymetric world view with toggleable depth layers.

4. H4
   Align headless replay with browser replay.

5. GAME-R1
   Implement Blind Discovery / Hidden-State Mode.

6. SCORE-R1
   Consolidate production scoring and regret.

7. P12
   Add multi-glider cooperative sampling.

8. CONTENT-R1
   Build production scenario/campaign packs.

9. L-R1
   Build Learning Labs course map.

10. RELEASE-R1
   QA, docs freeze, release candidate.
```

## 14. Production Release Definition

ANCHOR is production-ready when:

* a new user can launch the browser app and understand the three main entry points
* Challenge Mode has a complete playable campaign
* Simulation Lab has coherent scientific sandboxes
* Learning Labs form a course-like path
* Planner and Adaptive Benchmarks are stable
* Blind Discovery mode is playable
* Node/OceanBox-JS can generate and validate bundles
* browser can replay headless results
* solver packet / plan / roundtrip workflow works
* public artifacts do not leak hidden truth
* 2.5D water-column and motion dynamics are represented in debrief
* docs clearly separate implemented features from research tracks
* full E2E and smoke suite pass reliably
* known limitations are honest and visible

## 15. Roadmap Reading Guide

Use:

* `ROADMAP.md` for strategic direction
* `docs/development_versions.md` for current development history
* feature docs for implemented details
* smoke tests and E2E results to verify what is actually implemented
* headless fixtures to test browser/Node/Colab compatibility

Future roadmap items should not be treated as implemented until they have docs, smoke tests, E2E or equivalent validation, and visible product integration.
