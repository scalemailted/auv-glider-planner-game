# Instanced 3D Current Slabs

FLOW-R2A uses `ThreeInstancedCurrentGlyphLayer` for current vectors.

Coordinate mapping:

- eastward `u` maps to Three mission world X
- northward `v` maps to Three mission world Z
- physical depth maps to Three world Y through the existing mission coordinate transform

Glyph orientation uses U/V direction. Glyph length uses speed magnitude. Direction and magnitude are not conflated.

The layer uses one shared glyph geometry and one material family with `InstancedMesh`. It does not create an object per vector and does not create an independent renderer, camera, resize lifecycle, or RAF loop.

Display units are m/s. Display settings such as active slice, stacked slabs, exploded slabs, density, magnitude scale, and color mode do not change the current cube, plan, simulation, score, or replay digest.
