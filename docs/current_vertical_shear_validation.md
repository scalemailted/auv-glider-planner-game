# Current Vertical Shear Validation

FLOW-PKG-R2 validates whether depth layers carry meaningful physical current differences.

## Material Distinctness

For a non-barotropic generated regime, material depth structure is evaluated across valid multi-layer wet columns. The default material vector threshold is:

```text
max(0.01 m/s, 0.08 * localColumnMeanSpeed)
```

A mixed regional V3 field should have a representative fraction of material columns and distinct depth-layer digests. A barotropic control should not fail copied-layer checks when it is explicitly declared.

## Diagnostics

Package diagnostics now include:

- `verticalShearRms`
- `verticalShearMaximum`
- `surfaceToBottomVectorDifferenceRms`
- `surfaceToDeepVectorDifferenceRms`
- `surfaceToDeepMagnitudeRatioMean`
- `surfaceToDeepBearingDifferenceMean`
- `verticallyUniformColumnFraction`
- `materiallyDistinctColumnFraction`
- `materialMagnitudeColumnFraction`
- `materialBearingColumnFraction`
- `depthLayerDigests`
- `depthLayerDigestCount`
- `copiedLayerDetected`
- `depthCorrelationMatrix`
- `bottomBoundaryGradientCheck`
- `verticalStructureStatus`, warnings, and failures

## R2 Gate Results

The R2 manufactured/profile gates pass for barotropic, surface-intensified, linear-shear, thermocline-jet, bottom-boundary-decay, nonuniform depth interpolation, render-depth parity, and dive-profile current consequence checks.

Representative V3 mixed-regional diagnostics:

| Metric | Value |
|---|---:|
| `verticalShearRms` | `0.003016` |
| `surfaceToDeepVectorDifferenceRms` | `0.058944` |
| `materiallyDistinctColumnFraction` | `1` |
| `depthLayerDigestCount` | `5` |
| `copiedLayerDetected` | `false` |

These are software validation gates for deterministic synthetic benchmark fields, not external oceanographic validation.