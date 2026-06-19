# Volumetric Field Interpolation and Rendering

The mission renderer supports field display modes exposed in the Planning Console:

- Layer Slices
- Smoothed Slices
- Volumetric Cloud
- Hybrid

Current WebGL Volumetric Cloud mode uses a layered translucent-slice fallback. This is display interpolation only. Canonical field sampling, route validation, simulation, scoring, and exports remain in the portable core.

Generated modern missions use synthetic multi-layer water-column fields. They are teaching fields, not calibrated ocean forecasts.
