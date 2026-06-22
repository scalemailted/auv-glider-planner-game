# Three.js First Mission Architecture

MIG-R1 changes ANCHOR's production mission target from an optional Three.js view to a Three.js-first mission environment.

| Concern | Current owner |
| --- | --- |
| Mission planning world | Three.js mission renderer by default |
| Live simulation world | Three.js mission renderer from simulation render view models |
| Planning mutations | Canonical Mission Workspace commands |
| Simulation time, motion, observations, and scoring | Portable simulation/scoring modules |
| Mission lifecycle and scene routing | Transitional Phaser shell, targeted for MIG-R2 extraction |
| Legacy tactical map | Developer-only diagnostic fallback enabled with `?legacyPhaser=1` |
| Static deployment | Checked-in `vendor/three/` runtime through `index.html` import map |

Three.js must remain a renderer and interaction surface over canonical state. It must not own route optimization, scoring, replay semantics, hidden truth, Python simulation, WebGPU fluid simulation, RL, or MARL.

## Debug Objects

- `ANCHOR_MIGRATION_DEBUG` reports architecture target, active backends, and legacy fallback state.
- `ANCHOR_MISSION_RENDER_DEBUG` reports planning backend, object counts, interaction state, and renderer boundary flags.
- `ANCHOR_SIMULATION_RENDER_DEBUG` reports simulation backend, live trajectory/observation/event counts, object/resource counts, and boundary flags.

## Legacy Phaser Policy

Use `?legacyPhaser=1` only for diagnostics while retiring old tactical-map dependencies. New mission features should target portable core modules plus Three.js render/view-model adapters. Phaser may continue to host lab scenes and transitional routing until MIG-R2 extracts mission lifecycle and routing.

## Bathymetry Authority Boundary

Three.js terrain layers are presentation adapters over core bathymetry contracts. They must not raycast the visual mesh to determine collision, dive feasibility, sampling validity, route validity, score, or replay state.

## THREE-R1.2B.1 Terrain Contract Note

One shared terrain contract serves all active Three mission views. The terrain mesh is a display projection of canonical bathymetry. Production no longer uses boxed/per-cell terrain. Retained legacy terrain helpers are compatibility-only and not production. Terrain quality affects presentation only. Headed performance is the authoritative render-cost gate. Human manual QA remains separate from headed automated QA.

## THREE-R2B Mission Editor Contract

The Mission Editor now uses the shared Three.js mission-world surface for normal editor presentation, but existing level/challenge schemas remain authoritative. The editor mutates canonical documents through portable editor commands, validates through portable editor validators, and exports canonical level/challenge data rather than renderer state.

Three.js owns editor presentation, camera state, hover/selection display, and pointer-intent collection only. It does not own editor documents, terrain truth, validation, scoring, planning, Simulation physics, replay semantics, or hidden truth. Preview uses the normal production mission lifecycle, and normal Planning, Simulation, Replay, and Editor worlds use Three.js. Phaser remains required for lifecycle and Learning Labs during R2B; final Phaser dependency removal is deferred to R3.

The editor does not introduce arbitrary XYZ navigation planning, a planner/optimizer, WebGPU, fluid simulation, RL/MARL, or operationally calibrated terrain or ocean data claims.

## THREE-R3A Gated Shell Baseline

`index.html` still loads `src/game/main.js`. That module now selects a runtime: default imports `src/game/phaser/PhaserProductionBootstrap.js`, while `?runtimeShell=next` imports `src/app/production/AnchorProductionBootstrap.js`. The next shell publishes `ANCHOR_RUNTIME_SELECTION_DEBUG`, `ANCHOR_PRODUCTION_SHELL_DEBUG`, `ANCHOR_ACCESSIBILITY_DEBUG`, and `ANCHOR_LIFECYCLE_PARITY_DEBUG`.

Default runtime behavior is unchanged for normal users. The next shell must not instantiate Phaser for production mission routes. Learning Labs remain a lazy legacy island until R3B.
