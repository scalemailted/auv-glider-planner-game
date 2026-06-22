# WORLD-R1 Multiscale Operational Domain Audit

WORLD-R1 adds a renderer-neutral world-model contract before THREE-R3B. It does not switch the default runtime, remove Phaser/vendor files, add a planner, add a fluid solver, change scoring, or claim real operational ocean data.

## First Coupling Point

The first coupling point is `level.world.grid`. Before WORLD-R1, this grid acted as:

- route-planning lattice
- terrain and hazard array extent
- scalar ROI/current frame extent
- Three.js world bounds
- pointer hit-test cell frame
- informal physical size proxy

The main examples are `src/core/rendering/MissionWorldCoordinates.js`, `src/core/rendering/MissionWorldRenderViewModel.js`, and `src/core/rendering/MissionWorldStateAdapter.js`. The legacy behavior is still supported, but WORLD-R1 now names that mode explicitly as a legacy grid-derived domain.

## Added Contract

New renderer-neutral modules live under `src/core/domain/`:

- `OperationalDomainSpec.js`: physical local tangent-plane extents, depth range, time base, and synthetic-data boundary.
- `MissionResolutionProfile.js`: separate planning, terrain, science, current, render-LOD, and simulation-time resolutions.
- `OperationalDomainCoordinates.js`: physical meters <-> UV <-> role-specific source grids <-> Three display coordinates.
- `MissionScaleModel.js`: estimate-only physical distance/time summaries for routes.
- `MultiResolutionFieldSampler.js`: physical-coordinate sampling that delegates interpolation to existing field samplers.

`src/core/science/PhysicalSamplingFootprint.js` records sampling footprint metadata without owning scoring.

## Regional Synthetic Fixture

`src/core/generation/RegionalMissionDefaults.js` creates a synthetic regional shelf/basin teaching mission. The default physical domain is 80 km by 50 km with a decoupled 48 by 30 planning lattice, denser bathymetry/science/current source grids, and compact export metadata.

This fixture is synthetic educational data. It is not a real HYCOM, ROMS, Delft3D, survey, forecast, or operational navigation product.

## Compatibility Boundary

Existing generated challenge levels still load through the old planning grid. If they do not carry `operationalDomain` or `resolutionProfile`, the render view model derives a `legacy-grid-*` domain and `legacyGrid*` profile from `level.world.grid` and `cellSizeMeters`.

The simulator, route validators, scoring, and renderer hit testing continue to use existing canonical grid semantics until a later phase deliberately migrates more systems to physical-coordinate authority.

## Renderer Boundary

Dense regional fields must not become one Three object per source cell. The current scalar, volumetric scalar, and bathymetry terrain paths use textures or buffer geometry. `tools/js/audit_no_per_cell_regional_three_objects.mjs` guards this.

## Claim Boundary

WORLD-R1 claims:

- synthetic regional-scale educational mission domain
- deterministic seeded generation
- browser/headless-compatible JSON metadata
- resolution-decoupled field sampling

WORLD-R1 does not claim:

- calibrated ocean forecast
- real bathymetric survey data
- production vehicle control
- full 3D route planning
- new route optimizer or planner
- scoring redesign
- WebGPU or fluid simulation
