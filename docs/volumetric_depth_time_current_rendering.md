# Volumetric Depth-Time Current Rendering

The canonical current field is `F(x, y, z, t) = <u, v>` in local east/north/down coordinates. FLOW-R2A.3 does not fabricate vertical water velocity for visual effect.

Rendering modes:

- Active Slice: one physical current depth at full density.
- Stacked Depth Field: multiple physical depths in one instanced glyph family.
- Exploded Depth Field: multiple depths with presentation-only separation.
- Sparse Volumetric Field: sparse vectors across valid wet `x/y/z` locations.

Vertical exaggeration and display mode do not change sampler output, glider drift, scoring, or route validity. Surface arrows are only one possible view of the 4D current cube.
