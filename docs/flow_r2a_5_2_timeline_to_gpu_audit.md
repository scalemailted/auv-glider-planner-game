# FLOW-R2A.5.2 Timeline-to-GPU Binding Audit

## Scope

This pass audits the presentation path from canonical current time to Three.js current glyph buffers. It does not change `OceanCurrentField4D`, current physics, glider motion, scoring, planner behavior, or mission generation.

## Finding

The canonical current sampler already produced depth- and time-dependent vectors, but the renderer cache signature did not explicitly include the resolved current presentation time or source interpolation frame. That made screenshot review ambiguous and could let presentation caches treat distinct current frames as equivalent.

## Implemented Contract

- `CurrentPresentationState` exposes `resolveCurrentPresentationTimeSeconds()` and `currentSourceTimeFrameSignature()`.
- `VolumetricMissionWorldViewModel` passes the resolved presentation time into `buildWaterColumnLayerExplorerViewModel()`.
- `ThreeMissionWorldRenderer` includes the current presentation time and source frame signature in the current-field frame signature.
- `ThreeInstancedCurrentGlyphLayer` records data, direction, magnitude, visibility, and matrix digests.
- Repeating the same current frame skips glyph buffer upload.
- Advancing canonical current time changes the current data/direction digest and increments upload counters.
- Density profiles are deterministic and report source, rendered, layer-filtered, and density-filtered counts.

## Density Behavior

Default balanced current density is intentionally denser than the prior conservative cap. It remains a single instanced mesh and one draw call, with no per-vector Three.js objects. Sparse mode remains available for browser-friendly low-cost review, and source-density mode is bounded for debugging.

## Claim Boundary

Three.js only visualizes canonical current samples supplied by the shared current sampler. It does not generate current fields, mutate source data, advance simulation time, or change official scoring.

## Validation Hooks

- `tools/js/smoke_current_timeline_to_gpu_binding.mjs`
- `tools/js/smoke_current_adaptive_density_classification.mjs`
- `tools/js/audit_current_timeline_to_gpu_contract.mjs`