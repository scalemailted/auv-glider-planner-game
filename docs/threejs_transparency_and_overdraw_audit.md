# Three.js Transparency and Overdraw Audit

THREE-R1.2A.4.4 audits the production Three.js mission renderer before the bathymetry mesh phase. The goal is to reduce WebGL presentation cost without changing canonical planning, simulation, sampling, scoring, replay, or scientific-field semantics.

## Default Balanced Policy

Balanced mode renders one active textured operational depth slab and represents other visible depth layers as low-cost context outlines. `Show Field on All Layers` is still available as an explicit higher-cost teaching view.

| Layer | Full-domain | Transparent | Textured | Default visibility | Required? |
|---|---:|---:|---:|---:|---:|
| Bathymetry / land mask | yes | no | no | visible | yes |
| Water surface / frame | yes | yes | no | visible | yes |
| Active scalar slab | yes | yes | yes | visible | yes |
| Context depth slabs | yes | yes | no | visible as outline/grid | yes |
| Integrated water column | yes | yes | no by default | context only | optional |
| Planned/realized paths | no | yes | no | visible | yes |
| Gliders | no | mixed | no | visible | yes |
| Sampling targets / observations | no | mixed | no | visible | yes |
| Labels / selection | no | yes | no | visible when relevant | yes |

## Findings

The most expensive avoidable surfaces were duplicate full-domain transparent scalar planes on inactive depth layers and the integrated layer. THREE-R1.2A.4.4 keeps the active field readable while replacing inactive field planes with shared outline/grid context materials in Balanced and Performance modes.

Material order is centralized by `THREE_MATERIAL_RENDER_ORDER_POLICY`: terrain, water frame, context slabs, active scalar slab, paths, gliders, targets/observations, labels/selection. Context slabs use `depthWrite=false` and `depthTest=true` so paths and mission objects remain readable without severe z-fighting.

Debug counters now expose transparent object count, full-domain transparent plane count, full-domain textured plane count, active textured slab count, and context outline slab count. Human manual QA by the project owner remains pending.
