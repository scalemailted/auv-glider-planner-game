# Scalar Processes Model Card

Package: `@anchor/scalar-processes`
Version: `anchor-scalar-processes-process-pkg-r1`

## Owns

- Canonical 4D scalar field artifacts: `A(x, y, z, t)`.
- Scalar source metadata and synthetic claim boundaries.
- Pure scalar and water-column field sampling helpers.
- Pure scalar diagnostics and manufactured regression fixtures.
- Depth-layer priority collapse diagnostics.

## Does Not Own

- Bathymetry generation.
- Current generation.
- Vehicle physics or observation noise.
- Mission scoring formulas.
- Rendering, colors, glyphs, or display exaggeration.
- Teaching-lab process engines under `src/core/demo/sampling` or coupled demo engines.

## Claim Boundary

Default package fixtures are deterministic synthetic educational fields. They are not calibrated ocean forecasts, ecological forecasts, operational biogeochemical products, or external-data validation.
