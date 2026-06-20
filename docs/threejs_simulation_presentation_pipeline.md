# Three.js Simulation Presentation Pipeline

THREE-R1.2A.4.3 introduces a browser-side presentation scheduler for live Simulation.

Canonical simulation stepping remains owned by `SimulationEngine` and `SimulationScene`. The scheduler owns only presentation timing: latest public snapshot publication, dirty categories, coalesced presentation requests, and debug counters. It does not step the engine, score samples, generate observations, plan routes, expose hidden truth, or change quality-dependent canonical behavior.

## Data Flow

```text
fixed-step canonical simulation
-> latest public simulation snapshot
-> presentation dirty-category mask
-> incremental Three layer updates
-> at most one browser presentation update per consumed frame
```

Presentation requests may be coalesced. Canonical events may not be dropped. Observations, surfacing events, route failures, waypoint completion, score events, communication events, and terminal events remain canonical engine events first, then are presented from the accumulated public state.

## Dirty Categories

The Simulation scheduler tracks: `vehiclePose`, `simulationStatus`, `realizedTrajectory`, `observations`, `surfacingEvents`, `routeStatus`, `plannedRoute`, `samplingTargets`, `scalarField`, `currentVectors`, `waterColumn`, `bathymetry`, `selection`, `labels`, `hud`, `rightPanel`, `timeline`, and `performanceDebug`.

Routine motion snapshots dirty vehicle pose and status, plus realized trajectory only when a new trajectory point exists. Scalar and current presentation updates are gated by field-frame signatures. Camera-only interaction does not dirty canonical adapters, field textures, route geometry, sampling targets, or panels.

## Incremental Layers

Realized trajectories use stable line objects with growable position buffers. Observation and surfacing markers use keyed object maps. Renderer summaries expose append/reuse/rebuild/skip counters so browser tests can detect presentation regressions without changing mission semantics.

## Finish Instantly

`Finish Instantly` runs bounded canonical engine chunks, publishes latest snapshots, consumes coalesced presentation frames, and renders final state. It tracks engine milliseconds separately from presentation milliseconds.

## Quality Profiles

Performance, Balanced, and High remain presentation profiles only. They may affect visual density or display resolution, but not engine steps, canonical trajectory, observations, score, energy, route status, or result digest.

Human manual QA by the project owner remains pending.

## THREE-R1.2A.4.4 Presentation Cadence Contract

Canonical simulation cadence is independent of presentation cadence. Performance quality profiles affect rendering only. The simulation engine remains authoritative for time, vehicle motion, observations, scoring, waypoint status, replay, and result export.

Balanced simulation presentation is bounded at 30 Hz. Performance uses 20 Hz and High may present up to 60 Hz. These limits are presentation caps, not engine step-rate changes. Pausing and stepping snap to exact canonical state; no score, energy, event timestamp, observation, bottom-clearance, route-completion, or replay data is interpolated.

Context-slab LOD does not alter water-column science. Reducing transparent overdraw does not remove canonical layers. Surface waypoints and sampling targets preserve their existing semantics.
