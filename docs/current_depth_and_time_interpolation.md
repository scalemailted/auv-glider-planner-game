# Current Depth and Time Interpolation

`sampleOceanCurrent` is the canonical current sampler.

It supports:

- nearest sampling
- bilinear horizontal interpolation
- linear depth interpolation
- linear time interpolation
- combined 4D interpolation
- categorical nearest wet-mask sampling

The sampler returns U, V, optional W, speed, bearing, depth/time interpolation indices and fractions, wet/masked state, below-bottom state, outside-domain state, and source metadata.

Sampling depends on canonical x/y/depth/time only. It does not depend on visible slab spacing, exploded display mode, or vertical exaggeration.

## FLOW-R2A.3 Update

Current samples expose `lowerDepthMeters`, `upperDepthMeters`, `depthInterpolationFraction`, `lowerTimeSeconds`, `upperTimeSeconds`, and `timeInterpolationFraction`. The canonical sampler owns these brackets for both rendering and glider-current parity checks.
