# Mission Simulator Model Card

## Model Identity

- Package: `@anchor/mission-simulator`
- Phase: SIM-PKG-R1
- Active backend: `javascriptCpuV1`
- Purpose: deterministic educational mission execution contracts for browser and Node/headless ANCHOR workflows

## Claim Boundary

This package is an educational benchmark simulator. It is not a certified vehicle digital twin, operational navigation system, calibrated glider controller, calibrated ocean forecast, or safety-critical mission planner.

The package claim boundary is:

```js
{
  syntheticMissionSimulation: true,
  operationalVehicleCertification: false,
  certifiedNavigationSystem: false,
  calibratedVehicleTwin: false
}
```

## Inputs

The package consumes mission plans, vehicle/glider configurations, deterministic seeds, mission rules, and canonical `EnvironmentArtifact` identity. Environment artifacts are produced by lower packages and app-owned generation adapters; this package does not create bathymetry, currents, scalar fields, uncertainty fields, or hidden truth.

## Outputs

The package produces normalized mission state, events, observations, raw metric summaries, snapshots, terminal summaries, debug summaries, and stable result digests. Existing scoring, result, replay, and UI adapters consume these outputs.

## Determinism

Canonical time is seconds. Given the same input and the same command sequence, package contracts are designed to produce identical state/event/result digests. Play/Pause cadence is application scheduling and is not scientific state.

## Safety And Visibility

Events and observations are clone-safe public records. Public payload normalization strips hidden truth fields. The package does not write debug globals; browser/headless adapters may expose compact summaries.

## Known Limitations

SIM-PKG-R1 keeps detailed production physics, route-progress orchestration, terrain diagnostics, scoring, and replay playback outside the package to avoid behavior drift. The package wraps and mirrors existing production outcomes while selected pure helpers and contracts move into `packages/mission-simulator`.