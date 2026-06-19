# Canonical 3D Glider Dive Execution

The browser simulator owns canonical dive execution. Planning assigns horizontal waypoints plus optional `diveProfileId`, `targetDepthLayerId`, and maximum depth metadata. Simulation resolves that intent through the portable physics and dive-state modules.

Three.js renders predicted and realized dive trajectories, pitch, depth, observations, and route state from public-safe view models. It does not own vehicle physics, route validation, observations, scoring, or result generation.

The model is educational and synthetic. It is not a calibrated vehicle controller, sea-trial validation, or calibrated ocean forecast.

## Planning Prediction Boundary

Planning prediction uses the renderer-neutral `PlannedDiveSegmentViewModel` to preview the selected segment profile, expected current drift, depth-layer crossings, bottom turns, bathymetry clearance, and expected samples. Simulation execution remains authoritative for actual glider state, observations, surfacing, and score. The current parity smoke checks no-current single-cycle depth/phase/layer agreement; multi-yo execution parity remains a later hardening target.
