# Current Package Migration

Moved to `packages/currents/src/` in FLOW-PKG-R1:

- `OceanCurrentField4D.js`
- `OceanCurrentFieldSampler.js`
- `OceanCurrentSourceMetadata.js`
- `CurrentFieldScientificDiagnostics.js`
- `CurrentTerrainBoundaryCondition.js`
- `ManufacturedCurrentFieldCatalog.js`

Legacy `src/core/science/*` imports remain valid through compatibility forwarders. New code may import the package path directly when static-host path resolution is valid.

Intentionally retained in `src/`:

- `BathymetryConditionedCurrentBuilder.js`
- `SyntheticCurrentCubeAdapter.js`
- current component generation/composition
- `PlanningTimelineTimeBridge.js`
- Three.js glyph rendering
- Phaser/HTML UI orchestration