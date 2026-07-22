# @anchor/currents Model Card

## Purpose

The package owns canonical current contracts, sampling, pure diagnostics, deterministic synthetic generation backends, and declared vertical profile contracts for ANCHOR 4D current fields.

## Inputs

- Current field manifests describing source/generator configuration.
- CurrentField4D artifacts with east/north/depth/time axes and U/V/W arrays.
- Source metadata and claim-boundary records.

## Outputs

- Normalized current manifests.
- Normalized CurrentField4D artifacts.
- Deterministic current digests and summaries.
- 4D sampled current vectors.
- Depth profiles, time series, and scientific diagnostics.

## Coordinate Frame And Units

The coordinate frame is `localEastNorthDown`. East and north axes are meters. Depth is meters positive down. Time is canonical seconds. U is eastward m/s, V is northward m/s, and W is positive-down m/s when supplied.

## Axis Ordering

Current arrays use `[time][depth][north][east]` ordering.

## Temporal Boundary Semantics

Bounded fields clamp outside the available source-time axis and report the clamped state. Periodic fields wrap through the declared period and report the wrapped state. The package never infers hours from small numbers.

## Interpolation

The sampler performs deterministic horizontal, vertical, and temporal interpolation over the package artifact. Nearest and reduced interpolation profiles remain available for compatibility.

## Wet, Land, And Bottom Behavior

Wet mask and bottom-depth arrays are part of the artifact. Land, outside-domain, and below-bottom samples are reported explicitly and return zero current vectors.

## Source Tiers

Supported tiers include `manufacturedAnalytical`, `scientificallyConstrainedSynthetic`, `checkedInImportedFixture`, and `externalOperationalProduct`.

## Diagnostics

Diagnostics include finite vector counts, speed statistics, calm count, divergence, temporal change, spatial autocorrelation, noise score, coastline-normal speed, along/cross-isobath metrics, land-vector count, below-bottom-vector count, vertical shear RMS/maximum, surface-to-deep vector differences, depth-layer digest checks, copied-layer detection, and material depth-distinctness fractions.

## Deterministic Behavior

Manifests, artifacts, summaries, diagnostics, and selected samples are deterministic for the same inputs.

## Validation Tier

This package is suitable for deterministic benchmark and regression testing. Synthetic currents are benchmark-oriented and are not calibrated forecasts.

## Claim Boundary

Scientifically constrained synthetic current fields are not calibrated ocean forecasts and are not real HYCOM or Marine Copernicus data. Real HYCOM or Copernicus claims require attributed imported artifacts.

## Ownership Boundary

The application owns UI, scene lifecycle, mission orchestration, scoring, and Three.js presentation. The mission simulator consumes package currents; it does not invent display-only currents. Planning display units are converted to canonical seconds before package sampling. FLOW-PKG-R2 moves production bathymetry-conditioned current generation into the package while leaving app compatibility forwarders in place.

## Future Backends

Active generation backend IDs are `cpuBathymetryConditionedSyntheticV2` for exact compatibility and `cpuBathymetryConditionedSyntheticV3` for normal depth-structured mixed regional missions. Reserved future backend IDs such as WebGPU, WASM, and imported operational products remain inactive until explicit provenance and validation exist.

## FLOW-PKG-R2 Vertical Structure

Equal currents across depth are valid only for an explicitly depth-uniform or vertically mixed regime such as `barotropicDepthUniform`. Normal mixed regional missions use declared depth structure through V3. Vertical variation is coherent and model-based, not random slab noise. Bathymetry masks invalid depths and influences bottom-boundary behavior. Three.js displays this structure but does not generate it. Real ocean-model validation remains a later oracle/data phase.
