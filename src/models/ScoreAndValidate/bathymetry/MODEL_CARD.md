# Bathymetry Package Model Card

## Package Purpose

`@anchor/bathymetry` owns browser-safe, Node-safe bathymetry contracts and pure helpers for ANCHOR educational missions.

## Supported Inputs

- Existing synthetic bathymetry field objects.
- Existing signed terrain surface objects.
- Plain array or array-like depth/elevation/mask fields.
- Source metadata for synthetic generated, checked-in fixture, or imported local artifact sources.

## Output Contract

The package emits normalized bathymetry manifests, artifacts, validation reports, summaries, digests, and physical-axis samples.

## Coordinate Frame

Local tangent-plane meters are used in R1. Artifact arrays are row-major `[northIndex][eastIndex]` with explicit east and north meter axes.

## Physical Units

Axes, signed elevation, bottom depth, and sampler outputs are in meters.

## Elevation And Depth Sign Convention

`signedElevationMeters` is positive above sea level and negative below sea level. `bottomDepthMeters` is nonnegative and positive downward in wet water.

## Deterministic Behavior

Normalization, summaries, validation reports, and digests are deterministic for the same input values. R1 does not retune or rewrite the synthetic generator.

## Supported Synthetic Archetypes

R1 describes and adapts current production synthetic archetypes such as coastal shelf, shelf/basin, canyon, island/seamount, and regional fleet survey fixtures.

## Numerical Methods Currently Inherited

The package inherits existing generated arrays from the app generator. Sampling supports nearest and bilinear interpolation over physical east/north axes.

## Boundary Handling

Samples outside the artifact domain return an explicit `outsideDomain` result. Land cells return `land: true` and `wet: false`. Wet cells require finite positive bottom depth.

## Source And Provenance Metadata

Synthetic fixtures default to local educational provenance. Imported or checked-in external fixtures must carry explicit source, license, attribution, and claim metadata.

## Validation Tier

R1 validation checks shape, dimensions, finite values, mask consistency, signed elevation/depth consistency, digest presence, source metadata, and renderer/package boundary flags.

## Known Limitations

Synthetic bathymetry is educational and benchmark-oriented. It is not a calibrated hydrographic survey. It is not certified for navigation. Real GEBCO/ETOPO or other imported fixtures require explicit source and attribution metadata. Rendering is not part of the bathymetry scientific authority.

## Claim Boundary

Package artifacts are synthetic by default, not calibrated, and not operational navigation products. Three.js presentation is display-only and does not own bathymetry truth.

## Future Validation Targets

Future phases should add real-fixture attribution checks, stronger component manifests, manufactured terrain benchmarks, and generator parity tests before moving generation algorithms into the package.