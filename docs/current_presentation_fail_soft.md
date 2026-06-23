# Current Presentation Fail-Soft Behavior

Volumetric current glyphs are presentation only. Mission physics continues to use the canonical current field even if glyph initialization fails.

## Required Warning

When glyph presentation cannot initialize, the UI must show this exact warning:

```text
Volumetric current visualization could not be initialized. Mission physics still use the canonical current field.
```

The renderer marks degraded presentation through `globalThis.ANCHOR_SIMULATION_LAUNCH_DEBUG.degradedPresentation` and the Three renderer summary. It must not abort canonical mission execution for a glyph-only failure.

## Safe Display Mode

`?currentDisplay=safe` disables current-glyph presentation only. It is intended for debugging or low-capability browser sessions. It does not disable canonical currents, current-aware route diagnostics, simulation drift, scoring, or replay/export semantics.

## Guards

- `tools/js/smoke_current_presentation_fail_soft.mjs` verifies renderer fail-soft behavior without a browser.
- `tests/e2e/flow_r2a_1_launch_stability.spec.js` includes `Current Glyph Presentation Failure Does Not Freeze Simulation`, which forces the glyph failure test seam and confirms Simulation still advances.

## Boundaries

FLOW-R2A.1 does not add a WebGPU current backend, tracer/pathline simulation, calibrated ocean forecast ingestion, a new planner, or scoring changes.