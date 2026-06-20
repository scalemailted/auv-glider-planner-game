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
## THREE-R1.2A.4.2 Measurement Closure

This pass adds `src/game/three/ThreeMissionPerformanceMonitor.js` and normalizes `globalThis.ANCHOR_THREE_PERFORMANCE_DEBUG` across Planning, Simulation, and Main Menu cleanup.

Additional checks:

- `node tools/js/smoke_three_performance_monitor.mjs`
- `node tools/js/smoke_three_camera_performance_invariants.mjs`
- `node tools/js/smoke_three_dirty_invalidation_matrix.mjs`
- `node tools/js/smoke_three_resource_plateau_extended.mjs`
- `node tools/js/smoke_e2e_static_server_cleanup.mjs`
- `node tools/js/audit_three_performance_measurement_boundaries.mjs`
- focused E2E: `Three Mission Interaction Performance Invariants`
- focused/headed E2E: `Three Sampling Target and Dive Planning Headed Workflow`

Known refresh hot paths remain: volumetric scalar `DataTexture` recreation and current-vector group rebuild during renderer refresh. Camera-only movement does not call the renderer update path and must keep model, prediction, field/current, panel, and timeline rebuild counters at zero.

Measurements are environment-specific; see `docs/threejs_performance_benchmark_results.md`.

## THREE-R1.2A.4.3

Simulation presentation now uses a scheduler/dirty-category pipeline. Canonical simulation stepping is independent of browser rendering cadence; presentation requests may be coalesced, but canonical events may not be dropped. Grouped Playwright execution is formalized through `tools/js/run_playwright_groups.mjs` plus exact coverage audit.

## THREE-R1.2A.4.3 Post-Optimization Measurements

Measured locally on 2026-06-20 with package-local Playwright Chromium on the same representative multi-yo workflow after resetting the performance window at Simulation entry.

| Scenario | Browser Mode | Avg ms | Median ms | P95 ms | P99 ms | Max ms | Long Frames | Renderer / Resource Notes |
|---|---|---:|---:|---:|---:|---:|---:|---|
| Simulation multi-yo execution | grouped headless Chromium | 85.35 | 100.00 | 166.60 | 166.80 | 166.80 | 21 over 50 ms | 1 renderer, 1 RAF; 0 predicted trajectory, field texture, current buffer, route geometry, and sampling-target geometry rebuilds during measured Simulation window; 507 scene objects, 459 geometries, 470 materials, 31 textures. |
| Simulation multi-yo execution | monolithic headless Chromium | 84.37 | 100.10 | 133.40 | 166.70 | 166.70 | 19 over 50 ms | 1 renderer, 1 RAF; 0 predicted trajectory, field texture, current buffer, route geometry, and sampling-target geometry rebuilds during measured Simulation window; 528 scene objects, 480 geometries, 491 materials, 31 textures. |
| Simulation multi-yo execution | headed Chromium | 57.24 | 66.60 | 100.10 | 101.70 | 101.70 | 13 over 50 ms | 1 renderer, 1 RAF; 0 predicted trajectory, field texture, current buffer, route geometry, and sampling-target geometry rebuilds during measured Simulation window; 510 scene objects, 462 geometries, 473 materials, 31 textures. |

Compared with the THREE-R1.2A.4.2 headed baseline of avg 176.12 ms and p95 266.70 ms, the headed workflow improves by about 3.08x average and 2.66x p95. Compared with the headless baseline of avg 226.49 ms and p95 350.00 ms, the grouped headless workflow improves by about 2.65x average and 2.10x p95.

The minimum 2x improvement gate is met. The stricter primary target is not fully met: headed avg remains above 50 ms and headed p95 is approximately 100.1 ms, just above the 100 ms target. Remaining bottlenecks are WebGL render cost/resource density, the continuous Three RAF render loop, and HUD/right-panel/timeline presentation work at simulation cadence.

## THREE-R1.2A.4.4 Runtime Performance Notes

The mission renderer now separates browser frame interval from JavaScript presentation update cost, renderer submission cost, and optional GPU timing. Balanced quality caps effective pixel ratio at 1.25 and uses a 30 Hz presentation cadence while preserving canonical engine stepping.

Normal production invariants are one Three renderer, one RAF loop, and at most one `renderer.render()` call per presentation frame. Static planning renders on demand; playing simulation consumes coalesced public snapshots; camera gestures request responsive presentation frames without changing mission state.

Headed Chromium focused result on 2026-06-20: avg 21.981 ms, p95 50.1 ms, p99 66.6 ms, rendered FPS 45.494, presentation update CPU avg 2.07 ms, renderer submission CPU avg 5.017 ms, GPU avg 5.821 ms where supported.

Human manual QA by the project owner remains pending.
