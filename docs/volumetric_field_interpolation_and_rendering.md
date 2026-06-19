# Volumetric Field Interpolation and Rendering

The mission renderer supports field display modes exposed in the Planning Console:

- Layer Slices
- Smoothed Slices
- Volumetric Cloud
- Hybrid

Current WebGL Volumetric Cloud mode uses a layered translucent-slice fallback. This is display interpolation only. Canonical field sampling, route validation, simulation, scoring, and exports remain in the portable core.

Generated modern missions use synthetic multi-layer water-column fields. They are teaching fields, not calibrated ocean forecasts.

## Physical vs Exploded Predicted Paths

Predicted dive points retain canonical `depthMeters` and `depthLayerId`. Physical depth mode maps depth directly through the mission coordinate model. Exploded layer mode uses display-only layer separation so the trajectory remains readable across separated slabs. Switching modes must not change route, profile, predicted samples, score, or simulation state.
