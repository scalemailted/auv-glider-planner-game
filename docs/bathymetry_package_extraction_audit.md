# BATHY-PKG-R1 Bathymetry Package Extraction Audit

BATHY-PKG-R1 moves real bathymetry contracts and pure helpers into `packages/bathymetry` while preserving production generator behavior and existing app imports.

## Ownership Table

| Capability | Current owner | Pure | Runtime/UI coupled | BATHY-PKG-R1 action |
|---|---|---:|---:|---|
| Bathymetry source/provenance metadata | `packages/bathymetry/src/BathymetrySourceMetadata.js` via `src/core/science/BathymetrySourceMetadata.js` forwarder | Yes | No | Physically moved and forwarded. |
| Signed terrain surface helpers | `packages/bathymetry/src/SignedTerrainSurface.js` via `src/core/science/SignedTerrainSurfaceModel.js` forwarder | Yes | No | Physically moved and forwarded. |
| Bathymetry manifest contract | `packages/bathymetry/src/BathymetryManifest.js` | Yes | No | Added package contract. |
| Bathymetry artifact contract | `packages/bathymetry/src/BathymetryArtifact.js` | Yes | No | Added canonical artifact normalizer/digest/summary. |
| Canonical bathymetry sampler | `packages/bathymetry/src/BathymetrySampler.js` | Yes | No | Added nearest/bilinear physical-axis sampler. |
| Package validation report | `packages/bathymetry/src/BathymetryValidation.js` and `packages/contracts` | Yes | No | Added structured validation composition. |
| Deterministic bathymetry generation | `src/core/science/BathymetryFieldModel.js` | Yes | No | Intentionally not moved in R1; behavior authority preserved. |
| Scenario config | `src/core/generation/ScenarioConfig.js` | Mostly | App configuration consumer | Not moved. |
| Legacy level generator | `src/core/generation/LevelGenerator.js` | Mostly | Game setup coupled | Not moved. |
| Regional mission defaults | `src/core/generation/RegionalMissionDefaults.js` | Mostly | Mission setup consumer | Now adapts generated bathymetry into package artifact; generator logic not moved. |
| Generator artifact adapter | `src/core/generation/BathymetryArtifactAdapter.js` | Yes | No | Added app-side adapter from existing fields to package artifact. |
| Bathymetry surface view model | `src/core/rendering/BathymetrySurfaceViewModel.js` | Renderer-neutral | Presentation consumer | Not moved. |
| Bathymetry world view model | `src/core/rendering/BathymetryWorldRenderViewModel.js` | Renderer-neutral | Presentation consumer | Consumes package artifact identity for standalone view. |
| Bathymetry mesh geometry | `src/core/rendering/BathymetryMeshGeometry.js` | Renderer-neutral geometry | Presentation consumer | Not moved; mesh output is renderer adapter, not canonical truth. |
| Bathymetry mesh sampler | `src/core/rendering/BathymetryMeshSampler.js` | Mostly | Mesh semantics | Not moved; not canonical package sampler. |
| Coastline geometry | `src/core/rendering/CoastlineGeometry.js` | Geometry adapter | Presentation consumer | Not moved; package artifact carries coastline data. |
| Contour geometry | `src/core/rendering/BathymetryContourGeometry.js` | Geometry adapter | Presentation consumer | Not moved. |
| Bottom boundary view model | `src/core/rendering/BottomBoundaryViewModel.js` | Renderer-neutral | Water-column presentation consumer | Not moved. |
| Terrain-aware mission validation | `src/core/planning/TerrainAwareMissionValidation.js` | Yes | Planning consumer | Not moved; consumes canonical terrain/bathymetry. |
| Terrain simulation diagnostics | `src/core/simulation/TerrainSimulationDiagnostics.js` | Yes | Simulation consumer | Not moved; consumes canonical terrain/bathymetry. |
| Three bathymetry layers/renderers | `src/game/three/*Bathymetry*` | No | Three.js presentation | Not moved. |
| Phaser scene orchestration | `src/game/phaser/scenes/*` | No | Phaser/UI lifecycle | Not moved; debug fields now expose package identity. |

## Canonical Authorities

- Bottom-depth authority: existing generated `bathymetry.depthMeters` is preserved and adapted into `BathymetryArtifact.bottomDepthMeters`.
- Wet-mask authority: existing bathymetry wet semantics are preserved; package artifact normalizes `wetMask` without independently regenerating it.
- Land-mask authority: existing `landMask` or `landSeaMask` remains the source; package artifact carries explicit `landMask`.
- Coordinate frame: local tangent-plane meters, row-major `[northIndex][eastIndex]` arrays, physical `eastAxisMeters` and `northAxisMeters`.
- Coastline source: existing generated coastline or extracted coastline edges, carried as artifact coastline metadata.
- Digest source: `packages/contracts` deterministic `artifactDigest` over normalized manifest/artifact payloads.

## Boundary Finding

No package module imports Three.js, Phaser, DOM APIs, `src/game`, or `src/ui`. Three.js does not own bathymetry truth, wet/land masks, route validity, simulation, scoring, or source metadata.