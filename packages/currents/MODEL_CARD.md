# @anchor/currents Model Card

## Purpose

The package owns canonical current contracts, sampling, and pure diagnostics for ANCHOR 4D current fields.

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

Diagnostics include finite vector counts, speed statistics, calm count, divergence, vertical shear, temporal change, spatial autocorrelation, noise score, coastline-normal speed, along/cross-isobath metrics, land-vector count, and below-bottom-vector count.

## Deterministic Behavior

Manifests, artifacts, summaries, diagnostics, and selected samples are deterministic for the same inputs.

## Validation Tier

This package is suitable for deterministic benchmark and regression testing. Synthetic currents are benchmark-oriented and are not calibrated forecasts.

## Claim Boundary

Scientifically constrained synthetic current fields are not calibrated ocean forecasts and are not real HYCOM or Marine Copernicus data. Real HYCOM or Copernicus claims require attributed imported artifacts.

## Ownership Boundary

The application owns UI, scene lifecycle, and Three.js presentation. The mission simulator consumes package currents but does not generate them. Planning display units are converted to canonical seconds before package sampling. Current-generation equations remain outside the package in FLOW-PKG-R1.

## Future Backends

Reserved backend IDs: `javascriptCpuV1`, `wasmCpuV1`, `webgpuComputeV1`, `importedOceanModelV1`. Only the existing JavaScript CPU backend is active.