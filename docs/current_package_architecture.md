# Current Package Architecture

`packages/currents` is the package boundary for 4D current manifests, CurrentField4D artifacts, source metadata, temporal-boundary handling, prepared sampling, manufactured verification fixtures, pure diagnostics, deterministic generation backends, and vertical profile contracts.

The application owns environment composition, Planning timeline display units, renderer state, Three.js glyphs, and Phaser/HTML controls. FLOW-PKG-R2 moved production bathymetry-conditioned current generation into `packages/currents/src/generation/` and left `src/core/science/BathymetryConditionedCurrentBuilder.js` as a compatibility forwarder.

Production flow:

1. Package generation backends create or preserve the field values.
2. `CurrentFieldArtifactAdapter` normalizes and validates through `packages/currents`.
3. Planning, Simulation, and renderer-neutral view models consume the same package-backed artifact digest.
4. Three.js receives sampled presentation data only.
## Boot Readiness Boundary

The current package entry point may be imported during Main Menu boot to verify package availability and static hosting paths. Importing the package is not mission science generation. Main Menu boot must not build current cubes, create current samplers, run diagnostics, or construct mission simulation state. FLOW-PKG-R1.1 preserves package artifact and sampler semantics while adding boot readiness evidence.
