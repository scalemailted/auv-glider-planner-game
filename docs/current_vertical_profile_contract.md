# Current Vertical Profile Contract

`packages/currents/src/generation/CurrentVerticalProfileContract.js` defines deterministic vertical-current profile families used by the V3 generator.

## Descriptor Fields

A vertical-structure descriptor records:

- `id` and `version`
- `profileFamilies`
- `magnitudeProfile` and `directionProfile` semantics where applicable
- surface, thermocline, and bottom-boundary reference depths
- shear strength and turning controls
- component support declarations
- units and claim boundary

## Implemented Families

| Family | Meaning |
|---|---|
| `barotropicDepthUniform` | U/V are identical across wet depths. Valid control or vertically mixed regime. |
| `surfaceIntensifiedExponential` | Magnitude decays smoothly away from the surface. |
| `linearVerticalShear` | U/V change coherently with depth. |
| `thermoclineJet` | Speed peaks smoothly near the configured thermocline. |
| `bottomBoundaryDecay` | Speed reduces near local seabed. |

The contract also reserves controlled helper paths for `twoLayerShear` and `ekmanLikeVeering`, but R2 validation focuses on the implemented families above.

## Rules

- Do not independently randomize slabs.
- Do not infer vertical structure from Three.js world Y.
- Do not treat below-bottom zero vectors as evidence of depth uniformity.
- Do not claim calibrated ocean forecasts.
- Barotropic fields must be explicitly labeled as `barotropicDepthUniform` or equivalent vertically mixed controls.