# Water Column Layer Explorer

The water-column layer explorer is a renderer-neutral view model for inspecting depth-specific science, current, uncertainty, and derived fields.

Layer modes include Active Slice, Stacked Slabs, Exploded Slabs, Integrated Water Column, Vertical Profile, Layer Difference, and Vertical Gradient. Integrated Water Column is a derived summary, not a physical depth plane.

Changing the active layer, variable, comparison layer, vertical exaggeration, opacity, labels, or slab mode must not mutate the plan, simulation state, result digest, science truth, current fields, terrain validation, or score.

Three.js renders the explorer output but does not own science, current, sampling, planning, simulation, or scoring semantics.
