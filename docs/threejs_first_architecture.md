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
