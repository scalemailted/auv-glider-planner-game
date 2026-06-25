# Mission Simulator Package

SIM-PKG-R1 makes `packages/mission-simulator` an active portable mission-simulation boundary. The package owns deterministic mission-state transition contracts, manifest/input/state/event/observation normalization, clone-safe snapshots, raw metric summaries, and selected pure helpers that were previously under `src/core/sim` or `src/core/motion`.

The package consumes a canonical `EnvironmentArtifact`. It does not generate scientific environment fields. It does not own route planning or route editing. It does not own official score aggregation. It produces raw metrics and events consumed by scoring, result, and replay adapters.

Play/Pause scheduling remains application-owned. Three.js presents simulation state but does not own physics. Phaser owns lifecycle/routing but does not own mission physics. Browser and headless execution use the same portable simulation kernel contract and debug/result digest shape. The model is an educational benchmark simulator, not a certified vehicle digital twin or operational navigation system.

## Dependency Boundary

Allowed dependencies:

```text
@anchor/contracts
@anchor/environment
standard JavaScript runtime APIs
```

Current implementation imports `packages/environment` for sampler creation and artifact digests. The package must not import `src/`, Phaser, Three.js, DOM APIs, renderer view models, scene lifecycle, local storage, downloads, replay playback UI, or score UI.

Dependency direction remains:

```text
contracts -> bathymetry -> currents -> scalar-processes -> environment -> mission-simulator
```

No lower scientific package may import `mission-simulator`.

## Ownership Table

| Responsibility | Current owner | Pure | Runtime coupled | SIM-PKG-R1 action |
|---|---|---:|---:|---|
| Canonical simulation-time authority | `SimulationEngine.t` plus package state seconds | Yes | Scheduler coupled | Package contracts use seconds; browser scheduler decides when to step |
| Environment identity consumed by Simulation | `level.environmentArtifact` and package input digests | Yes | No | Package input freezes environment digest/reference |
| Agent-state authority | `SimulationEngine` production agents, mirrored in package state | Partial | Yes | Package normalizes canonical agent state and snapshots |
| Route-progress authority | `PlanExecutor` and `SimulationEngine` | Partial | Yes | Retained in app for R1; package state records active waypoint/segment progress |
| Dive-state authority | `GliderDiveStateMachine` | Yes | No | Moved to package with compatibility forwarder |
| Vehicle-motion authority | `Physics`, `GliderDynamicsModel`, `GliderTrajectorySimulator` | Partial | Yes | Retained in app/headless modules for R1 to avoid behavior drift |
| Current-drift authority | Environment/currents samplers plus `Physics` application | Partial | Yes | Package consumes samplers; production drift remains unchanged |
| Scalar sampling authority | Environment/scalar samplers plus `Sampling` | Partial | Yes | Package can sample environment; production observation semantics remain unchanged |
| Observation authority | `Sampling`, headless observation modules, package normalization | Partial | Yes | Package normalizes observations and digests public records |
| Observation-noise authority | Existing browser/headless observation code | Partial | Yes | Retained outside package in R1 |
| Energy authority | Existing physics/simulation code | Partial | Yes | Package raw metrics mirror energy used; formulas unchanged |
| Surfacing-event authority | `GliderComms`, surfacing decision transactions | Partial | Yes | Package records pending decision/decision events; UI handoff remains app-owned |
| Pending surfacing-decision authority | `SimulationEngine`/planning handoff | Partial | Yes | Package snapshots pending decision metadata |
| Terrain-diagnostic authority | `TerrainSimulationDiagnostics` | Partial | Yes | Retained outside package; package raw metrics/events can carry summaries |
| Hazard authority | `MobileHazards`, terrain/hazard checks | Partial | Yes | Retained outside package; package records hazard metrics/events |
| Mission-terminal authority | `EndConditions`, `SimulationEngine` | Yes | Partial | `EndConditions` moved to package; production terminal behavior mirrored |
| Raw metrics authority | Package raw metric normalizer plus existing summaries | Yes | No | Package produces raw metric summaries consumed downstream |
| Score authority | `src/core/sim/Scoring.js` and scoring modules | Partial | Yes | Retained outside package; no score formula moved |
| Result-export authority | `ResultExporter` and `SimulationEngine.getResult()` | Partial | Yes | Result includes package debug/snapshot/digest; schema unchanged |
| Replay-event authority | Replay builders/reducers | Partial | Yes | Replay remains playback-only; package events are source material only |
| Browser execution path | Phaser/Three app plus `SimulationEngine` | Partial | Yes | Browser engine creates/syncs package simulator and debug object |
| Headless execution path | `HeadlessMissionRunner` | Partial | Yes | Headless runner creates/syncs package simulator and result digest |
| Benchmark execution path | Existing benchmark adapters | Partial | Yes | Uses existing results; package outputs are available for parity checks |
| Duplicate execution logic | Browser and headless wrappers | No | Yes | R1 converges on package contracts without rewriting all physics |

