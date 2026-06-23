# Current Field Cache and Hot Path

FLOW-R2A.1 keeps the canonical 4D current field authoritative while reducing launch and sampling cost.

## Ownership

- Current authority: `src/core/science/OceanCurrentField4D.js`
- Mission-world current source adapter: `src/core/science/SyntheticCurrentCubeAdapter.js`
- Hot sampler: `src/core/science/OceanCurrentFieldSampler.js`
- Simulation consumer: `src/core/sim/TruthWorld.js`
- Presentation consumer: `src/core/rendering/WaterColumnLayerExplorerViewModel.js`
- Glyph presentation: `src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js`

Three.js only visualizes current samples. It does not generate, normalize, mutate, or score the canonical current field.

## Launch Contract

For one mission launch, browser debug counters should remain bounded:

- `currentCubeBuildCount <= 1`
- `currentCubeNormalizeCount <= 1`
- `currentSamplerCreateCount <= 1`

`globalThis.ANCHOR_SIMULATION_LAUNCH_DEBUG` exposes these counters along with current dimensions, estimated memory, stage timings, renderer counts, and warnings/failures.

## Hot Sampling Contract

`TruthWorld.sampleCurrent` and prepared sampler calls must not:

- rebuild the synthetic current cube
- normalize the current cube
- compute full-field digests
- clone the full current cube
- allocate per-sample render objects

Use `getOceanCurrentSampler(field)` or a prepared sampler created outside the simulation loop. The focused guard is `tools/js/smoke_current_sampler_hot_path.mjs`, which runs 100000 samples and checks that field normalize/digest counters stay at zero after the hot-loop reset.

## Render Sampling Contract

Display paths may cache compact sampled slices for glyphs. They must not treat camera moves or active-layer toggles as a reason to rebuild the canonical current cube. The focused guard is `tools/js/smoke_current_render_sample_cache.mjs`.

## Compatibility

Legacy surface-only missions remain supported as explicit single-depth current fields. Multi-depth missions use depth/time-aware `F(x,y,z,t)=<u,v>` samples in meters per second.