# Bathymetry Package Migration Notes

BATHY-PKG-R1 is the first real production extraction after ARCH-R1.

## What Moved

- `BathymetrySourceMetadata` moved into `packages/bathymetry/src/BathymetrySourceMetadata.js`.
- `SignedTerrainSurfaceModel` moved into `packages/bathymetry/src/SignedTerrainSurface.js`.
- Existing `src/core/science/*` paths are compatibility forwarders.

## What Was Added

- `BathymetryManifest` for reproducible bathymetry recipe metadata.
- `BathymetryArtifact` for canonical generated numerical fields.
- `BathymetrySampler` for physical-axis nearest/bilinear sampling.
- `BathymetryValidation` for package-level validation reports.
- `src/core/generation/BathymetryArtifactAdapter.js` to adapt existing generator output without regenerating fields.

## What Did Not Move

- Synthetic bathymetry equations and random generation.
- Three.js terrain, land, coastline, contour, and camera code.
- Phaser scene lifecycle and debug publication.
- Planning, route validation, simulation, scoring, replay, current fields, and scalar fields.

## Migration Rule

Do not import package modules with bare specifiers from browser-loaded app code. Use relative ES module paths that static hosting can resolve, or existing compatibility forwarders.

## BATHY-PKG-R2 Scope

The next bathymetry package phase should consider moving generator component composition only after the R1 parity fixture remains stable. It should not change current fields, scalar fields, mission physics, scoring, or Three.js presentation without a separate approved phase.