# @anchor/mission-simulator

`@anchor/mission-simulator` is the authoritative portable mission-state transition package for ANCHOR.

SIM-PKG-R2 makes the package the canonical transition authority used by browser, Node headless, and benchmark execution adapters. The active browser app still owns scheduling, UI, scene lifecycle, rendering, route editing, official score aggregation, replay playback, and exported user workflows. Legacy `src/core/...` runtime paths remain only as compatibility forwarders where existing imports still require them.

## Owns

- deterministic mission-state transition contracts and command handling
- mission manifest/input/state/event/observation normalization
- stable digests and clone-safe snapshots
- agent initialization and route-progress helpers
- vehicle motion and current-drift integration helpers
- environment sampling and public observation event production
- terminal condition evaluation
- terrain runtime diagnostic helpers
- raw outcome metric summaries
- browser/headless parity debug and digest shapes

## Does Not Own

- scientific environment-field generation
- route planning or route editing
- official score aggregation or leaderboard behavior
- Phaser lifecycle, DOM input, or Three.js rendering
- Play/Pause scheduling or UI controls
- replay playback/reduction semantics
- certified navigation, operational control, or calibrated vehicle-twin behavior

## Dependencies

Allowed package dependencies are `@anchor/contracts`, `@anchor/environment`, and standard JavaScript runtime APIs. The package must stay free of `src/`, DOM, Phaser, Three.js, RAF, downloads, local storage, score UI, and renderer view-model imports.

## Active Backend

The active backend is `javascriptCpuV1`. Future documented backend targets are `workerCpuV1` and `wasmCpuV1`; neither is active in SIM-PKG-R2.

See `docs/mission_simulator_package.md` for the ownership audit, compatibility forwarders, and validation gates.