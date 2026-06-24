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
## FLOW-PKG-R1.1 Closure Before FLOW-PKG-R2

Before production generator extraction, FLOW-PKG-R1.1 establishes that root and Pages-subpath boot reach the Main Menu through package modules, that static-server readiness is probed explicitly, and that route selectors are checked only after production readiness. This gives FLOW-PKG-R2 a stable extraction baseline.
