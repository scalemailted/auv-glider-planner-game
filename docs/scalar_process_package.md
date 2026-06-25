# Scalar Process Package

`PROCESS-PKG-R1` makes `packages/scalar-processes` the canonical pure JavaScript owner for scalar field artifacts and water-column scalar helpers.

## Ownership

The package owns:

- `ScalarField4D` artifacts for `A(x, y, z, t)` style scalar fields.
- Scalar source metadata and synthetic/non-calibrated claim boundaries.
- Continuous scalar sampling through bilinear, trilinear, and quadrilinear interpolation profiles.
- Water-column scalar field helpers and depth-layer priority collapse diagnostics.
- Pure scalar diagnostics, mass/stat summaries, and manufactured scalar regression fixtures.

The package does not own rendering, route editing, vehicle physics, observation noise, mission score formulas, bathymetry generation, current generation, or teaching-lab process engines.

## Production Boundaries

Existing production imports under `src/core/science/` remain stable through compatibility forwarders:

- `VolumetricFieldSampler.js`
- `WaterColumnSchema.js`
- `WaterColumnFieldModel.js`
- `WaterColumnPriorityModel.js`

Teaching-lab engines remain in `src/core/demo/sampling`, `src/core/demo/coupled`, and related lab UI modules. Those are intentionally not package-owned in this phase.

## Public API

The package entry point exports:

- `createScalarField4D`, `normalizeScalarField4D`, `validateScalarField4D`, `sampleScalarField4D`, `scalarField4DSummary`, `scalarField4DDigest`
- `normalizeScalarSourceMetadata`, `validateScalarSourceMetadata`, `scalarSourceClaimBoundary`
- `computeScalarFieldDiagnostics`, `validateScalarFieldDiagnostics`, `scalarFieldStats`, `scalarFieldMass`
- `sampleScalarFieldContinuous`, `sampleVectorFieldContinuous`, `sampleVolumetricFieldContinuous`
- water-column schema, field, and priority helpers
- manufactured scalar fixtures for deterministic package tests

## Claim Boundary

Package fixtures are deterministic synthetic educational/regression fields. They are not calibrated ocean forecasts, ecological forecasts, operational biogeochemical products, real HYCOM data, or Marine Copernicus data. Three.js and browser UI only visualize scalar fields; they do not create scalar truth.

## Validation

Package validation is part of the normal package gates:

```bash
npm.cmd run audit:packages
npm.cmd run test:packages
```

Focused scalar checks include:

```bash
node tools/js/audit_scalar_package_dependencies.mjs
node tools/js/audit_scalar_package_browser_safety.mjs
node tools/js/audit_scalar_package_worker_safety.mjs
node tools/js/smoke_scalar_package_artifact.mjs
node tools/js/smoke_scalar_package_sampler.mjs
node tools/js/smoke_scalar_package_diagnostics.mjs
node tools/js/smoke_scalar_package_forwarders.mjs
node tools/js/audit_scalar_package_parity.mjs
```

The parity fixture is `tests/fixtures/scalar_package_r1_parity.json`.
