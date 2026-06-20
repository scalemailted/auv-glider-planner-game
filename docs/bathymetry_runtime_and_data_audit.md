# Bathymetry Runtime and Data Audit

Phase: THREE-R1.2B

## Summary

ANCHOR now treats bathymetry as a portable core field first and a Three.js mesh second. The renderer consumes a derived surface/mesh contract; it does not own terrain depth, collision, route validity, sampling validity, dive feasibility, scoring, or replay semantics.

| Concern | Canonical owner | Demo implementation | Production implementation | Required convergence |
| ------- | --------------- | ------------------- | ------------------------- | -------------------- |
| Bottom-depth sign convention | Core bathymetry field and samplers | Positive meters downward, converted to negative render Y | Positive meters downward, converted to negative render Y | Keep positive-down depth in all JSON/core APIs |
| Land representation | `landMask` / terrain layer in core level data | Land mask plus display-only elevation cap | Land mask plus display-only landmass layer | Route blocking remains mask-based |
| Land elevation availability | Optional display metadata only | Synthetic cap if no elevation field exists | Synthetic cap if no elevation field exists | Never feed display elevation back into simulation |
| Water/land mask convention | `true`/`land` means land, depth <= 0 means land fallback | Same | Same | Maintain compatibility with legacy `layers.terrain` |
| Coastline convention | Boundary between land/water cells | Extracted deterministic segments | Extracted deterministic segments | Shared `CoastlineGeometry` |
| Field row/column orientation | Row-major `[y][x]` | Same | Same | No row flip in core contracts |
| Vertex/cell-center convention | Cell-center grid values | Mesh vertices at canonical cell centers | Mesh vertices at canonical cell centers | No new half-cell offset |
| Horizontal coordinate extent | Continuous grid coordinates | Local centered display transform | Mission coordinate transform | Document display transform separately |
| Vertical exaggeration | Presentation setting only | Mesh Y scale only | Mesh Y scale only | Does not change canonical depth |
| Physical vs exploded depth | Core depth stays physical | Display can exaggerate | Display can exaggerate/explode slabs | Canonical digests unchanged |
| Current visual bottom geometry | Previously demo-local mesh conversion | Shared `BathymetryMeshGeometry` | Shared `BathymetryMeshGeometry` | Keep shared layer |
| Bathymetric World View geometry | Demo scene | Shared terrain/land/coast/contour layers | Shared terrain/land/coast/contour layers | Continue removing duplicate mesh code |
| Production Planning geometry | Old per-cell boxes | Not applicable | One indexed mesh plus shared layers | Keep bathymetry dirty-gated |
| Production Simulation geometry | Old per-cell boxes | Not applicable | Same terrain contract as Planning | No simulation-state ownership |
| Route-clearance sampler | Portable planning/science core | Visual only | Visual only | Never raycast Three mesh for route validity |
| Sampling-target bottom checks | Core bathymetry sample | Demo visual only | Placement rejects land/below-bottom with core sample | Expand warnings in THREE-R1.2C |
| Slab seabed masks | Operational depth layer model | Partial display mask | Invalid cells transparent; masks from core | Future contour-clipped slab geometry can improve outlines |

## Findings

- Duplicate terrain generation remains only as compatibility helper code in `BathymetryFieldModel.bathymetryToTerrainMeshData()` and legacy helper functions in `ThreeBathymetryRenderer.js`. Production mission rendering no longer uses per-cell bathymetry boxes.
- Duplicate coordinate transforms are now bounded: mesh contracts accept mission coordinate transforms; Bathymetric World View still has its own camera controls but consumes the same mesh/segment contracts.
- No operational bathymetry source is claimed. Current data is deterministic synthetic educational terrain.
- No Three.js terrain raycast is used for collision, route validity, dive feasibility, sampling validity, or score.

## Required Later Cleanup

- Remove or deprecate legacy `bathymetryToTerrainMeshData()` after all existing tests and docs consume `BathymetryMeshGeometry`.
- Replace full rectangular context slab outlines with mask-following outline geometry if the visual distinction is still insufficient.
- Expand browser E2E to assert visible terrain relief with screenshots after owner manual QA feedback.
