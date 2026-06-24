# Scientific Manifest and Artifact Contracts

ARCH-R1 separates manifests from artifacts.

A manifest describes what a scientific object claims to be. An artifact contains fields, arrays, diagnostics, or bundle contents that implement the manifest.

## Manifest Fields

Shared manifest concepts include:

- `schemaVersion`
- `type`
- `id`
- `coordinateFrame`
- `axes`
- `units`
- `provenance`
- `digest`

Provenance records include `generatedBy`, `generatorVersion`, `source`, `synthetic`, `calibrated`, and optional notes. The default is synthetic and not calibrated.

## Artifact Fields

Shared artifact concepts include:

- `schemaVersion`
- `type`
- `manifest`
- `layout`
- `fields`
- `diagnostics`
- `validationReport`
- `digest`

Typed-array data may be represented as plain arrays, typed arrays, or serialized records. Contracts name layouts explicitly so consumers do not infer shape from renderer code.

## Deterministic Digests

`@anchor/contracts` provides stable JSON normalization and FNV-1a 32-bit digest helpers for lightweight local checks. These digests are intended for deterministic compatibility checks, not cryptographic security.

Existing production artifact digest functions remain untouched in ARCH-R1. Later extraction phases must prove digest parity before replacing old import paths.

## Bathymetry Contract Proof

`@anchor/bathymetry` wraps the shared contract helpers for bathymetry manifests and artifacts. This proves the package boundary without moving bathymetry generation algorithms.

## Visibility Boundary

Public or solver-visible artifacts must not leak hidden truth fields. That visibility policy remains owned by existing headless/export modules until a later `@anchor/codecs` extraction phase.

## BATHY-PKG-R1 Bathymetry Contract

Bathymetry now has a package-owned manifest/artifact split. The manifest records recipe, source, resolution, coordinate frame, and claim boundary. The artifact records generated axes, signed elevation, bottom depth, wet/land masks, coastline, provenance, validation report, and deterministic digest. See [Bathymetry Manifest and Artifact Contract](bathymetry_manifest_and_artifact.md).

## FLOW-PKG-R1 Current Package Note

packages/currents now owns pure 4D current contracts, artifacts, source metadata, sampler behavior, temporal boundaries, and scientific diagnostics. The package remains browser-safe, Node-safe, Worker-safe, and independent of src/, Three.js, Phaser, DOM, and UI lifecycle. Synthetic current claims remain bounded to deterministic benchmark fixtures, not calibrated ocean forecasts.
