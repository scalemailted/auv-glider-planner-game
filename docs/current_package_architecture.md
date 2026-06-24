# Current Package Architecture

`packages/currents` is the package boundary for 4D current manifests, CurrentField4D artifacts, source metadata, temporal-boundary handling, prepared sampling, manufactured verification fixtures, and pure diagnostics.

The application still owns current generation, environment composition, Planning timeline display units, renderer state, Three.js glyphs, and Phaser/HTML controls. FLOW-PKG-R1 deliberately leaves production current-component composition in `src/core/science/BathymetryConditionedCurrentBuilder.js` for FLOW-PKG-R2.

Production flow:

1. Existing deterministic current builder creates the field values.
2. `CurrentFieldArtifactAdapter` normalizes and validates through `packages/currents`.
3. Planning, Simulation, and renderer-neutral view models consume the same package-backed artifact digest.
4. Three.js receives sampled presentation data only.