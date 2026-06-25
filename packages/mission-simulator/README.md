# @anchor/mission-simulator

`@anchor/mission-simulator` owns the portable mission-simulation contract boundary for ANCHOR.

SIM-PKG-R1 adds real package APIs for mission manifests, mission inputs, canonical state, command stepping, events, observations, raw metrics, snapshots, result digests, and selected pure simulator helpers. Browser ANCHOR and Node headless execution use these package contracts while the existing production `SimulationEngine` remains the behavior-preserving orchestration path for R1.

## Owns

- deterministic mission-state transition contracts
- mission manifest/input/state/event/observation normalization
- stable digests and clone-safe snapshots
- raw outcome metric summaries
- educational glider dive-state transitions
- mission rule and terminal-condition helpers moved from `src/core/sim`
- browser/headless parity debug and digest shapes

## Does Not Own

- scientific environment-field generation
- route planning or route editing
- official score aggregation
- Phaser lifecycle or Three.js rendering
- Play/Pause scheduling
- replay playback/reduction
- leaderboard behavior
- certified navigation or calibrated vehicle-twin behavior

## Dependencies

Allowed package dependencies are `@anchor/contracts`, `@anchor/environment`, and standard JavaScript runtime APIs. The package must stay free of `src/`, DOM, Phaser, Three.js, RAF, downloads, local storage, score UI, and renderer view-model imports.

## Active Backend

The active backend is `javascriptCpuV1`. Future documented backend targets are `workerCpuV1` and `wasmCpuV1`; neither is active in SIM-PKG-R1.

See `docs/mission_simulator_package.md` for the ownership audit, compatibility forwarders, and validation gates.