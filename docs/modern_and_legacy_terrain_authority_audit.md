# Modern And Legacy Terrain Authority Audit

Phase: WORLD-R1.1

| Path | Current terrain source | Current land source | R1.1 action |
|---|---|---|---|
| `src/core/generation/RegionalMissionDefaults.js` | Synthetic bathymetry converted to signed terrain elevation | `SignedTerrainSurfaceModel.landMask` | Modern regional fields, depth, hazards, and drop zones sample the signed terrain surface. |
| `src/core/science/BathymetryFieldModel.js` | Synthetic educational bathymetry | Bathymetry land/depth features feed signed terrain | Kept as source math; no renderer ownership. |
| `src/core/science/SignedTerrainSurfaceModel.js` | `elevationMeters` relative to sea level | `elevationMeters > seaLevelMeters` | New canonical terrain authority contract. |
| `src/core/rendering/MissionWorldRenderViewModel.js` | Level `signedTerrainSurface` or compatibility summary | Same terrain-authority digest | Exposes terrain authority metadata to renderers/debug. |
| `src/core/rendering/MissionWorldStateAdapter.js` | Adapter summary reads level terrain authority | Same terrain-authority digest | Propagates digest/mode through planning/simulation/replay inputs. |
| `src/game/three/layers/ThreeBathymetryTerrainLayer.js` | Indexed bathymetry terrain mesh | Vertex classification from bathymetry/signed source | Remains shared mesh path; not per-cell objects. |
| `src/game/three/layers/ThreeLandmassLayer.js` | Land vertices from the indexed terrain mesh | Same mesh source digest | Reports `usesPerCellLandMeshes: false` and `landTileMeshCount: 0`. |
| Legacy `anchor.level` terrain grids | Existing terrain array | Explicit compatibility grid | Preserved logically; compatibility summaries use `legacyGridCompatibility` where no signed surface exists. |

## Modern Regional Requirements

Modern generated regional missions use one source relationship:

```text
terrainSourceDigest === landWaterSourceDigest === coastlineSourceDigest === bottomBoundarySourceDigest
```

The water surface remains a separate presentation plane. Hazards remain separate mission concepts and are not used as land/water authority. The modern Three production path must not create per-cell land boxes, raised flat land tiles, or tile walls.

## Legacy Compatibility

Imported legacy missions can still carry abstract terrain grids. Those grids are not assigned fabricated kilometer-scale meaning. Where a signed surface is absent, compatibility code reports `terrainAuthorityMode: legacyGridCompatibility` and keeps legacy outcomes separate from modern regional terrain generation.