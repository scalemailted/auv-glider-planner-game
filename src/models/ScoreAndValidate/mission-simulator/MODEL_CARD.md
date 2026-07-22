# Mission Simulator Model Card

## Model Identity

- Package: `@anchor/mission-simulator`
- Phase: SIM-PKG-R2
- Active backend: `javascriptCpuV1`
- Purpose: deterministic educational mission execution contracts for browser, benchmark, and Node/headless ANCHOR workflows

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

The package produces normalized mission state, events, observations, raw metric summaries, snapshots, terminal summaries, debug summaries, and stable result digests. Existing result, replay, and UI adapters consume these outputs. Official browser score aggregation remains outside the package.

## Determinism

Canonical time is seconds. Given the same input and the same command sequence, package contracts are designed to produce identical state/event/result digests. Play/Pause cadence is application scheduling and is not scientific state.

## Safety And Visibility

Events and observations are clone-safe public records. Public payload normalization strips hidden truth fields. The package does not write debug globals; browser/headless adapters may expose compact summaries.

## Known Limitations

SIM-PKG-R2 moves mission-state transition authority into the package, but it does not make the package a route planner, renderer, replay player, official score calculator, calibrated ocean model, or certified glider digital twin. Browser and headless adapters still orchestrate product workflows around the package.