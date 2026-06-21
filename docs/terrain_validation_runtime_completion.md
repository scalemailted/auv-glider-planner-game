# THREE-R1.2C.1 Terrain Validation Runtime Completion

THREE-R1.2C.1 completes the runtime side of the terrain-aware validation contract without changing official mission scoring, route planning, or renderer authority.

## Authority Boundary

Launch validation is a frozen prediction captured at Execute. It records the terrain validation version, digest, readiness status, issue summary, predicted clearance, predicted maximum depth, predicted target coverage, and predicted terrain risks. Runtime terrain diagnostics are based on canonical actual state from the simulation step boundary. Visual interpolation, camera movement, quality settings, labels, vertical exaggeration, and Three.js presentation state cannot create terrain events or change validation digests.

Terrain events are public, deterministic simulation diagnostics. They explain execution outcomes and do not modify official score. Three.js may display terrain issues and trajectories, but it does not own validation, simulation, scoring, replay semantics, or canonical terrain-event creation.

## Runtime Diagnostics

`src/core/simulation/TerrainSimulationDiagnostics.js` tracks actual minimum clearance, maximum actual depth, bottom-turn and layer-crossing counts, low-clearance and violation counts, terrain-limited dives, coastline-risk counts, per-agent summaries, per-segment summaries, actual target coverage, and terminal terrain context.

Actual clearance is computed from canonical x/y/depth state:

```text
clearance = sampleBathymetryContinuous(actualX, actualY) - actualDepthMeters
```

The diagnostics module is pure JavaScript and contains no Phaser, Three.js, DOM, filesystem, planner, or scoring dependency.

## Canonical Terrain Events

Supported runtime event types are:

```text
anchor.simulation.terrain-clearance-warning
anchor.simulation.terrain-clearance-violation
anchor.simulation.terrain-limit
anchor.simulation.coastline-risk
anchor.simulation.target-coverage
```

Events carry deterministic ids, mission/agent/segment/target context, canonical tick/time, actual position/depth, bottom depth, clearance, severity, issue code, public visibility, and boundary flags. Persistent warning/violation conditions are transition-aware: entry emits an event, persistence updates summaries without duplicate events, exit closes the active condition, and re-entry emits a new deterministic event.

## Export, Replay, and Headless Alignment

`anchor.result` exports now preserve compact launch/actual/comparison terrain validation data, `actualTerrainDiagnostics`, and compact public `terrainEvents`. They do not duplicate full bathymetry grids, terrain meshes, or hidden truth.

Replay artifacts include terrain events as canonical ordered public replay events. Replay checkpoints retain a compact terrain event summary and minimum actual clearance observed through that checkpoint. Public replay remains observation playback and does not recompute simulation physics.

Node/OceanBox-JS headless episodes use the same portable terrain diagnostics where bathymetry and depth tracks exist. When equivalent inputs are unavailable, headless outputs use explicit unsupported/null status rather than fabricating parity.

## QA Boundary

Automated checks cover deterministic runtime diagnostics, event deduplication, finish-instantly preservation, result roundtrip, replay alignment, debrief comparison source coverage, and renderer-authority boundaries. Human manual QA remains separate from headed automated QA.

Human manual QA by the project owner remains pending.
