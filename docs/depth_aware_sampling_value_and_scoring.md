# Depth-Aware Sampling Value and Scoring

THREE-R1.2A.2 adds a portable depth-aware science-value contract for the simplified 2.5D water column.

## Core Rule

Science value is credited from actual observations at `x,y,depthLayer,time`. A top-down integrated priority value is a planning summary and is not automatically awarded to a surface sample.

## Profiles

- `legacySurfaceScienceV1`: preserves imported surface-only missions and historical horizontal-cell sample scoring.
- `depthAwareScienceV1`: generated volumetric missions can select this profile to credit actual depth-layer samples.

Profile metadata includes `scoreProfileId`, `scoreProfileVersion`, `depthAware`, `layerSchemaVersion`, and `objectiveWeightProfileId`.

## Value Components

`DepthAwareScienceValue.js` reports:

- `baseDepthPriority`
- `objectiveMatchValue`
- `informationGainValue`
- `discoveryValue`
- `forecastValidationValue`
- `boundaryValue`
- sensor, measurement, novelty, spatial, temporal, and vertical redundancy factors
- target-layer overlap
- vertical-coverage contribution

## Feasibility

`DiveProfileFeasibility.js` reports whether a requested profile/depth is limited by segment length, segment duration, mission time, vehicle rating, profile max depth, bathymetry, bottom clearance, energy, or no active limit.

The feasibility result is diagnostic and renderer-neutral. Three.js may display it, but it does not own scoring, route feasibility, field generation, or simulation state.

## Browser And Headless

Browser simulation records canonical `anchor.score.depth-aware-sample` events for depth-aware missions. Node/OceanBox-JS uses the same portable evaluator for headless depth-science summaries and bundle artifacts.

## Not Claimed

This is not a calibrated ocean forecast, not full 3D free-flight route planning, not a WebGPU fluid simulator, not MARL/RL, and not production glider control.
