# Current Presentation Runtime Contract

FLOW-R2A.4 keeps current display state in a shared browser contract instead of scattering defaults across scenes.

## Authority

Canonical current physics belongs to the portable mission/science core:

- `OceanCurrentField4D`
- `OceanCurrentFieldSampler`
- `SyntheticCurrentCubeAdapter`
- `BathymetryConditionedCurrentBuilder`

Three.js only visualizes the sampled current vectors. It does not change drift, route validity, glider physics, scoring, or result digests.

## Presentation State

`src/core/rendering/CurrentPresentationState.js` owns the shared display normalization used by Planning, Simulation, and the gated next shell.

Modern defaults for current-enabled generated missions are:

- requested: true
- enabled: true when finite nonzero render samples reach the glyph layer
- display mode: `activeSlice`
- vector density: `balanced`
- magnitude scale: readable display default, currently `1.8`
- color mode: `speed`
- context depths: off by default
- safe mode: off unless `?currentDisplay=safe` is present

Safe mode is query-scoped. It is not persisted to localStorage, copied into launches, or inferred from a previous glyph failure.

## Debug Boundary

`globalThis.ANCHOR_CURRENT_PRESENTATION_DEBUG` exposes compact counts and state only. It does not expose the full current cube.

Required checks are source sample count, finite/nonzero count, visible instance count, glyph draw-call count, active layer/time/depth, safe-mode state, hidden reason, and boundary flags showing renderer/display/scoring ownership remains false.

## FLOW-R2A.5.2 Timeline Binding

Current presentation signatures now include the resolved canonical current time and the source interpolation frame. The renderer must treat a changed `currentPresentationTimeSeconds` or `currentSourceTimeFrameSignature` as current-buffer dirty, while repeated presentation of the same frame may skip GPU uploads.

The instanced glyph layer reports:

- `currentDataDigest`
- `currentDirectionDigest`
- `currentMagnitudeDigest`
- `currentVisibilityDigest`
- `currentMatrixDigest`
- direction/magnitude/visibility/matrix attribute versions
- source, rendered, layer-filtered, and density-filtered sample counts

Density controls are deterministic presentation budgets only. They do not resample, regenerate, or mutate canonical currents.