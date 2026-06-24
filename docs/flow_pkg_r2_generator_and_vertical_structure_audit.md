# FLOW-PKG-R2 Generator And Vertical Structure Audit

FLOW-PKG-R2 audited the production current chain before changing default generation. The goal was to determine whether equal-looking vectors across depth came from canonical generation, sampling, render flattening, or display scaling.

## Ownership Table

| Capability | Current owner | Proposed owner | R2 action |
|---|---|---|---|
| CurrentField4D contract, sampler, source metadata, diagnostics | `packages/currents` | `packages/currents` | Preserved package authority. |
| Bathymetry-conditioned current generation | `src/core/science/BathymetryConditionedCurrentBuilder.js` | `packages/currents/src/generation/` | Moved implementation into package with an app compatibility forwarder. |
| V2 legacy generated-current behavior | app-side generator path | `packages/currents/src/generation/BathymetryConditionedCurrentBuilder.js` | Preserved as `cpuBathymetryConditionedSyntheticV2` with exact parity. |
| V3 depth-structured generated-current behavior | not present as a versioned backend | `packages/currents/src/generation/` | Added `cpuBathymetryConditionedSyntheticV3`. |
| Vertical-current profile contract | implicit coefficients | `packages/currents/src/generation/CurrentVerticalProfileContract.js` | Added named deterministic profile families. |
| Current sampling by x/y/z/t | `packages/currents` sampler, app adapter | `packages/currents` | Preserved; simulation/renderers consume canonical samples. |
| Three.js glyph display | `src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js` | app renderer | Preserved as presentation only. |
| Layer explorer profile display | `src/core/rendering/WaterColumnLayerExplorerViewModel.js` | app rendering view model | Extended selected-column profile fields; no physics ownership. |

## Fixed-Column Findings

The pre-R2 production generator did not flatten depth in the sampler or renderer. It generated separate depth layers, and the sampler/render path could expose different U/V values. The owner-visible problem was that the old production generator's canonical depth variation was weak enough to look uniform in common views.

Representative pre-R2 science audit values:

| Metric | V2 observed value |
|---|---:|
| Maximum fixed-column depth vector difference | `0.009561 m/s` |
| Vertical shear RMS | `0.000488` |
| Mean speed | `0.142558 m/s` |
| Temporal change RMS | `0.149366` |

Classification: `WEAK_DEPTH_VARIATION`, not `SAMPLER_FLATTENED` and not `RENDER_FLATTENED`.

## First Broken Stage

The first broken stage was scientific/presentation strength in the V2 generator: canonical depth variation existed but was usually too small to read visually. The render path was checked separately with `smoke_current_render_depth_parity.mjs`, which compares per-depth rendered U/V to canonical sampler output.

## R2 V3 Sample Column

A deterministic V3 full-depth wet column selected for browser tests produced materially different values at one x/y/time:

| Depth m | U east m/s | V north m/s | Magnitude m/s |
|---:|---:|---:|---:|
| 0 | `0.078292` | `0.129325` | `0.151177` |
| 10 | `0.061898` | `0.159452` | `0.171045` |
| 35 | `0.021997` | `0.257230` | `0.258169` |
| 75 | `0.081191` | `0.121106` | `0.145803` |
| 150 | `0.015508` | `0.009174` | `0.018018` |

This is coherent model-based vertical structure, not random slab noise.

## Debug Contract

`ANCHOR_VOLUMETRIC_CURRENT_DEBUG` now exposes compact package metadata:

- `generatorBackend`, `generatorVersion`
- `verticalStructureId`, `verticalStructureVersion`, `verticalProfileFamilies`
- `depthAxisMeters`, `depthLayerDigests`
- `selectedColumnProfile`
- `verticalShearRms`, `verticalShearMax`
- `surfaceToDeepVectorDifferenceRms`, `surfaceToDeepBearingDifferenceMean`
- `verticallyUniformColumnFraction`, `materiallyDistinctColumnFraction`
- `canonicalDepthDistinctnessPass`, `renderDepthParityPass`, `samplerDepthParityPass`
- `barotropicControl`
- `rendererOwnsVerticalStructure: false`
- `displayChangesVerticalStructure: false`

The debug object remains compact and does not expose complete current cubes.