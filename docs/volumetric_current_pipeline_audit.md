# Volumetric Current Pipeline Audit

FLOW-R2A extends the DIVE-R1.1 water-column stack with one canonical current cube:

```text
F(x, y, z, t) = <u, v>
```

`u` is eastward water velocity and `v` is northward water velocity in meters per second. `z` is physical depth/immersion, positive down. `t` is canonical mission time. `w` remains absent or zero unless a source explicitly supplies vertical water velocity.

| Pipeline stage | Representation | Depth-aware | Time-aware | FLOW-R2A action |
|---|---|---:|---:|---|
| Legacy generated frames | `frame.current[y][x]` or vector list | No | Sometimes by frame | Adapt into a 4D cube with legacy surface behavior preserved. |
| Water-column explorer | DIVE-R1.1 layer entries | Yes for science layers | Limited | Extended with current samples, current stats, and selected-location current profile. |
| Simulation `TruthWorld` | `world.sampleCurrent(x,y,t,depth)` | Yes | Yes | Uses `sampleOceanCurrent` against the canonical current cube before legacy fallback. |
| Three current rendering | Legacy line+cone per vector | Partly by layer | Frame signature only | Uses instanced glyphs when current-cube data is available. |
| Headless/browser parity | Shared ES modules | Yes | Yes | `OceanCurrentField4D` and `OceanCurrentFieldSampler` are DOM-free and Node-safe. |

First flattening point before FLOW-R2A: `ThreeCurrentVectorLayer` converted sampled current vectors into one line and one cone object per displayed vector. That was a presentation flattening and object-count problem. FLOW-R2A keeps the field authority outside Three.js and uses `ThreeInstancedCurrentGlyphLayer` for presentation.

Current wet masking comes from the synthetic adapter's wet mask derived from terrain and bottom depth. Bathymetry masking prevents samples below seabed and hides slab glyphs where the local water column is too shallow.

Synthetic fixtures are HYCOM-style educational current cubes, not HYCOM data, not Marine Copernicus data, and not calibrated operational forecasts.
