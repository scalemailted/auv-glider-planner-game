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

## FLOW-R2A.5 Depth-Time Authority

Normal production current sampling now requires both a depth axis and a time axis with material variation. At a fixed wet x/y location, surface, shallow, thermocline, midwater, and deep samples can differ. At a fixed x/y/depth, canonical mission time changes can alter U/V. Pause freezes sampling, timeline scrub selects canonical time, and camera movement must not change sampled current. Rendering and glider physics both consume `sampleOceanCurrent`; Three.js does not fabricate vectors.
