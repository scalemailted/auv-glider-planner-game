# Bathymetric World View

ENV-R1 adds a first bathymetric world viewer for ANCHOR's 2.5D AUV/glider mission model. It is a browser visualization layer over existing portable JS mission state: x, y, depthLayer, time, fields, observations, planned route, realized trajectory, motion diagnostics, and water-column summaries.

## Why This Exists

The tactical mission can still be planned from a top-down route, while the science happens in a water column. The Bathymetric World View makes that distinction visible by showing route intent at the surface, subsurface sampling points, depth-layer sheets, and a synthetic seafloor beneath the tactical map.

## 2.5D State vs 3D Visualization

2.5D means the mission remains waypoint/dive-profile based, while the view shows simplified depth layers under the tactical map. The viewer projects that state into an oblique layered ocean scene. It does not make route planning a free-form 3D problem.

## Bathymetry vs Water Column

Bathymetry is environmental geometry. It does not replace the 2.5D water-column model. The bottom surface gives context for shelves, canyon-like features, shallow areas, and deep basin structure. The water-column state still owns depth layers, observations, priorities, belief/uncertainty summaries, and sampling interpretation.

## Displayed Geometry

The ENV-R1 viewer can show a synthetic bathymetric bottom surface, semi-transparent water surface, surface/thermocline/deep depth-layer planes, surface waypoints, planned route, realized trajectory, sampling points, and a dive-profile path.

Surface waypoints are route intent. Sampling points show where observations were actually collected. The planned route and realized trajectory are shown separately because MOTION-R1 dynamics can produce drift and track error under currents and control limits.

## Currents Boundary

Terrain-flow accumulation is not ocean current. Ocean current remains F(x,y,z,t). Bathymetry provides environmental context and constraints; it is not a hydrodynamic current solver.

## Future WebGPU Relationship

ENV-R1 uses the renderer boundary from GFX-ARCH-R1 and keeps Phaser as the app shell. If future Three.js or WebGPU work is added, it should consume the same public-safe view models. ENV-R1 ships no WebGPU-Ocean, SWE, RichDEM, external DEM, or WebGPU fluid-simulation dependency.

## What ENV-R1 Does Not Implement

ENV-R1 does not add full 3D route planning, a new planner, route optimization, A*, Dijkstra, RRT, MPC, RL, MARL, production hydrodynamics, calibrated bathymetric survey data, production navigation charts, a Python simulator, backend services, or scoring changes.

## Headless Bundles

Node/OceanBox-JS remains the canonical non-browser runtime. Headless bundles may include public-safe `bathymetrySummary` and `missionGeometrySummary` artifacts. These summaries are environmental and geometric metadata; they do not expose hidden truth arrays and do not replace browser official scoring.