## Contracts

### Manifest

`MissionSimulationManifest` identifies the engine, backend, seed, timestep, mission duration, environment artifact digest, plan digest, vehicle configuration digest, rule blocks, observation/noise model metadata, provenance, and claim boundary.

Required claim boundary:

```js
{
  syntheticMissionSimulation: true,
  operationalVehicleCertification: false,
  certifiedNavigationSystem: false,
  calibratedVehicleTwin: false
}
```

### Input

`MissionSimulationInput` freezes the manifest, `EnvironmentArtifact`, environment artifact digest, plan, plan digest, agent configurations, selected starts, segment flight plans, duration, deterministic seed, and launch metadata. Renderer state, scene state, UI draft state, DOM references, and planning markers are excluded.

### State

`MissionSimulationState` stores canonical seconds, package/input/environment/plan digests, normalized agent states, pending decision metadata, terminal state, terminal reason, raw metrics, and a stable state digest. Depth is physical meters positive down; Three.js world Y is display-only.

### Commands

R1 exposes command-shaped entry points: `stepMissionSimulator`, `advanceMissionSimulator`, `finishMissionSimulator`, `resetMissionSimulator`, and `applyMissionSimulationDecision`. Play and Pause remain application scheduling decisions; Pause means no time-advancing package command is called.

### Events And Observations

Events and observations normalize to public-safe cloneable records with versions, ids, canonical time, agent/waypoint/segment context, payloads, visibility, and digests. Hidden truth fields are stripped from public payloads.

### Snapshot And Restore

`missionSimulationSnapshot` records input/environment/plan identity, state, events, observations, raw metrics, pending decision, terminal metadata, command-log digest, and snapshot digest. Snapshots exclude Phaser, Three.js, DOM, RAF handles, camera state, UI panel state, and full environment-array checkpoint copies.

## Production Integration

Browser production still runs through `src/core/sim/SimulationEngine.js`. SIM-PKG-R1 creates a package input/kernel during construction, resets it with the browser reset flow, syncs it after production steps, and exposes `globalThis.ANCHOR_MISSION_SIMULATOR_DEBUG` from the adapter. This preserves current glider physics, sampling, scoring, rendering, replay, and mission outcomes.

Headless execution still runs through `src/core/headless/runtime/HeadlessMissionRunner.js`. It creates the same package input/kernel shape, syncs package state from the deterministic headless route/observation output, and emits package debug/snapshot/result digests into the episode.

Compatibility forwarders remain at selected old paths:

- `src/core/sim/ContinuousGliderState.js`
- `src/core/sim/MissionRules.js`
- `src/core/sim/EndConditions.js`
- `src/core/sim/GliderDiveStateMachine.js`
- `src/core/motion/EffectiveDiveProfileResolver.js`

## Moved Modules

Physically moved or copied into `packages/mission-simulator/src/` for R1:

- `ContinuousGliderState.js`
- `MissionRules.js`
- `EndConditions.js`
- `GliderDiveStateMachine.js`
- `WaterColumnProfileRuntime.js`
- `MissionSimulationUtil.js`
- `MissionSimulationContracts.js`
- `MissionSimulationKernel.js`

## Intentionally Retained Outside The Package

The following remain outside the package in R1 to avoid behavior drift:

- browser scene lifecycle and Play/Pause button state
- Three.js rendering and renderer view models
- Phaser route/scene lifecycle
- route planning, route editing, and mission editor commands
- official score aggregation and leaderboard behavior
- replay playback/reduction
- detailed production physics and terrain diagnostics not yet isolated as pure contracts
- sensor-noise and observation-generation details still tied to existing browser/headless paths

## Validation Commands

Primary package gates:

```bash
node tools/js/audit_mission_simulator_package_dependencies.mjs
node tools/js/audit_mission_simulator_package_browser_safety.mjs
node tools/js/audit_mission_simulator_package_worker_safety.mjs
node tools/js/smoke_mission_simulator_package_contracts.mjs
node tools/js/smoke_mission_simulator_package_forwarders.mjs
node tools/js/capture_mission_simulator_package_r1_baseline.mjs
```

Capability-owned browser workflows:

- `Production Simulation Uses Package Mission Kernel`
- `Play Pause Step Finish Preserve Canonical Package Semantics`
- `Browser and Headless Share Mission Simulation Outcomes`
- `Mission Simulator Package Runs From GitHub Pages Subpath`

## Remaining Coupling

R1 does not remove all production simulation coupling. It establishes package-owned contracts, selected moved helpers, browser/headless kernel convergence, and package digests around existing behavior. A later extraction should only proceed if trajectory, observation, terminal, raw-metric, score/result, snapshot/restore, package-purity, Pages, and capability-owned release tests remain green.