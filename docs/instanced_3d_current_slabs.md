# Instanced 3D Current Slabs

FLOW-R2A uses `ThreeInstancedCurrentGlyphLayer` for current vectors.

Coordinate mapping:

- eastward `u` maps to Three mission world X
- northward `v` maps to Three mission world Z
- physical depth maps to Three world Y through the existing mission coordinate transform

Glyph orientation uses U/V direction. Glyph length uses speed magnitude. Direction and magnitude are not conflated.

The layer uses one shared glyph geometry and one material family with `InstancedMesh`. It does not create an object per vector and does not create an independent renderer, camera, resize lifecycle, or RAF loop.

Display units are m/s. Display settings such as active slice, stacked slabs, exploded slabs, density, magnitude scale, and color mode do not change the current cube, plan, simulation, score, or replay digest.

## FLOW-R2A.3 Update

Instanced current glyphs now support active-slice, stacked-depth, exploded-depth, and sparse-volumetric modes. The implementation uses a shared instanced rendering family and does not create one Three.js object per vector.

## FLOW-R2A.5 Magnitude And Calm Handling

The instanced glyph layer separates canonical speed from display scale. Samples expose physical U/V, speed, bearing, display-normalized magnitude, glyph world length, and `calm`. Calm or near-zero vectors are counted and may be hidden or shown neutrally, but they do not receive an arbitrary directional arrow. Stacked and sparse volumetric modes render multiple physical depths from the canonical cube with one shared instanced mesh family and bounded LOD.
