# THREE-R1.2C.2 Terrain-Validation Performance Recovery

THREE-R1.2C.2 closes the terrain-validation performance and browser-coverage gap before THREE-R2. It does not add route planners, new mission mechanics, scoring changes, renderer authority, calibrated ocean claims, WebGPU, fluid simulation, Python simulation, or MARL/RL.

## Runtime Contract

Planning terrain validation is event-driven and cached. The cache key is built from canonical validation inputs such as plan geometry, selected starts, dive/target configuration, terrain/constraint/current digests, vehicle configuration, mission duration, and validation implementation version. Camera movement, hover, panel scroll, quality profile, vertical exaggeration, label visibility, field opacity, route display style, and issue selection do not invalidate canonical validation.

Runtime terrain diagnostics are incremental. The simulation engine records terrain diagnostics from canonical agent state after accepted simulation steps. Normal updates process bounded new state instead of rescanning full trajectories or full event history. Full rebuilds remain limited to explicit reconstruction/audit paths.

Replay, result export, headless bundle, and roundtrip artifacts are built on demand, not during routine presentation frames. Terrain event summaries are maintained incrementally and debug objects publish compact counters rather than full event arrays or validation reports.

Three.js validation presentation updates from canonical digests. Stable issue IDs and object maps allow unchanged validation layers to reuse objects, update selected emphasis without full rebuilds, and append runtime event markers once.

## Measured Status

The prior approximately 136 ms measurement was not treated as an authoritative headed gate. It came from browser automation timing that could include headless/cadenced Playwright behavior and was diagnostic only. Headed browser performance is the authoritative gate; headless timing remains diagnostic.

Fresh focused validation in this pass confirms:

- six requested terrain-validation E2E workflows pass in one invocation: `6 passed (1.6m)`
- new lifecycle smokes pass for planning cache, incremental runtime diagnostics, event summary, Three validation layer reuse, Mission Readiness rendering, and live-loop cost boundaries
- group coverage is exact at 68 tests across `coreMission: 9`, `threePlanning: 15`, `workspaceScenario: 12`, and `executionWaterColumn: 32`

A full headed production-workflow pass and human owner manual QA remain separate gates.

## Debug Counters

Relevant debug objects expose compact counters for:

- planning validation build/cache hit/cache miss and last invalidation reason
- terrain diagnostics incremental update count, full rebuild count, last scanned trajectory/event counts
- terrain event summary increment/full rebuild counts
- Three terrain validation layer object create/reuse/dispose/update counts and digest
- Mission Readiness render counts
- result export, replay manifest/checkpoint/digest, headless bundle, and roundtrip build counts

These summaries must not clone full validation reports, full trajectories, full event arrays, full bathymetry grids, hidden truth, or recursive mission state in high-frequency paths.

Human manual QA by the project owner remains pending.