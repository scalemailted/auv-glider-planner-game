# Regional Mission Scale and Resolution

ANCHOR now distinguishes physical mission scale from grid resolution.

## Key Terms

- `operationalDomain`: local physical coordinate domain in meters, including east/north extents, depth range, time base, and source/claim metadata.
- `resolutionProfile`: independent source and display resolutions for planning lattice, terrain grid, science grid, current grid, render LOD, and simulation time.
- `planningLattice`: the player-facing inspection and waypoint grid. It is not the full physical ocean domain.
- `sourceGrid`: a field's own sampling resolution. Bathymetry, science value, and current fields can use different grids.
- `renderLod`: display budget for textures, meshes, and glyphs. It is not simulation authority.

## Default Regional Fixture

The WORLD-R1 regional fixture is an 80 km by 50 km synthetic shelf/basin classroom mission. Its default profile uses:

- planning lattice: 48 by 30
- terrain grid: 193 by 121
- science grid: 96 by 60
- current grid: 64 by 40

Those numbers are independent. A 48 by 30 planning lattice can represent a regional physical domain because each planning cell is an inspection/control abstraction, not a literal one-pixel ocean cell.

## Existing Simulator Compatibility

The active simulator still expects route waypoints and truth/forecast frames on the planning grid. WORLD-R1 preserves that compatibility by keeping `layers.truth.frames[].roi` and `layers.truth.frames[].current` on the planning lattice while storing denser regional source fields under `regionalFields`.

## Synthetic Boundary

The regional fixture is procedural and deterministic by seed. It is useful for teaching scale, field-resolution, fleet-mission duration, and compact export contracts. It is not a calibrated forecast, real survey, or operational ocean product.

## Validation

Run the WORLD-R1 checks:

```bash
node tools/js/smoke_operational_domain_spec.mjs
node tools/js/smoke_mission_resolution_profiles.mjs
node tools/js/smoke_operational_domain_coordinates.mjs
node tools/js/smoke_physical_mission_scale.mjs
node tools/js/smoke_multiresolution_field_sampler.mjs
node tools/js/smoke_resolution_invariant_science.mjs
node tools/js/smoke_regional_mission_defaults.mjs
node tools/js/smoke_regional_fleet_balance.mjs
node tools/js/audit_no_per_cell_regional_three_objects.mjs
node tools/js/audit_operational_domain_authority_boundaries.mjs
node tools/js/audit_regional_export_compactness.mjs
node tools/js/audit_regional_browser_headless_parity.mjs
```
