# @anchor/currents

FLOW-PKG-R1 package for canonical ANCHOR current contracts.

Owns:

- CurrentFieldManifest contract
- CurrentField4D artifact contract
- source metadata and claim boundary
- bounded and periodic temporal-boundary resolution
- prepared 4D current sampling
- depth profiles and time series helpers
- pure scientific diagnostics
- manufactured current verification fixtures

Does not own:

- current-generation equations
- bathymetry generation
- scalar-process behavior
- glider physics
- scoring
- Planning timeline display units
- Phaser/HTML UI
- Three.js rendering or GPU buffers

The package accepts canonical seconds only. Planning display hours must pass through `src/core/time/PlanningTimelineTimeBridge.js` before calling the package sampler.