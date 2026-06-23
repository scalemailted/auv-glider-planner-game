# FLOW-R2A.5 Current Dynamics Audit

FLOW-R2A.5 closes scientific behavior gaps in the production current path. Visible vectors alone do not establish a scientifically valid current field; the normal generated Challenge path now has a canonical 4D current source, depth/time variation, magnitude-sensitive glyphs, calm-region handling, and spatial-coherence diagnostics.

## A. Depth Pipeline

| Stage | Expected | Actual | Evidence | First broken stage |
| ----- | -------- | ------ | -------- | ------------------ |
| source depth axis | At least five operational source depths | `[0, 10, 35, 75, 150]` m | `smoke_production_current_depth_distinctness` | Not broken after fix |
| source depth fields | Midwater/deep contain wet vectors where bathymetry permits | All five layers have wet samples | stacked glyph depth IDs include surface, shallow, thermocline, midwater, deep | Previously broken at bathymetry resampling |
| sampler | Physical depth controls sampled U/V | fixed x/y depth distinctness = 5 | smoke depth distinctness | Not broken |
| layer explorer | Each layer samples its own physical depth | per-layer sample counts are nonzero for all five layers | `smoke_current_stacked_depth_render_samples` | Not broken |
| renderer | Multiple physical depths are visible | stacked and sparse modes show five depth IDs | glyph summaries | Not broken |

Root cause fixed: regional bathymetry source arrays were higher resolution than the current grid. The current builder cropped the upper-left bathymetry region instead of resampling across the whole regional domain, so 75 m and 150 m layers were globally below-bottom. `normalizeBottomDepth` now resamples source bathymetry over the current grid.

## B. Time Pipeline

Source times are `[0, 200, 400, 600]` seconds for the normal generated fixture. Canonical sampling at a fixed wet x/y/depth produces four distinct U/V vectors. Timeline evolution comes from source time interpolation through `OceanCurrentFieldSampler`; Three.js does not use an independent visual clock.

## C. Magnitude Pipeline

Canonical U/V remains physical m/s. Current samples now expose `magnitudeMetersPerSecond`, `displayMagnitudeNormalized`, `displayGlyphLengthWorld`, and `calm`. Glyph length uses a bounded square-root display transform from physical speed. Calm vectors are counted but do not create arbitrary directional arrows.

Observed normal generated metrics from smokes:

- physical speed min/mean/max: `0.00004 / 0.145225 / 0.38862` m/s
- calm vector count: `2233`
- stacked glyph length min/mean/max: approximately `0.195 / 0.682 / 0.940` cell units
- magnitude bins: `8+`

## D. Spatial-Coherence Pipeline

The normal synthetic field uses named low-frequency components, not independent cellwise random directions. Bathymetry constrains wet volume, coastline projection, isobath steering, and localized canyon exchange; it does not imply generic downhill flow.

Diagnostics from the normal generated path:

- spatial autocorrelation: `0.906167`
- cellwise direction-noise score: `0.065443`
- low/high frequency energy fraction: `0.953083 / 0.046917`
- along/cross isobath fraction: `0.831492 / 0.426791`
- land and below-bottom vectors: `0 / 0`

## Claim Boundary

Scientifically constrained synthetic current field. Not a calibrated ocean forecast. Not real HYCOM or Marine Copernicus data. Real HYCOM/Copernicus claims require attributed imported fixtures.

## Detailed B/C/D Pipeline Tables

### B. Time pipeline table

| Stage | Expected | Actual | Evidence | First broken stage |
| ----- | -------- | ------ | -------- | ------------------ |
| source time axis | At least four canonical source times | `[0, 200, 400, 600]` s | `smoke_production_current_time_distinctness` | Not broken after fix |
| source time frames | Time-dependent frames differ where declared | fixed wet x/y/depth reports four distinct vectors | source time smoke/audit | Previously under-proven in debug |
| canonical mission time | Planning/simulation timeline owns current time | sampler uses mission seconds; no wall-clock shader time | timeline buffer smoke | Not broken |
| sampler interpolation | midpoint has finite bracket and fraction | interpolation fraction between source times | time smoke | Not broken |
| render cache key | current buffers update on time dirtiness only | camera-invariant buffer audit passes | timeline buffer smoke | Not broken |
| instance attributes | U/V, magnitude, calm attributes update with time | buffer update count changes on time step, not camera movement | render audit | Not broken |

First broken stage before FLOW-R2A.5 was debug/proof, not sampler authority: the normal debug path sampled a dry/below-bottom center point and did not prove source-time distinctness. The source now has stronger low-frequency temporal components and debug selects a wet source point.

### C. Magnitude pipeline table

| Stage | Expected | Actual | Evidence | First broken stage |
| ----- | -------- | ------ | -------- | ------------------ |
| canonical U/V | Physical velocity in east/north m/s | speed min/mean/max `0.00004 / 0.145225 / 0.38862` | magnitude smoke | Not broken |
| physical speed | Speed derived from canonical U/V | finite speed bins across domain | magnitude distribution smoke | Not broken |
| view-model magnitude | Samples expose physical and display fields | `displayMagnitudeNormalized`, `displayGlyphLengthWorld`, `calm` | glyph scaling smoke | Previously broken at view-model/export surface |
| instance scale | Glyph length varies by physical speed | glyph min/mean/max about `0.195 / 0.682 / 0.940` | glyph scaling smoke | Previously broken at renderer scaling/summary proof |
| calm handling | Calm vectors receive no arbitrary direction | calm count > 0 and calm samples omitted from directional instances | calm-region smoke | Previously broken at renderer interpretation |

First broken stage before FLOW-R2A.5 was presentation attributes: the canonical field had different speeds, but the layer/view-model did not expose enough display fields and glyph scaling made speeds look nearly uniform.

### D. Spatial-coherence pipeline table

| Stage | Expected | Actual | Evidence | First broken stage |
| ----- | -------- | ------ | -------- | ------------------ |
| field equations | Named low-frequency coherent components | streamfunction-family synthetic components declared | streamfunction component smoke | Previously too weakly documented |
| source-grid values | Neighboring vectors form coherent regions | autocorrelation `0.906167`, noise `0.065443` | spatial coherence audit | Not broken after fix |
| bathymetry treatment | Land/below-bottom vectors masked; cross-shelf flow declared | land/below-bottom `0/0`, canyon exchange counted | bathymetry audit | Not broken after fix |
| interpolation | Sampler returns deterministic continuous values | depth/time interpolation smokes pass | sampler/audit chain | Not broken |
| neighboring structure | No cellwise direction mosaic | low/high frequency energy `0.953083 / 0.046917` | no-cellwise-random audit | Not broken after fix |
| visible structure | Stacked/sparse views sample canonical field | multi-depth render smokes pass | stacked/sparse smokes | Not broken |

First broken stage before FLOW-R2A.5 was source construction and diagnostics: the production path lacked a sufficiently explicit coherent component contract and had no diagnostic able to reject a mosaic-like direction field.
