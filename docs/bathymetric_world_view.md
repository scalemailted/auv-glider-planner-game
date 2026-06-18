# Bathymetric World View

GFX-R2 upgrades the ENV-R1 bathymetric world viewer from a Phaser-only proof of concept to a dedicated Three.js/WebGL renderer hosted inside the existing Phaser app shell. GFX-R3A then adds a separate live Mission Planning renderer path that uses `ThreeMissionWorldRenderer` and `MissionWorldRenderViewModel` to show the current mission state inside the planning workspace. Both are browser visualization layers over existing portable JS mission state: x, y, depth layer, time, fields, observations, planned route, realized trajectory, motion diagnostics, and water-column summaries.

## Why This Exists

The tactical mission is still planned from a top-down route, while the science happens in a water column. The Bathymetric World View makes that distinction visible by showing route intent at the surface, subsurface sampling points, depth-layer sheets, currents, and a synthetic seafloor beneath the tactical map.

## Renderer Architecture

Phaser remains the product shell and scene router. `src/game/three/ThreeBathymetryRenderer.js` owns a separate Three.js scene/camera/canvas mounted by `BathymetryWorldViewScene`. The live planning renderer uses `src/game/three/ThreeMissionWorldRenderer.js`, `src/core/rendering/MissionWorldStateAdapter.js`, and `src/core/rendering/MissionWorldRenderViewModel.js` from `MissionWorkspaceScene`. These renderers consume public-safe view models and do not own simulation, scoring, planning, benchmark, replay semantics, or hidden-truth authority modules.

Three.js is used directly. Enable3D is not used because this view does not need a physics wrapper or Phaser-to-Three abstraction. WebGPU-Ocean is not integrated because ANCHOR still needs a static-hosted WebGL path and the current goal is environmental visualization, not a fluid solver.

## 2.5D State vs 3D Visualization

2.5D means the mission remains waypoint and dive-profile based, while the view shows simplified depth layers under the tactical map. The renderer projects that state into an oblique ocean scene. It does not make route planning a free-form 3D problem.

## Synthetic Terrain Scenarios

The viewer includes seeded synthetic scenarios for Coastal Shelf, Shelf Canyon, Island Arc, and Basin + Seamount. These fields include land/coast masks, coastline edges, continental shelf, shelf break, deep basin, canyon or ridge structure, seamount or island features, and bottom hazard zones. They are designed to look like plausible educational ocean terrain, not calibrated survey products.

A future real-data pipeline should ingest public datasets such as GEBCO or ETOPO bathymetry and Natural Earth coastline masks through an explicit data manifest, cache, and attribution path. GFX-R2 does not download or bundle real bathymetry.

## Displayed Geometry

The standalone Three.js view can show synthetic bathymetric terrain, a translucent water surface, surface/thermocline/deep depth-layer planes, surface waypoints, planned route, realized trajectory, sampling points, dive-profile path, flow vectors, coastlines, and bottom-hazard markers. The live Mission Planning Three.js view currently shows terrain, bathymetry, water/depth layers, scalar sample-value fields, current vectors, hazards, constraints, drop zones, gliders, selected starts, waypoints, planned routes, planning markers, selected entities, and active priority targets from the same mission state as the tactical map.

Surface waypoints are route intent. Sampling points show where observations were actually collected. The planned route and realized trajectory are shown separately because motion dynamics can produce drift and track error under currents and control limits.

## Public-Safe View Model

The render view models preserve public-safe fields only. They include mesh or mission-world data, layer visibility, geometry summaries, route and sampling geometry, and explicit boundary flags such as `ownsSimulationState: false`, `ownsScoring: false`, `ownsPlanning: false`, `ownsReplaySemantics: false`, `usesFull3DPlanning: false`, `usesWebGPUFluid: false`, and `usesMARL: false`. See [Three.js Mission Renderer Migration](threejs_mission_renderer_migration.md) for the live planning parity inventory.

## Currents Boundary

Terrain-flow accumulation is not ocean current. Ocean current remains `F(x,y,z,t)`. Bathymetry provides environmental context and constraints; it is not a hydrodynamic current solver and does not turn terrain slope into the mission current model.

## What GFX-R2 Does Not Implement

GFX-R2 does not add full 3D route planning, a new planner, route optimization, A*, Dijkstra, RRT, MPC, RL, MARL, production hydrodynamics, calibrated bathymetric survey data, production navigation charts, WebGPU fluid simulation, a Python simulator, backend services, or scoring changes.

## Headless Bundles

Node/OceanBox-JS remains the canonical non-browser runtime. Headless bundles may include public-safe `bathymetrySummary` and `missionGeometrySummary` artifacts. These summaries are environmental and geometric metadata; they do not expose hidden truth arrays and do not replace browser official scoring.