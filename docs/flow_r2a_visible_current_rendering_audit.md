# FLOW-R2A.2 Visible Current Rendering Audit

FLOW-R2A.2 investigates a presentation-path regression where canonical currents exist and instanced glyphs are allocated, but a human cannot visibly inspect current direction and magnitude.

Pre-edit reproduction used headed Chromium at `http://127.0.0.1:9354/` with a deterministic modern FLOW-R2A fixture: 12 x 8 grid, five depth layers, valid 4D synthetic current cube, one routed Glider 1, idle Glider 2/3, bathymetry, water-column slabs, scalar field, and oblique Simulation camera. Initial screenshots were captured under `test-results/flow-r2a-2-diagnostics/`.

## First Broken Stage

The first broken stage is the glyph primitive/material visibility stage. The canonical current cube, sampler, render layer, mesh, instance count, parent visibility, bounds, and frustum test all succeed. Pixel evidence shows the enabled glyph layer changes only 82 of 1,771,200 canvas pixels, with zero strong-difference pixels. The existing `ConeGeometry(cellSize * 0.08, cellSize * 0.55, ...)` is then scaled again by small world-scale width/length values, making the final glyph footprint too small to inspect. The mesh also lacked explicit render order, display offset, bounds diagnostics, and pixel-level acceptance.

| Stage | Expected | Actual | Evidence | FLOW-R2A.2 action |
|---|---|---|---|---|
| 1. Current field exists | Valid 4D current cube | Present | `currentFieldId=synthetic-current-cube-12x8x5x3`, depth count 5, time count 3 | Preserve canonical field path |
| 2. Sampler returns finite nonzero U/V | Finite active currents | Present | `ANCHOR_VOLUMETRIC_CURRENT_DEBUG.selectedSourceCurrent` finite, magnitude 0.119316 m/s | Preserve sampler path |
| 3. Render samples generated | Nonzero active slice vectors | Present but underreported in old debug | renderer summary `currentVectorCount=96`; glyph instances 96 | Add explicit compact sample counts |
| 4. Samples attached to Simulation VM | Simulation VM receives current data | Present | `viewModel.currentVectorCount=96`, active layer thermocline | Add current visualization summary fields |
| 5. Three renderer receives samples | Renderer gets water-column explorer/current layers | Present | `lastRenderedCurrentFieldFrameId` includes current digest | Preserve renderer path |
| 6. Current layer constructed | Instanced layer exists | Present | `glyphBufferAllocationCount=1` | Preserve instancing |
| 7. Instance count assigned | Visible count > 0 | Present numerically | `glyphInstanceCount=96`, mesh count 96 | Add visible/pixel checks |
| 8. Instance transforms finite | No invalid vectors | Present | `invalidVectorCount=0`, bounds finite | Add bounds/debug fields |
| 9. Color/opacity visible | Strong contrast and readable size | Broken | opacity 0.86 but pre-edit pixel diff only 82 pixels; strong diff 0 | Replace double-scaled primitive with unit arrow geometry, stronger material/default scale |
| 10. Mesh/group visibility true | Visible flags true | Present | mesh/group/parent all true | Keep and expose flags |
| 11. Camera frustum contains bounds | In frustum | Present | bounds center `[0,-1.496,0]`, radius 6.596, `inFrustum=true` | Expose frustum diagnostics |
| 12. Not hidden behind slabs | Current glyphs should render above scalar/slabs | Weak/ambiguous | renderOrder 0 while slab/scalar route policy uses explicit orders | Add render order and slab-normal offset |
| 13. Shader/material visible fragments | Meaningful canvas pixels | Broken | WebGL pixel read: diff 82 / 1,771,200, ratio 0.000046, strong diff 0 | Add pixel-evidence helper and E2E assertions |
| 14. Pixels visibly differ when enabled | Human-visible current field | Broken | Owner screenshot and pre-edit pixel evidence | Headed owner-review package with pixel metrics |

## Safe-Mode Baseline

Normal URL resolved `currentDisplay=normal`, launch debug `safeCurrentDisplayMode=false`, and glyph presentation was requested. Explicit `?currentDisplay=safe` is handled separately in FLOW-R2A.2 tests and must not persist into later normal missions.

## Boundaries

This audit does not change current physics, glider motion, scoring, route planning, runtime shell, Phaser ownership, or current-cube authority. Three.js remains presentation-only for current glyphs.