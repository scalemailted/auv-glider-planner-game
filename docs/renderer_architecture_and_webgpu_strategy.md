# Renderer Architecture and WebGPU Strategy

GFX-ARCH-R1 keeps Phaser as the browser app/game shell while creating a renderer boundary for future environmental rendering.

## Decision

ANCHOR should not abandon Phaser wholesale right now. Phaser continues to own product navigation, scene routing, HUD/panel orchestration, existing 2D demos, challenge flow, planning flow, simulation, debrief, benchmark surfaces, and the static-hosted app shell.

ANCHOR should step away from Phaser-only environmental rendering over time. A future dedicated renderer layer can consume public-safe view models for bathymetry, water surface, depth layers, planned paths, realized trajectories, dive profiles, sampling points, flow overlays, and motion diagnostics.

The architecture is:

```text
portable JS core state
-> renderer view model
-> Phaser / Canvas2D / WebGL / future Three.js or WebGPU renderer
```

## Renderer Boundary

The renderer boundary is implemented as pure JavaScript contracts under `src/core/rendering/`:

- `RendererCapabilityModel.js` detects or simulates renderer capabilities without requiring DOM access in Node tests.
- `RendererHostContract.js` defines renderer host and scene-descriptor contracts.
- `OceanWorldRenderViewModel.js` builds compact public-safe ocean-world summaries for rendering.
- `src/ui/rendering/RendererHostPanel.js` renders a browser panel explaining the boundary.
- `RendererArchitecturePreviewScene.js` is a Phaser Simulation Lab preview of the architecture, not a final 3D scene.

Renderer modules consume view models. They do not own simulation state, scoring, route planning, benchmark records, hidden truth, Python simulation, or MARL/RL.

## Phaser As Shell

Phaser remains useful because it already carries stable app infrastructure: scene lifecycle, product hub routing, game viewport, pointer interactions, panels, challenge/planning/debrief flow, benchmark surfaces, and E2E coverage.

The safer future pattern is a separate renderer canvas or layer for 3D environmental visualization, coordinated through shared app state and public render view models. Direct raw WebGL/WebGPU manipulation inside Phaser's renderer state is intentionally not part of GFX-ARCH-R1.

## Three.js / WebGL / WebGPU

A future 3D renderer is justified for the 2.5D water-column and motion stack. It should eventually visualize:

- bathymetry and seafloor summaries
- water surface
- surface, thermocline, and deep layers
- surface waypoints and subsurface sampling points
- planned path and realized trajectory
- dive profile path
- flow overlays and motion diagnostics

Three.js/WebGL is the practical first candidate for a future 3D scene because WebGL availability is broader than WebGPU. WebGPU should be treated as progressive enhancement, not a requirement.

## WebGPU-Ocean Boundary

WebGPU-Ocean-style fluid work is a future visualization or sandbox reference. It is not the current canonical mission engine.

The canonical mission state remains portable JavaScript data: x/y/depth/time, current vectors, observations, belief, uncertainty, priority, glider state, control trace, realized trajectory, and science diagnostics. Node/OceanBox-JS remains the canonical non-browser runtime for deterministic headless execution and bundle artifacts.

## Claim Boundary

GFX-ARCH-R1 does not add Three.js, WebGPU, WebGPU-Ocean, fluid simulation, full 3D route planning, a new planner, scoring changes, a Python simulator, MARL/RL, or calibrated ocean forecasting.

The Renderer Architecture Preview is an inspection scaffold. It confirms the intended boundary and exposes `globalThis.ANCHOR_RENDERER_ARCH_DEBUG` so tests can verify that Phaser shell remains active and renderer code does not own simulation, scoring, planning, WebGPU fluid simulation, or MARL/RL.

## Validation

Focused checks:

```bash
node tools/js/smoke_renderer_capability_model.mjs
node tools/js/smoke_renderer_host_contract.mjs
node tools/js/smoke_ocean_world_render_view_model.mjs
node tools/js/smoke_renderer_architecture_preview_scene.mjs
node tools/js/smoke_model_stack_integration.mjs
```