# Continuous Bathymetric Terrain

THREE-R1.2B adds a continuous bathymetric seabed mesh, coastline geometry, landmass display, and contour lines to the Three.js mission view.

## Authority Chain

```text
canonical bottom-depth field
  -> continuous bathymetry sampler
  -> BathymetrySurfaceViewModel
  -> BathymetryMeshGeometry
  -> Three.js terrain / land / coastline / contour layers
```

The visual mesh is not authoritative. Simulation, route validation, dive feasibility, bottom clearance, sampling validity, scoring, result export, replay, and headless runtime checks continue to use portable JavaScript core data and samplers.

## Coordinate Convention

- Bathymetry grids are row-major `[y][x]`.
- `x`/column increases east/right.
- `y`/row increases south/down.
- Depth is positive downward in meters.
- Render world Y is positive upward, so water depth maps to negative world Y.
- Mesh vertices are placed at canonical bathymetry cell centers.
- Vertical exaggeration changes presentation only; it does not change canonical bottom depth.

## Terrain Language

The deterministic synthetic terrain can include land coast, island, continental shelf, shelf break, slope, basin, canyon, ridge, seamount, shallow bank, and local bottom hazards. These are educational features generated from local rules, not calibrated survey products.

Terrain color is bathymetry/topography only. Science value, hazards, route status, and observations use separate visual layers.

## Boundaries

- Surface waypoints remain water-surface navigation targets.
- Sampling targets remain non-executable science objectives.
- Bathymetry constrains dive feasibility through the portable core.
- The renderer does not add arbitrary XYZ route planning.
- The renderer does not add WebGPU, a fluid solver, hydrodynamic calibration, or operational ocean claims.

## THREE-R1.2B.1 Integration Closure

Scenario Start, Planning, Simulation, and Bathymetric World View now expose shared terrain debug fields: `terrainSourceDigest`, `terrainMeshDigest`, `terrainCoordinateProfileId`, `terrainLayerImplementationId`, `usesSharedTerrainLayer`, and `usesLegacyTerrainLayer`.

Expected active state:

```text
usesSharedTerrainLayer: true
usesLegacyTerrainLayer: false
```

The compatibility helper `bathymetryToTerrainMeshData()` is not a production terrain path. Production terrain uses `BathymetrySurfaceViewModel`, `BathymetryMeshGeometry`, and the shared Three terrain layer family.

## Terrain-Aware Validation Boundary

THREE-R1.2C consumes the same canonical bathymetry field for mission validation. The visual seabed mesh, landmass, coastline, and contours are display projections only. Bottom-clearance, surface-waypoint validity, route-segment validity, sampling-target validity, and mission readiness come from portable core modules.
