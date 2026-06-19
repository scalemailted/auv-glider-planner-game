# Three.js Execute and Simulation Parity

THREE-R1.1D hardens the Planning -> Execute -> Simulation -> Debrief path. Three.js remains a renderer and input surface. Phaser still owns scene lifecycle, and the portable simulation engine owns time, vehicle motion, observations, scoring, terminal state, and result creation.

## Manual Execute Failure

The headed reproduction for `tutorial_01_first_deployment` confirmed that the visible Execute control was present and enabled after deployment plus two waypoints. The tutorial route transitioned to Simulation, initialized the canonical engine, and Step advanced time. The production gap was not a missing click handler in that fixture; it was the lack of a clone-safe launch payload, execution transaction, and digest chain proving Planning, SimulationScene, and the engine consumed the same canonical plan.

## Execute Transaction

`src/core/simulation/MissionExecutionTransaction.js` defines a public-safe transaction with stages from `executeRequested` through `debriefRequested` or `failed`. `ANCHOR_EXECUTION_DEBUG` exposes stage, control, digest, engine, renderer, result, and boundary fields without DOM, Phaser, Three, functions, circular references, or hidden truth.

## Canonical Plan Snapshot

`MissionWorkspaceScene.executePlan()` now builds a clone-safe execution snapshot before launch. The snapshot preserves selected starts, agent ownership, waypoint IDs, waypoint order, actions, timing fields, depth/dive metadata where present, benchmark/adaptive metadata, replay metadata, fairness/source metadata, and seed/config metadata. Planning markers remain non-executable.

## Launch Validation

The existing `validatePlanForExecution()` remains the canonical pre-simulation validator. Invalid deployment, unknown agents, invalid starts, non-finite coordinates, blocked terrain, invalid timing, invalid schema, and no executable route remain hard blockers. Over-duration waypoints that current runtime semantics intentionally carry to mission end remain warnings.

## SimulationScene Initialization

`SimulationScene.init(data)` receives an `anchor.simulation.launch-payload`. `create()` normalizes the payload, applies the payload level/mission/plan to app state, initializes the canonical `SimulationEngine`, records plan digests, then mounts the Three simulation renderer from canonical state.

## Canonical Engine Ownership

The simulation flow is still:

```text
SimulationEngine step -> canonical simulation state -> SimulationWorldStateAdapter -> SimulationWorldRenderViewModel -> ThreeMissionWorldRenderer.update()
```

Three.js does not step the engine, move gliders authoritatively, generate observations, score, or mutate simulation state.

## Three Renderer Ownership

Three.js owns only presentation: camera, layer visibility, selection/inspection, public render objects, and visual interpolation-ready data. Boundary flags remain false for execution, simulation state, scoring, hidden truth, route optimization, RL, and MARL ownership.

## First-Step Behavior

`SimulationScene.stepOnce()` and the update loop record `firstStepCompleted` when the canonical engine step count increases. Debug fields report time, step count, trajectory count, observation count, active agents, and exact engine status.

## Live Vehicle State

Three glider objects update from `SimulationWorldStateAdapter` and `SimulationWorldRenderViewModel`: position, depth, heading, selected state, status, energy fraction, target/progress state, surfacing/communication events, and route/failure overlays come from canonical engine state.

## Planned Versus Realized Route

Planned routes come from the executable launch plan. Realized trajectories come from engine agent history. The renderer does not reconstruct actual motion from planned lines.

## Waypoint Progress

Waypoint completion, misses, and failures are canonical engine/plan-executor state. Debug fields expose canonical/right-panel/timeline status counts so tests can catch display drift.

## Observations and Sampling

Observation markers come from canonical simulation events. Hidden truth remains excluded from fair simulation render inputs and view models.

## Energy, Progress, Performance UI

The Simulation Console, performance strip, right waypoint panel, and timeline read engine summary/state. Three.js renders the spatial view only.

## Surfacing and Replanning

Surfacing, communication, import/export, route-segment updates, and replanning remain SimulationScene/core workflows. Three renders markers and inspection targets but does not auto-replan.

## Route Failure and Recovery

Route failure decisions remain canonical engine decisions with SimulationScene recovery actions. Three renders failure markers/segments and selected-object inspection only.

## Terminal Result and Debrief Flow

Terminal state records `terminal`, builds the canonical result once for debug accounting, disposes the renderer through scene shutdown, and starts Debrief once through the existing Phaser scene transition. R1.1D also fixes a fast-finish ordering bug where `resultBuilt` could be recorded before `terminal`, causing a later transaction-stage error when Debrief was clicked. The Finish watchdog now measures canonical engine chunk time before render refresh so Three render cost cannot change terminal outcome versus the diagnostic legacy renderer.

## Legacy Versus Three Deterministic Parity

`SimulationRendererParity.js` compares canonical execution summaries while excluding camera, hover/selection, renderer metadata, frame cadence, and interpolation. If both modes use the shared engine, canonical differences should be empty.

## Deferred Terrain and Depth-Slab Work

THREE-R1.1D does not add bathymetric terrain surfaces, operational depth/control slabs, replay/editor migration, new engines, new planners, stochastic uncertainty, or scoring changes.