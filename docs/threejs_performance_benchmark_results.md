# Three.js Performance Benchmark Results

THREE-R1.2A.4.2 adds measured browser-side performance instrumentation for the production Three.js mission renderer. Measurements are environment-specific and are reported with browser, viewport, fixture context, and known limitations. Do not treat these numbers as scientific correctness claims, certification targets, or operational ocean-forecast performance claims.

## Fixture

Representative focused fixture:

- generated deterministic challenge
- Three.js Mission Workspace
- continuous surface waypoints
- non-executable thermocline/deep sampling targets
- attached sampling-target workflow
- full-profile / multi-yo predicted dive
- currents, scalar depth slices, hazards, gliders, route geometry, and science targets where present in the generated challenge

Surface waypoints remain executable navigation/surfacing anchors. Sampling targets remain non-executable science objectives. Multi-yo execution remains canonical core behavior. Performance quality profiles are presentation-only.

## Environment

Measured locally on 2026-06-20 using package-local Playwright Chromium from `node ./node_modules/@playwright/test/cli.js` on Windows. Viewport is the repo's Playwright default unless overridden by the suite. Headless and headed timings differ substantially on this machine, so both are reported.

## Measurement Table

| Scenario | Browser Mode | Avg ms | Median ms | P95 ms | P99 ms | Max ms | Long Frames | Renderer / Resource Notes |
|---|---|---:|---:|---:|---:|---:|---:|---|
| Planning camera orbit/pan/zoom | headless Chromium | 134.59 | 133.20 | 150.00 | 716.70 | 750.00 | 158 over 50 ms | 1 renderer, 1 RAF, 0 camera-gesture model/prediction/texture/panel/timeline rebuilds; 508 scene objects, 460 geometries, 471 materials, 271 textures. |
| Planning camera orbit/pan/zoom | headed Chromium | 18.42 | 16.70 | 16.80 | 166.40 | 166.60 | 2 over 50 ms | 1 renderer, 1 RAF, 0 camera-gesture model/prediction/texture/panel/timeline rebuilds; 506 scene objects, 458 geometries, 469 materials, 271 textures. |
| Simulation multi-yo execution | headless Chromium | 226.49 | 249.90 | 350.00 | 1353.90 | 1353.90 | 28 over 50 ms | 1 renderer, 1 RAF; 27 model/prediction/field/current/route/target update passes during simulation; 520 scene objects, 472 geometries, 483 materials, 181 textures. |
| Simulation multi-yo execution | headed Chromium | 176.12 | 199.90 | 266.70 | 283.20 | 283.20 | 28 over 50 ms | 1 renderer, 1 RAF; 28 model/prediction/field/current/route/target update passes during simulation; 515 scene objects, 467 geometries, 478 materials, 187 textures. |

## Findings

The camera interaction invariant is now clean: camera gestures do not mutate the plan and do not trigger mission model rebuilds, prediction rebuilds, texture updates, panel rerenders, or timeline rerenders while the gesture flag is active.

The simulation path is still expensive. The current renderer uses a legacy continuous animation loop and rebuilds several presentation layers during simulation updates. This is measured and bounded by one renderer/one RAF, but it is not optimized enough to call the renderer performance-closed for larger terrain/seabed work.

## Debug Contract

`globalThis.ANCHOR_THREE_PERFORMANCE_DEBUG` exposes average, median, p95, p99, max, long-frame counts, renderer.info counts, object/resource counts, active renderer/RAF counts, and camera-only invariant counters.

At Main Menu, `activeRendererCount` and `activeRafCount` must be `0`. In Planning or Simulation, exactly one renderer and one RAF are expected.

## Boundaries

The monitor does not mutate mission state, scoring, simulation, route planning, hidden truth, or scientific field semantics. Quality-profile and display changes are presentation-only.

Human manual QA by the project owner remains pending.
## THREE-R1.2A.4.3 Simulation Presentation Pipeline

This pass adds `src/game/three/ThreeSimulationPresentationScheduler.js`. Canonical simulation stepping is independent of browser rendering cadence. Presentation requests may be coalesced; canonical events may not be dropped. Visual interpolation and quality profiles are presentation-only and cannot change mission state or scoring.

The renderer now accepts Simulation dirty categories and skips unchanged static layers during routine pose/status updates. Realized trajectories use stable growable buffers; observations and surfacing markers use keyed object maps. Debug summaries expose presentation-frame, coalescing, field-frame skip, trajectory append/rebuild, event object reuse, HUD/right-panel/timeline throttling, and Finish Instantly budget counters.

