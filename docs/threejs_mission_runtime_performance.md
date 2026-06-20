# Three.js Mission Runtime Performance

THREE-R1.2A.4.1 adds smoke/audit coverage for runtime stability rather than a machine-specific FPS target.

Required invariants:

- one production Three mission renderer
- one active render loop
- camera-only interactions do not mutate the plan
- camera-only interactions do not rebuild field textures
- sampling-target objects reuse stable IDs
- repeated camera/display/profile interactions reach a resource plateau
- Performance/Balanced/High presentation choices must not change canonical results
- Three.js does not own planning, prediction, simulation, scoring, replay, or hidden truth

Current checks:

- `tools/js/smoke_three_planning_dirty_flags.mjs`
- `tools/js/smoke_three_prediction_cache.mjs`
- `tools/js/smoke_three_resource_plateau.mjs`
- `tools/js/audit_three_planning_hot_paths.mjs`
- `tools/js/audit_three_performance_boundaries.mjs`
- focused E2E: `Three Camera Interaction Does Not Rebuild Mission Models`
- focused E2E: `Three Mission Renderer Resources Remain Stable`

The quality/profile controls are presentation only. No WebGPU path, dependency change, fluid solver, route optimizer, or arbitrary XYZ planner is added.