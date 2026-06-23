# Homegrown Environment Scientific Baseline

SCI-VALID-R1 audits the current homegrown environmental stack as deterministic software and educational synthetic science, not as an oceanographic validation claim.

## Scope

This pass covers:

- packaged bathymetry artifacts and samplers
- production synthetic bathymetry ensemble statistics
- manufactured current fixtures and production 4D current diagnostics
- manufactured scalar-process fixtures and volumetric interpolation
- mission/environment coupling at the sampler and observation-contract level
- benchmark suitability and shortcut detection

It does not retune generators, replace field models, add dependencies, import external data, change mission scoring, change glider physics, or change rendering.

## Claim Boundary

All default generated environment fields remain synthetic educational fixtures. They can be used for deterministic regression tests, sampler correctness tests, package-boundary checks, and browser/headless roundtrip checks. They are not calibrated bathymetry products, not operational ocean forecasts, not real HYCOM/Copernicus products, and not ecological or biogeochemical forecast models.

Passing visual and software tests does not establish oceanographic validity. The scorecard distinguishes deterministic software correctness, numerical verification, physical plausibility, external validation, and fit-for-purpose benchmarking.

## Validation Assets

SCI-VALID-R1 adds a compact deterministic fixture:

- `tests/fixtures/homegrown_environment_scientific_baseline.json`

It also adds focused scripts:

- `tools/js/smoke_manufactured_bathymetry_cases.mjs`
- `tools/js/smoke_bathymetry_resolution_convergence.mjs`
- `tools/js/audit_bathymetry_ensemble_statistics.mjs`
- `tools/js/smoke_manufactured_current_cases.mjs`
- `tools/js/smoke_current_depth_distinctness.mjs`
- `tools/js/smoke_current_temporal_evolution.mjs`
- `tools/js/audit_current_physical_invariants.mjs`
- `tools/js/smoke_manufactured_scalar_cases.mjs`
- `tools/js/audit_scalar_conservation_and_convergence.mjs`
- `tools/js/smoke_environment_mission_coupling.mjs`
- `tools/js/audit_environment_benchmark_shortcuts.mjs`

The scripts are grouped under:

```bash
npm.cmd run test:science
```

and are included in:

```bash
npm.cmd run test:packages
```

## Representative Evidence

Bathymetry manufactured cases cover flat basin, planar slope, smooth shelf break, Gaussian seamount, submarine canyon, sinusoidal ridge, conical island, and semi-enclosed basin. Flat and planar cases are exact to stored artifact precision; nonlinear cases are bounded approximations with resolution convergence.

The resolution convergence smoke reduced L2 interpolation error from coarse to fine grids for the smooth shelf break, Gaussian seamount, submarine canyon, and sinusoidal ridge manufactured cases.

The ensemble audit covers 12 compact bathymetry records across three seeds and four archetypes. The stored fixture has no duplicate artifact digests, no calibrated bathymetry claims, and finite terrain statistics.

Manufactured current fixtures cover uniform translation, linear depth shear, oscillating tide, solid-body eddy, translating eddy, and depth-sheared eddy. Linear cases are exact to sampler precision. The sinusoidal tide case uses a bounded interpolation error because linear time interpolation is not analytically exact for sine waves between source frames.

Production current diagnostics verify finite vectors, no nonzero land or below-seabed vectors, nonzero vertical shear, nonzero temporal change, low cellwise direction-noise score, and explicit `scientificallyConstrainedSynthetic` metadata.

Scalar-process tests cover exact multilinear interpolation, uniform fields, Gaussian diffusion-style mass behavior, decay, and source-patch increase. These are manufactured numerical checks, not ecological validation.

Mission/environment coupling verifies that surface and midwater states at the same x/y can produce different current and scalar science samples, and that observations preserve actual depth, resolved depth layer, and public-safe visibility metadata.

## Current Gap Assessment

The current stack has deterministic software correctness coverage and manufactured numerical verification coverage. It has partial physical-plausibility checks through masks, finite values, depth/time distinctness, continuity, divergence/coastline diagnostics, and synthetic component metadata.

It does not yet have external-oracle validation against bathymetry surveys, drifter tracks, moorings, glider observations, HYCOM/Copernicus products, or real scalar-field observations. Any future calibrated claim must add attributed source metadata, source-specific loaders, unit/projection checks, held-out comparisons, and documented acceptance thresholds.