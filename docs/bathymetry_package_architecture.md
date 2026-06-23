# Bathymetry Package Architecture

BATHY-PKG-R1 establishes `packages/bathymetry` as the canonical owner of bathymetry contracts and pure scientific helpers.

## Relationship

```text
existing deterministic generator
  -> src/core/generation/BathymetryArtifactAdapter.js
  -> packages/bathymetry BathymetryArtifact
  -> packages/bathymetry BathymetrySampler
  -> renderer-neutral view models
  -> Three.js presentation
```

The existing synthetic generator remains in `src/core/science/BathymetryFieldModel.js`. R1 is an extraction phase, not a scientific retuning phase.

## Package Owns

- Bathymetry manifest contract.
- Bathymetry artifact contract.
- Source/provenance metadata helpers.
- Signed terrain surface helpers moved from the production core.
- Canonical nearest and bilinear bathymetry sampling on physical axes.
- Package validation for dimensions, finite values, masks, digests, and boundary flags.

## Application Owns

- UI, scene lifecycle, browser controls, and debug globals.
- Mission setup and generator orchestration.
- Renderer-neutral view models and Three.js mesh/contour/coastline presentation.
- Mission simulation, route validation, scoring, replay, and export UI.

## Compatibility

Existing app imports keep working through forwarding modules:

- `src/core/science/BathymetrySourceMetadata.js`
- `src/core/science/SignedTerrainSurfaceModel.js`

Static hosting must copy `packages/bathymetry` and `packages/contracts` because browser ES modules resolve the forwarders directly.