The pre-optimization headed baseline remains the THREE-R1.2A.4.2 measurement: average 176.12 ms and p95 266.70 ms for the representative multi-yo Simulation workflow. Post-optimization measurements must be recorded after validation; if the target or 2x improvement gate is not met, THREE-R1.2B remains blocked.

## THREE-R1.2A.4.3 Post-Optimization Measurements

Measured locally on 2026-06-20 with package-local Playwright Chromium on the same representative multi-yo workflow after resetting the performance window at Simulation entry.

| Scenario | Browser Mode | Avg ms | Median ms | P95 ms | P99 ms | Max ms | Long Frames | Renderer / Resource Notes |
|---|---|---:|---:|---:|---:|---:|---:|---|
| Simulation multi-yo execution | grouped headless Chromium | 85.35 | 100.00 | 166.60 | 166.80 | 166.80 | 21 over 50 ms | 1 renderer, 1 RAF; 0 predicted trajectory, field texture, current buffer, route geometry, and sampling-target geometry rebuilds during measured Simulation window; 507 scene objects, 459 geometries, 470 materials, 31 textures. |
| Simulation multi-yo execution | monolithic headless Chromium | 84.37 | 100.10 | 133.40 | 166.70 | 166.70 | 19 over 50 ms | 1 renderer, 1 RAF; 0 predicted trajectory, field texture, current buffer, route geometry, and sampling-target geometry rebuilds during measured Simulation window; 528 scene objects, 480 geometries, 491 materials, 31 textures. |
| Simulation multi-yo execution | headed Chromium | 57.24 | 66.60 | 100.10 | 101.70 | 101.70 | 13 over 50 ms | 1 renderer, 1 RAF; 0 predicted trajectory, field texture, current buffer, route geometry, and sampling-target geometry rebuilds during measured Simulation window; 510 scene objects, 462 geometries, 473 materials, 31 textures. |

Compared with the THREE-R1.2A.4.2 headed baseline of avg 176.12 ms and p95 266.70 ms, the headed workflow improves by about 3.08x average and 2.66x p95. Compared with the headless baseline of avg 226.49 ms and p95 350.00 ms, the grouped headless workflow improves by about 2.65x average and 2.10x p95.

The minimum 2x improvement gate is met. The stricter primary target is not fully met: headed avg remains above 50 ms and headed p95 is approximately 100.1 ms, just above the 100 ms target. Remaining bottlenecks are WebGL render cost/resource density, the continuous Three RAF render loop, and HUD/right-panel/timeline presentation work at simulation cadence.

## THREE-R1.2A.4.4 GPU/RAF Render-Cost Closure

Starting evidence from THREE-R1.2A.4.3 was headed Chromium average 57.24 ms and p95 100.1 ms against the representative multi-yo Simulation workflow. A separate fresh pre-change capture from unmodified code was not taken in this pass because the worktree was already under edit; treat the 4.3 values as starting evidence, not a newly reproduced before sample.

Post-change focused measurements on 2026-06-20 with package-local Playwright Chromium:

| Scenario | Browser Mode | Avg ms | P95 ms | P99 ms | Rendered FPS | Presentation CPU avg | Renderer submit CPU avg | GPU avg | Notes |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| Balanced bathymetry headroom gate | headed Chromium | 21.981 | 50.1 | 66.6 | 45.494 | 2.07 | 5.017 | 5.821 | GPU timer supported; strict gate passed. |
| Balanced bathymetry headroom gate | headless Chromium | 117.7 | 150.0 | 150.0 | 8.496 | 2.319 | 9.265 | null | Headless is diagnostic only; GPU timer unsupported in this run. |

The headed strict gate passed: average <= 50 ms, p95 <= 100 ms, and rendered presentation FPS >= 20. Headless frame intervals remain much slower on this machine even though CPU update/submission costs are low; this is why strict frame-interval assertions are headed-only.

The fixture retains two gliders, active scalar field, five-layer water-column context, predicted dive, realized trajectory, sampling targets, observations, readable current vectors, bottom boundary context, and useful labels. Quality-profile parity tests confirm canonical simulation outputs remain identical across Performance, Balanced, and High.

Human manual QA by the project owner remains pending.

## THREE-R1.2B Terrain Measurement Note

The R1.2B terrain contract preserves the previous render-cost gate intent: headed Balanced average frame interval <= 50 ms, p95 <= 100 ms, and rendered FPS >= 20 with terrain visible. Fresh headed terrain measurements still need to be recorded after browser E2E execution in this phase.
