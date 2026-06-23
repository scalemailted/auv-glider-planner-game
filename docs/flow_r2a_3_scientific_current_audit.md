# FLOW-R2A.3 Scientific Current Audit

This audit was written before the FLOW-R2A.3 implementation changes. It captures where the R2A.2 stack already has a canonical 4D current authority and where the browser presentation path still flattened the result into a mostly single-slab view.

| Concern | Current implementation | Evidence | Scientifically adequate | R2A.3 action |
|---|---|---|---:|---|
| Source depth levels | Synthetic fixture supports multiple depths, usually 5 in focused tests. | `createSyntheticCurrentCubeFixture()` uses `[0, 15, 35, 75, 150]`. | Partial | Preserve nonuniform axes and add standard generated source metadata and diagnostics. |
| Source time levels | Synthetic fixture supports multiple times, usually 3 in focused tests. | `createSyntheticCurrentCubeFixture()` uses `[0, 600, 1800]`. | Partial | Standard synthetic builder should use at least four source times when mission duration is available. |
| Distinct values by source depth | Existing adapter applies depth scale/rotation/shear. | `depthFactor()` changes `u/v` by layer. | Partial | Replace arbitrary visual preset with documented bathymetry-conditioned components and manufactured benchmarks. |
| Distinct values by source time | Existing adapter applies a time pulse. | `pulse = sin(time / duration * 2pi + depth...)`. | Partial | Make time evolution explicit in source metadata and diagnostics. |
| Render samples actual source depth | Explorer samples the canonical cube at each layer representative depth. | `currentLayerFromCube()` calls `sampleOceanCurrent(... depthMeters: representativeDepthMeters ...)`. | Yes | Add physical bracket metadata and debug evidence. |
| Render samples canonical mission time | Explorer passes `activeTimeSeconds` into `sampleOceanCurrent`. | `buildWaterColumnLayerExplorerViewModel()` carries `activeTimeSeconds`. | Yes | Add time bracket metadata and current frame digest debug fields. |
| Stacked mode vectors at multiple depths | Glyph layer only included context depths when `showContextCurrents` was true. | `includeContext = showContext && [stacked...]`. | No | Stacked/exploded/volumetric modes must select multiple depth layers directly. |
| Exploded mode vectors at multiple depths | Same presentation gate as stacked mode. | `ThreeInstancedCurrentGlyphLayer.currentSamplesForViewModel`. | No | Normalize aliases and draw context depths with lower density/opacity. |
| Context vectors duplicate surface vectors | Source explorer samples per layer, but presentation could hide all context. | Explorer has per-depth vectors; glyph selection could reduce to active layer. | Partial | Add depth-distinct diagnostics and render summaries. |
| Time changes update instance buffers | Glyph layer updates on view-model update; no diagnostic proves frame brackets. | `updateThreeInstancedCurrentGlyphLayer()` rebuilds instance matrices from current samples. | Partial | Add temporal render smoke and debug frame bracket fields. |
| Bathymetry affects masking | Current adapter uses terrain wet mask and bottom depth. | `wetMaskFromTerrain()` and sampler below-bottom masking. | Partial | Add boundary-condition module and diagnostics. |
| Bathymetry affects field generation | Existing generated base is arbitrary trigonometric field, not documented bathymetry-conditioned flow. | `generatedBase()` plus depth factor. | No | Add bathymetry-conditioned synthetic builder with named components. |
| Coastline normal velocity measured | Not measured in R2A.2. | No diagnostics module. | No | Add coastline-normal diagnostics. |
| Horizontal divergence measured | Not measured in R2A.2. | No diagnostics module. | No | Add finite-difference divergence/vorticity diagnostics. |
| Synthetic equations documented | Existing label says HYCOM-style but equations are not a formal contract. | Adapter source code only. | No | Add source metadata, component metadata, docs, and audits. |
| Benchmark expectations | No manufactured analytical catalog existed. | No catalog module. | No | Add manufactured current fields and exactness smokes. |
| Current-source claims truthful | Existing label says HYCOM-style synthetic and flags real data false. | `sourceMetadata.usesRealHycom=false`. | Partial | Replace normal generated label with required synthetic/not-forecast wording. |

## First broken stages

- Depth dependence is not lost in `OceanCurrentFieldSampler`; it is lost at the presentation-selection stage when stacked/exploded current modes are collapsed to the active layer unless `showContextCurrents` is separately enabled.
- Time dependence is not lost in the sampler or explorer; it lacked exported physical bracket metadata and a focused render/debug proof.
- Context slabs receive distinct per-layer samples in `WaterColumnLayerExplorerViewModel`; they may not be rendered because `ThreeInstancedCurrentGlyphLayer` treated context currents as an optional overlay rather than mode-owned content.
- Field generation becomes an arbitrary visual preset in `SyntheticCurrentCubeAdapter.generatedBase()` plus `depthFactor()`. It is deterministic and useful for launch tests, but it is not a documented scientific synthetic benchmark.

## FLOW-R2A.5 Superseding Note

FLOW-R2A.3 established the scientific current contract and initial diagnostics. FLOW-R2A.5 tightens the production requirement: normal generated missions must use coherent named components, at least five source depths where the mission permits, at least four source times, calm-region handling, physical magnitude glyph scaling, and spatial-coherence diagnostics. The R2A.3 HYCOM-style educational wording is superseded by: Scientifically constrained synthetic current field. Not a calibrated ocean forecast. Not real HYCOM or Marine Copernicus data.
