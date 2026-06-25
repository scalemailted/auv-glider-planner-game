# Mission Simulator Package

SIM-PKG-R2 makes `packages/mission-simulator` the authoritative mission-state transition package for ANCHOR browser, Node headless, and benchmark execution adapters. Legacy `src/core/...` runtime modules that still exist for production imports now forward to package implementations where required.

The package consumes a frozen canonical `EnvironmentArtifact` identity. It does not generate scientific environment fields. It does not own route planning or route editing. It does not own official score aggregation. It produces state, events, observations, terminal summaries, raw metrics, snapshots, and result digests consumed by scoring, result, replay, browser, and headless adapters.

Play/Pause scheduling remains application-owned. Three.js presents simulation state but does not own physics. Phaser owns transitional route/scene lifecycle but does not own mission physics. Replay review is playback-only and does not rerun mission simulation. The model is an educational benchmark simulator, not a certified vehicle digital twin or operational navigation system.

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

| Responsibility | SIM-PKG-R2 owner |
|---|---|
| Canonical mission-state transitions | `packages/mission-simulator` |
| Mission input identity and digests | `packages/mission-simulator` |
| Agent initialization and normalized state | `packages/mission-simulator` |
| Route-progress helpers and waypoint execution helpers | `packages/mission-simulator` |
| Vehicle motion and current-drift helper logic | `packages/mission-simulator` |
| Environment sampling event production | `packages/mission-simulator` |
| Terminal condition evaluation | `packages/mission-simulator` |
| Terrain runtime diagnostic helpers | `packages/mission-simulator` |
| Raw metric summaries | `packages/mission-simulator` |
| Official score aggregation | Application scoring modules outside the package |
| Play/Pause, step buttons, and scheduling cadence | Browser application adapter |
| Route planning, route editing, and mission editor commands | Browser/headless planning adapters outside the package |
| Three.js/Phaser/DOM rendering and scene lifecycle | Browser application |
| Replay playback and replay reducers | Replay adapters outside the package |
| Environment generation | Bathymetry/current/scalar/environment packages and app adapters |

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

R2 exposes command-shaped entry points: `stepMissionSimulator`, `advanceMissionSimulator`, `finishMissionSimulator`, `resetMissionSimulator`, `applyMissionSimulationDecision`, and snapshot/restore helpers. Play and Pause remain application scheduling decisions; Pause means no time-advancing package command is called.

### Events And Observations

Events and observations normalize to public-safe cloneable records with versions, ids, canonical time, agent/waypoint/segment context, payloads, visibility, and digests. Hidden truth fields are stripped from public payloads.

### Snapshot And Restore

`missionSimulationSnapshot` records input/environment/plan identity, state, events, observations, raw metrics, pending decision, terminal metadata, command-log digest, and snapshot digest. Snapshots exclude Phaser, Three.js, DOM, RAF handles, camera state, UI panel state, and full environment-array checkpoint copies.

## Production Integration

Browser production uses `src/core/sim/SimulationEngine.js` as an adapter around the package authority. The adapter schedules commands, updates UI-facing state, publishes `globalThis.ANCHOR_MISSION_SIMULATOR_DEBUG`, and keeps existing product workflows intact.

Headless execution uses `src/core/headless/runtime/HeadlessMissionRunner.js` as an artifact and workflow adapter around the same package input/kernel/debug shape.

Benchmark execution should consume the same browser/headless package outputs and must not introduce a second mission-state transition engine.

Compatibility forwarders remain at selected old paths, including:

- `src/core/sim/Agent.js`
- `src/core/sim/Physics.js`
- `src/core/sim/Sampling.js`
- `src/core/planning/PlanExecutor.js`
- `src/core/simulation/TerrainSimulationDiagnostics.js`
- existing compatibility forwarders for mission rules, end conditions, dive-state helpers, and profile runtime helpers

## Moved Or Package-Owned Modules

SIM-PKG-R2 package-owned transition modules include:

- `Agent.js`
- `Physics.js`
- `Sampling.js`
- `PlanExecutor.js`
- `TerrainSimulationDiagnostics.js`
- `CurrentAwareRouteCost.js`
- `ShorelineRisk.js`
- `WaypointSemantics.js`
- `WaterColumnFieldModel.js`
- `DepthAwareScienceValue.js`
- `DepthScoringProfiles.js`
- `StochasticDrift.js`
- `SeededRng.js`
- `RuntimeMath.js`

## Validation Commands

Primary package gates:

```bash
node tools/js/audit_mission_simulator_package_dependencies.mjs
node tools/js/audit_mission_simulator_package_browser_safety.mjs
node tools/js/audit_mission_simulator_package_worker_safety.mjs
node tools/js/audit_mission_simulator_authoritative_runtime.mjs
node tools/js/smoke_mission_simulator_package_contracts.mjs
node tools/js/smoke_mission_simulator_package_forwarders.mjs
node tools/js/smoke_mission_simulator_authoritative_runtime.mjs
node tools/js/capture_mission_simulator_package_r2_baseline.mjs
```

Capability-owned browser workflows:

- `Browser Simulation Uses Package Kernel as Sole Authority`
- `Package Kernel Preserves Play Pause Step Finish and Reset`
- `Surfacing Replan Resumes the Same Package Simulation`
- `Browser Headless and Pages Share the Authoritative Kernel`

## Remaining Coupling

SIM-PKG-R2 is an authoritative runtime cutover, not a gameplay redesign. It intentionally preserves environment generation, route planning, glider dynamics semantics, sampling values, observation behavior, terrain and hazard rules, terminal outcomes, official scoring, rendering, replay semantics, and public schemas. Further package extraction should proceed only behind parity fixtures, package purity audits, browser/headless parity checks, and release E2E gates.