# FLOW-PKG-R2 Migration Notes

FLOW-PKG-R2 moves production current generation into `packages/currents` while preserving compatibility.

## What Moved

The implementation behind `src/core/science/BathymetryConditionedCurrentBuilder.js` now lives at:

```text
packages/currents/src/generation/BathymetryConditionedCurrentBuilder.js
```

The old `src/core/science/` path is a compatibility forwarder. Existing imports keep working.

## Compatibility Policy

- Existing V2 generated-current behavior is preserved under `cpuBathymetryConditionedSyntheticV2`.
- V2 parity fixture digest remains `fnv1a32:49c9a4f0`.
- New normal generated regional missions use `cpuBathymetryConditionedSyntheticV3`.
- Legacy/imported missions are not silently migrated.
- Package version remains `anchor-currents-flow-pkg-r1` in this phase so R1 package-path consumers remain stable.

## Browser And Static Hosting

`packages/currents` stays browser-safe and static-host compatible. It does not import Three.js, Phaser, DOM globals, browser debug globals, WebGPU, or network resources.

## Operational Boundary

The current package owns current artifacts, source metadata, sampling, diagnostics, deterministic generation backends, and vertical profile contracts. The app owns UI controls, scene lifecycle, route editing, simulation orchestration, scoring, and Three.js presentation.

No external ocean data, calibrated forecast claim, new planner, scoring change, glider dive-mechanics change, or Python simulator is introduced by this migration.