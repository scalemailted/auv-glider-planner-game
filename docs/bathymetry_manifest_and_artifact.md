# Bathymetry Manifest and Artifact Contract

BATHY-PKG-R1 separates reproducible bathymetry recipes from generated numerical fields.

## Manifest

The manifest is a compact recipe/claim record:

- `type: anchor.bathymetry.manifest`
- `version`
- `id` and optional `seed`
- `generatorId` and `generatorVersion`
- `coordinateFrame`
- `physicalExtentMeters.east/north`
- `resolution.eastCount/northCount`
- `archetype` and `components`
- `sourceMetadata`
- `claimBoundary`
- deterministic `manifestDigest`

Current synthetic manifests declare synthetic educational data, not calibrated bathymetry and not an operational navigation product.

## Artifact

The artifact is the canonical numerical result:

- `type: anchor.bathymetry.artifact`
- `eastAxisMeters` and `northAxisMeters`
- `signedElevationMeters[y][x]`
- `bottomDepthMeters[y][x]`
- `wetMask[y][x]` with wet=true
- `landMask[y][x]` with land=true
- `coastline`
- `sourceMetadata` and `provenance`
- `manifestDigest` and `artifactDigest`
- `validationReport` from `packages/contracts`
- `boundaryFlags` proving renderer/package ownership boundaries

## Coordinate And Sign Convention

- Arrays are row-major `[northIndex][eastIndex]`.
- `signedElevationMeters` is positive above sea level, zero at sea level, and negative below sea level.
- `bottomDepthMeters` is nonnegative physical water depth, positive in wet water, and zero on land or legacy dry cells.
- Physical sampling uses east/north meter axes, not render coordinates.

## Sampler

`createBathymetrySampler(artifact)` prepares a normalized artifact once. `sampleBathymetry` supports nearest and bilinear sampling, returns outside-domain, wet, and land flags, and does not use meshes or raycasts.