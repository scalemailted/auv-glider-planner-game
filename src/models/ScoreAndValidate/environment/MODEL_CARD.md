# Environment Package Model Card

## Scope

`@anchor/environment` provides deterministic composition and sampling for ANCHOR synthetic educational environments.

## Inputs

- `anchor.bathymetry.artifact`
- `anchor.science.ocean-current-field-4d`
- `anchor.science.scalar-field-4d`
- optional role metadata for truth, forecast, belief, uncertainty, and priority fields

## Outputs

- `anchor.environment.manifest`
- `anchor.environment.artifact`
- `anchor.environment.field-registry`
- validation summaries, component digests, provenance summaries, and physical-coordinate samples

## Claim Boundary

The package records whether fields are truth, forecast, belief, uncertainty, or derived priority. It does not decide which users may see those fields. It does not add calibrated ocean validation, operational forecast status, certified navigation status, observation noise, simulation physics, rendering, or scoring.

Synthetic environments are benchmark and classroom fixtures only unless a future artifact explicitly carries imported-source provenance and separate validation.