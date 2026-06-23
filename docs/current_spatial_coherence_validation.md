# Current Spatial-Coherence Validation

`CurrentFieldScientificDiagnostics` reports lightweight coherence metrics for current cubes:

- adjacent direction difference mean/p50/p95
- adjacent magnitude difference mean/p95
- spatial autocorrelation
- estimated correlation length
- coherent region count
- calm region count
- cellwise direction-noise score
- low/high frequency energy fraction

A normal regional field fails if the direction-noise score is characteristic of a cellwise mosaic. Declared eddies, canyon exchange, and coastal boundaries may create local gradients, but the field should remain spatially coherent at the source, not smoothed independently by Three.js.
