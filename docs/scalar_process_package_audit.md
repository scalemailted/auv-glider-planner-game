# Scalar Process Package Audit

Phase: `PROCESS-PKG-R1`

## Findings

- The prior `packages/scalar-processes` implementation was an ARCH-R1 skeleton only.
- Production scalar behavior lived in pure modules under `src/core/science`, especially continuous volumetric sampling and water-column scalar helpers.
- Teaching Process Lab and coupled demo engines are educational/lab-owned and were not extracted.
- Depth-aware science scoring and mission sampling remain in app/core ownership because they include scoring semantics and mission-state logic.

## Moved Into Package

- `VolumetricFieldSampler.js`
- `WaterColumnSchema.js`
- `WaterColumnFieldModel.js`
- `WaterColumnPriorityModel.js`
- package-local `ScalarFieldGrid.js` helper extracted from the small pure subset needed by water-column field helpers

Compatibility forwarders preserve the previous `src/core/science/*` import paths.

## Added Package Surface

- Scalar source metadata and claim-boundary validation.
- Canonical `ScalarField4D` artifact creation, normalization, validation, digest, summary, and sampler helpers.
- Pure scalar diagnostics and manufactured scalar regression fixtures.
- Scalar package dependency, browser-safety, worker-safety, forwarder, sampler, artifact, diagnostics, and parity tests.

## Retained Outside Package

- Process Lab and Process Paint engines.
- Coupled demo analytical engines and oracle teaching UI.
- Depth-aware scoring formulas.
- Mission simulation, vehicle physics, and observation-noise handling.
- Rendering layers and view models.

## Parity Notes

The extracted sampler is behavior-compatible through the old source forwarder. The scalar manufactured baseline now imports the package sampler directly. Package parity is recorded in `tests/fixtures/scalar_package_r1_parity.json` with digest `fnv1a32:a29af169`.

## Remaining Gaps

`ENV-PKG-R1` should wait until scalar artifacts are composed with bathymetry/current artifacts through environment manifests and the resulting browser/headless loaders pass package, science, Pages, and release E2E gates.
