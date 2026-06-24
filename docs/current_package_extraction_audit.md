# FLOW-PKG-R1 Current Package Extraction Audit

FLOW-PKG-R1 changes ownership of pure 4D current contracts, artifacts, source metadata, temporal-boundary logic, sampling, terrain masking helpers, manufactured verification fixtures, and scientific diagnostics. It does not intentionally change current-generation equations, bathymetry, scalar processes, glider physics, scoring, visible current evolution, or mission semantics.

| Capability | Current owner | Pure | Runtime coupled | FLOW-PKG-R1 action |
|---|---|---:|---:|---|
| Canonical CurrentField4D authority | `packages/currents/src/OceanCurrentField4D.js` | Yes | No | Moved from `src/core/science` and left a forwarder. |
| U/V component authority | CurrentField4D artifact arrays | Yes | No | Preserved axis order `[time][depth][north][east]`. |
| Coordinate frame | Current artifact/source metadata | Yes | No | Explicit `localEastNorthDown`. |
| Physical units | Current artifact/source metadata | Yes | No | East/north/depth meters, time seconds, U/V m/s. |
| Positive-down depth | Current artifact/source metadata | Yes | No | Preserved `depthAxisMeters` positive down. |
| Temporal boundary | `packages/currents/src/OceanCurrentFieldSampler.js` | Yes | No | Bounded clamp and periodic wrap preserved. |
| Current digest | `currentFieldDigest` / legacy `oceanCurrentField4DDigest` | Yes | No | Preserved deterministic FNV stable digest. |
| Source/provenance | `packages/currents/src/OceanCurrentSourceMetadata.js` | Yes | No | Synthetic claim boundary preserved in metadata. |
| Sampler | `packages/currents/src/OceanCurrentFieldSampler.js` | Yes | No | Prepared sampler moved; no renderer dependency. |
| Scientific diagnostics | `packages/currents/src/CurrentFieldScientificDiagnostics.js` | Yes | No | Pure diagnostics moved without threshold retuning. |
| Bathymetry mask helper | `packages/currents/src/CurrentTerrainBoundaryCondition.js` | Yes | No | Moved helper only; bathymetry generation remains separate. |
| Manufactured verification fixtures | `packages/currents/src/ManufacturedCurrentFieldCatalog.js` | Yes | No | Moved catalog as verification support. |
| Production current generator | `src/core/science/BathymetryConditionedCurrentBuilder.js` | Mostly | Yes | Intentionally retained for FLOW-PKG-R2. |
| Synthetic current cube adapter | `src/core/science/SyntheticCurrentCubeAdapter.js` | No | Yes | Intentionally retained for FLOW-PKG-R2. |
| Environment artifact adapter | `src/core/environment/CurrentFieldArtifactAdapter.js` | Adapter | Yes | New app-side package normalization and validation bridge. |
| Planning current sampling path | Water-column explorer + package sampler | Adapter | Yes | Uses package sampler after `PlanningTimelineTimeBridge`. |
| Simulation sampling path | `TruthWorld` + package sampler | Adapter | Yes | Uses same package artifact and sampler. |
| Headless/replay metadata path | Existing headless/replay consumers | Adapter | Yes | Forwarders keep imports stable. |
| Three.js presentation | `src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js` | No | Yes | Intentionally retained; renderer does not own current truth. |
| Phaser/UI orchestration | Mission scenes and HTML overlay | No | Yes | Intentionally retained. |

## Authority And Conventions

- Current field: `F(x, y, z, t) = <u, v, w?>`.
- Coordinate frame: `localEastNorthDown`.
- Horizontal axes: east and north in meters.
- Depth: meters, positive down.
- Time: canonical seconds only.
- Component units: U eastward m/s, V northward m/s, optional W positive-down m/s.
- Artifact axis ordering: `[time][depth][north][east]`.
- Synthetic claim boundary: scientifically constrained synthetic, not calibrated forecast, not real HYCOM, not Marine Copernicus.

## Remaining Coupling

`BathymetryConditionedCurrentBuilder`, `SyntheticCurrentCubeAdapter`, and production component composition remain in `src/` for FLOW-PKG-R2. Renderer cache/dirty state, glyph density, GPU buffers, current UI controls, `PlanningTimelineTimeBridge`, and Phaser/Three scene lifecycle remain application responsibilities.
## FLOW-PKG-R2 Follow-Up

FLOW-PKG-R2 completed the planned production generator move. `src/core/science/BathymetryConditionedCurrentBuilder.js` is now a compatibility forwarder to `packages/currents/src/generation/BathymetryConditionedCurrentBuilder.js`. The V2 backend preserves the R1 generator behavior, while V3 adds declared depth-structured mixed-regional generation. The historical table above is retained as the R1 extraction snapshot.