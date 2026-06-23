# WebGPU Current Backend Roadmap

FLOW-R2A implements only the current-cube contract and WebGL/Three instanced glyph presentation.

Roadmap:

- FLOW-R2A: canonical current cube and instanced slab vectors
- FLOW-R2B: display-only tracers, pathlines, stream ribbons, and route-current inspection
- DATA-R1: checked-in NetCDF-derived fixture pipeline
- FLOW-R3: optional WebGPU compute backend for tracer/pathline advection
- FLUID-R1: optional bounded local WebGPU fluid perturbation research layer

WebGPU compute does not replace the regional current authority. MLS-MPM and SPH are not HYCOM, not Marine Copernicus, and not substitutes for a regional forecast product. Any future local perturbation must be optional, bounded, and explicitly sourced.

## FLOW-R2A.3 Boundary

Future WebGPU backends may accelerate instanced glyphs or tracer/pathline advection. They do not replace `OceanCurrentField4D` as the regional current authority, and future fluid perturbations must be optional, bounded, separately labelled, and explicitly composited.
