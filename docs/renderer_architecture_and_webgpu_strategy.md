# Renderer Architecture and WebGPU Strategy

GFX-ARCH-R1 keeps Phaser as the browser app/game shell while creating a renderer boundary for environmental rendering. GFX-R2 applies that boundary with a dedicated Three.js/WebGL bathymetric world renderer.

## Decision

ANCHOR should not abandon Phaser wholesale right now. Phaser continues to own product navigation, scene routing, HUD/panel orchestration, existing 2D demos, challenge flow, planning flow, simulation, debrief, benchmark surfaces, and the static-hosted app shell.

ANCHOR should step away from Phaser-only environmental rendering for richer ocean-world views. Dedicated renderer layers consume public-safe view models for bathymetry, water surface, depth layers, planned paths, realized trajectories, dive profiles, sampling points, flow overlays, and motion diagnostics.

The architecture is:

```text
portable JS core state
-> renderer view model
-> Phaser shell hosts Canvas2D / Three.js WebGL / future WebGPU renderer
```

## Renderer Boundary

The renderer boundary is implemented as JavaScript contracts under `src/core/rendering/` and scene-specific adapters:

- `RendererCapabilityModel.js` detects or simulates renderer capabilities without requiring DOM access in Node tests.
- `RendererHostContract.js` defines renderer host and scene-descriptor contracts.
- `OceanWorldRenderViewModel.js` builds compact public-safe ocean-world summaries for rendering.
- `BathymetryWorldRenderViewModel.js` builds the GFX-R2 terrain, route, layer, sampling, and flow view model for the Three.js bathymetry scene.
- `src/game/three/ThreeBathymetryRenderer.js` renders that view model with Three.js/WebGL.
- `src/ui/rendering/RendererHostPanel.js` renders a browser panel explaining the boundary.
- `RendererArchitecturePreviewScene.js` is a Phaser Simulation Lab preview of the architecture.

Renderer modules consume view models. They do not own simulation state, scoring, route planning, benchmark records, hidden truth, Python simulation, or MARL/RL.

## Phaser As Shell

Phaser remains useful because it already carries stable app infrastructure: scene lifecycle, product hub routing, game viewport, pointer interactions, panels, challenge/planning/debrief flow, benchmark surfaces, and E2E coverage.

The current pattern is a separate renderer canvas layered in the app viewport and coordinated through shared app state and public render view models. Direct raw WebGL/WebGPU manipulation inside Phaser's renderer state is intentionally avoided.

## Three.js / WebGL / WebGPU

GFX-R2 adds Three.js as a normal npm dependency and uses WebGL for the active Bathymetric World View. Three.js is the practical first dedicated 3D renderer because WebGL availability is broader than WebGPU and it works with static hosting after dependencies are installed.

WebGPU should be treated as progressive enhancement, not a requirement. Future WebGPU work should plug into the same renderer/view-model boundary and keep browser scoring, Node/OceanBox-JS replay, and hidden-truth visibility rules unchanged.

## Enable3D Boundary

Enable3D is not used. The bathymetry view needs scene graph rendering, camera control, lines, transparent layers, and mesh materials; it does not need a Phaser physics wrapper or an additional framework between Phaser and Three.js.

## WebGPU-Ocean Boundary

WebGPU-Ocean-style fluid work is a future visualization or sandbox reference. It is not the current canonical mission engine and is not imported by the active bathymetry renderer.

The canonical mission state remains portable JavaScript data: x/y/depth/time, current vectors, observations, belief, uncertainty, priority, glider state, control trace, realized trajectory, and science diagnostics. Node/OceanBox-JS remains the canonical non-browser runtime for deterministic headless execution and bundle artifacts.

## Claim Boundary

GFX-R2 adds a Three.js renderer only. It does not add WebGPU, WebGPU-Ocean, fluid simulation, full 3D route planning, a new planner, scoring changes, a Python simulator, MARL/RL, calibrated bathymetric survey data, or calibrated ocean forecasting.

The renderer architecture remains an inspection boundary. Tests verify that Phaser shell remains active and renderer code does not own simulation, scoring, planning, WebGPU fluid simulation, or MARL/RL.

## Validation

Focused checks:

```bash
node tools/js/smoke_renderer_capability_model.mjs
node tools/js/smoke_renderer_host_contract.mjs
node tools/js/smoke_ocean_world_render_view_model.mjs
node tools/js/smoke_renderer_architecture_preview_scene.mjs
node tools/js/smoke_bathymetry_world_render_view_model.mjs
node tools/js/smoke_three_bathymetry_renderer_contract.mjs
node tools/js/smoke_bathymetry_visual_quality_contract.mjs
node tools/js/smoke_bathymetry_three_scene.mjs
node tools/js/audit_bathymetry_renderer_boundaries.mjs
node tools/js/smoke_model_stack_integration.mjs
```