# Signed Terrain Surface Authority

Phase: WORLD-R1.1

`src/core/science/SignedTerrainSurfaceModel.js` defines a browser-safe and Node-safe terrain authority for modern generated missions. It has no Three.js, Phaser, DOM, Python, or network dependency.

## Core Meaning

The model stores `elevationMeters` relative to `seaLevelMeters`.

```text
elevationMeters > seaLevelMeters  => land
elevationMeters === seaLevelMeters => coastline threshold
elevationMeters < seaLevelMeters  => submerged terrain
bottomDepthMeters = max(0, seaLevelMeters - elevationMeters)
```

Derived masks:

- `landMask`: elevation above sea level.
- `wetMask`: positive bottom depth.
- `navigableWaterMask`: bottom depth at or above `minimumNavigableDepthMeters`.
- `coastline`: segments derived from land/water transitions in the same signed surface.

## Digest Contract

Modern regional missions use one digest for terrain-related authority:

```text
terrainSourceDigest
landWaterSourceDigest
coastlineSourceDigest
bottomBoundarySourceDigest
```

These values must match because land/water classification, coastline, navigable water, field masks, and bottom limits are all derived from the same signed elevation surface.

## Claim Boundary

The regional terrain is synthetic and educational. It is not real Gulf bathymetry, GEBCO, ETOPO, NOAA, Copernicus, or calibrated forecast data. Display smoothing and mesh resolution do not increase source-model fidelity.