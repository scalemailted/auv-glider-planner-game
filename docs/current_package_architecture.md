# Current Package Architecture

`packages/currents` is the package boundary for 4D current manifests, CurrentField4D artifacts, source metadata, temporal-boundary handling, prepared sampling, manufactured verification fixtures, and pure diagnostics.

The application still owns current generation, environment composition, Planning timeline display units, renderer state, Three.js glyphs, and Phaser/HTML controls. FLOW-PKG-R1 deliberately leaves production current-component composition in `src/core/science/BathymetryConditionedCurrentBuilder.js` for FLOW-PKG-R2.

Production flow:

1. Existing deterministic current builder creates the field values.
2. `CurrentFieldArtifactAdapter` normalizes and validates through `packages/currents`.
3. Planning, Simulation, and renderer-neutral view models consume the same package-backed artifact digest.
4. Three.js receives sampled presentation data only.
## Boot Readiness Boundary

The current package entry point may be imported during Main Menu boot to verify package availability and static hosting paths. Importing the package is not mission science generation. Main Menu boot must not build current cubes, create current samplers, run diagnostics, or construct mission simulation state. FLOW-PKG-R1.1 preserves package artifact and sampler semantics while adding boot readiness evidence.
